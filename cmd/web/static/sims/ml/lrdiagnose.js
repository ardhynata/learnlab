// Reading a gradient-descent run: is the learning rate too small, about right, too big, or is the
// run trapped? Pure functions for the "Learning rate and trouble" lab. They sit on top of gd.js
// (which owns the update rule) and never change it.
//
// A trace is the list of states trace1d returns: [{ x, v, loss, t }, ...], start included.
import { functions1d, step1d, start1d } from './gd.js';

// A run is cut off once the loss passes this, so a diverging run stays finite and drawable.
export const BLOWUP = 1e30;

// Like trace1d, but stops as soon as the run has exploded (loss beyond BLOWUP or not a number).
export function runTrace(fn, opts, steps, at) {
  const out = [start1d(fn, at)];
  for (let i = 0; i < steps; i++) {
    const next = step1d(fn, out.at(-1), opts);
    if (!Number.isFinite(next.x) || !Number.isFinite(next.loss)) break;
    out.push(next);
    if (next.loss > BLOWUP) break;
  }
  return out;
}

// A slope smaller than this counts as flat when deciding whether a run has stopped.
const FLAT_SLOPE = 0.02;

// A log axis cannot show zero. Losses at or below LOSS_FLOOR are indistinguishable from it, so a log chart
// draws a run only down to its first such step (the floor step itself is kept, as the end of the line).
export const LOSS_FLOOR = 1e-12;
export function cutAtLossFloor(trace, floor = LOSS_FLOOR) {
  const i = trace.findIndex(s => s.loss <= floor);
  return i < 0 ? trace : trace.slice(0, i + 1);
}
// The loss chart switches to a log axis by itself once a run's loss passes this (larger values crowd the axis labels).
export const LOG_AUTO_LOSS = 1e4;
export const blownUp = trace => trace.at(-1).loss > BLOWUP;

// The lowest point of fn on x in 0..10, found by scanning (gd.js carries only an approximate
// `minimum` for the two-dip curve, and the lab needs the true one to tell "stuck" from "done").
const lowest = new WeakMap();
export function globalMinimum(fn) {
  if (!lowest.has(fn)) {
    let bx = 0, bf = fn.f(0);
    for (let i = 1; i <= 10000; i++) { const x = i / 1000, f = fn.f(x); if (f < bf) { bx = x; bf = f; } }
    // Polish the scan: the minimum is where the slope changes sign, so bisect on the gradient.
    let lo = Math.max(0, bx - 0.002), hi = Math.min(10, bx + 0.002);
    if (fn.grad(lo) < 0 && fn.grad(hi) > 0) {
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (fn.grad(mid) < 0) lo = mid; else hi = mid; }
      bx = (lo + hi) / 2; bf = fn.f(bx);
    }
    lowest.set(fn, { x: bx, loss: bf });
  }
  return lowest.get(fn);
}

// The vertical axis of the lab's curve plot: five equal steps of a round size, so the tick labels
// are short whole numbers and the top is at least the largest loss on x in 0..10.
const AXIS_STEPS = [1, 2, 3, 4, 5, 10, 15, 20, 25, 50, 100, 200];
export function lossAxis(fn) {
  let top = 0;
  for (let i = 0; i <= 1000; i++) top = Math.max(top, fn.f(i / 100));
  const step = AXIS_STEPS.find(s => 5 * s >= top) ?? Math.ceil(top / 5);
  return { step, top: 5 * step };
}

const num = (v, d = 2) => (Math.abs(v) >= 1e5 || (v !== 0 && Math.abs(v) < 1e-3) ? v.toExponential(1) : v.toFixed(d));

