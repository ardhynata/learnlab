import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEATURE_ORDER_GENERATED, PENGUIN_ORDER, makeCandidateData, penguinCandidates, holdoutSplit, makeEvaluator,
  gainVerdict, forwardSteps, ablationRows, leakCheck, scoreAxis,
} from './ablationlab.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

// A table with one row per category and labels that no feature predicts: the clearest possible leak.
function uniqueCategories(n = 40) {
  const y = Array.from({ length: n }, (_, i) => ((i * 7) % 11 < 5 ? 1 : 0));
  return {
    n, y, numeric: {}, category: { id: Array.from({ length: n }, (_, i) => 'c' + i) },
    order: ['id'], kinds: { id: 'category' }, total: n, dropped: 0,
  };
}

test('makeCandidateData: reproducible, every column the right length, product column is u * v', () => {
  const a = makeCandidateData({ seed: 3 }), b = makeCandidateData({ seed: 3 }), c = makeCandidateData({ seed: 4 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.y, c.y);
  assert.equal(a.n, 400);
  assert.deepEqual(a.order, FEATURE_ORDER_GENERATED);
  for (const key of a.order) {
    const col = key in a.numeric ? a.numeric[key] : a.category[key];
    assert.equal(col.length, a.n, key);
    assert.ok(key in a.kinds, key);
  }
  assert.ok(a.y.every(v => v === 0 || v === 1));
  a.numeric.u_v.forEach((p, i) => close(p, a.numeric.u[i] * a.numeric.v[i]));
  assert.ok(new Set(a.category.region).size > 100, 'the category is high-cardinality');
});

test('penguinCandidates drops rows with NA, engineers the ratio and square, frequency-encodes the island', () => {
  const row = (extra) => ({ species: 'Adelie', island: 'A', bill_length_mm: 40, bill_depth_mm: 20, flipper_length_mm: 200, body_mass_g: 4000, sex: 'male', year: 2008, ...extra });
  const table = { rows: [row({}), row({ sex: 'female', island: 'A' }), row({ island: 'B', bill_length_mm: 30 }), row({ sex: null }), row({ flipper_length_mm: null })] };
  const t = penguinCandidates(table);
  assert.equal(t.n, 3);
  assert.equal(t.total, 5);
  assert.equal(t.dropped, 2);
  assert.deepEqual(t.y, [1, 0, 1]);
  assert.deepEqual(t.numeric.bill_ratio, [2, 2, 1.5]);
  assert.deepEqual(t.numeric.flipper_sq, [40000, 40000, 40000]);
  close(t.numeric.island[0], 2 / 3); close(t.numeric.island[2], 1 / 3);
  assert.deepEqual(t.category.bill_code, ['b40', 'b40', 'b30']);
  assert.deepEqual([...t.order].sort(), [...PENGUIN_ORDER].sort());
});

test('holdoutSplit: a partition, 30 percent test by default, reproducible per seed', () => {
  const s = holdoutSplit(10, 0.3, 4);
  assert.equal(s.test.length, 3);
  assert.deepEqual([...s.train, ...s.test].sort((p, q) => p - q), Array.from({ length: 10 }, (_, i) => i));
  assert.deepEqual(holdoutSplit(10, 0.3, 4), s);
  assert.notDeepEqual(holdoutSplit(40, 0.3, 4).test, holdoutSplit(40, 0.3, 5).test);
});

test('no features: both scores are the majority-class guess (hand-computed 0.7)', () => {
  const table = { n: 10, y: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0], numeric: { f: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }, category: {}, order: ['f'], kinds: { f: 'noise' }, total: 10, dropped: 0 };
  const ev = makeEvaluator(table, { k: 5 });
  close(ev.cv([]).mean, 0.7);
  assert.equal(ev.cv([]).scores.length, 5);
  // the split's test rows are 3 of the 10; the training majority is 1 whatever they are
  const guess = ev.split([]).score;
  assert.ok([1, 2 / 3, 1 / 3, 0].some(v => Math.abs(v - guess) < 1e-9));
});

test('a set of features scores the same whatever order it is given in', () => {
  const t = makeCandidateData({ seed: 5 });
  const ev = makeEvaluator(t);
  assert.deepEqual(ev.cv(['x1', 'u_v']), ev.cv(['u_v', 'x1']));
  assert.equal(ev.split(['x1', 'z1']).score, ev.split(['z1', 'x1']).score);
});

