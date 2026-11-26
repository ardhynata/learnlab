// Figures for the reading lesson "Neurons and backpropagation" (neural-network-fundamentals course).
// Every number is computed here from the lesson's 2-2-1 network and its input (1, 2) with label 1, so the
// pictures match the worked examples in the text. The XOR network is the hand-built one from the last section.
import { svg, dot, ring, text, line, box, k, soft, tr, fmt } from '../kit.js';

const sigmoid = z => 1 / (1 + Math.exp(-z));
const F4 = { digits: 4 };
const m4 = v => (v < 0 ? '−' : '') + fmt(Math.abs(v), F4); // 4 decimals with a real minus sign
const m = v => (v < 0 ? '−' : '') + fmt(Math.abs(v));
const halo = t => t.replace('<text', '<text paint-order="stroke" stroke="var(--surface)" stroke-width="4" stroke-linejoin="round"');

// A line with a colored arrowhead (the shared line() arrow is always the muted color).
function arrow(x1, y1, x2, y2, color = 'var(--muted)', w = 2.4, head = 9) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = d => `${(x2 - head * Math.cos(a + d)).toFixed(1)} ${(y2 - head * Math.sin(a + d)).toFixed(1)}`;
  return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" fill="none"/><path d="M${x2.toFixed(1)} ${y2.toFixed(1)}L${p(-0.45)}L${p(0.45)}z" fill="${color}"/>`;
}

// The lesson's network and its forward pass, computed here and nowhere else.
const X = [1, 2], Y = 1;
const W = [[0.5, -0.3], [0.8, 0.2]], B = [0.3, -0.4], V = [1.2, -0.7], C = 0.05;
function forward() {
  const z = W.map((w, j) => w[0] * X[0] + w[1] * X[1] + B[j]);
  const h = z.map(sigmoid);
  const zo = V[0] * h[0] + V[1] * h[1] + C;
  const p = sigmoid(zo);
  return { z, h, zo, p, loss: -Math.log(p) };
}

// One neuron on the lesson's numbers: weights 0.8 and 0.2, bias -0.4, inputs 1 and 2, sigmoid on top.
function neuron() {
  const w = [0.8, 0.2], b = -0.4, x = [1, 2];
  const z = w[0] * x[0] + w[1] * x[1] + b, a = sigmoid(z);
  const px = zv => 362 + (zv + 4) / 8 * 160, py = v => 200 - v * 125;
  const curve = Array.from({ length: 81 }, (_, i) => { const zv = -4 + i * 0.1; return `${i ? 'L' : 'M'}${px(zv).toFixed(1)} ${py(sigmoid(zv)).toFixed(1)}`; }).join('');
  const input = (y, name, v) => `${ring(50, y, k(0), 24)}${text(50, y - 2, name, { size: 12 })}${text(50, y + 14, fmt(v), { size: 14, weight: 700, fill: 'var(--ink)' })}`;
  return svg(640, 250, `${box(0, 0, 640, 250, 'var(--surface)')}
${input(80, 'x1', x[0])}${input(180, 'x2', x[1])}
${arrow(74, 84, 194, 118, 'var(--muted)')}${arrow(74, 176, 194, 142, 'var(--muted)')}
${halo(text(122, 88, `× ${fmt(w[0])}`, { size: 14, weight: 700, fill: 'var(--ink)' }))}${halo(text(122, 184, `× ${fmt(w[1])}`, { size: 14, weight: 700, fill: 'var(--ink)' }))}
${box(190, 88, 124, 84, soft(0), k(0))}
${text(252, 112, tr('weighted sum', 'jumlah berbobot'), { size: 12, weight: 700, fill: 'var(--ink)' })}
${text(252, 132, tr('+ bias', '+ bias') + ' ' + m(b), { size: 13 })}
${text(252, 158, `z = ${fmt(z)}`, { size: 17, weight: 700, fill: 'var(--ink)' })}
${arrow(252, 38, 252, 84, k(1))}${text(252, 28, `${tr('bias', 'bias')} ${m(b)}`, { size: 14, weight: 700, fill: k(1) })}
${arrow(316, 130, 342, 130)}
${box(344, 34, 196, 196, 'var(--surface)', 'var(--line)')}
${text(442, 54, tr('activation: sigmoid', 'aktivasi: sigmoid'), { size: 13, weight: 700, fill: 'var(--ink)' })}
${line(px(-4), py(0), px(4), py(0), { c: 'var(--muted)', w: 1.4 })}${line(px(0), py(1.05), px(0), py(0) + 4, { c: 'var(--line)', w: 1.2 })}
${[-4, 0, 4].map(t => text(px(t), py(0) + 17, fmt(t), { size: 12 })).join('')}
${[0, 0.5, 1].map(v => text(352, py(v) + 4, fmt(v), { size: 11, anchor: 'start' })).join('')}
<path d="${curve}" fill="none" stroke="${k(0)}" stroke-width="3.2" stroke-linejoin="round"/>
${line(px(z), py(0), px(z), py(a), { c: 'var(--muted)', w: 1.4, dash: '4 3' })}${line(px(-4), py(a), px(z), py(a), { c: 'var(--muted)', w: 1.4, dash: '4 3' })}
${dot(px(z), py(a), k(1), 6.5)}
${halo(text(px(z) + 10, py(a) + 24, `z = ${fmt(z)}`, { size: 12.5, weight: 700, fill: 'var(--ink)', anchor: 'start' }))}
${arrow(542, 130, 566, 130)}
${ring(596, 130, k(1), 27)}${text(596, 126, 'a', { size: 12 })}${text(596, 144, fmt(a, { digits: 2 }), { size: 15, weight: 700, fill: 'var(--ink)' })}
${text(596, 182, tr('output', 'output'), { size: 13 })}
${text(320, 246, tr('a = sigmoid(z): the same two steps as logistic regression', 'a = sigmoid(z): dua langkah yang sama seperti regresi logistik'), { size: 12.5 })}`);
}

