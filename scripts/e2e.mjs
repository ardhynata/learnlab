#!/usr/bin/env node
// End-to-end smoke test for Learnlab, driven by Playwright in the system Chrome.
//
//   LEARNLAB_URL=http://localhost:3100 /home/inxpirativ/tools/node/bin/node scripts/e2e.mjs
//
// It needs the stack running and seeded (API, web, Postgres). It walks the catalog
// (home, paths, courses), every lesson and each of its tabs, every lab on its own
// page, the quiz flow, the Learn navigation, the theme toggle and a phone-width
// layout, and fails on any console error, page error, failed request or blank plot.
//
// Playwright is installed outside the repo (see memory feedback_playwright_ux_assessment);
// override its location with PLAYWRIGHT_DIR.
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pwDir = process.env.PLAYWRIGHT_DIR ?? '/home/inxpirativ/tools/playwright';
const { chromium } = createRequire(join(pwDir, 'x.js'))('playwright');
const BASE = (process.env.LEARNLAB_URL ?? 'http://localhost:3100').replace(/\/$/, '');
const LABS_DIR = join(here, '..', 'cmd', 'web', 'static', 'sims', 'labs');

const failures = [];
const log = (...a) => console.log(...a);
const fail = (where, what) => { failures.push(`${where}: ${what}`); log(`  FAIL ${where}: ${what}`); };
const check = (ok, where, what) => { if (!ok) fail(where, what); return ok; };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: process.env.LANG_UI === 'id' ? 'id-ID' : 'en-US' });
const page = await context.newPage();
// Optional clicks on missing or disabled controls must fail fast, not wait the 30s default.
page.setDefaultTimeout(2500);
let current = 'startup';
page.on('console', m => { if (m.type() === 'error') fail(current, `console error: ${m.text()}`); });
page.on('pageerror', e => fail(current, `page error: ${e.message}`));
page.on('response', r => { if (r.status() >= 400 && !r.url().includes('favicon')) fail(current, `HTTP ${r.status()} for ${r.url()}`); });
page.on('requestfailed', r => { if (!r.url().includes('favicon')) fail(current, `request failed: ${r.url()}`); });

const go = async (hash, waitFor) => {
  current = hash;
  await page.evaluate(h => { location.hash = h; }, hash);
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 8000 }).catch(() => fail(hash, `never showed ${waitFor}`));
  await page.waitForTimeout(150);
};

// A plot is "alive" when its canvas holds more than a couple of distinct colors.
const plotAlive = canvasSel => page.evaluate(sel => {
  const c = document.querySelector(sel);
  if (!c || !c.width) return false;
  const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const seen = new Set();
  for (let i = 0; i < data.length && seen.size < 6; i += 4 * 97) seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
  return seen.size > 2;
}, canvasSel);

