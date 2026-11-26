// Recommender helpers for the "Recommender systems" module: generated user-item data, splits,
// recommenders, ranking metrics and an evaluation that splits users by how much history they have.
// Pure functions, seeded and reproducible (rng.js), tested in recsys.test.js.
//
// Conventions. Users are 0..users-1 and items 0..items-1. An interaction is
// { user, item, value }: value is 1 in 'implicit' mode (a click, a play, a purchase) and a rating
// 1..5 in 'explicit' mode. A "model" is the object returned by popularity, userKnn, itemKnn, mf,
// contentBased or hybrid: it has scores(user) -> Float64Array of length items (higher = better),
// score(user, item), seen(user) -> Set of items the user is known to have, and historyLength(user)
// (number of TRAIN interactions the model knows about for that user). Ranking ties are broken by
// the lower item id, so a ranking never depends on the sort implementation.
//
// Notes for lab authors.
//   - Explicit mode is for rating prediction (the mf history RMSE) and for the kNN and content
//     models. An explicit MF trained on the observed ratings is a poor top-N ranker (it never learns
//     which cells get observed), so "MF beats popularity" is asserted in IMPLICIT mode only.
//   - Recommended ALS settings in implicit mode: { method: 'als', k: 6, lambda: 2,
//     unobservedWeight: 0.1, epochs: 8 }. With the small default lambda it can rank below popularity.
//   - The cold-start and coverage results are tested at makeRatings({ users: 300, items: 100 }),
//     seeds 1-5, leaveLastOut defaults, half of the test users cold (removeHistory(split, 0.5, 0,
//     { seed, minKeep })), mf defaults, hybrid minInteractions 5, k = 10. With NO history at all,
//     "recovers" means the hybrid and the content model equal popularity (MF is no better than
//     that and falls well below its warm level); with one or more interactions content and hybrid
//     beat popularity.
//
// API
//   Data
//     makeRatings({ users = 120, items = 80, factors = 3, density = 0.12, seed = 1, noise = 0.5,
//                   popularitySkew = 1, mode = 'implicit', genres = 6, affinity = 3,
//                   activitySpread = 0.6, genreWeight = 1.5 })
//                                  -> { mode, users, items, factors, genres, genreNames, itemAttrs,
//                                       interactions, density, truth }.
//                                     Users and items get latent vectors (items are built from their
//                                     genres plus a little noise, users from 1 or 2 favourite genres).
//                                     The affinity of a pair is the standardised dot product plus
//                                     genreWeight * (share of the item's genres the user likes),
//                                     standardised again, plus `noise` (an sd, in units of the
//                                     affinity's sd). A pair is observed
//                                     with probability ~ user activity * item popularity *
//                                     exp(affinity * pair affinity), scaled so the expected share of
//                                     observed pairs is `density`. Item popularity follows rank^-skew
//                                     (ranks are a random permutation, so popularity is unrelated to
//                                     the item id or genre); skew 0 = every item equally likely.
//                                     Explicit mode rates observed pairs 1..5 (3 + 1.1 * affinity,
//                                     rounded); implicit mode stores value 1. Each interaction carries
//                                     `t`, its position in the user's own timeline (0 = oldest).
//                                     itemAttrs[i] is the item's 0/1 genre vector (generated attributes
//                                     for content-based methods); truth holds the latent vectors,
//                                     the item popularity weights and trueAffinity(user, item).
//     splitFromMatrix(R, { implicit = false })
//                                  -> a split (below) whose train holds every nonzero cell of the
//                                     dense matrix R (0 = missing); for hand-worked examples.
//
//   Splits (a split is { mode, users, items, train, valid, test, itemAttrs, genreNames,
//           relevantThreshold, cold })
//     leaveLastOut(ratings, { holdout = 1, valid = 1, relevantThreshold = 4 })
//                                  -> per user, the last `holdout` interactions by time become test,
//                                     the `valid` before them become valid, the rest train. A user
//                                     with fewer than holdout + valid + 1 interactions keeps
//                                     everything in train (no test). In explicit mode a test item
//                                     counts as relevant only when its rating >= relevantThreshold.
//                                     Models train on `train` only; valid feeds the mf history;
//                                     seen(user) = train + valid items (a recommendation never
//                                     repeats them).
//     removeHistory(split, users, keepFraction = 0, { seed = 1, minKeep = 0 })
//                                  -> a new split where each cold user keeps only
//                                     max(minKeep, round(keepFraction * n)) randomly chosen train
//                                     interactions (their valid interactions are dropped too).
//                                     `users` is an array of user ids, or a fraction in (0, 1] of the
//                                     users that have test items (chosen by seed). `cold` lists them;
//                                     `hidden` holds the interactions taken away from the model and
//                                     `removed` counts the train interactions dropped.
//
//   Recommenders (all take a split; none read valid or test)
//     popularity(split)            -> every user gets the same ranking: train interaction counts.
//     userKnn(split, { k = 20 })   -> user-user: cosine similarity of the interaction vectors (missing
//                                     = 0); score(user, item) = sum of sim * value over the k most
//                                     similar users who have the item. model.similarity(a, b) and
//                                     model.neighbours(user) expose the similarities and the chosen
//                                     neighbour ids (best first); model.predict(user, item) is the
//                                     weighted average sum(sim * value) / sum(sim) over the same
//                                     neighbours who have the item (null if none).
//     itemKnn(split, { k = 20 })   -> item-item cosine on the user columns; score(user, item) =
//                                     sum of sim(item, j) * value(user, j) over the k items most
//                                     similar to `item` that the user has. similarity(i, j) and
//                                     neighbours(item) work as for userKnn. predict(user, item) is the
//                                     weighted average over those neighbours (null if none).
//     mf(split, { k = 8, lambda = 0.05, epochs = 30, seed = 1, method = 'sgd', lr = 0.05,
//                 negatives = 3, biases = true, unobservedWeight = 0.05 })
//                                  -> matrix factorisation, score = mu + bu + bi + p . q with L2
//                                     penalty lambda. method 'sgd': one sgdStep per train interaction
//                                     per epoch (implicit mode adds `negatives` sampled unobserved
//                                     items per positive, target 0). method 'als': alternating exact
//                                     ridge solves (no biases; implicit mode gives unobserved cells
//                                     weight unobservedWeight and target 0). model.history is
//                                     [{ epoch, train, validation }] from epoch 0 (the untrained
//                                     start): root-mean-square error on the train interactions
//                                     (implicit mode: plus one fixed sampled unobserved pair per
//                                     positive, target 0) and on the valid interactions the same way
//                                     (validation is null when the split has no valid).
//                                     model.P and model.Q are the user and item factors.
//     sgdStep(p, q, r, { lr, lambda, bu = 0, bi = 0, mu = 0 })
//                                  -> one SGD step on one rating: pred = mu + bu + bi + p . q,
//                                     err = r - pred, p += lr * (err * q - lambda * p), q += lr *
//                                     (err * p - lambda * q) (both from the OLD p and q), bu += lr *
//                                     (err - lambda * bu), bi likewise. Returns { p, q, bu, bi, err,
//                                     pred } (new arrays; inputs untouched).
//     contentBased(split, { popularityTieBreak = 0.001 })
//                                  -> a user profile = sum of the genre vectors of the items in their
//                                     train history (weighted by value - 2, floor 0, in explicit
//                                     mode); score = cosine(profile, item genre vector) plus
//                                     popularityTieBreak * item popularity share (so a user with no
//                                     history, or items in the same genre, fall back to popularity).
//                                     model.profile(user) returns the genre profile.
//     hybrid({ primary, content = null, popularity, minInteractions = 5 })
//                                  -> uses `primary` for users with at least minInteractions train
//                                     interactions; below that it uses `content` when the user has any
//                                     history (else, or when content is null, `popularity`).
//                                     model.source(user) names the model used for that user.
//     recommend(model, user, k = 10, excludeSeen = true, exclude = null)
//                                  -> the top-k [{ item, score }], best first; `exclude` is an
//                                     optional extra Set of item ids to skip. evaluate() skips a cold
//                                     user's hidden items; to show lists that match what evaluate()
//                                     scored, pass exclude = a Set built from split.hidden.
//
//   Ranking metrics. `ranked` is an array of item ids best first; `relevant` is an array or Set
//   of item ids. Only the first k of `ranked` are read.
//     precisionAtK(ranked, relevant, k)  -> relevant hits in the top k / k
//     recallAtK(ranked, relevant, k)     -> relevant hits in the top k / |relevant| (0 if none)
//     ndcgAtK(ranked, relevant, k)       -> DCG / ideal DCG with gain 1 and discount log2(rank + 1)
//                                           (rank 1 = best): 1 = every relevant item first.
//     hitAtK(ranked, relevant, k)        -> 1 when any of the top k is relevant, else 0
//     hitRate(lists, relevantSets, k)    -> mean hitAtK over users (parallel arrays)
//     catalogueCoverage(lists, items)    -> distinct items in all the lists / items
//     intraListDiversity(list, vectors)  -> mean over pairs of 1 - cosine(vectors[a], vectors[b]);
//                                           0 for a list of fewer than two items.
//     cosine(a, b)                       -> cosine of two dense arrays (0 if either is all zeros)
//
//   Evaluation
//     evaluate(model, split, k = 10, { users = null, buckets = [3, 8, 16] })
//                                  -> { k, users, precision, recall, ndcg, hitRate, coverage,
//                                       diversity, buckets } over the users that have a relevant test
//                                     item (optionally only `users`). A cold user's hidden items are
//                                     skipped too (they were really consumed, so they can never be the
//                                     test item), else popularity would waste slots on them. buckets is one row per group of
//                                     users by train history length, edges as given ('<3', '3-7',
//                                     '8-15', '16+'), each { label, lo, hi, users, precision, recall,
//                                     ndcg, hitRate, coverage, diversity } (metrics null when the
//                                     group is empty). Recommendations exclude seen items.
import { rng, gauss, shuffle } from './rng.js';

