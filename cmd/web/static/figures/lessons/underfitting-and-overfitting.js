// Figures for the lesson "Underfitting and overfitting". Every number on screen is computed here
// from the same least-squares fit the lab uses (polyFit), on the lesson's own invented sample, so the
// figures and the worked example in the text agree.
import { svg, dot, cross, text, line, box, k, soft, tr, fmt } from '../kit.js';
import { polyFit, mse, mean } from '../../sims/ml/regression.js';
import { rng, gauss } from '../../sims/ml/rng.js';

const ink = { weight: 700, fill: 'var(--ink)' };
const clampPx = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// SVG path through pixel points; y is clamped to the panel so a wild curve stays inside it.
const path = (pts, lo, hi) => `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${clampPx(p[1], lo, hi).toFixed(1)}`).join('')}" fill="none" stroke-linejoin="round"`;

// The lesson's sample: 10 training points and 5 validation points around y = 5 + 2.2 sin(x / 1.6), invented noise.
const truth = x => 5 + 2.2 * Math.sin(x / 1.6);
const TRAIN = { x: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5], y: [6.2, 6.2, 7.6, 6.5, 6.3, 3.9, 3.5, 2.2, 3.7, 4.0] };
const VALID = { x: [1, 3, 5, 7, 9], y: [5.6, 7.7, 4.4, 3.6, 3.1] };
const errorsOf = deg => {
  if (deg === 0) { const m = mean(TRAIN.y); return { fit: { predict: () => m }, train: mse(TRAIN.y, TRAIN.y.map(() => m)), valid: mse(VALID.y, VALID.y.map(() => m)) }; }
  const fit = polyFit(TRAIN.x, TRAIN.y, deg);
  return { fit, train: mse(TRAIN.y, TRAIN.x.map(fit.predict)), valid: mse(VALID.y, VALID.x.map(fit.predict)) };
};
const err = e => fmt(e, { digits: 2 });

// The same 10 training points fitted by degree 1, 3 and 9, with the 5 validation points as crosses.
function fitPanels() {
  const top = 34, size = 170, pw = 210;
  const panels = [
    [1, tr('Underfitting', 'Underfitting'), tr('too rigid: misses the bend', 'terlalu kaku, bengkoknya tak terikuti'), 4],
    [3, tr('About right', 'Sudah pas'), tr('follows the pattern, not the noise', 'mengikuti pola, bukan noise'), 2],
    [9, tr('Overfitting', 'Overfitting'), tr('passes through every dot', 'melewati setiap titik'), 3]];
  const body = panels.map(([d, title, note, color], i) => {
    const ox = 10 + i * 226, X = x => ox + 8 + x / 10 * (pw - 16), Y = y => top + size - 8 - y * 17;
    const e = errorsOf(d);
    const truthPts = Array.from({ length: 81 }, (_, s) => [X(s / 8), Y(truth(s / 8))]);
    const curve = Array.from({ length: 121 }, (_, s) => [X(s / 12), Y(e.fit.predict(s / 12))]);
    return `<g>${box(ox, top, pw, size)}
${text(ox + pw / 2, 22, `${title} (${tr(`degree ${d}`, `derajat ${d}`)})`, ink)}
${path(truthPts, top + 4, top + size - 4)} stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="4 4" opacity="0.7"/>
<clipPath id="fp-clip-${d}"><rect x="${ox + 2}" y="${top + 2}" width="${pw - 4}" height="${size - 4}" rx="8"/></clipPath>
<g clip-path="url(#fp-clip-${d})">${path(curve, -1e5, 1e5)} stroke="${k(color)}" stroke-width="3.4"/></g>
${TRAIN.x.map((x, j) => dot(X(x), Y(TRAIN.y[j]), k(0), 4.2)).join('')}${VALID.x.map((x, j) => cross(X(x), Y(VALID.y[j]), k(1))).join('')}
${text(ox + pw / 2, top + size + 20, note, { size: 12.5 })}
${text(ox + pw / 2, top + size + 40, tr(`training error ${err(e.train)}`, `training error ${err(e.train)}`), { size: 12.5, fill: k(0), weight: 700 })}
${text(ox + pw / 2, top + size + 58, tr(`validation error ${err(e.valid)}`, `validation error ${err(e.valid)}`), { size: 12.5, fill: k(1), weight: 700 })}</g>`;
  }).join('');
  return svg(680, 290, `${body}
${dot(212, 278, k(0), 4.2)}${text(222, 282, tr('training point', 'titik training'), { anchor: 'start', size: 12 })}${cross(344, 278, k(1))}${text(356, 282, tr('validation point', 'titik validasi'), { anchor: 'start', size: 12 })}<path d="M470 278h26" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="4 4"/>${text(504, 282, tr('true pattern', 'pola sebenarnya'), { anchor: 'start', size: 12 })}`);
}

