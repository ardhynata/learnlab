import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMlp, cloneMlp, paramCount, forward, backward, gradients, gradientCheck, loss, dataLoss,
  train, predictOutput, predictLabels, accuracy, predictGrid, gradientStats, activationStats,
} from './mlp.js';
import { rng, gauss } from './rng.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (tol ${tol})`);
const closeArr = (a, b, tol = 1e-9) => { assert.equal(a.length, b.length); a.forEach((v, i) => close(v, b[i], tol)); };

const XOR_X = [[0, 0], [0, 1], [1, 0], [1, 1]];
const XOR_Y = [0, 1, 1, 0];

// A ring-shaped 2-D problem: class 1 outside radius sqrt(1.2).
function ringData(n = 80, seed = 5) {
  const r = rng(seed);
  const X = [], y = [];
  for (let i = 0; i < n; i++) { const a = gauss(r), b = gauss(r); X.push([a, b]); y.push(a * a + b * b > 1.2 ? 1 : 0); }
  return { X, y };
}

// The hand-built 2-2-1 ReLU network used by the forward and backward tests.
function handNet(activation = 'relu') {
  return createMlp({
    layers: [2, 2, 1], activation,
    weights: [[[1, -1], [0.5, 2]], [[0.5, -0.25]]],
    biases: [[0, -1], [0.1]],
  });
}

test('createMlp: shapes, parameter count, init scales and validation', () => {
  const m = createMlp({ layers: [2, 8, 8, 1], activation: 'relu', init: 'he', seed: 3 });
  assert.deepEqual(m.weights.map(W => [W.length, W[0].length]), [[8, 2], [8, 8], [1, 8]]);
  assert.deepEqual(m.biases.map(b => b.length), [8, 8, 1]);
  assert.equal(paramCount(m), 8 * 2 + 8 + 8 * 8 + 8 + 8 + 1);
  assert.ok(m.biases.every(b => b.every(v => v === 0)));
  assert.equal(createMlp({ layers: [2, 3, 1] }).init, 'he');
  assert.equal(createMlp({ layers: [2, 3, 1], activation: 'tanh' }).init, 'xavier');

  // zeros is exactly 0; small is tiny; he and xavier have the textbook spread.
  assert.ok(createMlp({ layers: [2, 5, 1], init: 'zeros' }).weights.flat(2).every(v => v === 0));
  const std = arr => Math.sqrt(arr.reduce((s, v) => s + v * v, 0) / arr.length);
  const big = init => createMlp({ layers: [50, 60, 1], init, seed: 7 }).weights[0].flat();
  assert.ok(std(big('small')) < 0.02);
  close(std(big('he')), Math.sqrt(2 / 50), 0.03);
  close(std(big('xavier')), Math.sqrt(2 / 110), 0.02);

  // Same seed, same weights; another seed, other weights.
  assert.deepEqual(createMlp({ layers: [2, 4, 1], seed: 9 }).weights, createMlp({ layers: [2, 4, 1], seed: 9 }).weights);
  assert.notDeepEqual(createMlp({ layers: [2, 4, 1], seed: 9 }).weights, createMlp({ layers: [2, 4, 1], seed: 10 }).weights);

  assert.throws(() => createMlp({ layers: [2] }), /layers/);
  assert.throws(() => createMlp({ layers: [2, 3, 2] }), /1 unit/);
  assert.throws(() => createMlp({ layers: [2, 3, 1], activation: 'swish' }), /activation/);
  assert.throws(() => createMlp({ layers: [2, 3, 1], init: 'magic' }), /init/);
  assert.throws(() => createMlp({ layers: [2, 3, 1], task: 'ranking' }), /task/);
  assert.throws(() => createMlp({ layers: [2, 3, 1], weights: [[[1, 1]]], biases: [[0]] }), /do not match/);
});

