import test from 'node:test';
import assert from 'node:assert/strict';
import { rng } from './rng.js';
import {
  gini, entropy, impurity, splitGain, candidateThresholds, applySplit, bestSplit, fitTree, fitTreeWithFirstSplit,
  predict, predictAll, decisionPath, treeDepth, leafCount, nodeCount, accuracy,
} from './tree.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

// Eight points on a line, classes in the pattern 0 0 1 1 0 0 1 1: no single cut helps at the first step.
const X8 = [1, 2, 3, 4, 5, 6, 7, 8].map(v => [v]);
const Y8 = [0, 0, 1, 1, 0, 0, 1, 1];

test('gini by hand', () => {
  close(gini([5, 5]), 0.5);
  close(gini([10, 0]), 0);
  close(gini([2, 1, 1]), 1 - (0.25 + 0.0625 + 0.0625));
  close(gini([3, 1]), 0.375);
  assert.equal(gini([]), 0);
  assert.equal(gini([0, 0]), 0);
});

test('entropy by hand', () => {
  close(entropy([5, 5]), 1);
  close(entropy([4, 0]), 0);
  close(entropy([3, 1]), -(0.75 * Math.log2(0.75) + 0.25 * Math.log2(0.25)));
  close(entropy([3, 1]), 0.811278124459);
  close(entropy([1, 1, 1, 1]), 2);
  assert.equal(entropy([]), 0);
});

test('impurity picks the criterion and rejects unknown ones', () => {
  assert.equal(impurity([5, 5]), 0.5);
  assert.equal(impurity([5, 5], 'entropy'), 1);
  assert.throws(() => impurity([1, 1], 'chaos'), RangeError);
});

test('splitGain is the parent impurity minus the weighted child impurity', () => {
  close(splitGain([3, 3], [3, 0], [0, 3]), 0.5);
  close(splitGain([3, 3], [2, 0], [1, 3]), 0.25); // 0.5 - 4/6 * 0.375
  close(splitGain([3, 3], [3, 0], [0, 3], 'entropy'), 1);
  close(splitGain([3, 3], [2, 1], [1, 2]), 0.5 - (4 / 9));
  assert.equal(splitGain([], [], []), 0);
});

test('candidateThresholds are midpoints of distinct sorted values', () => {
  assert.deepEqual(candidateThresholds([3, 1, 2, 2, 3]), [1.5, 2.5]);
  assert.deepEqual(candidateThresholds([5]), []);
  assert.deepEqual(candidateThresholds([]), []);
});

test('applySplit sends x <= threshold left and keeps input order', () => {
  const pts = [[5, 0], [1, 0], [3, 0], [3, 1], [9, 1]];
  assert.deepEqual(applySplit(pts, 0, 3), { left: [1, 2, 3], right: [0, 4] });
  assert.deepEqual(applySplit(pts, 1, 0.5), { left: [0, 1, 2], right: [3, 4] });
  assert.deepEqual(applySplit(pts, 0, 100), { left: [0, 1, 2, 3, 4], right: [] });
});

test('bestSplit on a clean table cuts between the classes', () => {
  const pts = [1, 2, 3, 4, 5, 6].map(v => [v]);
  const s = bestSplit(pts, [0, 0, 0, 1, 1, 1], null);
  assert.equal(s.feature, 0);
  assert.equal(s.threshold, 3.5);
  close(s.gain, 0.5);
  assert.deepEqual(s.leftCounts, [3, 0]);
  assert.deepEqual(s.rightCounts, [0, 3]);
  assert.deepEqual(s.classes, [0, 1]);
});

test('bestSplit by hand on a messy table, with the tie going to the lowest threshold', () => {
  const pts = [1, 2, 3, 4, 5, 6].map(v => [v]);
  const y = [0, 0, 1, 0, 1, 1];
  // gains: 1.5 -> 0.1, 2.5 -> 0.25, 3.5 -> 0.0556, 4.5 -> 0.25, 5.5 -> 0.1; 2.5 and 4.5 tie.
  const s = bestSplit(pts, y, [0]);
  assert.equal(s.threshold, 2.5);
  close(s.gain, 0.25);
  assert.deepEqual(s.leftCounts, [2, 0]);
  assert.deepEqual(s.rightCounts, [1, 3]);
});

