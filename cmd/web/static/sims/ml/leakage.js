// Data leakage, shown as two experiments. Pure and deterministic (every random draw is seeded);
// tested in leakage.test.js. The lab imports this file; it draws and wires, this file computes.
//
// Leakage means the test rows influenced something the model was built from. Two ways, one lesson:
// anything LEARNED from data (which features to keep, a median, a mean, a spread) must be learned
// from the training rows only, then applied unchanged to the test rows.
//
// STABLE API (change it only by adding):
//
// 1. The feature-selection leak (large effect)
//   makeNoiseTable({ n = 60, p = 500, signal = 0, informative = 3, seed = 1 })
//       -> { X, y, informative }
//       X: n rows of p numeric features, each (approximately) standard normal noise. y: n labels 0/1,
//       exactly balanced and unrelated to the noise columns. With signal > 0, `informative` randomly
//       placed columns get a genuine class difference of `signal` standard deviations (class 1 shifted
//       up by signal/2, class 0 down by signal/2). `informative` lists those column indices, sorted.
//   featureCorrelations(X, y)       -> Pearson correlation of every column with the label (a constant
//                                      column gives 0)
//   selectTopK(X, y, k)             -> indices of the k columns with the largest absolute correlation,
//                                      strongest first (ties: lower index first)
//   runPipelines({ X, y, k = 10, seed = 1, model = 'logistic', trainFraction = 0.5, knnK = 5 })
//       -> { split: { train, test }, leaky, correct }, where leaky and correct are
//          { selected, accuracy, trainAccuracy }
//       One stratified split of the rows. LEAKY: select the top k columns using ALL rows (so the test
//       labels vote), then split, fit, score on the test rows. CORRECT: split first, select using the
//       TRAINING rows only, fit, score on the test rows. `model` is 'logistic' (sims/ml/logistic.js,
//       standardizing inside from the training rows) or 'knn' (sims/ml/knn.js on columns standardized
//       with the training rows' mean and spread).
//   repeatSplits({ X, y, k, seed, model, trainFraction, knnK, times = 20 })
//       -> { leaky: [accuracy...], correct: [accuracy...], leakyMean, correctMean, times }
//       runPipelines over `times` different splits (seeds seed, seed+1, ...). Note that the table is
//       the same every time: only the split changes.
//
// 2. The preprocessing-statistics leak (small effect, honestly)
//   fitMedianImputer(values)        -> { median, apply(values) }  (a missing value is null, undefined or NaN;
//                                      a column with no present values has median 0)
//   fitPreprocessing(X, rowIndices) -> { medians, means, sds, transform(rows) }
//       Learns, per column and from the rows listed in rowIndices only: the median of the present values,
//       then (after filling gaps with that median) the mean and population standard deviation.
//       transform(rows) fills gaps with the stored medians and standardizes with the stored mean and sd
//       (a constant column maps to 0). X holds numbers and nulls.
//   tableToXY(table, features, label, positive)
//       -> { X, y, rows }  from a sims/ml/tabular.js parseCsv table: the numeric `features` (missing
//          kept as null) and y = 1 where the label column equals `positive`, else 0. Rows with a missing
//          label are dropped; `rows` are the kept row indices of the table.
//   runPreprocessing({ X, y, seed = 1, model = 'logistic', trainFraction = 0.7, knnK = 5 })
//       -> { split, leaky, correct, accuracyDifference }
//       leaky and correct are { medians, means, sds, accuracy }. LEAKY fits the imputer and the
//       standardizer on ALL rows, CORRECT on the training rows only; the same split and the same model
//       score both on the test rows. accuracyDifference = leaky.accuracy - correct.accuracy.
//   repeatPreprocessing({ X, y, seed, model, trainFraction, knnK, times = 20 })
//       -> { leaky, correct, leakyMean, correctMean, differences, times }
//
//   HONEST NOTE: for imputation and scaling the effect is usually SMALL. A median or a mean computed
//   from 344 rows instead of 240 moves very little, and a model trained on standardized columns barely
//   notices; on the bundled penguins table the two accuracies are typically within a point or two, and
//   which one is ahead changes from split to split. The statistics do differ (that is the leak), but the
//   score seldom shows it. The feature-selection leak is different: it uses the test LABELS, so it can
//   turn a coin flip into an apparent 70 to 80 percent. Teach the principle for both, but do not promise
//   a dramatic score gap for scaling.
import { rng, gauss, shuffle } from './rng.js';
import { splitIndices } from './tabular.js';
import { fitLogistic, predict } from './logistic.js';
import { classify } from './knn.js';
import { columnStats, standardize } from './scale.js';

