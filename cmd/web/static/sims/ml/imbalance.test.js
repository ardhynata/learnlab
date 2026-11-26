import test from 'node:test';
import assert from 'node:assert/strict';
import {
  positiveCount, generatedData, majorityClass, scorePredictions, classWeight, repeatPositives, fitModel, evaluate,
  decisionLine, halfPlanePolygon, lineInSquare, rescaleLine, verdictKind, trendKey, penguinTable, subsampleToFraction, stratifiedSplit, takeRows,
} from './imbalance.js';
import { gradientStep, predictProba } from './logistic.js';
import { parseCsv } from './tabular.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const area = poly => Math.abs(poly.reduce((s, p, i) => { const q = poly[(i + 1) % poly.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

test('positiveCount rounds, and keeps both classes present', () => {
  assert.equal(positiveCount(1000, 0.05), 50);
  assert.equal(positiveCount(1000, 0.01), 10);
  assert.equal(positiveCount(100, 0.001), 1);
  assert.equal(positiveCount(100, 0.999), 99);
});

test('generated data has the exact share of positives, is reproducible, and stays in the square', () => {
  const a = generatedData({ n: 1000, fraction: 0.05, seed: 3 }), b = generatedData({ n: 1000, fraction: 0.05, seed: 3 });
  assert.deepEqual(a, b);
  assert.equal(a.X.length, 1000);
  assert.equal(a.y.filter(v => v === 1).length, 50);
  assert.ok(a.X.every(r => r.every(v => v >= 0.2 && v <= 9.8)));
  const c = generatedData({ n: 1000, fraction: 0.05, seed: 4 });
  assert.notDeepEqual(a.X, c.X);
});

test('raising the share keeps the positives it already had', () => {
  const few = generatedData({ n: 1000, fraction: 0.02, seed: 5 }), more = generatedData({ n: 1000, fraction: 0.2, seed: 5 });
  const positives = d => d.X.filter((_, i) => d.y[i] === 1);
  assert.deepEqual(positives(more).slice(0, 20), positives(few));
});

test('majority class, with ties going to the negative class', () => {
  assert.equal(majorityClass([0, 0, 1]), 0);
  assert.equal(majorityClass([1, 1, 0]), 1);
  assert.equal(majorityClass([1, 0]), 0);
});

