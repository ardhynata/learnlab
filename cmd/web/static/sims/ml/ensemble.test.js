import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bagging, randomForest, ensembleFromTrees, gradientBoost, earlyStopping, fitRegressionTree,
  predictRegression, growForestTree, logLoss, sigmoid,
} from './ensemble.js';
import { fitTree } from './tree.js';
import { rng } from './rng.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

// A hand-made one-split tree in the tree.js node shape. counts are [#0, #1] per side.
const stump = (feature, threshold, leftCounts, rightCounts) => {
  const leaf = (counts, depth) => ({ leaf: true, depth, n: counts[0] + counts[1], counts, impurity: 0, label: counts[1] > counts[0] ? 1 : 0 });
  const n = leftCounts[0] + leftCounts[1] + rightCounts[0] + rightCounts[1];
  return {
    leaf: false, depth: 0, n, counts: [leftCounts[0] + rightCounts[0], leftCounts[1] + rightCounts[1]], impurity: 0.5, label: 0,
    feature, threshold, gain: 0, left: leaf(leftCounts, 1), right: leaf(rightCounts, 1), classes: [0, 1], criterion: 'gini',
  };
};

// Two noisy classes split by the line x0 + x1 = 0; `flip` is the share of labels turned over.
function noisy(n, seed, flip = 0.2) {
  const r = rng(seed), X = [], y = [];
  for (let i = 0; i < n; i++) {
    const a = r() * 4 - 2, b = r() * 4 - 2;
    let label = a + b > 0 ? 1 : 0;
    if (r() < flip) label = 1 - label;
    X.push([a, b]);
    y.push(label);
  }
  return { X, y };
}

test('logLoss and sigmoid: hand values', () => {
  close(sigmoid(0), 0.5);
  close(sigmoid(Math.log(3)), 0.75);
  close(logLoss([1, 0], [0.5, 0.5]), Math.log(2));
  close(logLoss([1], [0.8]), -Math.log(0.8));
  assert.ok(Number.isFinite(logLoss([1], [0])), 'a certain wrong answer is clipped, not infinite');
});

test('gradientBoost, first round on 4 points: initial log-odds, residuals, Newton leaf values', () => {
  // y = [0,0,0,1]: base rate 1/4, F0 = ln(1/3), every p = 0.25.
  const X = [[1], [2], [3], [4]], y = [0, 0, 0, 1];
  const m = gradientBoost({ X, y, trees: 1, learningRate: 0.5, maxDepth: 1 });
  close(m.initial, Math.log(1 / 3));
  const { tree, residuals } = m.stages[0];
  [-0.25, -0.25, -0.25, 0.75].forEach((r, i) => close(residuals[i], r));
  // The squared-error split that isolates the 1 is x <= 3.5 (gain 0.75).
  assert.equal(tree.feature, 0);
  assert.equal(tree.threshold, 3.5);
  close(tree.gain, 0.75);
  // Newton leaf = sum(r) / sum(p(1-p)): left -0.75 / (3 * 0.1875) = -4/3, right 0.75 / 0.1875 = 4.
  close(tree.left.value, -4 / 3);
  close(tree.right.value, 4);
  assert.equal(tree.left.n, 3);
  close(tree.left.mean, -0.25);
  // After the update F = F0 + 0.5 * value.
  close(m.predictRaw([2]), Math.log(1 / 3) - 2 / 3);
  close(m.predictRaw([4]), Math.log(1 / 3) + 2);
  close(m.predictProba([4]), sigmoid(Math.log(1 / 3) + 2));
  assert.equal(m.predict([4]), 1);
  assert.equal(m.predict([1]), 0);
});

test('gradientBoost, leaf "mean" uses the plain residual average; round 2 uses the updated probabilities', () => {
  const X = [[1], [2], [3], [4]], y = [0, 0, 0, 1];
  const m = gradientBoost({ X, y, trees: 2, learningRate: 0.5, maxDepth: 1, leaf: 'mean' });
  close(m.stages[0].tree.left.value, -0.25);
  close(m.stages[0].tree.right.value, 0.75);
  const F1 = [0, 1, 2].map(() => Math.log(1 / 3) + 0.5 * -0.25).concat([Math.log(1 / 3) + 0.5 * 0.75]);
  const r2 = [0, 0, 0, 1].map((v, i) => v - sigmoid(F1[i]));
  r2.forEach((r, i) => close(m.stages[1].residuals[i], r));
  close(m.predictRaw([1], 1), F1[0]);
  close(m.predictRaw([1], 0), m.initial);
});

