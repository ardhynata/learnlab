import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEATURES, SIGNAL_FEATURES, FAILURE_KINDS, WEIGHTS, DEFAULT_COSTS, SENSIBLE_PLAN, DELAYED_ONLY_PLAN,
  makeCapstoneSystem, reviewThreshold, operationalMetric, chooseSplit, trainCandidates, deployedModel,
  runExperiment, repro, checkReproducible, evaluatePlan, investigate, remedyFor,
} from './capstone3.js';
import { costThreshold } from './capstone2.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (tol ${tol})`);
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const SEEDS = [1, 2, 3, 4, 5, 6];

// The systems are costly to build and the helpers cache per system, so each (seed, failure) is built once.
const memo = new Map();
const system = (seed, failure) => {
  const key = `${seed}/${failure}`;
  if (!memo.has(key)) memo.set(key, makeCapstoneSystem({ seed, failure }));
  return memo.get(key);
};

// ---------------------------------------------------------------- the system

test('constants: five features, four signal features, four failure kinds', () => {
  assert.deepEqual(FEATURES, ['amount', 'velocity', 'merchantRisk', 'accountAge', 'deviceId']);
  assert.deepEqual(SIGNAL_FEATURES, FEATURES.slice(0, 4));
  assert.deepEqual(FAILURE_KINDS, ['skew', 'covariate', 'label', 'concept']);
  assert.equal(WEIGHTS.length, 4);
  assert.deepEqual(DEFAULT_COSTS, { miss: 100, falseAlarm: 5, review: 5 });
});

test('makeCapstoneSystem: shape, timeline, history and stream', () => {
  const s = system(1, 'concept');
  assert.equal(s.rows.length, s.days * s.perDay);
  assert.equal(s.launchDay, Math.round(0.4 * s.days));
  assert.equal(s.history.length, s.launchDay * s.perDay);
  assert.equal(s.stream.length, (s.days - s.launchDay) * s.perDay);
  s.rows.forEach((r, i) => {
    assert.equal(r.id, i);
    assert.equal(r.day, Math.floor(i / s.perDay));
    assert.equal(r.x.length, FEATURES.length);
    assert.equal(r.xTrue.length, FEATURES.length);
    assert.ok(r.label === 0 || r.label === 1);
    assert.ok(r.p > 0 && r.p < 1);
    assert.ok(r.entity >= 0 && r.entity < s.entities);
    close(r.t, r.day + (r.i + 0.5) / s.perDay);
    if (r.day < s.launchDay) assert.equal(r.arrival, r.day, 'history labels are all known');
    else assert.equal(r.arrival, r.day + s.labelDelay, 'a label arrives labelDelay days late');
  });
  assert.ok(s.history.every(r => r.day < s.launchDay) && s.stream.every(r => r.day >= s.launchDay));
  assert.deepEqual(s.costs, DEFAULT_COSTS);
  assert.equal(s.capacity, Math.round(0.3 * s.perDay));
});

test('makeCapstoneSystem: deterministic, and another seed is another world', () => {
  const a = makeCapstoneSystem({ seed: 7, days: 50, perDay: 30 }), b = makeCapstoneSystem({ seed: 7, days: 50, perDay: 30 });
  assert.deepEqual(a.rows, b.rows);
  assert.deepEqual(a.truth, b.truth);
  const c = makeCapstoneSystem({ seed: 8, days: 50, perDay: 30 });
  assert.notDeepEqual(a.rows.map(r => r.xTrue[0]), c.rows.map(r => r.xTrue[0]));
});

test('makeCapstoneSystem: the positive outcome is rare, and entities repeat', () => {
  for (const seed of SEEDS) {
    const s = system(seed, 'concept');          // concept shift keeps the share where it was
    const rate = mean(s.rows.map(r => r.label));
    assert.ok(rate > 0.03 && rate < 0.12, `seed ${seed}: positive share ${rate}`);
    const per = new Map();
    s.history.forEach(r => per.set(r.entity, (per.get(r.entity) ?? 0) + 1));
    assert.ok(per.size >= 30 && mean([...per.values()]) > 30, 'each established entity appears many times');
  }
});

test('makeCapstoneSystem: new entities only appear after launch', () => {
  const s = system(2, 'label');
  assert.ok(s.history.every(r => !r.isNew));
  assert.ok(s.stream.some(r => r.isNew));
  const newIds = new Set(s.stream.filter(r => r.isNew).map(r => r.entity));
  assert.ok(s.history.every(r => !newIds.has(r.entity)));
  assert.ok(newIds.size >= 5);
});

test('makeCapstoneSystem: the failure kind is drawn from the seed and all four kinds occur', () => {
  const kinds = new Set();
  for (let seed = 1; seed <= 24; seed++) {
    const s = makeCapstoneSystem({ seed, days: 40, perDay: 20 });
    assert.ok(FAILURE_KINDS.includes(s.truth.kind));
    assert.equal(s.truth.kind, makeCapstoneSystem({ seed, days: 40, perDay: 20 }).truth.kind);
    kinds.add(s.truth.kind);
  }
  assert.equal(kinds.size, 4);
});

