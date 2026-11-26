// Model-audit helpers for the "Interpretation and error analysis" module: errors by subgroup,
// permutation importance, exact Shapley values and a small dataset built to show where each of them
// misleads. Pure and deterministic (seeded), no DOM. Tested in audit.test.js.
//
// STABLE API (labs import this; change it only by adding):
//
//   subgroupMetrics(yTrue, yPred, groups) -> rows
//       yTrue, yPred: arrays of 0/1 (booleans allowed), groups: array of group names, all the same length.
//       One row per group, in order of first appearance:
//         { group, n, positives, predictedPositives, tp, fp, tn, fn,
//           accuracy, precision, recall, fpr, positiveRate, baseRate, undefined: {precision, recall, fpr} }
//       accuracy = (tp+tn)/n, precision = tp/(tp+fp), recall = tp/(tp+fn), fpr = fp/(fp+tn),
//       positiveRate = (tp+fp)/n (share PREDICTED positive), baseRate = (tp+fn)/n (share actually positive).
//       A 0/0 ratio is null (never NaN or a misleading 0) and flagged true in `undefined`.
//   GAP_METRICS = ['accuracy', 'precision', 'recall', 'fpr', 'positiveRate']
//   gaps(rows)                                  -> { accuracy: g, precision: g, recall: g, fpr: g, positiveRate: g }
//       g = { gap, max: {group, value}, min: {group, value} } with gap = max - min over the groups that have a
//       value; g is { gap: null, max: null, min: null } when fewer than two groups do. Ties pick the first group.
//
//   Models. A "batch model" for permutationImportance is an object with predict(X) -> 0/1 labels and
//   (optionally) predictProba(X) -> probabilities, or a plain function X -> array. A "row model" for shapley
//   is a function row -> number, or an object with scoreRow(row). fitAuditModel returns an object that
//   is both: { kind, predict, predictProba, scoreRow, logOddsRow }.
//   fitAuditModel(X, y, { kind = 'logistic', maxDepth = 3, lr, iters, l2 }) -> model
//       'logistic' wraps sims/ml/logistic.js (standardized inside); scoreRow is the probability of class 1.
//       'tree' wraps sims/ml/tree.js; scoreRow is the predicted label (a step function).
//
//   accuracyScore(yTrue, yPred)                 -> share correct (0 for no rows)
//   permutationImportance(model, X, y, metric = 'accuracy', { repeats = 10, seed = 1, features, output })
//       -> { metric, baseline, repeats, results: [{ feature, columns, mean, sd, drops }] }
//       metric: 'accuracy' (labels), 'neglogloss' (probabilities; higher is better) or a function
//       (yTrue, yPred) -> score where HIGHER IS BETTER. output: 'predict' | 'proba'; the default follows the
//       metric ('proba' for neglogloss, otherwise 'predict'; a function metric uses 'predict').
//       features: list of entries, each a column index or an array of column indexes permuted TOGETHER
//       (one shared row shuffle). Default: every column on its own. Each repeat shuffles the column(s) of
//       a copy of X (never X itself) and records drop = baseline - permuted score. mean and sd (population,
//       divide by repeats) are over the drops. A feature the model ignores has a mean near 0.
//
//   shapley(model, x, background, features?)
//       -> { features, values, baselinePoint, baselineValue, fx, sum, gap, efficient }
//       Exact Shapley values by enumerating every subset of `features` (default all columns, at most 8).
//       baselinePoint is the column mean of the background rows. The value of a subset S is
//       model(x with the columns in S from x and every other column from the baselinePoint).
//       values[i] belongs to features[i]. Efficiency: sum(values) = f(x) - f(baselinePoint);
//       gap = sum - (fx - baselineValue) (about 0) and efficient is true when |gap| < 1e-9 scaled.
//       Columns outside `features` stay at the baselinePoint.
//
//   makeAuditData({ n = 600, seed = 1, correlation = 0.95, groupBalance = 0.3 })   (0 < correlation <= 1)
//       -> { X, y, group, featureNames, groups, correlation, groupBalance }
//       Two groups, 'A' (majority) and 'B' (share groupBalance), with different base rates of y = 1
//       (roughly 0.6 in A and 0.3 in B). The group is NOT a feature. Features, in order:
//         0 signal_a, 1 signal_b   two noisy copies of the one signal that drives y, so a model can lean on
//                                  either; corr(signal_a, signal_b) = correlation (1 = exact duplicates)
//         2 independent            a weaker, independent signal
//         3 noise                  carries no information
//       The two groups also differ a little in signal_a/signal_b, so a model fitted on everybody makes
//       errors of different kinds in each group.
import { rng, gauss } from './rng.js';
import { fitLogistic, predictProba as logisticProba, sigmoid } from './logistic.js';
import { fitTree, predict as treePredict } from './tree.js';

