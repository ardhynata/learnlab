import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IMAGE_SIZE, BACKGROUND, SHAPE_LEVEL, SHAPE_NAMES, MAX_IMAGES, MAX_EPOCHS, AUGMENT_DEFAULTS, CONDITIONS,
  makeImages, imageRows, flip, flipH, flipV, shift, rotate90, rotate, brightness, contrast,
  normalizeAugment, augmentImage, toGrid, gridRows, conv2d, maxPool, relu,
  createCnn, cloneCnn, cnnParamCount, forward, featureMaps, backward, cnnGradients, cnnLoss, cnnGradientCheck, trainCnn,
  trainDense, denseParamCount, paramCount, compareParams, predictProba, predictClass, accuracy,
  applyCondition, evaluate, evaluateAll,
  iou, makeDetectionScenes, detectionMetrics, precisionRecallCurve, averagePrecision, iouSweep,
} from './vision.js';
import { rng } from './rng.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (tol ${tol})`);
const closeArr = (a, b, tol = 1e-9) => { assert.equal(a.length, b.length); a.forEach((v, i) => close(v, b[i], tol)); };
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;

// Indices of the "on" pixels of a noise-free picture.
const onPixels = x => x.flatMap((v, i) => (v > 0.5 ? [i] : []));
const pure = opts => makeImages({ n: 1, noise: 0, jitter: 0, sizeVar: 0, ...opts });

// ---------------------------------------------------------------------------------------------------------
// Pictures

test('makeImages: size, range, classes balanced, shuffled, deterministic', () => {
  const d = makeImages({ n: 203, classes: 4, seed: 7 });
  assert.equal(d.X.length, 203);
  assert.equal(d.y.length, 203);
  assert.equal(d.size, IMAGE_SIZE);
  assert.deepEqual(d.classes, SHAPE_NAMES.slice(0, 4));
  assert.ok(d.X.every(x => x.length === 144 && x.every(v => v >= 0 && v <= 1)));
  const counts = [0, 0, 0, 0];
  d.y.forEach(c => counts[c]++);
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `counts ${counts}`);
  assert.notDeepEqual(d.y.slice(0, 8), [0, 1, 2, 3, 0, 1, 2, 3], 'shuffled');
  assert.deepEqual(makeImages({ n: 30, seed: 7 }), makeImages({ n: 30, seed: 7 }));
  assert.notDeepEqual(makeImages({ n: 30, seed: 7 }).X, makeImages({ n: 30, seed: 8 }).X);
});

test('makeImages: class selection, validation and other sizes', () => {
  assert.deepEqual(makeImages({ n: 4, classes: ['box', 'ring'] }).classes, ['box', 'ring']);
  assert.equal(makeImages({ n: 10, classes: 5 }).classes.length, 5);
  assert.throws(() => makeImages({ classes: 1 }), /classes/);
  assert.throws(() => makeImages({ classes: 9 }), /classes/);
  assert.throws(() => makeImages({ classes: ['ring', 'hexagon'] }), /unknown shape/);
  const small = makeImages({ n: 3, size: 8, noise: 0 });
  assert.equal(small.X[0].length, 64);
  assert.equal(small.size, 8);
});

test('makeImages: noise-free shapes land on exactly the hand-counted pixels', () => {
  const pic = name => {
    const d = makeImages({ n: 2, noise: 0, jitter: 0, sizeVar: 0, classes: [name, name === 'bar' ? 'ring' : 'bar'] });
    return d.X[d.y.indexOf(0)];
  };
  // Centre (6, 6), half-extent 3: pixel centres sit at offsets +-0.5, +-1.5, +-2.5 from it.
  const bar = pic('bar');
  assert.deepEqual(onPixels(bar), [3, 4, 5, 6, 7, 8].flatMap(y => [y * 12 + 5, y * 12 + 6]), 'bar: columns 5-6, rows 3-8');
  assert.equal(onPixels(pic('cross')).length, 20, 'cross: 12 + 12 - 4');
  assert.equal(onPixels(pic('box')).length, 20, 'box: 6 x 6 outline');
  assert.equal(onPixels(pic('triangle')).length, 24, 'triangle rows 2+2+4+4+6+6');
  const ring = pic('ring');
  assert.equal(onPixels(ring).length, 20, 'ring');
  assert.equal(ring[5 * 12 + 5], BACKGROUND, 'the ring is hollow');
  assert.equal(ring[5 * 12 + 3], SHAPE_LEVEL);
  assert.ok(new Set(bar).size === 2, 'noise 0 gives exactly two grey levels');
  // The triangle is wide at the bottom and narrow at the top.
  const tri = pic('triangle');
  const rowOn = y => onPixels(tri).filter(i => Math.floor(i / 12) === y).length;
  assert.ok(rowOn(8) > rowOn(3));
});

test('makeImages: jitter moves the shape, noise perturbs it', () => {
  const centroid = x => {
    let sx = 0, sy = 0, m = 0;
    onPixels(x).forEach(i => { sx += i % 12; sy += Math.floor(i / 12); m++; });
    return [sx / m, sy / m];
  };
  const moved = makeImages({ n: 40, classes: ['bar', 'box'], noise: 0, jitter: 1, seed: 3 }).X.map(centroid);
  const xs = moved.map(c => c[0]);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 0.8, 'the centre wanders');
  assert.ok(xs.every(v => v > 4.2 && v < 7));
  const still = makeImages({ n: 20, classes: ['bar', 'box'], noise: 0, jitter: 0, sizeVar: 0 }).X.map(centroid);
  assert.ok(still.every(c => Math.abs(c[0] - 5.5) < 1e-9 && Math.abs(c[1] - 5.5) < 1e-9));
  const clean = pure({}).X[0], noisy = makeImages({ n: 1, noise: 0.2, jitter: 0, sizeVar: 0 }).X[0];
  assert.notDeepEqual(clean, noisy);
  assert.ok(clean.some((v, i) => Math.abs(v - noisy[i]) > 0.05));
});

test('imageRows prints one character per pixel', () => {
  const rows = imageRows(pure({ classes: ['bar', 'ring'] }).X[0]);
  assert.equal(rows.length, 12);
  assert.ok(rows.every(r => r.length === 12));
  assert.throws(() => imageRows([1, 2, 3]), /square/);
});

// ---------------------------------------------------------------------------------------------------------
// Transforms

