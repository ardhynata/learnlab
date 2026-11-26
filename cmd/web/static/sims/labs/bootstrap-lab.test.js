import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS, EXPERIMENTS } from './bootstrap-lab.js';
import { penguinPopulation, generatedPopulation, POP_SIZE } from '../ml/bootstraplab.js';
import { parseCsv } from '../ml/tabular.js';
import { mean } from '../ml/uncertainty.js';

test('the lab starts from the documented defaults and runs 200 experiments in the coverage check', () => {
  assert.deepEqual(DEFAULTS, { n: 100, times: 200, B: 500, seed: 41 });
  assert.equal(EXPERIMENTS, 200);
});

test('the generated population the lab starts on has 5,000 cases and a true accuracy of exactly 85%', () => {
  const pop = generatedPopulation();
  assert.equal(pop.length, POP_SIZE);
  assert.equal(mean(pop), 0.85);
});

test('the Penguins (real) population: 342 of 344 kept, 2 rows with an NA left out, 263 right, 76.9% accurate', () => {
  const table = parseCsv(readFileSync(new URL('../../data/penguins.csv', import.meta.url), 'utf8'));
  const p = penguinPopulation(table);
  assert.equal(p.total, 344);
  assert.equal(p.kept, 342);
  assert.equal(p.dropped, 2);
  assert.equal(p.k, 5);
  assert.equal(p.flags.length, 342);
  assert.equal(p.flags.reduce((a, b) => a + b, 0), 263);
  assert.equal((p.accuracy * 100).toFixed(1), '76.9');
});
