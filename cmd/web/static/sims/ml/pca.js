// Principal component analysis (PCA) for the "PCA" module. Pure functions, deterministic (no
// randomness), tested in pca.test.js. A table X is an array of n rows, each an array of d numbers.
//
// API
//   standardizeColumns(X) -> { Z, mean, scale }
//       Centre each column and divide by its population standard deviation (divisor n).
//       A constant column has scale 1 (so it becomes all zeros instead of NaN).
//   covariance(X) -> d x d matrix
//       Covariance of the columns, divisor n (the "population" covariance, so the variances on
//       the diagonal are exactly what PCA splits up). The columns are centred first.
//   eigenSymmetric(A) -> { values, vectors }
//       Eigen decomposition of a symmetric matrix by cyclic Jacobi rotations. values are sorted
//       from largest to smallest; vectors[i] is the unit eigenvector of values[i]. Each vector
//       has a fixed sign: its component of largest magnitude is positive (the first such
//       component if two tie), so the result never flips between runs or platforms.
//   fitPca(X, { standardize = false }) -> model
//       model = { components, eigenvalues, explainedRatio, mean, scale, standardize, n, d }
//         components[i]      unit-length i-th principal axis (length d), sign as above
//         eigenvalues[i]     variance of the data along that axis (descending, never negative)
//         explainedRatio[i]  eigenvalues[i] / sum(eigenvalues); sums to 1 (all 0 if every row is
//                            identical, because there is no variance to explain)
//         mean, scale        per-column mean, and per-column divisor (all 1 unless standardize)
//       standardize: true works on z-scores (the correlation matrix); false keeps the original
//       units, so a column with big numbers dominates the first component.
//   project(model, X, k = d) -> n x k matrix Z of scores: each row is centred (and scaled), then
//       dotted with the first k components.
//   reconstruct(model, Z, k = Z[0].length) -> n x d matrix in the ORIGINAL units, rebuilt from the
//       first k score columns of Z: mean + scale * sum_j z_j * components[j].
//   reconstructionError(model, X, k) -> number
//       Mean over rows of the squared distance between a row and its rebuild from k components,
//       measured in the model's own space (z-scores when standardize is true, original units
//       otherwise). For the data the model was fitted on it equals the sum of the dropped
//       eigenvalues, eigenvalues[k] + ... + eigenvalues[d - 1]. It is 0 for k = d.
//   rotate2d(points, angle, center = [0, 0]) -> points [[x, y], ...] turned counter-clockwise by
//       `angle` radians about `center`. Distances between points are preserved.
//   varianceAlong2d(points, angle) -> variance (divisor n) of the points projected onto the
//       direction (cos angle, sin angle). It has period pi.
//   bestAxis2d(points) -> { angle, direction, variance, otherVariance, ratio }
//       The direction of greatest variance for 2-D points, found as the first principal
//       component of the raw points. direction = [dx, dy] (unit, sign as in eigenSymmetric),
//       angle = atan2(dy, dx) in (-pi, pi], variance is the variance along it, otherVariance
//       the variance at right angles to it, ratio = variance / (variance + otherVariance).
//
// Errors: every entry point throws a descriptive Error for an empty table, ragged rows,
// non-finite numbers, or a k outside 0..d.

const EPS_OFF = 1e-14;      // Jacobi stops when the off-diagonal mass is this small, relative to the matrix
const MAX_SWEEPS = 100;

function checkTable(X, what = 'X') {
  if (!Array.isArray(X) || X.length === 0) throw new Error(`${what}: need at least one row`);
  const d = X[0].length;
  if (!d) throw new Error(`${what}: rows need at least one column`);
  for (let i = 0; i < X.length; i++) {
    if (!X[i] || X[i].length !== d) throw new Error(`${what}: row ${i} has ${X[i] ? X[i].length : 0} values, expected ${d}`);
    for (let j = 0; j < d; j++) {
      if (!Number.isFinite(X[i][j])) throw new Error(`${what}: row ${i}, column ${j} is not a finite number`);
    }
  }
  return d;
}

