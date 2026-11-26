import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HALF, SHAPES, generatedPoints, penguinPairs, samplePairs, heldOutFlags, standardisePairs, fromLog, fitLab,
  contourSegments, neighbourInDirection, classifyChange,
} from './svmlab.js';
import { parseCsv } from './tabular.js';
import { decisionGrid } from './svm.js';

test('every shape is reproducible, balanced, inside the plot square, and differs by seed', () => {
  for (const shape of SHAPES) {
    const a = generatedPoints(shape, 3), b = generatedPoints(shape, 3), c = generatedPoints(shape, 4);
    assert.deepEqual(a, b, shape);
    assert.notDeepEqual(a, c, shape);
    assert.equal(a.length, 80);
    assert.equal(a.filter(p => p.label === -1).length, 40);
    for (const p of a) assert.ok(Math.abs(p.x) <= HALF && Math.abs(p.y) <= HALF);
  }
});

test('rings put class A inside class B: the mean radius of A is clearly smaller', () => {
  const pts = generatedPoints('rings', 1);
  const radius = label => { const r = pts.filter(p => p.label === label).map(p => Math.hypot(p.x, p.y)); return r.reduce((s, v) => s + v, 0) / r.length; };
  assert.ok(radius(-1) < 1 && radius(1) > 1.8);
});

test('penguinPairs keeps only Adelie and Chinstrap, drops rows with NA and counts them', () => {
  const table = parseCsv([
    'species,island,bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,sex,year',
    'Adelie,Torgersen,39.1,18.7,181,3750,male,2007',
    'Adelie,Torgersen,NA,NA,NA,NA,NA,2007',
    'Chinstrap,Dream,46.5,17.9,192,3500,female,2007',
    'Gentoo,Biscoe,46.1,13.2,211,4500,female,2007',
  ].join('\n'));
  const { pairs, total, dropped } = penguinPairs(table);
  assert.equal(total, 3);
  assert.equal(dropped, 1);
  assert.deepEqual(pairs, [{ a: 39.1, b: 18.7, label: -1 }, { a: 46.5, b: 17.9, label: 1 }]);
});

test('samplePairs is balanced and reproducible; heldOutFlags holds out about 30% of each class', () => {
  const pairs = [];
  for (let i = 0; i < 100; i++) pairs.push({ a: i, b: i, label: -1 });
  for (let i = 0; i < 60; i++) pairs.push({ a: i, b: i, label: 1 });
  const s = samplePairs(pairs, 40, 5);
  assert.equal(s.filter(p => p.label === -1).length, 40);
  assert.equal(s.filter(p => p.label === 1).length, 40);
  assert.deepEqual(s, samplePairs(pairs, 40, 5));
  const held = heldOutFlags(s.map(p => p.label), 5);
  assert.equal(held.filter(Boolean).length, 24);
  for (const label of [-1, 1]) assert.equal(held.filter((h, i) => h && s[i].label === label).length, 12);
});

test('standardisePairs uses the training rows only: their mean is 0 and spread 1, held-out rows do not shift it', () => {
  const rows = [{ a: 10, b: 0, label: -1 }, { a: 20, b: 2, label: 1 }, { a: 30, b: 4, label: -1 }, { a: 1000, b: 400, label: 1 }];
  const { points, scaler } = standardisePairs(rows, [false, false, false, true]);
  // Training a values 10, 20, 30: mean 20, population sd sqrt(200/3).
  assert.equal(scaler[0].mean, 20);
  assert.ok(Math.abs(scaler[0].sd - Math.sqrt(200 / 3)) < 1e-12);
  assert.ok(Math.abs(points[0].x + 10 / Math.sqrt(200 / 3)) < 1e-12);
  assert.equal(points[3].x, HALF, 'a far held-out value is clamped to the plot square');
});

test('fromLog gives three significant figures', () => {
  assert.equal(fromLog(0), 1);
  assert.equal(fromLog(2), 100);
  assert.equal(fromLog(-0.3), 0.501);
  assert.equal(fromLog(0.1), 1.26);
});

