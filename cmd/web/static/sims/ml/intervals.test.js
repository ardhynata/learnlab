import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeHetero, covariateShift, polyRegressor, knnRegressor, quantile, conformalQuantile, splitConformal,
  pinballLoss, quantileRegression, quantileInterval, ensembleInterval, intervalsAt, coverage, meanWidth,
  coverageByBin,
} from './intervals.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);
const mean = xs => xs.reduce((s, v) => s + v, 0) / xs.length;

test('makeHetero is deterministic, sorted, and has the stated known noise', () => {
  const a = makeHetero({ n: 50, seed: 7 }), b = makeHetero({ n: 50, seed: 7 }), c = makeHetero({ n: 50, seed: 8 });
  assert.deepEqual(a.y, b.y);
  assert.notDeepEqual(a.y, c.y);
  assert.deepEqual(a.x, a.x.slice().sort((p, q) => p - q));
  assert.ok(a.x[0] >= -1 && a.x[49] <= 1);
  const k = makeHetero({ n: 20, noise: 'constant' }), g = makeHetero({ n: 20, noise: 'growing' });
  assert.ok(k.sd.every(s => s === 0.3));
  close(g.sigma(-1), 0.08); close(g.sigma(1), 0.52);          // 0.08 + 0.22 * (x + 1)
  for (let i = 1; i < g.sd.length; i++) assert.ok(g.sd[i] >= g.sd[i - 1]);
  assert.throws(() => makeHetero({ noise: 'wobbly' }), /unknown noise/);
});

test('makeHetero noise really has the stated size: standardised residuals have mean 0 and sd 1', () => {
  for (const noise of ['constant', 'growing']) {
    const d = makeHetero({ n: 4000, seed: 3, noise });
    const z = d.y.map((v, i) => (v - d.mean[i]) / d.sd[i]);
    const m = mean(z), sd = Math.sqrt(mean(z.map(v => (v - m) ** 2)));
    assert.ok(Math.abs(m) < 0.06, `${noise}: mean ${m}`);
    assert.ok(Math.abs(sd - 1) < 0.06, `${noise}: sd ${sd}`);
  }
});

test('shift in makeHetero moves the input range; covariateShift moves x but keeps the true rule', () => {
  const d = makeHetero({ n: 100, seed: 1, shift: 2 });
  assert.ok(d.x[0] >= 1 && d.x[99] <= 3);
  const base = makeHetero({ n: 100, seed: 1, noise: 'growing' }), s = covariateShift(base, { delta: 1.5, seed: 4 });
  close(s.x[10], base.x[10] + 1.5);
  assert.equal(s.f, base.f);
  close(s.mean[10], base.f(base.x[10] + 1.5));
  close(s.sd[10], base.sigma(base.x[10] + 1.5));
  assert.deepEqual(base.x, makeHetero({ n: 100, seed: 1, noise: 'growing' }).x);   // input not mutated
  assert.deepEqual(covariateShift(base, { delta: 1.5, seed: 4 }).y, s.y);          // deterministic
});

test('quantile interpolates linearly and does not need sorted input', () => {
  close(quantile([4, 1, 3, 2], 0.5), 2.5);
  close(quantile([4, 1, 3, 2], 0), 1);
  close(quantile([4, 1, 3, 2], 1), 4);
  close(quantile([10, 20, 30, 40, 50], 0.25), 20);
  assert.throws(() => quantile([], 0.5));
});

test('conformalQuantile of 9 known residuals at alpha 0.2 is the 8th smallest (k = ceil(10 * 0.8) = 8)', () => {
  const r = [0.5, 0.1, 0.9, 0.3, 0.7, 0.2, 0.8, 0.4, 0.6];   // sorted: .1 .2 .3 .4 .5 .6 .7 .8 .9
  assert.equal(conformalQuantile(r, 0.2), 0.8);
  assert.equal(conformalQuantile(r, 0.1), 0.9);              // k = ceil(10 * 0.9) = 9, the largest
  assert.equal(conformalQuantile(r, 0.5), 0.5);              // k = 5
  assert.equal(conformalQuantile(r, 0.05), Infinity);        // k = ceil(9.5) = 10 > 9: too few points
  assert.equal(conformalQuantile([3], 0.5), 3);              // k = ceil(2 * 0.5) = 1
});

test('pinballLoss on a tiny example, and at tau 0.5 it is half the mean absolute error', () => {
  // residuals y - pred = [-1, 0, 2]; tau 0.8: over-prediction costs 0.2 * 1, under-prediction 0.8 * 2
  close(pinballLoss([1, 2, 3], [2, 2, 1], 0.8), (0.2 + 0 + 1.6) / 3);
  close(pinballLoss([1, 2, 3], [2, 2, 1], 0.2), (0.8 + 0 + 0.4) / 3);   // tau 0.2 flips the weights
  close(pinballLoss([1, 2, 3], [2, 2, 1], 0.5), 0.5 * (1 + 0 + 2) / 3);
  assert.equal(pinballLoss([5, 6], [5, 6], 0.9), 0);
});

