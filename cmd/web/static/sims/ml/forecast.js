// Time-series forecasting: the pure math behind the forecasting lab. No drawing here;
// every function is deterministic (a series comes from a seed, nothing else is random).
//
// API
//   Data layout: a series is an array of numbers y[0..n-1], one per time step, oldest
//   first. The ORIGIN of a forecast is the last index whose value is known; a forecast
//   made at origin t predicts y[t+1] .. y[t+H] and may use y[0..t] and nothing later.
//   A HISTORY is series.slice(.., t + 1). A "model" is any function
//       model(history, horizon) -> an array of `horizon` forecasts (step 1 first).
//   Every model below is a pure function of the history it is handed, so it cannot see
//   the future. Time indices inside a model are positions in that history (position 0 =
//   its first value), which is how the seasonal phase is known for future steps.
//
//   Synthetic data with KNOWN components:
//   makeSeries({n, seed, period, trend, seasonAmp, noise, level, regimeShiftAt,
//               regimeShiftSize, regimeShiftPhase})
//        y[t] = level + trend * t + season[t] + shift[t] + noise[t].
//        season[t] = seasonAmp * (sin(2 pi p / period) + 0.35 * sin(4 pi p / period + 1)),
//        p = t + phaseOffset(t); noise[t] is Gaussian with sd `noise`.
//        REGIME SHIFT (off unless regimeShiftAt is a number): from index regimeShiftAt
//        on, shift[t] = regimeShiftSize (a plain level jump, in the units of y) and, only
//        if regimeShiftPhase is non-zero, the seasonal pattern is moved earlier by that
//        fraction of a period (phaseOffset = regimeShiftPhase * period; 0.5 turns peaks
//        into troughs). The trend line keeps its slope. Defaults: n 120, seed 1, period
//        12, trend 0.1, seasonAmp 3, noise 0.5, level 20, no shift, phase 0.
//        -> {y, trend, season, shift, noise, level, signal, period, shiftAt} where
//        trend[t] = trend * t, signal = y without the noise, and
//        y[t] = level + trend[t] + season[t] + shift[t] + noise[t] exactly.
//
//   Baselines (each returns a model):
//   naive()                  every step = the last value.
//   seasonalNaive(period)    step h = the value one season earlier, wrapping: forecast h
//        is history[T - 1 + h - period * ceil(h / period)] for T = history.length.
//   movingAverage(k)         every step = mean of the last k values (flat).
//   drift()                  last value + h * (last - first) / (T - 1): the straight line
//        through the first and last points, extended.
//
//   Learned model (ridge least squares, regularize.js fitScaled):
//   featureRow(y, t, h, {lags, period, seasonal})  the feature row for predicting
//        y[t + h] from origin t: [y[t], y[t-1] .. y[t-lags+1]] followed (when seasonal)
//        by period - 1 indicator columns for the phase (t + h) mod period (phase 0 is
//        the dropped baseline). It reads y[0..t] ONLY: values after t are never touched.
//        The phase is a calendar fact, known in advance, so it is not leakage.
//   arModel({lags, period, lambda, mode, seasonal})  autoregression on lag features plus
//        seasonal indicators, ridge-fitted (features standardised, lambda 0.01 default,
//        in the units of standardised mean squared error). lags defaults to period.
//        mode 'direct' (default): one separate model per horizon h = 1..H, each trained on
//        (features at origin t -> y[t + h]) pairs from the history. mode 'recursive': one
//        model for h = 1, applied H times, feeding each forecast back in as if it were
//        data (later steps use predictions, never actuals). Throws if the history gives
//        fewer than 5 training rows for some horizon. The returned model has .label.
//
//   Backtesting:
//   rollingWindows({n, initial, horizon, step, expanding, firstOrigin, lastOrigin})
//        the list of windows, no model involved. Window k has origin
//        firstOrigin + k * step. firstOrigin defaults to initial - 1, so the first model
//        sees `initial` points; lastOrigin defaults to n - 1 - horizon. Only windows whose
//        whole horizon fits inside the series are listed (origin + horizon <= n - 1),
//        so a partial window at the end never appears. Each is {origin, trainStart,
//        trainEnd, testStart, testEnd} with inclusive indices: expanding (default true)
//        trains on 0..origin; sliding (expanding false) on the last `initial` points,
//        origin - initial + 1 .. origin; the test span is origin + 1 .. origin + horizon.
//   rollingOrigin({series, initial, horizon, step, expanding, model, period, firstOrigin,
//                  lastOrigin}) -> {horizon, windows}. Each window also has actual,
//        forecast and errors (actual - forecast), all of length horizon, plus scale (the
//        in-sample seasonal-naive MAE of THAT window's training slice, with the given
//        period, default 1) and mase. The model is called with a fresh copy of the
//        training slice, nothing after the origin.
//   evaluate(windows) -> {n, mae, rmse, smape, mase, byHorizon: [{horizon, n, mae, rmse,
//        smape, mase}]}, pooling every (window, step) pair. mase divides each absolute
//        error by its window's scale.
//
//   Metrics (actual and forecast are equal-length arrays):
//   mae(a, f)    mean |a - f|.            rmse(a, f)   sqrt(mean (a - f)^2).
//   smape(a, f)  mean of 200 |a - f| / (|a| + |f|), in percent, 0 to 200; a 0/0 term is 0.
//   mase(a, f, train, period)  mae(a, f) divided by the mean of |train[i] - train[i -
//        period]| for i >= period (the in-sample seasonal-naive error; period 1 = the
//        ordinary naive). Below 1 beats that baseline in-sample. Zero scale: 0 if the
//        mae is 0, else Infinity.
//
//   Prediction intervals from residual quantiles, one per horizon:
//   residualQuantiles(windows, {alpha, method}) -> {alpha, method, lo[], hi[], n[]} (one
//        entry per horizon step, offsets to ADD to a forecast). method 'symmetric'
//        (default) is conformal-style: q_h = intervals.js conformalQuantile of the
//        absolute errors at step h, offsets -q_h and +q_h (Infinity if there are too few
//        windows for alpha). method 'quantile': the alpha/2 and 1 - alpha/2 empirical
//        quantiles of the signed errors (always finite). alpha defaults to 0.2 (80 %).
//   addIntervals(windows, q) -> copies of the windows with lo[] and hi[] = forecast + q.lo/hi.
//   coverageByHorizon(windows) -> [{horizon, n, coverage, width}], the fraction of actuals
//        inside [lo, hi] and the mean width at each step. (windows need lo/hi.)
//   coverageOverall(windows) -> the same fraction pooled over all steps.
//   backtestIntervals({series, model, initial, horizon, step, expanding, period,
//                      calibrationEnd, alpha, method})
//        Calibrate ONCE, then freeze: windows whose targets end at or before index
//        calibrationEnd give q; the test windows are those with origin >= calibrationEnd.
//        There is no rolling recalibration, so a regime change after calibrationEnd shows
//        up as lost coverage. -> {calibration, test, q, byHorizon, coverage, width}.
import { fitScaled } from './regularize.js';
import { conformalQuantile, quantile } from './intervals.js';
import { rng, gauss } from './rng.js';