test('a hard margin between (-1, 0) and (1, 0): both are support vectors and the margin width is 2', () => {
  const pts = [
    { x: -1, y: 0, label: -1, held: false }, { x: 1, y: 0, label: 1, held: false },
    { x: -2, y: 1, label: -1, held: false }, { x: 2, y: -1, label: 1, held: false },
    { x: -1.5, y: 0.5, label: -1, held: true },
  ];
  const fit = fitLab(pts, { kernel: 'linear', C: 1000, gamma: 1 });
  assert.equal(fit.nTrain, 4);
  assert.equal(fit.nHeld, 1);
  assert.deepEqual(fit.supportPoints, [0, 1]);
  assert.ok(Math.abs(fit.margin - 2) < 0.02, `margin ${fit.margin}`);
  assert.equal(fit.trainAcc, 1);
  assert.equal(fit.heldAcc, 1);
});

test('contourSegments finds the straight line x = 0.5 of the function f(x, y) = x', () => {
  const grid = { xs: [-1, 0, 1], ys: [-1, 0, 1], values: [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]] };
  const segs = contourSegments(grid, 0.5);
  assert.equal(segs.length, 2);
  for (const s of segs) { assert.equal(s[0], 0.5); assert.equal(s[2], 0.5); }
  assert.equal(contourSegments(grid, 5).length, 0);
});

test('contourSegments handles a saddle cell with two segments', () => {
  const grid = { xs: [0, 1], ys: [0, 1], values: [[1, -1], [-1, 1]] };
  assert.equal(contourSegments(grid, 0).length, 2);
});

test('the boundary of a trained model is found where its decision function is 0', () => {
  const pts = [
    { x: -1, y: 0, label: -1, held: false }, { x: 1, y: 0, label: 1, held: false },
    { x: -1, y: 1, label: -1, held: false }, { x: 1, y: -1, label: 1, held: false },
  ];
  const fit = fitLab(pts, { kernel: 'linear', C: 100, gamma: 1 });
  const grid = decisionGrid(fit.model, { xMin: -3, xMax: 3, yMin: -3, yMax: 3 }, 25);
  for (const s of contourSegments(grid, 0)) assert.ok(Math.abs(s[0]) < 0.05 && Math.abs(s[2]) < 0.05);
});

test('neighbourInDirection picks the nearest point that way, and starts near the middle', () => {
  const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0.3, y: 2 }, { x: -1, y: 0 }];
  assert.equal(neighbourInDirection(pts, 0, [1, 0]), 1);
  assert.equal(neighbourInDirection(pts, 1, [1, 0]), 2);
  assert.equal(neighbourInDirection(pts, 0, [0, 1]), 3);
  assert.equal(neighbourInDirection(pts, 0, [-1, 0]), 4);
  assert.equal(neighbourInDirection(pts, 4, [-1, 0]), -1);
  assert.equal(neighbourInDirection(pts, -1, [1, 0]), 0);
});

test('classifyChange names the outcome of a larger C', () => {
  assert.equal(classifyChange({ margin: 2, nSupport: 30 }, { margin: 1, nSupport: 20 }), 'narrow-fewer');
  assert.equal(classifyChange({ margin: 2, nSupport: 10 }, { margin: 3, nSupport: 12 }), 'wide-more');
  assert.equal(classifyChange({ margin: 2, nSupport: 10 }, { margin: 2.05, nSupport: 10 }), 'same');
  assert.equal(classifyChange({ margin: 2, nSupport: 10 }, { margin: 1, nSupport: 10 }), 'narrow-fewer');
});

