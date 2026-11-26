import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLASS_COUNT, VAL_N, TEST_N, LIMITS, DEFAULTS, CONDITION_RANGES, defaultAmounts, clampAmount, conditionList,
  makeTask, augmentFromSettings, isAugmenting, configFrom, runKey, createRun, stepRun, stepUnit, lossOn, createJob, runSlice,
  createRunCache, snapshotRun, cloneModel, evaluateConditions, confusionMatrix, confusionFor, pictureSet, filterView,
  predictOutcome, compareAccuracy, boundingBox, shapeBox, shapeMask, boxStats, startBox, moveBox, resizeBox,
} from './visionlab.js';
import {
  makeImages, createCnn, forward, predictClass, shift, rotate, applyCondition, trainCnn, trainDense, SHAPE_NAMES, CONDITIONS, BACKGROUND, SHAPE_LEVEL,
} from './vision.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (tol ${tol})`);

test('makeTask: reproducible, four balanced shapes, three disjoint pictures sets of the promised sizes', () => {
  const t = makeTask(3, 100);
  assert.deepEqual(t, makeTask(3, 100));
  assert.notDeepEqual(t.train.X, makeTask(4, 100).train.X);
  assert.equal(t.train.X.length, 100);
  assert.equal(t.val.X.length, VAL_N);
  assert.equal(t.test.X.length, TEST_N);
  assert.deepEqual(t.classes, SHAPE_NAMES.slice(0, CLASS_COUNT));
  const counts = [0, 0, 0, 0];
  t.test.y.forEach(c => counts[c]++);
  assert.deepEqual(counts, [30, 30, 30, 30], '120 test pictures, 30 per shape');
  assert.notDeepEqual(t.train.X.slice(0, 5), t.test.X.slice(0, 5), 'the test pictures are not the training pictures');
});

test('augmentation settings: all off by default, strengths only count when the toggle is on', () => {
  assert.equal(isAugmenting(augmentFromSettings(DEFAULTS)), false);
  const a = augmentFromSettings({ ...DEFAULTS, shift: true, shiftPx: 3, brightness: false, brightAmount: 0.5, rotate: true, rotateDeg: 15, flip: true });
  assert.deepEqual(a, { flip: true, shift: 3, brightness: 0, rotate: 15 });
  assert.equal(isAugmenting(a), true);
  assert.equal(isAugmenting(false), false);
});

test('runKey tells configurations apart by what changes the trained model, and by nothing else', () => {
  const base = configFrom(DEFAULTS);
  const key = runKey(base);
  assert.equal(key, runKey(configFrom({ ...DEFAULTS })));
  assert.equal(key, runKey(configFrom({ ...DEFAULTS, hidden: 32 })), 'the hidden size does not matter for a CNN');
  assert.notEqual(key, runKey(configFrom({ ...DEFAULTS, filters: 6 })));
  assert.notEqual(key, runKey(configFrom({ ...DEFAULTS, seed: 2 })));
  assert.notEqual(key, runKey(configFrom({ ...DEFAULTS, epochs: 10 })));
  assert.notEqual(key, runKey(configFrom({ ...DEFAULTS, flip: true })));
  assert.notEqual(key, runKey(configFrom({ ...DEFAULTS, model: 'dense' })));
  assert.notEqual(runKey(configFrom({ ...DEFAULTS, model: 'dense', hidden: 8 })), runKey(configFrom({ ...DEFAULTS, model: 'dense', hidden: 16 })));
  assert.equal(runKey(configFrom({ ...DEFAULTS, shift: true, shiftPx: 2 })), runKey(base, { shift: 2 }), 'an explicit augmentation replaces the one in the config');
  assert.equal(runKey(configFrom({ ...DEFAULTS, shift: true })), runKey(configFrom({ ...DEFAULTS, shift: true, brightAmount: 0.2 })), 'a strength of a toggle that is off is ignored');
});

