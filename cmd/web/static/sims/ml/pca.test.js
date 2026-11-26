import test from 'node:test';
import assert from 'node:assert/strict';
import {
  standardizeColumns, covariance, eigenSymmetric, fitPca, project, reconstruct,
  reconstructionError, rotate2d, varianceAlong2d, bestAxis2d,
} from './pca.js';
import { rng, gauss } from './rng.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const sum = xs => xs.reduce((s, v) => s + v, 0);
const dot = (a, b) => sum(a.map((v, i) => v * b[i]));

// Hand-computed set. Means (1, 1.5); centred rows (-1,-1.5) (1,-0.5) (1,1.5) (-1,0.5), so
//   var x = (1+1+1+1)/4 = 1, var y = (2.25+0.25+2.25+0.25)/4 = 1.25, cov = (1.5-0.5+1.5-0.5)/4 = 0.5.
// Eigenvalues of [[1, .5], [.5, 1.25]]: trace 2.25, det 1, so (2.25 +- sqrt(1.0625)) / 2.
const FOUR = [[0, 0], [2, 1], [2, 3], [0, 2]];
const L1 = (2.25 + Math.sqrt(1.0625)) / 2;
const L2 = (2.25 - Math.sqrt(1.0625)) / 2;

// A reproducible 5-column table with correlated columns and very different scales.
function bigTable(n = 60, seed = 5) {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const a = gauss(r), b = gauss(r), c = gauss(r);
    return [3 * a + 10, a + 0.5 * b - 2, 100 * (b - c), 0.2 * c + a, 5 * gauss(r)];
  });
}

test('covariance of the 4-point set matches the hand computation', () => {
  const C = covariance(FOUR);
  close(C[0][0], 1);
  close(C[1][1], 1.25);
  close(C[0][1], 0.5);
  close(C[1][0], 0.5);
});

test('covariance does not depend on where the data sits', () => {
  const C = covariance(FOUR.map(([x, y]) => [x + 1000, y - 50]));
  close(C[0][0], 1, 1e-6);
  close(C[0][1], 0.5, 1e-6);
});

test('first component of the 4-point set matches the closed form', () => {
  const m = fitPca(FOUR);
  close(m.eigenvalues[0], L1);
  close(m.eigenvalues[1], L2);
  // (A - L I) v = 0 gives v proportional to (0.5, L - 1).
  const norm = Math.hypot(0.5, L1 - 1);
  close(m.components[0][0], 0.5 / norm);
  close(m.components[0][1], (L1 - 1) / norm);
  close(Math.hypot(...m.components[0]), 1);
  close(dot(m.components[0], m.components[1]), 0);
  assert.deepEqual(m.mean, [1, 1.5]);
  assert.deepEqual(m.scale, [1, 1]);
});

test('points on the line y = 2x: first component is (1,2)/sqrt5 and k = 1 loses nothing', () => {
  const X = [[0, 0], [1, 2], [2, 4], [3, 6]];
  const m = fitPca(X);
  close(m.components[0][0], 1 / Math.sqrt(5));
  close(m.components[0][1], 2 / Math.sqrt(5));
  close(m.eigenvalues[1], 0, 1e-12);
  close(m.explainedRatio[0], 1);
  close(reconstructionError(m, X, 1), 0, 1e-12);
  const back = reconstruct(m, project(m, X, 1), 1);
  back.forEach((row, i) => row.forEach((v, j) => close(v, X[i][j], 1e-9)));
});

test('eigenSymmetric: 3x3 with known eigenvalues, descending, unit, orthogonal, A v = lambda v', () => {
  // [[2,1,0],[1,2,0],[0,0,5]] has eigenvalues 5, 3, 1.
  const A = [[2, 1, 0], [1, 2, 0], [0, 0, 5]];
  const { values, vectors } = eigenSymmetric(A);
  values.forEach((v, i) => close(v, [5, 3, 1][i]));
  vectors.forEach((v, i) => {
    close(Math.hypot(...v), 1);
    const Av = A.map(row => dot(row, v));
    Av.forEach((x, k) => close(x, values[i] * v[k]));
    vectors.forEach((w, j) => { if (j !== i) close(dot(v, w), 0); });
  });
  assert.deepEqual(vectors[0].map(x => Math.round(x)), [0, 0, 1]);
});

