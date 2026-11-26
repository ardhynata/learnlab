import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  penguinShiftData, judgeSetups, warningSetups, aucVerdict, detectorReading, plotRange, boundaryCurve, regionGrid,
  featurePsi, PENGUIN_ISLANDS, TOLERANCE,
} from './shiftlab.js';
import { parseCsv } from './tabular.js';
import { cleanLabel, makeShiftData, modelFitPredict } from './shift.js';

const HEAD = 'species,island,bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,sex,year';
const tiny = parseCsv([
  HEAD,
  'Adelie,Torgersen,40,18,190,3000,male,2008',
  'Adelie,Torgersen,38,17,185,2000,female,2007',
  'Adelie,Dream,42,19,195,4000,male,2007',
  'Adelie,Dream,NA,NA,NA,NA,NA,2007',
  'Adelie,Dream,44,18,196,4000,NA,2009',
  'Gentoo,Biscoe,50,15,220,5000,male,2009',
  'Gentoo,Biscoe,48,14,215,4800,female,2008',
].join('\n'));

test('penguinShiftData holds one island out, drops NA rows and says how many', () => {
  const d = penguinShiftData(tiny, 'Biscoe');
  assert.equal(d.total, 7);
  assert.equal(d.dropped, 2, 'the all-NA row and the row without sex');
  assert.equal(d.kept, 5);
  assert.equal(d.test.length, 2);
  assert.equal(d.train.length, 3);
  assert.ok(d.test.every(r => r.group.startsWith('Biscoe')));
  assert.ok(d.train.every(r => !r.group.startsWith('Biscoe')));
  assert.equal(d.positiveRate.test, 0.5);
  assert.ok(Math.abs(d.positiveRate.train - 2 / 3) < 1e-12);
});

test('the train set is sorted by year with time = position, and standardised with the train mean and sd', () => {
  const d = penguinShiftData(tiny, 'Biscoe');
  assert.deepEqual(d.train.map(r => r.time), [0, 1, 2]);
  assert.deepEqual(d.train.map(r => r.raw[1]), [2000, 4000, 3000], 'the two 2007 rows first, in table order, then 2008');
  // Hand computed: train body mass 3000, 2000, 4000 -> mean 3000, population sd sqrt(2/3 * 10^6) = 816.497
  assert.ok(Math.abs(d.mean[1] - 3000) < 1e-9);
  assert.ok(Math.abs(d.sd[1] - 816.4966) < 1e-3);
  const z = d.train.map(r => r.features[1]);
  assert.ok(Math.abs(z.reduce((a, b) => a + b, 0)) < 1e-9, 'train z-scores sum to zero');
  // a held-out Biscoe penguin of 5000 g sits (5000 - 3000) / 816.4966 = 2.449 standard deviations up
  assert.ok(Math.abs(d.test.find(r => r.raw[1] === 5000).features[1] - 2.4495) < 1e-3);
});

test('a bad island is refused, and the real file loads for every island with enough groups for 5-fold grouping', () => {
  assert.throws(() => penguinShiftData(tiny, 'Atlantis'), RangeError);
  const table = parseCsv(fs.readFileSync(new URL('../../data/penguins.csv', import.meta.url), 'utf8'));
  for (const island of PENGUIN_ISLANDS) {
    const d = penguinShiftData(table, island);
    assert.equal(d.total, 344);
    assert.equal(d.kept + d.dropped, 344);
    assert.ok(new Set(d.train.map(r => r.group)).size >= 5, `${island}: groups`);
    assert.ok(d.test.length > 10);
  }
  assert.equal(penguinShiftData(table, 'Biscoe').kept, 333, 'NA rows are dropped');
});

test('judgeSetups and warningSetups use the tolerance on |gap|', () => {
  const rows = [
    { setup: 'random', gap: 0.3 }, { setup: 'grouped', gap: -0.04 }, { setup: 'temporal', gap: 0.05 },
    { setup: 'shifted-holdout', gap: -0.2 }, { setup: 'nested', gap: 0.01 },
  ];
  assert.deepEqual(judgeSetups(rows).map(r => r.status), ['optimistic', 'anticipated', 'anticipated', 'pessimistic', 'anticipated']);
  assert.deepEqual(warningSetups(rows), ['nested', 'grouped', 'temporal'], 'closest first');
  assert.deepEqual(warningSetups(rows.slice(0, 1)), []);
  assert.equal(TOLERANCE, 0.05);
});

