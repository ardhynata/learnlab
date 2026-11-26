// Figures for the "PCA and explained variance" lesson. Every number a figure shows is computed from
// the data it draws, so the pictures agree with the worked examples in the text. The five points are
// the hand example; the penguin columns are the 342 rows of data/penguins.csv with all four
// measurements (bill length mm, bill depth mm, flipper length mm, body mass g), in file order.
import { svg, dot, ring, diamond, text, line, box, k, tr, fmt, pct } from '../kit.js';
import { eigenSym } from '../../sims/ml/linalg.js';

const BILL_LENGTH = [39.1,39.5,40.3,36.7,39.3,38.9,39.2,34.1,42,37.8,37.8,41.1,38.6,34.6,36.6,38.7,42.5,34.4,46,37.8,37.7,35.9,38.2,38.8,35.3,40.6,40.5,37.9,40.5,39.5,37.2,39.5,40.9,36.4,39.2,38.8,42.2,37.6,39.8,36.5,40.8,36,44.1,37,39.6,41.1,37.5,36,42.3,39.6,40.1,35,42,34.5,41.4,39,40.6,36.5,37.6,35.7,41.3,37.6,41.1,36.4,41.6,35.5,41.1,35.9,41.8,33.5,39.7,39.6,45.8,35.5,42.8,40.9,37.2,36.2,42.1,34.6,42.9,36.7,35.1,37.3,41.3,36.3,36.9,38.3,38.9,35.7,41.1,34,39.6,36.2,40.8,38.1,40.3,33.1,43.2,35,41,37.7,37.8,37.9,39.7,38.6,38.2,38.1,43.2,38.1,45.6,39.7,42.2,39.6,42.7,38.6,37.3,35.7,41.1,36.2,37.7,40.2,41.4,35.2,40.6,38.8,41.5,39,44.1,38.5,43.1,36.8,37.5,38.1,41.1,35.6,40.2,37,39.7,40.2,40.6,32.1,40.7,37.3,39,39.2,36.6,36,37.8,36,41.5,46.1,50,48.7,50,47.6,46.5,45.4,46.7,43.3,46.8,40.9,49,45.5,48.4,45.8,49.3,42,49.2,46.2,48.7,50.2,45.1,46.5,46.3,42.9,46.1,44.5,47.8,48.2,50,47.3,42.8,45.1,59.6,49.1,48.4,42.6,44.4,44,48.7,42.7,49.6,45.3,49.6,50.5,43.6,45.5,50.5,44.9,45.2,46.6,48.5,45.1,50.1,46.5,45,43.8,45.5,43.2,50.4,45.3,46.2,45.7,54.3,45.8,49.8,46.2,49.5,43.5,50.7,47.7,46.4,48.2,46.5,46.4,48.6,47.5,51.1,45.2,45.2,49.1,52.5,47.4,50,44.9,50.8,43.4,51.3,47.5,52.1,47.5,52.2,45.5,49.5,44.5,50.8,49.4,46.9,48.4,51.1,48.5,55.9,47.2,49.1,47.3,46.8,41.7,53.4,43.3,48.1,50.5,49.8,43.5,51.5,46.2,55.1,44.5,48.8,47.2,46.8,50.4,45.2,49.9,46.5,50,51.3,45.4,52.7,45.2,46.1,51.3,46,51.3,46.6,51.7,47,52,45.9,50.5,50.3,58,46.4,49.2,42.4,48.5,43.2,50.6,46.7,52,50.5,49.5,46.4,52.8,40.9,54.2,42.5,51,49.7,47.5,47.6,52,46.9,53.5,49,46.2,50.9,45.5,50.9,50.8,50.1,49,51.5,49.8,48.1,51.4,45.7,50.7,42.5,52.2,45.2,49.3,50.2,45.6,51.9,46.8,45.7,55.8,43.5,49.6,50.8,50.2];
const BILL_DEPTH = [18.7,17.4,18,19.3,20.6,17.8,19.6,18.1,20.2,17.1,17.3,17.6,21.2,21.1,17.8,19,20.7,18.4,21.5,18.3,18.7,19.2,18.1,17.2,18.9,18.6,17.9,18.6,18.9,16.7,18.1,17.8,18.9,17,21.1,20,18.5,19.3,19.1,18,18.4,18.5,19.7,16.9,18.8,19,18.9,17.9,21.2,17.7,18.9,17.9,19.5,18.1,18.6,17.5,18.8,16.6,19.1,16.9,21.1,17,18.2,17.1,18,16.2,19.1,16.6,19.4,19,18.4,17.2,18.9,17.5,18.5,16.8,19.4,16.1,19.1,17.2,17.6,18.8,19.4,17.8,20.3,19.5,18.6,19.2,18.8,18,18.1,17.1,18.1,17.3,18.9,18.6,18.5,16.1,18.5,17.9,20,16,20,18.6,18.9,17.2,20,17,19,16.5,20.3,17.7,19.5,20.7,18.3,17,20.5,17,18.6,17.2,19.8,17,18.5,15.9,19,17.6,18.3,17.1,18,17.9,19.2,18.5,18.5,17.6,17.5,17.5,20.1,16.5,17.9,17.1,17.2,15.5,17,16.8,18.7,18.6,18.4,17.8,18.1,17.1,18.5,13.2,16.3,14.1,15.2,14.5,13.5,14.6,15.3,13.4,15.4,13.7,16.1,13.7,14.6,14.6,15.7,13.5,15.2,14.5,15.1,14.3,14.5,14.5,15.8,13.1,15.1,14.3,15,14.3,15.3,15.3,14.2,14.5,17,14.8,16.3,13.7,17.3,13.6,15.7,13.7,16,13.7,15,15.9,13.9,13.9,15.9,13.3,15.8,14.2,14.1,14.4,15,14.4,15.4,13.9,15,14.5,15.3,13.8,14.9,13.9,15.7,14.2,16.8,14.4,16.2,14.2,15,15,15.6,15.6,14.8,15,16,14.2,16.3,13.8,16.4,14.5,15.6,14.6,15.9,13.8,17.3,14.4,14.2,14,17,15,17.1,14.5,16.1,14.7,15.7,15.8,14.6,14.4,16.5,15,17,15.5,15,13.8,16.1,14.7,15.8,14,15.1,15.2,15.9,15.2,16.3,14.1,16,15.7,16.2,13.7,14.3,15.7,14.8,16.1,17.9,19.5,19.2,18.7,19.8,17.8,18.2,18.2,18.9,19.9,17.8,20.3,17.3,18.1,17.1,19.6,20,17.8,18.6,18.2,17.3,17.5,16.6,19.4,17.9,19,18.4,19,17.8,20,16.6,20.8,16.7,18.8,18.6,16.8,18.3,20.7,16.6,19.9,19.5,17.5,19.1,17,17.9,18.5,17.9,19.6,18.7,17.3,16.4,19,17.3,19.7,17.3,18.8,16.6,19.9,18.8,19.4,19.5,16.5,17,19.8,18.1,18.2,19,18.7];
const FLIPPER = [181,186,195,193,190,181,195,193,190,186,180,182,191,198,185,195,197,184,194,174,180,189,185,180,187,183,187,172,180,178,178,188,184,195,196,190,180,181,184,182,195,186,196,185,190,182,179,190,191,186,188,190,200,187,191,186,193,181,194,185,195,185,192,184,192,195,188,190,198,190,190,196,197,190,195,191,184,187,195,189,196,187,193,191,194,190,189,189,190,202,205,185,186,187,208,190,196,178,192,192,203,183,190,193,184,199,190,181,197,198,191,193,197,191,196,188,199,189,189,187,198,176,202,186,199,191,195,191,210,190,197,193,199,187,190,191,200,185,193,193,187,188,190,192,185,190,184,195,193,187,201,211,230,210,218,215,210,211,219,209,215,214,216,214,213,210,217,210,221,209,222,218,215,213,215,215,215,216,215,210,220,222,209,207,230,220,220,213,219,208,208,208,225,210,216,222,217,210,225,213,215,210,220,210,225,217,220,208,220,208,224,208,221,214,231,219,230,214,229,220,223,216,221,221,217,216,230,209,220,215,223,212,221,212,224,212,228,218,218,212,230,218,228,212,224,214,226,216,222,203,225,219,228,215,228,216,215,210,219,208,209,216,229,213,230,217,230,217,222,214,215,222,212,213,192,196,193,188,197,198,178,197,195,198,193,194,185,201,190,201,197,181,190,195,181,191,187,193,195,197,200,200,191,205,187,201,187,203,195,199,195,210,192,205,210,187,196,196,196,201,190,212,187,198,199,201,193,203,187,197,191,203,202,194,206,189,195,207,202,193,210,198];
const MASS = [3750,3800,3250,3450,3650,3625,4675,3475,4250,3300,3700,3200,3800,4400,3700,3450,4500,3325,4200,3400,3600,3800,3950,3800,3800,3550,3200,3150,3950,3250,3900,3300,3900,3325,4150,3950,3550,3300,4650,3150,3900,3100,4400,3000,4600,3425,2975,3450,4150,3500,4300,3450,4050,2900,3700,3550,3800,2850,3750,3150,4400,3600,4050,2850,3950,3350,4100,3050,4450,3600,3900,3550,4150,3700,4250,3700,3900,3550,4000,3200,4700,3800,4200,3350,3550,3800,3500,3950,3600,3550,4300,3400,4450,3300,4300,3700,4350,2900,4100,3725,4725,3075,4250,2925,3550,3750,3900,3175,4775,3825,4600,3200,4275,3900,4075,2900,3775,3350,3325,3150,3500,3450,3875,3050,4000,3275,4300,3050,4000,3325,3500,3500,4475,3425,3900,3175,3975,3400,4250,3400,3475,3050,3725,3000,3650,4250,3475,3450,3750,3700,4000,4500,5700,4450,5700,5400,4550,4800,5200,4400,5150,4650,5550,4650,5850,4200,5850,4150,6300,4800,5350,5700,5000,4400,5050,5000,5100,4100,5650,4600,5550,5250,4700,5050,6050,5150,5400,4950,5250,4350,5350,3950,5700,4300,4750,5550,4900,4200,5400,5100,5300,4850,5300,4400,5000,4900,5050,4300,5000,4450,5550,4200,5300,4400,5650,4700,5700,4650,5800,4700,5550,4750,5000,5100,5200,4700,5800,4600,6000,4750,5950,4625,5450,4725,5350,4750,5600,4600,5300,4875,5550,4950,5400,4750,5650,4850,5200,4925,4875,4625,5250,4850,5600,4975,5500,4725,5500,4700,5500,4575,5500,5000,5950,4650,5500,4375,5850,4875,6000,4925,4850,5750,5200,5400,3500,3900,3650,3525,3725,3950,3250,3750,4150,3700,3800,3775,3700,4050,3575,4050,3300,3700,3450,4400,3600,3400,2900,3800,3300,4150,3400,3800,3700,4550,3200,4300,3350,4100,3600,3900,3850,4800,2700,4500,3950,3650,3550,3500,3675,4450,3400,4300,3250,3675,3325,3950,3600,4050,3350,3450,3250,4050,3800,3525,3950,3650,3650,4000,3400,3775,4100,3775];

