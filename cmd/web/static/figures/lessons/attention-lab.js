// Figures for the "Attention lab" lesson: [[figure:attention-lab/name|Caption]].
//
// Where the numbers come from. The figures are drawn synchronously, so the numbers are written down here. They were computed
// with the lab's own math (sims/ml/attentionlab.js: traceAttention, trainTaskVectors, taskCorpora and scoreSize, the same calls
// the lab makes), once for each language, because the lab builds its sentence and its customer messages in the language of the
// page. The English figures show "the cat sat on the mat" and the Indonesian ones show "kucing duduk di tikar dan kucing tidur",
// the first example of the Indonesian lab, so each figure matches what the learner sees on screen.
//   - heads: the default sentence, positions on, no mask. Rows are the token that looks, columns the token looked at.
//   - the unmasked Head 2 figure: Head 2 with Add position codes off: every cell is 1/n.
//   - causal: Head 1 with the causal mask on (cells above the diagonal are 0).
//   - sizeCurve: first draw (seed 1 in English, seed 2 in Indonesian, as the lab opens), test accuracy of [bag of words,
//     frozen vectors, fine-tuned vectors] on 180 test messages, by number of labelled messages. Guessing is 1/3.
import { svg, text, line, k, tr, fmt, pct } from '../kit.js';

