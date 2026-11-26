// Ranking, calibration and cost helpers for the "Imbalance, ranking, and calibration" module.
// Pure functions, seeded and reproducible, tested in calibration.test.js.
//
// Conventions. `scores` is an array of numbers (higher = more likely positive; for the calibration
// helpers they are probabilities in [0, 1]); `labels` is an array of 0/1 (booleans are accepted),
// 1 = positive. A case is flagged positive when score >= threshold. Equal scores are ties: they
// are always crossed together, so a curve never depends on how tied cases happen to be ordered.
//
// API
//   Ranking
//     rocCurve(scores, labels)     -> [{ threshold, fpr, tpr }] from "flag nothing" (threshold Infinity,
//                                     0, 0) to "flag everything" (1, 1): one point per distinct score,
//                                     in descending threshold order. Needs both classes.
//     auc(scores, labels)          -> area under the ROC curve (trapezoids). Equals the chance that a
//                                     random positive outscores a random negative, ties counting 1/2.
//                                     It only reads the ORDER of the scores.
//     prCurve(scores, labels)      -> [{ threshold, recall, precision }]: first the anchor
//                                     (Infinity, recall 0, precision 1), then one point per distinct
//                                     score in descending threshold order. Needs a positive.
//     averagePrecision(scores, labels)
//                                  -> sum over the curve of (recall step) * precision at that step
//                                     (the step form, not trapezoids). 1 = perfect ranking; a random
//                                     ranking scores about the prevalence.
//
//   Calibration (scores must be probabilities in [0, 1])
//     reliability(scores, labels, bins = 10)
//                                  -> bins equal-width bins on [0, 1] (a score of exactly 1 is in the
//                                     last bin), each { lo, hi, count, meanScore, observedRate };
//                                     meanScore and observedRate are null for an empty bin. A
//                                     calibrated model has meanScore ~ observedRate in every bin.
//     brier(scores, labels)        -> mean of (score - label)^2. Lower is better; it rewards both
//                                     ranking and calibration.
//     expectedCalibrationError(scores, labels, bins = 10)
//                                  -> sum over bins of (count / n) * |observedRate - meanScore|.
//     plattScale(scores, labels, { logit = false })
//                                  -> { a, b, logit, predict(score) } where predict(s) =
//                                     sigmoid(a * x + b), x = s, or x = log(s / (1 - s)) when
//                                     `logit` is true (scores clipped to [1e-6, 1 - 1e-6] first).
//                                     a and b are the maximum-likelihood fit (Newton's method).
//                                     With a > 0 it is a monotone map, so it never changes the AUC.
//
//   Cost
//     thresholdFromCosts(fpCost, fnCost)
//                                  -> fpCost / (fpCost + fnCost): the cut that minimises expected
//                                     cost IF the scores are calibrated probabilities. Both costs
//                                     must be >= 0 and not both 0.
//     costAtThreshold(scores, labels, t, { fpCost = 1, fnCost = 1 })
//                                  -> { threshold, tp, fp, tn, fn, cost, costPerCase } with
//                                     cost = fp * fpCost + fn * fnCost.
//     bestThreshold(scores, labels, costs)
//                                  -> the costAtThreshold result of the cheapest cut. Candidates are
//                                     every distinct score (flag score >= it) plus Infinity (flag
//                                     nothing); ties in cost go to the higher threshold. The minimum
//                                     cost is the same for any monotone transform of the scores
//                                     (same ranking, same possible cuts); only the threshold VALUE
//                                     that reaches it moves.
//     costCurve(scores, labels, costs, points = 101)
//                                  -> [{ threshold, cost }] on an even grid of thresholds in [0, 1].
//
//   Data
//     makeScoredData({ n = 400, prevalence = 0.3, separation = 2, calibration = "good", seed = 1 })
//                                  -> { scores, labels, logits, calibration, stretch }
//       Each case has a true log-odds z = separation * noise + offset (the offset is chosen so the
//       mean true probability equals `prevalence`), and its label is drawn with chance sigmoid(z).
//       The reported score is sigmoid(stretch * z): "good" stretch 1 (honest probabilities),
//       "overconfident" 2.5 (pushed toward 0 and 1), "underconfident" 0.4 (squeezed toward the
//       middle). The stretch is monotone, so the three calibrations of one seed share the SAME
//       labels, the SAME ranking and exactly the same AUC; only Brier, ECE and the best fixed
//       threshold differ. separation is clamped to [0, 3] and prevalence to [0.02, 0.98] so scores
//       stay distinct in floating point. `logits` is the true log-odds (what a perfect model knows).
import { rng, gauss } from './rng.js';
import { sigmoid } from './logistic.js';

function checkInputs(scores, labels, name) {
  if (!Array.isArray(scores) || !Array.isArray(labels)) throw new Error(`${name}: scores and labels must be arrays`);
  if (scores.length !== labels.length) throw new Error(`${name}: ${scores.length} scores but ${labels.length} labels`);
  if (scores.length === 0) throw new Error(`${name}: need at least one case`);
  const y = labels.map(v => {
    const n = Number(v);
    if (n !== 0 && n !== 1) throw new Error(`${name}: labels must be 0 or 1`);
    return n;
  });
  for (const s of scores) if (typeof s !== 'number' || !Number.isFinite(s)) throw new Error(`${name}: scores must be finite numbers`);
  return y;
}

