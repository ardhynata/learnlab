// Figures for the Clustering course: [[figure:name|Caption]] in its lessons.
import { svg, dot, ring, cross, diamond, text, line, box, k, soft, tr, fmt } from './kit.js';

// Three ways to measure the distance between two points.
function distances() {
  return svg(660, 210, `
${text(110, 24, tr('Euclidean', 'Euclidean'), { weight: 700, fill: 'var(--ink)' })}${text(330, 24, 'Manhattan', { weight: 700, fill: 'var(--ink)' })}${text(550, 24, tr('Cosine', 'Cosine'), { weight: 700, fill: 'var(--ink)' })}
${line(40, 160, 180, 60, { c: k(0), w: 3.5 })}${dot(40, 160, 'var(--ink)')}${dot(180, 60, 'var(--ink)')}${text(110, 195, tr('straight line', 'garis lurus'))}
${line(260, 160, 400, 160, { c: k(1), w: 3.5 })}${line(400, 160, 400, 60, { c: k(1), w: 3.5 })}${line(260, 160, 400, 60, { dash: '4 5', w: 1.6 })}${dot(260, 160, 'var(--ink)')}${dot(400, 60, 'var(--ink)')}${text(330, 195, tr('along the axes, like city blocks', 'mengikuti sumbu, seperti blok kota'))}
${line(480, 170, 600, 70, { c: k(2), w: 3.5, arrow: true })}${line(480, 170, 636, 150, { c: k(2), w: 3.5, arrow: true })}<path d="M514 142 A44 44 0 0 1 524 164" stroke="var(--ink)" stroke-width="2" fill="none"/>${dot(480, 170, 'var(--ink)', 4)}${text(550, 195, tr('angle between directions', 'sudut antar arah'))}`);
}

// Why features need a common scale.
function scaling() {
  const wide = [[40, 118], [95, 100], [150, 124], [205, 96], [260, 120], [60, 140], [175, 105], [235, 135]];
  const round = [[420, 95], [455, 130], [490, 100], [520, 135], [440, 115], [500, 118], [470, 85], [415, 140]];
  return svg(640, 220, `
${text(155, 24, tr('Unscaled: income decides everything', 'Belum di-scale: pendapatan dominan'), { weight: 700, fill: 'var(--ink)' })}${text(480, 24, tr('Scaled: both features count', 'Sudah di-scale: kedua feature berperan'), { weight: 700, fill: 'var(--ink)' })}
${line(20, 175, 290, 175, { c: 'var(--muted)', w: 1.6, arrow: true })}${line(20, 175, 20, 50, { c: 'var(--muted)', w: 1.6, arrow: true })}
${line(390, 175, 560, 175, { c: 'var(--muted)', w: 1.6, arrow: true })}${line(390, 175, 390, 50, { c: 'var(--muted)', w: 1.6, arrow: true })}
${wide.map(([x, y]) => dot(x, y, k(0), 5.5)).join('')}${round.map(([x, y]) => dot(x, y, k(0), 5.5)).join('')}
${text(155, 198, tr('income (tens of thousands)', 'pendapatan (puluhan ribu)'))}${text(475, 198, tr('income (standardized)', 'pendapatan (standardisasi)'))}<g transform="translate(10 112) rotate(-90)">${text(0, 0, tr('age', 'usia'))}</g><g transform="translate(380 112) rotate(-90)">${text(0, 0, tr('age', 'usia'))}</g>
${line(40, 70, 260, 70, { c: k(1), w: 2, dash: '5 4', arrow: true })}${text(150, 62, tr('distances stretch here', 'jarak menjadi melebar di sini'), { fill: k(1) })}`);
}

