// Figures for the lesson "Aleatoric and epistemic uncertainty". The running example is a made-up delivery
// service: a delivery takes 10 + 3 x minutes for a trip of x km, plus noise. Every number the figures show is
// computed here from the same inputs as the lesson text:
//  - figure 1: the standard error of a fitted line at 6 km, 4 sqrt(1.0248 / n), for trips spread evenly over
//    1 to 12 km with a noise standard deviation of 4 minutes;
//  - figure 2: 14 seeded trips (seed 19) and five bootstrap fits of a straight line;
//  - figure 3: the pinball loss (tau = 0.9) of five delivery times 22, 25, 27, 31 and 45;
//  - figure 4: 70 seeded trips whose noise standard deviation is 1 + 0.5 x minutes.
import { svg, dot, text, line, k, soft, tr, fmt } from '../kit.js';
import { rng, gauss } from '../../sims/ml/rng.js';
import { linearFit } from '../../sims/ml/regression.js';

const ink = { weight: 700, fill: 'var(--ink)' };
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const sdev = xs => Math.sqrt(mean(xs.map(v => (v - mean(xs)) ** 2)));
const path = (pts, c, w = 2.6, extra = '') => `<path d="M${pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
const z80 = 1.2816;

// ---- Figure 1: the epistemic wobble shrinks with data, the aleatoric spread does not. ----
const NOISE = 4;
const WOBBLE = n => NOISE * Math.sqrt((1 + 0.25 / (121 / 12)) / n);
function shrinkVsFloor() {
  const W = 640, H = 300, left = 64, right = 24, top = 40, base = 236;
  const sizes = [5, 20, 80, 320];
  const X = i => left + 44 + i * ((W - left - right - 88) / 3);
  const Y = v => base - v / 4.5 * (base - top);
  const grid = [0, 1, 2, 3, 4].map(v => `${line(left, Y(v), W - right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const xs = sizes.map((n, i) => `${line(X(i), base, X(i), base + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(i), base + 22, fmt(n), { size: 12 })}`).join('');
  const epi = sizes.map((n, i) => [X(i), Y(WOBBLE(n))]);
  const labels = sizes.map((n, i) => text(X(i), Y(WOBBLE(n)) - 12, fmt(WOBBLE(n), { digits: 2 }), { size: 12, ...ink })).join('');
  const aleaDots = sizes.map((n, i) => dot(X(i), Y(NOISE), k(1), 5.5)).join('');
  return svg(W, H, `${text(left - 8, 22, tr('minutes', 'menit'), { anchor: 'start', ...ink, size: 13 })}
${grid}${line(left, base, W - right, base, { c: 'var(--muted)', w: 1.6 })}${xs}
${line(X(0), Y(NOISE), X(3), Y(NOISE), { c: k(1), w: 2.6 })}${aleaDots}
${text(X(3) + 4, Y(NOISE) - 12, tr('Aleatoric: spread of single deliveries, 4.0 whatever n is', 'Aleatoric: sebaran satu pengantaran, 4,0 berapa pun n'), { anchor: 'end', size: 13, fill: k(1), weight: 700 })}
${path(epi, k(0))}${epi.map(p => dot(p[0], p[1], k(0), 6)).join('')}${labels}
${text(X(3) + 4, Y(2.1), tr('Epistemic: wobble of the fitted line at 6 km', 'Epistemic: goyangan garis hasil fit di 6 km'), { anchor: 'end', size: 13, fill: k(0), weight: 700 })}
${text(X(3) + 4, Y(1.7), tr('halves every time n is multiplied by 4', 'menjadi setengah setiap n dikalikan 4'), { anchor: 'end', size: 12 })}
${text((left + W - right) / 2, H - 12, tr('number of training deliveries (n)', 'jumlah pengantaran dalam data latih (n)'), { ...ink, size: 13 })}`);
}

// ---- Figure 2: five models fitted to bootstrap samples disagree where the data ends. ----
function ensembleData() {
  const r0 = rng(19), pts = [];
  for (let i = 0; i < 14; i++) { const x = 1 + 7 * r0(); pts.push({ x, y: 10 + 3 * x + NOISE * gauss(r0) }); }
  const r = rng(119), fits = [];
  for (let m = 0; m < 5; m++) {
    const s = [];
    for (let i = 0; i < pts.length; i++) s.push(pts[Math.floor(r() * pts.length)]);
    fits.push(linearFit(s.map(p => p.x), s.map(p => p.y)));
  }
  return { pts, fits };
}
function ensemble() {
  const { pts, fits } = ensembleData();
  const W = 640, H = 334, left = 52, right = 20, top = 34, base = 272;
  const X = v => left + (v - 0) / 13 * (W - left - right);
  const Y = v => base - (v - 10) / 56 * (base - top);
  const at = x => fits.map(f => f.slope * x + f.intercept);
  const lines = fits.map(f => line(X(1), Y(f.slope + f.intercept), X(12.5), Y(f.slope * 12.5 + f.intercept), { c: k(0), w: 2.2 })).join('');
  const brace = (x, ys) => `${line(X(x), Y(Math.min(...ys)), X(x), Y(Math.max(...ys)), { c: k(1), w: 3 })}${line(X(x) - 6, Y(Math.min(...ys)), X(x) + 6, Y(Math.min(...ys)), { c: k(1), w: 2.4 })}${line(X(x) - 6, Y(Math.max(...ys)), X(x) + 6, Y(Math.max(...ys)), { c: k(1), w: 2.4 })}`;
  const xt = [0, 2, 4, 6, 8, 10, 12].map(v => `${line(X(v), base, X(v), base + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(v), base + 20, fmt(v), { size: 12 })}`).join('');
  const yt = [10, 20, 30, 40, 50, 60].map(v => `${line(left, Y(v), W - right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const a4 = at(4), a12 = at(12);
  return svg(W, H, `<rect x="${X(8)}" y="${top}" width="${W - right - X(8)}" height="${base - top}" fill="${soft(1)}" opacity="0.55"/>
${yt}${line(left, base, W - right, base, { c: 'var(--muted)', w: 1.6 })}${xt}
${text(left - 8, 20, tr('minutes', 'menit'), { anchor: 'start', ...ink, size: 13 })}
${text(X(8) + 10, top + 18, tr('no training deliveries beyond 8 km', 'tidak ada data latih di atas 8 km'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${line(X(1), Y(13), X(12.5), Y(47.5), { c: 'var(--ink)', w: 1.6, dash: '6 5' })}
<g opacity="0.8">${lines}</g>
${pts.map(p => dot(X(p.x), Y(p.y), 'var(--ink)', 4.5)).join('')}
${brace(4, a4)}${text(X(4) + 12, Y(13), tr(`models differ by ${fmt(sdev(a4), { digits: 1 })} (SD)`, `model berbeda ${fmt(sdev(a4), { digits: 1 })} (SD)`), { anchor: 'start', size: 12, fill: k(1), weight: 700 })}
${brace(12, a12)}${text(X(12.9), Y(22), tr(`models differ by ${fmt(sdev(a12), { digits: 1 })} (SD)`, `model berbeda ${fmt(sdev(a12), { digits: 1 })} (SD)`), { anchor: 'end', size: 12, fill: k(1), weight: 700 })}
${text((left + W - right) / 2, H - 20, tr('distance of the delivery (km)', 'jarak pengantaran (km)'), { ...ink, size: 13 })}
${text((left + W - right) / 2, H - 3, tr('dots: 14 training deliveries · solid: 5 models on bootstrap samples · dashed: true average', 'titik: 14 pengantaran latih · tebal: 5 model pada bootstrap sample · putus: rata-rata sebenarnya'), { size: 11 })}`);
}

// ---- Figure 3: the pinball loss for tau = 0.9 on five delivery times. ----
const TIMES = [22, 25, 27, 31, 45];
const pinball = (y, q, tau) => (y >= q ? tau * (y - q) : (1 - tau) * (q - y));
const meanPinball = (q, tau) => mean(TIMES.map(y => pinball(y, q, tau)));
function pinballCurve() {
  const W = 640, H = 310, left = 60, right = 24, top = 40, base = 236;
  const lo = 20, hi = 52;
  const X = v => left + (v - lo) / (hi - lo) * (W - left - right);
  const Y = v => base - v / 10 * (base - top);
  const curve = [];
  for (let q = lo; q <= hi + 1e-9; q += 0.5) curve.push([X(q), Y(meanPinball(q, 0.9))]);
  const marks = [[27, 'var(--muted)', 0, 'start'], [31, k(2), 1, 'start'], [45, k(0), 2, 'middle']];
  const pins = marks.map(([q, c, , anchor]) => `${line(X(q), Y(meanPinball(q, 0.9)), X(q), base, { c, w: 1.6, dash: '4 4' })}${dot(X(q), Y(meanPinball(q, 0.9)), c, 6.5)}${text(X(q) + (anchor === 'start' ? 10 : 0), Y(meanPinball(q, 0.9)) - (anchor === 'start' ? 6 : 14), `${tr('predict', 'prediksi')} ${fmt(q)}: ${fmt(meanPinball(q, 0.9), { digits: 1 })}`, { anchor, size: 12, ...ink })}`).join('');
  const xt = [20, 25, 30, 35, 40, 45, 50].map(v => `${line(X(v), base, X(v), base + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(v), base + 20, fmt(v), { size: 12 })}`).join('');
  const yt = [0, 2, 4, 6, 8, 10].map(v => `${line(left, Y(v), W - right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  return svg(W, H, `${yt}${line(left, base, W - right, base, { c: 'var(--muted)', w: 1.6 })}${xt}
${text(left - 8, 22, tr('average pinball loss (minutes), tau = 0.9', 'rata-rata pinball loss (menit), tau = 0,9'), { anchor: 'start', ...ink, size: 13 })}
${path(curve, k(1), 2.8)}${pins}
${TIMES.map(y => dot(X(y), base, 'var(--ink)', 4.5)).join('')}
${text((left + W - right) / 2, H - 38, tr('the prediction we try (minutes); dots: the five delivery times', 'prediksi yang dicoba (menit); titik: kelima waktu pengantaran'), { ...ink, size: 13 })}
${text((left + W - right) / 2, H - 14, tr('the lowest point of the curve is the 90th percentile of the five times: 45', 'titik terendah kurva adalah persentil ke-90 dari kelima waktu: 45'), { size: 12 })}`);
}

// ---- Figure 4: noise that grows with distance; one band for all versus quantile bands. ----
const SIGMA = x => 1 + 0.5 * x;
const POOLED = 4.54; // the root mean square of SIGMA over 1 to 12 km
function heteroscedastic() {
  const r = rng(8), pts = [];
  for (let i = 0; i < 70; i++) { const x = 1 + 11 * r(); pts.push({ x, y: 10 + 3 * x + SIGMA(x) * gauss(r) }); }
  const W = 640, H = 340, left = 52, right = 20, top = 36, base = 280;
  const X = v => left + (v - 0) / 13 * (W - left - right);
  const Y = v => base - (v - 0) / 80 * (base - top);
  const mid = x => 10 + 3 * x;
  const qHalf = x => z80 * SIGMA(x), cHalf = () => z80 * POOLED;
  const shape = (half) => `M${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => { const x = 1 + i; return `${X(x).toFixed(1)} ${Y(mid(x) + half(x)).toFixed(1)}`; }).join('L')}L${X(12).toFixed(1)} ${Y(mid(12) + half(12)).toFixed(1)}L${X(12).toFixed(1)} ${Y(mid(12) - half(12)).toFixed(1)}L${[11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(x => `${X(x).toFixed(1)} ${Y(mid(x) - half(x)).toFixed(1)}`).join('L')}L${X(1).toFixed(1)} ${Y(mid(1) - half(1)).toFixed(1)}Z`;
  const xt = [0, 2, 4, 6, 8, 10, 12].map(v => `${line(X(v), base, X(v), base + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(v), base + 20, fmt(v), { size: 12 })}`).join('');
  const yt = [0, 20, 40, 60, 80].map(v => `${line(left, Y(v), W - right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const cov = (x0, x1, half) => { const sel = pts.filter(p => p.x >= x0 && p.x <= x1); return { n: sel.length, inside: sel.filter(p => Math.abs(p.y - mid(p.x)) <= half(p.x)).length }; };
  const nearC = cov(1, 4, cHalf), farC = cov(9, 12, cHalf);
  return svg(W, H, `${yt}${line(left, base, W - right, base, { c: 'var(--muted)', w: 1.6 })}${xt}
${text(left - 8, 20, tr('minutes', 'menit'), { anchor: 'start', ...ink, size: 13 })}
<path d="${shape(qHalf)}" fill="${soft(0)}" stroke="${k(0)}" stroke-width="2.2"/>
<path d="${shape(cHalf)}" fill="none" stroke="${k(1)}" stroke-width="2.4" stroke-dasharray="7 5"/>
${line(X(1), Y(mid(1)), X(12), Y(mid(12)), { c: k(0), w: 1.8 })}
${pts.map(p => dot(X(p.x), Y(p.y), 'var(--ink)', 3.6)).join('')}
${text(X(1) + 6, Y(66), tr('Dashed: one band for every distance (same width everywhere)', 'Putus-putus: satu pita untuk semua jarak (sama lebar di mana-mana)'), { anchor: 'start', size: 12, fill: k(1), weight: 700 })}
${text(X(1) + 6, Y(59), tr('Filled: quantile band, the 10th to the 90th percentile at each distance', 'Berwarna: pita quantile, persentil ke-10 sampai ke-90 di tiap jarak'), { anchor: 'start', size: 12, fill: k(0), weight: 700 })}
${text(X(1) + 6, Y(48), tr(`1 to 4 km: ${fmt(nearC.inside)} of ${fmt(nearC.n)} dots inside the dashed band`, `1 sampai 4 km: ${fmt(nearC.inside)} dari ${fmt(nearC.n)} titik di dalam pita putus-putus`), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${text(X(12.2), Y(14), tr(`9 to 12 km: ${fmt(farC.inside)} of ${fmt(farC.n)} inside`, `9 sampai 12 km: ${fmt(farC.inside)} dari ${fmt(farC.n)} di dalam`), { anchor: 'end', size: 12, fill: 'var(--ink)' })}
${text((left + W - right) / 2, H - 14, tr('distance of the delivery (km)', 'jarak pengantaran (km)'), { ...ink, size: 13 })}`);
}

export const figures = {
  'shrink-vs-floor': shrinkVsFloor,
  'ensemble-disagreement': ensemble,
  'pinball-loss': pinballCurve,
  'fan-of-noise': heteroscedastic,
};
