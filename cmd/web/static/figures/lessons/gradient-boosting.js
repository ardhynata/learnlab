// Figures for the lesson "Gradient boosting": [[figure:gradient-boosting/name|Caption]].
// Figure 1 is the lesson's hand example: six real penguins (flipper length in mm, body mass in kg), a start
// prediction of 4.50 and two stumps with learning rate 0.5; every number is recomputed from the data here.
// Figures 3 and 4 plot real runs of squared-error gradient boosting (trees of depth 2, fitRegressionTree from
// sims/ml/ensemble.js) that predict body mass in grams from bill length, bill depth and flipper length for the
// 333 penguins with no missing value. The cut is the one of "Depth and leaf size": splitIndices from
// sims/ml/tabular.js, stratified by sex, seed 4, 200 training, 67 validation and 66 test penguins. A figure is
// drawn synchronously and cannot fetch the csv, so the RMSE curves are constants (whole grams); the trees are
// counted at 0 to 60, then every fifth tree up to 300.
import { svg, dot, ring, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { fill: 'var(--ink)', weight: 700 };

// ---- Figure 1: two stages on six penguins --------------------------------------------------------
const PENGUINS = [[181, 3.75, 0], [191, 3.35, 0], [195, 4.30, 0], [209, 4.80, 1], [219, 5.20, 1], [228, 5.60, 1]];
const STAGES = [
  // Each stage is the model's prediction as pieces [from, to, value] along the flipper axis.
  [[175, 235, 4.5]],
  [[175, 202, 4.15], [202, 235, 4.85]],
  [[175, 193, 3.85], [193, 202, 4.30], [202, 235, 5.00]],
];
const predictAt = (pieces, x) => pieces.find(p => x >= p[0] && x <= p[1])[2];
const SPECIES = [k(0), k(1)];

function twoStages() {
  const pw = 216, gap = 8, top = 58, bottom = 208;
  const titles = [tr('Start: the mean', 'Awal: rata-rata'), tr('After tree 1', 'Setelah tree 1'), tr('After tree 2', 'Setelah tree 2')];
  const panel = (i) => {
    const ox = 8 + i * (pw + gap), xl = ox + 38, xr = ox + pw - 10;
    const X = v => xl + (v - 175) / 60 * (xr - xl), Y = v => bottom - (v - 3) / 3 * (bottom - top);
    const pieces = STAGES[i];
    const mse = PENGUINS.reduce((s, [x, y]) => s + (y - predictAt(pieces, x)) ** 2, 0) / PENGUINS.length;
    const grid = [3, 4, 5, 6].map(v => `${line(xl, Y(v), xr, Y(v), { c: 'var(--line)', w: 1, dash: '3 4' })}${text(xl - 6, Y(v) + 4, fmt(v), { anchor: 'end', size: 11.5 })}`).join('');
    const ticks = [180, 200, 220].map(v => text(X(v), bottom + 16, fmt(v), { size: 11.5 })).join('');
    // Level labels: above the line at the left end of the first piece and the middle of a middle one; below the
    // line at the right end of the last piece, because the residual bar of the 228 mm penguin rises above it.
    const label = (a, b, v, j, n) => {
      const atRight = j === n - 1 && n > 1, atLeft = j === 0;
      const x = atLeft ? X(a) + 4 : atRight ? X(b) - 3 : (X(a) + X(b)) / 2;
      return text(x, atRight ? Y(v) + 16 : Y(v) - 7, fmt(v, { digits: 2 }), { anchor: atLeft ? 'start' : atRight ? 'end' : 'middle', size: 11, ...INK });
    };
    const steps = pieces.map(([a, b, v], j) => {
      const joint = j > 0 ? line(X(a), Y(pieces[j - 1][2]), X(a), Y(v), { c: 'var(--muted)', w: 1.4, dash: '2 3' }) : '';
      return `${joint}${line(X(a), Y(v), X(b), Y(v), { c: 'var(--ink)', w: 2.6 })}${label(a, b, v, j, pieces.length)}`;
    }).join('');
    const bars = PENGUINS.map(([x, y]) => line(X(x), Y(y), X(x), Y(predictAt(pieces, x)), { c: 'var(--muted)', w: 1.6, dash: '3 3' })).join('');
    const dots = PENGUINS.map(([x, y, s]) => dot(X(x), Y(y), SPECIES[s], 4.8)).join('');
    return `${box(ox, 2, pw, 256)}${text(ox + pw / 2, 22, titles[i], INK)}${text(ox + pw / 2, 40, tr(`MSE ${fmt(mse, { digits: 2 })}`, `MSE ${fmt(mse, { digits: 2 })}`), { size: 12.5 })}
${grid}${line(xl, bottom, xr, bottom, { c: 'var(--muted)', w: 1.4 })}${ticks}${bars}${steps}${dots}
${i === 0 ? text(xl - 6, top - 12, tr('kg', 'kg'), { anchor: 'end', size: 11.5 }) : ''}${text((xl + xr) / 2, bottom + 34, tr('flipper length (mm)', 'panjang flipper (mm)'), { size: 12 })}`;
  };
  const legend = `${dot(40, 284, SPECIES[0], 5)}${text(52, 288, tr('Adelie', 'Adelie'), { anchor: 'start', size: 12 })}${dot(122, 284, SPECIES[1], 5)}${text(134, 288, tr('Gentoo', 'Gentoo'), { anchor: 'start', size: 12 })}
${line(212, 284, 240, 284, { c: 'var(--ink)', w: 2.6 })}${text(248, 288, tr('prediction', 'prediksi'), { anchor: 'start', size: 12 })}
${line(340, 284, 368, 284, { c: 'var(--muted)', w: 1.6, dash: '3 3' })}${text(376, 288, tr('residual: what the next tree fits', 'residual: yang diperbaiki tree berikutnya'), { anchor: 'start', size: 12 })}`;
  return svg(680, 300, `${panel(0)}${panel(1)}${panel(2)}${legend}`);
}

// ---- Real runs: RMSE (g) by number of trees --------------------------------------------------------
const TREES = [...Array(61).keys(), ...Array.from({ length: 48 }, (_, i) => 65 + 5 * i)];
// Learning rate 0.1: training RMSE and validation RMSE.
const TRAIN_01 = [805, 744, 690, 642, 600, 561, 527, 499, 472, 449, 429, 412, 397, 384, 372, 363, 354, 347, 340, 334, 329, 325, 321, 317, 315, 313, 310, 308, 307, 305, 303, 301, 300, 299, 298, 296, 295, 294, 293, 292, 291, 290, 289, 288, 287, 286, 286, 285, 284, 283, 283, 282, 282, 280, 279, 279, 278, 278, 277, 277, 275, 273, 270, 266, 264, 261, 258, 255, 252, 250, 249, 246, 244, 242, 240, 237, 236, 233, 231, 228, 225, 224, 222, 221, 219, 218, 216, 215, 212, 209, 208, 205, 204, 203, 201, 199, 198, 197, 195, 194, 193, 192, 190, 189, 187, 185, 184, 183, 182];
const VALID_01 = [797, 737, 683, 635, 596, 559, 528, 502, 478, 459, 442, 426, 415, 404, 395, 388, 383, 377, 372, 369, 366, 363, 361, 359, 357, 356, 355, 354, 354, 353, 352, 352, 350, 350, 349, 346, 346, 346, 346, 346, 346, 345, 345, 345, 345, 345, 345, 345, 345, 345, 345, 346, 346, 347, 346, 346, 346, 346, 346, 346, 347, 348, 347, 346, 346, 349, 348, 350, 350, 350, 351, 352, 353, 352, 351, 352, 351, 353, 356, 359, 361, 362, 363, 364, 365, 366, 365, 366, 368, 369, 370, 372, 372, 373, 373, 373, 375, 376, 377, 376, 377, 378, 379, 381, 382, 383, 384, 385, 385];
// Learning rate 0.3 and 1: validation RMSE.
const VALID_03 = [797, 624, 510, 439, 399, 379, 369, 363, 358, 357, 357, 356, 349, 349, 350, 347, 347, 347, 346, 345, 346, 346, 346, 345, 346, 348, 349, 346, 345, 346, 346, 346, 348, 349, 349, 348, 347, 349, 349, 351, 351, 353, 354, 355, 357, 357, 359, 362, 363, 364, 363, 362, 362, 364, 364, 364, 364, 364, 364, 365, 365, 368, 368, 372, 374, 375, 381, 381, 384, 389, 394, 396, 397, 399, 398, 400, 400, 402, 403, 406, 406, 411, 413, 412, 414, 415, 418, 420, 419, 420, 423, 425, 426, 429, 429, 432, 434, 435, 436, 438, 438, 438, 440, 440, 441, 441, 442, 441, 443];
const VALID_1 = [797, 391, 396, 394, 390, 389, 387, 391, 389, 393, 393, 391, 382, 380, 385, 398, 400, 407, 408, 425, 429, 433, 430, 434, 434, 433, 433, 448, 444, 452, 448, 449, 450, 447, 449, 448, 446, 441, 447, 449, 448, 448, 446, 447, 448, 449, 449, 452, 452, 458, 457, 456, 458, 450, 450, 449, 450, 454, 452, 455, 453, 455, 454, 452, 452, 460, 464, 464, 466, 469, 468, 468, 474, 476, 477, 478, 482, 484, 486, 486, 488, 490, 491, 492, 494, 494, 495, 496, 494, 495, 495, 497, 497, 498, 499, 499, 502, 501, 501, 502, 503, 503, 502, 503, 504, 505, 505, 505, 506];
const at = (series, t) => series[TREES.indexOf(t)];

// A curve over the trees 0..maxT drawn in a plot box.
function curvePath(series, X, Y, maxT) {
  const pts = TREES.map((t, i) => [t, series[i]]).filter(([t]) => t <= maxT);
  return `<path d="${pts.map(([t, v], i) => `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(v).toFixed(1)}`).join('')}" fill="none" stroke-linejoin="round" stroke-linecap="round"`;
}

