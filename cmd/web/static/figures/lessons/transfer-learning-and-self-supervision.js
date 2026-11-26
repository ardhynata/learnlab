// Figures for the lesson "Transfer learning and self-supervision": [[figure:transfer-learning-and-self-supervision/name|Caption]].
//
// Where the numbers come from.
//   - pretext-tasks: the masking panel shows the first penguin of data/penguins.csv (bill length 39.1, bill depth 18.7,
//     flipper length 181, body mass 3750) with the flipper length hidden. The other panels are drawings.
//   - frozen-or-fine-tuned: the counts of trained numbers are the lesson's own: an encoder from 4 inputs to a code of 2
//     has 4 x 2 weights + 2 biases = 10 numbers; the head has 2 weights + 1 bias = 3. Frozen trains 3, fine-tuning 13.
//   - fair-comparison: RESULTS comes from a simulation of 1000 rounds on the real penguins (342 complete rows). Target
//     domain: the 124 Dream penguins (56 Adelie, 68 Chinstrap). Round s (seed s of sims/ml/rng.js) shuffles them, sets 40
//     aside as test rows, calls the other 84 the unlabelled pool and takes 5 of each species from the pool as the 10
//     labelled rows. The head is nearest class mean in the code. Representation arms: raw = the 4 measurements
//     standardized with the 10 labelled rows (no code); small = PCA (sims/ml/pca.js, standardized) fitted on the 10
//     labelled rows; related = PCA fitted on the 84-row pool; other = PCA fitted on the 167 Biscoe penguins. Code size
//     k = 2 or 1. mean = average test accuracy, sd = standard deviation across the 1000 rounds (divisor n).
import { svg, dot, ring, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';

// ---- Figure 1: three pretext tasks. ----
const bars = (x, base, heights, c) => heights.map((h, i) => `<rect x="${x + i * 18}" y="${base - h}" width="12" height="${h}" rx="2" fill="${c}"/>`).join('');

function pretextTasks() {
  const W = 640, H = 280;
  const panel = (ox, title, foot, body) => `${text(ox + 100, 26, title, { fill: 'var(--ink)', weight: 700, size: 14 })}${box(ox, 40, 200, 200)}${body}${text(ox + 100, 264, foot, { fill: 'var(--ink)', weight: 600, size: 13 })}`;

  // Reconstruction: input bars, a code of 2, output bars.
  const ax = 10;
  const rebuild = `${bars(ax + 20, 104, [30, 18, 34, 24], 'var(--ink)')}
${line(ax + 47, 112, ax + 47, 138, { c: 'var(--muted)', w: 1.8, arrow: true })}
${dot(ax + 37, 158, k(1), 8)}${dot(ax + 57, 158, k(1), 8)}
${line(ax + 47, 172, ax + 47, 192, { c: 'var(--muted)', w: 1.8, arrow: true })}
${bars(ax + 20, 232, [29, 19, 33, 25], k(2))}
${text(ax + 112, 86, tr('Input', 'Input'), { anchor: 'start', size: 13, fill: 'var(--ink)' })}
${text(ax + 112, 156, tr('Code', 'Code'), { anchor: 'start', size: 13, fill: k(1), weight: 700 })}
${text(ax + 112, 178, tr('2 numbers', '2 angka'), { anchor: 'start', size: 12 })}
${text(ax + 112, 214, tr('Output', 'Output'), { anchor: 'start', size: 13, fill: 'var(--ink)' })}
${text(ax + 112, 232, tr('= input?', '= input?'), { anchor: 'start', size: 12 })}`;

  // Masking: one column of a table row is hidden and predicted from the others.
  const bx = 220;
  const rows = [[tr('Bill length', 'Panjang paruh'), fmt(39.1)], [tr('Bill depth', 'Kedalaman paruh'), fmt(18.7)], [tr('Flipper length', 'Panjang sirip'), '?'], [tr('Body mass', 'Body mass'), fmt(3750)]];
  const mask = `${rows.map(([lab, val], i) => {
    const y = 58 + i * 44, hidden = val === '?';
    return `${box(bx + 14, y, 180, 32, hidden ? soft(3) : 'var(--surface)', hidden ? k(3) : 'var(--line)')}
${text(bx + 24, y + 21, lab, { anchor: 'start', size: 12, fill: 'var(--ink)', weight: hidden ? 700 : 500 })}
${text(bx + 184, y + 21, val, { anchor: 'end', size: 14, fill: hidden ? k(3) : 'var(--ink)', weight: 700 })}`;
  }).join('')}
${line(bx + 10, 74, bx + 10, 136, { c: 'var(--muted)', w: 1.8, arrow: true })}
${line(bx + 10, 206, bx + 10, 168, { c: 'var(--muted)', w: 1.8, arrow: true })}`;

  // Contrastive pairs: two views of item A are pulled together, item B is pushed away.
  const cx = 430;
  const A1 = [cx + 44, 96], A2 = [cx + 112, 140], B = [cx + 150, 204];
  const pair = `${line(A1[0] + 10, A1[1] + 8, (A1[0] + A2[0]) / 2 - 2, (A1[1] + A2[1]) / 2 - 1, { c: k(1), w: 2, arrow: true })}
${line(A2[0] - 10, A2[1] - 8, (A1[0] + A2[0]) / 2 + 2, (A1[1] + A2[1]) / 2 + 1, { c: k(1), w: 2, arrow: true })}
${line(A2[0] + 10, A2[1] + 12, B[0] - 12, B[1] - 14, { c: 'var(--muted)', w: 1.6, dash: '4 4' })}
${dot(A1[0], A1[1], k(0), 9)}${ring(A2[0], A2[1], k(0), 9)}${dot(B[0], B[1], k(2), 9)}
${text(A1[0] - 8, A1[1] - 16, tr('A, view 1', 'A, view 1'), { anchor: 'start', size: 13, fill: 'var(--ink)' })}
${text(A2[0] + 14, A2[1] + 4, tr('A, view 2', 'A, view 2'), { anchor: 'start', size: 13, fill: 'var(--ink)' })}
${text(B[0] - 14, B[1] + 28, tr('B', 'B'), { anchor: 'end', size: 13, fill: 'var(--ink)' })}
${text(cx + 56, 190, tr('push apart', 'jauhkan'), { anchor: 'start', size: 12 })}
${text(cx + 24, 134, tr('pull', 'tarik'), { anchor: 'start', size: 12, fill: k(1), weight: 700 })}`;

  return svg(W, H, `${panel(10, tr('Reconstruction', 'Reconstruction'), tr('Rebuild the input', 'Bangun ulang input'), rebuild)}
${panel(220, tr('Masking', 'Masking'), tr('Predict the hidden part', 'Prediksi bagian tersembunyi'), mask)}
${panel(430, tr('Contrastive pairs', 'Pasangan contrastive'), tr('Same close, different far', 'Sama dekat, beda jauh'), pair)}`);
}

// ---- Figure 2: frozen or fine-tuned. ----
function frozenOrFineTuned() {
  const W = 640, H = 300;
  const node = (x, y, w, title, sub, fill, stroke) => `${box(x, y, w, 56, fill, stroke)}${text(x + w / 2, y + 24, title, { fill: 'var(--ink)', weight: 700, size: 14 })}${text(x + w / 2, y + 44, sub, { size: 12 })}`;
  const head = 2 * 1 + 1, enc = 4 * 2 + 2;
  const row = (y, label, encSub, encFill, encStroke, trained, c) => `${text(10, y + 33, label, { anchor: 'start', fill: c, weight: 700, size: 15 })}
${node(130, y, 160, tr('Encoder', 'Encoder'), encSub, encFill, encStroke)}
${line(294, y + 28, 336, y + 28, { c: 'var(--muted)', w: 2, arrow: true })}
${node(340, y, 140, tr('Head', 'Head'), tr('trained by labels', 'dilatih dengan label'), soft(1), k(1))}
${text(496, y + 26, `${tr('Trains', 'Melatih')} ${fmt(trained)} ${tr('numbers', 'angka')}`, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}
${text(496, y + 46, tr('from 10 labelled rows', 'dari 10 baris berlabel'), { anchor: 'start', size: 12 })}`;
  return svg(W, H, `${node(10, 18, 170, tr('Unlabelled rows', 'Baris tanpa label'), tr('many, no species', 'banyak, tanpa spesies'), 'var(--surface)', 'var(--line)')}
${line(184, 46, 232, 46, { c: 'var(--muted)', w: 2, arrow: true })}
${node(236, 18, 170, tr('Pretext task', 'Pretext task'), tr('hide a part, predict it', 'sembunyikan, prediksi'), soft(0), k(0))}
${line(410, 46, 458, 46, { c: 'var(--muted)', w: 2, arrow: true })}
${node(462, 18, 168, tr('Encoder', 'Encoder'), tr('4 inputs to a code of 2', '4 input jadi code 2'), soft(0), k(0))}
${line(20, 100, 620, 100, { c: 'var(--line)', w: 1.2 })}
${text(10, 124, tr('Then reuse it with the small labelled set', 'Lalu pakai ulang dengan data berlabel yang kecil'), { anchor: 'start', fill: 'var(--ink)', weight: 600, size: 13 })}
${row(146, tr('Frozen', 'Frozen'), tr('locked, not trained', 'terkunci, tidak dilatih'), soft(0), 'var(--line)', head, k(0))}
${row(230, tr('Fine-tuned', 'Fine-tuned'), tr('adjusted by labels too', 'ikut disesuaikan label'), soft(1), k(1), enc + head, k(1))}`);
}

// ---- Figure 3: a fair comparison on the Dream penguins. ----
const RESULTS = {
  2: [{ mean: 0.8343, sd: 0.1031 }, { mean: 0.7946, sd: 0.1103 }, { mean: 0.8378, sd: 0.1012 }, { mean: 0.8048, sd: 0.06853 }],
  1: [{ mean: 0.8343, sd: 0.1031 }, { mean: 0.6466, sd: 0.1072 }, { mean: 0.6382, sd: 0.1047 }, { mean: 0.8547, sd: 0.0483 }],
};

function fairComparison() {
  const W = 640, H = 424;
  const labels = () => [tr('Raw measurements', 'Pengukuran mentah'), tr('Code from 10 labelled', 'Code dari 10 berlabel'), tr('Frozen, same domain', 'Frozen, domain sama'), tr('Frozen, other island', 'Frozen, pulau lain')];
  const colors = [k(3), k(2), k(0), k(1)];
  const x0 = 200, x1 = 590, lo = 0.4, hi = 1.0;
  const X = v => x0 + (Math.min(Math.max(v, lo), hi) - lo) / (hi - lo) * (x1 - x0);
  const panel = (oy, title, data) => {
    const rowH = 34, top = oy + 34, bottom = top + 4 * rowH;
    const grid = [0.4, 0.6, 0.8, 1.0].map(t => `${line(X(t), top - 6, X(t), bottom, { c: 'var(--line)', w: 1 })}${text(X(t), bottom + 16, pct(t, 0), { size: 12 })}`).join('');
    const rows = data.map((d, i) => {
      const y = top + i * rowH + rowH / 2 - 3;
      return `${text(10, y + 5, labels()[i], { anchor: 'start', size: 13, fill: 'var(--ink)' })}
${line(X(d.mean - d.sd), y, X(d.mean + d.sd), y, { c: colors[i], w: 2.4 })}
${dot(X(d.mean), y, colors[i], 7)}
${text(Math.min(X(d.mean + d.sd), 584) + 8, y + 5, pct(d.mean), { anchor: 'start', size: 13, fill: 'var(--ink)', weight: 700 })}`;
    }).join('');
    return `${text(10, oy + 14, title, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}${grid}${rows}`;
  };
  return svg(W, H, `${panel(2, tr('Code of 2 numbers', 'Code 2 angka'), RESULTS[2])}
${panel(204, tr('Code of 1 number', 'Code 1 angka'), RESULTS[1])}
${text(10, 412, tr('Dot: average test accuracy. Line: one standard deviation across 1000 rounds.', 'Titik: rata-rata akurasi uji. Garis: satu simpangan baku dari 1000 putaran.'), { anchor: 'start', size: 12 })}`);
}

export const figures = {
  'pretext-tasks': pretextTasks,
  'frozen-or-fine-tuned': frozenOrFineTuned,
  'fair-comparison': fairComparison,
};