test('gradientBoost: a base rate of 0 or 1 stays finite', () => {
  const m = gradientBoost({ X: [[1], [2]], y: [1, 1], trees: 3 });
  assert.ok(Number.isFinite(m.initial) && m.initial > 0);
  assert.ok(m.predictProba([1]) > 0.99);
});

test('fitRegressionTree: minLeaf, maxDepth, ties and a constant target', () => {
  const X = [[1], [2], [3], [4], [5], [6]], r = [1, 1, 1, 5, 5, 5];
  const t = fitRegressionTree(X, r, { maxDepth: 3 });
  assert.equal(t.threshold, 3.5);
  assert.ok(t.left.leaf && t.right.leaf, 'both sides are constant, so no further split has gain');
  close(predictRegression(t, [2]), 1);
  close(predictRegression(t, [6]), 5);
  assert.equal(fitRegressionTree(X, r, { maxDepth: 0 }).leaf, true);
  close(fitRegressionTree(X, r, { maxDepth: 0 }).value, 3);
  assert.equal(fitRegressionTree(X, r, { maxDepth: 3, minLeaf: 4 }).leaf, true, 'no split leaves 4 rows on each side');
  assert.equal(fitRegressionTree(X, [2, 2, 2, 2, 2, 2]).leaf, true);
  // Two equally good features: the lower index wins.
  const tie = fitRegressionTree([[1, 1], [2, 2], [3, 3], [4, 4]], [0, 0, 1, 1], { maxDepth: 1 });
  assert.equal(tie.feature, 0);
  // rows restricts the fit.
  const part = fitRegressionTree(X, r, { maxDepth: 1, rows: [0, 1, 3, 4] });
  assert.equal(part.n, 4);
  assert.equal(part.threshold, 3, 'midpoint of 2 and 4, the rows 3 and 6 are not used');
});

test('bagged vote of 3 hand-made trees', () => {
  const trees = [
    stump(0, 2, [4, 0], [0, 4]),   // x0 <= 2 -> 0, else 1
    stump(1, 5, [3, 1], [0, 4]),   // x1 <= 5 -> P(1) = 0.25, else 1
    stump(0, 4, [4, 0], [1, 3]),   // x0 <= 4 -> 0, else P(1) = 0.75
  ];
  const m = ensembleFromTrees(trees);
  assert.equal(m.nTrees, 3);
  // x = [3, 7]: tree 1 right (1), tree 2 right (1), tree 3 left (0).
  close(m.votes([3, 7]), 2 / 3);
  close(m.predictProba([3, 7]), (1 + 1 + 0) / 3);
  assert.equal(m.predict([3, 7]), 1);
  // x = [1, 2]: tree 1 left (0), tree 2 left (0.25), tree 3 left (0).
  close(m.votes([1, 2]), 0);
  close(m.predictProba([1, 2]), 0.25 / 3);
  assert.equal(m.predict([1, 2]), 0);
  // x = [5, 2]: tree 1 right (1), tree 2 left (0.25), tree 3 right (0.75): soft mean 2/3, hard vote 2/3.
  close(m.predictProba([5, 2]), (1 + 0.25 + 0.75) / 3);
  close(m.votes([5, 2]), 2 / 3);
  // Only the first two trees: x = [3, 2] -> 1 and 0.25.
  close(m.predictProba([3, 2], 2), (1 + 0.25) / 2);
  close(m.predictProba([3, 2], 1), 1);
  assert.deepEqual(m.predictAll([[3, 7], [1, 2]]), [1, 0]);
  const staged = m.stagedValidation([[3, 7], [1, 2]], [1, 0]);
  assert.deepEqual(staged.accuracy, [1, 1, 1]);
  close(staged.logLoss[2], (-Math.log(2 / 3) - Math.log(1 - 0.25 / 3)) / 2);
  assert.throws(() => ensembleFromTrees([]), /at least one tree/);
});

