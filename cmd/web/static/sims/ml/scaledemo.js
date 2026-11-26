// Math for the "Scale it" lab: a seeded two-feature dataset in very different units,
// the three scalings the lesson compares, k-NN accuracy under each, and one-hot encoding.
// Pure functions only; the lab file draws and wires.
import { rng, gauss } from './rng.js';
import { columnStats, standardize, minMax } from './scale.js';
import { neighbors, classify, looAccuracy } from './knn.js';

export const FEATURES = ['Income ($)', 'Age (years)'];
export const CLASSES = { A: 'Group A', B: 'Group B' };
export const SCALINGS = [['none', 'None (raw numbers)'], ['standardize', 'Standardize (z-score)'], ['minmax', 'Min-max (0 to 1)']];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// 60 people, two features: income in dollars (about 20,000 to 120,000) and age in years
// (about 18 to 70). Income is spread the same way in both groups. Age is what separates
// them: Group A is younger (around 31), Group B older (around 54).
// Each point is { features: [income, age], label: 'A' | 'B' }. (Labels are strings because
// the shared k-NN code compares vote keys, which are strings.)
export function incomeAgeData(seed = 2, n = 60) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const isB = i % 2 === 1;
    const income = clamp(Math.round((65000 + gauss(r) * 22000) / 100) * 100, 20000, 120000);
    const age = clamp(Math.round((isB ? 54 : 31) + gauss(r) * 8), 18, 70);
    return { features: [income, age], label: isB ? 'B' : 'A' };
  });
}

// Fits a scaling on `rows` (arrays of numbers) and returns functions that apply it to
// any raw row and undo it. Fitting on all rows here is fine for a demo; a real model
// would fit on the training rows only.
export function makeScaler(kind, rows) {
  const stats = columnStats(rows);
  if (kind === 'standardize') {
    const f = j => stats.std[j] || 1;
    return {
      kind, stats,
      forward: row => row.map((v, j) => (v - stats.mean[j]) / f(j)),
      inverse: row => row.map((v, j) => v * f(j) + stats.mean[j]),
    };
  }
  if (kind === 'minmax') {
    const f = j => (stats.max[j] - stats.min[j]) || 1;
    return {
      kind, stats,
      forward: row => row.map((v, j) => (v - stats.min[j]) / f(j)),
      inverse: row => row.map((v, j) => v * f(j) + stats.min[j]),
    };
  }
  if (kind !== 'none') throw new Error(`unknown scaling ${kind}`);
  return { kind, stats, forward: row => row.slice(), inverse: row => row.slice() };
}

// The data after scaling: { features, label } with scaled features.
export function scaledPoints(data, kind) {
  const scaler = makeScaler(kind, data.map(p => p.features));
  return { scaler, points: data.map(p => ({ features: scaler.forward(p.features), label: p.label })) };
}

// Leave-one-out k-NN accuracy for each scaling, plus the query's neighbors and vote.
// `query` is a raw row [income, age]. Returns { none, standardize, minmax }, each
// { accuracy, neighbors: [point indexes, closest first], label, distances }.
export function compareScalings(data, query, k) {
  const out = {};
  for (const [kind] of SCALINGS) {
    const { scaler, points } = scaledPoints(data, kind);
    const q = scaler.forward(query);
    const result = classify(points, { features: q }, k);
    out[kind] = {
      accuracy: looAccuracy(points, k),
      neighbors: result.picked.map(n => n.i),
      distances: result.picked.map(n => n.d),
      label: result.label,
      tied: result.tied,
    };
  }
  return out;
}

// Re-exports so the lab imports one module.
export { neighbors, standardize, minMax };

// One-hot encoding: one column per category, a 1 in the column of the row's category.
export function oneHot(values, categories = [...new Set(values)]) {
  return { categories, rows: values.map(v => categories.map(c => (c === v ? 1 : 0))) };
}

// Ordinal codes: the position of each value in `order` (0, 1, 2, ...).
export function ordinal(values, order) {
  return values.map(v => order.indexOf(v));
}
