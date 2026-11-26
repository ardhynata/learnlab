export function startClustering(points, k, seed, startingCentroids, metric = 'euclidean', cosineRadius = 8) {
  let state = seed;
  const candidates = points.slice();
  const centroids = startingCentroids ?? Array.from({ length: k }, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const index = Math.floor(state / 2 ** 32 * candidates.length);
    const [{ x, y }] = candidates.splice(index, 1);
    return { x, y };
  });
  return { metric, cosineRadius, centroids, assignmentCentroids: centroids, assignments: [], nextAssignments: [], iteration: 0, phase: 'assign' };
}

function unitVector({ x, y }) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

const distances = {
  euclidean: (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2,
  manhattan: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
  cosine: (a, b) => {
    const u = unitVector(a);
    const v = unitVector(b);
    return Math.max(0, 1 - (u.x * v.x + u.y * v.y));
  },
};

function median(values) {
  values.sort((a, b) => a - b);
  return (values[Math.floor((values.length - 1) / 2)] + values[Math.floor(values.length / 2)]) / 2;
}

function updateCenter(points, center, metric, cosineRadius) {
  if (!points.length) return center;
  if (metric === 'manhattan') {
    return { x: median(points.map(point => point.x)), y: median(points.map(point => point.y)) };
  }
  let x = 0;
  let y = 0;
  for (const point of points) {
    const vector = metric === 'cosine' ? unitVector(point) : point;
    x += vector.x;
    y += vector.y;
  }
  if (metric === 'cosine') {
    if (!x && !y) return center;
    const direction = unitVector({ x, y });
    return { x: cosineRadius * direction.x, y: cosineRadius * direction.y };
  }
  return { x: x / points.length, y: y / points.length };
}

function nearestCentroid(point, centroids, distance) {
  let closest = 0;
  let best = distance(point, centroids[0]);
  for (let index = 1; index < centroids.length; index++) {
    const candidate = distance(point, centroids[index]);
    if (candidate < best) {
      closest = index;
      best = candidate;
    }
  }
  return closest;
}

export function advanceClustering(points, model, instant = false, batchSize = 1) {
  const { centroids, assignments, nextAssignments, phase, metric, cosineRadius } = model;
  if (!centroids.length || phase === 'done') return model;
  if (phase === 'assign') {
    const start = nextAssignments.length;
    const end = instant ? points.length : Math.min(points.length, start + batchSize);
    const next = nextAssignments.slice();
    for (let index = start; index < end; index++) {
      next.push(nearestCentroid(points[index], centroids, distances[metric]));
    }
    if (next.length < points.length) return { ...model, nextAssignments: next };
    const stable = next.every((cluster, index) => cluster === assignments[index]);
    return { ...model, assignmentCentroids: centroids, assignments: next, nextAssignments: [], phase: stable ? 'done' : 'update' };
  }

  const groups = centroids.map(() => []);
  points.forEach((point, index) => groups[assignments[index]].push(point));
  const next = groups.map((group, index) => updateCenter(group, centroids[index], metric, cosineRadius));
  return { ...model, centroids: next, phase: 'assign', iteration: model.iteration + 1 };
}

export function clusteringCost(points, { centroids, assignments, metric }) {
  return assignments.reduce((sum, cluster, index) =>
    sum + distances[metric](points[index], centroids[cluster]), 0
  );
}

export const manhattanGridSize = 80;

const defaultRange = { minX: 0, minY: 0, span: 10 };

export function manhattanRegions(centroids, { minX, minY, span } = defaultRange) {
  return Array.from({ length: manhattanGridSize ** 2 }, (_, index) => {
    const x = minX + (index % manhattanGridSize + 0.5) * span / manhattanGridSize;
    const y = minY + (Math.floor(index / manhattanGridSize) + 0.5) * span / manhattanGridSize;
    return nearestCentroid({ x, y }, centroids, distances.manhattan);
  });
}

export function centroidRegions(centroids, metric = 'euclidean', { minX, minY, span } = defaultRange) {
  const maxX = minX + span;
  const maxY = minY + span;
  const cosine = metric === 'cosine';
  if (cosine) centroids = centroids.map(unitVector);
  return centroids.map((center, index) => {
    let polygon = [{ x: minX, y: minY }, { x: maxX, y: minY }, { x: maxX, y: maxY }, { x: minX, y: maxY }];
    for (const [otherIndex, other] of centroids.entries()) {
      if (index === otherIndex || !polygon.length) continue;
      const dx = other.x - center.x;
      const dy = other.y - center.y;
      if (dx === 0 && dy === 0) {
        if (otherIndex < index) return [];
        continue;
      }
      const midX = cosine ? 0 : (center.x + other.x) / 2;
      const midY = cosine ? 0 : (center.y + other.y) / 2;
      const side = point => dx * (point.x - midX) + dy * (point.y - midY);
      const clipped = [];
      let previous = polygon.at(-1);
      let previousSide = side(previous);
      for (const current of polygon) {
        const currentSide = side(current);
        if ((previousSide <= 0) !== (currentSide <= 0)) {
          const fraction = previousSide / (previousSide - currentSide);
          clipped.push({
            x: previous.x + fraction * (current.x - previous.x),
            y: previous.y + fraction * (current.y - previous.y),
          });
        }
        if (currentSide <= 0) clipped.push(current);
        previous = current;
        previousSide = currentSide;
      }
      polygon = clipped;
    }
    return polygon;
  });
}