const isMissing = v => v === null || v === undefined || !Number.isFinite(v);
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// ---------- 1. feature-selection leak ----------

export function makeNoiseTable({ n = 60, p = 500, signal = 0, informative = 3, seed = 1 } = {}) {
  const random = rng(seed);
  const y = shuffle(Array.from({ length: n }, (_, i) => (i < n / 2 ? 1 : 0)), random);
  const X = y.map(() => Array.from({ length: p }, () => gauss(random)));
  let cols = [];
  if (signal > 0 && informative > 0) {
    cols = shuffle(Array.from({ length: p }, (_, j) => j), random).slice(0, Math.min(informative, p)).sort((a, b) => a - b);
    X.forEach((row, i) => { for (const j of cols) row[j] += (y[i] ? 0.5 : -0.5) * signal; });
  }
  return { X, y, informative: cols };
}

export function featureCorrelations(X, y) {
  const n = X.length, p = n ? X[0].length : 0;
  const ym = mean(y);
  const yd = y.map(v => v - ym);
  const yss = yd.reduce((a, v) => a + v * v, 0);
  const out = [];
  for (let j = 0; j < p; j++) {
    const xm = mean(X.map(r => r[j]));
    let sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { const d = X[i][j] - xm; sxy += d * yd[i]; sxx += d * d; }
    out.push(sxx > 0 && yss > 0 ? sxy / Math.sqrt(sxx * yss) : 0);
  }
  return out;
}

export function selectTopK(X, y, k) {
  const r = featureCorrelations(X, y).map(c => Math.abs(c));
  return r.map((_, j) => j).sort((a, b) => r[b] - r[a] || a - b).slice(0, Math.max(0, Math.min(k, r.length)));
}

// Fits `model` on the training rows and returns the share of rows right in each of two row sets.
function fitScore(model, knnK, Xtr, ytr, evalSets) {
  if (model === 'knn') {
    const stats = columnStats(Xtr);
    const pts = standardize(Xtr, stats).map((features, i) => ({ features, label: ytr[i] }));
    return evalSets.map(([Xe, ye]) => {
      const Z = standardize(Xe, stats);
      return Z.length ? Z.filter((z, i) => String(classify(pts, z, knnK).label) === String(ye[i])).length / Z.length : 0;
    });
  }
  if (model !== 'logistic') throw new Error(`leakage: unknown model "${model}"`);
  const m = fitLogistic(Xtr, ytr);
  return evalSets.map(([Xe, ye]) => {
    const pred = predict(m, Xe);
    return pred.length ? pred.filter((v, i) => v === ye[i]).length / pred.length : 0;
  });
}

const pick = (X, idx) => idx.map(i => X[i]);
const columns = (X, cols) => X.map(r => cols.map(j => r[j]));

export function runPipelines({ X, y, k = 10, seed = 1, model = 'logistic', trainFraction = 0.5, knnK = 5 }) {
  const split = splitIndices(X.length, { train: trainFraction, validation: 0 }, seed, y);
  const { train, test } = split;
  const ytr = pick(y, train), yte = pick(y, test);
  const evaluate = cols => {
    const [accuracy, trainAccuracy] = fitScore(model, knnK, columns(pick(X, train), cols), ytr,
      [[columns(pick(X, test), cols), yte], [columns(pick(X, train), cols), ytr]]);
    return { selected: cols, accuracy, trainAccuracy };
  };
  return {
    split,
    leaky: evaluate(selectTopK(X, y, k)),                                  // all rows vote, test labels included
    correct: evaluate(selectTopK(pick(X, train), ytr, k)),                 // training rows only
  };
}

