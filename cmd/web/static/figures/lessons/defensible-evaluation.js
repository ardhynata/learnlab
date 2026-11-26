// Figures for the lesson "Defending an evaluation": [[figure:defensible-evaluation/name|Caption]].
// Every number is the one in the lesson text. The project is invented: 500 patients with four discharges each,
// a miss costs 500 and a false alarm 100. The threshold table comes from out-of-fold predictions on 400 tuning
// patients (1,600 discharges); the test set is 100 other patients (400 discharges). Simulated, fixed seeds.
import { svg, dot, ring, diamond, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };

// ---- the five questions -----------------------------------------------------------------------------
function fiveQuestions() {
  const rows = [
    [tr('Split', 'Split'), tr('What will be new when it is used?', 'Apa yang baru saat model dipakai?'), tr(['Cut by group or by time,', 'matching the use'], ['Potong per grup atau waktu,', 'sesuai pemakaian'])],
    [tr('Metric', 'Metrik'), tr('What does a mistake cost?', 'Berapa biaya satu kesalahan?'), tr(['Cost, beside two baselines', 'that need no model'], ['Biaya, di samping dua baseline', 'yang tanpa model'])],
    [tr('Tuning', 'Tuning'), tr('What did you choose on?', 'Pada data apa kamu memilih?'), tr(['Tuning rows only;', 'the test set stays closed'], ['Hanya baris tuning;', 'test set tetap tertutup'])],
    [tr('Threshold', 'Threshold'), tr('Which cut do you act on?', 'Threshold mana yang kamu pakai?'), tr(['Lowest cost on', 'out-of-fold predictions'], ['Biaya terendah pada', 'prediksi out-of-fold'])],
    [tr('Interval', 'Interval'), tr('How sure are you?', 'Seberapa yakin kamu?'), tr(['Bootstrap over whole', 'patients, not rows'], ['Bootstrap atas pasien', 'utuh, bukan baris'])],
  ];
  const X1 = 10, W1 = 320, X2 = 392, W2 = 238, H = 46, T = 46, G = 12;
  const body = rows.map(([title, q, a], i) => {
    const y = T + i * (H + G);
    return `${box(X1, y, W1, H, 'var(--surface)', 'var(--line)')}
${dot(X1 + 26, y + H / 2, k(i), 15)}${text(X1 + 26, y + H / 2 + 5, fmt(i + 1), { size: 14, weight: 700, fill: '#fff' })}
${text(X1 + 52, y + 19, title, { anchor: 'start', size: 14, weight: 700, fill: 'var(--ink)' })}
${text(X1 + 52, y + 37, q, { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${line(X1 + W1 + 6, y + H / 2, X2 - 6, y + H / 2, { c: 'var(--muted)', w: 2, arrow: true })}
${box(X2, y, W2, H, soft(i), k(i))}
${text(X2 + W2 / 2, y + 19, a[0], { size: 12, ...INK })}${text(X2 + W2 / 2, y + 36, a[1], { size: 12, ...INK })}`;
  }).join('');
  return svg(640, T + rows.length * (H + G) - G + 10, `
${text(X1 + W1 / 2, 28, tr('The question', 'Pertanyaan'), { size: 14, ...INK })}
${text(X2 + W2 / 2, 28, tr('What you show', 'Yang kamu tunjukkan'), { size: 14, ...INK })}
${body}`);
}

