import test from 'node:test';
import assert from 'node:assert/strict';

// i18n.js reads the browser at import time, so give it a minimal one before loading it.
globalThis.localStorage = { store: {}, getItem(k) { return this.store[k] ?? null; }, setItem(k, v) { this.store[k] = String(v); } };
Object.defineProperty(globalThis, 'navigator', { value: { languages: ['en'] }, configurable: true });
globalThis.document = { documentElement: {} };
globalThis.window = new EventTarget();
const { setLocale } = await import('../../i18n.js');
const {
  CLUSTER_KEYS, CLUSTER_COUNT, RANGE, RING_CENTER, RING_RADII, MOON_RADIUS, MOON_CENTERS, NOISE_FRACTION,
  makeClusterData, describeDataset, splitCounts,
} = await import('./clusterdata.js');

const dist = (p, c) => Math.hypot(p[0] - c[0], p[1] - c[1]);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const members = (d, label) => d.points.filter((_, i) => d.truth[i] === label);
const centroid = (ps) => [mean(ps.map((p) => p[0])), mean(ps.map((p) => p[1]))];
const spread = (ps) => { const c = centroid(ps); return Math.sqrt(mean(ps.map((p) => dist(p, c) ** 2))); };

test('the six datasets are listed', () => {
  assert.deepEqual(CLUSTER_KEYS, ['blobs', 'overlap', 'rings', 'moons', 'density', 'sizes']);
  assert.throws(() => makeClusterData('spiral'), /unknown cluster dataset/);
});

test('the same key, n and seed give the same dataset; another seed gives another', () => {
  for (const key of CLUSTER_KEYS) {
    const a = makeClusterData(key, { n: 120, seed: 3 });
    assert.deepEqual(makeClusterData(key, { n: 120, seed: 3 }), a, key);
    assert.notDeepEqual(makeClusterData(key, { n: 120, seed: 4 }).points, a.points, key);
  }
});

test('exactly n points and n labels, for any n', () => {
  for (const key of CLUSTER_KEYS) {
    for (const n of [0, 1, 2, 5, 37, 150, 400]) {
      const d = makeClusterData(key, { n });
      assert.equal(d.points.length, n, `${key} n=${n}`);
      assert.equal(d.truth.length, n, `${key} n=${n}`);
    }
    assert.equal(makeClusterData(key).points.length, 150, 'default n');
    assert.equal(makeClusterData(key, { n: 20.9 }).points.length, 20, 'fractions round down');
    assert.equal(makeClusterData(key, { n: NaN }).points.length, 150, 'a bad n falls back to the default');
  }
});

test('splitCounts always sums to n and follows the weights', () => {
  assert.deepEqual(splitCounts(100, [6, 3, 1]), [60, 30, 10]);
  assert.deepEqual(splitCounts(10, [1, 1, 1]), [4, 3, 3]);
  for (let n = 0; n < 60; n++) assert.equal(splitCounts(n, [6, 3, 1]).reduce((a, b) => a + b, 0), n);
});

test('every coordinate is a finite number inside 0..10, even for large n', () => {
  for (const key of CLUSTER_KEYS) {
    for (const seed of [1, 2, 3]) {
      for (const [x, y] of makeClusterData(key, { n: 600, seed }).points) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y), key);
        assert.ok(x >= 0 && x <= RANGE && y >= 0 && y <= RANGE, `${key}: (${x}, ${y})`);
      }
    }
  }
});

test('labels: clusters are 0..k-1 and all present; only density has noise (-1)', () => {
  for (const key of CLUSTER_KEYS) {
    const d = makeClusterData(key, { n: 200 });
    const labels = [...new Set(d.truth)].sort((a, b) => a - b);
    const expected = Array.from({ length: CLUSTER_COUNT[key] }, (_, i) => i);
    assert.deepEqual(labels.filter((l) => l >= 0), expected, key);
    assert.equal(labels.includes(-1), key === 'density', key);
  }
});

test('the points are shuffled, not stored cluster by cluster', () => {
  const d = makeClusterData('blobs', { n: 90 });
  const firstThirdLabels = new Set(d.truth.slice(0, 30));
  assert.ok(firstThirdLabels.size > 1);
});

test('blobs: three tight groups whose centroids sit at the chosen centres', () => {
  const d = makeClusterData('blobs', { n: 300 });
  const centres = [[2.4, 2.5], [7.6, 3.0], [5.0, 7.8]];
  centres.forEach((c, label) => {
    const ps = members(d, label);
    assert.equal(ps.length, 100);
    assert.ok(dist(centroid(ps), c) < 0.25, `blob ${label}`);
    assert.ok(spread(ps) < 1.2, `blob ${label} is tight`);
  });
});

test('overlap: the same three groups, but wider, so the groups intrude on each other', () => {
  const tight = makeClusterData('blobs', { n: 300 }), loose = makeClusterData('overlap', { n: 300 });
  for (const label of [0, 1, 2]) assert.ok(spread(members(loose, label)) > spread(members(tight, label)) * 1.5);
  // A real overlap: some point is nearer a different cluster's centroid than its own.
  const cs = [0, 1, 2].map((l) => centroid(members(loose, l)));
  const wrong = loose.points.filter((p, i) => cs.reduce((best, c, l) => (dist(p, c) < dist(p, cs[best]) ? l : best), 0) !== loose.truth[i]);
  assert.ok(wrong.length >= 10, `only ${wrong.length} points sit nearer another centroid`);
});

