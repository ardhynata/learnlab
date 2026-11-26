// Figures for the lesson "Reconstruction error and embeddings": [[figure:reconstruction-and-embeddings/name|Caption]].
//
// Where the numbers come from (a figure is drawn synchronously and cannot load the csv, so the
// measurements are written down here, each made once on data/penguins.csv):
//   - SIX: the six penguins of the worked example (flipper length mm, body mass g), standardized with
//     their own mean and standard deviation (dividing by n, as the PCA lesson does). Everything drawn from them is computed below.
//   - EIGEN: eigenvalues of the correlation matrix of the 342 penguins with all four size measurements
//     (bill length, bill depth, flipper length, body mass), from sims/ml/linalg.js eigenSym.
//   - MASS_OFF: root-mean-square error, in grams, of body mass rebuilt from the first k components
//     (k = 1 to 4), over the same 342 penguins.
//   - MAPS: 342 points per map, each coordinate rescaled to -50..50 and rounded. The maps are the first
//     two PCA components and two t-SNE runs (perplexity 30 and 5, exact gradient method, 750 steps,
//     seed 1, started from the standardized four measurements). Rows are 151 Adelie, then 123 Gentoo,
//     then 68 Chinstrap.
//   - GAPS: distance between the Gentoo and Adelie species means divided by the distance between the
//     Chinstrap and Adelie species means: 1.85 in the four standardized measurements.
//   - The last figure is generated here with a seeded random generator (sims/ml/rng.js).
import { svg, dot, ring, text, line, box, k, tr, fmt } from '../kit.js';
import { covariance, eigenSym } from '../../sims/ml/linalg.js';
import { rng, gauss } from '../../sims/ml/rng.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const f1 = v => fmt(v, { digits: 1 });
const f2 = v => fmt(v, { digits: 2 });

