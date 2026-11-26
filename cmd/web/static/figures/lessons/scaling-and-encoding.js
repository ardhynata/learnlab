// Figures for the "Scaling and encoding" lesson.
import { svg, dot, ring, diamond, text, line, box, k, soft, tr, fmt } from '../kit.js';

// The same 16 people drawn twice. Left: the region within a fixed raw distance of the query
// is a thin vertical band (income decides; the band is 4,000 dollars each side, which
// approximates the raw-distance circle because the age gap adds almost nothing). Right: after standardizing it is a round circle.
// People are (income in $1000s, age in years, group 0 = younger, 1 = older).
const PEOPLE = [[35, 26, 0], [48, 31, 0], [60, 24, 0], [75, 33, 0], [90, 28, 0], [105, 35, 0], [55, 36, 0], [82, 22, 0],
  [30, 58, 1], [50, 52, 1], [68, 60, 1], [85, 55, 1], [100, 50, 1], [112, 62, 1], [45, 64, 1], [78, 48, 1]];
const QUERY = [64, 38];

function equalDistance() {
  const mean = j => PEOPLE.reduce((s, p) => s + p[j], 0) / PEOPLE.length;
  const sd = j => Math.sqrt(PEOPLE.reduce((s, p) => s + (p[j] - mean(j)) ** 2, 0) / PEOPLE.length);
  const mx = mean(0), my = mean(1), sx = sd(0), sy = sd(1);
  const L = { x: 10, y: 36, w: 300, h: 220 }, R = { x: 330, y: 36, w: 300, h: 220 };
  const lx = inc => L.x + 20 + (inc - 20) / 100 * 260, ly = age => L.y + 200 - (age - 18) / 52 * 180;
  const U = 56, cx = R.x + R.w / 2, cy = R.y + R.h / 2;
  const rx = inc => cx + (inc - mx) / sx * U, ry = age => cy - (age - my) / sy * U;
  const band = 4 / 100 * 260;
  const inBand = p => Math.abs(p[0] - QUERY[0]) <= 4;
  const zr = 0.6, inCircle = p => Math.hypot((p[0] - QUERY[0]) / sx, (p[1] - QUERY[1]) / sy) <= zr;
  const col = p => k(p[2] === 0 ? 0 : 1);
  return svg(640, 336, `
${box(L.x, L.y, L.w, L.h)}${box(R.x, R.y, R.w, R.h)}
${text(L.x + L.w / 2, 20, tr('Raw units: income in dollars, age in years', 'Satuan mentah: dolar dan tahun'), { weight: 700, fill: 'var(--ink)' })}
${text(R.x + R.w / 2, 20, tr('Standardized: both in z-scores', 'Standardisasi: keduanya z-score'), { weight: 700, fill: 'var(--ink)' })}
<rect x="${lx(QUERY[0]) - band}" y="${L.y + 4}" width="${2 * band}" height="${L.h - 8}" fill="var(--accent-soft)" stroke="${k(4)}" stroke-width="2" stroke-dasharray="6 5"/>
<circle cx="${rx(QUERY[0])}" cy="${ry(QUERY[1])}" r="${zr * U}" fill="var(--accent-soft)" stroke="${k(4)}" stroke-width="2" stroke-dasharray="6 5"/>
${line(R.x + 10, cy, R.x + R.w - 10, cy, { c: 'var(--line)', w: 1.2 })}${line(cx, R.y + 8, cx, R.y + R.h - 8, { c: 'var(--line)', w: 1.2 })}
${PEOPLE.map(p => (inBand(p) ? ring(lx(p[0]), ly(p[1]), col(p), 5.5) : dot(lx(p[0]), ly(p[1]), col(p), 5))).join('')}
${PEOPLE.map(p => (inCircle(p) ? ring(rx(p[0]), ry(p[1]), col(p), 5.5) : dot(rx(p[0]), ry(p[1]), col(p), 5))).join('')}
${diamond(lx(QUERY[0]), ly(QUERY[1]), 'var(--surface)', 8)}${diamond(rx(QUERY[0]), ry(QUERY[1]), 'var(--surface)', 8)}
<text transform="translate(${L.x + 14} ${L.y + L.h / 2}) rotate(-90)" text-anchor="middle" font-size="12" font-weight="500" fill="var(--muted)">${tr('age (younger at the bottom)', 'usia (muda di bawah)')}</text>
<text transform="translate(${R.x + 14} ${R.y + R.h / 2}) rotate(-90)" text-anchor="middle" font-size="12" font-weight="500" fill="var(--muted)">${tr('age, in standard deviations', 'usia, dalam simpangan baku')}</text>
${text(L.x + L.w / 2, L.y + L.h + 16, tr('income: $20k to $120k', 'pendapatan: $20k sampai $120k'), { size: 12 })}${text(R.x + R.w / 2, R.y + R.h + 16, tr('income, in standard deviations', 'pendapatan, dalam simpangan baku'), { size: 12 })}
${text(L.x + L.w / 2, L.y + L.h + 36, tr(`Within about $${fmt(4000)} (shaded):`, `Radius sekitar $${fmt(4000)} (area diarsir):`), { size: 12, fill: k(4), weight: 700 })}${text(L.x + L.w / 2, L.y + L.h + 52, tr('one younger, one older', 'satu muda, satu tua'), { size: 12, fill: k(4), weight: 700 })}
${text(R.x + R.w / 2, R.y + R.h + 36, tr(`Within ${fmt(0.6)} standard deviations (shaded):`, `Radius ${fmt(0.6)} simpangan baku (area diarsir):`), { size: 12, fill: k(4), weight: 700 })}${text(R.x + R.w / 2, R.y + R.h + 52, tr('both neighbors are younger', 'kedua tetangga sama-sama muda'), { size: 12, fill: k(4), weight: 700 })}
${dot(L.x + tr(20, 10), 326, k(0), 5)}${text(L.x + tr(30, 20), 330, tr('younger', 'lebih muda'), { anchor: 'start', size: 12 })}${dot(L.x + tr(100, 98), 326, k(1), 5)}${text(L.x + tr(110, 108), 330, tr('older', 'lebih tua'), { anchor: 'start', size: 12 })}${diamond(L.x + tr(175, 178), 326, 'var(--surface)', 7)}${text(L.x + tr(187, 190), 330, tr('query', 'query'), { anchor: 'start', size: 12 })}`);
}

