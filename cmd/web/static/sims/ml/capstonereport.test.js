import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from './tabular.js';
import { setLocale } from '../../i18n.js';
import { prepareTask, stratifiedSplit, fitModel, evaluate, FEATURES } from './capstone.js';
import {
  emptyState, sanitizeState, emptyModel, modelParams, sameModel, selectColumns, describeModel, metricValue, metricUndefined,
  pickBetter, compareToBaseline, gapClass, baselineSentence, gapSentence, betterSentence, metricWarning, mistakeMeaning,
  inspectList, validMarks, pruneMarks, stepDone, buildSummary, levelText, reasonLabel, REASONS, CRITERIA, METRICS,
} from './capstonereport.js';

// setLocale touches document and window; stand them in for node.
globalThis.document = { documentElement: {} };
globalThis.window = new EventTarget();

const penguins = parseCsv(readFileSync(new URL('../../data/penguins.csv', import.meta.url), 'utf8')).rows;
const ev = (accuracy, recall, f1, n = 50) => ({ n, accuracy, recall, f1, undefined: { precision: false, recall: false, f1: false } });
const stateWith = patch => ({ ...emptyState(), ...patch });

test('sanitizeState: garbage in, a valid state out', () => {
  assert.deepEqual(sanitizeState('nope'), emptyState());
  assert.deepEqual(sanitizeState(null), emptyState());
  assert.deepEqual(sanitizeState([1, 2]), emptyState());
  const s = sanitizeState({
    task: 'sex', metric: 'accuracy', seed: 7.6, baselineRun: 'yes',
    a: { kind: 'logistic', k: 99, scale: 'x', maxDepth: 0, minLeaf: 50, features: ['body_mass_g', 'nope', 'bill_length_mm'], run: true },
    b: { kind: 'svm', features: [] },
    marks: { 12: { reason: 'overlap', note: 'x'.repeat(500) }, 'abc': { reason: 'overlap', note: 'no' }, 40: { reason: 'bogus', note: 'ok' } },
    order: [12, 40, 12, 99, 5],
    text: { problem: 5, why: 'because', next: 'y'.repeat(900) },
    rubric: { framing: 3, baseline: 9, comparison: -1, errors: 'a' }, open: 99,
  });
  assert.equal(s.task, 'sex'); assert.equal(s.metric, 'accuracy'); assert.equal(s.seed, 8);
  assert.equal(s.baselineRun, false);
  assert.equal(s.a.kind, 'logistic'); assert.equal(s.a.k, 25); assert.equal(s.a.scale, true);
  assert.equal(s.a.maxDepth, 1); assert.equal(s.a.minLeaf, 20); assert.equal(s.a.run, true);
  assert.deepEqual(s.a.features, ['bill_length_mm', 'body_mass_g'], 'kept in FEATURES order, unknown dropped');
  assert.equal(s.b.kind, 'tree', 'an unknown kind falls back to the default');
  assert.deepEqual(s.b.features, FEATURES, 'no feature left means all of them');
  assert.deepEqual(s.order, [12, 40]); // 99 and 5 have no mark; 12 once
  assert.equal(s.marks[12].note.length, 160);
  assert.equal(s.marks[40].reason, '');
  assert.ok(!('abc' in s.marks));
  assert.equal(s.text.problem, ''); assert.equal(s.text.next.length, 400);
  assert.deepEqual(s.rubric, { framing: 3, baseline: 3, comparison: 0, errors: 0 });
  assert.equal(s.open, 5);
  assert.deepEqual(sanitizeState(JSON.parse(JSON.stringify(s))), s, 'sanitizing twice changes nothing');
});

