// Figures for the lesson "End-to-end design and reproducibility": [[figure:end-to-end-design-and-reproducibility/name|Caption]].
// Every number is the one in the lesson text. The card-payment project is invented: 10,000 payments a day, about
// 100 of them fraud, 200 reviews a day, a caught fraud worth 80 and a review costing 2. Chargeback labels arrive up
// to 30 days late. The AUC values are constructed rankings (see the lesson's "Where these AUCs come from"), rounded.
import { svg, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const REVIEWS = 200, FRAUD_VALUE = 80, REVIEW_COST = 2;

// ---- the design chain: eight questions in the order you answer them ----------------------------------
function designChain() {
  const steps = [
    [tr('Decision', 'Keputusan'), tr(['Who acts, on', 'how many cases'], ['Siapa bertindak,', 'berapa kasus'])],
    [tr('Metric', 'Metrik'), tr(['Value gained,', 'not only AUC'], ['Nilai yang didapat,', 'bukan hanya AUC'])],
    [tr('Data, labels', 'Data, label'), tr(['Known when? Label', 'arrives when?'], ['Ada kapan? Label', 'tiba kapan?'])],
    [tr('Baseline', 'Baseline'), tr(['A simple rule', 'to beat'], ['Aturan sederhana', 'untuk dikalahkan'])],
    [tr('Split', 'Split'), tr(['Train, gap, test', 'as in use'], ['Latih, jeda, uji', 'seperti saat dipakai'])],
    [tr('Rerun', 'Rerun'), tr(['Seed, versions,', 'one command'], ['Seed, versi,', 'satu perintah'])],
    [tr('Serving', 'Serving'), tr(['Batch or online,', 'and a fallback'], ['Batch atau online,', 'dan cadangan'])],
    [tr('Logs', 'Log'), tr(['Id, version, score,', 'action, label'], ['Id, versi, skor,', 'aksi, label'])],
  ];
  const w = 138, gap = 29, h = 84, rowGap = 40, top = 12;
  const cell = i => ({ x: (i % 4) * (w + gap) + 1, y: top + Math.floor(i / 4) * (h + rowGap) });
  const body = steps.map(([title, sub], i) => {
    const { x, y } = cell(i);
    const c = i % 7;
    const arrow = i === 3 || i === 7 ? ''
      : line(x + w + 3, y + h / 2, x + w + gap - 3, y + h / 2, { c: 'var(--muted)', w: 2, arrow: true });
    return `${box(x, y, w, h, soft(c), k(c))}
${text(x + 18, y + 27, fmt(i + 1), { size: 15, weight: 700, fill: k(c), anchor: 'middle' })}
${text(x + 32, y + 27, title, { size: 15, anchor: 'start', ...INK })}
${text(x + w / 2, y + 52, sub[0], { size: 12, fill: 'var(--ink)' })}${text(x + w / 2, y + 69, sub[1], { size: 12, fill: 'var(--ink)' })}${arrow}`;
  }).join('');
  // From the end of the first row to the start of the second.
  const a = cell(3), b = cell(4);
  const yMid = a.y + h + rowGap / 2;
  const turn = `${line(a.x + w / 2, a.y + h + 3, a.x + w / 2, yMid, { c: 'var(--muted)', w: 2 })}
${line(a.x + w / 2, yMid, b.x + w / 2, yMid, { c: 'var(--muted)', w: 2 })}
${line(b.x + w / 2, yMid, b.x + w / 2, b.y - 4, { c: 'var(--muted)', w: 2, arrow: true })}`;
  return svg(640, top + 2 * h + rowGap + 14, `${body}${turn}`);
}

// ---- AUC order against value order --------------------------------------------------------------------
function metricReversal() {
  const rows = [
    [tr('Baseline rule', 'Aturan baseline'), 38, 0.68, 3],
    [tr('Model A', 'Model A'), 62, 0.95, 0],
    [tr('Model B', 'Model B'), 71, 0.92, 1],
  ].map(([name, caught, auc, c]) => ({ name, caught, auc, c, value: caught * FRAUD_VALUE - REVIEWS * REVIEW_COST }));
  const bx = 150, scale = 2.4, top = 60, rowH = 50, barH = 24;
  const colV = 520, colA = 622;
  const bestAuc = Math.max(...rows.map(r => r.auc)), bestVal = Math.max(...rows.map(r => r.value));
  const head = `${text(bx, 15, tr('Fraud caught in the top 200', 'Fraud tertangkap di 200 teratas'), { anchor: 'start', size: 13, ...INK })}
${text(bx, 31, tr('(of the 100 on that day)', '(dari 100 pada hari itu)'), { anchor: 'start', size: 12 })}
${text(colV, 20, tr('Net value / day', 'Net value / hari'), { anchor: 'end', size: 13, ...INK })}
${text(colA, 20, 'AUC', { anchor: 'end', size: 13, ...INK })}
${line(10, 40, 630, 40, { c: 'var(--line)', w: 1.5 })}`;
  const body = rows.map((r, i) => {
    const y = top + i * rowH;
    return `${text(10, y + barH / 2 + 5, r.name, { anchor: 'start', size: 14, ...INK })}
<rect x="${bx}" y="${y}" width="${r.caught * scale}" height="${barH}" rx="5" fill="${k(r.c)}"/>
${text(bx + r.caught * scale + 8, y + barH / 2 + 5, fmt(r.caught), { anchor: 'start', size: 14, ...INK })}
${text(colV, y + barH / 2 + 5, fmt(r.value), { anchor: 'end', size: 14, weight: r.value === bestVal ? 800 : 500, fill: r.value === bestVal ? k(1) : 'var(--ink)' })}
${text(colA, y + barH / 2 + 5, fmt(r.auc, { digits: 2 }), { anchor: 'end', size: 14, weight: r.auc === bestAuc ? 800 : 500, fill: r.auc === bestAuc ? k(0) : 'var(--ink)' })}`;
  }).join('');
  const axisY = top + 3 * rowH - 8;
  const axis = `${line(bx, top - 8, bx, axisY, { c: 'var(--line)', w: 1.5 })}
${[0, 50, 100].map(t => text(bx + t * scale, axisY + 17, fmt(t), { size: 12 })).join('')}`;
  const note = text(320, axisY + 46, tr('Best AUC: model A. Best net value: model B.', 'AUC terbaik: model A. Net value terbaik: model B.'), { size: 14, ...INK });
  return svg(640, axisY + 58, `${head}${body}${axis}${note}`);
}

// ---- the split: deployment against a random cut -------------------------------------------------------
function deploymentSplit() {
  const x0 = 20, W = 600, days = 180, X = d => x0 + (d / days) * W;
  const t1 = 120, t2 = 150;
  const s1y = 34, sh = 40;
  const strip = `${text(x0, 22, tr('Cut as in deployment (built on day 150)', 'Dipotong seperti deployment (dibangun hari 150)'), { anchor: 'start', size: 14, ...INK })}
${box(X(0), s1y, X(t1) - X(0), sh, soft(0), k(0))}
${text((X(0) + X(t1)) / 2, s1y + 25, tr(`Train: days 1 to ${fmt(t1)}`, `Latih: hari 1 sampai ${fmt(t1)}`), { size: 14, ...INK })}
<rect x="${X(t1)}" y="${s1y}" width="${X(t2) - X(t1)}" height="${sh}" rx="10" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="5 4"/>
${text((X(t1) + X(t2)) / 2, s1y + 25, tr('Gap', 'Jeda'), { size: 14, ...INK })}
${box(X(t2), s1y, X(days) - X(t2), sh, soft(1), k(1))}
${text((X(t2) + X(days)) / 2, s1y + 25, tr('Test', 'Uji'), { size: 14, ...INK })}
${[[0, 1], [t1, t1], [t2, t2], [days, days]].map(([d, label], i) => text(Math.min(X(d), X(days) - 4), s1y + sh + 18, fmt(label), { size: 12, anchor: i === 0 ? 'start' : i === 3 ? 'end' : 'middle' })).join('')}
${text((X(0) + X(t1)) / 2, s1y + sh + 40, tr('labels are final', 'label sudah final'), { size: 12, fill: 'var(--ink)' })}
${text((X(t1) + X(t2)) / 2, s1y + sh + 40, tr('labels arriving', 'label masuk'), { size: 12, fill: 'var(--ink)' })}
${text((X(t2) + X(days)) / 2, s1y + sh + 40, tr('like tomorrow', 'seperti hari esok'), { size: 12, fill: 'var(--ink)' })}`;

  // A random 80/20 cut over 90 two-day cells, drawn with a fixed pseudo-random sequence.
  const cells = 90, cw = W / cells, ry = 168;
  let s = 7;
  const strip2 = Array.from({ length: cells }, (_, i) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const isTest = s / 4294967296 < 0.2;
    return `<rect x="${x0 + i * cw + 0.5}" y="${ry}" width="${cw - 1}" height="${sh}" rx="2" fill="${isTest ? k(1) : k(0)}" opacity="${isTest ? 1 : 0.4}"/>`;
  }).join('');
  const random = `${text(x0, 156, tr('Random 80/20 cut', 'Potongan acak 80/20'), { anchor: 'start', size: 14, ...INK })}
${strip2}
${text(x0, ry + sh + 22, tr('Test days sit between training days, with labels that would not exist yet.', 'Hari uji terselip di antara hari latih, dengan label yang belum ada.'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}`;
  return svg(640, ry + sh + 36, `${strip}${random}`);
}

