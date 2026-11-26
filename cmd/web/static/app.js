import { api } from './api.js';
import { renderMarkdown } from './md.js';
import * as store from './store.js';
import { loadLab } from './sims/index.js';
import { wireSettingsSheet, layoutLabCards } from './sims/common.js';
import { locale, setLocale, tr, fmt, unit, count, LOCALES } from './i18n.js';

const app = document.getElementById('app');
let catalog = null;
let catalogPromise = null;

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}

// Scripted scrolling follows the visitor's motion setting (read at the time of the scroll).
function scrollBehavior() {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'; } catch { return 'auto'; }
}

// The catalog is a tree: paths hold courses, courses hold modules, modules hold
// lessons. Each course also gets a flat, ordered `lessons` list (module order),
// which is what the course-wide step order and progress counts use.
// One request set is shared by everyone who asks while it is in flight, and a failed one is
// forgotten, so asking again (the Try again button) really tries again.
function loadCatalog() {
  catalogPromise ??= fetchCatalog().then(cat => (catalog = cat), err => { catalogPromise = null; throw err; });
  return catalogPromise.then(applyLocale);
}

async function fetchCatalog() {
  const [paths, courses, modules, lessons, pathTx, courseTx, moduleTx, lessonTx] = await Promise.all([
    api.paths(), api.courses(), api.modules(), api.lessons(),
    api.pathTexts(), api.courseTexts(), api.moduleTexts(), api.lessonTexts(),
  ]);
  // Translations by parent id: { <id>: { <locale>: row } }.
  const group = (rows, key) => rows.reduce((acc, r) => { (acc[r[key]] ??= {})[r.locale] = r; return acc; }, {});
  const tx = { path: group(pathTx, 'path_id'), course: group(courseTx, 'course_id'), module: group(moduleTx, 'module_id'), lesson: group(lessonTx, 'lesson_id') };
  const attach = (kind, x) => { x.tx = tx[kind][x.id] ?? {}; x.base = { title: x.title, summary: x.summary, body: x.body }; return x; };
  paths.forEach(p => attach('path', p));
  courses.forEach(c => attach('course', c));
  modules.forEach(m => attach('module', m));
  lessons.forEach(l => attach('lesson', l));
  const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0);
  const builtCourses = courses.map(c => {
    const mods = modules.filter(m => m.course_id === c.id).sort(byPosition).map(m => ({
      ...m, lessons: lessons.filter(l => l.module_id === m.id).sort(byPosition),
    }));
    // Lessons not placed in a module still show, in a trailing unnamed group.
    const loose = lessons.filter(l => l.course_id === c.id && !mods.some(m => m.id === l.module_id)).sort(byPosition);
    if (loose.length) mods.push({ id: `${c.id}-loose`, slug: 'lessons', title: 'Lessons', summary: '', lessons: loose });
    return { ...c, modules: mods, lessons: mods.flatMap(m => m.lessons) };
  }).sort(byPosition);
  const builtPaths = paths.sort(byPosition).map(p => ({ ...p, courses: builtCourses.filter(c => c.path_id === p.id) }));
  const bySlug = new Map(builtPaths.map(p => [p.slug.toLowerCase(), p]));
  builtCourses.forEach(c => { c.path = builtPaths.find(p => p.id === c.path_id) ?? null; });
  return { paths: builtPaths, courses: builtCourses, pathBySlug: slug => bySlug.get(String(slug).toLowerCase()) };
}

// Sets every entity's title, summary and body (lessons) to the current language, falling
// back to English where a translation is missing. Cheap, so it runs on every catalog read.
function applyLocale(cat) {
  const loc = locale();
  const set = x => {
    const t = loc === 'en' ? null : x.tx?.[loc];
    x.title = t?.title || x.base.title;
    x.summary = t?.summary || x.base.summary;
    if ('body' in x.base) x.body = t?.body || x.base.body;
    x.translated = loc === 'en' || Boolean(t);
  };
  cat.paths.forEach(set);
  cat.courses.forEach(c => { set(c); c.modules.forEach(m => { set(m); m.lessons.forEach(set); }); });
  return cat;
}

const emptyCatalog = cat => !cat.paths.length && !cat.courses.length;
const sameSlug = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

// Figures: a lesson's own figures live in figures/lessons/<lesson>.js and are used as
// [[figure:<lesson>/<name>|...]]. Bare names come from the shared bundles below. A figure file
// that cannot be loaded leaves its figures out; it never takes the lesson down with it.
const FIGURE_BUNDLES = ['common', 'clustering', 'nearest-neighbors'];
async function loadFigures(_courseSlug, ...sources) {
  const text = sources.map(s => String(s ?? '')).join('\n');
  const own = new Set();
  for (const m of text.matchAll(/\[\[figure:([a-z0-9-]+)\//g)) own.add(m[1]);
  const usesShared = /\[\[figure:[a-z0-9-]+\|/.test(text);
  const [bundles, lessons] = await Promise.all([
    Promise.all(usesShared ? FIGURE_BUNDLES.map(b => import(`./figures/${b}.js`).then(m => m.figures).catch(err => { console.error(err); return {}; })) : []),
    Promise.all([...own].map(lesson => import(`./figures/lessons/${lesson}.js`).then(mod => [lesson, mod.figures]).catch(() => [lesson, {}]))),
  ]);
  const out = Object.assign({}, ...bundles);
  for (const [lesson, figs] of lessons) for (const [name, make] of Object.entries(figs)) out[`${lesson}/${name}`] = make;
  return out;
}

const lessonsOf = x => x.lessons ?? x.courses.flatMap(c => c.lessons);
const doneCount = x => lessonsOf(x).filter(l => store.isDone(l.id)).length;
const nextLesson = x => lessonsOf(x).find(l => !store.isDone(l.id)) ?? lessonsOf(x)[0];
const minutes = x => lessonsOf(x).reduce((n, l) => n + (l.minutes || 0), 0);
const courseOf = (cat, lesson) => cat.courses.find(c => c.id === lesson.course_id);
const lessonUrl = (c, l) => `#/course/${c.slug}/${l.slug}`;
const TOPICS = { 'Machine learning': 'Machine learning' };
const LEVELS = { beginner: 'pemula', intermediate: 'menengah', advanced: 'lanjutan' };

// Progress is only shown once it has been loaded: until then every lesson would look unstarted.
const known = () => store.status().loaded;

// Counts and durations as text. Numbers go through fmt(); English nouns agree with the number.
const lessonsDone = (done, total) => tr(`${fmt(done)} of ${count(total, 'lesson', 'pelajaran')} done`, `${fmt(done)} dari ${fmt(total)} pelajaran selesai`);
const aboutMinutes = n => tr(`about ${count(n, 'minute', 'menit')}`, `sekitar ${fmt(n)} menit`);
const shortMinutes = n => `${fmt(n)} ${tr('min', 'mnt')}`;
// The kind of lesson and its length as two tags with icons, so a learner can tell a reading from a lab at a glance.
const META_ICONS = {
  reading: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
  simulator: '<path d="M9.5 3.5h5M10.5 3.5v5.2L5.2 18a2 2 0 0 0 1.8 3h10a2 2 0 0 0 1.8-3l-5.3-9.3V3.5M7.8 14.5h8.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  clock: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
};
function metaChip(icon, text, cls) {
  const chip = h('span', { class: `meta-chip ${cls}` }, h('span', { class: 'ic', 'aria-hidden': 'true' }), text);
  chip.firstChild.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" focusable="false">${META_ICONS[icon]}</svg>`;
  return chip;
}
const lessonMeta = l => h('span', { class: 'meta-chips' },
  metaChip(l.kind === 'simulator' ? 'simulator' : 'reading', l.kind === 'simulator' ? tr('Simulator lab', 'Lab simulasi') : tr('Reading', 'Bacaan'), l.kind === 'simulator' ? 'kind-lab' : 'kind-reading'),
  metaChip('clock', shortMinutes(l.minutes), 'time'));
const levelName = level => (LEVELS[level] ? tr(level, LEVELS[level]) : level);
const topicName = c => (c.path ? tr(`Module ${fmt(c.position)}`, `Modul ${fmt(c.position)}`) : (TOPICS[c.topic] ? tr(c.topic, TOPICS[c.topic]) : c.topic));

function progressBar(done, total) {
  if (!known()) return null;
  const pct = total ? Math.round(100 * done / total) : 0;
  return h('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': done, 'aria-label': tr(`${fmt(done)} of ${count(total, 'lesson', 'pelajaran')} complete`, `${fmt(done)} dari ${fmt(total)} pelajaran selesai`) }, h('span', { style: `width:${pct}%` }));
}

// One rule for the call to action on the home, path and course pages: the first lesson not yet
// done, named in the button. Before any progress it starts there; when everything is done it
// reviews from the start. Returns null when there is nothing to open.
function callToAction(x, cat, { start, review }) {
  const next = nextLesson(x);
  if (!next) return null;
  const done = known() ? doneCount(x) : 0;
  const total = lessonsOf(x).length;
  const label = done === 0 ? start : done >= total ? review : `${tr('Continue', 'Lanjutkan')}: ${next.title}`;
  return h('a', { class: 'btn primary', href: lessonUrl(courseOf(cat, next), next) }, label);
}

// ---------- notices ----------
// Short messages above the page: progress could not be loaded, storage is blocked, and so on.
// Each has an id, so it can be replaced or removed; the text is a function so it follows the language.
const noticeBox = document.getElementById('notices');
const notices = new Map();
function paintNotice(id) {
  const n = notices.get(id);
  const old = noticeBox?.querySelector(`[data-notice="${id}"]`);
  if (!n) { old?.remove(); return; }
  const el = h('div', { class: `notice ${n.tone ?? 'info'}`, 'data-notice': id, role: n.tone === 'warn' ? 'alert' : 'status' },
    h('p', {}, n.text()),
    n.action && h('button', { type: 'button', class: 'btn', onclick: n.action.run }, n.action.label()),
    n.dismissible && h('button', { type: 'button', class: 'notice-close', 'aria-label': tr('Dismiss', 'Tutup'), onclick: () => dismiss(id) }, '×'));
  if (old) old.replaceWith(el); else noticeBox?.append(el);
}
function notify(id, spec) { notices.set(id, spec); paintNotice(id); }
function dismiss(id) { notices.delete(id); paintNotice(id); }
const repaintNotices = () => [...notices.keys()].forEach(paintNotice);

// A polite announcement for screen readers (the live region sits outside the page content).
function announce(text) {
  const live = document.getElementById('route-status');
  if (!live) return;
  live.textContent = '';
  setTimeout(() => { live.textContent = text; }, 60);
}

// ---------- progress availability ----------
// If the learner's progress cannot be loaded the pages say so, keep trying in the background
// (with growing pauses, and at once when the browser comes back online or the tab is shown
// again), and once it arrives show it. Nothing is saved while it is unknown (see store.js).
let retryTimer = null;
let retryDelay = 5000;
function watchProgress() {
  notify('progress', {
    tone: 'warn',
    text: () => tr('Your progress could not be loaded. Lessons may look unfinished and new results may not be saved.', 'Progresmu gagal dimuat. Pelajaran bisa tampak belum selesai dan hasil baru mungkin tidak tersimpan.'),
    action: { label: () => tr('Try again', 'Coba lagi'), run: retryProgress },
  });
  scheduleRetry();
}
function scheduleRetry() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(retryProgress, retryDelay);
  retryDelay = Math.min(retryDelay * 2, 60000);
}
async function retryProgress() {
  if (!notices.has('progress')) return;
  clearTimeout(retryTimer);
  try { await store.ensureLoaded(); } catch { scheduleRetry(); }
}
store.onChange(({ loaded }) => {
  if (!loaded) return;
  clearTimeout(retryTimer);
  retryDelay = 5000;
  if (!notices.has('progress')) return;
  dismiss('progress');
  announce(tr('Your progress is loaded.', 'Progresmu sudah dimuat.'));
  // Show it, unless the learner is in the middle of a quiz or a simulator (re-drawing would discard it).
  if (current && !current.ctx.interactive) route({ keepScroll: true, keepState: true });
});
addEventListener('online', retryProgress);
document.addEventListener('visibilitychange', () => { if (!document.hidden) retryProgress(); });

// ---------- chrome: header and footer ----------

// The header: language toggle and the strings in index.html.
function chrome() {
  const set = (sel, text) => { const e = document.querySelector(sel); if (e) e.textContent = text; };
  set('.skip', tr('Skip to content', 'Langsung ke konten'));
  set('.bar nav a[data-nav="home"]', tr('Courses', 'Kursus'));
  document.querySelector('.bar nav')?.setAttribute('aria-label', tr('Main', 'Utama'));
  footer();
  let toggle = document.getElementById('lang-toggle');
  if (!toggle) {
    // Built once: the buttons keep their focus when the language changes.
    toggle = h('div', { class: 'lang-toggle', id: 'lang-toggle', role: 'group' }, LOCALES.map(code => h('button', {
      type: 'button', class: 'lang-btn', lang: code, title: code === 'en' ? 'English' : 'Bahasa Indonesia', onclick: () => setLocale(code),
    }, code.toUpperCase())));
    const nav = document.querySelector('.bar nav');
    nav.insertBefore(toggle, document.getElementById('theme-toggle'));
  }
  toggle.setAttribute('aria-label', tr('Language', 'Bahasa'));
  toggle.querySelectorAll('.lang-btn').forEach(b => b.setAttribute('aria-pressed', String(locale() === b.lang)));
}

// The Courses link shows where the visitor is: the page itself on the home page, "within" below it.
function updateNav(parts) {
  const link = document.querySelector('.bar nav a[data-nav="home"]');
  if (!link) return;
  if (!parts.length) link.setAttribute('aria-current', 'page');
  else if (parts[0] === 'course' || parts[0] === 'path') link.setAttribute('aria-current', 'true');
  else link.removeAttribute('aria-current');
}

// The page footer: brand, where to go, how progress is kept, and the data credit.
function footer() {
  const root = document.querySelector('footer.site');
  if (!root) return;
  const link = (href, text, external) => h('a', external ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href }, text);
  const saved = store.status().persistent
    ? tr('Progress is saved in this browser. No account needed.', 'Kemajuan disimpan di browser ini. Tidak perlu akun.')
    : tr('This browser is blocking storage, so progress is kept only until you close or reload this page.', 'Browser ini memblokir penyimpanan, jadi kemajuan hanya tersimpan sampai halaman ini ditutup atau dimuat ulang.');
  root.replaceChildren(
    h('div', { class: 'foot-grid' },
      h('div', { class: 'foot-brand' },
        h('a', { class: 'brand', href: '#/' }, h('span', { class: 'logo', 'aria-hidden': 'true' }), 'Learnlab'),
        h('p', {}, tr('Learn machine learning by running the idea yourself: short lessons, simulators you can break, and quizzes that check what stuck.', 'Pelajari machine learning dengan menjalankan idenya sendiri: pelajaran singkat, simulator yang boleh kamu coba rusak, dan kuis untuk memeriksa apa yang sudah dipahami.'))),
      h('nav', { class: 'foot-col', 'aria-label': tr('Footer', 'Footer') },
        h('h2', {}, tr('Explore', 'Jelajahi')),
        h('ul', {},
          h('li', {}, link('#/', tr('All courses', 'Semua kursus'))),
          h('li', {}, link('#/path/beginner', tr('Level 1: Beginner', 'Level 1: Pemula'))),
          h('li', {}, h('a', { href: '#app', onclick: e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: scrollBehavior() }); document.getElementById('app')?.focus({ preventScroll: true }); } }, tr('Back to top ↑', 'Kembali ke atas ↑'))))),
      h('div', { class: 'foot-col' },
        h('h2', {}, tr('About', 'Tentang')),
        h('ul', {},
          h('li', {}, saved),
          h('li', {}, tr('Available in English and Bahasa Indonesia.', 'Tersedia dalam bahasa Inggris dan Bahasa Indonesia.')))),
      h('div', { class: 'foot-col' },
        h('h2', {}, tr('Data', 'Data')),
        h('p', {}, tr('Real-data labs use the Palmer Penguins dataset (CC0) by Gorman, Williams and Fraser, 2014. ', 'Lab data nyata memakai dataset Palmer Penguins (CC0) oleh Gorman, Williams, dan Fraser, 2014. '),
          link('https://github.com/allisonhorst/palmerpenguins', tr('Source', 'Sumber'), true), '.'))),
    h('p', { class: 'foot-base' }, 'Learnlab · ', tr('Built for learning by doing.', 'Dibuat untuk belajar sambil mencoba.')));
}

