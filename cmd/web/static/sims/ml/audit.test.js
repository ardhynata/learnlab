import test from 'node:test';
import assert from 'node:assert/strict';
import {
  subgroupMetrics, gaps, GAP_METRICS, accuracyScore, fitAuditModel, permutationImportance, shapley, makeAuditData,
} from './audit.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

// Eight rows, two groups of four. Counted by hand:
//   A: y = 1 1 0 0, pred = 1 0 1 0  -> tp 1, fn 1, fp 1, tn 1
//   B: y = 1 1 0 0, pred = 1 1 1 0  -> tp 2, fn 0, fp 1, tn 1
const yTrue = [1, 1, 0, 0, 1, 1, 0, 0];
const yPred = [1, 0, 1, 0, 1, 1, 1, 0];
const groups = ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B'];

test('subgroupMetrics: an 8-row table, every number by hand', () => {
  const rows = subgroupMetrics(yTrue, yPred, groups);
  assert.deepEqual(rows.map(r => r.group), ['A', 'B']);
  const [a, b] = rows;
  assert.deepEqual([a.n, a.tp, a.fp, a.tn, a.fn], [4, 1, 1, 1, 1]);
  assert.deepEqual([b.n, b.tp, b.fp, b.tn, b.fn], [4, 2, 1, 1, 0]);
  assert.deepEqual([a.positives, a.predictedPositives, b.positives, b.predictedPositives], [2, 2, 2, 3]);
  close(a.accuracy, 0.5); close(a.precision, 0.5); close(a.recall, 0.5); close(a.fpr, 0.5);
  close(a.positiveRate, 0.5); close(a.baseRate, 0.5);
  close(b.accuracy, 0.75); close(b.precision, 2 / 3); close(b.recall, 1); close(b.fpr, 0.5);
  close(b.positiveRate, 0.75); close(b.baseRate, 0.5);
  assert.deepEqual(b.undefined, { precision: false, recall: false, fpr: false });
});

test('gaps: the largest difference per metric, with who holds each end', () => {
  const g = gaps(subgroupMetrics(yTrue, yPred, groups));
  assert.deepEqual(Object.keys(g), GAP_METRICS);
  close(g.accuracy.gap, 0.25); assert.equal(g.accuracy.max.group, 'B'); assert.equal(g.accuracy.min.group, 'A');
  close(g.precision.gap, 2 / 3 - 0.5);
  close(g.recall.gap, 0.5); assert.equal(g.recall.max.group, 'B');
  close(g.fpr.gap, 0);
  close(g.positiveRate.gap, 0.25);
});

test('subgroupMetrics: 0/0 ratios are null and flagged, never NaN; gaps skip them', () => {
  // Group C has no actual positives and predicts none: precision and recall are undefined.
  const rows = subgroupMetrics([1, 0, 0, 0], [1, 0, 0, 0], ['A', 'C', 'C', 'C']);
  const c = rows.find(r => r.group === 'C');
  assert.equal(c.precision, null); assert.equal(c.recall, null); assert.equal(c.fpr, 0);
  assert.deepEqual(c.undefined, { precision: true, recall: true, fpr: false });
  const g = gaps(rows);
  assert.equal(g.recall.gap, null); // only group A has a recall
  close(g.accuracy.gap, 0);
  assert.deepEqual(gaps([rows[0]]).accuracy, { gap: null, max: null, min: null });
});

test('subgroupMetrics: groups keep first-appearance order, booleans accepted, bad input throws', () => {
  const rows = subgroupMetrics([true, false, true], [true, true, false], ['z', 'a', 'z']);
  assert.deepEqual(rows.map(r => r.group), ['z', 'a']);
  assert.throws(() => subgroupMetrics([1, 0], [1], ['a', 'b']), /same length/);
  assert.throws(() => subgroupMetrics([2], [1], ['a']), /0 or 1/);
});

