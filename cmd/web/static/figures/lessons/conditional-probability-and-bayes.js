// Figures for "Conditional probability and Bayes' rule": a natural-frequency tree for a screening test,
// the same test used on two groups, and the fraud-alert confusion matrix read by row and by column.
// Every count is computed here from the lesson's own inputs, so the figures agree with the text.
import { svg, text, line, box, k, soft, tr, fmt } from '../kit.js';

const SICK = 1, WELL = 0;
const ink = { fill: 'var(--ink)' };
const num = (v, d = 2) => fmt(v, { digits: d });

// The screening test of the lesson: 2 in 100 sick, sensitivity 0.90, false alarm rate 0.05, 1,000 people.
const TEST = { n: 1000, rate: 0.02, sens: 0.9, fa: 0.05 };
function counts(n, rate) {
  const sick = Math.round(n * rate), well = n - sick;
  const tp = Math.round(sick * TEST.sens), fp = Math.round(well * TEST.fa);
  return { sick, well, tp, fn: sick - tp, fp, tn: well - fp };
}

// 1,000 people split by the truth, then by the test result.
function frequencyTree() {
  const c = counts(TEST.n, TEST.rate);
  const cx = [95, 245, 415, 565], w3 = 140, y3 = 222, h3 = 54;
  const y2 = 112, h2 = 46, y1 = 14, h1 = 42;
  const mid2 = [170, 490];
  const leaf = (x, n, label, positive, c0) => `<rect x="${x - w3 / 2}" y="${y3}" width="${w3}" height="${h3}" rx="10" fill="${positive ? k(c0) : soft(c0)}" stroke="${positive ? 'var(--ink)' : k(c0)}" stroke-width="${positive ? 2.8 : 1.4}"/>
${text(x, y3 + 24, fmt(n), { size: 18, weight: 700, ...ink, ...(positive ? { fill: 'var(--surface)' } : {}) })}
${text(x, y3 + 44, label, { size: 13, ...(positive ? { fill: 'var(--surface)' } : ink) })}`;
  const kids = [
    [cx[0], c.tp, tr('test positive', 'tes positif'), true, SICK],
    [cx[1], c.fn, tr('test negative', 'tes negatif'), false, SICK],
    [cx[2], c.fp, tr('test positive', 'tes positif'), true, WELL],
    [cx[3], c.tn, tr('test negative', 'tes negatif'), false, WELL],
  ];
  const edge = (x1, y1, x2, y2, label, dx) => `${line(x1, y1, x2, y2, { w: 1.6, c: 'var(--muted)' })}${text((x1 + x2) / 2 + dx, (y1 + y2) / 2 + 4, label, { size: 12, anchor: dx < 0 ? 'end' : 'start' })}`;
  const per100 = v => tr(`${fmt(v)} in 100`, `${fmt(v)} dari 100`);
  return svg(660, 340, `
<rect x="250" y="${y1}" width="160" height="${h1}" rx="10" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.6"/>
${text(330, y1 + 27, tr(`${fmt(TEST.n)} people`, `${fmt(TEST.n)} orang`), { size: 17, weight: 700, ...ink })}
${edge(300, y1 + h1, mid2[0] + 8, y2, per100(TEST.rate * 100), -16)}
${edge(360, y1 + h1, mid2[1] - 8, y2, per100((1 - TEST.rate) * 100), 16)}
<rect x="${mid2[0] - 70}" y="${y2}" width="140" height="${h2}" rx="10" fill="${soft(SICK)}" stroke="${k(SICK)}" stroke-width="1.6"/>
${text(mid2[0], y2 + 29, `${fmt(c.sick)} ${tr('sick', 'sakit')}`, { size: 17, weight: 700, ...ink })}
<rect x="${mid2[1] - 70}" y="${y2}" width="140" height="${h2}" rx="10" fill="${soft(WELL)}" stroke="${k(WELL)}" stroke-width="1.6"/>
${text(mid2[1], y2 + 29, `${fmt(c.well)} ${tr('healthy', 'sehat')}`, { size: 17, weight: 700, ...ink })}
${edge(mid2[0] - 20, y2 + h2, cx[0], y3, per100(TEST.sens * 100), -14)}
${edge(mid2[0] + 20, y2 + h2, cx[1], y3, per100((1 - TEST.sens) * 100), 14)}
${edge(mid2[1] - 20, y2 + h2, cx[2], y3, per100(TEST.fa * 100), -14)}
${edge(mid2[1] + 20, y2 + h2, cx[3], y3, per100((1 - TEST.fa) * 100), 14)}
${kids.map(a => leaf(...a)).join('')}
${text(330, 304, tr(`Positives: ${fmt(c.tp)} + ${fmt(c.fp)} = ${fmt(c.tp + c.fp)}. Sick among them: ${fmt(c.tp)} / ${fmt(c.tp + c.fp)} = ${num(c.tp / (c.tp + c.fp))}`,
    `Positif: ${fmt(c.tp)} + ${fmt(c.fp)} = ${fmt(c.tp + c.fp)}. Yang sakit di antaranya: ${fmt(c.tp)} / ${fmt(c.tp + c.fp)} = ${num(c.tp / (c.tp + c.fp))}`), { size: 15, weight: 700, ...ink })}
${text(330, 326, tr('Same test, but only the two filled boxes count after a positive result.', 'Tes yang sama, tetapi setelah hasil positif hanya dua kotak terisi yang dihitung.'), { size: 13 })}`);
}

