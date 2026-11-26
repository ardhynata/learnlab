// Figures for the lesson "Reliability lab". Every number is computed with the lab's own math
// (sims/ml/reliabilitylab.js) on the lab's default data: the generated applicants, first sample (seed 1), one
// threshold of 0.5 unless a figure says otherwise, so the figures agree with the lesson text and with the lab.
import { svg, text, line, k, soft, tr, fmt, pct } from '../kit.js';
import { generatedSets, fitModel, evaluate, gapRows, scoreHistogram } from '../../sims/ml/reliabilitylab.js';

let cache = null;
const lab = () => (cache ??= (() => { const sets = generatedSets(1); return { sets, model: fitModel(sets) }; })());
const run = opts => { const { sets, model } = lab(); return evaluate(sets, model, { threshold: 0.5, ...opts }); };
const rect = (x, y, w, h, fill, stroke) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, w).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="2" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="1.6"` : ''}/>`;
const ink = { fill: 'var(--ink)' };
const bold = { fill: 'var(--ink)', weight: 700 };
const pts1 = v => fmt(v * 100, { digits: 1 });
const groupLabel = g => tr(`Group ${g}`, `Kelompok ${g}`);

// ---- Figure 1: accuracy of each group, clean rows against 40% blank cells. ----
function stressByGroup() {
  const ev = run({ kind: 'missing', strength: 0.4 });
  const names = ['A', 'B', 'C'];
  const left = 52, right = 620, top = 40, bottom = 206;
  const Y = v => bottom - v * (bottom - top);
  const slot = (right - left) / 3, bw = 52;
  const grid = [0, 0.5, 1].map(v => `${line(left, Y(v), right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, pct(v, 0), { anchor: 'end', size: 12 })}`).join('');
  const bars = names.map((g, i) => {
    const cx = left + slot * (i + 0.5);
    const b = ev.before.byGroup[g].accuracy, a = ev.after.byGroup[g].accuracy;
    const x0 = cx - bw - 4, x1 = cx + 4;
    return `${rect(x0, Y(b), bw, bottom - Y(b), soft(i), k(i))}${rect(x1, Y(a), bw, bottom - Y(a), k(i))}
${text(x0 + bw / 2, Y(b) - 6, pct(b, 0), { size: 13 })}${text(x1 + bw / 2, Y(a) - 6, pct(a, 0), { ...bold, size: 13 })}
${text(cx, bottom + 22, groupLabel(g), { ...bold, size: 14 })}`;
  }).join('');
  const head = text(left, 20, tr('Accuracy by group: clean rows (outline) and 40% blank cells (solid)', 'Accuracy tiap kelompok: baris bersih (garis tepi) dan 40% sel kosong (penuh)'), { anchor: 'start', ...bold, size: 13 });
  return svg(640, 240, `${head}${grid}${bars}`);
}

// ---- Figure 2: the recall gap beside accuracy in four situations. ----
function gapTrap() {
  const rows = [
    [tr('Clean rows', 'Baris bersih'), run({ kind: 'missing', strength: 0 })],
    [tr('40% blank cells', '40% sel kosong'), run({ kind: 'missing', strength: 0.4 })],
    [tr('Shift of 0.8 sd', 'Shift 0,8 sd'), run({ kind: 'shift', strength: 0.4 })],
    [tr('100% blank cells', '100% sel kosong'), run({ kind: 'missing', strength: 1 })],
  ];
  const left = 150, right = 604, top = 44, step = 46, barH = 15;
  const X = v => left + v * (right - left - 52);
  const body = rows.map(([label, ev], i) => {
    const y = top + i * step;
    const acc = ev.after.overall.accuracy, gap = gapRows(ev.before, ev.after)[0].after;
    return `${text(left - 12, y + 18, label, { anchor: 'end', ...ink, size: 13 })}
${rect(left, y, acc * (right - left - 52), barH, k(2))}${text(X(acc) + 8, y + 12, tr(`accuracy ${pct(acc, 0)}`, `accuracy ${pct(acc, 0)}`), { anchor: 'start', ...bold, size: 12 })}
${rect(left, y + barH + 4, gap * (right - left - 52), barH, k(1))}${text(X(gap) + 8, y + barH + 16, tr(`recall gap ${fmt(gap * 100, { digits: 1 })} points`, `selisih recall ${fmt(gap * 100, { digits: 1 })} poin`), { anchor: 'start', ...bold, size: 12 })}`;
  }).join('');
  const axis = line(left, top - 8, left, top + 3 * step + 2 * barH + 8, { c: 'var(--muted)', w: 1.5 });
  const note = text(320, top + 4 * step + 14, tr('A shorter gap bar is not a better model: read it beside the accuracy bar.', 'Selisih yang lebih pendek belum berarti model lebih baik: baca bersama batang accuracy.'), { ...ink, size: 13 });
  return svg(640, 278, `${axis}${body}${note}`);
}

