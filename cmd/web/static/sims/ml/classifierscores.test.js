import test from 'node:test';
import assert from 'node:assert/strict';
import { makeScores, fastRoc, histogram, accuracyTrap, normalCdf, theoreticalAuc, statusSentence, alwaysNoAccuracy } from './classifierscores.js';
import { confusion, scores as metricScores, atThreshold, rocCurve, auc } from './metrics.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);
const aucOf = ({ scores, actual }) => auc(fastRoc(scores, actual));

test('makeScores is deterministic for a seed and differs between seeds', () => {
  const a = makeScores({ n: 300, seed: 5 }), b = makeScores({ n: 300, seed: 5 }), c = makeScores({ n: 300, seed: 6 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.scores, c.scores);
});

test('makeScores respects the number of cases and the share of positives', () => {
  for (const [n, p, want] of [[1000, 0.1, 100], [1000, 0.01, 10], [2000, 0.5, 1000], [100, 0.05, 5]]) {
    const { scores, actual } = makeScores({ n, prevalence: p });
    assert.equal(scores.length, n);
    assert.equal(actual.length, n);
    assert.equal(actual.filter(Boolean).length, want);
  }
  const tiny = makeScores({ n: 100, prevalence: 0.001 });
  assert.equal(tiny.actual.filter(Boolean).length, 1, 'at least one positive is always kept');
  const all = makeScores({ n: 100, prevalence: 1 });
  assert.equal(all.actual.filter(Boolean).length, 99, 'at least one negative is always kept');
});

test('class means sit near 0 for negatives and near the separation for positives', () => {
  const { scores, actual } = makeScores({ n: 4000, prevalence: 0.5, separation: 3, seed: 3 });
  const mean = flag => { const v = scores.filter((_, i) => actual[i] === flag); return v.reduce((s, x) => s + x, 0) / v.length; };
  close(mean(true), 3, 0.12);
  close(mean(false), 0, 0.12);
});

test('changing the separation moves the same cases, so each positive shifts by exactly the change', () => {
  const a = makeScores({ n: 50, prevalence: 0.2, separation: 1, seed: 9 }), b = makeScores({ n: 50, prevalence: 0.2, separation: 2.5, seed: 9 });
  a.scores.forEach((s, i) => close(b.scores[i] - s, a.actual[i] ? 1.5 : 0, 1e-12));
});

test('AUC rises with separation', () => {
  const values = [0, 1, 2, 3].map(separation => aucOf(makeScores({ n: 3000, prevalence: 0.3, separation, seed: 11 })));
  for (let i = 1; i < values.length; i++) assert.ok(values[i] > values[i - 1], `AUC ${values}`);
  assert.ok(values[3] > 0.95);
});

test('AUC is about 0.5 with no separation, and follows the normal-theory value otherwise', () => {
  close(aucOf(makeScores({ n: 5000, prevalence: 0.5, separation: 0, seed: 2 })), 0.5, 0.04);
  for (const s of [1, 2, 3]) close(aucOf(makeScores({ n: 5000, prevalence: 0.5, separation: s, seed: 2 })), theoreticalAuc(s), 0.03);
});

test('normalCdf and theoreticalAuc match known values', () => {
  close(normalCdf(0), 0.5, 1e-7);
  close(normalCdf(1.96), 0.9750021, 1e-6);
  close(normalCdf(-1), 0.1586553, 1e-6);
  close(theoreticalAuc(0), 0.5, 1e-7);
  close(theoreticalAuc(2), 0.9213504, 1e-6);
});

test('fastRoc gives exactly the curve that metrics.rocCurve gives, ties included', () => {
  const s = [0.9, 0.8, 0.8, 0.7, 0.5, 0.5, 0.3, 0.2, 0.2, 0.1];
  const y = [true, true, false, true, false, true, false, false, true, false];
  assert.deepEqual(fastRoc(s, y), rocCurve(s, y));
  const m = makeScores({ n: 80, prevalence: 0.25, separation: 1.2, seed: 4 });
  assert.deepEqual(fastRoc(m.scores, m.actual), rocCurve(m.scores, m.actual));
  close(auc(fastRoc(s, y)), auc(rocCurve(s, y)));
});

test('a hand-built ROC: perfect ranking is 1, a reversed ranking is 0, and one swap costs one pair', () => {
  assert.equal(aucOf({ scores: [4, 3, 2, 1], actual: [true, true, false, false] }), 1);
  assert.equal(aucOf({ scores: [1, 2, 3, 4], actual: [true, true, false, false] }), 0);
  // Pairs (positive, negative): 4 in total, 3 ranked right -> 0.75.
  close(aucOf({ scores: [4, 2, 3, 1], actual: [true, true, false, false] }), 0.75);
});

test('the 1,000-case worked example: TP 8, FP 30, TN 960, FN 2', () => {
  const actual = [], scores = [];
  const add = (count, isPositive, score) => { for (let i = 0; i < count; i++) { actual.push(isPositive); scores.push(score); } };
  add(8, true, 1); add(2, true, 0); add(30, false, 1); add(960, false, 0);
  const r = atThreshold(scores, actual, 0.5);
  assert.deepEqual([r.tp, r.fp, r.tn, r.fn], [8, 30, 960, 2]);
  close(r.accuracy, 0.968);
  close(r.precision, 8 / 38);
  close(r.recall, 0.8);
  close(r.f1, 1 / 3);
  close(r.fpr, 30 / 990);
  // The lazy classifier on the same cases: always "no".
  const lazy = metricScores(confusion(actual, actual.map(() => false)));
  close(lazy.accuracy, 0.99);
  assert.equal(lazy.recall, 0);
});

test('histogram counts every case once and puts it in the right bin', () => {
  const h = histogram([-5, -1.9, 0, 0.1, 2.9, 9], [false, false, true, true, true, false], -2, 3, 5);
  assert.equal(h.width, 1);
  assert.deepEqual(h.neg, [2, 0, 0, 0, 1]);   // -5 clamps to the first bin, 9 to the last; -1.9 is in the first
  assert.deepEqual(h.pos, [0, 0, 2, 0, 1]);   // 0 and 0.1 fall in [0, 1), 2.9 in [2, 3)
  const m = makeScores({ n: 700, prevalence: 0.2, seed: 8 });
  const big = histogram(m.scores, m.actual, -4, 7, 44);
  assert.equal(big.pos.reduce((a, b) => a + b) + big.neg.reduce((a, b) => a + b), 700);
});

test('accuracyTrap fires only for high accuracy with low recall', () => {
  assert.equal(accuracyTrap({ accuracy: 0.99, recall: 0 }), true);
  assert.equal(accuracyTrap({ accuracy: 0.968, recall: 0.8 }), false);
  assert.equal(accuracyTrap({ accuracy: 0.7, recall: 0.2 }), false);
});

test('statusSentence names the accuracy trap, and only then', () => {
  const trap = statusSentence({ tp: 36, fp: 5, tn: 1895, fn: 64, accuracy: 0.966, precision: 36 / 41, recall: 0.36 });
  assert.match(trap, /^Accuracy trap: 96\.6% accurate, but it finds only 36 of the 100 positive cases \(recall 36\.0%\)/);
  const lazy = statusSentence({ tp: 0, fp: 0, tn: 990, fn: 10, accuracy: 0.99, precision: 0, recall: 0 });
  assert.match(lazy, /^Accuracy trap: it never says yes, yet it is 99\.0% accurate/);
  const flood = statusSentence({ tp: 87, fp: 300, tn: 1600, fn: 13, accuracy: 0.844, precision: 87 / 387, recall: 0.87 });
  assert.match(flood, /only 22\.5% of its yes answers are right/);
  const fine = statusSentence({ tp: 8, fp: 30, tn: 960, fn: 2, accuracy: 0.968, precision: 8 / 38, recall: 0.8 });
  assert.doesNotMatch(fine, /trap/);
  close(alwaysNoAccuracy({ tp: 8, fp: 30, tn: 960, fn: 2 }), 0.99);
});

test('statusSentence says "none" when the model says yes but finds no real positive', () => {
  // Separation 0 at threshold 2.5: five false alarms, no hit. "finds only 0 of" would be wrong.
  const miss = statusSentence({ tp: 0, fp: 5, tn: 1895, fn: 100, accuracy: 0.948, precision: 0, recall: 0 });
  assert.equal(miss, 'Accuracy trap: 94.8% accurate, but it finds none of the 100 positive cases (recall 0.0%).');
  assert.doesNotMatch(miss, /only 0/);
  const single = statusSentence({ tp: 0, fp: 0, tn: 99, fn: 1, accuracy: 0.99, precision: 0, recall: 0 });
  assert.match(single, /none of the 1 positive case\.$/);
  assert.equal(statusSentence({ tp: 1, fp: 0, tn: 5, fn: 0, accuracy: 1, precision: 1, recall: 1 }), 'It says yes to 1 case and finds 1 of the 1 positive case.');
});

test('statusSentence writes counts of a thousand or more with separators', () => {
  const big = statusSentence({ tp: 176, fp: 10, tn: 2490, fn: 2324, accuracy: 0.532, precision: 176 / 186, recall: 0.0704 });
  assert.match(big, /misses 2,324 of the 2,500 positive cases/);
  const calm = statusSentence({ tp: 1500, fp: 1200, tn: 1300, fn: 1000, accuracy: 0.56, precision: 0.55, recall: 0.6 });
  assert.match(calm, /^It says yes to 2,700 cases and finds 1,500 of the 2,500 positive cases\.$/);
});