// The pool of people who tested positive, for two groups that differ only in how many are sick.
function sameTestTwoGroups() {
  const sq = 11, gap = 2, cols = 20, step = sq + gap, top = 62;
  const panel = (x0, rate, title) => {
    const c = counts(TEST.n, rate), pos = c.tp + c.fp;
    let cells = '';
    for (let i = 0; i < pos; i++) {
      const sick = i < c.tp;
      cells += `<rect x="${x0 + (i % cols) * step}" y="${top + Math.floor(i / cols) * step}" width="${sq}" height="${sq}" rx="2" fill="${sick ? k(SICK) : soft(WELL)}" stroke="${sick ? 'var(--ink)' : k(WELL)}" stroke-width="${sick ? 1.2 : 1}"/>`;
    }
    const yb = top + 11 * step + 24;
    return `${text(x0, 28, title, { anchor: 'start', size: 15, weight: 700, ...ink })}
${text(x0, 48, tr(`${fmt(pos)} people tested positive`, `${fmt(pos)} orang tes positif`), { anchor: 'start', size: 13 })}
${cells}
${text(x0, yb, tr(`${fmt(c.tp)} sick: ${fmt(c.tp)} / ${fmt(pos)} = ${num(c.tp / pos)}`, `${fmt(c.tp)} sakit: ${fmt(c.tp)} / ${fmt(pos)} = ${num(c.tp / pos)}`), { anchor: 'start', size: 15, weight: 700, ...ink })}`;
  };
  const lx = 40;
  return svg(660, 300, `
${panel(lx, 0.02, tr('2 in 100 are sick', '2 dari 100 sakit'))}
${panel(lx + 320, 0.2, tr('20 in 100 are sick', '20 dari 100 sakit'))}
<rect x="${lx}" y="268" width="12" height="12" rx="2" fill="${k(SICK)}" stroke="var(--ink)" stroke-width="1.2"/>${text(lx + 20, 279, tr('sick', 'sakit'), { anchor: 'start', size: 13 })}
<rect x="${lx + 80}" y="268" width="12" height="12" rx="2" fill="${soft(WELL)}" stroke="${k(WELL)}"/>${text(lx + 100, 279, tr('healthy: a false alarm', 'sehat: alarm palsu'), { anchor: 'start', size: 13 })}
${text(lx + 480, 279, tr('1,000 people in each group', '1.000 orang di tiap kelompok'), { size: 13 })}`);
}