test('forward: a hand-computed 2-2-1 ReLU network', () => {
  const m = handNet();
  // x = [2, 1]: z1 = [1*2 - 1*1 + 0, 0.5*2 + 2*1 - 1] = [1, 2]; a1 = [1, 2];
  // z2 = 0.5*1 - 0.25*2 + 0.1 = 0.1; output = sigmoid(0.1).
  const c = forward(m, [2, 1]);
  closeArr(c.z[0], [1, 2]);
  closeArr(c.a[0], [1, 2]);
  closeArr(c.z[1], [0.1]);
  close(c.output, 0.5249791874789399);
  assert.deepEqual(c.x, [2, 1]);

  // A negative pre-activation is clipped to 0 by ReLU: x = [0, 1] gives z1 = [-1, 1], a1 = [0, 1].
  const d = forward(m, [0, 1]);
  closeArr(d.z[0], [-1, 1]);
  closeArr(d.a[0], [0, 1]);
  closeArr(d.z[1], [0.5 * 0 - 0.25 * 1 + 0.1]);
});

test('forward: tanh and sigmoid hidden layers, regression output, dropout masks', () => {
  const w = { weights: [[[0.5, 0], [0, 0.25]], [[1, 1]]], biases: [[0, 0], [0]] };
  const t = createMlp({ layers: [2, 2, 1], activation: 'tanh', ...w });
  const ct = forward(t, [1, 2]);
  closeArr(ct.a[0], [Math.tanh(0.5), Math.tanh(0.5)]);
  close(ct.a[0][0], 0.46211715726, 1e-10);
  const s = createMlp({ layers: [2, 2, 1], activation: 'sigmoid', ...w });
  const cs = forward(s, [1, 2]);
  close(cs.a[0][0], 1 / (1 + Math.exp(-0.5)));
  // Regression: the output unit is linear, so the output is the raw z2 (sum of hidden activations).
  const r = createMlp({ layers: [2, 2, 1], activation: 'tanh', task: 'regression', ...w });
  const cr = forward(r, [1, 2]);
  close(cr.output, cr.z[1][0]);
  close(cr.output, 2 * Math.tanh(0.5));
  // Masks multiply hidden activations (and so what the output sees), never the output layer.
  const cm = forward(r, [1, 2], { masks: [[0, 2]] });
  closeArr(cm.a[0], [0, 2 * Math.tanh(0.5)]);
  close(cm.output, 2 * Math.tanh(0.5));
});

test('backward: one gradient checked against the hand values and the numerical gradient', () => {
  const m = handNet();
  const c = forward(m, [2, 1]);
  const g = backward(m, c, 1);
  // out = sigmoid(0.1) = 0.52497918748; output delta = out - 1 = -0.47502081252.
  const d2 = 0.5249791874789399 - 1;
  closeArr(g.deltas[1], [d2]);
  // dW2 = d2 * a1 = d2 * [1, 2]; db2 = d2.
  closeArr(g.weights[1][0], [d2, 2 * d2]);
  closeArr(g.biases[1], [d2]);
  // Hidden deltas: W2^T d2 times the ReLU slope (both units are on): [0.5 d2, -0.25 d2] = [-0.23751040626, 0.11875520313].
  closeArr(g.deltas[0], [0.5 * d2, -0.25 * d2]);
  close(g.deltas[0][0], -0.23751040626053, 1e-12);
  close(g.deltas[0][1], 0.11875520313026, 1e-12);
  // dW1 = delta outer x with x = [2, 1].
  closeArr(g.weights[0][0], [2 * 0.5 * d2, 0.5 * d2]);
  closeArr(g.weights[0][1], [2 * -0.25 * d2, -0.25 * d2]);
  closeArr(g.biases[0], [0.5 * d2, -0.25 * d2]);
  // The loss at this point is -ln(sigmoid(0.1)) = ln(1 + e^-0.1).
  close(dataLoss(m, [[2, 1]], [1]), 0.6443966600735711);

  // The numerical gradient agrees on every parameter.
  const chk = gradientCheck(m, [[2, 1]], [1]);
  assert.equal(chk.checked, paramCount(m));
  assert.ok(chk.ok, `max error ${chk.maxError}`);

  // A dead ReLU unit passes no gradient: x = [0, 1] turns unit 0 off (z = -1).
  const dead = backward(m, forward(m, [0, 1]), 1);
  closeArr(dead.weights[0][0], [0, 0]);
  close(dead.biases[0][0], 0);
  assert.notEqual(dead.biases[0][1], 0);
});

