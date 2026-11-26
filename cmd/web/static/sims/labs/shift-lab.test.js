import test from 'node:test';
import assert from 'node:assert/strict';
import { computeResult, DEFAULTS } from './shift-lab.js';
import { makeShiftData } from '../ml/shift.js';
import { warningSetups } from '../ml/shiftlab.js';

const data = (shift, extra = {}) => makeShiftData({ n: DEFAULTS.n, seed: DEFAULTS.seed, shift, severity: 0.8, ...extra });

test('the defaults give one judged row per setup, a region grid and both detectors', () => {
  const r = computeResult(data(DEFAULTS.shift), DEFAULTS);
  assert.deepEqual(r.rows.map(x => x.setup), ['random', 'grouped', 'temporal', 'shifted-holdout', 'nested']);
  assert.ok(r.rows.every(x => ['anticipated', 'optimistic', 'pessimistic'].includes(x.status)));
  assert.equal(r.regions.labels.length, r.regions.cells ** 2);
  assert.ok(r.actual > 0 && r.actual < 1 && r.auc > 0.5 && r.psis.length === 2);
  assert.deepEqual(r, computeResult(data(DEFAULTS.shift), DEFAULTS), 'seeded, so the same every time');
});

test('a concept shift with no drift is not anticipated by any setup, and the detectors stay quiet', () => {
  const r = computeResult(data('concept'), DEFAULTS);
  assert.deepEqual(warningSetups(r.rows), []);
  assert.ok(r.rows.every(x => x.gap > 0.2), 'every estimate is far too optimistic');
  assert.ok(r.auc < 0.6 && r.psis.every(v => v < 0.25));
});

test('a covariate shift is loud in the detectors and drops the tuned model hard', () => {
  const r = computeResult(data('covariate'), DEFAULTS);
  assert.ok(r.auc > 0.9 && r.psis[0] > 0.25);
  assert.ok(r.rows.find(x => x.setup === 'nested').gap > 0.2);
});

test('with no shift the setups land near the actual accuracy', () => {
  const r = computeResult(data('none'), DEFAULTS);
  assert.ok(warningSetups(r.rows).length >= 3);
});
