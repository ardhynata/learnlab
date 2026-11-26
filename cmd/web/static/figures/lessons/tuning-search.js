// Figures for the lesson "Tuning with search": [[figure:tuning-search/name|Caption]].
//
// Where the numbers come from. Figures are drawn synchronously and cannot fetch the penguin csv, so the
// results of the real runs are constants here, and everything drawn from them is computed.
//  - Penguins: the 333 penguins with all four measurements and a recorded sex, cut with splitIndices()
//    (stratified by sex, seed 4) as in the lesson "Depth and leaf size". The 66 test penguins stay locked
//    away; the other 267 (200 training + 67 validation) are the tuning data. The score of a setting is the
//    number of those 267 penguins answered correctly in five-fold stratified cross-validation
//    (stratifiedKFold(labels, 5, 1) from sims/ml/validation.js), with a tree from fitTree() in sims/ml/tree.js
//    (Gini, maxDepth and minLeaf as given) predicting male or female from the four measurements.
//  - SCORES: gridSearch({ depth: 1..8, leaf: 1..20 }) over all 160 settings, fold seed 1. Ties keep the first.
//  - NESTED: the 9-setting grid depth {2, 4, 6} x leaf {1, 10, 20}, outer folds stratifiedKFold(labels, 5, 1),
//    inner folds stratifiedKFold(training part, 4, 100 + round - 1). Each entry is [depth, leaf, right, size]:
//    the setting the inner search picked and how many of the outer test penguins it got right.
//  - GUESSERS and the made-up surface are pure arithmetic, computed below.
import { svg, dot, text, line, diamond, k, tr, fmt, pct } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const N = 267;
const DEPTHS = [1, 2, 3, 4, 5, 6, 7, 8];
// Rows are maximum depth 1..8, columns are minimum leaf size 1..20: penguins right out of 267.
const SCORES = [
  [168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168],
  [218, 218, 218, 218, 218, 218, 218, 218, 218, 217, 218, 218, 218, 214, 214, 214, 214, 215, 215, 213],
  [221, 220, 220, 217, 217, 218, 220, 220, 220, 218, 219, 219, 220, 216, 216, 216, 216, 217, 217, 215],
  [232, 233, 233, 231, 228, 227, 229, 229, 227, 225, 226, 225, 226, 222, 225, 225, 225, 226, 226, 224],
  [227, 227, 228, 227, 225, 224, 226, 226, 224, 221, 222, 221, 222, 222, 225, 225, 225, 226, 226, 224],
  [233, 232, 232, 227, 224, 224, 226, 226, 224, 221, 222, 221, 222, 222, 225, 225, 225, 226, 226, 224],
  [232, 234, 235, 230, 224, 224, 226, 226, 224, 221, 222, 221, 222, 222, 225, 225, 225, 226, 226, 224],
  [232, 234, 235, 230, 224, 224, 226, 226, 224, 221, 222, 221, 222, 222, 225, 225, 225, 226, 226, 224],
];
const GRID9 = { depth: [2, 4, 6], leaf: [1, 10, 20] };
const NESTED = [[6, 1, 50, 54], [6, 10, 47, 54], [4, 10, 44, 53], [6, 1, 47, 53], [6, 1, 40, 53]];

const tint = (pctOfAccent) => `color-mix(in srgb, ${k(0)} ${pctOfAccent.toFixed(1)}%, var(--surface))`;

// ---------------------------------------------------------------- 1. grid against random (made up)
// A made-up score surface: the first setting (x) decides almost everything, with one peak; the second (y)
// adds at most 0.02. Scores run from 0.60 to about 0.92.
const PEAK = 0.58;
const surface = (x, y) => 0.60 + 0.30 * Math.exp(-(((x - PEAK) / 0.14) ** 2)) + 0.02 * y;
// The same small seeded generator the labs use (sims/ml/rng.js), inlined so this file needs no import.
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
}

