import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_K, GENERATED_COUNT, CLASS_COLORS, generatedPoints, verdictOf } from './kmeans-reveal.js';
import { runKMeans, compareWithClasses, elbowCurve, penguinPoints } from '../ml/kmeansreveal.js';
import { parseCsv } from '../ml/tabular.js';
import { readFileSync } from 'node:fs';

const penguins = () => penguinPoints(parseCsv(readFileSync(new URL('../../data/penguins.csv', import.meta.url), 'utf8')));

test('the generated view is the shared 48 points with only x, y and the hidden class, reproducible per dataset', () => {
  const a = generatedPoints('clusters'), b = generatedPoints('clusters');
  assert.equal(a.length, GENERATED_COUNT);
  assert.deepEqual(a, b);
  assert.deepEqual(Object.keys(a[0]).sort(), ['label', 'x', 'y']);
  assert.notDeepEqual(generatedPoints('rings'), a);
});

test('the lab walks k-means to its end on the generated data and the crosstab adds up to every point', () => {
  const pts = generatedPoints('clusters');
  const run = runKMeans(pts, { k: DEFAULT_K.generated, init: 'kmeans++', seed: 1 });
  const last = run.steps[run.steps.length - 1];
  assert.equal(run.k, 2);
  assert.equal(last.labels.length, pts.length);
  const s = compareWithClasses(last.labels, pts.map(p => p.label));
  assert.equal(s.table.n, GENERATED_COUNT);
  assert.equal(s.table.rowTotals.reduce((x, y) => x + y, 0), GENERATED_COUNT);
  assert.equal(s.table.colTotals.reduce((x, y) => x + y, 0), GENERATED_COUNT);
  assert.equal(elbowCurve(pts).length, 8, 'the elbow chart has a point for each k');
});

test('on the real penguins the default k = 3 with standardizing matches the three species well, and k = 1 never claims a match', () => {
  const { points, total, dropped } = penguins();
  assert.equal(total, 344);
  assert.equal(points.length, total - dropped);
  const run = runKMeans(points, { k: DEFAULT_K.penguins, standardize: true, seed: 1 });
  const s = compareWithClasses(run.steps.at(-1).labels, points.map(p => p.label));
  assert.equal(s.level, 'good');
  assert.equal(s.table.rows.length, 3);
  assert.equal(s.table.cols.length, 3);
  const one = runKMeans(points, { k: 1, standardize: true, seed: 1 });
  assert.match(verdictOf(compareWithClasses(one.steps.at(-1).labels, points.map(p => p.label)), 1), /one cluster/i);
});

test('verdictOf reads the level for two or more clusters and is empty when there is no level', () => {
  assert.match(verdictOf({ level: 'good' }, 2), /match the classes well/);
  assert.match(verdictOf({ level: 'partly' }, 3), /only partly/);
  assert.match(verdictOf({ level: 'poor' }, 3), /cut across/);
  assert.equal(verdictOf({ level: 'none' }, 2), '');
});

test('the outline palette indices differ from each other and from the fills of the first three clusters', () => {
  assert.equal(new Set(CLASS_COLORS).size, CLASS_COLORS.length);
  assert.equal(CLASS_COLORS.length, 3);
  for (const c of CLASS_COLORS) assert.ok(c > 2, `palette index ${c} is also used as a cluster fill`);
});
