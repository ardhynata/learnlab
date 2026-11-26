import test from 'node:test';
import assert from 'node:assert/strict';
import { surfaces2d, trace2d, step2d, start2d } from './gd.js';
import { gradSize, verdict, contourLevels, surfaceContours, twoValleysLimits, divergedAtOf, runFinished, DIVERGE_EXTRA_STEPS } from './gdview.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

test('gradient size on the bowl start is hand-computable: gradient (-7, 6), length sqrt(85)', () => {
  const s = surfaces2d.bowl;
  close(gradSize(s, s.start), Math.sqrt(85));
  close(gradSize(s, s.minimum), 0);
  // Two plain steps at 0.25: (1.5, 8) -> (3.25, 6.5) -> (4.125, 5.75).
  const t = trace2d(s, { lr: 0.25 }, 2);
  close(t[2].x, 4.125); close(t[2].y, 5.75);
  close(gradSize(s, t[2]), Math.hypot(-1.75, 1.5));
});

test('verdict: the bowl at lr 0.25 starts descending and ends converged', () => {
  const s = surfaces2d.bowl;
  const t = trace2d(s, { lr: 0.25 }, 3);
  assert.equal(verdict(s, t).status, 'descending');
  const long = trace2d(s, { lr: 0.25 }, 30);
  const v = verdict(s, long);
  assert.equal(v.status, 'converged');
  assert.equal(v.nearMinimum, true);
  // Distance to the minimum halves every step, so the gradient size is sqrt(85) / 2^t.
  const steps = Math.ceil(Math.log2(Math.sqrt(85) / 0.05));
  assert.equal(steps, 8);
  assert.equal(verdict(s, trace2d(s, { lr: 0.25 }, steps - 1)).status, 'descending');
  assert.equal(verdict(s, trace2d(s, { lr: 0.25 }, steps)).status, 'converged');
});

test('verdict: a learning rate past the stable limit diverges', () => {
  for (const key of ['bowl', 'ravine']) {
    const s = surfaces2d[key];
    const t = trace2d(s, { lr: s.maxStableLr * 1.3 }, 40);
    let i = 1;
    while (i < t.length && verdict(s, t.slice(0, i + 1)).status !== 'diverging') i++;
    assert.ok(i < t.length, `${key} is called diverging`);
    assert.ok(i <= 20, `${key} is called diverging within 20 steps (took ${i})`);
  }
  assert.equal(verdict(surfaces2d.bowl, [{ x: 1, y: 1, vx: 0, vy: 0, loss: Infinity }]).status, 'diverging');
  assert.equal(verdict(surfaces2d.bowl, [{ x: 1, y: 1, vx: 0, vy: 0, loss: NaN }]).status, 'diverging');
});

test('verdict: a step size of exactly 1 / curvature hops across the bowl forever (bouncing)', () => {
  const s = surfaces2d.bowl;
  const t = trace2d(s, { lr: s.maxStableLr }, 60);
  assert.equal(verdict(s, t.slice(0, 10)).status, 'descending');
  assert.equal(verdict(s, t).status, 'bouncing');
});

test('verdict: the ravine zigzags and converges at lr 0.14, and a tiny lr is still descending', () => {
  const s = surfaces2d.ravine;
  const t = trace2d(s, { lr: 0.14 }, 200);
  assert.equal(verdict(s, t).status, 'converged');
  // y error shrinks by 1 - 12 * 0.14 = -0.68 each step: the sign flips every step (the zigzag).
  for (let i = 1; i < 12; i++) assert.ok((t[i].y - 5) * (t[i - 1].y - 5) < 0, `y crosses the valley floor at step ${i}`);
  const slow = trace2d(s, { lr: 0.003 }, 120);
  assert.equal(verdict(s, slow).status, 'descending');
});

test('verdict: a heavy ball that is still wobbling but shrinking is not "bouncing"', () => {
  const s = surfaces2d.ravine;
  for (let n = 41; n <= 300; n += 7) assert.notEqual(verdict(s, trace2d(s, { lr: 0.05, momentum: 0.9 }, n)).status, 'bouncing', `at ${n} steps`);
  assert.equal(verdict(s, trace2d(s, { lr: 0.05, momentum: 0.9 }, 300)).status, 'converged');
  // A very slow, steady crawl on two valleys is not bouncing either (the loss is nearly flat but the path does not reverse).
  const v = surfaces2d.twoValleys;
  for (const n of [100, 227, 500]) assert.equal(verdict(v, trace2d(v, { lr: 0.003 }, n)).status, 'descending', `at ${n} steps`);
  // Hopping with a constant swing, in the ravine's steep direction, is.
  assert.equal(verdict(s, trace2d(s, { lr: 1 / 6 }, 80)).status, 'bouncing');
});

