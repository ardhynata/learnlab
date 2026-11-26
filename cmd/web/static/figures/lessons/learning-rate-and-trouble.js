// Figures for "Learning rate and trouble". The curves and paths are computed with the same
// gradient-descent code the lab uses (sims/ml/gd.js), so the pictures cannot drift from the maths.
import { svg, dot, ring, text, line, box, k, soft, tr, fmt } from '../kit.js';
import { functions1d } from '../../sims/ml/gd.js';
import { runTrace } from '../../sims/ml/lrdiagnose.js';

let clipCount = 0;
const f2 = v => Number(v.toFixed(1));

// Four loss-against-step curves: slow, good, zigzag, exploding.
function lossCurves() {
  const P = functions1d.parabola, steps = 30;
  const panels = [
    { title: tr('Too small', 'Terlalu kecil'), note: tr('a slow, steady slope', 'turun pelan namun stabil'), opts: { lr: 0.01 }, sub: tr(`learning rate ${fmt(0.01)}`, `learning rate ${fmt(0.01)}`), c: 3 },
    { title: tr('Just right', 'Pas'), note: tr('drops fast, then flat', 'turun cepat, lalu datar'), opts: { lr: 0.5 }, sub: tr(`learning rate ${fmt(0.5)}`, `learning rate ${fmt(0.5)}`), c: 2 },
    { title: tr('Too much momentum', 'Momentum berlebih'), note: tr('up and down in waves', 'bergelombang'), opts: { lr: 0.1, momentum: 0.9 }, sub: tr(`rate ${fmt(0.1)}, momentum ${fmt(0.9)}`, `rate ${fmt(0.1)}, momentum ${fmt(0.9)}`), c: 0 },
    { title: tr('Too big', 'Terlalu besar'), note: tr('grows every step', 'makin besar tiap langkah'), opts: { lr: 2.1 }, sub: tr(`learning rate ${fmt(2.1)}`, `learning rate ${fmt(2.1)}`), c: 1 },
  ];
  const W = 160, H = 120, gap = 14, top = 54;
  const body = panels.map((p, i) => {
    const ox = 4 + i * (W + gap);
    const losses = runTrace(P, p.opts, steps).map(s => s.loss);
    const start = losses[0];
    const yMax = i === 3 ? start * 4 : start;
    const X = t => ox + 12 + t * (W - 20) / steps;
    const Y = v => top + H - 8 - Math.min(v, yMax * 1.2) / yMax * (H - 18);
    const id = `lrclip${++clipCount}`;
    const path = losses.map((v, t) => `${t ? 'L' : 'M'}${f2(X(t))} ${f2(Y(v))}`).join('');
    return `<g>${box(ox, top - 6, W, H + 6)}
<clipPath id="${id}"><rect x="${ox + 2}" y="${top - 4}" width="${W - 4}" height="${H + 2}"/></clipPath>
${line(ox + 12, top + H - 8, ox + W - 6, top + H - 8, { c: 'var(--muted)', w: 1.4 })}${line(ox + 12, top + H - 8, ox + 12, top + 4, { c: 'var(--muted)', w: 1.4 })}
<path d="${path}" clip-path="url(#${id})" fill="none" stroke="${k(p.c)}" stroke-width="3" stroke-linejoin="round"/>
${i === 3 ? text(ox + W - 10, top + 20, tr('off the chart', 'di luar grafik'), { anchor: 'end', size: 12, fill: k(1), weight: 700 }) : ''}
${text(ox + W / 2 + 4, top + H + 26, tr('step', 'langkah'), { size: 12 })}
${text(ox + W / 2, 22, p.title, { weight: 700, fill: 'var(--ink)', size: 15 })}${text(ox + W / 2, 40, p.note, { size: 13 })}
${text(ox + W / 2, top + H + 44, p.sub, { size: 13 })}</g>`;
  }).join('');
  return svg(700, 254, `${body}${text(350, 246, tr('The first three panels share one vertical scale. The last reaches four times higher so the growth fits.', 'Tiga panel pertama berskala vertikal sama; panel terakhir 4 kali lebih tinggi agar muat.'), { size: 13 })}`);
}

