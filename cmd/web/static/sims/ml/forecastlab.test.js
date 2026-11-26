import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STEPS, TRAIN_MIN, CAL_STEP, MODELS, LIMITS, DEFAULTS, normalize, shiftActive, buildSeries, planBacktest, makeModel,
  runModel, calibrationWindows, intervalsFor, windowErrors, summarize, horizonErrors, winners, shiftPartition, shiftVerdict,
} from './forecastlab.js';

const run = over => {
  const p = normalize(over), series = buildSeries(p), plan = planBacktest(p);
  const by = Object.fromEntries(MODELS.map(m => [m, runModel(series.y, m, p, plan)]));
  return { p, series, plan, by };
};

test('normalize clamps every value to its range and keeps the defaults for missing keys', () => {
  const p = normalize({ period: 99, lags: 0, horizon: 3.6, windows: 100, coverage: 10, noise: -1, style: 'x', windowShown: 50, seed: NaN });
  assert.equal(p.period, LIMITS.period[1]);
  assert.equal(p.lags, 1);
  assert.equal(p.horizon, 4);
  assert.equal(p.windows, 12);
  assert.equal(p.coverage, 50);
  assert.equal(p.noise, 0);
  assert.equal(p.style, 'expanding');
  assert.equal(p.windowShown, 12, 'the shown window stays inside the window count');
  assert.equal(p.seed, DEFAULTS.seed);
  assert.deepEqual(normalize(), normalize(DEFAULTS));
});

test('the series is generated, seeded, and only shifts when the shift is active', () => {
  const a = buildSeries({}), b = buildSeries({});
  assert.equal(a.y.length, STEPS);
  assert.deepEqual(a.y, b.y);
  assert.notDeepEqual(a.y, buildSeries({ seed: 2 }).y);
  assert.equal(shiftActive(normalize({ shiftSize: 0 })), false);
  assert.equal(shiftActive(normalize({ shiftSize: 0, shiftPhase: true })), true);
  const off = buildSeries({ shiftSize: 0 }), on = buildSeries({ shiftSize: 6, shiftAt: 190 });
  assert.equal(off.shiftAt, null);
  assert.equal(on.shiftAt, 190);
  assert.deepEqual(off.y.slice(0, 190), on.y.slice(0, 190), 'nothing changes before the shift');
  assert.ok(Math.abs(on.y[190] - off.y[190] - 6) < 1e-9, 'a plain level jump of the stated size');
});

test('the plan puts `windows` origins WINDOW_SPAN apart and the last window ends on the last step', () => {
  for (const [windows, horizon] of [[3, 1], [8, 12], [12, 24], [5, 7]]) {
    const plan = planBacktest({ windows, horizon });
    assert.equal(plan.lastOrigin + horizon, STEPS - 1);
    assert.equal(plan.firstOrigin + (windows - 1) * plan.step, plan.lastOrigin);
    assert.ok(plan.firstOrigin - horizon > TRAIN_MIN + 10 * CAL_STEP, 'room for at least ten calibration windows');
  }
  assert.deepEqual(planBacktest({}), { firstOrigin: 150, lastOrigin: 227, step: 11, count: 8 });
});

test('every model gets exactly the planned windows, forecasts the horizon, and never sees the future', () => {
  const { p, series, plan, by } = run({});
  for (const m of MODELS) {
    assert.equal(by[m].length, p.windows);
    assert.deepEqual(by[m].map(w => w.origin), by.naive.map(w => w.origin));
    assert.ok(by[m].every(w => w.forecast.length === p.horizon && w.errors.every(Number.isFinite)));
  }
  assert.equal(by.naive[0].origin, plan.firstOrigin);
  // Change a value after the first window's forecast span: the first window's forecasts do not move.
  const bent = series.y.slice(); for (let t = plan.firstOrigin + 1; t < STEPS; t++) bent[t] += 100;
  for (const m of MODELS) assert.deepEqual(runModel(bent, m, p, plan)[0].forecast, by[m][0].forecast);
});

test('the sliding style trains on the last TRAIN_MIN steps, the expanding style on everything so far', () => {
  const { p, series, plan } = run({ style: 'sliding' });
  const sliding = runModel(series.y, 'seasonal', p, plan);
  assert.ok(sliding.every(w => w.trainEnd - w.trainStart + 1 === TRAIN_MIN));
  const expanding = runModel(series.y, 'seasonal', { ...p, style: 'expanding' }, plan);
  assert.ok(expanding.every(w => w.trainStart === 0));
});

