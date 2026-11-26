// Figures for the "Lab: outliers and statistics" lesson. They draw the same generated cloud the lab starts
// with (seed 4, 15 points) and the same outlier positions, and every number they show is computed from
// that data with the lab's own math, so they agree with the lesson text and with the lab.
import { svg, dot, ring, cross, diamond, text, line, box, k, soft, tr, fmt } from '../kit.js';
import { generatedCloud } from '../../sims/labs/outlier-lab.js';
import { summarize } from '../../sims/ml/stats.js';
import { linearFit } from '../../sims/ml/regression.js';

const CLOUD = generatedCloud(4);
const first = n => CLOUD.slice(0, n);
const num = v => fmt(v, { digits: 2 });

// A straight-line fit drawn across a 0..10 square, cut where it leaves the square.
function trend(pts, X, Y, style) {
  const f = linearFit(pts.map(p => p.x), pts.map(p => p.y));
  let a = 0, b = 10;
  if (Math.abs(f.slope) > 1e-9) {
    const x0 = (0 - f.intercept) / f.slope, x1 = (10 - f.intercept) / f.slope;
    a = Math.max(a, Math.min(x0, x1)); b = Math.min(b, Math.max(x0, x1));
  }
  const yAt = x => f.slope * x + f.intercept;
  return line(X(a), Y(yAt(a)), X(b), Y(yAt(b)), style);
}
const faded = body => `<g opacity="0.4">${body}</g>`;

// ---- Figure 1: the loop of the lab: predict, change, explain, transfer. ----
function predictLoop() {
  const steps = [
    [tr('1. Predict', '1. Prediksi'), [tr('Pick an answer', 'Pilih jawaban'), tr('in a box first.', 'di kotak dulu.')], 0],
    [tr('2. Change', '2. Ubah'), [tr('Add an outlier,', 'Tambah outlier,'), tr('then drag it.', 'lalu seret.')], 1],
    [tr('3. Explain', '3. Jelaskan'), [tr('Read the table', 'Baca tabel'), tr('and say why.', 'lalu jelaskan.')], 2],
    [tr('4. Transfer', '4. Terapkan'), [tr('Repeat on the', 'Ulangi pada'), tr('penguins.', 'penguin.')], 3],
  ];
  const w = 138, gap = 29, top = 22, h = 104;
  const body = steps.map(([title, lines, c], i) => {
    const ox = i * (w + gap) + 1;
    return `${box(ox, top, w, h, soft(c), k(c))}
${text(ox + w / 2, top + 36, title, { fill: 'var(--ink)', weight: 700, size: 16 })}
${text(ox + w / 2, top + 64, lines[0], { size: 13, fill: 'var(--ink)' })}
${text(ox + w / 2, top + 83, lines[1], { size: 13, fill: 'var(--ink)' })}
${i < 3 ? line(ox + w + 4, top + h / 2, ox + w + gap - 4, top + h / 2, { c: 'var(--muted)', w: 2, arrow: true }) : ''}`;
  }).join('');
  const back = `${line(1 + 3 * (w + gap) + w / 2, top + h + 4, 1 + 3 * (w + gap) + w / 2, top + h + 30, { c: 'var(--muted)', w: 1.6 })}
${line(1 + 3 * (w + gap) + w / 2, top + h + 30, 1 + w / 2, top + h + 30, { c: 'var(--muted)', w: 1.6 })}
${line(1 + w / 2, top + h + 30, 1 + w / 2, top + h + 5, { c: 'var(--muted)', w: 1.6, arrow: true })}
${text(320, top + h + 48, tr('Then try a new sample, and check the idea again.', 'Lalu coba sampel baru, dan periksa gagasannya lagi.'), { size: 13, fill: 'var(--ink)' })}`;
  return svg(640, 200, `${body}${back}`);
}