test('a CNN run: starts untrained with its history empty, one epoch per step, loss falls, and a rerun is identical', () => {
  const task = makeTask(1, 80);
  const cfg = configFrom({ ...DEFAULTS, n: 80, epochs: 4 });
  const run = createRun(cfg, task);
  assert.equal(run.epochs, 0);
  assert.equal(run.history.loss.length, 0);
  assert.ok(run.initial.loss > 1, 'a random 4-class network starts near ln 4 = 1.39');
  for (let i = 0; i < 4; i++) stepRun(run, task);
  assert.equal(run.epochs, 4);
  assert.equal(run.history.loss.length, 4);
  assert.equal(run.history.valLoss.length, 4);
  assert.ok(run.history.loss[3] < run.initial.loss, 'training lowers the loss');
  const again = createRun(cfg, task);
  for (let i = 0; i < 4; i++) stepRun(again, task);
  assert.deepEqual(again.history, run.history);
  close(run.history.valLoss[3], lossOn(run.model, task.val.X, task.val.y));
});

test('a dense run uses the one-versus-rest loss and learns the same task', () => {
  const task = makeTask(1, 80);
  const cfg = configFrom({ ...DEFAULTS, model: 'dense', hidden: 8, n: 80, epochs: 5 });
  const run = createRun(cfg, task);
  assert.equal(run.model.kind, 'dense');
  assert.equal(run.model.epochsTrained, 0);
  for (let i = 0; i < 5; i++) stepRun(run, task);
  assert.equal(run.epochs, 5);
  assert.ok(run.history.loss[4] < run.initial.loss);
  assert.ok(run.history.accuracy[4] > 0.4, `dense accuracy ${run.history.accuracy[4]} is above chance (0.25)`);
});

// One whole epoch of a job: steps until some run's epoch count changes (or the job ends).
const epochOf = (job, runs) => { const before = runs.map(r => r.epochs).join(); while (job.step() && runs.map(r => r.epochs).join() === before); };

test('createJob works on runs in order up to the target; progress counts every epoch of every run, and a half-done one', () => {
  const task = makeTask(1, 40);
  const cfg = configFrom({ ...DEFAULTS, n: 40, epochs: 2 });
  const a = createRun(cfg, task), b = createRun({ ...cfg, augment: augmentFromSettings({ ...DEFAULTS, flip: true }) }, task);
  const job = createJob([a, b], task, 2);
  assert.deepEqual(job.progress(), { done: 0, total: 4, fraction: 0, run: 0, runs: 2 });
  assert.equal(job.step(), true);
  assert.equal(a.epochs, 0, 'one step is a piece of an epoch, not a whole epoch');
  assert.ok(a.pending, 'the epoch is half done');
  const half = job.progress();
  assert.equal(half.done, 0);
  assert.ok(half.fraction > 0 && half.fraction < 0.25, `a piece of the first epoch of four: ${half.fraction}`);
  epochOf(job, [a, b]);
  assert.equal(a.epochs, 1); assert.equal(b.epochs, 0);
  assert.equal(a.pending, null);
  assert.deepEqual(job.progress(), { done: 1, total: 4, fraction: 0.25, run: 0, runs: 2 });
  epochOf(job, [a, b]);
  assert.equal(job.progress().run, 1);
  epochOf(job, [a, b]);
  while (job.step());
  assert.equal(job.done(), true);
  assert.equal(a.epochs, 2); assert.equal(b.epochs, 2);
  assert.equal(job.step(), false);
  assert.equal(job.progress().fraction, 1);
});

test('a half-done epoch is finished even when the target drops below it, so no model carries stray mini-batches', () => {
  const task = makeTask(1, 40);
  const run = createRun(configFrom({ ...DEFAULTS, n: 40, epochs: 3 }), task);
  const job = createJob([run], task, 3);
  stepRun(run, task); stepRun(run, task); // two epochs done, target 3
  job.step(); // a piece of the third
  assert.ok(run.pending);
  const lowered = createJob([run], task, 1); // the learner moved the Epochs slider down
  assert.equal(lowered.done(), false, 'the half-done epoch still needs finishing');
  while (lowered.step());
  assert.equal(run.pending, null);
  assert.equal(run.epochs, 3);
  assert.equal(run.history.loss.length, 3);
  assert.equal(lowered.done(), true);
});

