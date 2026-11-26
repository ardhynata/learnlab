// Pure helpers behind the audit lab (sims/labs/audit-lab.js): the data it audits, the thresholds it
// moves, and the numbers its three panels show. No DOM, seeded, tested in auditlab.test.js.
// It builds on sims/ml/audit.js (subgroup metrics, permutation importance, Shapley values).
//
//   pearson(a, b)                                  -> correlation of two equal-length arrays (0 when one is constant)
//   correlatedCopy(values, rho, noise)             -> a second column whose sample correlation with `values` is
//       exactly rho (0..1). `noise` is any array of numbers of the same length (draws from a normal); the part of
//       it that is not already explained by `values` is rescaled and mixed in. Same mean and spread as `values`.
//       The same `noise` for every rho makes the copy move smoothly as rho changes.
//   makeLabData({ n, seed, correlation, groupBalance })
//       -> { X, y, group, features, groups, correlation }   generated rows: two groups (A majority, B minority)
//       with different base rates (about 0.6 and 0.35). Features, in order: signal, signalCopy (correlation `correlation`
//       with signal), independent, noise. The outcome depends on signal and independent only, never on the copy,
//       so the copy is a pure stand-in whose importance should be zero until it gets close to a duplicate.
//   prepareRealData(table, { group, correlation, seed })
//       -> { X, y, group, features, groups, total, dropped, threshold, correlation }   penguins: task "heavier than the
//       median body mass". Rows with a missing (NA) measurement or sex are dropped and counted. Features: flipper,
//       flipperCopy (made up, correlation `correlation` with flipper), billLength, billDepth. group is 'sex' or 'species'.
//   splitData(data, seed, share) -> { train, test }   stratified by group and outcome; the test rows are shuffled
//   buildAudit(data, seed)       -> { train, test, model, scores, importance, shap(i) }
//       Fits the audit model on the training half and scores the held-out half. `importance` is permutationImportance
//       over [each feature, the first two features together]; shap(i) is the Shapley explanation of test row i.
//   splitVerdict(ref, now, tol)  -> { key: 'split'|'same'|'up'|'down', dFirst, dCopy }   how the first feature's and the
//       copy's importance moved between two experiments.
//
//   Thresholds (a threshold is a number, or an object { group: number }; a score at or above it predicts 1)
//   predictAt(scores, groups, thresholds)            -> 0/1 per row
//   thresholdForPositiveRate(scores, rate)           -> threshold that predicts positive for about `rate` of the rows
//   thresholdForRecall(scores, y, recall)            -> threshold that catches about `recall` of the actual positives
//   matchGroups(kind, scores, y, groups, order, t0)  -> { group: threshold } moving every group after order[0] to match
//       the first group's positive rate ('rate') or recall ('recall') at the threshold t0
//   auditSummary(y, scores, groups, order, thresholds) -> { rows, gaps, accuracy }   rows follow `order`
//   scoreHistogram(scores, groups, order, bins)      -> { bins, shares: { group: [share per bin] } }
//   waterfallSteps(shap)                             -> steps sorted by |value|: [{ index, value, start, end }]
import { rng, gauss, shuffle } from './rng.js';
import { sigmoid } from './logistic.js';
import { splitIndices } from './tabular.js';
import { fitAuditModel, subgroupMetrics, gaps, permutationImportance, shapley, accuracyScore } from './audit.js';

export const GROUP_ORDER = { generated: ['A', 'B'], sex: ['female', 'male'], species: ['Adelie', 'Chinstrap', 'Gentoo'] };
export const REGULARIZATION = 0.05;
export const IMPORTANCE_REPEATS = 20;

const mean = xs => xs.reduce((s, v) => s + v, 0) / (xs.length || 1);
const sdPop = xs => { const m = mean(xs); return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length || 1)); };

export function pearson(a, b) {
  const ma = mean(a), mb = mean(b);
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa === 0 || sbb === 0 ? 0 : sab / Math.sqrt(saa * sbb);
}

