// A small multilayer perceptron (MLP) for classification and regression on 2-D inputs (n-D works too).
// Pure and deterministic: the same options and seed always give the same weights, the same
// training run and the same history. No Math.random; every random draw comes from rng.js.
// Tested in mlp.test.js.
//
// STABLE API (the neural-network labs import this; change it only by adding):
//
//   createMlp({ layers, activation, init, task, seed, weights, biases }) -> model
//       layers      sizes from input to output, e.g. [2, 8, 8, 1]. At least an input and an output layer;
//                   the output layer must have exactly 1 unit (one probability, or one number).
//       activation  "relu" | "tanh" | "sigmoid" for every HIDDEN layer. Default "relu".
//       init        "zeros" | "small" | "xavier" | "he". Default "he" for relu, "xavier" otherwise.
//                     zeros   every weight 0 (the symmetry trap: hidden units stay identical)
//                     small   normal, std 0.01
//                     xavier  normal, std sqrt(2 / (fanIn + fanOut))
//                     he      normal, std sqrt(2 / fanIn)
//                   Biases always start at 0. Weights are drawn layer by layer, row by row, from
//                   gauss(rng(seed)) (rng.js), so a seed is reproducible.
//       task        "classification" (default): the output unit is a sigmoid, the loss is log loss, y is 0/1
//                   (booleans allowed). "regression": the output unit is linear, the loss is MSE.
//       seed        default 1.
//       weights, biases   optional explicit parameters (deep-copied, shapes checked) for hand-built
//                   networks; they replace the initialisation.
//   model = { layers, activation, init, task, seed, weights, biases, epochsTrained, optState }
//       weights[l][k][j]  weight into unit k of layer l+1 from unit j of layer l  (l = 0 .. layers.length - 2),
//       biases[l][k]      bias of unit k of layer l+1.
//       Below, "layer l" means the l-th weight layer: layer 0 is the first hidden layer and the last
//       layer is the output unit. epochsTrained counts epochs done by train(); optState is the optimizer's
//       running state (momentum / Adam moments), so train() can be called one epoch at a time.
//   cloneMlp(model) -> deep copy (including the optimizer state)
//   paramCount(model) -> number of weights plus biases
//
//   forward(model, x, { masks? }) -> cache
//       x is one input row. cache = { x, z, a, output, masks }:
//         z[l]   pre-activation (the weighted sum plus bias) of layer l, an array of units
//         a[l]   activation of layer l (the value fed to layer l + 1; after dropout when masks are given)
//         output a[last][0]: the probability of class 1 (classification) or the predicted number (regression)
//       masks (optional, dropout): masks[l][j] multiplies unit j of HIDDEN layer l after its activation.
//   predictOutput(model, X) -> output per row;  predictLabels(model, X, threshold = 0.5) -> 0/1 per row
//   accuracy(model, X, y, threshold = 0.5) -> share of rows classified correctly (0 for no rows)
//
//   dataLoss(model, X, y) -> mean log loss (classification, p clipped to [1e-12, 1 - 1e-12]) or mean squared
//       error (regression, mean of (output - y)^2). 0 for no rows.
//   loss(model, X, y, { l2 = 0 }) -> dataLoss + (l2 / 2) * sum of every weight squared (biases never penalised).
//   backward(model, cache, y) -> { weights, biases, deltas }
//       Backpropagation for ONE example from its forward cache: the gradient of that example's data loss.
//       weights/biases have the shapes of model.weights/model.biases; deltas[l] is dLoss/dz of layer l.
//       The output delta is (output - y) for classification (sigmoid + log loss cancel) and 2 * (output - y)
//       for regression. ReLU's slope at exactly 0 counts as 0.
//   gradients(model, X, y, { l2 = 0, indices, dropout = 0, random }) -> { loss, weights, biases }
//       Mean gradient over the rows in `indices` (default all rows) of the objective: data term plus
//       (l2 / 2) * sum w^2, so the L2 part adds l2 * w to each weight gradient. `loss` is the mean data loss
//       on those rows. dropout in [0, 1) (inverted dropout: kept units are scaled by 1 / (1 - dropout)) draws
//       its masks from `random` (a function returning floats in [0, 1), required when dropout > 0).
//   gradientCheck(model, X, y, { l2 = 0, eps = 1e-5, tol = 1e-6 })
//                  -> { ok, maxError, checked, worst }
//       Compares every analytic gradient (no dropout) with the central difference
//       (loss(w + eps) - loss(w - eps)) / (2 eps). Error per parameter is |analytic - numeric| / max(1, |analytic|,
//       |numeric|); ok is maxError <= tol; worst names the largest: { kind: "weight"|"bias", layer, row, col }.
//       A ReLU unit sitting exactly on its kink can fail it; random weights almost never do.
//
//   train({ model, X, y, optimizer, lr, epochs, batchSize, seed, l2, dropout, beta, beta1, beta2, eps })
//                  -> { model, history }
//       Trains `model` IN PLACE (clone first to keep the original) and returns it.
//         optimizer "sgd" (default) | "momentum" | "adam"; lr default 0.1 (sgd, momentum) or 0.01 (adam);
//         epochs default 100; batchSize default = all rows (full batch), otherwise mini-batches over a fresh
//         shuffle each epoch; seed default model.seed; l2 default 0; dropout default 0 (hidden layers only,
//         training only); momentum beta 0.9; adam beta1 0.9, beta2 0.999, eps 1e-8.
//       The shuffle and the dropout masks of epoch e come from a generator seeded by (seed, e + the epochs
//       the model already had), so train(epochs: 10) equals ten train(epochs: 1) calls: a lab can step
//       one epoch at a time and keep the optimizer state.
//       history (one entry per epoch, entry i = after epoch i + 1):
//         initialLoss  data loss before the first epoch
//         loss         mean data loss on all rows (no dropout)
//         objective    loss plus the L2 term
//         accuracy     classification accuracy at 0.5 on all rows (null for regression)
//         gradAbs      gradAbs[i][l] = mean |weight gradient| of layer l over the epoch's batches (the gradient
//                      the optimizer used). Falls toward the first layers when gradients vanish.
//         actMean      actMean[i][l] = mean activation of layer l over all rows and units after the epoch
//         deadFrac     deadFrac[i][l] = share of layer-l units whose activation slope is below 1e-6 for every
//                      row (a ReLU unit that is off for all data, or a fully saturated sigmoid / tanh unit).
//                      0 for the output layer.
//   gradientStats(model, X, y, { l2 = 0 }) -> number[] (mean |weight gradient| per layer, full batch, now)
//   activationStats(model, X) -> { actMean, deadFrac } per layer (same meaning as in the history)
//
//   predictGrid(model, bounds, steps) -> { xs, ys, values, labels, nx, ny }
//       The output on a regular grid over the first two inputs, for decision regions. bounds
//       { xMin, xMax, yMin, yMax }; steps is a number (same both ways) or { nx, ny }, at least 2 each, counting
//       grid points. values[j][i] = output at (xs[i], ys[j]); labels[j][i] is 1 / 0 for classification
//       (output >= 0.5) and null for regression. Same shape as svm.js decisionGrid. Needs a 2-input model.
import { rng, gauss, shuffle } from './rng.js';

