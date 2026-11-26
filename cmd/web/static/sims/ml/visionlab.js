// Pure helpers for the vision lab (sims/labs/vision-lab.js): the generated task (train, validation and test
// pictures), the training runs the lab steps one epoch at a time, the cache of trained models for the
// "with and without augmentation" comparison, evaluation under realistic changes, the confusion matrix, the
// data behind the filter and feature-map view, and the detection toy (boxes, IoU, keyboard moves).
// The network, the pictures and the augmentation are in vision.js; this file only prepares data for them and
// turns their numbers into verdicts. Pure and deterministic: the same settings always give the same pictures,
// weights, runs and scores. Tested in visionlab.test.js.
//
//   CLASS_COUNT                       4 shapes (ring, bar, cross, triangle)
//   VAL_N = 80, TEST_N = 120          validation and test pictures (30 per shape in the test set)
//   LIMITS                            { n, epochs, filters, hidden, seed, shiftPx, brightAmount, rotateDeg } as [min, max, step]
//   DEFAULTS                          the lab's starting settings: small CNN, 200 pictures, 30 epochs, NO augmentation
//   CONDITION_RANGES                  per test condition { min, max, step, value } in its own unit (share of light lost, brightness
//                                     added, degrees, pixels); defaultAmounts() -> { darker, brighter, rotated, shifted }
//   clampAmount(name, v)              v clamped into the condition's range
//   conditionList(amounts)            -> [{ name, amount }] for CONDITIONS ('clean' has no amount); feeds evaluateAll
//
//   makeTask(seed, n)                 -> { seed, n, classes, size, train, val, test } each { X, y }; centred bright pictures only
//   augmentFromSettings(s)            the augment object of the toggles and strengths (see vision.js normalizeAugment)
//   isAugmenting(augment)             true when at least one augmentation is on
//   configFrom(settings)              the training configuration a run is made from
//   runKey(cfg, augment = cfg.augment) cache key: model, size of the model, pictures, seed, epochs, learning rate, augmentation
//   createRun(cfg, task)              an untrained run (the model exists, with its random weights) with empty history
//   stepRun(run, task)                trains ONE epoch in place (finishing a half-done one first) and appends to run.history
//                                     { loss, valLoss, accuracy, valAccuracy }; the result equals vision.js trainCnn / trainDense for one epoch
//   stepUnit(run, task)               does the next small piece of that epoch (a mini-batch of the CNN, one network of the dense baseline,
//                                     or one score) and returns true when the epoch is complete; run.pending is null between epochs
//   lossOn(model, X, y)               mean loss of a CNN (cross-entropy) or of the dense baseline (one-versus-rest log loss)
//   createJob(runs, task, target)     works on the first run that has fewer than `target` epochs (or a half-done epoch):
//                                     { step() -> more?, done(), progress() }; one step() is one stepUnit, progress().fraction counts the half-done epoch
//   runSlice(step, { budgetMs, now, maxSteps }) calls step() at least once, again until the time budget is spent or step() says there is no more
//   createRunCache(limit)             { get, set, has, size } of snapshots keyed by runKey (least recently used leaves first)
//   snapshotRun(run)                  a deep copy of a run's model and history (the cache stores these, so a run that trains on cannot change one)
//   cloneModel(model)                 deep copy of a CNN or dense baseline
//
//   evaluateConditions(model, test, amounts) -> { clean, darker, brighter, rotated, shifted } accuracy
//   confusionFor(model, X, y, condition, k)  -> { matrix[true][predicted], recall[], accuracy, n }
//   confusionMatrix(yTrue, yPred, k)        counts per (true, predicted)
//   pictureSet(task, source, count, { condition, augment, seed }) -> { images, labels, boxes } for the grid; boxes[i] is the TRUE box of
//                                     picture i (see shapeBox), or null when the shape left the picture
//   filterView(model, x, classIndex)        CNN: { kind: 'cnn', filters: [{ kernel, bias, conv, activated, pooled }] }; dense: { kind: 'dense', units }
//   predictOutcome(acc, drop)               'same' | 'both' | 'shifted' | 'darker': which test conditions fell by at least `drop` below clean
//   compareAccuracy(a, b, tolerance)        'higher' | 'same' | 'lower' for a against b
//
//   boundingBox(image)                      the tight box { x, y, w, h } (pixel units) around the bright shape, or null for a flat picture;
//                                           for a clean or two-level picture (a darker picture is fine too: the cut follows its range). NOT for
//                                           a brightened noisy one: clipping lets the background cross the cut
//   shapeBox(clean, condition, index)       the true box of a test picture under a condition, from the clean picture's shape mask
//                                           (so noise and brightness cannot move it); a shift moves it, a rotation turns it, both clip at the edge
//   MASK_CUT                                the grey level between the background and the shape that splits them in a clean picture
//   boxStats(truth, predicted, threshold)   -> { iou, inter, union, verdict: 'tp' | 'miss', tp, fp, fn }
//   startBox(truth, size)                   the learner's first predicted box: close to the truth but wobbly
//   moveBox(box, dx, dy, size), resizeBox(box, dw, dh, size)   keep the box inside the picture and at least MIN_BOX across
import { rng, shuffle } from './rng.js';
import {
  makeImages, createCnn, trainDense, cloneCnn, cnnLoss, predictClass, normalizeAugment, augmentImage, applyCondition,
  evaluateAll, featureMaps, accuracy as visionAccuracy, iou, forward, backward, BACKGROUND, SHAPE_LEVEL, SHAPE_NAMES, CONDITIONS,
} from './vision.js';
import { cloneMlp, dataLoss, forward as mlpForward, train as trainMlp } from './mlp.js';