// A ball started on the left rolls into the shallow dip; one started on the right reaches the deep dip.
function stuckBall() {
  const w = functions1d.wiggly, Wd = 640, Hd = 300;
  const X = x => 40 + x * 56, Y = v => 252 - v * 26;
  const curve = Array.from({ length: 201 }, (_, i) => `${i ? 'L' : 'M'}${f2(X(i / 20))} ${f2(Y(w.f(i / 20)))}`).join('');
  const left = runTrace(w, { lr: 0.1 }, 40, 1), right = runTrace(w, { lr: 0.1 }, 40, 6.5);
  const trail = (t, c) => t.slice(0, 18).filter((_, i) => i % 3 === 0).map((s, i) => (i ? dot(X(s.x), Y(s.loss), c, 4.5) : ring(X(s.x), Y(s.loss), c, 7))).join('');
  return svg(Wd, Hd, `
${line(40, 262, 610, 262, { c: 'var(--muted)', w: 1.6, arrow: true })}${text(325, 290, tr('position x', 'posisi x'))}${text(14, 20, tr('loss', 'loss'), { anchor: 'start' })}${line(40, 262, 40, 26, { c: 'var(--muted)', w: 1.6 })}
${line(X(7.2), Y(2.59), X(9.7), Y(2.59), { c: k(0), w: 1.4, dash: '5 4' })}${line(X(8.13), Y(1.39), X(9.7), Y(1.39), { c: k(1), w: 1.4, dash: '5 4' })}
<path d="${curve}" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
${trail(left, k(0))}${dot(X(left.at(-1).x), Y(left.at(-1).loss), k(0), 8)}
${trail(right, k(1))}${dot(X(right.at(-1).x), Y(right.at(-1).loss), k(1), 8)}
${text(X(1) + 12, Y(w.f(1)) - 14, tr('start A', 'awal A'), { anchor: 'start', fill: k(0), weight: 700 })}
${text(X(6.5) + 8, Y(w.f(6.5)) - 14, tr('start B', 'awal B'), { anchor: 'start', fill: k(1), weight: 700 })}
${text(X(2.15), Y(2.59) + 30, tr('shallow dip', 'lembah dangkal'), { fill: k(0), weight: 700 })}${text(X(2.15), Y(2.59) + 46, tr('a local minimum', 'local minimum'), { size: 12 })}
${text(X(4.72), Y(3.65) - 12, tr('hump', 'punggungan'), { size: 13 })}
${text(X(8.13), Y(1.39) + 26, tr('deepest point', 'titik terdalam'), { fill: k(1), weight: 700 })}${text(X(8.13), Y(1.39) + 40, tr('the global minimum', 'global minimum'), { size: 12 })}
${text(X(2.15) + 8, 40, tr('From A the slope always points into the shallow dip,', 'Dari A, lereng selalu mengarah ke lembah dangkal,'), { anchor: 'start', size: 12 })}${text(X(2.15) + 8, 56, tr('so with this rate descent settles there and does not climb the hump.', 'sehingga descent berhenti di sana, bukan memanjat punggungan.'), { anchor: 'start', size: 12 })}`);
}

// Learning rates on a log axis, with the distance multiplier per step for the steep parabola (curvature 6).
function logLadder() {
  const rates = [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1];
  const X = lr => 50 + (Math.log10(lr) + 3) * 190, limit = 1 / 3;
  const words = [tr('crawls', 'merayap'), tr('crawls', 'merayap'), tr('slow', 'lambat'), tr('steady', 'stabil'), tr('fast', 'cepat'), tr('jumps across', 'melompat lewat'), tr('explodes', 'meledak')];
  const body = rates.map((lr, i) => {
    const factor = 1 - 6 * lr, bad = lr > limit, c = bad ? k(1) : k(2);
    const label = fmt(Number(factor.toFixed(factor > 0.9 || factor < -1 ? 3 : 2)));
    return `${line(X(lr), 100, X(lr), 110, { c: 'var(--muted)', w: 2 })}${text(X(lr), 128, fmt(lr), { weight: 700, fill: 'var(--ink)', size: 14 })}
${text(X(lr), 160, `×${label.replace('-', '\u2212')}`, { weight: 700, fill: c, size: 14 })}${text(X(lr), 180, words[i], { size: 12 })}`;
  }).join('');
  return svg(700, 215, `
<rect x="${X(0.001) - 20}" y="78" width="${X(limit) - X(0.001) + 20}" height="22" rx="6" fill="${soft(2)}"/>
<rect x="${X(limit)}" y="78" width="${X(1) - X(limit) + 24}" height="22" rx="6" fill="${soft(1)}"/>
${line(X(0.001) - 20, 100, X(1) + 24, 100, { c: 'var(--muted)', w: 2 })}
${text((X(0.001) - 20 + X(limit)) / 2, 94, tr('distance shrinks every step', 'jarak mengecil tiap langkah'), { fill: 'var(--ink)', size: 12 })}${text((X(limit) + X(1) + 24) / 2, 94, tr('distance grows', 'jarak membesar'), { fill: 'var(--ink)', size: 12 })}
${line(X(limit), 66, X(limit), 112, { c: 'var(--ink)', w: 2, dash: '4 3' })}${text(X(limit), 56, tr('limit 2 / 6 = 1/3', 'batas 2 / 6 = 1/3'), { weight: 700, fill: 'var(--ink)', size: 13 })}
${body}
${text(10, 24, tr('Steep parabola, f(x) = 3(x - 5)². Learning rates on a log axis (each step on the axis is a factor of about 3).', 'Parabola curam, f(x) = 3(x - 5)². Learning rate pada sumbu log (tiap tanda kira-kira 3 kali lipat).'), { anchor: 'start', size: 13 })}
${text(350, 208, tr('The number under each rate is what one step multiplies the distance to the minimum by: 1 - 6 × rate.', 'Angka di bawah tiap rate adalah pengali jarak ke minimum dalam satu langkah: 1 - 6 × rate.'), { size: 12 })}`);
}