// ---- siblings in training ---------------------------------------------------------------------------
// A test discharge has three other discharges from the same patient. Under a random cut with 20% in the test
// set, each is in training with probability 0.8 (independent, in this lesson); under a grouped cut none is.
function samePatientRows() {
  const binom = (n, j, p) => [1, 3, 3, 1][j] * p ** j * (1 - p) ** (n - j);
  const random = [0, 1, 2, 3].map(j => binom(3, j, 0.8));
  const grouped = [1, 0, 0, 0];
  const W = 258, T = 62, B = 214, H = B - T;
  const panel = (x0, title, vals, col, note) => {
    const bw = 44, step = (W - 20) / 4;
    const axis = `${line(x0, B, x0 + W, B, { c: 'var(--muted)', w: 1.6 })}${[0, 0.5, 1].map(v => `${line(x0, B - v * H, x0 + W, B - v * H, { c: 'var(--line)', w: 1 })}${text(x0 - 6, B - v * H + 4, pct(v, 0), { anchor: 'end', size: 12 })}`).join('')}`;
    const bars = vals.map((v, j) => {
      const cx = x0 + 10 + step * (j + 0.5), h = v * H;
      return `<rect x="${cx - bw / 2}" y="${B - h}" width="${bw}" height="${Math.max(h, 0)}" rx="5" fill="${j === 0 ? 'var(--muted)' : col}" opacity="${j === 0 ? 0.55 : 1}"/>
${text(cx, B - h - 6, pct(v, 1), { size: 12, ...INK })}${text(cx, B + 18, fmt(j), { size: 13, fill: 'var(--ink)' })}`;
    }).join('');
    return `${text(x0 + W / 2, 28, title, { size: 15, weight: 700, fill: col })}${axis}${bars}
${text(x0 + W / 2, B + 40, note, { size: 13, ...INK, fill: col })}`;
  };
  const atLeast = 1 - random[0];
  return svg(640, 292, `
${panel(52, tr('Random cut', 'Potongan acak'), random, k(1), tr(`At least one in training: ${pct(atLeast, 1)}`, `Minimal satu di data latih: ${pct(atLeast, 1)}`))}
${panel(366, tr('Grouped cut', 'Potongan berkelompok'), grouped, k(2), tr('At least one in training: 0%', 'Minimal satu di data latih: 0%'))}
${text(320, 284, tr('x: siblings of a test discharge that are in training. y: share of test discharges', 'x: saudara satu pasien dari satu baris uji yang ada di data latih. y: porsi baris uji'), { size: 12 })}`);
}

// ---- cost per discharge by threshold ----------------------------------------------------------------
// Out-of-fold predictions on 1,600 tuning discharges: [threshold, missed, false alarms]. Cost = 500 x missed + 100 x false alarms.
const TABLE = [[0.5, 85, 31], [0.4, 73, 51], [0.3, 64, 92], [0.2, 42, 172], [0.15, 37, 236], [0.1, 26, 324], [0.06, 17, 463]];
const N_TUNE = 1600, N_POS = 144;
const costPer = (miss, fa) => (500 * miss + 100 * fa) / N_TUNE;