const G3 = [1, 2, 3, 4, 5, 6, 7, 8, 9];

test('flips, shift and rotate90 on a 3 x 3 picture (hand-computed)', () => {
  assert.deepEqual(flipH(G3), [3, 2, 1, 6, 5, 4, 9, 8, 7]);
  assert.deepEqual(flipV(G3), [7, 8, 9, 4, 5, 6, 1, 2, 3]);
  assert.deepEqual(shift(G3, 1, 0), [0, 1, 2, 0, 4, 5, 0, 7, 8]);
  assert.deepEqual(shift(G3, 0, -1), [4, 5, 6, 7, 8, 9, 0, 0, 0]);
  assert.deepEqual(shift(G3, -1, 1, -1), [-1, -1, -1, 2, 3, -1, 5, 6, -1]);
  assert.deepEqual(shift(G3, 5, 0), new Array(9).fill(0), 'shifting out of the picture leaves only the fill');
  assert.deepEqual(rotate90(G3), [7, 4, 1, 8, 5, 2, 9, 6, 3], 'clockwise: the top row becomes the right column');
  assert.deepEqual(rotate90(G3, -1), [3, 6, 9, 2, 5, 8, 1, 4, 7]);
  assert.deepEqual(rotate90(G3, 2), [9, 8, 7, 6, 5, 4, 3, 2, 1]);
  assert.deepEqual(rotate90(G3, 4), G3);
  assert.deepEqual(rotate90(rotate90(rotate90(G3))), rotate90(G3, -1));
  assert.deepEqual(flipH(flipH(G3)), G3);
  assert.deepEqual(flipV(flipV(G3)), G3);
  const copy = rotate90(G3, 0);
  assert.deepEqual(copy, G3);
  assert.notEqual(copy, G3, 'a new array even for no rotation');
  assert.deepEqual(G3, [1, 2, 3, 4, 5, 6, 7, 8, 9], 'inputs are never changed');
});

test('rotate by degrees: exact at multiples of 90, identity at 0, nearest neighbour in between', () => {
  const x = makeImages({ n: 1, seed: 4, noise: 0.05 }).X[0];
  assert.deepEqual(rotate(x, 0), x);
  assert.deepEqual(rotate(x, 90), rotate90(x));
  assert.deepEqual(rotate(x, 180), rotate90(x, 2));
  assert.deepEqual(rotate(x, -90), rotate90(x, -1));
  assert.deepEqual(rotate(G3, 90), rotate90(G3));
  const r = rotate(x, 25, BACKGROUND);
  assert.equal(r.length, 144);
  assert.notDeepEqual(r, x);
  assert.ok(r.every(v => x.includes(v) || v === BACKGROUND), 'nearest neighbour only copies existing values or the fill');
  // Rotating a bar by 90 degrees makes it horizontal.
  const bar = pure({ classes: ['bar', 'ring'] });
  const b = bar.X[bar.y.indexOf(0)];
  const flat = onPixels(rotate90(b));
  assert.deepEqual(flat, [5, 6].flatMap(y => [3, 4, 5, 6, 7, 8].map(x2 => y * 12 + x2)));
});

test('brightness and contrast clip to [0, 1] and follow the formulas', () => {
  closeArr(brightness([0.2, 0.8, 0.5, 0.95], 0.1), [0.3, 0.9, 0.6, 1]);
  closeArr(brightness([0.2, 0.8, 0.5, 0.05], -0.1), [0.1, 0.7, 0.4, 0]);
  closeArr(contrast([0.2, 0.8, 0.5, 0.5], 2), [0, 1, 0.5, 0.5]);
  closeArr(contrast([0.2, 0.8, 0.5, 0.5], 0.5), [0.35, 0.65, 0.5, 0.5]);
  closeArr(contrast([0.2, 0.8, 0.5, 0.4], 0.5, 0), [0.1, 0.4, 0.25, 0.2]);
  const x = makeImages({ n: 1, seed: 2 }).X[0];
  assert.ok(mean(brightness(x, 0.2)) > mean(x));
  assert.ok(mean(brightness(x, -0.2)) < mean(x));
});

// ---------------------------------------------------------------------------------------------------------
// Augmentation

test('normalizeAugment: false / true / numbers and defaults', () => {
  assert.deepEqual(normalizeAugment(undefined), { flip: false, shift: 0, brightness: 0, rotate: 0 });
  assert.deepEqual(normalizeAugment(false), { flip: false, shift: 0, brightness: 0, rotate: 0 });
  assert.deepEqual(normalizeAugment({ flip: true, shift: true, brightness: true, rotate: true }), AUGMENT_DEFAULTS);
  assert.deepEqual(normalizeAugment({ shift: 3, rotate: 10, flip: false, brightness: -1 }), { flip: false, shift: 3, brightness: 0, rotate: 10 });
});

test('augmentImage: deterministic from the generator, never changes its input, off means a plain copy', () => {
  const x = makeImages({ n: 1, seed: 9 }).X[0];
  const before = x.slice();
  const aug = { flip: true, shift: true, brightness: true, rotate: true };
  assert.deepEqual(augmentImage(x, aug, rng(5)), augmentImage(x, aug, rng(5)));
  assert.notDeepEqual(augmentImage(x, aug, rng(5)), x);
  assert.deepEqual(x, before);
  assert.deepEqual(augmentImage(x, false, rng(5)), x);
  assert.notEqual(augmentImage(x, false, rng(5)), x);
  const draws = new Set();
  const stream = rng(1);
  for (let s = 1; s <= 12; s++) draws.add(augmentImage(x, aug, stream).join());
  assert.ok(draws.size >= 10, 'different draws give different pictures');
  // shift 2 never moves by more than 2 pixels: the centre of mass stays close.
  const bar = pure({ classes: ['bar', 'ring'] });
  const b = bar.X[bar.y.indexOf(0)];
  const moves = rng(2);
  for (let s = 1; s <= 20; s++) {
    const out = augmentImage(b, { shift: 2 }, moves);
    const xs = onPixels(out).map(i => i % 12);
    const lo = Math.min(...xs), hi = Math.max(...xs);
    assert.ok(lo >= 3 && hi <= 8, `bar columns 5-6 move by at most 2: ${lo}..${hi}`);
  }
  // flip alone is the identity or the mirror image.
  const outs = new Set();
  const flips = rng(3);
  for (let s = 1; s <= 12; s++) outs.add(augmentImage(x, { flip: true }, flips).join());
  assert.deepEqual([...outs].sort(), [x.join(), flipH(x).join()].sort());
});

