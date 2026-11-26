// Figures for the lesson "Reproducible pipelines". The numbers come from one place each:
//  - fold-statistics: the first six rows of data/penguins.csv (body mass 3750, 3800, 3250, NA, 3450, 3650),
//    three folds of two rows; each round fits a median imputer and a standardizer (population standard
//    deviation, after the gap is filled) on its four training rows. Computed below, not typed in.
//  - seed-spread: mean 5-fold stratified accuracy (percent) of "predict sex" on the 333 penguins that have
//    all four measurements and a sex, for the fold-shuffle seeds 1 to 10 (stratifiedKFold in
//    sims/ml/validation.js; k-NN with k = 5 and logistic regression, each with a scaler fitted on the training
//    folds). Pasted from one run of that code; the lesson text quotes the same ranges.
import { svg, dot, ring, diamond, text, line, box, k, soft, tr, fmt } from '../kit.js';

const ink = { weight: 700, fill: 'var(--ink)' };

// 1. One round of cross-validation: fit the five steps on the training folds, apply them to the held-out fold.
function pipelineInFolds() {
  const steps = [
    [tr('Impute', 'Isi kosong'), tr('median', 'median')],
    [tr('Encode', 'Encode'), tr('categories', 'kategori')],
    [tr('Scale', 'Scale'), tr('mean, sd', 'rata-rata, sd')],
    [tr('Select', 'Seleksi'), tr('columns', 'kolom')],
    [tr('Model', 'Model'), tr('weights', 'bobot')],
  ];
  const X0 = 20, LW = 118, SW = 92, G = 10, RW = 96;
  const sx = i => X0 + LW + 16 + i * (SW + G);
  const endX = sx(4) + SW;
  const rx = endX + 16;
  const rowTop = [62, 186], H = 58;
  const left = (y, label, sub, c) => `${box(X0, y, LW, H, soft(c), k(c))}${text(X0 + LW / 2, y + 25, label, { ...ink, size: 13 })}${text(X0 + LW / 2, y + 44, sub, { size: 12, fill: 'var(--ink)' })}`;
  const row = (y, fitted) => steps.map(([name, what], i) => `${box(sx(i), y, SW, H, fitted ? 'var(--accent-soft)' : 'var(--surface)', fitted ? 'var(--accent)' : 'var(--line)')}${text(sx(i) + SW / 2, y + 25, name, { ...ink, size: 13 })}${text(sx(i) + SW / 2, y + 44, what, { size: 11 })}`).join('')
    + steps.slice(0, -1).map((_, i) => line(sx(i) + SW + 1, y + H / 2, sx(i + 1) - 2, y + H / 2, { c: 'var(--muted)', w: 2, arrow: true })).join('');
  const learned = [0, 1, 2, 3, 4].map(i => line(sx(i) + SW / 2, rowTop[0] + H + 2, sx(i) + SW / 2, rowTop[1] - 3, { c: 'var(--accent)', w: 2, dash: '5 4', arrow: true })).join('');
  return svg(760, 306, `
${text(X0, 24, tr(`Round ${fmt(3)} of ${fmt(5)}-fold cross-validation`, `Putaran ${fmt(3)} dari cross-validation ${fmt(5)} fold`), { anchor: 'start', ...ink, size: 14 })}
${left(rowTop[0], tr('Training folds', 'Fold latih'), `${fmt(1)}, ${fmt(2)}, ${fmt(4)}, ${fmt(5)}`, 0)}${line(X0 + LW + 1, rowTop[0] + H / 2, sx(0) - 2, rowTop[0] + H / 2, { c: 'var(--muted)', w: 2, arrow: true })}
${row(rowTop[0], true)}${line(endX + 1, rowTop[0] + H / 2, rx - 2, rowTop[0] + H / 2, { c: 'var(--muted)', w: 2, arrow: true })}
${box(rx, rowTop[0], RW, H, soft(0), k(0))}${text(rx + RW / 2, rowTop[0] + 25, tr('Fitted', 'Pipeline'), { ...ink, size: 13 })}${text(rx + RW / 2, rowTop[0] + 44, tr('pipeline', 'terlatih'), { size: 12, fill: 'var(--ink)' })}
${text(sx(2) + SW / 2, rowTop[0] - 10, tr('fit: every step learns from these rows only', 'fit: tiap langkah belajar hanya dari baris ini'), { size: 12, fill: 'var(--accent)', weight: 700 })}
${learned}${text(sx(4) + SW / 2 + 10, 158, tr('learned numbers', 'angka yang dipelajari'), { anchor: 'start', size: 11 })}
${left(rowTop[1], tr('Held-out fold', 'Fold uji'), fmt(3), 1)}${line(X0 + LW + 1, rowTop[1] + H / 2, sx(0) - 2, rowTop[1] + H / 2, { c: 'var(--muted)', w: 2, arrow: true })}
${row(rowTop[1], false)}${line(endX + 1, rowTop[1] + H / 2, rx - 2, rowTop[1] + H / 2, { c: 'var(--muted)', w: 2, arrow: true })}
${box(rx, rowTop[1], RW, H, soft(1), k(1))}${text(rx + RW / 2, rowTop[1] + 25, tr('Score', 'Skor'), { ...ink, size: 13 })}${text(rx + RW / 2, rowTop[1] + 44, tr(`on fold ${fmt(3)}`, `pada fold ${fmt(3)}`), { size: 12, fill: 'var(--ink)' })}
${text(sx(2) + SW / 2, rowTop[1] + H + 20, tr('apply: the same steps, numbers frozen, nothing relearned', 'terapkan: langkah yang sama, angka tetap, tidak ada yang dipelajari ulang'), { size: 12, fill: 'var(--ink)', weight: 700 })}
${text(380, 294, tr('Round 4 starts from nothing: every step is fitted again.', 'Putaran 4 mulai dari nol: setiap langkah di-fit lagi.'), { size: 12 })}`);
}

