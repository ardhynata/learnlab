import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PREDICTORS, scoredCases, scoresFor, recalibrate, buildPredictors, costThreshold, summarize, halfDecisions,
} from './calibrationlab.js';
import { auc, brier, expectedCalibrationError, thresholdFromCosts } from './calibration.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const mean = xs => xs.reduce((s, v) => s + v, 0) / xs.length;

// Six cases, hand-worked. Positives: .9 .8 .6. Negatives: .7 .4 .3.
const S6 = [0.9, 0.8, 0.7, 0.6, 0.4, 0.3];
const Y6 = [1, 1, 0, 1, 0, 0];

test('summarize: six cases at 0.5 with a false positive costing 1 and a false negative 5, by hand', () => {
  const r = summarize(S6, Y6, { threshold: 0.5, fpCost: 1, fnCost: 5 });
  // Flagged: .9 .8 .7 .6 -> 3 true positives and 1 false positive; nothing missed.
  assert.deepEqual([r.flagged, r.tp, r.fp, r.tn, r.fn], [4, 3, 1, 2, 0]);
  close(r.cost, 1); close(r.costPerCase, 1 / 6);
  // Brier: (0.1^2 + 0.2^2 + 0.7^2 + 0.4^2 + 0.4^2 + 0.3^2) / 6 = 0.95 / 6.
  close(r.brier, 0.95 / 6);
  close(r.auc, 8 / 9);
  // The cheapest cut is 0.6 (cost 1); the cut at 0.4 would cost 2 and at 0.8 would cost 5.
  assert.equal(r.best.threshold, 0.6);
  close(r.best.costPerCase, 1 / 6);
});

test('summarize: a threshold above every score flags nothing and every positive is missed', () => {
  const r = summarize(S6, Y6, { threshold: 0.95, fpCost: 1, fnCost: 5 });
  assert.deepEqual([r.flagged, r.fn, r.tn], [0, 3, 3]);
  close(r.cost, 15);
});

test('costThreshold: false-positive share of the two costs, and null when both are 0', () => {
  close(costThreshold(1, 5), 1 / 6);
  close(costThreshold(1, 1), 0.5);
  close(costThreshold(1, 5), thresholdFromCosts(1, 5));
  assert.equal(costThreshold(0, 0), null);
  assert.equal(costThreshold(0, 3), 0);
});

test('scoredCases: prevalence from 1% to 50%, both classes present, same sample for the same seed', () => {
  for (const p of [0.01, 0.05, 0.2, 0.5]) {
    const { labels, logits } = scoredCases({ n: 3000, prevalence: p, seed: 4 });
    const positives = labels.reduce((a, v) => a + v, 0);
    assert.ok(positives > 0 && positives < labels.length);
    // The mean TRUE probability is the requested prevalence; the sampled share is close to it.
    const trueMean = mean(logits.map(z => 1 / (1 + Math.exp(-z))));
    close(trueMean, p, 1e-9);
    assert.ok(Math.abs(positives / labels.length - p) < 0.03, `share ${positives / labels.length} for ${p}`);
  }
  const a = scoredCases({ n: 200, prevalence: 0.3, seed: 9 }), b = scoredCases({ n: 200, prevalence: 0.3, seed: 9 });
  assert.deepEqual(a.labels, b.labels);
  assert.deepEqual(a.logits, b.logits);
  // Below the range it is clamped to 1%, not 0.
  const low = scoredCases({ n: 2000, prevalence: 0, seed: 2 });
  close(mean(low.logits.map(z => 1 / (1 + Math.exp(-z)))), 0.01, 1e-9);
});

test('the three predictors share labels and ranking: equal AUC at every prevalence, even recalibrated', () => {
  for (const prevalence of [0.01, 0.1, 0.5]) {
    for (const recalibrated of [false, true]) {
      const { labels, predictors } = buildPredictors({ prevalence, seed: 3, recalibrated });
      assert.deepEqual(predictors.map(p => p.key), PREDICTORS);
      const aucs = predictors.map(p => auc(p.scores, labels));
      close(aucs[1], aucs[0], 1e-12); close(aucs[2], aucs[0], 1e-12);
      assert.ok(aucs[0] > 0.6 && aucs[0] < 0.95, `auc ${aucs[0]}`);
    }
  }
});

