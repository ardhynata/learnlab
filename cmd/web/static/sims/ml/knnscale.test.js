import test from 'node:test';
import assert from 'node:assert/strict';
import { scaleFor, nearestScaled, classifyScaled, testAccuracy, labelGrid, accuracyVerdict, generatedTest, penguinSplit, TEST_COUNT } from './knnscale.js';
import { makeDataset, SHARED_SEED } from '../datasets.js';
import { classify } from './knn.js';

const P = (x, y, label) => ({ x, y, label });

test('scaleFor stretches exactly one feature and ignores nonsense factors', () => {
  assert.deepEqual(scaleFor('x', 5), { x: 5, y: 1 });
  assert.deepEqual(scaleFor('y', 3), { x: 1, y: 3 });
  assert.deepEqual(scaleFor('x', 0), { x: 1, y: 1 });
  assert.deepEqual(scaleFor('x', NaN), { x: 1, y: 1 });
});

test('stretching a feature changes which neighbor is nearest (hand-computed)', () => {
  // Query (0,0). A sits 1 away across x, B sits 1.5 away across y.
  const pts = [P(1, 0, 'A'), P(0, 1.5, 'B')];
  const q = { x: 0, y: 0 };
  assert.equal(nearestScaled(pts, q, 1)[0].i, 0);                      // 1 < 1.5
  assert.equal(nearestScaled(pts, q, 1, 'euclidean', scaleFor('x', 2))[0].i, 1);   // 2 > 1.5: B is now nearer
  // Manhattan: stretched x makes A cost 3, B stays 1.5.
  const m = nearestScaled(pts, q, 2, 'manhattan', scaleFor('x', 3));
  assert.deepEqual(m.map(n => n.i), [1, 0]);
  assert.equal(m[1].d, 3);
});

test('unscaled result matches the k-NN in ml/knn.js, including ties by lower index', () => {
  const pts = makeDataset('clusters', SHARED_SEED, 48);
  for (const k of [1, 3, 7]) for (const metric of ['euclidean', 'manhattan']) {
    for (const q of [{ x: 5, y: 5 }, { x: 2, y: 8 }, { x: 9, y: 1 }]) {
      const a = classifyScaled(pts, q, k, metric);
      const b = classify(pts, q, k, metric);
      assert.deepEqual(a.picked.map(n => n.i), b.picked.map(n => n.i));
      assert.equal(a.label, b.label);
      assert.equal(a.tied, b.tied);
    }
  }
});

test('a vote tie goes to the closest neighbor; k larger than the data uses every point', () => {
  const pts = [P(1, 0, 'B'), P(2, 0, 'A')];
  const r = classifyScaled(pts, { x: 0, y: 0 }, 2);
  assert.equal(r.tied, true);
  assert.equal(r.label, 'B');
  assert.equal(classifyScaled(pts, { x: 0, y: 0 }, 99).picked.length, 2);
  assert.deepEqual(nearestScaled([], { x: 0, y: 0 }, 3), []);
});

test('testAccuracy counts hand-checked right and wrong test points', () => {
  const train = [P(0, 0, 'A'), P(1, 0, 'A'), P(5, 0, 'B'), P(6, 0, 'B')];
  const tests = [P(0.5, 0, 'A'), P(5.5, 0, 'B'), P(4, 0, 'A'), P(2, 0, 'B')];
  // k=1: 0.5 -> A ok, 5.5 -> B ok, 4 -> nearest is 5 (B) wrong, 2 -> nearest is 1 (A) wrong.
  const r = testAccuracy(train, tests, 1);
  assert.deepEqual([r.correct, r.total, r.wrong], [2, 4, [2, 3]]);
  assert.equal(r.fraction, 0.5);
  assert.equal(testAccuracy(train, [], 1).fraction, 0);
});

test('stretching a feature can lower accuracy: a stretched noise feature drowns the signal', () => {
  // Class is set by y (A low, B high); x is noise. Stretch x and the neighbors are chosen by x alone.
  const train = [P(0, 0, 'A'), P(5, 0.2, 'A'), P(0.1, 4, 'B'), P(5.1, 4.2, 'B')];
  const tests = [P(0.2, 0.1, 'A'), P(5, 0.1, 'A'), P(0.2, 4, 'B'), P(5, 4.1, 'B')];
  assert.equal(testAccuracy(train, tests, 1).correct, 4);
  // Query (2.4, 0) is class A. Unscaled its nearest point is A (2.4 away). At x * 10 the A point is 24 away,
  // but the B point at (0.1, 4) is sqrt(23^2 + 4^2) = 23.3 away: the neighbor flips and the answer is wrong.
  const q = [P(2.4, 0, 'A')];
  assert.equal(testAccuracy(train, q, 1).correct, 1);
  assert.equal(testAccuracy(train, q, 1, 'euclidean', scaleFor('x', 10)).correct, 0);
});

