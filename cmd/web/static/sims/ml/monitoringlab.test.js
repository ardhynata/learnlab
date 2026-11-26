import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENARIO_KEYS, DAYS, PER_DAY, DEFAULTS, scenarioEvents, eventStrength, monitorsFor, modelsFor, buildRun, alertsOf, alertLog,
  remedyWorld, runWithRemedy, decide, featureView, sliceView, calibrationView, recentRows, labelledRows,
} from './monitoringlab.js';
import { applyRemedy, REMEDIES } from './monitoring.js';

const models = modelsFor(1);
const run = (scenario, extra = {}) => buildRun({ scenario, ...extra }, { models });

// errors of a world on days from..end, scored the way applyRemedy scores them (the true labels, threshold 0.5)
const errorsFrom = (world, from) => world.stream.rows.filter(r => r.day >= from).reduce((e, r) => e + ((world.model.score(r.x) >= 0.5 ? 1 : 0) === r.label ? 0 : 1), 0);

test('the default severity reproduces the monitoring.js scenarios (spend x100, prevalence 0.12, a quarter turn, 1.5 sd)', () => {
  const e = eventStrength('skew', 0.5);
  assert.equal(e.factor, 100);
  assert.ok(Math.abs(e.prevalence - 0.12) < 1e-9);
  assert.ok(Math.abs(e.angle - Math.PI / 2) < 1e-12);
  assert.equal(e.shift, 1.5);
  assert.deepEqual(scenarioEvents('covariate', 0.5, 25), [{ kind: 'covariate', day: 25, feature: 'spend', shift: 1.5 }]);
  assert.deepEqual(scenarioEvents('skew', 0.5, 25), [{ kind: 'skew', day: 25, feature: 'spend', mode: 'scale', factor: 100 }]);
});

test('scenarioEvents: clean has none, delayed adds a 21-day label delay, bad input throws', () => {
  assert.deepEqual(scenarioEvents('clean', 1, 10), []);
  const d = scenarioEvents('delayed', 0.5, 20);
  assert.deepEqual(d.map(x => x.kind), ['covariate', 'concept', 'delay']);
  assert.equal(d[2].delay, 21);
  assert.deepEqual(SCENARIO_KEYS, ['clean', 'covariate', 'skew', 'label', 'concept', 'delayed']);
  assert.throws(() => scenarioEvents('nope', 0.5, 5), RangeError);
  assert.throws(() => scenarioEvents('skew', 0.5, DAYS), RangeError);
});

test('monitorsFor maps the lab controls onto the monitors', () => {
  const m = monitorsFor({ ...DEFAULTS, psiThreshold: 0.4, inputWindow: 3, accWindow: 10, accDrop: 0.05 });
  assert.equal(m.psi.threshold, 0.4); assert.equal(m.score.threshold, 0.4);
  assert.equal(m.psi.window, 3); assert.equal(m.score.window, 3);
  assert.equal(m.accuracy.window, 10); assert.equal(m.accuracy.drop, 0.05);
});

test('a units bug: the input monitor fires on the first full day, the accuracy monitor only after labels arrive', () => {
  const r = run('skew');
  assert.equal(r.stream.days, DAYS);
  assert.equal(r.stream.rows.length, DAYS * PER_DAY);
  const f = r.summary.firstAlert;
  assert.equal(f.psi, DEFAULTS.eventDay + 1);                 // 2 days in a row: the event day and the next
  assert.ok(f.accuracy > f.psi + 5, `accuracy first fired on day ${f.accuracy}, input on ${f.psi}`);
  assert.deepEqual(r.summary.falseAlarmDays, []);
});

test('a clean stream raises no alert and a concept shift is silent in the input monitors', () => {
  assert.equal(run('clean').summary.alertDays.length, 0);
  const c = run('concept').summary.firstAlert;
  assert.equal(c.psi, null); assert.equal(c.score, null);
  assert.ok(c.accuracy > DEFAULTS.eventDay);
});

test('alertsOf re-reads the alerts for another threshold without a new replay', () => {
  const r = run('skew');
  const strict = alertsOf(r, { psiThreshold: 50 });
  assert.equal(strict.first.psi, null);
  const same = alertsOf(r, {});
  assert.equal(same.first.psi, r.summary.firstAlert.psi);
  assert.deepEqual(same.alerts, r.alerts);
  const loose = alertsOf(r, { accDrop: 0.01 });
  assert.ok(loose.first.accuracy <= r.summary.firstAlert.accuracy);
});

test('alertLog counts the alert days up to a day and keeps the reading of the first one', () => {
  const r = run('skew');
  const early = alertLog(alertsOf(r, {}), DEFAULTS.eventDay - 1);
  assert.equal(early.psi.first, null); assert.equal(early.psi.days, 0);
  const later = alertLog(alertsOf(r, {}), DEFAULTS.eventDay + 4);
  assert.equal(later.psi.first.day, DEFAULTS.eventDay + 1);
  assert.equal(later.psi.days, 4);
  assert.ok(later.psi.first.value > later.psi.first.threshold);
});

