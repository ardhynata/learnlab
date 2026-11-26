import test from 'node:test';
import assert from 'node:assert/strict';
import { colorsToggleText, headroomUnits, placeOnAxis, TITLE_HEADROOM_PX } from './feature-explorer.js';

test('the color toggle reads "Color by <label>" for every label, species included', () => {
  assert.deepEqual(colorsToggleText('sex'), ['Color by sex', 'Warnai per sex']);
  assert.equal(colorsToggleText('species')[0], 'Color by species');
  assert.ok(!colorsToggleText('island')[0].includes('Show'));
});

test('placeOnAxis maps lo to 0 and hi to the top of the free range, so a headroom leaves a band for the title', () => {
  const f = { lo: 30, hi: 60 };
  assert.equal(placeOnAxis(30, f), 0);
  assert.equal(placeOnAxis(60, f), 10);
  assert.equal(placeOnAxis(45, f), 5);
  assert.equal(placeOnAxis(60, f, 1.5), 8.5);
  assert.equal(placeOnAxis(30, f, 1.5), 0);
});

test('headroomUnits keeps a fixed pixel band above the data, capped so a tiny plot still shows its data', () => {
  assert.ok(Math.abs(headroomUnits(280) * 280 / 10 - TITLE_HEADROOM_PX) < 1e-9);
  assert.ok(headroomUnits(560) < headroomUnits(280), 'a bigger plot needs fewer plot units for the same pixels');
  assert.equal(headroomUnits(0), 0);
  assert.equal(headroomUnits(10), 2, 'capped at 2 units');
});
