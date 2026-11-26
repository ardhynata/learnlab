import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  generatedSets, penguinSets, fitModel, evaluate, gapRows, differs, calibrationByGroup, scoreHistogram,
  makeDirectory, privacyView, noisyCounts, cardText, stressAmount, STRESS_KINDS, STRESS_RANGE, GAP_KEYS,
} from './reliabilitylab.js';
import { parseCsv } from './tabular.js';

const penguins = parseCsv(readFileSync(new URL('../../data/penguins.csv', import.meta.url), 'utf8'));
const sets = generatedSets(1);
const model = fitModel(sets);

test('generated sets: three seeded samples, the group is never a model input', () => {
  assert.equal(sets.train.X.length, 600);
  assert.equal(sets.test.X.length, 900);
  assert.deepEqual(sets.groups, ['A', 'B', 'C']);
  assert.equal(model.useGroup, false);
  assert.equal(model.columns.length, 3);
  assert.deepEqual(generatedSets(1).test.y, sets.test.y, 'same seed, same rows');
  assert.notDeepEqual(generatedSets(2).test.y, sets.test.y);
});

test('stress amounts scale a 0 to 1 slider to each kind, and clamp it', () => {
  assert.equal(stressAmount('noise', 0.5), 1);          // 1 sd
  assert.equal(stressAmount('missing', 0.4), 0.4);      // 40 % of the cells
  assert.ok(Math.abs(stressAmount('outlier', 1) - 0.3) < 1e-12);
  assert.equal(stressAmount('unitChange', 1), 2);       // x100
  assert.equal(stressAmount('shift', 2), STRESS_RANGE.shift);   // clamped to the top of the slider
  assert.equal(stressAmount('noise', -1), 0);
  assert.throws(() => stressAmount('rain', 0.5), RangeError);
  assert.deepEqual(STRESS_KINDS.slice().sort(), Object.keys(STRESS_RANGE).sort());
});

test('with no stress the after report equals the before report', () => {
  const e = evaluate(sets, model, { kind: 'noise', strength: 0 });
  assert.deepEqual(e.after.overall, e.before.overall);
  assert.equal(e.drop.overall, 0);
});

test('the model never sees the group, yet the error rates differ between groups (the predict-first answer)', () => {
  const e = evaluate(sets, model, { kind: 'noise', strength: 0 });
  const d = differs(e.before);
  assert.equal(d.differs, true);
  assert.ok(d.gaps.tpr > 0.2 && d.gaps.accuracy > 0.1, `tpr gap ${d.gaps.tpr}, accuracy gap ${d.gaps.accuracy}`);
  assert.equal(e.before.groups[0].group, 'A');
  assert.ok(e.before.byGroup.A.accuracy > e.before.byGroup.C.accuracy, 'the clean group A is scored best');
});

test('missing cells blank the stressed rows only, and hurt the noisiest group\'s recall most', () => {
  const e = evaluate(sets, model, { kind: 'missing', strength: 0.4 });
  assert.ok(e.perturbed.X.flat().some(Number.isNaN));
  assert.ok(!sets.test.X.flat().some(Number.isNaN), 'the clean test rows are untouched');
  assert.ok(e.after.byGroup.C.tpr < e.before.byGroup.C.tpr);
  assert.ok(e.drop.overall > 0.05);
  assert.ok(['A', 'B', 'C'].includes(e.worstGroup));
  assert.equal(e.drop.byGroup[e.worstGroup], Math.max(...Object.values(e.drop.byGroup)));
});

test('per-group thresholds are tuned on the validation rows and applied to both reports', () => {
  const one = evaluate(sets, model, { kind: 'noise', strength: 0.5 });
  const many = evaluate(sets, model, { kind: 'noise', strength: 0.5, perGroup: true, goal: 'equalOpportunity' });
  assert.equal(typeof one.thresholds, 'number');
  assert.deepEqual(Object.keys(many.thresholds), ['A', 'B', 'C']);
  assert.ok(many.thresholds.A > many.thresholds.C, 'the group the model ranks best gets the strictest cut');
  assert.ok(many.before.gaps.equalOpportunity < one.before.gaps.equalOpportunity, 'matching recall narrows the recall gap');
  assert.deepEqual(many.before.threshold, many.thresholds);
});