export function correlatedCopy(values, rho, noise) {
  if (!(rho >= 0 && rho <= 1)) throw new RangeError('auditlab: rho must be between 0 and 1');
  if (values.length !== noise.length) throw new Error('auditlab: values and noise must have the same length');
  const m = mean(values), s = sdPop(values);
  if (s === 0) return values.slice();
  const z = values.map(v => (v - m) / s);
  // Remove from the noise whatever it shares with z, then give it unit spread: it is now exactly uncorrelated with z.
  const mn = mean(noise);
  const along = noise.reduce((acc, v, i) => acc + (v - mn) * z[i], 0) / z.length;
  const e = noise.map((v, i) => v - mn - along * z[i]);
  const se = sdPop(e);
  const k = Math.sqrt(1 - rho * rho);
  return z.map((zi, i) => m + s * (rho * zi + (se === 0 ? 0 : k * e[i] / se)));
}

export function makeLabData({ n = 1200, seed = 1, correlation = 0.2, groupBalance = 0.3 } = {}) {
  const random = rng(seed);
  const z = [], w = [], noise = [], e = [], y = [], group = [];
  for (let i = 0; i < n; i++) {
    // Every row draws the same number of random values whatever the correlation is, so moving the
    // correlation slider changes the copy only and never the rows, the outcome or the split.
    const inB = random() < groupBalance;
    const zi = (inB ? -0.4 : 0.25) + gauss(random);
    const wi = gauss(random), ni = gauss(random), ei = gauss(random), u = random();
    z.push(zi); w.push(wi); noise.push(ni); e.push(ei);
    y.push(u < sigmoid(1.8 * zi + 0.8 * wi + (inB ? -0.5 : 0.2)) ? 1 : 0);
    group.push(inB ? 'B' : 'A');
  }
  const copy = correlatedCopy(z, correlation, e);
  return { X: z.map((_, i) => [z[i], copy[i], w[i], noise[i]]), y, group, features: ['signal', 'signalCopy', 'independent', 'noise'], groups: GROUP_ORDER.generated.slice(), correlation };
}

const isNum = v => typeof v === 'number' && Number.isFinite(v);

export function prepareRealData(table, { group = 'sex', correlation = 0.2, seed = 1 } = {}) {
  if (!GROUP_ORDER[group] || group === 'generated') throw new RangeError('auditlab: group must be "sex" or "species"');
  const keep = table.rows.filter(r => isNum(r.flipper_length_mm) && isNum(r.bill_length_mm) && isNum(r.bill_depth_mm) && isNum(r.body_mass_g) && typeof r.sex === 'string' && typeof r.species === 'string');
  const sorted = keep.map(r => r.body_mass_g).sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const threshold = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const random = rng(seed * 131 + 7);
  const noise = keep.map(() => gauss(random));
  const flipper = keep.map(r => r.flipper_length_mm);
  const copy = correlatedCopy(flipper, correlation, noise);
  return {
    X: keep.map((r, i) => [flipper[i], copy[i], r.bill_length_mm, r.bill_depth_mm]),
    y: keep.map(r => (r.body_mass_g > threshold ? 1 : 0)),
    group: keep.map(r => r[group]),
    features: ['flipper', 'flipperCopy', 'billLength', 'billDepth'],
    groups: GROUP_ORDER[group].filter(g => keep.some(r => r[group] === g)),
    total: table.rows.length, dropped: table.rows.length - keep.length, threshold, correlation,
  };
}

export function splitData(data, seed = 1, share = 0.5) {
  const n = data.y.length;
  const labels = data.group.map((g, i) => `${g}|${data.y[i]}`);
  const parts = splitIndices(n, { train: share, validation: 0 }, seed, labels);
  const pick = idx => ({ X: idx.map(i => data.X[i]), y: idx.map(i => data.y[i]), group: idx.map(i => data.group[i]), index: idx });
  return { train: pick(shuffle(parts.train, rng(seed + 1))), test: pick(shuffle(parts.test, rng(seed + 2))) };
}

export function buildAudit(data, seed = 1, share = 0.5) {
  const { train, test } = splitData(data, seed, share);
  const model = fitAuditModel(train.X, train.y, { l2: REGULARIZATION });
  const scores = model.predictProba(test.X);
  const d = data.features.length;
  const importance = permutationImportance(model, test.X, test.y, 'accuracy', {
    repeats: IMPORTANCE_REPEATS, seed: seed + 100, features: [...Array.from({ length: d }, (_, j) => j), [0, 1]],
  });
  return { train, test, model, scores, importance, shap: i => shapley(model, test.X[i], train.X) };
}

