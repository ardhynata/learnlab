// Figures for the "PCA lab" lesson. Every number a figure shows is computed from the same seeded data the lab
// draws (generatedCloud / wideTable in sims/ml/pcalab.js, fitted with sims/ml/pca.js), so the pictures agree
// with the numbers in the text and in the lab's status line: the default cloud (Strong correlation, 2-D, 120
// points, seed 1) and the 8-feature table behind the scree plot (150 rows, seed 1).
import { svg, dot, text, line, box, k, tr, fmt, pct } from '../kit.js';
import { fitPca } from '../../sims/ml/pca.js';
import { generatedCloud, wideTable, axisFromAngles, anglesFromAxis, axisReport, projectOnAxis, sweepAxis, componentCurves } from '../../sims/ml/pcalab.js';

const num = v => fmt(v, { digits: 2 });
const deg = v => `${fmt(v, { max: 1 })}°`;

const cloud = () => generatedCloud('strong', 2, 1, 120);

// ---- Figure 1: the same cloud, three axes. ----
function rotate() {
  const X = cloud(), model = fitPca(X);
  const best = anglesFromAxis(model.components[0]).azimuth;
  const axes = [
    { az: 0, title: tr('Axis at 0°', 'Sumbu di 0°') },
    { az: best, title: tr(`Best axis, ${deg(best)}`, `Sumbu terbaik, ${deg(best)}`) },
    { az: best + 90, title: tr(`Turned by 90°, ${deg(best + 90)}`, `Diputar 90°, ${deg(best + 90)}`) },
  ];
  const big = Math.max(...X.map(r => Math.max(Math.abs(r[0]), Math.abs(r[1])))) * 1.05;
  const w = 200, gap = 20, top = 34, h = 200;
  const body = axes.map((a, i) => {
    const ox = i * (w + gap);
    const sx = v => ox + w / 2 + v / big * (w / 2 - 6), sy = v => top + h / 2 - v / big * (h / 2 - 6);
    const u = axisFromAngles(a.az, 0, 2);
    const rep = axisReport(X, u), { feet } = projectOnAxis(X, u);
    const reach = big / Math.max(Math.abs(u[0]), Math.abs(u[1]));
    const winner = i === 1;
    return `${text(ox + w / 2, 20, a.title, { fill: 'var(--ink)', weight: 700, size: 13 })}
${box(ox, top, w, h, 'var(--surface)', winner ? k(1) : 'var(--line)')}
${X.map((r, j) => line(sx(r[0]), sy(r[1]), sx(feet[j][0]), sy(feet[j][1]), { c: 'var(--muted)', w: 0.8, dash: '2 2' })).join('')}
${line(sx(-u[0] * reach), sy(-u[1] * reach), sx(u[0] * reach), sy(u[1] * reach), { c: k(1), w: 3 })}
${X.map(r => dot(sx(r[0]), sy(r[1]), k(0), 2.6)).join('')}
${feet.map(f => dot(sx(f[0]), sy(f[1]), k(2), 2.2)).join('')}
${text(ox + w / 2, top + h + 20, `${tr('keeps', 'menyimpan')} ${num(rep.along)} (${pct(rep.keptRatio)})`, { fill: 'var(--ink)', weight: 700, size: 13 })}
${text(ox + w / 2, top + h + 40, `${tr('loses', 'kehilangan')} ${num(rep.lost)} (${pct(rep.lostRatio)})`, { fill: k(1), weight: 700, size: 13 })}`;
  }).join('');
  return svg(640, 300, body);
}

