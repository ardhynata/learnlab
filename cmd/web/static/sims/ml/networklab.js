// Pure helpers for the neural network lab (sims/labs/network-lab.js): the four 2-D datasets and the
// real penguin pair, the train / validation split, a training session around sims/ml/mlp.js that
// records everything the lab's charts show, snapshots for "Previous step", and the numbers behind the
// network diagram and the activation histograms. Tested in networklab.test.js.
//
// Every point lives in "model space": roughly standardised coordinates, so one plot range (-HALF..HALF
// on both axes) fits every dataset. Labels are 0 (class A) and 1 (class B).
import { rng, gauss, shuffle } from './rng.js';
import { splitIndices } from './tabular.js';
import { createMlp, cloneMlp, train, dataLoss, accuracy, gradientStats, activationStats, forward, paramCount } from './mlp.js';

export const HALF = 3;
export const SHAPES = ['moons', 'circles', 'xor', 'spiral'];
export const PER_CLASS = 60;
export const VAL_FRACTION = 0.3;
export const LIMITS = { hidden: [1, 4], units: [2, 16] };
export const PENGUIN_CLASSES = ['Adelie', 'Chinstrap'];
export const PENGUIN_FEATURES = ['bill_length_mm', 'bill_depth_mm'];
// A gradient below this is drawn at this level on the (log) gradient chart, so an exactly zero gradient
// (all weights zero) is a flat line at the bottom and not minus infinity.
export const GRAD_FLOOR = 1e-8;

const clamp = v => Math.max(-HALF, Math.min(HALF, v));
const point = (x, y, label) => ({ x: clamp(x), y: clamp(y), label });

// ---- data ---------------------------------------------------------------------------------------

// 60 points of each class in one of four layouts, reproducible per seed.
//   moons    two interlocking half circles: a curve is needed.
//   circles  one class on a ring around the other: no straight line can work.
//   xor      four quadrants, classes on opposite corners, with a thin gap along the axes.
//   spiral   two arms winding around the middle: the hardest of the four.
export function generatePoints(shape, seed, perClass = PER_CLASS) {
  const random = rng(seed);
  const out = [];
  if (shape === 'xor') {
    for (const label of [0, 1]) {
      while (out.filter(p => p.label === label).length < perClass) {
        const x = (random() * 2 - 1) * 2.6, y = (random() * 2 - 1) * 2.6;
        if (Math.abs(x) < 0.2 || Math.abs(y) < 0.2 || (x * y > 0 ? 1 : 0) !== label) continue;
        out.push(point(x, y, label));
      }
    }
    return out;
  }
  for (const label of [0, 1]) {
    for (let i = 0; i < perClass; i++) {
      if (shape === 'circles') {
        const a = 2 * Math.PI * random(), r = (label ? 2.2 : 1) + 0.14 * gauss(random);
        out.push(point(r * Math.cos(a), r * Math.sin(a), label));
      } else if (shape === 'spiral') {
        const t = (i + random()) / perClass, r = 0.25 + 2.5 * t, a = label * Math.PI + 6.2 * t + 0.1 * gauss(random);
        out.push(point(r * Math.cos(a), r * Math.sin(a), label));
      } else {
        const t = Math.PI * random();
        const x = label ? 1 - Math.cos(t) : Math.cos(t), y = label ? 0.5 - Math.sin(t) : Math.sin(t);
        out.push(point((x - 0.5 + 0.12 * gauss(random)) * 1.8, (y - 0.25 + 0.12 * gauss(random)) * 1.8, label));
      }
    }
  }
  return out;
}

// For each point, true when it is held out for validation. Stratified: each class keeps its share.
export function heldOutFlags(labels, seed, fraction = VAL_FRACTION) {
  const parts = splitIndices(labels.length, { train: 1 - fraction, validation: 0 }, seed, labels);
  const held = new Array(labels.length).fill(false);
  for (const i of parts.test) held[i] = true;
  return held;
}

const isNum = v => typeof v === 'number' && Number.isFinite(v);

