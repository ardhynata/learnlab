// Figures for the lesson "k-means, step by step". The numbers in the lesson text and in these figures
// come from one place: the penguin flipper lengths below (rows 2 to 4 and 154 to 156 of
// data/penguins.csv), and the k-means lab itself (sims/kmeans-engine.js on the course dataset), so a
// learner who runs the lab sees exactly what the figures show.
import { svg, dot, diamond, text, line, box, k, tr, fmt } from '../kit.js';
import { startClustering, advanceClustering, clusteringCost } from '../../sims/kmeans-engine.js';
import { makeDataset, SHARED_SEED } from '../../sims/datasets.js';

const ink = { weight: 700, fill: 'var(--ink)' };

// 1. The loop as a flowchart: pick k, assign, update, "did any point change?".
function loop() {
  return svg(760, 200, `
${box(5, 58, 150, 70)}${text(80, 86, tr('Start', 'Mulai'), ink)}${text(80, 105, tr('k centroids', 'k centroid'))}
${line(155, 93, 195, 93, { w: 2, c: 'var(--muted)', arrow: true })}
${box(200, 58, 170, 70, 'var(--accent-soft)', 'var(--accent)')}${text(285, 86, 'Assign', ink)}${text(285, 105, tr('each point to its', 'tiap titik ke'))}${text(285, 120, tr('nearest centroid', 'centroid terdekat'))}
${line(370, 93, 410, 93, { w: 2, c: 'var(--muted)', arrow: true })}
${box(415, 58, 170, 70, 'var(--accent-soft)', 'var(--accent)')}${text(500, 86, 'Update', ink)}${text(500, 105, tr('each centroid to the', 'tiap centroid ke'))}${text(500, 120, tr('mean of its points', 'rata-rata titiknya'))}
${line(585, 93, 625, 93, { w: 2, c: 'var(--muted)', arrow: true })}
<path d="M695 52l65 41-65 41-65-41z" fill="var(--surface)" stroke="var(--line)" stroke-width="1.6"/>${text(695, 89, tr('Did a point', 'Ada titik'), { size: 12, fill: 'var(--ink)' })}${text(695, 104, tr('change cluster?', 'pindah cluster?'), { size: 12, fill: 'var(--ink)' })}
<path d="M695 52 V24 H285 V54" fill="none" stroke="var(--muted)" stroke-width="2" marker-end="url(#arr)"/>${text(490, 17, tr('yes: go around again', 'ya: ulangi'), { size: 12 })}
${line(695, 134, 695, 168, { w: 2, c: 'var(--muted)', arrow: true })}${text(695, 186, tr('no: stop (converged)', 'tidak: konvergen'), { size: 12, ...ink })}`);
}

// 2. The worked example: six penguins, one feature, k = 2, four assign passes. Each row shows the
// centroids used for that pass (diamonds) and the clusters the pass gives (colors).
const FLIPPERS = [181, 186, 195, 210, 211, 230];
const PASSES = [
  { cents: [181, 186], groups: [0, 1, 1, 1, 1, 1] },
  { cents: [181, 206.4], groups: [0, 0, 1, 1, 1, 1] },
  { cents: [183.5, 211.5], groups: [0, 0, 0, 1, 1, 1] },
  { cents: [187 + 1 / 3, 217], groups: [0, 0, 0, 1, 1, 1] },
];
function worked() {
  const X = v => 36 + (v - 176) * 10.4;
  const row = (y, i) => {
    const { cents, groups } = PASSES[i];
    const title = i === PASSES.length - 1
      ? tr(`Pass ${fmt(i + 1)}: centroids ${fmt(187.33)} and ${fmt(217)}, nothing changes: stop`, `Pass ${fmt(i + 1)}: centroid ${fmt(187.33)} dan ${fmt(217)}, tidak ada yang berubah: berhenti`)
      : tr(`Pass ${fmt(i + 1)}: centroids ${fmt(cents[0])} and ${fmt(cents[1])}`, `Pass ${fmt(i + 1)}: centroid ${fmt(cents[0])} dan ${fmt(cents[1])}`);
    const labels = FLIPPERS.map((v, j) => {
      const anchor = v === 210 ? 'end' : v === 211 ? 'start' : 'middle', dx = v === 210 ? 2 : v === 211 ? -2 : 0;
      return text(X(v) + dx, y - 12, fmt(v), { size: 11, anchor });
    }).join('');
    const cLabels = cents.map((v, c) => text(X(v), y + 48, fmt(v, { max: 2 }), { size: 11, fill: k(c) })).join('');
    return `${text(10, y - 34, title, { anchor: 'start', ...ink, size: 13 })}${line(X(176), y, X(233), y, { w: 1.6 })}${labels}${FLIPPERS.map((v, j) => dot(X(v), y, k(groups[j]), 5.5)).join('')}${cents.map((v, c) => diamond(X(v), y + 26, k(c), 8.5)).join('')}${cLabels}`;
  };
  return svg(640, 460, `${[0, 1, 2, 3].map(i => row(56 + i * 104, i)).join('')}
${dot(430, 446, k(0), 5)}${text(441, 450, tr('cluster 1', 'cluster 1'), { anchor: 'start', size: 12 })}${dot(515, 446, k(1), 5)}${text(526, 450, tr('cluster 2', 'cluster 2'), { anchor: 'start', size: 12 })}${text(10, 450, tr('flipper length (mm); diamonds are centroids', 'panjang sirip (mm); belah ketupat = centroid'), { anchor: 'start', size: 12 })}`);
}

