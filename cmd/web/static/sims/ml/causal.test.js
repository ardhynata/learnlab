import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeCausalData, randomize, covariateBalance, naiveDiff, stratified, regressionAdjust, ols, ipw, badControl,
  compareEstimators, normCdf, normQuantile, powerTwoSample, sampleSize, minDetectableEffect, simulatePower,
  peekingFalsePositiveRate,
} from './causal.js';
import { fitLogistic, predictProba } from './logistic.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const SEEDS = [1, 2, 3, 4, 5];
const Z95 = 1.959963984540054;

// A 6-point example worked by hand: treated y = 5, 7, 9 (mean 7, variance 4); control y = 2, 3, 4 (mean 3, variance 1).
const SIX = [5, 7, 9, 2, 3, 4].map((y, i) => ({ t: i < 3 ? 1 : 0, y }));

// ---- hand-computed estimators ----------------------------------------------------------------

test('naiveDiff: 6-point example is exact (difference 4, Welch SE sqrt(4/3 + 1/3))', () => {
  const r = naiveDiff(SIX);
  close(r.estimate, 4);
  close(r.se, Math.sqrt(5 / 3));
  close(r.ci[0], 4 - Z95 * Math.sqrt(5 / 3));
  close(r.ci[1], 4 + Z95 * Math.sqrt(5 / 3));
  assert.deepEqual([r.meanTreated, r.meanControl, r.nTreated, r.nControl, r.n], [7, 3, 3, 3, 6]);
  assert.equal(r.bias, null, 'a plain table has no known truth');
  assert.equal(r.covers, null);
});

test('naiveDiff: needs both arms', () => {
  assert.throws(() => naiveDiff([{ t: 1, y: 1 }, { t: 1, y: 2 }]), /treated and one control/);
});

// Stratum a (4 people): treated 3, 5 and control 1, 1 -> difference 3, variance 2/2 + 0/2 = 1.
// Stratum b (6 people): treated 10, 12 and control 6, 8, 7, 7 -> difference 11 - 7 = 4, variance 2/2 + (2/3)/4 = 7/6.
const TABLE = [
  ['a', 1, 3], ['a', 1, 5], ['a', 0, 1], ['a', 0, 1],
  ['b', 1, 10], ['b', 1, 12], ['b', 0, 6], ['b', 0, 8], ['b', 0, 7], ['b', 0, 7],
].map(([g, t, y]) => ({ g, t, y }));

test('stratified: tiny two-stratum table is exact (0.4 * 3 + 0.6 * 4 = 3.6)', () => {
  const r = stratified(TABLE, 5, { by: 'g' });
  close(r.estimate, 3.6);
  close(r.se, Math.sqrt(0.16 * 1 + 0.36 * (7 / 6)));
  assert.deepEqual(r.strata.map(s => [s.key, s.n, s.diff]), [['a', 4, 3], ['b', 6, 4]]);
  close(r.strata[0].weight, 0.4);
  assert.equal(r.dropped, 0);
  // The pooled difference mixes the strata differently: treated mean 7.5, control mean 5.
  close(naiveDiff(TABLE).estimate, 2.5);
  // by can also be a function.
  close(stratified(TABLE, 5, { by: r2 => r2.g }).estimate, 3.6);
});

test('stratified: a stratum missing an arm is dropped and the weights renormalise', () => {
  const rows = [...TABLE, { g: 'c', t: 1, y: 100 }, { g: 'c', t: 1, y: 100 }];
  const r = stratified(rows, 5, { by: 'g' });
  close(r.estimate, 3.6);
  assert.equal(r.dropped, 2);
  assert.equal(r.strata.length, 2);
  assert.throws(() => stratified([{ g: 'x', t: 1, y: 1 }, { g: 'y', t: 0, y: 1 }], 5, { by: 'g' }), /no stratum/);
});