// Cases ordered by descending score, then grouped by equal score.
function groupsByScore(scores, y) {
  const order = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
  const groups = [];
  for (const i of order) {
    const last = groups[groups.length - 1];
    if (last && last.score === scores[i]) { last.pos += y[i]; last.neg += 1 - y[i]; }
    else groups.push({ score: scores[i], pos: y[i], neg: 1 - y[i] });
  }
  return groups;
}

export function rocCurve(scores, labels) {
  const y = checkInputs(scores, labels, 'rocCurve');
  const P = y.reduce((a, v) => a + v, 0), N = y.length - P;
  if (P === 0 || N === 0) throw new Error('rocCurve: needs at least one positive and one negative case');
  const points = [{ threshold: Infinity, fpr: 0, tpr: 0 }];
  let tp = 0, fp = 0;
  for (const g of groupsByScore(scores, y)) {
    tp += g.pos; fp += g.neg;
    points.push({ threshold: g.score, fpr: fp / N, tpr: tp / P });
  }
  return points;
}

export function auc(scores, labels) {
  const pts = rocCurve(scores, labels);
  let area = 0;
  for (let i = 1; i < pts.length; i++) area += (pts[i].fpr - pts[i - 1].fpr) * (pts[i].tpr + pts[i - 1].tpr) / 2;
  return area;
}

export function prCurve(scores, labels) {
  const y = checkInputs(scores, labels, 'prCurve');
  const P = y.reduce((a, v) => a + v, 0);
  if (P === 0) throw new Error('prCurve: needs at least one positive case');
  const points = [{ threshold: Infinity, recall: 0, precision: 1 }];
  let tp = 0, fp = 0;
  for (const g of groupsByScore(scores, y)) {
    tp += g.pos; fp += g.neg;
    points.push({ threshold: g.score, recall: tp / P, precision: tp / (tp + fp) });
  }
  return points;
}

export function averagePrecision(scores, labels) {
  const pts = prCurve(scores, labels);
  let ap = 0;
  for (let i = 1; i < pts.length; i++) ap += (pts[i].recall - pts[i - 1].recall) * pts[i].precision;
  return ap;
}

function checkProbabilities(scores, name) {
  for (const s of scores) if (s < 0 || s > 1) throw new Error(`${name}: scores must be probabilities in [0, 1]`);
}

function checkBins(bins, name) {
  if (!Number.isInteger(bins) || bins < 1) throw new Error(`${name}: bins must be a positive integer`);
}

export function reliability(scores, labels, bins = 10) {
  const y = checkInputs(scores, labels, 'reliability');
  checkBins(bins, 'reliability');
  checkProbabilities(scores, 'reliability');
  const out = Array.from({ length: bins }, (_, k) => ({
    lo: k / bins, hi: (k + 1) / bins, count: 0, meanScore: null, observedRate: null, _s: 0, _y: 0,
  }));
  scores.forEach((s, i) => {
    const b = out[Math.min(bins - 1, Math.floor(s * bins))];
    b.count++; b._s += s; b._y += y[i];
  });
  return out.map(({ lo, hi, count, _s, _y }) => ({
    lo, hi, count,
    meanScore: count ? _s / count : null,
    observedRate: count ? _y / count : null,
  }));
}

export function brier(scores, labels) {
  const y = checkInputs(scores, labels, 'brier');
  checkProbabilities(scores, 'brier');
  let sum = 0;
  scores.forEach((s, i) => { sum += (s - y[i]) ** 2; });
  return sum / scores.length;
}

export function expectedCalibrationError(scores, labels, bins = 10) {
  const table = reliability(scores, labels, bins);
  let ece = 0;
  for (const b of table) if (b.count) ece += (b.count / scores.length) * Math.abs(b.observedRate - b.meanScore);
  return ece;
}

const logitOf = s => {
  const p = Math.min(1 - 1e-6, Math.max(1e-6, s));
  return Math.log(p / (1 - p));
};

