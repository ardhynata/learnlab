import test from 'node:test';
import assert from 'node:assert/strict';
import {
  kFold, stratifiedKFold, groupKFold, timeSplit, crossValidate, knnFitPredict, accuracy,
  makeEntityData, entityXY, gridSearch, randomSearch, gridConfigs,
} from './validation.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const range = n => Array.from({ length: n }, (_, i) => i);

// Every row is tested exactly once, train and test never overlap, train + test = all rows.
function assertPartition(folds, n) {
  const seen = new Array(n).fill(0);
  for (const { train, test } of folds) {
    for (const i of test) seen[i]++;
    const inTest = new Set(test);
    assert.ok(train.every(i => !inTest.has(i)), 'train and test overlap');
    assert.equal(train.length + test.length, n);
  }
  assert.ok(seen.every(c => c === 1), 'a row is not tested exactly once');
}

test('kFold: folds partition the rows and differ in size by at most 1', () => {
  for (const [n, k] of [[10, 5], [11, 5], [23, 4], [7, 7]]) {
    const folds = kFold(n, k, 3);
    assert.equal(folds.length, k);
    assertPartition(folds, n);
    const sizes = folds.map(f => f.test.length);
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, sizes.join());
  }
});

test('kFold is reproducible per seed, differs between seeds, and shuffles', () => {
  assert.deepEqual(kFold(30, 5, 7), kFold(30, 5, 7));
  assert.notDeepEqual(kFold(30, 5, 7)[0].test, kFold(30, 5, 8)[0].test);
  assert.notDeepEqual(kFold(30, 5, 7)[0].test, range(6)); // not simply the first block
});

test('kFold rejects a k that cannot work', () => {
  assert.throws(() => kFold(5, 1), RangeError);
  assert.throws(() => kFold(5, 6), RangeError);
  assert.throws(() => kFold(5, 2.5), RangeError);
});

test('stratifiedKFold: folds partition the rows and class shares stay within 1', () => {
  // 3 classes of unequal size, including one that is smaller than k.
  const labels = [...Array(47).fill('a'), ...Array(21).fill('b'), ...Array(3).fill('c')];
  const folds = stratifiedKFold(labels, 5, 11);
  assertPartition(folds, labels.length);
  for (const c of ['a', 'b', 'c']) {
    const counts = folds.map(f => f.test.filter(i => labels[i] === c).length);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `${c}: ${counts.join()}`);
  }
  const sizes = folds.map(f => f.test.length);
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, sizes.join());
});

test('stratifiedKFold keeps numeric labels apart and beats plain kFold on a rare class', () => {
  const labels = [...Array(90).fill(0), ...Array(10).fill(1)];
  const folds = stratifiedKFold(labels, 5, 2);
  for (const f of folds) assert.equal(f.test.filter(i => labels[i] === 1).length, 2);
  // Plain k-fold has no such guarantee; with this seed the rare class is spread unevenly.
  const plain = kFold(100, 5, 2).map(f => f.test.filter(i => labels[i] === 1).length);
  assert.ok(Math.max(...plain) - Math.min(...plain) > 0, plain.join());
});

test('groupKFold: every group lives in exactly one test fold, never split', () => {
  const groups = [];
  for (let g = 0; g < 17; g++) for (let r = 0; r < 1 + (g % 5); r++) groups.push(`p${g}`);
  const folds = groupKFold(groups, 4, 5);
  assertPartition(folds, groups.length);
  const owner = new Map();
  folds.forEach((f, fi) => {
    for (const i of f.test) {
      if (owner.has(groups[i])) assert.equal(owner.get(groups[i]), fi, `${groups[i]} is split`);
      owner.set(groups[i], fi);
    }
    // No group appears on both sides of one fold.
    const testGroups = new Set(f.test.map(i => groups[i]));
    assert.ok(f.train.every(i => !testGroups.has(groups[i])), 'a group is in train and test');
  });
  assert.equal(owner.size, 17);
});

