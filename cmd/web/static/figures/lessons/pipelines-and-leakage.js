// Figures for the "Pipelines and leakage" lesson. Numbers match the Leakage lab (sims/labs/leakage-lab.js):
//   random labels: 60 rows, 500 noise columns, 10 kept, logistic regression, 50 splits (seeds 100 to 149):
//     correct 47.5%, leaky 78.7%. Penguins: 50 splits (seeds 100 to 149): correct 97.2%, leaky 97.2%.
import { svg, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';
import { makeNoiseTable, featureCorrelations, selectTopK } from '../../sims/ml/leakage.js';

const COL_CORRECT = k(2), COL_LEAKY = k(1);

// The pipeline as four boxes in a fixed order; each learns from the training rows, test rows only pass through.
function pipelineRecipe() {
  const steps = [
    [tr('1  Fill gaps', '1  Isi kosong'), [tr('a median', 'satu median'), tr('per column', 'tiap kolom')]],
    [tr('2  Encode', '2  Encoding'), [tr('the list of', 'daftar'), tr('categories', 'kategori')]],
    [tr('3  Scale', '3  Scaling'), [tr('mean and', 'rata-rata dan'), tr('standard deviation', 'simpangan baku')]],
    [tr('4  Model', '4  Model'), [tr('its weights', 'bobotnya'), '']],
  ];
  const W = 138, G = 22, X0 = 11, Y = 78, H = 92;
  const xs = steps.map((_, i) => X0 + i * (W + G));
  const boxes = steps.map(([name, learns], i) => `${box(xs[i], Y, W, H, soft(i === 3 ? 4 : 0), i === 3 ? k(4) : k(0))}
${text(xs[i] + W / 2, Y + 26, name, { weight: 700, fill: 'var(--ink)', size: 14 })}
${text(xs[i] + W / 2, Y + 46, tr('learns', 'mempelajari'), { size: 11 })}
${text(xs[i] + W / 2, Y + 64, learns[0], { size: 12, fill: 'var(--ink)' })}${learns[1] ? text(xs[i] + W / 2, Y + 80, learns[1], { size: 12, fill: 'var(--ink)' }) : ''}`).join('');
  const arrows = xs.slice(0, -1).map((x, i) => line(x + W + 3, Y + H / 2, xs[i + 1] - 3, Y + H / 2, { c: 'var(--muted)', w: 2, arrow: true })).join('');
  return svg(640, 262, `
${text(320, 26, tr('Fit: each step learns its numbers from the training rows only', 'Fit: tiap langkah mempelajari angkanya hanya dari baris latih'), { weight: 700, fill: COL_CORRECT, size: 14 })}
${line(X0, 44, 629, 44, { c: COL_CORRECT, w: 3 })}${line(X0, 44, X0, 60, { c: COL_CORRECT, w: 3 })}${line(629, 44, 629, 60, { c: COL_CORRECT, w: 3 })}
${boxes}${arrows}
${line(X0, 200, 629, 200, { c: 'var(--muted)', w: 2.4, dash: '7 6' })}${line(X0, 184, X0, 200, { c: 'var(--muted)', w: 2.4, dash: '7 6' })}${line(629, 184, 629, 200, { c: 'var(--muted)', w: 2.4, dash: '7 6' })}
${text(320, 224, tr('Apply: test rows and new rows pass through with those numbers.', 'Terapkan: baris uji dan baris baru melewati langkah yang sama dengan angka itu.'), { fill: 'var(--ink)', size: 13, weight: 600 })}
${text(320, 244, tr('Nothing is learned again.', 'Tidak ada yang dipelajari ulang.'), { size: 13 })}`);
}

// Ten rows (seven train, three test) and what the fit gets to see in the two orders.
function fitOrder() {
  const cell = 26, step = 28, n = 10, nTrain = 7;
  const panel = (x0, title, color, seen, steps, verdict) => {
    const cx = i => x0 + 10 + i * step;
    const cells = Array.from({ length: n }, (_, i) => {
      const train = i < nTrain, c = train ? k(0) : k(4);
      return `<rect x="${cx(i)}" y="52" width="${cell}" height="${cell}" rx="5" fill="${soft(train ? 0 : 4)}" stroke="${c}" stroke-width="1.8"${train ? '' : ' stroke-dasharray="4 3"'}/>`;
    }).join('');
    const bx0 = cx(0), bx1 = cx(seen - 1) + cell;
    const seeLabel = seen === n
      ? tr(`The fit sees all ${fmt(n)} rows, test rows too`, `Fit melihat semua ${fmt(n)} baris, termasuk baris uji`)
      : tr(`The fit sees the ${fmt(nTrain)} training rows only`, `Fit hanya melihat ${fmt(nTrain)} baris latih`);
    const boxesY = [146, 196, 246];
    const stepBoxes = steps.map((s, i) => `${box(x0 + 10, boxesY[i], 280, 38, i === (seen === n ? 0 : 1) ? soft(color === COL_CORRECT ? 2 : 1) : 'var(--surface)', i === (seen === n ? 0 : 1) ? color : 'var(--line)')}${text(x0 + 150, boxesY[i] + 24, s, { fill: 'var(--ink)', size: 12, weight: 600 })}`).join('');
    const arrows = [0, 1].map(i => line(x0 + 150, boxesY[i] + 40, x0 + 150, boxesY[i + 1] - 3, { c: 'var(--muted)', w: 1.8, arrow: true })).join('');
    return `${text(x0 + 150, 28, title, { weight: 700, fill: color, size: 15 })}
${cells}
${text(cx(0) + (nTrain * step - 2) / 2, 96, tr('training rows', 'baris latih'), { size: 11 })}${text(cx(nTrain) + (3 * step - 2) / 2, 96, tr('test rows', 'baris uji'), { size: 11 })}
${line(bx0, 108, bx1, 108, { c: color, w: 3.5 })}${line(bx0, 102, bx0, 108, { c: color, w: 3.5 })}${line(bx1, 102, bx1, 108, { c: color, w: 3.5 })}
${text(x0 + 150, 128, seeLabel, { fill: color, weight: 700, size: 12 })}
${stepBoxes}${arrows}
${text(x0 + 150, 306, verdict, { fill: color, weight: 700, size: 12 })}`;
  };
  return svg(640, 322, `
${panel(10, tr('Correct: split first', 'Benar: bagi dulu'), COL_CORRECT, nTrain,
    [tr('1. Split the rows', '1. Bagi barisnya'), tr('2. Fit on the training rows', '2. Fit pada baris latih'), tr('3. Apply to test rows, then score', '3. Terapkan ke baris uji, lalu beri skor')],
    tr('Test rows unseen: a fair exam', 'Baris uji tak terlihat: ujian adil'))}
${panel(330, tr('Leaky: fit first', 'Bocor: fit dulu'), COL_LEAKY, n,
    [tr('1. Fit on all rows', '1. Fit pada semua baris'), tr('2. Split the rows', '2. Bagi barisnya'), tr('3. Score on the test rows', '3. Beri skor pada baris uji')],
    tr('Test rows shaped the fit: too good', 'Baris uji ikut membentuk fit: terlalu bagus'))}`);
}

// 500 random columns on 60 rows: how big is each one's correlation with the labels, and which ten the leaky pipeline keeps.
function luckCorrelations() {
  const t = makeNoiseTable({ n: 60, p: 500, seed: 1 });
  const r = featureCorrelations(t.X, t.y).map(Math.abs);
  const kept = new Set(selectTopK(t.X, t.y, 10));
  const bins = 16, width = 0.025;
  const rest = Array(bins).fill(0), top = Array(bins).fill(0);
  r.forEach((v, j) => { const b = Math.min(bins - 1, Math.floor(v / width)); (kept.has(j) ? top : rest)[b] += 1; });
  const best = Math.max(...r);
  const L = 56, R = 626, T = 44, B = 236, pw = R - L, ph = B - T;
  const peak = Math.max(...rest.map((v, i) => v + top[i]));
  const yMax = Math.ceil(peak / 20) * 20;
  const X = v => L + v / (bins * width) * pw, Y = c => B - c / yMax * ph;
  const bars = rest.map((c, i) => {
    const x = X(i * width) + 1.5, w = pw / bins - 3, tc = top[i];
    return `${c ? `<rect x="${x}" y="${Y(c + tc)}" width="${w}" height="${Y(0) - Y(c + tc) - (tc ? Y(0) - Y(tc) : 0)}" fill="${k(0)}" opacity="0.75"/>` : ''}${tc ? `<rect x="${x}" y="${Y(tc)}" width="${w}" height="${Y(0) - Y(tc)}" fill="${COL_LEAKY}"/>` : ''}`;
  }).join('');
  const grid = [0, 0.1, 0.2, 0.3, 0.4].map(v => `${line(X(v), B, X(v), B + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(v), B + 20, fmt(v, { digits: 1 }), { size: 12 })}`).join('');
  const ys = [0, yMax / 2, yMax].map(c => `${line(L, Y(c), R, Y(c), { c: 'var(--line)', w: 1 })}${text(L - 8, Y(c) + 4, fmt(c), { anchor: 'end', size: 12 })}`).join('');
  return svg(640, 308, `
${ys}${bars}${line(L, B, R, B, { c: 'var(--muted)', w: 1.6 })}${grid}
${text(L + pw / 2, B + 40, tr('Size of the correlation with the labels (0 means no relation)', 'Besarnya korelasi dengan label (0 berarti tidak ada hubungan)'), { size: 13 })}
<text transform="translate(14 ${T + ph / 2}) rotate(-90)" text-anchor="middle" font-size="12" font-weight="500" fill="var(--muted)">${tr('number of columns', 'jumlah kolom')}</text>
<rect x="${L + 6}" y="8" width="12" height="12" rx="3" fill="${COL_LEAKY}"/>${text(L + 24, 19, tr('the 10 kept by the leaky pipeline', '10 kolom yang dipertahankan pipeline bocor'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
<rect x="${L + 300}" y="8" width="12" height="12" rx="3" fill="${k(0)}" opacity="0.75"/>${text(L + 318, 19, tr('the other 490', '490 kolom lainnya'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${text(Math.min(R - 60, X(best) + 4), Y(top[Math.min(bins - 1, Math.floor(best / width))] + 0) - 22, tr(`best: ${fmt(best, { digits: 2 })}`, `terbaik: ${fmt(best, { digits: 2 })}`), { size: 12, weight: 700, fill: COL_LEAKY })}`);
}

// Mean test accuracy over 50 splits, correct against leaky, on random labels and on penguins (values from the lab).
function leakScores() {
  const groups = [
    { name: tr('Random labels', 'Label acak'), sub: tr('60 rows, 500 noise columns, 10 kept', '60 baris, 500 kolom noise, 10 dipertahankan'), correct: 0.475, leaky: 0.787, chance: true },
    { name: tr('Penguins', 'Penguin'), sub: tr('is it an Adelie? median + standardize', 'apakah ini Adelie? median + standardisasi'), correct: 0.972, leaky: 0.972, chance: false },
  ];
  const L = 56, R = 626, T = 40, B = 232, pw = R - L, ph = B - T;
  const Y = v => B - v * ph, bw = 72;
  const grid = [0, 0.25, 0.5, 0.75, 1].map(v => `${line(L, Y(v), R, Y(v), { c: 'var(--line)', w: 1 })}${text(L - 8, Y(v) + 4, `${fmt(v * 100)}%`, { anchor: 'end', size: 12 })}`).join('');
  const out = groups.map((g, i) => {
    const c0 = L + pw * (i ? 0.75 : 0.25);
    const gap = (g.leaky - g.correct) * 100;
    const bar = (v, dx, col) => {
      const x = c0 + dx - bw / 2, top = Y(v);
      return `<rect x="${x}" y="${top}" width="${bw}" height="${B - top}" rx="3" fill="${col}"/>${v < 0.5 ? text(x + bw / 2, top + 20, pct(v), { weight: 700, fill: '#fff', size: 14 }) : text(x + bw / 2, top - 6, pct(v), { weight: 700, fill: 'var(--ink)', size: 14 })}`;
    };
    return `${bar(g.correct, -bw / 2 - 6, COL_CORRECT)}${bar(g.leaky, bw / 2 + 6, COL_LEAKY)}
${g.chance ? `<path d="M${c0 - bw - 20} ${Y(0.5)}L${c0 + bw + 20} ${Y(0.5)}" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="6 5" fill="none"/>${text(c0 + bw + 24, Y(0.5) + 4, tr('chance, 50%', 'kebetulan, 50%'), { anchor: 'start', size: 11 })}` : ''}
${text(c0, B + 20, g.name, { weight: 700, fill: 'var(--ink)', size: 14 })}${text(c0, B + 37, g.sub, { size: 11 })}
${text(c0, B + 56, tr(`gap: ${fmt(gap, { digits: 1 })} points`, `selisih: ${fmt(gap, { digits: 1 })} poin`), { weight: 700, fill: g.chance ? COL_LEAKY : 'var(--muted)', size: 13 })}`;
  }).join('');
  return svg(640, 312, `
${grid}${out}${line(L, B, R, B, { c: 'var(--muted)', w: 1.6 })}
<rect x="${L + 6}" y="8" width="12" height="12" rx="3" fill="${COL_CORRECT}"/>${text(L + 24, 19, tr('Fit after splitting (correct)', 'Fit setelah data dibagi (benar)'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
<rect x="${L + 290}" y="8" width="12" height="12" rx="3" fill="${COL_LEAKY}"/>${text(L + 308, 19, tr('Fit before splitting (leak)', 'Fit sebelum data dibagi (leakage)'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}`);
}

export const figures = {
  'pipeline-recipe': pipelineRecipe,
  'fit-order': fitOrder,
  'luck-correlations': luckCorrelations,
  'leak-scores': leakScores,
};
