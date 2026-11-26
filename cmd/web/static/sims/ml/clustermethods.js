// Clustering methods for numeric points, pure and deterministic.
//
// API
// ---
// Points are arrays of numbers ([x, y] or any length) or {x, y} objects. Every
// returned point-like value (centroids) is a plain array. Labels are arrays of
// integers with one entry per input point, in input order. No Math.random:
// all randomness comes from rng.js seeded by `seed` (default 1).
//
//   kmeans(points, k, { init = "kmeans++", seed = 1, maxIter = 100, restarts = 1 })
//     -> { labels, centroids, inertia, iterations, converged, history, k }
//     init: "random" (k distinct points picked at random), "kmeans++"
//       (D-squared weighting), or an explicit array of k starting centroids.
//     Euclidean only: the mean is the centroid, so inertia is the sum of
//       squared distances from each point to its centroid.
//     history: one entry per assignment step, so a lab can animate it:
//       { iteration, centroids, labels, inertia, moved }. Entry 0 assigns the
//       points to the starting centroids; entry i>0 first moves each centroid
//       to the mean of its points, then reassigns. `moved` counts points whose
//       label changed since the previous entry (all n for entry 0). The loop
//       stops when nothing moves (converged) or after maxIter updates.
//       `iterations` is the number of centroid updates (history.length - 1).
//     Ties go to the lowest centroid index. A cluster that loses all its
//       points keeps its previous centroid (it can win points back).
//     restarts > 1 runs that many starts from one seeded stream and keeps the
//       lowest inertia (the history returned is that run's).
//     Throws RangeError unless 1 <= k <= number of points.
//
//   assignLabels(points, centroids) -> labels         (nearest centroid, ties: lowest)
//
//   inertiaByK(points, kmax, opts) -> [{ k, inertia }] for k = 1..min(kmax, n)
//     The elbow curve. opts go to kmeans; defaults init "kmeans++" and
//     restarts 5 so the curve is smooth and (nearly) non-increasing.
//
//   dbscan(points, { eps, minPts = 4, metric = "euclidean" })
//     -> { labels, core, clusters, noise }
//     labels: cluster ids 0.. in order of discovery, -1 for noise.
//     core[i]: true when point i has at least minPts points within eps,
//       itself included (the scikit-learn convention); distance <= eps counts.
//     clusters: number of clusters; noise: number of noise points.
//     A border point (within eps of a core point but not core) joins the first
//       cluster that reaches it; it never starts or extends a cluster.
//
//   kDistances(points, k, metric = "euclidean") -> distance to the k-th
//     nearest other point, sorted from largest to smallest (the k-distance
//     plot used to pick eps; use k = minPts - 1).
//
//   agglomerative(points, { linkage = "average", metric = "euclidean" })
//     -> merges: [{ id, a, b, height, size }], n - 1 of them
//     Leaves are ids 0..n-1; merge i creates cluster id n + i out of the two
//       existing ids a < b (the same convention as SciPy's linkage matrix).
//     linkage: "single" (nearest pair), "complete" (farthest pair),
//       "average" (mean of all pairs, UPGMA) or "ward" (smallest increase in
//       within-cluster variance; Euclidean only). The height of a ward merge
//       is sqrt(2 * nA * nB / (nA + nB)) * |centroidA - centroidB|, so two
//       single points merge at their plain distance (SciPy's convention).
//     The closest pair wins; ties go to the lowest (a, b) ids, so the order is
//       deterministic. Heights never decrease for these four linkages.
//     Cost is O(n^3) time and O(n^2) memory: fine up to a few hundred points.
//
//   cutTree(merges, n, k) -> labels for exactly k clusters (1 <= k <= n)
//     Replays the first n - k merges. Labels are numbered 0.. in the order the
//       clusters first appear when the points are read in input order.
//   cutTreeAtHeight(merges, n, height) -> labels
//     Applies every merge whose height is <= height.
//
//   dendrogramLayout(merges, n)
//     -> { order, x, height, links }
//     order: the leaf order that draws the tree without crossings (of two
//       children, the one holding the lower-numbered leaf goes left).
//     x[id], height[id]: horizontal position (leaves 0..n-1 in order, a merge
//       sits midway over its children) and height of every node id (leaves 0).
//     links: one per merge, ready to draw as a "U":
//       { id, left, right, height, x, xLeft, xRight, yLeft, yRight }.
//
//   silhouette(points, labels, { noise = "exclude", metric = "euclidean" })
//     -> { values, mean, defined, byCluster }
//     values[i] = (b - a) / max(a, b): a = mean distance to the other points
//       of its own cluster, b = the smallest mean distance to another cluster.
//       Range -1..1; high = well matched, near 0 = on a border, negative =
//       probably in the wrong cluster. A point alone in its cluster gets 0
//       (Rousseeuw's convention), and so does a == b == 0.
//     Noise (label -1): noise "exclude" (default) leaves those points out of
//       everything, their value is NaN and they are not in the mean; "cluster"
//       treats all noise as one more cluster; "zero" keeps them in the mean
//       with value 0 (a penalty for every discarded point).
//     With fewer than 2 clusters (after noise handling) the score is undefined:
//       every value and the mean are NaN and defined is false. It is not 0.
//     byCluster: [{ label, size, mean }] sorted by label, for a silhouette plot.
//
//   crosstab(clusterLabels, trueLabels)
//     -> { rows, cols, counts, rowTotals, colTotals, n }
//     rows are the distinct cluster labels, cols the distinct true labels (both
//       sorted: numbers ascending, then strings), counts[r][c] the number of
//       points in that cell. Noise (-1) is an ordinary row here.
//   purity(clusterLabels, trueLabels, { noise = "cluster" }) -> 0..1
//     Share of points that sit in the majority true class of their cluster.
//       More clusters can only raise it (n singletons score 1), so read it
//       beside the cluster count.
//   adjustedRand(a, b, { noise = "cluster" }) -> -1..1
//     Pair-counting agreement of two partitions, corrected for chance: 1 =
//       identical up to renaming, about 0 = random, negative = worse than
//       random. Two trivial partitions (both one block, or both all
//       singletons) score 1; fewer than 2 points gives NaN.
//     For purity and adjustedRand, noise "cluster" keeps label -1 as one
//       cluster, "exclude" drops the points whose cluster label is -1 first.
//
// The legacy labs keep their own engines (kmeans-engine.js, dbscan-engine.js);
// this module is the tested, headless version the new labs and the capstone use.

