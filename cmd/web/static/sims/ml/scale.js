// Feature scaling. `rows` are arrays of numbers (one array per example).

export function columnStats(rows) {
  const d = rows[0].length, n = rows.length;
  const mean = new Array(d).fill(0), min = new Array(d).fill(Infinity), max = new Array(d).fill(-Infinity);
  for (const r of rows) for (let j = 0; j < d; j++) { mean[j] += r[j] / n; min[j] = Math.min(min[j], r[j]); max[j] = Math.max(max[j], r[j]); }
  const std = new Array(d).fill(0);
  for (const r of rows) for (let j = 0; j < d; j++) std[j] += (r[j] - mean[j]) ** 2 / n;
  return { mean, min, max, std: std.map(Math.sqrt) };
}

// Zero mean, unit spread (population standard deviation). A constant column maps to 0.
export function standardize(rows, stats = columnStats(rows)) {
  return rows.map(r => r.map((v, j) => (stats.std[j] ? (v - stats.mean[j]) / stats.std[j] : 0)));
}

// Rescale each column to [0, 1]. A constant column maps to 0.
export function minMax(rows, stats = columnStats(rows)) {
  return rows.map(r => r.map((v, j) => (stats.max[j] > stats.min[j] ? (v - stats.min[j]) / (stats.max[j] - stats.min[j]) : 0)));
}
