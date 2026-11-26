// Figures for "ROC and precision-recall curves": the ROC staircase and the precision-recall steps of six scored
// cases (computed from the cases below, the same ones as the lesson table), and one ranker at two positive rates.
// The two-rate figure uses an idealized model: scores from two bell curves of equal spread, with the separation
// chosen so that the ROC curve passes through (0.05, 0.80), the cut in the lesson's payments example.
import { svg, dot, ring, text, line, box, k, soft, tr, fmt } from '../kit.js';

const POS = 1, NEG = 0;
const ink = { fill: 'var(--ink)' };
const pc = v => `${fmt(v * 100)}%`;

// The six cases, sorted by score (name, score, 1 if really positive).
const CASES = [['A', 0.9, 1], ['B', 0.8, 0], ['C', 0.7, 1], ['D', 0.6, 1], ['E', 0.4, 0], ['F', 0.2, 0]];

// Walk down the sorted cases and record the counts after each one.
function walk() {
  const P = CASES.filter(c => c[2]).length, N = CASES.length - P;
  let tp = 0, fp = 0;
  return CASES.map(([name, score, y]) => {
    if (y) tp++; else fp++;
    return { name, score, y, tp, fp, fpr: fp / N, tpr: tp / P, precision: tp / (tp + fp) };
  });
}

const frac = v => (v === 0 ? fmt(0) : v === 1 ? fmt(1) : v < 0.5 ? '1/3' : '2/3');
// A label with a halo so that it stays readable on top of lines and fills.
const halo = (x, y, t, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.anchor ?? 'middle'}" font-size="${o.size ?? 15}" font-weight="800" fill="var(--ink)" stroke="var(--surface)" stroke-width="4" paint-order="stroke">${t}</text>`;

// Square plot frame at (L, T) with side S and unit ticks; returns the mapping functions and the drawing.
function frame(L, T, S, xTitle, yTitle, ticks) {
  const X = v => L + v * S, Y = v => T + (1 - v) * S;
  const grid = ticks.map(v => `${line(X(v), T, X(v), T + S, { w: 1 })}${line(L, Y(v), L + S, Y(v), { w: 1 })}${text(X(v), T + S + 18, ticks.label(v), { size: 12 })}${text(L - 8, Y(v) + 4, ticks.label(v), { anchor: 'end', size: 12 })}`).join('');
  const axes = `${line(L, T, L, T + S, { c: 'var(--muted)', w: 1.8 })}${line(L, T + S, L + S, T + S, { c: 'var(--muted)', w: 1.8 })}`;
  const titles = `${text(L + S / 2, T + S + 40, xTitle, { size: 14 })}<g transform="translate(${L - 46} ${T + S / 2}) rotate(-90)">${text(0, 0, yTitle, { size: 14 })}</g>`;
  return { X, Y, body: `${grid}${axes}${titles}` };
}

// ---- Figure 1: the ROC staircase of the six cases, with the area under it. ----
function rocByHand() {
  const rows = walk(), N = 3;
  const ticks = [0, 1 / 3, 2 / 3, 1];
  ticks.label = frac;
  const { X, Y, body } = frame(86, 34, 270, tr('false-positive rate', 'false-positive rate'), tr('true-positive rate (recall)', 'true-positive rate (recall)'), ticks);
  const pts = [[0, 0], ...rows.map(r => [r.fpr, r.tpr])];
  const path = pts.map(([a, b], i) => `${i ? 'L' : 'M'}${X(a)} ${Y(b)}`).join('');
  // Area: one column per negative, as tall as the share of positives above it.
  const cols = rows.filter(r => !r.y).map(r => `<rect x="${X(r.fpr - 1 / N)}" y="${Y(r.tpr)}" width="${270 / N}" height="${r.tpr * 270}" fill="${soft(POS)}" stroke="none"/>`).join('');
  const marks = rows.map(r => (r.y ? dot : ring)(X(r.fpr), Y(r.tpr), k(r.y ? POS : NEG), 7)).join('');
  const where = { A: [12, -10, 'start'], B: [6, 24, 'start'], C: [-14, 5, 'end'], D: [-14, 5, 'end'], E: [0, -14, 'middle'], F: [0, -14, 'middle'] };
  const labels = rows.map(r => halo(X(r.fpr) + where[r.name][0], Y(r.tpr) + where[r.name][1], r.name, { anchor: where[r.name][2] })).join('');
  const side = 400;
  return svg(660, 340, `
${cols}${body}
${line(X(0), Y(0), X(1), Y(1), { c: 'var(--muted)', w: 1.6, dash: '6 5' })}
<path d="${path}" fill="none" stroke="var(--ink)" stroke-width="3"/>
${marks}${labels}
${halo(X(0.7), Y(0.42), `AUC = 7/9 = ${fmt(7 / 9, { digits: 2 })}`, { size: 16 })}
${text(side, 70, tr('Walk down the sorted cases:', 'Telusuri kasus terurut:'), { anchor: 'start', size: 15, weight: 700, ...ink })}
${dot(side + 8, 98, k(POS), 7)}${text(side + 26, 103, tr('real positive: up 1/3', 'positif asli: naik 1/3'), { anchor: 'start', size: 14 })}
${ring(side + 8, 126, k(NEG), 7)}${text(side + 26, 131, tr('real negative: right 1/3', 'negatif asli: ke kanan 1/3'), { anchor: 'start', size: 14 })}
${line(side, 156, side + 22, 156, { c: 'var(--muted)', w: 1.6, dash: '6 5' })}${text(side + 26, 161, tr('no skill: the diagonal', 'tanpa kemampuan: diagonal'), { anchor: 'start', size: 14 })}
${text(side, 200, tr('Order: A, B, C, D, E, F', 'Urutan: A, B, C, D, E, F'), { anchor: 'start', size: 14 })}
${text(side, 222, tr(`Scores ${fmt(0.9)} down to ${fmt(0.2)}`, `Skor ${fmt(0.9)} turun ke ${fmt(0.2)}`), { anchor: 'start', size: 14 })}`);
}

