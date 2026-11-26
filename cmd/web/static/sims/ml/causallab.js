// Pure helpers for the causal lab (sims/labs/causal-lab.js): the controls turned into one confounded study, the
// estimators worked out on it, the repeated-experiments summary, the power curve and the peeking curve, and the
// verdict of the Quick Quiz. The data generator and the estimators are in causal.js; this file only prepares
// inputs for them and turns their numbers into rows and verdicts. Tested in causallab.test.js.
//
//   DEFAULTS, RANGES, REPEATS, ESTIMATOR_IDS     the lab's start state, slider ranges, studies per repeat run,
//                                                the six estimators in table order
//   dataParams(v)                                controls -> makeCausalData options (unmeasured toggle -> strength 1,
//                                                the seed is scrambled so the next seed is a different population)
//   computeStudy(v, rctSeed)                     -> { data, rct, rows, ate }: one observational study, its randomized
//                                                replica on the SAME people, and one row per estimator:
//                                                { id, available, estimate, se, ci, error, covers } (error = estimate -
//                                                the true average effect of this sample; unavailable rows say why)
//   fitLines(data)                               -> { naive: { treated, control }, adjusted: { a, b, effect }, truth }
//                                                the picture behind the numbers: the two arm means, the parallel
//                                                fitted lines of regression adjustment, the true outcome lines
//   predictVerdict({ naiveError, naiveSe, rctError, rctSe })  -> 'naive' | 'rct' | 'same'
//   runStudy(v, i)                               -> one repeated study i: { estimates, covers } per estimator id
//   summarizeRepeats(runs, truth)                -> per estimator { id, count, mean, bias, sd, mcse, rmse, coverage, biased }
//   isBiased(bias, mcse)                         true when the average error is clearly not noise
//   powerCurve({ effect, sd, alpha, n })         -> { xs, ys, power, nFor80, mde, xMax } for two equal groups
//   peekingCurve({ n, alpha, maxLooks, runs, seed, sd })
//                                                -> { looks, peek, bonferroni, alpha }: with NO true effect, the share
//                                                of runs that wrongly stop "significant" when the result is checked
//                                                `looks` times (same random stream as causal.js peekingFalsePositiveRate)
import {
  makeCausalData, randomize, naiveDiff, stratified, regressionAdjust, ipw, badControl, powerTwoSample, sampleSize,
  minDetectableEffect, normQuantile,
} from './causal.js';
import { rng, gauss } from './rng.js';

export const DEFAULTS = {
  seed: 7, confounding: 1.5, effect: 2, heterogeneity: 0, overlap: 1, n: 400, unmeasured: false, collider: false,
  view: 'observed', designEffect: 0.5, designSd: 1, designN: 50, alpha: 0.05, peeking: false, looks: 5,
};
export const RANGES = {
  confounding: { min: 0, max: 3, step: 0.1 },
  effect: { min: 0, max: 4, step: 0.1 },
  heterogeneity: { min: 0, max: 2, step: 0.1 },
  overlap: { min: 0.1, max: 1, step: 0.05 },
  n: { min: 100, max: 2000, step: 50 },
  seed: { min: 1, max: 9999, step: 1 },
  designEffect: { min: 0.1, max: 1.5, step: 0.05 },
  designSd: { min: 0.5, max: 3, step: 0.1 },
  designN: { min: 10, max: 500, step: 10 },
  alpha: { min: 0.01, max: 0.2, step: 0.01 },
  looks: { min: 2, max: 10, step: 1 },
};
export const REPEATS = 200;
export const ESTIMATOR_IDS = ['naive', 'stratified', 'regression', 'ipw', 'collider', 'randomized'];
// The untreated outcome the generator uses (causal.js: y0 = 1 + 2 z + ...), so the lab can draw the true lines.
export const BASELINE = { intercept: 1, slope: 2 };
// The inverse-propensity fit is the slow part. One study on screen can afford the careful fit; the repeated runs use
// a faster one that lands on the same propensities (checked in the tests).
export const IPW_SINGLE = { iters: 200, lr: 1 };
export const IPW_REPEAT = { iters: 100, lr: 2 };