// ---- Figure 2: one outlier, before and after, with the numbers the lab's table shows. ----
function onePoint() {
  const pts = first(15), out = { x: 5, y: 9.3 };
  const s0 = summarize(pts), s1 = summarize([...pts, out]);
  const ox = 36, oy = 12, S = 240, u = S / 10;
  const X = v => ox + v * u, Y = v => oy + S - v * u;
  const m0 = [X(s0.meanX), Y(s0.meanY)], m1 = [X(s1.meanX), Y(s1.meanY)];
  const d0 = [X(s0.medianX), Y(s0.medianY)], d1 = [X(s1.medianX), Y(s1.medianY)];
  const ticks = [0, 5, 10].map(t => `${text(X(t), oy + S + 17, fmt(t), { size: 12 })}${text(ox - 9, Y(t) + 4, fmt(t), { anchor: 'end', size: 12 })}`).join('');
  const plot = `${box(ox, oy, S, S)}
${trend(pts, X, Y, { c: 'var(--muted)', w: 2, dash: '6 5' })}
${trend([...pts, out], X, Y, { c: k(1), w: 2.5 })}
${pts.map(p => dot(X(p.x), Y(p.y), k(0), 4.2)).join('')}
${faded(`${ring(m0[0], m0[1], k(2), 8)}${cross(d0[0], d0[1], k(3))}`)}
${line(m0[0], m0[1], m1[0], m1[1], { c: k(2), w: 2 })}${line(d0[0], d0[1], d1[0], d1[1], { c: k(3), w: 2 })}
${ring(m1[0], m1[1], k(2), 8)}${cross(d1[0], d1[1], k(3))}
${diamond(X(out.x), Y(out.y), k(1), 8)}
${ticks}${text(ox + S / 2, oy + S + 34, 'x', { size: 13 })}`;

  const c1 = 518, c2 = 632, px = 308;
  const rows = [
    [tr('Correlation r', 'Korelasi r'), s0.r, s1.r],
    [tr('Mean of y', 'Rata-rata y'), s0.meanY, s1.meanY],
    [tr('Median of y', 'Median y'), s0.medianY, s1.medianY],
    [tr('Standard deviation of y', 'Simpangan baku y'), s0.sdY, s1.sdY],
  ];
  const table = `${text(c1, 28, tr('Without outlier', 'Tanpa outlier'), { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 12 })}
${text(c2, 28, tr('With outlier', 'Dengan outlier'), { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 12 })}
${line(px, 38, c2, 38, { c: 'var(--line)', w: 1.5 })}
${rows.map(([name, a, b], i) => `${text(px, 62 + i * 28, name, { anchor: 'start', fill: 'var(--ink)', size: 13 })}${text(c1, 62 + i * 28, num(a), { anchor: 'end', fill: 'var(--ink)', size: 13 })}${text(c2, 62 + i * 28, num(b), { anchor: 'end', fill: k(1), weight: 700, size: 13 })}`).join('')}`;

  const lx = [px, 470], ly = i => 178 + i * 32;
  const legend = [
    [0, 0, d => dot(d[0], d[1], k(0), 4.5), tr('Data', 'Data')],
    [1, 0, d => diamond(d[0], d[1], k(1), 7), tr('Outlier (x 5, y 9.3)', 'Outlier (x 5, y 9,3)')],
    [0, 1, d => ring(d[0], d[1], k(2), 7), tr('Mean (ring)', 'Rata-rata (lingkaran)')],
    [1, 1, d => cross(d[0], d[1], k(3)), tr('Median (cross)', 'Median (silang)')],
    [0, 2, d => line(d[0] - 9, d[1], d[0] + 9, d[1], { c: 'var(--muted)', w: 2, dash: '5 4' }), tr('Trend without it', 'Tren tanpa outlier')],
    [1, 2, d => line(d[0] - 9, d[1], d[0] + 9, d[1], { c: k(1), w: 2.5 }), tr('Trend with it', 'Tren dengan outlier')],
  ].map(([c, r, mark, label]) => `${mark([lx[c] + 10, ly(r)])}${text(lx[c] + 26, ly(r) + 4, label, { anchor: 'start', fill: 'var(--ink)', size: 12 })}`).join('');
  return svg(640, 300, `${plot}${table}${legend}`);
}

