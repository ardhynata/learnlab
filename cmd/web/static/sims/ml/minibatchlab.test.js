import test from 'node:test';
import assert from 'node:assert/strict';
import {
  standardisePoints, generatedData, penguinData, toPlot, fromPlot, lossOnPlot, VIEW, START, pathLength, wobble, epochsToLow,
  blownUp, readRuns, verdictOf, GENERATED_N,
} from './minibatchlab.js';
import { run, lossAt, leastSquares } from './sgdcompare.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

test('standardisePoints gives zero mean and unit spread, by hand on [1, 2, 3]', () => {
  // mean 2, population sd sqrt(2/3)
  const { data, stats } = standardisePoints([{ x: 1, y: 10 }, { x: 2, y: 20 }, { x: 3, y: 30 }]);
  close(stats.x.mean, 2); close(stats.x.sd, Math.sqrt(2 / 3)); close(stats.y.mean, 20);
  close(data[0].x, -1 / Math.sqrt(2 / 3)); close(data[1].x, 0);
  close(mean(data.map(p => p.y)), 0);
  close(mean(data.map(p => p.y ** 2)), 1);
});

test('generatedData is seeded, standardised, and a different seed gives a different cloud', () => {
  const a = generatedData(4), b = generatedData(4), c = generatedData(5);
  assert.equal(a.length, GENERATED_N);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  close(mean(a.map(p => p.x)), 0, 1e-9); close(mean(a.map(p => p.x ** 2)), 1, 1e-9);
  assert.ok(leastSquares(a).slope > 0.3, 'an upward trend');
});

test('penguinData drops rows with a missing value and says how many', () => {
  const table = { rows: [
    { flipper_length_mm: 181, body_mass_g: 3750 }, { flipper_length_mm: null, body_mass_g: null },
    { flipper_length_mm: 195, body_mass_g: 3250 }, { flipper_length_mm: 200, body_mass_g: null }, { flipper_length_mm: 190, body_mass_g: 3500 },
  ] };
  const p = penguinData(table);
  assert.equal(p.data.length, 3); assert.equal(p.total, 5); assert.equal(p.dropped, 2);
  close(mean(p.data.map(q => q.x)), 0);
  close(p.stats.y.mean, (3750 + 3250 + 3500) / 3);
});

test('plot coordinates round-trip and the standardised bowl is round with its minimum at the least-squares line', () => {
  const w = { slope: 0.5, intercept: -1 };
  const p = toPlot(w);
  close(p.x, 5); // (0.5 + 2) / 5 * 10
  close(p.y, 2); // (-1 + 2) / 5 * 10
  const back = fromPlot(p); close(back.slope, 0.5); close(back.intercept, -1);
  const data = generatedData(4), best = leastSquares(data), f = lossOnPlot(data);
  // With both axes standardised the loss is (1 - r^2) + (slope - r)^2 + intercept^2: a circle around the best line.
  const r = best.slope, here = toPlot({ slope: r, intercept: 0 });
  close(f(here.x, here.y), 1 - r * r, 1e-9);
  const a = toPlot({ slope: r + 0.5, intercept: 0 }), b = toPlot({ slope: r, intercept: 0.5 });
  close(f(a.x, a.y), f(b.x, b.y), 1e-9);
  close(f(a.x, a.y), 1 - r * r + 0.25, 1e-9);
  assert.equal(VIEW.slope[1] - VIEW.slope[0], VIEW.intercept[1] - VIEW.intercept[0]);
});

test('pathLength and wobble on a hand-made path', () => {
  const straight = [{ slope: 0, intercept: 0 }, { slope: 3, intercept: 4 }, { slope: 6, intercept: 8 }];
  close(pathLength(straight), 10); close(wobble(straight), 0);
  // out 3 and back 3: length 6, ends where it started, so every bit of it was wandering
  const back = [{ slope: 0, intercept: 0 }, { slope: 3, intercept: 0 }, { slope: 0, intercept: 0 }];
  close(wobble(back), 1);
  // right 3 then up 4: length 7, straight distance 5 -> 2/7
  close(wobble([{ slope: 0, intercept: 0 }, { slope: 3, intercept: 0 }, { slope: 3, intercept: 4 }]), 2 / 7);
  close(wobble([{ slope: 0, intercept: 0 }]), 0);
  assert.equal(wobble([{ slope: 0, intercept: 0 }, { slope: Infinity, intercept: 0 }]), 1);
});

