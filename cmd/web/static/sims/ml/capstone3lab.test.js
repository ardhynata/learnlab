import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseSplit, FAILURE_KINDS } from './capstone3.js';
import {
  SCENARIO_SEEDS, SPLIT_KEYS, MODEL_KEYS, GRIDS, TIE, CHANGE_KEYS, HYPOTHESES,
  buildSystem, frameFacts, compareSplits, tuneCandidate, usedValue, evaluateCandidates, experimentSettings, changeOption,
  planConfig, alertDay, evidenceDay, investigateWith, referenceAuc,
} from './capstone3lab.js';

const system = buildSystem(SCENARIO_SEEDS[0], { capacity: 24 });
const split = chooseSplit(system, 'grouped', { seed: system.seed, model: 'baseline' });

test('scenarios: six seeds, the costs and capacity reach the system, the rows do not depend on them', () => {
  assert.equal(SCENARIO_SEEDS.length, 6);
  const a = buildSystem(4, { costs: { miss: 200, falseAlarm: 5, review: 5 }, capacity: 10 });
  assert.equal(a.costs.miss, 200);
  assert.equal(a.capacity, 10);
  assert.deepEqual(a.rows.slice(0, 5).map(r => r.x), system.rows.slice(0, 5).map(r => r.x));
  assert.ok(SCENARIO_SEEDS.map(s => buildSystem(s).truth.kind).every(k => FAILURE_KINDS.includes(k)));
  assert.equal(new Set(SCENARIO_SEEDS.map(s => buildSystem(s).truth.kind)).size, 4, 'every failure kind is on offer');
});

test('frameFacts: the class balance and what doing nothing or flagging everything costs', () => {
  const f = frameFacts(system);
  assert.equal(f.n, system.history.length);
  assert.ok(Math.abs(f.accuracyNever - (1 - f.rate)) < 1e-12);
  assert.ok(Math.abs(f.costNoneEach - f.positives * 100 / f.n) < 1e-9);
  assert.ok(Math.abs(f.costAllEach - (5 + (f.n - f.positives) * 5 / f.n)) < 1e-9);
  assert.ok(Math.abs(f.threshold - 10 / 105) < 1e-12);
  assert.ok(f.rate > 0.02 && f.rate < 0.15, 'positives are rare');
  assert.equal(f.streamDays + f.launchDay, system.days);
});

test('compareSplits: random and temporal flatter more than grouped, which never shares an entity', () => {
  const cmp = compareSplits(system);
  assert.deepEqual(Object.keys(cmp), SPLIT_KEYS);
  assert.equal(cmp.grouped.sharedEntities, 0);
  assert.ok(cmp.random.sharedEntities > 10);
  assert.ok(cmp.random.optimism > cmp.grouped.optimism + 0.05);
  assert.ok(cmp.temporal.optimism > cmp.grouped.optimism + 0.05);
  assert.equal(cmp.temporal.runs, 1);
  assert.equal(cmp.random.runs, 3);
  for (const k of SPLIT_KEYS) assert.ok(cmp[k].lo <= cmp[k].optimism + 1e-12 && cmp[k].optimism <= cmp[k].hi + 1e-12);
});

test('tuneCandidate: scores every grid value on the training part only, ties go to the first value', () => {
  const t = tuneCandidate(system, split, 'logistic');
  assert.deepEqual(t.values, GRIDS.logistic.values);
  assert.equal(t.results.length, GRIDS.logistic.values.length);
  const top = Math.max(...t.results.map(r => r.mean));
  const tied = t.results.filter(r => r.mean >= top - TIE);
  assert.equal(t.best, tied[0].value);
  assert.ok(t.spread >= 0);
  assert.equal(usedValue({ logistic: 1 }, 'logistic', t), 1);
  assert.equal(usedValue({ logistic: null }, 'logistic', t), t.best);
  assert.equal(usedValue({}, 'forest', null), null);
  assert.throws(() => tuneCandidate(system, split, 'baseline'), RangeError);
  assert.deepEqual(tuneCandidate(system, split, 'logistic'), t, 'deterministic');
});

