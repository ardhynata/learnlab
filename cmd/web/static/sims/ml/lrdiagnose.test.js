import test from 'node:test';
import assert from 'node:assert/strict';
import { functions1d } from './gd.js';
import {
  runTrace, blownUp, BLOWUP, diagnose, globalMinimum,
  lrFromPos, posFromLr, LR_POSITIONS, presets, PRESET_NAMES, lossAxis, cutAtLossFloor, LOSS_FLOOR, LOG_AUTO_LOSS,
} from './lrdiagnose.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);
const { parabola, steep, wiggly } = functions1d;
const verdict = (fn, opts, steps, at) => diagnose(runTrace(fn, opts, steps, at), fn).verdict;

test('worked example: each step multiplies the distance to the minimum by (1 - lr)', () => {
  // f(x) = (x - 5)^2 / 2 from x = 1, so the distance starts at -4.
  const expected = {
    0.5: [3, 4, 4.5, 4.75],
    1.9: [8.6, 1.76, 7.916, 2.3756],
    2.0: [9, 1, 9, 1],
    2.1: [9.4, 0.16, 10.324, -0.8564],
  };
  for (const [lr, xs] of Object.entries(expected)) {
    const t = runTrace(parabola, { lr: Number(lr) }, 4);
    assert.equal(t.length, 5);
    xs.forEach((x, i) => close(t[i + 1].x, x, 1e-9));
    for (let i = 1; i < t.length; i++) close((t[i].x - 5) / (t[i - 1].x - 5), 1 - Number(lr), 1e-9);
  }
});

test('a parabola is stable exactly below 2 / curvature (steep parabola: curvature 6, limit 1/3)', () => {
  const dist = (fn, lr) => Math.abs(runTrace(fn, { lr }, 200).at(-1).x - 5);
  close(dist(parabola, 1.99), 4 * Math.pow(0.99, 200), 1e-6); // factor -0.99 per step: shrinks, but slowly
  close(dist(parabola, 2), 4, 1e-9);        // exactly 2: bounces between 1 and 9 forever
  assert.ok(dist(parabola, 2.01) > 4, 'just over 2 grows');
  close(dist(steep, 0.33), 3.5 * Math.pow(0.98, 200), 1e-6); // factor 1 - 6 * 0.33 = -0.98
  assert.ok(dist(steep, 0.34) > 3.5, 'just over 1/3 grows');
  close(dist(steep, 1 / 3), 3.5, 1e-6);     // exactly 1/3: factor -1 from the start 1.5 (distance 3.5)
});

test('runTrace is trace1d until the run explodes, then it stops with a finite last state', () => {
  const ok = runTrace(parabola, { lr: 0.5 }, 30);
  assert.equal(ok.length, 31);
  assert.equal(blownUp(ok), false);
  const bad = runTrace(steep, { lr: 2.5 }, 200);
  assert.ok(bad.length < 200 && Number.isFinite(bad.at(-1).loss) && blownUp(bad));
  assert.ok(bad.at(-1).loss > BLOWUP);
  const cubic = runTrace(wiggly, { lr: 2.5 }, 200);
  assert.ok(cubic.every(s => Number.isFinite(s.loss)) && blownUp(cubic));
});

test('diagnose: one verdict per behaviour on the plain parabola', () => {
  assert.equal(verdict(parabola, { lr: 0.01 }, 40), 'slow');
  assert.equal(verdict(parabola, { lr: 0.5 }, 40), 'converging');
  assert.equal(verdict(parabola, { lr: 0.5 }, 5), 'converging');
  assert.equal(verdict(parabola, { lr: 1.9 }, 40), 'oscillating');
  assert.equal(verdict(parabola, { lr: 2.0 }, 40), 'oscillating');
  assert.equal(verdict(parabola, { lr: 2.2 }, 40), 'diverging');
  assert.equal(verdict(parabola, { lr: 2.1 }, 6), 'diverging');
});

test('diagnose: the two-dip curve traps plain descent from its start, and starting right escapes', () => {
  const t = runTrace(wiggly, { lr: 0.1 }, 60);
  const d = diagnose(t, wiggly);
  assert.equal(d.verdict, 'stuck');
  assert.match(d.reason, /2\.15/);
  assert.match(d.reason, /8\.13/);
  assert.equal(verdict(wiggly, { lr: 0.1 }, 60, 8), 'converging');
  assert.equal(verdict(wiggly, { lr: 0.1 }, 60, 6), 'converging');
});