test('the epoch in pieces equals vision.js trainCnn and trainDense for one epoch: same weights, same history, with and without augmentation', () => {
  const task = makeTask(2, 50);
  const aug = augmentFromSettings({ ...DEFAULTS, shift: true, shiftPx: 2, brightness: true, rotate: true, flip: true });
  for (const model of ['cnn', 'dense']) {
    for (const augment of [false, aug]) {
      const cfg = { ...configFrom({ ...DEFAULTS, model, hidden: 8, filters: 3, n: 50, seed: 2 }), augment: augment || configFrom(DEFAULTS).augment };
      const run = createRun(cfg, task);
      const reference = createRun(cfg, task);
      for (let e = 0; e < 3; e++) {
        stepRun(run, task);
        const opts = { X: task.train.X, y: task.train.y, model: reference.model, classes: 4, epochs: 1, lr: cfg.lr, batchSize: cfg.batchSize, seed: cfg.seed, augment: cfg.augment, valX: task.val.X, valY: task.val.y };
        const { history } = model === 'dense' ? trainDense({ ...opts, hidden: cfg.hidden }) : trainCnn(opts);
        close(run.history.loss[e], history.loss[0], 1e-12);
        close(run.history.accuracy[e], history.accuracy[0], 1e-12);
        close(run.history.valAccuracy[e], history.valAccuracy[0], 1e-12);
      }
      assert.deepEqual(run.model, reference.model, `${model} ${augment ? 'augmented' : 'plain'}: identical weights after 3 epochs`);
      assert.equal(run.epochs, 3);
    }
  }
});

test('pausing between pieces changes nothing: the same weights as running straight through', () => {
  const task = makeTask(1, 40);
  for (const model of ['cnn', 'dense']) {
    const cfg = configFrom({ ...DEFAULTS, model, hidden: 8, n: 40, shift: true, brightness: true });
    const straight = createRun(cfg, task), stopped = createRun(cfg, task);
    stepRun(straight, task); stepRun(straight, task);
    let pieces = 0;
    while (stopped.epochs < 2) { stepUnit(stopped, task); pieces++; }
    assert.ok(pieces > 8, `${model}: two epochs take several pieces (${pieces})`);
    assert.deepEqual(stopped.model, straight.model);
    assert.deepEqual(stopped.history, straight.history);
  }
});

test('runSlice does at least one step, stops at the budget, and stops when the work ends', () => {
  let clock = 0, calls = 0;
  const now = () => clock;
  const r1 = runSlice(() => { calls++; clock += 100; return true; }, { budgetMs: 12, now });
  assert.deepEqual(r1, { steps: 1, done: false });
  assert.equal(calls, 1, 'a step longer than the budget still runs once');
  let left = 5; clock = 0;
  const r2 = runSlice(() => { clock += 1; return --left > 0; }, { budgetMs: 12, now });
  assert.deepEqual(r2, { steps: 5, done: true });
  clock = 0; left = 100;
  const r3 = runSlice(() => { clock += 5; left--; return true; }, { budgetMs: 12, now });
  assert.equal(r3.steps, 3, '5 + 5 + 5 ms crosses 12 ms on the third step');
  assert.equal(runSlice(() => true, { budgetMs: 1e9, now, maxSteps: 4 }).steps, 4);
});

test('run cache: least recently used leaves first, a snapshot is unaffected by training that goes on', () => {
  const cache = createRunCache(2);
  cache.set('a', 1); cache.set('b', 2);
  assert.equal(cache.get('a'), 1);
  cache.set('c', 3);
  assert.equal(cache.has('b'), false, 'b was the least recently used');
  assert.equal(cache.has('a'), true);
  assert.equal(cache.size, 2);
  assert.equal(cache.get('zzz'), undefined);

  const task = makeTask(1, 40);
  const run = createRun(configFrom({ ...DEFAULTS, n: 40, epochs: 3 }), task);
  stepRun(run, task);
  const snap = snapshotRun(run);
  const before = JSON.stringify(snap.model.convW);
  stepRun(run, task);
  assert.equal(JSON.stringify(snap.model.convW), before, 'the snapshot kept its weights');
  assert.notEqual(JSON.stringify(run.model.convW), before);
  assert.equal(snap.epochs, 1);
  assert.equal(snap.history.loss.length, 1);
  const dense = createRun(configFrom({ ...DEFAULTS, model: 'dense', hidden: 8, n: 40 }), task);
  const copy = cloneModel(dense.model);
  copy.nets[0].weights[0][0][0] += 1;
  assert.notEqual(copy.nets[0].weights[0][0][0], dense.model.nets[0].weights[0][0][0]);
});

