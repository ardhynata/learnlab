// Figures for the lesson "Bias, variance and shrinkage". Every number on screen is computed here with
// the same ridge fit (polynomial basis on x rescaled to -1..1, intercept not penalized) that the lesson
// text quotes, on the pattern and the 10 + 5 point sample of "Underfitting and overfitting".
import { svg, dot, cross, text, line, box, k, tr, fmt } from '../kit.js';
import { solve, mean, mse } from '../../sims/ml/regression.js';
import { rng, gauss } from '../../sims/ml/rng.js';

const ink = { weight: 700, fill: 'var(--ink)' };
const truth = x => 5 + 2.2 * Math.sin(x / 1.6);
const TRAIN = { x: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5], y: [6.2, 6.2, 7.6, 6.5, 6.3, 3.9, 3.5, 2.2, 3.7, 4.0] };
const VALID = { x: [1, 3, 5, 7, 9], y: [5.6, 7.7, 4.4, 3.6, 3.1] };

// Ridge polynomial fit: lambda = 0 is the plain least-squares fit (a tiny 1e-10 keeps the system solvable).
function ridgeFit(xs, ys, degree, lambda) {
  const cx = mean(xs), sx = Math.max(...xs.map(x => Math.abs(x - cx))) || 1;
  const t = xs.map(x => (x - cx) / sx), m = degree + 1;
  const A = Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => t.reduce((s, v) => s + v ** (i + j), 0)));
  const b = Array.from({ length: m }, (_, i) => t.reduce((s, v, q) => s + v ** i * ys[q], 0));
  for (let i = 0; i < m; i++) A[i][i] += (i ? lambda : 0) + 1e-10;
  const coef = solve(A, b);
  return { coef, predict: x => { const v = (x - cx) / sx; return coef.reduce((s, c, i) => s + c * v ** i, 0); } };
}
const clampPx = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pathOf = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${clampPx(p[1], -1e5, 1e5).toFixed(1)}`).join('');
const curve = (d, c, w, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" ${extra}/>`;
const fm = (v, n = 2) => fmt(v, { digits: n });

// Bias squared and variance of one model over 400 fresh samples (same x positions, new noise), measured
// at 91 points from 0.5 to 9.5, plus the first few fits for drawing.
const GRID = Array.from({ length: 91 }, (_, i) => 0.5 + i * 0.1);
function crowd(degree, lambda, keep = 15, reps = 400) {
  const preds = [], fits = [];
  for (let r = 0; r < reps; r++) {
    const R = rng(5000 + r);
    const f = ridgeFit(TRAIN.x, TRAIN.x.map(x => truth(x) + 0.5 * gauss(R)), degree, lambda);
    preds.push(GRID.map(f.predict));
    if (r < keep) fits.push(f);
  }
  const avg = GRID.map((_, j) => mean(preds.map(p => p[j])));
  const bias2 = mean(avg.map((a, j) => (a - truth(GRID[j])) ** 2));
  const variance = mean(GRID.map((_, j) => mean(preds.map(p => (p[j] - avg[j]) ** 2))));
  return { avg, fits, bias2, variance };
}