const DATA = {
  en: {
    words: ['the', 'cat', 'sat', 'on', 'the', 'mat'],
    heads: {
      meaning: [[0.1499, 0.185, 0.1854, 0.1483, 0.1512, 0.1802], [0.0849, 0.6105, 0.0752, 0.0779, 0.089, 0.0626], [0.1073, 0.0948, 0.4989, 0.0976, 0.1079, 0.0936], [0.1502, 0.1718, 0.1708, 0.1509, 0.1514, 0.2049], [0.1489, 0.1908, 0.1835, 0.1471, 0.1503, 0.1793], [0.0939, 0.071, 0.0842, 0.1053, 0.0949, 0.5507]],
      nearby: [[0.3518, 0.3036, 0.1966, 0.0974, 0.0382, 0.0124], [0.2351, 0.2724, 0.2351, 0.1523, 0.0755, 0.0296], [0.1356, 0.2094, 0.2426, 0.2094, 0.1356, 0.0672], [0.0672, 0.1356, 0.2094, 0.2426, 0.2094, 0.1356], [0.0296, 0.0755, 0.1523, 0.2351, 0.2724, 0.2351], [0.0124, 0.0382, 0.0974, 0.1966, 0.3036, 0.3518]],
      action: [[0.1563, 0.1472, 0.2452, 0.1518, 0.1564, 0.143], [0.1112, 0.091, 0.5033, 0.1007, 0.1114, 0.0824], [0.1618, 0.1566, 0.2064, 0.1592, 0.1618, 0.1542], [0.1555, 0.146, 0.2507, 0.1507, 0.1556, 0.1415], [0.1552, 0.1455, 0.2526, 0.1504, 0.1553, 0.141], [0.1132, 0.0931, 0.493, 0.1028, 0.1134, 0.0845]],
      untrained: [[0.2069, 0.3438, 0.0704, 0.1023, 0.1311, 0.1455], [0.2273, 0.3378, 0.0421, 0.0666, 0.1232, 0.203], [0.2181, 0.2242, 0.0614, 0.0797, 0.1474, 0.2692], [0.1979, 0.1992, 0.1018, 0.1165, 0.1615, 0.2231], [0.1927, 0.2038, 0.1132, 0.1281, 0.1617, 0.2006], [0.1943, 0.3375, 0.0888, 0.1233, 0.1331, 0.1231]],
    },
    causal: [[1, 0, 0, 0, 0, 0], [0.1221, 0.8779, 0, 0, 0, 0], [0.1531, 0.1352, 0.7117, 0, 0, 0], [0.2334, 0.2669, 0.2653, 0.2344, 0, 0], [0.1814, 0.2325, 0.2236, 0.1793, 0.1832, 0], [0.0939, 0.071, 0.0842, 0.1053, 0.0949, 0.5507]],
    sizeCurve: [
      [3, 0.589, 0.583, 0.583], [5, 0.683, 0.828, 0.828], [8, 0.672, 0.828, 0.822], [12, 0.761, 0.833, 0.844], [20, 0.761, 0.889, 0.883],
      [30, 0.806, 0.856, 0.817], [45, 0.867, 0.878, 0.878], [75, 0.906, 0.9, 0.939], [120, 0.944, 0.906, 0.944], [200, 0.944, 0.911, 0.944], [360, 0.944, 0.911, 0.944],
    ],
  },
  id: {
    words: ['kucing', 'duduk', 'di', 'tikar', 'dan', 'kucing', 'tidur'],
    heads: {
      meaning: [[0.3734, 0.0465, 0.0481, 0.0382, 0.0492, 0.3957, 0.0489], [0.0663, 0.3524, 0.0689, 0.0659, 0.0675, 0.0667, 0.3124], [0.1448, 0.1454, 0.1284, 0.1739, 0.123, 0.1461, 0.1384], [0.0675, 0.0817, 0.1021, 0.5317, 0.0824, 0.0683, 0.0664], [0.154, 0.148, 0.1278, 0.1457, 0.1252, 0.1553, 0.144], [0.3774, 0.0446, 0.0463, 0.0369, 0.0473, 0.4005, 0.047], [0.0757, 0.3388, 0.0711, 0.0581, 0.0712, 0.0762, 0.3088]],
      nearby: [[0.3505, 0.3026, 0.1959, 0.0971, 0.0381, 0.0123, 0.0035], [0.2329, 0.2698, 0.2329, 0.1508, 0.0748, 0.0293, 0.0095], [0.1321, 0.2041, 0.2364, 0.2041, 0.1321, 0.0655, 0.0257], [0.063, 0.1271, 0.1963, 0.2274, 0.1963, 0.1271, 0.063], [0.0257, 0.0655, 0.1321, 0.2041, 0.2364, 0.2041, 0.1321], [0.0095, 0.0293, 0.0748, 0.1508, 0.2329, 0.2698, 0.2329], [0.0035, 0.0123, 0.0381, 0.0971, 0.1959, 0.3026, 0.3505]],
      action: [[0.0642, 0.3518, 0.0711, 0.0582, 0.0711, 0.0644, 0.3191], [0.1315, 0.1715, 0.1336, 0.1295, 0.1336, 0.1315, 0.1689], [0.1193, 0.2028, 0.1231, 0.1157, 0.1231, 0.1194, 0.1967], [0.0666, 0.3453, 0.0734, 0.0605, 0.0734, 0.0667, 0.3141], [0.1262, 0.1849, 0.1291, 0.1235, 0.1292, 0.1263, 0.1808], [0.0621, 0.358, 0.0689, 0.0561, 0.069, 0.0622, 0.3237], [0.1367, 0.1583, 0.1379, 0.1355, 0.1379, 0.1367, 0.157]],
      untrained: [[0.3096, 0.0604, 0.0671, 0.0454, 0.0858, 0.3128, 0.1189], [0.284, 0.0499, 0.0445, 0.0337, 0.0769, 0.3578, 0.1532], [0.255, 0.0658, 0.0585, 0.0479, 0.0928, 0.314, 0.166], [0.1982, 0.1155, 0.1242, 0.1067, 0.1285, 0.1917, 0.1352], [0.1917, 0.1078, 0.0999, 0.0932, 0.1256, 0.2147, 0.1672], [0.2798, 0.0619, 0.0601, 0.0452, 0.0884, 0.3197, 0.1448], [0.3269, 0.0288, 0.0261, 0.017, 0.0518, 0.4257, 0.1238]],
    },
    causal: [[1, 0, 0, 0, 0, 0, 0], [0.1583, 0.8417, 0, 0, 0, 0, 0], [0.3459, 0.3474, 0.3068, 0, 0, 0, 0], [0.0862, 0.1043, 0.1304, 0.6791, 0, 0, 0], [0.2197, 0.2112, 0.1824, 0.208, 0.1787, 0, 0], [0.396, 0.0468, 0.0486, 0.0387, 0.0497, 0.4202, 0], [0.0757, 0.3388, 0.0711, 0.0581, 0.0712, 0.0762, 0.3088]],
    sizeCurve: [
      [3, 0.444, 0.522, 0.522], [5, 0.472, 0.7, 0.711], [8, 0.578, 0.739, 0.733], [12, 0.55, 0.722, 0.722], [20, 0.628, 0.739, 0.744],
      [30, 0.722, 0.806, 0.822], [45, 0.817, 0.906, 0.906], [75, 0.883, 0.894, 0.922], [120, 0.928, 0.911, 0.928], [200, 0.922, 0.917, 0.922], [360, 0.933, 0.911, 0.928],
    ],
  },
};
// The language of the page, read when a figure is drawn (never at load: the page can change language).
const data = () => DATA[tr('en', 'id')];

