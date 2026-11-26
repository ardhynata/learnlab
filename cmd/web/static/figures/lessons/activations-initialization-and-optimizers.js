// Figures for the reading lesson "Activations, initialization and optimizers" (neural-network-fundamentals).
// Every number on screen is computed here from the lesson's own examples: the three activation functions and
// their slopes, the per-layer gradient factors (0.25 for the sigmoid, 1 for an active ReLU unit), a seeded
// run of eight 100-unit ReLU layers with three weight sizes, and the lesson's made-up early-stopping run.
import { svg, dot, diamond, text, line, box, k, tr, fmt } from '../kit.js';
import { rng, gauss } from '../../sims/ml/rng.js';

const ink = { weight: 700, fill: 'var(--ink)' };
// Text with a halo so a label stays readable where it crosses a line or a point.
const halo = (x, y, t, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.anchor ?? 'middle'}" font-size="${o.size ?? 13}" font-weight="${o.weight ?? 700}" fill="${o.fill ?? 'var(--ink)'}" stroke="var(--surface)" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${t}</text>`;
const path = (pts, c, w = 3, dash = '') => `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
const axes = (x0, y0, x1, y1) => `${line(x0, y1, x1, y1, { c: 'var(--muted)', w: 1.6 })}${line(x0, y0, x0, y1, { c: 'var(--muted)', w: 1.6 })}`;

const sigmoid = z => 1 / (1 + Math.exp(-z));
const sigmoidSlope = z => sigmoid(z) * (1 - sigmoid(z));
const tanhSlope = z => 1 - Math.tanh(z) ** 2;
const relu = z => Math.max(0, z);

// The three activation functions (left) and their slopes (right), for inputs z from -3 to 3.
function activationFunctions() {
  const W = 270, top = 40, H = 190, bottom = top + H;
  const zs = Array.from({ length: 121 }, (_, i) => -3 + i * 0.05);
  const panel = (ox, title, lo, hi, ticks, curves, extra = '') => {
    const X = z => ox + ((z + 3) / 6) * W;
    const Y = v => top + ((hi - v) / (hi - lo)) * H;
    return `${text(ox + W / 2, 26, title, { ...ink, size: 15 })}${box(ox, top, W, H, 'var(--surface)', 'var(--line)')}
${line(X(0), top, X(0), bottom, { c: 'var(--line)', w: 1.2 })}
${ticks.map(v => `${line(ox, Y(v), ox + W, Y(v), { c: 'var(--line)', w: 1, dash: v === 0.25 ? '4 4' : '' })}${text(ox - 6, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('')}
${[-3, 0, 3].map(z => text(X(z), bottom + 18, fmt(z), { size: 12 })).join('')}
${text(ox + W / 2, bottom + 36, tr('input z', 'input z'), { size: 12 })}
${curves.map(([f, c, w]) => path(zs.map(z => [X(z), Y(f(z))]), c, w)).join('')}${extra(X, Y)}`;
  };
  const left = panel(50, tr('output', 'output'), -1.5, 3, [-1, 0, 1, 2, 3], [[sigmoid, k(0), 3.2], [Math.tanh, k(1), 3.2], [relu, k(2), 3.2]], () => '');
  const right = panel(380, tr('slope', 'kemiringan'), 0, 1.1, [0, 0.25, 1], [[sigmoidSlope, k(0), 3.2], [tanhSlope, k(1), 3.2], [z => (z > 0 ? 1 : 0), k(2), 3.2]], () => '');
  const legend = [[k(0), tr('sigmoid', 'sigmoid')], [k(1), tr('tanh', 'tanh')], [k(2), tr('ReLU', 'ReLU')]].map(([c, name], i) => `${line(190 + i * 120, 290, 220 + i * 120, 290, { c, w: 3.4 })}${text(228 + i * 120, 294, name, { anchor: 'start', size: 13, fill: 'var(--ink)' })}`).join('');
  return svg(680, 304, `${left}${right}${legend}`);
}