// The lab's fits are the true optimum of the SVM problem in every corner a slider can reach. The check
// uses only the returned model: for every training point y*f >= 1 at alpha = 0, <= 1 at alpha = C and
// = 1 in between (within 5e-3), and sum alpha*y = 0.
function labPoints(shape, seed = 7) {
  const raw = generatedPoints(shape, seed);
  const held = heldOutFlags(raw.map(p => p.label), seed);
  return raw.map((p, i) => ({ ...p, held: held[i] }));
}
function violation(fit, pts) {
  const m = fit.model, y = fit.trainIdx.map(i => pts[i].label);
  let worst = Math.abs(m.alphas.reduce((s, a, i) => s + a * y[i], 0));
  fit.trainIdx.forEach((pi, i) => {
    const a = m.alphas[i], yf = y[i] * m.decision([pts[pi].x, pts[pi].y]);
    if (a <= 1e-9) worst = Math.max(worst, 1 - yf);
    else if (a >= m.C - 1e-9) worst = Math.max(worst, yf - 1);
    else worst = Math.max(worst, Math.abs(yf - 1));
  });
  return worst;
}

test('fitLab is optimal across shape x kernel x C x gamma (the whole slider range)', () => {
  for (const shape of SHAPES) {
    const pts = labPoints(shape);
    for (const kernel of ['linear', 'rbf']) {
      for (const C of [0.01, 0.1, 1, 10, 100]) {
        for (const gamma of kernel === 'linear' ? [1] : [0.01, 0.1, 1, 10]) {
          const fit = fitLab(pts, { kernel, C, gamma });
          const v = violation(fit, pts);
          assert.ok(v < 5e-3, `${shape} ${kernel} C=${C} gamma=${gamma}: KKT violation ${v}`);
        }
      }
    }
  }
});

test('small C with a wide RBF no longer paints the plane one colour (rings, blobs, moons)', () => {
  for (const shape of ['rings', 'blobs', 'overlap', 'moons']) {
    const pts = labPoints(shape);
    for (const C of [0.01, 0.1]) {
      for (const gamma of [1, 10]) {
        const fit = fitLab(pts, { kernel: 'rbf', C, gamma });
        const grid = decisionGrid(fit.model, { xMin: -HALF, xMax: HALF, yMin: -HALF, yMax: HALF }, 30);
        const classes = new Set(grid.labels.flat());
        assert.equal(classes.size, 2, `${shape} C=${C} gamma=${gamma}: the plane is one colour`);
        assert.ok(fit.trainAcc > 0.85, `${shape} C=${C} gamma=${gamma}: training accuracy ${fit.trainAcc}`);
      }
    }
  }
  // Reference values from an independent libsvm-style solver: rings are separated perfectly.
  for (const [C, gamma] of [[0.01, 1], [0.1, 1], [0.1, 10]]) assert.equal(fitLab(labPoints('rings'), { kernel: 'rbf', C, gamma }).trainAcc, 1);
});

test('the default view and the hard-margin limit match an independent reference solver', () => {
  const blobs = labPoints('blobs');
  const soft = fitLab(blobs, { kernel: 'linear', C: fromLog(-1), gamma: 1 });
  assert.equal(soft.nSupport, 13);
  assert.ok(Math.abs(soft.margin - 2.10) < 0.01, `margin ${soft.margin}`);
  for (const C of [10, 100]) assert.equal(fitLab(blobs, { kernel: 'linear', C, gamma: 1 }).nSupport, 3);
  const moons = fitLab(labPoints('moons'), { kernel: 'linear', C: 100, gamma: 1 });
  assert.ok(Math.abs(moons.margin - 1.27) < 0.02, `margin ${moons.margin}`);
  assert.equal(moons.nSupport, 29);
  const overlap = fitLab(labPoints('overlap'), { kernel: 'linear', C: 10, gamma: 1 });
  assert.ok(Math.abs(overlap.margin - 0.83) < 0.01, `margin ${overlap.margin}`);
});

test('the slowest corner of the sliders (linear, C = 100) still converges quickly', () => {
  const t0 = Date.now();
  for (const shape of SHAPES) fitLab(labPoints(shape), { kernel: 'linear', C: 100, gamma: 1 });
  assert.ok(Date.now() - t0 < 1000, `${Date.now() - t0} ms`);
});