function checkK(k, d) {
  if (!Number.isInteger(k) || k < 0 || k > d) throw new Error(`k must be an integer from 0 to ${d}, got ${k}`);
}

function columnMeans(X, d) {
  const m = new Array(d).fill(0);
  for (const row of X) for (let j = 0; j < d; j++) m[j] += row[j];
  return m.map(v => v / X.length);
}

export function standardizeColumns(X) {
  const d = checkTable(X);
  const n = X.length;
  const mean = columnMeans(X, d);
  const scale = new Array(d).fill(0);
  for (const row of X) for (let j = 0; j < d; j++) scale[j] += (row[j] - mean[j]) ** 2;
  for (let j = 0; j < d; j++) {
    const sd = Math.sqrt(scale[j] / n);
    scale[j] = sd > 0 ? sd : 1;
  }
  const Z = X.map(row => row.map((v, j) => (v - mean[j]) / scale[j]));
  return { Z, mean, scale };
}

export function covariance(X) {
  const d = checkTable(X);
  const n = X.length;
  const mean = columnMeans(X, d);
  const C = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const row of X) {
    for (let a = 0; a < d; a++) {
      const da = row[a] - mean[a];
      for (let b = a; b < d; b++) C[a][b] += da * (row[b] - mean[b]);
    }
  }
  for (let a = 0; a < d; a++) {
    for (let b = a; b < d; b++) {
      C[a][b] /= n;
      C[b][a] = C[a][b];
    }
  }
  return C;
}

// Fix the sign of a vector: its largest-magnitude component becomes positive. A component is
// only treated as larger when it beats the current one by a relative margin, so rounding noise
// cannot flip the choice between two components that are equal in exact arithmetic.
function fixSign(v) {
  let best = 0;
  for (let i = 1; i < v.length; i++) {
    if (Math.abs(v[i]) > Math.abs(v[best]) * (1 + 1e-9)) best = i;
  }
  if (v[best] < 0) for (let i = 0; i < v.length; i++) v[i] = -v[i] || 0;
  return v;
}

