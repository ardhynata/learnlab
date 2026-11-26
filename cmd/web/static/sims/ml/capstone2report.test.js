import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STEP_COUNT, REASONS, READINGS, CRITERIA, TEXT_FIELDS, COST_RANGE, B_RANGE, MAX_DEFENCE, MAX_TEXT,
  emptyState, sanitizeState, resetFrom, stepDone, reasonsRight, usedValue, readingTruth, readingFeedback, randomVsGrouped,
  splitName, modelName, precisionText, levelText, levelLabel, criterionTitle, neverFlagSentence, flagAllSentence, thresholdRule,
  optimismSentences, sharedSentence, searchSentence, intervalText, intervalSentences, thresholdSentences, buildSummary,
} from './capstone2report.js';
import { SPLIT_KEYS, MODEL_KEYS, TUNABLE, GRIDS, DATA_SEEDS } from './capstone2lab.js';

const cmp = {
  random: { auc: 0.85, lo: 0.8, hi: 0.9, sharedShare: 1 },
  grouped: { auc: 0.7, lo: 0.6, hi: 0.75, sharedShare: 0 },
  temporal: { auc: 0.86, lo: 0.86, hi: 0.86, sharedShare: 0.98, lastTrainDay: 66, firstTestDay: 67 },
};
const facts = { rows: 1200, customers: 60, days: 90, frauds: 93, legit: 1107, rate: 93 / 1200, accuracyNever: 1107 / 1200 };

function finished() {
  const s = emptyState();
  s.costsSet = true; s.reasons = ['rare', 'equal'];
  s.split = 'grouped'; s.splitCompared = true; s.defence = 'New customers will be the test.';
  s.searched = { logistic: true, forest: true }; s.model = 'logistic';
  s.scored = true; s.reading = 'overlap'; s.thresholdSet = true;
  for (const f of TEXT_FIELDS) s.text[f] = 'text';
  for (const c of CRITERIA) s.rubric[c] = 2;
  return s;
}

test('emptyState: nothing done, every key present', () => {
  const s = emptyState();
  assert.deepEqual(stepDone(s), Array(STEP_COUNT).fill(false));
  assert.equal(STEP_COUNT, 6);
  assert.equal(s.threshold, null);
  assert.deepEqual(Object.keys(s.text), TEXT_FIELDS);
  assert.deepEqual(Object.keys(s.rubric), CRITERIA);
});

test('sanitizeState: anything in, a valid state out', () => {
  for (const junk of [null, undefined, 5, 'x', [], { split: 'weird', model: 'baseline', threshold: 5, B: 'a', fp: -3, picks: 4 }]) {
    const s = sanitizeState(junk);
    assert.equal(s.split, null);
    assert.equal(s.model, null);
    assert.equal(s.threshold, null);
    assert.ok(s.fp >= COST_RANGE.fp.min && s.fn <= COST_RANGE.fn.max);
    assert.ok(s.B >= B_RANGE.min && s.B <= B_RANGE.max);
  }
  const s = sanitizeState({
    seed: 500, fp: 99, fn: 1, split: 'temporal', splitCompared: true, defence: 'x'.repeat(999), model: 'forest',
    picks: { logistic: 0.1, forest: 7 }, searched: { forest: true, logistic: 'yes' }, B: 777, reading: 'clear', reasons: ['rare', 'nope', 'cannot'],
    threshold: 0.12345, text: { splitWhy: 'y'.repeat(999), risks: 3 }, rubric: { split: 9, comparison: -1, uncertainty: 2.4 }, open: 99, thresholdSet: true,
  });
  assert.equal(s.seed, DATA_SEEDS.length);
  assert.equal(s.fp, COST_RANGE.fp.max);
  assert.equal(s.fn, COST_RANGE.fn.min);
  assert.equal(s.split, 'temporal');
  assert.equal(s.defence.length, MAX_DEFENCE);
  assert.deepEqual(s.picks, { logistic: 0.1, forest: null }, 'a value that is not in the grid is dropped');
  assert.deepEqual(s.searched, { logistic: false, forest: true });
  assert.equal(s.B, 800);
  assert.equal(s.reading, 'clear');
  assert.deepEqual(s.reasons, ['rare', 'cannot']);
  assert.equal(s.threshold, 0.123);
  assert.equal(s.text.splitWhy.length, MAX_TEXT);
  assert.equal(s.text.risks, '');
  assert.deepEqual(s.rubric, { split: 3, comparison: 0, uncertainty: 2, threshold: 0 });
  assert.equal(s.open, 5);
  assert.equal(sanitizeState({ split: null, splitCompared: true }).splitCompared, false, 'compared needs a split');
  assert.deepEqual(sanitizeState(JSON.parse(JSON.stringify(finished()))), finished(), 'a saved state round-trips');
});

