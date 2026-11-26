import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY, STEP_COUNT, TEXT_FIELDS, CRITERIA, emptyState, emptyPlan, sanitizeState, sanitizePlan, resetFrom, stepDone, chainDone, tryKey, gapWords, gapSummary, d2m, trueByRule, planValid, reasonsRight,
  decisionFeedback, modeFeedback, metricFeedback, thresholdRule, splitName, closestSplit, optimismSentences, searchSentence, intervalText, diffSentence,
  changeLabel, changeField, planSummary, planSentences, hypothesisLabel, reasonLines, whatHappened, remedySentences, criterionTitle, levelLabel, levelText, buildSummary,
} from './capstone3report.js';
import { SCENARIO_SEEDS, buildSystem, frameFacts } from './capstone3lab.js';

// A state in which every step is done.
const full = () => {
  const s = emptyState();
  Object.assign(s, {
    decision: 'queue', mode: 'batch', costsSet: true, metric: 'cost', reasons: ['rare', 'equal'],
    split: 'grouped', splitCompared: true, defence: 'unseen entities',
    searched: { logistic: true, forest: true }, scored: true, model: 'logistic', recorded: true, rerun: true, changed: true,
    planReplayed: true, planCaught: true, hyp: 'skew', tested: true, confirmed: 'skew', confirmedFeature: 'amount', remedy: 'rollback', remedyApplied: true,
  });
  for (const f of TEXT_FIELDS) s.text[f] = 'x';
  for (const c of CRITERIA) s.rubric[c] = 2;
  return s;
};

test('emptyState: seven steps, nothing done, JSON-safe', () => {
  const s = emptyState();
  assert.equal(STEP_COUNT, 7);
  assert.deepEqual(stepDone(s), Array(7).fill(false));
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
  assert.equal(STORAGE_KEY, 'learnlab.lab.capstone-l3.v1');
});

test('sanitizeState: accepts anything, keeps valid saved work, drops what depends on missing results', () => {
  for (const junk of [null, undefined, 5, 'x', [], { seed: 'a', split: 'nope', plan: 3, text: 7 }]) assert.deepEqual(sanitizeState(junk), emptyState());
  const s = full();
  assert.deepEqual(sanitizeState(JSON.parse(JSON.stringify(s))), s, 'a complete state survives a round trip');
  const broken = sanitizeState({ ...JSON.parse(JSON.stringify(s)), scored: false });
  assert.equal(broken.model, null, 'a model needs the scores');
  assert.equal(broken.recorded, false);
  assert.equal(broken.changed, false);
  assert.equal(sanitizeState({ seed: 99 }).seed, SCENARIO_SEEDS.length);
  assert.equal(sanitizeState({ miss: 99999 }).miss, 400);
  assert.equal(sanitizeState({ defence: 'x'.repeat(999) }).defence.length, 200);
});

test('sanitizePlan: snaps to the slider steps, keeps an empty feature list for the lab to warn about', () => {
  const p = sanitizePlan({ psi: { on: true, threshold: 0.27, window: 99, features: ['amount', 'nope'] }, consecutive: 9, delayed: { on: true, drop: 0.113 } });
  assert.equal(p.psi.threshold, 0.25);
  assert.equal(p.psi.window, 21);
  assert.deepEqual(p.psi.features, ['amount']);
  assert.equal(p.consecutive, 4);
  assert.equal(p.delayed.drop, 0.12);
  assert.deepEqual(sanitizePlan({ psi: { on: true, features: [] } }).psi.features, []);
  assert.deepEqual(sanitizePlan(null), emptyPlan());
});

test('planValid: a monitor must be on, and input drift needs a feature', () => {
  const p = emptyPlan();
  assert.equal(planValid(p), true);
  assert.equal(planValid({ ...p, psi: { ...p.psi, on: false } }), false);
  assert.equal(planValid({ ...p, psi: { ...p.psi, features: [] } }), false);
  assert.equal(planValid({ ...p, psi: { ...p.psi, on: false, features: [] }, delayed: { ...p.delayed, on: true } }), true);
});