// Adelie against Chinstrap by bill length and bill depth, from the parsed penguins table. A row missing
// either measurement (the file writes NA) is dropped and counted, so the lab can say how many.
export function penguinPairs(table, classes = PENGUIN_CLASSES, features = PENGUIN_FEATURES) {
  const pairs = [];
  let total = 0;
  for (const row of table.rows) {
    const label = classes.indexOf(row.species);
    if (label < 0) continue;
    total++;
    const a = row[features[0]], b = row[features[1]];
    if (isNum(a) && isNum(b)) pairs.push({ a, b, label });
  }
  return { pairs, total, dropped: total - pairs.length };
}

// A seeded sample of up to `perClass` pairs of each class (so it is balanced when both classes have enough).
export function samplePairs(pairs, perClass, seed) {
  const random = rng(seed);
  const out = [];
  for (const label of [0, 1]) out.push(...shuffle(pairs.filter(p => p.label === label), random).slice(0, perClass));
  return out;
}

// Standardises {a, b, label} rows with the TRAINING rows' mean and spread only (the held-out rows are
// never looked at), then clamps to the plot square. Returns the points and the scaler, so a position can
// be turned back into millimetres.
export function standardisePairs(rows, held) {
  const trainRows = rows.filter((_, i) => !held[i]);
  const stat = key => {
    const m = trainRows.reduce((s, r) => s + r[key], 0) / trainRows.length;
    const sd = Math.sqrt(trainRows.reduce((s, r) => s + (r[key] - m) ** 2, 0) / trainRows.length) || 1;
    return { mean: m, sd };
  };
  const sa = stat('a'), sb = stat('b');
  return { points: rows.map(r => point((r.a - sa.mean) / sa.sd, (r.b - sb.mean) / sb.sd, r.label)), scaler: [sa, sb] };
}

// The labelled points of one round, each { x, y, label, held }. mode 'penguins' needs the parsed table.
export function buildDataset({ mode = 'generated', shape = 'moons', seed = 1, table = null, perClass = PER_CLASS } = {}) {
  if (mode === 'penguins' && table) {
    const { pairs, total, dropped } = penguinPairs(table);
    const sample = samplePairs(pairs, perClass, seed);
    const held = heldOutFlags(sample.map(p => p.label), seed);
    const { points, scaler } = standardisePairs(sample, held);
    return { points: points.map((p, i) => ({ ...p, held: held[i] })), info: { penguins: true, total, dropped, usable: pairs.length, scaler } };
  }
  const raw = generatePoints(shape, seed, perClass);
  const held = heldOutFlags(raw.map(p => p.label), seed);
  return { points: raw.map((p, i) => ({ ...p, held: held[i] })), info: { penguins: false, total: raw.length, dropped: 0, usable: raw.length, scaler: null } };
}

// The learning-rate slider holds log10 of the rate; this is the number it stands for, rounded to three
// significant figures so the readout and the model agree.
export const fromLog = v => Number((10 ** v).toPrecision(3));

// ---- training session ---------------------------------------------------------------------------

export const buildLayers = (hidden, units) => [2, ...new Array(hidden).fill(units), 1];

// hist entry 0 is the network before training: its loss, accuracy, activations, and the gradient it
// would take its first step with. Entry e >= 1 is after epoch e: the loss and activations afterwards,
// and the gradient epoch e's step used. grad[e][l] is the mean absolute weight gradient of weight layer
// l (0 = into the first hidden layer, last = the output unit).
const emptyHist = () => ({ trainLoss: [], valLoss: [], trainAcc: [], valAcc: [], grad: [], actMean: [], deadFrac: [] });

// cfg: { hidden, units, activation, init, seed }. data: points with a held flag.
export function createSession(data, cfg) {
  const tr = data.filter(p => !p.held), va = data.filter(p => p.held);
  const model = createMlp({ layers: buildLayers(cfg.hidden, cfg.units), activation: cfg.activation, init: cfg.init, seed: cfg.seed });
  const s = {
    cfg: { ...cfg }, model, epoch: 0, diverged: false, hist: emptyHist(),
    X: tr.map(p => [p.x, p.y]), y: tr.map(p => p.label), Xv: va.map(p => [p.x, p.y]), yv: va.map(p => p.label),
  };
  const st = activationStats(model, s.X);
  record(s, gradientStats(model, s.X, s.y), st.actMean, st.deadFrac);
  return s;
}

