// The computing behind the Level 3 capstone workbench (sims/labs/capstone-l3.js), on top of sims/ml/capstone3.js (the
// synthetic batch-scoring system, the splits, the operational metric, the reproducibility check, the monitoring plan
// and the investigation). Pure functions, no DOM, no clock, every random choice seeded. Tested in capstone3lab.test.js.
//
// API
//   Constants   SCENARIO_SEEDS (the six systems on offer, one failure kind each plus repeats), SPLIT_KEYS, MODEL_KEYS,
//               TUNABLE, GRIDS { logistic: { setting: 'l2', values }, forest: { setting: 'maxDepth', values } },
//               TIE, INNER_FOLDS, TEST_FRACTION, COMPARE_RUNS (repeats of the split comparison), COST_RANGE,
//               PLAN_LIMITS, HYPOTHESES, REMEDY_KINDS, CHANGE_KEYS.
//   buildSystem(seed, { costs, capacity })  the system of scenario `seed` (a number from SCENARIO_SEEDS) with the
//       learner's cost table and daily review capacity. Rows do not depend on the costs.
//   frameFacts(system)  { n, positives, rate, entities, launchDay, streamDays, labelDelay, newShare,
//       accuracyNever, capacity, perDay, threshold, costFlagNone, costFlagAll, costNoneEach, costAllEach }:
//       the numbers of step 1 on the labelled history (accuracyNever = the accuracy of a model that flags nothing;
//       costNoneEach / costAllEach the cost per case of flagging nothing / flagging everything, review included).
//   compareSplits(system) -> { random, grouped, temporal }, each { kind, estimate, realised, optimism, sharedEntities,
//       trainsOnFuture, runs, lo, hi }: the AUC of one reference forest (30 trees) on the test side of the split
//       (estimate), what it scores on the cases of NEW entities on the clean deployed days (realised) and the gap
//       (optimism), each averaged over COMPARE_RUNS split seeds (the temporal split has one cut, so one run); lo and hi
//       are the lowest and the highest optimism of the runs.
//   tuneCandidate(system, split, model) -> { setting, values, results: [{ value, mean, sd, scores }], best, spread }
//       The small search of step 3, on split.train only: for each grid value, INNER_FOLDS validation folds of the same
//       kind as the split (random folds, folds that keep an entity together, or blocks of time), scored by AUC. best =
//       the highest mean; among the values within TIE of it, the first of the grid (the weakest penalty, the shallowest tree).
//   usedValue(picks, model, tuned)  the value a model uses: the learner's pick, else the best of the search.
//   evaluateCandidates(system, split, picks, { costs, capacity, B, seed })
//       -> { labels, probas: { baseline, logistic, forest }, nTest, capacityTest, scores: { [model]: { auc, ap, cost, op } },
//            diffs: { logistic, forest, forestVsLogistic } }
//       Fits baseline, logistic (picks.logistic = l2) and forest (picks.forest = maxDepth) on split.train, scores the test
//       side, and gives every metric with a 95% bootstrap interval { estimate, lo, hi, used } (the same resamples for every
//       model). cost = the operational metric: the expected cost per case of the flagged cases under the review capacity
//       (capstone3.operationalMetric; capacity per day scaled to the test size); op is its point result. diffs are the
//       bootstrap intervals of the cost difference (a minus b: negative means a is cheaper) against the baseline, and of
//       the forest against the logistic.
//   experimentSettings({ split, model, picks, costs, capacity })  the settings for capstone3.runExperiment.
//   changeOption(settings, key) -> { key, field, from, to, overrides }  a one-setting change for the reproducibility
//       check, key in CHANGE_KEYS: 'model', 'split', 'fraction', 'miss', 'capacity', 'setting' (the model's tuned setting).
//   planConfig(plan)  the plan the learner built (see emptyPlan in capstone3report.js) as capstone3.evaluatePlan's plan.
//   alertDay(system, plan, model)  the evaluatePlan result for the plan.
//   referenceAuc(system, model)  the AUC of the deployed model on the labelled history: the line the delayed monitor compares against.
//   evidenceDay(system, firstAlert, window = 10)  the day the investigation reads its evidence: the later of the first
//       alert day and the day the labels of the new regime have arrived, clamped to the last day.
//   investigateWith(system, hypothesis, { day, model, remedy })  capstone3.investigate at that day.
import { fit, auc, averagePrecision, bootstrapInterval, metricFns } from './capstone2.js';
import { differenceInterval } from './capstone2lab.js';
import { kFold, groupKFold, timeSplit } from './validation.js';
import {
  makeCapstoneSystem, chooseSplit, operationalMetric, reviewThreshold, evaluatePlan, investigate, deployedModel, SIGNAL_FEATURES, FEATURES,
} from './capstone3.js';