// ---- Figure 2: precision against recall for the six cases, with the steps that AP averages. ----
function prByHand() {
  const rows = walk();
  const ticks = [0, 0.5, 1];
  ticks.label = v => fmt(v);
  const { X, Y, body } = frame(86, 34, 270, tr('recall', 'recall'), tr('precision', 'precision'), ticks);
  // Steps: the precision at each real positive, over the recall interval that positive opens.
  const posRows = rows.filter(r => r.y);
  const steps = posRows.map((r, i) => `<rect x="${X(i / 3)}" y="${Y(r.precision)}" width="${270 / 3}" height="${r.precision * 270}" fill="${soft(POS)}" stroke="${k(POS)}" stroke-width="1.4"/>`).join('');
  const ap = posRows.reduce((s, r) => s + r.precision, 0) / posRows.length;
  const path = rows.map((r, i) => `${i ? 'L' : 'M'}${X(r.tpr)} ${Y(r.precision)}`).join('');
  const marks = rows.map(r => (r.y ? dot : ring)(X(r.tpr), Y(r.precision), k(r.y ? POS : NEG), 7)).join('');
  const where = { A: [-12, -4, 'end'], B: [-12, 20, 'end'], C: [-10, -12, 'end'], D: [14, 4, 'start'], E: [14, 4, 'start'], F: [14, 4, 'start'] };
  const labels = rows.map(r => halo(X(r.tpr) + where[r.name][0], Y(r.precision) + where[r.name][1], r.name, { anchor: where[r.name][2], size: 14 })).join('');
  const side = 430;
  return svg(660, 340, `
${steps}${body}
${line(X(0), Y(0.5), X(1), Y(0.5), { c: 'var(--muted)', w: 1.6, dash: '6 5' })}
<path d="${path}" fill="none" stroke="var(--ink)" stroke-width="2.4"/>
${marks}${labels}
${halo(X(0.5), Y(0.18), `AP = (1 + 2/3 + 3/4) / 3 = ${fmt(ap, { digits: 2 })}`, { size: 14 })}
${text(side, 70, tr('Read it like this:', 'Cara membacanya:'), { anchor: 'start', size: 15, weight: 700, ...ink })}
${dot(side + 8, 98, k(POS), 7)}${text(side + 26, 103, tr('positive enters: precision rises', 'positif masuk: precision naik'), { anchor: 'start', size: 13 })}
${ring(side + 8, 126, k(NEG), 7)}${text(side + 26, 131, tr('negative enters: precision falls', 'negatif masuk: precision turun'), { anchor: 'start', size: 13 })}
${box(side, 146, 22, 16, soft(POS), k(POS)).replace('rx="10"', 'rx="3"')}${text(side + 30, 159, tr('area that AP measures', 'luas yang diukur AP'), { anchor: 'start', size: 13 })}
${line(side, 186, side + 22, 186, { c: 'var(--muted)', w: 1.6, dash: '6 5' })}${text(side + 30, 191, tr(`no skill: ${fmt(0.5)}`, `tanpa kemampuan: ${fmt(0.5)}`), { anchor: 'start', size: 13 })}
${text(side, 212, tr('(the positive rate, 3 of 6)', '(positive rate, 3 dari 6)'), { anchor: 'start', size: 13 })}`);
}

// ---- Normal-curve helpers for figure 3 (idealized model). ----
function erf(x) {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
}
const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
function probit(p) { let lo = -8, hi = 8; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }
const SEP = probit(0.95) + probit(0.8); // ROC passes through (0.05, 0.80)

// Sweep the threshold from high to low; each step is one point (fpr, tpr, precision at positive rate pi).
function sweep(pi, dz = 0.02) {
  const out = [];
  for (let z = 7; z >= -7; z -= dz) {
    const fpr = Phi(-z), tpr = Phi(SEP - z);
    out.push({ fpr, tpr, precision: pi * tpr / (pi * tpr + (1 - pi) * fpr) });
  }
  return out;
}
// Average precision as the area under precision against recall.
function averagePrecision(pi) {
  const pts = sweep(pi, 0.002);
  let ap = 0, prev = 0;
  for (const p of pts) { ap += (p.tpr - prev) * p.precision; prev = p.tpr; }
  return ap;
}