function costByThreshold() {
  const L = 62, R = 622, T = 34, B = 232;
  const X = i => L + 30 + i * (R - L - 60) / (TABLE.length - 1);
  const Y = v => B - v / 100 * (B - T);
  const pts = TABLE.map(([t, m, f], i) => [X(i), Y(costPer(m, f)), costPer(m, f), t]);
  const best = pts.reduce((a, p) => (p[2] < a[2] ? p : a));
  const never = 500 * N_POS / N_TUNE, all = 100 * (N_TUNE - N_POS) / N_TUNE;
  const grid = [0, 25, 50, 75, 100].map(v => `${line(L, Y(v), R, Y(v), { c: 'var(--line)', w: 1 })}${text(L - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const ticks = pts.map(p => `${line(p[0], B, p[0], B + 5, { c: 'var(--muted)', w: 1.4 })}${text(p[0], B + 20, fmt(p[3]), { size: 12, fill: 'var(--ink)' })}`).join('');
  const path = `<path d="M${pts.map(p => `${p[0]} ${p[1]}`).join('L')}" fill="none" stroke="${k(0)}" stroke-width="2.6" stroke-linejoin="round"/>`;
  const dots = pts.map(p => (p === best ? '' : dot(p[0], p[1], k(0), 5))).join('');
  return svg(640, 292, `
${grid}${line(L, B, R, B, { c: 'var(--muted)', w: 1.6 })}${ticks}
${line(L, Y(never), R, Y(never), { c: k(1), w: 2, dash: '7 5' })}${text(R - 4, Y(never) - 7, tr(`Never call: ${fmt(never, { digits: 1 })}`, `Tidak pernah menelepon: ${fmt(never, { digits: 1 })}`), { anchor: 'end', size: 12, ...INK, fill: k(1) })}
${line(L, Y(all), R, Y(all), { c: k(3), w: 2, dash: '7 5' })}${text(R - 4, Y(all) - 7, tr(`Call everyone: ${fmt(all, { digits: 1 })}`, `Telepon semua: ${fmt(all, { digits: 1 })}`), { anchor: 'end', size: 12, ...INK, fill: k(3) })}
${path}${dots}${diamond(best[0], best[1], k(2), 10)}
${text(best[0], best[1] + 32, tr(`Lowest: threshold ${fmt(best[3])}, cost ${fmt(best[2], { digits: 1 })}`, `Terendah: threshold ${fmt(best[3])}, biaya ${fmt(best[2], { digits: 1 })}`), { size: 13, ...INK, fill: k(2) })}
${text(pts[0][0], pts[0][1] - 12, tr('Accuracy would pick this', 'Accuracy akan memilih ini'), { anchor: 'start', size: 12, ...INK })}
${text(L + 4, 20, tr('Cost per discharge', 'Biaya per discharge'), { anchor: 'start', size: 13, ...INK })}
${text((L + R) / 2, 270, tr('Threshold (score at or above it gets a call)', 'Threshold (skor di atas atau sama dengannya dihubungi)'), { size: 12 })}
${text(R, 20, tr('Out-of-fold, 1,600 discharges', 'Out-of-fold, 1.600 discharge'), { anchor: 'end', size: 12 })}`);
}

// ---- the test cost with its interval ----------------------------------------------------------------
// The 100 test patients, four discharges each. One character per discharge at threshold 0.2:
// 0 = right call (cost 0), 1 = false alarm (cost 100), 2 = missed readmission (cost 500).
const PATIENTS = ['0000', '0000', '0000', '0000', '0000', '1111', '0000', '1001', '0200', '0020', '0100', '2002', '0000', '0000', '0100', '0000', '0000', '0000', '0022', '0002',
  '0000', '0000', '0000', '0000', '0000', '0000', '0000', '0000', '0000', '2000', '0000', '0101', '0000', '0000', '0000', '0000', '0110', '0000', '0000', '0001',
  '0100', '0000', '0000', '0000', '1111', '0000', '0000', '0110', '0000', '0000', '1010', '0000', '0000', '0000', '0002', '0000', '0000', '0000', '0000', '0000',
  '0000', '2020', '0000', '0000', '0000', '0000', '0000', '0000', '0200', '0000', '0000', '0002', '0000', '0000', '0000', '2002', '0000', '0000', '0000', '0000',
  '0000', '2000', '0000', '0000', '0000', '0000', '0100', '2020', '1011', '0000', '0000', '0000', '0110', '0000', '0000', '1110', '0000', '0000', '0000', '0000'];
const COST = { 0: 0, 1: 100, 2: 500 };
const TUNING_ESTIMATE = costPer(42, 172);
const NEVER_CALL_TEST = 22000 / 400;

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 2,000 resamples, seed 5: of whole patients, and of discharges as if independent. Computed once.
let cached = null;
function bootstrap() {
  if (cached) return cached;
  const rand = mulberry32(5), B = 2000;
  const perPatient = PATIENTS.map(s => [...s].reduce((a, c) => a + COST[c], 0));
  const perRow = PATIENTS.flatMap(s => [...s].map(c => COST[c]));
  const byPatient = [], byRow = [];
  for (let b = 0; b < B; b++) {
    let sum = 0;
    for (let i = 0; i < perPatient.length; i++) sum += perPatient[Math.floor(rand() * perPatient.length)];
    byPatient.push(sum / perRow.length);
    sum = 0;
    for (let i = 0; i < perRow.length; i++) sum += perRow[Math.floor(rand() * perRow.length)];
    byRow.push(sum / perRow.length);
  }
  const pick = (arr, q) => [...arr].sort((x, y) => x - y)[Math.round(q * (arr.length - 1))];
  cached = {
    cost: perRow.reduce((a, b) => a + b, 0) / perRow.length,
    patients: [pick(byPatient, 0.025), pick(byPatient, 0.975)],
    rows: [pick(byRow, 0.025), pick(byRow, 0.975)],
  };
  return cached;
}

function intervalByPatient() {
  const { cost, patients, rows } = bootstrap();
  const L = 190, R = 612, T = 70, B = 176;
  const X = v => L + v / 100 * (R - L);
  const grid = [0, 20, 40, 60, 80, 100].map(v => `${line(X(v), T - 6, X(v), B, { c: 'var(--line)', w: 1 })}${text(X(v), B + 18, fmt(v), { size: 12 })}`).join('');
  const bar = (y, [lo, hi], col, label) => `${line(X(lo), y, X(hi), y, { c: col, w: 6 })}${line(X(lo), y - 9, X(lo), y + 9, { c: col, w: 3 })}${line(X(hi), y - 9, X(hi), y + 9, { c: col, w: 3 })}
${dot(X(cost), y, 'var(--ink)', 5.5)}
${text(L - 12, y + 4, label[0], { anchor: 'end', size: 13, ...INK })}
${text(X(lo) - 8, y + 4, fmt(lo, { digits: 1 }), { anchor: 'end', size: 12, ...INK, fill: col })}${text(X(hi) + 8, y + 4, fmt(hi, { digits: 1 }), { anchor: 'start', size: 12, ...INK, fill: col })}`;
  const ref = (v, col, lines, dy) => `${line(X(v), T - 6, X(v), B, { c: col, w: 2, dash: '6 4' })}${lines.map((s, i) => text(X(v), 22 + dy + i * 15, s, { size: 12, ...INK, fill: col })).join('')}`;
  return svg(640, 258, `
${grid}${line(L, B, R, B, { c: 'var(--muted)', w: 1.6 })}
${ref(TUNING_ESTIMATE, k(2), tr(['Tuning', `estimate ${fmt(TUNING_ESTIMATE, { digits: 1 })}`], ['Perkiraan', `tuning ${fmt(TUNING_ESTIMATE, { digits: 1 })}`]), 0)}
${ref(NEVER_CALL_TEST, k(1), tr(['Never call', fmt(NEVER_CALL_TEST, { digits: 1 })], ['Tidak pernah', `menelepon ${fmt(NEVER_CALL_TEST, { digits: 1 })}`]), 0)}
${bar(T + 28, rows, k(3), [tr('Resample 400 discharges', 'Resample 400 discharge')])}
${bar(T + 74, patients, k(0), [tr('Resample 100 patients', 'Resample 100 pasien')])}
${dot(L + 6, 244, 'var(--ink)', 5.5)}${text(L + 18, 248, tr(`Test cost ${fmt(cost, { digits: 2 })}`, `Biaya uji ${fmt(cost, { digits: 2 })}`), { anchor: 'start', size: 12, ...INK })}
${text((L + R) / 2, 222, tr('Cost per discharge on the test set, with the 95% bootstrap interval', 'Biaya per discharge pada test set, dengan interval bootstrap 95%'), { size: 12 })}`);
}

export const figures = {
  'five-questions': fiveQuestions,
  'same-patient-rows': samePatientRows,
  'cost-by-threshold': costByThreshold,
  'interval-by-patient': intervalByPatient,
};
