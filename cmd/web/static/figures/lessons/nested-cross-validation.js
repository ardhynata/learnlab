// Figures for the lesson "Nested cross-validation": [[figure:nested-cross-validation/name|Caption]].
//
// Where the numbers come from. Figures are drawn synchronously and cannot fetch the penguin csv, so the
// results of the real runs are constants here, and everything drawn from them is computed.
//  - The data: the 333 penguins with all four measurements and a recorded sex (sims/ml/tabular.js, parseCsv).
//    A "pool" is 100 of them, drawn with shuffle(indices, rng(1000 + r)) from sims/ml/rng.js. The model is k-NN
//    (sims/ml/knn.js, classify) on the four measurements, each scaled with the mean and spread of the
//    training part only. Outer folds are stratifiedKFold(sexOfPool, 5, r + 1) from sims/ml/validation.js
//    (5 folds of 20); the inner folds of outer round i are stratifiedKFold(sexOfTrainingPart, 4, 100 + i).
//    Ties between settings go to the first one listed (smaller k).
//  - OPTIMISM: 200 pools (r = 0 to 199). For each search size the setting list is {5}, {1, 5, 15}, an 8-value
//    list and k = 1 to 30. "Best CV score" is the best 5-fold score over the pool; "nested" is the sum of the
//    outer-fold scores when each outer round picks its own k with the inner loop; "true" is the accuracy,
//    on the 233 penguins left out of the pool, of the model refitted on the whole pool with the setting the
//    plain search picked. SINGLE and NESTED are penguins right out of 200 x 100 = 20,000.
//  - FOLDS: pool r = 15, k in {1, 5, 15} against a decision tree (fitTree in sims/ml/tree.js) with maximum
//    depth 1 to 4 and minimum leaf size 1, both tuned inside the same 5 outer folds. KNN and TREE are the
//    penguins right out of 20 in each outer fold; PICK_K and PICK_DEPTH are what each inner loop chose.
//  - BOOTSTRAP: on that pool 10 penguins are right for k-NN only (+1), 2 for the tree only (-1) and 88 tie (0).
//    The histogram resamples the 100 differences with replacement 2,000 times (the generator below, seed 7).
import { svg, dot, text, line, box, diamond, k, tr, fmt, pct } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const tint = (c, p) => `color-mix(in srgb, ${c} ${p}%, var(--surface))`;

