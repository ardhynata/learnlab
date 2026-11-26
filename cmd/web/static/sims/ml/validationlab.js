// Pure logic behind the validation lab: a fast k-NN that can weight its first feature, the
// random / grouped / time-ordered comparison on one table, the person-overlap count that says
// what leaked, a budgeted grid-versus-random search, and the penguin tables the real-data mode
// uses. Built on sims/ml/validation.js (folds, crossValidate, search). Tested in validationlab.test.js.
//
// API
//   knnPredictor({ k, weight = 1, standardize = false }) -> fitPredict(trainX, trainY, testX)
//       k-NN by Euclidean distance. The first feature is multiplied by `weight` before distances
//       are measured. With standardize, every column is centred and scaled with the TRAINING rows
//       only (so no test row is looked at). Ties between equal votes go to the closest neighbour,
//       the way sims/ml/knn.js decides them; with weight 1 and no standardize the two agree.
//   groupOverlap(folds, groups) -> share (0..1) of test rows whose group also has a training row
//       in the same fold. This is the leak: 1 for a random split of records of the same people,
//       0 for a grouped split.
//   majorityShare(y) -> share of the most common label (the accuracy of always guessing it).
//   timeFolds(times, folds) -> folds in the order of `times`, expanding window. Rows with few distinct
//       times (a year column: at most 12 distinct values, at most half as many as rows) are cut at
//       the time values themselves: fold i trains on every earlier time and tests on the next one,
//       with `label` = that time, so the folds are at most distinct - 1 and never split one year.
//       Otherwise the rows are put in time order and cut with timeSplit(n, folds).
//   compareSplits({ X, y, groups, times, folds, seed, model, temporal }) ->
//       { random, grouped, temporal | null, gap, overlap: { random, grouped, temporal }, baseline,
//         groupFolds }
//       random / grouped / temporal are crossValidate results ({ scores, mean, sd, folds }).
//       gap = random.mean - grouped.mean, the optimism of the random split. Grouped k-fold uses
//       `folds` folds when there are enough groups, otherwise one fold per group.
//       The time-ordered split is timeFolds(times, folds).
//   splitVerdict(gap, tolerance = 0.02) -> 'random-higher' | 'same' | 'grouped-higher'
//   gridShape(budget) -> [a, b]: the grid for a budget, a values of the first setting by b of the
//       second, a * b <= budget, as close to the budget as possible and as square as possible.
//   spread(min, max, count, { log, integer }) -> count evenly spaced values (log-spaced if asked).
//   bestSoFar(scores) -> running maximum, one value per evaluation.
//   searchCompare({ evaluate, budget, seed, kRange, weightRange }) ->
//       { grid, random } each { best: { config, score }, results, evaluations, curve, shape? }.
//       evaluate({ k, weight }) -> score. The grid is gridShape(budget) wide (k outer, weight inner);
//       the random search draws `budget` configurations (k integer, weight on a log scale).
//   penguinTable(table, target = 'species') -> { X, y, groups, times, features, total, dropped,
//       droppedFor, classes } with the complete rows only; groups are islands, times are years.
//   tablePeek(groups, perGroup, groupCount) -> row indices: the first `perGroup` rows of
//       each of the first `groupCount` groups, in group order.

import { gridSearch, randomSearch, kFold, groupKFold, timeSplit, crossValidate } from './validation.js';

const FEATURES = ['flipper_length_mm', 'bill_length_mm', 'bill_depth_mm', 'body_mass_g'];

export function knnPredictor({ k = 5, weight = 1, standardize = false } = {}) {
  return (trainX, trainY, testX) => {
    const dims = trainX[0]?.length ?? 0;
    const mu = new Array(dims).fill(0), scale = new Array(dims).fill(1);
    if (standardize && trainX.length) {
      for (let j = 0; j < dims; j++) {
        let s = 0;
        for (const r of trainX) s += r[j];
        mu[j] = s / trainX.length;
        let v = 0;
        for (const r of trainX) v += (r[j] - mu[j]) ** 2;
        const sd = Math.sqrt(v / trainX.length);
        scale[j] = sd > 0 ? 1 / sd : 1;
      }
    }
    scale[0] *= weight;
    const prep = r => Float64Array.from(r, (v, j) => (v - mu[j]) * scale[j]);
    const train = trainX.map(prep);
    const keep = Math.min(k, train.length);
    const original = new Map(trainY.map(l => [String(l), l]));
    return testX.map(row => {
      const q = prep(row);
      const bestD = new Array(keep), bestI = new Array(keep);
      let size = 0;
      for (let i = 0; i < train.length; i++) {
        const t = train[i];
        let d = 0;
        for (let j = 0; j < dims; j++) { const e = t[j] - q[j]; d += e * e; }
        if (size === keep && d >= bestD[keep - 1]) continue;   // not closer than the k-th: skip (earlier index wins ties)
        let pos = size < keep ? size++ : keep - 1;
        while (pos > 0 && bestD[pos - 1] > d) { bestD[pos] = bestD[pos - 1]; bestI[pos] = bestI[pos - 1]; pos--; }
        bestD[pos] = d; bestI[pos] = i;
      }
      const votes = new Map();
      for (let n = 0; n < size; n++) { const l = String(trainY[bestI[n]]); votes.set(l, (votes.get(l) ?? 0) + 1); }
      const top = Math.max(...votes.values());
      for (let n = 0; n < size; n++) {
        const l = String(trainY[bestI[n]]);
        if (votes.get(l) === top) return original.get(l);   // closest neighbour among the leaders
      }
      return undefined;
    });
  };
}

