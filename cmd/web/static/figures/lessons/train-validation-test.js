// Figures for the lesson "Train, validation and test". The curve figures are computed
// from the same math as the lab (sims/ml/overfitdemo.js), on the lab's default sample,
// so what the lesson shows is what the learner gets when they open the lab.
import { svg, dot, cross, text, line, k, tr, fmt } from '../kit.js';
import { polyFit } from '../../sims/ml/regression.js';
import { DEFAULTS, MAX_DEGREE, sampleCurve, splitSample, errorsByDegree } from '../../sims/ml/overfitdemo.js';

const ink = { weight: 700, fill: 'var(--ink)' };
const clampPx = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// SVG path through data points mapped to pixels; y is clamped to the panel so a wild curve stays inside it.
const path = (pts, X, Y, lo, hi) => `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${clampPx(Y(p.y), lo, hi).toFixed(1)}`).join('')}" fill="none" stroke-linejoin="round"`;

const lab = () => {
  const pts = sampleCurve(DEFAULTS.seed, { noise: DEFAULTS.noise });
  const { train, validation } = splitSample(pts, DEFAULTS.train, DEFAULTS.seed);
  return { train, validation, errs: errorsByDegree(train, validation) };
};

// The lesson's worked example: 7 training points, 3 validation points, degree 2 against degree 6.
function workedExample() {
  const trn = [[1, 2.1], [2, 3.6], [4, 5.4], [5, 5.5], [7, 6.6], [8, 7.5], [10, 7.4]], va = [[3, 4.2], [6, 6.6], [9, 7.4]];
  const f2 = polyFit(trn.map(p => p[0]), trn.map(p => p[1]), 2), f6 = polyFit(trn.map(p => p[0]), trn.map(p => p[1]), 6);
  const left = 56, right = 600, top = 18, bottom = 214;
  const X = x => left + x / 11 * (right - left), Y = y => bottom - (y - 1) / 8 * (bottom - top);
  const curve = f => Array.from({ length: 111 }, (_, s) => ({ x: 0.5 + s / 11, y: f.predict(0.5 + s / 11) }));
  const ticks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(x => text(X(x), bottom + 18, fmt(x), { size: 12 })).join('');
  return svg(640, 292, `
${line(left, bottom, right + 10, bottom, { c: 'var(--muted)', w: 1.6, arrow: true })}${line(left, bottom, left, top - 6, { c: 'var(--muted)', w: 1.6, arrow: true })}
${ticks}${text(right + 6, bottom + 18, 'x', { anchor: 'start' })}${text(30, 120, 'y')}
${path(curve(f2), X, Y, top, bottom)} stroke="${k(2)}" stroke-width="3.2"/>
${path(curve(f6), X, Y, top, bottom)} stroke="${k(3)}" stroke-width="3.2" stroke-dasharray="7 5"/>
${trn.map(([x, y]) => dot(X(x), Y(y), k(0), 6)).join('')}${va.map(([x, y]) => cross(X(x), Y(y), k(1))).join('')}
${dot(86, 270, k(0), 5)}${text(98, 274, tr(`training (${fmt(7)})`, `training (${fmt(7)})`), { anchor: 'start', size: 12 })}${cross(196, 270, k(1))}${text(208, 274, tr(`validation (${fmt(3)})`, `validasi (${fmt(3)})`), { anchor: 'start', size: 12 })}
<path d="M312 270h28" stroke="${k(2)}" stroke-width="3.2"/>${text(348, 274, tr('degree 2', 'derajat 2'), { anchor: 'start', size: 12 })}<path d="M418 270h28" stroke="${k(3)}" stroke-width="3.2" stroke-dasharray="7 5"/>${text(454, 274, tr('degree 6', 'derajat 6'), { anchor: 'start', size: 12 })}`);
}

