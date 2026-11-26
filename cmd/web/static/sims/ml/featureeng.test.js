import test from 'node:test';
import assert from 'node:assert/strict';
import {
  interaction, appendColumns, logTransform, binning, quantileEdges, oneHot, frequencyEncode,
  targetEncode, targetEncodeOutOfFold, makeEncodingData, encodingXY, evaluateEncoding,
  logisticFitPredict, cvEvaluator, ablate, forwardAdd,
} from './featureeng.js';
import { kFold } from './validation.js';
import { rng, gauss } from './rng.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const closeAll = (a, b, eps = 1e-9) => {
  assert.equal(a.length, b.length);
  a.forEach((v, i) => close(v, b[i], eps));
};

test('interaction: product of two columns, input untouched', () => {
  const X = [[1, 2, 3], [-2, 4, 0.5], [0, 7, 1]];
  assert.deepEqual(interaction(X, 0, 1), [2, -8, 0]);
  assert.deepEqual(interaction(X, 1, 2), [6, 2, 7]);
  assert.deepEqual(X[0], [1, 2, 3]);
  assert.deepEqual(appendColumns([[1], [2]], [10, 20], [5, 6]), [[1, 10, 5], [2, 20, 6]]);
  assert.throws(() => appendColumns([[1], [2]], [1]), RangeError);
});

test('logTransform: natural log with an optional offset, refuses non-positive input', () => {
  closeAll(logTransform([1, Math.E, Math.E ** 2]), [0, 1, 2]);
  closeAll(logTransform([0, 1, 3], { offset: 1 }), [0, Math.log(2), Math.log(4)]);
  assert.throws(() => logTransform([0]), RangeError);
  assert.throws(() => logTransform([-1, 5], { offset: 1 }), RangeError);
});

test('binning: edges are lower-inclusive, below-first goes to bin 0, above-last to the last bin', () => {
  // edges 10, 20 -> bins (<10) [10,20) (>=20)
  assert.deepEqual(binning([5, 10, 15, 19.99, 20, 99, -3], [10, 20]), [0, 1, 1, 1, 2, 2, 0]);
  assert.deepEqual(binning([1, 2], [5]), [0, 0]);
  assert.throws(() => binning([1], [3, 3]), RangeError);
  assert.throws(() => binning([1], [5, 2]), RangeError);
  assert.throws(() => binning([1], []), RangeError);
});

test('quantileEdges: hand-computed cuts, duplicates collapsed', () => {
  // 0..8 in 3 bins: positions 8/3 and 16/3 -> 2.666.., 5.333..
  closeAll(quantileEdges([8, 0, 1, 2, 3, 4, 5, 6, 7], 3), [8 / 3, 16 / 3]);
  // Median of [1,2,3,4] is 2.5
  closeAll(quantileEdges([1, 2, 3, 4], 2), [2.5]);
  assert.deepEqual(quantileEdges([5, 5, 5, 5], 4), [5]);
  // equal-ish bins on spread data
  const vals = Array.from({ length: 100 }, (_, i) => i * i);
  const counts = [0, 0, 0, 0];
  binning(vals, quantileEdges(vals, 4)).forEach(b => counts[b]++);
  assert.ok(counts.every(c => c >= 24 && c <= 26), counts.join());
});

test('oneHot: vocab order, unseen values become all zeros', () => {
  const r = oneHot(['b', 'a', 'c', 'a']);
  assert.deepEqual(r.vocab, ['a', 'b', 'c']);
  assert.deepEqual(r.rows, [[0, 1, 0], [1, 0, 0], [0, 0, 1], [1, 0, 0]]);
  const fixed = oneHot(['x', 'zzz', 'y'], ['y', 'x']);
  assert.deepEqual(fixed.vocab, ['y', 'x']);
  assert.deepEqual(fixed.rows, [[0, 1], [0, 0], [1, 0]]);
});

test('frequencyEncode: share of training rows; unseen is 0', () => {
  const train = ['a', 'a', 'a', 'b', 'b', 'c'];
  closeAll(frequencyEncode(train), [0.5, 0.5, 0.5, 1 / 3, 1 / 3, 1 / 6]);
  closeAll(frequencyEncode(train, ['c', 'b', 'zzz']), [1 / 6, 1 / 3, 0]);
});

