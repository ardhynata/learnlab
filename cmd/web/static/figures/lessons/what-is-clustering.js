// Figures for the lesson "What clustering is": [[figure:what-is-clustering/name|Caption]].
// Every dot is a real penguin from data/penguins.csv (bill length and bill depth, in millimeters).
import { svg, dot, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };

// Twenty-four real penguins (eight per species, spread through the file): [bill length, bill depth].
// The species are not used anywhere in this file.
const PENGUINS = [
  [37.8, 17.1], [40.5, 18.9], [36, 17.9], [41.1, 19.1], [41.3, 20.3], [37.9, 18.6], [41.4, 18.5], [32.1, 15.5],
  [52.7, 19.8], [47, 17.3], [48.5, 17.5], [52.8, 20], [46.9, 16.6], [50.1, 17.9], [52.2, 18.8], [55.8, 19.8],
  [46.7, 15.3], [46.3, 15.8], [44, 13.6], [50.1, 15], [50.7, 15], [44.9, 13.8], [51.1, 16.5], [55.1, 16],
];

// A plain 2-means run, so the right-hand panel shows a real grouping and not a hand-drawn one: start from the
// first point and the point farthest from it, then assign and update until nothing changes.
function twoGroups(pts) {
  const d = (p, c) => Math.hypot(p[0] - c[0], p[1] - c[1]);
  const first = pts[0];
  let far = pts[0];
  for (const p of pts) if (d(p, first) > d(far, first)) far = p;
  let centers = [first, far], g = [];
  for (let it = 0; it < 30; it++) {
    g = pts.map(p => (d(p, centers[0]) <= d(p, centers[1]) ? 0 : 1));
    centers = [0, 1].map(j => {
      const m = pts.filter((_, i) => g[i] === j);
      return [m.reduce((s, p) => s + p[0], 0) / m.length, m.reduce((s, p) => s + p[1], 0) / m.length];
    });
  }
  return g;
}

// Same dots twice: what you are given (no labels), then one grouping a clustering method proposes.
function noLabels() {
  const w = 270, h = 176, oy = 70, xs = [48, 388];
  const view = { x: [30, 58], y: [12, 22] };
  const X = (ox, v) => ox + (v - view.x[0]) / (view.x[1] - view.x[0]) * w;
  const Y = v => oy + h - (v - view.y[0]) / (view.y[1] - view.y[0]) * h;
  const g = twoGroups(PENGUINS);
  const frame = (ox, title, sub) => {
    const ticksX = [30, 40, 50].map(t => `${line(X(ox, t), Y(12), X(ox, t), Y(12) + 5, { c: 'var(--muted)', w: 1.2 })}${text(X(ox, t), Y(12) + 19, fmt(t), { size: 12 })}`).join('');
    const ticksY = [12, 16, 20].map(t => `${line(X(ox, 30) - 5, Y(t), X(ox, 30), Y(t), { c: 'var(--muted)', w: 1.2 })}${text(X(ox, 30) - 9, Y(t) + 4, fmt(t), { anchor: 'end', size: 12 })}`).join('');
    return `${box(ox - 44, 6, w + 58, 296)}${text(ox + w / 2, 30, title, { ...INK, size: 15 })}${text(ox + w / 2, 47, sub, { size: 12 })}
${line(X(ox, 30), Y(12), X(ox, 58), Y(12), { c: 'var(--muted)', w: 1.6 })}${line(X(ox, 30), Y(12), X(ox, 30), Y(22), { c: 'var(--muted)', w: 1.6 })}${ticksX}${ticksY}
${text(ox + w / 2, Y(12) + 38, tr('Bill length (mm)', 'Panjang paruh (mm)'), { size: 12 })}${text(ox - 34, oy - 3, tr('Bill depth (mm)', 'Kedalaman paruh (mm)'), { anchor: 'start', size: 12 })}`;
  };
  const left = `${frame(xs[0], tr('What you are given', 'Yang kamu terima'), tr('features only, no labels', 'hanya feature, tanpa label'))}
${PENGUINS.map(p => dot(X(xs[0], p[0]), Y(p[1]), 'var(--muted)', 5.5)).join('')}`;
  const right = `${frame(xs[1], tr('What clustering proposes', 'Yang diusulkan clustering'), tr('each dot gets a group', 'tiap titik dapat kelompok'))}
${PENGUINS.map((p, i) => dot(X(xs[1], p[0]), Y(p[1]), k(g[i] === 0 ? 0 : 2), 5.5)).join('')}
${text(X(xs[1], 30.8), Y(12.9), tr('group 1', 'kelompok 1'), { anchor: 'start', size: 13, weight: 700, fill: k(0) })}${text(X(xs[1], 57.5), Y(12.9), tr('group 2', 'kelompok 2'), { anchor: 'end', size: 13, weight: 700, fill: k(2) })}`;
  return svg(680, 312, `${left}${right}`);
}

