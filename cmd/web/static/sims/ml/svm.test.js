import test from 'node:test';
import assert from 'node:assert/strict';
import { trainSvm, decisionGrid, svmAccuracy, makeRings } from './svm.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

// Two negatives stacked at x = 0, two positives at x = 2 and x = 4. By hand: the widest street
// between the classes is the strip 0 < x < 2, so the boundary is x = 1 (w = (1, 0), b = -1) and
// the margin lines are x = 0 and x = 2, a street 2 wide. The point (4, 2) is far from the street,
// so it is not a support vector. The dual solution is a_(0,0) = a_(2,0) = 1/2: then
// w = sum a_i y_i x_i = 0.5 * (2, 0) = (1, 0), and the constraint sum a_i y_i = 0 holds.
// (0, 2) also sits on the margin line, but it adds nothing: the solution does not need it.
const HAND_X = [[0, 0], [0, 2], [2, 0], [4, 2]];
const HAND_Y = [-1, -1, 1, 1];

test('linear SVM: 4-point separable set gives the exact maximum-margin line', () => {
  const m = trainSvm(HAND_X, HAND_Y, { kernel: 'linear', C: 1000 });
  close(m.w[0], 1, 1e-3);
  close(m.w[1], 0, 1e-3);
  close(m.b, -1, 1e-3);
  close(m.margin(), 2, 1e-3);
  assert.deepEqual(m.supportIndices, [0, 2]);
  close(m.alphas[0], 0.5, 1e-3);
  close(m.alphas[2], 0.5, 1e-3);
  close(m.alphas[1], 0, 1e-8);
  close(m.alphas[3], 0, 1e-8);
  // Dual feasibility: the multipliers balance across the classes.
  close(m.alphas.reduce((s, a, i) => s + a * HAND_Y[i], 0), 0, 1e-9);
  // Support vectors sit exactly on the margin lines (decision -1 and +1); (4, 2) is deeper inside.
  close(m.decision([0, 0]), -1, 1e-3);
  close(m.decision([2, 0]), 1, 1e-3);
  close(m.decision([0, 2]), -1, 1e-3);
  close(m.decision([4, 2]), 3, 1e-3);
  close(m.decision([1, 5]), 0, 1e-3); // on the boundary x = 1
  assert.deepEqual(HAND_X.map(x => m.predict(x)), HAND_Y);
  // w . x + b is the same number as decision(x).
  close(m.w[0] * 3 + m.w[1] * 7 + m.b, m.decision([3, 7]), 1e-9);
});

test('linear SVM: a hard margin (C = Infinity) gives the same line', () => {
  const m = trainSvm(HAND_X, HAND_Y, { C: Infinity });
  close(m.margin(), 2, 1e-3);
  assert.deepEqual(m.supportIndices, [0, 2]);
});

test('linear SVM: support vectors are exposed as rows of X', () => {
  const m = trainSvm(HAND_X, HAND_Y, { C: 1000 });
  assert.deepEqual(m.supportVectors, [[0, 0], [2, 0]]);
});

// Left cluster (-1), right cluster (+1), plus one -1 point that sits near the other class.
const OUT_X = [[-3, 0], [-2, 1], [-2.5, -1], [-3, 2], [3, 0], [2, 1], [2.5, -1], [3, -2], [1, 0.2]];
const OUT_Y = [-1, -1, -1, -1, 1, 1, 1, 1, -1];