test('stepDone: each step needs its own condition', () => {
  assert.deepEqual(stepDone(full()), Array(7).fill(true));
  const without = patch => stepDone({ ...full(), ...patch });
  assert.equal(without({ decision: 'auto' })[0], false);
  assert.equal(without({ mode: 'online' })[0], false);
  assert.equal(without({ metric: 'accuracy' })[0], false);
  assert.equal(without({ reasons: ['rare'] })[0], false);
  assert.equal(without({ reasons: ['rare', 'equal', 'cannot'] })[0], false);
  assert.equal(without({ defence: '  ' })[1], false);
  assert.equal(without({ model: null })[2], false);
  assert.equal(without({ changed: false })[3], false);
  assert.equal(without({ planCaught: false })[4], false);
  assert.equal(without({ remedyApplied: false })[5], false);
  assert.equal(without({ confirmed: null })[5], false);
  assert.equal(without({ rubric: { ...full().rubric, split: 0 } })[6], false);
  assert.equal(reasonsRight(['equal', 'rare']), true);
});

test('resetFrom: a change forgets what depends on it and keeps typed text', () => {
  const s = full();
  const r2 = resetFrom(s, 2);
  assert.equal(r2.splitCompared, false);
  assert.equal(r2.model, null);
  assert.equal(r2.recorded, false);
  assert.equal(r2.planReplayed, false);
  assert.equal(r2.confirmed, null);
  assert.equal(r2.text.splitWhy, 'x');
  assert.equal(r2.split, 'grouped', 'the choice itself stays');
  const r4 = resetFrom(s, 4);
  assert.equal(r4.model, 'logistic');
  assert.equal(r4.recorded, false);
  const r6 = resetFrom(s, 6);
  assert.equal(r6.planCaught, true);
  assert.equal(r6.confirmed, null);
  assert.equal(r6.remedyApplied, false);
  assert.notEqual(r6.plan, s.plan, 'a copy');
  assert.equal(s.confirmed, 'skew', 'the old state is untouched');
  assert.deepEqual(stepDone(r2).slice(0, 2), [true, false]);
});

test('sentences carry the numbers and follow the numbers, in both directions', () => {
  const sys = buildSystem(SCENARIO_SEEDS[0]);
  const f = frameFacts(sys);
  assert.match(metricFeedback('accuracy', f), /%/);
  assert.ok(decisionFeedback('queue').startsWith('Yes'));
  assert.ok(decisionFeedback('auto').startsWith('Not here'));
  assert.ok(modeFeedback('batch', f).includes(String(f.labelDelay)));
  assert.match(thresholdRule({ miss: 100, falseAlarm: 5, review: 5 }, 24, 80, f.threshold), /9\.5%/);
  const cmp = {
    random: { optimism: 0.3, estimate: 0.9, realised: 0.6 }, grouped: { optimism: 0.02, estimate: 0.62, realised: 0.6 }, temporal: { optimism: 0.2, estimate: 0.8, realised: 0.6 },
  };
  assert.equal(closestSplit(cmp), 'grouped');
  assert.equal(closestSplit({ ...cmp, grouped: { ...cmp.grouped, optimism: -0.5 } }), 'temporal');
  assert.match(optimismSentences(cmp, 'random').join(' '), /grouped split is closer/i);
  assert.match(optimismSentences(cmp, 'grouped').join(' '), /closest to what happens/);
  assert.equal(splitName('grouped', true), 'grouped');
  assert.match(intervalText({ estimate: 0.5, lo: 0.4, hi: 0.6 }), /0\.50 \(0\.40 – 0\.60\)/);
  assert.equal(intervalText(null), '–');
  assert.match(diffSentence('A', { estimate: -1, lo: -2, hi: -0.5 }), /cheaper/);
  assert.match(diffSentence('A', { estimate: 1, lo: 0.5, hi: 2 }), /dearer/);
  assert.match(diffSentence('A', { estimate: 0, lo: -1, hi: 1 }), /includes 0/);
  assert.equal(diffSentence('A', { estimate: 0, lo: NaN, hi: NaN }), '');
  const tuned = { results: [{ value: 0, mean: 0.7 }, { value: 1, mean: 0.7 }], best: 0, spread: 0.001 };
  assert.match(searchSentence('logistic', tuned, 0), /hardly matters/);
  assert.match(searchSentence('forest', { ...tuned, spread: 0.1 }, 1), /instead/);
  for (const k of ['model', 'split', 'fraction', 'miss', 'capacity', 'setting']) assert.ok(changeLabel(k));
  for (const k of ['model', 'testFraction', 'maxDepth']) assert.ok(changeField(k));
});

