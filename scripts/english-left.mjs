// Lists English words still showing on pages in Indonesian. Usage: node scripts/english-left.mjs [base-url]
import { createRequire } from 'node:module';
import { join } from 'node:path';
const require = createRequire(join('/home/inxpirativ/tools/playwright', 'package.json'));
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:3100';
const stop = /\b(the|and|of|is|are|with|your|you|to|this|that|click|drag|reset|run|step|points?|learning|loss|rate|number|show|values?|choose|compare)\b/gi;
// Terms the glossary (docs/glossary-id.md) keeps in English on purpose; they are not leftovers.
const kept = /missing values?|noise points?|log[- ]loss|false[- ]positive rate|true[- ]positive rate|learning rate|loss function|supervised learning|unsupervised learning|machine learning|deep learning|reinforcement learning/gi;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ locale: 'id-ID', viewport: { width: 1280, height: 900 } })).newPage();
await page.goto(base + '/#/');
await page.waitForSelector('.card');
const hrefs = await page.$$eval('a[href^="#/course/"], a[href^="#/path/"]', as => [...new Set(as.map(a => a.getAttribute('href')))]);
const routes = new Set(['#/', ...hrefs]);
for (const h of [...routes]) if (/^#\/course\/[^/]+$/.test(h)) {
  await page.goto(base + '/' + h); await page.waitForSelector('.lesson-main', { timeout: 5000 }).catch(() => {});
  for (const a of await page.$$eval('a[href^="#/course/"]', as => as.map(a => a.getAttribute('href')))) routes.add(a);
}
const labs = [...routes].filter(r => /\/simulate$/.test(r)).map(r => r);
for (const r of [...routes]) if (/^#\/course\/[^/]+\/[^/]+$/.test(r)) { routes.add(r + '/quiz'); }
const hits = {};
for (const r of routes) {
  await page.goto(base + '/' + r); await page.waitForTimeout(700);
  // open every Go deeper fold so its text is visible too
  await page.$$eval('details', ds => ds.forEach(d => d.open = true));
  const text = await page.evaluate(() => {
    const out = [];
    const w = document.createTreeWalker(document.querySelector('#app'), NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) if (n.parentElement && !/^(SCRIPT|STYLE|CODE|PRE)$/.test(n.parentElement.tagName) && n.nodeValue.trim()) out.push(n.nodeValue.trim());
    document.querySelectorAll('[aria-label],[title],[placeholder]').forEach(e => out.push(e.getAttribute('aria-label') || e.title || e.placeholder));
    document.querySelectorAll('svg text').forEach(t => out.push(t.textContent));
    return out;
  });
  const bad = text.filter(t => (t.replace(kept, ' ').match(stop) || []).length >= 1 && t.length < 400);
  if (bad.length) hits[r] = [...new Set(bad)].slice(0, 8);
}
await browser.close();
for (const [r, b] of Object.entries(hits)) { console.log(r); b.forEach(t => console.log('   ', t.slice(0, 110))); }
console.log(`${routes.size} pages scanned, ${Object.keys(hits).length} with possible English`);
