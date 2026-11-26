// Pure helpers for the leakage lab (sims/labs/leakage-lab.js). The heavy math is in leakage.js;
// this file holds what the lab adds on top: the penguins task, the numbers the tables show, how
// dots stack in the strip chart, and how a repeat of 50 splits is turned into a verdict.
// Tested in leakagelab.test.js.
import { featureCorrelations, tableToXY } from './leakage.js';

export const PENGUIN_FEATURES = ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g'];
export const PENGUIN_LABEL = 'species';
export const PENGUIN_POSITIVE = 'Adelie';

const isMissing = v => v === null || v === undefined || !Number.isFinite(v);

// The real-data task: "is this penguin an Adelie?" from four measurements. Missing values (NA) stay
// missing in X (the pipelines fill them); `naRows` rows have at least one, `naCells` counts all of them.
export function penguinTask(table) {
  const { X, y, rows } = tableToXY(table, PENGUIN_FEATURES, PENGUIN_LABEL, PENGUIN_POSITIVE);
  return {
    X, y, rows,
    total: table.rows.length,
    positives: y.reduce((a, v) => a + v, 0),
    naRows: X.filter(r => r.some(isMissing)).length,
    naCells: X.reduce((a, r) => a + r.filter(isMissing).length, 0),
  };
}

// Average absolute correlation of the chosen columns with the labels of the given rows. Used on the
// TEST rows: it shows how well the kept features line up with the test labels (by luck, for noise).
export function meanAbsCorrelation(X, y, cols) {
  if (!cols.length || !X.length) return 0;
  const r = featureCorrelations(X, y);
  return cols.reduce((a, j) => a + Math.abs(r[j]), 0) / cols.length;
}

// How many entries two index lists share.
export function sharedCount(a, b) {
  const s = new Set(b);
  return a.filter(v => s.has(v)).length;
}

// The first `max` column numbers shown as written, and how many were left out.
export function firstColumns(cols, max = 12) {
  return { shown: cols.slice(0, max), more: Math.max(0, cols.length - max) };
}

// Stacks dots that fall in the same horizontal slot, so a strip chart shows how many splits landed
// where. `xs` are pixel positions, `step` is the slot width in pixels (a dot's diameter). Returns, in
// the order of `xs`, { x: the slot's centre, level: 0 for the first dot in the slot, 1 for the next ... }.
export function stackDots(xs, step) {
  const used = new Map();
  return xs.map(x => {
    const slot = Math.round(x / step);
    const level = used.get(slot) ?? 0;
    used.set(slot, level + 1);
    return { x: slot * step, level };
  });
}

// A horizontal axis for accuracies: the whole 0..1 for the random-labels experiment, a zoomed one
// when every value sits near the top, so the strip is readable. Edges are multiples of 5 points.
export function accuracyAxis(values, { zoom = false } = {}) {
  if (!zoom || !values.length) return { lo: 0, hi: 1 };
  const lo = Math.max(0, Math.floor((Math.min(...values) - 0.02) * 20) / 20);
  return { lo: Math.min(lo, 0.9), hi: 1 };
}

// Tick values on [lo, hi] at least `minPx` apart on an axis `widthPx` wide.
export function accuracyTicks(lo, hi, widthPx, minPx = 46) {
  const step = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5].find(s => (s / (hi - lo)) * widthPx >= minPx) ?? 0.5;
  const out = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(4)));
  return out;
}

// What the 50 random-label splits showed, as one of four keys the predict box uses.
// "Well above chance" means a mean more than 8 points over 50%.
export const WELL_ABOVE = 0.58;
export function leakageOutcome(correctMean, leakyMean) {
  const honestHigh = correctMean > WELL_ABOVE, leakyHigh = leakyMean > WELL_ABOVE;
  if (honestHigh) return leakyHigh ? 'both-high' : 'honest-only';
  return leakyHigh ? 'leak-only' : 'neither';
}

// The preprocessing leak on real data: "tiny" when the mean accuracy gap is under one point.
export function preprocessingOutcome(leakyMean, correctMean) {
  const d = leakyMean - correctMean;
  if (Math.abs(d) < 0.01) return 'tiny';
  return d > 0 ? 'leak-ahead' : 'correct-ahead';
}

export const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
