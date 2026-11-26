import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCsv } from './tabular.js';
import {
  makeNoiseTable, featureCorrelations, selectTopK, runPipelines, repeatSplits,
  fitMedianImputer, fitPreprocessing, tableToXY, runPreprocessing, repeatPreprocessing,
} from './leakage.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

// Hand-computed: y = [0,0,1,1]; column deviations times y deviations (-.5,-.5,.5,.5).
//   f0 = [1,2,3,4]  r = 2 / sqrt(5 * 1)    = 0.8944
//   f1 = [1,2,1,2]  r = 0
//   f2 = [0,1,1,1]  r = .5 / sqrt(.75 * 1) = 0.5774
//   f3 = [5,4,1,0]  r = -4 / sqrt(17 * 1)  = -0.9701
const tinyX = [[1, 1, 0, 5], [2, 2, 1, 4], [3, 1, 1, 1], [4, 2, 1, 0]];
const tinyY = [0, 0, 1, 1];

test('featureCorrelations matches hand-computed Pearson values', () => {
  const r = featureCorrelations(tinyX, tinyY);
  close(r[0], 2 / Math.sqrt(5));
  close(r[1], 0);
  close(r[2], 0.5 / Math.sqrt(0.75));
  close(r[3], -4 / Math.sqrt(17));
});

test('selectTopK ranks by absolute correlation, strongest first, and breaks ties by lower index', () => {
  assert.deepEqual(selectTopK(tinyX, tinyY, 2), [3, 0]);
  assert.deepEqual(selectTopK(tinyX, tinyY, 4), [3, 0, 2, 1]);
  assert.deepEqual(selectTopK(tinyX, tinyY, 99), [3, 0, 2, 1]);
  assert.deepEqual(selectTopK(tinyX, tinyY, 0), []);
  // A column that is the negation of f0 has the same |r|: the lower index (0) comes first.
  const tied = tinyX.map(r => [...r, -r[0]]);
  assert.deepEqual(selectTopK(tied, tinyY, 3), [3, 0, 4]);
  // A constant column has correlation 0 and is never chosen over a correlated one.
  assert.deepEqual(selectTopK([[7, 1], [7, 2], [7, 3], [7, 4]], tinyY, 1), [1]);
});

test('makeNoiseTable is reproducible, balanced, and places signal only in the informative columns', () => {
  const a = makeNoiseTable({ n: 40, p: 30, seed: 5 }), b = makeNoiseTable({ n: 40, p: 30, seed: 5 });
  assert.deepEqual(a, b);
  assert.equal(a.X.length, 40);
  assert.equal(a.X[0].length, 30);
  assert.equal(a.y.filter(v => v === 1).length, 20);
  assert.deepEqual(a.informative, []);
  const s = makeNoiseTable({ n: 200, p: 50, signal: 3, informative: 4, seed: 5 });
  assert.equal(s.informative.length, 4);
  const r = featureCorrelations(s.X, s.y).map(Math.abs);
  for (const j of s.informative) assert.ok(r[j] > 0.5, `informative column ${j} has |r| ${r[j]}`);
  assert.deepEqual([...selectTopK(s.X, s.y, 4)].sort((x, y) => x - y), s.informative);
});

test('runPipelines: one split, test rows disjoint from training rows, correct selection ignores the test rows', () => {
  const t = makeNoiseTable({ n: 60, p: 100, seed: 3 });
  const r = runPipelines({ X: t.X, y: t.y, k: 5, seed: 2 });
  assert.equal(new Set([...r.split.train, ...r.split.test]).size, 60);
  assert.deepEqual(r.correct.selected, selectTopK(r.split.train.map(i => t.X[i]), r.split.train.map(i => t.y[i]), 5));
  assert.deepEqual(r.leaky.selected, selectTopK(t.X, t.y, 5));
  assert.deepEqual(r, runPipelines({ X: t.X, y: t.y, k: 5, seed: 2 }));
  assert.throws(() => runPipelines({ X: t.X, y: t.y, model: 'svm' }), /unknown model/);
});

for (const model of ['logistic', 'knn']) {
  test(`with random labels the leaky ${model} pipeline scores clearly above chance and the correct one stays near 0.5`, () => {
    for (const seed of [3, 4, 5]) {
      const t = makeNoiseTable({ n: 60, p: 500, seed });
      const r = repeatSplits({ X: t.X, y: t.y, k: 10, seed: 1, model, times: 20 });
      assert.equal(r.leaky.length, 20);
      assert.equal(r.correct.length, 20);
      assert.ok(r.leakyMean > 0.65, `${model} seed ${seed}: leaky mean ${r.leakyMean}`);
      assert.ok(r.correctMean > 0.35 && r.correctMean < 0.62, `${model} seed ${seed}: correct mean ${r.correctMean}`);
      assert.ok(r.leakyMean - r.correctMean > 0.15, `${model} seed ${seed}: gap ${r.leakyMean - r.correctMean}`);
    }
  });
}

