// Figures for the lesson "Ensemble lab": [[figure:ensemble-lab/name|Caption]].
// All three draw the lab's own default sample: generated two moons, noise 0.35, seed 11, 100 training and 100
// validation points. They call the same pure math as the lab (sims/ml/ensemblelab.js: bagging of depth-8
// trees, boosting on log loss with depth 3), so every number agrees with the lesson text and with the lab at
// its defaults. The fit is computed on the first draw and kept (a figure is rebuilt when the language changes).
import { svg, dot, ring, text, line, box, k, tr, fmt, pct } from '../kit.js';
import { DEFAULTS, MAX_TREES, generatedData, splitData, fitBagging, fitBoosting, curvesOf, regionGrid, bestTrees } from '../../sims/ml/ensemblelab.js';

const INK = { fill: 'var(--ink)', weight: 700 };
const BAG = k(2), BOOST = k(3);          // the lab's colors: bagging teal, boosting amber
const treesWord = n => tr(n === 1 ? 'tree' : 'trees', 'pohon');

let cache = null;
function demo() {
  if (cache) return cache;
  const v = DEFAULTS;
  const data = generatedData(v.kind, v.seed, v.noise);
  const { train, validation } = splitData(data, v.seed);
  const bag = fitBagging(train, { forest: false, fraction: v.fraction, seed: v.seed });
  const boosts = {};
  for (const rate of [0.1, 0.5, 1]) boosts[rate] = fitBoosting(train, { rate, depth: v.depth, seed: v.seed });
  const boost = boosts[v.rate];
  cache = {
    train, validation, bag, boost,
    bagCurves: curvesOf(bag, train, validation),
    boostCurves: curvesOf(boost, train, validation),
    rateCurves: Object.fromEntries(Object.entries(boosts).map(([r, m]) => [r, curvesOf(m, train, validation).validationLoss])),
  };
  return cache;
}

// ---- Figure 1: the decision regions at 1, 3, 10 and 100 trees ----------------------------------------
const GRID = 40;
const OPACITY = [0.14, 0.28, 0.44];      // three levels of confidence: a stronger tint is a surer prediction

// The regions of the first t trees as runs of equal cells along each row (far fewer rects than cells).
function regionRects(model, t, x0, y0, size) {
  const probs = regionGrid(model, t, GRID), cell = size / GRID;
  const key = p => {
    const conf = Math.abs(2 * p - 1);
    return (p > 0.5 ? 1 : 0) * 3 + (conf < 0.34 ? 0 : conf < 0.67 ? 1 : 2);
  };
  const out = [];
  for (let r = 0; r < GRID; r++) {
    const y = y0 + size - (r + 1) * cell;
    let c = 0;
    while (c < GRID) {
      const kk = key(probs[r * GRID + c]);
      let e = c + 1;
      while (e < GRID && key(probs[r * GRID + e]) === kk) e++;
      const cls = Math.floor(kk / 3), lvl = kk % 3;
      out.push(`<rect x="${(x0 + c * cell).toFixed(1)}" y="${y.toFixed(1)}" width="${((e - c) * cell + 0.5).toFixed(1)}" height="${(cell + 0.5).toFixed(1)}" fill="var(--k${cls})" fill-opacity="${OPACITY[lvl]}"/>`);
      c = e;
    }
  }
  return out.join('');
}

