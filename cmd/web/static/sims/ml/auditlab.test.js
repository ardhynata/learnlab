import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pearson, correlatedCopy, makeLabData, prepareRealData, splitData, buildAudit, splitVerdict, predictAt, thresholdForPositiveRate,
  thresholdForRecall, matchGroups, auditSummary, scoreHistogram, waterfallSteps, GROUP_ORDER,
} from './auditlab.js';
import { parseCsv } from './tabular.js';
import { rng, gauss } from './rng.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} is not within ${eps} of ${b}`);

test('pearson: perfect, inverse and constant columns', () => {
  close(pearson([1, 2, 3], [2, 4, 6]), 1);
  close(pearson([1, 2, 3], [3, 2, 1]), -1);
  assert.equal(pearson([1, 1, 1], [1, 2, 3]), 0);
});

test('correlatedCopy gives exactly the asked correlation, keeps mean and spread, and is smooth in rho', () => {
  const random = rng(5);
  const v = Array.from({ length: 300 }, () => 10 + 3 * gauss(random)), noise = Array.from({ length: 300 }, () => gauss(random));
  for (const rho of [0, 0.3, 0.9, 0.99]) {
    const c = correlatedCopy(v, rho, noise);
    close(pearson(v, c), rho, 1e-9);
    close(c.reduce((s, x) => s + x, 0) / c.length, v.reduce((s, x) => s + x, 0) / v.length, 1e-9);
  }
  assert.deepEqual(correlatedCopy(v, 1, noise).map(x => Math.round(x * 1e6)), v.map(x => Math.round(x * 1e6)), 'rho 1 is the column itself');
  assert.throws(() => correlatedCopy(v, 1.2, noise), RangeError);
  assert.deepEqual(correlatedCopy([4, 4, 4], 0.5, [1, 2, 3]), [4, 4, 4], 'a constant column has nothing to copy');
});

test('makeLabData: reproducible, two groups with different base rates, copy at the chosen correlation, rows fixed across rho', () => {
  const a = makeLabData({ n: 4000, seed: 3, correlation: 0.2 }), b = makeLabData({ n: 4000, seed: 3, correlation: 0.9 });
  assert.deepEqual(makeLabData({ n: 50, seed: 3 }), makeLabData({ n: 50, seed: 3 }));
  assert.deepEqual(a.y, b.y, 'moving the correlation never changes the outcomes');
  assert.deepEqual(a.group, b.group);
  assert.deepEqual(a.X.map(r => r[0]), b.X.map(r => r[0]));
  close(pearson(a.X.map(r => r[0]), a.X.map(r => r[1])), 0.2, 1e-9);
  close(pearson(b.X.map(r => r[0]), b.X.map(r => r[1])), 0.9, 1e-9);
  const rate = g => { const ys = a.y.filter((_, i) => a.group[i] === g); return ys.reduce((s, v) => s + v, 0) / ys.length; };
  assert.ok(rate('A') > 0.55 && rate('A') < 0.67, `A base rate ${rate('A')}`);
  assert.ok(rate('B') > 0.30 && rate('B') < 0.42, `B base rate ${rate('B')}`);
  assert.ok(Math.abs(a.group.filter(g => g === 'B').length / 4000 - 0.3) < 0.03);
  assert.deepEqual(a.features, ['signal', 'signalCopy', 'independent', 'noise']);
});