test('makeCapstoneSystem: the failure day is inside the deployed period and seeded', () => {
  for (const seed of SEEDS) {
    for (const kind of FAILURE_KINDS) {
      const s = makeCapstoneSystem({ seed, failure: kind, days: 40, perDay: 20 });
      const deploy = s.days - s.launchDay;
      assert.ok(s.truth.day >= s.launchDay + Math.floor(0.2 * deploy) && s.truth.day < s.launchDay + Math.ceil(0.4 * deploy) + 1, `day ${s.truth.day}`);
      assert.equal(s.truth.kind, kind);
    }
    // the day does not depend on the kind: it is a property of the seed
    assert.equal(makeCapstoneSystem({ seed, failure: 'skew', days: 40, perDay: 20 }).truth.day, makeCapstoneSystem({ seed, failure: 'label', days: 40, perDay: 20 }).truth.day);
  }
});

test('failures: before the failure day every kind gives the same rows; each one changes what it should after', () => {
  const seed = 3;
  const clean = system(seed, 'concept');
  const day = clean.truth.day;
  for (const kind of ['skew', 'covariate', 'label']) {
    const s = system(seed, kind);
    assert.equal(s.truth.day, day);
    assert.deepEqual(s.rows.filter(r => r.day < day), clean.rows.filter(r => r.day < day), `${kind}: untouched days are identical`);
  }
  // skew: only the served feature changes, from the failure day on; the truth, label and p do not
  const sk = system(seed, 'skew');
  const j = FEATURES.indexOf(sk.truth.feature);
  sk.rows.forEach(r => {
    r.x.forEach((v, k) => {
      if (r.day >= sk.truth.day && k === j) assert.ok(v !== r.xTrue[k] || r.xTrue[k] === 0, 'the skewed feature differs');
      else assert.equal(v, r.xTrue[k]);
    });
  });
  const scaled = sk.rows.filter(r => r.day >= sk.truth.day && r.xTrue[j] !== 0);
  if (sk.truth.mode === 'scale') scaled.forEach(r => close(r.x[j], r.xTrue[j] * 100, 1e-9 * Math.abs(r.xTrue[j] * 100)));
  else scaled.forEach(r => assert.equal(r.x[j], 0));
  // covariate: the feature moves by 1.5 standard deviations
  const cv = system(seed, 'covariate');
  const jc = FEATURES.indexOf(cv.truth.feature);
  const shift = mean(cv.rows.filter(r => r.day >= cv.truth.day).map(r => r.x[jc])) - mean(clean.rows.filter(r => r.day >= day).map(r => r.x[jc]));
  assert.ok(shift > 1.2 && shift < 1.8, `covariate shift ${shift}`);
  cv.rows.forEach(r => assert.deepEqual(r.x, r.xTrue));
  // label: the positive share triples, the inputs barely move
  const lb = system(seed, 'label');
  const after = r => r.day >= day;
  const ratio = mean(lb.rows.filter(after).map(r => r.label)) / mean(clean.rows.filter(after).map(r => r.label));
  assert.ok(ratio > 2 && ratio < 4, `label ratio ${ratio}`);
  // concept: same inputs, a different rule: the old weights stop predicting
  const score = r => r.xTrue.slice(0, 4).reduce((s, v, k) => s + v * WEIGHTS[k], 0);
  const sorted = [...clean.rows.filter(after)].sort((a, b) => score(a) - score(b));
  const top = sorted.slice(-Math.floor(sorted.length / 5)), bottom = sorted.slice(0, Math.floor(sorted.length / 5));
  assert.ok(Math.abs(mean(top.map(r => r.label)) - mean(bottom.map(r => r.label))) < 0.03, 'under concept shift the old rule no longer separates');
  const old = system(seed, 'skew').rows.filter(r => r.day < day);
  const sortedOld = [...old].sort((a, b) => score(a) - score(b));
  assert.ok(mean(sortedOld.slice(-Math.floor(old.length / 5)).map(r => r.label)) > 2 * mean(sortedOld.slice(0, Math.floor(old.length / 5)).map(r => r.label)), 'before the failure it does');
});

test('makeCapstoneSystem: bad arguments throw RangeError', () => {
  assert.throws(() => makeCapstoneSystem({ days: 10 }), RangeError);
  assert.throws(() => makeCapstoneSystem({ perDay: 5 }), RangeError);
  assert.throws(() => makeCapstoneSystem({ entities: 3 }), RangeError);
  assert.throws(() => makeCapstoneSystem({ failure: 'weather' }), RangeError);
  assert.throws(() => makeCapstoneSystem({ labelDelay: -1 }), RangeError);
  assert.throws(() => makeCapstoneSystem({ positiveRate: 0.7 }), RangeError);
  assert.throws(() => makeCapstoneSystem({ costs: { miss: 1, falseAlarm: -1, review: 0 } }), RangeError);
});

// ---------------------------------------------------------------- the operational metric