// The 2-2-1 network with every weight, bias and the values of the forward pass.
function network() {
  const f = forward();
  const node = (x, y, name, c) => `${ring(x, y, c, 27)}${text(x, y + 5, name, { size: 15, weight: 700, fill: 'var(--ink)' })}`;
  const inp = (x, y, name, v) => `${ring(x, y, k(0), 27)}${text(x, y - 2, name, { size: 12 })}${text(x, y + 15, fmt(v), { size: 14, weight: 700, fill: 'var(--ink)' })}`;
  const P = { in: [[70, 120], [70, 240]], hid: [[330, 120], [330, 240]], out: [500, 180] };
  const edge = ([x1, y1], [x2, y2], label, t, color = 'var(--muted)') => {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    return `${arrow(x1 + ux * 28, y1 + uy * 28, x2 - ux * 31, y2 - uy * 31, color, 2.2, 9)}${halo(text(x1 + dx * t, y1 + dy * t + 4, label, { size: 12.5, weight: 700, fill: 'var(--ink)' })).replace('stroke-width="4"', 'stroke-width="9"')}`;
  };
  const wl = (name, v) => `${name} = ${m(v)}`;
  const info = (x, y, lines) => lines.map((l, i) => text(x, y + 15 * i, l, { size: 12.5, fill: i === lines.length - 1 ? 'var(--ink)' : 'var(--muted)', weight: i === lines.length - 1 ? 700 : 500 })).join('');
  return svg(640, 340, `${box(0, 0, 640, 340, 'var(--surface)')}
${text(70, 24, tr('input layer', 'lapisan input'), { size: 13, weight: 700, fill: 'var(--ink)' })}${text(330, 24, tr('hidden layer', 'lapisan hidden'), { size: 13, weight: 700, fill: 'var(--ink)' })}${text(500, 24, tr('output layer', 'lapisan output'), { size: 13, weight: 700, fill: 'var(--ink)' })}
${edge(P.in[0], P.hid[0], wl('w11', W[0][0]), 0.3)}${edge(P.in[0], P.hid[1], wl('w21', W[1][0]), 0.3)}
${edge(P.in[1], P.hid[0], wl('w12', W[0][1]), 0.3)}${edge(P.in[1], P.hid[1], wl('w22', W[1][1]), 0.3)}
${edge(P.hid[0], P.out, wl('v1', V[0]), 0.5)}${edge(P.hid[1], P.out, wl('v2', V[1]), 0.5)}
${inp(P.in[0][0], P.in[0][1], 'x1', X[0])}${inp(P.in[1][0], P.in[1][1], 'x2', X[1])}
${node(P.hid[0][0], P.hid[0][1], 'h1', k(2))}${node(P.hid[1][0], P.hid[1][1], 'h2', k(2))}${node(P.out[0], P.out[1], 'p', k(1))}
${info(330, 50, [`b1 = ${fmt(B[0])}`, `z1 = ${fmt(f.z[0])}`, `h1 = ${fmt(f.h[0], F4)}`])}
${info(330, 292, [`b2 = ${m(B[1])}`, `z2 = ${fmt(f.z[1])}`, `h2 = ${fmt(f.h[1], F4)}`])}
${info(500, 100, [`c = ${fmt(C)}`, `z = ${fmt(f.zo, F4)}`, `p = ${fmt(f.p, F4)}`])}
${text(500, 236, `${tr('label', 'label')} y = ${fmt(Y)}`, { size: 12.5 })}${text(500, 253, `${tr('loss', 'loss')} −ln(p) = ${fmt(f.loss, { digits: 3 })}`, { size: 13, weight: 700, fill: 'var(--ink)' })}
${text(24, 320, tr('sigmoid in every neuron', 'sigmoid di setiap neuron'), { size: 12, anchor: 'start' })}`);
}