// One column with an outlier, on three number lines: raw, min-max, standardized.
function outlier() {
  const col = [40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 240];
  const n = col.length, mean = col.reduce((a, b) => a + b) / n;
  const sd = Math.sqrt(col.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const lo = Math.min(...col), hi = Math.max(...col);
  const X0 = 50, X1 = 600;
  const rawX = v => X0 + v / 250 * (X1 - X0);
  const mmX = v => X0 + v * (X1 - X0);
  const zX = z => X0 + (z + 1) / 4.5 * (X1 - X0);
  const row = (y, title, ticks, pos, values) => `
${text(X0, y - 28, title, { anchor: 'start', weight: 700, fill: 'var(--ink)' })}
${line(X0, y, X1, y, { c: 'var(--muted)', w: 1.6 })}
${ticks.map(([v, t]) => line(pos(v), y - 4, pos(v), y + 4, { c: 'var(--muted)', w: 1.4 }) + text(pos(v), y + 20, fmt(t), { size: 12 })).join('')}
${values.map((v, i) => dot(pos(v), y - 12, i === n - 1 ? k(1) : k(0), 4.2)).join('')}`;
  return svg(640, 330, `
${row(60, tr('Raw income, in $1000s: eleven ordinary values, one outlier', 'Pendapatan mentah (ribuan dolar): sebelas nilai biasa, satu outlier'), [0, 50, 100, 150, 200, 250].map(v => [v, v]), rawX, col)}
${row(150, tr(`Min-max: ordinary values squeezed into 0 to ${fmt(0.1)}`, `Min-max: nilai biasa terhimpit ke 0 sampai ${fmt(0.1)}`), [0, 0.25, 0.5, 0.75, 1].map(v => [v, v]), mmX, col.map(v => (v - lo) / (hi - lo)))}
${row(240, tr(`Standardized: ordinary values between z = ${fmt(-0.49)} and ${fmt(-0.11)}`, `Standardisasi: nilai biasa ada di z = ${fmt(-0.49)} sampai ${fmt(-0.11)}`), [-1, 0, 1, 2, 3].map(v => [v, v]), zX, col.map(v => (v - mean) / sd))}
${text(320, 318, tr('Either way the outlier decides how much room the ordinary values get.', 'Apa pun metodenya, outlier yang menentukan seberapa lega ruang untuk nilai biasa.'), { size: 13, fill: 'var(--ink)' })}`);
}

// One-hot encoding of a color column.
function oneHotFigure() {
  const colors = [['red', k(1)], ['green', k(2)], ['blue', k(4)], ['green', k(2)]];
  const cols = [['red', 0], ['green', 1], ['blue', 2]];
  const shown = { red: tr('red', 'merah'), green: tr('green', 'hijau'), blue: tr('blue', 'biru') };
  const rowY = i => 90 + i * 42;
  const left = colors.map(([name, c], i) => `${box(30, rowY(i), 150, 32, soft(c === k(1) ? 1 : c === k(2) ? 2 : 4), c)}${text(105, rowY(i) + 21, shown[name], { weight: 700, fill: 'var(--ink)' })}`).join('');
  const cells = colors.map(([name], i) => cols.map(([, j]) => {
    const on = ['red', 'green', 'blue'][j] === name, c = [k(1), k(2), k(4)][j];
    return `<rect x="${320 + j * 100}" y="${rowY(i)}" width="88" height="32" rx="8" fill="${on ? c : 'var(--surface)'}" stroke="${on ? c : 'var(--line)'}" stroke-width="1.6"/>${text(364 + j * 100, rowY(i) + 22, on ? '1' : '0', { size: 15, weight: 700, fill: on ? '#fff' : 'var(--muted)' })}`;
  }).join('')).join('');
  return svg(640, 300, `
${text(105, 52, tr('color (one column)', 'warna (satu kolom)'), { weight: 700, fill: 'var(--ink)' })}
${text(464, 52, tr('one-hot (three columns)', 'one-hot (tiga kolom)'), { weight: 700, fill: 'var(--ink)' })}
${left}
${line(200, 160, 300, 160, { c: 'var(--muted)', w: 2.2, arrow: true })}
${cols.map(([name, j]) => text(364 + j * 100, 80, `is_${shown[name]}`, { size: 12 })).join('')}
${cells}
${text(320, 278, tr(`Each row has exactly one 1. Every pair of different colors is ${fmt(1.41)} apart.`, `Setiap baris memiliki tepat satu angka 1. Semua pasangan warna yang berbeda berjarak ${fmt(1.41)}.`), { size: 13 })}`);
}

// Fit the scaler on training rows only, then reuse it unchanged.
function noLeak() {
  const b = (x, y, w, h, t1, t2, fill, stroke) => `${box(x, y, w, h, fill, stroke)}${text(x + w / 2, y + (t2 ? h / 2 - 3 : h / 2 + 5), t1, { weight: 700, fill: 'var(--ink)' })}${t2 ? text(x + w / 2, y + h / 2 + 15, t2, { size: 12 }) : ''}`;
  return svg(640, 270, `
${b(20, 100, 110, 56, tr('All rows', 'Semua data'), '', 'var(--surface)', 'var(--line)')}
${line(132, 120, 175, 70, { c: 'var(--muted)', w: 2, arrow: true })}${line(132, 136, 175, 200, { c: 'var(--muted)', w: 2, arrow: true })}
${b(180, 40, 120, 60, tr('Training rows', 'Training set'), '', soft(0), k(0))}${b(180, 170, 120, 60, tr('Test rows', 'Test set'), '', soft(1), k(1))}
${line(302, 70, 345, 70, { c: 'var(--muted)', w: 2, arrow: true })}
${b(350, 30, 170, 80, tr('Fit the scaler', 'Fit scaler'), tr('mean, standard deviation', 'rata-rata, simpangan baku'), soft(0), k(0))}${text(435, 104, tr('from training rows only', 'dari training set saja'), { size: 12 })}
${line(520, 70, 560, 70, { c: 'var(--muted)', w: 2, arrow: true })}${text(600, 66, tr('scale the', 'lalu scale'), { size: 12 })}${text(600, 82, tr('training rows', 'training set'), { size: 12 })}
${line(435, 112, 435, 166, { c: k(0), w: 2.4, arrow: true, dash: '5 4' })}${text(447, 150, tr('same numbers,', 'angka yang sama,'), { anchor: 'start', size: 12 })}${text(447, 166, tr('reused unchanged', 'dipakai ulang apa adanya'), { anchor: 'start', size: 12 })}
${line(302, 200, 345, 200, { c: 'var(--muted)', w: 2, arrow: true })}
${b(350, 170, 170, 60, tr('Scale the test rows', 'Scale test set'), '', soft(1), k(1))}
${text(320, 258, tr('Never compute the mean, standard deviation, minimum or maximum from the test rows.', 'Jangan pernah menghitung rata-rata, simpangan baku, minimum, atau maksimum dari test set.'), { size: 13, fill: 'var(--ink)' })}`);
}

export const figures = { 'equal-distance': equalDistance, 'outlier-squeeze': outlier, 'one-hot': oneHotFigure, 'no-leak': noLeak };
