// Figures for the lesson "Interval lab". They use the lab's own math (sims/ml/intervallab.js) on the lab's own
// default state: generated data, seed 41, growing noise, alpha 0.1, 100 calibration points. The fit is built
// once, the first time a figure needs it, because quantile regression takes a moment. Figure 4 is the one
// exception: the penguin table loads asynchronously, so its numbers are constants copied from the lab with
// Penguins (real), seed 41, 40 calibration points, alpha 0.1 and each species held out in turn.
import { svg, dot, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';
import { generatedScenario, fitScenario, intervalMethods, sweepShift, insideShare, METHODS, SWEEP } from '../../sims/ml/intervallab.js';

const ink = { fill: 'var(--ink)' };
const bold = { fill: 'var(--ink)', weight: 700 };
const COLOR = { conformal: k(0), quantile: k(2), bootstrap: k(3) };
const NAME = {
  conformal: () => tr('Split conformal', 'Split conformal'),
  quantile: () => tr('Quantile regression', 'Quantile regression'),
  bootstrap: () => tr('Bootstrap ensemble', 'Bootstrap ensemble'),
};

let cached = null;
function state() {
  if (!cached) {
    const scn = generatedScenario({ seed: 41, noise: 'growing' });
    const fitted = fitScenario(scn);
    const methods = intervalMethods(fitted, { alpha: 0.1, calSize: 100 });
    cached = { scn, methods, sweep: sweepShift(methods, scn) };
  }
  return cached;
}

// ---- Figure 1: how the test inputs leave the training inputs as the shift grows. ----
function shiftSetup() {
  const { scn } = state();
  const left = 150, right = 610, lo = -1.5, hi = 3.2;
  const X = v => left + (v - lo) / (hi - lo) * (right - left);
  const x0 = Math.min(...scn.train.x), x1 = Math.max(...scn.train.x);
  const rows = [0, 0.4, 1];
  const top = 40, step = 66;
  const band = rows.map((s, i) => {
    const y = top + i * step, delta = scn.shiftBy(s), test = scn.testAt(s);
    const inside = insideShare(scn.train.x, test.x);
    const a = Math.min(...test.x), b = Math.max(...test.x);
    return `${text(left - 14, y + 26, tr(`Shift ${pct(s, 0)}`, `Shift ${pct(s, 0)}`), { anchor: 'end', ...bold, size: 14 })}
${text(left - 14, y + 44, tr(`moves ${fmt(delta, { digits: 2 })}`, `bergeser ${fmt(delta, { digits: 2 })}`), { anchor: 'end', size: 12 })}
<rect x="${X(x0).toFixed(1)}" y="${y}" width="${(X(x1) - X(x0)).toFixed(1)}" height="22" rx="4" fill="${soft(0)}" stroke="${k(0)}" stroke-width="1.6"/>
<rect x="${X(a).toFixed(1)}" y="${y + 28}" width="${(X(b) - X(a)).toFixed(1)}" height="22" rx="4" fill="${soft(1)}" stroke="${k(1)}" stroke-width="1.6"/>
${text(X(b) + 8 > right - 120 ? X(a) - 8 : X(b) + 8, y + 44, tr(`${pct(inside, 1)} inside the range`, `${pct(inside, 1)} di dalam rentang`), { anchor: X(b) + 8 > right - 120 ? 'end' : 'start', ...ink, size: 12 })}`;
  }).join('');
  const axisY = top + 3 * step - 6;
  const ticks = [-1, 0, 1, 2, 3].map(t => `${line(X(t), axisY, X(t), axisY + 5, { c: 'var(--muted)', w: 1.5 })}${text(X(t), axisY + 20, fmt(t), { size: 12 })}`).join('');
  const legend = `${box(left, 6, 16, 14, soft(0), k(0)).replace('rx="10"', 'rx="3"')}${text(left + 22, 18, tr('Training inputs', 'Input latih'), { anchor: 'start', ...ink, size: 12 })}
${box(left + 150, 6, 16, 14, soft(1), k(1)).replace('rx="10"', 'rx="3"')}${text(left + 172, 18, tr('Test inputs', 'Input uji'), { anchor: 'start', ...ink, size: 12 })}`;
  return svg(640, 276, `${legend}${band}${line(left, axisY, right, axisY, { c: 'var(--muted)', w: 1.5 })}${ticks}${text((left + right) / 2, axisY + 40, tr('Input x', 'Input x'), { size: 13 })}`);
}

// ---- Figure 2: coverage of the three methods as the shift grows (the lab's own chart). ----
function coverageSweep() {
  const { sweep } = state();
  const L = 64, R = 500, T = 16, B = 228;
  const X = s => L + s * (R - L), Y = v => B - v * (B - T);
  const grid = [0, 0.25, 0.5, 0.75, 1].map(v => `${line(L, Y(v), R, Y(v), { c: 'var(--line)', w: 1 })}${text(L - 8, Y(v) + 4, pct(v, 0), { anchor: 'end', size: 12 })}`).join('');
  const xt = [0, 0.25, 0.5, 0.75, 1].map(s => `${text(X(s), B + 18, pct(s, 0), { size: 12 })}`).join('');
  const target = `${line(L, Y(0.9), R, Y(0.9), { c: 'var(--ink)', w: 1.8, dash: '6 5' })}${text(R + 8, Y(0.9) - 4, tr('Target', 'Target'), { anchor: 'start', ...bold, size: 12 })}${text(R + 8, Y(0.9) + 10, pct(0.9, 0), { anchor: 'start', ...bold, size: 12 })}`;
  const lines = METHODS.map(m => {
    const pts = sweep.map((r, i) => `${X(SWEEP[i]).toFixed(1)},${Y(r.coverage[m]).toFixed(1)}`).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${COLOR[m]}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
  }).join('');
  const at = 8; // the 40% mark, the lab's default shift
  const mark = `${line(X(SWEEP[at]), T, X(SWEEP[at]), B, { c: 'var(--muted)', w: 1.5, dash: '3 4' })}${text(X(SWEEP[at]) + 6, B - 8, tr('Lab default', 'Bawaan lab'), { anchor: 'start', size: 12 })}`;
  const ends = METHODS.map(m => {
    const r0 = sweep[0].coverage[m];
    return `${dot(X(0), Y(r0), COLOR[m], 4.5)}`;
  }).join('');
  const legend = METHODS.map((m, i) => `${line(84 + i * 150 - 40, 276, 84 + i * 150 - 20, 276, { c: COLOR[m], w: 3 })}${text(84 + i * 150 - 14, 280, NAME[m](), { anchor: 'start', ...ink, size: 12 })}`).join('');
  const axes = `${text(L + (R - L) / 2, B + 36, tr('Shift severity (%)', 'Tingkat shift (%)'), { size: 13 })}<g transform="translate(14 ${(T + B) / 2}) rotate(-90)">${text(0, 0, tr('Coverage on the test set (%)', 'Coverage pada test set (%)'), { size: 13 })}</g>`;
  return svg(640, 292, `${grid}${xt}${target}${mark}${lines}${ends}${axes}${legend}`);
}

// ---- Figure 3: the three bands at four inputs, and the interval a perfect method would give there. ----
function bandsAtInputs() {
  const { scn, methods } = state();
  const xs = [-0.8, 0.8, 1.4, 1.8];
  const L = 70, T = 30, B = 322, lo = -11.8, hi = 3.2;
  const Y = v => B - (v - lo) / (hi - lo) * (B - T);
  const slotW = 138, barW = 14;
  const z = 1.645;
  const grid = [-10, -5, 0].map(v => `${line(L, Y(v), L + slotW * xs.length, Y(v), { c: 'var(--line)', w: 1 })}${text(L - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const series = [
    ['ideal', () => tr('Ideal 90% range', 'Rentang 90% ideal'), 'var(--ink)'],
    ['conformal', NAME.conformal, COLOR.conformal],
    ['quantile', NAME.quantile, COLOR.quantile],
    ['bootstrap', NAME.bootstrap, COLOR.bootstrap],
  ];
  const groups = xs.map((x, gi) => {
    const cx = L + slotW * gi + slotW / 2;
    const mu = scn.trueCurve(x), sig = scn.trueSigma(x);
    const ivs = {
      ideal: { lo: mu - z * sig, hi: mu + z * sig },
      conformal: methods.conformal.predict(x), quantile: methods.quantile.predict(x), bootstrap: methods.bootstrap.predict(x),
    };
    const bars = series.map(([key, , color], i) => {
      const bx = cx + (i - 1.5) * (barW + 6);
      const iv = ivs[key], y1 = Y(iv.hi), h = Math.max(3, Y(iv.lo) - y1);
      return key === 'ideal'
        ? `<rect x="${(bx - barW / 2).toFixed(1)}" y="${y1.toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" rx="3" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="4 3"/>`
        : `<rect x="${(bx - barW / 2).toFixed(1)}" y="${y1.toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" rx="3" fill="${color}" opacity="0.85"/>`;
    }).join('');
    const inside = x >= Math.min(...scn.train.x) && x <= Math.max(...scn.train.x);
    const truth = `${line(cx - slotW / 2 + 8, Y(mu), cx + slotW / 2 - 8, Y(mu), { c: 'var(--muted)', w: 1.4, dash: '2 3' })}`;
    return `${truth}${bars}${text(cx, B + 18, `x = ${fmt(x, { digits: 1 })}`, { ...bold, size: 13 })}${text(cx, B + 34, inside ? tr('inside training range', 'di dalam rentang') : tr('outside it', 'di luar rentang'), { size: 12 })}`;
  }).join('');
  const sep = [1, 2, 3].map(i => line(L + slotW * i, T - 8, L + slotW * i, B + 4, { c: 'var(--line)', w: 1 })).join('');
  const legend = series.map(([key, label, color], i) => {
    const lx = 70 + (i % 2) * 250, ly = B + 58 + Math.floor(i / 2) * 20;
    return `${key === 'ideal' ? `<rect x="${lx}" y="${ly - 9}" width="12" height="12" rx="2" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="3 2"/>` : `<rect x="${lx}" y="${ly - 9}" width="12" height="12" rx="2" fill="${color}" opacity="0.85"/>`}${text(lx + 18, ly + 2, label(), { anchor: 'start', ...ink, size: 12 })}`;
  }).join('');
  const note = `${line(L + 2, 14, L + 22, 14, { c: 'var(--muted)', w: 1.4, dash: '2 3' })}${text(L + 28, 18, tr('true curve at that x', 'kurva sebenarnya di x itu'), { anchor: 'start', size: 12 })}`;
  const yTitle = `<g transform="translate(14 ${(T + B) / 2}) rotate(-90)">${text(0, 0, tr('Output y', 'Output y'), { size: 13 })}</g>`;
  return svg(640, 410, `${grid}${sep}${groups}${note}${yTitle}${legend}`);
}

// ---- Figure 4: coverage of split conformal, no shift against full shift, for each held-out species. ----
// Constants from the lab (Penguins (real), seed 41, 40 calibration points, alpha 0.1). The last number is the
// share of the species' test flippers that fall inside the range of the training flippers.
const SPECIES = [
  ['Adelie', 0.933, 0.85, 0.7],
  ['Chinstrap', 0.883, 0.917, 1],
  ['Gentoo', 0.983, 0.567, 0.217],
];
function speciesCoverage() {
  const L = 64, R = 620, T = 22, B = 214;
  const Y = v => B - v * (B - T);
  const slot = (R - L) / SPECIES.length, bw = 54;
  const grid = [0, 0.5, 1].map(v => `${line(L, Y(v), R, Y(v), { c: 'var(--line)', w: 1 })}${text(L - 8, Y(v) + 4, pct(v, 0), { anchor: 'end', size: 12 })}`).join('');
  const groups = SPECIES.map(([name, c0, c1, inside], i) => {
    const cx = L + slot * (i + 0.5);
    const bar = (x, v, color, op) => `<rect x="${(x - bw / 2).toFixed(1)}" y="${Y(v).toFixed(1)}" width="${bw}" height="${(B - Y(v)).toFixed(1)}" rx="3" fill="${color}" opacity="${op}"/>${text(x, Y(v) - 6, pct(v, 1), { ...bold, size: 12 }).replace('<text ', '<text stroke="var(--surface)" stroke-width="4" paint-order="stroke" ')}`;
    return `${bar(cx - bw / 2 - 4, c0, k(0), 0.45)}${bar(cx + bw / 2 + 4, c1, k(0), 1)}${text(cx, B + 18, name, { ...bold, size: 13 })}${text(cx, B + 34, tr(`${pct(inside, 1)} inside the range`, `${pct(inside, 1)} di dalam rentang`), { size: 12 })}`;
  }).join('');
  const target = `${line(L, Y(0.9), R, Y(0.9), { c: 'var(--ink)', w: 1.8, dash: '6 5' })}${text(R, Y(0.9) - 6, tr('Target 90%', 'Target 90%'), { anchor: 'end', ...bold, size: 12 })}`;
  const legend = `<rect x="${L}" y="254" width="12" height="12" rx="2" fill="${k(0)}" opacity="0.45"/>${text(L + 18, 265, tr('Shift 0%', 'Shift 0%'), { anchor: 'start', ...ink, size: 12 })}
<rect x="${L + 110}" y="254" width="12" height="12" rx="2" fill="${k(0)}"/>${text(L + 128, 265, tr('Shift 100% (all test penguins from the held-out species)', 'Shift 100% (semua penguin uji dari spesies yang ditahan)'), { anchor: 'start', ...ink, size: 12 })}`;
  const yTitle = `<g transform="translate(14 ${(T + B) / 2}) rotate(-90)">${text(0, 0, tr('Split conformal coverage', 'Coverage split conformal'), { size: 13 })}</g>`;
  return svg(640, 280, `${grid}${target}${groups}${yTitle}${legend}`);
}

export const figures = {
  'shift-setup': shiftSetup,
  'coverage-sweep': coverageSweep,
  'bands-at-inputs': bandsAtInputs,
  'species-coverage': speciesCoverage,
};
