// The pure side of the bootstrap lab (sims/labs/bootstrap-lab.js): the two fixed populations of right/wrong
// flags, a seed scrambler, batches of samples that also keep their last sample, histogram bins that line up
// with the k / n grid sample accuracies live on, and the theory numbers the lab quotes. Tested in
// bootstraplab.test.js. The sampling and bootstrap math itself is in sims/ml/uncertainty.js.
import { makePopulation, mean, binomialSE } from './uncertainty.js';
import { classify } from './knn.js';
import { rng } from './rng.js';

export const POP_SIZE = 5000;
export const GENERATED_ACCURACY = 0.85;    // exactly 4,250 of the 5,000 flags are 1
export const GENERATED_SEED = 11;
export const PENGUIN_K = 5;
export const PENGUIN_FEATURES = ['flipper_length_mm', 'body_mass_g'];

// The generated population: 5,000 cases, 85% of them answered correctly, in a seeded order.
export function generatedPopulation() {
  return makePopulation({ n: POP_SIZE, accuracy: GENERATED_ACCURACY, seed: GENERATED_SEED });
}

// A fixed, deterministic population from the penguins table. The "model" is a k-nearest-neighbors classifier
// of species (k = 5) on the standardized flipper length and body mass, and every penguin is classified from
// all the OTHER penguins (leave one out), so a penguin never votes for itself. The population is one flag
// per penguin: 1 when that classification is right. A row with a missing value (NA) in either measurement
// cannot be classified and is left out; `dropped` counts them so the lab can say so.
export function penguinPopulation(table, k = PENGUIN_K) {
  const rows = table.rows.filter(r => PENGUIN_FEATURES.every(f => typeof r[f] === 'number' && Number.isFinite(r[f])) && typeof r.species === 'string');
  const raw = rows.map(r => PENGUIN_FEATURES.map(f => r[f]));
  const mu = PENGUIN_FEATURES.map((_, j) => mean(raw.map(x => x[j])));
  const sd = PENGUIN_FEATURES.map((_, j) => Math.sqrt(mean(raw.map(x => (x[j] - mu[j]) ** 2))) || 1);
  const points = raw.map((x, i) => ({ features: x.map((v, j) => (v - mu[j]) / sd[j]), label: rows[i].species }));
  const flags = points.map((p, i) => (classify(points.filter((_, j) => j !== i), p, k).label === p.label ? 1 : 0));
  return { flags, total: table.rows.length, kept: rows.length, dropped: table.rows.length - rows.length, k, accuracy: mean(flags) };
}

// Mixes a base seed and a counter into a seed for the LCG in rng.js. Adjacent seeds give nearly the same first
// numbers from that generator, so seed + 1 would make successive draws look alike; this scrambles first.
export function scrambleSeed(base, counter) {
  let h = (Math.imul(base | 0, 0x9E3779B1) + Math.imul((counter | 0) + 1, 0x85EBCA6B)) | 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85EBCA6B);
  h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35);
  h ^= h >>> 16;
  return h >>> 0;
}

// `times` samples of n cases each, drawn with replacement from pop. Returns the accuracy of every sample and
// the flags of the LAST sample (the one the bootstrap panel resamples).
export function drawBatch(pop, n, times, seed) {
  if (!pop.length) throw new RangeError('cannot sample from an empty population');
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  if (!Number.isInteger(times) || times < 1) throw new RangeError('times must be a positive integer');
  const random = rng(seed);
  const means = [];
  let last = null;
  for (let t = 0; t < times; t++) {
    const flags = new Array(n);
    let s = 0;
    for (let i = 0; i < n; i++) { const v = pop[Math.floor(random() * pop.length)]; flags[i] = v; s += v; }
    means.push(s / n);
    last = flags;
  }
  return { means, last };
}

// Sample standard deviation (n - 1) of a list; NaN for fewer than two values. For sample accuracies this is the
// observed standard error of an accuracy.
export function sampleSd(values) {
  if (values.length < 2) return NaN;
  const m = mean(values);
  let ss = 0;
  for (const v of values) ss += (v - m) ** 2;
  return Math.sqrt(ss / (values.length - 1));
}

// Histogram bins for accuracies of n cases on a fixed axis [lo, hi]. A sample accuracy is k / n, so a bin
// holds a whole number m of those values (about 100 bins across the axis, at least one value per bin);
// bin j holds the counts start + j * m up to start + (j + 1) * m - 1. Counts outside the axis go in the end bins.
export function binSpec(n, lo, hi) {
  const m = Math.max(1, Math.round(n * (hi - lo) / 100));
  const start = Math.floor(Math.floor(lo * n) / m) * m;
  const last = Math.ceil(hi * n);
  const bins = Math.floor((last - start) / m) + 1;
  // The bar for bin j spans accuracies from (start + j m - 0.5) / n to (start + (j + 1) m - 0.5) / n, so each
  // possible accuracy sits in the middle of the bar that holds it.
  return { n, m, start, bins, left: j => (start + j * m - 0.5) / n, right: j => (start + (j + 1) * m - 0.5) / n };
}

// Share of the accuracies in each bin (0..1). `values` are accuracies of n cases.
export function histogram(values, spec) {
  const counts = new Array(spec.bins).fill(0);
  for (const v of values) {
    const j = Math.min(spec.bins - 1, Math.max(0, Math.floor((Math.round(v * spec.n) - spec.start) / spec.m)));
    counts[j] += 1;
  }
  return values.length ? counts.map(c => c / values.length) : counts;
}

// Half-width of the middle 95% of sample accuracies, on average, for an accuracy p measured on n cases:
// 1.96 standard errors. Quadruple n and it halves.
export function bandHalfWidth(p, n) { return 1.96 * binomialSE(p, n); }

// Which two of the sample sizes the learner has tried are about four times apart? Returns [small, large] with
// the ratio closest to 4 inside [3.5, 4.6], or null. Used to hold back the verdict of the "quadruple n" quiz
// until the learner has actually looked at both.
export function quadruplePair(sizes) {
  let best = null;
  for (const a of sizes) for (const b of sizes) {
    const r = b / a;
    if (r >= 3.5 && r <= 4.6 && (!best || Math.abs(r - 4) < Math.abs(best[1] / best[0] - 4))) best = [a, b];
  }
  return best;
}