function record(s, grad, actMean, deadFrac, trainLoss) {
  const h = s.hist;
  h.trainLoss.push(trainLoss ?? dataLoss(s.model, s.X, s.y));
  h.valLoss.push(s.Xv.length ? dataLoss(s.model, s.Xv, s.yv) : null);
  h.trainAcc.push(accuracy(s.model, s.X, s.y));
  h.valAcc.push(s.Xv.length ? accuracy(s.model, s.Xv, s.yv) : null);
  h.grad.push(grad); h.actMean.push(actMean); h.deadFrac.push(deadFrac);
}

// Trains `epochs` more epochs, one at a time, with the optimizer settings given now (opts: optimizer, lr,
// l2). Changing the optimizer between calls restarts its running state; changing lr or l2 keeps the
// weights. Stops early when training diverges (the loss is no longer a number). Returns the epochs done.
export function stepSession(s, epochs, { optimizer = 'adam', lr = 0.01, l2 = 0 } = {}) {
  let done = 0;
  for (let i = 0; i < epochs && !s.diverged; i++) {
    const { history } = train({ model: s.model, X: s.X, y: s.y, optimizer, lr, l2, epochs: 1, seed: s.cfg.seed });
    s.epoch++; done++;
    const loss = history.loss[0];
    record(s, history.gradAbs[0], history.actMean[0], history.deadFrac[0], loss);
    if (!Number.isFinite(loss)) s.diverged = true;
  }
  return done;
}

// Like stepSession, but gives up when `budgetMs` of wall time have passed (checked after every epoch),
// so one animation frame never does more than a frame's work. `now` is performance.now by default.
export function stepSessionTimed(s, epochs, opts, budgetMs, now = () => performance.now()) {
  const t0 = now();
  let done = 0;
  while (done < epochs && !s.diverged && now() - t0 < budgetMs) done += stepSession(s, 1, opts);
  return done;
}

// A copy of the state at this epoch that restoreSession can come back to (model, optimizer state, epoch).
export const snapshotSession = s => ({ epoch: s.epoch, model: cloneMlp(s.model) });

// Goes back to a snapshot: the history after that epoch is forgotten.
export function restoreSession(s, snap) {
  s.model = cloneMlp(snap.model);
  s.epoch = snap.epoch;
  s.diverged = false;
  for (const key of Object.keys(s.hist)) s.hist[key].length = snap.epoch + 1;
}

export const parameterCount = s => paramCount(s.model);

// ---- what the charts draw -----------------------------------------------------------------------

// log10 of a gradient size, floored at GRAD_FLOOR.
export const gradLog = v => Math.log10(Math.max(Number.isFinite(v) ? v : 0, GRAD_FLOOR));

// One line per weight layer: { xs: epochs, ys: log10 mean |gradient| } up to the current epoch.
export function gradientSeries(hist) {
  const layers = hist.grad[0]?.length ?? 0;
  const xs = hist.grad.map((_, e) => e);
  return Array.from({ length: layers }, (_, l) => ({ xs, ys: hist.grad.map(g => gradLog(g[l])) }));
}

// What happens to the first layer's gradient compared with the output layer's, averaged over the start of
// the run: epoch 0 (the gradient the untrained network starts with) and the first `early` epochs after it.
// The start is the textbook picture and does not move while the run goes on: later, once the loss is falling,
// the output layer's gradient shrinks and a fast optimizer such as Adam can even the layers out.
// key: 'zero' (the first layer's gradient is exactly 0), 'smaller' (under half the output layer's),
// 'larger' (over twice), else 'same'.
export function gradientVerdict(hist, early = 10) {
  const rows = hist.grad.slice(0, early + 1);
  const layers = hist.grad[0]?.length ?? 0;
  if (!rows.length || layers < 2) return { key: 'same', first: 0, last: 0, ratio: 1 };
  const mean = l => rows.reduce((s, g) => s + g[l], 0) / rows.length;
  const first = mean(0), last = mean(layers - 1);
  const ratio = last > 0 ? first / last : Infinity;
  const key = !(first > 1e-12) ? 'zero' : ratio < 0.5 ? 'smaller' : ratio > 2 ? 'larger' : 'same';
  return { key, first, last, ratio };
}

