import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_TREES, DEFAULTS, generatedData, penguinPair, splitData, fitBagging, fitBoosting, curvesOf, metricCurves,
  bestTrees, risesAgain, overfitAnswer, regionGrid, featuresPerSplit,
} from './ensemblelab.js';
import { parseCsv } from './tabular.js';

test('generated data is reproducible, inside the 0..10 square and balanced', () => {
  const a = generatedData('moons', 3, 0.4), b = generatedData('moons', 3, 0.4), c = generatedData('moons', 4, 0.4);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(a.X.length, 200);
  assert.equal(a.y.filter(v => v === 1).length, 100);
  for (const [x, y] of a.X) assert.ok(x >= 0 && x <= 10 && y >= 0 && y <= 10);
});

test('the checkerboard follows its cells at noise 0 and flips about 35% of the labels at noise 1', () => {
  const clean = generatedData('checker', 5, 0);
  clean.X.forEach(([x, y], i) => assert.equal(clean.y[i], (Math.floor(x / 5) + Math.floor(y / 5)) % 2));
  const noisy = generatedData('checker', 5, 1, 2000);
  const wrong = noisy.X.filter(([x, y], i) => noisy.y[i] !== (Math.floor(x / 5) + Math.floor(y / 5)) % 2).length;
  assert.ok(wrong / 2000 > 0.3 && wrong / 2000 < 0.4, `flipped share ${wrong / 2000}`);
});

test('penguinPair keeps the two species with all four measurements, counts the NA rows, and scales to 0..10', () => {
  const table = parseCsv([
    'species,island,bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,sex,year',
    'Adelie,Torgersen,40,18,190,3600,male,2007',
    'Adelie,Torgersen,NA,NA,NA,NA,NA,2007',
    'Chinstrap,Dream,50,20,200,3800,male,2007',
    'Chinstrap,Dream,45,19,195,3700,female,2007',
    'Gentoo,Biscoe,46,13,211,4500,female,2007',
  ].join('\n'));
  const p = penguinPair(table, 'bill_length_mm', 'bill_depth_mm');
  assert.equal(p.total, 5);
  assert.equal(p.inPair, 4);
  assert.equal(p.dropped, 1);
  assert.deepEqual(p.counts, [1, 2]);
  assert.deepEqual(p.y, [0, 1, 1]);
  // bill length 40, 50, 45 -> 0, 10, 5; bill depth 18, 20, 19 -> 0, 10, 5
  assert.deepEqual(p.X, [[0, 0], [10, 10], [5, 5]]);
});

test('splitData holds back half of the rows, disjoint from the training half, with both classes in each', () => {
  const d = generatedData('moons', 2, 0.3);
  const { train, validation } = splitData(d, 2);
  assert.equal(train.y.length, 100);
  assert.equal(validation.y.length, 100);
  assert.equal(train.y.filter(v => v === 1).length, 50);
  const key = r => r.join(',');
  const seen = new Set(train.X.map(key));
  for (const r of validation.X) assert.ok(!seen.has(key(r)));
});

test('bestTrees takes the first lowest value among the trees shown', () => {
  assert.deepEqual(bestTrees([0.9, 0.5, 0.4, 0.6]), { best: 3, value: 0.4 });
  assert.deepEqual(bestTrees([0.9, 0.5, 0.4, 0.6], 2), { best: 2, value: 0.5 });
  assert.deepEqual(bestTrees([0.5, 0.4, 0.4]), { best: 2, value: 0.4 });
});

test('risesAgain and overfitAnswer: a curve that climbs back more than 0.02 overfits', () => {
  assert.equal(risesAgain([0.9, 0.4, 0.5]).rises, true);
  assert.equal(risesAgain([0.9, 0.5, 0.49]).rises, false);
  assert.equal(risesAgain([0.9, 0.4, 0.41]).rises, false);
  const up = [0.9, 0.4, 0.8], down = [0.9, 0.5, 0.45];
  assert.equal(overfitAnswer(down, up), 'boost');
  assert.equal(overfitAnswer(up, down), 'bag');
  assert.equal(overfitAnswer(up, up), 'both');
  assert.equal(overfitAnswer(down, down), 'neither');
});

test('featuresPerSplit rounds the share of the features and never goes below one', () => {
  assert.equal(featuresPerSplit(0.1), 1);
  assert.equal(featuresPerSplit(0.5), 1);
  assert.equal(featuresPerSplit(0.75), 2);
  assert.equal(featuresPerSplit(0.5, 4), 2);
});

test('regionGrid lists cell centres from the bottom row up and follows the model', () => {
  const X = [], y = [];
  for (let i = 0; i < 20; i++) { X.push([i % 10 + 0.5, (i * 3) % 10 + 0.5]); y.push(i % 10 >= 5 ? 1 : 0); }
  const model = fitBagging({ X, y }, { forest: false, fraction: 1, seed: 1, trees: 5, maxDepth: 3, minLeaf: 1 });
  const g = 10, probs = regionGrid(model, 5, g);
  assert.equal(probs.length, g * g);
  assert.ok(probs[0 * g + 1] < 0.5, 'bottom row, left cell is class 0');
  assert.ok(probs[0 * g + 8] > 0.5, 'bottom row, right cell is class 1');
  assert.deepEqual(probs[7 * g + 2], model.predictProba([2.5, 7.5], 5));
});

test('on the default data boosting overfits and bagging levels off; the chart curves have one value per tree', () => {
  const data = generatedData(DEFAULTS.kind, DEFAULTS.seed, DEFAULTS.noise);
  const { train, validation } = splitData(data, DEFAULTS.seed);
  const bag = curvesOf(fitBagging(train, { forest: false, fraction: 0.5, seed: DEFAULTS.seed }), train, validation);
  const boost = curvesOf(fitBoosting(train, { rate: DEFAULTS.rate, depth: DEFAULTS.depth, seed: DEFAULTS.seed }), train, validation);
  assert.equal(bag.validationLoss.length, MAX_TREES);
  assert.equal(metricCurves(boost, 'error').validation.length, MAX_TREES);
  assert.equal(overfitAnswer(bag.validationLoss, boost.validationLoss), 'boost');
  assert.ok(bestTrees(boost.validationLoss).best < 25);
  assert.ok(boost.trainLoss[MAX_TREES - 1] < boost.trainLoss[0]);
});