test('reviewThreshold: (review + falseAlarm) / (miss + falseAlarm), by hand', () => {
  close(reviewThreshold(DEFAULT_COSTS), 10 / 105);
  close(reviewThreshold({ miss: 90, falseAlarm: 10, review: 20 }), 30 / 100);
  close(reviewThreshold({ miss: 50, falseAlarm: 0, review: 5 }), 0.1);
  // the same as the Level 2 cost threshold with fp = review + falseAlarm and fn = miss - review
  for (const c of [DEFAULT_COSTS, { miss: 90, falseAlarm: 10, review: 20 }, { miss: 1000, falseAlarm: 2, review: 8 }]) {
    close(reviewThreshold(c), costThreshold(c.review + c.falseAlarm, c.miss - c.review));
  }
  assert.throws(() => reviewThreshold({ miss: 0, falseAlarm: 0, review: 1 }), RangeError);
});

test('reviewThreshold is where flagging and not flagging cost the same', () => {
  const c = { miss: 80, falseAlarm: 4, review: 6 };
  const t = reviewThreshold(c);
  const flag = c.review + (1 - t) * c.falseAlarm, leave = t * c.miss;
  close(flag, leave);
});

const P = [0.9, 0.5, 0.2, 0.1, 0.09, 0.05, 0.04, 0.03, 0.02, 0.01];
const Y = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0];

test('operationalMetric: hand-computed cost at the threshold, no capacity limit', () => {
  const m = operationalMetric(P, Y);
  close(m.threshold, 10 / 105);                       // 0.0952: flags 0.9, 0.5, 0.2, 0.1
  assert.equal(m.wouldFlag, 4);
  assert.equal(m.flagged, 4);
  assert.equal(m.capacityBinding, false);
  assert.deepEqual(m.flaggedIdx, [0, 1, 2, 3]);
  assert.deepEqual([m.tp, m.fp, m.fn, m.tn], [2, 2, 1, 5]);
  assert.equal(m.totalCost, 4 * 5 + 2 * 5 + 1 * 100);   // 4 reviews, 2 false alarms, 1 miss = 130
  close(m.expectedCost, 13);
  assert.equal(m.costFlagNone, 300);
  assert.equal(m.savings, 170);
  close(m.precision, 0.5);
  close(m.recall, 2 / 3);
  assert.equal(m.positives, 3);
});

test('operationalMetric: a review capacity keeps the highest-scored cases', () => {
  const m3 = operationalMetric(P, Y, DEFAULT_COSTS, 3);
  assert.equal(m3.wouldFlag, 4);
  assert.equal(m3.flagged, 3);
  assert.equal(m3.capacityBinding, true);
  assert.deepEqual(m3.flaggedIdx, [0, 1, 2]);
  assert.deepEqual([m3.tp, m3.fp, m3.fn], [2, 1, 1]);
  assert.equal(m3.totalCost, 3 * 5 + 1 * 5 + 100);     // 120
  const m2 = operationalMetric(P, Y, DEFAULT_COSTS, 2);
  assert.deepEqual([m2.tp, m2.fp, m2.fn], [1, 1, 2]);
  assert.equal(m2.totalCost, 2 * 5 + 1 * 5 + 2 * 100);  // 215
  const m0 = operationalMetric(P, Y, DEFAULT_COSTS, 0);
  assert.equal(m0.flagged, 0);
  assert.equal(m0.totalCost, m0.costFlagNone);
  // a capacity above the number of candidates changes nothing
  assert.equal(operationalMetric(P, Y, DEFAULT_COSTS, 50).totalCost, 130);
  assert.equal(operationalMetric(P, Y, DEFAULT_COSTS, 50).capacityBinding, false);
});

test('operationalMetric: order does not matter, ties go to the earlier case, and a dear review flags nothing', () => {
  const idx = [3, 1, 0, 2, 4, 5, 6, 7, 8, 9];
  const shuffled = operationalMetric(idx.map(i => P[i]), idx.map(i => Y[i]));
  assert.equal(shuffled.totalCost, 130);
  const ties = operationalMetric([0.5, 0.5, 0.5, 0.5], [0, 1, 0, 1], DEFAULT_COSTS, 2);
  assert.deepEqual(ties.flaggedIdx, [0, 1]);
  const dear = operationalMetric(P, Y, { miss: 4, falseAlarm: 1, review: 5 });
  assert.ok(dear.threshold > 1);
  assert.equal(dear.flagged, 0);
  assert.throws(() => operationalMetric([0.1], [1, 0]), RangeError);
  assert.throws(() => operationalMetric([0.1], [1], DEFAULT_COSTS, -1), RangeError);
});

// ---------------------------------------------------------------- the split

test('chooseSplit grouped: an entity is never on both sides; the split covers the history', () => {
  for (const seed of [1, 2, 3]) {
    const s = system(seed, 'concept');
    const sp = chooseSplit(s, 'grouped', { model: 'logistic' });
    assert.equal(sp.sharedEntities, 0);
    const train = new Set(sp.train.map(i => s.history[i].entity)), test = new Set(sp.test.map(i => s.history[i].entity));
    for (const e of test) assert.ok(!train.has(e), `entity ${e} is on both sides`);
    assert.equal(sp.train.length + sp.test.length, s.history.length);
    assert.equal(new Set([...sp.train, ...sp.test]).size, s.history.length);
    assert.ok(sp.test.length > 0.1 * s.history.length);
  }
});