test('verdict: two valleys can converge on a point that is not the minimum', () => {
  const s = surfaces2d.twoValleys;
  const left = verdict(s, trace2d(s, { lr: 0.1 }, 600));
  assert.equal(left.status, 'converged');
  assert.equal(left.nearMinimum, false);
  const right = verdict(s, trace2d(s, { lr: 0.1 }, 600, { x: 8, y: 5 }));
  assert.equal(right.status, 'converged');
  assert.equal(right.nearMinimum, true);
});

test('contour levels are equally spaced, above the lowest loss, and not too many', () => {
  for (const s of Object.values(surfaces2d)) {
    const { step, levels } = contourLevels(s.f);
    assert.ok(levels.length >= 5 && levels.length <= 14, `${s.name}: ${levels.length} levels`);
    for (let i = 1; i < levels.length; i++) close(levels[i] - levels[i - 1], step, 1e-9);
    assert.ok(levels[0] > s.f(s.minimum.x, s.minimum.y) - 1e-9);
  }
  // Bowl: f = r^2, 90th percentile about 30, so the step is a nice 2.5 or 5.
  const { step } = contourLevels(surfaces2d.bowl.f);
  assert.ok([2.5, 5].includes(step));
});

test('surfaceContours gives drawable segments for every level', () => {
  const { sets } = surfaceContours(surfaces2d.ravine);
  assert.ok(sets.length >= 5);
  for (const set of sets) assert.ok(set.segments.length > 10);
});

// The learning-rate limits quoted in the lab's Two valleys note, checked against the surface itself:
// the same rule as the lab (stop once the verdict is not "descending"), plain gradient descent, starts over 0..10.
function twoValleysOutcome(lr, at) {
  const s = surfaces2d.twoValleys;
  let cur = start2d(s, at);
  const trace = [cur];
  for (let i = 0; i < 500 && verdict(s, trace).status === 'descending'; i++) { cur = step2d(s, cur, { lr }); trace.push(cur); }
  return { status: verdict(s, trace).status, x: cur.x };
}
function farStarts(lr) {
  let hopped = 0, blown = 0;
  for (let x = 0; x <= 4; x += 0.1) for (let y = 0; y <= 10; y += 1) {
    const r = twoValleysOutcome(lr, { x, y });
    if (r.status === 'diverging') blown++; else if (r.x > 5) hopped++;
  }
  return { hopped, blown };
}

test('two valleys: the quoted limits match the surface (hop above 0.3, blow up above 0.5, near limit 0.77)', () => {
  const { nearLr, hopLr, blowLr } = twoValleysLimits;
  // Far-away starts left of the saddle stay in the shallow valley below the hop limit and cross it above.
  assert.equal(farStarts(0.25).hopped, 0);
  assert.ok(farStarts(hopLr).hopped > 0, 'some far starts hop at 0.3');
  // Nothing blows up at 0.5; some far starts do at 0.55.
  assert.equal(farStarts(blowLr).blown, 0);
  assert.ok(farStarts(0.55).blown > 0, 'some far starts blow up at 0.55');
  // Near the deep minimum the limit is 2 / curvature (the curvature there is about 2.58).
  const deep = { x: 7.51 + 0.2, y: 5.3 };
  assert.equal(twoValleysOutcome(nearLr - 0.05, deep).status, 'converged');
  assert.notEqual(twoValleysOutcome(nearLr + 0.1, deep).status, 'converged', 'past 0.77 it no longer settles');
});

test('a diverging run goes on for a few steps after it is first called diverging, then stops', () => {
  const s = surfaces2d.bowl;
  let state = { ...start2d(s), divergedAt: null };
  state.info = verdict(s, [state]);
  const trace = [state];
  let steps = 0;
  while (!runFinished(state, 500) && steps < 100) {
    const cur = step2d(s, state, { lr: 2 });
    trace.push(cur);
    const info = verdict(s, trace);
    state = { ...cur, info, divergedAt: divergedAtOf(state.divergedAt, info, cur.t) };
    steps++;
  }
  assert.equal(state.info.status, 'diverging');
  assert.equal(state.divergedAt, 1, 'the bowl at lr 2 is called diverging on step 1');
  assert.equal(state.t, 1 + DIVERGE_EXTRA_STEPS);
  // Converged and bouncing runs stop at once; the step cap still wins.
  assert.equal(runFinished({ t: 5, info: { status: 'converged' } }, 500), true);
  assert.equal(runFinished({ t: 5, info: { status: 'descending' } }, 500), false);
  assert.equal(runFinished({ t: 500, info: { status: 'descending' } }, 500), true);
  assert.equal(runFinished({ t: 3, info: { status: 'diverging' }, divergedAt: 3 }, 500), false);
  assert.equal(divergedAtOf(4, { status: 'descending' }, 9), 4);
  assert.equal(divergedAtOf(null, { status: 'descending' }, 9), null);
  assert.equal(divergedAtOf(null, { status: 'diverging' }, 9), 9);
});