// The last part is the page itself: text, marked as the current page; the others are links.
const crumbs = (...parts) => {
  const all = parts.filter(Boolean);
  const nav = h('nav', { class: 'crumbs', 'aria-label': tr('Breadcrumb', 'Navigasi halaman') },
    all.flatMap((p, i) => {
      const part = i === all.length - 1 && typeof p === 'string' ? h('span', { 'aria-current': 'page' }, p) : p;
      return i ? [' / ', part] : [part];
    }));
  // "Back" goes up one level: the parent is the last link in the trail. Escape does the same (see the keydown
  // handler near the router). Browser Back still steps through history as usual.
  const parent = [...all].reverse().find(p => typeof p !== 'string' && p?.tagName === 'A');
  if (!parent) return nav;
  const back = h('a', {
    class: 'back-btn', href: parent.getAttribute('href'),
    'aria-label': `${tr('Back to', 'Kembali ke')} ${parent.textContent}`,
    title: tr('Back (Esc)', 'Kembali (Esc)'),
  });
  // An arrow icon only: the accessible name and the tooltip carry the words and the Esc shortcut.
  back.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return h('div', { class: 'crumbbar' }, back, nav);
};

function titleText(text) { return text ? `${text} · Learnlab` : tr('Learnlab · learn by running it', 'Learnlab · belajar sambil praktik'); }

// A message with a retry button, for a part of a page (or all of it) that could not be loaded.
function errorBlock(message, retry) {
  return h('div', { class: 'inline-error', role: 'alert' },
    h('p', { class: 'error' }, message),
    retry && h('button', { type: 'button', class: 'btn', onclick: retry }, tr('Try again', 'Coba lagi')));
}

// What went wrong, in words for a learner. The details go to the console, never to the page.
function failureText(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return tr('You appear to be offline. Reconnect, then try again.', 'Kamu tampaknya sedang offline. Sambungkan kembali, lalu coba lagi.');
  if (err?.timeout) return tr('The course service took too long to answer. Please try again.', 'Layanan kursus terlalu lama merespons. Silakan coba lagi.');
  return tr('The course service did not answer as expected. Please try again in a moment.', 'Layanan kursus tidak merespons seperti seharusnya. Coba lagi sebentar lagi.');
}

// A part of a page that is built asynchronously and can fail on its own (the quiz): a failure
// shows an error with a retry button inside that part, while the rest of the page stays.
async function scoped(ctx, build) {
  const host = h('div', { class: 'scoped' });
  const run = async () => {
    host.replaceChildren(h('p', { class: 'muted', role: 'status' }, tr('Loading…', 'Memuat…')));
    try {
      const view = await build();
      if (!ctx.disposed) host.replaceChildren(view);
    } catch (err) {
      if (ctx.disposed) return; // the visitor has moved on; this failure no longer matters
      console.error(err);
      host.replaceChildren(errorBlock(failureText(err), run));
    }
  };
  await run();
  return host;
}

// ---------- views ----------
// Every view is (ctx, ...args) and returns the DOM to show. `ctx` belongs to one navigation:
// ctx.title(text) sets the tab title (ignored if the navigation is already out of date),
// ctx.onLeave(fn) runs fn when the visitor leaves the view, ctx.afterCommit(fn) runs fn once the
// view is on the page, ctx.state is a plain object that survives a language switch (the quiz
// keeps its answers there), ctx.interactive marks a view holding work that a re-render would
// discard, and ctx.onQuery(fn) lets a view handle a change of only the ?query part of the URL.

async function homeView(ctx) {
  const cat = await loadCatalog();
  ctx.title('');
  const all = cat.courses;
  const lessonTotal = all.reduce((n, c) => n + c.lessons.length, 0);
  const done = known() ? doneCount(cat) : 0;
  const empty = emptyCatalog(cat);
  if (empty) console.warn('The catalog is empty. Seed it: go run ./cmd/seed');
  const action = empty ? null : callToAction(cat, cat, { start: tr('Start learning', 'Mulai belajar'), review: tr('Review courses', 'Lihat lagi kursus') });
  return h('div', {},
    h('section', { class: 'hero' },
      h('p', { class: 'eyebrow' }, h('span'), tr('INTERACTIVE COURSES', 'KURSUS INTERAKTIF')),
      h('h1', {}, tr('Learn it by running it.', 'Belajar sambil praktik.')),
      h('p', { class: 'lede' }, tr('Every course pairs short readings with simulators you can step through, break, and tweak. Then a few questions check what stuck.', 'Tiap kursus berisi bacaan singkat dan simulator yang bisa kamu jalankan langkah demi langkah, kamu ubah-ubah, bahkan sengaja kamu rusak. Setelah itu ada beberapa soal untuk mengecek apa yang sudah kamu pahami.')),
      !empty && h('div', { class: 'hero-actions' },
        action,
        known() ? h('span', { class: 'muted' }, lessonsDone(done, lessonTotal)) : null)),
    h('section', { 'aria-labelledby': 'paths-h' },
      h('h2', { id: 'paths-h', class: 'section-title' }, tr('Learning paths', 'Jalur belajar')),
      cat.paths.length ? h('div', { class: 'grid' }, cat.paths.map(pathCard)) : h('p', { class: 'muted' }, tr('No courses are available yet. Please check back soon.', 'Belum ada kursus yang tersedia. Silakan kembali lagi nanti.'))));
}