// Training and validation error side by side for four models: the pair tells the story.
function errorPairs() {
  const cap = 4, left = 60, bottom = 196, top = 34, groupW = 138, barW = 44;
  const Y = e => bottom - Math.min(e, cap) / cap * (bottom - top);
  const models = [[0, tr('Mean only', 'Hanya rata-rata'), tr('baseline', 'baseline')], [1, tr('Degree 1', 'Derajat 1'), tr('underfits', 'underfit')], [3, tr('Degree 3', 'Derajat 3'), tr('about right', 'sudah pas')], [9, tr('Degree 9', 'Derajat 9'), tr('overfits', 'overfit')]];
  const bar = (x, e, c) => {
    const over = e > cap, y = Y(e);
    // A bar taller than the axis is cut with a slanted gap (an axis break) and labelled with its true value.
    const cut = over ? `<path d="M${x - 5} ${y + 24}L${x + barW + 5} ${y + 14}" stroke="var(--surface)" stroke-width="8" fill="none"/>` : '';
    return `<rect x="${x}" y="${y}" width="${barW}" height="${bottom - y}" rx="4" fill="${k(c)}"/>${cut}`
      + (over ? text(x + barW / 2, top - 14, tr(`${err(e)}, off the chart`, `${err(e)}, di luar grafik`), { size: 12.5, ...ink })
        : text(x + barW / 2, y - 6, err(e), { size: 12.5, ...ink }));
  };
  const groups = models.map(([d, name, verdict], i) => {
    const e = errorsOf(d), gx = left + 16 + i * groupW;
    return `${bar(gx, e.train, 0)}${bar(gx + barW + 6, e.valid, 1)}${text(gx + barW + 3, bottom + 20, name, ink)}${text(gx + barW + 3, bottom + 38, verdict, { size: 12.5 })}`;
  }).join('');
  return svg(640, 276, `
${line(left, bottom, 620, bottom, { c: 'var(--muted)', w: 1.6 })}${line(left, bottom, left, top - 14, { c: 'var(--muted)', w: 1.6, arrow: true })}
${[0, 1, 2, 3, 4].map(v => text(left - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })).join('')}
<text transform="translate(16 ${(top + bottom) / 2}) rotate(-90)" text-anchor="middle" font-size="13" font-weight="500" fill="var(--muted)">${tr('error', 'galat')}</text>
${groups}
<rect x="280" y="42" width="12" height="12" rx="2" fill="${k(0)}"/>${text(298, 52, tr('training error', 'training error'), { anchor: 'start', size: 12 })}
<rect x="280" y="62" width="12" height="12" rx="2" fill="${k(1)}"/>${text(298, 72, tr('validation error', 'validation error'), { anchor: 'start', size: 12 })}`);
}

// Median errors over 41 random samples of each size, against a fresh set of 400 points. Same truth, noise sd 0.5.
function learningCurves(degree) {
  const sizes = [10, 15, 20, 30, 50, 80, 120], reps = 41;
  const med = a => [...a].sort((p, q) => p - q)[a.length >> 1];
  return sizes.map(n => {
    const T = [], V = [];
    for (let r = 0; r < reps; r++) {
      const R = rng(1000 + r * 97 + n);
      const xs = Array.from({ length: n }, () => R() * 10), ys = xs.map(x => truth(x) + 0.5 * gauss(R));
      const vx = Array.from({ length: 400 }, () => R() * 10), vy = vx.map(x => truth(x) + 0.5 * gauss(R));
      const f = polyFit(xs, ys, degree);
      T.push(mse(ys, xs.map(f.predict))); V.push(mse(vy, vx.map(f.predict)));
    }
    return { n, train: med(T), valid: med(V) };
  });
}

