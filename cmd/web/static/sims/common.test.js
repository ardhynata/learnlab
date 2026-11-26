import test from 'node:test';
import assert from 'node:assert/strict';

// common.js reads the language from i18n.js, which reads the browser at import time.
globalThis.localStorage = { store: {}, getItem(k) { return this.store[k] ?? null; }, setItem(k, v) { this.store[k] = String(v); } };
Object.defineProperty(globalThis, 'navigator', { value: { languages: ['en-US'] }, configurable: true });
globalThis.document = { documentElement: {} };
globalThis.window = new EventTarget();
const { setLocale } = await import('../i18n.js');
const { formatTick, clusterColor, currentPalette, wrapTarget } = await import('./common.js');

test('axis ticks keep their digits and follow the language separator', () => {
  setLocale('en');
  assert.equal(formatTick(2.5), '2.5');
  assert.equal(formatTick(1234.5), '1234.5'); // no thousands grouping, unlike fmt()
  assert.equal(formatTick(0.1 + 0.2), '0.3');
  assert.equal(formatTick(0.001), '1.00e-3');
  setLocale('id');
  assert.equal(formatTick(2.5), '2,5');
  assert.equal(formatTick(12.5), '12,5');
  assert.equal(formatTick(1234.5), '1234,5');
  assert.equal(formatTick(5), '5');
  assert.equal(formatTick(0), '0');
  assert.equal(formatTick(-0.25), '-0,25');
  assert.equal(formatTick(0.001), '1,00e-3');
});

test('no cluster colour is the colour of "no cluster"', () => {
  for (const mode of ['light', 'dark']) {
    window.learnlabIsDark = () => mode === 'dark';
    const colours = [0, 1, 2, 3, 4, 5, 6].map(clusterColor);
    assert.equal(new Set(colours).size, 7, 'seven distinct cluster colours');
    assert.ok(!colours.includes(clusterColor(-1)), `${mode}: noise grey is not a cluster colour`);
    assert.equal(currentPalette().length, 7);
  }
});

test('Tab wraps inside the fullscreen overlay and nowhere else', () => {
  const [a, b, c] = ['a', 'b', 'c'];
  assert.equal(wrapTarget([a, b, c], c, false), a, 'Tab off the last stop goes to the first');
  assert.equal(wrapTarget([a, b, c], a, true), c, 'Shift+Tab off the first stop goes to the last');
  assert.equal(wrapTarget([a, b, c], b, false), null, 'in the middle the browser moves focus');
  assert.equal(wrapTarget([a, b, c], a, false), null);
  assert.equal(wrapTarget([a, b, c], c, true), null);
  assert.equal(wrapTarget([a, b, c], 'outside', false, false), a, 'focus outside the overlay is pulled back in');
  assert.equal(wrapTarget([a, b, c], 'outside', true, false), c);
  assert.equal(wrapTarget([a], a, false), a, 'a single stop keeps focus on itself');
  assert.equal(wrapTarget([], null, false), null);
});
