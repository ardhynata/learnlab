import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTransactions, auc, split as splitRows } from './capstone2.js';
import {
  SPLIT_KEYS, MODEL_KEYS, GRIDS, TIE, DATA_SEEDS, SPLIT_SEED, TEST_FRACTION, datasetFacts, compareSplits, optimismGap, tuneModel, fitHeldOut, scoreModels,
  differenceInterval, atThreshold, costCurve, thresholdMax,
} from './capstone2lab.js';

const rows1 = makeTransactions({ seed: 1 });
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('datasetFacts: the class balance and what never flagging achieves', () => {
  const small = [{ label: 0, customer: 0, day: 0 }, { label: 1, customer: 0, day: 4 }, { label: 0, customer: 1, day: 2 }, { label: 0, customer: 1, day: 1 }];
  assert.deepEqual(datasetFacts(small), { rows: 4, customers: 2, days: 5, frauds: 1, legit: 3, rate: 0.25, accuracyNever: 0.75 });
  const f = datasetFacts(rows1);
  assert.equal(f.rows, 1200);
  assert.equal(f.customers, 60);
  assert.equal(f.frauds + f.legit, f.rows);
  close(f.accuracyNever, 1 - f.rate);
  assert.ok(f.rate > 0.02 && f.rate < 0.2, 'fraud is rare');
});

test('compareSplits: a random split keeps customers on both sides and looks better than a grouped one', () => {
  for (const seed of [1, 2]) {
    const rows = makeTransactions({ seed });
    const cmp = compareSplits(rows, { seeds: [1, 2] });
    assert.deepEqual(Object.keys(cmp), SPLIT_KEYS);
    assert.equal(cmp.grouped.sharedShare, 0, 'a grouped split never shares a customer');
    assert.ok(cmp.random.sharedShare > 0.9, 'random: almost every test row has its customer in training');
    assert.ok(cmp.temporal.sharedShare > 0.9, 'temporal removes the future, not the customers');
    assert.ok(cmp.temporal.lastTrainDay <= cmp.temporal.firstTestDay);
    assert.equal(cmp.random.runs.length, 2);
    assert.equal(cmp.temporal.runs.length, 1);
    assert.ok(cmp.random.lo <= cmp.random.auc && cmp.random.auc <= cmp.random.hi);
    assert.ok(optimismGap(cmp, 'random', 'grouped') > 0.03, `seed ${seed}: ${cmp.random.auc} vs ${cmp.grouped.auc}`);
    close(optimismGap(cmp, 'grouped', 'random'), -optimismGap(cmp, 'random', 'grouped'));
  }
});

test('compareSplits: the same rows give the same answer', () => {
  const a = compareSplits(rows1, { seeds: [1] }), b = compareSplits(rows1, { seeds: [1] });
  assert.deepEqual(a, b);
});

test('tuneModel: one score per grid value, on the training part, and the best is one of the values', () => {
  const { train } = splitRows('grouped', rows1, { testFraction: 0.25, seed: 1 });
  for (const model of ['logistic', 'forest']) {
    const t = tuneModel(rows1, { how: 'grouped', model, train });
    assert.equal(t.setting, GRIDS[model].setting);
    assert.deepEqual(t.values, GRIDS[model].values);
    assert.equal(t.results.length, GRIDS[model].values.length);
    assert.ok(GRIDS[model].values.includes(t.best));
    for (const r of t.results) { assert.ok(r.mean >= 0 && r.mean <= 1 && r.sd >= 0 && r.scores.length >= 1); }
    const top = Math.max(...t.results.map(r => r.mean));
    assert.ok(t.results.find(r => r.value === t.best).mean >= top - TIE - 1e-12, 'the best is within the tie band of the top score');
    assert.ok(t.spread >= 0);
  }
  assert.throws(() => tuneModel(rows1, { how: 'grouped', model: 'baseline', train }), RangeError);
});

test('tuneModel: validation folds that follow the split change the answer (random folds reward a deep forest)', () => {
  const pick = how => {
    const { train } = splitRows(how, rows1, { testFraction: 0.25, seed: 1 });
    return tuneModel(rows1, { how, model: 'forest', train }).best;
  };
  assert.ok(pick('random') > pick('grouped'), 'random folds let a deep forest memorise customers; grouped folds do not');
});

test('tuneModel: values within the tie band go to the first of the grid (the weakest penalty)', () => {
  const { train } = splitRows('random', rows1, { testFraction: 0.25, seed: 1 });
  const t = tuneModel(rows1, { how: 'random', model: 'logistic', train });
  assert.ok(t.spread < 0.02, 'the penalty hardly matters for AUC here');
  const tied = t.results.filter(r => r.mean >= Math.max(...t.results.map(x => x.mean)) - TIE);
  assert.equal(t.best, tied[0].value, 'logistic: the weakest penalty among the ties');
  assert.equal(t.best, 0, 'on these rows every penalty ties, so the weakest wins');
});