// ---- Figure 3: the same cloud, three places for one outlier. ----
function whereItSits() {
  const pts = first(15), s0 = summarize(pts);
  const cases = [
    [{ x: 5, y: 9.3 }, tr('Far above the middle', 'Jauh di atas tengah')],
    [{ x: 9.5, y: 9.5 }, tr('Far out, on the trend', 'Jauh, searah tren')],
    [{ x: 9.5, y: 1 }, tr('Far out, off the trend', 'Jauh, di luar tren')],
  ];
  const w = 200, gap = 20, top = 30, h = 168;
  const body = cases.map(([out, title], i) => {
    const ox = i * (w + gap);
    const X = v => ox + 12 + v * (w - 24) / 10, Y = v => top + h - 12 - v * (h - 24) / 10;
    const s1 = summarize([...pts, out]);
    const down = s1.r < s0.r;
    return `${text(ox + w / 2, 18, title, { fill: 'var(--ink)', weight: 700, size: 13 })}
${box(ox, top, w, h)}
${trend(pts, X, Y, { c: 'var(--muted)', w: 2, dash: '6 5' })}
${trend([...pts, out], X, Y, { c: k(1), w: 2.5 })}
${pts.map(p => dot(X(p.x), Y(p.y), k(0), 3.8)).join('')}
${diamond(X(out.x), Y(out.y), k(1), 8)}
${text(ox + w / 2, top + h + 26, `r ${num(s0.r)} → ${num(s1.r)}`, { fill: down ? k(3) : k(2), weight: 700, size: 16 })}
${text(ox + w / 2, top + h + 46, down ? tr('r goes down', 'r turun') : tr('r goes up', 'r naik'), { fill: 'var(--ink)', size: 13 })}`;
  }).join('');
  return svg(640, 268, body);
}

// ---- Figure 4: the same outlier, more and more points. ----
function morePoints() {
  const out = { x: 5, y: 9.3 };
  const ns = [6, 15, 50, 200];
  const data = ns.map(n => {
    const pts = first(n), a = summarize(pts), b = summarize([...pts, out]);
    return { n, mean: Math.abs(b.meanY - a.meanY), median: Math.abs(b.medianY - a.medianY), r0: a.r, r1: b.r };
  });
  const left = 64, base = 214, scale = 205, gw = 138, bw = 42;
  const Y = v => base - v * scale;
  const grid = [0, 0.2, 0.4, 0.6].map(t => `${line(left, Y(t), 628, Y(t), { c: 'var(--line)', w: 1.2 })}${text(left - 8, Y(t) + 4, fmt(t, { digits: 1 }), { anchor: 'end', size: 12 })}`).join('');
  const bars = data.map((d, i) => {
    const gx = left + 14 + i * gw, cx = gx + bw + 3;
    const bar = (x, v, c) => `<rect x="${x}" y="${Y(v)}" width="${bw}" height="${Math.max(1, base - Y(v))}" rx="3" fill="${k(c)}"/>${text(x + bw / 2, Y(v) - 6, num(v), { fill: 'var(--ink)', size: 12, weight: 700 })}`;
    return `${bar(gx, d.mean, 2)}${bar(gx + bw + 6, d.median, 3)}
${text(cx, base + 20, `n = ${fmt(d.n)}`, { fill: 'var(--ink)', weight: 700, size: 14 })}
${text(cx, base + 40, `r ${num(d.r0)} → ${num(d.r1)}`, { size: 12 })}`;
  }).join('');
  const legend = `${box(left, 28, 14, 14, k(2), k(2))}${text(left + 22, 40, tr('Mean of y', 'Rata-rata y'), { anchor: 'start', fill: 'var(--ink)', size: 12 })}
${box(left + 130, 28, 14, 14, k(3), k(3))}${text(left + 152, 40, tr('Median of y', 'Median y'), { anchor: 'start', fill: 'var(--ink)', size: 12 })}`;
  return svg(640, 268, `${text(left - 54, 14, tr(`How far y moves when one outlier at y ${fmt(9.3)} joins`, `Seberapa jauh y bergeser saat satu outlier di y ${fmt(9.3)} bergabung`), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}
${legend}${grid}${line(left, base, 628, base, { c: 'var(--muted)', w: 1.6 })}${bars}`);
}

export const figures = {
  'predict-loop': predictLoop,
  'one-point': onePoint,
  'where-it-sits': whereItSits,
  'more-points': morePoints,
};