const SIX = [[181, 3750], [186, 3800], [195, 3250], [210, 4450], [211, 4500], [230, 5700]];
const EIGEN = [2.7538, 0.7725, 0.3652, 0.1085];
const MASS_OFF = [332, 327, 153, 0];
const MAPS = {
  pca: [[36,28,29,37,37,35,21,36,27,35,35,36,38,32,35,32,20,44,23,45,40,37,31,32,38,35,34,50,34,37,37,33,31,30,30,33,35,45,25,43,23,43,17,39,22,38,48,35,30,32,26,37,20,46,27,32,27,43,31,39,26,32,22,42,22,29,27,36,17,40,28,24,14,32,17,23,38,30,22,38,9,35,31,34,33,36,37,32,33,28,11,39,23,37,12,32,19,47,20,33,14,36,31,39,36,21,34,38,11,19,18,31,19,34,18,36,33,35,33,38,34,36,18,37,22,32,18,33,7,34,25,34,19,34,23,37,25,33,20,26,29,38,24,34,35,25,40,32,29,32,18,-16,-36,-15,-32,-26,-16,-14,-23,-10,-19,-11,-25,-17,-30,-8,-30,-6,-39,-14,-29,-35,-18,-13,-17,-20,-19,-10,-27,-16,-31,-26,-10,-14,-49,-27,-24,-16,-14,-9,-19,-3,-33,-11,-21,-31,-19,-9,-31,-22,-18,-17,-30,-9,-30,-21,-19,-7,-21,-6,-34,-8,-26,-14,-43,-20,-34,-16,-36,-17,-35,-18,-20,-24,-23,-16,-36,-15,-34,-18,-28,-18,-33,-16,-30,-16,-31,-14,-32,-20,-35,-21,-32,-15,-32,-15,-31,-20,-24,-12,-29,-22,-39,-18,-35,-21,-21,-7,-33,-9,-22,-24,-39,-9,-36,-16,-45,-14,-33,-22,-20,-34,-18,-23,20,14,16,26,13,13,33,9,15,15,16,17,20,3,19,9,21,10,24,6,29,18,30,16,20,7,13,12,19,0,30,5,26,4,15,7,15,-3,24,-1,6,21,15,16,10,1,18,2,22,9,11,7,18,8,28,13,21,10,9,25,5,16,15,0,19,14,1,11],
   [-3,-11,-6,-4,9,-9,4,-16,12,-16,-14,-8,11,5,-13,-3,16,-14,26,-8,-6,-5,-8,-13,-8,-2,-7,-7,1,-16,-10,-9,1,-19,12,5,0,-3,2,-13,-2,-11,12,-19,0,1,-6,-14,18,-9,1,-16,7,-16,0,-11,0,-22,-3,-21,16,-16,-3,-19,-3,-25,3,-23,7,-11,-4,-12,10,-17,2,-12,-2,-24,5,-21,-2,-7,-5,-12,10,-3,-8,-1,-3,-14,-3,-22,-5,-17,2,-6,-2,-31,3,-15,10,-23,3,-7,-1,-13,3,-16,7,-18,19,-9,8,10,1,-16,5,-20,-1,-18,1,-12,0,-28,2,-11,-1,-14,1,-10,6,-9,-6,-12,-7,-17,8,-21,-6,-12,-10,-36,-11,-19,-4,-3,-10,-14,-9,-18,0,-24,3,-14,-3,-12,-22,-16,-9,-28,-8,-30,0,-22,-10,-17,-1,-30,-4,-16,-7,-9,-17,-16,-7,-29,-12,-21,-8,-14,-3,-8,-23,-17,24,-8,0,-26,-1,-25,-3,-28,1,-23,-7,1,-23,-21,1,-25,-8,-17,-13,-19,-6,-15,-12,-24,-13,-21,-2,-22,-12,-21,7,-18,6,-16,2,-22,-4,-10,-8,-5,-13,-12,-1,-16,6,-22,-4,-11,3,-13,0,-22,11,-21,-8,-16,11,-10,11,-17,1,-17,0,-2,-14,-13,6,-9,17,-7,-6,-18,-4,-22,6,-24,-8,-4,1,-16,6,-19,10,-11,1,-19,-16,0,-15,1,4,20,20,7,26,2,5,14,10,24,4,28,1,15,-2,22,23,23,8,12,-7,4,-11,20,4,21,13,16,3,29,-14,36,-11,18,14,-1,9,32,-5,29,19,1,19,-3,11,16,10,20,17,6,-3,19,-1,23,-7,19,-7,22,16,12,23,-4,-3,32,0,11,19,15]],
  t30: [[29,37,39,24,20,34,14,28,16,36,35,41,20,18,32,24,15,30,16,32,30,22,28,35,22,30,39,31,28,43,33,37,28,32,18,20,31,30,14,31,10,31,13,38,14,31,31,30,17,37,14,29,11,32,11,36,11,39,23,36,17,35,9,39,9,33,14,37,12,23,12,40,3,30,8,39,21,35,10,34,6,23,19,34,21,22,27,20,25,27,7,33,13,35,8,25,11,39,8,28,14,39,19,34,29,29,20,40,12,42,15,38,12,19,8,39,21,34,33,36,23,43,8,38,10,37,9,39,6,36,7,26,13,36,9,33,16,36,10,40,39,37,39,38,28,13,29,29,25,32,8,-15,-39,-20,-33,-29,-16,-19,-26,-11,-25,-11,-31,-16,-31,-15,-33,-11,-34,-19,-32,-32,-20,-17,-24,-12,-24,-15,-30,-21,-34,-28,-12,-19,-44,-30,-32,-12,-24,-12,-28,-11,-37,-14,-27,-36,-14,-14,-38,-12,-24,-20,-31,-15,-32,-21,-23,-12,-23,-11,-36,-13,-27,-16,-41,-17,-40,-18,-38,-15,-35,-24,-26,-28,-26,-23,-38,-20,-35,-16,-35,-22,-37,-21,-37,-15,-41,-15,-33,-20,-41,-25,-41,-18,-37,-18,-38,-28,-24,-21,-39,-26,-43,-25,-35,-18,-27,-11,-38,-12,-29,-29,-38,-16,-40,-17,-42,-22,-36,-19,-21,-35,-21,-30,4,-8,-6,5,-9,2,8,-4,3,-8,3,-9,6,-6,5,-9,-7,-3,5,-5,41,2,44,-7,3,-7,-4,-6,4,-13,42,-13,42,-8,-4,2,0,-13,6,-12,-11,5,-6,4,-3,-7,-1,-11,-3,-1,3,-8,4,-10,41,-5,6,-10,-7,6,-10,6,4,-12,6,-2,-10,-5],
   [-25,-23,-18,-23,-28,-23,-29,-14,-31,-14,-23,-21,-29,-27,-19,-24,-32,-17,-34,-23,-24,-21,-24,-23,-20,-27,-20,-22,-27,-18,-24,-19,-27,-10,-30,-26,-28,-22,-22,-18,-26,-17,-33,-11,-23,-27,-21,-15,-32,-21,-24,-14,-31,-16,-25,-21,-26,-10,-23,-11,-32,-16,-25,-11,-25,-9,-25,-11,-31,-17,-24,-17,-36,-13,-28,-23,-21,-9,-29,-12,-27,-20,-22,-16,-30,-22,-20,-23,-22,-12,-31,-11,-22,-13,-32,-21,-27,-8,-27,-14,-31,-10,-25,-18,-26,-10,-26,-12,-32,-15,-34,-17,-31,-29,-28,-13,-27,-11,-27,-12,-25,-19,-30,-9,-30,-17,-27,-15,-32,-18,-37,-18,-27,-18,-23,-13,-29,-10,-24,-18,-21,-7,-23,-13,-25,-24,-19,-13,-19,-13,-30,45,27,47,30,32,45,40,34,47,34,42,28,43,30,49,28,48,26,42,34,32,38,47,33,40,35,50,31,45,30,34,44,39,30,35,28,41,30,47,29,49,28,47,40,29,40,48,30,39,32,42,34,47,36,40,35,47,36,45,31,48,34,46,31,41,27,42,27,39,31,40,36,36,34,40,26,45,27,42,24,45,32,43,30,43,27,39,34,43,28,37,28,41,28,39,31,38,38,47,30,39,29,36,32,44,30,43,33,45,30,38,26,38,29,47,30,34,26,43,41,29,36,28,-43,-45,-47,-41,-47,-40,-43,-44,-37,-46,-43,-47,-44,-42,-45,-44,-48,-49,-42,-40,-24,-45,-23,-46,-44,-43,-46,-44,-43,-43,-21,-45,-22,-42,-45,-47,-42,-43,-49,-44,-42,-44,-46,-46,-45,-41,-46,-41,-48,-45,-48,-44,-45,-44,-22,-47,-47,-44,-44,-39,-43,-46,-46,-45,-36,-44,-42,-44]],
  t5: [[1,26,23,-4,-10,14,-5,8,-12,19,13,21,-11,-13,12,-4,-9,6,-10,6,2,-15,12,13,-15,-2,21,6,0,22,11,21,0,12,-11,-12,-3,4,-6,7,8,8,-6,21,-5,-2,5,9,-11,24,-4,9,-1,8,7,25,7,22,-2,19,-10,14,9,21,10,12,-3,26,-5,-15,8,29,10,11,3,13,-13,16,0,16,3,-14,-16,20,-9,-15,-2,-13,-1,7,5,17,-5,18,5,-1,1,23,5,10,-5,23,-14,12,-1,30,-12,21,-5,30,-8,23,-4,-11,4,27,-6,17,19,19,-5,22,3,25,1,22,2,27,5,21,18,-2,0,24,11,15,-2,16,0,28,25,25,13,26,0,-4,5,8,0,13,2,-16,-43,-28,-42,-38,-16,-24,-32,-5,-34,-8,-41,-15,-40,-12,-42,-4,-45,-25,-34,-40,-24,-13,-35,-10,-33,-13,-40,-28,-42,-32,-5,-26,-40,-34,-41,-9,-38,-6,-41,-4,-42,-9,-22,-41,-10,-9,-38,-11,-37,-24,-36,-12,-33,-19,-28,-6,-28,-6,-44,-8,-33,-14,-42,-18,-44,-22,-44,-11,-43,-23,-29,-31,-33,-23,-43,-27,-44,-15,-46,-28,-49,-26,-38,-14,-43,-11,-37,-22,-42,-21,-43,-24,-42,-24,-37,-23,-20,-27,-36,-22,-41,-34,-45,-20,-39,-5,-49,-5,-41,-22,-44,-22,-42,-14,-42,-29,-45,-21,-20,-42,-32,-41,39,31,31,42,28,40,44,34,11,28,39,28,36,37,34,42,28,39,41,36,24,38,27,31,38,40,32,36,39,49,27,48,26,38,35,33,40,50,30,48,43,36,31,32,34,37,38,43,38,34,31,39,34,42,25,32,31,42,37,19,44,34,33,46,17,35,44,36],
   [0,0,-5,13,24,-4,40,-13,32,-15,-3,2,25,27,-9,14,31,6,33,-1,0,17,-8,-3,16,0,0,0,-3,-13,-4,-1,-3,-20,27,21,0,1,43,4,23,5,34,-21,42,1,1,-14,31,1,44,-13,32,6,23,1,23,-22,13,-20,30,-12,22,-21,21,-20,45,-21,34,14,21,-6,39,-12,39,18,17,-14,33,-20,41,16,19,-3,23,17,10,19,13,-16,31,-22,44,-19,30,13,40,-24,38,-12,32,-22,22,4,0,-7,21,-14,35,-7,34,-4,33,24,38,-18,16,-20,0,-20,15,-13,32,-23,32,-3,40,-19,32,-3,27,11,40,0,20,-20,31,-14,42,-6,3,-24,19,-20,0,44,5,-15,12,-11,32,-37,16,-33,2,-4,-37,-26,-7,-43,-12,-32,-11,-33,-4,-45,4,-45,6,-27,-3,0,-23,-44,-12,-32,-11,-42,-4,-32,2,-6,-37,-26,24,-2,-11,-31,-13,-43,-8,-45,10,-43,-13,8,-30,-44,9,-32,-12,-28,-2,-45,-1,-27,-8,-43,-8,-39,1,-44,-7,-43,25,-27,17,-26,15,-28,1,-16,-7,-5,-10,-16,15,-33,7,-32,8,-31,3,-30,8,-33,19,-28,-1,-30,20,-15,20,-26,9,-23,9,-11,-16,-34,8,-14,23,-13,0,-30,-12,-36,4,-38,-7,-12,14,-23,18,-42,24,-10,8,-30,-27,8,-13,-10,17,34,32,18,34,13,17,27,39,34,14,35,12,36,13,38,32,25,18,39,5,21,8,33,17,36,29,32,15,39,7,38,6,36,29,17,14,40,11,39,42,13,31,15,26,38,22,43,23,25,16,36,14,39,6,30,12,39,32,27,39,12,15,39,28,28,42,31]],
};
const MAP_GAPS = { pca: 2.22, t30: 2.37, t5: 1.24 };
const RUNS = [[0, 151], [2, 123], [1, 68]];

