// Feature-engineering helpers for the "Feature engineering" module. Pure functions, seeded and
// reproducible, tested in featureeng.test.js. Cross-validation comes from sims/ml/validation.js
// (kFold, crossValidate); the linear model is fitLogistic from sims/ml/logistic.js.
//
// API
//   Making features. A "column" is one number (or string) per row. None of these change their input.
//     interaction(X, i, j)         column of X[r][i] * X[r][j] for every row of X (rows are arrays).
//                                  Two features that only matter together (XOR-like data) become one
//                                  feature a linear model can use.
//     appendColumns(X, ...columns) new rows with each column added on the right.
//     logTransform(values, { offset = 0 })
//                                  log(v + offset) per value (natural log). Squeezes a long right tail.
//                                  Throws RangeError when v + offset <= 0; pass offset: 1 for counts
//                                  that can be 0.
//     binning(values, edges)       bin index per value for strictly increasing `edges`:
//                                  v < edges[0] -> 0, edges[i-1] <= v < edges[i] -> i,
//                                  v >= edges[last] -> edges.length (so edges.length + 1 bins).
//     quantileEdges(values, bins)  bins - 1 edges that cut `values` into roughly equal-sized bins
//                                  (linear-interpolated quantiles, duplicates removed).
//     oneHot(values, vocab?)       { vocab, rows }: one 0/1 column per vocab entry, in vocab order.
//                                  vocab defaults to the sorted distinct values. A value not in vocab
//                                  becomes all zeros, so unseen categories at apply time never crash.
//
//   Encoding a category as a number. "train" arguments are the only data the encoder may learn from.
//     frequencyEncode(valuesTrain, valuesApply = valuesTrain)
//                                  share of training rows holding each value (count / n); a value not
//                                  seen in training gets 0. Uses no labels, so it cannot leak them.
//     targetEncode(valuesTrain, yTrain, valuesApply = valuesTrain, { smoothing = 0, prior })
//                                  (sum_y + smoothing * prior) / (count + smoothing) per category,
//                                  learned from the training rows. prior defaults to mean(yTrain).
//                                  smoothing = 0 is the plain category mean; a larger value pulls
//                                  rare categories toward the prior. A value not seen in training
//                                  gets the prior.
//                                  WARNING: encoding the SAME rows you learned from (the default for
//                                  valuesApply) puts each row's own label into its own feature. With a
//                                  high-cardinality category that is a leak.
//     targetEncodeOutOfFold(values, y, folds, { smoothing = 0, prior })
//                                  the leakage-safe version for the TRAINING rows: row r is encoded
//                                  using only the rows of the folds it is NOT in (fold.train for the
//                                  fold whose test holds r), so its own label never touches its own
//                                  feature. prior defaults to the mean of that fold's training y.
//                                  folds: from kFold(n, k, seed); every row must be in exactly one test.
//
//   makeEncodingData({ rows, categories, signal, seed })
//       Synthetic rows { category, x, y } with a high-cardinality category. Each category has a hidden
//       effect; P(y = 1) = sigmoid(2 * signal * effect), so signal 0 means the category carries NO
//       information and bigger signal means more. x is a weak honest numeric feature
//       (x = (y ? +0.4 : -0.4) + noise). With about two rows per category the naive in-sample
//       encoding memorises the labels: it looks great on the rows it was fitted on and is much worse
//       on new rows. Defaults: rows 400, categories 200, signal 0.3, seed 1. Category names are
//       "c001", "c002", ...
//   encodingXY(rows) -> { X, y, categories }: X = [[category, x], ...] (category is column 0).
//   evaluateEncoding({ X, y, mode, catColumn = 0, k = 5, seed = 1, smoothing = 0, innerK = 5 })
//       Cross-validates a logistic model on [encoded category, ...other columns] and returns
//       { mode, testScore, testSd, trainScore, gap, folds } (accuracy; gap = trainScore - testScore,
//       both means over the k folds). mode:
//         'naive'      train rows encoded from themselves (targetEncode defaults), test rows from train
//         'outOfFold'  train rows via targetEncodeOutOfFold (innerK folds), test rows from train
//         'none'       the category column is dropped (the honest reference)
//       The encoder only ever sees the training fold, so testScore is an honest held-out figure.
//
//   Judging features by cross-validation. `features` is an array of names; `evaluate(names)` returns
//   a { mean, sd } (as crossValidate does) or a plain number (sd taken as 0), higher is better, and
//   must accept an empty list (cvEvaluator does: it predicts the majority class).
//     cvEvaluator({ columns, y, fitPredict, k = 5, seed = 1, metric })
//         columns: { name: column }. Returns evaluate(names) that builds X from the named columns (in
//         the order given), runs crossValidate over the SAME kFold(n, k, seed) folds every time, and
//         returns { mean, sd, scores }. Same folds for every subset, so scores are directly comparable.
//     logisticFitPredict(opts?)  a fitPredict for crossValidate: fitLogistic(opts) then predict 0/1.
//     ablate(features, evaluate)
//         -> { full, drops: [{ feature, without, drop, beyondNoise }] }. `full` is the score with
//         every feature; for each feature `without` is the score with it removed and
//         drop = full.mean - without.mean (positive: removing it hurts, so it earns its place).
//         beyondNoise is true when drop > full.sd. In feature order.
//     forwardAdd(features, evaluate, { greedy = false })
//         -> { baseline, steps: [{ feature, features, mean, sd, gain, beyondNoise }] }. baseline is
//         evaluate([]). Features are added one at a time in the order given (greedy: true instead adds,
//         at each step, whichever remaining feature scores best). gain = mean - previous step's mean;
//         beyondNoise is true when gain > sd of the new step. A gain smaller than the fold-to-fold sd
//         is the kind of "improvement" that does not survive cross-validation.