// The k-means loop as a flowchart.
function kmeansLoop() {
  return svg(760, 190, `
${box(5, 55, 150, 64)}${text(80, 82, tr('Pick k', 'Pilih k'), { weight: 700, fill: 'var(--ink)' })}${text(80, 100, tr('starting centroids', 'centroid awal'))}
${line(155, 87, 195, 87, { w: 2, c: 'var(--muted)', arrow: true })}
${box(200, 55, 170, 64, 'var(--accent-soft)', 'var(--accent)')}${text(285, 82, tr('Assign points', 'Masukkan titik'), { weight: 700, fill: 'var(--ink)' })}${text(285, 100, tr('to nearest centroid', 'ke centroid terdekat'))}
${line(370, 87, 410, 87, { w: 2, c: 'var(--muted)', arrow: true })}
${box(415, 55, 170, 64, 'var(--accent-soft)', 'var(--accent)')}${text(500, 82, tr('Update centroids', 'Geser centroid'), { weight: 700, fill: 'var(--ink)' })}${text(500, 100, tr('to cluster centers', 'ke pusat cluster'))}
${line(585, 87, 625, 87, { w: 2, c: 'var(--muted)', arrow: true })}
<path d="M695 47l65 40-65 40-65-40z" fill="var(--surface)" stroke="var(--line)" stroke-width="1.6"/>${text(695, 84, tr('Any point', 'Ada titik'), { size: 12, fill: 'var(--ink)' })}${text(695, 99, tr('changed?', 'yang pindah?'), { size: 12, fill: 'var(--ink)' })}
<path d="M695 47 V22 H285 V50" fill="none" stroke="var(--muted)" stroke-width="2" marker-end="url(#arr)"/>${text(490, 16, tr('yes: repeat', 'ya: ulangi'), { size: 12 })}
${line(695, 127, 695, 160, { w: 2, c: 'var(--muted)', arrow: true })}${text(695, 178, tr('no: converged', 'tidak: konvergen'), { size: 12, weight: 700, fill: 'var(--ink)' })}`);
}

// 1-D worked example from the lesson, in three snapshots.
function kmeansWorked() {
  const X = v => 40 + v * 45;
  const pts = [1, 2, 3, 10, 11, 12];
  const row = (y, title, cents, assign) => `${text(10, y - 30, title, { anchor: 'start', weight: 700, fill: 'var(--ink)' })}${line(X(0), y, X(13), y, { w: 1.6 })}${pts.map((p, i) => dot(X(p), y, k(assign[i]), 7) + text(X(p), y - 13, fmt(p), { size: 11 })).join('')}${cents.map(([v, c]) => diamond(X(v), y + 24, k(c), 9)).join('')}`;
  return svg(620, 300, `
${row(46, tr('Start: centroids at 1 and 2', 'Awal: centroid di 1 dan 2'), [[1, 0], [2, 1]], [0, 1, 1, 1, 1, 1])}
${row(140, tr(`After update 1: centroids at 1 and ${fmt(7.6)}`, `Setelah update 1: centroid di 1 dan ${fmt(7.6)}`), [[1, 0], [7.6, 1]], [0, 0, 0, 1, 1, 1])}
${row(234, tr('After update 2: centroids at 2 and 11 (converged)', 'Setelah update 2: centroid di 2 dan 11 (konvergen)'), [[2, 0], [11, 1]], [0, 0, 0, 1, 1, 1])}`);
}

// Inertia against k, with the elbow marked.
function elbow() {
  const ks = [1, 2, 3, 4, 5, 6, 7, 8], v = [100, 55, 28, 22, 18, 16, 15, 14.5];
  const X = n => 70 + (n - 1) * 62, Y = e => 190 - e * 1.5;
  const path = ks.map((n, i) => `${i ? 'L' : 'M'}${X(n)} ${Y(v[i])}`).join('');
  return svg(580, 250, `
${line(60, 200, 560, 200, { c: 'var(--muted)', w: 1.6, arrow: true })}${line(60, 200, 60, 20, { c: 'var(--muted)', w: 1.6, arrow: true })}
<path d="${path}" fill="none" stroke="${k(0)}" stroke-width="3.2" stroke-linejoin="round"/>
${ks.map((n, i) => dot(X(n), Y(v[i]), k(0), 5)).join('')}${ks.map(n => text(X(n), 220, fmt(n))).join('')}
<circle cx="${X(3)}" cy="${Y(28)}" r="14" fill="none" stroke="${k(1)}" stroke-width="2.5"/>${text(X(3) + 22, Y(28) - 22, tr('the elbow', 'elbow'), { anchor: 'start', weight: 700, fill: k(1) })}
${text(310, 240, tr('number of clusters k', 'jumlah cluster k'))}${text(10, 16, 'inertia', { anchor: 'start' })}`);
}

// Core, border and noise points with the epsilon circle.
function dbscanTypes() {
  const core = [[250, 120], [225, 90], [270, 142], [232, 152], [210, 122], [255, 86]];
  return svg(650, 250, `
<circle cx="250" cy="120" r="62" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 5"/>
${line(250, 120, 312, 120, { w: 2, c: 'var(--accent)' })}${text(284, 112, 'ε', { fill: 'var(--accent)', weight: 700, size: 15 })}
${core.map(([x, y]) => dot(x, y, k(0), 6.5)).join('')}${ring(292, 90, k(0), 7)}${cross(105, 65)}${cross(150, 205)}
${dot(400, 70, k(0), 6.5)}${text(420, 75, tr('core: enough neighbors', 'core: tetangganya cukup'), { anchor: 'start' })}${ring(400, 112, k(0), 7)}${text(420, 117, tr('border: reached by a core point', 'border: dijangkau core point'), { anchor: 'start' })}${cross(400, 154)}${text(420, 159, tr('noise: joins no cluster', 'noise: tidak masuk cluster'), { anchor: 'start' })}
${text(250, 235, tr('The dashed circle is one core point’s ε-neighborhood', 'Lingkaran putus-putus = ε-neighborhood satu core point'))}`);
}

