import test from 'node:test';
import assert from 'node:assert/strict';
import {
  kmeans, assignLabels, inertiaByK, dbscan, kDistances, agglomerative, cutTree, cutTreeAtHeight,
  dendrogramLayout, silhouette, crosstab, purity, adjustedRand,
} from './clustermethods.js';
import { rng, gauss } from './rng.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

// Three tight blobs far apart, with their true labels.
function blobs(seed = 7, perBlob = 20) {
  const random = rng(seed);
  const centers = [[0, 0], [30, 0], [15, 26]];
  const points = [], truth = [];
  centers.forEach((c, label) => {
    for (let i = 0; i < perBlob; i++) { points.push([c[0] + gauss(random), c[1] + gauss(random)]); truth.push(label); }
  });
  return { points, truth };
}

// ---------------------------------------------------------------- k-means

test('kmeans on 6 points from given centroids matches a hand calculation', () => {
  const pts = [[0, 0], [0, 1], [1, 0], [10, 10], [10, 11], [11, 10]];
  const r = kmeans(pts, 2, { init: [[0, 0], [10, 10]] });
  assert.deepEqual(r.labels, [0, 0, 0, 1, 1, 1]);
  close(r.centroids[0][0], 1 / 3); close(r.centroids[0][1], 1 / 3);
  close(r.centroids[1][0], 31 / 3); close(r.centroids[1][1], 31 / 3);
  // Each cluster: 2/9 + 5/9 + 5/9 = 4/3, so 8/3 in all.
  close(r.inertia, 8 / 3);
  assert.equal(r.converged, true);
  assert.equal(r.iterations, 1);
  assert.equal(r.history.length, 2);
});

test('kmeans history records every step so a lab can animate it', () => {
  // On a line: 0 1 4 5 6 10, starting from 0 and 1.
  const pts = [0, 1, 4, 5, 6, 10].map(x => [x, 0]);
  const r = kmeans(pts, 2, { init: [[0, 0], [1, 0]] });
  assert.deepEqual(r.history.map(h => h.labels), [
    [0, 1, 1, 1, 1, 1],
    [0, 0, 1, 1, 1, 1],
    [0, 0, 1, 1, 1, 1],
  ]);
  assert.deepEqual(r.history.map(h => h.moved), [6, 1, 0]);
  assert.deepEqual(r.history[0].centroids, [[0, 0], [1, 0]]);
  close(r.history[1].centroids[0][0], 0); close(r.history[1].centroids[1][0], 5.2);
  close(r.history[2].centroids[0][0], 0.5); close(r.history[2].centroids[1][0], 6.25);
  // 0.25 + 0.25 for the left cluster; 5.0625 + 1.5625 + 0.0625 + 14.0625 = 20.75 for the right.
  close(r.inertia, 21.25);
  assert.equal(r.iterations, 2);
  // Inertia never goes up from one step to the next.
  for (let i = 1; i < r.history.length; i++) assert.ok(r.history[i].inertia <= r.history[i - 1].inertia + 1e-12);
});

test('kmeans is deterministic for a seed and uses no Math.random', () => {
  const { points } = blobs();
  const original = Math.random;
  Math.random = () => { throw new Error('Math.random called'); };
  try {
    for (const init of ['random', 'kmeans++']) {
      const a = kmeans(points, 3, { init, seed: 5 });
      const b = kmeans(points, 3, { init, seed: 5 });
      assert.deepEqual(a, b);
    }
  } finally { Math.random = original; }
});

test('kmeans++ with restarts recovers three well separated blobs exactly', () => {
  const { points, truth } = blobs();
  const r = kmeans(points, 3, { init: 'kmeans++', seed: 3, restarts: 3 });
  assert.equal(adjustedRand(r.labels, truth), 1);
  assert.equal(purity(r.labels, truth), 1);
  assert.equal(r.converged, true);
});

test('random init picks k distinct points of the data as starting centroids', () => {
  const { points } = blobs();
  const r = kmeans(points, 4, { init: 'random', seed: 11 });
  const start = r.history[0].centroids.map(c => c.join(','));
  assert.equal(new Set(start).size, 4);
  for (const key of start) assert.ok(points.some(p => p.join(',') === key));
});