function pathCard(p) {
  const d = doneCount(p), total = lessonsOf(p).length;
  return h('a', { class: 'card course-card', href: `#/path/${p.slug}` },
    h('div', { class: 'tags' }, h('span', { class: 'tag' }, count(p.courses.length, 'course', 'kursus')), h('span', { class: `tag level-${p.level}` }, levelName(p.level))),
    h('h3', {}, p.title),
    h('p', {}, p.summary),
    h('ul', { class: 'path-courses' }, p.courses.map(c => h('li', {}, c.title))),
    h('div', { class: 'card-foot' }, progressBar(d, total), h('span', { class: 'muted' }, known()
      ? tr(`${fmt(d)}/${count(total, 'lesson', 'pelajaran')} · ${shortMinutes(minutes(p))}`, `${fmt(d)}/${fmt(total)} pelajaran · ${shortMinutes(minutes(p))}`)
      : tr(`${count(total, 'lesson', 'pelajaran')} · ${shortMinutes(minutes(p))}`, `${fmt(total)} pelajaran · ${shortMinutes(minutes(p))}`))));
}

function courseCard(c) {
  const d = doneCount(c);
  const parts = count(c.modules.length, 'part', 'bagian');
  return h('a', { class: 'card course-card', href: `#/course/${c.slug}` },
    h('div', { class: 'tags' }, h('span', { class: 'tag' }, topicName(c)), h('span', { class: `tag level-${c.level}` }, levelName(c.level))),
    h('h3', {}, c.title),
    h('p', {}, c.summary),
    h('div', { class: 'card-foot' }, progressBar(d, c.lessons.length), h('span', { class: 'muted' }, known()
      ? tr(`${parts} · ${fmt(d)}/${count(c.lessons.length, 'lesson', 'pelajaran')} · ${shortMinutes(minutes(c))}`, `${parts} · ${fmt(d)}/${fmt(c.lessons.length)} pelajaran · ${shortMinutes(minutes(c))}`)
      : tr(`${parts} · ${count(c.lessons.length, 'lesson', 'pelajaran')} · ${shortMinutes(minutes(c))}`, `${parts} · ${fmt(c.lessons.length)} pelajaran · ${shortMinutes(minutes(c))}`))));
}

// Shown when the API answers but holds no courses at all (an unseeded database).
function emptyCatalogView(ctx) {
  console.warn('The catalog is empty. Seed it: go run ./cmd/seed');
  ctx.title(tr('No courses yet', 'Belum ada kursus'));
  return h('div', { class: 'empty' }, h('h1', {}, tr('No courses yet', 'Belum ada kursus')), h('p', { class: 'muted' }, tr('No courses are available yet. Please check back soon.', 'Belum ada kursus yang tersedia. Silakan kembali lagi nanti.')));
}

async function pathView(ctx, slug) {
  const cat = await loadCatalog();
  if (emptyCatalog(cat)) return emptyCatalogView(ctx);
  const p = cat.pathBySlug(slug);
  if (!p) return notFound(ctx, tr('That learning path does not exist.', 'Jalur belajar itu tidak ditemukan.'));
  ctx.title(p.title);
  const d = doneCount(p), total = lessonsOf(p).length;
  const needs = (p.requires ?? []).map(s => cat.pathBySlug(s)).filter(Boolean);
  return h('div', {},
    crumbs(h('a', { href: '#/' }, tr('Courses', 'Kursus')), p.title),
    h('section', { class: 'course-head' },
      h('div', { class: 'tags' }, h('span', { class: `tag level-${p.level}` }, levelName(p.level))),
      h('h1', {}, p.title),
      h('p', { class: 'lede' }, p.summary),
      needs.length ? h('p', { class: 'muted' }, tr('Recommended first: ', 'Sebaiknya mulai dari: '), needs.map((n, i) => [i ? ', ' : '', h('a', { href: `#/path/${n.slug}` }, n.title)])) : null,
      h('div', { class: 'hero-actions' },
        callToAction(p, cat, { start: tr('Start this path', 'Mulai jalur ini'), review: tr('Review this path', 'Lihat lagi jalur ini') }),
        h('span', { class: 'muted' }, known() ? `${lessonsDone(d, total)} · ${aboutMinutes(minutes(p))}` : aboutMinutes(minutes(p)))),
      progressBar(d, total)),
    h('section', { 'aria-labelledby': 'path-courses-h' },
      h('h2', { id: 'path-courses-h', class: 'sr-only' }, tr('Courses in this path', 'Kursus di jalur ini')),
      h('div', { class: 'grid' }, p.courses.map(courseCard))));
}

async function courseView(ctx, slug) {
  const cat = await loadCatalog();
  if (emptyCatalog(cat)) return emptyCatalogView(ctx);
  const c = cat.courses.find(x => sameSlug(x.slug, slug));
  if (!c) return notFound(ctx, tr('That course does not exist.', 'Kursus itu tidak ditemukan.'));
  ctx.title(c.title);
  const d = doneCount(c);
  let n = 0;
  return h('div', {},
    crumbs(h('a', { href: '#/' }, tr('Courses', 'Kursus')), c.path ? h('a', { href: `#/path/${c.path.slug}` }, c.path.title) : null, c.title),
    h('section', { class: 'course-head' },
      h('div', { class: 'tags' }, h('span', { class: 'tag' }, topicName(c)), h('span', { class: `tag level-${c.level}` }, levelName(c.level))),
      h('h1', {}, c.title),
      h('p', { class: 'lede' }, c.summary),
      h('div', { class: 'hero-actions' },
        callToAction(c, cat, { start: tr('Start course', 'Mulai kursus'), review: tr('Review course', 'Lihat lagi kursus') }),
        h('span', { class: 'muted' }, known() ? `${lessonsDone(d, c.lessons.length)} · ${aboutMinutes(minutes(c))}` : aboutMinutes(minutes(c)))),
      progressBar(d, c.lessons.length)),
    c.modules.map((m, mi) => h('section', { class: 'module', 'aria-labelledby': `mod-${mi}` },
      h('div', { class: 'module-head' },
        h('div', {}, h('p', { class: 'eyebrow' }, h('span'), tr(`PART ${fmt(mi + 1)}`, `BAGIAN ${fmt(mi + 1)}`)), h('h2', { id: `mod-${mi}` }, m.title), m.summary ? h('p', { class: 'muted' }, m.summary) : null),
        known() ? h('span', { class: 'muted module-count' }, tr(`${fmt(doneCount(m))}/${fmt(m.lessons.length)} done`, `${fmt(doneCount(m))}/${fmt(m.lessons.length)} selesai`)) : null),
      h('ol', { class: 'lesson-list' }, m.lessons.map(l => {
        const p = known() ? store.progressFor(l.id) : null;
        n++;
        // Empty for a lesson not started: no element at all, so rows keep one height until there is something to say.
        const status = p?.completed ? (p.total ? `${tr('Done', 'Selesai')} · ${fmt(p.score)}/${fmt(p.total)}` : tr('Done', 'Selesai')) : p?.total ? `${tr('Best', 'Terbaik')} ${fmt(p.score)}/${fmt(p.total)}` : '';
        return h('li', {}, h('a', { class: 'card lesson-row', href: lessonUrl(c, l) },
          h('span', { class: `step${p?.completed ? ' done' : ''}`, 'aria-hidden': 'true' }, p?.completed ? '✓' : fmt(n)),
          h('span', { class: 'lesson-main' }, h('strong', {}, l.title), h('span', { class: 'lesson-meta-row' }, lessonMeta(l), status ? h('span', { class: 'muted status-inline' }, status) : null)),
          status ? h('span', { class: 'muted status-text' }, status) : null));
      })))));
}

// A lesson has up to three views: Learn (the study material), Simulate (the lab
// plus its guide, simulator lessons only) and Quiz. They form one linear path
// through the course, which the pager at the bottom of every view follows.
const TAB_LABEL = { get learn() { return tr('Learn', 'Belajar'); }, get simulate() { return tr('Simulate', 'Simulasi'); }, get quiz() { return tr('Quiz', 'Kuis'); } };
const tabsOf = lesson => (lesson.kind === 'simulator' ? ['learn', 'simulate', 'quiz'] : ['learn', 'quiz']);
const lessonHref = (c, l, tab = 'learn') => `#/course/${c.slug}/${l.slug}${tab === 'learn' ? '' : '/' + tab}`;

function steps(c) {
  return c.lessons.flatMap(lesson => tabsOf(lesson).map(tab => ({ lesson, tab })));
}

// The best quiz score on the lesson's Quiz tab. Redrawn whenever the stored progress changes. The pill is
// for the eye; the same fact is written out, with whether the quiz is passed, for assistive technology.
function paintQuizBadge(tab, lesson) {
  if (!tab) return;
  tab.querySelectorAll('.badge, .badge-text').forEach(e => e.remove());
  const p = known() ? store.progressFor(lesson.id) : null;
  if (!p?.total) return;
  const text = tr(`, best score ${fmt(p.score)} of ${fmt(p.total)}, ${p.completed ? 'passed' : 'not passed yet'}`, `, skor terbaik ${fmt(p.score)} dari ${fmt(p.total)}, ${p.completed ? 'lulus' : 'belum lulus'}`);
  tab.append(h('span', { class: `badge ${p.completed ? 'done' : 'todo'}`, 'aria-hidden': 'true' }, `${p.completed ? '✓ ' : ''}${fmt(p.score)}/${fmt(p.total)}`), h('span', { class: 'badge-text sr-only' }, text));
}

