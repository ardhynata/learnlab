import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULTS, ESTIMATOR_IDS, REPEATS, scramble, dataParams, computeStudy, fitLines, predictVerdict, runStudy, repeatSeed,
  summarizeRepeats, isBiased, powerCurve, peekingCurve, IPW_SINGLE, IPW_REPEAT,
} from './causallab.js';
import { makeCausalData, ipw, powerTwoSample, peekingFalsePositiveRate } from './causal.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const row = (study, id) => study.rows.find(r => r.id === id);

test('the controls become the generator options: the toggle is a strength of 1, the seed is scrambled', () => {
  const p = dataParams({ ...DEFAULTS, unmeasured: true, collider: true });
  assert.equal(p.unmeasured, 1);
  assert.equal(p.collider, true);
  assert.equal(dataParams(DEFAULTS).unmeasured, 0);
  assert.equal(p.seed, scramble(DEFAULTS.seed));
  assert.notEqual(scramble(1), scramble(2));
  assert.ok(Math.abs(scramble(1) - scramble(2)) > 1e6, 'neighbouring seeds are far apart');
});

test('the default study: six rows in table order, the naive difference is far off and the randomized experiment is not', () => {
  const s = computeStudy(DEFAULTS, 1);
  assert.deepEqual(s.rows.map(r => r.id), ESTIMATOR_IDS);
  assert.equal(s.ate, s.data.ate);
  const naive = row(s, 'naive'), rct = row(s, 'randomized');
  assert.ok(naive.error > 1, `naive error ${naive.error}`);
  assert.equal(naive.covers, false);
  assert.ok(Math.abs(rct.error) < 0.6 && rct.covers, `randomized error ${rct.error}`);
  assert.equal(row(s, 'collider').available, false, 'no collider column without the toggle');
  assert.equal(row(s, 'collider').reason, 'off');
  assert.deepEqual(s, computeStudy(DEFAULTS, 1), 'seeded: the same every time');
});

test('the randomized replica keeps the same people and breaks the link to the confounder', () => {
  const s = computeStudy(DEFAULTS, 1);
  assert.deepEqual(s.rct.rows.map(r => r.z), s.data.rows.map(r => r.z));
  assert.equal(s.rct.ate, s.data.ate);
  assert.notDeepEqual(computeStudy(DEFAULTS, 2).rct.rows.map(r => r.t), s.rct.rows.map(r => r.t), 'a new coin flip');
});

test('the collider row appears with the toggle, and adjusting for it is badly off', () => {
  const s = computeStudy({ ...DEFAULTS, collider: true, confounding: 0 }, 1);
  const bad = row(s, 'collider');
  assert.ok(bad.available);
  assert.ok(Math.abs(bad.error) > 0.5, `collider adjustment error ${bad.error}`);
  assert.ok(Math.abs(row(s, 'naive').error) < 0.6, 'with no confounding the naive difference is fine');
});

test('an unmeasured confounder leaves bias in every estimator that adjusts only for z', () => {
  const s = computeStudy({ ...DEFAULTS, n: 2000, unmeasured: true, confounding: 0.5 }, 1);
  for (const id of ['stratified', 'regression', 'ipw']) assert.ok(row(s, id).error > 0.4, `${id} ${row(s, id).error}`);
  assert.ok(Math.abs(row(s, 'randomized').error) < 0.4);
});

test('fitLines on noiseless, unconfounded data recovers the generating lines exactly (hand computed: 1 + 2 z, plus 2 for the treated)', () => {
  const data = makeCausalData({ n: 300, seed: 3, confounding: 0, effect: 2, noise: 0 });
  const f = fitLines(data);
  close(f.adjusted.a, 1, 1e-8); close(f.adjusted.b, 2, 1e-8); close(f.adjusted.effect, 2, 1e-8);
  assert.deepEqual(f.truth, { control: { a: 1, b: 2 }, treated: { a: 3, b: 2 } });
  const treated = data.rows.filter(r => r.t), control = data.rows.filter(r => !r.t);
  close(f.naive.treated, treated.reduce((s, r) => s + r.y, 0) / treated.length);
  close(f.naive.control, control.reduce((s, r) => s + r.y, 0) / control.length);
});

test('fitLines carries the heterogeneity in the slope of the true treated line', () => {
  assert.deepEqual(fitLines(makeCausalData({ n: 50, seed: 1, effect: 1, heterogeneity: 0.5 })).truth.treated, { a: 2, b: 2.5 });
});

test('predictVerdict: the smaller error wins, a gap inside the noise is "same"', () => {
  assert.equal(predictVerdict({ naiveError: 2.1, naiveSe: 0.2, rctError: 0.1, rctSe: 0.2 }), 'rct');
  assert.equal(predictVerdict({ naiveError: 0.1, naiveSe: 0.2, rctError: -0.9, rctSe: 0.2 }), 'naive');
  assert.equal(predictVerdict({ naiveError: 0.1, naiveSe: 0.2, rctError: -0.2, rctSe: 0.3 }), 'same');
  assert.equal(predictVerdict({ naiveError: -2, naiveSe: 0.2, rctError: 0.3, rctSe: 0.2 }), 'rct', 'sign does not matter');
});

test('isBiased: three standard errors and a floor of 0.1', () => {
  assert.equal(isBiased(0.5, 0.1), true);
  assert.equal(isBiased(0.25, 0.1), false);
  assert.equal(isBiased(-0.5, 0.1), true);
  assert.equal(isBiased(0.08, 0), false, 'tiny but certain is still not worth flagging');
  assert.equal(isBiased(0.12, 0), true);
});

