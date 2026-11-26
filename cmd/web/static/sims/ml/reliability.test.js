import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeApplicants, fitApplicantModel, applicantProba, proxyAudit, perturb, robustnessReport, robustnessSweep,
  groupReport, scoredGroupReport, groupThresholds, groupThresholdTrade, fairnessUnderShift,
  reviewBand, bandForShare, reviewCurve, kAnonymityReport, generalise, addLaplaceNoise, noisyRateCurve,
  modelCard, modelCardMissing, MODEL_CARD_SECTIONS, FEATURES, PERTURBATIONS, DEFAULT_GROUPS,
} from './reliability.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const avg = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const colSd = (X, j) => { const m = avg(X.map(r => r[j])); return Math.sqrt(avg(X.map(r => (r[j] - m) ** 2))); };

// A train set and a fresh test set for one seed, and the default model (group NOT given to it).
function setup(seed, { nTrain = 1500, nTest = 2000 } = {}) {
  const train = makeApplicants({ n: nTrain, seed });
  const test = makeApplicants({ n: nTest, seed: seed + 100 });
  return { train, test, model: fitApplicantModel(train) };
}

// ---- makeApplicants --------------------------------------------------------------------------

test('makeApplicants: exact group sizes, shapes, the group is not a column of X', () => {
  const d = makeApplicants({ n: 1000, seed: 3 });
  const count = g => d.group.filter(x => x === g).length;
  assert.deepEqual(d.groups, ['A', 'B', 'C']);
  assert.deepEqual([count('A'), count('B'), count('C')], [500, 300, 200]);
  assert.equal(d.X.length, 1000);
  assert.ok(d.X.every(r => r.length === FEATURES.length));
  assert.deepEqual(d.features, ['skill', 'experience', 'postcode']);
  assert.ok(d.y.every(v => v === 0 || v === 1));
  assert.deepEqual(d.y, d.yTrue, 'no label noise by default');
  assert.ok(d.rows.every((r, i) => r.id === i && r.features === d.X[i] && r.group === d.group[i]));
  // Largest-remainder rounding: 3.5 / 2.1 / 1.4 of 7 rows -> 4 / 2 / 1.
  const small = makeApplicants({ n: 7, seed: 1 });
  assert.deepEqual(['A', 'B', 'C'].map(g => small.group.filter(x => x === g).length), [4, 2, 1]);
});

test('makeApplicants: deterministic per seed, different across seeds, rows interleaved', () => {
  assert.deepEqual(makeApplicants({ n: 300, seed: 4 }), makeApplicants({ n: 300, seed: 4 }));
  assert.notDeepEqual(makeApplicants({ n: 300, seed: 4 }).X, makeApplicants({ n: 300, seed: 5 }).X);
  const g = makeApplicants({ n: 300, seed: 4 }).group;
  assert.notDeepEqual(g.slice(0, 20), new Array(20).fill(g[0]), 'groups are shuffled, not in blocks');
});

test('makeApplicants: groups differ in base rate and feature quality', () => {
  const d = makeApplicants({ n: 6000, seed: 2 });
  const rate = g => avg(d.y.filter((_, i) => d.group[i] === g));
  close(rate('A'), 0.55, 0.04);
  close(rate('B'), 0.4, 0.05);
  close(rate('C'), 0.3, 0.06);
  assert.ok(rate('A') > rate('B') && rate('B') > rate('C'));
  // Within a class the skill spread is the group's noise: the noisier group has the wider spread.
  const spread = g => {
    const v = d.X.filter((_, i) => d.group[i] === g && d.y[i] === 1).map(r => r[0]);
    const m = avg(v);
    return Math.sqrt(avg(v.map(x => (x - m) ** 2)));
  };
  assert.ok(spread('A') < spread('B') && spread('B') < spread('C'));
  close(spread('A'), 0.8, 0.08);
  close(spread('C'), 1.8, 0.15);
});