// ---------------------------------------------------------------------------------------------
// Small helpers

const GENRE_NAMES = ['drama', 'comedy', 'action', 'sci-fi', 'romance', 'thriller', 'documentary', 'animation'];

export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function gaussVec(random, n, scale = 1) { return Array.from({ length: n }, () => gauss(random) * scale); }
function mean(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }

// ---------------------------------------------------------------------------------------------
// Data

export function makeRatings({
  users = 120, items = 80, factors = 3, density = 0.12, seed = 1, noise = 0.5, popularitySkew = 1,
  mode = 'implicit', genres = 6, affinity = 3, activitySpread = 0.6, genreWeight = 1.5,
} = {}) {
  if (mode !== 'implicit' && mode !== 'explicit') throw new Error(`makeRatings: mode must be 'implicit' or 'explicit', got ${mode}`);
  if (!(density > 0 && density < 1)) throw new Error('makeRatings: density must be in (0, 1)');
  const random = rng(seed);
  const G = Math.max(2, Math.min(genres, GENRE_NAMES.length));
  const genreEmb = Array.from({ length: G }, () => gaussVec(random, factors));

  // Items: one primary genre, sometimes a second; latent vector = mean of genre embeddings + noise.
  const itemAttrs = [], itemFactors = [];
  for (let i = 0; i < items; i++) {
    const g1 = Math.floor(random() * G);
    const gs = [g1];
    if (random() < 0.3) { const g2 = (g1 + 1 + Math.floor(random() * (G - 1))) % G; gs.push(g2); }
    const attrs = new Array(G).fill(0);
    gs.forEach(g => { attrs[g] = 1; });
    const q = new Array(factors).fill(0);
    gs.forEach(g => { for (let f = 0; f < factors; f++) q[f] += genreEmb[g][f] / gs.length; });
    const jitter = gaussVec(random, factors, 0.3);
    itemAttrs.push(attrs);
    itemFactors.push(q.map((v, f) => v + jitter[f]));
  }
  // Users: one or two favourite genres plus personal taste.
  const userFactors = [], userFavs = [];
  for (let u = 0; u < users; u++) {
    const favs = [Math.floor(random() * G)];
    if (random() < 0.5) favs.push(Math.floor(random() * G));
    const p = new Array(factors).fill(0);
    favs.forEach(g => { for (let f = 0; f < factors; f++) p[f] += genreEmb[g][f] / favs.length; });
    const jitter = gaussVec(random, factors, 0.4);
    userFactors.push(p.map((v, f) => v + jitter[f]));
    userFavs.push(favs);
  }
  // Standardised affinity of every pair.
  const standardise = rows => {
    const flat = rows.flat();
    const m = mean(flat);
    const s = Math.sqrt(mean(flat.map(v => (v - m) ** 2))) || 1;
    return rows.map(row => row.map(v => (v - m) / s));
  };
  const latent = standardise(userFactors.map(p => itemFactors.map(q => dot(p, q))));
  // Share of the item's genres that the user likes: taste that the genre attributes can see.
  const match = userFavs.map(favs => itemAttrs.map(a => favs.reduce((s, g) => s + a[g], 0) / (a.reduce((x, y) => x + y, 0) * favs.length)));
  const aff = standardise(latent.map((row, u) => row.map((v, i) => v + genreWeight * match[u][i])));
  // Item popularity weights from a random rank permutation, normalised to mean 1.
  const perm = shuffle(Array.from({ length: items }, (_, i) => i), random);
  const popRaw = new Array(items);
  perm.forEach((item, rank) => { popRaw[item] = (rank + 1) ** -popularitySkew; });
  const popMean = mean(popRaw);
  const popularityWeights = popRaw.map(v => v / popMean);
  const activity = Array.from({ length: users }, () => Math.exp(activitySpread * gauss(random)));
  // Noisy affinity actually used for this pair.
  const noisy = aff.map(row => row.map(a => a + noise * gauss(random)));
  const base = noisy.map((row, u) => row.map((a, i) => activity[u] * popularityWeights[i] * Math.exp(affinity * a)));
  const cap = 0.9;
  const expected = scale => { let s = 0; for (const row of base) for (const b of row) s += Math.min(cap, scale * b); return s / (users * items); };
  let lo = 0, hi = 1;
  while (expected(hi) < density && hi < 1e12) hi *= 2;
  for (let it = 0; it < 60; it++) { const mid = (lo + hi) / 2; if (expected(mid) < density) lo = mid; else hi = mid; }
  const scale = (lo + hi) / 2;

  const interactions = [];
  for (let u = 0; u < users; u++) {
    const mine = [];
    for (let i = 0; i < items; i++) {
      if (random() < Math.min(cap, scale * base[u][i])) {
        const value = mode === 'implicit' ? 1 : Math.max(1, Math.min(5, Math.round(3 + 1.1 * noisy[u][i])));
        mine.push({ user: u, item: i, value });
      }
    }
    shuffle(mine, random).forEach((x, t) => interactions.push({ ...x, t }));
  }
  return {
    mode, users, items, factors, genres: G, genreNames: GENRE_NAMES.slice(0, G), itemAttrs, interactions,
    density: interactions.length / (users * items),
    truth: { userFactors, itemFactors, popularityWeights, trueAffinity: (u, i) => aff[u][i] },
  };
}