test('C: a very small C widens the margin, a very large C narrows it (one outlier)', () => {
  const widths = [0.01, 0.1, 1, 10, 1000].map(C => trainSvm(OUT_X, OUT_Y, { C }).margin());
  for (let i = 1; i < widths.length; i++) assert.ok(widths[i] <= widths[i - 1] + 1e-9, widths.join());
  const soft = trainSvm(OUT_X, OUT_Y, { C: 0.01 });
  const hard = trainSvm(OUT_X, OUT_Y, { C: 1000 });
  assert.ok(soft.margin() > 5 * hard.margin(), `${soft.margin()} vs ${hard.margin()}`);
  // The large C bends to fit the outlier: every training point is right, with a narrow street.
  assert.equal(svmAccuracy(hard, OUT_X, OUT_Y), 1);
  assert.ok(hard.margin() < 1.5);
  // The small C ignores some points to keep the street wide, and nearly every point becomes a
  // support vector (a point inside the street always is).
  assert.ok(svmAccuracy(soft, OUT_X, OUT_Y) < 1);
  assert.ok(soft.supportIndices.length > hard.supportIndices.length);
  // Every multiplier respects the box 0 <= alpha <= C.
  for (const a of soft.alphas) assert.ok(a >= 0 && a <= 0.01 + 1e-12);
  for (const a of hard.alphas) assert.ok(a >= 0 && a <= 1000 + 1e-9);
});

test('rbf SVM separates two concentric rings that a linear SVM cannot', () => {
  const train = makeRings(40, { seed: 1 });
  const test_ = makeRings(100, { seed: 2 });
  const linear = trainSvm(train.X, train.y, { kernel: 'linear', C: 1 });
  const rbf = trainSvm(train.X, train.y, { kernel: 'rbf', gamma: 0.1, C: 10 });
  // A straight line cannot beat a guess by much on rings (equal classes, so chance is 0.5).
  assert.ok(svmAccuracy(linear, train.X, train.y) < 0.8);
  assert.ok(svmAccuracy(linear, test_.X, test_.y) < 0.75);
  assert.equal(svmAccuracy(rbf, train.X, train.y), 1);
  assert.ok(svmAccuracy(rbf, test_.X, test_.y) >= 0.97, String(svmAccuracy(rbf, test_.X, test_.y)));
  // The rbf boundary is a closed curve: inside the inner ring is -1, far out is +1.
  assert.equal(rbf.predict([0, 0]), -1);
  assert.equal(rbf.predict([5, 5]), 1);
  assert.equal(rbf.w, null);
  assert.equal(rbf.margin(), null);
});

test('gamma: too small underfits, moderate fits, huge memorises the training points', () => {
  const train = makeRings(40, { seed: 1 });
  const noisy = makeRings(100, { seed: 2, noise: 0.5 }); // rings that overlap a little
  const fit = gamma => {
    const m = trainSvm(train.X, train.y, { kernel: 'rbf', gamma, C: 10 });
    return {
      train: svmAccuracy(m, train.X, train.y),
      held: svmAccuracy(m, noisy.X, noisy.y),
      support: m.supportIndices.length,
    };
  };
  const tiny = fit(0.001), good = fit(0.1), huge = fit(1000);
  // Tiny gamma: the bumps are so wide the boundary is nearly flat, so it cannot draw a ring.
  assert.ok(tiny.train <= 0.75 && tiny.held <= 0.7, JSON.stringify(tiny));
  assert.ok(tiny.train < good.train - 0.2 && tiny.held < good.held - 0.2, JSON.stringify([tiny, good]));
  // Moderate gamma: right on the rings it learned and on fresh overlapping ones.
  assert.equal(good.train, 1);
  assert.ok(good.held > 0.9, JSON.stringify(good));
  // Huge gamma: every training point is its own island. Training is still perfect, but fresh
  // points land far from every island and the model falls back to the bias: near chance.
  assert.equal(huge.train, 1);
  assert.ok(huge.held < 0.6, JSON.stringify(huge));
  assert.ok(huge.held < good.held - 0.3);
  // A bumpier boundary needs far more support vectors than a smooth one.
  assert.ok(huge.support > 2 * good.support, `${huge.support} vs ${good.support}`);
});

