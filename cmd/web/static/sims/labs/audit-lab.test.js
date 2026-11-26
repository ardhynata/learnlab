import test from 'node:test';
import assert from 'node:assert/strict';
import { niceTicks, largestGap, tradeoff, toSlider } from './audit-lab.js';
import { auditSummary, makeLabData, buildAudit } from '../ml/auditlab.js';
import { gaps } from '../ml/audit.js';

test('niceTicks picks round steps', () => {
  assert.deepEqual(niceTicks(0, 1, 4), [0, 0.2, 0.4, 0.6, 0.8, 1]);
  assert.deepEqual(niceTicks(0, 0.28, 5), [0, 0.05, 0.1, 0.15, 0.2, 0.25]);
  assert.deepEqual(niceTicks(-0.02, 0.1, 3), [0, 0.05, 0.1]);
  assert.deepEqual(niceTicks(1, 1), [1]);
});

test('largestGap names the metric with the biggest gap and ignores gaps that do not exist', () => {
  const rows = [
    { group: 'A', accuracy: 0.8, precision: 0.7, recall: 0.9, fpr: 0.1, positiveRate: 0.6 },
    { group: 'B', accuracy: 0.78, precision: null, recall: 0.5, fpr: 0.2, positiveRate: 0.3 },
  ];
  const big = largestGap(gaps(rows));
  assert.equal(big.metric, 'recall');
  assert.ok(Math.abs(big.gap - 0.4) < 1e-12);
  assert.equal(big.max.group, 'A');
  assert.equal(largestGap(gaps([rows[0]])), null);
});

test('tradeoff subtracts the single-threshold summary from the current one', () => {
  const a = buildAudit(makeLabData({ seed: 2 }), 2), groups = ['A', 'B'];
  const base = auditSummary(a.test.y, a.scores, a.test.group, groups, 0.5);
  const same = tradeoff(base, base);
  for (const v of Object.values(same.change)) assert.equal(v, 0);
  const lower = auditSummary(a.test.y, a.scores, a.test.group, groups, { A: 0.5, B: 0.3 });
  const t = tradeoff(base, lower);
  assert.ok(t.change.positiveRate < 0 === (lower.gaps.positiveRate.gap < base.gaps.positiveRate.gap));
  assert.ok(Math.abs(t.change.accuracy - (lower.accuracy - base.accuracy)) < 1e-12);
});

test('toSlider rounds to a hundredth and stays on the slider', () => {
  assert.equal(toSlider(0.2549), 0.25);
  assert.equal(toSlider(1.05), 0.99);
  assert.equal(toSlider(-0.2), 0.01);
});
