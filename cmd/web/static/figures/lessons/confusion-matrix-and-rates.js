// Figures for the lesson "Confusion matrix and rates": [[figure:confusion-matrix-and-rates/name|Caption]].
// One running example: a clinic tests 200 people, 20 are sick, the test says yes to 24 and 15 of those are
// sick (TP 15, FN 5, FP 9, TN 171). Cell colors match the other classification figures: TP teal, FP gold,
// TN blue, FN purple.
import { svg, text, line, k, tr, fmt } from '../kit.js';

const TP = 2, FP = 3, TN = 4, FN = 5;
const tint = i => `color-mix(in srgb, var(--k${i}) 22%, var(--surface))`;
const INK = { weight: 700, fill: 'var(--ink)' };
const COUNTS = { tp: 15, fn: 5, fp: 9, tn: 171 };

const cellBox = (x, y, w, h, i) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${tint(i)}" stroke="${k(i)}" stroke-width="2.4"/>`;

// Figure 1: the four cells, named, with the two-step rule for reading a name.
function cellNames() {
  const cell = (x, y, i, abbr, name, note) => `${cellBox(x, y, 210, 104, i)}
${text(x + 105, y + 40, abbr, { size: 30, weight: 800, fill: 'var(--ink)' })}${text(x + 105, y + 64, name, { size: 15, ...INK })}${text(x + 105, y + 85, note, { size: 13 })}`;
  return svg(660, 350, `
${text(337, 22, tr('What the test said', 'Jawaban tes'), { size: 14, ...INK })}
${text(227, 52, tr('Yes', 'Ya'), { size: 15, ...INK })}${text(447, 52, tr('No', 'Tidak'), { size: 15, ...INK })}
${text(112, 117, tr('Really sick', 'Aslinya sakit'), { size: 15, ...INK, anchor: 'end' })}${text(112, 231, tr('Really healthy', 'Aslinya sehat'), { size: 15, ...INK, anchor: 'end' })}
${cell(122, 66, TP, 'TP', 'True positive', tr('sick, test said yes', 'sakit, tes bilang ya'))}${cell(342, 66, FN, 'FN', 'False negative', tr('sick, test said no', 'sakit, tes bilang tidak'))}
${cell(122, 180, FP, 'FP', 'False positive', tr('healthy, test said yes', 'sehat, tes bilang ya'))}${cell(342, 180, TN, 'TN', 'True negative', tr('healthy, test said no', 'sehat, tes bilang tidak'))}
${text(337, 306, tr('Last word: what the test said (positive = yes, negative = no).', 'Kata terakhir: jawaban tes (positive = ya, negative = tidak).'), { size: 14, fill: 'var(--ink)' })}
${text(337, 330, tr('First word: was that answer right (true) or wrong (false)?', 'Kata pertama: apakah jawaban itu benar (true) atau salah (false)?'), { size: 14, fill: 'var(--ink)' })}`);
}

