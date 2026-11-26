// Prediction intervals for 1-D regression: the pure math behind the uncertainty lab. No
// drawing here; everything is deterministic given its seed.
//
// API
//   Data layout: X is an array of numbers (one input per example), y an array of numbers.
//   An interval is {lo, hi}. A "regressor" is a function fit(X, y) that returns a
//   predict(x) function (an object with a .predict method also works).
//
//   Synthetic data with KNOWN noise (so the right answer is checkable):
//   makeHetero({n, seed, noise, shift}) -> {x, y, mean, sd, f, sigma, noise}
//        x ~ uniform on [-1 + shift, 1 + shift]; y = f(x) + sigma(x) * z, z roughly N(0,1).
//        f(x) = 1.5 * sin(2.5 x) (the true curve). noise "constant": sigma = 0.3 everywhere;
//        noise "growing": sigma(x) = 0.08 + 0.22 * (x + 1), i.e. 0.08 at x = -1 rising to
//        0.52 at x = 1 (floored at 0.05 further left). `mean` and `sd` are f and sigma at
//        each x; `f` and `sigma` are the functions. x is returned sorted ascending.
//   covariateShift(data, {delta, seed}) -> a NEW dataset whose inputs are x + delta and whose
//        outputs are drawn fresh from the SAME true rule y = f(x) + sigma(x) z. Only the
//        input distribution moves; the relation between x and y does not. This is what
//        "covariate shift" means, so coverage before and after is an honest comparison.
//
//   Regressors to plug into the interval methods:
//   polyRegressor(degree)         least-squares polynomial (regression.js polyFit).
//   knnRegressor(k)               mean of the k nearest training x (1-D k-NN).
//
//   Interval methods (each returns an object with predict(x) -> {lo, hi}):
//   splitConformal({X, y, fit, alpha, seed, calFraction})   split conformal prediction.
//        Shuffle the rows with the seed, fit on the training part, score the calibration part
//        by absolute residual, take q = the k-th smallest score with
//        k = ceil((m + 1)(1 - alpha)) for m calibration rows, and return pred(x) +/- q. If
//        k > m (too few calibration rows for this alpha) q is Infinity. calFraction defaults
//        to 0.5. -> {predict, q, k, nTrain, nCal, model}. Width is the SAME everywhere;
//        coverage is marginal (about 1 - alpha over exchangeable data) and no model
//        assumption is needed.
//   conformalQuantile(residuals, alpha)  the quantile above on its own (hand-checkable).
//   quantileRegression({X, y, tau, degree, iters, lr}) -> {predict, coef, loss}. A polynomial
//        of the given degree (default 3) in t = scaled x, fit by minimising the pinball loss
//        with subgradient descent (step lr / sqrt(1 + step), default lr 0.3, default
//        iters 3000). It starts from the least-squares curve moved by the tau-quantile of
//        its residuals and returns the best iterate seen, so it is deterministic.
//   quantileInterval({X, y, alpha, degree, iters, lr}) -> {predict, lower, upper}. Two
//        quantile regressions at tau = alpha/2 and 1 - alpha/2; lo/hi are put in order if
//        the curves cross. The width follows the noise, so it is narrow where the data are
//        quiet. Coverage is only as good as the polynomial shape allows.
//   ensembleInterval({X, y, fit, B, seed, alpha}) -> {predict, members}. B bootstrap
//        refits (default 30); predict(x) -> {lo, hi, mean, sd} where lo/hi are the alpha/2
//        and 1 - alpha/2 quantiles of the B predictions at x. This is EPISTEMIC spread (the
//        model is unsure of the curve); it shrinks with more data and does NOT include the
//        noise in y, so it undercovers new y values. It widens where data are sparse.
//
//   Measuring:
//   pinballLoss(y, pred, tau)     mean of max(tau * (y - pred), (tau - 1) * (y - pred)); at
//        tau 0.5 it is half the mean absolute error.
//   intervalsAt(predict, X)       X.map(predict) -> an array of {lo, hi}.
//   coverage(intervals, y)        fraction of y values with lo <= y <= hi.
//   meanWidth(intervals)          mean of hi - lo.
//   coverageByBin(X, intervals, y, bins)  split the x range into equal bins ->
//        [{from, to, n, coverage, width}] (coverage and width are null for an empty bin).
//   quantile(values, p)           p-quantile with linear interpolation (values need not be
//        sorted; p in [0, 1]).
import { polyFit, solve } from './regression.js';
import { rng, gauss, shuffle } from './rng.js';

