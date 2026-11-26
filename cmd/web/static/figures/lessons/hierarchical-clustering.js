// Figures for the lesson "Hierarchical clustering". Every number and every picture is computed here from
// the same five points the lesson uses (0, 1, 3, 7 and 12, called A to E) and from two small seeded
// datasets, so the figures cannot drift from the text. The merging itself is a tiny agglomerative routine
// written for the figures: it is the same procedure the lesson describes by hand.
import { svg, dot, ring, text, line, box, diamond, k, soft, tr, fmt } from '../kit.js';
import { rng, gauss } from '../../sims/ml/rng.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const VALUES = [0, 1, 3, 7, 12];
const dist1 = (i, j) => Math.abs(VALUES[i] - VALUES[j]);

// ---- The merging routine (1-D, for the five lesson points) ----
// Returns the merges in order: { a, b, members, h } with a and b the two clusters (arrays of point indexes).
function merges1d(link) {
  let clusters = VALUES.map((_, i) => [i]);
  const between = (a, b) => {
    const ds = [];
    for (const i of a) for (const j of b) ds.push(dist1(i, j));
    if (link === 'single') return Math.min(...ds);
    if (link === 'complete') return Math.max(...ds);
    return ds.reduce((s, v) => s + v, 0) / ds.length;
  };
  const out = [];
  while (clusters.length > 1) {
    let best = null;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const h = between(clusters[i], clusters[j]);
        if (!best || h < best.h) best = { i, j, h };
      }
    }
    const a = clusters[best.i], b = clusters[best.j];
    out.push({ a, b, members: [...a, ...b].sort((x, y) => x - y), h: best.h });
    clusters = clusters.filter((_, x) => x !== best.i && x !== best.j);
    clusters.push([...a, ...b]);
  }
  return out;
}

// The clusters left after the first `count` merges, as sorted member lists ordered by their first member.
function clustersAfter(merges, count) {
  let clusters = VALUES.map((_, i) => [i]);
  for (const m of merges.slice(0, count)) {
    clusters = clusters.filter(c => !(m.a.includes(c[0]) || m.b.includes(c[0])));
    clusters.push(m.members);
  }
  return clusters.sort((x, y) => x[0] - y[0]);
}

// ---- Figure 1: four ways to measure the distance between two clusters ----
const P = [[1, 5], [2.2, 2.4], [3.4, 4]];
const Q = [[6.2, 3.2], [7.2, 6], [8.6, 2.4]];
const hyp = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