test('epochsToLow counts steps in epochs and returns null when the loss never gets there', () => {
  // start 10, floor 0, 5% target = 0.5: first reached at step 3 (0.4)
  close(epochsToLow([10, 4, 1, 0.4, 0.3], 2, 0), 1.5);
  assert.equal(epochsToLow([10, 4, 1], 2, 0), null);
  assert.equal(epochsToLow([10, NaN], 1, 0), null);
  close(epochsToLow([10, 6, 5.2], 1, 5), 2); // target 5 + 0.05 * 5 = 5.25
});

test('blownUp flags a loss that is not a number or is ten times the start', () => {
  assert.equal(blownUp([4, 3, 2]), false);
  assert.equal(blownUp([4, 3, 41]), true);
  assert.equal(blownUp([4, NaN]), true);
});

function threeRuns(data, { lr = 0.05, batchSize = 32, epochs = 10, seed = 1 } = {}) {
  const common = { data, start: START, lr, epochs, seed };
  return {
    full: run({ ...common, batchSize: data.length }), mini: run({ ...common, batchSize }), sgd: run({ ...common, batchSize: 1 }),
  };
}

test('readRuns on the default problem: SGD is the noisiest and needs the fewest epochs; full batch is smooth and slow', () => {
  const data = generatedData(4), runs = threeRuns(data);
  const r = readRuns(runs, data);
  assert.equal(r.floor, lossAt(data, leastSquares(data)));
  assert.equal(r.full.steps, 10); assert.equal(r.mini.steps, 30); assert.equal(r.sgd.steps, 10 * data.length);
  assert.ok(r.full.wobble < 0.01);
  assert.ok(r.sgd.wobble > r.mini.wobble && r.mini.wobble >= r.full.wobble);
  assert.equal(r.noisiest, 'sgd');
  assert.equal(r.fastest, 'sgd');
  assert.ok(r.sgd.epochsToLow < r.mini.epochsToLow);
  assert.equal(r.full.epochsToLow, null); // ten full-batch steps are not enough at this learning rate
  assert.equal(r.key, 'sgd-sgd');
});

test('readRuns with an epoch shows only the first epochs of each run', () => {
  const data = generatedData(4), runs = threeRuns(data);
  const r = readRuns(runs, data, 3);
  assert.equal(r.full.steps, 3); assert.equal(r.mini.steps, 9); assert.equal(r.sgd.steps, 3 * data.length);
  assert.equal(r.full.loss, runs.full.lossPerStep[3]);
  const none = readRuns(runs, data, 0);
  assert.equal(none.sgd.steps, 0); assert.equal(none.sgd.wobble, 0);
});

test('with the batch size at the whole data set the mini-batch run is the full-batch run, and nothing is noisy', () => {
  const data = generatedData(4), runs = threeRuns(data, { batchSize: GENERATED_N, lr: 0.2 });
  assert.deepEqual(runs.mini.path, runs.full.path);
  const r = readRuns(runs, data);
  assert.equal(r.mini.wobble, r.full.wobble);
});

test('a huge learning rate blows SGD up and it is never called the fastest', () => {
  const data = generatedData(4), runs = threeRuns(data, { lr: 0.6 });
  const r = readRuns(runs, data);
  assert.equal(r.sgd.diverged, true);
  assert.notEqual(r.fastest, 'sgd');
});

test('verdictOf: ties go to SGD, then mini; no noisy path gives "same"; nothing reached gives none', () => {
  const mk = (w, e, d = false) => ({ wobble: w, epochsToLow: e, diverged: d });
  assert.equal(verdictOf({ full: mk(0, 2), mini: mk(0.3, 1), sgd: mk(0.9, 1) }).key, 'sgd-sgd');
  assert.equal(verdictOf({ full: mk(0, 2), mini: mk(0.3, 1), sgd: mk(0.2, 3) }).key, 'mini-mini');
  assert.equal(verdictOf({ full: mk(0, 2), mini: mk(0.01, 5), sgd: mk(0.02, 9) }).key, 'same');
  assert.equal(verdictOf({ full: mk(0, null), mini: mk(0.4, null), sgd: mk(0.9, null) }).key, 'sgd-none');
});

test('runs are repeatable: the same seed gives the same result', () => {
  const data = generatedData(4);
  assert.deepEqual(readRuns(threeRuns(data), data), readRuns(threeRuns(data), data));
});