test('models: params per kind, same-model test, column subsets, descriptions', () => {
  const a = emptyModel('knn');
  assert.deepEqual(modelParams(a), { k: 5, scale: true });
  assert.deepEqual(modelParams(emptyModel('tree')), { maxDepth: 3, minLeaf: 1 });
  assert.deepEqual(modelParams(emptyModel('logistic')), {});
  assert.ok(sameModel(a, { ...a, maxDepth: 6 }), 'an unused parameter does not make a different model');
  assert.ok(!sameModel(a, { ...a, k: 7 }));
  assert.ok(!sameModel(a, { ...a, features: ['bill_length_mm'] }));
  assert.deepEqual(selectColumns([[1, 2, 3, 4], [5, 6, 7, 8]], ['bill_depth_mm', 'body_mass_g']), [[2, 4], [6, 8]]);
  try {
    setLocale('en');
    assert.equal(describeModel(a), 'k-nearest neighbors (k = 5, features scaled)');
    assert.equal(describeModel(emptyModel('tree')), 'Decision tree (max depth 3, min leaf 1)');
    assert.equal(describeModel(emptyModel('logistic')), 'Logistic regression');
    assert.equal(describeModel(emptyModel('tree'), true), 'Decision tree, max depth 3, min leaf 1', 'inline form has no parentheses');
    setLocale('id');
    assert.equal(describeModel({ ...a, scale: false }), 'k tetangga terdekat (k = 5, tanpa scaling)');
  } finally { setLocale('en'); }
});

test('pickBetter: higher test score wins, ties go to accuracy then to A', () => {
  assert.equal(pickBetter(ev(0.9, 0.8, 0.85), ev(0.8, 0.9, 0.85), 'recall'), 'b');
  assert.equal(pickBetter(ev(0.9, 0.8, 0.85), ev(0.8, 0.9, 0.85), 'accuracy'), 'a');
  assert.equal(pickBetter(ev(0.8, 0.9, 0.85), ev(0.9, 0.9, 0.80), 'recall'), 'b', 'recall tie -> accuracy');
  assert.equal(pickBetter(ev(0.9, 0.9, 0.9), ev(0.9, 0.9, 0.9), 'f1'), 'a', 'full tie -> A');
  assert.equal(metricValue(ev(0.5, 0.6, 0.7), 'f1'), 0.7);
  assert.throws(() => metricValue(ev(1, 1, 1), 'auc'), RangeError);
  assert.ok(metricUndefined({ n: 3, undefined: { recall: true } }, 'recall'));
  assert.ok(!metricUndefined({ n: 3, undefined: { recall: true } }, 'f1'));
});

test('compareToBaseline: more than one point is a win, within one point is a tie', () => {
  assert.equal(compareToBaseline(0.9, 0.69), 'beats');
  assert.equal(compareToBaseline(0.70, 0.69), 'ties');
  assert.equal(compareToBaseline(0.69, 0.70), 'ties');
  assert.equal(compareToBaseline(0.60, 0.69), 'worse');
  assert.equal(compareToBaseline(0.7001, 0.69), 'beats');
  assert.equal(compareToBaseline(0, 1), 'worse');
});

test('gapClass: train minus test, thresholds at 4 and 10 points', () => {
  assert.equal(gapClass(1, 0.85), 'large');
  assert.equal(gapClass(1, 0.9), 'large');
  assert.equal(gapClass(0.95, 0.89), 'moderate');
  assert.equal(gapClass(0.95, 0.93), 'small');
  assert.equal(gapClass(0.88, 0.95), 'reversed');
  assert.equal(gapClass(0.9, 0.93), 'small');
});

test('sentences carry the numbers and follow the language', () => {
  try {
    setLocale('en');
    assert.equal(baselineSentence('Model A', 'recall', 0.9412, 0), 'Model A beats the baseline on recall: 94.1% against 0.0% on the test rows.');
    assert.match(baselineSentence('Model B', 'accuracy', 0.69, 0.69), /does not beat the baseline/);
    assert.match(baselineSentence('Model B', 'accuracy', 0.5, 0.69), /does worse than the baseline/);
    assert.match(gapSentence('Model A', 'accuracy', 1, 0.85), /gap of 15\.0 points.*large gap/);
    assert.match(gapSentence('Model A', 'accuracy', 0.959, 0.997), /test score is 3\.8 points higher than the training score/);
    assert.match(gapSentence('Model A', 'accuracy', 0.97, 0.95), /a small gap \(2\.0 points\)/);
    assert.match(betterSentence('A', 'B', 'f1', 0.9, 0.9, 'a', 55), /level on F1.*about 1\.8 points of accuracy/);
    assert.match(betterSentence('A', 'B', 'f1', 0.8, 0.9, 'b', 55), /^B is better on F1: 90\.0% against 80\.0%, 10\.0 points ahead/);
    setLocale('id');
    assert.match(baselineSentence('Model A', 'recall', 0.5, 0), /^Model A mengalahkan baseline pada recall: 50,0% dibanding 0,0%/);
  } finally { setLocale('en'); }
});

