// Tree ensembles for numeric features and binary (0/1) labels. Pure functions, no DOM, no clock;
// every random choice comes from a seed, so the same call always builds the same model.
// Tested in ensemble.test.js. Used by the tree-ensembles lab (bagging vs boosting, tree by tree).
//
// STABLE API (import { ... } from './ensemble.js'). Keep these names and shapes: other files rely on them.
//
//   Data shapes
//     X   array of rows; each row is an array of finite numbers (row[j] is feature j).
//     y   array of labels, each exactly 0 or 1, same length as X.
//     A "tree count" t runs from 1 to T. Anything that takes `upTo` uses the first `upTo` trees
//     (default: all of them).
//
//   bagging({ X, y, trees = 25, maxDepth = 8, minLeaf = 1, seed = 1, featureFraction = 1, bootstraps })
//       Bootstrap aggregating: every tree is fitted to its own bootstrap sample (n rows drawn WITH
//       replacement) and the trees are averaged. Trees are the classification trees of tree.js (gini).
//       featureFraction = 1 is plain bagging: each tree searches every feature at every split (fitTree).
//       featureFraction < 1 is a RANDOM FOREST: at every split the tree looks at a fresh random
//       subset of max(1, round(featureFraction * d)) features (it falls back to the other features
//       only when that subset has no useful split). randomForest(opts) is bagging with a default
//       featureFraction of 0.5 and is otherwise identical.
//       bootstraps (optional) is an array of index arrays, one per tree, that replaces the random
//       draw (for hand-checked examples); trees is then bootstraps.length.
//       -> model { kind: 'bagging', nTrees, trees: [tree.js root nodes], inBag: [[row indexes per tree]],
//                  oobProba: [per row: mean P(1) over the trees that did NOT see the row, or null],
//                  oobError, oobCoverage, predictProba, predictProbaAll, votes, predict,
//                  predictAll, stagedValidation }
//   ensembleFromTrees(trees)
//       Wraps hand-made or fitted tree.js trees (each root needs classes) as a bagging model with the
//       same methods; no inBag, oobProba or oobError.
//
//   gradientBoost({ X, y, trees = 50, learningRate = 0.1, maxDepth = 2, minLeaf = 1, seed = 1,
//                   subsample = 1, leaf = 'newton' })
//       Gradient boosting on log loss. Start from the log-odds of the base rate,
//       F0 = ln(p / (1 - p)) with p = mean(y) (p kept within [1e-6, 1 - 1e-6]). Each round:
//       residual r_i = y_i - sigmoid(F_i), fit a small REGRESSION tree to the residuals (squared
//       error, greedy, this file's own tree), give each leaf a value, then F_i += learningRate * value.
//       leaf 'newton' (default): value = sum(r) / sum(p (1 - p)) over the leaf's rows, the Newton step
//       for log loss that real libraries use; leaf 'mean': value = mean(r), the plain residual average.
//       subsample < 1 fits each tree on that share of the rows (drawn without replacement from the
//       seed); with subsample 1 the seed changes nothing.
//       -> model { kind: 'boost', nTrees, initial (F0), learningRate, stages: [{ tree, residuals }],
//                  predictRaw, predictProba, predictProbaAll, predict, predictAll, stagedValidation }
//       Regression tree node: leaf  { leaf: true, depth, n, mean, value }
//                             split { leaf: false, depth, n, mean, feature, threshold, gain, left, right }
//       A point goes LEFT when x[feature] <= threshold (as in tree.js); gain is the drop in squared error.
//
//   Methods of both models
//     predictProba(x, upTo)         P(label 1) for one row. Bagging: the MEAN of the trees' leaf
//                                   probabilities (share of 1s among the training rows in the leaf).
//                                   Boosting: sigmoid(F0 + learningRate * sum of the first upTo leaf values).
//     predictProbaAll(X, upTo)      the same for many rows.
//     predict(x, upTo)              1 when predictProba > 0.5, else 0 (an exact tie gives 0, as tree.js does).
//     predictAll(X, upTo)
//     stagedValidation(Xval, yval)  -> { accuracy: [...], logLoss: [...] }, each of length nTrees: entry
//                                   t - 1 scores the ensemble made of the first t trees. Pass the training
//                                   set to get the training curve.
//     Bagging only: votes(x, upTo)  share of the trees whose own majority label for x is 1 (a hard vote).
//
//   earlyStopping(stagedValues, patience = Infinity) -> best number of trees (1-based).
//       stagedValues is a validation LOSS after 1..T trees (lower is better). Walk the sequence and keep
//       the first strict minimum; stop once `patience` rounds in a row failed to beat it. With no
//       patience this is the global minimum. A later, deeper dip beyond the patience window is missed.
//
//   logLoss(y, p)     mean of -[y ln p + (1 - y) ln(1 - p)], p clipped to [1e-15, 1 - 1e-15].
//   sigmoid(z)        1 / (1 + e^-z).
//   fitRegressionTree(X, r, { maxDepth, minLeaf, leafValue, rows })
//                     the boosting tree on its own. leafValue(rowIndexes) -> number (default: mean of r);
//                     rows (default: all) are the rows it is fitted on.
//   predictRegression(node, x)   the leaf value x falls into.
//   growForestTree(X, y, { maxDepth, minLeaf, mtry, random })
//                     one classification tree with a random mtry-feature subset at every split; same node
//                     shape as tree.js fitTree (with mtry >= d it equals fitTree exactly).

