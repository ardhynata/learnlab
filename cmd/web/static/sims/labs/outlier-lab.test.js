import test from 'node:test';
import assert from 'node:assert/strict';
import { generatedCloud, penguinCloud, sampleOrder, MAX_OUTLIERS } from './outlier-lab.js';
import { parseCsv } from '../ml/tabular.js';
import { summarize } from '../ml/stats.js';

test('the generated cloud is reproducible, inside the plot square, and clearly correlated', () => {
  const a = generatedCloud(4), b = generatedCloud(4), c = generatedCloud(5);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(a.length, 200);
  for (const p of a) assert.ok(p.x >= 0.5 && p.x <= 9.5 && p.y >= 0.5 && p.y <= 9.5);
  assert.ok(summarize(a.slice(0, 15)).r > 0.8, 'the default 15 points show a clear upward trend');
});

test('penguinCloud drops rows with a missing measurement, converts grams to kilograms and counts what it dropped', () => {
  const table = parseCsv([
    'species,island,bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,sex,year',
    'Adelie,Torgersen,39.1,18.7,181,3750,male,2007',
    'Adelie,Torgersen,NA,NA,NA,NA,NA,2007',
    'Gentoo,Biscoe,46.1,13.2,211,4500,female,2007',
    'Gentoo,Biscoe,45,14,NA,4400,female,2007',
  ].join('\n'));
  const { points, total, dropped } = penguinCloud(table);
  assert.equal(total, 4);
  assert.equal(dropped, 2);
  assert.deepEqual(points, [{ x: 181, y: 3.75 }, { x: 211, y: 4.5 }]);
});

test('sampleOrder is a permutation, reproducible per seed, so a larger n only adds points', () => {
  const o = sampleOrder(30, 3);
  assert.deepEqual([...o].sort((x, y) => x - y), Array.from({ length: 30 }, (_, i) => i));
  assert.deepEqual(o, sampleOrder(30, 3));
  assert.notDeepEqual(o, sampleOrder(30, 4));
  assert.equal(MAX_OUTLIERS, 3);
});
