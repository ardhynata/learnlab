// Figures for the "Interactions and transformations" lesson. Every number is the one the lesson text uses:
// the garden trial (8 plots), the seven incomes, and the real penguins' bill length and bill ratio.
import { svg, dot, ring, text, line, box, k, soft, tr, fmt } from '../kit.js';

// Garden trial: [fertilizer, water, yield in kg], two plots per combination.
const PLOTS = [[0, 0, 9], [0, 0, 11], [1, 0, 9], [1, 0, 11], [0, 1, 8], [0, 1, 12], [1, 1, 29], [1, 1, 31]];

// ---- Figure 1: parallel lines (linear model) against lines that fan out (with f x w). ----
function parallelOrFan() {
  const panel = (ox, title, sub, pred) => {
    const W = 290, H = 200, top = 56, X0 = ox + 40, X1 = ox + W - 24;
    const X = w => X0 + 30 + w * (X1 - X0 - 60);
    const Y = v => top + H - 24 - v / 35 * (H - 50);
    const ticks = [0, 10, 20, 30].map(v => line(X0 - 4, Y(v), X0, Y(v), { c: 'var(--muted)', w: 1.4 }) + text(X0 - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })
      + line(X0, Y(v), X1, Y(v), { c: 'var(--line)', w: 0.8 })).join('');
    const lineFor = (f, c) => line(X(0), Y(pred(f, 0)), X(1), Y(pred(f, 1)), { c, w: 3 });
    const pts = PLOTS.map(([f, w, y]) => (f ? dot(X(w) + 7, Y(y), k(1), 4.5) : ring(X(w) - 7, Y(y), k(0), 4.5))).join('');
    return `${text(ox + W / 2, 22, title, { weight: 700, fill: 'var(--ink)' })}${text(ox + W / 2, 40, sub, { size: 12 })}
${line(X0, top + 10, X0, Y(0), { c: 'var(--muted)', w: 1.6 })}${ticks}
${lineFor(0, k(0))}${lineFor(1, k(1))}${pts}
${text(X(0), Y(0) + 18, tr('low water', 'air sedikit'), { size: 12 })}${text(X(1), Y(0) + 18, tr('high water', 'air banyak'), { size: 12 })}`;
  };
  const lin = (f, w) => 5 + 10 * f + 10 * w;
  const inter = (f, w) => 10 + 20 * f * w;
  return svg(640, 330, `
${panel(10, tr('Linear model on f and w', 'Model linear pada f dan w'), tr(`typical miss ${fmt(5.17)} kg: lines stay parallel`, `selisih khas ${fmt(5.17)} kg: garis tetap sejajar`), lin)}
${panel(330, tr('Add the product f × w', 'Tambahkan hasil kali f × w'), tr(`typical miss ${fmt(1.32)} kg: lines can fan out`, `selisih khas ${fmt(1.32)} kg: garis bisa melebar`), inter)}
<text transform="translate(14 170) rotate(-90)" text-anchor="middle" font-size="12" font-weight="500" fill="var(--muted)">${tr('yield, kg', 'hasil panen, kg')}</text>
${dot(30, 296, k(1), 5)}${text(42, 300, tr('fertilizer added (line and plots)', 'diberi pupuk (garis dan petak)'), { anchor: 'start', size: 12 })}
${ring(300, 296, k(0), 5)}${text(312, 300, tr('no fertilizer (line and plots)', 'tanpa pupuk (garis dan petak)'), { anchor: 'start', size: 12 })}`);
}

// ---- Figure 2: seven incomes on a raw number line and after log10. ----
function logSkew() {
  const inc = [25, 30, 38, 45, 60, 90, 250];
  const X0 = 50, X1 = 600;
  const rawX = v => X0 + v / 260 * (X1 - X0);
  const logX = v => X0 + (v - 1.3) / (2.5 - 1.3) * (X1 - X0);
  const row = (y, title, ticks, pos, values, label) => `
${text(X0, y - 30, title, { anchor: 'start', weight: 700, fill: 'var(--ink)' })}
${line(X0, y, X1, y, { c: 'var(--muted)', w: 1.6 })}
${ticks.map(v => line(pos(v), y - 4, pos(v), y + 4, { c: 'var(--muted)', w: 1.4 }) + text(pos(v), y + 20, fmt(v), { size: 12 })).join('')}
${values.map((v, i) => dot(pos(v), y - 12, i === values.length - 1 ? k(1) : k(0), 4.5)).join('')}
${text(pos(values[values.length - 1]), y - 28, label, { size: 12, fill: k(1), weight: 700, anchor: 'end' })}`;
  return svg(640, 250, `
${row(70, tr('Income in $1000s: six close together, one far out', 'Pendapatan (ribuan dolar): enam berdekatan, satu jauh'), [0, 50, 100, 150, 200, 250], rawX, inc, fmt(250))}
${row(170, tr(`After log10: each doubling is the same step (${fmt(0.3, { digits: 2 })})`, `Setelah log10: tiap penggandaan sama langkahnya (${fmt(0.3, { digits: 2 })})`), [1.4, 1.6, 1.8, 2, 2.2, 2.4], logX, inc.map(Math.log10), fmt(2.4))}
${text(320, 236, tr('The long tail is pulled in; the ordinary values get more room.', 'Ekor panjangnya ditarik masuk; nilai biasa mendapat ruang lebih lega.'), { size: 13, fill: 'var(--ink)' })}`);
}