// Six rows: a:[1,1,0], b:[0,0], c:[1]. Prior = mean y = 3/6 = 0.5.
const V = ['a', 'a', 'a', 'b', 'b', 'c'];
const Y = [1, 1, 0, 0, 0, 1];

test('targetEncode: smoothed means of a 6-row example, by hand', () => {
  // smoothing m = 2:  a = (2 + 2*.5)/(3+2) = 0.6   b = (0 + 1)/(2+2) = 0.25   c = (1 + 1)/(1+2) = 2/3
  closeAll(targetEncode(V, Y, V, { smoothing: 2 }), [0.6, 0.6, 0.6, 0.25, 0.25, 2 / 3]);
  // a category not seen in training gets the prior
  closeAll(targetEncode(V, Y, ['b', 'a', 'd'], { smoothing: 2 }), [0.25, 0.6, 0.5]);
  // no smoothing: plain category means (a = 2/3, b = 0, c = 1)
  closeAll(targetEncode(V, Y), [2 / 3, 2 / 3, 2 / 3, 0, 0, 1]);
  // an explicit prior replaces the mean: m = 2, prior 0.8 -> c = (1 + 1.6)/3
  close(targetEncode(V, Y, ['c'], { smoothing: 2, prior: 0.8 })[0], 2.6 / 3);
  // heavy smoothing pulls every category to the prior
  targetEncode(V, Y, ['a', 'b', 'c'], { smoothing: 1e9 }).forEach(v => close(v, 0.5, 1e-6));
  assert.throws(() => targetEncode(V, [1], V), RangeError);
});

test('targetEncodeOutOfFold: each row is encoded without its own fold, by hand', () => {
  const folds = [[0, 3], [1, 4], [2, 5]].map(test => ({
    test, train: [0, 1, 2, 3, 4, 5].filter(i => !test.includes(i)),
  }));
  // fold {0,3}: train rows 1,2,4,5 -> a:[1,0] b:[0] c:[1]   row0 (a) = .5, row3 (b) = 0
  // fold {1,4}: train rows 0,2,3,5 -> a:[1,0] b:[0] c:[1]   row1 (a) = .5, row4 (b) = 0
  // fold {2,5}: train rows 0,1,3,4 -> a:[1,1] b:[0,0]       row2 (a) = 1,  row5 (c) unseen -> prior mean(1,1,0,0) = .5
  closeAll(targetEncodeOutOfFold(V, Y, folds), [0.5, 0.5, 1, 0, 0, 0.5]);
  // with smoothing 2 and the same folds: row0 = (1 + 2*.5)/(2+2) = .5, row2 = (2 + 1)/(2+2) = .75
  const s = targetEncodeOutOfFold(V, Y, folds, { smoothing: 2 });
  close(s[0], 0.5);
  close(s[2], 0.75);
  assert.throws(() => targetEncodeOutOfFold(V, Y, folds.slice(0, 2)), RangeError);
});

test('a row\'s own label never reaches its out-of-fold encoding', () => {
  // flip one label: its own encoding must not change, others' may
  const rows = makeEncodingData({ seed: 4 });
  const { categories, y } = encodingXY(rows);
  const folds = kFold(y.length, 5, 7);
  const base = targetEncodeOutOfFold(categories, y, folds);
  const y2 = y.slice();
  y2[10] = 1 - y2[10];
  const flipped = targetEncodeOutOfFold(categories, y2, folds);
  // row 10's encoding is built from other folds only, and the prior of its own fold's train rows
  // excludes row 10 as well
  close(flipped[10], base[10]);
});

