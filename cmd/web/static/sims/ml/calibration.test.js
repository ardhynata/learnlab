import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rocCurve, auc, prCurve, averagePrecision, reliability, brier, expectedCalibrationError,
  plattScale, thresholdFromCosts, costAtThreshold, bestThreshold, costCurve, makeScoredData,
} from './calibration.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

// Six cases, hand-worked. Positives: .9 .8 .6. Negatives: .7 .4 .3.
const S6 = [0.9, 0.8, 0.7, 0.6, 0.4, 0.3];
const Y6 = [1, 1, 0, 1, 0, 0];

test('rocCurve: six scored cases, every point by hand', () => {
  const pts = rocCurve(S6, Y6);
  const want = [[Infinity, 0, 0], [0.9, 0, 1 / 3], [0.8, 0, 2 / 3], [0.7, 1 / 3, 2 / 3], [0.6, 1 / 3, 1], [0.4, 2 / 3, 1], [0.3, 1, 1]];
  assert.equal(pts.length, want.length);
  want.forEach(([threshold, fpr, tpr], i) => {
    assert.equal(pts[i].threshold, threshold);
    close(pts[i].fpr, fpr); close(pts[i].tpr, tpr);
  });
});

test('auc: 8/9 for the six cases (8 of the 9 positive-negative pairs are ranked right)', () => {
  close(auc(S6, Y6), 8 / 9);
  // The order of the input rows does not matter.
  close(auc([...S6].reverse(), [...Y6].reverse()), 8 / 9);
  // Perfect, reversed and boolean labels.
  close(auc([0.1, 0.2, 0.8, 0.9], [0, 0, 1, 1]), 1);
  close(auc([0.1, 0.2, 0.8, 0.9], [1, 1, 0, 0]), 0);
  close(auc([0.1, 0.2, 0.8, 0.9], [false, false, true, true]), 1);
});

test('rocCurve / auc: tied scores are crossed together (AUC 1/2 for one shared score)', () => {
  const pts = rocCurve([0.5, 0.5, 0.5, 0.5], [1, 0, 1, 0]);
  assert.equal(pts.length, 2);
  assert.deepEqual([pts[1].fpr, pts[1].tpr], [1, 1]);
  close(auc([0.5, 0.5, 0.5, 0.5], [1, 0, 1, 0]), 0.5);
  // One tie across classes: positives .9 .5, negatives .5 .1 -> 3 wins + 1 tie of 4 pairs = 0.875.
  close(auc([0.9, 0.5, 0.5, 0.1], [1, 1, 0, 0]), 0.875);
});

test('rocCurve / prCurve / bestThreshold reject unusable input', () => {
  assert.throws(() => rocCurve([0.1, 0.9], [1, 1]), /positive and one negative/);
  assert.throws(() => auc([0.1, 0.9], [0, 0]), /positive and one negative/);
  assert.throws(() => prCurve([0.1, 0.9], [0, 0]), /positive/);
  assert.throws(() => rocCurve([0.1, 0.9], [1]), /2 scores but 1 labels/);
  assert.throws(() => rocCurve([0.1, NaN], [0, 1]), /finite/);
  assert.throws(() => rocCurve([0.1, 0.9], [0, 2]), /0 or 1/);
  assert.throws(() => brier([], []), /at least one/);
});

test('prCurve and averagePrecision: six cases by hand', () => {
  const pts = prCurve(S6, Y6);
  const want = [[Infinity, 0, 1], [0.9, 1 / 3, 1], [0.8, 2 / 3, 1], [0.7, 2 / 3, 2 / 3], [0.6, 1, 3 / 4], [0.4, 1, 3 / 5], [0.3, 1, 1 / 2]];
  assert.equal(pts.length, want.length);
  want.forEach(([threshold, recall, precision], i) => {
    assert.equal(pts[i].threshold, threshold);
    close(pts[i].recall, recall); close(pts[i].precision, precision);
  });
  // 1/3 * 1 + 1/3 * 1 + 1/3 * 3/4 = 11/12
  close(averagePrecision(S6, Y6), 11 / 12);
  close(averagePrecision([0.1, 0.2, 0.8, 0.9], [0, 0, 1, 1]), 1);
});

test('averagePrecision: a useless ranking scores about the prevalence, AUC about 1/2', () => {
  const d = makeScoredData({ n: 4000, prevalence: 0.2, separation: 0, seed: 5 });
  assert.ok(Math.abs(auc(d.scores, d.labels) - 0.5) < 0.05);
  assert.ok(Math.abs(averagePrecision(d.scores, d.labels) - 0.2) < 0.05);
});