// Labs that are forms, not plots: no canvas to check (the capstone workbench draws charts only in its later steps).
const NO_CANVAS = new Set(['capstone', 'capstone-l2', 'capstone-l3']);
async function smokeLab(where, key = '') {
  if (NO_CANVAS.has(key)) {
    await page.waitForSelector('h1', { timeout: 8000 }).catch(() => fail(where, 'no heading'));
    await page.waitForTimeout(300);
    check(await page.$('input[type=radio], button'), where, 'workbench shows no controls');
    return;
  }
  await page.waitForSelector('canvas', { timeout: 8000 }).catch(() => fail(where, 'no canvas'));
  await page.waitForTimeout(300);
  check(await plotAlive('canvas'), where, 'plot is blank');
  // Playback, if the lab has it: run, step, previous step.
  if (await page.$('[data-act="run"]')) {
    const placed = await page.$('[data-ref="k"]'); // k-means starts without centroids
    if (placed) {
      const box = await (await page.$('canvas')).boundingBox();
      await page.mouse.click(box.x + box.width / 2 - 40, box.y + box.height / 2 - 30);
      await page.mouse.click(box.x + box.width / 2 + 40, box.y + box.height / 2 + 30);
    }
    await page.click('[data-act="step"]').catch(() => {});
    await page.click('[data-act="step"]').catch(() => {});
    if (!(await page.$eval('[data-act="prev"]', b => b.disabled).catch(() => true))) {
      await page.click('[data-act="prev"]');
    }
    await page.click('[data-act="run"]').catch(() => {});
    await page.waitForTimeout(500);
    await page.click('[data-act="run"]').catch(() => {}); // pause if still running
  }
  // Change one control and make sure the lab survives it.
  let select = null;
  for (const el of await page.$$('.settings select')) if (await el.isVisible()) { select = el; break; }
  if (select) {
    const values = await select.$$eval('option', os => os.map(o => o.value));
    if (values.length > 1) await select.selectOption(values[1]);
  }
  let range = null;
  for (const el of await page.$$('.settings input[type=range]')) if (await el.isVisible()) { range = el; break; }
  if (range) await range.evaluate(el => { el.value = el.max; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(150);
  check(await plotAlive('canvas'), where, 'plot is blank after changing a control');
  await page.click('[data-act="reset"]').catch(() => {});
  await page.waitForTimeout(100);
}

async function smokeQuiz(where) {
  await page.waitForSelector('.q', { timeout: 8000 }).catch(() => fail(where, 'no quiz'));
  if (await page.$('.quiz-done .btn')) await page.click('.quiz-done .btn'); // already passed: retake
  await page.waitForSelector('.q fieldset', { timeout: 4000 }).catch(() => fail(where, 'no question shown'));
  check((await page.$$('.q fieldset')).length === 1, where, 'quiz should show one question at a time');
  await page.click('.q input[type=radio]');
  await page.click('.q-actions .primary');
  check(await page.$eval('.feedback', e => !e.hidden), where, 'no feedback after checking an answer');
  check(await page.$$eval('.q input', is => is.every(i => i.disabled)), where, 'answer should lock after checking');
}

async function smokeLearn(where) {
  await page.waitForSelector('.prose', { timeout: 8000 }).catch(() => fail(where, 'no lesson text'));
  const where_ = await page.$('.toc [aria-current=true]');
  if (!where_) return;
  const sections = await page.$$eval('.prose > h2', hs => hs.length);
  const visible = await page.$$eval('.prose > *', ns => ns.filter(n => !n.hidden).length);
  const total = await page.$$eval('.prose > *', ns => ns.length);
  check(sections < 2 || visible < total, where, 'Learn should show one section at a time');
  await page.click('.toc li:first-child button').catch(() => {}); // start from section 1, whatever was saved
  const before = await (await page.$('.toc [aria-current=true]')).textContent();
  await page.click('.section-nav .primary').catch(() => {});
  const after = await (await page.$('.toc [aria-current=true]'))?.textContent();
  if (sections > 1) check(after !== before, where, 'Next did not move to another section');
  await page.keyboard.press('ArrowLeft');
  if (sections > 1) check((await (await page.$('.toc [aria-current=true]')).textContent()) === before, where, 'ArrowLeft did not return to the previous section');
}

// ---- catalog ------------------------------------------------------------------
log(`Learnlab e2e against ${BASE}`);
current = 'home';
await page.goto(`${BASE}/#/`);
await page.waitForSelector('.course-card', { timeout: 10000 }).catch(() => fail('home', 'no path cards'));
const api = await page.evaluate(async () => {
  const get = async p => { const r = await fetch(`/api${p}?limit=1000`); const j = await r.json(); return Array.isArray(j) ? j : j.data; };
  return { paths: await get('/paths'), courses: await get('/courses'), modules: await get('/modules'), lessons: await get('/lessons') };
});
log(`catalog: ${api.paths.length} paths, ${api.courses.length} courses, ${api.modules.length} modules, ${api.lessons.length} lessons`);
check(api.paths.length > 0 && api.lessons.length > 0, 'catalog', 'is empty: run the seeder');
check((await page.$$('.course-card')).length === api.paths.length, 'home', 'path cards do not match the API');

for (const p of api.paths) {
  await go(`#/path/${p.slug}`, 'h1');
  const want = api.courses.filter(c => c.path_id === p.id).length;
  check((await page.$$('.course-card')).length === want, `path ${p.slug}`, `expected ${want} course cards`);
}
for (const c of api.courses) {
  await go(`#/course/${c.slug}`, '.module');
  const want = api.modules.filter(m => m.course_id === c.id).length;
  check((await page.$$('.module')).length === want, `course ${c.slug}`, `expected ${want} modules`);
  const rows = (await page.$$('.lesson-row')).length;
  check(rows === api.lessons.filter(l => l.course_id === c.id).length, `course ${c.slug}`, 'lesson rows do not match the API');
}

// ---- every lesson, every tab ---------------------------------------------------
let tabs = 0;
for (const c of api.courses) {
  for (const l of api.lessons.filter(x => x.course_id === c.id)) {
    const base = `#/course/${c.slug}/${l.slug}`;
    await go(base, '.prose');
    await smokeLearn(base);
    tabs++;
    if (l.kind === 'simulator') {
      const nc = NO_CANVAS.has(l.simulator);
      await go(`${base}/simulate`, nc ? 'h1' : 'canvas');
      await smokeLab(`${base}/simulate`, nc ? l.simulator : '');
      tabs++;
    } else {
      await go(`${base}/simulate`, 'h1'); // not found is expected for reading lessons
      check(await page.$eval('h1', h => /nothing here|tidak ada apa-apa/i.test(h.textContent)), `${base}/simulate`, 'a reading lesson should have no Simulate tab');
    }
    await go(`${base}/quiz`, '.q');
    await smokeQuiz(`${base}/quiz`);
    tabs++;
  }
}
log(`lessons: ${api.lessons.length}, views walked: ${tabs}`);

// ---- every lab on its own page -------------------------------------------------
const labs = readdirSync(LABS_DIR).filter(f => f.endsWith('.js') && !f.endsWith('.test.js')).map(f => f.replace(/\.js$/, ''));
for (const key of labs) {
  await go(`#/lab/${key}`, NO_CANVAS.has(key) ? 'h1' : 'canvas');
  await smokeLab(`lab ${key}`, key);
}
log(`labs on their own page: ${labs.length} (${labs.join(', ')})`);

// ---- theme, then a phone-width layout ------------------------------------------
const sample = api.lessons.find(l => l.kind === 'simulator' && !NO_CANVAS.has(l.simulator));
const sampleCourse = api.courses.find(c => c.id === sample.course_id);
await go(`#/course/${sampleCourse.slug}/${sample.slug}/simulate`, 'canvas');
await page.click('#theme-toggle');
await page.waitForTimeout(200);
check(await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.getAttribute('data-theme') === 'light'), 'theme', 'toggle did not set a theme');
check(await plotAlive('canvas'), 'theme', 'plot is blank after switching theme');
await page.click('#theme-toggle');

await page.setViewportSize({ width: 375, height: 800 });
for (const h of ['#/', `#/course/${sampleCourse.slug}`, `#/course/${sampleCourse.slug}/${sample.slug}`, `#/course/${sampleCourse.slug}/${sample.slug}/simulate`, `#/course/${sampleCourse.slug}/${sample.slug}/quiz`]) {
  await go(h, 'main > *');
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 1, `phone width ${h}`, `page is ${overflow}px wider than the screen`);
}

await browser.close();
log(failures.length ? `\n${failures.length} problem(s):\n- ${failures.join('\n- ')}` : '\nAll checks passed.');
process.exit(failures.length ? 1 : 0);
