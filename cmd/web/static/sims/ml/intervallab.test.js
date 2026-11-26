import test from 'node:test';
import assert from 'node:assert/strict';
import {
  METHODS, GEN, PEN, SWEEP, generatedScenario, penguinRows, penguinsScenario, fitScenario, intervalMethods,
  scoreAt, sweepShift, insideShare, shiftVerdict, sweepIndex,
} from './intervallab.js';
import { parseCsv } from './tabular.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

// A hand-made scenario: the model fits y = 2x exactly, so every calibration residual is the number written below.
function handmade(testY) {
  const r = [0.5, -0.1, 0.9, 0.3, -0.7, 0.2, 0.8, -0.4, 0.6];
  const calX = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  return {
    kind: 'generated', seed: 1, degree: 1,
    train: { x: [0, 1, 2, 3], y: [0, 2, 4, 6] },
    calPool: { x: calX, y: calX.map((x, i) => 2 * x + r[i]) },
    testAt: () => ({ x: [0, 1, 2, 3], y: testY }),
  };
}

test('SWEEP is 21 severities from 0 to 1 in steps of 0.05, and sweepIndex finds each one', () => {
  assert.equal(SWEEP.length, 21);
  assert.equal(SWEEP[0], 0); assert.equal(SWEEP[20], 1); assert.equal(SWEEP[7], 0.35);
  SWEEP.forEach((s, i) => assert.equal(sweepIndex(s), i));
  assert.equal(sweepIndex(5), 20); assert.equal(sweepIndex(-1), 0);
});

test('split conformal by hand: 9 calibration residuals at alpha 0.2 give q = 0.8, so the band is the curve +/- 0.8', () => {
  // |residuals| sorted: .1 .2 .3 .4 .5 .6 .7 .8 .9; k = ceil(10 * 0.8) = 8 -> the 8th is 0.8.
  const scn = handmade([0.5, 2.85, 3.1, 6.1]);           // errors against 2x: +0.5, +0.85, -0.9, +0.1
  const fitted = fitScenario(scn);
  const m = intervalMethods(fitted, { alpha: 0.2, calSize: 9 });
  close(m.conformal.q, 0.8);
  assert.equal(m.conformal.m, 9);
  const iv = m.conformal.predict(1);
  close(iv.lo, 2 - 0.8, 1e-6); close(iv.hi, 2 + 0.8, 1e-6);
  const s = scoreAt(m, scn, 0);
  assert.equal(s.coverage.conformal, 0.5);               // 0.5 and 0.1 are inside +/-0.8; 0.85 and -0.9 are not
  close(s.width.conformal, 1.6, 1e-6);
  assert.equal(s.n, 4);
});

test('a calibration set that is too small for alpha gives an infinite band that covers everything', () => {
  const scn = generatedScenario({ seed: 3 });
  const fitted = fitScenario(scn);
  const small = intervalMethods(fitted, { alpha: 0.05, calSize: 10 });    // needs ceil(11 * 0.95) = 11 > 10 rows
  assert.equal(small.conformal.q, Infinity);
  assert.ok(small.conformal.infinite);
  const s = scoreAt(small, scn, 0.5);
  assert.equal(s.coverage.conformal, 1);
  assert.equal(s.width.conformal, Infinity);
  const enough = intervalMethods(fitted, { alpha: 0.05, calSize: 19 });   // ceil(20 * 0.95) = 19 rows: just enough
  assert.ok(Number.isFinite(enough.conformal.q) && !enough.conformal.infinite);
});

test('generatedScenario is deterministic and keeps training, calibration and test rows apart', () => {
  const a = generatedScenario({ seed: 5 }), b = generatedScenario({ seed: 5 }), c = generatedScenario({ seed: 6 });
  assert.deepEqual(a.train, b.train);
  assert.notDeepEqual(a.train.y, c.train.y);
  assert.equal(a.train.x.length, GEN.nTrain);
  assert.equal(a.calPool.x.length, GEN.calMax);
  const seen = new Set(a.train.x);
  assert.ok(a.calPool.x.every(x => !seen.has(x)), 'a calibration row is also a training row');
  assert.equal(a.testAt(0).x.length, GEN.nTest);
  // Growing the calibration size only adds rows: the first 50 are the same 50 each time.
  const f = fitScenario(a);
  assert.equal(intervalMethods(f, { calSize: 50 }).conformal.m, 50);
  assert.equal(intervalMethods(f, { calSize: 9999 }).conformal.m, GEN.calMax);
});

test('shift severity moves the test inputs by 2 * severity and leaves the true rule alone', () => {
  const scn = generatedScenario({ seed: 5 });
  const t0 = scn.testAt(0), t5 = scn.testAt(0.5), t1 = scn.testAt(1);
  for (const i of [0, 100, 399]) { close(t5.x[i], t0.x[i] + 1); close(t1.x[i], t0.x[i] + 2); }
  assert.equal(scn.shiftBy(0.4), 0.8);
  assert.ok(t0.x[0] >= -1 && t0.x[GEN.nTest - 1] <= 1);
  assert.equal(scn.testAt(0.5), scn.testAt(0.5));         // memoised: the same object, so chart and readout agree
  assert.ok(insideShare(scn.train.x, t0.x) > 0.95);
  assert.ok(insideShare(scn.train.x, t1.x) < 0.05);
});

test('insideShare by hand: 3 of 5 test inputs lie inside the training range [0, 10]', () => {
  assert.equal(insideShare([0, 4, 10], [-1, 0, 5, 10, 11]), 0.6);
  assert.ok(Number.isNaN(insideShare([0, 1], [])));
});

