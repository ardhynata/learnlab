// Figures for the reading lesson "Gradients and the loss surface" (optimization course).
// Every number is computed here from the lesson's three points (1, 2), (2, 3), (3, 5) and its
// start line y = 1x + 1, so the pictures match the worked examples in the text.
import { svg, dot, ring, diamond, text, line, box, k, tr, fmt } from '../kit.js';
import { contours } from '../../sims/ml/gd.js';

const PTS = [{ x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 5 }];
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const resid = (m, b) => PTS.map(p => p.y - (m * p.x + b));
const mse = (m, b) => mean(resid(m, b).map(r => r * r));
// The gradient of the MSE, from the formulas in the lesson.
const grad = (m, b) => { const r = resid(m, b); return [-2 * mean(PTS.map((p, i) => p.x * r[i])), -2 * mean(r)]; };
const signed = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v));
const minus = v => (v < 0 ? '−' : '') + fmt(Math.abs(v));
// A list separator that does not clash with the decimal comma in Indonesian.
const sep = () => tr(', ', '; ');
const halo = t => t.replace('<text', '<text paint-order="stroke" stroke="var(--surface)" stroke-width="4" stroke-linejoin="round"');

// A line with a colored arrowhead (the shared line() arrow is always the muted color).
function arrow(x1, y1, x2, y2, color, w = 3.2, head = 11) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = d => `${(x2 - head * Math.cos(a + d)).toFixed(1)} ${(y2 - head * Math.sin(a + d)).toFixed(1)}`;
  return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" fill="none"/><path d="M${x2.toFixed(1)} ${y2.toFixed(1)}L${p(-0.45)}L${p(0.45)}z" fill="${color}"/>`;
}

// Contour lines of the MSE over a window of (slope, intercept), drawn on a box. The pixel scale is the
// same on both axes, so directions on the picture are directions on the surface.
function surface({ ox, oy, mLo, bLo, mSpan, bSpan, scale, levels }) {
  const W = mSpan * scale, H = bSpan * scale;
  const f = (x, y) => mse(mLo + x * mSpan / 10, bLo + y * bSpan / 10);
  const at = { m: m => ox + (m - mLo) * scale, b: b => oy + H - (b - bLo) * scale };
  const sets = contours(f, levels, 120);
  const d = sets.map(({ segments }) => segments.map(([p, q]) => `M${(ox + p.x / 10 * W).toFixed(1)} ${(oy + H - p.y / 10 * H).toFixed(1)}L${(ox + q.x / 10 * W).toFixed(1)} ${(oy + H - q.y / 10 * H).toFixed(1)}`).join('')).join('');
  const frame = `<clipPath id="c${ox}-${oy}"><rect x="${ox}" y="${oy}" width="${W}" height="${H}"/></clipPath>${box(ox, oy, W, H, 'var(--surface)', 'var(--line)')}<path d="${d}" fill="none" stroke="var(--muted)" stroke-width="1.3" opacity="0.75"/>`;
  return { at, W, H, frame };
}

