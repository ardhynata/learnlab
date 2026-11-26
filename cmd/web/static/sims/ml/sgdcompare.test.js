import test from 'node:test';
import assert from 'node:assert/strict';
import {
  lossAt, exampleGradient, perExampleGradients, batchGradient, fullGradient, leastSquares, epochBatches,
  learningRateAt, run,
} from './sgdcompare.js';
import { rng } from './rng.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

// Three points on y = 2x + 1. From the line y = 0 the residuals y - prediction are 1, 3, 5.
const THREE = [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }];
const ZERO = { slope: 0, intercept: 0 };

// Eight noisy points around y = 1.5x + 2 (fixed by hand so the least-squares line is a known target).
const SMALL = [
  { x: 0, y: 2.3 }, { x: 0.5, y: 2.6 }, { x: 1, y: 3.8 }, { x: 1.5, y: 4.1 },
  { x: 2, y: 4.8 }, { x: 2.5, y: 5.9 }, { x: 3, y: 6.3 }, { x: 3.5, y: 7.4 },
];

test('lossAt is the mean squared residual, by hand', () => {
  close(lossAt(THREE, ZERO), 35 / 3); // (1 + 9 + 25) / 3
  close(lossAt(THREE, { slope: 2, intercept: 1 }), 0);
  assert.throws(() => lossAt([], ZERO));
});

test('gradients of the three-point set at (0, 0) match the hand calculation', () => {
  // slope: -2 * mean(x r) = -2 * (0 + 3 + 10) / 3 = -26/3; intercept: -2 * mean(r) = -6
  const g = fullGradient(THREE, ZERO);
  close(g.slope, -26 / 3);
  close(g.intercept, -6);
  assert.deepEqual(exampleGradient(THREE[2], ZERO), { slope: -20, intercept: -10 });
  // a one-point batch is that point's own gradient; a two-point batch is their mean
  assert.deepEqual(batchGradient(THREE, [1], ZERO), { slope: -6, intercept: -6 });
  assert.deepEqual(batchGradient(THREE, [1, 2], ZERO), { slope: -13, intercept: -8 });
  assert.throws(() => batchGradient(THREE, [], ZERO));
});

test('one full-batch step on the three-point set moves the line as computed by hand', () => {
  const r = run({ data: THREE, start: ZERO, lr: 0.1, batchSize: 3, epochs: 1 });
  assert.equal(r.stepsTaken, 1);
  assert.equal(r.path.length, 2);
  close(r.path[1].slope, 26 / 30);
  close(r.path[1].intercept, 0.6);
  // residuals after the step: 2/5, 23/15, 8/3 -> (4/25 + 529/225 + 64/9) / 3
  close(r.lossPerStep[0], 35 / 3);
  close(r.lossPerStep[1], 2165 / 675);
  assert.deepEqual(r.lossPerEpoch, r.lossPerStep);
  close(r.gradPerStep[0].slope, -26 / 3);
});

test('the mean of the per-example gradients equals the full gradient', () => {
  for (const w of [ZERO, { slope: 1.3, intercept: -0.7 }, { slope: -2, intercept: 5 }]) {
    for (const data of [THREE, SMALL]) {
      const each = perExampleGradients(data, w);
      assert.equal(each.length, data.length);
      const mean = {
        slope: each.reduce((s, g) => s + g.slope, 0) / each.length,
        intercept: each.reduce((s, g) => s + g.intercept, 0) / each.length,
      };
      const full = fullGradient(data, w);
      close(mean.slope, full.slope);
      close(mean.intercept, full.intercept);
    }
  }
});

test('the full gradient is the derivative of lossAt (finite differences)', () => {
  const w = { slope: 0.4, intercept: 1.1 }, h = 1e-6, g = fullGradient(SMALL, w);
  close((lossAt(SMALL, { ...w, slope: w.slope + h }) - lossAt(SMALL, { ...w, slope: w.slope - h })) / (2 * h), g.slope, 1e-5);
  close((lossAt(SMALL, { ...w, intercept: w.intercept + h }) - lossAt(SMALL, { ...w, intercept: w.intercept - h })) / (2 * h), g.intercept, 1e-5);
});

