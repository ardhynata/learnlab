// Figures for the "The silhouette score" lesson. The scatter panels use the course's own cluster generators
// (seed 7, 150 points), and every score they show is computed here with the lesson's formula
// s = (b - a) / max(a, b), so the figures agree with the lesson text.
import { svg, dot, ring, text, line, box, k, tr, fmt } from '../kit.js';
import { makeClusterData } from '../../sims/ml/clusterdata.js';
import { rng } from '../../sims/ml/rng.js';

const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

// Silhouette of every point (Euclidean distance). A point alone in its cluster scores 0.
function silhouette(points, labels) {
  const groups = [...new Set(labels)];
  const s = points.map((p, i) => {
    const sums = new Map(groups.map(g => [g, [0, 0]]));
    points.forEach((q, j) => { if (j !== i) { const e = sums.get(labels[j]); e[0] += dist(p, q); e[1]++; } });
    const own = sums.get(labels[i]);
    if (!own[1]) return 0;
    const a = own[0] / own[1];
    let b = Infinity;
    for (const g of groups) {
      const e = sums.get(g);
      if (g !== labels[i] && e[1]) b = Math.min(b, e[0] / e[1]);
    }
    return (b - a) / Math.max(a, b);
  });
  return s.reduce((x, y) => x + y, 0) / s.length;
}

// Plain k-means with k-means++ starts, keeping the best of several restarts. Deterministic.
function kmeans(points, kk, seed, restarts = 12) {
  let best = null;
  for (let r = 0; r < restarts; r++) {
    const rand = rng(seed * 100 + r);
    const centers = [points[Math.floor(rand() * points.length)].slice()];
    while (centers.length < kk) {
      const w = points.map(p => Math.min(...centers.map(c => dist(p, c))) ** 2);
      let t = rand() * w.reduce((x, y) => x + y, 0), i = 0;
      while (i < w.length - 1 && t > w[i]) { t -= w[i]; i++; }
      centers.push(points[i].slice());
    }
    let labels = [];
    for (let it = 0; it < 100; it++) {
      const next = points.map(p => { let bi = 0, bd = Infinity; centers.forEach((c, i) => { const e = dist(p, c); if (e < bd) { bd = e; bi = i; } }); return bi; });
      const same = next.every((v, i) => v === labels[i]);
      labels = next;
      if (same) break;
      for (let c = 0; c < kk; c++) {
        const m = points.filter((_, i) => labels[i] === c);
        if (m.length) centers[c] = [m.reduce((x, p) => x + p[0], 0) / m.length, m.reduce((x, p) => x + p[1], 0) / m.length];
      }
    }
    const inertia = points.reduce((x, p, i) => x + dist(p, centers[labels[i]]) ** 2, 0);
    if (!best || inertia < best.inertia) best = { labels, inertia };
  }
  return best.labels;
}

const SEED = 7;
const memo = {};
const blobs = () => (memo.blobs ??= makeClusterData('blobs', { n: 150, seed: SEED }));
const rings = () => (memo.rings ??= makeClusterData('rings', { n: 150, seed: SEED }));

// A text label with a halo in the page color, so it stays readable on top of a line.
const label = (x, y, t, o = {}) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${o.size ?? 12}" font-weight="700" fill="${o.fill ?? 'var(--ink)'}" stroke="var(--surface)" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${t}</text>`;

// ---- Figure 1: a and b for one highlighted point. ----
function aAndB() {
  const U = 40; // pixels per distance unit
  const clusters = [
    [[70, 104], [82, 172], [150, 198], [178, 124]],        // the highlighted point's own cluster (first four) ...
    [[286, 64], [322, 104], [294, 142], [346, 66]],        // ... the nearest other cluster
    [[300, 214], [352, 196], [262, 236], [338, 240]],      // a farther cluster
  ];
  const P = [128, 142];
  const mean = (c) => c.reduce((x, q) => x + dist(P, q), 0) / c.length / U;
  const a = mean(clusters[0]);
  const means = [1, 2].map(i => mean(clusters[i]));
  const near = means[0] <= means[1] ? 1 : 2;
  const b = means[near - 1];
  const s = (b - a) / Math.max(a, b);
  const own = clusters[0].map(q => line(P[0], P[1], q[0], q[1], { c: k(0), w: 2 })).join('');
  const other = clusters[near].map(q => line(P[0], P[1], q[0], q[1], { c: k(near), w: 2, dash: '6 5' })).join('');
  const dots = clusters.map((c, i) => c.map(q => dot(q[0], q[1], k(i), 6.5)).join('')).join('');
  const panel = `${box(10, 10, 400, 250)}${own}${other}${dots}${ring(P[0], P[1], k(0), 9)}${text(P[0] - 14, P[1] - 14, 'P', { size: 15, weight: 700, fill: 'var(--ink)' })}`;
  const tx = 424;
  const side = `${text(tx, 70, tr('a: mean of the solid lines', 'a: rata-rata garis solid'), { anchor: 'start', fill: k(0), weight: 700, size: 13 })}
${text(tx, 94, `a = ${fmt(a, { digits: 2 })}`, { anchor: 'start', fill: 'var(--ink)', size: 14 })}
${text(tx, 138, tr('b: mean of the dashed lines', 'b: rata-rata garis putus'), { anchor: 'start', fill: k(near), weight: 700, size: 13 })}
${text(tx, 162, `b = ${fmt(b, { digits: 2 })}`, { anchor: 'start', fill: 'var(--ink)', size: 14 })}
${line(tx, 186, 628, 186, { c: 'var(--line)', w: 1.5 })}
${text(tx, 212, 's = (b − a) / max(a, b)', { anchor: 'start', fill: 'var(--ink)', size: 14 })}
${text(tx, 236, `s = ${fmt(s, { digits: 2 })}`, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 15 })}`;
  return svg(640, 270, `${panel}${side}`);
}