// The chain of slopes from the loss back to the weight w11, with the running product under each value.
function chain() {
  const f = forward();
  const dz = f.p - Y, dh1 = dz * V[0], sl = f.h[0] * (1 - f.h[0]), dz1 = dh1 * sl, dw11 = dz1 * X[0];
  const xs = [22, 153, 284, 415, 546], w = 66;
  const cell = (i, y, a, b, hi) => `${box(xs[i], y, w, 52, hi ? soft(1) : 'var(--surface)', hi ? k(1) : 'var(--line)')}${text(xs[i] + w / 2, y + 21, a, { size: 13, weight: 700, fill: 'var(--ink)' })}${text(xs[i] + w / 2, y + 40, b, { size: 13 })}`;
  const fwd = [['w11', fmt(W[0][0])], ['z1', fmt(f.z[0])], ['h1', fmt(f.h[0], F4)], ['z', fmt(f.zo, F4)], [tr('loss', 'loss'), fmt(f.loss, { digits: 3 })]];
  const back = [['dL/dw11', m4(dw11)], ['dL/dz1', m4(dz1)], ['dL/dh1', m4(dh1)], ['dL/dz', m4(dz)], ['dL/dL', fmt(1)]];
  const local = [fmt(X[0]), fmt(sl, F4), fmt(V[0]), m4(f.p - Y)]; // between columns i and i+1, read backward
  return svg(640, 268, `${box(0, 0, 640, 268, 'var(--surface)')}
${text(21, 26, tr('Forward pass: the values (rounded)', 'Forward pass: nilainya (dibulatkan)'), { anchor: 'start', size: 13, weight: 700, fill: 'var(--ink)' })}
${fwd.map(([a, b], i) => cell(i, 38, a, b, false)).join('')}
${[0, 1, 2, 3].map(i => arrow(xs[i] + w + 4, 64, xs[i + 1] - 4, 64)).join('')}
${text(21, 128, tr('Backward pass: the slope of the loss at each value', 'Backward pass: kemiringan loss di tiap nilai'), { anchor: 'start', size: 13, weight: 700, fill: 'var(--ink)' })}
${back.map(([a, b], i) => cell(i, 140, a, b, i === 0)).join('')}
${[0, 1, 2, 3].map(i => `${arrow(xs[i + 1] - 4, 166, xs[i] + w + 4, 166, k(1))}${halo(text((xs[i] + w + xs[i + 1]) / 2, 158, `×${local[i]}`, { size: 11.5, weight: 700, fill: k(1) }))}`).join('')}
${text(320, 238, `${m4(f.p - Y)} × ${fmt(V[0])} × ${fmt(sl, F4)} × ${fmt(X[0])} = ${m4(dw11)}`, { size: 14, weight: 700, fill: 'var(--ink)' })}
${text(320, 257, tr('Each backward arrow multiplies by one local slope.', 'Setiap panah mundur dikalikan satu kemiringan lokal.'), { size: 12.5 })}`);
}

