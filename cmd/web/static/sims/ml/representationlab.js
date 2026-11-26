// Pure logic of the representation lab (sims/labs/representation-lab.js): the data tasks (generated glyphs or the
// four penguin measurements), the scoring of the three ways to use a few labels, a small work queue that runs
// slices of work inside a time budget, and a 2-D projection of a learned code. Tested in representationlab.test.js.
// Everything is deterministic: the same options and seed give the same data, the same subsets and the same scores.
//
// API
//   LAB_SIZES = [2, 5, 10, 25, 50, 100]      labelled examples per class that the comparison chart always scores
//   sizeGrid(current) -> sorted unique sizes: LAB_SIZES plus the learner's current size
//   makeGlyphTask({ seed = 1, noise = 0.15, classes = 4, poolSize = 400, testSize = 240, perClassMax = 100 })
//       -> task = { kind: 'glyph', classNames, k, d, pool, labelled: { X, y }, test: { X, y }, perClassMax }
//       pool is the unlabelled pictures the autoencoder learns from, labelled holds perClassMax pictures per class to
//       draw labelled subsets from, test is held out. Three different seeds are derived from `seed`.
//   makePenguinTask(table, seed = 1) -> task = { kind: 'penguin', classNames, k, d: 4, pool, labelled, test,
//                                       perClassMax, total, dropped, lo, hi }
//       table is the parsed penguins.csv. Rows with a missing (NA) measurement are dropped (dropped counts them). The four
//       measurements are scaled to 0..1 with the range of all complete rows (lo, hi per column), then the rows are split
//       in half per species: the first half is the labelled pool (its X is also the unlabelled pool), the rest is the test set.
//   scoreSteps(method, { task, ae, testCodes, perClass, rep, seed }) -> generator; its return value is the test accuracy
//       method 'frozen' (linear classifier on the frozen autoencoder code), 'raw' (the same classifier on the raw
//       features) or 'scratch' (a small network trained on the raw features from the labels alone, in mini-batches so
//       a big labelled set stays cheap). The labelled subset is perClass rows per class, drawn with seed + rep.
//   createQueue() -> { push(job), pushFront(job), clear(), size(), run(budgetMs, now = performance.now) }
//       A job is { key, gen, onDone(value) }; run() advances the generators of the head job for up to budgetMs (at least one step).
//   projectTo2d(codes) -> { points: [[x, y], ...] in 0..10, explained } the first two principal components of the codes
//       (the codes themselves when they have exactly 2 columns), scaled to fit the 0..10 plot square with one scale for both axes.
//       explained is the share of the code's variance the two axes keep (1 for a 2-column code).
//   pcaBaseline(task, k = 2) -> { model, testCodes, mse } the PCA of the pool and its reconstruction error per feature on the
//       test rows (the same measure as reconstructionError in representation.js).
//   winnerOf(frozen, raw, margin = 0.03) -> 'frozen' | 'raw' | 'tie'
import { rng } from './rng.js';
import { makeGlyphs, makeUnlabelledPool, GLYPH_PIXELS, featuresFrom, fitProbe, subsetPerClass } from './representation.js';
import { createMlp, train as trainMlp, predictOutput } from './mlp.js';
import { fitPca, project, reconstructionError as pcaReconstructionError } from './pca.js';
import { splitIndices } from './tabular.js';

export const LAB_SIZES = [2, 5, 10, 25, 50, 100];

export function sizeGrid(current) {
  return [...new Set([...LAB_SIZES, current])].filter(Number.isFinite).sort((a, b) => a - b);
}

