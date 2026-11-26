// Figures for the lesson "Vision lab":
// [[figure:vision-lab/name|Caption]].
//
// Where the numbers come from (all of it was produced with the lab's own math, sims/ml/vision.js and visionlab.js,
// with the lab's start settings: small CNN with 4 filters, 200 training images, 30 epochs, test strengths 60% less
// light, brightness +0.35, 25 degrees and 2 px; augmentation strengths 2 px, +-0.40 and +-25 degrees):
//   - test-changes-and-copies: the pictures are real. Row 1 is test picture 3 of seed 1 (a ring) under each test
//     condition (applyCondition); row 2 is training picture 1 of seed 1 and four random augmented copies of it.
//   - which-augmentation-helps: mean test accuracy over seeds 1 to 10 for five ways of training. MEAN holds the means
//     in percent, rounded: they come from the counts of correct test pictures out of 120 of all ten seeds.
//   - seed-spread: SPREAD holds, for seeds 1 to 10, the number of the 120 test pictures the network trained WITHOUT
//     augmentation got right under each condition (clean, darker, brighter, rotated, shifted).
//   - iou-on-the-grid: test picture 1 of seed 1 (a bar). True box x 6, y 3, 1 wide and 7 tall; the lab's first
//     predicted box x 6.35, y 4, 1.5 wide and 7.5 tall: overlap 0.65 x 6 = 3.9, union 7 + 11.25 - 3.9 = 14.35, IoU 0.27.
//     After the arrow keys Left twice and Up four times it is x 5.85, y 3: overlap 1 x 7 = 7, union 7 + 11.25 - 7 = 11.25,
//     IoU 0.62.
import { svg, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';
import { applyCondition, augmentImage } from '../../sims/ml/vision.js';
import { makeTask } from '../../sims/ml/visionlab.js';
import { rng } from '../../sims/ml/rng.js';

const CELL = 6, SIDE = 12 * CELL;
const clip = v => Math.max(0, Math.min(1, v));

function tile(x, y, pixels, stroke) {
  const cells = pixels.map((v, n) => {
    const g = Math.round(clip(v) * 255);
    return `<rect x="${x + (n % 12) * CELL}" y="${y + Math.floor(n / 12) * CELL}" width="${CELL}" height="${CELL}" fill="rgb(${g},${g},${g})" shape-rendering="crispEdges"/>`;
  }).join('');
  return `${cells}<rect x="${x - 1.5}" y="${y - 1.5}" width="${SIDE + 3}" height="${SIDE + 3}" rx="3" fill="none" stroke="${stroke}" stroke-width="2.5"/>`;
}

// ---- Figure 1: the four test changes, and random copies of a training picture. ----
function testChangesAndCopies() {
  const W = 640, H = 330;
  const task = makeTask(1, 200);
  const ring = task.test.X[2];
  const tests = [
    [tr('Clean', 'Asli'), '', ring],
    [tr('Darker', 'Lebih gelap'), tr(`${pct(0.6, 0)} less light`, `cahaya -${pct(0.6, 0)}`), applyCondition(ring, { name: 'darker', amount: 0.6 }, 2)],
    [tr('Brighter', 'Lebih terang'), tr(`brightness +${fmt(0.35, { digits: 2 })}`, `kecerahan +${fmt(0.35, { digits: 2 })}`), applyCondition(ring, { name: 'brighter', amount: 0.35 }, 2)],
    [tr('Rotated', 'Diputar'), `${fmt(25)}°`, applyCondition(ring, { name: 'rotated', amount: 25 }, 2)],
    [tr('Shifted', 'Bergeser'), `${fmt(2)} px`, applyCondition(ring, { name: 'shifted', amount: 2 }, 2)],
  ];
  const train = task.train.X[0];
  const augment = { flip: false, shift: 2, brightness: 0.4, rotate: 25 };
  const copies = [
    [tr('Training image', 'Gambar training'), train],
    ...[1, 2, 3, 4].map(i => [tr(`Copy ${fmt(i)}`, `Salinan ${fmt(i)}`), augmentImage(train, augment, rng(i * 17 + 3))]),
  ];
  const gap = 124;
  const row1 = tests.map(([cap, sub, px], i) => `${tile(12 + i * gap, 32, px, k(2))}${text(12 + i * gap + SIDE / 2, 124, cap, { size: 13, fill: 'var(--ink)', weight: 600 })}${text(12 + i * gap + SIDE / 2, 140, sub, { size: 12 })}`).join('');
  const row2 = copies.map(([cap, px], i) => `${tile(12 + i * gap, 202, px, i === 0 ? k(0) : k(4))}${text(12 + i * gap + SIDE / 2, 294, cap, { size: 13, fill: 'var(--ink)', weight: 600 })}`).join('');
  return svg(W, H, `${text(10, 20, tr('Test: one image, five conditions, the same every time', 'Test: satu gambar, lima kondisi, selalu sama'), { anchor: 'start', fill: k(2), weight: 700, size: 14 })}
${row1}
${text(10, 190, tr('Training with augmentation: a new random copy each epoch', 'Training dengan augmentation: salinan acak baru tiap epoch'), { anchor: 'start', fill: k(4), weight: 700, size: 14 })}
${row2}
${text(10, 318, tr('Random shift up to 2 px, brightness jitter ±0.40, rotation up to ±25°.', 'Geser acak hingga 2 px, variasi kecerahan ±0,40, rotasi hingga ±25°.'), { anchor: 'start', size: 12 })}`);
}

// ---- Figure 2: which way of training helps which test. ----
const MEAN = [
  { en: 'No augmentation', id: 'Tanpa augmentation', v: [99, 72, 76, 79, 32] },
  { en: 'Random shift', id: 'Geser acak', v: [96, 25, 36, 75, 92] },
  { en: 'Brightness jitter', id: 'Variasi kecerahan', v: [99, 99, 98, 76, 31] },
  { en: 'Small rotation', id: 'Rotasi kecil', v: [98, 49, 64, 91, 33] },
  { en: 'All three', id: 'Ketiganya', v: [93, 72, 85, 81, 81] },
];
// the cell where the change in training matches the change in the test
const MATCH = new Set(['1,4', '2,1', '2,2', '3,3']);
const CONDITIONS = () => [tr('Clean', 'Asli'), tr('Dark', 'Gelap'), tr('Bright', 'Terang'), tr('Rotated', 'Putar'), tr('Shifted', 'Geser')];

function whichAugmentationHelps() {
  const W = 640, H = 330;
  const x0 = 176, cw = 90, top = 58, rh = 40;
  const heads = CONDITIONS().map((c, j) => text(x0 + j * cw + cw / 2, top - 12, c, { size: 13, fill: 'var(--ink)', weight: 700 })).join('');
  const rows = MEAN.map((r, i) => {
    const y = top + i * rh;
    const cells = r.v.map((v, j) => {
      const mixPct = Math.round(Math.max(0, v - 25) / 75 * 80);
      const fill = `color-mix(in srgb, var(--k2) ${mixPct}%, var(--surface))`;
      const m = MATCH.has(`${i},${j}`);
      return `<rect x="${x0 + j * cw + 2}" y="${y + 2}" width="${cw - 4}" height="${rh - 4}" rx="5" fill="${fill}" stroke="${m ? 'var(--ink)' : 'var(--line)'}" stroke-width="${m ? 2.4 : 1}"/>${text(x0 + j * cw + cw / 2, y + rh / 2 + 5, pct(v / 100, 0), { size: 14, fill: 'var(--ink)', weight: 700 })}`;
    }).join('');
    return `${text(x0 - 10, y + rh / 2 + 5, tr(r.en, r.id), { anchor: 'end', size: 13, fill: 'var(--ink)', weight: 600 })}${cells}`;
  }).join('');
  return svg(W, H, `${text(10, 20, tr('Mean test accuracy, seeds 1 to 10', 'Rata-rata akurasi test, seed 1 sampai 10'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}
${heads}
${rows}
${text(x0, top + 5 * rh + 24, tr('Outlined: the augmentation that matches the test change.', 'Berbingkai tebal: augmentation yang sesuai dengan perubahan test.'), { anchor: 'start', size: 12 })}
${text(x0, top + 5 * rh + 44, tr('25% is guessing. Each cell: 10 networks, 120 test images each.', '25% berarti menebak. Tiap sel: 10 network, masing-masing 120 gambar test.'), { anchor: 'start', size: 12 })}`);
}

// ---- Figure 3: one network, ten seeds. ----
const SPREAD = {
  clean: [118, 119, 115, 120, 119, 120, 120, 118, 120, 117],
  darker: [32, 118, 110, 93, 84, 74, 91, 116, 73, 70],
  brighter: [62, 81, 63, 119, 112, 110, 119, 91, 69, 80],
  rotated: [97, 92, 81, 98, 99, 99, 94, 98, 99, 94],
  shifted: [42, 41, 39, 42, 37, 29, 36, 34, 37, 47],
};

function seedSpread() {
  const W = 640, H = 320;
  const x0 = 120, x1 = 610, X = f => x0 + f * (x1 - x0);
  const names = { clean: tr('Clean', 'Asli'), darker: tr('Darker', 'Lebih gelap'), brighter: tr('Brighter', 'Lebih terang'), rotated: tr('Rotated', 'Diputar'), shifted: tr('Shifted', 'Bergeser') };
  const keys = Object.keys(SPREAD), top = 40, rh = 40;
  const grid = [0, 0.25, 0.5, 0.75, 1].map(t => `${line(X(t), top - 8, X(t), top + keys.length * rh - 6, { c: t === 0.25 ? 'var(--muted)' : 'var(--line)', w: 1, dash: t === 0.25 ? '5 4' : '' })}${text(X(t), top + keys.length * rh + 12, pct(t, 0), { size: 12 })}`).join('');
  const rows = keys.map((key, i) => {
    const y = top + i * rh + 14;
    const dots = SPREAD[key].map((n, s) => {
      const c = n / 120;
      const first = s === 0, second = s === 1;
      return `<circle cx="${X(c)}" cy="${y}" r="${first || second ? 7 : 5}" fill="${first ? k(1) : second ? k(0) : 'var(--muted)'}" fill-opacity="${first || second ? 1 : 0.55}" stroke="var(--surface)" stroke-width="1"/>`;
    }).join('');
    return `${text(x0 - 12, y + 5, names[key], { anchor: 'end', size: 13, fill: 'var(--ink)', weight: 600 })}${dots}`;
  }).join('');
  const lg = top + keys.length * rh + 40;
  const legend = `<circle cx="${x0 + 6}" cy="${lg}" r="7" fill="${k(1)}"/>${text(x0 + 20, lg + 4, tr('Seed 1', 'Seed 1'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
<circle cx="${x0 + 100}" cy="${lg}" r="7" fill="${k(0)}"/>${text(x0 + 114, lg + 4, tr('Seed 2', 'Seed 2'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
<circle cx="${x0 + 194}" cy="${lg}" r="5" fill="var(--muted)" fill-opacity="0.55"/>${text(x0 + 206, lg + 4, tr('Seeds 3 to 10', 'Seed 3 sampai 10'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${text(x0 - 12, lg + 26, tr('dashed line: guessing (25%)', 'garis putus: menebak (25%)'), { anchor: 'start', size: 12 })}`;
  return svg(W, H, `${text(10, 20, tr('Trained without augmentation: test accuracy of ten seeds', 'Dilatih tanpa augmentation: akurasi test sepuluh seed'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}
${grid}
${rows}
${legend}`);
}

// ---- Figure 4: IoU of a dragged box on the pixel grid. ----
function iouOnTheGrid() {
  const W = 640, H = 300;
  const task = makeTask(1, 200);
  const img = task.test.X[0];
  const U = 17, side = 12 * U;
  const truth = { x: 6, y: 3, w: 1, h: 7 };
  const panels = [
    { x: 24, pred: { x: 6.35, y: 4, w: 1.5, h: 7.5 }, inter: 3.9, union: 14.35, iou: 0.27, title: tr('First predicted box', 'Kotak prediksi pertama') },
    { x: 340, pred: { x: 5.85, y: 3, w: 1.5, h: 7.5 }, inter: 7, union: 11.25, iou: 0.62, title: tr('After Left ×2 and Up ×4', 'Setelah Kiri ×2 dan Atas ×4') },
  ];
  const oy = 40;
  const out = panels.map(p => {
    const cells = img.map((v, n) => {
      const g = Math.round(clip(v) * 255);
      return `<rect x="${p.x + (n % 12) * U}" y="${oy + Math.floor(n / 12) * U}" width="${U}" height="${U}" fill="rgb(${g},${g},${g})" shape-rendering="crispEdges"/>`;
    }).join('');
    const r = b => `x="${p.x + b.x * U}" y="${oy + b.y * U}" width="${b.w * U}" height="${b.h * U}"`;
    const ox0 = Math.max(truth.x, p.pred.x), oy0 = Math.max(truth.y, p.pred.y);
    const ox1 = Math.min(truth.x + truth.w, p.pred.x + p.pred.w), oy1 = Math.min(truth.y + truth.h, p.pred.y + p.pred.h);
    const overlap = `<rect x="${p.x + ox0 * U}" y="${oy + oy0 * U}" width="${(ox1 - ox0) * U}" height="${(oy1 - oy0) * U}" fill="${k(2)}" fill-opacity="0.55"/>`;
    return `${cells}${overlap}<rect ${r(truth)} fill="none" stroke="${k(3)}" stroke-width="2.5"/><rect ${r(p.pred)} fill="none" stroke="${k(4)}" stroke-width="2.5" stroke-dasharray="6 4"/>
${text(p.x, 24, p.title, { anchor: 'start', size: 14, fill: 'var(--ink)', weight: 700 })}
${text(p.x + side + 10, oy + 40, `IoU ${fmt(p.iou, { digits: 2 })}`, { anchor: 'start', size: 15, fill: 'var(--ink)', weight: 700 })}
${text(p.x + side + 10, oy + 62, tr(`overlap ${fmt(p.inter)}`, `irisan ${fmt(p.inter)}`), { anchor: 'start', size: 12 })}
${text(p.x + side + 10, oy + 80, tr(`union ${fmt(p.union)}`, `gabungan ${fmt(p.union)}`), { anchor: 'start', size: 12 })}`;
  }).join('');
  return svg(W, H, `${out}
${text(24, H - 14, tr('Solid: true box (1 × 7). Dashed: predicted box. Green: overlap. Threshold 0.50.', 'Garis penuh: kotak benar (1 × 7). Putus-putus: kotak prediksi. Hijau: irisan. Threshold 0,50.'), { anchor: 'start', size: 12 })}`);
}

export const figures = {
  'test-changes-and-copies': testChangesAndCopies,
  'which-augmentation-helps': whichAugmentationHelps,
  'seed-spread': seedSpread,
  'iou-on-the-grid': iouOnTheGrid,
};