const rawText = (x, y, t, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.anchor ?? 'middle'}" font-size="${o.size ?? 12}" font-weight="${o.weight ?? 500}" fill="${o.fill ?? 'var(--muted)'}" ${o.rotate ? `transform="rotate(${o.rotate} ${x} ${y})"` : ''}>${t}</text>`;
// One heatmap: cell size c, top-left corner of the grid at (x, y). Row and column labels, a percent in each cell, and an
// optional hatch over the cells the causal mask hides. The grid is n by n, n being the number of tokens of the sentence.
function heatmap(m, x, y, c, o = {}) {
  const n = m.length, words = data().words;
  let s = '';
  for (let i = 0; i < n; i++) {
    s += rawText(x - 5, y + i * c + c / 2 + 3.5, words[i], { anchor: 'end', size: 11, fill: 'var(--ink)' });
    s += rawText(x + i * c + c / 2 - 2, y - 5, words[i], { anchor: 'start', size: 10.5, fill: 'var(--ink)', rotate: -60 });
    for (let j = 0; j < n; j++) {
      const w = m[i][j], cx = x + j * c, cy = y + i * c;
      if (o.mask && j > i) {
        s += `<rect x="${cx}" y="${cy}" width="${c}" height="${c}" fill="var(--surface)" stroke="var(--line)" stroke-width="1"/>`;
        s += `<path d="M${cx + 2} ${cy + c - 2}L${cx + c - 2} ${cy + 2}" stroke="var(--line)" stroke-width="1.4"/>`;
        continue;
      }
      const a = Math.min(1, Math.pow(w, 0.7));
      s += `<rect x="${cx}" y="${cy}" width="${c}" height="${c}" fill="var(--surface)" stroke="var(--line)" stroke-width="1"/>`;
      s += `<rect x="${cx}" y="${cy}" width="${c}" height="${c}" fill="var(--accent)" fill-opacity="${a.toFixed(3)}" stroke="var(--line)" stroke-width="1"/>`;
      s += rawText(cx + c / 2, cy + c / 2 + 3.5, pct(w, 0), { size: c >= 26 ? 10 : 9, weight: 600, fill: a > 0.55 ? 'var(--accent-ink)' : 'var(--ink)' });
    }
  }
  return s;
}

// ---- Figure 1: the four heads. ----
function fourHeads() {
  const d = data(), n = d.words.length;
  const c = n > 6 ? 20 : 24, gap = 22, grid = n * c, left = 40, H = 262;
  const W = Math.max(780, 8 + left + 3 * (grid + left + gap - 14) + 14 + grid + 8);
  const panels = [
    ['meaning', tr('Head 1: similar meaning', 'Head 1: makna mirip')],
    ['nearby', tr('Head 2: nearby words', 'Head 2: kata berdekatan')],
    ['action', tr('Head 3: finds the action', 'Head 3: mencari kata kerja')],
    ['untrained', tr('Head 4: untrained (random)', 'Head 4: belum dilatih (acak)')],
  ];
  let body = '';
  panels.forEach(([key, title], p) => {
    const x = 8 + left + p * (grid + left + gap - 14) + 14, y = 88;
    const [num, what] = title.split(': ');
    body += rawText(x + grid / 2 - 14, 20, num, { size: 13, weight: 700, fill: 'var(--ink)' });
    body += rawText(x + grid / 2 - 14, 36, what, { size: 11.5, weight: 600, fill: 'var(--muted)' });
    body += heatmap(d.heads[key], x, y, c);
  });
  body += text(W / 2, H - 12, tr('Rows: the token that looks. Columns: the token looked at. Each row adds up to 100%.', 'Baris: token yang melihat. Kolom: token yang dilihat. Setiap baris berjumlah 100%.'), { size: 12 });
  return svg(W, H, body);
}