test('rings: two concentric rings at the stated radii', () => {
  const d = makeClusterData('rings', { n: 400 });
  RING_RADII.forEach((radius, label) => {
    const ps = members(d, label);
    const rs = ps.map((p) => dist(p, RING_CENTER));
    assert.ok(Math.abs(mean(rs) - radius) < 0.05, `ring ${label} radius ${mean(rs)}`);
    assert.ok(Math.max(...rs) - Math.min(...rs) < 1.2, `ring ${label} is thin`);
    // It goes all the way round: points in every quadrant.
    const quadrants = new Set(ps.map((p) => `${p[0] >= RING_CENTER[0]}${p[1] >= RING_CENTER[1]}`));
    assert.equal(quadrants.size, 4);
  });
  assert.ok(RING_RADII[1] > 1.8 * RING_RADII[0]);
  // Both rings share a centre, so their centroids coincide: k-means cannot tell them apart.
  assert.ok(dist(centroid(members(d, 0)), centroid(members(d, 1))) < 0.4);
  // The longer ring gets more points.
  assert.ok(members(d, 1).length > members(d, 0).length);
  assert.equal(members(d, 0).length + members(d, 1).length, 400);
});

test('moons: two half circles, an arch above and a bowl below, each on its own circle', () => {
  const d = makeClusterData('moons', { n: 400 });
  const [up, down] = [members(d, 0), members(d, 1)];
  assert.equal(up.length, 200);
  assert.equal(down.length, 200);
  [up, down].forEach((ps, label) => {
    const [cx, cy] = MOON_CENTERS[label];
    assert.ok(Math.abs(mean(ps.map((p) => dist(p, MOON_CENTERS[label]))) - MOON_RADIUS) < 0.08, `moon ${label} radius`);
    // Half circle only: the arch stays above its centre, the bowl below.
    const sign = label === 0 ? 1 : -1;
    assert.ok(ps.every((p) => sign * (p[1] - cy) > -0.8), `moon ${label} is a half circle`);
    // And it spans the whole arc, not one clump.
    const xs = ps.map((p) => p[0]);
    assert.ok(Math.max(...xs) - Math.min(...xs) > 1.7 * MOON_RADIUS);
    assert.ok(cx > 0);
  });
  // Interleaved: the tips overlap in x, and the arch sits higher than the bowl at the middle.
  assert.ok(Math.min(...down.map((p) => p[0])) < Math.max(...up.map((p) => p[0])));
  const midY = (ps) => mean(ps.filter((p) => Math.abs(p[0] - 5) < 0.8).map((p) => p[1]));
  assert.ok(midY(up) > midY(down) + 1);
  // The two means are close together compared with the moons' size, so a centroid split cuts
  // across both moons: the nearest-centroid labelling is wrong for a good share of points.
  const cs = [centroid(up), centroid(down)];
  const wrong = d.points.filter((p, i) => (dist(p, cs[0]) < dist(p, cs[1]) ? 0 : 1) !== d.truth[i]);
  assert.ok(wrong.length > 40, `${wrong.length} wrong`);
});

test('density: a tight cluster, a loose cluster, and about 10% uniform noise labelled -1', () => {
  const n = 300;
  const d = makeClusterData('density', { n });
  const noise = members(d, -1), tight = members(d, 0), loose = members(d, 1);
  assert.equal(noise.length, Math.round(n * NOISE_FRACTION));
  assert.equal(tight.length + loose.length + noise.length, n);
  assert.ok(spread(loose) > 2.5 * spread(tight), `${spread(loose)} vs ${spread(tight)}`);
  assert.ok(spread(tight) < 0.7);
  // Noise is spread over the whole plot, not hugging a cluster.
  const xs = noise.map((p) => p[0]), ys = noise.map((p) => p[1]);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 7 && Math.max(...ys) - Math.min(...ys) > 7);
  // Tiny n: a single point is a cluster point, two points include a noise point.
  assert.equal(members(makeClusterData('density', { n: 1 }), -1).length, 0);
  assert.equal(members(makeClusterData('density', { n: 2 }), -1).length, 1);
});

test('sizes: clusters hold 60%, 30% and 10% of the points', () => {
  const d = makeClusterData('sizes', { n: 200 });
  assert.deepEqual([0, 1, 2].map((l) => members(d, l).length), [120, 60, 20]);
  assert.equal(members(d, -1).length, 0);
  // Still present with a small n.
  assert.equal(new Set(makeClusterData('sizes', { n: 10 }).truth).size, 3);
});

test('describeDataset gives an English and an Indonesian name and description, read at use time', () => {
  const seen = { en: new Set(), id: new Set() };
  for (const loc of ['en', 'id']) {
    setLocale(loc);
    for (const key of CLUSTER_KEYS) {
      const info = describeDataset(key);
      assert.equal(info.key, key);
      assert.ok(info.name.length > 0 && info.description.endsWith('.'), key);
      assert.ok(info.name.length <= 30, `${key}: name is short`);
      assert.equal(info.description.includes('\n'), false);
      seen[loc].add(info.name);
    }
  }
  assert.equal(seen.en.size, 6, 'six distinct English names');
  assert.equal(seen.id.size, 6, 'six distinct Indonesian names');
  assert.deepEqual([...seen.en].filter((s) => seen.id.has(s)), [], 'no name is left untranslated');
  setLocale('id');
  const idName = describeDataset('rings').name;
  setLocale('en');
  assert.notEqual(describeDataset('rings').name, idName, 'switching language changes the result');
  assert.throws(() => describeDataset('spiral'), /unknown cluster dataset/);
});
