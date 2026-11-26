// Figures for the lab lesson "Three questions, one dataset": [[figure:three-questions/name|Caption]].
// The bird figures are computed from the same invented birds the lab shows by default (seed 7), with the
// lab's own math, so they match the numbers in the text and in the lab. The penguin figure uses real rows
// from data/penguins.csv (a sample of dots) and the lines fitted on all 342 measured penguins.
import { svg, dot, text, line, box, k, soft, tr, fmt } from '../kit.js';
import { birdsDataset, regressionFit, rankPairsOn } from '../../sims/ml/threequestions.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const f1 = v => fmt(v, { digits: 1 });
const f2 = v => fmt(v, { digits: 2 });
const f3 = v => fmt(v, { digits: 3 });
const signed3 = v => (v > 0 ? '+' : v < 0 ? '−' : '') + f3(Math.abs(v));

// The lab's default data, built once (a figure is redrawn when the language changes).
let birdsCache = null;
const birds = () => (birdsCache ??= birdsDataset(7));
const FEATURE_NAMES = () => [tr('Bill length', 'Panjang paruh'), tr('Bill depth', 'Tebal paruh'), tr('Flipper length', 'Panjang sirip'), tr('Body mass', 'Berat badan')];
let pairsCache = null;
const pairs = () => (pairsCache ??= rankPairsOn(birds().rows, 4, 'species'));

// ---- 1. What each question needs, in one table --------------------------------------------------
function questionRoles() {
  const L = FEATURE_NAMES();
  const rows = [
    {
      c: 0, name: 'Regression',
      cells: [[L[1], tr('a number', 'angka')], [L[0], ''], [tr('A straight line', 'Garis lurus'), ''], ['R²', tr('average error', 'galat rata-rata')]],
    },
    {
      c: 1, name: 'Classification',
      cells: [[tr('Species', 'Spesies'), tr('a name', 'nama')], [L[0], L[1].toLowerCase()], [tr('A species for', 'Spesies untuk'), tr('each bird', 'tiap burung')], [tr('Score vs', 'Skor vs'), 'baseline']],
    },
    {
      c: 2, name: 'Clustering',
      cells: [[tr('None', 'Tidak ada'), tr('no label', 'tanpa label')], [L[0], L[1].toLowerCase()], [tr('k groups', 'k kelompok'), ''], ['Silhouette', '']],
    },
  ];
  const heads = [tr('Target', 'Target'), tr('Features used', 'Fitur yang dipakai'), tr('Gives back', 'Hasilnya'), tr('Judged by', 'Dinilai dengan')];
  const cx = [222, 366, 502, 616], rowH = 66, y0 = 44;
  const head = heads.map((h, i) => text(cx[i], 28, h, { size: 12.5, weight: 700 })).join('') + text(76, 28, tr('Question', 'Pertanyaan'), { size: 12.5, weight: 700 });
  const body = rows.map((r, i) => {
    const y = y0 + i * (rowH + 10), cy = y + rowH / 2;
    const cells = r.cells.map(([a, b], j) => (b
      ? text(cx[j], cy - 3, a, { size: 13, fill: 'var(--ink)' }) + text(cx[j], cy + 15, b, { size: 13, fill: 'var(--ink)' })
      : text(cx[j], cy + 5, a, { size: 13, fill: 'var(--ink)' }))).join('');
    return `${box(8, y, 664, rowH, soft(r.c), k(r.c))}${text(76, cy + 6, r.name, { ...INK, size: 15, fill: k(r.c) })}${line(146, y + 10, 146, y + rowH - 10, { c: k(r.c), w: 1.4 })}${cells}`;
  }).join('');
  return svg(680, 296, `${head}${body}
${text(340, 284, tr('Example columns: the same birds, the same two columns, three different jobs.', 'Contoh kolom: burung yang sama, dua kolom yang sama, tiga tugas yang berbeda.'), { size: 12.5 })}`);
}