// For each hidden layer: every unit's mean activation and whether it is alive (its activation slope is not
// below 1e-6 for some row; a ReLU that is off for every row, or a fully saturated sigmoid / tanh, is dead),
// the share of dead units, the mean over all units and rows, and every activation value (for a histogram).
export function layerActivity(model, X) {
  const L = model.weights.length;
  const caches = X.map(x => forward(model, x));
  const slope = (a, z) => (model.activation === 'relu' ? (z > 0 ? 1 : 0) : model.activation === 'tanh' ? 1 - a * a : a * (1 - a));
  const out = [];
  for (let l = 0; l < L - 1; l++) {
    const n = model.layers[l + 1];
    const sums = new Array(n).fill(0), alive = new Array(n).fill(false), values = [];
    for (const c of caches) {
      for (let k = 0; k < n; k++) {
        const a = c.a[l][k];
        sums[k] += a; values.push(a);
        if (slope(a, c.z[l][k]) >= 1e-6) alive[k] = true;
      }
    }
    const rows = X.length || 1;
    const units = sums.map((s, k) => ({ mean: s / rows, alive: X.length ? alive[k] : true }));
    out.push({
      units, values,
      mean: units.reduce((s, u) => s + u.mean, 0) / n,
      deadFrac: X.length ? units.filter(u => !u.alive).length / n : 0,
    });
  }
  return out;
}

// The range a histogram of a hidden layer's activations should cover: sigmoid 0..1, tanh -1..1, and ReLU
// 0 up to the next of 1, 2, 5, 10, 20, 50, ... above the 98th percentile of all hidden activations (so a few
// huge outliers do not squeeze everything else into one bar; they land in the last bin).
export function activationRange(activation, layers) {
  if (activation === 'sigmoid') return [0, 1];
  if (activation === 'tanh') return [-1, 1];
  const all = layers.flatMap(l => l.values).sort((a, b) => a - b);
  const top = all.length ? all[Math.ceil(0.98 * all.length) - 1] : 0;
  if (!(top > 1)) return [0, 1];
  let hi = 1;
  while (hi < top) hi *= hi.toString()[0] === '2' ? 2.5 : 2;
  return [0, hi];
}

// Share of `values` in each of `bins` equal bins from lo to hi (a value outside goes in the end bin).
export function histogram(values, lo, hi, bins = 12) {
  const counts = new Array(bins).fill(0);
  for (const v of values) counts[Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / (hi - lo) * bins)))]++;
  return counts.map(c => (values.length ? c / values.length : 0));
}

// The lines of the network diagram: one per weight, with a width that grows with |weight| from minWidth
// (a zero weight) to maxWidth (|weight| of `ref` or more). A fixed reference, not the biggest weight, so
// weights that grow while training look bigger. Edge = { layer, from, to, w, width, zero }.
export function networkEdges(model, { maxWidth = 4, minWidth = 0.4, ref = 2 } = {}) {
  const edges = [];
  model.weights.forEach((W, layer) => W.forEach((row, to) => row.forEach((w, from) => {
    edges.push({ layer, from, to, w, width: minWidth + (maxWidth - minWidth) * Math.min(1, Math.abs(w) / ref), zero: w === 0 });
  })));
  return edges;
}

// Node centres of the diagram, layer by layer, inside a width x height box with `pad` around it: layers
// spread evenly left to right, units centred and spaced evenly (at most `maxGap` apart).
export function diagramLayout(layers, width, height, { pad = 14, top = 18, maxGap = 26 } = {}) {
  const cols = layers.length;
  const innerW = Math.max(1, width - 2 * pad), innerH = Math.max(1, height - top - pad);
  return layers.map((n, c) => {
    const x = cols === 1 ? width / 2 : pad + innerW * c / (cols - 1);
    const gap = Math.min(maxGap, innerH / n);
    const y0 = top + innerH / 2 - gap * (n - 1) / 2;
    return Array.from({ length: n }, (_, k) => ({ x, y: y0 + gap * k }));
  });
}