const mean = xs => xs.reduce((s, v) => s + v, 0) / xs.length;

// ---------- synthetic series ----------

export function makeSeries({
  n = 120, seed = 1, period = 12, trend = 0.1, seasonAmp = 3, noise = 0.5, level = 20,
  regimeShiftAt = null, regimeShiftSize = 0, regimeShiftPhase = 0,
} = {}) {
  const random = rng(seed);
  const shiftAt = typeof regimeShiftAt === 'number' ? regimeShiftAt : null;
  const out = { trend: [], season: [], shift: [], noise: [], y: [] };
  for (let t = 0; t < n; t++) {
    const after = shiftAt !== null && t >= shiftAt;
    const p = t + (after ? regimeShiftPhase * period : 0);
    const season = seasonAmp * (Math.sin(2 * Math.PI * p / period) + 0.35 * Math.sin(4 * Math.PI * p / period + 1));
    const tr = trend * t, sh = after ? regimeShiftSize : 0, nz = noise * gauss(random);
    out.trend.push(tr); out.season.push(season); out.shift.push(sh); out.noise.push(nz);
    out.y.push(level + tr + season + sh + nz);
  }
  out.signal = out.y.map((v, t) => v - out.noise[t]);
  return { ...out, level, period, shiftAt };
}

// ---------- baselines ----------

function needHistory(history, k, name) {
  if (!history || history.length < k) throw new Error(`${name} needs at least ${k} value(s) of history`);
}

export function naive() {
  const m = (history, horizon) => {
    needHistory(history, 1, 'naive');
    return new Array(horizon).fill(history[history.length - 1]);
  };
  m.label = 'naive';
  return m;
}

export function seasonalNaive(period) {
  if (!(period >= 1)) throw new Error('seasonalNaive needs period >= 1');
  const m = (history, horizon) => {
    needHistory(history, period, 'seasonalNaive');
    const T = history.length;
    return Array.from({ length: horizon }, (_, i) => {
      const h = i + 1;
      return history[T - 1 + h - period * Math.ceil(h / period)];
    });
  };
  m.label = `seasonal naive (${period})`;
  return m;
}

export function movingAverage(k) {
  if (!(k >= 1)) throw new Error('movingAverage needs k >= 1');
  const m = (history, horizon) => {
    needHistory(history, k, 'movingAverage');
    return new Array(horizon).fill(mean(history.slice(history.length - k)));
  };
  m.label = `moving average (${k})`;
  return m;
}

