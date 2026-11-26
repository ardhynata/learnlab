// Helpers for the Level 2 capstone workbench: a cost-sensitive fraud classifier on repeated entities
// (customers) over time. Pure functions, no DOM, no clock; every random choice comes from a seed, so the
// same call always gives the same answer. Tested in capstone2.test.js.
//
// API
//   Data
//     makeTransactions({ customers = 60, perCustomer = 20, days = 90, fraudRate = 0.08, seed = 1, signal = 0.6 })
//         -> rows sorted by time. Row: { id, customer, day, hour, t, amount, merchantRisk, quirk,
//                                        features, label }
//         customer      integer 0..customers-1. Every customer has exactly perCustomer rows.
//         day, hour     the timestamp: day 0..days-1 (integer) and hour 0..23; t = day * 24 + hour is the
//                       sort key. Rows are returned in time order (ties by customer), so row i is also
//                       the i-th transaction in time, and `id` is that position.
//         amount        money amount (log-normal; each customer has their own typical size).
//         merchantRisk  a risk score in [0, 1] for the merchant.
//         quirk         a per-customer fingerprint (think of a device id): almost constant within a
//                       customer, different between customers, and unrelated to fraud across customers.
//                       It is NOT a real signal, but it lets a flexible model recognise which customer a
//                       row belongs to, and therefore that customer's fraud history. A random split puts
//                       the same customer on both sides, so the model looks better than it will on new
//                       customers (leakage); a grouped split removes the trick.
//         features      [amount, hour, merchantRisk, quirk], in the order of FEATURES.
//         label         1 = fraud, 0 = legitimate. Rare: the overall rate matches fraudRate (the base
//                       rate is calibrated to it exactly in expectation; the realised rate wobbles a bit).
//         Real signal (`signal` 0..1 scales it, default 0.6; 0 is pure noise): fraud tends to have larger amounts, to
//         happen at night (hour near 6 rather than near 14; wrapping around midnight, so a linear model
//         cannot use it well) and to use riskier merchants. Customers also differ in how fraud-prone
//         they are (a log-odds offset with spread 4), which is what the quirk leaks.
//         Throws RangeError for a non-integer or non-positive customers/perCustomer/days, for fewer
//         than 2 rows in total, or a fraudRate outside (0, 1).
//   FEATURES            ['amount', 'hour', 'merchantRisk', 'quirk']
//   transactionXY(rows) -> { X, y, groups, times } for the splitters and fitters (groups = customer ids,
//                          times = t).
//
//   Splitters. Each returns { train, test }: sorted arrays of row indices that never overlap and
//   together cover every row (temporal with a gap leaves the embargoed rows out). All take
//   { testFraction = 0.25, seed = 1 }; the test share is 1 / round(1 / testFraction), so 0.25 -> 1 in 4.
//   They reuse the fold builders of sims/ml/validation.js and take the first (random, grouped) or the last
//   (temporal) fold. testFraction must be in (0, 0.5].
//     randomSplit(rows, opts)    kFold: any row can be tested, so a customer is on both sides.
//     groupedSplit(rows, opts)   groupKFold on the customer: a customer is only ever on one side.
//                                Needs at least 1 / testFraction customers.
//     temporalSplit(rows, { testFraction, gap = 0 })
//                                timeSplit on the rows ordered by t (they need not be sorted already):
//                                train is the earliest rows, test the latest block, so training never
//                                contains the future (max t of train <= min t of test). `gap` rows just
//                                before the test block are left out (an embargo; a gap so big that some earlier time
//                                fold would have no training rows throws RangeError). No seed needed.
//     SPLITS             { random, grouped, temporal } the three above by name
//     split(name, rows, opts) -> one of them; throws for an unknown name.
//     `rows` may also be a plain row count for randomSplit and temporalSplit.
//
//   Fitters. fit(name, X, y, opts?) -> model with model.predictProba(X) -> one P(fraud) per row.
//     'baseline'  the prior: every row gets mean(y) of the training rows (AUC 0.5).
//     'logistic'  sims/ml/logistic.js fitLogistic, standardised inside. opts: { lr = 0.3, iters = 300, l2 = 0 }.
//     'tree'      sims/ml/tree.js fitTree; the probability is the share of fraud in the leaf.
//                 opts: { maxDepth = 6, minLeaf = 3 }.
//     'forest'    sims/ml/ensemble.js randomForest, the mean of the trees' leaf probabilities.
//                 opts: { trees = 60, maxDepth = 8, minLeaf = 2, seed = 1 }.
//     FITTERS            the same four as { name: (X, y, opts) => model }; MODEL_NAMES lists the names.
//
//   Cost and metrics
//     costThreshold(fpCost, fnCost) -> fpCost / (fpCost + fnCost). Flagging a row costs fpCost if it is
//         legitimate (probability 1 - p) and not flagging it costs fnCost if it is fraud (probability p);
//         flag when p * fnCost >= (1 - p) * fpCost, that is p >= fpCost / (fpCost + fnCost).
//         Both costs must be finite and not negative, and not both 0.
//     auc(probas, labels)               area under the ROC curve = P(a random fraud scores above a random
//                                       legitimate row), ties count half. NaN when a class is missing.
//     averagePrecision(probas, labels)  sum over distinct score cut-offs of (recall step) * precision;
//                                       the area under the precision-recall curve. NaN with no fraud.
//     confusionAt(probas, labels, threshold) -> { tp, fp, tn, fn }, flagged when p >= threshold.
//     evaluate(probas, labels, { fpCost = 1, fnCost = 10 }) -> {
//         n, positives, auc, averagePrecision, fpCost, fnCost,
//         threshold      costThreshold(fpCost, fnCost),
//         confusion      { tp, fp, tn, fn } at that threshold,
//         precision, recall   at that threshold (0 when undefined),
//         totalCost      fp * fpCost + fn * fnCost,
//         expectedCost   totalCost / n, the cost per transaction,
//         costFlagNone   cost of flagging nothing (positives * fnCost),
//         costFlagAll    cost of flagging everything ((n - positives) * fpCost) }
//     metricFns          { auc, averagePrecision, cost(opts) } each as (labels, probas) -> number for
//                        bootstrapInterval; cost(opts) is the expectedCost at the cost threshold.
//
//   Uncertainty
//     bootstrapInterval(metricFn, labels, probas, { B = 200, seed = 1, alpha = 0.05 })
//         -> { estimate, lo, hi, values, B, used, alpha }
//         estimate = metricFn(labels, probas) on the held-out rows as they are; the interval is the
//         percentile interval (sims/ml/uncertainty.js percentileCI) of the metric over B resamples of the
//         held-out ROWS (with replacement). A resample the metric cannot score (NaN, for example no fraud
//         in it) is skipped; `used` counts the resamples that count. With a rare label this interval is
//         wide, which is the point: the held-out set only has a handful of fraud cases.
//
//   One experiment, end to end
//     holdout(rows, { split = 'grouped', model = 'forest', testFraction, seed, gap, fpCost, fnCost,
//                     B = 200, fitOpts })
//         -> { split, model, train, test, probas, labels, evaluation, interval }
//         splits the rows, fits on the train rows, scores the test rows, evaluates, and gives the
//         bootstrap interval for the AUC.