// ---- Figure 3: one ranker, two positive rates. ----
function rarePositives() {
  const S = 220, T = 58;
  const ticks = [0, 0.5, 1];
  ticks.label = v => fmt(v);
  const a = frame(70, T, S, tr('false-positive rate', 'false-positive rate'), tr('recall', 'recall'), ticks);
  const b = frame(400, T, S, tr('recall', 'recall'), tr('precision', 'precision'), ticks);
  const curve = (pts, mapX, mapY) => `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${mapX(p).toFixed(1)} ${mapY(p).toFixed(1)}`).join('')}" fill="none"`;
  const roc = sweep(0.5);
  const half = sweep(0.5), rare = sweep(0.01);
  const apHalf = averagePrecision(0.5), apRare = averagePrecision(0.01);
  const cut = (pi, c) => {
    const tpr = 0.8, fpr = 0.05, p = pi * tpr / (pi * tpr + (1 - pi) * fpr);
    return { p, mark: `${dot(b.X(tpr), b.Y(p), c, 6)}<circle cx="${b.X(tpr)}" cy="${b.Y(p)}" r="6" fill="none" stroke="var(--ink)" stroke-width="2"/>` };
  };
  const m50 = cut(0.5, k(NEG)), m1 = cut(0.01, k(POS));
  const legendY = T + S + 66;
  return svg(660, 400, `
${text(70 + S / 2, 24, tr('ROC: one curve for both', 'ROC: satu kurva untuk keduanya'), { size: 15, weight: 700, ...ink })}
${text(400 + S / 2, 24, tr('Precision-recall: two curves', 'Precision-recall: dua kurva'), { size: 15, weight: 700, ...ink })}
${a.body}${b.body}
${line(a.X(0), a.Y(0), a.X(1), a.Y(1), { c: 'var(--muted)', w: 1.4, dash: '6 5' })}
${curve(roc, p => a.X(p.fpr), p => a.Y(p.tpr))} stroke="var(--ink)" stroke-width="3"/>
${dot(a.X(0.05), a.Y(0.8), 'var(--ink)', 6)}
${halo(a.X(0.05) + 12, a.Y(0.8) + 22, tr(`(${fmt(0.05, { digits: 2 })}, ${fmt(0.8, { digits: 2 })})`, `(${fmt(0.05, { digits: 2 })}; ${fmt(0.8, { digits: 2 })})`), { anchor: 'start', size: 13 })}
${line(b.X(0), b.Y(0.5), b.X(1), b.Y(0.5), { c: k(NEG), w: 1.4, dash: '6 5' })}
${line(b.X(0), b.Y(0.01), b.X(1), b.Y(0.01), { c: k(POS), w: 1.4, dash: '6 5' })}
${curve(half, p => b.X(p.tpr), p => b.Y(p.precision))} stroke="${k(NEG)}" stroke-width="3"/>
${curve(rare, p => b.X(p.tpr), p => b.Y(p.precision))} stroke="${k(POS)}" stroke-width="3"/>
${m50.mark}${m1.mark}
${halo(b.X(0.8) - 8, b.Y(m50.p) - 12, fmt(m50.p, { digits: 2 }), { anchor: 'end', size: 13 })}
${halo(b.X(0.8) + 2, b.Y(m1.p) - 12, fmt(m1.p, { digits: 2 }), { anchor: 'middle', size: 13 })}
${line(70, legendY, 92, legendY, { c: k(NEG), w: 4 })}${text(100, legendY + 5, tr(`${pc(0.5)} positives: AP about ${fmt(apHalf, { digits: 2 })}`, `${pc(0.5)} positif: AP sekitar ${fmt(apHalf, { digits: 2 })}`), { anchor: 'start', size: 14 })}
${line(70, legendY + 26, 92, legendY + 26, { c: k(POS), w: 4 })}${text(100, legendY + 31, tr(`${pc(0.01)} positives: AP about ${fmt(apRare, { digits: 2 })}`, `${pc(0.01)} positif: AP sekitar ${fmt(apRare, { digits: 2 })}`), { anchor: 'start', size: 14 })}
${text(400, legendY + 5, tr(`Dots: the cut with recall ${fmt(0.8, { digits: 1 })}`, `Titik: cut dengan recall ${fmt(0.8, { digits: 1 })}`), { anchor: 'start', size: 13 })}
${text(400, legendY + 31, tr('Dashed: no skill (the positive rate)', 'Putus-putus: tanpa kemampuan'), { anchor: 'start', size: 13 })}`);
}

export const figures = {
  'roc-by-hand': rocByHand,
  'pr-by-hand': prByHand,
  'rare-positives': rarePositives,
};
