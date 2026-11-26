import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LAB_SIZES, sizeGrid, mixSeed, makeGlyphTask, makePenguinTask, scoreSteps, winnerOf, createQueue, projectTo2d, pcaBaseline,
} from './representationlab.js';
import { trainAutoencoder, featuresFrom, reconstructionError } from './representation.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (tol ${tol})`);
const run = gen => { let r = gen.next(); while (!r.done) r = gen.next(); return r.value; };

test('sizeGrid keeps the fixed sizes and adds the learner size in order', () => {
  assert.deepEqual(LAB_SIZES, [2, 5, 10, 25, 50, 100]);
  assert.deepEqual(sizeGrid(5), [2, 5, 10, 25, 50, 100]);
  assert.deepEqual(sizeGrid(7), [2, 5, 7, 10, 25, 50, 100]);
  assert.deepEqual(sizeGrid(100), LAB_SIZES);
});

test('mixSeed is deterministic and separates neighbouring inputs', () => {
  assert.equal(mixSeed(1, 1), mixSeed(1, 1));
  assert.notEqual(mixSeed(1, 1), mixSeed(1, 2));
  assert.notEqual(mixSeed(1, 1), mixSeed(2, 1));
});

test('winnerOf needs a margin of 3 points', () => {
  assert.equal(winnerOf(0.94, 0.85), 'frozen');
  assert.equal(winnerOf(0.7, 0.85), 'raw');
  assert.equal(winnerOf(0.86, 0.85), 'tie');
  assert.equal(winnerOf(0.85, 0.87), 'tie');
});

test('the glyph task has a pool, 100 labelled glyphs per class and a held-out test set, all different', () => {
  const t = makeGlyphTask({ seed: 1 });
  assert.equal(t.kind, 'glyph');
  assert.equal(t.k, 4);
  assert.equal(t.d, 64);
  assert.equal(t.pool.length, 400);
  assert.equal(t.labelled.X.length, 400);
  assert.equal(t.test.X.length, 240);
  assert.deepEqual([0, 1, 2, 3].map(c => t.labelled.y.filter(v => v === c).length), [100, 100, 100, 100]);
  assert.deepEqual([0, 1, 2, 3].map(c => t.test.y.filter(v => v === c).length), [60, 60, 60, 60]);
  assert.deepEqual(t.classNames, ['bar', 'cross', 'box', 'diagonal']);
  assert.notDeepEqual(t.pool.slice(0, 5), t.labelled.X.slice(0, 5));
  assert.deepEqual(makeGlyphTask({ seed: 1 }).test.X, t.test.X);
  assert.notDeepEqual(makeGlyphTask({ seed: 2 }).test.X, t.test.X);
  assert.equal(t.perClassMax, 100);
});

test('the penguin task drops rows with a missing measurement, scales to 0..1 and splits each species in half', () => {
  const row = (species, a, b, c, d) => ({ species, bill_length_mm: a, bill_depth_mm: b, flipper_length_mm: c, body_mass_g: d });
  const rows = [];
  for (let i = 0; i < 6; i++) rows.push(row('A', 10 + i, 20, 30, 40));
  for (let i = 0; i < 4; i++) rows.push(row('B', 20 + i, 10, 50, 80));
  rows.push(row('A', null, 20, 30, 40));
  const t = makePenguinTask({ rows }, 1);
  assert.equal(t.total, 11);
  assert.equal(t.dropped, 1);
  assert.deepEqual(t.classNames, ['A', 'B']);
  assert.equal(t.d, 4);
  assert.equal(t.labelled.X.length + t.test.X.length, 10);
  assert.equal(t.labelled.X.length, 5);                // 3 of A and 2 of B
  assert.equal(t.perClassMax, 2);
  assert.equal(t.pool, t.labelled.X);
  const all = [...t.labelled.X, ...t.test.X];
  for (let j = 0; j < 4; j++) {
    assert.equal(Math.min(...all.map(r => r[j])), 0);
    assert.equal(Math.max(...all.map(r => r[j])), 1);
  }
  assert.deepEqual(t.lo, [10, 10, 30, 40]);
  assert.deepEqual(t.hi, [23, 20, 50, 80]);
});

test('scoring is deterministic and the methods validate their inputs', () => {
  const task = makeGlyphTask({ seed: 3 });
  const a = run(scoreSteps('raw', { task, perClass: 5, rep: 0, seed: 3 }));
  assert.equal(a, run(scoreSteps('raw', { task, perClass: 5, rep: 0, seed: 3 })));
  assert.ok(a > 0.25 && a <= 1);
  assert.throws(() => run(scoreSteps('frozen', { task, perClass: 5 })), /needs an autoencoder/);
  assert.throws(() => run(scoreSteps('bogus', { task, perClass: 5 })), /unknown method/);
  const s1 = run(scoreSteps('scratch', { task, perClass: 10, rep: 0, seed: 3 }));
  assert.equal(s1, run(scoreSteps('scratch', { task, perClass: 10, rep: 0, seed: 3 })));
  assert.ok(s1 > 0.5, `scratch network learns something from 40 labels: ${s1}`);
});

