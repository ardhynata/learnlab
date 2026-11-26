import test from 'node:test';
import assert from 'node:assert/strict';
import {
  polyFeatures, standardize, softThreshold, ridge, lasso, lambdaMax, lambdaGrid, fitScaled,
  coefficientPath, mse, trainValError, learningCurve,
} from './regularize.js';
import { linearFit } from './regression.js';
import { rng, gauss } from './rng.js';
import { sampleCurve, splitIndices } from './overfitdemo.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);
const norm2 = w => Math.sqrt(w.reduce((s, v) => s + v * v, 0));

// Orthogonal, centred design: both columns have sum of squares 4, so the fits have exact
// hand-computable answers. y = 2 * x1 + 0.1 * x2 + 5.
const OX = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const OY = OX.map(([a, b]) => 2 * a + 0.1 * b + 5);

test('polyFeatures builds powers 1..degree with no constant column', () => {
  assert.deepEqual(polyFeatures([2, -1, 0], 3), [[2, 4, 8], [-1, 1, -1], [0, 0, 0]]);
  assert.deepEqual(polyFeatures([5, 7], 2, { center: 5, scale: 2 }), [[0, 0], [1, 1]]);
  assert.deepEqual(polyFeatures([3], 1), [[3]]);
});

test('standardize gives each column mean 0 and sd 1, and apply reuses the same mean and sd', () => {
  const { Z, mean, sd, apply } = standardize([[1, 10], [2, 10], [3, 10], [4, 10]]);
  close(mean[0], 2.5); close(sd[0], Math.sqrt(1.25));   // population sd: squared deviations 5 / 4
  assert.deepEqual(Z.map(r => r[1]), [0, 0, 0, 0]);     // constant column: 0, not NaN
  close(Z.reduce((s, r) => s + r[0], 0), 0);
  close(Z.reduce((s, r) => s + r[0] ** 2, 0) / 4, 1);
  const out = apply([[2.5, 99]]);
  close(out[0][0], 0); assert.equal(out[0][1], 0);
  close(apply([[2.5 + Math.sqrt(1.25), 10]])[0][0], 1);
});

test('softThreshold shrinks toward zero and is exactly zero inside the band', () => {
  assert.equal(softThreshold(3, 1), 2);
  assert.equal(softThreshold(-3, 1), -2);
  assert.equal(softThreshold(0.5, 1), 0);
  assert.equal(softThreshold(-0.5, 1), 0);
  assert.equal(softThreshold(1, 1), 0);       // on the edge counts as inside, and is +0 not -0
  assert.equal(softThreshold(-1, 1), 0);
  assert.equal(softThreshold(2, 0), 2);
});

test('ridge on a one-feature three-point set matches the closed form', () => {
  // x = 1 2 3 and y = 1 3 2: centred x = -1 0 1, centred y = -1 1 0, so x'y = 1 and x'x = 2.
  // The penalised slope is 1 / (2 + n * lambda) with n = 3.
  const X = [[1], [2], [3]], y = [1, 3, 2];
  const plain = ridge(X, y, 0);
  close(plain.coef[0], 0.5);
  close(plain.intercept, 2 - 0.5 * 2);
  const r = ridge(X, y, 1);
  close(r.coef[0], 1 / 5);
  close(r.intercept, 2 - 0.2 * 2);              // intercept = mean(y) - slope * mean(x), not penalised
  close(r.predict([4]), 1.6 + 0.2 * 4);
  close(ridge(X, y, 1 / 3).coef[0], 1 / 3);     // 1 / (2 + 1)
});

test('ridge with lambda 0 is ordinary least squares', () => {
  const xs = [0.5, 1.5, 2, 4, 6, 7.5], ys = [1.1, 2.9, 3.1, 6.8, 11.2, 12.9];
  const fit = linearFit(xs, ys), r = ridge(xs.map(v => [v]), ys, 0);
  close(r.coef[0], fit.slope); close(r.intercept, fit.intercept);
});