test('knnRegressor averages the k nearest training inputs', () => {
  const p = knnRegressor(2)([0, 1, 2, 3], [0, 10, 20, 30]);
  close(p(1.2), 15);          // nearest are x = 1 and x = 2
  close(p(-5), 5);            // nearest are x = 0 and x = 1
  close(knnRegressor(99)([0, 1], [2, 4])(0), 3);   // k is capped at the number of rows
});

test('splitConformal: sizes, k, a symmetric band of half-width q, and determinism', () => {
  const X = Array.from({ length: 11 }, (_, i) => i + 1), y = X.slice();
  const c = splitConformal({ X, y, fit: () => () => 0, alpha: 0.2, seed: 5, calFraction: 0.8 });
  assert.equal(c.nCal, 9); assert.equal(c.nTrain, 2); assert.equal(c.k, 8);
  // the zero model scores each row by |y|; the 8th smallest of 9 distinct values drawn from 1..11 is at least 8
  assert.ok(Number.isInteger(c.q) && c.q >= 8 && c.q <= 11, `q = ${c.q}`);
  assert.deepEqual(c.predict(3), { lo: -c.q, hi: c.q });
  const d = splitConformal({ X, y, fit: () => () => 0, alpha: 0.2, seed: 5, calFraction: 0.8 });
  assert.equal(d.q, c.q);
  const tiny = splitConformal({ X: [1, 2, 3, 4], y: [1, 2, 3, 4], fit: () => () => 0, alpha: 0.01 });
  assert.equal(tiny.q, Infinity);
  assert.deepEqual(tiny.predict(0), { lo: -Infinity, hi: Infinity });
});

test('splitConformal uses the quantile of the calibration residuals of a real fit (hand-checkable)', () => {
  // y = 2x exactly, the model predicts 2x + 1, so every residual is exactly 1 and q must be 1
  const X = Array.from({ length: 30 }, (_, i) => i / 10), y = X.map(v => 2 * v);
  const c = splitConformal({ X, y, fit: () => x => 2 * x + 1, alpha: 0.1, seed: 2 });
  close(c.q, 1);
  close(c.predict(1).lo, 2); close(c.predict(1).hi, 4);
});

test('coverage and meanWidth on hand-checked intervals (the endpoints count as covered)', () => {
  const iv = [{ lo: 0, hi: 1 }, { lo: 0, hi: 1 }, { lo: 2, hi: 3 }, { lo: 0, hi: 0 }];
  assert.equal(coverage(iv, [0.5, 1.5, 3, 0]), 0.75);
  assert.equal(meanWidth(iv), 0.75);
  assert.throws(() => coverage(iv, [1]), /differ in length/);
  const bins = coverageByBin([0, 1, 2, 3], iv, [0.5, 1.5, 3, 0], 2);
  assert.deepEqual(bins.map(b => [b.n, b.coverage, b.width]), [[2, 0.5, 1], [2, 1, 0.5]]);
});

test('split conformal coverage is close to 1 - alpha on exchangeable data, for both noise kinds', () => {
  for (const noise of ['constant', 'growing']) {
    for (const alpha of [0.1, 0.3]) {
      const covs = [];
      for (let s = 1; s <= 30; s++) {
        const d = makeHetero({ n: 300, seed: s, noise }), t = makeHetero({ n: 800, seed: 500 + s, noise });
        const c = splitConformal({ X: d.x, y: d.y, fit: polyRegressor(5), alpha, seed: s });
        covs.push(coverage(intervalsAt(c.predict, t.x), t.y));
      }
      const avg = mean(covs);
      assert.ok(Math.abs(avg - (1 - alpha)) < 0.02, `${noise} alpha ${alpha}: average coverage ${avg}`);
    }
  }
});

test('coverage drops under a strong covariate shift, and the conformal width does not notice', () => {
  const d = makeHetero({ n: 400, seed: 3, noise: 'growing' }), t = makeHetero({ n: 1500, seed: 99, noise: 'growing' });
  const c = splitConformal({ X: d.x, y: d.y, fit: polyRegressor(5), alpha: 0.1, seed: 3 });
  const before = intervalsAt(c.predict, t.x);
  const moved = covariateShift(t, { delta: 1.5, seed: 5 });
  const after = intervalsAt(c.predict, moved.x);
  const covBefore = coverage(before, t.y), covAfter = coverage(after, moved.y);
  assert.ok(covBefore > 0.85, `before ${covBefore}`);
  assert.ok(covAfter < 0.6, `after ${covAfter}`);
  assert.ok(covBefore - covAfter > 0.3);
  close(meanWidth(before), meanWidth(after));   // same band everywhere: it cannot warn you
});

