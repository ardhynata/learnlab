// Figures for the "Choosing a clustering method" lesson. The scatter panels and the silhouette bars are
// computed from the course's own generated data (sims/ml/clusterdata.js, default seed and size) with the
// same clustering code the methods lab uses, so they agree with the lesson text and with the lab.
import { svg, dot, cross, text, line, box, k, soft, tr, fmt } from '../kit.js';
import { makeClusterData, CLUSTER_COUNT } from '../../sims/ml/clusterdata.js';
import { kmeans, agglomerative, cutTree, dbscan, silhouette } from '../../sims/ml/clustermethods.js';

// ---- Figure 1: a first-pass guide, three questions and a fallback. ----
function decisionFlow() {
  const rows = [
    [[tr('Round blobs, and every point', 'Gumpalan bulat, dan setiap titik'), tr('must land in a group?', 'harus masuk ke satu kelompok?')],
      'k-means', tr('fast; you choose k', 'cepat; kamu memilih k'), 0],
    [[tr('Curved shapes, or points that', 'Bentuk melengkung, atau titik yang'), tr('belong to no group?', 'tidak masuk kelompok mana pun?')],
      'DBSCAN', tr('set eps and MinPts', 'atur eps dan MinPts'), 1],
    [[tr('Small data, and you want to see', 'Data kecil, dan ingin melihat'), tr('how groups nest before choosing k?', 'kelompok bersarang sebelum memilih k?')],
      'Hierarchical', tr('cut the dendrogram at k', 'potong dendrogram di k'), 2],
  ];
  const qx = 0, qw = 372, rx = 430, rw = 210, h = 62, pitch = 104, top = 8;
  const body = rows.map(([q, name, sub, c], i) => {
    const y = top + i * pitch, mid = y + h / 2;
    return `${box(qx, y, qw, h, 'var(--surface)', 'var(--line)')}
${text(qx + qw / 2, y + 26, q[0], { fill: 'var(--ink)', size: 14 })}
${text(qx + qw / 2, y + 46, q[1], { fill: 'var(--ink)', size: 14 })}
${line(qx + qw + 3, mid, rx - 3, mid, { c: 'var(--muted)', w: 2, arrow: true })}
${text((qx + qw + rx) / 2, mid - 8, tr('yes', 'ya'), { size: 13, fill: 'var(--ink)', weight: 700 })}
${box(rx, y, rw, h, soft(c), k(c))}
${text(rx + rw / 2, y + 28, name, { fill: 'var(--ink)', weight: 700, size: 16 })}
${text(rx + rw / 2, y + 48, sub, { size: 13, fill: 'var(--ink)' })}
${line(qx + qw / 2, y + h + 3, qx + qw / 2, y + pitch - 3, { c: 'var(--muted)', w: 2, arrow: true })}
${text(qx + qw / 2 + 9, y + h + 24, tr('no', 'tidak'), { anchor: 'start', size: 13, fill: 'var(--ink)', weight: 700 })}`;
  }).join('');
  const by = top + 3 * pitch;
  const last = `${box(qx, by, 640, 58, soft(3), k(3))}
${text(320, by + 24, tr('Still unsure? Start with k-means, then run a second method and compare.', 'Ragu? Mulai dengan k-means, lalu coba metode kedua dan bandingkan.'), { fill: 'var(--ink)', size: 14, weight: 700 })}
${text(320, by + 44, tr('Always plot the result, scale the features and test stability.', 'Selalu plot hasilnya, scale fiturnya, dan uji kestabilannya.'), { fill: 'var(--ink)', size: 13 })}`;
  return svg(640, by + 64, `${body}${last}`);
}

