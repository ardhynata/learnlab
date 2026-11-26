import test from 'node:test';
import assert from 'node:assert/strict';
import { incomeAgeData, makeScaler, scaledPoints, compareScalings, oneHot, ordinal, SCALINGS } from './scaledemo.js';
import { columnStats } from './scale.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

test('the dataset is seeded, in the stated ranges, with two balanced groups', () => {
  const a = incomeAgeData(), b = incomeAgeData();
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, incomeAgeData(3));
  assert.equal(a.length, 60);
  for (const p of a) {
    assert.ok(p.features[0] >= 20000 && p.features[0] <= 120000, `income ${p.features[0]}`);
    assert.ok(p.features[1] >= 18 && p.features[1] <= 70, `age ${p.features[1]}`);
  }
  assert.equal(a.filter(p => p.label === 'A').length, 30);
  const meanAge = l => a.filter(p => p.label === l).reduce((s, p) => s + p.features[1], 0) / 30;
  assert.ok(meanAge('B') - meanAge('A') > 15, 'age separates the groups');
});

test('standardized columns have mean 0 and standard deviation 1', () => {
  const { points } = scaledPoints(incomeAgeData(), 'standardize');
  const s = columnStats(points.map(p => p.features));
  for (let j = 0; j < 2; j++) { close(s.mean[j], 0, 1e-9); close(s.std[j], 1, 1e-9); }
});

test('min-max columns lie in [0, 1] and touch both ends', () => {
  const { points } = scaledPoints(incomeAgeData(), 'minmax');
  const s = columnStats(points.map(p => p.features));
  for (let j = 0; j < 2; j++) { close(s.min[j], 0); close(s.max[j], 1); }
});

test('a hand-computed scaling: three people from the lesson', () => {
  const rows = [[51000, 30], [50000, 60], [55000, 33]];
  const z = makeScaler('standardize', rows);
  close(z.stats.mean[0], 52000); close(z.stats.mean[1], 41);
  close(z.stats.std[0], Math.sqrt(14e6 / 3)); close(z.stats.std[1], Math.sqrt(182));
  close(z.forward(rows[0])[0], -1000 / Math.sqrt(14e6 / 3));
  close(z.forward(rows[1])[1], 19 / Math.sqrt(182));
  const m = makeScaler('minmax', rows);
  close(m.forward([51000, 30])[0], 0.2); close(m.forward([55000, 33])[0], 1); close(m.forward([50000, 60])[1], 1);
  const none = makeScaler('none', rows);
  assert.deepEqual(none.forward([1, 2]), [1, 2]);
  assert.throws(() => makeScaler('log', rows));
});

test('inverse undoes forward for every scaling', () => {
  const rows = incomeAgeData().map(p => p.features);
  for (const [kind] of SCALINGS) {
    const s = makeScaler(kind, rows);
    const back = s.inverse(s.forward([73000, 41]));
    close(back[0], 73000, 1e-6); close(back[1], 41, 1e-9);
  }
});

test('unscaled k-NN is clearly worse than scaled k-NN on the seeded data, for every k', () => {
  const data = incomeAgeData();
  for (const k of [1, 3, 5, 9, 15]) {
    const c = compareScalings(data, [85000, 27], k);
    assert.ok(c.none.accuracy <= 0.65, `none k=${k}: ${c.none.accuracy}`);
    assert.ok(c.standardize.accuracy >= 0.85, `standardize k=${k}: ${c.standardize.accuracy}`);
    assert.ok(c.minmax.accuracy >= 0.85, `minmax k=${k}: ${c.minmax.accuracy}`);
    assert.ok(c.standardize.accuracy - c.none.accuracy >= 0.25, `gap at k=${k}`);
  }
});

test('the default query is misclassified without scaling and right with it', () => {
  const c = compareScalings(incomeAgeData(), [85000, 27], 5);
  assert.equal(c.none.label, 'B');
  assert.equal(c.standardize.label, 'A');
  assert.equal(c.minmax.label, 'A');
  assert.equal(c.none.neighbors.length, 5);
  assert.ok(c.none.distances[0] <= c.none.distances[4]);
});

test('unscaled neighbors are decided by income alone', () => {
  const data = incomeAgeData();
  const c = compareScalings(data, [85000, 27], 5);
  const incomeGap = i => Math.abs(data[i].features[0] - 85000);
  const byIncome = data.map((_, i) => i).sort((a, b) => incomeGap(a) - incomeGap(b) || a - b).slice(0, 5);
  assert.deepEqual(c.none.neighbors, byIncome);
});

test('one-hot gives one column per category with a single 1 per row', () => {
  const { categories, rows } = oneHot(['red', 'green', 'blue', 'green'], ['red', 'green', 'blue']);
  assert.deepEqual(categories, ['red', 'green', 'blue']);
  assert.deepEqual(rows, [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 1, 0]]);
  assert.deepEqual(oneHot(['b', 'a', 'b']).categories, ['b', 'a']);
});

test('one-hot colors are all the same distance apart; ordinal codes are not', () => {
  const dist = (u, v) => Math.hypot(...u.map((x, i) => x - v[i]));
  const { rows } = oneHot(['red', 'green', 'blue'], ['red', 'green', 'blue']);
  close(dist(rows[0], rows[1]), Math.SQRT2); close(dist(rows[0], rows[2]), Math.SQRT2); close(dist(rows[1], rows[2]), Math.SQRT2);
  const codes = ordinal(['red', 'green', 'blue'], ['red', 'green', 'blue']);
  assert.deepEqual(codes, [0, 1, 2]);
  assert.equal(Math.abs(codes[0] - codes[2]), 2 * Math.abs(codes[0] - codes[1]));
});
