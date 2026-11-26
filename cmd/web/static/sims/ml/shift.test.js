import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeShiftData, shiftXY, cleanLabel, SHIFT_KINDS, SETUPS, modelFitPredict,
  estimatePerformance, actualPerformance, compareSetups, nestedCv,
  psi, psiFromCounts, psiTable, psiVerdict, ksStat, domainClassifierAuc,
} from './shift.js';
import { kFold, groupKFold } from './validation.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const avg = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const col = (rows, j) => rows.map(r => r.features[j]);
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const agreement = (rows, angle) => avg(rows.map(r => (cleanLabel(r.features, angle) === r.label ? 1 : 0)));

// ---- makeShiftData ---------------------------------------------------------------------------

test('makeShiftData: shapes, groups, times and reproducibility', () => {
  const d = makeShiftData({ n: 120, nTest: 90, seed: 4, shift: 'covariate', severity: 0.5 });
  assert.equal(d.train.length, 120);
  assert.equal(d.test.length, 90);
  assert.ok(d.train.every((r, i) => r.features.length === 2 && (r.label === 0 || r.label === 1) && r.time === i));
  const trainGroups = new Set(d.train.map(r => r.group)), testGroups = new Set(d.test.map(r => r.group));
  assert.ok(trainGroups.size >= 5 && testGroups.size >= 5);
  assert.ok([...testGroups].every(g => !trainGroups.has(g)), 'test rows come from new groups');
  assert.deepEqual(makeShiftData({ n: 120, nTest: 90, seed: 4, shift: 'covariate', severity: 0.5 }), d);
  assert.notDeepEqual(makeShiftData({ n: 120, nTest: 90, seed: 5, shift: 'covariate', severity: 0.5 }).train, d.train);
  const xy = shiftXY(d.train);
  assert.equal(xy.X.length, 120);
  assert.deepEqual(xy.y, d.train.map(r => r.label));
  assert.deepEqual(xy.groups, d.train.map(r => r.group));
});

test('makeShiftData: rejects bad arguments', () => {
  assert.throws(() => makeShiftData({ shift: 'sideways' }), RangeError);
  assert.throws(() => makeShiftData({ severity: 1.5 }), RangeError);
  assert.throws(() => makeShiftData({ severity: -0.1 }), RangeError);
  assert.throws(() => makeShiftData({ drift: 2 }), RangeError);
  assert.throws(() => makeShiftData({ n: 3 }), RangeError);
  assert.deepEqual(SHIFT_KINDS, ['none', 'covariate', 'label', 'concept']);
});

test('makeShiftData: the train set never depends on the kind of shift', () => {
  const base = makeShiftData({ n: 150, seed: 7, shift: 'none' });
  for (const shift of SHIFT_KINDS) {
    for (const severity of [0.3, 1]) {
      assert.deepEqual(makeShiftData({ n: 150, seed: 7, shift, severity }).train, base.train, `${shift} ${severity}`);
    }
  }
});

test('makeShiftData: severity 0 is no shift at all, for every kind', () => {
  const base = makeShiftData({ n: 100, seed: 2, shift: 'none' });
  for (const shift of ['covariate', 'concept']) {
    assert.deepEqual(makeShiftData({ n: 100, seed: 2, shift, severity: 0 }).test, base.test, shift);
  }
});

test('covariate shift moves the inputs by 3 * severity and leaves the labelling rule alone', () => {
  for (const severity of [0.5, 1]) {
    const none = makeShiftData({ n: 200, seed: 3, shift: 'none' });
    const cov = makeShiftData({ n: 200, seed: 3, shift: 'covariate', severity });
    cov.test.forEach((r, i) => {
      close(r.features[0] - none.test[i].features[0], 3 * severity);
      close(r.features[1], none.test[i].features[1]);
      assert.equal(r.group, none.test[i].group);
      assert.equal(r.time, none.test[i].time);
    });
    // P(label | x) unchanged: the labels still follow the unrotated boundary up to the 8% noise.
    assert.ok(agreement(cov.test, 0) >= 0.85, `agreement ${agreement(cov.test, 0)}`);
  }
});