// The six penguins A to F of the worked example, with the distances from A to the other five.
function tinyExample() {
  const P = { A: [39.1, 18.7], B: [39.5, 17.4], C: [40.3, 18.0], D: [46.1, 13.2], E: [48.7, 14.1], F: [50.0, 15.2] };
  const ox = 56, oy = 30, w = 590, h = 240;
  const view = { x: [37, 52], y: [12, 20] };
  const X = v => ox + (v - view.x[0]) / (view.x[1] - view.x[0]) * w;
  const Y = v => oy + h - (v - view.y[0]) / (view.y[1] - view.y[0]) * h;
  const dist = (a, b) => Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]);
  const lab = n => fmt(dist('A', n), { digits: 2 });
  const grid = [38, 42, 46, 50].map(t => `${line(X(t), Y(12), X(t), Y(20), { c: 'var(--line)', w: 1 })}${text(X(t), Y(12) + 19, fmt(t), { size: 12 })}`).join('')
    + [12, 14, 16, 18, 20].map(t => `${line(X(37), Y(t), X(52), Y(t), { c: 'var(--line)', w: 1 })}${text(X(37) - 8, Y(t) + 4, fmt(t), { anchor: 'end', size: 12 })}`).join('');
  const ell = (cx, cy, rx, ry, c) => `<ellipse cx="${X(cx)}" cy="${Y(cy)}" rx="${rx}" ry="${ry}" fill="${soft(c)}" fill-opacity="0.55" stroke="${k(c)}" stroke-width="2" stroke-dasharray="6 4"/>`;
  const pt = (n, c, dx, dy) => `${dot(X(P[n][0]), Y(P[n][1]), k(c), 7)}${text(X(P[n][0]) + dx, Y(P[n][1]) + dy, n, { ...INK, size: 14 })}`;
  const guide = n => line(X(P.A[0]), Y(P.A[1]), X(P[n][0]), Y(P[n][1]), { c: 'var(--muted)', w: 1.5, dash: '5 4' });
  const rows = ['B', 'C', 'D', 'E', 'F'].map((n, i) => text(X(51.9), oy + 40 + i * 20, `A ${tr('to', 'ke')} ${n}:  ${lab(n)}`, { anchor: 'end', size: 13, fill: 'var(--ink)', weight: i < 2 ? 700 : 500 })).join('');
  return svg(680, 330, `${box(4, 4, 672, 322)}${grid}
${line(X(37), Y(12), X(52), Y(12), { c: 'var(--muted)', w: 1.6 })}${line(X(37), Y(12), X(37), Y(20), { c: 'var(--muted)', w: 1.6 })}
${ell(39.63, 18.03, 62, 50, 0)}${ell(48.27, 14.17, 84, 52, 2)}
${['B', 'C', 'D', 'E', 'F'].map(guide).join('')}
${pt('A', 0, -16, -12)}${pt('B', 0, -16, 14)}${pt('C', 0, 14, 20)}${pt('D', 2, -18, 4)}${pt('E', 2, 0, 24)}${pt('F', 2, 16, -6)}
${text(X(42), Y(12) + 38, tr('Bill length (mm)', 'Panjang paruh (mm)'), { size: 12 })}${text(X(37) + 4, oy - 10, tr('Bill depth (mm)', 'Kedalaman paruh (mm)'), { anchor: 'start', size: 12 })}
${text(X(51.9), oy + 14, tr('Distance from A (mm)', 'Jarak dari A (mm)'), { anchor: 'end', size: 13, ...INK })}${rows}`);
}

// The same two penguins, with mass in grams and in kilograms, drawn with the same scale on both axes.
function unitsMatter() {
  const s = [1.0, 8.0];                              // pixels per unit in each panel (equal on both axes inside a panel)
  const panel = (i, title, massGap, massUnit, dist) => {
    const sc = s[i], ox = 40 + i * 330, base = i === 0 ? 240 : 170;
    const dx = 16 * sc, dy = massGap * sc;
    const x1 = ox + 125 - dx / 2, y1 = base - dy, x2 = x1 + dx, y2 = base;
    return `${box(ox - 36, 6, 322, 316)}${text(ox + 125, 30, title, { ...INK, size: 15 })}
${line(x1, y1, x1, y2, { c: 'var(--muted)', w: 1.6, dash: '4 4' })}${line(x1, y2, x2, y2, { c: 'var(--muted)', w: 1.6, dash: '4 4' })}
${line(x1, y1, x2, y2, { c: k(i === 0 ? 1 : 0), w: 3.5 })}${dot(x1, y1, k(1), 7)}${dot(x2, y2, k(2), 7)}
${text(x1 + dx / 2 + (i === 0 ? 30 : 0), y2 + 20, `16 mm`, { size: 12, fill: 'var(--ink)' })}${i === 0 ? text(x1 - 10, (y1 + y2) / 2 + 4, `${fmt(massGap)} ${massUnit}`, { anchor: 'end', size: 12, fill: 'var(--ink)' }) : text(x1 + dx / 2, y1 - 16, `${fmt(massGap)} ${massUnit}`, { size: 12, fill: 'var(--ink)' })}
${text(ox + 125, 294, `${tr('distance', 'jarak')} = ${fmt(dist, { digits: 1 })}`, { ...INK, size: 15, fill: k(i === 0 ? 1 : 0) })}
${text(ox + 125, 312, tr('equal scale on both axes', 'skala sama di kedua sumbu'), { size: 11 })}`;
  };
  return svg(680, 330, `${panel(0, tr('Mass in grams', 'Massa dalam gram'), 175, 'g', Math.hypot(16, 175))}${panel(1, tr('Mass in kilograms', 'Massa dalam kilogram'), 0.175, 'kg', Math.hypot(16, 0.175))}`);
}

export const figures = { 'no-labels': noLabels, 'tiny-example': tinyExample, 'units-matter': unitsMatter };