test('the intercept is not penalised: shifting y moves only the intercept', () => {
  const X = [[1, 4], [2, 1], [3, 5], [4, 2], [5, 8]], y = [2, 1, 4, 3, 7];
  for (const lambda of [0, 0.5, 50]) {
    const a = ridge(X, y, lambda), b = ridge(X, y.map(v => v + 100), lambda);
    a.coef.forEach((c, j) => close(c, b.coef[j]));
    close(b.intercept - a.intercept, 100);
  }
  // Even an absurd lambda leaves the fit at the mean of y, not at 0.
  const flat = ridge(X, y, 1e9);
  close(flat.intercept, 17 / 5, 1e-6);
  assert.ok(norm2(flat.coef) < 1e-6);
});

test('ridge on an orthogonal design divides each correlation by (sum of squares + n*lambda)', () => {
  // x1'y = 8 and x2'y = 0.4, sums of squares 4, n = 4. lambda 0.25 makes n*lambda = 1.
  const r = ridge(OX, OY, 0.25);
  close(r.coef[0], 8 / 5); close(r.coef[1], 0.4 / 5);
  close(r.intercept, 5);
});

test('ridge coefficients shrink monotonically as lambda grows', () => {
  const random = rng(5);
  const X = Array.from({ length: 40 }, () => { const a = gauss(random); return [a, a + 0.3 * gauss(random), gauss(random), gauss(random)]; });
  const y = X.map(r => 3 * r[0] - 2 * r[2] + 0.4 * gauss(random));
  const { Z } = standardize(X);
  const lambdas = [0, 0.001, 0.01, 0.1, 1, 10, 100, 1e4];
  const norms = lambdas.map(l => norm2(ridge(Z, y, l).coef));
  for (let i = 1; i < norms.length; i++) assert.ok(norms[i] < norms[i - 1], `norm grew at lambda ${lambdas[i]}`);
  assert.ok(norms[norms.length - 1] < 1e-3 * norms[0]);
  // On the orthogonal design every single coefficient shrinks too.
  const path = coefficientPath(OX, OY, [0, 0.1, 1, 10], 'ridge');
  for (const s of path.series) for (let i = 1; i < s.length; i++) assert.ok(Math.abs(s[i]) < Math.abs(s[i - 1]));
});

test('lasso on an orthogonal design soft-thresholds each correlation by n*lambda/2', () => {
  // n = 4, so the threshold is 2 * lambda. At lambda 0.5: w2 = S(0.4, 1) / 4 = 0 and w1 = (8 - 1) / 4.
  const big = lasso(OX, OY, 0.5);
  assert.equal(big.coef[1], 0);
  close(big.coef[0], 7 / 4);
  close(big.intercept, 5);
  assert.ok(big.converged);
  // At lambda 0.1 the threshold is 0.2, below both correlations: w1 = 7.8 / 4, w2 = 0.2 / 4.
  const small = lasso(OX, OY, 0.1);
  close(small.coef[0], 7.8 / 4); close(small.coef[1], 0.2 / 4);
  // lambda 0 is least squares: the true coefficients.
  const none = lasso(OX, OY, 0);
  close(none.coef[0], 2); close(none.coef[1], 0.1);
});

test('lasso zeroes a pure-noise coefficient at a large enough lambda and keeps the signal', () => {
  const random = rng(21), n = 60;
  const X = Array.from({ length: n }, () => [gauss(random), gauss(random), gauss(random), gauss(random)]);
  const y = X.map(r => 4 * r[0] - 3 * r[1] + 0.2 * gauss(random));   // columns 2 and 3 are noise
  const { Z } = standardize(X);
  const m = lasso(Z, y, 0.3);
  assert.ok(m.converged);
  assert.equal(m.coef[2], 0); assert.equal(m.coef[3], 0);
  assert.ok(m.coef[0] > 2 && m.coef[1] < -1.5);
  // Ridge at a comparable strength shrinks the noise coefficients but never makes them exactly 0.
  const r = ridge(Z, y, 0.3);
  assert.ok(r.coef[2] !== 0 && r.coef[3] !== 0);
  // At lambdaMax every coefficient is 0; just below it the strongest feature enters.
  const top = lambdaMax(Z, y);
  assert.deepEqual(lasso(Z, y, top).coef, [0, 0, 0, 0]);
  assert.ok(lasso(Z, y, top * 0.9).coef.some(v => v !== 0));
});

