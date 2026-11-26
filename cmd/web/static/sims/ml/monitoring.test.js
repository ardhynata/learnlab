import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEATURES, WORLD_WEIGHTS, REMEDIES, REMEDY_COSTS, DEFAULT_MONITORS, DEFAULT_POLICY, SCENARIOS,
  makeStream, scenarioStream, makeModels, recalibrate, retrainLogistic, replay, evaluateAlerts, falseAlarms,
  delayedMetrics, psiAlert, applyRemedy, decisionCost, compareRemedies, scoreChoice,
} from './monitoring.js';
import { sigmoid } from './logistic.js';
import { auc } from './calibration.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (tol ${tol})`);
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const SEEDS = [1, 2, 3, 4, 5];
const EVENT_DAY = 10;
const after = stream => stream.rows.filter(r => r.day >= EVENT_DAY);
const before = stream => stream.rows.filter(r => r.day < EVENT_DAY);

// ---- the stream --------------------------------------------------------------------------------

test('makeStream: shapes, timestamps, arrival days, reproducibility, validation', () => {
  const s = makeStream({ days: 12, perDay: 50, seed: 4, labelDelay: 3 });
  assert.equal(s.rows.length, 600);
  assert.deepEqual(s.featureNames, FEATURES);
  assert.deepEqual(s.weights, WORLD_WEIGHTS);
  s.rows.forEach((r, k) => {
    assert.equal(r.id, k);
    assert.equal(r.day, Math.floor(k / 50));
    assert.equal(r.arrival, r.day + 3);
    close(r.t, r.day + (r.i + 0.5) / 50);
    assert.equal(r.x.length, 4);
    assert.ok(r.label === 0 || r.label === 1);
    assert.deepEqual(r.x, r.xTrue, 'a clean stream serves exactly what the world produced');
    close(r.p, sigmoid(dot(WORLD_WEIGHTS, r.xTrue)), 1e-12);
  });
  assert.deepEqual(makeStream({ days: 12, perDay: 50, seed: 4, labelDelay: 3 }), s);
  assert.notDeepEqual(makeStream({ days: 12, perDay: 50, seed: 5, labelDelay: 3 }).rows, s.rows);
  // reference: clean, labels known, split 70/30, disjoint from the stream
  const ref = s.reference;
  assert.equal(ref.rows.length, 14 * 50);
  assert.equal(ref.train.length + ref.holdout.length, ref.rows.length);
  assert.ok(ref.rows.every(r => r.arrival === r.day && r.day < 0));
  assert.ok(Math.abs(mean(ref.rows.map(r => r.label)) - 0.5) < 0.06);
  assert.throws(() => makeStream({ days: 0 }), RangeError);
  assert.throws(() => makeStream({ perDay: 3 }), RangeError);
  assert.throws(() => makeStream({ events: [{ kind: 'meteor', day: 3 }] }), /kind must be one of/);
  assert.throws(() => makeStream({ events: [{ kind: 'skew', day: 3, feature: 'colour' }] }), /unknown feature/);
  assert.throws(() => makeStream({ events: [{ kind: 'label', day: 3, prevalence: 1.2 }] }), RangeError);
  assert.throws(() => makeStream({ events: [{ kind: 'covariate', day: -1 }] }), RangeError);
  assert.throws(() => scenarioStream('nope'), /unknown scenario/);
  assert.deepEqual(Object.keys(SCENARIOS), ['clean', 'covariate', 'unit', 'default', 'label', 'concept']);
});

test('the clean world is what the docs say: positive share 0.5, unit-variance features, the stated rule', () => {
  const s = makeStream({ days: 40, perDay: 200, seed: 9 });
  assert.ok(Math.abs(mean(s.rows.map(r => r.label)) - 0.5) < 0.02);
  for (let j = 0; j < 4; j++) {
    const col = s.rows.map(r => r.x[j]);
    assert.ok(Math.abs(mean(col)) < 0.05, `feature ${j} mean`);
    assert.ok(Math.abs(Math.sqrt(mean(col.map(v => v * v))) - 1) < 0.05, `feature ${j} sd`);
  }
  // labels follow P(1 | x): the average label in the top probability decile is high, in the bottom low
  const sorted = [...s.rows].sort((a, b) => a.p - b.p), k = Math.floor(sorted.length / 10);
  assert.ok(mean(sorted.slice(-k).map(r => r.label)) > 0.9);
  assert.ok(mean(sorted.slice(0, k).map(r => r.label)) < 0.1);
});

// ---- each event changes only what it should ------------------------------------------------------