// Logistic regression on one feature (slope a, intercept b) by Newton's method with step halving.
// A tiny ridge on the slope keeps a perfectly separable sample finite.
export function plattScale(scores, labels, { logit = false } = {}) {
  const y = checkInputs(scores, labels, 'plattScale');
  const x = logit ? scores.map(logitOf) : scores.slice();
  const ridge = 1e-6, n = x.length;
  const loss = (a, b) => {
    let l = 0.5 * ridge * a * a;
    for (let i = 0; i < n; i++) {
      const z = a * x[i] + b;
      l += Math.max(z, 0) - y[i] * z + Math.log1p(Math.exp(-Math.abs(z)));
    }
    return l;
  };
  const rate = Math.min(1 - 1e-6, Math.max(1e-6, y.reduce((s, v) => s + v, 0) / n));
  let a = 0, b = Math.log(rate / (1 - rate)), current = loss(a, b);
  for (let iter = 0; iter < 100; iter++) {
    let ga = ridge * a, gb = 0, haa = ridge, hab = 0, hbb = 0;
    for (let i = 0; i < n; i++) {
      const p = sigmoid(a * x[i] + b), r = p - y[i], w = p * (1 - p) + 1e-12;
      ga += r * x[i]; gb += r;
      haa += w * x[i] * x[i]; hab += w * x[i]; hbb += w;
    }
    const det = haa * hbb - hab * hab;
    if (!(det > 0)) break;
    const da = (hbb * ga - hab * gb) / det, db = (haa * gb - hab * ga) / det;
    let step = 1, moved = false;
    for (let h = 0; h < 40; h++, step /= 2) {
      const next = loss(a - step * da, b - step * db);
      if (next <= current) { a -= step * da; b -= step * db; current = next; moved = true; break; }
    }
    if (!moved || Math.abs(step * da) + Math.abs(step * db) < 1e-12) break;
  }
  return { a, b, logit, predict: s => sigmoid(a * (logit ? logitOf(s) : s) + b) };
}

export function thresholdFromCosts(fpCost, fnCost) {
  if (!(fpCost >= 0) || !(fnCost >= 0) || !(fpCost + fnCost > 0)) {
    throw new Error('thresholdFromCosts: costs must be >= 0 and not both 0');
  }
  return fpCost / (fpCost + fnCost);
}

function checkCosts({ fpCost = 1, fnCost = 1 } = {}, name) {
  if (!(fpCost >= 0) || !(fnCost >= 0)) throw new Error(`${name}: costs must be >= 0`);
  return { fpCost, fnCost };
}

function tally(scores, y, t, { fpCost, fnCost }) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (let i = 0; i < scores.length; i++) {
    const flagged = scores[i] >= t;
    if (flagged) { if (y[i]) tp++; else fp++; } else if (y[i]) fn++; else tn++;
  }
  const cost = fp * fpCost + fn * fnCost;
  return { threshold: t, tp, fp, tn, fn, cost, costPerCase: cost / scores.length };
}

export function costAtThreshold(scores, labels, t, costs = {}) {
  const y = checkInputs(scores, labels, 'costAtThreshold');
  return tally(scores, y, t, checkCosts(costs, 'costAtThreshold'));
}

export function bestThreshold(scores, labels, costs = {}) {
  const y = checkInputs(scores, labels, 'bestThreshold');
  const c = checkCosts(costs, 'bestThreshold');
  let best = tally(scores, y, Infinity, c);
  let tp = 0, fp = 0;
  const P = y.reduce((a, v) => a + v, 0);
  for (const g of groupsByScore(scores, y)) {
    tp += g.pos; fp += g.neg;
    const cost = fp * c.fpCost + (P - tp) * c.fnCost;
    if (cost < best.cost) best = tally(scores, y, g.score, c);
  }
  return best;
}

export function costCurve(scores, labels, costs = {}, points = 101) {
  const y = checkInputs(scores, labels, 'costCurve');
  const c = checkCosts(costs, 'costCurve');
  if (!Number.isInteger(points) || points < 2) throw new Error('costCurve: points must be an integer >= 2');
  return Array.from({ length: points }, (_, k) => {
    const t = k / (points - 1);
    return { threshold: t, cost: tally(scores, y, t, c).cost };
  });
}

export const CALIBRATION_STRETCH = { good: 1, overconfident: 2.5, underconfident: 0.4 };

export function makeScoredData({ n = 400, prevalence = 0.3, separation = 2, calibration = 'good', seed = 1 } = {}) {
  const stretch = CALIBRATION_STRETCH[calibration];
  if (stretch === undefined) throw new Error('makeScoredData: calibration must be "good", "overconfident" or "underconfident"');
  const count = Math.max(2, Math.round(n));
  const prev = Math.min(0.98, Math.max(0.02, prevalence));
  const sep = Math.min(3, Math.max(0, separation));
  // The random draws for case i never depend on the settings, so changing a setting moves
  // the same cases instead of redrawing them.
  const random = rng(seed);
  const noise = [], coin = [];
  for (let i = 0; i < count; i++) { noise.push(gauss(random) * sep); coin.push(random()); }
  // Offset so the mean true probability of THIS sample equals the requested prevalence.
  let lo = -40, hi = 40;
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    const mean = noise.reduce((s, z) => s + sigmoid(z + mid), 0) / count;
    if (mean < prev) lo = mid; else hi = mid;
  }
  const offset = (lo + hi) / 2;
  const logits = noise.map(z => z + offset);
  const labels = logits.map((z, i) => (coin[i] < sigmoid(z) ? 1 : 0));
  // Keep both classes: promote the likeliest negative / demote the least likely positive.
  const total = labels.reduce((a, v) => a + v, 0);
  if (total === 0) labels[logits.indexOf(Math.max(...logits))] = 1;
  else if (total === count) labels[logits.indexOf(Math.min(...logits))] = 0;
  return { scores: logits.map(z => sigmoid(stretch * z)), labels, logits, calibration, stretch };
}