test('lasso satisfies its optimality conditions on correlated features', () => {
  const random = rng(8), n = 50;
  const X = Array.from({ length: n }, () => { const a = gauss(random), b = gauss(random); return [a, a + 0.4 * b, b, gauss(random), a - b]; });
  const y = X.map(r => 2 * r[0] + r[2] + 0.3 * gauss(random));
  const lambda = 0.15, m = lasso(X, y, lambda, { iters: 20000 });
  assert.ok(m.converged);
  const mu = X[0].map((_, j) => X.reduce((s, r) => s + r[j], 0) / n);
  const resid = X.map((r, i) => y[i] - m.predict(r));
  X[0].forEach((_, j) => {
    const g = (2 / n) * X.reduce((s, r, i) => s + (r[j] - mu[j]) * resid[i], 0);   // gradient of the error term
    if (m.coef[j] === 0) assert.ok(Math.abs(g) <= lambda + 1e-7, `zero coefficient ${j} has gradient ${g}`);
    else close(g, lambda * Math.sign(m.coef[j]), 1e-7);
  });
});

test('fits are deterministic and a bad kind is refused', () => {
  const X = [[1, 2], [2, 1], [3, 5], [4, 4]], y = [1, 2, 4, 3];
  const a = lasso(X, y, 0.05), b = lasso(X, y, 0.05);
  assert.deepEqual([a.coef, a.intercept, a.iters], [b.coef, b.intercept, b.iters]);
  assert.deepEqual(ridge(X, y, 0.05).coef, ridge(X, y, 0.05).coef);
  assert.throws(() => coefficientPath(X, y, [0.1], 'elastic'), /unknown kind/);
});

test('fitScaled predicts from raw rows and matches a manual standardise-then-fit', () => {
  const X = [[100, 1], [200, 3], [300, 2], [400, 6], [500, 5]], y = [1, 3, 2, 6, 5];
  const m = fitScaled(X, y, 0.1, 'ridge');
  const sc = standardize(X), manual = ridge(sc.Z, y, 0.1);
  m.coef.forEach((c, j) => close(c, manual.coef[j]));
  close(m.predict([300, 2]), manual.predict(sc.apply([[300, 2]])[0]));
});

test('coefficientPath returns one fit per lambda, in the order given', () => {
  const lambdas = [0.05, 0.5, 5];
  const path = coefficientPath(OX, OY, lambdas, 'lasso');
  assert.deepEqual(path.lambdas, lambdas);
  assert.equal(path.coefs.length, 3);
  assert.equal(path.series.length, 2);
  assert.deepEqual(path.series[1], path.coefs.map(c => c[1]));
  assert.deepEqual(path.nonzero, [2, 1, 0]);   // thresholds 0.1, 1 and 10 against correlations 8 and 0.4
  close(path.coefs[0][0], (8 - 0.1) / 4);
  assert.deepEqual(coefficientPath(OX, OY, [5, 0.05], 'lasso').coefs[1], path.coefs[0]);
  path.intercepts.forEach(b => close(b, 5));
});

test('lambdaGrid starts at lambdaMax and falls on a log scale', () => {
  const g = lambdaGrid(OX, OY, 5, 1e-4);
  close(g[0], lambdaMax(OX, OY));
  close(lambdaMax(OX, OY), 2 * 8 / 4);          // 2 * max |x'y| / n
  close(g[4], g[0] * 1e-4);
  close(g[1] / g[0], g[2] / g[1]);
  assert.equal(lambdaGrid(OX, OY, 1).length, 1);
});

test('mse is the mean of the squared errors', () => {
  assert.equal(mse([1, 2, 3], [1, 2, 3]), 0);
  assert.equal(mse([0, 0], [3, 4]), 12.5);
});