test('kmeans accepts {x, y} points, keeps an emptied cluster in place, and validates k', () => {
  const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 5, y: 0 }];
  const r = kmeans(pts, 2, { init: [[0, 0], [100, 100]] });
  assert.deepEqual(r.labels, [0, 0, 0]);
  assert.deepEqual(r.centroids[1], [100, 100]);   // the empty cluster did not move
  assert.throws(() => kmeans(pts, 0), RangeError);
  assert.throws(() => kmeans(pts, 4), RangeError);
  assert.throws(() => kmeans(pts, 2, { init: [[0, 0]] }), RangeError);
});

test('kmeans++ copes with duplicate points', () => {
  const pts = [[1, 1], [1, 1], [1, 1], [5, 5]];
  const r = kmeans(pts, 3, { seed: 2 });
  assert.equal(r.centroids.length, 3);
  assert.equal(r.labels.length, 4);
});

test('assignLabels picks the nearest centroid, ties to the lowest index', () => {
  assert.deepEqual(assignLabels([[0, 0], [5, 0], [9, 0]], [[0, 0], [10, 0]]), [0, 0, 1]);
  assert.deepEqual(assignLabels([[5, 0]], [[0, 0], [10, 0]]), [0]);
});

test('inertiaByK is the elbow curve: k=1 is the total sum of squares, k=n is 0, the drop stops at k=3', () => {
  const { points } = blobs();
  const curve = inertiaByK(points, 6);
  assert.deepEqual(curve.map(c => c.k), [1, 2, 3, 4, 5, 6]);
  const mean = [0, 1].map(d => points.reduce((s, p) => s + p[d], 0) / points.length);
  const tss = points.reduce((s, p) => s + (p[0] - mean[0]) ** 2 + (p[1] - mean[1]) ** 2, 0);
  close(curve[0].inertia, tss, 1e-6);
  for (let i = 1; i < curve.length; i++) assert.ok(curve[i].inertia <= curve[i - 1].inertia * 1.0001);
  const drop23 = curve[1].inertia - curve[2].inertia;
  const drop34 = curve[2].inertia - curve[3].inertia;
  assert.ok(drop23 > 20 * drop34, `elbow at 3 expected: ${drop23} vs ${drop34}`);
  assert.equal(inertiaByK([[0, 0], [1, 1], [5, 5]], 10).at(-1).inertia, 0);
  assert.equal(inertiaByK([[0, 0], [1, 1], [5, 5]], 10).length, 3);
});

// ----------------------------------------------------------------- DBSCAN

test('dbscan finds two clusters and one noise point on a tiny set', () => {
  const pts = [[0, 0], [1, 0], [2, 0], [10, 0], [11, 0], [12, 0], [5, 5]];
  const r = dbscan(pts, { eps: 1.5, minPts: 3 });
  assert.deepEqual(r.labels, [0, 0, 0, 1, 1, 1, -1]);
  // Only the middle point of each row has 3 neighbours (itself and both sides) within 1.5.
  assert.deepEqual(r.core, [false, true, false, false, true, false, false]);
  assert.equal(r.clusters, 2);
  assert.equal(r.noise, 1);
});

test('dbscan counts a distance of exactly eps, counts the point itself, and chains density-reachable points', () => {
  const chain = [[0, 0], [1, 0], [2, 0], [3, 0]];
  const one = dbscan(chain, { eps: 1, minPts: 2 });
  assert.deepEqual(one.labels, [0, 0, 0, 0]);
  assert.deepEqual(one.core, [true, true, true, true]);
  // minPts 3: only the two middle points have 3 within eps; the ends are border points of the one cluster.
  const two = dbscan(chain, { eps: 1, minPts: 3 });
  assert.deepEqual(two.labels, [0, 0, 0, 0]);
  assert.deepEqual(two.core, [false, true, true, false]);
  // Too strict: everything is noise and there are no clusters.
  const none = dbscan(chain, { eps: 0.5, minPts: 2 });
  assert.deepEqual(none.labels, [-1, -1, -1, -1]);
  assert.equal(none.clusters, 0);
});