const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sdev = a => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length); };

// Figure 1: six penguins as z-scores of flipper length and body mass, projected onto the 45 degree line.
function projectAndBack() {
  const cx = 220, cy = 165, S = 68;
  const X = z => cx + z * S, Y = z => cy - z * S;
  const zs = [0, 1].map(j => { const col = SIX.map(r => r[j]); const m = mean(col), s = sdev(col); return col.map(v => (v - m) / s); });
  const pts = SIX.map((_, i) => [zs[0][i], zs[1][i]]);
  const kept = pts.map(([a, b]) => (a + b) / 2);
  const err = pts.map(([a, b]) => (a - b) ** 2 / 2);
  const total = pts.reduce((s, [a, b]) => s + a * a + b * b, 0);
  const lost = err.reduce((s, v) => s + v, 0);
  const worst = err.indexOf(Math.max(...err));
  const colorOf = i => (i < 3 ? k(0) : k(2));
  const ticks = [-2, -1, 0, 1, 2].map(t => `${line(X(t), cy - 4, X(t), cy + 4, { c: 'var(--muted)', w: 1.4 })}${text(X(t), cy + 20, fmt(t), { size: 11.5 })}${line(cx - 4, Y(t), cx + 4, Y(t), { c: 'var(--muted)', w: 1.4 })}${t ? text(cx - 12, Y(t) + 4, fmt(t), { anchor: 'end', size: 11.5 }) : ''}`).join('');
  const body = pts.map(([a, b], i) => `${line(X(a), Y(b), X(kept[i]), Y(kept[i]), { c: 'var(--ink)', w: 1.8, dash: '4 3' })}`).join('')
    + pts.map((_, i) => ring(X(kept[i]), Y(kept[i]), colorOf(i), 6)).join('')
    + pts.map(([a, b], i) => dot(X(a), Y(b), colorOf(i), 6)).join('');
  const [wa, wb] = pts[worst];
  const lx = 420;
  return svg(680, 330, `${box(60, 15, 320, 300)}
${line(60, cy, 380, cy, { c: 'var(--line)', w: 1.6 })}${line(cx, 15, cx, 315, { c: 'var(--line)', w: 1.6 })}${ticks}
${line(X(-2.2), Y(-2.2), X(2.2), Y(2.2), { c: 'var(--muted)', w: 2.4 })}
${text(X(1.2), Y(1.7), tr('first component', 'komponen pertama'), { anchor: 'end', size: 12.5, weight: 700, fill: 'var(--ink)' })}
${body}
${text(70, 32, tr('body mass (z-score)', 'body mass (z-score)'), { anchor: 'start', size: 12 })}
${text(375, 308, tr('flipper length (z-score)', 'flipper length (z-score)'), { anchor: 'end', size: 12 })}
${text(X(wa) + 12, Y(wb) + 22, tr('195 mm, 3250 g: farthest from the line', '195 mm, 3250 g: terjauh dari garis'), { anchor: 'start', size: 11.5, fill: 'var(--ink)' })}
${dot(lx + 6, 44, k(0), 6)}${text(lx + 20, 48, tr('Adelie penguin', 'penguin Adelie'), { anchor: 'start', size: 12.5 })}
${dot(lx + 6, 68, k(2), 6)}${text(lx + 20, 72, tr('Gentoo penguin', 'penguin Gentoo'), { anchor: 'start', size: 12.5 })}
${ring(lx + 6, 92, 'var(--muted)', 6)}${text(lx + 20, 96, tr('kept: its spot on the line', 'dipertahankan: posisinya di garis'), { anchor: 'start', size: 12.5 })}
${line(lx, 116, lx + 12, 116, { c: 'var(--ink)', w: 1.8, dash: '4 3' })}${text(lx + 20, 120, tr('dropped: the error', 'dibuang: galat'), { anchor: 'start', size: 12.5 })}
${text(lx, 166, `${tr('total squared length', 'total kuadrat panjang')}: ${f2(total)}`, { anchor: 'start', size: 13, ...INK })}
${text(lx, 190, `${tr('total squared error', 'total kuadrat galat')}: ${fmt(lost, { digits: 3 })}`, { anchor: 'start', size: 13, ...INK })}
${text(lx, 214, `${tr('share dropped', 'bagian yang dibuang')}: ${f1(lost / total * 100)}%`, { anchor: 'start', size: 13, ...INK })}
${text(lx, 238, `${tr('share kept', 'bagian yang dipertahankan')}: ${f1((1 - lost / total) * 100)}%`, { anchor: 'start', size: 13, ...INK })}`);
}

