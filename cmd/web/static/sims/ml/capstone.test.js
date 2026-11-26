import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from './tabular.js';
import { setLocale } from '../../i18n.js';
import {
  FEATURES, TASKS, taskKeys, featureLabel, prepareTask, stratifiedSplit, MODEL_KINDS, MODEL_DEFAULTS, modelLabel,
  fitModel, evaluate, errorList,
} from './capstone.js';

// setLocale touches document and window; stand them in for node.
globalThis.document = { documentElement: {} };
globalThis.window = new EventTarget();

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const penguins = parseCsv(readFileSync(new URL('../../data/penguins.csv', import.meta.url), 'utf8')).rows;
const row = (species, sex, bl, bd, fl, bm) => ({ species, sex, bill_length_mm: bl, bill_depth_mm: bd, flipper_length_mm: fl, body_mass_g: bm });

test('tasks: three keys, labels follow the language at call time', () => {
  assert.deepEqual(taskKeys(), ['adelie-vs-chinstrap', 'sex', 'gentoo-vs-rest']);
  assert.deepEqual(Object.keys(TASKS).sort(), [...taskKeys()].sort());
  try {
    setLocale('en');
    assert.equal(TASKS.sex.label(), 'Male or female');
    assert.equal(featureLabel('body_mass_g'), 'Body mass (g)');
    assert.equal(modelLabel('tree'), 'Decision tree');
    setLocale('id');
    assert.equal(TASKS.sex.label(), 'Jantan atau betina');
    assert.equal(featureLabel('body_mass_g'), 'Massa tubuh (g)');
    assert.equal(modelLabel('tree'), 'Pohon keputusan');
  } finally { setLocale('en'); }
  for (const k of taskKeys()) assert.ok(TASKS[k].question().length > 5 && TASKS[k].positiveName() && TASKS[k].negativeName());
  assert.throws(() => featureLabel('island'), RangeError);
});

const small = [
  row('Adelie', 'male', 39, 18, 180, 3700),
  row('Adelie', 'female', 38, 17, 185, 3400),
  row('Chinstrap', 'female', 46, 18, 190, 3500),
  row('Gentoo', 'male', 47, 15, 220, 5000),
  row('Gentoo', null, 45, 14, 215, null), // NA body mass and sex
  row('Chinstrap', null, 50, 19, 195, 3900), // NA sex only
  row('Adelie', 'male', null, null, null, null), // NA measurements
];

test('prepareTask: adelie-vs-chinstrap leaves Gentoo out and drops NA rows, ids point back into rows', () => {
  const t = prepareTask(small, 'adelie-vs-chinstrap');
  assert.deepEqual(t.ids, [0, 1, 2, 5]);
  assert.deepEqual(t.y, [0, 0, 1, 1]);
  assert.equal(t.positiveLabel, 'Chinstrap');
  assert.equal(t.rowsKept, 4);
  assert.equal(t.rowsDropped, 1); // the all-NA Adelie row
  assert.equal(t.rowsExcluded, 2); // the two Gentoo rows
  assert.equal(t.rowsKept + t.rowsDropped + t.rowsExcluded, small.length);
  assert.deepEqual(t.X[2], [46, 18, 190, 3500]);
  assert.equal(small[t.ids[2]].species, 'Chinstrap');
});

test('prepareTask: sex drops unknown sex and respects the chosen features in order', () => {
  const t = prepareTask(small, 'sex', ['body_mass_g', 'bill_depth_mm']);
  assert.deepEqual(t.ids, [0, 1, 2, 3]);
  assert.deepEqual(t.y, [1, 0, 0, 1]);
  assert.deepEqual(t.X[0], [3700, 18]);
  assert.equal(t.positiveLabel, 'male');
  assert.equal(t.rowsDropped, 3);
  assert.equal(t.rowsExcluded, 0);
});

test('prepareTask: a missing value only matters in a column that is used', () => {
  const t = prepareTask(small, 'gentoo-vs-rest', ['bill_length_mm', 'bill_depth_mm']);
  assert.equal(t.rowsKept, 6); // the Gentoo row with NA body mass is kept: body mass is not used
  assert.equal(t.rowsDropped, 1);
  assert.deepEqual(t.y, [0, 0, 0, 1, 1, 0]);
  assert.equal(t.negativeLabel, 'rest');
});

test('prepareTask: unknown task or feature throws', () => {
  assert.throws(() => prepareTask(small, 'island'), RangeError);
  assert.throws(() => prepareTask(small, 'sex', ['island']), RangeError);
});

