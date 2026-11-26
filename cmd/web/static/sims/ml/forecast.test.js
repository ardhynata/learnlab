import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeSeries, naive, seasonalNaive, movingAverage, drift, featureRow, arModel, mae, rmse, smape, mase,
  rollingWindows, rollingOrigin, evaluate, residualQuantiles, addIntervals, coverageByHorizon,
  coverageOverall, backtestIntervals,
} from './forecast.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);
const mean = xs => xs.reduce((s, v) => s + v, 0) / xs.length;
const P = 12;

// ---------- makeSeries ----------

test('makeSeries is deterministic and its components add up to y exactly', () => {
  const a = makeSeries({ n: 60, seed: 7 }), b = makeSeries({ n: 60, seed: 7 }), c = makeSeries({ n: 60, seed: 8 });
  assert.deepEqual(a.y, b.y);
  assert.notDeepEqual(a.y, c.y);
  assert.equal(a.y.length, 60);
  for (let t = 0; t < 60; t++) close(a.y[t], a.level + a.trend[t] + a.season[t] + a.shift[t] + a.noise[t], 1e-12);
  for (let t = 0; t < 60; t++) close(a.signal[t], a.y[t] - a.noise[t], 1e-12);
  assert.equal(a.shiftAt, null);
  assert.ok(a.shift.every(v => v === 0));
});

test('makeSeries components have the stated shape: linear trend, periodic season, noise of the stated size', () => {
  const s = makeSeries({ n: 4000, seed: 3, period: 7, trend: 0.25, seasonAmp: 2, noise: 0.8, level: 5 });
  for (let t = 0; t < 4000; t++) close(s.trend[t], 0.25 * t, 1e-9);
  for (let t = 0; t + 7 < 4000; t += 97) close(s.season[t], s.season[t + 7], 1e-9);
  const m = mean(s.noise), sd = Math.sqrt(mean(s.noise.map(v => (v - m) ** 2)));
  assert.ok(Math.abs(m) < 0.06, `noise mean ${m}`);
  assert.ok(Math.abs(sd - 0.8) < 0.04, `noise sd ${sd}`);
  const quiet = makeSeries({ n: 30, noise: 0, level: 5, trend: 0.5 });
  assert.deepEqual(quiet.y, quiet.signal);
  assert.ok(quiet.y.every((v, t) => Math.abs(v - (5 + 0.5 * t + quiet.season[t])) < 1e-12));
});

test('makeSeries regime shift: a plain level jump by default, plus an optional phase move', () => {
  const base = makeSeries({ n: 80, seed: 4 });
  const jump = makeSeries({ n: 80, seed: 4, regimeShiftAt: 50, regimeShiftSize: 6 });
  assert.equal(jump.shiftAt, 50);
  for (let t = 0; t < 80; t++) close(jump.y[t] - base.y[t], t >= 50 ? 6 : 0, 1e-12);   // same noise, only the level moves
  const phased = makeSeries({ n: 80, seed: 4, regimeShiftAt: 50, regimeShiftPhase: 0.5 });
  for (let t = 0; t < 50; t++) close(phased.y[t], base.y[t], 1e-12);
  for (let t = 50; t < 80; t++) close(phased.season[t], base.season[t - 6], 1e-9);   // the pattern runs half a period (6 steps) early
});

// ---------- baselines ----------

test('naive, moving average and drift on a tiny history (hand-computed)', () => {
  const h = [1, 2, 4, 8];
  assert.deepEqual(naive()(h, 3), [8, 8, 8]);
  assert.deepEqual(movingAverage(2)(h, 2), [6, 6]);            // (4 + 8) / 2
  assert.deepEqual(movingAverage(4)(h, 1), [3.75]);            // 15 / 4
  const d = drift()(h, 2);                                      // slope (8 - 1) / 3
  close(d[0], 8 + 7 / 3); close(d[1], 8 + 14 / 3);
  assert.throws(() => drift()([1], 2), /history/);
  assert.throws(() => movingAverage(5)(h, 1), /history/);
});

