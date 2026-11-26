import test from 'node:test';
import assert from 'node:assert/strict';
import { mainLayout, windowAtPoint, niceMax, DEFAULTS } from './forecast-lab.js';
import { STEPS, normalize, buildSeries, planBacktest, runModel } from '../ml/forecastlab.js';

test('the defaults are already inside every range the lab allows', () => {
  assert.deepEqual(normalize(DEFAULTS), DEFAULTS);
});

test('mainLayout puts the series chart above one lane row per window, and maps steps to pixels both ways', () => {
  const L = mainLayout(800, 600, 8, 110);
  assert.ok(L.top.y1 < L.lane.y0 && L.lane.y1 <= 600 - L.m.b);
  assert.equal(L.laneH, 8 * L.rowH + 8);
  assert.ok(L.X(110) > L.x0 && L.X(STEPS - 1) < L.x1, 'every step on the axis sits inside the plot');
  assert.equal(L.time(L.X(200)), 200);
  assert.equal(L.time(L.X(110)), 110);
  assert.ok(L.edge(150) < L.X(150) && L.X(150) < L.edge(151));
});

test('windowAtPoint: a lane row wins, then the window holding the time, then the nearest centre', () => {
  const p = normalize({}), y = buildSeries(p).y, plan = planBacktest(p);
  const windows = runModel(y, 'naive', p, plan);
  const L = mainLayout(900, 700, windows.length, plan.firstOrigin - 40);
  const row = 5;
  assert.equal(windowAtPoint(L, windows, L.x0 + 10, L.lane.y0 + 4 + row * L.rowH + L.rowH / 2), row);
  const w = windows[3], mid = (w.testStart + w.testEnd) / 2;
  assert.equal(windowAtPoint(L, windows, L.X(mid), L.top.y0 + 20), 3);
  // Before the first window: the nearest centre is the first window.
  assert.equal(windowAtPoint(L, windows, L.X(plan.firstOrigin - 20), L.top.y0 + 20), 0);
  assert.equal(windowAtPoint(L, windows, L.x0 - 30, L.top.y0 + 20), -1);
  assert.equal(windowAtPoint(L, [], L.x0 + 10, 10), -1);
});

test('niceMax rounds an axis limit up to a round number', () => {
  assert.equal(niceMax(3.3), 4);
  assert.equal(niceMax(0.07), 0.08);
  assert.equal(niceMax(12), 15);
  assert.equal(niceMax(0), 1);
  assert.equal(niceMax(Infinity), 1);
});
