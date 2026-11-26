// Figures for the lesson "Regularization lab". Every number comes from the lab's own math
// (sims/ml/regularizationlab.js on top of sims/ml/regularize.js) on its default sample, so the lesson
// text, the figures and what the learner sees in the lab agree: generated data, seed 4, noise 0.5,
// 15 training dots (taken from a pool of 42), 18 validation crosses, polynomial degree 9. Features are
// standardized; the loss is mean squared error + lambda x penalty (sum of squares for L2, sum of absolute
// values for L1); errors are mean squared errors in plot units (the y axis of the lab runs 0 to 10).
// The values below were produced by that code (errorsByLambda over lambdaGridLogs(), fitAndScore) and
// rounded; the lasso cells ran to convergence (20000 sweeps, tol 1e-10).
import { svg, dot, ring, text, line, box, k, tr, fmt } from '../kit.js';

const ink = { fill: 'var(--ink)' };
const bold = { fill: 'var(--ink)', weight: 700 };

// ---------------------------------------------------------------------------------------------
// Figure 1: training and validation error against lambda, ridge, 31 values of log10(lambda) from -5 to 1.
// ---------------------------------------------------------------------------------------------
const GRID_TRAIN = [0.106, 0.108, 0.111, 0.117, 0.125, 0.136, 0.15, 0.166, 0.18, 0.194, 0.206, 0.218, 0.23, 0.245, 0.265, 0.293, 0.331, 0.377, 0.428, 0.485, 0.553, 0.637, 0.738, 0.85, 0.962, 1.063, 1.149, 1.222, 1.288, 1.351, 1.409];
const GRID_VAL = [3.835, 3.646, 3.264, 2.708, 2.061, 1.448, 0.975, 0.681, 0.537, 0.487, 0.481, 0.487, 0.49, 0.483, 0.474, 0.479, 0.51, 0.572, 0.662, 0.779, 0.933, 1.137, 1.393, 1.68, 1.964, 2.213, 2.411, 2.562, 2.678, 2.771, 2.848];
const BEST_AT = 15;   // log10(lambda) = -2: the lab's "best lambda" (0.010)
const logAt = i => -5 + i * 0.2;

