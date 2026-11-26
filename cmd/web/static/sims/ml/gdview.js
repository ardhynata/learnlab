// Pure helpers for the gradient descent lab: reading a run (is it converged, still descending,
// diverging or bouncing?) and choosing contour levels. The lab file only draws and wires.
import { contours } from './gd.js';

// Length of the gradient at a point of a 2-D surface (the "gradient size" the lab shows).
export function gradSize(surface, p) {
  const g = surface.grad(p.x, p.y);
  return Math.hypot(g.x, g.y);
}

// Reads a run. `trace` is the list of states from start2d / step2d (start included, each with
// x, y, vx, vy, loss). Returns { status, gradSize, nearMinimum, excess }:
//   converged   the gradient is tiny and the point has stopped moving
//   diverging   the loss is far above where it started (or is no longer a number)
//   bouncing    after many steps the swings in the loss have stopped shrinking (for example a
//               step size that exactly hops from one side of the valley to the other)
//   descending  anything else: still on its way
// `excess` is the loss above the surface's lowest point, which is what the thresholds use, because
// the two-valleys surface has negative loss. `nearMinimum` says whether the point is within `near`
// of the marked minimum (a converged run can sit in a shallow valley instead).
export function verdict(surface, trace, { gradTol = 0.05, speedTol = 0.02, growth = 4, window = 20, near = 0.5 } = {}) {
  const last = trace.at(-1);
  const floor = surface.f(surface.minimum.x, surface.minimum.y);
  const excess = last.loss - floor;
  const size = gradSize(surface, last);
  const nearMinimum = Math.hypot(last.x - surface.minimum.x, last.y - surface.minimum.y) <= near;
  const out = status => ({ status, gradSize: size, nearMinimum, excess });
  if (!Number.isFinite(last.loss) || !Number.isFinite(size)) return out('diverging');
  const first = trace[0].loss - floor;
  if (trace.length > 1 && excess > growth * Math.max(first, 1)) return out('diverging');
  if (size < gradTol && Math.hypot(last.vx, last.vy) < speedTol) return out('converged');
  if (trace.length > 2 * window) {
    // Bouncing: the worst loss of the last `window` steps is no lower than the worst loss of the
    // `window` steps before it, so the swings are not shrinking (a decaying wobble is not bouncing).
    const worst = steps => Math.max(0, ...steps.map(p => p.loss - floor));
    const recent = worst(trace.slice(-window)), before = worst(trace.slice(-2 * window, -window));
    // ... and the path keeps reversing direction (a slow, steady descent does not).
    const recentSteps = trace.slice(-window - 1);
    let reversals = 0;
    for (let i = 2; i < recentSteps.length; i++) {
      const a = recentSteps[i - 1], b = recentSteps[i], c = recentSteps[i - 2];
      if ((b.x - a.x) * (a.x - c.x) + (b.y - a.y) * (a.y - c.y) < 0) reversals++;
    }
    if (recent >= 0.97 * before && reversals >= window / 2) return out('bouncing');
  }
  return out('descending');
}

// Learning-rate limits of the two-valleys surface that sims/ml/gd.js does not carry. Measured by running
// step2d with momentum 0 over starts in the whole 0..10 square (not derived from the curvature at one point):
//   nearLr  2 / the curvature at the deep minimum (about 2.58): the limit for starts close to a minimum;
//   hopLr   from far-away starts the walk begins to hop over the saddle into the other valley (none at
//           0.25, 43 of 111 starts on the left side at 0.3);
//   blowLr  the first far starts blow up (none at 0.52, some from 0.53).
export const twoValleysLimits = { nearLr: 0.77, hopLr: 0.3, blowLr: 0.5 };

// A diverging run keeps going this many more steps, so the growth shows on the plot and the chart
// instead of the run ending the moment it is called diverging.
export const DIVERGE_EXTRA_STEPS = 6;

// The step at which a run was first called diverging (null while it has not been): `prev` is the earlier
// value, `info` the verdict of the run so far, `t` the current step.
export const divergedAtOf = (prev, info, t) => prev ?? (info.status === 'diverging' ? t : null);

// Whether the lab's run is over: settled (converged, bouncing), a few steps after it began to diverge, or
// out of steps. `state` carries { t, info: verdict, divergedAt }.
export function runFinished(state, maxSteps) {
  if (state.t >= maxSteps) return true;
  if (state.info.status === 'diverging') return state.t - (state.divergedAt ?? state.t) >= DIVERGE_EXTRA_STEPS;
  return state.info.status !== 'descending';
}

// Equally spaced loss levels for drawing a surface's contour lines: multiples of one "nice" step,
// from just above the lowest loss up to the 90th percentile of the loss over the 0..10 square.
// Equal spacing matters: it is what makes lines that sit close together mean a steep surface.
export function contourLevels(f, count = 12) {
  const n = 40, vals = [];
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) vals.push(f(j * 10 / n, i * 10 / n));
  vals.sort((a, b) => a - b);
  const lo = vals[0], hi = vals[Math.floor(0.9 * (vals.length - 1))];
  const raw = (hi - lo) / count, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? raw;
  const levels = [];
  for (let k = Math.floor(lo / step) + 1; k * step <= hi + 1e-9; k++) levels.push(Number((k * step).toPrecision(10)));
  return { step, levels };
}

// The contour segments of a surface at its own levels, ready to draw.
export function surfaceContours(surface, count) {
  const { step, levels } = contourLevels(surface.f, count);
  return { step, sets: contours(surface.f, levels, 70) };
}