// ---- Figure 2: three learning rates ---------------------------------------------------------------
function learningRates() {
  const xl = 60, xr = 664, top = 30, bottom = 246, maxT = 150, lo = 300, hi = 820;
  const X = t => xl + t / maxT * (xr - xl), Y = v => bottom - (v - lo) / (hi - lo) * (bottom - top);
  const runs = [
    [VALID_01, k(0), 0.1, 45],
    [VALID_03, k(2), 0.3, 23],
    [VALID_1, k(1), 1, 13],
  ];
  const grid = [300, 400, 500, 600, 700, 800].map(v => `${line(xl, Y(v), xr, Y(v), { c: 'var(--line)', w: 1, dash: '3 4' })}${text(xl - 7, Y(v) + 4, fmt(v), { anchor: 'end', size: 11.5 })}`).join('');
  const ticks = [0, 25, 50, 75, 100, 125, 150].map(t => text(X(t), bottom + 17, fmt(t), { size: 11.5 })).join('');
  const lines = runs.map(([s, c]) => `${curvePath(s, X, Y, maxT)} stroke="${c}" stroke-width="3"/>`).join('');
  const marks = runs.map(([s, c, , best]) => ring(X(best), Y(at(s, best)), c, 6.5)).join('');
  const legend = runs.map(([s, c, rate, best], i) => {
    const y = 88 + i * 24;
    return `${line(300, y, 328, y, { c, w: 3 })}${text(336, y + 4, tr(`learning rate ${fmt(rate)}: best at ${fmt(best)} trees, ${fmt(at(s, best))} g`, `learning rate ${fmt(rate)}: terbaik di ${fmt(best)} tree, ${fmt(at(s, best))} g`), { anchor: 'start', size: 12.5, ...INK })}`;
  }).join('');
  return svg(680, 300, `${grid}${line(xl, bottom, xr, bottom, { c: 'var(--muted)', w: 1.4 })}${line(xl, bottom, xl, top - 6, { c: 'var(--muted)', w: 1.4 })}${ticks}
${lines}${marks}${legend}
${text(xl, top - 12, tr('validation RMSE (g)', 'RMSE validasi (g)'), { anchor: 'start', size: 12 })}${text((xl + xr) / 2, bottom + 38, tr('number of trees', 'jumlah tree'), { size: 12.5 })}
${text(xr, top - 12, tr('rings mark the lowest point of each curve', 'cincin menandai titik terendah tiap kurva'), { anchor: 'end', size: 12 })}`);
}