export function splitFromMatrix(R, { implicit = false } = {}) {
  const train = [];
  R.forEach((row, user) => row.forEach((v, item) => { if (v !== 0) train.push({ user, item, value: implicit ? 1 : v }); }));
  return {
    mode: implicit ? 'implicit' : 'explicit', users: R.length, items: R[0].length, train, valid: [], test: [],
    itemAttrs: null, genreNames: [], relevantThreshold: 4, cold: [],
  };
}

// ---------------------------------------------------------------------------------------------
// Splits

export function leaveLastOut(ratings, { holdout = 1, valid = 1, relevantThreshold = 4 } = {}) {
  const byUser = Array.from({ length: ratings.users }, () => []);
  ratings.interactions.forEach(x => byUser[x.user].push(x));
  const train = [], validSet = [], test = [];
  const strip = ({ user, item, value }) => ({ user, item, value });
  byUser.forEach(list => {
    list.sort((a, b) => a.t - b.t);
    if (list.length < holdout + valid + 1) { list.forEach(x => train.push(strip(x))); return; }
    const nTrain = list.length - holdout - valid;
    list.forEach((x, idx) => {
      if (idx < nTrain) train.push(strip(x));
      else if (idx < nTrain + valid) validSet.push(strip(x));
      else test.push(strip(x));
    });
  });
  return {
    mode: ratings.mode, users: ratings.users, items: ratings.items, train, valid: validSet, test,
    itemAttrs: ratings.itemAttrs, genreNames: ratings.genreNames, relevantThreshold, cold: [],
  };
}