test('labelGrid agrees with classifying a cell center directly', () => {
  const train = makeDataset('clusters', SHARED_SEED, 30);
  const view = { xLo: 0, xHi: 10, yLo: 0, yHi: 10 };
  const n = 16, scale = scaleFor('x', 4);
  const grid = labelGrid(train, 3, 'euclidean', scale, view, n);
  assert.equal(grid.length, n * n);
  for (const [i, j] of [[0, 0], [3, 12], [8, 8], [15, 15], [10, 2]]) {
    const q = { x: (i + .5) * 10 / n, y: (j + .5) * 10 / n };
    assert.equal(grid[i * n + j], classifyScaled(train, q, 3, 'euclidean', scale).label);
  }
  // Data units: the same grid over a view in other units samples the same cells.
  const wide = { xLo: 100, xHi: 200, yLo: 2, yHi: 7 };
  const shifted = train.map(p => ({ ...p, x: 100 + p.x * 10, y: 2 + p.y / 2 }));
  assert.deepEqual(labelGrid(shifted, 3, 'euclidean', { x: 1, y: 1 }, wide, 8).length, 64);
});

test('accuracyVerdict: same within 2% of the test set (at least one point)', () => {
  const r = (correct, total = 40) => ({ correct, total });
  assert.equal(accuracyVerdict(r(30), r(31)), 'same');
  assert.equal(accuracyVerdict(r(30), r(29)), 'same');
  assert.equal(accuracyVerdict(r(30), r(32)), 'up');
  assert.equal(accuracyVerdict(r(30), r(27)), 'down');
  assert.equal(accuracyVerdict(r(60, 100), r(63, 100)), 'up');   // slack is 2 of 100
  assert.equal(accuracyVerdict(r(60, 100), r(62, 100)), 'same');
});

test('generated test points: fixed, separate from the shared training points, in range', () => {
  for (const name of ['clusters', 'rings', 'checker']) {
    const a = generatedTest(name), b = generatedTest(name);
    assert.equal(a.length, TEST_COUNT);
    assert.deepEqual(a, b);
    assert.equal(a.filter(p => p.label === 'A').length, TEST_COUNT / 2);
    assert.ok(a.every(p => p.x >= 0 && p.x <= 10 && p.y >= 0 && p.y <= 10));
    const train = makeDataset(name, SHARED_SEED, 400);
    // No test point coincides with a training point (the rings used to repeat angles by index).
    assert.ok(a.every(t => !train.some(p => p.x === t.x && p.y === t.y)));
  }
  assert.notDeepEqual(generatedTest('clusters', 40, 1), generatedTest('clusters', 40, 2));
});

test('penguinSplit drops NA rows and says how many, holds out a stratified test set', () => {
  const rows = [];
  const species = ['Adelie', 'Chinstrap', 'Gentoo'];
  for (let i = 0; i < 60; i++) rows.push({ species: species[i % 3], flipper_length_mm: 180 + i, body_mass_g: 3000 + 10 * i });
  rows.push({ species: 'Adelie', flipper_length_mm: null, body_mass_g: null });
  rows.push({ species: 'Gentoo', flipper_length_mm: 210, body_mass_g: null });
  const s = penguinSplit({ rows }, 5);
  assert.equal(s.total, 62);
  assert.equal(s.used, 60);
  assert.equal(s.dropped, 2);
  assert.deepEqual(s.classes, species);
  assert.equal(s.train.length + s.test.length, 60);
  assert.equal(s.test.length, 12);                                   // 20% of each class of 20 -> 4 each
  assert.deepEqual(species.map(c => s.test.filter(p => p.label === c).length), [4, 4, 4]);
  assert.ok(s.train.every(p => p.y >= 3000 && p.y < 3600));          // mass stays in grams: raw units are the point of the lab
  // The test set stays put when only the training draw changes.
  const t = penguinSplit({ rows }, 99);
  assert.deepEqual(t.test, s.test);
  assert.notDeepEqual(t.train.map(p => p.x), s.train.map(p => p.x));
  assert.deepEqual([...t.train].sort((a, b) => a.x - b.x), [...s.train].sort((a, b) => a.x - b.x));
});
