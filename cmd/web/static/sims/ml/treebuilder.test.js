import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDataset, SHARED_SEED } from '../datasets.js';
import { parseCsv } from './tabular.js';
import {
  generatedRows, realRows, axisScale, toPlot, fromPlot, splitRows, toMatrix, classesOf, median, clampThreshold,
  firstSplitReport, bestFirstSplit, quantile, startThreshold, growTree, depthCurve, validationTrend, leafRegions, splitSegments,
  TOTAL_POINTS, TRAIN_POINTS, FLIP_SHARE, MAX_DEPTH,
} from './treebuilder.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

// Six points on a line; labels A A B A B B.
const P6 = [1, 2, 3, 4, 5, 6].map(v => [v, 5]);
const L6 = ['A', 'A', 'B', 'A', 'B', 'B'];

test('firstSplitReport matches the Gini numbers worked by hand', () => {
  const classes = classesOf(L6);
  assert.deepEqual(classes, ['A', 'B']);
  // Cut at 3.5: left A A B (Gini 1 - (4/9 + 1/9) = 4/9), right A B B (4/9); before 1/2; after 4/9; drop 1/2 - 4/9 = 1/18.
  const a = firstSplitReport(P6, L6, classes, 0, 3.5);
  assert.deepEqual(a.left.counts, [2, 1]);
  assert.deepEqual(a.right.counts, [1, 2]);
  close(a.before, 0.5);
  close(a.left.gini, 4 / 9);
  close(a.after, 4 / 9);
  close(a.drop, 1 / 18);
  // Cut at 2.5: left A A (pure, 0), right B A B B (1 - (1/16 + 9/16) = 3/8); after 4/6 * 3/8 = 1/4; drop 1/4.
  const b = firstSplitReport(P6, L6, classes, 0, 2.5);
  close(b.left.gini, 0);
  close(b.right.gini, 0.375);
  close(b.after, 0.25);
  close(b.drop, 0.25);
  // The other feature is constant here: every point goes to one side, nothing changes, the drop is 0.
  const c = firstSplitReport(P6, L6, classes, 1, 4);
  assert.equal(c.left.n, 0);
  close(c.drop, 0);
});

test('bestFirstSplit finds the largest drop, and the learner cannot beat it', () => {
  const best = bestFirstSplit(P6, L6);
  assert.equal(best.feature, 0);
  close(best.threshold, 2.5);
  close(best.gain, 0.25);
  const classes = classesOf(L6);
  for (const t of [1.5, 2.5, 3.5, 4.5, 5.5]) assert.ok(firstSplitReport(P6, L6, classes, 0, t).drop <= best.gain + 1e-12);
});

// Four clusters in a checker pattern: A at bottom-left and top-right, B at the other two corners.
const CHECKER = [[2, 2], [2, 3], [8, 8], [8, 7], [2, 8], [3, 8], [8, 2], [7, 2]];
const CHECKER_LABELS = ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B'];

test('a checker pattern: the first split at the middle teaches nothing, the second level solves it', () => {
  const data = { points: CHECKER, labels: CHECKER_LABELS };
  const rep = firstSplitReport(CHECKER, CHECKER_LABELS, ['A', 'B'], 0, 5);
  close(rep.drop, 0);
  const curve = depthCurve(data, data, { feature: 0, threshold: 5 }, { maxDepth: 3 });
  assert.equal(curve.length, 3);
  assert.equal(curve[0].leaves, 2);
  close(curve[0].train, 0.5);          // each side is a 2/2 tie and predicts the first class
  assert.equal(curve[1].leaves, 4);
  close(curve[1].train, 1);
  close(curve[1].validation, 1);
  assert.equal(curve[2].reached, 2);   // nothing left to split: the tree stops at depth 2
});

