// Gradient descent on small, named loss surfaces, for the Optimization labs.
//
// 2-D surfaces live on the same 0..10 square the labs draw. 1-D functions live on x in 0..10.
// Every surface carries its analytic gradient, so the labs and the tests never differentiate numerically.
// `maxStableLr` is the largest learning rate for which plain gradient descent still converges
// (2 / the largest curvature) -- past it the iterates grow instead of shrinking.

const sq = v => v * v;

export const surfaces2d = {
  bowl: {
    name: 'Round bowl', minimum: { x: 5, y: 5 }, start: { x: 1.5, y: 8 },
    f: (x, y) => sq(x - 5) + sq(y - 5),
    grad: (x, y) => ({ x: 2 * (x - 5), y: 2 * (y - 5) }),
    maxStableLr: 1, // curvature 2 in both directions
  },
  ravine: {
    name: 'Narrow ravine', minimum: { x: 5, y: 5 }, start: { x: 1, y: 8.5 },
    f: (x, y) => sq(x - 5) / 2 + 6 * sq(y - 5),
    grad: (x, y) => ({ x: x - 5, y: 12 * (y - 5) }),
    maxStableLr: 2 / 12,
  },
  // Two valleys: a shallow local minimum and a deeper global one.
  twoValleys: {
    name: 'Two valleys', minimum: { x: 7.45, y: 5 }, start: { x: 2.2, y: 6.2 },
    f: (x, y) => 0.05 * sq(sq(x - 5) - 6) + 0.5 * sq(y - 5) - 0.15 * (x - 5),
    grad: (x, y) => ({ x: 0.05 * 2 * (sq(x - 5) - 6) * 2 * (x - 5) - 0.15, y: y - 5 }),
    maxStableLr: 0.25,
  },
};

export const functions1d = {
  parabola: { name: 'Parabola', f: x => sq(x - 5) / 2, grad: x => x - 5, minimum: 5, start: 1, maxStableLr: 2 },
  steep: { name: 'Steep parabola', f: x => 3 * sq(x - 5), grad: x => 6 * (x - 5), minimum: 5, start: 1.5, maxStableLr: 1 / 3 },
  // A shallow dip near x = 2.1 and the deeper one near x = 7.9.
  wiggly: {
    name: 'Two dips', f: x => 0.02 * sq(sq(x - 5) - 9) - 0.2 * (x - 5) + 2,
    grad: x => 0.02 * 2 * (sq(x - 5) - 9) * 2 * (x - 5) - 0.2, minimum: 7.9, start: 1, maxStableLr: 0.2,
  },
};

// One update of gradient descent with optional momentum. `state` is {x, y?, vx, vy?}; the
// result is a new state (never a mutation), so a lab can keep a history for Previous step.
//   v <- momentum * v - lr * grad;   x <- x + v
export function step2d(surface, state, { lr, momentum = 0 }) {
  const g = surface.grad(state.x, state.y);
  const vx = momentum * state.vx - lr * g.x, vy = momentum * state.vy - lr * g.y;
  const x = state.x + vx, y = state.y + vy;
  return { x, y, vx, vy, loss: surface.f(x, y), t: state.t + 1 };
}

export function start2d(surface, at = surface.start) {
  return { x: at.x, y: at.y, vx: 0, vy: 0, loss: surface.f(at.x, at.y), t: 0 };
}

export function step1d(fn, state, { lr, momentum = 0 }) {
  const v = momentum * state.v - lr * fn.grad(state.x);
  const x = state.x + v;
  return { x, v, loss: fn.f(x), t: state.t + 1 };
}

export function start1d(fn, at = fn.start) { return { x: at, v: 0, loss: fn.f(at), t: 0 }; }

// Runs `steps` updates and returns every state, start included.
export function trace2d(surface, opts, steps, at) {
  const out = [start2d(surface, at)];
  for (let i = 0; i < steps; i++) out.push(step2d(surface, out.at(-1), opts));
  return out;
}
export function trace1d(fn, opts, steps, at) {
  const out = [start1d(fn, at)];
  for (let i = 0; i < steps; i++) out.push(step1d(fn, out.at(-1), opts));
  return out;
}

// Contour polylines of f over the 0..10 square by marching squares, for drawing loss surfaces.
// Returns [{ level, segments: [[{x,y},{x,y}], ...] }].
export function contours(f, levels, n = 60) {
  const h = 10 / n;
  const grid = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => f(j * h, i * h)));
  return levels.map(level => {
    const segments = [];
    const lerp = (a, b, va, vb) => (a + (b - a) * ((level - va) / (vb - va)));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = [grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]];
        const x0 = j * h, y0 = i * h;
        const edge = k => {
          const [a, b] = [[0, 1], [1, 2], [3, 2], [0, 3]][k];
          const pts = [[x0, y0], [x0 + h, y0], [x0 + h, y0 + h], [x0, y0 + h]];
          return { x: lerp(pts[a][0], pts[b][0], v[a], v[b]), y: lerp(pts[a][1], pts[b][1], v[a], v[b]) };
        };
        const hit = [0, 1, 2, 3].filter(k => { const [a, b] = [[0, 1], [1, 2], [3, 2], [0, 3]][k]; return (v[a] < level) !== (v[b] < level); });
        for (let k = 0; k + 1 < hit.length; k += 2) segments.push([edge(hit[k]), edge(hit[k + 1])]);
      }
    }
    return { level, segments };
  });
}
