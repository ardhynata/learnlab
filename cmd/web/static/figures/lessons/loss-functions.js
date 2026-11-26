// Figures for the "Loss functions" reading lesson (linear-regression course). Self-contained:
// every number is computed here from the lesson's four example points, so the pictures match
// the worked examples in the text.
import { svg, dot, text, line, box, k, tr, fmt } from '../kit.js';

// The worked example: four points (the fifth, the outlier, is used only in outlier-share).
const EX = [{ x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 5 }, { x: 4, y: 4 }];
const OUTLIER = { x: 5, y: 11 };

const signed = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v));
const resid = (pts, slope, intercept) => pts.map(p => p.y - (slope * p.x + intercept));
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const mae = r => mean(r.map(Math.abs));
const mse = r => mean(r.map(v => v * v));

// Axes with arrowless ends, a small "x" and "y" at the tips.
const axes = (X, Y, xMax, yMax) => `${line(X(0), Y(0), X(xMax), Y(0), { c: 'var(--muted)', w: 1.6 })}${line(X(0), Y(0), X(0), Y(yMax), { c: 'var(--muted)', w: 1.6 })}${text(X(xMax), Y(0) + 15, 'x', { anchor: 'end', size: 12 })}${text(X(0) + 7, Y(yMax) + 4, 'y', { anchor: 'start', size: 12 })}`;

// One point's residual, spelled out beside the plot, plus every residual drawn on the plot.
function residualSegments() {
  const X = x => 50 + x * 70, Y = y => 220 - y * 28;
  const slope = 1, intercept = 1, res = resid(EX, slope, intercept);
  const focus = EX[2];
  const pred = slope * focus.x + intercept;
  return svg(640, 268, `${box(0, 0, 640, 268, 'var(--surface)')}
${axes(X, Y, 5, 7)}
${line(X(0), Y(intercept), X(5), Y(slope * 5 + intercept), { c: k(0), w: 3.2 })}
${text(X(5) - 4, Y(slope * 5 + intercept) - 10, 'y = x + 1', { anchor: 'end', fill: k(0), weight: 700 })}
${EX.map((p, i) => (res[i] === 0 ? '' : line(X(p.x), Y(p.y), X(p.x), Y(p.y - res[i]), { c: k(1), w: 2.8 }))).join('')}
${EX.map((p, i) => (res[i] === 0 ? '' : text(X(p.x) + (res[i] > 0 ? -10 : 10), (Y(p.y) + Y(p.y - res[i])) / 2 + 5, signed(res[i]), { anchor: res[i] > 0 ? 'end' : 'start', fill: k(1), weight: 700, size: 14 }))).join('')}
${EX.map(p => dot(X(p.x), Y(p.y), 'var(--ink)', 5.5)).join('')}
${box(430, 30, 196, 150, 'var(--surface)', 'var(--line)')}
${text(528, 54, `${tr('The point', 'Titik')} (${fmt(focus.x)}, ${fmt(focus.y)})`, { weight: 700, fill: 'var(--ink)', size: 14 })}
${text(446, 86, `${tr('actual', 'aktual')}: ${fmt(focus.y)}`, { anchor: 'start', fill: 'var(--ink)', size: 14 })}
${text(446, 112, `${tr('predicted', 'prediksi')}: ${fmt(pred)}`, { anchor: 'start', fill: 'var(--ink)', size: 14 })}
${line(446, 124, 610, 124, { c: 'var(--line)', w: 1.6 })}
${text(446, 150, `residual: ${fmt(focus.y)} − ${fmt(pred)}`, { anchor: 'start', fill: k(1), weight: 700, size: 14 })}
${text(446, 170, `= ${signed(focus.y - pred)}`, { anchor: 'start', fill: k(1), weight: 700, size: 14 })}
${text(X(2.5), 256, tr('Zero means the point is on the line.', 'Nol berarti titik ada di garis.'), { size: 12 })}`);
}

// What one residual adds to MAE (|r|) and to MSE (r^2).
function penaltyCurves() {
  const X = r => 215 + r * 48, Y = v => 222 - v * 12;
  const rs = Array.from({ length: 81 }, (_, i) => -4 + i * 0.1);
  const path = f => rs.map((r, i) => `${i ? 'L' : 'M'}${X(r).toFixed(1)} ${Y(f(r)).toFixed(1)}`).join('');
  const ticks = [-4, -2, 0, 2, 4];
  const mark = (r, v, c) => dot(X(r), Y(v), c, 6);
  return svg(640, 262, `${box(0, 0, 640, 262, 'var(--surface)')}
${line(X(-4.3), Y(0), X(4.3), Y(0), { c: 'var(--muted)', w: 1.6 })}${line(X(0), Y(0), X(0), Y(16.8), { c: 'var(--muted)', w: 1.6 })}
${ticks.map(r => text(X(r), Y(0) + 16, signed(r).replace('+', ''), { size: 12 })).join('')}
${text(X(0), 254, tr('residual r', 'residual r'), { size: 12 })}
${[4, 8, 12, 16].map(v => text(X(0) - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })).join('')}
${text(X(0) + 8, Y(16.8) + 8, tr('what it adds', 'yang ditambahkan'), { anchor: 'start', size: 12 })}
<path d="${path(r => r * r)}" fill="none" stroke="${k(1)}" stroke-width="3.2" stroke-linejoin="round"/>
<path d="${path(Math.abs)}" fill="none" stroke="${k(0)}" stroke-width="3.2" stroke-linejoin="round"/>
${line(X(4), Y(0), X(4), Y(16), { c: 'var(--muted)', w: 1.4, dash: '4 4' })}
${mark(4, 4, k(0))}${mark(4, 16, k(1))}
${text(X(4) + 10, Y(4) + 5, fmt(4), { anchor: 'start', fill: k(0), weight: 700, size: 14 })}
${text(X(4) - 10, Y(16) + 5, fmt(16), { anchor: 'end', fill: k(1), weight: 700, size: 14 })}
${line(450, 52, 480, 52, { c: k(0), w: 3.2 })}${text(488, 57, tr('absolute miss |r|', 'kesalahan mutlak |r|'), { anchor: 'start', fill: 'var(--ink)', size: 13 })}
${text(488, 75, tr('(adds to MAE)', '(masuk ke MAE)'), { anchor: 'start', size: 12 })}
${line(450, 108, 480, 108, { c: k(1), w: 3.2 })}${text(488, 113, tr('squared miss r²', 'kesalahan kuadrat r²'), { anchor: 'start', fill: 'var(--ink)', size: 13 })}
${text(488, 131, tr('(adds to MSE)', '(masuk ke MSE)'), { anchor: 'start', size: 12 })}
${text(450, 172, tr('A miss of 1 adds', 'Kesalahan 1 menambah'), { anchor: 'start', fill: 'var(--ink)', size: 12 })}
${text(450, 188, tr('1 to both.', '1 ke keduanya.'), { anchor: 'start', fill: 'var(--ink)', size: 12 })}
${text(450, 212, tr('A miss of 4 adds', 'Kesalahan 4 menambah'), { anchor: 'start', fill: 'var(--ink)', size: 12 })}
${text(450, 228, tr('4 or 16.', '4 atau 16.'), { anchor: 'start', fill: 'var(--ink)', size: 12 })}`);
}