test('condition amounts: clamped into their range, clean has none, the list follows CONDITIONS', () => {
  assert.deepEqual(defaultAmounts(), { darker: 0.6, brighter: 0.35, rotated: 25, shifted: 2 });
  assert.equal(clampAmount('darker', 5), CONDITION_RANGES.darker.max);
  assert.equal(clampAmount('shifted', -3), 1);
  assert.equal(clampAmount('rotated', NaN), 25);
  assert.equal(clampAmount('clean', 3), 0);
  const list = conditionList({ ...defaultAmounts(), shifted: 3 });
  assert.deepEqual(list.map(c => c.name), CONDITIONS);
  assert.deepEqual(list[0], { name: 'clean' });
  assert.equal(list.find(c => c.name === 'shifted').amount, 3);
});

test('evaluateConditions: an untrained network is at chance everywhere, a trained one is best on clean pictures', () => {
  const task = makeTask(1, 200);
  const cfg = configFrom({ ...DEFAULTS, epochs: 12 });
  const run = createRun(cfg, task);
  const fresh = evaluateConditions(run.model, task.test);
  for (const c of CONDITIONS) assert.ok(fresh[c] < 0.6, `${c} ${fresh[c]} (untrained)`);
  for (let i = 0; i < 12; i++) stepRun(run, task);
  const acc = evaluateConditions(run.model, task.test);
  assert.deepEqual(Object.keys(acc), CONDITIONS);
  assert.ok(acc.clean > 0.9, `clean ${acc.clean}`);
  assert.ok(acc.shifted < acc.clean - 0.1, `a network that never saw a shifted picture loses on them: ${acc.shifted} vs ${acc.clean}`);
});

test('confusionMatrix by hand, and confusionFor agrees with the accuracy it reports', () => {
  // true:      0 0 0 1 1 2 2 2 2
  // predicted: 0 0 1 1 1 2 2 0 2
  const m = confusionMatrix([0, 0, 0, 1, 1, 2, 2, 2, 2], [0, 0, 1, 1, 1, 2, 2, 0, 2], 3);
  assert.deepEqual(m, [[2, 1, 0], [0, 2, 0], [1, 0, 3]]);

  const task = makeTask(2, 80);
  const run = createRun(configFrom({ ...DEFAULTS, n: 80 }), task);
  for (let i = 0; i < 6; i++) stepRun(run, task);
  const c = confusionFor(run.model, task.test.X, task.test.y, 'clean');
  const total = c.matrix.flat().reduce((a, b) => a + b, 0);
  assert.equal(total, TEST_N);
  assert.equal(c.n, TEST_N);
  close(c.accuracy, c.matrix.reduce((s, row, k) => s + row[k], 0) / TEST_N);
  close(c.accuracy, evaluateConditions(run.model, task.test).clean);
  c.recall.forEach((r, k) => close(r, c.matrix[k][k] / 30));
});

test('predictOutcome names which conditions fell at least 5 points below clean; compareAccuracy has a 3 point tolerance', () => {
  assert.equal(predictOutcome({ clean: 1, darker: 0.5, shifted: 0.3 }), 'both');
  assert.equal(predictOutcome({ clean: 1, darker: 0.97, shifted: 0.3 }), 'shifted');
  assert.equal(predictOutcome({ clean: 1, darker: 0.5, shifted: 0.96 }), 'darker');
  assert.equal(predictOutcome({ clean: 0.9, darker: 0.88, shifted: 0.87 }), 'same');
  assert.equal(predictOutcome({ clean: 0.9, darker: 0.85, shifted: 0.9 }), 'darker', 'exactly 5 points counts');
  assert.equal(compareAccuracy(0.9, 1), 'lower');
  assert.equal(compareAccuracy(0.9, 0.88), 'same');
  assert.equal(compareAccuracy(0.9, 0.8), 'higher');
});