// ---- the prediction log and the late labels --------------------------------------------------------------
function logJoin() {
  const cols = (x0, spec) => spec.map(([dx, anchor]) => [x0 + dx, anchor]);
  const L = { x: 10, w: 290 }, R = { x: 336, w: 294 }, top = 14, h = 118;
  const left = cols(L.x, [[20, 'start'], [96, 'end'], [150, 'middle'], [224, 'end'], [282, 'end']]);
  const right = cols(R.x, [[20, 'start'], [150, 'middle'], [270, 'end']]);
  const row = (cells, spec, y, o = {}) => cells.map((t, i) => text(spec[i][0], y, t, { anchor: spec[i][1], size: 13, fill: 'var(--ink)', ...o })).join('');
  const leftBox = `${box(L.x, top, L.w, h, soft(0), k(0))}
${text(L.x + L.w / 2, top + 24, tr('Prediction log (at scoring time)', 'Log prediksi (saat scoring)'), { size: 13, ...INK })}
${row(['id', tr('day', 'hari'), tr('model', 'model'), tr('score', 'skor'), tr('rank', 'urutan')], left, top + 52, { weight: 700, size: 12 })}
${row(['8812', fmt(40), 'v3', fmt(0.91, { digits: 2 }), fmt(7)], left, top + 78)}
${row(['9103', fmt(40), 'v3', fmt(0.12, { digits: 2 }), fmt(1420)], left, top + 100)}`;
  const rightBox = `${box(R.x, top, R.w, h, soft(1), k(1))}
${text(R.x + R.w / 2, top + 24, tr('Label log (up to 30 days later)', 'Log label (sampai 30 hari kemudian)'), { size: 13, ...INK })}
${row(['id', 'fraud', tr('arrived', 'tiba')], right, top + 52, { weight: 700, size: 12 })}
${row(['8812', tr('yes', 'ya'), tr(`day ${fmt(52)}`, `hari ${fmt(52)}`)], right, top + 78)}
${row(['9103', tr('no', 'tidak'), tr(`day ${fmt(70)}`, `hari ${fmt(70)}`)], right, top + 100)}`;
  const jy = top + h + 46, jh = 62, jx = 100, jw = 440;
  const joined = `${line(L.x + L.w / 2, top + h + 4, 250, jy - 4, { c: 'var(--muted)', w: 2, arrow: true })}
${line(R.x + R.w / 2, top + h + 4, 390, jy - 4, { c: 'var(--muted)', w: 2, arrow: true })}
${text(320, top + h + 30, tr('join by id', 'gabung lewat id'), { size: 13, ...INK })}
${box(jx, jy, jw, jh, 'var(--surface)', 'var(--ink)')}
${text(jx + jw / 2, jy + 26, tr('Real fraud caught in the top 200', 'Fraud sebenarnya yang tertangkap di 200 teratas'), { size: 14, ...INK })}
${text(jx + jw / 2, jy + 46, tr(`for day ${fmt(40)}, known only after the labels arrive`, `untuk hari ${fmt(40)}, baru diketahui setelah label tiba`), { size: 12, fill: 'var(--ink)' })}`;
  return svg(640, jy + jh + 12, `${leftBox}${rightBox}${joined}`);
}

export const figures = {
  'design-chain': designChain,
  'metric-reversal': metricReversal,
  'deployment-split': deploymentSplit,
  'log-join': logJoin,
};
