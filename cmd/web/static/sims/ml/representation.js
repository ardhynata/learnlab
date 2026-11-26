// Representation-learning helpers: tiny glyph images, an autoencoder that learns a code from UNLABELLED
// pictures, and a fair comparison of (a) a frozen pretrained code, (b) raw pixels and (c) a network trained
// from scratch, all given the same few labelled examples. Pure and deterministic: the same options and seed
// always give the same images, weights and scores. No Math.random; every draw comes from rng.js.
// Tested in representation.test.js.
//
// STABLE API (the representation lab and lessons import this; change it only by adding):
//
//   GLYPH_SIZE = 8, GLYPH_PIXELS = 64     the images are 8 x 8, stored as flat 64-vectors of 0 / 1, row by row
//   GLYPH_CLASSES                         the shape names in default order: bar, cross, box, diagonal, hbar, anti
//   makeGlyphs({ n = 200, classes = 4, seed = 1, noise = 0.15, shift = 0 }) -> { X, y, classes, size }
//       n procedurally drawn pictures, classes balanced (class counts differ by at most 1) and shuffled.
//       classes is a number (the first k names of GLYPH_CLASSES, 2..6) or an array of names. y[i] is the index
//       into the returned `classes` names. Every shape is 5 x 5 inside the 8 x 8 picture:
//         bar       the vertical line down the middle         hbar      the horizontal line across the middle
//         cross     bar and hbar together                     box       the 5 x 5 outline
//         diagonal  top-left to bottom-right                  anti      top-right to bottom-left
//       shift is how far the shape may wander: a whole number 0..3 (true means 3, false means 0). The offset
//       across and down is drawn from lo .. lo + shift with lo = floor((3 - shift) / 2), so 0 keeps the shape at
//       offset (1, 1) and 3 draws each offset from 0..3. A moved shape lands on different pixels, which a
//       code learned from a few hundred pictures does not undo: with shift >= 1 the frozen code loses its lead.
//       noise is the chance each pixel is then flipped, independently.
//   makeUnlabelledPool({ n = 600, classes = 4, seed = 1000, noise = 0.15, shift = 0 }) -> number[][]
//       The same kind of pictures with the labels thrown away: the pool a representation is learned from.
//       Its default seed differs from makeGlyphs so a pool and a labelled set do not repeat each other.
//   glyphRows(x) -> 8 strings of '#' (on) and '.' (off), for printing or checking a picture by eye.
//
//   trainAutoencoder({ X, bottleneck = 12, hidden = 24, epochs = 20, lr = 0.01, batchSize = 32, seed = 1, denoise = 0.15 }) -> ae
//       A dense autoencoder: 64 -> hidden -> bottleneck -> hidden -> 64, tanh in the hidden layers and in the
//       bottleneck code, a sigmoid on the 64 outputs, squared error on the pixels, trained with Adam on shuffled
//       mini-batches. denoise is the chance each INPUT pixel is flipped on the way in (fresh every epoch) while the
//       target stays the picture as given, so the code has to look past noise (0 = a plain autoencoder). Encoder and decoder are ONE network with a narrow middle layer. hidden: 0 drops the two
//       hidden layers (64 -> bottleneck -> 64). It is written here, not built on mlp.js's createMlp, because
//       createMlp insists on exactly one output unit and an autoencoder needs 64.
//       ae = { sizes, bottleneck, weights, biases, seed, epochsTrained, history,
//              encode(x), decode(z), reconstruct(x), train(extraEpochs) }
//         encode(x) -> the bottleneck code (array of `bottleneck` numbers in (-1, 1))
//         decode(z) -> 64 pixel intensities in (0, 1)
//         reconstruct(x) = decode(encode(x))
//         history.initialLoss  mean squared error per pixel over X before training
//         history.loss[i]      the same after epoch i + 1
//         train(k)             continues k more epochs in place (Adam state and the shuffle continue, so
//                              trainAutoencoder(epochs: 10) equals trainAutoencoder(epochs: 5) then train(5))
//   reconstructionError(ae, X) -> mean squared error per pixel over all rows (0 for no rows)
//   reconstructionErrors(ae, X) -> that error per row
//   autoencoderGradientCheck(ae, x, { eps = 1e-5, tol = 1e-6 }) -> { ok, maxError, checked }
//       Compares the backpropagation gradient of one example's squared error with a central finite difference.
//   featuresFrom(encoder, X) -> the code of every row. encoder is an autoencoder or a function x -> code.
//
//   fitProbe(X, y, { classes, l2 = 0.05, iters = 300, lr = 0.2 }) -> probe     (a linear classifier)
//       One-vs-rest logistic regression (logistic.js, features standardized inside from the training rows).
//       probe = { classes, models, predict(X), accuracy(X, y) }; predict gives the class index per row.
//   fitScratchNet(X, y, { classes, hidden = 8, epochs = 150, lr = 0.05, seed = 1 }) -> net  (same shape as a probe)
//       One-vs-rest small mlp.js networks (64 -> hidden -> 1, relu, Adam) trained on the raw pixels: it learns
//       its own features, but only from the few labels it is given. One network per class because mlp.js has
//       a single output unit.
//
//   subsetPerClass(y, perClass, { classes, seed = 1 }) -> indices
//       perClass rows of each class, picked at random with the seed, in the order of the data. Every class
//       gets min(perClass, how many it has).
//   compareRepresentations({ unlabelled, labelledSmall, test, bottleneck = 12, seed = 1, sizes = [1, 2, 5, 10, 25],
//                            epochs = 20, hidden = 24, repeats = 3, denoise = 0.15, autoencoder, scratch = true }) -> report
//       unlabelled     number[][] pictures with no labels (the pool the autoencoder learns from)
//       labelledSmall  { X, y } a labelled pool; each size takes `size` examples per class from it
//       test           { X, y } held out; every score is accuracy on it
//       autoencoder    an ae from trainAutoencoder to reuse; omitted, one is trained here on `unlabelled`
//       For each size, `repeats` different random labelled subsets are scored and averaged (seeds seed, seed + 1, ...):
//         frozen   the encoder stays FROZEN (never updated by the labels), a linear probe on its code
//         raw      the same linear probe on the 64 raw pixels
//         scratch  fitScratchNet on the raw pixels (null when scratch: false, which skips the slowest part)
//       report = { ae, sizes, rows, classes, chance }
//         rows[i] = { perClass, nLabelled, frozen, raw, scratch, frozenGain } with frozenGain = frozen - raw
//         chance = 1 / number of classes
import { rng, gauss, shuffle } from './rng.js';
import { fitLogistic, predictProba } from './logistic.js';
import { createMlp, train as trainMlp, predictOutput } from './mlp.js';