import { rng, gauss } from './rng.js';
import { mean } from './stats.js';
import { kFold, crossValidate, accuracy } from './validation.js';
import { fitLogistic, predict as logisticPredict } from './logistic.js';

const isNum = v => typeof v === 'number' && Number.isFinite(v);

// ---- making features ---------------------------------------------------------------------------

export function interaction(X, i, j) {
  return X.map(row => row[i] * row[j]);
}

export function appendColumns(X, ...columns) {
  for (const c of columns) {
    if (c.length !== X.length) throw new RangeError('every column needs one value per row');
  }
  return X.map((row, r) => [...row, ...columns.map(c => c[r])]);
}

export function logTransform(values, { offset = 0 } = {}) {
  return values.map(v => {
    if (!(v + offset > 0)) throw new RangeError(`log needs a positive value, got ${v} + offset ${offset}`);
    return Math.log(v + offset);
  });
}

function checkEdges(edges) {
  if (!edges.length) throw new RangeError('binning needs at least one edge');
  for (let i = 0; i < edges.length; i++) {
    if (!isNum(edges[i])) throw new TypeError('edges must be finite numbers');
    if (i && edges[i] <= edges[i - 1]) throw new RangeError('edges must be strictly increasing');
  }
}

export function binning(values, edges) {
  checkEdges(edges);
  return values.map(v => {
    let b = 0;
    while (b < edges.length && v >= edges[b]) b++;
    return b;
  });
}

export function quantileEdges(values, bins) {
  if (!Number.isInteger(bins) || bins < 2) throw new RangeError('bins must be an integer of at least 2');
  const s = values.slice().sort((a, b) => a - b);
  if (!s.length) throw new RangeError('no values to cut');
  const edges = [];
  for (let b = 1; b < bins; b++) {
    const pos = (b / bins) * (s.length - 1);
    const lo = Math.floor(pos);
    const e = s[lo] + (pos - lo) * ((s[Math.min(lo + 1, s.length - 1)]) - s[lo]);
    if (!edges.length || e > edges[edges.length - 1]) edges.push(e);
  }
  return edges;
}

export function oneHot(values, vocab) {
  const names = vocab ? vocab.slice() : [...new Set(values)].sort();
  const at = new Map(names.map((v, i) => [v, i]));
  const rows = values.map(v => {
    const row = new Array(names.length).fill(0);
    if (at.has(v)) row[at.get(v)] = 1;
    return row;
  });
  return { vocab: names, rows };
}

// ---- encoding a category as a number -----------------------------------------------------------

export function frequencyEncode(valuesTrain, valuesApply = valuesTrain) {
  const counts = new Map();
  for (const v of valuesTrain) counts.set(v, (counts.get(v) || 0) + 1);
  const n = valuesTrain.length;
  return valuesApply.map(v => (counts.get(v) || 0) / n);
}

export function targetEncode(valuesTrain, yTrain, valuesApply = valuesTrain, { smoothing = 0, prior } = {}) {
  if (valuesTrain.length !== yTrain.length) throw new RangeError('valuesTrain and yTrain must have the same length');
  if (!(smoothing >= 0)) throw new RangeError('smoothing must be 0 or more');
  const p = prior === undefined ? mean(yTrain.map(Number)) : prior;
  const stats = new Map();
  valuesTrain.forEach((v, i) => {
    const s = stats.get(v) || { sum: 0, n: 0 };
    s.sum += Number(yTrain[i]);
    s.n += 1;
    stats.set(v, s);
  });
  return valuesApply.map(v => {
    const s = stats.get(v);
    if (!s) return p;
    return (s.sum + smoothing * p) / (s.n + smoothing);
  });
}

export function targetEncodeOutOfFold(values, y, folds, opts = {}) {
  if (values.length !== y.length) throw new RangeError('values and y must have the same length');
  const out = new Array(values.length).fill(NaN);
  const seen = new Array(values.length).fill(0);
  for (const { train, test } of folds) {
    const enc = targetEncode(train.map(i => values[i]), train.map(i => y[i]), test.map(i => values[i]), opts);
    test.forEach((row, t) => { out[row] = enc[t]; seen[row]++; });
  }
  if (seen.some(c => c !== 1)) throw new RangeError('folds must put every row in exactly one test set');
  return out;
}

