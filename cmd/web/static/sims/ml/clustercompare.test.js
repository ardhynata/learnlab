import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from './tabular.js';
import { makeClusterData } from './clusterdata.js';
import {
  penguinCloud, penguinPoints, sampleOrder, toPlotUnits, fromPlotUnits, defaultParams, alignLabels,
  runComparison, hierarchy, bestMatch, silhouetteVerdict, separated, cutHeight, RINGS_EPS, PLOT_LO, PLOT_HI,
} from './clustercompare.js';
import { agglomerative, dbscan, adjustedRand } from './clustermethods.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

const CSV = `species,island,bill_length_mm,flipper_length_mm
Adelie,A,39,180
Adelie,A,NA,NA
Gentoo,B,47,220
Chinstrap,C,50,200
Gentoo,B,48,NA`;

test('penguinCloud drops rows with a missing measurement and counts them', () => {
  const c = penguinCloud(parseCsv(CSV), 'bill_length_mm', 'flipper_length_mm');
  assert.deepEqual(c.x, [39, 47, 50]);
  assert.deepEqual(c.y, [180, 220, 200]);
  assert.deepEqual(c.truth, [0, 2, 1]);
  assert.equal(c.total, 5);
  assert.equal(c.dropped, 2);
  assert.deepEqual(c.extent, { xLo: 39, xHi: 50, yLo: 180, yHi: 220 });
});

test('plot units: the low end sits at 0.5, the high end at 9.5, the middle at 5, and it inverts', () => {
  close(toPlotUnits(180, 180, 220), PLOT_LO);
  close(toPlotUnits(220, 180, 220), PLOT_HI);
  close(toPlotUnits(200, 180, 220), 5);
  close(fromPlotUnits(toPlotUnits(207, 180, 220), 180, 220), 207);
  close(toPlotUnits(7, 7, 7), 5);   // a constant column does not divide by zero
});

