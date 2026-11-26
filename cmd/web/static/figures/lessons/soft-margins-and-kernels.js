// Figures for the lesson "Soft margins and kernels": [[figure:soft-margins-and-kernels/name|Caption]].
// Every number is computed or counted, not typed in by hand, with one exception: the cross-validation counts
// of the penguin grid. Those were produced once with sims/ml/svm.js on the 267 tuning penguins of the lesson
// "Tuning with search" (the 333 penguins with all four measurements and a recorded sex, cut with
// splitIndices(333, { train: 0.6, validation: 0.2 }, 4, sex) and the first two parts kept), predicting
// male or female, scored by stratified five-fold cross-validation (seed 4) with each fold's own mean and
// spread used to scale the four measurements. A figure is drawn synchronously and cannot fetch the csv,
// so they are constants here. Everything else comes from trainSvm(), which the SVM lab uses as well.
import { svg, dot, text, line, box, k, tr, fmt, pct } from '../kit.js';
import { trainSvm, decisionGrid, svmAccuracy, makeRings } from '../../sims/ml/svm.js';
import { rng, gauss } from '../../sims/ml/rng.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const num2 = v => fmt(v, { digits: 2 });
const cache = {};
const once = (key, make) => (cache[key] ??= make());

// A hollow circle around a support vector.
const halo = (x, y, r = 8.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="var(--ink)" stroke-width="2"/>`;
const stray = (x, y) => `<path d="M${x} ${y - 7}l7 7-7 7-7-7z" fill="${k(0)}" stroke="var(--ink)" stroke-width="2"/>`;

// ---- Figure 1: the same 41 points, a small C and a large C. ----
// Twenty points a side from two blobs (seed 1) plus one stray point of class -1 inside the +1 blob.
function sample() {
  return once('sample', () => {
    const random = rng(1), X = [], y = [];
    for (let i = 0; i < 20; i++) { X.push([2.8 + 0.9 * gauss(random), 3.2 + 0.9 * gauss(random)]); y.push(-1); }
    for (let i = 0; i < 20; i++) { X.push([6.8 + 0.9 * gauss(random), 6.6 + 0.9 * gauss(random)]); y.push(1); }
    X.push([5.6, 5.6]); y.push(-1);
    return { X, y, strayIndex: 40 };
  });
}

// Where the line w.x + b = c crosses the square 0..10 (two end points), or null.
function clip(w, b, c) {
  const hits = [];
  for (const edge of [0, 10]) {
    if (Math.abs(w[1]) > 1e-9) { const x = edge, yy = (c - b - w[0] * x) / w[1]; if (yy >= 0 && yy <= 10) hits.push([x, yy]); }
    if (Math.abs(w[0]) > 1e-9) { const yy = edge, x = (c - b - w[1] * yy) / w[0]; if (x >= 0 && x <= 10) hits.push([x, yy]); }
  }
  const out = [];
  for (const h of hits) if (!out.some(o => Math.hypot(o[0] - h[0], o[1] - h[1]) < 1e-6)) out.push(h);
  return out.length >= 2 ? [out[0], out[1]] : null;
}

function cDial() {
  const { X, y, strayIndex } = sample();
  const S = 236, oy = 56, ox0 = 22, ox1 = 382;
  const panels = [[0.1, ox0], [100, ox1]];
  const body = panels.map(([C, ox]) => {
    const m = once(`c${C}`, () => trainSvm(X, y, { C }));
    const P = (a, c) => [ox + a * S / 10, oy + S - c * S / 10];
    const seg = (c, style) => { const e = clip(m.w, m.b, c); if (!e) return ''; const [p, q] = [P(...e[0]), P(...e[1])]; return line(p[0], p[1], q[0], q[1], style); };
    const right = X.reduce((n, p, i) => n + (m.predict(p) === y[i] ? 1 : 0), 0);
    const sv = new Set(m.supportIndices);
    const pts = X.map((p, i) => {
      const [px, py] = P(...p);
      if (i === strayIndex) return stray(px, py);
      return `${dot(px, py, k(y[i] === 1 ? 1 : 0), 4.6)}${sv.has(i) ? halo(px, py) : ''}`;
    }).join('');
    const strayHalo = sv.has(strayIndex) ? halo(...P(...X[strayIndex]), 11) : '';
    return `${text(ox + S / 2, 22, `C = ${fmt(C)}`, { ...INK, size: 15 })}
${text(ox + S / 2, 41, C < 1 ? tr('small C: a wide, forgiving street', 'C kecil: jalan lebar yang longgar') : tr('large C: a narrow, strict street', 'C besar: jalan sempit yang ketat'), { size: 13 })}
${box(ox, oy, S, S)}
${seg(1, { c: 'var(--muted)', w: 2, dash: '6 5' })}${seg(-1, { c: 'var(--muted)', w: 2, dash: '6 5' })}${seg(0, { c: 'var(--ink)', w: 2.8 })}
${pts}${strayHalo}
${text(ox + S / 2, oy + S + 24, tr(`street width ${num2(m.margin())}`, `lebar jalan ${num2(m.margin())}`), { ...INK, size: 13 })}
${text(ox + S / 2, oy + S + 43, tr(`${fmt(m.supportIndices.length)} support vectors, ${fmt(right)} of ${fmt(X.length)} right`, `${fmt(m.supportIndices.length)} support vector, ${fmt(right)} dari ${fmt(X.length)} benar`), { size: 13 })}`;
  }).join('');
  const ly = 372;
  const legend = `${dot(150, ly, k(0), 5)}${text(162, ly + 4, tr('class −1', 'kelas −1'), { anchor: 'start', size: 12 })}
${dot(236, ly, k(1), 5)}${text(248, ly + 4, tr('class +1', 'kelas +1'), { anchor: 'start', size: 12 })}
${stray(332, ly)}${text(346, ly + 4, tr('the stray point', 'titik liar'), { anchor: 'start', size: 12 })}
${halo(470, ly, 7)}${text(484, ly + 4, tr('support vector', 'support vector'), { anchor: 'start', size: 12 })}`;
  return svg(640, 390, `${body}${legend}`);
}

// ---- Figure 2: similarity falls with distance; a score built from similarities bends. ----
const TOY_X = [0, 1, 3, 4, 5, 7, 8], TOY_Y = [-1, -1, 1, 1, 1, -1, -1];
function toyModel() {
  return once('toy', () => trainSvm(TOY_X.map(v => [v]), TOY_Y, { kernel: 'rbf', C: 10, gamma: 0.25 }));
}

function rbfSimilarity() {
  const gammas = [[0.25, 0], [1, 1], [4, 2]];
  // Left panel: K(d) = exp(-gamma d^2) for d from 0 to 3.
  const lx = 48, ly = 40, lw = 240, lh = 190;
  const X = d => lx + d * lw / 3, Y = v => ly + lh - v * lh;
  const ticks = [0, 1, 2, 3].map(t => `${text(X(t), ly + lh + 18, fmt(t), { size: 12 })}`).join('') +
    [0, 0.5, 1].map(t => `${text(lx - 8, Y(t) + 4, fmt(t), { anchor: 'end', size: 12 })}${line(lx, Y(t), lx + lw, Y(t), { c: 'var(--line)', w: 1 })}`).join('');
  const curves = gammas.map(([g, c]) => {
    const pts = Array.from({ length: 61 }, (_, i) => { const d = i * 3 / 60; return `${i ? 'L' : 'M'}${X(d)} ${Y(Math.exp(-g * d * d))}`; }).join('');
    return `<path d="${pts}" stroke="${k(c)}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }).join('');
  const marks = gammas.map(([g, c]) => dot(X(1), Y(Math.exp(-g)), k(c), 4.5)).join('');
  const key = gammas.map(([g, c], i) => `${line(lx + 118, ly + 14 + i * 20, lx + 140, ly + 14 + i * 20, { c: k(c), w: 3 })}${text(lx + 147, ly + 18 + i * 20, `γ = ${fmt(g)}: ${num2(Math.exp(-g))}`, { anchor: 'start', fill: 'var(--ink)', size: 12 })}`).join('');
  const left = `${text(lx + lw / 2, 18, tr('Similarity K = e^(−γ·d²)', 'Kemiripan K = e^(−γ·d²)'), { ...INK, size: 14 })}
${box(lx, ly, lw, lh)}${ticks}${curves}${marks}${key}
${text(lx + lw / 2, ly + lh + 38, tr('distance d between two points (dots: d = 1)', 'jarak d antara dua titik (titik: d = 1)'), { size: 12 })}`;

  // Right panel: the score of an RBF SVM on seven points on a line (gamma 0.25, C 10).
  const m = toyModel();
  const xs = Array.from({ length: 121 }, (_, i) => -1 + i * 10 / 120);
  const fs = xs.map(v => m.decision([v]));
  const lo = Math.min(...fs, -1.2), hi = Math.max(...fs, 1.2);
  const rx = 352, rw = 270;
  const RX = v => rx + (v + 1) * rw / 10, RY = v => ly + lh - (v - lo) * lh / (hi - lo);
  const segs = xs.slice(1).map((v, i) => { const mid = (fs[i] + fs[i + 1]) / 2; return line(RX(xs[i]), RY(fs[i]), RX(v), RY(fs[i + 1]), { c: k(mid >= 0 ? 1 : 0), w: 3.2 }); }).join('');
  const zeros = [];
  for (let i = 1; i < xs.length; i++) if (Math.sign(fs[i]) !== Math.sign(fs[i - 1])) {
    let a = xs[i - 1], b = xs[i];
    for (let it = 0; it < 40; it++) { const mid = (a + b) / 2; if (Math.sign(m.decision([mid])) === Math.sign(m.decision([a]))) a = mid; else b = mid; }
    zeros.push((a + b) / 2);
  }
  const sv = new Set(m.supportIndices);
  const pts = TOY_X.map((v, i) => `${dot(RX(v), RY(0), k(TOY_Y[i] === 1 ? 1 : 0), 5.5)}${sv.has(i) ? halo(RX(v), RY(0), 9.5) : ''}`).join('');
  const xt = [0, 2, 4, 6, 8].map(t => text(RX(t), ly + lh + 18, fmt(t), { size: 12 })).join('');
  const yt = [-1, 0, 1].map(t => `${text(rx - 8, RY(t) + 4, fmt(t), { anchor: 'end', size: 12 })}${t === 0 ? '' : line(rx, RY(t), rx + rw, RY(t), { c: 'var(--line)', w: 1 })}`).join('');
  const right = `${text(rx + rw / 2, 18, tr('The score of an RBF SVM, γ = 0.25', 'Skor SVM RBF, γ = 0,25'), { ...INK, size: 14 })}
${box(rx, ly, rw, lh)}${yt}${line(rx, RY(0), rx + rw, RY(0), { c: 'var(--ink)', w: 1.6, dash: '5 4' })}${segs}${pts}${xt}
${text(rx + rw / 2, ly + lh + 38, tr(`score above 0 only between ${num2(zeros[0])} and ${num2(zeros[1])}`, `skor di atas 0 hanya antara ${num2(zeros[0])} dan ${num2(zeros[1])}`), { size: 12 })}`;
  return svg(640, 296, `${left}${right}`);
}

