// Figures for the "Audit lab" lesson. They audit the same generated rows the lab starts with (seed 2, the default
// correlation 0.20) with the lab's own math (sims/ml/auditlab.js), so every number agrees with the lab and the lesson.
// Text is built inside the functions, so it follows the language; only the numbers are memoised.
import { svg, text, line, box, k, tr, fmt, pct } from '../kit.js';
import { makeLabData, buildAudit, auditSummary, matchGroups } from '../../sims/ml/auditlab.js';

const SEED = 2, GROUPS = ['A', 'B'];
const memo = new Map();
const experiment = rho => {
  const key = rho.toFixed(2);
  if (!memo.has(key)) memo.set(key, buildAudit(makeLabData({ seed: SEED, correlation: rho }), SEED));
  return memo.get(key);
};
const audit = (e, t) => auditSummary(e.test.y, e.scores, e.test.group, GROUPS, t);
// What the lab's match buttons do: B's threshold moves, rounded to the slider's 0.01 steps.
const matched = (kind, e) => {
  const out = matchGroups(kind, e.scores, e.test.y, e.test.group, GROUPS, 0.5);
  return { A: 0.5, B: Math.round(out.B * 100) / 100 };
};
// The case the lab opens on after Reset: the first wrong prediction after case 1, at one threshold of 0.50.
const firstWrong = e => {
  const pred = audit(e, 0.5).pred, n = pred.length;
  for (let k = 1; k <= n; k++) { const i = k % n; if (pred[i] !== e.test.y[i]) return i; }
  return 0;
};

const groupName = g => (g === 'A' ? tr('Group A', 'Kelompok A') : tr('Group B', 'Kelompok B'));
const pts = v => `${fmt(v * 100, { digits: 1 })} ${tr('pts', 'poin')}`;
const signed = v => `${v > 0.00049 ? '+' : ''}${fmt(Math.abs(v) < 0.00049 ? 0 : v * 100, { digits: 1 })}`;

function legend(items, x, y, gap = 150) {
  return items.map(([c, label], i) => `${box(x + i * gap, y - 11, 14, 14, k(c), k(c))}${text(x + i * gap + 21, y, label, { anchor: 'start', fill: 'var(--ink)', size: 12 })}`).join('');
}

// ---- Figure 1: the lab's "Errors by group" table, drawn as bars, with the gap column. ----
function groupGaps() {
  const e = experiment(0.2), s = audit(e, 0.5);
  const [a, b] = s.rows;
  const rows = [
    [tr('Base rate (actually positive)', 'Base rate (sebenarnya positif)'), 'baseRate', null],
    [tr('Accuracy', 'Accuracy'), 'accuracy', s.gaps.accuracy.gap],
    [tr('Precision', 'Precision'), 'precision', s.gaps.precision.gap],
    [tr('Recall', 'Recall'), 'recall', s.gaps.recall.gap],
    [tr('False-positive rate', 'False-positive rate'), 'fpr', s.gaps.fpr.gap],
    [tr('Positive rate (predicted positive)', 'Positive rate (diprediksi positif)'), 'positiveRate', s.gaps.positiveRate.gap],
  ];
  const left = 240, plotW = 230, top = 40, rowH = 38, bh = 12;
  const X = v => left + v * plotW;
  const baseGap = Math.abs(a.baseRate - b.baseRate);
  const body = rows.map(([name, key, gap], i) => {
    const y = top + i * rowH, g = key === 'baseRate' ? baseGap : gap;
    const big = g >= 0.1;
    return `${i % 2 ? '' : `<rect x="0" y="${y - 4}" width="640" height="${rowH}" fill="var(--accent-soft)" opacity="0.5"/>`}
${text(left - 10, y + 17, name, { anchor: 'end', fill: 'var(--ink)', size: 12, weight: 600 })}
${[[a, 0], [b, 1]].map(([r, c], j) => `<rect x="${left}" y="${y + j * (bh + 2)}" width="${Math.max(1, r[key] * plotW)}" height="${bh}" rx="2" fill="${k(c)}"/>${text(X(r[key]) + 6, y + j * (bh + 2) + 10, pct(r[key], 1), { anchor: 'start', fill: 'var(--ink)', size: 11 })}`).join('')}
${text(632, y + 17, `${big ? '▲ ' : ''}${pts(g)}`, { anchor: 'end', fill: big ? 'var(--ink)' : 'var(--muted)', size: 12, weight: big ? 700 : 500 })}`;
  }).join('');
  return svg(640, top + rows.length * rowH + 8, `${legend([[0, groupName('A')], [1, groupName('B')]], 8, 20, 120)}
${text(632, 20, tr('Gap', 'Selisih'), { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 12 })}
${line(left, top - 8, left, top + rows.length * rowH - 4, { c: 'var(--muted)', w: 1.5 })}${body}`);
}