// Figure 2: reconstruction error against k for the four penguin measurements.
function errorByK() {
  const total = EIGEN.reduce((s, v) => s + v, 0);
  const left = 90, base = 214, top = 40, yMax = 35, step = 128;
  const Y = v => base - v / yMax * (base - top);
  let cum = 0;
  const rows = EIGEN.map((v, i) => { cum += v; return { kk: i + 1, explained: cum / total * 100, error: (1 - cum / total) * 100 }; });
  const bars = rows.map((r, i) => {
    const x = left + 60 + i * step, h = base - Y(Math.max(r.error, 0));
    const cut = r.error <= 5;
    return `<rect x="${x - 32}" y="${base - h}" width="64" height="${h}" rx="4" fill="${cut ? k(2) : k(1)}" stroke="var(--ink)" stroke-width="1.6"/>
${text(x, Math.min(base - h, Y(5)) - 8, `${f1(r.error)}%`, { size: 13, ...INK })}
${text(x, base + 20, `k = ${fmt(r.kk)}`, { size: 13, ...INK })}
${text(x, base + 40, `${tr('explained', 'explained')} ${f1(r.explained)}%`, { size: 12 })}
${text(x, base + 58, `${MASS_OFF[i]} g`, { size: 12 })}`;
  }).join('');
  const grid = [0, 10, 20, 30].map(v => `${line(left, Y(v), left + 4 * step - 4, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, `${fmt(v)}%`, { anchor: 'end', size: 11.5 })}`).join('');
  return svg(680, 300, `${grid}
${text(left, 22, tr('Share of the squared length lost when rebuilding from k components', 'Bagian kuadrat panjang yang hilang saat membangun ulang dari k komponen'), { anchor: 'start', size: 13, ...INK })}
${bars}
${line(left, Y(5), left + 4 * step - 4, Y(5), { c: 'var(--ink)', w: 2, dash: '6 4' })}${text(left + 4 * step - 8, Y(16), tr('error I can accept: 5%', 'galat yang dapat diterima: 5%'), { anchor: 'end', size: 12, ...INK })}
${text(left - 8, base + 58, tr('body mass off by', 'body mass meleset'), { anchor: 'end', size: 12 })}`);
}