test('seasonalNaive on a tiny series repeats the last season and wraps for horizons beyond one period', () => {
  const sn = seasonalNaive(3);
  // history [10 20 30 40 50]: the last season is [30 40 50]
  assert.deepEqual(sn([10, 20, 30, 40, 50], 5), [30, 40, 50, 30, 40]);
  assert.deepEqual(sn([10, 20, 30], 3), [10, 20, 30]);
  assert.deepEqual(seasonalNaive(1)([5, 9], 3), [9, 9, 9]);      // period 1 is the plain naive
  assert.throws(() => sn([1, 2], 1), /history/);
  assert.throws(() => seasonalNaive(0), /period/);
});

// ---------- metrics ----------

test('mae, rmse and smape on hand-computed values', () => {
  const a = [3, 5, 8], f = [2, 7, 8];                           // errors 1, -2, 0
  close(mae(a, f), 1); close(rmse(a, f), Math.sqrt(5 / 3));
  close(smape([100, 200], [110, 150]), (200 * 10 / 210 + 200 * 50 / 350) / 2);
  assert.equal(smape([0, 4], [0, 4]), 0);                       // 0 / 0 counts as no error
  close(smape([0], [5]), 200);
  assert.throws(() => mae([1, 2], [1]), /same length/);
});

test('MASE of a 6-point example is exact, for the plain and the seasonal scale', () => {
  const train = [2, 4, 3, 5, 4, 6];                              // 6 in-sample points
  const actual = [7, 5, 8], forecast = [6, 6, 6];               // absolute errors 1, 1, 2 -> mae 4/3
  // period 1: |diffs| = 2 1 2 1 2, scale = 8/5, MASE = (4/3) / (8/5) = 5/6
  close(mase(actual, forecast, train, 1), 5 / 6, 1e-12);
  // period 2: |train[i] - train[i-2]| = 1 1 1 1, scale = 1, MASE = 4/3
  close(mase(actual, forecast, train, 2), 4 / 3, 1e-12);
  assert.equal(mase([1], [1], [3, 3, 3], 1), 0);                // zero scale, zero error
  assert.equal(mase([1], [2], [3, 3, 3], 1), Infinity);
  assert.throws(() => mase([1], [1], [1, 2], 2), /more than 2/);
});

// ---------- rolling origin ----------

test('rollingWindows: expanding and sliding boundaries, step, and no partial window at the end', () => {
  // n = 10 (indices 0..9), initial 4, horizon 2, step 2 -> origins 3, 5, 7 (origin 9 has no room)
  const exp = rollingWindows({ n: 10, initial: 4, horizon: 2, step: 2, expanding: true });
  assert.deepEqual(exp, [
    { origin: 3, trainStart: 0, trainEnd: 3, testStart: 4, testEnd: 5 },
    { origin: 5, trainStart: 0, trainEnd: 5, testStart: 6, testEnd: 7 },
    { origin: 7, trainStart: 0, trainEnd: 7, testStart: 8, testEnd: 9 },
  ]);
  const sli = rollingWindows({ n: 10, initial: 4, horizon: 2, step: 2, expanding: false });
  assert.deepEqual(sli.map(w => [w.trainStart, w.trainEnd, w.testStart, w.testEnd]), [[0, 3, 4, 5], [2, 5, 6, 7], [4, 7, 8, 9]]);
  assert.ok(sli.every(w => w.trainEnd - w.trainStart + 1 === 4));          // sliding keeps `initial` points
  // step 3: origins 3, 6 (the next, 9, would need values 10 and 11)
  assert.deepEqual(rollingWindows({ n: 10, initial: 4, horizon: 2, step: 3 }).map(w => w.origin), [3, 6]);
  // step 1 default, horizon 1: every origin from initial - 1 to n - 2
  assert.deepEqual(rollingWindows({ n: 6, initial: 3, horizon: 1 }).map(w => w.origin), [2, 3, 4]);
  // explicit first/last origin
  assert.deepEqual(rollingWindows({ n: 20, initial: 4, horizon: 2, step: 1, firstOrigin: 10, lastOrigin: 12 }).map(w => w.origin), [10, 11, 12]);
  assert.deepEqual(rollingWindows({ n: 5, initial: 5, horizon: 1 }), []);   // nothing left to forecast
  assert.throws(() => rollingWindows({ n: 10, initial: 4, horizon: 2, firstOrigin: 2 }), /initial/);
});