test('planSentences and the investigation text follow a real replay', () => {
  const sys = buildSystem(SCENARIO_SEEDS[1]);
  const daily = [{ day: sys.launchDay }, { day: sys.launchDay + 1 }];
  const caught = { firstAlert: sys.truth.day + 2, detectionDelay: 2, falseAlarmDays: 1, alarmCost: 50, costUntilDetection: 123.4, totalCost: 173.4, byRule: { psi: sys.truth.day + 2, score: null }, daily };
  const text = planSentences(caught, { firstAlert: null }, sys.truth.day).join(' ');
  assert.match(text, /first true alert fired/);
  assert.match(text, /never catches/);
  assert.match(planSentences({ ...caught, firstAlert: null, detectionDelay: null }, null, sys.truth.day).join(' '), /never raised a true alert/);
  assert.match(planSummary(emptyPlan()), /input drift on 4 features/);
  assert.equal(planSummary({ ...emptyPlan(), psi: { ...emptyPlan().psi, on: false } }), 'no monitor');
  for (const k of ['skew', 'covariate', 'label', 'concept']) assert.ok(hypothesisLabel(k));
  assert.match(whatHappened({ kind: 'skew', mode: 'scale', day: 50, feature: 'amount' }), /multiplied by 100/);
  assert.match(whatHappened({ kind: 'label', day: 50, prevalence: 0.18 }), /18%/);
  const evidence = {
    featureTable: [{ feature: 'amount', psi: 2, mismatch: 0, identifier: false }, { feature: 'deviceId', psi: 0.5, mismatch: 0, identifier: true }],
    delayed: { drop: 0.01, auc: 0.78, baselineAuc: 0.79, prevalenceRatio: 1 },
  };
  assert.match(reasonLines('covariate', evidence, 'amount').join(' '), /PSI 2/);
  assert.match(reasonLines('covariate', evidence, 'deviceId').join(' '), /identifier/);
  assert.match(reasonLines('concept', evidence, 'amount').join(' '), /signal feature moved/);
  const rem = { options: [{ kind: 'rollback', total: 100, fixed: 50, operational: 50, latencyDays: 0 }, { kind: 'retrain', total: 200, fixed: 500, operational: 0, latencyDays: 3 }] };
  assert.match(remedySentences(rem, 'rollback').join(' '), /cheapest of the four/);
  assert.match(remedySentences(rem, 'retrain').join(' '), /costs 100 more/);
});

test('rubric: five criteria, three levels each, all with text', () => {
  assert.equal(CRITERIA.length, 5);
  for (const c of CRITERIA) {
    assert.ok(criterionTitle(c));
    for (const l of [1, 2, 3]) assert.ok(levelText(c, l).length > 20);
  }
  assert.equal(levelLabel(3), 'Yes');
  assert.equal(levelLabel(9), '');
});

test('buildSummary: says the data are synthetic, names every step, and flags what is not done', () => {
  const sys = buildSystem(SCENARIO_SEEDS[0]);
  const empty = buildSummary({
    seed: 4, facts: frameFacts(sys), costs: { miss: 100, falseAlarm: 5, review: 5 }, capacity: 24, decision: null, mode: null, metric: null, reasons: [],
    split: null, cmp: null, defence: '', tuned: null, picks: {}, model: null, ev: null, settings: null, record: null, rerun: false, changeResult: null,
    plan: emptyPlan(), planEval: null, planRef: null, failDay: sys.truth.day, evidenceDay: null, investigation: null,
    text: Object.fromEntries(TEXT_FIELDS.map(f => [f, ''])), rubric: CRITERIA.map(criterion => ({ criterion, level: 0 })),
  });
  assert.match(empty, /synthetic/);
  for (const part of ['1. FRAME', '2. SPLIT', '3. MODELS', '4. REPRODUCIBILITY', '5. MONITORING PLAN', '6. FAILURE INVESTIGATION', 'REPORT', 'Self-assessment']) assert.ok(empty.includes(part), part);
  assert.match(empty, /\(not done yet\)/);
  assert.match(empty, /\(not written yet\)/);
  assert.match(empty, /\(not rated yet\)/);
});

