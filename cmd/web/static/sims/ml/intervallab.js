// The pure side of the interval lab: build a scenario (training rows, calibration rows, a test set whose
// inputs can be shifted), fit the three interval methods on it, score them on the test set, and sweep the
// shift to see how coverage changes. No drawing and no DOM; everything is deterministic given its seed.
// The interval math itself lives in intervals.js; this file only arranges the data and the bookkeeping.
//
// Scenario (a plain object, the same shape for generated and real data):
//   { kind, seed, degree, train: {x, y}, calPool: {x, y}, testAt(severity) -> {x, y, ...}, ... }
//   - train     the rows every method learns from.
//   - calPool   spare rows in a fixed random order; the first `calSize` of them are the calibration set,
//               used ONLY by split conformal (it needs rows that the model did not learn from).
//   - testAt(s) new rows, s in [0, 1] is the shift severity (0 = same distribution as training).
//
//   generatedScenario({seed, noise}) -> scenario    synthetic 1-D data with known noise (makeHetero).
//   penguinsScenario(table, {seed, heldOut}) -> scenario    flipper length (mm) -> body mass (kg); one species is
//        held out of training and calibration and is the shifted part of the test set.
//   fitScenario(scn) -> fitted    the fits that do not depend on alpha or the calibration size.
//   intervalMethods(fitted, {alpha, calSize}) -> {curve, conformal, quantile, bootstrap}
//   scoreAt(methods, scn, severity, alpha) -> {severity, n, coverage: {...}, width: {...}, inside}
//   sweepShift(methods, scn, alpha) -> [score at every severity in SWEEP]
//   insideShare(trainX, testX) share of test inputs inside the range of the training inputs.
//   shiftVerdict(sweep, index) -> 'drops' | 'stays' | 'rises', the change in mean coverage from no shift.
import { rng, shuffle } from './rng.js';
import {
  makeHetero, covariateShift, polyRegressor, conformalQuantile, quantileInterval, ensembleInterval,
  quantile, coverage, meanWidth, intervalsAt,
} from './intervals.js';

export const METHODS = ['conformal', 'quantile', 'bootstrap'];
// Sizes. Generated: 120 training rows, up to 250 spare rows for calibration, 400 test rows per shift.
export const GEN = { nTrain: 120, calMin: 10, calMax: 250, calDefault: 100, nTest: 400, degree: 3, maxShift: 2, B: 30 };
// Penguins: 60 in-distribution test rows, 60 held-out-species test rows, up to 80 calibration rows.
export const PEN = { nTest: 60, calMin: 10, calMax: 80, calDefault: 40, degree: 1, B: 30, species: ['Adelie', 'Chinstrap', 'Gentoo'] };
export const SWEEP_STEP = 0.05;
export const SWEEP = Array.from({ length: 21 }, (_, i) => Number((i * SWEEP_STEP).toFixed(2)));

const sweepIndex = severity => Math.max(0, Math.min(SWEEP.length - 1, Math.round(severity / SWEEP_STEP)));
const rows = (list, idx) => ({ x: idx.map(i => list.x[i]), y: idx.map(i => list.y[i]) });

export function generatedScenario({ seed = 41, noise = 'growing' } = {}) {
  const pool = makeHetero({ n: GEN.nTrain + GEN.calMax, seed, noise });
  const order = shuffle(Array.from({ length: pool.x.length }, (_, i) => i), rng(seed + 17));
  const base = makeHetero({ n: GEN.nTest, seed: seed + 1000, noise });
  const cache = new Map();
  return {
    kind: 'generated', seed, noise, degree: GEN.degree, trueCurve: pool.f, trueSigma: pool.sigma,
    train: rows(pool, order.slice(0, GEN.nTrain)),
    calPool: rows(pool, order.slice(GEN.nTrain)),
    calMax: GEN.calMax,
    shiftBy: s => s * GEN.maxShift,
    testAt(severity) {
      const key = sweepIndex(severity);
      if (!cache.has(key)) {
        const t = covariateShift(base, { delta: SWEEP[key] * GEN.maxShift, seed: seed + 2000 });
        cache.set(key, { x: t.x, y: t.y });
      }
      return cache.get(key);
    },
  };
}

// Flipper length (mm) and body mass (kg) of every penguin that has both numbers; `dropped` counts the NA rows.
export function penguinRows(table) {
  const out = [];
  for (const r of table.rows) {
    const f = r.flipper_length_mm, m = r.body_mass_g;
    if (typeof f === 'number' && typeof m === 'number' && Number.isFinite(f) && Number.isFinite(m) && typeof r.species === 'string') out.push({ x: f, y: m / 1000, species: r.species });
  }
  return { rows: out, total: table.rows.length, dropped: table.rows.length - out.length };
}