test('gapRows pairs each gap before and after, with null kept as null', () => {
  const e = evaluate(sets, model, { kind: 'shift', strength: 0.5 });
  const rows = gapRows(e.before, e.after);
  assert.deepEqual(rows.map(r => r.key), GAP_KEYS);
  for (const r of rows) assert.ok(Math.abs(r.change - (r.after - r.before)) < 1e-12);
  const none = gapRows({ gaps: { equalOpportunity: null, demographicParity: 0.1, fpr: 0.2 } }, { gaps: { equalOpportunity: 0.3, demographicParity: 0.2, fpr: 0.1 } });
  assert.equal(none[0].change, null);
  assert.ok(Math.abs(none[1].change - 0.1) < 1e-12 && Math.abs(none[2].change + 0.1) < 1e-12);
});

test('differs uses the largest of the accuracy, recall and false-positive-rate gaps', () => {
  const report = gaps => ({ gaps });
  assert.deepEqual(differs(report({ accuracy: 0.01, equalOpportunity: 0.02, fpr: 0.03 })).differs, false);
  const d = differs(report({ accuracy: 0.01, equalOpportunity: 0.02, fpr: 0.08 }));
  assert.equal(d.differs, true);
  assert.equal(d.maxGap, 0.08);
  assert.equal(differs(report({ accuracy: null, equalOpportunity: null, fpr: null })).differs, false);
});

