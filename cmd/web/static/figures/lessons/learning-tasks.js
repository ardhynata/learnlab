// Figures for the lesson "Supervised, unsupervised and the three questions":
// [[figure:learning-tasks/name|Caption]]. The dots are real penguins from data/penguins.csv.
import { svg, dot, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };

// Three cards, one per task. Each shows the four columns of the penguin table with the
// target column tinted (clustering has none).
function threeCards() {
  const cols = [tr('Bill', 'Paruh'), tr('Flipper', 'Sirip'), tr('Mass', 'Massa'), tr('Species', 'Spesies')];
  const cards = [
    {
      c: 0, name: tr('Regression', 'Regression'), q: tr('How much?', 'Berapa banyak?'), target: 2,
      ex: tr(['How heavy is this', 'penguin?'], ['Berapa berat', 'penguin ini?']),
      tgt: tr('Target: a number', 'Target: angka'), out: tr('Gives back a number', 'Hasilnya sebuah angka'), sup: 'supervised',
    },
    {
      c: 1, name: tr('Classification', 'Classification'), q: tr('Which one?', 'Yang mana?'), target: 3,
      ex: tr(['Which species is', 'this penguin?'], ['Spesies apa', 'penguin ini?']),
      tgt: tr('Target: a name', 'Target: nama (kelas)'), out: tr('Gives back a class', 'Hasilnya sebuah kelas'), sup: 'supervised',
    },
    {
      c: 2, name: tr('Clustering', 'Clustering'), q: tr('Which belong together?', 'Mana yang satu kelompok?'), target: -1,
      ex: tr(['Do the penguins form', 'natural groups?'], ['Apakah penguin ini', 'membentuk kelompok?']),
      tgt: tr('No target column', 'Tanpa kolom target'), out: tr('Gives back groups', 'Hasilnya kelompok'), sup: 'unsupervised',
    },
  ];
  const w = 208, gap = 12, x0 = 14, top = 8, h = 262, cell = 47;
  const body = cards.map((cd, i) => {
    const x = x0 + i * (w + gap), cx = x + w / 2;
    const strip = cols.map((name, j) => {
      const hit = j === cd.target;
      return `<rect x="${x + 10 + j * cell}" y="${top + 136}" width="${cell}" height="30" fill="${hit ? k(cd.c) : soft(6)}" stroke="var(--line)" stroke-width="1.2"/>${text(x + 10 + j * cell + cell / 2, top + 156, name, { size: 10, weight: hit ? 600 : 500, fill: hit ? 'var(--surface)' : 'var(--muted)' })}`;
    }).join('');
    return `${box(x, top, w, h, soft(cd.c), k(cd.c))}
${text(cx, top + 32, cd.name, { ...INK, size: 18, fill: k(cd.c) })}
${text(cx, top + 58, cd.q, { ...INK, size: 13.5 })}
${text(cx, top + 88, cd.ex[0], { size: 12.5 })}${text(cx, top + 105, cd.ex[1], { size: 12.5 })}
${strip}
${text(cx, top + 190, cd.tgt, { ...INK, size: 13 })}
${text(cx, top + 212, cd.out, { size: 13 })}
${text(cx, top + 242, cd.sup === 'supervised' ? 'supervised' : 'unsupervised', { weight: 700, size: 13, fill: k(cd.c) })}`;
  }).join('');
  return svg(680, 280, body);
}

