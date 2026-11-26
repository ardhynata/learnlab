// Figures for the lesson "Shift lab": [[figure:shift-lab/name|Caption]].
// Every number is a measurement from the lab's own math (sims/ml/shift.js and sims/ml/shiftlab.js, k-NN with k = 5,
// 200 train and 200 test rows, Severity 0.8). "Mean of ten samples" means the first sample plus nine presses of New sample
// (seeds 1 to 10). The island figure is the lab's penguin data, first (only) sample.
import { svg, dot, ring, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const NOTE = { size: 12, fill: 'var(--ink)' };
const pct0 = v => `${fmt(v, { digits: 0 })}%`;
const swatch = (x, y, fill, stroke) => `<rect x="${x}" y="${y}" width="16" height="16" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1.6"/>`;

// ---- Figure 1: the five validation setups --------------------------------------------------------------
// Ten cells stand for ten training rows. What happens to each cell in one round of each setup.
const CELL = { fit: [soft(0), k(0)], test: [k(3), k(3)], tune: [soft(1), k(1)], idle: ['var(--surface)', 'var(--line)'] };
const SETUP_ROWS = [
  { key: 'random', cells: 'ffTffffTff' },
  { key: 'grouped', cells: 'fffTTfffff' },
  { key: 'temporal', cells: 'ffffffTTii' },
  { key: 'shifted', cells: 'fffffffTTT' },
  { key: 'nested', cells: 'fffffuuiTT' },
];

function fiveSetups() {
  const names = {
    random: tr('Random k-fold', 'k-fold acak'),
    grouped: tr('Grouped k-fold', 'k-fold berkelompok'),
    temporal: tr('Temporal split', 'Temporal split'),
    shifted: tr('Shifted holdout', 'Holdout bergeser'),
    nested: tr('Nested CV', 'Nested CV'),
  };
  const notes = {
    random: tr(['Held-out rows come', 'from anywhere in the pool'], ['Baris yang ditahan diambil', 'dari mana saja di pool']),
    grouped: tr(['A whole group is held out,', 'never split in two'], ['Satu kelompok utuh ditahan,', 'tidak pernah dipecah']),
    temporal: tr(['Fit on the past, score', 'the next block of time'], ['Latih pada masa lalu, nilai', 'blok waktu berikutnya']),
    shifted: tr(['Holds out the training rows', 'closest to the test inputs'], ['Menahan baris training yang', 'terdekat dengan input test']),
    nested: tr(['The inner loop tunes, the', 'outer fold scores the recipe'], ['Loop dalam men-tuning, fold', 'luar menilai resepnya']),
  };
  const X0 = 176, W = 20, GAP = 4;
  const kinds = { f: 'fit', T: 'test', i: 'idle', u: 'tune' };
  const rows = SETUP_ROWS.map((r, i) => {
    const cy = 30 + i * 46;
    const cells = [...r.cells].map((c, j) => {
      const [fill, stroke] = CELL[kinds[c]];
      return `<rect x="${X0 + j * (W + GAP)}" y="${cy - 11}" width="${W}" height="22" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="1.6"/>`;
    }).join('');
    const [a, b] = notes[r.key];
    return `${text(8, cy + 5, names[r.key], { anchor: 'start', size: 13, ...INK })}${cells}
${text(X0 + 10 * (W + GAP) + 14, cy - 2, a, { anchor: 'start', ...NOTE })}${text(X0 + 10 * (W + GAP) + 14, cy + 13, b, { anchor: 'start', ...NOTE })}`;
  }).join('');
  const lg = [[CELL.fit, tr('Fit the model', 'Melatih model')], [CELL.tune, tr('Choose settings', 'Memilih setelan')], [CELL.test, tr('Held out and scored', 'Ditahan dan dinilai')], [CELL.idle, tr('Not used this round', 'Tidak dipakai')]];
  const legend = lg.map(([[fill, stroke], label], i) => {
    const x = 8 + [0, 138, 288, 458][i];
    return `${swatch(x, 262, fill, stroke)}${text(x + 22, 275, label, { anchor: 'start', size: 12 })}`;
  }).join('');
  return svg(640, 292, `${rows}${legend}`);
}

// ---- Figure 2: one estimate, four different outcomes ------------------------------------------------
// Mean of ten samples, Severity 0.8, drift 0: the random k-fold estimate (it never reads the test set) and the accuracy
// actually measured on the test set. Rounded to whole points: gaps are the difference of the rounded numbers.
const OUTCOMES = [
  { key: 'none', estimate: 88, actual: 88 },
  { key: 'covariate', estimate: 88, actual: 67 },
  { key: 'label', estimate: 88, actual: 89 },
  { key: 'concept', estimate: 88, actual: 59 },
];

// The label of the left marker goes to its left and the label of the right marker to its right, so two close markers never share a label.
function valueLabels(xEst, xAct, y, est, act) {
  const e = { size: 12, fill: k(1), weight: 700 }, a = { size: 12, ...INK };
  return xEst <= xAct
    ? `${text(xEst - 11, y + 4, est, { anchor: 'end', ...e })}${text(xAct + 11, y + 4, act, { anchor: 'start', ...a })}`
    : `${text(xAct - 11, y + 4, act, { anchor: 'end', ...a })}${text(xEst + 11, y + 4, est, { anchor: 'start', ...e })}`;
}

function oneEstimate() {
  const names = {
    none: tr('No shift', 'Tanpa shift'),
    covariate: tr('Covariate shift', 'Covariate shift'),
    label: tr('Label shift', 'Label shift'),
    concept: tr('Concept shift', 'Concept shift'),
  };
  const L = 196, R = 612, X = v => L + (v - 50) / 50 * (R - L);
  const rowY = i => 62 + i * 46;
  let grid = '';
  for (const v of [50, 60, 70, 80, 90, 100]) {
    grid += `${line(X(v), 40, X(v), 224, { w: 1 })}${text(X(v), 242, pct0(v), { size: 12 })}`;
  }
  const rows = OUTCOMES.map((o, i) => {
    const y = rowY(i), gap = o.estimate - o.actual;
    const sign = gap > 0 ? '+' : gap < 0 ? '−' : '';
    const gapText = gap === 0 ? tr('gap 0 points', 'selisih 0 poin') : tr(`gap ${sign}${fmt(Math.abs(gap))} points`, `selisih ${sign}${fmt(Math.abs(gap))} poin`);
    const hot = Math.abs(gap) > 5;
    return `${text(8, y - 2, names[o.key], { anchor: 'start', size: 13, ...INK })}
${text(8, y + 14, gapText, { anchor: 'start', size: 12, fill: hot ? k(0) : 'var(--muted)', weight: hot ? 700 : 500 })}
${line(X(o.actual), y, X(o.estimate), y, { c: hot ? k(0) : 'var(--muted)', w: 2.5 })}
${ring(X(o.estimate), y, k(1), 6)}${dot(X(o.actual), y, 'var(--ink)', 6)}
${valueLabels(X(o.estimate), X(o.actual), y, pct0(o.estimate), pct0(o.actual))}`;
  }).join('');
  const legend = `${ring(200, 16, k(1), 6)}${text(212, 20, tr('Random k-fold estimate', 'Perkiraan k-fold acak'), { anchor: 'start', size: 12 })}
${dot(396, 16, 'var(--ink)', 6)}${text(408, 20, tr('Actual accuracy on the test set', 'Akurasi sebenarnya pada test set'), { anchor: 'start', size: 12 })}`;
  const axis = `${text((L + R) / 2, 260, tr('Accuracy', 'Akurasi'), { size: 12 })}`;
  return svg(640, 270, `${grid}${legend}${rows}${axis}`);
}

// ---- Figure 3: concept shift, as drift grows ------------------------------------------------------------
// Mean of ten samples, Severity 0.8. Index 0..5 is Drift 0, 0.2, ..., 1.
const DRIFT = [0, 0.2, 0.4, 0.6, 0.8, 1];
const DRIFT_ACTUAL = [59.2, 62.15, 66.6, 69.65, 73.6, 76.65];
const DRIFT_RANDOM = [87.85, 86.15, 85.1, 83.5, 81.85, 81.25];
const DRIFT_TEMPORAL = [86.5, 85.06, 83.38, 82.19, 80.69, 79.13];

function driftCurves() {
  const L = 62, R = 462, T = 26, B = 226;
  const X = d => L + d * (R - L), Y = v => B - (v - 55) / 35 * (B - T);
  let grid = '';
  for (const v of [60, 70, 80, 90]) grid += `${line(L, Y(v), R, Y(v), { w: 1 })}${text(L - 8, Y(v) + 4, pct0(v), { anchor: 'end', size: 12 })}`;
  for (const d of DRIFT) grid += `${text(X(d), B + 18, fmt(d, { digits: 1 }), { size: 12 })}`;
  const path = ys => ys.map((v, i) => `${i ? 'L' : 'M'}${X(DRIFT[i])} ${Y(v)}`).join('');
  const series = (ys, color, w, dash) => `<path d="${path(ys)}" fill="none" stroke="${color}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''} stroke-linejoin="round" stroke-linecap="round"/>${ys.map((v, i) => dot(X(DRIFT[i]), Y(v), color, 3.6)).join('')}`;
  // End labels sit at least 15 units apart, top to bottom in the order given.
  const endY = {};
  let prev = -Infinity;
  for (const [name, ys] of [['random', DRIFT_RANDOM], ['temporal', DRIFT_TEMPORAL], ['actual', DRIFT_ACTUAL]]) { prev = Math.max(prev + 15, Y(ys[ys.length - 1])); endY[name] = prev; }
  const end = (ys, color, label, name) => `${line(R + 4, Y(ys[ys.length - 1]), R + 10, endY[name], { c: color, w: 1.2 })}${text(R + 14, endY[name] + 4, `${label} ${pct0(ys[ys.length - 1])}`, { anchor: 'start', size: 12, weight: 700, fill: color })}`;
  const gapX = L + 10;
  const bracket = `${line(gapX, Y(DRIFT_RANDOM[0]), gapX, Y(DRIFT_ACTUAL[0]), { c: 'var(--muted)', w: 1.6, dash: '4 3' })}
${text(gapX + 8, (Y(DRIFT_RANDOM[0]) + Y(DRIFT_ACTUAL[0])) / 2 + 4, tr('29 points too high', '29 poin terlalu tinggi'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}`;
  return svg(640, 274, `${grid}${bracket}${series(DRIFT_ACTUAL, 'var(--ink)', 3)}${series(DRIFT_RANDOM, k(1), 2.4, '6 4')}${series(DRIFT_TEMPORAL, k(2), 2.4)}
${end(DRIFT_RANDOM, k(1), tr('Random', 'Acak'), 'random')}${end(DRIFT_TEMPORAL, k(2), tr('Temporal', 'Temporal'), 'temporal')}${end(DRIFT_ACTUAL, 'var(--ink)', tr('Actual', 'Sebenarnya'), 'actual')}
${text((L + R) / 2, 264, tr('Drift already in the training data', 'Drift yang sudah ada di data training'), { size: 12 })}`);
}

// ---- Figure 4: held-out islands -------------------------------------------------------------------------------
// Penguins (real), sex from bill length and body mass, one island held out. Random k-fold estimate against the actual
// accuracy on that island, for both models. Whole percentages, as the lab shows them.
const ISLANDS = [
  { key: 'Biscoe', rows: [[84, 60], [82, 60]] },
  { key: 'Dream', rows: [[81, 54], [61, 54]] },
  { key: 'Torgersen', rows: [[85, 68], [60, 57]] },
];

function islands() {
  const sub = {
    Biscoe: tr('44 Adelie, 119 Gentoo penguins held out', '44 penguin Adelie, 119 Gentoo ditahan'),
    Dream: tr('55 Adelie, 68 Chinstrap penguins held out', '55 penguin Adelie, 68 Chinstrap ditahan'),
    Torgersen: tr('47 Adelie penguins held out', '47 penguin Adelie ditahan'),
  };
  const models = [tr('k-NN (k = 5)', 'k-NN (k = 5)'), tr('Logistic regression', 'Regresi logistik')];
  const L = 196, R = 606, X = v => L + (v - 40) / 60 * (R - L);
  let grid = '';
  for (const v of [40, 50, 60, 70, 80, 90, 100]) grid += `${line(X(v), 22, X(v), 274, { w: 1 })}${text(X(v), 292, pct0(v), { size: 12 })}`;
  const body = ISLANDS.map((g, gi) => {
    const y0 = 38 + gi * 88;
    const head = `${text(8, y0, g.key, { anchor: 'start', size: 14, ...INK })}${text(112, y0, sub[g.key], { anchor: 'start', size: 12, fill: 'var(--muted)' })}`;
    const rows = g.rows.map(([est, act], ri) => {
      const y = y0 + 26 + ri * 26;
      return `${text(L - 10, y + 4, models[ri], { anchor: 'end', size: 12, fill: 'var(--ink)' })}
${line(X(act), y, X(est), y, { c: k(0), w: 2.5 })}${ring(X(est), y, k(1), 5.5)}${dot(X(act), y, 'var(--ink)', 5.5)}
${text(X(act) - 10, y + 4, pct0(act), { anchor: 'end', size: 11, ...INK })}${text(X(est) + 10, y + 4, pct0(est), { anchor: 'start', size: 11, fill: k(1), weight: 700 })}`;
    }).join('');
    return head + rows;
  }).join('');
  const legend = `${ring(200, 10, k(1), 5.5)}${text(210, 14, tr('Random k-fold estimate', 'Perkiraan k-fold acak'), { anchor: 'start', size: 12 })}
${dot(394, 10, 'var(--ink)', 5.5)}${text(404, 14, tr('Actual accuracy, held-out island', 'Akurasi sebenarnya, pulau ditahan'), { anchor: 'start', size: 12 })}`;
  return svg(640, 316, `${grid}${legend}${body}${text((L + R) / 2, 310, tr('Accuracy', 'Akurasi'), { size: 12 })}`);
}

export const figures = {
  'five-setups': fiveSetups,
  'one-estimate': oneEstimate,
  'drift-curves': driftCurves,
  islands,
};
