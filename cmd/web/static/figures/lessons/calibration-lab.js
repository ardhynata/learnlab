// Figures for the lesson "Calibration lab" (imbalance-ranking-and-calibration course). They use the lab's
// own math on the lab's first sample (seed 1, 20 percent positive, costs 1 and 5, cost-based threshold 1/6),
// so every number agrees with the lesson text and with the lab after Reset.
import { svg, dot, diamond, text, line, box, k, soft, tr, fmt } from '../kit.js';
import { buildPredictors, summarize, costThreshold } from '../../sims/ml/calibrationlab.js';
import { costCurve, CALIBRATION_STRETCH } from '../../sims/ml/calibration.js';

const KEYS = ['good', 'overconfident', 'underconfident'];
const COLOR = { good: k(2), overconfident: k(1), underconfident: k(3) };
const name = key => ({
  good: tr('Well calibrated', 'Terkalibrasi baik'),
  overconfident: tr('Overconfident', 'Overconfident'),
  underconfident: tr('Underconfident', 'Underconfident'),
}[key]);
const FP = 1, FN = 5, CT = costThreshold(FP, FN);
const f2 = v => fmt(v, { digits: 2 });
const f3 = v => fmt(v, { digits: 3 });
const ink = { fill: 'var(--ink)' };
const sigmoid = z => 1 / (1 + Math.exp(-z));
const vtext = (x, y, t, o = {}) => text(x, y, t, o).replace('<text ', `<text transform="rotate(-90 ${x} ${y})" `);

// The first lab sample, with and without Platt scaling.
const sample = recalibrated => buildPredictors({ n: 1000, prevalence: 0.2, seed: 1, recalibrated });

// A mark per predictor: circle, diamond or square, so the three stay distinguishable where they overlap.
function mark(key, x, y, r) {
  if (key === 'overconfident') return diamond(x, y, COLOR[key], r + 1);
  if (key === 'underconfident') return `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" fill="${COLOR[key]}" stroke="var(--ink)" stroke-width="2"/>`;
  return `${dot(x, y, COLOR[key], r)}<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="var(--ink)" stroke-width="2"/>`;
}

