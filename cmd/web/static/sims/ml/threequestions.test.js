import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from './tabular.js';
import { makeBirds, separability, rankPairs } from './birds.js';
import {
  birdsDataset, penguinsDataset, usableRows, subsample, pearson, regressionFit, rankInputs, groupFits, trendReverses, trendOf,
  separabilityOn, rankPairsOn, majority, scoreBand, kmeans, silhouette, purity, clusterRows, rankClusterPairs, agreementBand,
} from './threequestions.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} is not within ${eps} of ${b}`);
const penguins = penguinsDataset(parseCsv(readFileSync(new URL('../../data/penguins.csv', import.meta.url), 'utf8')));

test('the generated dataset is the bird table, with the three species as a label', () => {
  const ds = birdsDataset(7);
  assert.equal(ds.rows.length, 120);
  assert.equal(ds.features.length, 4);
  assert.deepEqual(ds.labels.map(l => l.key), ['species']);
  assert.deepEqual(ds.labels[0].values, ['Skerry', 'Brine', 'Cobble']);
  assert.deepEqual(ds.rows.map(r => r.f), makeBirds(7).map(b => b.features));
  assert.equal(usableRows(ds.rows, 'species').dropped, 0);
});

test('the penguins table has 344 rows and the NA rows are dropped, counted and named by the columns used', () => {
  assert.equal(penguins.rows.length, 344);
  assert.equal(penguins.rows[0].id, 1);
  assert.deepEqual(penguins.labels.map(l => l.key), ['species', 'island', 'sex']);
  assert.deepEqual(penguins.labels[0].values, ['Adelie', 'Chinstrap', 'Gentoo']);
  // 2 rows have no measurements at all; 11 rows have no sex (those 2 and 9 more).
  const numbers = usableRows(penguins.rows);
  assert.equal(numbers.rows.length, 342);
  assert.equal(numbers.dropped, 2);
  const bySex = usableRows(penguins.rows, 'sex');
  assert.equal(bySex.rows.length, 333);
  assert.equal(bySex.dropped, 11);
  assert.equal(usableRows(penguins.rows, 'species').rows.length, 342);
  for (const r of numbers.rows) r.f.forEach(v => assert.ok(Number.isFinite(v)));
});

test('every penguin value sits inside the lab axis range', () => {
  for (const r of usableRows(penguins.rows).rows) r.f.forEach((v, j) => assert.ok(v >= penguins.features[j].lo && v <= penguins.features[j].hi, `feature ${j}: ${v}`));
});

test('subsample: sample 1 is all rows, later samples are a reproducible 2/3 that differ from each other', () => {
  const rows = usableRows(penguins.rows).rows;
  assert.equal(subsample(rows, 1), rows);
  const s2 = subsample(rows, 2), s3 = subsample(rows, 3);
  assert.equal(s2.length, 228);
  assert.deepEqual(s2, subsample(rows, 2));
  assert.notDeepEqual(s2.map(r => r.id), s3.map(r => r.id));
  assert.deepEqual(s2.map(r => r.id), [...s2.map(r => r.id)].sort((a, b) => a - b));
});

test('regressionFit on four hand-computed points', () => {
  // x 1..4, y 2 4 5 9: slope 11/5, intercept 5 - 2.2 * 2.5, residuals .3 .1 -1.1 .7
  const f = regressionFit([1, 2, 3, 4], [2, 4, 5, 9]);
  near(f.slope, 2.2); near(f.intercept, -0.5);
  near(f.r2, 1 - 1.8 / 26);
  near(f.mae, 0.55);
  near(f.baselineMae, 2);
  near(f.r, Math.sqrt(1 - 1.8 / 26));
  assert.equal(regressionFit([1, 2, 3], [5, 3, 1]).r, -1);
  assert.equal(pearson([1, 1, 1], [1, 2, 3]), 0);
});

test('rankInputs orders the other features by R^2 and leaves the target out', () => {
  const rows = [[1, 10, 5], [2, 20, 1], [3, 30, 4], [4, 40, 2]].map((f, i) => ({ id: i, f, l: {} }));
  const ranked = rankInputs(rows, 1);
  assert.deepEqual(ranked.map(r => r.a), [0, 2]);
  near(ranked[0].score, 1);
  assert.ok(ranked[1].score < 0.2);
});

test('on the penguins, bill depth falls with bill length overall but rises inside every species', () => {
  const rows = usableRows(penguins.rows).rows;
  const fit = regressionFit(rows.map(r => r.f[0]), rows.map(r => r.f[1]));
  assert.equal(trendOf(fit.r), 'down');
  near(fit.r, -0.235, 0.001);
  const groups = groupFits(rows, 0, 1, 'species');
  assert.deepEqual(groups.map(g => g.n).sort((a, b) => a - b), [68, 123, 151]);
  assert.ok(groups.every(g => g.slope > 0));
  assert.equal(trendReverses(fit.slope, groups), true);
  assert.equal(trendReverses(1, [{ slope: -1 }]), false);   // one group is not a comparison
});

