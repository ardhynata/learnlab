import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HALF, SHAPES, generatePoints, heldOutFlags, penguinPairs, samplePairs, standardisePairs, buildDataset, fromLog,
  buildLayers, createSession, stepSession, stepSessionTimed, snapshotSession, restoreSession, parameterCount,
  gradLog, gradientSeries, gradientVerdict, layerActivity, activationRange, histogram, networkEdges, diagramLayout, GRAD_FLOOR,
} from './networklab.js';
import { parseCsv } from './tabular.js';
import { createMlp, activationStats, train } from './mlp.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);

test('every shape: 60 points per class, inside the plot square, reproducible per seed', () => {
  for (const shape of SHAPES) {
    const a = generatePoints(shape, 4), b = generatePoints(shape, 4), c = generatePoints(shape, 5);
    assert.deepEqual(a, b, shape);
    assert.notDeepEqual(a, c, shape);
    assert.equal(a.length, 120, shape);
    assert.equal(a.filter(p => p.label === 1).length, 60, shape);
    for (const p of a) assert.ok(Math.abs(p.x) <= HALF && Math.abs(p.y) <= HALF, shape);
  }
});

test('xor puts the classes on opposite corners, circles on two radii, with no point in the xor gap', () => {
  for (const p of generatePoints('xor', 2)) {
    assert.ok(Math.abs(p.x) >= 0.2 && Math.abs(p.y) >= 0.2);
    assert.equal(p.label, p.x * p.y > 0 ? 1 : 0);
  }
  const mean = label => { const r = generatePoints('circles', 2).filter(p => p.label === label).map(p => Math.hypot(p.x, p.y)); return r.reduce((s, v) => s + v, 0) / r.length; };
  assert.ok(Math.abs(mean(0) - 1) < 0.1 && Math.abs(mean(1) - 2.2) < 0.1);
});

test('the split is stratified: 30% of each class is held out, the same for the same seed', () => {
  const pts = generatePoints('moons', 3), labels = pts.map(p => p.label);
  const held = heldOutFlags(labels, 3);
  assert.deepEqual(held, heldOutFlags(labels, 3));
  for (const label of [0, 1]) assert.equal(held.filter((h, i) => h && labels[i] === label).length, 18);
});

const CSV = [
  'species,island,bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,sex,year',
  'Adelie,Torgersen,39.1,18.7,181,3750,male,2007',
  'Adelie,Torgersen,NA,NA,NA,NA,NA,2007',
  'Adelie,Torgersen,40,17,190,3800,female,2007',
  'Gentoo,Biscoe,46.1,13.2,211,4500,female,2007',
  'Chinstrap,Dream,46.5,17.9,192,3500,female,2007',
  'Chinstrap,Dream,50,NA,196,3900,male,2007',
  'Chinstrap,Dream,51,18,201,3700,male,2007',
].join('\n');

test('penguinPairs keeps only the two species, drops rows with a missing measurement and counts them', () => {
  const { pairs, total, dropped } = penguinPairs(parseCsv(CSV));
  assert.equal(total, 6);          // Gentoo is not one of the two classes
  assert.equal(dropped, 2);
  assert.deepEqual(pairs, [
    { a: 39.1, b: 18.7, label: 0 }, { a: 40, b: 17, label: 0 }, { a: 46.5, b: 17.9, label: 1 }, { a: 51, b: 18, label: 1 },
  ]);
});

test('standardisePairs uses the training rows only: their mean is 0 and spread 1; held-out rows may fall outside', () => {
  const rows = [{ a: 10, b: 1, label: 0 }, { a: 20, b: 3, label: 1 }, { a: 30, b: 5, label: 0 }, { a: 100, b: 9, label: 1 }];
  const held = [false, false, false, true];
  const { points, scaler } = standardisePairs(rows, held);
  near(scaler[0].mean, 20); near(scaler[0].sd, Math.sqrt(200 / 3));
  near(points[0].x + points[2].x + points[1].x, 0);
  assert.equal(points[3].x, HALF);   // (100 - 20) / 8.16 = 9.8, clamped to the plot square
});

