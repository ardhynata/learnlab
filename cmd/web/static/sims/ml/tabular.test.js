import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, splitIndices, fitMeanImputer, fitStandardizer, fitMinMaxScaler, fitOneHot, classShares } from './tabular.js';

test('parseCsv types numeric columns, keeps text, reads quotes and treats blanks and NA as missing', () => {
  const t = parseCsv('species,mass,note\nAdelie,3750,"a, b"\nGentoo,,x\nAdelie,NA,y\n');
  assert.deepEqual(t.columns, ['species', 'mass', 'note']);
  assert.equal(t.numeric.mass, true);
  assert.equal(t.numeric.species, false);
  assert.deepEqual(t.rows[0], { species: 'Adelie', mass: 3750, note: 'a, b' });
  assert.equal(t.rows[1].mass, null);
  assert.equal(t.rows[2].mass, null);
});

test('splitIndices is reproducible, disjoint, covers every row and keeps class shares when stratified', () => {
  const labels = Array.from({ length: 100 }, (_, i) => (i < 80 ? 'a' : 'b'));
  const s1 = splitIndices(100, { train: 0.6, validation: 0.2 }, 7, labels);
  const s2 = splitIndices(100, { train: 0.6, validation: 0.2 }, 7, labels);
  assert.deepEqual(s1, s2);
  const all = [...s1.train, ...s1.validation, ...s1.test];
  assert.equal(new Set(all).size, 100);
  assert.equal(all.length, 100);
  // 80 a and 20 b: train takes round(48) a + round(12) b = 60.
  assert.equal(s1.train.length, 60);
  assert.deepEqual(classShares(s1.train.map(i => labels[i])), { a: 0.8, b: 0.2 });
  assert.notDeepEqual(s1, splitIndices(100, { train: 0.6, validation: 0.2 }, 8, labels));
});

test('preprocessing fitted on training rows does not see the test rows (the leakage lesson)', () => {
  const train = [2, 4, 6], test = [100];
  const fitOnTrain = fitStandardizer(train);
  assert.equal(fitOnTrain.mean, 4);
  assert.ok(Math.abs(fitOnTrain.sd - Math.sqrt(8 / 3)) < 1e-12);
  const leaked = fitStandardizer([...train, ...test]);
  assert.ok(leaked.mean > 20);
  assert.notEqual(fitOnTrain.apply(test)[0], leaked.apply(test)[0]);
});

test('imputer, min-max scaler and one-hot encoder learn from the fitted rows only', () => {
  const imp = fitMeanImputer([1, null, 3]);
  assert.equal(imp.mean, 2);
  assert.deepEqual(imp.apply([null, 10]), [2, 10]);
  const mm = fitMinMaxScaler([10, 20, 30]);
  assert.deepEqual(mm.apply([10, 25, 40]), [0, 0.75, 1.5]);
  const oh = fitOneHot(['b', 'a', 'b']);
  assert.deepEqual(oh.categories, ['a', 'b']);
  assert.deepEqual(oh.apply(['a', 'b', 'c']), [[1, 0], [0, 1], [0, 0]]);
});