async function lessonView(ctx, courseSlug, lessonSlug, requestedTab, query) {
  const cat = await loadCatalog();
  if (emptyCatalog(cat)) return emptyCatalogView(ctx);
  const c = cat.courses.find(x => sameSlug(x.slug, courseSlug));
  const idx = c ? c.lessons.findIndex(l => sameSlug(l.slug, lessonSlug)) : -1;
  if (idx < 0) return notFound(ctx, tr('That lesson does not exist.', 'Pelajaran itu tidak ditemukan.'));
  const lesson = c.lessons[idx];
  const tabs = tabsOf(lesson);
  const tab = requestedTab ?? 'learn';
  if (!tabs.includes(tab)) return notFound(ctx, tr('That lesson has no such section.', 'Pelajaran ini tidak punya bagian itu.'), { href: lessonHref(c, lesson), label: tr('Back to the lesson', 'Kembali ke pelajaran') });
  ctx.title(`${TAB_LABEL[tab]} · ${lesson.title} · ${c.title}`);

  const [learnSource, labSource = ''] = lesson.body.split(/\n@@lab\n/);
  let quizTab = null;
  const tabBar = h('nav', { class: 'tabs', 'aria-label': tr('Lesson sections', 'Bagian pelajaran') }, tabs.map(t => {
    const a = h('a', { class: 'tab', href: lessonHref(c, lesson, t), 'aria-current': t === tab ? 'page' : null }, TAB_LABEL[t]);
    if (t === 'quiz') { quizTab = a; paintQuizBadge(a, lesson); }
    return a;
  }));

  const all = steps(c);
  const at = all.findIndex(s => s.lesson === lesson && s.tab === tab);
  const prev = all[at - 1], next = all[at + 1];
  const label = s => (s.tab === 'learn' ? s.lesson.title : `${s.lesson.title} · ${TAB_LABEL[s.tab]}`);
  const pager = h('nav', { class: 'pager', 'aria-label': tr('Course path', 'Alur kursus') },
    prev ? h('a', { class: 'btn', href: lessonHref(c, prev.lesson, prev.tab) }, `← ${label(prev)}`) : h('span'),
    next ? h('a', { class: 'btn primary', href: lessonHref(c, next.lesson, next.tab) }, `${label(next)} →`) : h('a', { class: 'btn primary', href: `#/course/${c.slug}` }, tr('Back to course', 'Kembali ke kursus')));

  // On the Learn tab the side buttons carry on along the course path at either end
  // of the lesson, so they replace this pager there.
  const path = {
    pager,
    prev: prev ? { href: lessonHref(c, prev.lesson, prev.tab), label: label(prev) } : null,
    next: next ? { href: lessonHref(c, next.lesson, next.tab), label: label(next) } : { href: `#/course/${c.slug}`, label: tr('Back to course', 'Kembali ke kursus') },
  };
  // Only the tabs that show figures load them; the quiz needs none.
  const figs = tab === 'quiz' ? {} : await loadFigures(c.slug, learnSource, labSource);
  let content;
  if (tab === 'learn') content = learnView(ctx, c, learnSource, lesson, tabs, path, figs, query);
  else if (tab === 'simulate') content = simulateView(ctx, lesson, labSource, figs);
  else { ctx.interactive = true; content = await scoped(ctx, () => quizView(c, lesson, ctx, () => paintQuizBadge(quizTab, lesson))); }

  return h('div', { class: 'lesson' },
    crumbs(h('a', { href: '#/' }, tr('Courses', 'Kursus')), c.path ? h('a', { href: `#/path/${c.path.slug}` }, c.path.title) : null, h('a', { href: `#/course/${c.slug}` }, c.title), lesson.title),
    h('header', { class: 'lesson-head' },
      h('div', { class: 'lesson-meta-bar' },
        h('p', { class: 'eyebrow' }, h('span'), tr(`LESSON ${fmt(idx + 1)} OF ${fmt(c.lessons.length)}`, `PELAJARAN ${fmt(idx + 1)} DARI ${fmt(c.lessons.length)}`)),
        lessonMeta(lesson)),
      h('h1', {}, lesson.title),
      tabBar),
    h('section', { class: 'view', 'aria-label': TAB_LABEL[tab] }, content),
    pager);
}

// Where the learner stopped reading, per lesson. Storage can be blocked, so it is optional.
const posKey = lesson => `learnlab.pos.${lesson.id}`;
const loadPos = lesson => { try { return Number(localStorage.getItem(posKey(lesson))) || 0; } catch { return 0; } };
const savePos = (lesson, n) => { try { localStorage.setItem(posKey(lesson), String(n)); } catch { /* not remembered */ } };


// The Learn tab shows one section at a time. Previous and next are the two
// buttons below the material. Within a lesson they step through sections; past
// the first or last section they continue along the course path (the previous or
// next lesson step), so this is the only previous/next control on the tab. The
// table of contents on the left is a jump list. The arrow keys are a shortcut for the buttons.
//
// The section is part of the address: `#/course/<c>/<lesson>?s=<n>` (1-based). Stepping to another
// section adds a history entry, so Back returns to the previous section and leaves the lesson only
// after the first; the current entry is rewritten to carry its section as soon as the lesson opens,
// which also makes the address shareable. Without `?s` the lesson reopens where the learner stopped
// (saved in this browser), and says so, with a way to start over.
function learnView(ctx, c, source, lesson, tabs, path, figs, query) {
  const prose = h('article', { class: 'prose' }, renderMarkdown(source, figs));
  const nodes = [...prose.children];
  const heads = [...prose.querySelectorAll(':scope > h2')];
  const total = heads.length;
  // Numbered with a data attribute, not a CSS counter: counters skip hidden headings.
  // tabindex -1: a section change puts focus on the new section's heading.
  heads.forEach((el, i) => { el.id = `sec-${i}`; el.dataset.n = String(i + 1); el.setAttribute('tabindex', '-1'); });
  // Every node belongs to the section whose heading it follows (the overview card goes with section 1).
  let chunk = 0;
  nodes.forEach(n => { if (n.tagName === 'H2') chunk = heads.indexOf(n); n.dataset.chunk = String(chunk); });

  const sectionOf = q => { const n = Number.parseInt(q?.get('s') ?? '', 10); return Number.isInteger(n) && n >= 1 && n <= total ? n - 1 : null; };
  const sectionHash = i => `${lessonHref(c, lesson)}?s=${i + 1}`;
  const saved = Math.min(loadPos(lesson), Math.max(0, total - 1));
  const fromUrl = total > 1 ? sectionOf(query) : null;
  let active = fromUrl ?? saved;
  ctx.state.resumed ??= total > 1 && fromUrl == null && saved > 0;

  // ----- previous / next, below the material -----
  const prevBtn = h('button', { type: 'button', class: 'btn', onclick: () => { if (active > 0) goTo(active - 1); else if (path.prev) location.hash = path.prev.href; } });
  const nextBtn = h('button', { type: 'button', class: 'btn primary', onclick: () => { if (active < total - 1) goTo(active + 1); else location.hash = path.next.href; } });
  const sectionNav = h('nav', { class: 'section-nav', 'aria-label': tr('Previous and next', 'Sebelumnya dan berikutnya') }, prevBtn, nextBtn);

  // ----- table of contents (a jump list) -----
  const tocCount = h('span', { class: 'toc-count' });
  const items = heads.map((el, i) => h('li', {}, h('button', { type: 'button', class: 'link', onclick: () => goTo(i) }, el.textContent)));
  // On a tablet or phone the list folds into one line ("On this page, 4 of 8"); on a wide screen it is always open.
  const toc = total > 2 ? h('aside', { class: 'toc', 'aria-label': tr('On this page', 'Di halaman ini') },
    h('details', {}, h('summary', {}, h('strong', {}, tr('On this page', 'Di halaman ini')), tocCount), h('ol', {}, items))) : null;
  const tocBox = toc?.firstElementChild;
  const narrow = typeof matchMedia === 'function' ? matchMedia('(max-width: 860px)') : null;
  if (tocBox) {
    tocBox.open = !narrow?.matches;
    narrow?.addEventListener('change', () => { tocBox.open = !narrow.matches; }, { signal: ctx.signal });
    tocBox.firstElementChild.addEventListener('click', e => { if (!narrow?.matches) e.preventDefault(); });
  }

  // ----- reopened part-way -----
  const resumeNote = ctx.state.resumed ? h('p', { class: 'resume-note' },
    tr(`Continuing where you left off (section ${fmt(active + 1)} of ${fmt(total)}).`, `Melanjutkan dari terakhir kamu berhenti (bagian ${fmt(active + 1)} dari ${fmt(total)}).`), ' ',
    h('button', { type: 'button', class: 'link-btn', onclick: () => goTo(0) }, tr('Start from the beginning', 'Mulai dari awal'))) : null;

  function paint() {
    nodes.forEach(n => { n.hidden = total > 1 && Number(n.dataset.chunk) !== active; });
    nodes.forEach(n => n.classList.remove('first-shown'));
    nodes.find(n => !n.hidden)?.classList.add('first-shown');
    if (!total) return;
    items.forEach((li, i) => li.firstChild.setAttribute('aria-current', i === active ? 'true' : 'false'));
    tocCount.textContent = tr(`${fmt(active + 1)} of ${fmt(total)}`, `${fmt(active + 1)} dari ${fmt(total)}`);
    // Within the lesson the buttons name the neighbouring section; at either end they name the course step they lead to.
    const prevName = active > 0 ? `${tr('Previous section', 'Bagian sebelumnya')}: ${heads[active - 1].textContent}` : path.prev ? `${tr('Previous step', 'Langkah sebelumnya')}: ${path.prev.label}` : '';
    const nextName = active < total - 1 ? `${tr('Next section', 'Bagian berikutnya')}: ${heads[active + 1].textContent}` : `${tr('Next step', 'Langkah berikutnya')}: ${path.next.label}`;
    // The first section of a course's first lesson has nothing before it: no button rather than a dead one.
    prevBtn.hidden = active === 0 && !path.prev;
    if (prevName) prevBtn.setAttribute('aria-label', prevName); else prevBtn.removeAttribute('aria-label');
    prevBtn.textContent = `← ${active > 0 ? heads[active - 1].textContent : path.prev ? path.prev.label : ''}`;
    nextBtn.setAttribute('aria-label', nextName);
    nextBtn.textContent = `${active < total - 1 ? heads[active + 1].textContent : path.next.label} →`;
    // These buttons replace the course-path pager whenever they are shown.
    path.pager.hidden = total > 1;
  }

  function goTo(i, { push = true } = {}) {
    active = Math.max(0, Math.min(total - 1, i));
    savePos(lesson, active);
    ctx.state.resumed = false;
    resumeNote?.remove();
    if (tocBox && narrow?.matches) tocBox.open = false; // the list got the learner here; now the section is what to read
    paint();
    if (push && total > 1 && sectionOf(new URLSearchParams(location.hash.split('?')[1] ?? '')) !== active) history.pushState(history.state, '', sectionHash(active));
    prose.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    // Keyboard focus and screen readers follow the content: the heading of the section now shown.
    // (Focusing the Next button instead would leave it off-screen below the new section.)
    if (total > 1) {
      heads[active].focus({ preventScroll: true });
      announce(tr(`Section ${fmt(active + 1)} of ${fmt(total)}`, `Bagian ${fmt(active + 1)} dari ${fmt(total)}`));
    }
  }

  // Back and Forward between sections of this lesson arrive here (only the ?s part changed).
  ctx.onQuery = q => {
    const s = sectionOf(q);
    if (s == null) history.replaceState(history.state, '', sectionHash(active)); // a link to the lesson itself: stay, and say where we are
    else if (s !== active) goTo(s, { push: false });
  };
  if (total > 1) ctx.afterCommit(() => history.replaceState(history.state, '', sectionHash(active)));

  // Left and right arrow keys are a shortcut for the buttons. They stay inside the
  // lesson (they never jump to another course step), so a stray key press cannot
  // take you out of what you are reading. Ignored while typing or in a control.
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target.closest?.('input, select, textarea, [contenteditable]')) return;
    if (e.key === 'ArrowRight' && active < total - 1) { e.preventDefault(); goTo(active + 1); }
    if (e.key === 'ArrowLeft' && active > 0) { e.preventDefault(); goTo(active - 1); }
  }, { signal: ctx.signal });

  paint();
  const body = h('div', { class: 'learn-body' }, resumeNote, prose, total > 1 ? sectionNav : null);
  return h('div', { class: 'learn' }, toc, body);
}

// ----- simulators -----