test('pictureSet: test pictures follow the condition, training pictures are untouched, augmented ones are reproducible', () => {
  const task = makeTask(1, 60);
  const clean = pictureSet(task, 'test', 10);
  assert.equal(clean.images.length, 10);
  assert.deepEqual(clean.labels, task.test.y.slice(0, 10));
  assert.deepEqual(clean.images[0], task.test.X[0]);
  const dark = pictureSet(task, 'test', 10, { condition: { name: 'darker', amount: 0.6 } });
  assert.ok(Math.max(...dark.images[0]) < Math.max(...task.test.X[0]) * 0.5, 'darker pictures lose most of their light');
  const train = pictureSet(task, 'train', 5);
  assert.deepEqual(train.images[2], task.train.X[2]);
  const aug = { flip: true, shift: 2, brightness: 0.4, rotate: 25 };
  const a1 = pictureSet(task, 'augmented', 8, { augment: aug, seed: 5 }), a2 = pictureSet(task, 'augmented', 8, { augment: aug, seed: 5 });
  assert.deepEqual(a1, a2);
  assert.notDeepEqual(a1.images, pictureSet(task, 'train', 8).images);
  assert.deepEqual(pictureSet(task, 'augmented', 8, { augment: false }).images, pictureSet(task, 'train', 8).images, 'no augmentation: the picture comes back as it was');
  assert.equal(pictureSet(task, 'test', 9999).images.length, TEST_N);
});

test('filterView: a CNN gives each filter its kernel and the three maps; a dense baseline gives hidden-unit weights', () => {
  const x = makeImages({ n: 1, noise: 0, jitter: 0, sizeVar: 0, classes: ['bar', 'ring'], seed: 1 }).X[0];
  const model = createCnn({ size: 12, filters: 3, classes: 4, seed: 1 });
  const v = filterView(model, x);
  assert.equal(v.kind, 'cnn');
  assert.equal(v.filters.length, 3);
  assert.equal(v.filters[0].kernel.length, 9);
  assert.deepEqual(v.filters[1].kernel, model.convW.slice(9, 18));
  assert.equal(v.filters[0].conv.w, 10);
  assert.equal(v.filters[0].activated.data.length, 100);
  assert.equal(v.filters[0].pooled.w, 5);
  assert.ok(v.filters[0].activated.data.every(a => a >= 0), 'after ReLU nothing is negative');
  assert.deepEqual(v.filters[2].conv.data, forward(model, x).conv[2], 'the view shows the network\'s own maps');

  const task = makeTask(1, 40);
  const dense = createRun(configFrom({ ...DEFAULTS, model: 'dense', hidden: 16, n: 40 }), task).model;
  const d = filterView(dense, x, 2);
  assert.equal(d.kind, 'dense');
  assert.equal(d.units.length, 8, 'at most eight units are shown');
  assert.equal(d.hidden, 16);
  assert.equal(d.units[0].weights.length, 144);
  assert.deepEqual(d.units[0].weights, dense.nets[2].weights[0][0]);
  assert.ok(d.units.every(u => u.output >= 0));
});

test('boundingBox is tight around the shape, for a bright, a dim and a noisy picture', () => {
  const box = makeImages({ n: 2, noise: 0, jitter: 0, sizeVar: 0, classes: ['box', 'bar'], seed: 1 });
  const square = box.X[box.y.indexOf(0)];
  // sizeVar 0 gives half-extent 3 centred at 6: the square outline spans pixels 3..8
  assert.deepEqual(boundingBox(square), { x: 3, y: 3, w: 6, h: 6 });
  const bar = box.X[box.y.indexOf(1)];
  const b = boundingBox(bar);
  assert.equal(b.w, 2, 'a vertical bar is two pixels wide here');
  assert.equal(b.h, 6);
  // dim: the same picture at 30% light
  const dim = square.map(v => v * 0.3);
  assert.deepEqual(boundingBox(dim), boundingBox(square));
  // shifted: the box moves with the picture
  const moved = boundingBox(shift(square, 2, 1, BACKGROUND));
  assert.deepEqual(moved, { x: 5, y: 4, w: 6, h: 6 });
  // noisy pictures give a box within a pixel of the clean one
  const noisy = makeImages({ n: 2, noise: 0.1, jitter: 0, sizeVar: 0, classes: ['box', 'bar'], seed: 4 });
  const nb = boundingBox(noisy.X[noisy.y.indexOf(0)]);
  assert.ok(Math.abs(nb.x - 3) <= 1 && Math.abs(nb.w - 6) <= 1, JSON.stringify(nb));
  // a flat picture has no shape
  assert.equal(boundingBox(new Array(144).fill(0.3)), null);
  assert.ok(SHAPE_LEVEL > BACKGROUND);
});

const within = (b, lo, hi) => b.w >= lo.w && b.h >= lo.h && b.w <= hi.w && b.h <= hi.h;