// The same straight-line fit to the penguins (flipper length against body mass), twice: with flipper length in
// millimetres and with it standardized. Half the mean squared error makes the loss a bowl whose sharpest bend (curvature) is
// 40,565 for the raw column (the mean of the squared lengths, 342 penguins) and 1 once standardized, so the
// largest learning rate that still converges is 2 divided by that bend. The 40,565 comes from data/penguins.csv.
function penguinScale() {
  const rawBend = 40565, rawLimit = 2 / rawBend, stdLimit = 2;
  const lo = -6, hi = 1, x0 = 40, x1 = 660;
  const X = v => x0 + (Math.log10(v) - lo) * (x1 - x0) / (hi - lo);
  const rows = [
    { y: 86, label: tr(`Flipper length in mm: curvature ${fmt(rawBend)}`, `Sirip dalam mm: kelengkungan ${fmt(rawBend)}`), limit: rawLimit, note: tr(`limit ${fmt(rawLimit, { max: 6 })}`, `batas ${fmt(rawLimit, { max: 6 })}`), anchor: 'start', dx: 8 },
    { y: 170, label: tr('Standardized: curvature 1', 'Standardisasi: kelengkungan 1'), limit: stdLimit, note: tr(`limit ${fmt(stdLimit)}`, `batas ${fmt(stdLimit)}`), anchor: 'end', dx: -8 },
  ];
  const H = 26;
  const bars = rows.map(r => `${text(x0, r.y - 8, r.label, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 12 })}
<rect x="${x0}" y="${r.y}" width="${X(r.limit) - x0}" height="${H}" rx="5" fill="${soft(2)}" stroke="${k(2)}" stroke-width="1.4"/>
<rect x="${X(r.limit)}" y="${r.y}" width="${x1 - X(r.limit)}" height="${H}" rx="5" fill="${soft(1)}" stroke="${k(1)}" stroke-width="1.4"/>
${line(X(r.limit), r.y - 4, X(r.limit), r.y + H + 4, { c: 'var(--ink)', w: 2.2 })}
${text(X(r.limit) + r.dx, r.y + H + 19, r.note, { anchor: r.anchor, fill: 'var(--ink)', weight: 700, size: 13 })}`).join('');
  const ticks = [1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1, 1, 10].map(v => `${line(X(v), 244, X(v), 250, { c: 'var(--muted)', w: 1.6 })}${text(X(v), 266, fmt(v, { max: 6 }), { size: 12 })}`).join('');
  const bandL = X(0.001), bandR = X(2.5);
  return svg(700, 306, `
<rect x="${bandL}" y="32" width="${bandR - bandL}" height="204" rx="8" fill="none" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="5 4"/>
${text(bandL + 8, 50, tr(`Lab slider: ${fmt(0.001)} to ${fmt(2.5)}`, `Slider lab: ${fmt(0.001)} sampai ${fmt(2.5)}`), { anchor: 'start', size: 12 })}
${bars}
${line(x0, 247, x1, 247, { c: 'var(--muted)', w: 1.6 })}${ticks}
${text(350, 292, tr('learning rate (log scale). Teal: the loss shrinks. Pink: it grows.', 'learning rate (skala log). Teal: loss mengecil. Pink: loss membesar.'), { size: 12 })}
${text(x0, 18, tr('Straight-line fit to 342 penguins, loss = half the mean squared error', 'Garis lurus untuk 342 penguin, loss = setengah rata-rata galat kuadrat'), { anchor: 'start', weight: 700, fill: 'var(--ink)', size: 13 })}`);
}
export const figures = { 'log-ladder': logLadder, 'penguin-scale': penguinScale, 'stuck-ball': stuckBall, 'loss-curves': lossCurves };