// ---- Shared math, computed from the data each figure draws. ----
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sdOf = a => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length); };
const covOf = (a, b) => { const ma = mean(a), mb = mean(b); return a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0) / a.length; };
const zscores = a => { const m = mean(a), s = sdOf(a); return a.map(v => (v - m) / s); };
const covMatrix = cols => cols.map(a => cols.map(b => covOf(a, b)));
const SQ = Math.SQRT1_2;

// The five points of the hand example (the lesson's table).
const POINTS = [[1, 2], [2, 1], [3, 4], [4, 3], [5, 5]];
const CENTER = [3, 3];
const centered = POINTS.map(p => [p[0] - CENTER[0], p[1] - CENTER[1]]);
const score = (d, u) => d[0] * u[0] + d[1] * u[1];
const varianceAlong = u => mean(centered.map(d => score(d, u) ** 2));
const PC1 = [SQ, SQ], PC2 = [SQ, -SQ];

// ---- Figure 1: the same points projected onto three directions. ----
function directions() {
  const w = 200, gap = 20, top = 34, h = 200, pad = 18;
  const dirs = [
    { u: [1, 0], name: tr('Along the first axis', 'Sepanjang sumbu pertama') },
    { u: PC1, name: tr('Along the diagonal', 'Sepanjang diagonal') },
    { u: PC2, name: tr('Along the other diagonal', 'Sepanjang diagonal lainnya') },
  ];
  const vars = dirs.map(d => varianceAlong(d.u));
  const best = vars.indexOf(Math.max(...vars));
  const body = dirs.map((d, i) => {
    const ox = i * (w + gap);
    const X = v => ox + pad + v / 6 * (w - 2 * pad), Y = v => top + h - pad - v / 6 * (h - 2 * pad);
    const s = centered.map(p => score(p, d.u));
    const foot = t => [CENTER[0] + t * d.u[0], CENTER[1] + t * d.u[1]];
    const reach = 2.9 / Math.max(Math.abs(d.u[0]), Math.abs(d.u[1]));
    const a = foot(-reach), b = foot(reach);
    const lo = foot(Math.min(...s)), hi = foot(Math.max(...s));
    const win = i === best;
    return `${text(ox + w / 2, 20, d.name, { fill: 'var(--ink)', weight: 700, size: 13 })}
${box(ox, top, w, h, 'var(--surface)', win ? k(1) : 'var(--line)')}
${line(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), { c: 'var(--muted)', w: 1.6 })}
${POINTS.map((p, j) => { const f = foot(s[j]); return line(X(p[0]), Y(p[1]), X(f[0]), Y(f[1]), { c: 'var(--muted)', w: 1.2, dash: '3 3' }); }).join('')}
${line(X(lo[0]), Y(lo[1]), X(hi[0]), Y(hi[1]), { c: k(1), w: 6 })}
${s.map(t => { const f = foot(t); return dot(X(f[0]), Y(f[1]), k(0), 4); }).join('')}
${POINTS.map(p => dot(X(p[0]), Y(p[1]), 'var(--ink)', 4.5)).join('')}
${text(ox + w / 2, top + h + 22, `${tr('variance', 'varians')} ${fmt(vars[i], { digits: 1 })}`, { fill: win ? k(1) : 'var(--ink)', weight: 700, size: 14 })}`;
  }).join('');
  return svg(640, 280, body);
}