test('makeApplicants: label noise, missing cells and group shift act only on the named group', () => {
  const plain = makeApplicants({ n: 3000, seed: 6 });
  const d = makeApplicants({ n: 3000, seed: 6, labelNoiseByGroup: { B: 0.3 }, missingByGroup: { C: 0.4 } });
  // Common random numbers: the clean columns and the true labels do not move.
  assert.deepEqual(d.yTrue, plain.yTrue);
  assert.deepEqual(d.X.map(r => r[2]), plain.X.map(r => r[2]));
  const flipRate = g => avg(d.y.map((v, i) => (d.group[i] === g ? (v !== d.yTrue[i] ? 1 : 0) : null)).filter(v => v !== null));
  close(flipRate('B'), 0.3, 0.05);
  assert.equal(flipRate('A'), 0);
  assert.equal(flipRate('C'), 0);
  const nanRate = g => avg(d.X.map((r, i) => (d.group[i] === g ? (Number.isNaN(r[0]) ? 1 : 0) : null)).filter(v => v !== null));
  close(nanRate('C'), 0.4, 0.06);
  assert.equal(nanRate('A'), 0);
  assert.ok(d.X.every(r => !Number.isNaN(r[2])), 'postcode never goes missing');
  assert.ok(d.rows.every(r => r.missing.every((m, j) => m === Number.isNaN(r.features[j]))));

  const shifted = makeApplicants({ n: 3000, seed: 6, groupShift: { B: { baseRateDelta: 0.2, noiseScale: 2, featureShift: -1 } } });
  const rate = (ds, g) => avg(ds.y.filter((_, i) => ds.group[i] === g));
  assert.ok(rate(shifted, 'B') > rate(plain, 'B') + 0.1);
  assert.equal(rate(shifted, 'A'), rate(plain, 'A'));
  assert.deepEqual(shifted.X.filter((_, i) => shifted.group[i] === 'A'), plain.X.filter((_, i) => plain.group[i] === 'A'));
});

test('makeApplicants: custom groups and rejected arguments', () => {
  const d = makeApplicants({ n: 100, seed: 1, groups: ['A', { name: 'Z', share: 1, baseRate: 0.5, noise: 1 }] });
  assert.deepEqual(d.groups, ['A', 'Z']);
  assert.equal(d.group.filter(g => g === 'A').length + d.group.filter(g => g === 'Z').length, 100);
  assert.throws(() => makeApplicants({ groupShift: { Q: {} } }), RangeError);
  assert.throws(() => makeApplicants({ labelNoiseByGroup: { A: 1.5 } }), RangeError);
  assert.throws(() => makeApplicants({ n: 2 }), RangeError);
  assert.throws(() => makeApplicants({ groups: ['A'] }), RangeError);
  assert.throws(() => makeApplicants({ groups: ['A', 'A'] }), RangeError);
  assert.equal(DEFAULT_GROUPS.length, 3);
});

// ---- model -----------------------------------------------------------------------------------

test('fitApplicantModel: fits, never sees the group by default, handles missing cells', () => {
  const { train, test, model } = setup(1);
  assert.equal(model.useGroup, false);
  assert.deepEqual(model.featureNames, FEATURES);
  assert.deepEqual(Object.keys(model.coefficients), FEATURES);
  assert.ok(model.coefficients.skill > 0 && model.coefficients.experience > 0);
  assert.ok(model.coefficients.postcode < 0, 'postcode picks up the base-rate gap between the groups');
  const p = applicantProba(model, test);
  assert.ok(p.every(v => v >= 0 && v <= 1));
  const overall = groupReport(model, test).overall.accuracy;
  assert.ok(overall > 0.85, `overall accuracy ${overall}`);

  const withGroup = fitApplicantModel(train, { useGroup: true });
  assert.deepEqual(Object.keys(withGroup.coefficients), [...FEATURES, 'group A', 'group B', 'group C']);
  const noProxy = fitApplicantModel(train, { drop: ['postcode'] });
  assert.deepEqual(noProxy.featureNames, ['skill', 'experience']);
  assert.deepEqual(fitApplicantModel(train, { drop: [2] }).featureNames, ['skill', 'experience']);
  assert.throws(() => fitApplicantModel(train, { drop: ['salary'] }), RangeError);

  // Missing cells are filled with training means, so no score is NaN.
  const holes = makeApplicants({ n: 800, seed: 9, missingByGroup: { C: 0.5 } });
  const m2 = fitApplicantModel(holes);
  assert.ok(applicantProba(m2, holes).every(Number.isFinite));
  assert.ok(m2.means.every(Number.isFinite));
});

test('proxyAudit: the postcode stands in for the group, the real features do not', () => {
  const audit = proxyAudit(makeApplicants({ n: 3000, seed: 1 }));
  assert.equal(audit[0].feature, 'postcode');
  assert.ok(audit[0].etaSquared > 0.6, `postcode eta2 ${audit[0].etaSquared}`);
  assert.ok(audit.slice(1).every(a => a.etaSquared < 0.05));
});

// ---- subgroup metrics: hand-computed ---------------------------------------------------------

