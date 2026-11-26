// Causal inference and experiment design on generated data. Pure and deterministic (rng.js): the same
// options and seed always give the same data and the same numbers. Tested in causal.test.js.
//
// STABLE API (the causal lab and the lesson import this; change it only by adding):
//
// Data
//   makeCausalData({ n = 500, seed = 1, confounding = 1, effect = 2, heterogeneity = 0, overlap = 1,
//                    noise = 1, unmeasured = 0, collider = false })
//       -> { rows, n, ate, effect, rct: false, seed, params }
//       A population with a measured confounder z ~ N(0,1) and an unmeasured confounder u ~ N(0,1).
//         treatment   t ~ Bernoulli(sigmoid((confounding * z + unmeasured * u) / overlap))
//         outcome     y0 = 1 + 2 z + 2 * unmeasured * u + noise * e        (the untreated potential outcome)
//                     y1 = y0 + effect + heterogeneity * z                 (the treated potential outcome)
//                     y  = t ? y1 : y0                                     (the only one a real study sees)
//       confounding   how strongly z pushes people into treatment (0 = treatment is unrelated to z).
//       unmeasured    strength of u, which pushes BOTH treatment (slope = unmeasured) and the outcome
//                     (slope = 2 * unmeasured). Nothing in `rows` of an analyst's table should be read as
//                     "u is available": estimators only adjust for what you name, and u is the hidden one.
//       overlap       in (0, 1]; 1 = a wide range of propensities, small = treatment almost decided by z
//                     (the propensity logit is divided by overlap), so treated and control barely overlap.
//       heterogeneity the effect changes with z: tau = effect + heterogeneity * z.
//       collider      true adds c = t + 0.5 y + 0.5 e_c to every row: a variable caused by BOTH the treatment
//                     and the outcome (a collider / post-treatment variable). Adjusting for it is a bad control.
//       The draws per row are fixed (z, u, coin, outcome noise, collider noise), so changing a knob changes
//       the model, not the population: the same seed keeps the same z, u and noise.
//       row = { z, u, t, y, y0, y1, tau, c, ec, e, p }   t in {0,1}; c = null without the collider option;
//       e is the outcome noise draw, ec the collider noise draw, p the TRUE propensity P(t = 1 | z, u).
//       ate = mean(y1 - y0) over the rows: the TRUE average treatment effect of THIS sample (equals `effect`
//       when heterogeneity = 0), the number every estimator below is trying to recover.
//   randomize(data, seed = 1)       -> same shape with rct: true. The same people (same z, u, potential
//       outcomes, noise), but treatment is re-assigned by a fair coin flip and y / c are recomputed. This is the
//       randomized-trial replica of the observational population: confounding is broken by design.
//   covariateBalance(data, covariate = 'z')
//       -> { treatedMean, controlMean, diff, smd }  smd = difference / pooled sd; |smd| near 0 = balanced.
//
// Estimators. Each takes `data` (a makeCausalData / randomize result, or a plain array of rows with at least
// { t, y } plus whatever covariates you name) and returns
//       { method, estimate, se, ci: [lo, hi], n, bias, covers, ...extras }
//   ci is estimate +/- 1.959964 * se (a 95 percent normal interval). bias = estimate - data.ate and covers =
//   ate inside ci, both only when data.ate is a number (null otherwise).
//   naiveDiff(data)                      -> difference in means, treated minus control; Welch standard error
//                                           sqrt(s1^2/n1 + s0^2/n0) with sample variances (divide by n - 1).
//                                           Extras: meanTreated, meanControl, nTreated, nControl.
//   stratified(data, bins = 5, { by })   -> split into strata, take the difference in means inside each, and
//                                           average them weighted by stratum size. By default the strata are
//                                           `bins` equal-count bins of z; pass by = 'field' or by = row => key
//                                           to use your own (discrete) strata. A stratum missing an arm cannot
//                                           be compared and is dropped (the weights renormalise over the strata
//                                           that remain: `dropped` counts the people lost). SE combines the
//                                           within-stratum Welch variances with squared weights.
//                                           Extras: strata [{ key, n, nTreated, nControl, diff, weight }], dropped.
//   regressionAdjust(data, covariates = ['z'], { interact = false })
//                                        -> least squares y ~ 1 + t + covariates; the estimate is the
//                                           coefficient on t, with the classical OLS standard error. A covariate
//                                           is a row field name or a function row => number. With interact:true
//                                           the centred covariate-by-treatment terms are added, so the t
//                                           coefficient stays the AVERAGE effect when the effect varies.
//                                           Extras: coefficients, names.
//   ipw(data, covariates = ['z'], { clip = 0.01, lr = 0.5, iters = 800 })
//                                        -> inverse-propensity weighting (Hajek form): fit P(t = 1 | covariates)
//                                           with logistic.js, weight treated rows by 1/e and controls by
//                                           1/(1 - e), and compare the weighted means. The SE is the
//                                           influence-function SE that treats the propensities as known (it
//                                           ignores the uncertainty of fitting them, a small conservative bias).
//                                           Propensities are clipped to [clip, 1 - clip].
//                                           Extras: propensity (per row), maxWeight, effectiveN (Kish).
//   badControl(data, covariates = ['z']) -> regressionAdjust that ALSO adjusts for the collider c (throws when
//                                           the data has no collider). Shows the bias of "controlling for
//                                           everything": method 'bad control'.
//   compareEstimators(data, { bins = 5, covariates = ['z'] })
//                                        -> array of estimator results in a fixed order: naive, stratified,
//                                           regression, ipw, and bad control when the data has a collider.
//
// Experiment design (normal approximation; n is the size of EACH of two equal groups; sd is the outcome sd)
//   normCdf(x), normQuantile(p)          -> standard normal cdf (~1e-15) and its inverse (bisection, ~1e-12)
//   powerTwoSample({ effect, sd, n, alpha = 0.05 })
//                                        -> power of a two-sided two-sample z test:
//                                           Phi(effect / se - z) + Phi(-effect / se - z), se = sd * sqrt(2 / n),
//                                           z = quantile(1 - alpha / 2).
//   sampleSize({ effect, sd, power = 0.8, alpha = 0.05 })
//                                        -> smallest whole n per group with n >= 2 (z_{1-alpha/2} + z_{power})^2
//                                           sd^2 / effect^2 (the textbook formula; 0.5 sd effect at 80 percent
//                                           power and alpha 0.05 needs 63 per group).
//   minDetectableEffect({ sd, n, power = 0.8, alpha = 0.05 })
//                                        -> the smallest effect the design detects: (z_a + z_b) * sd * sqrt(2 / n).
//   simulatePower({ effect, sd = 1, n, alpha = 0.05, runs = 2000, seed = 1 })
//                                        -> { power, rejections, runs, mcse }: run the experiment `runs` times
//                                           with normal noise and count significant results. The test uses the
//                                           estimated standard error with a normal critical value, so it is a
//                                           shade liberal at very small n. effect 0 gives the false positive rate.
//   peekingFalsePositiveRate({ looks = 5, n = 200, alpha = 0.05, runs = 2000, seed = 1, sd = 1,
//                              correction = 'none' })
//                                        -> { rate, singleLookRate, looks, n, alpha, runs, threshold, inflation }
//                                           There is NO true effect. n people per arm arrive in `looks` equal
//                                           batches and the experiment is stopped at the first look with
//                                           |z| > threshold. rate = share of runs that stop "significant" (should
//                                           be alpha, is far higher); singleLookRate = the same runs judged once
//                                           at the end; inflation = rate / alpha. correction 'bonferroni' tests
//                                           each look at alpha / looks. The z test uses the known sd.
import { rng, gauss } from './rng.js';
import { solve } from './regression.js';
import { sigmoid as stableSigmoid } from './logistic.js';
import { columnStats } from './scale.js';

