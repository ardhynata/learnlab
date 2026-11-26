// Figures for "Stochastic and mini-batch updates". The walks are computed with the same code the lab uses
// (sims/ml/sgdcompare.js, minibatchlab.js, gd.js), so the pictures cannot drift from the maths. Colors follow the lab:
// full batch k0, mini-batch k1, SGD k2.
import { svg, dot, ring, text, line, box, k, soft, tr, fmt } from '../kit.js';
import { run } from '../../sims/ml/sgdcompare.js';
import { generatedData, readRuns, lossOnPlot, toPlot, START, NAMES } from '../../sims/ml/minibatchlab.js';
import { contours, functions1d } from '../../sims/ml/gd.js';
import { contourLevels } from '../../sims/ml/gdview.js';
import { rng, gauss } from '../../sims/ml/rng.js';

const f1 = v => Number(v.toFixed(1));

// One epoch over 80 points cut three ways: one block per step.
function workPerEpoch() {
  const x0 = 30, W = 640, n = 80, cell = W / n;
  const rows = [
    { y: 44, c: 0, size: 80, name: tr('Full batch', 'Full batch'), what: tr('1 step of 80 points', '1 langkah dari 80 titik') },
    { y: 122, c: 1, size: 16, name: tr('Mini-batch (16)', 'Mini-batch (16)'), what: tr('5 steps of 16 points', '5 langkah dari 16 titik') },
    { y: 200, c: 2, size: 1, name: tr('SGD', 'SGD'), what: tr('80 steps of 1 point', '80 langkah dari 1 titik') },
  ];
  const body = rows.map(r => {
    const groups = n / r.size, gap = r.size === 1 ? 1.4 : r.size === 16 ? 6 : 0, H = 30;
    let blocks = '';
    for (let g = 0; g < groups; g++) {
      const gx = x0 + g * r.size * cell, w = r.size * cell - gap;
      const fill = g % 2 ? soft(r.c) : k(r.c);
      blocks += `<rect x="${f1(gx)}" y="${r.y}" width="${f1(w)}" height="${H}" rx="${r.size === 1 ? 1 : 5}" fill="${fill}" stroke="${k(r.c)}" stroke-width="1.2"/>`;
      if (r.size === 16 || r.size === 80) blocks += text(f1(gx + w / 2), r.y + 20, fmt(g + 1), { fill: g % 2 ? 'var(--ink)' : 'var(--surface)', weight: 700, size: 14 });
    }
    return `${text(x0, r.y - 10, r.name, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}${text(x0 + W, r.y - 10, r.what, { anchor: 'end', size: 13 })}${blocks}`;
  }).join('');
  return svg(700, 262, `${body}${text(350, 252, tr('Each block is one step. All three rows use the same 80 points once.', 'Tiap blok adalah satu langkah. Ketiga baris memakai 80 titik yang sama satu kali.'), { size: 13 })}`);
}

// The lab's default run (generated data, seed 1, learning rate 0.05, batch 16, 10 epochs) as three small contour maps.
function threePaths() {
  const data = generatedData(1), common = { data, start: START, lr: 0.05, epochs: 10, seed: 1 };
  const runs = {
    full: run({ ...common, batchSize: data.length }),
    mini: run({ ...common, batchSize: 16 }),
    sgd: run({ ...common, batchSize: 1 }),
  };
  const read = readRuns(runs, data), best = toPlot({ slope: 0.708425266539721, intercept: 0 });
  const f = lossOnPlot(data), { levels } = contourLevels(f, 12), sets = contours(f, levels, 60);
  const S = 212, gap = 22, x0 = 10, y0 = 40;
  const titles = {
    full: tr(`Full batch · ${fmt(runs.full.stepsTaken)} steps`, `Full batch · ${fmt(runs.full.stepsTaken)} langkah`),
    mini: tr(`Mini-batch (16) · ${fmt(runs.mini.stepsTaken)} steps`, `Mini-batch (16) · ${fmt(runs.mini.stepsTaken)} langkah`),
    sgd: tr(`SGD · ${fmt(runs.sgd.stepsTaken)} steps`, `SGD · ${fmt(runs.sgd.stepsTaken)} langkah`),
  };
  const body = NAMES.map((n, i) => {
    const ox = x0 + i * (S + gap), X = p => f1(ox + p.x / 10 * S), Y = p => f1(y0 + (10 - p.y) / 10 * S);
    const grid = sets.map(({ segments }) => segments.map(([a, b]) => `M${X(a)} ${Y(a)}L${X(b)} ${Y(b)}`).join('')).join('');
    const pts = runs[n].path.map(p => toPlot(p)).map(p => `${X(p)} ${Y(p)}`);
    const s = toPlot(START), clip = `clip${i}`;
    return `<g><clipPath id="${clip}"><rect x="${ox}" y="${y0}" width="${S}" height="${S}"/></clipPath>
<rect x="${ox}" y="${y0}" width="${S}" height="${S}" rx="6" fill="var(--surface)" stroke="var(--line)" stroke-width="1.6"/>
<path d="${grid}" clip-path="url(#${clip})" stroke="var(--muted)" stroke-opacity="0.45" stroke-width="1" fill="none"/>
<path d="M${pts.join('L')}" clip-path="url(#${clip})" fill="none" stroke="${k(i)}" stroke-width="${n === 'full' ? 3.4 : n === 'mini' ? 2.4 : 1.2}" stroke-linejoin="round" stroke-linecap="round"/>
${ring(X(s), Y(s), 'var(--ink)', 7)}${`<path d="M${X(best)} ${f1(Y(best) - 7)}l7 7-7 7-7-7z" fill="var(--ink)" stroke="var(--surface)" stroke-width="1.5"/>`}
${text(ox + S / 2, y0 - 12, titles[n], { fill: 'var(--ink)', weight: 700, size: 14 })}
${text(ox + S / 2, y0 + S + 20, tr(`wobble ${fmt(read[n].wobble, { digits: 2 })}`, `goyangan ${fmt(read[n].wobble, { digits: 2 })}`), { fill: k(i), weight: 700, size: 14 })}</g>`;
  }).join('');
  return svg(700, 306, `${body}${text(350, 296, tr('Ring: start. Diamond: best line. Slope (standardised) across, intercept (standardised) up.', 'Cincin: awal. Berlian: garis terbaik. Slope (terstandar) ke samping, intercept (terstandar) ke atas.'), { size: 12 })}`);
}