// Group X: (score, label) = (.9,1) (.8,1) (.3,1) (.7,0) (.2,0) (.1,0)  -> at 0.5: tp2 fn1 fp1 tn2
// Group Y: (.6,1) (.4,1) (.45,1) (.35,1) (.55,0) (.2,0) (.15,0) (.05,0) -> tp1 fn3 fp1 tn3
const HAND = {
  scores: [0.9, 0.8, 0.3, 0.7, 0.2, 0.1, 0.6, 0.4, 0.45, 0.35, 0.55, 0.2, 0.15, 0.05],
  labels: [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
  group: ['X', 'X', 'X', 'X', 'X', 'X', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'],
};
const handData = { X: HAND.scores.map(s => [s]), y: HAND.labels, group: HAND.group, groups: ['X', 'Y'] };
const stub = { proba: d => d.X.map(r => r[0]) };

test('groupReport: a two-group confusion table with exact TPR, FPR and gaps', () => {
  const r = groupReport(stub, handData, 0.5);
  const [x, y] = r.groups;
  assert.deepEqual([x.group, x.size, x.positives], ['X', 6, 3]);
  assert.deepEqual([x.tp, x.fn, x.fp, x.tn], [2, 1, 1, 2]);
  close(x.accuracy, 4 / 6); close(x.tpr, 2 / 3); close(x.fpr, 1 / 3); close(x.precision, 2 / 3); close(x.selectionRate, 0.5);
  close(x.baseRate, 0.5);
  assert.deepEqual([y.group, y.size, y.positives], ['Y', 8, 4]);
  assert.deepEqual([y.tp, y.fn, y.fp, y.tn], [1, 3, 1, 3]);
  close(y.accuracy, 0.5); close(y.tpr, 0.25); close(y.fpr, 0.25); close(y.precision, 0.5); close(y.selectionRate, 0.25);
  assert.deepEqual(r.overall.group, 'all');
  assert.deepEqual([r.overall.tp, r.overall.fn, r.overall.fp, r.overall.tn], [3, 4, 2, 5]);
  close(r.overall.accuracy, 8 / 14); close(r.overall.tpr, 3 / 7); close(r.overall.fpr, 2 / 7); close(r.overall.selectionRate, 5 / 14);
  close(r.gaps.equalOpportunity, 2 / 3 - 1 / 4);
  close(r.gaps.demographicParity, 0.25);
  close(r.gaps.fpr, 1 / 3 - 1 / 4);
  close(r.gaps.accuracy, 4 / 6 - 0.5);
  assert.equal(r.byGroup.X, x);
  // Group X's calibration error: six bins with one case each, |label - score| = .1 .2 .7 .7 .2 .1 -> 2.0 / 6.
  close(x.calibrationError, 2 / 6);
  // The same report from raw arrays.
  const raw = scoredGroupReport(HAND.scores, HAND.labels, HAND.group, 0.5);
  assert.deepEqual(raw.gaps, r.gaps);
});

test('groupReport: undefined ratios are null, a threshold per group is honoured', () => {
  // Group Q has no positives and nothing selected: TPR, precision and selection rate edge cases.
  const r = scoredGroupReport([0.1, 0.2, 0.9, 0.8], [0, 0, 1, 0], ['Q', 'Q', 'R', 'R'], 0.5);
  assert.equal(r.byGroup.Q.tpr, null);
  assert.equal(r.byGroup.Q.precision, null);
  assert.equal(r.byGroup.Q.selectionRate, 0);
  assert.equal(r.gaps.equalOpportunity, null, 'a gap needs two groups with a value');
  assert.equal(r.byGroup.R.tpr, 1);
  // Per-group thresholds: X at 0.9 flags only its top score; Y at 0.45 flags .6, .55 and .45.
  const t = groupReport(stub, handData, { X: 0.9, Y: 0.45 });
  assert.deepEqual([t.byGroup.X.tp, t.byGroup.X.fp, t.byGroup.X.fn], [1, 0, 2]);
  assert.deepEqual([t.byGroup.Y.tp, t.byGroup.Y.fp, t.byGroup.Y.fn], [2, 1, 2]);
  assert.equal(t.byGroup.X.threshold, 0.9);
  assert.throws(() => scoredGroupReport([0.1], [1, 0], ['a'], 0.5), RangeError);
  assert.throws(() => groupReport({}, handData), TypeError);
});

test('group thresholds: hand-computed cuts that pull the TPRs together', () => {
  const g = groupThresholds(stub, handData, { goal: 'equalOpportunity', threshold: 0.5 });
  close(g.target, 3 / 7);
  assert.deepEqual(g.thresholds, { X: 0.9, Y: 0.45 });
  const trade = groupThresholdTrade(stub, handData, { goal: 'equalOpportunity' });
  close(trade.before.gaps.equalOpportunity, 5 / 12);
  close(trade.after.gaps.equalOpportunity, 0.5 - 1 / 3);
  close(trade.gapChange.equalOpportunity, 1 / 6 - 5 / 12);
  // After: X tp1 tn3 (4/6) and Y tp2 tn3 (5/8) -> 9/14, against 8/14 before: here the cut even helps.
  close(trade.after.overall.accuracy, 9 / 14);
  close(trade.accuracyCost, 8 / 14 - 9 / 14);
  assert.throws(() => groupThresholds(stub, handData, { goal: 'luck' }), RangeError);
});

// ---- proxy feature ---------------------------------------------------------------------------

test('a proxy feature leaves a gap even when the group is excluded from the model', () => {
  for (const seed of SEEDS) {
    const { train, test } = setup(seed);
    const blind = fitApplicantModel(train); // no group column
    const aware = fitApplicantModel(train, { useGroup: true });
    const noProxy = fitApplicantModel(train, { drop: ['postcode'] });
    const gapBlind = groupReport(blind, test).gaps.demographicParity;
    const gapAware = groupReport(aware, test).gaps.demographicParity;
    const gapNoProxy = groupReport(noProxy, test).gaps.demographicParity;
    assert.ok(gapBlind > 0.15, `seed ${seed}: group-blind gap ${gapBlind}`);
    assert.ok(gapBlind > 0.75 * gapAware, `seed ${seed}: leaving the group out barely helps (${gapBlind} vs ${gapAware})`);
    assert.ok(gapBlind > gapNoProxy + 0.03, `seed ${seed}: dropping the proxy shrinks the gap (${gapBlind} vs ${gapNoProxy})`);
    assert.ok(gapNoProxy > 0.05, `seed ${seed}: base rates and feature quality still leave a gap (${gapNoProxy})`);
  }
});

// ---- fairness under shift --------------------------------------------------------------------

test('fairnessUnderShift: the gaps change when one group drifts', () => {
  const shift = { C: { featureShift: -0.8, noiseScale: 1.2 } };
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const { model } = setup(seed);
    const r = fairnessUnderShift(model, { seed: seed + 100, groupShift: shift });
    assert.ok(r.gapChange.equalOpportunity > 0.1, `seed ${seed}: EO gap change ${r.gapChange.equalOpportunity}`);
    assert.ok(r.gapChange.demographicParity > 0.05, `seed ${seed}: DP gap change ${r.gapChange.demographicParity}`);
    close(r.shifted.gaps.equalOpportunity - r.baseline.gaps.equalOpportunity, r.gapChange.equalOpportunity);
    assert.ok(r.shifted.byGroup.C.tpr < r.baseline.byGroup.C.tpr - 0.1, 'the drifting group loses recall');
    close(r.shifted.byGroup.A.tpr, r.baseline.byGroup.A.tpr, 1e-12);
  }
  // No shift: nothing moves, exactly.
  const same = fairnessUnderShift(setup(1).model, { seed: 101, groupShift: {} });
  for (const v of Object.values(same.gapChange)) assert.equal(v, 0);
  assert.deepEqual(same.baseline.groups, same.shifted.groups);
});

// ---- group thresholds on generated data ------------------------------------------------------

test('group thresholds reduce the TPR gap at a stated accuracy cost', () => {
  const costs = [];
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const { train, test, model } = setup(seed);
    const t = groupThresholdTrade(model, train, { goal: 'equalOpportunity', threshold: 0.5, evalData: test });
    const before = t.before.gaps.equalOpportunity, after = t.after.gaps.equalOpportunity;
    assert.ok(before > 0.15, `seed ${seed}: starting gap ${before}`);
    assert.ok(after < 0.5 * before, `seed ${seed}: gap ${before} -> ${after}`);
    close(t.gapChange.equalOpportunity, after - before);
    close(t.accuracyCost, t.before.overall.accuracy - t.after.overall.accuracy);
    assert.ok(t.accuracyCost < 0.08, `seed ${seed}: cost ${t.accuracyCost}`);
    // Cuts move the right way: the group with the lowest recall gets the lowest cut.
    assert.ok(t.thresholds.C < t.thresholds.B && t.thresholds.B < t.thresholds.A, JSON.stringify(t.thresholds));
    costs.push(t.accuracyCost);
  }
  assert.ok(avg(costs) > 0.005, `accuracy is not free on average: ${avg(costs)}`);
  const { train, test, model } = setup(2);
  const dp = groupThresholdTrade(model, train, { goal: 'demographicParity', evalData: test });
  assert.ok(dp.after.gaps.demographicParity < 0.5 * dp.before.gaps.demographicParity);
});