import { rng, shuffle } from './rng.js';
import { squaredEuclidean, metrics } from './distance.js';

const vec = p => (Array.isArray(p) ? p : [p.x, p.y]);
const toVecs = points => points.map(p => vec(p).slice());

function metricFn(metric) {
  if (typeof metric === 'function') return metric;
  const fn = metrics[metric];
  if (!fn) throw new RangeError(`unknown metric "${metric}"`);
  return fn;
}

function centroidOf(vecs, indices, dim) {
  const c = new Array(dim).fill(0);
  for (const i of indices) for (let d = 0; d < dim; d++) c[d] += vecs[i][d];
  return c.map(v => v / indices.length);
}

function nearest(point, centroids) {
  let best = 0, bestD = Infinity;
  for (let c = 0; c < centroids.length; c++) {
    const d = squaredEuclidean(point, centroids[c]);
    if (d < bestD) { best = c; bestD = d; }
  }
  return best;
}

/** Index of the nearest centroid for every point (ties: the lowest index). */
export function assignLabels(points, centroids) {
  const vecs = toVecs(points);
  return vecs.map(p => nearest(p, centroids));
}

function sumSquares(vecs, labels, centroids) {
  let total = 0;
  for (let i = 0; i < vecs.length; i++) total += squaredEuclidean(vecs[i], centroids[labels[i]]);
  return total;
}

function initialCentroids(vecs, k, init, random) {
  if (Array.isArray(init)) {
    if (init.length !== k) throw new RangeError(`init has ${init.length} centroids, expected k = ${k}`);
    return init.map(c => vec(c).slice());
  }
  const n = vecs.length;
  if (init === 'random') {
    return shuffle(Array.from({ length: n }, (_, i) => i), random).slice(0, k).map(i => vecs[i].slice());
  }
  if (init !== 'kmeans++') throw new RangeError(`unknown init "${init}"`);
  const chosen = [Math.floor(random() * n)];
  const nearestSq = vecs.map(p => squaredEuclidean(p, vecs[chosen[0]]));
  while (chosen.length < k) {
    const total = nearestSq.reduce((s, d) => s + d, 0);
    let pick = -1;
    if (total > 0) {
      const target = random() * total;
      let run = 0;
      for (let i = 0; i < n; i++) {
        if (nearestSq[i] <= 0) continue;
        run += nearestSq[i];
        pick = i;
        if (run > target) break;
      }
    } else {
      // Every remaining point sits on a chosen centroid: take the first unused index.
      pick = vecs.findIndex((_, i) => !chosen.includes(i));
    }
    chosen.push(pick);
    for (let i = 0; i < n; i++) nearestSq[i] = Math.min(nearestSq[i], squaredEuclidean(vecs[i], vecs[pick]));
  }
  return chosen.map(i => vecs[i].slice());
}