export const CLASS_COUNT = 4;
export const VAL_N = 80;
export const TEST_N = 120;
export const MIN_BOX = 1;
export const DROP = 0.05;
export const LIMITS = {
  n: [40, 400, 20], epochs: [5, 60, 5], filters: [2, 8, 1], hidden: [8, 32, 4], seed: [1, 99, 1],
  shiftPx: [1, 4, 1], brightAmount: [0.1, 0.6, 0.05], rotateDeg: [5, 45, 5],
};
export const DEFAULTS = {
  model: 'cnn', filters: 4, hidden: 16, n: 200, epochs: 30, seed: 1,
  flip: false, shift: false, shiftPx: 2, brightness: false, brightAmount: 0.4, rotate: false, rotateDeg: 25,
};
export const LEARNING_RATE = 0.01;
export const BATCH_SIZE = 16;
export const CONDITION_RANGES = {
  darker: { min: 0.1, max: 0.9, step: 0.1, value: 0.6 },
  brighter: { min: 0.05, max: 0.6, step: 0.05, value: 0.35 },
  rotated: { min: 5, max: 45, step: 5, value: 25 },
  shifted: { min: 1, max: 4, step: 1, value: 2 },
};

export const defaultAmounts = () => Object.fromEntries(Object.entries(CONDITION_RANGES).map(([k, r]) => [k, r.value]));

export function clampAmount(name, v) {
  const r = CONDITION_RANGES[name];
  if (!r) return 0;
  const x = Number.isFinite(v) ? v : r.value;
  return Math.min(r.max, Math.max(r.min, x));
}

export function conditionList(amounts = defaultAmounts()) {
  return CONDITIONS.map(name => (name === 'clean' ? { name } : { name, amount: clampAmount(name, amounts[name]) }));
}

// ---------------------------------------------------------------------------------------------------------
// The generated task

export function makeTask(seed = 1, n = DEFAULTS.n) {
  const make = (count, salt) => {
    const d = makeImages({ n: count, classes: CLASS_COUNT, seed: seed * 3 + salt });
    return { X: d.X, y: d.y };
  };
  return { seed, n, classes: SHAPE_NAMES.slice(0, CLASS_COUNT), size: 12, train: make(n, 1), val: make(VAL_N, 2), test: make(TEST_N, 3) };
}

export function augmentFromSettings(s) {
  return normalizeAugment({
    flip: !!s.flip,
    shift: s.shift ? s.shiftPx : 0,
    brightness: s.brightness ? s.brightAmount : 0,
    rotate: s.rotate ? s.rotateDeg : 0,
  });
}