test('aucVerdict and detectorReading read the detectors together with the drop', () => {
  assert.equal(aucVerdict(0.52), 'alike');
  assert.equal(aucVerdict(0.7), 'some');
  assert.equal(aucVerdict(0.98), 'clear');
  assert.equal(detectorReading({ psis: [0.02, 0.4], auc: 0.55, drop: 0 }), 'inputs-moved');
  assert.equal(detectorReading({ psis: [0.02, 0.03], auc: 0.9, drop: 0 }), 'inputs-moved');
  assert.equal(detectorReading({ psis: [0.02, 0.03], auc: 0.5, drop: 0.3 }), 'quiet-dropped');
  assert.equal(detectorReading({ psis: [0.02, 0.03], auc: 0.5, drop: 0.01 }), 'quiet');
});

test('the detectors are quiet for a concept shift and loud for a covariate shift', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const concept = featurePsi(makeShiftData({ shift: 'concept', severity: 1, seed }));
    assert.ok(concept.every(v => v < 0.25), `concept PSI ${concept} (seed ${seed})`);
    const cov = featurePsi(makeShiftData({ shift: 'covariate', severity: 1, seed }));
    assert.ok(cov[0] > 0.25, `covariate PSI on x0 ${cov[0]}`);
    assert.ok(cov[1] < 0.25, 'the second input did not move');
  }
});

test('plotRange is a square that covers every point', () => {
  const rows = [{ features: [-1, 0.2] }, { features: [3.1, 1.4] }, { features: [0, -0.6] }];
  const r = plotRange(rows);
  for (const p of rows) {
    assert.ok(p.features[0] >= r.minX && p.features[0] <= r.minX + r.span);
    assert.ok(p.features[1] >= r.minY && p.features[1] <= r.minY + r.span);
  }
  assert.ok(r.span >= 4.1 + 0.8 - 1e-9, 'at least the widest extent plus the padding');
  assert.equal(r.span % 5, 0);
  assert.ok(Number.isInteger(r.minX) && Number.isInteger(r.minY), 'whole-number corner');
  assert.deepEqual(plotRange([{ features: [0, 0] }, { features: [4.6, 1] }]), { minX: -3, minY: -5, span: 10 }, 'extent 5.4 needs span 10; centres 2.3 and 0.5 give corners -2.7 and -4.5, floored');
});

test('boundaryCurve lies on the rule: the label flips across it, and rotation by 90 degrees turns it', () => {
  const range = { minX: -4.5, minY: -5.5, span: 11 };
  for (const angle of [0, Math.PI / 4, Math.PI / 2]) {
    const runs = boundaryCurve(angle, range);
    const points = runs.flat();
    assert.ok(points.length > 50, 'a long curve');
    for (const p of points.filter((_, i) => i % 9 === 0)) {
      // Step 0.05 to either side along the curve's normal: the noise-free label differs.
      const eps = 0.05, nx = -Math.sin(angle), ny = Math.cos(angle);
      const a = cleanLabel([p.x + eps * nx, p.y + eps * ny], angle), b = cleanLabel([p.x - eps * nx, p.y - eps * ny], angle);
      assert.notEqual(a, b, `angle ${angle} at ${p.x},${p.y}`);
    }
  }
  // every rotation passes through the origin
  const origin = boundaryCurve(0, range).flat().reduce((best, p) => Math.min(best, Math.hypot(p.x, p.y)), Infinity);
  assert.ok(origin < 0.1);
  // Every point of the curve stays inside the range.
  for (const p of boundaryCurve(0.7, range).flat()) assert.ok(p.x >= range.minX && p.x <= range.minX + range.span && p.y >= range.minY && p.y <= range.minY + range.span);
});

test('regionGrid labels every cell with the model prediction, top row first', () => {
  const trainX = [[-1, -1], [-1.2, -0.8], [1, 1], [1.1, 0.9]], trainY = [0, 0, 1, 1];
  const range = { minX: -2, minY: -2, span: 4 };
  const g = regionGrid(modelFitPredict('knn', { k: 1 }), trainX, trainY, range, 4);
  assert.equal(g.labels.length, 16);
  assert.equal(g.labels[0], 0, 'top left cell (-1.5, 1.5): its nearest training row is (-1.2, -0.8), class 0');
  assert.equal(g.labels[15], 1, 'bottom right cell (1.5, -1.5) vs (1,1): class 1');
});
