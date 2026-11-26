// Figures for the lesson "Splits and impurity": [[figure:splits-and-impurity/name|Caption]].
// The ten penguins are real rows of data/penguins.csv: the first five Adelie with a
// measurement (file lines 2, 3, 4, 6, 7) and five consecutive Chinstrap (lines 279 to 283).
// Every Gini and entropy number below is computed from these rows, not typed in.
import { svg, dot, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
// [species, flipper length (mm), bill length (mm)]
const P = [
  ['A', 181, 39.1], ['A', 186, 39.5], ['A', 195, 40.3], ['A', 193, 36.7], ['A', 190, 39.3],
  ['C', 196, 50.0], ['C', 193, 51.3], ['C', 188, 45.4], ['C', 197, 52.7], ['C', 198, 45.2],
];
const COLOR = { A: 0, C: 1 };
const counts = rows => [rows.filter(r => r[0] === 'A').length, rows.filter(r => r[0] === 'C').length];
const giniOf = ([a, c]) => { const n = a + c; return n ? 1 - (a / n) ** 2 - (c / n) ** 2 : 0; };
const gini = rows => giniOf(counts(rows));
const weighted = (L, R) => (L.length * gini(L) + R.length * gini(R)) / (L.length + R.length);
const cutFlipper = t => [P.filter(r => r[1] <= t), P.filter(r => r[1] > t)];
const cutBill = t => [P.filter(r => r[2] <= t), P.filter(r => r[2] > t)];
const ROOT = gini(P);
const species = s => (s === 'A' ? 'Adelie' : 'Chinstrap');
// Adelie is a filled dot, Chinstrap a filled square, so the two stay apart without color.
const mark = (x, y, s, r = 6) => (s === 'A'
  ? dot(x, y, k(COLOR[s]), r)
  : `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="2" fill="${k(COLOR[s])}"/>`);
const legend = (x, y) => `${mark(x, y, 'A', 5.5)}${text(x + 12, y + 4, 'Adelie', { anchor: 'start', size: 12 })}
${mark(x + 80, y, 'C', 5.5)}${text(x + 92, y + 4, 'Chinstrap', { anchor: 'start', size: 12 })}`;

// Gini and entropy of a two-class group against the share p of one class.
function giniCurve() {
  const X0 = 80, X1 = 590, Y0 = 250, Y1 = 50;
  const X = p => X0 + p * (X1 - X0), Y = v => Y0 - v * (Y0 - Y1);
  const ent = p => (p <= 0 || p >= 1 ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p)));
  const path = f => Array.from({ length: 81 }, (_, i) => { const p = i / 80; return `${i ? 'L' : 'M'}${X(p).toFixed(1)} ${Y(f(p)).toFixed(1)}`; }).join('');
  const p7 = 5 / 7;
  const grid = [0, 0.5, 1].map(v => `${line(X0, Y(v), X1, Y(v), { c: 'var(--line)', w: 1.2, dash: '3 4' })}${text(X0 - 10, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const xt = [0, 0.5, 1].map(p => `${line(X(p), Y0, X(p), Y0 + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(p), Y0 + 20, p === 0.5 ? fmt(p) : `${fmt(p)} (${tr('pure', 'murni')})`, { size: 12 })}`).join('');
  return svg(640, 310, `${grid}${line(X0, Y0, X1, Y0, { c: 'var(--muted)', w: 1.6 })}
<path d="${path(p => 1 - p * p - (1 - p) * (1 - p))}" fill="none" stroke="${k(0)}" stroke-width="3.2"/>
<path d="${path(ent)}" fill="none" stroke="${k(2)}" stroke-width="3.2" stroke-dasharray="7 4"/>
${text(X(0.5), Y(1) - 10, tr('entropy (peaks at 1)', 'entropy (puncak di 1)'), { fill: k(2), weight: 700, size: 13 })}
${text(X(0.5), Y(0.5) - 12, tr('Gini (peaks at 0.5)', 'Gini (puncak di 0,5)'), { fill: k(0), weight: 700, size: 13 })}
${dot(X(p7), Y(giniOf([5, 2])), 'var(--ink)', 5.5)}
${line(X(p7), Y(giniOf([5, 2])) + 7, X(p7), Y0, { c: 'var(--ink)', w: 1.4, dash: '3 3' })}
${text(X(p7) - 8, Y0 - 12, `${tr('5 Adelie in 7', '5 Adelie dari 7')}: Gini ${fmt(giniOf([5, 2]), { digits: 2 })}`, { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 12 })}
${xt}${text(X(0.5), 302, tr('share of one class in the group (p)', 'porsi satu kelas dalam kelompok (p)'), { size: 12 })}
${text(X0 - 10, 34, tr('impurity', 'impurity'), { anchor: 'end', size: 12 })}`);
}

// The ten penguins on a flipper line, and the weighted Gini of every candidate cut.
function thresholdScan() {
  const LO = 180, HI = 199, X0 = 50, X1 = 610;
  const X = v => X0 + (v - LO) / (HI - LO) * (X1 - X0);
  const values = [...new Set(P.map(r => r[1]))].sort((a, b) => a - b);
  const cuts = values.slice(0, -1).map((v, i) => (v + values[i + 1]) / 2);
  const scores = cuts.map(t => weighted(...cutFlipper(t)));
  const best = scores.indexOf(Math.min(...scores));
  const BASE = 340, SC = 260;       // baseline of the bars and pixels per unit of Gini
  const axisY = 100;
  const stacks = {};
  const dots = P.map(r => { const n = stacks[r[1]] = (stacks[r[1]] ?? 0) + 1; return mark(X(r[1]), axisY - 14 - (n - 1) * 15, r[0], 5.5); }).join('');
  const ticks = [180, 185, 190, 195].map(v => `${line(X(v), axisY, X(v), axisY + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(v), axisY + 20, fmt(v), { size: 12 })}`).join('');
  const guide = line(X(cuts[best]), 130, X(cuts[best]), BASE, { c: k(2), w: 1.6, dash: '3 4' });
  const halo = (x, y, t, o) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${o.size}" font-weight="${o.weight}" fill="${o.fill}" stroke="var(--surface)" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${t}</text>`;
  const bars = cuts.map((t, i) => {
    const h = scores[i] * SC, isBest = i === best;
    return `<rect x="${(X(t) - 11).toFixed(1)}" y="${(BASE - h).toFixed(1)}" width="22" height="${h.toFixed(1)}" rx="3" fill="${isBest ? k(2) : soft(2)}" stroke="${k(2)}" stroke-width="${isBest ? 2.4 : 1.6}"/>
${halo(X(t).toFixed(1), (BASE - h - 6).toFixed(1), fmt(scores[i], { digits: 2 }), { size: 12, weight: isBest ? 700 : 500, fill: isBest ? 'var(--ink)' : 'var(--muted)' })}
${text(X(t), BASE + 16 + (i % 2) * 14, fmt(t), { size: 11, weight: isBest ? 700 : 500, fill: isBest ? 'var(--ink)' : 'var(--muted)' })}`;
  }).join('');
  const topY = BASE - ROOT * SC;
  return svg(640, 378, `${text(14, 22, tr('Flipper length (mm) of ten penguins', 'Panjang flipper (mm) sepuluh penguin'), { anchor: 'start', ...INK, size: 13 })}
<g>${legend(430, 18)}</g>
${line(X0, axisY, X1, axisY, { c: 'var(--muted)', w: 2 })}${dots}${ticks}
${text(14, 150, tr('Weighted Gini after each candidate cut (mm)', 'weighted Gini setelah tiap kandidat potongan (mm)'), { anchor: 'start', ...INK, size: 13 })}
${guide}
${line(X0, topY, X1, topY, { c: 'var(--muted)', w: 1.6, dash: '6 4' })}
${text(14, topY - 24, `${tr('before any cut', 'sebelum dipotong')}: ${fmt(ROOT, { digits: 2 })}  ·  ${tr('best cut', 'potongan terbaik')} ${fmt(cuts[best])}: ${fmt(scores[best], { digits: 2 })}  ·  ${tr('gain', 'gain')} ${fmt(ROOT - scores[best], { digits: 2 })}`, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 12 })}
${bars}${line(X0, BASE, X1, BASE, { c: 'var(--muted)', w: 1.6 })}`);
}