test('gradients average over rows and gradientCheck passes for every activation, task and L2', () => {
  const { X, y } = ringData(12, 3);
  for (const activation of ['relu', 'tanh', 'sigmoid']) {
    for (const task of ['classification', 'regression']) {
      const m = createMlp({ layers: [2, 5, 4, 1], activation, task, seed: 4 });
      const target = task === 'regression' ? y.map((v, i) => v + 0.1 * X[i][0]) : y;
      const chk = gradientCheck(m, X, target, { l2: 0.3 });
      assert.ok(chk.ok, `${activation}/${task} max error ${chk.maxError} at ${JSON.stringify(chk.worst)}`);
    }
  }
  // The batch gradient is the mean of the per-example gradients (L2 off).
  const m = createMlp({ layers: [2, 3, 1], activation: 'tanh', seed: 2 });
  const rows = [0, 1, 2];
  const batch = gradients(m, X, y, { indices: rows });
  const per = rows.map(i => backward(m, forward(m, X[i]), y[i]));
  close(batch.weights[0][1][0], per.reduce((s, g) => s + g.weights[0][1][0], 0) / 3);
  close(batch.biases[1][0], per.reduce((s, g) => s + g.biases[1][0], 0) / 3);
  // L2 adds l2 * w to each weight gradient and nothing to biases.
  const plain = gradients(m, X, y), pen = gradients(m, X, y, { l2: 0.5 });
  close(pen.weights[1][0][2], plain.weights[1][0][2] + 0.5 * m.weights[1][0][2]);
  close(pen.biases[1][0], plain.biases[1][0]);
  close(loss(m, X, y, { l2: 0.5 }) - loss(m, X, y), 0.25 * m.weights.flat(2).reduce((s, w) => s + w * w, 0));
});

test('regression loss is the mean squared error', () => {
  const m = createMlp({ layers: [2, 2, 1], activation: 'tanh', task: 'regression', weights: [[[0, 0], [0, 0]], [[0, 0]]], biases: [[0, 0], [1]] });
  // Every output is 1; targets 3 and 0 give errors 2 and 1: (4 + 1) / 2.
  close(dataLoss(m, [[0, 0], [1, 1]], [3, 0]), 2.5);
  // Output delta is 2 * (1 - 3) = -4 for the first row.
  close(backward(m, forward(m, [0, 0]), 3).deltas[1][0], -4);
  assert.equal(dataLoss(m, [], []), 0);
});

test('XOR is solved by a small tanh network within a fixed epoch budget', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const m = createMlp({ layers: [2, 4, 1], activation: 'tanh', seed });
    const { history } = train({ model: m, X: XOR_X, y: XOR_Y, optimizer: 'adam', lr: 0.05, epochs: 400 });
    assert.equal(accuracy(m, XOR_X, XOR_Y), 1, `seed ${seed}`);
    assert.deepEqual(predictLabels(m, XOR_X), XOR_Y);
    assert.ok(history.loss[399] < 0.05, `seed ${seed} loss ${history.loss[399]}`);
    assert.equal(history.accuracy[399], 1);
    assert.ok(history.loss[399] < history.initialLoss);
  }
  // No hidden layer cannot do it: a straight line gets at most 3 of the 4 XOR corners.
  const lin = createMlp({ layers: [2, 1], seed: 1 });
  train({ model: lin, X: XOR_X, y: XOR_Y, optimizer: 'adam', lr: 0.05, epochs: 400 });
  assert.ok(accuracy(lin, XOR_X, XOR_Y) <= 0.75);
});

