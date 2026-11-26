import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generatedCloud, wideTable, axisFromAngles, anglesFromAxis, axisReport, sweepAxis, projectOnAxis,
  componentCurves, squareRange, perpendicularAxis, penguinMeasurements, CLOUD_KINDS,
} from './pcalab.js';
import { fitPca, covariance, reconstructionError, varianceAlong2d, bestAxis2d } from './pca.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

// Centred rows (-1,-1.5) (1,-0.5) (1,1.5) (-1,0.5): var x 1, var y 1.25, cov 0.5, total 2.25.
const FOUR = [[0, 0], [2, 1], [2, 3], [0, 2]];

test('axisReport along x: keeps var x = 1 of 2.25, loses 1.25 (hand computed)', () => {
  const r = axisReport(FOUR, [1, 0]);
  close(r.total, 2.25); close(r.along, 1); close(r.lost, 1.25);
  close(r.keptRatio, 1 / 2.25);
});

test('axisReport at 45 degrees: along = (1 + 1.25 + 2 * 0.5) / 2 = 1.625', () => {
  const r = axisReport(FOUR, axisFromAngles(45, 0, 2));
  close(r.along, 1.625); close(r.lost, 0.625);
});

test('the information lost is the mean squared distance to the axis, and it agrees with ml/pca.js', () => {
  const X = generatedCloud('strong', 2, 3, 80);
  const u = axisFromAngles(70, 0, 2);
  const { feet } = projectOnAxis(X, u);
  const direct = X.reduce((s, row, i) => s + (row[0] - feet[i][0]) ** 2 + (row[1] - feet[i][1]) ** 2, 0) / X.length;
  close(axisReport(X, u).lost, direct, 1e-9);
  close(axisReport(X, u).along, varianceAlong2d(X, 70 * Math.PI / 180), 1e-9);
  const model = fitPca(X);
  close(axisReport(X, model.components[0]).lost, reconstructionError(model, X, 1), 1e-9);
});

test('the best axis keeps the most variance: no angle in the sweep beats it, and the perpendicular loses the most', () => {
  const X = generatedCloud('strong', 2, 5);
  const best = bestAxis2d(X);
  const sweep = sweepAxis(X, 0, 1);
  assert.ok(Math.max(...sweep.kept) <= best.variance + 1e-9);
  assert.ok(Math.max(...sweep.kept) > best.variance - 0.01);
  const perp = axisReport(X, [-best.direction[1], best.direction[0]]);
  close(perp.lost, best.variance, 1e-9);
  assert.ok(Math.abs(perp.lost - Math.max(...sweep.lost)) < 0.01);
  sweep.kept.forEach((k, i) => close(k + sweep.lost[i], perp.total, 1e-9));
  close(sweep.angles[0], 0); close(sweep.angles.at(-1), 180);
});

test('in 3-D the axis report still adds up to the total variance, and the first component keeps eigenvalue 1', () => {
  const X = generatedCloud('strong', 3, 2);
  const m = fitPca(X);
  const r = axisReport(X, m.components[0]);
  close(r.along, m.eigenvalues[0], 1e-9);
  close(r.along + r.lost, r.total, 1e-9);
  const tilted = axisReport(X, axisFromAngles(10, 60, 3));
  assert.ok(tilted.along < r.along);
});

test('axisFromAngles gives unit vectors and anglesFromAxis inverts it (the line has no direction)', () => {
  for (const [az, tilt] of [[0, 0], [35, 25], [120, -40], [179, 80]]) {
    const u = axisFromAngles(az, tilt, 3);
    close(Math.hypot(...u), 1);
    const back = anglesFromAxis(u);
    close(back.azimuth, az, 1e-9); close(back.tilt, tilt, 1e-9);
    const flipped = anglesFromAxis(u.map(v => -v));
    close(flipped.azimuth, az, 1e-9); close(flipped.tilt, tilt, 1e-9);
  }
  assert.deepEqual(axisFromAngles(90, 0, 2).map(v => Math.round(v * 1e9) / 1e9), [0, 1]);
  close(anglesFromAxis([-1, 0]).azimuth, 0);
});

test('projectOnAxis puts each row on the line through the mean', () => {
  const p = projectOnAxis(FOUR, [1, 0]);
  assert.deepEqual(p.mean, [1, 1.5]);
  assert.deepEqual(p.t, [-1, 1, 1, -1]);
  assert.deepEqual(p.feet[0], [0, 1.5]);
  assert.deepEqual(p.feet[1], [2, 1.5]);
});

