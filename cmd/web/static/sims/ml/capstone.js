// Pure helpers for the beginner capstone workbench: frame a binary task on the penguins table, split it,
// fit a baseline and three models, score them, and list their mistakes. No DOM, no network. Deterministic:
// the same rows, seed and parameters always give the same answer. Tested in capstone.test.js.
// The workbench lab and the capstone lessons rely on these names and shapes; change them only by adding.
//
//   Rows
//     rows are the objects from parseCsv(text).rows (or loadDataset('penguins')).rows: the columns
//     bill_length_mm, bill_depth_mm, flipper_length_mm, body_mass_g are numbers or null (NA), and
//     species ('Adelie' | 'Chinstrap' | 'Gentoo') and sex ('male' | 'female') are strings or null.
//
//   FEATURES                  ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g']
//   featureLabel(key)         the learner-facing name in the current language (tr() runs at call time)
//   TASKS                     { 'adelie-vs-chinstrap': def, 'sex': def, 'gentoo-vs-rest': def }; a def is
//                             { key, positive, negative, label(), question(), positiveName(), negativeName() }
//                             where positive/negative are the raw cell values of the column the task reads
//                             and the *Name()/label()/question() functions evaluate tr() when called.
//       adelie-vs-chinstrap   Gentoo rows are left out; positive class 1 = Chinstrap, 0 = Adelie.
//       sex                   rows with unknown sex are dropped; positive class 1 = male, 0 = female.
//       gentoo-vs-rest        all rows; positive class 1 = Gentoo, 0 = Adelie or Chinstrap.
//   taskKeys()                the three task keys in display order
//
//   prepareTask(rows, taskKey, features = FEATURES)
//       -> { X, y, ids, positiveLabel, negativeLabel, features, rowsKept, rowsDropped, rowsExcluded }
//       X: one array of numbers per kept row, in the order of `features` (unknown feature names throw).
//       y: 1 for the positive class, 0 for the other. ids[i] is the index in `rows` of the row behind X[i],
//       so rows[ids[i]] is the original record. Row order is kept.
//       rowsDropped counts rows the task covers that were removed for a missing (NA) value in a column it
//       needs: a chosen feature, or the sex column for the "sex" task. rowsExcluded counts rows the task
//       does not cover at all (Gentoo in adelie-vs-chinstrap). rowsKept + rowsDropped + rowsExcluded = rows.length.
//       An unknown taskKey or feature throws.
//
//   stratifiedSplit(y, { testFraction = 0.25, seed = 1 })  -> { train: [indices], test: [indices] }
//       Indices point into y (and so into X). Each class sends round(count * testFraction) rows to the test
//       set (the same shuffle for the same seed), so each class share in the test set is within one row of
//       its exact share. A class with 2 or more rows always keeps at least one row on each side. Both
//       index lists come back ascending. testFraction must be in (0, 1).
//
//   MODEL_KINDS               ['baseline', 'knn', 'logistic', 'tree']
//   MODEL_DEFAULTS            default params per kind: baseline {}, knn { k: 5, scale: true },
//                             logistic { lr: 0.1, iters: 500, l2: 0 }, tree { maxDepth: 3, minLeaf: 1 }
//   modelLabel(kind)          learner-facing model name in the current language
//   fitModel(kind, params, Xtrain, ytrain)
//       -> { kind, params, predict(x), proba(x), confidence(x), describe }
//       x is ONE row (array of numbers), y labels are 0/1. params are merged over MODEL_DEFAULTS[kind].
//       predict(x) -> 0 or 1. proba(x) -> probability of the positive class (1) in [0, 1]. confidence(x) ->
//       the probability of the class that predict(x) chose (proba or 1 - proba); 0.5 is a coin flip.
//       baseline  the majority class of the training rows (a tie goes to class 0); proba is the training
//                 share of class 1, the same for every row.
//       knn       sims/ml/knn.js classify() with k clamped to the training size; scale:true standardizes with
//                 the TRAINING mean and std (stored, applied to every later row; a constant column maps to
//                 0), scale:false uses the raw units (so body mass in grams dominates). proba is the share
//                 of the k neighbours in class 1 (a vote tie goes to the closest neighbour for predict).
//       logistic  sims/ml/logistic.js fitLogistic with standardize:true (training stats, inside the model);
//                 proba is predictProba, predict is proba >= 0.5. describe = { raw: rawCoefficients }.
//       tree      sims/ml/tree.js fitTree; predict is the leaf label, proba the share of class 1 in the leaf.
//                 describe = { tree: root node }.
//       Unknown kinds throw a RangeError.
//
//   evaluate(model, X, y)
//       -> { n, accuracy, precision, recall, f1, confusion: { tp, fp, tn, fn }, undefined: { precision, recall, f1 } }
//       Positive class = 1. A 0/0 ratio is 0 with its `undefined` flag true; accuracy of no rows is 0.
//
//   errorList(model, X, y, ids = null, rows = null)
//       -> [{ id, index, features, actual, predicted, confidence, type, row }] for every misclassified row.
//       index is the position in X, id is ids[index] (or index when ids is null), features is X[index],
//       actual/predicted are 0/1, confidence is model.confidence(x) (how sure the model was of its WRONG
//       answer), type is 'fp' (predicted 1, actual 0) or 'fn', row is rows[id] when rows is given, else null.
//       Sorted by confidence descending, so the most confident mistakes come first; ties keep X order.
import { tr } from '../../i18n.js';
import { rng, shuffle } from './rng.js';
import { columnStats, standardize } from './scale.js';
import { classify } from './knn.js';
import { fitLogistic, predictProba, rawCoefficients, precisionRecallF1 } from './logistic.js';
import { fitTree, predict as treePredict, decisionPath } from './tree.js';