test('with a steady season the learned model beats seasonal naive, and seasonal naive beats naive, window by window', () => {
  const { by } = run({ shiftSize: 0 });
  const mase = Object.fromEntries(MODELS.map(m => [m, windowErrors(by[m], 'mase')]));
  assert.ok(mase.learned.every((v, i) => v < mase.seasonal[i]), JSON.stringify(mase));
  assert.ok(mase.seasonal.every((v, i) => v < mase.naive[i]));
});

test('windowErrors, summarize and horizonErrors agree with a hand calculation', () => {
  const w = [
    { errors: [3, -4], mase: 1 }, { errors: [-1, 1], mase: 2 }, { errors: [0, 6], mase: 0.5 },
  ];
  assert.deepEqual(windowErrors(w, 'mae'), [3.5, 1, 3]);
  assert.deepEqual(windowErrors(w, 'rmse').map(v => Number(v.toFixed(4))), [3.5355, 1, 4.2426]);
  assert.deepEqual(windowErrors(w, 'mase'), [1, 2, 0.5]);
  const s = summarize(w, 'mae');
  assert.equal(s.mean, (3.5 + 1 + 3) / 3);
  assert.equal(s.worst, 3.5);
  assert.equal(s.worstIndex, 0);
  assert.throws(() => windowErrors(w, 'r2'));
  const { by } = run({});
  assert.equal(horizonErrors(by.naive, 'mae').length, 12);
});

test('winners: lowest value wins, ties go to the first model, a non-finite value never wins', () => {
  const r = winners({ a: [1, 2, NaN, 5], b: [2, 2, 3, Infinity], c: [3, 1, Infinity, 4] });
  assert.deepEqual(r.perWindow, ['a', 'c', 'b', 'c']);
  assert.deepEqual(r.counts, { a: 1, b: 1, c: 2 });
  assert.deepEqual(winners({}), { perWindow: [], counts: {} });
});

test('shiftPartition: a window is "after" once its forecast span reaches the shift', () => {
  const w = [{ testEnd: 100 }, { testEnd: 189 }, { testEnd: 190 }, { testEnd: 250 }];
  assert.deepEqual(shiftPartition(w, 190), { before: [0, 1], after: [2, 3] });
});

test('shiftVerdict compares the growth FACTOR of each model, with the absolute rise reported too', () => {
  const win = (testEnd, mase) => ({ testEnd, mase });
  const by = {
    seasonal: [win(100, 1), win(120, 1), win(200, 2), win(220, 2)],
    learned: [win(100, 0.25), win(120, 0.25), win(200, 1), win(220, 1)],
  };
  const v = shiftVerdict(by, 190);
  assert.equal(v.verdict, 'learned');
  assert.deepEqual(v.ratio, { seasonal: 2, learned: 4 });
  assert.deepEqual(v.increase, { seasonal: 1, learned: 0.75 });
  assert.deepEqual([v.nBefore, v.nAfter], [2, 2]);
  by.learned = [win(100, 1), win(120, 1), win(200, 1.9), win(220, 1.9)];
  assert.equal(shiftVerdict(by, 190).verdict, 'same', 'factors 2 and 1.9 are within 15 percent');
  by.learned = [win(100, 1), win(120, 1), win(200, 1.05), win(220, 1.05)];
  by.seasonal = [win(100, 1), win(120, 1), win(200, 1.05), win(220, 1.05)];
  assert.equal(shiftVerdict(by, 190).verdict, 'same', 'neither lost anything');
  by.seasonal = [win(100, 1), win(120, 1), win(200, 3), win(220, 3)];
  assert.equal(shiftVerdict(by, 190).verdict, 'seasonal');
  assert.equal(shiftVerdict(by, 300), null, 'no window after the shift');
  assert.equal(shiftVerdict(by, 50), null, 'no window before the shift');
  assert.equal(shiftVerdict({ seasonal: by.seasonal }, 190), null);
  by.seasonal[0].mase = Infinity;
  assert.equal(shiftVerdict(by, 190), null);
});

