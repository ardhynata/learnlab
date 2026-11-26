// Figures for the lesson "Comparing models and errors": [[figure:comparing-models-and-errors/name|Caption]].
// Every number is a real result on the penguin table, task "Adelie or Chinstrap" (219 penguins with all four
// measurements: 151 Adelie, 68 Chinstrap), made with sims/ml/capstone.js: stratifiedSplit(y, { testFraction: 0.25,
// seed }), k-NN (k = 5 unless stated, features scaled) and a decision tree (depth 3 unless stated). Split 1 is
// seed 1: 164 training and 55 held-out penguins. The ten splits are seeds 1 to 10. The histogram counts bill
// length in 1 mm bins (floor of the value) straight from data/penguins.csv.
import { svg, dot, ring, diamond, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { fill: 'var(--ink)' };
const BOLD = { weight: 700, fill: 'var(--ink)' };
const ADELIE = 0, CHINSTRAP = 1;
const pc = (right, of, digits = 1) => `${fmt(100 * right / of, { digits })}%`;

// ---- Figure 1: the fair comparison: same rows in, same metric out, only the model differs. ----
function fairComparison() {
  const models = [
    [tr('Model A', 'Model A'), tr('k-NN, k = 5', 'k-NN, k = 5'), 2, 54],
    [tr('Model B', 'Model B'), tr('Decision tree, depth 3', 'Decision tree, depth 3'), 3, 55],
  ];
  const ys = [34, 142];
  const rows = models.map(([name, what, c, right], i) => {
    const y = ys[i];
    return `${box(262, y, 188, 84, soft(c), k(c))}
${text(356, y + 28, name, { ...BOLD, size: 15 })}
${text(356, y + 50, what, { ...INK, size: 13 })}
${text(356, y + 69, tr('same four features', 'empat fitur yang sama'), { size: 12 })}
${line(190, 120 + (i ? 16 : -16), 258, y + 42, { c: 'var(--muted)', w: 2, arrow: true })}
${line(454, y + 42, 506, y + 42, { c: 'var(--muted)', w: 2, arrow: true })}
${box(510, y + 12, 162, 60, 'var(--surface)', k(c))}
${text(591, y + 40, pc(right, 55), { ...BOLD, size: 20 })}
${text(591, y + 60, tr(`${fmt(right)} of ${fmt(55)} right`, `${fmt(right)} dari ${fmt(55)} benar`), { size: 12 })}`;
  }).join('');
  return svg(680, 270, `
${text(98, 22, tr('Same rows', 'Baris yang sama'), { ...BOLD, size: 14 })}
${text(672, 22, tr('Same metric: accuracy', 'Metrik sama: accuracy'), { anchor: 'end', ...BOLD, size: 14 })}
${text(356, 22, tr('Only this differs', 'Hanya ini yang berbeda'), { ...BOLD, size: 14 })}
${box(8, 34, 182, 192, 'var(--surface)', 'var(--line)')}
${box(22, 54, 154, 70, soft(ADELIE), k(ADELIE))}
${text(99, 84, tr(`${fmt(164)} to train`, `${fmt(164)} training`), { ...BOLD, size: 14 })}
${text(99, 104, tr('the same for A and B', 'sama untuk A dan B'), { size: 12 })}
${box(22, 138, 154, 70, soft(CHINSTRAP), k(CHINSTRAP))}
${text(99, 168, tr(`${fmt(55)} held out`, `${fmt(55)} held-out`), { ...BOLD, size: 14 })}
${text(99, 188, tr('the same for A and B', 'sama untuk A dan B'), { size: 12 })}
${rows}
${text(340, 256, tr('If anything else differs, you cannot say why the scores differ.', 'Jika hal lain ikut berbeda, kamu tidak dapat mengatakan mengapa skornya berbeda.'), { size: 12 })}`);
}

// ---- Figure 2: training score and held-out score for five models on split 1 (dumbbell chart). ----
// [name, right on 164 training penguins, right on 55 held-out penguins]
const RUNS = [
  ['Baseline', 'Baseline', 113, 38],
  ['k-NN, k = 5', 'k-NN, k = 5', 160, 54],
  ['k-NN, k = 1', 'k-NN, k = 1', 164, 53],
  ['Tree, depth 3', 'Tree, depth 3', 160, 55],
  ['Tree, depth 10', 'Tree, depth 10', 164, 54],
];
function trainVsHeldOut() {
  const x0 = 214, x1 = 540, lo = 66, hi = 100, top = 66, step = 38;
  const X = v => x0 + (v - lo) / (hi - lo) * (x1 - x0);
  const ticks = [70, 80, 90, 100].map(t => `${line(X(t), top - 18, X(t), top + step * 5 - 14, { c: 'var(--line)', w: 1 })}${text(X(t), top + step * 5 + 6, `${fmt(t)}%`, { size: 12 })}`).join('');
  const body = RUNS.map(([en, id, trainRight, heldRight], i) => {
    const y = top + i * step;
    const a = 100 * trainRight / 164, b = 100 * heldRight / 55, gap = a - b;
    const hot = gap > 3; // only a gap well above one held-out penguin (1.8 points) is worth attention
    return `${text(24, y + 4, tr(en, id), { anchor: 'start', size: 13, weight: hot ? 700 : 500, ...INK })}
${line(X(Math.min(a, b)), y, X(Math.max(a, b)), y, { c: hot ? k(1) : 'var(--muted)', w: hot ? 4 : 2.4 })}
${ring(X(a), y, k(0), 7)}${dot(X(b), y, k(1), 6.5)}
${text(604, y + 4, `${gap > 0 ? '+' : ''}${fmt(gap, { digits: 1 })}`, { anchor: 'middle', size: 13, weight: hot ? 700 : 500, ...INK })}`;
  }).join('');
  const lg = 22;
  return svg(680, 296, `
${ring(x0, lg, k(0), 7)}${text(x0 + 14, lg + 4, tr('training score', 'skor training'), { anchor: 'start', size: 13, ...INK })}
${dot(x0 + 148, lg, k(1), 6.5)}${text(x0 + 162, lg + 4, tr('held-out score', 'skor held-out'), { anchor: 'start', size: 13, ...INK })}
${text(604, lg + 4, tr('gap', 'selisih'), { size: 13, ...BOLD })}
${ticks}${body}
${text(340, 286, tr('One held-out penguin = 1.8 points. One training penguin = 0.6 points.', 'Satu penguin held-out = 1,8 poin. Satu penguin training = 0,6 poin.'), { size: 12 })}`);
}

// ---- Figure 3: mistakes on the 55 held-out penguins in each of ten splits. ----
const KNN_ERRORS = [1, 1, 1, 2, 0, 3, 0, 3, 1, 1];
const TREE_ERRORS = [0, 1, 1, 2, 2, 3, 1, 1, 3, 1];
function tenSplits() {
  const lx = 24, cx0 = 148, cw = 42, tx = 584, top = 52, rh = 42;
  const sum = a => a.reduce((s, v) => s + v, 0);
  const cell = (i, row, n, c) => {
    const x = cx0 + i * cw, y = top + row * rh;
    return `<rect x="${x + 3}" y="${y}" width="${cw - 6}" height="${rh - 8}" rx="7" fill="${n === 0 ? 'var(--surface)' : soft(c)}" stroke="${k(c)}" stroke-width="1.6"/>
${text(x + cw / 2, y + 23, fmt(n), { ...BOLD, size: 15 })}`;
  };
  const names = [[tr('k-NN, k = 5', 'k-NN, k = 5'), KNN_ERRORS, 2], [tr('Tree, depth 3', 'Tree, depth 3'), TREE_ERRORS, 3]];
  const rows = names.map(([name, arr, c], r) => `${text(lx, top + r * rh + 22, name, { anchor: 'start', size: 13, ...BOLD })}
${arr.map((n, i) => cell(i, r, n, c)).join('')}
${text(tx, top + r * rh + 17, tr(`${fmt(sum(arr))} mistakes`, `${fmt(sum(arr))} kesalahan`), { anchor: 'start', ...BOLD, size: 13 })}
${text(tx, top + r * rh + 34, pc(550 - sum(arr), 550), { anchor: 'start', size: 12 })}`).join('');
  const heads = KNN_ERRORS.map((_, i) => text(cx0 + i * cw + cw / 2, top - 12, fmt(i + 1), { size: 13, ...BOLD })).join('');
  const verdict = KNN_ERRORS.map((a, i) => {
    const b = TREE_ERRORS[i];
    const label = a === b ? '=' : a < b ? 'k-NN' : tr('tree', 'tree');
    const col = a === b ? 'var(--muted)' : a < b ? k(2) : k(3);
    return text(cx0 + i * cw + cw / 2, top + 2 * rh + 18, label, { fill: col, weight: 700, size: a === b ? 15 : 12 });
  }).join('');
  const first = `<rect x="${cx0 + 1}" y="${top - 26}" width="${cw - 2}" height="${2 * rh + 28}" rx="9" fill="none" stroke="var(--ink)" stroke-width="2" stroke-dasharray="5 4"/>`;
  const wins = c => KNN_ERRORS.filter((a, i) => c(a, TREE_ERRORS[i])).length;
  return svg(680, 214, `
${text(cx0 + 5 * cw, 18, tr('Split number', 'Nomor split'), { size: 13, ...BOLD })}
${heads}${rows}${first}
${text(lx, top + 2 * rh + 18, tr('Fewer mistakes', 'Kesalahan lebih sedikit'), { anchor: 'start', size: 13, ...BOLD })}${verdict}
${line(lx, 166, 656, 166, { c: 'var(--line)', w: 1.4 })}
${text(340, 190, tr(`k-NN wins ${fmt(wins((a, b) => a < b))}, tree wins ${fmt(wins((a, b) => a > b))}, tied ${fmt(wins((a, b) => a === b))}.   Dashed box: the split used so far.`, `k-NN menang ${fmt(wins((a, b) => a < b))}, tree menang ${fmt(wins((a, b) => a > b))}, seri ${fmt(wins((a, b) => a === b))}.   Kotak putus-putus: split yang dipakai tadi.`), { size: 13, ...INK })}`);
}

// ---- Figure 4: bill length of the two species, with three marked errors. ----
// [bin start (mm), Adelie count, Chinstrap count]; bin b holds lengths from b to just under b + 1.
const BINS = [[32, 1, 0], [33, 2, 0], [34, 6, 0], [35, 13, 0], [36, 18, 0], [37, 22, 0], [38, 17, 0], [39, 21, 0], [40, 17, 1], [41, 16, 0], [42, 10, 3], [43, 3, 2], [44, 2, 0], [45, 2, 8], [46, 1, 10], [47, 0, 3], [48, 0, 2], [49, 0, 8], [50, 0, 13], [51, 0, 8], [52, 0, 6], [53, 0, 1], [54, 0, 1], [55, 0, 1], [56, 0, 0], [57, 0, 0], [58, 0, 1]];
function billOverlap() {
  const x0 = 46, w = 600, mid = 142, u = 4.4;
  const X = v => x0 + (v - 32) / 27 * w;
  const bw = w / 27;
  const bars = BINS.map(([b, a, c]) => `${a ? `<rect x="${X(b) + 1}" y="${mid - a * u}" width="${bw - 2}" height="${a * u}" fill="${soft(ADELIE)}" stroke="${k(ADELIE)}" stroke-width="1.4"/>` : ''}${c ? `<rect x="${X(b) + 1}" y="${mid}" width="${bw - 2}" height="${c * u}" fill="${soft(CHINSTRAP)}" stroke="${k(CHINSTRAP)}" stroke-width="1.4"/>` : ''}`).join('');
  const ticks = [35, 40, 45, 50, 55].map(t => `${line(X(t), 232, X(t), 237, { c: 'var(--muted)', w: 1.4 })}${text(X(t), 252, fmt(t), { size: 12 })}`).join('');
  const mark = (n, bill, y, c) => `${line(X(bill), mid, X(bill), y + (y < mid ? 9 : -9), { c: 'var(--ink)', w: 1.4, dash: '3 3' })}${diamond(X(bill), y, k(c), 9)}${text(X(bill) + 17, y + 5, fmt(n), { anchor: 'start', size: 14, ...BOLD })}`;
  return svg(680, 280, `
<rect x="${X(42)}" y="30" width="${X(47) - X(42)}" height="204" rx="6" fill="var(--accent-soft)" opacity="0.75"/>
${text((X(42) + X(47)) / 2 + 40, 24, tr('both species here', 'kedua spesies ada di sini'), { size: 12, ...BOLD })}
${bars}
${line(x0, mid, x0 + w, mid, { c: 'var(--ink)', w: 1.6 })}
${mark(1, 42.5, mid + 42, CHINSTRAP)}${mark(3, 46.0, mid + 66, CHINSTRAP)}${mark(2, 44.1, mid - 36, ADELIE)}
<rect x="500" y="34" width="12" height="12" fill="${soft(ADELIE)}" stroke="${k(ADELIE)}" stroke-width="1.6"/>${text(520, 45, tr(`Adelie (${fmt(151)})`, `Adelie (${fmt(151)})`), { anchor: 'start', size: 13, ...INK })}
<rect x="500" y="54" width="12" height="12" fill="${soft(CHINSTRAP)}" stroke="${k(CHINSTRAP)}" stroke-width="1.6"/>${text(520, 65, tr(`Chinstrap (${fmt(68)})`, `Chinstrap (${fmt(68)})`), { anchor: 'start', size: 13, ...INK })}
${ticks}${text(x0 + w / 2, 272, tr('bill length (mm)', 'panjang paruh (mm)'), { size: 13, ...INK })}
${text(x0, 22, tr('penguins per 1 mm of bill length', 'penguin per 1 mm panjang paruh'), { anchor: 'start', size: 12 })}`);
}

export const figures = {
  'fair-comparison': fairComparison,
  'train-vs-held-out': trainVsHeldOut,
  'ten-splits': tenSplits,
  'bill-overlap': billOverlap,
};