test('quantileRegression: pinball loss never rises above its starting point, and the tau-quantile of constant-model data is found', () => {
  const d = makeHetero({ n: 200, seed: 4, noise: 'growing' });
  const start = quantileRegression({ X: d.x, y: d.y, tau: 0.9, degree: 3, iters: 0 });
  const run = quantileRegression({ X: d.x, y: d.y, tau: 0.9, degree: 3, iters: 800 });
  assert.ok(run.loss <= start.loss + 1e-12);
  close(run.loss, pinballLoss(d.y, d.x.map(run.predict), 0.9), 1e-9);
  // degree 0 is one constant: the 0.9 quantile of 0..99 by linear interpolation is 89.1
  const flat = quantileRegression({ X: Array.from({ length: 100 }, (_, i) => i), y: Array.from({ length: 100 }, (_, i) => i), tau: 0.9, degree: 0, iters: 300 });
  assert.ok(Math.abs(flat.predict(0) - 89.1) < 1.5, `got ${flat.predict(0)}`);
});

test('quantile regression intervals are narrower where the noise is small, and roughly cover', () => {
  const d = makeHetero({ n: 400, seed: 3, noise: 'growing' }), t = makeHetero({ n: 2000, seed: 99, noise: 'growing' });
  const q = quantileInterval({ X: d.x, y: d.y, alpha: 0.1, degree: 5, iters: 1500 });
  const w = x => { const { lo, hi } = q.predict(x); return hi - lo; };
  assert.ok(w(-0.8) > 0 && w(0.8) > 0);
  assert.ok(w(0.8) > 1.5 * w(-0.8), `width at 0.8 is ${w(0.8)}, at -0.8 is ${w(-0.8)}`);
  const cov = coverage(intervalsAt(q.predict, t.x), t.y);
  assert.ok(cov > 0.8 && cov < 0.97, `coverage ${cov}`);
  // conformal on the same data is one fixed width, so its widths cannot follow the noise
  const c = splitConformal({ X: d.x, y: d.y, fit: polyRegressor(5), alpha: 0.1, seed: 3 });
  close(c.predict(-0.8).hi - c.predict(-0.8).lo, c.predict(0.8).hi - c.predict(0.8).lo);
  // known noise: the quantile band's width tracks the true 90% width 2 * 1.645 * sigma to within a factor of 2
  const truth = x => 2 * 1.645 * t.sigma(x);
  assert.ok(w(0.8) / truth(0.8) > 0.5 && w(0.8) / truth(0.8) < 2);
});

test('quantileInterval keeps lo <= hi even if the two curves would cross', () => {
  const d = makeHetero({ n: 60, seed: 2, noise: 'constant' });
  const q = quantileInterval({ X: d.x, y: d.y, alpha: 0.9, degree: 2, iters: 200 });   // alpha 0.9: taus 0.45 and 0.55
  for (const x of [-1, 0, 1]) { const { lo, hi } = q.predict(x); assert.ok(lo <= hi); }
});

test('ensembleInterval is epistemic: it undercovers new y, grows off the data, and shrinks with more data', () => {
  const d = makeHetero({ n: 400, seed: 3, noise: 'growing' }), t = makeHetero({ n: 1500, seed: 99, noise: 'growing' });
  const e = ensembleInterval({ X: d.x, y: d.y, fit: polyRegressor(5), B: 25, seed: 2, alpha: 0.1 });
  const iv = intervalsAt(e.predict, t.x);
  assert.equal(e.members.length, 25);
  assert.ok(coverage(iv, t.y) < 0.4, `ensemble coverage ${coverage(iv, t.y)}`);   // noise in y is not in the spread
    assert.ok(e.predict(2.5).sd > 5 * e.predict(0).sd);                              // far outside the data
  const small = makeHetero({ n: 60, seed: 3, noise: 'growing' });
  const es = ensembleInterval({ X: small.x, y: small.y, fit: polyRegressor(5), B: 25, seed: 2, alpha: 0.1 });
  assert.ok(meanWidth(intervalsAt(es.predict, t.x)) > meanWidth(iv));              // less data, more epistemic width
  const again = ensembleInterval({ X: d.x, y: d.y, fit: polyRegressor(5), B: 25, seed: 2, alpha: 0.1 });
  assert.deepEqual(again.predict(0.3), e.predict(0.3));
  const p = e.predict(0.3);
  assert.ok(p.lo <= p.mean + p.sd * 3 && p.hi >= p.mean - p.sd * 3 && p.lo <= p.hi);
});

test('intervalsAt maps a predict function over inputs', () => {
  assert.deepEqual(intervalsAt(x => ({ lo: x - 1, hi: x + 1 }), [0, 5]), [{ lo: -1, hi: 1 }, { lo: 4, hi: 6 }]);
});
