// Figures for the lesson "Conformal prediction". The numbers are the lesson's own worked example: a straight
// line of body mass on flipper length fitted to 333 penguins, nine held-out penguins as the calibration set
// (their absolute residuals, rounded to whole grams, sorted), and a new penguin with a 200 mm flipper that
// the line predicts at 4161 g. Ranks, quantiles and intervals are computed here from those nine residuals.
import { svg, dot, text, line, box, diamond, k, soft, tr, fmt, pct } from '../kit.js';
import { normalCdf } from '../../sims/ml/classifierscores.js';

const RESIDUALS = [72, 129, 209, 268, 355, 365, 369, 418, 498];   // sorted absolute residuals, grams
const N = RESIDUALS.length;
const PREDICTION = 4161;                                          // grams, for a 200 mm flipper
const ink = { fill: 'var(--ink)' };
const bold = { fill: 'var(--ink)', weight: 700 };

// The rank of the residual to use: ceil((n + 1)(1 - alpha)). The product is rounded first so that
// 10 x 0.8 is 8 and not 8.000000000000002.
const rankFor = (n, alpha) => Math.ceil(Math.round((n + 1) * (1 - alpha) * 1e9) / 1e9);
const quantile = alpha => RESIDUALS[rankFor(N, alpha) - 1];

// ---- Figure 1: the three steps of split conformal prediction. ----
function recipe() {
  const parts = [
    [0, 340, tr('Training set', 'Training set'), 0],
    [346, 170, tr(`Calibration (n = ${fmt(N)})`, `Calibration (n = ${fmt(N)})`), 1],
    [522, 118, tr('New case', 'Kasus baru'), 2],
  ];
  const bar = parts.map(([x, w, label, c]) => `${box(x, 12, w, 40, soft(c), k(c))}${text(x + w / 2, 37, label, { ...bold, size: 13 })}`).join('');
  const steps = [
    [tr('1. Train', '1. Latih'), [tr('Fit the model on', 'Latih model pada'), tr('the training set.', 'training set.')], 0],
    [tr('2. Calibrate', '2. Kalibrasi'), [tr('Absolute residuals', 'Residual absolut'), tr('|y - ŷ|, sorted.', '|y - ŷ|, diurutkan.')], 1],
    [tr('3. Predict', '3. Prediksi'), [tr('q = k-th residual;', 'q = residual ke-k;'), tr('interval ŷ ± q.', 'interval ŷ ± q.')], 2],
  ];
  const w = 190, gap = 35, top = 88, h = 110;
  const body = steps.map(([title, lines, c], i) => {
    const ox = i * (w + gap);
    return `${box(ox, top, w, h, soft(c), k(c))}
${text(ox + w / 2, top + 36, title, { ...bold, size: 16 })}
${text(ox + w / 2, top + 66, lines[0], { ...ink, size: 13 })}
${text(ox + w / 2, top + 85, lines[1], { ...ink, size: 13 })}
${i < 2 ? line(ox + w + 4, top + h / 2, ox + w + gap - 4, top + h / 2, { c: 'var(--muted)', w: 2, arrow: true }) : ''}`;
  }).join('');
  const k8 = rankFor(N, 0.2);
  const note = text(320, 228, tr(`n = ${fmt(N)} and alpha = ${fmt(0.2)} give k = ${fmt(k8)}.`, `n = ${fmt(N)} dan alpha = ${fmt(0.2)} memberi k = ${fmt(k8)}.`), { ...ink, size: 13 });
  return svg(640, 240, `${bar}${body}${note}`);
}