// ---------------------------------------------------------------- 1. the two loops
function layout() {
  const x0 = 40, w = 108, gap = 4, top = 40, h = 44;
  const fx = i => x0 + i * (w + gap);
  const outer = [0, 1, 2, 3, 4].map(i => {
    const test = i === 0;
    return `${box(fx(i), top, w, h, test ? tint(k(3), 40) : tint(k(0), 14), test ? k(3) : k(0))}
${text(fx(i) + w / 2, top + 19, tr(`Fold ${fmt(i + 1)}`, `Fold ${fmt(i + 1)}`), { size: 13.5, ...INK })}
${text(fx(i) + w / 2, top + 36, test ? tr('outer test: 20', 'outer test: 20') : tr('training: 20', 'training: 20'), { size: 12 })}`;
  }).join('');
  const bx1 = fx(1), bx2 = fx(4) + w, cx = (bx1 + bx2) / 2;
  const innerLabels = [0, 1, 2, 3].map(i => {
    const val = i === 0;
    return `${box(fx(i + 1), 142, w, 40, val ? tint(k(1), 40) : tint(k(0), 14), val ? k(1) : k(0))}
${text(fx(i + 1) + w / 2, 160, tr(`Inner fold ${fmt(i + 1)}`, `Inner fold ${fmt(i + 1)}`), { size: 13, ...INK })}
${text(fx(i + 1) + w / 2, 176, val ? tr('validation: 20', 'validation: 20') : tr('training: 20', 'training: 20'), { size: 12 })}`;
  }).join('');
  const chips = [[1, 71], [5, 67], [15, 63]].map(([kk, right], i) => {
    const best = i === 0, x = bx1 + i * 124;
    return `<rect x="${x}" y="226" width="112" height="30" rx="9" fill="${best ? tint(k(1), 40) : 'var(--surface)'}" stroke="${best ? 'var(--ink)' : 'var(--line)'}" stroke-width="${best ? 2.4 : 1.6}"/>
${text(x + 56, 246, `k = ${fmt(kk)}: ${fmt(right)}`, { size: 13.5, ...(best ? INK : { weight: 600 }) })}`;
  }).join('');
  return svg(640, 380, `
${text(x0, 22, tr('Outer loop, round 1 of 5: fold 1 is held out', 'Outer loop, putaran 1 dari 5: fold 1 disisihkan'), { anchor: 'start', size: 14.5, ...INK })}
${outer}
${line(bx1, top + h + 9, bx2, top + h + 9, { c: 'var(--muted)', w: 1.8 })}${line(bx1, top + h + 9, bx1, top + h + 2, { c: 'var(--muted)', w: 1.8 })}${line(bx2, top + h + 9, bx2, top + h + 2, { c: 'var(--muted)', w: 1.8 })}
${line(cx, top + h + 9, cx, 120, { c: 'var(--muted)', w: 2, arrow: true })}
${text(cx - 10, 112, tr('the 80 training penguins go to the inner loop', 'ke-80 penguin training masuk ke inner loop'), { anchor: 'end', size: 12.5 })}
${text(bx1, 136, tr('Inner loop: the 80 are cut again, into 4 inner folds', 'Inner loop: ke-80 penguin dipotong lagi menjadi 4 inner fold'), { anchor: 'start', size: 13.5, ...INK })}
${innerLabels}
${text(bx1, 198, tr('Inner round 1 of 4 is shown: each k is fitted on 3 inner folds', 'Putaran inner 1 dari 4 ditampilkan: tiap k dilatih pada 3 inner fold'), { anchor: 'start', size: 12 })}
${text(bx1, 213, tr('and scored on the 4th. All 4 rounds are added up.', 'dan dinilai pada fold ke-4. Keempat putaran dijumlahkan.'), { anchor: 'start', size: 12 })}
${chips}
${text(x0, 246, tr('Inner scores:', 'Skor inner:'), { anchor: 'start', size: 13, ...INK })}
${text(x0, 262, tr('right out of 80', 'benar dari 80'), { anchor: 'start', size: 12 })}
${line(bx1 + 56, 258, bx1 + 56, 294, { c: 'var(--muted)', w: 2, arrow: true })}
${text(bx1 + 66, 280, tr('keep the highest', 'ambil yang tertinggi'), { anchor: 'start', size: 12 })}
${box(40, 298, 284, 40, 'var(--surface)', 'var(--ink)')}
${text(40 + 142, 323, tr('Fit k = 1 on all 80 training penguins', 'Latih k = 1 pada 80 penguin training'), { size: 12.5, ...INK })}
${line(328, 318, 362, 318, { c: 'var(--muted)', w: 2, arrow: true })}
${box(366, 298, 230, 40, tint(k(3), 40), k(3))}
${text(366 + 115, 323, tr('Score fold 1: 19 of 20 right', 'Nilai fold 1: 19 dari 20 benar'), { size: 12.5, ...INK })}
${text(x0, 362, tr('Fold 1 played no part in choosing k. Repeat for folds 2 to 5, then add up the five scores.', 'Fold 1 tidak ikut memilih k. Ulangi untuk fold 2 sampai 5, lalu jumlahkan skornya.'), { anchor: 'start', size: 12.5 })}`);
}

// ---------------------------------------------------------------- 2. the flattery grows with the search
const SIZES = [1, 3, 8, 30];
const SINGLE = [17811, 17980, 18118, 18251];   // best CV score, penguins right out of 20,000
const NESTED = [17811, 17586, 17645, 17708];   // nested score, penguins right out of 20,000
const TRUTH = [89.2318, 88.4914, 88.6073, 88.7082];     // % right on the 233 left-out penguins, averaged over 200 pools
const POOLS = 200 * 100;

