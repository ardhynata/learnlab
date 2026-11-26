// Real-data helpers for the overfit lab: turn the bundled penguins table into points on
// the lab's 0..10 plot, and score the learner's "where does validation error start
// rising?" prediction. Pure functions, tested in overfitreal.test.js; the lab draws and wires.
import { rng, shuffle } from './rng.js';
import { MAX_DEGREE } from './overfitdemo.js';

// What each real-data choice means: the column on the x axis (the target is always body mass).
export const REAL_FEATURES = { flipper: 'flipper_length_mm', bill: 'bill_length_mm' };
export const REAL_TARGET = 'body_mass_g';

// The rows of a parsed table that have BOTH columns (missing values are null after parseCsv),
// as { x, y } in the original units. `dropped` counts the rows left out.
export function completeRows(table, xCol, yCol = REAL_TARGET) {
  const ok = v => typeof v === 'number' && Number.isFinite(v);
  const rows = table.rows.filter(r => ok(r[xCol]) && ok(r[yCol])).map(r => ({ x: r[xCol], y: r[yCol] }));
  return { rows, total: table.rows.length, dropped: table.rows.length - rows.length };
}

// The range of the complete rows, used to map both columns onto 0..10. Fixed for the whole
// table (not per sample), so drawing a new sample never rescales the axes.
export function realScale(rows) {
  const xs = rows.map(r => r.x), ys = rows.map(r => r.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys);
  return { xMin, xMax, yMin, yMax };
}

const unit = (v, lo, hi) => (hi === lo ? 5 : (v - lo) / (hi - lo) * 10);

// Original units -> plot units (0..10), and back for y.
export const toPlot = (row, s) => ({ x: unit(row.x, s.xMin, s.xMax), y: unit(row.y, s.yMin, s.yMax) });
export const yFromPlot = (y, s) => s.yMin + y / 10 * (s.yMax - s.yMin);

// n rows drawn at random (without repeats) with the seed, in plot units, ordered by x.
// The same seed gives the same sample; a new seed gives a new one.
export function sampleReal(rows, scale, seed, n) {
  const pick = shuffle(rows, rng(seed * 13 + 5)).slice(0, Math.min(n, rows.length));
  return pick.map(r => toPlot(r, scale)).sort((a, b) => a.x - b.x);
}

// A mean squared error in plot units as a typical miss in the original y units
// (root mean squared error): sqrt(mse) * (yMax - yMin) / 10. Infinity stays Infinity.
export function typicalMiss(mseValue, scale) {
  return Math.sqrt(mseValue) * (scale.yMax - scale.yMin) / 10;
}

// The answers the learner can pick: a band of degrees. The right band holds the degree with
// the lowest validation error, which is where the validation curve stops falling and starts rising.
export const PREDICT_BANDS = [[1, 2], [3, 4], [5, 6], [7, 9], [10, MAX_DEGREE]];
export const bandKey = ([lo, hi]) => `${lo}-${hi}`;
export function bandOf(degree) {
  const band = PREDICT_BANDS.find(([lo, hi]) => degree >= lo && degree <= hi) ?? PREDICT_BANDS[PREDICT_BANDS.length - 1];
  return bandKey(band);
}