test('momentum can carry the two-dip run over the hump into the deeper dip', () => {
  const end = runTrace(wiggly, { lr: 0.7, momentum: 0.9 }, 200).at(-1);
  assert.ok(Math.abs(end.x - globalMinimum(wiggly).x) < 0.05, `ended at ${end.x}`);
  const plain = runTrace(wiggly, { lr: 0.7 }, 200).at(-1);
  assert.ok(plain.x < 3);
});

test('diagnose: momentum swinging past the bottom reads as oscillating, with rising loss on some steps', () => {
  const t = runTrace(parabola, { lr: 0.1, momentum: 0.9 }, 30);
  assert.ok(t.some((s, i) => i && s.loss > t[i - 1].loss), 'loss rises on some steps');
  const d = diagnose(t, parabola);
  assert.equal(d.verdict, 'oscillating');
  assert.match(d.reason, /overshooting/);
});

test('diagnose: a run that has not started, or has one or two steps, is not judged', () => {
  for (const steps of [0, 1, 2]) assert.equal(verdict(parabola, { lr: 2.2 }, steps), 'start');
});

test('diagnose does not mutate its input', () => {
  const t = runTrace(parabola, { lr: 1.9 }, 20), copy = JSON.stringify(t);
  diagnose(t, parabola);
  assert.equal(JSON.stringify(t), copy);
});

test('globalMinimum finds the true lowest point, which is not the approximate one gd.js stores for the two-dip curve', () => {
  close(globalMinimum(parabola).x, 5, 1e-6);
  const g = globalMinimum(wiggly);
  close(g.x, 8.13, 0.01);
  assert.ok(Math.abs(wiggly.grad(g.x)) < 1e-6);
  assert.ok(g.loss < wiggly.f(2.15));
});

test('learning-rate slider: log scale from 0.001 to 2.5, two significant digits, and it round-trips', () => {
  assert.equal(lrFromPos(0), 0.001);
  assert.equal(lrFromPos(LR_POSITIONS), 2.5);
  for (let p = 1; p <= LR_POSITIONS; p++) assert.ok(lrFromPos(p) >= lrFromPos(p - 1));
  // Equal slider distances are equal ratios: one third of the way is a factor of 2500^(1/3), about 13.6.
  close(lrFromPos(100) / lrFromPos(0), Math.pow(2500, 1 / 3), 1);
  for (const lr of [0.01, 0.03, 0.1, 0.3, 0.5, 1.8, 1.9, 2.0, 2.1, 2.2]) assert.equal(lrFromPos(posFromLr(lr)), lr, `${lr} is reachable`);
});

test('every preset button does what its name says on its function (the two-dip "Just right" is stuck by design)', () => {
  const want = {
    parabola: { tooSmall: 'slow', justRight: 'converging', tooBig: 'diverging', overshooting: 'oscillating' },
    steep: { tooSmall: 'slow', justRight: 'converging', tooBig: 'diverging', overshooting: 'oscillating' },
    wiggly: { tooSmall: 'slow', justRight: 'stuck', tooBig: 'diverging', overshooting: 'oscillating' },
  };
  for (const [key, fn] of Object.entries(functions1d)) {
    for (const name of PRESET_NAMES) {
      const p = presets[key][name];
      assert.equal(lrFromPos(posFromLr(p.lr)), p.lr, `${key} ${name} lr reachable`);
      assert.equal(verdict(fn, p, 40), want[key][name], `${key} ${name}`);
    }
  }
});

test('lossAxis: five whole-number steps that cover the whole curve on x in 0..10', () => {
  assert.deepEqual(lossAxis(parabola), { step: 3, top: 15 });   // largest loss 12.5 at the edges
  assert.deepEqual(lossAxis(steep), { step: 15, top: 75 });     // 3 * 5^2 = 75
  assert.deepEqual(lossAxis(wiggly), { step: 2, top: 10 });     // largest loss 8.12 at x = 0
});