// ---- Figure 3: training against validation, early stopping -----------------------------------------
function stoppingCurve() {
  const xl = 60, xr = 664, top = 34, bottom = 246, maxT = 300, lo = 100, hi = 850, best = 45;
  const X = t => xl + t / maxT * (xr - xl), Y = v => bottom - (v - lo) / (hi - lo) * (bottom - top);
  const grid = [100, 300, 500, 700].map(v => `${line(xl, Y(v), xr, Y(v), { c: 'var(--line)', w: 1, dash: '3 4' })}${text(xl - 7, Y(v) + 4, fmt(v), { anchor: 'end', size: 11.5 })}`).join('');
  const ticks = [0, 50, 100, 150, 200, 250, 300].map(t => text(X(t), bottom + 17, fmt(t), { size: 11.5 })).join('');
  const stop = `${line(X(best), top - 4, X(best), bottom, { c: 'var(--ink)', w: 1.6, dash: '5 4' })}${ring(X(best), Y(at(VALID_01, best)), k(1), 6.5)}
${text(X(best) + 8, top + 8, tr(`stop here: ${fmt(best)} trees`, `berhenti di sini: ${fmt(best)} tree`), { anchor: 'start', size: 13, ...INK })}${text(X(best) + 8, top + 25, tr(`validation ${fmt(at(VALID_01, best))} g`, `validasi ${fmt(at(VALID_01, best))} g`), { anchor: 'start', size: 12 })}`;
  const ends = `${text(xr - 6, Y(at(VALID_01, 300)) - 9, `${fmt(at(VALID_01, 300))}`, { anchor: 'end', size: 12, fill: k(1), weight: 700 })}${text(xr - 6, Y(at(TRAIN_01, 300)) + 18, `${fmt(at(TRAIN_01, 300))}`, { anchor: 'end', size: 12, fill: k(0), weight: 700 })}`;
  const note = `${text(X(190), Y(640), tr('Past the dashed line, validation error rises', 'Setelah garis putus-putus, galat validasi naik'), { size: 12.5 })}${text(X(190), Y(640) + 17, tr('while training error keeps falling.', 'sementara galat training terus turun.'), { size: 12.5 })}`;
  const legend = `${line(236, 296, 264, 296, { c: k(0), w: 3 })}${text(272, 300, tr('training penguins', 'penguin training'), { anchor: 'start', size: 12 })}${line(398, 296, 426, 296, { c: k(1), w: 3 })}${text(434, 300, tr('validation penguins', 'penguin validasi'), { anchor: 'start', size: 12 })}`;
  return svg(680, 312, `${grid}${line(xl, bottom, xr, bottom, { c: 'var(--muted)', w: 1.4 })}${line(xl, bottom, xl, top - 6, { c: 'var(--muted)', w: 1.4 })}${ticks}
${`${curvePath(TRAIN_01, X, Y, maxT)} stroke="${k(0)}" stroke-width="3"/>`}${`${curvePath(VALID_01, X, Y, maxT)} stroke="${k(1)}" stroke-width="3"/>`}${stop}${ends}${note}
${text(xl, top - 14, tr('RMSE (g)', 'RMSE (g)'), { anchor: 'start', size: 12 })}${text((xl + xr) / 2, bottom + 34, tr(`number of trees (learning rate ${fmt(0.1)})`, `jumlah tree (learning rate ${fmt(0.1)})`), { size: 12.5 })}${legend}`);
}

