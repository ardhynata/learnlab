import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeRatings, splitFromMatrix, leaveLastOut, removeHistory, popularity, userKnn, itemKnn, mf, sgdStep,
  contentBased, hybrid, recommend, precisionAtK, recallAtK, ndcgAtK, hitAtK, hitRate, catalogueCoverage,
  intraListDiversity, cosine, evaluate,
} from './recsys.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (tol ${tol})`);
const closeArr = (a, b, tol = 1e-9) => { assert.equal(a.length, b.length); a.forEach((v, i) => close(v, b[i], tol)); };
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

// A 4x4 explicit rating matrix, 0 = missing. All the hand-worked numbers below come from it.
//        i0 i1 i2 i3
//   u0 [  5, 3, 0, 1 ]
//   u1 [  4, 0, 0, 1 ]
//   u2 [  1, 1, 0, 5 ]
//   u3 [  0, 1, 5, 4 ]
const M4 = [[5, 3, 0, 1], [4, 0, 0, 1], [1, 1, 0, 5], [0, 1, 5, 4]];

// ---------------------------------------------------------------------------------------------
// Hand-computed similarity and prediction

test('cosine: parallel, orthogonal and zero vectors', () => {
  close(cosine([1, 2, 3], [2, 4, 6]), 1);
  close(cosine([1, 0], [0, 1]), 0);
  close(cosine([0, 0], [1, 1]), 0);
  close(cosine([1, 1], [1, 0]), Math.SQRT1_2);
});

test('userKnn: cosine similarities on the 4x4 matrix, by hand', () => {
  const model = userKnn(splitFromMatrix(M4), { k: 3 });
  // u0 . u1 = 20 + 1 = 21; |u0|^2 = 35; |u1|^2 = 17  ->  21 / sqrt(595)
  close(model.similarity(0, 1), 21 / Math.sqrt(595));
  close(model.similarity(0, 1), 0.8609, 5e-5);
  // u1 . u2 = 4 + 5 = 9; |u2|^2 = 27  ->  9 / sqrt(459) = 0.4201
  close(model.similarity(1, 2), 0.4201, 5e-5);
  // u1 . u3 = 4; |u3|^2 = 42  ->  4 / sqrt(714) = 0.1497
  close(model.similarity(1, 3), 0.1497, 5e-5);
  close(model.similarity(1, 0), model.similarity(0, 1));
});

test('userKnn: the user-user prediction for user 1 on item 1 is 2.2035 (exact weighted average)', () => {
  const model = userKnn(splitFromMatrix(M4), { k: 3 });
  // Users 0, 2 and 3 rated item 1 with 3, 1, 1; their similarities to user 1 are .8609, .4201, .1497.
  // (.8609*3 + .4201*1 + .1497*1) / (.8609 + .4201 + .1497) = 3.1525 / 1.4307 = 2.2035
  close(model.predict(1, 1), 2.2035, 5e-4);
  const s = 21 / Math.sqrt(595), t = 9 / Math.sqrt(459), w = 4 / Math.sqrt(714);
  close(model.predict(1, 1), (s * 3 + t * 1 + w * 1) / (s + t + w));
  // The ranking score is the unnormalised weighted sum.
  close(model.score(1, 1), s * 3 + t + w);
  // Nobody who is similar to user 0 rated item 2 except user 3 (and user 3's rating is 5).
  close(model.predict(0, 2), 5);
  // With k = 1 only the single most similar user (user 0) counts.
  close(userKnn(splitFromMatrix(M4), { k: 1 }).predict(1, 1), 3);
  assert.deepEqual(model.neighbours(1), [0, 2, 3]);
});

test('itemKnn: item-item cosine and the prediction for user 1 on item 1, by hand', () => {
  const model = itemKnn(splitFromMatrix(M4), { k: 3 });
  // columns: i0 = [5,4,1,0], i1 = [3,0,1,1], i3 = [1,1,5,4]
  close(model.similarity(0, 1), 16 / Math.sqrt(42 * 11));
  close(model.similarity(1, 3), 12 / Math.sqrt(11 * 43));
  // User 1 has items 0 (rating 4) and 3 (rating 1): (.7444*4 + .5517*1) / (.7444 + .5517) = 2.7229
  const a = 16 / Math.sqrt(462), b = 12 / Math.sqrt(473);
  close(model.predict(1, 1), (a * 4 + b * 1) / (a + b));
  close(model.predict(1, 1), 2.7229, 5e-5);
});

