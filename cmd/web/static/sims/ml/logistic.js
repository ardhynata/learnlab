// Logistic regression for numeric features (2-D for the labs, n-D in general). Pure and deterministic:
// the same data and options always give the same model. Tested in logistic.test.js.
//
// STABLE API (labs and the capstone compare tool import this; change it only by adding):
//
//   sigmoid(z)                                  -> 1 / (1 + e^-z), stable for large |z|, always in [0, 1]
//   fitLogistic(X, y, opts?)                    -> model (see below)
//       X: array of rows (arrays of numbers), y: array of 0/1 (booleans allowed).
//       opts: { lr = 0.1, iters = 500, l2 = 0, standardize = true }
//       Fixed learning rate and iteration count, full-batch gradient descent, weights and bias start at 0.
//       No random numbers, so the fit is deterministic.
//       Objective: mean log loss + (l2 / 2) * sum(w^2). The bias is never penalised.
//       Standardization is handled INSIDE by default: column mean and (population) std come from the
//       training rows only and are stored on the model, so predictProba applies the same transform to any
//       new rows (the leakage-safe way). A constant column maps to 0. Pass standardize:false when the
//       caller already scaled the features (the stored mean/std are then null).
//   model = { weights, bias, standardize, mean, std, lr, iters, l2, lossHistory }
//       weights/bias live in the transformed (standardized) space when standardize is true.
//       lossHistory[i] = mean log loss (data term only) before update i, with lossHistory[iters] the final one.
//   gradientStep(X, y, weights, bias, { lr = 0.1, l2 = 0 })
//                                               -> { weights, bias, gradWeights, gradBias, loss }
//       One gradient-descent step on features exactly as given (no standardization). Use it to animate
//       training one step at a time. `loss` is the mean log loss BEFORE the step.
//   rawCoefficients(model)                      -> { weights, bias } for the ORIGINAL feature units, so that
//       w.x + b = 0 is the decision boundary you can draw in the plot (for 2-D: w0*x0 + w1*x1 + b = 0).
//   decisionScores(model, X)                    -> log-odds w.x + b per row
//   predictProba(model, X)                      -> probability of class 1 per row
//   predict(model, X, threshold = 0.5)          -> 0/1 per row (1 when proba >= threshold)
//   logLoss(yTrue, proba, eps = 1e-15)          -> mean -[y ln p + (1-y) ln(1-p)], p clipped to [eps, 1-eps]
//   accuracy(yTrue, proba, threshold = 0.5)     -> share of rows classified correctly (0 for no rows)
//   confusionCounts(yTrue, proba, threshold = 0.5)
//                                               -> { tp, fp, tn, fn } (positive = 1, predicted 1 when p >= threshold)
//   precisionRecallF1({ tp, fp, tn, fn })       -> { precision, recall, f1, undefined: {precision, recall, f1} }
//       A 0/0 ratio is reported as 0 and flagged true in `undefined`, so a lab can show "n/a" instead of a
//       misleading 0. precision = tp/(tp+fp), recall = tp/(tp+fn), f1 = 2tp/(2tp+fp+fn).
//   classificationMetrics(yTrue, proba, threshold = 0.5)
//                                               -> { threshold, tp, fp, tn, fn, accuracy, precision, recall, f1, undefined }
import { columnStats, standardize as standardizeRows } from './scale.js';

