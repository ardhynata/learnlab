// Figures for the lesson "Calibration and costs" (imbalance-ranking-and-calibration course).
// Self-contained: every number is computed here from the same made-up test set as the lesson text
// (1000 cases in five groups; every case in a group got the same predicted probability).
import { svg, dot, diamond, text, line, box, k, soft, tr, fmt } from '../kit.js';

const N = [400, 250, 150, 120, 80];        // cases per group
const POS = [20, 40, 51, 75, 68];          // positives per group
const A = [0.05, 0.15, 0.35, 0.6, 0.85];   // Model A: calibrated
const B = [0.01, 0.05, 0.2, 0.8, 0.97];    // Model B: same order as A, pushed toward 0 and 1
const C_FP = 10, C_FN = 30;                // cost of a false positive and of a false negative
const TOTAL = N.reduce((s, v) => s + v, 0), POSITIVES = POS.reduce((s, v) => s + v, 0);

const rate = i => POS[i] / N[i];
const brier = sc => sc.reduce((s, p, i) => s + POS[i] * (1 - p) ** 2 + (N[i] - POS[i]) * p ** 2, 0) / TOTAL;
// AUC for grouped scores: the share of (positive, negative) pairs ordered correctly, ties count half.
function auc(sc) {
  let wins = 0;
  for (let i = 0; i < sc.length; i++) for (let j = 0; j < sc.length; j++) {
    const pairs = POS[i] * (N[j] - POS[j]);
    wins += sc[i] > sc[j] ? pairs : sc[i] === sc[j] ? pairs / 2 : 0;
  }
  return wins / (POSITIVES * (TOTAL - POSITIVES));
}
// Total cost when every group with a score of at least t is flagged.
function cost(sc, t) {
  let fp = 0, fn = 0;
  sc.forEach((p, i) => { if (p >= t) fp += N[i] - POS[i]; else fn += POS[i]; });
  return fp * C_FP + fn * C_FN;
}
const axisTicks = (X, Y, x0, y0) => [0, 0.5, 1].map(t => `${text(X(t), y0 + 17, fmt(t), { size: 12 })}${text(x0 - 9, Y(t) + 4, fmt(t), { anchor: 'end', size: 12 })}`).join('');

const yLabel = (x, y) => text(x, y, tr('Share of positives', 'Proporsi positif'), { size: 13, fill: 'var(--ink)' }).replace('<text ', `<text transform="rotate(-90 ${x} ${y})" `);

// ---- Figure 1: a reliability diagram for Model A, with the five rows of the lesson's table. ----
function reliability() {
  const ox = 66, oy = 14, S = 258;
  const X = v => ox + v * S, Y = v => oy + S - v * S;
  const tri = (pts, fill) => `<polygon points="${pts.map(([a, b]) => `${X(a)},${Y(b)}`).join(' ')}" fill="${fill}"/>`;
  const plot = `${box(ox, oy, S, S)}
${tri([[0, 0], [0, 1], [1, 1]], soft(3))}${tri([[0, 0], [1, 0], [1, 1]], soft(1))}
${text(X(0.04), Y(0.93), tr('More positives', 'Lebih banyak positif'), { anchor: 'start', fill: 'var(--ink)', size: 12 })}
${text(X(0.04), Y(0.93) + 16, tr('than predicted', 'daripada prediksi'), { anchor: 'start', fill: 'var(--ink)', size: 12 })}
${text(X(0.96), Y(0.12) - 16, tr('Fewer positives', 'Lebih sedikit positif'), { anchor: 'end', fill: 'var(--ink)', size: 12 })}
${text(X(0.96), Y(0.12), tr('than predicted', 'daripada prediksi'), { anchor: 'end', fill: 'var(--ink)', size: 12 })}
${line(X(0), Y(0), X(1), Y(1), { c: 'var(--muted)', w: 2, dash: '6 5' })}
${A.map((p, i) => dot(X(p), Y(rate(i)), k(0), 3 + Math.sqrt(N[i]) / 2.5)).join('')}
${axisTicks(X, Y, ox, oy + S)}
${text(ox + S / 2, oy + S + 36, tr('Predicted probability', 'Probabilitas prediksi'), { size: 13, fill: 'var(--ink)' })}
${yLabel(ox - 46, oy + S / 2)}`;

  const cx = [404, 482, 556, 628];
  const rows = A.map((p, i) => {
    const y = 84 + i * 32;
    return `${dot(cx[0] - 54, y - 4, k(0), 3 + Math.sqrt(N[i]) / 4)}
${text(cx[0], y, fmt(p), { anchor: 'end', fill: 'var(--ink)', size: 13 })}${text(cx[1], y, fmt(N[i]), { anchor: 'end', fill: 'var(--ink)', size: 13 })}${text(cx[2], y, fmt(POS[i]), { anchor: 'end', fill: 'var(--ink)', size: 13 })}${text(cx[3], y, fmt(rate(i)), { anchor: 'end', fill: k(0), weight: 700, size: 13 })}`;
  }).join('');
  const table = `${text(350, 24, tr('Model A on 1000 test cases', 'Model A pada 1000 kasus uji'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}
${text(cx[0], 56, tr('Predicted', 'Prediksi'), { anchor: 'end', size: 12 })}${text(cx[1], 56, tr('Cases', 'Kasus'), { anchor: 'end', size: 12 })}${text(cx[2], 56, tr('Positives', 'Positif'), { anchor: 'end', size: 12 })}${text(cx[3], 56, tr('Observed', 'Teramati'), { anchor: 'end', size: 12 })}
${line(350, 64, 636, 64, { c: 'var(--line)', w: 1.5 })}
${rows}
${line(350, 84 + 5 * 32 - 20, 636, 84 + 5 * 32 - 20, { c: 'var(--line)', w: 1.5 })}
${text(cx[0], 84 + 5 * 32 - 2, tr('All', 'Semua'), { anchor: 'end', size: 13, fill: 'var(--ink)' })}${text(cx[1], 84 + 5 * 32 - 2, fmt(TOTAL), { anchor: 'end', fill: 'var(--ink)', size: 13 })}${text(cx[2], 84 + 5 * 32 - 2, fmt(POSITIVES), { anchor: 'end', fill: 'var(--ink)', size: 13 })}${text(cx[3], 84 + 5 * 32 - 2, fmt(POSITIVES / TOTAL), { anchor: 'end', fill: 'var(--ink)', size: 13 })}
${text(350, 84 + 5 * 32 + 30, tr('Dot size follows the number of cases.', 'Ukuran titik mengikuti jumlah kasus.'), { anchor: 'start', size: 12 })}`;
  return svg(640, 322, `${plot}${table}`);
}