// Plain descent on Two dips versus the same walk with random noise added to each gradient.
function escape() {
  const w = functions1d.wiggly, lr = 0.1, steps = 60, noise = 4, seed = 5;
  const plain = [1], noisy = [1], r = rng(seed);
  for (let i = 0; i < steps; i++) {
    plain.push(plain.at(-1) - lr * w.grad(plain.at(-1)));
    noisy.push(noisy.at(-1) - lr * (w.grad(noisy.at(-1)) + noise * gauss(r)));
  }
  // left: the curve
  const CX = x => 24 + x * 25, CY = v => 240 - v * 25;
  const curve = Array.from({ length: 201 }, (_, i) => `${i ? 'L' : 'M'}${f1(CX(i / 20))} ${f1(CY(w.f(i / 20)))}`).join('');
  const endA = plain.at(-1), endB = Math.max(0, Math.min(10, noisy.at(-1)));
  // right: position against step
  const px0 = 330, pw = 262, py0 = 46, ph = 196;
  const T = t => f1(px0 + t / steps * pw), P = x => f1(py0 + ph - x / 10 * ph);
  const trace = (xs, c, wd) => `<path d="${xs.map((x, i) => `${i ? 'L' : 'M'}${T(i)} ${P(Math.max(0, Math.min(10, x)))}`).join('')}" fill="none" stroke="${c}" stroke-width="${wd}" stroke-linejoin="round"/>`;
  const marks = [[4.72, tr('hump 4.72', 'punggungan 4,72'), 'var(--ink)'], [2.15, fmt(2.15), k(0)], [8.13, fmt(8.13), k(1)]];
  return svg(700, 306, `
<rect x="4" y="8" width="296" height="256" rx="10" fill="var(--surface)" stroke="var(--line)" stroke-width="1.6"/>
${line(24, 240, 290, 240, { c: 'var(--muted)', w: 1.4 })}
<clipPath id="escclip"><rect x="6" y="10" width="292" height="252"/></clipPath><path d="${curve}" clip-path="url(#escclip)" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
${ring(CX(1), CY(w.f(1)), 'var(--ink)', 7)}${text(CX(1) + 12, CY(w.f(1)) - 10, tr('start', 'awal'), { anchor: 'start', size: 12, fill: 'var(--ink)', weight: 700 })}
${dot(CX(endA), CY(w.f(endA)), k(0), 8)}${text(CX(2.15), CY(w.f(2.15)) + 30, tr('shallow dip', 'lembah dangkal'), { size: 12, fill: k(0), weight: 700 })}
${dot(CX(endB), CY(w.f(endB)), k(1), 8)}${text(CX(8.13) - 4, CY(w.f(8.13)) + 30, tr('deep dip', 'lembah dalam'), { size: 12, fill: k(1), weight: 700 })}
${text(CX(4.72), CY(w.f(4.72)) - 12, tr('hump', 'punggungan'), { size: 12 })}
${text(152, 276, tr('The loss curve', 'Kurva loss'), { size: 13 })}
${line(px0, py0 + ph, px0 + pw, py0 + ph, { c: 'var(--muted)', w: 1.4 })}${line(px0, py0, px0, py0 + ph, { c: 'var(--muted)', w: 1.4 })}
${marks.map(([x, label, c]) => `${line(px0, P(x), px0 + pw, P(x), { c, w: 1.4, dash: x === 4.72 ? '6 4' : '2 4' })}${text(px0 + pw + 6, P(x) + 4, label, { anchor: 'start', size: 12, fill: c, weight: 700 })}`).join('')}
${trace(plain, k(0), 3)}${trace(noisy, k(1), 2.2)}
${text(px0 + pw / 2, 272, tr('step', 'langkah'), { size: 13 })}${text(px0, py0 - 8, tr('position x', 'posisi x'), { anchor: 'start', size: 12 })}
${text(px0 + 8, 20, tr('Without noise', 'Tanpa noise'), { anchor: 'start', size: 13, fill: k(0), weight: 700 })}${text(px0 + 130, 20, tr('With noise', 'Dengan noise'), { anchor: 'start', size: 13, fill: k(1), weight: 700 })}
${text(350, 296, tr(`Learning rate ${fmt(lr)}, noise of size ${fmt(noise)} added to each gradient, start at x = 1.`, `Learning rate ${fmt(lr)}, noise berukuran ${fmt(noise)} ditambahkan ke tiap gradient, mulai di x = 1.`), { size: 12 })}`);
}