// A small seed (1, 2, 3...) goes through a multiplicative hash: the generator in rng.js gives nearly the same first
// draws for neighbouring seeds, and a "new population" must not look like the old one.
export const scramble = seed => (Math.imul(Math.round(seed) + 1, 2654435761) ^ 0x9e3779b9) >>> 0;

export function dataParams(v) {
  return {
    n: v.n, seed: scramble(v.seed), confounding: v.confounding, effect: v.effect, heterogeneity: v.heterogeneity,
    overlap: v.overlap, unmeasured: v.unmeasured ? 1 : 0, collider: Boolean(v.collider),
  };
}

// ---- one study ---------------------------------------------------------------------------------

// One estimator on one study. A study the estimator cannot be worked out on (an arm is empty, there is no collider
// column) gives an unavailable row instead of an exception, so one bad setting never blanks the table.
function estimatorRow(id, data, rct, ipwOptions) {
  let r;
  try {
    if (id === 'naive') r = naiveDiff(data);
    else if (id === 'stratified') r = stratified(data, 5);
    else if (id === 'regression') r = regressionAdjust(data, ['z']);
    else if (id === 'ipw') r = ipw(data, ['z'], ipwOptions);
    else if (id === 'collider') { if (!data.params.collider) return { id, available: false, reason: 'off' }; r = badControl(data, ['z']); }
    else r = naiveDiff(rct);
  } catch (e) {
    return { id, available: false, reason: String(e.message ?? e) };
  }
  return { id, available: true, estimate: r.estimate, se: r.se, ci: r.ci, error: r.bias, covers: r.covers, n: r.n };
}

export function computeStudy(v, rctSeed = 1) {
  const data = makeCausalData(dataParams(v));
  const rct = randomize(data, scramble(rctSeed));
  return { data, rct, ate: data.ate, rows: ESTIMATOR_IDS.map(id => estimatorRow(id, data, rct, IPW_SINGLE)) };
}

// The three effects of the plot, in data coordinates. `adjusted` is regression adjustment on z: two PARALLEL lines,
// y = a + b (z - zbar) for the control and the same plus `effect` for the treated. `truth` are the two lines the
// generator draws outcomes from (without and with treatment); the gap between them is the true effect at that z.
export function fitLines(data) {
  const rows = data.rows;
  let naive = null, adjusted = null;
  try {
    const nd = naiveDiff(data);
    naive = { treated: nd.meanTreated, control: nd.meanControl };
    const fit = regressionAdjust(data, ['z']);
    const zbar = rows.reduce((s, r) => s + r.z, 0) / rows.length;
    const b = fit.coefficients[2];
    adjusted = { a: fit.coefficients[0] - b * zbar, b, effect: fit.coefficients[1] };
  } catch { /* one arm is empty: nothing to draw */ }
  const p = data.params;
  return {
    naive, adjusted,
    truth: { control: { a: BASELINE.intercept, b: BASELINE.slope }, treated: { a: BASELINE.intercept + p.effect, b: BASELINE.slope + p.heterogeneity } },
  };
}

// Quick Quiz: which of the two was closer to the truth, judged on the actual errors. A gap smaller than the larger
// standard error is no gap (confounding near zero makes the two agree), so the verdict is "same".
export function predictVerdict({ naiveError, naiveSe, rctError, rctSe }) {
  const a = Math.abs(naiveError), b = Math.abs(rctError);
  if (Math.abs(a - b) < Math.max(naiveSe, rctSe)) return 'same';
  return a < b ? 'naive' : 'rct';
}

// ---- repeated studies --------------------------------------------------------------------------

export const repeatSeed = (base, i) => (Math.imul(i + 1, 2654435761) + Math.imul(Math.round(base), 40503)) >>> 0;

export function runStudy(v, i) {
  const seed = repeatSeed(v.seed, i);
  const data = makeCausalData({ ...dataParams(v), seed });
  const rct = randomize(data, repeatSeed(v.seed + 5000, i));
  const estimates = {}, covers = {};
  for (const id of ESTIMATOR_IDS) {
    const row = estimatorRow(id, data, rct, IPW_REPEAT);
    estimates[id] = row.available ? row.estimate : null;
    covers[id] = row.available ? row.covers : null;
  }
  return { estimates, covers };
}

