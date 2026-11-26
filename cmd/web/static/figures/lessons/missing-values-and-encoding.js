// Figures for the lesson "Missing values and encoding": [[figure:missing-values-and-encoding/name|Caption]].
// The gap positions come from the bundled penguins.csv (data/penguins.md): file row numbers, counted from 1.
import { svg, dot, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const GAPS = {
  bill_length: [4, 272],
  bill_depth: [4, 272],
  flipper_length: [4, 272],
  body_mass: [4, 272],
  sex: [4, 9, 10, 11, 12, 48, 179, 219, 257, 269, 272],
};
const ROWS = 344;

// One strip per column, one mark per missing value.
function missingMap() {
  const names = {
    bill_length: tr('bill length', 'panjang paruh'),
    bill_depth: tr('bill depth', 'kedalaman paruh'),
    flipper_length: tr('flipper length', 'panjang sirip'),
    body_mass: tr('body mass', 'massa tubuh'),
    sex: tr('sex', 'jenis kelamin'),
  };
  const X0 = 150, X1 = 540, TOP = 62, STEP = 36, H = 22;
  const x = r => X0 + ((r - 1) / (ROWS - 1)) * (X1 - X0);
  const keys = Object.keys(GAPS);
  const bottom = TOP + keys.length * STEP;
  const strips = keys.map((key, i) => {
    const y = TOP + i * STEP;
    return `<rect x="${X0}" y="${y}" width="${X1 - X0}" height="${H}" rx="5" fill="var(--surface)" stroke="var(--line)" stroke-width="1.4"/>
${GAPS[key].map(r => `<rect x="${x(r) - 1.5}" y="${y - 2}" width="3" height="${H + 4}" rx="1" fill="${k(3)}"/>`).join('')}
${text(X0 - 12, y + 16, names[key], { anchor: 'end', size: 13, fill: 'var(--ink)' })}
${text(X1 + 14, y + 16, tr(`${fmt(GAPS[key].length)} missing`, `${fmt(GAPS[key].length)} missing`), { anchor: 'start', size: 13, weight: 700, fill: k(3) })}`;
  }).join('');
  const guide = r => line(x(r), TOP - 14, x(r), bottom - STEP + H + 8, { c: k(3), w: 1.2, dash: '3 4' });
  return svg(640, 300, `
${text(X0, 22, tr('Rows of the penguin file, 1 to 344 (left to right)', 'Baris file penguin, 1 sampai 344 (kiri ke kanan)'), { anchor: 'start', ...INK })}
${guide(4)}${guide(272)}
${text(x(4) + 4, TOP - 20, `#${fmt(4)}`, { anchor: 'start', size: 12 })}${text(x(272), TOP - 20, `#${fmt(272)}`, { size: 12 })}
${strips}
${[1, 100, 200, 300, 344].map(r => line(x(r), bottom - STEP + H + 8, x(r), bottom - STEP + H + 14, { c: 'var(--muted)', w: 1.4 }) + text(x(r), bottom - STEP + H + 28, fmt(r), { size: 12 })).join('')}
${text(320, 274, tr('Rows 4 and 272 have no measurements and no sex.', 'Baris 4 dan 272 kosong di keempat kolom ukuran dan di jenis kelamin.'), { size: 13, fill: 'var(--ink)' })}
${text(320, 292, tr('Nine more penguins lack only the sex.', 'Sembilan penguin lain hanya tanpa jenis kelamin.'), { size: 13, fill: 'var(--ink)' })}`);
}

// Four training masses on a number line, with the mean and the median marked.
function meanVsMedian() {
  const values = [3475, 3650, 3700, 5700];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const median = (values[1] + values[2]) / 2;
  const X0 = 50, X1 = 600, AXIS = 150;
  const x = v => X0 + ((v - 3000) / 3000) * (X1 - X0);
  const ticks = [3000, 4000, 5000, 6000];
  return svg(640, 240, `
${text(X0, 22, tr('Body mass of four training penguins, in grams', 'Massa tubuh empat penguin training, dalam gram'), { anchor: 'start', ...INK })}
${line(X0, AXIS, X1, AXIS, { c: 'var(--muted)', w: 1.8 })}
${ticks.map(t => line(x(t), AXIS - 4, x(t), AXIS + 4, { c: 'var(--muted)', w: 1.4 }) + text(x(t), AXIS + 20, fmt(t), { size: 12 })).join('')}
${line(x(median), AXIS, x(median), 62, { c: k(2), w: 2.4, dash: '6 4' })}
${text(x(median) + 8, 66, tr(`median ${fmt(median)} g`, `median ${fmt(median)} g`), { anchor: 'start', weight: 700, fill: k(2) })}
${values.map((v, i) => dot(x(v), i === 2 ? AXIS - 22 : AXIS - 11, k(0), 7)).join('')}
${text(x(5700), AXIS - 28, tr(`${fmt(5700)} g: one heavy penguin`, `${fmt(5700)} g: satu penguin berat`), { anchor: 'end', size: 12, fill: 'var(--ink)' })}
${line(x(mean), AXIS + 4, x(mean), AXIS + 34, { c: k(1), w: 2.4 })}
<path d="M${x(mean)} ${AXIS + 28}l9 9-9 9-9-9z" fill="${k(1)}" stroke="var(--ink)" stroke-width="2"/>
${text(x(mean) + 16, AXIS + 42, tr(`mean ${fmt(mean, { digits: 2 })} g`, `mean ${fmt(mean, { digits: 2 })} g`), { anchor: 'start', weight: 700, fill: k(1) })}
${text(320, 226, tr('The heavy value drags the mean right. The median stays with the other three.', 'Nilai yang berat menarik mean ke kanan. Median tetap berada di antara tiga nilai lainnya.'), { size: 13, fill: 'var(--ink)' })}`);
}

// Ordinal codes (a line with invented gaps) next to one-hot columns (equal distances).
function codesVsOneHot() {
  const isl = { biscoe: ['Biscoe', k(0)], dream: ['Dream', k(2)], torgersen: ['Torgersen', k(3)] };
  const lx = [70, 160, 250], LY = 176;
  const brace = (x1, x2, y, label) => `${line(x1, y, x2, y, { c: 'var(--ink)', w: 1.8 })}${line(x1, y - 5, x1, y + 5, { c: 'var(--ink)', w: 1.8 })}${line(x2, y - 5, x2, y + 5, { c: 'var(--ink)', w: 1.8 })}${text((x1 + x2) / 2, y - 8, label, { size: 13, ...INK })}`;
  const B = [400, 210], D = [560, 210], T = [480, 210 - 80 * Math.sqrt(3)];
  const edge = (a, b, dx, dy) => `${line(a[0], a[1], b[0], b[1], { c: 'var(--muted)', w: 2 })}${text((a[0] + b[0]) / 2 + dx, (a[1] + b[1]) / 2 + dy, fmt(Math.SQRT2, { digits: 2 }), { size: 12, ...INK })}`;
  return svg(640, 296, `
${text(160, 22, tr('Ordinal codes', 'Kode ordinal'), { ...INK, size: 14 })}
${text(480, 22, tr('One-hot columns', 'Kolom one-hot'), { ...INK, size: 14 })}
${line(320, 36, 320, 280, { c: 'var(--line)', w: 1.4 })}
${brace(lx[0], lx[2], 94, fmt(2))}${brace(lx[0], lx[1], 134, fmt(1))}
${line(lx[0] - 20, LY, lx[2] + 20, LY, { c: 'var(--muted)', w: 1.8 })}
${[isl.biscoe, isl.dream, isl.torgersen].map(([name, c], i) => `${dot(lx[i], LY, c, 9)}${text(lx[i], LY + 28, name, { size: 13, fill: 'var(--ink)' })}${text(lx[i], LY + 45, tr(`code ${fmt(i)}`, `kode ${fmt(i)}`), { size: 12 })}`).join('')}
${text(160, 252, tr('Torgersen looks twice as far from', 'Torgersen tampak dua kali lebih jauh'), { size: 13, fill: 'var(--ink)' })}
${text(160, 270, tr('Biscoe as Dream does.', 'dari Biscoe daripada Dream.'), { size: 13, fill: 'var(--ink)' })}
${edge(B, D, 0, 20)}${edge(B, T, -22, -4)}${edge(D, T, 22, -4)}
${dot(B[0], B[1], isl.biscoe[1], 9)}${dot(D[0], D[1], isl.dream[1], 9)}${dot(T[0], T[1], isl.torgersen[1], 9)}
${text(T[0], T[1] - 16, `Torgersen (0, 0, 1)`, { size: 13, fill: 'var(--ink)' })}
${text(B[0], B[1] + 38, 'Biscoe', { size: 13, fill: 'var(--ink)' })}${text(B[0], B[1] + 54, '(1, 0, 0)', { size: 12 })}
${text(D[0], D[1] + 38, 'Dream', { size: 13, fill: 'var(--ink)' })}${text(D[0], D[1] + 54, '(0, 1, 0)', { size: 12 })}
${text(480, 286, tr('Every pair of islands is the same distance apart.', 'Semua pasangan pulau berjarak sama.'), { size: 13, fill: 'var(--ink)' })}`);
}

// The imputer and encoder learn from the training rows only, then are reused unchanged.
function fitOnTrain() {
  const b = (x, y, w, h, t1, t2, fill, stroke) => `${box(x, y, w, h, fill, stroke)}${text(x + w / 2, y + (t2 ? h / 2 - 3 : h / 2 + 5), t1, INK)}${t2 ? text(x + w / 2, y + h / 2 + 15, t2, { size: 12 }) : ''}`;
  const rows = (...n) => n.map(r => `#${fmt(r)}`).join(' ');
  return svg(640, 300, `
${b(14, 112, 100, 56, tr('All rows', 'Semua data'), '', 'var(--surface)', 'var(--line)')}
${line(116, 128, 150, 78, { c: 'var(--muted)', w: 2, arrow: true })}${line(116, 152, 150, 222, { c: 'var(--muted)', w: 2, arrow: true })}
${b(154, 44, 140, 66, tr('Training rows', 'Baris training'), rows(6, 9, 151, 154), soft(0), k(0))}
${b(154, 196, 140, 66, tr('Test rows', 'Baris test'), rows(152, 155), soft(1), k(1))}
${line(296, 77, 326, 77, { c: 'var(--muted)', w: 2, arrow: true })}
${box(330, 24, 296, 124, soft(0), k(0))}
${text(478, 48, tr('Fit on the training rows only', 'Fit hanya pada baris training'), INK)}
${text(478, 72, tr(`mean mass: ${fmt(4131.25)} g`, `rata-rata massa: ${fmt(4131.25)} g`), { size: 13, fill: 'var(--ink)' })}
${text(478, 92, tr('most frequent sex: male', 'jenis kelamin tersering: male'), { size: 13, fill: 'var(--ink)' })}
${text(478, 112, tr('islands: Biscoe, Dream, Torgersen', 'pulau: Biscoe, Dream, Torgersen'), { size: 13, fill: 'var(--ink)' })}
${text(478, 136, tr('also used to transform these rows', 'juga dipakai untuk mengubah baris ini'), { size: 12 })}
${line(478, 150, 478, 192, { c: k(0), w: 2.4, arrow: true, dash: '5 4' })}${text(490, 176, tr('same numbers, reused unchanged', 'angka yang sama, dipakai apa adanya'), { anchor: 'start', size: 12 })}
${line(296, 229, 326, 229, { c: 'var(--muted)', w: 2, arrow: true })}
${b(330, 198, 296, 62, tr('Transform the test rows', 'Ubah baris test'), tr('never used to fit', 'tidak pernah dipakai untuk fit'), soft(1), k(1))}
${text(320, 288, tr('Split first, then fit on the training rows, then apply to everything.', 'Pisahkan dulu, lalu fit pada baris training, baru terapkan ke semua baris.'), { size: 13, fill: 'var(--ink)' })}`);
}

export const figures = { 'missing-map': missingMap, 'mean-vs-median': meanVsMedian, 'codes-vs-one-hot': codesVsOneHot, 'fit-on-train': fitOnTrain };
