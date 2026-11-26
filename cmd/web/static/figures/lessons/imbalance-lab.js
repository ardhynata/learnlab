// Figures for the "Imbalance lab" lesson. Three of them draw the lab's own default sample (generated data, seed 3,
// 1,000 training and 1,000 test examples) with the lab's own math from sims/ml/imbalance.js, so they agree with the
// lesson text and with the lab. The penguin figure shows numbers read from the lab on the real data (the CSV loads
// asynchronously, which a figure cannot wait for): Chinstrap at 10% positives, samples 1 to 3 (seeds 3, 4, 5).
import { svg, dot, text, line, box, k, tr, fmt, pct } from '../kit.js';
import { generatedData, fitModel, evaluate } from '../../sims/ml/imbalance.js';

const ink = { fill: 'var(--ink)' };
const SEED = 3, N = 1000, TEST_SEED_OFFSET = 7919; // the same values as the lab (TEST_SEED_OFFSET is private to it)
const SHARES = [50, 20, 10, 5, 2, 1];

// Numbers only, computed once; the text around them is built when each figure is drawn.
let cache = null;
function numbers() {
  if (cache) return cache;
  const fits = new Map();
  const run = (share, weighted, threshold = 0.5) => {
    const key = `${share}|${weighted}`;
    if (!fits.has(key)) {
      const train = generatedData({ n: N, fraction: share / 100, seed: SEED });
      const test = generatedData({ n: N, fraction: share / 100, seed: SEED + TEST_SEED_OFFSET });
      fits.set(key, { train, test, model: fitModel(train, { weighted }) });
    }
    const f = fits.get(key);
    return evaluate(f.train, f.test, { weighted, threshold, model: f.model });
  };
  const plain = SHARES.map(s => run(s, false));
  const weighted = SHARES.map(s => run(s, true));
  const curve = w => [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8]
    .map(t => run(5, w, t).model).filter(m => !m.undefined.precision).map(m => ({ recall: m.recall, precision: m.precision }));
  const point = (w, t) => { const m = run(5, w, t).model; return { recall: m.recall, precision: m.precision }; };
  cache = {
    plain, weighted,
    curvePlain: curve(false), curveWeighted: curve(true),
    marks: { plain: point(false, 0.5), t20: point(false, 0.2), t10: point(false, 0.1), weight: point(true, 0.5) },
  };
  return cache;
}

// A frame with a percent y axis and the six shares on the x axis, rarer to the right.
function frame({ L, T, W, H, xAt }) {
  const Y = v => T + (1 - v) * H;
  const grid = [0, 0.25, 0.5, 0.75, 1].map(v => `${line(L, Y(v), L + W, Y(v), { w: 1 })}${text(L - 8, Y(v) + 4, pct(v, 0), { anchor: 'end', size: 12 })}`).join('');
  const ticks = SHARES.map((s, i) => text(xAt(i), T + H + 20, `${fmt(s)}%`, { size: 12 })).join('');
  const axes = `${line(L, T, L, T + H, { c: 'var(--muted)', w: 1.8 })}${line(L, T + H, L + W, T + H, { c: 'var(--muted)', w: 1.8 })}`;
  const xTitle = text(L + W / 2, T + H + 44, tr('Share of positive examples (rarer to the right)', 'Persentase contoh positif (makin langka ke kanan)'), { size: 13 });
  return { Y, back: grid + axes + ticks + xTitle };
}

const path = pts => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')}`;