test('bestSplit honours minLeaf', () => {
  const pts = [1, 2, 3, 4, 5, 6].map(v => [v]);
  const y = [0, 0, 1, 0, 1, 1];
  assert.equal(bestSplit(pts, y, [0], 3).threshold, 3.5);
  assert.equal(bestSplit(pts, y, [0], 4), null);
  assert.equal(bestSplit(pts, y, [0], 0).threshold, 2.5, 'minLeaf below 1 behaves as 1');
});

test('bestSplit chooses the informative feature and breaks a feature tie to the lowest index', () => {
  // feature 0 is noise, feature 1 separates the classes
  const pts = [[5, 1], [1, 2], [4, 3], [2, 10], [6, 11], [3, 12]];
  const y = [0, 0, 0, 1, 1, 1];
  const s = bestSplit(pts, y, null);
  assert.equal(s.feature, 1);
  assert.equal(s.threshold, 6.5);
  // two identical columns: the lowest index wins, and the order of the features list does not matter
  const twin = [1, 2, 3, 4].map(v => [v, v]);
  assert.equal(bestSplit(twin, [0, 0, 1, 1], [1, 0]).feature, 0);
  assert.equal(bestSplit(twin, [0, 0, 1, 1], [1]).feature, 1, 'only the listed features are searched');
});

test('bestSplit returns null when there is nothing to gain', () => {
  assert.equal(bestSplit([[1], [2], [3]], [1, 1, 1], null), null, 'pure node');
  assert.equal(bestSplit([[2], [2], [2], [2]], [0, 1, 0, 1], null), null, 'identical values cannot be split');
  assert.equal(bestSplit([[0, 0], [1, 1], [0, 1], [1, 0]], [0, 0, 1, 1], null), null, 'XOR: every single cut leaves both sides mixed 1:1');
});

test('bestSplit works with string labels and with entropy', () => {
  const pts = [[1], [2], [8], [9]];
  const s = bestSplit(pts, ['b', 'b', 'a', 'a'], null, 1, 'entropy');
  assert.deepEqual(s.classes, ['a', 'b']);
  assert.equal(s.threshold, 5);
  close(s.gain, 1);
});

test('fitTree with maxDepth 0 is one leaf predicting the majority, ties to the first class', () => {
  const t = fitTree(X8, [1, 1, 0, 1, 0, 0, 1, 1], { maxDepth: 0 });
  assert.equal(t.leaf, true);
  assert.equal(t.label, 1);
  assert.equal(treeDepth(t), 0);
  assert.equal(leafCount(t), 1);
  const tie = fitTree(X8, Y8, { maxDepth: 0 });
  assert.equal(tie.label, 0, 'a 4-4 tie goes to the first class');
  assert.deepEqual(tie.counts, [4, 4]);
});

test('depth: the greedy tree on the 0 0 1 1 0 0 1 1 line, hand computed', () => {
  // Root cut at 2.5 (gain 1/6; 6.5 ties and loses on threshold). Its right side 3..8 cuts at 4.5 (tie with 6.5),
  // and the right side of that cuts at 6.5. Four leaves, depth 3.
  const t = fitTree(X8, Y8, { maxDepth: 10 });
  assert.equal(t.threshold, 2.5);
  close(t.gain, 1 / 6);
  assert.equal(t.right.threshold, 4.5);
  assert.equal(t.right.right.threshold, 6.5);
  assert.equal(treeDepth(t), 3);
  assert.equal(leafCount(t), 4);
  assert.equal(nodeCount(t), 7);
  assert.equal(accuracy(t, X8, Y8), 1);

  const d1 = fitTree(X8, Y8, { maxDepth: 1 });
  assert.equal(treeDepth(d1), 1);
  assert.equal(leafCount(d1), 2);
  assert.equal(d1.left.label, 0);
  assert.equal(d1.right.label, 1); // x 3..8 has four 1s and two 0s
  close(accuracy(d1, X8, Y8), 6 / 8);

  const d2 = fitTree(X8, Y8, { maxDepth: 2 });
  assert.equal(treeDepth(d2), 2);
  assert.equal(leafCount(d2), 3);
  close(accuracy(d2, X8, Y8), 6 / 8);
});

test('training accuracy never falls as maxDepth grows', () => {
  const random = rng(5);
  const pts = Array.from({ length: 60 }, () => [random(), random()]);
  const y = pts.map(p => (Math.sin(6 * p[0]) + p[1] > 0.8 ? 1 : 0));
  let prev = 0;
  for (let d = 0; d <= 8; d++) {
    const t = fitTree(pts, y, { maxDepth: d });
    assert.ok(treeDepth(t) <= d);
    const acc = accuracy(t, pts, y);
    assert.ok(acc >= prev - 1e-12, `depth ${d}: ${acc} < ${prev}`);
    prev = acc;
  }
  assert.equal(prev, 1, 'a deep enough tree memorises distinct points');
});

