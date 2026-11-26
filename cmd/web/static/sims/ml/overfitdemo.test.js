import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULTS, MAX_DEGREE, TOTAL_POINTS, truth, sampleCurve, splitIndices, splitSample,
  fitDegree, errorOf, errorsByDegree, verdict, curvePoints, formatError, chartRuns,
} from './overfitdemo.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);
const defaultRun = () => {
  const pts = sampleCurve(DEFAULTS.seed, { noise: DEFAULTS.noise });
  const { train, validation } = splitSample(pts, DEFAULTS.train, DEFAULTS.seed);
  return { pts, train, validation, errs: errorsByDegree(train, validation) };
};

test('the sample is reproducible, one point per slot along x, and noise just rescales it', () => {
  const a = sampleCurve(5), b = sampleCurve(5), c = sampleCurve(6);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(a.length, TOTAL_POINTS);
  a.forEach((p, i) => assert.ok(p.x >= i * 10 / TOTAL_POINTS && p.x < (i + 1) * 10 / TOTAL_POINTS, `slot ${i}`));
  const quiet = sampleCurve(5, { noise: 0 }), loud = sampleCurve(5, { noise: 1 });
  quiet.forEach((p, i) => { close(p.x, loud[i].x, 0); close(p.y, truth(p.x), 1e-12); });
  loud.forEach((p, i) => close(p.y - truth(p.x), (a[i].y - truth(a[i].x)) * 2, 1e-9));
});

test('a split is a partition: no overlap, nothing lost, sizes as asked', () => {
  for (const nTrain of [6, 14, 20, 26]) {
    const { train, validation } = splitIndices(TOTAL_POINTS, nTrain, 3);
    assert.equal(train.length, nTrain);
    assert.equal(validation.length, TOTAL_POINTS - nTrain);
    assert.equal(new Set([...train, ...validation]).size, TOTAL_POINTS, 'no index appears twice');
    assert.deepEqual([...train, ...validation].sort((x, y) => x - y), Array.from({ length: TOTAL_POINTS }, (_, i) => i));
  }
  assert.deepEqual(splitIndices(30, 14, 3), splitIndices(30, 14, 3), 'same seed, same split');
  assert.notDeepEqual(splitIndices(30, 14, 3), splitIndices(30, 14, 4), 'a new seed shuffles differently');
});

test('a larger training set only moves points over from validation', () => {
  const small = splitIndices(30, 10, 8), big = splitIndices(30, 15, 8);
  for (const i of small.train) assert.ok(big.train.includes(i));
  for (const i of big.validation) assert.ok(small.validation.includes(i));
});

test('splitSample returns the sample points themselves, split without overlap', () => {
  const pts = sampleCurve(2);
  const { train, validation } = splitSample(pts, 12, 2);
  assert.equal(train.length + validation.length, pts.length);
  for (const p of train) assert.ok(!validation.includes(p));
  for (const p of [...train, ...validation]) assert.ok(pts.includes(p));
});

test('hand-computed: a line through (0,0),(1,2),(2,1) has training MSE 0.5 and misses (3,3) by 1', () => {
  // slope 0.5, intercept 0.5: predictions 0.5, 1, 1.5; residuals -0.5, 1, -0.5; MSE = 1.5 / 3.
  const train = [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 1 }];
  const fit = fitDegree(train, 1);
  close(fit.predict(3), 2);
  close(errorOf(fit, train), 0.5);
  close(errorOf(fit, [{ x: 3, y: 3 }]), 1);
  const e = errorsByDegree(train, [{ x: 3, y: 3 }], 2);
  close(e.train[0], 0.5);
  close(e.validation[0], 1);
  close(e.train[1], 0, 1e-6); // a parabola passes through three points
});

test('training error never increases with degree (default run, and a sweep up to degree 8)', () => {
  const { errs } = defaultRun();
  for (let i = 1; i < MAX_DEGREE; i++) assert.ok(errs.train[i] <= errs.train[i - 1] + 1e-6, `degree ${i + 1}`);
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) for (const noise of [0, 0.5, 1.5]) for (const nTrain of [8, 14, 22]) {
    const pts = sampleCurve(seed, { noise });
    const { train, validation } = splitSample(pts, nTrain, seed);
    const e = errorsByDegree(train, validation, 8);
    for (let i = 1; i < 8; i++) assert.ok(e.train[i] <= e.train[i - 1] + 1e-8, `seed ${seed} noise ${noise} n ${nTrain} degree ${i + 1}`);
  }
});

test('on the default sample validation error is U-shaped: degree 1 and degree 12 both do worse than the best', () => {
  const { errs } = defaultRun();
  assert.equal(errs.best, 3);
  const best = errs.validation[errs.best - 1];
  assert.ok(errs.validation[0] > 3 * best, 'degree 1 underfits');
  assert.ok(errs.validation[MAX_DEGREE - 1] > 100 * best, 'degree 12 overfits');
  assert.ok(errs.train[MAX_DEGREE - 1] < errs.train[errs.best - 1], 'the flexible model still wins on training data');
  for (let d = errs.best + 1; d < MAX_DEGREE; d++) assert.ok(errs.validation[d] > errs.validation[errs.best - 1], `degree ${d + 1}`);
});

