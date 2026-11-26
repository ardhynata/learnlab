import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bayes, makePopulation, trueAccuracy, samplesOf, standardError, binomialSE, bootstrapMeans,
  percentile, percentileCI, coverageRuns, coverage, mean,
} from './uncertainty.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

test('Bayes: 1% prevalence, 90% sensitivity, 95% specificity gives a 15.4% posterior', () => {
  const r = bayes(0.01, 0.9, 0.95);
  // P(positive) = 0.01 * 0.90 + 0.99 * 0.05 = 0.009 + 0.0495 = 0.0585; posterior = 0.009 / 0.0585 = 2/13.
  close(r.pPositive, 0.0585);
  close(r.posterior, 0.009 / 0.0585);
  assert.equal(r.posterior.toFixed(3), '0.154');
  // A negative test: 0.01 * 0.10 / (1 - 0.0585) = 0.001 / 0.9415.
  close(r.negativePosterior, 0.001 / 0.9415);
});

test('Bayes natural-frequency table: counts out of 10000 add up and give the same posterior', () => {
  const t = bayes(0.01, 0.9, 0.95).table;
  assert.deepEqual(
    { n: t.n, condition: t.condition, noCondition: t.noCondition, truePositive: t.truePositive, falseNegative: t.falseNegative, falsePositive: t.falsePositive, trueNegative: t.trueNegative, positives: t.positives, negatives: t.negatives },
    { n: 10000, condition: 100, noCondition: 9900, truePositive: 90, falseNegative: 10, falsePositive: 495, trueNegative: 9405, positives: 585, negatives: 9415 });
  close(t.posterior, 90 / 585);
  assert.equal(t.truePositive + t.falseNegative + t.falsePositive + t.trueNegative, t.n);
  const small = bayes(0.01, 0.9, 0.95, { n: 1000 }).table;
  assert.equal(small.condition, 10);
  assert.equal(small.truePositive, 9);
  assert.equal(small.falsePositive, 50); // 49.5 rounds up
});

test('Bayes: a perfect test, a useless test, and invalid input', () => {
  assert.equal(bayes(0.01, 1, 1).posterior, 1);
  close(bayes(0.2, 0.7, 0.3).posterior, 0.2); // sensitivity = 1 - specificity: a positive tells nothing
  assert.ok(Number.isNaN(bayes(0, 0.9, 1).posterior)); // no positives are possible
  assert.throws(() => bayes(1.2, 0.9, 0.9), RangeError);
  assert.throws(() => bayes(0.1, -0.1, 0.9), RangeError);
  assert.throws(() => bayes(0.1, 0.9, NaN), RangeError);
});

test('a population has the exact true accuracy, whatever the seed, and is reproducible', () => {
  const a = makePopulation({ n: 1000, accuracy: 0.85, seed: 3 });
  assert.equal(a.length, 1000);
  assert.equal(a.filter(v => v === 1).length, 850);
  assert.ok(a.every(v => v === 0 || v === 1));
  assert.equal(trueAccuracy(a), 0.85);
  assert.deepEqual(a, makePopulation({ n: 1000, accuracy: 0.85, seed: 3 }));
  const b = makePopulation({ n: 1000, accuracy: 0.85, seed: 4 });
  assert.equal(trueAccuracy(b), 0.85);
  assert.notDeepEqual(a, b);
  assert.equal(trueAccuracy(makePopulation({ n: 7, accuracy: 0.5 })), 4 / 7); // 3.5 rounds to 4 ones
  assert.throws(() => makePopulation({ n: 0, accuracy: 0.5 }), RangeError);
  assert.throws(() => makePopulation({ n: 10, accuracy: 1.5 }), RangeError);
});

test('samplesOf gives one mean per repeat, reproducibly, and the means centre on the truth', () => {
  const pop = makePopulation({ n: 2000, accuracy: 0.8, seed: 1 });
  const s = samplesOf(pop, 100, 2000, 5);
  assert.equal(s.length, 2000);
  assert.deepEqual(s, samplesOf(pop, 100, 2000, 5));
  assert.ok(s.every(v => v >= 0 && v <= 1));
  assert.ok(Math.abs(mean(s) - 0.8) < 0.01, `mean of sample means ${mean(s)}`);
  assert.deepEqual(samplesOf([1, 1, 1], 5, 3), [1, 1, 1]); // no spread in the population, none in the samples
  assert.throws(() => samplesOf([], 5, 3), RangeError);
  assert.throws(() => samplesOf(pop, 0, 3), RangeError);
});

test('the spread of the sample means matches the textbook standard error, and shrinks as 1/sqrt(n)', () => {
  const pop = makePopulation({ n: 5000, accuracy: 0.8, seed: 7 });
  const at = n => standardError(samplesOf(pop, n, 3000, 11));
  // sqrt(0.8 * 0.2 / 100) = 0.04 and sqrt(0.8 * 0.2 / 400) = 0.02
  close(binomialSE(0.8, 100), 0.04);
  assert.ok(Math.abs(at(100) * Math.sqrt(3000) - 0.04) < 0.004, 'sd of means near 0.04 at n = 100');
  const ratio = at(100) / at(400);
  assert.ok(ratio > 1.8 && ratio < 2.2, `quadrupling n halves the spread, got ratio ${ratio}`);
});

