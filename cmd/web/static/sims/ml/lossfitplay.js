// Pure helpers for the "Fit a line, read its loss" lab: two draggable handles that define a line,
// per-point costs, the real penguin data scaled into the plot, and a fast exact best line for
// absolute error (so a few hundred points stay interactive).
// Language-free; tested in lossfitplay.test.js.
import { lineLoss } from './lossfit.js';

export const PLOT_LO = 0.5;
export const PLOT_HI = 9.5;
// Handles closer than this (in plot units, along x) cannot define a stable line.
export const MIN_GAP = 0.6;

// Linear map of `values` from [min, max] to [lo, hi]. A constant column lands in the middle.
export function rescale(values, lo = PLOT_LO, hi = PLOT_HI) {
  let min = Infinity, max = -Infinity;
  for (const v of values) { if (v < min) min = v; if (v > max) max = v; }
  return { min, max, values: values.map(v => (max === min ? (lo + hi) / 2 : lo + (v - min) / (max - min) * (hi - lo))) };
}

// Flipper length vs body mass from the parsed penguins table (sims/ml/tabular.js parseCsv).
// Rows missing either column are dropped, and the counts are returned so the lab can say so.
// Both columns are stretched to PLOT_LO..PLOT_HI so they fit the 0..10 plot.
export function penguinPoints(table, { xCol = 'flipper_length_mm', yCol = 'body_mass_g' } = {}) {
  const rows = table.rows.filter(r => Number.isFinite(r[xCol]) && Number.isFinite(r[yCol]));
  const sx = rescale(rows.map(r => r[xCol])), sy = rescale(rows.map(r => r[yCol]));
  return {
    points: rows.map((_, i) => ({ x: sx.values[i], y: sy.values[i] })),
    kept: rows.length, total: table.rows.length, dropped: table.rows.length - rows.length,
    xRange: { min: sx.min, max: sx.max }, yRange: { min: sy.min, max: sy.max },
  };
}

// The line through two handles, or null when they are (almost) above each other.
export function lineThrough(a, b, minGap = 1e-6) {
  const dx = b.x - a.x;
  if (Math.abs(dx) < minGap) return null;
  const slope = (b.y - a.y) / dx;
  return { slope, intercept: a.y - slope * a.x };
}

// Keeps a line inside the slider ranges. `clamped` says whether anything had to move.
export function clampLine(line, { slopeMin, slopeMax, interceptMin, interceptMax }) {
  const slope = Math.max(slopeMin, Math.min(slopeMax, line.slope));
  const intercept = Math.max(interceptMin, Math.min(interceptMax, line.intercept));
  return { slope, intercept, clamped: slope !== line.slope || intercept !== line.intercept };
}

// Where to draw the two handles for a line: on the line, preferably at x = 2 and x = 8, moved
// inward when the line leaves the plot there. Returned left to right.
export function handlePositions(line, { prefer = [2, 8], yLo = 0.3, yHi = 9.7, xLo = 0.2, xHi = 9.8, gap = MIN_GAP } = {}) {
  let lo = xLo, hi = xHi;
  if (line.slope !== 0) {
    const a = (yLo - line.intercept) / line.slope, b = (yHi - line.intercept) / line.slope;
    lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b));
  } else if (line.intercept < yLo || line.intercept > yHi) { lo = xHi; hi = xLo; }
  const at = x => ({ x, y: Math.max(yLo, Math.min(yHi, line.slope * x + line.intercept)) });
  if (lo > hi) return prefer.map(at); // the line misses the plot: still give two handles
  const xa = Math.max(lo, Math.min(prefer[0], hi - gap));
  const xb = Math.max(xa + gap, Math.min(prefer[1], hi));
  return [at(xa), at(Math.min(xb, Math.max(hi, xa)))];
}

// Moves handle `idx` to `target` (data coordinates). The other handle stays put, the line goes
// through both, and the slider ranges in `limits` are respected. Returns the new handles and line.
export function dragHandle(handles, idx, target, limits, minGap = MIN_GAP) {
  const other = handles[1 - idx];
  let x = target.x;
  if (Math.abs(x - other.x) < minGap) {
    const side = x >= other.x ? 1 : -1;
    x = other.x + side * minGap;
    if (x > 10 || x < 0) x = other.x - side * minGap;
  }
  const moved = { x, y: target.y };
  const raw = lineThrough(moved, other);
  if (!raw) return { handles, line: null };
  const c = clampLine(raw, limits);
  const line = { slope: c.slope, intercept: c.intercept };
  if (!c.clamped) {
    const next = [...handles]; next[idx] = moved;
    return { handles: next, line };
  }
  // The pointer asked for a line outside the sliders: show the nearest allowed line instead.
  const hp = handlePositions(line);
  const swap = Math.abs(hp[0].x - moved.x) > Math.abs(hp[1].x - moved.x) ? idx === 0 : idx === 1;
  return { handles: swap ? [hp[1], hp[0]] : hp, line };
}

// Each point's contribution to the loss before averaging: r^2 for 'mse', |r| for 'mae'.
export function costs(res, kind) {
  if (kind === 'mse') return res.map(r => r * r);
  if (kind === 'mae') return res.map(r => Math.abs(r));
  throw new Error(`unknown loss ${kind}`);
}

// The point that costs the most and its share of the total cost (0 when every cost is 0).
export function largestShare(cs) {
  let index = 0, total = 0;
  cs.forEach((c, i) => { total += c; if (c > cs[index]) index = i; });
  return { index, share: total > 0 ? cs[index] / total : 0, total };
}

// How far a best line moves when the data changes: the root-mean-square of the vertical gap
// between the two lines over x = lo..hi. Exact for straight lines (the mean of (ds x + db)^2).
export function lineShift(before, after, lo = PLOT_LO, hi = PLOT_HI) {
  const ds = after.slope - before.slope, db = after.intercept - before.intercept;
  const meanSquare = ds * ds * (lo * lo + lo * hi + hi * hi) / 3 + ds * db * (lo + hi) + db * db;
  return Math.sqrt(Math.max(0, meanSquare));
}

// Which best line moved clearly more when the outlier was added: 'mse', 'mae', or 'same' when
// neither moved 1.5 times as far as the other (or both barely moved, under 0.05 plot units).
export function shiftWinner(mseShift, maeShift) {
  if (Math.max(mseShift, maeShift) < 0.05) return 'same';
  if (mseShift > 1.5 * maeShift) return 'mse';
  if (maeShift > 1.5 * mseShift) return 'mae';
  return 'same';
}

// Exact best line for absolute error: an optimal line passes through two of the points, so try
// every pair. Same answer as bestLine(points, 'mae') in lossfit.js, but with no allocation and an
// early exit as soon as a candidate cannot beat the best so far.
export function bestAbsoluteLine(points) {
  const n = points.length;
  const xs = Float64Array.from(points, p => p.x), ys = Float64Array.from(points, p => p.y);
  let best = null, bestSum = Infinity;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = xs[j] - xs[i];
      if (dx === 0) continue;
      const slope = (ys[j] - ys[i]) / dx, intercept = ys[i] - slope * xs[i];
      let sum = 0;
      for (let k = 0; k < n && sum < bestSum; k++) sum += Math.abs(ys[k] - slope * xs[k] - intercept);
      if (sum < bestSum) { bestSum = sum; best = { slope, intercept }; }
    }
  }
  if (!best) return { slope: 0, intercept: 0, loss: lineLoss(points, 'mae', 0, 0) };
  return { ...best, loss: bestSum / n };
}
