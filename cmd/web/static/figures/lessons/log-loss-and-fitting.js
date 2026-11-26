// Figures for the lesson "Log loss and fitting" (logistic-regression course). Self-contained:
// every number is computed here from the same toy examples as the lesson text.
import { svg, dot, ring, text, line, box, k, tr, fmt } from '../kit.js';

const f3 = v => fmt(v, { digits: 3 });
const sigmoid = z => 1 / (1 + Math.exp(-z));
const logLoss = (y, p) => (y === 1 ? -Math.log(p) : -Math.log(1 - p));

// A curve as an SVG path through the sampled points, clipped to a maximum height (in loss units).
function curve(xs, f, X, Y, color, cap = 5) {
  const d = xs.map((x, i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(Math.min(f(x), cap)).toFixed(1)}`).join('');
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>`;
}
const grid = (n, a, b) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);

// Axes and ticks shared by the two curve figures: p from 0 to 1 across, loss 0 to 5 up.
function lossAxes(X, Y) {
  return `${line(X(0), Y(0), X(1) + 6, Y(0), { c: 'var(--muted)', w: 1.6 })}${line(X(0), Y(0), X(0), Y(5) - 4, { c: 'var(--muted)', w: 1.6 })}
${[0, 0.5, 1].map(p => text(X(p), Y(0) + 16, fmt(p), { size: 12 })).join('')}
${[1, 2, 3, 4, 5].map(v => `${line(X(0) - 4, Y(v), X(0), Y(v), { c: 'var(--muted)', w: 1.4 })}${text(X(0) - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('')}
${text((X(0) + X(1)) / 2, Y(0) + 34, tr("the model's probability of class 1, p", 'probabilitas kelas 1 dari model, p'), { size: 12 })}
${text(X(0) + 8, Y(5) - 10, tr('loss for one example', 'loss untuk satu contoh'), { anchor: 'start', size: 12 })}`;
}

// The loss for one example, for each true label, as the model's probability moves from 0 to 1.
function lossCurve() {
  const X = p => 66 + p * 540, Y = v => 232 - v * 38;
  const ps = grid(400, 0.004, 0.996);
  const mark = (p, dx, dy, anchor) => `${dot(X(p), Y(logLoss(1, p)), k(0), 6)}${text(X(p) + dx, Y(logLoss(1, p)) + dy, f3(logLoss(1, p)), { anchor, fill: k(0), weight: 700, size: 14 })}`;
  return svg(640, 296, `${box(0, 0, 640, 296)}${lossAxes(X, Y)}
${curve(ps, p => logLoss(1, p), X, Y, k(0))}${curve(ps, p => logLoss(0, p), X, Y, k(1))}
${text(X(0.27), Y(3.2), tr('true label 1', 'label asli 1'), { anchor: 'start', fill: k(0), weight: 700, size: 14 })}
${text(X(0.27), Y(3.2) + 18, 'loss = −ln p', { anchor: 'start', fill: k(0), size: 13 })}
${text(X(0.73), Y(3.2), tr('true label 0', 'label asli 0'), { anchor: 'end', fill: k(1), weight: 700, size: 14 })}
${text(X(0.73), Y(3.2) + 18, 'loss = −ln(1 − p)', { anchor: 'end', fill: k(1), size: 13 })}
${mark(0.01, 12, 5, 'start')}${mark(0.1, 12, 4, 'start')}${mark(0.9, 0, -12, 'middle')}`);
}

// Two models with the same accuracy: the loss of each of four examples, and the mean.
function twoModels() {
  const y = [1, 1, 0, 0], A = [0.8, 0.7, 0.3, 0.6], B = [0.8, 0.7, 0.3, 0.99];
  const la = y.map((v, i) => logLoss(v, A[i])), lb = y.map((v, i) => logLoss(v, B[i]));
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const Y = v => 226 - v * 34, base = Y(0), gw = 134, x0 = 68, bw = 40;
  const groups = y.map((yi, i) => {
    const cx = x0 + gw / 2 + i * gw;
    const bar = (v, dx, c) => `<rect x="${cx + dx}" y="${Y(v).toFixed(1)}" width="${bw}" height="${(base - Y(v)).toFixed(1)}" rx="3" fill="${c}"/>${text(cx + dx + bw / 2, Y(v) - 6, f3(v), { fill: 'var(--ink)', weight: 700, size: 13 })}`;
    const pText = A[i] === B[i] ? `p = ${fmt(A[i])}` : `A: p = ${fmt(A[i])}   B: p = ${fmt(B[i])}`;
    return `${bar(la[i], -bw - 3, k(0))}${bar(lb[i], 3, k(1))}
${text(cx, base + 18, `${tr('Example', 'Contoh')} ${fmt(i + 1)}`, { fill: 'var(--ink)', weight: 700, size: 13 })}
${text(cx, base + 35, `${tr('true label', 'label asli')} ${fmt(yi)}`, { size: 12 })}
${text(cx, base + 51, pText, { size: 12 })}`;
  }).join('');
  return svg(640, 296, `${box(0, 0, 640, 296)}
${line(x0, base, x0 + 4 * gw, base, { c: 'var(--muted)', w: 1.6 })}${line(x0, base, x0, Y(5.2), { c: 'var(--muted)', w: 1.6 })}
${[0, 1, 2, 3, 4].map(v => `${line(x0 - 4, Y(v), x0, Y(v), { c: 'var(--muted)', w: 1.4 })}${text(x0 - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('')}
${text(x0 + 8, Y(5.2) + 2, tr('loss for one example', 'loss untuk satu contoh'), { anchor: 'start', size: 12 })}
<rect x="${x0 + 230}" y="30" width="14" height="14" rx="3" fill="${k(0)}"/>${text(x0 + 250, 42, `${tr('Model', 'Model')} A: ${tr('mean', 'rata-rata')} ${f3(mean(la))}`, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}
<rect x="${x0 + 230}" y="52" width="14" height="14" rx="3" fill="${k(1)}"/>${text(x0 + 250, 64, `${tr('Model', 'Model')} B: ${tr('mean', 'rata-rata')} ${f3(mean(lb))}`, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}
${groups}`);
}

// Log loss against squared error for a true label of 1.
function logVsSquared() {
  const X = p => 66 + p * 540, Y = v => 232 - v * 38;
  const ps = grid(400, 0.004, 0.996);
  const marks = [0.1, 0.01].map(p => {
    const lg = logLoss(1, p), sq = (1 - p) ** 2;
    return `${dot(X(p), Y(lg), k(0), 6)}${text(X(p) + 12, Y(lg) + 5, f3(lg), { anchor: 'start', fill: k(0), weight: 700, size: 14 })}
${dot(X(p), Y(sq), k(1), 6)}${text(X(p) + 12, Y(sq) + (p === 0.1 ? 18 : -10), f3(sq), { anchor: 'start', fill: k(1), weight: 700, size: 14 })}`;
  }).join('');
  return svg(640, 296, `${box(0, 0, 640, 296)}${lossAxes(X, Y)}
${curve(ps, p => logLoss(1, p), X, Y, k(0))}${curve(ps, p => (1 - p) ** 2, X, Y, k(1))}
${text(X(0.6), Y(3.9), tr('true label 1', 'label asli 1'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}
${line(X(0.6), Y(3.9) + 16, X(0.6) + 30, Y(3.9) + 16, { c: k(0), w: 3.2 })}${text(X(0.6) + 38, Y(3.9) + 20, tr('log loss', 'log loss'), { anchor: 'start', fill: k(0), weight: 700, size: 13 })}
${line(X(0.6), Y(3.9) + 38, X(0.6) + 30, Y(3.9) + 38, { c: k(1), w: 3.2 })}${text(X(0.6) + 38, Y(3.9) + 42, tr('squared error', 'galat kuadrat'), { anchor: 'start', fill: k(1), weight: 700, size: 13 })}
${marks}`);
}

// One gradient descent step on the toy data: the predictions change, and the loss drops.
function oneStep() {
  const xs = [-3, -1, 1, 3], ys = [0, 0, 1, 1];
  const loss = w => xs.reduce((s, x, i) => s + logLoss(ys[i], sigmoid(w * x)), 0) / xs.length;
  const grad = w => xs.reduce((s, x, i) => s + (sigmoid(w * x) - ys[i]) * x, 0) / xs.length;
  const w0 = 0, w1 = w0 - 0.5 * grad(w0), w2 = w1 - 0.5 * grad(w1);
  // Left panel: the four examples, and the probability the model gives at the start and after one step.
  const X = x => 175 + x * 30, Y = p => 222 - p * 160;
  const cur = grid(80, -4, 4);
  const sc = `<path d="${cur.map((x, i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(sigmoid(w1 * x)).toFixed(1)}`).join('')}" fill="none" stroke="${k(2)}" stroke-width="3.2" stroke-linecap="round"/>`;
  const left = `${box(10, 36, 330, 232)}${text(175, 24, tr('Predictions: start and after step 1', 'Prediksi: awal dan setelah langkah 1'), { weight: 700, fill: 'var(--ink)', size: 13 })}
${line(X(-4), Y(0), X(4) + 6, Y(0), { c: 'var(--muted)', w: 1.4 })}${line(X(-4), Y(0), X(-4), Y(1) - 8, { c: 'var(--muted)', w: 1.4 })}
${[-3, -1, 1, 3].map(x => text(X(x), Y(0) + 16, fmt(x), { size: 12 })).join('')}
${[0, 0.5, 1].map(p => text(X(-4) - 6, Y(p) + 4, fmt(p), { anchor: 'end', size: 12 })).join('')}
${text(X(4) + 6, Y(0) + 30, 'x', { anchor: 'end', size: 12 })}${text(X(-4) + 6, Y(1) - 14, 'p', { anchor: 'start', size: 12 })}
${line(X(-4), Y(0.5), X(4), Y(0.5), { c: 'var(--muted)', w: 1.8, dash: '6 5' })}
${text(X(4) - 2, Y(0.5) + 16, tr('start: p = 0.5', 'awal: p = 0,5'), { anchor: 'end', size: 12 })}
${text(X(-4) + 10, Y(1) + 5, tr('label 1', 'label 1'), { anchor: 'start', fill: k(0), weight: 700, size: 12 })}${text(X(4), Y(0) - 8, tr('label 0', 'label 0'), { anchor: 'end', fill: k(1), weight: 700, size: 12 })}
${sc}${text(X(-4) + 8, Y(0.5) - 38, tr('after step 1', 'setelah langkah 1'), { anchor: 'start', fill: k(2), weight: 700, size: 12 })}
${xs.map((x, i) => ring(X(x), Y(sigmoid(w1 * x)), k(2), 5.5)).join('')}
${xs.map((x, i) => dot(X(x), Y(ys[i]), ys[i] ? k(0) : k(1), 6.5)).join('')}`;
  // Right panel: mean log loss against the weight w, with the first two steps marked.
  const Xw = w => 392 + w * 200, Yl = v => 246 - v * 190;
  const ws = grid(80, 0, 1.2);
  const lp = `<path d="${ws.map((w, i) => `${i ? 'L' : 'M'}${Xw(w).toFixed(1)} ${Yl(loss(w)).toFixed(1)}`).join('')}" fill="none" stroke="${k(0)}" stroke-width="3.2" stroke-linecap="round"/>`;
  const pts = [[w0, tr('start', 'awal')], [w1, tr('step 1', 'langkah 1')], [w2, tr('step 2', 'langkah 2')]];
  const right = `${box(350, 36, 290, 232)}${text(495, 24, tr('Mean log loss as w changes', 'Rata-rata log loss saat w berubah'), { weight: 700, fill: 'var(--ink)', size: 13 })}
${line(Xw(0), Yl(0), Xw(1.2) + 6, Yl(0), { c: 'var(--muted)', w: 1.4 })}${line(Xw(0), Yl(0), Xw(0), Yl(0.8), { c: 'var(--muted)', w: 1.4 })}
${[0, 0.5, 1].map(w => text(Xw(w), Yl(0) + 16, fmt(w), { size: 12 })).join('')}
${[0.2, 0.4, 0.6].map(v => `${line(Xw(0) - 4, Yl(v), Xw(0), Yl(v), { c: 'var(--muted)', w: 1.4 })}${text(Xw(0) - 8, Yl(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('')}
${text(Xw(1.2) + 6, Yl(0) + 16, 'w', { anchor: 'end', size: 12 })}${text(Xw(0) + 8, Yl(0.8) - 4, tr('loss', 'loss'), { anchor: 'start', size: 12 })}
${lp}
${pts.map(([w]) => dot(Xw(w), Yl(loss(w)), k(1), 6.5)).join('')}
${pts.map(([w, name], i) => `${dot(Xw(0.5), 84 + i * 24, k(1), 5)}${text(Xw(0.5) + 12, 89 + i * 24, `${name}: ${f3(loss(w))}`, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}`).join('')}`;
  return svg(660, 284, `${left}${right}`);
}

export const figures = { 'loss-curve': lossCurve, 'two-models': twoModels, 'log-vs-squared': logVsSquared, 'one-step': oneStep };
