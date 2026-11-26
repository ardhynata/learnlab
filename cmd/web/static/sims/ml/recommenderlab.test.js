import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBase, applyCold, trainModels, evaluateModels, suffersMost, cellStates, userView, metricOf, testUsersOf, sourceKey, GENRE_ID,
  CELL, DEFAULTS, GROUPS, RECOMMENDERS, HISTORY_EDGES,
} from './recommenderlab.js';
import { makeRatings } from './recsys.js';

const SMALL = { users: 60, items: 40 };
const scenario = (over = {}) => {
  const p = { ...DEFAULTS, ...over };
  const base = buildBase(p);
  const split = applyCold(base.split, p.coldShare / 100, p.keep, p.seed);
  const models = trainModels(split, p);
  return { p, base, split, models, ev: evaluateModels(models, split, p.k) };
};

test('the same parameters give the same data, and a different seed gives different data', () => {
  const a = buildBase({ ...SMALL, seed: 3 }), b = buildBase({ ...SMALL, seed: 3 }), c = buildBase({ ...SMALL, seed: 4 });
  assert.deepEqual(a.split.train, b.split.train);
  assert.notDeepEqual(a.split.train, c.split.train);
  assert.equal(a.ratings.mode, 'implicit');
});

test('sparsity is one minus the density of the generated matrix', () => {
  const { ratings } = buildBase({ users: 200, items: 100, sparsity: 90 });
  assert.ok(Math.abs(ratings.density - 0.1) < 0.02, `density ${ratings.density}`);
  const sparser = buildBase({ users: 200, items: 100, sparsity: 95 }).ratings;
  assert.ok(sparser.density < ratings.density);
});

test('cellStates marks every cell kind from a hand-built split', () => {
  const split = {
    users: 2, items: 3, train: [{ user: 0, item: 0 }], valid: [{ user: 0, item: 1 }], test: [{ user: 0, item: 2 }],
    hidden: [{ user: 1, item: 0 }, { user: 1, item: 2 }], cold: [1],
  };
  assert.deepEqual([...cellStates(split)], [CELL.SEEN, CELL.VALID, CELL.HELD, CELL.REMOVED, CELL.EMPTY, CELL.REMOVED]);
});

test('cold users keep at most `keep` interactions and the share is a share of the users that have a held-out item', () => {
  const base = buildBase({ users: 100, items: 60 });
  const testUsers = testUsersOf(base.split).length;
  for (const keep of [0, 2, 5]) {
    const split = applyCold(base.split, 0.3, keep, 1);
    assert.equal(split.cold.length, Math.round(0.3 * testUsers));
    const models = trainModels(split, DEFAULTS);
    for (const u of split.cold) assert.ok(models.popularity.historyLength(u) <= keep, `user ${u} keeps ${models.popularity.historyLength(u)} > ${keep}`);
    assert.ok(split.cold.every(u => base.split.test.some(x => x.user === u)), 'cold users all have a held-out item');
    // The held-out items are untouched.
    assert.deepEqual(split.test, base.split.test);
  }
  assert.equal(applyCold(base.split, 0, 3, 1), base.split, 'share 0 changes nothing');
});

test('removing history never removes held-out cells and a removed cell is no longer seen', () => {
  const { split } = scenario({ ...SMALL, coldShare: 40 });
  const cells = cellStates(split);
  assert.equal(cells.filter(c => c === CELL.HELD).length, split.test.length);
  assert.equal(cells.filter(c => c === CELL.REMOVED).length, split.hidden.length);
  assert.ok(split.hidden.length > 0);
  assert.equal(cells.filter(c => c === CELL.SEEN).length, split.train.length);
});

test('with no cold users the cold group is empty (null metrics) and warm covers every evaluated user', () => {
  const { ev, split } = scenario(SMALL);
  assert.equal(ev.coldUsers.length, 0);
  assert.equal(ev.warmUsers.length, testUsersOf(split).length);
  for (const key of RECOMMENDERS) {
    assert.equal(ev.rows[key].cold.users, 0);
    assert.equal(metricOf(ev.rows[key].cold, 'ndcg'), null);
    assert.equal(ev.rows[key].warm.users, ev.rows[key].all.users);
  }
  assert.equal(suffersMost(ev.rows), null);
});

test('warm and cold users partition the evaluated users and every history bucket adds up', () => {
  const { ev } = scenario({ ...SMALL, coldShare: 30 });
  for (const key of RECOMMENDERS) {
    const r = ev.rows[key];
    assert.equal(r.warm.users + r.cold.users, r.all.users);
    assert.equal(r.all.buckets.reduce((s, b) => s + b.users, 0), r.all.users);
    assert.equal(r.all.buckets.length, HISTORY_EDGES.length + 1);
    assert.equal(r.all.buckets[0].label, '0');
  }
});

test('a cold user with no history gets the popularity list from the content and hybrid models, and a tie from the collaborative ones', () => {
  const { models, split } = scenario({ coldShare: 30, keep: 0 });
  const u = split.cold[0];
  assert.equal(models.popularity.historyLength(u), 0);
  const view = userView(models, split, u, 10);
  const items = key => view.lists[key].map(x => x.item);
  assert.deepEqual(items('hybrid').slice(0, 5), items('popularity').slice(0, 5));
  assert.equal(view.hybridSource, 'popularity');
  assert.deepEqual(items('content').slice(0, 5), items('popularity').slice(0, 5));
  for (const key of ['userknn', 'itemknn', 'mf']) assert.equal(view.ties[key], true, `${key} scores tie with no history`);
  assert.equal(view.ties.popularity, false);
  assert.equal(view.cold, true);
  assert.equal(view.history.length, 0);
  assert.ok(view.hidden.length > 0);
});