test('scratch scoring yields between epochs so a queue can slice it', () => {
  const task = makeGlyphTask({ seed: 1 });
  const g = scoreSteps('scratch', { task, perClass: 2, rep: 0, seed: 1 });
  let steps = 0, r = g.next();
  while (!r.done) { steps++; r = g.next(); }
  assert.equal(steps, 4 * 150, 'one step per epoch per class: 8 rows is one batch per epoch, so 150 epochs for 4 classes');
});

test('pretraining makes few labels go further: frozen features beat raw pixels at 5 labelled per class', () => {
  const task = makeGlyphTask({ seed: 1 });
  const ae = trainAutoencoder({ X: task.pool, bottleneck: 8, hidden: 24, epochs: 20, lr: 0.01, batchSize: 32, seed: 1, denoise: 0.15 });
  assert.ok(reconstructionError(ae, task.test.X) < 0.6 * ae.history.initialLoss, 'pretraining cuts the reconstruction error');
  const testCodes = featuresFrom(ae, task.test.X);
  const mean = method => [0, 1, 2].map(rep => run(scoreSteps(method, { task, ae, testCodes, perClass: 5, rep, seed: 1 }))).reduce((s, v) => s + v, 0) / 3;
  const frozen = mean('frozen'), raw = mean('raw');
  assert.ok(frozen - raw > 0.03, `frozen ${frozen} vs raw ${raw}`);
  assert.equal(winnerOf(frozen, raw), 'frozen');
});

test('the queue advances the head job, reports results in order and respects its time budget', () => {
  const q = createQueue();
  const done = [];
  function* count(n) { for (let i = 0; i < n; i++) yield; return n; }
  q.push({ key: 'a', gen: count(3), onDone: v => done.push(['a', v]) });
  q.push({ key: 'b', gen: count(1), onDone: v => done.push(['b', v]) });
  assert.equal(q.size(), 2);
  // A fake clock that advances 5 ms per reading: a 12 ms budget allows the first reading plus about 3 steps.
  let t = 0;
  const now = () => (t += 5);
  const steps = q.run(12, now);
  assert.ok(steps >= 1 && steps <= 3, `steps ${steps}`);
  while (q.size()) q.run(1000, () => 0);
  assert.deepEqual(done, [['a', 3], ['b', 1]]);
  // always at least one step, even with a zero budget
  q.push({ key: 'c', gen: count(5) });
  assert.equal(q.run(0, now), 1);
  q.pushFront({ key: 'd', gen: count(0), onDone: v => done.push(['d', v]) });
  q.run(0, now);
  assert.deepEqual(done.at(-1), ['d', 0]);
  q.clear();
  assert.equal(q.size(), 0);
});

test('projectTo2d scales a 2-column code to the 0..10 square with one scale for both axes', () => {
  // x spans 2 and y 0, so the scale is 9 / 2 = 4.5 around the centre (1, 0): x -> 5 + (x - 1) * 4.5, y -> 5.
  const { points, explained } = projectTo2d([[0, 0], [2, 0]]);
  close(points[0][0], 0.5); close(points[1][0], 9.5);
  close(points[0][1], 5); close(points[1][1], 5);
  assert.equal(explained, 1);
  assert.deepEqual(projectTo2d([]).points, []);
  assert.deepEqual(projectTo2d([[1, 1], [1, 1]]).points, [[5, 5], [5, 5]]);
});

test('projectTo2d keeps the two strongest principal axes of a wider code', () => {
  // three columns that are all the same number: one direction carries everything
  const codes = [[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3]];
  const { points, explained } = projectTo2d(codes);
  close(explained, 1, 1e-9);
  for (const p of points) close(p[1], 5, 1e-9);
  const xs = points.map(p => p[0]).sort((a, b) => a - b);
  close(xs[0], 0.5, 1e-9); close(xs[3], 9.5, 1e-9);
});

test('pcaBaseline reconstructs data that lies on a plane with no error from 2 components', () => {
  const pool = [], testRows = [];
  for (let i = 0; i < 12; i++) { const a = (i % 4) / 3, b = Math.floor(i / 4) / 2; pool.push([a, b, a + b, a - b]); }
  for (let i = 0; i < 5; i++) { const a = i / 5, b = 1 - i / 7; testRows.push([a, b, a + b, a - b]); }
  const base = pcaBaseline({ pool, test: { X: testRows }, d: 4 });
  assert.ok(base.mse < 1e-12, `mse ${base.mse}`);
  assert.equal(base.testCodes.length, 5);
  assert.equal(base.testCodes[0].length, 2);
});
