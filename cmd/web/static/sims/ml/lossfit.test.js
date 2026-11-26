import test from 'node:test';
import assert from 'node:assert/strict';
import {
  residuals, meanSquaredError, meanAbsoluteError, huberLoss, lossOf, lineLoss, makeData, bestSlopeForIntercept,
  bestLine, lossCurve, linspace, maeBreakpoints, OUTLIER, residualSquares,
} from './lossfit.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

// The lesson's worked example: four points, two candidate lines, then one outlier.
const EX = [{ x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 5 }, { x: 4, y: 4 }];
const EX_OUT = [...EX, { x: 5, y: 11 }];

test('residuals are actual minus predicted, by hand', () => {
  assert.deepEqual(residuals(EX, 1, 1), [0, 0, 1, -1]);
  assert.deepEqual(residuals(EX, 0.5, 2), [-0.5, 0, 1.5, 0]);
});

test('MSE and MAE of the worked example match the hand calculation', () => {
  close(lineLoss(EX, 'mse', 1, 1), 0.5);
  close(lineLoss(EX, 'mae', 1, 1), 0.5);
  close(lineLoss(EX, 'mse', 0.5, 2), 0.625);
  close(lineLoss(EX, 'mae', 0.5, 2), 0.5);
  close(lineLoss(EX_OUT, 'mse', 1, 1), 5.4);
  close(lineLoss(EX_OUT, 'mae', 1, 1), 1.4);
  close(lineLoss(EX_OUT, 'mse', 0.5, 2), 8.95);
  close(lineLoss(EX_OUT, 'mae', 0.5, 2), 1.7);
});

test('losses of known residual lists, and the loss dispatcher', () => {
  close(meanSquaredError([3, -4]), 12.5);
  close(meanAbsoluteError([3, -4]), 3.5);
  close(lossOf('mse', [1, -1, 2]), 2);
  close(lossOf('mae', [1, -1, 2]), 4 / 3);
  assert.throws(() => lossOf('accuracy', [1]));
});

test('Huber is squared for small misses and linear for big ones', () => {
  close(huberLoss([0.5], 1), 0.125);
  close(huberLoss([3], 1), 2.5);
  close(huberLoss([0.5, 3], 1), (0.125 + 2.5) / 2);
});

test('the seeded dataset is reproducible, has about 20 points and stays on the plot', () => {
  const a = makeData(11), b = makeData(11);
  assert.deepEqual(a, b);
  assert.equal(a.length, 20);
  for (const p of a) assert.ok(p.x >= 0 && p.x <= 10 && p.y >= 0 && p.y <= 10);
  const withOutlier = makeData(11, { outlier: true });
  assert.equal(withOutlier.length, 21);
  assert.deepEqual(withOutlier.at(-1), OUTLIER);
  assert.deepEqual(withOutlier.slice(0, 20), a);
});

test('snapping gives a loss no larger than any grid candidate, for both losses', () => {
  for (const outlier of [false, true]) {
    const pts = makeData(11, { outlier });
    for (const kind of ['mse', 'mae']) {
      const best = bestLine(pts, kind);
      close(best.loss, lineLoss(pts, kind, best.slope, best.intercept));
      for (const s of linspace(-1, 2, 61)) for (const b of linspace(-2, 8, 51)) {
        assert.ok(best.loss <= lineLoss(pts, kind, s, b) + 1e-9, `${kind} outlier=${outlier} slope ${s} intercept ${b}`);
      }
    }
  }
});

test('the best MAE line is at least as good in MAE as the least-squares line, and vice versa for MSE', () => {
  const pts = makeData(11, { outlier: true });
  const ls = bestLine(pts, 'mse'), lad = bestLine(pts, 'mae');
  assert.ok(lineLoss(pts, 'mae', lad.slope, lad.intercept) <= lineLoss(pts, 'mae', ls.slope, ls.intercept));
  assert.ok(lineLoss(pts, 'mse', ls.slope, ls.intercept) <= lineLoss(pts, 'mse', lad.slope, lad.intercept));
});

test('least squares on the worked example is slope 0.8, intercept 1.5', () => {
  const b = bestLine(EX, 'mse');
  close(b.slope, 0.8);
  close(b.intercept, 1.5);
  close(b.loss, 0.45);
});

test('best slope for a fixed intercept is the curve minimum, for both losses', () => {
  const pts = makeData(11, { outlier: true });
  const slopes = linspace(-1, 2, 3001);
  for (const kind of ['mse', 'mae']) {
    for (const b of [0, 1.5, 3.2]) {
      const s = bestSlopeForIntercept(pts, kind, b);
      const at = lineLoss(pts, kind, s, b);
      for (const v of lossCurve(pts, kind, b, slopes)) assert.ok(at <= v + 1e-9, `${kind} b=${b}`);
    }
  }
});