export function repeatSplits({ times = 20, seed = 1, ...rest }) {
  const leaky = [], correct = [];
  for (let t = 0; t < times; t++) {
    const r = runPipelines({ ...rest, seed: seed + t });
    leaky.push(r.leaky.accuracy);
    correct.push(r.correct.accuracy);
  }
  return { leaky, correct, leakyMean: mean(leaky), correctMean: mean(correct), times };
}

// ---------- 2. preprocessing-statistics leak ----------

export function fitMedianImputer(values) {
  const v = values.filter(x => !isMissing(x)).sort((a, b) => a - b);
  const h = v.length >> 1;
  const median = !v.length ? 0 : v.length % 2 ? v[h] : (v[h - 1] + v[h]) / 2;
  return { median, apply: xs => xs.map(x => (isMissing(x) ? median : x)) };
}

export function fitPreprocessing(X, rowIndices) {
  const d = X.length ? X[0].length : 0;
  const medians = [], means = [], sds = [];
  for (let j = 0; j < d; j++) {
    const imp = fitMedianImputer(rowIndices.map(i => X[i][j]));
    const filled = imp.apply(rowIndices.map(i => X[i][j]));
    const m = mean(filled);
    medians.push(imp.median);
    means.push(m);
    sds.push(filled.length ? Math.sqrt(mean(filled.map(v => (v - m) ** 2))) : 0);
  }
  const transform = rows => rows.map(r => r.map((v, j) => {
    const x = isMissing(v) ? medians[j] : v;
    return sds[j] ? (x - means[j]) / sds[j] : 0;
  }));
  return { medians, means, sds, transform };
}

export function tableToXY(table, features, label, positive) {
  const X = [], y = [], rows = [];
  table.rows.forEach((r, i) => {
    if (r[label] === null || r[label] === undefined) return;
    X.push(features.map(f => (isMissing(r[f]) ? null : r[f])));
    y.push(r[label] === positive ? 1 : 0);
    rows.push(i);
  });
  return { X, y, rows };
}

export function runPreprocessing({ X, y, seed = 1, model = 'logistic', trainFraction = 0.7, knnK = 5 }) {
  const split = splitIndices(X.length, { train: trainFraction, validation: 0 }, seed, y);
  const { train, test } = split;
  const ytr = pick(y, train), yte = pick(y, test);
  const all = X.map((_, i) => i);
  const evaluate = fitRows => {
    const pre = fitPreprocessing(X, fitRows);
    const Ztr = pre.transform(pick(X, train)), Zte = pre.transform(pick(X, test));
    // The rows are already standardized, so the model must not standardize a second time.
    const [accuracy] = model === 'logistic'
      ? (() => { const m = fitLogistic(Ztr, ytr, { standardize: false }); const p = predict(m, Zte); return [p.filter((v, i) => v === yte[i]).length / p.length]; })()
      : fitScore(model, knnK, Ztr, ytr, [[Zte, yte]]);
    return { medians: pre.medians, means: pre.means, sds: pre.sds, accuracy };
  };
  const leaky = evaluate(all), correct = evaluate(train);
  return { split, leaky, correct, accuracyDifference: leaky.accuracy - correct.accuracy };
}

export function repeatPreprocessing({ times = 20, seed = 1, ...rest }) {
  const leaky = [], correct = [], differences = [];
  for (let t = 0; t < times; t++) {
    const r = runPreprocessing({ ...rest, seed: seed + t });
    leaky.push(r.leaky.accuracy);
    correct.push(r.correct.accuracy);
    differences.push(r.accuracyDifference);
  }
  return { leaky, correct, leakyMean: mean(leaky), correctMean: mean(correct), differences, times };
}
