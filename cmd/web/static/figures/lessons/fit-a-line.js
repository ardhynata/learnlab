// Figures for the "Fit a line" lab lesson (linear-regression course). Every number is computed
// here from the lesson's example points (the same four points as "Loss functions", plus a seven
// point set for the outlier picture), so the pictures match the worked examples in the text.
import { svg, dot, ring, cross, text, line, box, soft, k, tr, fmt } from '../kit.js';
import { bestLine, lineLoss, residuals, maeBreakpoints } from '../../sims/ml/lossfit.js';

// The four points of the worked example.
const EX = [{ x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 5 }, { x: 4, y: 4 }];
// Seven points near a line, and one far-off point that is added to them.
const SEVEN = [[1, 2], [2, 3], [3, 3], [4, 5], [5, 5], [6, 7], [7, 7]].map(([x, y]) => ({ x, y }));
const FAR = { x: 8, y: 1 };

const signed = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v), { max: 2 });
const f2 = v => fmt(v, { digits: 2 });

// Axes with arrowless ends.
const axes = (X, Y, xMax, yMax) => `${line(X(0), Y(0), X(xMax), Y(0), { c: 'var(--muted)', w: 1.6 })}${line(X(0), Y(0), X(0), Y(yMax), { c: 'var(--muted)', w: 1.6 })}`;

// Step 1: fitting as a loop of try, score, adjust.
function fitLoop() {
  const W = 136, H = 76, Y0 = 36, xs = [4, 170, 336, 502];
  const steps = [
    [tr('1. Pick a line', '1. Pilih garis'), tr('slope + intercept', 'slope + intercept')],
    [tr('2. Find residuals', '2. Cari residual'), tr('point − line', 'titik − garis')],
    [tr('3. Score it', '3. Beri skor'), tr('average cost = loss', 'rata-rata = loss')],
    [tr('4. Adjust it', '4. Ubah garis'), tr('so the loss falls', 'agar loss turun')],
  ];
  const boxes = steps.map(([head, sub], i) => `${box(xs[i], Y0, W, H, soft(i === 3 ? 2 : 0), 'var(--line)')}${text(xs[i] + W / 2, Y0 + 32, head, { fill: 'var(--ink)', weight: 700, size: 13 })}${text(xs[i] + W / 2, Y0 + 54, sub, { size: 12 })}`).join('');
  const arrows = [0, 1, 2].map(i => line(xs[i] + W + 3, Y0 + H / 2, xs[i + 1] - 3, Y0 + H / 2, { c: 'var(--muted)', w: 2.2, arrow: true })).join('');
  const back = `<path d="M${xs[3] + W / 2} ${Y0 + H + 2}V${Y0 + H + 38}H${xs[0] + W / 2}V${Y0 + H + 5}" stroke="var(--muted)" stroke-width="2.2" fill="none" stroke-linejoin="round" marker-end="url(#arr)"/>`;
  return svg(640, 188, `${boxes}${arrows}${back}
${text(320, Y0 + H + 58, tr('Repeat until the loss stops falling.', 'Ulangi sampai loss berhenti turun.'), { fill: 'var(--ink)', size: 13 })}`);
}

// Least squares line through points: slope = sum (x - mx)(y - my) / sum (x - mx)^2.
function leastSquares(pts) {
  const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length, my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const slope = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / pts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  return { slope, intercept: my - slope * mx };
}