const to01 = v => { const n = Number(v); if (n !== 0 && n !== 1) throw new Error('audit: labels and predictions must be 0 or 1'); return n; };
const ratio = (a, b) => (b === 0 ? null : a / b);

export const GAP_METRICS = ['accuracy', 'precision', 'recall', 'fpr', 'positiveRate'];

export function subgroupMetrics(yTrue, yPred, groups) {
  if (!Array.isArray(yTrue) || yTrue.length !== yPred.length || yTrue.length !== groups.length) {
    throw new Error('audit: yTrue, yPred and groups must be arrays of the same length');
  }
  const order = [];
  const acc = new Map();
  for (let i = 0; i < yTrue.length; i++) {
    const g = groups[i];
    if (!acc.has(g)) { acc.set(g, { tp: 0, fp: 0, tn: 0, fn: 0 }); order.push(g); }
    const c = acc.get(g), t = to01(yTrue[i]), p = to01(yPred[i]);
    if (t && p) c.tp++; else if (!t && p) c.fp++; else if (!t && !p) c.tn++; else c.fn++;
  }
  return order.map(group => {
    const { tp, fp, tn, fn } = acc.get(group);
    const n = tp + fp + tn + fn;
    const precision = ratio(tp, tp + fp), recall = ratio(tp, tp + fn), fpr = ratio(fp, fp + tn);
    return {
      group, n, positives: tp + fn, predictedPositives: tp + fp, tp, fp, tn, fn,
      accuracy: (tp + tn) / n, precision, recall, fpr,
      positiveRate: (tp + fp) / n, baseRate: (tp + fn) / n,
      undefined: { precision: precision === null, recall: recall === null, fpr: fpr === null },
    };
  });
}

export function gaps(rows) {
  const out = {};
  for (const m of GAP_METRICS) {
    let max = null, min = null;
    for (const r of rows) {
      const value = r[m];
      if (value === null || value === undefined) continue;
      if (max === null || value > max.value) max = { group: r.group, value };
      if (min === null || value < min.value) min = { group: r.group, value };
    }
    const both = max !== null && min !== null && rows.filter(r => r[m] !== null && r[m] !== undefined).length >= 2;
    out[m] = both ? { gap: max.value - min.value, max, min } : { gap: null, max: null, min: null };
  }
  return out;
}

export function accuracyScore(yTrue, yPred) {
  if (!yTrue.length) return 0;
  let ok = 0;
  for (let i = 0; i < yTrue.length; i++) if (Number(yTrue[i]) === Number(yPred[i])) ok++;
  return ok / yTrue.length;
}

function negLogLoss(yTrue, proba, eps = 1e-15) {
  if (!yTrue.length) return 0;
  let s = 0;
  for (let i = 0; i < yTrue.length; i++) {
    const p = Math.min(1 - eps, Math.max(eps, proba[i]));
    s += Number(yTrue[i]) ? Math.log(p) : Math.log(1 - p);
  }
  return s / yTrue.length;
}

export function fitAuditModel(X, y, opts = {}) {
  const { kind = 'logistic', maxDepth = 3, lr, iters, l2 } = opts;
  if (kind === 'logistic') {
    const lo = {};
    if (lr !== undefined) lo.lr = lr;
    if (iters !== undefined) lo.iters = iters;
    if (l2 !== undefined) lo.l2 = l2;
    const fit = fitLogistic(X, y, lo);
    const predictProba = rows => logisticProba(fit, rows);
    return {
      kind, fit,
      predictProba,
      predict: rows => predictProba(rows).map(p => (p >= 0.5 ? 1 : 0)),
      scoreRow: row => predictProba([row])[0],
      logOddsRow: row => { const p = predictProba([row])[0]; return Math.log(p / (1 - p)); },
    };
  }
  if (kind === 'tree') {
    const tree = fitTree(X, y.map(Number), { maxDepth });
    const predict = rows => rows.map(r => Number(treePredict(tree, r)));
    return { kind, tree, predict, predictProba: predict, scoreRow: row => Number(treePredict(tree, row)) };
  }
  throw new RangeError(`audit: unknown model kind "${kind}" (use "logistic" or "tree")`);
}

const pickBatch = (model, output) => {
  if (typeof model === 'function') return model;
  const name = output === 'proba' ? 'predictProba' : 'predict';
  if (!model || typeof model[name] !== 'function') throw new Error(`audit: the model needs a ${name}(X) method`);
  return rows => model[name](rows);
};

const sdPop = xs => {
  const m = xs.reduce((s, v) => s + v, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length);
};

