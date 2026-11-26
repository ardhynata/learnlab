// Pure helpers for the "Compare clustering methods" lab (labs/cluster-compare.js): the penguin data
// as a 0..10 point cloud, one run of the three methods on the same points, which method matched the
// true groups best, and whether silhouette alone would have picked the wrong one. No DOM, no
// language: the lab turns these results into words. Tested in clustercompare.test.js.
import { rng, shuffle } from './rng.js';
import { kmeans, dbscan, agglomerative, cutTree, silhouette, adjustedRand } from './clustermethods.js';

// ---- penguins ----------------------------------------------------------------------------------------------

export const PENGUIN_MEASURES = ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g'];
export const PENGUIN_SPECIES = ['Adelie', 'Chinstrap', 'Gentoo'];
// The data fills this much of the 0..10 square: a little room at each edge so no point sits on the frame.
export const PLOT_LO = 0.5;
export const PLOT_HI = 9.5;

const isNumber = v => typeof v === 'number' && Number.isFinite(v);

/**
 * Two measurements of every penguin that has both, from the parsed penguins table. A row missing either
 * number (the file writes NA) is dropped; `dropped` says how many so the UI can tell the learner.
 * Returns { x, y, truth, total, dropped, extent: { xLo, xHi, yLo, yHi } }. truth[i] is the species index
 * (0 Adelie, 1 Chinstrap, 2 Gentoo), the reference the clusters are compared with.
 */
export function penguinCloud(table, xKey, yKey) {
  const x = [], y = [], truth = [];
  for (const row of table.rows) {
    const species = PENGUIN_SPECIES.indexOf(row.species);
    if (!isNumber(row[xKey]) || !isNumber(row[yKey]) || species < 0) continue;
    x.push(row[xKey]); y.push(row[yKey]); truth.push(species);
  }
  const lo = a => (a.length ? Math.min(...a) : 0), hi = a => (a.length ? Math.max(...a) : 1);
  return { x, y, truth, total: table.rows.length, dropped: table.rows.length - x.length, extent: { xLo: lo(x), xHi: hi(x), yLo: lo(y), yHi: hi(y) } };
}

/** Maps a measurement into the plot square (PLOT_LO..PLOT_HI) given the data's own low and high. */
export function toPlotUnits(value, lo, hi) {
  return PLOT_LO + (hi > lo ? (value - lo) / (hi - lo) : 0.5) * (PLOT_HI - PLOT_LO);
}
/** The inverse of toPlotUnits: the measurement that sits at plot coordinate `v` (for axis tick labels). */
export function fromPlotUnits(v, lo, hi) {
  return lo + (v - PLOT_LO) / (PLOT_HI - PLOT_LO) * (hi - lo);
}

/** The first `n` penguins of a seeded shuffle, scaled into the plot square. Growing n only adds points. */
export function penguinPoints(cloud, order, n) {
  const pick = order.slice(0, Math.min(n, order.length)), e = cloud.extent;
  return {
    points: pick.map(i => [toPlotUnits(cloud.x[i], e.xLo, e.xHi), toPlotUnits(cloud.y[i], e.yLo, e.yHi)]),
    truth: pick.map(i => cloud.truth[i]),
  };
}

/** A seeded shuffle of 0..len-1 (the order the lab takes penguins in). */
export function sampleOrder(len, seed) { return shuffle(Array.from({ length: len }, (_, i) => i), rng(seed)); }

// ---- defaults ----------------------------------------------------------------------------------------------

// What a data source starts with. k is the true number of groups; eps is the DBSCAN radius in plot units
// (0..10): 0.8 separates the generated shapes, the penguins are sparser and need a smaller one. The two thin
// rings fragment at 0.8 on many seeds (a new sample at 150 points breaks them in 28 of 30), so they start wider.
export const RINGS_EPS = 1.1;
export function defaultParams(source, trueGroups, dataset = '') {
  const eps = source === 'penguins' ? 0.5 : dataset === 'rings' ? RINGS_EPS : 0.8;
  return { k: trueGroups, hk: trueGroups, eps, minPts: 5, linkage: 'ward' };
}

// ---- one run of the three methods ----------------------------------------------------------------------------

export const METHODS = ['kmeans', 'dbscan', 'hier'];

const distinct = labels => new Set(labels.filter(l => l >= 0)).size;

/**
 * Renumbers cluster ids so a cluster takes the id of the true group it overlaps most (greedy, one cluster
 * per true group), the rest follow in order. The same group then has the same colour in all three panels.
 * Noise (-1) stays -1. Without a truth the labels come back unchanged.
 */
export function alignLabels(labels, truth) {
  const to = alignMap(labels, truth);
  return labels.map(c => (c < 0 ? -1 : to.get(c) ?? c));
}