test('shapley: a linear model gives coefficient times deviation from the background mean', () => {
  const w = [2, -3, 0.5], b0 = 1;
  const f = r => b0 + w[0] * r[0] + w[1] * r[1] + w[2] * r[2];
  const background = [[0, 1, 2], [2, 3, 4], [1, 2, 0], [1, 2, 6]]; // mean [1, 2, 3]
  const x = [4, -1, 5];
  const s = shapley(f, x, background);
  assert.deepEqual(s.baselinePoint, [1, 2, 3]);
  close(s.baselineValue, f([1, 2, 3]));
  close(s.values[0], 2 * (4 - 1)); close(s.values[1], -3 * (-1 - 2)); close(s.values[2], 0.5 * (5 - 3));
  assert.ok(s.efficient);
});

test('shapley: efficiency holds for a nonlinear model with interactions (sum = f(x) - f(baseline))', () => {
  const f = r => Math.sin(r[0]) * r[1] + r[2] * r[2] * r[3] - 0.5 * r[0] * r[3] + Math.exp(r[4] / 3);
  const background = [[0, 1, 0, 2, 1], [1, 0, 2, 1, 0], [2, 2, 1, 0, 2], [-1, 1, -1, 1, 3]];
  for (const x of [[1, 2, 3, 4, 5], [-2, 0.5, 1, -1, 0], [0.3, 0.3, 0.3, 0.3, 0.3]]) {
    const s = shapley(f, x, background);
    close(s.sum, f(x) - f(s.baselinePoint), 1e-9);
    close(s.gap, 0, 1e-9);
    assert.ok(s.efficient);
    assert.equal(s.values.length, 5);
  }
});

test('shapley: a pure interaction x0 * x1 splits the credit evenly; a dummy feature gets 0', () => {
  const f = r => r[0] * r[1];
  const s = shapley(f, [2, 3, 7], [[-1, -1, 0], [1, 1, 4]]); // baseline [0, 0, 2]; column 2 is unused
  close(s.values[0], 3); close(s.values[1], 3); close(s.values[2], 0);
  close(s.sum, 6);
});

test('shapley: features subset keeps the others at the baseline; limit of 8; model object accepted', () => {
  const f = r => r[0] + 10 * r[1] + 100 * r[2];
  const s = shapley({ scoreRow: f }, [1, 1, 1], [[0, 0, 0]], [0, 2]);
  assert.deepEqual(s.features, [0, 2]);
  close(s.values[0], 1); close(s.values[1], 100);
  close(s.fx, 101); // column 1 stayed at the baseline 0
  assert.throws(() => shapley(f, Array(9).fill(1), [Array(9).fill(0)]), /1 to 8/);
  assert.throws(() => shapley(f, [1, 1, 1], []), /background/);
  assert.throws(() => shapley(42, [1], [[0]]), /function/);
  // eight features is allowed: 256 evaluations
  const eight = shapley(r => r.reduce((a, v) => a + v * v, 0), Array(8).fill(2), [Array(8).fill(0)]);
  eight.values.forEach(v => close(v, 4));
});

test('makeAuditData: shape, determinism, group base rates and feature correlation', () => {
  const d = makeAuditData({ n: 4000, seed: 7 });
  assert.equal(d.X.length, 4000); assert.equal(d.y.length, 4000); assert.equal(d.group.length, 4000);
  assert.deepEqual(d.featureNames, ['signal_a', 'signal_b', 'independent', 'noise']);
  assert.ok(d.X.every(r => r.length === 4 && r.every(Number.isFinite)));
  assert.deepEqual(makeAuditData({ n: 50, seed: 3 }), makeAuditData({ n: 50, seed: 3 }));
  assert.notDeepEqual(makeAuditData({ n: 50, seed: 3 }).X, makeAuditData({ n: 50, seed: 4 }).X);
  const share = g => d.group.filter(v => v === g).length / d.group.length;
  assert.ok(Math.abs(share('B') - 0.3) < 0.04, String(share('B')));
  const rate = g => { const idx = d.group.map((v, i) => (v === g ? i : -1)).filter(i => i >= 0); return idx.reduce((s, i) => s + d.y[i], 0) / idx.length; };
  assert.ok(rate('A') - rate('B') > 0.2, `${rate('A')} vs ${rate('B')}`);
  assert.ok(rate('A') > 0.5 && rate('B') < 0.4);
  const corr = (j, k) => {
    const mj = d.X.reduce((s, r) => s + r[j], 0) / d.X.length, mk = d.X.reduce((s, r) => s + r[k], 0) / d.X.length;
    let c = 0, vj = 0, vk = 0;
    for (const r of d.X) { c += (r[j] - mj) * (r[k] - mk); vj += (r[j] - mj) ** 2; vk += (r[k] - mk) ** 2; }
    return c / Math.sqrt(vj * vk);
  };
  assert.ok(Math.abs(corr(0, 1) - 0.95) < 0.03, String(corr(0, 1)));
  assert.ok(Math.abs(corr(0, 2)) < 0.06);
  const lo = makeAuditData({ n: 4000, seed: 7, correlation: 0.5 });
  const cl = (() => { const a = lo.X.map(r => r[0]), b = lo.X.map(r => r[1]); const ma = a.reduce((s, v) => s + v) / a.length, mb = b.reduce((s, v) => s + v) / b.length; let c = 0, va = 0, vb = 0; a.forEach((v, i) => { c += (v - ma) * (b[i] - mb); va += (v - ma) ** 2; vb += (b[i] - mb) ** 2; }); return c / Math.sqrt(va * vb); })();
  assert.ok(Math.abs(cl - 0.5) < 0.04, String(cl));
  const small = makeAuditData({ n: 2000, seed: 1, groupBalance: 0.1 });
  assert.ok(small.group.filter(v => v === 'B').length < 300);
  assert.throws(() => makeAuditData({ correlation: 0 }), /correlation/);
  assert.throws(() => makeAuditData({ groupBalance: 1 }), /groupBalance/);
});