// The squares whose area is the squared residual, on the best line for the four points.
function squaresOnResiduals() {
  const S = 40, X = x => 46 + x * S, Y = y => 268 - y * S;   // the top of the y axis stays inside the frame
  const { slope, intercept } = leastSquares(EX);
  const res = residuals(EX, slope, intercept);
  const areas = res.map(r => r * r), total = areas.reduce((s, a) => s + a, 0);
  const squares = EX.map((p, i) => {
    const a = Math.abs(res[i]) * S, left = i === 2;
    const x0 = left ? X(p.x) - a : X(p.x), yTop = Y(Math.max(p.y, p.y - res[i]));
    const rect = `<rect x="${x0}" y="${yTop}" width="${a}" height="${a}" fill="${k(1)}" fill-opacity="0.2" stroke="${k(1)}" stroke-width="1.6"/>`;
    const big = a > 40;
    const label = text(big ? x0 + a / 2 : X(p.x) + a + 6, yTop + a / 2 + 4 + (i === 1 ? 14 : 0), f2(areas[i]), { anchor: big ? 'middle' : 'start', fill: k(1), weight: 700, size: 13 });
    return rect + label;
  }).join('');
  const rows = EX.map((p, i) => {
    const y = 84 + i * 26;
    return `${text(364, y, `(${fmt(p.x)}, ${fmt(p.y)})`, { anchor: 'start', fill: 'var(--ink)', size: 14 })}${text(500, y, signed(res[i]), { anchor: 'end', fill: 'var(--ink)', size: 14 })}${text(596, y, f2(areas[i]), { anchor: 'end', fill: k(1), weight: 700, size: 14 })}`;
  }).join('');
  return svg(640, 296, `${box(0, 0, 640, 296, 'var(--surface)')}
${axes(X, Y, 5.4, 6.2)}
${[1, 2, 3, 4, 5].map(v => text(X(v), Y(0) + 16, fmt(v), { size: 12 })).join('')}${[1, 2, 3, 4, 5, 6].map(v => text(X(0) - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })).join('')}
${text(X(5.4) + 8, Y(0) + 4, 'x', { anchor: 'start', size: 12 })}${text(X(0) + 8, Y(6.2) + 8, 'y', { anchor: 'start', size: 12 })}
${squares}
${line(X(0), Y(intercept), X(5.4), Y(slope * 5.4 + intercept), { c: k(0), w: 3.2 })}
${text(X(0.3), Y(5.5), `y = ${fmt(slope)}x + ${fmt(intercept)}`, { anchor: 'start', fill: k(0), weight: 700, size: 14 })}
${EX.map((p, i) => line(X(p.x), Y(p.y), X(p.x), Y(p.y - res[i]), { c: k(1), w: 2.6 })).join('')}
${EX.map(p => dot(X(p.x), Y(p.y), 'var(--ink)', 5.5)).join('')}
${box(340, 24, 288, 258, 'var(--surface)', 'var(--line)')}
${text(364, 54, tr('point', 'titik'), { anchor: 'start', size: 12 })}${text(500, 54, 'residual', { anchor: 'end', size: 12 })}${text(596, 54, tr('square (area)', 'kuadrat (luas)'), { anchor: 'end', size: 12 })}
${line(358, 64, 610, 64, { c: 'var(--line)', w: 1.6 })}
${rows}
${line(358, 190, 610, 190, { c: 'var(--line)', w: 1.6 })}
${text(364, 214, tr('total area', 'total luas'), { anchor: 'start', fill: 'var(--ink)', size: 14 })}${text(596, 214, fmt(total, { max: 2 }), { anchor: 'end', fill: k(1), weight: 700, size: 14 })}
${text(364, 250, `MSE = ${fmt(total, { max: 2 })} / ${fmt(EX.length)} = ${fmt(total / EX.length, { max: 2 })}`, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 16 })}`);
}

// One panel of the loss-against-slope picture: a curve, its lowest point, and a caption.
function curvePanel(ox, title, kind, yMax, color, breaks) {
  const SLOPE_MAX = 1.6, X = s => ox + 44 + s * 140, Y = v => 196 - v * (150 / yMax);
  const slopes = Array.from({ length: 81 }, (_, i) => i * SLOPE_MAX / 80);
  const path = slopes.map((s, i) => `${i ? 'L' : 'M'}${X(s).toFixed(1)} ${Y(lineLoss(EX, kind, s, 1)).toFixed(1)}`).join('');
  // The lowest point: a fine scan (exact values are 29/30 for MSE and 1 for MAE).
  let best = 0, bestV = Infinity;
  for (let i = 0; i <= 1600; i++) { const s = i / 1000, v = lineLoss(EX, kind, s, 1); if (v < bestV - 1e-12) { best = s; bestV = v; } }
  const bends = breaks ? maeBreakpoints(EX, 1).filter((s, i, a) => a.indexOf(s) === i && s <= SLOPE_MAX).map(s => dot(X(s), Y(lineLoss(EX, kind, s, 1)), 'var(--muted)', 3.6)).join('') : '';
  const yTicks = (kind === 'mse' ? [2, 4, 6, 8] : [1, 2, 3]);
  return `${box(ox, 28, 312, 236)}${text(ox + 156, 20, title, { weight: 700, fill: 'var(--ink)', size: 14 })}
${axes(X, Y, SLOPE_MAX, yMax)}
${[0, 0.5, 1, 1.5].map(s => text(X(s), Y(0) + 16, fmt(s), { size: 12 })).join('')}${yTicks.map(v => text(X(0) - 6, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })).join('')}
${text(X(0.8), Y(0) + 31, 'slope', { size: 12 })}
<path d="${path}" fill="none" stroke="${color}" stroke-width="3.2" stroke-linejoin="round"/>
${bends}
${line(X(best), Y(0), X(best), Y(bestV), { c: 'var(--muted)', w: 1.4, dash: '4 4' })}${dot(X(best), Y(bestV), k(2), 6.5)}
${text(ox + 156, 254, `${tr('lowest', 'terendah')}: slope ${fmt(best, { max: 2 })}, ${kind.toUpperCase()} ${fmt(bestV, { max: 2 })}`, { fill: 'var(--ink)', weight: 700, size: 13 })}`;
}