export const SCENARIO_SEEDS = [4, 8, 16, 10, 14, 6];
export const SPLIT_KEYS = ['random', 'grouped', 'temporal'];
export const MODEL_KEYS = ['baseline', 'logistic', 'forest'];
export const TUNABLE = ['logistic', 'forest'];
export const GRIDS = {
  logistic: { setting: 'l2', values: [0, 0.01, 0.1, 1] },
  forest: { setting: 'maxDepth', values: [2, 4, 6, 8] },
};
export const TIE = 0.005;
export const INNER_FOLDS = 3;
export const TEST_FRACTION = 0.25;
export const COMPARE_RUNS = 3;
export const FOREST_TREES = 30;
export const COST_RANGE = { miss: { min: 20, max: 400 }, falseAlarm: { min: 1, max: 50 }, review: { min: 1, max: 50 }, capacity: { min: 4, max: 60 } };
export const PLAN_LIMITS = {
  psi: { threshold: { min: 0.05, max: 0.5, step: 0.05 }, window: { min: 3, max: 21, step: 1 } },
  score: { threshold: { min: 0.05, max: 0.5, step: 0.05 }, window: { min: 3, max: 21, step: 1 } },
  delayed: { drop: { min: 0.02, max: 0.2, step: 0.02 }, window: { min: 7, max: 28, step: 1 } },
  prevalence: { ratio: { min: 1.2, max: 2.5, step: 0.1 }, window: { min: 7, max: 28, step: 1 } },
  consecutive: { min: 1, max: 4, step: 1 },
};
export const HYPOTHESES = ['skew', 'covariate', 'label', 'concept'];
export const REMEDY_KINDS = ['none', 'rollback', 'recalibrate', 'retrain'];
export const CHANGE_KEYS = ['model', 'split', 'fraction', 'miss', 'capacity', 'setting'];

const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sd = xs => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const at = (arr, idx) => idx.map(i => arr[i]);
const round = (x, d = 6) => Math.round(x * 10 ** d) / 10 ** d;

export function buildSystem(seed, { costs, capacity } = {}) {
  return makeCapstoneSystem({ seed, costs, capacity });
}

// ---------------------------------------------------------------- step 1

export function frameFacts(system) {
  const y = system.history.map(r => r.label);
  const positives = y.reduce((a, b) => a + b, 0), n = y.length;
  const c = system.costs;
  const entities = new Set(system.history.map(r => r.entity)).size;
  return {
    n, positives, rate: n ? positives / n : 0, entities, launchDay: system.launchDay, streamDays: system.days - system.launchDay,
    labelDelay: system.labelDelay, newShare: system.entityTable.filter(e => e.isNew).length / system.entities,
    accuracyNever: n ? 1 - positives / n : 1, capacity: system.capacity, perDay: system.perDay, threshold: reviewThreshold(c),
    costFlagNone: positives * c.miss, costFlagAll: n * c.review + (n - positives) * c.falseAlarm,
    costNoneEach: n ? positives * c.miss / n : 0, costAllEach: n ? (n * c.review + (n - positives) * c.falseAlarm) / n : 0,
  };
}