// 3. Inertia after every Next step of the lab's default run (Overlapping clusters, k = 2, Instant speed).
function labRun(name, nClusters) {
  const points = makeDataset(name, SHARED_SEED, 48);
  let model = startClustering(points, nClusters, 214, undefined, 'euclidean', 8);
  const readings = [];
  let guard = 0;
  while (model.phase !== 'done' && guard++ < 1000) {
    const phase = model.phase;
    model = advanceClustering(points, model, true, 1);
    readings.push({ phase, cost: clusteringCost(points, model) });
  }
  return { points, model, readings };
}
function inertia() {
  const { readings } = labRun('clusters', 2);
  const W = 640, H = 330, left = 64, right = 24, top = 40, bottom = 232;
  const hi = 280, lo = 100;
  const X = i => left + i * (W - left - right) / (readings.length - 1), Y = v => bottom - (v - lo) / (hi - lo) * (bottom - top);
  const path = readings.map((r, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(r.cost).toFixed(1)}`).join('');
  const grid = [100, 150, 200, 250].map(v => `${line(left, Y(v), W - right, Y(v), { w: 1 })}${text(left - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 11 })}`).join('');
  const first = readings[0], last = readings.at(-1);
  return svg(W, H, `${text(left, 18, tr('Inertia after each Next step (Overlapping clusters, k = 2)', 'Inertia setelah tiap Langkah berikutnya (Cluster tumpang tindih, k = 2)'), { anchor: 'start', ...ink, size: 14 })}
${grid}${line(left, bottom, W - right, bottom, { c: 'var(--muted)', w: 1.6 })}
<path d="${path}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linejoin="round"/>
${readings.map((r, i) => (r.phase === 'assign' ? dot(X(i), Y(r.cost), k(0), 5) : diamond(X(i), Y(r.cost), k(1), 5.5))).join('')}
${text(X(0) + 10, Y(first.cost) - 8, fmt(first.cost, { digits: 2 }), { anchor: 'start', size: 12, ...ink })}${text(X(readings.length - 1), Y(last.cost) - 14, fmt(last.cost, { digits: 2 }), { anchor: 'end', size: 12, ...ink })}
${readings.map((r, i) => text(X(i), bottom + 16, fmt(i + 1), { size: 11 })).join('')}${text((left + W - right) / 2, bottom + 34, tr('step number', 'nomor langkah'), { size: 12 })}
${dot(left + 6, H - 34, k(0), 5)}${text(left + 18, H - 30, tr('after an assign step', 'setelah langkah assign'), { anchor: 'start', size: 12 })}${diamond(left + 200, H - 34, k(1), 5.5)}${text(left + 213, H - 30, tr('after an update step', 'setelah langkah update'), { anchor: 'start', size: 12 })}
${text((left + W - right) / 2, H - 10, tr('the last two readings are equal: nothing moved', 'dua pembacaan terakhir sama: tidak ada yang bergeser'), { size: 12 })}`);
}

// 4. Three lab datasets after k-means converges, from the lab's typed-k start.
function limits() {
  const panels = [
    ['clusters', 2, tr('Overlapping clusters, k = 2', 'Cluster tumpang tindih, k = 2'), tr('two blobs: a fair split', 'dua gumpalan: wajar')],
    ['rings', 2, tr('Concentric rings, k = 2', 'Cincin konsentris, k = 2'), tr('a straight cut through both', 'potongan lurus di keduanya')],
    ['checker', 4, tr('Checkerboard, k = 4', 'Papan catur, k = 4'), tr('the four blocks, found', 'keempat blok terpisah')],
  ];
  const size = 188, top = 58;
  const body = panels.map(([name, nClusters, title, note], p) => {
    const { points, model } = labRun(name, nClusters);
    const ox = 14 + p * 208, X = x => ox + x / 10 * size, Y = y => top + size - y / 10 * size;
    const cost = fmt(clusteringCost(points, model), { digits: 2 });
    return `<g>${text(ox + size / 2, 16, title, { ...ink, size: 13 })}${text(ox + size / 2, 34, note, { size: 12 })}
<rect x="${ox}" y="${top}" width="${size}" height="${size}" rx="2" fill="none" stroke="var(--line)" stroke-width="1.6"/>
${points.map((q, i) => dot(X(q.x), Y(q.y), k(model.assignments[i]), 3.8)).join('')}${model.centroids.map((c, i) => diamond(X(c.x), Y(c.y), k(i), 8)).join('')}
${text(ox + size / 2, top + size + 20, `Inertia ${cost}`, { ...ink, size: 12.5 })}</g>`;
  }).join('');
  return svg(640, 304, `${body}${text(320, 296, tr('dots: points by cluster; diamonds: final centroids', 'titik: warna cluster; belah ketupat: centroid akhir'), { size: 12 })}`);
}

export const figures = { 'loop': loop, 'worked': worked, 'inertia': inertia, 'limits': limits };