// ---------------------------------------------------------------------------------------------------------
// Convolution and pooling

const PATCH = [
  [1, 2, 0, 1, 3],
  [4, 0, 1, 2, 1],
  [2, 1, 3, 0, 2],
  [0, 2, 1, 4, 1],
  [1, 0, 2, 1, 3],
];
const SOBEL_X = [[1, 0, -1], [2, 0, -2], [1, 0, -1]];

test('conv2d: a 5 x 5 patch with a 3 x 3 edge kernel gives the hand-computed 3 x 3 map', () => {
  // out[0][0] = (1*1 - 0) + 2*(4 - 1) + (2 - 3) = 1 + 6 - 1 = 6, and so on for the other eight positions.
  const out = conv2d(PATCH, SOBEL_X);
  assert.equal(out.w, 3);
  assert.equal(out.h, 3);
  assert.deepEqual(gridRows(out), [[6, -2, -2], [0, -2, 2], [-4, -4, 0]]);
  assert.deepEqual(conv2d(PATCH.flat(), SOBEL_X.flat()).data, out.data, 'flat input and kernel work the same');
  assert.deepEqual(conv2d(toGrid(PATCH), toGrid(SOBEL_X)).data, out.data);
  // It is cross-correlation, not convolution: flipping the kernel flips the sign of this antisymmetric kernel.
  const flipped = SOBEL_X.map(r => r.slice().reverse());
  assert.deepEqual(conv2d(PATCH, flipped).data, out.data.map(v => 0 - v));
  assert.throws(() => conv2d([[1, 2], [3, 4]], SOBEL_X), /larger/);
});

test('conv2d: a vertical edge lights up the vertical-edge kernel and a flat area gives zero', () => {
  const edge = [];
  for (let y = 0; y < 5; y++) edge.push([0, 0, 1, 1, 1]);
  assert.deepEqual(gridRows(conv2d(edge, SOBEL_X)), new Array(3).fill([-4, -4, 0]));
  assert.deepEqual(conv2d(new Array(25).fill(0.7), SOBEL_X).data.map(v => Math.abs(v) < 1e-12), new Array(9).fill(true));
});

test('conv2d: same padding keeps the size, with zeros past the border', () => {
  const identity = [[0, 0, 0], [0, 1, 0], [0, 0, 0]];
  assert.deepEqual(conv2d(PATCH, identity, { pad: 'same' }).data, PATCH.flat());
  const box = conv2d([[1, 2, 3], [4, 5, 6], [7, 8, 9]], [[1, 1, 1], [1, 1, 1], [1, 1, 1]], { pad: 'same' });
  assert.deepEqual(gridRows(box), [[12, 21, 16], [27, 45, 33], [24, 39, 28]]);
  assert.throws(() => conv2d(PATCH, [[1, 1], [1, 1]], { pad: 'same' }), /odd/);
  assert.throws(() => conv2d(PATCH, SOBEL_X, { pad: 'full' }), /pad/);
});

test('maxPool of a 4 x 4 map (hand-computed), ragged edges and relu', () => {
  const m = [[1, 3, 2, 4], [5, 6, 1, 2], [7, 2, 9, 0], [3, 4, 5, 8]];
  const p = maxPool(m);
  assert.deepEqual(gridRows(p), [[6, 4], [7, 9]]);
  assert.equal(p.w, 2);
  assert.deepEqual(gridRows(maxPool(m, 4)), [[9]]);
  assert.deepEqual(gridRows(maxPool(PATCH)), [[4, 2], [2, 4]], 'a 5 x 5 map drops its last row and column');
  assert.throws(() => maxPool([[1]], 2), /larger/);
  assert.deepEqual(relu([-1, 2, 0, -0.5]), [0, 2, 0, 0]);
  assert.deepEqual(relu([[-1, 2], [3, -4]]), [[0, 2], [3, 0]]);
  assert.deepEqual(relu(conv2d(PATCH, SOBEL_X)).data, [6, 0, 0, 0, 0, 2, 0, 0, 0]);
  assert.equal(maxPool(relu(conv2d(PATCH, SOBEL_X))).data[0], 6);
});

// ---------------------------------------------------------------------------------------------------------
// The CNN

// A hand-built 4 x 4 network: one filter that copies the centre pixel, a 2 x 2 conv map, one pooled value, 2 classes.
function handCnn() {
  return createCnn({
    size: 4, filters: 1, classes: 2,
    convW: [0, 0, 0, 0, 1, 0, 0, 0, 0], convB: [0], denseW: [1, -1], denseB: [0, 0],
  });
}
const HAND_X = [0, 0, 0, 0, 0, 0.2, 0.5, 0, 0, 0.1, 0.3, 0, 0, 0, 0, 0];

test('createCnn: shapes, parameter count, init, explicit weights and validation', () => {
  const m = createCnn({ size: 12, filters: 5, classes: 4, seed: 3 });
  assert.equal(m.kind, 'cnn');
  assert.equal(m.convW.length, 45);
  assert.equal(m.convB.length, 5);
  assert.equal(m.denseW.length, 4 * 5 * 25);
  assert.equal(m.denseB.length, 4);
  assert.ok(m.convB.every(v => v === 0) && m.denseB.every(v => v === 0));
  assert.deepEqual(createCnn({ seed: 3 }), createCnn({ seed: 3 }));
  assert.notDeepEqual(createCnn({ seed: 3 }).convW, createCnn({ seed: 4 }).convW);
  const std = Math.sqrt(mean(m.convW.map(v => v * v)));
  assert.ok(std > 0.2 && std < 0.9, `He scale sqrt(2/9) = 0.47, got ${std}`);
  assert.throws(() => createCnn({ filters: 0 }), /filters/);
  assert.throws(() => createCnn({ filters: 9 }), /filters/);
  assert.throws(() => createCnn({ classes: 1 }), /classes/);
  assert.throws(() => createCnn({ size: 7 }), /even/);
  assert.throws(() => createCnn({ size: 2 }), /even/);
  assert.throws(() => createCnn({ size: 4, filters: 1, classes: 2, denseW: [1] }), /denseW/);
  const given = [0, 0, 0, 0, 1, 0, 0, 0, 0];
  const h = createCnn({ size: 4, filters: 1, classes: 2, convW: given });
  given[4] = 9;
  assert.equal(h.convW[4], 1, 'explicit weights are copied');
});