function lloyd(vecs, centroids0, maxIter) {
  const dim = vecs[0].length;
  const k = centroids0.length;
  let centroids = centroids0;
  let labels = vecs.map(p => nearest(p, centroids));
  const history = [{ iteration: 0, centroids: centroids.map(c => c.slice()), labels: labels.slice(), inertia: sumSquares(vecs, labels, centroids), moved: vecs.length }];
  let converged = false;
  for (let iteration = 1; iteration <= maxIter; iteration++) {
    centroids = centroids.map((old, c) => {
      const members = [];
      for (let i = 0; i < labels.length; i++) if (labels[i] === c) members.push(i);
      return members.length ? centroidOf(vecs, members, dim) : old.slice();
    });
    const next = vecs.map(p => nearest(p, centroids));
    const moved = next.reduce((s, l, i) => s + (l !== labels[i] ? 1 : 0), 0);
    labels = next;
    history.push({ iteration, centroids: centroids.map(c => c.slice()), labels: labels.slice(), inertia: sumSquares(vecs, labels, centroids), moved });
    if (moved === 0) { converged = true; break; }
  }
  const last = history[history.length - 1];
  return { labels: last.labels.slice(), centroids: last.centroids.map(c => c.slice()), inertia: last.inertia, iterations: history.length - 1, converged, history, k };
}

/** Lloyd's k-means with random, k-means++ or explicit initial centroids; see the API block above. */
export function kmeans(points, k, { init = 'kmeans++', seed = 1, maxIter = 100, restarts = 1 } = {}) {
  const vecs = toVecs(points);
  if (!Number.isInteger(k) || k < 1 || k > vecs.length) throw new RangeError(`k must be an integer from 1 to ${vecs.length}`);
  const random = rng(seed);
  const runs = Array.isArray(init) ? 1 : Math.max(1, restarts | 0);
  let best = null;
  for (let r = 0; r < runs; r++) {
    const run = lloyd(vecs, initialCentroids(vecs, k, init, random), maxIter);
    if (!best || run.inertia < best.inertia) best = run;
  }
  return best;
}

/** Inertia for k = 1..kmax (the elbow curve). */
export function inertiaByK(points, kmax, opts = {}) {
  const n = points.length;
  const top = Math.min(kmax, n);
  const out = [];
  for (let k = 1; k <= top; k++) out.push({ k, inertia: kmeans(points, k, { init: 'kmeans++', restarts: 5, ...opts }).inertia });
  return out;
}

const EPS_SLACK = 1e-12;

/** Density-based clustering; see the API block above. */
export function dbscan(points, { eps, minPts = 4, metric = 'euclidean' } = {}) {
  if (!(eps > 0)) throw new RangeError('eps must be a positive number');
  const vecs = toVecs(points);
  const dist = metricFn(metric);
  const n = vecs.length;
  const neighbors = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    neighbors[i].push(i);
    for (let j = i + 1; j < n; j++) {
      if (dist(vecs[i], vecs[j]) <= eps + EPS_SLACK) { neighbors[i].push(j); neighbors[j].push(i); }
    }
  }
  for (const list of neighbors) list.sort((a, b) => a - b);
  const core = neighbors.map(list => list.length >= minPts);
  const labels = new Array(n).fill(-1);
  let clusters = 0;
  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1 || !core[i]) continue;
    labels[i] = clusters;
    const queue = [i];
    while (queue.length) {
      const p = queue.shift();
      if (!core[p]) continue; // a border point joins the cluster but does not extend it
      for (const q of neighbors[p]) {
        if (labels[q] !== -1) continue;
        labels[q] = clusters;
        queue.push(q);
      }
    }
    clusters++;
  }
  return { labels, core, clusters, noise: labels.filter(l => l === -1).length };
}

/** Distance to the k-th nearest other point, largest first (the k-distance plot). */
export function kDistances(points, k, metric = 'euclidean') {
  const vecs = toVecs(points);
  const dist = metricFn(metric);
  const out = vecs.map((p, i) => {
    const ds = [];
    for (let j = 0; j < vecs.length; j++) if (j !== i) ds.push(dist(p, vecs[j]));
    ds.sort((a, b) => a - b);
    return ds.length ? ds[Math.min(k, ds.length) - 1] : NaN;
  });
  return out.sort((a, b) => b - a);
}

const LINKAGES = ['single', 'complete', 'average', 'ward'];

