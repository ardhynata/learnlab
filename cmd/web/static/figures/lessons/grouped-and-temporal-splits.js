// Figures for the lesson "Grouped and temporal splits": [[figure:grouped-and-temporal-splits/name|Caption]].
// Every number is the one in the lesson text: the six invented patients (twelve visits, resting heart rate),
// and the twelve invented monthly sales with the "average of the two closest training months" model.
import { svg, dot, ring, cross, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };

// ---- the six patients -------------------------------------------------------------------------------
const PATIENTS = [['A', [62, 63]], ['B', [67, 68]], ['C', [70, 71]], ['D', [75, 76]], ['E', [80, 81]], ['F', [83, 84]]];

// Figure 1: the same twelve rows cut two ways. Solid cells are test rows, light cells are training rows.
function randomVsGrouped() {
  const CW = 23, GAP = 3, STEP = 51, CH = 28, Y = 70;
  // [patient index, visit index] of the test rows in each panel.
  const randomTest = new Set(['0:1', '2:0', '3:1', '5:0']);
  const groupedTest = new Set(['1:0', '1:1', '4:0', '4:1']);
  const panel = (x0, title, testSet, note, verdict, col) => {
    const cells = PATIENTS.map(([name, hr], i) => {
      const px = x0 + i * STEP;
      const parts = hr.map((v, j) => {
        const x = px + j * (CW + GAP), isTest = testSet.has(`${i}:${j}`);
        return `<rect x="${x}" y="${Y}" width="${CW}" height="${CH}" rx="5" fill="${isTest ? k(i) : soft(i)}" stroke="${k(i)}" stroke-width="1.8"/>${text(x + CW / 2, Y + 18, fmt(v), { size: 11, weight: 700, fill: isTest ? '#fff' : 'var(--ink)' })}`;
      }).join('');
      const split = testSet.has(`${i}:0`) !== testSet.has(`${i}:1`);
      const mid = px + CW + GAP / 2;
      const arc = split ? `<path d="M${px + CW / 2} ${Y - 4}Q${mid} ${Y - 24} ${px + CW + GAP + CW / 2} ${Y - 4}" stroke="var(--ink)" stroke-width="2" fill="none" stroke-linecap="round"/>` : '';
      return `${parts}${arc}${text(mid, Y + CH + 20, name, { size: 13, weight: 700, fill: k(i) })}`;
    }).join('');
    return `${text(x0 + (6 * STEP - 5) / 2, 28, title, { size: 15, weight: 700, fill: col })}
${cells}
${note.map((s, j) => text(x0 + (6 * STEP - 5) / 2, 140 + j * 16, s, { size: 12, fill: 'var(--ink)' })).join('')}
${verdict.map((s, j) => text(x0 + (6 * STEP - 5) / 2, 180 + j * 16, s, { size: 12, ...INK, fill: col })).join('')}`;
  };
  return svg(640, 258, `
${panel(8, tr('Random split', 'Split acak'), randomTest,
    tr(['Arcs: a test visit whose patient', 'is also in training'], ['Lengkung: kunjungan uji yang', 'pasiennya juga ada di data latih']),
    tr(['One visit held out at a time:', `${fmt(12)} of ${fmt(12)} right`], ['Satu kunjungan ditahan tiap kali:', `${fmt(12)} dari ${fmt(12)} benar`]), k(1))}
${panel(328, tr('Grouped split', 'Grouped split'), groupedTest,
    tr(['No patient has rows', 'on both sides'], ['Tidak ada pasien yang barisnya', 'ada di kedua sisi']),
    tr(['One patient held out at a time:', `${fmt(5)} of ${fmt(12)} right`], ['Satu pasien ditahan tiap kali:', `${fmt(5)} dari ${fmt(12)} benar`]), k(2))}
<rect x="90" y="226" width="22" height="16" rx="4" fill="${k(0)}" stroke="${k(0)}" stroke-width="1.8"/>${text(118, 239, tr('test row (example cut)', 'baris uji (contoh potongan)'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
<rect x="330" y="226" width="22" height="16" rx="4" fill="${soft(0)}" stroke="${k(0)}" stroke-width="1.8"/>${text(358, 239, tr('training row (number = heart rate)', 'baris latih (angka = detak jantung)'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}`);
}

// ---- the monthly sales ------------------------------------------------------------------------------
const SALES = [100, 108, 115, 121, 130, 138, 147, 153, 162, 170, 179, 188];