// ---- perturbations ---------------------------------------------------------------------------

test('perturb: every kind does what it says, deterministically and without mutating X', () => {
  const { test } = setup(1, { nTrain: 200, nTest: 3000 });
  const X = test.X, copy = JSON.parse(JSON.stringify(X));
  assert.deepEqual(PERTURBATIONS, ['noise', 'missing', 'outlier', 'unitChange', 'shift']);
  for (const kind of PERTURBATIONS) {
    const a = perturb(X, { kind, strength: 0.4, seed: 5 }), b = perturb(X, { kind, strength: 0.4, seed: 5 });
    assert.deepEqual(a, b, `${kind} is deterministic`);
    assert.notDeepEqual(a, perturb(X, { kind: 'noise', strength: 0.4, seed: 6 }));
    assert.deepEqual(X, copy, `${kind} leaves X untouched`);
    const zero = perturb(X, { kind, strength: 0, seed: 5 });
    assert.deepEqual(zero, X, `${kind} at strength 0 is an unchanged copy`);
    assert.notEqual(zero[0], X[0]);
  }
  // noise: the added noise has sd about strength * column sd.
  const noisy = perturb(X, { kind: 'noise', strength: 0.5, seed: 2 });
  for (const j of [0, 1, 2]) {
    const diff = noisy.map((r, i) => r[j] - X[i][j]);
    const m = avg(diff);
    close(Math.sqrt(avg(diff.map(v => (v - m) ** 2))), 0.5 * colSd(X, j), 0.05 * colSd(X, j) + 0.02);
  }
  // missing: about the stated share of cells become NaN, the rest are unchanged.
  const gone = perturb(X, { kind: 'missing', strength: 0.3, seed: 2 });
  close(avg(gone.flat().map(v => (Number.isNaN(v) ? 1 : 0))), 0.3, 0.03);
  assert.ok(gone.every((r, i) => r.every((v, j) => Number.isNaN(v) || v === X[i][j])));
  // outlier: hit cells land exactly 8 sd from the mean.
  const out = perturb(X, { kind: 'outlier', strength: 0.1, seed: 2 });
  const hit = out.flatMap((r, i) => r.map((v, j) => (v !== X[i][j] ? [j, v] : null)).filter(Boolean));
  close(hit.length / (X.length * 3), 0.1, 0.02);
  for (const [j, v] of hit) close(Math.abs(v - avg(X.map(r => r[j]))), 8 * colSd(X, j), 1e-6);
  // unitChange: the first column is multiplied by 10^strength, the others are untouched.
  const unit = perturb(X, { kind: 'unitChange', strength: 1, seed: 2 });
  unit.forEach((r, i) => { close(r[0], X[i][0] * 10, 1e-9); assert.equal(r[1], X[i][1]); assert.equal(r[2], X[i][2]); });
  const unit2 = perturb(X, { kind: 'unitChange', strength: 2, columns: [1] });
  close(unit2[7][1], X[7][1] * 100); assert.equal(unit2[7][0], X[7][0]);
  // shift: every column mean moves by strength * sd, the spread does not change.
  const sh = perturb(X, { kind: 'shift', strength: 0.5, seed: 2 });
  for (const j of [0, 1, 2]) {
    close(avg(sh.map(r => r[j])) - avg(X.map(r => r[j])), 0.5 * colSd(X, j), 1e-9);
    close(colSd(sh, j), colSd(X, j), 1e-9);
  }
  // Cells that are already missing stay missing.
  const withNaN = [[1, NaN, 3], [2, 4, 6], [3, 5, 9]];
  assert.ok(Number.isNaN(perturb(withNaN, { kind: 'noise', strength: 1 })[0][1]));
  assert.throws(() => perturb(X, { kind: 'bogus' }), RangeError);
  assert.throws(() => perturb(X, { kind: 'missing', strength: 1.5 }), RangeError);
  assert.throws(() => perturb(X, { kind: 'noise', strength: -1 }), RangeError);
  assert.deepEqual(perturb([], { kind: 'noise' }), []);
});

