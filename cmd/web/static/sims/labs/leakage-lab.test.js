import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS } from './leakage-lab.js';
import { makeNoiseTable, repeatSplits } from '../ml/leakage.js';
import { leakageOutcome } from '../ml/leakagelab.js';

test('the default settings show the leak at once: honest near 50%, leaky well above', () => {
  const t = makeNoiseTable({ n: DEFAULTS.rows, p: DEFAULTS.noise, seed: DEFAULTS.dataSeed });
  const r = repeatSplits({ X: t.X, y: t.y, k: DEFAULTS.keep, seed: 100, times: 50, model: DEFAULTS.model });
  assert.ok(Math.abs(r.correctMean - 0.5) < 0.08, `correct mean ${r.correctMean}`);
  assert.ok(r.leakyMean > 0.65, `leaky mean ${r.leakyMean}`);
  assert.equal(leakageOutcome(r.correctMean, r.leakyMean), 'leak-only');
});