export function removeHistory(split, users, keepFraction = 0, { seed = 1, minKeep = 0 } = {}) {
  const random = rng(seed);
  let ids;
  if (typeof users === 'number') {
    const testUsers = [...new Set(split.test.map(x => x.user))].sort((a, b) => a - b);
    const n = Math.max(0, Math.min(testUsers.length, Math.round(users * testUsers.length)));
    ids = shuffle(testUsers, random).slice(0, n);
  } else ids = [...users];
  ids = [...new Set(ids)].sort((a, b) => a - b);
  const cold = new Set(ids);
  const byUser = new Map();
  split.train.forEach((x, idx) => { if (cold.has(x.user)) { if (!byUser.has(x.user)) byUser.set(x.user, []); byUser.get(x.user).push(idx); } });
  const drop = new Set();
  ids.forEach(u => {
    const idxs = byUser.get(u) || [];
    const keep = Math.min(idxs.length, Math.max(minKeep, Math.round(keepFraction * idxs.length)));
    shuffle(idxs, random).slice(keep).forEach(i => drop.add(i));
  });
  return {
    ...split,
    train: split.train.filter((_, idx) => !drop.has(idx)),
    valid: split.valid.filter(x => !cold.has(x.user)),
    hidden: [...(split.hidden || []), ...split.train.filter((_, idx) => drop.has(idx)), ...split.valid.filter(x => cold.has(x.user))],
    cold: [...new Set([...(split.cold || []), ...ids])].sort((a, b) => a - b),
    removed: drop.size,
  };
}