test('shapeBox: the true box of a test picture ignores noise and brightness, moves with a shift and turns with a rotation', () => {
  const task = makeTask(1, 40);
  const n = task.test.X.length;
  const amounts = { darker: 0.6, brighter: 0.6, rotated: 45, shifted: 3 };
  for (let i = 0; i < n; i++) {
    const clean = task.test.X[i];
    const base = shapeBox(clean, 'clean', i);
    assert.ok(base && base.w >= 1 && base.h >= 4 && base.w <= 8 && base.h <= 8, `clean ${i}: ${JSON.stringify(base)}`);
    // brighter and darker do not move anything, however strong and noisy: the clean box stands
    assert.deepEqual(shapeBox(clean, { name: 'brighter', amount: amounts.brighter }, i), base, `brighter ${i}`);
    assert.deepEqual(shapeBox(clean, { name: 'darker', amount: 0.9 }, i), base, `darker ${i}`);
    // shifted: the clean box moved by the same step, clipped at the edge, never bigger
    const shifted = shapeBox(clean, { name: 'shifted', amount: amounts.shifted }, i);
    const probe = applyCondition(clean, { name: 'shifted', amount: amounts.shifted }, i);
    const expected = boundingBox(shapeMask(probe));
    assert.deepEqual(shifted, expected, `shifted ${i}`);
    if (shifted) {
      assert.ok(shifted.w <= base.w && shifted.h <= base.h, `shifting only clips: ${JSON.stringify([base, shifted])}`);
      assert.ok(shifted.x >= 0 && shifted.y >= 0 && shifted.x + shifted.w <= 12 && shifted.y + shifted.h <= 12);
    }
    // rotated: the box of the turned shape stays within the box of the rotated rectangle, plus a pixel of rounding
    const rotated = shapeBox(clean, { name: 'rotated', amount: amounts.rotated }, i);
    const rad = (amounts.rotated * Math.PI) / 180, c = Math.abs(Math.cos(rad)), sn = Math.abs(Math.sin(rad));
    assert.ok(rotated && rotated.w <= base.w * c + base.h * sn + 1 && rotated.h <= base.w * sn + base.h * c + 1, `rotated ${i}: ${JSON.stringify([base, rotated])}`);
  }
});

test('shapeBox: the case that went wrong, a thin bar in the Brighter test, now has a box as thin as the bar', () => {
  const task = makeTask(1, 40);
  // pictureSet applies the condition and returns the true box beside it
  const bright = pictureSet(task, 'test', task.test.X.length, { condition: { name: 'brighter', amount: 0.35 } });
  const cleanSet = pictureSet(task, 'test', task.test.X.length, { condition: 'clean' });
  assert.deepEqual(bright.boxes, cleanSet.boxes, 'brightening never changes the true boxes');
  // the old method (cut halfway between darkest and brightest pixel of the brightened picture) did cross the noise on some pictures
  const old = bright.images.map(boundingBox);
  const wrong = old.filter((b, i) => b && (b.w > cleanSet.boxes[i].w + 1 || b.h > cleanSet.boxes[i].h + 1)).length;
  assert.ok(wrong > 0, 'the picture set still contains pictures that fooled the old cut, so this test would have failed on it');
  bright.boxes.forEach((b, i) => assert.ok(b.w <= 8 && b.h <= 8, `picture ${i}: ${JSON.stringify(b)}`));
});

test('pictureSet boxes: every source has a box inside the picture, training boxes are the clean ones, augmented boxes follow the same random draws', () => {
  const task = makeTask(1, 60);
  const train = pictureSet(task, 'train', 20);
  train.boxes.forEach((b, i) => assert.deepEqual(b, boundingBox(shapeMask(task.train.X[i]))));
  const aug = augmentFromSettings({ ...DEFAULTS, shift: true, shiftPx: 2, brightness: true, brightAmount: 0.6, rotate: true, rotateDeg: 25, flip: true });
  const a = pictureSet(task, 'augmented', 40, { augment: aug, seed: 3 });
  const again = pictureSet(task, 'augmented', 40, { augment: aug, seed: 3 });
  assert.deepEqual(a, again);
  a.boxes.forEach((b, i) => assert.ok(b === null || (b.x >= 0 && b.y >= 0 && b.x + b.w <= 12 && b.y + b.h <= 12 && b.w <= 9 && b.h <= 9), `augmented ${i}: ${JSON.stringify(b)}`));
  // without brightness jitter the box is exactly the box of a noise-free copy of the augmented picture
  const geo = augmentFromSettings({ ...DEFAULTS, shift: true, shiftPx: 3, flip: true });
  const g = pictureSet(task, 'augmented', 20, { augment: geo, seed: 5 });
  g.boxes.forEach((b, i) => assert.deepEqual(b, boundingBox(shapeMask(g.images[i]))));
});