// Three panels: many fits of degree 1, 3 and 9, the average fit, and the true pattern.
function crowdOfFits() {
  const top = 34, size = 170, pw = 210;
  const panels = [
    [1, tr('Degree 1', 'Derajat 1'), tr('high bias: misses the same way', 'bias tinggi: meleset ke arah yang sama'), 4],
    [3, tr('Degree 3', 'Derajat 3'), tr('both parts are small', 'kedua bagian kecil'), 2],
    [9, tr('Degree 9', 'Derajat 9'), tr('high variance: every fit differs', 'varians tinggi: tiap fit berbeda'), 3]];
  const body = panels.map(([d, title, note, color], i) => {
    const ox = 10 + i * 226, X = x => ox + 8 + x / 10 * (pw - 16), Y = y => top + size - 8 - y * 17;
    const c = crowd(d, 0);
    const truthD = pathOf(GRID.map(g => [X(g), Y(truth(g))]));
    const avgD = pathOf(GRID.map((g, j) => [X(g), Y(c.avg[j])]));
    const fits = c.fits.map(f => curve(pathOf(Array.from({ length: 91 }, (_, s) => { const x = 0.5 + s * 0.1; return [X(x), Y(f.predict(x))]; })), k(color), 1.4, 'opacity="0.3"')).join('');
    return `<g>${box(ox, top, pw, size)}
${text(ox + pw / 2, 22, title, ink)}
<clipPath id="cf-clip-${d}"><rect x="${ox + 2}" y="${top + 2}" width="${pw - 4}" height="${size - 4}" rx="8"/></clipPath>
<g clip-path="url(#cf-clip-${d})">${fits}${curve(truthD, 'var(--muted)', 1.8, 'stroke-dasharray="4 4"')}${curve(avgD, k(color), 3.6)}</g>
${text(ox + pw / 2, top + size + 20, note, { size: 12.5 })}
${text(ox + pw / 2, top + size + 40, `${tr('bias squared', 'bias kuadrat')} ${fm(c.bias2)}`, { size: 12.5, fill: 'var(--ink)', weight: 700 })}
${text(ox + pw / 2, top + size + 58, `${tr('variance', 'varians')} ${fm(c.variance)}`, { size: 12.5, fill: 'var(--ink)', weight: 700 })}</g>`;
  }).join('');
  return svg(680, 292, `${body}
<path d="M120 280h26" stroke="var(--ink)" stroke-width="3.4"/>${text(154, 284, tr('average of 400 fits', 'rata-rata 400 fit'), { anchor: 'start', size: 12 })}
<path d="M300 280h26" stroke="var(--muted)" stroke-width="1.6" opacity="0.6"/>${text(334, 284, tr('single fits', 'fit tunggal'), { anchor: 'start', size: 12 })}
<path d="M440 280h26" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="4 4"/>${text(474, 284, tr('true pattern', 'pola sebenarnya'), { anchor: 'start', size: 12 })}`);
}

// One coefficient: loss(w) = 65 - 60w + 14w^2 (the three points of the lesson), plus lambda * w^2 with lambda = 4.
function penaltyByHand() {
  const lambda = 4, left = 64, right = 620, bottom = 232, top = 28, wMax = 3, yMax = 70;
  const sse = w => 65 - 60 * w + 14 * w * w, pen = w => lambda * w * w, tot = w => sse(w) + pen(w);
  const X = w => left + w / wMax * (right - left), Y = v => bottom - v / yMax * (bottom - top);
  const trace = f => pathOf(Array.from({ length: 121 }, (_, i) => { const w = i / 40; return [X(w), Y(f(w))]; }));
  const w0 = 30 / 14, w1 = 30 / (14 + lambda);
  const mark = (w, f, c, label, dy, anchor, dx) => `${line(X(w), Y(f(w)), X(w), bottom, { c, w: 1.6, dash: '4 4' })}<path d="M${X(w)} ${Y(f(w)) - 9}l9 9-9 9-9-9z" fill="${c}" stroke="var(--ink)" stroke-width="2"/>${text(X(w) + dx, bottom + dy, label, { anchor, size: 12.5, fill: 'var(--ink)', weight: 700 })}`;
  return svg(640, 304, `${box(left - 8, top - 10, right - left + 20, bottom - top + 16)}
<clipPath id="pbh-clip"><rect x="${left - 6}" y="${top - 8}" width="${right - left + 16}" height="${bottom - top + 12}" rx="8"/></clipPath>
<g clip-path="url(#pbh-clip)">${curve(trace(pen), k(3), 3)}${curve(trace(sse), k(0), 3)}${curve(trace(tot), 'var(--ink)', 3.4)}</g>
${[0, 1, 2, 3].map(w => text(X(w), bottom + 36, fmt(w), { size: 12 })).join('')}
${text((left + right) / 2, bottom + 54, tr('coefficient w', 'koefisien w'), { size: 13 })}
${[0, 20, 40, 60].map(v => text(left - 14, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })).join('')}
<text transform="translate(14 ${(top + bottom) / 2}) rotate(-90)" text-anchor="middle" font-size="13" font-weight="500" fill="var(--muted)">${tr('loss', 'loss')}</text>
${mark(w0, sse, k(0), `${tr('no penalty', 'tanpa penalti')}: w = ${fm(w0)}`, 16, 'start', -20)}
${mark(w1, tot, 'var(--ink)', `${tr('with penalty', 'dengan penalti')}: w = ${fm(w1)}`, 16, 'end', 20)}
<path d="M${left + 340} 40h24" stroke="${k(0)}" stroke-width="3"/>${text(left + 372, 44, tr('fit loss', 'fit loss'), { anchor: 'start', size: 12.5 })}
<path d="M${left + 340} 60h24" stroke="${k(3)}" stroke-width="3"/>${text(left + 372, 64, tr(`penalty ${fmt(lambda)} × w²`, `penalti ${fmt(lambda)} × w²`), { anchor: 'start', size: 12.5 })}
<path d="M${left + 340} 80h24" stroke="var(--ink)" stroke-width="3.4"/>${text(left + 372, 84, tr('fit loss + penalty', 'fit loss + penalti'), { anchor: 'start', size: 12.5 })}`);
}

