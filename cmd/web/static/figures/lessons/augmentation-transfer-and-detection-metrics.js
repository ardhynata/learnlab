// Figures for the lesson "Augmentation, transfer and detection metrics":
// [[figure:augmentation-transfer-and-detection-metrics/name|Caption]].
//
// Where the numbers come from.
//   - augmentations: a 14 x 14 grayscale tile drawn from the polyline of a "6" in unit coordinates. Each tile moves the
//     polyline (mirror, shift of 2 pixels right and 1 down, rotation about the centre) and redraws it, so the pixels are
//     real. Pixel value v runs from 0 (black) to 1 (white); the digit is 0.95 on a 0.12 background. Brighter adds 0.3
//     (then clips at 1). Lower contrast is 0.5 + 0.5 * (v - 0.5). The two lower tiles change what the picture shows.
//   - clean-vs-stress: the lesson's made-up worked example, 200 test images per condition: 188, 150 and 164 correct
//     without augmentation, 184, 176 and 178 with it. They illustrate the pattern and are not measured.
//   - reuse-the-filters: the head of 64 features and 3 classes has 64 x 3 + 3 = 195 numbers.
//   - iou: truth box (2,2)-(8,6), predicted boxes (4,3)-(10,7) and (3,2)-(9,6), on a grid of units.
//     Overlap 12 and 20, union 24 + 24 - 12 = 36 and 24 + 24 - 20 = 28, IoU 12/36 = 0.33 and 20/28 = 0.71.
import { svg, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';

// ---- Figure 1: label-preserving and label-changing edits of one digit. ----
const SIX = [[0.72, 0.10], [0.55, 0.04], [0.38, 0.08], [0.26, 0.22], [0.22, 0.45], [0.22, 0.68], [0.30, 0.88], [0.47, 0.96], [0.64, 0.90], [0.72, 0.72], [0.66, 0.55], [0.50, 0.48], [0.34, 0.52], [0.24, 0.62]];
const N = 14, CELL = 7, TILE = N * CELL;

const move = (pts, { mirror = false, dx = 0, dy = 0, deg = 0 } = {}) => {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return pts.map(([x, y]) => {
    let px = mirror ? 1 - x : x, py = y;
    const rx = px - 0.5, ry = py - 0.5;
    px = 0.5 + c * rx - s * ry; py = 0.5 + s * rx + c * ry;
    return [px + dx, py + dy];
  });
};
const segDist = (px, py, [ax, ay], [bx, by]) => {
  const vx = bx - ax, vy = by - ay, len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
};
// Pixel values of the polyline on the N x N grid: 0.12 background, 0.95 on the stroke, soft edge.
const raster = pts => {
  const out = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const px = (i + 0.5) / N, py = (j + 0.5) / N;
    let d = Infinity;
    for (let m = 0; m + 1 < pts.length; m++) d = Math.min(d, segDist(px, py, pts[m], pts[m + 1]));
    const t = Math.max(0, Math.min(1, (0.10 - d) / 0.055));
    out.push(0.12 + 0.83 * t);
  }
  return out;
};
const clip = v => Math.max(0, Math.min(1, v));

function tile(x, y, pixels, stroke) {
  const cells = pixels.map((v, n) => {
    const g = Math.round(clip(v) * 255);
    return `<rect x="${x + (n % N) * CELL}" y="${y + Math.floor(n / N) * CELL}" width="${CELL}" height="${CELL}" fill="rgb(${g},${g},${g})" shape-rendering="crispEdges"/>`;
  }).join('');
  return `${cells}<rect x="${x - 1.5}" y="${y - 1.5}" width="${TILE + 3}" height="${TILE + 3}" rx="3" fill="none" stroke="${stroke}" stroke-width="2.5"/>`;
}