test('concept shift rotates the boundary and leaves the inputs exactly as they were', () => {
  const none = makeShiftData({ n: 300, seed: 3, shift: 'none' });
  for (const severity of [0.5, 1]) {
    const con = makeShiftData({ n: 300, seed: 3, shift: 'concept', severity });
    assert.deepEqual(con.test.map(r => r.features), none.test.map(r => r.features), 'P(x) is unchanged');
    const angle = (Math.PI / 2) * severity;
    assert.ok(agreement(con.test, angle) >= 0.85, `follows the rotated rule: ${agreement(con.test, angle)}`);
    assert.ok(agreement(con.test, 0) <= 0.8 - 0.1 * (severity - 0.5), `no longer follows the old rule: ${agreement(con.test, 0)}`);
  }
  assert.ok(agreement(none.test, 0) >= 0.85);
  const full = makeShiftData({ n: 300, seed: 3, shift: 'concept', severity: 1 });
  assert.ok(Math.abs(agreement(full.test, 0) - 0.5) < 0.1, 'a 90 degree turn leaves the old rule near chance');
  assert.ok(Math.abs(full.positiveRate.test - 0.5) < 0.1, 'the class balance holds');
});

test('label shift changes only the class balance, not what each class looks like', () => {
  const d = makeShiftData({ n: 600, nTest: 600, seed: 5, shift: 'label', severity: 1 });
  assert.ok(Math.abs(d.positiveRate.train - 0.5) < 0.08, `train share ${d.positiveRate.train}`);
  assert.ok(Math.abs(d.positiveRate.test - 0.1) < 0.05, `test share ${d.positiveRate.test}`);
  const half = makeShiftData({ n: 600, nTest: 600, seed: 5, shift: 'label', severity: 0.5 });
  assert.ok(Math.abs(half.positiveRate.test - 0.3) < 0.06, `half severity ${half.positiveRate.test}`);
  for (const cls of [0, 1]) {
    const tr = d.train.filter(r => r.label === cls), te = d.test.filter(r => r.label === cls);
    for (const j of [0, 1]) {
      assert.ok(Math.abs(avg(col(tr, j)) - avg(col(te, j))) < 0.3, `class ${cls} feature ${j}`);
    }
  }
  assert.ok(agreement(d.test, 0) >= 0.85, 'the rule is untouched');
});

test('none: the test set looks like the train set', () => {
  const d = makeShiftData({ n: 600, nTest: 600, seed: 9, shift: 'none' });
  for (const j of [0, 1]) assert.ok(Math.abs(avg(col(d.train, j)) - avg(col(d.test, j))) < 0.2);
  assert.ok(Math.abs(d.positiveRate.train - d.positiveRate.test) < 0.1);
  assert.ok(Math.abs(agreement(d.train, 0) - agreement(d.test, 0)) < 0.05);
});

test('drift: the training log already holds a growing part of the shift, the test set is unchanged', () => {
  const plain = makeShiftData({ n: 300, seed: 6, shift: 'covariate', severity: 1 });
  const drifting = makeShiftData({ n: 300, seed: 6, shift: 'covariate', severity: 1, drift: 0.8 });
  assert.deepEqual(drifting.test, plain.test);
  const first = avg(col(drifting.train.slice(0, 100), 0)), last = avg(col(drifting.train.slice(200), 0));
  assert.ok(last - first > 1.2, `${first} -> ${last}`);
  // for "none" there is nothing to drift towards
  assert.deepEqual(makeShiftData({ n: 300, seed: 6, shift: 'none', drift: 0.8 }).train, makeShiftData({ n: 300, seed: 6, shift: 'none' }).train);
  // a concept drift rotates the rule across the log: the old rule fits the end of it worse
  const con = makeShiftData({ n: 400, seed: 6, shift: 'concept', severity: 1, drift: 1 });
  assert.ok(agreement(con.train.slice(0, 100), 0) - agreement(con.train.slice(300), 0) > 0.25);
});

// ---- detectors, hand computed ----------------------------------------------------------------