test('the MSE curve is a parabola: constant second difference, 2 * mean(x^2) * h^2', () => {
  const pts = makeData(11);
  const h = 0.1, ys = lossCurve(pts, 'mse', 1.5, [0.2, 0.2 + h, 0.2 + 2 * h, 0.2 + 3 * h]);
  const d2 = [ys[0] - 2 * ys[1] + ys[2], ys[1] - 2 * ys[2] + ys[3]];
  close(d2[0], d2[1], 1e-9);
  close(d2[0], 2 * h * h * pts.reduce((s, p) => s + p.x * p.x, 0) / pts.length, 1e-9);
});

test('the MAE curve is piecewise linear: straight between neighbouring breakpoints', () => {
  const pts = makeData(11, { outlier: true }), b = 1.5;
  const bps = maeBreakpoints(pts, b);
  assert.equal(bps.length, pts.length);
  for (let i = 0; i + 1 < bps.length; i++) {
    const lo = bps[i], hi = bps[i + 1];
    if (hi - lo < 1e-6) continue;
    const [a, m, c] = lossCurve(pts, 'mae', b, [lo, (lo + hi) / 2, hi]);
    close(m, (a + c) / 2, 1e-9);
    const [q1, q3] = lossCurve(pts, 'mae', b, [lo + (hi - lo) / 4, lo + 3 * (hi - lo) / 4]);
    close(q1, 0.75 * a + 0.25 * c, 1e-9);
    close(q3, 0.25 * a + 0.75 * c, 1e-9);
  }
});

test('the MAE curve is convex and its minimum sits at a breakpoint', () => {
  const pts = makeData(11);
  const b = 1.5, s = bestSlopeForIntercept(pts, 'mae', b);
  assert.ok(maeBreakpoints(pts, b).some(v => Math.abs(v - s) < 1e-12));
  const ys = lossCurve(pts, 'mae', b, linspace(-1, 2, 301));
  for (let i = 1; i + 1 < ys.length; i++) assert.ok(ys[i - 1] - 2 * ys[i] + ys[i + 1] >= -1e-9);
});

test('one outlier raises MSE far more than MAE, and drags the least-squares line more', () => {
  const clean = makeData(11), dirty = makeData(11, { outlier: true });
  const ls = bestLine(clean, 'mse'), lad = bestLine(clean, 'mae');
  const mseJump = lineLoss(dirty, 'mse', ls.slope, ls.intercept) / lineLoss(clean, 'mse', ls.slope, ls.intercept);
  const maeJump = lineLoss(dirty, 'mae', lad.slope, lad.intercept) / lineLoss(clean, 'mae', lad.slope, lad.intercept);
  assert.ok(mseJump > 3 * maeJump, `MSE rose ${mseJump.toFixed(1)}x, MAE rose ${maeJump.toFixed(1)}x`);
  const ls2 = bestLine(dirty, 'mse'), lad2 = bestLine(dirty, 'mae');
  const move = (a, b) => Math.hypot(a.slope - b.slope, (a.intercept - b.intercept) / 10);
  assert.ok(move(ls, ls2) > 3 * move(lad, lad2));
});

test('residualSquares: side equals |residual|, hangs toward the middle, biggest first', () => {
  const pts = [{ x: 2, y: 3 }, { x: 8, y: 7 }, { x: 5, y: 4 }, { x: 9, y: 1 }];
  const res = residuals(pts, 0.5, 2); // 0, 1, -0.5, -5.5: the first is too small for a square
  const sq = residualSquares(pts, res);
  assert.deepEqual(sq.map(s => s.index), [3, 1, 2]);
  const big = sq[0];
  close(big.size, 5.5); close(big.x1 - big.x0, -5.5); // x = 9 is right of the middle, so it hangs left
  close(big.y1, pts[3].y - res[3]);                   // the far corner is on the line
  close(sq[2].x1 - sq[2].x0, 0.5);                    // x = 5 is not right of the middle, so it hangs right
  for (const s of sq) close(Math.abs(s.x1 - s.x0), Math.abs(s.y1 - s.y0));
});

test('residualSquares: max keeps the biggest, ties are stable, tiny residuals are skipped', () => {
  const pts = [{ x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 5 }, { x: 4, y: 4 }];
  const sq = residualSquares(pts, [0, 1, 1, -3], { max: 2 });
  assert.deepEqual(sq.map(s => s.index), [3, 1]);
  assert.equal(residualSquares(pts, [0.01, 0, -0.019, 0]).length, 0);
});
