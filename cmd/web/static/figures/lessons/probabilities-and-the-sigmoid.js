// Figures for the reading lesson "Probabilities and the sigmoid" (logistic-regression course).
// Every number on screen is computed here from the lesson's own examples: twelve students with
// hours studied and pass (1) or fail (0), the score z = 1.2 * hours - 3.6, and the two-feature score
// z = hours + 0.8 * tests - 5, so the pictures match the worked examples in the text.
import { svg, dot, ring, text, line, box, k, soft, tr, fmt } from '../kit.js';
import { polyFit } from '../../sims/ml/regression.js';

const sigmoid = z => 1 / (1 + Math.exp(-z));
const score = h => 1.2 * h - 3.6;
const ink = { weight: 700, fill: 'var(--ink)' };
const p2 = v => fmt(v, { digits: 2 });
// Text with a halo so a label stays readable where it crosses a line or a point.
const halo = (x, y, t, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.anchor ?? 'middle'}" font-size="${o.size ?? 13}" font-weight="${o.weight ?? 600}" fill="${o.fill ?? 'var(--ink)'}" stroke="var(--surface)" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${t}</text>`;
const path = (pts, c, w = 3.2, dash = '') => `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;

// Twelve students: hours studied, and 1 for pass, 0 for fail.
const HOURS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
const PASS = [0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1];

// A straight line through the 0/1 answers next to the S-curve of the lesson's model.
function lineVsSigmoid() {
  const top = 36, ph = 214;
  const panel = (ox, title, curve, color, note) => {
    const X = h => ox + 40 + h * 36, Y = p => 176 - p * 96;
    const xs = Array.from({ length: 71 }, (_, i) => i * 0.1);
    return `${box(ox, top, 306, ph)}${text(ox + 153, 28, title, ink)}
${line(X(0), Y(0), X(7), Y(0), { c: 'var(--line)', w: 1.4, dash: '4 4' })}${line(X(0), Y(1), X(7), Y(1), { c: 'var(--line)', w: 1.4, dash: '4 4' })}
${line(X(0), Y(-0.25), X(0), Y(1.35), { c: 'var(--muted)', w: 1.6 })}
${text(X(0) - 8, Y(0) + 4, fmt(0), { anchor: 'end', size: 12 })}${text(X(0) - 8, Y(1) + 4, fmt(1), { anchor: 'end', size: 12 })}
${path(xs.map(h => [X(h), Y(curve(h))]), color)}
${HOURS.map((h, i) => (PASS[i] ? dot(X(h), Y(1), k(0), 5.5) : ring(X(h), Y(0), k(1), 5))).join('')}
${[0, 2, 4, 6].map(h => text(X(h), 222, fmt(h), { size: 12 })).join('')}
${text(ox + 160, 241, tr('hours studied', 'jam belajar'), { size: 12 })}
${note}`;
  };
  const fit = polyFit(HOURS, PASS, 1);
  const left = panel(0, tr('A straight line', 'Garis lurus'), fit.predict, k(2),
    `${text(153, 268, tr('leaves the range 0 to 1', 'keluar dari rentang 0 sampai 1'), { size: 12 })}${halo(34, 208, tr('below 0?', 'di bawah 0?'), { anchor: 'start', size: 12, fill: k(2) })}${halo(290, 49, tr('above 1?', 'di atas 1?'), { anchor: 'end', size: 12, fill: k(2) })}`);
  const right = panel(330, tr('A sigmoid curve', 'Kurva sigmoid'), h => sigmoid(score(h)), k(3),
    `${text(330 + 153, 268, tr('always between 0 and 1', 'selalu antara 0 dan 1'), { size: 12 })}`);
  const legend = `${dot(210, 288, k(0), 5.5)}${text(220, 292, tr('passed (1)', 'lulus (1)'), { anchor: 'start', size: 12 })}${ring(330, 288, k(1), 5)}${text(340, 292, tr('failed (0)', 'gagal (0)'), { anchor: 'start', size: 12 })}`;
  return svg(640, 302, `${left}${right}${legend}`);
}

// The sigmoid for scores -6 to 6, with five marked scores.
function sigmoidCurve() {
  const X = z => 320 + z * 45, Y = p => 226 - p * 176;
  const zs = Array.from({ length: 121 }, (_, i) => -6 + i * 0.1);
  const marks = [-4, -2, 0, 2, 4];
  return svg(640, 296, `${box(0, 0, 640, 296, 'var(--surface)')}