test('generated clouds are seeded, centred, and have the advertised shape', () => {
  for (const d of [2, 3]) {
    const a = generatedCloud('strong', d, 4), b = generatedCloud('strong', d, 4), c = generatedCloud('strong', d, 5);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
    assert.equal(a.length, 120);
    const mean = a[0].map((_, j) => a.reduce((s, r) => s + r[j], 0) / a.length);
    mean.forEach(m => close(m, 0, 1e-9));
  }
  const share = kind => fitPca(generatedCloud(kind, 2, 1)).explainedRatio[0];
  assert.ok(share('strong') > 0.85, `strong ${share('strong')}`);
  assert.ok(share('noisy') > 0.5 && share('noisy') < 0.75, `noisy ${share('noisy')}`);
  close(share('round'), 0.5, 1e-6);
  const round3 = fitPca(generatedCloud('round', 3, 1));
  round3.explainedRatio.forEach(r => close(r, 1 / 3, 1e-6));
  assert.throws(() => generatedCloud('strong', 4, 1));
  assert.throws(() => generatedCloud('weird', 2, 1));
  assert.deepEqual(CLOUD_KINDS, ['strong', 'noisy', 'round']);
});

test('the wide table has two strong components when it is tight, a flat scree when it is round', () => {
  const tight = fitPca(wideTable('strong', 1));
  assert.equal(tight.d, 8);
  const two = tight.explainedRatio[0] + tight.explainedRatio[1];
  assert.ok(two > 0.8, `two components explain ${two}`);
  const noisy = fitPca(wideTable('noisy', 1));
  assert.ok(noisy.explainedRatio[0] + noisy.explainedRatio[1] < two);
  const round = fitPca(wideTable('round', 1));
  round.explainedRatio.forEach(r => close(r, 1 / 8, 1e-6));
});

test('componentCurves: percentages add up and the lost curve equals reconstructionError / total', () => {
  const X = wideTable('strong', 2, 100, 6);
  const m = fitPca(X);
  const c = componentCurves(m);
  close(c.explained.reduce((s, v) => s + v, 0), 100, 1e-9);
  close(c.cumulative.at(-1), 100, 1e-9);
  assert.equal(c.lostByK.length, 7);
  close(c.lostByK[0], 100, 1e-9); close(c.lostByK[6], 0, 1e-9);
  const total = covariance(X).reduce((s, row, i) => s + row[i], 0);
  for (let k = 0; k <= 6; k++) close(c.lostByK[k], reconstructionError(m, X, k) / total * 100, 1e-7);
  for (let k = 1; k < 7; k++) assert.ok(c.lostByK[k] <= c.lostByK[k - 1]);
});

test('squareRange holds the data, starts at a whole number, and has whole grid steps', () => {
  const r = squareRange([[0.5, -3.2], [1, 2]], 0, 1);
  assert.equal(r.minX, -5); assert.equal(r.minY, -5); assert.equal(r.span, 10);
  const wide = squareRange([[5.5, 1]], 0, 1);          // low 6, span 15: -6 .. 9, grid every 3
  assert.equal(wide.minX, -6); assert.equal(wide.span, 15);
  for (const X of [[[5.5, -5.9]], [[-4.9, 4.9]], [[1500, 10], [-900, 20]], [[0.1, 0.2]]]) {
    const q = squareRange(X, 0, 1), big = Math.max(...X.flat().map(Math.abs));
    assert.ok(q.minX <= -big && q.minX + q.span >= big, JSON.stringify(q));
    assert.ok(Number.isInteger(q.span / 5), JSON.stringify(q));
  }
  const grams = squareRange([[1500, 10], [-900, 20]], 0, 1);
  assert.equal(grams.minX, -2000); assert.equal(grams.span, 5000);
});

test('penguinMeasurements drops rows with a missing value and counts them', () => {
  const row = (species, f, m, b = 40, d = 18) => ({ species, bill_length_mm: b, bill_depth_mm: d, flipper_length_mm: f, body_mass_g: m });
  const t = penguinMeasurements({ rows: [row('Adelie', 181, 3750), row('Adelie', null, null), row('Gentoo', 210, 5000, null), row('Gentoo', 215, 5100)] });
  assert.equal(t.X.length, 2); assert.equal(t.dropped, 2); assert.equal(t.total, 4);
  assert.deepEqual(t.species, ['Adelie', 'Gentoo']);
  assert.deepEqual(t.X[1], [40, 18, 215, 5100]);
});

test('perpendicularAxis: from the best axis it returns the preferred second component; always at right angles', () => {
  const m = fitPca(generatedCloud('strong', 3, 2));
  const p = perpendicularAxis(m.components[0], m.components[1]);
  p.forEach((v, j) => close(Math.abs(v), Math.abs(m.components[1][j]), 1e-9));
  for (const [az, tilt] of [[10, 70], [100, -20], [0, 0]]) {
    const u = axisFromAngles(az, tilt, 3), q = perpendicularAxis(u, m.components[1]);
    close(Math.hypot(...q), 1); close(q.reduce((s, x, j) => s + x * u[j], 0), 0, 1e-9);
  }
  const q2 = perpendicularAxis([0.6, 0.8], [0.6, 0.8]);   // prefer is parallel: falls back
  close(q2[0] * 0.6 + q2[1] * 0.8, 0, 1e-9);
  close(Math.abs(perpendicularAxis([1, 0])[1]), 1);
});