test('zeros initialisation keeps hidden units identical (the symmetry trap)', () => {
  for (const activation of ['sigmoid', 'tanh']) {
    const m = createMlp({ layers: [2, 4, 1], activation, init: 'zeros' });
    train({ model: m, X: XOR_X, y: XOR_Y, optimizer: 'sgd', lr: 0.5, epochs: 300 });
    const rows = m.weights[0];
    for (let k = 1; k < rows.length; k++) closeArr(rows[k], rows[0], 1e-12);
    closeArr(m.weights[1][0], new Array(4).fill(m.weights[1][0][0]), 1e-12);
    // Identical units act as one unit: the network is stuck below XOR.
    assert.ok(accuracy(m, XOR_X, XOR_Y) <= 0.75, activation);
  }
  // With sigmoid and unbalanced labels (OR) the weights do move away from 0, and the hidden units still move together.
  const s = createMlp({ layers: [2, 4, 1], activation: 'sigmoid', init: 'zeros' });
  train({ model: s, X: XOR_X, y: [0, 1, 1, 1], optimizer: 'sgd', lr: 0.5, epochs: 200 });
  assert.ok(Math.abs(s.weights[1][0][0]) > 0.01 && Math.abs(s.weights[0][0][0]) > 1e-4);
  for (let k = 1; k < 4; k++) closeArr(s.weights[0][k], s.weights[0][0], 1e-12);
  // A random start breaks the tie.
  const r = createMlp({ layers: [2, 4, 1], activation: 'tanh', init: 'xavier', seed: 1 });
  assert.ok(Math.abs(r.weights[0][0][0] - r.weights[0][1][0]) > 1e-6);
  // ReLU from zeros passes no gradient at all, so nothing ever moves except the output bias.
  const z = createMlp({ layers: [2, 4, 1], activation: 'relu', init: 'zeros' });
  train({ model: z, X: XOR_X, y: XOR_Y, optimizer: 'sgd', lr: 0.5, epochs: 20 });
  assert.ok(z.weights.flat(2).every(v => v === 0));
});

test('sigmoid in a deep net gives smaller gradients in the early layers than ReLU', () => {
  const { X, y } = ringData();
  for (const seed of [1, 2, 3]) {
    const sig = gradientStats(createMlp({ layers: [2, 8, 8, 8, 8, 8, 1], activation: 'sigmoid', seed }), X, y);
    const rel = gradientStats(createMlp({ layers: [2, 8, 8, 8, 8, 8, 1], activation: 'relu', seed }), X, y);
    // Early layer: ReLU's gradient is at least 10x bigger.
    assert.ok(rel[0] > 10 * sig[0], `seed ${seed}: relu ${rel[0]} vs sigmoid ${sig[0]}`);
    // Within the sigmoid net the gradient shrinks layer by layer going back; the first layer is far weaker than the last.
    assert.ok(sig[0] < sig[sig.length - 1] / 100, `seed ${seed}: sigmoid first ${sig[0]} last ${sig[sig.length - 1]}`);
    // And the same ratio is much healthier for ReLU.
    assert.ok(rel[0] / rel[rel.length - 1] > 10 * (sig[0] / sig[sig.length - 1]));
  }
});