test('eigenSymmetric rejects non-square, non-symmetric and non-finite input', () => {
  assert.throws(() => eigenSymmetric([]), /empty/);
  assert.throws(() => eigenSymmetric([[1, 2]]), /square/);
  assert.throws(() => eigenSymmetric([[1, 2], [0, 1]]), /symmetric/);
  assert.throws(() => eigenSymmetric([[1, NaN], [NaN, 1]]), /non-finite/);
});

test('sign convention: the largest-magnitude component of every component is positive', () => {
  for (const seed of [1, 2, 3]) {
    const m = fitPca(bigTable(40, seed), { standardize: true });
    for (const v of m.components) {
      const big = v.reduce((b, x) => (Math.abs(x) > Math.abs(b) ? x : b), 0);
      assert.ok(big > 0, v.join());
    }
  }
  // Negating the data changes nothing about the sign convention of the axes.
  const a = fitPca(FOUR), b = fitPca(FOUR.map(([x, y]) => [-x, -y]));
  a.components.forEach((v, i) => v.forEach((x, j) => close(x, b.components[i][j])));
});

test('fitPca is deterministic: the same input gives identical output', () => {
  const X = bigTable();
  assert.deepEqual(fitPca(X, { standardize: true }), fitPca(X, { standardize: true }));
  assert.deepEqual(fitPca(X), fitPca(X));
});

test('explained ratios are in 0..1, descending and sum to 1', () => {
  for (const standardize of [false, true]) {
    const m = fitPca(bigTable(), { standardize });
    close(sum(m.explainedRatio), 1, 1e-12);
    m.explainedRatio.forEach((r, i) => {
      assert.ok(r >= 0 && r <= 1);
      if (i) assert.ok(m.eigenvalues[i] <= m.eigenvalues[i - 1]);
    });
  }
});

test('eigenvalue sum equals the total variance (trace); standardized total equals the column count', () => {
  const X = bigTable();
  const C = covariance(X);
  close(sum(fitPca(X).eigenvalues), sum(C.map((r, i) => r[i])), 1e-6);
  close(sum(fitPca(X, { standardize: true }).eigenvalues), X[0].length, 1e-9);
});

test('standardize: unit-variance columns, so scale no longer dominates the first component', () => {
  const X = bigTable();
  const raw = fitPca(X);
  const z = fitPca(X, { standardize: true });
  // Column 2 has a scale of about 100, so it takes over the raw first component.
  assert.ok(Math.abs(raw.components[0][2]) > 0.99);
  assert.ok(Math.abs(z.components[0][2]) < 0.99);
  assert.ok(raw.explainedRatio[0] > 0.99);
  const { Z } = standardizeColumns(X);
  const C = covariance(Z);
  C.forEach((r, i) => close(r[i], 1, 1e-9));
});

test('standardizeColumns: hand values, and a constant column becomes zeros', () => {
  // Column [1, 3]: mean 2, population sd 1. Column [5, 5]: constant.
  const { Z, mean, scale } = standardizeColumns([[1, 5], [3, 5]]);
  assert.deepEqual(mean, [2, 5]);
  assert.deepEqual(scale, [1, 1]);
  assert.deepEqual(Z, [[-1, 0], [1, 0]]);
  const m = fitPca([[1, 5], [3, 5]], { standardize: true });
  assert.ok(m.eigenvalues.every(Number.isFinite));
  close(m.explainedRatio[0], 1);
});

test('reconstruction error equals the dropped eigenvalue mass, for every k', () => {
  for (const standardize of [false, true]) {
    const X = bigTable(50, 7);
    const m = fitPca(X, { standardize });
    for (let k = 0; k <= m.d; k++) {
      const dropped = sum(m.eigenvalues.slice(k));
      close(reconstructionError(m, X, k), dropped, 1e-7 * (1 + sum(m.eigenvalues)));
    }
    close(reconstructionError(m, X, m.d), 0, 1e-8);
  }
});

