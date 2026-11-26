// Pure helpers for the tree-builder lab: the data (generated or the real penguins), the train and
// validation split, the numbers shown for the learner's first split, accuracy at every depth, and the
// rectangles a tree cuts the plot into. No DOM, no language: the lab turns these results into text.
// Tested in treebuilder.test.js. The tree itself is sims/ml/tree.js.
import { rng, shuffle } from './rng.js';
import { makeDataset, SHARED_SEED } from '../datasets.js';
import { gini, applySplit, bestSplit, fitTreeWithFirstSplit, accuracy, leafCount, treeDepth } from './tree.js';

export { SHARED_SEED };
export const MAX_DEPTH = 10;
export const DEFAULT_DEPTH = 3;
export const TOTAL_POINTS = 150;
export const TRAIN_POINTS = 100;
export const PATTERNS = ['blobs', 'checker'];
// The checker pattern has this share of its labels flipped, so a deep tree has noise to memorize.
export const FLIP_SHARE = 0.08;

// ---- data ---------------------------------------------------------------------------------------

// Rows { x, y, label } on the 0..10 plot. 'blobs' is the course dataset (the same first 48 points as the
// k-NN and k-means labs at the shared seed, then more of the same kind); 'checker' is its checker pattern
// with a few labels flipped.
export function generatedRows(pattern, seed = SHARED_SEED, n = TOTAL_POINTS) {
  const rows = makeDataset(pattern === 'checker' ? 'checker' : 'blobs', seed, n).map(({ x, y, label }) => ({ x, y, label }));
  if (pattern !== 'checker') return rows;
  const random = rng(seed * 7 + 3);
  return rows.map(p => (random() < FLIP_SHARE ? { ...p, label: p.label === 'A' ? 'B' : 'A' } : p));
}

// The four penguin measurements the learner can put on the axes. `name` is [English, Indonesian].
export const PENGUIN_COLUMNS = [
  { key: 'bill_length_mm', name: ['Bill length', 'Panjang paruh'], unit: 'mm', digits: 1 },
  { key: 'bill_depth_mm', name: ['Bill depth', 'Kedalaman paruh'], unit: 'mm', digits: 1 },
  { key: 'flipper_length_mm', name: ['Flipper length', 'Panjang flipper'], unit: 'mm', digits: 1 },
  { key: 'body_mass_g', name: ['Body mass', 'Massa tubuh'], unit: 'g', digits: 0 },
];
export const penguinColumn = key => PENGUIN_COLUMNS.find(c => c.key === key) ?? PENGUIN_COLUMNS[0];

// The rows of a parsed penguins table that have both chosen measurements and a species (missing values
// are null after parseCsv), as { x, y, label } in the original units. `dropped` counts the rows left out.
export function realRows(table, xCol, yCol) {
  const ok = v => typeof v === 'number' && Number.isFinite(v);
  const rows = table.rows
    .filter(r => ok(r[xCol]) && ok(r[yCol]) && typeof r.species === 'string' && r.species !== '')
    .map(r => ({ x: r[xCol], y: r[yCol], label: r.species }));
  return { rows, total: table.rows.length, dropped: table.rows.length - rows.length };
}

// Maps values onto the 0..10 plot with a 5% margin on both sides, so no dot sits on the frame.
// Fixed for the whole table (not per sample), so a new sample never rescales the axes.
export function axisScale(values) {
  const lo = Math.min(...values), hi = Math.max(...values);
  const pad = (hi - lo) * 0.05 || 1;
  return { lo: lo - pad, hi: hi + pad };
}
export const IDENTITY_SCALE = { lo: 0, hi: 10 };
export const toPlot = (value, s) => (value - s.lo) / (s.hi - s.lo) * 10;
export const fromPlot = (p, s) => s.lo + p / 10 * (s.hi - s.lo);

// n rows drawn at random without repeats, then the first `train` of them train the tree and the rest
// are held back for validation. The same seed gives the same split.
export function splitRows(rows, seed, { n = TOTAL_POINTS, train = TRAIN_POINTS } = {}) {
  const chosen = shuffle(rows, rng(seed * 13 + 5)).slice(0, Math.min(n, rows.length));
  const cut = Math.min(train, Math.max(1, chosen.length - 1));
  return { train: chosen.slice(0, cut), validation: chosen.slice(cut) };
}

// Rows -> the matrix and labels tree.js wants, in plot units (0..10).
export function toMatrix(rows, sx = IDENTITY_SCALE, sy = IDENTITY_SCALE) {
  return { points: rows.map(r => [toPlot(r.x, sx), toPlot(r.y, sy)]), labels: rows.map(r => r.label) };
}

// The sorted distinct labels (the order tree.js uses for counts).
export function classesOf(labels) {
  return [...new Set(labels)].sort((a, b) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0));
}

// ---- the first split ------------------------------------------------------------------------------