test('covariate event: only the one feature moves, by exactly the shift; the rule P(label | x) is untouched', () => {
  const clean = makeStream({ days: 30, seed: 7 });
  const s = makeStream({ days: 30, seed: 7, events: [{ kind: 'covariate', day: EVENT_DAY, feature: 'spend', shift: 1.5 }] });
  assert.deepEqual(before(s), before(clean), 'days before the event are identical rows');
  s.rows.forEach((r, k) => {
    const c = clean.rows[k];
    assert.equal(r.arrival, c.arrival);
    assert.deepEqual(r.x, r.xTrue, 'no serving bug');
    close(r.p, sigmoid(dot(WORLD_WEIGHTS, r.xTrue)), 1e-12);   // the labelling rule did not change
    if (r.day >= EVENT_DAY) {
      close(r.xTrue[0] - c.xTrue[0], 1.5, 1e-12);
      for (let j = 1; j < 4; j++) assert.equal(r.xTrue[j], c.xTrue[j]);
    }
  });
  assert.ok(mean(after(s).map(r => r.xTrue[0])) > 1.3);
});

test('covariate ramp: the shift grows over `ramp` days, then holds', () => {
  const clean = makeStream({ days: 25, seed: 2 });
  const s = makeStream({ days: 25, seed: 2, events: [{ kind: 'covariate', day: EVENT_DAY, feature: 0, shift: 2, ramp: 4 }] });
  const gap = d => s.rows[d * 200 + 5].xTrue[0] - clean.rows[d * 200 + 5].xTrue[0];
  close(gap(EVENT_DAY - 1), 0);
  close(gap(EVENT_DAY), 0.5, 1e-12);
  close(gap(EVENT_DAY + 1), 1, 1e-12);
  close(gap(EVENT_DAY + 3), 2, 1e-12);
  close(gap(EVENT_DAY + 12), 2, 1e-12);
});

test('skew events (unit change, default fill): only the SERVED features change; truth, labels and arrivals do not', () => {
  const clean = makeStream({ days: 30, seed: 7 });
  const unit = makeStream({ days: 30, seed: 7, events: [{ kind: 'skew', day: EVENT_DAY, feature: 'spend', mode: 'scale', factor: 100 }] });
  const fill = makeStream({ days: 30, seed: 7, events: [{ kind: 'skew', day: EVENT_DAY, feature: 'tenure', mode: 'default', value: 0 }] });
  for (const [s, j] of [[unit, 0], [fill, 1]]) {
    assert.deepEqual(before(s), before(clean));
    s.rows.forEach((r, k) => {
      const c = clean.rows[k];
      assert.deepEqual(r.xTrue, c.xTrue);
      assert.equal(r.label, c.label);
      assert.equal(r.p, c.p);
      assert.equal(r.arrival, c.arrival);
      r.x.forEach((v, f) => { if (f !== j || r.day < EVENT_DAY) assert.equal(v, c.x[f]); });
    });
  }
  after(unit).forEach(r => close(r.x[0], r.xTrue[0] * 100, 1e-9));
  after(fill).forEach(r => assert.equal(r.x[1], 0));
});

test('concept event: the inputs are identical, only the labelling rule changes', () => {
  const clean = makeStream({ days: 30, seed: 7 });
  const s = makeStream({ days: 30, seed: 7, events: [{ kind: 'concept', day: EVENT_DAY, angle: Math.PI / 2 }] });
  assert.deepEqual(before(s), before(clean));
  s.rows.forEach((r, k) => {
    assert.deepEqual(r.x, clean.rows[k].x);
    assert.equal(r.arrival, clean.rows[k].arrival);
  });
  const w = [WORLD_WEIGHTS[1] * -1, WORLD_WEIGHTS[0], WORLD_WEIGHTS[2], WORLD_WEIGHTS[3]];   // (w0, w1) turned by 90 degrees
  after(s).forEach(r => close(r.p, sigmoid(dot(w, r.xTrue)), 1e-9));
  const changed = mean(after(s).map((r, k) => (r.label === after(clean)[k].label ? 0 : 1)));
  assert.ok(changed > 0.15, `a rule change flips plenty of labels (${changed})`);
});

test('label event: the positive share moves, each class keeps its own feature distribution', () => {
  const clean = makeStream({ days: 50, seed: 7 });
  const s = makeStream({ days: 50, seed: 7, events: [{ kind: 'label', day: EVENT_DAY, prevalence: 0.12 }] });
  assert.deepEqual(before(s), before(clean));
  assert.ok(Math.abs(mean(after(s).map(r => r.label)) - 0.12) < 0.02);
  assert.ok(Math.abs(mean(after(clean).map(r => r.label)) - 0.5) < 0.02);
  const cls = (rows, y, j) => mean(rows.filter(r => r.label === y).map(r => r.xTrue[j]));
  for (const y of [0, 1]) for (const j of [0, 1]) {
    assert.ok(Math.abs(cls(after(s), y, j) - cls(after(clean), y, j)) < 0.12, `class ${y} feature ${j} keeps its mean`);
  }
  assert.ok(mean(after(s).map(r => r.xTrue[0])) < mean(after(clean).map(r => r.xTrue[0])) - 0.3, 'the overall input mix moved');
  after(s).forEach(r => close(r.p, sigmoid(dot(WORLD_WEIGHTS, r.xTrue)), 1e-12));
});