test('remedyWorld agrees with applyRemedy: the same wrong predictions from the decision day, for every remedy', () => {
  for (const [scenario, fromDay] of [['skew', 30], ['concept', 40], ['label', 40]]) {
    const r = run(scenario);
    for (const kind of REMEDIES) {
      const world = remedyWorld({ run: r, kind, fromDay });
      const ref = applyRemedy({ stream: r.stream, fromDay, kind, model: r.model, previous: r.previous });
      assert.equal(errorsFrom(world, fromDay), ref.metric.errors, `${scenario} ${kind}`);
      assert.equal(world.feasible, ref.feasible);
      assert.equal(world.effectiveDay, ref.effectiveDay);
    }
  }
});

test('before the decision day nothing changes; after a rollback the units bug leaves the input monitor', () => {
  const r = run('skew');
  const after = runWithRemedy(r, 'rollback', 30);
  for (let d = 0; d < 30; d++) assert.deepEqual(after.daily[d].psi, r.daily[d].psi);
  assert.ok(r.daily[40].psiMax > 1, 'the bug is still on without a remedy');
  assert.ok(after.daily[40].psiMax < 0.25, `the rollback serves clean features again (psi ${after.daily[40].psiMax})`);
  assert.ok(after.daily[40].accuracyTrue > r.daily[40].accuracyTrue + 0.05);
});

test('decide: a rollback is the cheapest answer to the units bug, a retrain to a concept shift, a recalibration to label shift', () => {
  assert.equal(decide({ run: run('skew'), kind: 'rollback', fromDay: 30 }).choice.best, 'rollback');
  assert.equal(decide({ run: run('concept'), kind: 'retrain', fromDay: 40 }).choice.best, 'retrain');
  const lab = decide({ run: run('label'), kind: 'recalibrate', fromDay: 40 });
  assert.equal(lab.choice.best, 'recalibrate');
  assert.ok(lab.choice.isBest && lab.choice.regret === 0 && lab.choice.rank === 1);
  const wrong = decide({ run: run('label'), kind: 'rollback', fromDay: 40 });
  assert.ok(wrong.choice.regret > 5 && wrong.choice.rank === 4);
});

test('retraining too early learns nothing new: on a concept shift it helps on day 40 but not on day 30', () => {
  const r = run('concept');
  const early = decide({ run: r, kind: 'retrain', fromDay: 30 }), late = decide({ run: r, kind: 'retrain', fromDay: 40 });
  const gain = d => d.comparison.byKind.retrain.outcome.gain;
  assert.ok(gain(late) > 0.15, `gain on day 40: ${gain(late)}`);
  assert.ok(gain(early) < 0.05, `gain on day 30: ${gain(early)}`);
});

test('too few labels make a retrain infeasible and the old model carries on', () => {
  const r = run('skew');
  const d = decide({ run: r, kind: 'retrain', fromDay: 3 });
  assert.equal(d.feasible, false);
  assert.equal(d.labelsUsed, 0);
  assert.deepEqual(d.after.daily.map(x => x.accuracyTrue), r.daily.map(x => x.accuracyTrue));
});

test('featureView: the reference deciles hold 10% each and a x100 bug piles the recent rows into the end bins', () => {
  const r = run('skew');
  const v = featureView(r, 40, { feature: 'spend', window: 7 });
  assert.equal(v.bins.length, 10);
  assert.ok(v.bins.every(b => Math.abs(b.reference - 0.1) < 0.02));
  assert.ok(Math.abs(v.bins.reduce((a, b) => a + b.recent, 0) - 1) < 1e-6);
  assert.ok(v.bins[0].recent + v.bins[9].recent > 0.9);
  assert.ok(v.psi > 1);
  assert.ok(featureView(r, 40, { feature: 'tenure' }).psi < 0.1, 'an untouched feature stays quiet');
});

test('sliceView: shares sum to 1 and only labels that have arrived are used', () => {
  const r = run('skew');
  const s = sliceView(r, 40, { feature: 'spend' });
  assert.ok(Math.abs(s.slices.reduce((a, x) => a + x.recentShare, 0) - 1) < 1e-9);
  assert.ok(Math.abs(s.slices.reduce((a, x) => a + x.referenceShare, 0) - 1) < 1e-9);
  assert.ok(labelledRows(r, 40, 21).every(x => x.arrival <= 40));
  assert.equal(s.labelled, s.slices.reduce((a, x) => a + x.labelled, 0));
  assert.ok(sliceView(r, 5).slices.every(x => x.recentAccuracy === null), 'no label has arrived by day 5');
  assert.equal(recentRows(r, 40, 7).length, 7 * PER_DAY);
});

test('calibrationView: under label shift the scores run well above the positives actually seen', () => {
  const r = run('label');
  const c = calibrationView(r, 45);
  assert.ok(Math.abs(c.referenceMeanScore - c.referencePositiveRate) < 0.06, 'calibrated before launch');
  assert.ok(c.recentMeanScore - c.recentPositiveRate > 0.1, `mean score ${c.recentMeanScore} vs positives ${c.recentPositiveRate}`);
  assert.equal(c.bins.length, 5);
});