export function isAugmenting(augment) {
  const a = normalizeAugment(augment);
  return a.flip || a.shift > 0 || a.brightness > 0 || a.rotate > 0;
}

export function configFrom(settings) {
  const s = { ...DEFAULTS, ...settings };
  return {
    model: s.model === 'dense' ? 'dense' : 'cnn', filters: s.filters, hidden: s.hidden, n: s.n, seed: s.seed, epochs: s.epochs,
    lr: LEARNING_RATE, batchSize: BATCH_SIZE, augment: augmentFromSettings(s),
  };
}

export function runKey(cfg, augment = cfg.augment) {
  const a = normalizeAugment(augment);
  return JSON.stringify([cfg.model, cfg.model === 'cnn' ? cfg.filters : cfg.hidden, cfg.n, cfg.seed, cfg.epochs, cfg.lr, a.flip, a.shift, a.brightness, a.rotate]);
}

// ---------------------------------------------------------------------------------------------------------
// Runs

export function lossOn(model, X, y) {
  if (model.kind === 'dense') return model.nets.reduce((s, net, c) => s + dataLoss(net, X, y.map(l => (l === c ? 1 : 0))), 0) / model.nets.length;
  return cnnLoss(model, X, y);
}

export function createRun(cfg, task) {
  const model = cfg.model === 'dense'
    ? trainDense({ X: task.train.X, y: task.train.y, classes: CLASS_COUNT, hidden: cfg.hidden, epochs: 0, seed: cfg.seed, lr: cfg.lr }).model
    : createCnn({ size: task.size, filters: cfg.filters, classes: CLASS_COUNT, seed: cfg.seed });
  const run = { cfg, model, epochs: 0, pending: null, history: { loss: [], valLoss: [], accuracy: [], valAccuracy: [] } };
  run.initial = {
    loss: lossOn(model, task.train.X, task.train.y), valLoss: lossOn(model, task.val.X, task.val.y),
    accuracy: visionAccuracy(model, task.train.X, task.train.y), valAccuracy: visionAccuracy(model, task.val.X, task.val.y),
  };
  return run;
}

// A well-mixed 32-bit seed, the same function vision.js uses inside trainCnn and trainDense (not exported there), so that the pieces
// below draw the same random numbers in the same order and give weights identical to one trainCnn / trainDense epoch.
function mixSeed(a, b) {
  let h = Math.imul((a >>> 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b >>> 0) + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}
const PARAM_KEYS = ['convW', 'convB', 'denseW', 'denseB'];

// One epoch of the CNN as a list of small pieces: the shuffle, one Adam step per mini-batch, then the scores. Same maths as trainCnn.
function cnnPieces(run, task, score) {
  const { cfg, model } = run, X = task.train.X, y = task.train.y, n = X.length;
  const batchSize = cfg.batchSize ? Math.min(Math.max(1, Math.floor(cfg.batchSize)), n || 1) : 16;
  const augmenting = isAugmenting(cfg.augment);
  const beta1 = 0.9, beta2 = 0.999, adamEps = 1e-8;
  if (!model.optState) {
    const zeros = () => Object.fromEntries(PARAM_KEYS.map(k => [k, new Array(model[k].length).fill(0)]));
    model.optState = { t: 0, m: zeros(), v: zeros() };
  }
  const st = model.optState;
  let random = null, idx = null;
  const pieces = [() => { random = rng(mixSeed(cfg.seed, model.epochsTrained)); idx = shuffle(Array.from({ length: n }, (_, i) => i), random); }];
  for (let start = 0; start < n; start += batchSize) {
    pieces.push(() => {
      const batch = idx.slice(start, start + batchSize);
      const acc = {
        convW: new Array(model.convW.length).fill(0), convB: new Array(model.convB.length).fill(0),
        denseW: new Array(model.denseW.length).fill(0), denseB: new Array(model.denseB.length).fill(0),
      };
      for (const i of batch) {
        const img = augmenting ? augmentImage(X[i], cfg.augment, random) : X[i];
        const g = backward(model, forward(model, img), y[i]);
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
          p[j] -= cfg.lr * (m[j] / c1) / (Math.sqrt(v[j] / c2) + adamEps);
        }
      }
    });
  }
  return pieces.concat(scorePieces(run, task, score));
}