// ---- Figure 3: three gamma values on two noisy rings (C = 1). ----
const RING_SEED = 1, RING_NOISE = 0.45, RING_N = 30;
function gammaPanels() {
  const train = once('ringsTrain', () => makeRings(RING_N, { noise: RING_NOISE, seed: RING_SEED }));
  const held = once('ringsHeld', () => makeRings(200, { noise: RING_NOISE, seed: RING_SEED + 10 }));
  const cases = [
    [0.01, tr('too smooth', 'terlalu mulus')],
    [1, tr('about right', 'cukup pas')],
    [30, tr('too local', 'terlalu lokal')],
  ];
  const S = 190, gap = 25, oy = 46, B = 4.5, steps = 28;
  const body = cases.map(([g, label], i) => {
    const m = once(`ring${g}`, () => trainSvm(train.X, train.y, { kernel: 'rbf', C: 1, gamma: g }));
    const grid = decisionGrid(m, { xMin: -B, xMax: B, yMin: -B, yMax: B }, steps);
    const ox = 10 + i * (S + gap), cell = S / (steps - 1);
    const P = (a, c) => [ox + (a + B) / (2 * B) * S, oy + S - (c + B) / (2 * B) * S];
    const cells = [];
    for (let j = 0; j < steps - 1; j++) for (let ii = 0; ii < steps - 1; ii++) {
      const v = grid.values[j][ii] + grid.values[j][ii + 1] + grid.values[j + 1][ii] + grid.values[j + 1][ii + 1];
      cells.push(`<rect x="${(ox + ii * cell).toFixed(1)}" y="${(oy + S - (j + 1) * cell).toFixed(1)}" width="${(cell + 0.4).toFixed(1)}" height="${(cell + 0.4).toFixed(1)}" fill="${k(v >= 0 ? 1 : 0)}"/>`);
    }
    const pts = train.X.map((p, idx) => dot(...P(...p), k(train.y[idx] === 1 ? 1 : 0), 3.6)).join('');
    const sv = m.supportIndices.length;
    return `${text(ox + S / 2, 18, `γ = ${fmt(g)}`, { ...INK, size: 15 })}${text(ox + S / 2, 36, label, { size: 13 })}
${box(ox, oy, S, S, 'var(--surface)')}<g opacity="0.2">${cells.join('')}</g>${pts}
${text(ox + S / 2, oy + S + 22, tr(`training ${pct(svmAccuracy(m, train.X, train.y), 0)}`, `training ${pct(svmAccuracy(m, train.X, train.y), 0)}`), { ...INK, size: 13 })}
${text(ox + S / 2, oy + S + 41, tr(`held-out ${pct(svmAccuracy(m, held.X, held.y), 0)}`, `held-out ${pct(svmAccuracy(m, held.X, held.y), 0)}`), { ...INK, size: 13 })}
${text(ox + S / 2, oy + S + 60, tr(`${fmt(sv)} of ${fmt(train.X.length)} are support vectors`, `${fmt(sv)} dari ${fmt(train.X.length)} adalah support vector`), { size: 12 })}`;
  }).join('');
  const ly = 330;
  const legend = `${dot(170, ly, k(0), 5)}${text(182, ly + 4, tr('inner ring (−1)', 'cincin dalam (−1)'), { anchor: 'start', size: 12 })}
${dot(330, ly, k(1), 5)}${text(342, ly + 4, tr('outer ring (+1)', 'cincin luar (+1)'), { anchor: 'start', size: 12 })}`;
  return svg(640, 346, `${body}${legend}`);
}