test('groupKFold balances fold sizes and is seeded', () => {
  const groups = range(40).flatMap(g => Array(8).fill(g));
  const folds = groupKFold(groups, 5, 1);
  assert.ok(folds.every(f => f.test.length === 64), folds.map(f => f.test.length).join());
  assert.deepEqual(groupKFold(groups, 5, 9), groupKFold(groups, 5, 9));
  assert.notDeepEqual(groupKFold(groups, 5, 9)[0].test, groupKFold(groups, 5, 10)[0].test);
  assert.throws(() => groupKFold(['a', 'a', 'b'], 3), RangeError); // only 2 groups
});

test('timeSplit: expanding window, training is always strictly before testing', () => {
  const n = 60, folds = timeSplit(n, 5);
  assert.equal(folds.length, 5);
  let prevTrain = 0;
  for (const { train, test } of folds) {
    assert.ok(Math.max(...train) < Math.min(...test), 'the future leaked into training');
    assert.deepEqual(train, range(train.length)); // starts at row 0 and has no holes
    assert.ok(train.length > prevTrain, 'the window did not expand');
    prevTrain = train.length;
    assert.deepEqual(test, range(test.length).map(j => train.length + j)); // contiguous, right after
  }
  // Blocks are consecutive and the last one ends at the final row.
  for (let i = 1; i < folds.length; i++) assert.equal(folds[i - 1].test.at(-1) + 1, folds[i].test[0]);
  assert.equal(folds.at(-1).test.at(-1), n - 1);
  assert.deepEqual(folds[0], { train: range(10), test: range(10).map(j => 10 + j) });
});

test('timeSplit gap leaves an embargo and still never trains on the future', () => {
  const folds = timeSplit(60, 5, 3);
  for (const { train, test } of folds) {
    assert.equal(Math.min(...test) - Math.max(...train), 4); // 3 rows skipped
  }
  assert.throws(() => timeSplit(3, 5), RangeError);
  assert.throws(() => timeSplit(60, 0), RangeError);
});

test('crossValidate: per-fold scores, mean and sample sd (hand-checked with a stub model)', () => {
  const X = range(6).map(i => [i]), y = [1, 1, 1, 0, 0, 0];
  const folds = [{ train: [0, 1, 2], test: [3, 4] }, { train: [3, 4, 5], test: [0, 1] }, { train: [1, 2], test: [5] }];
  // Always predicts 1: right on fold 2 (both 1), wrong on fold 1 and 3.
  const alwaysOne = (_tx, _ty, testX) => testX.map(() => 1);
  const r = crossValidate({ X, y, fitPredict: alwaysOne, folds });
  assert.deepEqual(r.scores, [0, 1, 0]);
  close(r.mean, 1 / 3);
  close(r.sd, Math.sqrt(((1 / 3) ** 2 * 2 + (2 / 3) ** 2) / 2)); // n - 1 form
  // The model receives only the training rows.
  const seen = [];
  crossValidate({ X, y, folds, fitPredict: (tx, ty, sx) => { seen.push([tx.length, ty.length, sx.length]); return sx.map(() => 0); } });
  assert.deepEqual(seen, [[3, 3, 2], [3, 3, 2], [2, 2, 1]]);
  // A custom metric is used, and one fold has sd 0.
  const one = crossValidate({ X, y, folds: [folds[0]], fitPredict: alwaysOne, metric: () => 0.5 });
  assert.deepEqual([one.scores, one.mean, one.sd], [[0.5], 0.5, 0]);
  assert.throws(() => crossValidate({ X, y: [1], fitPredict: alwaysOne, folds }), RangeError);
});

test('accuracy compares labels across number and string types', () => {
  close(accuracy([0, 1, 1, 0], [0, 1, 0, 0]), 0.75);
  close(accuracy([0, 1], ['0', '1']), 1);
  assert.ok(Number.isNaN(accuracy([], [])));
});

test('knnFitPredict returns labels in their original type and learns a separable toy set', () => {
  const trainX = [[0], [0.1], [5], [5.1]], trainY = [0, 0, 1, 1];
  const pred = knnFitPredict(1)(trainX, trainY, [[0.05], [4.9]]);
  assert.deepEqual(pred, [0, 1]); // numbers, not '0' / '1'
});