// ---- Figure 2: two models, one order. Reliability of both, and the lines that join A's and B's numbers. ----
function sameRanking() {
  const ox = 52, oy = 40, S = 220;
  const X = v => ox + v * S, Y = v => oy + S - v * S;
  const curve = (sc, color, mark) => `${sc.slice(1).map((p, i) => line(X(sc[i]), Y(rate(i)), X(p), Y(rate(i + 1)), { c: color, w: 1.6 })).join('')}${sc.map((p, i) => mark(X(p), Y(rate(i)))).join('')}`;
  const left = `${text(ox + S / 2, 20, tr('Reliability diagram', 'Reliability diagram'), { fill: 'var(--ink)', weight: 700, size: 14 })}
${box(ox, oy, S, S)}
${line(X(0), Y(0), X(1), Y(1), { c: 'var(--muted)', w: 2, dash: '6 5' })}
${curve(A, k(0), (x, y) => dot(x, y, k(0), 6))}${curve(B, k(1), (x, y) => diamond(x, y, k(1), 7))}
${axisTicks(X, Y, ox, oy + S)}
${text(ox + S / 2, oy + S + 36, tr('Predicted probability', 'Probabilitas prediksi'), { size: 13, fill: 'var(--ink)' })}
${yLabel(ox - 38, oy + S / 2)}`;

  const ax = 388, bx = 552, pY = v => oy + S - v * S;
  // B's two lowest numbers are 9 px apart, so their labels are nudged apart.
  const label = (x, v, anchor, dx) => text(x + dx, pY(v) + 4 + (v === 0.01 ? 5 : v === 0.05 && x > ax ? -4 : 0), fmt(v), { anchor, fill: 'var(--ink)', size: 12 });
  const right = `${text((ax + bx) / 2, 20, tr('The same five groups, two sets of numbers', 'Lima kelompok yang sama, dua set angka'), { fill: 'var(--ink)', weight: 700, size: 14 })}
${line(ax, pY(0) , ax, pY(1), { c: 'var(--line)', w: 1.6 })}${line(bx, pY(0), bx, pY(1), { c: 'var(--line)', w: 1.6 })}
${A.map((p, i) => line(ax, pY(p), bx, pY(B[i]), { c: 'var(--muted)', w: 1.6 })).join('')}
${A.map(p => dot(ax, pY(p), k(0), 6) + label(ax, p, 'end', -12)).join('')}
${B.map(p => diamond(bx, pY(p), k(1), 7) + label(bx, p, 'start', 13)).join('')}
${text(ax, oy + S + 22, 'Model A', { fill: k(0), weight: 700, size: 14 })}${text(bx, oy + S + 22, 'Model B', { fill: k(1), weight: 700, size: 14 })}
${text(ax, oy + S + 42, `AUC ${fmt(auc(A), { digits: 2 })}`, { fill: 'var(--ink)', size: 13 })}${text(bx, oy + S + 42, `AUC ${fmt(auc(B), { digits: 2 })}`, { fill: 'var(--ink)', size: 13 })}
${text(ax, oy + S + 62, `Brier ${fmt(brier(A), { digits: 4 })}`, { fill: 'var(--ink)', size: 13 })}${text(bx, oy + S + 62, `Brier ${fmt(brier(B), { digits: 4 })}`, { fill: 'var(--ink)', size: 13 })}`;
  return svg(640, 340, `${left}${right}`);
}