// The model: the average of the two training months closest in time (ties by the earlier month).
function predictMonth(month, trainMonths) {
  const near = [...trainMonths].sort((a, b) => Math.abs(a - month) - Math.abs(b - month) || a - b).slice(0, 2);
  return (SALES[near[0] - 1] + SALES[near[1] - 1]) / 2;
}
function evaluate(testMonths) {
  const train = SALES.map((_, i) => i + 1).filter(m => !testMonths.includes(m));
  const preds = testMonths.map(m => predictMonth(m, train));
  const errs = testMonths.map((m, i) => Math.abs(preds[i] - SALES[m - 1]));
  return { train, preds, mean: errs.reduce((a, b) => a + b, 0) / errs.length };
}

// Figure 2: the same model and the same sales under a random and a temporal split.
function futureLeak() {
  const W = 262, T = 52, B = 198;
  const X = (x0, m) => x0 + 14 + (m - 1) / 11 * (W - 28);
  const Yv = v => B - (v - 90) / 110 * (B - T);
  const panel = (x0, title, testMonths, col, ev) => {
    const axis = `${line(x0, B, x0 + W, B, { c: 'var(--muted)', w: 1.6 })}${[1, 4, 7, 10, 12].map(m => `${line(X(x0, m), B, X(x0, m), B + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(x0, m), B + 20, fmt(m), { size: 12 })}`).join('')}
${[100, 150, 200].map(v => `${line(x0, Yv(v), x0 + W, Yv(v), { c: 'var(--line)', w: 1 })}${text(x0 - 6, Yv(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('')}`;
    const pts = SALES.map((v, i) => {
      const m = i + 1, ti = testMonths.indexOf(m);
      if (ti < 0) return dot(X(x0, m), Yv(v), k(0), 5.5);
      const p = ev.preds[ti];
      return `${line(X(x0, m), Yv(v), X(x0, m), Yv(p), { c: col, w: 2.4 })}${ring(X(x0, m), Yv(v), k(4), 5.5)}${cross(X(x0, m), Yv(p), col)}`;
    }).join('');
    return `${text(x0 + W / 2, 24, title, { size: 15, weight: 700, fill: col })}${axis}${pts}
${text(x0 + W / 2, B + 44, tr(`Mean error: ${fmt(ev.mean)} units`, `Rata-rata galat: ${fmt(ev.mean)} unit`), { size: 13, weight: 700, fill: col })}`;
  };
  const rnd = [2, 5, 8, 11], tmp = [10, 11, 12];
  return svg(640, 296, `
${panel(40, tr('Random split', 'Split acak'), rnd, k(1), evaluate(rnd))}
${panel(352, tr('Temporal split', 'Temporal split'), tmp, k(2), evaluate(tmp))}
<circle cx="116" cy="278" r="5.5" fill="${k(0)}"/>${text(126, 282, tr('training month', 'bulan latih'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
<circle cx="238" cy="278" r="5.5" fill="var(--surface)" stroke="${k(4)}" stroke-width="2.5"/>${text(248, 282, tr('test month (actual)', 'bulan uji (aktual)'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${cross(388, 278, 'var(--muted)')}${text(400, 282, tr('prediction', 'prediksi'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${text(502, 282, tr('x: month, y: units sold', 'x: bulan, y: unit terjual'), { anchor: 'start', size: 12 })}`);
}

// Figure 3: rolling origin, six rounds. Light = trained on, solid = the month tested, empty = not seen.
function rollingOrigin() {
  const L = 84, CW = 33, CH = 26, T = 58, ROWS = [6, 7, 8, 9, 10, 11];
  const cx = m => L + (m - 1) * CW;
  const errs = ROWS.map(o => Math.abs((SALES[o - 1] + SALES[o - 2]) / 2 - SALES[o]));
  const mean = errs.reduce((a, b) => a + b, 0) / errs.length;
  const head = SALES.map((_, i) => text(cx(i + 1) + CW / 2 - 1, T - 10, fmt(i + 1), { size: 12 })).join('');
  const rows = ROWS.map((o, r) => {
    const y = T + r * (CH + 5);
    const cells = SALES.map((_, i) => {
      const m = i + 1, x = cx(m) + 1, w = CW - 4;
      if (m <= o) return `<rect x="${x}" y="${y}" width="${w}" height="${CH}" rx="5" fill="${soft(0)}" stroke="${k(0)}" stroke-width="1.6"/>`;
      if (m === o + 1) return `<rect x="${x}" y="${y}" width="${w}" height="${CH}" rx="5" fill="${k(4)}" stroke="${k(4)}" stroke-width="1.6"/>`;
      return `<rect x="${x}" y="${y}" width="${w}" height="${CH}" rx="5" fill="none" stroke="var(--line)" stroke-width="1.4" stroke-dasharray="3 3"/>`;
    }).join('');
    return `${text(L - 10, y + 18, tr(`Round ${fmt(r + 1)}`, `Putaran ${fmt(r + 1)}`), { anchor: 'end', size: 12, fill: 'var(--ink)' })}${cells}${text(cx(12) + CW + 40, y + 18, fmt(errs[r]), { size: 13, ...INK })}`;
  }).join('');
  const yEnd = T + ROWS.length * (CH + 5);
  return svg(640, 316, `
${text(L + 6 * CW, 22, tr('Month', 'Bulan'), { size: 13, ...INK })}
${text(cx(12) + CW + 40, 22, tr('Error', 'Galat'), { size: 13, ...INK })}
${head}${rows}
${line(cx(12) + CW + 14, yEnd - 2, cx(12) + CW + 66, yEnd - 2, { c: 'var(--muted)', w: 1.4 })}
${text(cx(12) + CW + 40, yEnd + 20, tr(`mean ${fmt(mean, { digits: 2 })}`, `rata-rata ${fmt(mean, { digits: 2 })}`), { size: 13, ...INK, fill: k(2) })}
<rect x="${L}" y="${yEnd + 40}" width="20" height="14" rx="4" fill="${soft(0)}" stroke="${k(0)}" stroke-width="1.6"/>${text(L + 26, yEnd + 52, tr('trained on', 'dilatih dengan'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
<rect x="${L + 128}" y="${yEnd + 40}" width="20" height="14" rx="4" fill="${k(4)}"/>${text(L + 154, yEnd + 52, tr('tested (next month)', 'diuji (bulan berikutnya)'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
<rect x="${L + 300}" y="${yEnd + 40}" width="20" height="14" rx="4" fill="none" stroke="var(--line)" stroke-width="1.4" stroke-dasharray="3 3"/>${text(L + 326, yEnd + 52, tr('not seen yet', 'belum terlihat'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}`);
}

// Figure 4: how the model will be used, and the split that makes the test set new in the same way.
function matchTheUse() {
  const rows = [
    [tr(['New patients from', 'the same hospitals'], ['Pasien baru dari', 'rumah sakit yang sama']), tr(['Group by patient'], ['Kelompokkan per pasien']), 0],
    [tr(['Hospitals the model', 'has never seen'], ['Rumah sakit yang', 'belum pernah dilihat model']), tr(['Group by hospital'], ['Kelompokkan per rumah sakit']), 1],
    [tr(['Next month’s rows', '(a forecast)'], ['Baris bulan depan', '(sebuah ramalan)']), tr(['Split by time:', 'train on the past'], ['Bagi menurut waktu:', 'latih dengan masa lalu']), 2],
    [tr(['Independent cases,', 'like penguins'], ['Kasus yang saling bebas,', 'seperti penguin']), tr(['A random split', 'is fine'], ['Split acak', 'sudah cukup']), 4],
  ];
  const X1 = 10, W1 = 270, X2 = 372, W2 = 258, H = 52, T = 48, G = 14;
  const body = rows.map(([q, a, c], i) => {
    const y = T + i * (H + G);
    const lines = (arr, x, w, o) => arr.length === 1
      ? text(x + w / 2, y + H / 2 + 5, arr[0], o)
      : `${text(x + w / 2, y + H / 2 - 4, arr[0], o)}${text(x + w / 2, y + H / 2 + 14, arr[1], o)}`;
    return `${box(X1, y, W1, H, 'var(--surface)', 'var(--line)')}${lines(q, X1, W1, { size: 13, weight: 600, fill: 'var(--ink)' })}
${line(X1 + W1 + 6, y + H / 2, X2 - 6, y + H / 2, { c: 'var(--muted)', w: 2, arrow: true })}
${box(X2, y, W2, H, soft(c), k(c))}${lines(a, X2, W2, { size: 13, weight: 700, fill: 'var(--ink)' })}`;
  }).join('');
  return svg(640, T + rows.length * (H + G) - G + 12, `
${text(X1 + W1 / 2, 28, tr('How the model will be used', 'Cara model akan dipakai'), { size: 14, ...INK })}
${text(X2 + W2 / 2, 28, tr('Split that fits', 'Split yang cocok'), { size: 14, ...INK })}
${body}`);
}

export const figures = {
  'random-vs-grouped': randomVsGrouped,
  'future-leak': futureLeak,
  'rolling-origin': rollingOrigin,
  'match-the-use': matchTheUse,
};