// ---------------------------------------------------------------------------------------------
// Shared model plumbing

const INDEX_CACHE = new WeakMap();
function indexSplit(split) {
  if (INDEX_CACHE.has(split) && INDEX_CACHE.get(split).train === split.train) return INDEX_CACHE.get(split);
  const trainByUser = Array.from({ length: split.users }, () => []);
  const trainByItem = Array.from({ length: split.items }, () => []);
  const seen = Array.from({ length: split.users }, () => new Set());
  split.train.forEach(({ user, item, value }) => {
    trainByUser[user].push({ i: item, v: value });
    trainByItem[item].push({ i: user, v: value });
    seen[user].add(item);
  });
  const trainSet = seen.map(s => new Set(s));
  (split.valid || []).forEach(x => seen[x.user].add(x.item));
  const counts = new Float64Array(split.items);
  split.train.forEach(x => { counts[x.item] += 1; });
  const idx = { train: split.train, trainByUser, trainByItem, seen, trainSet, counts };
  INDEX_CACHE.set(split, idx);
  return idx;
}

function makeModel(name, split, scoresFn, extra = {}) {
  const idx = indexSplit(split);
  return {
    name, users: split.users, items: split.items, split,
    scores: scoresFn,
    score: (u, i) => scoresFn(u)[i],
    seen: u => idx.seen[u],
    historyLength: u => idx.trainByUser[u].length,
    ...extra,
  };
}

function topKnn(sims, self, k) {
  const cand = [];
  for (let j = 0; j < sims.length; j++) if (j !== self && sims[j] > 0) cand.push(j);
  cand.sort((a, b) => sims[b] - sims[a] || a - b);
  return cand.slice(0, k);
}

// ---------------------------------------------------------------------------------------------
// Recommenders

export function popularity(split) {
  const { counts } = indexSplit(split);
  const s = Float64Array.from(counts);
  return makeModel('popularity', split, () => s);
}

// Cosine similarity between all rows given as sparse lists [{ i, v }] (i indexes the other axis).
function sparseCosineMatrix(rows, otherSize) {
  const n = rows.length;
  const norms = rows.map(r => Math.sqrt(r.reduce((s, x) => s + x.v * x.v, 0)));
  const inverted = Array.from({ length: otherSize }, () => []);
  rows.forEach((r, a) => r.forEach(x => inverted[x.i].push({ a, v: x.v })));
  const S = new Float64Array(n * n);
  inverted.forEach(list => {
    for (const x of list) for (const y of list) if (x.a !== y.a) S[x.a * n + y.a] += x.v * y.v;
  });
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
    const d = norms[a] * norms[b];
    S[a * n + b] = d === 0 ? 0 : S[a * n + b] / d;
  }
  return S;
}

export function userKnn(split, { k = 20 } = {}) {
  const idx = indexSplit(split);
  const U = split.users;
  const S = sparseCosineMatrix(idx.trainByUser, split.items);
  const neighbours = Array.from({ length: U }, (_, u) => topKnn(S.subarray(u * U, (u + 1) * U), u, k));
  const parts = u => {
    const num = new Float64Array(split.items), den = new Float64Array(split.items);
    neighbours[u].forEach(v => {
      const sim = S[u * U + v];
      idx.trainByUser[v].forEach(({ i, v: val }) => { num[i] += sim * val; den[i] += sim; });
    });
    return { num, den };
  };
  return makeModel('userKnn', split, u => parts(u).num, {
    k, similarity: (a, b) => S[a * U + b], neighbours: u => neighbours[u].slice(),
    predict(u, i) { const { num, den } = parts(u); return den[i] > 0 ? num[i] / den[i] : null; },
  });
}

