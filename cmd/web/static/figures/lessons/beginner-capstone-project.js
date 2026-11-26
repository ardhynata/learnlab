// Figures for the lesson "Beginner capstone project": [[figure:beginner-capstone-project/name|Caption]].
// Every number is a real result of the Capstone workbench (sims/labs/capstone.js, math in sims/ml/capstone.js and
// capstonereport.js) on data/penguins.csv, at Split 1 (stratifiedSplit seed 1, 25% of each class for testing),
// with the lab's own defaults: Model A is k-NN (k = 5, scaled), Model B a decision tree (depth 3, leaf 1), all
// four features. Class counts: Adelie or Chinstrap 68 + 151 = 219 rows, 164 training and 55 test; Male or female
// 168 + 165 = 333 rows, 250 training and 83 test; Gentoo or the rest 123 + 219 = 342 rows, 256 training and 86
// test. The class-average body masses (g) are over the 333 penguins with a sex: Adelie female 3368.8, male 4043.5;
// Chinstrap female 3527.2, male 3939.0; Gentoo female 4679.7, male 5484.8. Text is built when drawn, so tr() and
// fmt() follow the language.
import { svg, ring, diamond, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { fill: 'var(--ink)' };
const BOLD = { weight: 700, fill: 'var(--ink)' };

// ---- Figure 1: the six steps and what the lab checks before it opens the next one. ----
function sixSteps() {
  const steps = [
    [tr('Frame', 'Rumuskan'), [tr('task and metric', 'tugas dan metrik'), tr('are chosen', 'sudah dipilih')], 0],
    [tr('Baseline', 'Baseline'), [tr('the baseline', 'baseline'), tr('has been run', 'sudah dijalankan')], 1],
    [tr('Model A', 'Model A'), [tr('model A is', 'model A sudah'), tr('evaluated', 'dievaluasi')], 2],
    [tr('Model B', 'Model B'), [tr('B differs from A', 'B berbeda dari A'), tr('and is evaluated', 'dan dievaluasi')], 3],
    [tr('Errors', 'Kesalahan'), [tr('three rows have', 'tiga baris punya'), tr('a reason and a note', 'alasan dan catatan')], 4],
    [tr('Explain', 'Jelaskan'), [tr('three texts and', 'tiga teks dan'), tr('four ratings', 'empat penilaian')], 5],
  ];
  const w = 204, h = 96, gap = 34, xs = [10, 10 + w + gap, 10 + 2 * (w + gap)], ys = [14, 148];
  const cell = ([title, done, c], i) => {
    const x = xs[i % 3], y = ys[Math.floor(i / 3)];
    return `${box(x, y, w, h, soft(c), k(c))}
${ring(x + 24, y + 24, k(c), 12)}${text(x + 24, y + 29, fmt(i + 1), { ...BOLD, size: 14 })}
${text(x + 44, y + 29, title, { anchor: 'start', ...BOLD, size: 14 })}
${text(x + 14, y + 55, tr('done when', 'selesai bila'), { anchor: 'start', size: 12 })}
${text(x + 14, y + 72, done[0], { anchor: 'start', size: 13, ...INK })}
${text(x + 14, y + 88, done[1], { anchor: 'start', size: 13, ...INK })}`;
  };
  const arrows = [0, 1].map(i => line(xs[i] + w + 4, ys[0] + h / 2, xs[i + 1] - 4, ys[0] + h / 2, { c: 'var(--muted)', w: 2, arrow: true })).join('')
    + [0, 1].map(i => line(xs[i] + w + 4, ys[1] + h / 2, xs[i + 1] - 4, ys[1] + h / 2, { c: 'var(--muted)', w: 2, arrow: true })).join('')
    + `${line(xs[2] + w / 2, ys[0] + h + 2, xs[2] + w / 2, 128, { c: 'var(--muted)', w: 2 })}${line(xs[2] + w / 2, 128, xs[0] + w / 2, 128, { c: 'var(--muted)', w: 2 })}${line(xs[0] + w / 2, 128, xs[0] + w / 2, ys[1] - 4, { c: 'var(--muted)', w: 2, arrow: true })}`;
  return svg(680, 262, `${steps.map(cell).join('')}${arrows}`);
}

// ---- Figure 2: the three tasks, their class split and the baseline score on the Split 1 test rows. ----
function threeTasks() {
  // [label, positive name, other name, positive rows, other rows, baseline right, test rows]
  const tasks = [
    [tr('Adelie or Chinstrap', 'Adelie atau Chinstrap'), tr('Chinstrap', 'Chinstrap'), tr('Adelie', 'Adelie'), 68, 151, 38, 55],
    [tr('Male or female', 'Jantan atau betina'), tr('male', 'jantan'), tr('female', 'betina'), 168, 165, 42, 83],
    [tr('Gentoo or the rest', 'Gentoo atau lainnya'), tr('Gentoo', 'Gentoo'), tr('Adelie or Chinstrap', 'Adelie atau Chinstrap'), 123, 219, 55, 86],
  ];
  const bx = 190, bw = 330, top = 62, rh = 60;
  const rows = tasks.map(([name, pos, other, p, o, right, n], i) => {
    const y = top + i * rh, wp = bw * p / (p + o);
    return `${text(10, y + 24, name, { anchor: 'start', ...BOLD, size: 14 })}
<rect x="${bx}" y="${y}" width="${wp}" height="36" fill="${soft(1)}" stroke="${k(1)}" stroke-width="1.6"/>
<rect x="${bx + wp}" y="${y}" width="${bw - wp}" height="36" fill="${soft(0)}" stroke="${k(0)}" stroke-width="1.6"/>
${text(bx + wp / 2, y + 23, `${pos} ${fmt(p)}`, { ...INK, size: 12.5 })}${text(bx + wp + (bw - wp) / 2, y + 23, `${other} ${fmt(o)}`, { ...INK, size: 12.5 })}
${text(666, y + 17, `${fmt(100 * right / n, { digits: 1 })}%`, { anchor: 'end', ...BOLD, size: 16 })}${text(666, y + 33, tr(`${fmt(right)} of ${fmt(n)} right`, `${fmt(right)} dari ${fmt(n)} benar`), { anchor: 'end', size: 12 })}`;
  }).join('');
  return svg(680, 252, `
${text(10, 28, tr('Task', 'Tugas'), { anchor: 'start', ...BOLD, size: 13 })}
${text(bx, 28, tr('Rows used: positive class, then the rest', 'Baris dipakai: kelas positif, lalu sisanya'), { anchor: 'start', ...BOLD, size: 13 })}
${text(666, 28, tr('Baseline accuracy', 'Accuracy baseline'), { anchor: 'end', ...BOLD, size: 13 })}
${line(10, 42, 670, 42, { c: 'var(--line)', w: 1.4 })}
${rows}
${text(340, 244, tr('The baseline answers the larger class every time and uses no measurement.', 'Baseline selalu menjawab kelas yang lebih besar dan tidak memakai pengukuran.'), { size: 12 })}`);
}

// ---- Figure 3: Male or female at Split 1, training (outlined) and test (solid) accuracy. ----
// [label, sub-label, right on the 250 training rows, right on the 83 test rows, color]
const RUNS = [
  [() => tr('Baseline', 'Baseline'), () => tr('most common class', 'kelas terbanyak'), 126, 42, 'var(--muted)'],
  [() => tr('Model A', 'Model A'), () => tr('k-NN, k = 5', 'k-NN, k = 5'), 235, 79, k(0)],
  [() => tr('Model B', 'Model B'), () => tr('tree, depth 3', 'tree, kedalaman 3'), 229, 74, k(1)],
  [() => tr('Model B', 'Model B'), () => tr('tree, depth 8', 'tree, kedalaman 8'), 250, 71, k(1)],
];
function trainAndTest() {
  const x0 = 60, W = 604, top = 40, H = 170, g = W / RUNS.length, bw = 48;
  const Y = v => top + H - v * H;
  const grid = [0, 0.25, 0.5, 0.75, 1].map(v => `${line(x0, Y(v), x0 + W, Y(v), { c: 'var(--line)', w: 1 })}${text(x0 - 8, Y(v) + 4, `${fmt(v * 100)}%`, { anchor: 'end', size: 12 })}`).join('');
  const bars = RUNS.map(([name, sub, trainRight, testRight, c], i) => {
    const cx = x0 + g * (i + 0.5), a = trainRight / 250, b = testRight / 83, gap = 100 * (a - b);
    const bar = (v, x, solid) => `<rect x="${x}" y="${Y(v)}" width="${bw}" height="${v * H}" fill="${c}" fill-opacity="${solid ? 1 : 0.22}" stroke="${c}" stroke-width="2"/>${text(x + bw / 2, Y(v) - 6, `${fmt(100 * v, { digits: 1 })}%`, { ...BOLD, size: 12 })}`;
    const hot = gap >= 10;
    return `${bar(a, cx - bw - 3, false)}${bar(b, cx + 3, true)}
${text(cx, top + H + 20, name(), { ...BOLD, size: 13 })}${text(cx, top + H + 37, sub(), { size: 12 })}
${text(cx, top + H + 60, `${gap > 0 ? '+' : ''}${fmt(gap, { digits: 1 })}`, { fill: hot ? k(1) : 'var(--ink)', weight: hot ? 800 : 600, size: hot ? 15 : 13 })}`;
  }).join('');
  return svg(680, 296, `
<rect x="${x0}" y="10" width="12" height="12" fill="var(--muted)" fill-opacity="0.22" stroke="var(--muted)" stroke-width="2"/>${text(x0 + 18, 21, tr(`training rows (${fmt(250)})`, `training rows (${fmt(250)})`), { anchor: 'start', size: 12.5, ...INK })}
<rect x="${x0 + 176}" y="10" width="12" height="12" fill="var(--muted)" stroke="var(--muted)" stroke-width="2"/>${text(x0 + 194, 21, tr(`test rows (${fmt(83)})`, `test rows (${fmt(83)})`), { anchor: 'start', size: 12.5, ...INK })}
${grid}${bars}
${text(x0 - 8, top + H + 60, tr('gap', 'selisih'), { anchor: 'end', ...BOLD, size: 12.5 })}
${text(x0 + W / 2, 290, tr('gap = training minus test, in points', 'selisih = training dikurangi test, dalam poin'), { size: 12 })}`);
}

// ---- Figure 4: class-average body mass by species and sex, with the four mistakes of Model A (Male or female, Split 1). ----
function speciesAndSex() {
  const lo = 3000, hi = 6000, x0 = 120, w = 540;
  const X = v => x0 + (v - lo) / (hi - lo) * w;
  // [species, female average, male average, [[row number, body mass of the mistake]]]
  const rows = [
    ['Adelie', 3368.8, 4043.5, [[38, 3550]]],
    ['Chinstrap', 3527.2, 3939.0, [[344, 3775], [285, 4150]]],
    ['Gentoo', 4679.7, 5484.8, [[178, 5100]]],
  ];
  const ys = [92, 158, 224];
  const body = rows.map(([name, f, m, errs], i) => {
    const y = ys[i];
    return `${text(10, y + 5, name, { anchor: 'start', ...BOLD, size: 14 })}
${line(X(f), y, X(m), y, { c: 'var(--muted)', w: 2, dash: '5 4' })}
${ring(X(f), y, k(1), 8)}${ring(X(m), y, k(0), 8)}
${text(X(f), y + 28, fmt(Math.round(f)), { size: 12 })}${text(X(m), y + 28, fmt(Math.round(m)), { size: 12 })}
${errs.map(([n, v]) => `${diamond(X(v), y, k(3), 9)}${text(X(v), y - 16, `#${fmt(n)}`, { ...BOLD, size: 13 })}`).join('')}`;
  }).join('');
  const ticks = [3000, 4000, 5000, 6000].map(t => `${line(X(t), 258, X(t), 264, { c: 'var(--muted)', w: 1.4 })}${text(X(t), 280, fmt(t), { size: 12 })}`).join('');
  return svg(680, 308, `
${ring(x0, 22, k(1), 7)}${text(x0 + 14, 27, tr('female average', 'rata-rata betina'), { anchor: 'start', size: 12.5, ...INK })}
${ring(x0 + 150, 22, k(0), 7)}${text(x0 + 164, 27, tr('male average', 'rata-rata jantan'), { anchor: 'start', size: 12.5, ...INK })}
${diamond(x0 + 300, 22, k(3), 8)}${text(x0 + 314, 27, tr('a mistake of Model A (row number)', 'kesalahan Model A (nomor baris)'), { anchor: 'start', size: 12.5, ...INK })}
${body}
${line(x0, 258, x0 + w, 258, { c: 'var(--muted)', w: 1.6 })}${ticks}
${text(x0 + w / 2, 298, tr('body mass (g)', 'massa tubuh (g)'), { size: 13, ...INK })}`);
}

export const figures = {
  'six-steps': sixSteps,
  'three-tasks': threeTasks,
  'train-and-test': trainAndTest,
  'species-and-sex': speciesAndSex,
};