export function drift() {
  const m = (history, horizon) => {
    needHistory(history, 2, 'drift');
    const T = history.length, slope = (history[T - 1] - history[0]) / (T - 1);
    return Array.from({ length: horizon }, (_, i) => history[T - 1] + (i + 1) * slope);
  };
  m.label = 'drift';
  return m;
}

// ---------- learned model ----------

export function featureRow(y, t, h, { lags = 12, period = 12, seasonal = true } = {}) {
  const row = [];
  for (let k = 0; k < lags; k++) row.push(y[t - k]);
  if (seasonal && period > 1) {
    const phase = (t + h) % period;
    for (let c = 1; c < period; c++) row.push(phase === c ? 1 : 0);
  }
  return row;
}

function trainingSet(y, h, opts) {
  const X = [], target = [];
  for (let t = opts.lags - 1; t + h <= y.length - 1; t++) {
    X.push(featureRow(y, t, h, opts));
    target.push(y[t + h]);
  }
  return { X, target };
}

function fitOne(y, h, opts, lambda) {
  const { X, target } = trainingSet(y, h, opts);
  if (X.length < 5) {
    throw new Error(`arModel: ${y.length} history points leave only ${X.length} training rows for horizon ${h} with ${opts.lags} lags (need 5)`);
  }
  return fitScaled(X, target, lambda, 'ridge');
}

export function arModel({ lags, period = 12, lambda = 0.01, mode = 'direct', seasonal = true } = {}) {
  if (mode !== 'direct' && mode !== 'recursive') throw new Error(`arModel: unknown mode "${mode}" (use "direct" or "recursive")`);
  const opts = { lags: lags || period, period, seasonal };
  const model = (history, horizon) => {
    if (history.length < opts.lags) throw new Error(`arModel needs at least ${opts.lags} values of history`);
    if (mode === 'direct') {
      const t = history.length - 1;
      return Array.from({ length: horizon }, (_, i) => fitOne(history, i + 1, opts, lambda).predict(featureRow(history, t, i + 1, opts)));
    }
    const step = fitOne(history, 1, opts, lambda), ext = history.slice(), out = [];
    for (let i = 0; i < horizon; i++) {
      const f = step.predict(featureRow(ext, ext.length - 1, 1, opts));
      out.push(f);
      ext.push(f);                       // the next step sees this forecast as if it were data
    }
    return out;
  };
  model.label = `AR(${opts.lags})${seasonal ? ' + seasonal' : ''} ${mode}`;
  return model;
}

// ---------- metrics ----------

const sameLength = (a, f) => {
  if (a.length !== f.length || !a.length) throw new Error('actual and forecast must be non-empty and the same length');
};

export function mae(a, f) { sameLength(a, f); return mean(a.map((v, i) => Math.abs(v - f[i]))); }
export function rmse(a, f) { sameLength(a, f); return Math.sqrt(mean(a.map((v, i) => (v - f[i]) ** 2))); }
export function smape(a, f) {
  sameLength(a, f);
  return mean(a.map((v, i) => {
    const d = Math.abs(v) + Math.abs(f[i]);
    return d === 0 ? 0 : 200 * Math.abs(v - f[i]) / d;
  }));
}

function seasonalScale(train, period) {
  if (train.length <= period) throw new Error(`mase needs more than ${period} training points to scale by`);
  let s = 0;
  for (let i = period; i < train.length; i++) s += Math.abs(train[i] - train[i - period]);
  return s / (train.length - period);
}

export function mase(a, f, train, period = 1) {
  const err = mae(a, f), scale = seasonalScale(train, period);
  if (scale === 0) return err === 0 ? 0 : Infinity;
  return err / scale;
}

// ---------- rolling-origin backtest ----------

export function rollingWindows({ n, initial, horizon, step = 1, expanding = true, firstOrigin, lastOrigin } = {}) {
  if (!(initial >= 1) || !(horizon >= 1) || !(step >= 1)) throw new Error('rollingWindows needs initial, horizon and step >= 1');
  const first = firstOrigin === undefined ? initial - 1 : firstOrigin;
  const last = lastOrigin === undefined ? n - 1 - horizon : lastOrigin;
  if (first < initial - 1) throw new Error('firstOrigin leaves fewer than `initial` training points');
  const windows = [];
  for (let origin = first; origin <= last && origin + horizon <= n - 1; origin += step) {
    windows.push({
      origin, trainStart: expanding ? 0 : origin - initial + 1, trainEnd: origin,
      testStart: origin + 1, testEnd: origin + horizon,
    });
  }
  return windows;
}