// 2. The six penguins of the worked example in each of the three rounds.
const MASSES = [3750, 3800, 3250, null, 3450, 3650];
const FOLDS = [[0, 1], [2, 3], [4, 5]];
const median = v => { const s = [...v].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const mean = v => v.reduce((a, b) => a + b, 0) / v.length;
function fitRound(heldOut) {
  const training = MASSES.filter((_, j) => !heldOut.includes(j));
  const med = median(training.filter(v => v !== null));
  return mean(training.map(v => (v === null ? med : v)));
}
function foldStatistics() {
  const W = 760, H = 372, x0 = 150, x1 = 720, lo = 3200, hi = 3850;
  const X = v => x0 + (v - lo) * (x1 - x0) / (hi - lo);
  const allFilled = MASSES.map(v => (v === null ? median(MASSES.filter(a => a !== null)) : v));
  const leaky = mean(allFilled);
  const rows = FOLDS.map((held, r) => {
    const y = 108 + r * 86;
    const m = fitRound(held);
    const pts = MASSES.map((v, j) => {
      if (v === null) return '';
      const isHeld = held.includes(j);
      return `${isHeld ? ring(X(v), y, k(1), 6) : dot(X(v), y, k(0), 6)}${text(X(v), y - 14, fmt(v), { size: 11, fill: 'var(--ink)' })}`;
    }).join('');
    return `${text(14, y + 4, tr(`Round ${fmt(r + 1)}`, `Putaran ${fmt(r + 1)}`), { anchor: 'start', ...ink, size: 13 })}
${line(x0 - 10, y, x1 + 10, y, { w: 1.6 })}${pts}
${diamond(X(m), y + 27, k(2), 8)}${text(X(m) + (m > leaky ? -4 : 4), y + 52, tr(`scaler mean ${fmt(m)}`, `rata-rata scaler ${fmt(m)}`), { anchor: m > leaky ? 'start' : 'end', size: 11, fill: 'var(--ink)' })}`;
  }).join('');
  return svg(W, H, `
${text(14, 22, tr('Body mass (g) of the six penguins; the scaler mean each round learns', 'Massa tubuh (g) enam penguin; rata-rata scaler yang dipelajari tiap putaran'), { anchor: 'start', ...ink, size: 14 })}
${line(X(leaky), 54, X(leaky), 330, { c: 'var(--muted)', w: 2, dash: '6 5' })}
${text(X(leaky), 46, tr(`mean of all six (fitted before the split): ${fmt(leaky, { max: 2 })}`, `rata-rata keenam penguin (di-fit sebelum split): ${fmt(leaky, { max: 2 })}`), { size: 12, fill: 'var(--ink)', weight: 700 })}
${rows}
${dot(160, H - 14, k(0), 5)}${text(171, H - 10, tr('training penguin', 'penguin latih'), { anchor: 'start', size: 12 })}${ring(300, H - 14, k(1), 5)}${text(311, H - 10, tr('held-out penguin', 'penguin uji'), { anchor: 'start', size: 12 })}${diamond(450, H - 14, k(2), 6)}${text(463, H - 10, tr('scaler mean of the round', 'rata-rata scaler putaran itu'), { anchor: 'start', size: 12 })}`);
}

// 3. Ten seeds, two models: the mean 5-fold accuracy (percent) of each.
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const KNN5 = [90.96, 90.09, 90.68, 90.99, 91.89, 91.00, 91.58, 91.29, 90.68, 91.61];
const LOGIT = [88.59, 88.60, 88.91, 88.59, 88.58, 88.60, 88.87, 89.50, 88.90, 88.60];
function seedSpread() {
  const W = 700, H = 340, left = 64, right = 24, top = 44, bottom = 262, lo = 88, hi = 92.5;
  const X = i => left + 20 + i * (W - left - right - 40) / (SEEDS.length - 1), Y = v => bottom - (v - lo) / (hi - lo) * (bottom - top);
  const grid = [88, 89, 90, 91, 92].map(v => `${line(left, Y(v), W - right, Y(v), { w: 1 })}${text(left - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 11 })}`).join('');
  const band = (vals, c) => {
    const a = Math.min(...vals), b = Math.max(...vals);
    return `<rect x="${left}" y="${Y(b)}" width="${W - left - right}" height="${Y(a) - Y(b)}" fill="${soft(c)}" opacity="0.7"/>`;
  };
  const series = (vals, c, shape) => vals.map((v, i) => (shape === 'dot' ? dot(X(i), Y(v), c, 6) : diamond(X(i), Y(v), c, 7))).join('');
  const lo1 = Math.min(...KNN5), hi1 = Math.max(...KNN5), lo2 = Math.min(...LOGIT), hi2 = Math.max(...LOGIT);
  return svg(W, H, `
${text(left, 22, tr('Mean 5-fold accuracy (%) for ten seeds of the fold shuffle', 'Akurasi rata-rata 5 fold (%) untuk sepuluh seed pengacakan fold'), { anchor: 'start', ...ink, size: 14 })}
${band(KNN5, 0)}${band(LOGIT, 1)}${grid}${line(left, bottom, W - right, bottom, { c: 'var(--muted)', w: 1.6 })}
${series(KNN5, k(0), 'dot')}${series(LOGIT, k(1), 'diamond')}
${text(W - right - 4, Y(hi1) - 8, tr(`k-NN, k = ${fmt(5)}: ${fmt(lo1, { digits: 1 })} to ${fmt(hi1, { digits: 1 })}`, `k-NN, k = ${fmt(5)}: ${fmt(lo1, { digits: 1 })} sampai ${fmt(hi1, { digits: 1 })}`), { anchor: 'end', size: 12, fill: k(0), weight: 700 })}
${text(W - right - 4, Y(lo2) + 24, tr(`logistic regression: ${fmt(lo2, { digits: 1 })} to ${fmt(hi2, { digits: 1 })}`, `regresi logistik: ${fmt(lo2, { digits: 1 })} sampai ${fmt(hi2, { digits: 1 })}`), { anchor: 'end', size: 12, fill: k(1), weight: 700 })}
${SEEDS.map((s, i) => text(X(i), bottom + 18, fmt(s), { size: 11 })).join('')}${text((left + W - right) / 2, bottom + 38, tr('seed of the fold shuffle', 'seed pengacakan fold'), { size: 12 })}
${text((left + W - right) / 2, H - 12, tr(`k-NN is ahead for every seed, by ${fmt(1.5)} to ${fmt(3.3)} points`, `k-NN unggul di setiap seed, sebesar ${fmt(1.5)} sampai ${fmt(3.3)} poin`), { size: 12, fill: 'var(--ink)' })}`);
}

export const figures = { 'pipeline-in-folds': pipelineInFolds, 'fold-statistics': foldStatistics, 'seed-spread': seedSpread };