test('with as many parameters as training points the training error is zero but validation is awful', () => {
  const train = Array.from({ length: 7 }, (_, i) => ({ x: i, y: [1, 3, 2, 5, 4, 6, 5][i] }));
  const validation = [{ x: 0.5, y: 2 }, { x: 3.5, y: 3.5 }, { x: 6.5, y: 5.5 }];
  const e = errorsByDegree(train, validation, 6);
  close(e.train[5], 0, 1e-6);
  assert.ok(e.validation[5] > e.validation[1]);
});

test('verdict: below the best underfits, within 50% is about right, above overfits', () => {
  const v = [1.2, 1.2, 0.19, 0.24, 0.25, 0.28, 0.8, 4.7];
  assert.equal(verdict(v, 1), 'underfitting');
  assert.equal(verdict(v, 2), 'underfitting');
  assert.equal(verdict(v, 3), 'about right');
  assert.equal(verdict(v, 6), 'about right');
  assert.equal(verdict(v, 7), 'overfitting');
  assert.equal(verdict(v, 8), 'overfitting');
  const { errs } = defaultRun();
  assert.equal(verdict(errs.validation, DEFAULTS.degree), 'overfitting');
  assert.equal(verdict(errs.validation, errs.best), 'about right');
});

test('curvePoints covers 0..10 and keeps a wild fit drawable', () => {
  const pts = curvePoints(fitDegree([{ x: 0, y: 0 }, { x: 10, y: 10 }], 1), 10);
  assert.equal(pts.length, 11);
  close(pts[0].x, 0); close(pts[10].x, 10); close(pts[5].y, 5);
  const wild = curvePoints({ predict: x => (x > 5 ? 1e12 : -1e12) }, 10);
  assert.ok(wild.every(p => p.y >= -40 && p.y <= 50));
  assert.ok(curvePoints({ predict: () => NaN }, 4).every(p => Number.isFinite(p.y)));
});

test('formatError shows two decimals, and "over 1000" for blown-up values', () => {
  assert.equal(formatError(0.1949), '0.19');
  assert.equal(formatError(1234.5), 'over 1000');
  assert.equal(formatError(Infinity), 'over 1000');
});

test('best degree: errors that tie within two decimals give the lowest degree, clear differences still win', () => {
  const dust = [0.9, 0.92, 0.04, 0.04, 2e-4, 4e-4, 2e-7, 4e-6, 3e-9, 4e-8, 3e-7, 2e-6];
  // The tie rule, through verdict (which shares the argmin): degree 5 is the first within 0.005 of the lowest.
  assert.equal(verdict(dust, 5), 'about right');
  assert.equal(verdict(dust, 4), 'underfitting', 'degree 4 is 0.04, clearly above the tied group');
  assert.equal(verdict(dust, 12), 'about right');
  // No noise: validation error is 0.00 from degree 5 on, and the best degree is 5, not 9.
  const quiet = sampleCurve(DEFAULTS.seed, { noise: 0 });
  const { train, validation } = splitSample(quiet, DEFAULTS.train, DEFAULTS.seed);
  const q = errorsByDegree(train, validation);
  assert.equal(q.best, 5);
  assert.ok(q.validation.slice(4).every(v => formatError(v) === '0.00'));
  // A real difference of more than the tolerance is not a tie: the default noisy sample keeps its best of 3.
  assert.equal(defaultRun().errs.best, 3);
  assert.equal(errorsByDegree([{ x: 0, y: 0 }], [], 2).best, 1, 'no finite error: degree 1');
});

test('chartRuns clamps errors above the cap, lists them, and dashes only the segments that touch them', () => {
  const xs = [1, 2, 3, 4, 5, 6];
  const { runs, clipped, points } = chartRuns(xs, [1, 0.5, 0.4, 9, 30, 0.2], 2);
  assert.deepEqual(clipped, [3, 4]);
  assert.deepEqual(points.map(p => p.y), [1, 0.5, 0.4, 2, 2, 0.2]);
  assert.deepEqual(points.map(p => p.clipped), [false, false, false, true, true, false]);
  assert.deepEqual(runs.map(r => [r.clipped, r.xs]), [[false, [1, 2, 3]], [true, [3, 4]], [true, [4, 5]], [true, [5, 6]]]);
  for (const r of runs) assert.ok(r.ys.every(y => y <= 2));
  const calm = chartRuns([1, 2, 3], [1, 2, 0.5], 2);
  assert.deepEqual(calm.runs.map(r => r.clipped), [false]);
  assert.deepEqual(calm.clipped, []);
  assert.deepEqual(chartRuns([1, 2], [1, Infinity], 2).clipped, [1], 'a non-finite error counts as clipped');
  assert.deepEqual(chartRuns([4], [3], 2).runs, [], 'one point has no segment');
});
