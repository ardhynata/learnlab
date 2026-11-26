import test from 'node:test';
import assert from 'node:assert/strict';
import { missClause, MISS_CAP_GRAMS } from './overfittext.js';

const fmt = n => String(Math.round(n));

test('a normal miss reads "about N g" in both languages', () => {
  assert.deepEqual(missClause(412.4, fmt), { en: 'is typically off by about 412 g', id: 'rata-rata meleset sekitar 412 g' });
});

test('a miss exactly at the cap still counts as normal', () => {
  assert.equal(missClause(MISS_CAP_GRAMS, fmt).en, 'is typically off by about 10000 g');
});

test('a miss above the cap says "more than", never "about over"', () => {
  const c = missClause(25000, fmt);
  assert.deepEqual(c, { en: 'is typically off by more than 10000 g', id: 'rata-rata meleset lebih dari 10000 g' });
  assert.ok(!/about/.test(c.en) && !/sekitar/.test(c.id));
});

test('a non-finite miss (a degenerate fit) is treated as above the cap', () => {
  for (const bad of [Infinity, NaN]) assert.equal(missClause(bad, fmt).en, 'is typically off by more than 10000 g');
});