function optimism() {
  const left = 78, right = 596, top = 58, bottom = 262, lo = 86, hi = 92;
  const X = i => left + 40 + i * ((right - left - 80) / (SIZES.length - 1));
  const Y = v => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
  const single = SINGLE.map(v => v / POOLS * 100), nested = NESTED.map(v => v / POOLS * 100);
  const grid = [86, 88, 90, 92].map(v => `${line(left, Y(v), right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, `${fmt(v)}%`, { anchor: 'end', size: 12 })}`).join('');
  const series = (vals, color, dash) => `<path d="M${vals.map((v, i) => `${X(i)} ${Y(v)}`).join('L')}" fill="none" stroke="${color}" stroke-width="2.6" ${dash ? 'stroke-dasharray="7 5"' : ''} stroke-linejoin="round"/>${vals.map((v, i) => dot(X(i), Y(v), color, 5.2)).join('')}`;
  const last = SIZES.length - 1, gap = single[last] - TRUTH[last];
  const xl = X(last) + 24;
  const legend = [[k(3), tr('best CV score: what the search reports', 'skor CV terbaik: yang dilaporkan search'), false], [k(0), tr('nested score', 'skor nested'), false], ['var(--ink)', tr('true accuracy on the 233 penguins left out', 'accuracy sebenarnya pada 233 penguin yang disisihkan'), true]]
    .map(([c, label, dash], i) => `<path d="M${left} ${324 + i * 20}h30" stroke="${c}" stroke-width="2.6" ${dash ? 'stroke-dasharray="7 5"' : ''}/>${dot(left + 15, 324 + i * 20, c, 4.6)}${text(left + 42, 328 + i * 20, label, { anchor: 'start', size: 12.5 })}`).join('');
  return svg(640, 388, `
${text(left, 24, tr('Mean score over 200 pools of 100 penguins', 'Skor rata-rata pada 200 pool berisi 100 penguin'), { anchor: 'start', size: 14.5, ...INK })}
${text(left, 42, tr('k-NN on the penguin sex task; the search picks k', 'k-NN pada tugas jenis kelamin penguin; search memilih k'), { anchor: 'start', size: 12 })}
${grid}
${series(single, k(3))}${series(nested, k(0))}${series(TRUTH, 'var(--ink)', true)}
${SIZES.map((s, i) => text(X(i), bottom + 20, fmt(s), { size: 13, ...INK })).join('')}
${text((left + right) / 2, bottom + 40, tr('settings of k tried by the search', 'pengaturan k yang dicoba search'), { size: 12.5 })}
<path d="M${xl} ${Y(single[last])}h8v${Y(TRUTH[last]) - Y(single[last])}h-8" fill="none" stroke="var(--ink)" stroke-width="1.8"/>
${text(xl + 14, (Y(single[last]) + Y(TRUTH[last])) / 2 - 2, tr(`${fmt(gap, { digits: 1 })} points`, `${fmt(gap, { digits: 1 })} poin`), { anchor: 'start', size: 12.5, ...INK })}
${text(xl + 14, (Y(single[last]) + Y(TRUTH[last])) / 2 + 13, tr('too high', 'terlalu tinggi'), { anchor: 'start', size: 12 })}
${legend}`);
}

// ---------------------------------------------------------------- 3. the same five outer folds, two recipes
const KNN = [19, 17, 17, 18, 18];
const TREE = [18, 15, 15, 16, 17];
const PICK_K = [1, 5, 5, 5, 5];
const PICK_DEPTH = [2, 4, 2, 4, 2];
const FOLD_N = 20;
const sdOf = xs => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); };