test('buildDataset: penguins mode samples both classes, reports NA and keeps the labels', () => {
  const table = parseCsv(CSV);
  const { points, info } = buildDataset({ mode: 'penguins', seed: 1, table, perClass: 60 });
  assert.equal(points.length, 4);
  assert.equal(info.penguins, true);
  assert.equal(info.dropped, 2);
  assert.equal(info.total, 6);
  assert.deepEqual(buildDataset({ mode: 'generated', shape: 'xor', seed: 1 }).points, buildDataset({ mode: 'generated', shape: 'xor', seed: 1 }).points);
  // without the table loaded the generated data is used
  assert.equal(buildDataset({ mode: 'penguins', table: null }).info.penguins, false);
});

test('samplePairs is balanced and reproducible', () => {
  const pairs = Array.from({ length: 30 }, (_, i) => ({ a: i, b: i, label: i % 3 === 0 ? 1 : 0 }));
  const s = samplePairs(pairs, 5, 2);
  assert.equal(s.filter(p => p.label === 0).length, 5);
  assert.equal(s.filter(p => p.label === 1).length, 5);
  assert.deepEqual(s, samplePairs(pairs, 5, 2));
});

test('fromLog turns the slider position into the rate, to three significant figures', () => {
  assert.equal(fromLog(-2), 0.01);
  assert.equal(fromLog(-1.5), 0.0316);
  assert.equal(fromLog(0), 1);
});

test('buildLayers: two inputs, the hidden layers, one output', () => {
  assert.deepEqual(buildLayers(3, 5), [2, 5, 5, 5, 1]);
  assert.deepEqual(buildLayers(1, 2), [2, 2, 1]);
});

const moons = () => buildDataset({ shape: 'moons', seed: 11 }).points;
const CFG = { hidden: 2, units: 8, activation: 'relu', init: 'he', seed: 1 };

test('a session starts at epoch 0 with the initial loss, gradient and activations recorded', () => {
  const s = createSession(moons(), CFG);
  assert.equal(s.epoch, 0);
  assert.equal(s.X.length, 84);
  assert.equal(s.Xv.length, 36);
  assert.equal(s.hist.trainLoss.length, 1);
  assert.equal(s.hist.grad[0].length, 3);
  assert.equal(parameterCount(s), 2 * 8 + 8 + 8 * 8 + 8 + 8 + 1);
  assert.ok(s.hist.trainLoss[0] > 0.3 && s.hist.trainLoss[0] < 3);
});

test('stepping a session epoch by epoch equals mlp.train in one go, and the history grows with it', () => {
  const s = createSession(moons(), CFG);
  stepSession(s, 7, { optimizer: 'adam', lr: 0.01 });
  assert.equal(s.epoch, 7);
  for (const key of Object.keys(s.hist)) assert.equal(s.hist[key].length, 8, key);
  const model = createMlp({ layers: [2, 8, 8, 1], activation: 'relu', init: 'he', seed: 1 });
  const { history } = train({ model, X: s.X, y: s.y, optimizer: 'adam', lr: 0.01, epochs: 7, seed: 1 });
  assert.deepEqual(s.model.weights, model.weights);
  near(s.hist.trainLoss[7], history.loss[6]);
  assert.deepEqual(s.hist.grad[7], history.gradAbs[6]);
});

test('the network learns moons: loss falls a lot and held-out accuracy is high', () => {
  const s = createSession(moons(), CFG);
  stepSession(s, 300, { optimizer: 'adam', lr: 0.01 });
  assert.ok(s.hist.trainLoss[300] < s.hist.trainLoss[0] / 5);
  assert.ok(s.hist.valAcc[300] >= 0.9);
});

test('snapshot and restore bring back the weights, the epoch and a truncated history; training continues identically', () => {
  const s = createSession(moons(), CFG), opt = { optimizer: 'adam', lr: 0.01 };
  stepSession(s, 5, opt);
  const snap = snapshotSession(s);
  stepSession(s, 5, opt);
  const weightsAt10 = JSON.stringify(s.model.weights), lossAt10 = s.hist.trainLoss[10];
  restoreSession(s, snap);
  assert.equal(s.epoch, 5);
  assert.equal(s.hist.trainLoss.length, 6);
  assert.equal(s.hist.grad.length, 6);
  stepSession(s, 5, opt);
  assert.equal(JSON.stringify(s.model.weights), weightsAt10);
  assert.equal(s.hist.trainLoss[10], lossAt10);
});

