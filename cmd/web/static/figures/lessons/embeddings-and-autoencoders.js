// Figures for the lesson "Embeddings and autoencoders": [[figure:embeddings-and-autoencoders/name|Caption]].
//
// Where the numbers come from. Every figure is drawn synchronously, so the data it needs is written down here.
//   - ITEMS: four invented 2-number embeddings (cat, kitten, dog, truck) used in the lesson's hand example. The
//     numbers are made up for teaching; they are not taken from any trained model. Distances and cosines are
//     computed from them when the figure is drawn.
//   - POINTS: the five points of the Level 2 PCA lesson, (1, 2), (2, 1), (3, 4), (4, 3), (5, 5), mean (3, 3).
//   - PENGUIN_EIGEN: the four eigenvalues of the correlation matrix of the four standardized penguin columns
//     (bill length, bill depth, flipper length, body mass; 342 rows of data/penguins.csv, divided by n). They add up
//     to 4, so each divided by 4 is the share of the squared spread that code size k = 1..4 keeps.
//   - The arc: nine points (cos t, sin t) for t = 0, 22.5, ..., 180 degrees, made up for the curve panel.
import { svg, dot, ring, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';

// ---- Figure 1: the shape of an autoencoder. ----
function autoencoderShape() {
  const W = 640, H = 290;
  const cols = [{ x: 120, n: 4 }, { x: 320, n: 2 }, { x: 520, n: 4 }];
  const ys = n => Array.from({ length: n }, (_, i) => 148 + (i - (n - 1) / 2) * 40);
  const nodes = cols.map(c => ys(c.n).map(y => ({ x: c.x, y })));
  let links = '';
  for (let l = 0; l < 2; l++) for (const a of nodes[l]) for (const b of nodes[l + 1]) links += line(a.x, a.y, b.x, b.y, { c: 'var(--muted)', w: 1 });
  const drawNodes = (ns, c, outline) => ns.map(p => (outline ? ring(p.x, p.y, c, 11) : dot(p.x, p.y, c, 11))).join('');
  return svg(W, H, `${box(44, 40, 266, 190, soft(0), 'var(--line)')}${box(330, 40, 266, 190, soft(2), 'var(--line)')}
${text(177, 62, tr('Encoder', 'Encoder'), { fill: 'var(--ink)', weight: 700, size: 14 })}
${text(463, 62, tr('Decoder', 'Decoder'), { fill: 'var(--ink)', weight: 700, size: 14 })}
${links}
${drawNodes(nodes[0], 'var(--ink)', false)}${drawNodes(nodes[1], k(1), false)}${drawNodes(nodes[2], 'var(--ink)', true)}
${text(120, 252, `${tr('Input', 'Input')}: ${fmt(4)} ${tr('numbers', 'angka')}`, { fill: 'var(--ink)', weight: 600 })}
${text(320, 252, `${tr('Code', 'Code')}: ${fmt(2)} ${tr('numbers', 'angka')}`, { fill: k(1), weight: 700 })}
${text(520, 252, `${tr('Output', 'Output')}: ${fmt(4)} ${tr('numbers', 'angka')}`, { fill: 'var(--ink)', weight: 600 })}
${text(320, 20, tr('The bottleneck', 'Bottleneck-nya'), { fill: k(1), weight: 700, size: 14 })}
${line(320, 26, 320, 120, { c: k(1), w: 1.6, arrow: true })}
${text(320, 276, tr('Loss: how far the output is from the input', 'Loss: seberapa jauh output dari input'), { fill: 'var(--muted)', weight: 600 })}`);
}

// ---- Figure 2: a toy embedding map. ----
const ITEMS = [
  { name: { en: 'cat', id: 'kucing' }, v: [4, 3], c: 0 },
  { name: { en: 'kitten', id: 'anak kucing' }, v: [5, 2], c: 1 },
  { name: { en: 'dog', id: 'anjing' }, v: [3, 5], c: 2 },
  { name: { en: 'truck', id: 'truk' }, v: [-4, -1], c: 3 },
];
const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const cosine = (a, b) => (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b));

