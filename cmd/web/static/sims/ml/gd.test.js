import test from 'node:test';
import assert from 'node:assert/strict';
import { surfaces2d, functions1d, step2d, step1d, start2d, start1d, trace2d, trace1d, contours } from './gd.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

test('analytic gradients match finite differences on every surface and function', () => {
  const h = 1e-6;
  for (const [key, s] of Object.entries(surfaces2d)) {
    for (const [x, y] of [[1, 2], [4.4, 6.1], [8, 3.3]]) {
      const g = s.grad(x, y);
      close(g.x, (s.f(x + h, y) - s.f(x - h, y)) / (2 * h), 1e-4);
      close(g.y, (s.f(x, y + h) - s.f(x, y - h)) / (2 * h), 1e-4);
    }
    assert.ok(Math.hypot(s.grad(s.minimum.x, s.minimum.y).x, s.grad(s.minimum.x, s.minimum.y).y) < 0.3 || key === 'twoValleys');
  }
  for (const f of Object.values(functions1d)) {
    for (const x of [0.5, 3.3, 7.7]) close(f.grad(x), (f.f(x + h) - f.f(x - h)) / (2 * h), 1e-4);
  }
});

test('gradient descent converges below the stable learning rate and diverges above it', () => {
  for (const key of ['bowl', 'ravine']) {
    const s = surfaces2d[key];
    const good = trace2d(s, { lr: s.maxStableLr * 0.5 }, 400).at(-1);
    assert.ok(Math.hypot(good.x - s.minimum.x, good.y - s.minimum.y) < 1e-3, `${key} converges`);
    const bad = trace2d(s, { lr: s.maxStableLr * 1.2 }, 60);
    assert.ok(bad.at(-1).loss > bad[0].loss * 10, `${key} diverges`);
  }
  const p = functions1d.parabola;
  assert.ok(trace1d(p, { lr: 1.9 }, 100).at(-1).loss < 1e-6 || Math.abs(trace1d(p, { lr: 0.5 }, 60).at(-1).x - 5) < 1e-6);
  assert.ok(trace1d(p, { lr: 2.1 }, 60).at(-1).loss > 100);
});

test('loss falls on every step for a small learning rate', () => {
  const s = surfaces2d.ravine, t = trace2d(s, { lr: 0.05 }, 50);
  for (let i = 1; i < t.length; i++) assert.ok(t[i].loss <= t[i - 1].loss + 1e-12);
});

test('steps are pure: the previous state is not mutated', () => {
  const s = surfaces2d.bowl, a = start2d(s), copy = { ...a };
  step2d(s, a, { lr: 0.1 });
  assert.deepEqual(a, copy);
  const f = functions1d.steep, b = start1d(f), copy1 = { ...b };
  step1d(f, b, { lr: 0.1 });
  assert.deepEqual(b, copy1);
});

test('momentum speeds up a ravine and the first step ignores it', () => {
  const s = surfaces2d.ravine, a = start2d(s);
  const plain = step2d(s, a, { lr: 0.05 }), withMomentum = step2d(s, a, { lr: 0.05, momentum: 0.9 });
  assert.deepEqual([plain.x, plain.y], [withMomentum.x, withMomentum.y]);
  const reach = (momentum) => trace2d(s, { lr: 0.02, momentum }, 120).findIndex(p => Math.hypot(p.x - 5, p.y - 5) < 0.2);
  assert.ok(reach(0.9) !== -1 && (reach(0) === -1 || reach(0.9) < reach(0)));
});

test('the two-valleys surface has a shallow trap: descent from the left stops short of the global minimum', () => {
  const s = surfaces2d.twoValleys;
  const end = trace2d(s, { lr: 0.05 }, 600).at(-1);
  assert.ok(end.x < 5, `stuck in the left valley at x=${end.x}`);
  const other = trace2d(s, { lr: 0.05 }, 600, { x: 8, y: 5 }).at(-1);
  assert.ok(other.x > 5 && other.loss < end.loss, 'the right valley is lower');
});

test('contours: every segment endpoint sits on its level', () => {
  const f = surfaces2d.bowl.f;
  const sets = contours(f, [4, 16], 80);
  for (const { level, segments } of sets) {
    assert.ok(segments.length > 10);
    for (const [a, b] of segments) for (const p of [a, b]) close(f(p.x, p.y), level, 0.35);
  }
});