import { kFold, groupKFold, timeSplit } from './validation.js';
import { fitLogistic, predictProba as logisticProba } from './logistic.js';
import { fitTree } from './tree.js';
import { randomForest } from './ensemble.js';
import { percentileCI } from './uncertainty.js';
import { rng, gauss } from './rng.js';

export const FEATURES = ['amount', 'hour', 'merchantRisk', 'quirk'];

const sigmoid = z => 1 / (1 + Math.exp(-z));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const posInt = (v, name) => {
  if (!Number.isInteger(v) || v < 1) throw new RangeError(`${name} must be a positive integer`);
};

// ---------------------------------------------------------------- data

// Base log-odds so that the average fraud probability over the customers is exactly `rate`.
function calibrate(offsets, rate) {
  let lo = -40, hi = 40;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const m = offsets.reduce((s, b) => s + sigmoid(mid + b), 0) / offsets.length;
    if (m < rate) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export function makeTransactions({ customers = 60, perCustomer = 20, days = 90, fraudRate = 0.08, seed = 1, signal = 0.6 } = {}) {
  posInt(customers, 'customers');
  posInt(perCustomer, 'perCustomer');
  posInt(days, 'days');
  if (customers * perCustomer < 2) throw new RangeError('need at least 2 rows');
  if (!(fraudRate > 0 && fraudRate < 1)) throw new RangeError('fraudRate must be in (0, 1)');
  const s = clamp(Number.isFinite(signal) ? signal : 1, 0, 1);
  const random = rng(seed);

  const people = Array.from({ length: customers }, () => ({
    offset: 4 * gauss(random),          // how fraud-prone this customer is
    size: 3.5 + 0.5 * gauss(random),      // typical log amount
    quirk: 10 * random(),                 // fingerprint, unrelated to fraud across customers
  }));
  const base = calibrate(people.map(p => p.offset), fraudRate);

  // Labels first (so the rare class can be guaranteed), then the features that depend on them.
  const drafts = [];
  people.forEach((p, customer) => {
    for (let k = 0; k < perCustomer; k++) {
      drafts.push({ customer, label: random() < sigmoid(base + p.offset) ? 1 : 0, day: Math.floor(random() * days) });
    }
  });
  if (!drafts.some(d => d.label === 1)) drafts[0].label = 1;
  if (!drafts.some(d => d.label === 0)) drafts[drafts.length - 1].label = 0;

  const rows = drafts.map(d => {
    const p = people[d.customer];
    const fraud = d.label === 1;
    const amount = Math.exp(p.size + 0.35 * gauss(random) + (fraud ? 0.4 * s : 0));
    const center = fraud ? 14 - 8 * s : 14;
    const hour = Math.floor((((center + 4 * gauss(random)) % 24) + 24) % 24);
    const merchantRisk = clamp(0.3 + (fraud ? 0.1 * s : 0) + 0.15 * gauss(random), 0, 1);
    const quirk = p.quirk + 0.02 * gauss(random);
    const r = { customer: d.customer, day: d.day, hour, t: d.day * 24 + hour, amount, merchantRisk, quirk, label: d.label };
    return r;
  });
  rows.sort((a, b) => a.t - b.t || a.customer - b.customer);
  return rows.map((r, id) => ({ id, ...r, features: [r.amount, r.hour, r.merchantRisk, r.quirk] }));
}

export function transactionXY(rows) {
  return {
    X: rows.map(r => r.features),
    y: rows.map(r => r.label),
    groups: rows.map(r => r.customer),
    times: rows.map(r => r.t),
  };
}

// ---------------------------------------------------------------- splitters

const sizeOf = rows => (typeof rows === 'number' ? rows : rows.length);

function foldCount(testFraction) {
  if (!(testFraction > 0 && testFraction <= 0.5)) throw new RangeError('testFraction must be in (0, 0.5]');
  return Math.round(1 / testFraction);
}

export function randomSplit(rows, { testFraction = 0.25, seed = 1 } = {}) {
  const f = kFold(sizeOf(rows), foldCount(testFraction), seed)[0];
  return { train: f.train, test: f.test };
}

export function groupedSplit(rows, { testFraction = 0.25, seed = 1 } = {}) {
  if (typeof rows === 'number') throw new TypeError('groupedSplit needs the rows, to read the customers');
  const f = groupKFold(rows.map(r => r.customer), foldCount(testFraction), seed)[0];
  return { train: f.train, test: f.test };
}

export function temporalSplit(rows, { testFraction = 0.25, gap = 0 } = {}) {
  const k = foldCount(testFraction);
  const n = sizeOf(rows);
  // Work in time order, then map the positions back to the caller's row indices.
  const order = typeof rows === 'number'
    ? Array.from({ length: n }, (_, i) => i)
    : Array.from({ length: n }, (_, i) => i).sort((a, b) => rows[a].t - rows[b].t || a - b);
  const folds = timeSplit(n, k - 1, gap);
  const last = folds[folds.length - 1];
  const sort = idx => idx.map(i => order[i]).sort((a, b) => a - b);
  return { train: sort(last.train), test: sort(last.test) };
}

export const SPLITS = { random: randomSplit, grouped: groupedSplit, temporal: temporalSplit };

export function split(name, rows, opts = {}) {
  if (!Object.hasOwn(SPLITS, name)) throw new RangeError(`unknown split "${name}"`);
  return SPLITS[name](rows, opts);
}

// ---------------------------------------------------------------- fitters

const meanOf = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function leafOf(node, x) {
  let n = node;
  while (!n.leaf) n = x[n.feature] <= n.threshold ? n.left : n.right;
  return n;
}

export const FITTERS = {
  baseline(X, y) {
    const prior = meanOf(y);
    return { name: 'baseline', prior, predictProba: rows => rows.map(() => prior) };
  },
  logistic(X, y, { lr = 0.3, iters = 300, l2 = 0 } = {}) {
    const model = fitLogistic(X, y, { lr, iters, l2 });
    return { name: 'logistic', model, predictProba: rows => logisticProba(model, rows) };
  },
  tree(X, y, { maxDepth = 6, minLeaf = 3 } = {}) {
    const tree = fitTree(X, y, { maxDepth, minLeaf });
    const col = tree.classes.indexOf(1);
    return {
      name: 'tree', tree,
      predictProba: rows => rows.map(x => {
        const leaf = leafOf(tree, x);
        return col < 0 || leaf.n === 0 ? 0 : leaf.counts[col] / leaf.n;
      }),
    };
  },
  forest(X, y, { trees = 60, maxDepth = 8, minLeaf = 2, seed = 1 } = {}) {
    const model = randomForest({ X, y, trees, maxDepth, minLeaf, seed });
    return { name: 'forest', model, predictProba: rows => model.predictProbaAll(rows) };
  },
};

export const MODEL_NAMES = Object.keys(FITTERS);

export function fit(name, X, y, opts = {}) {
  if (!Object.hasOwn(FITTERS, name)) throw new RangeError(`unknown model "${name}"`);
  if (!X.length || X.length !== y.length) throw new RangeError('X and y need the same, non-zero length');
  return FITTERS[name](X, y, opts);
}

// ---------------------------------------------------------------- cost and metrics

export function costThreshold(fpCost, fnCost) {
  const ok = c => Number.isFinite(c) && c >= 0;
  if (!ok(fpCost) || !ok(fnCost) || fpCost + fnCost === 0) throw new RangeError('costs must be finite, not negative, and not both 0');
  return fpCost / (fpCost + fnCost);
}

function counts(labels) {
  let pos = 0;
  for (const l of labels) if (l === 1) pos++;
  return { pos, neg: labels.length - pos };
}

export function auc(probas, labels) {
  const { pos, neg } = counts(labels);
  if (!pos || !neg) return NaN;
  const order = probas.map((p, i) => i).sort((a, b) => probas[a] - probas[b]);
  // Mann-Whitney: sum of the (average) ranks of the fraud rows, ties share their mean rank.
  let rankSum = 0;
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && probas[order[j + 1]] === probas[order[i]]) j++;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) if (labels[order[k]] === 1) rankSum += rank;
    i = j + 1;
  }
  return (rankSum - (pos * (pos + 1)) / 2) / (pos * neg);
}

