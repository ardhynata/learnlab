import test from 'node:test';
import assert from 'node:assert/strict';
import { cardContent, DEFAULTS } from './reliability-lab.js';
import { generatedSets, fitModel, evaluate, differs, privacyView, makeDirectory, noisyCounts } from '../ml/reliabilitylab.js';
import { reviewBand } from '../ml/reliability.js';

function view(over = {}) {
  const sets = generatedSets(DEFAULTS.seed);
  const model = fitModel(sets);
  const params = { kind: DEFAULTS.kind, strength: DEFAULTS.strength, threshold: DEFAULTS.threshold, perGroup: false, goal: DEFAULTS.goal, low: DEFAULTS.low, high: DEFAULTS.high, fields: DEFAULTS.fields, ageBin: DEFAULTS.ageBin, digits: DEFAULTS.digits, k: DEFAULTS.k, epsilon: DEFAULTS.epsilon, ...over };
  const ev = evaluate(sets, model, params);
  const directory = makeDirectory(sets.test.X.length, DEFAULTS.seed);
  return {
    real: false, sets, params, ev, names: sets.groups,
    review: reviewBand({ scores: ev.scoresAfter, labels: sets.test.y, low: params.low, high: params.high }),
    privacy: privacyView(directory, params), noisy: noisyCounts([10, 5], params.epsilon, 1), directoryN: directory.length,
  };
}

test('the defaults are the lab the learner first sees: missing values at 40%, one threshold of 0.5, a review band of 0.35 to 0.65', () => {
  assert.equal(DEFAULTS.kind, 'missing');
  assert.equal(DEFAULTS.strength, 0.4);
  assert.equal(DEFAULTS.threshold, 0.5);
  assert.equal(DEFAULTS.perGroup, false);
  assert.ok(DEFAULTS.low < DEFAULTS.high);
});

test('the model card is prefilled with the measured numbers, group by group', () => {
  const v = view();
  const { fields, auto } = cardContent(v);
  for (const g of ['A', 'B', 'C']) assert.match(fields.metrics, new RegExp(`Group ${g} \\(n = \\d+\\): accuracy \\d+%`));
  assert.match(fields.metrics, /one threshold, 0\.50/);
  assert.match(fields.data, /600 rows to fit the model, 900 to test it/);
  assert.match(fields.limits, /Under missing values \(40% blank\) accuracy falls from \d+% to \d+%/);
  assert.match(fields.review, /between 0\.35 and 0\.65/);
  assert.equal(auto.fairness.length, 3);
  assert.match(auto.privacy[1], /Smallest group: 1 person/);
});

test('a stress of 0 says so, and per-group thresholds are named in the metrics', () => {
  const none = cardContent(view({ strength: 0 }));
  assert.match(none.fields.limits, /No stress test was run yet/);
  assert.match(none.auto.robustness[0], /No stress applied/);
  const per = cardContent(view({ perGroup: true }));
  assert.match(per.fields.metrics, /a threshold per group \(A [\d.]+, B [\d.]+, C [\d.]+\), tuned to match recall/);
});

test('generalising the privacy fields shows up in the card', () => {
  const { auto } = cardContent(view({ ageBin: 10, digits: 3 }));
  assert.match(auto.privacy[0], /age in 10-year bins; postcode cut to 3 digits/);
  assert.match(auto.privacy[1], /0% of the people sit in a group smaller than k = 5/);
});

test('the known-limits sentence about groups states a difference only when the clean rows show one', () => {
  const differing = cardContent(view());
  assert.match(differing.fields.limits, /The error rates differ between groups even though the model never sees the group \(accuracy gap [\d.]+ points, recall gap [\d.]+ points, false-positive-rate gap [\d.]+ points, before any stress\)/);
  // The same view with every clean-row gap under 5 points.
  const calm = view();
  calm.ev = { ...calm.ev, before: { ...calm.ev.before, gaps: { ...calm.ev.before.gaps, accuracy: 0.01, equalOpportunity: 0.02, fpr: 0.03 } } };
  assert.equal(differs(calm.ev.before, 0.05).differs, false);
  const text = cardContent(calm).fields.limits;
  assert.doesNotMatch(text, /The error rates differ between groups/);
  assert.match(text, /the groups are close \(accuracy gap 1\.0 points, recall gap 2\.0 points, false-positive-rate gap 3\.0 points, all under 5 points\)/);
});