test('permutationImportance: a feature the model ignores scores exactly 0, a used one drops the metric', () => {
  const X = Array.from({ length: 40 }, (_, i) => [i % 2, (i * 7) % 5]);
  const y = X.map(r => r[0]);
  const model = rows => rows.map(r => r[0]); // reads column 0 only
  const snapshot = JSON.stringify(X);
  const res = permutationImportance(model, X, y, 'accuracy', { repeats: 12, seed: 4 });
  assert.equal(res.baseline, 1);
  assert.equal(res.results[1].mean, 0); assert.equal(res.results[1].sd, 0);
  assert.ok(res.results[0].mean > 0.3 && res.results[0].mean < 0.7, String(res.results[0].mean));
  assert.ok(res.results[0].sd > 0);
  assert.equal(res.results[0].drops.length, 12);
  assert.equal(JSON.stringify(X), snapshot, 'X must not be modified');
  // same seed, same answer; another seed, another shuffle
  assert.deepEqual(permutationImportance(model, X, y, 'accuracy', { repeats: 12, seed: 4 }), res);
  assert.notDeepEqual(permutationImportance(model, X, y, 'accuracy', { repeats: 12, seed: 5 }).results[0].drops, res.results[0].drops);
});

test('permutationImportance: custom metric, proba metric, feature groups and errors', () => {
  const X = [[1, 1], [0, 1], [1, 0], [0, 0], [1, 1], [0, 0]];
  const y = [1, 0, 1, 0, 1, 0];
  const model = { predict: rows => rows.map(r => r[0]), predictProba: rows => rows.map(r => (r[0] ? 0.9 : 0.1)) };
  const custom = permutationImportance(model, X, y, (t, p) => -t.reduce((s, v, i) => s + Math.abs(v - p[i]), 0), { repeats: 5, seed: 1 });
  assert.equal(custom.metric, 'custom'); close(custom.baseline, 0);
  assert.ok(custom.results[0].mean > 0 && custom.results[1].mean === 0);
  const ll = permutationImportance(model, X, y, 'neglogloss', { repeats: 5, seed: 1 });
  close(ll.baseline, Math.log(0.9));
  assert.ok(ll.results[0].mean > 0 && ll.results[1].mean === 0);
  const grp = permutationImportance(model, X, y, 'accuracy', { repeats: 5, seed: 1, features: [[0, 1], 1] });
  assert.deepEqual(grp.results[0].columns, [0, 1]); assert.deepEqual(grp.results[0].feature, [0, 1]); assert.equal(grp.results[1].feature, 1);
  assert.throws(() => permutationImportance(model, X, y, 'bogus'), /unknown metric/);
  assert.throws(() => permutationImportance({}, X, y), /predict/);
  assert.throws(() => permutationImportance(model, X, y.slice(1)), /same length/);
  close(accuracyScore([1, 0, 1], [1, 1, 1]), 2 / 3); assert.equal(accuracyScore([], []), 0);
});