function linkageDistances() {
  const U = 20, GW = 10, GH = 7.5;
  const pairs = [];
  for (const p of P) for (const q of Q) pairs.push({ p, q, d: hyp(p, q) });
  const nearest = pairs.reduce((a, b) => (b.d < a.d ? b : a));
  const farthest = pairs.reduce((a, b) => (b.d > a.d ? b : a));
  const mean = pairs.reduce((s, x) => s + x.d, 0) / pairs.length;
  const centroid = pts => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  const cp = centroid(P), cq = centroid(Q), cm = centroid([...P, ...Q]);
  const ward = (P.length * Q.length) / (P.length + Q.length) * hyp(cp, cq) ** 2;

  const panel = (ox, oy, title, body, headLines, value) => {
    const X = x => ox + 12 + x * U, Y = y => oy + 40 + GH * U - y * U;
    const grid = line(X(0), Y(0), X(GW), Y(0), { c: 'var(--line)', w: 1.4 }) + line(X(0), Y(0), X(0), Y(GH), { c: 'var(--line)', w: 1.4 });
    const points = P.map(p => dot(X(p[0]), Y(p[1]), k(0), 6.5)).join('') + Q.map(q => dot(X(q[0]), Y(q[1]), k(1), 6.5)).join('');
    const side = headLines.map((s, i) => text(ox + 226, oy + 86 + i * 16, s, { anchor: 'start', size: 12, fill: 'var(--ink)', weight: 700 })).join('')
      + text(ox + 226, oy + 86 + headLines.length * 16 + 12, value, { anchor: 'start', size: 15, fill: 'var(--ink)', weight: 700 });
    return `${box(ox + 3, oy + 3, 314, 208)}${text(ox + 16, oy + 26, title, { anchor: 'start', weight: 700, size: 15, fill: 'var(--ink)' })}${grid}${body(X, Y)}${points}${side}`;
  };
  const seg = (X, Y, p, q, o) => line(X(p[0]), Y(p[1]), X(q[0]), Y(q[1]), o);
  const faint = (X, Y) => pairs.map(x => seg(X, Y, x.p, x.q, { c: 'var(--muted)', w: 1, dash: '3 4' })).join('');
  const d1 = v => `d = ${fmt(v, { digits: 1 })}`;
  const wrap = s => s.split('|');
  return svg(640, 440, [
    panel(0, 0, 'Single', (X, Y) => faint(X, Y) + seg(X, Y, nearest.p, nearest.q, { c: 'var(--ink)', w: 3.5 }), wrap(tr('closest|pair', 'pasangan|terdekat')), d1(nearest.d)),
    panel(320, 0, 'Complete', (X, Y) => faint(X, Y) + seg(X, Y, farthest.p, farthest.q, { c: 'var(--ink)', w: 3.5 }), wrap(tr('farthest|pair', 'pasangan|terjauh')), d1(farthest.d)),
    panel(0, 220, 'Average', (X, Y) => pairs.map(x => seg(X, Y, x.p, x.q, { c: k(3), w: 2 })).join(''), wrap(tr('mean of|all 9 pairs', 'rata-rata|9 pasangan')), d1(mean)),
    panel(320, 220, 'Ward', (X, Y) => `${seg(X, Y, cp, cq, { c: 'var(--ink)', w: 2.5, dash: '6 4' })}${diamond(X(cp[0]), Y(cp[1]), k(0), 8)}${diamond(X(cq[0]), Y(cq[1]), k(1), 8)}${ring(X(cm[0]), Y(cm[1]), 'var(--ink)', 7)}`, wrap(tr('spread|added', 'sebaran|tambahan')), `+${fmt(ward, { digits: 1 })}`),
  ].join(''));
}

// ---- Figure 2: the state after each merge, single next to complete ----
function mergeSequence() {
  const U = 14.5, LX = 124, ROW = 38, TOP = 62, W = 320;
  const col = (ox, title, link) => {
    const merges = merges1d(link);
    const X = v => ox + LX + v * U;
    const rows = [];
    for (let step = 0; step <= merges.length; step++) {
      const cs = clustersAfter(merges, step);
      const y = TOP + step * ROW;
      const label = step === 0 ? tr('start', 'awal') : `${fmt(step)}.  d = ${fmt(merges[step - 1].h, { digits: Number.isInteger(merges[step - 1].h) ? 0 : 1 })}`;
      const bars = cs.map((c, ci) => (c.length > 1 ? `<rect x="${X(VALUES[c[0]]) - 8}" y="${y - 9}" width="${(VALUES[c[c.length - 1]] - VALUES[c[0]]) * U + 16}" height="18" rx="9" fill="${soft(ci % 7)}" stroke="${k(ci % 7)}" stroke-width="1.6"/>` : '')).join('');
      const dots = cs.map((c, ci) => c.map(i => dot(X(VALUES[i]), y, k(ci % 7), 5)).join('')).join('');
      rows.push(`${text(ox + 8, y + 4, label, { anchor: 'start', size: 12, fill: 'var(--ink)', weight: step === 0 ? 500 : 700 })}${bars}${dots}`);
    }
    const letters = VALUES.map((v, i) => text(X(v), TOP - 20, LETTERS[i], { size: 12, fill: 'var(--ink)', weight: 700 })).join('');
    return `${text(ox + 8, 20, title, { anchor: 'start', weight: 700, size: 15, fill: 'var(--ink)' })}${letters}${rows.join('')}`;
  };
  return svg(640, TOP + 5 * ROW - 6, `${col(0, tr('Single linkage', 'Single linkage'), 'single')}${col(W, tr('Complete linkage', 'Complete linkage'), 'complete')}${line(W - 6, 8, W - 6, TOP + 5 * ROW - 22, { c: 'var(--line)', w: 1.4 })}`);
}