test('a step so large that the weights overflow stops the session at the epoch where the loss is not a number', () => {
  const s = createSession(moons(), { ...CFG, hidden: 4, units: 16 });
  const done = stepSession(s, 400, { optimizer: 'sgd', lr: 1e30 });
  assert.equal(s.diverged, true);
  assert.ok(done < 400 && done === s.epoch);
});

test('stepSessionTimed stops at the budget and at the epoch count', () => {
  const s = createSession(moons(), CFG);
  let t = 0;
  assert.equal(stepSessionTimed(s, 5, {}, 1e9, () => t), 5);
  const tick = () => (t += 10);
  assert.equal(stepSessionTimed(s, 50, {}, 25, tick), 2);   // starts at 10; reads 20 and 30 -> two epochs, then 40 is 30 past the start
});

test('zero initialisation: every first-layer gradient is exactly 0 and the loss stays at ln 2', () => {
  const s = createSession(moons(), { ...CFG, init: 'zeros' });
  stepSession(s, 20, { optimizer: 'sgd', lr: 0.1 });
  assert.equal(s.hist.grad[20][0], 0);
  near(s.hist.trainLoss[20], Math.log(2), 1e-6);
  assert.equal(gradientVerdict(s.hist).key, 'zero');
});

test('sigmoid with 4 hidden layers: the first layer gradient is far smaller than the output layer gradient', () => {
  for (const seed of [1, 2, 3]) {
    const s = createSession(moons(), { hidden: 4, units: 8, activation: 'sigmoid', init: 'xavier', seed });
    stepSession(s, 20, { optimizer: 'sgd', lr: 0.1 });
    const v = gradientVerdict(s.hist);
    assert.equal(v.key, 'smaller', `seed ${seed}: ratio ${v.ratio}`);
    assert.ok(v.ratio < 0.4);
  }
});

test('gradientVerdict on made-up history: thresholds and the window', () => {
  const hist = { grad: [[9, 9], [1, 10], [1, 10]] };
  assert.equal(gradientVerdict({ grad: [[0.01, 1]] }).key, 'smaller');
  assert.equal(gradientVerdict({ grad: [[2, 1]] }).key, 'same');
  assert.equal(gradientVerdict({ grad: [[2.5, 1]] }).key, 'larger');
  near(gradientVerdict(hist).ratio, 11 / 29);                  // epoch 0 and the next 10 (here only 2): (9 + 1 + 1) / (9 + 10 + 10)
  assert.equal(gradientVerdict(hist).key, 'smaller');
  near(gradientVerdict(hist, 1).ratio, 10 / 19);               // epoch 0 and epoch 1 only: (9 + 1) / (9 + 10)
  assert.equal(gradientVerdict({ grad: [[9, 9], ...new Array(10).fill([1, 10]), [100, 10]] }).key, 'smaller');   // epoch 11 on is not looked at
});

test('gradLog floors at 1e-8 and gradientSeries has one line per weight layer', () => {
  assert.equal(gradLog(0), Math.log10(GRAD_FLOOR));
  assert.equal(gradLog(NaN), Math.log10(GRAD_FLOOR));
  near(gradLog(0.01), -2);
  const series = gradientSeries({ grad: [[1, 0.1], [0.01, 0]] });
  assert.equal(series.length, 2);
  assert.deepEqual(series[0].xs, [0, 1]);
  near(series[0].ys[1], -2);
  assert.equal(series[1].ys[1], -8);
});

