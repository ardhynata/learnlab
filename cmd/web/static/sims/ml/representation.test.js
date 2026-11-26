import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GLYPH_SIZE, GLYPH_PIXELS, GLYPH_CLASSES, makeGlyphs, makeUnlabelledPool, glyphRows,
  trainAutoencoder, reconstructionError, reconstructionErrors, autoencoderGradientCheck, featuresFrom,
  fitProbe, fitScratchNet, subsetPerClass, compareRepresentations,
} from './representation.js';
import { rng, gauss } from './rng.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (tol ${tol})`);
const sum = a => a.reduce((s, v) => s + v, 0);
const mean = a => sum(a) / a.length;

// ---- glyphs ---------------------------------------------------------------------------------------------

test('constants describe 8 x 8 pictures and the six shapes', () => {
  assert.equal(GLYPH_SIZE, 8);
  assert.equal(GLYPH_PIXELS, 64);
  assert.deepEqual(GLYPH_CLASSES, ['bar', 'cross', 'box', 'diagonal', 'hbar', 'anti']);
});

test('glyphs are the exact shapes: clean, unshifted pictures drawn pixel by pixel', () => {
  const g = makeGlyphs({ n: 6, classes: 6, seed: 1, noise: 0, shift: 0 });
  const byName = {};
  g.X.forEach((x, i) => { byName[g.classes[g.y[i]]] = glyphRows(x); });
  assert.deepEqual(byName.bar, [
    '........', '...#....', '...#....', '...#....', '...#....', '...#....', '........', '........']);
  assert.deepEqual(byName.hbar, [
    '........', '........', '........', '.#####..', '........', '........', '........', '........']);
  assert.deepEqual(byName.cross, [
    '........', '...#....', '...#....', '.#####..', '...#....', '...#....', '........', '........']);
  assert.deepEqual(byName.box, [
    '........', '.#####..', '.#...#..', '.#...#..', '.#...#..', '.#####..', '........', '........']);
  assert.deepEqual(byName.diagonal, [
    '........', '.#......', '..#.....', '...#....', '....#...', '.....#..', '........', '........']);
  assert.deepEqual(byName.anti, [
    '........', '.....#..', '....#...', '...#....', '..#.....', '.#......', '........', '........']);
});

test('every clean glyph has its class pixel count, shifted or not', () => {
  const counts = { bar: 5, hbar: 5, cross: 9, box: 16, diagonal: 5, anti: 5 };
  for (const shift of [0, 1, 3]) {
    const g = makeGlyphs({ n: 60, classes: 6, seed: 4, noise: 0, shift });
    g.X.forEach((x, i) => assert.equal(sum(x), counts[g.classes[g.y[i]]], `shift ${shift} picture ${i}`));
  }
});

test('shift moves the shape inside the allowed offsets and never off the picture', () => {
  const g = makeGlyphs({ n: 200, classes: ['box', 'box'], seed: 2, noise: 0, shift: 3 });
  // a box has its top-left corner at the offset: the first on pixel in reading order
  const offsets = new Set(g.X.map(x => {
    const first = x.indexOf(1);
    return `${first % 8},${Math.floor(first / 8)}`;
  }));
  assert.equal(offsets.size, 16); // 4 x 4 positions, all reached
  for (const o of offsets) { const [ox, oy] = o.split(',').map(Number); assert.ok(ox >= 0 && ox <= 3 && oy >= 0 && oy <= 3); }
  const g1 = makeGlyphs({ n: 100, classes: ['box', 'box'], seed: 2, noise: 0, shift: 1 });
  const offsets1 = new Set(g1.X.map(x => { const f = x.indexOf(1); return `${f % 8},${Math.floor(f / 8)}`; }));
  assert.deepEqual([...offsets1].sort(), ['1,1', '1,2', '2,1', '2,2']);
  assert.equal(makeGlyphs({ n: 5, classes: ['box', 'box'], noise: 0, shift: true }).X.length, 5);
  const fixed = new Set(makeGlyphs({ n: 30, classes: ['box', 'box'], noise: 0, shift: false }).X.map(x => x.join('')));
  assert.equal(fixed.size, 1);
});