// ---- Figure 2: the six-point example, for the point 5. ----
function sixPoints() {
  const X = v => 50 + v * 52, y0 = 128;
  const own = [1, 3], other = [8, 9, 10], P = 5;
  const arc = (q, up, c) => {
    const x1 = X(P), x2 = X(q), span = Math.abs(x2 - x1), h = 0.32 * span, sy = y0 + (up ? -15 : 15);
    return `<path d="M${x1} ${sy}Q${(x1 + x2) / 2} ${sy + (up ? -2 : 2) * h} ${x2} ${sy}" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
      + label((x1 + x2) / 2, sy + (up ? -h : h) + 4, fmt(Math.abs(q - P)), { fill: c });
  };
  const arcs = own.map(q => arc(q, true, k(0))).join('') + other.map(q => arc(q, false, k(1))).join('');
  const pts = [1, 3, 5, 8, 9, 10].map(v => (v === P ? `<circle cx="${X(v)}" cy="${y0}" r="17" fill="none" stroke="var(--accent)" stroke-width="2"/>` : '')
    + ring(X(v), y0, k(v < 6 ? 0 : 1), 13) + text(X(v), y0 + 5, fmt(v), { fill: 'var(--ink)', weight: 700, size: 14 })).join('');
  const axis = line(X(0), y0, X(11), y0, { c: 'var(--line)', w: 1.5 });
  const heads = `${text(X(2), y0 + 40, tr('cluster A', 'cluster A'), { fill: k(0), weight: 700, size: 13 })}${text(X(9), y0 - 34, tr('cluster B', 'cluster B'), { fill: k(1), weight: 700, size: 13 })}`;
  const calc = `${text(120, 286, `a = (4 + 2) / 2 = ${fmt(3)}`, { fill: k(0), weight: 700, size: 14 })}
${text(320, 286, `b = (3 + 4 + 5) / 3 = ${fmt(4)}`, { fill: k(1), weight: 700, size: 14 })}
${text(524, 286, `s = (4 − 3) / 4 = ${fmt(0.25, { digits: 2 })}`, { fill: 'var(--ink)', weight: 700, size: 14 })}`;
  return svg(640, 304, `${axis}${arcs}${heads}${pts}${calc}`);
}

// ---- Figure 3: average silhouette for k = 2 to 6, on three round blobs. ----
function scoreByK() {
  const { points } = blobs();
  const ks = [2, 3, 4, 5, 6];
  const runs = ks.map(kk => { const labels = kmeans(points, kk, SEED); return { kk, labels, avg: silhouette(points, labels) }; });
  const best = runs.reduce((m, r) => (r.avg > m.avg ? r : m));
  const ox = 10, oy = 14, S = 236, u = S / 10;
  const dots = points.map((p, i) => dot(ox + p[0] * u, oy + S - p[1] * u, k(best.labels[i]), 3.4)).join('');
  const left = `${box(ox, oy, S, S)}${dots}${text(ox + S / 2, oy + S + 20, tr(`k-means with k = ${fmt(best.kk)}`, `k-means dengan k = ${fmt(best.kk)}`), { fill: 'var(--ink)', size: 13 })}`;
  const bx = 330, base = 220, top = 40, bw = 46, gap = 18;
  const bars = runs.map((r, i) => {
    const x = bx + i * (bw + gap), h = Math.max(0, r.avg) * (base - top), isBest = r === best;
    return `<rect x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="4" fill="${isBest ? 'var(--accent)' : 'color-mix(in srgb, var(--muted) 45%, var(--surface))'}"/>`
      + text(x + bw / 2, base - h - 7, fmt(r.avg, { digits: 2 }), { fill: 'var(--ink)', weight: isBest ? 700 : 500, size: 13 })
      + text(x + bw / 2, base + 20, fmt(r.kk), { fill: 'var(--ink)', size: 13 });
  }).join('');
  const right = `${text(bx - 20, 20, tr('Average silhouette', 'Silhouette rata-rata'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}
${line(bx - 10, base, bx + 5 * (bw + gap) - gap + 10, base, { c: 'var(--muted)', w: 1.6 })}${bars}
${text(bx + (5 * (bw + gap) - gap) / 2, base + 42, tr('number of clusters k', 'jumlah cluster k'), { fill: 'var(--ink)', size: 13 })}`;
  return svg(640, 282, `${left}${right}`);
}

// ---- Figure 4: the true rings against a k-means split, with their scores. ----
function ringsLimit() {
  const { points, truth } = rings();
  const split = kmeans(points, 2, SEED);
  const panel = (ox, title, labels) => {
    const S = 236, oy = 34, u = S / 10;
    const dots = points.map((p, i) => dot(ox + p[0] * u, oy + S - p[1] * u, k(labels[i] === 0 ? 0 : 1), 3.4)).join('');
    return `${text(ox + S / 2, 20, title, { fill: 'var(--ink)', weight: 700, size: 14 })}${box(ox, oy, S, S)}${dots}
${text(ox + S / 2, oy + S + 24, `${tr('average silhouette', 'silhouette rata-rata')} ${fmt(silhouette(points, labels), { digits: 2 })}`, { fill: 'var(--ink)', weight: 700, size: 14 })}`;
  };
  return svg(640, 330, `${panel(40, tr('True grouping: two rings', 'Pengelompokan sebenarnya: dua cincin'), truth)}${panel(364, tr('k-means with k = 2', 'k-means dengan k = 2'), split)}`);
}

export const figures = {
  'a-and-b': aAndB,
  'six-points': sixPoints,
  'score-by-k': scoreByK,
  'rings-limit': ringsLimit,
};