test('calibration: good has the smallest Brier and error, and the two distorted ones differ from it', () => {
  const { labels, predictors } = buildPredictors({ n: 4000, prevalence: 0.3, seed: 5 });
  const [good, over, under] = predictors;
  const b = predictors.map(p => brier(p.scores, labels)), e = predictors.map(p => expectedCalibrationError(p.scores, labels));
  assert.ok(b[0] < b[1] && b[0] < b[2], `brier ${b}`);
  assert.ok(e[0] < 0.05, `good ece ${e[0]}`);
  assert.ok(e[1] > 0.1 && e[2] > 0.1, `ece ${e}`);
  // Overconfident pushes scores to the ends, underconfident squeezes them to the middle.
  const spread = p => Math.max(...p.scores) - Math.min(...p.scores);
  assert.ok(spread(over) > spread(good) && spread(good) > spread(under));
});

test('recalibrate: Platt scaling on a separate sample recovers the honest probabilities', () => {
  const sample = buildPredictors({ n: 4000, prevalence: 0.3, seed: 6 });
  const fixed = buildPredictors({ n: 4000, prevalence: 0.3, seed: 6, recalibrated: true });
  // The overconfident map undoes the stretch of 2.5 (slope about 1 / 2.5), the underconfident one stretches by 2.5.
  assert.ok(Math.abs(fixed.predictors[1].a - 1 / 2.5) < 0.1, `a ${fixed.predictors[1].a}`);
  assert.ok(Math.abs(fixed.predictors[2].a - 2.5) < 0.5, `a ${fixed.predictors[2].a}`);
  for (const i of [1, 2]) {
    const before = expectedCalibrationError(sample.predictors[i].scores, sample.labels);
    const after = expectedCalibrationError(fixed.predictors[i].scores, fixed.labels);
    assert.ok(after < before / 2 && after < 0.06, `ece ${before} -> ${after}`);
  }
});

test('recalibrate: a map with a positive slope never changes the order', () => {
  const { labels, logits } = scoredCases({ n: 500, prevalence: 0.4, seed: 8 });
  const scores = scoresFor(logits, 'overconfident');
  const r = recalibrate({ scores, labels }, scores);
  assert.ok(r.a > 0);
  const order = xs => xs.map((_, i) => i).sort((p, q) => xs[p] - xs[q]);
  assert.deepEqual(order(r.scores), order(scores));
});

test('halfDecisions: a stretch keeps 0.5 where it is, so the three agree at 0.5 on every case', () => {
  const { predictors } = buildPredictors({ n: 1000, prevalence: 0.2, seed: 1 });
  const h = halfDecisions(predictors);
  assert.equal(h.same, true);
  assert.equal(h.differing, 0);
  assert.equal(h.flagged[0], h.flagged[1]);
  assert.equal(h.flagged[0], h.flagged[2]);
  // A map that shifts the scores breaks the tie: add 0.1 to one predictor and a few cases flip.
  const shifted = { ...predictors[1], scores: predictors[1].scores.map(s => Math.min(1, s + 0.1)) };
  const mixed = halfDecisions([predictors[0], shifted]);
  assert.equal(mixed.same, false);
  assert.ok(mixed.differing > 0);
  assert.ok(mixed.flagged[1] > mixed.flagged[0]);
});

test('at the cost-based cut the three split, yet every predictor reaches the same lowest cost at its own best cut', () => {
  const { labels, predictors } = buildPredictors({ n: 2000, prevalence: 0.2, seed: 1 });
  const t = costThreshold(1, 5);
  const rows = predictors.map(p => summarize(p.scores, labels, { threshold: t, fpCost: 1, fnCost: 5 }));
  // Same ranking, so the same possible cuts and the same cheapest cost; only the cut's value moves.
  close(rows[1].best.costPerCase, rows[0].best.costPerCase, 1e-12);
  close(rows[2].best.costPerCase, rows[0].best.costPerCase, 1e-12);
  assert.notEqual(rows[1].best.threshold, rows[0].best.threshold);
  assert.notEqual(rows[2].best.threshold, rows[0].best.threshold);
  // Honest probabilities: the cost-based cut costs the least for the good predictor and the two distorted ones pay extra.
  assert.ok(rows[0].costPerCase <= rows[1].costPerCase && rows[0].costPerCase <= rows[2].costPerCase);
  assert.ok(rows[1].costPerCase > rows[1].best.costPerCase && rows[2].costPerCase > rows[2].best.costPerCase);
  assert.notEqual(rows[1].flagged, rows[0].flagged);
  assert.notEqual(rows[2].flagged, rows[0].flagged);
});