// One epoch of the dense baseline: augment once, then one small network per shape (each is one piece), then the scores. Same as trainDense.
function densePieces(run, task, score) {
  const { cfg, model } = run, X = task.train.X, y = task.train.y;
  const augmenting = isAugmenting(cfg.augment);
  let Xe = X;
  const pieces = [() => {
    const random = rng(mixSeed(cfg.seed, model.epochsTrained + 0x7777));
    Xe = augmenting ? X.map(img => augmentImage(img, cfg.augment, random)) : X;
  }];
  model.nets.forEach((net, c) => {
    pieces.push(() => trainMlp({ model: net, X: Xe, y: y.map(l => (l === c ? 1 : 0)), optimizer: 'adam', lr: cfg.lr, epochs: 1, batchSize: cfg.batchSize, seed: mixSeed(cfg.seed, c + 1) }));
  });
  return pieces.concat(scorePieces(run, task, score));
}

// The four numbers of an epoch's history, one piece each; the last piece publishes them and counts the epoch.
function scorePieces(run, task, score) {
  const { model } = run;
  return [
    () => { score.loss = lossOn(model, task.train.X, task.train.y); },
    () => { score.accuracy = visionAccuracy(model, task.train.X, task.train.y); },
    () => { score.valLoss = lossOn(model, task.val.X, task.val.y); score.valAccuracy = visionAccuracy(model, task.val.X, task.val.y); },
    () => {
      model.epochsTrained++;
      run.epochs = model.epochsTrained;
      for (const k of ['loss', 'valLoss', 'accuracy', 'valAccuracy']) run.history[k].push(score[k]);
    },
  ];
}

// Does the next piece of the current epoch (starting one when none is half done). Returns true when the epoch is complete.
export function stepUnit(run, task) {
  if (!run.pending) {
    const score = {};
    const units = run.cfg.model === 'dense' ? densePieces(run, task, score) : cnnPieces(run, task, score);
    run.pending = { units, i: 0, total: units.length };
  }
  const p = run.pending;
  p.units[p.i++]();
  if (p.i < p.total) return false;
  run.pending = null;
  return true;
}

export function stepRun(run, task) {
  while (!stepUnit(run, task));
  return run;
}

export function createJob(runs, task, target) {
  const needsWork = r => r.epochs < target || r.pending;
  const active = () => runs.find(needsWork);
  const done = () => !active();
  const part = r => (r.pending ? r.pending.i / r.pending.total : 0);
  return {
    runs, target, done,
    step() {
      const r = active();
      if (!r) return false;
      stepUnit(r, task);
      return !done();
    },
    progress() {
      const total = runs.length * target;
      const whole = runs.reduce((s, r) => s + Math.min(r.epochs, target), 0);
      const have = runs.reduce((s, r) => s + Math.min(r.epochs + part(r), target), 0);
      const index = Math.max(0, runs.findIndex(needsWork));
      return { done: whole, total, fraction: total ? have / total : 1, run: done() ? runs.length - 1 : index, runs: runs.length };
    },
  };
}

// Always does at least one step (so a slow epoch still makes progress), then keeps going while the time budget lasts.
export function runSlice(step, { budgetMs = 12, now = () => performance.now(), maxSteps = Infinity } = {}) {
  const start = now();
  let steps = 0, more = true;
  while (more && steps < maxSteps) {
    more = step() !== false;
    steps++;
    if (now() - start >= budgetMs) break;
  }
  return { steps, done: !more };
}

export function cloneModel(model) {
  if (model.kind === 'dense') return { ...model, nets: model.nets.map(cloneMlp) };
  return cloneCnn(model);
}

export function snapshotRun(run) {
  const h = run.history;
  return {
    cfg: run.cfg, epochs: run.epochs, model: cloneModel(run.model), initial: { ...run.initial },
    history: { loss: h.loss.slice(), valLoss: h.valLoss.slice(), accuracy: h.accuracy.slice(), valAccuracy: h.valAccuracy.slice() },
  };
}

