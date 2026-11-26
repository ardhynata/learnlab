// Decision tree for numeric features and class labels. Pure functions, no DOM, no randomness,
// tested in tree.test.js. Used by the decision-tree lab and the capstone compare tool.
//
// STABLE API (import { ... } from './tree.js'). Keep these names and shapes: other files rely on them.
//
//   Data shapes
//     points   array of rows; each row is an array of finite numbers (row[j] is feature j).
//     labels   array of class labels (numbers or strings), same length as points.
//     classes  the sorted distinct labels of the TRAINING set (numbers ascending, else by string).
//              Every counts array is indexed in this order.
//     Rule     a point goes LEFT when x[feature] <= threshold, otherwise RIGHT.
//
//   Impurity and gain
//     gini(counts)                      1 - sum(p^2); 0 for an empty or pure node.
//     entropy(counts)                   -sum(p * log2 p); 0 for an empty or pure node.
//     impurity(counts, criterion)       criterion is 'gini' (default) or 'entropy'.
//     splitGain(parent, left, right, criterion)
//                                       impurity(parent) - weighted impurity of the two children.
//     candidateThresholds(values)       midpoints between consecutive DISTINCT sorted values.
//
//   Splitting
//     applySplit(points, feature, threshold) -> { left: [indices], right: [indices] }  (input order kept)
//     bestSplit(points, labels, features, minLeaf = 1, criterion = 'gini')
//         -> { feature, threshold, gain, leftCounts, rightCounts, classes } or null
//         null when no split keeps at least minLeaf points on each side with a gain above 1e-12.
//         features: array of column indexes to search; omit or pass null for all columns.
//         Tie-breaking (deterministic): the largest gain wins; gains within 1e-12 of each other tie;
//         a tie goes to the lowest feature index, then to the lowest threshold.
//
//   Fitting
//     fitTree(points, labels, { maxDepth = 3, minLeaf = 1, criterion = 'gini', features, firstSplit })
//         -> root node. Greedy growth; a node becomes a leaf when it is pure, is at maxDepth, holds fewer
//         than 2 * minLeaf points, or has no split with positive gain. The root has depth 0, so
//         maxDepth 0 gives a single leaf. A leaf predicts its majority class (ties: the first class).
//     fitTreeWithFirstSplit(points, labels, feature, threshold, options)
//         Same as fitTree with options.firstSplit = { feature, threshold }: the root is split exactly
//         there (minLeaf is not applied to this one split, the learner chose it; both sides must be
//         non-empty), then each child grows greedily with the usual rules. The root carries
//         forced: true and its real gain (possibly 0 or negative). A forced split that cannot be
//         used (an empty side, an unknown feature, a non-finite threshold or maxDepth 0) gives a single
//         leaf whose forcedRejected is true; check the sides with applySplit first to warn the learner.
//
//   Node shapes (plain objects, JSON safe, nothing shared between nodes)
//     leaf   { leaf: true,  depth, n, counts, impurity, label }
//     split  { leaf: false, depth, n, counts, impurity, label, feature, threshold, gain, left, right }
//     The root also has classes and criterion; a forced root also has forced: true.
//     label is the majority class at that node (what a leaf predicts).
//
//   Using a tree
//     predict(tree, x)              label for one row.
//     predictAll(tree, points)      labels for many rows.
//     decisionPath(tree, x)         the nodes visited from the root to the leaf, in order.
//     treeDepth(tree)               edges on the longest root-to-leaf path (a lone leaf is 0).
//     leafCount(tree), nodeCount(tree)
//     accuracy(tree, points, labels)  share predicted correctly, 0..1 (0 for no points).

const EPS = 1e-12;

const compareLabels = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);

export function gini(counts) {
  const n = counts.reduce((s, c) => s + c, 0);
  if (n === 0) return 0;
  let sq = 0;
  for (const c of counts) sq += (c / n) * (c / n);
  return 1 - sq;
}

export function entropy(counts) {
  const n = counts.reduce((s, c) => s + c, 0);
  if (n === 0) return 0;
  let h = 0;
  for (const c of counts) if (c > 0) h -= (c / n) * Math.log2(c / n);
  return h;
}

export function impurity(counts, criterion = 'gini') {
  if (criterion === 'gini') return gini(counts);
  if (criterion === 'entropy') return entropy(counts);
  throw new RangeError(`unknown criterion "${criterion}" (use "gini" or "entropy")`);
}

export function splitGain(parent, left, right, criterion = 'gini') {
  const nl = left.reduce((s, c) => s + c, 0), nr = right.reduce((s, c) => s + c, 0), n = nl + nr;
  if (n === 0) return 0;
  return impurity(parent, criterion) - (nl / n) * impurity(left, criterion) - (nr / n) * impurity(right, criterion);
}

export function candidateThresholds(values) {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const out = [];
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1], b = sorted[i];
    let mid = (a + b) / 2;
    if (!(mid < b)) mid = a; // adjacent floats: keep the rule "x <= threshold" separating a from b
    out.push(mid);
  }
  return out;
}

export function applySplit(points, feature, threshold) {
  const left = [], right = [];
  points.forEach((p, i) => (p[feature] <= threshold ? left : right).push(i));
  return { left, right };
}

function classesOf(labels) { return [...new Set(labels)].sort(compareLabels); }

function check(points, labels) {
  if (!Array.isArray(points) || !Array.isArray(labels) || points.length !== labels.length) throw new Error('points and labels must be arrays of the same length');
  if (points.length === 0) throw new Error('need at least one point');
}