test('psiFromCounts: two small histograms by hand', () => {
  // p = .5 .3 .2 and q = .3 .3 .4:  (.3-.5) ln(.3/.5) + 0 + (.4-.2) ln 2 = 0.2407945609
  close(psiFromCounts([50, 30, 20], [30, 30, 40]), 0.2407945609, 1e-9);
  close(psiFromCounts([5, 3, 2], [3, 3, 4]), 0.2407945609, 1e-9);   // only the shares matter
  assert.equal(psiFromCounts([4, 4, 2], [4, 4, 2]), 0);
  close(psiFromCounts([50, 30, 20], [30, 30, 40]), psiFromCounts([30, 30, 40], [50, 30, 20]));   // symmetric
  // an empty bin is floored at 1e-4, so the sum stays finite: (.5-1) ln(.5) + (.5-1e-4) ln(.5/1e-4)
  const floored = psiFromCounts([10, 0], [5, 5]);
  close(floored, -0.5 * Math.log(0.5) + 0.4999 * Math.log(0.5 / 1e-4), 1e-9);
  assert.ok(Number.isFinite(floored));
  assert.throws(() => psiFromCounts([1, 2], [1, 2, 3]), RangeError);
});

test('psi: samples cut at given edges match the histogram sum', () => {
  const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const b = [1, 5, 5, 9, 9, 9, 9, 9, 9, 9];
  // edges [4, 8]: a has 3 / 4 / 3 values, b has 1 / 2 / 7; a value on an edge goes right.
  // (.1-.3) ln(1/3) + (.2-.4) ln(1/2) + (.7-.3) ln(7/3) = 0.6972710380
  close(psi(a, b, [4, 8]), 0.697271038, 1e-9);
  const t = psiTable(a, b, [4, 8]);
  assert.deepEqual(t.rows.map(r => [r.expected, r.actual]), [[3, 1], [4, 2], [3, 7]]);
  assert.deepEqual(t.rows.map(r => [r.lo, r.hi]), [[null, 4], [4, 8], [8, null]]);
  close(t.psi, 0.697271038, 1e-9);
  close(t.rows.reduce((s, r) => s + r.contribution, 0), t.psi);
  assert.equal(psi(a, a, [4, 8]), 0);
});

test('psi: equal-frequency bins from the reference sample', () => {
  const a = [1, 2, 3, 4, 5, 6, 7, 8];
  // quantile edges at 2.75, 4.5, 6.25 give two reference values per bin
  const t = psiTable(a, a, 4);
  assert.deepEqual(t.rows.map(r => r.expected), [2, 2, 2, 2]);
  assert.deepEqual(t.rows.map(r => r.hi), [2.75, 4.5, 6.25, null]);
  assert.equal(t.psi, 0);
  // everything moved above the old range: all of b lands in the last bin
  const moved = psiTable(a, [20, 21, 22, 23], 4);
  assert.deepEqual(moved.rows.map(r => r.actual), [0, 0, 0, 4]);
  close(moved.psi, 3 * (1e-4 - 0.25) * Math.log(1e-4 / 0.25) + 0.75 * Math.log(4), 1e-9);
  assert.equal(psiVerdict(moved.psi), 'large');
  assert.deepEqual([0.05, 0.1, 0.2, 0.25, 0.9].map(psiVerdict), ['stable', 'moderate', 'moderate', 'large', 'large']);
  assert.throws(() => psi([], [1]), RangeError);
});

test('ksStat: tiny samples by hand', () => {
  // F_a jumps 1/3 at 1, 2, 3; F_b jumps 1/3 at 2.5, 3.5, 4.5. The widest gap is 2/3 (after 2 and after 3).
  close(ksStat([1, 2, 3], [2.5, 3.5, 4.5]), 2 / 3);
  close(ksStat([2.5, 3.5, 4.5], [1, 2, 3]), 2 / 3);        // symmetric
  assert.equal(ksStat([1, 2, 3], [3, 2, 1]), 0);           // same sample, any order
  assert.equal(ksStat([1, 2], [10, 11]), 1);               // disjoint
  // ties: after 1 -> 2/3 vs 1/3, after 2 -> 3/3 vs 3/3
  close(ksStat([1, 1, 2], [1, 2, 2]), 1 / 3);
  // different sizes: F_a = .5, 1 at 1, 2 ; F_b = 1/4 .. at 1.5, 2.5, 3.5, 4.5 -> after 2: 1 - 1/4 = 3/4
  close(ksStat([1, 2], [1.5, 2.5, 3.5, 4.5]), 0.75);
  assert.throws(() => ksStat([], [1]), RangeError);
});