// Figure 3: the same 342 penguins on three two-dimensional maps.
function threeMaps() {
  const names = [['pca', tr('PCA, 2 components', 'PCA, 2 komponen'), tr('axes are real combinations', 'sumbu adalah kombinasi nyata')], ['t30', tr('t-SNE, perplexity 30', 't-SNE, perplexity 30'), tr('axes mean nothing', 'sumbu tidak bermakna')], ['t5', tr('t-SNE, perplexity 5', 't-SNE, perplexity 5'), tr('axes mean nothing', 'sumbu tidak bermakna')]];
  const pw = 212, ph = 212, top = 34;
  const panels = names.map(([key, title, note], p) => {
    const ox = 8 + p * 224, X = v => ox + pw / 2 + v * (pw - 20) / 100, Y = v => top + ph / 2 + v * (ph - 20) / 100;
    const [xs, ys] = MAPS[key];
    let at = 0, dots = '';
    RUNS.forEach(([c, n]) => { for (let i = at; i < at + n; i++) dots += `<circle cx="${X(xs[i]).toFixed(1)}" cy="${Y(ys[i]).toFixed(1)}" r="3.2" fill="${k(c)}" fill-opacity="0.8"/>`; at += n; });
    return `${box(ox, top, pw, ph)}${dots}
${text(ox + pw / 2, 22, title, { ...INK, size: 13 })}
${text(ox + pw / 2, top + ph + 18, note, { size: 12 })}
${text(ox + pw / 2, top + ph + 38, `${tr('gap ratio', 'rasio jarak')}: ${f2(MAP_GAPS[key])}`, { size: 12, ...INK })}`;
  }).join('');
  return svg(680, 360, `${panels}
${dot(250, 304, k(0), 5)}${text(260, 308, 'Adelie', { anchor: 'start', size: 12 })}${dot(330, 304, k(1), 5)}${text(340, 308, 'Chinstrap', { anchor: 'start', size: 12 })}${dot(430, 304, k(2), 5)}${text(440, 308, 'Gentoo', { anchor: 'start', size: 12 })}
${text(340, 330, tr('gap ratio = distance Gentoo to Adelie ÷ distance Chinstrap to Adelie (species means)', 'rasio jarak = jarak Gentoo ke Adelie ÷ jarak Chinstrap ke Adelie (rata-rata spesies)'), { size: 12, ...INK })}
${text(340, 350, tr(`in the data itself the gap ratio is ${f2(1.85)}`, `pada datanya sendiri rasio jaraknya ${f2(1.85)}`), { size: 12, ...INK })}`);
}