test('growTree keeps the learner\'s first split at the root and respects the depth and the leaf size', () => {
  const data = { points: P6, labels: L6 };
  const one = growTree(data, { feature: 0, threshold: 3.5 }, 1, 1);
  assert.equal(one.feature, 0);
  close(one.threshold, 3.5);
  assert.equal(one.forced, true);
  assert.equal(one.left.leaf && one.right.leaf, true);
  const big = growTree(data, { feature: 0, threshold: 3.5 }, 5, 2);   // children hold 3 points < 2 * 2: they stay leaves
  assert.equal(big.left.leaf && big.right.leaf, true);
});

test('validationTrend tells rising from levelling off from falling', () => {
  assert.equal(validationTrend([0.6, 0.7, 0.75, 0.8, 0.82, 0.84, 0.86, 0.88, 0.9, 0.92]), 'rising');
  assert.equal(validationTrend([0.6, 0.8, 0.88, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9]), 'levels');
  assert.equal(validationTrend([0.6, 0.8, 0.9, 0.88, 0.86, 0.84, 0.84, 0.84, 0.84, 0.84]), 'falls');
  // Exactly the tolerance counts as a fall, one step less does not.
  assert.equal(validationTrend([0.5, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.87]), 'falls');
  assert.equal(validationTrend([0.5, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.88]), 'levels');
  assert.equal(validationTrend([]), 'levels');
});

test('leafRegions tile the plot square and splitSegments stay inside their rectangle', () => {
  const data = { points: CHECKER, labels: CHECKER_LABELS };
  const tree = growTree(data, { feature: 0, threshold: 5 }, 3, 1);
  const regions = leafRegions(tree);
  assert.equal(regions.length, 4);
  close(regions.reduce((s, r) => s + (r.x1 - r.x0) * (r.y1 - r.y0), 0), 100);
  const segs = splitSegments(tree);
  assert.equal(segs.length, 3);
  const first = segs.find(s => s.depth === 0);
  assert.deepEqual([first.x0, first.x1, first.y0, first.y1], [5, 5, 0, 10]);
  for (const s of segs.filter(s => s.depth === 1)) {   // the second-level lines run along one half only
    assert.equal(s.feature, 1);
    assert.ok((s.x0 === 0 && s.x1 === 5) || (s.x0 === 5 && s.x1 === 10));
  }
});

test('generatedRows are seeded, inside the plot, and the blobs are the shared course dataset', () => {
  const a = generatedRows('blobs'), b = generatedRows('blobs'), c = generatedRows('blobs', SHARED_SEED + 1);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(a.length, TOTAL_POINTS);
  for (const p of a) assert.ok(p.x >= 0 && p.x <= 10 && p.y >= 0 && p.y <= 10);
  const shared = makeDataset('blobs', SHARED_SEED, 48);
  assert.deepEqual(a.slice(0, 48).map(p => [p.x, p.y, p.label]), shared.map(p => [p.x, p.y, p.label]));
});

test('the checker pattern flips about the stated share of labels and keeps its coordinates', () => {
  const clean = makeDataset('checker', SHARED_SEED, 300);
  const rows = generatedRows('checker', SHARED_SEED, 300);
  const flipped = rows.filter((p, i) => p.label !== clean[i].label).length;
  assert.ok(flipped > 0 && Math.abs(flipped / 300 - FLIP_SHARE) < 0.05, `flipped ${flipped} of 300`);
  assert.deepEqual(rows.map(p => [p.x, p.y]), clean.map(p => [p.x, p.y]));
});

test('realRows drops rows with a missing chosen measurement and says how many', () => {
  const table = parseCsv([
    'species,island,bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,sex,year',
    'Adelie,Torgersen,39.1,18.7,181,3750,male,2007',
    'Adelie,Torgersen,NA,NA,NA,NA,NA,2007',
    'Gentoo,Biscoe,46.1,13.2,211,4500,female,2007',
    'Gentoo,Biscoe,45,14,NA,4400,female,2007',
  ].join('\n'));
  const a = realRows(table, 'flipper_length_mm', 'bill_length_mm');
  assert.equal(a.total, 4);
  assert.equal(a.dropped, 2);
  assert.deepEqual(a.rows, [{ x: 181, y: 39.1, label: 'Adelie' }, { x: 211, y: 46.1, label: 'Gentoo' }]);
  // A different pair of columns leaves a different set out.
  assert.equal(realRows(table, 'bill_length_mm', 'body_mass_g').dropped, 1);
});