test('robustness: more noise lowers accuracy; a unit mix-up lowers it most for the noisiest group', () => {
  const accuracy = [], dropsA = [], dropsC = [];
  for (const seed of SEEDS) {
    const { test, model } = setup(seed);
    const sweep = robustnessSweep(model, test, { kind: 'noise', strengths: [0, 0.5, 1.5], seed: 3 });
    assert.ok(sweep[0].accuracy > sweep[1].accuracy && sweep[1].accuracy > sweep[2].accuracy, `seed ${seed}: ${JSON.stringify(sweep.map(s => s.accuracy))}`);
    accuracy.push(sweep[0].accuracy - sweep[2].accuracy);
    close(sweep[0].accuracy, groupReport(model, test).overall.accuracy);

    const r = robustnessReport(model, test, { kind: 'unitChange', strength: 1, seed: 3 });
    const d = r.accuracyDrop.byGroup;
    assert.ok(d.C > d.A + 0.005, `seed ${seed}: drops A ${d.A}, C ${d.C}`);
    assert.ok(d.C > d.B - 0.02 && d.B > d.A - 0.02, `seed ${seed}: drops ${JSON.stringify(d)}`);
    assert.ok(r.flipRate.byGroup.C > r.flipRate.byGroup.A, 'the noisiest group has the least stable decisions');
    dropsA.push(d.A); dropsC.push(d.C);
    close(r.accuracyDrop.overall, r.before.overall.accuracy - r.after.overall.accuracy);
  }
  assert.ok(avg(accuracy) > 0.1);
  assert.ok(avg(dropsC) > avg(dropsA) + 0.02, `mean drops A ${avg(dropsA)}, C ${avg(dropsC)}`);
  // Noise and missing cells destroy information: the clean group has the most to lose.
  const { test, model } = setup(1);
  const n = robustnessReport(model, test, { kind: 'noise', strength: 0.6, seed: 3 });
  assert.equal(n.worstGroup, 'A');
  assert.ok(n.flipRate.overall > 0 && n.flipRate.overall < 0.5);
  const zero = robustnessReport(model, test, { kind: 'shift', strength: 0 });
  assert.equal(zero.accuracyDrop.overall, 0);
  assert.equal(zero.flipRate.overall, 0);
});