function uShape() {
  const ox = 58, oy = 56, W = 548, H = 216, ymax = 4.4;
  const X = lg => ox + ((lg + 5) / 6) * W, Y = v => oy + H - (v / ymax) * H;
  const path = vals => vals.map((v, i) => `${i ? 'L' : 'M'}${X(logAt(i)).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
  const yt = [0, 1, 2, 3, 4].map(t => `${line(ox, Y(t), ox + W, Y(t), { c: 'var(--line)', w: 1, dash: '2 4' })}${text(ox - 8, Y(t) + 4, fmt(t), { anchor: 'end', size: 12 })}`).join('');
  const xt = [-5, -4, -3, -2, -1, 0, 1].map(t => text(X(t), oy + H + 17, fmt(10 ** t, { max: 5 }), { size: 12 })).join('');
  const dots = (vals, c) => vals.map((v, i) => (i % 2 === 0 || i === BEST_AT ? dot(X(logAt(i)), Y(v), c, 3.5) : '')).join('');
  const bx = X(logAt(BEST_AT)), by = Y(GRID_VAL[BEST_AT]);
  const last = GRID_VAL.length - 1;
  return svg(640, 330, `${line(ox + 6, 16, ox + 30, 16, { c: k(0), w: 3 })}${text(ox + 38, 20, tr('Training error (15 dots)', 'Training error (15 titik bulat)'), { anchor: 'start', size: 13, ...ink })}
${line(ox + 290, 16, ox + 314, 16, { c: k(1), w: 3 })}${text(ox + 322, 20, tr('Validation error (18 crosses)', 'Validation error (18 titik silang)'), { anchor: 'start', size: 13, ...ink })}
${text(ox, oy - 10, tr('Too little penalty: overfits', 'Penalti terlalu kecil: overfitting'), { anchor: 'start', size: 12, ...ink })}
${text(ox + W, oy - 10, tr('Too much: underfits', 'Terlalu besar: underfitting'), { anchor: 'end', size: 12, ...ink })}
${box(ox, oy, W, H)}${yt}${xt}
${line(bx, oy, bx, oy + H, { c: k(2), w: 2, dash: '5 4' })}
<path d="${path(GRID_TRAIN)}" fill="none" stroke="${k(0)}" stroke-width="3" stroke-linejoin="round"/>${dots(GRID_TRAIN, k(0))}
<path d="${path(GRID_VAL)}" fill="none" stroke="${k(1)}" stroke-width="3" stroke-linejoin="round"/>${dots(GRID_VAL, k(1))}
${ring(bx, by, k(2), 7)}
${text(bx + 12, Y(3.8), tr('Lowest validation error', 'Validation error terendah'), { anchor: 'start', size: 13, ...bold })}
${text(bx + 12, Y(3.45), tr(`${fmt(GRID_VAL[BEST_AT], { digits: 2 })} at λ = ${fmt(10 ** logAt(BEST_AT), { digits: 3 })}`, `${fmt(GRID_VAL[BEST_AT], { digits: 2 })} pada λ = ${fmt(10 ** logAt(BEST_AT), { digits: 3 })}`), { anchor: 'start', size: 13, ...bold })}
${text(X(-5) + 4, Y(GRID_VAL[0]) - 10, fmt(GRID_VAL[0], { digits: 2 }), { anchor: 'start', size: 12, ...ink })}
${text(X(1) - 8, Y(GRID_VAL[last]) - 9, fmt(GRID_VAL[last], { digits: 2 }), { anchor: 'end', size: 12, ...ink })}
${text(X(-5) + 8, Y(GRID_TRAIN[0]) - 9, fmt(GRID_TRAIN[0], { digits: 2 }), { anchor: 'start', size: 12, ...ink })}
${text(X(1) - 8, Y(GRID_TRAIN[last]) + 20, fmt(GRID_TRAIN[last], { digits: 2 }), { anchor: 'end', size: 12, ...ink })}
${text(ox + W / 2, oy + H + 38, tr('Penalty strength λ (log scale)', 'Kekuatan penalti λ (skala log)'), { size: 12, ...ink })}
<text transform="translate(14 ${oy + H / 2}) rotate(-90)" text-anchor="middle" font-size="12" font-weight="500" fill="var(--ink)">${tr('Mean squared error', 'Mean squared error')}</text>`);
}

// ---------------------------------------------------------------------------------------------
// Figure 2: the nine coefficients (powers 1 to 9 of x) at three penalty strengths, ridge above, lasso below.
// ---------------------------------------------------------------------------------------------
const PANELS = [
  { kind: 'l2', lambda: 0.00001, coef: [-4.752, 4.491, 14.814, -14.442, -13.315, 12.997, -11.193, -3.193, 13.524] },
  { kind: 'l2', lambda: 0.01, coef: [-2.61, 0.709, 1.635, -0.482, 0.691, -0.278, -0.042, 0.032, -0.421] },
  { kind: 'l2', lambda: 1, coef: [-0.384, -0.005, -0.089, 0.003, -0.03, 0.004, -0.004, -0.001, 0.012] },
  { kind: 'l1', lambda: 0.001, coef: [-4.523, 3.087, 13.411, -6.402, -16.199, 0.776, 0, 2.446, 6.355] },
  { kind: 'l1', lambda: 0.01, coef: [-3.235, 1.119, 3.175, -1.083, 0, 0, 0, 0, -0.719] },
  { kind: 'l1', lambda: 1, coef: [-0.372, 0, 0, 0, 0, 0, 0, 0, 0] },
];

// The smallest 1, 2, 5 times a power of ten that is at least v (the lab's rule for its coefficient axis).
function niceCeil(v) {
  if (!(v > 0)) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map(m => m * mag).find(s => s >= v * (1 - 1e-12));
}

function coefPanel(p, col, row) {
  const ox = 40 + col * 204, oy = 38 + row * 176, W = 168, H = 82;
  const M = niceCeil(Math.max(...p.coef.map(Math.abs)) * 1.1);
  const Y = v => oy + (M - v) / (2 * M) * H, slot = W / p.coef.length, cx = i => ox + (i + 0.5) * slot, bar = slot * 0.62;
  const title = `${p.kind === 'l2' ? tr('Ridge (L2)', 'Ridge (L2)') : tr('Lasso (L1)', 'Lasso (L1)')}, λ = ${fmt(p.lambda, { digits: p.lambda >= 1 ? 1 : p.lambda >= 0.01 ? 2 : p.lambda >= 0.001 ? 3 : 5 })}`;
  const zeros = p.coef.filter(c => c === 0).length;
  const bars = p.coef.map((c, i) => (c === 0
    ? ring(cx(i), Y(0), 'var(--ink)', 3.5)
    : `<rect x="${(cx(i) - bar / 2).toFixed(1)}" y="${Math.min(Y(c), Y(0)).toFixed(1)}" width="${bar.toFixed(1)}" height="${Math.max(1, Math.abs(Y(c) - Y(0))).toFixed(1)}" fill="${k(0)}"/>`)).join('');
  return `${text(ox, oy - 12, title, { anchor: 'start', size: 13, ...bold })}
${box(ox, oy, W, H)}${line(ox, Y(0), ox + W, Y(0), { c: 'var(--muted)', w: 1.5 })}${bars}
${text(ox - 5, oy + 4, fmt(M), { anchor: 'end', size: 11 })}${text(ox - 5, oy + H + 4, fmt(-M), { anchor: 'end', size: 11 })}
${text(ox, oy + H + 17, tr(`largest ${fmt(Math.max(...p.coef.map(Math.abs)), { digits: 2 })}`, `terbesar ${fmt(Math.max(...p.coef.map(Math.abs)), { digits: 2 })}`), { anchor: 'start', size: 12, ...ink })}
${text(ox, oy + H + 33, tr(`exactly 0: ${zeros} of ${p.coef.length}`, `tepat 0: ${zeros} dari ${p.coef.length}`), { anchor: 'start', size: 12, ...ink })}`;
}

function coefficients() {
  const panels = PANELS.map((p, i) => coefPanel(p, i % 3, Math.floor(i / 3))).join('');
  return svg(640, 404, `${panels}
${text(320, 374, tr('Each panel has its own vertical scale. Bars: powers 1 to 9 of x, left to right.', 'Tiap panel punya skala vertikal sendiri. Batang: pangkat 1 sampai 9 dari x, kiri ke kanan.'), { size: 12 })}
${text(320, 392, tr('Ring: a coefficient that is exactly 0.', 'Lingkaran: koefisien yang tepat 0.'), { size: 12 })}`);
}

// ---------------------------------------------------------------------------------------------
// Figure 3: how much a penalty helps depends on how much data there is. Validation error (18 fixed
// crosses) at the smallest lambda of the lab (0.00001) and at the best lambda for that sample, for
// training sets of 8 to 42 dots. The best lambda is picked on those same crosses, so that line is a little
// flattering.
// ---------------------------------------------------------------------------------------------
const SIZES = [8, 10, 12, 15, 20, 25, 30, 36, 42];
const VAL_SMALLEST = [30.43, 23.63, 4.07, 3.84, 2.24, 0.55, 0.53, 0.36, 0.33];
const VAL_BEST = [0.71, 0.49, 0.48, 0.48, 0.42, 0.4, 0.41, 0.36, 0.32];

function penaltyVsData() {
  const ox = 58, oy = 52, W = 548, H = 204, lo = Math.log10(0.2), hi = Math.log10(50);
  const X = n => ox + ((n - 6) / 38) * W, Y = v => oy + H - ((Math.log10(v) - lo) / (hi - lo)) * H;
  const path = vals => vals.map((v, i) => `${i ? 'L' : 'M'}${X(SIZES[i]).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
  const yt = [0.3, 1, 3, 10, 30].map(t => `${line(ox, Y(t), ox + W, Y(t), { c: 'var(--line)', w: 1, dash: '2 4' })}${text(ox - 8, Y(t) + 4, fmt(t), { anchor: 'end', size: 12 })}`).join('');
  const xt = [10, 15, 20, 25, 30, 35, 40].map(t => text(X(t), oy + H + 17, fmt(t), { size: 12 })).join('');
  const dots = (vals, c) => vals.map((v, i) => dot(X(SIZES[i]), Y(v), c, 4)).join('');
  const i0 = 0, iN = SIZES.length - 1;
  return svg(640, 324, `${line(ox + 6, 16, ox + 30, 16, { c: k(1), w: 3 })}${text(ox + 38, 20, tr(`Smallest penalty (λ = ${fmt(0.00001, { max: 5 })})`, `Penalti terkecil (λ = ${fmt(0.00001, { max: 5 })})`), { anchor: 'start', size: 13, ...ink })}
${line(ox + 290, 16, ox + 314, 16, { c: k(2), w: 3 })}${text(ox + 322, 20, tr('Best penalty for this sample', 'Penalti terbaik untuk sampel ini'), { anchor: 'start', size: 13, ...ink })}
${box(ox, oy, W, H)}${yt}${xt}
<path d="${path(VAL_SMALLEST)}" fill="none" stroke="${k(1)}" stroke-width="3" stroke-linejoin="round"/>${dots(VAL_SMALLEST, k(1))}
<path d="${path(VAL_BEST)}" fill="none" stroke="${k(2)}" stroke-width="3" stroke-linejoin="round"/>${dots(VAL_BEST, k(2))}
${text(X(SIZES[i0]) - 2, Y(VAL_SMALLEST[i0]) - 10, fmt(VAL_SMALLEST[i0], { digits: 2 }), { anchor: 'start', size: 12, ...ink })}
${text(X(SIZES[i0]) - 2, Y(VAL_BEST[i0]) - 11, fmt(VAL_BEST[i0], { digits: 2 }), { anchor: 'start', size: 12, ...ink })}
${text(X(SIZES[iN]) + 20, Y(VAL_SMALLEST[iN]) - 13, `${fmt(VAL_SMALLEST[iN], { digits: 2 })} / ${fmt(VAL_BEST[iN], { digits: 2 })}`, { anchor: 'end', size: 12, ...ink })}
${text(X(22), Y(14), tr('Few points: the penalty matters a lot', 'Titik sedikit: penalti sangat berpengaruh'), { size: 13, ...bold })}
${text(X(34), Y(1.6), tr('Many points: it hardly matters', 'Titik banyak: hampir tak berpengaruh'), { size: 13, ...bold })}
${text(ox + W / 2, oy + H + 38, tr('Training points', 'Titik training'), { size: 12, ...ink })}
<text transform="translate(14 ${oy + H / 2}) rotate(-90)" text-anchor="middle" font-size="12" font-weight="500" fill="var(--ink)">${tr('Validation error (log scale)', 'Validation error (skala log)')}</text>`);
}

export const figures = {
  'u-shape': uShape,
  coefficients,
  'penalty-vs-data': penaltyVsData,
};