test('metric warnings read the class balance', () => {
  try {
    setLocale('en');
    const balance = { pos: 68, neg: 151, posName: 'Chinstrap', negName: 'Adelie' };
    assert.match(metricWarning('accuracy', balance), /always answers "Adelie" already scores 69% accuracy/);
    assert.equal(metricWarning('accuracy', { pos: 168, neg: 165, posName: 'male', negName: 'female' }), null, 'balanced: no warning');
    assert.match(metricWarning('recall', balance), /always answers "Chinstrap" gets a recall of 100%/);
    assert.equal(metricWarning('f1', balance), null);
    assert.equal(metricWarning('recall', { pos: 0, neg: 0, posName: 'a', negName: 'b' }), null);
    for (const k of ['adelie-vs-chinstrap', 'sex', 'gentoo-vs-rest']) assert.ok(mistakeMeaning(k).cost.length > 20);
    assert.throws(() => mistakeMeaning('nope'), RangeError);
  } finally { setLocale('en'); }
});

test('every reason, criterion and level has text in both languages', () => {
  for (const lang of ['en', 'id']) {
    setLocale(lang);
    for (const r of REASONS) assert.ok(reasonLabel(r), `${lang} ${r}`);
    for (const c of CRITERIA) for (const l of [1, 2, 3]) assert.ok(levelText(c, l).length > 20, `${lang} ${c} ${l}`);
  }
  setLocale('en');
  assert.deepEqual(METRICS, ['accuracy', 'recall', 'f1']);
});

test('inspectList: real mistakes first; with fewer than 3, the closest correct calls fill in', () => {
  // A one-feature world. Train: negatives at 0,1,2 and positives at 8,9,10. A rule "x >= 5" is the model.
  const Xtrain = [[0], [1], [2], [8], [9], [10]], ytrain = [0, 0, 0, 1, 1, 1];
  const model = { predict: x => (x[0] >= 5 ? 1 : 0), confidence: x => (x[0] >= 5 ? 0.8 : 0.9) };
  // Test: 4.9 (really positive: a mistake), 3 (negative, close to the boundary), 0 (negative, far), 7 (positive), 12 (positive, far).
  const Xtest = [[4.9], [3], [0], [7], [12]], ytest = [1, 0, 0, 1, 1];
  const list = inspectList(model, Xtrain, ytrain, Xtest, ytest, [10, 11, 12, 13, 14]);
  assert.equal(list[0].kind, 'error');
  assert.equal(list[0].id, 10); assert.equal(list[0].actual, 1); assert.equal(list[0].predicted, 0); assert.equal(list[0].type, 'fn');
  const close = list.filter(e => e.kind === 'close');
  assert.equal(list.length, 1 + 4, 'one mistake and the four correct rows (fewer than the five asked for)');
  // Margin = distance to the nearest opposite-class training row minus distance to the nearest same-class one
  // (all scaled by the same standard deviation, so the order is the raw one): x=3 -> 8-3 minus 3-2 = 4; x=7 -> 4;
  // x=0 -> 8-0 minus 0 = 8 ... 8; x=12 -> 12-2 minus 2 = 8. Ties keep test order.
  assert.deepEqual(close.map(e => e.id), [11, 13, 12, 14], 'nearest the boundary first');
  assert.ok(close.every(e => e.actual === e.predicted));

  // With 3 or more mistakes there is no padding.
  const bad = { predict: () => 1, confidence: () => 0.6 };
  const many = inspectList(bad, Xtrain, ytrain, Xtest, ytest);
  assert.equal(many.length, 5);   // two negatives are wrong (fewer than 3), so the 3 correct rows are added after them
  assert.equal(many.filter(e => e.kind === 'error').length, 2);
  const worst = { predict: () => 0, confidence: () => 0.6 };
  const three = inspectList(worst, Xtrain, ytrain, Xtest, ytest);
  assert.equal(three.length, 3); assert.ok(three.every(e => e.kind === 'error'));
});