test('detectors read the shift kinds as they should', () => {
  const rowsOf = shift => {
    const d = makeShiftData({ n: 300, seed: 3, shift, severity: 1 });
    return { a: shiftXY(d.train).X, b: shiftXY(d.test).X };
  };
  const none = rowsOf('none'), cov = rowsOf('covariate'), con = rowsOf('concept'), lab = rowsOf('label');
  const x0 = r => r.map(v => v[0]);
  // covariate shift: every detector fires
  assert.ok(ksStat(x0(cov.a), x0(cov.b)) > 0.7);
  assert.equal(psiVerdict(psi(x0(cov.a), x0(cov.b), 10)), 'large');
  assert.ok(domainClassifierAuc(cov.a, cov.b, 3) > 0.95);
  // no shift and concept shift: the inputs are the same, so no input detector can tell
  for (const s of [none, con]) {
    assert.ok(ksStat(x0(s.a), x0(s.b)) < 0.15);
    assert.ok(Math.abs(domainClassifierAuc(s.a, s.b, 3) - 0.5) < 0.1);
  }
  assert.deepEqual(con.b, none.b);
  // label shift moves the inputs a little (the class mix changed): between the two
  const labAuc = domainClassifierAuc(lab.a, lab.b, 3);
  assert.ok(labAuc > domainClassifierAuc(none.a, none.b, 3) && labAuc < 0.9, `${labAuc}`);
  // reproducible
  assert.equal(domainClassifierAuc(cov.a, cov.b, 3), domainClassifierAuc(cov.a, cov.b, 3));
  assert.throws(() => domainClassifierAuc([], [[1, 2]]), RangeError);
});

// ---- validation setups -----------------------------------------------------------------------

test('modelFitPredict: knn, logistic, custom and unknown models', () => {
  const X = [[0, 0], [0, 1], [1, 0], [5, 5], [5, 6], [6, 5]], y = [0, 0, 0, 1, 1, 1];
  const Q = [[0.5, 0.5], [5.5, 5.5]];
  assert.deepEqual(modelFitPredict('knn')(X, y, Q), [0, 1]);
  assert.deepEqual(modelFitPredict({ type: 'knn', k: 1 })(X, y, Q), [0, 1]);
  assert.deepEqual(modelFitPredict('logistic')(X, y, Q), [0, 1]);
  assert.deepEqual(modelFitPredict('knn', { k: 3 })(X, y, Q), [0, 1]);
  const mine = () => 'mine';
  assert.equal(modelFitPredict(mine), mine);
  assert.throws(() => modelFitPredict('forest'), RangeError);
});

test('estimatePerformance: each setup returns what it says and is reproducible', () => {
  const data = makeShiftData({ n: 200, seed: 2, shift: 'covariate' });
  const xy = shiftXY(data.train);
  const random = estimatePerformance({ data, setup: 'random', seed: 2 });
  assert.equal(random.scores.length, 5);
  close(random.estimate, avg(random.scores));
  assert.equal(random.spread, 'folds');
  assert.ok(random.sd >= 0);
  assert.deepEqual(estimatePerformance({ data, setup: 'random', seed: 2 }), random);
  assert.notDeepEqual(estimatePerformance({ data, setup: 'random', seed: 3 }).scores, random.scores);
  // the same folds the helper builds
  const folds = kFold(200, 5, 2);
  assert.ok(folds.every(f => f.test.length === 40));

  const grouped = estimatePerformance({ data, setup: 'grouped', seed: 2 });
  assert.equal(grouped.scores.length, 5);
  assert.ok(groupKFold(xy.groups, 5, 2).every(f => new Set(f.test.map(i => xy.groups[i])).size > 0));

  const temporal = estimatePerformance({ data, setup: 'temporal' });
  assert.equal(temporal.scores.length, 4);
  assert.deepEqual(estimatePerformance({ data, setup: 'temporal', seed: 99 }), temporal, 'no randomness in a time split');

  const held = estimatePerformance({ data, setup: 'shifted-holdout' });
  assert.equal(held.scores.length, 1);
  assert.equal(held.spread, 'standard-error');
  close(held.sd, Math.sqrt(held.estimate * (1 - held.estimate) / 60));   // 30% of 200 rows

  const nested = estimatePerformance({ data, setup: 'nested', seed: 2 });
  assert.equal(nested.scores.length, 5);
  assert.equal(nested.chosen.length, 5);
  assert.ok(nested.chosen.every(c => [1, 3, 5, 7, 9, 11, 15, 21].includes(c.k)));

  assert.throws(() => estimatePerformance({ data, setup: 'telepathy' }), RangeError);
  assert.deepEqual(SETUPS, ['random', 'grouped', 'temporal', 'shifted-holdout', 'nested']);
});