// ---- 2. A line, its gaps and one bird ----------------------------------------------------------
function regressionGap() {
  const ds = birds(), rows = ds.rows;
  const fit = regressionFit(rows.map(r => r.f[0]), rows.map(r => r.f[1]));
  const meanY = rows.reduce((s, r) => s + r.f[1], 0) / rows.length;
  const bird = rows.find(r => r.id === 54);
  const px = 62, py = 16, w = 384, h = 262, xr = [30, 55], yr = [12, 22];
  const X = v => px + (v - xr[0]) / (xr[1] - xr[0]) * w, Y = v => py + h - (v - yr[0]) / (yr[1] - yr[0]) * h;
  const ticksX = [30, 35, 40, 45, 50, 55], ticksY = [12, 14, 16, 18, 20, 22];
  const grid = `${box(px, py, w, h)}${ticksX.map(t => `${line(X(t), py + h, X(t), py + h + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(t), py + h + 19, fmt(t), { size: 11.5 })}`).join('')}${ticksY.map(t => `${line(px - 5, Y(t), px, Y(t), { c: 'var(--muted)', w: 1.4 })}${text(px - 9, Y(t) + 4, fmt(t), { anchor: 'end', size: 11.5 })}`).join('')}`;
  const dots = rows.map(r => dot(X(r.f[0]), Y(r.f[1]), 'var(--muted)', 3.6)).join('');
  const yLine = v => fit.intercept + fit.slope * v;
  const lineSvg = line(X(xr[0] + 1), Y(yLine(xr[0] + 1)), X(xr[1] - 1), Y(yLine(xr[1] - 1)), { c: 'var(--accent)', w: 3.4 });
  const meanSvg = line(X(xr[0]), Y(meanY), X(xr[1]), Y(meanY), { c: 'var(--ink)', w: 1.8, dash: '6 5' });
  const bx = X(bird.f[0]), byy = Y(bird.f[1]), ly = Y(yLine(bird.f[0]));
  const hi = `${line(bx, ly, bx, byy, { c: k(0), w: 3.2 })}<circle cx="${bx}" cy="${byy}" r="7" fill="var(--surface)" stroke="${k(0)}" stroke-width="2.6"/>`;
  const gap = Math.abs(yLine(bird.f[0]) - bird.f[1]);
  const rx = 476;
  const panel = `${text(rx, 44, `${tr('Bird', 'Burung')} #${bird.id}`, { ...INK, anchor: 'start', size: 15, fill: k(0) })}
${text(rx, 68, `${tr('Bill length', 'Panjang paruh')} ${f1(bird.f[0])} mm`, { anchor: 'start', size: 13, fill: 'var(--ink)' })}
${text(rx, 90, `${tr('Real depth', 'Tebal sebenarnya')} ${f1(bird.f[1])} mm`, { anchor: 'start', size: 13, fill: 'var(--ink)' })}
${text(rx, 112, `${tr('Line says', 'Kata garis')} ${f2(yLine(bird.f[0]))} mm`, { anchor: 'start', size: 13, fill: 'var(--ink)' })}
${text(rx, 138, `${tr('Gap', 'Selisih')} ${f2(gap)} mm`, { ...INK, anchor: 'start', size: 15, fill: k(0) })}
${line(rx, 176, rx + 34, 176, { c: 'var(--accent)', w: 3.4 })}${text(rx + 44, 180, tr('Best line', 'Garis terbaik'), { anchor: 'start', size: 12.5, fill: 'var(--ink)' })}
${text(rx + 44, 198, `y = ${f2(fit.intercept)} − ${fmt(Math.abs(fit.slope), { digits: 4 })} x`, { anchor: 'start', size: 12 })}
${line(rx, 226, rx + 34, 226, { c: 'var(--ink)', w: 1.8, dash: '6 5' })}${text(rx + 44, 230, tr('Always the mean', 'Selalu rata-rata'), { anchor: 'start', size: 12.5, fill: 'var(--ink)' })}
${text(rx + 44, 248, `${f1(meanY)} mm`, { anchor: 'start', size: 12 })}`;
  return svg(680, 318, `${grid}${dots}${meanSvg}${lineSvg}${hi}
${text(px + w / 2, py + h + 38, `${tr('Bill length', 'Panjang paruh')} (mm)`, { size: 12.5 })}
<text transform="translate(16 ${py + h / 2}) rotate(-90)" text-anchor="middle" font-size="12.5" font-weight="500" fill="var(--muted)">${tr('Bill depth', 'Tebal paruh')} (mm)</text>
${panel}`);
}

// ---- 3. Scores of all pairs against the baseline ---------------------------------------------
function scoreBars() {
  const L = FEATURE_NAMES();
  const list = pairs();
  const base = 1 / 3;
  const x0 = 232, w = 380, y0 = 54, rowH = 34;
  const X = s => x0 + s * w;
  const name = p => `${L[p.a]} ${tr('and', 'dan')} ${L[p.b].toLowerCase()}`;
  const bars = list.map((p, i) => {
    const y = y0 + i * rowH;
    return `${text(x0 - 10, y + 17, name(p), { anchor: 'end', size: 12.5, fill: 'var(--ink)' })}<rect x="${x0}" y="${y + 3}" width="${p.score * w}" height="22" rx="4" fill="${k(1)}"/>${text(X(p.score) + 7, y + 19, `${fmt(Math.round(p.score * 100))}%`, { anchor: 'start', size: 13, ...INK })}`;
  }).join('');
  const yb = y0 + list.length * rowH + 8;
  const baseRow = `${text(x0 - 10, yb + 17, tr('Always guess one species', 'Selalu menebak satu spesies'), { anchor: 'end', size: 12.5, fill: 'var(--ink)' })}<rect x="${x0}" y="${yb + 3}" width="${base * w}" height="22" rx="4" fill="var(--muted)"/>${text(X(base) + 7, yb + 19, `${fmt(Math.round(base * 100))}%`, { anchor: 'start', size: 13, ...INK })}`;
  const guide = `${line(X(base), y0 - 6, X(base), yb + 28, { c: 'var(--ink)', w: 1.8, dash: '6 5' })}`;
  const axis = [0, 0.25, 0.5, 0.75, 1].map(t => `${line(X(t), yb + 34, X(t), yb + 40, { c: 'var(--muted)', w: 1.4 })}${text(X(t), yb + 54, `${fmt(t * 100)}%`, { size: 11.5 })}`).join('');
  return svg(680, yb + 74, `${text(340, 22, tr('Classification score of every pair of columns (120 birds, species as the label)', 'Skor classification tiap pasangan kolom (120 burung, spesies sebagai label)'), { size: 13, ...INK })}
${guide}${bars}${baseRow}${line(x0, yb + 34, x0 + w, yb + 34, { c: 'var(--muted)', w: 1.4 })}${axis}`);
}

// ---- 4. Real penguins: one trend overall, the opposite inside each species ------------------------
// Every sixth measured penguin: [bill length mm, bill depth mm, species 0 Adelie / 1 Chinstrap / 2 Gentoo].
const SAMPLE = [[39.1, 18.7, 0], [39.2, 19.6, 0], [38.6, 21.2, 0], [46, 21.5, 0], [35.3, 18.9, 0], [37.2, 18.1, 0], [42.2, 18.5, 0], [44.1, 19.7, 0], [42.3, 21.2, 0], [41.4, 18.6, 0], [41.3, 21.1, 0], [41.1, 19.1, 0], [45.8, 18.9, 0], [42.1, 19.1, 0], [41.3, 20.3, 0], [41.1, 18.1, 0], [40.3, 18.5, 0], [37.8, 20, 0], [43.2, 19, 0], [42.7, 18.3, 0], [37.7, 19.8, 0], [41.5, 18.3, 0], [37.5, 18.5, 0], [39.7, 17.9, 0], [39, 18.7, 0], [41.5, 18.5, 0],
  [51.3, 19.2, 1], [46, 18.9, 1], [45.9, 17.1, 1], [42.4, 17.3, 1], [50.5, 18.4, 1], [42.5, 16.7, 1], [46.9, 16.6, 1], [50.9, 17.9, 1], [48.1, 16.4, 1], [45.2, 16.6, 1], [45.7, 17, 1],
  [46.5, 13.5, 2], [49, 16.1, 2], [49.2, 15.2, 2], [46.3, 15.8, 2], [50, 15.3, 2], [48.4, 16.3, 2], [49.6, 16, 2], [50.5, 15.9, 2], [50.1, 15, 2], [50.4, 15.3, 2], [49.8, 16.8, 2], [46.4, 15.6, 2], [51.1, 16.3, 2], [50, 15.9, 2], [52.1, 17, 2], [50.8, 15.7, 2], [55.9, 17, 2], [53.4, 15.8, 2], [51.5, 16.3, 2], [46.8, 14.3, 2]];
// Straight lines fitted on all 342 measured penguins (slope in mm of depth per mm of length), with the range of bill length each one covers.
const WHOLE = { slope: -0.085, intercept: 20.885, from: 32, to: 60 };
const INSIDE = [
  { sp: 0, name: 'Adelie', slope: 0.179, intercept: 11.409, from: 32.1, to: 46 },
  { sp: 1, name: 'Chinstrap', slope: 0.222, intercept: 7.569, from: 40.9, to: 58 },
  { sp: 2, name: 'Gentoo', slope: 0.205, intercept: 5.251, from: 40.9, to: 59.6 },
];

function trendFlip() {
  const px = 62, py = 16, w = 440, h = 262, xr = [30, 60], yr = [12, 22];
  const X = v => px + (v - xr[0]) / (xr[1] - xr[0]) * w, Y = v => py + h - (v - yr[0]) / (yr[1] - yr[0]) * h;
  const ticksX = [30, 35, 40, 45, 50, 55, 60], ticksY = [12, 14, 16, 18, 20, 22];
  const grid = `${box(px, py, w, h)}${ticksX.map(t => `${line(X(t), py + h, X(t), py + h + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(t), py + h + 19, fmt(t), { size: 11.5 })}`).join('')}${ticksY.map(t => `${line(px - 5, Y(t), px, Y(t), { c: 'var(--muted)', w: 1.4 })}${text(px - 9, Y(t) + 4, fmt(t), { anchor: 'end', size: 11.5 })}`).join('')}`;
  const dots = SAMPLE.map(p => dot(X(p[0]), Y(p[1]), k(p[2]), 4.4)).join('');
  const seg = (l, c, o) => line(X(l.from), Y(l.intercept + l.slope * l.from), X(l.to), Y(l.intercept + l.slope * l.to), { c, ...o });
  const inside = INSIDE.map(l => seg(l, k(l.sp), { w: 3.4 })).join('');
  const whole = seg(WHOLE, 'var(--ink)', { w: 2.8, dash: '8 6' });
  const rx = 520;
  const legend = `${text(rx, 44, tr('Inside each species', 'Di dalam tiap spesies'), { anchor: 'start', size: 13, ...INK })}
${INSIDE.map((l, i) => `${line(rx, 66 + i * 24, rx + 22, 66 + i * 24, { c: k(l.sp), w: 3.4 })}${text(rx + 30, 70 + i * 24, `${l.name} ${signed3(l.slope)}`, { anchor: 'start', size: 12.5, fill: 'var(--ink)' })}`).join('')}
${text(rx, 168, tr('All penguins together', 'Semua penguin'), { anchor: 'start', size: 13, ...INK })}
${line(rx, 190, rx + 22, 190, { c: 'var(--ink)', w: 2.8, dash: '8 6' })}${text(rx + 30, 194, signed3(WHOLE.slope), { anchor: 'start', size: 12.5, fill: 'var(--ink)' })}
${text(rx, 224, tr('slope: mm of depth', 'slope: mm tebal paruh'), { anchor: 'start', size: 11.5 })}${text(rx, 240, tr('per mm of length', 'per mm panjang paruh'), { anchor: 'start', size: 11.5 })}`;
  return svg(680, 318, `${grid}${dots}${whole}${inside}
${text(px + w / 2, py + h + 38, `${tr('Bill length', 'Panjang paruh')} (mm)`, { size: 12.5 })}
<text transform="translate(16 ${py + h / 2}) rotate(-90)" text-anchor="middle" font-size="12.5" font-weight="500" fill="var(--muted)">${tr('Bill depth', 'Tebal paruh')} (mm)</text>
${legend}`);
}

export const figures = {
  'question-roles': questionRoles,
  'regression-gap': regressionGap,
  'score-bars': scoreBars,
  'trend-flip': trendFlip,
};