// ---- Figure 2: the two principal axes, and the two points of the worked example. ----
function projection() {
  const S = 300, ox = 10, oy = 14, pad = 24;
  const X = v => ox + pad + v / 6 * (S - 2 * pad), Y = v => oy + S - pad - v / 6 * (S - 2 * pad);
  const along = (u, t) => [CENTER[0] + t * u[0], CENTER[1] + t * u[1]];
  const axis = (u, name, c) => {
    const a = along(u, -3.9), b = along(u, 3.9);
    return `${line(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), { c, w: 2.6, arrow: true })}`;
  };
  const A = POINTS[4], B = POINTS[0];
  const sB = score(centered[0], PC1), sA = score(centered[4], PC1);
  const footB = along(PC1, sB);
  const rows = [[tr('Point', 'Titik'), 'PC1', 'PC2'],
    ['A (5, 5)', fmt(score(centered[4], PC1), { digits: 2 }), fmt(Math.abs(score(centered[4], PC2)) < 1e-9 ? 0 : score(centered[4], PC2), { digits: 2 })],
    ['B (1, 2)', fmt(score(centered[0], PC1), { digits: 2 }), fmt(score(centered[0], PC2), { digits: 2 })]];
  const tx = 350;
  const table = rows.map((r, i) => `${text(tx, 70 + i * 30, r[0], { anchor: 'start', fill: 'var(--ink)', weight: i ? 600 : 700, size: 14 })}${text(tx + 150, 70 + i * 30, r[1], { anchor: 'end', fill: 'var(--ink)', weight: i ? 500 : 700, size: 14 })}${text(tx + 230, 70 + i * 30, r[2], { anchor: 'end', fill: 'var(--ink)', weight: i ? 500 : 700, size: 14 })}`).join('');
  const pa = along(PC1, 3.9), pb = along(PC2, 3.9);
  return svg(640, 340, `${box(ox, oy, S, S)}
${axis(PC1, 'PC1', k(1))}${axis(PC2, 'PC2', k(2))}
${text(X(pa[0]) - 6, Y(pa[1]) - 8, 'PC1', { fill: k(1), weight: 700, size: 14, anchor: 'end' })}
${text(X(pb[0]) + 8, Y(pb[1]) - 6, 'PC2', { fill: k(2), weight: 700, size: 14, anchor: 'start' })}
${line(X(B[0]), Y(B[1]), X(footB[0]), Y(footB[1]), { c: 'var(--ink)', w: 1.6, dash: '4 3' })}
${POINTS.map(p => dot(X(p[0]), Y(p[1]), 'var(--ink)', 4.5)).join('')}
${dot(X(CENTER[0]), Y(CENTER[1]), 'var(--muted)', 3.5)}
${ring(X(A[0]), Y(A[1]), k(3), 9)}${ring(X(B[0]), Y(B[1]), k(3), 9)}
${diamond(X(footB[0]), Y(footB[1]), k(3), 6)}
${text(X(A[0]) + 14, Y(A[1]) + 18, 'A', { fill: k(3), weight: 700, size: 14 })}
${text(X(B[0]) - 14, Y(B[1]) - 8, 'B', { fill: k(3), weight: 700, size: 14 })}
${text(tx, 36, tr('Scores on the new axes', 'Skor pada sumbu baru'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}
${line(tx, 48, tx + 240, 48, { c: 'var(--line)', w: 1.2 })}
${table}
${text(tx, 170, `${tr('variance on PC1', 'varians pada PC1')}: ${fmt(varianceAlong(PC1), { digits: 1 })}`, { anchor: 'start', fill: k(1), weight: 700, size: 14 })}
${text(tx, 196, `${tr('variance on PC2', 'varians pada PC2')}: ${fmt(varianceAlong(PC2), { digits: 1 })}`, { anchor: 'start', fill: k(2), weight: 700, size: 14 })}
${text(tx, 236, tr(`Keep only PC1: B lands at (${fmt(footB[0], { digits: 1 })}, ${fmt(footB[1], { digits: 1 })}),`, `Simpan hanya PC1: B jatuh di (${fmt(footB[0], { digits: 1 })}, ${fmt(footB[1], { digits: 1 })}),`), { anchor: 'start', size: 13 })}
${text(tx, 256, tr(`${fmt(Math.abs(score(centered[0], PC2)), { digits: 2 })} from where it was (diamond).`, `${fmt(Math.abs(score(centered[0], PC2)), { digits: 2 })} dari posisi aslinya (belah ketupat).`), { anchor: 'start', size: 13 })}
${text(tx, 276, tr('A loses nothing: its PC2 score is 0.', 'A tidak kehilangan apa pun: skor PC2-nya 0.'), { anchor: 'start', size: 13 })}`);
}