test('train records per-epoch gradient and activation statistics a lab can plot', () => {
  const { X, y } = ringData(40, 2);
  const m = createMlp({ layers: [2, 6, 5, 1], activation: 'tanh', seed: 3 });
  const { history } = train({ model: m, X, y, optimizer: 'sgd', lr: 0.1, epochs: 7, batchSize: 10 });
  for (const key of ['loss', 'objective', 'accuracy', 'gradAbs', 'actMean', 'deadFrac']) assert.equal(history[key].length, 7, key);
  assert.ok(history.gradAbs.every(row => row.length === 3 && row.every(v => v > 0 && Number.isFinite(v))));
  assert.ok(history.actMean.every(row => row.length === 3 && row.every(Number.isFinite)));
  // The output layer's mean activation is a mean probability, so it lies in (0, 1); tanh units lie in (-1, 1).
  assert.ok(history.actMean.every(row => row[2] > 0 && row[2] < 1 && Math.abs(row[0]) < 1));
  assert.ok(history.deadFrac.every(row => row.length === 3 && row[2] === 0));
  assert.equal(m.epochsTrained, 7);
  // The recorded final loss equals a fresh evaluation, and the final stats equal activationStats now.
  close(history.loss[6], dataLoss(m, X, y));
  const now = activationStats(m, X);
  closeArr(history.actMean[6], now.actMean);
  closeArr(history.deadFrac[6], now.deadFrac);
  // With no L2, the objective is the data loss; with L2 it is bigger.
  closeArr(history.objective, history.loss);
  const pen = train({ model: createMlp({ layers: [2, 6, 5, 1], activation: 'tanh', seed: 3 }), X, y, epochs: 3, l2: 0.1 });
  assert.ok(pen.history.objective.every((o, i) => o > pen.history.loss[i]));
  // Regression has no accuracy.
  const reg = train({ model: createMlp({ layers: [2, 3, 1], task: 'regression', seed: 1 }), X, y, epochs: 2 });
  assert.deepEqual(reg.history.accuracy, [null, null]);
});

test('a ReLU unit that is off for every row shows up in deadFrac', () => {
  const X = [[1, 1], [-1, 2], [0.5, -1]];
  const m = createMlp({ layers: [2, 3, 1], activation: 'relu', weights: [[[1, 0], [0, 1], [1, 1]], [[1, 1, 1]]], biases: [[0, 0, -100], [0]] });
  const s = activationStats(m, X);
  close(s.deadFrac[0], 1 / 3);
  assert.equal(s.deadFrac[1], 0);
  // Its mean activation is 0 and it receives no gradient, so training cannot revive it.
  const before = JSON.stringify(m.weights[0][2]);
  train({ model: m, X, y: [1, 0, 1], optimizer: 'sgd', lr: 0.1, epochs: 30 });
  assert.equal(JSON.stringify(m.weights[0][2]), before);
  assert.equal(m.biases[0][2], -100);
  close(activationStats(m, X).deadFrac[0], 1 / 3);
});

test('Adam and momentum reach a lower loss than plain SGD in the same epochs', () => {
  const { X, y } = ringData();
  for (const seed of [1, 2, 3, 4]) {
    const run = optimizer => train({
      model: createMlp({ layers: [2, 8, 1], activation: 'tanh', seed }), X, y, optimizer, lr: 0.02, epochs: 150, batchSize: 16,
    }).history.loss[149];
    const sgd = run('sgd'), momentum = run('momentum'), adam = run('adam');
    assert.ok(adam < 0.5 * sgd, `seed ${seed}: adam ${adam} vs sgd ${sgd}`);
    assert.ok(momentum < 0.6 * sgd, `seed ${seed}: momentum ${momentum} vs sgd ${sgd}`);
    assert.ok(adam < 0.25, `seed ${seed}: adam ${adam}`);
  }
});

test('Adam takes a first step of about lr regardless of the gradient size', () => {
  // The bias-corrected first Adam step is lr * g / (|g| + eps), i.e. almost exactly lr in the direction of -g.
  const make = () => createMlp({ layers: [2, 2, 1], activation: 'tanh', weights: [[[1, -1], [0.5, 2]], [[0.5, -0.25]]], biases: [[0, -1], [0.1]] });
  const a = make();
  train({ model: a, X: [[2, 1]], y: [1], optimizer: 'adam', lr: 0.01, epochs: 1 });
  const b = make();
  const g = gradients(b, [[2, 1]], [1]);
  for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) {
    close(a.weights[0][k][j], b.weights[0][k][j] - 0.01 * Math.sign(g.weights[0][k][j]), 1e-6);
  }
  // SGD's step is lr * g instead.
  const s = make();
  train({ model: s, X: [[2, 1]], y: [1], optimizer: 'sgd', lr: 0.5, epochs: 1 });
  close(s.weights[1][0][0], b.weights[1][0][0] - 0.5 * g.weights[1][0][0]);
});