// The average error counts as bias when it is clearly bigger than the noise of the average (3 Monte-Carlo standard
// errors) and big enough to matter (0.1 outcome units; the outcome noise has sd 1).
export const isBiased = (bias, mcse) => Math.abs(bias) > Math.max(3 * mcse, 0.1);

export function summarizeRepeats(runs, truth) {
  return ESTIMATOR_IDS.map(id => {
    const xs = runs.map(r => r.estimates[id]).filter(x => typeof x === 'number' && Number.isFinite(x));
    const count = xs.length;
    if (!count) return { id, count: 0, mean: NaN, bias: NaN, sd: NaN, mcse: NaN, rmse: NaN, coverage: NaN, biased: false, xs };
    const mean = xs.reduce((a, b) => a + b, 0) / count;
    const sd = count > 1 ? Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (count - 1)) : 0;
    const mcse = sd / Math.sqrt(count);
    const hits = runs.map(r => r.covers[id]).filter(c => c != null);
    const bias = mean - truth;
    return {
      id, count, mean, bias, sd, mcse, xs,
      rmse: Math.sqrt(xs.reduce((s, x) => s + (x - truth) ** 2, 0) / count),
      coverage: hits.length ? hits.filter(Boolean).length / hits.length : NaN,
      biased: isBiased(bias, mcse),
    };
  });
}

// ---- power and peeking -------------------------------------------------------------------------

// Power against the size of EACH of two equal groups (normal approximation, causal.js). The chart reaches 60 percent
// past the size that gives 80 percent power (or past the current size), at least 60 and at most 1000.
export function powerCurve({ effect, sd, alpha, n }) {
  const nFor80 = sampleSize({ effect, sd, alpha });
  const reach = Math.max(Number.isFinite(nFor80) ? nFor80 * 1.6 : 0, n * 1.3, 60);
  const xMax = Math.min(1000, Math.ceil(reach / 10) * 10);
  const step = Math.max(1, Math.floor(xMax / 80));
  const xs = [], ys = [];
  for (let m = 2; m <= xMax; m += step) { xs.push(m); ys.push(powerTwoSample({ effect, sd, n: m, alpha })); }
  return { xs, ys, power: powerTwoSample({ effect, sd, n, alpha }), nFor80, mde: minDetectableEffect({ sd, n, alpha }), xMax };
}

// With NO true effect, n people per group arrive in `looks` equal batches and the experiment stops at the first look
// with |z| above the threshold. One pass per run keeps the running z at every size, then every number of looks is
// read from it, so the whole curve costs one pass. The random stream is the one peekingFalsePositiveRate in causal.js
// uses, so looks = k gives exactly its rate for the same seed (tested).
export function peekingCurve({ n = 100, alpha = 0.05, maxLooks = 10, runs = 1000, seed = 1, sd = 1 } = {}) {
  const top = Math.max(1, Math.min(Math.floor(maxLooks), Math.floor(n)));
  const random = rng(seed);
  const zAt = new Float64Array(n + 1);
  const thr = Array.from({ length: top }, (_, i) => normQuantile(1 - alpha / (i + 1) / 2));    // Bonferroni per look
  const plain = normQuantile(1 - alpha / 2);
  const peekHits = new Array(top).fill(0), bonfHits = new Array(top).fill(0);
  for (let r = 0; r < runs; r++) {
    let sum = 0;
    for (let i = 1; i <= n; i++) { sum += sd * (gauss(random) - gauss(random)); zAt[i] = sum / (sd * Math.sqrt(2 * i)); }
    for (let k = 1; k <= top; k++) {
      let any = false, anyB = false;
      for (let j = 1; j <= k; j++) {
        const z = Math.abs(zAt[Math.round((j * n) / k)]);
        if (z > plain) any = true;
        if (z > thr[k - 1]) anyB = true;
      }
      if (any) peekHits[k - 1]++;
      if (anyB) bonfHits[k - 1]++;
    }
  }
  return {
    looks: Array.from({ length: top }, (_, i) => i + 1), alpha, runs, n,
    peek: peekHits.map(h => h / runs), bonferroni: bonfHits.map(h => h / runs),
  };
}