function regionsFigure() {
  const d = demo();
  const stages = [1, 3, 10, 100];
  const size = 146, gap = 10, left = 70, top = 34, pitch = size + 30;
  const rows = [
    [tr('Bagging', 'Bagging'), d.bag, d.bagCurves, BAG],
    [tr('Boosting', 'Boosting'), d.boost, d.boostCurves, BOOST],
  ];
  const parts = stages.map((t, j) => text(left + j * (size + gap) + size / 2, 22, tr(`${fmt(t)} ${treesWord(t)}`, `${fmt(t)} ${treesWord(t)}`), { size: 14, ...INK })).join('');
  const panels = rows.map(([name, model, curves, color], i) => {
    const y0 = top + i * pitch;
    const label = text(34, y0 + size / 2 + 5, name, { size: 14, fill: color, weight: 700 });
    const cells = stages.map((t, j) => {
      const x0 = left + j * (size + gap);
      const pts = d.train.X.map((p, n) => dot(x0 + p[0] / 10 * size, y0 + size - p[1] / 10 * size, `var(--k${d.train.y[n]})`, 2.7)
        .replace('/>', ' stroke="var(--surface)" stroke-width="0.9"/>')).join('');
      const err = curves.validationError[t - 1];
      return `${box(x0 - 0.5, y0 - 0.5, size + 1, size + 1, 'none', 'var(--line)')}${regionRects(model, t, x0, y0, size)}${pts}
${text(x0 + size / 2, y0 + size + 17, tr(`error rate ${pct(err, 1)}`, `error rate ${pct(err, 1)}`), { size: 12 })}`;
    }).join('');
    return label + cells;
  }).join('');
  return svg(700, top + 2 * pitch - 8, `${parts}${panels}`);
}

// ---- Figures 2 and 3: log loss against the number of trees --------------------------------------------
const CAP = 1.2;                          // the top of the chart; a value above it is clamped and marked
const clampTo = v => Math.min(v, CAP);

function frame(xl, xr, top, bottom) {
  const X = t => xl + (t - 1) / (MAX_TREES - 1) * (xr - xl), Y = v => bottom - clampTo(v) / CAP * (bottom - top);
  const grid = [0, 0.4, 0.8, 1.2].map(v => `${line(xl, Y(v), xr, Y(v), { c: 'var(--line)', w: 1, dash: '3 4' })}${text(xl - 7, Y(v) + 4, fmt(v, { digits: 1 }), { anchor: 'end', size: 11.5 })}`).join('');
  const ticks = [1, 20, 40, 60, 80, 100].map(t => text(X(t), bottom + 17, fmt(t), { size: 11.5 })).join('');
  const axes = `${line(xl, bottom, xr, bottom, { c: 'var(--muted)', w: 1.4 })}${line(xl, bottom, xl, top - 6, { c: 'var(--muted)', w: 1.4 })}`;
  return { X, Y, base: `${grid}${axes}${ticks}` };
}

const path = (vals, X, Y, from = 1) => `M${vals.map((v, i) => [i + 1, v]).filter(([t]) => t >= from).map(([t, v]) => `${X(t).toFixed(1)} ${Y(v).toFixed(1)}`).join('L')}`;
const curve = (vals, X, Y, color, dash, from = 1) => `<path d="${path(vals, X, Y, from)}" fill="none" stroke="${color}" stroke-width="${dash ? 2.2 : 3}" ${dash ? 'stroke-dasharray="6 4"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`;