// The same degree 9 fit of the lesson sample with three penalty strengths.
function ridgeFits() {
  const top = 34, size = 170, pw = 210;
  const panels = [
    [0, tr('No penalty', 'Tanpa penalti'), tr('wild between the dots', 'liar di antara titik'), 3],
    [0.03, tr('Moderate penalty', 'Penalti sedang'), tr('follows the pattern', 'mengikuti pola'), 2],
    [10, tr('Very large penalty', 'Penalti sangat besar'), tr('almost flat: too stiff', 'nyaris datar: terlalu kaku'), 4]];
  const body = panels.map(([lambda, title, note, color], i) => {
    const ox = 10 + i * 226, X = x => ox + 8 + x / 10 * (pw - 16), Y = y => top + size - 8 - y * 17;
    const f = ridgeFit(TRAIN.x, TRAIN.y, 9, lambda);
    const trainErr = mse(TRAIN.y, TRAIN.x.map(f.predict)), validErr = mse(VALID.y, VALID.x.map(f.predict));
    const truthD = pathOf(Array.from({ length: 81 }, (_, s) => [X(s / 8), Y(truth(s / 8))]));
    const fitD = pathOf(Array.from({ length: 121 }, (_, s) => [X(s / 12), Y(f.predict(s / 12))]));
    return `<g>${box(ox, top, pw, size)}
${text(ox + pw / 2, 22, `${title} (λ = ${fmt(lambda)})`, ink)}
<clipPath id="rf-clip-${i}"><rect x="${ox + 2}" y="${top + 2}" width="${pw - 4}" height="${size - 4}" rx="8"/></clipPath>
<g clip-path="url(#rf-clip-${i})">${curve(truthD, 'var(--muted)', 1.6, 'stroke-dasharray="4 4" opacity="0.7"')}${curve(fitD, k(color), 3.4)}</g>
${TRAIN.x.map((x, j) => dot(X(x), Y(TRAIN.y[j]), k(0), 4.2)).join('')}${VALID.x.map((x, j) => cross(X(x), Y(VALID.y[j]), k(1))).join('')}
${text(ox + pw / 2, top + size + 20, note, { size: 12.5 })}
${text(ox + pw / 2, top + size + 40, `${tr('training error', 'galat training')} ${fm(trainErr)}`, { size: 12.5, fill: k(0), weight: 700 })}
${text(ox + pw / 2, top + size + 58, `${tr('validation error', 'galat validation')} ${fm(validErr)}`, { size: 12.5, fill: k(1), weight: 700 })}</g>`;
  }).join('');
  return svg(680, 290, `${body}
${dot(212, 278, k(0), 4.2)}${text(222, 282, tr('training point', 'titik training'), { anchor: 'start', size: 12 })}${cross(344, 278, k(1))}${text(356, 282, tr('validation point', 'titik validation'), { anchor: 'start', size: 12 })}<path d="M470 278h26" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="4 4"/>${text(504, 282, tr('true pattern', 'pola sebenarnya'), { anchor: 'start', size: 12 })}`);
}

