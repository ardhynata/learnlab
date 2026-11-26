// Seeded 2-D cluster datasets in the 0..10 plot range every lab uses, for the clustering
// modules (k-means, hierarchical clustering, DBSCAN). Each generator returns
//   { points: [[x, y], ...], truth: [label, ...] }
// with exactly n points. truth[i] is the true cluster of points[i] (0, 1, 2, ...), or -1 for a
// noise point that belongs to no cluster. The points come out shuffled, so the order gives
// nothing away. The same (key, n, seed) always gives the same dataset.
import { rng, gauss, shuffle } from './rng.js';
import { tr } from '../../i18n.js';

export const RANGE = 10;                 // every coordinate lies in 0..RANGE
export const DEFAULT_N = 150;
export const DEFAULT_SEED = 7;

const round3 = (v) => Math.round(v * 1000) / 1000;
const clamp = (v) => Math.min(RANGE, Math.max(0, v));
const inside = (p) => p[0] >= 0 && p[0] <= RANGE && p[1] >= 0 && p[1] <= RANGE;

// Draw from `draw` until the point lands in the plot (so a blob near an edge is not squashed
// against it); fall back to clamping if the draw keeps missing.
function inPlot(draw) {
  for (let tries = 0; tries < 50; tries++) {
    const p = draw();
    if (inside(p)) return [round3(p[0]), round3(p[1])];
  }
  const p = draw();
  return [round3(clamp(p[0])), round3(clamp(p[1]))];
}

// Split n into whole shares in proportion to `weights` (largest remainder), summing to n exactly.
export function splitCounts(n, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (n * w) / total);
  const counts = raw.map(Math.floor);
  let left = n - counts.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; left > 0; k++, left--) counts[order[k % order.length][1]]++;
  return counts;
}

const blob = (random, cx, cy, sd) => () => [cx + gauss(random) * sd, cy + gauss(random) * sd];

// Gaussian blobs: one { cx, cy, sd, weight } entry per cluster, labelled 0, 1, 2, ...
function blobs(n, random, specs) {
  const counts = splitCounts(n, specs.map((s) => s.weight));
  const points = [], truth = [];
  specs.forEach((s, label) => {
    for (let i = 0; i < counts[label]; i++) { points.push(inPlot(blob(random, s.cx, s.cy, s.sd))); truth.push(label); }
  });
  return { points, truth };
}

export const RING_CENTER = [5, 5];
export const RING_RADII = [1.6, 3.5];    // inner ring = 0, outer ring = 1
const RING_SPREAD = 0.14;                // radial noise (standard deviation)

function rings(n, random) {
  // The outer ring is longer, so it gets more points (in proportion to its radius).
  const counts = splitCounts(n, RING_RADII);
  const points = [], truth = [];
  RING_RADII.forEach((radius, label) => {
    for (let i = 0; i < counts[label]; i++) {
      points.push(inPlot(() => {
        const angle = random() * 2 * Math.PI, r = radius + gauss(random) * RING_SPREAD;
        return [RING_CENTER[0] + r * Math.cos(angle), RING_CENTER[1] + r * Math.sin(angle)];
      }));
      truth.push(label);
    }
  });
  return { points, truth };
}

// Two interleaved half circles of radius MOON_RADIUS. The upper moon (0) is an arch opening
// downwards, the lower moon (1) a bowl opening upwards, shifted right and down so that the
// tips hook into each other. MOON_CENTERS are the centres of the two circles the arcs lie on.
export const MOON_RADIUS = 2.8;
export const MOON_CENTERS = [[5 - MOON_RADIUS / 2, 5 - MOON_RADIUS / 4], [5 + MOON_RADIUS / 2, 5 + MOON_RADIUS / 4]];
const MOON_SPREAD = 0.2;

function moons(n, random) {
  const counts = splitCounts(n, [1, 1]);
  const points = [], truth = [];
  MOON_CENTERS.forEach(([cx, cy], label) => {
    for (let i = 0; i < counts[label]; i++) {
      points.push(inPlot(() => {
        const t = random() * Math.PI;
        const r = MOON_RADIUS + gauss(random) * MOON_SPREAD * 0.5;
        // y grows upwards in a lab's plot: the arch bulges to larger y, the bowl to smaller y.
        const dy = label === 0 ? Math.sin(t) : -Math.sin(t);
        return [cx + r * Math.cos(t) + gauss(random) * MOON_SPREAD * 0.5, cy + r * dy + gauss(random) * MOON_SPREAD * 0.5];
      }));
      truth.push(label);
    }
  });
  return { points, truth };
}