// Same four points, intercept held at 1: the MSE curve is a bowl, the MAE curve a chain of straight pieces.
function bowlAndV() {
  return svg(640, 304, `${curvePanel(0, tr('MSE: a smooth bowl', 'MSE: mangkuk yang mulus'), 'mse', 8, k(1), false)}${curvePanel(328, tr('MAE: a V of straight pieces', 'MAE: huruf V dari ruas lurus'), 'mae', 3, k(0), true)}
${text(320, 290, tr('Same four points, intercept held at 1. Gray dots on the MAE curve: the line passes through a point.', 'Empat titik yang sama, intercept tetap 1. Titik abu-abu pada kurva MAE: garis melewati sebuah titik.'), { size: 12 })}`);
}

// Seven points plus one far-off point: how far each best line moves.
function outlierPull() {
  const X = x => 40 + x * 42, Y = y => 232 - y * 27;
  const withFar = [...SEVEN, FAR];
  const mseBefore = bestLine(SEVEN, 'mse'), mseAfter = bestLine(withFar, 'mse'), mae = bestLine(withFar, 'mae');
  const draw = (l, c, w, dash) => line(X(0), Y(l.intercept), X(8.4), Y(l.slope * 8.4 + l.intercept), { c, w, dash });
  const eq = l => `y = ${f2(l.slope)}x + ${f2(l.intercept)}`;
  const key = (y, stroke, w, dash, head, sub) => `${line(434, y, 460, y, { c: stroke, w, dash })}${text(468, y + 5, head, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 12 })}${text(468, y + 22, sub, { anchor: 'start', size: 12 })}`;
  return svg(640, 268, `${box(0, 0, 640, 268, 'var(--surface)')}
${axes(X, Y, 9.2, 8.4)}
${[1, 2, 3, 4, 5, 6, 7, 8].map(v => text(X(v), Y(0) + 16, fmt(v), { size: 12 })).join('')}${[2, 4, 6, 8].map(v => text(X(0) - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })).join('')}
${text(X(9.2), Y(0) + 16, 'x', { anchor: 'end', size: 12 })}${text(X(0) + 8, Y(8.4) + 8, 'y', { anchor: 'start', size: 12 })}
${draw(mseBefore, 'var(--muted)', 2.4, '6 5')}
${draw(mae, k(0), 3.4)}
${draw(mseAfter, k(1), 3.4)}
${SEVEN.map(p => dot(X(p.x), Y(p.y), 'var(--ink)', 5.2)).join('')}
${ring(X(FAR.x), Y(FAR.y), k(3), 10)}${cross(X(FAR.x), Y(FAR.y), k(3))}
${text(X(FAR.x), Y(FAR.y) - 20, `${tr('outlier', 'outlier')} (${fmt(FAR.x)}, ${fmt(FAR.y)})`, { fill: k(3), weight: 700, size: 12 })}
${key(58, k(1), 3.4, '', tr('MSE, with outlier', 'MSE, dengan outlier'), eq(mseAfter))}
${key(112, 'var(--muted)', 2.4, '6 5', tr('MSE, without outlier', 'MSE, tanpa outlier'), eq(mseBefore))}
${key(166, k(0), 3.4, '', tr('MAE, with or without', 'MAE, dengan atau tanpa'), eq(mae))}`);
}

export const figures = { 'fit-loop': fitLoop, 'squares-on-residuals': squaresOnResiduals, 'bowl-and-v': bowlAndV, 'outlier-pull': outlierPull };