test('an interaction makes XOR-like data separable by a linear model', () => {
  const random = rng(11);
  const n = 400;
  const x1 = [], x2 = [], y = [];
  for (let i = 0; i < n; i++) {
    const a = (random() < 0.5 ? -1 : 1) + 0.25 * gauss(random);
    const b = (random() < 0.5 ? -1 : 1) + 0.25 * gauss(random);
    x1.push(a); x2.push(b); y.push(a * b > 0 ? 1 : 0);
  }
  const X = x1.map((a, i) => [a, x2[i]]);
  const product = interaction(X, 0, 1);
  const evaluate = cvEvaluator({
    columns: { x1, x2, 'x1*x2': product }, y, fitPredict: logisticFitPredict(), k: 5, seed: 3,
  });
  const linear = evaluate(['x1', 'x2']);
  const withProduct = evaluate(['x1', 'x2', 'x1*x2']);
  assert.ok(linear.mean < 0.65, `linear ${linear.mean}`);          // a line cannot split XOR
  assert.ok(withProduct.mean > 0.95, `with product ${withProduct.mean}`);
  assert.ok(withProduct.mean - linear.mean > 0.3);
  assert.equal(withProduct.scores.length, 5);

  // forwardAdd: x1 and x2 alone add nothing real, the product adds a lot
  const fa = forwardAdd(['x1', 'x2', 'x1*x2'], evaluate);
  assert.equal(fa.steps.length, 3);
  assert.deepEqual(fa.steps[2].features, ['x1', 'x2', 'x1*x2']);
  assert.ok(fa.steps[0].gain < 0.2 && !fa.steps[1].beyondNoise);
  assert.ok(fa.steps[2].gain > 0.3 && fa.steps[2].beyondNoise);
  // greedy picks the product first
  assert.equal(forwardAdd(['x1', 'x2', 'x1*x2'], evaluate, { greedy: true }).steps[0].feature, 'x1*x2');

  // ablate: removing the product hurts a lot, removing x1 or x2 barely matters
  const ab = ablate(['x1', 'x2', 'x1*x2'], evaluate);
  const drop = Object.fromEntries(ab.drops.map(d => [d.feature, d]));
  assert.ok(ab.full.mean > 0.95);
  assert.ok(drop['x1*x2'].drop > 0.3 && drop['x1*x2'].beyondNoise);
  assert.ok(Math.abs(drop.x1.drop) < 0.05 && !drop.x1.beyondNoise);
  assert.ok(Math.abs(drop.x2.drop) < 0.05);
  close(drop['x1*x2'].drop, ab.full.mean - drop['x1*x2'].without.mean);
});

test('ablate and forwardAdd: hand-computed with a table evaluator (numbers or {mean, sd})', () => {
  const table = { '': 0.5, a: 0.7, b: 0.55, 'a,b': 0.72, 'b,a': 0.72 };
  const evaluate = names => ({ mean: table[names.join(',')], sd: 0.05 });
  const ab = ablate(['a', 'b'], evaluate);
  close(ab.full.mean, 0.72);
  assert.deepEqual(ab.drops.map(d => d.feature), ['a', 'b']);
  close(ab.drops[0].drop, 0.72 - 0.55);       // without a = just b
  close(ab.drops[1].drop, 0.72 - 0.7);        // without b = just a
  assert.deepEqual(ab.drops.map(d => d.beyondNoise), [true, false]); // .17 > .05, .02 < .05

  const fa = forwardAdd(['a', 'b'], evaluate);
  close(fa.baseline.mean, 0.5);
  close(fa.steps[0].gain, 0.2);
  close(fa.steps[1].gain, 0.02);
  assert.deepEqual(fa.steps.map(s => s.beyondNoise), [true, false]);
  assert.deepEqual(fa.steps[1].features, ['a', 'b']);

  // plain numbers are accepted, sd reads as 0
  const plain = forwardAdd(['a'], names => table[names.join(',')]);
  assert.equal(plain.steps[0].sd, 0);
  assert.equal(plain.steps[0].beyondNoise, true);
});

test('cvEvaluator: fixed folds across subsets, empty set predicts the majority class, bad names refused', () => {
  const y = [1, 1, 1, 1, 1, 1, 0, 0, 0, 0];
  const f = Array.from({ length: 10 }, (_, i) => i);
  const evaluate = cvEvaluator({ columns: { f }, y, k: 5, seed: 2 });
  const base = evaluate([]);
  assert.equal(base.scores.length, 5);
  // always guessing 1 scores about .6 (each test fold holds 2 rows)
  assert.ok(base.mean >= 0.5 && base.mean <= 0.7, String(base.mean));
  assert.deepEqual(evaluate(['f']).scores, evaluate(['f']).scores);   // deterministic
  assert.throws(() => evaluate(['nope']), RangeError);
  assert.throws(() => cvEvaluator({ columns: { f: [1] }, y }), RangeError);
});