test('regressionAdjust with no covariates equals the difference in means (and its SE on a balanced table)', () => {
  const r = regressionAdjust(SIX, []);
  close(r.estimate, 4);
  // pooled variance (8 + 2) / (6 - 2) = 2.5, SE = sqrt(2.5 * (1/3 + 1/3)) = sqrt(5/3)
  close(r.se, Math.sqrt(5 / 3));
  assert.deepEqual(r.names, ['intercept', 'treatment']);
});

test('ols and regressionAdjust recover an exact linear law (y = 1 + 2 t + 3 z) with zero error', () => {
  const rows = [];
  for (let i = 0; i < 12; i++) {
    const t = i % 2, z = (i * 7) % 5 + (i % 3) * 0.5;
    rows.push({ t, z, y: 1 + 2 * t + 3 * z });
  }
  const r = regressionAdjust(rows, ['z']);
  close(r.estimate, 2, 1e-8);
  close(r.se, 0, 1e-6);
  close(r.coefficients[2], 3, 1e-8);
  assert.deepEqual(r.names, ['intercept', 'treatment', 'z']);
  // a function covariate works the same
  close(regressionAdjust(rows, [row => row.z]).estimate, 2, 1e-8);
  const direct = ols(rows.map(row => [1, row.t, row.z]), rows.map(row => row.y));
  [1, 2, 3].forEach((v, j) => close(direct.coef[j], v, 1e-8));
  assert.throws(() => regressionAdjust(rows, ['nope']), /missing/);
  assert.throws(() => ols([[1, 2]], [1]), /more rows/);
});

test('regressionAdjust: interact keeps the AVERAGE effect when the effect varies with z', () => {
  // y = 2 t + 1.5 t z + z over z in {-1, 0, 1} (mean 0): the average effect is 2.
  const rows = [];
  for (const z of [-1, -0.5, 0, 0.5, 1]) for (const t of [0, 1]) rows.push({ z, t, y: 2 * t + 1.5 * t * z + z });
  close(regressionAdjust(rows, ['z'], { interact: true }).estimate, 2, 1e-8);
  assert.ok(regressionAdjust(rows, ['z'], { interact: true }).names.includes('treatment x z'));
});

// ---- normal tools and power ------------------------------------------------------------------

test('normCdf and normQuantile match known values and invert each other', () => {
  close(normCdf(0), 0.5, 1e-15);
  close(normCdf(1.96), 0.9750021048517795, 1e-12);
  close(normCdf(-1.96), 1 - 0.9750021048517795, 1e-12);
  close(normCdf(1), 0.8413447460685429, 1e-12);
  assert.equal(normCdf(-20), 0);
  assert.equal(normCdf(20), 1);
  close(normQuantile(0.975), Z95, 1e-9);
  close(normQuantile(0.8), 0.8416212335729143, 1e-9);
  close(normQuantile(0.5), 0, 1e-9);
  for (const p of [0.001, 0.2, 0.9, 0.999]) close(normCdf(normQuantile(p)), p, 1e-9);
  assert.throws(() => normQuantile(0), /0 < p < 1/);
});

test('sampleSize: textbook cases are exact to the integer', () => {
  // n = 2 (z_a + z_b)^2 sd^2 / effect^2 with z_a + z_b = 1.959964 + 0.841621 = 2.801585 (squared 7.848867)
  assert.equal(sampleSize({ effect: 0.5, sd: 1 }), 63); // 62.79
  assert.equal(sampleSize({ effect: 1, sd: 1 }), 16); // 15.70
  assert.equal(sampleSize({ effect: 0.2, sd: 1 }), 393); // 392.44
  assert.equal(sampleSize({ effect: 5, sd: 10 }), 63); // only effect / sd matters
  assert.equal(sampleSize({ effect: 0.5, sd: 1, power: 0.9 }), 85); // z sum 3.241516 -> 84.06
  assert.equal(sampleSize({ effect: -0.5, sd: 1 }), 63, 'a negative effect needs the same size');
  assert.throws(() => sampleSize({ effect: 0, sd: 1 }), /infinitely/);
  assert.throws(() => sampleSize({ effect: 1, sd: 0 }), /sd/);
  assert.throws(() => sampleSize({ effect: 1, sd: 1, power: 1 }), /power/);
});