test('reliability: a two-bin table by hand', () => {
  const scores = [0.1, 0.2, 0.3, 0.7, 0.8, 0.9], labels = [0, 0, 1, 0, 1, 1];
  const t = reliability(scores, labels, 2);
  assert.equal(t.length, 2);
  assert.deepEqual([t[0].lo, t[0].hi, t[0].count], [0, 0.5, 3]);
  assert.deepEqual([t[1].lo, t[1].hi, t[1].count], [0.5, 1, 3]);
  close(t[0].meanScore, 0.2); close(t[0].observedRate, 1 / 3);
  close(t[1].meanScore, 0.8); close(t[1].observedRate, 2 / 3);
  // ECE = 1/2 * |1/3 - 0.2| + 1/2 * |2/3 - 0.8| = 2/15
  close(expectedCalibrationError(scores, labels, 2), 2 / 15);
});

test('reliability: empty bins are null, a score of 1 lands in the last bin, counts add up', () => {
  const t = reliability([0.05, 0.05, 1], [0, 1, 1], 5);
  assert.equal(t.length, 5);
  assert.equal(t[0].count, 2); close(t[0].observedRate, 0.5);
  assert.equal(t[1].count, 0); assert.equal(t[1].meanScore, null); assert.equal(t[1].observedRate, null);
  assert.equal(t[4].count, 1); assert.equal(t[4].observedRate, 1);
  assert.equal(t.reduce((a, b) => a + b.count, 0), 3);
  assert.throws(() => reliability([0.5], [1], 0), /bins/);
  assert.throws(() => reliability([1.5], [1], 5), /probabilities/);
});

test('brier: by hand, and the two extremes', () => {
  // (0.1^2 + 0.2^2 + 0.7^2 + 0.7^2 + 0.2^2 + 0.1^2) / 6 = 1.08 / 6
  close(brier([0.1, 0.2, 0.3, 0.7, 0.8, 0.9], [0, 0, 1, 0, 1, 1]), 0.18);
  close(brier([0, 1, 1], [0, 1, 1]), 0);
  close(brier([1, 0], [0, 1]), 1);
  close(brier([0.5, 0.5], [0, 1]), 0.25);
});

test('thresholdFromCosts: fp / (fp + fn)', () => {
  close(thresholdFromCosts(1, 1), 0.5);
  close(thresholdFromCosts(1, 4), 0.2);
  close(thresholdFromCosts(9, 1), 0.9);
  close(thresholdFromCosts(0, 3), 0);
  assert.throws(() => thresholdFromCosts(0, 0), /not both 0/);
  assert.throws(() => thresholdFromCosts(-1, 2), />= 0/);
});

test('costAtThreshold: counts and cost by hand on the six cases', () => {
  // t = 0.65 flags .9 .8 .7: tp 2, fp 1; misses .6 (fn 1); .4 .3 are tn 2.
  const r = costAtThreshold(S6, Y6, 0.65, { fpCost: 1, fnCost: 5 });
  assert.deepEqual([r.tp, r.fp, r.tn, r.fn], [2, 1, 2, 1]);
  assert.equal(r.cost, 1 * 1 + 1 * 5);
  close(r.costPerCase, 1);
  assert.equal(r.threshold, 0.65);
  // A score equal to the threshold is flagged.
  assert.equal(costAtThreshold(S6, Y6, 0.6, { fpCost: 1, fnCost: 5 }).tp, 3);
  // Default costs are 1 and 1; flagging nothing misses every positive.
  assert.equal(costAtThreshold(S6, Y6, 2).cost, 3);
  assert.equal(costAtThreshold(S6, Y6, 0).cost, 3);
});

