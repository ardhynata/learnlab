// Figures for the lesson "Permutation importance and SHAP": [[figure:permutation-importance-and-shap/name|Caption]].
// Every number is real. Task: is a penguin male, from flipper length, body mass and bill depth, for the 333
// penguins with all measurements and a recorded sex, cut with splitIndices(333, { train: 0.6, validation: 0.2 },
// 4, sex labels) from sims/ml/tabular.js: 200 training, 67 validation. Model: fitLogistic() from sims/ml/logistic.js
// (iters 2000, lr 0.3, standardized inside), 61 of 67 right on validation. Permutation importance: each feature of
// the validation rows shuffled 30 times (shuffle() with rng(100 + s), s = 0..29); the drop is in penguins right,
// out of 67. The model without body mass (flipper length and bill depth) got 59 of 67; flipper length shuffled in
// it costs 13.6. Shapley values are exact: v(S) = mean predicted P(male) over the 200 training penguins with the
// features in S fixed at the penguin's values and the others taken from a training penguin; six orders averaged.
// Figures are drawn synchronously and cannot fetch the csv, so the numbers are constants here and anything
// derivable (a mean over six orders, a share) is computed. Sex colors as in "Bagging and random forests":
// female amber, male blue.
import { svg, dot, diamond, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const MALE = 4, FEMALE = 3;
const N_VALID = 67;
const tick = (x, y, label) => `${line(x, y, x, y + 5, { c: 'var(--muted)', w: 1.4 })}${text(x, y + 20, label, { size: 12 })}`;

// Figure 1: the permutation importance of the three features.
// [English, Indonesian, mean drop in penguins right, lowest single drop, highest single drop]
const PERM = [
  ['bill depth', 'bill depth', 25.33, 20, 33],
  ['body mass', 'body mass', 16.77, 10, 25],
  ['flipper length', 'flipper length', 1.0, 0, 2],
];

function permutation() {
  const W = 640, left = 140, right = 60, top = 64, rowH = 54, barH = 26, maxV = 35;
  const X = v => left + v / maxV * (W - left - right);
  const base = top + PERM.length * rowH;
  const bars = PERM.map(([en, id, mean, lo, hi], i) => {
    const y = top + i * rowH + (rowH - barH) / 2, cy = y + barH / 2;
    return `${text(left - 10, cy + 5, tr(en, id), { anchor: 'end', size: 13, fill: 'var(--ink)', weight: 600 })}
<rect x="${left}" y="${y}" width="${Math.max(2, X(mean) - left).toFixed(1)}" height="${barH}" rx="4" fill="${k(0)}"/>
${line(X(lo), cy, X(hi), cy, { c: 'var(--ink)', w: 2 })}${line(X(lo), cy - 6, X(lo), cy + 6, { c: 'var(--ink)', w: 2 })}${line(X(hi), cy - 6, X(hi), cy + 6, { c: 'var(--ink)', w: 2 })}
${text(X(hi) + 10, cy + 5, tr(`${fmt(mean, { digits: 1 })} of ${fmt(N_VALID)}`, `${fmt(mean, { digits: 1 })} dari ${fmt(N_VALID)}`), { anchor: 'start', size: 12.5, ...INK })}`;
  }).join('');
  const ticks = [0, 10, 20, 30].map(v => tick(X(v), base, fmt(v))).join('');
  return svg(W, base + 62, `${text(left, 22, tr('Shuffle one feature, score the 67 validation penguins again, 30 times', 'Acak satu feature, nilai lagi 67 penguin validation, sebanyak 30 kali'), { anchor: 'start', ...INK, size: 13 })}
${text(left, 42, tr(`Before shuffling: ${fmt(61)} of ${fmt(N_VALID)} right (${fmt(61 / N_VALID * 100, { digits: 1 })}%)`, `Sebelum diacak: ${fmt(61)} dari ${fmt(N_VALID)} benar (${fmt(61 / N_VALID * 100, { digits: 1 })}%)`), { anchor: 'start', size: 12.5, fill: 'var(--ink)' })}
${line(left, top, left, base, { c: 'var(--muted)', w: 1.6 })}${line(left, base, W - right + 10, base, { c: 'var(--muted)', w: 1.6 })}${bars}${ticks}
${text((left + W - right) / 2, base + 42, tr('drop in penguins right (bar: mean; line: lowest to highest shuffle)', 'penurunan penguin benar (batang: rata-rata; garis: terendah sampai tertinggi)'), { size: 12 })}`);
}

// Figure 2: flipper length and body mass for the 333 penguins (flat list: flipper mm, mass g, ...), and the
// importance of flipper length in the model with and without body mass.
const FLIPPER_MASS = [
  181,3750, 186,3800, 195,3250, 193,3450, 190,3650, 181,3625, 195,4675, 182,3200, 191,3800, 198,4400,
  185,3700, 195,3450, 197,4500, 184,3325, 194,4200, 174,3400, 180,3600, 189,3800, 185,3950, 180,3800,
  187,3800, 183,3550, 187,3200, 172,3150, 180,3950, 178,3250, 178,3900, 188,3300, 184,3900, 195,3325,
  196,4150, 190,3950, 180,3550, 181,3300, 184,4650, 182,3150, 195,3900, 186,3100, 196,4400, 185,3000,
  190,4600, 182,3425, 190,3450, 191,4150, 186,3500, 188,4300, 190,3450, 200,4050, 187,2900, 191,3700,
  186,3550, 193,3800, 181,2850, 194,3750, 185,3150, 195,4400, 185,3600, 192,4050, 184,2850, 192,3950,
  195,3350, 188,4100, 190,3050, 198,4450, 190,3600, 190,3900, 196,3550, 197,4150, 190,3700, 195,4250,
  191,3700, 184,3900, 187,3550, 195,4000, 189,3200, 196,4700, 187,3800, 193,4200, 191,3350, 194,3550,
  190,3800, 189,3500, 189,3950, 190,3600, 202,3550, 205,4300, 185,3400, 186,4450, 187,3300, 208,4300,
  190,3700, 196,4350, 178,2900, 192,4100, 192,3725, 203,4725, 183,3075, 190,4250, 193,2925, 184,3550,
  199,3750, 190,3900, 181,3175, 197,4775, 198,3825, 191,4600, 193,3200, 197,4275, 191,3900, 196,4075,
  188,2900, 199,3775, 189,3350, 189,3325, 187,3150, 198,3500, 176,3450, 202,3875, 186,3050, 199,4000,
  191,3275, 195,4300, 191,3050, 210,4000, 190,3325, 197,3500, 193,3500, 199,4475, 187,3425, 190,3900,
  191,3175, 200,3975, 185,3400, 193,4250, 193,3400, 187,3475, 188,3050, 190,3725, 192,3000, 185,3650,
  190,4250, 184,3475, 195,3450, 193,3750, 187,3700, 201,4000, 211,4500, 230,5700, 210,4450, 218,5700,
  215,5400, 210,4550, 211,4800, 219,5200, 209,4400, 215,5150, 214,4650, 216,5550, 214,4650, 213,5850,
  210,4200, 217,5850, 210,4150, 221,6300, 209,4800, 222,5350, 218,5700, 215,5000, 213,4400, 215,5050,
  215,5000, 215,5100, 215,5650, 210,4600, 220,5550, 222,5250, 209,4700, 207,5050, 230,6050, 220,5150,
  220,5400, 213,4950, 219,5250, 208,4350, 208,5350, 208,3950, 225,5700, 210,4300, 216,4750, 222,5550,
  217,4900, 210,4200, 225,5400, 213,5100, 215,5300, 210,4850, 220,5300, 210,4400, 225,5000, 217,4900,
  220,5050, 208,4300, 220,5000, 208,4450, 224,5550, 208,4200, 221,5300, 214,4400, 231,5650, 219,4700,
  230,5700, 229,5800, 220,4700, 223,5550, 216,4750, 221,5000, 221,5100, 217,5200, 216,4700, 230,5800,
  209,4600, 220,6000, 215,4750, 223,5950, 212,4625, 221,5450, 212,4725, 224,5350, 212,4750, 228,5600,
  218,4600, 218,5300, 212,4875, 230,5550, 218,4950, 228,5400, 212,4750, 224,5650, 214,4850, 226,5200,
  216,4925, 222,4875, 203,4625, 225,5250, 219,4850, 228,5600, 215,4975, 228,5500, 215,5500, 210,4700,
  219,5500, 208,4575, 209,5500, 216,5000, 229,5950, 213,4650, 230,5500, 217,4375, 230,5850, 222,6000,
  214,4925, 215,4850, 222,5750, 212,5200, 213,5400, 192,3500, 196,3900, 193,3650, 188,3525, 197,3725,
  198,3950, 178,3250, 197,3750, 195,4150, 198,3700, 193,3800, 194,3775, 185,3700, 201,4050, 190,3575,
  201,4050, 197,3300, 181,3700, 190,3450, 195,4400, 181,3600, 191,3400, 187,2900, 193,3800, 195,3300,
  197,4150, 200,3400, 200,3800, 191,3700, 205,4550, 187,3200, 201,4300, 187,3350, 203,4100, 195,3600,
  199,3900, 195,3850, 210,4800, 192,2700, 205,4500, 210,3950, 187,3650, 196,3550, 196,3500, 196,3675,
  201,4450, 190,3400, 212,4300, 187,3250, 198,3675, 199,3325, 201,3950, 193,3600, 203,4050, 187,3350,
  197,3450, 191,3250, 203,4050, 202,3800, 194,3525, 206,3950, 189,3650, 195,3650, 207,4000, 202,3400,
  193,3775, 210,4100, 198,3775,

];

function correlated() {
  const W = 640, H = 312;
  const px0 = 56, px1 = 300, py0 = 60, py1 = 232;
  const fx = v => px0 + (v - 170) / (235 - 170) * (px1 - px0);
  const my = v => py1 - (v - 2600) / (6400 - 2600) * (py1 - py0);
  let pts = '';
  for (let i = 0; i < FLIPPER_MASS.length; i += 2) pts += `<circle cx="${fx(FLIPPER_MASS[i]).toFixed(1)}" cy="${my(FLIPPER_MASS[i + 1]).toFixed(1)}" r="2.6" fill="${k(0)}" fill-opacity="0.55"/>`;
  const xt = [180, 200, 220].map(v => tick(fx(v), py1, fmt(v))).join('');
  const yt = [3000, 4000, 5000, 6000].map(v => `${line(px0 - 5, my(v), px0, my(v), { c: 'var(--muted)', w: 1.4 })}${text(px0 - 8, my(v) + 4, fmt(v), { anchor: 'end', size: 11.5 })}`).join('');
  const left = `${text(px0, 24, tr('Flipper length and body mass', 'Flipper length dan body mass'), { anchor: 'start', ...INK, size: 13 })}
${text(px0, 44, tr('333 penguins, r = 0.87: they move together', '333 penguin, r = 0,87, bergerak bersama'), { anchor: 'start', size: 12.5, fill: 'var(--ink)' })}
${line(px0, py0 - 6, px0, py1, { c: 'var(--muted)', w: 1.6 })}${line(px0, py1, px1 + 6, py1, { c: 'var(--muted)', w: 1.6 })}${pts}${xt}${yt}
${text((px0 + px1) / 2, py1 + 42, tr('flipper length (mm)', 'flipper length (mm)'), { size: 12 })}
${text(10, (py0 + py1) / 2, tr('body mass (g)', 'body mass (g)'), { size: 12 }).replace('<text ', `<text transform="rotate(-90 10 ${(py0 + py1) / 2})" `)}`;

  const rows = [
    [tr('with body mass', 'dengan body mass'), tr(`${fmt(61)} of ${fmt(N_VALID)} right`, `${fmt(61)} dari ${fmt(N_VALID)} benar`), 1.0, k(2)],
    [tr('without body mass', 'tanpa body mass'), tr(`${fmt(59)} of ${fmt(N_VALID)} right`, `${fmt(59)} dari ${fmt(N_VALID)} benar`), 13.6, k(1)],
  ];
  const bx0 = 380, bx1 = 610, maxV = 16, X = v => bx0 + v / maxV * (bx1 - bx0), by = 232;
  const bars = rows.map(([name, acc, v, c], i) => {
    const y = 96 + i * 66;
    return `${text(bx0, y - 8, `${name} (${acc})`, { anchor: 'start', size: 12.5, fill: 'var(--ink)', weight: 600 })}
<rect x="${bx0}" y="${y}" width="${(X(v) - bx0).toFixed(1)}" height="28" rx="4" fill="${c}"/>
${text(X(v) + 8, y + 19, fmt(v, { digits: 1 }), { anchor: 'start', size: 13, ...INK })}`;
  }).join('');
  const right = `${text(bx0, 24, tr('Flipper length shuffled', 'Flipper length diacak'), { anchor: 'start', ...INK, size: 13 })}
${text(bx0, 44, tr('drop in penguins right, out of 67', 'penurunan penguin benar, dari 67'), { anchor: 'start', size: 12.5, fill: 'var(--ink)' })}
${line(bx0, 70, bx0, by, { c: 'var(--muted)', w: 1.6 })}${line(bx0, by, bx1 + 10, by, { c: 'var(--muted)', w: 1.6 })}${bars}${[0, 5, 10, 15].map(v => tick(X(v), by, fmt(v))).join('')}`;
  return svg(W, H, left + right);
}

// Figure 3: penguin 16 (male Adelie: flipper 180 mm, mass 3600 g, depth 18.7 mm), P(male) 0.535, baseline 0.505.
// The six contributions of each feature, one per order, rounded to 3 decimals as in the lesson's table.
const ORDERS = [
  ['flipper length', 'flipper length', [0.017, 0.017, 0.015, 0.070, 0.013, 0.070]],
  ['body mass', 'body mass', [-0.238, -0.183, -0.236, -0.236, -0.183, -0.240]],
  ['bill depth', 'bill depth', [0.251, 0.196, 0.251, 0.196, 0.200, 0.200]],
];

function orders() {
  const W = 640, left = 140, right = 40, top = 52, rowH = 84, lo = -0.3, hi = 0.3;
  const X = v => left + (v - lo) / (hi - lo) * (W - left - right);
  const base = top + ORDERS.length * rowH;
  const rows = ORDERS.map(([en, id, vals], i) => {
    const y0 = top + i * rowH + 50;
    const sorted = [...vals].sort((a, b) => a - b);
    const groups = [];
    for (const v of sorted) {
      const g = groups[groups.length - 1];
      if (g && v - g[0] < 0.015) g.push(v); else groups.push([v]);
    }
    let dots = '';
    for (const g of groups) g.forEach((v, j) => { dots += dot(X(v), y0 - 8 - j * 13, v < 0 ? k(FEMALE) : k(MALE), 6); });
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const label = tr(`Shapley value ${fmt(mean, { digits: 3 })}`, `nilai Shapley ${fmt(mean, { digits: 3 })}`);
    const lx = X(mean) + 14;
    return `${text(left - 12, y0 - 4, tr(en, id), { anchor: 'end', size: 13, fill: 'var(--ink)', weight: 600 })}
${line(left, y0 + 10, W - right, y0 + 10, { c: 'var(--line)', w: 1 })}${dots}${diamond(X(mean), y0 + 10, 'var(--surface)', 8)}
${text(lx, y0 + 15, label, { anchor: 'start', size: 12, ...INK })}`;
  }).join('');
  const ticks = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3].map(v => tick(X(v), base, fmt(v, { digits: 1 }))).join('');
  return svg(W, base + 56, `${text(left, 22, tr('Penguin 16: contribution of each feature in each of the six orders', 'Penguin 16: kontribusi tiap feature pada masing-masing dari enam urutan'), { anchor: 'start', ...INK, size: 13 })}
${text(left, 40, tr('one dot per order (blue: toward male, amber: toward female); diamond = average = Shapley value', 'satu titik per urutan (biru: ke jantan, kuning: ke betina); berlian = rata-rata = nilai Shapley'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${line(X(0), top + 6, X(0), base, { c: 'var(--muted)', w: 1.4, dash: '4 4' })}${rows}${line(left, base, W - right, base, { c: 'var(--muted)', w: 1.6 })}${ticks}
${text((left + W - right) / 2, base + 42, tr('change in the predicted probability of male', 'perubahan probabilitas jantan yang diprediksi'), { size: 12 })}`);
}