function moreData() {
  const cap = 1.6, top = 54, bottom = 196, pw = 290;
  const Y = e => bottom - Math.min(e, cap) / cap * (bottom - top);
  const panel = (ox, degree, title) => {
    const rows = learningCurves(degree), X = i => ox + 52 + i * (pw - 70) / (rows.length - 1);
    const series = (key, c) => {
      let d = '', arrow = '';
      rows.forEach((r, i) => {
        if (r[key] <= cap) { d += `${d ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(r[key]).toFixed(1)}`; return; }
        if (i && rows[i - 1][key] <= cap) { const t = (cap - rows[i - 1][key]) / (r[key] - rows[i - 1][key]); d += `L${(X(i - 1) + t * (X(i) - X(i - 1))).toFixed(1)} ${top}`; }
        else if (!i) { d += `M${X(i).toFixed(1)} ${top}`; arrow = line(X(i), top + 18, X(i), top - 4, { c: c, w: 3, arrow: true }) + text(X(i) + 10, top + 8, tr(`${fmt(r[key], { digits: 2 })} (off the chart)`, `${fmt(r[key], { digits: 2 })} (di luar grafik)`), { anchor: 'start', size: 12, fill: c, weight: 700 }); }
      });
      const dots = rows.map((r, i) => (r[key] <= cap ? dot(X(i), Y(r[key]), c, 4) : '')).join('');
      return `<path d="${d}" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>${arrow}${dots}`;
    };
    return `${box(ox, 28, pw, 214)}${text(ox + pw / 2, 20, title, ink)}
${line(ox + 44, bottom, ox + pw - 8, bottom, { c: 'var(--muted)', w: 1.4 })}${line(ox + 44, bottom, ox + 44, top - 12, { c: 'var(--muted)', w: 1.4 })}
${[0, 0.5, 1, 1.5].map(v => text(ox + 38, Y(v) + 4, fmt(v, { digits: v % 1 ? 1 : 0 }), { anchor: 'end', size: 11.5 })).join('')}
${[10, 30, 80, 120].map(n => { const i = rows.findIndex(r => r.n === n); return text(X(i), bottom + 16, fmt(n), { size: 11.5 }); }).join('')}
${text(ox + pw / 2 + 20, bottom + 32, tr('training points used', 'jumlah titik training'), { size: 12 })}
${line(ox + 44, Y(0.25), ox + pw - 8, Y(0.25), { c: 'var(--muted)', w: 1.4, dash: '4 4' })}
${series('valid', k(1))}${series('train', k(0))}`;
  };
  return svg(640, 268, `${panel(10, 1, tr('Degree 1: too rigid', 'Derajat 1: terlalu kaku'))}${panel(340, 6, tr('Degree 6: flexible', 'Derajat 6: fleksibel'))}
${dot(160, 258, k(0), 4)}${text(170, 262, tr('training error', 'training error'), { anchor: 'start', size: 12 })}${dot(290, 258, k(1), 4)}${text(300, 262, tr('validation error', 'validation error'), { anchor: 'start', size: 12 })}<path d="M426 258h24" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="4 4"/>${text(458, 262, tr(`noise floor ${fmt(0.25)}`, `batas noise ${fmt(0.25)}`), { anchor: 'start', size: 12 })}`);
}

// A small decision chart: read the two errors, then pick the action.
function whatToTry() {
  const card = (x, c, cond, name, acts) => `${box(x, 118, 200, 176, soft(c), k(c))}
${cond.map((t, i) => text(x + 100, 142 + i * 15, t, { size: 12.5, fill: 'var(--muted)' })).join('')}
${text(x + 100, 209, name, { ...ink, size: 15 })}
${acts.map((t, i) => text(x + 100, 232 + i * 17, t, { size: 12.5, fill: 'var(--ink)' })).join('')}`;
  const cx = [10, 220, 430];
  return svg(640, 306, `
${box(110, 12, 420, 50, 'var(--accent-soft)', 'var(--line)')}
${text(320, 34, tr('Compare training error and validation error', 'Bandingkan training error dan validation error'), ink)}
${text(320, 52, tr('and compare both with a baseline', 'dan bandingkan keduanya dengan baseline'), { size: 12.5 })}
${cx.map(x => line(320, 62, x + 100, 116, { c: 'var(--muted)', w: 1.8, arrow: true })).join('')}
${card(cx[0], 4, [tr('Both errors are high,', 'Kedua galat tinggi,'), tr('close together', 'berdekatan')], tr('Underfitting', 'Underfitting'), [tr('more flexible model', 'model lebih fleksibel'), tr('better features', 'feature lebih baik'), tr('train longer', 'latih lebih lama')])}
${card(cx[1], 2, [tr('Both errors are low,', 'Kedua galat rendah,'), tr('small gap', 'selisih kecil')], tr('About right', 'Sudah pas'), [tr('keep this model', 'pertahankan model ini'), tr('report once', 'laporkan sekali'), tr('on the test set', 'pada test set')])}
${card(cx[2], 3, [tr('Training error low,', 'Training error rendah,'), tr('validation error', 'validation error'), tr('much higher', 'jauh lebih tinggi')], tr('Overfitting', 'Overfitting'), [tr('more data', 'tambah data'), tr('simpler model', 'model lebih sederhana'), tr('fewer features', 'feature lebih sedikit')])}`);
}

export const figures = { 'fit-panels': fitPanels, 'error-pairs': errorPairs, 'more-data': moreData, 'what-to-try': whatToTry };