test('oobError on a tiny set with explicit bootstraps, by hand', () => {
  const X = [[0], [1], [2], [3]], y = [0, 0, 1, 1];
  const bootstraps = [[0, 0, 1, 3], [1, 2, 2, 3], [0, 1, 2, 2]];
  const m = bagging({ X, y, bootstraps, maxDepth: 1 });
  assert.equal(m.nTrees, 3);
  // Tree 1 (rows 0,0,1,3): split at 2 -> left 0, right 1. Tree 2 (rows 1,2,2,3): split at 1.5.
  // Tree 3 (rows 0,1,2,2): split at 1.5. Row 1 is in every bag, so it has no out-of-bag vote.
  assert.equal(m.trees[0].threshold, 2);
  assert.equal(m.trees[1].threshold, 1.5);
  assert.equal(m.trees[2].threshold, 1.5);
  assert.deepEqual(m.oobProba, [0, null, 0, 1]);   // row 0 by tree 2, row 2 by tree 1, row 3 by tree 3
  close(m.oobCoverage, 3 / 4);
  close(m.oobError, 1 / 3);                         // only row 2 (true label 1) is wrong
  // Add a fourth tree trained on rows 0,0,1,1 (all label 0, a lone leaf): rows 2 and 3 are out of its bag.
  const m4 = bagging({ X, y, bootstraps: [...bootstraps, [0, 0, 1, 1]], maxDepth: 1 });
  assert.deepEqual(m4.oobProba, [0, null, 0, 0.5]);
  close(m4.oobError, 2 / 3);                        // 0.5 is not above 0.5, so row 3 is called 0 and is wrong
});

test('oobError is null when every row is in every bag', () => {
  const m = bagging({ X: [[0], [1]], y: [0, 1], bootstraps: [[0, 1]], maxDepth: 1 });
  assert.equal(m.oobError, null);
  assert.equal(m.oobCoverage, 0);
});

test('bagging: bootstrap bags are n rows drawn with replacement, inBag matches the trees', () => {
  const { X, y } = noisy(40, 5);
  const m = bagging({ X, y, trees: 8, maxDepth: 3, seed: 9 });
  assert.equal(m.inBag.length, 8);
  for (const bag of m.inBag) {
    assert.equal(bag.length, 40);
    assert.ok(bag.every(i => i >= 0 && i < 40));
    assert.ok(new Set(bag).size < 40, 'a bootstrap repeats some rows');
  }
  m.trees.forEach((tree, t) => assert.equal(tree.n, 40));
  // oobError recomputed independently from the trees and the bags.
  let wrong = 0, seen = 0;
  X.forEach((x, i) => {
    const ps = m.trees.filter((_, t) => !m.inBag[t].includes(i)).map(tree => ensembleFromTrees([tree]).predictProba(x));
    if (ps.length === 0) return;
    seen++;
    if ((ps.reduce((a, b) => a + b, 0) / ps.length > 0.5 ? 1 : 0) !== y[i]) wrong++;
  });
  close(m.oobError, wrong / seen);
});

test('bagging is deterministic with a seed and differs between seeds', () => {
  const { X, y } = noisy(60, 1);
  const a = bagging({ X, y, trees: 6, seed: 4 }), b = bagging({ X, y, trees: 6, seed: 4 }), c = bagging({ X, y, trees: 6, seed: 5 });
  assert.deepEqual(a.trees, b.trees);
  assert.deepEqual(a.inBag, b.inBag);
  assert.notDeepEqual(a.inBag, c.inBag);
  const fa = randomForest({ X, y, trees: 6, seed: 4 }), fb = randomForest({ X, y, trees: 6, seed: 4 });
  assert.deepEqual(fa.trees, fb.trees);
  const ga = gradientBoost({ X, y, trees: 6, subsample: 0.5, seed: 2 }), gb = gradientBoost({ X, y, trees: 6, subsample: 0.5, seed: 2 }), gc = gradientBoost({ X, y, trees: 6, subsample: 0.5, seed: 3 });
  assert.deepEqual(ga.stages, gb.stages);
  assert.notDeepEqual(ga.stages, gc.stages);
  // Without subsampling the seed changes nothing.
  assert.deepEqual(gradientBoost({ X, y, trees: 4, seed: 1 }).stages, gradientBoost({ X, y, trees: 4, seed: 99 }).stages);
});

