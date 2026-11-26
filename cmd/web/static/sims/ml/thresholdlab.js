// Pure helpers for the logistic-threshold lab: seeded data, the penguin table prepared for a
// Gentoo-versus-the-rest classifier, and the geometry of the decision boundary at any threshold.
// The model itself comes from logistic.js; nothing here draws or touches the page. Tested in thresholdlab.test.js.
import { rng, gauss } from './rng.js';
import { sigmoid, confusionCounts, precisionRecallF1, logLoss } from './logistic.js';

export const THRESHOLD_MIN = 0.05;
export const THRESHOLD_MAX = 0.95;
export const THRESHOLD_DEFAULT = 0.5;
export const GENERATED_SEED = 8;

// log-odds of a probability: the score at which the sigmoid equals p. logit(0.5) is 0.
export function logit(p) { return Math.log(p / (1 - p)); }

// Two overlapping blobs inside the 0..10 square: 60 negatives (label 0) around (3.6, 4.4) and 40 positives
// (label 1) around (6.2, 5.8), each with a spread of about 1.3, so the classes cannot be told apart perfectly.
// The same seed always gives the same points.
export function blobPoints(seed, { negatives = 60, positives = 40 } = {}) {
  const random = rng(seed);
  const clamp = v => Math.max(0.3, Math.min(9.7, v));
  const X = [], y = [];
  const add = (cx, cy, label, n) => {
    for (let i = 0; i < n; i++) { X.push([clamp(cx + 1.3 * gauss(random)), clamp(cy + 1.3 * gauss(random))]); y.push(label); }
  };
  add(3.6, 4.4, 0, negatives);
  add(6.2, 5.8, 1, positives);
  return { X, y };
}

// The penguins as a Gentoo-versus-the-others problem on two body measurements: bill length (mm) and body
// mass (kg; the file stores grams). A penguin missing either number (written NA) is dropped, and `dropped`
// says how many, so the lab can tell the learner. `positives` counts the Gentoo penguins that remain.
export function gentooPoints(table) {
  const X = [], y = [];
  for (const row of table.rows) {
    const b = row.bill_length_mm, m = row.body_mass_g;
    if (typeof b !== 'number' || typeof m !== 'number' || !Number.isFinite(b) || !Number.isFinite(m)) continue;
    X.push([b, m / 1000]);
    y.push(row.species === 'Gentoo' ? 1 : 0);
  }
  return { X, y, total: table.rows.length, dropped: table.rows.length - X.length, positives: y.reduce((a, v) => a + v, 0) };
}

// Everything the readouts need at one threshold: the four counts, precision and recall (with a flag when the
// ratio is 0/0), and the log loss, which does not depend on the threshold at all.
export function summarizeAt(y, proba, threshold) {
  const c = confusionCounts(y, proba, threshold);
  const pr = precisionRecallF1(c);
  return { threshold, ...c, flagged: c.tp + c.fp, n: y.length, precision: pr.precision, recall: pr.recall, undefined: pr.undefined, logLoss: logLoss(y, proba) };
}

// Indices of the false positives (negatives called positive) and false negatives (positives called negative).
export function mistakes(y, proba, threshold) {
  const fp = [], fn = [];
  y.forEach((t, i) => {
    const called = proba[i] >= threshold;
    if (called && !Number(t)) fp.push(i); else if (!called && Number(t)) fn.push(i);
  });
  return { fp, fn };
}

// How the counts moved between two thresholds. Lowering the threshold never removes a false positive and never
// adds a false negative; raising it does the reverse. `direction` is 'lower', 'higher' or 'same'.
export function shiftBetween(y, proba, from, to) {
  const a = confusionCounts(y, proba, from), b = confusionCounts(y, proba, to);
  return {
    fpFrom: a.fp, fpTo: b.fp, fnFrom: a.fn, fnTo: b.fn,
    changed: a.fp !== b.fp || a.fn !== b.fn,
    direction: to < from ? 'lower' : to > from ? 'higher' : 'same',
  };
}

// The line w0*x + w1*y + b = logit(threshold) is where the model's probability equals the threshold.
// `coef` is { weights: [w0, w1], bias } in the original feature units (rawCoefficients). Returns the segment
// of that line inside the box { xLo, xHi, yLo, yHi } as [[x1, y1], [x2, y2]], or null when it misses the box.
export function boundarySegment(coef, threshold, box) {
  const [w0, w1] = coef.weights, c = logit(threshold) - coef.bias;   // w0*x + w1*y = c
  const hits = [];
  const push = (x, y) => { if (x >= box.xLo - 1e-9 && x <= box.xHi + 1e-9 && y >= box.yLo - 1e-9 && y <= box.yHi + 1e-9 && !hits.some(h => Math.hypot(h[0] - x, h[1] - y) < 1e-9)) hits.push([x, y]); };
  if (w1 !== 0) { push(box.xLo, (c - w0 * box.xLo) / w1); push(box.xHi, (c - w0 * box.xHi) / w1); }
  if (w0 !== 0) { push((c - w1 * box.yLo) / w0, box.yLo); push((c - w1 * box.yHi) / w0, box.yHi); }
  return hits.length >= 2 ? [hits[0], hits[1]] : null;
}

// Probability of the positive class at one point, from the original-unit coefficients.
export const probabilityAt = (coef, x, y) => sigmoid(coef.weights[0] * x + coef.weights[1] * y + coef.bias);