test('chooseSplit temporal: training never contains the future', () => {
  for (const seed of [1, 2, 3]) {
    const s = system(seed, 'concept');
    const sp = chooseSplit(s, 'temporal', { model: 'logistic' });
    assert.equal(sp.trainsOnFuture, false);
    const maxTrain = Math.max(...sp.train.map(i => s.history[i].t)), minTest = Math.min(...sp.test.map(i => s.history[i].t));
    assert.ok(maxTrain <= minTest, `${maxTrain} > ${minTest}`);
    assert.equal(sp.train.length + sp.test.length, s.history.length);
    assert.ok(sp.sharedEntities > 0, 'time alone does not remove the entity overlap');
  }
});

test('chooseSplit random: entities and time are both mixed', () => {
  const s = system(1, 'concept');
  const sp = chooseSplit(s, 'random', { model: 'logistic' });
  assert.ok(sp.sharedEntities > 0.8 * s.history.reduce((set, r) => set.add(r.entity), new Set()).size);
  assert.equal(sp.trainsOnFuture, true);
  assert.equal(chooseSplit(s, 'random', { model: 'logistic' }).train.join(), sp.train.join(), 'deterministic');
  assert.throws(() => chooseSplit(s, 'fancy'), RangeError);
});

test('chooseSplit: a random split flatters the forest more than a grouped one (margin over seeds)', () => {
  const gaps = SEEDS.map(seed => {
    const s = system(seed, 'concept');
    const r = chooseSplit(s, 'random'), g = chooseSplit(s, 'grouped');
    close(r.optimism, r.estimate - r.realised, 1e-12);
    return { r: r.optimism, g: g.optimism, est: r.estimate - g.estimate };
  });
  const margin = mean(gaps.map(x => x.r)) - mean(gaps.map(x => x.g));
  assert.ok(margin > 0.08, `mean optimism gap random - grouped = ${margin}`);
  assert.ok(gaps.filter(x => x.r > x.g).length >= 4, 'random is the more optimistic one on most seeds');
  assert.ok(mean(gaps.map(x => x.est)) > 0.05, 'and its estimate is higher');
});

// ---------------------------------------------------------------- the candidates

test('trainCandidates: baseline, logistic and forest on one split', () => {
  const s = system(3, 'concept');
  const sp = chooseSplit(s, 'grouped', { model: 'logistic' });
  const out = trainCandidates(s, sp);
  assert.deepEqual(out.candidates.map(c => c.name), ['baseline', 'logistic', 'forest']);
  assert.equal(out.labels.length, sp.test.length);
  const base = out.byName.baseline;
  assert.equal(base.auc, 0.5, 'the prior has no ranking');
  assert.ok(new Set(base.probas).size === 1);
  assert.ok(out.byName.logistic.auc > 0.65);
  assert.ok(out.byName.forest.auc > 0.5);
  for (const c of out.candidates) {
    assert.equal(c.probas.length, sp.test.length);
    const op = operationalMetric(c.probas, out.labels, s.costs, Math.round((s.capacity * sp.test.length) / s.perDay));
    assert.equal(c.operational.totalCost, op.totalCost);
    assert.ok(c.averagePrecision >= 0 && c.averagePrecision <= 1);
  }
  const lowest = Math.min(...out.candidates.map(c => c.operational.expectedCost));
  assert.equal(out.byName[out.best].operational.expectedCost, lowest);
  assert.notEqual(out.best, 'baseline');
  // the same seed gives the same candidates
  assert.deepEqual(trainCandidates(s, sp).candidates.map(c => c.auc), out.candidates.map(c => c.auc));
});

test('deployedModel: fitted on the whole history, cached, and it ranks the clean days', () => {
  const s = system(2, 'concept');
  const m = deployedModel(s);
  assert.equal(deployedModel(s), m);
  const clean = s.stream.filter(r => r.day < s.truth.day);
  const probas = m.predictProba(clean.map(r => r.x));
  assert.equal(probas.length, clean.length);
  assert.ok(probas.every(p => p >= 0 && p <= 1));
  assert.notEqual(deployedModel(s, 'forest'), m);
});

// ---------------------------------------------------------------- reproducibility

const SETTINGS = { system: { days: 50, entities: 30, perDay: 40 }, splitKind: 'grouped', model: 'logistic', testFraction: 0.25, costs: DEFAULT_COSTS, fitOpts: {} };

test('repro: a record with the seed, settings, split fingerprint and metrics', () => {
  const out = runExperiment(5, SETTINGS);
  const run = repro(5, SETTINGS, out.split, out.metrics);
  assert.equal(run.version, 1);
  assert.equal(run.seed, 5);
  assert.deepEqual(run.settings, SETTINGS);
  assert.equal(run.split.kind, 'grouped');
  assert.equal(run.split.nTrain, out.split.train.length);
  assert.equal(run.split.nTest, out.split.test.length);
  assert.match(run.split.hash, /^[0-9a-f]{8}$/);
  assert.deepEqual(run.metrics, out.metrics);
  assert.deepEqual(JSON.parse(JSON.stringify(run)), run, 'JSON-safe');
  assert.ok(out.metrics.auc > 0.5 && out.metrics.auc <= 1);
});

test('checkReproducible passes for the same seed and settings', () => {
  const out = runExperiment(5, SETTINGS);
  const run = repro(5, SETTINGS, out.split, out.metrics);
  const check = checkReproducible(run);
  assert.equal(check.reproducible, true);
  assert.equal(check.splitSame, true);
  assert.deepEqual(check.mismatches, []);
  assert.deepEqual(check.rerun.metrics, run.metrics);
});