export const FEATURES = ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g'];

export function featureLabel(key) {
  switch (key) {
    case 'bill_length_mm': return tr('Bill length (mm)', 'Panjang paruh (mm)');
    case 'bill_depth_mm': return tr('Bill depth (mm)', 'Kedalaman paruh (mm)');
    case 'flipper_length_mm': return tr('Flipper length (mm)', 'Panjang sirip (mm)');
    case 'body_mass_g': return tr('Body mass (g)', 'Massa tubuh (g)');
    default: throw new RangeError(`unknown feature "${key}"`);
  }
}

export const TASKS = {
  'adelie-vs-chinstrap': {
    key: 'adelie-vs-chinstrap', column: 'species', positive: 'Chinstrap', negative: 'Adelie', exclude: ['Gentoo'],
    label: () => tr('Adelie or Chinstrap', 'Adelie atau Chinstrap'),
    question: () => tr('Is this penguin a Chinstrap (rather than an Adelie)?', 'Apakah penguin ini Chinstrap (bukan Adelie)?'),
    positiveName: () => tr('Chinstrap', 'Chinstrap'),
    negativeName: () => tr('Adelie', 'Adelie'),
  },
  sex: {
    key: 'sex', column: 'sex', positive: 'male', negative: 'female', exclude: [],
    label: () => tr('Male or female', 'Jantan atau betina'),
    question: () => tr('Is this penguin male?', 'Apakah penguin ini jantan?'),
    positiveName: () => tr('male', 'jantan'),
    negativeName: () => tr('female', 'betina'),
  },
  'gentoo-vs-rest': {
    key: 'gentoo-vs-rest', column: 'species', positive: 'Gentoo', negative: null, exclude: [],
    label: () => tr('Gentoo or the rest', 'Gentoo atau lainnya'),
    question: () => tr('Is this penguin a Gentoo?', 'Apakah penguin ini Gentoo?'),
    positiveName: () => tr('Gentoo', 'Gentoo'),
    negativeName: () => tr('Adelie or Chinstrap', 'Adelie atau Chinstrap'),
  },
};

export const taskKeys = () => ['adelie-vs-chinstrap', 'sex', 'gentoo-vs-rest'];

const isNum = v => typeof v === 'number' && Number.isFinite(v);

export function prepareTask(rows, taskKey, features = FEATURES) {
  const task = TASKS[taskKey];
  if (!task) throw new RangeError(`unknown task "${taskKey}"`);
  for (const f of features) if (!FEATURES.includes(f)) throw new RangeError(`unknown feature "${f}"`);
  const X = [], y = [], ids = [];
  let rowsDropped = 0, rowsExcluded = 0;
  rows.forEach((r, i) => {
    if (task.exclude.includes(r[task.column])) { rowsExcluded++; return; }
    const target = r[task.column];
    // The label column must be known (only sex can be NA); a missing feature drops the row too.
    if (target === null || target === undefined || target === '' || !features.every(f => isNum(r[f]))) { rowsDropped++; return; }
    X.push(features.map(f => r[f]));
    y.push(target === task.positive ? 1 : 0);
    ids.push(i);
  });
  return {
    X, y, ids, features: features.slice(),
    positiveLabel: task.positive, negativeLabel: task.negative ?? 'rest',
    rowsKept: X.length, rowsDropped, rowsExcluded,
  };
}

export function stratifiedSplit(y, { testFraction = 0.25, seed = 1 } = {}) {
  if (!(testFraction > 0 && testFraction < 1)) throw new RangeError('testFraction must be between 0 and 1');
  const random = rng(seed);
  const classes = [...new Set(y)].sort((a, b) => a - b);
  const train = [], test = [];
  for (const c of classes) {
    const members = [];
    y.forEach((v, i) => { if (v === c) members.push(i); });
    const shuffled = shuffle(members, random);
    let nTest = Math.round(shuffled.length * testFraction);
    if (shuffled.length >= 2) nTest = Math.min(Math.max(nTest, 1), shuffled.length - 1);
    test.push(...shuffled.slice(0, nTest));
    train.push(...shuffled.slice(nTest));
  }
  const asc = (a, b) => a - b;
  return { train: train.sort(asc), test: test.sort(asc) };
}