// ---- Figure 3: scree plot of the four standardized penguin columns. ----
function scree() {
  const Z = [BILL_LENGTH, BILL_DEPTH, FLIPPER, MASS].map(zscores);
  const { values } = eigenSym(covMatrix(Z));
  const total = values.reduce((s, v) => s + v, 0);
  const ratios = values.map(v => v / total);
  let run = 0;
  const cum = ratios.map(r => (run += r));
  const L = 70, R = 610, T = 24, Bt = 236;
  const Y = f => Bt - f * (Bt - T);
  const slot = (R - L) / ratios.length, bw = 70;
  const X = i => L + slot * i + slot / 2;
  const grid = [0, 0.25, 0.5, 0.75, 1].map(f => `${line(L, Y(f), R, Y(f), { c: 'var(--line)', w: 1 })}${text(L - 8, Y(f) + 4, pct(f, 0), { anchor: 'end', size: 12 })}`).join('');
  const bars = ratios.map((r, i) => `<rect x="${X(i) - bw / 2}" y="${Y(r)}" width="${bw}" height="${Bt - Y(r)}" rx="4" fill="${k(0)}"/>${r > 0.3 ? text(X(i), Y(r) + 24, pct(r), { fill: '#fff', weight: 700, size: 13 }) : text(X(i), Y(r) - 7, pct(r), { fill: 'var(--ink)', weight: 700, size: 13 })}${text(X(i), Bt + 20, `PC${i + 1}`, { fill: 'var(--ink)', weight: 600, size: 13 })}`).join('');
  const path = cum.map((c, i) => `${i ? 'L' : 'M'}${X(i)} ${Y(c)}`).join('');
  const cumDots = cum.map((c, i) => `${ring(X(i), Y(c), k(1), 5)}${i ? text(X(i) + 12, Y(c) + 18, pct(c), { anchor: 'start', fill: k(1), weight: 700, size: 12 }) : ''}`).join('');
  return svg(640, 286, `${grid}${bars}<path d="${path}" stroke="${k(1)}" stroke-width="2.6" fill="none" stroke-linejoin="round"/>${cumDots}
${dot(L + 20, 14, k(0), 5)}${text(L + 32, 18, tr('explained variance', 'explained variance'), { anchor: 'start', size: 12 })}${ring(L + 200, 14, k(1), 5)}${text(L + 212, 18, tr('running total', 'total berjalan'), { anchor: 'start', size: 12 })}
${text((L + R) / 2, 276, tr('Sum of the eigenvalues = 4 (four columns, variance 1 each)', 'Jumlah eigenvalue = 4 (empat kolom, masing-masing varians 1)'), { size: 12 })}`);
}