// ---- data with a leaky high-cardinality category -----------------------------------------------

const sigmoid = z => 1 / (1 + Math.exp(-z));

export function makeEncodingData({ rows = 400, categories = 200, signal = 0.3, seed = 1 } = {}) {
  const random = rng(seed);
  const effect = Array.from({ length: categories }, () => gauss(random));
  const out = [];
  for (let r = 0; r < rows; r++) {
    const c = Math.floor(random() * categories);
    const y = random() < sigmoid(2 * signal * effect[c]) ? 1 : 0;
    out.push({ category: 'c' + String(c + 1).padStart(3, '0'), x: (y ? 0.4 : -0.4) + gauss(random), y });
  }
  return out;
}

export const encodingXY = rows => ({
  X: rows.map(r => [r.category, r.x]),
  y: rows.map(r => r.y),
  categories: rows.map(r => r.category),
});

export function logisticFitPredict(opts = {}) {
  return (trainX, trainY, testX) => logisticPredict(fitLogistic(trainX, trainY, opts), testX);
}

export function evaluateEncoding({ X, y, mode, catColumn = 0, k = 5, seed = 1, smoothing = 0, innerK = 5 }) {
  if (!['naive', 'outOfFold', 'none'].includes(mode)) throw new RangeError(`unknown mode "${mode}"`);
  const trainScores = [];
  const lr = logisticFitPredict();
  const fitPredict = (trainX, trainY, testX) => {
    const others = row => row.filter((_, c) => c !== catColumn);
    let tr = trainX.map(others);
    let te = testX.map(others);
    if (mode !== 'none') {
      const cats = trainX.map(r => r[catColumn]);
      const trainEnc = mode === 'naive'
        ? targetEncode(cats, trainY, cats, { smoothing })
        : targetEncodeOutOfFold(cats, trainY, kFold(cats.length, innerK, seed), { smoothing });
      const testEnc = targetEncode(cats, trainY, testX.map(r => r[catColumn]), { smoothing });
      tr = appendColumns(tr, trainEnc);
      te = appendColumns(te, testEnc);
    }
    trainScores.push(accuracy(trainY, lr(tr, trainY, tr)));
    return lr(tr, trainY, te);
  };
  const cv = crossValidate({ X, y, fitPredict, folds: kFold(X.length, k, seed) });
  const trainScore = mean(trainScores);
  return { mode, testScore: cv.mean, testSd: cv.sd, trainScore, gap: trainScore - cv.mean, folds: cv.folds.length };
}

// ---- judging features by cross-validation ------------------------------------------------------

const asScore = r => (typeof r === 'number' ? { mean: r, sd: 0 } : { mean: r.mean, sd: r.sd ?? 0 });

export function cvEvaluator({ columns, y, fitPredict = logisticFitPredict(), k = 5, seed = 1, metric = accuracy }) {
  const n = y.length;
  for (const [name, col] of Object.entries(columns)) {
    if (col.length !== n) throw new RangeError(`column "${name}" has ${col.length} values for ${n} rows`);
  }
  const folds = kFold(n, k, seed);
  // No features: predict the majority training class (the baseline every feature must beat).
  const majority = (_trainX, trainY, testX) => {
    const counts = new Map();
    for (const l of trainY) counts.set(l, (counts.get(l) || 0) + 1);
    let best = trainY[0];
    for (const [l, c] of counts) if (c > counts.get(best)) best = l;
    return testX.map(() => best);
  };
  return names => {
    for (const nm of names) if (!(nm in columns)) throw new RangeError(`unknown feature "${nm}"`);
    const X = Array.from({ length: n }, (_, r) => names.map(nm => columns[nm][r]));
    const res = crossValidate({ X, y, fitPredict: names.length ? fitPredict : majority, folds, metric });
    return { mean: res.mean, sd: res.sd, scores: res.scores };
  };
}

export function ablate(features, evaluate) {
  const full = asScore(evaluate(features.slice()));
  const drops = features.map(feature => {
    const without = asScore(evaluate(features.filter(f => f !== feature)));
    const drop = full.mean - without.mean;
    return { feature, without, drop, beyondNoise: drop > full.sd };
  });
  return { full, drops };
}

export function forwardAdd(features, evaluate, { greedy = false } = {}) {
  const baseline = asScore(evaluate([]));
  const chosen = [];
  const remaining = features.slice();
  const steps = [];
  let prev = baseline.mean;
  while (remaining.length) {
    let pick = 0;
    let score = asScore(evaluate([...chosen, remaining[0]]));
    if (greedy) {
      for (let i = 1; i < remaining.length; i++) {
        const s = asScore(evaluate([...chosen, remaining[i]]));
        if (s.mean > score.mean) { pick = i; score = s; }
      }
    }
    const [feature] = remaining.splice(pick, 1);
    chosen.push(feature);
    const gain = score.mean - prev;
    steps.push({ feature, features: chosen.slice(), mean: score.mean, sd: score.sd, gain, beyondNoise: gain > score.sd });
    prev = score.mean;
  }
  return { baseline, steps };
}
