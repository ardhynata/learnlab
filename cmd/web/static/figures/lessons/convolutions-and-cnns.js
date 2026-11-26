// Figures for the lesson "Convolutions and CNNs": [[figure:convolutions-and-cnns/name|Caption]].
//
// Where the numbers come from. Every figure is drawn synchronously, so the data it needs is written down here.
//   - GLYPH: a 7 x 7 picture of the digit 7 (1 = ink), invented for the lesson. SHUFFLE is a fixed permutation of
//     its 49 positions, built by a small seeded generator so the picture is the same on every draw.
//   - PATCH: the 5 x 5 image patch of the lesson's hand example (brightness 0 to 9, dark on the left, bright on
//     the right, with a little noise), FILTER: the vertical-edge filter (-1 0 1 in every row). Their feature map
//     is computed here with the same sliding sum the lesson does by hand: [[3, 23, 22], [3, 24, 22], [1, 24, 23]].
//   - NET: the lesson's small CNN for a 28 x 28 grey image. Sizes: 28 -> 26 (3 x 3 filter, no padding) -> 13
//     (2 x 2 pooling) -> 11 (3 x 3 filter) -> 5 (2 x 2 pooling; the odd last row and column of 11 are dropped).
//     Weights count filters x (kernel x kernel x input channels) + one bias per filter: 8 x 9 + 8 = 80,
//     16 x 72 + 16 = 1168, and the dense layer 400 x 10 + 10 = 4010.
//   - RECEPTIVE: the field grows by (kernel - 1) x jump per layer, and the jump doubles after each 2 x 2 pool:
//     conv 3 (jump 1) -> 3, pool 2 -> 4 (jump 2), conv 3 -> 4 + 2 x 2 = 8, pool 2 -> 8 + 1 x 2 = 10 (jump 4).
import { svg, text, line, box, k, tr, fmt } from '../kit.js';

const cell = (x, y, s, fill, stroke = 'var(--line)', sw = 1.2) =>
  `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const dims = (...d) => d.map(v => fmt(v)).join(' × ');
const tint = (c, pct) => `color-mix(in srgb, var(--k${c}) ${Math.round(pct)}%, var(--surface))`;

// ---- Figure 1: the same pixels, with and without their neighbours. ----
const GLYPH = [
  [1, 1, 1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0],
  [0, 1, 0, 0, 0, 0, 0],
];

function shuffleOrder(n) {
  const order = Array.from({ length: n }, (_, i) => i);
  let s = 7;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
const SHUFFLE = shuffleOrder(49);

function pixelsNotColumns() {
  const S = 28, n = 7;
  const flat = GLYPH.flat();
  const grid = (ox, oy, vals) => {
    let g = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      g += cell(ox + c * S, oy + r * S, S, vals[r * n + c] ? k(1) : 'var(--surface)');
    }
    return g;
  };
  const shuffled = flat.map((_, i) => flat[SHUFFLE[i]]);
  const lx = 50, rx = 394, top = 64;
  return svg(640, 330, `${text(lx + 98, 28, tr('The picture: pixels in place', 'Gambar: piksel di tempatnya'), { fill: 'var(--ink)', weight: 700, size: 14 })}