export function itemKnn(split, { k = 20 } = {}) {
  const idx = indexSplit(split);
  const I = split.items;
  const S = sparseCosineMatrix(idx.trainByItem, split.users);
  const neighbours = Array.from({ length: I }, (_, i) => topKnn(S.subarray(i * I, (i + 1) * I), i, k));
  const parts = u => {
    const have = new Map(idx.trainByUser[u].map(x => [x.i, x.v]));
    const num = new Float64Array(I), den = new Float64Array(I);
    for (let i = 0; i < I; i++) {
      for (const j of neighbours[i]) {
        if (have.has(j)) { const sim = S[i * I + j]; num[i] += sim * have.get(j); den[i] += sim; }
      }
    }
    return { num, den };
  };
  return makeModel('itemKnn', split, u => parts(u).num, {
    k, similarity: (a, b) => S[a * I + b], neighbours: i => neighbours[i].slice(),
    predict(u, i) { const { num, den } = parts(u); return den[i] > 0 ? num[i] / den[i] : null; },
  });
}

export function sgdStep(p, q, r, { lr, lambda, bu = 0, bi = 0, mu = 0 }) {
  const pred = mu + bu + bi + dot(p, q);
  const err = r - pred;
  return {
    p: p.map((x, f) => x + lr * (err * q[f] - lambda * x)),
    q: q.map((x, f) => x + lr * (err * p[f] - lambda * x)),
    bu: bu + lr * (err - lambda * bu),
    bi: bi + lr * (err - lambda * bi),
    err, pred,
  };
}

// Solve the small symmetric positive-definite system A x = b (A is k x k, modified in place).
function solveSmall(A, b) {
  const n = b.length;
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]];
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c];
      for (let j = c; j < n; j++) A[r][j] -= f * A[c][j];
      b[r] -= f * b[c];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let j = r + 1; j < n; j++) s -= A[r][j] * x[j];
    x[r] = s / A[r][r];
  }
  return x;
}

export function mf(split, {
  k = 8, lambda = 0.05, epochs = 30, seed = 1, method = 'sgd', lr = 0.05, negatives = 3, biases = true,
  unobservedWeight = 0.05,
} = {}) {
  if (method !== 'sgd' && method !== 'als') throw new Error(`mf: method must be 'sgd' or 'als', got ${method}`);
  const implicit = split.mode === 'implicit';
  const idx = indexSplit(split);
  const U = split.users, I = split.items;
  const random = rng(seed);
  const P = Array.from({ length: U }, () => gaussVec(random, k, 0.1));
  const Q = Array.from({ length: I }, () => gaussVec(random, k, 0.1));
  const bu = new Array(U).fill(0), bi = new Array(I).fill(0);
  const nNeg = implicit && method === 'sgd' ? negatives : 0;
  const targetOf = v => (implicit ? 1 : v);
  let mu = 0;
  if (method === 'sgd') mu = implicit ? 1 / (1 + nNeg) : mean(split.train.map(x => x.value));
  else if (!implicit) mu = mean(split.train.map(x => x.value));
  const useBias = biases && method === 'sgd';
  const predict = (u, i) => mu + (useBias ? bu[u] + bi[i] : 0) + dot(P[u], Q[i]);

  // Fixed evaluation pairs for the history: the real cells, plus (implicit) one sampled unobserved
  // pair per positive with target 0.
  const evalRandom = rng((seed ^ 0x9e3779b1) >>> 0);
  const pairsFor = list => {
    const out = list.map(x => ({ u: x.user, i: x.item, y: targetOf(x.value) }));
    if (implicit) {
      for (const x of list) {
        for (let tries = 0; tries < 50; tries++) {
          const j = Math.floor(evalRandom() * I);
          if (!idx.trainSet[x.user].has(j) && j !== x.item) { out.push({ u: x.user, i: j, y: 0 }); break; }
        }
      }
    }
    return out;
  };
  const trainPairs = pairsFor(split.train);
  const validPairs = split.valid && split.valid.length ? pairsFor(split.valid) : null;
  const rmse = pairs => Math.sqrt(mean(pairs.map(p => (p.y - predict(p.u, p.i)) ** 2)));
  const history = [{ epoch: 0, train: rmse(trainPairs), validation: validPairs ? rmse(validPairs) : null }];
  const record = epoch => history.push({ epoch, train: rmse(trainPairs), validation: validPairs ? rmse(validPairs) : null });

  if (method === 'sgd') {
    const order = Array.from({ length: split.train.length }, (_, n) => n);
    for (let epoch = 1; epoch <= epochs; epoch++) {
      shuffle(order, random).forEach(n => {
        const { user: u, item: i, value } = split.train[n];
        const apply = (item, target) => {
          const r = sgdStep(P[u], Q[item], target, { lr, lambda, bu: useBias ? bu[u] : 0, bi: useBias ? bi[item] : 0, mu });
          P[u] = r.p; Q[item] = r.q;
          if (useBias) { bu[u] = r.bu; bi[item] = r.bi; }
        };
        apply(i, targetOf(value));
        for (let s = 0; s < nNeg; s++) {
          for (let tries = 0; tries < 20; tries++) {
            const j = Math.floor(random() * I);
            if (!idx.trainSet[u].has(j)) { apply(j, 0); break; }
          }
        }
      });
      record(epoch);
    }
  } else {
    const lam = Math.max(lambda, 1e-9);
    const half = (target, other, lists) => {
      let gram = null;
      if (implicit) {
        gram = Array.from({ length: k }, () => new Array(k).fill(0));
        other.forEach(q => { for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) gram[a][b] += q[a] * q[b]; });
      }
      lists.forEach((list, row) => {
        const A = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => (a === b ? lam : 0) + (implicit ? unobservedWeight * gram[a][b] : 0)));
        const rhs = new Array(k).fill(0);
        const w = implicit ? 1 - unobservedWeight : 1;
        list.forEach(({ i, v }) => {
          const q = other[i], y = implicit ? 1 : v - mu;
          for (let a = 0; a < k; a++) { rhs[a] += y * q[a]; for (let b = 0; b < k; b++) A[a][b] += w * q[a] * q[b]; }
        });
        target[row] = solveSmall(A, rhs);
      });
    };
    for (let epoch = 1; epoch <= epochs; epoch++) {
      half(P, Q, idx.trainByUser);
      half(Q, P, idx.trainByItem);
      record(epoch);
    }
  }
  const scoresFn = u => Float64Array.from({ length: I }, (_, i) => predict(u, i));
  return makeModel(`mf-${method}`, split, scoresFn, { history, P, Q, mu, predict, k, lambda, method });
}