test('a user view lists k unseen, not-removed items and flags exactly the held-out ones as hits', () => {
  const { models, split } = scenario({ coldShare: 30, keep: 1 });
  for (const u of [split.cold[0], testUsersOf(split).find(x => !split.cold.includes(x))]) {
    const view = userView(models, split, u, 7);
    const forbidden = new Set([...view.history, ...view.hidden]);
    for (const key of RECOMMENDERS) {
      assert.equal(view.lists[key].length, 7);
      for (const { item, hit } of view.lists[key]) {
        assert.equal(forbidden.has(item), false);
        assert.equal(hit, view.liked.includes(item));
      }
    }
  }
});

test('suffersMost picks the largest warm-to-cold drop (hand-made rows)', () => {
  const row = (warm, cold) => ({ warm: { ndcg: warm, precision: warm / 2, users: 3 }, cold: { ndcg: cold, precision: cold / 2, users: 2 } });
  const rows = { popularity: row(0.3, 0.28), userknn: row(0.5, 0.1), itemknn: row(0.4, 0.1), mf: row(0.45, 0.2), content: row(0.4, 0.3), hybrid: row(0.5, 0.45) };
  const v = suffersMost(rows, 'ndcg');
  assert.equal(v.worst, 'userknn');
  assert.equal(v.group, 'collab');
  assert.ok(Math.abs(v.drops.find(d => d.key === 'userknn').drop - 0.4) < 1e-12);
  assert.equal(suffersMost(rows, 'precision').worst, 'userknn');
  rows.hybrid = row(0.9, 0.1);
  assert.equal(suffersMost(rows).group, 'hybrid');
});

test('removing 30 percent of the users hurts the collaborative recommenders most, on seeds 1 to 5', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const { ev } = scenario({ coldShare: 30, keep: 0, seed });
    const v = suffersMost(ev.rows);
    assert.equal(v.group, 'collab', `seed ${seed}: worst ${v.worst}`);
    const drop = key => v.drops.find(d => d.key === key).drop;
    assert.ok(drop('popularity') < drop('userknn') && drop('popularity') < drop('mf'), `seed ${seed}: popularity does not use the history`);
    assert.ok(drop('hybrid') < drop('userknn'), `seed ${seed}: the hybrid falls back`);
    // With no history the hybrid recovers to the popularity level, below which the collaborative models fall.
    const cold = key => ev.rows[key].cold.ndcg;
    assert.ok(Math.abs(cold('hybrid') - cold('popularity')) < 1e-9);
    assert.ok(cold('userknn') < cold('popularity'));
  }
});

test('keeping a few interactions lets the collaborative recommenders recover', () => {
  const none = scenario({ coldShare: 30, keep: 0 }).ev.rows, ten = scenario({ coldShare: 30, keep: 10 }).ev.rows;
  assert.ok(ten.userknn.cold.ndcg > none.userknn.cold.ndcg + 0.1);
  assert.ok(ten.itemknn.cold.ndcg > none.itemknn.cold.ndcg + 0.1);
});

test('ranking metrics stay in 0..1 and coverage and diversity are shares', () => {
  const { ev } = scenario({ ...SMALL, coldShare: 20 });
  for (const key of RECOMMENDERS) for (const g of ['all', 'warm', 'cold']) {
    const s = ev.rows[key][g];
    if (s.users === 0) continue;
    for (const m of ['precision', 'recall', 'ndcg', 'coverage', 'diversity']) assert.ok(s[m] >= 0 && s[m] <= 1, `${key} ${g} ${m} = ${s[m]}`);
  }
});

test('the MF history has a train and a validation curve that fall', () => {
  const { models } = scenario(SMALL);
  const h = models.mf.history;
  assert.ok(h.length > 5);
  assert.ok(h.at(-1).train < h[0].train);
  assert.ok(h.every(r => Number.isFinite(r.validation)));
});

test('every recommender belongs to exactly one quiz group', () => {
  assert.deepEqual(RECOMMENDERS.map(k => GROUPS[k]), ['popularity', 'collab', 'collab', 'collab', 'content', 'hybrid']);
});

test('every model the hybrid can route a user to maps to a recommender the lab names', () => {
  const { models, split } = scenario({ coldShare: 40, keep: 3 });
  assert.equal(models.mf.name, 'mf-als');
  assert.equal(sourceKey('mf-als'), 'mf');
  assert.equal(sourceKey('mf'), 'mf');
  assert.equal(sourceKey('mystery'), 'mystery', 'an unknown name comes back unchanged');
  const seen = new Set();
  for (let u = 0; u < split.users; u++) {
    const key = sourceKey(userView(models, split, u, 5).hybridSource);
    assert.ok(RECOMMENDERS.includes(key) && key !== 'hybrid', `user ${u}: hybrid source maps to ${key}`);
    seen.add(key);
  }
  assert.deepEqual([...seen].sort(), ['content', 'mf', 'popularity'], 'all three routes occur');
});

test('every generated genre has an Indonesian display name', () => {
  const { split } = scenario(SMALL);
  assert.ok(split.genreNames.length > 0);
  for (const g of split.genreNames) assert.ok(typeof GENRE_ID[g] === 'string' && GENRE_ID[g].length > 0, `no Indonesian name for ${g}`);
  for (const g of makeRatings({ users: 20, items: 20, genres: 8 }).genreNames) assert.ok(GENRE_ID[g], `no Indonesian name for ${g}`);
});