function embeddingMap() {
  const px = v => 24 + (v + 6) * 22.3, py = v => 270 - (v + 3) * 24;
  const lang = tr('en', 'id');
  const nm = it => it.name[lang];
  const [cat, kitten, dog, truck] = ITEMS;
  const P = it => [px(it.v[0]), py(it.v[1])];
  const seg = (a, b) => { const A = P(a), B = P(b); return line(A[0], A[1], B[0], B[1], { c: 'var(--muted)', w: 1.5, dash: '4 4' }); };
  const label = (it, dx, dy, anchor) => { const p = P(it); return text(p[0] + dx, p[1] + dy, nm(it), { anchor, fill: 'var(--ink)', weight: 700, size: 14 }); };
  const tx = 340;
  const rows = [kitten, dog, truck].map((o, i) => {
    const y = 104 + i * 34;
    return `${text(tx, y, `${nm(cat)} - ${nm(o)}`, { anchor: 'start', fill: 'var(--ink)', weight: 600, size: 14 })}${text(tx + 215, y, fmt(dist2(cat.v, o.v), { digits: 2 }), { anchor: 'end', fill: 'var(--ink)', size: 14 })}${text(tx + 290, y, fmt(cosine(cat.v, o.v), { digits: 2 }), { anchor: 'end', fill: 'var(--ink)', size: 14 })}`;
  }).join('');
  const hy = 70;
  const O = [px(0), py(0)];
  return svg(640, 300, `${box(10, 14, 318, 272)}
${line(24, O[1], 318, O[1], { c: 'var(--line)', w: 1 })}${line(O[0], 22, O[0], 280, { c: 'var(--line)', w: 1 })}
${text(314, O[1] + 16, tr('dim 1', 'dim 1'), { anchor: 'end', size: 12 })}${text(O[0] + 6, 34, tr('dim 2', 'dim 2'), { anchor: 'start', size: 12 })}
${seg(cat, truck)}${seg(cat, dog)}${seg(cat, kitten)}
${ITEMS.map(it => dot(P(it)[0], P(it)[1], k(it.c), 7)).join('')}
${label(cat, 10, -10, 'start')}${label(kitten, 0, 24, 'middle')}${label(dog, -11, 5, 'end')}${label(truck, 0, -14, 'middle')}
${text(tx, hy, tr('Pair', 'Pasangan'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}
${text(tx + 215, hy, tr('Distance', 'Jarak'), { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 14 })}
${text(tx + 290, hy, tr('Cosine', 'Cosine'), { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 14 })}
${line(tx, hy + 10, tx + 294, hy + 10, { c: 'var(--line)', w: 1.2 })}
${rows}
${text(tx, 226, tr('Closest to the cat: the kitten.', 'Terdekat dengan kucing: anak kucing.'), { anchor: 'start', fill: k(1), weight: 700, size: 13 })}
${text(tx, 252, tr('Invented numbers, for illustration only.', 'Angka karangan, hanya sebagai ilustrasi.'), { anchor: 'start', size: 12 })}`);
}

// ---- Figure 3: the same five points through two sets of weights. ----
const POINTS = [[1, 2], [2, 1], [3, 4], [4, 3], [5, 5]];
const CENTER = [3, 3];
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;

function handExample() {
  const S = 300, pad = 24, top = 44;
  const panel = (ox, u, title, fillCol) => {
    const X = v => ox + pad + v / 6 * (S - 2 * pad), Y = v => top + S - pad - v / 6 * (S - 2 * pad);
    const rebuilt = POINTS.map(p => {
      const c = [p[0] - CENTER[0], p[1] - CENTER[1]];
      const z = c[0] * u[0] + c[1] * u[1];
      return [CENTER[0] + z * u[0], CENTER[1] + z * u[1]];
    });
    const errs = POINTS.map((p, i) => (p[0] - rebuilt[i][0]) ** 2 + (p[1] - rebuilt[i][1]) ** 2);
    const reach = 2.9 / Math.max(Math.abs(u[0]), Math.abs(u[1]));
    const a = [CENTER[0] - reach * u[0], CENTER[1] - reach * u[1]], b = [CENTER[0] + reach * u[0], CENTER[1] + reach * u[1]];
    const ex = POINTS[0], rb = rebuilt[0];
    return `${text(ox + S / 2, 22, title, { fill: 'var(--ink)', weight: 700, size: 14 })}
${box(ox, top, S, S)}
${line(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), { c: fillCol, w: 2.6 })}
${POINTS.map((p, i) => line(X(p[0]), Y(p[1]), X(rebuilt[i][0]), Y(rebuilt[i][1]), { c: 'var(--muted)', w: 1.4, dash: '3 3' })).join('')}
${rebuilt.map(r => dot(X(r[0]), Y(r[1]), fillCol, 4)).join('')}
${POINTS.map(p => dot(X(p[0]), Y(p[1]), 'var(--ink)', 4.5)).join('')}
${text(X(ex[0]) - 8, Y(ex[1]) + 4, `(${fmt(ex[0])}, ${fmt(ex[1])})`, { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 12 })}
${text(ox + S / 2, top + S + 24, `${tr('mean squared error', 'rata-rata galat kuadrat')} ${fmt(mean(errs), { digits: 1 })}`, { fill: 'var(--ink)', weight: 700, size: 14 })}`;
  };
  const sq = Math.SQRT1_2;
  return svg(640, 380, `${panel(10, [sq, sq], tr('Trained weights: the diagonal', 'Weight setelah dilatih: diagonal'), k(1))}${panel(330, [1, 0], tr('Weights on the first axis', 'Weight pada sumbu pertama'), k(2))}`);
}

