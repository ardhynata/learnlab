// Figures for the lesson "Tree builder lab": [[figure:tree-builder-lab/name|Caption]].
// Every number is real and comes from the lab's own math (sims/ml/treebuilder.js and tree.js) on the lab's
// default sample: the "Overlapping blobs" pattern at the shared seed 520, 150 points of which 100 train the
// tree and 50 are held back (rounded to 3 decimals here; every count and accuracy below was re-checked on
// the rounded points). Figures are drawn synchronously, so the points are constants; the counts, Gini values,
// regions and accuracies are computed from them with tree.js. The accuracy-by-depth curves in the last figure
// are constants read off the lab: blobs with "Jump to the best first split", checker with the default first split.
import { svg, dot, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';
import { fitTreeWithFirstSplit, leafCount, accuracy, gini } from '../../sims/ml/tree.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const TRAIN = [[1.734,4.154,0],[2.493,5.881,0],[6.502,6.190,1],[3.562,4.828,0],[4.754,5.199,0],[6.252,3.307,1],[4.857,3.797,1],[4.728,6.343,0],[6.911,1.954,1],[2.954,5.861,0],[2.866,4.574,0],[5.261,4.171,1],[1.584,4.815,0],[5.791,1.630,1],[5.207,5.121,1],[3.169,5.148,0],[3.615,4.433,0],[3.959,7.257,0],[1.775,6.080,0],[2.060,5.461,0],[6.221,3.095,1],[6.776,4.250,1],[6.614,3.314,1],[5.586,6.203,1],[5.999,4.680,0],[7.643,5.557,1],[2.351,6.075,0],[7.522,2.988,1],[5.762,3.829,1],[7.014,5.714,1],[4.008,5.112,0],[3.123,4.412,0],[6.485,2.681,1],[2.829,5.091,0],[8.203,5.038,1],[2.459,3.479,0],[8.086,5.616,1],[7.730,4.192,1],[5.913,4.566,1],[7.440,4.804,1],[0.852,4.786,0],[4.324,6.832,0],[5.606,2.545,1],[4.654,3.220,1],[9.133,3.142,1],[7.150,1.628,1],[4.179,8.346,0],[4.089,3.229,1],[2.235,5.315,0],[6.346,3.094,1],[5.457,5.109,1],[8.243,4.299,1],[3.420,3.701,0],[7.716,4.445,1],[5.799,3.274,1],[4.148,4.035,1],[1.799,5.924,0],[8.521,4.525,1],[5.116,2.409,1],[6.594,3.372,1],[1.739,7.434,0],[3.243,7.908,0],[4.706,6.606,0],[6.142,4.979,1],[6.099,3.737,1],[3.833,7.971,0],[3.535,7.572,0],[5.514,5.053,1],[4.245,4.532,0],[7.506,1.972,1],[1.407,4.342,0],[7.379,3.987,1],[8.779,4.996,1],[5.649,4.019,0],[4.553,6.068,0],[5.094,4.038,1],[2.578,5.886,0],[2.363,5.506,0],[7.044,4.072,1],[5.413,4.795,1],[2.182,5.397,0],[6.071,6.342,1],[2.307,5.166,0],[2.195,5.720,0],[5.952,2.144,1],[1.776,5.442,0],[3.969,4.599,1],[2.718,5.821,0],[4.730,2.798,1],[5.617,2.434,1],[3.416,6.040,0],[1.995,5.347,0],[3.477,6.366,0],[6.001,6.018,1],[3.119,5.588,0],[2.386,6.676,0],[6.742,4.626,1],[4.649,5.638,0],[4.610,6.242,0],[3.429,5.480,0]];
const VALID = [[1.737,5.881,0],[6.055,4.535,0],[8.360,3.459,1],[7.950,6.458,1],[4.831,7.202,0],[3.285,7.397,0],[4.125,7.886,0],[5.000,5.209,0],[4.655,5.251,0],[7.025,4.040,1],[7.402,3.398,1],[2.760,4.957,0],[4.156,5.422,1],[6.216,5.695,1],[5.121,5.770,0],[8.614,4.315,1],[4.263,5.111,0],[7.059,4.563,1],[3.668,7.114,0],[7.007,6.210,1],[5.567,6.970,0],[4.370,5.078,1],[5.300,3.229,1],[6.640,4.883,1],[3.250,5.669,0],[5.641,6.112,0],[4.600,2.686,1],[8.922,3.373,1],[4.483,4.800,0],[2.849,6.771,0],[8.346,3.218,1],[3.164,6.425,0],[3.611,4.620,0],[4.468,5.580,0],[6.755,2.364,1],[2.515,5.129,0],[7.399,5.323,1],[4.371,6.084,1],[3.228,9.047,0],[5.844,6.734,1],[7.855,5.568,1],[7.603,4.251,1],[6.788,5.077,1],[4.644,6.943,0],[7.351,4.392,1],[1.500,5.160,0],[2.597,5.062,0],[7.757,5.030,1],[2.427,4.272,0],[2.651,4.955,0]];

const BEST = 4.8055, START = 3.4261;   // the best first split on the training points, and where the lab starts

// Draws a 0..10 square with a frame. Returns helpers to map data to the picture.
function frame(ox, oy, w) {
  const px = x => ox + x * w / 10, py = y => oy + w - y * w / 10;
  return { px, py, body: `<rect x="${ox}" y="${oy}" width="${w}" height="${w}" rx="6" fill="var(--surface)" stroke="var(--line)" stroke-width="1.6"/>` };
}
const cols = pts => ({ points: pts.map(p => [p[0], p[1]]), labels: pts.map(p => p[2]) });

// Figure 1: the learner's first split at the lab's start (3.4) next to the best one (4.8).
function firstSplit() {
  const w = 262, oy = 34;
  const panel = (ox, t, title) => {
    const f = frame(ox, oy, w);
    const left = TRAIN.filter(p => p[0] <= t), right = TRAIN.filter(p => p[0] > t);
    const cnt = g => [g.filter(p => p[2] === 0).length, g.filter(p => p[2] === 1).length];
    const [l, r] = [cnt(left), cnt(right)];
    const gl = gini(l), gr = gini(r), after = (left.length * gl + right.length * gr) / TRAIN.length, before = gini(cnt(TRAIN));
    const dots = TRAIN.map(p => dot(f.px(p[0]), f.py(p[1]), k(p[2]), 3.6)).join('');
    const x = f.px(t);
    return `${f.body}${dots}${line(x, oy, x, oy + w, { c: 'var(--ink)', w: 3 })}
${text(ox + w / 2, 20, title, { size: 14, ...INK })}
${text(ox + 4, oy + w + 22, `${tr('Left', 'Kiri')}: ${fmt(l[0])} A, ${fmt(l[1])} B, Gini ${fmt(gl, { digits: 3 })}`, { anchor: 'start', size: 12.5 })}
${text(ox + 4, oy + w + 40, `${tr('Right', 'Kanan')}: ${fmt(r[0])} A, ${fmt(r[1])} B, Gini ${fmt(gr, { digits: 3 })}`, { anchor: 'start', size: 12.5 })}
${text(ox + 4, oy + w + 60, tr(`Weighted ${fmt(after, { digits: 3 })}, drop ${fmt(before - after, { digits: 3 })}`, `Berbobot ${fmt(after, { digits: 3 })}, penurunan ${fmt(before - after, { digits: 3 })}`), { anchor: 'start', size: 13.5, ...INK })}`;
  };
  return svg(680, 372, `${panel(8, START, tr(`Start: Feature 1 ≤ ${fmt(3.4, { digits: 1 })}`, `Awal: Feature 1 ≤ ${fmt(3.4, { digits: 1 })}`))}${panel(350, BEST, tr(`Best: Feature 1 ≤ ${fmt(4.8, { digits: 1 })}`, `Terbaik: Feature 1 ≤ ${fmt(4.8, { digits: 1 })}`))}`);
}

// Figure 2: the tree grown on the best first split to depth 1, 3 and 5, with its regions and its two scores.
function regionsOf(node, b, out) {
  if (node.leaf) { out.rects.push({ ...b, label: node.label }); return; }
  const t = node.threshold;
  const [lb, rb] = node.feature === 0 ? [{ ...b, x1: t }, { ...b, x0: t }] : [{ ...b, y1: t }, { ...b, y0: t }];
  out.lines.push(node.feature === 0 ? { x0: t, x1: t, y0: b.y0, y1: b.y1, d: node.depth } : { x0: b.x0, x1: b.x1, y0: t, y1: t, d: node.depth });
  regionsOf(node.left, lb, out); regionsOf(node.right, rb, out);
}

function grownTrees() {
  const w = 206, oy = 30, m = cols(TRAIN), v = cols(VALID);
  const panel = (ox, depth) => {
    const tree = fitTreeWithFirstSplit(m.points, m.labels, 0, BEST, { maxDepth: depth, minLeaf: 1 });
    const out = { rects: [], lines: [] };
    regionsOf(tree, { x0: 0, x1: 10, y0: 0, y1: 10 }, out);
    const f = frame(ox, oy, w);
    const fills = out.rects.map(r => `<rect x="${f.px(r.x0)}" y="${f.py(r.y1)}" width="${f.px(r.x1) - f.px(r.x0)}" height="${f.py(r.y0) - f.py(r.y1)}" fill="${soft(r.label)}"/>`).join('');
    const cuts = out.lines.sort((a, b) => b.d - a.d).map(l => line(f.px(l.x0), f.py(l.y0), f.px(l.x1), f.py(l.y1), l.d === 0 ? { c: 'var(--ink)', w: 3 } : { c: 'var(--ink)', w: 1.4, dash: '5 4' })).join('');
    const dots = TRAIN.map(p => dot(f.px(p[0]), f.py(p[1]), k(p[2]), 2.8)).join('');
    const crosses = VALID.map(p => `<path d="M${f.px(p[0]) - 3.4} ${f.py(p[1]) - 3.4}l6.8 6.8M${f.px(p[0]) - 3.4} ${f.py(p[1]) + 3.4}l6.8-6.8" stroke="${k(p[2])}" stroke-width="1.8" stroke-linecap="round"/>`).join('');
    const tA = accuracy(tree, m.points, m.labels), vA = accuracy(tree, v.points, v.labels);
    return `${f.body}${fills}${cuts}${dots}${crosses}
${text(ox + w / 2, 20, tr(`Depth ${depth}: ${fmt(leafCount(tree))} leaves`, `Kedalaman ${depth}: ${fmt(leafCount(tree))} leaf`), { size: 14, ...INK })}
${text(ox + w / 2, oy + w + 20, `${tr('Training', 'Training')} ${pct(tA, 0)}`, { size: 13, ...INK })}
${text(ox + w / 2, oy + w + 38, `${tr('Validation', 'Validasi')} ${pct(vA, 0)}`, { size: 13, ...INK })}`;
  };
  const legend = `${dot(176, 306, 'var(--muted)', 3.4)}${text(186, 310, tr('training point', 'titik training'), { anchor: 'start', size: 12 })}
<path d="M335 302l8 8M335 310l8-8" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"/>${text(350, 310, tr('validation point', 'titik validasi'), { anchor: 'start', size: 12 })}
${line(480, 306, 504, 306, { c: 'var(--ink)', w: 3 })}${text(510, 310, tr('your first split', 'split pertamamu'), { anchor: 'start', size: 12 })}`;
  return svg(680, 318, `${panel(6, 1)}${panel(237, 3)}${panel(468, 5)}${legend}`);
}

// Figure 3: training and validation accuracy against maximum depth 1..10 on two samples. [depth 1..10] in percent.
const CURVES = {
  blobs: { train: [93, 96, 97, 98, 100, 100, 100, 100, 100, 100], valid: [80, 82, 82, 82, 84, 84, 84, 84, 84, 84] },
  checker: { train: [55, 73, 86, 93, 96, 99, 100, 100, 100, 100], valid: [52, 74, 82, 88, 88, 76, 78, 78, 78, 78] },
};

function depthCurves() {
  const top = 54, bottom = 214, pw = 320, lo = 40, hi = 100;
  const Y = v => bottom - (v - lo) / (hi - lo) * (bottom - top);
  const panel = (ox, title, data) => {
    const X = d => ox + 50 + (d - 1) * (pw - 70) / 9;
    const path = (ys, c) => `<path d="${ys.map((y, i) => `${i ? 'L' : 'M'}${X(i + 1).toFixed(1)} ${Y(y).toFixed(1)}`).join('')}" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>${ys.map((y, i) => dot(X(i + 1), Y(y), c, 3.8)).join('')}`;
    const peak = Math.max(...data.valid), at = data.valid.indexOf(peak) + 1;
    const last = data.valid.length, gap = data.train[last - 1] - data.valid[last - 1];
    const bracket = `${line(X(last) + 8, Y(data.train[last - 1]), X(last) + 8, Y(data.valid[last - 1]), { c: 'var(--ink)', w: 1.6 })}${text(X(last) + 2, Y(data.valid[last - 1]) + 22, tr(`gap ${fmt(gap)} pts`, `selisih ${fmt(gap)} poin`), { anchor: 'end', size: 12, ...INK })}`;
    const best = `<circle cx="${X(at)}" cy="${Y(peak)}" r="8" fill="none" stroke="var(--ink)" stroke-width="2"/>`;
    return `${box(ox, 28, pw, 222)}${text(ox + pw / 2, 20, title, INK)}
${line(ox + 44, bottom, ox + pw - 10, bottom, { c: 'var(--muted)', w: 1.4 })}${line(ox + 44, bottom, ox + 44, top - 8, { c: 'var(--muted)', w: 1.4 })}
${[50, 75, 100].map(v => `${line(ox + 44, Y(v), ox + pw - 10, Y(v), { c: 'var(--line)', w: 1, dash: '3 4' })}${text(ox + 38, Y(v) + 4, `${fmt(v)}%`, { anchor: 'end', size: 11.5 })}`).join('')}
${data.valid.map((_, i) => text(X(i + 1), bottom + 16, fmt(i + 1), { size: 11.5 })).join('')}
${text(ox + pw / 2 + 20, bottom + 32, tr('maximum depth', 'kedalaman maksimum'), { size: 12 })}
${path(data.train, k(0))}${path(data.valid, k(1))}${best}${bracket}`;
  };
  return svg(680, 296, `${panel(8, tr('Overlapping blobs, best first split', 'Gumpalan, split pertama terbaik'), CURVES.blobs)}${panel(352, tr('Checker pattern, starting split', 'Pola papan catur, split pertama awal'), CURVES.checker)}
${dot(150, 283, k(0), 4.5)}${text(160, 287, tr('training accuracy', 'training accuracy'), { anchor: 'start', size: 12 })}${dot(330, 283, k(1), 4.5)}${text(340, 287, tr('validation accuracy', 'validation accuracy'), { anchor: 'start', size: 12 })}<circle cx="490" cy="283" r="6" fill="none" stroke="var(--ink)" stroke-width="2"/>${text(502, 287, tr('best validation', 'validasi terbaik'), { anchor: 'start', size: 12 })}`);
}

export const figures = { 'first-split': firstSplit, 'grown-trees': grownTrees, 'depth-curves': depthCurves };