test('boxStats: IoU by hand, the split into true positive or miss, and the threshold', () => {
  const t = { x: 2, y: 2, w: 4, h: 4 };
  const same = boxStats(t, { ...t });
  assert.equal(same.iou, 1); assert.equal(same.verdict, 'tp'); assert.equal(same.tp, 1); assert.equal(same.fp, 0); assert.equal(same.fn, 0);
  // shifted by 2 in x: intersection 2 x 4 = 8, union 16 + 16 - 8 = 24, IoU = 1/3
  const half = boxStats(t, { x: 4, y: 2, w: 4, h: 4 });
  close(half.iou, 1 / 3); assert.equal(half.inter, 8); assert.equal(half.union, 24);
  assert.equal(half.verdict, 'miss'); assert.equal(half.fp, 1); assert.equal(half.fn, 1); assert.equal(half.tp, 0);
  assert.equal(boxStats(t, { x: 4, y: 2, w: 4, h: 4 }, 0.3).verdict, 'tp', 'a lower threshold accepts it');
  // shifted by 1: intersection 3 x 4 = 12, union 20, IoU 0.6
  close(boxStats(t, { x: 3, y: 2, w: 4, h: 4 }).iou, 0.6);
  const apart = boxStats(t, { x: 8, y: 8, w: 2, h: 2 });
  assert.equal(apart.iou, 0); assert.equal(apart.inter, 0); assert.equal(apart.union, 20);
  assert.equal(boxStats(t, { x: 6, y: 2, w: 3, h: 4 }).iou, 0, 'boxes that only touch do not overlap');
});

test('moveBox and resizeBox keep the box inside the picture and at least one pixel across', () => {
  const b = { x: 3, y: 3, w: 4, h: 4 };
  assert.deepEqual(moveBox(b, 0.25, -0.5), { x: 3.25, y: 2.5, w: 4, h: 4 });
  assert.deepEqual(moveBox(b, 100, 100), { x: 8, y: 8, w: 4, h: 4 });
  assert.deepEqual(moveBox(b, -100, -100), { x: 0, y: 0, w: 4, h: 4 });
  assert.deepEqual(resizeBox(b, 0.5, -0.25), { x: 3, y: 3, w: 4.5, h: 3.75 });
  assert.deepEqual(resizeBox(b, 100, 100), { x: 3, y: 3, w: 9, h: 9 });
  assert.deepEqual(resizeBox(b, -100, -100), { x: 3, y: 3, w: 1, h: 1 });
});

test('startBox: wobbly but overlapping, inside the picture, and below a perfect IoU', () => {
  for (const truth of [{ x: 3, y: 3, w: 6, h: 6 }, { x: 4, y: 3, w: 2, h: 6 }, { x: 8, y: 8, w: 4, h: 4 }]) {
    const s = startBox(truth);
    assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= 12 && s.y + s.h <= 12, JSON.stringify(s));
    const v = boxStats(truth, s).iou;
    assert.ok(v < 1, `iou ${v}`);
  }
  const mid = boxStats({ x: 3, y: 3, w: 6, h: 6 }, startBox({ x: 3, y: 3, w: 6, h: 6 })).iou;
  assert.ok(mid > 0.35 && mid < 0.75, `a typical first guess is a near miss: ${mid}`);
});

test('limits and defaults are consistent: every default sits inside its limit and the defaults train without augmentation', () => {
  for (const [key, [lo, hi]] of Object.entries(LIMITS)) {
    const value = DEFAULTS[key];
    if (value != null) assert.ok(value >= lo && value <= hi, `${key} ${value} not in [${lo}, ${hi}]`);
  }
  assert.equal(isAugmenting(configFrom(DEFAULTS).augment), false);
  assert.equal(predictClass(createCnn({ size: 12, classes: 4, seed: 1 }), makeTask(1, 40).test.X[0]) < 4, true);
});
