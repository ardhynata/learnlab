// The computing behind the Level 2 capstone workbench (sims/labs/capstone-l2.js), on top of the helpers of
// sims/ml/capstone2.js. Pure functions, no DOM, no clock, every random choice seeded. Tested in capstone2lab.test.js.
//
// API
//   Constants   DATA_SEEDS (the 24 datasets on offer), SPLIT_KEYS ['random','grouped','temporal'], MODEL_KEYS ['baseline','logistic','forest'],
//               TUNABLE ['logistic','forest'], GRIDS { logistic: { setting: 'l2', values }, forest: { setting: 'maxDepth',
//               values } } (the small search: five values each), SPLIT_SEED (the split used from step 3 on),
//               COMPARE_SEEDS (the repeated splits of the step-2 comparison), TEST_FRACTION, INNER_FOLDS, FOREST_TREES.
//   datasetFacts(rows)   { rows, customers, days, frauds, rate, accuracyNever, ... } the class balance in numbers;
//                        accuracyNever = accuracy of a model that never flags anything.
//   compareSplits(rows, { seeds })
//       The OPTIMISM of each split: one reference model (a forest with fixed settings, because the plain baseline
//       scores AUC 0.5 on every split and cannot show leakage) is fitted on the train rows and scored on the test
//       rows of each split. Random and grouped are repeated for every seed (the temporal split has only one).
//       -> { random, grouped, temporal } each { auc (mean), lo, hi (lowest and highest run), runs, sharedShare }
//          sharedShare = the share of test rows whose customer also appears in the train rows (0 for grouped), and
//          for temporal also { lastTrainDay, firstTestDay }.
//   optimismGap(cmp, chosen, other)   cmp[chosen].auc - cmp[other].auc (positive: the chosen split looks better).
//   tuneModel(rows, { how, model, train, seed })
//       The small search of step 3, on the TRAIN rows only. For every value of the model's grid it scores the model by
//       3-fold validation inside the train rows, with folds of the same kind as the chosen split (random folds,
//       folds that keep a customer together, or time blocks), by AUC. -> { setting, values, results: [{ value,
//       mean, sd, scores }], best, spread } where best is the value with the highest mean, and among the values
//       within TIE of it the first of the grid (logistic: the weakest penalty, forest: the shallowest tree); spread =
//       highest minus lowest mean, to say when the setting hardly matters.
//   fitHeldOut(rows, { how, picks, seed })
//       Splits, fits baseline, logistic (picks.logistic = l2) and forest (picks.forest = maxDepth) on the train rows
//       and scores the test rows. -> { train, test, labels, probas: { baseline, logistic, forest } }.
//   scoreModels(labels, probas, { fpCost, fnCost, B, seed })
//       -> { [model]: { evaluation, auc, ap, cost } } each interval { estimate, lo, hi, used } from bootstrapInterval.
//       The same resamples are used for every model, so the models are compared on the same resampled rows.
//   differenceInterval(metricFn, labels, probasA, probasB, { B, seed, alpha })
//       the bootstrap interval of metric(A) - metric(B) on the same resamples -> { estimate, lo, hi, used }.
//   atThreshold(probas, labels, threshold, { fpCost, fnCost })
//       -> { threshold, confusion, flagged, precision, recall, totalCost, expectedCost, n }.
//   costCurve(probas, labels, { fpCost, fnCost, xMax, step = 0.005 }) -> [{ t, cost }] from step to xMax.
//   thresholdMax(probas, costThr)     the right end of the threshold axis: the highest score, with room for the cost threshold.
import {
  transactionXY, split as splitRows, fit, auc, confusionAt, evaluate, bootstrapInterval, metricFns,
} from './capstone2.js';
import { kFold, groupKFold, timeSplit } from './validation.js';
import { percentileCI } from './uncertainty.js';
import { rng } from './rng.js';

export const SPLIT_KEYS = ['random', 'grouped', 'temporal'];
export const MODEL_KEYS = ['baseline', 'logistic', 'forest'];
export const TUNABLE = ['logistic', 'forest'];
export const GRIDS = {
  logistic: { setting: 'l2', values: [0, 0.01, 0.1, 1, 10] },
  forest: { setting: 'maxDepth', values: [2, 3, 5, 8, 12] },
};
/**
 * Scores within this much AUC of the best count as tied, and the FIRST tied value of the grid wins: the weakest
 * penalty, the shallowest tree. For the penalty this matters: a strong penalty hardly changes the ranking (AUC) but
 * shrinks every probability toward the average, which spoils a cost threshold set on the probabilities.
 */