// Figure 4: two classes that differ along the weaker direction. PCA keeps the strong direction.
function toyData() {
  const R = rng(11), th = 0.5, pts = [];
  for (let c = 0; c < 2; c++) for (let i = 0; i < 60; i++) {
    const a = 3 * gauss(R), b = (c ? 1.2 : -1.2) + 0.45 * gauss(R);
    pts.push({ c, x: a * Math.cos(th) - b * Math.sin(th), y: a * Math.sin(th) + b * Math.cos(th) });
  }
  const mx = mean(pts.map(p => p.x)), my = mean(pts.map(p => p.y));
  pts.forEach(p => { p.x -= mx; p.y -= my; });
  const e = eigenSym(covariance(pts.map(p => [p.x, p.y])));
  const comp = e.vectors.map(v => pts.map(p => p.x * v[0] + p.y * v[1]));
  const share = e.values.map(v => v / (e.values[0] + e.values[1]) * 100);
  const bestCut = s => {
    let best = 0;
    for (const t of s) { const hit = s.reduce((n, v, i) => n + ((v > t) === (pts[i].c === 1) ? 1 : 0), 0); best = Math.max(best, hit, s.length - hit); }
    return best / s.length * 100;
  };
  return { pts, e, comp, share, acc: comp.map(bestCut) };
}