// ---- Figure 4: the penguin grid of C and gamma, with scaled and with raw features. ----
// Penguins classified right out of 267 by stratified 5-fold cross-validation. Rows: C. Columns: gamma.
const GRID_C = [0.1, 1, 10, 100], GRID_G = [0.01, 0.1, 1, 10];
const SCALED = [[145, 236, 239, 135], [236, 240, 242, 225], [240, 238, 236, 223], [241, 241, 229, 223]];
const RAW = [[134, 135, 135, 135], [188, 172, 138, 137], [188, 172, 138, 137], [190, 172, 138, 137]];
const TUNING_N = 267;

function tuningGrid() {
  const cell = 54, top = 92;
  const panels = [[tr('Scaled features', 'Feature yang di-scale'), SCALED, 56], [tr('Raw features', 'Feature mentah'), RAW, 362]];
  const body = panels.map(([title, data, ox]) => {
    const best = Math.max(...data.flat());
    const shade = v => 6 + Math.max(0, (v - 130) / (245 - 130)) * 62;
    const cells = data.map((row, r) => row.map((v, c) => {
      const x = ox + c * cell, y = top + r * cell, isBest = v === best;
      return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="color-mix(in srgb, ${k(2)} ${shade(v).toFixed(0)}%, var(--surface))" stroke="${isBest ? 'var(--ink)' : 'var(--line)'}" stroke-width="${isBest ? 3 : 1}"/>${text(x + cell / 2, y + cell / 2 + 5, fmt(v), { fill: 'var(--ink)', weight: isBest ? 800 : 600, size: 14 })}`;
    }).join('')).join('');
    const cols = GRID_G.map((g, c) => text(ox + c * cell + cell / 2, top - 8, fmt(g), { size: 12 })).join('');
    const rows = GRID_C.map((C, r) => text(ox - 8, top + r * cell + cell / 2 + 4, fmt(C), { anchor: 'end', size: 12 })).join('');
    return `${text(ox + 2 * cell, 20, title, { ...INK, size: 15 })}
${text(ox + 2 * cell, 40, tr(`best ${fmt(best)} of ${fmt(TUNING_N)}, ${pct(best / TUNING_N, 1)}`, `terbaik ${fmt(best)} dari ${fmt(TUNING_N)}, ${pct(best / TUNING_N, 1)}`), { size: 13 })}
${text(ox + 2 * cell, top - 28, tr('gamma', 'gamma'), { size: 12, fill: 'var(--ink)' })}${cols}${cells}${rows}
${text(ox - 38, top + 2 * cell, 'C', { size: 12, fill: 'var(--ink)' })}`;
  }).join('');
  const note = `${text(320, 334, tr('Each cell: penguins classified right out of 267 in five-fold cross-validation.', 'Tiap sel: penguin yang benar dari 267 dalam cross-validation lima fold.'), { size: 12 })}${text(320, 352, tr('The outlined cell is the best.', 'Sel berbingkai tebal adalah yang terbaik.'), { size: 12 })}`;
  return svg(640, 362, `${body}${note}`);
}

export const figures = {
  'c-dial': cDial,
  'rbf-similarity': rbfSimilarity,
  'gamma-panels': gammaPanels,
  'tuning-grid': tuningGrid,
};
