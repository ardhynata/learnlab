// Descriptive statistics for the outlier lab: mean, median, variance, standard deviation and
// Pearson correlation, plus a summary of a scatter of points and a comparison of how far the
// mean and the median move when points are added. Pure functions, tested in stats.test.js.
//
// Variance and standard deviation divide by n (the population form, as in sims/ml/scale.js);
// pass { sample: true } for the n - 1 form.

export function mean(xs) {
  if (!xs.length) return NaN;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

// Middle value; the average of the two middle values when the count is even.
export function median(xs) {
  if (!xs.length) return NaN;
  const s = xs.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function variance(xs, { sample = false } = {}) {
  const n = xs.length;
  if (n < (sample ? 2 : 1)) return NaN;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return s / (sample ? n - 1 : n);
}

export const stdDev = (xs, opts) => Math.sqrt(variance(xs, opts));

// Pearson correlation of two equal-length lists, in [-1, 1]. NaN when there are fewer than two
// pairs or when either list has no spread (the correlation is undefined, not 0).
export function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return NaN;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return NaN;
  return Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
}

// Everything the lab shows about a scatter of {x, y} points.
export function summarize(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return {
    n: points.length,
    meanX: mean(xs), meanY: mean(ys),
    medianX: median(xs), medianY: median(ys),
    sdX: stdDev(xs), sdY: stdDev(ys),
    r: pearson(xs, ys),
  };
}

// How far did the mean and the median move from `before` to `after` (two summaries)? Each shift is
// measured in standard deviations of the data before, so x and y are comparable. The comparison is made
// on the axis ('x' or 'y') where either of them moved most, because an outlier mostly shifts one axis.
// `which` says which moved more on that axis: 'mean', 'median', or 'same' (neither moved more than
// `ratio` times the other, or both barely moved). `negligible` is true when both moved less than
// `tiny` standard deviations (a sixth of the spread by default): at that size a ratio between the two
// is noise (the median steps from one data value to the next), so no winner is declared.
export const TINY_SHIFT = 0.15;
export function movedMore(before, after, { ratio = 1.5, tiny = TINY_SHIFT } = {}) {
  const shift = (a, b, sd) => (sd > 0 ? Math.abs(b - a) / sd : 0);
  const on = {
    x: { mean: shift(before.meanX, after.meanX, before.sdX), median: shift(before.medianX, after.medianX, before.sdX) },
    y: { mean: shift(before.meanY, after.meanY, before.sdY), median: shift(before.medianY, after.medianY, before.sdY) },
  };
  const axis = Math.max(on.x.mean, on.x.median) >= Math.max(on.y.mean, on.y.median) ? 'x' : 'y';
  const { mean, median } = on[axis];
  const negligible = Math.max(mean, median) < tiny;
  let which = 'same';
  if (!negligible) {
    if (mean > ratio * median) which = 'mean';
    else if (median > ratio * mean) which = 'median';
  }
  return { mean, median, which, axis, negligible };
}