// SGD for 20 epochs at rate 0.2: constant, and decaying as 0.2 / (1 + 0.5 * epoch).
function decay() {
  const data = generatedData(1), common = { data, start: START, lr: 0.2, epochs: 20, seed: 1, batchSize: 1 };
  const constant = run(common), decayed = run({ ...common, lrDecay: 0.5 });
  const floor = readRuns({ full: constant, mini: constant, sgd: constant }, data).floor;
  const x0 = 70, pw = 560, y0 = 66, ph = 180, yMin = 0.4, yMax = 1.5;
  const X = e => f1(x0 + (e - 1) / 19 * pw), Y = v => f1(y0 + ph - (Math.min(v, yMax) - yMin) / (yMax - yMin) * ph);
  const series = (r, c, wd) => `<path d="${r.lossPerEpoch.slice(1).map((v, i) => `${i ? 'L' : 'M'}${X(i + 1)} ${Y(v)}`).join('')}" fill="none" stroke="${c}" stroke-width="${wd}" stroke-linejoin="round"/>${r.lossPerEpoch.slice(1).map((v, i) => dot(X(i + 1), Y(v), c, 3.6)).join('')}`;
  const xt = [1, 5, 10, 15, 20].map(e => `${line(X(e), y0 + ph, X(e), y0 + ph + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(e), y0 + ph + 20, fmt(e), { size: 12 })}`).join('');
  const yt = [0.5, 1, 1.5].map(v => `${line(x0 - 5, Y(v), x0, Y(v), { c: 'var(--muted)', w: 1.4 })}${text(x0 - 10, Y(v) + 4, fmt(v, { digits: 1 }), { anchor: 'end', size: 12 })}`).join('');
  return svg(700, 318, `
${box(x0 - 20, y0 - 14, pw + 40, ph + 28, 'var(--surface)')}
${line(x0, y0 + ph, x0 + pw, y0 + ph, { c: 'var(--muted)', w: 1.4 })}${line(x0, y0, x0, y0 + ph, { c: 'var(--muted)', w: 1.4 })}${xt}${yt}
${line(x0, Y(floor), x0 + pw, Y(floor), { c: 'var(--muted)', w: 1.6, dash: '6 4' })}
${series(constant, k(2), 2.2)}${series(decayed, k(5), 3)}
${text(x0 + pw / 2, y0 + ph + 38, tr('Epoch', 'Epoch'), { size: 13 })}
<g>${line(x0 - 20, 14, x0 + 10, 14, { c: k(2), w: 3 })}${text(x0 + 16, 18, tr(`constant rate ${fmt(0.2)}`, `rate konstan ${fmt(0.2)}`), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${line(x0 - 20, 36, x0 + 10, 36, { c: k(5), w: 3 })}${text(x0 + 16, 40, tr(`decaying: ${fmt(0.2)} / (1 + ${fmt(0.5)} × epoch), ends at ${fmt(0.2 / (1 + 0.5 * 19), { digits: 3 })}`, `menurun: ${fmt(0.2)} / (1 + ${fmt(0.5)} × epoch), berakhir di ${fmt(0.2 / (1 + 0.5 * 19), { digits: 3 })}`), { anchor: 'start', size: 12, fill: 'var(--ink)' })}</g>
${line(x0 + 220, 14, x0 + 250, 14, { c: 'var(--muted)', w: 1.6, dash: '6 4' })}${text(x0 + 256, 18, tr('lowest possible loss', 'loss terendah yang mungkin'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${text(350, 308, tr(`Loss at the end of each epoch, SGD on the generated data. The start loss (${fmt(constant.lossPerEpoch[0], { digits: 2 })}) is above the chart.`, `Loss di akhir tiap epoch, SGD pada data buatan. Loss awal (${fmt(constant.lossPerEpoch[0], { digits: 2 })}) berada di atas grafik.`), { size: 12 })}`);
}

export const figures = { 'work-per-epoch': workPerEpoch, 'three-paths': threePaths, 'escape': escape, 'decay': decay };