test('standardError of a known sample: sd (n - 1) over sqrt(n)', () => {
  // 2 4 4 4 5 5 7 9: the squared deviations from the mean 5 add up to 32, so the sample variance is 32 / 7.
  close(standardError([2, 4, 4, 4, 5, 5, 7, 9]), Math.sqrt(32 / 7) / Math.sqrt(8));
  close(standardError([1, 3]), 1); // sd = sqrt(2), over sqrt(2)
  assert.equal(standardError([5, 5, 5]), 0);
  assert.ok(Number.isNaN(standardError([5])));
  assert.ok(Number.isNaN(standardError([])));
});

test('percentile interpolates between the sorted neighbours', () => {
  const xs = [5, 1, 4, 2, 3]; // sorted: 1 2 3 4 5; position = q * 4
  assert.equal(percentile(xs, 0), 1);
  assert.equal(percentile(xs, 0.25), 2);
  assert.equal(percentile(xs, 0.5), 3);
  assert.equal(percentile(xs, 1), 5);
  close(percentile(xs, 0.1), 1.4);   // position 0.4, between 1 and 2
  close(percentile(xs, 0.9), 4.6);   // position 3.6, between 4 and 5
  assert.deepEqual(xs, [5, 1, 4, 2, 3]); // the input is not reordered
  assert.equal(percentile([7], 0.3), 7);
  assert.ok(Number.isNaN(percentile([], 0.5)));
  assert.throws(() => percentile(xs, 1.5), RangeError);
});

test('percentileCI of a tiny list takes the alpha/2 and 1 - alpha/2 percentiles', () => {
  const [lo, hi] = percentileCI([3, 1, 5, 2, 4], 0.2);
  close(lo, 1.4);
  close(hi, 4.6);
  const [l2, h2] = percentileCI(Array.from({ length: 101 }, (_, i) => i)); // 0..100, default alpha 0.05
  close(l2, 2.5);
  close(h2, 97.5);
  assert.throws(() => percentileCI([1, 2], 0), RangeError);
  assert.throws(() => percentileCI([1, 2], 1), RangeError);
});

test('bootstrapMeans: B resample means, reproducible, centred on the sample mean', () => {
  const flags = makePopulation({ n: 200, accuracy: 0.7, seed: 2 });
  const b = bootstrapMeans(flags, 1000, 9);
  assert.equal(b.length, 1000);
  assert.deepEqual(b, bootstrapMeans(flags, 1000, 9));
  assert.notDeepEqual(b, bootstrapMeans(flags, 1000, 10));
  assert.ok(Math.abs(mean(b) - 0.7) < 0.01);
  // The bootstrap spread approximates the standard error of the metric: sqrt(0.7 * 0.3 / 200) = 0.0324.
  assert.ok(Math.abs(standardError(b) * Math.sqrt(1000) - binomialSE(0.7, 200)) < 0.004);
  assert.deepEqual(bootstrapMeans([4, 4, 4], 5), [4, 4, 4, 4, 4]);
  assert.throws(() => bootstrapMeans([], 5), RangeError);
  assert.throws(() => bootstrapMeans([1, 2], 0), RangeError);
});

test('coverage for n = 200 is within 0.05 of 95% (it is near 1 - alpha, not exactly it)', () => {
  // The measured fraction itself wobbles by about sqrt(0.95 * 0.05 / 300) = 0.013, so 0.05 is roughly four such wobbles.
  const pop = makePopulation({ n: 5000, accuracy: 0.8, seed: 7 });
  const c = coverage({ pop, n: 200, B: 300, experiments: 300, alpha: 0.05, seed: 1 });
  assert.ok(Math.abs(c - 0.95) <= 0.05, `coverage ${c}`);
  assert.equal(c, coverage({ pop, n: 200, B: 300, experiments: 300, alpha: 0.05, seed: 1 })); // seeded
});

test('with a small sample the interval undercovers more than with a large one', () => {
  const pop = makePopulation({ n: 5000, accuracy: 0.8, seed: 7 });
  const run = n => coverage({ pop, n, B: 300, experiments: 300, alpha: 0.05, seed: 1 });
  const small = run(10), big = run(200);
  assert.ok(small < 0.95, `n = 10 covered ${small}`);
  assert.ok(small < big, `n = 10 covered ${small}, n = 200 covered ${big}`);
});

test('coverageRuns lists each experiment: the interval, its centre and whether it holds the truth', () => {
  const pop = makePopulation({ n: 2000, accuracy: 0.6, seed: 5 });
  const runs = coverageRuns({ pop, n: 100, B: 200, experiments: 20, alpha: 0.1, seed: 2 });
  assert.equal(runs.length, 20);
  for (const r of runs) {
    assert.ok(r.lo <= r.mean && r.mean <= r.hi);
    assert.equal(r.covered, r.lo <= 0.6 && 0.6 <= r.hi);
  }
  assert.equal(coverage({ pop, n: 100, B: 200, experiments: 20, alpha: 0.1, seed: 2 }), runs.filter(r => r.covered).length / 20);
  // A wider interval (smaller alpha) never covers less on the same draws.
  const wide = coverage({ pop, n: 100, B: 200, experiments: 20, alpha: 0.01, seed: 2 });
  assert.ok(wide >= runs.filter(r => r.covered).length / 20);
  assert.throws(() => coverageRuns({ pop: [], n: 5, B: 10, experiments: 5 }), RangeError);
});