test('trendOf: up, down or flat', () => {
  assert.equal(trendOf(0.5), 'up');
  assert.equal(trendOf(-0.5), 'down');
  assert.equal(trendOf(0.1), 'flat');
  assert.equal(trendOf(-0.149), 'flat');
});

test('the general separability and ranking give exactly the numbers of the bird lab', () => {
  const birds = makeBirds(7), rows = birdsDataset(7).rows;
  assert.equal(separabilityOn(rows, [0, 1], 'species'), separability(birds, [0, 1]));
  assert.equal(separabilityOn(rows, [2], 'species'), separability(birds, [2]));
  assert.deepEqual(rankPairsOn(rows, 4, 'species'), rankPairs(birds));
});

test('majority and the baseline bands', () => {
  assert.deepEqual(majority(['a', 'b', 'a', 'c']), { value: 'a', share: 0.5 });
  assert.deepEqual(majority([]), { value: null, share: 0 });
  near(majority(birdsDataset(7).rows.map(r => r.l.species)).share, 1 / 3);
  assert.equal(scoreBand(0.95, 0.33), 'good');
  assert.equal(scoreBand(0.4, 0.33), 'weak');
  assert.equal(scoreBand(0.7, 0.33), 'ok');
  assert.equal(scoreBand(0.75, 0.7), 'weak');   // 0.75 is not 0.1 above a 70% baseline
});

test('penguin classification: species is easy from two bill columns, island is not, and the baseline is 44%', () => {
  const rows = usableRows(penguins.rows, 'species').rows;
  assert.ok(separabilityOn(rows, [0, 1], 'species') > 0.95);
  near(majority(rows.map(r => r.l.species)).share, 151 / 342);
  const islands = usableRows(penguins.rows, 'island').rows;
  assert.ok(separabilityOn(islands, [0, 1], 'island') < 0.7);
});

test('kmeans separates two blobs, numbers the groups left to right, and is reproducible', () => {
  const pts = [[0, 0], [0.2, 0.1], [0.1, 0.3], [5, 5], [5.2, 4.9], [4.8, 5.1]];
  const a = kmeans(pts, 2), b = kmeans(pts, 2);
  assert.deepEqual(a, b);
  assert.deepEqual(a.assign, [0, 0, 0, 1, 1, 1]);
  near(a.centers[0][0], 0.1); near(a.centers[1][0], 5);
  assert.deepEqual(kmeans([...pts].reverse(), 2).assign, [1, 1, 1, 0, 0, 0]);
  assert.equal(kmeans(pts, 1).assign.every(g => g === 0), true);
  assert.equal(kmeans(pts.slice(0, 2), 5).centers.length, 2);   // never more groups than points
});

test('silhouette on two hand-computed groups', () => {
  // 0 and 1 in one group, 10 and 11 in the other: s(0) = 9.5/10.5, s(1) = 8.5/9.5, and the same on the right.
  const pts = [[0], [1], [10], [11]];
  near(silhouette(pts, [0, 0, 1, 1]), (9.5 / 10.5 + 8.5 / 9.5) / 2);
  assert.equal(silhouette(pts, [0, 0, 0, 0]), 0);
  assert.ok(silhouette(pts, [0, 1, 0, 1]) < 0);   // groups that cut across the blobs score below zero
});

test('purity counts the rows that sit with the main label of their group', () => {
  assert.equal(purity([0, 0, 0, 1, 1, 1], ['a', 'a', 'b', 'b', 'b', 'a']), 4 / 6);
  assert.equal(purity([0, 0, 1, 1], ['a', 'a', 'b', 'b']), 1);
  assert.equal(purity([], []), 0);
});

test('clustering the generated birds without labels still finds the species (bill length and depth)', () => {
  const rows = birdsDataset(7).rows;
  const c = clusterRows(rows, [0, 1], 3);
  assert.equal(c.assign.length, 120);
  assert.ok(c.purity > 0.9, `purity ${c.purity}`);
  assert.ok(c.silhouette > 0.5);
  assert.equal(c.centers.length, 3);
  assert.deepEqual(clusterRows(rows, [0, 1], 3), c);
  const ranked = rankClusterPairs(rows, 4, 3);
  assert.equal(ranked.length, 6);
  assert.deepEqual([ranked[0].a, ranked[0].b], [0, 1]);
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].silhouette >= ranked[i].silhouette);
});

test('agreementBand thresholds', () => {
  assert.equal(agreementBand(0.9), 'match');
  assert.equal(agreementBand(0.7), 'part');
  assert.equal(agreementBand(0.5), 'no');
});