export const GLYPH_SIZE = 8;
export const GLYPH_PIXELS = GLYPH_SIZE * GLYPH_SIZE;
export const GLYPH_CLASSES = ['bar', 'cross', 'box', 'diagonal', 'hbar', 'anti'];

const SHAPE = 5;
const MAX_OFFSET = GLYPH_SIZE - SHAPE; // 3

// Is pixel (r, c) of the 5 x 5 shape switched on?
const SHAPES = {
  bar: (r, c) => c === 2,
  hbar: (r, c) => r === 2,
  cross: (r, c) => r === 2 || c === 2,
  box: (r, c) => r === 0 || r === SHAPE - 1 || c === 0 || c === SHAPE - 1,
  diagonal: (r, c) => r === c,
  anti: (r, c) => r + c === SHAPE - 1,
};

function resolveClasses(classes) {
  if (Array.isArray(classes)) {
    if (classes.length < 2) throw new Error('glyphs: need at least 2 classes');
    for (const name of classes) if (!SHAPES[name]) throw new Error(`glyphs: unknown class "${name}" (${GLYPH_CLASSES.join(', ')})`);
    return classes.slice();
  }
  if (!Number.isInteger(classes) || classes < 2 || classes > GLYPH_CLASSES.length) {
    throw new Error(`glyphs: classes must be 2..${GLYPH_CLASSES.length} or an array of names`);
  }
  return GLYPH_CLASSES.slice(0, classes);
}