test('delay event: only the arrival days move', () => {
  const clean = makeStream({ days: 30, seed: 7, labelDelay: 2 });
  const s = makeStream({ days: 30, seed: 7, labelDelay: 2, events: [{ kind: 'delay', day: EVENT_DAY, delay: 9 }] });
  s.rows.forEach((r, k) => {
    const c = clean.rows[k];
    assert.deepEqual({ ...r, arrival: 0 }, { ...c, arrival: 0 });
    assert.equal(r.arrival, r.day + (r.day >= EVENT_DAY ? 9 : 2));
  });
});

// ---- models ------------------------------------------------------------------------------------

test('makeModels: v1 logistic, v2 tree, v1cal recalibrated; probabilities in [0, 1]', () => {
  const s = makeStream({ seed: 3 });
  const { v1, v2, v1cal, baseline } = makeModels(s);
  assert.equal(v1.kind, 'logistic');
  assert.equal(v2.kind, 'tree');
  assert.equal(v1cal.kind, 'recalibrated');
  assert.ok(baseline.accuracy > 0.8 && baseline.auc > 0.88, JSON.stringify(baseline));
  for (const m of [v1, v2, v1cal]) for (const r of s.rows.slice(0, 200)) { const p = m.score(r.x); assert.ok(p >= 0 && p <= 1); }
  // Platt scaling is monotone: the recalibrated model ranks exactly like v1
  const hold = s.reference.holdout;
  close(auc(hold.map(r => v1cal.score(r.x)), hold.map(r => r.label)), auc(hold.map(r => v1.score(r.x)), hold.map(r => r.label)), 1e-12);
  assert.ok(v1cal.platt.a > 0);
  // the models are different versions, not copies
  assert.notEqual(v1.score(hold[0].x), v2.score(hold[0].x));
  assert.deepEqual(makeModels(s).baseline, baseline);
});

test('makeModels with v2Day: v2 is v1 retrained on the labels that had arrived, so it follows a concept shift', () => {
  const s = scenarioStream('concept', { seed: 2 });
  const { v1, v2 } = makeModels(s, { v2Day: 45 });
  assert.equal(v2.kind, 'logistic');
  const late = s.rows.filter(r => r.day >= 45);
  const acc = m => mean(late.map(r => ((m.score(r.x) >= 0.5 ? 1 : 0) === r.label ? 1 : 0)));
  assert.ok(acc(v2) > acc(v1) + 0.15, `${acc(v2)} vs ${acc(v1)}`);
});

test('recalibrate needs both classes; retrainLogistic fits a usable model', () => {
  const s = makeStream({ seed: 3 });
  const { v1 } = makeModels(s);
  const one = s.reference.train.filter(r => r.label === 1);
  assert.throws(() => recalibrate(v1, one), /both classes/);
  const m = retrainLogistic(s.reference.train);
  const hold = s.reference.holdout;
  assert.ok(mean(hold.map(r => ((m.score(r.x) >= 0.5 ? 1 : 0) === r.label ? 1 : 0))) > 0.8);
});

// ---- PSI alert, exact --------------------------------------------------------------------------

test('psiAlert: two small histograms, exact values', () => {
  // p = [.5, .3, .2], q = [.2, .3, .5]: (q-p) ln(q/p) = 0.3 ln 2.5 + 0 + 0.3 ln 2.5
  const r = psiAlert([50, 30, 20], [20, 30, 50]);
  close(r.psi, 0.6 * Math.log(2.5), 1e-12);
  assert.equal(r.verdict, 'large');
  assert.equal(r.alert, true);
  assert.equal(psiAlert([50, 30, 20], [20, 30, 50], 0.6).alert, false, 'threshold 0.6 is above 0.5498');
  // p = [.9, .1], q = [.8, .2]: 0.1 ln(0.9/0.8) + 0.1 ln 2
  const small = psiAlert([90, 10], [80, 20]);
  close(small.psi, 0.1 * Math.log(0.9 / 0.8) + 0.1 * Math.log(2), 1e-12);
  assert.equal(small.verdict, 'stable');
  assert.equal(small.alert, false);
  // same shape, different totals: PSI compares shares
  close(psiAlert([5, 3, 2], [200, 300, 500]).psi, psiAlert([50, 30, 20], [20, 30, 50]).psi, 1e-12);
  assert.equal(psiAlert([10, 10], [10, 10]).psi, 0);
  assert.throws(() => psiAlert([1, 2], [1, 2, 3]), RangeError);
});