test('the by-monitor sentence credits only true alerts, and names the monitor that false-alarmed', () => {
  const sys = buildSystem(SCENARIO_SEEDS[2]);
  const fail = sys.truth.day;
  const ev = {
    firstAlert: fail + 11, detectionDelay: 11, falseAlarmDays: 1, alarmCost: 50, costUntilDetection: 10, totalCost: 60,
    byRule: { prevalence: fail - 8, psi: fail + 11 },
    alerts: [{ day: fail - 8, rule: 'prevalence' }, { day: fail + 11, rule: 'psi' }, { day: fail + 12, rule: 'psi' }],
    daily: [],
  };
  assert.deepEqual(trueByRule(ev, fail), { psi: fail + 11 });
  const text = planSentences(ev, null, fail).join(' ');
  assert.match(text, new RegExp(`By monitor: input drift: day ${fail + 11}\\.`));
  assert.doesNotMatch(text, new RegExp(`By monitor:[^.]*positive share`));
  assert.match(text, new RegExp(`first by monitor: positive share: day ${fail - 8}`));
  // Without an alert list (an older shape), the by-rule days before the failure are still dropped.
  assert.deepEqual(trueByRule({ byRule: { prevalence: fail - 8, psi: fail + 3, score: null } }, fail), { psi: fail + 3 });
});

test('progress counts only steps that are reached: a step is never done while an earlier one is not', () => {
  const raw = stepDone({ ...full(), planCaught: false });
  assert.deepEqual(raw, [true, true, true, true, false, true, true]);
  assert.deepEqual(chainDone(raw), [true, true, true, true, false, false, false]);
  assert.deepEqual(chainDone(Array(7).fill(true)), Array(7).fill(true));
});

test('the tested wrong guesses are distinct (hypothesis, feature) pairs', () => {
  assert.equal(tryKey('skew', 'amount'), 'skew:amount');
  assert.equal(tryKey('label', 'amount'), 'label');
  const s = sanitizeState({ wrongTried: ['skew:amount', 'skew:amount', 'label', 'label:amount', 'skew', 'nonsense', 5], wrong: 9 });
  assert.deepEqual(s.wrongTried, ['skew:amount', 'label']);
  assert.equal(s.wrong, 2);
  assert.equal(sanitizeState({ wrong: 3 }).wrong, 3, 'a state saved before the list existed keeps its count');
  const r = resetFrom({ ...full(), wrongTried: ['label'], wrong: 1 }, 6);
  assert.deepEqual([r.wrongTried, r.wrong], [[], 0]);
});

test('a negative gap is worded as reading low, with a true minus sign', () => {
  assert.match(gapWords(0.05), /overstates it by 0\.05/);
  assert.match(gapWords(-0.02), /reads it 0\.02 too low/);
  assert.match(gapSummary(-0.02), /below the new-entity result/);
  assert.doesNotMatch(gapSummary(-0.02), /-\d/);
  assert.equal(d2m(-0.68), '−0.68');
  assert.equal(d2m(0.5), '0.50');
});

test('remedySentences states the table assumes the confirmed diagnosis and counts rejected guesses only when there are some', () => {
  const rem = { options: [{ kind: 'rollback', total: 100, fixed: 50, operational: 50, latencyDays: 0 }, { kind: 'none', total: 120, fixed: 0, operational: 120, latencyDays: 0 }] };
  const none = remedySentences(rem, 'rollback', 0).join(' ');
  assert.match(none, /confirmed diagnosis/);
  assert.doesNotMatch(none, /thousands|rejected/);
  assert.match(remedySentences(rem, 'rollback', 2).join(' '), /rejected 2 guesses/);
  assert.match(remedySentences(rem, 'rollback', 1).join(' '), /rejected 1 guess first/);
});