// ---- Figure 3: the two dendrograms, each cut so that two clusters remain ----
function dendrograms() {
  const BASE = 214, S = 12, LEAF0 = 66, GAP = 50;
  // A label with a halo in the card color, so a dashed line behind it does not hurt reading.
  const label = (x, y, t, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.anchor ?? 'middle'}" font-size="12" font-weight="700" fill="${o.fill ?? 'var(--ink)'}" stroke="var(--surface)" stroke-width="4" paint-order="stroke">${t}</text>`;
  const col = (ox, title, link, cut) => {
    const merges = merges1d(link);
    const Y = h => BASE - h * S;
    const kept = merges.filter(m => m.h < cut);
    const left = clustersAfter(merges, kept.length);
    const colorOf = idx => k(left.findIndex(g => g.includes(idx)) % 7);
    const nodes = VALUES.map((_, i) => ({ x: ox + LEAF0 + i * GAP, h: 0, members: [i] }));
    // A vertical branch from h0 up to h1: colored below the cut, grey above it.
    const leg = (x, h0, h1, idx) => {
      const top = Math.min(h1, cut);
      return (h0 < cut ? line(x, Y(h0), x, Y(top), { c: colorOf(idx), w: 3 }) : '')
        + (h1 > cut ? line(x, Y(Math.max(h0, cut)), x, Y(h1), { c: 'var(--muted)', w: 3 }) : '');
    };
    let live = nodes.slice(), body = '';
    for (const m of merges) {
      const found = [live.find(n => n.members.includes(m.a[0])), live.find(n => n.members.includes(m.b[0]))].sort((p, q) => p.x - q.x);
      const [a, b] = found;
      body += leg(a.x, a.h, m.h, a.members[0]) + leg(b.x, b.h, m.h, b.members[0])
        + line(a.x, Y(m.h), b.x, Y(m.h), { c: m.h < cut ? colorOf(m.members[0]) : 'var(--muted)', w: 3 })
        + label(a.x - 5, Y(m.h) + 4, fmt(m.h), { anchor: 'end' });
      live = live.filter(n => n !== a && n !== b); live.push({ x: (a.x + b.x) / 2, h: m.h, members: m.members });
    }
    const axis = [0, 4, 8, 12].map(t => `${line(ox + 38, Y(t), ox + 46, Y(t), { c: 'var(--muted)', w: 1.4 })}${text(ox + 33, Y(t) + 4, fmt(t), { anchor: 'end', size: 12 })}`).join('')
      + line(ox + 46, Y(0), ox + 46, Y(12.8), { c: 'var(--muted)', w: 1.4 });
    const leaves = VALUES.map((v, i) => `${text(nodes[i].x, BASE + 18, LETTERS[i], { size: 14, fill: 'var(--ink)', weight: 700 })}${text(nodes[i].x, BASE + 34, fmt(v), { size: 12 })}`).join('');
    const cutLine = line(ox + 46, Y(cut), ox + 300, Y(cut), { c: 'var(--accent)', w: 2.2, dash: '7 5' });
    return `${text(ox + 8, 20, title, { anchor: 'start', weight: 700, size: 15, fill: 'var(--ink)' })}${text(ox + 8, 40, tr(`dashed cut at ${fmt(cut, { digits: 1 })}: 2 clusters`, `potongan putus-putus di ${fmt(cut, { digits: 1 })}: 2 cluster`), { anchor: 'start', size: 12, fill: 'var(--accent)', weight: 700 })}${text(ox + 8, 58, tr('merge distance', 'jarak penggabungan'), { anchor: 'start', size: 12 })}${axis}${body}${cutLine}${leaves}`;
  };
  return svg(640, 258, `${col(0, tr('Single linkage', 'Single linkage'), 'single', 4.5)}${col(330, tr('Complete linkage', 'Complete linkage'), 'complete', 8)}`);
}