export function createRunCache(limit = 8) {
  const map = new Map();
  return {
    get size() { return map.size; },
    has: key => map.has(key),
    get(key) {
      if (!map.has(key)) return undefined;
      const v = map.get(key);
      map.delete(key); map.set(key, v);
      return v;
    },
    set(key, value) {
      map.delete(key); map.set(key, value);
      while (map.size > limit) map.delete(map.keys().next().value);
    },
  };
}

// ---------------------------------------------------------------------------------------------------------
// Evaluation

export function evaluateConditions(model, test, amounts = defaultAmounts()) {
  return evaluateAll(model, test.X, test.y, conditionList(amounts));
}

export function confusionMatrix(yTrue, yPred, k) {
  const m = Array.from({ length: k }, () => new Array(k).fill(0));
  yTrue.forEach((t, i) => { m[t][yPred[i]]++; });
  return m;
}

export function confusionFor(model, X, y, condition = 'clean', k = CLASS_COUNT) {
  const pred = X.map((img, i) => predictClass(model, applyCondition(img, condition, i)));
  const matrix = confusionMatrix(y, pred, k);
  const recall = matrix.map((row, c) => { const s = row.reduce((a, b) => a + b, 0); return s ? row[c] / s : 0; });
  const correct = matrix.reduce((s, row, c) => s + row[c], 0);
  return { matrix, recall, accuracy: y.length ? correct / y.length : 0, n: y.length };
}

export function predictOutcome(acc, drop = DROP) {
  const darker = acc.clean - acc.darker >= drop, shifted = acc.clean - acc.shifted >= drop;
  if (darker && shifted) return 'both';
  if (shifted) return 'shifted';
  if (darker) return 'darker';
  return 'same';
}

export function compareAccuracy(a, b, tolerance = 0.03) {
  if (a - b > tolerance) return 'higher';
  if (b - a > tolerance) return 'lower';
  return 'same';
}

// ---------------------------------------------------------------------------------------------------------
// What the grid shows

// source: 'test' (the test pictures with the chosen condition applied), 'train' (the training pictures as they are)
// or 'augmented' (one random augmented copy of each training picture; the same copy every time for a seed).
// boxes[i] is the true box of picture i, taken from the clean picture's shape and moved with the picture (see shapeBox).
export function pictureSet(task, source, count, { condition = 'clean', augment = false, seed = 1 } = {}) {
  const set = source === 'test' ? task.test : task.train;
  const k = Math.min(count, set.X.length);
  const images = [], labels = [], boxes = [];
  const geometry = { ...normalizeAugment(augment), brightness: 0 };
  for (let i = 0; i < k; i++) {
    let img = set.X[i], box;
    if (source === 'test') { img = applyCondition(img, condition, i); box = shapeBox(set.X[i], condition, i); }
    else if (source === 'augmented') {
      img = augmentImage(img, augment, rng(seed * 1009 + i));
      // the same random draws, without the brightness step (which is drawn last and cannot move the shape)
      box = boundingBox(augmentImage(shapeMask(set.X[i]), geometry, rng(seed * 1009 + i)));
    } else box = boundingBox(shapeMask(img));
    images.push(img); labels.push(set.y[i]); boxes.push(box);
  }
  return { images, labels, boxes };
}

// The learned filters and their feature maps for one picture. CNN: for every filter its 3x3 kernel (9 numbers, row by row), bias,
// the convolution before ReLU, after ReLU and after max pooling (each { w, h, data }). Dense baseline: it has no filters, so the
// view shows the first hidden units of the network of class `classIndex`: the 144 weights of each unit (one per pixel) and the
// unit's output for this picture.
export function filterView(model, x, classIndex = 0) {
  if (model.kind === 'dense') {
    const net = model.nets[Math.min(Math.max(0, classIndex), model.nets.length - 1)];
    const cache = mlpForward(net, x);
    const units = net.weights[0].map((w, k) => ({ weights: w.slice(), bias: net.biases[0][k], output: cache.a[0][k] }));
    return { kind: 'dense', size: model.size, units: units.slice(0, 8), hidden: units.length };
  }
  const maps = featureMaps(model, x);
  const filters = maps.conv.map((conv, f) => ({
    kernel: model.convW.slice(f * 9, f * 9 + 9), bias: model.convB[f], conv, activated: maps.activated[f], pooled: maps.pooled[f],
  }));
  return { kind: 'cnn', size: model.size, filters };
}

