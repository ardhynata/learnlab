import test from 'node:test';
import assert from 'node:assert/strict';
import { rng, gauss, shuffle } from './rng.js';
import { euclidean, manhattan, chebyshev, cosine, squaredEuclidean, nearestIndex } from './distance.js';
import { columnStats, standardize, minMax } from './scale.js';
import { neighbors, classify, looAccuracy } from './knn.js';
import { linearFit, polyFit, solve, mse, mae } from './regression.js';
import { confusion, scores, atThreshold, rocCurve, auc } from './metrics.js';
import { covariance, eigenSym, dot, norm, matVec } from './linalg.js';
import { blobs, moons, rings, checker, linear, curve1d, highDim } from './datasets.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

test('rng is deterministic and uniform-ish', () => {
  const a = rng(7), b = rng(7);
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
  const r = rng(1);
  let sum = 0;
  for (let i = 0; i < 5000; i++) { const v = r(); assert.ok(v >= 0 && v < 1); sum += v; }
  close(sum / 5000, 0.5, 0.03);
});

test('gauss has roughly zero mean and unit spread', () => {
  const r = rng(3);
  const xs = Array.from({ length: 8000 }, () => gauss(r));
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
  close(m, 0, 0.05);
  close(sd, 1, 0.05);
});

test('shuffle keeps every element and does not mutate', () => {
  const src = [1, 2, 3, 4, 5, 6];
  const out = shuffle(src, rng(9));
  assert.deepEqual(src, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(out.slice().sort(), src);
});

test('distances on a 3-4-5 triangle', () => {
  close(euclidean([0, 0], [3, 4]), 5);
  close(squaredEuclidean({ x: 0, y: 0 }, { x: 3, y: 4 }), 25);
  close(manhattan([0, 0], [3, 4]), 7);
  close(chebyshev([0, 0], [3, 4]), 4);
});

test('cosine distance depends on direction only', () => {
  close(cosine([1, 0], [2, 0]), 0);
  close(cosine([1, 0], [0, 3]), 1);
  close(cosine([1, 0], [-1, 0]), 2);
  assert.equal(cosine([0, 0], [1, 1]), 1, 'a zero vector is distance 1 from everything');
});

test('nearestIndex picks the first of equal distances', () => {
  assert.equal(nearestIndex([[2, 0], [0, 2], [5, 5]], [0, 0]), 0);
});

test('standardize gives zero mean and unit spread; constants map to 0', () => {
  const rows = [[1, 100, 7], [2, 200, 7], [3, 300, 7], [4, 400, 7]];
  const z = standardize(rows);
  for (const j of [0, 1]) {
    const col = z.map(r => r[j]);
    close(col.reduce((a, b) => a + b, 0) / col.length, 0);
    close(Math.sqrt(col.reduce((s, v) => s + v * v, 0) / col.length), 1);
  }
  assert.ok(z.every(r => r[2] === 0));
  const mm = minMax(rows);
  assert.deepEqual(mm.map(r => r[0]), [0, 1 / 3, 2 / 3, 1].map(v => v));
  assert.ok(Math.abs(columnStats(rows).mean[1] - 250) < 1e-9);
});

// The worked example from the "How k-NN decides" lesson: the answer flips with k.
test('k-NN reproduces the lesson example (A at k=1 and 3, B at k=5)', () => {
  const pts = [{ x: 4, y: 5, label: 'A' }, { x: 6, y: 6, label: 'B' }, { x: 5, y: 3, label: 'A' }, { x: 8, y: 5, label: 'B' }, { x: 5, y: 9, label: 'B' }];
  const q = { x: 5, y: 5 };
  assert.deepEqual(neighbors(pts, q, 5, euclidean).map(n => n.i), [0, 1, 2, 3, 4]);
  assert.equal(classify(pts, q, 1).label, 'A');
  assert.equal(classify(pts, q, 3).label, 'A');
  const five = classify(pts, q, 5);
  assert.equal(five.label, 'B');
  assert.deepEqual(five.votes, { A: 2, B: 3 });
});

test('k-NN breaks a tie in favour of the closest neighbor', () => {
  const pts = [{ x: 1, y: 0, label: 'A' }, { x: 2, y: 0, label: 'B' }];
  const r = classify(pts, { x: 0, y: 0 }, 2);
  assert.equal(r.tied, true);
  assert.equal(r.label, 'A');
});

test('leave-one-out accuracy is 1 for well separated classes and low for a mix', () => {
  const sep = [...Array(6)].map((_, i) => ({ x: i * 0.1, y: 0, label: 'A' })).concat([...Array(6)].map((_, i) => ({ x: 9 + i * 0.1, y: 0, label: 'B' })));
  assert.equal(looAccuracy(sep, 3), 1);
});

test('linearFit recovers an exact line and reports R^2', () => {
  const xs = [0, 1, 2, 3, 4], ys = xs.map(x => 2 * x + 1);
  const f = linearFit(xs, ys);
  close(f.slope, 2); close(f.intercept, 1); close(f.r2, 1);
  assert.ok(linearFit(xs, [1, 5, 2, 6, 3]).r2 < 1);
});

test('solve handles a small system and rejects a singular one', () => {
  const x = solve([[2, 1], [1, 3]], [3, 5]);
  close(x[0], 0.8); close(x[1], 1.4);
  assert.throws(() => solve([[1, 2], [2, 4]], [1, 2]));
});

test('polyFit recovers a quadratic and degree 1 matches linearFit', () => {
  const xs = [-3, -2, -1, 0, 1, 2, 3, 4], ys = xs.map(x => 0.5 * x * x - x + 2);
  const p = polyFit(xs, ys, 2);
  xs.forEach((x, i) => close(p.predict(x), ys[i], 1e-6));
  const line = linearFit(xs, ys), p1 = polyFit(xs, ys, 1);
  close(p1.predict(10), line.slope * 10 + line.intercept, 1e-6);
});

test('higher polynomial degree never fits the training data worse', () => {
  const pts = curve1d(5, { n: 20 });
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  let prev = Infinity;
  for (let d = 1; d <= 8; d++) {
    const err = mse(ys, xs.map(polyFit(xs, ys, d).predict));
    assert.ok(err <= prev + 1e-6, `degree ${d}: ${err} > ${prev}`);
    prev = err;
  }
  close(mae([1, 2], [2, 4]), 1.5);
});

test('confusion matrix and scores', () => {
  const actual = [true, true, true, false, false, false, false, true];
  const predicted = [true, true, false, true, false, false, false, true];
  const c = confusion(actual, predicted);
  assert.deepEqual(c, { tp: 3, fp: 1, tn: 3, fn: 1 });
  const s = scores(c);
  close(s.accuracy, 0.75); close(s.precision, 0.75); close(s.recall, 0.75); close(s.f1, 0.75); close(s.fpr, 0.25);
});

test('threshold sweep: a perfect scorer has AUC 1 and a constant scorer 0.5', () => {
  const actual = [true, true, true, false, false, false];
  assert.equal(atThreshold([0.9, 0.8, 0.7, 0.3, 0.2, 0.1], actual, 0.5).accuracy, 1);
  close(auc(rocCurve([0.9, 0.8, 0.7, 0.3, 0.2, 0.1], actual)), 1);
  close(auc(rocCurve([0.5, 0.5, 0.5, 0.5, 0.5, 0.5], actual)), 0.5);
  assert.equal(scores({ tp: 0, fp: 0, tn: 0, fn: 0 }).precision, 0, 'no division by zero');
});

test('covariance of a simple set', () => {
  const C = covariance([[1, 2], [2, 4], [3, 6]]);
  close(C[0][0], 1); close(C[1][1], 4); close(C[0][1], 2);
});

test('eigenSym finds known eigenpairs', () => {
  const e = eigenSym([[2, 1], [1, 2]]);
  close(e.values[0], 3, 1e-9); close(e.values[1], 1, 1e-9);
  close(Math.abs(e.vectors[0][0]), Math.SQRT1_2, 1e-9);
  const d = eigenSym([[1, 0], [0, 5]]);
  assert.deepEqual(d.values.map(v => Math.round(v)), [5, 1]);
});

test('eigenSym satisfies A v = lambda v on a seeded symmetric 5x5', () => {
  const r = rng(11), n = 5;
  const M = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { M[i][j] = M[j][i] = r() * 4 - 2; }
  const { values, vectors } = eigenSym(M);
  values.forEach((lam, i) => {
    const v = vectors[i];
    close(norm(v), 1, 1e-9);
    const Av = matVec(M, v);
    Av.forEach((x, k) => close(x, lam * v[k], 1e-8));
  });
  for (let i = 1; i < values.length; i++) assert.ok(values[i - 1] >= values[i] - 1e-12);
  close(dot(vectors[0], vectors[1]), 0, 1e-9);
});

test('datasets are reproducible, sized and inside the 0..10 square', () => {
  for (const make of [blobs, moons, rings, checker]) {
    const a = make(4, { n: 50 }), b = make(4, { n: 50 });
    assert.deepEqual(a, b);
    assert.equal(a.length, 50);
    for (const p of a) assert.ok(p.x >= 0 && p.x <= 10 && p.y >= 0 && p.y <= 10 && p.label !== undefined);
  }
  assert.notDeepEqual(blobs(1), blobs(2));
  assert.equal(new Set(blobs(1, { n: 60, k: 3 }).map(p => p.label)).size, 3);
  const line = linear(2, { n: 40, noise: 0.01 });
  close(linearFit(line.map(p => p.x), line.map(p => p.y)).slope, 0.7, 0.01);
  const hd = highDim(3, { n: 30, d: 6 });
  assert.equal(hd.length, 30); assert.equal(hd[0].length, 6);
});