test('training is deterministic and can be resumed one epoch at a time', () => {
  const { X, y } = ringData(30, 8);
  const opts = { X, y, optimizer: 'adam', lr: 0.02, batchSize: 7, dropout: 0.2, l2: 0.01, seed: 11 };
  const a = createMlp({ layers: [2, 6, 1], activation: 'tanh', seed: 2 });
  const ha = train({ model: a, epochs: 6, ...opts }).history;
  const b = createMlp({ layers: [2, 6, 1], activation: 'tanh', seed: 2 });
  const hb = train({ model: b, epochs: 6, ...opts }).history;
  assert.deepEqual(a.weights, b.weights);
  assert.deepEqual(ha.loss, hb.loss);
  // Six one-epoch calls land on the same weights as one six-epoch call.
  const c = createMlp({ layers: [2, 6, 1], activation: 'tanh', seed: 2 });
  const losses = [];
  for (let i = 0; i < 6; i++) losses.push(train({ model: c, epochs: 1, ...opts }).history.loss[0]);
  assert.deepEqual(c.weights, a.weights);
  assert.deepEqual(losses, ha.loss);
  assert.equal(c.epochsTrained, 6);
  // Another seed shuffles differently.
  const d = createMlp({ layers: [2, 6, 1], activation: 'tanh', seed: 2 });
  train({ model: d, epochs: 6, ...opts, seed: 12 });
  assert.notDeepEqual(d.weights, a.weights);
  // cloneMlp is independent of the original.
  const e = cloneMlp(a);
  train({ model: e, epochs: 1, ...opts });
  assert.notDeepEqual(e.weights, a.weights);
  assert.equal(a.epochsTrained, 6);
});

test('dropout: deterministic masks, off at prediction time, and training still learns', () => {
  const { X, y } = ringData(60, 4);
  const m = createMlp({ layers: [2, 12, 1], activation: 'tanh', seed: 5 });
  const { history } = train({ model: m, X, y, optimizer: 'adam', lr: 0.02, epochs: 120, dropout: 0.3, batchSize: 20 });
  assert.ok(history.loss[119] < history.initialLoss);
  assert.ok(accuracy(m, X, y) > 0.8);
  // The prediction path never drops anything: two calls are identical.
  assert.deepEqual(predictOutput(m, X), predictOutput(m, X));
  // Dropout needs a random source, and a rate of 1 is refused.
  assert.throws(() => gradients(m, X, y, { dropout: 0.5 }), /random/);
  assert.throws(() => train({ model: m, X, y, dropout: 1 }), /dropout/);
  // With dropout the gradient of the same batch differs from the plain one, and masked units get zero gradient.
  const plain = gradients(m, X, y, { indices: [0] });
  const dropped = gradients(m, X, y, { indices: [0], dropout: 0.5, random: rng(1) });
  assert.notDeepEqual(plain.weights[0], dropped.weights[0]);
  const masked = forward(m, X[0], { masks: [new Array(12).fill(0)] });
  const back = backward(m, masked, y[0]);
  assert.ok(back.weights[0].every(row => row.every(v => v === 0)));
});

test('L2 shrinks the weights', () => {
  const { X, y } = ringData(50, 6);
  const fit = l2 => {
    const m = createMlp({ layers: [2, 8, 1], activation: 'tanh', seed: 1 });
    train({ model: m, X, y, optimizer: 'adam', lr: 0.02, epochs: 150, l2 });
    return m.weights.flat(2).reduce((s, w) => s + w * w, 0);
  };
  assert.ok(fit(0.5) < 0.5 * fit(0));
});

