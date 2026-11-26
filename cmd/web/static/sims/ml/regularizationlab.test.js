import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOTAL_POINTS, VAL_POINTS, POOL_POINTS, DEFAULTS, LOG_MIN, LOG_MAX, lambdaOf, generatedPoints, completePenguins, penguinScale,
  penguinPoints, typicalMissGrams, splitPoints, designMatrix, featureRow, columnMeans, fitOn, fitAndScore, curvePoints,
  errorsByLambda, lambdaGridLogs, bestIndex, shapeOf, learningCurveAt, learningRepeat, averageRepeats, LEARNING_SIZES,
} from './regularizationlab.js';
import { parseCsv } from './tabular.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

const CSV = [
  'species,island,bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,sex,year',
  'Adelie,Torgersen,39.1,18.7,181,3750,male,2007',
  'Adelie,Torgersen,NA,NA,NA,NA,NA,2007',
  'Gentoo,Biscoe,46.1,13.2,211,4500,female,2007',
  'Gentoo,Biscoe,45,14,NA,4400,female,2007',
  'Chinstrap,Dream,50,19,195,3900,male,2008',
].join('\n');

test('the sizes add up: 60 points, 18 held out, 42 to train from', () => {
  assert.equal(TOTAL_POINTS, 60); assert.equal(VAL_POINTS, 18); assert.equal(POOL_POINTS, 42);
  assert.equal(LEARNING_SIZES.at(-1), POOL_POINTS);
  assert.equal(generatedPoints(3).length, TOTAL_POINTS);
});

test('generated points are reproducible per seed and stay inside the plot square', () => {
  assert.deepEqual(generatedPoints(4), generatedPoints(4));
  assert.notDeepEqual(generatedPoints(4), generatedPoints(5));
  for (const p of generatedPoints(4, 1.5)) { assert.equal(p.cols.length, 1); assert.ok(p.cols[0] >= 0 && p.cols[0] <= 10); }
  close(lambdaOf(-2), 0.01); close(lambdaOf(LOG_MIN), 1e-5); close(lambdaOf(LOG_MAX), 10);
});

test('completePenguins drops rows with any missing value and counts them', () => {
  const { rows, total, dropped } = completePenguins(parseCsv(CSV));
  assert.equal(total, 5); assert.equal(dropped, 2); assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { cols: [181, 39.1, 18.7], y: 3750 });   // flipper, bill length, bill depth, then body mass
});

test('penguin points are mapped to 0..10 per column, reproducible, and typicalMissGrams converts back', () => {
  const { rows } = completePenguins(parseCsv(CSV));
  const scale = penguinScale(rows);
  assert.deepEqual(scale.cols[0], { min: 181, max: 211 });
  assert.deepEqual(scale.y, { min: 3750, max: 4500 });
  const pts = penguinPoints(rows, scale, 2, 10);
  assert.equal(pts.length, 3);
  assert.deepEqual(pts, penguinPoints(rows, scale, 2, 10));
  const small = pts.find(p => p.y === 0);
  close(small.cols[0], 0); close(small.cols[1], 0); close(small.cols[2], (18.7 - 13.2) / (19 - 13.2) * 10);   // the lightest penguin
  close(typicalMissGrams(4, scale), 2 * 750 / 10);     // sqrt(4) plot units * 750 g per 10 plot units
  close(typicalMissGrams(0, scale), 0);
});

test('splitPoints: last 30% is validation, training is a prefix of the rest, and it is reproducible', () => {
  const pts = generatedPoints(4);
  const a = splitPoints(pts, 15, 4), b = splitPoints(pts, 20, 4);
  assert.equal(a.validation.length, VAL_POINTS); assert.equal(a.train.length, 15); assert.equal(b.train.length, 20);
  assert.deepEqual(a.validation, b.validation);                       // the validation set does not move with the training size
  assert.deepEqual(b.train.slice(0, 15), a.train);                    // a bigger size only adds points
  assert.equal(new Set([...a.train, ...a.validation]).size, 15 + VAL_POINTS);   // no overlap
  assert.deepEqual(splitPoints(pts, 15, 4), a);
  assert.notDeepEqual(splitPoints(pts, 15, 5).train, a.train);
  assert.equal(splitPoints(pts, 1000, 4).train.length, POOL_POINTS);   // clamped to the pool
  assert.equal(splitPoints(pts, 0, 4).train.length, 1);
});

test('designMatrix gives powers 1..degree of each column in [-1, 1], column after column', () => {
  assert.deepEqual(designMatrix([{ cols: [0], y: 0 }, { cols: [10], y: 0 }], 2), [[-1, 1], [1, 1]]);
  assert.deepEqual(designMatrix([{ cols: [10, 5], y: 0 }], 3), [[1, 1, 1, 0, 0, 0]]);
  assert.deepEqual(featureRow([7.5, 0], 2), [0.5, 0.25, -1, 1]);
  assert.deepEqual(columnMeans([{ cols: [2, 4], y: 0 }, { cols: [4, 8], y: 0 }]), [3, 6]);
});

// x = 1..4 and y = 1 3 2 5: standardised x has sum of squares 4, and z'y_centred = 5.5 / sqrt(1.25).
const X4 = [[1], [2], [3], [4]], Y4 = [1, 3, 2, 5], RHO = 5.5 / Math.sqrt(1.25);

test('fitOn: ridge shrinks the standardised coefficient by 1 / (1 + lambda)', () => {
  close(fitOn(X4, Y4, 0, 'l2').coef[0], RHO / 4);
  close(fitOn(X4, Y4, 1, 'l2').coef[0], RHO / 8);
  close(fitOn(X4, Y4, 3, 'l2').coef[0], RHO / 16);
});