// Hand count: 2 positives and 8 negatives. The baseline answers 0 every time: it gets the 8 negatives right.
// accuracy 8/10 = 0.8, recall 0/2 = 0, nothing predicted positive so precision is 0/0 (undefined), F1 = 2*0/(2*0+0+2) = 0.
// A model that finds one positive and raises one false alarm: tp 1, fp 1, fn 1, tn 7.
// accuracy (1+7)/10 = 0.8, precision 1/2, recall 1/2, F1 = 2*1/(2*1+1+1) = 0.5.
test('scores recomputed by hand: the baseline looks fine on accuracy and finds nothing', () => {
  const y = [1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
  const base = scorePredictions(y, y.map(() => 0));
  assert.deepEqual([base.tp, base.fp, base.tn, base.fn], [0, 0, 8, 2]);
  close(base.accuracy, 0.8); close(base.recall, 0); close(base.f1, 0);
  assert.equal(base.undefined.precision, true);
  const model = scorePredictions(y, [1, 0, 1, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual([model.tp, model.fp, model.tn, model.fn], [1, 1, 7, 1]);
  close(model.accuracy, 0.8); close(model.precision, 0.5); close(model.recall, 0.5); close(model.f1, 0.5);
  assert.equal(model.undefined.precision, false);
  assert.throws(() => scorePredictions([1, 0], [1]), /labels but/);
});

test('on held-out data with the same share, the baseline accuracy is exactly 1 minus the share', () => {
  const train = generatedData({ n: 1000, fraction: 0.05, seed: 3 }), test = generatedData({ n: 1000, fraction: 0.05, seed: 3 + 7919 });
  const r = evaluate(train, test);
  assert.equal(r.majority, 0);
  assert.equal(r.baseline.accuracy, 0.95);
  assert.equal(r.baseline.recall, 0);
  assert.equal(r.test.positives, 50);
  assert.equal(r.test.fraction, 0.05);
  assert.equal(r.baseline.tn, 950);
});

test('rarer positives: baseline accuracy rises while the model finds a smaller share of them', () => {
  const run = f => evaluate(generatedData({ n: 1000, fraction: f, seed: 3 }), generatedData({ n: 1000, fraction: f, seed: 3 + 7919 }));
  const balanced = run(0.5), rare = run(0.01);
  assert.equal(balanced.baseline.accuracy, 0.5);
  assert.equal(rare.baseline.accuracy, 0.99);
  assert.ok(balanced.model.recall >= 0.85, `recall at 50%: ${balanced.model.recall}`);
  assert.ok(rare.model.recall <= 0.4, `recall at 1%: ${rare.model.recall}`);
});

test('class weights and a lower threshold both win recall back', () => {
  const train = generatedData({ n: 1000, fraction: 0.05, seed: 3 }), test = generatedData({ n: 1000, fraction: 0.05, seed: 3 + 7919 });
  const plain = evaluate(train, test), weighted = evaluate(train, test, { weighted: true }), lowered = evaluate(train, test, { threshold: 0.1 });
  assert.equal(weighted.weight, 19);
  assert.ok(weighted.model.recall > plain.model.recall + 0.2);
  assert.ok(lowered.model.recall > plain.model.recall);
  assert.ok(weighted.model.precision < plain.model.precision);
});

test('class weight is the number of negatives per positive, and repeating positives equals weighting them', () => {
  assert.equal(classWeight([...Array(990).fill(0), ...Array(10).fill(1)]), 99);
  assert.equal(classWeight([0, 1]), 1);
  assert.equal(classWeight([0, 0, 0]), 1);
  const rep = repeatPositives([[0], [1]], [0, 1], 3);
  assert.deepEqual(rep.y, [0, 1, 1, 1]);
  // One gradient step from weights 0, bias 0 (p = 0.5 everywhere). Plain: mean((p - y) * x) = (0.5*0 + (-0.5)*1) / 2 = -0.25.
  // Positive counted 3 times: (0.5*0 + 3 * (-0.5) * 1) / (1 + 3) = -0.375, the weighted mean with weights 1 and 3.
  close(gradientStep([[0], [1]], [0, 1], [0], 0).gradWeights[0], -0.25);
  close(gradientStep(rep.X, rep.y, [0], 0).gradWeights[0], -0.375);
});

test('the decision line agrees with the model at any threshold', () => {
  const train = generatedData({ n: 400, fraction: 0.2, seed: 9 }), model = fitModel(train);
  const probabilities = predictProba(model, train.X);
  for (const threshold of [0.1, 0.5, 0.8]) {
    const { w0, w1, b } = decisionLine(model, threshold);
    train.X.forEach((r, i) => {
      const side = w0 * r[0] + w1 * r[1] + b;
      if (Math.abs(side) > 1e-9) assert.equal(side >= 0, probabilities[i] >= threshold, `row ${i} at ${threshold}`);
    });
  }
});

test('half plane polygon and line crossing, by hand', () => {
  // x + y - 10 >= 0 in the 10 x 10 square: the triangle (10,0), (10,10), (0,10), area 50.
  const tri = halfPlanePolygon(1, 1, -10, 10);
  assert.equal(tri.length, 3);
  close(area(tri), 50);
  const [p, q] = lineInSquare(1, 1, -10, 10);
  assert.deepEqual([p, q].map(a => a.map(v => Math.round(v))).sort(), [[0, 10], [10, 0]]);
  assert.equal(halfPlanePolygon(0, 0, -1, 10).length, 0);
  close(area(halfPlanePolygon(0, 0, 1, 10)), 100);
  assert.equal(lineInSquare(0, 0, 1, 10), null);
  // x >= 25 on a 0..10 square (everything on the wrong side) has no line inside it.
  assert.equal(lineInSquare(1, 0, -25, 10), null);
});

test('rescaling a line into plot units: x >= 45 on a 30..60 axis is 3u - 15 >= 0 (u = 5 at x = 45)', () => {
  const r = rescaleLine({ w0: 1, w1: 0, b: -45 }, { xLo: 30, xHi: 60, yLo: 12, yHi: 22 });
  close(r.w0, 3); close(r.w1, 0); close(r.b, -15);
});

test('verdict and trend rules', () => {
  assert.equal(verdictKind(0.95), 'trap');
  assert.equal(verdictKind(0.9), 'trap');
  assert.equal(verdictKind(0.8), 'decent');
  assert.equal(verdictKind(0.7), 'fair');
  assert.equal(trendKey(0.05, 0.45, -0.3), 'up-down');
  assert.equal(trendKey(0.05, 0.45, 0.01), 'up-same');
  assert.equal(trendKey(0.05, 0.45, 0.1), 'up-up');
  assert.equal(trendKey(0.5, 0, -0.01), 'same-same');
});

test('penguin rows: missing values dropped and counted, Chinstrap is the positive class', () => {
  const table = parseCsv('species,island,bill_length_mm,bill_depth_mm\nAdelie,A,39.1,18.7\nChinstrap,B,46.5,17.9\nGentoo,C,NA,NA\nChinstrap,B,50,19.5\n');
  const d = penguinTable(table);
  assert.deepEqual(d.X, [[39.1, 18.7], [46.5, 17.9], [50, 19.5]]);
  assert.deepEqual(d.y, [0, 1, 1]);
  assert.equal(d.total, 4);
  assert.equal(d.dropped, 1);
});

test('subsampling to a share of positives, and a stratified split', () => {
  const data = { X: Array.from({ length: 100 }, (_, i) => [i, i]), y: Array.from({ length: 100 }, (_, i) => (i < 10 ? 1 : 0)) };
  // Below the data's own 10%: all 90 negatives stay, positives = round(0.05 * 90 / 0.95) = round(4.74) = 5.
  const low = subsampleToFraction(data, 0.05, 1);
  assert.equal(low.positives, 5); assert.equal(low.negatives, 90);
  assert.equal(low.y.filter(v => v === 1).length, 5);
  // Above it: all 10 positives stay, negatives = round(10 * 0.5 / 0.5) = 10.
  const high = subsampleToFraction(data, 0.5, 1);
  assert.equal(high.positives, 10); assert.equal(high.negatives, 10);
  assert.equal(subsampleToFraction(data, 0.001, 1).positives, 2);
  const { train, test } = stratifiedSplit(low.y, 0.5, 1);
  const count = (rows, label) => rows.filter(i => low.y[i] === label).length;
  assert.equal(train.length + test.length, 95);
  assert.deepEqual([count(train, 1), count(test, 1)], [3, 2]);
  assert.deepEqual([count(train, 0), count(test, 0)], [45, 45]);
  assert.deepEqual(takeRows(low, [0]).X.length, 1);
});
