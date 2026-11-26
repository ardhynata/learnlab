// Figures for the "Representation lab" lesson: [[figure:representation-lab/name|Caption]].
//
// Where the numbers come from. The lab trains an autoencoder (about a second or more), so the figures do not run
// it. Every number below was computed with the lab's own math (sims/ml/representation.js and representationlab.js,
// the same calls the lab makes) and checked against the lab's table in a browser for the defaults. Scores are the
// lab's: the mean of 3 random labelled sets (2 for the network from scratch), accuracy on the held-out test rows.
//   - GLYPH_CURVE: generated glyphs, seed 1, noise 15%, bottleneck 8, 20 pretraining epochs. Labelled glyphs per
//     shape -> [frozen, raw, from scratch].
//   - KNOBS: the same data and seed, 5 labelled glyphs per shape. Bottleneck 3, 8 and 16 at 20 epochs; epochs 5, 20
//     and 100 at bottleneck 8. RAW_AT_5 is the raw-pixel score at 5 per shape, 85.1%, which no pretraining
//     setting changes.
//   - PENGUIN_SPLITS: real penguins (344 rows, 342 complete), seeds 1 to 4 of the lab's "New split" button, 100
//     epochs, 5 labelled penguins per species. frozen2 and frozen3 are bottleneck 2 and 3.
//   - ARM_NUMBERS: numbers the labels must set, for 4 one-vs-rest models: 4 x (8 + 1), 4 x (64 + 1) and
//     4 x (64 x 8 + 8 + 8 + 1).
import { svg, dot, ring, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';

const COLOR = { frozen: k(4), raw: k(6), scratch: k(5) };
const ARM_NUMBERS = { frozen: 36, raw: 260, scratch: 2116 };
const GLYPH_CURVE = [
  [2, 0.913, 0.808, 0.744], [5, 0.942, 0.851, 0.792], [10, 0.943, 0.885, 0.850],
  [25, 0.946, 0.932, 0.902], [50, 0.944, 0.950, 0.938], [100, 0.946, 0.958, 0.935],
];
const RAW_AT_5 = 0.851;
const KNOBS = {
  bottleneck: [[3, 0.722], [8, 0.942], [16, 0.933]],
  epochs: [[5, 0.763], [20, 0.942], [100, 0.938]],
};
const PENGUIN_SPLITS = [
  { frozen2: 0.825, frozen3: 0.982, raw: 0.988 },
  { frozen2: 0.861, frozen3: 0.980, raw: 0.975 },
  { frozen2: 0.902, frozen3: 0.978, raw: 0.982 },
  { frozen2: 0.912, frozen3: 0.982, raw: 0.988 },
];

const rawText = (x, y, t, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.anchor ?? 'middle'}" font-size="${o.size ?? 12}" font-weight="${o.weight ?? 500}" fill="${o.fill ?? 'var(--muted)'}" ${o.rotate ? `transform="rotate(${o.rotate} ${x} ${y})"` : ''}>${t}</text>`;
const square = (x, y, c, r = 5.5) => `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" fill="${c}"/>`;
const triangle = (x, y, c, r = 6.5) => `<path d="M${x} ${y - r - 1}L${x + r + 1} ${y + r}L${x - r - 1} ${y + r}Z" fill="${c}"/>`;

// ---- Figure 1: the three arms. ----
function threeArms() {
  const W = 640, H = 300, bh = 46;
  const tops = [34, 124, 214];
  const bx = { a: 10, b: 148, c: 286, d: 414 }, bw = { a: 120, b: 120, c: 112, d: 124 };
  const lane = (top, color, name, n) => `${text(10, top - 9, name, { anchor: 'start', fill: color, weight: 700, size: 14 })}
${text(590, top + bh / 2 - 2, fmt(n), { fill: color, weight: 700, size: 20 })}
${text(590, top + bh / 2 + 15, tr('numbers to set', 'angka ditentukan'), { size: 12, fill: 'var(--ink)' })}`;
  const cell = (x, w, top, l1, l2, o = {}) => `${box(x, top, w, bh, o.fill ?? 'var(--surface)', o.stroke ?? 'var(--line)')}
${text(x + w / 2, top + 20, l1, { fill: 'var(--ink)', weight: 600, size: 12 })}${text(x + w / 2, top + 36, l2, { size: 12, fill: 'var(--ink)' })}`;
  const arrow = (x1, x2, top) => line(x1 + 2, top + bh / 2, x2 - 2, top + bh / 2, { c: 'var(--muted)', w: 1.8, arrow: true });
  const [ta, tb, tc] = tops;
  const A = `${lane(ta, COLOR.frozen, tr('Frozen pretrained features', 'Fitur pretrained yang dibekukan'), ARM_NUMBERS.frozen)}
${cell(bx.a, bw.a, ta, tr('Unlabelled pool', 'Pool tanpa label'), tr('400 glyphs', '400 glyph'))}
${arrow(bx.a + bw.a, bx.b, ta)}
${cell(bx.b, bw.b, ta, tr('Encoder', 'Encoder'), tr('frozen once trained', 'dibekukan'), { fill: soft(4) })}
${arrow(bx.b + bw.b, bx.c, ta)}
${cell(bx.c, bw.c, ta, tr('Code', 'Kode'), `${fmt(8)} ${tr('numbers', 'angka')}`)}
${arrow(bx.c + bw.c, bx.d, ta)}
${cell(bx.d, bw.d, ta, tr('Linear classifier', 'Classifier linear'), tr('labels train this', 'dilatih oleh label'), { stroke: COLOR.frozen })}`;
  const B = `${lane(tb, COLOR.raw, tr('Raw pixels', 'Piksel mentah'), ARM_NUMBERS.raw)}
${cell(bx.c, bw.c, tb, tr('Raw pixels', 'Piksel mentah'), `${fmt(64)} ${tr('numbers', 'angka')}`)}
${arrow(bx.c + bw.c, bx.d, tb)}
${cell(bx.d, bw.d, tb, tr('Linear classifier', 'Classifier linear'), tr('labels train this', 'dilatih oleh label'), { stroke: COLOR.raw })}`;
  const C = `${lane(tc, COLOR.scratch, tr('Network from scratch', 'Network dari nol'), ARM_NUMBERS.scratch)}
${cell(bx.c, bw.c, tc, tr('Raw pixels', 'Piksel mentah'), `${fmt(64)} ${tr('numbers', 'angka')}`)}
${arrow(bx.c + bw.c, bx.d, tc)}
${cell(bx.d, bw.d, tc, tr('Small network', 'Network kecil'), tr('labels train all', 'dilatih seluruhnya'), { stroke: COLOR.scratch })}`;
  return svg(W, H, `${A}${B}${C}${text(320, 290, tr('Coloured outline: the part the labelled glyphs train. Counts are for 4 shapes.', 'Garis berwarna: bagian yang dilatih glyph berlabel. Hitungan untuk 4 bentuk.'), { size: 12 })}`);
}

// ---- Figure 2: test accuracy against labelled glyphs per shape. ----
function labelsCurve() {
  const W = 640, H = 330, L = 66, R = 616, T = 62, B = 270;
  const lo = Math.log(2), hi = Math.log(100);
  const X = s => L + (Math.log(s) - lo) / (hi - lo) * (R - L);
  const Y = a => B - (a - 0.2) / 0.8 * (B - T);
  const grid = [0.2, 0.4, 0.6, 0.8, 1].map(a => `${line(L, Y(a), R, Y(a), { c: 'var(--line)', w: 1 })}${rawText(L - 8, Y(a) + 4, pct(a, 0), { anchor: 'end' })}`).join('');
  const xt = GLYPH_CURVE.map(r => `${line(X(r[0]), B, X(r[0]), B + 5, { c: 'var(--muted)', w: 1 })}${rawText(X(r[0]), B + 20, fmt(r[0]))}`).join('');
  const series = (idx, mark, dash) => {
    const pts = GLYPH_CURVE.map(r => [X(r[0]), Y(r[idx])]);
    const path = `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('')}" fill="none" stroke="${mark.c}" stroke-width="2.6" ${dash ? 'stroke-dasharray="7 5"' : ''} stroke-linejoin="round"/>`;
    return path + pts.map(p => mark.draw(p[0], p[1], mark.c)).join('');
  };
  const legend = [
    ['frozen', tr('Frozen pretrained features', 'Fitur pretrained yang dibekukan'), dot],
    ['raw', tr('Raw pixels', 'Piksel mentah'), square],
    ['scratch', tr('Network from scratch (dashed)', 'Network dari nol (putus-putus)'), triangle],
  ];
  let cursor = 26;
  const leg = legend.map(([key, label, draw]) => {
    const x = cursor;
    cursor += 38 + label.length * 6.5;
    return `${draw(x + 6, 16, COLOR[key], key === 'frozen' ? 6 : undefined)}${rawText(x + 18, 20, label, { anchor: 'start', fill: 'var(--ink)', weight: 600 })}`;
  }).join('');
  const chanceY = Y(0.25);
  return svg(W, H, `${box(L, T, R - L, B - T, 'var(--surface)', 'var(--line)')}${grid}${xt}
${line(L, chanceY, R, chanceY, { c: 'var(--muted)', w: 1.4, dash: '2 4' })}${rawText(R - 4, chanceY - 5, `${tr('chance', 'peluang acak')} ${pct(0.25, 0)}`, { anchor: 'end' })}
${series(3, { c: COLOR.scratch, draw: triangle }, true)}${series(2, { c: COLOR.raw, draw: square }, false)}${series(1, { c: COLOR.frozen, draw: (x, y, c) => dot(x, y, c, 5) }, false)}
${leg}
${rawText((L + R) / 2, B + 42, tr('Labelled glyphs per shape (log scale)', 'Glyph berlabel per bentuk (skala log)'))}
${rawText(L, T - 12, tr('Test accuracy', 'Akurasi test'), { anchor: 'start', fill: 'var(--ink)', weight: 600 })}`);
}

// ---- Figure 3: two knobs of the pretraining. ----
function knobs() {
  const W = 640, H = 310, T = 56, B = 246, h = B - T;
  const Y = a => B - a * h;
  const panel = (x0, w, title, data) => {
    const bw = 52, step = w / data.length;
    const bars = data.map(([v, a], i) => {
      const cx = x0 + step * (i + 0.5);
      return `<rect x="${cx - bw / 2}" y="${Y(a)}" width="${bw}" height="${B - Y(a)}" rx="4" fill="${COLOR.frozen}"/>
${rawText(cx, Y(a) + 40, pct(a, 1), { fill: 'var(--surface)', weight: 700, size: 13 })}${rawText(cx, B + 19, fmt(v), { fill: 'var(--ink)', size: 13 })}`;
    }).join('');
    return `${line(x0, B, x0 + w, B, { c: 'var(--muted)', w: 1.4 })}
${bars}
${line(x0, Y(RAW_AT_5), x0 + w, Y(RAW_AT_5), { c: COLOR.raw, w: 2.2, dash: '6 4' })}
${rawText(x0 + w / 2, B + 42, title, { fill: 'var(--ink)', weight: 600, size: 13 })}`;
  };
  return svg(W, H, `${panel(30, 280, tr('Bottleneck size (numbers in the code)', 'Ukuran bottleneck (jumlah angka dalam kode)'), KNOBS.bottleneck)}
${panel(350, 280, tr('Pretraining epochs', 'Epoch pretraining'), KNOBS.epochs)}
${rawText(30, 22, tr('Frozen features, test accuracy at 5 labelled glyphs per shape', 'Fitur beku, akurasi test pada 5 glyph berlabel per bentuk'), { anchor: 'start', fill: 'var(--ink)', weight: 600, size: 13 })}
${line(30, 42, 60, 42, { c: COLOR.raw, w: 2.2, dash: '6 4' })}${rawText(66, 46, `${tr('dashed: raw pixels', 'putus-putus: piksel mentah')} ${pct(RAW_AT_5, 1)}`, { anchor: 'start', fill: COLOR.raw, weight: 700 })}`);
}

// ---- Figure 4: four penguin splits. ----
function penguinSplits() {
  const W = 640, H = 330, L = 66, R = 616, T = 62, B = 270;
  const Y = a => B - (a - 0.7) / 0.3 * (B - T);
  const colW = (R - L) / PENGUIN_SPLITS.length;
  const cx = i => L + colW * (i + 0.5);
  const off = { frozen2: -26, frozen3: 0, raw: 26 };
  const grid = [0.7, 0.8, 0.9, 1].map(a => `${line(L, Y(a), R, Y(a), { c: 'var(--line)', w: 1 })}${rawText(L - 8, Y(a) + 4, pct(a, 0), { anchor: 'end' })}`).join('');
  const cols = PENGUIN_SPLITS.map((s, i) => {
    const x = cx(i);
    return `${rawText(x, B + 20, `${tr('Split', 'Pembagian')} ${fmt(i + 1)}`, { fill: 'var(--ink)', size: 13 })}
${dot(x + off.frozen2, Y(s.frozen2), COLOR.frozen, 6)}${rawText(x + off.frozen2, Y(s.frozen2) + 21, fmt(s.frozen2 * 100, { digits: 1 }), { fill: 'var(--ink)', size: 12, weight: 600 })}
${ring(x + off.frozen3, Y(s.frozen3), COLOR.frozen, 6)}
${square(x + off.raw, Y(s.raw), COLOR.raw)}`;
  }).join('');
  const legend = [
    [dot(0, 0, COLOR.frozen, 6), tr('Frozen code, 2 numbers', 'Kode beku, 2 angka')],
    [ring(0, 0, COLOR.frozen, 6), tr('Frozen code, 3 numbers', 'Kode beku, 3 angka')],
    [square(0, 0, COLOR.raw), tr('Raw measurements', 'Pengukuran mentah')],
  ];
  let cursor = 26;
  const leg = legend.map(([mark, label]) => {
    const x = cursor;
    cursor += 52 + label.length * 6.5;
    return `<g transform="translate(${x + 6} 16)">${mark}</g>${rawText(x + 18, 20, label, { anchor: 'start', fill: 'var(--ink)', weight: 600 })}`;
  }).join('');
  return svg(W, H, `${box(L, T, R - L, B - T, 'var(--surface)', 'var(--line)')}${grid}${cols}${leg}
${rawText((L + R) / 2, B + 44, tr('Test accuracy at 5 labelled penguins per species (the axis starts at 70%)', 'Akurasi test pada 5 penguin berlabel per spesies (sumbu mulai dari 70%)'))}`);
}

export const figures = { 'three-arms': threeArms, 'labels-curve': labelsCurve, knobs, 'penguin-splits': penguinSplits };