export function permutationImportance(model, X, y, metric = 'accuracy', opts = {}) {
  const { repeats = 10, seed = 1, features, output } = opts;
  if (!X.length || X.length !== y.length) throw new Error('audit: X and y must be non-empty and the same length');
  if (!(repeats >= 1)) throw new RangeError('audit: repeats must be at least 1');
  let score, out = output;
  if (metric === 'accuracy') { score = accuracyScore; out = out ?? 'predict'; }
  else if (metric === 'neglogloss') { score = negLogLoss; out = out ?? 'proba'; }
  else if (typeof metric === 'function') { score = metric; out = out ?? 'predict'; }
  else throw new RangeError(`audit: unknown metric "${metric}"`);
  const run = pickBatch(model, out);
  const baseline = score(y, run(X));
  const d = X[0].length;
  const entries = (features ?? Array.from({ length: d }, (_, j) => j)).map(f => (Array.isArray(f) ? f : [f]));
  const random = rng(seed);
  const results = entries.map(columns => {
    const drops = [];
    for (let r = 0; r < repeats; r++) {
      // One shared Fisher-Yates shuffle moves the whole group of columns together.
      const idx = X.map((_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      const Xp = X.map((row, i) => {
        const copy = row.slice();
        for (const c of columns) copy[c] = X[idx[i]][c];
        return copy;
      });
      drops.push(baseline - score(y, run(Xp)));
    }
    const mean = drops.reduce((s, v) => s + v, 0) / drops.length;
    return { feature: columns.length === 1 ? columns[0] : columns, columns, mean, sd: sdPop(drops), drops };
  });
  return { metric: typeof metric === 'function' ? 'custom' : metric, baseline, repeats, results };
}

export function shapley(model, x, background, features) {
  const f = typeof model === 'function' ? model : model && typeof model.scoreRow === 'function' ? r => model.scoreRow(r) : null;
  if (!f) throw new Error('audit: the model must be a function row -> number or have scoreRow(row)');
  if (!Array.isArray(background) || !background.length) throw new Error('audit: background needs at least one row');
  const d = x.length;
  const cols = features ?? Array.from({ length: d }, (_, j) => j);
  const m = cols.length;
  if (m < 1 || m > 8) throw new RangeError('audit: shapley enumerates subsets and supports 1 to 8 features');
  const baselinePoint = Array.from({ length: d }, (_, j) => background.reduce((s, r) => s + r[j], 0) / background.length);
  // v[mask] = model value when the features whose bit is set come from x and the rest from the baseline.
  const v = new Array(1 << m);
  for (let mask = 0; mask < v.length; mask++) {
    const row = baselinePoint.slice();
    for (let k = 0; k < m; k++) if (mask & (1 << k)) row[cols[k]] = x[cols[k]];
    v[mask] = Number(f(row));
  }
  const fact = [1];
  for (let i = 1; i <= m; i++) fact[i] = fact[i - 1] * i;
  const popcount = mask => { let c = 0; for (; mask; mask &= mask - 1) c++; return c; };
  const values = cols.map((_, i) => {
    let phi = 0;
    for (let mask = 0; mask < v.length; mask++) {
      if (mask & (1 << i)) continue;
      const s = popcount(mask);
      phi += (fact[s] * fact[m - s - 1] / fact[m]) * (v[mask | (1 << i)] - v[mask]);
    }
    return phi;
  });
  const baselineValue = v[0], fx = v[v.length - 1];
  const sum = values.reduce((s, a) => s + a, 0);
  const gap = sum - (fx - baselineValue);
  return { features: cols.slice(), values, baselinePoint, baselineValue, fx, sum, gap, efficient: Math.abs(gap) < 1e-9 * Math.max(1, Math.abs(fx), Math.abs(baselineValue)) };
}

export function makeAuditData({ n = 600, seed = 1, correlation = 0.95, groupBalance = 0.3 } = {}) {
  if (!(correlation > 0 && correlation <= 1)) throw new RangeError('audit: correlation must be above 0 and at most 1');
  if (!(groupBalance > 0 && groupBalance < 1)) throw new RangeError('audit: groupBalance must be between 0 and 1');
  const random = rng(seed);
  // x = z + s * noise has variance 1 + s^2 and covariance 1 with the other copy, so corr = 1 / (1 + s^2).
  const s = Math.sqrt((1 - correlation) / correlation);
  const X = [], y = [], group = [];
  for (let i = 0; i < n; i++) {
    const inB = random() < groupBalance;
    const z = (inB ? -0.4 : 0.25) + gauss(random);   // the shared signal; group B sits a little lower
    const w = gauss(random);                         // the weaker independent signal
    const xa = z + s * gauss(random);
    const xb = z + s * gauss(random);
    const noise = gauss(random);
    const logit = 1.8 * z + 0.8 * w + (inB ? -0.5 : 0.2);
    X.push([xa, xb, w, noise]);
    y.push(random() < sigmoid(logit) ? 1 : 0);
    group.push(inB ? 'B' : 'A');
  }
  return { X, y, group, featureNames: ['signal_a', 'signal_b', 'independent', 'noise'], groups: ['A', 'B'], correlation, groupBalance };
}