function curvesFigure() {
  const d = demo();
  const xl = 58, xr = 664, top = 52, bottom = 246;
  const { X, Y, base } = frame(xl, xr, top, bottom);
  const bv = d.bagCurves.validationLoss, bt = d.bagCurves.trainLoss, sv = d.boostCurves.validationLoss, st = d.boostCurves.trainLoss;
  const stop = bestTrees(sv);
  // Bagging with one tree is far above the top: draw from tree 2 and mark the first value with a triangle.
  const tri = (x, y) => `<path d="M${x} ${y - 6}L${x - 5.5} ${y + 4}L${x + 5.5} ${y + 4}Z" fill="${BAG}"/>`;
  const legendItem = (x, y, color, dash, label) => `${line(x, y, x + 26, y, { c: color, w: dash ? 2.2 : 3, dash: dash ? '6 4' : undefined })}${text(x + 33, y + 4, label, { anchor: 'start', size: 12 })}`;
  const legend = `${legendItem(xl, 14, BAG, false, tr('Bagging, validation', 'Bagging, validation'))}${legendItem(xl + 180, 14, BAG, true, tr('Bagging, training', 'Bagging, training'))}
${legendItem(xl, 32, BOOST, false, tr('Boosting, validation', 'Boosting, validation'))}${legendItem(xl + 180, 32, BOOST, true, tr('Boosting, training', 'Boosting, training'))}`;
  // The label sits in the empty band under the rising boosting curve; a short leader joins it to the ring.
  const lx = X(30), ly = Y(0.17);
  const marks = `${ring(X(stop.best), Y(stop.value), 'var(--ink)', 7)}${line(X(stop.best) + 7, Y(stop.value) + 4, lx - 5, ly - 4, { c: 'var(--ink)', w: 1.4 })}
${text(lx, ly, tr(`early stop: ${stop.best} ${treesWord(stop.best)}, validation ${fmt(stop.value, { digits: 2 })}`, `early stopping: ${stop.best} ${treesWord(stop.best)}, validation ${fmt(stop.value, { digits: 2 })}`), { anchor: 'start', size: 12.5, ...INK })}
${text(xr - 4, Y(sv[MAX_TREES - 1]) - 9, fmt(sv[MAX_TREES - 1], { digits: 2 }), { anchor: 'end', size: 12.5, fill: BOOST, weight: 700 })}
${text(xr - 4, Y(bv[MAX_TREES - 1]) - 9, fmt(bv[MAX_TREES - 1], { digits: 2 }), { anchor: 'end', size: 12.5, fill: BAG, weight: 700 })}
${tri(X(1), top - 1)}${text(X(1) + 10, top + 3, tr(`${fmt(bv[0], { digits: 2 })} (off the chart)`, `${fmt(bv[0], { digits: 2 })} (di luar grafik)`), { anchor: 'start', size: 11.5 })}`;
  return svg(680, 300, `${base}${curve(bt, X, Y, BAG, true)}${curve(bv, X, Y, BAG, false, 2)}${curve(st, X, Y, BOOST, true)}${curve(sv, X, Y, BOOST, false)}${marks}${legend}
${text(8, top - 10, tr('log loss', 'log loss'), { anchor: 'start', size: 12 })}${text((xl + xr) / 2, bottom + 36, tr('number of trees', 'jumlah pohon'), { size: 12.5 })}`);
}

function ratesFigure() {
  const d = demo();
  const xl = 58, xr = 664, top = 96, bottom = 300;
  const { X, Y, base } = frame(xl, xr, top, bottom);
  const runs = [[0.1, k(4)], [0.5, BOOST], [1, k(5)]];
  const lines = runs.map(([rate, c]) => curve(d.rateCurves[rate], X, Y, c, false)).join('');
  const marks = runs.map(([rate, c]) => {
    const s = bestTrees(d.rateCurves[rate]);
    return ring(X(s.best), Y(s.value), c, 6.5);
  }).join('');
  const legend = runs.map(([rate, c], i) => {
    const s = bestTrees(d.rateCurves[rate]), y = 14 + i * 20;
    return `${line(xl, y, xl + 28, y, { c, w: 3 })}${text(xl + 36, y + 4, tr(`learning rate ${fmt(rate, { digits: 2 })}: lowest ${fmt(s.value, { digits: 2 })} at ${s.best} ${treesWord(s.best)}`, `learning rate ${fmt(rate, { digits: 2 })}: terendah ${fmt(s.value, { digits: 2 })} pada ${s.best} ${treesWord(s.best)}`), { anchor: 'start', size: 12.5, fill: c, weight: 700 })}`;
  }).join('');
  return svg(680, 346, `${base}${lines}${marks}${legend}
${text(xl - 4, top - 14, tr('validation log loss', 'validation log loss'), { anchor: 'start', size: 12 })}${text(xr, top - 14, tr('rings mark the lowest point of each curve', 'cincin menandai titik terendah tiap kurva'), { anchor: 'end', size: 12 })}${text((xl + xr) / 2, bottom + 36, tr('number of trees (boosting, depth 3)', 'jumlah pohon (boosting, kedalaman 3)'), { size: 12.5 })}`);
}

export const figures = {
  'tree-by-tree': regionsFigure,
  'two-curves': curvesFigure,
  'learning-rate': ratesFigure,
};
