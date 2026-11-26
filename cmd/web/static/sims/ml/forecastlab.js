// Pure logic behind the forecasting lab (sims/labs/forecast-lab.js). It is the only file that calls the forecasting
// math in forecast.js, so the lab itself only draws and wires. Nothing here touches the page.
//
// API
//   Constants: STEPS (240, the length of every generated series), TRAIN_MIN (72: the first training slice and the
//        length of a sliding window), WINDOW_SPAN (80: steps between the first and the last forecast origin),
//        CAL_STEP (2: calibration origins are this far apart), MODELS ['naive','seasonal','learned'],
//        MEASURES ['mase','mae','rmse'], LIMITS (every slider range, so the lab and the tests agree).
//   DEFAULTS            the lab's starting parameters (see the lab's controls for what each one is).
//   normalize(p)        p with every value clamped to its LIMITS range and integers rounded; missing keys take DEFAULTS.
//   shiftActive(p)      true when a regime shift changes the series (a size other than 0, or a moved season).
//   buildSeries(p)      makeSeries(...) with the shift only when it is active -> {y, signal, shiftAt, ...}.
//   planBacktest(p)     {firstOrigin, lastOrigin, step, count}: `windows` forecast origins spread evenly so that the
//        last window ends on the last step of the series, with WINDOW_SPAN steps from first to last origin.
//        Every window forecasts `horizon` steps. Origins are the last known step of each window.
//   makeModel(name, p)  the forecasting function for 'naive', 'seasonal' (seasonal naive, period p.period) or
//        'learned' (autoregression on p.lags lags, direct multi-step, seasonal indicators when p.seasonalIndicators).
//   runModel(y, name, p, plan)        the backtest windows of one model (forecast.js rollingOrigin: each window also
//        has errors, forecast, actual, scale and mase). p.style is 'expanding' or 'sliding' (the last TRAIN_MIN steps).
//   calibrationWindows(y, name, p, plan)  windows whose forecast spans end at or before the first backtest origin,
//        for the interval widths. They only use data before that origin.
//   intervalsFor(testWindows, calWindows, target)  frozen residual intervals: the symmetric conformal offsets are cut
//        ONCE from the calibration windows (one per horizon step) and added to every test window's forecast ->
//        {alpha, q, windows (with lo/hi), byHorizon [{horizon, coverage, width}], coverage, width, infinite, nCal}.
//        infinite is true when the calibration windows are too few for the target (the band is then unbounded).
//   windowErrors(windows, measure) -> one number per window ('mase' | 'mae' | 'rmse').
//   summarize(windows, measure)    -> {values, mean, worst, worstIndex} over the windows.
//   horizonErrors(windows, measure) -> one number per horizon step, pooled over the windows (evaluate()).
//   winners(valuesByModel)         -> {perWindow: [name|null], counts: {name: n}}; the lowest value wins, a tie goes to
//        the model listed first, a non-finite value never wins.
//   shiftPartition(windows, shiftAt) -> {before: [indices], after: [indices]}. A window is "before" when its whole
//        forecast span ends ahead of the shift (testEnd < shiftAt) and "after" when the span reaches it (testEnd >=
//        shiftAt), which includes the windows that straddle the shift and the ones that come later.
//   shiftVerdict(windowsByModel, shiftAt, tolerance = 0.15) -> null, or the answer to "which model loses more
//        accuracy after the shift". For seasonal naive and for the learned model it takes the mean MASE over the
//        "after" windows and over the "before" windows. The model that loses the most is the one whose error grows
//        by the larger FACTOR (after / before): both start from different levels (the learned model is usually far
//        better before the shift), so the factor measures what each one lost of what it had. The absolute rise is
//        reported too. {verdict: 'seasonal' | 'learned' | 'same', before, after, ratio, increase, nBefore, nAfter}.
//        'same' when both factors are below 1.1 (nothing was lost), or when the two factors differ by at most
//        `tolerance` of the larger one. null without windows on both sides, or when a "before" mean is 0 or a MASE is
//        not finite.
import {
  makeSeries, naive, seasonalNaive, arModel, rollingOrigin, residualQuantiles, addIntervals, coverageByHorizon, evaluate,
} from './forecast.js';

