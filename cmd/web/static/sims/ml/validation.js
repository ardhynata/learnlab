// Validation and hyperparameter-tuning helpers for the "Validation and hyperparameter tuning"
// module. Pure functions, seeded and reproducible, tested in validation.test.js.
//
// API
//   Fold builders. Each returns an array of folds { train: number[], test: number[] } of row
//   indices (both sorted ascending). A fold's train and test never overlap.
//     kFold(n, k, seed)                 shuffle rows, deal them into k folds whose sizes differ by
//                                       at most 1; every row is in exactly one test set.
//     stratifiedKFold(labels, k, seed)  like kFold, but each class is dealt out separately so the
//                                       per-class counts in any two folds differ by at most 1.
//     groupKFold(groups, k, seed)       whole groups (people, patients, sites) go to one fold, so
//                                       no group is ever in both train and test. Larger groups are
//                                       placed first, each into the currently smallest fold.
//                                       Needs at least k distinct groups.
//     timeSplit(n, folds, gap = 0)      expanding window over rows already in time order: fold i
//                                       trains on every row before a cut and tests on the next
//                                       block, so training never contains the future. `gap` rows
//                                       just before the test block are left out of training
//                                       (an embargo). The first block is only ever training data.
//
//   crossValidate({ X, y, fitPredict, folds, metric })
//       X: feature rows, y: labels, folds: from a builder above (or your own).
//       fitPredict(trainX, trainY, testX) -> predictions for testX.
//       metric(yTrue, yPred) -> number (default accuracy; higher is better).
//       Returns { scores, mean, sd, folds } where scores has one value per fold and sd is the
//       sample standard deviation (n - 1; 0 for a single fold).
//   knnFitPredict(k) -> a fitPredict for crossValidate, built on sims/ml/knn.js (Euclidean).
//   accuracy(yTrue, yPred)
//
//   makeEntityData({ people, recordsEach, signal, personEffect, seed })
//       Synthetic records for several people. Row: { person, time, features, label } with
//       features = [signalFeature, quirk1, quirk2, quirk3] and label 0 or 1.
//         signalFeature = (label ? +1 : -1) * signal / 2 + noise      the real, transferable signal
//         quirk_j       = personEffect * personVector_j + small noise a persistent personal quirk
//       Each person also leans one way (about 85% of their records share one label), so the
//       quirk identifies the person and, through the person, the label. A random split lets the
//       model recognise a person from another of their records, which inflates the score; a
//       grouped split cannot. `time` is the record's order within the whole table (people are
//       interleaved, so it is also a valid time order). Defaults: people 40, recordsEach 8,
//       signal 1, personEffect 2, seed 1.
//   entityXY(rows) -> { X, y, groups } for the fold builders and crossValidate.
//
//   Search over a space { name: values }. A value list is a set of choices; { min, max } is a
//   numeric range ({ log: true } samples it on a log scale, { integer: true } rounds it).
//   evaluate(config) -> score, higher is better. Both return
//   { best: { config, score }, results: [{ config, score }], evaluations }.
//     gridSearch(space, evaluate)                 every combination (value lists only), in
//                                                 declaration order; ties keep the first.
//     randomSearch(space, evaluate, budget, seed) `budget` random configurations. Value-list
//                                                 spaces are sampled without repeats.
//   gridConfigs(space) -> every combination, for counting or drawing the grid.

import { rng, gauss, shuffle } from './rng.js';
import { mean, stdDev } from './stats.js';
import { classify } from './knn.js';

const sorted = xs => xs.slice().sort((a, b) => a - b);
const range = n => Array.from({ length: n }, (_, i) => i);

function checkK(n, k, what = 'rows') {
  if (!Number.isInteger(k) || k < 2) throw new RangeError('k must be an integer of at least 2');
  if (k > n) throw new RangeError(`k = ${k} is more than the ${n} ${what}`);
}

// Turn a list of test-index lists into folds (train = every other row).
function foldsFromTests(n, tests) {
  return tests.map(t => {
    const test = sorted(t);
    const inTest = new Set(test);
    return { train: range(n).filter(i => !inTest.has(i)), test };
  });
}

export function kFold(n, k, seed = 1) {
  checkK(n, k);
  const order = shuffle(range(n), rng(seed));
  const tests = Array.from({ length: k }, () => []);
  order.forEach((row, i) => tests[i % k].push(row));
  return foldsFromTests(n, tests);
}

export function stratifiedKFold(labels, k, seed = 1) {
  const n = labels.length;
  checkK(n, k);
  const random = rng(seed);
  const classes = [...new Set(labels.map(String))];
  const tests = Array.from({ length: k }, () => []);
  let next = 0; // the dealing carries on from one class to the next, so fold sizes stay within 1
  for (const c of classes) {
    const rows = range(n).filter(i => String(labels[i]) === c);
    for (const row of shuffle(rows, random)) tests[next++ % k].push(row);
  }
  return foldsFromTests(n, tests);
}