const Z95 = 1.959963984540054;
const sigmoid = v => 1 / (1 + Math.exp(-v));
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const sampleVar = xs => {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1);
};
const rowsOf = data => (Array.isArray(data) ? data : data.rows);

// ---- Data ------------------------------------------------------------------------------------

function buildRow(f, t, collider) {
  const y0 = 1 + 2 * f.z + 2 * f.unmeasured * f.u + f.noise * f.e;
  const tau = f.effect + f.heterogeneity * f.z;
  const y1 = y0 + tau;
  const y = t ? y1 : y0;
  return { z: f.z, u: f.u, t, y, y0, y1, tau, c: collider ? t + 0.5 * y + 0.5 * f.ec : null, e: f.e, ec: f.ec, p: f.p };
}

function finish(rows, params, extra) {
  return { rows, n: rows.length, ate: mean(rows.map(r => r.tau)), effect: params.effect, params, ...extra };
}

export function makeCausalData({
  n = 500, seed = 1, confounding = 1, effect = 2, heterogeneity = 0, overlap = 1, noise = 1, unmeasured = 0, collider = false,
} = {}) {
  if (!(n >= 2)) throw new Error('causal: n must be at least 2');
  if (!(overlap > 0 && overlap <= 1)) throw new Error('causal: overlap must be in (0, 1]');
  const random = rng(seed);
  const params = { n, seed, confounding, effect, heterogeneity, overlap, noise, unmeasured, collider: !!collider };
  const rows = [];
  for (let i = 0; i < n; i++) {
    const z = gauss(random), u = gauss(random), coin = random(), e = gauss(random), ec = gauss(random);
    const p = sigmoid((confounding * z + unmeasured * u) / overlap);
    rows.push(buildRow({ z, u, e, ec, p, effect, heterogeneity, noise, unmeasured }, coin < p ? 1 : 0, collider));
  }
  return finish(rows, params, { rct: false, seed });
}

