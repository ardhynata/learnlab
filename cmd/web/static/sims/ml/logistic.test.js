import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sigmoid, fitLogistic, gradientStep, rawCoefficients, decisionScores, predictProba, predict,
  logLoss, accuracy, confusionCounts, precisionRecallF1, classificationMetrics,
} from './logistic.js';
import { rng, gauss } from './rng.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (tol ${tol})`);

test('sigmoid: 0.5 at 0, symmetric, monotone, stable for huge inputs', () => {
  assert.equal(sigmoid(0), 0.5);
  close(sigmoid(1), 0.7310585786300049);
  close(sigmoid(2) + sigmoid(-2), 1);
  assert.equal(sigmoid(1000), 1);
  assert.equal(sigmoid(-1000), 0);
  assert.ok(Number.isFinite(sigmoid(-745)) && !Number.isNaN(sigmoid(1e9)));
  assert.ok(sigmoid(-1) < sigmoid(0) && sigmoid(0) < sigmoid(3));
});

test('logLoss matches the hand computation', () => {
  // y = [1, 0], p = [0.8, 0.4]: -(ln 0.8 + ln 0.6) / 2 = (0.2231435513 + 0.5108256238) / 2.
  close(logLoss([1, 0], [0.8, 0.4]), 0.36698458755, 1e-9);
  // A coin-flip model costs ln 2 whatever the labels are.
  close(logLoss([1, 0, 1, 1], [0.5, 0.5, 0.5, 0.5]), Math.LN2);
  // Confident and right is cheap, confident and wrong is expensive.
  assert.ok(logLoss([1], [0.99]) < logLoss([1], [0.6]));
  assert.ok(logLoss([1], [0.01]) > 4);
  // Probabilities of exactly 0 or 1 are clipped, so a wrong certainty is huge but finite.
  const wrong = logLoss([1], [0]);
  assert.ok(Number.isFinite(wrong) && wrong > 30);
  assert.equal(logLoss([1], [1]) < 1e-12, true);
  assert.equal(logLoss([], []), 0);
  // Booleans work as labels.
  close(logLoss([true, false], [0.8, 0.4]), logLoss([1, 0], [0.8, 0.4]));
});

test('gradientStep is one hand-checkable gradient-descent step', () => {
  // Rows x = 0 and x = 1, labels 0 and 1, w = 0, b = 0: both p = 0.5, errors [0.5, -0.5].
  // gradW = (0*0.5 + 1*-0.5) / 2 = -0.25, gradB = (0.5 - 0.5) / 2 = 0.
  const s = gradientStep([[0], [1]], [0, 1], [0], 0, { lr: 1 });
  close(s.gradWeights[0], -0.25);
  close(s.gradBias, 0);
  close(s.weights[0], 0.25);
  close(s.bias, 0);
  close(s.loss, Math.LN2);

  // From w = 1 with L2 = 0.4: p = [0.5, sigmoid(1) = 0.7310585786], errors [0.5, -0.2689414214].
  // gradW = -0.2689414214 / 2 + 0.4 * 1 = 0.2655292893; gradB = (0.5 - 0.2689414214) / 2 = 0.1155292893.
  const r = gradientStep([[0], [1]], [0, 1], [1], 0, { lr: 0.5, l2: 0.4 });
  close(r.gradWeights[0], 0.26552928931, 1e-9);
  close(r.gradBias, 0.11552928931, 1e-9);
  close(r.weights[0], 1 - 0.5 * 0.26552928931, 1e-9);
  close(r.bias, -0.5 * 0.11552928931, 1e-9);
  // The loss reported is the one BEFORE the step: (ln 2 + -ln(0.7310585786)) / 2.
  close(r.loss, (Math.LN2 + 0.31326168752) / 2, 1e-9);
  // The bias is not penalised: with w = 0 the L2 term changes nothing.
  assert.deepEqual(gradientStep([[0], [1]], [0, 1], [0], 0, { l2: 5 }).gradWeights, gradientStep([[0], [1]], [0, 1], [0], 0).gradWeights);
});