test('checkReproducible fails when a setting, the data or the seed changes', () => {
  const out = runExperiment(5, SETTINGS);
  const run = repro(5, SETTINGS, out.split, out.metrics);
  const model = checkReproducible(run, { model: 'forest', fitOpts: { trees: 10 } });
  assert.equal(model.reproducible, false);
  assert.ok(model.mismatches.some(m => m.field === 'auc'));
  const kind = checkReproducible(run, { splitKind: 'random' });
  assert.equal(kind.reproducible, false);
  assert.equal(kind.splitSame, false);
  assert.ok(kind.mismatches.some(m => m.field === 'split'));
  const costs = checkReproducible(run, { costs: { miss: 300, falseAlarm: 5, review: 5 } });
  assert.equal(costs.reproducible, false);
  assert.ok(costs.mismatches.some(m => m.field === 'expectedCost'));
  assert.equal(checkReproducible(run, { system: { ...SETTINGS.system, days: 60 } }).reproducible, false);
  // a setting edited in the saved record is caught too, and so is a seed that is not the recorded one
  const edited = JSON.parse(JSON.stringify(run));
  edited.settings.testFraction = 0.2;
  assert.equal(checkReproducible(edited).reproducible, false);
  assert.equal(checkReproducible({ ...run, seed: 6 }).reproducible, false);
  // a recorded number that does not come out again is a mismatch, named
  const tampered = { ...run, metrics: { ...run.metrics, auc: run.metrics.auc + 0.01 } };
  const t = checkReproducible(tampered);
  assert.equal(t.reproducible, false);
  assert.deepEqual(t.mismatches.map(m => m.field), ['auc']);
});

// ---------------------------------------------------------------- the monitoring plan

test('evaluatePlan: watching the failing input beats watching only the delayed labels', () => {
  const s = system(2, 'skew');                   // accountAge x 100 from the failure day
  assert.equal(s.truth.mode, 'scale');
  const watch = evaluatePlan({ system: s, plan: SENSIBLE_PLAN });
  const delayed = evaluatePlan({ system: s, plan: DELAYED_ONLY_PLAN });
  assert.equal(watch.falseAlarmDays, 0);
  assert.equal(delayed.falseAlarmDays, 0);
  assert.ok(watch.firstAlert !== null && watch.detectionDelay <= 3, `input monitors fire after ${watch.detectionDelay} days`);
  assert.ok(watch.byRule.psi !== null && watch.byRule.psi <= s.truth.day + 3);
  assert.ok(delayed.firstAlert !== null, 'the labels do show it, in the end');
  assert.ok(delayed.detectionDelay >= s.labelDelay, `a delayed-label monitor cannot know before the labels arrive (${delayed.detectionDelay})`);
  assert.ok(watch.firstAlert < delayed.firstAlert);
  assert.ok(watch.costUntilDetection < delayed.costUntilDetection, `${watch.costUntilDetection} vs ${delayed.costUntilDetection}`);
  assert.ok(watch.totalCost < delayed.totalCost);
  assert.deepEqual(Object.keys(delayed.byRule), ['delayed']);
});

test('evaluatePlan: the same ordering on other skew and covariate seeds', () => {
  for (const [seed, kind] of [[3, 'skew'], [4, 'skew'], [6, 'skew'], [2, 'covariate'], [3, 'covariate'], [4, 'covariate']]) {
    const s = system(seed, kind);
    const watch = evaluatePlan({ system: s, plan: { monitors: { psi: { threshold: 0.25, window: 7 } } } });
    const delayed = evaluatePlan({ system: s, plan: DELAYED_ONLY_PLAN });
    assert.ok(watch.firstAlert !== null, `${kind} ${seed}: the input monitor fires`);
    assert.ok(delayed.firstAlert === null || watch.firstAlert < delayed.firstAlert, `${kind} ${seed}`);
    assert.ok(watch.costUntilDetection <= delayed.costUntilDetection, `${kind} ${seed}: ${watch.costUntilDetection} vs ${delayed.costUntilDetection}`);
  }
});

test('evaluatePlan: only the delayed labels reveal a concept shift', () => {
  for (const seed of [2, 3, 4]) {
    const s = system(seed, 'concept');
    const inputs = evaluatePlan({ system: s, plan: { monitors: { psi: { threshold: 0.25, window: 7 }, score: { threshold: 0.25, window: 7 } } } });
    assert.equal(inputs.firstAlert, null, `seed ${seed}: the inputs and scores look normal`);
    const labels = evaluatePlan({ system: s, plan: DELAYED_ONLY_PLAN });
    assert.ok(labels.firstAlert !== null && labels.detectionDelay >= s.labelDelay);
    assert.ok(labels.costUntilDetection > 0);
    assert.ok(inputs.costUntilDetection > labels.costUntilDetection, 'never catching it costs more than catching it late');
  }
});