test('stepDone: every step has its own condition', () => {
  const s = finished();
  assert.deepEqual(stepDone(s), Array(6).fill(true));
  const without = (mutate, index) => {
    const t = structuredClone(s); mutate(t);
    const d = stepDone(t);
    assert.equal(d[index], false, `step ${index + 1}`);
    assert.equal(d.filter(Boolean).length, 5, 'only that step changes');
  };
  without(t => { t.costsSet = false; }, 0);
  without(t => { t.reasons = ['rare']; }, 0);
  without(t => { t.reasons = ['rare', 'equal', 'cannot']; }, 0);
  without(t => { t.split = null; }, 1);
  without(t => { t.splitCompared = false; }, 1);
  without(t => { t.defence = '   '; }, 1);
  without(t => { t.searched.forest = false; }, 2);
  without(t => { t.model = null; }, 2);
  without(t => { t.scored = false; }, 3);
  without(t => { t.reading = null; }, 3);
  without(t => { t.thresholdSet = false; }, 4);
  without(t => { t.text.risks = ' '; }, 5);
  without(t => { t.rubric.threshold = 0; }, 5);
});

test('reasonsRight: exactly the two true reasons', () => {
  assert.ok(reasonsRight(['equal', 'rare']));
  assert.ok(!reasonsRight(['rare']));
  assert.ok(!reasonsRight(['rare', 'equal', 'cannot']));
  assert.ok(!reasonsRight([]));
  assert.deepEqual(REASONS, ['rare', 'equal', 'cannot']);
});

test('resetFrom: a change forgets what depends on it and keeps typed text', () => {
  const s = finished(); s.picks = { logistic: 1, forest: 3 }; s.threshold = 0.05;
  const r2 = resetFrom(s, 2);
  assert.equal(r2.splitCompared, false);
  assert.deepEqual([r2.searched, r2.picks, r2.model, r2.scored, r2.reading, r2.threshold, r2.thresholdSet],
    [{ logistic: false, forest: false }, { logistic: null, forest: null }, null, false, null, null, false]);
  assert.equal(r2.split, 'grouped', 'the chosen split stays');
  assert.equal(r2.defence, s.defence);
  assert.deepEqual(r2.text, s.text);
  const r3 = resetFrom(s, 3);
  assert.equal(r3.splitCompared, true);
  assert.equal(r3.model, null);
  const r4 = resetFrom(s, 4);
  assert.equal(r4.model, 'logistic');
  assert.equal(r4.scored, false);
  assert.equal(r4.thresholdSet, false);
  const r5 = resetFrom(s, 5);
  assert.equal(r5.scored, true);
  assert.equal(r5.threshold, null);
  assert.equal(s.threshold, 0.05, 'the input is not changed');
  assert.deepEqual(s.searched, { logistic: true, forest: true });
});

test('usedValue: the learner\'s pick, else the best of the search', () => {
  const s = emptyState();
  assert.equal(usedValue(s, 'forest', { best: 5 }), 5);
  s.picks.forest = 8;
  assert.equal(usedValue(s, 'forest', { best: 5 }), 8);
  assert.equal(usedValue(s, 'logistic', null), null);
});