test('classes are balanced, shuffled and named', () => {
  const g = makeGlyphs({ n: 103, classes: 4, seed: 3 });
  assert.deepEqual(g.classes, ['bar', 'cross', 'box', 'diagonal']);
  const counts = [0, 1, 2, 3].map(c => g.y.filter(v => v === c).length);
  assert.deepEqual(counts, [26, 26, 26, 25]);
  assert.notDeepEqual(g.y.slice(0, 8), [0, 1, 2, 3, 0, 1, 2, 3]); // shuffled, not cycled
  assert.deepEqual(makeGlyphs({ n: 4, classes: ['anti', 'bar'] }).classes, ['anti', 'bar']);
  assert.equal(g.size, 8);
  assert.ok(g.X.every(x => x.length === 64));
});

test('noise flips about the asked share of pixels', () => {
  const clean = makeGlyphs({ n: 400, seed: 9, noise: 0, shift: 0 });
  const noisy = makeGlyphs({ n: 400, seed: 9, noise: 0.15, shift: 0 });
  assert.deepEqual(clean.y.length, noisy.y.length);
  // The same seed draws the same classes; the noise changes pixels on top. Compare to the exact shape.
  let flips = 0;
  const exact = makeGlyphs({ n: 6, classes: 6, noise: 0, shift: 0 });
  const template = {};
  exact.X.forEach((x, i) => { template[exact.classes[exact.y[i]]] = x; });
  noisy.X.forEach((x, i) => { const c = template[noisy.classes[noisy.y[i]]]; for (let j = 0; j < 64; j++) if (x[j] !== c[j]) flips++; });
  const rate = flips / (400 * 64);
  assert.ok(Math.abs(rate - 0.15) < 0.01, `flip rate ${rate}`);
});

