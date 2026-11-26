// Pure pipeline for the recommender lab (sims/labs/recommender-lab.js): generated user-item data, the
// cold-start split, the six recommenders, their evaluation for warm, cold and all users, the cells of the
// heatmap, one user's lists, and the verdict for the Quick Quiz. The recommenders and metrics themselves
// are in recsys.js; this file only chains them in the order the lab needs. Tested in recommenderlab.test.js.
//
// The data is always generated (implicit feedback: a click, a play, a purchase) and always the same for the
// same parameters. Stages are separate so the lab can cache each one by its own key:
//   buildBase(params)                     -> { ratings, split }   data + leave-last-out split (no cold users yet)
//   applyCold(split, share, keep, seed)   -> split              `share` of the users that have a held-out item
//                                           lose their history and keep `keep` (0..10) random interactions each
//                                           (fewer when they had fewer). share 0 returns the split untouched.
//   trainModels(split, { mfFactors, mfLambda }) -> { popularity, userknn, itemknn, mf, content, hybrid }
//                                           (RECOMMENDERS order). mf is ALS at lambda mfLambda with mfFactors
//                                           factors; hybrid = mf for users with 5+ interactions, content below
//                                           that, popularity with none.
//   evaluateModels(models, split, k)      -> { k, testUsers, coldUsers, warmUsers, rows }
//                                           rows[key] = { all, warm, cold } where each is evaluate()'s summary
//                                           (users, precision, recall, ndcg, hitRate, coverage, diversity; the
//                                           metrics are null when the group has no users) and `all` also has
//                                           buckets by history length (HISTORY_EDGES, first label '0').
//   suffersMost(rows, metric = 'ndcg')    -> null without cold users; else { metric, drops: [{ key, warm, cold,
//                                           drop }], worst, group } where drop = warm - cold and group is the
//                                           GROUPS key of the recommender with the largest drop.
//   cellStates(split)                     -> Uint8Array(users * items), user-major: CELL.* codes.
//   userView(models, split, user, k)      -> one user's history, removed history, held-out items and top-k lists
//                                           (hit = the item is one of the user's held-out items).
//   sourceKey(name)                       -> the RECOMMENDERS key for a model's own name: the hybrid's userView().hybridSource
//                                           is the name of the model it used ('mf-als', 'content', 'popularity'), so any
//                                           'mf-...' name maps to 'mf'; an unknown name comes back unchanged.
//   metricOf(summary, metric)             -> a summary's value for 'precision' | 'recall' | 'ndcg' (null when empty).
import {
  makeRatings, leaveLastOut, removeHistory, popularity, userKnn, itemKnn, mf, contentBased, hybrid, recommend, evaluate,
} from './recsys.js';

export const RECOMMENDERS = ['popularity', 'userknn', 'itemknn', 'mf', 'content', 'hybrid'];
// The Quick Quiz groups the recommenders by how they use a user's history.
export const GROUPS = { popularity: 'popularity', userknn: 'collab', itemknn: 'collab', mf: 'collab', content: 'content', hybrid: 'hybrid' };
export const METRICS = ['precision', 'recall', 'ndcg'];
export const HISTORY_EDGES = [1, 3, 6, 11];       // buckets: 0, 1-2, 3-5, 6-10, 11+
export const NEIGHBOURS = 20;                      // k of both k-NN models
export const HYBRID_MIN = 5;                       // interactions a user needs before the hybrid trusts the collaborative model
export const MF_EPOCHS = 10;
export const LIMITS = {
  users: [40, 300], items: [20, 150], factors: [1, 8], sparsity: [70, 96], skew: [0, 2], coldShare: [0, 80], keep: [0, 10],
  mfFactors: [1, 16], mfLambda: [0.1, 10], k: [1, 20],
};
export const DEFAULTS = {
  users: 150, items: 80, factors: 3, sparsity: 90, skew: 1, coldShare: 0, keep: 0, mfFactors: 6, mfLambda: 2, k: 10, metric: 'ndcg', seed: 1,
};
// Indonesian names for the genres recsys.js generates (it keeps them in English); the lab shows these in Indonesian mode.
export const GENRE_ID = { drama: 'drama', comedy: 'komedi', action: 'aksi', 'sci-fi': 'fiksi ilmiah', romance: 'romansa', thriller: 'thriller', documentary: 'dokumenter', animation: 'animasi' };
// Heatmap cell codes.
export const CELL = { EMPTY: 0, SEEN: 1, VALID: 2, HELD: 3, REMOVED: 4 };

const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));