test('inspectList on the real penguins: always enough rows to mark three', () => {
  const p = prepareTask(penguins, 'gentoo-vs-rest');
  const { train, test } = stratifiedSplit(p.y, { seed: 1 });
  const pick = (idx, a) => idx.map(i => a[i]);
  const model = fitModel('tree', {}, pick(train, p.X), pick(train, p.y));
  const list = inspectList(model, pick(train, p.X), pick(train, p.y), pick(test, p.X), pick(test, p.y), pick(test, p.ids), penguins);
  assert.ok(list.length >= 3);
  assert.ok(list.every(e => e.row && e.row.species));
  assert.equal(new Set(list.map(e => e.id)).size, list.length, 'no row twice');
});

test('marks: only a reason AND a note count, and marks of rows that left the list are pruned', () => {
  const s = stateWith({
    order: [4, 9, 2],
    marks: { 4: { reason: 'overlap', note: 'both close' }, 9: { reason: '', note: 'no reason' }, 2: { reason: 'label', note: '   ' } },
  });
  assert.deepEqual(validMarks(s, [4, 9, 2, 7]), [4]);
  assert.deepEqual(validMarks(s, [9, 2]), [], 'row 4 is not a candidate any more');
  const { state, removed } = pruneMarks(s, [4, 2]);
  assert.equal(removed, 1); assert.deepEqual(state.order, [4, 2]); assert.ok(!(9 in state.marks));
  assert.deepEqual(s.order, [4, 9, 2], 'the input is not changed');
});

test('stepDone: each step ticks only when its work is really done', () => {
  const base = emptyState();
  assert.deepEqual(stepDone(base), [false, false, false, false, false, false]);
  const s1 = { ...base, task: 'sex' };
  assert.equal(stepDone(s1)[0], false, 'task without a metric is not done');
  const s2 = { ...s1, metric: 'accuracy', baselineRun: true, a: { ...base.a, run: true } };
  assert.deepEqual(stepDone(s2).slice(0, 4), [true, true, true, false]);
  const sameB = { ...s2, b: { ...s2.a, run: true } };
  assert.equal(stepDone(sameB)[3], false, 'model B equal to model A is not a comparison');
  const s4 = { ...s2, b: { ...base.b, run: true } };
  assert.equal(stepDone(s4)[3], true);
  assert.equal(stepDone({ ...s4, b: { ...base.b, run: false } })[3], false, 'not evaluated yet');
  const ids = [3, 5, 8, 13];
  const marked = { ...s4, order: [3, 5, 8], marks: { 3: { reason: 'overlap', note: 'a' }, 5: { reason: 'label', note: 'b' }, 8: { reason: 'simple', note: '' } } };
  assert.equal(stepDone(marked, { candidateIds: ids })[4], false, 'the third mark has no note');
  marked.marks[8].note = 'c';
  assert.equal(stepDone(marked, { candidateIds: ids })[4], true);
  assert.equal(stepDone(marked, { candidateIds: [3, 5, 9, 13] })[4], false, 'row 8 is not a candidate any more');
  const two = { ...s4, order: [3, 5], marks: { 3: { reason: 'overlap', note: 'a' }, 5: { reason: 'label', note: 'b' } } };
  assert.equal(stepDone(two, { candidateIds: [3, 5] })[4], true, 'only two rows exist to mark: two are enough');
  const t6 = { ...marked, text: { problem: 'p', why: 'w', next: ' ' }, rubric: { framing: 1, baseline: 2, comparison: 3, errors: 3 } };
  assert.equal(stepDone(t6, { candidateIds: ids })[5], false, 'a blank text field');
  t6.text.next = 'n';
  assert.equal(stepDone(t6, { candidateIds: ids })[5], true);
  t6.rubric.errors = 0;
  assert.equal(stepDone(t6, { candidateIds: ids })[5], false, 'an unrated criterion');
});

