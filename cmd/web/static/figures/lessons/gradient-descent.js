// Figures for the lesson "Gradient descent". Paths and contour lines are computed with the same
// math as the lab (sims/ml/gd.js, sims/ml/gdview.js), and the penguin curve with the lesson's own
// three penguins, so the pictures match what the learner computes and sees.
import { svg, dot, ring, diamond, text, line, box, k, tr, fmt } from '../kit.js';
import { surfaces2d, step2d, start2d, trace2d, contours } from '../../sims/ml/gd.js';
import { surfaceContours, gradSize } from '../../sims/ml/gdview.js';

// A label with a surface-colored outline so it stays readable over contour lines.
const halo = t => t.replace('<text', '<text paint-order="stroke" stroke="var(--surface)" stroke-width="4" stroke-linejoin="round"');

// A line with a colored arrowhead (the shared line() arrow is always the muted color).
function arrow(x1, y1, x2, y2, color, w = 3.2, head = 11) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = d => `${(x2 - head * Math.cos(a + d)).toFixed(1)} ${(y2 - head * Math.sin(a + d)).toFixed(1)}`;
  return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" fill="none"/><path d="M${x2} ${y2}L${p(-0.45)}L${p(0.45)}z" fill="${color}"/>`;
}

// Contour segments as one SVG path. `at` maps data (0..10) to pixels.
function contourPath(sets, at) {
  const d = sets.map(({ segments }) => segments.map(([a, b]) => `M${at.x(a.x).toFixed(1)} ${at.y(a.y).toFixed(1)}L${at.x(b.x).toFixed(1)} ${at.y(b.y).toFixed(1)}`).join('')).join('');
  return `<path d="${d}" fill="none" stroke="var(--muted)" stroke-width="1.2" opacity="0.7"/>`;
}

// The lesson's worked example: three penguins (flipper length in units of 100 mm, body mass in kg) and the
// model "mass = w x flipper". The loss is the mean squared error; the gradient is the mean of 2 x (w x - y).
const PENGUINS = { xs: [1.81, 2.10, 2.30], ys: [3.75, 4.45, 5.70] };
const penguinLoss = w => PENGUINS.xs.reduce((s, x, i) => s + (w * x - PENGUINS.ys[i]) ** 2, 0) / 3;
const penguinGrad = w => PENGUINS.xs.reduce((s, x, i) => s + 2 * x * (w * x - PENGUINS.ys[i]), 0) / 3;

