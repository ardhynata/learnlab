// Figures for the lesson "Lab: support vector machine": [[figure:svm-lab/name|Caption]].
// Every picture is computed with the lab's own math (sims/ml/svmlab.js on top of sims/ml/svm.js), on the
// same generated points the lab starts with (seed 7, 40 points per class, 30% held out), so the numbers
// printed here are the ones the lab shows. Nothing is typed in by hand. A figure is drawn synchronously
// and cannot fetch the penguins file, so none of them shows the real data.
import { svg, text, line, k, soft, tr, fmt, pct } from '../kit.js';
import { generatedPoints, heldOutFlags, fitLab, fromLog, contourSegments, HALF } from '../../sims/ml/svmlab.js';
import { decisionGrid } from '../../sims/ml/svm.js';

const SEED = 7;
const INK = { weight: 700, fill: 'var(--ink)' };
const cache = {};
const once = (key, make) => (cache[key] ??= make());

// The lab's points for one generated shape.
function points(shape) {
  return once(`pts-${shape}`, () => {
    const raw = generatedPoints(shape, SEED);
    const held = heldOutFlags(raw.map(p => p.label), SEED);
    return raw.map((p, i) => ({ ...p, held: held[i] }));
  });
}

// The lab's fit and its decision grid, for slider positions logC and logGamma.
function model(pts, kernel, logC, logGamma = 0) {
  const fit = fitLab(pts, { kernel, C: fromLog(logC), gamma: fromLog(logGamma) });
  const grid = decisionGrid(fit.model, { xMin: -HALF, xMax: HALF, yMin: -HALF, yMax: HALF }, 44);
  return { fit, grid };
}

// One plot square at (ox, oy) with side S: shaded regions, the boundary, the margin lines (linear only), the
// points (dot = class A, diamond = class B, cross = held out) and a ring round each support vector.
// `moved` ({ index, from }) marks a point the learner dragged: an accent ring and a dashed arrow from where it was.
function panel(ox, oy, S, pts, { fit, grid }, { linear = true, moved = null, pick = null } = {}) {
  const u = S / (2 * HALF);
  const X = v => ox + (v + HALF) * u, Y = v => oy + S - (v + HALF) * u;
  const { nx, ny, xs, ys, labels } = grid;
  const dx = xs[1] - xs[0], dy = ys[1] - ys[0];
  let shade = '';
  for (let j = 0; j < ny; j++) {
    let i = 0;
    while (i < nx) {
      let e = i;
      while (e + 1 < nx && labels[j][e + 1] === labels[j][i]) e++;
      const x0 = Math.max(-HALF, xs[i] - dx / 2), x1 = Math.min(HALF, xs[e] + dx / 2);
      const y0 = Math.max(-HALF, ys[j] - dy / 2), y1 = Math.min(HALF, ys[j] + dy / 2);
      shade += `<rect x="${X(x0).toFixed(1)}" y="${Y(y1).toFixed(1)}" width="${((x1 - x0) * u + 1).toFixed(1)}" height="${((y1 - y0) * u + 1).toFixed(1)}" fill="${soft(labels[j][i] === -1 ? 0 : 1)}"/>`;
      i = e + 1;
    }
  }
  const path = (level, stroke, width, dash) => {
    const d = contourSegments(grid, level).map(([a, b, c, e]) => `M${X(a).toFixed(1)} ${Y(b).toFixed(1)}L${X(c).toFixed(1)} ${Y(e).toFixed(1)}`).join('');
    return d ? `<path d="${d}" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''} fill="none" stroke-linecap="round"/>` : '';
  };
  const support = new Set(fit.supportPoints);
  const mark = (p, faded = false) => {
    const x = X(p.x), y = Y(p.y), c = k(p.label === -1 ? 0 : 1);
    const body = p.held
      ? `<path d="M${x - 3.6} ${y - 3.6}l7.2 7.2M${x - 3.6} ${y + 3.6}l7.2-7.2" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`
      : p.label === -1
        ? `<circle cx="${x}" cy="${y}" r="3.6" fill="${c}"/>`
        : `<path d="M${x} ${y - 5.2}l5.2 5.2-5.2 5.2-5.2-5.2z" fill="${c}" stroke="var(--ink)" stroke-width="1.1"/>`;
    return faded ? `<g opacity="0.35">${body}</g>` : body;
  };
  let extra = '';
  if (pick != null) extra = `<circle cx="${X(pts[pick].x)}" cy="${Y(pts[pick].y)}" r="11.5" fill="none" stroke="var(--accent)" stroke-width="2.6"/>`;
  if (moved) {
    const p = pts[moved.index];
    extra = `${mark({ ...p, x: moved.from[0], y: moved.from[1] }, true)}
${line(X(moved.from[0]), Y(moved.from[1]), X(p.x), Y(p.y), { c: 'var(--accent)', w: 1.8, dash: '4 3', arrow: true })}
<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="11.5" fill="none" stroke="var(--accent)" stroke-width="2.6"/>`;
  }
  return `<rect x="${ox}" y="${oy}" width="${S}" height="${S}" fill="var(--surface)"/>${shade}
${linear ? `${path(1, 'var(--muted)', 1.5, '5 4')}${path(-1, 'var(--muted)', 1.5, '5 4')}` : ''}${path(0, 'var(--ink)', 2.4)}
${pts.map(p => mark(p)).join('')}
${pts.map((p, i) => (support.has(i) ? `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="8.5" fill="none" stroke="var(--ink)" stroke-width="1.6"/>` : '')).join('')}
${extra}<rect x="${ox}" y="${oy}" width="${S}" height="${S}" fill="none" stroke="var(--line)" stroke-width="1.6"/>`;
}

