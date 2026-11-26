// Figures for the lesson "Network lab" (neural-network-fundamentals). Every number on screen comes from the lab's
// own math (sims/ml/networklab.js on top of sims/ml/mlp.js), with the lab's defaults: 2 hidden layers of 8 units,
// ReLU, He initialization, Adam at learning rate 0.01, 400 epochs, generated data seed 11, weights seed 1. The runs
// are language-free and memoized, so a language or theme change only redraws the text.
//
// The one exception is the penguin loss curve in "loss-gap". A figure is a synchronous string and cannot fetch
// data/penguins.csv, so the series are baked in below. They were produced with the lab's own functions: the lab's
// defaults on its Penguins (real data) option, first sample (data seed 11, 60 penguins of each species, 84 training
// and 36 validation points), the loss at every tenth epoch from 0 to 400, plus the lowest validation loss of the run.
import { svg, text, line, box, dot, k, soft, tr, fmt } from '../kit.js';
import { buildDataset, createSession, stepSession, layerActivity, PER_CLASS } from '../../sims/ml/networklab.js';

const ink = { fill: 'var(--ink)', weight: 700 };
const m = v => (v < 0 ? '−' : '') + fmt(Math.abs(v));
const halo = (x, y, t, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.anchor ?? 'middle'}" font-size="${o.size ?? 13}" font-weight="${o.weight ?? 700}" fill="${o.fill ?? 'var(--ink)'}" stroke="var(--surface)" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${t}</text>`;
const path = (pts, c, w = 2.8, dash = '') => `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
// Scientific notation the way the lab writes a small gradient: 1.3e-4.
function sci(v) {
  if (!(v > 0)) return '0';
  if (v >= 0.01) return fmt(v, { max: 3 });
  const e = Math.floor(Math.log10(v));
  return `${fmt(v / 10 ** e, { digits: 1 })}e${e}`;
}

// ---- the runs -------------------------------------------------------------------------------------

const memo = {};
const once = (key, make) => (key in memo ? memo[key] : (memo[key] = make()));

// A session on the lab's generated moons (data seed 11, weights seed 1), trained `epochs` epochs.
function trained({ activation = 'relu', hidden = 2, units = 8, optimizer = 'adam', lr = 0.01, epochs = 400 } = {}) {
  const data = buildDataset({ mode: 'generated', shape: 'moons', seed: 11, perClass: PER_CLASS });
  const s = createSession(data.points, { hidden, units, activation, init: 'he', seed: 1 });
  if (epochs > 0) stepSession(s, epochs, { optimizer, lr, l2: 0 });
  return s;
}
const moonsRun = () => once('moons', () => { const s = trained(); return { train: s.hist.trainLoss, val: s.hist.valLoss }; });
const gradientsAtStart = activation => once(`grad-${activation}`, () => trained({ activation, hidden: 4, epochs: 0 }).hist.grad[0]);
const deadUnits = lr => once(`dead-${lr}`, () => {
  const s = trained({ lr });
  return { loss: s.hist.trainLoss[400], layers: layerActivity(s.model, s.X).map(l => l.units.map(u => u.alive)) };
});

// Penguins, lab defaults, first sample: loss every 10th epoch from 0 to 400 (see the header).
const PENGUIN_TRAIN = [0.748, 0.502, 0.307, 0.161, 0.103, 0.078, 0.068, 0.063, 0.059, 0.057, 0.056, 0.054, 0.052, 0.051, 0.049, 0.047, 0.046, 0.044, 0.042, 0.04, 0.039, 0.037, 0.035, 0.033, 0.031, 0.03, 0.028, 0.027, 0.025, 0.024, 0.022, 0.021, 0.02, 0.018, 0.017, 0.016, 0.015, 0.014, 0.013, 0.012, 0.012];
const PENGUIN_VAL = [0.717, 0.466, 0.279, 0.153, 0.107, 0.103, 0.127, 0.147, 0.161, 0.175, 0.181, 0.19, 0.194, 0.191, 0.191, 0.185, 0.18, 0.182, 0.179, 0.17, 0.175, 0.173, 0.171, 0.182, 0.178, 0.169, 0.178, 0.177, 0.185, 0.194, 0.184, 0.189, 0.2, 0.198, 0.205, 0.21, 0.216, 0.215, 0.209, 0.227, 0.227];
const PENGUIN_BEST = { epoch: 48, loss: 0.1 };
const PENGUIN_END = { train: 0.012, val: 0.227 };

// ---- Figure 1: the four views ---------------------------------------------------------------------

function fourViews() {
  const w = 156, gap = 16, top = 6, h = 238;
  const sketch = {
    plot(x, y) {
      const dots = [[16, 18, 0], [28, 30, 0], [40, 16, 0], [52, 34, 0], [60, 20, 0], [20, 52, 1], [34, 62, 1], [48, 50, 1], [58, 66, 1], [66, 52, 1], [30, 40, 0], [44, 44, 1]];
      return `<rect x="${x}" y="${y}" width="80" height="80" rx="6" fill="var(--surface)" stroke="var(--line)" stroke-width="1.4"/>${dots.map(([a, b, c]) => dot(x + a, y + b, k(c), 3.4)).join('')}${path([[x + 4, y + 38], [x + 26, y + 44], [x + 44, y + 36], [x + 62, y + 42], [x + 76, y + 38]], 'var(--ink)', 2.2)}`;
    },
    loss(x, y) {
      const a = [[0, 6], [8, 28], [16, 44], [26, 54], [40, 60], [60, 64], [80, 66]], b = [[0, 8], [8, 30], [16, 46], [26, 52], [40, 48], [60, 42], [80, 36]];
      return `<rect x="${x}" y="${y}" width="80" height="80" rx="6" fill="var(--surface)" stroke="var(--line)" stroke-width="1.4"/>${path(a.map(([p, q]) => [x + 6 + p * 0.9, y + 74 - q]), k(0), 2.6)}${path(b.map(([p, q]) => [x + 6 + p * 0.9, y + 74 - q]), k(1), 2.6)}`;
    },
    gradient(x, y) {
      const rows = [[22, 0], [40, 1], [60, 2]];
      return `<rect x="${x}" y="${y}" width="80" height="80" rx="6" fill="var(--surface)" stroke="var(--line)" stroke-width="1.4"/>${rows.map(([yy, c]) => path([[x + 8, y + yy + 4 * (c - 1)], [x + 72, y + yy - 2 * c + 3]], k(c), 2.6)).join('')}`;
    },
    inside(x, y) {
      const cols = [[14, [26, 54]], [40, [14, 34, 54, 70]], [66, [40]]];
      const edges = [];
      cols.forEach(([cx, ys], i) => { if (i < 2) for (const y1 of ys) for (const y2 of cols[i + 1][1]) edges.push(line(x + cx, y + y1, x + cols[i + 1][0], y + y2, { c: 'var(--muted)', w: 1.2 })); });
      const circles = cols.map(([cx, ys], i) => ys.map((yy, j) => (i === 1 && j === 2
        ? `<circle cx="${x + cx}" cy="${y + yy}" r="5.5" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="2.5 2.5"/>`
        : `<circle cx="${x + cx}" cy="${y + yy}" r="5.5" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.5"/>`)).join('')).join('');
      return `<rect x="${x}" y="${y}" width="80" height="80" rx="6" fill="var(--surface)" stroke="var(--line)" stroke-width="1.4"/>${edges.join('')}${circles}`;
    },
  };
  const views = [
    ['plot', 0, tr('Plot', 'Plot'), [tr('What the network has', 'Apa yang sudah'), tr('learned: shading,', 'dipelajari: arsiran,'), tr('boundary, points.', 'boundary, titik.')]],
    ['loss', 1, tr('Loss chart', 'Grafik loss'), [tr('Is it learning, and', 'Apakah belajar, dan'), tr('does that carry over', 'apakah berlaku juga'), tr('to validation?', 'di validasi?')]],
    ['gradient', 2, tr('Gradient chart', 'Grafik gradient'), [tr('How much signal', 'Seberapa banyak sinyal'), tr('reaches each layer.', 'sampai ke tiap layer.'), tr('A low line: no learning.', 'Garis rendah: lambat.')]],
    ['inside', 3, tr('Inside the network', 'Di dalam network'), [tr('Weights and unit', 'Weight dan output'), tr('outputs. A dashed', 'unit. Lingkaran'), tr('circle is a dead unit.', 'putus = unit mati.')]],
  ];
  const body = views.map(([name, c, title, lines], i) => {
    const ox = 4 + i * (w + gap);
    return `${box(ox, top, w, h, soft(c), k(c))}
${sketch[name](ox + (w - 80) / 2, top + 14)}
${text(ox + w / 2, top + 126, title, { ...ink, size: 14 })}
${lines.map((t, j) => text(ox + w / 2, top + 152 + j * 20, t, { size: 12, fill: 'var(--ink)' })).join('')}`;
  }).join('');
  return svg(680, 252, body);
}