test('glyphs are deterministic and the seed matters', () => {
  const a = makeGlyphs({ n: 50, seed: 5 }), b = makeGlyphs({ n: 50, seed: 5 }), c = makeGlyphs({ n: 50, seed: 6 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.X, c.X);
  assert.ok(a.X.every(x => x.every(v => v === 0 || v === 1)));
});

test('makeGlyphs rejects bad options', () => {
  assert.throws(() => makeGlyphs({ classes: 1 }), /classes/);
  assert.throws(() => makeGlyphs({ classes: 7 }), /classes/);
  assert.throws(() => makeGlyphs({ classes: ['bar', 'dragon'] }), /unknown class/);
  assert.throws(() => makeGlyphs({ classes: ['bar'] }), /at least 2/);
  assert.throws(() => makeGlyphs({ noise: 0.9 }), /noise/);
  assert.throws(() => makeGlyphs({ shift: 4 }), /shift/);
  assert.throws(() => makeGlyphs({ n: -1 }), /n must/);
  assert.equal(makeGlyphs({ n: 0 }).X.length, 0);
});

test('the unlabelled pool is bare pictures from a different seed', () => {
  const pool = makeUnlabelledPool({ n: 120 });
  assert.equal(pool.length, 120);
  assert.ok(Array.isArray(pool[0]) && pool[0].length === 64);
  assert.deepEqual(pool, makeUnlabelledPool({ n: 120 }));
  assert.notDeepEqual(pool.slice(0, 20), makeGlyphs({ n: 120 }).X.slice(0, 20));
  assert.deepEqual(makeUnlabelledPool({ n: 20, seed: 3 }), makeGlyphs({ n: 20, seed: 3 }).X);
});

test('glyphRows prints 8 strings of # and .', () => {
  const x = new Array(64).fill(0); x[0] = 1; x[63] = 1;
  const rows = glyphRows(x);
  assert.equal(rows.length, 8);
  assert.equal(rows[0], '#.......');
  assert.equal(rows[7], '.......#');
});

// ---- autoencoder ----------------------------------------------------------------------------------------

// A cached shared autoencoder so several tests do not each pay for training.
let shared;
function sharedAe() {
  if (!shared) {
    const X = makeUnlabelledPool({ n: 400, seed: 11 });
    shared = { X, ae: trainAutoencoder({ X, epochs: 15, seed: 1 }) };
  }
  return shared;
}

// A 2 -> 1 -> 2 network with hand-set weights, so encode and decode can be checked by arithmetic.
function handAe() {
  const ae = trainAutoencoder({ X: [[0, 0]], bottleneck: 1, hidden: 0, epochs: 0 });
  ae.weights[0] = [[1, -1]]; ae.biases[0] = [0.5];
  ae.weights[1] = [[2], [-2]]; ae.biases[1] = [0, 1];
  return ae;
}

test('encode and decode follow the hand arithmetic', () => {
  const ae = handAe();
  const z = ae.encode([1, 0.5]);
  assert.equal(z.length, 1);
  close(z[0], Math.tanh(1 - 0.5 + 0.5));
  const sig = v => 1 / (1 + Math.exp(-v));
  const out = ae.decode([0.3]);
  close(out[0], sig(2 * 0.3));
  close(out[1], sig(-2 * 0.3 + 1));
  const r = ae.reconstruct([1, 0.5]);
  close(r[0], sig(2 * Math.tanh(1)));
  close(r[1], sig(-2 * Math.tanh(1) + 1));
});

test('reconstruction error is the mean squared error per pixel, by hand', () => {
  const ae = handAe();
  const sig = v => 1 / (1 + Math.exp(-v));
  const rowErr = x => {
    const t = Math.tanh(x[0] - x[1] + 0.5);
    const r0 = sig(2 * t), r1 = sig(-2 * t + 1);
    return ((r0 - x[0]) ** 2 + (r1 - x[1]) ** 2) / 2;
  };
  const X = [[1, 0.5], [0, 1], [0.2, 0.2]];
  const per = reconstructionErrors(ae, X);
  X.forEach((x, i) => close(per[i], rowErr(x)));
  close(reconstructionError(ae, X), mean(X.map(rowErr)));
  assert.equal(reconstructionError(ae, []), 0);
});

test('backpropagation matches a finite-difference gradient, with and without hidden layers', () => {
  const x = makeGlyphs({ n: 1, seed: 3 }).X[0];
  for (const hidden of [0, 6]) {
    const ae = trainAutoencoder({ X: [x], bottleneck: 3, hidden, epochs: 0, seed: 2 });
    const chk = autoencoderGradientCheck(ae, x);
    assert.ok(chk.ok, `hidden ${hidden}: maxError ${chk.maxError}`);
    assert.ok(chk.checked > 100);
  }
});

test('the architecture is encoder + decoder around a narrow middle', () => {
  const X = makeUnlabelledPool({ n: 20 });
  assert.deepEqual(trainAutoencoder({ X, bottleneck: 5, hidden: 12, epochs: 0 }).sizes, [64, 12, 5, 12, 64]);
  assert.deepEqual(trainAutoencoder({ X, bottleneck: 5, hidden: 0, epochs: 0 }).sizes, [64, 5, 64]);
  const { ae } = sharedAe();
  const z = ae.encode(X[0]);
  assert.equal(z.length, 12);
  assert.ok(z.every(v => v > -1 && v < 1));
  const px = ae.decode(z);
  assert.equal(px.length, 64);
  assert.ok(px.every(v => v > 0 && v < 1));
  assert.deepEqual(ae.reconstruct(X[0]), px.length === 64 ? ae.decode(ae.encode(X[0])) : null);
});

test('training lowers the reconstruction error epoch after epoch', () => {
  const X = makeUnlabelledPool({ n: 300, seed: 21 });
  const ae = trainAutoencoder({ X, epochs: 12, seed: 1 });
  const h = ae.history;
  assert.equal(h.loss.length, 12);
  assert.equal(ae.epochsTrained, 12);
  assert.ok(h.loss[0] < h.initialLoss, 'one epoch already helps');
  assert.ok(h.loss[11] < h.loss[0], 'and training keeps helping');
  assert.ok(h.loss[11] < 0.6 * h.initialLoss, `${h.loss[11]} vs ${h.initialLoss}`);
  // a picture it was never trained on is reconstructed nearly as well
  const fresh = makeUnlabelledPool({ n: 100, seed: 22 });
  assert.ok(reconstructionError(ae, fresh) < 0.7 * h.initialLoss);
  close(h.loss[11], reconstructionError(ae, X));
  // the error before training is what an untrained network gives
  close(h.initialLoss, reconstructionError(trainAutoencoder({ X, epochs: 0, seed: 1 }), X));
});

test('more training and more room both reduce the error on the same pictures', () => {
  const X = makeUnlabelledPool({ n: 200, seed: 31, noise: 0.05 });
  const short = trainAutoencoder({ X, epochs: 2, denoise: 0, seed: 1 });
  const long = trainAutoencoder({ X, epochs: 20, denoise: 0, seed: 1 });
  assert.ok(reconstructionError(long, X) < reconstructionError(short, X));
  const tight = trainAutoencoder({ X, bottleneck: 2, epochs: 20, denoise: 0, seed: 1 });
  const roomy = trainAutoencoder({ X, bottleneck: 16, epochs: 20, denoise: 0, seed: 1 });
  assert.ok(reconstructionError(roomy, X) < reconstructionError(tight, X));
});

test('autoencoder training is deterministic and train() continues exactly', () => {
  const X = makeUnlabelledPool({ n: 80, seed: 41 });
  const a = trainAutoencoder({ X, epochs: 4, seed: 7 });
  const b = trainAutoencoder({ X, epochs: 4, seed: 7 });
  assert.deepEqual(a.weights, b.weights);
  assert.deepEqual(a.history, b.history);
  const c = trainAutoencoder({ X, epochs: 4, seed: 8 });
  assert.notDeepEqual(a.weights, c.weights);
  const split = trainAutoencoder({ X, epochs: 2, seed: 7 });
  split.train(2);
  assert.deepEqual(split.weights, a.weights);
  assert.deepEqual(split.history.loss, a.history.loss);
  assert.equal(split.epochsTrained, 4);
});

test('trainAutoencoder rejects bad input', () => {
  assert.throws(() => trainAutoencoder({ X: [] }), /non-empty/);
  assert.throws(() => trainAutoencoder({ X: [[1, 2], [1]] }), /same length/);
  assert.throws(() => trainAutoencoder({ X: [[1, 2]], bottleneck: 0 }), /bottleneck/);
  assert.throws(() => trainAutoencoder({ X: [[1, 2]], hidden: -1 }), /hidden/);
});

test('featuresFrom accepts an autoencoder or a plain function', () => {
  const ae = handAe();
  const X = [[1, 0.5], [0, 1]];
  const f = featuresFrom(ae, X);
  assert.equal(f.length, 2);
  close(f[1][0], Math.tanh(0 - 1 + 0.5));
  assert.deepEqual(featuresFrom(x => [x[0] * 2], X), [[2], [0]]);
});

test('codes of the same shape sit closer together than codes of different shapes', () => {
  const { ae } = sharedAe();
  const g = makeGlyphs({ n: 120, seed: 51 });
  const Z = featuresFrom(ae, g.X);
  const d = (a, b) => Math.sqrt(sum(a.map((v, i) => (v - b[i]) ** 2)));
  let within = 0, between = 0, nw = 0, nb = 0;
  for (let i = 0; i < Z.length; i++) for (let j = i + 1; j < Z.length; j++) {
    if (g.y[i] === g.y[j]) { within += d(Z[i], Z[j]); nw++; } else { between += d(Z[i], Z[j]); nb++; }
  }
  assert.ok(within / nw < 0.8 * (between / nb), `within ${within / nw}, between ${between / nb}`);
});

// ---- classifiers ----------------------------------------------------------------------------------------

function blobs(k, perClass, seed) {
  const r = rng(seed);
  const X = [], y = [];
  for (let i = 0; i < perClass * k; i++) {
    const c = i % k;
    X.push([c * 4 + 0.3 * gauss(r), (c % 2) * 4 + 0.3 * gauss(r)]);
    y.push(c);
  }
  return { X, y };
}

test('fitProbe separates three well-apart classes and reports accuracy', () => {
  const tr = blobs(3, 20, 1), te = blobs(3, 20, 2);
  const probe = fitProbe(tr.X, tr.y, { classes: 3 });
  assert.equal(probe.classes, 3);
  assert.equal(probe.models.length, 3);
  assert.ok(probe.accuracy(te.X, te.y) >= 0.95);
  const pred = probe.predict(te.X);
  assert.equal(pred.length, te.y.length);
  assert.ok(pred.every(p => p >= 0 && p < 3));
  assert.equal(probe.accuracy([], []), 0);
  // classes may be inferred from the labels
  assert.equal(fitProbe(tr.X, tr.y).classes, 3);
  assert.throws(() => fitProbe([], []), /non-empty/);
});

test('fitScratchNet learns the same easy problem and is deterministic', () => {
  const tr = blobs(3, 15, 3), te = blobs(3, 15, 4);
  const a = fitScratchNet(tr.X, tr.y, { classes: 3, epochs: 80, seed: 2 });
  const b = fitScratchNet(tr.X, tr.y, { classes: 3, epochs: 80, seed: 2 });
  assert.ok(a.accuracy(te.X, te.y) >= 0.9);
  assert.deepEqual(a.predict(te.X), b.predict(te.X));
  assert.equal(a.models.length, 3);
});

test('subsetPerClass takes perClass from each class, deterministically, in data order', () => {
  const y = [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2];
  const idx = subsetPerClass(y, 2, { classes: 3, seed: 4 });
  assert.equal(idx.length, 6);
  assert.deepEqual(idx, idx.slice().sort((a, b) => a - b));
  for (let c = 0; c < 3; c++) assert.equal(idx.filter(i => y[i] === c).length, 2);
  assert.deepEqual(idx, subsetPerClass(y, 2, { classes: 3, seed: 4 }));
  assert.notDeepEqual(idx, subsetPerClass(y, 2, { classes: 3, seed: 5 }));
  assert.equal(subsetPerClass(y, 10, { classes: 3 }).length, 12); // a class with fewer gives what it has
  assert.equal(subsetPerClass(y, 1).length, 3); // classes inferred
});

// ---- the comparison -------------------------------------------------------------------------------------

function world(seed) {
  return {
    unlabelled: makeUnlabelledPool({ n: 600, seed: 1000 + seed }),
    labelledSmall: makeGlyphs({ n: 200, seed: 7 + seed }),
    test: makeGlyphs({ n: 200, seed: 99 + seed }),
  };
}

// Three independent worlds (their own pictures, labelled draws and autoencoder), compared once and shared.
const reports = {};
function report(seed) {
  if (!reports[seed]) reports[seed] = compareRepresentations({ ...world(seed), seed, sizes: [2, 5, 40], repeats: 3, scratch: false });
  return reports[seed];
}

test('with very few labels the frozen representation beats raw pixels by a clear margin', () => {
  const gains = { 0: [], 1: [] };
  for (const seed of [1, 2, 3]) {
    const rep = report(seed);
    rep.rows.slice(0, 2).forEach((r, i) => {
      assert.ok(r.frozen > r.raw + 0.02, `seed ${seed}, ${r.perClass}/class: frozen ${r.frozen} vs raw ${r.raw}`);
      assert.ok(r.frozen > 0.8, `frozen ${r.frozen}`);
      assert.ok(r.raw > rep.chance, 'raw pixels still beat guessing');
      close(r.frozenGain, r.frozen - r.raw);
      gains[i].push(r.frozenGain);
    });
  }
  assert.ok(mean(gains[0]) > 0.08, `mean gain at 2 per class: ${mean(gains[0])}`);
  assert.ok(mean(gains[1]) > 0.08, `mean gain at 5 per class: ${mean(gains[1])}`);
});

test('the frozen representation also beats a network trained from scratch on the same few labels', () => {
  const w = world(2);
  const rep = compareRepresentations({ ...w, seed: 2, sizes: [3], repeats: 2, autoencoder: report(2).ae });
  const r = rep.rows[0];
  assert.equal(r.nLabelled, 12);
  assert.ok(r.frozen > r.scratch + 0.05, `frozen ${r.frozen} vs scratch ${r.scratch}`);
  assert.ok(r.scratch > rep.chance);
});

test('with plenty of labels the gap closes', () => {
  const few = [], many = [];
  for (const seed of [1, 2, 3]) {
    const [f, , m] = report(seed).rows;
    assert.ok(m.raw > f.raw + 0.08, `raw pixels learn from labels: ${f.raw} -> ${m.raw}`);
    few.push(f.frozenGain); many.push(m.frozenGain);
  }
  assert.ok(mean(few) > 0.08);
  assert.ok(mean(many) < mean(few) - 0.06, `gain ${mean(few)} -> ${mean(many)}`);
  assert.ok(Math.abs(mean(many)) < 0.06, `gain with many labels: ${mean(many)}`);
});

test('compareRepresentations is deterministic, reuses a given autoencoder and reports its shape', () => {
  const w = world(2);
  const opts = { ...w, seed: 3, sizes: [1, 4], repeats: 1, epochs: 6, scratch: false };
  const a = compareRepresentations(opts), b = compareRepresentations(opts);
  assert.deepEqual(a.rows, b.rows);
  assert.deepEqual(a.sizes, [1, 4]);
  assert.equal(a.classes, 4);
  close(a.chance, 0.25);
  assert.deepEqual(a.rows.map(r => r.nLabelled), [4, 16]);
  assert.equal(a.rows[0].scratch, null);
  assert.equal(a.ae.bottleneck, 12);
  const again = compareRepresentations({ ...opts, autoencoder: a.ae });
  assert.equal(again.ae, a.ae);
  assert.deepEqual(again.rows, a.rows);
  const small = compareRepresentations({ ...opts, bottleneck: 3 });
  assert.equal(small.ae.bottleneck, 3);
  assert.throws(() => compareRepresentations({ unlabelled: w.unlabelled }), /labelledSmall and test/);
  assert.throws(() => compareRepresentations({ ...w, unlabelled: [] }), /non-empty/);
});
