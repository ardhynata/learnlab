import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCsv } from './tabular.js';
import { makeEntityData, entityXY, kFold, groupKFold, crossValidate, knnFitPredict } from './validation.js';
import {
  knnPredictor, timeFolds, groupOverlap, majorityShare, compareSplits, splitVerdict, gridShape, spread, bestSoFar,
  searchCompare, penguinTable, tablePeek,
} from './validationlab.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('knnPredictor agrees with the library k-NN fold by fold (weight 1, no scaling)', () => {
  const { X, y } = entityXY(makeEntityData({ people: 12, recordsEach: 6, seed: 3 }));
  const folds = kFold(X.length, 4, 2);
  const mine = crossValidate({ X, y, fitPredict: knnPredictor({ k: 5 }), folds });
  const lib = crossValidate({ X, y, fitPredict: knnFitPredict(5), folds });
  assert.deepEqual(mine.scores, lib.scores);
});

test('the weight on the first feature can flip a neighbour (hand-computed)', () => {
  const trainX = [[0, 0], [10, 3]], trainY = ['a', 'b'];
  // Query (6, 0). Weight 1: distance to a is 6, to b is sqrt(16 + 9) = 5, so b.
  // Weight 0.1: to a is 0.6, to b is sqrt(0.16 + 9) = 3.03, so a.
  assert.deepEqual(knnPredictor({ k: 1, weight: 1 })(trainX, trainY, [[6, 0]]), ['b']);
  assert.deepEqual(knnPredictor({ k: 1, weight: 0.1 })(trainX, trainY, [[6, 0]]), ['a']);
});

test('a tie in the votes goes to the closest neighbour, and labels keep their type', () => {
  const trainX = [[0], [3]], trainY = [0, 1];
  assert.deepEqual(knnPredictor({ k: 2 })(trainX, trainY, [[1], [2.5]]), [0, 1]);
});

test('k larger than the training set uses every row', () => {
  assert.deepEqual(knnPredictor({ k: 50 })([[0], [1], [2]], ['x', 'x', 'y'], [[2]]), ['x']);
});

test('standardize learns its scale from the training rows only and removes unit differences', () => {
  const trainX = [[1, 1000], [2, 2000], [9, 1100], [8, 2100]], trainY = ['a', 'a', 'b', 'b'];
  const testX = [[1.5, 2000], [8.5, 1000]];
  // Raw distances are dominated by the second column (hundreds against units), so the first column
  // is ignored and the second test row is matched to the row with the same second column: 'a'.
  // Scaled by the training mean and spread (first column 5 and 3.54, second 1550 and 502), the second
  // test row sits at (0.99, -1.10): 0.28 from the row (9, 1100), so 'b'.
  assert.deepEqual(knnPredictor({ k: 1 })(trainX, trainY, testX), ['a', 'a']);
  const scaled = knnPredictor({ k: 1, standardize: true })(trainX, trainY, testX);
  assert.deepEqual(scaled, ['a', 'b']);
  const inKilo = trainX.map(([a, b]) => [a, b / 1000]);
  assert.deepEqual(knnPredictor({ k: 1, standardize: true })(inKilo, trainY, testX.map(([a, b]) => [a, b / 1000])), scaled);
});

test('groupOverlap counts test rows whose group is also in training (hand-computed)', () => {
  const groups = ['p', 'p', 'q', 'q'];
  const together = [{ train: [1, 3], test: [0, 2] }, { train: [0, 2], test: [1, 3] }];
  const apart = [{ train: [2, 3], test: [0, 1] }, { train: [0, 1], test: [2, 3] }];
  assert.equal(groupOverlap(together, groups), 1);
  assert.equal(groupOverlap(apart, groups), 0);
  assert.equal(groupOverlap([{ train: [0, 2], test: [1, 3] }, { train: [2, 3], test: [0, 1] }], groups), 0.5);
});

test('majorityShare is the accuracy of always guessing the most common label', () => {
  assert.equal(majorityShare([0, 0, 1, 0]), 0.75);
  assert.ok(Number.isNaN(majorityShare([])));
});

