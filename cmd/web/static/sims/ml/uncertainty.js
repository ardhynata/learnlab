// Probability and statistical uncertainty: Bayes' rule in natural frequencies, repeated sampling of a
// metric, the standard error, the bootstrap, percentile confidence intervals and an honest check of
// how often such an interval contains the truth. Pure functions, tested in uncertainty.test.js.
// Everything random takes a seed and uses rng() from sims/ml/rng.js, so a run can be repeated exactly.
//
// API
//   bayes(prior, sensitivity, specificity, { n = 10000 } = {})
//       -> { prior, sensitivity, specificity, pPositive, posterior, negativePosterior, table }
//       posterior          P(condition | positive test), from Bayes' rule (exact, not rounded)
//       negativePosterior  P(condition | negative test)
//       table              the same story as counts out of n people: { n, condition, noCondition,
//                          truePositive, falseNegative, falsePositive, trueNegative, positives,
//                          negatives, posterior } where posterior = truePositive / positives
//                          (equal to the exact one up to the rounding of the counts).
//       Throws RangeError unless prior is in [0, 1] and sensitivity and specificity are in [0, 1].
//   makePopulation({ n, accuracy, seed }) -> array of n flags, 1 = "the model was right", 0 = wrong.
//       Exactly round(n * accuracy) ones, in a seeded random order, so trueAccuracy(pop) is known
//       exactly (it is that count / n, with no sampling noise) and the same for every seed.
//   trueAccuracy(pop) -> the mean of the flags (the number every sample tries to estimate)
//   samplesOf(pop, n, times, seed) -> array of `times` means; each is the mean of n values drawn from
//       pop WITH replacement (every draw is independent, like asking n fresh cases of the same model).
//   standardError(values) -> sample standard deviation (n - 1) / sqrt(n); NaN for fewer than 2 values.
//   binomialSE(p, n) -> sqrt(p (1 - p) / n), the textbook standard error of an accuracy measured on n cases.
//   bootstrapMeans(values, B, seed) -> array of B means of resamples of `values` (with replacement,
//       same size as values): the "what if I had drawn this sample again?" distribution.
//   percentile(values, q) -> the q-quantile (0..1) by linear interpolation between sorted neighbours.
//   percentileCI(values, alpha = 0.05) -> [low, high], the alpha/2 and 1 - alpha/2 percentiles.
//   coverageRuns({ pop, n, B, experiments, alpha, seed }) -> one record per experiment:
//       { mean, lo, hi, covered } for a fresh sample of n, its bootstrap interval, and whether the
//       interval holds trueAccuracy(pop).
//   coverage({ pop, n, B, experiments, alpha, seed }) -> fraction of experiments that covered.
//
// Why coverage is near 1 - alpha but not exactly 1 - alpha. A 95% interval promises 95% only under
// idealised conditions, and this one (the percentile bootstrap) is approximate: (1) it resamples the
// one sample in hand, whose spread is only an estimate of the population's, and a bootstrap resample's
// variance is (n - 1) / n of the sample's, so the interval comes out slightly too narrow; (2) with a small
// n the means sit on a coarse grid (k / n for 0/1 flags) and the distribution is skewed when accuracy is
// near 0 or 1, which the symmetric-looking percentile recipe handles poorly; (3) B resamples and
// `experiments` repeats are finite, so the measured fraction itself wobbles by about
// sqrt(0.95 * 0.05 / experiments). The effect: small samples undercover (the interval is too confident),
// and the fraction climbs towards 1 - alpha as n grows. At n = 200 it is within a couple of points.

import { rng, shuffle } from './rng.js';

const inUnit = x => typeof x === 'number' && x >= 0 && x <= 1;

// ---------- Bayes' rule ----------