test('on the default series a regime shift hurts the learned model by the larger factor, and the lab can say so', () => {
  const { p, by } = run({});
  const v = shiftVerdict(by, p.shiftAt);
  assert.equal(v.verdict, 'learned');
  assert.ok(v.ratio.learned > 1.15 * v.ratio.seasonal);
  assert.deepEqual([v.nBefore, v.nAfter], [3, 5]);
  const wide = run({ style: 'expanding' }), ve = shiftVerdict(wide.by, wide.p.shiftAt);
  assert.equal(ve.verdict, 'learned');
  assert.ok(ve.after.learned < ve.after.seasonal, 'with all the history it still has the lower error after the shift');
  const flat = run({ shiftSize: 0 });
  const quiet = shiftVerdict(flat.by, flat.p.shiftAt);
  assert.ok(quiet.ratio.learned < v.ratio.learned, 'without the shift the same windows lose much less');
});

test('intervals are cut from calibration windows that end before the first test window, then frozen', () => {
  const { p, series, plan, by } = run({});
  const cal = calibrationWindows(series.y, 'learned', p, plan);
  assert.ok(cal.length >= 20);
  assert.ok(cal.every(w => w.testEnd <= plan.firstOrigin), 'calibration targets end before the first test origin');
  const iv = intervalsFor(by.learned, cal, 80);
  assert.equal(iv.infinite, false);
  assert.equal(iv.byHorizon.length, p.horizon);
  assert.ok(iv.windows.every(w => w.lo.every((v, i) => v < w.forecast[i]) && w.hi.every((v, i) => v > w.forecast[i])));
  assert.ok(iv.coverage > 0 && iv.coverage <= 1);
  // Frozen: the offsets do not depend on the test windows at all.
  assert.deepEqual(intervalsFor(by.learned.slice(0, 2), cal, 80).q, iv.q);
  // A higher target gives a wider band and covers at least as much.
  const wide = intervalsFor(by.learned, cal, 95), narrow = intervalsFor(by.learned, cal, 50);
  assert.ok(wide.width >= iv.width && iv.width >= narrow.width);
  assert.ok(wide.coverage >= narrow.coverage);
});

test('a shift after calibration costs coverage; the same series without a shift keeps it', () => {
  const cover = over => {
    const { p, series, plan, by } = run(over);
    return intervalsFor(by.learned, calibrationWindows(series.y, 'learned', p, plan), 80).coverage;
  };
  const shifted = cover({ shiftSize: 8 }), steady = cover({ shiftSize: 0 });
  assert.ok(steady > 0.6, `steady ${steady}`);
  assert.ok(shifted < steady - 0.1, `shifted ${shifted} vs steady ${steady}`);
});

test('too few calibration windows for the target give an infinite band that says so', () => {
  const { by } = run({});
  const few = [by.naive[0], by.naive[1], by.naive[2]];
  const iv = intervalsFor(by.naive, few, 95);
  assert.equal(iv.infinite, true);
  assert.equal(iv.width, Infinity);
  assert.equal(iv.coverage, 1);
});

test('extreme settings never throw and never produce a non-finite error', () => {
  const corners = [
    { period: 24, lags: 24, horizon: 24, windows: 12, style: 'sliding' },
    { period: 24, lags: 24, horizon: 24, windows: 12, style: 'expanding' },
    { period: 4, lags: 1, horizon: 1, windows: 3, style: 'sliding', seasonalIndicators: false },
    { period: 4, lags: 24, horizon: 24, windows: 3, style: 'sliding' },
    { period: 24, lags: 1, horizon: 1, windows: 12, style: 'expanding', seasonalIndicators: false },
    { noise: 3, seasonAmp: 8, shiftSize: -10, shiftAt: 60, shiftPhase: true },
    { noise: 0, seasonAmp: 0, trend: 0, shiftSize: 0 },
    { noise: 0, seasonAmp: 0, trend: -0.1, shiftSize: 10, shiftAt: 230 },
  ];
  for (const over of corners) {
    const { p, series, plan, by } = run(over);
    for (const m of MODELS) {
      assert.equal(by[m].length, p.windows, JSON.stringify(over));
      assert.ok(by[m].every(w => w.errors.every(Number.isFinite) && w.forecast.every(Number.isFinite)), `${m} ${JSON.stringify(over)}`);
    }
    const cal = calibrationWindows(series.y, 'learned', p, plan);
    assert.ok(cal.length >= 5);
    const iv = intervalsFor(by.learned, cal, 80);
    assert.ok(iv.byHorizon.every(r => Number.isFinite(r.coverage)));
  }
});

test('makeModel rejects an unknown name', () => {
  assert.throws(() => makeModel('prophet', {}));
});