test('prepareTask on the real penguins table: documented counts', () => {
  const sex = prepareTask(penguins, 'sex');
  assert.equal(sex.rowsKept, 333);
  assert.equal(sex.rowsDropped, 11);
  const ac = prepareTask(penguins, 'adelie-vs-chinstrap');
  assert.equal(ac.rowsExcluded, 124); // Gentoo
  assert.equal(ac.rowsKept + ac.rowsDropped, 220); // 152 Adelie + 68 Chinstrap
  assert.equal(ac.y.reduce((s, v) => s + v, 0), 68);
  const g = prepareTask(penguins, 'gentoo-vs-rest');
  assert.equal(g.rowsKept + g.rowsDropped, 344);
  assert.equal(g.X.length, g.rowsKept);
  assert.ok(g.X.every(r => r.length === FEATURES.length && r.every(Number.isFinite)));
});

test('stratifiedSplit: class shares within one row, deterministic, disjoint and complete', () => {
  const y = [...Array(30).fill(0), ...Array(10).fill(1)];
  const a = stratifiedSplit(y, { testFraction: 0.25, seed: 7 });
  assert.deepEqual(a, stratifiedSplit(y, { testFraction: 0.25, seed: 7 }));
  assert.notDeepEqual(a.test, stratifiedSplit(y, { testFraction: 0.25, seed: 8 }).test);
  const t1 = a.test.filter(i => y[i] === 1).length, t0 = a.test.filter(i => y[i] === 0).length;
  assert.ok(Math.abs(t1 - 10 * 0.25) <= 1 && Math.abs(t0 - 30 * 0.25) <= 1, `${t0}/${t1}`);
  assert.equal(t1, 3); // round(2.5)
  assert.equal(t0, 8); // round(7.5)
  assert.equal(a.train.length + a.test.length, 40);
  assert.equal(new Set([...a.train, ...a.test]).size, 40);
  assert.deepEqual(a.test, [...a.test].sort((p, q) => p - q));
});

test('stratifiedSplit: shares stay within one row on the real task, at several fractions', () => {
  const { y } = prepareTask(penguins, 'adelie-vs-chinstrap');
  for (const f of [0.2, 0.25, 0.3, 0.5]) {
    const { train, test } = stratifiedSplit(y, { testFraction: f, seed: 3 });
    assert.equal(train.length + test.length, y.length);
    for (const c of [0, 1]) {
      const n = y.filter(v => v === c).length;
      assert.ok(Math.abs(test.filter(i => y[i] === c).length - n * f) <= 0.5 + 1e-9);
    }
  }
});

test('stratifiedSplit: tiny classes keep a row on each side; bad fraction throws', () => {
  const y = [0, 0, 0, 0, 1, 1];
  const { train, test } = stratifiedSplit(y, { testFraction: 0.1, seed: 1 });
  assert.equal(test.filter(i => y[i] === 1).length, 1);
  assert.equal(train.filter(i => y[i] === 1).length, 1);
  assert.throws(() => stratifiedSplit(y, { testFraction: 0 }), RangeError);
  assert.throws(() => stratifiedSplit(y, { testFraction: 1 }), RangeError);
});

test('baseline: predicts the majority class; accuracy on a small table is hand-computed', () => {
  const Xtr = [[1], [2], [3], [4], [5]], ytr = [1, 0, 0, 0, 1];
  const m = fitModel('baseline', {}, Xtr, ytr);
  assert.equal(m.predict([9]), 0);
  close(m.proba([9]), 0.4);
  close(m.confidence([9]), 0.6);
  // test table: 3 of 5 rows are class 0, so the baseline is right 3 times out of 5.
  const e = evaluate(m, [[1], [2], [3], [4], [5]], [0, 1, 0, 1, 0]);
  close(e.accuracy, 3 / 5);
  assert.deepEqual(e.confusion, { tp: 0, fp: 0, tn: 3, fn: 2 });
  assert.equal(e.recall, 0);
  assert.equal(e.undefined.precision, true); // never predicts the positive class
  // a tie goes to class 0
  assert.equal(fitModel('baseline', {}, [[1], [2]], [0, 1]).predict([0]), 0);
  assert.equal(fitModel('baseline', {}, [[1], [2], [3]], [1, 1, 0]).predict([0]), 1);
});

// A stand-in model so scoring is checked by hand, independent of any learner.
const stub = (predictions, confidences) => ({
  predict: x => predictions[x[0]],
  confidence: x => confidences[x[0]],
});