import { bestSplit, fitTree, applySplit, predict as predictTree } from './tree.js';
import { rng, shuffle } from './rng.js';

const EPS = 1e-12;

export const sigmoid = z => 1 / (1 + Math.exp(-z));

export function logLoss(y, p) {
  if (y.length !== p.length) throw new Error('y and p must have the same length');
  if (y.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < y.length; i++) {
    const q = Math.min(1 - 1e-15, Math.max(1e-15, p[i]));
    s -= y[i] === 1 ? Math.log(q) : Math.log(1 - q);
  }
  return s / y.length;
}

function checkData(X, y) {
  if (!Array.isArray(X) || !Array.isArray(y) || X.length !== y.length) throw new Error('X and y must be arrays of the same length');
  if (X.length === 0) throw new Error('need at least one row');
  const d = X[0].length;
  if (!(d >= 1)) throw new Error('rows need at least one feature');
  for (const row of X) {
    if (row.length !== d) throw new Error('every row needs the same number of features');
    for (const v of row) if (!Number.isFinite(v)) throw new TypeError('features must be finite numbers');
  }
  for (const v of y) if (v !== 0 && v !== 1) throw new TypeError('labels must be 0 or 1');
}

function positiveInt(v, name, min = 1) {
  if (!Number.isInteger(v) || v < min) throw new RangeError(`${name} must be an integer of at least ${min}`);
  return v;
}

// P(label 1) from the leaf a row lands in: the share of 1s among its training rows.
function leafP1(tree, x) {
  let n = tree;
  while (!n.leaf) n = x[n.feature] <= n.threshold ? n.left : n.right;
  const at = tree.classes.indexOf(1);
  const total = n.counts.reduce((s, c) => s + c, 0);
  return at < 0 || total === 0 ? 0 : n.counts[at] / total;
}

const scoreStages = (probasAt, yval) => ({
  accuracy: probasAt.map(ps => ps.reduce((s, p, i) => s + ((p > 0.5 ? 1 : 0) === yval[i] ? 1 : 0), 0) / (yval.length || 1)),
  logLoss: probasAt.map(ps => logLoss(yval, ps)),
});

// ---------------------------------------------------------------- bagging and random forests