test('knn models in implicit mode count shared interactions (binary cosine)', () => {
  const split = splitFromMatrix([[1, 1, 0], [1, 1, 1], [0, 0, 1]], { implicit: true });
  const model = userKnn(split, { k: 2 });
  close(model.similarity(0, 1), 2 / Math.sqrt(2 * 3));
  close(model.similarity(0, 2), 0);
  assert.deepEqual(model.neighbours(0), [1]);
});

// ---------------------------------------------------------------------------------------------
// Ranking metrics

test('ndcgAtK: NDCG@3 of a small ranking, exact to 3 decimals', () => {
  const ranked = [4, 1, 2, 7, 5];
  const relevant = [1, 2, 5];
  // DCG@3 = 0 + 1/log2(3) + 1/log2(4) = 0.6309 + 0.5 = 1.1309; ideal = 1 + 0.6309 + 0.5 = 2.1309
  close(ndcgAtK(ranked, relevant, 3), 0.531, 5e-4);
  close(ndcgAtK(ranked, relevant, 3), (1 / Math.log2(3) + 0.5) / (1 + 1 / Math.log2(3) + 0.5));
  // One relevant item at rank 2: DCG = 1/log2(3), ideal = 1.
  close(ndcgAtK([9, 3, 8], [3], 3), 0.631, 5e-4);
  close(ndcgAtK([3, 9, 8], [3], 3), 1);
  close(ndcgAtK([9, 8, 7], [3], 3), 0);
  // Items below the cut-off do not count.
  close(ndcgAtK([9, 8, 7, 3], [3], 3), 0);
  assert.equal(ndcgAtK([1], [], 3), 0);
});

test('precision, recall, hit rate, coverage and diversity: hand-worked', () => {
  const ranked = [4, 1, 2, 7, 5];
  const relevant = new Set([1, 2, 5]);
  close(precisionAtK(ranked, relevant, 3), 2 / 3);
  close(recallAtK(ranked, relevant, 3), 2 / 3);
  close(recallAtK(ranked, relevant, 5), 1);
  close(precisionAtK(ranked, relevant, 5), 3 / 5);
  assert.equal(hitAtK(ranked, relevant, 1), 0);
  assert.equal(hitAtK(ranked, relevant, 2), 1);
  close(hitRate([[4, 1], [9, 8]], [[1], [3]], 2), 0.5);
  close(catalogueCoverage([[0, 1], [1, 2]], 6), 0.5);
  close(intraListDiversity([0, 1, 2], [[1, 0], [1, 0], [0, 1]]), 2 / 3);
  assert.equal(intraListDiversity([0], [[1, 0]]), 0);
  assert.equal(recallAtK([1, 2], [], 2), 0);
});

// ---------------------------------------------------------------------------------------------
// SGD

test('sgdStep: one step on a 2-factor example, by hand', () => {
  const p = [1, 0.5], q = [0.5, 1];
  const r = sgdStep(p, q, 4, { lr: 0.1, lambda: 0.1 });
  // pred = 1*0.5 + 0.5*1 = 1, err = 3. p' = p + 0.1 (3 q - 0.1 p), q' = q + 0.1 (3 p - 0.1 q)
  close(r.pred, 1);
  close(r.err, 3);
  closeArr(r.p, [1 + 0.1 * (3 * 0.5 - 0.1 * 1), 0.5 + 0.1 * (3 * 1 - 0.1 * 0.5)]);
  closeArr(r.p, [1.14, 0.795]);
  closeArr(r.q, [0.795, 1.14]);
  // Inputs are not touched.
  closeArr(p, [1, 0.5]); closeArr(q, [0.5, 1]);
  // The step moves the prediction toward the rating.
  assert.ok(r.p[0] * r.q[0] + r.p[1] * r.q[1] > 1);
});

test('sgdStep: with biases and a global mean', () => {
  const r = sgdStep([1, 0.5], [0.5, 1], 4, { lr: 0.1, lambda: 0.1, bu: 0.2, bi: -0.1, mu: 3 });
  // pred = 3 + 0.2 - 0.1 + 1 = 4.1, err = -0.1
  close(r.pred, 4.1);
  close(r.err, -0.1);
  close(r.bu, 0.2 + 0.1 * (-0.1 - 0.1 * 0.2));
  close(r.bi, -0.1 + 0.1 * (-0.1 - 0.1 * -0.1));
  closeArr(r.p, [0.985, 0.485]);
  closeArr(r.q, [0.5 + 0.1 * (-0.1 * 1 - 0.05), 1 + 0.1 * (-0.1 * 0.5 - 0.1)]);
});