export function randomize(data, seed = 1) {
  const random = rng(seed);
  const p = data.params;
  const rows = data.rows.map(r => {
    const t = random() < 0.5 ? 1 : 0;
    return buildRow({ z: r.z, u: r.u, e: r.e, ec: r.ec, p: 0.5, effect: p.effect, heterogeneity: p.heterogeneity, noise: p.noise, unmeasured: p.unmeasured }, t, p.collider);
  });
  return finish(rows, p, { rct: true, seed });
}

export function covariateBalance(data, covariate = 'z') {
  const rows = rowsOf(data), get = covariateGetter(covariate);
  const a = rows.filter(r => r.t).map(get), b = rows.filter(r => !r.t).map(get);
  if (!a.length || !b.length) throw new Error('causal: need treated and control rows');
  const treatedMean = mean(a), controlMean = mean(b);
  const pooled = Math.sqrt((sampleVar(a) + sampleVar(b)) / 2);
  const diff = treatedMean - controlMean;
  return { treatedMean, controlMean, diff, smd: pooled > 0 ? diff / pooled : 0 };
}

// ---- Estimators ------------------------------------------------------------------------------

function covariateGetter(c) {
  if (typeof c === 'function') return c;
  return row => {
    const v = row[c];
    if (typeof v !== 'number' || Number.isNaN(v)) throw new Error(`causal: covariate "${c}" is missing on a row`);
    return v;
  };
}

function result(method, estimate, se, data, extra = {}) {
  const ate = Array.isArray(data) ? undefined : data.ate;
  const known = typeof ate === 'number';
  const ci = [estimate - Z95 * se, estimate + Z95 * se];
  return {
    method, estimate, se, ci, n: rowsOf(data).length,
    bias: known ? estimate - ate : null,
    covers: known ? ate >= ci[0] && ate <= ci[1] : null,
    ...extra,
  };
}

function arms(rows) {
  const treated = rows.filter(r => r.t), control = rows.filter(r => !r.t);
  if (!treated.length || !control.length) throw new Error('causal: need at least one treated and one control row');
  return { treated, control };
}

export function naiveDiff(data) {
  const { treated, control } = arms(rowsOf(data));
  const y1 = treated.map(r => r.y), y0 = control.map(r => r.y);
  const se = Math.sqrt(sampleVar(y1) / y1.length + sampleVar(y0) / y0.length);
  return result('naive difference', mean(y1) - mean(y0), se, data, {
    meanTreated: mean(y1), meanControl: mean(y0), nTreated: y1.length, nControl: y0.length,
  });
}

