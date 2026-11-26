// Math behind the regularization lab: a 60-point data set (generated from a smooth curve, or real
// penguins), a seeded train/validation split, polynomial features, and the error against the penalty
// strength lambda. The ridge and lasso fits themselves live in sims/ml/regularize.js.
// Pure functions only; the lab file draws and wires.
//
// Layout: a "point" is { cols: [number, ...], y } in plot units (0..10 on both axes), where cols are
// the base measurements (one column for generated data: x; three for penguins: flipper length, bill
// length, bill depth). designMatrix() turns them into polynomial features, and the lab fits y on those.
import { rng, shuffle } from './rng.js';
import { polyFeatures, standardize, ridge, lasso, mse } from './regularize.js';
import { sampleCurve, truth } from './overfitdemo.js';

export { truth };
export const TOTAL_POINTS = 60;
export const VAL_FRACTION = 0.3;
export const VAL_POINTS = Math.round(TOTAL_POINTS * VAL_FRACTION);   // 18 held-out points
export const POOL_POINTS = TOTAL_POINTS - VAL_POINTS;                // 42 points a training set is taken from
export const MAX_DEGREE = 12;
export const LOG_MIN = -5;
export const LOG_MAX = 1;
// What the lab starts with. Seed 4 gives a clear U-shaped validation curve for both penalties and on penguins.
export const DEFAULTS = { seed: 4, noise: 0.5, train: 15, degree: 9, logLambda: LOG_MIN };

export const PENGUIN_COLUMNS = ['flipper_length_mm', 'bill_length_mm', 'bill_depth_mm'];
export const PENGUIN_TARGET = 'body_mass_g';

export const lambdaOf = logLambda => 10 ** logLambda;

// ---- the data -----------------------------------------------------------------------------------

// 60 generated points: x spread over 0..10, y = smooth curve + noise.
export function generatedPoints(seed, noise = DEFAULTS.noise, n = TOTAL_POINTS) {
  return sampleCurve(seed, { n, noise }).map(p => ({ cols: [p.x], y: p.y }));
}

// The penguin rows that have all four columns, as { cols, y } in the original units. `dropped` counts
// the rows left out because a value is missing (NA is null after parseCsv).
export function completePenguins(table) {
  const ok = v => typeof v === 'number' && Number.isFinite(v);
  const rows = table.rows.filter(r => PENGUIN_COLUMNS.every(c => ok(r[c])) && ok(r[PENGUIN_TARGET]))
    .map(r => ({ cols: PENGUIN_COLUMNS.map(c => r[c]), y: r[PENGUIN_TARGET] }));
  return { rows, total: table.rows.length, dropped: table.rows.length - rows.length };
}

// The range of every column (and of the target), fixed for the whole table so a new sample never
// rescales the axes.
export function penguinScale(rows) {
  const lo = a => Math.min(...a), hi = a => Math.max(...a);
  const cols = PENGUIN_COLUMNS.map((_, j) => ({ min: lo(rows.map(r => r.cols[j])), max: hi(rows.map(r => r.cols[j])) }));
  return { cols, y: { min: lo(rows.map(r => r.y)), max: hi(rows.map(r => r.y)) } };
}

const unit = (v, lo, hi) => (hi === lo ? 5 : (v - lo) / (hi - lo) * 10);

// n penguins drawn at random (no repeats) with the seed, every column and the target mapped to 0..10.
export function penguinPoints(rows, scale, seed, n = TOTAL_POINTS) {
  return shuffle(rows, rng(seed * 13 + 5)).slice(0, Math.min(n, rows.length)).map(r => ({
    cols: r.cols.map((v, j) => unit(v, scale.cols[j].min, scale.cols[j].max)),
    y: unit(r.y, scale.y.min, scale.y.max),
  }));
}

// A mean squared error in plot units as a typical miss in grams: sqrt(mse) * (yMax - yMin) / 10.
export function typicalMissGrams(mseValue, scale) {
  return Math.sqrt(mseValue) * (scale.y.max - scale.y.min) / 10;
}