// ---- Figure 2: the same three datasets, four ways of clustering them. ----
const PANEL = 144, PAD = 6;
function panelDots(points, labels, ox, oy) {
  const u = (PANEL - 2 * PAD) / 10;
  const X = v => ox + PAD + v * u, Y = v => oy + PANEL - PAD - v * u;
  return points.map((p, i) => (labels[i] < 0
    ? cross(X(p[0]), Y(p[1]), 'var(--muted)').replace('stroke-width="2.4"', 'stroke-width="1.4"')
    : dot(X(p[0]), Y(p[1]), k(labels[i] % 7), 2.7))).join('');
}
function summaryOf(labels) {
  const groups = new Set(labels.filter(l => l >= 0)).size, noise = labels.filter(l => l < 0).length;
  const g = groups === 1 ? tr('1 cluster', '1 cluster') : tr(`${groups} clusters`, `${groups} cluster`);
  return noise ? tr(`${g}, ${noise} noise`, `${g}, ${noise} noise`) : g;
}
function sameDataFourWays() {
  const sets = [
    ['blobs', tr('Three blobs', 'Tiga gumpalan'), 1],
    ['rings', tr('Two rings', 'Dua cincin'), 1],
    ['density', tr('Unequal density', 'Kepadatan tidak seimbang'), 1],
  ];
  const cols = [
    tr('k-means', 'k-means'),
    tr('Hierarchical, ward', 'Hierarchical, ward'),
    tr('Hierarchical, single', 'Hierarchical, single'),
    'DBSCAN',
  ];
  const gap = (640 - 4 * PANEL) / 3, rowH = 198, top = 30;
  let body = cols.map((c, j) => text(j * (PANEL + gap) + PANEL / 2, 16, c, { fill: 'var(--ink)', weight: 700, size: 13 })).join('');
  sets.forEach(([key, name], i) => {
    const { points } = makeClusterData(key);
    const kk = CLUSTER_COUNT[key];
    const merges = { ward: agglomerative(points, { linkage: 'ward' }), single: agglomerative(points, { linkage: 'single' }) };
    const results = [
      kmeans(points, kk, { restarts: 5 }).labels,
      cutTree(merges.ward, points.length, kk),
      cutTree(merges.single, points.length, kk),
      dbscan(points, { eps: 1, minPts: 4 }).labels,
    ];
    const oy = top + i * rowH;
    body += text(0, oy + 12, name, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 });
    results.forEach((labels, j) => {
      const ox = j * (PANEL + gap), py = oy + 20;
      body += `${box(ox, py, PANEL, PANEL, 'var(--surface)', 'var(--line)')}${panelDots(points, labels, ox, py)}
${text(ox + PANEL / 2, py + PANEL + 16, summaryOf(labels), { size: 12, fill: 'var(--ink)' })}`;
    });
  });
  const ny = top + 3 * rowH + 4;
  const n1 = tr('Same points in each row (150 per dataset). Hierarchical columns are cut at the true number of clusters.',
    'Titik yang sama di setiap baris (150 per dataset). Kolom hierarchical dipotong pada jumlah cluster sebenarnya.');
  const n2 = tr(`DBSCAN uses eps ${fmt(1, { digits: 1 })} and MinPts 4. Grey crosses are noise points.`,
    `DBSCAN memakai eps ${fmt(1, { digits: 1 })} dan MinPts 4. Tanda silang abu-abu adalah noise.`);
  return svg(640, ny + 28, `${body}${text(320, ny + 8, n1, { size: 12 })}${text(320, ny + 25, n2, { size: 12 })}`);
}