export function stratified(data, bins = 5, { by } = {}) {
  const rows = rowsOf(data);
  let keyOf;
  if (by) keyOf = typeof by === 'function' ? by : r => r[by];
  else {
    if (!(bins >= 1)) throw new Error('causal: bins must be at least 1');
    const order = rows.map((r, i) => i).sort((a, b) => rows[a].z - rows[b].z || a - b);
    const bin = new Array(rows.length);
    order.forEach((idx, rank) => { bin[idx] = Math.floor((rank * bins) / rows.length); });
    const index = new Map(rows.map((r, i) => [r, i]));
    keyOf = r => bin[index.get(r)];
  }
  const groups = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  // Fallback variance for an arm with a single row: the pooled variance of that arm over all rows.
  const allArm = a => sampleVar(rows.filter(r => r.t === a).map(r => r.y));
  const usable = [];
  let dropped = 0;
  for (const [key, g] of groups) {
    const t1 = g.filter(r => r.t), t0 = g.filter(r => !r.t);
    if (!t1.length || !t0.length) { dropped += g.length; continue; }
    const y1 = t1.map(r => r.y), y0 = t0.map(r => r.y);
    const v1 = y1.length > 1 ? sampleVar(y1) : allArm(1), v0 = y0.length > 1 ? sampleVar(y0) : allArm(0);
    usable.push({ key, n: g.length, nTreated: y1.length, nControl: y0.length, diff: mean(y1) - mean(y0), varDiff: v1 / y1.length + v0 / y0.length });
  }
  if (!usable.length) throw new Error('causal: no stratum has both treated and control rows');
  const total = usable.reduce((s, s2) => s + s2.n, 0);
  let estimate = 0, variance = 0;
  const strata = usable.map(s => {
    const weight = s.n / total;
    estimate += weight * s.diff;
    variance += weight * weight * s.varDiff;
    return { key: s.key, n: s.n, nTreated: s.nTreated, nControl: s.nControl, diff: s.diff, weight };
  });
  return result('stratified', estimate, Math.sqrt(variance), data, { strata, dropped });
}

// Ordinary least squares by the normal equations. Returns coefficients, their standard errors and sigma^2.
export function ols(X, y) {
  const n = X.length, p = X[0].length;
  if (n <= p) throw new Error('causal: need more rows than coefficients');
  const A = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0)));
  const b = Array.from({ length: p }, (_, i) => X.reduce((s, r, k) => s + r[i] * y[k], 0));
  const coef = solve(A, b);
  const rss = X.reduce((s, r, k) => s + (y[k] - r.reduce((a, v, j) => a + v * coef[j], 0)) ** 2, 0);
  const sigma2 = rss / (n - p);
  const inverseDiagonal = Array.from({ length: p }, (_, j) => solve(A, Array.from({ length: p }, (_, i) => (i === j ? 1 : 0)))[j]);
  return { coef, se: inverseDiagonal.map(d => Math.sqrt(Math.max(0, sigma2 * d))), sigma2, rss };
}

export function regressionAdjust(data, covariates = ['z'], { interact = false } = {}) {
  const rows = rowsOf(data);
  arms(rows);
  const getters = covariates.map(covariateGetter);
  const means = getters.map(g => mean(rows.map(g)));
  // Covariates are centred in the design, so the t coefficient is the effect at the average covariate value
  // (with or without the interaction terms); centring changes only the intercept.
  const design = rows.map(r => {
    const xs = getters.map((g, j) => g(r) - means[j]);
    return [1, r.t, ...xs, ...(interact ? xs.map(v => r.t * v) : [])];
  });
  const fit = ols(design, rows.map(r => r.y));
  const names = ['intercept', 'treatment', ...covariates.map((c, j) => (typeof c === 'string' ? c : `x${j + 1}`)),
    ...(interact ? covariates.map((c, j) => `treatment x ${typeof c === 'string' ? c : `x${j + 1}`}`) : [])];
  return result('regression adjustment', fit.coef[1], fit.se[1], data, { coefficients: fit.coef, names });
}