// ---- Figure 1: the three predictors as maps from the same case to a probability. ----
function scoreMaps() {
  const ox = 64, oy = 22, W = 330, H = 230, zMin = -5, zMax = 5;
  const X = z => ox + ((z - zMin) / (zMax - zMin)) * W, Y = p => oy + H - p * H;
  const curve = key => {
    const pts = [];
    for (let z = zMin; z <= zMax + 1e-9; z += 0.1) pts.push(`${pts.length ? 'L' : 'M'}${X(z).toFixed(1)} ${Y(sigmoid(CALIBRATION_STRETCH[key] * z)).toFixed(1)}`);
    return `<path d="${pts.join('')}" stroke="${COLOR[key]}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  };
  // The case where each predictor's probability reaches the cost-based threshold: logit(CT) / stretch.
  const cross = key => Math.log(CT / (1 - CT)) / CALIBRATION_STRETCH[key];
  const ticks = [0, 0.5, 1].map(p => text(ox - 9, Y(p) + 4, fmt(p), { anchor: 'end', size: 12 })).join('')
    + text(ox - 9, Y(CT) + 4, f2(CT), { anchor: 'end', size: 12, ...ink });
  const plot = `${box(ox, oy, W, H)}
${line(ox, Y(0.5), ox + W, Y(0.5), { c: 'var(--muted)', w: 1.5, dash: '6 5' })}
${line(ox, Y(CT), ox + W, Y(CT), { c: 'var(--muted)', w: 1.5, dash: '2 4' })}
${KEYS.map(curve).join('')}
${dot(X(0), Y(0.5), 'var(--ink)', 5.5)}
${KEYS.map(key => mark(key, X(cross(key)), Y(CT), 6)).join('')}
${ticks}
${text(ox + W / 2, oy + H + 24, tr('Cases in ranking order', 'Kasus menurut urutan ranking'), { size: 12 })}
${vtext(ox - 40, oy + H / 2, tr('Probability the predictor reports', 'Probabilitas yang dilaporkan predictor'), { size: 12 })}`;
  const lx = 424;
  const legend = `${text(lx, 38, tr('Three predictors, one order', 'Tiga predictor, satu urutan'), { anchor: 'start', weight: 700, size: 14, ...ink })}
${KEYS.map((key, i) => `${line(lx, 66 + i * 28, lx + 30, 66 + i * 28, { c: COLOR[key], w: 3 })}${text(lx + 40, 70 + i * 28, name(key), { anchor: 'start', size: 13, ...ink })}`).join('')}
${text(lx, 168, tr('Each curve only goes up,', 'Tiap kurva hanya naik,'), { anchor: 'start', size: 13, ...ink })}
${text(lx, 187, tr('so the order is the same.', 'jadi urutannya sama.'), { anchor: 'start', size: 13, ...ink })}
${text(lx, 212, tr('Dot: all three reach 0.5', 'Titik: ketiganya mencapai'), { anchor: 'start', size: 12, ...ink })}
${text(lx, 228, tr('at the same case.', '0,5 di kasus yang sama.'), { anchor: 'start', size: 12, ...ink })}
${text(lx, 250, tr(`Markers: three different`, 'Penanda: tiga kasus'), { anchor: 'start', size: 12, ...ink })}
${text(lx, 266, tr(`cases reach ${f2(CT)}.`, `berbeda mencapai ${f2(CT)}.`), { anchor: 'start', size: 12, ...ink })}`;
  return svg(640, 296, `${plot}${legend}`);
}

// ---- Figure 2: cost per case against the threshold. ----
function costCurves() {
  const { labels, predictors } = sample(false);
  const n = labels.length;
  const ox = 56, oy = 24, W = 380, H = 220, yMax = 1;
  const X = t => ox + t * W, Y = c => oy + H - (c / yMax) * H;
  const ticksX = [0, 0.5, 1].map(t => text(X(t), oy + H + 17, fmt(t), { size: 12 })).join('');
  const ticksY = [0, 0.5, 1].map(c => text(ox - 9, Y(c) + 4, fmt(c), { anchor: 'end', size: 12 })).join('');
  const lowest = summarize(predictors[0].scores, labels, { threshold: 0.5, fpCost: FP, fnCost: FN }).best.costPerCase;
  const curves = predictors.map(p => {
    const pts = costCurve(p.scores, labels, { fpCost: FP, fnCost: FN }, 101);
    return `<path d="${pts.map((pt, i) => `${i ? 'L' : 'M'}${X(pt.threshold).toFixed(1)} ${Y(pt.cost / n).toFixed(1)}`).join('')}" stroke="${COLOR[p.key]}" stroke-width="2.6" fill="none" stroke-linejoin="round"/>`;
  }).join('');
  const bests = predictors.map(p => {
    const s = summarize(p.scores, labels, { threshold: 0.5, fpCost: FP, fnCost: FN });
    return { key: p.key, t: s.best.threshold, c: s.best.costPerCase };
  });
  const plot = `${box(ox, oy, W, H)}
${line(ox, Y(lowest), ox + W, Y(lowest), { c: 'var(--muted)', w: 1.4, dash: '2 4' })}
${line(X(CT), oy, X(CT), oy + H, { c: 'var(--ink)', w: 1.6, dash: '2 4' })}
${curves}
${bests.map(b => mark(b.key, X(b.t), Y(b.c), 6)).join('')}
${text(X(CT) + 6, oy + 14, tr(`cost-based ${f2(CT)}`, `berbasis biaya ${f2(CT)}`), { anchor: 'start', size: 12, ...ink })}
${text(ox + W - 6, Y(lowest) - 8, tr(`lowest cost ${f3(lowest)}`, `biaya terendah ${f3(lowest)}`), { anchor: 'end', size: 12, ...ink })}
${ticksX}${ticksY}
${text(ox + W / 2, oy + H + 38, tr('Decision threshold', 'Threshold keputusan'), { size: 13, ...ink })}
${vtext(ox - 40, oy + H / 2, tr('Cost per case', 'Biaya per kasus'), { size: 13, ...ink })}`;
  const lx = 458;
  const rows = bests.map((b, i) => `${mark(b.key, lx + 7, 78 + i * 34, 6)}${text(lx + 22, 74 + i * 34, name(b.key), { anchor: 'start', size: 13, weight: 700, ...ink })}${text(lx + 22, 90 + i * 34, tr(`best threshold ${f2(b.t)}`, `threshold terbaik ${f2(b.t)}`), { anchor: 'start', size: 12 })}`).join('');
  const legend = `${text(lx, 42, tr('Own best threshold', 'Threshold terbaik sendiri'), { anchor: 'start', weight: 700, size: 12, ...ink })}
${rows}
${text(lx, 200, tr('Same lowest cost,', 'Biaya terendah sama,'), { anchor: 'start', size: 13, ...ink })}
${text(lx, 219, tr('different thresholds.', 'threshold berbeda.'), { anchor: 'start', size: 13, ...ink })}`;
  return svg(660, 296, `${plot}${legend}`);
}

// ---- Figure 3: cases flagged at the cost-based threshold, without and with Platt scaling. ----
function plattEffect() {
  const panels = [[false, tr('Without recalibration', 'Tanpa rekalibrasi')], [true, tr('With Platt scaling', 'Dengan Platt scaling')]];
  const yMax = 800, H = 170, base = 214, bw = 60, gap = 36;
  const body = panels.map(([recal, title], pi) => {
    const { labels, predictors } = sample(recal);
    const ox = 30 + pi * 316;
    const bars = predictors.map((p, i) => {
      const s = summarize(p.scores, labels, { threshold: CT, fpCost: FP, fnCost: FN });
      const h = (s.flagged / yMax) * H, x = ox + 12 + i * (bw + gap);
      return `<rect x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="4" fill="${soft(KEYS.indexOf(p.key) === 0 ? 2 : KEYS.indexOf(p.key) === 1 ? 1 : 3)}" stroke="${COLOR[p.key]}" stroke-width="2.4"/>
${text(x + bw / 2, base - h - 8, fmt(s.flagged), { size: 14, weight: 700, ...ink })}
${text(x + bw / 2, base + 17, f3(s.costPerCase), { size: 13, ...ink })}
${name(p.key).split(' ').map((w, li) => text(x + bw / 2, base + 35 + li * 14, w, { size: 12 })).join('')}`;
    }).join('');
    return `${text(ox + 132, 24, title, { weight: 700, size: 14, ...ink })}
${line(ox, base, ox + 264, base, { c: 'var(--line)', w: 1.6 })}${bars}`;
  }).join('');
  const note = `${text(14, 290, tr(`Bars: cases flagged of 1,000 at the cost-based threshold ${f2(CT)}.`, `Batang: kasus yang ditandai dari 1.000 pada threshold berbasis biaya ${f2(CT)}.`), { anchor: 'start', size: 12 })}
${text(14, 307, tr('Under each bar: cost per case.', 'Di bawah batang: biaya per kasus.'), { anchor: 'start', size: 12 })}`;
  return svg(640, 318, `${body}${note}`);
}

export const figures = { 'score-maps': scoreMaps, 'cost-curves': costCurves, 'platt-effect': plattEffect };