const EPS_P = 1e-12;
const SLOPE_DEAD = 1e-6;

function sigmoid(z) {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

const ACTIVATIONS = {
  relu: { f: z => (z > 0 ? z : 0), d: z => (z > 0 ? 1 : 0) },
  tanh: { f: Math.tanh, d: z => { const t = Math.tanh(z); return 1 - t * t; } },
  sigmoid: { f: sigmoid, d: z => { const s = sigmoid(z); return s * (1 - s); } },
};
const INITS = ['zeros', 'small', 'xavier', 'he'];

// A well-mixed 32-bit seed from two numbers, so seeds 1, 2, 3, ... do not start the LCG in step.
function mixSeed(a, b) {
  let h = Math.imul((a >>> 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b >>> 0) + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

function copyDeep(a) { return Array.isArray(a) ? a.map(copyDeep) : a; }

function weightStd(init, fanIn, fanOut) {
  if (init === 'zeros') return 0;
  if (init === 'small') return 0.01;
  if (init === 'xavier') return Math.sqrt(2 / (fanIn + fanOut));
  return Math.sqrt(2 / fanIn);
}

export function createMlp(opts = {}) {
  const { layers, activation = 'relu', task = 'classification', seed = 1 } = opts;
  if (!Array.isArray(layers) || layers.length < 2 || layers.some(n => !Number.isInteger(n) || n < 1)) {
    throw new Error('createMlp needs layers like [2, 8, 1]: at least an input and an output size, each a whole number >= 1');
  }
  if (layers[layers.length - 1] !== 1) throw new Error('createMlp: the output layer must have exactly 1 unit');
  if (!ACTIVATIONS[activation]) throw new Error(`createMlp: unknown activation "${activation}" (relu, tanh or sigmoid)`);
  if (task !== 'classification' && task !== 'regression') throw new Error(`createMlp: unknown task "${task}"`);
  const init = opts.init ?? (activation === 'relu' ? 'he' : 'xavier');
  if (!INITS.includes(init)) throw new Error(`createMlp: unknown init "${init}" (${INITS.join(', ')})`);

  const nLayers = layers.length - 1;
  let weights, biases;
  if (opts.weights || opts.biases) {
    if (!opts.weights || !opts.biases) throw new Error('createMlp: give both weights and biases, or neither');
    weights = copyDeep(opts.weights);
    biases = copyDeep(opts.biases);
    const ok = weights.length === nLayers && biases.length === nLayers && weights.every((W, l) =>
      W.length === layers[l + 1] && W.every(row => row.length === layers[l]) && biases[l].length === layers[l + 1]);
    if (!ok) throw new Error('createMlp: weights/biases do not match layers');
  } else {
    const random = rng(seed);
    weights = []; biases = [];
    for (let l = 0; l < nLayers; l++) {
      const std = weightStd(init, layers[l], layers[l + 1]);
      weights.push(Array.from({ length: layers[l + 1] }, () => Array.from({ length: layers[l] }, () => (std === 0 ? 0 : std * gauss(random)))));
      biases.push(new Array(layers[l + 1]).fill(0));
    }
  }
  return { layers: layers.slice(), activation, init, task, seed, weights, biases, epochsTrained: 0, optState: null };
}

export function cloneMlp(model) {
  return {
    ...model,
    layers: model.layers.slice(),
    weights: copyDeep(model.weights),
    biases: copyDeep(model.biases),
    optState: model.optState ? {
      ...model.optState,
      m: { weights: copyDeep(model.optState.m.weights), biases: copyDeep(model.optState.m.biases) },
      v: model.optState.v ? { weights: copyDeep(model.optState.v.weights), biases: copyDeep(model.optState.v.biases) } : null,
    } : null,
  };
}

export function paramCount(model) {
  let n = 0;
  for (let l = 0; l < model.weights.length; l++) n += model.weights[l].length * model.weights[l][0].length + model.biases[l].length;
  return n;
}

export function forward(model, x, { masks } = {}) {
  const L = model.weights.length;
  const act = ACTIVATIONS[model.activation].f;
  const z = [], a = [];
  let input = x;
  for (let l = 0; l < L; l++) {
    const W = model.weights[l], b = model.biases[l];
    const zl = new Array(W.length);
    for (let k = 0; k < W.length; k++) {
      const row = W[k];
      let s = b[k];
      for (let j = 0; j < row.length; j++) s += row[j] * input[j];
      zl[k] = s;
    }
    let al;
    if (l === L - 1) {
      al = model.task === 'classification' ? zl.map(sigmoid) : zl.slice();
    } else {
      al = zl.map(act);
      if (masks && masks[l]) for (let k = 0; k < al.length; k++) al[k] *= masks[l][k];
    }
    z.push(zl); a.push(al);
    input = al;
  }
  return { x, z, a, output: a[L - 1][0], masks: masks || null };
}

export function predictOutput(model, X) {
  return X.map(x => forward(model, x).output);
}

export function predictLabels(model, X, threshold = 0.5) {
  return predictOutput(model, X).map(p => (p >= threshold ? 1 : 0));
}

export function accuracy(model, X, y, threshold = 0.5) {
  if (!X.length) return 0;
  const labels = predictLabels(model, X, threshold);
  let right = 0;
  for (let i = 0; i < X.length; i++) if (labels[i] === Number(y[i])) right++;
  return right / X.length;
}

function sampleLoss(task, out, target) {
  if (task === 'regression') return (out - target) ** 2;
  const p = Math.min(1 - EPS_P, Math.max(EPS_P, out));
  return -(target * Math.log(p) + (1 - target) * Math.log(1 - p));
}

export function dataLoss(model, X, y) {
  if (!X.length) return 0;
  let s = 0;
  for (let i = 0; i < X.length; i++) s += sampleLoss(model.task, forward(model, X[i]).output, Number(y[i]));
  return s / X.length;
}

function l2Term(model, l2) {
  if (!l2) return 0;
  let s = 0;
  for (const W of model.weights) for (const row of W) for (const w of row) s += w * w;
  return (l2 / 2) * s;
}

export function loss(model, X, y, { l2 = 0 } = {}) {
  return dataLoss(model, X, y) + l2Term(model, l2);
}

export function backward(model, cache, y) {
  const L = model.weights.length;
  const dact = ACTIVATIONS[model.activation].d;
  const target = Number(y);
  const deltas = new Array(L);
  deltas[L - 1] = [model.task === 'regression' ? 2 * (cache.output - target) : cache.output - target];
  for (let l = L - 2; l >= 0; l--) {
    const Wn = model.weights[l + 1], dn = deltas[l + 1];
    const zl = cache.z[l];
    const mask = cache.masks && cache.masks[l];
    const d = new Array(zl.length);
    for (let j = 0; j < zl.length; j++) {
      let s = 0;
      for (let k = 0; k < Wn.length; k++) s += Wn[k][j] * dn[k];
      d[j] = s * (mask ? mask[j] : 1) * dact(zl[j]);
    }
    deltas[l] = d;
  }
  const weights = [], biases = [];
  for (let l = 0; l < L; l++) {
    const input = l === 0 ? cache.x : cache.a[l - 1];
    weights.push(deltas[l].map(dk => input.map(v => dk * v)));
    biases.push(deltas[l].slice());
  }
  return { weights, biases, deltas };
}

function emptyGrads(model) {
  return { weights: model.weights.map(W => W.map(row => new Array(row.length).fill(0))), biases: model.biases.map(b => new Array(b.length).fill(0)) };
}

export function gradients(model, X, y, { l2 = 0, indices, dropout = 0, random } = {}) {
  if (!(dropout >= 0 && dropout < 1)) throw new Error('gradients: dropout must be in [0, 1)');
  if (dropout > 0 && typeof random !== 'function') throw new Error('gradients: dropout needs a random() function');
  const rows = indices || X.map((_, i) => i);
  const L = model.weights.length;
  const g = emptyGrads(model);
  let total = 0;
  const keep = dropout > 0 ? 1 / (1 - dropout) : 1;
  for (const i of rows) {
    let masks;
    if (dropout > 0) {
      masks = [];
      for (let l = 0; l < L - 1; l++) masks.push(Array.from({ length: model.layers[l + 1] }, () => (random() < dropout ? 0 : keep)));
    }
    const cache = forward(model, X[i], { masks });
    total += sampleLoss(model.task, cache.output, Number(y[i]));
    const back = backward(model, cache, y[i]);
    for (let l = 0; l < L; l++) {
      for (let k = 0; k < back.weights[l].length; k++) {
        const gr = g.weights[l][k], br = back.weights[l][k];
        for (let j = 0; j < br.length; j++) gr[j] += br[j];
        g.biases[l][k] += back.biases[l][k];
      }
    }
  }
  const n = rows.length || 1;
  for (let l = 0; l < L; l++) {
    for (let k = 0; k < g.weights[l].length; k++) {
      const gr = g.weights[l][k], wr = model.weights[l][k];
      for (let j = 0; j < gr.length; j++) gr[j] = gr[j] / n + l2 * wr[j];
      g.biases[l][k] /= n;
    }
  }
  return { loss: rows.length ? total / rows.length : 0, weights: g.weights, biases: g.biases };
}

export function gradientCheck(model, X, y, { l2 = 0, eps = 1e-5, tol = 1e-6 } = {}) {
  const g = gradients(model, X, y, { l2 });
  const probe = cloneMlp(model);
  let maxError = 0, checked = 0, worst = null;
  const test = (arr, idx, analytic, kind, layer, row, col) => {
    const old = arr[idx];
    arr[idx] = old + eps; const up = loss(probe, X, y, { l2 });
    arr[idx] = old - eps; const down = loss(probe, X, y, { l2 });
    arr[idx] = old;
    const numeric = (up - down) / (2 * eps);
    const err = Math.abs(analytic - numeric) / Math.max(1, Math.abs(analytic), Math.abs(numeric));
    checked++;
    if (err >= maxError) { maxError = err; worst = { kind, layer, row, col }; }
  };
  for (let l = 0; l < probe.weights.length; l++) {
    for (let k = 0; k < probe.weights[l].length; k++) {
      for (let j = 0; j < probe.weights[l][k].length; j++) test(probe.weights[l][k], j, g.weights[l][k][j], 'weight', l, k, j);
      test(probe.biases[l], k, g.biases[l][k], 'bias', l, k, null);
    }
  }
  return { ok: maxError <= tol, maxError, checked, worst };
}

export function gradientStats(model, X, y, { l2 = 0 } = {}) {
  const g = gradients(model, X, y, { l2 });
  return g.weights.map(W => meanAbs(W));
}

function meanAbs(W) {
  let s = 0, n = 0;
  for (const row of W) for (const v of row) { s += Math.abs(v); n++; }
  return n ? s / n : 0;
}

export function activationStats(model, X) {
  const L = model.weights.length;
  const dact = ACTIVATIONS[model.activation].d;
  const sums = model.layers.slice(1).map(n => new Array(n).fill(0));
  const alive = model.layers.slice(1).map(n => new Array(n).fill(false));
  for (const x of X) {
    const c = forward(model, x);
    for (let l = 0; l < L; l++) {
      for (let k = 0; k < c.a[l].length; k++) {
        sums[l][k] += c.a[l][k];
        if (l < L - 1 && dact(c.z[l][k]) >= SLOPE_DEAD) alive[l][k] = true;
      }
    }
  }
  const n = X.length || 1;
  const actMean = sums.map(s => s.reduce((p, v) => p + v, 0) / n / s.length);
  const deadFrac = alive.map((al, l) => (l === L - 1 || !X.length ? 0 : al.filter(v => !v).length / al.length));
  return { actMean, deadFrac };
}

// Rows of every 1-D array in a { weights, biases } structure, in a fixed order, so a parameter, its
// gradient and its optimizer moments line up element for element.
function rowsOf(s) {
  const out = [];
  for (let l = 0; l < s.weights.length; l++) {
    for (const row of s.weights[l]) out.push(row);
    out.push(s.biases[l]);
  }
  return out;
}

export function train(opts = {}) {
  const { model, X, y } = opts;
  if (!model) throw new Error('train needs a model');
  if (!Array.isArray(X) || !Array.isArray(y) || X.length !== y.length) throw new Error('train needs X and y of the same length');
  const optimizer = opts.optimizer ?? 'sgd';
  if (!['sgd', 'momentum', 'adam'].includes(optimizer)) throw new Error(`train: unknown optimizer "${optimizer}" (sgd, momentum or adam)`);
  const lr = opts.lr ?? (optimizer === 'adam' ? 0.01 : 0.1);
  const epochs = opts.epochs ?? 100;
  const n = X.length;
  const batchSize = opts.batchSize ? Math.min(Math.max(1, Math.floor(opts.batchSize)), n || 1) : n;
  const seed = opts.seed ?? model.seed;
  const l2 = opts.l2 ?? 0;
  const dropout = opts.dropout ?? 0;
  const beta = opts.beta ?? 0.9;
  const beta1 = opts.beta1 ?? 0.9;
  const beta2 = opts.beta2 ?? 0.999;
  const adamEps = opts.eps ?? 1e-8;
  if (!(dropout >= 0 && dropout < 1)) throw new Error('train: dropout must be in [0, 1)');

  if (!model.optState || model.optState.type !== optimizer) {
    model.optState = { type: optimizer, t: 0, m: emptyGrads(model), v: optimizer === 'adam' ? emptyGrads(model) : null };
  }
  const st = model.optState;
  const params = rowsOf(model);
  const mRows = rowsOf(st.m);
  const vRows = st.v ? rowsOf(st.v) : null;
  const L = model.weights.length;

  const history = {
    initialLoss: dataLoss(model, X, y), loss: [], objective: [], accuracy: [], gradAbs: [], actMean: [], deadFrac: [],
  };
  const order = Array.from({ length: n }, (_, i) => i);

  for (let e = 0; e < epochs; e++) {
    const random = rng(mixSeed(seed, model.epochsTrained));
    const idx = batchSize < n ? shuffle(order, random) : order;
    const gradSum = new Array(L).fill(0);
    let batches = 0;
    for (let start = 0; start < n; start += batchSize) {
      const g = gradients(model, X, y, { l2, indices: idx.slice(start, start + batchSize), dropout, random });
      for (let l = 0; l < L; l++) gradSum[l] += meanAbs(g.weights[l]);
      batches++;
      const gRows = rowsOf(g);
      st.t++;
      for (let r = 0; r < params.length; r++) {
        const p = params[r], gr = gRows[r];
        if (optimizer === 'sgd') {
          for (let j = 0; j < p.length; j++) p[j] -= lr * gr[j];
        } else if (optimizer === 'momentum') {
          const m = mRows[r];
          for (let j = 0; j < p.length; j++) { m[j] = beta * m[j] + gr[j]; p[j] -= lr * m[j]; }
        } else {
          const m = mRows[r], v = vRows[r];
          const c1 = 1 - beta1 ** st.t, c2 = 1 - beta2 ** st.t;
          for (let j = 0; j < p.length; j++) {
            m[j] = beta1 * m[j] + (1 - beta1) * gr[j];
            v[j] = beta2 * v[j] + (1 - beta2) * gr[j] * gr[j];
            p[j] -= lr * (m[j] / c1) / (Math.sqrt(v[j] / c2) + adamEps);
          }
        }
      }
    }
    model.epochsTrained++;
    const dl = dataLoss(model, X, y);
    history.loss.push(dl);
    history.objective.push(dl + l2Term(model, l2));
    history.accuracy.push(model.task === 'classification' ? accuracy(model, X, y) : null);
    history.gradAbs.push(gradSum.map(s => (batches ? s / batches : 0)));
    const stats = activationStats(model, X);
    history.actMean.push(stats.actMean);
    history.deadFrac.push(stats.deadFrac);
  }
  return { model, history };
}

export function predictGrid(model, bounds, steps) {
  const nx = typeof steps === 'number' ? steps : steps.nx;
  const ny = typeof steps === 'number' ? steps : steps.ny;
  if (!(nx >= 2) || !(ny >= 2)) throw new Error('predictGrid needs at least 2 steps each way');
  if (model.layers[0] !== 2) throw new Error('predictGrid needs a model with 2 inputs');
  const { xMin, xMax, yMin, yMax } = bounds;
  const xs = Array.from({ length: nx }, (_, i) => xMin + (xMax - xMin) * i / (nx - 1));
  const ys = Array.from({ length: ny }, (_, j) => yMin + (yMax - yMin) * j / (ny - 1));
  const values = ys.map(yv => xs.map(xv => forward(model, [xv, yv]).output));
  const labels = values.map(row => row.map(v => (model.task === 'classification' ? (v >= 0.5 ? 1 : 0) : null)));
  return { xs, ys, values, labels, nx, ny };
}