test('powerTwoSample: crosses 80 percent exactly where sampleSize says, and behaves monotonically', () => {
  assert.ok(powerTwoSample({ effect: 0.5, sd: 1, n: 62 }) < 0.8);
  assert.ok(powerTwoSample({ effect: 0.5, sd: 1, n: 63 }) >= 0.8);
  close(powerTwoSample({ effect: 0.5, sd: 1, n: 63 }), 0.8013, 5e-4);
  // an effect of zero rejects at the rate alpha, whatever n is
  close(powerTwoSample({ effect: 0, sd: 1, n: 50 }), 0.05, 1e-9);
  close(powerTwoSample({ effect: 0, sd: 1, n: 500, alpha: 0.01 }), 0.01, 1e-9);
  let last = 0;
  for (const n of [10, 20, 40, 80, 160]) {
    const p = powerTwoSample({ effect: 0.4, sd: 1, n });
    assert.ok(p > last, 'more people, more power');
    last = p;
  }
  assert.ok(powerTwoSample({ effect: 0.4, sd: 2, n: 80 }) < powerTwoSample({ effect: 0.4, sd: 1, n: 80 }), 'noisier outcomes, less power');
  assert.equal(powerTwoSample({ effect: -0.5, sd: 1, n: 63 }), powerTwoSample({ effect: 0.5, sd: 1, n: 63 }));
  const mde = minDetectableEffect({ sd: 1, n: 63 });
  close(mde, 0.4988, 5e-4);
  close(powerTwoSample({ effect: mde, sd: 1, n: 63 }), 0.8, 1e-3);
});

test('simulatePower: agrees with the formula within Monte Carlo and normal-approximation margins; effect 0 gives alpha', () => {
  const s = simulatePower({ effect: 0.5, sd: 1, n: 63, runs: 3000, seed: 7 });
  assert.equal(s.runs, 3000);
  assert.ok(Math.abs(s.power - powerTwoSample({ effect: 0.5, sd: 1, n: 63 })) < 0.05, `simulated ${s.power}`);
  assert.equal(s.power, s.rejections / s.runs);
  const none = simulatePower({ effect: 0, sd: 1, n: 63, runs: 3000, seed: 7 });
  assert.ok(none.power > 0.03 && none.power < 0.08, `false positive rate ${none.power}`);
  assert.deepEqual(simulatePower({ effect: 0.5, n: 30, runs: 200, seed: 3 }), simulatePower({ effect: 0.5, n: 30, runs: 200, seed: 3 }));
  assert.ok(simulatePower({ effect: 0.5, n: 200, runs: 500, seed: 3 }).power > simulatePower({ effect: 0.5, n: 20, runs: 500, seed: 3 }).power);
});

test('peeking: stopping at the first significant look inflates the false positive rate above alpha', () => {
  const runs = 3000;
  const one = peekingFalsePositiveRate({ looks: 1, n: 200, runs, seed: 11 });
  const five = peekingFalsePositiveRate({ looks: 5, n: 200, runs, seed: 11 });
  const ten = peekingFalsePositiveRate({ looks: 10, n: 200, runs, seed: 11 });
  assert.ok(one.rate > 0.03 && one.rate < 0.07, `one look ${one.rate}`);
  assert.equal(one.rate, one.singleLookRate, 'a single look is the final look');
  assert.ok(five.rate > 0.10 && five.rate < 0.20, `five looks ${five.rate}`);
  assert.ok(ten.rate > five.rate, 'more looks, more inflation');
  assert.ok(five.inflation > 2, 'at least double the nominal rate');
  assert.ok(five.singleLookRate < 0.07, 'the same runs judged once at the end behave');
  assert.equal(five.alpha, 0.05);
  const fixed = peekingFalsePositiveRate({ looks: 5, n: 200, runs, seed: 11, correction: 'bonferroni' });
  assert.ok(fixed.rate < 0.06, `bonferroni ${fixed.rate}`);
  assert.ok(fixed.threshold > five.threshold);
  assert.deepEqual(peekingFalsePositiveRate({ looks: 3, n: 60, runs: 100, seed: 2 }), peekingFalsePositiveRate({ looks: 3, n: 60, runs: 100, seed: 2 }));
  assert.throws(() => peekingFalsePositiveRate({ looks: 5, n: 3 }), /looks/);
  assert.throws(() => peekingFalsePositiveRate({ correction: 'holm' }), /correction/);
});

