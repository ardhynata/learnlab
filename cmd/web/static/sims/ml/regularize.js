// Regularised regression: ridge (L2) and lasso (L1), the pure math behind the
// regularisation lab. No drawing here; every function is deterministic.
//
// API
//   Data layout: X is an array of rows (X[i][j] = feature j of example i), y is an
//   array of numbers. A "row" is one example's features, an array of numbers.
//
//   The objective both fits minimise (lambda is in the same units as the error):
//       mean squared error  +  lambda * penalty
//     ridge: penalty = sum of w_j^2      lasso: penalty = sum of |w_j|
//   The intercept is NOT penalised. Both fits centre every column of X and y on the
//   training means, solve for the coefficients on the centred data, then set
//   intercept = mean(y) - sum_j mean(x_j) * w_j, so a constant shift in y moves only
//   the intercept. Because the penalty depends on the size of each w_j, put features
//   on one scale first (standardize, or fitScaled which does it for you).
//
//   polyFeatures(x, degree, {center, scale})  x array -> rows [t, t^2 .. t^degree],
//        t = (x - center) / scale (no constant column: the intercept is separate).
//        Map x to about [-1, 1] with center/scale for degrees above 4.
//   standardize(X)                -> {Z, mean, sd, apply}; Z has mean 0 and sd 1 per
//        column (population sd, divide by n); apply(rows) transforms new rows with the
//        SAME mean/sd. A constant column has sd 0 and maps to 0 (never NaN).
//   softThreshold(z, t)           sign(z) * max(|z| - t, 0); exact 0 inside [-t, t].
//   ridge(X, y, lambda)           closed form w = (Xc'Xc + n*lambda*I)^-1 Xc'yc
//        -> {coef, intercept, predict(row)}. lambda 0 is plain least squares (a tiny
//        jitter is added only if the system is singular).
//   lasso(X, y, lambda, {iters, tol})  cyclic coordinate descent with
//        soft-thresholding: w_j = S(x_j'r_j, n*lambda/2) / x_j'x_j, r_j the residual
//        with feature j left out. -> {coef, intercept, predict, iters, converged}.
//        Many coefficients land exactly on 0.
//   lambdaMax(X, y)               smallest lambda at which lasso zeroes every coefficient.
//   lambdaGrid(X, y, count, ratio) count lambdas from lambdaMax down to lambdaMax*ratio,
//        log-spaced, largest first (a lasso path grid; ridge can use it too).
//   fitScaled(X, y, lambda, kind, opts)  standardise on X, fit 'ridge' or 'lasso', and
//        return {coef (standardised scale), intercept, scaler, predict(rawRow)}.
//   coefficientPath(X, y, lambdas, kind)  one fit per lambda (each from a cold start so
//        the order of lambdas does not matter) -> {lambdas, coefs[i][j],
//        intercepts[i], series[j][i], nonzero[i]}.
//   mse(y, predicted)             mean squared error.
//   trainValError(data, lambdas, kind, split)  data = {X, y}; split = {train: [idx],
//        validation: [idx]}. Standardises on the TRAINING rows only, then for every
//        lambda -> [{lambda, train, validation, nonzero}] (errors are MSE).
//   learningCurve(data, sizes, lambda, kind, repeats, seed, {valFraction})  per repeat
//        shuffle the rows with a seeded generator, hold out the last valFraction
//        (default 0.3) as validation, and train on the first `size` of the rest (so a
//        bigger size only adds rows). Averages over repeats ->
//        [{size, train, validation, trainSd, validationSd}].
import { dot, columnMeans } from './linalg.js';
import { solve } from './regression.js';
import { rng, shuffle } from './rng.js';

export function polyFeatures(x, degree, { center = 0, scale = 1 } = {}) {
  const s = scale || 1;
  return x.map(v => {
    const t = (v - center) / s, row = new Array(degree);
    let p = 1;
    for (let k = 0; k < degree; k++) { p *= t; row[k] = p; }
    return row;
  });
}

export function standardize(X) {
  const n = X.length, mu = columnMeans(X);
  const sd = mu.map((m, j) => Math.sqrt(X.reduce((s, r) => s + (r[j] - m) ** 2, 0) / n));
  const apply = rows => rows.map(r => r.map((v, j) => (sd[j] > 1e-12 ? (v - mu[j]) / sd[j] : 0)));
  return { Z: apply(X), mean: mu, sd, apply };
}

export function softThreshold(z, t) {
  if (Math.abs(z) <= t) return 0;
  return z > 0 ? z - t : z + t;
}

export function mse(y, predicted) {
  return y.reduce((s, v, i) => s + (v - predicted[i]) ** 2, 0) / y.length;
}

// Centres X and y on their means; returns the pieces both fits share.
function centre(X, y) {
  const n = X.length, mx = columnMeans(X), my = y.reduce((a, b) => a + b, 0) / n;
  return { n, mx, my, Xc: X.map(r => r.map((v, j) => v - mx[j])), yc: y.map(v => v - my) };
}

function finish(coef, mx, my, extra = {}) {
  const intercept = my - dot(mx, coef);
  return { coef, intercept, predict: row => intercept + dot(row, coef), ...extra };
}