test('naive target encoding leaks; out-of-fold does not (fixed seeds, with margins)', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const { X, y } = encodingXY(makeEncodingData({ seed }));
    const naive = evaluateEncoding({ X, y, mode: 'naive', seed });
    const oof = evaluateEncoding({ X, y, mode: 'outOfFold', seed });
    const none = evaluateEncoding({ X, y, mode: 'none', seed });
    // naive looks great on the rows it was fitted on ...
    assert.ok(naive.trainScore > 0.78, `seed ${seed} naive train ${naive.trainScore}`);
    // ... and falls apart on new rows
    assert.ok(naive.gap > 0.15, `seed ${seed} naive gap ${naive.gap}`);
    assert.ok(naive.testScore < 0.66, `seed ${seed} naive test ${naive.testScore}`);
    // out-of-fold: the training score is an honest preview of the held-out score
    assert.ok(Math.abs(oof.gap) < 0.05, `seed ${seed} oof gap ${oof.gap}`);
    // and the honest encoding beats the leaky one on held-out rows
    assert.ok(oof.testScore - naive.testScore > 0.03, `seed ${seed} oof ${oof.testScore} naive ${naive.testScore}`);
    // dropping the category entirely is no worse than the leaky encoding
    assert.ok(none.testScore >= naive.testScore, `seed ${seed} none ${none.testScore} naive ${naive.testScore}`);
    assert.equal(oof.folds, 5);
  }
});

test('with no real category signal, the naive model still "learns" it in-sample', () => {
  const { X, y } = encodingXY(makeEncodingData({ signal: 0, seed: 9 }));
  const naive = evaluateEncoding({ X, y, mode: 'naive', seed: 9 });
  const none = evaluateEncoding({ X, y, mode: 'none', seed: 9 });
  assert.ok(naive.gap > 0.12, String(naive.gap));
  assert.ok(naive.trainScore > none.trainScore + 0.1);
  assert.ok(naive.testScore <= none.testScore + 0.01);
});

test('smoothing alone does not cure the leak; out-of-fold stays honest at any smoothing', () => {
  for (const seed of [2, 3]) {
    const { X, y } = encodingXY(makeEncodingData({ seed }));
    for (const smoothing of [0, 3, 30]) {
      const naive = evaluateEncoding({ X, y, mode: 'naive', seed, smoothing });
      const oof = evaluateEncoding({ X, y, mode: 'outOfFold', seed, smoothing });
      assert.ok(naive.gap > 0.15, `seed ${seed} smoothing ${smoothing} naive gap ${naive.gap}`);
      assert.ok(Math.abs(oof.gap) < 0.06, `seed ${seed} smoothing ${smoothing} oof gap ${oof.gap}`);
    }
  }
});

test('makeEncodingData: shape, determinism and high cardinality', () => {
  const a = makeEncodingData({ seed: 3 });
  assert.deepEqual(a, makeEncodingData({ seed: 3 }));
  assert.notDeepEqual(a, makeEncodingData({ seed: 4 }));
  assert.equal(a.length, 400);
  assert.ok(a.every(r => /^c\d{3}$/.test(r.category) && (r.y === 0 || r.y === 1) && Number.isFinite(r.x)));
  const distinct = new Set(a.map(r => r.category)).size;
  assert.ok(distinct > 120 && distinct <= 200, String(distinct));       // most categories show up, only a few times
  const small = makeEncodingData({ rows: 30, categories: 4, seed: 1 });
  assert.equal(small.length, 30);
  assert.ok(new Set(small.map(r => r.category)).size <= 4);
  // x carries honest signal: its class means are apart
  const m = c => { const v = a.filter(r => r.y === c).map(r => r.x); return v.reduce((s, t) => s + t, 0) / v.length; };
  assert.ok(m(1) - m(0) > 0.5);
  assert.throws(() => evaluateEncoding({ X: [[1]], y: [1], mode: 'bogus' }), RangeError);
});