// ---- Figure 2: the trade-off table: one threshold, matched positive rates, matched recall. ----
function threeSettings() {
  const e = experiment(0.2);
  const settings = [
    [tr('One threshold, 0.50', 'Satu threshold, 0,50'), 0.5],
    [tr('Match positive rates', 'Samakan positive rate'), matched('rate', e)],
    [tr('Match recall', 'Samakan recall'), matched('recall', e)],
  ].map(([name, t]) => ({ name, t, s: audit(e, t) }));
  const measures = [[2, tr('Positive rate gap', 'Selisih positive rate'), 'positiveRate'], [3, tr('Recall gap', 'Selisih recall'), 'recall'], [4, tr('False-positive rate gap', 'Selisih false-positive rate'), 'fpr']];
  const pw = 196, gap = 26, top = 62, ph = 150, scale = ph / 0.32;
  const body = settings.map(({ name, t, s }, i) => {
    const ox = i * (pw + gap) + 2, base = top + ph;
    const bars = measures.map(([c, , key], j) => {
      const v = s.gaps[key].gap, x = ox + 20 + j * 56, h = Math.max(1.5, v * scale);
      return `<rect x="${x}" y="${base - h}" width="44" height="${h}" rx="3" fill="${k(c)}"/>${text(x + 22, base - h - 6, fmt(v * 100, { digits: 1 }), { fill: 'var(--ink)', size: 12, weight: 700 })}`;
    }).join('');
    const sub = typeof t === 'number' ? '' : tr(`Threshold for Group B ${fmt(t.B, { digits: 2 })}`, `Threshold untuk Kelompok B ${fmt(t.B, { digits: 2 })}`);
    return `${text(ox + pw / 2, 46, name, { fill: 'var(--ink)', weight: 700, size: 14 })}
${box(ox, top - 10, pw, ph + 20, 'var(--surface)', 'var(--line)')}${line(ox + 8, base, ox + pw - 8, base, { c: 'var(--muted)', w: 1.5 })}${bars}
${text(ox + pw / 2, base + 36, `${tr('Accuracy', 'Accuracy')} ${pct(s.accuracy, 1)}`, { fill: 'var(--ink)', weight: 700, size: 14 })}
${text(ox + pw / 2, base + 55, sub, { size: 12 })}`;
  }).join('');
  return svg(640, 292, `${legend(measures.map(([c, label]) => [c, label]), 2, 16, 190)}${body}`);
}

