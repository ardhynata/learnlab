// Language handling for the whole frontend.
//
// Two languages: English ('en', the base) and Indonesian ('id'). The visitor's choice is
// remembered; on a first visit the browser language decides (Indonesian browsers get
// Indonesian, everyone else English). Everything user-visible goes through this module:
//
//   tr('Run', 'Jalankan')           the string for the current language (English if no Indonesian given)
//   fmt(3.5)                        3.5 in English, 3,5 in Indonesian; fmt(20000) 20,000 / 20.000
//   fmt(0.4567, { digits: 2 })      fixed digits: 0.46 / 0,46
//   pct(0.965)                      96.5% / 96,5%
//   count(2, 'lesson', 'pelajaran') 2 lessons / 2 pelajaran; unit(1, 'lesson', 'pelajaran') the word alone
//   locale()                        'en' | 'id'
//
// Changing the language fires a 'localechange' event on window; the app re-renders.

const KEY = 'learnlab.lang';
export const LOCALES = ['en', 'id'];
const INTL = { en: 'en-US', id: 'id-ID' };

function detect() {
  try {
    const saved = localStorage.getItem(KEY);
    if (LOCALES.includes(saved)) return saved;
  } catch { /* storage blocked: fall through */ }
  const prefs = (typeof navigator !== 'undefined' && (navigator.languages?.length ? navigator.languages : [navigator.language])) || [];
  for (const p of prefs) {
    const base = String(p).toLowerCase().split('-')[0];
    if (base === 'id' || base === 'in') return 'id'; // 'in' is the legacy code for Indonesian
    if (base === 'en') return 'en';
  }
  return 'en';
}

let current = detect();
if (typeof document !== 'undefined') document.documentElement.lang = current;

export const locale = () => current;

export function setLocale(next) {
  if (!LOCALES.includes(next) || next === current) return;
  current = next;
  try { localStorage.setItem(KEY, next); } catch { /* the choice lasts for this page only */ }
  document.documentElement.lang = next;
  window.dispatchEvent(new Event('localechange'));
}

// The string for the current language. `id` falls back to the English text when absent.
export const tr = (en, id) => (current === 'id' && id != null ? id : en);

const formats = new Map();
function formatter(options) {
  const k = `${current}|${JSON.stringify(options)}`;
  if (!formats.has(k)) formats.set(k, new Intl.NumberFormat(INTL[current], options));
  return formats.get(k);
}

// Locale-aware number. Default: up to 3 decimals, no trailing zeros. { digits: n } fixes n decimals.
export function fmt(value, { digits, max = 3 } = {}) {
  if (!Number.isFinite(value)) return String(value);
  const options = digits == null ? { maximumFractionDigits: max } : { minimumFractionDigits: digits, maximumFractionDigits: digits };
  return formatter(options).format(value);
}

// A fraction as a percentage: pct(0.965) is 96.5% (en) or 96,5% (id).
export const pct = (fraction, digits = 1) => `${fmt(fraction * 100, { digits })}%`;

// The counted word alone, with English pluralization: unit(1, 'lesson', 'pelajaran') is "lesson",
// unit(2, 'lesson', 'pelajaran') is "lessons"; in Indonesian the word never changes. Pass `enPlural`
// for an irregular English plural. Use it where the number is written separately, as in "0/1 lesson"
// or "2 of 3 lessons done".
export const unit = (n, en, id, enPlural = `${en}s`) => (current === 'id' ? id : (n === 1 ? en : enPlural));

// "3 courses" / "3 kursus": count and the word, with English pluralization.
export const count = (n, en, id, enPlural) => `${fmt(n)} ${unit(n, en, id, enPlural)}`;