// ---- delayed labels ----------------------------------------------------------------------------

const HAND = [
  { day: 0, arrival: 1, label: 1 }, { day: 0, arrival: 1, label: 0 },
  { day: 1, arrival: 2, label: 1 }, { day: 1, arrival: 2, label: 0 },
  { day: 2, arrival: 3, label: 1 }, { day: 2, arrival: 3, label: 1 },
];
const HAND_SCORES = [0.9, 0.8, 0.7, 0.1, 0.2, 0.9];   // correct: r0 yes, r1 no, r2 yes, r3 yes, r4 no, r5 yes

test('delayedMetrics: only labels that have arrived count (hand stream)', () => {
  assert.deepEqual(delayedMetrics({ rows: HAND, scores: HAND_SCORES, day: 0, window: 1 }), { n: 0, accuracy: null, auc: null });
  const d1 = delayedMetrics({ rows: HAND, scores: HAND_SCORES, day: 1, window: 1 });
  assert.equal(d1.n, 2); assert.equal(d1.accuracy, 0.5); assert.equal(d1.auc, 1);
  // day 2: rows 4 and 5 (arrival 3) are in the future and must not count
  const d2 = delayedMetrics({ rows: HAND, scores: HAND_SCORES, day: 2, window: 1 });
  assert.equal(d2.n, 2); assert.equal(d2.accuracy, 1); assert.equal(d2.auc, 1);
  const d2w = delayedMetrics({ rows: HAND, scores: HAND_SCORES, day: 2, window: 2 });
  assert.equal(d2w.n, 4); assert.equal(d2w.accuracy, 0.75);
  const d3 = delayedMetrics({ rows: HAND, scores: HAND_SCORES, day: 3, window: 1 });
  assert.equal(d3.n, 2); assert.equal(d3.accuracy, 0.5); assert.equal(d3.auc, null, 'one class only');
  assert.deepEqual(delayedMetrics({ rows: HAND, scores: HAND_SCORES, day: 2, window: 2, minLabels: 5 }), { n: 4, accuracy: null, auc: null });
  assert.equal(delayedMetrics({ rows: HAND, scores: HAND_SCORES, day: 3, window: 3 }).n, 6);
});

test('replay: accuracyDelayed equals a brute-force recomputation from arrived labels, and never peeks', () => {
  const s = makeStream({ days: 40, seed: 5, labelDelay: 5, events: [{ kind: 'covariate', day: 15, feature: 0 }] });
  const model = makeModels(s).v1;
  const r = replay({ stream: s, model });
  const W = DEFAULT_MONITORS.accuracy.window;
  r.daily.forEach(d => {
    const arrived = s.rows.filter(row => row.arrival <= d.day && row.arrival > d.day - W);
    assert.equal(d.nLabels, arrived.length);
    if (arrived.length < DEFAULT_MONITORS.accuracy.minLabels) { assert.equal(d.accuracyDelayed, null); return; }
    close(d.accuracyDelayed, mean(arrived.map(row => ((model.score(row.x) >= 0.5 ? 1 : 0) === row.label ? 1 : 0))), 1e-12);
    close(d.aucDelayed, auc(arrived.map(row => model.score(row.x)), arrived.map(row => row.label)), 1e-12);
  });
  assert.ok(r.daily.slice(0, 5).every(d => d.accuracyDelayed === null && d.nLabels === 0), 'nothing has arrived in the first delay days');
  assert.ok(r.daily[5].accuracyDelayed !== null);
  // flip every label from day 20 on: the delayed series cannot notice before those labels arrive (day 25)
  const tampered = { ...s, rows: s.rows.map(row => (row.day >= 20 ? { ...row, label: 1 - row.label } : row)) };
  const t = replay({ stream: tampered, model });
  for (let d = 0; d < 25; d++) assert.equal(t.daily[d].accuracyDelayed, r.daily[d].accuracyDelayed, `day ${d}`);
  assert.ok(t.daily[35].accuracyDelayed < 0.3, 'the flipped labels show up once they arrive (days 20-29 reach the window by day 35)');
  assert.ok(r.daily[35].accuracyDelayed > 0.4 && t.daily[35].accuracyDelayed < r.daily[35].accuracyDelayed - 0.2);
  assert.ok(t.daily[20].accuracyTrue < 0.3, 'the true same-day accuracy sees them at once');
});

