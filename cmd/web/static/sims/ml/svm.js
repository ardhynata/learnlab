// Support vector machine for the "Support vector machines" module. A pure,
// deterministic trainer (SMO with libsvm's second-order working-set choice and bias rule) for numeric features and binary labels in {-1, +1},
// tested in svm.test.js.
//
// API
//   trainSvm(X, y, { kernel, C, gamma, tol, maxIter })
//       X: array of feature rows (any number of features), y: labels, each exactly -1 or +1.
//       Both classes must be present. Options:
//         kernel     "linear" (default) or "rbf".
//         C          soft-margin penalty (default 1). Small C tolerates margin violations and gives
//                    a wide, forgiving margin; large C punishes every violation and gives a narrow
//                    margin that bends to fit the outliers. Infinity is accepted (hard margin).
//         gamma      RBF width, K(a, b) = exp(-gamma * |a - b|^2). Default 1 / number of features.
//                    Small gamma = smooth, nearly linear boundary; large gamma = each training
//                    point gets its own small bump (memorises, overfits). Ignored for "linear".
//         tol        stop when the KKT gap (how far the worst pair of points is from optimal) is
//                    below this (default 1e-3). maxIter: hard cap on SMO steps (default 50000).
//       There is no randomness: the same data and options always give the same model.
//       Returns a model:
//         kernel, C, gamma     the options in force.
//         alphas               Lagrange multipliers, one per training row, each in [0, C].
//         b                    bias.
//         supportIndices       rows with alpha above 1e-5 * C, capped at 1e-6 (the support vectors), ascending.
//         supportVectors       those rows of X.
//         decision(x)          signed score  sum_i alpha_i * y_i * K(x_i, x) + b.  Zero is the
//                              boundary; +1 and -1 are the margin lines (for the linear kernel
//                              that is exact in the hard-margin limit).
//         predict(x)           +1 when decision(x) >= 0, otherwise -1.
//         w                    linear kernel only: the weight vector sum_i alpha_i * y_i * x_i,
//                              so decision(x) = w . x + b. null for rbf.
//         margin()             linear kernel only: the street width between the two margin lines,
//                              2 / |w|. null for rbf.
//         iterations           SMO steps used (diagnostic).
//   decisionGrid(model, bounds, steps)
//       Evaluate model.decision on a regular grid over the first two features, for drawing the
//       regions and the boundary. bounds { xMin, xMax, yMin, yMax }; steps is a number (same in
//       both directions) or { nx, ny }, at least 2 each, counting grid points.
//       Returns { xs, ys, values, labels, nx, ny } where values[j][i] = decision at (xs[i], ys[j])
//       and labels[j][i] = its sign (+1 / -1). Only meaningful for a model trained on 2 features.
//   svmAccuracy(model, X, y)   fraction of rows classified correctly.
//   makeRings(n, { innerRadius, outerRadius, noise, seed })
//       Two classes on concentric rings, a layout no straight line can separate: label -1 on the
//       inner ring, +1 on the outer, n points each, with radial noise. Returns { X, y }.
//       Defaults: innerRadius 1, outerRadius 3, noise 0.15, seed 1.
//
// Standardisation is the CALLER's job. The RBF kernel and the margin both measure plain distance,
// so a feature in thousands drowns one in tenths. Standardise every feature (mean 0, spread 1,
// with the training rows' mean and spread only) before calling trainSvm; sims/ml/scale.js does it.
import { rng } from './rng.js';  // makeRings only

const TAU = 1e-12;

// A multiplier within rounding of 0 or C is exactly 0 or C, so the box checks above are exact.
function settle(a, C) {
  if (a < 1e-12) return 0;
  if (Number.isFinite(C) && a > C - 1e-12 * C) return C;
  return a;
}