test('readingTruth: weak, behind, clear or overlap from the intervals', () => {
  assert.equal(readingTruth({ lo: 0.45 }, { lo: 0.1, hi: 0.3 }), 'weak');
  assert.equal(readingTruth({ lo: 0.6 }, { lo: 0.05, hi: 0.3 }), 'clear');
  assert.equal(readingTruth({ lo: 0.6 }, { lo: -0.3, hi: -0.05 }), 'behind');
  assert.equal(readingTruth({ lo: 0.6 }, { lo: -0.1, hi: 0.2 }), 'overlap');
  assert.equal(readingTruth({ lo: 0.6 }, null), 'overlap');
  for (const k of READINGS) assert.ok(readingFeedback(k, 'clear').length > 20 && readingFeedback('clear', k).length > 20);
  assert.ok(readingFeedback('clear', 'clear').startsWith('Your reading matches'));
  assert.ok(readingFeedback('weak', 'clear').startsWith('Your reading differs'));
});

test('randomVsGrouped: higher, same or lower with a 0.03 band', () => {
  const c = (r, g) => ({ random: { auc: r }, grouped: { auc: g } });
  assert.equal(randomVsGrouped(c(0.84, 0.7)), 'higher');
  assert.equal(randomVsGrouped(c(0.71, 0.7)), 'same');
  assert.equal(randomVsGrouped(c(0.6, 0.7)), 'lower');
});

test('names and rubric text exist for every key', () => {
  for (const k of SPLIT_KEYS) assert.ok(splitName(k).length > 0 && splitName(k, true).length > 0);
  for (const k of MODEL_KEYS) assert.ok(modelName(k).length > 0);
  assert.throws(() => splitName('x'), RangeError);
  assert.throws(() => modelName('x'), RangeError);
  for (const c of CRITERIA) {
    assert.ok(criterionTitle(c).length > 0);
    for (const l of [1, 2, 3]) assert.ok(levelText(c, l).length > 20, `${c} ${l}`);
    assert.notEqual(levelText(c, 1), levelText(c, 3));
  }
  assert.deepEqual([1, 2, 3].map(levelLabel), ['Not yet', 'Partly', 'Yes']);
});

test('sentences state the numbers they are given', () => {
  assert.match(neverFlagSentence(facts, 40), /92\.3%/);
  assert.match(neverFlagSentence(facts, 40), /93 frauds/);
  assert.match(neverFlagSentence(facts, 40), /3,720/);
  assert.match(flagAllSentence(facts, 2), /1,107 false alarms/);
  assert.match(thresholdRule(2, 40, 2 / 42), /4\.8%/);
  const o = optimismSentences(cmp, 'random');
  assert.equal(o.length, 2);
  assert.match(o[0], /higher than Grouped by customer/);
  assert.match(o[1], /about the same AUC/);
  assert.match(optimismSentences(cmp, 'grouped')[0], /lower than Random.*stricter/);
  assert.match(sharedSentence(cmp), /day 66.*day 67/);
  assert.match(sharedSentence(cmp), /keeps the customers/);
});

test('searchSentence: says when a setting hardly matters', () => {
  const flat = { best: 10, spread: 0.004, results: GRIDS.logistic.values.map(v => ({ value: v, mean: 0.7, sd: 0.02 })) };
  assert.match(searchSentence('logistic', flat, 10), /hardly matters/);
  const steep = { best: 2, spread: 0.12, results: GRIDS.forest.values.map((v, i) => ({ value: v, mean: 0.76 - i * 0.03, sd: 0.02 })) };
  assert.match(searchSentence('forest', steep, 5), /best max depth.*is 2/);
  assert.match(searchSentence('forest', steep, 5), /You use 5/);
});

