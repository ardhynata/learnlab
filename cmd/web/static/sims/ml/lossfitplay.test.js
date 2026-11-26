import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from './tabular.js';
import { makeData, bestLine, lineLoss, residuals, OUTLIER } from './lossfit.js';
import {
  rescale, penguinPoints, lineThrough, clampLine, handlePositions, dragHandle, costs, largestShare, lineShift, shiftWinner, bestAbsoluteLine, MIN_GAP,
} from './lossfitplay.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);
const LIMITS = { slopeMin: -0.5, slopeMax: 1.5, interceptMin: 0, interceptMax: 6 };
// The lesson's worked example.
import { readFileSync } from 'node:fs';
const penguinsFixture = () => penguinPoints(parseCsv(readFileSync(new URL('../../data/penguins.csv', import.meta.url), 'utf8'))).points;
const EX = [{ x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 5 }, { x: 4, y: 4 }];

test('rescale maps the smallest to lo and the largest to hi, and a constant to the middle', () => {
  const r = rescale([172, 201.5, 231], 0.5, 9.5);
  assert.deepEqual([r.min, r.max], [172, 231]);
  close(r.values[0], 0.5); close(r.values[1], 5); close(r.values[2], 9.5);
  assert.deepEqual(rescale([7, 7], 0, 10).values, [5, 5]);
});

test('penguinPoints drops rows missing either column and says how many', () => {
  const table = parseCsv('species,flipper_length_mm,body_mass_g\nA,180,3000\nA,NA,3500\nB,200,NA\nB,220,5000\nC,190,4000\n');
  const out = penguinPoints(table);
  assert.equal(out.total, 5); assert.equal(out.kept, 3); assert.equal(out.dropped, 2);
  assert.deepEqual(out.xRange, { min: 180, max: 220 });
  assert.deepEqual(out.yRange, { min: 3000, max: 5000 });
  // 180 -> 0.5, 220 -> 9.5, 190 -> 0.5 + 0.25 * 9 = 2.75; 3000 -> 0.5, 5000 -> 9.5, 4000 -> 5
  close(out.points[0].x, 0.5); close(out.points[0].y, 0.5);
  close(out.points[1].x, 9.5); close(out.points[1].y, 9.5);
  close(out.points[2].x, 2.75); close(out.points[2].y, 5);
});

test('the bundled penguins file gives 342 plotted points inside the plot', () => {
  const table = parseCsv(readFileSync(new URL('../../data/penguins.csv', import.meta.url), 'utf8'));
  const out = penguinPoints(table);
  assert.equal(out.total, 344); assert.equal(out.kept, 342); assert.equal(out.dropped, 2);
  assert.ok(out.points.every(p => p.x >= 0.5 - 1e-9 && p.x <= 9.5 + 1e-9 && p.y >= 0.5 - 1e-9 && p.y <= 9.5 + 1e-9));
  assert.deepEqual(out.xRange, { min: 172, max: 231 });
  assert.deepEqual(out.yRange, { min: 2700, max: 6300 });
  // Flippers and mass rise together: the least-squares slope is positive and strong.
  const best = bestLine(out.points, 'mse');
  assert.ok(best.slope > 0.7 && best.slope < 0.9);
});

test('lineThrough gives slope and intercept by hand, and refuses a vertical pair', () => {
  const l = lineThrough({ x: 2, y: 3 }, { x: 6, y: 5 });
  close(l.slope, 0.5); close(l.intercept, 2);
  assert.equal(lineThrough({ x: 3, y: 1 }, { x: 3, y: 9 }), null);
});

test('clampLine keeps a line inside the slider ranges and reports it', () => {
  const inside = clampLine({ slope: 0.5, intercept: 2 }, LIMITS);
  assert.equal(inside.clamped, false);
  const out = clampLine({ slope: 3, intercept: -1 }, LIMITS);
  assert.deepEqual([out.slope, out.intercept, out.clamped], [1.5, 0, true]);
});

test('handlePositions puts both handles on the line, left to right, inside the plot', () => {
  for (const line of [{ slope: 0.2, intercept: 4 }, { slope: 1.5, intercept: 6 }, { slope: -0.5, intercept: 5 }, { slope: 0, intercept: 3 }, { slope: 1.2, intercept: 0 }]) {
    const [a, b] = handlePositions(line);
    assert.ok(a.x < b.x, JSON.stringify(line));
    for (const h of [a, b]) {
      assert.ok(h.y >= 0.3 - 1e-9 && h.y <= 9.7 + 1e-9, `${JSON.stringify(line)} y ${h.y}`);
      close(h.y, line.slope * h.x + line.intercept, 1e-9);
    }
  }
  const [a, b] = handlePositions({ slope: 0.2, intercept: 4 });
  assert.deepEqual([a.x, b.x], [2, 8]);
  // A steep line leaves the plot above x = 2.47, so the handles move inward along it.
  const [c, d] = handlePositions({ slope: 1.5, intercept: 6 });
  assert.ok(d.x <= 2.47 + 1e-9);
  close(d.y, 9.7, 1e-9);
});