export function sigmoid(z) {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

function checkData(X, y) {
  if (!Array.isArray(X) || !Array.isArray(y) || X.length === 0) throw new Error('logistic: X and y must be non-empty arrays');
  if (X.length !== y.length) throw new Error(`logistic: X has ${X.length} rows but y has ${y.length}`);
  const d = X[0].length;
  if (!(d > 0)) throw new Error('logistic: rows need at least one feature');
  for (const r of X) if (r.length !== d) throw new Error('logistic: all rows must have the same number of features');
  return y.map(v => {
    const n = Number(v);
    if (n !== 0 && n !== 1) throw new Error('logistic: labels must be 0 or 1');
    return n;
  });
}

function checkLabels(yTrue, proba) {
  if (yTrue.length !== proba.length) throw new Error(`logistic: ${yTrue.length} labels but ${proba.length} probabilities`);
  return yTrue.map(v => {
    const n = Number(v);
    if (n !== 0 && n !== 1) throw new Error('logistic: labels must be 0 or 1');
    return n;
  });
}

const dot = (w, x) => { let s = 0; for (let j = 0; j < w.length; j++) s += w[j] * x[j]; return s; };

export function logLoss(yTrue, proba, eps = 1e-15) {
  const y = checkLabels(yTrue, proba);
  if (y.length === 0) return 0;
  let sum = 0;
  y.forEach((t, i) => {
    const p = Math.min(1 - eps, Math.max(eps, proba[i]));
    sum -= t ? Math.log(p) : Math.log(1 - p);
  });
  return sum / y.length;
}

export function gradientStep(X, y, weights, bias, { lr = 0.1, l2 = 0 } = {}) {
  const t = checkData(X, y);
  const n = X.length, d = weights.length;
  const gradWeights = new Array(d).fill(0);
  let gradBias = 0;
  const proba = X.map(x => sigmoid(dot(weights, x) + bias));
  proba.forEach((p, i) => {
    const err = p - t[i];
    for (let j = 0; j < d; j++) gradWeights[j] += (err * X[i][j]) / n;
    gradBias += err / n;
  });
  for (let j = 0; j < d; j++) gradWeights[j] += l2 * weights[j];
  return {
    weights: weights.map((w, j) => w - lr * gradWeights[j]),
    bias: bias - lr * gradBias,
    gradWeights, gradBias,
    loss: logLoss(t, proba),
  };
}

export function fitLogistic(X, y, { lr = 0.1, iters = 500, l2 = 0, standardize = true } = {}) {
  checkData(X, y);
  const stats = standardize ? columnStats(X) : null;
  const F = standardize ? standardizeRows(X, stats) : X;
  let weights = new Array(X[0].length).fill(0), bias = 0;
  const lossHistory = [];
  for (let i = 0; i < iters; i++) {
    const s = gradientStep(F, y, weights, bias, { lr, l2 });
    lossHistory.push(s.loss);
    weights = s.weights; bias = s.bias;
  }
  lossHistory.push(logLoss(y, F.map(x => sigmoid(dot(weights, x) + bias))));
  return {
    weights, bias, standardize, mean: stats ? stats.mean : null, std: stats ? stats.std : null,
    lr, iters, l2, lossHistory,
  };
}

function transformRow(model, x) {
  if (!model.standardize) return x;
  return x.map((v, j) => (model.std[j] ? (v - model.mean[j]) / model.std[j] : 0));
}

export function rawCoefficients(model) {
  if (!model.standardize) return { weights: model.weights.slice(), bias: model.bias };
  let bias = model.bias;
  const weights = model.weights.map((w, j) => {
    if (!model.std[j]) return 0;
    bias -= (w * model.mean[j]) / model.std[j];
    return w / model.std[j];
  });
  return { weights, bias };
}

export function decisionScores(model, X) {
  return X.map(x => dot(model.weights, transformRow(model, x)) + model.bias);
}

export function predictProba(model, X) {
  return decisionScores(model, X).map(sigmoid);
}

export function predict(model, X, threshold = 0.5) {
  return predictProba(model, X).map(p => (p >= threshold ? 1 : 0));
}

export function confusionCounts(yTrue, proba, threshold = 0.5) {
  const y = checkLabels(yTrue, proba);
  const c = { tp: 0, fp: 0, tn: 0, fn: 0 };
  y.forEach((t, i) => {
    const pos = proba[i] >= threshold;
    if (t && pos) c.tp++; else if (!t && pos) c.fp++; else if (!t && !pos) c.tn++; else c.fn++;
  });
  return c;
}

export function accuracy(yTrue, proba, threshold = 0.5) {
  const { tp, fp, tn, fn } = confusionCounts(yTrue, proba, threshold);
  const n = tp + fp + tn + fn;
  return n ? (tp + tn) / n : 0;
}

export function precisionRecallF1({ tp, fp, fn }) {
  const ratio = (a, b) => (b ? { value: a / b, undef: false } : { value: 0, undef: true });
  const p = ratio(tp, tp + fp), r = ratio(tp, tp + fn), f = ratio(2 * tp, 2 * tp + fp + fn);
  return {
    precision: p.value, recall: r.value, f1: f.value,
    undefined: { precision: p.undef, recall: r.undef, f1: f.undef },
  };
}

export function classificationMetrics(yTrue, proba, threshold = 0.5) {
  const c = confusionCounts(yTrue, proba, threshold);
  const n = c.tp + c.fp + c.tn + c.fn;
  return { threshold, ...c, accuracy: n ? (c.tp + c.tn) / n : 0, ...precisionRecallF1(c) };
}