function checkInputs(X, y, opts) {
  if (!Array.isArray(X) || X.length < 2) throw new Error('trainSvm needs at least two rows');
  if (!Array.isArray(y) || y.length !== X.length) throw new Error('trainSvm needs one label per row');
  const d = X[0].length;
  if (!(d >= 1)) throw new Error('trainSvm needs at least one feature');
  for (const row of X) {
    if (row.length !== d) throw new Error('trainSvm needs rows of equal length');
    for (const v of row) if (!Number.isFinite(v)) throw new Error('trainSvm needs finite features');
  }
  let pos = 0, neg = 0;
  for (const label of y) {
    if (label === 1) pos++;
    else if (label === -1) neg++;
    else throw new Error('trainSvm labels must be -1 or +1');
  }
  if (!pos || !neg) throw new Error('trainSvm needs both classes');
  if (opts.kernel !== 'linear' && opts.kernel !== 'rbf') throw new Error('kernel must be "linear" or "rbf"');
  if (!(opts.C > 0)) throw new Error('C must be positive');
  if (!(opts.gamma > 0)) throw new Error('gamma must be positive');
  return d;
}

function makeKernel(kind, gamma) {
  if (kind === 'linear') {
    return (a, b) => { let s = 0; for (let k = 0; k < a.length; k++) s += a[k] * b[k]; return s; };
  }
  return (a, b) => {
    let s = 0;
    for (let k = 0; k < a.length; k++) { const t = a[k] - b[k]; s += t * t; }
    return Math.exp(-gamma * s);
  };
}

export function trainSvm(X, y, options = {}) {
  const d0 = X && X[0] ? X[0].length : 0;
  const opts = {
    kernel: 'linear', C: 1, gamma: 1 / (d0 || 1), tol: 1e-3, maxIter: 50000,
    ...options,
  };
  const d = checkInputs(X, y, opts);
  const { kernel, C, gamma, tol, maxIter } = opts;
  const n = X.length;
  const k = makeKernel(kernel, gamma);

  // Precompute the kernel (Gram) matrix: n is small in a classroom lab.
  const K = X.map((a, i) => {
    const row = new Array(n);
    for (let j = 0; j < n; j++) row[j] = j < i ? 0 : k(a, X[j]);
    return row;
  });
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) K[i][j] = K[j][i];

  // SMO with the second-order working-set choice of libsvm. The state G[t] = y_t * f0(t) - 1 is
  // the gradient of the dual objective, where f0(t) = sum_j alpha_j y_j K(j, t) is the score
  // without the bias. A point can still move up when it is in I_up (class +1 below C, class -1 above 0)
  // and down when it is in I_low (class +1 above 0, class -1 below C). At the optimum
  // max over I_up of (-y G) is no larger than min over I_low of (-y G): that gap is the KKT gap, and the
  // loop stops when it is under tol. Unlike a quiet-sweeps rule this is a real optimality check.
  const alphas = new Array(n).fill(0);
  const G = new Array(n).fill(-1);
  const up = t => (y[t] === 1 ? alphas[t] < C : alphas[t] > 0);
  const low = t => (y[t] === 1 ? alphas[t] > 0 : alphas[t] < C);

  let iterations = 0;
  while (iterations < maxIter) {
    // i: the point in I_up that violates optimality the most.
    let i = -1, gmax = -Infinity;
    for (let t = 0; t < n; t++) if (up(t) && -y[t] * G[t] > gmax) { gmax = -y[t] * G[t]; i = t; }
    if (i < 0) break;
    // j: the partner in I_low that lowers the dual objective the most (second order), and the gap.
    let j = -1, gmin = Infinity, best = Infinity;
    for (let t = 0; t < n; t++) {
      if (!low(t)) continue;
      const v = -y[t] * G[t];
      if (v < gmin) gmin = v;
      const diff = gmax - v;
      if (diff <= 0) continue;
      const quad = Math.max(K[i][i] + K[t][t] - 2 * K[i][t], TAU);
      const gain = -(diff * diff) / quad;
      if (gain < best) { best = gain; j = t; }
    }
    if (j < 0 || gmax - gmin < tol) break;
    iterations++;

    // Move alpha_i by +y_i*t and alpha_j by -y_j*t (so sum alpha*y stays 0), t as far as the box allows.
    const quad = Math.max(K[i][i] + K[j][j] - 2 * K[i][j], TAU);
    let step = (gmax - -y[j] * G[j]) / quad;
    const lo = Math.max(y[i] === 1 ? -alphas[i] : alphas[i] - C, y[j] === 1 ? alphas[j] - C : -alphas[j]);
    const hi = Math.min(y[i] === 1 ? C - alphas[i] : alphas[i], y[j] === 1 ? alphas[j] : C - alphas[j]);
    step = Math.min(hi, Math.max(lo, step));
    const di = y[i] * step, dj = -y[j] * step;
    alphas[i] = settle(alphas[i] + di, C);
    alphas[j] = settle(alphas[j] + dj, C);
    for (let t = 0; t < n; t++) G[t] += y[t] * (y[i] * K[t][i] * di + y[j] * K[t][j] * dj);
  }

  // The bias, b = -rho, in libsvm's terms: rho is bounded above by y*G of the class -1 points at C and
  // the class +1 points at 0, and below by the other two groups. Every free point (0 < alpha < C) must sit exactly on a margin line, so b is their average.
  // When none is free (every alpha is 0 or C) b is not pinned down by one point: any value between the
  // tightest lower and upper bound is optimal, and the middle of that range is the choice that
  // classifies best (libsvm's rule). Taking an edge of it was what once painted the whole plane one colour.
  let b = 0;
  {
    let sum = 0, free = 0, lower = -Infinity, upper = Infinity;
    for (let t = 0; t < n; t++) {
      const yg = y[t] * G[t];
      if (alphas[t] > 0 && alphas[t] < C) { sum += yg; free++; }
      else if ((alphas[t] >= C) === (y[t] === -1)) upper = Math.min(upper, yg);
      else lower = Math.max(lower, yg);
    }
    const rho = free ? sum / free : (Number.isFinite(lower) && Number.isFinite(upper) ? (lower + upper) / 2 : Number.isFinite(lower) ? lower : Number.isFinite(upper) ? upper : 0);
    b = -rho;
  }

  const supportIndices = [];
  // Dust under 1e-5 of C (capped at 1e-6) is not a support vector.
  const supportEps = Math.min(1e-5 * C, 1e-6);
  for (let i = 0; i < n; i++) if (alphas[i] > supportEps) supportIndices.push(i);
  const supportVectors = supportIndices.map(i => X[i].slice());

  const decision = x => {
    let s = b;
    for (const i of supportIndices) s += alphas[i] * y[i] * k(X[i], x);
    return s;
  };

  let w = null;
  if (kernel === 'linear') {
    w = new Array(d).fill(0);
    for (const i of supportIndices) for (let c = 0; c < d; c++) w[c] += alphas[i] * y[i] * X[i][c];
  }
  const norm = w ? Math.hypot(...w) : 0;

  return {
    kernel, C, gamma, alphas, b, supportIndices, supportVectors, w, iterations,
    decision,
    predict: x => (decision(x) >= 0 ? 1 : -1),
    margin: () => (w && norm > 0 ? 2 / norm : null),
  };
}