// The settings controls of the lab on the page, in order, so a language switch (which rebuilds the
// lab) can put the learner's slider, menu and checkbox values back. Labs keep everything else
// (placed points, a running animation) inside themselves, so those restart.
const LAB_CONTROLS = '.sim .settings input:not([type=button]), .sim .settings select';
function snapshotControls() {
  const list = [...app.querySelectorAll(LAB_CONTROLS)];
  return list.length ? list.map(el => ({ kind: `${el.tagName}:${el.type}`, value: el.value, checked: el.checked })) : null;
}
function restoreControls(host, snap) {
  const list = [...host.querySelectorAll(LAB_CONTROLS)];
  if (!snap || list.length !== snap.length || list.some((el, i) => `${el.tagName}:${el.type}` !== snap[i].kind)) return 0;
  let restored = 0;
  list.forEach((el, i) => {
    const want = snap[i];
    const same = el.type === 'checkbox' ? el.checked === want.checked : el.value === want.value;
    if (same) return;
    if (el.type === 'checkbox') el.checked = want.checked; else el.value = want.value;
    el.dispatchEvent(new Event(el.type === 'range' ? 'input' : 'change', { bubbles: true }));
    restored++;
  });
  return restored;
}

// A module that failed to load is remembered as failed for the life of the page, so loading it
// again needs a different address. Each failure bumps a counter and the next load asks for
// `?retry=<n>`; a lab's or figure file's own imports are shared and stay cached.
const importFailures = new Map();
const importUrl = url => `${url}${importFailures.get(url) ? `?retry=${importFailures.get(url)}` : ''}`;
const noteImportFailure = url => importFailures.set(url, (importFailures.get(url) ?? 0) + 1);
const labFile = key => `sims/labs/${key}.js`;
const importLab = key => (importFailures.get(labFile(key)) ? import(`./${importUrl(labFile(key))}`) : loadLab(key))
  .catch(err => { noteImportFailure(labFile(key)); throw err; });

// Loads a lab into `host` once the view is on the page. A lab that fails to load or start shows
// a message with a retry button. Mounting is tied to this navigation: if the visitor has already
// moved on, nothing is mounted (and a lab that did get mounted is destroyed on leaving).
function mountLab(ctx, host, key) {
  ctx.interactive = true;
  const mount = mod => {
    if (ctx.disposed) return;
    try {
      host.replaceChildren();
      const destroy = mod.mount(host);
      const sheet = wireSettingsSheet(host);
      const cards = layoutLabCards(host);
      ctx.onLeave(() => { cards.destroy(); sheet.destroy(); if (typeof destroy === 'function') destroy(); });
      const snap = ctx.state.controls;
      delete ctx.state.controls;
      if (snap) {
        const restored = restoreControls(host, snap);
        const text = restored
          ? tr('The language changed, so the simulator restarted. Your settings were kept.', 'Bahasa diganti, jadi simulator dimulai ulang. Pengaturanmu tetap dipertahankan.')
          : tr('The language changed, so the simulator restarted from the beginning.', 'Bahasa diganti, jadi simulator dimulai ulang dari awal.');
        notify('lab-language', { text: () => text, dismissible: true });
        announce(text);
        setTimeout(() => dismiss('lab-language'), 9000);
      }
    } catch (err) {
      console.error(err);
      host.replaceChildren(errorBlock(tr('This simulator could not be started.', 'Simulator ini gagal dijalankan.'), attempt));
    }
  };
  function attempt() {
    host.replaceChildren(h('p', { class: 'muted', role: 'status' }, tr('Loading simulator…', 'Memuat simulator…')));
    importLab(key).then(mod => ctx.afterCommit(() => mount(mod)), err => {
      console.error(err);
      if (!ctx.disposed) host.replaceChildren(errorBlock(tr('This simulator could not be loaded.', 'Simulator ini gagal dimuat.'), attempt));
    });
  }
  attempt();
}

function simulateView(ctx, lesson, labSource, figs) {
  const host = h('div', { class: 'sim-host' });
  mountLab(ctx, host, lesson.simulator);
  return h('div', {}, host, labSource ? h('article', { class: 'prose lab-guide' }, renderMarkdown(labSource, figs)) : null);
}

// `ctx` is this navigation's context (the attempt in progress is kept in ctx.state.quiz, so a language
// switch does not throw the answers away); `onProgress` repaints the lesson's Quiz tab badge.
async function quizView(c, lesson, ctx, onProgress) {
  let questions = await api.questions(lesson.id);
  if (locale() !== 'en') {
    const texts = (await api.questionTexts(lesson.id)).filter(t => t.locale === locale());
    questions = questions.map(q => { const t = texts.find(x => x.position === q.position); return t ? { ...q, prompt: t.prompt, options: t.options, explanation: t.explanation } : q; });
  }
  // Present before anything is written to it, so a screen reader announces what is put there later.
  const status = h('span', { class: 'muted', role: 'status' });
  if (!questions.length) return h('p', { class: 'muted' }, tr('This lesson has no quiz yet.', 'Pelajaran ini belum punya kuis.'));
  const need = Math.ceil(questions.length * 0.6);

  // Completion is a status, not a control: a lesson is complete once its quiz is passed.
  const completion = h('p', { class: 'completion', role: 'status' });
  const best = h('p', { class: 'best' });
  const paintComplete = () => {
    const done = store.isDone(lesson.id);
    const p = store.progressFor(lesson.id);
    completion.className = `completion${done ? ' done' : ''}`;
    completion.textContent = done ? tr('✓ Lesson completed', '✓ Pelajaran selesai') : tr(`Not completed yet. Get ${fmt(need)} of ${fmt(questions.length)} right to complete it.`, `Belum selesai. Kamu perlu menjawab benar ${fmt(need)} dari ${fmt(questions.length)} soal.`);
    best.hidden = !p?.total;
    best.replaceChildren(...(p?.total ? [h('strong', {}, `${fmt(p.score)}/${fmt(p.total)}`), ` ${tr('best so far', 'skor terbaik')}`] : []));
    onProgress?.();
  };
  paintComplete();

  const alreadyDone = store.isDone(lesson.id);
  const attempt = quiz(lesson, questions, need, status, paintComplete, { state: (ctx.state.quiz ??= {}), lazy: alreadyDone });
  const host = h('div', {}, attempt.root);
  if (alreadyDone && !attempt.active) {
    // A finished lesson does not drop you into the quiz again: offer a retake instead.
    const done = h('div', { class: 'card quiz-done' },
      h('div', {}, h('h2', {}, tr('You have passed this quiz', 'Kuis ini sudah kamu lewati')), h('p', { class: 'muted' }, tr('Retake it any time to practise. Your best score is kept.', 'Kuis boleh diulang kapan saja untuk latihan. Skor terbaikmu tetap tersimpan.'))),
      h('button', { type: 'button', class: 'btn primary', onclick: () => { done.replaceWith(attempt.root); attempt.start(true); } }, tr('Retake the quiz', 'Ulangi kuis')));
    host.replaceChildren(done);
  }

  return h('div', { class: 'quiz-view' },
    h('div', { class: 'quiz-intro card' },
      h('div', { class: 'quiz-intro-head' }, h('h2', {}, tr('Check yourself', 'Cek pemahamanmu')), best),
      h('p', { class: 'muted' }, tr(`${count(questions.length, 'question', 'soal')}. Get ${fmt(need)} right to complete the lesson. Each answer shows an explanation.`, `${fmt(questions.length)} soal. Jawab benar ${fmt(need)} untuk menyelesaikan pelajaran. Tiap jawaban ada penjelasannya.`)),
      completion),
    host, status);
}