// ---- monitors: each event lights up what it should ---------------------------------------------

test('skew bug: the input monitors fire the day after the release, delayed accuracy only after the labels arrive', () => {
  for (const seed of SEEDS) {
    for (const name of ['unit', 'default']) {
      const s = scenarioStream(name, { seed, labelDelay: 7 });
      const r = replay({ stream: s, model: makeModels(s).v1 });
      const { psi, score, accuracy, any } = r.summary.firstAlert;
      assert.equal(psi, 26, `${name}/${seed}: PSI alert one day after the bug (two-day rule)`);
      assert.equal(r.daily[25].psiMaxFeature, 'spend');
      assert.equal(any, 26);
      if (name === 'unit') assert.ok(score !== null && score <= 28, 'a x100 feature saturates the scores too');
      assert.ok(accuracy !== null && accuracy >= 25 + 7 && accuracy <= 45, `${name}/${seed}: accuracy alert only after labels arrive (${accuracy})`);
      assert.ok(accuracy - psi >= 7 - 1, 'a week of blindness for the labelled metric');
      assert.ok(mean(r.series.accuracyTrue.slice(25, 32)) < r.baseline.accuracy - 0.08, 'the true accuracy had already dropped, a week before the labelled metric could say so');
      assert.ok(r.daily[25].accuracyDelayed === null || r.daily[25].accuracyDelayed > r.baseline.accuracy - 0.05, 'delayed accuracy still looks fine on bug day');
    }
  }
});

test('concept shift: inputs and scores look normal, only the delayed accuracy alert catches it', () => {
  for (const seed of SEEDS) {
    const s = scenarioStream('concept', { seed });
    const r = replay({ stream: s, model: makeModels(s).v1 });
    assert.equal(r.summary.firstAlert.psi, null);
    assert.ok(Math.max(...r.series.psiMax) < DEFAULT_MONITORS.psi.threshold, 'single-day PSI noise stays under the alert threshold');
    assert.ok(r.summary.firstAlert.accuracy >= 25 + 7);
    assert.equal(r.summary.firstAlert.any, r.summary.firstAlert.accuracy);
    assert.ok(r.summary.detectionDelay >= 7);
    assert.ok(r.daily[35].accuracyTrue < 0.7);
  }
});

test('covariate drift: PSI alerts at once, yet accuracy does not fall (the model still follows the rule)', () => {
  for (const seed of SEEDS) {
    const s = scenarioStream('covariate', { seed });
    const r = replay({ stream: s, model: makeModels(s).v1 });
    assert.equal(r.summary.firstAlert.psi, 26);
    assert.equal(r.summary.firstAlert.accuracy, null, 'no accuracy alarm: a PSI alert is not a performance problem');
    assert.ok(r.daily[40].psi.spend > 1);
    for (const f of ['tenure', 'tickets', 'logins']) assert.ok(r.daily[40].psi[f] < 0.15, f);
    assert.ok(mean(r.series.accuracyTrue.slice(30)) >= r.baseline.accuracy - 0.02);
  }
});

test('label shift: the score monitor fires at once, the mean score and the positive rate drop, accuracy never alarms', () => {
  for (const seed of SEEDS) {
    const s = scenarioStream('label', { seed });
    const r = replay({ stream: s, model: makeModels(s).v1 });
    assert.ok(r.summary.firstAlert.score === 26, `score drift alert (seed ${seed})`);
    assert.ok(mean(r.series.meanScore.slice(30)) < mean(r.series.meanScore.slice(0, 25)) - 0.15);
    assert.ok(mean(r.series.positiveRate.slice(30)) < 0.2);
    assert.equal(r.summary.firstAlert.accuracy, null, 'a prior shift barely moves accuracy at the old threshold');
  }
});

test('series columns match the daily rows; every column has one value per day', () => {
  const s = scenarioStream('unit', { seed: 2, days: 40 });
  const r = replay({ stream: s, model: makeModels(s).v1 });
  assert.equal(r.daily.length, 40);
  for (const key of ['psiMax', 'scoreDrift', 'meanScore', 'accuracyTrue', 'accuracyDelayed', 'positiveRate', 'nLabels']) {
    assert.equal(r.series[key].length, 40);
    assert.deepEqual(r.series[key], r.daily.map(d => d[key]));
  }
  assert.deepEqual(Object.keys(r.series.psi), FEATURES);
  assert.deepEqual(r.series.psi.spend, r.daily.map(d => d.psi.spend));
  assert.ok(r.daily.every(d => d.remedied === null));
  assert.deepEqual(replay({ stream: s, model: makeModels(s).v1 }), r, 'deterministic');
  assert.throws(() => replay({ stream: s }), RangeError);
});

