// Pure logic for the ensemble lab (sims/labs/ensemble-lab.js): the noisy data, the real penguin pair,
// both ensembles fitted once for the maximum number of trees, their error curves, the early-stopping
// point and the "which method overfits" answer. No DOM, no clock: the same inputs give the same output.
// Tested in ensemblelab.test.js. Built on sims/ml/ensemble.js (bagging, gradientBoost, earlyStopping).
import { moons, checker } from './datasets.js';
import { rng } from './rng.js';
import { splitIndices } from './tabular.js';
import { bagging, gradientBoost, earlyStopping } from './ensemble.js';

export const MAX_TREES = 100;
export const TOTAL_POINTS = 200;       // generated points; half train the trees, half check them
export const BAG_DEPTH = 8;            // bagged trees are grown deep: each one is a high-variance model on purpose
export const BAG_MIN_LEAF = 3;         // ...but a leaf keeps at least 3 points, so one stray point cannot make a leaf certain
export const DEFAULTS = {
  seed: 11, kind: 'moons', noise: 0.35, trees: 3, forest: false, fraction: 0.5,
  rate: 0.5, depth: 3, metric: 'logloss', xcol: 'bill_length_mm', ycol: 'bill_depth_mm',
};
export const PAIR = ['Adelie', 'Chinstrap'];    // the two penguin species the real-data switch separates
export const MEASUREMENTS = ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g'];

// ---------------------------------------------------------------- data

// Two noisy classes in the 0..10 square. moons: the noise slider smears the two half-moons (0.15 to 1
// point of spread). checker: the cells of a 2 x 2 checkerboard, with a share of the labels flipped
// (0 to 35%), so some points sit on the wrong side whatever the model does.
export function generatedData(kind, seed, noise, n = TOTAL_POINTS) {
  const pts = kind === 'checker' ? checker(seed, { n }) : moons(seed, { n, noise: 0.15 + 0.85 * noise });
  let label = p => p.label;
  if (kind === 'checker') {
    const r = rng(seed * 31 + 7);
    const flip = 0.35 * noise;
    label = p => (r() < flip ? 1 - p.label : p.label);
  }
  return { X: pts.map(p => [p.x, p.y]), y: pts.map(label) };
}

// The penguins of the pair that have all four measurements, with two chosen measurements rescaled to
// 0..10 over those penguins (so a new sample never moves the axes). `total` counts every row of the
// table, `inPair` the rows of the two species, `dropped` the ones left out for a missing value (NA).
export function penguinPair(table, xcol, ycol, pair = PAIR) {
  const ok = v => typeof v === 'number' && Number.isFinite(v);
  const inPair = table.rows.filter(r => pair.includes(r.species));
  const rows = inPair.filter(r => MEASUREMENTS.every(c => ok(r[c])));
  const scale = col => {
    const v = rows.map(r => r[col]);
    const lo = Math.min(...v), hi = Math.max(...v);
    return x => (hi === lo ? 5 : (x - lo) / (hi - lo) * 10);
  };
  const sx = scale(xcol), sy = scale(ycol);
  return {
    X: rows.map(r => [sx(r[xcol]), sy(r[ycol])]),
    y: rows.map(r => (r.species === pair[1] ? 1 : 0)),
    total: table.rows.length, inPair: inPair.length, dropped: inPair.length - rows.length,
    counts: pair.map(s => rows.filter(r => r.species === s).length),
  };
}

// Half the rows train the trees, half are held back to check them; each class keeps its share.
export function splitData({ X, y }, seed) {
  const parts = splitIndices(X.length, { train: 0.5, validation: 0.5 }, seed, y);
  const pick = idx => ({ X: idx.map(i => X[i]), y: idx.map(i => y[i]) });
  return { train: pick(parts.train), validation: pick(parts.validation) };
}

// ---------------------------------------------------------------- the two ensembles

// Bagging (forest = false) or a random forest (forest = true, `fraction` of the features per split).
export function fitBagging(train, { forest, fraction, seed, trees = MAX_TREES, maxDepth = BAG_DEPTH, minLeaf = BAG_MIN_LEAF }) {
  return bagging({ X: train.X, y: train.y, trees, maxDepth, minLeaf, seed, featureFraction: forest ? fraction : 1 });
}

export function fitBoosting(train, { rate, depth, seed, trees = MAX_TREES }) {
  return gradientBoost({ X: train.X, y: train.y, trees, learningRate: rate, maxDepth: depth, seed });
}

// Error rate and log loss after 1..T trees, on the training rows and on the held-back rows.
export function curvesOf(model, train, validation) {
  const tr = model.stagedValidation(train.X, train.y), va = model.stagedValidation(validation.X, validation.y);
  return {
    trainLoss: tr.logLoss, validationLoss: va.logLoss,
    trainError: tr.accuracy.map(a => 1 - a), validationError: va.accuracy.map(a => 1 - a),
  };
}

// The curves of one metric: 'logloss' or 'error'.
export const metricCurves = (c, metric) => (metric === 'error'
  ? { train: c.trainError, validation: c.validationError }
  : { train: c.trainLoss, validation: c.validationLoss });

// The early-stopping point on the first `upTo` trees: the number of trees with the lowest validation
// value (the first one when several tie), and that value.
export function bestTrees(validation, upTo = validation.length) {
  const shown = validation.slice(0, Math.max(1, Math.min(upTo, validation.length)));
  const best = earlyStopping(shown);
  return { best, value: shown[best - 1] };
}

// Does a validation LOG LOSS curve climb back up after its lowest point? Yes when the last value is
// more than `margin` above the minimum (0.02 of log loss: about 2% of a coin flip's 0.69).
export function risesAgain(validationLoss, margin = 0.02) {
  const { best, value } = bestTrees(validationLoss);
  return { rises: validationLoss[validationLoss.length - 1] - value > margin, best, value, last: validationLoss[validationLoss.length - 1] };
}

// Which method overfits as trees are added, judged on validation log loss at the maximum number of
// trees: 'boost', 'bag', 'both' or 'neither'.
export function overfitAnswer(bagLoss, boostLoss) {
  const bag = risesAgain(bagLoss).rises, boost = risesAgain(boostLoss).rises;
  return bag && boost ? 'both' : boost ? 'boost' : bag ? 'bag' : 'neither';
}

// ---------------------------------------------------------------- decision regions

// P(class 1) at the centres of a g x g grid over the 0..10 square, row-major from the bottom row up
// (index = row * g + col, row 0 is y near 0). Uses the first `upTo` trees.
export function regionGrid(model, upTo, g) {
  const rows = [];
  for (let r = 0; r < g; r++) for (let c = 0; c < g; c++) rows.push([(c + 0.5) * 10 / g, (r + 0.5) * 10 / g]);
  return model.predictProbaAll(rows, upTo);
}

// The number of features a random-forest split looks at, as the model computes it.
export const featuresPerSplit = (fraction, d = 2) => Math.max(1, Math.round(fraction * d));
