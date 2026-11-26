// Full-batch, mini-batch and stochastic gradient descent on the same line fit, for the "SGD" lab.
// Pure math, no DOM, no Math.random: every shuffle comes from the seeded generator in rng.js.
//
// The model is y = slope * x + intercept, the loss is the mean squared error (MSE) over the data,
// and a point on the loss surface is a parameter pair w = { slope, intercept }. `data` is a list of
// { x, y } points (the same shape lossfit.js and regression.js use).
//
// API
//   lossAt(data, w)                     MSE of the line w on all of `data`.
//   exampleGradient(point, w)           gradient of ONE point's squared error: { slope, intercept }.
//   perExampleGradients(data, w)        exampleGradient of every point, in data order.
//   batchGradient(data, indices, w)     mean gradient over the points at `indices` (a mini-batch).
//   fullGradient(data, w)               batchGradient over every point (the exact gradient of lossAt).
//   leastSquares(data)                  the exact minimum { slope, intercept } (closed form), to compare against.
//   epochBatches(n, batchSize, random)  one epoch's batches: a seeded shuffle cut into chunks of batchSize
//                                       (the last chunk can be shorter). batchSize >= n gives one batch in data order.
//   learningRateAt(lr, lrDecay, epoch)  lr / (1 + lrDecay * epoch): constant when lrDecay is 0; epoch counts from 0.
//   run({ data, start, lr, batchSize, epochs, seed, lrDecay })
//                                       -> { path, lossPerStep, lossPerEpoch, gradPerStep, stepsTaken,
//                                            stepsPerEpoch, batchSize, lrPerEpoch, finalLoss, diverged }
//        batchSize: data.length (or more) is full-batch gradient descent, 1 is plain SGD, in between is mini-batch.
//        Each step moves against the gradient of ONE batch: w <- w - lr_epoch * batchGradient(batch, w).
//        Every epoch visits every point exactly once, in a fresh seeded order, so a full-batch epoch is
//        one step, an SGD epoch is n steps.
//        path          parameters after each step, start included (length stepsTaken + 1)
//        lossPerStep   loss on ALL the data after each step, start included (length stepsTaken + 1)
//        lossPerEpoch  loss on all the data at each epoch's end, start included (length epochs + 1)
//        gradPerStep   the batch gradient used by each step (length stepsTaken)
//        diverged      true once any loss is not a finite number
//   The same arguments, seed included, always give the same result.
import { rng, shuffle } from './rng.js';
import { linearFit } from './regression.js';

const predict = (w, x) => w.slope * x + w.intercept;

export function lossAt(data, w) {
  if (!data.length) throw new Error('lossAt needs at least one point');
  let s = 0;
  for (const p of data) { const r = p.y - predict(w, p.x); s += r * r; }
  return s / data.length;
}

// d/dslope (y - slope x - intercept)^2 = -2 x r, d/dintercept = -2 r, with r = y - prediction.
export function exampleGradient(p, w) {
  const r = p.y - predict(w, p.x);
  return { slope: -2 * p.x * r, intercept: -2 * r };
}

export function perExampleGradients(data, w) { return data.map(p => exampleGradient(p, w)); }

export function batchGradient(data, indices, w) {
  if (!indices.length) throw new Error('batchGradient needs at least one index');
  let slope = 0, intercept = 0;
  for (const i of indices) {
    const g = exampleGradient(data[i], w);
    slope += g.slope; intercept += g.intercept;
  }
  return { slope: slope / indices.length, intercept: intercept / indices.length };
}

export function fullGradient(data, w) { return batchGradient(data, data.map((_, i) => i), w); }

export function leastSquares(data) {
  const { slope, intercept } = linearFit(data.map(p => p.x), data.map(p => p.y));
  return { slope, intercept };
}

export function epochBatches(n, batchSize, random) {
  const order = batchSize >= n ? Array.from({ length: n }, (_, i) => i) : shuffle(Array.from({ length: n }, (_, i) => i), random);
  const size = Math.min(batchSize, n), out = [];
  for (let i = 0; i < n; i += size) out.push(order.slice(i, i + size));
  return out;
}

export const learningRateAt = (lr, lrDecay, epoch) => lr / (1 + lrDecay * epoch);

export function run({ data, start = { slope: 0, intercept: 0 }, lr = 0.01, batchSize, epochs = 20, seed = 1, lrDecay = 0 }) {
  const n = data.length;
  if (!n) throw new Error('run needs at least one point');
  const size = batchSize ?? n;
  if (!Number.isInteger(size) || size < 1) throw new Error('batchSize must be a whole number of at least 1');
  if (!Number.isInteger(epochs) || epochs < 0) throw new Error('epochs must be a whole number, 0 or more');
  const random = rng(seed), bs = Math.min(size, n);
  let w = { slope: start.slope, intercept: start.intercept };
  const path = [w], first = lossAt(data, w);
  const lossPerStep = [first], lossPerEpoch = [first], gradPerStep = [], lrPerEpoch = [];
  let diverged = !Number.isFinite(first);
  for (let e = 0; e < epochs; e++) {
    const rate = learningRateAt(lr, lrDecay, e);
    lrPerEpoch.push(rate);
    for (const batch of epochBatches(n, bs, random)) {
      const g = batchGradient(data, batch, w);
      w = { slope: w.slope - rate * g.slope, intercept: w.intercept - rate * g.intercept };
      const loss = lossAt(data, w);
      if (!Number.isFinite(loss)) diverged = true;
      path.push(w); lossPerStep.push(loss); gradPerStep.push(g);
    }
    lossPerEpoch.push(lossPerStep.at(-1));
  }
  return {
    path, lossPerStep, lossPerEpoch, gradPerStep, stepsTaken: gradPerStep.length,
    stepsPerEpoch: Math.ceil(n / bs), batchSize: bs, lrPerEpoch, finalLoss: lossPerStep.at(-1), diverged,
  };
}