test('dbscan: a border point joins the first cluster that reaches it and does not bridge the two', () => {
  // Left group 0..0.9 and right group 2.5..3.4 are each dense; x = 1.7 is within eps of one point of each side
  // but has only 3 neighbours (itself included), so with minPts 4 it is a border point, not a core.
  const x = [0, 0.3, 0.6, 0.9, 1.7, 2.5, 2.8, 3.1, 3.4];
  const r = dbscan(x.map(v => [v, 0]), { eps: 1, minPts: 4 });
  assert.equal(r.core[4], false);
  assert.deepEqual(r.labels, [0, 0, 0, 0, 0, 1, 1, 1, 1]);   // the left cluster is found first and claims it
  assert.equal(r.clusters, 2);
});

test('dbscan separates two rings that k-means cannot', () => {
  const pts = [], truth = [];
  for (let i = 0; i < 40; i++) { const a = (2 * Math.PI * i) / 40; pts.push([Math.cos(a), Math.sin(a)]); truth.push(0); }
  for (let i = 0; i < 80; i++) { const a = (2 * Math.PI * i) / 80; pts.push([5 * Math.cos(a), 5 * Math.sin(a)]); truth.push(1); }
  const d = dbscan(pts, { eps: 0.9, minPts: 3 });
  assert.equal(d.clusters, 2);
  assert.equal(adjustedRand(d.labels, truth), 1);
  const k = kmeans(pts, 2, { seed: 1, restarts: 5 });
  assert.ok(adjustedRand(k.labels, truth) < 0.5);
});

test('dbscan validates eps and kDistances sorts the k-th neighbour distances', () => {
  assert.throws(() => dbscan([[0, 0]], { eps: 0 }), RangeError);
  assert.throws(() => dbscan([[0, 0]], { eps: 1, metric: 'nope' }), RangeError);
  // x = 0 1 3 7: the nearest other points are 1, 1, 2, 4.
  assert.deepEqual(kDistances([0, 1, 3, 7].map(x => [x, 0]), 1), [4, 2, 1, 1]);
  // Second nearest: 3, 2, 3, 6 for 0, 1, 3, 7.
  assert.deepEqual(kDistances([0, 1, 3, 7].map(x => [x, 0]), 2), [6, 3, 3, 2]);
});

// ---------------------------------------------------------- agglomerative

// Five points on a line at x = 0, 1, 3, 7, 12 (distances: d01=1 d12=2 d02=3 d23=4 d34=5 d13=6 d03=7 d24=9 d14=11 d04=12).
const line5 = [0, 1, 3, 7, 12].map(x => [x, 0]);
const brief = merges => merges.map(m => [m.a, m.b, m.height]);

test('single linkage merge order for 5 points', () => {
  const m = agglomerative(line5, { linkage: 'single' });
  assert.deepEqual(brief(m), [[0, 1, 1], [2, 5, 2], [3, 6, 4], [4, 7, 5]]);
  assert.deepEqual(m.map(x => x.id), [5, 6, 7, 8]);
  assert.deepEqual(m.map(x => x.size), [2, 3, 4, 5]);
});

test('complete linkage merge order for 5 points', () => {
  const m = agglomerative(line5, { linkage: 'complete' });
  assert.deepEqual(brief(m), [[0, 1, 1], [2, 5, 3], [3, 4, 5], [6, 7, 12]]);
});

test('average linkage merge order for 5 points', () => {
  const m = agglomerative(line5, { linkage: 'average' });
  assert.deepEqual(m.slice(0, 3).map(x => [x.a, x.b]), [[0, 1], [2, 5], [3, 4]]);
  close(m[0].height, 1); close(m[1].height, 2.5); close(m[2].height, 5);
  close(m[3].height, (7 + 12 + 6 + 11 + 4 + 9) / 6);  // the six cross-pair distances
  assert.deepEqual([m[3].a, m[3].b], [6, 7]);
});

