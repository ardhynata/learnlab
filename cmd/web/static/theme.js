// Theme: follows the system until the learner picks light or dark with the
// header button; the choice is kept in this browser. Runs before first paint so
// there is no flash of the wrong theme. Storage can be blocked, so every access is guarded.
//
// It also does the two jobs that cannot wait for app.js (a module that may be slow, or fail to load):
// put the page's fixed texts into the visitor's language, and replace "Loading…" with an
// explanation and a Reload button if app.js never starts.
(function () {
  var KEY = 'learnlab.theme';
  var root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function saved() { try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : null; } catch (e) { return null; } }
  function remember(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* the choice lasts for this page only */ } }
  function isDark() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : !!(media && media.matches); }

  function announce() { window.dispatchEvent(new Event('themechange')); }
  function paintButton(btn) {
    var dark = isDark();
    btn.textContent = dark ? '\u2600' : '\u263E';
    var id = root.lang === 'id';
    btn.setAttribute('aria-label', dark ? (id ? 'Ganti ke tema terang' : 'Switch to light theme') : (id ? 'Ganti ke tema gelap' : 'Switch to dark theme'));
    btn.title = btn.getAttribute('aria-label');
  }

  // The language, chosen by the same rule as i18n.js (saved choice, then the browser; keep them in step).
  function language() {
    try { var v = localStorage.getItem('learnlab.lang'); if (v === 'en' || v === 'id') return v; } catch (e) { /* storage blocked */ }
    var prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) || [];
    for (var i = 0; i < prefs.length; i++) {
      var base = String(prefs[i]).toLowerCase().split('-')[0];
      if (base === 'id' || base === 'in') return 'id';
      if (base === 'en') return 'en';
    }
    return 'en';
  }
  root.lang = language();
  root.className = root.className.replace(/\bno-js\b/, '').trim();

  var TEXT = {
    en: { skip: 'Skip to content', courses: 'Courses', loading: 'Loading\u2026', failTitle: 'Something went wrong', failBody: 'The page could not start. Check your connection, then try again.', reload: 'Reload' },
    id: { skip: 'Langsung ke konten', courses: 'Kursus', loading: 'Memuat\u2026', failTitle: 'Terjadi kesalahan', failBody: 'Halaman tidak dapat dimulai. Periksa koneksimu, lalu coba lagi.', reload: 'Muat ulang' }
  };
  var T = TEXT[root.lang] || TEXT.en;
  function setText(sel, text) { var e = document.querySelector(sel); if (e) e.textContent = text; }

  // If app.js fails to load or to start, say so instead of showing the loading text for ever.
  var failed = false;
  function showFailure() {
    var app = document.getElementById('app');
    if (!app || window.learnlabReady) return;
    app.removeAttribute('aria-busy');
    var box = document.createElement('div'); box.className = 'empty';
    var h = document.createElement('h1'); h.textContent = T.failTitle;
    var p = document.createElement('p'); p.className = 'muted'; p.setAttribute('role', 'alert'); p.textContent = T.failBody;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn primary'; b.textContent = T.reload;
    b.addEventListener('click', function () { location.reload(); });
    box.appendChild(h); box.appendChild(p); box.appendChild(b);
    app.replaceChildren(box);
  }
  window.addEventListener('error', function (e) {
    var t = e && e.target;
    var script = t && t !== window && t.tagName === 'SCRIPT';
    if (window.learnlabReady || !(script || (typeof ErrorEvent !== 'undefined' && e instanceof ErrorEvent))) return;
    failed = true;
    if (document.readyState !== 'loading') showFailure();
  }, true);

  window.addEventListener('localechange', function () { var b = document.getElementById('theme-toggle'); if (b) paintButton(b); });
  var initial = saved();
  if (initial) root.setAttribute('data-theme', initial);
  window.learnlabIsDark = isDark;

  document.addEventListener('DOMContentLoaded', function () {
    setText('.skip', T.skip);
    setText('.bar nav a[data-nav="home"]', T.courses);
    setText('#loading-text', T.loading);
    if (failed) showFailure();
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    paintButton(btn);
    btn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      remember(next);
      paintButton(btn);
      announce();
    });
    if (media) {
      var onSystem = function () { if (!saved()) { paintButton(btn); announce(); } };
      if (media.addEventListener) media.addEventListener('change', onSystem); else if (media.addListener) media.addListener(onSystem);
    }
  });
})();
