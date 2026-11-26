// k-nearest-neighbors on labeled points {x, y, label} (or {features, label}).
import { euclidean, metrics } from './distance.js';

// The k nearest labeled points to `query`, closest first (ties: lower index first).
export function neighbors(points, query, k, metric = euclidean) {
  const fn = typeof metric === 'string' ? metrics[metric] : metric;
  return points
    .map((p, i) => ({ i, d: fn(p.features ?? p, query.features ?? query) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .slice(0, Math.min(k, points.length));
}

// Majority vote of the neighbors; a tie goes to the class of the closest neighbor.
export function classify(points, query, k, metric = euclidean) {
  const picked = neighbors(points, query, k, metric);
  const votes = {};
  for (const n of picked) votes[points[n.i].label] = (votes[points[n.i].label] ?? 0) + 1;
  const top = Math.max(...Object.values(votes));
  const leaders = Object.keys(votes).filter(l => votes[l] === top);
  const label = leaders.length === 1 ? leaders[0] : points[picked.find(n => leaders.includes(String(points[n.i].label))).i].label;
  return { picked, votes, label, tied: leaders.length > 1 };
}

// Leave-one-out accuracy: classify each point from all the others.
export function looAccuracy(points, k, metric = euclidean) {
  let right = 0;
  points.forEach((p, i) => {
    const rest = points.filter((_, j) => j !== i);
    if (classify(rest, p, k, metric).label === p.label) right++;
  });
  return right / points.length;
}