// The same ten penguins cut on flipper length (left) and on bill length (right).
function twoFeatures() {
  const panel = (ox, title, cutAt, vertical) => {
    const x0 = ox + 46, x1 = ox + 296, y0 = 236, y1 = 64;       // plot area; y grows downward
    const X = b => x0 + (b - 34) / (54 - 34) * (x1 - x0), Y = f => y0 - (f - 178) / (200 - 178) * (y0 - y1);
    const [L, R] = vertical ? cutBill(cutAt) : cutFlipper(cutAt);
    const w = weighted(L, R);
    const cut = vertical
      ? line(X(cutAt), y1 - 6, X(cutAt), y0, { c: 'var(--ink)', w: 2.8 })
      : line(x0, Y(cutAt), x1 + 4, Y(cutAt), { c: 'var(--ink)', w: 2.8 });
    const pts = P.map(r => mark(X(r[2]), Y(r[1]), r[0], 5.5)).join('');
    const tag = (x, y, rows, anchor) => `${text(x, y, `${counts(rows)[0]} A · ${counts(rows)[1]} C`, { anchor, size: 12, fill: 'var(--ink)', weight: 700 })}${text(x, y + 14, `Gini ${fmt(gini(rows), { digits: 2 })}`, { anchor, size: 12 })}`;
    const regions = vertical
      ? `${tag(x0 + 6, y1 + 8, L, 'start')}${tag(x1 - 2, y0 - 24, R, 'end')}`
      : `${tag(x0 + 6, y1 + 8, R, 'start')}${tag(x1 - 2, y0 - 24, L, 'end')}`;
    return `${box(ox, 30, 310, 292)}${text(ox + 155, 22, title, INK)}
${line(x0, y0, x1, y0, { c: 'var(--muted)', w: 1.6 })}${line(x0, y0, x0, y1 - 6, { c: 'var(--muted)', w: 1.6 })}
${[36, 42, 48, 54].map(b => `${line(X(b), y0, X(b), y0 + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(b), y0 + 19, fmt(b), { size: 11 })}`).join('')}
${[180, 190, 200].map(f => `${line(x0 - 5, Y(f), x0, Y(f), { c: 'var(--muted)', w: 1.4 })}${text(x0 - 9, Y(f) + 4, fmt(f), { anchor: 'end', size: 11 })}`).join('')}
${cut}${pts}${regions}
${text(ox + 171, y0 + 36, tr('bill length (mm)', 'bill length (mm)'), { size: 11 })}${text(ox + 14, 52, tr('flipper (mm)', 'flipper (mm)'), { anchor: 'start', size: 11 })}
${text(ox + 155, 314, `${tr('weighted Gini', 'weighted Gini')} ${fmt(w, { digits: 2 })}  ·  ${tr('gain', 'gain')} ${fmt(ROOT - w, { digits: 2 })}`, { ...INK, size: 13 })}`;
  };
  return svg(640, 336, `${panel(0, tr('Cut: flipper at most 195.5', 'Potongan: flipper paling banyak 195,5'), 195.5, false)}
${panel(330, tr('Cut: bill at most 43', 'Potongan: bill length paling banyak 43'), 43, true)}`);
}