export function bayes(prior, sensitivity, specificity, { n = 10000 } = {}) {
  if (!inUnit(prior)) throw new RangeError('prior must be a number in [0, 1]');
  if (!inUnit(sensitivity)) throw new RangeError('sensitivity must be a number in [0, 1]');
  if (!inUnit(specificity)) throw new RangeError('specificity must be a number in [0, 1]');
  const falsePositiveRate = 1 - specificity;
  const pPositive = prior * sensitivity + (1 - prior) * falsePositiveRate;
  const pNegative = 1 - pPositive;
  const posterior = pPositive > 0 ? (prior * sensitivity) / pPositive : NaN;
  const negativePosterior = pNegative > 0 ? (prior * (1 - sensitivity)) / pNegative : NaN;

  const condition = Math.round(n * prior);
  const noCondition = n - condition;
  const truePositive = Math.round(condition * sensitivity);
  const falsePositive = Math.round(noCondition * falsePositiveRate);
  const positives = truePositive + falsePositive;
  const table = {
    n, condition, noCondition,
    truePositive, falseNegative: condition - truePositive,
    falsePositive, trueNegative: noCondition - falsePositive,
    positives, negatives: n - positives,
    posterior: positives > 0 ? truePositive / positives : NaN,
  };
  return { prior, sensitivity, specificity, pPositive, posterior, negativePosterior, table };
}

// ---------- a population of right/wrong flags ----------

export function makePopulation({ n, accuracy, seed = 1 }) {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  if (!inUnit(accuracy)) throw new RangeError('accuracy must be a number in [0, 1]');
  const ones = Math.round(n * accuracy);
  const flags = Array.from({ length: n }, (_, i) => (i < ones ? 1 : 0));
  return shuffle(flags, rng(seed));
}

export function mean(values) {
  if (!values.length) return NaN;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

export const trueAccuracy = mean;

// Mean of n draws (with replacement) from values, using the given random() function.
function drawMean(values, n, random) {
  const len = values.length;
  let s = 0;
  for (let i = 0; i < n; i++) s += values[Math.floor(random() * len)];
  return s / n;
}

function checkSampling(values, n, times, what) {
  if (!values.length) throw new RangeError('cannot sample from an empty list');
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  if (!Number.isInteger(times) || times < 1) throw new RangeError(`${what} must be a positive integer`);
}

export function samplesOf(pop, n, times, seed = 1) {
  checkSampling(pop, n, times, 'times');
  const random = rng(seed);
  return Array.from({ length: times }, () => drawMean(pop, n, random));
}

// ---------- spread of a metric ----------

export function standardError(values) {
  const n = values.length;
  if (n < 2) return NaN;
  const m = mean(values);
  let ss = 0;
  for (const v of values) ss += (v - m) ** 2;
  return Math.sqrt(ss / (n - 1)) / Math.sqrt(n);
}

export function binomialSE(p, n) {
  return Math.sqrt((p * (1 - p)) / n);
}

// ---------- bootstrap ----------

export function bootstrapMeans(values, B, seed = 1) {
  checkSampling(values, values.length, B, 'B');
  const random = rng(seed);
  return Array.from({ length: B }, () => drawMean(values, values.length, random));
}

export function percentile(values, q) {
  if (!values.length) return NaN;
  if (!(q >= 0 && q <= 1)) throw new RangeError('q must be in [0, 1]');
  const s = values.slice().sort((a, b) => a - b);
  const pos = q * (s.length - 1);
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (pos - lo) * (s[hi] - s[lo]);
}

export function percentileCI(values, alpha = 0.05) {
  if (!(alpha > 0 && alpha < 1)) throw new RangeError('alpha must be in (0, 1)');
  return [percentile(values, alpha / 2), percentile(values, 1 - alpha / 2)];
}

// ---------- does the interval keep its promise? ----------

export function coverageRuns({ pop, n, B = 500, experiments = 200, alpha = 0.05, seed = 1 }) {
  checkSampling(pop, n, experiments, 'experiments');
  if (!Number.isInteger(B) || B < 1) throw new RangeError('B must be a positive integer');
  const truth = mean(pop);
  const random = rng(seed);
  const runs = [];
  for (let e = 0; e < experiments; e++) {
    const sample = Array.from({ length: n }, () => pop[Math.floor(random() * pop.length)]);
    const means = Array.from({ length: B }, () => drawMean(sample, n, random));
    const [lo, hi] = percentileCI(means, alpha);
    runs.push({ mean: mean(sample), lo, hi, covered: lo <= truth && truth <= hi });
  }
  return runs;
}

export function coverage(opts) {
  const runs = coverageRuns(opts);
  return runs.filter(r => r.covered).length / runs.length;
}