// ---- Figure 2: variance kept and information lost at every angle. ----
function sweep() {
  const X = cloud(), model = fitPca(X);
  const sw = sweepAxis(X, 0, 1);
  const total = axisReport(X, [1, 0]).total;
  const best = anglesFromAxis(model.components[0]).azimuth;
  const L = 60, R = 620, T = 40, Bt = 236, ymax = 5;
  const X_ = a => L + a / 180 * (R - L), Y_ = v => Bt - v / ymax * (Bt - T);
  const grid = [0, 1, 2, 3, 4, 5].map(v => `${line(L, Y_(v), R, Y_(v), { c: 'var(--line)', w: 1 })}${text(L - 8, Y_(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('')
    + [0, 45, 90, 135, 180].map(a => `${line(X_(a), Bt, X_(a), Bt + 5, { c: 'var(--muted)', w: 1 })}${text(X_(a), Bt + 20, `${fmt(a)}°`, { size: 12 })}`).join('');
  const path = ys => sw.angles.map((a, i) => `${i ? 'L' : 'M'}${X_(a)} ${Y_(ys[i])}`).join('');
  const mark = a => {
    const r = axisReport(X, axisFromAngles(a, 0, 2));
    return `${line(X_(a), T, X_(a), Bt, { c: 'var(--muted)', w: 1, dash: '4 4' })}${dot(X_(a), Y_(r.along), k(0), 5)}${dot(X_(a), Y_(r.lost), k(1), 5)}`;
  };
  const dx = a => (a > 100 ? -8 : 8), anc = a => (a > 100 ? 'end' : 'start');
  const r0 = axisReport(X, axisFromAngles(0, 0, 2)), rb = axisReport(X, model.components[0]);
  return svg(640, 290, `${grid}
${line(L, Y_(total), R, Y_(total), { c: 'var(--muted)', w: 1.6, dash: '6 4' })}
${text(R, Y_(total) - 6, `${tr('total variance', 'varians total')} ${num(total)}`, { anchor: 'end', size: 12 })}
<path d="${path(sw.kept)}" stroke="${k(0)}" stroke-width="2.8" fill="none" stroke-linejoin="round"/>
<path d="${path(sw.lost)}" stroke="${k(1)}" stroke-width="2.8" fill="none" stroke-linejoin="round"/>
${mark(0)}${mark(best)}${mark(best + 90)}
${text(X_(0) + dx(0), Y_(r0.along) - 10, num(r0.along), { anchor: 'start', fill: k(0), weight: 700, size: 12 })}
${text(X_(0) + dx(0), Y_(r0.lost) + 18, num(r0.lost), { anchor: 'start', fill: k(1), weight: 700, size: 12 })}
${text(X_(best) + 8, Y_(rb.along) + 4, num(rb.along), { anchor: 'start', fill: k(0), weight: 700, size: 12 })}
${text(X_(best) + 8, Y_(rb.lost) - 8, num(rb.lost), { anchor: 'start', fill: k(1), weight: 700, size: 12 })}
${text(X_(best + 90) - 8, Y_(rb.lost) + 18, num(rb.lost), { anchor: 'end', fill: k(0), weight: 700, size: 12 })}
${text(X_(best + 90) - 8, Y_(rb.along) - 8, num(rb.along), { anchor: 'end', fill: k(1), weight: 700, size: 12 })}
${line(L + 6, 16, L + 30, 16, { c: k(0), w: 3 })}${text(L + 36, 20, tr('variance along the axis', 'varians sepanjang sumbu'), { anchor: 'start', size: 12 })}
${line(L + 230, 16, L + 254, 16, { c: k(1), w: 3 })}${text(L + 260, 20, tr('information lost', 'informasi yang hilang'), { anchor: 'start', size: 12 })}
${text((L + R) / 2, 282, tr('Axis angle (degrees)', 'Sudut sumbu (derajat)'), { size: 12 })}`);
}

// ---- Figure 3: the scree plot of the 8-feature table, and what keeping k components loses. ----
function scree() {
  const model = fitPca(wideTable('strong', 1, 150, 8));
  const c = componentCurves(model), d = model.d, keep = 2;
  const panel = (ox, title) => ({ ox, title });
  const left = panel(0, tr('Variance of each component', 'Varians tiap komponen'));
  const right = panel(330, tr('Information lost, by components kept', 'Informasi hilang per komponen dipertahankan'));
  const w = 300, top = 40, Bt = 214, T = top + 6;
  const Y_ = v => Bt - v / 100 * (Bt - T);
  const grid = ox => [0, 25, 50, 75, 100].map(v => `${line(ox + 40, Y_(v), ox + w, Y_(v), { c: 'var(--line)', w: 1 })}${text(ox + 34, Y_(v) + 4, `${fmt(v)}%`, { anchor: 'end', size: 11 })}`).join('');
  const slot = (w - 50) / d;
  const bx = i => left.ox + 50 + slot * i + slot / 2;
  const bars = c.explained.map((v, i) => `<rect x="${bx(i) - 12}" y="${Y_(v)}" width="24" height="${Bt - Y_(v)}" rx="3" fill="${i < keep ? k(0) : k(1)}"/>${text(bx(i), Bt + 16, fmt(i + 1), { size: 12 })}${v >= 4 ? text(bx(i), Y_(v) - 5, `${fmt(v, { digits: 1 })}%`, { size: 11, fill: 'var(--ink)', weight: 600 }) : ''}`).join('');
  const rx = j => right.ox + 50 + j / d * (w - 60);
  const pts = c.lostByK.map((v, j) => `${j ? 'L' : 'M'}${rx(j)} ${Y_(v)}`).join('');
  const dots = c.lostByK.map((v, j) => `<circle cx="${rx(j)}" cy="${Y_(v)}" r="${j === keep ? 6 : 4}" fill="${j === keep ? k(1) : 'var(--surface)'}" stroke="${k(1)}" stroke-width="2"/>`).join('');
  const ticks = c.lostByK.map((_, j) => text(rx(j), Bt + 16, fmt(j), { size: 12 })).join('');
  return svg(640, 296, `${box(left.ox, 4, 310, 262)}${box(right.ox, 4, 310, 262)}
${text(left.ox + 155, 26, left.title, { fill: 'var(--ink)', weight: 700, size: 13 })}${text(right.ox + 155, 26, right.title, { fill: 'var(--ink)', weight: 700, size: 12 })}
${grid(left.ox)}${bars}${text(left.ox + 40 + (w - 40) / 2, Bt + 34, tr('Component', 'Komponen'), { size: 12 })}
${grid(right.ox)}<path d="${pts}" stroke="${k(1)}" stroke-width="2.6" fill="none" stroke-linejoin="round"/>${dots}${ticks}${text(right.ox + 40 + (w - 40) / 2, Bt + 34, tr('Components kept', 'Komponen yang dipertahankan'), { size: 12 })}
${text(rx(keep) + 10, Y_(c.lostByK[keep]) - 12, `k = ${fmt(keep)}: ${pct(c.lostByK[keep] / 100)}`, { anchor: 'start', fill: k(1), weight: 700, size: 13 })}
${dot(left.ox + 70, 282, k(0), 5)}${text(left.ox + 82, 286, tr(`kept (k = ${fmt(keep)}): ${pct(1 - c.lostByK[keep] / 100)}`, `dipertahankan (k = ${fmt(keep)}): ${pct(1 - c.lostByK[keep] / 100)}`), { anchor: 'start', size: 12 })}
${dot(left.ox + 330, 282, k(1), 5)}${text(left.ox + 342, 286, tr('dropped', 'dibuang'), { anchor: 'start', size: 12 })}`);
}

// ---- Figure 4: the same question on six fresh samples of each cloud. ----
function fresh() {
  const kinds = [
    { id: 'strong', name: tr('Strong correlation', 'Korelasi kuat'), c: k(0) },
    { id: 'noisy', name: tr('Noisy', 'Noisy'), c: k(2) },
    { id: 'round', name: tr('Round (no correlation)', 'Bulat (tanpa korelasi)'), c: k(3) },
  ];
  const seeds = [1, 2, 3, 4, 5, 6];
  const L = 190, R = 610, lo = 40, hi = 100, top = 46;
  const X_ = v => L + (v - lo) / (hi - lo) * (R - L);
  const axis = [40, 50, 60, 70, 80, 90, 100].map(v => `${line(X_(v), top - 8, X_(v), top + 3 * 62 - 22, { c: 'var(--line)', w: 1 })}${text(X_(v), top + 3 * 62 - 6, `${fmt(v)}%`, { size: 12 })}`).join('');
  const rows = kinds.map((kd, i) => {
    const y = top + i * 62 + 14;
    const shares = seeds.map(s => fitPca(generatedCloud(kd.id, 2, s, 120)).explainedRatio[0] * 100);
    const a = Math.min(...shares), b = Math.max(...shares);
    return `${text(L - 14, y + 4, kd.name, { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 13 })}
${line(X_(a), y, X_(b), y, { c: kd.c, w: 3 })}
${shares.map(v => `<circle cx="${X_(v)}" cy="${y}" r="5.5" fill="${kd.c}" fill-opacity="0.85" stroke="var(--surface)" stroke-width="1.5"/>`).join('')}
${text((X_(a) + X_(b)) / 2, y - 14, a === b || Math.abs(b - a) < 0.05 ? pct(a / 100) : `${pct(a / 100)} – ${pct(b / 100)}`, { size: 12, fill: 'var(--ink)', weight: 600 })}`;
  }).join('');
  return svg(640, 260, `${axis}${rows}
${text((L + R) / 2, 250, tr('Variance kept by the best axis: six samples of 120 points each', 'Varians yang disimpan sumbu terbaik: enam sampel, masing-masing 120 titik'), { size: 12 })}`);
}

export const figures = {
  'rotate': rotate,
  'sweep': sweep,
  'scree': scree,
  'fresh': fresh,
};