// A small tree grown by recursion: flipper first, then bill length on the mixed group.
function splitTree() {
  const node = (cx, cy, rows, question, leaf) => {
    const w = leaf ? 190 : 220, h = 84, [a, c] = counts(rows), n = a + c, bw = w - 24;
    const g = gini(rows);
    const head = leaf
      ? `${tr('predict', 'prediksi')} ${species(a >= c ? 'A' : 'C')}`
      : question;
    return `<g>${box(cx - w / 2, cy - h / 2, w, h, leaf ? soft(a >= c ? 0 : 1) : 'var(--surface)', leaf ? k(a >= c ? 0 : 1) : 'var(--line)')}
${text(cx, cy - 22, head, { ...INK, size: 13 })}
<rect x="${cx - bw / 2}" y="${cy - 10}" width="${(bw * a / n).toFixed(1)}" height="14" fill="${k(0)}"/><rect x="${(cx - bw / 2 + bw * a / n).toFixed(1)}" y="${cy - 10}" width="${(bw * c / n).toFixed(1)}" height="14" fill="${k(1)}"/>
${text(cx, cy + 24, `${a} Adelie · ${c} Chinstrap`, { size: 12, fill: 'var(--ink)' })}
${text(cx, cy + 38, `Gini ${fmt(g, { digits: 2 })}`, { size: 12 })}</g>`;
  };
  const yes = tr('yes', 'ya'), no = tr('no', 'tidak');
  const edge = (x1, y1, x2, y2, label, side) => `${line(x1, y1, x2, y2, { c: 'var(--muted)', w: 2, arrow: true })}${text((x1 + x2) / 2 + side * 14, (y1 + y2) / 2 + 2, label, { size: 12, fill: 'var(--ink)', weight: 700 })}`;
  const [fL, fR] = cutFlipper(195.5), [bL, bR] = cutBill(43).map((_, i) => [fL.filter(r => (i === 0 ? r[2] <= 43 : r[2] > 43))][0]);
  return svg(640, 352, `${edge(250, 88, 170, 148, yes, -1)}${edge(390, 88, 470, 148, no, 1)}
${edge(120, 232, 100, 262, yes, -1)}${edge(180, 232, 300, 262, no, 1)}
${node(320, 46, P, `${tr('flipper at most', 'flipper paling banyak')} ${fmt(195.5)} mm?`)}
${node(150, 190, fL, `${tr('bill at most', 'bill length paling banyak')} ${fmt(43)} mm?`)}
${node(490, 190, fR, '', true)}
${node(100, 306, bL, '', true)}
${node(300, 306, bR, '', true)}`);
}

export const figures = { 'gini-curve': giniCurve, 'threshold-scan': thresholdScan, 'two-features': twoFeatures, 'split-tree': splitTree };