// ---------------------------------------------------------------- step 2

export function compareSplits(system) {
  const out = {};
  for (const kind of SPLIT_KEYS) {
    const seeds = kind === 'temporal' ? [system.seed] : Array.from({ length: COMPARE_RUNS }, (_, i) => system.seed + i);
    const runs = seeds.map(seed => chooseSplit(system, kind, { seed, model: 'forest' }));
    const optimism = runs.map(r => r.optimism);
    out[kind] = {
      kind, runs: runs.length,
      estimate: mean(runs.map(r => r.estimate)), realised: mean(runs.map(r => r.realised)), optimism: mean(optimism),
      sharedEntities: mean(runs.map(r => r.sharedEntities)), trainsOnFuture: runs.some(r => r.trainsOnFuture),
      lo: Math.min(...optimism), hi: Math.max(...optimism),
    };
  }
  return out;
}

// ---------------------------------------------------------------- step 3

function innerFolds(rows, kind, folds, seed) {
  if (kind === 'grouped') return groupKFold(rows.map(r => r.entity), folds, seed);
  if (kind === 'temporal') return timeSplit(rows.length, folds, 0);
  return kFold(rows.length, folds, seed);
}

export function tuneCandidate(system, split, model) {
  const grid = GRIDS[model];
  if (!grid) throw new RangeError(`tuneCandidate: "${model}" has no setting to tune`);
  const rows = at(system.history, split.train);
  const X = rows.map(r => r.x), y = rows.map(r => r.label);
  const seed = system.seed;
  const folds = innerFolds(rows, split.kind, INNER_FOLDS, seed);
  const results = grid.values.map(value => {
    const scores = [];
    for (const f of folds) {
      const fitted = fit(model, at(X, f.train), at(y, f.train), { seed, trees: FOREST_TREES, [grid.setting]: value });
      const s = auc(fitted.predictProba(at(X, f.test)), at(y, f.test));
      if (Number.isFinite(s)) scores.push(s);
    }
    return { value, mean: scores.length ? mean(scores) : 0.5, sd: sd(scores), scores };
  });
  const top = Math.max(...results.map(r => r.mean));
  const best = results.filter(r => r.mean >= top - TIE)[0];
  return { setting: grid.setting, values: grid.values, results, best: best.value, spread: top - Math.min(...results.map(r => r.mean)) };
}

export const usedValue = (picks, model, tuned) => picks?.[model] ?? tuned?.best ?? null;

export function evaluateCandidates(system, split, picks, { costs, capacity, B = 200, seed = 1 } = {}) {
  const table = costs ?? system.costs;
  const trRows = at(system.history, split.train), teRows = at(system.history, split.test);
  const X = trRows.map(r => r.x), y = trRows.map(r => r.label);
  const Xte = teRows.map(r => r.x), labels = teRows.map(r => r.label);
  const perDay = capacity ?? system.capacity;
  const cap = Math.round(perDay * labels.length / system.perDay);
  const s = system.seed;
  const probas = {
    baseline: fit('baseline', X, y, { seed: s }).predictProba(Xte),
    logistic: fit('logistic', X, y, { seed: s, l2: picks.logistic }).predictProba(Xte),
    forest: fit('forest', X, y, { seed: s, trees: FOREST_TREES, maxDepth: picks.forest }).predictProba(Xte),
  };
  const costFn = (l, p) => operationalMetric(p, l, table, cap).expectedCost;
  const scores = {};
  for (const m of MODEL_KEYS) {
    const strip = iv => { const { values, ...rest } = iv; return rest; };
    scores[m] = {
      auc: strip(bootstrapInterval(metricFns.auc, labels, probas[m], { B, seed })),
      ap: strip(bootstrapInterval(metricFns.averagePrecision, labels, probas[m], { B, seed })),
      cost: strip(bootstrapInterval(costFn, labels, probas[m], { B, seed })),
      op: operationalMetric(probas[m], labels, table, cap),
    };
  }
  const diff = (a, b) => differenceInterval(costFn, labels, probas[a], probas[b], { B, seed });
  return {
    labels, probas, nTest: labels.length, capacityTest: cap, scores,
    diffs: { logistic: diff('logistic', 'baseline'), forest: diff('forest', 'baseline'), forestVsLogistic: diff('forest', 'logistic') },
  };
}