// ---- Figure 2: the loss chart, with and without a gap ---------------------------------------------

function lossGap() {
  const run = moonsRun();
  const W = 270, H = 140, top = 54, bottom = top + H;
  const panel = (ox, title, trainAt, valAt, extra) => {
    const X = e => ox + (e / 400) * W, Y = v => bottom - Math.min(v, 1) / 1 * H;
    const xs = Array.from({ length: 41 }, (_, i) => i * 10);
    const ticks = [0, 0.5, 1].map(v => `${line(ox, Y(v), ox + W, Y(v), { c: 'var(--line)', w: 1 })}${text(ox - 6, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('')
      + [0, 200, 400].map(e => text(X(e), bottom + 17, fmt(e), { size: 12 })).join('');
    return `${text(ox + W / 2, 42, title, { ...ink, size: 14 })}${box(ox, top, W, H, 'var(--surface)', 'var(--line)')}${ticks}
${path(xs.map(e => [X(e), Y(trainAt(e))]), k(0))}${path(xs.map(e => [X(e), Y(valAt(e))]), k(1))}${extra(X, Y)}
${text(ox + W / 2, bottom + 34, tr('Epoch', 'Epoch'), { size: 12 })}`;
  };
  const left = panel(52, tr('Two moons (generated)', 'Dua bulan sabit (data buatan)'), e => run.train[e], e => run.val[e], () => '');
  const right = panel(372, tr('Penguins (real data)', 'Penguin (data nyata)'), e => PENGUIN_TRAIN[e / 10], e => PENGUIN_VAL[e / 10], (X, Y) => `${line(X(PENGUIN_BEST.epoch), Y(PENGUIN_BEST.loss), X(PENGUIN_BEST.epoch), top + 4, { c: 'var(--muted)', w: 1.4, dash: '3 4' })}${dot(X(PENGUIN_BEST.epoch), Y(PENGUIN_BEST.loss), k(1), 5)}${halo(X(PENGUIN_BEST.epoch) + 8, top + 18, tr(`lowest: ${fmt(PENGUIN_BEST.loss, { digits: 2 })} at epoch ${fmt(PENGUIN_BEST.epoch)}`, `terendah: ${fmt(PENGUIN_BEST.loss, { digits: 2 })} di epoch ${fmt(PENGUIN_BEST.epoch)}`), { anchor: 'start', size: 12 })}`);
  const end = (ox, a, b) => text(ox + W / 2, bottom + 54, tr(`Epoch 400: training ${fmt(a, { digits: 3 })}, validation ${fmt(b, { digits: 3 })}`, `Epoch 400: training ${fmt(a, { digits: 3 })}, validasi ${fmt(b, { digits: 3 })}`), { size: 13, fill: 'var(--ink)' });
  const legend = [[k(0), tr('Training loss', 'Loss training')], [k(1), tr('Validation loss', 'Loss validasi')]].map(([c, name], i) => `${line(232 + i * 130, 14, 262 + i * 130, 14, { c, w: 3.4 })}${text(270 + i * 130, 18, name, { anchor: 'start', size: 13, fill: 'var(--ink)' })}`).join('');
  return svg(680, 262, `${legend}${left}${right}${end(52, run.train[400], run.val[400])}${end(372, PENGUIN_END.train, PENGUIN_END.val)}`);
}

// ---- Figure 3: the first layer's gradient under sigmoid and under ReLU ------------------------------

function gradientLayers() {
  const sig = gradientsAtStart('sigmoid'), rel = gradientsAtStart('relu');
  const ox = 70, ow = 520, top = 30, H = 190, bottom = top + H, lo = -4.5, hi = -0.5;
  const X = i => ox + 50 + i * ((ow - 100) / 4), Y = v => bottom - ((v - lo) / (hi - lo)) * H;
  const names = [1, 2, 3, 4].map(i => tr(`Layer ${i}`, `Layer ${i}`)).concat(tr('Output', 'Output'));
  const grid = [-4, -3, -2, -1].map(v => `${line(ox, Y(v), ox + ow, Y(v), { c: 'var(--line)', w: 1 })}${text(ox - 8, Y(v) + 4, m(v), { anchor: 'end', size: 12 })}`).join('');
  const lg = v => Math.log10(v);
  const series = (g, c, below) => `${path(g.map((v, i) => [X(i), Y(lg(v))]), c, 3)}${g.map((v, i) => dot(X(i), Y(lg(v)), c, 4.6)).join('')}${g.map((v, i) => halo(X(i), Y(lg(v)) + (below ? 20 : -11), sci(v), { size: 12, fill: c })).join('')}`;
  const ratio = rel[0] / sig[0];
  const gx = X(0) + 40;
  const gap = `${line(gx, Y(lg(sig[0])) - 4, gx, Y(lg(rel[0])) + 4, { c: 'var(--ink)', w: 1.6, arrow: true })}${halo(gx + 8, (Y(lg(sig[0])) + Y(lg(rel[0]))) / 2 + 4, tr(`${fmt(ratio, { digits: 0 })} times`, `${fmt(ratio, { digits: 0 })} kali`), { anchor: 'start', size: 13 })}`;
  const axis = `<text transform="rotate(-90 16 ${top + H / 2})" x="16" y="${top + H / 2}" text-anchor="middle" font-size="12" font-weight="500" fill="var(--muted)">${tr('log10 of mean |gradient|', 'log10 dari rata-rata |gradient|')}</text>`;
  const legend = [[k(1), tr('sigmoid', 'sigmoid')], [k(2), tr('ReLU', 'ReLU')]].map(([c, name], i) => `${line(ox + 130 + i * 110, 12, ox + 160 + i * 110, 12, { c, w: 3.4 })}${text(ox + 168 + i * 110, 16, name, { anchor: 'start', size: 13, fill: 'var(--ink)' })}`).join('');
  return svg(680, 268, `${legend}${box(ox, top, ow, H, 'none', 'var(--line)')}${grid}${axis}${series(sig, k(1), true)}${series(rel, k(2), false)}${gap}
${names.map((n, i) => text(X(i), bottom + 20, n, { size: 13, fill: 'var(--ink)' })).join('')}`);
}

// ---- Figure 4: dead units after a small and after a large learning rate --------------------------------

function deadUnitsFigure() {
  const panels = [[0.01, k(2)], [1, k(3)]];
  const W = 316, top = 8, h = 244;
  const body = panels.map(([lr, c], i) => {
    const ox = 4 + i * (W + 24), d = deadUnits(lr);
    const rows = d.layers.map((alive, l) => {
      const dead = alive.filter(a => !a).length, y = top + 100 + l * 66;
      const label = tr(`Layer ${l + 1}: ${fmt(dead)} of ${fmt(alive.length)} dead`, `Layer ${l + 1}: ${fmt(dead)} dari ${fmt(alive.length)} mati`);
      const circles = alive.map((a, j) => {
        const cx = ox + 24 + j * ((W - 48) / (alive.length - 1));
        return a ? `<circle cx="${cx}" cy="${y + 20}" r="11" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.8"/>`
          : `<circle cx="${cx}" cy="${y + 20}" r="11" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="3 3"/>`;
      }).join('');
      return `${text(ox + 14, y, label, { anchor: 'start', size: 13, fill: 'var(--ink)' })}${circles}`;
    }).join('');
    return `${box(ox, top, W, h, 'var(--surface)', 'var(--line)')}
${text(ox + W / 2, top + 30, tr(`Learning rate ${fmt(lr)}`, `Learning rate ${fmt(lr)}`), { ...ink, size: 16 })}
${text(ox + W / 2, top + 56, tr(`Loss at epoch 400: ${fmt(d.loss, { digits: 3 })}`, `Loss pada epoch 400: ${fmt(d.loss, { digits: 3 })}`), { size: 14, fill: c, weight: 700 })}
${text(ox + W / 2, top + 78, tr('ReLU, Adam, 2 layers of 8 units', 'ReLU, Adam, 2 layer berisi 8 unit'), { size: 12 })}
${rows}
${text(ox + W / 2, top + h - 12, tr('Dashed circle: a dead unit', 'Lingkaran putus-putus: unit mati'), { size: 12 })}`;
  }).join('');
  return svg(680, 262, body);
}

export const figures = {
  'four-views': fourViews,
  'loss-gap': lossGap,
  'gradient-layers': gradientLayers,
  'dead-units': deadUnitsFigure,
};