function gridVsRandom() {
  const w = 220, h = 170, top = 52, panels = [
    { ox: 52, title: tr('Grid search: 3 x 3 = 9 trials', 'Grid search: 3 x 3 = 9 percobaan'), points: [1 / 6, 3 / 6, 5 / 6].flatMap(x => [1 / 6, 3 / 6, 5 / 6].map(y => [x, y])) },
    { ox: 368, title: tr('Random search: 9 trials', 'Random search: 9 percobaan'), points: (() => { const r = lcg(1); return Array.from({ length: 9 }, () => { const x = r(), y = r(); return [x, y]; }); })() },
  ];
  const X = (ox, x) => ox + x * w, Y = y => top + h - y * h;
  const body = panels.map(({ ox, title, points }) => {
    const scored = points.map(([x, y]) => ({ x, y, s: surface(x, y) }));
    const best = scored.reduce((b, p) => (p.s > b.s ? p : b), scored[0]);
    const distinct = new Set(points.map(([x]) => x.toFixed(6))).size;
    let bg = '';
    const cols = 44;
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) / cols, bump = (surface(x, 0) - 0.60) / 0.30;
      bg += `<rect x="${(ox + c * w / cols).toFixed(2)}" y="${top}" width="${(w / cols + 0.5).toFixed(2)}" height="${h}" fill="${tint(6 + 54 * bump)}"/>`;
    }
    const base = top + h + 62;
    const ticks = [...new Set(points.map(([x]) => x))].map(x => line(X(ox, x), base - 8, X(ox, x), base + 8, { c: 'var(--ink)', w: 2.4 })).join('');
    return `${text(ox + w / 2, 22, title, { size: 14.5, ...INK })}
${bg}<rect x="${ox}" y="${top}" width="${w}" height="${h}" fill="none" stroke="var(--line)" stroke-width="1.6"/>
${scored.map(p => dot(X(ox, p.x), Y(p.y), 'var(--ink)', 4.6)).join('')}${diamond(X(ox, best.x), Y(best.y), k(3), 8.5)}
${text(ox + w / 2, top + h + 18, tr('first setting (the one that matters)', 'pengaturan pertama (yang penting)'), { size: 12 })}
<text transform="translate(${ox - 14} ${top + h / 2}) rotate(-90)" text-anchor="middle" font-size="12" font-weight="500" fill="var(--muted)">${tr('second setting (barely matters)', 'pengaturan kedua (kurang penting)')}</text>
${line(ox, base, ox + w, base, { c: 'var(--line)', w: 1.6 })}${ticks}
${text(ox + w / 2, base + 28, tr(`${fmt(distinct)} different values of the first setting tried`, `${fmt(distinct)} nilai pengaturan pertama dicoba`), { size: 12.5, ...INK })}
${text(ox + w / 2, base + 46, tr(`best score found: ${fmt(best.s, { digits: 2 })}`, `skor terbaik: ${fmt(best.s, { digits: 2 })}`), { size: 12.5, ...INK })}`;
  }).join('');
  return svg(640, 388, `${body}
${diamond(54, 360, k(3), 7)}${text(68, 364, tr('best trial', 'percobaan terbaik'), { anchor: 'start', size: 12 })}${text(54, 382, tr('Made-up scores, for illustration only. Darker shading = better score.', 'Skor rekaan, hanya untuk ilustrasi. Warna lebih gelap = skor lebih baik.'), { anchor: 'start', size: 12 })}`);
}

