// Figures for the lesson "Depth and leaf size": [[figure:depth-and-leaf-size/name|Caption]].
// Every number is real. The question is "is this penguin male or female?" asked of the 333 penguins that
// have all four measurements (bill length, bill depth, flipper length, body mass) and a recorded sex. They are
// cut with the same splitIndices() the labs use, stratified by sex, seed 4: 200 training, 67 validation
// and 66 test penguins. Trees were grown with fitTree() from sims/ml/tree.js (Gini, root at depth 0) on the
// 200 training rows, and the counts below were read off them. Figures are drawn synchronously and cannot fetch
// the csv, so the counts are constants here; the percentages and gaps are computed from them.
import { svg, dot, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const TRAIN_N = 200, VALID_N = 67;
// Sex colors: female amber, male blue (the other colors in this lesson mean training and validation).
const SEX = { f: 3, m: 4 };
const sexName = s => (s === 'f' ? tr('female', 'betina') : tr('male', 'jantan'));

// Figure 1: the tree grown to depth 3 on the 200 training penguins. A leaf is [sex it predicts, training penguins in it].
const TREE = {
  q: ['body mass', 'massa tubuh', '3712.5', 'g'],
  l: {
    q: ['bill depth', 'tebal paruh', '18.65', 'mm'],
    l: { q: ['bill depth', 'tebal paruh', '18.55', 'mm'], l: ['f', 54], r: ['f', 5] },
    r: { q: ['bill length', 'panjang paruh', '37.65', 'mm'], l: ['f', 3], r: ['m', 8] },
  },
  r: {
    q: ['bill depth', 'tebal paruh', '14.85', 'mm'],
    l: { q: ['body mass', 'massa tubuh', '5250', 'g'], l: ['f', 28], r: ['m', 2] },
    r: { q: ['bill length', 'panjang paruh', '36.1', 'mm'], l: ['f', 3], r: ['m', 97] },
  },
};

function depthThreeTree() {
  const step = 72, x0 = 44, rowY = [14, 84, 154, 226], nodeW = 108, nodeH = 36, leafW = 64, leafH = 50;
  let leafIndex = 0;
  const parts = [];
  // Lays out a subtree and returns the x of its top node. Leaves are placed left to right.
  const draw = (node, depth) => {
    if (Array.isArray(node)) {
      const x = x0 + leafIndex++ * step, [sex, n] = node;
      parts.push(`${box(x - leafW / 2, rowY[3], leafW, leafH, soft(SEX[sex]), k(SEX[sex]))}
${text(x, rowY[3] + 21, sexName(sex), { size: 12.5, ...INK })}${text(x, rowY[3] + 39, fmt(n), { size: 13, ...INK })}`);
      return { x, top: rowY[3], bottom: rowY[3] };
    }
    const a = draw(node.l, depth + 1), b = draw(node.r, depth + 1), x = (a.x + b.x) / 2, y = rowY[depth];
    const [en, id, value, unit] = node.q;
    parts.push(`${line(x, y + nodeH, a.x, a.top, { c: 'var(--muted)', w: 1.8 })}${line(x, y + nodeH, b.x, b.top, { c: 'var(--muted)', w: 1.8 })}
${box(x - nodeW / 2, y, nodeW, nodeH, 'var(--accent-soft)', 'var(--line)')}
${text(x, y + 15, tr(en, id), { size: 11.5, ...INK })}${text(x, y + 30, `≤ ${fmt(Number(value), { max: 2 })} ${unit}`, { size: 11.5 })}`);
    if (depth === 0) parts.push(text((x + a.x) / 2 - 12, y + nodeH + 12, tr('yes', 'ya'), { anchor: 'end', size: 12, ...INK }) + text((x + b.x) / 2 + 12, y + nodeH + 12, tr('no', 'tidak'), { anchor: 'start', size: 12, ...INK }));
    return { x, top: y, bottom: y + nodeH };
  };
  draw(TREE, 0);
  const levels = [0, 1, 2, 3].map(d => text(676, rowY[d] + (d === 3 ? 30 : 23), tr(`depth ${d}`, `kedalaman ${d}`), { anchor: 'end', size: 12 })).join('');
  const legend = `<rect x="44" y="296" width="14" height="14" rx="3" fill="${k(SEX.f)}"/>${text(64, 308, tr('predicts female', 'memprediksi betina'), { anchor: 'start', size: 12 })}
<rect x="206" y="296" width="14" height="14" rx="3" fill="${k(SEX.m)}"/>${text(226, 308, tr('predicts male', 'memprediksi jantan'), { anchor: 'start', size: 12 })}
${text(676, 308, tr('Number = training penguins in the leaf', 'Angka = penguin training di leaf'), { anchor: 'end', size: 12 })}`;
  return svg(680, 322, `${parts.join('')}${levels}${legend}`);
}

// Figure 2: accuracy on the training penguins and on the validation penguins for maximum depth 0 to 8.
// Seed 4: [depth, leaves, training right out of 200, validation right out of 67].
const ONE_CUT = [[0, 1, 101, 34], [1, 2, 153, 38], [2, 4, 182, 57], [3, 8, 188, 59], [4, 13, 190, 58], [5, 17, 193, 57], [6, 21, 195, 54], [7, 23, 200, 54], [8, 23, 200, 54]];
// Mean accuracy (percent) over the 30 stratified cuts with seeds 1 to 30: [depth, training, validation].
const THIRTY_CUTS = [[0, 50.5, 50.746], [1, 73.1, 68.209], [2, 87.5, 83.383], [3, 91.583, 85.97], [4, 93.967, 85.224], [5, 96.567, 85.672], [6, 98.167, 86.368], [7, 99.083, 86.269], [8, 99.75, 86.468]];

function depthCurves() {
  const rows = {
    one: ONE_CUT.map(([d, , a, b]) => [d, a / TRAIN_N * 100, b / VALID_N * 100]),
    avg: THIRTY_CUTS,
  };
  const top = 54, bottom = 214, pw = 320, lo = 40, hi = 100;
  const Y = v => bottom - (v - lo) / (hi - lo) * (bottom - top);
  const panel = (ox, title, data, gapAt) => {
    const X = d => ox + 50 + d * (pw - 66) / 8;
    const series = (idx, c) => `<path d="${data.map((r, i) => `${i ? 'L' : 'M'}${X(r[0]).toFixed(1)} ${Y(r[idx]).toFixed(1)}`).join('')}" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>${data.map(r => dot(X(r[0]), Y(r[idx]), c, 4)).join('')}`;
    const g = data[gapAt], gap = g[1] - g[2];
    const bracket = `${line(X(gapAt) + 7, Y(g[1]), X(gapAt) + 7, Y(g[2]), { c: 'var(--ink)', w: 1.6 })}${text(X(gapAt) + 12, Y(g[2]) + 22, tr(`gap ${fmt(gap, { digits: 1 })} pts`, `selisih ${fmt(gap, { digits: 1 })} poin`), { anchor: 'end', size: 12, ...INK })}`;
    return `${box(ox, 28, pw, 222)}${text(ox + pw / 2, 20, title, INK)}
${line(ox + 44, bottom, ox + pw - 10, bottom, { c: 'var(--muted)', w: 1.4 })}${line(ox + 44, bottom, ox + 44, top - 8, { c: 'var(--muted)', w: 1.4 })}
${[50, 75, 100].map(v => `${line(ox + 44, Y(v), ox + pw - 10, Y(v), { c: 'var(--line)', w: 1, dash: '3 4' })}${text(ox + 38, Y(v) + 4, `${fmt(v)}%`, { anchor: 'end', size: 11.5 })}`).join('')}
${data.map(r => text(X(r[0]), bottom + 16, fmt(r[0]), { size: 11.5 })).join('')}
${text(ox + pw / 2 + 20, bottom + 32, tr('maximum depth', 'maximum depth'), { size: 12 })}
${series(2, k(1))}${series(1, k(0))}${bracket}`;
  };
  return svg(680, 296, `${panel(8, tr('One cut (seed 4)', 'Satu pembagian (seed 4)'), rows.one, 7)}${panel(352, tr('Average of 30 cuts (seeds 1 to 30)', 'Rata-rata 30 pembagian (seed 1 sampai 30)'), rows.avg, 8)}
${dot(150, 283, k(0), 4.5)}${text(160, 287, tr('training penguins', 'penguin training'), { anchor: 'start', size: 12 })}${dot(330, 283, k(1), 4.5)}${text(340, 287, tr('validation penguins', 'penguin validasi'), { anchor: 'start', size: 12 })}${text(520, 287, tr('accuracy (%)', 'accuracy (%)'), { anchor: 'start', size: 12 })}`);
}

// Figure 3: the leaves of the tree grown on the same 200 penguins with no depth limit, for minimum leaf size 1
// and 10. Each leaf is [penguins in it, sex it predicts], sorted by size.
const LEAVES_MIN1 = [[1, 'f'], [1, 'f'], [1, 'f'], [1, 'm'], [1, 'm'], [1, 'm'], [1, 'm'], [2, 'f'], [2, 'm'], [2, 'm'], [3, 'f'], [3, 'f'], [3, 'm'], [4, 'f'], [4, 'f'], [4, 'm'], [5, 'm'], [5, 'm'], [16, 'f'], [17, 'm'], [28, 'f'], [36, 'f'], [59, 'm']];
const LEAVES_MIN10 = [[10, 'f'], [10, 'm'], [11, 'm'], [13, 'm'], [17, 'm'], [20, 'f'], [20, 'f'], [39, 'f'], [60, 'm']];

function leafSizes() {
  const strip = (y0, title, leaves, train, valid, mark) => {
    const base = y0 + 128, scale = 100 / 60, x0 = 30, stepX = 27, bw = 20;
    const bars = leaves.map(([n, sex], i) => {
      const x = x0 + i * stepX, h = n * scale;
      return `<rect x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="2" fill="${k(SEX[sex])}"/>${text(x + bw / 2, base - h - 5, fmt(n), { size: 11.5, ...INK })}`;
    }).join('');
    const ones = leaves.filter(l => l[0] === 1).length;
    const note = mark ? `${line(x0, base - 30, x0 + ones * stepX - 7, base - 30, { c: 'var(--ink)', w: 1.6 })}${text(x0, base - 38, tr(`${fmt(ones)} leaves hold a single penguin`, `${fmt(ones)} leaf hanya berisi satu penguin`), { anchor: 'start', size: 12, ...INK })}` : '';
    return `${text(8, y0 + 8, title, { anchor: 'start', ...INK })}
${text(672, y0 + 8, tr(`training ${fmt(train)} of ${fmt(TRAIN_N)}, validation ${fmt(valid)} of ${fmt(VALID_N)}`, `training ${fmt(train)} dari ${fmt(TRAIN_N)}, validasi ${fmt(valid)} dari ${fmt(VALID_N)}`), { anchor: 'end', size: 12 })}
${line(x0 - 6, base, 660, base, { c: 'var(--muted)', w: 1.4 })}${bars}${note}`;
  };
  return svg(680, 326, `${strip(14, tr(`Minimum leaf size 1: ${fmt(LEAVES_MIN1.length)} leaves`, `Minimum leaf size 1: ${fmt(LEAVES_MIN1.length)} leaf`), LEAVES_MIN1, 200, 54, true)}
${strip(164, tr(`Minimum leaf size 10: ${fmt(LEAVES_MIN10.length)} leaves`, `Minimum leaf size 10: ${fmt(LEAVES_MIN10.length)} leaf`), LEAVES_MIN10, 182, 57, false)}
<rect x="30" y="304" width="14" height="14" rx="3" fill="${k(SEX.f)}"/>${text(50, 316, tr('predicts female', 'memprediksi betina'), { anchor: 'start', size: 12 })}
<rect x="190" y="304" width="14" height="14" rx="3" fill="${k(SEX.m)}"/>${text(210, 316, tr('predicts male', 'memprediksi jantan'), { anchor: 'start', size: 12 })}
${text(660, 316, tr('Number = training penguins in the leaf', 'Angka = penguin training di leaf'), { anchor: 'end', size: 12 })}`);
}

export const figures = { 'depth-3-tree': depthThreeTree, 'depth-curves': depthCurves, 'leaf-sizes': leafSizes };