test('rollingOrigin hands the model only the training slice and records actual, forecast, errors, scale', () => {
  const series = [2, 4, 3, 5, 4, 6, 5, 7, 9, 8];
  const seen = [];
  const spy = (history, horizon) => { seen.push(history.slice()); return naive()(history, horizon); };
  const { windows } = rollingOrigin({ series, initial: 4, horizon: 2, step: 3, expanding: false, model: spy });
  assert.deepEqual(seen, [[2, 4, 3, 5], [5, 4, 6, 5]]);          // origins 3 and 6, sliding length 4
  assert.deepEqual(windows.map(w => w.origin), [3, 6]);
  assert.deepEqual(windows[0].actual, [4, 6]);
  assert.deepEqual(windows[0].forecast, [5, 5]);                  // naive: last value 5
  assert.deepEqual(windows[0].errors, [-1, 1]);
  close(windows[0].scale, (2 + 1 + 2) / 3);                       // |4-2| |3-4| |5-3|
  close(windows[0].mase, 1 / (5 / 3));
  const expanded = [];
  rollingOrigin({ series, initial: 4, horizon: 2, step: 3, expanding: true, model: (h, k) => { expanded.push(h.length); return naive()(h, k); } });
  assert.deepEqual(expanded, [4, 7]);                              // expanding trains on 0..origin
  assert.throws(() => rollingOrigin({ series, initial: 4, horizon: 2 }), /model/);
});

test('no future leakage: featureRow at origin t reads only y[0..t]', () => {
  const y = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepEqual(featureRow(y, 5, 2, { lags: 3, period: 4 }), [6, 5, 4, 0, 0, 1]);   // phase (5 + 2) % 4 = 3
  assert.deepEqual(featureRow(y, 6, 2, { lags: 3, period: 4 }), [7, 6, 5, 0, 0, 0]);   // phase 0 is the dropped baseline
  assert.deepEqual(featureRow(y, 5, 1, { lags: 2, period: 4, seasonal: false }), [6, 5]);
  const clean = featureRow(y, 5, 3, { lags: 4, period: 4 });
  const poisoned = y.map((v, i) => (i > 5 ? NaN : v));            // everything after the origin is garbage
  assert.deepEqual(featureRow(poisoned, 5, 3, { lags: 4, period: 4 }), clean);
  assert.ok(featureRow(poisoned, 5, 3, { lags: 4, period: 4 }).every(Number.isFinite));
});

test('no future leakage: a rolling forecast is unchanged when every value after its origin is replaced', () => {
  const s = makeSeries({ n: 150, seed: 5, trend: 0.15, seasonAmp: 4, noise: 0.6 }).y;
  const garbage = s.map((v, i) => (i > 100 ? 1e6 + i : v));
  for (const mode of ['direct', 'recursive']) {
    const model = arModel({ period: P, mode });
    const run = series => rollingOrigin({ series, initial: 60, horizon: 6, step: 4, model }).windows;
    const a = run(s), b = run(garbage);
    const early = a.filter(w => w.origin <= 100);
    assert.ok(early.length >= 8);
    early.forEach(w => assert.deepEqual(b.find(x => x.origin === w.origin).forecast, w.forecast));
    const w = early[early.length - 1];                              // and it equals a forecast from the truncated series alone
    assert.deepEqual(model(s.slice(0, w.origin + 1), 6), w.forecast);
  }
});

// ---------- learned model ----------

