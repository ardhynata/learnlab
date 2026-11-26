// Math behind the overfit lab: a noisy curve, a train/validation split, and the
// training and validation error of polynomial fits of every degree.
// Pure functions only; the lab file draws and wires.
import { polyFit, mse } from './regression.js';
import { rng, gauss, shuffle } from './rng.js';

// The hidden curve the sample is drawn around (centered in the 0..10 plot).
export const truth = x => 5 + 2.2 * Math.sin(x / 1.6);

export const MAX_DEGREE = 12;
export const TOTAL_POINTS = 30;
// What the lab starts with. Seed 11 gives a clear U-shaped validation curve.
export const DEFAULTS = { seed: 11, noise: 0.5, train: 14, degree: 9 };

// n points with x spread evenly over 0..10 (one per slot, jittered inside it) and
// y = truth(x) + noise. The same seed gives the same x values and the same
// noise pattern at any noise level, so moving the noise slider rescales the scatter.
export function sampleCurve(seed, { n = TOTAL_POINTS, noise = DEFAULTS.noise } = {}) {
  const random = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const x = (i + random()) * 10 / n;
    return { x, y: truth(x) + gauss(random) * noise };
  });
}

// Splits indices 0..n-1 at random into a training part (nTrain indices) and a
// validation part (the rest). The two never overlap and together cover every index.
// Growing nTrain only ever moves points from validation into training.
export function splitIndices(n, nTrain, seed) {
  const order = shuffle(Array.from({ length: n }, (_, i) => i), rng(seed * 7 + 1));
  const cut = Math.max(0, Math.min(n, Math.round(nTrain)));
  const byX = (a, b) => a - b;
  return { train: order.slice(0, cut).sort(byX), validation: order.slice(cut).sort(byX) };
}

export function splitSample(points, nTrain, seed) {
  const { train, validation } = splitIndices(points.length, nTrain, seed);
  return { train: train.map(i => points[i]), validation: validation.map(i => points[i]) };
}

// Fits a polynomial to `train` by least squares. predict() is always finite:
// a failed solve (or an overflowing prediction) gives NaN, which errorOf treats as infinite.
export function fitDegree(train, degree) {
  try {
    return polyFit(train.map(p => p.x), train.map(p => p.y), degree);
  } catch {
    return { degree, coef: [], predict: () => NaN };
  }
}

// Mean squared error of `fit` on `points`; Infinity if the fit is not finite there.
export function errorOf(fit, points) {
  if (!points.length) return NaN;
  const predicted = points.map(p => fit.predict(p.x));
  if (!predicted.every(Number.isFinite)) return Infinity;
  const e = mse(points.map(p => p.y), predicted);
  return Number.isFinite(e) ? e : Infinity;
}

// Errors that print the same (two decimals) are a tie. The lab shows 0.00 for every degree once the
// noise is 0, so the simplest of those degrees is the answer, not whichever has the least rounding dust.
export const TIE_TOLERANCE = 0.005;

// Index (0-based) of the lowest finite value, where anything within TIE_TOLERANCE of the lowest counts as
// tied and the first (lowest degree, the simplest model) wins. No finite value: index 0.
function argmin(values) {
  let low = Infinity;
  for (const v of values) if (Number.isFinite(v) && v < low) low = v;
  if (low === Infinity) return 0;
  return values.findIndex(v => Number.isFinite(v) && v <= low + TIE_TOLERANCE);
}

// Training and validation error for every degree 1..maxDegree.
// `best` is the degree with the lowest validation error; degrees tied within TIE_TOLERANCE give the lowest one.
export function errorsByDegree(train, validation, maxDegree = MAX_DEGREE) {
  const degrees = Array.from({ length: maxDegree }, (_, i) => i + 1);
  const fits = degrees.map(d => fitDegree(train, d));
  const trainError = fits.map(f => errorOf(f, train));
  const validationError = fits.map(f => errorOf(f, validation));
  return { degrees, fits, train: trainError, validation: validationError, best: degrees[argmin(validationError)] };
}

// "underfitting", "about right" or "overfitting" for one degree, judged only from
// the validation errors: within 50% of the best validation error is "about right";
// otherwise a degree below the best underfits and one above it overfits.
export function verdict(validationError, degree) {
  const best = argmin(validationError) + 1;
  const v = validationError[degree - 1];
  if (v <= validationError[best - 1] * 1.5 + 1e-3) return 'about right';
  return degree < best ? 'underfitting' : 'overfitting';
}

// x/y points of a fitted curve across 0..10, for drawing. y is clamped so a wild fit
// stays a finite, drawable line.
export function curvePoints(fit, steps = 160, lo = -40, hi = 50) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const x = i * 10 / steps;
    const y = fit.predict(x);
    return { x, y: Number.isFinite(y) ? Math.max(lo, Math.min(hi, y)) : (y > 0 ? hi : lo) };
  });
}

// Splits a line of errors for the error-against-degree chart. Values above `cap` (or not finite) are
// clamped to it and listed in `clipped` (indices into xs). The line is cut into runs: a segment that
// touches a clipped point is its own run with `clipped: true` (drawn dashed, so it does not read as a
// real plateau); the other segments are merged into solid runs. Neighbouring runs share their end point.
export function chartRuns(xs, ys, cap) {
  const clamp = v => (Number.isFinite(v) ? Math.min(v, cap) : cap);
  const isClipped = v => !Number.isFinite(v) || v > cap;
  const clipped = ys.reduce((out, v, i) => (isClipped(v) ? [...out, i] : out), []);
  const runs = [];
  for (let i = 0; i + 1 < xs.length; i++) {
    const cut = isClipped(ys[i]) || isClipped(ys[i + 1]);
    const last = runs[runs.length - 1];
    if (last && last.clipped === cut && !cut) { last.xs.push(xs[i + 1]); last.ys.push(clamp(ys[i + 1])); continue; }
    runs.push({ clipped: cut, xs: [xs[i], xs[i + 1]], ys: [clamp(ys[i]), clamp(ys[i + 1])] });
  }
  return { runs, clipped, points: xs.map((x, i) => ({ x, y: clamp(ys[i]), clipped: isClipped(ys[i]) })) };
}

// An error as text for the screen: two decimals, or "over 1000" for a blown-up fit.
export function formatError(e) {
  if (!Number.isFinite(e)) return 'over 1000';
  return e > 1000 ? 'over 1000' : e.toFixed(2);
}