test('ward linkage merge order for 5 points, with SciPy-style heights', () => {
  const m = agglomerative(line5, { linkage: 'ward' });
  assert.deepEqual(m.map(x => [x.a, x.b]), [[0, 1], [2, 5], [3, 4], [6, 7]]);
  close(m[0].height, 1);
  close(m[1].height, Math.sqrt(4 / 3) * 2.5);                 // {0,1} (centre 0.5) joins x=3
  close(m[2].height, 5);
  close(m[3].height, Math.sqrt(2.4) * (9.5 - 4 / 3));         // 2*3*2/5 times the centre gap
  for (let i = 1; i < m.length; i++) assert.ok(m[i].height >= m[i - 1].height);
});

test('ward needs the euclidean metric and unknown linkages are refused', () => {
  assert.throws(() => agglomerative(line5, { linkage: 'ward', metric: 'manhattan' }), RangeError);
  assert.throws(() => agglomerative(line5, { linkage: 'median' }), RangeError);
  assert.deepEqual(agglomerative([[1, 1]]), []);
});

test('heights are monotone and ties resolve to the lowest ids', () => {
  const square = [[0, 0], [1, 0], [0, 1], [1, 1]];
  for (const linkage of ['single', 'complete', 'average', 'ward']) {
    const m = agglomerative(square, { linkage });
    assert.deepEqual([m[0].a, m[0].b], [0, 1]);
    for (let i = 1; i < m.length; i++) assert.ok(m[i].height >= m[i - 1].height - 1e-12, linkage);
  }
});

test('cutTree replays the first n-k merges and numbers clusters by first appearance', () => {
  const single = agglomerative(line5, { linkage: 'single' });
  assert.deepEqual(cutTree(single, 5, 2), [0, 0, 0, 0, 1]);
  assert.deepEqual(cutTree(single, 5, 3), [0, 0, 0, 1, 2]);
  assert.deepEqual(cutTree(single, 5, 5), [0, 1, 2, 3, 4]);
  assert.deepEqual(cutTree(single, 5, 1), [0, 0, 0, 0, 0]);
  const complete = agglomerative(line5, { linkage: 'complete' });
  assert.deepEqual(cutTree(complete, 5, 2), [0, 0, 0, 1, 1]);
  assert.throws(() => cutTree(complete, 5, 0), RangeError);
  assert.throws(() => cutTree(complete, 5, 6), RangeError);
});

test('cutTreeAtHeight applies the merges at or below the height', () => {
  const complete = agglomerative(line5, { linkage: 'complete' });
  assert.deepEqual(cutTreeAtHeight(complete, 5, 0.5), [0, 1, 2, 3, 4]);
  assert.deepEqual(cutTreeAtHeight(complete, 5, 3), [0, 0, 0, 1, 2]);
  assert.deepEqual(cutTreeAtHeight(complete, 5, 5), [0, 0, 0, 1, 1]);
  assert.deepEqual(cutTreeAtHeight(complete, 5, 100), [0, 0, 0, 0, 0]);
});

test('single linkage chains through a bridge that complete linkage refuses', () => {
  const bridge = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(x => [x, 0]).concat([[30, 0], [31, 0]]);
  const s = cutTree(agglomerative(bridge, { linkage: 'single' }), bridge.length, 2);
  assert.deepEqual(s.slice(0, 11), new Array(11).fill(0));
  assert.deepEqual(s.slice(11), [1, 1]);
});

test('dendrogramLayout gives a crossing-free leaf order and U-shaped links', () => {
  const complete = agglomerative(line5, { linkage: 'complete' });
  const layout = dendrogramLayout(complete, 5);
  assert.deepEqual(layout.order, [0, 1, 2, 3, 4]);
  assert.deepEqual(layout.x.slice(0, 5), [0, 1, 2, 3, 4]);
  // Merge 5 = {0,1}: sits midway at x = 0.5, height 1. Merge 6 = {2, 5}: x = (2 + 0.5) / 2.
  const [l5, l6, l7, l8] = layout.links;
  assert.deepEqual([l5.left, l5.right, l5.x, l5.height, l5.yLeft, l5.yRight], [0, 1, 0.5, 1, 0, 0]);
  assert.deepEqual([l6.left, l6.right], [5, 2]);               // the child holding leaf 0 goes left
  close(l6.x, 1.25); assert.equal(l6.yLeft, 1); assert.equal(l6.yRight, 0); assert.equal(l6.xLeft, 0.5);
  assert.deepEqual([l7.left, l7.right, l7.x], [3, 4, 3.5]);
  assert.deepEqual([l8.left, l8.right], [6, 7]);
  close(l8.x, (1.25 + 3.5) / 2);
  assert.equal(layout.height[8], 12);
  assert.deepEqual(dendrogramLayout([], 1).order, [0]);
});