test('growForestTree with every feature equals fitTree; with mtry 1 it varies the split features', () => {
  const { X, y } = noisy(50, 7);
  assert.deepEqual(growForestTree(X, y, { maxDepth: 4, mtry: 2 }), fitTree(X, y, { maxDepth: 4 }));
  // Three features with mtry 1 takes the per-split path.
  const X3 = X.map(([a, b], i) => [a, b, (i * 37) % 11]);
  const random = rng(3);
  const t = growForestTree(X3, y, { maxDepth: 4, mtry: 1, random });
  const used = new Set();
  (function walk(n) { if (n.leaf) return; used.add(n.feature); walk(n.left); walk(n.right); })(t);
  assert.ok(used.size >= 2, `features used: ${[...used]}`);
  assert.deepEqual(t.classes, [0, 1]);
  // Every node's counts add up and children partition their parent.
  (function check(n) {
    assert.equal(n.counts.reduce((a, b) => a + b, 0), n.n);
    if (n.leaf) return;
    assert.equal(n.left.n + n.right.n, n.n);
    check(n.left); check(n.right);
  })(t);
});

test('randomForest: featureFraction < 1 grows different trees than plain bagging, same bags', () => {
  const { X, y } = noisy(80, 11);
  const bag = bagging({ X, y, trees: 10, maxDepth: 5, seed: 3 });
  const rf = bagging({ X, y, trees: 10, maxDepth: 5, seed: 3, featureFraction: 0.5 });
  assert.notDeepEqual(bag.trees, rf.trees);
  assert.equal(randomForest({ X, y, trees: 3 }).nTrees, 3);
  // With one informative feature among three, the forest's root splits do not all pick it.
  const X3 = X.map(([a, b], i) => [a, b, (i * 13) % 7]);
  const roots = new Set(bagging({ X: X3, y, trees: 20, maxDepth: 2, seed: 1, featureFraction: 1 / 3 }).trees.map(t => t.feature));
  assert.ok(roots.size >= 2);
});

test('boosting: validation loss falls then rises (overfitting) with many deep trees on noisy data', () => {
  const train = noisy(100, 3), val = noisy(300, 4);
  const m = gradientBoost({ ...train, trees: 120, learningRate: 0.3, maxDepth: 4 });
  const v = m.stagedValidation(val.X, val.y);
  const t = m.stagedValidation(train.X, train.y);
  assert.equal(v.logLoss.length, 120);
  assert.equal(v.accuracy.length, 120);
  const low = Math.min(...v.logLoss), at = v.logLoss.indexOf(low);
  assert.ok(low < v.logLoss[0], 'it improves at first');
  assert.ok(at < 20, `the minimum comes early (tree ${at + 1})`);
  assert.ok(v.logLoss[119] > low + 0.5, `it ends much worse: ${v.logLoss[119]} vs ${low}`);
  assert.ok(t.logLoss[119] < 0.01, 'while training loss keeps shrinking toward 0');
  assert.ok(t.logLoss[119] < t.logLoss[0]);
  // The early stopping rule picks the minimum even with a short patience.
  assert.equal(earlyStopping(v.logLoss, 10), at + 1);
  assert.equal(earlyStopping(v.logLoss), at + 1);
  // stagedValidation entry t - 1 equals predicting with upTo = t.
  const p5 = m.predictProbaAll(val.X, 5);
  close(logLoss(val.y, p5), v.logLoss[4]);
  close(m.predictAll(val.X, 5).filter((l, i) => l === val.y[i]).length / val.y.length, v.accuracy[4]);
});