// ---- the split ----------------------------------------------------------------------------------

// Seeded shuffle of the points. The last VAL_POINTS are the validation set (always the same for a seed);
// the training set is the first `nTrain` of the rest, so raising nTrain only ever adds points.
export function splitPoints(points, nTrain, seed) {
  const order = shuffle(Array.from({ length: points.length }, (_, i) => i), rng(seed * 7 + 1));
  const nVal = Math.round(points.length * VAL_FRACTION), pool = order.slice(0, points.length - nVal);
  const cut = Math.max(1, Math.min(pool.length, Math.round(nTrain)));
  return { train: pool.slice(0, cut), validation: order.slice(points.length - nVal) };
}

// ---- features -----------------------------------------------------------------------------------

// Each column is already 0..10, so centre 5 and scale 5 put it in [-1, 1] before taking powers.
const POLY = { center: 5, scale: 5 };

// One row of polynomial features per point: powers 1..degree of every column, column after column.
export function designMatrix(points, degree) {
  const cols = points[0]?.cols.length ?? 0;
  const blocks = Array.from({ length: cols }, (_, j) => polyFeatures(points.map(p => p.cols[j]), degree, POLY));
  return points.map((_, i) => blocks.flatMap(b => b[i]));
}

// The features of one made-up point whose columns are `cols`.
export const featureRow = (cols, degree) => cols.flatMap(c => polyFeatures([c], degree, POLY)[0]);

// The mean of every base column over `points` (the other measurements are held here when a curve is
// drawn against the first column).
export const columnMeans = points => (points[0]?.cols ?? []).map((_, j) => points.reduce((s, p) => s + p.cols[j], 0) / points.length);

// ---- fits and errors ----------------------------------------------------------------------------

const pick = (arr, idx) => idx.map(i => arr[i]);

// Coordinate descent on collinear polynomial features is slow at a tiny lambda: stopped early it would act as
// a penalty of its own and hide the overfit, so the cap is generous (a fit costs a few milliseconds).
// With more features than training points (degree 9 on 10 points) the lasso can need about 100000 sweeps to meet the tolerance;
// after 20000 the coefficients are within about 1% of the final ones and every bar and curve looks the same, so the cap stays.
const LASSO_ITERS = 20000, LASSO_TOL = 1e-10;

// Fit on the training rows only: standardise the features on them, then ridge ('l2') or lasso ('l1').
// `lambda` 0 is plain least squares. Returns { coef, intercept, predict(rawRow), zeros }.
export function fitOn(X, y, lambda, kind, { iters = LASSO_ITERS, tol = LASSO_TOL } = {}) {
  const sc = standardize(X);
  const m = kind === 'l1' ? lasso(sc.Z, y, lambda, { iters, tol }) : ridge(sc.Z, y, lambda);
  return { coef: m.coef, intercept: m.intercept, predict: row => m.predict(sc.apply([row])[0]), zeros: m.coef.filter(v => v === 0).length };
}

// One fit at one lambda on one split, with its training and validation error (MSE, Infinity when not finite).
// -> { fit (see fitOn), train, validation }
export function fitAndScore(X, y, split, lambda, kind, opts) {
  const fit = fitOn(pick(X, split.train), pick(y, split.train), lambda, kind, opts);
  const score = idx => {
    const predicted = idx.map(i => fit.predict(X[i]));
    const e = mse(pick(y, idx), predicted);
    return Number.isFinite(e) && predicted.every(Number.isFinite) ? e : Infinity;
  };
  return { fit, train: score(split.train), validation: score(split.validation) };
}

// The fitted curve against the first base column: `steps + 1` points over 0..10. `hold` gives the other base
// columns (penguins: the two bill measurements) a fixed value. Points that are not finite are left out.
export function curvePoints(predict, degree, hold = [], steps = 100) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const x = i * 10 / steps, y = predict(featureRow([x, ...hold], degree));
    if (Number.isFinite(y)) out.push({ x, y: Math.max(-1e4, Math.min(1e4, y)) });
  }
  return out;
}