// ---- generated causal data -------------------------------------------------------------------

test('makeCausalData: shapes, determinism, true effect, potential outcomes', () => {
  const d = makeCausalData({ n: 200, seed: 4, collider: true });
  assert.equal(d.rows.length, 200);
  assert.equal(d.n, 200);
  assert.equal(d.rct, false);
  assert.ok(d.rows.every(r => (r.t === 0 || r.t === 1) && r.p > 0 && r.p < 1 && typeof r.c === 'number'));
  assert.ok(d.rows.every(r => r.y === (r.t ? r.y1 : r.y0)), 'y is the potential outcome of the arm received');
  assert.ok(d.rows.every(r => Math.abs(r.y1 - r.y0 - 2) < 1e-12), 'effect 2, no heterogeneity');
  close(d.ate, 2);
  assert.deepEqual(makeCausalData({ n: 200, seed: 4, collider: true }), d);
  assert.notDeepEqual(makeCausalData({ n: 200, seed: 5, collider: true }).rows, d.rows);
  assert.ok(makeCausalData({ n: 50, seed: 1 }).rows.every(r => r.c === null), 'no collider unless asked');
  // changing a knob keeps the population: same z, u and noise
  const other = makeCausalData({ n: 200, seed: 4, confounding: 3, effect: 5 });
  assert.deepEqual(other.rows.map(r => [r.z, r.u, r.e]), d.rows.map(r => [r.z, r.u, r.e]));
  close(other.ate, 5);
  assert.throws(() => makeCausalData({ n: 1 }), /n must/);
  assert.throws(() => makeCausalData({ overlap: 0 }), /overlap/);
});

test('makeCausalData: heterogeneity makes the true effect the mean of tau, and confounding 0 balances z', () => {
  const d = makeCausalData({ n: 400, seed: 2, effect: 1, heterogeneity: 1.5 });
  close(d.ate, d.rows.reduce((s, r) => s + r.y1 - r.y0, 0) / 400);
  assert.ok(d.rows.some(r => r.tau > 1.5) && d.rows.some(r => r.tau < 0.5));
  const flat = makeCausalData({ n: 4000, seed: 2, confounding: 0 });
  assert.ok(Math.abs(covariateBalance(flat).smd) < 0.1);
  const confounded = makeCausalData({ n: 4000, seed: 2, confounding: 1.5 });
  assert.ok(covariateBalance(confounded).smd > 0.8, 'treated people have much higher z');
});

test('randomize: the same people with a coin-flip assignment and an unchanged true effect', () => {
  const d = makeCausalData({ n: 800, seed: 3, confounding: 2, collider: true });
  const r = randomize(d, 9);
  assert.equal(r.rct, true);
  assert.deepEqual(r.rows.map(x => [x.z, x.u, x.y0, x.y1]), d.rows.map(x => [x.z, x.u, x.y0, x.y1]));
  assert.equal(r.ate, d.ate);
  assert.ok(r.rows.every(x => x.y === (x.t ? x.y1 : x.y0) && x.p === 0.5 && typeof x.c === 'number'));
  assert.ok(r.rows.some((x, i) => x.t !== d.rows[i].t), 'assignment changed');
  const share = r.rows.filter(x => x.t).length / 800;
  assert.ok(share > 0.45 && share < 0.55);
  assert.ok(Math.abs(covariateBalance(r).smd) < 0.15, 'randomization balances z');
  assert.deepEqual(randomize(d, 9), r);
  assert.notDeepEqual(randomize(d, 10).rows.map(x => x.t), r.rows.map(x => x.t));
});

// ---- the lesson: confounding, adjustment, RCT -----------------------------------------------

