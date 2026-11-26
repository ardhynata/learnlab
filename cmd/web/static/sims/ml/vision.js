// Computer-vision helpers on tiny generated pictures: shape images, image transforms, convolution and pooling,
// a SMALL convolutional network (CNN) with a hand-written backward pass, augmentation, realistic test changes,
// a dense network on flattened pixels for comparison, and a toy detection metric (IoU, precision, recall).
// Pure and deterministic: the same options and seed always give the same images, weights, training run and
// scores. No Math.random; every draw comes from rng.js. Tested in vision.test.js.
//
// STABLE API (the vision lab and lessons import this; change it only by adding):
//
// IMAGES. A picture is a flat array of size * size numbers in [0, 1], row by row (index = y * size + x, y down,
//   0 = dark, 1 = bright). IMAGE_SIZE = 12. Every transform below takes an image and returns a NEW array.
//   BACKGROUND = 0.1 and SHAPE_LEVEL = 0.9 are the two grey levels of a noise-free picture.
//   SHAPE_NAMES = ["ring", "bar", "cross", "triangle", "box"] in default order.
//
//   makeImages({ n = 200, classes = 4, seed = 1, noise = 0.1, jitter = 1, sizeVar = 0.4, size = 12 })
//       -> { X, y, classes, size }
//       n pictures, classes balanced (counts differ by at most 1) and shuffled. classes is a number (the first
//       k of SHAPE_NAMES, 2..5) or an array of names; y[i] indexes the returned `classes` names. Each shape is
//       drawn at half-extent h = 3 + sizeVar * (u - 0.5) * 2 pixels (u in [0, 1): sizeVar 0.4 gives 2.6..3.4,
//       about 5 to 7 pixels across) around a centre that wanders by up to +-jitter pixels across and down
//       (continuous). noise is the standard deviation of Gaussian noise added to every pixel (then clipped to [0, 1]).
//         ring      circle outline        bar       vertical line        cross     bar plus horizontal line
//         triangle  filled, apex at top   box       square outline
//   imageRows(x) -> `size` strings of ten grey levels (" .:-=+*#%@" dark to bright), to print or check by eye.
//
// TRANSFORMS (pure functions on images; the size is taken from the length, which must be a square):
//   flipH(x)  mirror left-right (also exported as flip)        flipV(x)  mirror top-bottom
//   shift(x, dx, dy, fill = 0)         move the picture dx right and dy down (whole pixels, rounded); the
//                                      uncovered edge is filled with `fill`, what moves out is lost
//   rotate90(x, times = 1)             rotate clockwise by 90 degrees `times` times (negative = counter-clockwise)
//   rotate(x, degrees, fill = 0)       rotate clockwise about the picture centre, nearest neighbour; pixels whose
//                                      source lies outside the picture get `fill`. rotate(x, 90) equals rotate90(x).
//   brightness(x, delta)               add delta to every pixel, clipped to [0, 1]
//   contrast(x, factor, pivot = 0.5)   (v - pivot) * factor + pivot, clipped to [0, 1]
//   augmentImage(x, augment, random)   one random augmented copy, see AUGMENTATION. random is a function giving
//                                      floats in [0, 1) (rng(seed) from rng.js).
//
// CONVOLUTION. A feature map is a grid { w, h, data } (data row by row). Helpers accept a flat square image, an
//   array of rows (arrays of numbers) or a grid wherever an image / kernel is expected.
//   toGrid(x) -> grid;   gridRows(grid) -> array of rows (arrays of numbers)
//   conv2d(image, kernel, { pad = "valid" }) -> grid
//       Cross-correlation, the convention of every deep-learning library (the kernel is NOT flipped):
//       out[y][x] = sum over (i, j) of image[y + i][x + j] * kernel[i][j]. "valid" keeps only positions where the
//       kernel fits (a 5 x 5 image and a 3 x 3 kernel give 3 x 3); "same" pads with zeros so the output has the
//       input's size (the kernel must have odd sides).
//   maxPool(grid, size = 2) -> grid     the maximum of each non-overlapping size x size block; a ragged edge
//                                       (when the side is not a multiple of size) is dropped
//   relu(grid | array) -> same shape    max(v, 0) everywhere
//
// THE SMALL CNN (fixed architecture: 3 x 3 convolution with `filters` filters -> ReLU -> 2 x 2 max pool -> flatten
//   -> dense -> softmax). The picture side must be even and at least 4: the conv output is (size - 2) squared and
//   the pooled map ((size - 2) / 2) squared, so a 12 x 12 picture gives 10 x 10 maps and 5 x 5 pooled maps.
//   createCnn({ size = 12, filters = 4, classes = 4, seed = 1, convW, convB, denseW, denseB }) -> model
//       filters 1..8 (the lessons use 4 to 6). He-normal weights, zero biases; the four weight arrays can be
//       given to hand-build a network (checked for length, deep-copied).
//       model = { kind: "cnn", size, filters, classes, seed, convW, convB, denseW, denseB, epochsTrained, optState }
//         convW[f * 9 + i * 3 + j]  weight (i, j) of filter f;  convB[f]  its bias
//         denseW[k * flat + m]      weight into class k from flattened pooled value m, flat = filters * pooledSide^2,
//                                   with m = f * pooledSide^2 + py * pooledSide + px;  denseB[k]
//   cloneCnn(model) -> deep copy
//   cnnParamCount(model | { size, filters, classes }) -> { conv, dense, total }   (conv = 10 * filters weights and
//       biases: it does not depend on the picture size; dense = classes * (flat + 1))
//   forward(model, x) -> cache = { x, conv, act, arg, flat, logits, probs }
//       conv[f] pre-activation map (row by row), act[f] after ReLU, arg[f][p] index in act[f] of the maximum chosen by
//       pooled cell p (first one on ties), flat the pooled values, logits and probs (softmax) per class.
//   featureMaps(model, x) -> { conv, activated, pooled }  each an array of grids, one per filter
//   backward(model, cache, label) -> { loss, convW, convB, denseW, denseB }
//       Manual backpropagation for ONE example: the gradient of its cross-entropy -log p[label] (p clipped at 1e-12).
//       The softmax + cross-entropy delta is probs - onehot; the max pool routes each pooled gradient to the cell
//       that won; ReLU's slope at exactly 0 counts as 0.
//   cnnGradients(model, X, y, indices) -> { loss, convW, convB, denseW, denseB }   mean over the rows `indices`
//   cnnLoss(model, X, y) -> mean cross-entropy over the rows (0 for no rows)
//   cnnGradientCheck(model, X, y, { eps = 1e-5, tol = 1e-6 }) -> { ok, maxError, checked, worst }
//       Compares every analytic gradient of the mean loss with the central difference. The error per parameter is
//       |analytic - numeric| / max(1, |analytic|, |numeric|); worst = { group, index } of the largest. A ReLU or a
//       max-pool tie exactly on its kink can fail it; noisy pictures with random weights almost never do.
//   trainCnn({ X, y, model, epochs = 20, lr = 0.01, batchSize = 16, filters = 4, classes, seed = 1, augment, valX, valY,
//              beta1 = 0.9, beta2 = 0.999, eps = 1e-8 }) -> { model, history }
//       Adam on shuffled mini-batches. Without `model` a fresh createCnn({ size, filters, classes, seed }) is made
//       (size from the first picture, classes from max(y) + 1 unless given); with `model` it is trained IN PLACE
//       and keeps its Adam state, so trainCnn(epochs: 10) equals ten trainCnn(epochs: 1) calls (a lab can step
//       one epoch at a time). Each epoch every picture is augmented afresh (AUGMENTATION), so the network never
//       sees the same augmented copy twice. Work is capped: more than MAX_IMAGES (1000) pictures or MAX_EPOCHS
//       (100) epochs in one call throws a RangeError, keeping a run well under a second per epoch.
//       history (entry i = after epoch i + 1; all on the CLEAN, un-augmented training pictures unless noted):
//         initialLoss  mean cross-entropy before the first epoch of this call
//         loss[]       mean cross-entropy        accuracy[]  share classified correctly
//         batchLoss[]  mean loss on the augmented pictures the network actually trained on during the epoch
//         valAccuracy[] accuracy on valX / valY (empty without them)
//   predictProba(model, x) -> probabilities per class; predictClass(model, x) -> the most likely class (first on ties);
//   accuracy(model, X, y) -> share correct (0 for no rows). These three work on a CNN and on a dense baseline.
//
// AUGMENTATION. augment is false / undefined (none) or an object; each key is false, true (the default size below)
//   or a number: { flip, shift, brightness, rotate }. AUGMENT_DEFAULTS = { flip: true, shift: 2, brightness: 0.4, rotate: 25 }.
//     flip        mirror left-right with probability 1/2
//     shift       move by a whole number of pixels, dx and dy each uniform in -shift..shift
//     brightness  a gain (every pixel times a factor uniform in 1 - 1.5 b .. 1 + b, which is how real lighting scales a
//                 picture) and then an offset uniform in +-b, clipped to [0, 1]; b = 0.4 gives gains 0.4 .. 1.4
//     rotate      rotation by a uniform angle in +-rotate degrees
//   Order: rotate, shift, flip, contrast, brightness. Rotation and shift fill with BACKGROUND.
//   normalizeAugment(augment) -> { flip: boolean, shift, brightness, rotate } (numbers; 0 = off)
//
// A DENSE BASELINE ON FLATTENED PIXELS (built on mlp.js, whose network has ONE output unit, so the classes are
//   learned one-versus-rest: one 144 -> hidden -> 1 network per class; the predicted class is the highest score).
//   trainDense({ X, y, classes, hidden = 16, epochs = 20, lr = 0.01, batchSize = 16, seed = 1, augment, valX, valY })
//       -> { model, history }       model = { kind: "dense", size, classes, hidden, nets, seed, epochsTrained }
//       history = { initialLoss, loss[], accuracy[], valAccuracy[] } with loss the mean one-vs-rest log loss. The same
//       augmentation, mini-batching and caps as trainCnn. Pass `model` to continue training it in place.
//   denseParamCount(model | { size, hidden, classes }) -> number   (classes nets of size^2 * hidden + hidden + hidden + 1)
//   paramCount(model) -> number   total weights plus biases of a CNN or a dense baseline
//   compareParams({ size = 12, filters = 4, hidden = 16, classes = 4 })
//       -> { cnn: { conv, dense, total }, dense, denseShared, ratio, ratioShared }
//       the parameter counts side by side. dense is the one-versus-rest baseline of trainDense (one network per class);
//       denseShared is ONE size^2 -> hidden -> classes network (what a textbook dense net would use, about 5 times the
//       CNN at 12 x 12); ratio = dense / cnn total, ratioShared = denseShared / cnn total. Quote the shared count
//       when the claim is "convolution shares weights", because one-versus-rest inflates the dense side.
//
// EVALUATION UNDER REALISTIC CHANGES.
//   CONDITIONS = ["clean", "darker", "brighter", "rotated", "shifted"]
//   applyCondition(x, condition, index = 0) -> the changed picture. condition is a name or { name, amount }:
//       clean     unchanged
//       darker    dim to a share 1 - amount of the light (every pixel times 1 - amount), minus a 0.1 sensor offset,
//                 floored at 0                                     (amount default 0.6: a dim scene at 40% light)
//       brighter  brightness(x, +amount), clipped: the background lifts and the bright shape saturates (amount default 0.35)
//       rotated   rotate by amount degrees, the sign alternating with the picture index (amount default 25)
//       shifted   move by `amount` pixels (default 2) in one of eight directions, cycling with the index
//       The change depends only on the index, never on a random draw, so a test set is the same every time.
//   evaluate(model, images, labels, condition = "clean") -> { condition, accuracy, correct, n }
//   evaluateAll(model, images, labels, conditions = CONDITIONS) -> { [condition name]: accuracy } (keyed by name, so give
//       each name once)
//
// DETECTION TOY (boxes only, no pixels). A box is { x, y, w, h }: top-left corner, width and height.
//   iou(a, b) -> intersection over union in [0, 1] (0 when the union is empty or the boxes only touch)
//   makeDetectionScenes({ n = 20, seed = 1, size = 100, maxBoxes = 3, localization = 0.12, missRate = 0.15, falseRate = 0.5 })
//       -> scenes, each { truth: box[], predictions: [{ box, score }] }
//       Truth boxes are drawn without much overlap on a size x size canvas. A simulated detector finds each truth
//       box with probability 1 - missRate, but with a wobbly box (sloppiness `localization`, as a share of the box size);
//       its score falls as the box gets worse. Then it adds false alarms (about falseRate per scene on average) with low
//       scores.
//   detectionMetrics(scenes, { iouThreshold = 0.5, scoreThreshold = 0 })
//       -> { tp, fp, fn, precision, recall, f1 }
//       Per scene, predictions with score >= scoreThreshold are taken best score first; each is a true positive when its
//       best still-unmatched truth box has IoU >= iouThreshold (that truth box is then used up), otherwise a false positive.
//       fn counts truth boxes never matched. precision = tp / (tp + fp) (1 when nothing was predicted), recall =
//       tp / (tp + fn) (1 when there is no truth), f1 their harmonic mean (0 when both are 0).
//   precisionRecallCurve(scenes, { iouThreshold = 0.5 }) -> [{ score, precision, recall, tp, fp }]  one point per distinct
//       score threshold, from the highest score down (recall never decreases along it)
//   averagePrecision(scenes, { iouThreshold = 0.5 }) -> area under the precision-recall curve (precision made monotone,
//       the usual all-point interpolation); 0 when there is no truth
//   iouSweep(scenes, thresholds = [0.3, 0.5, 0.7, 0.9], { scoreThreshold = 0 }) -> [{ iouThreshold, ...detectionMetrics }]
import { rng, gauss, shuffle } from './rng.js';
import { createMlp, train as trainMlp, predictOutput, dataLoss, paramCount as mlpParamCount } from './mlp.js';

