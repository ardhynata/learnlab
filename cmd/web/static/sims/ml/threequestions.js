// "Three questions, one dataset": the pure math behind the feature-explorer lab.
// One table of rows can be asked a regression question (predict a number), a classification
// question (predict a category) and a clustering question (find groups, no target).
// Everything here is pure and seeded; the lab only draws and wires.
import { rng, shuffle } from './rng.js';
import { standardize } from './scale.js';
import { looAccuracy } from './knn.js';
import { linearFit, mean } from './regression.js';
import { FEATURES, SPECIES, makeBirds } from './birds.js';

// ---- Datasets ----------------------------------------------------------------------------
// A dataset is { key, nouns, features, labels, rows }.
//   nouns:    [[en singular, id singular], [en plural, id plural]] for "bird" / "birds"
//   features: [{ key, name: [en, id], unit, lo, hi, tick, decimals }]   lo/hi: fixed axis range, tick: tick spacing
//   labels:   [{ key, name: [en, id], values: [...], valueNames?: { value: [en, id] } }]   categorical columns
//   rows:     [{ id, f: [numbers or null], l: { labelKey: string or null } }]
// A null means a missing value (NA in the CSV).

const BIRD_NAMES = [['Bill length', 'Panjang paruh'], ['Bill depth', 'Tebal paruh'], ['Flipper length', 'Panjang sirip'], ['Body mass', 'Berat badan']];
const BIRD_TICKS = [5, 2, 15, 1];

// The invented birds of sims/ml/birds.js in the shape of a dataset.
export function birdsDataset(seed = 7) {
  return {
    key: 'generated',
    nouns: [['bird', 'burung'], ['birds', 'burung']],
    features: FEATURES.map((f, i) => ({ key: `f${i}`, name: BIRD_NAMES[i], unit: f.unit, lo: f.lo, hi: f.hi, tick: BIRD_TICKS[i], decimals: f.decimals })),
    labels: [{ key: 'species', name: ['Species', 'Spesies'], values: SPECIES.map(s => s.name) }],
    rows: makeBirds(seed).map(b => ({ id: b.id, f: b.features.slice(), l: { species: SPECIES[b.label].name } })),
  };
}

const PENGUIN_COLUMNS = [
  { column: 'bill_length_mm', name: BIRD_NAMES[0], unit: 'mm', lo: 30, hi: 60, tick: 5, decimals: 1 },
  { column: 'bill_depth_mm', name: BIRD_NAMES[1], unit: 'mm', lo: 12, hi: 22, tick: 2, decimals: 1 },
  { column: 'flipper_length_mm', name: BIRD_NAMES[2], unit: 'mm', lo: 160, hi: 240, tick: 20, decimals: 0 },
  { column: 'body_mass_g', name: BIRD_NAMES[3], unit: 'g', lo: 2000, hi: 7000, tick: 1000, decimals: 0 },
];
const PENGUIN_LABELS = [
  { key: 'species', column: 'species', name: ['Species', 'Spesies'] },
  { key: 'island', column: 'island', name: ['Island', 'Pulau'] },
  { key: 'sex', column: 'sex', name: ['Sex', 'Jenis kelamin'], valueNames: { female: ['Female', 'Betina'], male: ['Male', 'Jantan'] } },
];

// The bundled penguins table (sims/ml/tabular.js parseCsv output) in the shape of a dataset.
// Rows keep their position in the file as `id` (1-based), so an id means the same row whatever is dropped.
export function penguinsDataset(table) {
  const labels = PENGUIN_LABELS.map(({ key, column, name, valueNames }) => ({
    key, name, valueNames,
    values: [...new Set(table.rows.map(r => r[column]).filter(v => v != null))].sort(),
  }));
  return {
    key: 'penguins',
    nouns: [['penguin', 'penguin'], ['penguins', 'penguin']],
    features: PENGUIN_COLUMNS.map(c => ({ key: c.column, name: c.name, unit: c.unit, lo: c.lo, hi: c.hi, tick: c.tick, decimals: c.decimals })),
    labels,
    rows: table.rows.map((r, i) => ({
      id: i + 1,
      f: PENGUIN_COLUMNS.map(c => (Number.isFinite(r[c.column]) ? r[c.column] : null)),
      l: Object.fromEntries(PENGUIN_LABELS.map(l => [l.key, r[l.column] ?? null])),
    })),
  };
}

// ---- Missing values and samples ------------------------------------------------------------
// Rows with every feature present (and, when labelKey is given, that label present), plus how many were left out.
export function usableRows(rows, labelKey = null) {
  const kept = rows.filter(r => r.f.every(v => Number.isFinite(v)) && (labelKey == null || (r.l[labelKey] != null)));
  return { rows: kept, dropped: rows.length - kept.length };
}