// Figure 2: the same matrix with the clinic's counts and the row and column totals.
function workedMatrix() {
  const X1 = 150, X2 = 350, W = 190, H = 96, Y1 = 70, Y2 = 176;
  const cell = (x, y, i, abbr, n) => `${cellBox(x, y, W, H, i)}
${text(x + W / 2, y + 52, fmt(n), { size: 36, weight: 800, fill: 'var(--ink)' })}${text(x + W / 2, y + 78, abbr, { size: 14, ...INK })}`;
  const { tp, fn, fp, tn } = COUNTS;
  return svg(660, 350, `
${text(X1 + W + 5, 24, tr('What the test said', 'Jawaban tes'), { size: 14, ...INK })}
${text(X1 + W / 2, 56, tr('Yes', 'Ya'), { size: 15, ...INK })}${text(X2 + W / 2, 56, tr('No', 'Tidak'), { size: 15, ...INK })}
${text(X1 - 12, Y1 + 46, tr('Really sick', 'Aslinya sakit'), { size: 15, ...INK, anchor: 'end' })}${text(X1 - 12, Y2 + 46, tr('Really healthy', 'Aslinya sehat'), { size: 15, ...INK, anchor: 'end' })}
${cell(X1, Y1, TP, 'TP', tp)}${cell(X2, Y1, FN, 'FN', fn)}${cell(X1, Y2, FP, 'FP', fp)}${cell(X2, Y2, TN, 'TN', tn)}
${text(X2 + W + 14, Y1 + 53, `${fmt(tp)} + ${fmt(fn)} = ${fmt(tp + fn)}`, { size: 14, anchor: 'start', ...INK })}
${text(X2 + W + 14, Y2 + 53, `${fmt(fp)} + ${fmt(tn)} = ${fmt(fp + tn)}`, { size: 14, anchor: 'start', ...INK })}
${text(X1 + W / 2, 296, `${fmt(tp)} + ${fmt(fp)} = ${fmt(tp + fp)}`, { size: 14, ...INK })}${text(X2 + W / 2, 296, `${fmt(fn)} + ${fmt(tn)} = ${fmt(fn + tn)}`, { size: 14, ...INK })}
${text(X1 + W / 2, 316, tr('said yes', 'dijawab ya'), { size: 13 })}${text(X2 + W / 2, 316, tr('said no', 'dijawab tidak'), { size: 13 })}
${text(X2 + W + 14, 296, tr(`${fmt(tp + fn + fp + tn)} people`, `${fmt(tp + fn + fp + tn)} orang`), { size: 14, anchor: 'start', ...INK })}`);
}

// Figure 3: accuracy, precision and recall as three panels on the same matrix.
function threeRatios() {
  const { tp, fn, fp, tn } = COUNTS;
  const n = tp + fn + fp + tn;
  // 'top' cells are summed on the top of the fraction, 'bottom' cells only in its bottom, 'off' cells are not used.
  const panels = [
    { title: tr('Accuracy', 'Accuracy'), ask: tr('how often is the answer right?', 'seberapa sering benar?'), tp: 'top', fn: 'bottom', fp: 'bottom', tn: 'top',
      formula: `(${fmt(tp)} + ${fmt(tn)}) / ${fmt(n)}`, value: (tp + tn) / n },
    { title: tr('Precision', 'Precision'), ask: tr('when it says yes, is it right?', 'saat menjawab ya, benarkah?'), tp: 'top', fn: 'off', fp: 'bottom', tn: 'off',
      formula: `${fmt(tp)} / (${fmt(tp)} + ${fmt(fp)})`, value: tp / (tp + fp) },
    { title: tr('Recall', 'Recall'), ask: tr('how many real cases found?', 'berapa kasus asli terdeteksi?'), tp: 'top', fn: 'bottom', fp: 'off', tn: 'off',
      formula: `${fmt(tp)} / (${fmt(tp)} + ${fmt(fn)})`, value: tp / (tp + fn) },
  ];
  const cells = [['tp', TP, 'TP', 0, 0], ['fn', FN, 'FN', 1, 0], ['fp', FP, 'FP', 0, 1], ['tn', TN, 'TN', 1, 1]];
  const body = panels.map((p, idx) => {
    const x0 = 10 + idx * 218, gx = x0 + 24, gy = 56, cw = 80, ch = 56;
    const grid = cells.map(([key, i, abbr, cx, cy]) => {
      const x = gx + cx * cw, y = gy + cy * ch, state = p[key];
      const rect = state === 'top' ? `<rect x="${x}" y="${y}" width="${cw - 4}" height="${ch - 4}" rx="8" fill="${tint(i)}" stroke="${k(i)}" stroke-width="2.4"/>`
        : state === 'bottom' ? `<rect x="${x}" y="${y}" width="${cw - 4}" height="${ch - 4}" rx="8" fill="var(--surface)" stroke="${k(i)}" stroke-width="2" stroke-dasharray="5 3"/>`
          : `<rect x="${x}" y="${y}" width="${cw - 4}" height="${ch - 4}" rx="8" fill="var(--surface)" stroke="var(--line)" stroke-width="1.4"/>`;
      const fill = state === 'off' ? 'var(--muted)' : 'var(--ink)';
      return `${rect}${text(x + (cw - 4) / 2, y + 24, abbr, { size: 12, weight: 700, fill })}${text(x + (cw - 4) / 2, y + 44, fmt(COUNTS[key]), { size: 17, weight: 800, fill })}`;
    }).join('');
    return `<rect x="${x0}" y="8" width="208" height="296" rx="12" fill="var(--surface)" stroke="var(--line)" stroke-width="1.6"/>
${text(x0 + 104, 38, p.title, { size: 17, ...INK })}${grid}
${text(x0 + 104, 214, p.formula, { size: 15, ...INK })}${text(x0 + 104, 244, `= ${fmt(p.value, { digits: p.value === 0.625 ? 3 : 2 })}`, { size: 24, weight: 800, fill: 'var(--ink)' })}${text(x0 + 104, 276, p.ask, { size: 12 })}`;
  }).join('');
  return svg(660, 346, `${body}
${text(330, 330, tr('Shaded: counted on top. Dashed: counted only on the bottom. Faded: not used.', 'Berwarna: ada di bagian atas pecahan. Putus-putus: hanya di bagian bawah. Pudar: tidak dipakai.'), { size: 13 })}`);
}