// ---------------------------------------------------------------------------------------------------------
// Detection toy

// The tight box around the bright shape. The cut is halfway between the picture's darkest and brightest pixel, so it works
// for dim pictures too. It is NOT reliable on a brightened noisy picture (clipping lets background noise cross the cut):
// take the true box of a test picture from shapeBox instead. Pixel units: x and y of the top-left pixel, w and h in whole pixels.
export function boundingBox(image) {
  const s = Math.round(Math.sqrt(image.length));
  let lo = Infinity, hi = -Infinity;
  for (const v of image) { if (v < lo) lo = v; if (v > hi) hi = v; }
  if (!(hi - lo >= 0.08)) return null;
  const cut = lo + (hi - lo) / 2;
  let x0 = s, y0 = s, x1 = -1, y1 = -1;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    if (image[y * s + x] > cut) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Grey level between the background (0.1) and the shape (0.9) of a clean generated picture; noise of 0.1 is four deviations from it.
export const MASK_CUT = (BACKGROUND + SHAPE_LEVEL) / 2;

// The picture with its noise removed: SHAPE_LEVEL where the shape is, BACKGROUND elsewhere.
export function shapeMask(clean) { return clean.map(v => (v > MASK_CUT ? SHAPE_LEVEL : BACKGROUND)); }

// The true box of a CLEAN picture after a test condition. Darker and brighter do not move the shape, so the clean box stands;
// shifted and rotated move the noise-free mask exactly as applyCondition moves the picture (same rounding, same clipping at the edge).
export function shapeBox(clean, condition = 'clean', index = 0) {
  const name = typeof condition === 'string' ? condition : condition?.name;
  const mask = shapeMask(clean);
  return boundingBox(name === 'shifted' || name === 'rotated' ? applyCondition(mask, condition, index) : mask);
}

export function boxStats(truth, predicted, threshold = 0.5) {
  const iw = Math.min(truth.x + truth.w, predicted.x + predicted.w) - Math.max(truth.x, predicted.x);
  const ih = Math.min(truth.y + truth.h, predicted.y + predicted.h) - Math.max(truth.y, predicted.y);
  const inter = iw > 0 && ih > 0 ? iw * ih : 0;
  const union = truth.w * truth.h + predicted.w * predicted.h - inter;
  const value = iou(truth, predicted);
  const hit = value >= threshold;
  return { iou: value, inter, union, verdict: hit ? 'tp' : 'miss', tp: hit ? 1 : 0, fp: hit ? 0 : 1, fn: hit ? 0 : 1 };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round2 = v => Math.round(v * 100) / 100;

export function moveBox(box, dx, dy, size = 12) {
  return { ...box, x: round2(clamp(box.x + dx, 0, size - box.w)), y: round2(clamp(box.y + dy, 0, size - box.h)) };
}

export function resizeBox(box, dw, dh, size = 12) {
  const w = clamp(box.w + dw, MIN_BOX, size - box.x), h = clamp(box.h + dh, MIN_BOX, size - box.y);
  return { ...box, w: round2(w), h: round2(h) };
}

// A learner's first guess: shifted down and right and a little too big, so IoU starts near 0.5 and there is something to fix.
export function startBox(truth, size = 12) {
  const w = truth.w + Math.min(1.5, truth.w * 0.5), h = truth.h + Math.min(0.5, truth.h * 0.1);
  const dx = Math.min(1.5, truth.w * 0.35), dy = Math.min(1, truth.h * 0.2);
  return { x: round2(clamp(truth.x + dx, 0, size - w)), y: round2(clamp(truth.y + dy, 0, size - h)), w: round2(w), h: round2(h) };
}