// ---------------------------------------------------------------- 2. the real penguin surface
function penguinGrid() {
  const left = 84, top = 40, cw = 24, ch = 22, cols = 20;
  const lo = 205, hi = 235, shade = v => 6 + 54 * Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  const best = Math.max(...SCORES.flat());
  const cell = (d, l) => ({ x: left + (l - 1) * cw, y: top + (d - 1) * ch, v: SCORES[d - 1][l - 1] });
  const onGrid = (d, l) => GRID9.depth.includes(d) && GRID9.leaf.includes(l);
  let cells = '', marks = '';
  DEPTHS.forEach(d => {
    for (let l = 1; l <= cols; l++) {
      const c = cell(d, l);
      cells += `<rect x="${c.x}" y="${c.y}" width="${cw}" height="${ch}" fill="${tint(shade(c.v))}" stroke="var(--surface)" stroke-width="1"/>`;
      if (c.v === best) marks += `<rect x="${c.x + 1}" y="${c.y + 1}" width="${cw - 2}" height="${ch - 2}" fill="none" stroke="${k(3)}" stroke-width="3"/>`;
      if (onGrid(d, l)) marks += `<rect x="${c.x + 2}" y="${c.y + 2}" width="${cw - 4}" height="${ch - 4}" rx="5" fill="none" stroke="var(--ink)" stroke-width="2"/>${text(c.x + cw / 2, c.y + ch / 2 + 4, fmt(c.v), { size: 10, ...INK })}`;
    }
  });
  const bottom = top + DEPTHS.length * ch;
  const rowLabels = DEPTHS.map(d => text(left - 8, top + (d - 1) * ch + ch / 2 + 4, fmt(d), { anchor: 'end', size: 12 })).join('');
  const colLabels = [1, 5, 10, 15, 20].map(l => text(left + (l - 1) * cw + cw / 2, bottom + 16, fmt(l), { size: 12 })).join('');
  const sw = Array.from({ length: 7 }, (_, i) => `<rect x="${left + i * 24}" y="${bottom + 56}" width="24" height="14" fill="${tint(6 + 54 * i / 6)}"/>`).join('');
  return svg(640, 352, `
${text(left + cols * cw / 2, 20, tr('Penguins right out of 267, five-fold cross-validation, all 160 settings', 'Penguin yang benar dari 267, cross-validation lima fold, ke-160 pengaturan'), { size: 13.5, ...INK })}
${cells}${marks}${rowLabels}${colLabels}
<rect x="${left}" y="${top}" width="${cols * cw}" height="${DEPTHS.length * ch}" fill="none" stroke="var(--line)" stroke-width="1.6"/>
${text(left + cols * cw / 2, bottom + 36, tr('minimum leaf size', 'ukuran leaf minimum'), { size: 13 })}
<text transform="translate(18 ${top + DEPTHS.length * ch / 2}) rotate(-90)" text-anchor="middle" font-size="13" font-weight="500" fill="var(--muted)">${tr('maximum depth', 'kedalaman maksimum')}</text>
${sw}${text(left - 6, bottom + 68, `≤ ${fmt(lo)}`, { anchor: 'end', size: 12 })}${text(left + 7 * 24 + 6, bottom + 68, tr(`${fmt(hi)} right`, `${fmt(hi)} benar`), { anchor: 'start', size: 12 })}
<rect x="${left + 280}" y="${bottom + 54}" width="16" height="16" rx="5" fill="none" stroke="var(--ink)" stroke-width="2"/>${text(left + 304, bottom + 67, tr('the 9 settings of a grid (score inside)', '9 pengaturan sebuah grid (skor di dalam)'), { anchor: 'start', size: 12 })}
<rect x="${left + 280}" y="${bottom + 78}" width="16" height="16" fill="none" stroke="${k(3)}" stroke-width="3"/>${text(left + 304, bottom + 91, tr(`best of all 160: ${fmt(best)} right (${pct(best / N)})`, `terbaik dari 160: ${fmt(best)} benar (${pct(best / N)})`), { anchor: 'start', size: 12 })}
${text(left, bottom + 91, tr('Depth 1 scores the same at every leaf size.', 'Kedalaman 1 sama skornya di semua ukuran leaf.'), { anchor: 'start', size: 12 })}`);
}

// ---------------------------------------------------------------- 3. the best of many guessers
// A guesser flips a fair coin for every example, so its true accuracy is 50%. On n examples its number
// right is Binomial(n, 0.5). The best of g independent guessers has expected accuracy sum_t t/n * (F(t)^g - F(t-1)^g)
// where F is the binomial cdf.
function bestOfGuessers(n, g) {
  const pmf = [];
  let c = 1;
  for (let t = 0; t <= n; t++) { pmf.push(c / 2 ** n); c = c * (n - t) / (t + 1); }
  let cdf = 0, prev = 0, expect = 0;
  for (let t = 0; t <= n; t++) { cdf += pmf[t]; expect += (t / n) * (cdf ** g - prev ** g); prev = cdf; }
  return expect;
}