function drawGlyph(name, ox, oy, noise, random) {
  const x = new Array(GLYPH_PIXELS).fill(0);
  for (let r = 0; r < SHAPE; r++) {
    for (let c = 0; c < SHAPE; c++) if (SHAPES[name](r, c)) x[(oy + r) * GLYPH_SIZE + ox + c] = 1;
  }
  if (noise > 0) for (let i = 0; i < GLYPH_PIXELS; i++) if (random() < noise) x[i] = 1 - x[i];
  return x;
}

export function makeGlyphs({ n = 200, classes = 4, seed = 1, noise = 0.15, shift = 0 } = {}) {
  const names = resolveClasses(classes);
  if (!Number.isInteger(n) || n < 0) throw new Error('makeGlyphs: n must be a whole number >= 0');
  if (!(noise >= 0 && noise <= 0.5)) throw new Error('makeGlyphs: noise must be in [0, 0.5]');
  const play = shift === true ? MAX_OFFSET : shift === false ? 0 : shift;
  if (!Number.isInteger(play) || play < 0 || play > MAX_OFFSET) throw new Error(`makeGlyphs: shift must be true, false or a whole number 0..${MAX_OFFSET}`);
  const lo = Math.floor((MAX_OFFSET - play) / 2);
  const random = rng(seed);
  const classOf = shuffle(Array.from({ length: n }, (_, i) => i % names.length), random);
  const X = [], y = [];
  for (const k of classOf) {
    const ox = lo + Math.floor(random() * (play + 1));
    const oy = lo + Math.floor(random() * (play + 1));
    X.push(drawGlyph(names[k], ox, oy, noise, random));
    y.push(k);
  }
  return { X, y, classes: names, size: GLYPH_SIZE };
}

export function makeUnlabelledPool({ n = 600, classes = 4, seed = 1000, noise = 0.15, shift = 0 } = {}) {
  return makeGlyphs({ n, classes, seed, noise, shift }).X;
}

export function glyphRows(x) {
  const rows = [];
  for (let r = 0; r < GLYPH_SIZE; r++) {
    let s = '';
    for (let c = 0; c < GLYPH_SIZE; c++) s += x[r * GLYPH_SIZE + c] >= 0.5 ? '#' : '.';
    rows.push(s);
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------------------
// The autoencoder: a small dense network with manual backpropagation (tanh hidden layers, sigmoid outputs).

const sigmoid = z => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));