// ---- alert rules -------------------------------------------------------------------------------

test('evaluateAlerts: thresholds, the consecutive-days rule, rules switched off', () => {
  const day = (i, psiMax, scoreDrift = 0, accuracyDelayed = null) => ({ day: i, psiMax, psiMaxFeature: 'spend', scoreDrift, accuracyDelayed });
  const daily = [day(0, 0.1), day(1, 0.3), day(2, 0.1), day(3, 0.3), day(4, 0.4), day(5, 0.5, 0.3, 0.7)];
  const baseline = { accuracy: 0.85 };
  const one = evaluateAlerts({ daily, baseline, policy: { consecutive: 1 } });
  assert.deepEqual(one.rules.psi.days, [1, 3, 4, 5]);
  assert.equal(one.rules.psi.first, 1);
  const two = evaluateAlerts({ daily, baseline });   // default: two days in a row
  assert.deepEqual(two.rules.psi.days, [4, 5]);
  assert.equal(two.first, 4);
  assert.equal(two.rules.score.first, null, 'one breach is not enough under the two-day rule');
  const acc = evaluateAlerts({ daily, baseline, policy: { consecutive: 1 } });
  assert.deepEqual(acc.rules.accuracy.days, [5], '0.70 < 0.85 - 0.08');
  assert.equal(acc.alerts.find(a => a.rule === 'accuracy').threshold, 0.85 - 0.08);
  assert.equal(acc.alerts.find(a => a.rule === 'psi').feature, 'spend');
  const off = evaluateAlerts({ daily, baseline, monitors: { psi: false }, policy: { consecutive: 1 } });
  assert.equal(off.rules.psi, undefined);
  assert.deepEqual(off.alertDays, [5]);
  // a threshold of exactly the value is not a breach (strictly greater)
  assert.deepEqual(evaluateAlerts({ daily, baseline, monitors: { psi: { threshold: 0.4 } }, policy: { consecutive: 1 } }).rules.psi.days, [5]);
  assert.equal(DEFAULT_POLICY.consecutive, 2);
});

test('clean streams raise no alert at the default thresholds, for every seed and both model versions', () => {
  const fa = falseAlarms({ seeds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] });
  assert.equal(fa.alertDays, 0);
  assert.equal(fa.rate, 0);
  assert.equal(fa.seedsWithAlarm, 0);
  assert.equal(fa.perSeed.length, 12);
  for (const seed of [21, 22, 23]) {
    const s = makeStream({ seed });
    const r = replay({ stream: s, model: makeModels(s).v2 });
    assert.deepEqual(r.summary.alertDays, [], `v2, seed ${seed}`);
    assert.equal(r.summary.falseAlarmDays.length, 0);
  }
  // positive control: the same test does see alarms when a monitor is set absurdly tight
  const tight = falseAlarms({ seeds: [1, 2, 3], monitors: { psi: { threshold: 0.02 } }, policy: { consecutive: 1 } });
  assert.ok(tight.alertDays > 0 && tight.seedsWithAlarm === 3, 'an over-tight PSI threshold fires on pure noise');
});

test('false alarms are alert days before the first event; detection delay counts from it', () => {
  const s = makeStream({ seed: 3, events: [{ kind: 'skew', day: 25, feature: 0 }] });
  const model = makeModels(s).v1;
  const calm = replay({ stream: s, model });
  assert.deepEqual(calm.summary.falseAlarmDays, []);
  assert.equal(calm.summary.firstEventDay, 25);
  assert.equal(calm.summary.detectionDelay, 1);
  const jumpy = replay({ stream: s, model, monitors: { psi: { threshold: 0.03 } }, policy: { consecutive: 1 } });
  assert.ok(jumpy.summary.falseAlarmDays.length > 0 && jumpy.summary.falseAlarmDays.every(d => d < 25));
  assert.equal(replay({ stream: makeStream({ seed: 3, events: [{ kind: 'delay', day: 5, delay: 2 }] }), model }).summary.firstEventDay, null);
});

// ---- remedies ----------------------------------------------------------------------------------

function comparison(name, fromDay, seed, extra = {}) {
  const s = scenarioStream(name, { seed });
  return compareRemedies({ stream: s, fromDay, model: makeModels(s).v1, ...extra });
}