export function decisionGrid(model, bounds, steps) {
  const nx = typeof steps === 'number' ? steps : steps.nx;
  const ny = typeof steps === 'number' ? steps : steps.ny;
  if (!(nx >= 2) || !(ny >= 2)) throw new Error('decisionGrid needs at least 2 steps each way');
  const { xMin, xMax, yMin, yMax } = bounds;
  const xs = Array.from({ length: nx }, (_, i) => xMin + (xMax - xMin) * i / (nx - 1));
  const ys = Array.from({ length: ny }, (_, j) => yMin + (yMax - yMin) * j / (ny - 1));
  const values = ys.map(yv => xs.map(xv => model.decision([xv, yv])));
  const labels = values.map(row => row.map(v => (v >= 0 ? 1 : -1)));
  return { xs, ys, values, labels, nx, ny };
}

export function svmAccuracy(model, X, y) {
  if (!X.length) return 0;
  let right = 0;
  for (let i = 0; i < X.length; i++) if (model.predict(X[i]) === y[i]) right++;
  return right / X.length;
}

export function makeRings(n, { innerRadius = 1, outerRadius = 3, noise = 0.15, seed = 1 } = {}) {
  const random = rng(seed);
  const X = [], y = [];
  for (const [label, radius] of [[-1, innerRadius], [1, outerRadius]]) {
    for (let i = 0; i < n; i++) {
      const angle = 2 * Math.PI * random();
      const r = radius + noise * (random() + random() + random() - 1.5) * 2;
      X.push([r * Math.cos(angle), r * Math.sin(angle)]);
      y.push(label);
    }
  }
  return { X, y };
}
