// Figures for the lesson "Advanced capstone project": [[figure:advanced-capstone-project/name|Caption]].
// Every number is a real result of the Level 3 capstone workbench (sims/labs/capstone-l3.js; math in sims/ml/capstone3.js,
// capstone3lab.js and capstone3report.js) on its synthetic scenario 1 (generator seed 4: 2,880 labelled cases of 36
// entities over 36 days, 161 of them positive, 80 cases a day after launch for 54 days, a hidden covariate drift of
// amount from day 46), with the lab's own defaults: a miss costs 100, a review 5, a false alarm 5 extra, 24 reviews a
// day, and the default monitoring plan of the lab (PSI above 0.25 over 7 days, 2 days in a row; score PSI above 0.25 over
// 7 days; delayed AUC more than 0.10 below the history over 14 days; share of positives 1.5 times the history over
// 14 days). Text is built when drawn, so tr() and fmt() follow the language.
import { svg, dot, ring, diamond, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';

const INK = { fill: 'var(--ink)' };
const BOLD = { weight: 700, fill: 'var(--ink)' };
const d2 = v => fmt(v, { digits: 2 });
const sign = v => `${v < 0 ? '−' : '+'}${d2(Math.abs(v))}`;

// ---- Figure 1: the seven steps and what the lab checks before it opens the next one. ----
function sevenSteps() {
  const steps = [
    [tr('Frame', 'Rumuskan'), [tr('costs set, cost metric,', 'biaya, metrik biaya,'), tr('two reasons ticked', 'dua alasan dicentang')], 0],
    [tr('Split', 'Split'), [tr('split compared', 'split dibandingkan'), tr('and defended', 'dan dibela')], 1],
    [tr('Models', 'Model'), [tr('searches run, models', 'pencarian jalan, model'), tr('scored, one chosen', 'dinilai, satu dipilih')], 2],
    [tr('Repro', 'Repro'), [tr('recorded, rerun,', 'dicatat, rerun,'), tr('a change breaks it', 'ubahan merusaknya')], 3],
    [tr('Monitor', 'Monitor'), [tr('the replay catches', 'replay menangkap'), tr('the failure', 'kegagalan')], 4],
    [tr('Probe', 'Selidiki'), [tr('cause confirmed,', 'penyebab terkonfirmasi,'), tr('remedy applied', 'perbaikan diterapkan')], 5],
    [tr('Report', 'Laporan'), [tr('six texts and', 'enam teks dan'), tr('five ratings', 'lima penilaian')], 6],
  ];
  const w = 160, h = 96, gap = 18, x0 = 3, xs = [0, 1, 2, 3].map(i => x0 + i * (w + gap)), ys = [14, 148];
  const cell = ([title, done, c], i) => {
    const x = xs[i % 4], y = ys[Math.floor(i / 4)];
    return `${box(x, y, w, h, soft(c), k(c))}
${ring(x + 22, y + 24, k(c), 12)}${text(x + 22, y + 29, fmt(i + 1), { ...BOLD, size: 14 })}
${text(x + 42, y + 29, title, { anchor: 'start', ...BOLD, size: 14 })}
${text(x + 12, y + 55, tr('done when', 'selesai bila'), { anchor: 'start', size: 12 })}
${text(x + 12, y + 72, done[0], { anchor: 'start', size: 12, ...INK })}
${text(x + 12, y + 88, done[1], { anchor: 'start', size: 12, ...INK })}`;
  };
  const arrow = (r, i) => line(xs[i] + w + 3, ys[r] + h / 2, xs[i + 1] - 3, ys[r] + h / 2, { c: 'var(--muted)', w: 2, arrow: true });
  const row1 = [0, 1, 2].map(i => arrow(0, i)).join('');
  const row2 = [0, 1].map(i => arrow(1, i)).join('');
  const turn = `${line(xs[3] + w / 2, ys[0] + h + 2, xs[3] + w / 2, 128, { c: 'var(--muted)', w: 2 })}${line(xs[3] + w / 2, 128, xs[0] + w / 2, 128, { c: 'var(--muted)', w: 2 })}${line(xs[0] + w / 2, 128, xs[0] + w / 2, ys[1] - 4, { c: 'var(--muted)', w: 2, arrow: true })}`;
  const nx = xs[3] + w / 2;
  const note = `${text(nx, ys[1] + 28, tr('Each step reads', 'Tiap langkah tertulis'), { size: 12 })}${text(nx, ys[1] + 48, tr('Done', 'Selesai'), { size: 13, ...BOLD })}${text(nx, ys[1] + 66, tr('To do', 'Belum'), { size: 13, ...BOLD })}${text(nx, ys[1] + 84, tr('Locked', 'Terkunci'), { size: 13, ...BOLD })}`;
  return svg(700, 262, `${steps.map(cell).join('')}${row1}${row2}${turn}${note}`);
}

// ---- Figure 2: how much each split flatters, for the reference forest. ----
// [name, color, AUC on the split's test side, AUC on new entities after launch, entities on both sides]
const SPLITS = [
  [() => tr('Random', 'Acak'), 1, 0.8405, 0.6703, 36],
  [() => tr('Grouped by entity', 'Per entitas'), 2, 0.6387, 0.6194, 0],
  [() => tr('Temporal', 'Temporal'), 0, 0.8292, 0.7116, 36],
];
function splitGap() {
  const L = 200, R = 430, top = 106, rh = 52, B = top + SPLITS.length * rh;
  const X = v => L + (v - 0.5) / 0.5 * (R - L);
  const grid = [0.5, 0.6, 0.7, 0.8, 0.9, 1].map(v => `${line(X(v), top - 8, X(v), B, { c: 'var(--line)', w: 1 })}${text(X(v), B + 18, fmt(v, { digits: 1 }), { size: 12 })}`).join('');
  const rows = SPLITS.map(([name, c, est, real, shared], i) => {
    const y = top + i * rh + rh / 2, gap = est - real;
    return `${text(10, y + 5, name(), { anchor: 'start', ...BOLD, size: 14 })}
${line(X(real), y, X(est), y, { c: k(c), w: 3 })}${ring(X(real), y, k(c), 7)}${dot(X(est), y, k(c), 7)}
${text(X(est), y - 13, d2(est), { ...BOLD, size: 13 })}${text(X(real), y + 24, d2(real), { size: 12, ...INK })}
${text(496, y + 6, sign(gap), { anchor: 'middle', ...BOLD, size: 18, fill: gap > 0.05 ? k(1) : k(2) })}
${text(620, y + 6, fmt(shared, { digits: 0 }), { anchor: 'middle', ...BOLD, size: 18, fill: shared ? k(1) : k(2) })}`;
  }).join('');
  return svg(660, B + 56, `
${text(10, 22, tr('Split', 'Split'), { anchor: 'start', ...BOLD, size: 13 })}
${dot(L + 6, 62, 'var(--ink)', 6)}${text(L + 18, 66, tr('AUC on the split\'s test side', 'AUC pada sisi test split'), { anchor: 'start', size: 12, ...INK })}
${ring(L + 6, 82, 'var(--ink)', 6)}${text(L + 18, 86, tr('AUC on new entities after launch', 'AUC pada entitas baru setelah peluncuran'), { anchor: 'start', size: 12, ...INK })}
${text(496, 22, tr('The split', 'Split'), { ...BOLD, size: 13 })}${text(496, 40, tr('flatters by', 'memuji sebesar'), { ...BOLD, size: 13 })}
${text(620, 22, tr('Entities on', 'Entitas di'), { ...BOLD, size: 13 })}${text(620, 40, tr('both sides', 'kedua sisi'), { ...BOLD, size: 13 })}
${grid}${line(X(0.5), top - 8, X(0.5), B, { c: 'var(--muted)', w: 1.6, dash: '5 4' })}${rows}
${text(X(0.5), B + 36, tr('0.5 = coin flip', '0,5 = lempar koin'), { size: 12 })}`);
}

// ---- Figure 3: the first true alert of four monitors, scenario 1. ----
// [name, color, first true alert (null: none), cost until detection]
const FAIL_DAY = 46, LAST_DAY = 89, FIRST_DAY = 36;
const MONITORS = [
  [() => tr('Input drift', 'Input drift'), 0, 49, 453],
  [() => tr('Score drift', 'Score drift'), 1, 49, 453],
  [() => tr('Positive share', 'Porsi positif'), 2, 56, 989],
  [() => tr('Delayed accuracy', 'Delayed accuracy'), 3, null, 5765],
];
function detectionRace() {
  const L = 150, R = 520, top = 64, rh = 48, B = top + MONITORS.length * rh;
  const X = d => L + (d - FIRST_DAY) / (LAST_DAY - FIRST_DAY) * (R - L);
  const ticks = [40, 50, 60, 70, 80, LAST_DAY].map(d => `${line(X(d), top - 6, X(d), B, { c: 'var(--line)', w: 1 })}${text(X(d), B + 18, fmt(d), { size: 12 })}`).join('');
  const rows = MONITORS.map(([name, c, day, cost], i) => {
    const y = top + i * rh + rh / 2;
    const mark = day == null
      ? `${line(X(FAIL_DAY), y, X(LAST_DAY) - 4, y, { c: k(c), w: 3, dash: '2 6' })}${text(X(66), y - 12, tr(`no alert before day ${fmt(LAST_DAY)}`, `tidak ada alert sebelum hari ke-${fmt(LAST_DAY)}`), { size: 12, ...INK })}`
      : `${line(X(FAIL_DAY), y, X(day), y, { c: k(c), w: 4 })}${diamond(X(day), y, k(c), 9)}${text(X(day) + 14, y + 5, tr(`day ${fmt(day)}, ${fmt(day - FAIL_DAY)} days later`, `hari ke-${fmt(day)}, ${fmt(day - FAIL_DAY)} hari kemudian`), { anchor: 'start', size: 12, ...INK })}`;
    return `${text(10, y + 5, name(), { anchor: 'start', ...BOLD, size: 14 })}${mark}
${text(660, y + 6, fmt(cost, { digits: 0 }), { anchor: 'end', ...BOLD, size: 16 })}${day == null ? text(660, y + 24, tr('never detected', 'tidak terdeteksi'), { anchor: 'end', size: 12 }) : ''}`;
  }).join('');
  return svg(680, B + 52, `
${text(10, 24, tr('Monitor', 'Monitor'), { anchor: 'start', ...BOLD, size: 13 })}
${text(660, 24, tr('Cost until', 'Biaya sampai'), { anchor: 'end', ...BOLD, size: 13 })}${text(660, 42, tr('detection', 'terdeteksi'), { anchor: 'end', ...BOLD, size: 13 })}
${ticks}
${line(X(FAIL_DAY), top - 12, X(FAIL_DAY), B, { c: 'var(--ink)', w: 2.2 })}
${text(X(FAIL_DAY) - 6, top - 18, tr(`The failure began on day ${fmt(FAIL_DAY)}`, `Kegagalan dimulai pada hari ke-${fmt(FAIL_DAY)}`), { anchor: 'start', ...BOLD, size: 13 })}
${rows}
${text((L + R) / 2, B + 38, tr('day of the stream', 'hari dalam stream'), { size: 12 })}`);
}

// ---- Figure 4: the evidence of scenario 1 on day 63. ----
// [feature, PSI on the last 10 days against the history, identifier]
const PSI = [['amount', 2.37, false], ['velocity', 0.01, false], ['merchantRisk', 0.01, false], ['accountAge', 0.03, false], ['deviceId', 0.097, true]];
function evidencePsi() {
  const L = 150, R = 340, top = 62, rh = 40, B = top + PSI.length * rh, XMAX = 2.5;
  const X = v => L + v / XMAX * (R - L);
  const grid = [0, 0.5, 1, 1.5, 2, 2.5].map(v => `${line(X(v), top - 6, X(v), B, { c: 'var(--line)', w: 1 })}${text(X(v), B + 18, fmt(v, { digits: 1 }), { size: 12 })}`).join('');
  const thr = [[0.1, k(1)], [0.25, k(2)]].map(([v, c]) => line(X(v), top - 10, X(v), B, { c, w: 1.8, dash: '4 3' })).join('');
  const bars = PSI.map(([f, v, id], i) => {
    const y = top + i * rh + rh / 2, big = v > 0.25 && !id;
    const label = id ? tr('deviceId (identifier)', 'deviceId (pengenal)') : f;
    return `${text(L - 8, y + 5, label, { anchor: 'end', ...BOLD, size: 12 })}
<rect x="${L}" y="${y - 10}" width="${Math.max(2, X(v) - L).toFixed(1)}" height="20" rx="3" fill="${big ? k(2) : 'var(--muted)'}"/>
${text(R + 12, y + 5, fmt(v, { digits: id ? 3 : 2 }), { anchor: 'start', ...BOLD, size: 13 })}`;
  }).join('');
  const tile = (y, title, big, sub) => `${box(410, y, 256, 70, 'var(--surface)', 'var(--line)')}
${text(424, y + 22, title, { anchor: 'start', size: 12 })}${text(424, y + 48, big, { anchor: 'start', size: 22, ...BOLD })}${text(424, y + 64, sub, { anchor: 'start', size: 12, ...INK })}`;
  return svg(680, B + 56, `
${text(10, 22, tr('Evidence 1: feature PSI against the history', 'Bukti 1: PSI feature terhadap riwayat'), { anchor: 'start', ...BOLD, size: 13 })}
${text(10, 40, tr('dashed: 0.10 and 0.25', 'putus-putus: 0,10 dan 0,25'), { anchor: 'start', size: 12 })}
${grid}${thr}${bars}
${text(410, 22, tr('Is the model still right?', 'Apakah model masih benar?'), { anchor: 'start', ...BOLD, size: 13 })}
${tile(34, tr('Served value ≠ offline value', 'Nilai disajikan ≠ nilai offline'), pct(0, 0), tr('on every feature', 'pada setiap feature'))}
${tile(114, tr('Delayed AUC', 'AUC tertunda'), d2(0.7980), tr(`before launch: ${d2(0.7921)}`, `sebelum peluncuran: ${d2(0.7921)}`))}
${tile(194, tr('Observed positive share', 'Porsi positif teramati'), pct(0.15125, 1), tr(`mean predicted score: ${pct(0.1503, 1)}`, `rata-rata skor prediksi: ${pct(0.1503, 1)}`))}`);
}

export const figures = {
  'seven-steps': sevenSteps,
  'split-gap': splitGap,
  'detection-race': detectionRace,
  'evidence-psi': evidencePsi,
};