export function buildBase(p = {}) {
  const q = { ...DEFAULTS, ...p };
  const ratings = makeRatings({
    users: Math.round(clamp(q.users, LIMITS.users)), items: Math.round(clamp(q.items, LIMITS.items)),
    factors: Math.round(clamp(q.factors, LIMITS.factors)), density: 1 - clamp(q.sparsity, LIMITS.sparsity) / 100,
    popularitySkew: clamp(q.skew, LIMITS.skew), seed: q.seed, mode: 'implicit',
  });
  return { ratings, split: leaveLastOut(ratings) };
}

export function applyCold(split, share, keep, seed) {
  if (!(share > 0)) return split;
  return removeHistory(split, Math.min(1, share), 0, { seed, minKeep: Math.round(clamp(keep, LIMITS.keep)) });
}

export function trainModels(split, { mfFactors = DEFAULTS.mfFactors, mfLambda = DEFAULTS.mfLambda } = {}) {
  const pop = popularity(split);
  const model = mf(split, { method: 'als', k: Math.round(clamp(mfFactors, LIMITS.mfFactors)), lambda: clamp(mfLambda, LIMITS.mfLambda), unobservedWeight: 0.1, epochs: MF_EPOCHS });
  const content = contentBased(split);
  return {
    popularity: pop,
    userknn: userKnn(split, { k: NEIGHBOURS }),
    itemknn: itemKnn(split, { k: NEIGHBOURS }),
    mf: model,
    content,
    hybrid: hybrid({ primary: model, content, popularity: pop, minInteractions: HYBRID_MIN }),
  };
}

// Users with a held-out item, ascending: the only users any metric is computed for.
export function testUsersOf(split) {
  return [...new Set(split.test.map(x => x.user))].sort((a, b) => a - b);
}

export function evaluateModels(models, split, k) {
  const testUsers = testUsersOf(split);
  const cold = new Set(split.cold || []);
  const coldUsers = testUsers.filter(u => cold.has(u));
  const warmUsers = testUsers.filter(u => !cold.has(u));
  const rows = {};
  for (const key of RECOMMENDERS) {
    const m = models[key];
    const all = evaluate(m, split, k, { buckets: HISTORY_EDGES });
    all.buckets = all.buckets.map((b, i) => (i === 0 ? { ...b, label: '0' } : b));
    rows[key] = { all, warm: evaluate(m, split, k, { users: warmUsers }), cold: evaluate(m, split, k, { users: coldUsers }) };
  }
  return { k, testUsers, coldUsers, warmUsers, rows };
}

export function sourceKey(name) {
  return typeof name === 'string' && name.startsWith('mf') ? 'mf' : name;
}

export function metricOf(summary, metric) {
  return summary ? summary[metric] ?? null : null;
}

export function suffersMost(rows, metric = 'ndcg') {
  const drops = [];
  for (const key of RECOMMENDERS) {
    const w = metricOf(rows[key]?.warm, metric), c = metricOf(rows[key]?.cold, metric);
    if (w == null || c == null) continue;
    drops.push({ key, warm: w, cold: c, drop: w - c });
  }
  if (!drops.length) return null;
  const worst = drops.reduce((a, b) => (b.drop > a.drop ? b : a)).key;
  return { metric, drops, worst, group: GROUPS[worst] };
}

export function cellStates(split) {
  const cells = new Uint8Array(split.users * split.items);
  const put = (list, code) => { for (const x of list || []) cells[x.user * split.items + x.item] = code; };
  put(split.hidden, CELL.REMOVED);
  put(split.train, CELL.SEEN);
  put(split.valid, CELL.VALID);
  put(split.test, CELL.HELD);
  return cells;
}

const sortedItems = list => list.map(x => x.item).sort((a, b) => a - b);

export function userView(models, split, user, k) {
  const history = sortedItems([...split.train, ...split.valid].filter(x => x.user === user));
  const hidden = sortedItems((split.hidden || []).filter(x => x.user === user));
  const liked = sortedItems(split.test.filter(x => x.user === user));
  const likedSet = new Set(liked);
  const hiddenSet = new Set(hidden);
  const lists = {}, ties = {};
  for (const key of RECOMMENDERS) {
    const m = models[key];
    lists[key] = recommend(m, user, k, true, hiddenSet).map(r => ({ item: r.item, hit: likedSet.has(r.item) }));
    const s = m.scores(user);
    ties[key] = s.length > 0 && Math.max(...s) === Math.min(...s);
  }
  const profile = models.content.profile(user);
  const genres = (split.genreNames || []).map((name, g) => ({ name, weight: profile[g] || 0 })).filter(x => x.weight > 0).sort((a, b) => b.weight - a.weight || (a.name < b.name ? -1 : 1));
  return {
    user, cold: (split.cold || []).includes(user), history, hidden, liked, lists, ties, genres,
    hybridSource: models.hybrid.source(user),
    trainCount: models.popularity.historyLength(user),
  };
}