test('estimatePerformance: the shifted holdout reads test inputs, never test labels', () => {
  const data = makeShiftData({ n: 200, seed: 4, shift: 'covariate' });
  const scrambled = { train: data.train, test: data.test.map(r => ({ ...r, label: 1 - r.label })) };
  assert.deepEqual(estimatePerformance({ data: scrambled, setup: 'shifted-holdout' }),
    estimatePerformance({ data, setup: 'shifted-holdout' }));
  // and the other setups ignore the test set altogether
  const noTest = { train: data.train, test: makeShiftData({ n: 200, seed: 4, shift: 'concept' }).test };
  for (const setup of ['random', 'grouped', 'temporal', 'nested']) {
    assert.deepEqual(estimatePerformance({ data: noTest, setup, seed: 4 }), estimatePerformance({ data, setup, seed: 4 }), setup);
  }
});

test('estimatePerformance: logistic regression works in every setup', () => {
  const data = makeShiftData({ n: 150, seed: 1, shift: 'none' });
  for (const setup of SETUPS) {
    const r = estimatePerformance({ data, setup, model: 'logistic', seed: 1 });
    assert.ok(r.estimate > 0.7 && r.estimate <= 1, `${setup} ${r.estimate}`);
  }
  assert.ok(actualPerformance({ data, model: 'logistic' }) > 0.75);
});

test('actualPerformance: a fitted model scored on the test rows, tuned or not', () => {
  const data = makeShiftData({ n: 200, seed: 1, shift: 'none' });
  const plain = actualPerformance({ data });
  assert.ok(plain > 0.8 && plain <= 1);
  const tuned = actualPerformance({ data, grid: { k: [1, 5, 15] }, seed: 1 });
  assert.ok([1, 5, 15].includes(tuned.chosen.k));
  assert.ok(tuned.accuracy > 0.8);
  // a hand check: train rows split by x0, test rows on the right side of the split
  const mk = (xs, g) => xs.map(([x, label], i) => ({ features: [x, 0], label, group: g, time: i }));
  const tiny = { train: mk([[0, 0], [1, 0], [10, 1], [11, 1]], 0), test: mk([[0.5, 0], [10.5, 1], [10.4, 0], [0.4, 1]], 1) };
  assert.equal(actualPerformance({ data: tiny, model: { type: 'knn', k: 1 } }), 0.5);
});

// The central claim of the lab: with the same data and the same model, a random split cannot see a
// covariate shift coming, and a split that holds out the rows nearest to the target at least
// reports a lower score. Averaged over seeds so one lucky split cannot decide it.
test('random CV does not anticipate covariate shift; the shifted holdout moves towards it', () => {
  const rows = SEEDS.map(seed => {
    const data = makeShiftData({ n: 200, seed, shift: 'covariate', severity: 1 });
    return {
      actual: actualPerformance({ data, seed }),
      random: estimatePerformance({ data, setup: 'random', seed }).estimate,
      grouped: estimatePerformance({ data, setup: 'grouped', seed }).estimate,
      holdout: estimatePerformance({ data, setup: 'shifted-holdout', seed }).estimate,
    };
  });
  const actual = avg(rows.map(r => r.actual)), random = avg(rows.map(r => r.random));
  const holdout = avg(rows.map(r => r.holdout)), grouped = avg(rows.map(r => r.grouped));
  assert.ok(random - actual > 0.2, `random CV is optimistic by ${random - actual}`);
  assert.ok(grouped - actual > 0.2, `grouped CV is optimistic by ${grouped - actual}`);
  assert.ok(random - holdout > 0.04, `the shifted holdout reports ${random - holdout} less`);
  assert.ok(Math.abs(holdout - actual) < Math.abs(random - actual) - 0.03, 'and lands closer to the truth');
  // the drop is real: the same model on no shift scores in line with every estimate
  const calm = SEEDS.map(seed => {
    const data = makeShiftData({ n: 200, seed, shift: 'none' });
    return estimatePerformance({ data, setup: 'random', seed }).estimate - actualPerformance({ data, seed });
  });
  assert.ok(Math.abs(avg(calm)) < 0.04, `no shift, gap ${avg(calm)}`);
});