test('bestThreshold: finds the cheapest cut for different cost ratios', () => {
  // Cuts and their (fp, fn): none (0,3) | .9 (0,2) | .8 (0,1) | .7 (1,1) | .6 (1,0) | .4 (2,0) | .3 (3,0)
  let b = bestThreshold(S6, Y6, { fpCost: 1, fnCost: 1 });
  assert.equal(b.cost, 1); assert.equal(b.threshold, 0.8); // (0,1) and (1,0) tie at 1; the higher cut wins
  b = bestThreshold(S6, Y6, { fpCost: 1, fnCost: 10 });
  assert.equal(b.cost, 1); assert.equal(b.threshold, 0.6);
  b = bestThreshold(S6, Y6, { fpCost: 10, fnCost: 1 }); // (0,1) costs 1, (0,2) costs 2, any fp costs 10+
  assert.equal(b.cost, 1); assert.equal(b.threshold, 0.8);
  b = bestThreshold(S6, Y6, { fpCost: 10, fnCost: 0 });
  assert.equal(b.cost, 0); assert.equal(b.threshold, Infinity); // flag nothing
  assert.deepEqual([b.tp, b.fp, b.tn, b.fn], [0, 0, 3, 3]);
  // The result matches costAtThreshold at the same cut.
  const c = costAtThreshold(S6, Y6, 0.6, { fpCost: 1, fnCost: 10 });
  assert.deepEqual(bestThreshold(S6, Y6, { fpCost: 1, fnCost: 10 }), c);
});

test('costCurve: an even grid whose entries match costAtThreshold', () => {
  const curve = costCurve(S6, Y6, { fpCost: 1, fnCost: 2 }, 11);
  assert.equal(curve.length, 11);
  close(curve[0].threshold, 0); close(curve[10].threshold, 1);
  for (const p of curve) assert.equal(p.cost, costAtThreshold(S6, Y6, p.threshold, { fpCost: 1, fnCost: 2 }).cost);
  assert.equal(curve[0].cost, 3); // flag everything: 3 false positives
  assert.equal(curve[10].cost, 6); // flag nothing (nothing reaches 1.0): 3 misses * 2
});

test('plattScale: recovers the exact maximum-likelihood line on a two-valued score', () => {
  // score 0: 1 of 4 positive, score 1: 3 of 4 positive -> p(0) = 1/4, p(1) = 3/4.
  const m = plattScale([0, 0, 0, 0, 1, 1, 1, 1], [1, 0, 0, 0, 1, 1, 1, 0]);
  close(m.b, -Math.log(3), 1e-4);
  close(m.a, 2 * Math.log(3), 1e-4);
  close(m.predict(0), 0.25, 1e-5);
  close(m.predict(1), 0.75, 1e-5);
  assert.equal(m.logit, false);
});

test('plattScale: a separable sample stays finite', () => {
  const m = plattScale([0.1, 0.2, 0.8, 0.9], [0, 0, 1, 1]);
  assert.ok(Number.isFinite(m.a) && Number.isFinite(m.b) && m.a > 0);
  assert.ok(m.predict(0.9) > 0.9 && m.predict(0.1) < 0.1);
});

test('makeScoredData: reproducible, labelled, and the prevalence is honoured', () => {
  const a = makeScoredData({ n: 500, prevalence: 0.3, seed: 4 });
  assert.deepEqual(a, makeScoredData({ n: 500, prevalence: 0.3, seed: 4 }));
  assert.notDeepEqual(a.scores, makeScoredData({ n: 500, prevalence: 0.3, seed: 5 }).scores);
  assert.equal(a.scores.length, 500); assert.equal(a.labels.length, 500);
  assert.ok(a.scores.every(s => s > 0 && s < 1));
  const rate = a.labels.reduce((x, v) => x + v, 0) / 500;
  assert.ok(Math.abs(rate - 0.3) < 0.07, `rate ${rate}`);
  // The mean TRUE probability is the requested prevalence exactly (up to the bisection).
  const meanP = a.logits.reduce((x, z) => x + 1 / (1 + Math.exp(-z)), 0) / 500;
  close(meanP, 0.3, 1e-9);
  assert.throws(() => makeScoredData({ calibration: 'bogus' }), /calibration/);
  // Both classes always exist, even for a tiny sample at a tiny prevalence.
  const tiny = makeScoredData({ n: 3, prevalence: 0.02, seed: 2 });
  assert.ok(tiny.labels.includes(0) && tiny.labels.includes(1));
});