test('makeEntityData: shape, reproducibility, and persistent per-person quirks', () => {
  const rows = makeEntityData({ people: 12, recordsEach: 6, signal: 1, personEffect: 2, seed: 4 });
  assert.equal(rows.length, 72);
  assert.deepEqual(rows, makeEntityData({ people: 12, recordsEach: 6, signal: 1, personEffect: 2, seed: 4 }));
  assert.notDeepEqual(rows, makeEntityData({ people: 12, recordsEach: 6, signal: 1, personEffect: 2, seed: 5 }));
  assert.deepEqual(rows.map(r => r.time), range(72));
  const byPerson = new Map();
  for (const r of rows) byPerson.set(r.person, [...(byPerson.get(r.person) ?? []), r]);
  assert.equal(byPerson.size, 12);
  assert.ok([...byPerson.values()].every(rs => rs.length === 6));
  assert.ok(rows.every(r => r.features.length === 4 && (r.label === 0 || r.label === 1)));
  // Quirk features barely move within a person (noise 0.3) and differ a lot between people.
  const spread = (xs) => Math.max(...xs) - Math.min(...xs);
  for (const j of [1, 2, 3]) {
    const within = [...byPerson.values()].map(rs => spread(rs.map(r => r.features[j])));
    const personMeans = [...byPerson.values()].map(rs => rs.reduce((s, r) => s + r.features[j], 0) / rs.length);
    assert.ok(Math.max(...within) < 2.5, `quirk ${j} drifts within a person`);
    assert.ok(spread(personMeans) > 2.5, `quirk ${j} does not separate people`);
  }
  // The true signal: the first feature is higher for label 1 on average.
  const avg = l => { const f = rows.filter(r => r.label === l).map(r => r.features[0]); return f.reduce((a, b) => a + b, 0) / f.length; };
  assert.ok(avg(1) - avg(0) > 0.5, `signal gap ${avg(1) - avg(0)}`);
  // Most of a person's records share a label (the lean that makes identity predictive).
  const big = makeEntityData({ people: 100, recordsEach: 8, seed: 4 });
  let agree = 0;
  for (let p = 0; p < 100; p++) {
    const ones = big.filter(r => r.person === p && r.label === 1).length;
    agree += Math.max(ones, 8 - ones);
  }
  assert.ok(agree / 800 > 0.8, `majority share ${agree / 800}`); // about 0.85
});

test('random split leaks identity: its score clearly beats the grouped score on entity data', () => {
  const gaps = [];
  for (const seed of [1, 2, 3, 4, 5]) {
    const { X, y, groups } = entityXY(makeEntityData({ people: 40, recordsEach: 8, signal: 1, personEffect: 2, seed }));
    const model = knnFitPredict(5);
    const random = crossValidate({ X, y, fitPredict: model, folds: kFold(X.length, 5, seed) });
    const grouped = crossValidate({ X, y, fitPredict: model, folds: groupKFold(groups, 5, seed) });
    gaps.push(random.mean - grouped.mean);
    assert.ok(random.mean > grouped.mean, `seed ${seed}: ${random.mean} vs ${grouped.mean}`);
  }
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  assert.ok(avg > 0.1, `average gap ${avg}`); // measured about 0.15
  // One pinned run, as a lesson would show it.
  const { X, y, groups } = entityXY(makeEntityData({ people: 40, recordsEach: 8, signal: 1, personEffect: 2, seed: 2 }));
  const r = crossValidate({ X, y, fitPredict: knnFitPredict(5), folds: kFold(X.length, 5, 2) });
  const g = crossValidate({ X, y, fitPredict: knnFitPredict(5), folds: groupKFold(groups, 5, 2) });
  assert.ok(r.mean - g.mean > 0.1, `${r.mean} vs ${g.mean}`);
  assert.ok(g.mean > 0.5, 'grouped score should still beat a coin flip: the real signal is there');
});

test('with no personal quirk (personEffect 0) random and grouped splits agree', () => {
  const { X, y, groups } = entityXY(makeEntityData({ people: 40, recordsEach: 8, signal: 2, personEffect: 0, seed: 3 }));
  const r = crossValidate({ X, y, fitPredict: knnFitPredict(5), folds: kFold(X.length, 5, 3) });
  const g = crossValidate({ X, y, fitPredict: knnFitPredict(5), folds: groupKFold(groups, 5, 3) });
  assert.ok(Math.abs(r.mean - g.mean) < 0.08, `${r.mean} vs ${g.mean}`);
});