export function ridge(X, y, lambda) {
  const { n, mx, my, Xc, yc } = centre(X, y), d = mx.length;
  const gram = Array.from({ length: d }, (_, a) => Array.from({ length: d }, (_, b) => Xc.reduce((s, r) => s + r[a] * r[b], 0)));
  const rhs = Array.from({ length: d }, (_, a) => Xc.reduce((s, r, i) => s + r[a] * yc[i], 0));
  const solveWith = extra => solve(gram.map((row, a) => row.map((v, b) => v + (a === b ? n * lambda + extra : 0))), rhs);
  let coef;
  try { coef = solveWith(0); } catch { coef = solveWith(1e-8 * (1 + gram.reduce((s, row, a) => s + row[a], 0) / d)); }
  return finish(coef, mx, my);
}

export function lasso(X, y, lambda, { iters = 10000, tol = 1e-10 } = {}) {
  const { n, mx, my, Xc, yc } = centre(X, y), d = mx.length;
  const cols = Array.from({ length: d }, (_, j) => Xc.map(r => r[j]));
  const z = cols.map(c => dot(c, c));
  const w = new Array(d).fill(0);
  const resid = yc.slice();            // resid = yc - Xc w, kept current as w changes
  let it = 0, converged = false;
  while (it < iters && !converged) {
    let maxMove = 0;
    for (let j = 0; j < d; j++) {
      if (z[j] < 1e-12) continue;      // constant column: its coefficient stays 0
      const rho = dot(cols[j], resid) + z[j] * w[j];   // x_j' (residual without feature j)
      const next = softThreshold(rho, n * lambda / 2) / z[j];
      const delta = next - w[j];
      if (delta !== 0) { for (let i = 0; i < n; i++) resid[i] -= delta * cols[j][i]; w[j] = next; }
      maxMove = Math.max(maxMove, Math.abs(delta));
    }
    it++;
    converged = maxMove < tol;
  }
  return finish(w, mx, my, { iters: it, converged });
}

export function lambdaMax(X, y) {
  const { n, Xc, yc } = centre(X, y), d = Xc[0].length;
  let top = 0;
  for (let j = 0; j < d; j++) top = Math.max(top, Math.abs(Xc.reduce((s, r, i) => s + r[j] * yc[i], 0)));
  return 2 * top / n;
}

export function lambdaGrid(X, y, count = 20, ratio = 1e-3) {
  const hi = lambdaMax(X, y) || 1;
  return Array.from({ length: count }, (_, i) => hi * ratio ** (count === 1 ? 0 : i / (count - 1)));
}

function fitKind(Z, y, lambda, kind, opts) {
  if (kind === 'ridge') return ridge(Z, y, lambda);
  if (kind === 'lasso') return lasso(Z, y, lambda, opts);
  throw new Error(`unknown kind "${kind}" (use "ridge" or "lasso")`);
}

export function fitScaled(X, y, lambda, kind = 'ridge', opts = {}) {
  const scaler = standardize(X);
  const m = fitKind(scaler.Z, y, lambda, kind, opts);
  return { ...m, scaler, predict: row => m.predict(scaler.apply([row])[0]) };
}

export function coefficientPath(X, y, lambdas, kind = 'ridge') {
  const fits = lambdas.map(l => fitKind(X, y, l, kind));
  const coefs = fits.map(f => f.coef);
  return {
    lambdas: lambdas.slice(),
    coefs,
    intercepts: fits.map(f => f.intercept),
    series: (coefs[0] || []).map((_, j) => coefs.map(c => c[j])),
    nonzero: coefs.map(c => c.filter(v => v !== 0).length),
  };
}

const pick = (arr, idx) => idx.map(i => arr[i]);

export function trainValError({ X, y }, lambdas, kind = 'ridge', split) {
  const Xt = pick(X, split.train), yt = pick(y, split.train);
  const Xv = pick(X, split.validation), yv = pick(y, split.validation);
  const sc = standardize(Xt), Zv = sc.apply(Xv);
  return lambdas.map(lambda => {
    const m = fitKind(sc.Z, yt, lambda, kind);
    return {
      lambda,
      train: mse(yt, sc.Z.map(r => m.predict(r))),
      validation: mse(yv, Zv.map(r => m.predict(r))),
      nonzero: m.coef.filter(v => v !== 0).length,
    };
  });
}

const meanOf = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const sdOf = xs => { const m = meanOf(xs); return Math.sqrt(meanOf(xs.map(v => (v - m) ** 2))); };

export function learningCurve({ X, y }, sizes, lambda, kind = 'ridge', repeats = 10, seed = 1, { valFraction = 0.3 } = {}) {
  const n = X.length, nVal = Math.max(1, Math.round(n * valFraction)), poolSize = n - nVal;
  const draws = sizes.map(() => ({ train: [], validation: [] }));
  for (let r = 0; r < repeats; r++) {
    const order = shuffle(Array.from({ length: n }, (_, i) => i), rng(seed * 1009 + r + 1));
    const pool = order.slice(0, poolSize), hold = order.slice(poolSize);
    const Xv = pick(X, hold), yv = pick(y, hold);
    sizes.forEach((size, s) => {
      const rows = pool.slice(0, Math.max(1, Math.min(size, poolSize)));
      const Xt = pick(X, rows), yt = pick(y, rows);
      const sc = standardize(Xt), m = fitKind(sc.Z, yt, lambda, kind);
      draws[s].train.push(mse(yt, sc.Z.map(row => m.predict(row))));
      draws[s].validation.push(mse(yv, sc.apply(Xv).map(row => m.predict(row))));
    });
  }
  return sizes.map((size, s) => ({
    size,
    train: meanOf(draws[s].train), validation: meanOf(draws[s].validation),
    trainSd: sdOf(draws[s].train), validationSd: sdOf(draws[s].validation),
  }));
}