export const IMAGE_SIZE = 12;
export const BACKGROUND = 0.1;
export const SHAPE_LEVEL = 0.9;
export const SHAPE_NAMES = ['ring', 'bar', 'cross', 'triangle', 'box'];
export const MAX_IMAGES = 1000;
export const MAX_EPOCHS = 100;
export const AUGMENT_DEFAULTS = { flip: true, shift: 2, brightness: 0.4, rotate: 25 };
export const CONDITIONS = ['clean', 'darker', 'brighter', 'rotated', 'shifted'];

const KERNEL = 3;
const POOL = 2;
const PARAM_KEYS = ['convW', 'convB', 'denseW', 'denseB'];
const EPS_P = 1e-12;
const GREYS = ' .:-=+*#%@';

// A well-mixed 32-bit seed from two numbers, so seeds 1, 2, 3, ... do not start the LCG in step.
function mixSeed(a, b) {
  let h = Math.imul((a >>> 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b >>> 0) + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

const clip01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

function sideOf(x) {
  const s = Math.round(Math.sqrt(x.length));
  if (!x.length || s * s !== x.length) throw new Error(`image length ${x.length} is not a square`);
  return s;
}

// ---------------------------------------------------------------------------------------------------------
// Generated pictures

const SHAPES = {
  ring: (dx, dy, h) => Math.abs(Math.hypot(dx, dy) - (h - 0.5)) <= 0.75,
  bar: (dx, dy, h) => Math.abs(dx) <= 0.75 && Math.abs(dy) <= h,
  cross: (dx, dy, h) => (Math.abs(dx) <= 0.75 && Math.abs(dy) <= h) || (Math.abs(dy) <= 0.75 && Math.abs(dx) <= h),
  triangle: (dx, dy, h) => dy >= -h && dy <= h && Math.abs(dx) <= (dy + h) / 2 + 0.35,
  box: (dx, dy, h) => { const m = Math.max(Math.abs(dx), Math.abs(dy)); return m <= h && m >= h - 1.4; },
};

function resolveClasses(classes) {
  if (Array.isArray(classes)) {
    for (const c of classes) if (!SHAPES[c]) throw new Error(`makeImages: unknown shape "${c}" (${SHAPE_NAMES.join(', ')})`);
    if (classes.length < 2) throw new Error('makeImages: need at least 2 classes');
    return classes.slice();
  }
  const k = Math.floor(classes);
  if (!(k >= 2 && k <= SHAPE_NAMES.length)) throw new Error(`makeImages: classes must be 2..${SHAPE_NAMES.length} or an array of names`);
  return SHAPE_NAMES.slice(0, k);
}

export function makeImages({ n = 200, classes = 4, seed = 1, noise = 0.1, jitter = 1, sizeVar = 0.4, size = IMAGE_SIZE } = {}) {
  const names = resolveClasses(classes);
  const random = rng(mixSeed(seed, 0x1a2b));
  const X = [], y = [];
  for (let i = 0; i < n; i++) {
    const c = i % names.length;
    const h = 3 + sizeVar * (random() - 0.5) * 2;
    const cx = size / 2 + (random() * 2 - 1) * jitter;
    const cy = size / 2 + (random() * 2 - 1) * jitter;
    const draw = SHAPES[names[c]];
    const img = new Array(size * size);
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const v = draw(px + 0.5 - cx, py + 0.5 - cy, h) ? SHAPE_LEVEL : BACKGROUND;
        img[py * size + px] = clip01(noise > 0 ? v + noise * gauss(random) : v);
      }
    }
    X.push(img); y.push(c);
  }
  const order = shuffle(Array.from({ length: n }, (_, i) => i), random);
  return { X: order.map(i => X[i]), y: order.map(i => y[i]), classes: names, size };
}