// The quiz shows one question at a time: pick an answer, check it (the answer is
// then locked and explained), move on, and see the results at the end. Option order
// is shuffled for every attempt so the right answer is not always in the same slot;
// each radio keeps its original index as its value, which is what grading compares.
//
// Every step that replaces what is on screen puts keyboard focus on the new content (the question
// or the results heading; after Check, on the button that goes on) and, when the quiz is scrolled
// out of view, scrolls back to it. Announcements go through one live region that stays in place
// while the steps around it are replaced. `state` keeps the attempt across a re-draw (a language
// switch): the answers, the question shown, and whether the result was already saved.
function quiz(lesson, questions, need, status, paintComplete, { state = {}, lazy = false } = {}) {
  const root = h('div', { class: 'quiz' });
  const view = h('div', { class: 'quiz-step' });
  const live = h('p', { class: 'sr-only', role: 'status' });
  root.append(view, live);
  const last = questions.length - 1;
  const n = questions.length;
  state.status = status; // the newest status line, for a save that outlives a re-draw
  let idx, picks, checked, orders, finished;

  const shuffled = k => {
    const order = Array.from({ length: k }, (_, i) => i);
    for (let i = k - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    return order;
  };
  const isRight = i => picks[i] === questions[i].answer;
  const score = () => questions.filter((_, i) => isRight(i)).length;

  let sayTimer;
  // Changing the text of a region that is already on the page is what screen readers announce.
  function say(text) {
    clearTimeout(sayTimer);
    live.textContent = '';
    sayTimer = setTimeout(() => { live.textContent = text; }, 60);
  }

  // Scroll the quiz back into view when a step change left it above or far below the window.
  function reveal() {
    const r = root.getBoundingClientRect();
    if (r.top < 0 || r.top > innerHeight * 0.6) root.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
  }

  function start(focus = false) {
    idx = 0;
    finished = false;
    picks = questions.map(() => null);
    checked = questions.map(() => false);
    orders = questions.map(q => shuffled(q.options.length));
    status.replaceChildren();
    render(focus ? 'step' : null);
  }

  function progress() {
    const done = checked.filter(Boolean).length;
    const right = questions.filter((_, i) => checked[i] && isRight(i)).length;
    return h('div', { class: 'q-progress', role: 'progressbar', 'aria-label': tr('Quiz progress', 'Progres kuis'), 'aria-valuemin': 0, 'aria-valuemax': n, 'aria-valuenow': done, 'aria-valuetext': tr(`${fmt(done)} of ${fmt(n)} answered, ${fmt(right)} correct`, `${fmt(done)} dari ${fmt(n)} terjawab, ${fmt(right)} benar`) },
      questions.map((_, i) => h('span', { class: `q-seg${checked[i] ? (isRight(i) ? ' right' : ' wrong') : ''}${i === idx ? ' now' : ''}`, 'aria-hidden': 'true' })));
  }

  const feedbackFor = i => {
    const q = questions[i];
    return `${isRight(i) ? tr('Correct. ', 'Benar. ') : tr(`Not quite. The answer is “${q.options[q.answer]}”. `, `Belum tepat. Jawabannya “${q.options[q.answer]}”. `)}${q.explanation ?? ''}`;
  };

  // The outcome in words. A lesson that was already completed stays completed, whatever this attempt scored.
  const resultMessage = () => {
    if (score() >= need) return tr('Lesson complete.', 'Pelajaran selesai.');
    if (store.isDone(lesson.id)) return tr(`That is under ${fmt(need)} correct, but the lesson stays completed and your best score is kept. Review the answers below to practise.`, `Itu kurang dari ${fmt(need)} jawaban benar, tetapi pelajaran tetap selesai dan skor terbaikmu tetap tersimpan. Baca lagi jawaban di bawah untuk berlatih.`);
    return tr(`You need ${fmt(need)} correct answers to complete the lesson. Review the answers below and try again.`, `Kamu perlu ${fmt(need)} jawaban benar untuk menyelesaikan pelajaran. Baca lagi jawaban di bawah, lalu coba lagi.`);
  };

  function questionView() {
    const q = questions[idx];
    const locked = checked[idx];
    const reviewing = finished; // the results were already shown: this is a look back, not a new attempt
    const form = h('form', { class: 'q card', novalidate: true });
    const feedback = h('p', { class: 'feedback', hidden: !locked });
    const primary = h('button', { type: 'submit', class: 'btn primary' });
    const prev = h('button', { type: 'button', class: 'btn', disabled: idx === 0, onclick: () => { idx--; render('step'); } }, tr('← Previous', '← Sebelumnya'));
    const backToResults = reviewing && idx !== last ? h('button', { type: 'button', class: 'btn', onclick: () => { idx = n; render('step'); say(resultMessage()); } }, tr('Back to results', 'Kembali ke hasil')) : null;

    const paintButtons = () => {
      primary.textContent = !locked ? tr('Check answer', 'Cek jawaban') : idx === last ? (reviewing ? tr('Back to results', 'Kembali ke hasil') : tr('See results', 'Lihat hasil')) : tr('Next question →', 'Soal berikutnya →');
      primary.disabled = !locked && picks[idx] == null;
    };
    const opts = orders[idx].map(oi => {
      const input = h('input', { type: 'radio', name: 'answer', value: String(oi), disabled: locked });
      input.checked = picks[idx] === oi;
      input.addEventListener('change', () => { picks[idx] = oi; paintButtons(); });
      const right = locked && oi === q.answer, wrong = locked && oi === picks[idx] && !isRight(idx);
      // The verdict is written out beside the colour, so it does not depend on seeing the colour.
      const picked = locked && oi === picks[idx];
      const verdict = right
        ? h('span', { class: 'verdict ok' }, h('span', { class: 'ico', 'aria-hidden': 'true' }, '✓'), picked ? tr('Your answer, correct', 'Jawabanmu, benar') : tr('Correct answer', 'Jawaban yang benar'))
        : wrong ? h('span', { class: 'verdict no' }, h('span', { class: 'ico', 'aria-hidden': 'true' }, '✕'), tr('Your answer, not correct', 'Jawabanmu, salah')) : null;
      return h('label', { class: `opt${right ? ' right' : ''}${wrong ? ' wrong' : ''}` }, input, h('span', { class: 'opt-text' }, q.options[oi], verdict));
    });
    if (locked) {
      feedback.className = `feedback ${isRight(idx) ? 'good' : 'bad'}`;
      feedback.textContent = feedbackFor(idx);
    }
    paintButtons();
    form.append(h('fieldset', {}, h('legend', { tabindex: '-1' }, h('span', { class: 'qn' }, tr(`Question ${fmt(idx + 1)} of ${fmt(n)}`, `Soal ${fmt(idx + 1)} dari ${fmt(n)}`)), h('span', { class: 'qt' }, q.prompt)), opts, feedback),
      h('div', { class: 'q-actions' }, prev, h('div', { class: 'q-actions-end' }, backToResults, primary)));
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!locked) { if (picks[idx] == null) return; checked[idx] = true; render('action'); say(feedbackFor(idx)); return; }
      if (idx === last) { idx = n; if (!finished) { finished = true; save(); } render('step'); say(resultMessage()); } else { idx++; render('step'); }
    });
    return form;
  }

  // Saves the result once per attempt, however often the results are looked at again. If saving
  // fails the learner is told and can try again from the message.
  async function save() {
    const right = score();
    try {
      await store.record(lesson.id, { completed: right >= need, score: right, total: n });
      state.status.replaceChildren();
    } catch {
      state.status.replaceChildren(tr('Could not save progress. ', 'Progres gagal disimpan. '), h('button', { type: 'button', class: 'link-btn', onclick: save }, tr('Try saving again', 'Coba simpan lagi')));
    }
    (state.paint ?? paintComplete)();
  }

  function resultsView() {
    const right = score();
    const again = right >= need || store.isDone(lesson.id);
    return h('div', { class: 'q card q-results' },
      h('p', { class: 'qn' }, tr('Results', 'Hasil')),
      h('h2', { class: 'q-score', tabindex: '-1' }, tr(`${fmt(right)} of ${fmt(n)} correct`, `${fmt(right)} dari ${fmt(n)} benar`)),
      h('p', { class: 'quiz-result' }, resultMessage()),
      h('ol', { class: 'q-review' }, questions.map((q, i) => h('li', { class: isRight(i) ? 'right' : 'wrong' },
        h('span', { class: 'mark', 'aria-hidden': 'true' }, isRight(i) ? '✓' : '✕'),
        h('span', {}, h('span', { class: 'sr-only' }, isRight(i) ? tr('Correct: ', 'Benar: ') : tr('Not correct: ', 'Salah: ')), q.prompt,
          isRight(i) ? null : [h('span', { class: 'q-answer' }, `${tr('Your answer', 'Jawabanmu')}: ${q.options[picks[i]]}`), h('span', { class: 'q-answer' }, `${tr('Answer', 'Jawaban')}: ${q.options[q.answer]}`)]),
        h('button', { type: 'button', class: 'link-btn', 'aria-label': tr(`Review question ${fmt(i + 1)}`, `Tinjau soal ${fmt(i + 1)}`), onclick: () => { idx = i; render('step'); } }, tr('Review', 'Tinjau'))))),
      h('div', { class: 'q-actions' }, h('button', { type: 'button', class: 'btn primary', onclick: () => start(true) }, again ? tr('Retake the quiz', 'Ulangi kuis') : tr('Try again', 'Coba lagi'))));
  }

  // `focusOn`: 'action' keeps focus on the button that goes on (after Check, whose answer is then
  // announced); 'step' focuses the new question or the results heading and brings it into view.
  function render(focusOn = null) {
    const results = idx >= n;
    clearTimeout(sayTimer);
    live.textContent = '';
    view.replaceChildren(results ? resultsView() : h('div', {}, progress(), questionView()));
    Object.assign(state, { idx, picks, checked, orders, finished, paint: paintComplete });
    if (focusOn === 'action') view.querySelector('.q-actions .primary')?.focus({ preventScroll: true });
    else if (focusOn === 'step') {
      view.querySelector(results ? '.q-score' : 'legend')?.focus({ preventScroll: true });
      reveal();
    }
  }

  // A re-draw of the same attempt (language switch) picks up where it was; otherwise a new
  // attempt starts, unless the caller shows something else first and starts it later.
  const resumed = state.picks?.length === n && state.orders.every((o, i) => o.length === questions[i].options.length);
  if (resumed) { ({ idx, picks, checked, orders, finished } = state); render(); } else if (!lazy) start();
  return { root, start, get active() { return idx != null; } };
}

// Whether a file is missing (HTTP 404), as opposed to failing to load for another reason.
const isMissing = url => fetch(url, { method: 'HEAD' }).then(r => r.status === 404, () => false);
const KEY_PATTERN = /^[a-z0-9-]+$/;