// ---- Figure 3: bill length alone against bill length / bill depth, for the 342 measured penguins. ----
// min, q1, median, q3, max per species (checked against cmd/web/static/data/penguins.csv).
const SPECIES = [
  ['Adelie', [32.1, 36.75, 38.8, 40.75, 46], [1.64, 2.011, 2.137, 2.238, 2.45]],
  ['Chinstrap', [40.9, 46.35, 49.55, 51.075, 58], [2.351, 2.56, 2.662, 2.728, 3.258]],
  ['Gentoo', [40.9, 45.3, 47.3, 49.55, 59.6], [2.566, 3.066, 3.167, 3.285, 3.613]],
];
function billRatio() {
  const panel = (ox, title, idx, lo, hi, ticks) => {
    const W = 290, X0 = ox + 4, X1 = ox + W - 6, top = 60;
    const X = v => X0 + (v - lo) / (hi - lo) * (X1 - X0);
    const rows = SPECIES.map(([name, a, b], i) => {
      const s = idx === 0 ? a : b, y = top + i * 44, c = [0, 1, 2][i];
      return `${text(X0, y - 8, name, { anchor: 'start', size: 12, fill: 'var(--ink)', weight: 700 })}
${line(X(s[0]), y + 8, X(s[4]), y + 8, { c: k(c), w: 2 })}
<rect x="${X(s[1])}" y="${y}" width="${X(s[3]) - X(s[1])}" height="16" rx="3" fill="${soft(c)}" stroke="${k(c)}" stroke-width="2"/>
${line(X(s[2]), y, X(s[2]), y + 16, { c: k(c), w: 3 })}`;
    }).join('');
    const axisY = top + 3 * 44 + 4;
    return `${text(ox + W / 2, 26, title, { weight: 700, fill: 'var(--ink)' })}${rows}
${line(X0, axisY, X1, axisY, { c: 'var(--muted)', w: 1.6 })}
${ticks.map(v => line(X(v), axisY - 4, X(v), axisY + 4, { c: 'var(--muted)', w: 1.4 }) + text(X(v), axisY + 20, fmt(v), { size: 12 })).join('')}`;
  };
  return svg(640, 280, `
${panel(10, tr('Bill length alone (mm)', 'Panjang paruh saja (mm)'), 0, 30, 60, [30, 40, 50, 60])}
${panel(330, tr('Bill length ÷ bill depth', 'Panjang paruh ÷ kedalaman paruh'), 1, 1.5, 3.7, [2, 2.5, 3, 3.5])}
${text(320, 246, tr('Box: middle half of the penguins. Thick mark: median. Line: smallest to largest.', 'Kotak: separuh penguin di tengah. Tanda tebal: median. Garis: terkecil sampai terbesar.'), { size: 12 })}
${text(320, 266, tr('Chinstrap and Gentoo overlap on the left; their middle halves do not overlap on the right.', 'Chinstrap dan Gentoo bertumpuk di kiri; separuh tengahnya tidak bertumpuk di kanan.'), { size: 12, fill: 'var(--ink)' })}`);
}

// ---- Figure 4: the order of work for new columns. ----
function order() {
  const b = (x, y, w, h, t1, t2, fill, stroke) => `${box(x, y, w, h, fill, stroke)}${text(x + w / 2, y + 28, t1, { weight: 700, fill: 'var(--ink)', size: 13 })}${t2.map((t, i) => text(x + w / 2, y + 50 + i * 15, t, { size: 12 })).join('')}`;
  const A = 8, w = 108, gap = 17, y0 = 40, h = 96;
  const x = i => A + i * (w + gap);
  return svg(640, 240, `
${b(x(0), y0, w, h, tr('1. Raw', '1. Mentah'), [tr('columns, as', 'kolom apa'), tr('collected', 'adanya')], 'var(--surface)', 'var(--line)')}
${b(x(1), y0, w, h, tr('2. Build', '2. Bangun'), [tr('product, log,', 'hasil kali, log,'), tr('square, ratio', 'kuadrat, rasio')], soft(0), k(0))}
${b(x(2), y0, w, h, tr('3. Fit scaler', '3. Fit scaler'), [tr('mean and sd,', 'rata-rata dan'), tr('train rows only', 'sd, train saja')], soft(1), k(1))}
${b(x(3), y0, w, h, tr('4. Scale', '4. Scale'), [tr('train and test,', 'train dan test,'), tr('same numbers', 'angka sama')], soft(1), k(1))}
${b(x(4), y0, w, h, tr('5. Model', '5. Model'), [tr('fit with', 'dilatih dengan'), tr('a penalty', 'penalti')], soft(2), k(2))}
${[0, 1, 2, 3].map(i => line(x(i) + w + 1, y0 + h / 2, x(i + 1) - 1, y0 + h / 2, { c: 'var(--muted)', w: 2, arrow: true })).join('')}
${line(x(1), y0 + h + 18, x(1) + w, y0 + h + 18, { c: k(0), w: 3 })}
${text(x(1) + w / 2, y0 + h + 38, tr('one row at a time', 'satu baris sekali proses'), { size: 12, fill: k(0), weight: 700 })}
${text(x(1) + w / 2, y0 + h + 54, tr('(safe before the split)', '(aman sebelum split)'), { size: 12 })}
${line(x(2), y0 + h + 18, x(3) + w, y0 + h + 18, { c: k(1), w: 3 })}
${text((x(2) + x(3) + w) / 2, y0 + h + 38, tr('learned from the data', 'dipelajari dari data'), { size: 12, fill: k(1), weight: 700 })}
${text((x(2) + x(3) + w) / 2, y0 + h + 54, tr('from training rows only', 'dari training set saja'), { size: 12 })}
${text(320, 228, tr('The scaler sees the new columns too, so it is fitted after they exist.', 'Scaler ikut melihat kolom baru, jadi dipasang setelah kolom itu ada.'), { size: 13, fill: 'var(--ink)' })}`);
}

export const figures = { 'parallel-or-fan': parallelOrFan, 'log-skew': logSkew, 'bill-ratio': billRatio, 'build-then-scale': order };