test('layerActivity agrees with mlp.activationStats on dead share and mean, and flags the right units', () => {
  // two ReLU units: unit 0 is on for x > 0, unit 1 is off for every row (very negative bias)
  const model = createMlp({ layers: [2, 2, 1], activation: 'relu', weights: [[[1, 0], [1, 0]], [[1, 1]]], biases: [[0, -100], [0]] });
  const X = [[1, 0], [2, 0], [-1, 0]];
  const [layer] = layerActivity(model, X);
  assert.deepEqual(layer.units.map(u => u.alive), [true, false]);
  assert.equal(layer.deadFrac, 0.5);
  near(layer.units[0].mean, 1);          // (1 + 2 + 0) / 3
  near(layer.mean, 0.5);
  assert.equal(layer.values.length, 6);
  const stats = activationStats(model, X);
  near(layer.deadFrac, stats.deadFrac[0]);
  near(layer.mean, stats.actMean[0]);
  const trained = createSession(moons(), { ...CFG, hidden: 3 });
  stepSession(trained, 50, { optimizer: 'sgd', lr: 1 });
  const act = layerActivity(trained.model, trained.X), ref = activationStats(trained.model, trained.X);
  act.forEach((l, i) => { near(l.deadFrac, ref.deadFrac[i]); near(l.mean, ref.actMean[i]); });
});

test('activationRange and histogram', () => {
  assert.deepEqual(activationRange('sigmoid', []), [0, 1]);
  assert.deepEqual(activationRange('tanh', []), [-1, 1]);
  const lay = values => [{ values }];
  assert.deepEqual(activationRange('relu', lay([0, 0.4])), [0, 1]);
  assert.deepEqual(activationRange('relu', lay([0, 1.5])), [0, 2]);
  assert.deepEqual(activationRange('relu', lay([3])), [0, 5]);
  assert.deepEqual(activationRange('relu', lay([7])), [0, 10]);
  assert.deepEqual(activationRange('relu', lay([12])), [0, 20]);
  assert.deepEqual(activationRange('relu', lay([...new Array(99).fill(0.5), 500])), [0, 1]);   // one outlier in a hundred is ignored
  assert.deepEqual(activationRange('relu', lay([...new Array(97).fill(0.5), 30, 30, 30])), [0, 50]);   // three in a hundred are not
  const h = histogram([0, 0.1, 0.6, 1, 1.5, -2], 0, 1, 2);
  assert.deepEqual(h, [3 / 6, 3 / 6]);     // -2 and 0, 0.1 in the first bin; 0.6, 1, 1.5 in the second
  near(histogram([0.2, 0.3, 0.9], 0, 1, 10).reduce((s, v) => s + v, 0), 1);
  assert.deepEqual(histogram([], 0, 1, 3), [0, 0, 0]);
});

test('networkEdges: one per weight, width from 0.4 (zero) up to 4 (|w| >= 2); weight 1 gives 2.2', () => {
  const model = createMlp({ layers: [2, 2, 1], weights: [[[1, -2], [0, 5]], [[0.5, -0.25]]], biases: [[0, 0], [0]] });
  const edges = networkEdges(model);
  assert.equal(edges.length, 6);
  const e = (layer, from, to) => edges.find(x => x.layer === layer && x.from === from && x.to === to);
  near(e(0, 0, 0).width, 2.2);            // 0.4 + 3.6 * 1/2
  near(e(0, 1, 0).width, 4);              // |-2| is the reference: full width
  assert.equal(e(0, 0, 1).zero, true);
  near(e(0, 0, 1).width, 0.4);
  near(e(0, 1, 1).width, 4);              // 5 is capped
  near(e(1, 0, 0).width, 0.4 + 3.6 * 0.25);
  assert.equal(e(1, 1, 0).w, -0.25);
});

test('diagramLayout: columns spread left to right, units centred, gap capped', () => {
  const nodes = diagramLayout([2, 3, 1], 200, 118, { pad: 10, top: 18, maxGap: 26 });
  assert.equal(nodes.length, 3);
  assert.deepEqual(nodes.map(c => c.length), [2, 3, 1]);
  assert.deepEqual(nodes.map(c => c[0].x), [10, 100, 190]);
  // inner height 118 - 18 - 10 = 90, centre at 18 + 45 = 63; 1 unit sits in the middle, 3 units 26 apart
  near(nodes[2][0].y, 63);
  near(nodes[1][1].y, 63);
  near(nodes[1][2].y - nodes[1][0].y, 52);
});