export function rollingOrigin({ series, initial, horizon, step = 1, expanding = true, model, period = 1, firstOrigin, lastOrigin } = {}) {
  if (typeof model !== 'function') throw new Error('rollingOrigin needs a model function');
  const plan = rollingWindows({ n: series.length, initial, horizon, step, expanding, firstOrigin, lastOrigin });
  const windows = plan.map(w => {
    const train = series.slice(w.trainStart, w.trainEnd + 1);
    const forecast = model(train.slice(), horizon);
    const actual = series.slice(w.testStart, w.testEnd + 1);
    const scale = seasonalScale(train, period);
    const errors = actual.map((v, i) => v - forecast[i]);
    const m = mean(errors.map(Math.abs));
    return { ...w, actual, forecast, errors, scale, mase: scale === 0 ? (m === 0 ? 0 : Infinity) : m / scale };
  });
  return { horizon, windows };
}

export function evaluate(windows) {
  if (!windows.length) throw new Error('evaluate needs at least one window');
  const H = windows[0].errors.length;
  const summarise = (pairs, horizon) => ({
    horizon, n: pairs.length,
    mae: mean(pairs.map(p => Math.abs(p.e))),
    rmse: Math.sqrt(mean(pairs.map(p => p.e * p.e))),
    smape: mean(pairs.map(p => (Math.abs(p.a) + Math.abs(p.f) === 0 ? 0 : 200 * Math.abs(p.e) / (Math.abs(p.a) + Math.abs(p.f))))),
    mase: mean(pairs.map(p => (p.scale === 0 ? (p.e === 0 ? 0 : Infinity) : Math.abs(p.e) / p.scale))),
  });
  const pairsAt = i => windows.map(w => ({ e: w.errors[i], a: w.actual[i], f: w.forecast[i], scale: w.scale }));
  const byHorizon = Array.from({ length: H }, (_, i) => summarise(pairsAt(i), i + 1));
  const all = summarise(byHorizon.flatMap((_, i) => pairsAt(i)), null);
  const { n, mae: m, rmse: r, smape: s, mase: ms } = all;
  return { n, mae: m, rmse: r, smape: s, mase: ms, byHorizon };
}

// ---------- intervals ----------

export function residualQuantiles(windows, { alpha = 0.2, method = 'symmetric' } = {}) {
  if (!windows.length) throw new Error('residualQuantiles needs at least one window');
  if (method !== 'symmetric' && method !== 'quantile') throw new Error(`unknown method "${method}" (use "symmetric" or "quantile")`);
  const H = windows[0].errors.length, lo = [], hi = [], n = [];
  for (let i = 0; i < H; i++) {
    const e = windows.map(w => w.errors[i]);
    n.push(e.length);
    if (method === 'symmetric') {
      const q = conformalQuantile(e.map(Math.abs), alpha);
      lo.push(-q); hi.push(q);
    } else {
      lo.push(quantile(e, alpha / 2)); hi.push(quantile(e, 1 - alpha / 2));
    }
  }
  return { alpha, method, lo, hi, n };
}

export function addIntervals(windows, q) {
  return windows.map(w => ({
    ...w,
    lo: w.forecast.map((f, i) => f + q.lo[i]),
    hi: w.forecast.map((f, i) => f + q.hi[i]),
  }));
}

export function coverageByHorizon(windows) {
  if (!windows.length) throw new Error('coverageByHorizon needs at least one window');
  const H = windows[0].actual.length;
  return Array.from({ length: H }, (_, i) => ({
    horizon: i + 1,
    n: windows.length,
    coverage: mean(windows.map(w => (w.actual[i] >= w.lo[i] && w.actual[i] <= w.hi[i] ? 1 : 0))),
    width: mean(windows.map(w => w.hi[i] - w.lo[i])),
  }));
}

export function coverageOverall(windows) {
  const rows = coverageByHorizon(windows);
  return mean(rows.map(r => r.coverage));
}

export function backtestIntervals({
  series, model, initial, horizon, step = 1, expanding = true, period = 1,
  calibrationEnd, alpha = 0.2, method = 'symmetric',
} = {}) {
  if (!(calibrationEnd - horizon >= initial - 1)) throw new Error('calibrationEnd leaves no calibration window (need calibrationEnd >= initial - 1 + horizon)');
  const common = { series, initial, horizon, step, expanding, model, period };
  const calibration = rollingOrigin({ ...common, lastOrigin: calibrationEnd - horizon }).windows;
  const q = residualQuantiles(calibration, { alpha, method });
  const test = addIntervals(rollingOrigin({ ...common, firstOrigin: calibrationEnd }).windows, q);
  const byHorizon = coverageByHorizon(test);
  return {
    calibration, test, q, byHorizon,
    coverage: mean(byHorizon.map(r => r.coverage)), width: mean(byHorizon.map(r => r.width)),
  };
}