// ---- review band: hand-computed --------------------------------------------------------------

test('reviewBand: coverage and accuracy on a tiny scored set, exactly', () => {
  const scores = [0.95, 0.85, 0.6, 0.55, 0.45, 0.4, 0.15, 0.05];
  const labels = [1, 0, 0, 1, 1, 0, 0, 0];
  const r = reviewBand({ scores, labels, low: 0.4, high: 0.6 });
  // Reviewed: .6 .55 .45 .4 (the band is inclusive). Automated: .95 -> 1 (right), .85 -> 1 (wrong),
  // .15 -> 0 (right), .05 -> 0 (right).
  assert.equal(r.n, 8);
  assert.equal(r.reviewed, 4);
  assert.equal(r.automated, 4);
  assert.equal(r.coverage, 0.5);
  assert.equal(r.workload, 0.5);
  assert.equal(r.accuracyAutomated, 0.75);
  assert.equal(r.accuracyWithReviewer, 7 / 8);
  // No reviewer, plain 0.5 cut: right on .95 .55 .4 .15 .05, wrong on .85 .6 .45 -> 5/8.
  assert.equal(r.accuracyNoReview, 5 / 8);
  // A wider band hands more to the reviewer; here it takes everything.
  const all = reviewBand({ scores, labels, low: 0, high: 1 });
  assert.deepEqual([all.automated, all.coverage, all.accuracyAutomated, all.accuracyWithReviewer], [0, 0, null, 1]);
  // An empty band (low > high) automates everything, splitting at `high`: .95 .85 .6 .55 .45 -> yes, the
  // rest -> no, right on .95 .55 .45 .4 .15 .05 -> 6/8.
  const none = reviewBand({ scores, labels, low: 0.5, high: 0.4 });
  assert.deepEqual([none.reviewed, none.coverage, none.accuracyAutomated, none.accuracyWithReviewer], [0, 1, 6 / 8, 6 / 8]);
  assert.throws(() => reviewBand({ scores, labels: [1], low: 0.2, high: 0.8 }), RangeError);
  assert.throws(() => reviewBand({ scores, labels, low: 'a', high: 0.8 }), RangeError);
});

test('bandForShare and reviewCurve: the reviewer capacity trade-off', () => {
  assert.deepEqual(bandForShare([0.1, 0.2, 0.4, 0.5, 0.6, 0.9], 0.5), { low: 0.4, high: 0.6 });
  assert.deepEqual(bandForShare([0.1, 0.2, 0.4, 0.5, 0.6, 0.9], 1 / 6), { low: 0.5, high: 0.5 });
  const { test, model } = setup(1, { nTest: 1500 });
  const scores = applicantProba(model, test);
  const curve = reviewCurve({ scores, labels: test.y, shares: [0, 0.1, 0.2, 0.3, 0.5] });
  assert.equal(curve[0].workload, 0);
  assert.equal(curve[0].coverage, 1);
  for (let i = 1; i < curve.length; i++) {
    assert.ok(curve[i].workload > curve[i - 1].workload);
    assert.ok(curve[i].accuracyWithReviewer >= curve[i - 1].accuracyWithReviewer);
    assert.ok(curve[i].accuracyAutomated >= curve[i - 1].accuracyAutomated - 1e-12, 'the cases left to the machine are the easy ones');
  }
  assert.ok(curve[2].workload >= 0.2 && curve[2].workload < 0.25);
  assert.ok(curve[3].accuracyWithReviewer > curve[0].accuracyWithReviewer + 0.03);
  assert.throws(() => bandForShare([0.5], 1.5), RangeError);
});

// ---- privacy ---------------------------------------------------------------------------------

const PEOPLE = [
  { id: 1, age: 34, zip: '10115', disease: 'flu' },
  { id: 2, age: 36, zip: '10115', disease: 'asthma' },
  { id: 3, age: 52, zip: '10117', disease: 'flu' },
  { id: 4, age: 52, zip: '10117', disease: 'diabetes' },
  { id: 5, age: 52, zip: '10117', disease: 'flu' },
  { id: 6, age: 29, zip: '10243', disease: 'asthma' },
];

