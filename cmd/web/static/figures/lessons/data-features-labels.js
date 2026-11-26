// Figures for the lesson "Data, features and labels": [[figure:data-features-labels/name|Caption]].
// All numbers come from the bundled penguins.csv (data/penguins.md); the rows keep their file row numbers.
import { svg, dot, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const FEATURE = 4, TARGET = 3;   // colors: blue for features, amber for the target
const tint = (i, pct) => `color-mix(in srgb, var(--k${i}) ${pct}%, var(--surface))`;
const SPECIES_COLOR = { Adelie: 0, Gentoo: 1, Chinstrap: 2 };

// Six real rows: [file row number, species, island, bill length, bill depth, flipper, body mass, sex].
const ROWS = [
  [1, 'Adelie', 'Torgersen', 39.1, 18.7, 181, 3750, 'male'],
  [2, 'Adelie', 'Torgersen', 39.5, 17.4, 186, 3800, 'female'],
  [154, 'Gentoo', 'Biscoe', 50.0, 16.3, 230, 5700, 'male'],
  [155, 'Gentoo', 'Biscoe', 48.7, 14.1, 210, 4450, 'female'],
  [277, 'Chinstrap', 'Dream', 46.5, 17.9, 192, 3500, 'female'],
  [278, 'Chinstrap', 'Dream', 50.0, 19.5, 196, 3900, 'male'],
];
const sexName = s => (s === 'male' ? tr('male', 'jantan') : tr('female', 'betina'));

// A data table with its parts named: observation (row), features, target.
function tableAnatomy() {
  const hs = tr(13, 12);   // Indonesian headings are longer
  const cols = [
    { x: 20, w: 52, head: [tr('Row', 'Baris'), ''], get: r => `#${r[0]}` },
    { x: 72, w: 82, head: [tr('Island', 'Pulau'), ''], get: r => r[2] },
    { x: 154, w: 86, head: tr(['Bill length', '(mm)'], ['Panjang', 'paruh (mm)']), get: r => fmt(r[3], { digits: 1 }) },
    { x: 240, w: 86, head: tr(['Bill depth', '(mm)'], ['Kedalaman', 'paruh (mm)']), get: r => fmt(r[4], { digits: 1 }) },
    { x: 326, w: 86, head: tr(['Flipper', 'length (mm)'], ['Panjang', 'sirip (mm)']), get: r => fmt(r[5]) },
    { x: 412, w: 86, head: tr(['Body mass', '(g)'], ['Massa', 'tubuh (g)']), get: r => fmt(r[6]) },
    { x: 498, w: 66, head: [tr('Sex', 'Jenis'), tr('', 'kelamin')], get: r => sexName(r[7]) },
    { x: 564, w: 106, head: [tr('Species', 'Spesies'), ''], get: r => r[1] },
  ];
  const top = 72, headH = 44, rowH = 32, hi = 2, bottom = top + headH + rowH * ROWS.length;
  const cells = cols.map((c, ci) => {
    const feature = ci >= 1 && ci <= 6, target = ci === 7;
    const headFill = target ? soft(TARGET) : feature ? soft(FEATURE) : 'var(--surface)';
    const bodyFill = target ? tint(TARGET, 8) : feature ? tint(FEATURE, 6) : 'var(--surface)';
    const head = `<rect x="${c.x}" y="${top}" width="${c.w}" height="${headH}" fill="${headFill}" stroke="var(--line)" stroke-width="1.4"/>${text(c.x + c.w / 2, top + (c.head[1] ? 19 : 26), c.head[0], { size: hs, weight: 700, fill: 'var(--ink)' })}${c.head[1] ? text(c.x + c.w / 2, top + 36, c.head[1], { size: hs - 1 }) : ''}`;
    const body = ROWS.map((r, i) => {
      const y = top + headH + i * rowH;
      return `<rect x="${c.x}" y="${y}" width="${c.w}" height="${rowH}" fill="${bodyFill}" stroke="var(--line)" stroke-width="1"/>${target ? text(c.x + 28, y + 21, c.get(r), { anchor: 'start', size: 13, weight: 700, fill: 'var(--ink)' }) : text(c.x + c.w / 2, y + 21, c.get(r), { size: 13, weight: 500, fill: 'var(--ink)' })}${target ? dot(c.x + 15, y + 16, k(SPECIES_COLOR[r[1]]), 5) : ''}`;
    }).join('');
    return head + body;
  }).join('');
  const hy = top + headH + hi * rowH;
  return svg(690, 366, `
${text(318, 24, tr('Features: what we know about each penguin', 'Feature: yang kita ketahui tentang tiap penguin'), { ...INK, size: 14, fill: k(FEATURE) })}${line(76, 36, 560, 36, { c: k(FEATURE), w: 3 })}
${text(617, 24, tr('Target', 'Target'), { ...INK, size: 14, fill: k(TARGET) })}${line(568, 36, 666, 36, { c: k(TARGET), w: 3 })}
${text(46, 52, tr('counts rows', 'penomoran'), { size: 11 })}${text(46, 64, tr('only', 'saja'), { size: 11 })}
${cells}
<rect x="20" y="${hy}" width="650" height="${rowH}" rx="4" fill="none" stroke="var(--accent)" stroke-width="3"/>
${text(345, bottom + 28, tr('One row is one observation: here, penguin #154, a Gentoo', 'Satu baris = satu observasi, misalnya penguin #154 (Gentoo)'), { ...INK, size: 14 })}
${text(345, bottom + 48, tr('One column is one kind of fact about every penguin', 'Satu kolom = satu jenis fakta tentang setiap penguin'), { size: 14 })}`);
}

// Numeric vs categorical: the six flipper lengths on a scale, and the island counts of all 344 penguins.
function featureTypes() {
  const L = { x: 16, y: 40, w: 316, h: 220 }, R = { x: 348, y: 40, w: 316, h: 220 };
  const flip = ROWS.map(r => r[5]);
  const mean = flip.reduce((a, b) => a + b, 0) / flip.length;
  const lo = 170, hi = 235, ax = L.x + 24, aw = L.w - 48, X = v => ax + (v - lo) / (hi - lo) * aw, ay = L.y + 112;
  const ticks = [180, 200, 220].map(t => `${line(X(t), ay - 5, X(t), ay + 5, { c: 'var(--muted)', w: 1.6 })}${text(X(t), ay + 22, fmt(t), { size: 12 })}`).join('');
  const pts = ROWS.map(r => dot(X(r[5]), ay, k(SPECIES_COLOR[r[1]]), 7)).join('');
  const meanMark = `<path d="M${X(mean)} ${ay - 12}l8 -14h-16z" fill="var(--ink)"/>${text(X(mean), ay - 38, tr(`mean ${fmt(mean, { digits: 1 })}`, `rata-rata ${fmt(mean, { digits: 1 })}`), { ...INK, size: 13 })}`;
  const islands = [['Biscoe', 168], ['Dream', 124], ['Torgersen', 52]];
  const bx = R.x + 92, bw = 150, bmax = 168;
  const bars = islands.map(([n, c], i) => {
    const y = R.y + 22 + i * 38;
    return `${text(bx - 10, y + 19, n, { anchor: 'end', size: 13, fill: 'var(--ink)' })}<rect x="${bx}" y="${y}" width="${c / bmax * bw}" height="26" rx="4" fill="${soft(FEATURE)}" stroke="${k(FEATURE)}" stroke-width="1.6"/>${text(bx + c / bmax * bw + 8, y + 19, fmt(c), { anchor: 'start', size: 13, weight: 700, fill: 'var(--ink)' })}`;
  }).join('');
  return svg(680, 304, `
${box(L.x, L.y, L.w, L.h)}${box(R.x, R.y, R.w, R.h)}
${text(L.x + L.w / 2, 22, tr('Numeric: flipper length (mm)', 'Numerik: panjang sirip (mm)'), INK)}${text(L.x + L.w / 2, 36, tr('six real penguins', 'enam penguin asli'), { size: 11 })}
${text(R.x + R.w / 2, 22, tr('Categorical: island', 'Kategorikal: pulau'), INK)}${text(R.x + R.w / 2, 36, tr('all 344 penguins', 'semua 344 penguin'), { size: 11 })}
${line(ax - 4, ay, ax + aw + 4, ay, { c: 'var(--muted)', w: 2 })}${ticks}${pts}${meanMark}
${bars}
${text(L.x + L.w / 2, L.y + L.h - 40, tr('bigger means more: averaging makes sense', 'lebih besar = lebih banyak: rata-rata bermakna'), { size: 13, fill: 'var(--ink)' })}
${text(L.x + L.w / 2, L.y + L.h - 20, tr('units matter: millimeters', 'satuan penting: milimeter'), { size: 12 })}
${text(R.x + R.w / 2, R.y + R.h - 62, tr('names with no order: we can count them', 'nama tanpa urutan: hanya bisa dihitung'), { size: 12, fill: 'var(--ink)' })}
${text(R.x + R.w / 2, R.y + R.h - 42, tr('the average of Biscoe and Torgersen is not Dream', 'rata-rata Biscoe dan Torgersen bukan Dream'), { size: 12, fill: 'var(--ink)' })}
${text(R.x + R.w / 2, R.y + R.h - 20, tr('(coding them 1, 2, 3 would pretend it is)', '(memberi kode 1, 2, 3 seolah-olah begitu)'), { size: 12 })}
${text(340, 290, tr('The same penguin table holds both kinds of column.', 'Tabel penguin yang sama memuat kedua jenis kolom.'), { size: 12 })}`);
}

// 12 real penguins per species, picked evenly from the measured rows: [flipper mm, body mass g].
const SAMPLE = {"Adelie":[[195,4675],[194,4200],[188,3300],[190,4600],[193,3800],[190,3600],[187,3800],[208,4300],[190,3900],[187,3150],[199,4475],[185,3650]],"Gentoo":[[210,4550],[217,5850],[215,5100],[220,5400],[210,4200],[208,4300],[214,4650],[209,4600],[218,5300],[222,4875],[219,5500],[222,6000]],"Chinstrap":[[193,3650],[195,4150],[190,3575],[195,4400],[197,4150],[201,4300],[195,3850],[196,3550],[187,3250],[203,4050],[194,3525],[193,3775]]};

// Each row becomes a point: flipper length across, body mass up, color = species (the target).
function rowsAsPoints() {
  const P = { x: 84, y: 44, w: 560, h: 264 };
  const xr = [170, 235], yr = [2500, 6500];
  const X = v => P.x + (v - xr[0]) / (xr[1] - xr[0]) * P.w, Y = v => P.y + P.h - (v - yr[0]) / (yr[1] - yr[0]) * P.h;
  const grid = [3000, 4000, 5000, 6000].map(v => `${line(P.x, Y(v), P.x + P.w, Y(v), { c: 'var(--line)', w: 1 })}${text(P.x - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('')
    + [180, 200, 220].map(v => `${line(X(v), P.y, X(v), P.y + P.h, { c: 'var(--line)', w: 1 })}${text(X(v), P.y + P.h + 18, fmt(v), { size: 12 })}`).join('');
  const dots = Object.entries(SAMPLE).flatMap(([sp, pts]) => pts.map(([f, m]) => `<circle cx="${X(f)}" cy="${Y(m)}" r="6.5" fill="${k(SPECIES_COLOR[sp])}" stroke="var(--surface)" stroke-width="1.5" opacity="0.92"/>`)).join('');
  const hx = X(230), hy = Y(5700);
  const mark = `<circle cx="${hx}" cy="${hy}" r="6.5" fill="${k(SPECIES_COLOR.Gentoo)}"/><circle cx="${hx}" cy="${hy}" r="11" fill="none" stroke="var(--ink)" stroke-width="2.5"/>${text(hx - 18, hy - 12, '#154', { ...INK, size: 13, anchor: 'end' })}`;
  // The label sits in the empty band above the dashed ellipse, tied to it by a short leader.
  const ey = Y(3870) - 62;
  const overlap = `<ellipse cx="${X(193)}" cy="${Y(3870)}" rx="${X(206) - X(193)}" ry="62" fill="none" stroke="var(--ink)" stroke-width="2" stroke-dasharray="5 4"/>${line(X(193), ey - 22, X(193), ey - 2, { c: 'var(--ink)', w: 1.4 })}${text(X(193), ey - 28, tr('Adelie and Chinstrap overlap', 'Adelie dan Chinstrap tumpang tindih'), { size: 13, fill: 'var(--ink)' })}`;
  const names = { Adelie: 'Adelie', Gentoo: 'Gentoo', Chinstrap: 'Chinstrap' };
  // The legend sits above the frame, clear of the gridlines.
  const legend = Object.keys(names).map((s, i) => `${dot(P.x + 8 + i * 110, 20, k(SPECIES_COLOR[s]), 7)}${text(P.x + 24 + i * 110, 25, s, { anchor: 'start', size: 13, fill: 'var(--ink)' })}`).join('');
  return svg(680, 382, `
${box(P.x, P.y, P.w, P.h, 'var(--surface)', 'var(--line)')}${grid}${dots}${overlap}${mark}${legend}
${text(P.x + P.w / 2, P.y + P.h + 38, tr('Flipper length (mm)', 'Panjang sirip (mm)'), { size: 13, fill: 'var(--ink)' })}
<text x="22" y="${P.y + P.h / 2}" text-anchor="middle" font-size="13" font-weight="500" fill="var(--ink)" transform="rotate(-90 22 ${P.y + P.h / 2})">${tr('Body mass (g)', 'Massa tubuh (g)')}</text>
${text(P.x + P.w / 2, 374, tr('Each dot is one row. Its position comes from two numeric features; its color comes from the target.', 'Tiap titik adalah satu baris. Posisinya dari dua feature numerik; warnanya dari target.'), { size: 12 })}`);
}

// One table, three questions: a numeric target, a categorical target, or no target.
function threeTargets() {
  const T = { x: 14, y: 70, w: 204, h: 200 };
  const colX = [T.x + 8, T.x + 88, T.x + 140], colW = [74, 46, 56];
  const heads = [[tr('features', 'feature'), FEATURE], [tr('mass', 'massa'), TARGET], [tr('species', 'spesies'), TARGET]];
  const table = heads.map(([h, c], i) => {
    const rows = [0, 1, 2, 3, 4].map(r => `<rect x="${colX[i]}" y="${T.y + 44 + r * 28}" width="${colW[i]}" height="22" rx="3" fill="${tint(c, 10)}" stroke="var(--line)"/>`).join('');
    return `<rect x="${colX[i]}" y="${T.y + 14}" width="${colW[i]}" height="24" rx="3" fill="${soft(c)}" stroke="${k(c)}" stroke-width="1.4"/>${text(colX[i] + colW[i] / 2, T.y + 30, h, { size: i === 0 ? 12 : 10, weight: 700, fill: 'var(--ink)' })}${rows}`;
  }).join('');
  const cards = [
    { y: 14, c: TARGET, a: tr('Target: body mass (g)', 'Target: massa tubuh (g)'), b: tr('a number: how heavy?', 'sebuah angka: seberapa berat?'), tag: 'regression' },
    { y: 112, c: TARGET, a: tr('Target: species', 'Target: spesies'), b: tr('a category: which one?', 'sebuah kategori: yang mana?'), tag: 'classification' },
    { y: 210, c: 6, a: tr('No target', 'Tanpa target'), b: tr('which penguins look alike?', 'penguin mana yang mirip?'), tag: 'clustering' },
  ];
  const cx = 290, cw = 376, ch = 80;
  const cardSvg = cards.map(cd => `${box(cx, cd.y, cw, ch, tint(cd.c, 8), k(cd.c))}${text(cx + 18, cd.y + 32, cd.a, { anchor: 'start', size: 15, weight: 700, fill: 'var(--ink)' })}${text(cx + 18, cd.y + 58, cd.b, { anchor: 'start', size: 14, fill: 'var(--ink)' })}<rect x="${cx + cw - 128}" y="${cd.y + 22}" width="112" height="28" rx="14" fill="var(--surface)" stroke="${k(cd.c)}" stroke-width="1.6"/>${text(cx + cw - 72, cd.y + 41, cd.tag, { size: 13, weight: 700, fill: 'var(--ink)' })}`).join('');
  const arrows = cards.map(cd => line(T.x + T.w + 6, T.y + T.h / 2, cx - 6, cd.y + ch / 2, { c: 'var(--muted)', w: 2, arrow: true })).join('');
  return svg(680, 332, `
${text(T.x + T.w / 2, 40, tr('One penguin table', 'Satu tabel penguin'), INK)}
${box(T.x, T.y, T.w, T.h)}${table}
${arrows}${cardSvg}
${text(340, 322, tr('The question picks the target; the table stays the same.', 'Pertanyaannyalah yang memilih target; tabelnya tetap.'), { size: 12 })}`);
}

export const figures = {
  'table-anatomy': tableAnatomy,
  'feature-types': featureTypes,
  'rows-as-points': rowsAsPoints,
  'three-targets': threeTargets,
};