// ---------------------------------------------------------------------------------------------
// Data and splits

test('makeRatings: deterministic, right shape, density near the target', () => {
  const a = makeRatings({ users: 60, items: 40, seed: 7, density: 0.15 });
  const b = makeRatings({ users: 60, items: 40, seed: 7, density: 0.15 });
  assert.deepEqual(a.interactions, b.interactions);
  assert.notDeepEqual(a.interactions, makeRatings({ users: 60, items: 40, seed: 8, density: 0.15 }).interactions);
  close(a.density, 0.15, 0.03);
  assert.equal(a.itemAttrs.length, 40);
  assert.ok(a.itemAttrs.every(v => v.length === a.genres && v.reduce((x, y) => x + y, 0) >= 1));
  assert.ok(a.interactions.every(x => x.value === 1 && x.user >= 0 && x.user < 60 && x.item >= 0 && x.item < 40));
  // No pair appears twice; each user's timeline is 0..n-1.
  const pairs = new Set(a.interactions.map(x => `${x.user}:${x.item}`));
  assert.equal(pairs.size, a.interactions.length);
  const ts = Array.from({ length: 60 }, () => []);
  a.interactions.forEach(x => ts[x.user].push(x.t));
  ts.forEach(t => assert.deepEqual(t.sort((x, y) => x - y), t.map((_, i) => i)));
});

test('makeRatings: popularity skew concentrates interactions on a few items', () => {
  const share = skew => {
    const r = makeRatings({ users: 150, items: 60, seed: 3, popularitySkew: skew });
    const counts = new Array(60).fill(0);
    r.interactions.forEach(x => { counts[x.item]++; });
    counts.sort((x, y) => y - x);
    return counts.slice(0, 6).reduce((s, v) => s + v, 0) / r.interactions.length;
  };
  const shares = [0, 1, 2, 3].map(share);
  shares.forEach((v, i) => { if (i > 0) assert.ok(v > shares[i - 1] + 0.02, shares.join(' ')); });
  assert.ok(shares[3] > shares[0] + 0.15, shares.join(' '));
});

test('makeRatings: explicit mode rates 1..5 and higher affinity gets higher ratings', () => {
  const r = makeRatings({ users: 100, items: 50, seed: 5, mode: 'explicit', density: 0.2 });
  assert.ok(r.interactions.every(x => Number.isInteger(x.value) && x.value >= 1 && x.value <= 5));
  assert.ok(new Set(r.interactions.map(x => x.value)).size >= 4);
  const hi = r.interactions.filter(x => r.truth.trueAffinity(x.user, x.item) > 1).map(x => x.value);
  const lo = r.interactions.filter(x => r.truth.trueAffinity(x.user, x.item) < -0.5).map(x => x.value);
  assert.ok(mean(hi) > mean(lo) + 1);
  assert.throws(() => makeRatings({ mode: 'bogus' }));
});

test('leaveLastOut: the last interaction by time is the test item; sets are disjoint', () => {
  const r = makeRatings({ users: 80, items: 50, seed: 11 });
  const split = leaveLastOut(r);
  const lastByUser = new Map();
  r.interactions.forEach(x => { if (!lastByUser.has(x.user) || x.t > lastByUser.get(x.user).t) lastByUser.set(x.user, x); });
  assert.ok(split.test.length > 40);
  split.test.forEach(x => assert.equal(lastByUser.get(x.user).item, x.item));
  const key = x => `${x.user}:${x.item}`;
  const all = [...split.train, ...split.valid, ...split.test].map(key);
  assert.equal(new Set(all).size, all.length);
  assert.equal(all.length, r.interactions.length);
  // valid is the second-to-last interaction.
  split.valid.forEach(x => {
    const mine = r.interactions.filter(y => y.user === x.user).sort((a, b) => a.t - b.t);
    assert.equal(mine[mine.length - 2].item, x.item);
  });
  // A user with fewer than 3 interactions has no test item and keeps all in train.
  const counts = new Array(80).fill(0);
  r.interactions.forEach(x => { counts[x.user]++; });
  const testUsers = new Set(split.test.map(x => x.user));
  counts.forEach((n, u) => assert.equal(testUsers.has(u), n >= 3));
  const two = leaveLastOut(r, { holdout: 2, valid: 0 });
  assert.equal(two.valid.length, 0);
  assert.ok(two.test.length > split.test.length);
});