export function median(values) {
  const s = [...values].sort((a, b) => a - b), m = s.length >> 1;
  return s.length === 0 ? 0 : s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// The q-quantile (0..1) of the values, by linear interpolation between neighbours; 0 for no values.
export function quantile(values, q) {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b), at = Math.min(1, Math.max(0, q)) * (s.length - 1), i = Math.floor(at);
  return i + 1 < s.length ? s[i] + (s[i + 1] - s[i]) * (at - i) : s[i];
}

// Where the first split starts: a bit left of the middle, so there is something to improve on screen.
export const START_QUANTILE = 0.3;
export const startThreshold = values => clampThreshold(values, quantile(values, START_QUANTILE));

// Keeps a threshold where both sides of the split are non-empty: from the smallest value up to just
// under the largest one (a point goes left when value <= threshold).
export function clampThreshold(values, threshold) {
  if (values.length === 0) return threshold;
  const lo = Math.min(...values), hi = Math.max(...values) - 0.005;
  if (hi <= lo) return lo;
  return Math.min(hi, Math.max(lo, threshold));
}

// What the learner's split does: class counts and Gini impurity of the whole set, of each side, the
// size-weighted impurity after the split, and the drop (before minus after).
export function firstSplitReport(points, labels, classes, feature, threshold) {
  const count = idx => classes.map(c => idx.filter(i => labels[i] === c).length);
  const all = points.map((_, i) => i);
  const { left, right } = applySplit(points, feature, threshold);
  const side = idx => { const counts = count(idx); return { n: idx.length, counts, gini: gini(counts) }; };
  const whole = side(all), l = side(left), r = side(right);
  const after = whole.n ? (l.n * l.gini + r.n * r.gini) / whole.n : 0;
  return { all: whole, left: l, right: r, before: whole.gini, after, drop: whole.gini - after };
}

// The best first split by Gini on the training points: { feature, threshold, gain } or null.
export function bestFirstSplit(points, labels) {
  const best = bestSplit(points, labels, null, 1);
  return best ? { feature: best.feature, threshold: best.threshold, gain: best.gain } : null;
}

// ---- growing ----------------------------------------------------------------------------------

// The tree for a forced first split, grown to maxDepth with at least minLeaf points per leaf.
export function growTree(train, first, maxDepth, minLeaf) {
  return fitTreeWithFirstSplit(train.points, train.labels, first.feature, first.threshold, { maxDepth, minLeaf });
}

// For every depth 1..maxDepth: leaves, the depth the tree really reached, training and validation accuracy.
export function depthCurve(train, validation, first, { minLeaf = 1, maxDepth = MAX_DEPTH } = {}) {
  const out = [];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const tree = growTree(train, first, depth, minLeaf);
    out.push({
      depth, leaves: leafCount(tree), reached: treeDepth(tree),
      train: accuracy(tree, train.points, train.labels),
      validation: accuracy(tree, validation.points, validation.labels),
    });
  }
  return out;
}

// Does validation accuracy keep rising with depth? 'rising': its highest value first appears in the last
// two depths. Otherwise 'falls' when the last depth is at least `tol` below the highest, else 'levels'.
export function validationTrend(validation, tol = 0.03) {
  if (validation.length === 0) return 'levels';
  const peak = Math.max(...validation);
  const peakAt = validation.findIndex(a => a >= peak - 1e-12);
  if (peakAt >= validation.length - 2) return 'rising';
  return peak - validation[validation.length - 1] >= tol - 1e-12 ? 'falls' : 'levels';
}

// ---- drawing the tree ---------------------------------------------------------------------------

const FULL = { x0: 0, x1: 10, y0: 0, y1: 10 };
const cut = (b, feature, t) => (feature === 0 ? [{ ...b, x1: t }, { ...b, x0: t }] : [{ ...b, y1: t }, { ...b, y0: t }]);

// The rectangles the leaves cover, each with its predicted label. Together they tile the plot square.
export function leafRegions(tree, bounds = FULL) {
  if (tree.leaf) return [{ ...bounds, label: tree.label, n: tree.n }];
  const [l, r] = cut(bounds, tree.feature, tree.threshold);
  return [...leafRegions(tree.left, l), ...leafRegions(tree.right, r)];
}

// The split lines, each only as long as its node's rectangle: { feature, threshold, depth, x0, x1, y0, y1 }.
export function splitSegments(tree, bounds = FULL) {
  if (tree.leaf) return [];
  const t = tree.threshold;
  const line = tree.feature === 0 ? { x0: t, x1: t, y0: bounds.y0, y1: bounds.y1 } : { x0: bounds.x0, x1: bounds.x1, y0: t, y1: t };
  const [l, r] = cut(bounds, tree.feature, t);
  return [{ feature: tree.feature, threshold: t, depth: tree.depth, ...line }, ...splitSegments(tree.left, l), ...splitSegments(tree.right, r)];
}