// Training and validation error for every log10(lambda) in `logs`, for one split of one design matrix.
// -> [{ logLambda, train, validation, zeros }] (errors are MSE in plot units; Infinity if not finite).
export function errorsByLambda(X, y, split, kind, logs, opts) {
  const Xt = pick(X, split.train), yt = pick(y, split.train), Xv = pick(X, split.validation), yv = pick(y, split.validation);
  const sc = standardize(Xt), Zv = sc.apply(Xv);
  const finite = e => (Number.isFinite(e) ? e : Infinity);
  return logs.map(logLambda => {
    const l = lambdaOf(logLambda);
    const m = kind === 'l1' ? lasso(sc.Z, yt, l, { iters: LASSO_ITERS, tol: LASSO_TOL, ...opts }) : ridge(sc.Z, yt, l);
    return {
      logLambda,
      train: finite(mse(yt, sc.Z.map(r => m.predict(r)))),
      validation: finite(mse(yv, Zv.map(r => m.predict(r)))),
      zeros: m.coef.filter(v => v === 0).length,
    };
  });
}

export const lambdaGridLogs = (count = 31) => Array.from({ length: count }, (_, i) => LOG_MIN + (LOG_MAX - LOG_MIN) * i / (count - 1));

// Errors that print the same (two decimals) tie; the larger lambda (the simpler model) wins a tie.
export const TIE_TOLERANCE = 0.005;

// Index of the lowest finite validation error; within TIE_TOLERANCE of it, the largest lambda.
export function bestIndex(rows) {
  let low = Infinity;
  for (const r of rows) if (r.validation < low) low = r.validation;
  if (low === Infinity) return 0;
  let best = 0;
  rows.forEach((r, i) => { if (r.validation <= low + TIE_TOLERANCE) best = i; });
  return best;
}

// What the validation curve does as lambda grows from the left: 'u' (falls, then rises again),
// 'rises' (no gain from any penalty) or 'falls' (still falling at the largest lambda).
export function shapeOf(rows) {
  const best = bestIndex(rows), first = rows[0].validation, at = rows[best].validation;
  if (!(at < first * 0.97)) return 'rises';
  const last = rows[rows.length - 1].validation;
  return best === rows.length - 1 || last <= at * 1.03 ? 'falls' : 'u';
}

export const LEARNING_SIZES = [6, 8, 10, 12, 15, 20, 25, 30, 36, POOL_POINTS];

const meanOf = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

// One repeat of the learning curve: reshuffle the points (seeded by `repeat`), hold out VAL_FRACTION of them as
// validation, and train on the first `size` of the rest, so a bigger size only adds points.
// -> [{ train, validation }] in the order of `sizes`.
export function learningRepeat(X, y, kind, logLambda, repeat, { seed = 1, sizes = LEARNING_SIZES } = {}) {
  const n = X.length, nVal = Math.round(n * VAL_FRACTION);
  const order = shuffle(Array.from({ length: n }, (_, i) => i), rng(seed * 1009 + repeat + 1));
  const pool = order.slice(0, n - nVal), hold = order.slice(n - nVal);
  return sizes.map(size => {
    const rows = pool.slice(0, Math.max(1, Math.min(size, pool.length)));
    const [e] = errorsByLambda(X, y, { train: rows, validation: hold }, kind, [logLambda]);
    return { train: e.train, validation: e.validation };
  });
}

// The mean over the repeats -> [{ size, train, validation }]
export function averageRepeats(repeats, sizes = LEARNING_SIZES) {
  return sizes.map((size, s) => ({ size, train: meanOf(repeats.map(r => r[s].train)), validation: meanOf(repeats.map(r => r[s].validation)) }));
}

// Average training and validation error against training size at one lambda, over `repeats` random splits.
export function learningCurveAt(X, y, kind, logLambda, { repeats = 6, seed = 1, sizes = LEARNING_SIZES } = {}) {
  return averageRepeats(Array.from({ length: repeats }, (_, r) => learningRepeat(X, y, kind, logLambda, r, { seed, sizes })), sizes);
}