/** The renumbering alignLabels applies, as a Map from the old cluster id to the new one (empty without a truth). */
export function alignMap(labels, truth) {
  const to = new Map();
  if (!truth) return to;
  const counts = new Map();
  labels.forEach((c, i) => {
    if (c < 0 || truth[i] < 0) return;
    const key = `${c}|${truth[i]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const pairs = [...counts].map(([key, n]) => ({ c: Number(key.split('|')[0]), t: Number(key.split('|')[1]), n }));
  pairs.sort((a, b) => b.n - a.n || a.c - b.c || a.t - b.t);
  const usedTruth = new Set();
  for (const p of pairs) if (!to.has(p.c) && !usedTruth.has(p.t)) { to.set(p.c, p.t); usedTruth.add(p.t); }
  let next = Math.max(-1, ...truth) + 1;
  for (const c of [...new Set(labels)].filter(l => l >= 0).sort((a, b) => a - b)) if (!to.has(c)) to.set(c, next++);
  return to;
}

/** Hierarchical merges for the points and linkage; the lab caches them because they do not depend on k. */
export function hierarchy(points, linkage) { return agglomerative(points, { linkage }); }

function summarize(key, labels, points, truth, extra) {
  const sil = silhouette(points, labels);
  return {
    key, labels, clusters: distinct(labels), noise: labels.filter(l => l < 0).length,
    silhouette: sil.defined ? sil.mean : NaN,
    // Noise counts as one more group here: a method that calls the scattered points noise matches a truth that does too.
    ari: truth ? adjustedRand(labels, truth) : NaN,
    ...extra,
  };
}

/**
 * Runs k-means (k), DBSCAN (eps, minPts) and hierarchical clustering (linkage, hk) on the same points.
 * truth is the generator's true group per point (-1 = noise) or null. `merges` may carry a hierarchy
 * already computed by hierarchy(points, linkage). Returns { kmeans, dbscan, hier }, each
 * { key, labels, clusters, noise, silhouette, ari, ... } with labels aligned to the truth's ids.
 */
export function runComparison(points, truth, { k, eps, minPts, linkage, hk }, { seed = 1, merges = null } = {}) {
  const n = points.length;
  const km = kmeans(points, Math.max(1, Math.min(k, n)), { seed, restarts: 5 });
  const db = dbscan(points, { eps, minPts });
  const tree = merges ?? hierarchy(points, linkage);
  const hierLabels = cutTree(tree, n, Math.max(1, Math.min(hk, n)));
  const align = l => alignLabels(l, truth);
  return {
    kmeans: summarize('kmeans', align(km.labels), points, truth, {
      centroids: km.centroids, inertia: km.inertia,
      // The id each centroid's cluster got after alignment, so the lab can colour the centroid like its points.
      centroidIds: km.centroids.map((_, c) => alignMap(km.labels, truth).get(c) ?? c),
    }),
    dbscan: summarize('dbscan', align(db.labels), points, truth, { core: db.core }),
    hier: summarize('hier', align(hierLabels), points, truth, { merges: tree, cutK: Math.max(1, Math.min(hk, n)) }),
  };
}

// ---- who matched the truth, and did silhouette agree ------------------------------------------------------------

export const TIE_TOLERANCE = 0.02;   // adjusted Rand scores this close count as a tie
export const MATCH_FLOOR = 0.3;      // below this no method is said to have matched the truth

/**
 * The method(s) closest to the true groups by adjusted Rand: { keys, ari, tie, none }. `none` is true when
 * even the best score is below MATCH_FLOOR, or when there is no truth (keys is then empty).
 */
export function bestMatch(results) {
  const scored = METHODS.map(key => ({ key, ari: results[key].ari })).filter(m => Number.isFinite(m.ari));
  if (!scored.length) return { keys: [], ari: NaN, tie: false, none: true };
  const top = Math.max(...scored.map(m => m.ari));
  const keys = scored.filter(m => top - m.ari <= TIE_TOLERANCE).map(m => m.key);
  return { keys, ari: top, tie: keys.length > 1, none: top < MATCH_FLOOR };
}

/**
 * Which method has the highest silhouette score, and does that disagree with the truth?
 * `misleads` is true when it scores clearly lower (by more than TIE_TOLERANCE) on adjusted Rand than the best match.
 * Returns { topKey, topValue, misleads, spread } (topKey null when no silhouette is defined).
 */
export function silhouetteVerdict(results) {
  const scored = METHODS.map(key => ({ key, value: results[key].silhouette })).filter(m => Number.isFinite(m.value));
  if (!scored.length) return { topKey: null, topValue: NaN, misleads: false, spread: 0 };
  const top = scored.reduce((a, b) => (b.value > a.value ? b : a));
  const best = bestMatch(results);
  const topAri = results[top.key].ari;
  const misleads = Number.isFinite(topAri) && Number.isFinite(best.ari) && best.ari - topAri > TIE_TOLERANCE;
  return { topKey: top.key, topValue: top.value, misleads, spread: Math.max(...scored.map(m => m.value)) - Math.min(...scored.map(m => m.value)) };
}

/** Methods whose adjusted Rand is at least `floor` (default 0.9): the ones that "separated" the true groups. */
export function separated(results, floor = 0.9) {
  return METHODS.filter(key => results[key].ari >= floor);
}

/** The dendrogram height that cuts the tree into k clusters: halfway between the last merge kept and the next one. */
export function cutHeight(merges, n, k) {
  const keep = n - k;                                  // merges applied
  if (merges.length === 0) return 0;
  const below = keep > 0 ? merges[keep - 1].height : 0;
  const above = keep < merges.length ? merges[keep].height : merges[merges.length - 1].height * 1.05;
  return (below + above) / 2;
}