// Same points, three epsilons.
function epsEffect() {
  const A = [[40, 100], [60, 120], [80, 95], [50, 140], [75, 135], [95, 118]];
  const B = [[150, 100], [170, 125], [190, 95], [160, 140], [185, 135], [205, 115]];
  const N = [[15, 40], [225, 170]];
  const panel = (ox, title, mode, note) => {
    const draw = (list, color) => list.map(([x, y]) => (mode === 'noise' ? cross(x, y + 20) : dot(x, y + 20, color, 5.5))).join('');
    const loners = N.map(([x, y]) => (mode === 'big' ? dot(x, y + 20, k(0), 5.5) : cross(x, y + 20))).join('');
    return `<g transform="translate(${ox},0)">${box(0, 30, 240, 170)}${text(120, 20, title, { weight: 700, fill: 'var(--ink)' })}${draw(A, mode === 'big' ? k(0) : k(0))}${draw(B, mode === 'big' ? k(0) : k(1))}${loners}${text(120, 222, note)}</g>`;
  };
  return svg(740, 236, `
${panel(0, tr('ε too small', 'ε terlalu kecil'), 'noise', tr('almost everything is noise', 'hampir semuanya noise'))}
${panel(250, tr('ε about right', 'ε pas'), 'right', tr('two clusters, two noise points', 'dua cluster, dua titik noise'))}
${panel(500, tr('ε too large', 'ε terlalu besar'), 'big', tr('separate clusters merge into one', 'cluster terpisah menjadi menyatu'))}`);
}

// A small decision flow for picking an algorithm.
function decisionFlow() {
  return svg(700, 270, `
${box(210, 10, 280, 50, 'var(--accent-soft)', 'var(--accent)')}${text(350, 40, tr('What do the groups look like?', 'Bentuk kelompoknya?'), { weight: 700, fill: 'var(--ink)' })}
<path d="M350 60V80M350 80H110V105M350 80H350V105M350 80H590V105" fill="none" stroke="var(--muted)" stroke-width="2" marker-end="url(#arr)"/>
${box(10, 105, 200, 56)}${text(110, 130, tr('Round blobs,', 'Gumpalan bulat,'), { fill: 'var(--ink)' })}${text(110, 148, tr('k roughly known', 'k kira-kira diketahui'), { fill: 'var(--ink)' })}
${box(250, 105, 200, 56)}${text(350, 130, tr('Odd shapes, or outliers', 'Bentuk aneh, atau outlier'), { fill: 'var(--ink)' })}${text(350, 148, tr('to set aside', 'yang ingin disisihkan'), { fill: 'var(--ink)' })}
${box(490, 105, 200, 56)}${text(590, 130, tr('Very different', 'Density-nya sangat'), { fill: 'var(--ink)' })}${text(590, 148, tr('densities', 'berbeda-beda'), { fill: 'var(--ink)' })}
${line(110, 161, 110, 195, { w: 2, c: 'var(--muted)', arrow: true })}${line(350, 161, 350, 195, { w: 2, c: 'var(--muted)', arrow: true })}${line(590, 161, 590, 195, { w: 2, c: 'var(--muted)', arrow: true })}
${box(30, 198, 160, 50, soft(0), k(0))}${text(110, 228, 'k-means', { weight: 700, fill: 'var(--ink)', size: 15 })}
${box(270, 198, 160, 50, soft(1), k(1))}${text(350, 228, 'DBSCAN', { weight: 700, fill: 'var(--ink)', size: 15 })}
${box(490, 198, 200, 50, 'var(--surface)', 'var(--line)')}${text(590, 220, tr('Scale and re-check;', 'Scale dulu, lalu cek ulang;'), { fill: 'var(--ink)' })}${text(590, 238, tr('neither is a clean fit', 'keduanya kurang cocok'), { fill: 'var(--ink)' })}`);
}

export const figures = {
  distances, scaling,
  'kmeans-loop': kmeansLoop, 'kmeans-worked': kmeansWorked, elbow,
  'dbscan-types': dbscanTypes, 'eps-effect': epsEffect,
  'decision-flow': decisionFlow,
};