${line(X(-6.3), Y(0), X(6.3), Y(0), { c: 'var(--muted)', w: 1.6 })}${line(X(0), Y(0), X(0), Y(1.08), { c: 'var(--muted)', w: 1.6 })}
${line(X(-6.3), Y(1), X(6.3), Y(1), { c: 'var(--line)', w: 1.4, dash: '4 4' })}${line(X(-6.3), Y(0.5), X(6.3), Y(0.5), { c: 'var(--line)', w: 1.4, dash: '4 4' })}
${[0, 0.5, 1].map(p => text(X(-6.3) + 4, Y(p) - 5, fmt(p), { anchor: 'start', size: 12 })).join('')}
${text(X(0) + 8, Y(1.08) + 8, tr('probability p', 'probabilitas p'), { anchor: 'start', size: 12 })}
${path(zs.map(z => [X(z), Y(sigmoid(z))]), k(3))}
${marks.map(z => `${line(X(z), Y(0), X(z), Y(sigmoid(z)), { c: 'var(--muted)', w: 1.2, dash: '3 4' })}${dot(X(z), Y(sigmoid(z)), z === 0 ? k(1) : k(3), 6)}${text(X(z), Y(0) + 17, fmt(z), { size: 12 })}`).join('')}
${marks.map(z => halo(X(z) + (z < 0 ? 12 : -12), Y(sigmoid(z)) + (z < 0 ? -10 : 18), p2(sigmoid(z)), { anchor: z < 0 ? 'start' : 'end', size: 13, fill: z === 0 ? k(1) : 'var(--ink)' })).join('')}
${text(X(6.3), Y(0) + 17, tr('score z', 'skor z'), { anchor: 'end', size: 12 })}
${text(X(-3.2), 280, tr('score below 0: probability below 0.5', 'skor di bawah 0: probabilitas di bawah 0,5'), { size: 12 })}
${text(X(3.2), 280, tr('score above 0: probability above 0.5', 'skor di atas 0: probabilitas di atas 0,5'), { size: 12 })}`);
}

// Hours -> score -> probability for four students, each as a column of three boxes.
function scoreToProbability() {
  const hrs = [1, 3, 4, 5], colW = 154, x0 = 14;
  const cols = hrs.map((h, i) => {
    const cx = x0 + i * (colW + 4) + colW / 2, z = Math.round(score(h) * 10) / 10 + 0, p = sigmoid(z);
    const bx = cx - 64;
    return `${box(bx, 24, 128, 44, soft(0), 'var(--line)')}${text(cx, 44, tr('Student', 'Siswa'), { size: 11 })}${text(cx, 61, `${fmt(h)} ${h === 1 ? tr('hour', 'jam') : tr('hours', 'jam')}`, ink)}
${line(cx, 70, cx, 92, { c: 'var(--muted)', w: 2, arrow: true })}
${box(bx, 94, 128, 62, soft(2), 'var(--line)')}${text(cx, 112, tr('score', 'skor'), { size: 11 })}
${text(cx, 129, `${fmt(1.2)} × ${fmt(h)} − ${fmt(3.6)}`, { size: 12, fill: 'var(--ink)' })}${text(cx, 148, `z = ${fmt(z)}`, ink)}
${line(cx, 158, cx, 180, { c: 'var(--muted)', w: 2, arrow: true })}
${box(bx, 182, 128, 88, soft(3), 'var(--line)')}${text(cx, 200, tr('probability of passing', 'probabilitas lulus'), { size: 11 })}
${text(cx, 224, `p = ${p2(p)}`, { weight: 700, fill: 'var(--ink)', size: 16 })}
<rect x="${bx + 14}" y="238" width="100" height="14" rx="4" fill="var(--surface)" stroke="var(--line)" stroke-width="1.4"/><rect x="${bx + 14}" y="238" width="${(100 * p).toFixed(1)}" height="14" rx="4" fill="${k(3)}"/>`;
  }).join('');
  return svg(640, 292, `${cols}${text(320, 286, tr('The bar shows p as a share of the full width, 0 to 1.', 'Batang menunjukkan p sebagai bagian dari lebar penuh, 0 sampai 1.'), { size: 12 })}`);
}

// Two features, the p = 0.5 boundary, and the p = 0.1 and p = 0.9 lines.
function decisionBoundary() {
  const X = h => 58 + h * 62, Y = t => 244 - t * 36;
  const zOf = (h, t) => h + 0.8 * t - 5;
  const tAt = (h, z) => (z + 5 - h) / 0.8;                     // t on the line where score = z
  const z90 = Math.log(9);
  const STUDENTS = [
    [3.5, 2.5, 1], [4, 1.5, 1], [5, 2, 1], [2.5, 4.5, 1], [1, 5.5, 1], [5.5, 4, 1], [4.5, 5, 1], [3, 4, 1], [2, 3.5, 1],
    [1, 1, 0], [2, 0.5, 0], [3, 1, 0], [0.8, 3, 0], [1.5, 2, 0], [2.5, 2.5, 0], [4, 0.4, 0], [0.5, 4.5, 0], [3.5, 0.5, 0], [1.5, 4.5, 0],
  ];
  const hMax = 6, tMax = 6;
  const hAtTop = 5 - 0.8 * tMax;                                // boundary meets the top edge at h = 0.2
  const above = `${X(hAtTop)},${Y(tMax)} ${X(hMax)},${Y(tMax)} ${X(hMax)},${Y(0)} ${X(5)},${Y(0)}`;
  const below = `${X(0)},${Y(0)} ${X(5)},${Y(0)} ${X(hAtTop)},${Y(tMax)} ${X(0)},${Y(tMax)}`;
  const h90 = 5 + z90 - 0.8 * tMax;                              // where p = 0.9 meets the top edge
  const t10at0 = tAt(0, -z90);                                   // where p = 0.1 meets h = 0
  return svg(640, 292, `${box(0, 0, 640, 292, 'var(--surface)')}