test('compareSplits: random folds leak the person, grouped folds do not', () => {
  const rows = makeEntityData({ people: 40, recordsEach: 8, personEffect: 2, seed: 1 });
  const { X, y, groups } = entityXY(rows);
  const c = compareSplits({ X, y, groups, times: rows.map(r => r.time), folds: 5, model: { k: 5 }, temporal: true });
  assert.equal(c.random.scores.length, 5);
  assert.equal(c.grouped.scores.length, 5);
  assert.equal(c.temporal.scores.length, 5);
  assert.equal(c.overlap.random, 1);
  assert.equal(c.overlap.grouped, 0);
  assert.equal(c.overlap.temporal, 1);   // the same people come back later: a time split does not hide them
  assert.ok(c.gap > 0.08, `gap ${c.gap}`);
  close(c.gap, c.random.mean - c.grouped.mean);
  assert.equal(c.groupFolds, 5);
  assert.ok(c.baseline >= 0.5 && c.baseline < 1);
});

test('compareSplits: with no person quirk the two splits agree', () => {
  const rows = makeEntityData({ people: 40, recordsEach: 8, personEffect: 0, seed: 1 });
  const { X, y, groups } = entityXY(rows);
  const c = compareSplits({ X, y, groups, times: rows.map(r => r.time), folds: 5, model: { k: 5 } });
  assert.ok(Math.abs(c.gap) < 0.05, `gap ${c.gap}`);
  assert.equal(c.temporal, null);
});

test('compareSplits: grouped folds cannot exceed the number of groups, and the time split follows time', () => {
  const X = [[0], [1], [2], [3], [4], [5]], y = [0, 0, 0, 1, 1, 1], groups = ['a', 'a', 'b', 'b', 'c', 'c'];
  const c = compareSplits({ X, y, groups, times: [5, 4, 3, 2, 1, 0], folds: 5, model: { k: 1 }, temporal: true });
  assert.equal(c.groupFolds, 3);
  assert.equal(c.grouped.folds.length, 3);
  // Row 5 is the earliest: it only ever trains. The first test block is row 4, trained on row 5 alone.
  assert.deepEqual(c.temporal.folds[0], { train: [5], test: [4], label: null });
  assert.deepEqual(c.temporal.folds.flatMap(f => f.test).sort(), [0, 1, 2, 3, 4]);
});

test('timeFolds cuts a year column at the years, never inside one (hand-computed)', () => {
  const years = [2007, 2007, 2008, 2009, 2008, 2008];
  assert.deepEqual(timeFolds(years, 5), [
    { train: [0, 1], test: [2, 4, 5], label: 2008 },
    { train: [0, 1, 2, 4, 5], test: [3], label: 2009 },
  ]);
  assert.throws(() => timeFolds([2007, 2007, 2007, 2007], 3), RangeError);
});

test('timeFolds on a row order gives an expanding window whose training never holds the future', () => {
  const times = Array.from({ length: 30 }, (_, i) => i);
  const folds = timeFolds(times, 4);
  assert.equal(folds.length, 4);
  for (const f of folds) assert.ok(Math.max(...f.train) < Math.min(...f.test));
  assert.ok(folds[1].train.length > folds[0].train.length);
});

test('splitVerdict reads the gap with a tolerance', () => {
  assert.equal(splitVerdict(0.13), 'random-higher');
  assert.equal(splitVerdict(0.01), 'same');
  assert.equal(splitVerdict(-0.01), 'same');
  assert.equal(splitVerdict(-0.05), 'grouped-higher');
});

test('gridShape fills the budget as squarely as it can', () => {
  assert.deepEqual(gridShape(16), [4, 4]);
  assert.deepEqual(gridShape(12), [4, 3]);
  assert.deepEqual(gridShape(7), [3, 2]);
  assert.deepEqual(gridShape(30), [6, 5]);
  assert.deepEqual(gridShape(3), [3, 1]);
  assert.throws(() => gridShape(0), RangeError);
  for (let b = 4; b <= 40; b++) { const [x, z] = gridShape(b); assert.ok(x * z <= b && z >= 2 && x >= z); }
});