test('minLeaf: no leaf is smaller than minLeaf, and a high minLeaf stops growth', () => {
  const t3 = fitTree(X8, Y8, { maxDepth: 10, minLeaf: 3 });
  assert.equal(t3.threshold, 3.5); // gains 0.0333 at 3.5 and 5.5 tie; the lower wins; 4.5 has gain 0
  assert.equal(leafCount(t3), 2, 'both children (3 and 5 points) are below 2 * minLeaf');
  const sizes = n => (n.leaf ? [n.n] : [...sizes(n.left), ...sizes(n.right)]);
  assert.deepEqual(sizes(t3), [3, 5]);
  assert.equal(leafCount(fitTree(X8, Y8, { maxDepth: 10, minLeaf: 5 })), 1, '8 points cannot split into two sides of 5');

  const random = rng(11);
  const pts = Array.from({ length: 80 }, () => [random(), random(), random()]);
  const y = pts.map(p => (p[0] + p[1] * p[2] > 0.7 ? 1 : 0));
  for (const m of [1, 2, 5, 10]) {
    const t = fitTree(pts, y, { maxDepth: 12, minLeaf: m });
    assert.ok(sizes(t).every(s => s >= m), `minLeaf ${m}: ${sizes(t)}`);
  }
  const small = leafCount(fitTree(pts, y, { maxDepth: 12, minLeaf: 10 }));
  const large = leafCount(fitTree(pts, y, { maxDepth: 12, minLeaf: 1 }));
  assert.ok(small < large);
});

test('forced first split: the learner picks 4.5 and the rest grows greedily', () => {
  const greedy = fitTree(X8, Y8, { maxDepth: 2 });
  close(accuracy(greedy, X8, Y8), 6 / 8);
  const forced = fitTreeWithFirstSplit(X8, Y8, 0, 4.5, { maxDepth: 2 });
  assert.equal(forced.forced, true);
  assert.equal(forced.feature, 0);
  assert.equal(forced.threshold, 4.5);
  assert.equal(forced.gain, 0, 'the learner chose a cut with no immediate gain');
  assert.equal(forced.left.threshold, 2.5);
  assert.equal(forced.right.threshold, 6.5);
  assert.equal(treeDepth(forced), 2);
  assert.equal(leafCount(forced), 4);
  assert.equal(accuracy(forced, X8, Y8), 1, 'a worse first step can lead to a better tree');
  assert.deepEqual(predictAll(forced, X8), Y8);
});

test('forced first split equals the greedy tree when it is the greedy choice', () => {
  const greedy = fitTree(X8, Y8, { maxDepth: 3 });
  const forced = fitTree(X8, Y8, { maxDepth: 3, firstSplit: { feature: 0, threshold: 2.5 } });
  const strip = ({ forced: _f, ...n }) => n;
  assert.deepEqual(strip(forced), { ...greedy });
});

test('forced first split ignores minLeaf for itself but not for the children', () => {
  const t = fitTreeWithFirstSplit(X8, Y8, 0, 1.5, { maxDepth: 5, minLeaf: 3 });
  assert.equal(t.forced, true);
  assert.equal(t.left.n, 1);
  assert.equal(t.left.leaf, true);
  assert.equal(t.right.n, 7);
});

test('an unusable forced split gives a flagged single leaf', () => {
  for (const bad of [{ feature: 0, threshold: 100 }, { feature: 0, threshold: 0 }, { feature: 3, threshold: 2 }, { feature: 0, threshold: NaN }]) {
    const t = fitTree(X8, Y8, { firstSplit: bad });
    assert.equal(t.leaf, true);
    assert.equal(t.forcedRejected, true);
  }
  assert.equal(fitTree(X8, Y8, { maxDepth: 0, firstSplit: { feature: 0, threshold: 4.5 } }).forcedRejected, true);
  assert.equal(fitTree(X8, Y8).forcedRejected, undefined);
});