test('summarizeRepeats: mean, bias, spread and the standard error of the mean by hand', () => {
  const runs = [1, 3].map(x => ({ estimates: { naive: x }, covers: { naive: x === 3 } }));
  const s = summarizeRepeats(runs, 2).find(r => r.id === 'naive');
  assert.equal(s.count, 2);
  close(s.mean, 2); close(s.bias, 0); close(s.sd, Math.SQRT2); close(s.mcse, 1); close(s.rmse, 1); close(s.coverage, 0.5);
  assert.equal(s.biased, false);
  const off = summarizeRepeats([5, 5, 5, 5].map(x => ({ estimates: { naive: x }, covers: { naive: false } })), 2).find(r => r.id === 'naive');
  close(off.bias, 3); close(off.sd, 0); assert.equal(off.biased, true);
  assert.equal(summarizeRepeats(runs, 2).find(r => r.id === 'collider').count, 0, 'an estimator that never ran has no summary');
});

test('repeated studies are seeded and differ from each other; neighbours are far apart', () => {
  assert.deepEqual(runStudy(DEFAULTS, 0), runStudy(DEFAULTS, 0));
  assert.notEqual(runStudy(DEFAULTS, 0).estimates.naive, runStudy(DEFAULTS, 1).estimates.naive);
  assert.notEqual(repeatSeed(7, 0), repeatSeed(7, 1));
  assert.equal(REPEATS, 200);
});

test('forty repeated studies show bias and noise apart: naive is biased, randomized is not, and adjusting for z removes the bias', () => {
  const runs = Array.from({ length: 40 }, (_, i) => runStudy({ ...DEFAULTS, n: 300 }, i));
  const by = Object.fromEntries(summarizeRepeats(runs, DEFAULTS.effect).map(r => [r.id, r]));
  assert.ok(by.naive.biased && by.naive.bias > 1.5, `naive bias ${by.naive.bias}`);
  assert.ok(!by.randomized.biased, `randomized bias ${by.randomized.bias}`);
  assert.ok(!by.regression.biased, `regression bias ${by.regression.bias}`);
  assert.ok(by.randomized.sd > by.regression.sd, 'randomizing is unbiased but noisier than adjusting for z');
  assert.ok(by.naive.coverage < 0.2 && by.randomized.coverage > 0.85);
  assert.equal(by.collider.count, 0);
});

test('the fast inverse-propensity fit used for repeated runs matches the careful one on the same people', () => {
  for (const extra of [{}, { confounding: 3, overlap: 0.3, unmeasured: true }]) {
    const data = makeCausalData(dataParams({ ...DEFAULTS, n: 400, ...extra }));
    close(ipw(data, ['z'], IPW_REPEAT).estimate, ipw(data, ['z'], IPW_SINGLE).estimate, 0.02);
  }
});

test('powerCurve: 0.5 sd at 63 per group is the textbook 80 percent; 50 per group is 70.5 percent (by hand)', () => {
  const c = powerCurve({ effect: 0.5, sd: 1, alpha: 0.05, n: 50 });
  assert.equal(c.nFor80, 63);
  close(c.power, powerTwoSample({ effect: 0.5, sd: 1, n: 50, alpha: 0.05 }));
  assert.ok(Math.abs(c.power - 0.7054) < 0.001, `power ${c.power}`);
  assert.equal(c.xs.length, c.ys.length);
  assert.ok(c.ys.every((y, i) => i === 0 || y >= c.ys[i - 1] - 1e-12), 'power never falls as the groups grow');
  assert.ok(c.xMax >= 100 && c.xMax <= 1000);
  close(c.mde, 2.8016 * Math.sqrt(2 / 50), 5e-3);
});

test('powerCurve: a small effect needs more people than the chart can show, and the chart stops at 1000', () => {
  const c = powerCurve({ effect: 0.1, sd: 3, alpha: 0.01, n: 500 });
  assert.equal(c.xMax, 1000);
  assert.ok(c.nFor80 > 1000);
});

test('peekingCurve gives exactly the rate of causal.js for the same seed, and one look is the plain alpha', () => {
  const args = { n: 60, alpha: 0.05, runs: 400, seed: 3 };
  const curve = peekingCurve({ ...args, maxLooks: 6 });
  assert.deepEqual(curve.looks, [1, 2, 3, 4, 5, 6]);
  for (const k of [1, 3, 6]) close(curve.peek[k - 1], peekingFalsePositiveRate({ ...args, looks: k }).rate);
  for (const k of [1, 4]) close(curve.bonferroni[k - 1], peekingFalsePositiveRate({ ...args, looks: k, correction: 'bonferroni' }).rate);
});

test('peeking raises false positives well above alpha, and the Bonferroni correction brings them back', () => {
  const c = peekingCurve({ n: 200, alpha: 0.05, maxLooks: 10, runs: 1500, seed: 5 });
  assert.ok(c.peek[0] < 0.08 && c.peek[0] > 0.03, `one look ${c.peek[0]}`);
  assert.ok(c.peek[9] > 0.12, `ten looks ${c.peek[9]}`);
  assert.ok(c.peek[9] > c.peek[4] && c.peek[4] > c.peek[0]);
  assert.ok(c.bonferroni.every(r => r < 0.075), 'corrected looks stay near alpha');
});

test('peekingCurve cannot look more often than there are people', () => {
  assert.deepEqual(peekingCurve({ n: 3, maxLooks: 10, runs: 50 }).looks, [1, 2, 3]);
});