test('kAnonymityReport: a 6-row example, exactly', () => {
  const r = kAnonymityReport(PEOPLE, ['age', 'zip'], 2);
  // Groups: (34,10115) 1, (36,10115) 1, (52,10117) 3, (29,10243) 1.
  assert.equal(r.n, 6);
  assert.equal(r.minGroupSize, 1);
  assert.equal(r.groupCount, 4);
  assert.equal(r.rowsBelowK, 3);
  assert.equal(r.shareBelowK, 0.5);
  assert.deepEqual(r.groups.map(g => g.size), [1, 1, 1, 3]);
  assert.equal(r.groups[3].key, '52 | 10117');
  assert.equal(kAnonymityReport(PEOPLE, ['age', 'zip'], 3).shareBelowK, 0.5);
  assert.equal(kAnonymityReport(PEOPLE, ['age', 'zip'], 4).shareBelowK, 1);
  assert.equal(kAnonymityReport(PEOPLE, ['age', 'zip'], 1).shareBelowK, 0, 'every group has at least 1 row');
  // One identifier alone is coarser: zip groups are 2, 3, 1.
  const zipOnly = kAnonymityReport(PEOPLE, ['zip'], 3);
  assert.deepEqual(zipOnly.groups.map(g => g.size), [1, 2, 3]);
  assert.equal(zipOnly.shareBelowK, 0.5);
  assert.equal(kAnonymityReport(PEOPLE, ['zip']).k, 5, 'default k is 5');
  assert.throws(() => kAnonymityReport([], ['age']), RangeError);
  assert.throws(() => kAnonymityReport(PEOPLE, []), RangeError);
});

test('generalise: coarser fields raise the smallest group size', () => {
  const ages = generalise(PEOPLE, 'age', 20);
  assert.deepEqual(ages.map(r => r.age), ['20-39', '20-39', '40-59', '40-59', '40-59', '20-39']);
  const both = generalise(ages, 'zip', 2);
  assert.deepEqual(both.map(r => r.zip), new Array(6).fill('10*'));
  assert.equal(PEOPLE[0].age, 34, 'input rows are not changed');
  assert.equal(both[0].disease, 'flu');
  const r = kAnonymityReport(both, ['age', 'zip'], 3);
  // (20-39, 10*) holds rows 1, 2, 6 and (40-59, 10*) holds rows 3, 4, 5.
  assert.equal(r.minGroupSize, 3);
  assert.equal(r.shareBelowK, 0);
  assert.equal(kAnonymityReport(PEOPLE, ['age', 'zip'], 3).minGroupSize, 1);
  assert.deepEqual(generalise([{ a: 7 }, { a: 12 }, { a: 25 }], 'a', 10).map(r => r.a), ['0-9', '10-19', '20-29']);
  assert.deepEqual(generalise([{ a: 0.7 }, { a: 1.2 }], 'a', 0.5).map(r => r.a), ['0.5..<1', '1..<1.5']);
  assert.deepEqual(generalise([{ z: '10115' }, { z: '10' }], 'z', 3).map(r => r.z), ['101*', '10']);
  assert.throws(() => generalise(PEOPLE, 'age', 0), RangeError);
  assert.throws(() => generalise(PEOPLE, 'zip', 1.5), RangeError);
});

test('addLaplaceNoise: seeded, scale = sensitivity / epsilon, unbiased', () => {
  assert.equal(addLaplaceNoise(100, 0.5, 1, 7), addLaplaceNoise(100, 0.5, 1, 7));
  assert.notEqual(addLaplaceNoise(100, 0.5, 1, 7), addLaplaceNoise(100, 0.5, 1, 8));
  // The noise is linear in the scale: epsilon 0.1 gives exactly 10 times the noise of epsilon 1, same seed.
  const n1 = addLaplaceNoise(0, 1, 1, 5), n01 = addLaplaceNoise(0, 0.1, 1, 5);
  close(n01, 10 * n1, 1e-9);
  close(addLaplaceNoise(0, 1, 3, 5), 3 * n1, 1e-9);
  close(addLaplaceNoise(50, 1, 1, 5), 50 + n1, 1e-9);
  const draws = Array.from({ length: 4000 }, (_, s) => addLaplaceNoise(0, 0.5, 1, s + 1)); // scale 2
  close(avg(draws), 0, 0.2);
  close(avg(draws.map(Math.abs)), 2, 0.2); // E|Laplace(b)| = b
  assert.ok(draws.some(v => v > 0) && draws.some(v => v < 0));
  assert.ok(draws.every(Number.isFinite));
  assert.throws(() => addLaplaceNoise(1, 0, 1, 1), RangeError);
  assert.throws(() => addLaplaceNoise(1, 1, -1, 1), RangeError);
});