test('reconstruction error on the 4-point set: k = 1 leaves exactly the smaller eigenvalue', () => {
  const m = fitPca(FOUR);
  close(reconstructionError(m, FOUR, 1), L2);
  close(reconstructionError(m, FOUR, 0), L1 + L2);   // k = 0 rebuilds every row as the mean
  close(reconstructionError(m, FOUR, 2), 0, 1e-12);
});

test('error never grows as components are added', () => {
  const X = bigTable();
  const m = fitPca(X, { standardize: true });
  let prev = Infinity;
  for (let k = 0; k <= m.d; k++) {
    const e = reconstructionError(m, X, k);
    assert.ok(e <= prev + 1e-12);
    prev = e;
  }
});

test('project then reconstruct with all components returns the original table, in original units', () => {
  for (const standardize of [false, true]) {
    const X = bigTable(30, 3);
    const m = fitPca(X, { standardize });
    const back = reconstruct(m, project(m, X));
    back.forEach((row, i) => row.forEach((v, j) => close(v, X[i][j], 1e-8 * (1 + Math.abs(X[i][j])))));
  }
});

test('scores are centred, uncorrelated, and their variances are the eigenvalues', () => {
  const X = bigTable(80, 11);
  const m = fitPca(X);
  const S = project(m, X);
  const C = covariance(S);
  C.forEach((row, i) => row.forEach((v, j) => {
    if (i === j) close(v, m.eigenvalues[i], 1e-7 * (1 + m.eigenvalues[0]));
    else close(v, 0, 1e-7 * (1 + m.eigenvalues[0]));
  }));
  for (let c = 0; c < m.d; c++) close(sum(S.map(r => r[c])) / S.length, 0, 1e-8);
});

test('project: hand score on the 4-point set, and k limits the width', () => {
  const m = fitPca(FOUR);
  const S = project(m, FOUR, 1);
  assert.equal(S[0].length, 1);
  // Row (0,0): centred (-1,-1.5); score = dot with the first component.
  close(S[0][0], dot([-1, -1.5], m.components[0]));
  assert.equal(project(m, FOUR, 0)[0].length, 0);
  assert.equal(project(m, FOUR).length, 4);
});

test('a new point is projected with the fitted mean and scale', () => {
  const m = fitPca(FOUR, { standardize: true });
  const [s] = project(m, [[1, 1.5]]);   // the training mean sits at the origin of score space
  s.forEach(v => close(v, 0));
});

test('the model keeps working when some columns are exact copies (zero eigenvalues)', () => {
  const X = [[1, 1, 3], [2, 2, 1], [3, 3, 2], [4, 4, 8]];
  const m = fitPca(X);
  assert.ok(m.eigenvalues.every(v => v >= 0));
  close(m.eigenvalues[2], 0, 1e-12);
  close(reconstructionError(m, X, 2), 0, 1e-12);
});

test('identical rows: no variance, ratios are all zero rather than NaN', () => {
  const m = fitPca([[2, 3], [2, 3], [2, 3]]);
  assert.deepEqual(m.eigenvalues, [0, 0]);
  assert.deepEqual(m.explainedRatio, [0, 0]);
  assert.equal(reconstructionError(m, [[2, 3]], 0), 0);
});

test('one row and one column are accepted', () => {
  const one = fitPca([[4]]);
  assert.deepEqual(one.components, [[1]]);
  const col = fitPca([[1], [2], [3]]);
  close(col.eigenvalues[0], 2 / 3);
  close(col.explainedRatio[0], 1);
});

test('input validation names the problem', () => {
  assert.throws(() => fitPca([]), /at least one row/);
  assert.throws(() => fitPca([[1, 2], [3]]), /row 1/);
  assert.throws(() => fitPca([[1, NaN]]), /finite/);
  assert.throws(() => covariance([[]]), /column/);
  const m = fitPca(FOUR);
  assert.throws(() => project(m, [[1, 2, 3]]), /columns/);
  assert.throws(() => project(m, FOUR, 3), /k must be/);
  assert.throws(() => reconstructionError(m, FOUR, -1), /k must be/);
  assert.throws(() => reconstructionError(m, FOUR, 1.5), /k must be/);
  assert.throws(() => reconstruct(m, [[1]], 2), /score columns/);
});