test('penguinPoints scales into the square and growing n only adds points', () => {
  const c = penguinCloud(parseCsv(CSV), 'bill_length_mm', 'flipper_length_mm');
  const order = sampleOrder(c.x.length, 3);
  const two = penguinPoints(c, order, 2), three = penguinPoints(c, order, 3), many = penguinPoints(c, order, 99);
  assert.equal(two.points.length, 2);
  assert.deepEqual(three.points.slice(0, 2), two.points);
  assert.equal(many.points.length, 3);
  for (const p of many.points) for (const v of p) assert.ok(v >= PLOT_LO && v <= PLOT_HI);
  assert.deepEqual(sampleOrder(10, 3), sampleOrder(10, 3));
  assert.deepEqual([...sampleOrder(10, 3)].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('defaultParams starts k at the true group count; penguins get a smaller eps', () => {
  assert.deepEqual(defaultParams('generated', 2), { k: 2, hk: 2, eps: 0.8, minPts: 5, linkage: 'ward' });
  assert.equal(defaultParams('penguins', 3).eps, 0.5);
  assert.equal(defaultParams('penguins', 3).k, 3);
  assert.equal(defaultParams('generated', 2, 'rings').eps, 1.1);       // thin rings fragment at 0.8 on many seeds
  assert.equal(defaultParams('generated', 2, 'moons').eps, 0.8);
  assert.equal(defaultParams('penguins', 3, 'rings').eps, 0.5);
});

test('alignLabels gives each cluster the id of the true group it overlaps most', () => {
  // clusters 5 and 9 are the true groups 1 and 0, renamed; cluster 7 is a stray that gets the next free id.
  const truth = [0, 0, 0, 1, 1, 1, 1, 0];
  const labels = [9, 9, 9, 5, 5, 5, 7, 9];
  assert.deepEqual(alignLabels(labels, truth), [0, 0, 0, 1, 1, 1, 2, 0]);
  // noise stays noise; no truth leaves the labels alone
  assert.deepEqual(alignLabels([-1, 2, 2], [0, 1, 1]), [-1, 1, 1]);
  assert.deepEqual(alignLabels([3, 1, 1], null), [3, 1, 1]);
});

test('cutHeight sits between the last merge kept and the next one', () => {
  // four points on a line at 0, 1, 5, 6: merges at 1, 1, then 4 (average of 5,4,6,5 is 5 -> use single: gap 4)
  const merges = agglomerative([[0, 0], [1, 0], [5, 0], [6, 0]], { linkage: 'single' });
  assert.deepEqual(merges.map(m => m.height), [1, 1, 4]);
  close(cutHeight(merges, 4, 2), 2.5);    // keeps the two height-1 merges, drops the 4: halfway is 2.5
  close(cutHeight(merges, 4, 3), 1);      // keeps one merge (height 1), next is also 1
  close(cutHeight(merges, 4, 4), 0.5);    // keeps none: between 0 and the first merge at 1
  close(cutHeight(merges, 4, 1), (4 + 4 * 1.05) / 2);   // everything merged: a little above the top
});

test('runComparison on three blobs: every method recovers the truth', () => {
  const { points, truth } = makeClusterData('blobs', { n: 150, seed: 7 });
  const r = runComparison(points, truth, { k: 3, hk: 3, eps: 0.9, minPts: 5, linkage: 'ward' }, { seed: 7 });
  for (const key of ['kmeans', 'dbscan', 'hier']) {
    close(r[key].ari, 1, 1e-9);
    assert.equal(r[key].clusters, 3);
    assert.equal(r[key].noise, 0);
    assert.ok(r[key].silhouette > 0.7);
    assert.equal(r[key].labels.length, 150);
  }
  // labels are aligned with the truth ids, so the same group has the same colour in each panel
  assert.deepEqual(r.kmeans.labels, truth);
  assert.deepEqual(r.hier.labels, truth);
  assert.equal(bestMatch(r).tie, true);
  assert.equal(bestMatch(r).none, false);
});

test('rings: DBSCAN and single linkage separate them, k-means and ward cannot, and silhouette prefers the wrong cut', () => {
  const { points, truth } = makeClusterData('rings', { n: 150, seed: 7 });
  const ward = runComparison(points, truth, { k: 2, hk: 2, eps: 0.8, minPts: 5, linkage: 'ward' }, { seed: 7 });
  assert.ok(ward.kmeans.ari < 0.1);
  assert.ok(ward.hier.ari < 0.1);
  assert.ok(ward.dbscan.ari > 0.95);
  assert.deepEqual(separated(ward), ['dbscan']);
  assert.deepEqual(bestMatch(ward).keys, ['dbscan']);
  const v = silhouetteVerdict(ward);
  assert.notEqual(v.topKey, 'dbscan');      // silhouette likes the round wrong cut better
  assert.equal(v.misleads, true);
  const single = runComparison(points, truth, { k: 2, hk: 2, eps: 0.8, minPts: 5, linkage: 'single' }, { seed: 7, merges: hierarchy(points, 'single') });
  assert.deepEqual(separated(single), ['dbscan', 'hier']);
});

test('bestMatch: ties within 0.02, none below 0.3, and no truth means no verdict', () => {
  const mk = (a, b, c) => ({ kmeans: { ari: a, silhouette: 0.5 }, dbscan: { ari: b, silhouette: 0.4 }, hier: { ari: c, silhouette: 0.3 } });
  assert.deepEqual(bestMatch(mk(0.5, 0.9, 0.89)), { keys: ['dbscan', 'hier'], ari: 0.9, tie: true, none: false });
  assert.deepEqual(bestMatch(mk(0.1, 0.2, 0.05)).keys, ['dbscan']);
  assert.equal(bestMatch(mk(0.1, 0.2, 0.05)).none, true);
  assert.deepEqual(bestMatch(mk(NaN, NaN, NaN)), { keys: [], ari: NaN, tie: false, none: true });
  // silhouette winner here is kmeans (0.5) with ari 0.5, but dbscan reached 0.9
  const v = silhouetteVerdict(mk(0.5, 0.9, 0.89));
  assert.equal(v.topKey, 'kmeans'); assert.equal(v.misleads, true);
  close(v.spread, 0.2);
  assert.equal(silhouetteVerdict(mk(0.95, 0.9, 0.5)).misleads, false);   // within tolerance? 0.95 is the best: no disagreement
});

test('noise points in the truth count as a group, so labelling them noise helps', () => {
  const { points, truth } = makeClusterData('density', { n: 150, seed: 7 });
  assert.ok(truth.includes(-1));
  const r = runComparison(points, truth, { k: 2, hk: 2, eps: 0.8, minPts: 5, linkage: 'ward' }, { seed: 7 });
  assert.ok(r.dbscan.noise > 0);
  assert.equal(r.kmeans.noise, 0);
  assert.ok(r.dbscan.ari > r.kmeans.ari);
});

test('k-means centroids carry the aligned id of their cluster', () => {
  const { points, truth } = makeClusterData('blobs', { n: 150, seed: 7 });
  const r = runComparison(points, truth, { k: 3, hk: 3, eps: 0.9, minPts: 5, linkage: 'ward' }, { seed: 7 });
  assert.equal(r.kmeans.centroidIds.length, 3);
  assert.deepEqual([...r.kmeans.centroidIds].sort(), [0, 1, 2]);
  // each centroid sits at the mean of the true group whose id it carries
  r.kmeans.centroidIds.forEach((id, c) => {
    const members = points.filter((_, i) => truth[i] === id);
    close(r.kmeans.centroids[c][0], members.reduce((s, p) => s + p[0], 0) / members.length, 1e-9);
  });
});

test('the rings default eps separates the rings on most samples where 0.8 fragments them', () => {
  let wide = 0, narrow = 0;
  for (let seed = 7; seed < 37; seed++) {
    const { points, truth } = makeClusterData('rings', { n: 150, seed });
    const ari = eps => adjustedRand(dbscan(points, { eps, minPts: 5 }).labels, truth);
    if (ari(RINGS_EPS) >= 0.9) wide++;
    if (ari(0.8) >= 0.9) narrow++;
  }
  assert.ok(wide >= 20, `eps ${RINGS_EPS} separated ${wide} of 30`);
  assert.ok(wide > narrow + 10, `eps ${RINGS_EPS}: ${wide}, eps 0.8: ${narrow}`);
});