test('evaluateCandidates: the baseline flags nothing, every metric has an interval, the difference intervals are consistent', () => {
  const ev = evaluateCandidates(system, split, { logistic: 0.1, forest: 4 }, { B: 60 });
  assert.equal(ev.nTest, split.test.length);
  assert.equal(ev.capacityTest, Math.round(24 * ev.nTest / system.perDay));
  assert.equal(ev.scores.baseline.op.flagged, 0);
  assert.equal(ev.scores.baseline.auc.estimate, 0.5);
  for (const m of MODEL_KEYS) {
    const c = ev.scores[m].cost;
    assert.ok(c.lo <= c.estimate + 1e-9 && c.estimate <= c.hi + 1e-9, `${m} cost interval brackets the estimate`);
    assert.ok(ev.scores[m].op.flagged <= ev.capacityTest);
  }
  const d = ev.diffs.logistic;
  assert.ok(Math.abs(d.estimate - (ev.scores.logistic.cost.estimate - ev.scores.baseline.cost.estimate)) < 1e-9);
  assert.ok(ev.scores.logistic.auc.estimate > 0.55, 'the logistic model finds the signal');
  const capped = evaluateCandidates(system, split, { logistic: 0.1, forest: 4 }, { B: 20, capacity: 1 });
  assert.ok(capped.scores.logistic.op.flagged <= capped.capacityTest);
});

test('experimentSettings and changeOption: one change, nothing else', () => {
  const costs = { miss: 100, falseAlarm: 5, review: 5 };
  const base = experimentSettings({ split: 'grouped', model: 'forest', picks: { logistic: 0, forest: 4 }, costs, capacity: 24 });
  assert.deepEqual(base.fitOpts, { maxDepth: 4 });
  assert.deepEqual(experimentSettings({ split: 'random', model: 'logistic', picks: { logistic: 0.1, forest: 4 }, costs, capacity: 24 }).fitOpts, { l2: 0.1 });
  for (const key of CHANGE_KEYS) {
    const o = changeOption(base, key);
    assert.equal(o.key, key);
    assert.notDeepEqual(o.from, o.to);
    const merged = { ...base, ...o.overrides };
    const differing = Object.keys(base).filter(k => JSON.stringify(base[k]) !== JSON.stringify(merged[k]));
    assert.equal(differing.length, 1, `${key} changes exactly one top-level setting`);
  }
  assert.equal(changeOption(base, 'split').to, 'temporal');
  assert.equal(changeOption({ ...base, model: 'logistic', fitOpts: { l2: 0 } }, 'setting').to, 0.1);
  assert.throws(() => changeOption(base, 'nope'), RangeError);
});

test('planConfig, alertDay, evidenceDay, investigateWith: the plan reaches the replay and the right hypothesis is confirmed', () => {
  const off = { on: false };
  const plan = { psi: { on: true, threshold: 0.25, window: 7, features: ['amount', 'velocity', 'merchantRisk', 'accountAge'] }, score: off, delayed: off, prevalence: off, consecutive: 2 };
  assert.deepEqual(Object.keys(planConfig(plan).monitors), ['psi']);
  assert.equal(planConfig({ ...plan, delayed: { on: true, drop: 0.1, window: 14 } }).monitors.delayed.drop, 0.1);
  const ev = alertDay(system, plan, 'logistic');
  assert.ok(ev.firstAlert !== null && ev.firstAlert >= system.truth.day);
  const day = evidenceDay(system, ev.firstAlert);
  assert.ok(day >= ev.firstAlert && day <= system.days - 1);
  assert.equal(evidenceDay(system, null), Math.min(system.days - 1, system.truth.day + system.labelDelay + 10));
  assert.ok(referenceAuc(system) > 0.5);
  const hits = HYPOTHESES.filter(kind => investigateWith(system, { kind, feature: system.truth.feature }, { day }).confirmed);
  assert.deepEqual(hits, [system.truth.kind], 'exactly the true hypothesis is confirmed');
  const withRemedy = investigateWith(system, { kind: system.truth.kind, feature: system.truth.feature }, { day, remedy: true });
  assert.equal(withRemedy.remedy.options.length, 4);
});

test('every scenario: the sensible plan catches the failure and only the true hypothesis is confirmed', () => {
  const on = { on: true };
  const plan = { psi: { on: true, threshold: 0.25, window: 7, features: ['amount', 'velocity', 'merchantRisk', 'accountAge'] }, score: { ...on, threshold: 0.25, window: 7 }, delayed: { ...on, drop: 0.1, window: 14 }, prevalence: { ...on, ratio: 1.5, window: 14 }, consecutive: 2 };
  for (const seed of SCENARIO_SEEDS) {
    const sys = buildSystem(seed);
    const ev = alertDay(sys, plan, 'logistic');
    assert.ok(ev.firstAlert !== null, `seed ${seed}: caught`);
    const day = evidenceDay(sys, ev.firstAlert);
    const hits = HYPOTHESES.filter(kind => investigateWith(sys, { kind, feature: sys.truth.feature }, { day }).confirmed);
    assert.deepEqual(hits, [sys.truth.kind], `seed ${seed}`);
  }
});