/** Hierarchical (agglomerative) clustering; returns the merge history. */
export function agglomerative(points, { linkage = 'average', metric = 'euclidean' } = {}) {
  if (!LINKAGES.includes(linkage)) throw new RangeError(`unknown linkage "${linkage}"`);
  if (linkage === 'ward' && metric !== 'euclidean') throw new RangeError('ward linkage needs the euclidean metric');
  const vecs = toVecs(points);
  const dist = metricFn(metric);
  const n = vecs.length;
  const ward = linkage === 'ward';
  // Cluster-to-cluster distance, indexed by cluster id (leaf ids 0..n-1, merges n..2n-2).
  // Ward keeps SQUARED distances (Lance-Williams update) and takes the root when it records a height.
  const total = Math.max(0, 2 * n - 1);
  const D = Array.from({ length: total }, () => new Float64Array(total));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = dist(vecs[i], vecs[j]);
      D[i][j] = D[j][i] = ward ? d * d : d;
    }
  }
  const size = new Array(total).fill(1);
  const active = Array.from({ length: n }, (_, i) => i);
  const merges = [];
  for (let step = 0; step < n - 1; step++) {
    let bi = -1, bj = -1, best = Infinity;
    for (let x = 0; x < active.length; x++) {
      for (let y = x + 1; y < active.length; y++) {
        const d = D[active[x]][active[y]];
        if (d < best) { best = d; bi = x; bj = y; }
      }
    }
    const a = active[bi], b = active[bj];
    const id = n + step;
    size[id] = size[a] + size[b];
    for (const k of active) {
      if (k === a || k === b) continue;
      let d;
      if (linkage === 'single') d = Math.min(D[k][a], D[k][b]);
      else if (linkage === 'complete') d = Math.max(D[k][a], D[k][b]);
      else if (linkage === 'average') d = (size[a] * D[k][a] + size[b] * D[k][b]) / (size[a] + size[b]);
      else d = ((size[a] + size[k]) * D[k][a] + (size[b] + size[k]) * D[k][b] - size[k] * D[a][b]) / (size[a] + size[b] + size[k]);
      D[k][id] = D[id][k] = d;
    }
    merges.push({ id, a, b, height: ward ? Math.sqrt(Math.max(0, best)) : best, size: size[id] });
    active.splice(bj, 1);
    active.splice(bi, 1);
    active.push(id);
  }
  return merges;
}

function labelsFromMerges(merges, n, count) {
  const parent = Array.from({ length: 2 * n }, (_, i) => i);
  const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  for (let m = 0; m < count; m++) {
    parent[find(merges[m].a)] = merges[m].id;
    parent[find(merges[m].b)] = merges[m].id;
  }
  const seen = new Map();
  return Array.from({ length: n }, (_, i) => {
    const root = find(i);
    if (!seen.has(root)) seen.set(root, seen.size);
    return seen.get(root);
  });
}

/** Labels for exactly k clusters, by replaying the first n - k merges. */
export function cutTree(merges, n, k) {
  if (!Number.isInteger(k) || k < 1 || k > n) throw new RangeError(`k must be an integer from 1 to ${n}`);
  return labelsFromMerges(merges, n, n - k);
}

/** Labels after applying every merge at or below `height`. */
export function cutTreeAtHeight(merges, n, height) {
  let count = 0;
  while (count < merges.length && merges[count].height <= height) count++;
  return labelsFromMerges(merges, n, count);
}

/** Leaf order and U-shaped link coordinates for drawing a dendrogram. */
export function dendrogramLayout(merges, n) {
  const total = Math.max(0, 2 * n - 1);
  const children = new Array(total).fill(null);
  const heightOf = new Array(total).fill(0);
  const minLeaf = Array.from({ length: total }, (_, i) => i);
  for (const m of merges) {
    const [left, right] = minLeafOf(m.a) <= minLeafOf(m.b) ? [m.a, m.b] : [m.b, m.a];
    children[m.id] = [left, right];
    heightOf[m.id] = m.height;
    minLeaf[m.id] = Math.min(minLeafOf(m.a), minLeafOf(m.b));
  }
  function minLeafOf(id) { return minLeaf[id]; }
  const order = [];
  if (n > 0) {
    const stack = [merges.length ? merges[merges.length - 1].id : 0];
    while (stack.length) {
      const id = stack.pop();
      if (children[id]) stack.push(children[id][1], children[id][0]);
      else order.push(id);
    }
  }
  const x = new Array(total).fill(0);
  order.forEach((leaf, pos) => { x[leaf] = pos; });
  const links = merges.map(m => {
    const [left, right] = children[m.id];
    x[m.id] = (x[left] + x[right]) / 2;
    return { id: m.id, left, right, height: m.height, x: x[m.id], xLeft: x[left], xRight: x[right], yLeft: heightOf[left], yRight: heightOf[right] };
  });
  return { order, x, height: heightOf, links };
}