// ---- Figure 4: bagging against boosting ------------------------------------------------------------
function baggingVsBoosting() {
  const arrow = (x1, y1, x2, y2) => line(x1, y1, x2, y2, { c: 'var(--muted)', w: 1.8, arrow: true });
  const node = (x, y, w, h, c, l1, l2) => `${box(x, y, w, h, soft(c), k(c))}${l2 ? text(x + w / 2, y + h / 2 - 2, l1, { size: 12.5, ...INK }) + text(x + w / 2, y + h / 2 + 14, l2, { size: 11.5 }) : text(x + w / 2, y + h / 2 + 4.5, l1, { size: 12.5, ...INK })}`;
  // Bagging, left half: data -> three bootstrap samples -> three deep trees -> average.
  const bw = 92, bgap = 15, bx0 = 17, bcx = 165;
  const bag = [0, 1, 2].map(i => bx0 + i * (bw + bgap));
  const bagging = `${text(bcx, 22, tr('Bagging', 'Bagging'), { size: 17, ...INK })}${text(bcx, 40, tr('trees grown side by side', 'tree dibuat berdampingan'), { size: 12.5 })}
${node(bcx - 60, 50, 120, 30, 2, tr('training rows', 'baris training'))}
${bag.map(x => arrow(bcx, 80, x + bw / 2, 112)).join('')}
${bag.map((x, i) => node(x, 112, bw, 34, 2, tr(`sample ${i + 1}`, `sampel ${i + 1}`))).join('')}
${bag.map(x => arrow(x + bw / 2, 146, x + bw / 2, 176)).join('')}
${bag.map(x => node(x, 176, bw, 34, 2, tr('deep tree', 'tree dalam'))).join('')}
${bag.map(x => arrow(x + bw / 2, 210, bcx, 240)).join('')}
${node(bcx - 70, 242, 140, 34, 2, tr('average', 'rata-rata'))}
${text(bcx, 300, tr('lowers variance', 'menurunkan varians'), { size: 14, ...INK })}${text(bcx, 318, tr('(trees do not depend on each other)', '(tree tidak saling bergantung)'), { size: 12 })}`;
  // Boosting, right half: data -> tree 1 -> tree 2 -> tree 3, then the sum.
  const tw = 70, tgap = 56, tx0 = 352, ccx = 514;
  const chain = [0, 1, 2].map(i => tx0 + i * (tw + tgap));
  const boosting = `${text(ccx, 22, tr('Boosting', 'Boosting'), { size: 17, ...INK })}${text(ccx, 40, tr('trees grown one after another', 'tree dibuat satu per satu'), { size: 12.5 })}
${node(ccx - 60, 50, 120, 30, 3, tr('training rows', 'baris training'))}
${arrow(ccx, 80, chain[0] + tw / 2, 138)}
${chain.map((x, i) => node(x, 138, tw, 48, 3, tr(`tree ${i + 1}`, `tree ${i + 1}`), tr('small', 'kecil'))).join('')}
${[0, 1].map(i => arrow(chain[i] + tw, 162, chain[i + 1], 162) + text(chain[i] + tw + tgap / 2, 152, tr('residuals', 'residual'), { size: 11.5 })).join('')}
${chain.map(x => arrow(x + tw / 2, 186, ccx, 240)).join('')}
${node(ccx - 110, 242, 220, 34, 3, tr('start + rate × sum of trees', 'awal + rate × jumlah tree'))}
${text(ccx, 300, tr('lowers bias', 'menurunkan bias'), { size: 14, ...INK })}${text(ccx, 318, tr('(each tree fixes what is left)', '(tiap tree memperbaiki sisanya)'), { size: 12 })}`;
  return svg(680, 330, `${bagging}${line(340, 12, 340, 322, { c: 'var(--line)', w: 1.4, dash: '4 5' })}${boosting}`);
}

export const figures = {
  'two-stages': twoStages,
  'learning-rates': learningRates,
  'stopping-curve': stoppingCurve,
  'bagging-vs-boosting': baggingVsBoosting,
};
