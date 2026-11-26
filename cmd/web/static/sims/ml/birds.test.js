import test from 'node:test';
import assert from 'node:assert/strict';
import { rng } from './rng.js';
import { FEATURES, SPECIES, makeBirds, separability, rankPairs, axisPosition, formatValue } from './birds.js';

const bird = (id, label, f0, f1 = 0, f2 = 0, f3 = 0) => ({ id, label, features: [f0, f1, f2, f3] });

test('makeBirds is deterministic for a seed and differs between seeds', () => {
  assert.deepEqual(makeBirds(7), makeBirds(7));
  assert.notDeepEqual(makeBirds(7), makeBirds(8));
});

test('makeBirds gives three equal species, four features each, and ids 1..n', () => {
  const birds = makeBirds(7, 40);
  assert.equal(birds.length, 120);
  assert.equal(SPECIES.length, 3);
  for (let l = 0; l < 3; l++) assert.equal(birds.filter(b => b.label === l).length, 40);
  assert.deepEqual(birds.map(b => b.id), Array.from({ length: 120 }, (_, i) => i + 1));
  for (const b of birds) assert.equal(b.features.length, FEATURES.length);
});

test('the bird number does not reveal the species', () => {
  const birds = makeBirds(7, 40);
  assert.ok(new Set(birds.slice(0, 40).map(b => b.label)).size > 1, 'the first 40 ids are not one species');
  const sorted = birds.map(b => b.label).every((l, i, a) => i === 0 || a[i - 1] <= l);
  assert.equal(sorted, false);
});

test('every value is finite, rounded to its step, and inside the lab axis range', () => {
  for (const seed of [1, 7, 99]) {
    for (const b of makeBirds(seed)) {
      b.features.forEach((v, j) => {
        const f = FEATURES[j];
        assert.ok(Number.isFinite(v));
        assert.ok(v >= f.lo && v <= f.hi, `${f.name} ${v} outside ${f.lo}..${f.hi}`);
        assert.ok(Math.abs(v / f.step - Math.round(v / f.step)) < 1e-6, `${f.name} ${v} is not a multiple of ${f.step}`);
      });
    }
  }
});

test('species means match the design (many birds, so the sample mean is close)', () => {
  const birds = makeBirds(5, 600);
  SPECIES.forEach((s, l) => {
    const rows = birds.filter(b => b.label === l);
    s.mean.forEach((m, j) => {
      const avg = rows.reduce((sum, b) => sum + b.features[j], 0) / rows.length;
      assert.ok(Math.abs(avg - m) < 0.15 * s.sd[j], `${s.name} ${FEATURES[j].name}: ${avg} vs ${m}`);
    });
  });
});

test('hand-computed leave-one-out score: values 1, 2, 4, 8 with labels 0, 0, 1, 1', () => {
  // 1-NN. Bird at 1 -> nearest is 2 (label 0) right. 2 -> nearest is 1 right.
  // 4 -> nearest is 2 (distance 2, against 4 to the bird at 8): label 0, wrong. 8 -> nearest is 4 right. So 3 of 4.
  const birds = [bird(1, 0, 1), bird(2, 0, 2), bird(3, 1, 4), bird(4, 1, 8)];
  assert.equal(separability(birds, [0], 1), 0.75);
});

test('a perfectly separated pair scores 1', () => {
  const birds = [];
  for (let i = 0; i < 10; i++) { birds.push(bird(i, 0, i, 5), bird(100 + i, 1, 100 + i, 7)); }
  assert.equal(separability(birds, [0, 1], 5), 1);
  assert.equal(separability(birds, [0], 5), 1);
});

test('features unrelated to the labels score near chance (about 1 in 3)', () => {
  const r = rng(5);
  for (let i = 0; i < 4; i++) r();
  const birds = Array.from({ length: 300 }, (_, i) => bird(i, i % 3, r(), r(), r(), r()));
  const score = separability(birds, [0, 1], 5);
  assert.ok(score > 0.24 && score < 0.42, `score ${score}`);
});

test('the score is always in [0, 1] and does not depend on the unit of a feature', () => {
  const birds = makeBirds(3);
  for (const cols of [[0], [3], [0, 1], [2, 3], [1, 3]]) {
    const s = separability(birds, cols);
    assert.ok(s >= 0 && s <= 1);
  }
  const grams = birds.map(b => ({ ...b, features: [b.features[0], b.features[1], b.features[2], b.features[3] * 1000] }));  // kilograms -> grams
  assert.equal(separability(grams, [0, 3]), separability(birds, [0, 3]));
});

test('rankPairs lists the six pairs, best first, and bill length with bill depth wins', () => {
  for (const seed of Array.from({ length: 40 }, (_, i) => i + 1)) {
    const ranked = rankPairs(makeBirds(seed));
    assert.equal(ranked.length, 6);
    assert.equal(new Set(ranked.map(p => `${p.a}-${p.b}`)).size, 6);
    for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].score >= ranked[i].score);
    assert.deepEqual([ranked[0].a, ranked[0].b], [0, 1], `seed ${seed}`);
  }
});

test('the starting sample tells the story the lesson tells', () => {
  const birds = makeBirds(7);
  const ranked = rankPairs(birds);
  assert.ok(ranked[0].score >= 0.9, `best pair ${ranked[0].score}`);
  for (let j = 0; j < 4; j++) assert.ok(separability(birds, [j]) < 0.75, `${FEATURES[j].name} alone`);
  const flipperMass = ranked.find(p => p.a === 2 && p.b === 3).score;
  assert.ok(flipperMass < 0.8, `flipper and mass ${flipperMass}`);
});

test('axisPosition maps the axis range onto 0..10, and formatValue shows value and unit', () => {
  assert.equal(axisPosition(30, 0), 0);
  assert.equal(axisPosition(42.5, 0), 5);
  assert.equal(axisPosition(55, 0), 10);
  assert.equal(axisPosition(4.5, 3), 5);
  assert.equal(formatValue(45.1, 0), '45.1 mm');
  assert.equal(formatValue(5.08, 3), '5.08 kg');
  assert.equal(formatValue(194, 2), '194 mm');
});
