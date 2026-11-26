import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEATURES, makeTransactions, transactionXY, randomSplit, groupedSplit, temporalSplit, SPLITS, split,
  FITTERS, MODEL_NAMES, fit, costThreshold, auc, averagePrecision, confusionAt, evaluate, metricFns,
  bootstrapInterval, holdout,
} from './capstone2.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const range = n => Array.from({ length: n }, (_, i) => i);
const SEEDS = [1, 2, 3, 4, 5, 6];

// ---------------------------------------------------------------- data

test('makeTransactions: shape, time order, one row per customer slot', () => {
  const rows = makeTransactions({ customers: 12, perCustomer: 7, days: 30, seed: 3 });
  assert.equal(rows.length, 84);
  rows.forEach((r, i) => {
    assert.equal(r.id, i);
    assert.ok(Number.isInteger(r.customer) && r.customer >= 0 && r.customer < 12);
    assert.ok(Number.isInteger(r.day) && r.day >= 0 && r.day < 30);
    assert.ok(Number.isInteger(r.hour) && r.hour >= 0 && r.hour <= 23);
    assert.equal(r.t, r.day * 24 + r.hour);
    assert.ok(r.label === 0 || r.label === 1);
    assert.ok(r.merchantRisk >= 0 && r.merchantRisk <= 1);
    assert.ok(r.amount > 0);
    assert.deepEqual(r.features, [r.amount, r.hour, r.merchantRisk, r.quirk]);
    if (i) assert.ok(rows[i - 1].t <= r.t, 'rows must be in time order');
  });
  const per = new Array(12).fill(0);
  rows.forEach(r => per[r.customer]++);
  assert.ok(per.every(c => c === 7));
  assert.deepEqual(FEATURES, ['amount', 'hour', 'merchantRisk', 'quirk']);
});