export const STEPS = 240;
export const TRAIN_MIN = 72;
export const WINDOW_SPAN = 80;
export const CAL_STEP = 2;
export const MODELS = ['naive', 'seasonal', 'learned'];
export const MEASURES = ['mase', 'mae', 'rmse'];

export const LIMITS = {
  period: [4, 24], trend: [-0.1, 0.3], seasonAmp: [0, 8], noise: [0, 3], shiftAt: [60, 230], shiftSize: [-10, 10],
  lags: [1, 24], horizon: [1, 24], windows: [3, 12], coverage: [50, 95], seed: [1, 999],
};

export const DEFAULTS = {
  period: 12, trend: 0.1, seasonAmp: 3, noise: 0.5, shiftAt: 190, shiftSize: 6, shiftPhase: false, seed: 1,
  showNaive: true, showSeasonal: true, showLearned: true, lags: 12, seasonalIndicators: true,
  horizon: 12, style: 'sliding', windows: 8, windowShown: 4, measure: 'mase', coverage: 80, intervalModel: 'learned',
};

const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));
const int = (v, range, fallback) => clamp(Number.isFinite(Number(v)) ? Math.round(Number(v)) : fallback, range);
const num = (v, range, fallback) => clamp(Number.isFinite(Number(v)) ? Number(v) : fallback, range);

export function normalize(input = {}) {
  const p = { ...DEFAULTS, ...input };
  const out = {
    ...p,
    period: int(p.period, LIMITS.period, DEFAULTS.period),
    trend: num(p.trend, LIMITS.trend, DEFAULTS.trend),
    seasonAmp: num(p.seasonAmp, LIMITS.seasonAmp, DEFAULTS.seasonAmp),
    noise: num(p.noise, LIMITS.noise, DEFAULTS.noise),
    shiftAt: int(p.shiftAt, LIMITS.shiftAt, DEFAULTS.shiftAt),
    shiftSize: num(p.shiftSize, LIMITS.shiftSize, DEFAULTS.shiftSize),
    shiftPhase: Boolean(p.shiftPhase),
    lags: int(p.lags, LIMITS.lags, DEFAULTS.lags),
    horizon: int(p.horizon, LIMITS.horizon, DEFAULTS.horizon),
    windows: int(p.windows, LIMITS.windows, DEFAULTS.windows),
    coverage: int(p.coverage, LIMITS.coverage, DEFAULTS.coverage),
    seed: int(p.seed, LIMITS.seed, DEFAULTS.seed),
    seasonalIndicators: Boolean(p.seasonalIndicators),
    style: p.style === 'sliding' ? 'sliding' : 'expanding',
    measure: MEASURES.includes(p.measure) ? p.measure : DEFAULTS.measure,
    intervalModel: MODELS.includes(p.intervalModel) ? p.intervalModel : DEFAULTS.intervalModel,
  };
  out.windowShown = int(p.windowShown, [1, out.windows], 1);
  return out;
}

export const shiftActive = p => p.shiftSize !== 0 || Boolean(p.shiftPhase);

export function buildSeries(input) {
  const p = normalize(input), active = shiftActive(p);
  return makeSeries({
    n: STEPS, seed: p.seed, period: p.period, trend: p.trend, seasonAmp: p.seasonAmp, noise: p.noise,
    regimeShiftAt: active ? p.shiftAt : null, regimeShiftSize: p.shiftSize, regimeShiftPhase: p.shiftPhase ? 0.5 : 0,
  });
}

export function planBacktest(input) {
  const { horizon, windows } = normalize(input);
  const lastOrigin = STEPS - 1 - horizon;
  const step = Math.max(1, Math.floor(WINDOW_SPAN / (windows - 1)));
  return { firstOrigin: lastOrigin - (windows - 1) * step, lastOrigin, step, count: windows };
}

export function makeModel(name, input) {
  const p = normalize(input);
  if (name === 'naive') return naive();
  if (name === 'seasonal') return seasonalNaive(p.period);
  if (name === 'learned') return arModel({ lags: p.lags, period: p.period, mode: 'direct', seasonal: p.seasonalIndicators });
  throw new Error(`unknown model "${name}"`);
}

const common = (p, plan) => ({ initial: TRAIN_MIN, horizon: p.horizon, expanding: p.style !== 'sliding', period: p.period, step: plan.step });