test('dragging a handle pivots the line about the other handle', () => {
  const start = [{ x: 2, y: 3.4 }, { x: 8, y: 4.6 }];
  const moved = dragHandle(start, 0, { x: 2, y: 5.4 }, LIMITS);
  // new line through (2, 5.4) and (8, 4.6): slope -0.8/6, intercept 5.4 + 2 * 0.8/6
  close(moved.line.slope, -0.8 / 6); close(moved.line.intercept, 5.4 + 1.6 / 6);
  assert.deepEqual(moved.handles[1], start[1]);
  assert.deepEqual(moved.handles[0], { x: 2, y: 5.4 });
  assert.deepEqual(start[0], { x: 2, y: 3.4 }, 'the input handles are not changed');
  // moving the other handle keeps the first one fixed
  const right = dragHandle(start, 1, { x: 8, y: 6.4 }, LIMITS);
  assert.deepEqual(right.handles[0], start[0]);
  close(right.line.slope, 3 / 6); // (6.4 - 3.4) / 6
});

test('a drag that would leave the slider ranges snaps to the nearest allowed line', () => {
  const start = [{ x: 2, y: 4.4 }, { x: 8, y: 5.6 }];
  const r = dragHandle(start, 1, { x: 8, y: 0 }, LIMITS); // slope (0 - 4.4) / 6 = -0.73 < -0.5
  assert.equal(r.line.slope, -0.5);
  for (const h of r.handles) close(h.y, r.line.slope * h.x + r.line.intercept, 1e-9);
});

test('two handles cannot be dragged on top of each other', () => {
  const start = [{ x: 2, y: 4 }, { x: 8, y: 5 }];
  const r = dragHandle(start, 0, { x: 7.9, y: 6 }, LIMITS);
  assert.ok(Math.abs(r.handles[0].x - r.handles[1].x) >= MIN_GAP - 1e-9);
  assert.ok(Number.isFinite(r.line.slope));
});

test('costs are r squared for MSE and |r| for MAE, and their mean is the loss', () => {
  const res = residuals(EX, 1, 1); // [0, 0, 1, -1]
  assert.deepEqual(costs(res, 'mse'), [0, 0, 1, 1]);
  assert.deepEqual(costs(res, 'mae'), [0, 0, 1, 1]);
  const res2 = residuals(EX, 0.5, 2); // [-0.5, 0, 1.5, 0]
  assert.deepEqual(costs(res2, 'mse'), [0.25, 0, 2.25, 0]);
  assert.deepEqual(costs(res2, 'mae'), [0.5, 0, 1.5, 0]);
  close(costs(res2, 'mse').reduce((s, c) => s + c, 0) / 4, lineLoss(EX, 'mse', 0.5, 2));
  assert.throws(() => costs(res, 'huber'));
});

test('largestShare finds the point carrying the most cost', () => {
  const s = largestShare([0.25, 0, 2.25, 0]);
  assert.equal(s.index, 2); close(s.share, 0.9); close(s.total, 2.5);
  assert.deepEqual(largestShare([0, 0]), { index: 0, share: 0, total: 0 });
});

test('lineShift is the RMS vertical gap between two lines, by hand', () => {
  // Parallel lines one unit apart are one unit apart everywhere.
  close(lineShift({ slope: 0.5, intercept: 2 }, { slope: 0.5, intercept: 3 }), 1);
  // Same intercept, slopes 0.2 apart over x = 0..10: sqrt(0.04 * 100 / 3).
  close(lineShift({ slope: 0.5, intercept: 2 }, { slope: 0.7, intercept: 2 }, 0, 10), Math.sqrt(4 / 3));
  // A line that did not move did not shift.
  assert.equal(lineShift({ slope: 1, intercept: 1 }, { slope: 1, intercept: 1 }), 0);
});

test('shiftWinner needs a clear 1.5 times gap, and ignores two lines that barely moved', () => {
  assert.equal(shiftWinner(1.2, 0.2), 'mse');
  assert.equal(shiftWinner(0.2, 1.2), 'mae');
  assert.equal(shiftWinner(1, 0.8), 'same');
  assert.equal(shiftWinner(0.04, 0.001), 'same');
});

test('an outlier drags the least-squares line much more than the absolute-error line', () => {
  for (const base of [makeData(11), penguinsFixture()]) {
    const withOut = [...base, OUTLIER];
    const mse = lineShift(bestLine(base, 'mse'), bestLine(withOut, 'mse'));
    const mae = lineShift(bestAbsoluteLine(base), bestAbsoluteLine(withOut));
    assert.ok(mse > 1.5 * mae, `mse ${mse} mae ${mae}`);
    assert.equal(shiftWinner(mse, mae), 'mse');
  }
});

test('bestAbsoluteLine matches the pair search in lossfit.js', () => {
  for (const pts of [makeData(11), makeData(11, { outlier: true }), makeData(3, { n: 9 }), EX]) {
    const a = bestAbsoluteLine(pts), b = bestLine(pts, 'mae');
    close(a.loss, b.loss, 1e-9);
    close(lineLoss(pts, 'mae', a.slope, a.intercept), a.loss, 1e-9);
  }
  // one point: no pair, falls back to y = 0
  assert.deepEqual(bestAbsoluteLine([{ x: 1, y: 2 }]), { slope: 0, intercept: 0, loss: 2 });
});