<polygon points="${above}" fill="${soft(0)}"/><polygon points="${below}" fill="${soft(1)}"/>
${line(X(0), Y(0), X(hMax), Y(0), { c: 'var(--muted)', w: 1.6 })}${line(X(0), Y(0), X(0), Y(tMax), { c: 'var(--muted)', w: 1.6 })}
${[0, 2, 4, 6].map(h => text(X(h), Y(0) + 16, fmt(h), { size: 12 })).join('')}${[0, 2, 4, 6].map(t => text(X(0) - 8, Y(t) + 4, fmt(t), { anchor: 'end', size: 12 })).join('')}
${text(X(3), 280, tr('hours studied', 'jam belajar'), { size: 12 })}
${text(X(0) + 6, Y(tMax) - 8, tr('practice tests', 'latihan soal'), { anchor: 'start', size: 12 })}
${line(X(h90), Y(tMax), X(hMax), Y(tAt(hMax, z90)), { c: k(0), w: 2, dash: '6 5' })}
${line(X(0), Y(t10at0), X(5 - z90), Y(0), { c: k(1), w: 2, dash: '6 5' })}
${line(X(hAtTop), Y(tMax), X(5), Y(0), { c: 'var(--ink)', w: 3.2 })}
${STUDENTS.map(([h, t, y]) => (y ? dot(X(h), Y(t), k(0), 5.5) : ring(X(h), Y(t), k(1), 5))).join('')}
${halo(X(4.9), Y(tAt(4.9, z90)) - 8, `p = ${fmt(0.9)}`, { anchor: 'start', fill: k(0) })}
${halo(X(5.1), Y(0) - 8, `p = ${fmt(0.5)}`, { anchor: 'start' })}
${halo(X(0.08), Y(3.5) - 6, `p = ${fmt(0.1)}`, { anchor: 'start', fill: k(1) })}
${box(446, 30, 188, 240, 'var(--surface)', 'var(--line)')}
${text(540, 54, tr('score', 'skor'), { size: 12 })}
${text(540, 74, `z = ${fmt(1)}·${tr('hours', 'jam')}`, ink)}${text(540, 94, `+ ${fmt(0.8)}·${tr('tests', 'latihan')} − ${fmt(5)}`, ink)}
${line(462, 108, 618, 108, { c: 'var(--line)', w: 1.4 })}
${text(540, 130, tr('z above 0: p above 0.5', 'z di atas 0: p di atas 0,5'), { size: 11, fill: k(0), weight: 700 })}
${text(540, 148, tr('predict pass', 'prediksi lulus'), { size: 12, fill: k(0) })}
${text(540, 174, tr('z below 0: p below 0.5', 'z di bawah 0: p di bawah 0,5'), { size: 11, fill: k(1), weight: 700 })}
${text(540, 192, tr('predict fail', 'prediksi gagal'), { size: 12, fill: k(1) })}
${dot(474, 222, k(0), 5.5)}${text(486, 226, tr('passed', 'lulus'), { anchor: 'start', size: 12 })}${ring(552, 222, k(1), 5)}${text(564, 226, tr('failed', 'gagal'), { anchor: 'start', size: 12 })}
${text(540, 248, tr('Thick line: the boundary.', 'Garis tebal: boundary.'), { size: 12 })}`);
}

export const figures = {
  'line-vs-sigmoid': lineVsSigmoid,
  'sigmoid-curve': sigmoidCurve,
  'score-to-probability': scoreToProbability,
  'decision-boundary': decisionBoundary,
};