test('coverage of split conformal is near the target with no shift and drops as the inputs move away', () => {
  for (const noise of ['constant', 'growing']) {
    const scn = generatedScenario({ seed: 41, noise });
    const m = intervalMethods(fitScenario(scn), { alpha: 0.1, calSize: 100 });
    const sw = sweepShift(m, scn);
    assert.equal(sw.length, SWEEP.length);
    assert.ok(sw[0].coverage.conformal > 0.8 && sw[0].coverage.conformal < 0.98, `${noise}: ${sw[0].coverage.conformal}`);
    assert.ok(sw[20].coverage.conformal < sw[0].coverage.conformal - 0.5, `${noise}: ${sw[20].coverage.conformal}`);
    assert.equal(shiftVerdict(sw, 0), 'stays');
    assert.equal(shiftVerdict(sw, 8), 'drops');
    // The bootstrap band holds model uncertainty only, so it is far below the target even with no shift.
    assert.ok(sw[0].coverage.bootstrap < 0.5);
    // Quantile regression adapts its width to the noise; conformal's width is one number everywhere.
    assert.equal(sw[0].width.conformal, sw[20].width.conformal);
  }
});

test('shiftVerdict reads the mean change in coverage from the no-shift entry', () => {
  const entry = (a, b, c) => ({ coverage: { conformal: a, quantile: b, bootstrap: c } });
  const sweep = [entry(0.9, 0.9, 0.9), entry(0.89, 0.9, 0.92), entry(0.7, 0.7, 0.7), entry(0.95, 0.95, 0.95)];
  assert.equal(shiftVerdict(sweep, 1), 'stays');       // mean change +0.003
  assert.equal(shiftVerdict(sweep, 2), 'drops');       // -0.2
  assert.equal(shiftVerdict(sweep, 3), 'rises');       // +0.05
});

test('a method score is remembered while its settings stay, and recomputed when they change', () => {
  const scn = generatedScenario({ seed: 9 }), fitted = fitScenario(scn);
  const a = intervalMethods(fitted, { alpha: 0.1, calSize: 60 });
  const s1 = scoreAt(a, scn, 0.3);
  const b = intervalMethods(fitted, { alpha: 0.1, calSize: 120 });
  const s2 = scoreAt(b, scn, 0.3);
  assert.equal(s1.coverage.quantile, s2.coverage.quantile);       // quantile regression did not change
  assert.equal(s1.coverage.bootstrap, s2.coverage.bootstrap);
  assert.notEqual(a.conformal.key, b.conformal.key);
  const c = intervalMethods(fitted, { alpha: 0.3, calSize: 60 });
  const s3 = scoreAt(c, scn, 0.3);
  assert.ok(s3.width.conformal < s1.width.conformal);             // a lower target means a narrower band
  assert.ok(METHODS.every(n => Number.isFinite(s3.coverage[n])));
});

// --- penguins ---------------------------------------------------------------------------------

function fakeTable() {
  const lines = ['species,island,bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,sex,year'];
  const add = (sp, n, f0, m0) => { for (let i = 0; i < n; i++) lines.push(`${sp},I,40,18,${f0 + (i % 12)},${m0 + (i % 12) * 30 + (i % 5) * 20},male,2007`); };
  add('Adelie', 150, 180, 3300); add('Chinstrap', 70, 185, 3400); add('Gentoo', 120, 210, 4800);
  lines.push('Adelie,I,NA,NA,NA,NA,NA,2007', 'Gentoo,I,40,18,215,NA,male,2007');
  return parseCsv(lines.join('\n'));
}

test('penguinRows drops rows with a missing flipper length or body mass and says how many', () => {
  const p = penguinRows(fakeTable());
  assert.equal(p.total, 342); assert.equal(p.rows.length, 340); assert.equal(p.dropped, 2);
  close(p.rows[0].y, 3.3);           // grams become kilograms
});

test('penguinsScenario holds one species out of training and calibration, and severity mixes it into the test set', () => {
  const scn = penguinsScenario(fakeTable(), { seed: 4, heldOut: 'Gentoo' });
  assert.equal(scn.nHeldOut, 120);
  assert.equal(scn.degree, PEN.degree);
  assert.equal(scn.nTest, PEN.nTest);
  // Gentoo flippers are 210 or more, the others at most 196: a training row never reaches 200.
  assert.ok(Math.max(...scn.train.x) < 200 && Math.max(...scn.calPool.x) < 200);
  assert.ok(Math.min(...scn.testAt(0).x) < 200 && Math.max(...scn.testAt(0).x) < 200);
  assert.ok(Math.min(...scn.testAt(1).x) >= 210);
  const half = scn.testAt(0.5);
  assert.equal(half.x.length, PEN.nTest);
  assert.equal(half.x.filter(x => x >= 210).length, PEN.nTest / 2);
  assert.equal(scn.shiftBy(0.25), 15);
  assert.equal(scn.calPool.x.length, PEN.calMax);
  assert.deepEqual(penguinsScenario(fakeTable(), { seed: 4 }).train, scn.train);
  assert.throws(() => penguinsScenario(fakeTable(), { heldOut: 'Emperor' }), /not enough penguins/);
});

test('on the fake penguins a held-out species with larger flippers makes coverage fall', () => {
  const scn = penguinsScenario(fakeTable(), { seed: 4, heldOut: 'Gentoo' });
  const m = intervalMethods(fitScenario(scn), { alpha: 0.1, calSize: PEN.calDefault });
  const sw = sweepShift(m, scn);
  assert.ok(sw[20].coverage.conformal < sw[0].coverage.conformal);
  assert.equal(sw[0].n, PEN.nTest);
});