test('noisyRateCurve: accuracy versus privacy, error shrinks as epsilon grows', () => {
  const curve = noisyRateCurve({ successes: 420, total: 500, epsilons: [0.01, 0.1, 1], trials: 1500, seed: 3 });
  assert.deepEqual(curve.map(c => c.epsilon), [0.01, 0.1, 1]);
  assert.ok(curve[0].meanAbsError > curve[1].meanAbsError && curve[1].meanAbsError > curve[2].meanAbsError);
  // The released rate's mean absolute error is scale / total = 1 / (epsilon * 500).
  curve.forEach(c => close(c.meanAbsError, c.scale / 500, 0.12 * c.scale / 500));
  close(curve[2].meanNoisyRate, 0.84, 0.005);
  assert.ok(curve[0].meanAbsError > 0.1, 'epsilon 0.01 makes a 500-row rate useless');
  assert.deepEqual(noisyRateCurve({ successes: 5, total: 10, epsilons: [1], trials: 50, seed: 1 }), noisyRateCurve({ successes: 5, total: 10, epsilons: [1], trials: 50, seed: 1 }));
  assert.throws(() => noisyRateCurve({ successes: 11, total: 10 }), RangeError);
});

// ---- model card ------------------------------------------------------------------------------

test('modelCard: plain text from the filled fields, gaps named', () => {
  const card = modelCard({
    name: 'Loan screener', version: '1.2', owner: 'Credit team',
    purpose: 'Rank applications for a first look by an analyst.',
    metrics: { accuracy: 0.9, auc: 0.95123 },
    limitations: ['Trained on one region', 'Postcode acts as a proxy'],
  });
  const lines = card.split('\n');
  assert.equal(lines[0], 'MODEL CARD: Loan screener (version 1.2)');
  assert.equal(lines[1], 'owner: Credit team');
  assert.ok(lines.includes('INTENDED USE') && lines.includes('------------'));
  assert.ok(lines.includes('Rank applications for a first look by an analyst.'));
  assert.ok(lines.includes('accuracy: 0.900') && lines.includes('auc: 0.951'));
  assert.ok(lines.includes('- Trained on one region') && lines.includes('- Postcode acts as a proxy'));
  assert.ok(lines.includes('(not filled in)'));
  const missing = modelCardMissing({ name: 'x', purpose: 'p', metrics: { a: 1 }, limitations: ['l'] });
  assert.equal(missing.length, MODEL_CARD_SECTIONS.length - 3);
  assert.ok(!missing.includes('purpose') && !missing.includes('limitations') && missing.includes('privacy'));
  assert.equal(lines[lines.length - 1], `Missing: ${modelCardMissing({ name: 'Loan screener', purpose: 'Rank applications for a first look by an analyst.', metrics: { a: 1 }, limitations: ['x'] }).join(', ')}`);
  assert.equal(card, modelCard({
    name: 'Loan screener', version: '1.2', owner: 'Credit team',
    purpose: 'Rank applications for a first look by an analyst.',
    metrics: { accuracy: 0.9, auc: 0.95123 },
    limitations: ['Trained on one region', 'Postcode acts as a proxy'],
  }), 'deterministic');
  // Blank strings and empty arrays count as missing; an empty card still renders.
  assert.deepEqual(modelCardMissing({ purpose: '   ', limitations: [] }).slice(0, 2), ['purpose', 'outOfScope']);
  const empty = modelCard();
  assert.ok(empty.startsWith('MODEL CARD: (unnamed model)') && empty.includes('Missing: purpose, outOfScope'));
});

test('modelCard: renders a subgroup report as a table and a full card has nothing missing', () => {
  const { test: te, model } = setup(1, { nTest: 600 });
  const report = groupReport(model, te);
  const band = reviewBand({ scores: applicantProba(model, te), labels: te.y, low: 0.3, high: 0.7 });
  const fields = {
    name: 'Applicant model', version: '0.1', date: '2026-11-24',
    purpose: 'Triage', outOfScope: 'Final decisions', trainingData: 'Generated applicants', evaluationData: 'Held-out applicants',
    metrics: { accuracy: report.overall.accuracy }, groupMetrics: report,
    robustness: ['noise 0.5: accuracy drops'], fairness: 'EO gap reported above', privacy: 'No names stored',
    humanReview: band ? { low: band.low, high: band.high, workload: band.workload } : '', limitations: 'See gaps', monitoring: 'Weekly drift check',
  };
  assert.deepEqual(modelCardMissing(fields), []);
  const card = modelCard(fields);
  assert.ok(card.includes('group | size | accuracy | TPR | FPR | selection rate | calibration error'));
  for (const g of ['A', 'B', 'C']) assert.ok(card.split('\n').some(l => l.startsWith(`${g} | `)), `row for ${g}`);
  assert.ok(card.includes('gaps: equal opportunity '));
  assert.ok(card.endsWith('Missing: nothing'));
  assert.ok(card.includes('date: 2026-11-24'));
});