test('evaluatePlan: a share-of-positives monitor catches label shift that the inputs do not show', () => {
  const s = system(2, 'label');
  const inputs = evaluatePlan({ system: s, plan: { monitors: { psi: { threshold: 0.25, window: 7 } } } });
  assert.equal(inputs.firstAlert, null);
  const prev = evaluatePlan({ system: s, plan: { monitors: { prevalence: { ratio: 1.5, window: 14 } } } });
  assert.ok(prev.firstAlert !== null && prev.firstAlert > s.truth.day + 3);
  assert.equal(prev.falseAlarmDays, 0);
});

test('evaluatePlan: twitchy thresholds raise false alarms on the clean period', () => {
  const s = system(2, 'skew');
  const twitchy = evaluatePlan({ system: s, plan: { monitors: { psi: { threshold: 0.02, window: 1 } }, consecutive: 1 } });
  assert.ok(twitchy.falseAlarmDays >= 3, `${twitchy.falseAlarmDays} false alarm days`);
  assert.equal(twitchy.alarmCost, twitchy.falseAlarmDays * 50);
  assert.equal(twitchy.totalCost, twitchy.costUntilDetection + twitchy.alarmCost);
  assert.ok(twitchy.alerts.every(a => ['psi', 'score', 'delayed', 'prevalence'].includes(a.rule)));
  const calm = evaluatePlan({ system: s, plan: SENSIBLE_PLAN });
  assert.equal(calm.falseAlarmDays, 0);
  const dearer = evaluatePlan({ system: s, plan: { monitors: { psi: { threshold: 0.02, window: 1 } }, consecutive: 1 }, investigationCost: 100 });
  assert.equal(dearer.alarmCost, twitchy.falseAlarmDays * 100);
});

test('evaluatePlan: no monitors never alert; the cost runs to the end of the stream', () => {
  const s = system(3, 'skew');
  const none = evaluatePlan({ system: s, plan: { monitors: {} } });
  assert.equal(none.firstAlert, null);
  assert.equal(none.detectionDelay, null);
  assert.equal(none.falseAlarmDays, 0);
  assert.deepEqual(none.alerts, []);
  const watch = evaluatePlan({ system: s, plan: SENSIBLE_PLAN });
  assert.ok(none.costUntilDetection > watch.costUntilDetection);
  assert.ok(none.cleanDayCost > 0);
  assert.throws(() => evaluatePlan({ system: s }), RangeError);
  assert.throws(() => evaluatePlan({ system: s, plan: { monitors: { psi: { features: ['nope'] } } } }), RangeError);
});

test('evaluatePlan: a monitor only on the wrong feature is late, one on the failing feature is not', () => {
  const s = system(4, 'skew');               // amount x 100
  assert.equal(s.truth.feature, 'amount');
  const wrong = evaluatePlan({ system: s, plan: { monitors: { psi: { threshold: 0.25, window: 7, features: ['velocity', 'merchantRisk'] } } } });
  const right = evaluatePlan({ system: s, plan: { monitors: { psi: { threshold: 0.25, window: 7, features: ['amount'] } } } });
  assert.equal(wrong.firstAlert, null);
  assert.ok(right.firstAlert !== null && right.detectionDelay <= 3);
});

// ---------------------------------------------------------------- the investigation

const label = (r) => `${r.hypothesis.kind}${r.hypothesis.feature ? '/' + r.hypothesis.feature : ''}`;

test('investigate: each hidden failure is the only hypothesis that is confirmed for it', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    for (const kind of FAILURE_KINDS) {
      const s = system(seed, kind);
      const verdict = Object.fromEntries(FAILURE_KINDS.map(h => [h, investigate(s, { kind: h, feature: s.truth.feature }, { remedy: false }).confirmed]));
      const confirmed = FAILURE_KINDS.filter(h => verdict[h]);
      assert.deepEqual(confirmed, [kind], `seed ${seed}, failure ${kind}: confirmed ${confirmed.join(',') || 'nothing'}`);
    }
  }
});

test('investigate: without a feature it looks at the one with the largest PSI', () => {
  for (const kind of ['skew', 'covariate']) {
    const s = system(3, kind);
    const r = investigate(s, { kind });
    assert.equal(r.confirmed, true);
    assert.equal(r.hypothesis.feature, s.truth.feature);
    assert.equal(r.evidence.suspect, s.truth.feature);
  }
});

test('investigate: the wrong feature, an identifier, and a mixed-up kind are not confirmed', () => {
  const s = system(3, 'skew');                        // accountAge
  assert.equal(investigate(s, { kind: 'skew', feature: 'amount' }).confirmed, false);
  assert.equal(investigate(s, { kind: 'skew', feature: 'deviceId' }).confirmed, false);
  assert.equal(investigate(s, { kind: 'covariate', feature: 'accountAge' }).confirmed, false, 'a bug is not drift');
  const c = system(3, 'covariate');
  assert.equal(investigate(c, { kind: 'skew', feature: c.truth.feature }).confirmed, false, 'drift is not a bug');
  assert.equal(investigate(c, { kind: 'covariate', feature: 'deviceId' }).confirmed, false);
  assert.equal(investigate(c, { kind: 'covariate', feature: 'amount' }).confirmed === (c.truth.feature === 'amount'), true);
  assert.throws(() => investigate(s, { kind: 'weather' }), RangeError);
  assert.throws(() => investigate(s, { kind: 'skew', feature: 'nope' }), RangeError);
  assert.throws(() => investigate(s, null), RangeError);
});

