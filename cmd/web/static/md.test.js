import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = { store: {}, getItem(k) { return this.store[k] ?? null; }, setItem(k, v) { this.store[k] = String(v); } };
Object.defineProperty(globalThis, 'navigator', { value: { languages: ['en-US'] }, configurable: true });
globalThis.document = { documentElement: {} };
globalThis.window = new EventTarget();
const { figureAlt, keepPairTogether } = await import('./md.js');

test('a figure is described by the words drawn in it, each once, in order', () => {
  assert.equal(figureAlt(['Features', ' Label ', 'Features', '', 'Target']), 'Features; Label; Target');
  assert.equal(figureAlt([]), '');
});

test('the description stops at a whole item rather than cutting one in half', () => {
  const alt = figureAlt(['a'.repeat(300), 'b'.repeat(300), 'c'.repeat(300)], 650);
  assert.equal(alt, `${'a'.repeat(300)}; ${'b'.repeat(300)}`);
});

test('a coordinate pair stays on one line in a table cell', () => {
  assert.equal(keepPairTogether('(1, 2)'), '(1, 2)');
  assert.equal(keepPairTogether('(-0.5,  3,5)'), '(-0.5, 3,5)');
  assert.equal(keepPairTogether('a sentence, with a comma'), 'a sentence, with a comma');
  assert.equal(keepPairTogether('(a, b)'), '(a, b)');
});
