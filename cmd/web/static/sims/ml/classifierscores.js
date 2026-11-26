// Synthetic scores for a binary classifier, plus the small pieces the
// "Measuring a classifier" lab needs around the shared metrics in metrics.js:
// a score generator, a fast ROC curve, a histogram and the accuracy-trap test.
//
// Positive cases score around `separation`, negative cases around 0, and both
// spread by one standard deviation. Case i is positive when i < the positive
// count, and its random draw never depends on the settings, so changing
// separation or prevalence moves the same cases instead of redrawing them.
import { rng, gauss } from './rng.js';

// Scores and true labels for n cases. `prevalence` is the share of positives
// (0 to 1); at least one case of each class is always kept.
export function makeScores({ n = 1000, prevalence = 0.1, separation = 2, seed = 1 } = {}) {
  const count = Math.max(2, Math.round(n));
  const positives = Math.min(count - 1, Math.max(1, Math.round(count * prevalence)));
  const random = rng(seed);
  const scores = [], actual = [];
  for (let i = 0; i < count; i++) {
    const isPositive = i < positives;
    scores.push(gauss(random) + (isPositive ? separation : 0));
    actual.push(isPositive);
  }
  return { scores, actual };
}

// ROC points like metrics.rocCurve, but in one sorted pass instead of one pass
// per threshold, so it stays fast with thousands of cases. Same output shape:
// [{ threshold, fpr, tpr }] from "flag nothing" to "flag everything".
export function fastRoc(scores, actual) {
  const order = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
  const totalPos = actual.filter(Boolean).length, totalNeg = actual.length - totalPos;
  const rate = (a, b) => (b ? a / b : 0);
  const curve = [{ threshold: Infinity, fpr: 0, tpr: 0 }];
  let tp = 0, fp = 0;
  for (let k = 0; k < order.length; k++) {
    const i = order[k];
    if (actual[i]) tp++; else fp++;
    if (k + 1 === order.length || scores[order[k + 1]] !== scores[i]) curve.push({ threshold: scores[i], fpr: rate(fp, totalNeg), tpr: rate(tp, totalPos) });
  }
  curve.push({ threshold: -Infinity, fpr: rate(totalNeg, totalNeg), tpr: rate(totalPos, totalPos) });
  return curve;
}

// Counts of each class per bin over [lo, hi]. Scores outside the range go into the end bins.
export function histogram(scores, actual, lo, hi, bins) {
  const pos = new Array(bins).fill(0), neg = new Array(bins).fill(0);
  scores.forEach((s, i) => {
    const b = Math.min(bins - 1, Math.max(0, Math.floor((s - lo) / (hi - lo) * bins)));
    (actual[i] ? pos : neg)[b]++;
  });
  return { pos, neg, lo, hi, bins, width: (hi - lo) / bins };
}

// The accuracy trap: accuracy looks excellent while most positive cases are missed.
export function accuracyTrap({ accuracy, recall }) {
  return accuracy >= 0.9 && recall < 0.5;
}

// Standard normal cumulative distribution (Abramowitz and Stegun 7.1.26, error under 1.5e-7).
export function normalCdf(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-z * z / 2);
  return 0.5 * (1 + (z >= 0 ? erf : -erf));
}

// The area under the ROC curve that two unit-spread normal classes `separation` apart have in theory.
export const theoreticalAuc = separation => normalCdf(separation / Math.SQRT2);

// One plain sentence about the current result; calls out the accuracy trap.
export function statusSentence(r) {
  const n = v => v.toLocaleString('en-US');
  const positives = r.tp + r.fn, flagged = r.tp + r.fp;
  const pct = v => `${(v * 100).toFixed(1)}%`;
  const cases = `${n(positives)} positive case${positives === 1 ? '' : 's'}`;
  if (accuracyTrap(r)) {
    if (flagged === 0) return `Accuracy trap: it never says yes, yet it is ${pct(r.accuracy)} accurate. It finds none of the ${cases}.`;
    // It does say yes, but never to a real positive: "finds only 0 of" would read as if something were found.
    if (r.tp === 0) return `Accuracy trap: ${pct(r.accuracy)} accurate, but it finds none of the ${cases} (recall ${pct(r.recall)}).`;
    return `Accuracy trap: ${pct(r.accuracy)} accurate, but it finds only ${n(r.tp)} of the ${cases} (recall ${pct(r.recall)}).`;
  }
  if (flagged === 0) return `It never says yes, so it finds none of the ${cases}.`;
  if (r.recall >= 0.8 && r.precision < 0.5) return `It finds ${n(r.tp)} of the ${cases}, but only ${pct(r.precision)} of its yes answers are right.`;
  if (r.precision >= 0.8 && r.recall < 0.6) return `Its yes answers are ${pct(r.precision)} right, but it misses ${n(r.fn)} of the ${cases}.`;
  return `It says yes to ${n(flagged)} case${flagged === 1 ? '' : 's'} and finds ${n(r.tp)} of the ${cases}.`;
}

// The accuracy a classifier that always answers no would get on these cases.
export const alwaysNoAccuracy = ({ tp, fp, tn, fn }) => (tn + fp) / (tp + fp + tn + fn);