test('the right remedy beats the wrong ones, with a margin, on every seed', () => {
  for (const seed of SEEDS) {
    for (const name of ['unit', 'default']) {
      const c = comparison(name, 28, seed);
      assert.equal(c.best, 'rollback', `${name}/${seed}`);
      assert.ok(c.options[1].cost.total - c.options[0].cost.total > 20, 'rollback wins a skew bug by a wide margin');
      assert.ok(c.byKind.rollback.outcome.metric.accuracy > c.byKind.none.outcome.metric.accuracy + 0.1);
      for (const k of ['recalibrate', 'retrain']) assert.ok(Math.abs(c.byKind[k].outcome.gain) < 0.02, `${k} cannot fix a skew bug before post-bug labels arrive`);
    }
    const label = comparison('label', 40, seed);
    assert.equal(label.best, 'recalibrate', `label/${seed}`);
    assert.ok(label.options[1].cost.total - label.options[0].cost.total > 5, 'recalibration is cheaper than retraining and just as good');
    assert.ok(label.byKind.recalibrate.outcome.gain > 0.05);
    assert.ok(Math.abs(label.byKind.rollback.outcome.gain) < 1e-9, 'a rollback changes nothing for a label shift');
    const concept = comparison('concept', 40, seed);
    assert.equal(concept.best, 'retrain', `concept/${seed}`);
    assert.ok(concept.options[1].cost.total - concept.options[0].cost.total > 20);
    assert.ok(concept.byKind.retrain.outcome.gain > 0.15);
    assert.ok(concept.byKind.recalibrate.outcome.gain < 0.05 && Math.abs(concept.byKind.rollback.outcome.gain) < 1e-9);
    const cov = comparison('covariate', 28, seed);
    assert.equal(cov.best, 'none', `covariate/${seed}`);
    assert.ok(cov.options[1].cost.total - cov.options[0].cost.total >= 0.99, 'doing nothing is cheapest when the model still works');
    assert.ok(Math.abs(cov.byKind.retrain.outcome.gain) < 0.02);
  }
});

test('the remedies depend on delayed labels: too early, retrain and recalibrate have nothing to learn from', () => {
  const s = scenarioStream('concept', { seed: 2 });
  const model = makeModels(s).v1;
  const early = applyRemedy({ stream: s, fromDay: 28, kind: 'retrain', model });   // labels have arrived only up to day 21
  assert.equal(early.labelsUsed, 10 * 200);
  assert.ok(early.gain < 0.05, `no post-change labels yet (${early.gain})`);
  const none = applyRemedy({ stream: s, fromDay: 3, kind: 'retrain', model });   // nothing has arrived at all
  assert.equal(none.labelsUsed, 0);
  assert.equal(none.feasible, false);
  assert.equal(none.gain, 0, 'infeasible: the old model carries on');
  assert.equal(none.cost.fixed, 10, 'the attempt still costs');
  const late = applyRemedy({ stream: s, fromDay: 45, kind: 'retrain', model });
  assert.ok(late.feasible && late.gain > early.gain + 0.15);
  // label arrival day is what matters: with a 1-day delay the same remedy at day 28 works
  const quick = scenarioStream('concept', { seed: 2, labelDelay: 1 });
  assert.ok(applyRemedy({ stream: quick, fromDay: 28, kind: 'retrain', model: makeModels(quick).v1 }).gain > 0.1);
  const rec = applyRemedy({ stream: scenarioStream('label', { seed: 2 }), fromDay: 28, kind: 'recalibrate', model });
  assert.ok(rec.gain < 0.02, 'recalibrating on pre-shift labels learns the old prior');
});

test('applyRemedy: latency, horizon, previous model on rollback, the none baseline', () => {
  const s = scenarioStream('default', { seed: 4 });
  const { v1, v2 } = makeModels(s);
  const retrain = applyRemedy({ stream: s, fromDay: 40, kind: 'retrain', model: v1 });
  assert.equal(retrain.effectiveDay, 40 + REMEDY_COSTS.retrain.latency);
  assert.equal(retrain.cost.latencyDays, 3);
  assert.equal(retrain.from, 40);
  assert.equal(retrain.to, 60);
  assert.equal(retrain.metric.rows, 20 * 200);
  const short = applyRemedy({ stream: s, fromDay: 40, kind: 'rollback', model: v1, horizon: 5 });
  assert.equal(short.to, 45);
  assert.equal(short.metric.rows, 1000);
  assert.equal(short.effectiveDay, 40);
  // none changes nothing and costs nothing
  const none = applyRemedy({ stream: s, fromDay: 40, kind: 'none', model: v1 });
  assert.deepEqual(none.metric, none.before);
  assert.equal(none.gain, 0);
  assert.equal(none.cost.fixed, 0);
  // rollback to the previous model: v2 deployed with the bug, v1 is the version before
  const withV2 = applyRemedy({ stream: s, fromDay: 28, kind: 'rollback', model: v2, previous: v1 });
  const bare = applyRemedy({ stream: s, fromDay: 28, kind: 'rollback', model: v2 });
  assert.ok(withV2.metric.accuracy > bare.metric.accuracy, 'v1 on clean features beats v2 on clean features here');
  assert.equal(withV2.before.rows, withV2.metric.rows);
  assert.throws(() => applyRemedy({ stream: s, fromDay: 99, kind: 'none' }), RangeError);
  assert.throws(() => applyRemedy({ stream: s, fromDay: 5, kind: 'pray', model: v1 }), /unknown remedy/);
  // model defaults to v1
  assert.deepEqual(applyRemedy({ stream: s, fromDay: 28, kind: 'rollback' }), applyRemedy({ stream: s, fromDay: 28, kind: 'rollback', model: v1 }));
});