// Training error falls, validation error is U-shaped; the best degree is marked.
function uCurve() {
  const { errs } = lab();
  const left = 66, right = 616, top = 30, bottom = 206, maxDeg = 12;
  const cap = 1.2 * Math.max(errs.train[0], errs.validation[0]);
  const X = d => left + (d - 1) / (maxDeg - 1) * (right - left - 16) + 8, Y = e => bottom - e / cap * (bottom - top);
  // A series drawn up to the top of the chart; where it would leave, it stops at the top edge with an arrow.
  const series = (vals, color) => {
    let d = '', arrow = '';
    for (let i = 0; i < vals.length; i++) {
      if (vals[i] <= cap) { d += `${i ? 'L' : 'M'}${X(i + 1).toFixed(1)} ${Y(vals[i]).toFixed(1)}`; continue; }
      if (i) { const t = (cap - vals[i - 1]) / (vals[i] - vals[i - 1]), x = X(i) + t * (X(i + 1) - X(i)); d += `L${x.toFixed(1)} ${top}`; arrow = line(x, top + 16, x, top - 4, { c: color, w: 3, arrow: true }) + text(x + 12, top + 34, tr('off the chart', 'keluar grafik'), { anchor: 'start', size: 12, fill: color }); }
      break;
    }
    const dots = vals.map((v, i) => (v <= cap ? dot(X(i + 1), Y(v), color, 4.4) : '')).join('');
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="3.2" stroke-linejoin="round"/>${arrow}${dots}`;
  };
  const best = errs.best;
  return svg(640, 268, `
${line(left, bottom, right + 8, bottom, { c: 'var(--muted)', w: 1.6, arrow: true })}${line(left, bottom, left, top - 14, { c: 'var(--muted)', w: 1.6, arrow: true })}
${[1, 3, 5, 7, 9, 12].map(d => text(X(d), bottom + 18, fmt(d), { size: 12 })).join('')}
${text(328, bottom + 40, tr('model flexibility: polynomial degree', 'kompleksitas model: derajat polinomial'))}${text(14, 118, tr('error', 'error'), { anchor: 'start' })}
${line(X(best), top - 6, X(best), bottom, { c: 'var(--ink)', w: 1.6, dash: '5 5' })}${text(X(best) + 8, top + 4, tr(`best: degree ${best}`, `terbaik: derajat ${best}`), { anchor: 'start', ...ink, size: 13 })}
${series(errs.validation, k(1))}${series(errs.train, k(0))}
${text(X(1) + 4, top + 4, tr('underfitting', 'underfitting'), { anchor: 'start', size: 12.5 })}${text(X(12) + 4, top + 4, tr('overfitting', 'overfitting'), { anchor: 'end', size: 12.5 })}
${text(X(6.7), Y(cap * 0.6), tr('validation error', 'validation error'), { anchor: 'end', size: 12.5, fill: k(1), weight: 700 })}
${text(X(9), bottom - 14, tr('training error', 'training error'), { anchor: 'start', size: 12.5, fill: k(0), weight: 700 })}`);
}

// The degree with the lowest validation error in 20 samples (seeds 11 to 30 of the lab), for 14 and for 26
// training points. Computed with the lab's own math, so it matches what New sample shows.
function bestDegreeSpread() {
  const seeds = Array.from({ length: 20 }, (_, i) => DEFAULTS.seed + i);
  const bests = nTrain => seeds.map(seed => {
    const { train, validation } = splitSample(sampleCurve(seed, { noise: DEFAULTS.noise }), nTrain, seed);
    return errorsByDegree(train, validation).best;
  });
  const rows = [14, 26].map(n => ({ n, bests: bests(n) }));
  const counts = rows.map(r => Array.from({ length: MAX_DEGREE }, (_, d) => r.bests.filter(b => b === d + 1).length));
  const peak = Math.max(...counts.flat());
  const left = 70, right = 610, slot = (right - left) / MAX_DEGREE, barMax = 50;
  const X = d => left + (d - 0.5) * slot;
  const panel = (i, top) => {
    const base = top + 112, { n, bests } = rows[i];
    const bars = counts[i].map((c, d) => {
      if (!c) return '';
      const h = c / peak * barMax;
      return `<rect x="${X(d + 1) - slot * 0.3}" y="${base - h}" width="${slot * 0.6}" height="${h}" rx="3" fill="${k(1)}"/>${text(X(d + 1), base - h - 5, fmt(c), { size: 12, fill: 'var(--ink)' })}`;
    }).join('');
    const ticks = Array.from({ length: MAX_DEGREE }, (_, d) => text(X(d + 1), base + 18, fmt(d + 1), { size: 12 })).join('');
    return `${text(left, top + 16, tr(`${fmt(n)} training points, ${fmt(30 - n)} validation points`, `${fmt(n)} titik training, ${fmt(30 - n)} titik validasi`), { anchor: 'start', ...ink })}
${text(left, top + 33, tr(`best degree from ${fmt(Math.min(...bests))} to ${fmt(Math.max(...bests))}`, `derajat terbaik dari ${fmt(Math.min(...bests))} sampai ${fmt(Math.max(...bests))}`), { anchor: 'start', size: 12.5 })}
${line(left, base, right + 6, base, { c: 'var(--muted)', w: 1.6 })}${bars}${ticks}`;
  };
  return svg(640, 330, `${panel(0, 0)}${panel(1, 160)}
${text((left + right) / 2, 316, tr('degree with the lowest validation error (number of samples out of 20)', 'derajat dengan validation error terendah (jumlah sampel dari 20)'))}`);
}

export const figures = { 'worked-example': workedExample, 'u-curve': uCurve, 'best-degree-spread': bestDegreeSpread };
