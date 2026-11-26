// Thin client for the Hexago-generated REST API (reached through /api).
//
// Every failure throws an Error: `status` is the HTTP status (absent for a network error or a
// timeout) and `timeout` is true when the request was given up on. A 404 is an error too, so a
// missing page of the API is never mistaken for an empty list or a saved record; the one place
// where "not found" is a normal answer (learner) asks for it with `{ notFound: null }`.

const TIMEOUT_MS = 30000;

async function call(method, path, body, { notFound } = {}) {
  let res;
  try {
    res = await fetch('/api' + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      // A server that accepts the connection and never answers must not leave a page loading forever.
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(TIMEOUT_MS) : undefined,
    });
  } catch (cause) {
    const err = new Error(`${method} ${path} failed (${cause?.name === 'TimeoutError' ? 'timeout' : 'network'})`, { cause });
    err.timeout = cause?.name === 'TimeoutError';
    throw err;
  }
  if (res.status === 404 && notFound !== undefined) return notFound;
  if (!res.ok) { const err = new Error(`${method} ${path} failed (${res.status})`); err.status = res.status; throw err; }
  return res.status === 204 ? null : res.json();
}

// Plain lists are arrays; by-<ref> lists wrap them as {data, total}.
const rows = payload => (Array.isArray(payload) ? payload : payload?.data ?? []);
const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0);

export const api = {
  async paths() { return rows(await call('GET', '/paths?limit=1000')); },
  async modules() { return rows(await call('GET', '/modules?limit=1000')); },
  // Translations (the base rows are English).
  async pathTexts() { return rows(await call('GET', '/path-texts?limit=1000')); },
  async courseTexts() { return rows(await call('GET', '/course-texts?limit=1000')); },
  async moduleTexts() { return rows(await call('GET', '/module-texts?limit=1000')); },
  async lessonTexts() { return rows(await call('GET', '/lesson-texts?limit=1000')); },
  async questionTexts(lessonId) { return rows(await call('GET', `/question-texts/by-lesson/${lessonId}?limit=1000`)); },
  async courses() { return rows(await call('GET', '/courses?limit=1000')).sort(byPosition); },
  async lessons() { return rows(await call('GET', '/lessons?limit=1000')).sort(byPosition); },
  // The API omits zero-valued ints from its JSON, so a missing answer means option 0.
  async questions(lessonId) {
    const list = rows(await call('GET', `/questions/by-lesson/${lessonId}?limit=1000`));
    return list.map(q => ({ ...q, answer: q.answer ?? 0, position: q.position ?? 0 })).sort(byPosition);
  },
  async learner(id) { return call('GET', `/learners/${id}`, undefined, { notFound: null }); },
  createLearner(id) { return call('POST', '/learners', { id, name: '' }); },
  async progress(learnerId) {
    return rows(await call('GET', `/progresses/by-learner/${learnerId}?limit=1000`)).map(p => ({ ...p, score: p.score ?? 0, total: p.total ?? 0, completed: Boolean(p.completed) }));
  },
  saveProgress(existing, record) {
    return existing ? call('PUT', `/progresses/${existing.id}`, record) : call('POST', '/progresses', record);
  },
};