test('investigate: the evidence numbers tell the four stories', () => {
  const sk = investigate(system(2, 'skew'), { kind: 'skew' });
  const row = sk.evidence.featureTable.find(f => f.feature === system(2, 'skew').truth.feature);
  assert.ok(row.psi > 1 && row.psi > 0.25);
  assert.equal(row.verdict, 'large');
  assert.ok(row.mismatch > 0.95, 'the served value differs from the offline one almost everywhere');
  assert.ok(sk.evidence.featureTable.filter(f => f !== row).every(f => f.mismatch === 0));
  assert.equal(sk.evidence.featureTable.length, 5);
  assert.ok(sk.evidence.featureTable.find(f => f.feature === 'deviceId').identifier);
  assert.ok(sk.evidence.scoreDrift > 0.25);
  assert.ok(sk.evidence.delayed.drop > 0.05, 'and the labels show it too');

  const cv = investigate(system(2, 'covariate'), { kind: 'covariate' });
  assert.ok(cv.evidence.featureTable.find(f => f.feature === system(2, 'covariate').truth.feature).psi > 1);
  assert.ok(cv.evidence.featureTable.every(f => f.mismatch === 0), 'the raw inputs really moved');

  const lb = investigate(system(2, 'label'), { kind: 'label' });
  assert.ok(lb.evidence.featureTable.filter(f => !f.identifier).every(f => f.psi < 0.25));
  assert.ok(lb.evidence.delayed.prevalenceRatio > 1.4);
  assert.ok(lb.evidence.delayed.drop <= 0.1, 'ranking holds, calibration does not');

  const cc = investigate(system(2, 'concept'), { kind: 'concept' });
  assert.ok(cc.evidence.featureTable.filter(f => !f.identifier).every(f => f.psi < 0.25));
  assert.ok(cc.evidence.delayed.drop > 0.2, 'the old rule stopped ranking');
  assert.ok(cc.evidence.scoreDrift < 0.25);
  const d = cc.evidence.delayed;
  assert.ok(d.accuracy > 0.5 && d.accuracy <= 1, 'accuracy at the cost threshold');
  assert.ok(d.recall >= 0 && d.recall <= 1);
  assert.ok(d.positives > 10 && d.n > 300);
  assert.ok(cc.evidence.delayed.prevalenceRatio < 1.4 + 0.5);
});

test('investigate: slices, window and reasons', () => {
  const s = system(2, 'skew');
  const r = investigate(s, { kind: 'skew' });
  assert.equal(r.evidence.window, 10);
  assert.equal(r.evidence.asOf, s.truth.day + s.labelDelay + 10);
  const cohort = r.evidence.slices.cohort;
  assert.deepEqual(cohort.map(c => c.name), ['established', 'new']);
  close(cohort[0].share + cohort[1].share, 1);
  const bins = r.evidence.slices.feature.bins;
  assert.equal(r.evidence.slices.feature.feature, s.truth.feature);
  assert.equal(bins.length, 3);
  close(bins.reduce((a, b) => a + b.share, 0), 1);
  close(bins.reduce((a, b) => a + b.referenceShare, 0), 1);
  assert.ok(Math.max(...bins.map(b => Math.abs(b.share - b.referenceShare))) > 0.3, 'the rows pile into one bin');
  assert.ok(r.reasons.length >= 1 && r.reasons.every(x => typeof x === 'string'));
  const early = investigate(s, { kind: 'skew' }, { asOf: s.truth.day + 2, window: 3 });
  assert.equal(early.evidence.asOf, s.truth.day + 2);
  assert.equal(early.evidence.window, 3);
  assert.equal(early.confirmed, true, 'the offline check needs no labels');
});