test('parameter counts: conv weights do not depend on the picture size, the dense layer does', () => {
  assert.deepEqual(cnnParamCount({ size: 12, filters: 4, classes: 4 }), { conv: 40, dense: 404, total: 444 });
  assert.deepEqual(cnnParamCount({ size: 24, filters: 4, classes: 4 }), { conv: 40, dense: 4 * (4 * 121 + 1), total: 40 + 1940 });
  assert.deepEqual(cnnParamCount({ size: 12, filters: 6, classes: 3 }), { conv: 60, dense: 3 * (6 * 25 + 1), total: 60 + 453 });
  const m = createCnn({ size: 12, filters: 5, classes: 4 });
  assert.equal(paramCount(m), m.convW.length + m.convB.length + m.denseW.length + m.denseB.length);
  assert.equal(cnnParamCount(m).total, paramCount(m));
  assert.equal(denseParamCount({ size: 12, hidden: 16, classes: 4 }), 4 * (144 * 16 + 16 + 16 + 1));
  const cmp = compareParams();
  assert.equal(cmp.cnn.total, 444);
  assert.equal(cmp.dense, 9348);
  close(cmp.ratio, 9348 / 444);
  assert.ok(compareParams({ size: 24 }).dense > 3.5 * compareParams({ size: 12 }).dense);
});

test('forward: hand-built network, pooling choice and softmax', () => {
  const m = handCnn();
  const c = forward(m, HAND_X);
  // The 2 x 2 conv map copies the centre pixels 0.2, 0.5, 0.1, 0.3; the pool keeps 0.5 (index 1).
  assert.deepEqual(c.conv[0], [0.2, 0.5, 0.1, 0.3]);
  assert.deepEqual(c.arg[0], [1]);
  assert.deepEqual(c.flat, [0.5]);
  assert.deepEqual(c.logits, [0.5, -0.5]);
  close(c.probs[0], 1 / (1 + Math.exp(-1)));
  close(c.probs[0] + c.probs[1], 1);
  close(c.probs[0], 0.7310585786300049, 1e-12);
  assert.equal(predictClass(m, HAND_X), 0);
  close(predictProba(m, HAND_X)[1], 0.2689414213699951, 1e-12);
  assert.throws(() => forward(m, [1, 2, 3]), /pixels/);
  // ReLU: a negative bias kills the unit.
  const dead = createCnn({ size: 4, filters: 1, classes: 2, convW: m.convW, convB: [-1], denseW: [1, -1], denseB: [0, 0] });
  assert.deepEqual(forward(dead, HAND_X).flat, [0]);
  // Large logits do not overflow the softmax.
  const big = createCnn({ size: 4, filters: 1, classes: 2, convW: m.convW, convB: [0], denseW: [1000, -1000], denseB: [0, 0] });
  const p = forward(big, [0, 0, 0, 0, 0, 5, 5, 0, 0, 5, 5, 0, 0, 0, 0, 0]).probs;
  assert.ok(p.every(Number.isFinite));
  close(p[0], 1);
});

test('featureMaps of a real picture: the ReLU map is non-negative and the pooled map has the pooled size', () => {
  const m = createCnn({ size: 12, filters: 4, classes: 4, seed: 2 });
  const x = makeImages({ n: 1, seed: 2 }).X[0];
  const maps = featureMaps(m, x);
  assert.equal(maps.conv.length, 4);
  assert.equal(maps.conv[0].w, 10);
  assert.equal(maps.pooled[0].w, 5);
  assert.ok(maps.activated.every(g => g.data.every(v => v >= 0)));
  // The same numbers conv2d + bias + relu + maxPool give with the filter's own weights.
  const k = m.convW.slice(0, 9);
  const c0 = conv2d(x, [k.slice(0, 3), k.slice(3, 6), k.slice(6, 9)]).data.map(v => v + m.convB[0]);
  closeArr(maps.conv[0].data, c0);
  closeArr(maps.pooled[0].data, maxPool({ w: 10, h: 10, data: c0.map(v => (v > 0 ? v : 0)) }).data);
});

test('backward: hand-computed gradient of the hand-built network', () => {
  const m = handCnn();
  const g = backward(m, forward(m, HAND_X), 0);
  const p0 = 1 / (1 + Math.exp(-1));
  close(g.loss, -Math.log(p0));
  // dlogits = [p0 - 1, 1 - p0]; denseW grad = dlogits * pooled value 0.5; dflat = (p0 - 1) - (1 - p0).
  closeArr(g.denseB, [p0 - 1, 1 - p0]);
  closeArr(g.denseW, [0.5 * (p0 - 1), 0.5 * (1 - p0)]);
  const dflat = 2 * (p0 - 1);
  // Only the winning cell (output row 0, column 1) receives it; its 3 x 3 patch is rows 0-2, columns 1-3 of the picture.
  const patch = [0, 0, 0, 0.2, 0.5, 0, 0.1, 0.3, 0].map((_, i) => HAND_X[Math.floor(i / 3) * 4 + 1 + (i % 3)]);
  closeArr(g.convW, patch.map(v => dflat * v));
  closeArr(g.convB, [dflat]);
});

test('backward: the max pool sends the gradient to the winning cell only, and a dead ReLU blocks it', () => {
  const m = handCnn();
  const p0 = 1 / (1 + Math.exp(-1));
  // Label 1: dlogits = [p0, p1 - 1], so dflat = 1 * p0 - (-1) * (p1 - 1) = p0 + p1 - 1 + p0 = 2 * p0. One winning cell, so the bias gradient is that alone.
  const g = backward(m, forward(m, HAND_X), 1);
  close(g.convB[0], 2 * p0);
  // Make another cell the winner (output row 1, column 1 = picture pixel (2, 2)): the gradient moves to its patch.
  const x2 = HAND_X.slice(); x2[10] = 0.9;
  const c2 = forward(m, x2);
  assert.deepEqual(c2.arg[0], [3]);
  const g2 = backward(m, c2, 1);
  const patch = [0, 1, 2].flatMap(i => [0, 1, 2].map(j => x2[(1 + i) * 4 + 1 + j]));
  closeArr(g2.convW, patch.map(v => g2.convB[0] * v));
  // With the unit switched off by its bias, no gradient reaches the filter.
  const dead = createCnn({ size: 4, filters: 1, classes: 2, convW: m.convW, convB: [-1], denseW: [1, -1], denseB: [0, 0] });
  const gd = backward(dead, forward(dead, HAND_X), 1);
  assert.deepEqual(gd.convW, new Array(9).fill(0));
  assert.deepEqual(gd.convB, [0]);
});

