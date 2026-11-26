// Pure logic of the "k-means, then reveal the labels" lab: the points k-means sees, one run of k-means with
// its history in the units the learner reads, the comparison with the hidden classes, and the elbow curve.
// Clustering itself is in clustermethods.js; this file only prepares its input and reads its output.
import { kmeans, inertiaByK, crosstab, purity, adjustedRand } from './clustermethods.js';

export const MAX_K = 8;
export const ELBOW_MAX_K = 8;

// Bill length (mm) and flipper length (mm) of each penguin, with its species as the hidden class. A row
// missing either number (the dataset writes NA) is dropped; `dropped` says how many, so the UI can say so.
export function penguinPoints(table) {
  const points = [];
  for (const row of table.rows) {
    const x = row.bill_length_mm, y = row.flipper_length_mm;
    if (typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) && typeof row.species === 'string') points.push({ x, y, label: row.species });
  }
  return { points, total: table.rows.length, dropped: table.rows.length - points.length };
}

// Mean and population standard deviation of each coordinate, and the two conversions between data units and
// z-scores. A constant coordinate gets sd 1 so nothing divides by zero.
export function zscoreSpace(rows) {
  const dims = rows[0]?.length ?? 0;
  const mean = [], sd = [];
  for (let j = 0; j < dims; j++) {
    const m = rows.reduce((s, r) => s + r[j], 0) / rows.length;
    mean.push(m);
    sd.push(Math.sqrt(rows.reduce((s, r) => s + (r[j] - m) ** 2, 0) / rows.length) || 1);
  }
  return {
    mean, sd,
    apply: r => r.map((v, j) => (v - mean[j]) / sd[j]),
    invert: r => r.map((v, j) => v * sd[j] + mean[j]),
  };
}

// The coordinates k-means works on: the points as they are, or both features as z-scores (so a feature in
// millimetres of a larger spread does not dominate the distances). `toData` maps a centroid back to data units.
export function clusteringInput(points, { standardize = false } = {}) {
  const rows = points.map(p => [p.x, p.y]);
  if (!standardize || !rows.length) return { rows, toData: c => c.slice() };
  const space = zscoreSpace(rows);
  return { rows: rows.map(space.apply), toData: space.invert };
}

// One seeded run of k-means. `steps` is the history of the run (one entry per assignment step), with each
// entry's centroids converted to data units so a lab can draw them on the original axes.
export function runKMeans(points, { k, init = 'kmeans++', seed = 1, standardize = false } = {}) {
  const input = clusteringInput(points, { standardize });
  const kk = Math.max(1, Math.min(k, points.length));
  const result = kmeans(input.rows, kk, { init, seed });
  const steps = result.history.map(h => ({
    iteration: h.iteration, labels: h.labels, inertia: h.inertia, moved: h.moved,
    centroids: h.centroids.map(input.toData),
  }));
  return { k: kk, steps, converged: result.converged, iterations: result.iterations, inertia: result.inertia, input };
}

// Inertia of the best of several starts for k = 1..kmax on the same input the run uses: the elbow curve.
export function elbowCurve(points, { standardize = false, seed = 1, kmax = ELBOW_MAX_K } = {}) {
  const input = clusteringInput(points, { standardize });
  return inertiaByK(input.rows, Math.min(kmax, points.length), { seed });
}

// How well do the clusters match the classes? Adjusted Rand index (chance-corrected, 1 is a perfect match,
// about 0 is what random labels give): at least 0.7 reads as a good match, under 0.3 as clusters that cut
// across the classes, in between as a partial match. Purity alone is not used for the verdict because it
// rises with every extra cluster (n clusters of one point each have purity 1).
export const GOOD_ARI = 0.7;
export const POOR_ARI = 0.3;
export function matchLevel(ari) {
  if (!Number.isFinite(ari)) return 'none';
  return ari >= GOOD_ARI ? 'good' : ari < POOR_ARI ? 'poor' : 'partly';
}

// Crosstab of cluster labels (rows) against the true classes (columns), plus purity and adjusted Rand index.
export function compareWithClasses(clusterLabels, classLabels) {
  const table = crosstab(clusterLabels, classLabels);
  const p = purity(clusterLabels, classLabels), ari = adjustedRand(clusterLabels, classLabels);
  return { table, purity: p, ari, level: matchLevel(ari) };
}