const marginText = fit => tr(`Margin width ${fmt(fit.margin, { digits: 2 })}`, `Lebar margin ${fmt(fit.margin, { digits: 2 })}`);
const svText = fit => tr(`${fmt(fit.nSupport)} of ${fmt(fit.nTrain)} support vectors`, `${fmt(fit.nSupport)} dari ${fmt(fit.nTrain)} support vector`);

// ---- Figure 1: the lab's picture at its defaults, with a key and the numbers it prints. ----
function readingThePlot() {
  const pts = points('blobs'), m = model(pts, 'linear', -1), f = m.fit;
  const S = 270, ox = 8, oy = 12;
  const gx = 318, rowY = i => 30 + i * 26;
  const key = [
    [0, () => `<circle cx="${gx}" cy="${rowY(0)}" r="4.2" fill="${k(0)}"/>`, tr('Class A (dot)', 'Kelas A (titik bulat)')],
    [1, () => `<path d="M${gx} ${rowY(1) - 6}l6 6-6 6-6-6z" fill="${k(1)}" stroke="var(--ink)" stroke-width="1.3"/>`, tr('Class B (diamond)', 'Kelas B (belah ketupat)')],
    [2, () => `<path d="M${gx - 4} ${rowY(2) - 4}l8 8M${gx - 4} ${rowY(2) + 4}l8-8" stroke="${k(0)}" stroke-width="2.2" stroke-linecap="round"/>`, tr('Cross: held-out point', 'Silang: titik held-out')],
    [3, () => `<circle cx="${gx}" cy="${rowY(3)}" r="8" fill="none" stroke="var(--ink)" stroke-width="1.8"/>`, tr('Circled: support vector', 'Dilingkari: support vector')],
    [4, () => line(gx - 11, rowY(4), gx + 11, rowY(4), { c: 'var(--ink)', w: 2.6 }), tr('Solid line: decision boundary', 'Garis tebal: decision boundary')],
    [5, () => line(gx - 11, rowY(5), gx + 11, rowY(5), { c: 'var(--muted)', w: 1.8, dash: '5 4' }), tr('Dashed lines: margin lines', 'Garis putus-putus: garis margin')],
    [6, () => `<rect x="${gx - 10}" y="${rowY(6) - 8}" width="10" height="16" fill="${k(0)}" fill-opacity="0.3"/><rect x="${gx}" y="${rowY(6) - 8}" width="10" height="16" fill="${k(1)}" fill-opacity="0.3"/>`, tr('Shading: what the model predicts', 'Arsiran: prediksi model')],
  ].map(([, mk, label], i) => `${mk()}${text(gx + 22, rowY(i) + 4, label, { anchor: 'start', fill: 'var(--ink)', size: 13 })}`).join('');
  const ry = 232;
  const readout = `${line(gx - 14, ry - 24, 634, ry - 24, { c: 'var(--line)', w: 1.5 })}
${text(gx - 14, ry - 4, tr('What the lab prints under the title', 'Yang dicetak lab di bawah judul'), { anchor: 'start', ...INK, size: 13 })}
${text(gx - 14, ry + 20, tr(`${fmt(f.nSupport)} of ${fmt(f.nTrain)} training points are support vectors.`, `${fmt(f.nSupport)} dari ${fmt(f.nTrain)} titik training adalah support vector.`), { anchor: 'start', fill: 'var(--ink)', size: 13 })}
${text(gx - 14, ry + 40, tr(`Margin width ${fmt(f.margin, { digits: 2 })}.`, `Lebar margin ${fmt(f.margin, { digits: 2 })}.`), { anchor: 'start', fill: 'var(--ink)', size: 13 })}
${text(gx - 14, ry + 60, tr(`Accuracy: ${pct(f.trainAcc)} training, ${pct(f.heldAcc)} held-out.`, `Accuracy: ${pct(f.trainAcc)} training, ${pct(f.heldAcc)} held-out.`), { anchor: 'start', fill: 'var(--ink)', size: 13 })}`;
  return svg(640, 310, `${panel(ox, oy, S, pts, m)}${key}${readout}`);
}

