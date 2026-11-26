import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDataset, SHARED_SEED } from './datasets.js';

test('the shared dataset is reproducible and identical for every lab that asks for it', () => {
  const a = makeDataset('clusters', SHARED_SEED, 48), b = makeDataset('clusters', SHARED_SEED, 48);
  assert.deepEqual(a, b);
  assert.equal(a.length, 48);
  // Labels alternate A, B: k-NN uses them, k-means ignores them and groups by position.
  assert.deepEqual(a.slice(0, 4).map(p => p.label), ['A', 'B', 'A', 'B']);
  assert.ok(a.every(p => p.x >= 0 && p.x <= 10 && p.y >= 0 && p.y <= 10));
});

test('the course points do not change between releases (labs and lessons quote them)', () => {
  const [p] = makeDataset('clusters', SHARED_SEED, 48);
  assert.equal(p.x.toFixed(3), '4.125');
  assert.equal(p.y.toFixed(3), '7.886');
});