test('fitOn: lasso subtracts n * lambda / 2 from z\'y and is exactly 0 once that passes it', () => {
  close(fitOn(X4, Y4, 0.5, 'l1').coef[0], (RHO - 1) / 4);               // threshold 4 * 0.5 / 2 = 1
  const gone = fitOn(X4, Y4, 10, 'l1');
  assert.equal(gone.coef[0], 0); assert.equal(gone.zeros, 1);
  assert.equal(fitOn(X4, Y4, 10, 'l2').zeros, 0);                        // ridge shrinks but never reaches 0
  close(fitOn(X4, Y4, 10, 'l1').predict([100]), 2.75);                   // all shrunk: predicts the mean
});

test('fitAndScore on a straight line has no error at lambda 0 and a growing one with lambda', () => {
  const pts = Array.from({ length: 20 }, (_, i) => ({ cols: [i / 2], y: 1 + 0.5 * (i / 2) }));
  const X = designMatrix(pts, 1), y = pts.map(p => p.y), split = splitPoints(pts, 14, 1);
  const plain = fitAndScore(X, y, split, 0, 'l2');
  close(plain.train, 0, 1e-12); close(plain.validation, 0, 1e-12);
  assert.ok(fitAndScore(X, y, split, 1, 'l2').validation > 0.01);
  assert.ok(fitAndScore(X, y, split, 1e6, 'l2').validation > fitAndScore(X, y, split, 1, 'l2').validation);
});

test('curvePoints evaluates the fit along x and drops points that are not finite', () => {
  const pts = curvePoints(row => 2 * row[0], 1, [], 10);
  assert.equal(pts.length, 11); close(pts[0].y, -2); close(pts[10].y, 2); close(pts[5].x, 5);
  assert.equal(curvePoints(() => NaN, 1).length, 0);
  assert.equal(curvePoints(() => 1e9, 1)[0].y, 1e4);                    // clamped so the canvas stays sane
  assert.equal(curvePoints(row => row.length, 3, [5, 5], 4)[0].y, 9);   // 3 base columns x degree 3
});

test('lambdaGridLogs runs from LOG_MIN to LOG_MAX', () => {
  const g = lambdaGridLogs(31);
  assert.equal(g.length, 31); close(g[0], LOG_MIN); close(g[30], LOG_MAX); close(g[1] - g[0], 0.2);
});

test('bestIndex takes the lowest validation error, and the larger lambda on a tie; shapeOf names the curve', () => {
  const rows = v => v.map(validation => ({ validation }));
  assert.equal(bestIndex(rows([5, 2, 1, 3])), 2);
  assert.equal(bestIndex(rows([1, 3, 1.001, 4])), 2);                  // tie within 0.005: the larger lambda
  assert.equal(bestIndex(rows([Infinity, Infinity])), 0);
  assert.equal(shapeOf(rows([5, 2, 1, 3, 6])), 'u');
  assert.equal(shapeOf(rows([1, 1.5, 2, 3])), 'rises');
  assert.equal(shapeOf(rows([4, 3, 2, 1])), 'falls');
  assert.equal(shapeOf(rows([4, 3, 1, 1.02])), 'falls');               // flat within 3% at the end counts as still falling
});

test('the default sample shows the story: a flexible fit with no penalty overfits, a moderate penalty fixes it', () => {
  for (const kind of ['l2', 'l1']) {
    const pts = generatedPoints(DEFAULTS.seed, DEFAULTS.noise), X = designMatrix(pts, DEFAULTS.degree), y = pts.map(p => p.y);
    const split = splitPoints(pts, DEFAULTS.train, DEFAULTS.seed);
    const grid = errorsByLambda(X, y, split, kind, lambdaGridLogs());
    assert.equal(shapeOf(grid), 'u', kind);
    const best = grid[bestIndex(grid)];
    assert.ok(grid[0].validation > 4 * best.validation, `${kind}: ${grid[0].validation} vs ${best.validation}`);
    assert.ok(grid[0].train < best.train, 'training error only goes up with the penalty');
    assert.ok(grid.at(-1).validation > 3 * best.validation, 'a huge penalty underfits');
    assert.equal(grid.at(-1).zeros, kind === 'l1' ? 9 : 0);             // lasso has zeroed every coefficient at the top
  }
});

test('errorsByLambda counts the lasso zeros: none without a penalty, more as lambda grows', () => {
  const pts = generatedPoints(DEFAULTS.seed), X = designMatrix(pts, 9), y = pts.map(p => p.y), split = splitPoints(pts, 15, DEFAULTS.seed);
  const z = errorsByLambda(X, y, split, 'l1', [-5, -2, 0, 1]).map(r => r.zeros);
  assert.equal(z[0], 0);
  assert.ok(z[1] >= z[0] && z[2] > z[1] && z[3] === 9, z.join());
});

test('learningCurveAt: reproducible, one row per size, and more training data lowers the validation error', () => {
  const pts = generatedPoints(DEFAULTS.seed), X = designMatrix(pts, 9), y = pts.map(p => p.y);
  const a = learningCurveAt(X, y, 'l2', -2, { repeats: 3, seed: 1 }), b = learningCurveAt(X, y, 'l2', -2, { repeats: 3, seed: 1 });
  assert.deepEqual(a, b);
  assert.deepEqual(a.map(r => r.size), LEARNING_SIZES);
  assert.ok(a[0].validation > a.at(-1).validation, 'validation error at 6 points is above the one at 42');
  assert.ok(a.at(-1).train > a[0].train, 'and the training error goes the other way');
  const parts = [0, 1, 2].map(r => learningRepeat(X, y, 'l2', -2, r, { seed: 1 }));
  assert.deepEqual(averageRepeats(parts), a);                            // the pieces the lab runs one by one give the same curve
});