test('arModel recovers a noise-free trend + seasonal series exactly, direct and recursive, sliding and expanding', () => {
  const s = makeSeries({ n: 120, noise: 0, trend: 0.15, seasonAmp: 4, period: P }).y;
  for (const mode of ['direct', 'recursive']) {
    for (const expanding of [true, false]) {
      const { windows } = rollingOrigin({ series: s, initial: 48, horizon: 6, step: 3, expanding, model: arModel({ period: P, lambda: 1e-6, mode }) });
      const worst = Math.max(...windows.flatMap(w => w.errors.map(Math.abs)));
      assert.ok(worst < 1e-3, `${mode} expanding=${expanding}: worst error ${worst}`);   // a phase bug would be off by about the season amplitude
    }
  }
});

test('arModel recursive feeds its own forecasts back: a geometric series is continued past the history', () => {
  const hist = Array.from({ length: 30 }, (_, i) => 2 * 1.1 ** i);
  const f = arModel({ lags: 1, seasonal: false, lambda: 1e-9, mode: 'recursive' })(hist, 4);
  const last = hist[hist.length - 1];
  f.forEach((v, i) => close(v / (last * 1.1 ** (i + 1)), 1, 1e-4));          // step 2..4 only exist if step 1 was fed back
  const d = arModel({ lags: 1, seasonal: false, lambda: 1e-9, mode: 'direct' })(hist, 4);
  close(d[0], f[0], 1e-9);                                                    // step 1 is the same model in both modes
});

test('arModel validates its input', () => {
  assert.throws(() => arModel({ mode: 'sideways' }), /unknown mode/);
  assert.throws(() => arModel({ period: P })(Array.from({ length: 15 }, (_, i) => i), 3), /training rows/);
  assert.throws(() => arModel({ period: P })([1, 2, 3], 1), /at least 12/);
  assert.match(arModel({ period: P, mode: 'recursive' }).label, /recursive/);
});

test('the learned model beats seasonal naive (and every other baseline) on trend + seasonality', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const s = makeSeries({ n: 180, seed, period: P, trend: 0.15, seasonAmp: 4, noise: 0.6 }).y;
    const run = model => evaluate(rollingOrigin({ series: s, initial: 72, horizon: 6, step: 3, model, period: P }).windows);
    const ar = run(arModel({ period: P })), sn = run(seasonalNaive(P));
    assert.ok(ar.mae < 0.5 * sn.mae, `seed ${seed}: AR ${ar.mae} vs seasonal naive ${sn.mae}`);
    // MASE is scaled by each window's in-sample seasonal-naive error, so seasonal naive sits near 1 by construction
    assert.ok(ar.mase < 0.5 && sn.mase > 0.8 && sn.mase < 1.25, `seed ${seed}: MASE ${ar.mase} / ${sn.mase}`);
    for (const base of [naive(), movingAverage(P), drift()]) assert.ok(ar.rmse < run(base).rmse, `seed ${seed}: ${base.label}`);
  }
});

test('evaluate pools the windows: overall figures and per-horizon figures match a hand computation', () => {
  const s = makeSeries({ n: 120, seed: 2, trend: 0.15, seasonAmp: 4, noise: 0.6 }).y;
  const { windows } = rollingOrigin({ series: s, initial: 48, horizon: 4, step: 5, model: seasonalNaive(P), period: P });
  const r = evaluate(windows);
  assert.equal(r.byHorizon.length, 4);
  assert.equal(r.n, windows.length * 4);
  close(r.mae, mean(windows.flatMap(w => w.errors.map(Math.abs))));
  close(r.rmse, Math.sqrt(mean(windows.flatMap(w => w.errors.map(e => e * e)))));
  close(r.mase, mean(windows.map(w => w.mase)), 1e-12);                       // equal-sized windows: pooled = mean of window MASE
  close(r.byHorizon[2].mae, mae(windows.map(w => w.actual[2]), windows.map(w => w.forecast[2])));
  close(r.smape, mean(windows.map(w => smape(w.actual, w.forecast))), 1e-9);
  assert.throws(() => evaluate([]), /at least one/);
});