test('diagnose: a tiny learning rate crawling down a slope is slow, not stuck, even when each step is below 0.001', () => {
  // Two dips, lr 0.002 from x = 1: after 400 steps x = 1.85 and the slope there is still about -0.43,
  // so the run has not stopped, it is only slow. The real dip is at x = 2.15.
  const t = runTrace(wiggly, { lr: 0.002 }, 400);
  close(t.at(-1).x, 1.85, 0.01);
  assert.ok(Math.abs(wiggly.grad(t.at(-1).x)) > 0.4);
  assert.ok(Math.abs(t.at(-1).x - t.at(-2).x) < 1e-3, 'each step is tiny');
  assert.equal(diagnose(t, wiggly).verdict, 'slow');
});

test('diagnose: a smooth approach is "settling", and only a sign-flipping approach is "wobbling"', () => {
  // Parabola, lr 0.5, four steps: x = 3, 4, 4.5, 4.75 (hand check), the distance halving without changing side.
  const smooth = diagnose(runTrace(parabola, { lr: 0.5 }, 4), parabola);
  assert.equal(smooth.verdict, 'converging');
  assert.match(smooth.reason, /settling/);
  assert.doesNotMatch(smooth.reason, /wobbling/);
  // Momentum 0.9 at rate 0.1 swings across the bottom (the sign of the move flips) while already close to it.
  const waves = diagnose(runTrace(parabola, { lr: 0.1, momentum: 0.9 }, 60), parabola);
  assert.equal(waves.verdict, 'converging');
  assert.match(waves.reason, /wobbling/);
});

test('diagnose: while a momentum run plays, the verdict does not flicker once the swings begin', () => {
  // Parabola, rate 0.1, momentum 0.9: the loss swings in waves whose troughs dip close to zero.
  // From step 7 the verdict is "oscillating" until the loss has stayed low for a stretch, then "converging" for good.
  const t = runTrace(parabola, { lr: 0.1, momentum: 0.9 }, 80);
  const seq = [];
  for (let n = 7; n <= 80; n++) seq.push(diagnose(t.slice(0, n + 1), parabola).verdict);
  assert.equal(seq[0], 'oscillating');
  assert.equal(seq.at(-1), 'converging');
  const changes = seq.filter((v, i) => i && v !== seq[i - 1]).length;
  assert.equal(changes, 1, `verdicts: ${seq.join(' ')}`);
  // The two troughs that used to read "converging" (steps 15 and 25) now read "oscillating".
  assert.equal(diagnose(t.slice(0, 16), parabola).verdict, 'oscillating');
  assert.equal(diagnose(t.slice(0, 26), parabola).verdict, 'oscillating');
});

test('cutAtLossFloor stops a log-chart run at its first step at or below the floor', () => {
  const run = runTrace(parabola, { lr: 0.5 }, 30, 10);
  const cut = cutAtLossFloor(run);
  assert.ok(cut.length < run.length, 'a run that reaches zero is shortened');
  assert.ok(cut.at(-1).loss <= LOSS_FLOOR);
  assert.ok(cut.slice(0, -1).every(s => s.loss > LOSS_FLOOR), 'only the last kept step is at the floor');
  assert.deepEqual(cut, run.slice(0, cut.length));
  const slow = runTrace(parabola, { lr: 0.01 }, 30, 10);
  assert.equal(cutAtLossFloor(slow), slow, 'a run that never reaches the floor is left alone');
  assert.deepEqual(cutAtLossFloor([{ loss: 0 }, { loss: 0 }]), [{ loss: 0 }], 'exact zero counts');
  assert.equal(cutAtLossFloor([{ loss: Infinity }, { loss: NaN }]).length, 2, 'blown-up runs are not mistaken for the floor');
});

test('the lab hint points to the "Too big" preset as the run that switches the loss chart to a log axis', () => {
  // Default run length is 30 steps. "Overshooting" only oscillates, so it must NOT be the one the hint names.
  for (const [key, fn] of Object.entries(functions1d)) {
    const peak = preset => Math.max(...runTrace(fn, presets[key][preset], 30, fn.start).map(s => s.loss));
    assert.ok(peak('tooBig') > LOG_AUTO_LOSS, `${key}: tooBig peaks at ${peak('tooBig')}`);
    assert.ok(peak('overshooting') <= LOG_AUTO_LOSS, `${key}: overshooting stays under the threshold`);
  }
});