// ---- Figure 2: drag the circled diamond at C 10: toward the line, then away. ----
function movingASupportVector() {
  const base = points('blobs'), logC = 1;
  const m0 = model(base, 'linear', logC);
  // The class B support vector nearest the middle of the plot: the one circled diamond to drag.
  const index = m0.fit.supportPoints.filter(i => base[i].label === 1).sort((a, b) => Math.hypot(base[a].x, base[a].y) - Math.hypot(base[b].x, base[b].y))[0];
  const from = [base[index].x, base[index].y];
  const variant = (x, y) => base.map((p, i) => (i === index ? { ...p, x, y } : p));
  const panels = [
    [tr('Start (C 10)', 'Awal (C 10)'), base, m0, null],
    [tr('Dragged toward the line', 'Digeser ke arah garis'), variant(0, 0), null, [0, 0]],
    [tr('Dragged away', 'Digeser menjauh'), variant(1.5, 1.5), null, [1.5, 1.5]],
  ];
  const S = 192, gap = 30;
  const body = panels.map(([title, pts, m, to], c) => {
    const mm = m ?? model(pts, 'linear', logC);
    const ox = 2 + c * (S + gap);
    return `${text(ox + S / 2, 20, title, { ...INK, size: 14 })}
${panel(ox, 32, S, pts, mm, { moved: to ? { index, from } : null, pick: to ? null : index })}
${text(ox + S / 2, 32 + S + 24, marginText(mm.fit), { ...INK, size: 15 })}
${text(ox + S / 2, 32 + S + 44, svText(mm.fit), { fill: 'var(--ink)', size: 13 })}`;
  }).join('');
  return svg(640, 32 + S + 56, body);
}

// ---- Figure 3: the same points at three values of C. ----
function threeValuesOfC() {
  const pts = points('blobs');
  const S = 192, gap = 30;
  const body = [-2, -1, 1].map((logC, c) => {
    const m = model(pts, 'linear', logC), ox = 2 + c * (S + gap);
    return `${text(ox + S / 2, 20, `C = ${fmt(fromLog(logC))}`, { ...INK, size: 15 })}
${panel(ox, 32, S, pts, m)}
${text(ox + S / 2, 32 + S + 24, marginText(m.fit), { ...INK, size: 15 })}
${text(ox + S / 2, 32 + S + 44, svText(m.fit), { fill: 'var(--ink)', size: 13 })}`;
  }).join('');
  return svg(640, 32 + S + 56, body);
}

// ---- Figure 4: Two rings, Linear against RBF, at the lab's default C and gamma. ----
function linearAgainstRbf() {
  const pts = points('rings');
  const S = 270, gap = 40, ox0 = 15;
  const cases = [
    [tr('Linear (straight line), C 0.1', 'Linear (garis lurus), C 0,1'), model(pts, 'linear', -1), true],
    [tr('RBF (curved), C 0.1, gamma 1', 'RBF (melengkung), C 0,1, gamma 1'), model(pts, 'rbf', -1, 0), false],
  ];
  const body = cases.map(([title, m, linear], c) => {
    const ox = ox0 + c * (S + gap), f = m.fit;
    return `${text(ox + S / 2, 20, title, { ...INK, size: 14 })}
${panel(ox, 32, S, pts, m, { linear })}
${text(ox + S / 2, 32 + S + 24, tr(`Training ${pct(f.trainAcc)}, held-out ${pct(f.heldAcc)}`, `Training ${pct(f.trainAcc)}, held-out ${pct(f.heldAcc)}`), { ...INK, size: 15 })}
${text(ox + S / 2, 32 + S + 44, linear ? marginText(f) : tr('No single margin width', 'Tidak ada satu lebar margin'), { fill: 'var(--ink)', size: 13 })}`;
  }).join('');
  return svg(640, 32 + S + 56, body);
}

export const figures = {
  'reading-the-plot': readingThePlot,
  'moving-a-support-vector': movingASupportVector,
  'three-values-of-c': threeValuesOfC,
  'linear-against-rbf': linearAgainstRbf,
};
