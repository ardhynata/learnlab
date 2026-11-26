import test from 'node:test';
import assert from 'node:assert/strict';
import { penguinPoints, zscoreSpace, clusteringInput, runKMeans, elbowCurve, matchLevel, compareWithClasses } from './kmeansreveal.js';
import { makeDataset, SHARED_SEED } from '../datasets.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

test('penguinPoints drops rows with a missing measurement and counts them', () => {
  const table = { rows: [
    { species: 'Adelie', bill_length_mm: 39.1, flipper_length_mm: 181 },
    { species: 'Adelie', bill_length_mm: null, flipper_length_mm: null },
    { species: 'Gentoo', bill_length_mm: 46.1, flipper_length_mm: null },
    { species: 'Gentoo', bill_length_mm: 50, flipper_length_mm: 220 },
  ] };
  const r = penguinPoints(table);
  assert.equal(r.total, 4);
  assert.equal(r.dropped, 2);
  assert.deepEqual(r.points, [{ x: 39.1, y: 181, label: 'Adelie' }, { x: 50, y: 220, label: 'Gentoo' }]);
});

test('zscoreSpace: [0,0] and [2,4] have mean [1,2] and sd [1,2]; invert undoes apply', () => {
  const s = zscoreSpace([[0, 0], [2, 4]]);
  assert.deepEqual(s.mean, [1, 2]);
  assert.deepEqual(s.sd, [1, 2]);
  assert.deepEqual(s.apply([0, 0]), [-1, -1]);
  assert.deepEqual(s.apply([2, 4]), [1, 1]);
  assert.deepEqual(s.invert([1, 1]), [2, 4]);
  assert.deepEqual(zscoreSpace([[3, 5], [3, 7]]).sd, [1, 1]);   // constant first column: sd 1, not 0
});

test('clusteringInput leaves the points alone unless asked to standardize', () => {
  const pts = [{ x: 0, y: 0 }, { x: 2, y: 4 }];
  assert.deepEqual(clusteringInput(pts).rows, [[0, 0], [2, 4]]);
  assert.deepEqual(clusteringInput(pts, { standardize: true }).rows, [[-1, -1], [1, 1]]);
  assert.deepEqual(clusteringInput(pts, { standardize: true }).toData([1, 1]), [2, 4]);
});

test('runKMeans finds two obvious groups and reports centroids in data units', () => {
  const pts = [{ x: 0, y: 0 }, { x: 0, y: 2 }, { x: 100, y: 0 }, { x: 100, y: 2 }];
  const run = runKMeans(pts, { k: 2, seed: 3 });
  const last = run.steps[run.steps.length - 1];
  assert.ok(run.converged);
  assert.equal(last.labels[0], last.labels[1]);
  assert.equal(last.labels[2], last.labels[3]);
  assert.notEqual(last.labels[0], last.labels[2]);
  const xs = last.centroids.map(c => c[0]).sort((a, b) => a - b);
  close(xs[0], 0); close(xs[1], 100);
  for (const c of last.centroids) close(c[1], 1);
  // Each point is 1 away from its centroid in y and 0 in x: inertia 4 (4 x 1).
  close(last.inertia, 4);
  close(run.inertia, 4);
});

test('runKMeans with standardize still reports centroids in data units', () => {
  // One cluster: its centroid is the mean of the points, [50, 1], however the features were scaled.
  const pts = [{ x: 0, y: 0 }, { x: 0, y: 2 }, { x: 100, y: 0 }, { x: 100, y: 2 }];
  const run = runKMeans(pts, { k: 1, standardize: true });
  const c = run.steps[run.steps.length - 1].centroids[0];
  close(c[0], 50); close(c[1], 1);
  // In z-scores every point is sqrt(2) from the centre: inertia 4 x 2 = 8.
  close(run.inertia, 8);
});

test('runKMeans keeps k within the number of points and is reproducible', () => {
  const pts = makeDataset('clusters', SHARED_SEED, 48).map(({ x, y, label }) => ({ x, y, label }));
  assert.equal(runKMeans(pts.slice(0, 3), { k: 8 }).k, 3);
  const a = runKMeans(pts, { k: 3, init: 'random', seed: 5 }), b = runKMeans(pts, { k: 3, init: 'random', seed: 5 });
  assert.deepEqual(a.steps, b.steps);
  assert.equal(a.steps[0].moved, 48);
});

test('elbowCurve gives k = 1..8 with falling inertia', () => {
  const pts = makeDataset('clusters', SHARED_SEED, 48);
  const curve = elbowCurve(pts, { seed: 1 });
  assert.deepEqual(curve.map(c => c.k), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(curve[0].inertia > curve[1].inertia && curve[1].inertia > curve[7].inertia);
});

test('matchLevel: 0.7 and up is good, under 0.3 is poor, NaN is none', () => {
  assert.equal(matchLevel(0.89), 'good');
  assert.equal(matchLevel(0.7), 'good');
  assert.equal(matchLevel(0.5), 'partly');
  assert.equal(matchLevel(0.3), 'partly');
  assert.equal(matchLevel(0.29), 'poor');
  assert.equal(matchLevel(-0.02), 'poor');
  assert.equal(matchLevel(NaN), 'none');
});

test('compareWithClasses, worked by hand: clusters [0,0,1,1] against classes [a,b,b,b]', () => {
  // rows: cluster 0 holds a and b, cluster 1 holds two b. Purity (1 + 2) / 4 = 0.75.
  // Pairs: index = C(2,2) = 1; row pairs 1 + 1 = 2; column pairs C(1,2) + C(3,2) = 3; all pairs C(4,2) = 6.
  // expected = 2 * 3 / 6 = 1; max = (2 + 3) / 2 = 2.5; ARI = (1 - 1) / (2.5 - 1) = 0.
  const r = compareWithClasses([0, 0, 1, 1], ['a', 'b', 'b', 'b']);
  assert.deepEqual(r.table.counts, [[1, 1], [0, 2]]);
  close(r.purity, 0.75);
  close(r.ari, 0);
  assert.equal(r.level, 'poor');
  const perfect = compareWithClasses([1, 1, 0, 0], ['a', 'a', 'b', 'b']);
  close(perfect.purity, 1); close(perfect.ari, 1); assert.equal(perfect.level, 'good');
});

test('the course dataset: rings cut across the classes, whatever the seed', () => {
  const pts = makeDataset('rings', SHARED_SEED, 48);
  for (const seed of [1, 2, 3]) {
    const run = runKMeans(pts, { k: 2, seed });
    const r = compareWithClasses(run.steps[run.steps.length - 1].labels, pts.map(p => p.label));
    assert.equal(r.level, 'poor');
  }
});