// The fraud model of "Class imbalance", scaled to 1,000 payments; recall along a row, precision down a column.
function alertTable() {
  const tp = 6, fn = 4, fp = 14, tn = 976;
  const x0 = 140, y0 = 84, cw = 140, ch = 70;
  const cell = (c, r, n, label, hit) => `<rect x="${x0 + c * cw}" y="${y0 + r * ch}" width="${cw}" height="${ch}" fill="${hit ? soft(SICK) : 'var(--surface)'}" stroke="var(--line)" stroke-width="1.4"/>
${text(x0 + c * cw + cw / 2, y0 + r * ch + 34, fmt(n), { size: 22, weight: 700, ...ink })}${text(x0 + c * cw + cw / 2, y0 + r * ch + 54, label, { size: 12 })}`;
  const hdr = (c, t, sub) => `${text(x0 + c * cw + cw / 2, 52, t, { size: 15, weight: 700, ...ink })}${text(x0 + c * cw + cw / 2, 70, sub, { size: 12 })}`;
  const rowh = (r, t, sub) => `${text(x0 - 12, y0 + r * ch + 32, t, { anchor: 'end', size: 15, weight: 700, ...ink })}${text(x0 - 12, y0 + r * ch + 50, sub, { anchor: 'end', size: 12 })}`;
  return svg(660, 300, `
${hdr(0, tr('alert', 'alarm'), `${fmt(tp + fp)} ${tr('payments', 'pembayaran')}`)}${hdr(1, tr('no alert', 'tanpa alarm'), `${fmt(fn + tn)} ${tr('payments', 'pembayaran')}`)}
${rowh(0, tr('fraud', 'fraud'), `${fmt(tp + fn)} ${tr('payments', 'pembayaran')}`)}${rowh(1, tr('honest', 'wajar'), `${fmt(fp + tn)} ${tr('payments', 'pembayaran')}`)}
${cell(0, 0, tp, tr('fraud caught', 'fraud terdeteksi'), true)}${cell(1, 0, fn, tr('fraud missed', 'fraud terlewat'), false)}
${cell(0, 1, fp, tr('false alarm', 'alarm palsu'), false)}${cell(1, 1, tn, tr('honest, quiet', 'wajar, tanpa alarm'), false)}
<rect x="${x0 - 3}" y="${y0 - 3}" width="${2 * cw + 6}" height="${ch + 6}" rx="8" fill="none" stroke="${k(2)}" stroke-width="3" stroke-dasharray="7 5"/>
<rect x="${x0 + 3}" y="${y0 + 3 - 6}" width="${cw - 6}" height="${2 * ch + 6}" rx="8" fill="none" stroke="var(--ink)" stroke-width="3"/>
${text(x0 + 2 * cw + 16, y0 + 26, tr('Along the dashed row:', 'Menyusuri baris putus-putus:'), { anchor: 'start', size: 12.5, weight: 700, ...ink })}
${text(x0 + 2 * cw + 16, y0 + 46, tr(`recall = ${fmt(tp)} / ${fmt(tp + fn)} = ${num(tp / (tp + fn))}`, `recall = ${fmt(tp)} / ${fmt(tp + fn)} = ${num(tp / (tp + fn))}`), { anchor: 'start', size: 14, weight: 700, ...ink })}
${text(x0 + 2 * cw + 16, y0 + 64, 'P(alert | fraud)'.replace('alert', tr('alert', 'alarm')).replace('fraud', tr('fraud', 'fraud')), { anchor: 'start', size: 12.5 })}
${text(x0 + cw / 2, y0 + 2 * ch + 28, tr('Down the solid column:', 'Menuruni kolom tebal:'), { size: 12.5, weight: 700, ...ink })}
${text(x0 + cw / 2, y0 + 2 * ch + 48, tr(`precision = ${fmt(tp)} / ${fmt(tp + fp)} = ${num(tp / (tp + fp))}`, `precision = ${fmt(tp)} / ${fmt(tp + fp)} = ${num(tp / (tp + fp))}`), { size: 14, weight: 700, ...ink })}
${text(x0 + cw / 2, y0 + 2 * ch + 66, 'P(fraud | alert)'.replace('alert', tr('alert', 'alarm')).replace('fraud', tr('fraud', 'fraud')), { size: 12.5 })}`);
}

export const figures = {
  'frequency-tree': frequencyTree,
  'same-test-two-groups': sameTestTwoGroups,
  'alert-table': alertTable,
};
