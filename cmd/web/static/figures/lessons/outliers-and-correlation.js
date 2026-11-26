// Figures for the "Outliers and correlation" lesson. Every number a figure shows is computed
// from the data it draws, so the pictures agree with the worked examples in the text.
import { svg, dot, ring, cross, diamond, text, line, box, k, tr, fmt } from '../kit.js';

const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const median = a => {
  const s = [...a].sort((x, y) => x - y), n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
// Pearson correlation of a list of [x, y] points.
function corr(P) {
  const mx = mean(P.map(p => p[0])), my = mean(P.map(p => p[1]));
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of P) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
}
const rText = r => `r = ${fmt(Math.abs(r) < 0.005 ? 0 : r, { digits: 2 })}`;
// A tiny seeded generator, so the dots are the same on every draw.
function lcg(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

// ---- Figure 1: the mean chases an outlier, the median does not. ----
const TIMES = [22, 25, 24, 27, 23, 26];

function meanVsMedian() {
  const X = v => 40 + (v - 15) / 85 * 560;
  const row = (values, ay, title, outlier) => {
    const m = mean(values), md = median(values), same = m === md;
    const label = same
      ? text(40, ay - 44, `${tr('mean', 'rata-rata')} = ${tr('median', 'median')} = ${fmt(m, { digits: 1 })}`, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })
      : `${text(X(md) - 6, ay - 44, `${tr('median', 'median')} ${fmt(md)}`, { anchor: 'end', fill: k(0), weight: 700, size: 13 })}
${text(X(m) + 10, ay - 44, `${tr('mean', 'rata-rata')} ${fmt(m, { digits: 1 })}`, { anchor: 'start', fill: k(1), weight: 700, size: 13 })}`;
    const ticks = [20, 40, 60, 80, 100].map(t => `${line(X(t), ay, X(t), ay + 6, { c: 'var(--muted)', w: 1.4 })}${text(X(t), ay + 22, fmt(t), { size: 12 })}`).join('');
    return `${text(40, ay - 66, title, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}
${line(X(15), ay, X(100), ay, { c: 'var(--muted)', w: 1.6 })}${ticks}
${values.map(v => (outlier && v === outlier ? '' : dot(X(v), ay, 'var(--ink)', 4.5))).join('')}
${outlier ? `${ring(X(outlier), ay, k(3), 9)}${text(X(outlier), ay - 18, fmt(outlier), { fill: 'var(--ink)', weight: 700, size: 13 })}` : ''}
${line(X(md), ay - 16, X(md), ay + 12, { c: k(0), w: 3.4 })}
${diamond(X(m), ay - 24, k(1), 8)}
${label}`;
  };
  const withOutlier = [...TIMES, 95];
  return svg(640, 262, `${row(TIMES, 96, tr('Six deliveries (minutes)', 'Enam pengantaran (menit)'), 0)}
${row(withOutlier, 224, tr('Add one delayed delivery: 95 minutes', 'Tambah satu pengantaran yang terjebak macet: 95 menit'), 95)}`);
}

// ---- Figure 2: four scatterplot patterns and their r. ----
function patterns() {
  const make = (seed, n, f) => { const rnd = lcg(seed); return Array.from({ length: n }, (_, i) => f(i, rnd)); };
  const sets = [
    { pts: make(1, 16, (i, rnd) => { const x = i / 15 * 10; return [x, x + (rnd() - 0.5) * 4]; }), c: k(0), name: tr('Strong, rising', 'Kuat, naik') },
    { pts: make(4, 16, (i, rnd) => [rnd() * 10, rnd() * 10]), c: k(0), name: tr('No pattern', 'Tanpa pola') },
    { pts: make(1, 16, (i, rnd) => { const x = i / 15 * 10; return [x, 10 - x + (rnd() - 0.5) * 4]; }), c: k(0), name: tr('Strong, falling', 'Kuat, turun') },
    { pts: make(1, 16, (i, rnd) => { const x = i / 15 * 10 - 5; return [x + 5, x * x * 0.36 + (rnd() - 0.5) * 1.2]; }), c: k(1), name: tr('A curve', 'Sebuah kurva') },
  ];
  const w = 148, gap = 16, top = 10, h = 150;
  const body = sets.map((s, i) => {
    const ox = i * (w + gap);
    const X = v => ox + 12 + (v + 0.5) / 11 * (w - 24), Y = v => top + h - 12 - (v + 0.5) / 11 * (h - 24);
    return `${box(ox, top, w, h)}
${s.pts.map(([x, y]) => dot(X(x), Y(y), s.c, 4.2)).join('')}
${text(ox + w / 2, top + h + 22, s.name, { fill: 'var(--ink)', weight: 700, size: 14 })}
${text(ox + w / 2, top + h + 42, rText(corr(s.pts)), { size: 14, fill: s.c === k(1) ? k(1) : 'var(--ink)', weight: 700 })}`;
  }).join('');
  return svg(640, 218, body);
}

// ---- Figure 3: one point can reverse a correlation, or invent one. ----
const STUDENTS = [[1, 50], [2, 55], [3, 65], [4, 60], [5, 70]];
const CLOUD = [[1, 5], [2, 3], [3, 7], [4, 4], [5, 6], [6, 3], [7, 6], [8, 3], [9, 5], [5, 2]];

function outlierOnR() {
  const w = 204, gap = 14, top = 28, h = 176;
  const panel = (i, title, pts, extra, dom, xLabel, yLabel) => {
    const ox = i * (w + gap);
    const X = v => ox + 16 + v / dom[0] * (w - 30), Y = v => top + h - 28 - v / dom[1] * (h - 52);
    const all = extra ? [...pts, extra] : pts;
    return `${text(ox + w / 2, 18, title, { fill: 'var(--ink)', weight: 700, size: 13 })}
${box(ox, top, w, h)}
${line(X(0), Y(0), X(dom[0]), Y(0), { c: 'var(--muted)', w: 1.6 })}${line(X(0), Y(0), X(0), Y(dom[1]), { c: 'var(--muted)', w: 1.6 })}
${text(X(dom[0]), Y(0) + 16, xLabel, { anchor: 'end', size: 12 })}${text(X(0) + 6, top + 18, yLabel, { anchor: 'start', size: 12 })}
${pts.map(([x, y]) => dot(X(x), Y(y), 'var(--ink)', 4.6)).join('')}
${extra ? `${ring(X(extra[0]), Y(extra[1]), k(3), 10)}${cross(X(extra[0]), Y(extra[1]), k(3))}` : ''}
${text(ox + w / 2, top + h + 28, rText(corr(all)), { fill: extra ? k(3) : 'var(--ink)', weight: 700, size: 16 })}`;
  };
  const hours = tr('hours studied', 'jam belajar'), score = tr('score', 'nilai');
  return svg(640, 244, `${panel(0, tr('Five students', 'Lima siswa'), STUDENTS, null, [7, 100], hours, score)}
${panel(1, tr('Add one student', 'Tambah satu siswa'), STUDENTS, [6, 30], [7, 100], hours, score)}
${panel(2, tr('No pattern + one far point', 'Tanpa pola + satu titik jauh'), CLOUD, [20, 20], [22, 22], 'x', 'y')}`);
}

export const figures = {
  'mean-vs-median': meanVsMedian,
  'scatter-patterns': patterns,
  'outlier-on-r': outlierOnR,
};