test('a smaller learning rate gets a lower validation minimum later', () => {
  const train = noisy(100, 3), val = noisy(300, 4);
  const fast = gradientBoost({ ...train, trees: 150, learningRate: 0.5, maxDepth: 3 }).stagedValidation(val.X, val.y).logLoss;
  const slow = gradientBoost({ ...train, trees: 150, learningRate: 0.05, maxDepth: 3 }).stagedValidation(val.X, val.y).logLoss;
  assert.ok(earlyStopping(slow) > earlyStopping(fast));
});

test('bagging: averaging many deep trees beats one deep tree on log loss; accuracy curve has one entry per tree', () => {
  const train = noisy(100, 3), val = noisy(300, 4);
  const m = bagging({ ...train, trees: 40, maxDepth: 12, seed: 2 });
  const v = m.stagedValidation(val.X, val.y);
  assert.equal(v.accuracy.length, 40);
  assert.ok(v.logLoss[39] < v.logLoss[0] / 3, `${v.logLoss[39]} vs ${v.logLoss[0]}`);
  assert.ok(m.oobError > 0 && m.oobError < 0.6);
  assert.ok(m.oobCoverage > 0.99, 'with 40 trees almost every row is out of some bag');
  // The loss of a bagged forest does not blow up as trees are added.
  assert.ok(v.logLoss[39] <= Math.min(...v.logLoss.slice(0, 20)) + 0.2);
});

test('earlyStopping: chooses the minimum, honours patience, edge cases', () => {
  const loss = [0.69, 0.5, 0.4, 0.35, 0.36, 0.37, 0.2];
  assert.equal(earlyStopping([0.69, 0.5, 0.4, 0.35, 0.36, 0.38, 0.45]), 4);
  assert.equal(earlyStopping(loss, 2), 4, 'patience 2 gives up before the later dip');
  assert.equal(earlyStopping(loss, 3), 7, 'patience 3 sees it');
  assert.equal(earlyStopping(loss), 7);
  assert.equal(earlyStopping([0.3, 0.4, 0.5]), 1, 'getting worse from the start');
  assert.equal(earlyStopping([0.5, 0.4, 0.3]), 3, 'still improving at the end');
  assert.equal(earlyStopping([0.4, 0.3, 0.3, 0.3], 5), 2, 'a tie is not an improvement: first minimum wins');
  assert.equal(earlyStopping([0.7]), 1);
  assert.throws(() => earlyStopping([]), /at least one/);
  assert.throws(() => earlyStopping([1, 2], 0), /patience/);
});

test('input validation', () => {
  assert.throws(() => bagging({ X: [[1], [2]], y: [0, 2] }), /0 or 1/);
  assert.throws(() => bagging({ X: [[1], [2]], y: [0] }), /same length/);
  assert.throws(() => bagging({ X: [[1], [NaN]], y: [0, 1] }), /finite/);
  assert.throws(() => bagging({ X: [[1], [2]], y: [0, 1], trees: 0 }), /trees/);
  assert.throws(() => bagging({ X: [[1], [2]], y: [0, 1], featureFraction: 0 }), /featureFraction/);
  assert.throws(() => bagging({ X: [[1], [2]], y: [0, 1], bootstraps: [[0, 5]] }), /row indexes/);
  assert.throws(() => gradientBoost({ X: [[1], [2]], y: [0, 1], learningRate: 0 }), /learningRate/);
  assert.throws(() => gradientBoost({ X: [[1], [2]], y: [0, 1], leaf: 'x' }), /leaf/);
  assert.throws(() => gradientBoost({ X: [], y: [] }), /at least one row/);
});

test('a one-class bootstrap still works and zero trees means no information', () => {
  const m = bagging({ X: [[0], [1], [2]], y: [0, 0, 1], bootstraps: [[0, 0, 1]], maxDepth: 2 });
  assert.equal(m.predictProba([2]), 0);
  assert.equal(m.predictProba([2], 0), 0.5);
  const g = gradientBoost({ X: [[0], [1]], y: [0, 1], trees: 2, maxDepth: 1, learningRate: 1 });
  close(g.predictProba([0], 0), 0.5);
});