export function growForestTree(X, y, { maxDepth = 8, minLeaf = 1, mtry, random = rng(1) } = {}) {
  checkData(X, y);
  const d = X[0].length;
  const k = mtry == null ? d : Math.min(d, positiveInt(mtry, 'mtry'));
  const leafMin = Math.max(1, Math.floor(minLeaf));
  const cap = Math.max(0, Math.floor(maxDepth));
  if (k >= d) return fitTree(X, y, { maxDepth: cap, minLeaf: leafMin });
  const classes = [...new Set(y)].sort((a, b) => a - b);
  const sideLabels = idx => idx.map(i => y[i]);

  function grow(idx, depth) {
    const counts = classes.map(c => idx.reduce((s, i) => s + (y[i] === c ? 1 : 0), 0));
    let top = 0;
    counts.forEach((c, j) => { if (c > counts[top]) top = j; });
    const n = counts.reduce((s, c) => s + c, 0);
    let sq = 0;
    for (const c of counts) sq += (c / n) * (c / n);
    const node = { leaf: true, depth, n, counts, impurity: n === 0 ? 0 : 1 - sq, label: classes[top] };
    if (depth >= cap || node.impurity === 0 || n < 2 * leafMin) return node;
    const rows = idx.map(i => X[i]), labs = sideLabels(idx);
    const order = shuffle(Array.from({ length: d }, (_, j) => j), random);
    let found = bestSplit(rows, labs, order.slice(0, k), leafMin);
    if (!found) found = bestSplit(rows, labs, order.slice(k), leafMin);
    if (!found) return node;
    const sides = applySplit(rows, found.feature, found.threshold);
    return Object.assign(node, {
      leaf: false, feature: found.feature, threshold: found.threshold, gain: found.gain,
      left: grow(sides.left.map(i => idx[i]), depth + 1),
      right: grow(sides.right.map(i => idx[i]), depth + 1),
    });
  }
  const root = grow(X.map((_, i) => i), 0);
  root.classes = classes;
  root.criterion = 'gini';
  return root;
}

function baggedModel(trees, inBag, X, y) {
  const T = trees.length;
  const upTo = (t, name = 'upTo') => (t == null ? T : positiveInt(t, name, 0) > T ? T : t);
  const model = {
    kind: 'bagging',
    nTrees: T,
    trees,
    predictProba(x, t) {
      const m = upTo(t);
      let s = 0;
      for (let i = 0; i < m; i++) s += leafP1(trees[i], x);
      return m === 0 ? 0.5 : s / m;
    },
    votes(x, t) {
      const m = upTo(t);
      let s = 0;
      for (let i = 0; i < m; i++) s += predictTree(trees[i], x) === 1 ? 1 : 0;
      return m === 0 ? 0.5 : s / m;
    },
    predict(x, t) { return model.predictProba(x, t) > 0.5 ? 1 : 0; },
    predictProbaAll(rows, t) { return rows.map(x => model.predictProba(x, t)); },
    predictAll(rows, t) { return rows.map(x => model.predict(x, t)); },
    stagedValidation(Xval, yval) {
      if (Xval.length !== yval.length) throw new Error('Xval and yval must have the same length');
      const sum = new Array(Xval.length).fill(0);
      const at = [];
      trees.forEach((tree, t) => {
        Xval.forEach((x, i) => { sum[i] += leafP1(tree, x); });
        at.push(sum.map(s => s / (t + 1)));
      });
      return scoreStages(at, yval);
    },
  };
  if (inBag) {
    const sets = inBag.map(rows => new Set(rows));
    const oobProba = X.map((x, i) => {
      let s = 0, m = 0;
      trees.forEach((tree, t) => { if (!sets[t].has(i)) { s += leafP1(tree, x); m++; } });
      return m === 0 ? null : s / m;
    });
    const covered = oobProba.map((p, i) => [p, i]).filter(([p]) => p !== null);
    model.inBag = inBag;
    model.oobProba = oobProba;
    model.oobCoverage = covered.length / X.length;
    model.oobError = covered.length === 0 ? null : covered.filter(([p, i]) => (p > 0.5 ? 1 : 0) !== y[i]).length / covered.length;
  }
  return model;
}