test('interval and threshold sentences', () => {
  assert.equal(intervalText({ estimate: 0.7, lo: 0.6, hi: 0.8 }), '0.70 (0.60 – 0.80)');
  assert.equal(intervalText({ estimate: 0.5, lo: NaN, hi: NaN }), '0.50');
  assert.equal(intervalText(null), '–');
  const scores = { logistic: { auc: { estimate: 0.74, lo: 0.62, hi: 0.85, used: 100 } } };
  const out = intervalSentences(scores, { n: 300, frauds: 18 }, 'logistic', 'forest', { estimate: 0.04, lo: -0.1, hi: 0.17 });
  assert.equal(out.length, 3);
  assert.match(out[0], /only 18 frauds among 300/);
  assert.match(out[1], /includes zero/);
  assert.match(out[2], /not independent/);
  assert.equal(intervalSentences(scores, { n: 300, frauds: 18 }, 'logistic', 'forest', null).length, 2);
  const run = { threshold: 0.05, flagged: 40, n: 300, confusion: { tp: 12, fn: 6, fp: 28, tn: 254 }, expectedCost: 0.9 };
  assert.equal(thresholdSentences(run, 0.05, run, facts).length, 1);
  const moved = thresholdSentences({ ...run, threshold: 0.2 }, 0.05, run, facts);
  assert.equal(moved.length, 2);
  assert.match(moved[1], /tuned on the test rows/);
});

test('buildSummary: says the data are synthetic, and shows what is done and what is not', () => {
  const empty = buildSummary({ facts, fp: 2, fn: 40, thr: 2 / 42, reasons: [], split: null, cmp: null, defence: '', tuned: {}, picks: {}, model: null, held: null, scores: null, diff: null, reading: null, threshold: null, text: { splitWhy: '', modelWhy: '', risks: '' }, rubric: CRITERIA.map(criterion => ({ criterion, level: 0 })) });
  assert.match(empty, /synthetic/);
  assert.match(empty, /not chosen yet/);
  assert.match(empty, /not rated yet/);
  assert.match(empty, /search not run yet/);
  const tuned = Object.fromEntries(TUNABLE.map(m => [m, { best: GRIDS[m].values[1], spread: 0.1, results: GRIDS[m].values.map(v => ({ value: v, mean: 0.7, sd: 0.03 })) }]));
  const iv = e => ({ estimate: e, lo: e - 0.1, hi: e + 0.1, used: 100 });
  const scores = Object.fromEntries(MODEL_KEYS.map(m => [m, { auc: iv(0.7), ap: iv(0.2), cost: iv(1.5) }]));
  const text = buildSummary({
    facts, fp: 2, fn: 40, thr: 2 / 42, reasons: ['rare', 'equal'], split: 'grouped', cmp, defence: 'New customers.', tuned,
    picks: { logistic: 0.01, forest: 3 }, model: 'logistic', held: { n: 300, frauds: 18 }, scores, diff: { estimate: 0.02, lo: -0.1, hi: 0.1 }, reading: 'overlap',
    threshold: { value: 2 / 42, expectedCost: 0.9, confusion: { tp: 12, fn: 6, fp: 28, tn: 254 } }, text: { splitWhy: 'because', modelWhy: 'since', risks: 'drift' },
    rubric: CRITERIA.map(criterion => ({ criterion, level: 3 })),
  });
  for (const part of ['synthetic', '1,200 transactions', 'Grouped by customer', 'New customers.', 'Logistic regression, L2 penalty 0.01', 'Random forest, max depth 3', 'Held-out rows: 300 transactions, 18 frauds', '4.8%', 'because', 'drift', 'Split defence: Yes (3/3)']) {
    assert.ok(text.includes(part), `missing: ${part}`);
  }
  assert.ok(!text.includes('not chosen yet') && !text.includes('not rated yet') && !text.includes('not written yet'));
});

test('precisionText shows a dash when nothing is flagged, never 0%', () => {
  assert.equal(precisionText({ flagged: 0, precision: 0 }), '–');
  assert.equal(precisionText(null), '–');
  assert.match(precisionText({ flagged: 10, precision: 0.25 }), /25/);
  assert.match(precisionText({ flagged: 10, precision: 0 }), /^0/);
});

test('rubric split level 2 is not contradicted by the forced comparison step', () => {
  assert.ok(!/other splits/.test(levelText('split', 2)));
});