export function contentBased(split, { popularityTieBreak = 0.001 } = {}) {
  if (!split.itemAttrs) throw new Error('contentBased: the split has no itemAttrs');
  const idx = indexSplit(split);
  const attrs = split.itemAttrs;
  const G = attrs[0].length;
  const maxCount = Math.max(1, ...idx.counts);
  const weight = v => (split.mode === 'implicit' ? 1 : Math.max(v - 2, 0));
  const scoresFn = u => {
    const profile = new Array(G).fill(0);
    idx.trainByUser[u].forEach(({ i, v }) => { const w = weight(v); for (let g = 0; g < G; g++) profile[g] += w * attrs[i][g]; });
    return Float64Array.from({ length: split.items }, (_, i) => cosine(profile, attrs[i]) + popularityTieBreak * idx.counts[i] / maxCount);
  };
  return makeModel('content', split, scoresFn, { profile: u => {
    const profile = new Array(G).fill(0);
    idx.trainByUser[u].forEach(({ i, v }) => { const w = weight(v); for (let g = 0; g < G; g++) profile[g] += w * attrs[i][g]; });
    return profile;
  } });
}

export function hybrid({ primary, content = null, popularity: pop, minInteractions = 5 }) {
  if (!primary || !pop) throw new Error('hybrid: needs primary and popularity models');
  const pick = u => {
    const n = primary.historyLength(u);
    if (n >= minInteractions) return primary;
    return n > 0 && content ? content : pop;
  };
  return {
    name: 'hybrid', users: primary.users, items: primary.items, split: primary.split, minInteractions,
    scores: u => pick(u).scores(u),
    score: (u, i) => pick(u).scores(u)[i],
    seen: u => primary.seen(u),
    historyLength: u => primary.historyLength(u),
    source: u => pick(u).name,
  };
}

export function recommend(model, user, k = 10, excludeSeen = true, exclude = null) {
  const s = model.scores(user);
  const seen = excludeSeen ? model.seen(user) : null;
  const cand = [];
  for (let i = 0; i < s.length; i++) if ((!seen || !seen.has(i)) && !(exclude && exclude.has(i))) cand.push(i);
  cand.sort((a, b) => s[b] - s[a] || a - b);
  return cand.slice(0, k).map(item => ({ item, score: s[item] }));
}