test('gridSearch: tries every combination in order, picks the best, ties keep the first', () => {
  const space = { a: [1, 2, 3], b: ['x', 'y'] };
  assert.equal(gridConfigs(space).length, 6);
  assert.deepEqual(gridConfigs(space)[0], { a: 1, b: 'x' });
  assert.deepEqual(gridConfigs(space)[1], { a: 1, b: 'y' });
  const g = gridSearch(space, c => -Math.abs(c.a - 2) + (c.b === 'y' ? 0.5 : 0));
  assert.equal(g.evaluations, 6);
  assert.deepEqual(g.best, { config: { a: 2, b: 'y' }, score: 0.5 });
  assert.equal(g.results.length, 6);
  const tie = gridSearch({ a: [1, 2, 3] }, () => 1);
  assert.equal(tie.best.config.a, 1);
  assert.throws(() => gridSearch({ a: { min: 0, max: 1 } }, () => 0), TypeError);
});

// Toy surface with one peak at (0.3, 0.7); 21 values per axis gives a 441-point grid.
const surface = ({ a, b }) => -((a - 0.3) ** 2) - ((b - 0.7) ** 2);
const axis = range(21).map(i => i / 20);

test('randomSearch with a quarter of the grid budget lands within 0.03 of the grid optimum', () => {
  const space = { a: axis, b: axis };
  const grid = gridSearch(space, surface);
  assert.equal(grid.evaluations, 441);
  close(grid.best.score, 0);
  const budget = 40; // under 10% of the grid
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const r = randomSearch(space, surface, budget, seed);
    assert.equal(r.evaluations, budget);
    assert.ok(grid.best.score - r.best.score <= 0.03, `seed ${seed}: ${r.best.score}`);
  }
});

test('randomSearch: seeded, no repeated configuration on a discrete space, budget capped by the grid', () => {
  const space = { a: axis, b: axis };
  assert.deepEqual(randomSearch(space, surface, 25, 6), randomSearch(space, surface, 25, 6));
  assert.notDeepEqual(randomSearch(space, surface, 25, 6).results, randomSearch(space, surface, 25, 7).results);
  const keys = randomSearch(space, surface, 60, 6).results.map(r => `${r.config.a}|${r.config.b}`);
  assert.equal(new Set(keys).size, 60);
  const small = randomSearch({ a: [1, 2, 3] }, c => c.a, 10, 1);
  assert.equal(small.evaluations, 3);
  assert.equal(small.best.config.a, 3);
  assert.throws(() => randomSearch(space, surface, 0), RangeError);
});

test('randomSearch samples numeric ranges (linear, log, integer) inside their bounds', () => {
  const seen = [];
  randomSearch({ lr: { min: 0.001, max: 1, log: true }, depth: { min: 1, max: 8, integer: true }, act: ['relu', 'tanh'] },
    c => { seen.push(c); return 0; }, 200, 4);
  assert.equal(seen.length, 200);
  assert.ok(seen.every(c => c.lr >= 0.001 && c.lr <= 1 && Number.isInteger(c.depth) && c.depth >= 1 && c.depth <= 8));
  assert.ok(seen.every(c => c.act === 'relu' || c.act === 'tanh'));
  // Log scale spreads draws across decades: a decent share lands under 0.01 (a third in theory).
  const low = seen.filter(c => c.lr < 0.01).length;
  assert.ok(low > 40 && low < 100, `${low} draws under 0.01`);
  assert.ok(new Set(seen.map(c => c.depth)).size >= 6);
});

test('tuning k for k-NN with cross-validation: grid and random search agree on a small space', () => {
  const { X, y, groups } = entityXY(makeEntityData({ people: 30, recordsEach: 6, signal: 2, personEffect: 1, seed: 9 }));
  const folds = groupKFold(groups, 5, 9);
  const evaluate = ({ k }) => crossValidate({ X, y, fitPredict: knnFitPredict(k), folds }).mean;
  const space = { k: [1, 3, 5, 9, 15, 25] };
  const grid = gridSearch(space, evaluate);
  const rand = randomSearch(space, evaluate, 4, 1);
  assert.equal(rand.evaluations, 4);
  assert.ok(grid.best.score >= rand.best.score);
  assert.ok(grid.best.score - rand.best.score < 0.1);
});