// ---- Figure 3: the recall gap on clean rows and under stress, one threshold or one per group. ----
function perGroupGap() {
  const one = gapRows(...(e => [e.before, e.after])(run({ kind: 'missing', strength: 0.4 })))[0];
  const per = gapRows(...(e => [e.before, e.after])(run({ kind: 'missing', strength: 0.4, perGroup: true, goal: 'equalOpportunity' })))[0];
  const left = 56, right = 620, top = 42, bottom = 204, max = 0.45;
  const Y = v => bottom - v / max * (bottom - top);
  const grid = [0, 0.2, 0.4].map(v => `${line(left, Y(v), right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, fmt(v * 100, { digits: 0 }), { anchor: 'end', size: 12 })}`).join('');
  const clusters = [
    [tr(['One threshold', 'for all groups'], ['Satu threshold', 'untuk semua kelompok']), one, 0],
    [tr(['A threshold for each group', '(matched on recall)'], ['Threshold tiap kelompok', '(disamakan pada recall)']), per, 1],
  ];
  const bw = 70, slot = (right - left) / 2;
  const bars = clusters.map(([label, r, c], i) => {
    const cx = left + slot * (i + 0.5);
    const x0 = cx - bw - 6, x1 = cx + 6;
    return `${rect(x0, Y(r.before), bw, bottom - Y(r.before), soft(c), k(c))}${rect(x1, Y(r.after), bw, bottom - Y(r.after), k(c))}
${text(x0 + bw / 2, Y(r.before) - 6, pts1(r.before), { size: 13 })}${text(x1 + bw / 2, Y(r.after) - 6, pts1(r.after), { ...bold, size: 13 })}
${text(x0 + bw / 2, bottom + 17, tr('clean rows', 'baris bersih'), { size: 12 })}${text(x1 + bw / 2, bottom + 17, tr('40% blank', '40% kosong'), { size: 12 })}
${text(cx, bottom + 40, label[0], { ...bold, size: 13 })}${text(cx, bottom + 57, label[1], { ...bold, size: 13 })}`;
  }).join('');
  const head = text(left, 20, tr('Equal opportunity gap (recall), in points', 'Selisih equal opportunity (recall), dalam poin'), { anchor: 'start', ...bold, size: 13 });
  return svg(640, 272, `${head}${grid}${bars}`);
}

// ---- Figure 4: the review band on the scores under the 40% stress. ----
function reviewBand() {
  const ev = run({ kind: 'missing', strength: 0.4 });
  const low = 0.35, high = 0.65;
  const hist = scoreHistogram(ev.scoresAfter, { bins: 20, low, high });
  const clean = scoreHistogram(run({ kind: 'missing', strength: 0 }).scoresAfter, { bins: 20, low, high });
  const count = h => h.filter(b => b.zone === 'review').reduce((s, b) => s + b.count, 0);
  const total = ev.scoresAfter.length;
  const left = 50, right = 620, top = 78, bottom = 214;
  const max = Math.max(...hist.map(b => b.count));
  const X = v => left + v * (right - left), Y = c => bottom - c / max * (bottom - top);
  const color = z => (z === 'review' ? k(3) : z === 'no' ? k(0) : k(2));
  const bars = hist.map(b => `<g opacity="${b.zone === 'review' ? 0.95 : 0.6}">${rect(X(b.lo) + 1, Y(b.count), X(b.hi) - X(b.lo) - 2, bottom - Y(b.count), color(b.zone))}</g>`).join('');
  const edges = [low, high].map(v => line(X(v), top - 8, X(v), bottom, { c: 'var(--ink)', w: 1.6, dash: '5 4' })).join('');
  const zones = [[0, low, tr('Machine: no', 'Mesin: tidak')], [low, high, tr('Person decides', 'Orang memutuskan')], [high, 1, tr('Machine: yes', 'Mesin: ya')]]
    .map(([a, b, t]) => text(X((a + b) / 2), top - 14, t, { ...bold, size: 13 })).join('');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(v => text(X(v), bottom + 18, fmt(v, { digits: 2 }), { size: 12 })).join('');
  const axis = text((left + right) / 2, bottom + 38, tr('Score under the stress (predicted probability of positive)', 'Skor di bawah stres (probabilitas prediksi positif)'), { ...ink, size: 13 });
  const head = text(left, 18, tr(`Band 0.35 to 0.65 under 40% blank cells: ${fmt(count(hist))} of ${fmt(total)} cases (${pct(count(hist) / total, 0)}) go to a person.`, `Band 0,35 sampai 0,65, 40% sel kosong: ${fmt(count(hist))} dari ${fmt(total)} kasus (${pct(count(hist) / total, 0)}) ke orang.`), { anchor: 'start', ...bold, size: 13 })
    + text(left, 38, tr(`On clean rows the same band holds ${fmt(count(clean))} cases (${pct(count(clean) / total, 0)}).`, `Pada baris bersih band yang sama berisi ${fmt(count(clean))} kasus (${pct(count(clean) / total, 0)}).`), { anchor: 'start', ...ink, size: 13 });
  return svg(640, 262, `${head}${bars}${edges}${zones}${ticks}${axis}`);
}

export const figures = {
  'stress-by-group': stressByGroup,
  'gap-trap': gapTrap,
  'per-group-gap': perGroupGap,
  'review-band': reviewBand,
};