export function averagePrecision(probas, labels) {
  const { pos } = counts(labels);
  if (!pos) return NaN;
  const order = probas.map((p, i) => i).sort((a, b) => probas[b] - probas[a]);
  let tp = 0, seen = 0, prevRecall = 0, ap = 0;
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && probas[order[j + 1]] === probas[order[i]]) j++;
    for (let k = i; k <= j; k++) { seen++; if (labels[order[k]] === 1) tp++; }
    const recall = tp / pos;
    ap += (recall - prevRecall) * (tp / seen);
    prevRecall = recall;
    i = j + 1;
  }
  return ap;
}

export function confusionAt(probas, labels, threshold) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  probas.forEach((p, i) => {
    const flagged = p >= threshold;
    if (labels[i] === 1) { if (flagged) tp++; else fn++; } else if (flagged) fp++; else tn++;
  });
  return { tp, fp, tn, fn };
}

export function evaluate(probas, labels, { fpCost = 1, fnCost = 10 } = {}) {
  if (probas.length !== labels.length) throw new RangeError('probas and labels need the same length');
  const threshold = costThreshold(fpCost, fnCost);
  const n = labels.length;
  const { pos, neg } = counts(labels);
  const confusion = confusionAt(probas, labels, threshold);
  const { tp, fp, fn } = confusion;
  const totalCost = fp * fpCost + fn * fnCost;
  return {
    n, positives: pos,
    auc: auc(probas, labels),
    averagePrecision: averagePrecision(probas, labels),
    fpCost, fnCost, threshold, confusion,
    precision: tp + fp ? tp / (tp + fp) : 0,
    recall: tp + fn ? tp / (tp + fn) : 0,
    totalCost,
    expectedCost: n ? totalCost / n : 0,
    costFlagNone: pos * fnCost,
    costFlagAll: neg * fpCost,
  };
}