${text(rx + 98, 28, tr('The same pixels, columns shuffled', 'Piksel yang sama, kolomnya diacak'), { fill: 'var(--ink)', weight: 700, size: 14 })}
${grid(lx, top, flat)}${grid(rx, top, shuffled)}
${line(268, top + 98, 372, top + 98, { c: 'var(--muted)', w: 2, arrow: true })}
${text(320, top + 84, tr('shuffle', 'acak'), { size: 13 })}
${text(lx + 98, top + 7 * S + 24, tr('Neighbours sit side by side', 'Tetangga saling berdekatan'), { fill: k(1), weight: 700, size: 13 })}
${text(rx + 98, top + 7 * S + 24, tr('Neighbours are scattered', 'Tetangga tersebar'), { fill: k(3), weight: 700, size: 13 })}
${text(320, 306, `${fmt(49)} ${tr('numbers in both. A model that reads columns on their own does not care which is which.', 'angka di keduanya. Model yang membaca kolom satu per satu tidak peduli yang mana.')}`, { fill: 'var(--ink)', weight: 600, size: 12 })}`);
}

// ---- Figure 2: a filter sliding over a patch. ----
const PATCH = [
  [1, 1, 2, 8, 9],
  [0, 1, 1, 9, 9],
  [1, 0, 2, 8, 9],
  [0, 1, 1, 9, 8],
  [1, 1, 0, 9, 9],
];
const FILTER = [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]];

function slide(patch, filt) {
  const n = patch.length - filt.length + 1, out = [];
  for (let r = 0; r < n; r++) {
    out.push([]);
    for (let c = 0; c < n; c++) {
      let s = 0;
      for (let i = 0; i < filt.length; i++) for (let j = 0; j < filt.length; j++) s += patch[r + i][c + j] * filt[i][j];
      out[r].push(s);
    }
  }
  return out;
}

function slidingFilter() {
  const S = 36, top = 56;
  const px = 22, fx = 250, mx = 430;
  const map = slide(PATCH, FILTER);
  const numbers = (ox, oy, rows, fill) => {
    let g = '';
    rows.forEach((row, r) => row.forEach((v, c) => {
      g += cell(ox + c * S, oy + r * S, S, fill(v));
      g += text(ox + c * S + S / 2, oy + r * S + S / 2 + 5, fmt(v), { fill: 'var(--ink)', weight: 600, size: 14 });
    }));
    return g;
  };
  const wc = 1; // the highlighted window starts at row 0, column 1
  const patchTop = top + 10;
  const win = `<rect x="${px + wc * S - 1}" y="${patchTop - 1}" width="${3 * S + 2}" height="${3 * S + 2}" fill="none" stroke="${k(3)}" stroke-width="3.2" rx="3"/>`;
  const res = `<rect x="${mx + 1 * S - 1}" y="${patchTop + S - 1}" width="${S + 2}" height="${S + 2}" fill="none" stroke="${k(3)}" stroke-width="3.2" rx="3"/>`;
  const v = map[0][1];
  const rightCol = PATCH[0][3] + PATCH[1][3] + PATCH[2][3];
  const leftCol = PATCH[0][1] + PATCH[1][1] + PATCH[2][1];
  return svg(640, 310, `${text(px + 2.5 * S, 34, `${tr('Image patch', 'Potongan gambar')} (${dims(5, 5)})`, { fill: 'var(--ink)', weight: 700, size: 14 })}
${text(fx + 1.5 * S, 34, `Filter (${dims(3, 3)})`, { fill: 'var(--ink)', weight: 700, size: 14 })}
${text(mx + 1.5 * S, 34, `Feature map (${dims(3, 3)})`, { fill: 'var(--ink)', weight: 700, size: 14 })}
${numbers(px, patchTop, PATCH, x => tint(1, x * 7.5))}${win}
${numbers(fx, patchTop + S, FILTER, x => (x < 0 ? tint(3, 45) : x > 0 ? tint(2, 45) : 'var(--surface)'))}
${numbers(mx, patchTop + S, map, x => tint(1, x * 2.6))}${res}
${line(fx + 3 * S + 14, patchTop + 2.5 * S, mx - 14, patchTop + 2.5 * S, { c: 'var(--muted)', w: 2, arrow: true })}
${text((fx + 3 * S + mx) / 2, patchTop + 2.5 * S - 10, tr('slide', 'geser'), { size: 13 })}
${text(fx + 1.5 * S, patchTop + 4.5 * S - 4, tr('negative left, positive right', 'negatif kiri, positif kanan'), { size: 12 })}
${text(320, 282, `${tr('Highlighted window: right column', 'Window yang disorot: kolom kanan')} ${fmt(rightCol)} - ${tr('left column', 'kolom kiri')} ${fmt(leftCol)} = ${fmt(v)}`, { fill: k(3), weight: 700, size: 13 })}`);
}

// ---- Figure 3: the shapes along a small CNN. ----
const NET = [
  { name: ['Image', 'Gambar'], sub: () => tr(`grey, ${fmt(1)} channel`, `abu-abu, ${fmt(1)} kanal`), size: 28, ch: 1, dims: [28, 28, 1], params: null },
  { name: ['Convolution', 'Convolution'], sub: () => tr(`${fmt(8)} filters, ${dims(3, 3)}`, `${fmt(8)} filter, ${dims(3, 3)}`), size: 26, ch: 8, dims: [26, 26, 8], params: 80 },
  { name: ['Pooling', 'Pooling'], sub: () => `max, ${dims(2, 2)}`, size: 13, ch: 8, dims: [13, 13, 8], params: 0 },
  { name: ['Convolution', 'Convolution'], sub: () => tr(`${fmt(16)} filters, ${dims(3, 3)}`, `${fmt(16)} filter, ${dims(3, 3)}`), size: 11, ch: 16, dims: [11, 11, 16], params: 1168 },
  { name: ['Pooling', 'Pooling'], sub: () => `max, ${dims(2, 2)}`, size: 5, ch: 16, dims: [5, 5, 16], params: 0 },
];

function cnnPipeline() {
  const W = 640, H = 340;
  const lang = tr(0, 1);
  const cx = i => 54 + i * 106;
  const base = 232;
  let body = '';
  NET.forEach((s, i) => {
    const h = Math.max(s.size * 3.2, 14), w = 40;
    const copies = s.ch === 1 ? 1 : s.ch === 8 ? 3 : 4;
    for (let c = copies - 1; c >= 0; c--) {
      const x = cx(i) - w / 2 + c * 5, y = base - h - c * 5;
      body += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${i === 0 ? 'var(--surface)' : tint(1, 18 + c * 6)}" stroke="${i === 0 ? 'var(--ink)' : k(1)}" stroke-width="1.6"/>`;
    }
    body += text(cx(i), 40, s.name[lang], { fill: 'var(--ink)', weight: 700, size: 13 });
    body += text(cx(i), 58, s.sub(), { size: 11 });
    body += text(cx(i), base + 24, dims(...s.dims), { fill: 'var(--ink)', weight: 600, size: 12 });
    if (s.params !== null) body += text(cx(i), base + 44, `${fmt(s.params)} ${tr('weights', 'weight')}`, { fill: s.params ? k(3) : 'var(--muted)', weight: 700, size: 12 });
    if (i < NET.length - 1) body += line(cx(i) + 28, 150, cx(i + 1) - 30, 150, { c: 'var(--muted)', w: 1.6, arrow: true });
  });
  // flatten + dense
  const dx = 596;
  body += line(cx(4) + 28, 150, dx - 30, 150, { c: 'var(--muted)', w: 1.6, arrow: true });
  for (let i = 0; i < 10; i++) body += `<circle cx="${dx}" cy="${base - 100 + i * 10}" r="3.6" fill="${k(2)}"/>`;
  body += text(dx, 40, tr('Dense', 'Dense'), { fill: 'var(--ink)', weight: 700, size: 13 });
  body += text(dx, 58, `${fmt(400)} → ${fmt(10)}`, { size: 11 });
  body += text(dx, base + 24, tr(`${fmt(10)} outputs`, `${fmt(10)} output`), { fill: 'var(--ink)', weight: 600, size: 12 });
  body += text(dx, base + 44, `${fmt(4010)} ${tr('weights', 'weight')}`, { fill: k(3), weight: 700, size: 12 });
  body += text(320, H - 14, `${tr('All together', 'Seluruhnya')}: ${fmt(80)} + ${fmt(1168)} + ${fmt(4010)} = ${fmt(5258)} ${tr('weights', 'weight')}`, { fill: 'var(--ink)', weight: 700, size: 14 });
  return svg(W, H, body);
}