// ---- Figure 2: positions and the causal mask. ----
function maskAndPositions() {
  const d = data(), n = d.words.length;
  const W = 780, c = n > 6 ? 28 : 30, grid = n * c, y = 92, H = y + grid + 40;
  const off = Array.from({ length: n }, () => Array(n).fill(1 / n));
  const panels = [
    [off, tr('Head 2, position codes off', 'Head 2, kode posisi mati'), false],
    [d.heads.nearby, tr('Head 2, position codes on', 'Head 2, kode posisi hidup'), false],
    [d.causal, tr('Head 1, causal mask on', 'Head 1, causal mask hidup'), true],
  ];
  let body = '';
  panels.forEach(([m, title, mask], p) => {
    const x = 50 + p * 250;
    body += rawText(x + grid / 2 - 10, 24, title, { size: 13, weight: 700, fill: 'var(--ink)' });
    body += heatmap(m, x, y, c, { mask });
  });
  body += text(W / 2, H - 14, tr('Hatched cells are hidden. Without position codes, Head 2 has nothing to compare.', 'Sel berarsir disembunyikan. Tanpa kode posisi, Head 2 tidak punya apa-apa untuk dibandingkan.'), { size: 12 });
  return svg(W, H, body);
}

// ---- Figure 3: test accuracy against the number of labelled messages. ----
function sizeCurve() {
  const W = 680, H = 330, m = { l: 56, r: 24, t: 40, b: 64 };
  const lo = Math.log(3), hi = Math.log(360);
  const X = n => m.l + ((Math.log(n) - lo) / (hi - lo)) * (W - m.l - m.r);
  const yMin = 0.3, yMax = 1;
  const Y = v => m.t + (1 - (v - yMin) / (yMax - yMin)) * (H - m.t - m.b);
  const series = [
    [1, tr('Bag of words', 'Bag of words'), k(6), 'circle'],
    [2, tr('Frozen vectors', 'Vektor dibekukan'), k(4), 'square'],
    [3, tr('Fine-tuned', 'Di-fine-tune'), k(5), 'triangle'],
  ];
  const mark = (kind, x, y, c) => (kind === 'circle' ? `<circle cx="${x}" cy="${y}" r="4.2" fill="${c}"/>`
    : kind === 'square' ? `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="${c}"/>`
      : `<path d="M${x} ${y - 5.5}L${x + 5} ${y + 4}L${x - 5} ${y + 4}Z" fill="${c}"/>`);
  let body = '';
  for (const v of [0.4, 0.6, 0.8, 1]) {
    body += line(m.l, Y(v), W - m.r, Y(v), { c: 'var(--line)', w: 1 });
    body += rawText(m.l - 8, Y(v) + 4, pct(v, 0), { anchor: 'end', size: 12 });
  }
  body += line(m.l, Y(1 / 3), W - m.r, Y(1 / 3), { c: 'var(--muted)', w: 1.4, dash: '2 5' });
  body += rawText(W - m.r, Y(1 / 3) - 6, tr('guessing: 33%', 'menebak: 33%'), { anchor: 'end', size: 12 });
  for (const n of [3, 8, 20, 45, 120, 360]) {
    body += rawText(X(n), H - m.b + 18, fmt(n), { size: 12 });
    body += line(X(n), H - m.b, X(n), H - m.b + 4, { c: 'var(--muted)', w: 1 });
  }
  body += rawText((m.l + W - m.r) / 2, H - m.b + 38, tr('Labelled messages (log scale)', 'Pesan berlabel (skala log)'), { size: 12.5 });
  body += rawText(m.l - 36, m.t - 14, tr('Test accuracy', 'Accuracy test'), { anchor: 'start', size: 12.5, weight: 700, fill: 'var(--ink)' });
  for (const [col, , color, kind] of series) {
    const pts = data().sizeCurve.map(r => [X(r[0]), Y(r[col])]);
    body += `<path d="M${pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round"/>`;
    for (const [x, y] of pts) body += mark(kind, x.toFixed(1), y.toFixed(1), color);
  }
  series.forEach(([, name, color, kind], i) => {
    const x = m.l + 150 + i * 150;
    body += mark(kind, x, 18, color) + rawText(x + 12, 22, name, { anchor: 'start', size: 12.5, fill: 'var(--ink)' });
  });
  return svg(W, H, body);
}

export const figures = { 'four-heads': fourHeads, 'mask-and-positions': maskAndPositions, 'size-curve': sizeCurve };