// What a lab is called on its own page (#/lab/<key>): a title and a one-line description, in both languages.
// Inside a lesson the lab keeps its own heading; this is only for the standalone page. A key that is not
// listed falls back to the lesson that uses it, then to the key spelled out.
const LAB_META = {
  kmeans: { title: () => tr('K-means clustering lab', 'Lab clustering k-means'), blurb: () => tr('Place centroids and watch k-means assign points and move the centroids, step by step.', 'Taruh centroid, lalu lihat k-means menetapkan titik ke cluster dan menggeser centroid-nya, langkah demi langkah.') },
  dbscan: { title: () => tr('DBSCAN lab', 'Lab DBSCAN'), blurb: () => tr('Grow clusters out of dense neighborhoods and see which points are left over as noise.', 'Bentuk cluster dari area yang rapat dan lihat titik mana yang tersisa sebagai noise.') },
  knn: { title: () => tr('k-nearest neighbors lab', 'Lab k-nearest neighbors'), blurb: () => tr('Place a query point and watch its k nearest neighbors vote on its class.', 'Taruh satu titik query dan lihat k neighbor terdekatnya memberi suara untuk menentukan kelasnya.') },
  'distance-playground': { title: () => tr('Distance playground', 'Bermain dengan jarak'), blurb: () => tr('Drag two points and compare four ways of measuring the distance between them.', 'Seret dua titik dan bandingkan empat cara mengukur jarak di antara keduanya.') },
  'feature-explorer': { title: () => tr('Feature explorer', 'Eksplorasi fitur'), blurb: () => tr('Pick two columns of one dataset and see how they answer a regression, classification or clustering question.', 'Pilih dua kolom dari satu dataset dan lihat bagaimana keduanya menjawab pertanyaan regresi, klasifikasi, atau clustering.') },
  'outlier-lab': { title: () => tr('Outlier lab', 'Lab outlier'), blurb: () => tr('Add or drag an outlier and watch the mean, the standard deviation and the correlation react.', 'Tambahkan atau seret satu outlier dan lihat rata-rata, simpangan baku, dan korelasi bereaksi.') },
  'loss-fit': { title: () => tr('Fit a line, read its loss', 'Cari garis yang pas, lihat loss-nya'), blurb: () => tr('Move a line through the data and watch two different losses score how well it fits.', 'Geser sebuah garis di antara titik data dan lihat dua loss yang berbeda menilai seberapa pas garis itu.') },
  'logistic-threshold': { title: () => tr('Logistic regression and the threshold', 'Regresi logistik dan threshold'), blurb: () => tr('Move the decision threshold on a logistic model and watch false positives, false negatives, precision and recall change.', 'Geser threshold keputusan pada model logistik dan lihat false positive, false negative, precision, dan recall berubah.') },
  'imbalance-lab': { title: () => tr('Imbalance lab', 'Lab imbalance'), blurb: () => tr('Make the positive class rarer and watch accuracy mislead while recall falls.', 'Buat kelas positif makin langka dan lihat accuracy menyesatkan sementara recall turun.') },
  'tree-builder': { title: () => tr('Tree builder', 'Pembangun decision tree'), blurb: () => tr('Make the first split of a decision tree yourself, then let it grow and watch training and validation accuracy part ways.', 'Buat split pertama sebuah decision tree sendiri, lalu biarkan tumbuh dan lihat accuracy training dan validation berpisah.') },
  'overfit-lab': { title: () => tr('Overfitting lab', 'Lab overfitting'), blurb: () => tr('Raise the degree of a curve and compare its error on the training dots with its error on held-back points.', 'Naikkan derajat sebuah kurva dan bandingkan error-nya pada titik latih dengan error pada titik yang disisihkan.') },
  'scale-it': { title: () => tr('Feature scaling lab', 'Lab feature scaling'), blurb: () => tr('See how no scaling, min-max and standardization change which neighbors a model finds.', 'Lihat bagaimana tanpa scaling, min-max, dan standardisasi mengubah neighbor yang ditemukan model.') },
  'confusion-threshold': { title: () => tr('Scores and a threshold', 'Skor dan threshold'), blurb: () => tr('Drag a threshold across scored cases and watch the confusion matrix and its metrics change.', 'Geser threshold di antara kasus yang sudah diberi skor dan lihat confusion matrix beserta metriknya berubah.') },
  'gd-contours': { title: () => tr('Gradient descent on contour lines', 'Gradient descent pada garis kontur'), blurb: () => tr('Pick a starting point and follow gradient descent downhill across a loss surface.', 'Pilih titik awal dan ikuti gradient descent menuruni permukaan loss.') },
  'learning-rate-lab': { title: () => tr('Learning rate lab', 'Lab learning rate'), blurb: () => tr('Roll down a loss curve with different learning rates and see when steps crawl, converge or blow up.', 'Menggelinding turun di kurva loss dengan beberapa learning rate dan lihat kapan langkahnya merayap, konvergen, atau meledak.') },
  'leakage-lab': { title: () => tr('Leakage lab', 'Lab leakage'), blurb: () => tr('Fit the preprocessing before or after splitting and see how much the test score is flattered.', 'Fit preprocessing sebelum atau sesudah data dibagi, lalu lihat seberapa besar skor uji terdongkrak.') },
  'kmeans-reveal': { title: () => tr('k-means, then reveal the labels', 'k-means, lalu ungkap labelnya'), blurb: () => tr('Cluster points with their labels hidden, then reveal the true classes and compare them.', 'Kelompokkan titik dengan label tersembunyi, lalu ungkap kelas sebenarnya dan bandingkan.') },
  'cluster-compare': { title: () => tr('Compare clustering methods', 'Bandingkan metode clustering'), blurb: () => tr('Run k-means, DBSCAN and hierarchical clustering on the same points and see where each struggles.', 'Jalankan k-means, DBSCAN, dan hierarchical clustering pada titik yang sama, lalu lihat di mana masing-masing kesulitan.') },
  capstone: { title: () => tr('Capstone workbench', 'Meja kerja capstone'), blurb: () => tr('Frame a task, set a baseline, compare two models, inspect errors and rate your own work.', 'Rumuskan tugas, tentukan baseline, bandingkan dua model, periksa kesalahan, dan nilai hasil kerjamu sendiri.') },
  'bootstrap-lab': { title: () => tr('Bootstrap lab', 'Lab bootstrap'), blurb: () => tr('Draw samples from one population and see how much a reported metric varies, then build a bootstrap interval from a single sample.', 'Ambil sampel dari satu populasi dan lihat seberapa besar sebuah metrik berubah-ubah, lalu bangun interval bootstrap dari satu sampel saja.') },
  'minibatch-lab': { title: () => tr('Mini-batch lab', 'Lab mini-batch'), blurb: () => tr('Compare full batch, mini-batch and SGD walking down the same loss surface with the same learning rate, and see which is noisiest and which gets down in the fewest epochs.', 'Bandingkan full batch, mini-batch, dan SGD yang menuruni permukaan loss yang sama dengan learning rate yang sama, lalu lihat mana yang paling noisy dan mana yang turun dalam epoch paling sedikit.') },
  'regularization-lab': { title: () => tr('Regularization lab', 'Lab regularisasi'), blurb: () => tr('Fit a flexible polynomial with an L1 or L2 penalty and watch the curve, the coefficients and the validation error as lambda grows.', 'Fit polinomial fleksibel dengan penalti L1 atau L2 dan amati kurva, koefisien, dan validation error saat lambda membesar.') },
  'validation-lab': { title: () => tr('Validation lab', 'Lab validasi'), blurb: () => tr('Score the same model with random and grouped folds, see how much random folds flatter it, and compare grid search with random search.', 'Nilai model yang sama dengan fold acak dan fold grouped, lihat seberapa besar fold acak memujinya, lalu bandingkan grid search dengan random search.') },
  'ablation-lab': { title: () => tr('Feature ablation lab', 'Lab ablation fitur'), blurb: () => tr('Add features one at a time and check which gains survive cross-validation, and see how naive target encoding leaks.', 'Tambahkan fitur satu per satu dan periksa mana yang peningkatannya bertahan di cross-validation, serta lihat bagaimana target encoding yang naif mengalami leakage.') },
  'text-lab': { title: () => tr('Text classifier lab', 'Lab klasifikasi teks'), blurb: () => tr('Train Naive Bayes on short messages, see which words drive each class, and read the mistakes.', 'Latih Naive Bayes pada pesan pendek, lihat kata mana yang mendorong tiap kelas, lalu baca kesalahannya.') },
  'svm-lab': { title: () => tr('Support vector machine lab', 'Lab support vector machine'), blurb: () => tr('Drag a point and watch the margin and the support vectors change; compare linear and RBF boundaries.', 'Seret sebuah titik dan lihat margin serta support vector berubah; bandingkan boundary linear dan RBF.') },
  'ensemble-lab': { title: () => tr('Ensemble lab', 'Lab ensemble'), blurb: () => tr('Add trees in stages and compare how bagging and boosting change validation performance.', 'Tambahkan pohon secara bertahap dan bandingkan bagaimana bagging dan boosting mengubah performa validasi.') },
  'pca-lab': { title: () => tr('Rotate an axis, lose information', 'Putar sumbu, kehilangan informasi'), blurb: () => tr('Rotate an axis through a point cloud, project the points onto it, and measure the information lost.', 'Putar sebuah sumbu melalui awan titik, proyeksikan titik ke sumbu itu, lalu ukur informasi yang hilang.') },
  'calibration-lab': { title: () => tr('Calibration lab', 'Lab kalibrasi'), blurb: () => tr('Compare predictors with the same ranking but different calibration, and see how it changes cost-based decisions.', 'Bandingkan prediktor dengan ranking yang sama tetapi kalibrasi berbeda, lalu lihat bagaimana itu mengubah keputusan berbasis biaya.') },
  'audit-lab': { title: () => tr('Audit lab', 'Lab audit'), blurb: () => tr('Audit errors by subgroup, see how correlated features split importance, and explain one prediction.', 'Audit kesalahan per subgroup, lihat bagaimana fitur yang berkorelasi membagi importance, lalu jelaskan satu prediksi.') },
  'capstone-l2': { title: () => tr('Intermediate capstone workbench', 'Meja kerja capstone menengah'), blurb: () => tr('Build a cost-sensitive classifier, defend the split, compare models and report held-out uncertainty.', 'Bangun classifier yang peka biaya, pertahankan pilihan split, bandingkan model, dan laporkan ketidakpastian pada data uji.') },
  'shift-lab': { title: () => tr('Shift lab', 'Lab shift'), blurb: () => tr('Introduce covariate, label or concept shift and compare random, grouped and temporal validation against the real performance drop.', 'Munculkan covariate, label, atau concept shift lalu bandingkan validasi acak, grouped, dan temporal dengan penurunan performa yang sebenarnya.') },
  'interval-lab': { title: () => tr('Interval lab', 'Lab interval'), blurb: () => tr('Build prediction intervals three ways and measure their coverage as the test data shifts.', 'Bangun interval prediksi dengan tiga cara dan ukur coverage-nya saat data uji bergeser.') },
  'network-lab': { title: () => tr('Network lab', 'Lab network'), blurb: () => tr('Train a small neural network and watch the decision regions, the loss, the gradients and the activations.', 'Latih neural network kecil dan amati decision region, loss, gradient, dan activation.') },
  'representation-lab': { title: () => tr('Representation learning lab', 'Lab representation learning'), blurb: () => tr('Pretrain an autoencoder on unlabelled glyphs, then compare frozen features, raw pixels and a network from scratch with only a few labels.', 'Pretrain autoencoder pada glyph tanpa label, lalu bandingkan fitur beku, piksel mentah, dan network dari nol dengan sedikit label.') },
  'vision-lab': { title: () => tr("Vision lab", "Lab vision"), blurb: () => tr("Train a small image classifier with and without augmentation, then test it on darker, brighter, rotated and shifted images.", "Latih classifier gambar kecil dengan dan tanpa augmentation, lalu uji pada gambar yang lebih gelap, lebih terang, diputar, dan digeser.") },
  'attention-lab': { title: () => tr("Attention lab", "Lab attention"), blurb: () => tr("Trace which tokens one attention layer looks at, then compare bag of words with pretrained vectors on customer messages.", "Telusuri token mana yang dilihat satu lapisan attention, lalu bandingkan bag of words dengan vektor pretrained pada pesan pelanggan.") },
  'forecast-lab': { title: () => tr("Forecast lab", "Lab forecast"), blurb: () => tr("Backtest a seasonal baseline and a learned lag model across rolling windows, and check forecast intervals as the series changes.", "Backtest baseline musiman dan model lag yang dipelajari di berbagai window bergulir, lalu periksa interval forecast saat series berubah.") },
  'recommender-lab': { title: () => tr("Recommender lab", "Lab recommender"), blurb: () => tr("Remove the history of some users and compare how popularity, neighbors, matrix factorization and a hybrid handle cold start.", "Hapus riwayat sebagian pengguna dan bandingkan bagaimana popularity, neighbor, matrix factorization, dan hybrid menangani cold start.") },
  'causal-lab': { title: () => tr('Causal inference and experiments', 'Inferensi kausal dan eksperimen'), blurb: () => tr('Compare confounded estimates with a randomized experiment, then design a trial and see what peeking does.', 'Bandingkan estimasi yang terkonfound dengan eksperimen acak, lalu rancang uji coba dan lihat efek mengintip hasil.') },
  'monitoring-lab': { title: () => tr('Monitoring a deployed model', 'Memantau model yang di-deploy'), blurb: () => tr('Replay an inference stream, read the alerts and choose rollback, recalibrate or retrain.', 'Putar ulang aliran inferensi, baca alert, lalu pilih rollback, rekalibrasi, atau retrain.') },
  'reliability-lab': { title: () => tr('Reliability and responsible ML', 'ML yang andal dan bertanggung jawab'), blurb: () => tr('Stress-test subgroups, read fairness gaps, set a review band, check privacy and write a model card.', 'Uji stres subkelompok, baca kesenjangan fairness, atur review band, periksa privasi, dan tulis model card.') },
  'capstone-l3': { title: () => tr('Level 3 capstone workbench', 'Workbench capstone Level 3'), blurb: () => tr('Frame, split, train, make reproducible, monitor and investigate a hidden failure, then report.', 'Rumuskan, bagi data, latih, buat reproducible, pantau, dan selidiki kegagalan tersembunyi, lalu laporkan.') },
  'kit-demo': { title: () => tr('Lab kit demo', 'Demo lab kit'), blurb: () => tr('The course dataset, a data switch and a prediction box: the parts every lab is built from.', 'Dataset kursus, pengalih data, dan kotak prediksi: komponen yang dipakai semua lab.') },
};

