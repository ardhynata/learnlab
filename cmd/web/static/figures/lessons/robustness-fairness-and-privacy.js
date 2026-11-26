// Figures for the lesson "Robustness, fairness and privacy": [[figure:robustness-fairness-and-privacy/name|Caption]].
// Real data: the one-line penguin rule (Gentoo if mass >= 4700 g) on the 333 penguins with a body mass and a sex,
// under four input changes. Counts checked against penguins.csv.
// Generated data: an invented tool in groups A (200 cases) and B (400 cases); an invented 12-record table.
import { svg, text, line, k, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const tint = i => `color-mix(in srgb, var(--k${i}) 22%, var(--surface))`;
const PASS = 2, WARN = 3, A = 4, FAIL = 5;

// Figure 1: overall accuracy and the lower sex accuracy in each test, against the pass rule written first.
function stressTests() {
  const FLOOR_ALL = 0.85, FLOOR_SEX = 0.8;
  const tests = [
    { name: tr('No change', 'Tanpa perubahan'), all: [303, 333], f: [139, 165], m: [164, 168] },
    { name: tr('Scale reads 200 g light', 'Timbangan 200 g terlalu ringan'), all: [288, 333], f: [121, 165], m: [167, 168] },
    { name: tr('Scale reads 200 g heavy', 'Timbangan 200 g terlalu berat'), all: [307, 333], f: [150, 165], m: [157, 168] },
    { name: tr('Biscoe masses missing', 'Massa Biscoe kosong'), all: [212, 333], f: [107, 165], m: [105, 168] },
  ];
  const L = 215, W = 300, T = 56, rowH = 62, bh = 20;
  const X = v => L + v * W;
  const grid = [0, 0.5, 1].map(v => `${line(X(v), T - 10, X(v), T + tests.length * rowH - 12, { w: 1 })}${text(X(v), T - 18, fmt(v), { size: 12 })}`).join('');
  const bar = (y, v, floor, label) => {
    const ok = v >= floor;
    return `<rect x="${L}" y="${y}" width="${Math.max(v * W, 1.5)}" height="${bh}" rx="4" fill="${tint(ok ? PASS : FAIL)}" stroke="${k(ok ? PASS : FAIL)}" stroke-width="2"/>
${text(L + 8, y + bh / 2 + 4, `${label} ${fmt(v, { digits: 2 })}`, { anchor: 'start', size: 12, ...INK })}
${line(X(floor), y - 4, X(floor), y + bh + 4, { c: 'var(--ink)', w: 2, dash: '3 3' })}`;
  };
  const rows = tests.map((t, i) => {
    const y = T + i * rowH, all = t.all[0] / t.all[1];
    const sex = Math.min(t.f[0] / t.f[1], t.m[0] / t.m[1]);
    const pass = all >= FLOOR_ALL && sex >= FLOOR_SEX;
    return `${text(L - 12, y + bh + 4, t.name, { anchor: 'end', size: 13, ...INK })}
${bar(y, all, FLOOR_ALL, tr('overall', 'keseluruhan'))}
${bar(y + bh + 6, sex, FLOOR_SEX, tr('lower sex', 'kelamin terendah'))}
${text(560, y + bh + 4, pass ? tr('pass', 'lulus') : tr('fail', 'gagal'), { size: 15, weight: 800, fill: k(pass ? PASS : FAIL) })}`;
  }).join('');
  const n1 = tr(
    `Pass rule, fixed first: overall at least ${fmt(FLOOR_ALL, { digits: 2 })}`,
    `Aturan lulus, ditetapkan lebih dulu: keseluruhan minimal ${fmt(FLOOR_ALL, { digits: 2 })}`);
  const n2 = tr(
    `and each sex at least ${fmt(FLOOR_SEX, { digits: 2 })} (dashed marks).`,
    `dan tiap jenis kelamin minimal ${fmt(FLOOR_SEX, { digits: 2 })} (tanda putus-putus).`);
  return svg(660, 340, `${grid}${rows}${text(330, 312, n1, { size: 13 })}${text(330, 330, n2, { size: 13 })}`);
}

// Shared drawing: clusters of bars for rates (TPR, FPR, precision), one bar per series.
function rateBars(series, { gaps = false, height = 340 } = {}) {
  const metrics = [
    { name: tr('True-positive rate', 'True-positive rate'), key: 'tpr' },
    { name: tr('False-positive rate', 'False-positive rate'), key: 'fpr' },
    { name: tr('Precision', 'Precision'), key: 'prec' },
  ];
  const TOP = 50, BOT = 246, H = BOT - TOP, CW = 190, X0 = 50, bw = series.length === 3 ? 46 : 56, gap = 8;
  const Y = v => BOT - v * H;
  const grid = [0, 0.5, 1].map(v => `${line(X0 - 10, Y(v), X0 + CW * 3 - 20, Y(v), { w: 1 })}${text(X0 - 16, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const clusters = metrics.map((m, j) => {
    const total = series.length * bw + (series.length - 1) * gap;
    const x0 = X0 + j * CW + (CW - 20 - total) / 2;
    const bars = series.map((s, i) => {
      const v = s[m.key], x = x0 + i * (bw + gap);
      return `<rect x="${x}" y="${Y(v)}" width="${bw}" height="${Math.max(v * H, 1.5)}" rx="4" fill="${k(s.c)}" stroke="var(--ink)" stroke-width="1.2"/>
${text(x + bw / 2, Y(v) - 6, fmt(v, { digits: 2 }), { size: 13, ...INK })}`;
    }).join('');
    const cx = x0 + total / 2;
    const d = Math.abs(series[1][m.key] - series[0][m.key]);
    const g = gaps ? text(cx, BOT + 40, `${tr('gap', 'selisih')} ${fmt(d, { digits: 2 })}`, { size: 13, fill: d < 0.005 ? k(PASS) : k(FAIL), weight: 800 }) : '';
    return `${bars}${text(cx, BOT + 20, m.name, { size: 14, ...INK })}${g}`;
  }).join('');
  const lx = 660 / 2 - series.reduce((a, s) => a + 28 + s.name.length * 7.2 + 18, 0) / 2;
  let cur = lx;
  const legend = series.map(s => {
    const out = `<rect x="${cur}" y="${height - 36}" width="14" height="14" rx="3" fill="${k(s.c)}" stroke="var(--ink)" stroke-width="1"/>${text(cur + 20, height - 24, s.name, { anchor: 'start', size: 13, ...INK })}`;
    cur += 28 + s.name.length * 7.2 + 18;
    return out;
  }).join('');
  return `${grid}${clusters}${legend}`;
}

// Figure 2: the two groups' rates from the confusion table (A: 80/20/20/80, B: 60/40/15/285).
function groupGaps() {
  const rates = (tp, fn, fp, tn) => ({ tpr: tp / (tp + fn), fpr: fp / (fp + tn), prec: tp / (tp + fp) });
  const series = [
    { name: tr('Group A', 'Grup A'), c: A, ...rates(80, 20, 20, 80) },
    { name: tr('Group B', 'Grup B'), c: WARN, ...rates(60, 40, 15, 285) },
  ];
  return svg(660, 340, rateBars(series, { gaps: true, height: 340 }));
}

// Figure 3: group B after its base rate rises from 0.25 to 0.40 (TPR 0.60 and FPR 0.05 unchanged).
function fairnessShift() {
  const rates = (tp, fn, fp, tn) => ({ tpr: tp / (tp + fn), fpr: fp / (fp + tn), prec: tp / (tp + fp) });
  const series = [
    { name: tr('Group A', 'Grup A'), c: A, ...rates(80, 20, 20, 80) },
    { name: tr('Group B at launch', 'Grup B saat peluncuran'), c: WARN, ...rates(60, 40, 15, 285) },
    { name: tr('Group B after the rise', 'Grup B setelah naik'), c: FAIL, ...rates(96, 64, 12, 228) },
  ];
  return svg(660, 340, rateBars(series, { height: 340 }));
}

// Figure 4: records per (age band, area) before and after merging the age bands. k is the smallest nonzero cell.
function kAnonymity() {
  const CW = 86, CH = 44, G = 4;
  const panel = (x0, rowsLabels, grid, title, x2) => {
    const flat = grid.flat().filter(n => n > 0), kk = Math.min(...flat);
    const heads = [tr('North', 'Utara'), tr('South', 'Selatan')].map((h, j) => text(x0 + j * (CW + G) + CW / 2, 84, h, { size: 13, ...INK })).join('');
    const cells = grid.map((row, i) => row.map((n, j) => {
      const x = x0 + j * (CW + G), y = 94 + i * (CH + G);
      const c = n === 0 ? null : n === 1 ? FAIL : n === kk ? WARN : PASS;
      const box = c === null
        ? `<rect x="${x}" y="${y}" width="${CW}" height="${CH}" rx="8" fill="none" stroke="var(--line)" stroke-width="1.6" stroke-dasharray="4 4"/>${text(x + CW / 2, y + CH / 2 + 6, '0', { size: 16, weight: 600 })}`
        : `<rect x="${x}" y="${y}" width="${CW}" height="${CH}" rx="8" fill="${tint(c)}" stroke="${k(c)}" stroke-width="2.2"/>${text(x + CW / 2, y + CH / 2 + 7, fmt(n), { size: 20, weight: 800, fill: 'var(--ink)' })}`;
      return box;
    }).join('')).join('');
    const labels = rowsLabels.map((l, i) => text(x0 - 10, 94 + i * (CH + G) + CH / 2 + 5, l, { anchor: 'end', size: 13, ...INK })).join('');
    const bottom = 94 + grid.length * (CH + G) + 22;
    return `${text(x2, 34, title, { size: 15, ...INK })}${heads}${labels}${cells}${text(x2, bottom, `k = ${fmt(kk)}`, { size: 17, weight: 800, fill: 'var(--ink)' })}`;
  };
  const ages10 = [tr('20 to 29', '20 sampai 29'), tr('30 to 39', '30 sampai 39'), tr('40 to 49', '40 sampai 49'), tr('50 to 59', '50 sampai 59')];
  const ages20 = [tr('20 to 39', '20 sampai 39'), tr('40 to 59', '40 sampai 59')];
  const left = panel(108, ages10, [[1, 0], [3, 2], [2, 3], [0, 1]], tr('Age bands of 10 years', 'Rentang usia 10 tahun'), 108 + CW + G / 2);
  const right = panel(482, ages20, [[4, 2], [2, 4]], tr('Age bands of 20 years', 'Rentang usia 20 tahun'), 482 + CW + G / 2);
  const arrow = `${line(298, 150, 372, 150, { arrow: true, c: 'var(--muted)', w: 2.4 })}${text(335, 138, tr('merge', 'gabungkan'), { size: 13 })}`;
  return svg(660, 330, `${left}${right}${arrow}`);
}

export const figures = {
  'stress-tests': stressTests,
  'group-gaps': groupGaps,
  'fairness-shift': fairnessShift,
  'k-anonymity': kAnonymity,
};