test('makeScoredData: three calibrations share the labels and the ranking, so the AUC is identical', () => {
  const sets = ['good', 'overconfident', 'underconfident']
    .map(calibration => makeScoredData({ n: 2000, prevalence: 0.3, separation: 2, calibration, seed: 7 }));
  assert.deepEqual(sets[0].labels, sets[1].labels);
  assert.deepEqual(sets[0].labels, sets[2].labels);
  const [good, over, under] = sets;
  assert.equal(auc(good.scores, good.labels), auc(over.scores, over.labels));
  assert.equal(auc(good.scores, good.labels), auc(under.scores, under.labels));
  assert.equal(averagePrecision(good.scores, good.labels), averagePrecision(over.scores, over.labels));
  assert.ok(auc(good.scores, good.labels) > 0.8, 'the ranking is genuinely informative');
  // Different calibration, though: Brier and ECE separate them.
  const b = sets.map(d => brier(d.scores, d.labels));
  const e = sets.map(d => expectedCalibrationError(d.scores, d.labels));
  assert.ok(b[0] < b[1] && b[0] < b[2], `brier ${b}`);
  assert.ok(e[0] < 0.05 && e[1] > 0.08 && e[2] > 0.08, `ece ${e}`);
  // Overconfident scores sit further from 1/2 than good ones, underconfident closer, case by case.
  assert.ok(good.scores.every((s, i) => Math.abs(over.scores[i] - 0.5) >= Math.abs(s - 0.5)));
  assert.ok(good.scores.every((s, i) => Math.abs(under.scores[i] - 0.5) <= Math.abs(s - 0.5)));
});

test('same ranking, different cost behaviour: the cost-derived threshold works only for calibrated scores', () => {
  const costs = { fpCost: 1, fnCost: 4 };
  const t = thresholdFromCosts(costs.fpCost, costs.fnCost); // 0.2
  const [good, over, under] = ['good', 'overconfident', 'underconfident']
    .map(calibration => makeScoredData({ n: 2000, prevalence: 0.3, separation: 2, calibration, seed: 7 }));
  const best = [good, over, under].map(d => bestThreshold(d.scores, d.labels, costs));
  // Same ranking: the cheapest reachable cut costs the same, whatever the calibration...
  assert.equal(best[0].cost, best[1].cost);
  assert.equal(best[0].cost, best[2].cost);
  // ...but the threshold VALUE that reaches it moves with the transform.
  assert.ok(best[1].threshold < best[0].threshold && best[0].threshold < best[2].threshold,
    `thresholds ${best.map(b => b.threshold)}`);
  // Using the textbook threshold fp/(fp+fn): near-optimal when calibrated, worse otherwise.
  const at = [good, over, under].map(d => costAtThreshold(d.scores, d.labels, t, costs).cost);
  assert.ok(at[0] - best[0].cost <= 0.05 * best[0].cost, `good ${at[0]} vs ${best[0].cost}`);
  assert.ok(at[1] > at[0] && at[2] > at[0], `costs ${at}`);
  assert.ok(at[1] - best[1].cost > 0.1 * best[1].cost, 'overconfident scores overpay');
  assert.ok(at[2] - best[2].cost > 0.1 * best[2].cost, 'underconfident scores overpay');
});

test('plattScale (log-odds form) repairs a miscalibrated score without touching its ranking', () => {
  const costs = { fpCost: 1, fnCost: 4 };
  const t = thresholdFromCosts(1, 4);
  const over = makeScoredData({ n: 2000, prevalence: 0.3, separation: 2, calibration: 'overconfident', seed: 7 });
  const m = plattScale(over.scores, over.labels, { logit: true });
  assert.ok(m.a > 0 && m.a < 1, `slope ${m.a} should shrink the 2.5x stretch`);
  const fixed = over.scores.map(m.predict);
  assert.equal(auc(fixed, over.labels), auc(over.scores, over.labels));
  assert.ok(brier(fixed, over.labels) < brier(over.scores, over.labels));
  assert.ok(expectedCalibrationError(fixed, over.labels) < 0.5 * expectedCalibrationError(over.scores, over.labels));
  // After the repair the cost-derived threshold is near-optimal again.
  const best = bestThreshold(fixed, over.labels, costs).cost;
  const at = costAtThreshold(fixed, over.labels, t, costs).cost;
  assert.ok(at - best <= 0.05 * best, `${at} vs ${best}`);
  // The same fix applied to underconfident scores stretches them (slope above 1).
  const under = makeScoredData({ n: 2000, prevalence: 0.3, separation: 2, calibration: 'underconfident', seed: 7 });
  assert.ok(plattScale(under.scores, under.labels, { logit: true }).a > 1);
  // Applied to honest scores it changes little.
  const good = makeScoredData({ n: 2000, prevalence: 0.3, separation: 2, calibration: 'good', seed: 7 });
  const g = plattScale(good.scores, good.labels, { logit: true });
  assert.ok(Math.abs(g.a - 1) < 0.2 && Math.abs(g.b) < 0.2, `a ${g.a} b ${g.b}`);
});