test('mini-batches: batchSize controls the number of updates and is clamped', () => {
  const { X, y } = ringData(10, 1);
  const m = createMlp({ layers: [2, 3, 1], seed: 1 });
  train({ model: m, X, y, optimizer: 'adam', epochs: 2, batchSize: 3 });
  assert.equal(m.optState.t, 2 * 4);
  const f = createMlp({ layers: [2, 3, 1], seed: 1 });
  train({ model: f, X, y, optimizer: 'adam', epochs: 2 });
  assert.equal(f.optState.t, 2);
  const big = createMlp({ layers: [2, 3, 1], seed: 1 });
  train({ model: big, X, y, optimizer: 'adam', epochs: 2, batchSize: 1000 });
  assert.equal(big.optState.t, 2);
  // Switching optimizer restarts the optimizer state, not the weights.
  const w = JSON.stringify(m.weights);
  train({ model: m, X, y, optimizer: 'sgd', epochs: 0 });
  assert.equal(m.optState.type, 'sgd');
  assert.equal(JSON.stringify(m.weights), w);
  assert.throws(() => train({ model: m, X, y, optimizer: 'rmsprop' }), /optimizer/);
  assert.throws(() => train({ model: m, X, y: [1] }), /same length/);
});

test('regression: a small network fits a curve', () => {
  const r = rng(3);
  const X = [], y = [];
  for (let i = 0; i < 60; i++) { const a = 2 * r() - 1, b = 2 * r() - 1; X.push([a, b]); y.push(Math.sin(2 * a) + b * b); }
  const m = createMlp({ layers: [2, 10, 1], activation: 'tanh', task: 'regression', seed: 2 });
  const before = dataLoss(m, X, y);
  const { history } = train({ model: m, X, y, optimizer: 'adam', lr: 0.02, epochs: 300, batchSize: 20 });
  assert.ok(history.loss[299] < 0.02, `mse ${history.loss[299]}`);
  assert.ok(history.loss[299] < before / 10);
});

test('predictGrid lays out decision regions like svm.js decisionGrid', () => {
  const m = createMlp({ layers: [2, 4, 1], activation: 'tanh', seed: 2 });
  train({ model: m, X: XOR_X, y: XOR_Y, optimizer: 'adam', lr: 0.05, epochs: 400 });
  const g = predictGrid(m, { xMin: -0.5, xMax: 1.5, yMin: -0.5, yMax: 1.5 }, { nx: 5, ny: 3 });
  assert.equal(g.nx, 5); assert.equal(g.ny, 3);
  assert.deepEqual(g.xs, [-0.5, 0, 0.5, 1, 1.5]);
  assert.deepEqual(g.ys, [-0.5, 0.5, 1.5]);
  assert.equal(g.values.length, 3); assert.equal(g.values[0].length, 5);
  close(g.values[1][1], forward(m, [0, 0.5]).output);
  // Corners of the XOR square land in the right regions: (0,0) is class 0, (1,0) is class 1.
  const full = predictGrid(m, { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, 2);
  assert.deepEqual(full.labels, [[0, 1], [1, 0]]);
  assert.ok(full.values.flat().every(v => v > 0 && v < 1));
  assert.throws(() => predictGrid(m, { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, 1), /at least 2/);
  assert.throws(() => predictGrid(createMlp({ layers: [3, 2, 1] }), { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, 3), /2 inputs/);
  const reg = predictGrid(createMlp({ layers: [2, 2, 1], task: 'regression' }), { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, 2);
  assert.ok(reg.labels.flat().every(v => v === null));
});

test('predictLabels thresholds, accuracy handles empty input and boolean labels', () => {
  const m = handNet();
  // out = 0.5249... at [2, 1]: class 1 at threshold 0.5, class 0 at 0.6.
  assert.deepEqual(predictLabels(m, [[2, 1]]), [1]);
  assert.deepEqual(predictLabels(m, [[2, 1]], 0.6), [0]);
  assert.equal(accuracy(m, [], []), 0);
  assert.equal(accuracy(m, [[2, 1]], [true]), 1);
  close(dataLoss(m, [[2, 1]], [true]), dataLoss(m, [[2, 1]], [1]));
});