export function runModel(y, name, input, plan = planBacktest(input)) {
  const p = normalize(input);
  return rollingOrigin({
    series: y, ...common(p, plan), model: makeModel(name, p), firstOrigin: plan.firstOrigin, lastOrigin: plan.lastOrigin,
  }).windows;
}

export function calibrationWindows(y, name, input, plan = planBacktest(input)) {
  const p = normalize(input);
  return rollingOrigin({
    series: y, ...common(p, plan), step: CAL_STEP, model: makeModel(name, p), firstOrigin: TRAIN_MIN - 1, lastOrigin: plan.firstOrigin - p.horizon,
  }).windows;
}

const mean = xs => xs.reduce((s, v) => s + v, 0) / xs.length;

export function intervalsFor(testWindows, calWindows, target) {
  const alpha = 1 - target / 100;
  const q = residualQuantiles(calWindows, { alpha, method: 'symmetric' });
  const windows = addIntervals(testWindows, q);
  const byHorizon = coverageByHorizon(windows);
  const infinite = q.hi.some(v => !Number.isFinite(v));
  return {
    alpha, q, windows, byHorizon, infinite, nCal: calWindows.length,
    coverage: mean(byHorizon.map(r => r.coverage)), width: infinite ? Infinity : mean(byHorizon.map(r => r.width)),
  };
}

export function windowErrors(windows, measure = 'mase') {
  return windows.map(w => {
    if (measure === 'mase') return w.mase;
    if (measure === 'mae') return mean(w.errors.map(Math.abs));
    if (measure === 'rmse') return Math.sqrt(mean(w.errors.map(e => e * e)));
    throw new Error(`unknown measure "${measure}"`);
  });
}

export function summarize(windows, measure = 'mase') {
  const values = windowErrors(windows, measure);
  let worstIndex = 0;
  values.forEach((v, i) => { if (v > values[worstIndex]) worstIndex = i; });
  return { values, mean: mean(values), worst: values[worstIndex], worstIndex };
}

export function horizonErrors(windows, measure = 'mase') {
  return evaluate(windows).byHorizon.map(r => r[measure]);
}

export function winners(valuesByModel) {
  const names = Object.keys(valuesByModel), counts = Object.fromEntries(names.map(n => [n, 0]));
  const count = names.length ? valuesByModel[names[0]].length : 0;
  const perWindow = Array.from({ length: count }, (_, i) => {
    let best = null;
    for (const n of names) {
      const v = valuesByModel[n][i];
      if (Number.isFinite(v) && (best === null || v < valuesByModel[best][i])) best = n;
    }
    if (best !== null) counts[best] += 1;
    return best;
  });
  return { perWindow, counts };
}

export function shiftPartition(windows, shiftAt) {
  const before = [], after = [];
  windows.forEach((w, i) => (w.testEnd < shiftAt ? before : after).push(i));
  return { before, after };
}

export function shiftVerdict(windowsByModel, shiftAt, tolerance = 0.15) {
  const seasonal = windowsByModel.seasonal, learned = windowsByModel.learned;
  if (!seasonal?.length || !learned?.length) return null;
  const { before, after } = shiftPartition(seasonal, shiftAt);
  if (!before.length || !after.length) return null;
  const at = (windows, idx) => mean(idx.map(i => windows[i].mase));
  const b = { seasonal: at(seasonal, before), learned: at(learned, before) };
  const a = { seasonal: at(seasonal, after), learned: at(learned, after) };
  if (![b.seasonal, b.learned, a.seasonal, a.learned].every(Number.isFinite) || b.seasonal <= 0 || b.learned <= 0) return null;
  const ratio = { seasonal: a.seasonal / b.seasonal, learned: a.learned / b.learned };
  const increase = { seasonal: a.seasonal - b.seasonal, learned: a.learned - b.learned };
  const big = Math.max(ratio.seasonal, ratio.learned);
  let verdict;
  if (big < 1.1 || Math.abs(ratio.seasonal - ratio.learned) <= tolerance * big) verdict = 'same';
  else verdict = ratio.seasonal > ratio.learned ? 'seasonal' : 'learned';
  return { verdict, before: b, after: a, ratio, increase, nBefore: before.length, nAfter: after.length };
}