// Did the first feature's importance fall while the copy's held or grew (the split), did both move the same way,
// or did nothing move? `ref` and `now` are the `importance` objects of two experiments.
export function splitVerdict(ref, now, tol = 0.02) {
  const dFirst = now.results[0].mean - ref.results[0].mean;
  const dCopy = now.results[1].mean - ref.results[1].mean;
  let key = 'same';
  if (dFirst < -tol && dCopy >= -tol) key = 'split';
  else if (dFirst > tol && dCopy > tol) key = 'up';
  else if (dFirst < -tol && dCopy < -tol) key = 'down';
  return { key, dFirst, dCopy };
}

// ---- thresholds ------------------------------------------------------------------------------------------

export function predictAt(scores, groups, thresholds) {
  return scores.map((s, i) => {
    const t = typeof thresholds === 'number' ? thresholds : thresholds[groups[i]] ?? 0.5;
    return s >= t ? 1 : 0;
  });
}

export function thresholdForPositiveRate(scores, rate) {
  const n = scores.length;
  if (!n) return 0.5;
  const sorted = scores.slice().sort((a, b) => b - a);
  const k = Math.max(0, Math.min(n, Math.round(rate * n)));
  if (k === 0) return Math.min(1, sorted[0] + 1e-6);
  if (k === n) return Math.max(0, sorted[n - 1] - 1e-6);
  return (sorted[k - 1] + sorted[k]) / 2;
}

export function thresholdForRecall(scores, y, recall) {
  const pos = scores.filter((_, i) => Number(y[i]) === 1);
  return pos.length ? thresholdForPositiveRate(pos, recall) : 0.5;
}

export function matchGroups(kind, scores, y, groups, order, t0) {
  const out = {};
  for (const g of order) out[g] = t0;
  const idx = g => groups.map((x, i) => (x === g ? i : -1)).filter(i => i >= 0);
  const ref = idx(order[0]);
  const refScores = ref.map(i => scores[i]), refY = ref.map(i => y[i]);
  const refPred = refScores.map(s => (s >= t0 ? 1 : 0));
  const refPos = refY.reduce((s, v) => s + Number(v), 0);
  const refRecall = refPos ? refY.reduce((s, v, i) => s + (Number(v) === 1 && refPred[i] === 1 ? 1 : 0), 0) / refPos : null;
  const refRate = refPred.reduce((s, v) => s + v, 0) / (refPred.length || 1);
  for (const g of order.slice(1)) {
    const rows = idx(g);
    if (!rows.length) continue;
    const gs = rows.map(i => scores[i]), gy = rows.map(i => y[i]);
    if (kind === 'rate') out[g] = thresholdForPositiveRate(gs, refRate);
    else if (kind === 'recall') out[g] = refRecall === null ? t0 : thresholdForRecall(gs, gy, refRecall);
    else throw new RangeError('auditlab: kind must be "rate" or "recall"');
  }
  return out;
}

export function auditSummary(y, scores, groups, order, thresholds) {
  const pred = predictAt(scores, groups, thresholds);
  const all = subgroupMetrics(y, pred, groups);
  const rows = order.map(g => all.find(r => r.group === g)).filter(Boolean);
  return { rows, gaps: gaps(rows), accuracy: accuracyScore(y, pred), pred };
}

export function scoreHistogram(scores, groups, order, bins = 20) {
  const shares = {};
  for (const g of order) shares[g] = new Array(bins).fill(0);
  const sizes = {};
  scores.forEach((s, i) => {
    const g = groups[i];
    if (!shares[g]) return;
    const b = Math.max(0, Math.min(bins - 1, Math.floor(s * bins)));
    shares[g][b]++;
    sizes[g] = (sizes[g] ?? 0) + 1;
  });
  for (const g of order) shares[g] = shares[g].map(c => c / (sizes[g] || 1));
  return { bins, shares };
}

export function waterfallSteps(shap) {
  const order = shap.values.map((v, i) => i).sort((a, b) => Math.abs(shap.values[b]) - Math.abs(shap.values[a]) || a - b);
  let at = shap.baselineValue;
  return order.map(i => {
    const start = at;
    at += shap.values[i];
    return { index: i, feature: shap.features[i], value: shap.values[i], start, end: at };
  });
}
