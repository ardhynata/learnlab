// Figures for the lesson "Cross-validation and stratification":
// [[figure:cross-validation-and-stratification/name|Caption]].
//
// Every number is a measurement on the bundled penguins (data/penguins.csv), made once with the
// helpers in sims/ml/validation.js and sims/ml/knn.js and written down here, because a figure is
// drawn synchronously and cannot load the csv. The setup, as the lesson describes it:
//   - the 333 penguins with four size measurements and a recorded sex, shuffled with rng(1);
//     the first 83 are the test set, the other 250 are the pool ("pool" below);
//   - a 5-nearest-neighbors (or 1 or 15) vote on the four sizes, each standardized with the
//     mean and spread of the training part only, predicting sex;
//   - HOLD_OUT: 20 plain hold-outs, the first fold of kFold(250, 5, seed) for seed 1 to 20
//     (50 held out, 200 trained on), scored as correct out of 50;
//   - FOLD_SCORES: kFold(250, 5, 1), correct out of 50 in each of the five folds;
//   - CV_MEANS: the mean fold accuracy (%) of kFold(250, 5, seed) for seed 1 to 20;
//   - CHINSTRAP: 342 penguins with measurements, 68 of them Chinstrap, in 5 folds: kFold(342, 5, 2)
//     against stratifiedKFold(species, 5, seed), whose counts are the same for every seed.
import { svg, dot, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };

const HOLD_OUT = [42, 45, 46, 44, 47, 48, 45, 44, 45, 45, 44, 49, 47, 43, 47, 43, 46, 46, 40, 42];
const FOLD_SCORES = [42, 43, 48, 43, 44];
const CV_MEANS = {
  1: [85.2, 85.2, 84.4, 84.4, 83.2, 82.8, 85.2, 83.2, 86.4, 83.2, 84.4, 84.0, 85.2, 84.4, 84.0, 82.8, 84.4, 84.8, 84.0, 82.4],
  5: [88.0, 90.8, 91.2, 88.4, 89.6, 90.8, 90.4, 88.4, 88.8, 88.8, 90.0, 90.4, 90.8, 88.4, 90.4, 90.4, 90.4, 89.6, 89.6, 90.0],
  15: [91.2, 90.8, 92.0, 91.6, 89.6, 93.2, 92.0, 90.8, 92.8, 89.6, 91.6, 89.2, 89.6, 92.4, 92.0, 91.2, 92.8, 92.8, 90.0, 91.6],
};
const FOLD_SIZES = [69, 69, 68, 68, 68];
const CHINSTRAP = { plain: [8, 16, 16, 15, 13], stratified: [14, 14, 13, 13, 14] };

const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

// Figure 1: twenty single hold-outs of the same model, stacked into a dot histogram.
function splitNoise() {
  const X = c => 50 + (c * 2 - 78) / 22 * 580;       // correct out of 50 -> pixels (78% to 100%)
  const base = 218, step = 19;
  const tally = new Map();
  let dots = '';
  HOLD_OUT.slice().sort((a, b) => a - b).forEach(c => {
    const n = tally.get(c) ?? 0;
    tally.set(c, n + 1);
    dots += dot(X(c), base - 12 - n * step, k(0), 8);
  });
  const ticks = [40, 42, 44, 46, 48, 50].map(c => `${line(X(c), base, X(c), base + 6, { c: 'var(--muted)', w: 1.4 })}
${text(X(c), base + 22, fmt(c), { size: 12, fill: 'var(--ink)' })}${text(X(c), base + 38, `${fmt(c * 2)}%`, { size: 11 })}`).join('');
  const m = mean(HOLD_OUT);
  const lo = Math.min(...HOLD_OUT), hi = Math.max(...HOLD_OUT);
  return svg(680, 300, `
${text(340, 24, tr('The same model on 20 different hold-outs of 50 penguins', 'Model yang sama pada 20 hold-out berbeda, masing-masing 50 penguin'), { ...INK, size: 14 })}
${text(340, 44, tr('Each dot is one shuffle. Nothing changed except which 50 penguins were held out.', 'Setiap titik satu kali pengacakan. Yang berubah hanya 50 penguin mana yang ditahan.'), { size: 12 })}
${line(X(lo), 88, X(hi), 88, { c: 'var(--ink)', w: 2 })}${line(X(lo), 82, X(lo), 94, { c: 'var(--ink)', w: 2 })}${line(X(hi), 82, X(hi), 94, { c: 'var(--ink)', w: 2 })}
${text((X(lo) + X(hi)) / 2, 76, tr(`${fmt(lo)} to ${fmt(hi)} right out of 50 (${fmt(lo * 2)}% to ${fmt(hi * 2)}%)`, `${fmt(lo)} sampai ${fmt(hi)} benar dari 50 (${fmt(lo * 2)}% sampai ${fmt(hi * 2)}%)`), { ...INK, size: 13 })}
${line(X(m), 100, X(m), base, { c: 'var(--muted)', w: 1.8, dash: '5 4' })}
${text(X(m) + 6, 112, tr(`mean ${fmt(m * 2, { digits: 1 })}%`, `rata-rata ${fmt(m * 2, { digits: 1 })}%`), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${line(X(39.5), base, X(50.3), base, { c: 'var(--muted)', w: 1.6 })}${ticks}${dots}
${text(340, 282, tr('correct out of 50 (top) and accuracy (bottom)', 'benar dari 50 (atas) dan akurasi (bawah)'), { size: 12 })}`);
}