test('evaluate: confusion matrix, precision, recall and F1 by hand', () => {
  const y = [1, 1, 1, 0, 0, 0, 0, 1];
  const pred = [1, 1, 0, 1, 0, 0, 0, 0];
  const X = y.map((_, i) => [i]);
  const e = evaluate(stub(pred), X, y);
  assert.deepEqual(e.confusion, { tp: 2, fp: 1, tn: 3, fn: 2 });
  close(e.accuracy, 5 / 8);
  close(e.precision, 2 / 3);
  close(e.recall, 2 / 4);
  close(e.f1, 4 / 7); // 2tp / (2tp + fp + fn) = 4 / 7
  assert.equal(e.n, 8);
  assert.deepEqual(e.undefined, { precision: false, recall: false, f1: false });
  assert.equal(evaluate(stub([]), [], []).accuracy, 0);
});

test('errorList: misclassified rows only, most confident mistake first, with ids and rows', () => {
  const y = [1, 0, 1, 0, 1, 0];
  const pred = [1, 1, 0, 0, 0, 1];
  const conf = [0.9, 0.6, 0.95, 0.8, 0.6, 0.7];
  const X = y.map((_, i) => [i]);
  const ids = [10, 11, 12, 13, 14, 15];
  const rows = Array.from({ length: 16 }, (_, i) => ({ name: `r${i}` }));
  const errs = errorList(stub(pred, conf), X, y, ids, rows);
  assert.deepEqual(errs.map(e => e.index), [2, 5, 1, 4]); // 0.95, 0.7, then the 0.6 tie in X order
  assert.deepEqual(errs.map(e => e.id), [12, 15, 11, 14]);
  assert.deepEqual(errs.map(e => e.type), ['fn', 'fp', 'fp', 'fn']);
  assert.deepEqual(errs[0], { id: 12, index: 2, features: [2], actual: 1, predicted: 0, confidence: 0.95, type: 'fn', row: { name: 'r12' } });
  assert.equal(errorList(stub(pred, conf), X, y)[0].id, 2);
  assert.equal(errorList(stub(pred, conf), X, y)[0].row, null);
  assert.deepEqual(errorList(stub(y, conf), X, y), []);
});

// Two clean clusters along feature 0; feature 1 is large noise in raw units.
const Xc = [[0, 1000], [1, 5000], [0.5, 3000], [10, 2000], [11, 4000], [10.5, 1000]];
const yc = [0, 0, 0, 1, 1, 1];

test('knn: scaling changes who the neighbours are', () => {
  const q = [10, 5000]; // close to the class-1 cluster in feature 0, but far in raw feature 1 from class-1 rows
  const scaled = fitModel('knn', { k: 1, scale: true }, Xc, yc);
  const raw = fitModel('knn', { k: 1, scale: false }, Xc, yc);
  assert.equal(scaled.predict(q), 1);
  assert.equal(raw.predict(q), 0); // raw units: the 5000 row (class 0) is only 9 away, the class-1 rows are 1000+ away
  assert.equal(scaled.params.scale, true);
  assert.equal(raw.params.k, 1);
});

test('knn: proba is the vote share, k is clamped, ties go to the closest neighbour', () => {
  const m = fitModel('knn', { k: 3, scale: false }, [[0], [1], [2], [10]], [0, 0, 1, 1]);
  close(m.proba([1]), 1 / 3); // neighbours 1, 0, 2 -> labels 0, 0, 1
  assert.equal(m.predict([1]), 0);
  close(m.confidence([1]), 2 / 3);
  const big = fitModel('knn', { k: 99, scale: false }, [[0], [1], [2], [10]], [0, 0, 1, 1]);
  assert.equal(big.params.k, 4);
  const tie = fitModel('knn', { k: 2, scale: false }, [[0], [3]], [0, 1]);
  assert.equal(tie.predict([1]), 0); // 1 vote each, the closer point (0) is class 0
  close(tie.proba([1]), 0.5);
});

test('knn: the training mean and std are stored, a constant column maps to 0', () => {
  const m = fitModel('knn', { k: 1, scale: true }, [[0, 7], [10, 7], [20, 7]], [0, 0, 1]);
  assert.equal(m.predict([100, -500]), 1); // column 2 is constant, so it cannot matter
  assert.equal(m.predict([-100, 999]), 0);
});

test('logistic: separates two clusters, proba is monotone and standardization is inside', () => {
  const m = fitModel('logistic', {}, Xc, yc);
  assert.deepEqual(Xc.map(x => m.predict(x)), yc);
  assert.ok(m.proba([11, 3000]) > m.proba([5, 3000]) && m.proba([5, 3000]) > m.proba([0, 3000]));
  assert.ok(m.proba([0, 3000]) >= 0 && m.proba([11, 3000]) <= 1);
  assert.equal(m.describe.raw.weights.length, 2);
  close(m.confidence([0, 3000]), 1 - m.proba([0, 3000]));
  assert.equal(m.predict([100, 3000]), 1);
});