test('prepareRealData drops rows with NA, counts them, thresholds at the median and builds the flipper copy', () => {
  const table = parseCsv([
    'species,island,bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,sex,year',
    'Adelie,T,39,18,181,3000,male,2007',
    'Adelie,T,40,17,185,3200,female,2007',
    'Adelie,T,NA,NA,NA,NA,NA,2007',
    'Gentoo,B,46,13,211,5000,female,2007',
    'Gentoo,B,47,14,215,5200,NA,2007',
    'Gentoo,B,48,15,217,5400,male,2007',
    'Chinstrap,D,49,18,200,4000,male,2007',
  ].join('\n'));
  const d = prepareRealData(table, { group: 'species', correlation: 0.5, seed: 2 });
  assert.equal(d.total, 7);
  assert.equal(d.dropped, 2);
  assert.equal(d.y.length, 5);
  assert.equal(d.threshold, 4000, 'median of 3000, 3200, 4000, 5000, 5400');
  assert.deepEqual(d.y, [0, 0, 1, 1, 0], 'heavier than the median; the median itself is not heavier');
  assert.deepEqual(d.groups, ['Adelie', 'Chinstrap', 'Gentoo']);
  close(pearson(d.X.map(r => r[0]), d.X.map(r => r[1])), 0.5, 1e-9);
  assert.deepEqual(d.X.map(r => r[2]), [39, 40, 46, 48, 49]);
  assert.throws(() => prepareRealData(table, { group: 'island' }), RangeError);
});

test('splitData is stratified, reproducible and shuffled; buildAudit audits held-out rows with a sensible model', () => {
  const d = makeLabData({ n: 800, seed: 4 });
  const s = splitData(d, 4);
  assert.equal(s.train.y.length + s.test.y.length, 800);
  assert.deepEqual(splitData(d, 4).test.index, s.test.index);
  assert.equal(new Set([...s.train.index, ...s.test.index]).size, 800, 'no row is in both halves');
  const share = (part, g) => part.group.filter(x => x === g).length / part.group.length;
  assert.ok(Math.abs(share(s.train, 'B') - share(s.test, 'B')) < 0.02);
  const a = buildAudit(d, 4);
  assert.ok(a.importance.baseline > 0.7, `accuracy ${a.importance.baseline}`);
  assert.equal(a.importance.results.length, 5);
  assert.deepEqual(a.importance.results[4].columns, [0, 1]);
  assert.equal(a.scores.length, a.test.y.length);
  const sh = a.shap(0);
  assert.ok(sh.efficient);
  close(sh.baselineValue + sh.sum, sh.fx, 1e-9);
});

test('a near-duplicate splits the importance and the pair keeps its worth (what the correlation slider shows)', () => {
  for (const seed of [1, 2, 3]) {
    const lo = buildAudit(makeLabData({ seed, correlation: 0.2 }), seed).importance;
    const hi = buildAudit(makeLabData({ seed, correlation: 0.95 }), seed).importance;
    const v = splitVerdict(lo, hi);
    assert.equal(v.key, 'split', `seed ${seed}: ${JSON.stringify(v)}`);
    assert.ok(v.dFirst < -0.05 && v.dCopy > 0.02);
    assert.ok(Math.abs(hi.results[4].mean - lo.results[4].mean) < 0.05, 'the pair together is worth about the same');
    assert.ok(lo.results[1].mean < 0.02, 'a copy the outcome never depends on starts near zero');
  }
});

test('splitVerdict classifies by the movement of the first bar and the copy', () => {
  const imp = (a, b) => ({ results: [{ mean: a }, { mean: b }] });
  assert.equal(splitVerdict(imp(0.25, 0), imp(0.1, 0.08)).key, 'split');
  assert.equal(splitVerdict(imp(0.25, 0), imp(0.1, 0)).key, 'split', 'the first falls, the copy holds');
  assert.equal(splitVerdict(imp(0.1, 0.1), imp(0.105, 0.09)).key, 'same');
  assert.equal(splitVerdict(imp(0.1, 0.1), imp(0.2, 0.2)).key, 'up');
  assert.equal(splitVerdict(imp(0.2, 0.2), imp(0.1, 0.1)).key, 'down');
});

test('predictAt: a number or one threshold per group, a score at the threshold is positive', () => {
  assert.deepEqual(predictAt([0.2, 0.5, 0.8], ['A', 'A', 'B'], 0.5), [0, 1, 1]);
  assert.deepEqual(predictAt([0.2, 0.5, 0.8], ['A', 'A', 'B'], { A: 0.1, B: 0.9 }), [1, 1, 0]);
});