test('removeHistory: cold users keep only the requested share, the rest is hidden', () => {
  const base = leaveLastOut(makeRatings({ users: 100, items: 60, seed: 2 }));
  const sp = removeHistory(base, 0.4, 0.2, { seed: 4 });
  const testUsers = new Set(base.test.map(x => x.user));
  assert.equal(sp.cold.length, Math.round(0.4 * testUsers.size));
  sp.cold.forEach(u => {
    assert.ok(testUsers.has(u));
    const before = base.train.filter(x => x.user === u).length;
    const after = sp.train.filter(x => x.user === u).length;
    assert.equal(after, Math.round(0.2 * before));
    assert.equal(sp.valid.filter(x => x.user === u).length, 0);
    // everything the model lost is recorded as hidden, and nothing is invented
    const keptKeys = new Set(sp.train.filter(x => x.user === u).map(x => x.item));
    const hidden = sp.hidden.filter(x => x.user === u).map(x => x.item);
    assert.ok(hidden.every(i => !keptKeys.has(i)));
    assert.equal(hidden.length, before - after + base.valid.filter(x => x.user === u).length);
  });
  // Warm users and the test set are untouched; the input split is untouched.
  const cold = new Set(sp.cold);
  assert.deepEqual(sp.train.filter(x => !cold.has(x.user)), base.train.filter(x => !cold.has(x.user)));
  assert.deepEqual(sp.test, base.test);
  assert.equal(base.cold.length, 0);
  // explicit ids and minKeep
  const one = removeHistory(base, [0, 1, 2], 0, { minKeep: 1 });
  [0, 1, 2].forEach(u => {
    const n = base.train.filter(x => x.user === u).length;
    assert.equal(one.train.filter(x => x.user === u).length, Math.min(1, n));
  });
});

// ---------------------------------------------------------------------------------------------
// Recommenders

test('recommend: best first, excludes seen items, ties go to the lower item id', () => {
  const split = splitFromMatrix([[1, 0, 0, 0, 0], [1, 1, 1, 0, 0], [0, 0, 0, 1, 1]], { implicit: true });
  const pop = popularity(split);
  // counts: item0 2, item1 1, item2 1, item3 1, item4 1
  assert.deepEqual(recommend(pop, 2, 3, false).map(r => r.item), [0, 1, 2]);
  assert.deepEqual(recommend(pop, 0, 3).map(r => r.item), [1, 2, 3]);
  assert.deepEqual(recommend(pop, 1, 5).map(r => r.item), [3, 4]);
  assert.deepEqual(recommend(pop, 0, 2, true, new Set([1])).map(r => r.item), [2, 3]);
  assert.equal(recommend(pop, 0, 1, false)[0].score, 2);
});

test('mf (sgd): train and validation error fall, deterministic by seed', () => {
  const split = leaveLastOut(makeRatings({ users: 120, items: 60, seed: 4 }));
  const a = mf(split, { k: 4, epochs: 20, seed: 3 });
  const b = mf(split, { k: 4, epochs: 20, seed: 3 });
  assert.deepEqual(a.history, b.history);
  assert.notDeepEqual(a.history, mf(split, { k: 4, epochs: 20, seed: 4 }).history);
  assert.equal(a.history.length, 21);
  assert.equal(a.history[0].epoch, 0);
  assert.ok(a.history[20].train < a.history[0].train * 0.9, `${a.history[0].train} -> ${a.history[20].train}`);
  assert.ok(a.history[20].validation < a.history[0].validation);
  assert.ok(a.history.every(h => Number.isFinite(h.train) && Number.isFinite(h.validation)));
  assert.equal(a.P.length, 120);
  assert.equal(a.Q[0].length, 4);
});

