// Figures for the lesson "Intermediate capstone project": [[figure:intermediate-capstone-project/name|Caption]].
// Every number is a real result of the Level 2 capstone workbench (sims/labs/capstone-l2.js; math in sims/ml/capstone2.js,
// capstone2lab.js and capstone2report.js) on its synthetic Dataset 1 (generator seed 1: 1,200 transactions of 60 customers
// over 90 days, 93 of them fraud), with the lab's own defaults: a false alarm costs 5, a missed fraud 50, B = 200 bootstrap
// resamples, split seed 1, 25% of the rows held out (900 training rows, 300 held-out rows). The reference forest of the
// split comparison averages 5 splits for the random and the grouped split. The held-out intervals use each model's
// best-of-search setting (logistic: no penalty; forest: depth 2 on the grouped split, depth 8 on the random split).
// Text is built when drawn, so tr() and fmt() follow the language.
import { svg, dot, ring, diamond, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';

const INK = { fill: 'var(--ink)' };
const BOLD = { weight: 700, fill: 'var(--ink)' };
const sign = v => `${v < 0 ? '-' : '+'}${fmt(Math.abs(v), { digits: 2 })}`;

// ---- Figure 1: the six steps and what the lab checks before it opens the next one. ----
function sixSteps() {
  const steps = [
    [tr('Frame', 'Rumuskan'), [tr('costs set and two', 'biaya ditetapkan, dua'), tr('reasons ticked', 'alasan dicentang')], 0],
    [tr('Split', 'Split'), [tr('split chosen, compared', 'split dipilih, dibandingkan'), tr('and defended', 'dan dibela')], 1],
    [tr('Models', 'Model'), [tr('both searches run,', 'kedua pencarian jalan,'), tr('one model taken forward', 'satu model dibawa maju')], 2],
    [tr('Uncertainty', 'Interval'), [tr('held-out rows scored,', 'held-out rows dinilai,'), tr('intervals read', 'interval dibaca')], 3],
    [tr('Threshold', 'Threshold'), [tr('"Use this threshold"', '"Pakai threshold ini"'), tr('has been pressed', 'sudah ditekan')], 4],
    [tr('Report', 'Laporan'), [tr('three texts and', 'tiga teks dan'), tr('four ratings', 'empat penilaian')], 5],
  ];
  const w = 204, h = 96, gap = 34, xs = [10, 10 + w + gap, 10 + 2 * (w + gap)], ys = [14, 148];
  const cell = ([title, done, c], i) => {
    const x = xs[i % 3], y = ys[Math.floor(i / 3)];
    return `${box(x, y, w, h, soft(c), k(c))}
${ring(x + 24, y + 24, k(c), 12)}${text(x + 24, y + 29, fmt(i + 1), { ...BOLD, size: 14 })}
${text(x + 44, y + 29, title, { anchor: 'start', ...BOLD, size: 14 })}
${text(x + 14, y + 55, tr('done when', 'selesai bila'), { anchor: 'start', size: 12 })}
${text(x + 14, y + 72, done[0], { anchor: 'start', size: 13, ...INK })}
${text(x + 14, y + 88, done[1], { anchor: 'start', size: 13, ...INK })}`;
  };
  const row = r => [0, 1].map(i => line(xs[i] + w + 4, ys[r] + h / 2, xs[i + 1] - 4, ys[r] + h / 2, { c: 'var(--muted)', w: 2, arrow: true })).join('');
  const turn = `${line(xs[2] + w / 2, ys[0] + h + 2, xs[2] + w / 2, 128, { c: 'var(--muted)', w: 2 })}${line(xs[2] + w / 2, 128, xs[0] + w / 2, 128, { c: 'var(--muted)', w: 2 })}${line(xs[0] + w / 2, 128, xs[0] + w / 2, ys[1] - 4, { c: 'var(--muted)', w: 2, arrow: true })}`;
  return svg(680, 262, `${steps.map(cell).join('')}${row(0)}${row(1)}${turn}`);
}

// ---- Figure 2: how optimistic each split is, for the reference forest. ----
// [name, color, mean AUC, lowest, highest (null: one possible split), share of test rows whose customer was in training]
const SPLITS = [
  [() => tr('Random', 'Acak'), 1, 0.8357, 0.768, 0.885, 1],
  [() => tr('Grouped by customer', 'Per pelanggan'), 2, 0.7175, 0.644, 0.775, 0],
  [() => tr('Temporal (by time)', 'Temporal (menurut waktu)'), 0, 0.8787, null, null, 1],
];
function splitOptimism() {
  const L = 236, R = 480, top = 66, rh = 52, B = top + SPLITS.length * rh;
  const X = v => L + (v - 0.5) / 0.5 * (R - L);
  const grid = [0.5, 0.6, 0.7, 0.8, 0.9, 1].map(v => `${line(X(v), top - 8, X(v), B, { c: 'var(--line)', w: 1 })}${text(X(v), B + 18, fmt(v, { digits: 1 }), { size: 12 })}`).join('');
  const rows = SPLITS.map(([name, c, auc, lo, hi, shared], i) => {
    const y = top + i * rh + rh / 2;
    const bar = lo == null ? text(X(auc) + 14, y + 4, tr('one possible split', 'satu split saja'), { anchor: 'start', size: 12 })
      : `${line(X(lo), y, X(hi), y, { c: k(c), w: 3 })}${line(X(lo), y - 6, X(lo), y + 6, { c: k(c), w: 3 })}${line(X(hi), y - 6, X(hi), y + 6, { c: k(c), w: 3 })}`;
    return `${text(10, y + 5, name(), { anchor: 'start', ...BOLD, size: 14 })}
${bar}${dot(X(auc), y, k(c), 7)}${text(X(auc), y - 12, fmt(auc, { digits: 2 }), { ...BOLD, size: 13 })}
${text(628, y + 6, pct(shared, 0), { anchor: 'end', ...BOLD, size: 18, fill: shared ? k(1) : k(2) })}`;
  }).join('');
  return svg(640, B + 62, `
${text(10, 24, tr('Split', 'Split'), { anchor: 'start', ...BOLD, size: 13 })}
${text(X(0.75), 24, tr('AUC of the reference forest', 'AUC forest acuan'), { ...BOLD, size: 13 })}
${text(X(0.75), 42, tr('dot: mean, bar: lowest to highest of 5 splits', 'titik: rata-rata, garis: terendah sampai tertinggi dari 5 split'), { size: 12 })}
${text(628, 24, tr('Customer already', 'Pelanggan sudah ada'), { anchor: 'end', ...BOLD, size: 13 })}
${text(628, 42, tr('in training', 'di training'), { anchor: 'end', ...BOLD, size: 13 })}
${grid}${line(X(0.5), top - 8, X(0.5), B, { c: 'var(--muted)', w: 1.6, dash: '5 4' })}${rows}
${text(X(0.5), B + 40, tr('0.5 = coin flip', '0,5 = lempar koin'), { size: 12 })}`);
}

// ---- Figure 3: held-out AUC with 95% intervals on the grouped and the random split. ----
// [model, color, estimate, low, high]
const PANELS = [
  {
    title: () => tr('Grouped split: 18 frauds in 300 held-out rows', 'Split per pelanggan: 18 fraud di 300 held-out rows'),
    rows: [[() => tr('Baseline', 'Baseline'), 'var(--muted)', 0.5, 0.5, 0.5], [() => tr('Logistic', 'Logistik'), k(0), 0.7447, 0.6153, 0.8517], [() => tr('Forest', 'Forest'), k(1), 0.6987, 0.5772, 0.811]],
    diff: [0.046, -0.0233, 0.1142],
    verdict: () => [tr('Interval includes zero:', 'Interval mencakup nol:'), tr('the rows cannot tell them apart', 'baris tak bisa membedakan')],
  },
  {
    title: () => tr('Random split: 22 frauds in 300 held-out rows', 'Split acak: 22 fraud di 300 held-out rows'),
    rows: [[() => tr('Baseline', 'Baseline'), 'var(--muted)', 0.5, 0.5, 0.5], [() => tr('Logistic', 'Logistik'), k(0), 0.7521, 0.6287, 0.8444], [() => tr('Forest', 'Forest'), k(1), 0.8456, 0.7662, 0.9193]],
    diff: [-0.0934, -0.2049, -0.0111],
    verdict: () => [tr('Interval excludes zero:', 'Interval tidak mencakup nol:'), tr('the forest is clearly ahead', 'forest jelas unggul')],
  },
];
function intervalBySplit() {
  const L = 100, R = 400, rh = 30, ph = 3 * rh + 74;
  const X = v => L + (v - 0.4) / 0.6 * (R - L);
  const panel = (p, i) => {
    const y0 = 8 + i * (ph + 14), top = y0 + 40;
    const grid = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(v => `${line(X(v), top - 4, X(v), top + 3 * rh, { c: 'var(--line)', w: 1 })}${text(X(v), top + 3 * rh + 16, fmt(v, { digits: 1 }), { size: 12 })}`).join('');
    const rows = p.rows.map(([name, col, est, lo, hi], j) => {
      const y = top + j * rh + rh / 2;
      const bar = hi > lo ? `${line(X(lo), y, X(hi), y, { c: col, w: 3 })}${line(X(lo), y - 6, X(lo), y + 6, { c: col, w: 3 })}${line(X(hi), y - 6, X(hi), y + 6, { c: col, w: 3 })}` : '';
      return `${text(L - 10, y + 5, name(), { anchor: 'end', ...BOLD, size: 13 })}${bar}${dot(X(est), y, col, 6)}${text(X(est), y - 10, fmt(est, { digits: 2 }), { ...BOLD, size: 12 })}`;
    }).join('');
    const [d, dlo, dhi] = p.diff, v = p.verdict();
    return `${text(10, y0 + 18, p.title(), { anchor: 'start', ...BOLD, size: 14 })}
${grid}${line(X(0.5), top - 4, X(0.5), top + 3 * rh, { c: 'var(--muted)', w: 1.6, dash: '5 4' })}${rows}
${text(424, top + 14, tr('Logistic minus forest', 'Logistik dikurangi forest'), { anchor: 'start', size: 12 })}
${text(424, top + 34, `${sign(d)} (${sign(dlo)} ${tr('to', 'sampai')} ${sign(dhi)})`, { anchor: 'start', ...BOLD, size: 14 })}
${text(424, top + 56, v[0], { anchor: 'start', size: 12, ...INK })}${text(424, top + 72, v[1], { anchor: 'start', size: 12, ...INK })}`;
  };
  return svg(640, 2 * (ph + 14) + 14, PANELS.map(panel).join(''));
}

// ---- Figure 4: expected cost per transaction at each threshold, grouped held-out rows, logistic regression. ----
// "false alarms:missed frauds" for the thresholds 0.5%, 1%, ... 40%; cost = (5 x false alarms + 50 x missed) / 300.
const COUNTS = '282:0 282:0 276:0 265:0 256:0 244:1 232:1 219:1 206:1 195:2 184:2 174:2 162:2 153:3 148:3 140:3 129:4 121:4 113:5 106:5 103:5 97:5 92:5 86:5 78:5 70:5 64:5 60:6 56:7 51:8 47:9 43:11 40:11 40:11 37:11 36:12 33:12 30:13 27:13 23:13 21:14 19:15 19:15 18:15 18:15 16:15 14:15 13:15 13:15 11:15 10:15 8:15 8:16 8:16 8:16 8:17 8:17 7:17 6:17 6:17 4:17 4:17 4:17 3:17 3:17 2:18 2:18 2:18 2:18 2:18 2:18 2:18 2:18 2:18 2:18 2:18 2:18 2:18 2:18 2:18'.split(' ');
const CURVE = COUNTS.map((c, i) => { const [fp, fn] = c.split(':').map(Number); return [(i + 1) * 0.005, (5 * fp + 50 * fn) / 300]; });
const COST_THRESHOLD = [5 / 55, 795 / 300];   // 9.1%: 119 false alarms, 4 missed
const DIP = [0.135, 570 / 300];               // 13.5%: 64 false alarms, 5 missed
const FLAG_NONE = 18 * 50 / 300, FLAG_ALL = 282 * 5 / 300;
function costCurve() {
  const L = 62, R = 622, T = 28, B = 244, XMAX = 0.4, YMAX = 5;
  const X = t => L + t / XMAX * (R - L), Y = v => B - v / YMAX * (B - T);
  const grid = [0, 1, 2, 3, 4, 5].map(v => `${line(L, Y(v), R, Y(v), { c: 'var(--line)', w: 1 })}${text(L - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const ticks = [0, 0.1, 0.2, 0.3, 0.4].map(t => `${line(X(t), B, X(t), B + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(t), B + 20, pct(t, 0), { size: 12 })}`).join('');
  const path = `<path d="M${CURVE.map(([t, c]) => `${X(t).toFixed(1)} ${Y(c).toFixed(1)}`).join('L')}" fill="none" stroke="${k(0)}" stroke-width="2.6" stroke-linejoin="round"/>`;
  const refs = `${line(L, Y(FLAG_NONE), R, Y(FLAG_NONE), { c: 'var(--muted)', w: 2, dash: '7 5' })}${text(R - 4, Y(FLAG_NONE) - 7, tr(`Flag nothing: ${fmt(FLAG_NONE, { digits: 2 })}`, `Tidak menandai apa pun: ${fmt(FLAG_NONE, { digits: 2 })}`), { anchor: 'end', size: 12, ...INK })}
${line(L, Y(FLAG_ALL), R, Y(FLAG_ALL), { c: 'var(--muted)', w: 2, dash: '7 5' })}${text(R - 4, Y(FLAG_ALL) - 7, tr(`Flag everything: ${fmt(FLAG_ALL, { digits: 2 })}`, `Menandai semuanya: ${fmt(FLAG_ALL, { digits: 2 })}`), { anchor: 'end', size: 12, ...INK })}`;
  const [ct, cc] = COST_THRESHOLD, [dt, dc] = DIP;
  const marks = `${line(X(ct), Y(cc), X(ct), B, { c: k(2), w: 1.6, dash: '4 3' })}${diamond(X(ct), Y(cc), k(2), 9)}
${line(X(dt), Y(dc), X(dt), B, { c: k(1), w: 1.6, dash: '4 3' })}${ring(X(dt), Y(dc), k(1), 7)}
${text(X(ct) - 8, 212, tr('Cost threshold', 'Threshold biaya'), { anchor: 'end', size: 12, weight: 700, fill: k(2) })}
${text(X(ct) - 8, 228, tr(`${pct(ct)}: cost ${fmt(cc, { digits: 2 })}`, `${pct(ct)}: biaya ${fmt(cc, { digits: 2 })}`), { anchor: 'end', size: 12, ...INK })}
${text(X(dt) + 10, 212, tr(`Lowest on the test rows: ${pct(dt)}`, `Terendah pada test rows: ${pct(dt)}`), { anchor: 'start', size: 12, weight: 700, fill: k(1) })}
${text(X(dt) + 10, 228, tr(`cost ${fmt(dc, { digits: 2 })}, found by looking at them`, `biaya ${fmt(dc, { digits: 2 })}, ditemukan dengan melihatnya`), { anchor: 'start', size: 12, ...INK })}`;
  return svg(640, 300, `
${grid}${line(L, B, R, B, { c: 'var(--muted)', w: 1.6 })}${ticks}${refs}${path}${marks}
${text(L + 4, 16, tr('Expected cost per transaction', 'Expected cost per transaksi'), { anchor: 'start', size: 13, ...BOLD })}
${text((L + R) / 2, 288, tr('Threshold (flag a transaction when its probability reaches this)', 'Threshold (tandai transaksi bila probabilitasnya mencapai nilai ini)'), { size: 12 })}`);
}

export const figures = {
  'six-steps': sixSteps,
  'split-optimism': splitOptimism,
  'interval-by-split': intervalBySplit,
  'cost-curve': costCurve,
};