// Figure 4: exact Shapley values (flipper length, body mass, bill depth) for two validation penguins, and the
// mean of |value| over the 67 validation penguins.
const LOCAL = [
  { en: 'Penguin 16, male Adelie: predicted 0.535', id: 'Penguin 16, Adelie jantan: prediksi 0,535', v: [0.034, -0.219, 0.216] },
  { en: 'Penguin 261, female Gentoo: predicted 0.124', id: 'Penguin 261, Gentoo betina: prediksi 0,124', v: [-0.014, 0.138, -0.505] },
];
const GLOBAL = [0.010, 0.256, 0.275];
const FEATURES = [['flipper length', 'flipper length'], ['body mass', 'body mass'], ['bill depth', 'bill depth']];

function localGlobal() {
  const W = 640, left = 150, right = 30, x0 = 200, x1 = W - right, lo = -0.6, hi = 0.6, barH = 18, step = 26;
  const X = v => x0 + (v - lo) / (hi - lo) * (x1 - x0);
  const blocks = [...LOCAL.map(b => ({ title: tr(b.en, b.id), v: b.v, signed: true })), { title: tr('Average size over the 67 validation penguins', 'Ukuran rata-rata pada 67 penguin validation'), v: GLOBAL, signed: false }];
  let body = '', y = 26;
  const top = y;
  for (const b of blocks) {
    body += text(14, y, b.title, { anchor: 'start', ...INK, size: 13 });
    y += 12;
    b.v.forEach((v, i) => {
      const cy = y + i * step + barH / 2;
      const c = !b.signed ? k(2) : v >= 0 ? k(MALE) : k(FEMALE);
      const xa = X(0), xb = X(v);
      const lab = text(v >= 0 ? xb + 8 : xb - 8, cy + 4.5, b.signed && v > 0 ? `+${fmt(v, { digits: 3 })}` : fmt(v, { digits: 3 }), { anchor: v >= 0 ? 'start' : 'end', size: 12, ...INK });
      body += `${text(left, cy + 4.5, tr(FEATURES[i][0], FEATURES[i][1]), { anchor: 'end', size: 12.5, fill: 'var(--ink)', weight: 600 })}
<rect x="${Math.min(xa, xb).toFixed(1)}" y="${cy - barH / 2}" width="${Math.max(2, Math.abs(xb - xa)).toFixed(1)}" height="${barH}" rx="3" fill="${c}"/>${lab}`;
    });
    y += 3 * step + 24;
  }
  const base = y - 12;
  const ticks = [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6].map(v => tick(X(v), base, fmt(v, { digits: 1 }))).join('');
  const legend = `<rect x="${x0}" y="${base + 38}" width="12" height="12" rx="2" fill="${k(MALE)}"/>${text(x0 + 18, base + 49, tr('pushes toward male', 'mendorong ke jantan'), { anchor: 'start', size: 12 })}
<rect x="${x0 + 160}" y="${base + 38}" width="12" height="12" rx="2" fill="${k(FEMALE)}"/>${text(x0 + 178, base + 49, tr('pushes toward female', 'mendorong ke betina'), { anchor: 'start', size: 12 })}`;
  return svg(W, base + 62, `${line(X(0), top - 4, X(0), base, { c: 'var(--muted)', w: 1.4, dash: '4 4' })}${body}${line(x0, base, x1, base, { c: 'var(--muted)', w: 1.6 })}${ticks}
${legend}`);
}

export const figures = { 'permutation': permutation, 'correlated': correlated, 'orders': orders, 'local-global': localGlobal };