export function imageRows(x) {
  const s = sideOf(x);
  const rows = [];
  for (let py = 0; py < s; py++) {
    let line = '';
    for (let px = 0; px < s; px++) line += GREYS[Math.min(GREYS.length - 1, Math.floor(clip01(x[py * s + px]) * GREYS.length))];
    rows.push(line);
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------------------
// Transforms

export function flipH(x) {
  const s = sideOf(x);
  return x.map((_, i) => x[Math.floor(i / s) * s + (s - 1 - (i % s))]);
}

export const flip = flipH;

export function flipV(x) {
  const s = sideOf(x);
  return x.map((_, i) => x[(s - 1 - Math.floor(i / s)) * s + (i % s)]);
}

export function shift(x, dx, dy, fill = 0) {
  const s = sideOf(x);
  const ix = Math.round(dx), iy = Math.round(dy);
  const out = new Array(x.length).fill(fill);
  for (let py = 0; py < s; py++) {
    const sy = py - iy;
    if (sy < 0 || sy >= s) continue;
    for (let px = 0; px < s; px++) {
      const sx = px - ix;
      if (sx >= 0 && sx < s) out[py * s + px] = x[sy * s + sx];
    }
  }
  return out;
}

export function rotate90(x, times = 1) {
  const s = sideOf(x);
  let k = ((Math.round(times) % 4) + 4) % 4;
  let cur = x;
  while (k-- > 0) {
    // out[y][x] = in[s - 1 - x][y]: the top row becomes the right column (clockwise).
    cur = cur.map((_, i) => cur[(s - 1 - (i % s)) * s + Math.floor(i / s)]);
  }
  return cur === x ? x.slice() : cur;
}

export function rotate(x, degrees, fill = 0) {
  const s = sideOf(x);
  const a = (degrees * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  const c = (s - 1) / 2;
  const out = new Array(x.length);
  for (let py = 0; py < s; py++) {
    for (let px = 0; px < s; px++) {
      const dx = px - c, dy = py - c;
      const sx = Math.round(c + cos * dx + sin * dy);
      const sy = Math.round(c - sin * dx + cos * dy);
      out[py * s + px] = sx >= 0 && sx < s && sy >= 0 && sy < s ? x[sy * s + sx] : fill;
    }
  }
  return out;
}

export function brightness(x, delta) { return x.map(v => clip01(v + delta)); }

export function contrast(x, factor, pivot = 0.5) { return x.map(v => clip01((v - pivot) * factor + pivot)); }

// ---------------------------------------------------------------------------------------------------------
// Augmentation

export function normalizeAugment(augment) {
  const a = augment && typeof augment === 'object' ? augment : {};
  const amount = key => {
    const v = a[key];
    if (v === true) return AUGMENT_DEFAULTS[key];
    return typeof v === 'number' && v > 0 ? v : 0;
  };
  return { flip: !!a.flip, shift: amount('shift'), brightness: amount('brightness'), rotate: amount('rotate') };
}

export function augmentImage(x, augment, random) {
  const a = normalizeAugment(augment);
  let out = x.slice();
  if (a.rotate > 0) out = rotate(out, (random() * 2 - 1) * a.rotate, BACKGROUND);
  if (a.shift > 0) {
    const m = Math.round(a.shift);
    const dx = Math.floor(random() * (2 * m + 1)) - m;
    const dy = Math.floor(random() * (2 * m + 1)) - m;
    out = shift(out, dx, dy, BACKGROUND);
  }
  if (a.flip && random() < 0.5) out = flipH(out);
  if (a.brightness > 0) {
    out = contrast(out, 1 + (random() * 2.5 - 1.5) * a.brightness, 0);
    out = brightness(out, (random() * 2 - 1) * a.brightness);
  }
  return out;
}

function anyAugment(augment) {
  const a = normalizeAugment(augment);
  return a.flip || a.shift > 0 || a.brightness > 0 || a.rotate > 0;
}

// ---------------------------------------------------------------------------------------------------------
// Convolution and pooling

export function toGrid(x) {
  if (x && !Array.isArray(x) && x.data) return { w: x.w, h: x.h, data: x.data.slice() };
  if (Array.isArray(x) && x.length && Array.isArray(x[0])) {
    const h = x.length, w = x[0].length;
    if (!x.every(r => r.length === w)) throw new Error('toGrid: rows differ in length');
    return { w, h, data: x.flat() };
  }
  const s = sideOf(x);
  return { w: s, h: s, data: x.slice() };
}

export function gridRows(grid) {
  const rows = [];
  for (let y = 0; y < grid.h; y++) rows.push(grid.data.slice(y * grid.w, (y + 1) * grid.w));
  return rows;
}

export function conv2d(image, kernel, { pad = 'valid' } = {}) {
  const img = toGrid(image), ker = toGrid(kernel);
  if (pad !== 'valid' && pad !== 'same') throw new Error('conv2d: pad must be "valid" or "same"');
  if (ker.w > img.w || ker.h > img.h) throw new Error('conv2d: the kernel is larger than the image');
  if (pad === 'same' && (ker.w % 2 === 0 || ker.h % 2 === 0)) throw new Error('conv2d: "same" padding needs a kernel with odd sides');
  const py = pad === 'same' ? (ker.h - 1) / 2 : 0;
  const px = pad === 'same' ? (ker.w - 1) / 2 : 0;
  const oh = img.h + 2 * py - ker.h + 1, ow = img.w + 2 * px - ker.w + 1;
  const data = new Array(oh * ow);
  for (let oy = 0; oy < oh; oy++) {
    for (let ox = 0; ox < ow; ox++) {
      let s = 0;
      for (let i = 0; i < ker.h; i++) {
        const sy = oy + i - py;
        if (sy < 0 || sy >= img.h) continue;
        for (let j = 0; j < ker.w; j++) {
          const sx = ox + j - px;
          if (sx >= 0 && sx < img.w) s += img.data[sy * img.w + sx] * ker.data[i * ker.w + j];
        }
      }
      data[oy * ow + ox] = s;
    }
  }
  return { w: ow, h: oh, data };
}

export function maxPool(grid, size = POOL) {
  const g = toGrid(grid);
  const ow = Math.floor(g.w / size), oh = Math.floor(g.h / size);
  if (ow < 1 || oh < 1) throw new Error('maxPool: the pool window is larger than the map');
  const data = new Array(ow * oh);
  for (let oy = 0; oy < oh; oy++) {
    for (let ox = 0; ox < ow; ox++) {
      let best = -Infinity;
      for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) best = Math.max(best, g.data[(oy * size + i) * g.w + ox * size + j]);
      data[oy * ow + ox] = best;
    }
  }
  return { w: ow, h: oh, data };
}

export function relu(map) {
  if (map && !Array.isArray(map) && map.data) return { w: map.w, h: map.h, data: map.data.map(v => (v > 0 ? v : 0)) };
  if (Array.isArray(map) && map.length && Array.isArray(map[0])) return map.map(r => r.map(v => (v > 0 ? v : 0)));
  return map.map(v => (v > 0 ? v : 0));
}

// ---------------------------------------------------------------------------------------------------------
// The small CNN

function cnnShape(size, filters) {
  if (!(Number.isInteger(size) && size >= 4 && size % 2 === 0)) throw new Error('cnn: the picture side must be an even number of at least 4');
  const conv = size - (KERNEL - 1);
  const pooled = conv / POOL;
  return { conv, pooled, flat: filters * pooled * pooled };
}

export function cnnParamCount(spec) {
  const filters = spec.filters, classes = spec.classes;
  const { flat } = cnnShape(spec.size, filters);
  const conv = filters * (KERNEL * KERNEL + 1);
  const dense = classes * (flat + 1);
  return { conv, dense, total: conv + dense };
}

export function createCnn({ size = IMAGE_SIZE, filters = 4, classes = 4, seed = 1, convW, convB, denseW, denseB } = {}) {
  if (!(Number.isInteger(filters) && filters >= 1 && filters <= 8)) throw new Error('createCnn: filters must be a whole number 1..8');
  if (!(Number.isInteger(classes) && classes >= 2)) throw new Error('createCnn: classes must be a whole number of at least 2');
  const { flat } = cnnShape(size, filters);
  const random = rng(mixSeed(seed, 0x51ed));
  const init = (count, fanIn) => Array.from({ length: count }, () => gauss(random) * Math.sqrt(2 / fanIn));
  const own = (given, count, label) => {
    if (given === undefined) return null;
    if (!Array.isArray(given) || given.length !== count) throw new Error(`createCnn: ${label} must have ${count} numbers`);
    return given.slice();
  };
  const cw = own(convW, filters * KERNEL * KERNEL, 'convW') ?? init(filters * KERNEL * KERNEL, KERNEL * KERNEL);
  const dw = own(denseW, classes * flat, 'denseW') ?? Array.from({ length: classes * flat }, () => gauss(random) * Math.sqrt(1 / flat));
  return {
    kind: 'cnn', size, filters, classes, seed,
    convW: cw, convB: own(convB, filters, 'convB') ?? new Array(filters).fill(0),
    denseW: dw, denseB: own(denseB, classes, 'denseB') ?? new Array(classes).fill(0),
    epochsTrained: 0, optState: null,
  };
}

export function cloneCnn(model) {
  const copy = { ...model };
  for (const k of PARAM_KEYS) copy[k] = model[k].slice();
  copy.optState = model.optState
    ? { t: model.optState.t, m: Object.fromEntries(PARAM_KEYS.map(k => [k, model.optState.m[k].slice()])), v: Object.fromEntries(PARAM_KEYS.map(k => [k, model.optState.v[k].slice()])) }
    : null;
  return copy;
}

export function forward(model, x) {
  const { size, filters: F, classes: K } = model;
  const { conv: co, pooled: ps, flat: flatN } = cnnShape(size, F);
  if (x.length !== size * size) throw new Error(`forward: expected ${size * size} pixels, got ${x.length}`);
  const conv = [], act = [], arg = [];
  const flat = new Array(flatN);
  for (let f = 0; f < F; f++) {
    const cm = new Array(co * co), am = new Array(co * co);
    for (let oy = 0; oy < co; oy++) {
      for (let ox = 0; ox < co; ox++) {
        let s = model.convB[f];
        for (let i = 0; i < KERNEL; i++) {
          for (let j = 0; j < KERNEL; j++) s += model.convW[f * 9 + i * 3 + j] * x[(oy + i) * size + ox + j];
        }
        cm[oy * co + ox] = s;
        am[oy * co + ox] = s > 0 ? s : 0;
      }
    }
    const ar = new Array(ps * ps);
    for (let py = 0; py < ps; py++) {
      for (let px = 0; px < ps; px++) {
        let best = -Infinity, bi = 0;
        for (let i = 0; i < POOL; i++) {
          for (let j = 0; j < POOL; j++) {
            const idx = (py * POOL + i) * co + px * POOL + j;
            if (am[idx] > best) { best = am[idx]; bi = idx; }
          }
        }
        flat[f * ps * ps + py * ps + px] = best;
        ar[py * ps + px] = bi;
      }
    }
    conv.push(cm); act.push(am); arg.push(ar);
  }
  const logits = new Array(K);
  for (let k = 0; k < K; k++) {
    let s = model.denseB[k];
    for (let m = 0; m < flatN; m++) s += model.denseW[k * flatN + m] * flat[m];
    logits[k] = s;
  }
  const top = Math.max(...logits);
  const e = logits.map(v => Math.exp(v - top));
  const sum = e.reduce((a, b) => a + b, 0);
  return { x, conv, act, arg, flat, logits, probs: e.map(v => v / sum) };
}

export function featureMaps(model, x) {
  const c = forward(model, x);
  const { conv: co, pooled: ps } = cnnShape(model.size, model.filters);
  const grid = (data, side) => ({ w: side, h: side, data: data.slice() });
  return {
    conv: c.conv.map(m => grid(m, co)),
    activated: c.act.map(m => grid(m, co)),
    pooled: c.conv.map((_, f) => grid(c.flat.slice(f * ps * ps, (f + 1) * ps * ps), ps)),
  };
}

const exampleLoss = (probs, label) => -Math.log(Math.max(probs[label], EPS_P));

export function backward(model, cache, label) {
  const { size, filters: F, classes: K } = model;
  const { conv: co, pooled: ps, flat: flatN } = cnnShape(size, F);
  const g = {
    convW: new Array(F * 9).fill(0), convB: new Array(F).fill(0),
    denseW: new Array(K * flatN).fill(0), denseB: new Array(K).fill(0),
    loss: exampleLoss(cache.probs, label),
  };
  const dlogits = cache.probs.map((p, k) => p - (k === label ? 1 : 0));
  const dflat = new Array(flatN).fill(0);
  for (let k = 0; k < K; k++) {
    g.denseB[k] = dlogits[k];
    for (let m = 0; m < flatN; m++) {
      g.denseW[k * flatN + m] = dlogits[k] * cache.flat[m];
      dflat[m] += model.denseW[k * flatN + m] * dlogits[k];
    }
  }
  for (let f = 0; f < F; f++) {
    const dconv = new Array(co * co).fill(0);
    for (let p = 0; p < ps * ps; p++) {
      const at = cache.arg[f][p];
      // The max pool sends the gradient to the winning cell only; ReLU passes it where the pre-activation is positive.
      if (cache.conv[f][at] > 0) dconv[at] += dflat[f * ps * ps + p];
    }
    for (let oy = 0; oy < co; oy++) {
      for (let ox = 0; ox < co; ox++) {
        const d = dconv[oy * co + ox];
        if (d === 0) continue;
        g.convB[f] += d;
        for (let i = 0; i < KERNEL; i++) {
          for (let j = 0; j < KERNEL; j++) g.convW[f * 9 + i * 3 + j] += d * cache.x[(oy + i) * size + ox + j];
        }
      }
    }
  }
  return g;
}

export function cnnGradients(model, X, y, indices) {
  const idx = indices ?? X.map((_, i) => i);
  const acc = {
    convW: new Array(model.convW.length).fill(0), convB: new Array(model.convB.length).fill(0),
    denseW: new Array(model.denseW.length).fill(0), denseB: new Array(model.denseB.length).fill(0), loss: 0,
  };
  for (const i of idx) {
    const g = backward(model, forward(model, X[i]), y[i]);
    for (const k of PARAM_KEYS) for (let j = 0; j < acc[k].length; j++) acc[k][j] += g[k][j];
    acc.loss += g.loss;
  }
  const n = idx.length || 1;
  for (const k of PARAM_KEYS) for (let j = 0; j < acc[k].length; j++) acc[k][j] /= n;
  acc.loss /= n;
  return acc;
}

export function cnnLoss(model, X, y) {
  if (!X.length) return 0;
  let s = 0;
  for (let i = 0; i < X.length; i++) s += exampleLoss(forward(model, X[i]).probs, y[i]);
  return s / X.length;
}

export function cnnGradientCheck(model, X, y, { eps = 1e-5, tol = 1e-6 } = {}) {
  const analytic = cnnGradients(model, X, y);
  let maxError = 0, checked = 0, worst = null;
  for (const group of PARAM_KEYS) {
    const p = model[group];
    for (let j = 0; j < p.length; j++) {
      const keep = p[j];
      p[j] = keep + eps; const up = cnnLoss(model, X, y);
      p[j] = keep - eps; const down = cnnLoss(model, X, y);
      p[j] = keep;
      const numeric = (up - down) / (2 * eps);
      const a = analytic[group][j];
      const err = Math.abs(a - numeric) / Math.max(1, Math.abs(a), Math.abs(numeric));
      checked++;
      if (err > maxError) { maxError = err; worst = { group, index: j }; }
    }
  }
  return { ok: maxError <= tol, maxError, checked, worst };
}

function checkTrainArgs(X, y, epochs) {
  if (!Array.isArray(X) || !Array.isArray(y) || X.length !== y.length) throw new Error('train needs X and y of the same length');
  if (X.length > MAX_IMAGES) throw new RangeError(`train: at most ${MAX_IMAGES} pictures per call (got ${X.length})`);
  if (epochs > MAX_EPOCHS) throw new RangeError(`train: at most ${MAX_EPOCHS} epochs per call (got ${epochs})`);
}

function argmax(a) {
  let bi = 0;
  for (let i = 1; i < a.length; i++) if (a[i] > a[bi]) bi = i;
  return bi;
}

export function trainCnn(opts = {}) {
  const { X, y } = opts;
  const epochs = opts.epochs ?? 20;
  checkTrainArgs(X, y, epochs);
  if (!X.length && !opts.model) throw new Error('trainCnn needs pictures or a model');
  const classes = opts.classes ?? (opts.model ? opts.model.classes : Math.max(...y) + 1);
  const model = opts.model ?? createCnn({ size: sideOf(X[0]), filters: opts.filters ?? 4, classes, seed: opts.seed ?? 1 });
  const lr = opts.lr ?? 0.01, beta1 = opts.beta1 ?? 0.9, beta2 = opts.beta2 ?? 0.999, adamEps = opts.eps ?? 1e-8;
  const n = X.length;
  const batchSize = opts.batchSize ? Math.min(Math.max(1, Math.floor(opts.batchSize)), n || 1) : 16;
  const seed = opts.seed ?? model.seed;
  const augmenting = anyAugment(opts.augment);
  if (!model.optState) {
    const zeros = () => Object.fromEntries(PARAM_KEYS.map(k => [k, new Array(model[k].length).fill(0)]));
    model.optState = { t: 0, m: zeros(), v: zeros() };
  }
  const st = model.optState;
  const hasVal = Array.isArray(opts.valX) && Array.isArray(opts.valY) && opts.valX.length > 0;
  const history = { initialLoss: cnnLoss(model, X, y), loss: [], accuracy: [], batchLoss: [], valAccuracy: [] };
  const order = Array.from({ length: n }, (_, i) => i);

  for (let e = 0; e < epochs; e++) {
    const random = rng(mixSeed(seed, model.epochsTrained));
    const idx = shuffle(order, random);
    let lossSum = 0;
    for (let start = 0; start < n; start += batchSize) {
      const batch = idx.slice(start, start + batchSize);
      const acc = {
        convW: new Array(model.convW.length).fill(0), convB: new Array(model.convB.length).fill(0),
        denseW: new Array(model.denseW.length).fill(0), denseB: new Array(model.denseB.length).fill(0),
      };
      for (const i of batch) {
        const img = augmenting ? augmentImage(X[i], opts.augment, random) : X[i];
        const g = backward(model, forward(model, img), y[i]);
        lossSum += g.loss;
        for (const k of PARAM_KEYS) for (let j = 0; j < acc[k].length; j++) acc[k][j] += g[k][j];
      }
      st.t++;
      const c1 = 1 - beta1 ** st.t, c2 = 1 - beta2 ** st.t;
      for (const k of PARAM_KEYS) {
        const p = model[k], m = st.m[k], v = st.v[k];
        for (let j = 0; j < p.length; j++) {
          const gr = acc[k][j] / batch.length;
          m[j] = beta1 * m[j] + (1 - beta1) * gr;
          v[j] = beta2 * v[j] + (1 - beta2) * gr * gr;
          p[j] -= lr * (m[j] / c1) / (Math.sqrt(v[j] / c2) + adamEps);
        }
      }
    }
    model.epochsTrained++;
    history.batchLoss.push(n ? lossSum / n : 0);
    history.loss.push(cnnLoss(model, X, y));
    history.accuracy.push(accuracy(model, X, y));
    if (hasVal) history.valAccuracy.push(accuracy(model, opts.valX, opts.valY));
  }
  return { model, history };
}

// ---------------------------------------------------------------------------------------------------------
// Dense baseline on flattened pixels (one-versus-rest, built on mlp.js)

export function trainDense(opts = {}) {
  const { X, y } = opts;
  const epochs = opts.epochs ?? 20;
  checkTrainArgs(X, y, epochs);
  const hidden = opts.hidden ?? 16;
  const seed = opts.seed ?? opts.model?.seed ?? 1;
  const lr = opts.lr ?? 0.01;
  const batchSize = opts.batchSize ?? 16;
  const model = opts.model ?? (() => {
    if (!X.length) throw new Error('trainDense needs pictures or a model');
    const classes = opts.classes ?? Math.max(...y) + 1;
    const inputs = X[0].length;
    return {
      kind: 'dense', size: sideOf(X[0]), classes, hidden, seed, epochsTrained: 0,
      nets: Array.from({ length: classes }, (_, c) => createMlp({ layers: [inputs, hidden, 1], activation: 'relu', seed: mixSeed(seed, c + 1) })),
    };
  })();
  const augmenting = anyAugment(opts.augment);
  const hasVal = Array.isArray(opts.valX) && Array.isArray(opts.valY) && opts.valX.length > 0;
  const lossOn = () => model.nets.reduce((s, net, c) => s + dataLoss(net, X, y.map(l => (l === c ? 1 : 0))), 0) / model.nets.length;
  const history = { initialLoss: lossOn(), loss: [], accuracy: [], valAccuracy: [] };
  for (let e = 0; e < epochs; e++) {
    const random = rng(mixSeed(seed, model.epochsTrained + 0x7777));
    const Xe = augmenting ? X.map(img => augmentImage(img, opts.augment, random)) : X;
    model.nets.forEach((net, c) => {
      trainMlp({ model: net, X: Xe, y: y.map(l => (l === c ? 1 : 0)), optimizer: 'adam', lr, epochs: 1, batchSize, seed: mixSeed(seed, c + 1) });
    });
    model.epochsTrained++;
    history.loss.push(lossOn());
    history.accuracy.push(accuracy(model, X, y));
    if (hasVal) history.valAccuracy.push(accuracy(model, opts.valX, opts.valY));
  }
  return { model, history };
}

export function denseParamCount(spec) {
  if (spec.nets) return spec.nets.reduce((s, net) => s + mlpParamCount(net), 0);
  return spec.classes * (spec.size * spec.size * spec.hidden + spec.hidden + spec.hidden + 1);
}

export function paramCount(model) {
  return model.kind === 'dense' ? denseParamCount(model) : cnnParamCount(model).total;
}

export function compareParams({ size = IMAGE_SIZE, filters = 4, hidden = 16, classes = 4 } = {}) {
  const cnn = cnnParamCount({ size, filters, classes });
  const dense = denseParamCount({ size, hidden, classes });
  const denseShared = size * size * hidden + hidden + hidden * classes + classes;
  return { cnn, dense, denseShared, ratio: dense / cnn.total, ratioShared: denseShared / cnn.total };
}

// ---------------------------------------------------------------------------------------------------------
// Prediction (CNN and dense baseline)

export function predictProba(model, x) {
  if (model.kind === 'dense') {
    const scores = model.nets.map(net => predictOutput(net, [x])[0]);
    const sum = scores.reduce((a, b) => a + b, 0);
    return sum > 0 ? scores.map(s => s / sum) : scores.map(() => 1 / scores.length);
  }
  return forward(model, x).probs;
}

export function predictClass(model, x) {
  if (model.kind === 'dense') return argmax(model.nets.map(net => predictOutput(net, [x])[0]));
  return argmax(forward(model, x).logits);
}

export function accuracy(model, X, y) {
  if (!X.length) return 0;
  let ok = 0;
  for (let i = 0; i < X.length; i++) if (predictClass(model, X[i]) === y[i]) ok++;
  return ok / X.length;
}

// ---------------------------------------------------------------------------------------------------------
// Evaluation under realistic changes

const SHIFT_DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];

export function applyCondition(x, condition, index = 0) {
  const name = typeof condition === 'string' ? condition : condition?.name;
  const amount = typeof condition === 'object' && condition ? condition.amount : undefined;
  switch (name) {
    case 'clean': return x.slice();
    case 'darker': return brightness(contrast(x, 1 - (amount ?? 0.6), 0), -0.1);
    case 'brighter': return brightness(x, amount ?? 0.35);
    case 'rotated': return rotate(x, (index % 2 === 0 ? 1 : -1) * (amount ?? 25), BACKGROUND);
    case 'shifted': {
      const [ux, uy] = SHIFT_DIRECTIONS[index % SHIFT_DIRECTIONS.length];
      const a = amount ?? 2;
      return shift(x, ux * a, uy * a, BACKGROUND);
    }
    default: throw new Error(`unknown condition "${name}" (${CONDITIONS.join(', ')})`);
  }
}

export function evaluate(model, images, labels, condition = 'clean') {
  let correct = 0;
  images.forEach((img, i) => { if (predictClass(model, applyCondition(img, condition, i)) === labels[i]) correct++; });
  const name = typeof condition === 'string' ? condition : condition.name;
  return { condition: name, accuracy: images.length ? correct / images.length : 0, correct, n: images.length };
}

export function evaluateAll(model, images, labels, conditions = CONDITIONS) {
  const out = {};
  for (const c of conditions) {
    const r = evaluate(model, images, labels, c);
    out[r.condition] = r.accuracy;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------
// Detection toy

export function iou(a, b) {
  const iw = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const ih = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (!(iw > 0 && ih > 0)) return 0;
  const inter = iw * ih;
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

export function makeDetectionScenes({ n = 20, seed = 1, size = 100, maxBoxes = 3, localization = 0.12, missRate = 0.15, falseRate = 0.5 } = {}) {
  const random = rng(mixSeed(seed, 0xde7));
  const scenes = [];
  for (let s = 0; s < n; s++) {
    const count = 1 + Math.floor(random() * maxBoxes);
    const truth = [];
    for (let b = 0; b < count; b++) {
      for (let attempt = 0; attempt < 50; attempt++) {
        const w = size * (0.15 + 0.2 * random()), h = size * (0.15 + 0.2 * random());
        const box = { x: random() * (size - w), y: random() * (size - h), w, h };
        if (truth.every(t => iou(box, t) < 0.05)) { truth.push(box); break; }
      }
    }
    const predictions = [];
    for (const t of truth) {
      if (random() < missRate) continue;
      const box = {
        x: t.x + gauss(random) * localization * t.w, y: t.y + gauss(random) * localization * t.h,
        w: Math.max(1, t.w * (1 + gauss(random) * localization)), h: Math.max(1, t.h * (1 + gauss(random) * localization)),
      };
      const score = Math.min(0.99, Math.max(0.05, 0.95 - 1.5 * (1 - iou(box, t)) + 0.05 * gauss(random)));
      predictions.push({ box, score });
    }
    const alarms = Math.floor(falseRate * 2 * random() + random());
    for (let a = 0; a < alarms; a++) {
      const w = size * (0.12 + 0.2 * random()), h = size * (0.12 + 0.2 * random());
      predictions.push({ box: { x: random() * (size - w), y: random() * (size - h), w, h }, score: 0.05 + 0.5 * random() });
    }
    scenes.push({ truth, predictions });
  }
  return scenes;
}

// Every prediction of every scene as { score, tp }, best score first, and the total number of truth boxes.
function matchAll(scenes, iouThreshold) {
  const items = [];
  let totalTruth = 0;
  for (const scene of scenes) {
    totalTruth += scene.truth.length;
    const used = new Array(scene.truth.length).fill(false);
    const preds = scene.predictions.map((p, i) => ({ ...p, i })).sort((a, b) => b.score - a.score || a.i - b.i);
    for (const p of preds) {
      let best = -1, bestIou = 0;
      scene.truth.forEach((t, j) => {
        if (used[j]) return;
        const v = iou(p.box, t);
        if (v >= iouThreshold && v > bestIou) { best = j; bestIou = v; }
      });
      if (best >= 0) used[best] = true;
      items.push({ score: p.score, tp: best >= 0 });
    }
  }
  items.sort((a, b) => b.score - a.score);
  return { items, totalTruth };
}

function rates(tp, fp, totalTruth) {
  const fn = totalTruth - tp;
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = totalTruth === 0 ? 1 : tp / totalTruth;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { tp, fp, fn, precision, recall, f1 };
}

export function detectionMetrics(scenes, { iouThreshold = 0.5, scoreThreshold = 0 } = {}) {
  const { items, totalTruth } = matchAll(scenes, iouThreshold);
  let tp = 0, fp = 0;
  for (const it of items) if (it.score >= scoreThreshold) { if (it.tp) tp++; else fp++; }
  return rates(tp, fp, totalTruth);
}

export function precisionRecallCurve(scenes, { iouThreshold = 0.5 } = {}) {
  const { items, totalTruth } = matchAll(scenes, iouThreshold);
  const curve = [];
  let tp = 0, fp = 0;
  for (let i = 0; i < items.length; i++) {
    if (items[i].tp) tp++; else fp++;
    if (i + 1 < items.length && items[i + 1].score === items[i].score) continue;
    const r = rates(tp, fp, totalTruth);
    curve.push({ score: items[i].score, precision: r.precision, recall: r.recall, tp, fp });
  }
  return curve;
}

export function averagePrecision(scenes, { iouThreshold = 0.5 } = {}) {
  const curve = precisionRecallCurve(scenes, { iouThreshold });
  const { totalTruth } = matchAll(scenes, iouThreshold);
  if (!totalTruth) return 0;
  const prec = curve.map(p => p.precision);
  for (let i = prec.length - 2; i >= 0; i--) prec[i] = Math.max(prec[i], prec[i + 1]);
  let ap = 0, prevRecall = 0;
  curve.forEach((p, i) => { ap += (p.recall - prevRecall) * prec[i]; prevRecall = p.recall; });
  return ap;
}

export function iouSweep(scenes, thresholds = [0.3, 0.5, 0.7, 0.9], { scoreThreshold = 0 } = {}) {
  return thresholds.map(t => ({ iouThreshold: t, ...detectionMetrics(scenes, { iouThreshold: t, scoreThreshold }) }));
}