// A decision chart: is there a column to predict, and does it hold numbers or names?
function taskChooser() {
  // A box with one or two title lines; result boxes also get a small line and a supervision tag.
  const node = (x, y, w, h, lines, c, sub, tag) => {
    const ink = c == null ? 'var(--ink)' : k(c), cy = y + h / 2;
    const ys = sub ? [cy - 16] : lines.length === 2 ? [cy - 5, cy + 14] : [cy + 5];
    return `${box(x, y, w, h, c == null ? 'var(--surface)' : soft(c), c == null ? 'var(--line)' : k(c))}${lines.map((t, i) => text(x + w / 2, ys[i], t, { ...INK, size: 14, fill: ink })).join('')}${sub ? text(x + w / 2, cy + 3, sub, { size: 12 }) : ''}${tag ? text(x + w / 2, cy + 22, tag, { size: 12, weight: 700, fill: ink }) : ''}`;
  };
  const q1 = [8, 98, 190, 78], q2 = [252, 18, 178, 78];
  return svg(680, 270, `
${node(q1[0], q1[1], q1[2], q1[3], [tr('Is there a column', 'Adakah kolom'), tr('you want to predict?', 'yang ingin diprediksi?')], null)}
${node(q2[0], q2[1], q2[2], q2[3], [tr('Does it hold', 'Apakah isinya'), tr('numbers or names?', 'angka atau nama?')], null)}
${line(198, 122, 250, 76, { c: 'var(--muted)', arrow: true, w: 2.4 })}${text(208, 82, tr('yes', 'ya'), { size: 13, fill: 'var(--ink)', weight: 700 })}
${line(198, 154, 250, 214, { c: 'var(--muted)', arrow: true, w: 2.4 })}${text(204, 208, tr('no', 'tidak'), { size: 13, fill: 'var(--ink)', weight: 700 })}
${line(430, 48, 500, 43, { c: 'var(--muted)', arrow: true, w: 2.4 })}${text(466, 32, tr('numbers', 'angka'), { size: 13, fill: 'var(--ink)', weight: 700 })}
${line(430, 70, 500, 128, { c: 'var(--muted)', arrow: true, w: 2.4 })}${text(438, 110, tr('names', 'nama'), { size: 13, fill: 'var(--ink)', weight: 700 })}
${node(504, 4, 164, 78, ['Regression'], 0, tr('predict a number', 'prediksi angka'), 'supervised')}
${node(504, 92, 164, 78, ['Classification'], 1, tr('predict a class', 'prediksi kelas'), 'supervised')}
${node(252, 182, 190, 80, ['Clustering'], 2, tr('find groups, no labels', 'cari kelompok, tanpa label'), 'unsupervised')}`);
}

// Eighteen real penguins (six per species, spread through the file): [flipper mm, mass g, species].
// Species 0 Adelie, 1 Chinstrap, 2 Gentoo.
const PENGUINS = [
  [191, 3800, 0], [181, 3300, 0], [192, 4050, 0], [190, 3600, 0], [191, 3900, 0], [193, 4250, 0],
  [198, 3950, 1], [181, 3700, 1], [191, 3700, 1], [205, 4500, 1], [201, 3950, 1], [195, 3650, 1],
  [214, 4650, 2], [222, 5250, 2], [220, 5300, 2], [221, 5000, 2], [212, 4750, 2], [213, 4650, 2],
];
const SPECIES = ['Adelie', 'Chinstrap', 'Gentoo'];