test('calibrationByGroup: one curve per group, thin bins left out', () => {
  const scores = [0.1, 0.1, 0.1, 0.1, 0.9, 0.9, 0.9, 0.9, 0.5];
  const labels = [0, 0, 0, 1, 1, 1, 1, 0, 1];
  const group = ['x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'y'];
  const [x, y] = calibrationByGroup(scores, labels, group, ['x', 'y'], { bins: 10, minCount: 2 });
  assert.equal(x.count, 8);
  assert.deepEqual(x.points.map(p => [p.x, p.y, p.count]), [[0.1, 0.25, 4], [0.9, 0.75, 4]]);
  assert.ok(Math.abs(x.ece - 0.15) < 1e-12);          // (4/8)(0.15) + (4/8)(0.15)
  assert.deepEqual(y.points, [], 'one row is below minCount');
});

test('scoreHistogram counts every score once and zones the bins by the review band', () => {
  const scores = [0.01, 0.30, 0.49, 0.51, 0.74, 0.99, 1];
  const h = scoreHistogram(scores, { bins: 10, low: 0.3, high: 0.7 });
  assert.equal(h.reduce((a, b) => a + b.count, 0), scores.length);
  assert.equal(h[9].count, 2, 'a score of exactly 1 sits in the last bin');
  assert.deepEqual(h.map(b => b.zone), ['no', 'no', 'no', 'review', 'review', 'review', 'review', 'yes', 'yes', 'yes']);
  const empty = scoreHistogram(scores, { bins: 10, low: 0.6, high: 0.4 });
  assert.deepEqual(empty.map(b => b.zone), ['no', 'no', 'no', 'no', 'no', 'yes', 'yes', 'yes', 'yes', 'yes']);
});

test('the directory is seeded, made up, and unique at full detail', () => {
  const d = makeDirectory(900, 1);
  assert.deepEqual(d, makeDirectory(900, 1));
  assert.ok(d.every(r => r.age >= 18 && r.age <= 79 && /^101[0-5]\d$/.test(r.postcode) && (r.sex === 'F' || r.sex === 'M')));
  const full = privacyView(d, { fields: ['age', 'postcode', 'sex'] });
  assert.equal(full.minGroupSize, 1);
  assert.ok(full.shareBelowK > 0.9, 'almost everyone is alone in their group');
});

test('generalising raises the smallest group: 10-year ages and a 3-digit postcode leave every row in a group of 5 or more', () => {
  const d = makeDirectory(900, 1);
  const r = privacyView(d, { fields: ['age', 'postcode', 'sex'], ageBin: 10, digits: 3, k: 5 });
  assert.ok(r.minGroupSize >= 5 && r.shareBelowK === 0);
  assert.equal(r.groupCount, r.groups.length);
  assert.equal(r.groups.reduce((a, g) => a + g.size, 0), 900);
  assert.equal(privacyView(d, { fields: [] }), null);
});

test('privacyView on a tiny hand-made directory', () => {
  const rows = [
    { age: 31, postcode: '10110', sex: 'F', job: 'clerk' },
    { age: 38, postcode: '10120', sex: 'F', job: 'clerk' },
    { age: 35, postcode: '10130', sex: 'F', job: 'cook' },
    { age: 52, postcode: '10140', sex: 'M', job: 'cook' },
  ];
  const r = privacyView(rows, { fields: ['age', 'sex'], ageBin: 10, k: 2 });   // 30-39 F x3, 50-59 M x1
  assert.deepEqual(r.groups.map(g => g.size), [1, 3]);
  assert.equal(r.rowsBelowK, 1);
  assert.equal(r.shareBelowK, 0.25);
  const post = privacyView(rows, { fields: ['postcode'], digits: 3, k: 2 });    // "101*" for all four
  assert.equal(post.groupCount, 1);
});

test('noisyCounts: the same draw for the same arguments, a typical size of 1 / epsilon, small epsilon means more noise', () => {
  const a = noisyCounts([400, 30], 0.5, 1);
  assert.deepEqual(a, noisyCounts([400, 30], 0.5, 1));
  assert.equal(a[0].scale, 2);
  assert.equal(a[0].released - a[0].trueCount, a[0].error);
  const mean = eps => {
    let s = 0;
    for (let seed = 1; seed <= 300; seed++) s += Math.abs(noisyCounts([100], eps, seed)[0].error);
    return s / 300;
  };
  const strict = mean(0.1), loose = mean(2);
  assert.ok(strict > 5 * loose, `mean |error| at epsilon 0.1 (${strict}) vs 2 (${loose})`);
  assert.ok(Math.abs(strict - 10) < 2, 'Laplace noise with scale 10 has mean absolute value about 10');
});

test('cardText lists every section, flags the empty ones and ends with what is missing', () => {
  const text = cardText({
    title: 'MODEL CARD: demo',
    sections: [{ title: 'Intended use', lines: ['Rank applicants.', '  '] }, { title: 'Known limits', lines: [] }],
  });
  assert.equal(text, ['MODEL CARD: demo', '', 'INTENDED USE', '------------', 'Rank applicants.', '', 'KNOWN LIMITS', '------------', '(not filled in)', '', 'Missing: Known limits'].join('\n'));
  const full = cardText({ title: 'T', sections: [{ title: 'A', lines: ['x'] }], missingLabel: 'Kosong', notFilled: '(kosong)' });
  assert.ok(full.endsWith('Kosong: -'));
});

test('penguins: NA rows are dropped and counted, species are the groups, the split is stratified and seeded', () => {
  const p = penguinSets(penguins, 1);
  assert.equal(p.total, 344);
  assert.equal(p.kept, 333);
  assert.equal(p.dropped, 11);
  assert.equal(p.kept, p.train.X.length + p.test.X.length);
  assert.deepEqual(p.groups, ['Adelie', 'Chinstrap', 'Gentoo']);
  assert.equal(p.counts.Adelie + p.counts.Chinstrap + p.counts.Gentoo, 333);
  assert.ok(p.train.X.flat().every(Number.isFinite) && p.test.X.flat().every(Number.isFinite));
  assert.ok(p.test.group.includes('Chinstrap'));
  assert.deepEqual(penguinSets(penguins, 1).test.y, p.test.y);
  assert.equal(p.validation, p.train);
  const m = fitModel(p);
  const e = evaluate(p, m, { kind: 'missing', strength: 0.4 });
  assert.equal(e.before.groups.length, 3);
  assert.ok(e.before.gaps.accuracy > 0.05, 'the species the model never sees still get different accuracy');
});