test('every epoch visits each point exactly once, with a fresh order and a shorter last batch', () => {
  const random = rng(7);
  const a = epochBatches(8, 3, random), b = epochBatches(8, 3, random);
  assert.deepEqual(a.map(x => x.length), [3, 3, 2]);
  for (const epoch of [a, b]) assert.deepEqual(epoch.flat().sort((p, q) => p - q), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.notDeepEqual(a, b);
  assert.deepEqual(epochBatches(4, 4, rng(1)), [[0, 1, 2, 3]]); // full batch keeps data order
  assert.deepEqual(epochBatches(4, 9, rng(1)), [[0, 1, 2, 3]]);
  assert.equal(epochBatches(5, 1, rng(1)).length, 5);
});

test('step counts follow the batch size', () => {
  const full = run({ data: SMALL, lr: 0.01, batchSize: 8, epochs: 5 });
  const mini = run({ data: SMALL, lr: 0.01, batchSize: 3, epochs: 5 });
  const sgd = run({ data: SMALL, lr: 0.01, batchSize: 1, epochs: 5 });
  assert.deepEqual([full.stepsTaken, mini.stepsTaken, sgd.stepsTaken], [5, 15, 40]);
  assert.deepEqual([full.stepsPerEpoch, mini.stepsPerEpoch, sgd.stepsPerEpoch], [1, 3, 8]);
  assert.equal(sgd.path.length, 41);
  assert.equal(sgd.lossPerStep.length, 41);
  assert.equal(sgd.lossPerEpoch.length, 6);
  assert.equal(sgd.lossPerEpoch[5], sgd.lossPerStep[40]);
  assert.equal(run({ data: SMALL, batchSize: 99, epochs: 2 }).stepsTaken, 2); // capped at n
  assert.equal(run({ data: SMALL, epochs: 2 }).batchSize, 8); // default: full batch
  assert.equal(run({ data: SMALL, epochs: 0 }).stepsTaken, 0);
});

test('a run is deterministic per seed and the seed changes the SGD path', () => {
  const opts = { data: SMALL, lr: 0.02, batchSize: 1, epochs: 6 };
  assert.deepEqual(run({ ...opts, seed: 3 }), run({ ...opts, seed: 3 }));
  assert.notDeepEqual(run({ ...opts, seed: 3 }).path, run({ ...opts, seed: 4 }).path);
  // full batch does not depend on the seed at all
  assert.deepEqual(run({ ...opts, batchSize: 8, seed: 3 }).path, run({ ...opts, batchSize: 8, seed: 99 }).path);
});

test('run never touches Math.random and does not change its inputs', () => {
  const real = Math.random;
  Math.random = () => { throw new Error('Math.random used'); };
  const data = SMALL.map(p => ({ ...p })), start = { slope: 1, intercept: 1 };
  try { run({ data, start, lr: 0.02, batchSize: 1, epochs: 3, seed: 5 }); } finally { Math.random = real; }
  assert.deepEqual(data, SMALL);
  assert.deepEqual(start, { slope: 1, intercept: 1 });
});

test('learning-rate decay shrinks the rate per epoch and is constant at 0', () => {
  close(learningRateAt(0.1, 0, 5), 0.1);
  close(learningRateAt(0.1, 1, 0), 0.1);
  close(learningRateAt(0.1, 1, 4), 0.02);
  const r = run({ data: SMALL, lr: 0.1, lrDecay: 1, batchSize: 8, epochs: 3 });
  r.lrPerEpoch.forEach((v, i) => close(v, 0.1 / (1 + i)));
});

test('full batch, mini-batch and SGD all end near the least-squares solution', () => {
  const best = leastSquares(SMALL), bestLoss = lossAt(SMALL, best);
  const start = { slope: 0, intercept: 0 };
  const full = run({ data: SMALL, start, lr: 0.05, batchSize: 8, epochs: 3000 });
  const mini = run({ data: SMALL, start, lr: 0.05, batchSize: 3, epochs: 600, lrDecay: 0.02, seed: 11 });
  const sgd = run({ data: SMALL, start, lr: 0.03, batchSize: 1, epochs: 600, lrDecay: 0.05, seed: 11 });
  for (const [name, r, tol] of [['full', full, 0.02], ['mini', mini, 0.15], ['sgd', sgd, 0.25]]) {
    const w = r.path.at(-1);
    assert.ok(Math.abs(w.slope - best.slope) < tol, `${name} slope ${w.slope} vs ${best.slope}`);
    assert.ok(Math.abs(w.intercept - best.intercept) < tol, `${name} intercept ${w.intercept} vs ${best.intercept}`);
    assert.ok(r.finalLoss - bestLoss < 0.05, `${name} loss ${r.finalLoss} vs ${bestLoss}`);
    assert.equal(r.diverged, false);
  }
});

test('with a constant step SGD keeps jittering near the minimum while full batch settles', () => {
  const best = leastSquares(SMALL);
  const dist = w => Math.hypot(w.slope - best.slope, w.intercept - best.intercept);
  const full = run({ data: SMALL, lr: 0.05, batchSize: 8, epochs: 3000 });
  const sgd = run({ data: SMALL, lr: 0.05, batchSize: 1, epochs: 400, seed: 2 });
  assert.ok(dist(full.path.at(-1)) < 1e-3);
  const lastEpoch = sgd.path.slice(-8);
  const spread = Math.max(...lastEpoch.map(w => w.slope)) - Math.min(...lastEpoch.map(w => w.slope));
  assert.ok(spread > 1e-3, `SGD slope spread ${spread}`);
});

test('a too-large step is reported as diverging; bad arguments throw', () => {
  const r = run({ data: SMALL, lr: 5, batchSize: 8, epochs: 400 });
  assert.equal(r.diverged, true);
  assert.throws(() => run({ data: [], batchSize: 1 }));
  assert.throws(() => run({ data: SMALL, batchSize: 0 }));
  assert.throws(() => run({ data: SMALL, batchSize: 1.5 }));
  assert.throws(() => run({ data: SMALL, batchSize: 1, epochs: -1 }));
});
