// Pure helpers for the SVM lab (sims/labs/svm-lab.js): the datasets, the train / held-out split, the
// fit that is redone on every drag, the contour lines of the decision function, and keyboard navigation
// between points. The trainer itself is sims/ml/svm.js. Tested in svmlab.test.js.
//
// Every point lives in "model space": roughly standardised coordinates, so the same plot range
// (-HALF..HALF on both axes) fits every dataset. Labels are -1 (class A) and +1 (class B).
import { rng, gauss, shuffle } from './rng.js';
import { trainSvm, svmAccuracy, makeRings } from './svm.js';
import { splitIndices } from './tabular.js';

export const HALF = 3;
export const SHAPES = ['blobs', 'overlap', 'rings', 'moons'];
export const PER_CLASS = 40;
export const HELD_FRACTION = 0.3;
export const PENGUIN_CLASSES = ['Adelie', 'Chinstrap'];
export const PENGUIN_FEATURES = ['bill_length_mm', 'bill_depth_mm'];

const clamp = v => Math.max(-HALF, Math.min(HALF, v));
const point = (x, y, label) => ({ x: clamp(x), y: clamp(y), label });

// 40 points of each class in one of four layouts, reproducible per seed.
//   blobs    two round clouds with a clear gap: a straight line separates them.
//   overlap  the same two clouds pushed together so they overlap: no line is perfect.
//   rings    one class on a ring inside the other: no straight line can work.
//   moons    two interlocking half circles: a curve is needed.
export function generatedPoints(shape, seed, perClass = PER_CLASS) {
  const random = rng(seed);
  const out = [];
  if (shape === 'rings') {
    const { X, y } = makeRings(perClass, { innerRadius: 0.8, outerRadius: 2.1, noise: 0.15, seed });
    X.forEach((p, i) => out.push(point(p[0], p[1], y[i])));
    return out;
  }
  for (const label of [-1, 1]) {
    for (let i = 0; i < perClass; i++) {
      if (shape === 'moons') {
        const a = Math.PI * random();
        const x = Math.cos(a) * 1.5 + (label === -1 ? -0.75 : 0.75);
        const y = (label === -1 ? 1 : -1) * Math.sin(a) * 1.5 + (label === -1 ? -0.5 : 0.5);
        out.push(point(x + 0.2 * gauss(random), y + 0.2 * gauss(random), label));
      } else {
        const gap = shape === 'blobs' ? 1.3 : 0.75, spread = shape === 'blobs' ? 0.6 : 0.85;
        out.push(point(label * gap + spread * gauss(random), label * gap * 0.65 + spread * gauss(random), label));
      }
    }
  }
  return out;
}

// Adelie against Chinstrap by bill length and bill depth, from the parsed penguins table. A row missing
// either measurement (the file writes NA) is dropped and counted, so the lab can say how many.
export function penguinPairs(table, classes = PENGUIN_CLASSES, features = PENGUIN_FEATURES) {
  const pairs = [];
  let ofClasses = 0;
  for (const row of table.rows) {
    const label = row.species === classes[0] ? -1 : row.species === classes[1] ? 1 : 0;
    if (!label) continue;
    ofClasses++;
    const a = row[features[0]], b = row[features[1]];
    if (typeof a === 'number' && Number.isFinite(a) && typeof b === 'number' && Number.isFinite(b)) pairs.push({ a, b, label });
  }
  return { pairs, total: ofClasses, dropped: ofClasses - pairs.length };
}

// A seeded sample of up to `perClass` pairs of each class (the first n of a shuffle, so it is balanced).
export function samplePairs(pairs, perClass, seed) {
  const random = rng(seed);
  const out = [];
  for (const label of [-1, 1]) out.push(...shuffle(pairs.filter(p => p.label === label), random).slice(0, perClass));
  return out;
}

// For each point, true when it is held out of training. Stratified: each class keeps its share, and each
// class always keeps at least two training points, whatever the data.
export function heldOutFlags(labels, seed, fraction = HELD_FRACTION) {
  const parts = splitIndices(labels.length, { train: 1 - fraction, validation: 0 }, seed, labels);
  const held = new Array(labels.length).fill(false);
  for (const i of parts.test) held[i] = true;
  return held;
}

// Standardises raw {a, b, label} rows with the TRAINING rows' mean and spread only (the held-out rows
// are never looked at), then clamps to the plot square. Returns the points and the scaler, so a point's
// plot position can be turned back into the original units.
export function standardisePairs(rows, held) {
  const train = rows.filter((_, i) => !held[i]);
  const stat = key => {
    const m = train.reduce((s, r) => s + r[key], 0) / train.length;
    const sd = Math.sqrt(train.reduce((s, r) => s + (r[key] - m) ** 2, 0) / train.length) || 1;
    return { mean: m, sd };
  };
  const sa = stat('a'), sb = stat('b');
  return {
    points: rows.map(r => point((r.a - sa.mean) / sa.sd, (r.b - sb.mean) / sb.sd, r.label)),
    scaler: [sa, sb],
  };
}