test('dendrogramLayout order is a permutation, with every cluster contiguous', () => {
  const { points } = blobs(2, 8);
  const merges = agglomerative(points, { linkage: 'average' });
  const { order } = dendrogramLayout(merges, points.length);
  assert.deepEqual([...order].sort((a, b) => a - b), points.map((_, i) => i));
  const labels = cutTree(merges, points.length, 3);
  const runs = order.filter((leaf, i) => i === 0 || labels[leaf] !== labels[order[i - 1]]).length;
  assert.equal(runs, 3);
});

// ------------------------------------------------------------- silhouette

test('silhouette of a 6-point example matches a hand calculation', () => {
  // x = 0 1 2 | 10 11 12.
  const pts = [0, 1, 2, 10, 11, 12].map(x => [x, 0]);
  const r = silhouette(pts, [0, 0, 0, 1, 1, 1]);
  // x=0: a = (1+2)/2 = 1.5, b = (10+11+12)/3 = 11.  x=1: a = 1, b = 10.  x=2: a = 1.5, b = 9.
  const expected = [9.5 / 11, 9 / 10, 7.5 / 9, 7.5 / 9, 9 / 10, 9.5 / 11];
  expected.forEach((v, i) => close(r.values[i], v));
  close(r.mean, expected.reduce((s, v) => s + v, 0) / 6);
  assert.equal(r.defined, true);
  assert.deepEqual(r.byCluster.map(c => [c.label, c.size]), [[0, 3], [1, 3]]);
  close(r.byCluster[0].mean, (9.5 / 11 + 0.9 + 7.5 / 9) / 3);
});

test('a point in the wrong cluster gets a negative silhouette', () => {
  const pts = [0, 1, 2, 10, 11, 12].map(x => [x, 0]);
  const r = silhouette(pts, [0, 0, 1, 1, 1, 1]);   // x=2 put with the far group
  assert.ok(r.values[2] < 0);
  // x=2: a = (8+9+10)/3 = 9, b = (2+1)/2 = 1.5, so (1.5 - 9)/9.
  close(r.values[2], (1.5 - 9) / 9);
});

test('silhouette: one cluster is undefined (NaN), a singleton scores 0, noise follows the chosen mode', () => {
  const pts = [0, 1, 2, 10, 11, 12].map(x => [x, 0]);
  const one = silhouette(pts, [0, 0, 0, 0, 0, 0]);
  assert.equal(one.defined, false);
  assert.ok(Number.isNaN(one.mean));
  assert.ok(one.values.every(Number.isNaN));
  const single = silhouette(pts, [0, 0, 0, 0, 0, 1]);
  assert.equal(single.values[5], 0);

  // Two noise points (-1) beside two clusters.
  const withNoise = [[0, 0], [1, 0], [2, 0], [10, 0], [11, 0], [12, 0], [50, 0], [-40, 0]];
  const labels = [0, 0, 0, 1, 1, 1, -1, -1];
  const ex = silhouette(withNoise, labels);                  // default: exclude
  assert.ok(Number.isNaN(ex.values[6]) && Number.isNaN(ex.values[7]));
  const plain = silhouette(withNoise.slice(0, 6), labels.slice(0, 6));
  close(ex.mean, plain.mean);                                // noise changes nothing when excluded
  const zero = silhouette(withNoise, labels, { noise: 'zero' });
  assert.equal(zero.values[6], 0);
  close(zero.mean, (plain.mean * 6) / 8);
  const asCluster = silhouette(withNoise, labels, { noise: 'cluster' });
  assert.ok(!Number.isNaN(asCluster.values[6]));
  assert.equal(asCluster.byCluster.length, 3);
  assert.deepEqual(asCluster.byCluster[0].label, -1);
  // Only noise plus one cluster is "one cluster" once noise is excluded.
  assert.equal(silhouette(withNoise.slice(0, 3).concat([[50, 0]]), [0, 0, 0, -1]).defined, false);
  assert.throws(() => silhouette(pts, [0, 0, 0, 1, 1, 1], { noise: 'x' }), RangeError);
});

