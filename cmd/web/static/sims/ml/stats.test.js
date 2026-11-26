import test from 'node:test';
import assert from 'node:assert/strict';
import { mean, median, variance, stdDev, pearson, summarize, movedMore } from './stats.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

test('mean, variance and standard deviation match a hand calculation', () => {
  // 2 4 4 4 5 5 7 9: the sum is 40, the mean 5, the squared deviations add up to 32.
  const xs = [2, 4, 4, 4, 5, 5, 7, 9];
  assert.equal(mean(xs), 5);
  assert.equal(variance(xs), 4);          // 32 / 8
  assert.equal(stdDev(xs), 2);
  close(variance(xs, { sample: true }), 32 / 7);
  close(stdDev(xs, { sample: true }), Math.sqrt(32 / 7));
});

test('empty and tiny inputs give NaN instead of a made-up number', () => {
  assert.ok(Number.isNaN(mean([])));
  assert.ok(Number.isNaN(median([])));
  assert.ok(Number.isNaN(variance([])));
  assert.equal(variance([3]), 0);
  assert.ok(Number.isNaN(variance([3], { sample: true })));
});

test('median takes the middle value, or the mean of the two middle ones, and does not mutate', () => {
  const xs = [3, 1, 2];
  assert.equal(median(xs), 2);
  assert.deepEqual(xs, [3, 1, 2]);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([7]), 7);
  assert.equal(median([1, 2, 3, 100]), 2.5);
});

test('pearson correlation: hand-computed value, perfect lines and the undefined case', () => {
  // x = 1..5, y = 2 4 5 4 5: dx = -2 -1 0 1 2, dy = -2 0 1 0 1; sum dx*dy = 6, sum dx^2 = 10, sum dy^2 = 6.
  close(pearson([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]), 6 / Math.sqrt(60));
  assert.equal(pearson([1, 2, 3], [2, 4, 6]), 1);
  assert.equal(pearson([1, 2, 3], [9, 5, 1]), -1);
  assert.ok(Number.isNaN(pearson([1, 2, 3], [5, 5, 5])));
  assert.ok(Number.isNaN(pearson([1], [1])));
  close(pearson([1, 2, 3, 4], [10, 20, 30, 40]), pearson([1, 2, 3, 4], [1, 2, 3, 4]));   // scale does not matter
});

// A perfect line y = 2x for x = 1..5, then one outlier at (3, 20).
const line = [1, 2, 3, 4, 5].map(x => ({ x, y: 2 * x }));
const withOutlier = [...line, { x: 3, y: 20 }];

test('summarize: one outlier moves the mean, the standard deviation and r, and the median far less', () => {
  const a = summarize(line), b = summarize(withOutlier);
  assert.equal(a.n, 5); assert.equal(b.n, 6);
  assert.equal(a.meanY, 6); close(b.meanY, 50 / 6);          // 50 / 6 = 8.333...
  assert.equal(a.medianY, 6); assert.equal(b.medianY, 7);    // sorted 2 4 6 8 10 20: (6 + 8) / 2
  assert.equal(a.meanX, 3); assert.equal(b.meanX, 3);        // the outlier sits at the middle of x
  assert.equal(a.medianX, 3); assert.equal(b.medianX, 3);
  close(a.sdY, Math.sqrt(8));                                // (16 + 4 + 0 + 4 + 16) / 5 = 8
  close(b.sdY, Math.sqrt(203.3333333333 / 6));               // 620 - 6 * (50/6)^2 = 203.33
  assert.equal(a.r, 1);
  close(b.r, 20 / Math.sqrt(10 * 203.3333333333), 1e-9);     // sum dx*dy = 20, sum dx^2 = 10
  assert.ok(b.r < 0.45 && b.r > 0.44);
});

test('an outlier along the trend can raise the correlation instead of lowering it', () => {
  const noisy = [{ x: 1, y: 3 }, { x: 2, y: 1 }, { x: 3, y: 4 }, { x: 4, y: 2 }, { x: 5, y: 5 }];
  const before = summarize(noisy).r;
  const along = summarize([...noisy, { x: 20, y: 20 }]).r;
  const across = summarize([...noisy, { x: 3, y: 20 }]).r;
  assert.ok(along > before, `${along} should be above ${before}`);
  assert.ok(across < before, `${across} should be below ${before}`);
});

test('movedMore compares the mean and the median in standard deviations', () => {
  const m = movedMore(summarize(line), summarize(withOutlier));
  assert.equal(m.which, 'mean');
  assert.equal(m.axis, 'y');
  close(m.mean, (50 / 6 - 6) / Math.sqrt(8));    // 2.333 / 2.828
  close(m.median, 1 / Math.sqrt(8));             // the median went 6 to 7
});

test('movedMore compares on the axis that moved most, so a shift of the other axis does not hide it', () => {
  const s = summarize(line);
  // x: the median moves 1 (0.707 sd), the mean 0.1; y: nothing moves.
  const m = movedMore(s, { ...s, medianX: s.medianX + 1, meanX: s.meanX + 0.1 });
  assert.equal(m.axis, 'x');
  assert.equal(m.which, 'median');
  // y: the mean moves 1.5 sd, the median 0.35 sd; x: both 0.3 sd. Only y decides.
  const sy = s.sdY;
  const y = movedMore(s, { ...s, meanY: s.meanY + 1.5 * sy, medianY: s.medianY + 0.35 * sy, meanX: s.meanX + 0.3 * s.sdX, medianX: s.medianX + 0.3 * s.sdX });
  assert.equal(y.axis, 'y');
  assert.equal(y.which, 'mean');
});

test('movedMore says same when nothing moves, and median when only the median does', () => {
  const s = summarize(line);
  assert.equal(movedMore(s, s).which, 'same');
  const odd = { ...s, medianY: s.medianY + 3 };
  assert.equal(movedMore(s, odd).which, 'median');
  assert.equal(movedMore(s, odd).axis, 'y');
  const both = { ...s, meanY: s.meanY + 1, medianY: s.medianY + 0.8 };
  assert.equal(movedMore(s, both).which, 'same');
});

test('movedMore calls noise-level shifts "same" and keeps the winner once a shift is real', () => {
  const s = summarize(line);
  // The median moves 0.1 sd and the mean 0.01 sd: a ratio of 10, but both are noise.
  const noise = movedMore(s, { ...s, medianY: s.medianY + 0.1 * s.sdY, meanY: s.meanY + 0.01 * s.sdY });
  assert.equal(noise.which, 'same');
  assert.equal(noise.negligible, true);
  // 0.2 sd against 0.05 sd is a real, if small, shift: the mean wins.
  const real = movedMore(s, { ...s, meanY: s.meanY + 0.2 * s.sdY, medianY: s.medianY + 0.05 * s.sdY });
  assert.equal(real.which, 'mean');
  assert.equal(real.negligible, false);
  assert.equal(movedMore(s, s).negligible, true);
});