test('a step downhill lowers the loss; gradientStep and fitLogistic agree', () => {
  const X = [[0, 1], [1, 0], [2, 2], [3, 1], [1, 3], [4, 4]], y = [0, 0, 0, 1, 1, 1];
  let w = [0, 0], b = 0, prev = Infinity;
  for (let i = 0; i < 20; i++) {
    const s = gradientStep(X, y, w, b, { lr: 0.1 });
    assert.ok(s.loss < prev);
    prev = s.loss; w = s.weights; b = s.bias;
  }
  const m = fitLogistic(X, y, { lr: 0.1, iters: 20, standardize: false });
  assert.deepEqual(m.weights, w);
  assert.equal(m.bias, b);
  assert.equal(m.lossHistory.length, 21);
  close(m.lossHistory[0], Math.LN2);
});

function separable(n, seed) {
  const random = rng(seed), X = [], y = [];
  for (let i = 0; i < n; i++) {
    const cls = i % 2;
    const cx = cls ? 3 : -3, cy = cls ? 2 : -2;
    X.push([cx + 0.6 * gauss(random), cy + 0.6 * gauss(random)]);
    y.push(cls);
  }
  return { X, y };
}

test('a separable toy set is learned to over 95% accuracy, deterministically', () => {
  const { X, y } = separable(120, 11);
  const m = fitLogistic(X, y, { lr: 0.3, iters: 300 });
  const proba = predictProba(m, X);
  assert.ok(accuracy(y, proba) > 0.95, `accuracy ${accuracy(y, proba)}`);
  assert.ok(logLoss(y, proba) < 0.2);
  assert.ok(m.lossHistory[m.iters] < m.lossHistory[0]);
  // A held-out sample from the same distribution is also classified well.
  const test = separable(80, 99);
  assert.ok(accuracy(test.y, predictProba(m, test.X)) > 0.95);
  // Deterministic: a second fit is identical.
  assert.deepEqual(fitLogistic(X, y, { lr: 0.3, iters: 300 }), m);
  // predict agrees with thresholding predictProba.
  assert.deepEqual(predict(m, X), proba.map(p => (p >= 0.5 ? 1 : 0)));
});

test('standardization inside the model equals a hand-scaled fit, and rawCoefficients undo it', () => {
  // Features on wildly different scales: the second is in the thousands.
  const { X: base, y } = separable(100, 5);
  const X = base.map(([a, b]) => [a, 1000 + 500 * b]);
  const m = fitLogistic(X, y, { lr: 0.3, iters: 300 });
  assert.equal(m.standardize, true);
  assert.ok(accuracy(y, predictProba(m, X)) > 0.95);
  // The stats come from the training rows.
  close(m.mean[1], X.reduce((s, r) => s + r[1], 0) / X.length, 1e-9);
  // w.x + b in the original units gives the same scores as the model.
  const raw = rawCoefficients(m);
  const viaRaw = X.map(x => raw.weights[0] * x[0] + raw.weights[1] * x[1] + raw.bias);
  decisionScores(m, X).forEach((s, i) => close(s, viaRaw[i], 1e-7));
  // standardize:false leaves the weights as they are and stores no stats.
  const unscaled = fitLogistic(base, y, { standardize: false, iters: 50 });
  assert.equal(unscaled.mean, null);
  assert.deepEqual(rawCoefficients(unscaled), { weights: unscaled.weights, bias: unscaled.bias });
});

test('a constant column is ignored instead of dividing by zero', () => {
  const X = [[1, 5], [2, 5], [3, 5], [4, 5]], y = [0, 0, 1, 1];
  const m = fitLogistic(X, y, { lr: 0.5, iters: 200 });
  assert.ok(m.weights.every(Number.isFinite) && Number.isFinite(m.bias));
  assert.equal(m.weights[1], 0);
  assert.equal(rawCoefficients(m).weights[1], 0);
  assert.ok(predictProba(m, [[10, 5]])[0] > 0.9);
});

test('L2 shrinks the weights toward zero', () => {
  const { X, y } = separable(60, 3);
  const free = fitLogistic(X, y, { lr: 0.3, iters: 300, l2: 0 });
  const ridge = fitLogistic(X, y, { lr: 0.3, iters: 300, l2: 0.5 });
  const norm = w => Math.hypot(...w);
  assert.ok(norm(ridge.weights) < norm(free.weights));
  assert.ok(ridge.l2 === 0.5);
});