export const MODEL_KINDS = ['baseline', 'knn', 'logistic', 'tree'];

export const MODEL_DEFAULTS = {
  baseline: {},
  knn: { k: 5, scale: true },
  logistic: { lr: 0.1, iters: 500, l2: 0 },
  tree: { maxDepth: 3, minLeaf: 1 },
};

export function modelLabel(kind) {
  switch (kind) {
    case 'baseline': return tr('Baseline (majority class)', 'Baseline (kelas terbanyak)');
    case 'knn': return tr('k-nearest neighbors', 'k tetangga terdekat');
    case 'logistic': return tr('Logistic regression', 'Regresi logistik');
    case 'tree': return tr('Decision tree', 'Pohon keputusan');
    default: throw new RangeError(`unknown model kind "${kind}"`);
  }
}

const clamp01 = p => Math.min(1, Math.max(0, p));

function wrap(kind, params, proba, predict, describe = {}) {
  return {
    kind, params, describe,
    predict,
    proba: x => clamp01(proba(x)),
    confidence: x => { const p = clamp01(proba(x)); return predict(x) === 1 ? p : 1 - p; },
  };
}

export function fitModel(kind, params, Xtrain, ytrain) {
  if (!MODEL_KINDS.includes(kind)) throw new RangeError(`unknown model kind "${kind}"`);
  if (!Array.isArray(Xtrain) || Xtrain.length === 0 || Xtrain.length !== ytrain.length) throw new Error('capstone: Xtrain and ytrain must be non-empty and the same length');
  const p = { ...MODEL_DEFAULTS[kind], ...(params ?? {}) };
  const y = ytrain.map(Number);
  const share1 = y.reduce((s, v) => s + v, 0) / y.length;

  if (kind === 'baseline') {
    const label = share1 > 0.5 ? 1 : 0;
    return wrap(kind, p, () => share1, () => label);
  }

  if (kind === 'knn') {
    const k = Math.max(1, Math.min(Math.round(p.k), Xtrain.length));
    const stats = p.scale ? columnStats(Xtrain) : null;
    const prep = rows => (stats ? standardize(rows, stats) : rows);
    const points = prep(Xtrain).map((features, i) => ({ features, label: y[i] }));
    const vote = x => classify(points, { features: prep([x])[0] }, k);
    const proba = x => { const v = vote(x); return (v.votes[1] ?? 0) / v.picked.length; };
    return wrap(kind, { ...p, k }, proba, x => Number(vote(x).label));
  }

  if (kind === 'logistic') {
    const m = fitLogistic(Xtrain, y, { lr: p.lr, iters: p.iters, l2: p.l2, standardize: true });
    const proba = x => predictProba(m, [x])[0];
    return wrap(kind, p, proba, x => (proba(x) >= 0.5 ? 1 : 0), { raw: rawCoefficients(m), model: m });
  }

  // tree
  const tree = fitTree(Xtrain, y, { maxDepth: p.maxDepth, minLeaf: p.minLeaf });
  const at = tree.classes.indexOf(1);
  const proba = x => {
    if (at < 0) return 0;
    const leaf = decisionPath(tree, x).at(-1);
    return leaf.n === 0 ? 0 : leaf.counts[at] / leaf.n;
  };
  return wrap(kind, p, proba, x => Number(treePredict(tree, x)), { tree });
}

export function evaluate(model, X, y) {
  const c = { tp: 0, fp: 0, tn: 0, fn: 0 };
  X.forEach((x, i) => {
    const pred = model.predict(x), actual = Number(y[i]);
    if (pred === 1) { if (actual === 1) c.tp++; else c.fp++; } else if (actual === 1) c.fn++; else c.tn++;
  });
  const n = X.length;
  const { precision, recall, f1, undefined: undef } = precisionRecallF1(c);
  return { n, accuracy: n ? (c.tp + c.tn) / n : 0, precision, recall, f1, confusion: c, undefined: undef };
}

export function errorList(model, X, y, ids = null, rows = null) {
  const out = [];
  X.forEach((x, index) => {
    const predicted = model.predict(x), actual = Number(y[index]);
    if (predicted === actual) return;
    const id = ids ? ids[index] : index;
    out.push({
      id, index, features: x.slice(), actual, predicted,
      confidence: model.confidence(x),
      type: predicted === 1 ? 'fp' : 'fn',
      row: rows ? rows[id] ?? null : null,
    });
  });
  return out.sort((a, b) => b.confidence - a.confidence || a.index - b.index);
}