export function groupKFold(groups, k, seed = 1) {
  const n = groups.length;
  const members = new Map();
  groups.forEach((g, i) => {
    if (!members.has(g)) members.set(g, []);
    members.get(g).push(i);
  });
  checkK(members.size, k, 'groups');
  // The seeded shuffle only breaks ties between groups of equal size; stable sort keeps it.
  const order = shuffle([...members.keys()], rng(seed))
    .sort((a, b) => members.get(b).length - members.get(a).length);
  const tests = Array.from({ length: k }, () => []);
  for (const g of order) {
    let smallest = 0;
    for (let f = 1; f < k; f++) if (tests[f].length < tests[smallest].length) smallest = f;
    tests[smallest].push(...members.get(g));
  }
  return foldsFromTests(n, tests);
}

export function timeSplit(n, folds, gap = 0) {
  if (!Number.isInteger(folds) || folds < 1) throw new RangeError('folds must be an integer of at least 1');
  if (!Number.isInteger(gap) || gap < 0) throw new RangeError('gap must be a non-negative integer');
  const cut = i => Math.round((n * i) / (folds + 1));
  const out = [];
  for (let i = 1; i <= folds; i++) {
    const start = cut(i), end = cut(i + 1);
    const train = range(Math.max(0, start - gap));
    const test = range(end - start).map(j => start + j);
    if (!train.length || !test.length) throw new RangeError(`${n} rows are too few for ${folds} time folds`);
    out.push({ train, test });
  }
  return out;
}

export const accuracy = (yTrue, yPred) => {
  if (!yTrue.length) return NaN;
  let right = 0;
  yTrue.forEach((t, i) => { if (String(t) === String(yPred[i])) right++; });
  return right / yTrue.length;
};

export function crossValidate({ X, y, fitPredict, folds, metric = accuracy }) {
  if (X.length !== y.length) throw new RangeError('X and y must have the same length');
  const scores = folds.map(({ train, test }) => {
    const pred = fitPredict(train.map(i => X[i]), train.map(i => y[i]), test.map(i => X[i]));
    return metric(test.map(i => y[i]), pred);
  });
  return { scores, mean: mean(scores), sd: scores.length > 1 ? stdDev(scores, { sample: true }) : 0, folds };
}

// k-NN as a fitPredict. Labels come back as they went in (knn.js votes by string key).
export function knnFitPredict(k = 5) {
  return (trainX, trainY, testX) => {
    const points = trainX.map((features, i) => ({ features, label: trainY[i] }));
    const original = new Map(trainY.map(l => [String(l), l]));
    return testX.map(q => original.get(String(classify(points, q, k).label)));
  };
}

const QUIRKS = 3;

export function makeEntityData({ people = 40, recordsEach = 8, signal = 1, personEffect = 2, seed = 1 } = {}) {
  const random = rng(seed);
  const crew = Array.from({ length: people }, () => ({
    lean: random() < 0.5 ? 0 : 1,
    vec: Array.from({ length: QUIRKS }, () => gauss(random)),
  }));
  const rows = [];
  for (let r = 0; r < recordsEach; r++) {
    crew.forEach((p, person) => {
      const label = random() < 0.85 ? p.lean : 1 - p.lean;
      const features = [(label ? 1 : -1) * signal / 2 + gauss(random)];
      for (let j = 0; j < QUIRKS; j++) features.push(personEffect * p.vec[j] + 0.3 * gauss(random));
      rows.push({ person, time: rows.length, features, label });
    });
  }
  return rows;
}

export const entityXY = rows => ({
  X: rows.map(r => r.features),
  y: rows.map(r => r.label),
  groups: rows.map(r => r.person),
});

const isRange = v => v && !Array.isArray(v) && typeof v === 'object' && 'min' in v && 'max' in v;

export function gridConfigs(space) {
  let configs = [{}];
  for (const [name, values] of Object.entries(space)) {
    if (!Array.isArray(values)) throw new TypeError(`gridSearch needs a list of values for "${name}"`);
    configs = configs.flatMap(c => values.map(v => ({ ...c, [name]: v })));
  }
  return configs;
}

function runSearch(configs, evaluate) {
  const results = configs.map(config => ({ config, score: evaluate(config) }));
  let best = results[0];
  for (const r of results) if (r.score > best.score) best = r; // strict: ties keep the first
  return { best, results, evaluations: results.length };
}

export function gridSearch(space, evaluate) {
  return runSearch(gridConfigs(space), evaluate);
}

function draw(spec, random) {
  if (Array.isArray(spec)) return spec[Math.floor(random() * spec.length)];
  if (!isRange(spec)) throw new TypeError('a search space value is a list or { min, max }');
  const { min, max, log = false, integer = false } = spec;
  const v = log
    ? Math.exp(Math.log(min) + random() * (Math.log(max) - Math.log(min)))
    : min + random() * (max - min);
  return integer ? Math.min(max, Math.max(min, Math.round(v))) : v;
}

export function randomSearch(space, evaluate, budget, seed = 1) {
  if (!Number.isInteger(budget) || budget < 1) throw new RangeError('budget must be a positive integer');
  const random = rng(seed);
  const names = Object.keys(space);
  if (names.every(n => Array.isArray(space[n]))) {
    // Discrete space: every draw is a different configuration (up to the size of the grid).
    const all = gridConfigs(space);
    return runSearch(shuffle(all, random).slice(0, budget), evaluate);
  }
  const configs = Array.from({ length: budget }, () =>
    Object.fromEntries(names.map(n => [n, draw(space[n], random)])));
  return runSearch(configs, evaluate);
}