test('nothing in the training data anticipates a concept shift', () => {
  for (const seed of SEEDS.slice(0, 4)) {
    const data = makeShiftData({ n: 200, seed, shift: 'concept', severity: 1 });
    const cmp = compareSetups({ data, seed });
    assert.ok(cmp.actual < 0.65, `actual ${cmp.actual}`);
    for (const row of cmp.rows) assert.ok(row.gap > 0.2 && !row.anticipated, `${seed} ${row.setup} gap ${row.gap}`);
  }
});

test('compareSetups: one row per setup, gap against the real score, nested against the tuned one', () => {
  const data = makeShiftData({ n: 200, seed: 3, shift: 'covariate' });
  const cmp = compareSetups({ data, seed: 3 });
  assert.deepEqual(cmp.rows.map(r => r.setup), SETUPS);
  assert.equal(cmp.actual, actualPerformance({ data, seed: 3 }));
  assert.equal(cmp.actualTuned, actualPerformance({ data, seed: 3, grid: { k: [1, 3, 5, 7, 9, 11, 15, 21] } }).accuracy);
  for (const row of cmp.rows) {
    const target = row.setup === 'nested' ? cmp.actualTuned : cmp.actual;
    close(row.gap, row.estimate - target);
    assert.equal(row.anticipated, Math.abs(row.gap) <= 0.05);
  }
  const some = compareSetups({ data, seed: 3, setups: ['random', 'temporal'], tolerance: 1 });
  assert.deepEqual(some.rows.map(r => r.setup), ['random', 'temporal']);
  assert.equal(some.actualTuned, null);
  assert.ok(some.rows.every(r => r.anticipated));
});

test('with no shift every setup anticipates the score (on average)', () => {
  const gaps = {};
  for (const seed of SEEDS.slice(0, 5)) {
    const data = makeShiftData({ n: 200, seed, shift: 'none' });
    for (const row of compareSetups({ data, seed }).rows) (gaps[row.setup] ??= []).push(row.gap);
  }
  for (const [setup, g] of Object.entries(gaps)) assert.ok(Math.abs(avg(g)) < 0.05, `${setup} ${avg(g)}`);
});

test('a temporal split sees a drift that has already started', () => {
  // The same covariate move, once as a jump (no drift) and once creeping through the training log.
  let jump = 0, creep = 0;
  for (const seed of SEEDS) {
    const a = makeShiftData({ n: 300, seed, shift: 'covariate', severity: 1, drift: 0 });
    const b = makeShiftData({ n: 300, seed, shift: 'covariate', severity: 1, drift: 0.9 });
    jump += estimatePerformance({ data: a, setup: 'temporal' }).estimate - estimatePerformance({ data: a, setup: 'random', seed }).estimate;
    creep += estimatePerformance({ data: b, setup: 'temporal' }).estimate - estimatePerformance({ data: b, setup: 'random', seed }).estimate;
  }
  // with a creeping drift the time split reports a lower score than the shuffled one; without it, no
  assert.ok(creep / SEEDS.length < jump / SEEDS.length - 0.01, `${jump / 8} vs ${creep / 8}`);
  assert.ok(creep / SEEDS.length < -0.01);
});

// ---- nested cross-validation -----------------------------------------------------------------