function pairedFolds() {
  const left = 140, right = 440, top = 66, rowH = 40, lo = 70, hi = 100;
  const X = v => left + ((v - lo) / (hi - lo)) * (right - left);
  const pk = KNN.map(v => v / FOLD_N * 100), pt = TREE.map(v => v / FOLD_N * 100), diff = pk.map((v, i) => v - pt[i]);
  const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
  const ticks = [70, 80, 90, 100].map(v => `${line(X(v), top - 14, X(v), top + 5 * rowH + 8, { c: 'var(--line)', w: 1 })}${text(X(v), top - 20, `${fmt(v)}%`, { size: 12 })}`).join('');
  const rows = pk.map((v, i) => {
    const y = top + i * rowH + 14;
    return `${text(24, y - 2, tr(`Fold ${fmt(i + 1)}`, `Fold ${fmt(i + 1)}`), { anchor: 'start', size: 13, ...INK })}
${text(24, y + 13, `k = ${fmt(PICK_K[i])} · ${tr('depth', 'depth')} ${fmt(PICK_DEPTH[i])}`, { anchor: 'start', size: 11.5 })}
${line(X(pt[i]), y, X(v), y, { c: 'var(--muted)', w: 2.4 })}${diamond(X(pt[i]), y, k(3), 8)}${dot(X(v), y, k(0), 7)}
${text(548, y + 5, `+${fmt(diff[i])}`, { size: 13.5, ...INK })}`;
  }).join('');
  const my = top + 5 * rowH + 28;
  const m1 = mean(pk), m2 = mean(pt);
  return svg(640, 360, `
${text(24, 22, tr('Penguins right in each outer fold of 20, after tuning inside the fold', 'Penguin benar per outer fold berisi 20, setelah tuning di dalam fold'), { anchor: 'start', size: 14.5, ...INK })}
${text(548, top - 20, tr('k-NN minus tree', 'k-NN dikurangi tree'), { size: 12 })}
${ticks}${rows}
${line(24, my - 14, 600, my - 14, { c: 'var(--line)', w: 1.6 })}
${text(24, my + 5, tr('Mean', 'Rata-rata'), { anchor: 'start', size: 13, ...INK })}
${line(X(m2), my, X(m1), my, { c: 'var(--muted)', w: 3 })}${diamond(X(m2), my, k(3), 9)}${dot(X(m1), my, k(0), 8)}
${text(548, my + 5, `+${fmt(mean(diff))}`, { size: 14, ...INK })}
${text(24, my + 40, tr(`Spread of the fold scores (points): k-NN ${fmt(sdOf(pk), { digits: 1 })}, tree ${fmt(sdOf(pt), { digits: 1 })}, difference ${fmt(sdOf(diff), { digits: 1 })}`, `Simpangan baku skor fold (poin): k-NN ${fmt(sdOf(pk), { digits: 1 })}, tree ${fmt(sdOf(pt), { digits: 1 })}, selisih ${fmt(sdOf(diff), { digits: 1 })}`), { anchor: 'start', size: 12.5 })}
${dot(30, my + 66, k(0), 6)}${text(42, my + 70, 'k-NN', { anchor: 'start', size: 12.5 })}${diamond(102, my + 66, k(3), 7)}${text(116, my + 70, 'Decision tree', { anchor: 'start', size: 12.5 })}
${text(220, my + 70, tr('Each pair uses the same 20 penguins.', 'Tiap pasangan memakai 20 penguin yang sama.'), { anchor: 'start', size: 12.5 })}`);
}

// ---------------------------------------------------------------- 4. bootstrap interval of the difference
// The same small seeded generator the labs use (sims/ml/rng.js), inlined so this file needs no import.
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
}
const ONLY_KNN = 10, ONLY_TREE = 2, TOTAL = 100, DRAWS = 2000;
// One difference per penguin: +1 where only k-NN is right, -1 where only the tree is right, 0 otherwise.
const DIFFS = [...Array(ONLY_KNN).fill(1), ...Array(ONLY_TREE).fill(-1), ...Array(TOTAL - ONLY_KNN - ONLY_TREE).fill(0)];
function bootstrapMeans(seed = 7) {
  const r = lcg(seed), means = [];
  for (let b = 0; b < DRAWS; b++) { let s = 0; for (let j = 0; j < TOTAL; j++) s += DIFFS[Math.floor(r() * TOTAL)]; means.push(s); }
  return means.sort((a, b) => a - b); // each value is already in points: a sum of 100 differences over 100 penguins x 100
}

