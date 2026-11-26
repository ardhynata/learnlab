// Figures for the lab lesson "Thresholds and decisions" (logistic-regression course). Every number is computed
// here with the lab's own math (ml/logistic.js and ml/thresholdlab.js) on the lab's default data (generated
// blobs, seed 8), so the figures agree with the lesson text and with the lab.
import { svg, dot, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';
import { fitLogistic, predictProba, decisionScores } from '../../sims/ml/logistic.js';
import { blobPoints, summarizeAt, logit, GENERATED_SEED } from '../../sims/ml/thresholdlab.js';

const FP = () => k(3), FN = () => k(5), NEG = () => k(0), POS = () => k(1);
const two = v => fmt(v, { digits: 2 });

// The lab's default data, fitted the way the lab fits it.
function defaults() {
  const { X, y } = blobPoints(GENERATED_SEED);
  const model = fitLogistic(X, y, { lr: 0.3, iters: 1000 });
  return { y, proba: predictProba(model, X), scores: decisionScores(model, X) };
}
const sigmoid = z => 1 / (1 + Math.exp(-z));

// ---- Figure 1: one threshold on the probability scale is one cut on the score scale. ----
function thresholdOnTheCurve() {
  const { y, proba, scores } = defaults();
  const lo = -8, hi = 6, x0 = 56, x1 = 624, y0 = 28, y1 = 218;
  const X = z => x0 + (z - lo) / (hi - lo) * (x1 - x0), Y = p => y1 - p * (y1 - y0);
  const ts = [0.2, 0.5, 0.8];
  let curve = '';
  for (let i = 0; i <= 140; i++) { const z = lo + i / 140 * (hi - lo); curve += `${i ? 'L' : 'M'}${X(z).toFixed(1)} ${Y(sigmoid(z)).toFixed(1)}`; }
  const grid = [0, 0.5, 1].map(p => `${line(x0, Y(p), x1, Y(p), { c: 'var(--line)', w: 1 })}${text(x0 - 8, Y(p) + 4, two(p), { anchor: 'end', size: 12 })}`).join('');
  const zticks = [-8, -6, -4, -2, 0, 2, 4, 6].map(z => text(X(z), y1 + 18, fmt(z), { size: 12 })).join('');
  const cuts = ts.map(t => `${line(X(logit(t)), y0 - 6, X(logit(t)), y1, { c: 'var(--ink)', w: 1.8, dash: '5 4' })}${text(X(logit(t)), y0 - 11, two(t), { fill: 'var(--ink)', weight: 700, size: 13 })}`).join('');
  const order = y.map((_, i) => i).sort((a, b) => y[a] - y[b]);
  const dots = `<g opacity="0.8">${order.map(i => dot(X(scores[i]), Y(proba[i]), y[i] ? POS() : NEG(), 3.4)).join('')}</g>`;
  const cols = ts.map((t, i) => {
    const s = summarizeAt(y, proba, t), cx = 56 + i * 205;
    return `${line(cx, 270, cx + 26, 270, { c: 'var(--ink)', w: 1.8, dash: '5 4' })}
${text(cx + 34, 275, `${tr('threshold', 'threshold')} ${two(t)}`, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}
${text(cx, 296, `${tr('score at the line', 'skor di garis')}: ${fmt(logit(t), { digits: 2 })}`, { anchor: 'start', size: 12 })}
${text(cx, 314, `${fmt(s.flagged)} ${tr('of 100 called positive', 'dari 100 diprediksi positif')}`, { anchor: 'start', fill: 'var(--ink)', size: 12 })}`;
  }).join('');
  const legend = `${dot(x0 + 12, y1 - 62, NEG(), 4.5)}${text(x0 + 24, y1 - 58, tr('negative example', 'contoh negatif'), { anchor: 'start', fill: 'var(--ink)', size: 12 })}
${dot(x0 + 12, y1 - 42, POS(), 4.5)}${text(x0 + 24, y1 - 38, tr('positive example', 'contoh positif'), { anchor: 'start', fill: 'var(--ink)', size: 12 })}`;
  return svg(640, 330, `${grid}<path d="${curve}" fill="none" stroke="var(--ink)" stroke-width="2.6" stroke-linecap="round"/>${cuts}${dots}${legend}
${text((x0 + x1) / 2, y1 + 38, tr('score (log-odds)', 'skor (log-odds)'), { size: 12 })}
${text(x0 + 4, y0 + 2, tr('probability', 'probabilitas'), { anchor: 'start', size: 12 })}${zticks}${cols}`);
}

// ---- Figure 2: the four outcomes at threshold 0.5, with precision and recall. ----
function fourOutcomes() {
  const { y, proba } = defaults(), s = summarizeAt(y, proba, 0.5);
  const gx = 200, gy = 62, cw = 190, ch = 80;
  const cell = (c, r, fill, edge, big, name, hint) => {
    const x = gx + c * cw, yy = gy + r * ch;
    return `${box(x, yy, cw - 6, ch - 6, fill, edge)}
${text(x + (cw - 6) / 2, yy + 34, fmt(big), { fill: 'var(--ink)', weight: 700, size: 28 })}
${text(x + (cw - 6) / 2, yy + 54, name, { fill: 'var(--ink)', weight: 700, size: 13 })}
${text(x + (cw - 6) / 2, yy + 69, hint, { size: 11 })}`;
  };
  const heads = `${text(gx + (cw - 6) / 2, gy - 12, tr('Called negative', 'Diprediksi negatif'), { fill: 'var(--ink)', weight: 700, size: 13 })}
${text(gx + cw + (cw - 6) / 2, gy - 12, tr('Called positive', 'Diprediksi positif'), { fill: 'var(--ink)', weight: 700, size: 13 })}
${text(gx - 14, gy + 36, tr('Really negative', 'Sebenarnya negatif'), { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 13 })}
${text(gx - 14, gy + 52, `(${fmt(s.tn + s.fp)})`, { anchor: 'end', size: 12 })}
${text(gx - 14, gy + ch + 36, tr('Really positive', 'Sebenarnya positif'), { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 13 })}
${text(gx - 14, gy + ch + 52, `(${fmt(s.tp + s.fn)})`, { anchor: 'end', size: 12 })}`;
  const cells = `${cell(0, 0, soft(0), k(0), s.tn, tr('True negatives', 'True negative'), tr('right: left alone', 'benar: dibiarkan'))}
${cell(1, 0, soft(3), k(3), s.fp, tr('False positives', 'False positive'), tr('false alarms', 'alarm palsu'))}
${cell(0, 1, soft(5), k(5), s.fn, tr('False negatives', 'False negative'), tr('misses', 'terlewat'))}
${cell(1, 1, soft(1), k(1), s.tp, tr('True positives', 'True positive'), tr('right: found', 'benar: ditemukan'))}`;
  const pr = `${text(gx, 252, `Precision = ${fmt(s.tp)} / (${fmt(s.tp)} + ${fmt(s.fp)}) = ${pct(s.precision)}`, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}
${text(gx, 274, `Recall = ${fmt(s.tp)} / (${fmt(s.tp)} + ${fmt(s.fn)}) = ${pct(s.recall)}`, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}
${text(gx, 24, tr('Threshold 0.5, the lab’s default data', 'Threshold 0,5, data bawaan lab'), { anchor: 'start', size: 13 })}`;
  return svg(640, 290, `${heads}${cells}${pr}`);
}

// ---- Figure 3: false positives and false negatives as the threshold moves. ----
function countsVsThreshold() {
  const { y, proba } = defaults();
  const x0 = 62, x1 = 612, y0 = 34, y1 = 232, maxC = 35;
  const X = t => x0 + (t - 0.05) / 0.9 * (x1 - x0), Y = c => y1 - c / maxC * (y1 - y0);
  const rows = [];
  for (let i = 5; i <= 95; i++) rows.push([i / 100, summarizeAt(y, proba, i / 100)]);
  const path = pick => rows.map(([t, s], i) => `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(s[pick]).toFixed(1)}`).join('');
  const axes = `${[0, 10, 20, 30].map(c => `${line(x0, Y(c), x1, Y(c), { c: 'var(--line)', w: 1 })}${text(x0 - 8, Y(c) + 4, fmt(c), { anchor: 'end', size: 12 })}`).join('')}
${[0.1, 0.3, 0.5, 0.7, 0.9].map(t => text(X(t), y1 + 18, two(t), { size: 12 })).join('')}
${text((x0 + x1) / 2, y1 + 38, tr('threshold', 'threshold'), { size: 12 })}
${text(x0 + 2, y0 - 12, tr('number of examples', 'jumlah contoh'), { anchor: 'start', size: 12 })}`;
  const here = summarizeAt(y, proba, 0.5);
  const mid = `${line(X(0.5), y0 - 4, X(0.5), y1, { c: 'var(--ink)', w: 1.6, dash: '5 4' })}
${dot(X(0.5), Y(here.fp), FP(), 6)}${dot(X(0.5), Y(here.fn), FN(), 6)}
${text(X(0.5) + 10, Y(here.fp) + 18, `${fmt(here.fp)}`, { anchor: 'start', fill: FP(), weight: 700, size: 15 })}
${text(X(0.5) + 10, Y(here.fn) - 8, `${fmt(here.fn)}`, { anchor: 'start', fill: FN(), weight: 700, size: 15 })}`;
  const labels = `${text(X(0.07), Y(rows[2][1].fp) - 12, tr('false positives', 'false positive'), { anchor: 'start', fill: FP(), weight: 700, size: 14 })}
${text(X(0.93), Y(rows[88][1].fn) - 12, tr('false negatives', 'false negative'), { anchor: 'end', fill: FN(), weight: 700, size: 14 })}`;
  return svg(640, 280, `${axes}
<path d="${path('fp')}" fill="none" stroke="${FP()}" stroke-width="3" stroke-linejoin="round"/>
<path d="${path('fn')}" fill="none" stroke="${FN()}" stroke-width="3" stroke-linejoin="round"/>
${mid}${labels}`);
}

// ---- Figure 4: precision and recall as the threshold moves. ----
function precisionRecall() {
  const { y, proba } = defaults();
  const x0 = 62, x1 = 612, y0 = 50, y1 = 232;
  const X = t => x0 + (t - 0.05) / 0.9 * (x1 - x0), Y = v => y1 - v * (y1 - y0);
  const rows = [];
  for (let i = 5; i <= 95; i++) rows.push([i / 100, summarizeAt(y, proba, i / 100)]);
  const path = pick => rows.map(([t, s], i) => `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(s[pick]).toFixed(4)}`).join('');
  const axes = `${[0, 0.25, 0.5, 0.75, 1].map(v => `${line(x0, Y(v), x1, Y(v), { c: 'var(--line)', w: 1 })}${text(x0 - 8, Y(v) + 4, pct(v, 0), { anchor: 'end', size: 12 })}`).join('')}
${[0.1, 0.3, 0.5, 0.7, 0.9].map(t => text(X(t), y1 + 18, two(t), { size: 12 })).join('')}
${text((x0 + x1) / 2, y1 + 38, tr('threshold', 'threshold'), { size: 12 })}`;
  const marks = [0.2, 0.5, 0.8].map(t => {
    const s = summarizeAt(y, proba, t);
    return `${line(X(t), y0 - 26, X(t), y1, { c: 'var(--muted)', w: 1.2, dash: '4 4' })}${text(X(t), y0 - 32, two(t), { fill: 'var(--ink)', weight: 700, size: 13 })}
${dot(X(t), Y(s.precision), k(2), 5.5)}${dot(X(t), Y(s.recall), k(4), 5.5)}`;
  }).join('');
  const key = `${line(x0 + 12, y1 - 36, x0 + 40, y1 - 36, { c: k(2), w: 3 })}${text(x0 + 48, y1 - 32, tr('precision', 'precision'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}
${line(x0 + 12, y1 - 14, x0 + 40, y1 - 14, { c: k(4), w: 3 })}${text(x0 + 48, y1 - 10, tr('recall', 'recall'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}`;
  const note = (t, pick, dy, anchor) => { const s = summarizeAt(y, proba, t); return text(X(t) + (anchor === 'start' ? 9 : -9), Y(s[pick]) + dy, pct(s[pick]), { anchor, fill: pick === 'recall' ? k(4) : k(2), weight: 700, size: 12 }); };
  const values = `${note(0.2, 'precision', 18, 'end')}${note(0.2, 'recall', -9, 'end')}${note(0.5, 'precision', -9, 'start')}${note(0.5, 'recall', 18, 'start')}${note(0.8, 'precision', -9, 'end')}${note(0.8, 'recall', 18, 'end')}`;
  return svg(640, 280, `${axes}
<path d="${path('precision')}" fill="none" stroke="${k(2)}" stroke-width="3" stroke-linejoin="round"/>
<path d="${path('recall')}" fill="none" stroke="${k(4)}" stroke-width="3" stroke-linejoin="round"/>
${marks}${values}${key}`);
}

export const figures = {
  'threshold-on-the-curve': thresholdOnTheCurve,
  'four-outcomes': fourOutcomes,
  'counts-vs-threshold': countsVsThreshold,
  'precision-recall': precisionRecall,
};