const TRUE_F = x => 1.5 * Math.sin(2.5 * x);
const SIGMA = {
  constant: () => 0.3,
  growing: x => Math.max(0.05, 0.08 + 0.22 * (x + 1)),
};

export function makeHetero({ n = 300, seed = 1, noise = 'growing', shift = 0 } = {}) {
  if (!SIGMA[noise]) throw new Error(`unknown noise "${noise}" (use "constant" or "growing")`);
  const random = rng(seed), sigma = SIGMA[noise];
  const x = Array.from({ length: n }, () => -1 + shift + 2 * random()).sort((a, b) => a - b);
  const mean = x.map(TRUE_F), sd = x.map(sigma);
  const y = x.map((_, i) => mean[i] + sd[i] * gauss(random));
  return { x, y, mean, sd, f: TRUE_F, sigma, noise };
}

export function covariateShift(data, { delta = 1, seed = 1 } = {}) {
  const random = rng(seed);
  const x = data.x.map(v => v + delta);
  const mean = x.map(data.f), sd = x.map(data.sigma);
  const y = x.map((_, i) => mean[i] + sd[i] * gauss(random));
  return { x, y, mean, sd, f: data.f, sigma: data.sigma, noise: data.noise };
}

const asPredict = model => (typeof model === 'function' ? model : model.predict);

export function polyRegressor(degree = 3) {
  return (X, y) => polyFit(X, y, degree).predict;
}

export function knnRegressor(k = 5) {
  return (X, y) => {
    const kk = Math.max(1, Math.min(k, X.length));
    return x => {
      const order = X.map((v, i) => i).sort((a, b) => Math.abs(X[a] - x) - Math.abs(X[b] - x) || a - b);
      let s = 0;
      for (let i = 0; i < kk; i++) s += y[order[i]];
      return s / kk;
    };
  };
}

export function quantile(values, p) {
  if (!values.length) throw new Error('quantile of an empty list');
  const s = values.slice().sort((a, b) => a - b);
  const pos = Math.min(1, Math.max(0, p)) * (s.length - 1);
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

// The k-th smallest score, k = ceil((m + 1)(1 - alpha)); Infinity when k > m.
export function conformalQuantile(residuals, alpha) {
  const m = residuals.length;
  if (!m) throw new Error('conformalQuantile needs at least one residual');
  const k = Math.ceil((m + 1) * (1 - alpha) - 1e-9);
  if (k > m) return Infinity;
  const s = residuals.slice().sort((a, b) => a - b);
  return s[Math.max(1, k) - 1];
}

export function splitConformal({ X, y, fit, alpha = 0.1, seed = 1, calFraction = 0.5 }) {
  const n = X.length;
  if (n < 4) throw new Error('splitConformal needs at least 4 rows');
  const order = shuffle(Array.from({ length: n }, (_, i) => i), rng(seed));
  const nCal = Math.min(n - 2, Math.max(1, Math.round(n * calFraction)));
  const cal = order.slice(0, nCal), train = order.slice(nCal);
  const model = asPredict(fit(train.map(i => X[i]), train.map(i => y[i])));
  const scores = cal.map(i => Math.abs(y[i] - model(X[i])));
  const q = conformalQuantile(scores, alpha);
  const k = Math.ceil((nCal + 1) * (1 - alpha) - 1e-9);
  return { predict: x => { const m = model(x); return { lo: m - q, hi: m + q }; }, q, k, nTrain: train.length, nCal, model };
}

export function pinballLoss(y, pred, tau) {
  let s = 0;
  for (let i = 0; i < y.length; i++) {
    const r = y[i] - pred[i];
    s += Math.max(tau * r, (tau - 1) * r);
  }
  return s / y.length;
}

export function quantileRegression({ X, y, tau = 0.5, degree = 3, iters = 3000, lr = 0.3 }) {
  const n = X.length, m = degree + 1;
  const lo = Math.min(...X), hi = Math.max(...X);
  const center = (lo + hi) / 2, scale = (hi - lo) / 2 || 1;
  const feat = x => { const t = (x - center) / scale, row = new Array(m); let p = 1; for (let j = 0; j < m; j++) { row[j] = p; p *= t; } return row; };
  const F = X.map(feat);
  const dotw = (w, row) => { let s = 0; for (let j = 0; j < m; j++) s += w[j] * row[j]; return s; };
  // Start: least squares (tiny ridge for stability), intercept moved to the tau-quantile of its residuals.
  const A = Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => F.reduce((s, r) => s + r[i] * r[j], 0) + (i === j ? 1e-10 : 0)));
  const b = Array.from({ length: m }, (_, i) => F.reduce((s, r, k) => s + r[i] * y[k], 0));
  let w = solve(A, b);
  w[0] += quantile(F.map((r, k) => y[k] - dotw(w, r)), tau);
  const lossOf = ww => pinballLoss(y, F.map(r => dotw(ww, r)), tau);
  let best = w.slice(), bestLoss = lossOf(w);
  const g = new Array(m);
  for (let step = 0; step < iters; step++) {
    g.fill(0);
    for (let i = 0; i < n; i++) {
      const r = y[i] - dotw(w, F[i]);
      const d = r > 0 ? -tau : 1 - tau;       // subgradient of the pinball loss w.r.t. the prediction
      for (let j = 0; j < m; j++) g[j] += d * F[i][j];
    }
    const eta = lr / Math.sqrt(1 + step);
    for (let j = 0; j < m; j++) w[j] -= eta * g[j] / n;
    const l = lossOf(w);
    if (l < bestLoss) { bestLoss = l; best = w.slice(); }
  }
  return { predict: x => dotw(best, feat(x)), coef: best, loss: bestLoss };
}