test('makeTransactions: the same seed gives the same rows, another seed different ones', () => {
  const a = makeTransactions({ seed: 5 }), b = makeTransactions({ seed: 5 }), c = makeTransactions({ seed: 6 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.map(r => r.amount), c.map(r => r.amount));
});

test('makeTransactions: the label is rare and the rate follows fraudRate', () => {
  for (const rate of [0.05, 0.2]) {
    const rates = SEEDS.map(seed => mean(makeTransactions({ fraudRate: rate, seed }).map(r => r.label)));
    // customers differ a lot in how fraud-prone they are, so one dataset wobbles; the average is on target
    assert.ok(Math.abs(mean(rates) - rate) < 0.04, `${rate}: ${rates.join()}`);
  }
  const rows = makeTransactions({ customers: 2, perCustomer: 1, fraudRate: 0.01, seed: 9 });
  assert.ok(rows.some(r => r.label === 1) && rows.some(r => r.label === 0), 'both classes are always present');
});

test('makeTransactions: the quirk fingerprints a customer but says nothing across customers', () => {
  const rows = makeTransactions({ customers: 40, perCustomer: 20, seed: 2 });
  const byCustomer = new Map();
  rows.forEach(r => { if (!byCustomer.has(r.customer)) byCustomer.set(r.customer, []); byCustomer.get(r.customer).push(r.quirk); });
  const centers = [];
  for (const qs of byCustomer.values()) {
    assert.ok(Math.max(...qs) - Math.min(...qs) < 0.3, 'quirk is almost constant within a customer');
    centers.push(mean(qs));
  }
  const sorted = centers.slice().sort((a, b) => a - b);
  const gaps = sorted.slice(1).map((v, i) => v - sorted[i]);
  assert.ok(mean(gaps) > 0.1, 'customers sit at different quirk values');
  // across customers, the quirk is no linear predictor of a customer's fraud rate
  const rates = [...byCustomer.keys()].map(c => mean(rows.filter(r => r.customer === c).map(r => r.label)));
  const mc = mean(centers), mr = mean(rates);
  const cov = mean(centers.map((q, i) => (q - mc) * (rates[i] - mr)));
  const corr = cov / Math.sqrt(mean(centers.map(q => (q - mc) ** 2)) * mean(rates.map(r => (r - mr) ** 2)));
  assert.ok(Math.abs(corr) < 0.5, `corr ${corr}`);
});

test('makeTransactions: fraud has the real signal (larger amounts, riskier merchants, night hours)', () => {
  const rows = makeTransactions({ customers: 100, perCustomer: 20, fraudRate: 0.3, seed: 4 });
  const fraud = rows.filter(r => r.label), legit = rows.filter(r => !r.label);
  assert.ok(mean(fraud.map(r => Math.log(r.amount))) > mean(legit.map(r => Math.log(r.amount))));
  assert.ok(mean(fraud.map(r => r.merchantRisk)) > mean(legit.map(r => r.merchantRisk)) + 0.03);
  const night = rs => mean(rs.map(r => (r.hour <= 8 ? 1 : 0)));
  assert.ok(night(fraud) > night(legit) + 0.1);
  // signal 0 removes it
  const flat = makeTransactions({ customers: 100, perCustomer: 20, fraudRate: 0.3, seed: 4, signal: 0 });
  const f0 = flat.filter(r => r.label), l0 = flat.filter(r => !r.label);
  assert.ok(Math.abs(mean(f0.map(r => r.merchantRisk)) - mean(l0.map(r => r.merchantRisk))) < 0.03);
});

test('makeTransactions rejects impossible settings', () => {
  assert.throws(() => makeTransactions({ customers: 0 }), RangeError);
  assert.throws(() => makeTransactions({ perCustomer: 1.5 }), RangeError);
  assert.throws(() => makeTransactions({ days: -3 }), RangeError);
  assert.throws(() => makeTransactions({ customers: 1, perCustomer: 1 }), RangeError);
  assert.throws(() => makeTransactions({ fraudRate: 0 }), RangeError);
  assert.throws(() => makeTransactions({ fraudRate: 1 }), RangeError);
});

test('transactionXY lines the columns up with the rows', () => {
  const rows = makeTransactions({ customers: 5, perCustomer: 4, seed: 1 });
  const { X, y, groups, times } = transactionXY(rows);
  assert.equal(X.length, 20);
  assert.deepEqual(y, rows.map(r => r.label));
  assert.deepEqual(groups, rows.map(r => r.customer));
  assert.deepEqual(times, rows.map(r => r.t));
  assert.deepEqual(X[3], rows[3].features);
});

// ---------------------------------------------------------------- splitters

function assertPartition({ train, test }, n) {
  assert.deepEqual([...train, ...test].sort((a, b) => a - b), range(n), 'train + test must be every row once');
  assert.deepEqual(train, train.slice().sort((a, b) => a - b));
  assert.deepEqual(test, test.slice().sort((a, b) => a - b));
}

test('randomSplit: a partition of about one in four rows, seeded, with customers on both sides', () => {
  const rows = makeTransactions({ seed: 2 });
  const s = randomSplit(rows, { seed: 1 });
  assertPartition(s, rows.length);
  assert.equal(s.test.length, rows.length / 4);
  assert.deepEqual(s, randomSplit(rows, { seed: 1 }));
  assert.notDeepEqual(s.test, randomSplit(rows, { seed: 2 }).test);
  const trainCustomers = new Set(s.train.map(i => rows[i].customer));
  assert.ok(s.test.every(i => trainCustomers.has(rows[i].customer)), 'a random split leaks customers across the boundary');
  assert.equal(randomSplit(20, { testFraction: 0.5 }).test.length, 10);
});

test('groupedSplit: no customer is ever on both sides', () => {
  for (const seed of SEEDS) for (const testFraction of [0.2, 0.25, 0.5]) {
    const rows = makeTransactions({ customers: 31, perCustomer: 6, seed });
    const s = groupedSplit(rows, { seed, testFraction });
    assertPartition(s, rows.length);
    const trainCustomers = new Set(s.train.map(i => rows[i].customer));
    const testCustomers = new Set(s.test.map(i => rows[i].customer));
    for (const c of testCustomers) assert.ok(!trainCustomers.has(c), `customer ${c} on both sides (seed ${seed})`);
    assert.ok(Math.abs(s.test.length / rows.length - testFraction) < 0.08);
  }
  assert.throws(() => groupedSplit(10), TypeError);
  assert.throws(() => groupedSplit(makeTransactions({ customers: 3, perCustomer: 4 })), RangeError);
});

test('temporalSplit: train is the past, test is the latest block, never the other way round', () => {
  for (const seed of SEEDS) {
    const rows = makeTransactions({ seed });
    const s = temporalSplit(rows);
    assertPartition(s, rows.length);
    const trainT = s.train.map(i => rows[i].t), testT = s.test.map(i => rows[i].t);
    assert.ok(Math.max(...trainT) <= Math.min(...testT), 'training must not contain the future');
    assert.equal(s.train.length, 900);
    assert.equal(s.test.length, 300);
  }
});

test('temporalSplit orders by timestamp even when the rows arrive shuffled, and honours the gap', () => {
  const rows = makeTransactions({ customers: 10, perCustomer: 10, seed: 8 });
  const shuffled = rows.slice().reverse();
  const s = temporalSplit(shuffled);
  assertPartition(s, 100);
  assert.ok(Math.max(...s.train.map(i => shuffled[i].t)) <= Math.min(...s.test.map(i => shuffled[i].t)));
  const g = temporalSplit(rows, { gap: 5 });
  assert.equal(g.train.length + g.test.length, 95);
  assert.equal(g.train.length, 70);
  // hand-checked on a plain row count: 8 rows, one in four -> train 0..5, test 6..7
  assert.deepEqual(temporalSplit(8), { train: [0, 1, 2, 3, 4, 5], test: [6, 7] });
  assert.deepEqual(temporalSplit(12), { train: [0, 1, 2, 3, 4, 5, 6, 7, 8], test: [9, 10, 11] });
  assert.deepEqual(temporalSplit(12, { gap: 2 }), { train: [0, 1, 2, 3, 4, 5, 6], test: [9, 10, 11] });
  assert.throws(() => temporalSplit(8, { gap: 2 }), RangeError, 'a gap that empties the training set is refused');
});

test('split dispatches by name and refuses a bad name or fraction', () => {
  const rows = makeTransactions({ customers: 20, perCustomer: 5, seed: 1 });
  assert.deepEqual(Object.keys(SPLITS), ['random', 'grouped', 'temporal']);
  assert.deepEqual(split('grouped', rows, { seed: 3 }), groupedSplit(rows, { seed: 3 }));
  assert.deepEqual(split('temporal', rows), temporalSplit(rows));
  assert.throws(() => split('bogus', rows), RangeError);
  assert.throws(() => split('toString', rows), RangeError);
  assert.throws(() => randomSplit(rows, { testFraction: 0.9 }), RangeError);
  assert.throws(() => randomSplit(rows, { testFraction: 0 }), RangeError);
});

// ---------------------------------------------------------------- cost threshold and metrics

test('costThreshold: flag when p * fnCost >= (1 - p) * fpCost, i.e. p >= fp / (fp + fn)', () => {
  assert.equal(costThreshold(1, 1), 0.5);
  assert.equal(costThreshold(1, 9), 0.1);
  close(costThreshold(1, 5), 1 / 6);
  close(costThreshold(2, 3), 0.4);
  assert.equal(costThreshold(0, 5), 0);       // false alarms are free: flag everything
  assert.equal(costThreshold(5, 0), 1);       // misses are free: flag only a certain fraud
  // the threshold is exactly where flagging and not flagging cost the same
  const t = costThreshold(2, 3);
  close(t * 3, (1 - t) * 2);
  assert.throws(() => costThreshold(0, 0), RangeError);
  assert.throws(() => costThreshold(-1, 2), RangeError);
  assert.throws(() => costThreshold(1, NaN), RangeError);
});

test('auc and averagePrecision, hand computed', () => {
  const p = [0.9, 0.8, 0.3, 0.1, 0.05, 0.6], y = [1, 0, 1, 0, 0, 1];
  // fraud scores 0.9, 0.3, 0.6 against legit 0.8, 0.1, 0.05: 3 + 2 + 2 of 9 pairs won
  close(auc(p, y), 7 / 9);
  // ranked 0.9(1) 0.8(0) 0.6(1) 0.3(1) 0.1(0) 0.05(0): precision at the fraud rows 1, 2/3, 3/4
  close(averagePrecision(p, y), (1 + 2 / 3 + 3 / 4) / 3);
  // a perfect ranking
  close(auc([0.9, 0.8, 0.2, 0.1], [1, 1, 0, 0]), 1);
  close(averagePrecision([0.9, 0.8, 0.2, 0.1], [1, 1, 0, 0]), 1);
  // fully inverted
  close(auc([0.1, 0.2, 0.8, 0.9], [1, 1, 0, 0]), 0);
  // ties count half: every score equal is a coin flip, and AP is the base rate
  close(auc([0.5, 0.5, 0.5, 0.5], [1, 0, 0, 1]), 0.5);
  close(averagePrecision([0.5, 0.5, 0.5, 0.5], [1, 0, 0, 1]), 0.5);
  // one tie across classes: fraud 0.7, legit 0.7 and 0.2 -> (0.5 + 1) / 2
  close(auc([0.7, 0.7, 0.2], [1, 0, 0]), 0.75);
  assert.ok(Number.isNaN(auc([0.1, 0.2], [0, 0])));
  assert.ok(Number.isNaN(auc([0.1, 0.2], [1, 1])));
  assert.ok(Number.isNaN(averagePrecision([0.1, 0.2], [0, 0])));
});

test('confusionAt flags p >= threshold (an exact tie is flagged)', () => {
  assert.deepEqual(confusionAt([0.5, 0.5, 0.49, 0.9], [1, 0, 1, 0], 0.5), { tp: 1, fp: 2, tn: 0, fn: 1 });
});

test('evaluate: confusion, cost at the cost threshold and the two do-nothing costs', () => {
  const p = [0.9, 0.8, 0.3, 0.1, 0.05, 0.6], y = [1, 0, 1, 0, 0, 1];
  // fpCost 1, fnCost 4 -> threshold 0.2: flag 0.9, 0.8, 0.3, 0.6
  const e = evaluate(p, y, { fpCost: 1, fnCost: 4 });
  close(e.threshold, 0.2);
  assert.deepEqual(e.confusion, { tp: 3, fp: 1, tn: 2, fn: 0 });
  assert.equal(e.totalCost, 1);
  close(e.expectedCost, 1 / 6);
  close(e.precision, 0.75);
  close(e.recall, 1);
  assert.equal(e.n, 6);
  assert.equal(e.positives, 3);
  close(e.auc, 7 / 9);
  assert.equal(e.costFlagNone, 12);   // 3 frauds missed at 4 each
  assert.equal(e.costFlagAll, 3);     // 3 legitimate flagged at 1 each
  // dearer false alarms -> threshold 0.75: only 0.9 and 0.8 flagged, two frauds missed
  const e2 = evaluate(p, y, { fpCost: 3, fnCost: 1 });
  close(e2.threshold, 0.75);
  assert.deepEqual(e2.confusion, { tp: 1, fp: 1, tn: 2, fn: 2 });
  assert.equal(e2.totalCost, 3 * 1 + 2 * 1);
  close(e2.expectedCost, 5 / 6);
  // defaults: fpCost 1, fnCost 10
  close(evaluate(p, y).threshold, 1 / 11);
  assert.throws(() => evaluate([0.1], [0, 1]), RangeError);
});

test('the cost threshold really is the cheapest cut-off for calibrated probabilities', () => {
  // 1000 rows whose probability is the true fraud probability: no other cut-off should cost less (on average)
  const probas = [], labels = [];
  const grid = [0.02, 0.05, 0.1, 0.2, 0.4, 0.7];
  for (const p of grid) for (let i = 0; i < 1000; i++) { probas.push(p); labels.push(i < Math.round(p * 1000) ? 1 : 0); }
  const fpCost = 1, fnCost = 5;
  const costAt = th => { const c = confusionAt(probas, labels, th); return c.fp * fpCost + c.fn * fnCost; };
  const best = evaluate(probas, labels, { fpCost, fnCost }).totalCost;
  for (const th of [0.01, 0.03, 0.08, 0.15, 0.3, 0.5, 0.9]) assert.ok(best <= costAt(th), `threshold ${th}`);
});

// ---------------------------------------------------------------- fitters

test('baseline gives every row the training prior', () => {
  const m = fit('baseline', [[1], [2], [3], [4]], [0, 0, 0, 1]);
  assert.deepEqual(m.predictProba([[9], [9]]), [0.25, 0.25]);
  assert.equal(m.prior, 0.25);
  close(auc(m.predictProba([[1], [2], [3], [4]]), [0, 0, 0, 1]), 0.5);
});

test('tree: the probability is the share of fraud in the leaf (hand computed)', () => {
  // split at 0.5 -> left leaf {0,1}, right leaf {1,1,0}
  const X = [[0], [0], [1], [1], [1]], y = [0, 1, 1, 1, 0];
  const m = fit('tree', X, y, { maxDepth: 1, minLeaf: 1 });
  const p = m.predictProba([[0], [1], [5], [-5]]);
  close(p[0], 0.5);
  close(p[1], 2 / 3);
  close(p[2], 2 / 3);
  close(p[3], 0.5);
  // a tree that never saw a fraud case predicts 0, not NaN
  assert.deepEqual(fit('tree', [[1], [2], [3]], [0, 0, 0]).predictProba([[1], [9]]), [0, 0]);
  // a pure split gives hard 0 and 1
  assert.deepEqual(fit('tree', [[0], [1], [2], [3]], [0, 0, 1, 1], { maxDepth: 1, minLeaf: 1 }).predictProba([[0], [1], [2], [3]]), [0, 0, 1, 1]);
});

test('logistic and forest give probabilities in [0, 1] and learn the signal; forest is seeded', () => {
  const rows = makeTransactions({ customers: 80, perCustomer: 20, fraudRate: 0.2, seed: 2 });
  const { X, y } = transactionXY(rows);
  for (const name of ['logistic', 'tree', 'forest']) {
    const m = fit(name, X, y);
    const p = m.predictProba(X);
    assert.equal(p.length, X.length);
    assert.ok(p.every(v => v >= 0 && v <= 1), name);
    assert.ok(auc(p, y) > 0.7, `${name} learns something on its own training rows`);
  }
  assert.deepEqual(fit('forest', X, y, { seed: 4 }).predictProba(X.slice(0, 30)), fit('forest', X, y, { seed: 4 }).predictProba(X.slice(0, 30)));
  assert.notDeepEqual(fit('forest', X, y, { seed: 4 }).predictProba(X.slice(0, 30)), fit('forest', X, y, { seed: 5 }).predictProba(X.slice(0, 30)));
});

test('the registry lists the four models and fit rejects bad input', () => {
  assert.deepEqual(MODEL_NAMES, ['baseline', 'logistic', 'tree', 'forest']);
  assert.deepEqual(Object.keys(FITTERS), MODEL_NAMES);
  assert.throws(() => fit('svm', [[1]], [0]), RangeError);
  assert.throws(() => fit('toString', [[1]], [0]), RangeError);
  assert.throws(() => fit('tree', [], []), RangeError);
  assert.throws(() => fit('tree', [[1], [2]], [0]), RangeError);
});

// ---------------------------------------------------------------- the split decides the score

function heldOutAuc(seed, how, model) {
  const rows = makeTransactions({ seed });
  return holdout(rows, { split: how, model, seed, B: 5 }).evaluation.auc;
}

test('a random split is optimistic: the forest scores clearly better than on unseen customers', () => {
  const gaps = SEEDS.map(seed => heldOutAuc(seed, 'random', 'forest') - heldOutAuc(seed, 'grouped', 'forest'));
  assert.ok(mean(gaps) > 0.05, `mean gap ${mean(gaps)} (${gaps.join()})`);
  assert.ok(gaps.every(g => g > 0), `every seed shows the optimism: ${gaps.join()}`);
});

test('a linear model has little to leak: its random-vs-grouped gap is much smaller than the forest\'s', () => {
  const lin = SEEDS.map(seed => heldOutAuc(seed, 'random', 'logistic') - heldOutAuc(seed, 'grouped', 'logistic'));
  const forest = SEEDS.map(seed => heldOutAuc(seed, 'random', 'forest') - heldOutAuc(seed, 'grouped', 'forest'));
  assert.ok(mean(lin) < mean(forest) - 0.05, `${mean(lin)} vs ${mean(forest)}`);
});

test('honest scores still beat the baseline: the real signal transfers to unseen customers', () => {
  const g = SEEDS.map(seed => heldOutAuc(seed, 'grouped', 'logistic'));
  assert.ok(mean(g) > 0.7, g.join());
  assert.ok(SEEDS.every(seed => heldOutAuc(seed, 'grouped', 'baseline') === 0.5));
});

// ---------------------------------------------------------------- uncertainty

test('bootstrapInterval: contains the point estimate, is ordered and is reproducible', () => {
  for (const seed of SEEDS) {
    const rows = makeTransactions({ seed });
    const h = holdout(rows, { split: 'grouped', model: 'logistic', seed, B: 5 });
    for (const metric of [metricFns.auc, metricFns.averagePrecision, metricFns.cost({ fpCost: 1, fnCost: 10 })]) {
      const iv = bootstrapInterval(metric, h.labels, h.probas, { B: 200, seed });
      assert.ok(iv.lo <= iv.estimate + 1e-12 && iv.estimate <= iv.hi + 1e-12, `${seed}: ${iv.lo} ${iv.estimate} ${iv.hi}`);
      assert.ok(iv.lo < iv.hi);
      assert.ok(iv.used >= 180 && iv.used <= 200, `a few resamples may hold no fraud and be skipped: ${iv.used}`);
      assert.equal(iv.values.length, iv.used);
    }
  }
  const labels = [1, 0, 1, 0, 0, 0, 1, 0, 0, 0], probas = [0.9, 0.2, 0.4, 0.5, 0.1, 0.3, 0.8, 0.2, 0.6, 0.1];
  assert.deepEqual(bootstrapInterval(metricFns.auc, labels, probas, { seed: 3 }), bootstrapInterval(metricFns.auc, labels, probas, { seed: 3 }));
  assert.notDeepEqual(bootstrapInterval(metricFns.auc, labels, probas, { seed: 3 }).values, bootstrapInterval(metricFns.auc, labels, probas, { seed: 4 }).values);
  close(bootstrapInterval(metricFns.auc, labels, probas).estimate, auc(probas, labels));
});

test('bootstrapInterval: a constant metric has a zero-width interval; a mean metric matches the formula', () => {
  const labels = [0, 1, 0, 1], probas = [0.1, 0.2, 0.3, 0.4];
  const flat = bootstrapInterval(() => 0.7, labels, probas, { B: 50 });
  assert.equal(flat.lo, 0.7);
  assert.equal(flat.hi, 0.7);
  // metric = mean of the probas over resampled rows: centred on 0.25 with SE about sd / sqrt(n)
  const m = bootstrapInterval((y, p) => mean(p), labels, probas, { B: 2000, seed: 2 });
  close(m.estimate, 0.25);
  const sd = Math.sqrt(mean(probas.map(p => (p - 0.25) ** 2)));
  const approxHalfWidth = 1.96 * sd / 2;
  assert.ok(Math.abs((m.hi - m.lo) / 2 - approxHalfWidth) < 0.02, `${(m.hi - m.lo) / 2} vs ${approxHalfWidth}`);
});

test('bootstrapInterval: more held-out rows give a narrower interval; resamples without fraud are skipped', () => {
  const small = makeTransactions({ customers: 20, perCustomer: 10, fraudRate: 0.2, seed: 1 });
  const big = makeTransactions({ customers: 200, perCustomer: 20, fraudRate: 0.2, seed: 1 });
  const width = rows => {
    const h = holdout(rows, { split: 'grouped', model: 'logistic', seed: 1, B: 5 });
    const iv = bootstrapInterval(metricFns.auc, h.labels, h.probas, { B: 300, seed: 1 });
    return iv.hi - iv.lo;
  };
  assert.ok(width(big) < width(small), 'more rows, narrower interval');
  // 1 fraud in 10 rows: about a third of the resamples have none, and the metric cannot score those
  const labels = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0], probas = [0.9, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.05];
  const iv = bootstrapInterval(metricFns.auc, labels, probas, { B: 500, seed: 7 });
  assert.ok(iv.used < 500 && iv.used > 200, `used ${iv.used}`);
  assert.ok(iv.values.every(Number.isFinite));
  const none = bootstrapInterval(metricFns.auc, [0, 0, 0], [0.1, 0.2, 0.3], { B: 20 });
  assert.equal(none.used, 0);
  assert.ok(Number.isNaN(none.lo) && Number.isNaN(none.hi) && Number.isNaN(none.estimate));
});

