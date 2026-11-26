// Learner identity and progress. There is no login: the learner id is a random
// id kept in this browser, and progress is stored server-side under it.
//
// What the views can rely on:
//   status()            { loaded, persistent }. `loaded` is false until the learner's progress has been
//                       read from the server (then every lesson looks "not started" and must not be
//                       presented as such); `persistent` is false when this browser keeps the learner
//                       id nowhere (storage and cookies blocked), so progress is lost on reload.
//   ensureLoaded()      (re)tries to load progress; resolves when loaded, rejects when it cannot be.
//   onChange(fn)        calls fn(status()) whenever `loaded` changes; returns an unsubscribe function.
//   record(...)         saves a result. It never writes blind: when progress could not be loaded it
//                       rejects with err.code 'progress-unavailable' instead of creating a duplicate
//                       row. Any other rejection means the save itself failed; nothing was recorded and
//                       calling record() again with the same result is safe.
import { api } from './api.js';

const KEY = 'learnlab.learner';
const REGISTERED_KEY = 'learnlab.registered';
const COOKIE_PREFIX = 'learnlab_';

// Browser storage can be blocked (private modes, site settings, quota). localStorage is tried
// first, then a first-party cookie; if both refuse, the value lives in memory for this page only.
const memory = new Map();
let persistent = true;

function lsGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function lsSet(key, value) { try { localStorage.setItem(key, value); return localStorage.getItem(key) === value; } catch { return false; } }
function cookieGet(key) {
  try {
    const hit = document.cookie.split('; ').find(c => c.startsWith(`${COOKIE_PREFIX}${key}=`));
    return hit ? decodeURIComponent(hit.slice(COOKIE_PREFIX.length + key.length + 1)) : null;
  } catch { return null; }
}
function cookieSet(key, value) {
  try {
    document.cookie = `${COOKIE_PREFIX}${key}=${encodeURIComponent(value)}; max-age=31536000; path=/; SameSite=Lax`;
    return cookieGet(key) === value;
  } catch { return false; }
}
const read = key => lsGet(key) ?? cookieGet(key) ?? memory.get(key) ?? null;
function write(key, value) {
  memory.set(key, value);
  return lsSet(key, value) || cookieSet(key, value);
}

export function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

const state = { id: null, byLesson: new Map(), loaded: false };
const listeners = new Set();
export const status = () => ({ loaded: state.loaded, persistent });
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) { try { fn(status()); } catch (err) { console.error(err); } } }

// The server learns about a learner once, when the first result is saved. Which id it already
// knows is remembered locally, so a returning visitor makes no registration request at all.
async function register(id) {
  try {
    await api.createLearner(id);
  } catch (err) {
    if (err.status !== 409) throw err; // 409: the server already has this learner
  }
  write(REGISTERED_KEY, id);
}

function identify() {
  if (state.id) return;
  let id = read(KEY);
  if (!id) { id = newId(); }
  persistent = write(KEY, id);
  state.id = id;
}

let loading = null;
// Loads progress from the server. Concurrent callers share one request; a failure is not
// remembered, so the next call tries again.
export function ensureLoaded() {
  if (state.loaded) return Promise.resolve();
  loading ??= (async () => {
    identify();
    await refresh();
  })().finally(() => { loading = null; });
  return loading;
}
export const init = ensureLoaded;

// A learner should have one row per lesson. If the server holds more (an older client could
// write a second one), the best one wins: completed first, then the higher score.
function best(rows) {
  const byLesson = new Map();
  for (const p of rows) {
    const cur = byLesson.get(p.lesson_id);
    if (!cur || Number(p.completed) > Number(cur.completed) || (p.completed === cur.completed && p.score > cur.score)) byLesson.set(p.lesson_id, p);
  }
  return byLesson;
}

export async function refresh() {
  identify();
  const list = await api.progress(state.id);
  state.byLesson = best(list);
  const was = state.loaded;
  state.loaded = true;
  if (!was) emit();
}

export const progressFor = lessonId => state.byLesson.get(lessonId) ?? null;
export const isDone = lessonId => Boolean(progressFor(lessonId)?.completed);

const queues = new Map();
// Keeps the best score and never un-completes a lesson. Saves for one lesson run one after the
// other, so two quick results cannot both create the lesson's row.
export function record(lessonId, result) {
  const run = (queues.get(lessonId) ?? Promise.resolve()).catch(() => {}).then(() => save(lessonId, result));
  queues.set(lessonId, run);
  return run;
}

async function save(lessonId, { completed, score, total }) {
  if (!state.loaded) {
    // Without the learner's existing progress a save could only guess; try to load it once more.
    try { await ensureLoaded(); } catch (cause) {
      const err = new Error('progress could not be loaded, so the result was not saved', { cause });
      err.code = 'progress-unavailable';
      throw err;
    }
  }
  const prev = progressFor(lessonId);
  const payload = {
    learner_id: state.id,
    lesson_id: lessonId,
    completed: Boolean(completed || prev?.completed),
    score: Math.max(score ?? 0, prev?.score ?? 0),
    total: total ?? prev?.total ?? 0,
  };
  let saved;
  try {
    if (read(REGISTERED_KEY) !== state.id) await register(state.id);
    saved = await api.saveProgress(prev, payload);
  } catch (err) {
    // The server may have lost this learner or this row (a reset database): register again and
    // retry once. A 404 on the update means the old row is gone too.
    if (err.status !== 400 && err.status !== 404) throw err;
    await register(state.id);
    saved = await api.saveProgress(null, payload);
  }
  state.byLesson.set(lessonId, savedRow(prev, payload, saved));
  return state.byLesson.get(lessonId);
}

// The row to remember after a save. The server leaves zero-valued numbers out of its answer (a
// first result of 0 comes back with no `score`), so a field it did not return takes the value
// that was sent: views can always read score, total and completed.
export function savedRow(prev, payload, saved) {
  if (!saved) return { ...prev, ...payload };
  return {
    ...payload,
    ...saved,
    score: saved.score ?? payload.score,
    total: saved.total ?? payload.total,
    completed: Boolean(saved.completed ?? payload.completed),
  };
}