export const TIE = 0.005;
/**
 * The generator seeds the workbench offers as "dataset 1 .. 24". Chosen so that the held-out rows of every split
 * (random, grouped, temporal, split seed 1) hold at least 8 frauds and the whole data at least 50: with a rarer
 * draw (seed 2 has 7 frauds in its grouped test rows, seed 37 has 2) the intervals say nothing.
 */
export const DATA_SEEDS = [1, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19, 20, 21, 22, 23, 24, 25, 26, 28, 29];
export const SPLIT_SEED = 1;
export const COMPARE_SEEDS = [1, 2, 3, 4, 5];
export const TEST_FRACTION = 0.25;
export const INNER_FOLDS = 3;
export const FOREST_TREES = 40;
/** Fixed fitting options of the logistic model (a small step size, so even the strongest penalty of the grid stays stable). */
export const LOGISTIC_FIT = { lr: 0.05, iters: 600 };
/** The reference model of the optimism comparison: a flexible model, so it can use what leaks. */
export const REFERENCE = { model: 'forest', opts: { trees: FOREST_TREES, maxDepth: 8, minLeaf: 2 } };

const FIXED = { logistic: LOGISTIC_FIT, forest: { trees: FOREST_TREES } };
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const sd = xs => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1));
};
const at = (a, idx) => idx.map(i => a[i]);

export function datasetFacts(rows) {
  const frauds = rows.filter(r => r.label === 1).length;
  const n = rows.length;
  return {
    rows: n,
    customers: new Set(rows.map(r => r.customer)).size,
    days: rows.length ? Math.max(...rows.map(r => r.day)) + 1 : 0,
    frauds,
    legit: n - frauds,
    rate: n ? frauds / n : 0,
    accuracyNever: n ? (n - frauds) / n : 0,
  };
}

// ---------------------------------------------------------------- the split comparison

function overlap(rows, train, test) {
  const seen = new Set(train.map(i => rows[i].customer));
  return test.length ? test.filter(i => seen.has(rows[i].customer)).length / test.length : 0;
}

export function compareSplits(rows, { seeds = COMPARE_SEEDS } = {}) {
  const { X, y } = transactionXY(rows);
  const out = {};
  for (const how of SPLIT_KEYS) {
    const useSeeds = how === 'temporal' ? [seeds[0]] : seeds;
    const runs = useSeeds.map(seed => {
      const { train, test } = splitRows(how, rows, { testFraction: TEST_FRACTION, seed });
      const model = fit(REFERENCE.model, at(X, train), at(y, train), { ...REFERENCE.opts, seed });
      const value = auc(model.predictProba(at(X, test)), at(y, test));
      return { seed, auc: value, shared: overlap(rows, train, test), train, test };
    });
    const ok = runs.filter(r => Number.isFinite(r.auc)).map(r => r.auc);
    const entry = {
      auc: mean(ok), lo: ok.length ? Math.min(...ok) : NaN, hi: ok.length ? Math.max(...ok) : NaN,
      runs: runs.map(r => ({ seed: r.seed, auc: r.auc })), sharedShare: mean(runs.map(r => r.shared)),
    };
    if (how === 'temporal') {
      const { train, test } = runs[0];
      entry.lastTrainDay = Math.max(...train.map(i => rows[i].day));
      entry.firstTestDay = Math.min(...test.map(i => rows[i].day));
    }
    out[how] = entry;
  }
  return out;
}

export const optimismGap = (cmp, chosen, other) => cmp[chosen].auc - cmp[other].auc;

// ---------------------------------------------------------------- the small search

function innerFolds(sub, how, folds, seed) {
  if (how === 'grouped') return groupKFold(sub.map(r => r.customer), folds, seed);
  if (how === 'temporal') return timeSplit(sub.length, folds, 0);
  return kFold(sub.length, folds, seed);
}