test('the learned model loses its edge after a regime shift (sliding refit, first season after the shift)', () => {
  const at = 150;
  for (let seed = 1; seed <= 10; seed++) {
    const s = makeSeries({ n: 240, seed, period: P, trend: 0.15, seasonAmp: 4, noise: 0.6, regimeShiftAt: at, regimeShiftSize: 6, regimeShiftPhase: 0.5 }).y;
    const common = { series: s, initial: 72, horizon: 6, step: 2, expanding: false, period: P };
    const ar = rollingOrigin({ ...common, model: arModel({ period: P }) }).windows;
    const sn = rollingOrigin({ ...common, model: seasonalNaive(P) }).windows;
    const err = (ws, from, to) => evaluate(ws.filter(w => w.origin >= from && w.origin < to)).mae;
    const before = [err(ar, 0, at - 6), err(sn, 0, at - 6)];       // every test span entirely before the shift
    const after = [err(ar, at, at + P), err(sn, at, at + P)];      // origins in the first season at or after the shift
    assert.ok(before[0] < 0.5 * before[1], `seed ${seed}: before the shift AR ${before[0]} vs SN ${before[1]}`);
    assert.ok(after[0] > after[1], `seed ${seed}: after the shift AR ${after[0]} should be worse than SN ${after[1]}`);
    assert.ok(after[0] > 5 * before[0], `seed ${seed}: AR error should jump (${before[0]} -> ${after[0]})`);
  }
});

test('with an expanding refit the edge shrinks a lot after the shift (error ratio to seasonal naive at least 1.8x worse)', () => {
  const at = 150;
  for (let seed = 1; seed <= 10; seed++) {
    const s = makeSeries({ n: 240, seed, period: P, trend: 0.15, seasonAmp: 4, noise: 0.6, regimeShiftAt: at, regimeShiftSize: 6, regimeShiftPhase: 0.5 }).y;
    const common = { series: s, initial: 72, horizon: 6, step: 2, expanding: true, period: P };
    const ar = rollingOrigin({ ...common, model: arModel({ period: P }) }).windows;
    const sn = rollingOrigin({ ...common, model: seasonalNaive(P) }).windows;
    const ratio = (from, to) => evaluate(ar.filter(w => w.origin >= from && w.origin < to)).mae / evaluate(sn.filter(w => w.origin >= from && w.origin < to)).mae;
    assert.ok(ratio(at, at + P) > 1.8 * ratio(0, at - 6), `seed ${seed}: ratio ${ratio(0, at - 6)} -> ${ratio(at, at + P)}`);
  }
});

// ---------- intervals ----------

test('residualQuantiles: symmetric (conformal) and quantile methods on hand-made residuals', () => {
  const mk = errs => errs.map(e => ({ errors: [e, 2 * e], forecast: [0, 0], actual: [e, 2 * e] }));
  const nine = mk([-4, -3, -2, -1, 0, 1, 2, 3, 4]);
  // absolute errors at step 1: 4 3 2 1 0 1 2 3 4; sorted 0 1 1 2 2 3 3 4 4; m = 9, alpha 0.2 -> k = ceil(10 * 0.8) = 8 -> 8th smallest = 4
  const sym = residualQuantiles(nine, { alpha: 0.2 });
  assert.deepEqual([sym.lo[0], sym.hi[0]], [-4, 4]);
  assert.deepEqual([sym.lo[1], sym.hi[1]], [-8, 8]);                         // step 2 errors are doubled
  assert.deepEqual(sym.n, [9, 9]);
  // quantile method, alpha 0.5: the 25 % and 75 % points of -4..4 are -2 and 2
  const q = residualQuantiles(nine, { alpha: 0.5, method: 'quantile' });
  assert.deepEqual([q.lo[0], q.hi[0]], [-2, 2]);
  assert.deepEqual([q.lo[1], q.hi[1]], [-4, 4]);
  // too few windows for the symmetric method is Infinity, the quantile method stays finite
  const two = mk([1, -3]);
  assert.equal(residualQuantiles(two, { alpha: 0.1 }).hi[0], Infinity);
  assert.ok(Number.isFinite(residualQuantiles(two, { alpha: 0.1, method: 'quantile' }).hi[0]));
  assert.throws(() => residualQuantiles(nine, { method: 'magic' }), /unknown method/);
  assert.throws(() => residualQuantiles([]), /at least one/);
});