// ---- Figure 4: how much of the image one number can see. ----
const RECEPTIVE = [
  { name: ['Convolution 1', 'Convolution 1'], rf: 3, c: 0 },
  { name: ['Pooling 1', 'Pooling 1'], rf: 4, c: 1 },
  { name: ['Convolution 2', 'Convolution 2'], rf: 8, c: 2 },
  { name: ['Pooling 2', 'Pooling 2'], rf: 10, c: 3 },
];

function receptiveField() {
  const cellPx = 8, N = 28, ox = 40, oy = 50;
  const lang = tr(0, 1);
  const cxm = ox + (N * cellPx) / 2, cym = oy + (N * cellPx) / 2;
  let body = `${text(ox + (N * cellPx) / 2, 30, tr(`The ${dims(28, 28)} image`, `Gambar ${dims(28, 28)}`), { fill: 'var(--ink)', weight: 700, size: 14 })}${box(ox, oy, N * cellPx, N * cellPx)}`;
  for (const r of [...RECEPTIVE].reverse()) {
    const s = r.rf * cellPx;
    body += `<rect x="${cxm - s / 2}" y="${cym - s / 2}" width="${s}" height="${s}" fill="${tint(r.c, 22)}" stroke="${k(r.c)}" stroke-width="2.2"/>`;
  }
  const tx = 330;
  body += text(tx, 30, tr('One number after each layer sees a square of', 'Persegi yang terlihat oleh satu angka:'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 });
  RECEPTIVE.forEach((r, i) => {
    const y = 84 + i * 56;
    body += `<rect x="${tx}" y="${y - 16}" width="26" height="26" fill="${tint(r.c, 22)}" stroke="${k(r.c)}" stroke-width="2.2"/>`;
    body += text(tx + 40, y + 3, r.name[lang], { anchor: 'start', fill: 'var(--ink)', weight: 600, size: 14 });
    body += text(tx + 290, y + 3, `${fmt(r.rf)} × ${fmt(r.rf)}`, { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 15 });
  });
  body += text(tx, 296, tr('pixels, centered on one position', 'piksel, berpusat di satu posisi'), { anchor: 'start', size: 12 });
  return svg(640, 310, body);
}

export const figures = {
  'pixels-not-columns': pixelsNotColumns,
  'sliding-filter': slidingFilter,
  'cnn-pipeline': cnnPipeline,
  'receptive-field': receptiveField,
};