export const metricFns = {
  auc: (labels, probas) => auc(probas, labels),
  averagePrecision: (labels, probas) => averagePrecision(probas, labels),
  cost: opts => (labels, probas) => evaluate(probas, labels, opts).expectedCost,
};

// ---------------------------------------------------------------- uncertainty

export function bootstrapInterval(metricFn, labels, probas, { B = 200, seed = 1, alpha = 0.05 } = {}) {
  if (typeof metricFn !== 'function') throw new TypeError('metricFn must be a function (labels, probas) -> number');
  if (!labels.length || labels.length !== probas.length) throw new RangeError('labels and probas need the same, non-zero length');
  posInt(B, 'B');
  const n = labels.length;
  const random = rng(seed);
  const values = [];
  for (let b = 0; b < B; b++) {
    const idx = Array.from({ length: n }, () => Math.floor(random() * n));
    const v = metricFn(idx.map(i => labels[i]), idx.map(i => probas[i]));
    if (Number.isFinite(v)) values.push(v);
  }
  const estimate = metricFn(labels, probas);
  if (!values.length) return { estimate, lo: NaN, hi: NaN, values, B, used: 0, alpha };
  const [lo, hi] = percentileCI(values, alpha);
  return { estimate, lo, hi, values, B, used: values.length, alpha };
}

// ---------------------------------------------------------------- one experiment

export function holdout(rows, {
  split: how = 'grouped', model = 'forest', testFraction = 0.25, seed = 1, gap = 0,
  fpCost = 1, fnCost = 10, B = 200, fitOpts = {},
} = {}) {
  const { train, test } = split(how, rows, { testFraction, seed, gap });
  const { X, y } = transactionXY(rows);
  const fitted = fit(model, train.map(i => X[i]), train.map(i => y[i]), { seed, ...fitOpts });
  const labels = test.map(i => y[i]);
  const probas = fitted.predictProba(test.map(i => X[i]));
  return {
    split: how, model, train, test, probas, labels,
    evaluation: evaluate(probas, labels, { fpCost, fnCost }),
    interval: bootstrapInterval(metricFns.auc, labels, probas, { B, seed }),
  };
}
