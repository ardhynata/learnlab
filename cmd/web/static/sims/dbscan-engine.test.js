import test from 'node:test';
import assert from 'node:assert/strict';
import { nearestInDirection } from './dbscan-engine.js';

const pts = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 8, y: 5 }, { x: 5, y: 7 }, { x: 4, y: 5 }];

test('nearestInDirection picks the closest point strictly in that direction', () => {
  assert.equal(nearestInDirection(pts, 0, 1, 0), 1);
  assert.equal(nearestInDirection(pts, 0, -1, 0), 4);
  assert.equal(nearestInDirection(pts, 0, 0, 1), 3);
  assert.equal(nearestInDirection(pts, 1, 1, 0), 2);
});

test('nearestInDirection prefers the point straight ahead over a nearer one off to the side', () => {
  const row = [{ x: 0, y: 0 }, { x: 1, y: 1.4 }, { x: 2, y: 0 }];
  assert.equal(nearestInDirection(row, 0, 1, 0), 2);
});

test('nearestInDirection returns -1 when nothing lies that way, or the point is unknown', () => {
  assert.equal(nearestInDirection(pts, 2, 1, 0), -1);
  assert.equal(nearestInDirection(pts, 0, 0, -1), -1);
  assert.equal(nearestInDirection(pts, 99, 1, 0), -1);
  assert.equal(nearestInDirection([{ x: 1, y: 1 }], 0, 1, 0), -1);
});