// A log-scale line chart frame: x is the number of layers (0 to 8), y goes from `lo` to `hi` in powers of ten.
function logChart({ ox, oy, w, h, lo, hi, tickStep = 1, yTitle, xTitle }) {
  const X = d => ox + (d / 8) * w;
  const Y = v => oy + ((Math.log10(hi) - Math.log10(v)) / (Math.log10(hi) - Math.log10(lo))) * h;
  const ticks = [];
  for (let p = Math.log10(lo); p <= Math.log10(hi) + 1e-9; p += tickStep) ticks.push(10 ** p);
  const frame = `${box(ox, oy, w, h, 'var(--surface)', 'var(--line)')}
${ticks.map(v => `${line(ox, Y(v), ox + w, Y(v), { c: 'var(--line)', w: 1 })}${text(ox - 6, Y(v) + 4, fmt(v, { max: 5 }), { anchor: 'end', size: 12 })}`).join('')}
${[0, 2, 4, 6, 8].map(d => `${text(X(d), oy + h + 18, fmt(d), { size: 12 })}`).join('')}
${text(ox + w / 2, oy + h + 38, xTitle, { size: 12 })}${text(ox - 56, oy - 12, yTitle, { anchor: 'start', size: 12 })}`;
  return { X, Y, frame };
}

// How much of the last layer's gradient survives d layers back, when every weight is 1: each layer multiplies it
// by the activation's slope (at most 0.25 for the sigmoid, 1 for an active ReLU unit).
function gradientByLayer() {
  const c = logChart({ ox: 76, oy: 38, w: 410, h: 230, lo: 0.00001, hi: 2, tickStep: 1, yTitle: tr('gradient size, compared with the last layer', 'ukuran gradient, dibanding lapisan terakhir'), xTitle: tr('layers back from the output', 'lapisan ke belakang dari output') });
  const ds = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const series = [[0.25, k(0)], [1, k(2)]];
  const dots = series.map(([f, col]) => `${path(ds.map(d => [c.X(d), c.Y(f ** d)]), col, 3)}${ds.map(d => dot(c.X(d), c.Y(f ** d), col, 4.2)).join('')}`).join('');
  const lastSig = 0.25 ** 8;
  const labels = `${halo(c.X(8) + 12, c.Y(1) + 5, tr('ReLU, active unit', 'ReLU, unit aktif'), { anchor: 'start', fill: k(2), size: 13 })}
${halo(c.X(8) + 12, c.Y(1) + 22, tr('slope 1 every layer', 'kemiringan 1 di tiap lapisan'), { anchor: 'start', size: 12, weight: 500, fill: 'var(--muted)' })}
${halo(c.X(8) + 12, c.Y(lastSig) - 28, tr('sigmoid', 'sigmoid'), { anchor: 'start', fill: k(0), size: 13 })}
${halo(c.X(8) + 12, c.Y(lastSig) - 11, tr(`slope ${fmt(0.25)}: 1 / ${fmt(1 / lastSig)}`, `kemiringan ${fmt(0.25)}: 1 / ${fmt(1 / lastSig)}`), { anchor: 'start', size: 12, weight: 500, fill: 'var(--muted)' })}`;
  return svg(680, 322, `${c.frame}${dots}${labels}`);
}

// Eight layers of 100 ReLU units, the same 20 standard-normal inputs and the same random numbers, scaled to three
// weight sizes. The size of the signal is the root of the mean squared activation, layer by layer.
function signalSizes() {
  const n = 100, layers = 8, batch = 20;
  const random = rng(11);
  const input = Array.from({ length: batch }, () => Array.from({ length: n }, () => gauss(random)));
  const Z = Array.from({ length: layers }, () => Array.from({ length: n }, () => Array.from({ length: n }, () => gauss(random))));
  const run = sigma => {
    let h = input;
    const sizes = [Math.sqrt(h.flat().reduce((s, v) => s + v * v, 0) / (batch * n))];
    for (let l = 0; l < layers; l++) {
      h = h.map(x => Z[l].map(row => relu(sigma * row.reduce((s, w, j) => s + w * x[j], 0))));
      sizes.push(Math.sqrt(h.flat().reduce((s, v) => s + v * v, 0) / (batch * n)));
    }
    return sizes;
  };
  const he = Math.sqrt(2 / n);
  const runs = [[0.05, k(1), tr('weights too small', 'weight terlalu kecil')], [he, k(0), tr('He scaling', 'skala He')], [0.3, k(2), tr('weights too large', 'weight terlalu besar')]].map(([s, col, name]) => ({ s, col, name, sizes: run(s) }));
  const c = logChart({ ox: 76, oy: 38, w: 410, h: 230, lo: 0.0001, hi: 1000, tickStep: 1, yTitle: tr('size of the signal (root mean square of the activations)', 'ukuran sinyal (akar rata-rata kuadrat aktivasi)'), xTitle: tr('layer (0 is the input)', 'lapisan (0 adalah input)') });
  const body = runs.map(r => `${path(r.sizes.map((v, d) => [c.X(d), c.Y(v)]), r.col, 3)}${r.sizes.map((v, d) => dot(c.X(d), c.Y(v), r.col, 4)).join('')}`).join('');
  const end = r => r.sizes.at(-1);
  const val = v => fmt(v, { max: v < 0.01 ? 4 : v < 10 ? 1 : 0 });
  const labels = runs.map(r => `${halo(c.X(8) + 12, c.Y(end(r)) - 2, r.name, { anchor: 'start', fill: r.col, size: 13 })}${halo(c.X(8) + 12, c.Y(end(r)) + 15, `${tr('std', 'std')} ${fmt(r.s, { max: 3 })}: ${val(end(r))}`, { anchor: 'start', size: 12, weight: 500, fill: 'var(--muted)' })}`).join('');
  return svg(680, 322, `${c.frame}${body}${labels}`);
}