// Figure 4: three classifiers, their precision and recall on a 0 to 1 line, and how far the plain average
// and F1 sit from the weaker of the two.
function f1VsAverage() {
  const L = 50, R = 610, X = v => L + v * (R - L);
  const rows = [
    { name: 'A', p: 0.9, r: 0.1 }, { name: 'B', p: 0.3, r: 0.9 }, { name: 'C', p: 0.625, r: 0.75 },
  ].map(o => ({ ...o, avg: (o.p + o.r) / 2, f1: 2 * o.p * o.r / (o.p + o.r) }));
  const hollow = (x, y) => `<path d="M${x} ${y - 8}l8 8-8 8-8-8z" fill="var(--surface)" stroke="var(--ink)" stroke-width="2.2"/>`;
  const solid = (x, y) => `<path d="M${x} ${y - 8}l8 8-8 8-8-8z" fill="${k(6)}" stroke="var(--ink)" stroke-width="2"/>`;
  const circle = (x, y, i) => `<circle cx="${x}" cy="${y}" r="7" fill="${k(i)}" stroke="var(--surface)" stroke-width="1.6"/>`;
  const legend = (x, mark, label) => `${mark}${text(x + 20, 30, label, { size: 13, anchor: 'start', fill: 'var(--ink)' })}`;
  const body = rows.map((o, idx) => {
    const y = 140 + idx * 124;
    return `${text(L, y - 62, `${tr('Classifier', 'Classifier')} ${o.name}: precision ${fmt(o.p)}, recall ${fmt(o.r)}`, { size: 14, anchor: 'start', ...INK })}
${line(X(0), y, X(1), y, { c: 'var(--line)', w: 3 })}
${line(X(Math.min(o.p, o.r)), y, X(Math.max(o.p, o.r)), y, { c: 'var(--muted)', w: 3 })}
${circle(X(o.p), y, 0)}${circle(X(o.r), y, 1)}
${hollow(X(o.avg), y - 20)}${text(X(o.avg), y - 34, `${tr('average', 'rata-rata')} ${fmt(o.avg, { digits: 2 })}`, { size: 12.5, fill: 'var(--ink)', anchor: o.avg > 0.8 ? 'end' : 'middle' })}
${solid(X(o.f1), y + 20)}${text(X(o.f1), y + 44, `F1 ${fmt(o.f1, { digits: 2 })}`, { size: 12.5, ...INK })}`;
  }).join('');
  const ticks = [0, 0.5, 1].map(v => `${line(X(v), 450, X(v), 456, { c: 'var(--muted)', w: 1.4 })}${text(X(v), 472, fmt(v), { size: 12 })}`).join('');
  return svg(660, 486, `
${legend(40, circle(46, 26, 0), 'precision')}${legend(150, circle(156, 26, 1), 'recall')}${legend(250, hollow(256, 26), tr('plain average', 'rata-rata biasa'))}${legend(410, solid(416, 26), tr('F1 (harmonic mean)', 'F1 (rata-rata harmonik)'))}
${body}${ticks}`);
}

export const figures = {
  'cell-names': cellNames,
  'worked-matrix': workedMatrix,
  'three-ratios': threeRatios,
  'f1-vs-average': f1VsAverage,
};