export function groupOverlap(folds, groups) {
  let seen = 0, total = 0;
  for (const { train, test } of folds) {
    const inTrain = new Set(train.map(i => groups[i]));
    for (const i of test) { total++; if (inTrain.has(groups[i])) seen++; }
  }
  return total ? seen / total : NaN;
}

export function majorityShare(y) {
  if (!y.length) return NaN;
  const counts = new Map();
  for (const l of y) counts.set(String(l), (counts.get(String(l)) ?? 0) + 1);
  return Math.max(...counts.values()) / y.length;
}

export function timeFolds(times, folds) {
  const n = times.length;
  const order = times.map((_, i) => i).sort((a, b) => times[a] - times[b] || a - b);
  const distinct = [...new Set(times)].sort((a, b) => a - b);
  if (distinct.length <= 12 && distinct.length * 2 <= n) {
    if (distinct.length < 2) throw new RangeError('a time split needs at least two different times');
    return distinct.slice(1).map(t => ({
      train: order.filter(i => times[i] < t).sort((a, b) => a - b),
      test: order.filter(i => times[i] === t).sort((a, b) => a - b),
      label: t,
    }));
  }
  return timeSplit(n, folds).map(({ train, test }) => ({
    train: train.map(p => order[p]).sort((a, b) => a - b),
    test: test.map(p => order[p]).sort((a, b) => a - b),
    label: null,
  }));
}

export function compareSplits({ X, y, groups, times, folds = 5, seed = 1, model = {}, temporal = false }) {
  const n = X.length;
  const fitPredict = knnPredictor(model);
  const people = new Set(groups).size;
  const groupFolds = Math.min(folds, people);
  const randomFolds = kFold(n, folds, seed);
  const groupedFolds = groupKFold(groups, groupFolds, seed);
  const random = crossValidate({ X, y, fitPredict, folds: randomFolds });
  const grouped = crossValidate({ X, y, fitPredict, folds: groupedFolds });
  let timed = null, timeOverlap = null;
  if (temporal) {
    const tFolds = timeFolds(times, folds);
    timed = crossValidate({ X, y, fitPredict, folds: tFolds });
    timeOverlap = groupOverlap(tFolds, groups);
  }
  return {
    random, grouped, temporal: timed, gap: random.mean - grouped.mean, groupFolds,
    overlap: { random: groupOverlap(randomFolds, groups), grouped: groupOverlap(groupedFolds, groups), temporal: timeOverlap },
    baseline: majorityShare(y),
  };
}

export function splitVerdict(gap, tolerance = 0.02) {
  if (gap > tolerance) return 'random-higher';
  if (gap < -tolerance) return 'grouped-higher';
  return 'same';
}

export function gridShape(budget) {
  if (!Number.isInteger(budget) || budget < 1) throw new RangeError('budget must be a positive integer');
  if (budget < 4) return [budget, 1];
  let best = null;
  for (let b = 2; b * b <= budget; b++) {
    const a = Math.floor(budget / b);
    if (!best || a * b > best[0] * best[1] || (a * b === best[0] * best[1] && a - b < best[0] - best[1])) best = [a, b];
  }
  return best;
}

export function spread(min, max, count, { log = false, integer = false } = {}) {
  const at = i => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const v = log ? Math.exp(Math.log(min) + t * (Math.log(max) - Math.log(min))) : min + t * (max - min);
    return integer ? Math.round(v) : v;
  };
  const out = Array.from({ length: count }, (_, i) => at(i));
  return integer ? [...new Set(out)] : out;
}

export function bestSoFar(scores) {
  let best = -Infinity;
  return scores.map(s => (best = Math.max(best, s)));
}

export function searchCompare({ evaluate, budget, seed = 1, kRange = { min: 1, max: 31 }, weightRange = { min: 0.25, max: 8 } }) {
  const [a, b] = gridShape(budget);
  const gridSpace = {
    k: spread(kRange.min, kRange.max, a, { integer: true }),
    weight: spread(weightRange.min, weightRange.max, b, { log: true }),
  };
  const grid = gridSearch(gridSpace, evaluate);
  const random = randomSearch({
    k: { min: kRange.min, max: kRange.max, integer: true },
    weight: { min: weightRange.min, max: weightRange.max, log: true },
  }, evaluate, budget, seed);
  for (const r of [grid, random]) r.curve = bestSoFar(r.results.map(x => x.score));
  grid.shape = [gridSpace.k.length, gridSpace.weight.length];
  return { grid, random };
}

const isNumber = v => typeof v === 'number' && Number.isFinite(v);

export function penguinTable(table, target = 'species') {
  const X = [], y = [], groups = [], times = [], index = [];
  const complete = r => FEATURES.every(f => isNumber(r[f]));
  let droppedFeatures = 0;
  table.rows.forEach((r, i) => {
    if (!complete(r)) { droppedFeatures++; return; }
    if (typeof r[target] !== 'string') return;
    X.push(FEATURES.map(f => r[f]));
    y.push(r[target]);
    groups.push(r.island);
    times.push(r.year);
    index.push(i);
  });
  const total = table.rows.length;
  return {
    X, y, groups, times, index, features: FEATURES, total,
    dropped: total - X.length, droppedFeatures, droppedFor: total - X.length - droppedFeatures,
    classes: [...new Set(y)].sort(),
  };
}

export function tablePeek(groups, perGroup = 3, groupCount = 3) {
  const order = [...new Set(groups)].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })).slice(0, groupCount);
  const out = [];
  for (const g of order) {
    let taken = 0;
    for (let i = 0; i < groups.length && taken < perGroup; i++) if (groups[i] === g) { out.push(i); taken++; }
  }
  return out;
}
