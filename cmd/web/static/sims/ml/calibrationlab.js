// Pure logic for the calibration lab (sims/labs/calibration-lab.js): three predictors that score the SAME
// cases in the SAME order (so the same AUC) but with different calibration, an optional Platt recalibration,
// and the decision numbers at a threshold. Builds on sims/ml/calibration.js; tested in calibrationlab.test.js.
//
// API
//   PREDICTORS                     -> ['good', 'overconfident', 'underconfident']: the order the lab shows them in.
//   PREVALENCE_MIN / PREVALENCE_MAX -> 0.01 / 0.5, the range of the lab's prevalence slider.
//   scoredCases({ n, prevalence, separation, seed })
//                                  -> { labels, logits }: n cases with a true log-odds each and a 0/1 label drawn
//                                     with chance sigmoid(logit). The offset is chosen so the mean true probability
//                                     is `prevalence`. Same draws as makeScoredData in calibration.js, but the
//                                     prevalence may go down to 1% (makeScoredData stops at 2%).
//   scoresFor(logits, calibration) -> sigmoid(stretch * logit) with the stretch of calibration.js
//                                     (good 1, overconfident 2.5, underconfident 0.4): a monotone map, so the three
//                                     predictors rank the cases identically.
//   recalibrate(fit, scores)       -> Platt scaling fitted on `fit` ({ scores, labels }, a SEPARATE set of cases)
//                                     and applied to `scores`: { scores, a, b }. Uses the logit of each score, without
//                                     the 1e-6 clip of plattScale().predict, so extreme scores stay distinct and a > 0
//                                     keeps the order exactly.
//   buildPredictors({ n, prevalence, separation, seed, recalibrated, fitN })
//                                  -> { labels, predictors: [{ key, scores, a, b }] } the three predictors on one
//                                     sample; with `recalibrated` each is Platt-scaled on a second, independent sample.
//   costThreshold(fpCost, fnCost)  -> fpCost / (fpCost + fnCost), or null when both costs are 0.
//   summarize(scores, labels, { threshold, fpCost, fnCost })
//                                  -> { auc, brier, ece, flagged, tp, fp, tn, fn, cost, costPerCase, best }
//                                     where best is the cheapest cut of THIS predictor ({ threshold, costPerCase, ... }).
//   halfDecisions(predictors)      -> { flagged: [n flagged at 0.5 per predictor], same: whether every case gets the
//                                     same decision from all of them, differing: how many cases get a mixed decision }.
import { sigmoid } from './logistic.js';
import { rng, gauss } from './rng.js';
import {
  CALIBRATION_STRETCH, auc, brier, expectedCalibrationError, plattScale, thresholdFromCosts, costAtThreshold, bestThreshold,
} from './calibration.js';

export const PREDICTORS = ['good', 'overconfident', 'underconfident'];
export const PREVALENCE_MIN = 0.01;
export const PREVALENCE_MAX = 0.5;

export function scoredCases({ n = 1000, prevalence = 0.2, separation = 2, seed = 1 } = {}) {
  const count = Math.max(2, Math.round(n));
  const prev = Math.min(PREVALENCE_MAX, Math.max(PREVALENCE_MIN, prevalence));
  const sep = Math.min(3, Math.max(0, separation));
  const random = rng(seed);
  const noise = [], coin = [];
  for (let i = 0; i < count; i++) { noise.push(gauss(random) * sep); coin.push(random()); }
  // Offset so the mean true probability of THIS sample is the requested prevalence.
  let lo = -40, hi = 40;
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    const mean = noise.reduce((s, z) => s + sigmoid(z + mid), 0) / count;
    if (mean < prev) lo = mid; else hi = mid;
  }
  const offset = (lo + hi) / 2;
  const logits = noise.map(z => z + offset);
  const labels = logits.map((z, i) => (coin[i] < sigmoid(z) ? 1 : 0));
  // Keep both classes so every curve is defined.
  const total = labels.reduce((a, v) => a + v, 0);
  if (total === 0) labels[logits.indexOf(Math.max(...logits))] = 1;
  else if (total === count) labels[logits.indexOf(Math.min(...logits))] = 0;
  return { labels, logits };
}

export function scoresFor(logits, calibration) {
  const stretch = CALIBRATION_STRETCH[calibration];
  if (stretch === undefined) throw new Error('scoresFor: unknown calibration');
  return logits.map(z => sigmoid(stretch * z));
}

// log(s / (1 - s)) for s strictly inside (0, 1); the two ends map to a large finite value.
const logit = s => (s <= 0 ? -37 : s >= 1 ? 37 : Math.log(s / (1 - s)));

export function recalibrate(fit, scores) {
  const { a, b } = plattScale(fit.scores, fit.labels, { logit: true });
  return { scores: scores.map(s => sigmoid(a * logit(s) + b)), a, b };
}

export function buildPredictors({ n = 1000, prevalence = 0.2, separation = 2, seed = 1, recalibrated = false, fitN = 3000 } = {}) {
  const data = scoredCases({ n, prevalence, separation, seed });
  // The fit sample is a different draw (another seed), so recalibrating is not graded on the cases it learned from.
  const fitData = recalibrated ? scoredCases({ n: fitN, prevalence, separation, seed: seed + 10007 }) : null;
  const predictors = PREDICTORS.map(key => {
    const scores = scoresFor(data.logits, key);
    if (!recalibrated) return { key, scores, a: 1, b: 0 };
    return { key, ...recalibrate({ scores: scoresFor(fitData.logits, key), labels: fitData.labels }, scores) };
  });
  return { labels: data.labels, predictors };
}

export const costThreshold = (fpCost, fnCost) => (fpCost + fnCost > 0 ? thresholdFromCosts(fpCost, fnCost) : null);

export function summarize(scores, labels, { threshold = 0.5, fpCost = 1, fnCost = 1 } = {}) {
  const costs = { fpCost, fnCost };
  const at = costAtThreshold(scores, labels, threshold, costs);
  const best = bestThreshold(scores, labels, costs);
  return {
    auc: auc(scores, labels), brier: brier(scores, labels), ece: expectedCalibrationError(scores, labels),
    flagged: at.tp + at.fp, tp: at.tp, fp: at.fp, tn: at.tn, fn: at.fn, cost: at.cost, costPerCase: at.costPerCase, best,
  };
}

export function halfDecisions(predictors) {
  const n = predictors[0].scores.length;
  const flagged = predictors.map(p => p.scores.filter(s => s >= 0.5).length);
  let differing = 0;
  for (let i = 0; i < n; i++) {
    const votes = predictors.filter(p => p.scores[i] >= 0.5).length;
    if (votes > 0 && votes < predictors.length) differing++;
  }
  return { flagged, same: differing === 0, differing };
}
