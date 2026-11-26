import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCsv } from './tabular.js';
import {
  penguinTask, meanAbsCorrelation, sharedCount, firstColumns, stackDots, accuracyAxis, accuracyTicks,
  leakageOutcome, preprocessingOutcome, mean,
} from './leakagelab.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('penguinTask keeps NA features as missing, counts them, and the label is "Adelie"', () => {
  const table = parseCsv([
    'species,island,bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,sex,year',
    'Adelie,Torgersen,39.1,18.7,181,3750,male,2007',
    'Gentoo,Biscoe,NA,NA,NA,NA,NA,2007',
    'Chinstrap,Dream,46.5,17.9,192,3500,female,2007',
    'Adelie,Dream,40,NA,190,3600,male,2008',
  ].join('\n'));
  const t = penguinTask(table);
  assert.equal(t.total, 4);
  assert.deepEqual(t.y, [1, 0, 0, 1]);
  assert.equal(t.positives, 2);
  assert.equal(t.naRows, 2);
  assert.equal(t.naCells, 5);
  assert.deepEqual(t.X[1], [null, null, null, null]);
  assert.equal(t.X[0][3], 3750);
});

test('the bundled penguins: 344 rows, 152 Adelie, 2 penguins with no measurements', () => {
  const table = parseCsv(fs.readFileSync(new URL('../../data/penguins.csv', import.meta.url), 'utf8'));
  const t = penguinTask(table);
  assert.equal(t.X.length, 344);
  assert.equal(t.positives, 152);
  assert.equal(t.naRows, 2);
  assert.equal(t.naCells, 8);
});

test('meanAbsCorrelation averages |r| of the chosen columns (hand-computed)', () => {
  // y = [0,0,1,1]; f0 = [1,2,3,4] r = 0.8944; f3 = [5,4,1,0] r = -0.9701 (same table as leakage.test.js)
  const X = [[1, 1, 0, 5], [2, 2, 1, 4], [3, 1, 1, 1], [4, 2, 1, 0]], y = [0, 0, 1, 1];
  close(meanAbsCorrelation(X, y, [0, 3]), (2 / Math.sqrt(5) + 4 / Math.sqrt(17)) / 2);
  close(meanAbsCorrelation(X, y, [1]), 0);
  assert.equal(meanAbsCorrelation(X, y, []), 0);
});

test('sharedCount and firstColumns', () => {
  assert.equal(sharedCount([1, 2, 3, 4], [4, 3, 9]), 2);
  assert.equal(sharedCount([], [1]), 0);
  assert.deepEqual(firstColumns([5, 6, 7, 8], 3), { shown: [5, 6, 7], more: 1 });
  assert.deepEqual(firstColumns([5, 6], 3), { shown: [5, 6], more: 0 });
});

test('stackDots snaps to slots and stacks repeats in input order', () => {
  const d = stackDots([10, 11, 30, 10.4, 29], 8);
  assert.deepEqual(d.map(p => p.x), [8, 8, 32, 8, 32]);
  assert.deepEqual(d.map(p => p.level), [0, 1, 0, 2, 1]);
});

test('accuracyAxis: whole range for the random experiment, zoomed (in 5-point steps) for real data', () => {
  assert.deepEqual(accuracyAxis([0.4, 0.9]), { lo: 0, hi: 1 });
  assert.deepEqual(accuracyAxis([0.965, 0.98, 0.99], { zoom: true }), { lo: 0.9, hi: 1 });
  assert.deepEqual(accuracyAxis([0.7, 0.99], { zoom: true }), { lo: 0.65, hi: 1 });
  assert.deepEqual(accuracyAxis([0.4], { zoom: true }), { lo: 0.35, hi: 1 });
});

test('accuracyTicks keeps ticks apart and inside the axis', () => {
  assert.deepEqual(accuracyTicks(0, 1, 500), [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
  assert.deepEqual(accuracyTicks(0, 1, 200), [0, 0.25, 0.5, 0.75, 1]);
  assert.deepEqual(accuracyTicks(0.9, 1, 300), [0.9, 0.92, 0.94, 0.96, 0.98, 1]);
});

test('leakageOutcome and preprocessingOutcome name what the 50 splits showed', () => {
  assert.equal(leakageOutcome(0.48, 0.78), 'leak-only');
  assert.equal(leakageOutcome(0.5, 0.52), 'neither');
  assert.equal(leakageOutcome(0.7, 0.9), 'both-high');
  assert.equal(leakageOutcome(0.7, 0.5), 'honest-only');
  assert.equal(preprocessingOutcome(0.9725, 0.9721), 'tiny');
  assert.equal(preprocessingOutcome(0.95, 0.9), 'leak-ahead');
  assert.equal(preprocessingOutcome(0.9, 0.95), 'correct-ahead');
  close(mean([1, 2, 3, 6]), 3);
});