function bootstrapDifference() {
  const means = bootstrapMeans();
  const lo = means[Math.floor(0.025 * DRAWS)], hi = means[Math.ceil(0.975 * DRAWS) - 1];
  const observed = DIFFS.reduce((a, b) => a + b, 0);
  const min = -4, max = 24, bins = max - min + 1;
  const counts = Array(bins).fill(0);
  means.forEach(m => { const i = m - min; if (i >= 0 && i < bins) counts[i]++; });
  const left = 50, right = 600, top = 62, base = 244, bw = (right - left) / bins, peak = Math.max(...counts);
  const X = v => left + (v - min) * bw, H = c => (c / peak) * (base - top - 16);
  const bars = counts.map((c, i) => { const v = i + min, inside = v >= lo && v <= hi; return `<rect x="${(left + i * bw + 1).toFixed(2)}" y="${(base - H(c)).toFixed(2)}" width="${(bw - 2).toFixed(2)}" height="${H(c).toFixed(2)}" fill="${inside ? tint(k(0), 55) : tint(k(0), 18)}" stroke="${k(0)}" stroke-width="0.8"/>`; }).join('');
  const ticks = [-4, 0, 4, 8, 12, 16, 20, 24].map(v => text(X(v) + bw / 2, base + 18, `${v > 0 ? '+' : ''}${fmt(v)}`, { size: 12 })).join('');
  return svg(640, 336, `
${text(left, 22, tr('Bootstrap: 2,000 resamples of the 100 penguins', 'Bootstrap: 2.000 resample dari 100 penguin'), { anchor: 'start', size: 14.5, ...INK })}
${text(left, 40, tr('mean difference, k-NN minus tree, in points', 'selisih rata-rata, k-NN dikurangi tree, dalam poin'), { anchor: 'start', size: 12 })}
${bars}${line(left, base, right, base, { c: 'var(--line)', w: 1.6 })}${ticks}
${line(X(0) + bw / 2, top + 10, X(0) + bw / 2, base, { c: 'var(--ink)', w: 2, dash: '6 5' })}
${text(X(0) + bw / 2, top + 4, tr('0 = no difference', '0 = tidak ada selisih'), { size: 12.5, ...INK })}
${line(X(observed) + bw / 2, top + 10, X(observed) + bw / 2, base, { c: k(3), w: 3 })}
${text(X(observed) + bw / 2 + 8, top + 22, tr(`this pool: +${fmt(observed)}`, `pool ini: +${fmt(observed)}`), { anchor: 'start', size: 12.5, ...INK })}
${line(X(lo) + bw / 2, base + 34, X(hi) + bw / 2, base + 34, { c: 'var(--ink)', w: 3 })}${line(X(lo) + bw / 2, base + 28, X(lo) + bw / 2, base + 40, { c: 'var(--ink)', w: 3 })}${line(X(hi) + bw / 2, base + 28, X(hi) + bw / 2, base + 40, { c: 'var(--ink)', w: 3 })}
${text((X(lo) + X(hi)) / 2 + bw / 2, base + 58, tr(`95% of the resamples: +${fmt(lo)} to +${fmt(hi)} points`, `95% resample: +${fmt(lo)} sampai +${fmt(hi)} poin`), { size: 13, ...INK })}
${text(24, 326, tr('Dark bars are the middle 95%. Zero lies outside them.', 'Batang gelap adalah 95% bagian tengah. Nol berada di luar batang itu.'), { anchor: 'start', size: 12.5 })}`);
}

export const figures = { 'nested-layout': layout, 'optimism': optimism, 'paired-folds': pairedFolds, 'bootstrap-difference': bootstrapDifference };
