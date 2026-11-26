// Small dense linear algebra for PCA-sized problems (matrices as arrays of rows).

export const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
export const norm = a => Math.sqrt(dot(a, a));
export const matVec = (M, v) => M.map(row => dot(row, v));

export function columnMeans(rows) {
  const n = rows.length;
  return rows[0].map((_, j) => rows.reduce((s, r) => s + r[j], 0) / n);
}

// Sample covariance matrix (divides by n - 1).
export function covariance(rows) {
  const n = rows.length, d = rows[0].length, mu = columnMeans(rows);
  const C = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const r of rows) for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) C[i][j] += (r[i] - mu[i]) * (r[j] - mu[j]) / (n - 1);
  return C;
}

// Eigen-decomposition of a symmetric matrix by cyclic Jacobi rotations.
// Returns eigenvalues in descending order and the matching unit eigenvectors.
export function eigenSym(matrix, maxSweeps = 60) {
  const n = matrix.length;
  const A = matrix.map(r => r.slice());
  const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] ** 2;
    if (off < 1e-22) break;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-300) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
        for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
        for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
      }
    }
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => A[b][b] - A[a][a]);
  return { values: order.map(i => A[i][i]), vectors: order.map(i => V.map(row => row[i])) };
}