test('spread gives evenly spaced, log-spaced and integer values', () => {
  assert.deepEqual(spread(1, 31, 4, { integer: true }), [1, 11, 21, 31]);
  assert.deepEqual(spread(0, 1, 5), [0, 0.25, 0.5, 0.75, 1]);
  const l = spread(0.25, 8, 3, { log: true });
  close(l[0], 0.25); close(l[1], Math.sqrt(0.25 * 8)); close(l[2], 8);
  assert.deepEqual(spread(1, 3, 1), [2]);
});

test('bestSoFar is the running maximum', () => {
  assert.deepEqual(bestSoFar([0.5, 0.4, 0.7, 0.6, 0.7]), [0.5, 0.5, 0.7, 0.7, 0.7]);
  assert.deepEqual(bestSoFar([]), []);
});

test('searchCompare spends the budget: a grid of gridShape evaluations against budget random draws', () => {
  // A score that peaks at k = 10, weight = 2.
  const evaluate = ({ k, weight }) => 1 - ((k - 10) / 40) ** 2 - (Math.log2(weight) - 1) ** 2 / 20;
  const { grid, random } = searchCompare({ evaluate, budget: 16, seed: 4 });
  assert.equal(grid.evaluations, 16);
  assert.deepEqual(grid.shape, [4, 4]);
  assert.equal(random.evaluations, 16);
  for (const r of [grid, random]) {
    assert.equal(r.curve.length, r.evaluations);
    assert.equal(r.curve.at(-1), r.best.score);
    r.curve.forEach((v, i) => assert.ok(i === 0 || v >= r.curve[i - 1]));
    assert.ok(r.best.score <= 1);
  }
  // Grid values of k are 1, 11, 21, 31: the best of them is 11.
  assert.equal(grid.best.config.k, 11);
  assert.equal(new Set(random.results.map(x => x.config.k)).size > 4, true);   // random tries more different values
  const again = searchCompare({ evaluate, budget: 16, seed: 4 });
  assert.deepEqual(again.random.results, random.results);   // seeded
});

test('the bundled penguins: species keeps 342 complete rows, sex 333, islands are the groups', () => {
  const table = parseCsv(fs.readFileSync(new URL('../../data/penguins.csv', import.meta.url), 'utf8'));
  const sp = penguinTable(table, 'species');
  assert.equal(sp.total, 344);
  assert.equal(sp.X.length, 342);
  assert.equal(sp.dropped, 2);
  assert.equal(sp.droppedFor, 0);
  assert.deepEqual(sp.classes, ['Adelie', 'Chinstrap', 'Gentoo']);
  assert.deepEqual([...new Set(sp.groups)].sort(), ['Biscoe', 'Dream', 'Torgersen']);
  assert.deepEqual(sp.X[0], [181, 39.1, 18.7, 3750]);   // flipper first
  assert.equal(sp.times[0], 2007);
  const sx = penguinTable(table, 'sex');
  assert.equal(sx.X.length, 333);
  assert.equal(sx.dropped, 11);
  assert.equal(sx.droppedFeatures, 2);
  assert.equal(sx.droppedFor, 9);
  assert.deepEqual(sx.classes, ['female', 'male']);
});

test('on the penguins a leave-one-island-out split scores far below a random split (species)', () => {
  const table = parseCsv(fs.readFileSync(new URL('../../data/penguins.csv', import.meta.url), 'utf8'));
  const p = penguinTable(table, 'species');
  const c = compareSplits({ ...p, folds: 5, model: { k: 5, standardize: true } });
  assert.equal(c.groupFolds, 3);
  assert.ok(c.random.mean > 0.95);
  assert.ok(c.grouped.mean < 0.7);   // Gentoo or Chinstrap never appear in training when their island is left out
  assert.equal(c.overlap.grouped, 0);
});

test('tablePeek takes the first rows of the first groups, group by group', () => {
  const groups = [2, 1, 2, 1, 3, 1, 2];
  assert.deepEqual(tablePeek(groups, 2, 2), [1, 3, 0, 2]);
  assert.deepEqual(tablePeek(groups, 5, 3), [1, 3, 5, 0, 2, 6, 4]);
});
