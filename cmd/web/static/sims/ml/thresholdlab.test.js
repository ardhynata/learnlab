import test from 'node:test';
import assert from 'node:assert/strict';
import { logit, blobPoints, gentooPoints, summarizeAt, mistakes, shiftBetween, boundarySegment, probabilityAt, GENERATED_SEED } from './thresholdlab.js';
import { fitLogistic, predictProba, rawCoefficients, sigmoid } from './logistic.js';
import { parseCsv } from './tabular.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

test('logit is the inverse of the sigmoid and ln 4 at 0.8', () => {
  close(logit(0.5), 0);
  close(logit(0.8), Math.log(4));
  close(sigmoid(logit(0.3)), 0.3);
});

test('blobPoints is seeded, inside the square, and the classes overlap', () => {
  const a = blobPoints(GENERATED_SEED), b = blobPoints(GENERATED_SEED), c = blobPoints(GENERATED_SEED + 1);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(a.X.length, 100);
  assert.equal(a.y.filter(v => v === 1).length, 40);
  for (const [x, y] of a.X) assert.ok(x >= 0.3 && x <= 9.7 && y >= 0.3 && y <= 9.7);
  const proba = predictProba(fitLogistic(a.X, a.y), a.X);
  const s = summarizeAt(a.y, proba, 0.5);
  assert.ok(s.fp + s.fn >= 4, 'two overlapping blobs leave some mistakes at 0.5');
  assert.ok(s.tp >= 25 && s.tn >= 45, 'but the fit is still mostly right');
});

test('gentooPoints drops rows missing a measurement, converts grams to kilograms and counts Gentoo', () => {
  const table = parseCsv([
    'species,island,bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,sex,year',
    'Adelie,Torgersen,39.1,18.7,181,3750,male,2007',
    'Adelie,Torgersen,NA,NA,NA,NA,NA,2007',
    'Gentoo,Biscoe,46.1,13.2,211,4500,female,2007',
    'Gentoo,Biscoe,45,14,210,NA,female,2007',
    'Chinstrap,Dream,46.5,17.9,192,3500,female,2007',
  ].join('\n'));
  const d = gentooPoints(table);
  assert.deepEqual(d.X, [[39.1, 3.75], [46.1, 4.5], [46.5, 3.5]]);
  assert.deepEqual(d.y, [0, 1, 0]);
  assert.equal(d.total, 5);
  assert.equal(d.dropped, 2);
  assert.equal(d.positives, 1);
});

test('summarizeAt: hand-computed counts, precision, recall and a log loss that ignores the threshold', () => {
  // scores: positives 0.9 0.6 0.4, negatives 0.7 0.3 0.1
  const y = [1, 1, 1, 0, 0, 0], p = [0.9, 0.6, 0.4, 0.7, 0.3, 0.1];
  const s = summarizeAt(y, p, 0.5);
  assert.deepEqual([s.tp, s.fp, s.tn, s.fn], [2, 1, 2, 1]);
  close(s.precision, 2 / 3);
  close(s.recall, 2 / 3);
  assert.equal(s.flagged, 3);
  const low = summarizeAt(y, p, 0.35);   // 0.4 and 0.7 are now flagged too
  assert.deepEqual([low.tp, low.fp, low.tn, low.fn], [3, 1, 2, 0]);
  close(low.recall, 1);
  close(low.precision, 3 / 4);
  close(s.logLoss, low.logLoss);
  const expected = -(Math.log(0.9) + Math.log(0.6) + Math.log(0.4) + Math.log(0.3) + Math.log(0.7) + Math.log(0.9)) / 6;
  close(s.logLoss, expected);
  const none = summarizeAt(y, p, 0.95);
  assert.equal(none.flagged, 0);
  assert.equal(none.undefined.precision, true);
  assert.equal(none.undefined.recall, false);
});

test('mistakes lists the indices of false positives and false negatives', () => {
  const y = [1, 1, 1, 0, 0, 0], p = [0.9, 0.6, 0.4, 0.7, 0.3, 0.1];
  assert.deepEqual(mistakes(y, p, 0.5), { fp: [3], fn: [2] });
  assert.deepEqual(mistakes(y, p, 0.35), { fp: [3], fn: [] });
  assert.deepEqual(mistakes(y, p, 0.8), { fp: [], fn: [1, 2] });
});

test('shiftBetween: lowering the threshold never reduces false positives or raises false negatives', () => {
  const { X, y } = blobPoints(GENERATED_SEED);
  const proba = predictProba(fitLogistic(X, y), X);
  let prev = null;
  for (let t = 0.95; t >= 0.05 - 1e-9; t -= 0.05) {
    const s = summarizeAt(y, proba, t);
    if (prev) { assert.ok(s.fp >= prev.fp); assert.ok(s.fn <= prev.fn); }
    prev = s;
  }
  const down = shiftBetween(y, proba, 0.5, 0.2);
  assert.equal(down.direction, 'lower');
  assert.ok(down.fpTo >= down.fpFrom && down.fnTo <= down.fnFrom && down.changed);
  assert.equal(shiftBetween(y, proba, 0.5, 0.5).changed, false);
});

test('boundarySegment finds the line where the probability equals the threshold', () => {
  const coef = { weights: [1, 1], bias: -1 };            // x + y - 1 = logit(0.5) = 0
  assert.deepEqual(boundarySegment(coef, 0.5, { xLo: 0, xHi: 2, yLo: 0, yHi: 2 }), [[0, 1], [1, 0]]);
  const seg = boundarySegment(coef, 0.8, { xLo: 0, xHi: 2, yLo: 0, yHi: 2 });   // x + y = 1 + ln 4
  for (const [x, y] of seg) close(probabilityAt(coef, x, y), 0.8);
  assert.equal(boundarySegment(coef, 0.5, { xLo: 5, xHi: 6, yLo: 5, yHi: 6 }), null);
  // a fitted model: every point of the segment has the threshold probability
  const { X, y } = blobPoints(GENERATED_SEED);
  const raw = rawCoefficients(fitLogistic(X, y));
  const s2 = boundarySegment(raw, 0.3, { xLo: 0, xHi: 10, yLo: 0, yHi: 10 });
  assert.ok(s2);
  for (const [x, yy] of s2) close(probabilityAt(raw, x, yy), 0.3, 1e-9);
});