test('predict, predictAll and decisionPath follow the rule x <= threshold', () => {
  const t = fitTree([[1], [2], [3], [4], [5], [6]], [0, 0, 0, 1, 1, 1], { maxDepth: 3 });
  assert.equal(t.threshold, 3.5);
  assert.equal(predict(t, [3.5]), 0, 'a point on the threshold goes left');
  assert.equal(predict(t, [3.5001]), 1);
  assert.equal(predict(t, [-100]), 0);
  assert.deepEqual(predictAll(t, [[1], [6]]), [0, 1]);
  const path = decisionPath(t, [5]);
  assert.equal(path.length, 2);
  assert.equal(path[0], t);
  assert.equal(path[1], t.right);
  assert.equal(path[1].leaf, true);
});

test('node bookkeeping: counts, n, depth, impurity and classes', () => {
  const t = fitTree(X8, Y8, { maxDepth: 1 });
  assert.deepEqual(t.classes, [0, 1]);
  assert.equal(t.criterion, 'gini');
  assert.equal(t.n, 8);
  assert.equal(t.depth, 0);
  assert.deepEqual(t.counts, [4, 4]);
  close(t.impurity, 0.5);
  assert.deepEqual(t.left.counts, [2, 0]);
  assert.deepEqual(t.right.counts, [2, 4]);
  assert.equal(t.right.depth, 1);
  assert.equal(t.left.classes, undefined, 'classes live on the root only');
});

test('entropy criterion fits too, and string labels predict strings', () => {
  const pts = [[1, 5], [2, 4], [3, 6], [8, 5], [9, 4], [10, 6]];
  const y = ['cat', 'cat', 'cat', 'dog', 'dog', 'dog'];
  const t = fitTree(pts, y, { criterion: 'entropy' });
  assert.equal(t.criterion, 'entropy');
  assert.equal(t.feature, 0);
  assert.equal(t.threshold, 5.5);
  close(t.gain, 1);
  assert.equal(predict(t, [2, 100]), 'cat');
  assert.equal(predict(t, [20, 0]), 'dog');
  assert.equal(accuracy(t, pts, y), 1);
});

test('fitTree is deterministic and does not mutate its inputs', () => {
  const random = rng(3);
  const pts = Array.from({ length: 40 }, () => [Math.round(random() * 10), Math.round(random() * 10)]);
  const y = pts.map(p => (p[0] > 4 ? 1 : 0));
  const before = JSON.stringify([pts, y]);
  const a = fitTree(pts, y, { maxDepth: 4 });
  const b = fitTree(pts, y, { maxDepth: 4 });
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify([pts, y]), before);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a, 'the tree is plain JSON data');
});

test('ties in the data (repeated values) never split between equal values', () => {
  const pts = [[1], [1], [2], [2], [3], [3]];
  const y = [0, 1, 0, 1, 1, 1];
  const t = fitTree(pts, y, { maxDepth: 5 });
  const sizes = n => (n.leaf ? [n.n] : [...sizes(n.left), ...sizes(n.right)]);
  assert.equal(sizes(t).reduce((s, v) => s + v, 0), 6);
  for (const v of [1, 2, 3]) assert.equal(predict(t, [v]), predict(t, [v]));
  assert.ok(t.leaf || [1.5, 2.5].includes(t.threshold));
});

test('accuracy of a tree on held-out points, and zero for no points', () => {
  const t = fitTree([[1], [2], [3], [4]], [0, 0, 1, 1], {});
  assert.equal(accuracy(t, [[0], [5], [2.9], [3.1]], [0, 0, 1, 1]), 0.75);
  assert.equal(accuracy(t, [], []), 0);
});

test('bad input is rejected with a clear error', () => {
  assert.throws(() => fitTree([], []), /at least one/);
  assert.throws(() => fitTree([[1]], [0, 1]), /same length/);
  assert.throws(() => fitTree([[1], [NaN]], [0, 1]), /finite/);
  assert.throws(() => fitTree([[1]], [0], { features: [2] }), /unknown feature/);
  assert.throws(() => fitTree([[1]], [0], { criterion: 'x' }), RangeError);
  assert.throws(() => bestSplit([[1]], [0, 1], null), /same length/);
});

test('features option limits which columns the tree may use', () => {
  const pts = [[1, 1], [2, 5], [3, 2], [4, 6], [5, 3], [6, 7]];
  const y = [0, 0, 0, 0, 1, 1];
  const used = n => (n.leaf ? [] : [n.feature, ...used(n.left), ...used(n.right)]);
  assert.ok(used(fitTree(pts, y, { maxDepth: 4, features: [1] })).every(f => f === 1));
  assert.ok(used(fitTree(pts, y, { maxDepth: 4, features: [0] })).every(f => f === 0));
});