test('mf: more regularisation shrinks the factors; no valid split gives a null validation', () => {
  const split = leaveLastOut(makeRatings({ users: 100, items: 50, seed: 6 }));
  const norm = m => Math.sqrt(m.P.flat().reduce((s, v) => s + v * v, 0));
  assert.ok(norm(mf(split, { lambda: 1, epochs: 15 })) < norm(mf(split, { lambda: 0.01, epochs: 15 })));
  const noValid = leaveLastOut(makeRatings({ users: 60, items: 40, seed: 6 }), { valid: 0 });
  assert.ok(mf(noValid, { epochs: 3 }).history.every(h => h.validation === null));
  assert.throws(() => mf(split, { method: 'bogus' }));
});

test('mf (als): exactly recovers a fully observed rank-2 rating matrix', () => {
  // r = a . b with 2-d factors, so an exact rank-2 matrix; k = 2 and a tiny lambda must fit it.
  // The model subtracts the mean rating first, and (rank 2) + (a constant) has rank 3, so k = 3.
  const A = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 0]];
  const B = [[3, 0], [0, 2], [1, 1], [2, -1], [1, 3], [1, 0], [0, 1], [2, 2]];
  const R = A.map(a => B.map(b => a[0] * b[0] + a[1] * b[1] + 1));
  const split = splitFromMatrix(R);
  const model = mf(split, { method: 'als', k: 3, lambda: 1e-6, epochs: 40, seed: 2 });
  let worst = 0;
  R.forEach((row, u) => row.forEach((v, i) => { worst = Math.max(worst, Math.abs(model.predict(u, i) - v)); }));
  assert.ok(worst < 0.01, `worst error ${worst}`);
  const h = model.history;
  assert.ok(h[h.length - 1].train < 0.01 && h[0].train > 1);
});

test('mf (als): implicit mode trains, error falls and it beats popularity', () => {
  const split = leaveLastOut(makeRatings({ users: 200, items: 80, seed: 9 }));
  const als = mf(split, { method: 'als', k: 6, lambda: 2, unobservedWeight: 0.1, epochs: 8, seed: 1 });
  assert.ok(als.history[8].train < als.history[0].train);
  assert.ok(evaluate(als, split, 10).ndcg > evaluate(popularity(split), split, 10).ndcg * 1.15);
});

test('mf (sgd, explicit): fits the observed ratings (RMSE below the rating spread)', () => {
  const split = leaveLastOut(makeRatings({ users: 120, items: 60, seed: 12, mode: 'explicit', density: 0.2 }));
  const m = mf(split, { k: 4, epochs: 30, lambda: 0.02, lr: 0.02 });
  const sd = Math.sqrt(mean(split.train.map(x => (x.value - mean(split.train.map(y => y.value))) ** 2)));
  const h = m.history;
  assert.ok(h[h.length - 1].train < sd, `${h[h.length - 1].train} vs sd ${sd}`);
  assert.ok(h[h.length - 1].train < h[0].train);
});

test('contentBased: ranks items of the user\'s genres first and falls back to popularity for a new user', () => {
  const r = makeRatings({ users: 80, items: 60, seed: 5 });
  const split = leaveLastOut(r);
  const cb = contentBased(split);
  const u = split.test[0].user;
  const profile = cb.profile(u);
  const best = recommend(cb, u, 3).map(x => x.item);
  best.forEach(i => assert.ok(cosine(profile, r.itemAttrs[i]) > 0.5));
  // A cold user with no history is ranked purely by popularity.
  const cold = removeHistory(split, [u], 0);
  const cbCold = contentBased(cold);
  assert.deepEqual(recommend(cbCold, u, 8).map(x => x.item), recommend(popularity(cold), u, 8).map(x => x.item));
  assert.throws(() => contentBased(splitFromMatrix(M4)));
});

test('hybrid: picks popularity, content or the primary model by history length', () => {
  const split = leaveLastOut(makeRatings({ users: 100, items: 100, density: 0.15, seed: 8 }));
  const sp = removeHistory(split, [0, 1, 2, 3], 0);
  const pop = popularity(sp), cb = contentBased(sp), m = mf(sp, { epochs: 5 });
  const hy = hybrid({ primary: m, content: cb, popularity: pop, minInteractions: 5 });
  sp.cold.forEach(u => assert.equal(hy.source(u), 'popularity'));
  const rich = [...Array(100).keys()].filter(u => m.historyLength(u) >= 5);
  assert.ok(rich.length > 50);
  rich.forEach(u => assert.equal(hy.source(u), m.name));
  assert.deepEqual(recommend(hy, 0, 6).map(r => r.item), recommend(pop, 0, 6).map(r => r.item));
  assert.deepEqual(recommend(hy, rich[0], 6).map(r => r.item), recommend(m, rich[0], 6).map(r => r.item));
  // one remembered interaction -> content; without a content model -> popularity
  const one = removeHistory(split, [5], 0, { minKeep: 1 });
  const m1 = mf(one, { epochs: 2 }), c1 = contentBased(one), p1 = popularity(one);
  assert.equal(hybrid({ primary: m1, content: c1, popularity: p1 }).source(5), 'content');
  assert.equal(hybrid({ primary: m1, popularity: p1 }).source(5), 'popularity');
  assert.throws(() => hybrid({ primary: m1 }));
});