// The loss against w, with the first four values of w that gradient descent visits (learning rate 0.1, start 0).
function penguinSteps() {
  const X = w => 62 + w * 130, Y = v => 250 - v * 9.2;
  const curve = Array.from({ length: 91 }, (_, i) => `${i ? 'L' : 'M'}${X(i / 20).toFixed(1)} ${Y(penguinLoss(i / 20)).toFixed(1)}`).join('');
  const ws = [0];
  for (let t = 0; t < 3; t++) ws.push(ws[t] - 0.1 * penguinGrad(ws[t]));
  const best = PENGUINS.xs.reduce((s, x, i) => s + x * PENGUINS.ys[i], 0) / PENGUINS.xs.reduce((s, x) => s + x * x, 0);
  const g0 = penguinGrad(0), tangent = w => penguinLoss(0) + g0 * w;
  const row = (i, y) => {
    const w = fmt(ws[i], { max: 2 }), l = fmt(penguinLoss(ws[i]), { max: 2 });
    return `${text(X(2.0), Y(y), tr(`step ${i}: w = ${w}, loss ${l}`, `langkah ${i}: w = ${w}, loss ${l}`), { anchor: 'start', size: 12.5 })}`;
  };
  return svg(680, 320, `
${line(50, 250, 650, 250, { c: 'var(--muted)', w: 1.6 })}${line(62, 250, 62, 14, { c: 'var(--muted)', w: 1.6 })}
${[0, 1, 2, 3, 4].map(v => `${line(X(v), 250, X(v), 256, { c: 'var(--muted)', w: 1.6 })}${text(X(v), 273, fmt(v))}`).join('')}
${[0, 10, 20].map(v => `${line(56, Y(v), 62, Y(v), { c: 'var(--muted)', w: 1.6 })}${text(50, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('')}
${text(356, 302, tr('the one parameter, w (kg per 100 mm of flipper)', 'satu-satunya parameter, w (kg per 100 mm flipper)'))}${text(14, 16, tr('loss (mean squared error)', 'loss (mean squared error)'), { anchor: 'start', size: 12 })}
<path d="${curve}" fill="none" stroke="${k(0)}" stroke-width="3.4" stroke-linejoin="round"/>
${line(X(0), Y(tangent(0)), X(1.0), Y(tangent(1.0)), { c: k(1), w: 2.4, dash: '7 5' })}
${text(X(1.05), Y(9.4), tr(`slope at w = 0 is ${fmt(g0, { max: 1 })}`, `kemiringan di w = 0 adalah ${fmt(g0, { max: 1 })}`), { anchor: 'start', weight: 700, fill: k(1) })}
${text(X(1.05), Y(7.6), tr('the curve falls to the right', 'kurva turun ke kanan'), { anchor: 'start', size: 12 })}
${diamond(X(best), 250, 'var(--ink)', 7)}
${ws.map((w, i) => `${dot(X(w), Y(penguinLoss(w)), k(0), 7)}`).join('')}
${[[0, 12, -8, 'start'], [1, -10, -14, 'end'], [2, 0, -26, 'middle'], [3, 14, -14, 'start']].map(([i, dx, dy, anchor]) => halo(text(X(ws[i]) + dx, Y(penguinLoss(ws[i])) + dy, `${i}`, { anchor, weight: 700, fill: 'var(--ink)', size: 14 }))).join('')}
${text(X(2.0), Y(23.5), tr('numbers on the dots = step number', 'angka di titik = nomor langkah'), { anchor: 'start', size: 12.5, weight: 700, fill: 'var(--ink)' })}
${row(0, 21.4)}${row(1, 19.4)}${row(2, 17.4)}${row(3, 15.4)}
${text(X(2.0), Y(13.4), tr(`diamond: w = ${fmt(best, { max: 2 })}, loss ${fmt(penguinLoss(best), { max: 2 })}`, `berlian: w = ${fmt(best, { max: 2 })}, loss ${fmt(penguinLoss(best), { max: 2 })}`), { anchor: 'start', size: 12.5, weight: 700, fill: 'var(--ink)' })}`);
}

// Contour lines of an oval bowl, the gradient at a point, and the first step against it (learning rate 0.2, a size chosen so the step is easy to see).
function contourGradient() {
  const f = (x, y) => (x - 5) ** 2 / 2 + 2 * (y - 5) ** 2;
  const S = 30, ox = 24, oy = 14;
  const at = { x: x => ox + x * S, y: y => oy + (10 - y) * S };
  const levels = [4, 8, 12, 16, 20, 24, 28, 32];
  const [P, g] = [{ x: 2, y: 7.5 }, { x: -3, y: 10 }];
  const len = Math.hypot(g.x, g.y), u = { x: g.x / len, y: g.y / len };
  const lr = 0.2;
  const next = { x: P.x - lr * (P.x - 5), y: P.y - lr * 4 * (P.y - 5) }; // the first step, learning rate 0.2
  const px = p => at.x(p.x), py = p => at.y(p.y);
  const label = (y, head, body, color) => `${dot(372, y - 5, color, 6)}${text(386, y, head, { anchor: 'start', weight: 700, fill: 'var(--ink)', size: 15 })}${body.map((l, i) => text(386, y + 20 + 17 * i, l, { anchor: 'start', size: 13.5 })).join('')}`;
  return svg(680, 330, `
${box(ox, oy, 10 * S, 10 * S, 'var(--surface)', 'var(--line)')}
${contourPath(contours(f, levels, 60), at)}
${text(ox + 5 * S, oy + 10 * S + 18, tr('parameter 1', 'parameter 1'))}${text(10, oy + 5 * S, tr('parameter 2', 'parameter 2'), { anchor: 'middle' }).replace('<text', `<text transform="rotate(-90 10 ${oy + 5 * S})"`)}
${diamond(at.x(5), at.y(5), 'var(--ink)', 8)}${halo(text(at.x(5), at.y(5) + 28, tr('lowest point', 'titik terendah'), { size: 12, weight: 700, fill: 'var(--ink)' }))}
${line(px({ x: P.x + 1.2 * u.y, y: P.y - 1.2 * u.x }), py({ x: P.x + 1.2 * u.y, y: P.y - 1.2 * u.x }), px({ x: P.x - 1.2 * u.y, y: P.y + 1.2 * u.x }), py({ x: P.x - 1.2 * u.y, y: P.y + 1.2 * u.x }), { c: 'var(--ink)', w: 1.6, dash: '4 4' })}
${arrow(px(P), py(P), px(P) + 58 * u.x, py(P) - 58 * u.y, k(1))}
${arrow(px(P), py(P), px(next) - 1, py(next) - 3, k(2))}
${dot(px(P), py(P), k(0), 7)}
${label(56, tr('Gradient (pink)', 'Gradient (pink)'), [tr('Points uphill, at right angles', 'Menunjuk ke arah naik, tegak lurus'), tr('to the contour line.', 'dengan garis kontur.')], k(1))}
${label(128, tr('Step (teal)', 'Langkah (teal)'), [tr('The opposite way:', 'Arah kebalikannya:'), tr('-(learning rate) × gradient.', '-(learning rate) × gradient.')], k(2))}
${label(200, tr('Dashed line', 'Garis putus-putus'), [tr('The contour line through the', 'Garis kontur yang lewat di'), tr('point, seen up close.', 'titik itu, dilihat dari dekat.')], 'var(--ink)')}
${text(386, 280, tr('Lines are drawn at equal loss steps:', 'Selisih loss antar garis sama besar:'), { anchor: 'start', size: 13.5 })}${text(386, 298, tr('packed lines mean a steep surface.', 'garis rapat berarti permukaan curam.'), { anchor: 'start', size: 13.5 })}`);
}

// The same walk on a round bowl and on a narrow ravine.
function bowlVsRavine() {
  const S = 30, oy = 34;
  const panel = (ox, key, lr, steps, title, note, startDy) => {
    const s = surfaces2d[key];
    const at = { x: x => ox + x * S, y: y => oy + (10 - y) * S };
    const t = trace2d(s, { lr }, steps);
    const path = t.map((p, i) => `${i ? 'L' : 'M'}${at.x(p.x).toFixed(1)} ${at.y(p.y).toFixed(1)}`).join('');
    return `${text(ox + 5 * S, 20, title, { weight: 700, fill: 'var(--ink)', size: 17 })}
${box(ox, oy, 10 * S, 10 * S, 'var(--surface)', 'var(--line)')}
${contourPath(surfaceContours(s, 10).sets, at)}
<path d="${path}" fill="none" stroke="${k(0)}" stroke-width="2.4" stroke-linejoin="round"/>
${t.slice(1).map(p => dot(at.x(p.x), at.y(p.y), k(0), 3.8)).join('')}
${ring(at.x(t[0].x), at.y(t[0].y), 'var(--ink)', 7)}${halo(text(at.x(t[0].x) + 12, at.y(t[0].y) + startDy, tr('start', 'awal'), { anchor: 'start', size: 14, weight: 700, fill: 'var(--ink)' }))}
${diamond(at.x(5), at.y(5), 'var(--ink)', 7)}
${text(ox + 5 * S, oy + 10 * S + 22, note, { size: 14 })}`;
  };
  return svg(700, 372, `
${panel(24, 'bowl', 0.25, 8, tr('Round bowl', 'Mangkuk bulat'), tr('every step points at the lowest point', 'tiap langkah mengarah ke titik terendah'), -12)}
${panel(376, 'ravine', 0.14, 14, tr('Narrow ravine', 'Jurang sempit'), tr('steps bounce between the steep walls', 'langkah memantul di antara dinding yang curam'), 5)}`);
}

// Two valleys: two starts 1.4 apart (learning rate 0.1, momentum 0, as in the lab) end in different valleys.
// The deep minimum (x = 7.51) and the shallow one (x = 2.62) are the ones the lab marks.
function twoValleys() {
  const S = 30, ox = 24, oy = 14, s = surfaces2d.twoValleys, lr = 0.1;
  const at = { x: x => ox + x * S, y: y => oy + (10 - y) * S };
  const walk = x0 => { // until the gradient is small, as the lab's verdict does (500 steps at most)
    const out = [start2d(s, { x: x0, y: 6.2 })];
    while (out.length < 500 && gradSize(s, out.at(-1)) >= 0.05) out.push(step2d(s, out.at(-1), { lr }));
    return out;
  };
  const runs = [{ x0: 4.2, color: k(1), tag: 'A' }, { x0: 5.6, color: k(0), tag: 'B' }].map(r => ({ ...r, t: walk(r.x0) }));
  const label = (y, run) => {
    const end = run.t.at(-1), where = end.x < 5 ? tr('the shallow valley', 'lembah dangkal') : tr('the deep valley', 'lembah dalam');
    return `${dot(372, y - 5, run.color, 6)}${text(386, y, tr(`Start ${run.tag}: Parameter 1 = ${fmt(run.x0, { max: 1 })}`, `Awal ${run.tag}: Parameter 1 = ${fmt(run.x0, { max: 1 })}`), { anchor: 'start', weight: 700, fill: 'var(--ink)', size: 15 })}
${text(386, y + 20, tr(`ends in ${where}`, `berakhir di ${where}`), { anchor: 'start', size: 13.5 })}
${text(386, y + 37, tr(`after ${fmt(run.t.length - 1)} steps, loss ${fmt(end.loss, { max: 2 })}`, `setelah ${fmt(run.t.length - 1)} langkah, loss ${fmt(end.loss, { max: 2 })}`), { anchor: 'start', size: 13.5 })}`;
  };
  const ridge = fmt(4.9, { max: 1 });
  const note = [tr('The dashed line is the ridge', 'Garis putus-putus adalah punggungan'),
    tr(`between the valleys, at ${ridge} on`, `di antara kedua lembah, di ${ridge} pada`),
    tr('Parameter 1. The side you start on', 'Parameter 1. Sisi tempatmu mulai'),
    tr('decides where the walk ends.', 'menentukan ke mana jalannya berakhir.')];
  return svg(680, 330, `
${box(ox, oy, 10 * S, 10 * S, 'var(--surface)', 'var(--line)')}
${contourPath(surfaceContours(s, 14).sets, at)}
${text(ox + 5 * S, oy + 10 * S + 18, tr('parameter 1', 'parameter 1'))}${text(10, oy + 5 * S, tr('parameter 2', 'parameter 2')).replace('<text', `<text transform="rotate(-90 10 ${oy + 5 * S})"`)}
${line(at.x(4.875), oy + 2, at.x(4.875), oy + 10 * S - 2, { c: 'var(--muted)', w: 1.6, dash: '5 5' })}
${runs.map(r => `<path d="${r.t.map((p, i) => `${i ? 'L' : 'M'}${at.x(p.x).toFixed(1)} ${at.y(p.y).toFixed(1)}`).join('')}" fill="none" stroke="${r.color}" stroke-width="2.6" stroke-linejoin="round"/>`).join('')}
${ring(at.x(runs[0].x0), at.y(6.2), 'var(--ink)', 7)}${halo(text(at.x(runs[0].x0) - 11, at.y(6.2) - 8, 'A', { anchor: 'end', size: 14, weight: 700, fill: 'var(--ink)' }))}
${ring(at.x(runs[1].x0), at.y(6.2), 'var(--ink)', 7)}${halo(text(at.x(runs[1].x0) + 11, at.y(6.2) - 8, 'B', { anchor: 'start', size: 14, weight: 700, fill: 'var(--ink)' }))}
${diamond(at.x(7.51), at.y(5), 'var(--ink)', 8)}${halo(text(at.x(7.51), at.y(5) + 28, tr('lowest point', 'titik terendah'), { size: 12, weight: 700, fill: 'var(--ink)' }))}
${ring(at.x(2.62), at.y(5), 'var(--muted)', 6)}${halo(text(at.x(2.62), at.y(5) + 26, tr('shallow valley', 'lembah dangkal'), { size: 12, weight: 700, fill: 'var(--muted)' }))}
${halo(text(at.x(4.875) + 4, oy + 18, tr('ridge', 'punggungan'), { anchor: 'start', size: 12, weight: 700, fill: 'var(--muted)' }))}
${runs.map((r, i) => label(70 + 80 * i, r)).join('')}
${note.map((l, i) => text(386, 244 + 18 * i, l, { anchor: 'start', size: 13.5 })).join('')}`);
}

export const figures = {
  'penguin-steps': penguinSteps,
  'contour-gradient': contourGradient,
  'bowl-vs-ravine': bowlVsRavine,
  'two-valleys': twoValleys,
};