// Propensity scores by the same full-batch gradient descent as fitLogistic in logistic.js (columns standardized, weights
// and bias start at 0, the same arithmetic in the same order, so the scores are identical), without the log-loss
// bookkeeping and the row copies the fit does not need. The repeated studies fit this 200 times, so it must be quick.
function fitPropensity(X, t, { lr, iters }) {
  const n = X.length, d = X[0].length, stats = columnStats(X);
  const F = new Float64Array(n * d);
  for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) F[i * d + j] = stats.std[j] ? (X[i][j] - stats.mean[j]) / stats.std[j] : 0;
  const w = new Array(d).fill(0), grad = new Array(d);
  let bias = 0;
  const score = i => { let s = 0; for (let j = 0; j < d; j++) s += w[j] * F[i * d + j]; return s + bias; };
  for (let it = 0; it < iters; it++) {
    grad.fill(0);
    let gradBias = 0;
    for (let i = 0, k = 0; i < n; i++, k += d) {
      let z = 0;
      for (let j = 0; j < d; j++) z += w[j] * F[k + j];
      const err = stableSigmoid(z + bias) - t[i];
      for (let j = 0; j < d; j++) grad[j] += (err * F[k + j]) / n;
      gradBias += err / n;
    }
    for (let j = 0; j < d; j++) w[j] -= lr * grad[j];
    bias -= lr * gradBias;
  }
  return Array.from({ length: n }, (_, i) => stableSigmoid(score(i)));
}

export function ipw(data, covariates = ['z'], { clip = 0.01, lr = 0.5, iters = 800 } = {}) {
  const rows = rowsOf(data);
  arms(rows);
  const getters = covariates.map(covariateGetter);
  const X = rows.map(r => getters.map(g => g(r)));
  const e = fitPropensity(X, rows.map(r => r.t), { lr, iters }).map(p => Math.min(1 - clip, Math.max(clip, p)));
  const w = rows.map((r, i) => (r.t ? 1 / e[i] : 1 / (1 - e[i])));
  const n = rows.length;
  let s1 = 0, sy1 = 0, s0 = 0, sy0 = 0;
  rows.forEach((r, i) => { if (r.t) { s1 += w[i]; sy1 += w[i] * r.y; } else { s0 += w[i]; sy0 += w[i] * r.y; } });
  const mu1 = sy1 / s1, mu0 = sy0 / s0;
  const m1 = s1 / n, m0 = s0 / n;
  let ss = 0;
  rows.forEach((r, i) => {
    const psi = r.t ? (w[i] * (r.y - mu1)) / m1 : -(w[i] * (r.y - mu0)) / m0;
    ss += psi * psi;
  });
  const sumW = w.reduce((a, b) => a + b, 0), sumW2 = w.reduce((a, b) => a + b * b, 0);
  return result('inverse propensity weighting', mu1 - mu0, Math.sqrt(ss) / n, data, {
    propensity: e, maxWeight: Math.max(...w), effectiveN: (sumW * sumW) / sumW2,
  });
}

export function badControl(data, covariates = ['z']) {
  const rows = rowsOf(data);
  if (!rows.every(r => typeof r.c === 'number')) throw new Error('causal: badControl needs the collider column c (makeCausalData with collider: true)');
  return { ...regressionAdjust(data, [...covariates, 'c']), method: 'bad control' };
}

export function compareEstimators(data, { bins = 5, covariates = ['z'] } = {}) {
  const out = [naiveDiff(data), stratified(data, bins), regressionAdjust(data, covariates), ipw(data, covariates)];
  if (rowsOf(data).every(r => typeof r.c === 'number')) out.push(badControl(data, covariates));
  return out;
}

// ---- Experiment design -----------------------------------------------------------------------

// Standard normal cdf: x * series around 0 (Mills form), accurate to ~1e-15, then clamped far in the tails.
export function normCdf(x) {
  if (x <= -8.5) return 0;
  if (x >= 8.5) return 1;
  let term = x, sum = x;
  for (let k = 1; k < 400 && Math.abs(term) > 1e-18; k++) {
    term *= (x * x) / (2 * k + 1);
    sum += term;
  }
  return Math.min(1, Math.max(0, 0.5 + (Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)) * sum));
}