// ---- Figure 4: raw versus standardized flipper length and body mass. ----
function standardize() {
  const raw = [FLIPPER, MASS];
  const std = raw.map(zscores);
  const panel = (i, title, cols, big) => {
    const C = covMatrix(cols), { values, vectors } = eigenSym(C);
    const ratio = values[0] / (values[0] + values[1]);
    const vars = [C[0][0], C[1][1]], top = Math.max(...vars);
    const ox = i * 330, bx = ox + 80, bmax = 130;
    const bar = (j, name, c) => {
      const y = 70 + j * 44, wd = Math.max(vars[j] / top * bmax, 2);
      return `${text(bx - 8, y + 15, name, { anchor: 'end', fill: 'var(--ink)', weight: 600, size: 13 })}<rect x="${bx}" y="${y}" width="${wd}" height="22" rx="4" fill="${c}"/>${text(bx + wd + 8, y + 16, fmt(vars[j], { digits: 2 }), { anchor: 'start', fill: 'var(--ink)', weight: 600, size: 13 })}`;
    };
    const v = vectors[0].map(x => (vectors[0][0] < 0 ? -x : x));
    return `${box(ox, 6, 310, 230)}
${text(ox + 155, 30, title, { fill: 'var(--ink)', weight: 700, size: 14 })}
${text(ox + 20, 58, tr('variance of each column', 'varians tiap kolom'), { anchor: 'start', size: 12 })}
${bar(0, tr('flipper', 'sirip'), k(0))}${bar(1, tr('mass', 'massa'), k(2))}
${line(ox + 20, 160, ox + 290, 160, { c: 'var(--line)', w: 1.2 })}
${text(ox + 155, 184, `PC1 = (${fmt(v[0], { digits: 2 })}, ${fmt(v[1], { digits: 2 })})`, { fill: 'var(--ink)', weight: 700, size: 14 })}
${text(ox + 155, 210, `${tr('PC1 explains', 'PC1 menjelaskan')} ${pct(ratio, big ? 2 : 1)}`, { fill: big ? k(3) : k(1), weight: 700, size: 15 })}`;
  };
  return svg(640, 244, `${panel(0, tr('Raw: millimeters and grams', 'Mentah: milimeter dan gram'), raw, true)}${panel(1, tr('Standardized: z-scores', 'Standardisasi: z-score'), std, false)}`);
}

export const figures = {
  directions,
  projection,
  scree,
  standardize,
};