export function penguinsScenario(table, { seed = 41, heldOut = 'Gentoo' } = {}) {
  const { rows: all, total, dropped } = penguinRows(table);
  const rest = all.filter(r => r.species !== heldOut), out = all.filter(r => r.species === heldOut);
  const nT = Math.min(PEN.nTest, out.length);
  if (!out.length || rest.length < nT + PEN.calMax + 20) throw new Error(`not enough penguins to hold out ${heldOut}`);
  const inOrder = shuffle(rest, rng(seed)), outOrder = shuffle(out, rng(seed + 1));
  const list = rs => ({ x: rs.map(r => r.x), y: rs.map(r => r.y) });
  const testIn = inOrder.slice(0, nT), calPool = inOrder.slice(nT, nT + PEN.calMax), train = inOrder.slice(nT + PEN.calMax);
  const testOut = outOrder.slice(0, nT);
  const cache = new Map();
  return {
    kind: 'penguins', seed, heldOut, degree: PEN.degree, total, dropped, count: all.length, nHeldOut: out.length,
    train: list(train), calPool: list(calPool), calMax: PEN.calMax, nTest: nT, nTrainSpecies: new Set(rest.map(r => r.species)).size,
    shiftBy: s => Math.round(s * nT),
    testAt(severity) {
      const key = sweepIndex(severity), k = Math.round(SWEEP[key] * nT);
      if (!cache.has(key)) cache.set(key, list([...testOut.slice(0, k), ...testIn.slice(0, nT - k)]));
      return cache.get(key);
    },
  };
}

export function fitScenario(scn) {
  const fit = polyRegressor(scn.degree);
  const model = fit(scn.train.x, scn.train.y);
  const members = ensembleInterval({ X: scn.train.x, y: scn.train.y, fit, B: GEN.B, seed: scn.seed + 7, alpha: 0.1 }).members;
  return { scn, model, members, qr: new Map(), memo: new Map() };
}

// The three interval methods at one alpha (miscoverage; 0.1 aims at 90 percent coverage) and calibration size.
export function intervalMethods(fitted, { alpha = 0.1, calSize = 40 } = {}) {
  const { scn, model, members } = fitted;
  const m = Math.max(1, Math.min(calSize, scn.calPool.x.length));
  const scores = scn.calPool.x.slice(0, m).map((x, i) => Math.abs(scn.calPool.y[i] - model(x)));
  const q = conformalQuantile(scores, alpha);
  const conformal = { key: `c${alpha}:${m}`, q, m, infinite: !Number.isFinite(q), predict: x => { const c = model(x); return { lo: c - q, hi: c + q }; } };
  const key = alpha.toFixed(4);
  if (!fitted.qr.has(key)) fitted.qr.set(key, quantileInterval({ X: scn.train.x, y: scn.train.y, alpha, degree: scn.degree }));
  const qr = fitted.qr.get(key);
  const bootstrap = {
    key: `b${alpha}`, members: members.length,
    predict: x => { const p = members.map(f => f(x)); return { lo: quantile(p, alpha / 2), hi: quantile(p, 1 - alpha / 2) }; },
  };
  return { alpha, curve: model, memo: fitted.memo, conformal, quantile: { key: `q${alpha}`, predict: qr.predict }, bootstrap };
}

export function insideShare(trainX, testX) {
  const lo = Math.min(...trainX), hi = Math.max(...trainX);
  return testX.length ? testX.filter(x => x >= lo && x <= hi).length / testX.length : NaN;
}

// Coverage (share of test y inside the interval) and mean width of each method on the test set at one severity.
export function scoreAt(methods, scn, severity) {
  const test = scn.testAt(severity), out = { severity, n: test.x.length, coverage: {}, width: {}, inside: insideShare(scn.train.x, test.x) };
  for (const name of METHODS) {
    // A method's score at a severity does not change while its alpha, its calibration size and the scenario stay,
    // so a slider that moves only one method (the calibration size) leaves the other two scores as they were.
    const key = `${name}|${methods[name].key}|${sweepIndex(severity)}`, memo = methods.memo;
    let hit = memo?.get(key);
    if (!hit) {
      const iv = intervalsAt(methods[name].predict, test.x);
      hit = { coverage: coverage(iv, test.y), width: meanWidth(iv) };
      memo?.set(key, hit);
    }
    out.coverage[name] = hit.coverage;
    out.width[name] = hit.width;
  }
  return out;
}

export function sweepShift(methods, scn) { return SWEEP.map(s => scoreAt(methods, scn, s)); }

// What happened to coverage between no shift and the entry at `index`, averaged over the methods:
// 'drops' when it fell by 3 points or more, 'rises' when it grew by 3 points or more, otherwise 'stays'.
export function shiftVerdict(sweep, index) {
  const change = METHODS.reduce((s, name) => s + (sweep[index].coverage[name] - sweep[0].coverage[name]), 0) / METHODS.length;
  return change <= -0.03 ? 'drops' : change >= 0.03 ? 'rises' : 'stays';
}

export { sweepIndex };