// ---- Figure 3: total cost against the threshold, for both models. ----
function costCurve() {
  const ox = 74, oy = 26, W = 540, H = 206, MAX = 8000;
  const X = t => ox + t * W, Y = c => oy + H - c / MAX * H;
  const steps = sc => {
    const cuts = [0, ...[...sc].sort((a, b) => a - b), 1];
    let d = '';
    for (let i = 0; i + 1 < cuts.length; i++) {
      const c = cost(sc, (cuts[i] + cuts[i + 1]) / 2);
      d += `${i ? 'L' : 'M'}${X(cuts[i])} ${Y(c)}L${X(cuts[i + 1])} ${Y(c)}`;
    }
    return d;
  };
  const path = (sc, color, dash) => `<path d="${steps(sc)}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const t0 = C_FP / (C_FP + C_FN), tDefault = 0.5;
  const axes = `${box(ox, oy, W, H)}
${[0, 0.25, 0.5, 0.75, 1].map(t => `${text(X(t), oy + H + 17, fmt(t), { size: 12 })}`).join('')}
${[0, 2000, 4000, 6000, 8000].map(c => `${line(ox - 4, Y(c), ox, Y(c), { c: 'var(--muted)', w: 1.4 })}${text(ox - 8, Y(c) + 4, fmt(c), { anchor: 'end', size: 12 })}`).join('')}
${text(ox + W / 2, oy + H + 38, tr('Threshold: flag a case when its probability is at least this', 'Threshold: tandai kasus jika probabilitasnya setidaknya sebesar ini'), { size: 13, fill: 'var(--ink)' })}
${text(ox + 8, oy - 8, tr('Total cost (lower is better)', 'Total biaya (makin rendah makin baik)'), { anchor: 'start', size: 12 })}`;
  const marks = `${line(X(t0), oy, X(t0), oy + H, { c: 'var(--ink)', w: 1.6, dash: '5 4' })}${line(X(tDefault), oy, X(tDefault), oy + H, { c: 'var(--muted)', w: 1.6, dash: '5 4' })}
${text(X(t0) + 7, oy + H - 12, `${fmt(t0)} ${tr('from costs', 'dari biaya')}`, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 12 })}
${text(X(tDefault) + 7, oy + H - 12, `${fmt(tDefault)} ${tr('default', 'bawaan')}`, { anchor: 'start', size: 12 })}
${dot(X(t0), Y(cost(A, t0)), k(0), 6)}${text(X(t0) + 9, Y(cost(A, t0)) + 24, fmt(cost(A, t0)), { anchor: 'start', fill: k(0), weight: 700, size: 13 })}
${diamond(X(t0), Y(cost(B, t0)), k(1), 7)}${text(X(t0) + 11, Y(cost(B, t0)) - 12, fmt(cost(B, t0)), { anchor: 'start', fill: k(1), weight: 700, size: 13 })}`;
  const key = `${line(X(0.56), oy + 126, X(0.56) + 30, oy + 126, { c: k(0), w: 3 })}${text(X(0.56) + 38, oy + 130, tr('Model A (calibrated)', 'Model A (terkalibrasi)'), { anchor: 'start', fill: 'var(--ink)', size: 13 })}
${line(X(0.56), oy + 148, X(0.56) + 30, oy + 148, { c: k(1), w: 3, dash: '7 5' })}${text(X(0.56) + 38, oy + 152, tr('Model B (overconfident)', 'Model B (terlalu yakin)'), { anchor: 'start', fill: 'var(--ink)', size: 13 })}`;
  return svg(640, 290, `${axes}${path(B, k(1), '8 6')}${path(A, k(0))}${marks}${key}`);
}

export const figures = { reliability, 'same-ranking': sameRanking, 'cost-curve': costCurve };