export function bagging({ X, y, trees = 25, maxDepth = 8, minLeaf = 1, seed = 1, featureFraction = 1, bootstraps } = {}) {
  checkData(X, y);
  const n = X.length, d = X[0].length;
  if (!(featureFraction > 0 && featureFraction <= 1)) throw new RangeError('featureFraction must be in (0, 1]');
  let bags = bootstraps;
  if (bags == null) positiveInt(trees, 'trees');
  else {
    if (!Array.isArray(bags) || bags.length === 0) throw new RangeError('bootstraps must be a non-empty array of index arrays');
    for (const b of bags) if (!Array.isArray(b) || b.length === 0 || b.some(i => !Number.isInteger(i) || i < 0 || i >= n)) throw new RangeError('every bootstrap needs valid row indexes');
  }
  const random = rng(seed);
  const mtry = Math.max(1, Math.round(featureFraction * d));
  if (bags == null) bags = Array.from({ length: trees }, () => Array.from({ length: n }, () => Math.floor(random() * n)));
  const grown = bags.map(rows => growForestTree(rows.map(i => X[i]), rows.map(i => y[i]), { maxDepth, minLeaf, mtry, random }));
  return baggedModel(grown, bags, X, y);
}

export const randomForest = (opts = {}) => bagging({ featureFraction: 0.5, ...opts });

export function ensembleFromTrees(trees) {
  if (!Array.isArray(trees) || trees.length === 0) throw new Error('need at least one tree');
  for (const t of trees) if (!Array.isArray(t.classes)) throw new TypeError('every tree root needs classes (as fitTree gives)');
  return baggedModel(trees, null, null, null);
}

// ---------------------------------------------------------------- regression tree and boosting

export function fitRegressionTree(X, r, { maxDepth = 2, minLeaf = 1, leafValue, rows } = {}) {
  if (!Array.isArray(X) || !Array.isArray(r) || X.length !== r.length || X.length === 0) throw new Error('X and r must be non-empty arrays of the same length');
  const d = X[0].length;
  const leafMin = Math.max(1, Math.floor(minLeaf));
  const cap = Math.max(0, Math.floor(maxDepth));
  const mean = idx => idx.reduce((s, i) => s + r[i], 0) / idx.length;
  const value = leafValue || mean;

  function best(idx) {
    const n = idx.length;
    if (n < 2 * leafMin) return null;
    let total = 0;
    for (const i of idx) total += r[i];
    let found = null;
    for (let f = 0; f < d; f++) {
      const order = [...idx].sort((a, b) => X[a][f] - X[b][f] || a - b);
      let left = 0;
      for (let s = 0; s < n - 1; s++) {
        left += r[order[s]];
        const a = X[order[s]][f], b = X[order[s + 1]][f];
        const nl = s + 1, nr = n - nl;
        if (a === b || nl < leafMin || nr < leafMin) continue;
        let mid = (a + b) / 2;
        if (!(mid < b)) mid = a;
        const gain = left * left / nl + (total - left) * (total - left) / nr - total * total / n;
        if (gain > EPS && (found === null || gain > found.gain + EPS)) found = { feature: f, threshold: mid, gain };
      }
    }
    return found;
  }
  function grow(idx, depth) {
    const node = { leaf: true, depth, n: idx.length, mean: mean(idx), value: value(idx) };
    if (depth >= cap) return node;
    const found = best(idx);
    if (!found) return node;
    const sides = applySplit(idx.map(i => X[i]), found.feature, found.threshold);
    delete node.value;
    return Object.assign(node, {
      leaf: false, feature: found.feature, threshold: found.threshold, gain: found.gain,
      left: grow(sides.left.map(i => idx[i]), depth + 1),
      right: grow(sides.right.map(i => idx[i]), depth + 1),
    });
  }
  return grow(rows && rows.length ? rows : X.map((_, i) => i), 0);
}