test('degree-9 fit: training error rises with lambda while validation error first falls', () => {
  const pts = sampleCurve(11);
  const X = polyFeatures(pts.map(p => p.x), 9, { center: 5, scale: 5 }), y = pts.map(p => p.y);
  const split = splitIndices(30, 14, 11);
  const lambdas = [1e-6, 1e-4, 1e-3, 1e-2, 1e-1, 1, 10];
  const rows = trainValError({ X, y }, lambdas, 'ridge', split);
  assert.deepEqual(rows.map(r => r.lambda), lambdas);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].train >= rows[i - 1].train - 1e-9, `train error fell at ${lambdas[i]}`);
  const best = rows.reduce((b, r, i) => (r.validation < rows[b].validation ? i : b), 0);
  assert.ok(best > 0 && best < rows.length - 1, `best lambda index ${best} should be interior`);
  assert.ok(rows[best].validation < rows[0].validation / 5);          // overfit end is far worse
  assert.ok(rows[rows.length - 1].validation > rows[best].validation * 5);   // underfit end is worse again
  assert.ok(rows[0].train < rows[best].train);                         // the overfit fit hugs the training points
  // The same story for lasso: the training error never falls as lambda grows, and coefficients drop out.
  const l = trainValError({ X, y }, lambdas, 'lasso', split);
  for (let i = 1; i < l.length; i++) assert.ok(l[i].train >= l[i - 1].train - 1e-7);
  assert.ok(l[0].nonzero > l[l.length - 1].nonzero);
  assert.equal(l[l.length - 1].nonzero, 0);
});

test('trainValError standardises on the training rows only', () => {
  // The validation rows hold a far larger x; standardising with their statistics would change the error.
  const X = [[1], [2], [3], [4], [100], [200]], y = [1, 2, 3, 4, 100, 200];
  const split = { train: [0, 1, 2, 3], validation: [4, 5] };
  const [row] = trainValError({ X, y }, [0], 'ridge', split);
  close(row.train, 0, 1e-12);
  close(row.validation, 0, 1e-6);     // a straight line y = x extrapolates exactly
  const [off] = trainValError({ X, y: y.map((v, i) => (i >= 4 ? v + 10 : v)) }, [0], 'ridge', split);
  close(off.validation, 100, 1e-6);   // both validation errors are exactly 10
});

test('learning curve: training error rises and validation error falls as the training set grows', () => {
  const pts = sampleCurve(11);
  const X = polyFeatures(pts.map(p => p.x), 9, { center: 5, scale: 5 }), y = pts.map(p => p.y);
  const sizes = [6, 10, 14, 18, 21];
  const curve = learningCurve({ X, y }, sizes, 0.001, 'ridge', 20, 1);
  assert.deepEqual(curve.map(c => c.size), sizes);
  assert.ok(curve[curve.length - 1].train > curve[0].train);
  assert.ok(curve[curve.length - 1].validation < curve[0].validation / 5);
  for (let i = 1; i < curve.length; i++) assert.ok(curve[i].validation < curve[i - 1].validation * 1.5);
  assert.ok(curve.every(c => c.trainSd >= 0 && c.validationSd >= 0));
  // Deterministic for a seed, different for another one.
  assert.deepEqual(learningCurve({ X, y }, sizes, 0.001, 'ridge', 20, 1), curve);
  assert.notDeepEqual(learningCurve({ X, y }, sizes, 0.001, 'ridge', 20, 2), curve);
});

test('learning curve works for lasso and clamps a size larger than the training pool', () => {
  const random = rng(3);
  const X = Array.from({ length: 40 }, () => [gauss(random), gauss(random), gauss(random)]);
  const y = X.map(r => 2 * r[0] + 0.3 * gauss(random));
  const curve = learningCurve({ X, y }, [5, 20, 1000], 0.05, 'lasso', 5, 7);
  assert.equal(curve.length, 3);
  assert.equal(curve[2].train, learningCurve({ X, y }, [28], 0.05, 'lasso', 5, 7)[0].train);   // 40 - round(12) = 28 rows
  assert.ok(curve.every(c => Number.isFinite(c.train) && Number.isFinite(c.validation)));
});