function randomImages(count, size, seed) {
  const r = rng(seed);
  return Array.from({ length: count }, () => Array.from({ length: size * size }, () => r()));
}

test('CNN gradient equals the numerical gradient on a tiny case and on a real one', () => {
  const X = randomImages(6, 6, 11);
  const y = [0, 1, 2, 0, 1, 2];
  const tiny = createCnn({ size: 6, filters: 2, classes: 3, seed: 5 });
  tiny.convB = [0.05, -0.02];
  const check = cnnGradientCheck(tiny, X, y);
  assert.equal(check.checked, 18 + 2 + 3 * 8 + 3);
  assert.ok(check.ok, `max error ${check.maxError} at ${JSON.stringify(check.worst)}`);
  assert.ok(check.maxError < 1e-7);
  // A realistic case: 12 x 12 shapes, 5 filters.
  const d = makeImages({ n: 6, seed: 4, noise: 0.15 });
  const m = createCnn({ size: 12, filters: 5, classes: 4, seed: 6 });
  const real = cnnGradientCheck(m, d.X, d.y, { tol: 1e-6 });
  assert.equal(real.checked, paramCount(m));
  assert.ok(real.ok, `max error ${real.maxError} at ${JSON.stringify(real.worst)}`);
  // The loss reported with the gradient is the mean cross-entropy.
  const grads = cnnGradients(tiny, X, y);
  assert.ok(Number.isFinite(grads.loss) && grads.loss > 0);
  close(grads.loss, cnnLoss(tiny, X, y));
  // The gradient is a function of the weights: after a nudge the old one no longer matches.
  const analytic = grads.convW[0];
  tiny.convW[0] += 0.5;
  assert.ok(Math.abs(cnnGradients(tiny, X, y).convW[0] - analytic) > 1e-3, 'the gradient depends on the weights');
});

test('cnnGradients averages the per-example gradients over the chosen rows', () => {
  const X = randomImages(4, 6, 3), y = [0, 1, 2, 1];
  const m = createCnn({ size: 6, filters: 2, classes: 3, seed: 2 });
  const sub = cnnGradients(m, X, y, [1, 3]);
  const a = backward(m, forward(m, X[1]), 1), b = backward(m, forward(m, X[3]), 1);
  closeArr(sub.convW, a.convW.map((v, i) => (v + b.convW[i]) / 2));
  close(sub.loss, (a.loss + b.loss) / 2);
  assert.equal(cnnLoss(m, [], []), 0);
});

// ---------------------------------------------------------------------------------------------------------
// Training, augmentation, robustness

const TRAIN = makeImages({ n: 300, seed: 1 });
const TEST = makeImages({ n: 240, seed: 99 });

test('trainCnn: the loss falls, clean accuracy is high, and the run is deterministic', () => {
  const { model, history } = trainCnn({ X: TRAIN.X, y: TRAIN.y, epochs: 15, seed: 2, filters: 5, valX: TEST.X, valY: TEST.y });
  assert.equal(history.loss.length, 15);
  assert.equal(history.accuracy.length, 15);
  assert.equal(history.batchLoss.length, 15);
  assert.equal(history.valAccuracy.length, 15);
  assert.ok(history.loss[14] < history.initialLoss * 0.2, `${history.initialLoss} -> ${history.loss[14]}`);
  assert.ok(history.loss[14] < history.loss[0]);
  assert.ok(history.accuracy[14] > 0.95);
  assert.ok(accuracy(model, TEST.X, TEST.y) > 0.9);
  close(history.valAccuracy[14], accuracy(model, TEST.X, TEST.y));
  assert.equal(model.epochsTrained, 15);
  assert.equal(model.filters, 5);
  assert.equal(model.classes, 4);
  const again = trainCnn({ X: TRAIN.X, y: TRAIN.y, epochs: 15, seed: 2, filters: 5 });
  assert.deepEqual(again.model.denseW, model.denseW);
  assert.deepEqual(again.history.loss, history.loss);
  const other = trainCnn({ X: TRAIN.X, y: TRAIN.y, epochs: 15, seed: 3, filters: 5 });
  assert.notDeepEqual(other.model.denseW, model.denseW);
});

test('trainCnn: stepping one epoch at a time equals one run, with augmentation too', () => {
  const aug = { shift: true, brightness: true, flip: true, rotate: true };
  const whole = trainCnn({ X: TRAIN.X.slice(0, 60), y: TRAIN.y.slice(0, 60), epochs: 4, seed: 5, augment: aug });
  const m = trainCnn({ X: TRAIN.X.slice(0, 60), y: TRAIN.y.slice(0, 60), epochs: 1, seed: 5, augment: aug }).model;
  for (let i = 0; i < 3; i++) trainCnn({ X: TRAIN.X.slice(0, 60), y: TRAIN.y.slice(0, 60), epochs: 1, seed: 5, augment: aug, model: m });
  assert.deepEqual(m.convW, whole.model.convW);
  assert.deepEqual(m.denseW, whole.model.denseW);
  assert.equal(m.epochsTrained, 4);
  const cloned = cloneCnn(m);
  trainCnn({ X: TRAIN.X.slice(0, 60), y: TRAIN.y.slice(0, 60), epochs: 1, seed: 5, model: m });
  assert.notDeepEqual(cloned.convW, m.convW, 'the clone is independent of the original');
  assert.equal(cloned.epochsTrained, 4);
});