function pcaMissesSignal() {
  const d = toyData(), cx = 180, cy = 160, S = 14;
  const X = v => cx + v * S, Y = v => cy - v * S;
  const axis = (v, w, dash) => line(X(-8.5 * v[0]), Y(-8.5 * v[1]), X(8.5 * v[0]), Y(8.5 * v[1]), { c: 'var(--muted)', w, dash });
  const strip = (idx, y0, title) => {
    const lo = Math.min(...d.comp[idx]), hi = Math.max(...d.comp[idx]);
    const px = v => 400 + (v - lo) / (hi - lo) * 250;
    return `${text(400, y0 - 14, title, { anchor: 'start', size: 12, ...INK })}${line(400, y0 + 20, 650, y0 + 20, { c: 'var(--line)', w: 1.6 })}
${d.pts.map((p, i) => `<circle cx="${px(d.comp[idx][i]).toFixed(1)}" cy="${y0 + 20 + ((i * 7) % 5 - 2) * 4}" r="4.2" fill="${k(p.c ? 1 : 0)}" fill-opacity="0.45"/>`).join('')}
${text(400, y0 + 44, tr(`best single cut gets ${f1(d.acc[idx])}% right`, `satu potongan terbaik benar ${f1(d.acc[idx])}%`), { anchor: 'start', size: 12, ...INK })}`;
  };
  return svg(680, 300, `${box(20, 20, 320, 280)}
${axis(d.e.vectors[0], 2.6)}${axis(d.e.vectors[1], 1.8, '5 4')}
${d.pts.map(p => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="4.2" fill="${k(p.c ? 1 : 0)}" fill-opacity="0.8"/>`).join('')}
${text(34, 40, tr('solid: first component · dashed: second', 'penuh: komponen pertama · putus: kedua'), { anchor: 'start', size: 11.5 })}
${strip(0, 80, tr(`First component: ${f1(d.share[0])}% of the variance`, `Komponen pertama: ${f1(d.share[0])}% varians`))}
${strip(1, 190, tr(`Second component: ${f1(d.share[1])}% of the variance`, `Komponen kedua: ${f1(d.share[1])}% varians`))}
${dot(402, 288, k(0), 5)}${text(412, 292, tr('class A', 'kelas A'), { anchor: 'start', size: 12 })}${dot(500, 288, k(1), 5)}${text(510, 292, tr('class B', 'kelas B'), { anchor: 'start', size: 12 })}`);
}

export const figures = { 'project-and-back': projectAndBack, 'error-by-k': errorByK, 'three-maps': threeMaps, 'pca-misses-signal': pcaMissesSignal };