// Three outputs on the same eighteen penguins: a line, a class boundary, two groups.
function threeOutputs() {
  const w = 190, h = 168, oy = 58, xs = [30, 250, 470];
  const view = { x: [175, 230], y: [2800, 5800] };
  const X = (ox, v) => ox + (v - view.x[0]) / (view.x[1] - view.x[0]) * w;
  const Y = v => oy + h - (v - view.y[0]) / (view.y[1] - view.y[0]) * h;
  const frame = (ox, title, sub, c) => `${box(ox, oy, w, h)}${text(ox + w / 2, 26, title, { ...INK, fill: k(c), size: 15 })}${text(ox + w / 2, 44, sub, { size: 12 })}${[180, 200, 220].map(t => `${line(X(ox, t), oy + h, X(ox, t), oy + h + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(ox, t), oy + h + 19, fmt(t), { size: 11 })}`).join('')}`;
  // Panel 1: the fitted line mass = -5781 + 49.7 x flipper, drawn over the dots.
  const f = v => -5781 + 49.7 * v;
  const p1 = `${frame(xs[0], tr('Regression', 'Regression'), tr('a number out', 'keluar: angka'), 0)}
${PENGUINS.map(p => dot(X(xs[0], p[0]), Y(p[1]), 'var(--muted)', 5.5)).join('')}
${line(X(xs[0], 177), Y(f(177)), X(xs[0], 228), Y(f(228)), { c: 'var(--accent)', w: 3.2 })}
${text(xs[0] + w / 2, oy + h + 38, tr(`about +${fmt(50)} g per mm of flipper`, `sekitar +${fmt(50)} g per mm sirip`), { size: 12, fill: 'var(--ink)' })}`;
  // Panel 2: species colors and the rule "flipper at least 208 mm means Gentoo".
  const cut = X(xs[1], 208);
  const p2 = `${frame(xs[1], tr('Classification', 'Classification'), tr('a class out', 'keluar: kelas'), 1)}
${line(cut, oy + 6, cut, oy + h - 6, { c: 'var(--ink)', w: 2.4, dash: '6 5' })}
${PENGUINS.map(p => dot(X(xs[1], p[0]), Y(p[1]), k(p[2]), 5.5)).join('')}
${text(xs[1] + (cut - xs[1]) / 2, oy + 20, tr('not Gentoo', 'bukan Gentoo'), { size: 12, fill: 'var(--ink)', weight: 700 })}${text(cut + (xs[1] + w - cut) / 2, oy + 20, 'Gentoo', { size: 12, fill: 'var(--ink)', weight: 700 })}
${text(xs[1] + w / 2, oy + h + 38, tr(`rule: flipper at least ${fmt(208)} mm`, `aturan: sirip minimal ${fmt(208)} mm`), { size: 12, fill: 'var(--ink)' })}`;
  // Panel 3: two groups found without the species (they match the Gentoo and the rest here).
  const group = p => (p[2] === 2 ? 1 : 0);
  const gc = [3, 4];
  const ell = (g, cx, cy, rx, ry) => `<ellipse cx="${X(xs[2], cx)}" cy="${Y(cy)}" rx="${rx}" ry="${ry}" fill="none" stroke="${k(gc[g])}" stroke-width="2.2" stroke-dasharray="5 4"/>`;
  const p3 = `${frame(xs[2], tr('Clustering', 'Clustering'), tr('groups out', 'keluar: kelompok'), 2)}
${ell(0, 194, 4000, 62, 60)}${ell(1, 217, 4975, 34, 42)}
${PENGUINS.map(p => dot(X(xs[2], p[0]), Y(p[1]), k(gc[group(p)]), 5.5)).join('')}
${text(xs[2] + 8, oy + 20, tr('group A', 'kelompok A'), { anchor: 'start', size: 12, weight: 700, fill: k(gc[0]) })}${text(xs[2] + w - 8, oy + h - 12, tr('group B', 'kelompok B'), { anchor: 'end', size: 12, weight: 700, fill: k(gc[1]) })}
${text(xs[2] + w / 2, oy + h + 38, tr('species not used', 'spesies tidak dipakai'), { size: 12, fill: 'var(--ink)' })}`;
  const legend = SPECIES.map((s, i) => `${dot(228 + i * 100, 310, k(i), 6)}${text(238 + i * 100, 314, s, { anchor: 'start', size: 12, fill: 'var(--ink)' })}`).join('');
  return svg(680, 328, `${p1}${p2}${p3}
${text(340, 286, tr('Every panel: flipper length (mm) across, body mass (g) up. Species colors in the middle panel only.', 'Semua panel: panjang sirip (mm) ke kanan, massa tubuh (g) ke atas. Warna spesies hanya di panel tengah.'), { size: 12 })}
${legend}`);
}

export const figures = {
  'three-cards': threeCards,
  'task-chooser': taskChooser,
  'three-outputs': threeOutputs,
};
