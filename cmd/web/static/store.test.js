import test from 'node:test';
import assert from 'node:assert/strict';
import { savedRow } from './store.js';

const payload = { learner_id: 'l', lesson_id: 'x', completed: false, score: 0, total: 9 };

test('a zero score the server left out of its answer reads as 0, not undefined', () => {
  const row = savedRow(null, payload, { id: 'p1', learner_id: 'l', lesson_id: 'x', total: 9 });
  assert.equal(row.score, 0);
  assert.equal(row.total, 9);
  assert.equal(row.completed, false);
  assert.equal(row.id, 'p1');
});

test('the server answer wins where it says something', () => {
  const row = savedRow(null, { ...payload, score: 7, completed: true }, { id: 'p1', score: 7, total: 9, completed: true });
  assert.deepEqual([row.score, row.total, row.completed], [7, 9, true]);
});

test('an empty answer keeps the previous row and the sent values', () => {
  const row = savedRow({ id: 'p9', score: 3 }, { ...payload, score: 4 }, null);
  assert.deepEqual([row.id, row.score, row.total], ['p9', 4, 9]);
});