// ---------------------------------------------------------------- step 4

export function experimentSettings({ split, model, picks, costs, capacity }) {
  const fitOpts = model === 'forest' ? { maxDepth: picks.forest } : { l2: picks.logistic };
  return {
    system: { capacity }, splitKind: split, model, testFraction: TEST_FRACTION,
    costs: { miss: costs.miss, falseAlarm: costs.falseAlarm, review: costs.review }, fitOpts,
  };
}

export function changeOption(settings, key) {
  switch (key) {
    case 'model': {
      const to = settings.model === 'forest' ? 'logistic' : 'forest';
      return { key, field: 'model', from: settings.model, to, overrides: { model: to } };
    }
    case 'split': {
      const to = SPLIT_KEYS[(SPLIT_KEYS.indexOf(settings.splitKind) + 1) % SPLIT_KEYS.length];
      return { key, field: 'split', from: settings.splitKind, to, overrides: { splitKind: to } };
    }
    case 'fraction': {
      const to = settings.testFraction === 0.2 ? 0.25 : 0.2;
      return { key, field: 'testFraction', from: settings.testFraction, to, overrides: { testFraction: to } };
    }
    case 'miss': {
      const to = settings.costs.miss + 10;
      return { key, field: 'miss', from: settings.costs.miss, to, overrides: { costs: { ...settings.costs, miss: to } } };
    }
    case 'capacity': {
      const from = settings.system.capacity, to = from + 4;
      return { key, field: 'capacity', from, to, overrides: { system: { ...settings.system, capacity: to } } };
    }
    case 'setting': {
      if (settings.model === 'forest') {
        const from = settings.fitOpts.maxDepth, to = from + 1;
        return { key, field: 'maxDepth', from, to, overrides: { fitOpts: { ...settings.fitOpts, maxDepth: to } } };
      }
      const from = settings.fitOpts.l2, to = from === 0 ? 0.1 : round(from * 10);
      return { key, field: 'l2', from, to, overrides: { fitOpts: { ...settings.fitOpts, l2: to } } };
    }
    default: throw new RangeError(`changeOption: unknown key "${key}"`);
  }
}

// ---------------------------------------------------------------- steps 5 and 6

export function planConfig(plan) {
  const monitors = {};
  if (plan.psi.on) monitors.psi = { threshold: plan.psi.threshold, window: plan.psi.window, features: plan.psi.features.slice() };
  if (plan.score.on) monitors.score = { threshold: plan.score.threshold, window: plan.score.window };
  if (plan.delayed.on) monitors.delayed = { drop: plan.delayed.drop, window: plan.delayed.window };
  if (plan.prevalence.on) monitors.prevalence = { ratio: plan.prevalence.ratio, window: plan.prevalence.window };
  return { monitors, consecutive: plan.consecutive };
}

export function alertDay(system, plan, model = 'logistic') {
  return evaluatePlan({ system, plan: planConfig(plan), model });
}

export function referenceAuc(system, model = 'logistic') {
  const m = deployedModel(system, model);
  return auc(m.predictProba(system.history.map(r => r.x)), system.history.map(r => r.label));
}

export function evidenceDay(system, firstAlert, window = 10) {
  const ready = system.truth.day + system.labelDelay + window;
  return Math.min(system.days - 1, Math.max(firstAlert ?? 0, ready));
}

export function investigateWith(system, hypothesis, { day, model = 'logistic', remedy = false } = {}) {
  return investigate(system, hypothesis, { asOf: day, model, remedy });
}

export { SIGNAL_FEATURES, FEATURES };