// Sample 1 is every row. Any later sample is a seeded random `share` of the rows, kept in their original order.
export function subsample(rows, sampleNo, share = 2 / 3) {
  if (sampleNo <= 1) return rows;
  const picked = shuffle(rows.map((_, i) => i), rng(sampleNo * 7919)).slice(0, Math.round(rows.length * share));
  return picked.sort((a, b) => a - b).map(i => rows[i]);
}

// ---- Regression: a number to predict ---------------------------------------------------------
export function pearson(xs, ys) {
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

// Straight-line fit of ys on xs: slope, intercept, correlation r, R^2, the mean absolute error of
// the line and of the no-feature guess "always the mean" (so the line can be compared with it).
export function regressionFit(xs, ys) {
  const fit = linearFit(xs, ys);
  const my = mean(ys);
  const abs = (list, f) => list.reduce((s, y, i) => s + Math.abs(y - f(i)), 0) / list.length;
  return { ...fit, r: pearson(xs, ys), mae: abs(ys, i => fit.slope * xs[i] + fit.intercept), baselineMae: abs(ys, () => my) };
}

// Every feature except `target`, used alone to predict `target`: R^2, best first (ties: feature order).
export function rankInputs(rows, target) {
  const ys = rows.map(r => r.f[target]);
  return rows[0].f.map((_, a) => a).filter(a => a !== target)
    .map(a => ({ a, score: linearFit(rows.map(r => r.f[a]), ys).r2 }))
    .sort((p, q) => q.score - p.score || p.a - q.a);
}

// Fitted lines inside each value of a label (needs 3 rows and some spread in x), to show that the
// trend of the whole table can point the other way inside every group.
export function groupFits(rows, a, b, labelKey) {
  const out = [];
  for (const value of [...new Set(rows.map(r => r.l[labelKey]))]) {
    const part = rows.filter(r => r.l[labelKey] === value);
    const xs = part.map(r => r.f[a]);
    if (part.length < 3 || Math.min(...xs) === Math.max(...xs)) continue;
    out.push({ value, n: part.length, ...linearFit(xs, part.map(r => r.f[b])) });
  }
  return out;
}

// True when the whole-table slope has one sign and every group's slope has the other.
export function trendReverses(overallSlope, fits) {
  return fits.length > 1 && fits.every(f => Math.sign(f.slope) === -Math.sign(overallSlope) && f.slope !== 0);
}

// 'up' / 'down' / 'flat' for the Predict-first question about a trend.
export function trendOf(r, flat = 0.15) {
  return Math.abs(r) < flat ? 'flat' : r > 0 ? 'up' : 'down';
}

// ---- Classification: a category to predict ---------------------------------------------------
const points = (rows, cols, labelKey) => standardize(rows.map(r => cols.map(c => r.f[c])))
  .map((features, i) => ({ features, label: String(rows[i].l[labelKey]) }));

// Leave-one-out k-NN accuracy in [0, 1] of `labelKey` from the listed feature columns, each standardized.
export function separabilityOn(rows, cols, labelKey, k = 5) {
  return rows.length ? looAccuracy(points(rows, cols, labelKey), k) : 0;
}

// Every pair of different features, scored and sorted best first (ties: pair order).
export function rankPairsOn(rows, nFeatures, labelKey, k = 5) {
  const out = [];
  for (let a = 0; a < nFeatures; a++) for (let b = a + 1; b < nFeatures; b++) out.push({ a, b, score: separabilityOn(rows, [a, b], labelKey, k) });
  return out.map((p, i) => ({ ...p, i })).sort((p, q) => q.score - p.score || p.i - q.i).map(({ i, ...p }) => p);
}

// The most common value and its share: the score of always guessing it (ties: first seen).
export function majority(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = null, top = 0;
  for (const [v, c] of counts) if (c > top) { best = v; top = c; }
  return { value: best, share: values.length ? top / values.length : 0 };
}

// 'weak' (hardly above the baseline), 'good' (90% or more) or 'ok' (in between).
export function scoreBand(score, baseline) {
  return score >= 0.9 ? 'good' : score < baseline + 0.1 ? 'weak' : 'ok';
}

// ---- Clustering: groups, no target ---------------------------------------------------------------
const sq = (a, b) => a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);

