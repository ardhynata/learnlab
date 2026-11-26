import test from 'node:test';
import assert from 'node:assert/strict';
import { ballOutline } from './distance-playground.js';
import { distance } from '../kit/index.js';

test('every outline point of the shape sits at distance r from A under its metric', () => {
  const a = { x: 3, y: 4 }, r = 2.5;
  for (const metric of ['euclidean', 'manhattan', 'chebyshev']) {
    const pts = ballOutline(metric, a, r);
    assert.ok(pts.length >= 5);
    for (const p of pts) assert.ok(Math.abs(distance[metric](a, p) - r) < 1e-9, `${metric}: ${JSON.stringify(p)}`);
    assert.ok(distance.euclidean(pts[0], pts.at(-1)) < 1e-9, `${metric}: outline is closed`);
  }
});

test('cosine distance is undefined when either point sits on the origin', async () => {
  const { cosineDefined } = await import('./distance-playground.js');
  assert.equal(cosineDefined({ x: 0, y: 0 }, { x: 4, y: 8 }), false);
  assert.equal(cosineDefined({ x: 3, y: 3 }, { x: 0, y: 0 }), false);
  assert.equal(cosineDefined({ x: 3, y: 3 }, { x: 7, y: 6 }), true);
  assert.equal(cosineDefined({ x: 0, y: 2 }, { x: 5, y: 0 }), true);
});

test('keyboard nudge moves by a step, a bigger step with Shift, and clamps inside the plot', async () => {
  const { nudge, KEY_STEP, KEY_STEP_BIG } = await import('./distance-playground.js');
  const range = { minX: 0, minY: 0, span: 10 };
  const p = { x: 3, y: 3 };
  assert.deepEqual(nudge(p, 'ArrowRight', false, range), { x: 3 + KEY_STEP, y: 3 });
  assert.deepEqual(nudge(p, 'ArrowUp', true, range), { x: 3, y: 3 + KEY_STEP_BIG });
  assert.deepEqual(nudge(p, 'ArrowLeft', false, range), { x: 3 - KEY_STEP, y: 3 });
  assert.deepEqual(nudge(p, 'ArrowDown', true, range), { x: 3, y: 3 - KEY_STEP_BIG });
  assert.deepEqual(nudge({ x: 0.1, y: 9.9 }, 'ArrowLeft', true, range), { x: 0, y: 9.9 });
  assert.deepEqual(nudge({ x: 9.9, y: 0.1 }, 'ArrowRight', true, range), { x: 10, y: 0.1 });
  assert.deepEqual(nudge({ x: 5, y: 9.9 }, 'ArrowUp', true, range), { x: 5, y: 10 });
  assert.deepEqual(nudge({ x: 5, y: 0.1 }, 'ArrowDown', true, range), { x: 5, y: 0 });
  assert.deepEqual(nudge({ x: 12, y: -3 }, 'ArrowLeft', false, range), { x: 10, y: 0 }); // a stray point is pulled back in
  assert.deepEqual(nudge({ x: -4, y: 2 }, 'ArrowRight', false, { minX: -5, minY: -5, span: 10 }), { x: -3.75, y: 2 });
  assert.equal(nudge(p, 'a', false, range), null);
  assert.equal(nudge(p, 'Tab', false, range), null);
});

test('Tab walks A then B and then leaves the plot; Space toggles', async () => {
  const { tabTarget, toggleSelection } = await import('./distance-playground.js');
  assert.equal(tabTarget('A', false), 'B');
  assert.equal(tabTarget('B', false), null);
  assert.equal(tabTarget('B', true), 'A');
  assert.equal(tabTarget('A', true), null);
  assert.equal(toggleSelection('A'), 'B');
  assert.equal(toggleSelection('B'), 'A');
});