test('under confounding the naive estimate is biased while RCT, stratified, regression and IPW land near the truth', () => {
  for (const seed of SEEDS) {
    const d = makeCausalData({ n: 3000, seed, confounding: 1 });
    const naive = naiveDiff(d), strat = stratified(d, 5), reg = regressionAdjust(d, ['z']), w = ipw(d, ['z']);
    assert.ok(naive.bias > 1.2, `naive bias ${naive.bias} (seed ${seed})`);
    assert.equal(naive.covers, false, 'the naive interval misses the truth');
    assert.ok(Math.abs(strat.bias) < 0.5, `stratified bias ${strat.bias}`);
    assert.ok(Math.abs(reg.bias) < 0.2, `regression bias ${reg.bias}`);
    assert.ok(Math.abs(w.bias) < 0.2, `ipw bias ${w.bias}`);
    const trial = randomize(d, seed + 100);
    assert.ok(Math.abs(naiveDiff(trial).bias) < 0.35, `RCT bias ${naiveDiff(trial).bias}`);
    assert.equal(naiveDiff(trial).covers, true, 'the RCT interval covers the truth');
  }
});

test('stratified: more bins remove more of the confounding; one bin is the naive estimate', () => {
  const d = makeCausalData({ n: 3000, seed: 1, confounding: 1 });
  close(stratified(d, 1).estimate, naiveDiff(d).estimate, 1e-9);
  const b = k => Math.abs(stratified(d, k).bias);
  assert.ok(b(2) < b(1) && b(5) < b(2) && b(20) < b(5), `${b(1)} ${b(2)} ${b(5)} ${b(20)}`);
  assert.equal(stratified(d, 5).strata.length, 5);
  assert.ok(stratified(d, 5).strata.every(s => Math.abs(s.weight - 0.2) < 1e-9), 'equal-count bins');
  assert.throws(() => stratified(d, 0), /bins/);
});

test('estimator results carry bias, coverage and a 95 percent interval around the estimate', () => {
  const d = makeCausalData({ n: 1000, seed: 6 });
  for (const r of compareEstimators(d)) {
    close(r.ci[1] - r.estimate, Z95 * r.se, 1e-9);
    close(r.estimate - r.ci[0], Z95 * r.se, 1e-9);
    close(r.bias, r.estimate - d.ate);
    assert.equal(r.covers, d.ate >= r.ci[0] && d.ate <= r.ci[1]);
    assert.ok(r.se > 0 && Number.isFinite(r.se));
    assert.equal(r.n, 1000);
  }
});

test('compareEstimators: fixed order, bad control only when the data has a collider', () => {
  const plain = compareEstimators(makeCausalData({ n: 500, seed: 2 }));
  assert.deepEqual(plain.map(r => r.method), ['naive difference', 'stratified', 'regression adjustment', 'inverse propensity weighting']);
  const withC = compareEstimators(makeCausalData({ n: 500, seed: 2, collider: true }));
  assert.equal(withC.length, 5);
  assert.equal(withC[4].method, 'bad control');
});

test('the bad control (adjusting for a collider) is badly biased, even in a randomized trial', () => {
  for (const seed of SEEDS) {
    const d = makeCausalData({ n: 3000, seed, confounding: 1, collider: true });
    const trial = randomize(d, seed + 100);
    assert.ok(Math.abs(regressionAdjust(trial, ['z']).bias) < 0.1, 'adjusting for z alone is fine in the trial');
    const bad = badControl(trial);
    assert.equal(bad.method, 'bad control');
    assert.ok(bad.bias < -1.5, `bad control bias ${bad.bias} (seed ${seed})`);
    assert.equal(bad.covers, false);
    assert.ok(badControl(d).bias < -1.5, 'and in the observational data too');
    assert.ok(bad.names.includes('c'));
  }
  assert.throws(() => badControl(makeCausalData({ n: 100, seed: 1 })), /collider/);
});