test('confusionCounts splits at the threshold and the threshold moves FP into FN', () => {
  const y = [1, 1, 1, 0, 0, 0, 1, 0];
  const p = [0.9, 0.7, 0.4, 0.6, 0.2, 0.1, 0.5, 0.5];
  // threshold 0.5 (>= counts as positive): predicted positive = idx 0,1,3,6,7
  assert.deepEqual(confusionCounts(y, p, 0.5), { tp: 3, fp: 2, tn: 2, fn: 1 });
  assert.deepEqual(confusionCounts(y, p), confusionCounts(y, p, 0.5));
  // Raising the threshold to 0.65 keeps only idx 0 and 1.
  assert.deepEqual(confusionCounts(y, p, 0.65), { tp: 2, fp: 0, tn: 4, fn: 2 });
  // Threshold 0 predicts everything positive, threshold above 1 nothing.
  assert.deepEqual(confusionCounts(y, p, 0), { tp: 4, fp: 4, tn: 0, fn: 0 });
  assert.deepEqual(confusionCounts(y, p, 1.1), { tp: 0, fp: 0, tn: 4, fn: 4 });
  const c = confusionCounts(y, p, 0.5);
  assert.equal(c.tp + c.fp + c.tn + c.fn, y.length);
  close(accuracy(y, p, 0.5), 5 / 8);
  assert.throws(() => confusionCounts([1, 0], [0.5]), /labels but/);
  assert.throws(() => confusionCounts([2], [0.5]), /0 or 1/);
});

test('precision, recall and F1 by hand, with 0/0 flagged rather than hidden', () => {
  // tp 3, fp 1, fn 2: precision 3/4, recall 3/5, F1 = 6 / (6 + 1 + 2) = 2/3.
  const m = precisionRecallF1({ tp: 3, fp: 1, tn: 10, fn: 2 });
  close(m.precision, 0.75);
  close(m.recall, 0.6);
  close(m.f1, 2 / 3);
  // F1 is the harmonic mean of precision and recall.
  close(m.f1, (2 * m.precision * m.recall) / (m.precision + m.recall));
  assert.deepEqual(m.undefined, { precision: false, recall: false, f1: false });

  // Nothing predicted positive: precision is 0/0.
  const none = precisionRecallF1({ tp: 0, fp: 0, tn: 5, fn: 2 });
  assert.equal(none.precision, 0);
  assert.equal(none.undefined.precision, true);
  assert.equal(none.recall, 0);
  assert.equal(none.undefined.recall, false);
  assert.equal(none.f1, 0);
  assert.equal(none.undefined.f1, false);

  // No actual positives: recall is 0/0, and a model with no hits on a real class is a true 0, not undefined.
  const noPositives = precisionRecallF1({ tp: 0, fp: 3, tn: 5, fn: 0 });
  assert.equal(noPositives.undefined.recall, true);
  assert.equal(noPositives.undefined.precision, false);
  assert.equal(noPositives.precision, 0);

  // Empty everything.
  const empty = precisionRecallF1({ tp: 0, fp: 0, tn: 0, fn: 0 });
  assert.deepEqual(empty.undefined, { precision: true, recall: true, f1: true });
});

test('classificationMetrics bundles counts, accuracy and the ratios', () => {
  const y = [1, 1, 1, 0, 0, 0, 1, 0];
  const p = [0.9, 0.7, 0.4, 0.6, 0.2, 0.1, 0.5, 0.5];
  const m = classificationMetrics(y, p, 0.5);
  assert.equal(m.threshold, 0.5);
  assert.deepEqual({ tp: m.tp, fp: m.fp, tn: m.tn, fn: m.fn }, { tp: 3, fp: 2, tn: 2, fn: 1 });
  close(m.accuracy, 5 / 8);
  close(m.precision, 3 / 5);
  close(m.recall, 3 / 4);
  close(m.f1, 6 / 9);
  assert.equal(classificationMetrics([], [], 0.5).accuracy, 0);
});

test('input validation names the problem', () => {
  assert.throws(() => fitLogistic([], []), /non-empty/);
  assert.throws(() => fitLogistic([[1], [2]], [0]), /rows but/);
  assert.throws(() => fitLogistic([[1], [2, 3]], [0, 1]), /same number/);
  assert.throws(() => fitLogistic([[1], [2]], [0, 2]), /0 or 1/);
});
