// Loss functions for fitting a straight line y = slope * x + intercept.
// Pure math for the "Loss functions" lab and its figures: the two losses, a seeded
// dataset with an optional outlier, the best line for each loss, and the loss as
// a function of the slope.
import { rng, gauss } from './rng.js';
import { linearFit } from './regression.js';

export const LOSSES = { mse: 'Mean squared error', mae: 'Mean absolute error' };

// Residual = actual - predicted. Positive when the point is above the line.
export function residuals(points, slope, intercept) {
  return points.map(p => p.y - (slope * p.x + intercept));
}

export function meanSquaredError(res) { return res.reduce((s, r) => s + r * r, 0) / res.length; }
export function meanAbsoluteError(res) { return res.reduce((s, r) => s + Math.abs(r), 0) / res.length; }

// Huber loss per point: squared near zero, straight beyond `delta`. Averaged here.
export function huberLoss(res, delta = 1) {
  return res.reduce((s, r) => s + (Math.abs(r) <= delta ? 0.5 * r * r : delta * (Math.abs(r) - 0.5 * delta)), 0) / res.length;
}

export function lossOf(kind, res) {
  if (kind === 'mse') return meanSquaredError(res);
  if (kind === 'mae') return meanAbsoluteError(res);
  throw new Error(`unknown loss ${kind}`);
}

// Loss of the line (slope, intercept) on the points.
export function lineLoss(points, kind, slope, intercept) {
  return lossOf(kind, residuals(points, slope, intercept));
}

// About 20 points near y = 0.6 x + 1.5 with seeded noise; the outlier is a far-off point added on request.
export const OUTLIER = { x: 9, y: 0.8 };
export function makeData(seed = 11, { n = 20, outlier = false } = {}) {
  const random = rng(seed);
  const pts = Array.from({ length: n }, () => {
    const x = 0.4 + random() * 9.2;
    return { x, y: Math.max(0.2, 0.6 * x + 1.5 + gauss(random) * 0.6) };
  });
  return outlier ? [...pts, { ...OUTLIER }] : pts;
}

// The slope that gives the lowest loss when the intercept is held fixed. Exact:
// for squared error it is a one-line formula; for absolute error it is the
// weighted median of the slopes (y - b) / x that each point alone would choose.
export function bestSlopeForIntercept(points, kind, intercept) {
  if (kind === 'mse') {
    const sxx = points.reduce((s, p) => s + p.x * p.x, 0);
    return sxx ? points.reduce((s, p) => s + p.x * (p.y - intercept), 0) / sxx : 0;
  }
  const items = points.filter(p => p.x !== 0).map(p => ({ s: (p.y - intercept) / p.x, w: Math.abs(p.x) })).sort((a, b) => a.s - b.s);
  if (!items.length) return 0;
  const half = items.reduce((s, it) => s + it.w, 0) / 2;
  let acc = 0;
  for (const it of items) { acc += it.w; if (acc >= half) return it.s; }
  return items.at(-1).s;
}

// The best line for a loss. Squared error: ordinary least squares. Absolute error:
// an optimal line passes through at least two of the points, so try every pair.
export function bestLine(points, kind) {
  if (kind === 'mse') {
    const { slope, intercept } = linearFit(points.map(p => p.x), points.map(p => p.y));
    return { slope, intercept, loss: lineLoss(points, kind, slope, intercept) };
  }
  let best = null;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[j].x - points[i].x;
      if (dx === 0) continue;
      const slope = (points[j].y - points[i].y) / dx;
      const intercept = points[i].y - slope * points[i].x;
      const loss = lineLoss(points, kind, slope, intercept);
      if (!best || loss < best.loss) best = { slope, intercept, loss };
    }
  }
  return best ?? { slope: 0, intercept: 0, loss: lineLoss(points, kind, 0, 0) };
}

// Loss at each slope in `slopes`, intercept held at a fixed value: the curve the lab plots.
export function lossCurve(points, kind, intercept, slopes) {
  return slopes.map(s => lineLoss(points, kind, s, intercept));
}

// Evenly spaced values from lo to hi, both included.
export function linspace(lo, hi, count) {
  return Array.from({ length: count }, (_, i) => lo + (hi - lo) * i / (count - 1));
}

// Slopes at which the absolute-error curve bends (each point's own slope). Between them it is a straight segment.
export function maeBreakpoints(points, intercept) {
  return points.filter(p => p.x !== 0).map(p => (p.y - intercept) / p.x).sort((a, b) => a - b);
}

// The squares the lab draws for squared error: one per point, side |residual| in data units, hanging
// from the point toward the middle of the plot (x = 5) so it stays inside. Sorted largest first so the
// caller can paint big ones first and small ones on top; `max` keeps only the biggest (many points),
// and residuals below `minSize` are not worth a square.
export function residualSquares(points, res, { max = Infinity, minSize = 0.02, mid = 5 } = {}) {
  const out = [];
  points.forEach((p, i) => {
    const size = Math.abs(res[i]);
    if (!(size >= minSize)) return;
    const dir = p.x > mid ? -1 : 1;
    out.push({ index: i, size, x0: p.x, x1: p.x + dir * size, y0: p.y, y1: p.y - res[i] });
  });
  out.sort((a, b) => b.size - a.size || a.index - b.index);
  return out.slice(0, max);
}