test('deterministic: the same data and options give the same model (there is no random choice)', () => {
  const { X, y } = makeRings(30, { seed: 5 });
  const a = trainSvm(X, y, { kernel: 'rbf', gamma: 0.2, C: 2 });
  const b = trainSvm(X, y, { kernel: 'rbf', gamma: 0.2, C: 2 });
  assert.deepEqual(a.alphas, b.alphas);
  assert.equal(a.b, b.b);
  // A leftover seed option is ignored, not an error.
  assert.deepEqual(trainSvm(X, y, { kernel: 'rbf', gamma: 0.2, C: 2, seed: 8 }).alphas, a.alphas);
});

// The optimality certificate of the dual, computed from the returned model alone (not from the trainer's
// own bookkeeping): sum alpha*y = 0, 0 <= alpha <= C, and for every point y*f(x) >= 1 when alpha = 0,
// y*f(x) <= 1 when alpha = C, and y*f(x) = 1 when 0 < alpha < C, each within `slack`. The problem is
// convex, so a model that passes IS the optimum, whatever the data, kernel, C or gamma.
function kktViolation(m, X, y) {
  let worst = Math.abs(m.alphas.reduce((s, a, i) => s + a * y[i], 0));
  X.forEach((x, i) => {
    const a = m.alphas[i], yf = y[i] * m.decision(x);
    if (a < 0 || a > m.C) worst = Math.max(worst, a < 0 ? -a : a - m.C);
    if (a <= 1e-9) worst = Math.max(worst, 1 - yf);
    else if (a >= m.C - 1e-9) worst = Math.max(worst, yf - 1);
    else worst = Math.max(worst, Math.abs(yf - 1));
  });
  return worst;
}

test('the result is the optimum: the KKT conditions hold across data, kernel, C and gamma', () => {
  const sets = {
    rings: makeRings(30, { seed: 3, noise: 0.3 }),
    outlier: { X: OUT_X, y: OUT_Y },
    hand: { X: HAND_X, y: HAND_Y },
  };
  for (const [name, { X, y }] of Object.entries(sets)) {
    for (const C of [0.01, 0.1, 1, 10, 100]) {
      for (const [kernel, gamma] of [['linear', 1], ['rbf', 0.01], ['rbf', 1], ['rbf', 10]]) {
        const m = trainSvm(X, y, { kernel, C, gamma });
        const v = kktViolation(m, X, y);
        assert.ok(v < 5e-3, `${name} ${kernel} C=${C} gamma=${gamma}: violation ${v}`);
      }
    }
  }
});

test('every multiplier at C (small C, wide RBF): the bias is the middle of its feasible range, so the plane is not one colour', () => {
  // This used to return an edge of the range and classify everything as one class (50%).
  const { X, y } = makeRings(30, { innerRadius: 0.8, outerRadius: 2.1, noise: 0.15, seed: 7 });
  for (const C of [0.01, 0.1]) {
    for (const gamma of [1, 10]) {
      const m = trainSvm(X, y, { kernel: 'rbf', C, gamma });
      assert.equal(m.alphas.filter(a => a === C).length, m.supportIndices.length, 'all support vectors are at C');
      assert.equal(svmAccuracy(m, X, y), 1, `C=${C} gamma=${gamma}`);
      assert.ok(kktViolation(m, X, y) < 5e-3);
    }
  }
  // Two well-separated blobs, tiny C, large gamma: the same regime on data a line separates.
  const blobs = { X: OUT_X.filter((_, i) => i !== 8), y: OUT_Y.filter((_, i) => i !== 8) };
  const m = trainSvm(blobs.X, blobs.y, { kernel: 'rbf', C: 0.1, gamma: 10 });
  assert.equal(svmAccuracy(m, blobs.X, blobs.y), 1);
});

test('a support vector is not rounding dust: every circled point is a real multiplier', () => {
  const { X, y } = makeRings(30, { seed: 4, noise: 0.4 });
  for (const C of [0.1, 10, 100]) {
    const m = trainSvm(X, y, { kernel: 'linear', C });
    for (const i of m.supportIndices) assert.ok(m.alphas[i] > 1e-6 * Math.min(C, 1) * 0.99);
    // Points off the margin (strictly outside it) have alpha exactly 0.
    X.forEach((x, i) => { if (y[i] * m.decision(x) > 1 + 5e-3) assert.equal(m.alphas[i], 0); });
  }
});