// Figure 2: five rounds of 5-fold cross-validation as a grid, with the score of each round.
function foldGrid() {
  const x0 = 112, cw = 84, gap = 4, y0 = 70, rh = 38;
  let body = text(340, 24, tr('5-fold cross-validation: 250 penguins, 5 folds of 50', 'Cross-validation 5-fold: 250 penguin, 5 fold berisi 50'), { ...INK, size: 14 });
  for (let f = 0; f < 5; f++) body += text(x0 + f * (cw + gap) + cw / 2, y0 - 14, `${tr('Fold', 'Fold')} ${fmt(f + 1)}`, { size: 12, weight: 700, fill: 'var(--ink)' });
  body += text(566, y0 - 14, tr('Score', 'Skor'), { anchor: 'start', size: 12, weight: 700, fill: 'var(--ink)' });
  for (let r = 0; r < 5; r++) {
    const y = y0 + r * rh;
    body += text(20, y + 20, `${tr('Round', 'Ronde')} ${fmt(r + 1)}`, { anchor: 'start', size: 13, fill: 'var(--ink)' });
    for (let f = 0; f < 5; f++) {
      const held = f === r, x = x0 + f * (cw + gap);
      body += `<rect x="${x}" y="${y}" width="${cw}" height="30" rx="6" fill="${held ? k(1) : soft(0)}" stroke="${held ? 'var(--ink)' : k(0)}" stroke-width="${held ? 2.2 : 1.4}"/>
${text(x + cw / 2, y + 20, held ? tr('validate', 'validate') : tr('train', 'train'), { size: 12, weight: held ? 700 : 500, fill: held ? 'var(--surface)' : 'var(--ink)' })}`;
    }
    body += text(566, y + 20, `${fmt(FOLD_SCORES[r])} / ${fmt(50)} = ${fmt(FOLD_SCORES[r] * 2)}%`, { anchor: 'start', size: 13, weight: 700, fill: 'var(--ink)' });
  }
  const scores = FOLD_SCORES.map(c => c * 2);
  const mu = mean(scores);
  const sd = Math.sqrt(scores.reduce((s, v) => s + (v - mu) ** 2, 0) / (scores.length - 1));
  body += line(20, 270, 660, 270, { c: 'var(--line)', w: 1.6 });
  body += text(340, 296, tr(`mean = (${scores.map(fmt).join(' + ')}) / 5 = ${fmt(mu, { digits: 1 })}%`, `rata-rata = (${scores.map(fmt).join(' + ')}) / 5 = ${fmt(mu, { digits: 1 })}%`), { ...INK, size: 14 });
  body += text(340, 318, tr(`spread (SD with n - 1) = ${fmt(sd, { digits: 1 })} points: scores run from ${fmt(Math.min(...scores))}% to ${fmt(Math.max(...scores))}%`, `sebaran (SD dengan n - 1) = ${fmt(sd, { digits: 1 })} poin: skor berkisar ${fmt(Math.min(...scores))}% sampai ${fmt(Math.max(...scores))}%`), { size: 12 });
  return svg(680, 336, body);
}