test('investigate: the best remedy usually matches the failure (a right diagnosis can still carry some regret)', () => {
  const wins = (kind, remedy) => SEEDS.filter(seed => investigate(system(seed, kind), { kind }).remedy.best === remedy).length;
  assert.ok(wins('skew', 'rollback') >= 4, 'rollback repairs a serving bug');
  assert.ok(wins('concept', 'retrain') >= 5, 'only new labels repair a changed rule');
  assert.ok(wins('label', 'recalibrate') >= 4, 'a new prior is a recalibration');
  // the regret of the remedy that goes with the RIGHT diagnosis is far smaller than that of the wrong ones
  for (const kind of ['skew', 'concept', 'label']) {
    const regret = h => mean(SEEDS.map(seed => investigate(system(seed, kind), { kind: h }).remedy.forHypothesis.regret));
    const right = regret(kind);
    const wrong = mean(FAILURE_KINDS.filter(h => h !== kind && h !== 'covariate').map(regret));
    assert.ok(right < 0.3 * wrong, `${kind}: regret ${right} after the right diagnosis, ${wrong} after a wrong one`);
  }
  assert.equal(remedyFor('skew'), 'rollback');
  assert.equal(remedyFor('label'), 'recalibrate');
  assert.equal(remedyFor('concept'), 'retrain');
  assert.equal(remedyFor('covariate'), 'none');

  const r = investigate(system(2, 'skew'), { kind: 'skew' });
  assert.deepEqual(r.remedy.options.map(o => o.kind).sort(), ['none', 'recalibrate', 'retrain', 'rollback']);
  for (let i = 1; i < r.remedy.options.length; i++) assert.ok(r.remedy.options[i - 1].total <= r.remedy.options[i].total);
  const rollback = r.remedy.options.find(o => o.kind === 'rollback');
  assert.equal(rollback.fixed, 1 * 50);
  assert.equal(rollback.latencyDays, 0);
  assert.equal(r.remedy.options.find(o => o.kind === 'retrain').fixed, 10 * 50);
  assert.equal(r.remedy.options.find(o => o.kind === 'retrain').latencyDays, 3);
  assert.equal(r.remedy.options.find(o => o.kind === 'none').fixed, 0);
  for (const o of r.remedy.options) close(o.total, o.fixed + o.operational, 1e-6);
  assert.equal(r.remedy.bestTotal, r.remedy.options[0].total);
  assert.equal(r.remedy.forHypothesis.kind, 'rollback');
  assert.equal(r.remedy.forHypothesis.regret, 0);
  assert.equal(investigate(system(5, 'skew'), { kind: 'skew' }).remedy.forHypothesis.regret > 0, true, 'seed 5: retrain also repairs this unit change, and is cheaper');
  // the remedy of a wrong diagnosis costs more than the right one
  const s = system(2, 'concept');
  const wrong = investigate(s, { kind: 'skew' });
  assert.equal(wrong.remedy.forHypothesis.kind, 'rollback');
  assert.ok(wrong.remedy.forHypothesis.regret > 500, `regret ${wrong.remedy.forHypothesis.regret}`);
  assert.equal(investigate(s, { kind: 'concept' }).remedy.forHypothesis.regret, 0);
  // a cheaper unit makes the fixed costs smaller
  const cheap = investigate(system(2, 'skew'), { kind: 'skew' }, { unit: 1 });
  assert.equal(cheap.remedy.options.find(o => o.kind === 'retrain').fixed, 10);
  assert.equal(label(r), 'skew/' + system(2, 'skew').truth.feature);
});

test('investigate: deterministic', () => {
  const s = system(4, 'covariate');
  assert.deepEqual(investigate(s, { kind: 'covariate' }), investigate(s, { kind: 'covariate' }));
  assert.equal(investigate(s, { kind: 'covariate' }, { remedy: false }).remedy, null);
});

test('investigate: at any alert day after the failure no WRONG hypothesis is confirmed', () => {
  const cases = [[6, 'label'], [6, 'concept'], [2, 'concept'], [3, 'label'], [4, 'covariate'], [5, 'skew']];
  for (const [seed, kind] of cases) {
    const s = system(seed, kind);
    for (let asOf = s.truth.day + 1; asOf <= s.truth.day + s.labelDelay + 15; asOf += 1) {
      const confirmed = FAILURE_KINDS.filter(h => investigate(s, { kind: h, feature: s.truth.feature }, { asOf, remedy: false }).confirmed);
      assert.ok(confirmed.every(h => h === kind), `seed ${seed} ${kind}, asOf +${asOf - s.truth.day}: confirmed ${confirmed.join(',')}`);
    }
  }
  // the skew and covariate rules need no labels: they hold from the first day of the failure
  const sk = system(3, 'skew');
  assert.equal(investigate(sk, { kind: 'skew' }, { asOf: sk.truth.day + 1, window: 1, remedy: false }).confirmed, true);
  // a small system, where asOf is clamped to the last day
  const small = makeCapstoneSystem({ seed: 3, failure: 'concept', days: 50, perDay: 40, entities: 30 });
  const r = investigate(small, { kind: 'concept' }, { asOf: 10000 });
  assert.equal(r.evidence.asOf, small.days - 1);
  assert.deepEqual(FAILURE_KINDS.filter(h => investigate(small, { kind: h }, { remedy: false }).confirmed), ['concept']);
});

test('checkReproducible survives a JSON round trip: a missing class (NaN AUC) and an unlimited capacity', () => {
  const tiny = { system: { days: 40, entities: 12, perDay: 20 }, splitKind: 'grouped', model: 'logistic', testFraction: 0.25, costs: DEFAULT_COSTS, fitOpts: {} };
  let nan = 0;
  for (let seed = 1; seed <= 12; seed++) {
    for (const extra of [{}, { capacity: Infinity }, { capacity: 3 }]) {
      const settings = { ...tiny, ...extra };
      const out = runExperiment(seed, settings);
      if (Number.isNaN(out.metrics.auc)) nan++;
      const stored = JSON.parse(JSON.stringify(repro(seed, settings, out.split, out.metrics)));
      const check = checkReproducible(stored);
      assert.equal(check.reproducible, true, `seed ${seed} ${JSON.stringify(extra)}: ${JSON.stringify(check.mismatches)}`);
    }
  }
  assert.ok(nan > 0, 'the tiny systems do hit the NaN case');
  const out = runExperiment(1, { ...tiny, capacity: Infinity });
  const run = repro(1, { ...tiny, capacity: Infinity }, out.split, out.metrics);
  assert.equal(checkReproducible(run, { capacity: 2 }).reproducible, false, 'a different capacity is a different run');
});