test('n-D features: three features, label depends on the sum of the first two', () => {
  const X = [], y = [];
  for (let i = 0; i < 40; i++) {
    const p = (i % 8) - 3.5, q = Math.floor(i / 8) - 2, r = Math.sin(i) * 3;
    if (Math.abs(p + q) < 1) continue; // keep a gap so the classes are separable
    X.push([p, q, r]);
    y.push(p + q > 0 ? 1 : -1);
  }
  const m = trainSvm(X, y, { kernel: 'linear', C: 100 });
  assert.equal(m.w.length, 3);
  assert.equal(svmAccuracy(m, X, y), 1);
  assert.ok(Math.abs(m.w[2]) < Math.abs(m.w[0]) / 3, 'the irrelevant feature gets a small weight');
});

test('decisionGrid: a regular grid whose signs match predict', () => {
  const m = trainSvm(HAND_X, HAND_Y, { C: 1000 });
  const g = decisionGrid(m, { xMin: -1, xMax: 5, yMin: -1, yMax: 3 }, { nx: 7, ny: 5 });
  assert.equal(g.nx, 7);
  assert.equal(g.ny, 5);
  assert.deepEqual(g.xs, [-1, 0, 1, 2, 3, 4, 5]);
  assert.deepEqual(g.ys, [-1, 0, 1, 2, 3]);
  assert.equal(g.values.length, 5);
  assert.equal(g.values[0].length, 7);
  for (let j = 0; j < g.ny; j++) {
    for (let i = 0; i < g.nx; i++) {
      close(g.values[j][i], m.decision([g.xs[i], g.ys[j]]), 1e-12);
      assert.equal(g.labels[j][i], m.predict([g.xs[i], g.ys[j]]));
    }
  }
  // x = 1 is the boundary, so x < 1 is -1 and x > 1 is +1 on every row.
  assert.ok(g.labels.every(row => row[0] === -1 && row[1] === -1 && row[5] === 1 && row[6] === 1));
  // A single number means the same step count both ways.
  const sq = decisionGrid(m, { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, 4);
  assert.equal(sq.nx, 4);
  assert.equal(sq.ny, 4);
  assert.throws(() => decisionGrid(m, { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, 1));
});

test('makeRings: n per class, correct radii, reproducible', () => {
  const { X, y } = makeRings(50, { innerRadius: 1, outerRadius: 3, noise: 0, seed: 3 });
  assert.equal(X.length, 100);
  assert.equal(y.filter(v => v === -1).length, 50);
  X.forEach((p, i) => close(Math.hypot(p[0], p[1]), y[i] === -1 ? 1 : 3, 1e-9));
  assert.deepEqual(makeRings(10, { seed: 4 }), makeRings(10, { seed: 4 }));
});

test('trainSvm rejects bad input', () => {
  assert.throws(() => trainSvm([[0, 0]], [1]), /at least two rows/);
  assert.throws(() => trainSvm(HAND_X, [-1, -1, 1]), /one label per row/);
  assert.throws(() => trainSvm(HAND_X, [0, 0, 1, 1]), /-1 or \+1/);
  assert.throws(() => trainSvm(HAND_X, [1, 1, 1, 1]), /both classes/);
  assert.throws(() => trainSvm([[0, 0], [1]], [-1, 1]), /equal length/);
  assert.throws(() => trainSvm(HAND_X, HAND_Y, { kernel: 'poly' }), /kernel/);
  assert.throws(() => trainSvm(HAND_X, HAND_Y, { C: 0 }), /C must/);
  assert.throws(() => trainSvm(HAND_X, HAND_Y, { kernel: 'rbf', gamma: -1 }), /gamma/);
  assert.throws(() => trainSvm([[0, NaN], [1, 1]], [-1, 1]), /finite/);
});