function augmentations() {
  const W = 640, H = 340;
  const base = raster(SIX);
  const safe = [
    [tr('Original', 'Asli'), base],
    [tr('Shift 2 px', 'Geser 2 px'), raster(move(SIX, { dx: 2 / N, dy: 1 / N }))],
    [tr('Rotate 12°', 'Putar 12°'), raster(move(SIX, { deg: 12 }))],
    [tr('Brighter', 'Lebih terang'), base.map(v => clip(v + 0.3))],
    [tr('Lower contrast', 'Kontras turun'), base.map(v => 0.5 + 0.5 * (v - 0.5))],
  ];
  const unsafe = [
    [tr('Mirror image', 'Bayangan cermin'), tr('not a digit', 'bukan angka'), raster(move(SIX, { mirror: true }))],
    [tr('Rotate 180°', 'Putar 180°'), tr('reads as a 9', 'terbaca 9'), raster(move(SIX, { deg: 180 }))],
  ];
  const gap = 124;
  const row1 = safe.map(([cap, px], i) => `${tile(12 + i * gap, 32, px, k(2))}${text(12 + i * gap + TILE / 2, 148, cap, { size: 13, fill: 'var(--ink)' })}`).join('');
  const row2 = unsafe.map(([cap, sub, px], i) => `${tile(12 + i * gap, 202, px, k(3))}${text(12 + i * gap + TILE / 2, 318, cap, { size: 13, fill: 'var(--ink)' })}${text(12 + i * gap + TILE / 2, 334, sub, { size: 12 })}`).join('');
  return svg(W, H, `${text(10, 20, tr('Still a 6: the label stays true', 'Tetap angka 6: label tetap benar'), { anchor: 'start', fill: k(2), weight: 700, size: 14 })}
${row1}
${text(10, 190, tr('Not a 6 any more: the label would be wrong', 'Bukan angka 6 lagi: label akan salah'), { anchor: 'start', fill: k(3), weight: 700, size: 14 })}
${row2}
${text(272, 236, tr('Whether a flip is safe depends on the task.', 'Aman tidaknya flip bergantung pada tugasnya.'), { anchor: 'start', size: 13, fill: 'var(--ink)' })}
${text(272, 258, tr('A mirrored cat is still a cat,', 'Kucing yang dicerminkan tetap kucing,'), { anchor: 'start', size: 13 })}
${text(272, 278, tr('a mirrored digit is not a digit.', 'angka yang dicerminkan bukan angka.'), { anchor: 'start', size: 13 })}`);
}

// ---- Figure 2: clean test images against realistic changes. ----
const STRESS = [
  { en: 'Clean test images', id: 'Gambar uji bersih', plain: 188, aug: 184 },
  { en: 'Dimmer images', id: 'Gambar lebih redup', plain: 150, aug: 176 },
  { en: 'Rotated 20°', id: 'Diputar 20°', plain: 164, aug: 178 },
];

function cleanVsStress() {
  const W = 640, H = 358;
  const x0 = 24, x1 = 520, X = f => x0 + f * (x1 - x0);
  const groupH = 82, top = 40;
  const grid = [0, 0.25, 0.5, 0.75, 1].map(t => `${line(X(t), top - 8, X(t), top + 3 * groupH - 14, { c: 'var(--line)', w: 1 })}${text(X(t), top + 3 * groupH + 2, pct(t, 0), { size: 12 })}`).join('');
  const groups = STRESS.map((g, i) => {
    const y = top + i * groupH;
    const bar = (yy, correct, c) => `<rect x="${x0}" y="${yy}" width="${X(correct / 200) - x0}" height="22" rx="3" fill="${c}"/>${text(X(correct / 200) + 8, yy + 16, pct(correct / 200, 0), { anchor: 'start', size: 13, fill: 'var(--ink)', weight: 700 })}`;
    return `${text(x0, y - 2, tr(g.en, g.id), { anchor: 'start', size: 13, fill: 'var(--ink)', weight: 700 })}
${bar(y + 4, g.plain, k(3))}
${bar(y + 30, g.aug, k(1))}`;
  }).join('');
  const legend = `<rect x="24" y="${H - 22}" width="14" height="14" rx="3" fill="${k(3)}"/>${text(44, H - 10, tr('Trained on clean images only', 'Dilatih hanya dengan gambar bersih'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
<rect x="300" y="${H - 22}" width="14" height="14" rx="3" fill="${k(1)}"/>${text(320, H - 10, tr('Trained with augmentation', 'Dilatih dengan augmentation'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}`;
  return svg(W, H, `${grid}${groups}
${text(x0, H - 32, tr('Made-up numbers: 200 test images per bar.', 'Angka rekaan: 200 gambar uji per batang.'), { anchor: 'start', size: 12 })}
${legend}`);
}