// ---------------------------------------------------------------------------------------------
// Ranking metrics

const asSet = x => (x instanceof Set ? x : new Set(x));
const hits = (ranked, relevant, k) => { const rel = asSet(relevant); let h = 0; for (let r = 0; r < Math.min(k, ranked.length); r++) if (rel.has(ranked[r])) h++; return h; };

export function precisionAtK(ranked, relevant, k) { return k > 0 ? hits(ranked, relevant, k) / k : 0; }
export function recallAtK(ranked, relevant, k) { const n = asSet(relevant).size; return n === 0 ? 0 : hits(ranked, relevant, k) / n; }
export function hitAtK(ranked, relevant, k) { return hits(ranked, relevant, k) > 0 ? 1 : 0; }
export function ndcgAtK(ranked, relevant, k) {
  const rel = asSet(relevant);
  if (rel.size === 0) return 0;
  let dcg = 0;
  for (let r = 0; r < Math.min(k, ranked.length); r++) if (rel.has(ranked[r])) dcg += 1 / Math.log2(r + 2);
  let ideal = 0;
  for (let r = 0; r < Math.min(k, rel.size); r++) ideal += 1 / Math.log2(r + 2);
  return dcg / ideal;
}
export function hitRate(lists, relevantSets, k) { return lists.length ? mean(lists.map((l, u) => hitAtK(l, relevantSets[u], k))) : 0; }
export function catalogueCoverage(lists, items) { const s = new Set(); lists.forEach(l => l.forEach(i => s.add(i))); return s.size / items; }
export function intraListDiversity(list, vectors) {
  if (list.length < 2) return 0;
  let sum = 0, n = 0;
  for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) { sum += 1 - cosine(vectors[list[a]], vectors[list[b]]); n++; }
  return sum / n;
}

// ---------------------------------------------------------------------------------------------
// Evaluation

export function evaluate(model, split, k = 10, { users = null, buckets = [3, 8, 16] } = {}) {
  const relevantBy = new Map();
  split.test.forEach(x => {
    if (split.mode === 'explicit' && x.value < split.relevantThreshold) return;
    if (!relevantBy.has(x.user)) relevantBy.set(x.user, new Set());
    relevantBy.get(x.user).add(x.item);
  });
  const hiddenBy = new Map();
  (split.hidden || []).forEach(x => { if (!hiddenBy.has(x.user)) hiddenBy.set(x.user, new Set()); hiddenBy.get(x.user).add(x.item); });
  const allowed = users ? new Set(users) : null;
  const rows = [];
  [...relevantBy.keys()].sort((a, b) => a - b).forEach(u => {
    if (allowed && !allowed.has(u)) return;
    const list = recommend(model, u, k, true, hiddenBy.get(u)).map(r => r.item);
    const rel = relevantBy.get(u);
    rows.push({ u, list, rel, history: model.historyLength(u) });
  });
  const summarise = group => {
    if (!group.length) return { users: 0, precision: null, recall: null, ndcg: null, hitRate: null, coverage: null, diversity: null };
    const lists = group.map(r => r.list);
    return {
      users: group.length,
      precision: mean(group.map(r => precisionAtK(r.list, r.rel, k))),
      recall: mean(group.map(r => recallAtK(r.list, r.rel, k))),
      ndcg: mean(group.map(r => ndcgAtK(r.list, r.rel, k))),
      hitRate: hitRate(lists, group.map(r => r.rel), k),
      coverage: catalogueCoverage(lists, split.items),
      diversity: split.itemAttrs ? mean(group.map(r => intraListDiversity(r.list, split.itemAttrs))) : null,
    };
  };
  const edges = [...buckets].sort((a, b) => a - b);
  const bounds = [-Infinity, ...edges, Infinity];
  const out = [];
  for (let b = 0; b + 1 < bounds.length; b++) {
    const lo = b === 0 ? 0 : bounds[b], hi = bounds[b + 1];
    const label = b === 0 ? `<${hi}` : hi === Infinity ? `${lo}+` : `${lo}-${hi - 1}`;
    out.push({ label, lo, hi, ...summarise(rows.filter(r => r.history >= lo && r.history < hi)) });
  }
  return { k, ...summarise(rows), buckets: out };
}