// ---- Figure 2: the sorted calibration residuals, q at rank 8, and the interval it gives. ----
function calibrationResiduals() {
  const left = 60, right = 620, base = 180, top = 34, maxV = 520;
  const Y = v => base - v / maxV * (base - top);
  const slot = (right - left) / N, bw = 38;
  const kk = rankFor(N, 0.2), q = quantile(0.2);
  const bars = RESIDUALS.map((v, i) => {
    const cx = left + slot * (i + 0.5);
    const fill = i + 1 === kk ? k(1) : i + 1 < kk ? k(0) : 'var(--line)';
    return `<rect x="${(cx - bw / 2).toFixed(1)}" y="${Y(v).toFixed(1)}" width="${bw}" height="${(base - Y(v)).toFixed(1)}" rx="3" fill="${fill}" opacity="${i + 1 < kk ? 0.8 : 1}"/>
${text(cx, Y(v) - 6, fmt(v), { ...bold, size: 12 })}${text(cx, base + 17, fmt(i + 1), { size: 12 })}`;
  }).join('');
  const grid = [0, 200, 400].map(v => `${line(left, Y(v), right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const qLine = `${line(left, Y(q), right, Y(q), { c: 'var(--ink)', w: 1.8, dash: '6 5' })}${text(left + 6, Y(q) - 7, tr(`q = ${fmt(q)} g, the ${fmt(kk)}th of ${fmt(N)}`, `q = ${fmt(q)} g, ke-${fmt(kk)} dari ${fmt(N)}`), { anchor: 'start', ...bold, size: 13 })}`;
  const head = `${text(left - 52, 16, tr('Absolute residual (g) at each rank k', 'Residual absolut (g) pada tiap rank k'), { anchor: 'start', ...bold, size: 13 })}`;

  // The interval for a new penguin, on a number line from 3600 g to 4700 g.
  const lo = 3600, hi = 4700, X = v => left + (v - lo) / (hi - lo) * (right - left);
  const ay = 316, iy = 284;
  const ticks = [3700, 4000, 4300, 4600].map(v => `${line(X(v), ay, X(v), ay + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(v), ay + 20, fmt(v), { size: 12 })}`).join('');
  const a = PREDICTION - q, b = PREDICTION + q;
  const interval = `${line(left, ay, right, ay, { c: 'var(--muted)', w: 1.6 })}${ticks}
${line(X(a), iy, X(b), iy, { c: k(1), w: 8 })}${line(X(a), iy - 10, X(a), iy + 10, { c: k(1), w: 3 })}${line(X(b), iy - 10, X(b), iy + 10, { c: k(1), w: 3 })}
${dot(X(PREDICTION), iy, 'var(--ink)', 6)}
${text(X(a), iy - 18, `ŷ - q = ${fmt(a)}`, { ...ink, size: 12 })}${text(X(PREDICTION), iy - 18, `ŷ = ${fmt(PREDICTION)}`, { ...bold, size: 12 })}${text(X(b), iy - 18, `ŷ + q = ${fmt(b)}`, { ...ink, size: 12 })}
${text(left - 52, 244, tr(`Interval for a penguin with a ${fmt(200)} mm flipper (${pct(0.8, 0)} coverage), in grams`, `Interval untuk penguin dengan sirip ${fmt(200)} mm (coverage ${pct(0.8, 0)}), dalam gram`), { anchor: 'start', ...bold, size: 13 })}`;
  return svg(640, 346, `${head}${grid}${bars}${qLine}${interval}`);
}

// ---- Figure 3: the new residual lands in one of n + 1 equally likely slots. ----
function rankSlots() {
  const x0 = 30, step = 58, slots = N + 1, dotY = 42;
  const dx = i => x0 + i * step;                       // i = 1..N, the calibration residuals
  const guide = Array.from({ length: N }, (_, i) => line(dx(i + 1), dotY + 8, dx(i + 1), 228, { c: 'var(--line)', w: 1, dash: '3 4' })).join('');
  const dots = RESIDUALS.map((_, i) => `${dot(dx(i + 1), dotY, k(0), 6)}${text(dx(i + 1), dotY - 14, fmt(i + 1), { size: 11 })}`).join('');
  const axis = line(x0, dotY, x0 + slots * step, dotY, { c: 'var(--muted)', w: 1.6 });
  const row = (y, alpha) => {
    const kk = rankFor(N, alpha);
    const cells = Array.from({ length: slots }, (_, j) => {
      const covered = j + 1 <= kk;
      return `<rect x="${dx(j)}" y="${y}" width="${step}" height="34" fill="${covered ? soft(1) : 'var(--surface)'}" stroke="${covered ? k(1) : 'var(--line)'}" stroke-width="1.6"/>`;
    }).join('');
    const label = tr(`alpha = ${fmt(alpha)}: rank k = ${fmt(kk)}`, `alpha = ${fmt(alpha)}: rank k = ${fmt(kk)}`);
    const result = tr(`${fmt(kk)} of ${fmt(slots)} slots = ${pct(kk / slots, 0)}`, `${fmt(kk)} dari ${fmt(slots)} slot = ${pct(kk / slots, 0)}`);
    return `${text(x0, y - 9, label, { anchor: 'start', ...bold, size: 13 })}${text(x0 + slots * step, y + 54, result, { anchor: 'end', ...ink, size: 13 })}${cells}${diamond(dx(kk), y, k(1), 8)}`;
  };
  const head = text(x0, 14, tr(`${fmt(N)} calibration residuals, sorted, make ${fmt(slots)} slots`, `${fmt(N)} residual kalibrasi, diurutkan, membentuk ${fmt(slots)} slot`), { anchor: 'start', ...bold, size: 13 });
  return svg(640, 238, `${head}${axis}${guide}${dots}${row(86, 0.2)}${row(166, 0.1)}`);
}

// ---- Figure 4: coverage of a 90% interval when the new errors are larger than the calibration errors. ----
// Gaussian errors: the interval is +-1.6449 standard deviations (the 0.95 quantile of the normal), and when the
// new errors have s times that standard deviation it covers 2 * Phi(1.6449 / s) - 1.
function shift() {
  const Z90 = 1.6449;
  const scales = [1, 1.25, 1.5, 2];
  const left = 64, base = 206, top = 40, slot = 140, bw = 84;
  const Y = v => base - v * (base - top);
  const grid = [0, 0.5, 1].map(v => `${line(left, Y(v), 624, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, pct(v, 0), { anchor: 'end', size: 12 })}`).join('');
  const bars = scales.map((s, i) => {
    const cov = 2 * normalCdf(Z90 / s) - 1, cx = left + slot * (i + 0.5);
    return `<rect x="${cx - bw / 2}" y="${Y(cov).toFixed(1)}" width="${bw}" height="${(base - Y(cov)).toFixed(1)}" rx="3" fill="${i === 0 ? k(0) : k(1)}" opacity="${i === 0 ? 0.85 : 1}"/>
${text(cx, Y(cov) + 24, pct(cov, 0), { fill: 'var(--surface)', weight: 700, size: 16 })}${text(cx, base + 20, `× ${fmt(s)}`, { ...bold, size: 14 })}`;
  }).join('');
  const target = `${line(left, Y(0.9), 624, Y(0.9), { c: 'var(--ink)', w: 1.8, dash: '6 5' })}${text(624, Y(0.9) - 6, tr('target 90%', 'target 90%'), { anchor: 'end', ...ink, size: 12 })}`;
  const head = text(left - 56, 16, tr('Coverage of a 90% interval when the new errors are larger', 'Coverage interval 90% ketika galat baru lebih besar'), { anchor: 'start', ...bold, size: 13 });
  const foot = text(344, 250, tr('How many times larger the new errors are than the calibration errors', 'Berapa kali lebih besar galat baru dibanding galat kalibrasi'), { ...ink, size: 13 });
  return svg(640, 264, `${head}${grid}${bars}${target}${line(left, base, 624, base, { c: 'var(--muted)', w: 1.6 })}${foot}`);
}

export const figures = {
  'recipe': recipe,
  'calibration-residuals': calibrationResiduals,
  'rank-slots': rankSlots,
  'shift': shift,
};