test('rotate2d: quarter turn, hand values, and about a centre', () => {
  const R = rotate2d([[1, 0], [0, 2]], Math.PI / 2);
  close(R[0][0], 0); close(R[0][1], 1);
  close(R[1][0], -2); close(R[1][1], 0);
  const C = rotate2d([[2, 1]], Math.PI, [1, 1]);   // half turn about (1,1): (2,1) -> (0,1)
  close(C[0][0], 0); close(C[0][1], 1);
});

test('rotate2d preserves pairwise distances, the centroid-relative shape, and round-trips', () => {
  const r = rng(9);
  const P = Array.from({ length: 12 }, () => [gauss(r) * 4, gauss(r)]);
  for (const angle of [0.3, -1.2, 2.5, 7]) {
    const Q = rotate2d(P, angle);
    for (let i = 0; i < P.length; i++) {
      for (let j = i + 1; j < P.length; j++) {
        close(Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]), Math.hypot(Q[i][0] - Q[j][0], Q[i][1] - Q[j][1]), 1e-9);
      }
    }
    const back = rotate2d(Q, -angle);
    back.forEach((p, i) => { close(p[0], P[i][0], 1e-9); close(p[1], P[i][1], 1e-9); });
  }
  const P0 = [[1, 2], [3, 4]];
  rotate2d(P0, 1);
  assert.deepEqual(P0, [[1, 2], [3, 4]]);   // input untouched
  assert.throws(() => rotate2d([[1, 2, 3]], 1), /pairs/);
  assert.throws(() => rotate2d(P0, NaN), /angle/);
});

test('rotation keeps total variance but moves it between the axes', () => {
  const P = FOUR;
  const before = covariance(P);
  const after = covariance(rotate2d(P, 0.7));
  close(before[0][0] + before[1][1], after[0][0] + after[1][1], 1e-9);
  assert.ok(Math.abs(before[0][0] - after[0][0]) > 1e-3);
});

test('varianceAlong2d: hand values on the 4-point set, period pi', () => {
  close(varianceAlong2d(FOUR, 0), 1);
  close(varianceAlong2d(FOUR, Math.PI / 2), 1.25);
  close(varianceAlong2d(FOUR, 0.4), varianceAlong2d(FOUR, 0.4 + Math.PI), 1e-12);
  // Along 45 degrees: (x + y) / sqrt2 has variance (1 + 1.25 + 2 * 0.5) / 2 = 1.625.
  close(varianceAlong2d(FOUR, Math.PI / 4), 1.625);
});

test('bestAxis2d matches the first component and no other angle has more variance', () => {
  const b = bestAxis2d(FOUR);
  const m = fitPca(FOUR);
  close(b.variance, L1);
  close(b.otherVariance, L2);
  close(b.ratio, L1 / (L1 + L2));
  close(b.direction[0], m.components[0][0]);
  close(b.angle, Math.atan2(m.components[0][1], m.components[0][0]));
  close(varianceAlong2d(FOUR, b.angle), b.variance);
  for (let a = 0; a < Math.PI; a += 0.01) assert.ok(varianceAlong2d(FOUR, a) <= b.variance + 1e-9);
  close(varianceAlong2d(FOUR, b.angle + Math.PI / 2), b.otherVariance);
});

test('bestAxis2d follows a rotated elongated cloud', () => {
  const r = rng(4);
  const base = Array.from({ length: 200 }, () => [gauss(r) * 5, gauss(r) * 0.5]);
  const turned = rotate2d(base, 0.6);
  const b = bestAxis2d(turned);
  close(b.angle, 0.6, 0.05);
  assert.ok(b.ratio > 0.95);
  // The same cloud turned by pi/2 + 0.6 gives the same axis (direction sign is fixed by the convention).
  const c = bestAxis2d(rotate2d(base, 0.6 + Math.PI));
  close(Math.abs(Math.cos(c.angle - b.angle)), 1, 1e-6);
});

test('bestAxis2d on axis-aligned data returns the x axis with angle 0', () => {
  const b = bestAxis2d([[-2, 0], [-1, 0], [1, 0], [2, 0]]);
  close(b.angle, 0);
  close(b.otherVariance, 0, 1e-12);
  close(b.ratio, 1);
});