// A well-mixed derived seed, so the labelled, test and pool pictures of one seed do not share a random stream.
export function mixSeed(a, b) {
  let h = Math.imul((a >>> 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b >>> 0) + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

export function makeGlyphTask({ seed = 1, noise = 0.15, classes = 4, poolSize = 400, testSize = 240, perClassMax = 100 } = {}) {
  const k = typeof classes === 'number' ? classes : classes.length;
  const labelled = makeGlyphs({ n: perClassMax * k, classes, seed: mixSeed(seed, 1), noise });
  const test = makeGlyphs({ n: testSize, classes, seed: mixSeed(seed, 2), noise });
  const pool = makeUnlabelledPool({ n: poolSize, classes, seed: mixSeed(seed, 3), noise });
  return {
    kind: 'glyph', classNames: labelled.classes, k, d: GLYPH_PIXELS, pool,
    labelled: { X: labelled.X, y: labelled.y }, test: { X: test.X, y: test.y }, perClassMax,
  };
}

export const PENGUIN_COLUMNS = ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g'];

export function makePenguinTask(table, seed = 1) {
  const ok = v => typeof v === 'number' && Number.isFinite(v);
  const rows = table.rows.filter(r => typeof r.species === 'string' && PENGUIN_COLUMNS.every(c => ok(r[c])));
  const names = [...new Set(rows.map(r => r.species))].sort();
  const lo = PENGUIN_COLUMNS.map(c => Math.min(...rows.map(r => r[c])));
  const hi = PENGUIN_COLUMNS.map(c => Math.max(...rows.map(r => r[c])));
  const X = rows.map(r => PENGUIN_COLUMNS.map((c, j) => (r[c] - lo[j]) / ((hi[j] - lo[j]) || 1)));
  const y = rows.map(r => names.indexOf(r.species));
  const parts = splitIndices(rows.length, { train: 0.5, validation: 0 }, mixSeed(seed, 4), y);
  const pick = idx => ({ X: idx.map(i => X[i]), y: idx.map(i => y[i]) });
  const labelled = pick(parts.train.slice().sort((a, b) => a - b));
  const test = pick(parts.test.slice().sort((a, b) => a - b));
  const counts = names.map((_, c) => labelled.y.filter(v => v === c).length);
  return {
    kind: 'penguin', classNames: names, k: names.length, d: PENGUIN_COLUMNS.length,
    pool: labelled.X, labelled, test, perClassMax: Math.min(...counts),
    total: table.rows.length, dropped: table.rows.length - rows.length, lo, hi,
  };
}

// ---- scoring -----------------------------------------------------------------------------------------------

const argmax = a => a.reduce((best, v, i) => (v > a[best] ? i : best), 0);

// One-vs-rest small networks on the raw features, trained with Adam in mini-batches, one epoch per step of the
// generator. The number of epochs shrinks as the labelled set grows so that every size gets about `updates`
// weight updates (and a big set stays cheap): 8 rows is one full-batch update per epoch for 150 epochs, 400 rows
// is 13 updates per epoch for 12 epochs.
function* fitScratch(X, y, { k, seed, hidden = 8, lr = 0.05, batchSize = 32, updates = 150 }) {
  const perEpoch = Math.ceil(X.length / batchSize);
  const epochs = Math.max(1, Math.min(150, Math.ceil(updates / perEpoch)));
  const models = [];
  for (let c = 0; c < k; c++) {
    const model = createMlp({ layers: [X[0].length, hidden, 1], activation: 'relu', seed: mixSeed(seed, c) });
    const target = y.map(v => (v === c ? 1 : 0));
    for (let e = 0; e < epochs; e++) {
      trainMlp({ model, X, y: target, optimizer: 'adam', lr, epochs: 1, batchSize, seed: mixSeed(seed, 100 + c) });
      yield;
    }
    models.push(model);
  }
  return Z => {
    const P = models.map(m => predictOutput(m, Z));
    return Z.map((_, i) => argmax(P.map(col => col[i])));
  };
}

const accuracyOf = (predicted, y) => predicted.reduce((s, p, i) => s + (p === y[i] ? 1 : 0), 0) / (y.length || 1);

export function* scoreSteps(method, { task, ae, testCodes, perClass, rep = 0, seed = 1 }) {
  const k = task.k;
  const idx = subsetPerClass(task.labelled.y, perClass, { classes: k, seed: seed + rep });
  const Xs = idx.map(i => task.labelled.X[i]);
  const ys = idx.map(i => task.labelled.y[i]);
  if (method === 'frozen') {
    if (!ae) throw new Error('scoreSteps frozen: needs an autoencoder');
    yield;
    return fitProbe(featuresFrom(ae, Xs), ys, { classes: k }).accuracy(testCodes ?? featuresFrom(ae, task.test.X), task.test.y);
  }
  if (method === 'raw') {
    yield;
    return fitProbe(Xs, ys, { classes: k }).accuracy(task.test.X, task.test.y);
  }
  if (method === 'scratch') {
    const predict = yield* fitScratch(Xs, ys, { k, seed: mixSeed(seed, rep + 1) });
    return accuracyOf(predict(task.test.X), task.test.y);
  }
  throw new Error(`scoreSteps: unknown method "${method}"`);
}

export function winnerOf(frozen, raw, margin = 0.03) {
  if (frozen - raw > margin) return 'frozen';
  if (raw - frozen > margin) return 'raw';
  return 'tie';
}

// ---- the work queue ----------------------------------------------------------------------------------------

export function createQueue() {
  const jobs = [];
  return {
    push(job) { jobs.push(job); },
    pushFront(job) { jobs.unshift(job); },
    clear() { jobs.length = 0; },
    size: () => jobs.length,
    // Advances the head job until budgetMs has passed (always at least one step). Returns the number of steps run.
    run(budgetMs, now = () => performance.now()) {
      const start = now();
      let steps = 0;
      while (jobs.length) {
        const job = jobs[0];
        const r = job.gen.next();
        steps++;
        if (r.done) { jobs.shift(); job.onDone?.(r.value); }
        if (now() - start >= budgetMs) break;
      }
      return steps;
    },
  };
}

// ---- projection --------------------------------------------------------------------------------------------

export function projectTo2d(codes) {
  if (!codes.length) return { points: [], explained: 1 };
  const d = codes[0].length;
  let pts, explained = 1;
  if (d === 2) pts = codes.map(c => [c[0], c[1]]);
  else if (d === 1) pts = codes.map(c => [c[0], 0]);
  else {
    const model = fitPca(codes);
    pts = project(model, codes, 2);
    explained = model.explainedRatio[0] + model.explainedRatio[1];
  }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const span = Math.max(x1 - x0, y1 - y0);
  if (!(span > 0)) return { points: pts.map(() => [5, 5]), explained };
  const s = 9 / span, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return { points: pts.map(([x, y]) => [5 + (x - cx) * s, 5 + (y - cy) * s]), explained };
}

export function pcaBaseline(task, k = 2) {
  const model = fitPca(task.pool);
  const testCodes = project(model, task.test.X, k);
  return { model, testCodes, mse: pcaReconstructionError(model, task.test.X, k) / task.d };
}