// Figure 3: how many Chinstrap penguins each held-out fold gets, plain against stratified.
function stratifiedFolds() {
  const overall = 68 / 342 * 100;
  const panels = [
    [tr('Plain shuffle', 'Pengacakan biasa'), CHINSTRAP.plain, 8, 8, 19],
    [tr('Stratified', 'Stratified'), CHINSTRAP.stratified, 346, 13, 14],
  ];
  let body = text(340, 22, tr('Chinstrap penguins in each held-out fold (68 of 342 in all)', 'Penguin Chinstrap di setiap fold yang ditahan (68 dari 342)'), { ...INK, size: 14 });
  panels.forEach(([title, counts, px, lo, hi]) => {
    const bx = px + 64, scale = 5.2;               // pixels per percentage point
    body += box(px, 36, 326, 232);
    body += text(px + 163, 62, title, { ...INK, size: 14 });
    counts.forEach((c, i) => {
      const y = 82 + i * 32, share = c / FOLD_SIZES[i] * 100;
      body += `${text(px + 14, y + 17, `${tr('Fold', 'Fold')} ${fmt(i + 1)}`, { anchor: 'start', size: 12, fill: 'var(--ink)' })}
<rect x="${bx}" y="${y}" width="${(share * scale).toFixed(1)}" height="24" rx="4" fill="${k(1)}" stroke="var(--ink)" stroke-width="1.4"/>
${text(bx + 26 * scale, y + 17, `${fmt(c)} / ${fmt(FOLD_SIZES[i])}  ·  ${fmt(share, { digits: 1 })}%`, { anchor: 'start', size: 12, fill: 'var(--ink)' })}`;
    });
    const gx = bx + overall * scale;
    body += line(gx, 76, gx, 244, { c: 'var(--muted)', w: 1.8, dash: '5 4' });
    body += text(gx, 258, tr(`all penguins ${fmt(overall, { digits: 1 })}%`, `semua penguin ${fmt(overall, { digits: 1 })}%`), { size: 11 });
    body += text(px + 163, 292, tr(`over 20 shuffles: ${fmt(lo)} to ${fmt(hi)} per fold`, `dari 20 pengacakan: ${fmt(lo)} sampai ${fmt(hi)} per fold`), { size: 12, fill: 'var(--ink)' });
  });
  return svg(680, 304, body);
}

// Figure 4: 20 repeats of 5-fold cross-validation for three models, against single hold-outs.
function repeatedCv() {
  const X = v => 218 + (v - 80) / 20 * 430;         // accuracy % -> pixels (80% to 100%)
  const rows = [
    [tr('One hold-out of 50', 'Satu hold-out 50 penguin'), HOLD_OUT.map(c => c * 2), 'var(--muted)'],
    [tr('5-fold mean, 1 neighbor', 'Rata-rata 5-fold, 1 neighbor'), CV_MEANS[1], k(0)],
    [tr('5-fold mean, 5 neighbors', 'Rata-rata 5-fold, 5 neighbor'), CV_MEANS[5], k(1)],
    [tr('5-fold mean, 15 neighbors', 'Rata-rata 5-fold, 15 neighbor'), CV_MEANS[15], k(2)],
  ];
  let body = text(340, 22, tr('20 repeats of the same score, each with a new shuffle', '20 pengulangan skor yang sama, masing-masing dengan pengacakan baru'), { ...INK, size: 14 });
  const gridTop = 40, rh = 70, bottom = gridTop + rows.length * rh;
  [80, 85, 90, 95, 100].forEach(t => {
    body += `${line(X(t), gridTop, X(t), bottom, { c: 'var(--line)', w: 1.2 })}${text(X(t), bottom + 18, `${fmt(t)}%`, { size: 12, fill: 'var(--ink)' })}`;
  });
  rows.forEach(([label, vals, color], r) => {
    const mid = gridTop + r * rh + 34;
    const seen = new Map();
    body += text(16, mid - 10, label, { anchor: 'start', size: 12, weight: 600, fill: 'var(--ink)' });
    vals.forEach(v => {
      const key = v.toFixed(1), n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      body += `<circle cx="${X(v).toFixed(1)}" cy="${mid - n * 7}" r="5" fill="${color}" fill-opacity="0.8" stroke="var(--surface)" stroke-width="1"/>`;
    });
    const m = mean(vals);
    body += line(X(m), mid + 8, X(m), mid + 17, { c: 'var(--ink)', w: 2.6 });
    body += text(X(m), mid + 30, `${tr('mean', 'rata-rata')} ${fmt(m, { digits: 1 })}%`, { size: 11, weight: 700, fill: 'var(--ink)' });
  });
  body += text(340, bottom + 44, tr('A dot is one accuracy. Stacked dots are repeats with the same score.', 'Satu titik adalah satu akurasi. Titik bertumpuk adalah pengulangan dengan skor sama.'), { size: 12 });
  return svg(680, bottom + 56, body);
}

export const figures = { 'split-noise': splitNoise, 'fold-grid': foldGrid, 'stratified-folds': stratifiedFolds, 'repeated-cv': repeatedCv };