// ---- Figure 3: the silhouette favors the wrong grouping on rings and moons. ----
function silhouetteTrap() {
  const cases = [
    ['rings', tr('Two rings', 'Dua cincin'), 1.0],
    ['moons', tr('Two moons', 'Dua bulan sabit'), 0.8],
  ].map(([key, name, eps]) => {
    const { points } = makeClusterData(key);
    const km = kmeans(points, CLUSTER_COUNT[key], { restarts: 5 }).labels;
    const db = dbscan(points, { eps, minPts: 4 }).labels;
    return { name, wrong: silhouette(points, km).mean, right: silhouette(points, db).mean };
  });
  const left = 70, base = 196, scale = 128, bw = 64;
  const Y = v => base - v * scale;
  const grid = [0, 0.25, 0.5, 0.75, 1].map(t => `${line(left, Y(t), 628, Y(t), { c: 'var(--line)', w: 1.2 })}${text(left - 8, Y(t) + 4, fmt(t, { digits: 2 }), { anchor: 'end', size: 12 })}`).join('');
  const gw = 280;
  const bars = cases.map((c, i) => {
    const gx = left + 24 + i * gw;
    const bar = (x, v, col) => `<rect x="${x}" y="${Y(v)}" width="${bw}" height="${Math.max(1, base - Y(v))}" rx="3" fill="${k(col)}"/>${text(x + bw / 2, Y(v) - 7, fmt(v, { digits: 2 }), { fill: 'var(--ink)', size: 14, weight: 700 })}`;
    return `${bar(gx, c.wrong, 0)}${bar(gx + bw + 14, c.right, 2)}${text(gx + bw + 7, base + 22, c.name, { fill: 'var(--ink)', weight: 700, size: 14 })}`;
  }).join('');
  const legend = `${box(left, 22, 14, 14, k(0), k(0))}${text(left + 22, 34, tr('k-means: cuts across the shapes', 'k-means: memotong bentuknya'), { anchor: 'start', fill: 'var(--ink)', size: 12.5 })}
${box(left + 270, 22, 14, 14, k(2), k(2))}${text(left + 292, 34, tr('DBSCAN: the correct groups', 'DBSCAN: kelompok yang benar'), { anchor: 'start', fill: 'var(--ink)', size: 12.5 })}`;
  return svg(640, 238, `${text(left - 62, 12, tr('Mean silhouette score (higher looks better)', 'Silhouette score rata-rata (makin tinggi tampak makin baik)'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}${legend}${grid}${line(left, base, 628, base, { c: 'var(--muted)', w: 1.6 })}${bars}`);
}

// ---- Figure 4: penguins, k-means with k = 3, raw columns against standardized columns. ----
// Computed once with the lesson's own code on the 342 penguins that have all four measurements (data/penguins.csv):
// kmeans(rows, 3, { restarts: 10 }); silhouette(...).mean; purity(labels, species). Standardizing = columnStats + standardize.
const PENGUINS = {
  raw: { silhouette: 0.58, purity: 0.68 },
  standardized: { silhouette: 0.45, purity: 0.92 },
};
function penguinsScaling() {
  const left = 70, base = 196, scale = 128, bw = 64, gw = 280;
  const Y = v => base - v * scale;
  const grid = [0, 0.25, 0.5, 0.75, 1].map(t => `${line(left, Y(t), 628, Y(t), { c: 'var(--line)', w: 1.2 })}${text(left - 8, Y(t) + 4, fmt(t, { digits: 2 }), { anchor: 'end', size: 12 })}`).join('');
  const groups = [
    [tr('Raw columns', 'Kolom mentah'), PENGUINS.raw],
    [tr('Standardized columns', 'Kolom hasil standardisasi'), PENGUINS.standardized],
  ];
  const bars = groups.map(([name, v], i) => {
    const gx = left + 24 + i * gw;
    const bar = (x, val, col) => `<rect x="${x}" y="${Y(val)}" width="${bw}" height="${Math.max(1, base - Y(val))}" rx="3" fill="${k(col)}"/>${text(x + bw / 2, Y(val) - 7, fmt(val, { digits: 2 }), { fill: 'var(--ink)', size: 14, weight: 700 })}`;
    return `${bar(gx, v.silhouette, 0)}${bar(gx + bw + 14, v.purity, 2)}${text(gx + bw + 7, base + 22, name, { fill: 'var(--ink)', weight: 700, size: 14 })}`;
  }).join('');
  const legend = `${box(left, 22, 14, 14, k(0), k(0))}${text(left + 22, 34, tr('Silhouette score', 'Silhouette score'), { anchor: 'start', fill: 'var(--ink)', size: 12.5 })}
${box(left + 170, 22, 14, 14, k(2), k(2))}${text(left + 192, 34, tr('Share of penguins grouped with their own species', 'Porsi penguin yang sekelompok dengan spesiesnya'), { anchor: 'start', fill: 'var(--ink)', size: 12.5 })}`;
  return svg(640, 238, `${text(left - 62, 12, tr('k-means, k = 3, on 342 penguins', 'k-means, k = 3, pada 342 penguin'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}${legend}${grid}${line(left, base, 628, base, { c: 'var(--muted)', w: 1.6 })}${bars}`);
}

export const figures = {
  'decision-flow': decisionFlow,
  'same-data-four-ways': sameDataFourWays,
  'silhouette-trap': silhouetteTrap,
  'penguins-scaling': penguinsScaling,
};