function guessers() {
  const n = 50, counts = [1, 5, 20, 100];
  const left = 70, right = 612, base = 232, topY = 56, lo = 0.5, hi = 0.7;
  const Y = a => base - (a - lo) / (hi - lo) * (base - topY);
  const slot = (right - left) / counts.length, bw = 82;
  const bars = counts.map((g, i) => {
    const a = bestOfGuessers(n, g), x = left + slot * i + (slot - bw) / 2;
    return `<rect x="${x}" y="${Y(a)}" width="${bw}" height="${Math.max(base - Y(a), 1.5)}" rx="4" fill="${k(3)}"/>
${text(x + bw / 2, Y(a) - 8, pct(a), { size: 14, ...INK })}
${text(x + bw / 2, base + 20, fmt(g), { size: 13, ...INK })}`;
  }).join('');
  const yTicks = [0.5, 0.55, 0.6, 0.65, 0.7].map(v => `${line(left, Y(v), right, Y(v), { c: 'var(--line)', w: v === 0.5 ? 2 : 1, dash: v === 0.5 ? '5 5' : null })}${text(left - 8, Y(v) + 4, pct(v, 0), { anchor: 'end', size: 12 })}`).join('');
  return svg(640, 300, `
${text(left, 16, tr(`Every guesser flips a coin, so its true accuracy is ${pct(0.5, 0)}.`, `Setiap penebak melempar koin, jadi accuracy sebenarnya ${pct(0.5, 0)}.`), { anchor: 'start', size: 13, ...INK })}
${text(left, 33, tr(`Each one is scored on the same ${fmt(n)} examples; the dashed line is ${pct(0.5, 0)}.`, `Semuanya diuji pada ${fmt(n)} contoh yang sama; garis putus-putus = ${pct(0.5, 0)}.`), { anchor: 'start', size: 12.5 })}
${yTicks}${bars}
${line(left, base, right, base, { c: 'var(--muted)', w: 1.6 })}
${text((left + right) / 2, base + 42, tr('number of guessers (settings tried)', 'jumlah penebak (pengaturan yang dicoba)'), { size: 13 })}
<text transform="translate(16 ${(topY + base) / 2}) rotate(-90)" text-anchor="middle" font-size="13" font-weight="500" fill="var(--muted)">${tr('expected score of the best one', 'skor yang diharapkan dari yang terbaik')}</text>`);
}

// ---------------------------------------------------------------- 4. nested cross-validation
function nested() {
  const left = 76, bw = 62, gap = 5, bh = 28, top = 50, step = 36, rowsN = NESTED.length;
  const heads = [0, 1, 2, 3, 4].map(c => text(left + c * (bw + gap) + bw / 2, top - 9, tr(`fold ${fmt(c + 1)}`, `fold ${fmt(c + 1)}`), { size: 12, ...INK })).join('');
  let total = 0, size = 0;
  const rows = NESTED.map(([d, l, right, n], g) => {
    total += right; size += n;
    const y = top + g * step;
    const blocks = [0, 1, 2, 3, 4].map(c => {
      const held = c === g, x = left + c * (bw + gap);
      return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="6" fill="${held ? tint(54) : 'var(--surface)'}" stroke="${held ? k(0) : 'var(--line)'}" stroke-width="${held ? 2.2 : 1.4}"/>${text(x + bw / 2, y + 18.5, held ? tr('score', 'dinilai') : tr('search', 'search'), { size: 12, fill: held ? 'var(--ink)' : 'var(--muted)', weight: held ? 700 : 500 })}`;
    }).join('');
    return `${text(left - 8, y + 18.5, tr(`Round ${fmt(g + 1)}`, `Putaran ${fmt(g + 1)}`), { anchor: 'end', size: 12 })}${blocks}
${text(left + 5 * (bw + gap) + 6, y + 12.5, tr(`picks depth ${fmt(d)}, leaf ${fmt(l)}`, `memilih kedalaman ${fmt(d)}, leaf ${fmt(l)}`), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${text(left + 5 * (bw + gap) + 6, y + 27, tr(`${fmt(right)} of ${fmt(n)} right`, `${fmt(right)} dari ${fmt(n)} benar`), { anchor: 'start', size: 12, ...INK })}`;
  }).join('');
  const yEnd = top + rowsN * step + 10;
  return svg(640, yEnd + 66, `
${text(left, 20, tr('Each round: the whole search runs inside the "search" folds, on its own 4-fold CV.', 'Tiap putaran: seluruh pencarian berjalan di fold "search", dengan CV 4 fold sendiri.'), { anchor: 'start', size: 12.5 })}
${heads}${rows}
${line(left, yEnd - 4, left + 5 * (bw + gap) - gap, yEnd - 4, { c: 'var(--muted)', w: 1.4, dash: '4 5' })}
${text(left, yEnd + 18, tr(`Add up: ${fmt(total)} of ${fmt(size)} right, so the nested score is ${pct(total / size)}`, `Jumlahkan: ${fmt(total)} dari ${fmt(size)} benar, jadi skor nested-nya ${pct(total / size)}`), { anchor: 'start', size: 13.5, ...INK })}
${text(left, yEnd + 40, tr(`The same 9 settings, one level of 5-fold CV: ${fmt(233)} of ${fmt(size)}, ${pct(233 / size)}`, `Ke-9 pengaturan yang sama, satu tingkat CV 5 fold: ${fmt(233)} dari ${fmt(size)}, ${pct(233 / size)}`), { anchor: 'start', size: 12.5 })}`);
}

export const figures = { 'grid-vs-random': gridVsRandom, 'penguin-grid': penguinGrid, 'best-of-many': guessers, 'nested': nested };