// XOR: no straight line in the inputs, one straight line in the hidden features of the hand-built network.
function xor() {
  const h1 = (a, b) => sigmoid(10 * (a + b) - 5), h2 = (a, b) => sigmoid(10 * (a + b) - 15);
  const pts = [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]];
  const PY = v => 246 - v * 150;
  const LX = v => 70 + v * 170, RX = v => 372 + v * 200;
  const mark = (x, y, cls) => (cls ? dot(x, y, k(1), 9) : ring(x, y, k(0), 9));
  const axes = (X0, x1, name1, name2) => `${line(X0, PY(0) + 18, x1, PY(0) + 18, { c: 'var(--muted)', w: 1.4 })}${line(X0 - 18, PY(0) + 18, X0 - 18, PY(1) - 22, { c: 'var(--muted)', w: 1.4 })}${text(x1, PY(0) + 38, name1, { anchor: 'end', size: 12.5 })}${text(X0 - 8, PY(1) - 28, name2, { anchor: 'start', size: 12.5 })}`;
  const left = pts.map(([a, b, c]) => `${mark(LX(a), PY(b), c)}${halo(text(LX(a) + (a ? -16 : 16), PY(b) + (b ? 4 : 4), `(${fmt(a)}, ${fmt(b)})`, { anchor: a ? 'end' : 'start', size: 12.5, fill: 'var(--ink)' }))}`).join('');
  // the right panel: (0,1) and (1,0) land on the same spot
  const spots = [[h1(0, 0), h2(0, 0), 0], [h1(0, 1), h2(0, 1), 1], [h1(1, 1), h2(1, 1), 0]];
  const right = spots.map(([a, b, c]) => mark(RX(a), PY(b), c)).join('');
  return svg(640, 330, `${box(0, 0, 640, 330, 'var(--surface)')}
${box(14, 34, 292, 282, 'var(--surface)', 'var(--line)')}${box(334, 34, 292, 282, 'var(--surface)', 'var(--line)')}
${text(160, 24, tr('Inputs: no straight line works', 'Input: tak ada garis lurus yang cocok'), { size: 13, weight: 700, fill: 'var(--ink)' })}
${text(480, 24, tr('Hidden features: one line works', 'Feature hidden: satu garis cukup'), { size: 13, weight: 700, fill: 'var(--ink)' })}
${axes(LX(0), LX(1) + 30, 'x1', 'x2')}
${line(LX(-0.12), PY(0.62), LX(0.62), PY(-0.12), { c: k(2), w: 2.6, dash: '7 5' })}
${left}
${halo(text(LX(0.4), PY(0.62), tr('one cut leaves (1, 1)', 'satu garis salah di (1, 1)'), { anchor: 'start', size: 11.5, fill: k(2), weight: 700 }))}
${halo(text(LX(0.4), PY(0.62) + 15, tr('on the wrong side', 'di sisi yang keliru'), { anchor: 'start', size: 11.5, fill: k(2), weight: 700 }))}
${axes(RX(0), RX(1) + 30, 'h1', 'h2')}
${line(RX(0.38), PY(-0.12), RX(1.04), PY(0.54), { c: k(2), w: 2.6, dash: '7 5' })}
${right}
${halo(text(RX(0.02) + 14, PY(0) - 14, '(0, 0)', { anchor: 'start', size: 12.5, fill: 'var(--ink)' }))}
${halo(text(RX(0.99) + 14, PY(0.01) - 2, '(0, 1)', { anchor: 'start', size: 12.5, fill: 'var(--ink)' }))}${halo(text(RX(0.99) + 14, PY(0.01) + 13, '(1, 0)', { anchor: 'start', size: 12.5, fill: 'var(--ink)' }))}
${halo(text(RX(1) - 14, PY(0.99) + 4, '(1, 1)', { anchor: 'end', size: 12.5, fill: 'var(--ink)' }))}
${halo(text(RX(0.12), PY(0.62), tr('output neuron: the line', 'neuron output: garis'), { anchor: 'start', size: 12, fill: k(2), weight: 700 }))}
${halo(text(RX(0.12), PY(0.62) + 15, `h2 = h1 − ${fmt(0.5)}`, { anchor: 'start', size: 12, fill: k(2), weight: 700 }))}
${ring(46, 306, k(0), 6)}${text(58, 310, tr('label 0', 'label 0'), { anchor: 'start', size: 12 })}${dot(128, 306, k(1), 6)}${text(140, 310, tr('label 1', 'label 1'), { anchor: 'start', size: 12 })}`);
}

export const figures = { 'neuron': neuron, 'network': network, 'chain': chain, 'xor': xor };