// ---- Figure 1: accuracy climbs, recall falls. -------------------------------------------------------------------
function shareSweep() {
  const d = numbers();
  const L = 64, T = 52, W = 560, H = 230, xAt = i => L + 30 + i * (W - 60) / (SHARES.length - 1);
  const { Y, back } = frame({ L, T, W, H, xAt });
  const series = [
    [tr('Baseline accuracy', 'Accuracy baseline'), d.plain.map(r => r.baseline.accuracy), 'var(--muted)', '7 5'],
    [tr('Model accuracy', 'Accuracy model'), d.plain.map(r => r.model.accuracy), k(2), ''],
    [tr('Model recall', 'Recall model'), d.plain.map(r => r.model.recall), k(1), ''],
  ];
  const lines = series.map(([, vals, color, dash]) => `<path d="${path(vals.map((v, i) => [xAt(i), Y(v)]))}" fill="none" stroke="${color}" stroke-width="3.2" ${dash ? `stroke-dasharray="${dash}"` : ''}/>${vals.map((v, i) => dot(xAt(i), Y(v), color, 4.5)).join('')}`).join('');
  const recall = d.plain.map((r, i) => text(xAt(i), Y(r.model.recall) + 22, pct(r.model.recall), { size: 13, weight: 700, ...ink })).join('');
  const legend = series.map(([name, , color, dash], i) => {
    const x = L + i * 190;
    return `<path d="M${x} 22L${x + 28} 22" stroke="${color}" stroke-width="3.2" ${dash ? `stroke-dasharray="${dash}"` : ''}/>${text(x + 36, 27, name, { anchor: 'start', size: 13, ...ink })}`;
  }).join('');
  return svg(660, 340, `${back}${lines}${recall}${legend}`);
}

// ---- Figure 2: with class weight, recall holds and precision falls. ---------------------------------------------------
function precisionFall() {
  const d = numbers();
  const L = 64, T = 52, W = 560, H = 230, xAt = i => L + 30 + i * (W - 60) / (SHARES.length - 1);
  const { Y, back } = frame({ L, T, W, H, xAt });
  const series = [
    [tr('Recall', 'Recall'), d.weighted.map(r => r.model.recall), k(1), -12],
    [tr('Precision', 'Precision'), d.weighted.map(r => r.model.precision), k(0), 22],
  ];
  const lines = series.map(([, vals, color, dy]) => `<path d="${path(vals.map((v, i) => [xAt(i), Y(v)]))}" fill="none" stroke="${color}" stroke-width="3.2"/>${vals.map((v, i) => dot(xAt(i), Y(v), color, 4.5) + text(xAt(i), Y(v) + (v < 0.2 ? -12 : dy), pct(v), { size: 13, weight: 700, ...ink })).join('')}`).join('');
  const legend = series.map(([name, , color], i) => {
    const x = L + i * 150;
    return `<path d="M${x} 22L${x + 28} 22" stroke="${color}" stroke-width="3.2"/>${text(x + 36, 27, name, { anchor: 'start', size: 13, ...ink })}`;
  }).join('') + text(L + 330, 27, tr('Class weight on, threshold 0.50', 'Class weight aktif, threshold 0,50'), { anchor: 'start', size: 13 });
  return svg(660, 340, `${back}${lines}${legend}`);
}