// The lesson's made-up run (invented numbers, for illustration): training loss keeps falling, validation loss
// bottoms out at epoch 6, and with patience 3 training stops after epoch 9.
const TRAIN = [0.95, 0.6, 0.42, 0.33, 0.26, 0.21, 0.17, 0.13, 0.1, 0.08];
const VALID = [0.9, 0.62, 0.48, 0.41, 0.38, 0.37, 0.375, 0.39, 0.41, 0.44];
function earlyStopping() {
  const ox = 64, oy = 36, w = 560, h = 214;
  const X = e => ox + 30 + ((e - 1) / 9) * (w - 60);
  const Y = v => oy + ((1 - v) / 1) * h;
  const best = VALID.indexOf(Math.min(...VALID)) + 1;
  const stop = best + 3;
  const grid = [0, 0.25, 0.5, 0.75, 1].map(v => `${line(ox, Y(v), ox + w, Y(v), { c: 'var(--line)', w: 1 })}${text(ox - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const xs = Array.from({ length: 10 }, (_, i) => i + 1);
  return svg(680, 322, `${box(ox, oy, w, h, 'var(--surface)', 'var(--line)')}${grid}
${xs.map(e => text(X(e), oy + h + 18, fmt(e), { size: 12 })).join('')}${text(ox + w / 2, oy + h + 38, tr('epoch', 'epoch'), { size: 12 })}${text(ox - 56, oy - 12, tr('loss', 'loss'), { anchor: 'start', size: 12 })}
${line(X(stop), oy, X(stop), oy + h, { c: 'var(--ink)', w: 1.8, dash: '6 5' })}
${path(xs.map(e => [X(e), Y(TRAIN[e - 1])]), k(0), 3)}${xs.map(e => dot(X(e), Y(TRAIN[e - 1]), k(0), 4)).join('')}
${path(xs.map(e => [X(e), Y(VALID[e - 1])]), k(1), 3)}${xs.map(e => dot(X(e), Y(VALID[e - 1]), k(1), 4)).join('')}
${diamond(X(best), Y(VALID[best - 1]), k(1), 9)}
${halo(X(best), Y(VALID[best - 1]) - 26, tr(`best: epoch ${best}`, `terbaik: epoch ${best}`), { size: 13 })}
${halo(X(stop) - 8, oy + 20, tr(`stop after epoch ${stop}`, `berhenti setelah epoch ${stop}`), { anchor: 'end', size: 13 })}
${halo(X(stop) - 8, oy + 38, tr('3 epochs with no improvement', '3 epoch tanpa perbaikan'), { anchor: 'end', size: 12, weight: 500, fill: 'var(--muted)' })}
${halo(X(8), Y(TRAIN[7]) + 24, tr('training loss', 'training loss'), { anchor: 'end', fill: k(0), size: 13 })}
${halo(X(4.4), Y(0.56), tr('validation loss', 'validation loss'), { fill: k(1), size: 13 })}`);
}

export const figures = {
  'activation-functions': activationFunctions,
  'gradient-by-layer': gradientByLayer,
  'signal-sizes': signalSizes,
  'early-stopping': earlyStopping,
};