// ---------------------------------------------------------------------------------------------
// The module's lab: MF beats popularity with history, collapses without it; hybrid and content recover

const SEEDS = [1, 2, 3, 4, 5];
const worlds = new Map();
function world(seed) {
  if (!worlds.has(seed)) {
    const base = leaveLastOut(makeRatings({ users: 300, items: 100, seed }));
    const mfBase = mf(base, {});
    worlds.set(seed, { base, mfBase, popBase: popularity(base) });
  }
  return worlds.get(seed);
}
function coldWorld(seed, minKeep) {
  const { base, mfBase } = world(seed);
  const split = removeHistory(base, 0.5, 0, { seed, minKeep });
  const pop = popularity(split), m = mf(split, {}), cb = contentBased(split), uk = userKnn(split);
  const hy = hybrid({ primary: m, content: cb, popularity: pop, minInteractions: 5 });
  const ev = (model, users = split.cold) => evaluate(model, split, 10, { users });
  return { split, pop, m, cb, uk, hy, ev, warmMf: evaluate(mfBase, base, 10).ndcg };
}

test('MF beats popularity for users with history, on every seed, by a margin', () => {
  SEEDS.forEach(seed => {
    const { base, mfBase, popBase } = world(seed);
    const mfE = evaluate(mfBase, base, 10), popE = evaluate(popBase, base, 10);
    assert.ok(mfE.ndcg > popE.ndcg * 1.2, `seed ${seed}: mf ${mfE.ndcg} vs popularity ${popE.ndcg}`);
    assert.ok(mfE.hitRate > popE.hitRate + 0.1, `seed ${seed}: hit ${mfE.hitRate} vs ${popE.hitRate}`);
  });
});

test('coverage: popularity recommends a narrow slice of the catalogue, MF a much wider one', () => {
  SEEDS.forEach(seed => {
    const { base, mfBase, popBase } = world(seed);
    const cMf = evaluate(mfBase, base, 10).coverage, cPop = evaluate(popBase, base, 10).coverage;
    assert.ok(cPop < cMf * 0.8, `seed ${seed}: popularity ${cPop} vs mf ${cMf}`);
    assert.ok(cPop < 0.5);
  });
});

test('cold start with no history: MF falls to popularity or worse, user-user kNN collapses, hybrid recovers', () => {
  const rows = SEEDS.map(seed => {
    const w = coldWorld(seed, 0);
    return { seed, mf: w.ev(w.m).ndcg, pop: w.ev(w.pop).ndcg, uk: w.ev(w.uk).ndcg, hy: w.ev(w.hy).ndcg, cb: w.ev(w.cb).ndcg, warmMf: w.warmMf, w };
  });
  rows.forEach(r => {
    // MF is no better than popularity (within 5%) and far below what it does for users with history.
    assert.ok(r.mf <= r.pop * 1.05, `seed ${r.seed}: mf ${r.mf} vs popularity ${r.pop}`);
    assert.ok(r.mf < r.warmMf * 0.75, `seed ${r.seed}: cold ${r.mf} vs warm ${r.warmMf}`);
    // user-user kNN has nothing to compare, so it is the worst of all.
    assert.ok(r.uk < r.pop * 0.6, `seed ${r.seed}: kNN ${r.uk} vs popularity ${r.pop}`);
    // With zero history the hybrid IS popularity, and the content model reduces to popularity too.
    close(r.hy, r.pop);
    close(r.cb, r.pop);
    const users = r.w.split.cold;
    users.forEach(u => assert.equal(r.w.hy.source(u), 'popularity'));
  });
  assert.ok(mean(rows.map(r => r.hy)) > mean(rows.map(r => r.mf)) * 1.1);
});