test('adjusting for z fails under an unmeasured confounder: every adjusted estimator stays biased, the RCT does not', () => {
  for (const seed of SEEDS) {
    const d = makeCausalData({ n: 3000, seed, confounding: 1, unmeasured: 1.5 });
    const reg = regressionAdjust(d, ['z']), strat = stratified(d, 10), w = ipw(d, ['z']);
    for (const r of [reg, strat, w]) {
      assert.ok(r.bias > 2, `${r.method} bias ${r.bias} (seed ${seed})`);
      assert.equal(r.covers, false);
    }
    assert.ok(naiveDiff(d).bias > reg.bias, 'adjusting for z still removes the part of the bias z carries');
    // The oracle that could see u removes the bias: u matters, and it is simply not measured.
    assert.ok(Math.abs(regressionAdjust(d, ['z', 'u']).bias) < 0.2, 'adjusting for u (if it were measured) works');
    assert.ok(Math.abs(naiveDiff(randomize(d, seed + 100)).bias) < 0.4, 'randomization balances the unmeasured u too');
  }
});

test('regressionAdjust with interactions recovers the average effect under heterogeneity', () => {
  const d = makeCausalData({ n: 4000, seed: 3, confounding: 1.5, effect: 1, heterogeneity: 1.5 });
  assert.ok(Math.abs(d.ate - 1) < 0.1);
  assert.ok(Math.abs(regressionAdjust(d, ['z'], { interact: true }).bias) < 0.2);
  assert.ok(Math.abs(ipw(d, ['z']).bias) < 0.25);
});

test('poor overlap shows up as extreme IPW weights and a small effective sample', () => {
  const good = ipw(makeCausalData({ n: 2000, seed: 4, confounding: 1, overlap: 1 }), ['z']);
  const poor = ipw(makeCausalData({ n: 2000, seed: 4, confounding: 1, overlap: 0.2 }), ['z']);
  assert.ok(poor.maxWeight > 3 * good.maxWeight, `${poor.maxWeight} vs ${good.maxWeight}`);
  assert.ok(poor.effectiveN < good.effectiveN);
  assert.ok(poor.se > good.se, 'less overlap, less certainty');
  assert.ok(poor.propensity.every(p => p >= 0.01 && p <= 0.99), 'propensities are clipped');
  assert.equal(good.propensity.length, 2000);
  assert.ok(good.effectiveN <= 2000);
  assert.ok(Math.abs(covariateBalance(makeCausalData({ n: 2000, seed: 4, overlap: 0.2 })).smd) > Math.abs(covariateBalance(makeCausalData({ n: 2000, seed: 4, overlap: 1 })).smd));
});

test('the interval of the RCT estimate covers the truth in most replicates (coverage near 95 percent)', () => {
  let covered = 0;
  const runs = 40;
  for (let s = 1; s <= runs; s++) {
    const trial = randomize(makeCausalData({ n: 400, seed: s, confounding: 1 }), 1000 + s);
    if (naiveDiff(trial).covers) covered++;
  }
  assert.ok(covered >= 34, `${covered} of ${runs} intervals covered the truth`);
});

// The lab refits the propensity model 200 times per run, so ipw() has its own tight loop. It must stay the same
// model as fitLogistic (logistic.js): the same scores to the last digit, for easy and for nearly separable data.
test('ipw propensity scores equal the fitLogistic scores (the fast loop is the same model)', () => {
  for (const [n, confounding, overlap, unmeasured] of [[300, 1.5, 1, 0], [800, 3, 0.1, 0], [150, 0, 1, 1]]) {
    for (const [lr, iters] of [[1, 200], [2, 100]]) {
      const d = makeCausalData({ n, seed: 5, confounding, overlap, unmeasured });
      const X = d.rows.map(r => [r.z]);
      const expected = predictProba(fitLogistic(X, d.rows.map(r => r.t), { lr, iters }), X).map(p => Math.min(0.99, Math.max(0.01, p)));
      const got = ipw(d, ['z'], { lr, iters }).propensity;
      assert.equal(got.length, expected.length);
      got.forEach((p, i) => assert.equal(p, expected[i], `row ${i} (n ${n}, confounding ${confounding}, overlap ${overlap})`));
    }
  }
});