export function quantileInterval({ X, y, alpha = 0.1, degree = 3, iters = 3000, lr = 0.3 }) {
  const lower = quantileRegression({ X, y, tau: alpha / 2, degree, iters, lr });
  const upper = quantileRegression({ X, y, tau: 1 - alpha / 2, degree, iters, lr });
  return {
    predict: x => { const a = lower.predict(x), b = upper.predict(x); return { lo: Math.min(a, b), hi: Math.max(a, b) }; },
    lower, upper,
  };
}

export function ensembleInterval({ X, y, fit, B = 30, seed = 1, alpha = 0.1 }) {
  const n = X.length, random = rng(seed), members = [];
  for (let b = 0; b < B; b++) {
    const idx = Array.from({ length: n }, () => Math.floor(random() * n));
    members.push(asPredict(fit(idx.map(i => X[i]), idx.map(i => y[i]))));
  }
  return {
    members,
    predict: x => {
      const p = members.map(f => f(x));
      const mean = p.reduce((s, v) => s + v, 0) / p.length;
      const sd = Math.sqrt(p.reduce((s, v) => s + (v - mean) ** 2, 0) / p.length);
      return { lo: quantile(p, alpha / 2), hi: quantile(p, 1 - alpha / 2), mean, sd };
    },
  };
}

export function intervalsAt(predict, X) { return X.map(x => predict(x)); }

export function coverage(intervals, y) {
  if (intervals.length !== y.length) throw new Error('intervals and y differ in length');
  if (!y.length) return NaN;
  let hit = 0;
  for (let i = 0; i < y.length; i++) if (y[i] >= intervals[i].lo && y[i] <= intervals[i].hi) hit++;
  return hit / y.length;
}

export function meanWidth(intervals) {
  return intervals.reduce((s, v) => s + (v.hi - v.lo), 0) / intervals.length;
}

export function coverageByBin(X, intervals, y, bins = 5) {
  const lo = Math.min(...X), hi = Math.max(...X), w = (hi - lo) / bins || 1;
  const groups = Array.from({ length: bins }, () => []);
  X.forEach((x, i) => groups[Math.min(bins - 1, Math.floor((x - lo) / w))].push(i));
  return groups.map((idx, b) => ({
    from: lo + b * w, to: lo + (b + 1) * w, n: idx.length,
    coverage: idx.length ? coverage(idx.map(i => intervals[i]), idx.map(i => y[i])) : null,
    width: idx.length ? meanWidth(idx.map(i => intervals[i])) : null,
  }));
}