// The MSE against the slope, intercept held at 1: the tangent at slope 1 and the bottom at 17/14.
function oneDial() {
  const L = m => mse(m, 1);
  const X = m => 60 + (m - 0.2) * 150, Y = v => 250 - v * 46;
  const curve = Array.from({ length: 101 }, (_, i) => { const m = 0.2 + i * 0.02; return `${i ? 'L' : 'M'}${X(m).toFixed(1)} ${Y(L(m)).toFixed(1)}`; }).join('');
  const [g] = grad(1, 1);
  const tan = m => L(1) + g * (m - 1);
  const best = 17 / 14;
  return svg(640, 310, `${box(0, 0, 640, 310, 'var(--surface)')}
${line(X(0.2) - 10, Y(0), X(2.2) + 10, Y(0), { c: 'var(--muted)', w: 1.6 })}${line(X(0.2) - 10, Y(0), X(0.2) - 10, Y(4.9), { c: 'var(--muted)', w: 1.6 })}
${[0.5, 1, 1.5, 2].map(m => `${line(X(m), Y(0), X(m), Y(0) + 5, { c: 'var(--muted)', w: 1.6 })}${text(X(m), Y(0) + 20, fmt(m), { size: 12 })}`).join('')}
${[0, 2, 4].map(v => `${line(X(0.2) - 15, Y(v), X(0.2) - 10, Y(v), { c: 'var(--muted)', w: 1.6 })}${text(X(0.2) - 20, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('')}
${text(X(1.2), 298, tr('slope of the line (intercept held at 1)', 'slope garis (intercept tetap 1)'))}${text(X(0.2) - 8, 18, 'MSE', { anchor: 'start' })}
<path d="${curve}" fill="none" stroke="${k(0)}" stroke-width="3.4" stroke-linejoin="round"/>
${line(X(0.35), Y(tan(0.35)), X(1.15), Y(tan(1.15)), { c: k(1), w: 2.4, dash: '7 5' })}
${dot(X(1), Y(L(1)), k(0), 7.5)}
${line(X(1), Y(L(1)) - 9, X(1), Y(2.0) + 8, { w: 1.2, dash: '3 3' })}
${text(X(1), Y(2.0), `${tr('line A', 'garis A')}: MSE ${fmt(L(1), { digits: 2 })}`, { weight: 700, fill: 'var(--ink)', size: 13 })}
${diamond(X(best), Y(L(best)), 'var(--ink)', 7)}
${line(X(best), Y(L(best)) - 10, X(best), Y(1.25) + 8, { w: 1.2, dash: '3 3' })}
${halo(text(X(best), Y(1.25) - 16, tr('lowest (intercept 1):', 'terendah (intercept 1):'), { size: 12.5, weight: 700, fill: 'var(--ink)' }))}${halo(text(X(best), Y(1.25), `slope ${fmt(best, { digits: 2 })}`, { size: 12.5, weight: 700, fill: 'var(--ink)' }))}
${text(392, 100, tr('At slope 1 the curve', 'Di slope 1 kurva'), { anchor: 'start', weight: 700, fill: k(1), size: 14 })}
${text(392, 120, tr(`has a slope of ${minus(g)}.`, `memiliki kemiringan ${minus(g)}.`), { anchor: 'start', weight: 700, fill: k(1), size: 14 })}
${text(392, 146, tr('The dashed tangent drops 2', 'Garis singgung putus-putus turun 2'), { anchor: 'start', size: 12.5 })}
${text(392, 163, tr('for each 1 of slope, so raising', 'untuk tiap 1 slope, sehingga'), { anchor: 'start', size: 12.5 })}
${text(392, 180, tr('the slope lowers the MSE.', 'menaikkan slope menurunkan MSE.'), { anchor: 'start', size: 12.5 })}`);
}

// The loss surface over a wide window: the long, narrow valley.
function lossSurface() {
  const win = { ox: 30, oy: 14, mLo: 0, bLo: -1, mSpan: 3, bSpan: 3.5, scale: 90, levels: [0.1, 0.25, 0.5, 1, 2, 4, 8] };
  const s = surface(win);
  const [m0, b0, mb, bb] = [1, 1, 1.5, 1 / 3];
  const ticksM = [0, 1, 2, 3], ticksB = [-1, 0, 1, 2];
  return svg(640, 372, `${s.frame}
${ticksM.map(m => `${line(s.at.m(m), s.at.b(-1), s.at.m(m), s.at.b(-1) + 5, { c: 'var(--muted)', w: 1.6 })}${text(s.at.m(m), s.at.b(-1) + 19, fmt(m), { size: 12 })}`).join('')}
${ticksB.map(b => `${line(30 - 5, s.at.b(b), 30, s.at.b(b), { c: 'var(--muted)', w: 1.6 })}${text(24, s.at.b(b) + 4, fmt(b), { anchor: 'end', size: 12 })}`).join('')}
${text(30 + s.W / 2, 364, tr('slope of the line', 'slope garis'))}${text(8, 14 + s.H / 2, tr('intercept of the line', 'intercept garis'), { anchor: 'middle' }).replace('<text', `<text transform="rotate(-90 8 ${14 + s.H / 2})"`)}
${halo(text(s.at.m(0.12), s.at.b(2.35), tr('steep: lines packed', 'curam: garis rapat'), { anchor: 'start', size: 12 }))}
${halo(text(s.at.m(2.9), s.at.b(-0.8), tr('steep', 'curam'), { anchor: 'end', size: 12 }))}
${ring(s.at.m(m0), s.at.b(b0), k(0), 7.5)}${diamond(s.at.m(mb), s.at.b(bb), 'var(--ink)', 8)}
${box(318, 28, 312, 160, 'var(--surface)', 'var(--line)')}
${ring(342, 56, k(0), 7)}${text(358, 61, `${tr('line A', 'garis A')}: ${tr('slope', 'slope')} ${fmt(m0)}, ${tr('intercept', 'intercept')} ${fmt(b0)}`, { anchor: 'start', weight: 700, fill: 'var(--ink)', size: 13.5 })}
${text(358, 79, `MSE ${fmt(mse(m0, b0), { digits: 2 })}`, { anchor: 'start', size: 13.5 })}
${diamond(342, 112, 'var(--ink)', 8)}${text(358, 111, `${tr('lowest point', 'titik terendah')}: ${tr('slope', 'slope')} ${fmt(mb)},`, { anchor: 'start', weight: 700, fill: 'var(--ink)', size: 13.5 })}
${text(358, 129, `${tr('intercept', 'intercept')} ${fmt(bb, { digits: 2 })}, MSE ${fmt(mse(mb, bb), { digits: 2 })}`, { anchor: 'start', size: 13.5 })}
${text(334, 160, tr('Each contour line joins lines with', 'Tiap garis kontur menghubungkan garis'), { anchor: 'start', size: 12.5 })}
${text(334, 177, tr('the same MSE. Levels: 0.1 to 8.', 'dengan MSE yang sama. Level: 0,1 sampai 8.'), { anchor: 'start', size: 12.5 })}`);
}

// Zoomed in on line A: the gradient (uphill) and the update step (downhill), same length.
function gradientUphill() {
  const win = { ox: 40, oy: 14, mLo: 0.5, bLo: 0.1, mSpan: 1.5, bSpan: 1.3, scale: 200, levels: [0.1, 0.22, 0.33, 0.6, 1, 1.55, 2.2, 3] };
  const s = surface(win);
  const rate = 0.15, [gm, gb] = grad(1, 1);
  const P = { m: 1, b: 1 };
  const uphill = { m: P.m + rate * gm, b: P.b + rate * gb }, down = { m: P.m - rate * gm, b: P.b - rate * gb };
  const px = p => s.at.m(p.m), py = p => s.at.b(p.b);
  const lab = (y, color, head, body) => `${dot(342, y - 5, color, 6)}${text(356, y, head, { anchor: 'start', weight: 700, fill: 'var(--ink)', size: 14 })}${body.map((l, i) => text(356, y + 18 + 16 * i, l, { anchor: 'start', size: 12.5 })).join('')}`;
  return svg(640, 322, `${s.frame}
${[0.5, 1, 1.5, 2].map(m => `${line(s.at.m(m), 14 + s.H, s.at.m(m), 14 + s.H + 5, { c: 'var(--muted)', w: 1.6 })}${text(s.at.m(m), 14 + s.H + 19, fmt(m), { size: 12 })}`).join('')}
${[0.5, 1].map(b => `${line(35, s.at.b(b), 40, s.at.b(b), { c: 'var(--muted)', w: 1.6 })}${text(30, s.at.b(b) + 4, fmt(b), { anchor: 'end', size: 12 })}`).join('')}
${text(40 + s.W / 2, 316, tr('slope of the line', 'slope garis'))}${text(10, 14 + s.H / 2, tr('intercept', 'intercept'), { anchor: 'middle' }).replace('<text', `<text transform="rotate(-90 10 ${14 + s.H / 2})"`)}
${diamond(s.at.m(1.5), s.at.b(1 / 3), 'var(--ink)', 8)}${halo(text(s.at.m(1.5) - 12, s.at.b(1 / 3) + 4, tr('lowest', 'terendah'), { anchor: 'end', size: 12, weight: 700, fill: 'var(--ink)' }))}
${arrow(px(P), py(P), px(uphill) + 2, py(uphill) + 1, k(1))}${arrow(px(P), py(P), px(down) - 2, py(down) + 1, k(2))}
${dot(px(uphill), py(uphill), k(1), 4.5)}${dot(px(down), py(down), k(2), 4.5)}
${ring(px(P), py(P), 'var(--ink)', 7)}
${halo(text(px(P) + 4, py(P) + 26, `${tr('line A', 'garis A')}  ${fmt(mse(1, 1), { digits: 2 })}`, { size: 12, weight: 700, fill: 'var(--ink)' }))}
${halo(text(px(uphill) + 4, py(uphill) + 20, fmt(mse(uphill.m, uphill.b), { digits: 2 }), { size: 12, weight: 700, fill: k(1) }))}
${halo(text(px(down) + 2, py(down) - 14, fmt(mse(down.m, down.b), { digits: 2 }), { size: 12, weight: 700, fill: k(2) }))}
${lab(60, k(1), tr('Gradient (pink)', 'Gradient (merah muda)'), [tr(`(${minus(gm)}, ${minus(+gb.toFixed(2))}), pointing uphill`, `(${minus(gm)}; ${minus(+gb.toFixed(2))}), menunjuk ke atas`), tr('Drawn at 0.15 of its length.', 'Digambar 0,15 dari panjangnya.'), tr(`Landing: slope ${fmt(uphill.m)}, intercept ${fmt(uphill.b)}.`, `Mendarat: slope ${fmt(uphill.m)}, intercept ${fmt(uphill.b)}.`)])}
${lab(140, k(2), tr('Update step (teal)', 'Langkah update (teal)'), [tr('The same length, the other way:', 'Sama panjang, arah sebaliknya:'), tr(`slope ${fmt(down.m)}, intercept ${fmt(down.b)}.`, `slope ${fmt(down.m)}, intercept ${fmt(down.b)}.`), tr('The numbers beside the dots are MSE.', 'Angka di samping titik adalah MSE.')])}`);
}

// The three points under the start line and under the line after one step.
function panelOfLine(ox, m, b, title, color) {
  const X = x => ox + 38 + x * 56, Y = y => 196 - y * 24;
  const res = resid(m, b);
  const axes = `${line(X(0), Y(0), X(4.3), Y(0), { c: 'var(--muted)', w: 1.6 })}${line(X(0), Y(0), X(0), Y(6.6), { c: 'var(--muted)', w: 1.6 })}${text(X(4.3), Y(0) + 15, 'x', { anchor: 'end', size: 12 })}${text(X(0) + 7, Y(6.6) + 4, 'y', { anchor: 'start', size: 12 })}`;
  return `${box(ox, 30, 300, 232)}${text(ox + 150, 22, title, { weight: 700, fill: 'var(--ink)' })}
${axes}
${line(X(0), Y(b), X(4), Y(m * 4 + b), { c: color, w: 3.2 })}
${PTS.map((p, i) => (Math.abs(res[i]) < 1e-9 ? '' : line(X(p.x), Y(p.y), X(p.x), Y(p.y - res[i]), { c: k(1), w: 2.6 }))).join('')}
${PTS.map(p => dot(X(p.x), Y(p.y), 'var(--ink)', 5.5)).join('')}
${PTS.map((p, i) => (Math.abs(res[i]) < 1e-9 ? '' : text(X(p.x) + (res[i] > 0 ? -9 : 9), (Y(p.y) + Y(p.y - res[i])) / 2 + 5, signed(+res[i].toFixed(2)), { anchor: res[i] > 0 ? 'end' : 'start', fill: k(1), weight: 700, size: 13 }))).join('')}
${text(ox + 150, 232, `${tr('residuals', 'residual')}: ${res.map(r => signed(+r.toFixed(2))).join(sep())}`, { size: 12 })}
${text(ox + 150, 252, `MSE ${fmt(mse(m, b), { digits: 2 })}`, { weight: 700, fill: 'var(--ink)', size: 14 })}`;
}

function updateStep() {
  const [gm, gb] = grad(1, 1), rate = 0.15;
  const m = 1 - rate * gm, b = 1 - rate * gb;
  return svg(640, 276, `${panelOfLine(0, 1, 1, `${tr('Before', 'Sebelum')}: y = ${fmt(1)}x + ${fmt(1)}`, k(0))}${panelOfLine(340, m, b, `${tr('After one step', 'Setelah satu langkah')}: y = ${fmt(+m.toFixed(2))}x + ${fmt(+b.toFixed(2))}`, k(2))}
${arrow(304, 120, 336, 120, 'var(--muted)', 2.4, 9)}`);
}

export const figures = { 'one-dial': oneDial, 'loss-surface': lossSurface, 'gradient-uphill': gradientUphill, 'update-step': updateStep };