// The same four points under two lines, with the residuals and both losses.
function panelOfLine(ox, slope, intercept, title, color) {
  const X = x => ox + 38 + x * 50, Y = y => 182 - y * 22;
  const res = resid(EX, slope, intercept);
  return `${box(ox, 30, 300, 208)}${text(ox + 150, 22, title, { weight: 700, fill: 'var(--ink)' })}
${axes(X, Y, 4.8, 6)}
${line(X(0), Y(intercept), X(4.6), Y(slope * 4.6 + intercept), { c: color, w: 3.2 })}
${EX.map((p, i) => line(X(p.x), Y(p.y), X(p.x), Y(p.y - res[i]), { c: k(1), w: 2.6 })).join('')}
${EX.map(p => dot(X(p.x), Y(p.y), 'var(--ink)', 5.5)).join('')}
${EX.map((p, i) => (res[i] === 0 ? '' : text(X(p.x) + (res[i] > 0 ? -9 : 9), (Y(p.y) + Y(p.y - res[i])) / 2 + (res[i] < 0 ? 12 : 4), signed(res[i]), { anchor: res[i] > 0 ? 'end' : 'start', fill: k(1), weight: 700, size: 13 }))).join('')}
${text(ox + 150, 206, `residual: ${res.map(signed).join(', ')}`, { size: 12 })}
${text(ox + 150, 226, `MAE ${fmt(mae(res))}     MSE ${fmt(mse(res))}`, { weight: 700, fill: 'var(--ink)', size: 13 })}`;
}

function twoLines() {
  return svg(640, 246, `${panelOfLine(0, 1, 1, `${tr('Line', 'Garis')} A: y = x + 1`, k(0))}${panelOfLine(340, 0.5, 2, `${tr('Line', 'Garis')} B: y = ${fmt(0.5)}x + 2`, k(2))}`);
}

// Line A with the outlier added: who supplies the total of each loss.
function outlierShare() {
  const pts = [...EX, OUTLIER];
  const res = resid(pts, 1, 1);
  const parts = [[2, k(2)], [3, k(3)], [4, k(1)]].map(([i, c]) => ({ i, c, r: res[i] }));
  const bars = [
    { y: 56, title: tr('MAE total', 'Total MAE'), f: Math.abs },
    { y: 140, title: tr('MSE total', 'Total MSE'), f: v => v * v },
  ];
  const X0 = 60, W = 520;
  const body = bars.map(b => {
    const total = parts.reduce((s, p) => s + b.f(p.r), 0);
    let x = X0;
    const segs = parts.map(p => {
      const w = W * b.f(p.r) / total, seg = `<rect x="${x.toFixed(1)}" y="${b.y}" width="${w.toFixed(1)}" height="40" fill="${p.c}" stroke="var(--surface)" stroke-width="2"/>`;
      const label = p === parts[2] ? text(x + w / 2, b.y + 26, `${fmt(Math.round(100 * b.f(p.r) / total))}%`, { fill: '#fff', weight: 700, size: 15 }) : '';
      x += w;
      return seg + label;
    }).join('');
    return `${text(X0, b.y - 10, `${b.title}: ${fmt(total)}`, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}${segs}`;
  }).join('');
  const legend = parts.map((p, j) => {
    const x = 60 + j * 185;
    return `${dot(x, 216, p.c, 6)}${text(x + 12, 221, `(${fmt(pts[p.i].x)}, ${fmt(pts[p.i].y)}): residual ${signed(p.r)}`, { anchor: 'start', fill: 'var(--ink)', size: 13 })}`;
  }).join('');
  return svg(640, 252, `${box(0, 0, 640, 252, 'var(--surface)')}${body}
${text(60, 196, tr('Points on the line (residual 0) add nothing, so they are left out.', 'Titik di garis (residual 0) tidak menambah apa pun, jadi tidak digambar.'), { anchor: 'start', size: 12 })}
${legend}`);
}

export const figures = { 'residual-segments': residualSegments, 'penalty-curves': penaltyCurves, 'two-lines': twoLines, 'outlier-share': outlierShare };
