// Figures for the lesson "Sampling variability and the bootstrap". Every number is computed here from
// the same inputs as the lesson text: the exact binomial distribution for the model with a true accuracy
// of 85%, and the ten-case bootstrap example (cases 4 and 9 wrong, seeded draws 8 4 3 6 9 7 5 4 8 2, and
// 20 resamples that scored 4, 6, 6, 7 ... 10 right out of 10).
import { svg, dot, cross, text, line, box, k, soft, tr, fmt } from '../kit.js';

const ink = { weight: 700, fill: 'var(--ink)' };
const P = 0.85;

// Probability of exactly j right answers out of n, for true accuracy p (exact binomial, via logs).
function binomialPmf(n, p, j) {
  let logC = 0;
  for (let i = 1; i <= j; i++) logC += Math.log((n - j + i) / i);
  return Math.exp(logC + j * Math.log(p) + (n - j) * Math.log(1 - p));
}

// 1. How often each score appears across many test sets of 20 and of 100 cases.
function testSetWobble() {
  const W = 640, left = 56, right = 20, plotW = W - left - right;
  const lo = 50, hi = 100, X = v => left + (v - lo) / (hi - lo) * plotW;
  const panel = (oy, n) => {
    const h = 130, base = oy + h;
    const bars = [];
    for (let j = 0; j <= n; j++) if ((j / n) * 100 >= lo - 0.01) bars.push({ score: j / n * 100, prob: binomialPmf(n, P, j) });
    const top = Math.max(...bars.map(b => b.prob));
    const Y = prob => base - prob / top * h * 0.68;
    const bw = (100 / n) * plotW / (hi - lo) * 0.84;
    const se = Math.sqrt(P * (1 - P) / n) * 100;
    const body = bars.map(b => `<rect x="${(X(b.score) - bw / 2).toFixed(1)}" y="${Y(b.prob).toFixed(1)}" width="${bw.toFixed(1)}" height="${(base - Y(b.prob)).toFixed(1)}" fill="${k(0)}" opacity="0.85"/>`).join('');
    const peak = bars.find(b => b.prob === top);
    const ticks = [50, 60, 70, 80, 90, 100].map(v => `${line(X(v), base, X(v), base + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(v), base + 19, `${fmt(v)}%`, { size: 11 })}`).join('');
    return `${text(left, oy - 6, tr(`${fmt(n)} test cases per test set`, `${fmt(n)} kasus uji per test set`), { anchor: 'start', ...ink, size: 13 })}
${body}${line(left, base, W - right, base, { c: 'var(--muted)', w: 1.6 })}${ticks}
${line(X(P * 100), oy + 2, X(P * 100), base, { c: 'var(--ink)', w: 1.6, dash: '5 4' })}
${line(X(P * 100 - se), oy + 12, X(P * 100 + se), oy + 12, { c: k(1), w: 3 })}${line(X(P * 100 - se), oy + 7, X(P * 100 - se), oy + 17, { c: k(1), w: 2 })}${line(X(P * 100 + se), oy + 7, X(P * 100 + se), oy + 17, { c: k(1), w: 2 })}
${text(X(P * 100 - se) - 8, oy + 16, tr(`standard error ${fmt(se, { digits: 1 })} points`, `standard error ${fmt(se, { digits: 1 })} poin`), { anchor: 'end', size: 12, fill: 'var(--ink)' })}
${text(X(P * 100) + 6, oy + 33, tr('true accuracy 85%', 'accuracy sebenarnya 85%'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${n === 20 ? text(X(peak.score), Y(peak.prob) + 18, `${fmt(peak.prob * 100, { digits: 0 })}%`, { size: 12, fill: 'var(--surface)', weight: 700 }) : ''}`;
  };
  return svg(W, 396, `${panel(36, 20)}${panel(214, 100)}
${text(left + plotW / 2, 386, tr('accuracy measured on one test set; bar height: share of test sets with that score', 'accuracy yang diukur pada satu test set; tinggi batang: porsi test set dengan skor itu'), { size: 12 })}`);
}