// ---- Figure 4: three linkages on two small datasets, cut at k = 2 ----
function crescents() {
  const random = rng(1), pts = [], n = 20, nz = 0.07;
  for (let i = 0; i < n; i++) { const t = Math.PI * i / (n - 1); pts.push([3.7 + 3 * (Math.cos(t) + nz * gauss(random)), 3.8 + 3 * (Math.sin(t) + nz * gauss(random))]); }
  for (let i = 0; i < n; i++) { const t = Math.PI * i / (n - 1); pts.push([3.7 + 3 * (1 - Math.cos(t) + nz * gauss(random)), 3.8 + 3 * (0.45 - Math.sin(t) + nz * gauss(random))]); }
  return pts;
}
function blobsWithBridge() {
  const random = rng(3), pts = [];
  for (let i = 0; i < 18; i++) pts.push([2.4 + 0.6 * gauss(random), 4.6 + 0.7 * gauss(random)]);
  for (let i = 0; i < 18; i++) pts.push([7.6 + 0.6 * gauss(random), 5.4 + 0.7 * gauss(random)]);
  for (const p of [[3.9, 5.0], [4.8, 5.0], [5.7, 5.0], [6.5, 5.1]]) pts.push(p);
  return pts;
}

// Agglomerative clustering in 2-D, stopped when `target` clusters remain. Returns arrays of point indexes.
function agglomerate2d(pts, link, target) {
  const centroid = m => [m.reduce((s, i) => s + pts[i][0], 0) / m.length, m.reduce((s, i) => s + pts[i][1], 0) / m.length];
  const between = (a, b) => {
    if (link === 'ward') { const ca = centroid(a), cb = centroid(b); return a.length * b.length / (a.length + b.length) * ((ca[0] - cb[0]) ** 2 + (ca[1] - cb[1]) ** 2); }
    let mn = Infinity, mx = 0;
    for (const i of a) for (const j of b) { const d = hyp(pts[i], pts[j]); mn = Math.min(mn, d); mx = Math.max(mx, d); }
    return link === 'single' ? mn : mx;
  };
  let clusters = pts.map((_, i) => [i]);
  while (clusters.length > target) {
    let best = null;
    for (let i = 0; i < clusters.length; i++) for (let j = i + 1; j < clusters.length; j++) {
      const d = between(clusters[i], clusters[j]);
      if (!best || d < best.d) best = { i, j, d };
    }
    const merged = [...clusters[best.i], ...clusters[best.j]];
    clusters = clusters.filter((_, x) => x !== best.i && x !== best.j);
    clusters.push(merged);
  }
  return clusters.sort((a, b) => b.length - a.length);
}

function linkageShapes() {
  const sets = [
    [tr('Two crescents', 'Dua bulan sabit'), crescents()],
    [tr('Two blobs joined by a bridge of four points', 'Dua blob dengan jembatan empat titik'), blobsWithBridge()],
  ];
  const links = [['single', 'Single'], ['complete', 'Complete'], ['ward', 'Ward']];
  const PW = 200, PH = 140, GAPX = 20;
  let body = '';
  links.forEach(([, name], ci) => { body += text(ci * (PW + GAPX) + PW / 2, 16, name, { weight: 700, size: 15, fill: 'var(--ink)' }); });
  sets.forEach(([title, pts], ri) => {
    const top = 56 + ri * 190;
    body += text(2, top - 10, title, { anchor: 'start', weight: 700, size: 13, fill: 'var(--ink)' });
    links.forEach(([link], ci) => {
      const ox = ci * (PW + GAPX);
      const X = v => ox + 6 + v * (PW - 12) / 10, Y = v => top + PH - 6 - (v - 1.5) * (PH - 12) / 7;
      const groups = agglomerate2d(pts, link, 2);
      const dots = groups.map((g, gi) => g.map(i => dot(X(pts[i][0]), Y(pts[i][1]), k(gi), 4)).join('')).join('');
      body += `${box(ox, top, PW, PH)}${dots}${text(ox + PW / 2, top + PH + 18, tr(`sizes ${fmt(groups[0].length)} and ${fmt(groups[1].length)}`, `ukuran ${fmt(groups[0].length)} dan ${fmt(groups[1].length)}`), { size: 13, fill: 'var(--ink)' })}`;
    });
  });
  return svg(640, 56 + 190 + PH + 28, body);
}

export const figures = {
  'linkage-distances': linkageDistances,
  'merge-sequence': mergeSequence,
  'dendrograms': dendrograms,
  'linkage-shapes': linkageShapes,
};