// A tight cluster and a loose one, both roughly the same size, plus uniform noise points (-1).
export const NOISE_FRACTION = 0.1;
function density(n, random) {
  const noise = n >= 2 ? Math.max(1, Math.round(n * NOISE_FRACTION)) : 0;
  const out = blobs(n - noise, random, [
    { cx: 3, cy: 3.2, sd: 0.35, weight: 1 },   // tight
    { cx: 6.6, cy: 6.4, sd: 1.15, weight: 1 }, // loose
  ]);
  for (let i = 0; i < noise; i++) {
    out.points.push([round3(random() * RANGE), round3(random() * RANGE)]);
    out.truth.push(-1);
  }
  return out;
}

const GENERATORS = {
  blobs: (n, random) => blobs(n, random, [
    { cx: 2.4, cy: 2.5, sd: 0.6, weight: 1 },
    { cx: 7.6, cy: 3.0, sd: 0.6, weight: 1 },
    { cx: 5.0, cy: 7.8, sd: 0.6, weight: 1 },
  ]),
  overlap: (n, random) => blobs(n, random, [
    { cx: 3.6, cy: 4.0, sd: 1.15, weight: 1 },
    { cx: 6.4, cy: 4.2, sd: 1.15, weight: 1 },
    { cx: 5.0, cy: 6.4, sd: 1.15, weight: 1 },
  ]),
  rings,
  moons,
  density,
  // Clusters of unequal size: 60%, 30% and 10% of the points.
  sizes: (n, random) => blobs(n, random, [
    { cx: 2.8, cy: 6.8, sd: 0.8, weight: 6 },
    { cx: 7.4, cy: 6.0, sd: 0.8, weight: 3 },
    { cx: 5.2, cy: 2.2, sd: 0.8, weight: 1 },
  ]),
};

// Dataset keys, in the order a lab lists them.
export const CLUSTER_KEYS = Object.keys(GENERATORS);

// How many true clusters each dataset has (noise points, label -1, are not a cluster).
export const CLUSTER_COUNT = { blobs: 3, overlap: 3, rings: 2, moons: 2, density: 2, sizes: 3 };

// Make a dataset: n points (default 150, whole number >= 0), reproducible from `seed`.
export function makeClusterData(key, { n = DEFAULT_N, seed = DEFAULT_SEED } = {}) {
  const make = GENERATORS[key];
  if (!make) throw new Error(`unknown cluster dataset "${key}"; try one of ${CLUSTER_KEYS.join(', ')}`);
  const count = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : DEFAULT_N;
  const random = rng(seed);
  const { points, truth } = make(count, random);
  const order = shuffle(points.map((_, i) => i), random);
  return { points: order.map((i) => points[i]), truth: order.map((i) => truth[i]) };
}

// The name and one-line description in the current language. A function, not a constant,
// because tr() is evaluated at use time and the visitor can switch language at any moment.
export function describeDataset(key) {
  switch (key) {
    case 'blobs':
      return { key, name: tr('Three blobs', 'Tiga gumpalan'),
        description: tr('Three round, well-separated groups: the easy case.', 'Tiga kelompok bulat yang terpisah jelas: kasus termudah.') };
    case 'overlap':
      return { key, name: tr('Overlapping blobs', 'Gumpalan tumpang tindih'),
        description: tr('Three round groups whose edges run into each other, so some points could belong to either.', 'Tiga kelompok bulat yang tepinya saling bertemu, jadi sebagian titik bisa masuk ke kelompok mana pun.') };
    case 'rings':
      return { key, name: tr('Two rings', 'Dua cincin'),
        description: tr('One ring inside another: same centre, different radius.', 'Satu cincin di dalam cincin lain: pusat sama, jari-jari berbeda.') };
    case 'moons':
      return { key, name: tr('Two moons', 'Dua bulan sabit'),
        description: tr('Two half-circles that hook into each other.', 'Dua setengah lingkaran yang saling mengait.') };
    case 'density':
      return { key, name: tr('Unequal density', 'Kepadatan tak seimbang'),
        description: tr('One tight cluster, one loose cluster and a scatter of noise points.', 'Satu kelompok rapat, satu kelompok longgar, dan sebaran titik derau.') };
    case 'sizes':
      return { key, name: tr('Unequal sizes', 'Ukuran tak seimbang'),
        description: tr('Three clusters holding 60%, 30% and 10% of the points.', 'Tiga kelompok yang memuat 60%, 30%, dan 10% dari titik.') };
    default:
      throw new Error(`unknown cluster dataset "${key}"`);
  }
}