// The slider's log10 value as the number it stands for, rounded to three significant figures so the
// readout and the model agree.
export const fromLog = v => Number((10 ** v).toPrecision(3));

// Trains on the points that are not held out and reports everything the lab shows. `pts` are
// { x, y, label, held }. supportPoints are indices into pts. Margin is null for the RBF kernel.
export function fitLab(pts, { kernel, C, gamma }) {
  const trainIdx = [], heldIdx = [];
  pts.forEach((p, i) => (p.held ? heldIdx : trainIdx).push(i));
  const X = trainIdx.map(i => [pts[i].x, pts[i].y]), y = trainIdx.map(i => pts[i].label);
  const model = trainSvm(X, y, { kernel, C, gamma });
  const heldX = heldIdx.map(i => [pts[i].x, pts[i].y]), heldY = heldIdx.map(i => pts[i].label);
  return {
    model,
    trainIdx, heldIdx,
    supportPoints: model.supportIndices.map(k => trainIdx[k]),
    nSupport: model.supportIndices.length,
    nTrain: trainIdx.length,
    nHeld: heldIdx.length,
    margin: model.margin(),
    trainAcc: svmAccuracy(model, X, y),
    heldAcc: heldIdx.length ? svmAccuracy(model, heldX, heldY) : null,
  };
}

// Marching squares on a decisionGrid result: the line segments [x1, y1, x2, y2] where the decision
// function crosses `level` (0 for the boundary, +1 and -1 for the margin lines), in data coordinates.
export function contourSegments(grid, level) {
  const { xs, ys, values } = grid;
  const segments = [];
  for (let j = 0; j + 1 < ys.length; j++) {
    for (let i = 0; i + 1 < xs.length; i++) {
      const x0 = xs[i], x1 = xs[i + 1], y0 = ys[j], y1 = ys[j + 1];
      const v00 = values[j][i] - level, v10 = values[j][i + 1] - level, v11 = values[j + 1][i + 1] - level, v01 = values[j + 1][i] - level;
      const cut = (a, b) => a / (a - b);
      const edge = {
        bottom: (v00 >= 0) !== (v10 >= 0) ? [x0 + (x1 - x0) * cut(v00, v10), y0] : null,
        right: (v10 >= 0) !== (v11 >= 0) ? [x1, y0 + (y1 - y0) * cut(v10, v11)] : null,
        top: (v01 >= 0) !== (v11 >= 0) ? [x0 + (x1 - x0) * cut(v01, v11), y1] : null,
        left: (v00 >= 0) !== (v01 >= 0) ? [x0, y0 + (y1 - y0) * cut(v00, v01)] : null,
      };
      const hit = Object.entries(edge).filter(([, p]) => p);
      if (hit.length === 2) segments.push([...hit[0][1], ...hit[1][1]]);
      else if (hit.length === 4) {
        // A saddle: the centre decides which two corners are cut off.
        const centre = (v00 + v10 + v11 + v01) / 4 >= 0;
        const corners = [[v00, 'bottom', 'left'], [v10, 'bottom', 'right'], [v11, 'right', 'top'], [v01, 'top', 'left']];
        for (const [v, a, b] of corners) if ((v >= 0) !== centre) segments.push([...edge[a], ...edge[b]]);
      }
    }
  }
  return segments;
}

// The point to select when an arrow key is pressed: the nearest one in that direction (dir is a unit
// step such as [1, 0] for right). A point off the line of travel counts double, so Right prefers the
// point straight to the right over one diagonal and close. Returns -1 when nothing lies that way.
// With nothing selected yet (from < 0) it starts at the point nearest the middle of the plot.
export function neighbourInDirection(pts, from, dir) {
  if (!pts.length) return -1;
  if (from < 0) {
    let best = 0;
    pts.forEach((p, i) => { if (Math.hypot(p.x, p.y) < Math.hypot(pts[best].x, pts[best].y)) best = i; });
    return best;
  }
  const o = pts[from];
  let best = -1, bestScore = Infinity;
  pts.forEach((p, i) => {
    if (i === from) return;
    const dx = p.x - o.x, dy = p.y - o.y;
    const along = dx * dir[0] + dy * dir[1], across = Math.abs(dx * dir[1] - dy * dir[0]);
    if (along <= 1e-9) return;
    const score = along + 2 * across;
    if (score < bestScore) { best = i; bestScore = score; }
  });
  return best;
}

// What happened to the margin and the support-vector count between two fits, as a key for the
// Quick Quiz: narrow|wide margin, fewer|more support vectors, joined with a dash. A tie in the count
// counts as "fewer" (it did not grow). 'same' means the count is equal and the margin moved under 5%.
export function classifyChange(before, after) {
  const rel = Math.abs(after.margin - before.margin) / before.margin;
  if (after.nSupport === before.nSupport && rel < 0.05) return 'same';
  return `${after.margin <= before.margin ? 'narrow' : 'wide'}-${after.nSupport <= before.nSupport ? 'fewer' : 'more'}`;
}
