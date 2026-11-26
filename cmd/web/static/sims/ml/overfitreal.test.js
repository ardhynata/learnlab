import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from './tabular.js';
import { errorsByDegree, splitSample, MAX_DEGREE } from './overfitdemo.js';
import {
  REAL_FEATURES, completeRows, realScale, toPlot, yFromPlot, sampleReal, typicalMiss,
  PREDICT_BANDS, bandOf, bandKey,
} from './overfitreal.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);
const penguins = () => parseCsv(readFileSync(new URL('../../data/penguins.csv', import.meta.url), 'utf8'));

test('completeRows drops rows missing either column and counts them', () => {
  const table = { rows: [{ a: 1, b: 2 }, { a: null, b: 3 }, { a: 4, b: null }, { a: 5, b: 6 }] };
  const { rows, total, dropped } = completeRows(table, 'a', 'b');
  assert.deepEqual(rows, [{ x: 1, y: 2 }, { x: 5, y: 6 }]);
  assert.equal(total, 4);
  assert.equal(dropped, 2);
});

test('penguins: 344 rows, 2 have no measurements, so 342 are complete for flipper or bill vs mass', () => {
  const t = penguins();
  for (const col of Object.values(REAL_FEATURES)) {
    const c = completeRows(t, col);
    assert.equal(c.total, 344);
    assert.equal(c.rows.length, 342);
    assert.equal(c.dropped, 2);
  }
  const s = realScale(completeRows(t, REAL_FEATURES.flipper).rows);
  assert.deepEqual(s, { xMin: 172, xMax: 231, yMin: 2700, yMax: 6300 });
});

test('toPlot maps the table range onto 0..10 and yFromPlot undoes it (hand-computed)', () => {
  const s = { xMin: 172, xMax: 231, yMin: 2700, yMax: 6300 };
  assert.deepEqual(toPlot({ x: 172, y: 2700 }, s), { x: 0, y: 0 });
  assert.deepEqual(toPlot({ x: 231, y: 6300 }, s), { x: 10, y: 10 });
  close(toPlot({ x: 201.5, y: 4500 }, s).x, 5);
  close(toPlot({ x: 201.5, y: 4500 }, s).y, 5);
  close(yFromPlot(5, s), 4500);
  close(yFromPlot(toPlot({ x: 190, y: 3750 }, s).y, s), 3750);
  assert.deepEqual(toPlot({ x: 7, y: 7 }, { xMin: 7, xMax: 7, yMin: 7, yMax: 7 }), { x: 5, y: 5 });
});

test('typicalMiss: a plot-unit MSE of 0.25 on a 3600 g range is 0.5 * 360 = 180 g', () => {
  close(typicalMiss(0.25, { yMin: 2700, yMax: 6300 }), 180);
  assert.equal(typicalMiss(Infinity, { yMin: 0, yMax: 10 }), Infinity);
});

test('sampleReal is reproducible, sorted by x, inside 0..10 and has no repeated penguin', () => {
  const { rows } = completeRows(penguins(), REAL_FEATURES.flipper);
  const s = realScale(rows);
  const a = sampleReal(rows, s, 4, 30), b = sampleReal(rows, s, 4, 30), c = sampleReal(rows, s, 5, 30);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(a.length, 30);
  for (let i = 1; i < a.length; i++) assert.ok(a[i].x >= a[i - 1].x);
  for (const p of a) assert.ok(p.x >= 0 && p.x <= 10 && p.y >= 0 && p.y <= 10);
  assert.equal(sampleReal(rows.slice(0, 5), s, 1, 30).length, 5, 'never more than the table has');
});

test('real data end to end: training error falls with degree, flexible fits do worse than the best on held-out penguins', () => {
  const { rows } = completeRows(penguins(), REAL_FEATURES.flipper);
  const s = realScale(rows);
  let flexibleWorse = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const { train, validation } = splitSample(sampleReal(rows, s, seed, 30), 14, seed);
    const e = errorsByDegree(train, validation);
    for (let i = 1; i < MAX_DEGREE; i++) assert.ok(e.train[i] <= e.train[i - 1] + 1e-3, `seed ${seed} degree ${i + 1}`);
    if (e.validation[MAX_DEGREE - 1] > 2 * e.validation[e.best - 1]) flexibleWorse++;
  }
  assert.ok(flexibleWorse >= 5, `degree 12 overfits on most real samples (${flexibleWorse}/6)`);
});

test('the answer bands cover degrees 1..12 exactly once, and bandOf picks the band holding a degree', () => {
  const covered = PREDICT_BANDS.flatMap(([lo, hi]) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i));
  assert.deepEqual(covered, Array.from({ length: MAX_DEGREE }, (_, i) => i + 1));
  assert.equal(bandOf(1), '1-2');
  assert.equal(bandOf(3), '3-4');
  assert.equal(bandOf(6), '5-6');
  assert.equal(bandOf(9), '7-9');
  assert.equal(bandOf(12), '10-12');
  assert.equal(bandKey([3, 4]), '3-4');
});