// ---- Figure 4: what the code size costs. ----
const PENGUIN_EIGEN = [2.7537551238931695, 0.7725167538558833, 0.36523590641182313, 0.10849221583912265];

function bottleneckSize() {
  const left = () => {
    const ox = 10, oy = 40, w = 300, h = 200, base = oy + h - 30, top = oy + 28;
    const total = PENGUIN_EIGEN.reduce((s, v) => s + v, 0);
    const lost = PENGUIN_EIGEN.map((_, i) => 1 - PENGUIN_EIGEN.slice(0, i + 1).reduce((s, v) => s + v, 0) / total);
    const scale = (base - top) / 0.35;
    const bars = lost.map((l, i) => {
      const bw = 46, x = ox + 28 + i * 68;
      const bh = Math.max(l * scale, 1.5);
      return `<rect x="${x}" y="${base - bh}" width="${bw}" height="${bh}" rx="4" fill="${k(i === 0 ? 3 : 1)}"/>
${text(x + bw / 2, base - bh - 7, pct(Math.max(l, 0)), { fill: 'var(--ink)', weight: 700, size: 13 })}
${text(x + bw / 2, base + 18, fmt(i + 1), { fill: 'var(--ink)', weight: 600, size: 14 })}`;
    }).join('');
    return `${text(ox + w / 2, 22, tr('Four penguin columns', 'Empat kolom penguin'), { fill: 'var(--ink)', weight: 700, size: 14 })}
${box(ox, oy - 10, w, h + 30)}${line(ox + 14, base, ox + w - 14, base, { c: 'var(--line)', w: 1.5 })}${bars}
${text(ox + w / 2, oy + h + 12, tr('Code size (numbers kept)', 'Ukuran code (angka yang disimpan)'), { size: 12 })}
${text(ox + 14, oy + 6, tr('Share of the squared spread lost', 'Bagian sebaran kuadrat yang hilang'), { anchor: 'start', size: 12 })}`;
  };
  const right = () => {
    const ox = 330, S = 300, oy = 40, h = 220;
    const T = Array.from({ length: 9 }, (_, i) => Math.PI * i / 8);
    const A = T.map(t => [Math.cos(t), Math.sin(t)]);
    const my = mean(A.map(a => a[1]));
    const X = v => ox + 30 + (v + 1.2) / 2.4 * (S - 60), Y = v => oy + h - 36 - (v + 0.1) / 1.2 * (h - 80);
    const lostShare = (() => {
      // The best straight line is the first axis; the share lost is the variance of y over the total variance.
      const vx = mean(A.map(a => (a[0] - mean(A.map(b => b[0]))) ** 2)), vy = mean(A.map(a => (a[1] - my) ** 2));
      return Math.min(vx, vy) / (vx + vy);
    })();
    const arc = Array.from({ length: 41 }, (_, i) => { const t = Math.PI * i / 40; return `${i ? 'L' : 'M'}${X(Math.cos(t)).toFixed(1)} ${Y(Math.sin(t)).toFixed(1)}`; }).join('');
    return `${text(ox + S / 2, 22, tr('Points along a curve', 'Titik di sepanjang kurva'), { fill: 'var(--ink)', weight: 700, size: 14 })}
${box(ox, oy - 8, S, h + 30)}
<path d="${arc}" fill="none" stroke="${k(1)}" stroke-width="2.4" stroke-dasharray="6 4"/>
${line(X(-1.1), Y(my), X(1.1), Y(my), { c: k(3), w: 2.6 })}
${A.map(a => line(X(a[0]), Y(a[1]), X(a[0]), Y(my), { c: 'var(--muted)', w: 1.3, dash: '3 3' })).join('')}
${A.map(a => dot(X(a[0]), Y(a[1]), 'var(--ink)', 4.5)).join('')}
${text(ox + S / 2, oy + h - 8, `${tr('Straight code: ', 'Code lurus: ')}${pct(lostShare)} ${tr('lost', 'hilang')}`, { fill: k(3), weight: 700, size: 13 })}
${text(ox + S / 2, oy + h + 12, `${tr('Curved decoder: 0% lost', 'Decoder melengkung: 0% hilang')}`, { fill: k(1), weight: 700, size: 12 })}`;
  };
  return svg(640, 300, `${left()}${right()}`);
}

export const figures = {
  'autoencoder-shape': autoencoderShape,
  'embedding-map': embeddingMap,
  'hand-example': handExample,
  'bottleneck-size': bottleneckSize,
};