function mixSeed(a, b) {
  let h = Math.imul((a >>> 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b >>> 0) + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

// Forward pass through weight layers [from, to). Returns the activation after each layer (index 0 = the input).
function runLayers(ae, x, from, to) {
  const acts = [x];
  const last = ae.weights.length - 1;
  for (let l = from; l < to; l++) {
    const W = ae.weights[l], b = ae.biases[l], a = acts[acts.length - 1];
    const out = new Array(W.length);
    for (let k = 0; k < W.length; k++) {
      let s = b[k];
      const row = W[k];
      for (let j = 0; j < row.length; j++) s += row[j] * a[j];
      out[k] = l === last ? sigmoid(s) : Math.tanh(s);
    }
    acts.push(out);
  }
  return acts;
}

// The gradient of the SUMMED squared error of one example (the caller averages over the batch).
function addGradient(ae, input, target, gW, gB) {
  const acts = runLayers(ae, input, 0, ae.weights.length);
  const L = ae.weights.length;
  const out = acts[L];
  let delta = out.map((o, k) => 2 * (o - target[k]) * o * (1 - o)); // through the sigmoid
  for (let l = L - 1; l >= 0; l--) {
    const a = acts[l];
    const W = ae.weights[l];
    for (let k = 0; k < W.length; k++) {
      gB[l][k] += delta[k];
      for (let j = 0; j < a.length; j++) gW[l][k][j] += delta[k] * a[j];
    }
    if (l > 0) {
      const next = new Array(a.length).fill(0);
      for (let j = 0; j < a.length; j++) {
        let s = 0;
        for (let k = 0; k < W.length; k++) s += W[k][j] * delta[k];
        next[j] = s * (1 - a[j] * a[j]); // through the tanh
      }
      delta = next;
    }
  }
}

const zerosLike = rows => rows.map(r => (Array.isArray(r[0]) ? zerosLike(r) : new Array(r.length).fill(0)));

function checkMatrix(X, what) {
  if (!Array.isArray(X) || X.length === 0) throw new Error(`${what}: X must be a non-empty array of rows`);
  const d = X[0].length;
  for (const r of X) if (r.length !== d) throw new Error(`${what}: all rows must have the same length`);
}

export function reconstructionErrors(ae, X) {
  return X.map(x => {
    const r = ae.reconstruct(x);
    let s = 0;
    for (let j = 0; j < x.length; j++) s += (r[j] - x[j]) ** 2;
    return s / x.length;
  });
}

export function reconstructionError(ae, X) {
  if (!X.length) return 0;
  return reconstructionErrors(ae, X).reduce((a, b) => a + b, 0) / X.length;
}

export function trainAutoencoder({ X, bottleneck = 12, hidden = 24, epochs = 20, lr = 0.01, batchSize = 32, seed = 1, denoise = 0.15 } = {}) {
  checkMatrix(X, 'trainAutoencoder');
  if (!Number.isInteger(bottleneck) || bottleneck < 1) throw new Error('trainAutoencoder: bottleneck must be a whole number >= 1');
  if (!Number.isInteger(hidden) || hidden < 0) throw new Error('trainAutoencoder: hidden must be a whole number >= 0');
  const d = X[0].length;
  const sizes = hidden > 0 ? [d, hidden, bottleneck, hidden, d] : [d, bottleneck, d];
  const random = rng(seed);
  const weights = [], biases = [];
  for (let l = 0; l < sizes.length - 1; l++) {
    const std = Math.sqrt(2 / (sizes[l] + sizes[l + 1])); // xavier, as the tanh layers want
    weights.push(Array.from({ length: sizes[l + 1] }, () => Array.from({ length: sizes[l] }, () => std * gauss(random))));
    biases.push(new Array(sizes[l + 1]).fill(0));
  }
  const encoderLayers = hidden > 0 ? 2 : 1; // weight layers up to and including the bottleneck

  const ae = {
    sizes, bottleneck, weights, biases, seed, epochsTrained: 0,
    history: { initialLoss: 0, loss: [] },
    encode(x) {
      const acts = runLayers(ae, x, 0, encoderLayers);
      return acts[acts.length - 1];
    },
    decode(z) {
      const acts = runLayers(ae, z, encoderLayers, ae.weights.length);
      return acts[acts.length - 1];
    },
    reconstruct(x) { return ae.decode(ae.encode(x)); },
    train(extraEpochs = 1) { return runEpochs(extraEpochs); },
  };
  const m = { w: zerosLike(weights), b: zerosLike(biases) };
  const v = { w: zerosLike(weights), b: zerosLike(biases) };
  let t = 0;
  const n = X.length;
  const bs = Math.min(Math.max(1, Math.floor(batchSize)), n);
  const order = Array.from({ length: n }, (_, i) => i);
  const beta1 = 0.9, beta2 = 0.999, adamEps = 1e-8;

  function runEpochs(k) {
    for (let e = 0; e < k; e++) {
      const random = rng(mixSeed(seed, ae.epochsTrained));
      const idx = shuffle(order, random);
      for (let start = 0; start < n; start += bs) {
        const batch = idx.slice(start, start + bs);
        const gW = zerosLike(weights), gB = zerosLike(biases);
        for (const i of batch) {
          const input = denoise > 0 ? X[i].map(p => (random() < denoise ? 1 - p : p)) : X[i];
          addGradient(ae, input, X[i], gW, gB);
        }
        // Mean over the batch and over the pixels, the same scale as the reported error.
        const scale = 1 / (batch.length * d);
        t++;
        const c1 = 1 - beta1 ** t, c2 = 1 - beta2 ** t;
        for (let l = 0; l < weights.length; l++) {
          for (let r = 0; r < weights[l].length; r++) {
            for (let j = 0; j <= weights[l][r].length; j++) {
              const isBias = j === weights[l][r].length;
              const g = (isBias ? gB[l][r] : gW[l][r][j]) * scale;
              const mm = isBias ? m.b[l] : m.w[l][r];
              const vv = isBias ? v.b[l] : v.w[l][r];
              const q = isBias ? r : j;
              mm[q] = beta1 * mm[q] + (1 - beta1) * g;
              vv[q] = beta2 * vv[q] + (1 - beta2) * g * g;
              const step = lr * (mm[q] / c1) / (Math.sqrt(vv[q] / c2) + adamEps);
              if (isBias) biases[l][r] -= step; else weights[l][r][j] -= step;
            }
          }
        }
      }
      ae.epochsTrained++;
      ae.history.loss.push(reconstructionError(ae, X));
    }
    return ae;
  }

  ae.history.initialLoss = reconstructionError(ae, X);
  return runEpochs(epochs);
}

// Backpropagation against a central finite difference, on one example: the gradient of the summed squared
// error (target = the input) with respect to every weight and bias. Returns { ok, maxError, checked }; the
// error per parameter is |analytic - numeric| / max(1, |analytic|, |numeric|).
export function autoencoderGradientCheck(ae, x, { eps = 1e-5, tol = 1e-6 } = {}) {
  const gW = zerosLike(ae.weights), gB = zerosLike(ae.biases);
  addGradient(ae, x, x, gW, gB);
  const sse = () => {
    const r = ae.reconstruct(x);
    let sum = 0;
    for (let j = 0; j < x.length; j++) sum += (r[j] - x[j]) ** 2;
    return sum;
  };
  let maxError = 0, checked = 0;
  const probe = (arr, idx, analytic) => {
    const keep = arr[idx];
    arr[idx] = keep + eps; const up = sse();
    arr[idx] = keep - eps; const down = sse();
    arr[idx] = keep;
    const numeric = (up - down) / (2 * eps);
    maxError = Math.max(maxError, Math.abs(analytic - numeric) / Math.max(1, Math.abs(analytic), Math.abs(numeric)));
    checked++;
  };
  for (let l = 0; l < ae.weights.length; l++) {
    ae.weights[l].forEach((row, k) => { for (let j = 0; j < row.length; j++) probe(row, j, gW[l][k][j]); });
    ae.biases[l].forEach((_, k) => probe(ae.biases[l], k, gB[l][k]));
  }
  return { ok: maxError <= tol, maxError, checked };
}

export function featuresFrom(encoder, X) {
  const f = typeof encoder === 'function' ? encoder : x => encoder.encode(x);
  return X.map(x => f(x));
}

// ---------------------------------------------------------------------------------------------------------
// Classifiers on top of any feature rows (multi-class by one-vs-rest).

function classList(y, classes) {
  if (Array.isArray(classes)) return classes.length;
  if (Number.isInteger(classes)) return classes;
  return Math.max(...y) + 1;
}

function argmax(a) {
  let best = 0;
  for (let i = 1; i < a.length; i++) if (a[i] > a[best]) best = i;
  return best;
}

function wrapScorer(k, score) {
  const predict = X => score(X).map(argmax);
  return {
    classes: k,
    predict,
    accuracy(X, y) {
      if (!X.length) return 0;
      const p = predict(X);
      let ok = 0;
      for (let i = 0; i < y.length; i++) if (p[i] === y[i]) ok++;
      return ok / y.length;
    },
  };
}

export function fitProbe(X, y, { classes, l2 = 0.05, iters = 300, lr = 0.2 } = {}) {
  checkMatrix(X, 'fitProbe');
  const k = classList(y, classes);
  const models = [];
  for (let c = 0; c < k; c++) models.push(fitLogistic(X, y.map(v => (v === c ? 1 : 0)), { l2, iters, lr }));
  const probe = wrapScorer(k, Z => {
    const P = models.map(mod => predictProba(mod, Z));
    return Z.map((_, i) => P.map(col => col[i]));
  });
  probe.models = models;
  return probe;
}

export function fitScratchNet(X, y, { classes, hidden = 8, epochs = 150, lr = 0.05, seed = 1 } = {}) {
  checkMatrix(X, 'fitScratchNet');
  const k = classList(y, classes);
  const models = [];
  for (let c = 0; c < k; c++) {
    const model = createMlp({ layers: [X[0].length, hidden, 1], activation: 'relu', seed: mixSeed(seed, c) });
    trainMlp({ model, X, y: y.map(v => (v === c ? 1 : 0)), optimizer: 'adam', lr, epochs, seed: mixSeed(seed, 100 + c) });
    models.push(model);
  }
  const net = wrapScorer(k, Z => {
    const P = models.map(mod => predictOutput(mod, Z));
    return Z.map((_, i) => P.map(col => col[i]));
  });
  net.models = models;
  return net;
}

export function subsetPerClass(y, perClass, { classes, seed = 1 } = {}) {
  const k = classList(y, classes);
  const random = rng(seed);
  const chosen = [];
  for (let c = 0; c < k; c++) {
    const members = [];
    y.forEach((v, i) => { if (v === c) members.push(i); });
    chosen.push(...shuffle(members, random).slice(0, perClass));
  }
  return chosen.sort((a, b) => a - b);
}

export function compareRepresentations({
  unlabelled, labelledSmall, test, bottleneck = 12, seed = 1, sizes = [1, 2, 5, 10, 25],
  epochs = 20, hidden = 24, repeats = 3, denoise = 0.15, autoencoder, scratch = true,
} = {}) {
  if (!labelledSmall || !labelledSmall.X || !test || !test.X) throw new Error('compareRepresentations needs labelledSmall and test as { X, y }');
  if (!autoencoder) checkMatrix(unlabelled, 'compareRepresentations');
  const ae = autoencoder ?? trainAutoencoder({ X: unlabelled, bottleneck, hidden, epochs, seed, denoise });
  const k = Math.max(...labelledSmall.y, ...test.y) + 1;
  const testCodes = featuresFrom(ae, test.X);
  const rows = sizes.map(perClass => {
    const acc = { frozen: 0, raw: 0, scratch: scratch ? 0 : null };
    let nLabelled = 0;
    for (let rep = 0; rep < repeats; rep++) {
      const idx = subsetPerClass(labelledSmall.y, perClass, { classes: k, seed: seed + rep });
      const Xs = idx.map(i => labelledSmall.X[i]);
      const ys = idx.map(i => labelledSmall.y[i]);
      nLabelled += ys.length / repeats;
      acc.frozen += fitProbe(featuresFrom(ae, Xs), ys, { classes: k }).accuracy(testCodes, test.y) / repeats;
      acc.raw += fitProbe(Xs, ys, { classes: k }).accuracy(test.X, test.y) / repeats;
      if (scratch) acc.scratch += fitScratchNet(Xs, ys, { classes: k, seed: seed + rep }).accuracy(test.X, test.y) / repeats;
    }
    return { perClass, nLabelled, ...acc, frozenGain: acc.frozen - acc.raw };
  });
  return { ae, sizes: sizes.slice(), rows, classes: k, chance: 1 / k };
}