test('trainCnn: work caps and argument checks', () => {
  assert.equal(MAX_IMAGES, 1000);
  assert.equal(MAX_EPOCHS, 100);
  assert.throws(() => trainCnn({ X: TRAIN.X, y: TRAIN.y, epochs: MAX_EPOCHS + 1 }), RangeError);
  const many = new Array(MAX_IMAGES + 1).fill(TRAIN.X[0]);
  assert.throws(() => trainCnn({ X: many, y: many.map(() => 0), epochs: 1 }), RangeError);
  assert.throws(() => trainDense({ X: many, y: many.map(() => 0), epochs: 1 }), RangeError);
  assert.throws(() => trainCnn({ X: [[1, 2]], y: [0, 1] }), /same length/);
  assert.throws(() => trainCnn({ X: [], y: [] }), /pictures or a model/);
});

test('trainCnn: a few hundred pictures and tens of epochs stay fast', () => {
  const t0 = performance.now();
  trainCnn({ X: TRAIN.X, y: TRAIN.y, epochs: 20, seed: 1, augment: { shift: true, brightness: true, rotate: true, flip: true } });
  const ms = performance.now() - t0;
  assert.ok(ms < 8000, `20 augmented epochs on 300 pictures took ${ms} ms`);
});

// One shared set of trained networks, so the robustness tests do not each retrain.
const SEEDS = [1, 2, 3];
let robust = null;
function robustness() {
  if (robust) return robust;
  const test = makeImages({ n: 240, seed: 99 });
  const kinds = {
    none: undefined, shift: { shift: true }, light: { brightness: true }, rot: { rotate: true },
    all: { flip: true, shift: true, brightness: true, rotate: true },
  };
  robust = {};
  for (const [name, augment] of Object.entries(kinds)) {
    robust[name] = SEEDS.map(seed => {
      const train = makeImages({ n: 250, seed: 10 + seed });
      const { model } = trainCnn({ X: train.X, y: train.y, epochs: 20, seed, augment, filters: 5 });
      return evaluateAll(model, test.X, test.y, [...CONDITIONS]);
    });
  }
  return robust;
}
const avg = (rows, key) => mean(rows.map(r => r[key]));

test('augmentation: shifting during training rescues shifted test pictures', () => {
  const r = robustness();
  const none = avg(r.none, 'shifted'), aug = avg(r.shift, 'shifted');
  assert.ok(none < 0.6, `without augmentation shifted accuracy collapses: ${none}`);
  assert.ok(aug - none > 0.3, `shift augmentation ${aug} vs none ${none}`);
  r.shift.forEach((row, i) => assert.ok(row.shifted - r.none[i].shifted > 0.2, `seed ${SEEDS[i]}`));
  assert.ok(avg(r.none, 'clean') > 0.95, 'the plain network is fine on clean pictures');
  assert.ok(avg(r.shift, 'clean') > 0.9, 'and the augmented one stays good on them');
});

test('augmentation: brightness and contrast jitter rescue darker and brighter pictures', () => {
  const r = robustness();
  for (const cond of ['darker', 'brighter']) {
    const none = avg(r.none, cond), aug = avg(r.light, cond);
    assert.ok(aug - none > 0.1, `${cond}: ${aug} vs ${none}`);
    assert.ok(aug > 0.9, `${cond} with augmentation ${aug}`);
  }
  assert.ok(avg(r.none, 'darker') < 0.9, `the dim test really hurts the plain network: ${avg(r.none, 'darker')}`);
});

test('augmentation: all four together help on balance, at a small cost on clean pictures', () => {
  const r = robustness();
  const changed = ['darker', 'brighter', 'rotated', 'shifted'];
  const overall = rows => mean(changed.map(c => avg(rows, c)));
  assert.ok(overall(r.all) - overall(r.none) > 0.1, `all ${overall(r.all)} vs none ${overall(r.none)}`);
  assert.ok(avg(r.all, 'shifted') - avg(r.none, 'shifted') > 0.3);
  assert.ok(avg(r.all, 'darker') > avg(r.none, 'darker'), 'lighting jitter still covers the dim test next to the other augmentations');
  assert.ok(avg(r.all, 'brighter') > avg(r.none, 'brighter'));
  assert.ok(avg(r.none, 'clean') - avg(r.all, 'clean') < 0.1, 'the clean cost of heavy augmentation stays small');
  // One augmentation does not cover another change: shifting alone does not help lighting.
  assert.ok(avg(r.shift, 'darker') < avg(r.light, 'darker') - 0.3);
});

test('augmentation: random rotations help rotated pictures', () => {
  const r = robustness();
  const none = avg(r.none, 'rotated'), aug = avg(r.rot, 'rotated');
  assert.ok(aug - none > 0.05, `rotated: ${aug} vs ${none}`);
  assert.ok(none < 0.85, `rotated pictures hurt the plain network: ${none}`);
});

test('CNN versus a dense network on flattened pixels: far fewer weights, comparable on clean pictures, equally shift-blind', () => {
  const train = makeImages({ n: 250, seed: 12 });
  const cnn = trainCnn({ X: train.X, y: train.y, epochs: 20, seed: 2, filters: 4 }).model;
  const dense = trainDense({ X: train.X, y: train.y, epochs: 20, seed: 2, hidden: 16 }).model;
  assert.equal(dense.kind, 'dense');
  assert.equal(dense.nets.length, 4);
  assert.equal(paramCount(cnn), 444);
  assert.equal(paramCount(dense), 9348);
  assert.ok(paramCount(dense) / paramCount(cnn) > 20, 'one-versus-rest dense nets');
  const cmp = compareParams({ size: 12, filters: 4, hidden: 16, classes: 4 });
  assert.equal(cmp.denseShared, 144 * 16 + 16 + 16 * 4 + 4, 'a single shared 144-16-4 network');
  assert.ok(cmp.ratioShared > 4 && cmp.ratioShared < 6, `${cmp.ratioShared}`);
  const clean = evaluate(cnn, TEST.X, TEST.y).accuracy, denseClean = evaluate(dense, TEST.X, TEST.y).accuracy;
  assert.ok(clean > 0.9, `cnn clean ${clean}`);
  assert.ok(denseClean > 0.85, `dense clean ${denseClean}`);
  assert.ok(clean >= denseClean - 0.03, `cnn ${clean} vs dense ${denseClean}`);
  // Architecture alone does not buy shift invariance at this size: both fail shifted pictures without augmentation.
  const cnnAll = evaluateAll(cnn, TEST.X, TEST.y), denseAll = evaluateAll(dense, TEST.X, TEST.y);
  assert.deepEqual(Object.keys(denseAll), CONDITIONS);
  assert.ok(cnnAll.shifted < 0.55 && denseAll.shifted < 0.55, `shifted: cnn ${cnnAll.shifted}, dense ${denseAll.shifted}`);
  assert.ok(cnnAll.clean - cnnAll.shifted > 0.4 && denseAll.clean - denseAll.shifted > 0.4);
  const probs = predictProba(dense, TEST.X[0]);
  assert.equal(probs.length, 4);
  close(probs.reduce((a, b) => a + b, 0), 1);
  assert.equal(predictClass(dense, TEST.X[0]), probs.indexOf(Math.max(...probs)));
  assert.equal(accuracy(dense, [], []), 0);
});

