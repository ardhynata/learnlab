export function startDbscan(points, epsilon, minPoints) {
  const radiusSquared = epsilon ** 2;
  const neighborhoods = points.map(point => points.flatMap((other, index) =>
    (point.x - other.x) ** 2 + (point.y - other.y) ** 2 <= radiusSquared ? [index] : []
  ));
  return {
    neighborhoods,
    minPoints,
    visited: points.map(() => false),
    labels: points.map(() => undefined),
    clusterCount: 0,
    cursor: 0,
    queue: [],
    queued: new Set(),
    head: 0,
    active: -1,
    status: 'ready',
  };
}

export function advanceDbscan(model) {
  if (model.status === 'done') return;
  let index;
  const expanding = model.head < model.queue.length;
  if (expanding) {
    index = model.queue[model.head++];
  } else {
    while (model.cursor < model.labels.length && model.visited[model.cursor]) model.cursor++;
    if (model.cursor === model.labels.length) {
      model.active = -1;
      model.status = 'done';
      return;
    }
    index = model.cursor++;
  }

  model.active = index;
  const core = model.neighborhoods[index].length >= model.minPoints;
  if (!expanding && !core) {
    model.visited[index] = true;
    model.labels[index] = -1;
    model.status = 'noise';
    return;
  }
  if (!expanding) {
    model.clusterCount++;
    model.queue = [];
    model.queued.clear();
    model.head = 0;
  }

  model.labels[index] = model.clusterCount;
  model.visited[index] = true;
  model.status = !expanding ? 'seed' : core ? 'expand' : 'border';
  if (core) {
    for (const neighbor of model.neighborhoods[index]) {
      const label = model.labels[neighbor];
      if (label > 0 || model.queued.has(neighbor)) continue;
      model.queued.add(neighbor);
      model.queue.push(neighbor);
    }
  }
}

export function pointType(model, index) {
  if (!model.visited[index]) return 'unvisited';
  if (model.labels[index] === -1) return 'noise';
  return model.neighborhoods[index].length >= model.minPoints ? 'core' : 'border';
}

// The point to jump to from `from` when an arrow key is pressed: the nearest one strictly in that
// direction (dx, dy is a unit step in plot coordinates), with sideways offset counting double so a
// press prefers the point straight ahead over a nearer one off to the side. -1 when nothing lies that way.
export function nearestInDirection(points, from, dx, dy) {
  const origin = points[from];
  if (!origin) return -1;
  let best = -1, bestScore = Infinity;
  points.forEach((p, i) => {
    if (i === from) return;
    const vx = p.x - origin.x, vy = p.y - origin.y;
    const along = vx * dx + vy * dy;
    if (along <= 1e-9) return;
    const across = vx * dy - vy * dx;
    const score = along * along + 4 * across * across;
    if (score < bestScore) { bestScore = score; best = i; }
  });
  return best;
}