test('buildSummary: assembles choices, scores, mistakes, texts and ratings', () => {
  const p = prepareTask(penguins, 'adelie-vs-chinstrap');
  const { train, test } = stratifiedSplit(p.y, { seed: 1 });
  const pick = (idx, a) => idx.map(i => a[i]);
  const model = fitModel('knn', {}, pick(train, p.X), pick(train, p.y));
  const e = evaluate(model, pick(test, p.X), pick(test, p.y));
  assert.equal(e.n, 55);
  const scores = x => ({ accuracy: x.accuracy, recall: x.recall, f1: x.f1 });
  const input = {
    taskLabel: 'Adelie or Chinstrap', question: 'Is this penguin a Chinstrap (rather than an Adelie)?',
    rows: { total: 344, kept: 219, dropped: 1, excluded: 124 },
    balance: { pos: 68, neg: 151, posName: 'Chinstrap', negName: 'Adelie' },
    metric: 'recall', metricWhy: 'Missing a Chinstrap is the costly mistake.',
    split: { seed: 1, train: 164, test: 55 },
    results: [{ name: 'Baseline', desc: '', train: scores(e), test: { accuracy: 0.69, recall: 0, f1: 0 } }, { name: 'k-NN', desc: 'k = 5', train: scores(e), test: scores(e) }],
    sentences: ['Model A beats the baseline.'],
    mistakes: [{ id: 41, truth: 'Chinstrap', guess: 'Adelie', confidence: 0.8, kind: 'error', reason: 'overlap', note: 'Looks like an Adelie' }],
    text: { problem: 'Find Chinstraps.', why: '', next: 'Try a deeper tree.' },
    rubric: CRITERIA.map((c, i) => ({ criterion: c, level: i })),
  };
  try {
    setLocale('en');
    const text = buildSummary(input);
    assert.match(text, /^CAPSTONE SUMMARY/);
    assert.match(text, /Task: Adelie or Chinstrap \(Is this penguin a Chinstrap/);
    assert.match(text, /344 penguins in the file; 219 used, 1 left out for a missing value \(NA\), 124 not part of this task/);
    assert.match(text, /Chinstrap 68 \(31%\), Adelie 151 \(69%\)/);
    assert.match(text, /Metric I judge by: Recall of the positive class\. Missing a Chinstrap/);
    assert.match(text, /- k-NN \[k = 5\]: accuracy 98\.2%, recall 94\.1%, F1 97\.0%/);
    assert.match(text, /1\. row #42: really Chinstrap, predicted Adelie, confidence 80%\. Reason: Classes overlap\. Note: Looks like an Adelie/);
    assert.match(text, /Why I picked this model: \(not written yet\)/);
    assert.match(text, /- Framing: \(not rated yet\)/);
    assert.match(text, /- Baseline: Not yet \(1\/3\)\. I ran the baseline/);
    assert.match(text, /- Error analysis: Yes \(3\/3\)/);
    setLocale('id');
    const id = buildSummary({ ...input, text: { problem: 'a', why: 'b', next: 'c' } });
    assert.match(id, /^RINGKASAN CAPSTONE/);
    assert.match(id, /Chinstrap 68 \(31%\)/);
    assert.match(id, /Alasan: Kelas saling tumpang tindih/);
    assert.match(id, /Penilaian diri/);
    assert.ok(!/Why I picked/.test(id), 'no English label left in the Indonesian summary');
    assert.equal(buildSummary({ ...input, mistakes: [] }).includes('(belum ada yang ditandai)'), true);
  } finally { setLocale('en'); }
});