test('silhouette picks k = 3 on three blobs and accepts a metric', () => {
  const { points } = blobs();
  const scores = [2, 3, 4, 5].map(k => silhouette(points, kmeans(points, k, { seed: 1, restarts: 5 }).labels).mean);
  assert.equal(scores.indexOf(Math.max(...scores)), 1);
  const manhattan = silhouette([[0, 0], [1, 1], [10, 10], [11, 11]], [0, 0, 1, 1], { metric: 'manhattan' });
  // x=(0,0): a = 2, b = (20+22)/2 = 21.
  close(manhattan.values[0], (21 - 2) / 21);
});

// ------------------------------------------------- crosstab, purity, ARI

test('crosstab counts cluster-by-class cells and sorts the labels', () => {
  const t = crosstab([1, 1, 0, 0, 0, -1], ['b', 'b', 'a', 'b', 'a', 'c']);
  assert.deepEqual(t.rows, [-1, 0, 1]);
  assert.deepEqual(t.cols, ['a', 'b', 'c']);
  assert.deepEqual(t.counts, [[0, 0, 1], [2, 1, 0], [0, 2, 0]]);
  assert.deepEqual(t.rowTotals, [1, 3, 2]);
  assert.deepEqual(t.colTotals, [2, 3, 1]);
  assert.equal(t.n, 6);
  assert.throws(() => crosstab([0], [0, 1]), RangeError);
});

test('purity is the share of points in their cluster\'s majority class', () => {
  // Cluster 0 holds a,a,b (2 of 3); cluster 1 holds b,b (2 of 2): 4 / 5.
  close(purity([0, 0, 0, 1, 1], ['a', 'a', 'b', 'b', 'b']), 4 / 5);
  assert.equal(purity([0, 1, 2], ['a', 'b', 'a']), 1);          // singletons are always pure
  // Noise as a cluster vs dropped.
  const c = [0, 0, -1, -1], t = ['a', 'a', 'a', 'b'];
  close(purity(c, t), 3 / 4);
  close(purity(c, t, { noise: 'exclude' }), 1);
});

test('adjusted Rand of two partitions matches hand calculations', () => {
  // [0,0,0,1,1,1] vs [0,0,1,1,2,2]: pairs 2, rows 6, cols 3, of 15 -> (2 - 1.2) / (4.5 - 1.2) = 8/33.
  close(adjustedRand([0, 0, 0, 1, 1, 1], [0, 0, 1, 1, 2, 2]), 8 / 33);
  // [0,0,1,2] vs [0,0,1,1]: 4/7 (the scikit-learn documentation value 0.5714).
  close(adjustedRand([0, 0, 1, 2], [0, 0, 1, 1]), 4 / 7);
  // Identical up to renaming scores 1; symmetric.
  assert.equal(adjustedRand([0, 0, 1, 1, 2], ['x', 'x', 'q', 'q', 'z']), 1);
  close(adjustedRand([0, 0, 0, 1, 1, 1], [0, 0, 1, 1, 2, 2]), adjustedRand([0, 0, 1, 1, 2, 2], [0, 0, 0, 1, 1, 1]));
  // A split that cuts every true pair is below zero.
  assert.ok(adjustedRand([0, 0, 1, 1], [0, 1, 0, 1]) < 0);
  // Trivial partitions and tiny inputs.
  assert.equal(adjustedRand([0, 0, 0], [5, 5, 5]), 1);
  assert.equal(adjustedRand([0, 1, 2], [7, 8, 9]), 1);
  assert.ok(Number.isNaN(adjustedRand([0], [0])));
  // Noise handling.
  close(adjustedRand([0, 0, 1, 1, -1], [0, 0, 1, 1, 1], { noise: 'exclude' }), 1);
  assert.ok(adjustedRand([0, 0, 1, 1, -1], [0, 0, 1, 1, 1]) < 1);
});
