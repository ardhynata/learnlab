import test from 'node:test';
import assert from 'node:assert/strict';
import { describeEvent, explainDecision, DEFAULTS, DAYS } from './monitoring-lab.js';
import { buildRun, decide, modelsFor } from '../ml/monitoringlab.js';

const models = modelsFor(1);
const run = scenario => buildRun({ scenario }, { models });

test('the lab opens on the units-bug scenario the predict question asks about, with a 60-day stream', () => {
  assert.equal(DEFAULTS.scenario, 'skew');
  assert.equal(DAYS, 60);
});

test('describeEvent states the numbers of the event, with the day counted from 1', () => {
  assert.match(describeEvent('skew', 0.5, 24), /From day 25.*multiplied by 100/);
  assert.match(describeEvent('covariate', 0.5, 24), /1\.5 standard deviations/);
  assert.match(describeEvent('label', 0.5, 24), /from 50% to 12%/);
  assert.match(describeEvent('concept', 0.5, 24), /90 degrees/);
  assert.match(describeEvent('delayed', 0.5, 24), /21 days late instead of 7/);
  assert.match(describeEvent('clean', 0.5, 24), /false alarm/);
  assert.match(describeEvent('skew', 0, 24), /Severity is 0/);
});

test('explainDecision: the right remedy is called cheapest, and a wrong one names the better one and why it fails', () => {
  const r = run('skew');
  const good = explainDecision(decide({ run: r, kind: 'rollback', fromDay: 30 }), 'skew');
  assert.match(good, /You chose "Roll back to the previous version" on day 31/);
  assert.match(good, /No other option costs less here/);
  assert.match(good, /removes the bug/);
  const bad = explainDecision(decide({ run: r, kind: 'recalibrate', fromDay: 30 }), 'skew');
  assert.match(bad, /"Roll back to the previous version" would have cost/);
  assert.match(bad, /cannot change which rows rank higher/);
});

test('explainDecision: when the model is still right, doing nothing is the cheapest answer and an alert alone is not a reason to act', () => {
  const text = explainDecision(decide({ run: run('covariate'), kind: 'none', fromDay: 30 }), 'covariate');
  assert.match(text, /No other option costs less here/);
  assert.match(text, /not a reason to act/);
});

test('explainDecision: retraining before any new-period label has arrived is explained by the label delay', () => {
  const early = explainDecision(decide({ run: run('concept'), kind: 'retrain', fromDay: 30 }), 'concept');
  assert.match(early, /labels come late/);
  const late = explainDecision(decide({ run: run('concept'), kind: 'retrain', fromDay: 40 }), 'concept');
  assert.match(late, /learned the new rule/);
});

test('explainDecision: with too few labels the remedy says nothing could be fitted', () => {
  const text = explainDecision(decide({ run: run('skew'), kind: 'retrain', fromDay: 3 }), 'skew');
  assert.match(text, /Fewer than 60 labels had arrived \(0\)/);
});

test('explainDecision: keeping watching does not compare the choice with itself', () => {
  const text = explainDecision(decide({ run: run('skew'), kind: 'none', fromDay: 30 }), 'skew');
  assert.match(text, /From then on the accuracy is \d+\.\d%\. Cost:/);
  assert.doesNotMatch(text, /if you had kept watching/);
  const other = explainDecision(decide({ run: run('skew'), kind: 'rollback', fromDay: 30 }), 'skew');
  assert.match(other, /if you had kept watching/);
});

test('explainDecision: a near-tie is called close, not a mistake, and the retrain text follows the gain', () => {
  const d = decide({ run: run('skew'), kind: 'rollback', fromDay: 39 });
  const text = explainDecision(d, 'skew');
  const retrain = explainDecision(decide({ run: run('skew'), kind: 'retrain', fromDay: 39 }), 'skew');
  const gain = d.comparison.byKind.retrain.outcome.gain;
  if (d.choice.regret > 0 && d.choice.regret < 1) assert.match(text, /costs about the same/);
  else if (d.choice.regret >= 1) assert.match(text, /would have cost/);
  if (gain > 0.05) { assert.match(retrain, /learned to discount that feature/); assert.doesNotMatch(retrain, /does not remove the bug/); }
  else assert.match(retrain, /does not remove the bug/);
});
