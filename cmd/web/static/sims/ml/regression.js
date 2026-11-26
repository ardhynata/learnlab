// Least-squares fits.

export function mean(xs) { return xs.reduce((a, b) => a + b, 0) / xs.length; }
export function mse(ys, predicted) { return ys.reduce((s, y, i) => s + (y - predicted[i]) ** 2, 0) / ys.length; }
export function mae(ys, predicted) { return ys.reduce((s, y, i) => s + Math.abs(y - predicted[i]), 0) / ys.length; }

// Straight line y = slope * x + intercept, with R^2 (1 is a perfect fit).
export function linearFit(xs, ys) {
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
  const slope = sxx ? sxy / sxx : 0;
  const intercept = my - slope * mx;
  const predicted = xs.map(x => slope * x + intercept);
  const ssRes = ys.reduce((s, y, i) => s + (y - predicted[i]) ** 2, 0);
  const ssTot = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  return { slope, intercept, r2: ssTot ? 1 - ssRes / ssTot : 1 };
}

// Solves A x = b by Gaussian elimination with partial pivoting.
export function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-12) throw new Error('singular system');
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

// Polynomial of the given degree by least squares (normal equations). x is
// centered and scaled internally so higher degrees stay numerically stable.
export function polyFit(xs, ys, degree) {
  const cx = mean(xs);
  const sx = Math.max(...xs.map(x => Math.abs(x - cx))) || 1;
  const t = xs.map(x => (x - cx) / sx);
  const m = degree + 1;
  const A = Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => t.reduce((s, v) => s + v ** (i + j), 0)));
  const b = Array.from({ length: m }, (_, i) => t.reduce((s, v, k) => s + v ** i * ys[k], 0));
  for (let i = 0; i < m; i++) A[i][i] += 1e-10; // tiny ridge keeps the system solvable
  const coef = solve(A, b);
  return { degree, coef, predict: x => { const v = (x - cx) / sx; return coef.reduce((s, c, i) => s + c * v ** i, 0); } };
}