test('trainDense: learns, is deterministic and accepts augmentation', () => {
  const X = TRAIN.X.slice(0, 120), y = TRAIN.y.slice(0, 120);
  const a = trainDense({ X, y, epochs: 8, seed: 4, augment: { shift: true } });
  const b = trainDense({ X, y, epochs: 8, seed: 4, augment: { shift: true } });
  assert.deepEqual(a.history.loss, b.history.loss);
  assert.ok(a.history.loss[7] < a.history.initialLoss);
  assert.equal(a.history.accuracy.length, 8);
  assert.ok(a.history.accuracy[7] > 0.7);
  assert.equal(a.model.epochsTrained, 8);
  const step = trainDense({ X, y, epochs: 4, seed: 4, augment: { shift: true } });
  trainDense({ X, y, epochs: 4, seed: 4, augment: { shift: true }, model: step.model });
  assert.deepEqual(step.model.nets[0].weights, a.model.nets[0].weights, 'two runs of 4 epochs equal one run of 8');
  assert.equal(flip(G3).join(), flipH(G3).join());
});

// ---------------------------------------------------------------------------------------------------------
// Evaluation conditions

test('applyCondition: each condition does what it says, deterministically', () => {
  const x = makeImages({ n: 1, seed: 6, noise: 0.05 }).X[0];
  assert.deepEqual(applyCondition(x, 'clean'), x);
  assert.notEqual(applyCondition(x, 'clean'), x);
  assert.ok(mean(applyCondition(x, 'darker')) < mean(x) * 0.5);
  assert.ok(mean(applyCondition(x, 'brighter')) > mean(x) + 0.2);
  assert.deepEqual(applyCondition(x, 'shifted', 0), shift(x, 2, 0, BACKGROUND));
  assert.deepEqual(applyCondition(x, 'shifted', 1), shift(x, -2, 0, BACKGROUND));
  assert.deepEqual(applyCondition(x, 'shifted', 8), applyCondition(x, 'shifted', 0), 'eight directions then it cycles');
  assert.deepEqual(applyCondition(x, 'rotated', 0), rotate(x, 25, BACKGROUND));
  assert.deepEqual(applyCondition(x, 'rotated', 1), rotate(x, -25, BACKGROUND));
  assert.deepEqual(applyCondition(x, { name: 'rotated', amount: 10 }, 0), rotate(x, 10, BACKGROUND));
  assert.deepEqual(applyCondition(x, { name: 'shifted', amount: 3 }, 0), shift(x, 3, 0, BACKGROUND));
  closeArr(applyCondition([0.5, 0.2, 1, 0], 'darker'), [0.1, 0, 0.3, 0]);
  closeArr(applyCondition([0.5, 0.2, 1, 0], { name: 'brighter', amount: 0.1 }), [0.6, 0.3, 1, 0.1]);
  assert.throws(() => applyCondition(x, 'foggy'), /unknown condition/);
});

test('evaluate and evaluateAll: clean equals accuracy, every condition is reported, labels are respected', () => {
  const { model } = trainCnn({ X: TRAIN.X.slice(0, 120), y: TRAIN.y.slice(0, 120), epochs: 8, seed: 1 });
  const e = evaluate(model, TEST.X, TEST.y, 'clean');
  assert.equal(e.condition, 'clean');
  assert.equal(e.n, 240);
  close(e.accuracy, accuracy(model, TEST.X, TEST.y));
  close(e.accuracy, e.correct / e.n);
  const all = evaluateAll(model, TEST.X, TEST.y);
  assert.deepEqual(Object.keys(all), CONDITIONS);
  assert.equal(all.clean, e.accuracy);
  assert.ok(Object.values(all).every(v => v >= 0 && v <= 1));
  assert.equal(evaluate(model, TEST.X, TEST.y, { name: 'shifted', amount: 2 }).accuracy, all.shifted);
  const wrong = TEST.y.map(c => (c + 1) % 4);
  assert.ok(evaluate(model, TEST.X, wrong).accuracy < 0.1);
  assert.equal(evaluate(model, [], []).accuracy, 0);
  assert.deepEqual(Object.keys(evaluateAll(model, TEST.X, TEST.y, ['clean', 'darker'])), ['clean', 'darker']);
});

// ---------------------------------------------------------------------------------------------------------
// Detection

test('iou: hand-computed examples', () => {
  close(iou({ x: 0, y: 0, w: 2, h: 2 }, { x: 1, y: 1, w: 2, h: 2 }), 1 / 7, 1e-12); // intersection 1, union 4 + 4 - 1
  assert.equal(iou({ x: 0, y: 0, w: 4, h: 4 }, { x: 0, y: 0, w: 4, h: 4 }), 1);
  close(iou({ x: 0, y: 0, w: 4, h: 4 }, { x: 1, y: 1, w: 2, h: 2 }), 4 / 16, 1e-12);
  assert.equal(iou({ x: 0, y: 0, w: 2, h: 2 }, { x: 5, y: 5, w: 2, h: 2 }), 0);
  assert.equal(iou({ x: 0, y: 0, w: 2, h: 2 }, { x: 2, y: 0, w: 2, h: 2 }), 0, 'touching edges share no area');
  close(iou({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 0, w: 10, h: 10 }), 50 / 150, 1e-12);
  const a = { x: 3, y: 1, w: 5, h: 4 }, b = { x: 4, y: 2, w: 6, h: 2 };
  assert.equal(iou(a, b), iou(b, a));
  assert.equal(iou({ x: 0, y: 0, w: 0, h: 0 }, { x: 0, y: 0, w: 0, h: 0 }), 0);
});