// Classifies a run into one of: 'start' (too few steps to tell), 'diverging', 'oscillating',
// 'stuck', 'converging', 'slow'. The reason is a plain-words sentence for the learner.
export function diagnose(trace, fn) {
  const n = trace.length - 1;
  if (n < 3) return { verdict: 'start', reason: 'Take a few more steps: at least three are needed to read the pattern of the loss.' };
  const loss = trace.map(s => s.loss), xs = trace.map(s => s.x);
  const dx = Array.from({ length: n }, (_, i) => xs[i + 1] - xs[i]);
  const first = loss[0], last = loss[n];
  const best = globalMinimum(fn);

  const rising = [n - 1, n - 2, n - 3].filter(i => loss[i + 1] > loss[i]).length;
  if (!Number.isFinite(last) || last > BLOWUP || (last > first * 1.5 + 1e-9 && last >= 0.99 * Math.max(...loss) && rising >= 2)) {
    const grew = last > BLOWUP ? 'exploded' : `grown from ${num(first)} to ${num(last)}`;
    return { verdict: 'diverging', reason: `The loss has ${grew} instead of falling: each step overshoots the minimum by more than the last, so the learning rate is too big.` };
  }

  // Overshooting shows up two ways: the position jumps to the other side of the minimum on almost
  // every step (a learning rate near the limit), or the loss keeps rising and falling in waves
  // (usually momentum carrying the point past the bottom). Tiny moves are ignored: they are settling.
  const win = Math.min(8, n);
  const moves = dx.slice(n - win).filter(d => Math.abs(d) > 1e-6);
  let flips = 0;
  for (let i = 1; i < moves.length; i++) if (moves[i] * moves[i - 1] < 0) flips++;
  if (moves.length >= 3 && flips / (moves.length - 1) >= 0.6) {
    const shrink = Math.pow(Math.abs(moves.at(-1)) / Math.abs(moves[0]), 1 / (moves.length - 1));
    return shrink < 0.98
      ? { verdict: 'oscillating', reason: `It jumps from one side of the minimum to the other on almost every step. Each swing is about ${Math.round((1 - shrink) * 100)}% smaller than the last, so it will settle, but slowly and wastefully.` }
      : { verdict: 'oscillating', reason: 'It jumps from one side of the minimum to the other and the swings are not getting smaller, so it bounces back and forth without settling.' };
  }
  const recent = Array.from({ length: Math.min(20, n) }, (_, j) => n - 1 - j).filter(i => Math.abs(dx[i]) > 1e-6);
  const rises = recent.filter(i => loss[i + 1] > loss[i] * (1 + 1e-9)).length;
  const nearlyThere = last - best.loss < 0.01 * (first - best.loss); // wobbling, but already at the bottom
  // A wave of overshoot dips close to the bottom between its crests. So the rises are ignored only
  // when the loss has stayed that low for a whole recent stretch, or the verdict would flicker
  // between "oscillating" and "converging" as the run plays.
  const stayedThere = Math.max(...loss.slice(-Math.min(10, n + 1))) - best.loss < 0.01 * (first - best.loss);
  if (recent.length >= 5 && rises / recent.length >= 0.25 && !stayedThere) {
    return { verdict: 'oscillating', reason: `The loss rises on ${rises} of the last ${recent.length} steps instead of falling steadily: the point keeps overshooting the bottom and swinging back. A smaller learning rate or less momentum calms this.` };
  }

  if (nearlyThere && Math.abs(xs[n] - best.x) < 0.5) {
    // "Wobbling" only fits a run whose recent moves change direction; a smooth approach is just settling.
    const recentMoves = dx.slice(-Math.min(4, n)).filter(d => Math.abs(d) > 1e-6);
    const wobbles = recentMoves.some((d, i) => i && d * recentMoves[i - 1] < 0);
    return { verdict: 'converging', reason: `It is at the bottom of the curve (x = ${num(xs[n])}, loss ${num(last)}) and ${wobbles ? 'only wobbling a little around it' : 'is settling there'}.` };
  }

  // "Settled" needs a flat slope as well as tiny steps: a very small learning rate also makes tiny
  // steps, but there the slope is still steep and the run is only slow.
  const settled = dx.slice(-Math.min(5, n)).every(d => Math.abs(d) < 1e-3) && Math.abs(fn.grad(xs[n])) < FLAT_SLOPE;
  if (settled) {
    const x = xs[n];
    if (Math.abs(x - best.x) < 0.25 || last <= best.loss + 1e-3) {
      return { verdict: 'converging', reason: `It has settled at x = ${num(x)}, the lowest point of the curve (loss ${num(last)}).` };
    }
    return { verdict: 'stuck', reason: `It has stopped at x = ${num(x)}, where the loss is ${num(last)}, but the lowest point of this curve is at x = ${num(best.x)} with loss ${num(best.loss)}. With a modest rate descent only goes downhill, so it cannot climb out of this dip.` };
  }

  const k = Math.min(6, n - 1);
  const ratio = Math.pow(Math.abs(dx[n - 1]) / Math.abs(dx[n - 1 - k]), 1 / k);
  const falling = last < loss[n - k];
  if (falling && ratio >= 0.95) {
    return { verdict: 'slow', reason: `The loss is falling, but only from ${num(first)} to ${num(last)} so far: the steps are tiny and not getting smaller. The learning rate may be too small for the number of steps you gave it.` };
  }
  if (last >= first * 0.999) {
    return { verdict: 'oscillating', reason: `After ${n} steps the loss is no lower than where it started (${num(first)}). It is wandering rather than descending.` };
  }
  const pct = Math.round((1 - last / first) * 100);
  return { verdict: 'converging', reason: `The loss has fallen from ${num(first)} to ${num(last)} (${pct}% lower) and the steps are shrinking as it nears the bottom.` };
}

// ---- the learning-rate slider: log-style scale, 0.001 to 2.5 -----------------------------------

export const LR_MIN = 0.001, LR_MAX = 2.5, LR_POSITIONS = 300;
const decades = Math.log(LR_MAX / LR_MIN);
// Slider position (0..300) -> learning rate, rounded to two significant digits so values read cleanly.
export const lrFromPos = p => Number((LR_MIN * Math.exp(decades * p / LR_POSITIONS)).toPrecision(2));
// The slider position whose (rounded) learning rate is closest to `lr`, on the log scale.
export function posFromLr(lr) {
  let best = 0, bestGap = Infinity;
  for (let p = 0; p <= LR_POSITIONS; p++) {
    const gap = Math.abs(Math.log(lrFromPos(p) / lr));
    if (gap < bestGap) { best = p; bestGap = gap; }
  }
  return best;
}

// ---- presets ---------------------------------------------------------------------------------

export const PRESET_NAMES = ['tooSmall', 'justRight', 'tooBig', 'overshooting'];

// Per function: a learning rate and momentum for each preset button. "Just right" is a good
// learning rate; on the two-dip curve a good learning rate still gets trapped, which is the point.
export const presets = {
  parabola: {
    tooSmall: { lr: 0.01, momentum: 0 }, justRight: { lr: 0.5, momentum: 0 },
    tooBig: { lr: 2.2, momentum: 0 }, overshooting: { lr: 1.8, momentum: 0 },
  },
  steep: {
    tooSmall: { lr: 0.002, momentum: 0 }, justRight: { lr: 0.15, momentum: 0 },
    tooBig: { lr: 0.4, momentum: 0 }, overshooting: { lr: 0.3, momentum: 0 },
  },
  wiggly: {
    tooSmall: { lr: 0.002, momentum: 0 }, justRight: { lr: 0.1, momentum: 0 },
    tooBig: { lr: 2.5, momentum: 0 }, overshooting: { lr: 2.0, momentum: 0 },
  },
};

export { functions1d };