export function eigenSymmetric(A) {
  const d = A.length;
  if (d === 0) throw new Error('eigenSymmetric: empty matrix');
  for (let i = 0; i < d; i++) {
    if (A[i].length !== d) throw new Error('eigenSymmetric: matrix must be square');
    for (let j = 0; j < d; j++) {
      if (!Number.isFinite(A[i][j])) throw new Error('eigenSymmetric: matrix has a non-finite entry');
    }
  }
  for (let i = 0; i < d; i++) {
    for (let j = i + 1; j < d; j++) {
      if (Math.abs(A[i][j] - A[j][i]) > 1e-9 * (1 + Math.abs(A[i][j]))) throw new Error('eigenSymmetric: matrix is not symmetric');
    }
  }
  const a = A.map(r => r.slice());
  const V = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => (i === j ? 1 : 0)));
  let total = 0;
  for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) total += a[i][j] * a[i][j];

  for (let sweep = 0; sweep < MAX_SWEEPS; sweep++) {
    let off = 0;
    for (let p = 0; p < d; p++) for (let q = p + 1; q < d; q++) off += a[p][q] * a[p][q];
    if (off <= EPS_OFF * EPS_OFF * total || off === 0) break;
    for (let p = 0; p < d - 1; p++) {
      for (let q = p + 1; q < d; q++) {
        const apq = a[p][q];
        if (apq === 0) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < d; k++) {           // columns p, q: a = a * J
          const akp = a[k][p], akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < d; k++) {           // rows p, q: a = J^T * a
          const apk = a[p][k], aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < d; k++) {           // accumulate eigenvectors as columns of V
          const vkp = V[k][p], vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq;
          V[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  // Sort by eigenvalue descending; ties keep the original column order (stable).
  const order = Array.from({ length: d }, (_, i) => i).sort((i, j) => (a[j][j] - a[i][i]) || (i - j));
  return {
    values: order.map(i => a[i][i]),
    vectors: order.map(i => fixSign(V.map(row => row[i]))),
  };
}

export function fitPca(X, { standardize = false } = {}) {
  const d = checkTable(X);
  const n = X.length;
  let mean, scale, Z;
  if (standardize) {
    ({ Z, mean, scale } = standardizeColumns(X));
  } else {
    mean = columnMeans(X, d);
    scale = new Array(d).fill(1);
    Z = X.map(row => row.map((v, j) => v - mean[j]));
  }
  const { values, vectors } = eigenSymmetric(covariance(Z));
  const eigenvalues = values.map(v => (v > 0 ? v : 0));   // covariance is positive semi-definite; drop rounding noise
  const total = eigenvalues.reduce((s, v) => s + v, 0);
  const explainedRatio = eigenvalues.map(v => (total > 0 ? v / total : 0));
  return { components: vectors, eigenvalues, explainedRatio, mean, scale, standardize: !!standardize, n, d };
}

function modelSpace(model, row) {
  return row.map((v, j) => (v - model.mean[j]) / model.scale[j]);
}

export function project(model, X, k = model.d) {
  const d = checkTable(X);
  if (d !== model.d) throw new Error(`project: X has ${d} columns, the model was fitted on ${model.d}`);
  checkK(k, model.d);
  return X.map(row => {
    const z = modelSpace(model, row);
    const out = new Array(k);
    for (let c = 0; c < k; c++) {
      let s = 0;
      for (let j = 0; j < d; j++) s += z[j] * model.components[c][j];
      out[c] = s;
    }
    return out;
  });
}

export function reconstruct(model, Z, k) {
  if (!Array.isArray(Z) || Z.length === 0) throw new Error('Z: need at least one row');
  const width = Z[0].length;
  if (k === undefined) k = width;
  checkK(k, model.d);
  if (k > width) throw new Error(`reconstruct: Z has ${width} score columns, asked for ${k}`);
  for (let i = 0; i < Z.length; i++) {
    if (Z[i].length !== width) throw new Error(`Z: row ${i} has ${Z[i].length} values, expected ${width}`);
  }
  return Z.map(scores => {
    const out = new Array(model.d);
    for (let j = 0; j < model.d; j++) {
      let s = 0;
      for (let c = 0; c < k; c++) s += scores[c] * model.components[c][j];
      out[j] = model.mean[j] + model.scale[j] * s;
    }
    return out;
  });
}

export function reconstructionError(model, X, k) {
  const d = checkTable(X);
  if (d !== model.d) throw new Error(`reconstructionError: X has ${d} columns, the model was fitted on ${model.d}`);
  checkK(k, model.d);
  const scores = project(model, X, k);
  let sum = 0;
  for (let i = 0; i < X.length; i++) {
    const z = modelSpace(model, X[i]);
    for (let j = 0; j < d; j++) {
      let r = 0;
      for (let c = 0; c < k; c++) r += scores[i][c] * model.components[c][j];
      sum += (z[j] - r) ** 2;
    }
  }
  return sum / X.length;
}

function checkPoints2d(points) {
  const d = checkTable(points, 'points');
  if (d !== 2) throw new Error(`points: need [x, y] pairs, got rows of ${d}`);
}

export function rotate2d(points, angle, center = [0, 0]) {
  checkPoints2d(points);
  if (!Number.isFinite(angle)) throw new Error('rotate2d: angle must be a finite number of radians');
  const c = Math.cos(angle), s = Math.sin(angle);
  const [cx, cy] = center;
  return points.map(([x, y]) => [cx + c * (x - cx) - s * (y - cy), cy + s * (x - cx) + c * (y - cy)]);
}

export function varianceAlong2d(points, angle) {
  checkPoints2d(points);
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const mx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const my = points.reduce((s, p) => s + p[1], 0) / points.length;
  let v = 0;
  for (const [x, y] of points) v += ((x - mx) * dx + (y - my) * dy) ** 2;
  return v / points.length;
}

export function bestAxis2d(points) {
  checkPoints2d(points);
  const m = fitPca(points);
  const direction = m.components[0].slice();
  const [variance, otherVariance] = m.eigenvalues;
  return {
    angle: Math.atan2(direction[1], direction[0]),
    direction,
    variance,
    otherVariance,
    ratio: m.explainedRatio[0],
  };
}
