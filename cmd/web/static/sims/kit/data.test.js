import test from 'node:test';
import assert from 'node:assert/strict';

// data.js imports i18n.js, which reads the browser at import time.
globalThis.localStorage = { getItem: () => null, setItem() {} };
Object.defineProperty(globalThis, 'navigator', { value: { languages: ['en'] }, configurable: true });
globalThis.document = { documentElement: {} };
globalThis.window = new EventTarget();
const { loadDataset } = await import('./data.js');

const reply = (ok, body = '') => Promise.resolve({ ok, status: ok ? 200 : 503, text: () => Promise.resolve(body) });

test('a dataset that loads is fetched once and shared', async () => {
  let calls = 0;
  globalThis.fetch = () => { calls++; return reply(true, 'a,b\n1,2\n3,4\n'); };
  const first = await loadDataset('shared-ok');
  const second = await loadDataset('shared-ok');
  assert.equal(calls, 1);
  assert.equal(first, second);
});

test('a failed fetch is retried the next time the dataset is asked for', async () => {
  let calls = 0;
  let up = false;
  globalThis.fetch = () => { calls++; return up ? reply(true, 'a,b\n1,2\n3,4\n') : reply(false); };
  await assert.rejects(loadDataset('retry-me'), /HTTP 503/);
  await new Promise(r => setTimeout(r, 0)); // let the eviction handler run
  up = true;
  const table = await loadDataset('retry-me');
  assert.ok(table, 'second call returns the parsed table');
  assert.equal(calls, 2, 'the rejected promise was not cached');
});

test('a network error is also retried', async () => {
  let calls = 0;
  globalThis.fetch = () => { calls++; return calls === 1 ? Promise.reject(new TypeError('Failed to fetch')) : reply(true, 'a,b\n1,2\n'); };
  await assert.rejects(loadDataset('net'), /Failed to fetch/);
  await new Promise(r => setTimeout(r, 0));
  await loadDataset('net');
  assert.equal(calls, 2);
});