// k-means on rows of numbers with k-means++ seeding, the best of several seeded restarts.
// Groups are numbered by the first coordinate of their center, so the numbering is stable.
// Returns { assign, centers, inertia }.
export function kmeans(pts, k, { seed = 11, restarts = 8, maxIter = 60 } = {}) {
  const n = pts.length;
  k = Math.max(1, Math.min(k, n));
  let best = null;
  for (let run = 0; run < restarts; run++) {
    const random = rng(seed + run * 101);
    for (let i = 0; i < 4; i++) random();
    const centers = [pts[Math.floor(random() * n)].slice()];
    while (centers.length < k) {
      const d = pts.map(p => Math.min(...centers.map(c => sq(p, c))));
      const total = d.reduce((a, b) => a + b, 0);
      if (!total) { centers.push(pts[centers.length % n].slice()); continue; }
      let pick = random() * total, i = 0;
      while (i < n - 1 && pick >= d[i]) { pick -= d[i]; i++; }
      centers.push(pts[i].slice());
    }
    let assign = new Array(n).fill(-1);
    for (let it = 0; it < maxIter; it++) {
      const next = pts.map(p => { let b = 0, bd = Infinity; centers.forEach((c, j) => { const d = sq(p, c); if (d < bd) { bd = d; b = j; } }); return b; });
      const same = next.every((v, i) => v === assign[i]);
      assign = next;
      for (let j = 0; j < k; j++) {
        const members = pts.filter((_, i) => assign[i] === j);
        if (members.length) centers[j] = members[0].map((_, d) => mean(members.map(m => m[d])));
      }
      if (same) break;
    }
    const inertia = pts.reduce((s, p, i) => s + sq(p, centers[assign[i]]), 0);
    if (!best || inertia < best.inertia - 1e-12) best = { assign, centers: centers.map(c => c.slice()), inertia };
  }
  const order = best.centers.map((c, j) => j).sort((p, q) => best.centers[p][0] - best.centers[q][0] || p - q);
  const rank = new Map(order.map((j, r) => [j, r]));
  return { assign: best.assign.map(j => rank.get(j)), centers: order.map(j => best.centers[j]), inertia: best.inertia };
}

// Mean silhouette in [-1, 1]: how much closer each point is to its own group than to the next nearest group.
// A point alone in its group scores 0; fewer than two non-empty groups scores 0.
export function silhouette(pts, assign) {
  const groups = [...new Set(assign)];
  if (groups.length < 2) return 0;
  const dist = (p, q) => Math.sqrt(sq(p, q));
  let total = 0;
  pts.forEach((p, i) => {
    const own = [], others = new Map(groups.filter(g => g !== assign[i]).map(g => [g, []]));
    pts.forEach((q, j) => { if (j !== i) (assign[j] === assign[i] ? own : others.get(assign[j])).push(dist(p, q)); });
    if (!own.length) return;
    const a = mean(own);
    const b = Math.min(...[...others.values()].filter(d => d.length).map(mean));
    const denom = Math.max(a, b);
    total += denom ? (b - a) / denom : 0;
  });
  return total / pts.length;
}

// Share of rows that sit in a group whose most common label is their own (1 means every group is one label).
export function purity(assign, labels) {
  const by = new Map();
  assign.forEach((g, i) => { if (!by.has(g)) by.set(g, []); by.get(g).push(labels[i]); });
  let right = 0;
  for (const members of by.values()) right += Math.round(majority(members).share * members.length);
  return assign.length ? right / assign.length : 0;
}

// Cluster the rows on the listed feature columns (standardized) into k groups, without looking at any label.
// Returns the groups, the centers in the original units, the silhouette, and the purity against `labelKey`.
export function clusterRows(rows, cols, k, labelKey = 'species') {
  const std = standardize(rows.map(r => cols.map(c => r.f[c])));
  const { assign, inertia } = kmeans(std, k);
  const groups = Math.max(...assign) + 1;
  const centers = Array.from({ length: groups }, (_, g) => {
    const members = rows.filter((_, i) => assign[i] === g);
    return cols.map(c => mean(members.map(r => r.f[c])));
  });
  return { assign, centers, inertia, silhouette: silhouette(std, assign), purity: purity(assign, rows.map(r => r.l[labelKey])) };
}

// Every pair of different features clustered, best silhouette first (ties: pair order).
export function rankClusterPairs(rows, nFeatures, k, labelKey = 'species') {
  const out = [];
  for (let a = 0; a < nFeatures; a++) for (let b = a + 1; b < nFeatures; b++) {
    const c = clusterRows(rows, [a, b], k, labelKey);
    out.push({ a, b, silhouette: c.silhouette, purity: c.purity });
  }
  return out.map((p, i) => ({ ...p, i })).sort((p, q) => q.silhouette - p.silhouette || p.i - q.i).map(({ i, ...p }) => p);
}

// 'match' (85% or more), 'part' (65% or more) or 'no' for the Predict-first question about clusters vs labels.
export function agreementBand(share) {
  return share >= 0.85 ? 'match' : share >= 0.65 ? 'part' : 'no';
}