test('thresholds that hit a target positive rate or recall (hand-computed)', () => {
  // two of four scores positive: halfway between the second (0.6) and third (0.4) highest
  close(thresholdForPositiveRate([0.1, 0.4, 0.6, 0.9], 0.5), 0.5);
  assert.ok(thresholdForPositiveRate([0.1, 0.4], 0) > 0.4, 'rate 0 predicts nobody');
  assert.ok(thresholdForPositiveRate([0.1, 0.4], 1) < 0.1, 'rate 1 predicts everybody');
  // positives score 0.9, 0.8, 0.3: recall 2/3 means catching the top two, so between 0.8 and 0.3
  close(thresholdForRecall([0.9, 0.8, 0.3, 0.2], [1, 1, 1, 0], 2 / 3), 0.55);
  assert.equal(thresholdForRecall([0.9, 0.2], [0, 0], 0.5), 0.5, 'no positives: leave the threshold alone');
});

test('matchGroups moves the other groups to the first group\'s positive rate or recall', () => {
  const scores = [0.9, 0.8, 0.7, 0.2, 0.6, 0.4, 0.3, 0.2];
  const groups = ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B'];
  const y = [1, 1, 0, 0, 1, 1, 0, 0];
  const rate = matchGroups('rate', scores, y, groups, ['A', 'B'], 0.5);
  assert.equal(rate.A, 0.5);
  close(rate.B, 0.25, 1e-12);   // A predicts 3 of 4 positive; B needs its top three: between 0.3 and 0.2
  const recall = matchGroups('recall', scores, y, groups, ['A', 'B'], 0.5);
  // A catches 2 of 2 positives (recall 1), so B must catch both of its positives (0.6 and 0.4): just below 0.4
  close(recall.B, 0.4, 1e-5);
  assert.ok(recall.B < 0.4);
  assert.throws(() => matchGroups('nope', scores, y, groups, ['A', 'B'], 0.5), RangeError);
});

test('auditSummary: rows in the asked order with metrics and gaps, hand-computed', () => {
  const y = [1, 1, 0, 0, 1, 0, 0, 0];
  const scores = [0.9, 0.2, 0.7, 0.1, 0.8, 0.6, 0.3, 0.2];
  const groups = ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B'];
  const s = auditSummary(y, scores, groups, ['B', 'A'], 0.5);
  assert.deepEqual(s.rows.map(r => r.group), ['B', 'A']);
  // A: predictions 1,0,1,0 vs 1,1,0,0 -> tp1 fn1 fp1 tn1.  B: predictions 1,1,0,0 vs 1,0,0,0 -> tp1 fp1 tn2.
  const [B, A] = s.rows;
  close(A.accuracy, 0.5); close(A.recall, 0.5); close(A.positiveRate, 0.5);
  close(B.accuracy, 0.75); close(B.recall, 1); close(B.fpr, 1 / 3);
  close(s.gaps.recall.gap, 0.5); close(s.accuracy, 0.625);
  const per = auditSummary(y, scores, groups, ['A', 'B'], { A: 0.15, B: 0.5 });
  assert.equal(per.rows[0].predictedPositives, 3);
});

test('scoreHistogram gives each group shares that sum to one', () => {
  const h = scoreHistogram([0.05, 0.05, 0.95, 0.5, 1], ['A', 'A', 'A', 'B', 'B'], ['A', 'B'], 10);
  close(h.shares.A.reduce((s, v) => s + v, 0), 1); close(h.shares.B.reduce((s, v) => s + v, 0), 1);
  close(h.shares.A[0], 2 / 3); close(h.shares.B[9], 0.5, 1e-12);
});

test('waterfallSteps sorts by size and chains from the baseline to the prediction', () => {
  const steps = waterfallSteps({ values: [0.1, -0.3, 0.05], baselineValue: 0.5, features: [0, 1, 2] });
  assert.deepEqual(steps.map(s => s.index), [1, 0, 2]);
  close(steps[0].start, 0.5); close(steps[0].end, 0.2); close(steps[1].end, 0.3); close(steps[2].end, 0.35);
});

test('group orders cover the lab modes', () => {
  assert.deepEqual(Object.keys(GROUP_ORDER).sort(), ['generated', 'sex', 'species']);
});