test('tree: a single cut on feature 0 separates the clusters, leaf share is the proba', () => {
  const m = fitTree_(Xc, yc);
  assert.deepEqual(Xc.map(x => m.predict(x)), yc);
  assert.equal(m.proba([0.2, 0]), 0);
  assert.equal(m.proba([10.2, 0]), 1);
  assert.equal(m.describe.tree.feature, 0);
  // a stump on mixed data: leaf 2/3 class 1 on the right of the cut
  const mixed = fitModel('tree', { maxDepth: 1 }, [[1], [2], [3], [10], [11], [12]], [0, 0, 0, 1, 1, 0]);
  close(mixed.proba([11]), 2 / 3);
  assert.equal(mixed.predict([11]), 1);
  close(mixed.confidence([1]), 1);
  // depth 0 is a single leaf: the majority class
  assert.equal(fitModel('tree', { maxDepth: 0 }, Xc, [0, 0, 0, 0, 1, 1]).predict([10]), 0);
  // a training set of one class
  const one = fitModel('tree', {}, [[1], [2]], [0, 0]);
  assert.equal(one.predict([5]), 0);
  assert.equal(one.proba([5]), 0);
});
function fitTree_(X, y) { return fitModel('tree', { maxDepth: 2, minLeaf: 1 }, X, y); }

test('fitModel: registry, defaults and bad input', () => {
  assert.deepEqual(MODEL_KINDS, ['baseline', 'knn', 'logistic', 'tree']);
  assert.deepEqual(Object.keys(MODEL_DEFAULTS), MODEL_KINDS);
  for (const k of MODEL_KINDS) {
    const m = fitModel(k, undefined, Xc, yc);
    assert.equal(m.kind, k);
    assert.ok([0, 1].includes(m.predict([5, 3000])));
    assert.ok(m.confidence([5, 3000]) >= 0.5 - 1e-12 && m.confidence([5, 3000]) <= 1);
  }
  assert.equal(fitModel('tree', undefined, Xc, yc).params.maxDepth, 3);
  assert.throws(() => fitModel('forest', {}, Xc, yc), RangeError);
  assert.throws(() => fitModel('knn', {}, [], []), /non-empty/);
  assert.throws(() => fitModel('knn', {}, Xc, [0, 1]), /same length/);
  assert.throws(() => modelLabel('forest'), RangeError);
});

test('end to end on the real penguins: models beat the baseline on Gentoo and Chinstrap, errors are sorted', () => {
  for (const key of ['gentoo-vs-rest', 'adelie-vs-chinstrap']) {
    const t = prepareTask(penguins, key);
    const { train, test: te } = stratifiedSplit(t.y, { testFraction: 0.25, seed: 11 });
    const pick = idx => ({ X: idx.map(i => t.X[i]), y: idx.map(i => t.y[i]), ids: idx.map(i => t.ids[i]) });
    const tr_ = pick(train), ts = pick(te);
    const base = evaluate(fitModel('baseline', {}, tr_.X, tr_.y), ts.X, ts.y);
    for (const kind of ['knn', 'logistic', 'tree']) {
      const m = fitModel(kind, {}, tr_.X, tr_.y);
      const e = evaluate(m, ts.X, ts.y);
      assert.ok(e.accuracy > base.accuracy, `${key} ${kind}: ${e.accuracy} vs baseline ${base.accuracy}`);
      const errs = errorList(m, ts.X, ts.y, ts.ids, penguins);
      assert.equal(errs.length, e.confusion.fp + e.confusion.fn);
      for (let i = 1; i < errs.length; i++) assert.ok(errs[i - 1].confidence >= errs[i].confidence);
      for (const er of errs) assert.equal(er.row, penguins[er.id]);
    }
  }
});

test('sex is the hard task: nobody gets near perfect, but body mass and bill depth help', () => {
  const t = prepareTask(penguins, 'sex');
  const { train, test: te } = stratifiedSplit(t.y, { testFraction: 0.3, seed: 5 });
  const X = idx => idx.map(i => t.X[i]), Y = idx => idx.map(i => t.y[i]);
  const e = evaluate(fitModel('logistic', {}, X(train), Y(train)), X(te), Y(te));
  assert.ok(e.accuracy > 0.6 && e.accuracy < 0.95, `${e.accuracy}`);
});