// ---- Figure 3: weight and threshold slide along one trade-off. ----------------------------------------------------------
function twoLevers() {
  const d = numbers();
  const L = 70, T = 44, W = 540, H = 236;
  const X = v => L + v * W, Y = v => T + (1 - v) * H;
  const grid = [0, 0.25, 0.5, 0.75, 1].map(v => `${line(L, Y(v), L + W, Y(v), { w: 1 })}${text(L - 8, Y(v) + 4, pct(v, 0), { anchor: 'end', size: 12 })}${text(X(v), T + H + 20, pct(v, 0), { size: 12 })}`).join('');
  const axes = `${line(L, T, L, T + H, { c: 'var(--muted)', w: 1.8 })}${line(L, T + H, L + W, T + H, { c: 'var(--muted)', w: 1.8 })}`;
  const curve = (pts, color, dash) => `<path d="${path(pts.map(p => [X(p.recall), Y(p.precision)]))}" fill="none" stroke="${color}" stroke-width="3" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const m = d.marks;
  const items = [
    [m.plain, tr('threshold 0.50', 'threshold 0,50')],
    [m.t20, tr('threshold 0.20', 'threshold 0,20')],
    [m.t10, tr('threshold 0.10', 'threshold 0,10')],
    [m.weight, tr('class weight, threshold 0.50', 'class weight, threshold 0,50')],
  ];
  const marks = items.map(([p, , ], n) => `${dot(X(p.recall), Y(p.precision), k(1), 7)}<circle cx="${X(p.recall)}" cy="${Y(p.precision)}" r="7" fill="none" stroke="var(--ink)" stroke-width="2"/>${text(X(p.recall) + 13, Y(p.precision) - 9, String(n + 1), { anchor: 'start', size: 14, weight: 700, ...ink })}`).join('');
  const list = items.map(([p, name], n) => text(L, T + H + 68 + n * 20, `${n + 1}  ${name}: ${tr('recall', 'recall')} ${pct(p.recall)}, ${tr('precision', 'precision')} ${pct(p.precision)}`, { anchor: 'start', size: 12, ...ink })).join('');
  const legend = `<path d="M${L} 20L${L + 28} 20" stroke="${k(2)}" stroke-width="3"/>${text(L + 36, 25, tr('threshold swept, no class weight', 'threshold digeser, tanpa class weight'), { anchor: 'start', size: 13, ...ink })}`
    + `<path d="M${L + 290} 20L${L + 318} 20" stroke="${k(0)}" stroke-width="3" stroke-dasharray="7 5"/>${text(L + 326, 25, tr('threshold swept, class weight', 'threshold digeser, class weight'), { anchor: 'start', size: 13, ...ink })}`;
  return svg(660, 410, `${grid}${axes}${curve(d.curvePlain, k(2))}${curve(d.curveWeighted, k(0), '7 5')}${marks}${list}${legend}
${text(L + W / 2, T + H + 44, tr('Recall', 'Recall'), { size: 13 })}
<g transform="translate(18 ${T + H / 2}) rotate(-90)">${text(0, 0, tr('Precision', 'Precision'), { size: 13 })}</g>`);
}

// ---- Figure 4: the real penguins, three samples. -------------------------------------------------------------------------
// True positives of 15 and false alarms in each test set (read from the lab; Chinstrap, 10% positives).
const PENGUINS = [
  { plain: { tp: 9, fp: 2 }, weighted: { tp: 11, fp: 18 } },
  { plain: { tp: 5, fp: 2 }, weighted: { tp: 9, fp: 14 } },
  { plain: { tp: 10, fp: 1 }, weighted: { tp: 13, fp: 29 } },
];
function penguinCheck() {
  const L = 60, T = 56, W = 560, H = 190, group = W / 3, bw = 64;
  const Y = v => T + (1 - v) * H;
  const grid = [0, 0.25, 0.5, 0.75, 1].map(v => `${line(L, Y(v), L + W, Y(v), { w: 1 })}${text(L - 8, Y(v) + 4, pct(v, 0), { anchor: 'end', size: 12 })}`).join('');
  const bar = (x, v, c) => `<rect x="${x}" y="${Y(v)}" width="${bw}" height="${v * H}" rx="4" fill="${k(c)}" stroke="var(--ink)" stroke-width="1.2"/>${text(x + bw / 2, Y(v) - 6, pct(v), { size: 13, weight: 700, ...ink })}`;
  const prec = c => c.tp / (c.tp + c.fp);
  const groups = PENGUINS.map((p, i) => {
    const cx = L + group * (i + 0.5);
    return `${bar(cx - bw - 5, p.plain.tp / 15, 0)}${bar(cx + 5, p.weighted.tp / 15, 1)}`
      + text(cx, T + H + 20, tr(`Sample ${i + 1}`, `Sampel ${i + 1}`), { size: 14, weight: 700, ...ink })
      + text(cx, T + H + 40, `${tr('precision', 'precision')} ${pct(prec(p.plain))} → ${pct(prec(p.weighted))}`, { size: 12 });
  }).join('');
  const legend = `${box(L, 14, 16, 14, k(0), 'var(--ink)').replace('rx="10"', 'rx="3"')}${text(L + 24, 26, tr('no class weight', 'tanpa class weight'), { anchor: 'start', size: 13, ...ink })}`
    + `${box(L + 190, 14, 16, 14, k(1), 'var(--ink)').replace('rx="10"', 'rx="3"')}${text(L + 214, 26, tr('class weight', 'class weight'), { anchor: 'start', size: 13, ...ink })}`;
  return svg(660, 326, `${grid}${line(L, T + H, L + W, T + H, { c: 'var(--muted)', w: 1.8 })}${groups}${legend}
${text(L + W / 2, 314, tr('Recall of Chinstrap penguins, 15 in each test set', 'Recall penguin Chinstrap, 15 di tiap test set'), { size: 13 })}`);
}

export const figures = {
  'share-sweep': shareSweep,
  'precision-fall': precisionFall,
  'two-levers': twoLevers,
  'penguin-check': penguinCheck,
};