// A lab on its own page, for development and end-to-end checks (not linked from the catalog).
async function labView(ctx, key) {
  if (!KEY_PATTERN.test(key)) return notFound(ctx, tr('That lab does not exist.', 'Lab itu tidak ditemukan.'));
  try {
    await importLab(key);
  } catch (err) {
    // A key with no lab behind it is a missing page; any other failure is shown, with a retry, by mountLab.
    if (await isMissing(labFile(key))) { importFailures.delete(labFile(key)); return notFound(ctx, tr('That lab does not exist.', 'Lab itu tidak ditemukan.')); }
    console.error(err);
  }
  const meta = Object.hasOwn(LAB_META, key) ? LAB_META[key] : null;
  let name = meta ? meta.title() : key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' ');
  if (!meta) {
    try {
      const lesson = (await loadCatalog()).courses.flatMap(c => c.lessons).find(l => l.simulator === key);
      if (lesson) name = lesson.title;
    } catch { /* the page still works without the catalog */ }
  }
  // A listed lab is named for what it is ("Outlier lab"); a bare key or a lesson title gets "Lab:" in front.
  const crumb = meta ? name : `${tr('Lab', 'Lab')}: ${name}`;
  ctx.title(crumb);
  const host = h('div', { class: 'sim-host' });
  mountLab(ctx, host, key);
  return h('div', {}, crumbs(h('a', { href: '#/' }, tr('Courses', 'Kursus')), crumb), h('h1', {}, name), meta && h('p', { class: 'muted' }, meta.blurb()), host);
}

// Every figure of a shared bundle (figures/<bundle>.js) or a lesson file
// (figures/lessons/<lesson>.js) stacked on one page, for authors to check them. Not linked.
async function figuresView(ctx, name) {
  if (!KEY_PATTERN.test(name)) return notFound(ctx, tr('Those figures do not exist.', 'Gambar itu tidak ditemukan.'));
  const url = FIGURE_BUNDLES.includes(name) ? `figures/${name}.js` : `figures/lessons/${name}.js`;
  const out = h('div', { class: 'prose' });
  try {
    const mod = await import(`./${importUrl(url)}`);
    const entries = Object.entries(mod.figures);
    if (!entries.length) out.append(h('p', { class: 'muted' }, tr('This file registers no figures.', 'File ini tidak mendaftarkan gambar.')));
    for (const [figName, make] of entries) {
      const fig = h('figure', { class: 'figure' }, h('div', { class: 'figure-art' }), h('figcaption', {}, figName));
      fig.firstChild.innerHTML = make();
      fig.firstChild.querySelector('svg')?.setAttribute('role', 'img');
      out.append(fig);
    }
  } catch (err) {
    if (await isMissing(url)) return notFound(ctx, tr('Those figures do not exist.', 'Gambar itu tidak ditemukan.'));
    noteImportFailure(url);
    console.error(err);
    out.append(errorBlock(tr('The figures could not be loaded.', 'Gambar gagal dimuat.'), () => route({ keepScroll: true })));
  }
  ctx.title(`${tr('Figures', 'Gambar')}: ${name}`);
  return h('div', {}, crumbs(h('a', { href: '#/' }, tr('Courses', 'Kursus')), `${tr('Figures', 'Gambar')}: ${name}`), h('h1', {}, name), out);
}

function notFound(ctx, msg, action) {
  ctx.title(tr('Not found', 'Tidak ditemukan'));
  return h('div', { class: 'empty' },
    h('h1', {}, tr('Nothing here', 'Tidak ada apa-apa di sini')),
    h('p', { class: 'muted' }, msg),
    h('div', { class: 'hero-actions' },
      action && h('a', { class: 'btn primary', href: action.href }, action.label),
      h('a', { class: action ? 'btn' : 'btn primary', href: '#/' }, tr('Back to courses', 'Kembali ke kursus'))));
}

function failedView(ctx, err, retry) {
  ctx.title(tr('Something went wrong', 'Terjadi kesalahan'));
  return h('div', { class: 'empty' },
    h('h1', {}, tr('Something went wrong', 'Terjadi kesalahan')),
    errorBlock(failureText(err)),
    h('div', { class: 'hero-actions' },
      h('button', { type: 'button', class: 'btn primary', onclick: retry }, tr('Try again', 'Coba lagi')),
      h('a', { class: 'btn', href: '#/' }, tr('Back to courses', 'Kembali ke kursus'))));
}

// ---------- router ----------
// The address is `#/<kind>/<slug>/...`, with an optional `?query` and `#fragment` that are
// tolerated; segments are case-insensitive, and a segment that is not valid percent-encoding
// is a page that does not exist.

// A link to an element on the page (`#app`, `#sec-3`) is not a route.
function isPageAnchor(hash = location.hash) {
  if (!hash || hash.startsWith('#/')) return false;
  try { return Boolean(document.getElementById(decodeURIComponent(hash.slice(1)))); } catch { return false; }
}

function parseHash(raw = location.hash) {
  if (isPageAnchor(raw)) return { parts: [], bad: false, query: new URLSearchParams(), key: '' };
  let rest = raw.replace(/^#/, '');
  const frag = rest.indexOf('#');
  if (frag >= 0) rest = rest.slice(0, frag);
  const q = rest.indexOf('?');
  const query = new URLSearchParams(q >= 0 ? rest.slice(q + 1) : '');
  if (q >= 0) rest = rest.slice(0, q);
  let bad = false;
  const parts = rest.split('/').filter(Boolean).map(seg => {
    try { return decodeURIComponent(seg).toLowerCase(); } catch { bad = true; return ''; }
  });
  return { parts, bad, query, key: parts.join('/') };
}

// Each navigation gets one context. Everything a view starts (listeners, a running lab) is
// registered on it and undone together when the visitor leaves, or when the navigation turns out
// to be out of date because a newer one began.
function makeContext(state, isCurrent) {
  const abort = new AbortController();
  const leaving = [];
  const queued = [];
  const ctx = {
    state, signal: abort.signal, disposed: false, committed: false, interactive: false, onQuery: null,
    title(text) { if (!ctx.disposed && isCurrent()) document.title = titleText(text); },
    onLeave(fn) { if (ctx.disposed) fn(); else leaving.push(fn); },
    afterCommit(fn) { if (ctx.disposed) return; if (ctx.committed) fn(); else queued.push(fn); },
    commit() { ctx.committed = true; queued.splice(0).forEach(fn => { try { fn(); } catch (err) { console.error(err); } }); },
    dispose() {
      if (ctx.disposed) return;
      ctx.disposed = true;
      abort.abort();
      queued.length = 0;
      leaving.splice(0).reverse().forEach(fn => { try { fn(); } catch (err) { console.error(err); } });
    },
  };
  return ctx;
}

let nav = 0;          // the newest navigation; an older one that finishes late is dropped
let live = null;      // the context of the newest navigation
let current = null;   // what is on the page: { key, ctx }
let inflightKey = null;

async function build(ctx, p) {
  const [a, b, c, d] = p.parts;
  if (p.bad) return notFound(ctx, tr('That page does not exist.', 'Halaman itu tidak ditemukan.'));
  if (a === 'course' && b && c) return lessonView(ctx, b, c, d, p.query);
  if (a === 'course' && b) return courseView(ctx, b);
  if (a === 'path' && b) return pathView(ctx, b);
  if (a === 'lab' && b) return labView(ctx, b);
  if (a === 'figures' && b) return figuresView(ctx, b);
  if (!p.parts.length) return homeView(ctx);
  return notFound(ctx, tr('That page does not exist.', 'Halaman itu tidak ditemukan.'));
}

// Options: moveFocus (a visitor's navigation: focus the new page's heading so a screen reader
// reads it), keepScroll and keepState (re-draw the same page in place: a language switch, or
// progress arriving late), controls (lab settings to put back after a language switch).
async function route({ moveFocus = false, keepScroll = false, keepState = false, controls = null } = {}) {
  const mine = ++nav;
  const parsed = parseHash();
  const state = keepState && current && current.key === parsed.key ? current.ctx.state : {};
  if (controls) state.controls = controls;
  const y = window.scrollY;
  live?.dispose();
  const ctx = live = makeContext(state, () => mine === nav);
  inflightKey = parsed.key;
  app.setAttribute('aria-busy', 'true');
  if (current) app.classList.add('refreshing'); // a page is on screen: dim it and show the bar while the next one loads
  const slow = setTimeout(() => announce(tr('Loading…', 'Memuat…')), 700);
  let view;
  try {
    view = await build(ctx, parsed);
  } catch (err) {
    console.error(err);
    if (mine === nav) view = failedView(ctx, err, () => route({ moveFocus: true }));
  }
  clearTimeout(slow);
  if (mine !== nav) return; // a newer navigation owns the page now; this one was already torn down
  app.replaceChildren(view);
  document.documentElement.classList.add('app-ready'); // the footer shows once there is a page above it
  app.removeAttribute('aria-busy');
  app.classList.remove('refreshing');
  current = { key: parsed.key, ctx };
  updateNav(parsed.parts);
  if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
  ctx.commit();
  if (moveFocus) {
    const target = app.querySelector('h1') ?? app;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
}

// Escape goes back one level, but only when nothing else owns the key: a lab, a form control, an open dialog or
// fullscreen, or a quiz attempt in progress (leaving would lose the answers).
addEventListener('keydown', e => {
  if (e.key !== 'Escape' || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const t = e.target instanceof Element ? e.target : document.body;
  if (t.closest('input, select, textarea, canvas, [contenteditable], [role=application], [role=dialog], [role=menu], dialog, .sim')) return;
  if (document.querySelector('.expanded, .sheet-open, .qq-open, [role=dialog]:not([hidden]), [role=menu]') || document.fullscreenElement) return;
  const bar = document.querySelector('.q-progress');
  if (bar && Number(bar.getAttribute('aria-valuenow')) > 0 && !document.querySelector('.quiz-result')) return;
  const back = document.querySelector('a.back-btn');
  if (!back) return;
  e.preventDefault();
  location.hash = back.getAttribute('href');
});

addEventListener('hashchange', () => {
  // A link to something on this page (the skip link) leaves the page as it is.
  if (current && isPageAnchor()) return;
  // Only the ?query changed (Back or Forward between the sections of a lesson): the view handles it in place.
  const next = parseHash();
  if (current && next.key === current.key && inflightKey === current.key && current.ctx.onQuery) { current.ctx.onQuery(next.query); return; }
  route({ moveFocus: true });
});
addEventListener('localechange', () => {
  if (catalog) applyLocale(catalog);
  chrome();
  repaintNotices();
  // The page is re-drawn in the new language; scroll, the section, and what the view keeps in
  // ctx.state stay, and the lab's settings are put back.
  route({ keepScroll: true, keepState: true, controls: snapshotControls() });
});

// The skip link moves focus to the content without touching the address (the router reads
// the address as a route).
document.querySelector('.skip')?.addEventListener('click', e => {
  e.preventDefault();
  app.focus({ preventScroll: true });
  app.scrollIntoView({ behavior: 'auto', block: 'start' });
});

chrome();
window.learnlabReady = true; // theme.js stops watching for a failed start
// The catalog does not depend on the learner, so it loads while the learner's progress does.
loadCatalog().catch(() => { /* route() asks again and shows the failure */ });
store.ensureLoaded()
  .catch(err => { console.error('progress unavailable', err); watchProgress(); })
  .finally(() => {
    if (!store.status().persistent) {
      notify('storage', {
        tone: 'warn', dismissible: true,
        text: () => tr('This browser is blocking storage. Your progress, language and theme will be forgotten when you reload this page.', 'Browser ini memblokir penyimpanan. Progres, bahasa, dan temamu akan terlupa saat halaman ini dimuat ulang.'),
      });
      footer();
    }
    route();
  });