test('cold start with one interaction: MF stays well below its warm level, content and hybrid recover', () => {
  const rows = SEEDS.map(seed => {
    const w = coldWorld(seed, 1);
    return { seed, mf: w.ev(w.m).ndcg, pop: w.ev(w.pop).ndcg, cb: w.ev(w.cb).ndcg, hy: w.ev(w.hy).ndcg, warmMf: w.warmMf, w };
  });
  rows.forEach(r => {
    assert.ok(r.cb > r.pop * 1.05, `seed ${r.seed}: content ${r.cb} vs popularity ${r.pop}`);
    close(r.hy, r.cb);
    r.w.split.cold.forEach(u => assert.equal(r.w.hy.source(u), r.w.split.train.some(x => x.user === u) ? 'content' : 'popularity'));
  });
  // Pooled over the five seeds the content-based fallback clearly beats popularity, and the hybrid beats MF.
  assert.ok(mean(rows.map(r => r.cb)) > mean(rows.map(r => r.pop)) * 1.3);
  assert.ok(mean(rows.map(r => r.hy)) > mean(rows.map(r => r.mf)) * 1.05);
  assert.ok(mean(rows.map(r => r.mf)) < mean(rows.map(r => r.warmMf)) * 0.85);
});

test('evaluate: history-length buckets partition the users and show the cold-start gradient', () => {
  const w = coldWorld(2, 0);
  const all = evaluate(w.m, w.split, 10);
  assert.equal(all.buckets.map(b => b.label).join(','), '<3,3-7,8-15,16+');
  assert.equal(all.buckets.reduce((s, b) => s + b.users, 0), all.users);
  all.buckets.forEach(b => assert.ok(b.users > 0, `bucket ${b.label} is empty`));
  // The cold users are all in the first bucket (history 0).
  assert.ok(all.buckets[0].users >= w.split.cold.length);
  // MF does better with more history: the longest-history bucket beats the shortest.
  assert.ok(all.buckets[3].ndcg > all.buckets[0].ndcg, `${all.buckets[3].ndcg} vs ${all.buckets[0].ndcg}`);
  const custom = evaluate(w.pop, w.split, 5, { buckets: [1] });
  assert.equal(custom.buckets.map(b => b.label).join(','), '<1,1+');
  assert.equal(custom.k, 5);
  // the overall figure is the user-weighted mean of the buckets
  close(all.ndcg, all.buckets.reduce((s, b) => s + b.ndcg * b.users, 0) / all.users);
  assert.ok(all.diversity > 0 && all.diversity < 1);
  assert.ok(all.precision <= all.hitRate + 1e-12);
});

test('evaluate: hidden items of a cold user are skipped, so popularity is not charged for slots it cannot win', () => {
  const w = coldWorld(3, 0);
  const rel = new Map();
  w.split.test.forEach(x => rel.set(x.user, [x.item]));
  const naive = mean(w.split.cold.map(u => ndcgAtK(recommend(w.pop, u, 10).map(r => r.item), rel.get(u), 10)));
  const fair = evaluate(w.pop, w.split, 10, { users: w.split.cold }).ndcg;
  // A hidden item was really consumed, so it can never be the test item; recommending it is a wasted slot.
  assert.ok(fair > naive * 1.2, `fair ${fair} vs naive ${naive}`);
  const u = w.split.cold[0];
  const hidden = new Set(w.split.hidden.filter(x => x.user === u).map(x => x.item));
  assert.ok(hidden.size > 0 && recommend(w.pop, u, 10, true, hidden).every(r => !hidden.has(r.item)));
});

test('evaluate: explicit mode only counts test ratings at or above the threshold', () => {
  const r = makeRatings({ users: 150, items: 60, seed: 3, mode: 'explicit', density: 0.2 });
  const split = leaveLastOut(r, { relevantThreshold: 4 });
  const pop = popularity(split);
  const users = new Set(split.test.filter(x => x.value >= 4).map(x => x.user));
  const e = evaluate(pop, split, 10);
  assert.equal(e.users, users.size);
  assert.ok(e.users < new Set(split.test.map(x => x.user)).size);
  const strict = evaluate(pop, leaveLastOut(r, { relevantThreshold: 5 }), 10);
  assert.ok(strict.users < e.users);
});