// Median errors over 41 samples of each size, against a fresh set of 400 points (noise sd 0.5).
const SIZES = [10, 15, 20, 30, 50, 80, 120];
function learningCurve(degree, lambda) {
  const med = a => [...a].sort((p, q) => p - q)[a.length >> 1];
  return SIZES.map(n => {
    const T = [], V = [];
    for (let r = 0; r < 41; r++) {
      const R = rng(1000 + r * 97 + n);
      const xs = Array.from({ length: n }, () => R() * 10), ys = xs.map(x => truth(x) + 0.5 * gauss(R));
      const vx = Array.from({ length: 400 }, () => R() * 10), vy = vx.map(x => truth(x) + 0.5 * gauss(R));
      const f = ridgeFit(xs, ys, degree, lambda);
      T.push(mse(ys, xs.map(f.predict))); V.push(mse(vy, vx.map(f.predict)));
    }
    return { n, train: med(T), valid: med(V) };
  });
}

function learningCurves() {
  const cap = 1.6, top = 54, bottom = 196, pw = 214;
  const Y = e => bottom - Math.min(e, cap) / cap * (bottom - top);
  const panel = (ox, degree, lambda, title) => {
    const rows = learningCurve(degree, lambda), X = i => ox + 40 + i * (pw - 54) / (rows.length - 1);
    const series = (key, c) => {
      let d = '', arrow = '';
      rows.forEach((r, i) => {
        if (r[key] <= cap) { d += `${d ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(r[key]).toFixed(1)}`; return; }
        if (i && rows[i - 1][key] <= cap) { const t = (cap - rows[i - 1][key]) / (r[key] - rows[i - 1][key]); d += `L${(X(i - 1) + t * (X(i) - X(i - 1))).toFixed(1)} ${top}`; }
        else if (!i) { d += `M${X(i).toFixed(1)} ${top}`; arrow = line(X(i), top + 18, X(i), top - 4, { c, w: 3, arrow: true }) + text(X(i) + 8, top + 6, `${fm(r[key])} ↑`, { anchor: 'start', size: 12, fill: c, weight: 700 }); }
      });
      const dots = rows.map((r, i) => (r[key] <= cap ? dot(X(i), Y(r[key]), c, 3.6) : '')).join('');
      return `<path d="${d}" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>${arrow}${dots}`;
    };
    return `${box(ox, 28, pw, 214)}${text(ox + pw / 2, 20, title, ink)}
${line(ox + 34, bottom, ox + pw - 8, bottom, { c: 'var(--muted)', w: 1.4 })}${line(ox + 34, bottom, ox + 34, top - 12, { c: 'var(--muted)', w: 1.4 })}
${[0, 0.5, 1, 1.5].map(v => text(ox + 28, Y(v) + 4, fmt(v, { digits: v % 1 ? 1 : 0 }), { anchor: 'end', size: 11.5 })).join('')}
${[10, 50, 120].map(n => text(X(SIZES.indexOf(n)), bottom + 16, fmt(n), { size: 11.5 })).join('')}
${text(ox + pw / 2 + 14, bottom + 32, tr('training points', 'titik training'), { size: 12 })}
${line(ox + 34, Y(0.25), ox + pw - 8, Y(0.25), { c: 'var(--muted)', w: 1.4, dash: '4 4' })}
${series('valid', k(1))}${series('train', k(0))}`;
  };
  return svg(680, 268, `${panel(6, 1, 0, tr('Degree 1: too rigid', 'Derajat 1: terlalu kaku'))}${panel(232, 6, 0, tr('Degree 6, no penalty', 'Derajat 6, tanpa penalti'))}${panel(458, 6, 0.01, tr('Degree 6, λ = 0.01', 'Derajat 6, λ = 0,01'))}
${dot(180, 258, k(0), 4)}${text(190, 262, tr('training error', 'galat training'), { anchor: 'start', size: 12 })}${dot(310, 258, k(1), 4)}${text(320, 262, tr('validation error', 'galat validation'), { anchor: 'start', size: 12 })}<path d="M446 258h24" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="4 4"/>${text(478, 262, tr(`noise floor ${fmt(0.25)}`, `batas noise ${fmt(0.25)}`), { anchor: 'start', size: 12 })}`);
}

export const figures = { 'crowd-of-fits': crowdOfFits, 'penalty-by-hand': penaltyByHand, 'ridge-fits': ridgeFits, 'learning-curves': learningCurves };