function allFeatures(points, features) {
  const list = features == null ? Array.from({ length: points[0].length }, (_, j) => j) : [...new Set(features)].sort((a, b) => a - b);
  for (const f of list) {
    if (!Number.isInteger(f) || f < 0 || f >= points[0].length) throw new RangeError(`unknown feature ${f}`);
    for (const p of points) if (!Number.isFinite(p[f])) throw new TypeError(`feature ${f} has a value that is not a finite number`);
  }
  return list;
}

// Best split over the rows in idx. y holds class indexes. Returns null when nothing qualifies.
function search(points, y, k, idx, features, minLeaf, criterion) {
  const n = idx.length;
  if (n < 2 * minLeaf) return null;
  const total = new Array(k).fill(0);
  for (const i of idx) total[y[i]]++;
  let best = null;
  for (const f of features) {
    const order = [...idx].sort((a, b) => points[a][f] - points[b][f] || a - b);
    const left = new Array(k).fill(0);
    for (let s = 0; s < n - 1; s++) {
      left[y[order[s]]]++;
      const a = points[order[s]][f], b = points[order[s + 1]][f];
      const nl = s + 1;
      if (a === b || nl < minLeaf || n - nl < minLeaf) continue;
      let mid = (a + b) / 2;
      if (!(mid < b)) mid = a;
      const right = total.map((c, j) => c - left[j]);
      const gain = splitGain(total, left, right, criterion);
      if (gain > EPS && (best === null || gain > best.gain + EPS)) best = { feature: f, threshold: mid, gain, leftCounts: [...left], rightCounts: right };
    }
  }
  return best;
}

export function bestSplit(points, labels, features, minLeaf = 1, criterion = 'gini') {
  check(points, labels);
  impurity([], criterion);
  const classes = classesOf(labels);
  const y = labels.map(l => classes.indexOf(l));
  const found = search(points, y, classes.length, points.map((_, i) => i), allFeatures(points, features), Math.max(1, Math.floor(minLeaf)), criterion);
  return found && { ...found, classes };
}

export function fitTree(points, labels, options = {}) {
  const { maxDepth = 3, minLeaf = 1, criterion = 'gini', features, firstSplit } = options;
  check(points, labels);
  impurity([], criterion);
  const classes = classesOf(labels);
  const k = classes.length;
  const y = labels.map(l => classes.indexOf(l));
  const feats = allFeatures(points, features);
  const leafMin = Math.max(1, Math.floor(minLeaf));
  const depthCap = Math.max(0, Math.floor(maxDepth));

  const node = (idx, depth) => {
    const counts = new Array(k).fill(0);
    for (const i of idx) counts[y[i]]++;
    let top = 0;
    counts.forEach((c, j) => { if (c > counts[top]) top = j; });
    return { leaf: true, depth, n: idx.length, counts, impurity: impurity(counts, criterion), label: classes[top] };
  };
  const split = (n, idx, feature, threshold, gain, depth) => {
    const sides = applySplit(idx.map(i => points[i]), feature, threshold);
    return Object.assign(n, { leaf: false, feature, threshold, gain, left: grow(sides.left.map(i => idx[i]), depth + 1), right: grow(sides.right.map(i => idx[i]), depth + 1) });
  };
  function grow(idx, depth) {
    const n = node(idx, depth);
    if (depth >= depthCap || n.impurity === 0) return n;
    const found = search(points, y, k, idx, feats, leafMin, criterion);
    return found ? split(n, idx, found.feature, found.threshold, found.gain, depth) : n;
  }

  const all = points.map((_, i) => i);
  let root;
  if (firstSplit == null) root = grow(all, 0);
  else {
    const { feature, threshold } = firstSplit;
    root = node(all, 0);
    const known = Number.isInteger(feature) && feature >= 0 && feature < points[0].length && points.every(p => Number.isFinite(p[feature]));
    const sides = known && Number.isFinite(threshold) ? applySplit(points, feature, threshold) : null;
    if (sides && sides.left.length > 0 && sides.right.length > 0 && depthCap >= 1) {
      const lc = new Array(k).fill(0), rc = new Array(k).fill(0);
      sides.left.forEach(i => lc[y[i]]++);
      sides.right.forEach(i => rc[y[i]]++);
      split(root, all, feature, threshold, splitGain(root.counts, lc, rc, criterion), 0);
      root.forced = true;
    } else root.forcedRejected = true;
  }
  root.classes = classes;
  root.criterion = criterion;
  return root;
}

export function fitTreeWithFirstSplit(points, labels, feature, threshold, options = {}) {
  return fitTree(points, labels, { ...options, firstSplit: { feature, threshold } });
}

export function predict(tree, x) {
  let n = tree;
  while (!n.leaf) n = x[n.feature] <= n.threshold ? n.left : n.right;
  return n.label;
}

export function predictAll(tree, points) { return points.map(p => predict(tree, p)); }

export function decisionPath(tree, x) {
  const path = [tree];
  let n = tree;
  while (!n.leaf) { n = x[n.feature] <= n.threshold ? n.left : n.right; path.push(n); }
  return path;
}

export function treeDepth(tree) { return tree.leaf ? 0 : 1 + Math.max(treeDepth(tree.left), treeDepth(tree.right)); }
export function leafCount(tree) { return tree.leaf ? 1 : leafCount(tree.left) + leafCount(tree.right); }
export function nodeCount(tree) { return tree.leaf ? 1 : 1 + nodeCount(tree.left) + nodeCount(tree.right); }

export function accuracy(tree, points, labels) {
  if (points.length === 0) return 0;
  let ok = 0;
  points.forEach((p, i) => { if (predict(tree, p) === labels[i]) ok++; });
  return ok / points.length;
}