test('an informative feature beats the baseline and the verdict says so; noise does not', () => {
  const t = makeCandidateData({ seed: 5 });
  const ev = makeEvaluator(t, { splitSeed: 2 });
  const f = forwardSteps(t.order, ev);
  const by = Object.fromEntries(f.steps.map(st => [st.feature, st]));
  const { x1, z1, u_v: uv } = by;
  const last = f.steps.at(-1);
  assert.equal(x1.verdict, 'real');
  assert.ok(x1.cvGain > 0.08, `x1 gain ${x1.cvGain}`);
  // seed 5, split 2: noise z1 looks 4 points better on the single split, but not beyond the fold spread
  assert.equal(z1.verdict, 'splitOnly');
  assert.ok(z1.splitGain > 0.03 && z1.cvGain < z1.cv.sd, `z1 ${z1.splitGain} ${z1.cvGain} ${z1.cv.sd}`);
  assert.equal(uv.verdict, 'real');
  // gains telescope: baseline + every gain is the last score
  close(f.baseline.cv.mean + f.steps.reduce((s, st) => s + st.cvGain, 0), last.cv.mean);
  close(f.baseline.split + f.steps.reduce((s, st) => s + st.splitGain, 0), last.split);
  assert.deepEqual(z1.features, ['x1', 'z1']);
  assert.equal(f.steps.length, t.order.length);
});

test('gainVerdict: beyond the spread is real, a split-only gain is flagged, small is flat', () => {
  assert.equal(gainVerdict(0.06, 0.03, 0.05), 'real');
  assert.equal(gainVerdict(0.02, 0.03, 0.04), 'splitOnly');
  assert.equal(gainVerdict(0.02, 0.03, 0.005), 'flat');
  assert.equal(gainVerdict(-0.05, 0.03, 0.02), 'worse');
  assert.equal(gainVerdict(-0.01, 0.03, -0.02), 'flat');
  assert.equal(gainVerdict(0.03, 0.03, 0), 'flat');   // equal to the spread is not beyond it
});

test('ablationRows: removing a feature that carries the signal costs score, removing noise does not', () => {
  const t = makeCandidateData({ seed: 5 });
  const ev = makeEvaluator(t);
  const a = ablationRows(['x1', 'u_v', 'z2'], ev);
  const by = Object.fromEntries(a.rows.map(r => [r.feature, r]));
  assert.equal(by.u_v.verdict, 'earns');
  assert.ok(by.u_v.drop > 0.05);
  assert.notEqual(by.z2.verdict, 'earns');
  close(by.z2.drop, a.full.mean - ev.cv(['x1', 'u_v']).mean);
  assert.deepEqual(a.rows.map(r => r.feature), ['x1', 'u_v', 'z2']);
});

test('naive target encoding leaks: one row per category gives a perfect score, out of fold gives chance', () => {
  const t = uniqueCategories();
  const naive = makeEvaluator(t, { encoding: 'naive' }).cv(['id']);
  const oof = makeEvaluator(t, { encoding: 'outOfFold' }).cv(['id']);
  close(naive.mean, 1);
  assert.ok(oof.mean < 0.75, `out-of-fold ${oof.mean}`);
});

test('leakCheck on the generated table: naive encoding flatters the score, out of fold does not', () => {
  const t = makeCandidateData({ seed: 5 });
  const l = leakCheck(t, ['x1', 'u_v', 'region'], 'region');
  assert.ok(l.naive.mean - l.outOfFold.mean > 0.05, JSON.stringify(l));
  assert.ok(Math.abs(l.outOfFold.mean - l.without.mean) < 0.06, JSON.stringify(l));
  // `without` really leaves the category out
  close(l.without.mean, makeEvaluator(t).cv(['x1', 'u_v']).mean);
});

test('an unknown encoding is rejected', () => {
  assert.throws(() => makeEvaluator(makeCandidateData({ seed: 1 }), { encoding: 'magic' }), RangeError);
});

test('scoreAxis pads by three points, snaps to multiples of five, and stays inside 0..1 and 10 points tall', () => {
  assert.deepEqual(scoreAxis([0.52, 0.7]), { lo: 0.45, hi: 0.75 });
  assert.deepEqual(scoreAxis([0.99, 1]), { lo: 0.9, hi: 1 });
  assert.deepEqual(scoreAxis([0.01, 0.02]), { lo: 0, hi: 0.1 });
  assert.deepEqual(scoreAxis([0.6]), { lo: 0.55, hi: 0.65 });
  assert.deepEqual(scoreAxis([]), { lo: 0, hi: 1 });
});
