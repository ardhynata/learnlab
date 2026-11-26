// k-NN on two features with one of them rescaled, scored on a fixed held-out set of test points.
// Pure functions for the k-NN lab (sims/knn.js); tested in knnscale.test.js.
//
// "Stretching" a feature multiplies it by a factor before distances are computed. The points keep their
// true units (so axes stay readable); only the distance used to pick neighbors changes.
import { makeDataset } from '../datasets.js';
import { rng, shuffle } from './rng.js';
import { splitIndices } from './tabular.js';

export const TEST_SEED = 97;     // the held-out draw: a seed of its own, never SHARED_SEED
export const TEST_COUNT = 40;    // generated test points
const TEST_OFFSET = 400;         // test points come from dataset indices no training set ever reaches (max 400)

// The distance multipliers for one stretched feature: scaleFor('x', 5) is { x: 5, y: 1 }.
export function scaleFor(axis, factor) {
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return axis === 'y' ? { x: 1, y: f } : { x: f, y: 1 };
}

// The k nearest labeled points to `query` after scaling, closest first (ties: lower index first).
// Keeps a short sorted list instead of sorting every point, so a decision-region grid stays cheap.
export function nearestScaled(points, query, k, metric = 'euclidean', scale = { x: 1, y: 1 }) {
  const m = Math.max(1, Math.min(Math.floor(k) || 1, points.length));
  const best = [];
  for (let i = 0; i < points.length; i++) {
    const dx = (points[i].x - query.x) * scale.x, dy = (points[i].y - query.y) * scale.y;
    const d = metric === 'manhattan' ? Math.abs(dx) + Math.abs(dy) : Math.sqrt(dx * dx + dy * dy);
    if (best.length === m && d >= best[m - 1].d) continue;   // equal distance: the earlier index stays ahead
    let j = best.length < m ? best.length : m - 1;
    if (best.length < m) best.push(null);
    while (j > 0 && best[j - 1].d > d) { best[j] = best[j - 1]; j--; }
    best[j] = { i, d };
  }
  return best;
}

// Majority vote of the neighbors; a tie goes to the class of the closest tied neighbor.
export function classifyScaled(points, query, k, metric = 'euclidean', scale = { x: 1, y: 1 }, classes) {
  const picked = nearestScaled(points, query, k, metric, scale);
  const votes = {};
  for (const c of classes ?? [...new Set(points.map(p => p.label))]) votes[c] = 0;
  for (const n of picked) votes[points[n.i].label] = (votes[points[n.i].label] ?? 0) + 1;
  const top = Math.max(...Object.values(votes));
  const tied = Object.values(votes).filter(v => v === top).length > 1;
  const lead = picked.find(n => votes[points[n.i].label] === top);   // the closest neighbor among the leading classes
  const label = lead ? points[lead.i].label : undefined;
  return { picked, votes, label, tied };
}

// How many test points the training points classify correctly. `wrong` lists the test indices that miss.
export function testAccuracy(train, tests, k, metric = 'euclidean', scale = { x: 1, y: 1 }) {
  const wrong = [];
  tests.forEach((t, i) => { if (classifyScaled(train, t, k, metric, scale).label !== t.label) wrong.push(i); });
  const total = tests.length;
  return { correct: total - wrong.length, total, wrong, fraction: total ? (total - wrong.length) / total : 0 };
}

// The class each cell of an n-by-n grid over the view would get (x-major: index i * n + j, i across, j up).
// `view` maps the 0..10 plot square to data units: { xLo, xHi, yLo, yHi }.
export function labelGrid(train, k, metric, scale, view, n = 64) {
  const classes = [...new Set(train.map(p => p.label))];
  const labels = new Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const q = { x: view.xLo + (i + .5) / n * (view.xHi - view.xLo), y: view.yLo + (j + .5) / n * (view.yHi - view.yLo) };
    labels[i * n + j] = classifyScaled(train, q, k, metric, scale, classes).label;
  }
  return labels;
}

// Is accuracy up, about the same, or down? "Same" is within 2% of the test set (at least one point).
export function accuracyVerdict(before, after) {
  const slack = Math.max(1, Math.round(0.02 * before.total));
  const diff = after.correct - before.correct;
  return Math.abs(diff) <= slack ? 'same' : diff > 0 ? 'up' : 'down';
}

// The generated held-out test points: same dataset shape, a separate seed, indices past any training set.
export function generatedTest(name, count = TEST_COUNT, seed = TEST_SEED) {
  return makeDataset(name, seed, TEST_OFFSET + count).slice(TEST_OFFSET);
}

// Flipper length (mm) against body mass (g, as the file has it), species as the class, from the parsed penguins table.
// A row missing either number (the dataset writes NA) is dropped; `dropped` says how many.
// A stratified 20% of the rows is held out as the test set, fixed by `testSeed`; the training rows come
// back in a seeded shuffle (`trainSeed`), so "the first n" is a reproducible draw that grows without reshuffling.
export function penguinSplit(table, trainSeed, testSeed = TEST_SEED) {
  const rows = [];
  for (const r of table.rows) {
    const f = r.flipper_length_mm, m = r.body_mass_g;
    if (typeof f === 'number' && typeof m === 'number' && Number.isFinite(f) && Number.isFinite(m) && typeof r.species === 'string') rows.push({ x: f, y: m, label: r.species });
  }
  const classes = [...new Set(rows.map(r => r.label))].sort();
  const parts = splitIndices(rows.length, { train: 0.8, validation: 0 }, testSeed, rows.map(r => r.label));
  const train = shuffle(parts.train.slice().sort((a, b) => a - b), rng(trainSeed)).map(i => rows[i]);
  const test = parts.test.slice().sort((a, b) => a - b).map(i => rows[i]);
  return { classes, train, test, total: table.rows.length, used: rows.length, dropped: table.rows.length - rows.length };
}