// 2. One bootstrap resample of ten test cases (cases 4 and 9 are wrong).
const WRONG = new Set([4, 9]);
const DRAWS = [8, 4, 3, 6, 9, 7, 5, 4, 8, 2];
function resample() {
  const W = 640, size = 40, gap = 15, left = 48;
  const X = i => left + i * (size + gap) + size / 2;
  const yTop = 52, yBottom = 172;
  const cell = (cx, y, n, faded) => {
    const bad = WRONG.has(n), c = bad ? k(1) : k(0);
    return `<g opacity="${faded ? 0.4 : 1}"><rect x="${cx - size / 2}" y="${y}" width="${size}" height="${size + 6}" rx="7" fill="${soft(bad ? 1 : 0)}" stroke="${c}" stroke-width="2.2" ${bad ? 'stroke-dasharray="5 3"' : ''}/>${text(cx, y + 20, fmt(n), { ...ink, size: 14 })}${text(cx, y + 38, bad ? '✗' : '✓', { size: 14, fill: c, weight: 700 })}</g>`;
  };
  const drawn = new Set(DRAWS);
  const arrows = DRAWS.map((n, slot) => line(X(n - 1), yTop + size + 8, X(slot), yBottom - 4, { c: 'var(--muted)', w: 1.2 })).join('');
  const top = Array.from({ length: 10 }, (_, i) => cell(X(i), yTop, i + 1, !drawn.has(i + 1))).join('');
  const bottom = DRAWS.map((n, slot) => cell(X(slot), yBottom, n, false)).join('');
  const misses = DRAWS.filter(n => WRONG.has(n)).length;
  return svg(W, 276, `${text(left - 8, 24, tr('Your 10 test cases (✓ right, ✗ wrong); faded cases are never drawn', 'Kesepuluh kasus ujimu (✓ benar, ✗ salah); kasus pudar tidak terambil'), { anchor: 'start', ...ink, size: 13 })}
${arrows}${top}
${bottom}
${text(left - 8, yBottom + size + 32, tr('One resample: 10 draws, each case put back after it is drawn', 'Satu resample: 10 pengambilan, tiap kasus dikembalikan setelah diambil'), { anchor: 'start', ...ink, size: 13 })}
${text(W / 2, yBottom + size + 60, tr(`${fmt(misses)} misses, ${fmt(10 - misses)} right: accuracy ${fmt((10 - misses) * 10)}% (the test set itself: 80%)`, `${fmt(misses)} salah, ${fmt(10 - misses)} benar: accuracy ${fmt((10 - misses) * 10)}% (test set aslinya: 80%)`), { ...ink, size: 14 })}`);
}

// 3. The 20 resample results from the lesson, as stacked dots on a number line.
const COUNTS = { 4: 1, 5: 0, 6: 2, 7: 5, 8: 5, 9: 6, 10: 1 };
function bootstrapResults() {
  const W = 640, H = 300, left = 40, right = 30, base = 196;
  const X = v => left + (v - 3.5) / 7 * (W - left - right);
  const r = 9.5, step = 21;
  let dots = '';
  for (const [v, count] of Object.entries(COUNTS)) {
    const value = Number(v);
    for (let i = 0; i < count; i++) {
      const dropped = (value === 4) || (value === 10);
      const y = base - 16 - i * step;
      dots += dropped ? cross(X(value), y, 'var(--muted)') : dot(X(value), y, k(0), r);
    }
  }
  const ticks = [4, 5, 6, 7, 8, 9, 10].map(v => `${line(X(v), base, X(v), base + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(v), base + 20, `${fmt(v * 10)}%`, { size: 12 })}`).join('');
  const lo = X(6), hi = X(9), by = base + 40;
  return svg(W, H, `${text(left, 22, tr('Accuracy of each of the 20 resamples (one dot each)', 'Accuracy tiap dari 20 resample (satu titik per resample)'), { anchor: 'start', ...ink, size: 13 })}
${line(X(8), 34, X(8), base, { c: 'var(--ink)', w: 1.6, dash: '5 4' })}${text(X(8) + 8, 46, tr('test set: 80%', 'test set: 80%'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${dots}${line(left, base, W - right, base, { c: 'var(--muted)', w: 1.6 })}${ticks}
${line(lo, by, hi, by, { c: k(1), w: 3 })}${line(lo, by - 6, lo, by + 6, { c: k(1), w: 2.4 })}${line(hi, by - 6, hi, by + 6, { c: k(1), w: 2.4 })}
${text((lo + hi) / 2, by + 24, tr('90% percentile interval: 60% to 90%', 'interval persentil 90%: 60% sampai 90%'), { ...ink, size: 13 })}
${cross(left + 6, H - 12, 'var(--muted)')}${text(left + 18, H - 8, tr('dropped: the lowest and the highest result', 'dibuang: hasil terendah dan tertinggi'), { anchor: 'start', size: 12 })}`);
}

export const figures = { 'test-set-wobble': testSetWobble, 'resample': resample, 'bootstrap-results': bootstrapResults };