test('with a genuine signal the correct pipeline finds it too, so the leak is not the only way to score well', () => {
  const t = makeNoiseTable({ n: 100, p: 100, signal: 3, informative: 3, seed: 6 });
  const r = repeatSplits({ X: t.X, y: t.y, k: 3, seed: 1, times: 10 });
  assert.ok(r.correctMean > 0.8, `correct mean ${r.correctMean}`);
  assert.ok(r.leakyMean > 0.8, `leaky mean ${r.leakyMean}`);
});

// ---------- preprocessing statistics ----------

test('fitMedianImputer: odd, even, missing and empty columns', () => {
  assert.equal(fitMedianImputer([5, 1, 3]).median, 3);
  assert.equal(fitMedianImputer([1, null, 10, 3, NaN, 5]).median, 4);
  assert.deepEqual(fitMedianImputer([1, null, 3]).apply([null, 7, undefined]), [2, 7, 2]);
  assert.equal(fitMedianImputer([null, null]).median, 0);
});

// Column [1, null, 3, 10, null, 5].
//   All rows: present 1,3,5,10 -> median 4; filled [1,4,3,10,4,5]: mean 27/6 = 4.5, variance 45.5/6.
//   Rows 0,1,2 only: present 1,3 -> median 2; filled [1,2,3]: mean 2, variance 2/3.
const prepX = [[1, 0], [null, 0], [3, 0], [10, 0], [null, 0], [5, 0]];

test('fitPreprocessing learns the hand-computed statistics from the given rows only', () => {
  const all = fitPreprocessing(prepX, [0, 1, 2, 3, 4, 5]);
  assert.equal(all.medians[0], 4);
  close(all.means[0], 4.5);
  close(all.sds[0], Math.sqrt(45.5 / 6));
  const part = fitPreprocessing(prepX, [0, 1, 2]);
  assert.equal(part.medians[0], 2);
  close(part.means[0], 2);
  close(part.sds[0], Math.sqrt(2 / 3));
  // The constant column has sd 0 and maps to 0; a gap is filled with the median, then standardized.
  const z = part.transform([[null, 0], [3, 0]]);
  close(z[0][0], 0);
  close(z[1][0], 1 / Math.sqrt(2 / 3));
  assert.equal(z[0][1], 0);
  assert.equal(part.sds[1], 0);
});

test('runPreprocessing: leaky statistics come from every row, correct ones from the training rows, same split for both', () => {
  const rows = Array.from({ length: 40 }, (_, i) => [i % 7 === 0 ? null : i * 1.5, (i * 37) % 11]);
  const y = rows.map((_, i) => (i % 2 ? 1 : 0));
  const r = runPreprocessing({ X: rows, y, seed: 4 });
  const all = fitPreprocessing(rows, rows.map((_, i) => i));
  const tr = fitPreprocessing(rows, r.split.train);
  assert.deepEqual(r.leaky.medians, all.medians);
  assert.deepEqual(r.leaky.means, all.means);
  assert.deepEqual(r.correct.sds, tr.sds);
  assert.notDeepEqual(r.leaky.means, r.correct.means);
  close(r.accuracyDifference, r.leaky.accuracy - r.correct.accuracy);
});

test('tableToXY keeps missing features as null, drops rows with no label and marks the positive class', () => {
  const t = parseCsv('a,b,c\n1,2,yes\n,4,no\n5,6,\n7,8,yes\n');
  const d = tableToXY(t, ['a', 'b'], 'c', 'yes');
  assert.deepEqual(d.X, [[1, 2], [null, 4], [7, 8]]);
  assert.deepEqual(d.y, [1, 0, 1]);
  assert.deepEqual(d.rows, [0, 1, 3]);
});

test('on the bundled penguins the two preprocessing pipelines score almost the same (the honest, small effect)', () => {
  const text = fs.readFileSync(new URL('../../data/penguins.csv', import.meta.url), 'utf8');
  const table = parseCsv(text);
  const features = ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g'];
  const { X, y } = tableToXY(table, features, 'sex', 'male');
  assert.ok(X.length > 300);
  for (const model of ['logistic', 'knn']) {
    const r = repeatPreprocessing({ X, y, model, times: 10 });
    assert.ok(r.leakyMean > 0.8 && r.correctMean > 0.8, `${model}: ${r.leakyMean} ${r.correctMean}`);
    assert.ok(Math.abs(r.leakyMean - r.correctMean) < 0.03, `${model}: gap ${r.leakyMean - r.correctMean}`);
    assert.equal(r.differences.length, 10);
  }
  // The learned statistics do differ between the two fits, which is the leak itself.
  const one = runPreprocessing({ X, y, seed: 1 });
  assert.notDeepEqual(one.leaky.means, one.correct.means);
});