test('bootstrapInterval rejects bad input', () => {
  assert.throws(() => bootstrapInterval('auc', [1], [0.5]), TypeError);
  assert.throws(() => bootstrapInterval(metricFns.auc, [1, 0], [0.5]), RangeError);
  assert.throws(() => bootstrapInterval(metricFns.auc, [], []), RangeError);
  assert.throws(() => bootstrapInterval(metricFns.auc, [1, 0], [0.5, 0.2], { B: 0 }), RangeError);
});

// ---------------------------------------------------------------- holdout

test('holdout runs split, fit, evaluate and bootstrap, and is reproducible', () => {
  const rows = makeTransactions({ seed: 1 });
  const h = holdout(rows, { split: 'temporal', model: 'tree', B: 50, fpCost: 2, fnCost: 8 });
  assert.equal(h.split, 'temporal');
  assert.equal(h.model, 'tree');
  assert.equal(h.probas.length, h.test.length);
  assert.deepEqual(h.labels, h.test.map(i => rows[i].label));
  assert.equal(h.evaluation.n, h.test.length);
  close(h.evaluation.threshold, 0.2);
  assert.equal(h.interval.B, 50);
  close(h.interval.estimate, h.evaluation.auc);
  assert.deepEqual(h, holdout(rows, { split: 'temporal', model: 'tree', B: 50, fpCost: 2, fnCost: 8 }));
  assert.throws(() => holdout(rows, { split: 'nope' }), RangeError);
  assert.throws(() => holdout(rows, { model: 'nope' }), RangeError);
});