test('addIntervals and coverageByHorizon on a hand example', () => {
  const windows = [
    { forecast: [10, 20], actual: [11, 26] },
    { forecast: [10, 20], actual: [8, 19] },
    { forecast: [10, 20], actual: [12.5, 21] },
  ];
  const withI = addIntervals(windows, { lo: [-2, -3], hi: [2, 3] });
  assert.deepEqual(withI[0].lo, [8, 17]); assert.deepEqual(withI[0].hi, [12, 23]);
  assert.equal(windows[0].lo, undefined);                                    // the input is not modified
  const rows = coverageByHorizon(withI);
  close(rows[0].coverage, 2 / 3);                                             // 11 in [8,12], 8 in, 12.5 out
  close(rows[1].coverage, 2 / 3);                                             // 26 out, 19 in, 21 in
  close(rows[0].width, 4); close(rows[1].width, 6);
  assert.deepEqual(rows.map(r => r.horizon), [1, 2]);
  close(coverageOverall(withI), 2 / 3);
});

test('interval coverage is near nominal on stationary data and drops after a regime shift', () => {
  const alpha = 0.2, calibrationEnd = 149;
  for (const method of ['symmetric', 'quantile']) {
    const stationary = [], shifted = [];
    for (let seed = 1; seed <= 6; seed++) {
      const common = { n: 260, seed, period: P, trend: 0.15, seasonAmp: 4, noise: 0.6 };
      const run = s => backtestIntervals({ series: s.y, model: arModel({ period: P }), initial: 72, horizon: 6, step: 2, period: P, calibrationEnd, alpha, method });
      const st = run(makeSeries(common));
      const sh = run(makeSeries({ ...common, regimeShiftAt: 150, regimeShiftSize: 6, regimeShiftPhase: 0.5 }));
      assert.ok(st.q.hi.every(Number.isFinite) && st.q.hi.every(v => v > 0), `${method}: finite positive offsets`);
      assert.ok(st.test.length >= 40 && st.calibration.length >= 30);
      assert.ok(st.test.every(w => w.origin >= calibrationEnd) && st.calibration.every(w => w.testEnd <= calibrationEnd));
      stationary.push(st.coverage); shifted.push(sh.coverage);
      assert.equal(st.byHorizon.length, 6);
      st.byHorizon.forEach(r => assert.ok(r.coverage > 0.6 && r.coverage < 0.97, `${method} seed ${seed} h${r.horizon}: ${r.coverage}`));
      assert.ok(sh.coverage < 0.72, `${method} seed ${seed}: coverage after the shift ${sh.coverage}`);
    }
    const ms = mean(stationary), mh = mean(shifted);
    assert.ok(Math.abs(ms - (1 - alpha)) < 0.1, `${method}: stationary coverage ${ms} should be near ${1 - alpha}`);
    assert.ok(ms - mh > 0.2, `${method}: coverage should drop (${ms} -> ${mh})`);
  }
});

test('backtestIntervals works for a baseline too and validates its split', () => {
  const s = makeSeries({ n: 260, seed: 1, trend: 0.15, seasonAmp: 4, noise: 0.6 }).y;
  const b = backtestIntervals({ series: s, model: seasonalNaive(P), initial: 72, horizon: 4, step: 1, period: P, calibrationEnd: 160, alpha: 0.2, method: 'quantile' });
  assert.equal(b.byHorizon.length, 4);
  assert.ok(b.width > 0 && Number.isFinite(b.width));
  assert.throws(() => backtestIntervals({ series: s, model: naive(), initial: 72, horizon: 4, calibrationEnd: 74 }), /calibrationEnd/);
});