export function predictRegression(node, x) {
  let n = node;
  while (!n.leaf) n = x[n.feature] <= n.threshold ? n.left : n.right;
  return n.value;
}

export function gradientBoost({ X, y, trees = 50, learningRate = 0.1, maxDepth = 2, minLeaf = 1, seed = 1, subsample = 1, leaf = 'newton' } = {}) {
  checkData(X, y);
  positiveInt(trees, 'trees');
  if (!(learningRate > 0 && Number.isFinite(learningRate))) throw new RangeError('learningRate must be a positive number');
  if (!(subsample > 0 && subsample <= 1)) throw new RangeError('subsample must be in (0, 1]');
  if (leaf !== 'newton' && leaf !== 'mean') throw new RangeError('leaf must be "newton" or "mean"');
  const n = X.length;
  const random = rng(seed);
  const base = Math.min(1 - 1e-6, Math.max(1e-6, y.reduce((s, v) => s + v, 0) / n));
  const initial = Math.log(base / (1 - base));
  const F = new Array(n).fill(initial);
  const stages = [];
  for (let t = 0; t < trees; t++) {
    const p = F.map(sigmoid);
    const residuals = y.map((v, i) => v - p[i]);
    const leafValue = leaf === 'mean' ? undefined : idx => {
      let num = 0, den = 0;
      for (const i of idx) { num += residuals[i]; den += p[i] * (1 - p[i]); }
      return den < 1e-12 ? 0 : num / den;
    };
    let rows;
    if (subsample < 1) rows = shuffle(Array.from({ length: n }, (_, i) => i), random).slice(0, Math.max(1, Math.round(subsample * n))).sort((a, b) => a - b);
    const tree = fitRegressionTree(X, residuals, { maxDepth, minLeaf, leafValue, rows });
    for (let i = 0; i < n; i++) F[i] += learningRate * predictRegression(tree, X[i]);
    stages.push({ tree, residuals });
  }
  const T = stages.length;
  const upTo = t => (t == null ? T : positiveInt(t, 'upTo', 0) > T ? T : t);
  const model = {
    kind: 'boost',
    nTrees: T,
    initial,
    learningRate,
    stages,
    predictRaw(x, t) {
      const m = upTo(t);
      let s = initial;
      for (let i = 0; i < m; i++) s += learningRate * predictRegression(stages[i].tree, x);
      return s;
    },
    predictProba(x, t) { return sigmoid(model.predictRaw(x, t)); },
    predict(x, t) { return model.predictProba(x, t) > 0.5 ? 1 : 0; },
    predictProbaAll(rows, t) { return rows.map(x => model.predictProba(x, t)); },
    predictAll(rows, t) { return rows.map(x => model.predict(x, t)); },
    stagedValidation(Xval, yval) {
      if (Xval.length !== yval.length) throw new Error('Xval and yval must have the same length');
      const raw = new Array(Xval.length).fill(initial);
      const at = [];
      for (const { tree } of stages) {
        Xval.forEach((x, i) => { raw[i] += learningRate * predictRegression(tree, x); });
        at.push(raw.map(sigmoid));
      }
      return scoreStages(at, yval);
    },
  };
  return model;
}

// ---------------------------------------------------------------- early stopping

export function earlyStopping(stagedValues, patience = Infinity) {
  if (!Array.isArray(stagedValues) || stagedValues.length === 0) throw new Error('need at least one validation value');
  if (!(patience >= 1)) throw new RangeError('patience must be at least 1');
  let best = 0;
  for (let t = 1; t < stagedValues.length; t++) {
    if (stagedValues[t] < stagedValues[best]) best = t;
    else if (t - best >= patience) break;
  }
  return best + 1;
}