test('fitHeldOut: train and test do not overlap, one score per held-out row, the baseline is constant', () => {
  const held = fitHeldOut(rows1, { how: 'grouped', picks: { logistic: 1, forest: 3 } });
  const set = new Set(held.train);
  assert.ok(held.test.every(i => !set.has(i)));
  assert.equal(held.labels.length, held.test.length);
  assert.deepEqual(held.labels, held.test.map(i => rows1[i].label));
  for (const m of MODEL_KEYS) assert.equal(held.probas[m].length, held.test.length);
  assert.equal(new Set(held.probas.baseline).size, 1);
  assert.ok(held.probas.forest.every(p => p >= 0 && p <= 1) && held.probas.logistic.every(p => p >= 0 && p <= 1));
  const customersTest = new Set(held.test.map(i => rows1[i].customer));
  assert.ok(held.train.every(i => !customersTest.has(rows1[i].customer)), 'grouped: no customer on both sides');
  assert.deepEqual(held, fitHeldOut(rows1, { how: 'grouped', picks: { logistic: 1, forest: 3 } }), 'reproducible');
});

test('scoreModels: intervals around each estimate, baseline at 0.5, same resamples for every model', () => {
  const held = fitHeldOut(rows1, { how: 'temporal', picks: { logistic: 0.1, forest: 5 } });
  const s = scoreModels(held.labels, held.probas, { fpCost: 2, fnCost: 40, B: 100 });
  assert.deepEqual(Object.keys(s), MODEL_KEYS);
  close(s.baseline.auc.estimate, 0.5);
  for (const m of MODEL_KEYS) {
    for (const k of ['auc', 'ap', 'cost']) {
      const iv = s[m][k];
      assert.ok(iv.lo <= iv.hi && iv.used > 0 && iv.values === undefined);
    }
    assert.ok(s[m].auc.lo <= s[m].auc.estimate + 0.1 && s[m].auc.estimate <= s[m].auc.hi + 0.1);
    close(s[m].evaluation.expectedCost, s[m].cost.estimate);
  }
  assert.ok(s.forest.auc.estimate > 0.6 && s.forest.auc.lo > 0.5, 'a real signal');
  assert.deepEqual(s, scoreModels(held.labels, held.probas, { fpCost: 2, fnCost: 40, B: 100 }));
});

test('differenceInterval: zero for the same scores, positive for a better scorer, paired on the same resamples', () => {
  const labels = Array.from({ length: 200 }, (_, i) => (i % 5 === 0 ? 1 : 0));
  const good = labels.map((l, i) => (l ? 0.6 + 0.3 * ((i * 7) % 10) / 10 : 0.1 + 0.4 * ((i * 3) % 10) / 10));
  const flat = labels.map(() => 0.3);
  const same = differenceInterval((l, p) => auc(p, l), labels, good, good, { B: 50 });
  assert.deepEqual([same.estimate, same.lo, same.hi], [0, 0, 0]);
  const d = differenceInterval((l, p) => auc(p, l), labels, good, flat, { B: 100 });
  assert.ok(d.estimate > 0.3 && d.lo > 0, JSON.stringify(d));
  assert.deepEqual(d, differenceInterval((l, p) => auc(p, l), labels, good, flat, { B: 100 }));
});

test('atThreshold: counts, precision, recall and the cost at any threshold', () => {
  const probas = [0.9, 0.8, 0.3, 0.2, 0.1, 0.05];
  const labels = [1, 0, 1, 0, 0, 1];
  const r = atThreshold(probas, labels, 0.25, { fpCost: 2, fnCost: 10 });
  assert.deepEqual(r.confusion, { tp: 2, fp: 1, tn: 2, fn: 1 });
  assert.equal(r.flagged, 3);
  close(r.precision, 2 / 3); close(r.recall, 2 / 3);
  assert.equal(r.totalCost, 12);
  close(r.expectedCost, 2);
  assert.equal(atThreshold(probas, labels, 0.99, { fpCost: 2, fnCost: 10 }).flagged, 0);
});

test('costCurve and thresholdMax: the axis covers the scores and the cost threshold', () => {
  const probas = [0.9, 0.8, 0.3, 0.2, 0.1, 0.05], labels = [1, 0, 1, 0, 0, 1];
  assert.equal(thresholdMax(probas, 0.05), 0.9);
  assert.equal(thresholdMax([0.01, 0.02], 0.04), 0.1);
  assert.equal(thresholdMax([0.2], 0.95), 1);
  const curve = costCurve(probas, labels, { fpCost: 2, fnCost: 10, xMax: 0.5, step: 0.05 });
  assert.equal(curve.length, 10);
  close(curve[0].t, 0.05);
  assert.ok(curve.every(p => Number.isFinite(p.cost)));
  close(curve.find(p => Math.abs(p.t - 0.25) < 1e-9).cost, atThreshold(probas, labels, 0.25, { fpCost: 2, fnCost: 10 }).expectedCost);
});

test('DATA_SEEDS: every dataset on offer has enough fraud, in the whole data and in the held-out rows of every split', () => {
  assert.equal(DATA_SEEDS.length, 24);
  assert.equal(new Set(DATA_SEEDS).size, 24);
  for (const seed of DATA_SEEDS) {
    const rows = makeTransactions({ seed });
    assert.ok(datasetFacts(rows).frauds >= 50, `seed ${seed}`);
    for (const how of SPLIT_KEYS) {
      const { test: te } = splitRows(how, rows, { testFraction: TEST_FRACTION, seed: SPLIT_SEED });
      assert.ok(te.filter(i => rows[i].label === 1).length >= 8, `seed ${seed} ${how}`);
    }
  }
});
