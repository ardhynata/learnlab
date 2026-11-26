import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  POP_SIZE, GENERATED_ACCURACY, generatedPopulation, penguinPopulation, scrambleSeed, drawBatch, sampleSd,
  binSpec, histogram, bandHalfWidth, quadruplePair,
} from './bootstraplab.js';
import { trueAccuracy, percentileCI } from './uncertainty.js';
import { parseCsv } from './tabular.js';

test('the generated population has 5,000 cases and a true accuracy of exactly 85%', () => {
  const pop = generatedPopulation();
  assert.equal(pop.length, POP_SIZE);
  assert.equal(pop.filter(v => v === 1).length, 4250);   // 0.85 * 5000
  assert.equal(trueAccuracy(pop), GENERATED_ACCURACY);
  assert.deepEqual(pop, generatedPopulation());
});

test('penguinPopulation: leave-one-out 1-NN flags by hand, and a row with an NA is dropped and counted', () => {
  // Species A sits at 0 and 1, species B at 10 and 11, and one more A at 10.4. With k = 1 and each case
  // classified from the others: 0 -> nearest is 1 (A, right); 1 -> nearest is 0 (A, right);
  // 10 -> nearest is the A at 10.4 (wrong); 11 -> nearest is 10.4 (wrong); 10.4 -> nearest is 10 (B, wrong).
  const table = parseCsv([
    'species,flipper_length_mm,body_mass_g',
    'A,0,5', 'A,1,5', 'B,10,5', 'B,11,5', 'A,10.4,5', 'A,NA,5',
  ].join('\n'));
  const p = penguinPopulation(table, 1);
  assert.deepEqual(p.flags, [1, 1, 0, 0, 0]);
  assert.equal(p.accuracy, 0.4);
  assert.deepEqual([p.total, p.kept, p.dropped], [6, 5, 1]);
});

test('penguinPopulation on the bundled file: 342 of 344 penguins, a 5-NN accuracy clearly below 100%', () => {
  const table = parseCsv(readFileSync(new URL('../../data/penguins.csv', import.meta.url), 'utf8'));
  const p = penguinPopulation(table);
  assert.deepEqual([p.total, p.kept, p.dropped], [344, 342, 2]);
  assert.equal(p.flags.length, 342);
  assert.equal(p.flags.filter(v => v === 1).length, 263);   // 263 / 342 = 0.769
  assert.ok(p.accuracy > 0.75 && p.accuracy < 0.8);
  assert.deepEqual(p.flags, penguinPopulation(table).flags);
});

test('scrambleSeed is deterministic and spreads neighbouring counters apart', () => {
  assert.equal(scrambleSeed(7, 3), scrambleSeed(7, 3));
  const seeds = Array.from({ length: 50 }, (_, i) => scrambleSeed(7, i));
  assert.equal(new Set(seeds).size, 50);
  assert.notEqual(scrambleSeed(7, 0), scrambleSeed(8, 0));
  // adjacent counters do not give adjacent seeds
  assert.ok(Math.abs(seeds[1] - seeds[0]) > 1000);
});

test('drawBatch: reproducible, every accuracy is k / n, and the last sample matches its own mean', () => {
  const pop = generatedPopulation();
  const a = drawBatch(pop, 20, 30, 5), b = drawBatch(pop, 20, 30, 5), c = drawBatch(pop, 20, 30, 6);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.means, c.means);
  assert.equal(a.means.length, 30);
  for (const m of a.means) assert.ok(Math.abs(m * 20 - Math.round(m * 20)) < 1e-9);
  assert.equal(a.last.length, 20);
  assert.equal(a.last.reduce((s, v) => s + v, 0) / 20, a.means[29]);
  assert.throws(() => drawBatch(pop, 0, 5, 1), RangeError);
  assert.throws(() => drawBatch([], 5, 5, 1), RangeError);
});

test('drawBatch: 200 samples of 100 centre on the truth and spread by about the textbook standard error', () => {
  const pop = generatedPopulation();
  const { means } = drawBatch(pop, 100, 200, 9);
  const avg = means.reduce((s, v) => s + v, 0) / means.length;
  assert.ok(Math.abs(avg - 0.85) < 0.01, `mean ${avg}`);
  // textbook SE = sqrt(0.85 * 0.15 / 100) = 0.03571
  assert.ok(Math.abs(sampleSd(means) - 0.0357) < 0.006, `sd ${sampleSd(means)}`);
  const [lo, hi] = percentileCI(means);
  assert.ok(lo < 0.85 && hi > 0.85);
});

test('quadrupling n halves the spread of the sample accuracies', () => {
  const pop = generatedPopulation();
  const s100 = sampleSd(drawBatch(pop, 100, 400, 3).means), s400 = sampleSd(drawBatch(pop, 400, 400, 4).means);
  assert.ok(s400 / s100 > 0.42 && s400 / s100 < 0.6, `ratio ${s400 / s100}`);
});

test('sampleSd by hand: 1, 2, 3 has standard deviation 1', () => {
  assert.equal(sampleSd([1, 2, 3]), 1);
  assert.ok(Number.isNaN(sampleSd([1])));
});

test('binSpec lines bins up with k / n: n = 100 on 0.5 to 1 has one value per bin, n = 400 has two', () => {
  const s100 = binSpec(100, 0.5, 1);
  assert.deepEqual([s100.m, s100.start, s100.bins], [1, 50, 51]);
  assert.equal(s100.left(0), 0.495);
  assert.equal(s100.right(0), 0.505);
  const s400 = binSpec(400, 0.5, 1);
  assert.deepEqual([s400.m, s400.start, s400.bins], [2, 200, 101]);
  const s20 = binSpec(20, 0.5, 1);   // 0.5 * 20 / 100 rounds to 0, so one value per bin
  assert.deepEqual([s20.m, s20.start, s20.bins], [1, 10, 11]);
  // consecutive bars touch
  for (let j = 0; j + 1 < s400.bins; j++) assert.ok(Math.abs(s400.right(j) - s400.left(j + 1)) < 1e-12);
});

test('histogram puts each k / n in the bar centred on it, shares add to 1, outliers go in the end bins', () => {
  const s = binSpec(100, 0.5, 1);
  const h = histogram([0.85, 0.85, 0.9, 0.3, 1.0], s);
  assert.equal(h.length, 51);
  assert.equal(h[35], 2 / 5);   // count 85 -> bin 85 - 50 = 35
  assert.equal(h[40], 1 / 5);
  assert.equal(h[0], 1 / 5);    // 0.3 is below the axis
  assert.equal(h[50], 1 / 5);
  assert.ok(Math.abs(h.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  assert.ok(histogram([], s).every(v => v === 0));
});

test('bandHalfWidth: 1.96 * sqrt(0.85 * 0.15 / 100) = 0.07; four times the cases halves it', () => {
  assert.ok(Math.abs(bandHalfWidth(0.85, 100) - 0.0700) < 0.0001);
  assert.ok(Math.abs(bandHalfWidth(0.85, 400) / bandHalfWidth(0.85, 100) - 0.5) < 1e-12);
});

test('quadruplePair picks the two tried sizes closest to four times apart', () => {
  assert.deepEqual(quadruplePair([100, 400]), [100, 400]);
  assert.deepEqual(quadruplePair([100, 150, 400, 20]), [100, 400]);
  assert.equal(quadruplePair([100, 200]), null);
  assert.equal(quadruplePair([100]), null);
  assert.deepEqual(quadruplePair([20, 70, 80]), [20, 80]);
});