// Two scenes with a known outcome. Scores in order: .9 (hit), .8 (stray box), .7 (hit), .6 (second box on a used truth), .5 (same).
const HAND_SCENES = [
  {
    truth: [{ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 10, h: 10 }],
    predictions: [
      { box: { x: 1, y: 1, w: 10, h: 10 }, score: 0.9 }, // IoU 81 / 119 = 0.68 with truth 1
      { box: { x: 50, y: 50, w: 10, h: 10 }, score: 0.8 },
      { box: { x: 0, y: 0, w: 10, h: 5 }, score: 0.6 }, // IoU 0.5 with truth 1, but truth 1 is already taken
    ],
  },
  {
    truth: [{ x: 0, y: 0, w: 10, h: 10 }],
    predictions: [
      { box: { x: 0, y: 0, w: 10, h: 10 }, score: 0.7 },
      { box: { x: 5, y: 0, w: 10, h: 10 }, score: 0.5 },
    ],
  },
];

test('detectionMetrics: hand-computed precision, recall and F1 at IoU 0.5', () => {
  const m = detectionMetrics(HAND_SCENES, { iouThreshold: 0.5 });
  assert.deepEqual([m.tp, m.fp, m.fn], [2, 3, 1]);
  close(m.precision, 0.4);
  close(m.recall, 2 / 3);
  close(m.f1, 0.5);
  const high = detectionMetrics(HAND_SCENES, { iouThreshold: 0.5, scoreThreshold: 0.65 });
  assert.deepEqual([high.tp, high.fp, high.fn], [2, 1, 1]);
  close(high.precision, 2 / 3);
  close(high.recall, 2 / 3);
  const strict = detectionMetrics(HAND_SCENES, { iouThreshold: 0.9 });
  assert.deepEqual([strict.tp, strict.fp, strict.fn], [1, 4, 2]);
  close(strict.precision, 0.2);
  const none = detectionMetrics(HAND_SCENES, { scoreThreshold: 0.99 });
  assert.deepEqual([none.tp, none.fp, none.fn], [0, 0, 3]);
  assert.equal(none.precision, 1);
  assert.equal(none.recall, 0);
  assert.equal(none.f1, 0);
  assert.equal(detectionMetrics([], {}).recall, 1);
  assert.equal(detectionMetrics([{ truth: [], predictions: [{ box: { x: 0, y: 0, w: 1, h: 1 }, score: 1 }] }]).precision, 0);
});

test('precision-recall curve and average precision on the hand scenes', () => {
  const curve = precisionRecallCurve(HAND_SCENES, { iouThreshold: 0.5 });
  assert.deepEqual(curve.map(p => p.score), [0.9, 0.8, 0.7, 0.6, 0.5]);
  closeArr(curve.map(p => p.precision), [1, 0.5, 2 / 3, 0.5, 0.4]);
  closeArr(curve.map(p => p.recall), [1 / 3, 1 / 3, 2 / 3, 2 / 3, 2 / 3]);
  assert.deepEqual(curve.map(p => [p.tp, p.fp]), [[1, 0], [1, 1], [2, 1], [2, 2], [2, 3]]);
  // Monotone precision envelope: 1, 2/3, 2/3, 1/2, 2/5 over recall steps 1/3, 0, 1/3: AP = 1/3 + 2/9.
  close(averagePrecision(HAND_SCENES), 5 / 9);
  assert.equal(averagePrecision([{ truth: [], predictions: [] }]), 0);
  const sweep = iouSweep(HAND_SCENES, [0.5, 0.9]);
  assert.deepEqual(sweep.map(s => s.iouThreshold), [0.5, 0.9]);
  assert.equal(sweep[0].tp, 2);
  assert.equal(sweep[1].tp, 1);
  assert.equal(iouSweep(HAND_SCENES).length, 4);
});

test('makeDetectionScenes: deterministic, boxes valid, metrics respond to the knobs', () => {
  const a = makeDetectionScenes({ n: 40, seed: 3 });
  assert.deepEqual(a, makeDetectionScenes({ n: 40, seed: 3 }));
  assert.notDeepEqual(a, makeDetectionScenes({ n: 40, seed: 4 }));
  assert.equal(a.length, 40);
  for (const s of a) {
    assert.ok(s.truth.length >= 1 && s.truth.length <= 3);
    for (const t of s.truth) assert.ok(t.x >= 0 && t.y >= 0 && t.x + t.w <= 100 + 1e-9 && t.y + t.h <= 100 + 1e-9);
    s.truth.forEach((t, i) => s.truth.forEach((u, j) => { if (i < j) assert.ok(iou(t, u) < 0.05); }));
    s.predictions.forEach(p => assert.ok(p.score > 0 && p.score < 1 && p.box.w > 0 && p.box.h > 0));
  }
  // Raising the IoU threshold can only lose true positives.
  const tps = [0.3, 0.5, 0.7, 0.9].map(t => detectionMetrics(a, { iouThreshold: t }).tp);
  for (let i = 1; i < tps.length; i++) assert.ok(tps[i] <= tps[i - 1], `tp ${tps}`);
  assert.ok(tps[0] > tps[3]);
  // Raising the score threshold trades recall for precision.
  const low = detectionMetrics(a, { scoreThreshold: 0 }), high = detectionMetrics(a, { scoreThreshold: 0.7 });
  assert.ok(high.recall <= low.recall && high.precision >= low.precision);
  // A perfect detector: no misses, no false alarms, exact boxes.
  const perfect = makeDetectionScenes({ n: 20, seed: 5, localization: 0, missRate: 0, falseRate: 0 });
  const pm = detectionMetrics(perfect, { iouThreshold: 0.99 });
  assert.equal(pm.fp, 0);
  assert.equal(pm.fn, 0);
  close(averagePrecision(perfect, { iouThreshold: 0.99 }), 1);
  // A sloppier detector scores lower.
  const sloppy = makeDetectionScenes({ n: 40, seed: 3, localization: 0.4 });
  assert.ok(averagePrecision(sloppy) < averagePrecision(makeDetectionScenes({ n: 40, seed: 3, localization: 0.05 })));
  // Curve recall never decreases.
  const curve = precisionRecallCurve(a);
  for (let i = 1; i < curve.length; i++) assert.ok(curve[i].recall >= curve[i - 1].recall && curve[i].score < curve[i - 1].score);
  const ap = averagePrecision(a);
  assert.ok(ap > 0 && ap <= 1);
});
