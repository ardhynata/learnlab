import test from 'node:test';
import assert from 'node:assert/strict';

// i18n.js reads the browser at import time, so give it a minimal one before loading it.
globalThis.localStorage = { store: {}, getItem(k) { return this.store[k] ?? null; }, setItem(k, v) { this.store[k] = String(v); } };
Object.defineProperty(globalThis, 'navigator', { value: { languages: ['id-ID', 'en'] }, configurable: true });
globalThis.document = { documentElement: {} };
globalThis.window = new EventTarget();
const { tr, fmt, pct, count, unit, locale, setLocale } = await import('./i18n.js');

test('a first visit follows the browser language', () => {
  assert.equal(locale(), 'id');
  assert.equal(document.documentElement.lang, 'id');
});

test('numbers follow the locale', () => {
  assert.equal(fmt(3.5), '3,5');
  assert.equal(fmt(20000), '20.000');
  assert.equal(fmt(0.4567, { digits: 2 }), '0,46');
  assert.equal(pct(0.965), '96,5%');
  assert.equal(fmt(1895), '1.895');
});

test('switching language changes strings and numbers, is remembered and fires an event', () => {
  let fired = 0;
  window.addEventListener('localechange', () => fired++);
  assert.equal(tr('Run', 'Jalankan'), 'Jalankan');
  setLocale('en');
  assert.equal(fired, 1);
  assert.equal(tr('Run', 'Jalankan'), 'Run');
  assert.equal(fmt(3.5), '3.5');
  assert.equal(fmt(20000), '20,000');
  assert.equal(localStorage.getItem('learnlab.lang'), 'en');
  assert.equal(document.documentElement.lang, 'en');
  setLocale('en');
  assert.equal(fired, 1, 'no event when nothing changed');
});

test('a missing Indonesian string falls back to English and plurals follow the language', () => {
  setLocale('id');
  assert.equal(tr('Only English'), 'Only English');
  assert.equal(count(3, 'course', 'kursus'), '3 kursus');
  setLocale('en');
  assert.equal(count(1, 'course', 'kursus'), '1 course');
  assert.equal(count(3, 'course', 'kursus'), '3 courses');
  assert.equal(count(2, 'lesson', 'pelajaran', 'lessons'), '2 lessons');
});

test('an unsupported language is ignored', () => {
  setLocale('fr');
  assert.equal(locale(), 'en');
});

test('unit() gives the counted word alone: singular for exactly one, never inflected in Indonesian', () => {
  setLocale('en');
  assert.equal(unit(1, 'lesson', 'pelajaran'), 'lesson');
  assert.equal(unit(0, 'lesson', 'pelajaran'), 'lessons');
  assert.equal(unit(2, 'lesson', 'pelajaran'), 'lessons');
  assert.equal(unit(2, 'entry', 'entri', 'entries'), 'entries');
  assert.equal(`${fmt(1)}/${fmt(1)} ${unit(1, 'lesson', 'pelajaran')}`, '1/1 lesson');
  assert.equal(count(1500, 'minute', 'menit'), '1,500 minutes');
  setLocale('id');
  assert.equal(unit(1, 'lesson', 'pelajaran'), 'pelajaran');
  assert.equal(unit(2, 'entry', 'entri', 'entries'), 'entri');
  assert.equal(count(1500, 'minute', 'menit'), '1.500 menit');
  setLocale('en');
});