test('axisScale puts the data inside 0..10 with a margin, and fromPlot undoes toPlot', () => {
  const s = axisScale([170, 230]);
  close(s.lo, 167); close(s.hi, 233);
  close(toPlot(170, s), 3 / 66 * 10);
  close(fromPlot(toPlot(200, s), s), 200);
  const flat = axisScale([5, 5]);
  assert.ok(flat.lo < 5 && flat.hi > 5);
});

test('splitRows: the right sizes, no overlap, reproducible, new seed gives a new split', () => {
  const rows = Array.from({ length: 300 }, (_, i) => ({ x: i, y: 0, label: 'A' }));
  const s = splitRows(rows, 1);
  assert.equal(s.train.length, TRAIN_POINTS);
  assert.equal(s.validation.length, TOTAL_POINTS - TRAIN_POINTS);
  const ids = new Set([...s.train, ...s.validation].map(r => r.x));
  assert.equal(ids.size, TOTAL_POINTS);
  assert.deepEqual(splitRows(rows, 1), s);
  assert.notDeepEqual(splitRows(rows, 2), s);
  const small = splitRows(rows.slice(0, 10), 1);
  assert.equal(small.train.length + small.validation.length, 10);
  assert.ok(small.validation.length >= 1);
});

test('toMatrix maps rows onto the plot with each axis scale', () => {
  const m = toMatrix([{ x: 170, y: 40, label: 'A' }, { x: 230, y: 60, label: 'B' }], { lo: 170, hi: 230 }, { lo: 40, hi: 60 });
  assert.deepEqual(m.points, [[0, 0], [10, 10]]);
  assert.deepEqual(m.labels, ['A', 'B']);
});

test('median and clampThreshold', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([]), 0);
  const v = [2, 3, 7];
  assert.equal(clampThreshold(v, 0), 2);                 // not below the smallest value: the left side must keep a point
  assert.ok(clampThreshold(v, 9) < 7);                  // strictly below the largest: the right side must keep a point
  assert.equal(clampThreshold(v, 4.5), 4.5);
  assert.equal(clampThreshold([5, 5], 9), 5);
});

test('on the default blobs the best first split is clearly better than a bad one, and depth fits training more tightly', () => {
  const rows = generatedRows('blobs');
  const { train, validation } = splitRows(rows, SHARED_SEED);
  const tr = toMatrix(train), va = toMatrix(validation);
  const classes = classesOf(tr.labels);
  const best = bestFirstSplit(tr.points, tr.labels);
  const bad = firstSplitReport(tr.points, tr.labels, classes, 0, 0.3);
  assert.ok(best.gain > 0.05 && bad.drop < best.gain);
  const curve = depthCurve(tr, va, { feature: best.feature, threshold: best.threshold });
  assert.equal(curve.length, MAX_DEPTH);
  assert.ok(curve[MAX_DEPTH - 1].train >= curve[0].train);
  assert.ok(curve[MAX_DEPTH - 1].train > 0.9, 'a deep tree memorizes the overlapping blobs');
});

test('quantile interpolates by hand and startThreshold keeps both sides non-empty', () => {
  assert.equal(quantile([4, 1, 3, 2], 0), 1);
  assert.equal(quantile([4, 1, 3, 2], 1), 4);
  close(quantile([10, 20, 30, 40, 50], 0.3), 22);   // position 0.3 * 4 = 1.2: 20 + 0.2 * 10
  assert.equal(quantile([], 0.5), 0);
  assert.equal(quantile([7], 0.3), 7);
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const t = startThreshold(values);
  assert.ok(t > 3 && t < 4);                       // 0.3 * 9 = 2.7: between 3 and 4
  assert.equal(startThreshold([5, 5, 5]), 5);
});