test('nestedCv: a hand-checkable case with constant predictors', () => {
  // y has 8 ones and 2 zeros; "predict c" scores the share of rows with label c.
  const X = Array.from({ length: 10 }, (_, i) => [i]);
  const y = [1, 1, 0, 1, 1, 1, 0, 1, 1, 1];
  const r = nestedCv({
    X, y, grid: { c: [0, 1] }, outerFolds: 5, innerFolds: 2, seed: 1,
    fitPredictFor: ({ c }) => (trainX, trainY, testX) => testX.map(() => c),
  });
  assert.equal(r.outerScores.length, 5);
  assert.deepEqual(r.chosen, [{ c: 1 }, { c: 1 }, { c: 1 }, { c: 1 }, { c: 1 }]);
  // every outer test fold has 2 rows, so the mean of the fold accuracies is the overall share, 0.8
  close(r.nested.mean, 0.8);
  close(r.nonNested.mean, 0.8);
  assert.deepEqual(r.nonNested.config, { c: 1 });
  close(r.optimism, 0);
  close(r.nested.sd, Math.sqrt(avg(r.outerScores.map(s => (s - 0.8) ** 2)) * 5 / 4));
});

test('nestedCv: the search never sees the outer test fold', () => {
  const n = 40;
  const X = Array.from({ length: n }, (_, i) => [i]);
  const y = X.map(([i]) => i % 2);
  const calls = [];
  const grid = { k: [1, 3] };
  nestedCv({
    X, y, grid, outerFolds: 4, innerFolds: 3, seed: 5,
    fitPredictFor: () => (trainX, trainY, testX) => {
      calls.push({ train: trainX.map(r => r[0]), test: testX.map(r => r[0]) });
      return testX.map(() => 0);
    },
  });
  // the first outer fold's inner search comes first: |grid| settings x innerFolds fits
  const outerTest = new Set(kFold(n, 4, 5)[0].test);
  const innerCalls = calls.slice(0, grid.k.length * 3);
  assert.equal(innerCalls.length, 6);
  for (const c of innerCalls) {
    assert.ok(c.train.every(i => !outerTest.has(i)) && c.test.every(i => !outerTest.has(i)), 'inner CV used an outer test row');
  }
  // the next call is the refit on the outer training rows, scored on exactly the outer test fold
  assert.deepEqual(calls[6].test, [...outerTest].sort((a, b) => a - b));
  assert.ok(calls[6].train.every(i => !outerTest.has(i)));
});

test('nestedCv: reproducible, settings come from the grid, default grids per model', () => {
  const data = makeShiftData({ n: 100, seed: 3, noise: 0.2 });
  const { X, y } = shiftXY(data.train);
  const a = nestedCv({ X, y, grid: { k: [1, 5, 25] }, seed: 3 });
  assert.deepEqual(nestedCv({ X, y, grid: { k: [1, 5, 25] }, seed: 3 }), a);
  assert.ok(a.chosen.every(c => [1, 5, 25].includes(c.k)));
  assert.equal(a.innerBest.length, 5);
  close(a.optimism, a.nonNested.mean - a.nested.mean);
  const log = nestedCv({ X, y, model: 'logistic', seed: 3 });
  assert.ok(log.chosen.every(c => [0, 0.01, 0.1, 1, 10].includes(c.l2)));
  assert.throws(() => nestedCv({ X, y: y.slice(1), grid: { k: [1] } }), RangeError);
});

test('nested CV is less optimistic than the tuning shortcut on a noisy, heavily tuned problem', () => {
  // 80 rows, 30% label noise, 17 values of k to pick from: the best of many noisy scores is flattering.
  const grid = { k: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 21, 25] };
  const optimism = SEEDS.map(seed => {
    const data = makeShiftData({ n: 80, seed, noise: 0.3 });
    const { X, y } = shiftXY(data.train);
    const r = nestedCv({ X, y, grid, seed });
    assert.ok(r.nonNested.mean >= r.nested.mean - 0.1);
    return r.optimism;
  });
  assert.ok(avg(optimism) > 0.03, `mean optimism ${avg(optimism)}`);
  assert.ok(optimism.filter(o => o > 0).length >= 6, optimism.join(' '));
});