test('permutationImportance: two near-duplicate features split the credit (fixed seeds, with margins)', () => {
  for (const seed of [1, 2, 3]) {
    const d = makeAuditData({ n: 800, seed, correlation: 0.95 });
    const model = fitAuditModel(d.X, d.y);
    const res = permutationImportance(model, d.X, d.y, 'accuracy', { repeats: 20, seed: 5, features: [0, 1, 2, 3, [0, 1]] });
    const [a, b, indep, noise, joint] = res.results.map(r => r.mean);
    // Each copy alone costs little, because the other still carries the signal ...
    assert.ok(joint > 2 * a, `seed ${seed}: joint ${joint} vs a ${a}`);
    assert.ok(joint > 2 * b, `seed ${seed}: joint ${joint} vs b ${b}`);
    assert.ok(joint > 1.2 * (a + b), `seed ${seed}: joint ${joint} vs a+b ${a + b}`);
    // ... so a single copy looks no more important than the weak independent signal, though the signal itself dominates.
    assert.ok(Math.max(a, b) < 2.5 * indep, `seed ${seed}: ${a} ${b} vs ${indep}`);
    assert.ok(joint > 3 * indep, `seed ${seed}: joint ${joint} vs indep ${indep}`);
    assert.ok(Math.abs(noise) < 0.015, `seed ${seed}: noise ${noise}`);
    // The weights are shared between the copies too (no one copy takes it all).
    const [wa, wb] = model.fit.weights;
    assert.ok(Math.min(wa, wb) > 0.25 * Math.max(wa, wb), `${wa} ${wb}`);
  }
});

test('fitAuditModel: logistic and tree models audit end to end; shapley efficiency on the fitted model', () => {
  const d = makeAuditData({ n: 600, seed: 11 });
  const lm = fitAuditModel(d.X, d.y);
  assert.equal(lm.kind, 'logistic');
  assert.ok(accuracyScore(d.y, lm.predict(d.X)) > 0.7);
  close(lm.scoreRow(d.X[0]), lm.predictProba([d.X[0]])[0]);
  close(lm.logOddsRow(d.X[0]), Math.log(lm.scoreRow(d.X[0]) / (1 - lm.scoreRow(d.X[0]))));
  const s = shapley(lm, d.X[3], d.X);
  assert.ok(s.efficient);
  close(s.sum, lm.scoreRow(d.X[3]) - lm.scoreRow(s.baselinePoint));
  const sl = shapley(r => lm.logOddsRow(r), d.X[3], d.X);
  assert.ok(sl.efficient);
  // for a logistic model in log-odds the attribution is exactly weight * deviation (in the standardized space)
  const { mean, std, weights } = lm.fit;
  sl.values.forEach((v, j) => close(v, weights[j] * (d.X[3][j] - sl.baselinePoint[j]) / std[j], 1e-9));
  assert.ok(mean.length === 4);
  const tm = fitAuditModel(d.X, d.y, { kind: 'tree', maxDepth: 3 });
  assert.equal(tm.kind, 'tree');
  assert.ok(accuracyScore(d.y, tm.predict(d.X)) > 0.7);
  assert.ok(shapley(tm, d.X[5], d.X).efficient);
  assert.throws(() => fitAuditModel(d.X, d.y, { kind: 'forest' }), /unknown model kind/);
});

test('a model fitted on everybody errs differently in the two groups', () => {
  const d = makeAuditData({ n: 3000, seed: 2 });
  const m = fitAuditModel(d.X, d.y);
  const rows = subgroupMetrics(d.y, m.predict(d.X), d.group);
  const [a, b] = ['A', 'B'].map(g => rows.find(r => r.group === g));
  assert.equal(a.n + b.n, 3000);
  const g = gaps(rows);
  assert.ok(g.positiveRate.gap > 0.15, String(g.positiveRate.gap)); // group A is flagged far more often
  assert.ok(g.fpr.gap > 0.03 && g.recall.gap > 0.03, `${g.fpr.gap} ${g.recall.gap}`);
  assert.ok(a.positiveRate > b.positiveRate && a.fpr > b.fpr);
});