// ---- Figure 3: importance of the signal and of its copy as the correlation grows. ----
function sharedImportance() {
  const rhos = [0.2, 0.7, 0.9, 0.99];
  const data = rhos.map(r => ({ r, res: experiment(r).importance.results }));
  const left = 52, base = 232, scale = 6.2, gw = 142, bw = 34;
  const Y = v => base - v * 100 * scale;
  const grid = [0, 10, 20, 30].map(t => `${line(left, base - t * scale, 632, base - t * scale, { c: 'var(--line)', w: 1.2 })}${text(left - 8, base - t * scale + 4, `${fmt(t)}%`, { anchor: 'end', size: 12 })}`).join('');
  const series = [[0, 0], [4, 1], [5, 4]];   // colour, index into the lab's importance results: signal, copy, both together
  const body = data.map(({ r, res }, i) => {
    const gx = left + 16 + i * gw;
    const bars = series.map(([c, idx], j) => {
      const v = res[idx].mean, x = gx + j * (bw + 5), h = Math.max(1.5, v * 100 * scale);
      return `<rect x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="3" fill="${k(c)}"/>${text(x + bw / 2, base - h - 5, fmt(v * 100, { digits: 1 }), { fill: 'var(--ink)', size: 11, weight: 700 })}`;
    }).join('');
    return `${bars}${text(gx + (3 * bw + 10) / 2, base + 20, `${tr('Correlation', 'Korelasi')} ${fmt(r, { digits: 2 })}`, { fill: 'var(--ink)', weight: 700, size: 13 })}`;
  }).join('');
  return svg(640, 268, `${legend([[0, tr('signal', 'sinyal')], [4, tr('signal copy', 'salinan sinyal')], [5, tr('Both together', 'Keduanya bersama')]], left, 16, 150)}
${text(left + 4, 36, tr('Accuracy lost when shuffled (percentage points)', 'Accuracy yang hilang saat diacak (poin persentase)'), { anchor: 'start', size: 12 })}${grid}${line(left, base, 632, base, { c: 'var(--muted)', w: 1.6 })}${body}`);
}

// ---- Figure 4: the Shapley values of one wrong prediction, before and after the copy gets close. ----
function oneCase() {
  const e0 = experiment(0.2), idx = firstWrong(e0);
  const names = [tr('signal', 'sinyal'), tr('signal copy', 'salinan sinyal'), tr('other signal', 'sinyal lain'), tr('noise', 'noise')];
  const panels = [0.2, 0.95].map(r => ({ r, sh: experiment(r).shap(idx) }));
  const pw = 312, gap = 16, top = 62, rowH = 34, lo = -0.14, hi = 0.02, plotL = 98, plotW = 162;
  const body = panels.map(({ r, sh }, p) => {
    const ox = p * (pw + gap), X = v => ox + plotL + (v - lo) / (hi - lo) * plotW;
    const rows = sh.values.map((v, i) => {
      const y = top + i * rowH, x0 = X(0), x1 = X(v);
      return `${text(ox + plotL - 8, y + rowH / 2 + 4, names[i], { anchor: 'end', fill: 'var(--ink)', size: 12 })}
<rect x="${Math.min(x0, x1)}" y="${y + 7}" width="${Math.max(2, Math.abs(x1 - x0))}" height="${rowH - 14}" rx="2" fill="${v >= 0 ? k(2) : k(1)}"/>
${text(ox + pw - 4, y + rowH / 2 + 4, signed(v), { anchor: 'end', fill: 'var(--ink)', size: 12, weight: 700 })}`;
    }).join('');
    return `${text(ox + pw / 2, 18, `${tr('Correlation', 'Korelasi')} ${fmt(r, { digits: 2 })}`, { fill: 'var(--ink)', weight: 700, size: 14 })}
${text(ox + pw / 2, 38, tr(`Average case ${pct(sh.baselineValue, 1)}, this case ${pct(sh.fx, 1)}`, `Kasus rata-rata ${pct(sh.baselineValue, 1)}, kasus ini ${pct(sh.fx, 1)}`), { fill: 'var(--ink)', size: 12 })}
${line(X(0), top - 2, X(0), top + rowH * 4 + 2, { c: 'var(--muted)', w: 1.5 })}${rows}`;
  }).join('');
  return svg(640, top + 4 * rowH + 28, `${body}
${text(320, top + 4 * rowH + 20, tr('Shapley values in percentage points of predicted probability. Left of the line pushes toward negative.', 'Nilai Shapley dalam poin persentase probabilitas prediksi. Kiri garis mendorong ke negatif.'), { size: 12 })}`);
}

export const figures = {
  'group-gaps': groupGaps,
  'three-settings': threeSettings,
  'shared-importance': sharedImportance,
  'one-case': oneCase,
};