/** Silhouette values and their mean; see the API block above. */
export function silhouette(points, labels, { noise = 'exclude', metric = 'euclidean' } = {}) {
  if (!['exclude', 'cluster', 'zero'].includes(noise)) throw new RangeError(`unknown noise mode "${noise}"`);
  const vecs = toVecs(points);
  const dist = metricFn(metric);
  const n = vecs.length;
  const used = labels.map(l => l !== -1 || noise === 'cluster');
  const groups = new Map();
  for (let i = 0; i < n; i++) {
    if (!used[i]) continue;
    if (!groups.has(labels[i])) groups.set(labels[i], []);
    groups.get(labels[i]).push(i);
  }
  const values = new Array(n).fill(NaN);
  if (groups.size < 2) return { values, mean: NaN, defined: false, byCluster: [] };
  for (let i = 0; i < n; i++) {
    if (!used[i]) {
      if (noise === 'zero') values[i] = 0;
      continue;
    }
    const own = groups.get(labels[i]);
    if (own.length === 1) { values[i] = 0; continue; }
    let a = 0;
    for (const j of own) if (j !== i) a += dist(vecs[i], vecs[j]);
    a /= own.length - 1;
    let b = Infinity;
    for (const [label, members] of groups) {
      if (label === labels[i]) continue;
      let sum = 0;
      for (const j of members) sum += dist(vecs[i], vecs[j]);
      b = Math.min(b, sum / members.length);
    }
    const scale = Math.max(a, b);
    values[i] = scale === 0 ? 0 : (b - a) / scale;
  }
  const counted = values.filter(v => !Number.isNaN(v));
  const mean = counted.reduce((s, v) => s + v, 0) / counted.length;
  const byCluster = [...groups.keys()].sort(compareLabels).map(label => {
    const members = groups.get(label);
    return { label, size: members.length, mean: members.reduce((s, i) => s + values[i], 0) / members.length };
  });
  return { values, mean, defined: true, byCluster };
}

function compareLabels(a, b) {
  const an = typeof a === 'number', bn = typeof b === 'number';
  if (an && bn) return a - b;
  if (an) return -1;
  if (bn) return 1;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

/** Contingency table of cluster labels (rows) against known labels (columns). */
export function crosstab(clusterLabels, trueLabels) {
  if (clusterLabels.length !== trueLabels.length) throw new RangeError('label arrays must have the same length');
  const rows = [...new Set(clusterLabels)].sort(compareLabels);
  const cols = [...new Set(trueLabels)].sort(compareLabels);
  const counts = rows.map(() => cols.map(() => 0));
  for (let i = 0; i < clusterLabels.length; i++) counts[rows.indexOf(clusterLabels[i])][cols.indexOf(trueLabels[i])]++;
  return {
    rows, cols, counts,
    rowTotals: counts.map(r => r.reduce((s, v) => s + v, 0)),
    colTotals: cols.map((_, c) => counts.reduce((s, r) => s + r[c], 0)),
    n: clusterLabels.length,
  };
}

function withoutNoise(clusterLabels, trueLabels, noise) {
  if (noise !== 'exclude') return [clusterLabels, trueLabels];
  const keep = clusterLabels.map((l, i) => i).filter(i => clusterLabels[i] !== -1);
  return [keep.map(i => clusterLabels[i]), keep.map(i => trueLabels[i])];
}

/** Share of points in the majority true class of their cluster. */
export function purity(clusterLabels, trueLabels, { noise = 'cluster' } = {}) {
  const [c, t] = withoutNoise(clusterLabels, trueLabels, noise);
  if (!c.length) return NaN;
  const table = crosstab(c, t);
  return table.counts.reduce((s, row) => s + Math.max(...row), 0) / table.n;
}

const pairs = m => (m * (m - 1)) / 2;

/** Adjusted Rand index of two partitions. */
export function adjustedRand(a, b, { noise = 'cluster' } = {}) {
  const [c, t] = withoutNoise(a, b, noise);
  const n = c.length;
  if (n < 2) return NaN;
  const table = crosstab(c, t);
  let index = 0;
  for (const row of table.counts) for (const v of row) index += pairs(v);
  const sumRows = table.rowTotals.reduce((s, v) => s + pairs(v), 0);
  const sumCols = table.colTotals.reduce((s, v) => s + pairs(v), 0);
  const expected = (sumRows * sumCols) / pairs(n);
  const max = (sumRows + sumCols) / 2;
  if (max === expected) return 1;
  return (index - expected) / (max - expected);
}