// ---- Figure 3: which parts of a pretrained network are reused. ----
function reuseTheFilters() {
  const W = 640, H = 252;
  const node = (x, y, w, title, sub, fill, stroke) => `${box(x, y, w, 64, fill, stroke)}${text(x + w / 2, y + 27, title, { fill: 'var(--ink)', weight: 700, size: 14 })}${text(x + w / 2, y + 48, sub, { size: 12 })}`;
  const arrow = (x, y) => line(x, y, x + 22, y, { c: 'var(--muted)', w: 2, arrow: true });
  const bracket = (xa, xb, y, label, c) => `${line(xa, y, xb, y, { c, w: 2.4 })}${line(xa, y - 6, xa, y, { c, w: 2.4 })}${line(xb, y - 6, xb, y, { c, w: 2.4 })}${text((xa + xb) / 2, y + 20, label, { size: 13, fill: c, weight: 700 })}`;
  const y = 70;
  return svg(W, H, `${text(10, 32, tr('Layers from the first to the last', 'Layer dari yang pertama sampai yang terakhir'), { anchor: 'start', size: 13, fill: 'var(--ink)', weight: 600 })}
${node(10, y, 112, tr('Image', 'Gambar'), tr('pixels', 'piksel'), 'var(--surface)', 'var(--line)')}
${arrow(124, y + 32)}
${node(150, y, 146, tr('Early filters', 'Filter awal'), tr('edges, color blobs', 'tepi, bercak warna'), soft(0), k(0))}
${arrow(298, y + 32)}
${node(324, y, 146, tr('Later layers', 'Layer akhir'), tr('textures, parts', 'tekstur, bagian'), soft(1), k(1))}
${arrow(472, y + 32)}
${node(498, y, 132, tr('New head', 'Head baru'), tr('class scores', 'skor kelas'), soft(2), k(2))}
${bracket(150, 470, 156, tr('Pretrained on many images', 'Sudah dilatih pada banyak gambar'), 'var(--muted)')}
${bracket(498, 630, 156, tr('Your small labelled set', 'Data berlabelmu'), k(2))}
${text(223, 214, tr('reuse, frozen', 'pakai ulang, frozen'), { size: 13, fill: k(0), weight: 700 })}
${text(397, 214, tr('frozen or fine-tune', 'frozen/fine-tune'), { size: 13, fill: k(1), weight: 700 })}
${text(564, 214, `${tr('train', 'latih')} ${fmt(64)} × ${fmt(3)} + ${fmt(3)} = ${fmt(195)}`, { size: 13, fill: k(2), weight: 700 })}
${text(634, 236, tr('numbers (64 features, 3 classes)', 'angka (64 feature, 3 kelas)'), { anchor: 'end', size: 12 })}`);
}

// ---- Figure 4: intersection over union on two boxes. ----
function iouFigure() {
  const W = 640, H = 296, U = 20;
  const truth = [2, 2, 8, 6];
  const panel = (ox, pred, overlap, union, value) => {
    const gx = ox, gy = 38;
    const P = (x, y) => [gx + x * U, gy + y * U];
    const rect = (b, c, fill, dash) => {
      const [x, y] = P(b[0], b[1]);
      return `<rect x="${x}" y="${y}" width="${(b[2] - b[0]) * U}" height="${(b[3] - b[1]) * U}" fill="${fill}" stroke="${c}" stroke-width="2.4" ${dash ? 'stroke-dasharray="6 4"' : ''}/>`;
    };
    const ix = [Math.max(truth[0], pred[0]), Math.max(truth[1], pred[1]), Math.min(truth[2], pred[2]), Math.min(truth[3], pred[3])];
    const [lx, ly] = P(ix[0], ix[1]);
    const frame = `<rect x="${gx}" y="${gy}" width="${12 * U}" height="${9 * U}" rx="6" fill="var(--surface)" stroke="var(--line)" stroke-width="1.6"/>`;
    return `${frame}${rect(truth, k(0), 'none')}${rect(pred, k(1), 'none', true)}
<rect x="${lx}" y="${ly}" width="${(ix[2] - ix[0]) * U}" height="${(ix[3] - ix[1]) * U}" fill="${k(2)}" fill-opacity="0.45" stroke="none"/>
${text(gx + 6 * U, gy + 9 * U + 24, `${tr('Overlap', 'Irisan')} ${fmt(overlap)}`, { size: 13, fill: 'var(--ink)', weight: 600 })}
${text(gx + 6 * U, gy + 9 * U + 44, `${tr('Union', 'Gabungan')} ${fmt(24)} + ${fmt(24)} − ${fmt(overlap)} = ${fmt(union)}`, { size: 13, fill: 'var(--ink)', weight: 600 })}
${text(gx + 6 * U, gy + 9 * U + 66, `IoU = ${fmt(overlap)} / ${fmt(union)} = ${fmt(value, { digits: 2 })}`, { size: 15, fill: k(2), weight: 700 })}`;
  };
  return svg(W, H, `${text(10, 22, tr('Solid: true box. Dashed: predicted box. Green: overlap.', 'Garis penuh: kotak sebenarnya. Putus-putus: kotak prediksi. Hijau: irisan.'), { anchor: 'start', size: 13, fill: 'var(--ink)', weight: 600 })}
${panel(30, [4, 3, 10, 7], 12, 36, 12 / 36)}
${panel(350, [3, 2, 9, 6], 20, 28, 20 / 28)}`);
}

export const figures = {
  'augmentations': augmentations,
  'clean-vs-stress': cleanVsStress,
  'reuse-the-filters': reuseTheFilters,
  'iou': iouFigure,
};