test('decisionCost and scoreChoice: price of the remedy plus the errors that follow', () => {
  const c = comparison('concept', 40, 1);
  const retrain = c.byKind.retrain;
  const d = decisionCost(retrain.outcome);
  assert.equal(d.fixed, 10);
  assert.equal(d.errors, retrain.outcome.metric.errors);
  close(d.total, 10 + 0.05 * d.errors, 1e-12);
  assert.equal(retrain.cost.total, d.total);
  close(decisionCost(retrain.outcome, { fixed: 3, errorCost: 1 }).total, 3 + retrain.outcome.metric.errors, 1e-12);
  // options are sorted cheapest first and scoreChoice reads regret and rank from them
  assert.deepEqual(c.options.map(o => o.cost.total), [...c.options.map(o => o.cost.total)].sort((a, b) => a - b));
  const best = scoreChoice(c, 'retrain');
  assert.deepEqual([best.isBest, best.regret, best.rank, best.best], [true, 0, 1, 'retrain']);
  const worst = scoreChoice(c, c.options.at(-1).kind);
  assert.equal(worst.rank, 4);
  assert.ok(worst.regret > 30);
  assert.equal(scoreChoice(c, 'none').isBest, false);
  assert.throws(() => scoreChoice(c, 'wish'), RangeError);
  // costs override: free retraining and zero error cost still ranks by fixed cost
  const free = comparison('concept', 40, 1, { costs: { fixed: { retrain: 0, none: 5 }, errorCost: 0 } });
  assert.equal(free.best, 'retrain');
  assert.equal(free.byKind.none.cost.total, 5);
  // a narrower set of kinds
  assert.deepEqual(comparison('concept', 40, 1, { kinds: ['none', 'rollback'] }).options.map(o => o.kind).sort(), ['none', 'rollback']);
  assert.deepEqual(REMEDIES, ['none', 'rollback', 'recalibrate', 'retrain']);
});

// ---- policy: the engine acts by itself ---------------------------------------------------------

test('replay with a remedy policy: acts the day after the alert (plus the wait), and the metrics recover', () => {
  const s = scenarioStream('default', { seed: 6 });
  const model = makeModels(s).v1;
  const plain = replay({ stream: s, model });
  const r = replay({ stream: s, model, policy: { remedy: { kind: 'rollback', wait: 2 } } });
  assert.equal(r.summary.firstAlert.any, 26);
  assert.equal(r.summary.remedyDay, 26 + 1 + 2);
  assert.ok(r.daily.slice(0, 29).every(d => d.remedied === null));
  assert.ok(r.daily.slice(29).every(d => d.remedied === 'rollback'));
  for (let d = 0; d < 29; d++) assert.equal(r.daily[d].accuracyTrue, plain.daily[d].accuracyTrue);
  assert.ok(mean(r.series.accuracyTrue.slice(30)) > mean(plain.series.accuracyTrue.slice(30)) + 0.1);
  assert.ok(r.daily.slice(-5).every(d => d.alerts.length === 0), 'the alerts clear once the bug is rolled back');
  assert.ok(plain.daily.slice(-5).every(d => d.alerts.includes('psi')));
  assert.equal(plain.summary.remedyDay, null);
  // no alert, no action
  const calm = replay({ stream: makeStream({ seed: 6 }), model, policy: { remedy: { kind: 'rollback' } } });
  assert.equal(calm.summary.remedyDay, null);
  assert.ok(calm.daily.every(d => d.remedied === null));
});

test('exported defaults are what the docs say', () => {
  assert.deepEqual(DEFAULT_MONITORS, {
    psi: { threshold: 0.25, bins: 10, window: 1 }, score: { threshold: 0.25, bins: 10, window: 1 },
    accuracy: { drop: 0.08, window: 7, minLabels: 100 },
  });
  assert.deepEqual(REMEDY_COSTS.retrain, { fixed: 10, latency: 3 });
});
