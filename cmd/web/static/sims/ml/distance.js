// Distances between points given as arrays of numbers, or {x, y} objects.

const vec = p => (Array.isArray(p) ? p : [p.x, p.y]);

export function squaredEuclidean(a, b) {
  const u = vec(a), v = vec(b);
  let sum = 0;
  for (let i = 0; i < u.length; i++) sum += (u[i] - v[i]) ** 2;
  return sum;
}
export const euclidean = (a, b) => Math.sqrt(squaredEuclidean(a, b));

export function manhattan(a, b) {
  const u = vec(a), v = vec(b);
  let sum = 0;
  for (let i = 0; i < u.length; i++) sum += Math.abs(u[i] - v[i]);
  return sum;
}

export function chebyshev(a, b) {
  const u = vec(a), v = vec(b);
  let max = 0;
  for (let i = 0; i < u.length; i++) max = Math.max(max, Math.abs(u[i] - v[i]));
  return max;
}

// 1 minus the cosine of the angle between the vectors. A zero vector has no
// direction, so it is distance 1 from everything (matching the k-means lab).
export function cosine(a, b) {
  const u = vec(a), v = vec(b);
  let dot = 0, nu = 0, nv = 0;
  for (let i = 0; i < u.length; i++) { dot += u[i] * v[i]; nu += u[i] ** 2; nv += v[i] ** 2; }
  if (!nu || !nv) return 1;
  return Math.max(0, 1 - dot / Math.sqrt(nu * nv));
}

export const metrics = { euclidean, manhattan, chebyshev, cosine };

// Index of the point in `points` nearest to `query` under `metric` (ties: the first).
export function nearestIndex(points, query, metric = euclidean) {
  let best = -1, bestD = Infinity;
  points.forEach((p, i) => { const d = metric(p, query); if (d < bestD) { best = i; bestD = d; } });
  return best;
}