export function tuneModel(rows, { how = 'grouped', model, train, seed = SPLIT_SEED } = {}) {
  const grid = GRIDS[model];
  if (!grid) throw new RangeError(`model "${model}" has no setting to tune`);
  const sub = train.map(i => rows[i]);
  const { X, y } = transactionXY(sub);
  const folds = innerFolds(sub, how, INNER_FOLDS, seed);
  const results = grid.values.map(value => {
    const scores = [];
    for (const f of folds) {
      const fitted = fit(model, at(X, f.train), at(y, f.train), { ...FIXED[model], [grid.setting]: value, seed });
      const s = auc(fitted.predictProba(at(X, f.test)), at(y, f.test));
      if (Number.isFinite(s)) scores.push(s);
    }
    return { value, mean: scores.length ? mean(scores) : 0.5, sd: sd(scores), scores };
  });
  const top = Math.max(...results.map(r => r.mean));
  const tied = results.filter(r => r.mean >= top - TIE);
  const best = tied[0];
  return { setting: grid.setting, values: grid.values, results, best: best.value, spread: top - Math.min(...results.map(r => r.mean)) };
}

// ---------------------------------------------------------------- the held-out rows

export function fitHeldOut(rows, { how = 'grouped', picks, seed = SPLIT_SEED } = {}) {
  const { train, test } = splitRows(how, rows, { testFraction: TEST_FRACTION, seed });
  const { X, y } = transactionXY(rows);
  const Xtr = at(X, train), ytr = at(y, train), Xte = at(X, test);
  const probas = {
    baseline: fit('baseline', Xtr, ytr).predictProba(Xte),
    logistic: fit('logistic', Xtr, ytr, { ...FIXED.logistic, [GRIDS.logistic.setting]: picks.logistic }).predictProba(Xte),
    forest: fit('forest', Xtr, ytr, { ...FIXED.forest, [GRIDS.forest.setting]: picks.forest, seed }).predictProba(Xte),
  };
  return { train, test, labels: at(y, test), probas };
}

export function scoreModels(labels, probas, { fpCost = 1, fnCost = 10, B = 200, seed = 1 } = {}) {
  const out = {};
  for (const m of MODEL_KEYS) {
    out[m] = {
      evaluation: evaluate(probas[m], labels, { fpCost, fnCost }),
      auc: bootstrapInterval(metricFns.auc, labels, probas[m], { B, seed }),
      ap: bootstrapInterval(metricFns.averagePrecision, labels, probas[m], { B, seed }),
      cost: bootstrapInterval(metricFns.cost({ fpCost, fnCost }), labels, probas[m], { B, seed }),
    };
    for (const k of ['auc', 'ap', 'cost']) delete out[m][k].values;
  }
  return out;
}

export function differenceInterval(metricFn, labels, probasA, probasB, { B = 200, seed = 1, alpha = 0.05 } = {}) {
  const n = labels.length;
  const random = rng(seed);
  const diffs = [];
  for (let b = 0; b < B; b++) {
    const idx = Array.from({ length: n }, () => Math.floor(random() * n));
    const l = idx.map(i => labels[i]);
    const d = metricFn(l, idx.map(i => probasA[i])) - metricFn(l, idx.map(i => probasB[i]));
    if (Number.isFinite(d)) diffs.push(d);
  }
  const estimate = metricFn(labels, probasA) - metricFn(labels, probasB);
  if (!diffs.length) return { estimate, lo: NaN, hi: NaN, used: 0 };
  const [lo, hi] = percentileCI(diffs, alpha);
  return { estimate, lo, hi, used: diffs.length };
}

// ---------------------------------------------------------------- the threshold

export function atThreshold(probas, labels, threshold, { fpCost = 1, fnCost = 10 } = {}) {
  const confusion = confusionAt(probas, labels, threshold);
  const { tp, fp, fn } = confusion;
  const n = labels.length;
  const totalCost = fp * fpCost + fn * fnCost;
  return {
    threshold, confusion, n, flagged: tp + fp,
    precision: tp + fp ? tp / (tp + fp) : 0, recall: tp + fn ? tp / (tp + fn) : 0,
    totalCost, expectedCost: n ? totalCost / n : 0,
  };
}

export function thresholdMax(probas, costThr) {
  const top = Math.max(0, ...probas);
  return Math.min(1, Math.max(0.1, Math.ceil(Math.max(top, costThr * 1.25) * 20) / 20));
}

export function costCurve(probas, labels, { fpCost = 1, fnCost = 10, xMax = 1, step = 0.005 } = {}) {
  const points = [];
  const count = Math.round(xMax / step);
  for (let i = 1; i <= count; i++) {
    const t = i * step;
    points.push({ t, cost: atThreshold(probas, labels, t, { fpCost, fnCost }).expectedCost });
  }
  return points;
}