export function normQuantile(p) {
  if (!(p > 0 && p < 1)) throw new Error('causal: normQuantile needs 0 < p < 1');
  let lo = -9, hi = 9;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (normCdf(mid) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function checkDesign({ effect, sd, alpha }) {
  if (!(sd > 0)) throw new Error('causal: sd must be positive');
  if (!(alpha > 0 && alpha < 1)) throw new Error('causal: alpha must be in (0, 1)');
  if (typeof effect !== 'number' || Number.isNaN(effect)) throw new Error('causal: effect must be a number');
}

export function powerTwoSample({ effect, sd, n, alpha = 0.05 }) {
  checkDesign({ effect, sd, alpha });
  if (!(n > 0)) throw new Error('causal: n must be positive');
  const z = normQuantile(1 - alpha / 2);
  const shift = effect / (sd * Math.sqrt(2 / n));
  return normCdf(shift - z) + normCdf(-shift - z);
}

export function sampleSize({ effect, sd, power = 0.8, alpha = 0.05 }) {
  checkDesign({ effect, sd, alpha });
  if (effect === 0) throw new Error('causal: a zero effect needs infinitely many people');
  if (!(power > 0 && power < 1)) throw new Error('causal: power must be in (0, 1)');
  const z = normQuantile(1 - alpha / 2) + normQuantile(power);
  // The tiny subtraction keeps a value that is a whole number up to rounding noise from rounding UP.
  return Math.ceil((2 * z * z * sd * sd) / (effect * effect) - 1e-9);
}

export function minDetectableEffect({ sd, n, power = 0.8, alpha = 0.05 }) {
  checkDesign({ effect: 0, sd, alpha });
  return (normQuantile(1 - alpha / 2) + normQuantile(power)) * sd * Math.sqrt(2 / n);
}

export function simulatePower({ effect, sd = 1, n, alpha = 0.05, runs = 2000, seed = 1 }) {
  checkDesign({ effect, sd, alpha });
  if (!(n >= 2)) throw new Error('causal: n must be at least 2 per group');
  const random = rng(seed), z = normQuantile(1 - alpha / 2);
  let rejections = 0;
  for (let r = 0; r < runs; r++) {
    let s1 = 0, q1 = 0, s0 = 0, q0 = 0;
    for (let i = 0; i < n; i++) {
      const a = effect + sd * gauss(random), b = sd * gauss(random);
      s1 += a; q1 += a * a; s0 += b; q0 += b * b;
    }
    const v1 = (q1 - (s1 * s1) / n) / (n - 1), v0 = (q0 - (s0 * s0) / n) / (n - 1);
    const se = Math.sqrt((v1 + v0) / n);
    if (se > 0 && Math.abs((s1 - s0) / n / se) > z) rejections++;
  }
  const power = rejections / runs;
  return { power, rejections, runs, mcse: Math.sqrt((power * (1 - power)) / runs) };
}

export function peekingFalsePositiveRate({ looks = 5, n = 200, alpha = 0.05, runs = 2000, seed = 1, sd = 1, correction = 'none' } = {}) {
  checkDesign({ effect: 0, sd, alpha });
  if (!(looks >= 1) || !(n >= looks)) throw new Error('causal: need 1 <= looks <= n');
  if (correction !== 'none' && correction !== 'bonferroni') throw new Error('causal: correction is "none" or "bonferroni"');
  const random = rng(seed);
  const perLook = correction === 'bonferroni' ? alpha / looks : alpha;
  const threshold = normQuantile(1 - perLook / 2), finalThreshold = normQuantile(1 - alpha / 2);
  // Look k happens after round(k * n / looks) people per arm.
  const checkpoints = Array.from({ length: looks }, (_, k) => Math.round(((k + 1) * n) / looks));
  let stopped = 0, finalHits = 0;
  for (let r = 0; r < runs; r++) {
    let diffSum = 0, seen = 0, next = 0, hit = false, lastZ = 0;
    for (let i = 1; i <= n; i++) {
      diffSum += sd * (gauss(random) - gauss(random));
      seen = i;
      if (i === checkpoints[next]) {
        lastZ = diffSum / (sd * Math.sqrt(2 * seen));
        if (Math.abs(lastZ) > threshold) hit = true;
        next++;
      }
    }
    if (hit) stopped++;
    if (Math.abs(lastZ) > finalThreshold) finalHits++;
  }
  const rate = stopped / runs;
  return { rate, singleLookRate: finalHits / runs, looks, n, alpha, runs, threshold, inflation: rate / alpha };
}
