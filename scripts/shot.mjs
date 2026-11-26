#!/usr/bin/env node
// Screenshot a Learnlab page and report problems. For authors checking a lab or figure.
//
//   /home/inxpirativ/tools/node/bin/node scripts/shot.mjs '#/lab/distance-playground' /tmp/out.png [--dark] [--phone] [--click '<css>'] [--wait <ms>] [--eval '<js>']
//
// Prints console errors, failed requests and the result of --eval, then writes the PNG.
// URL base: LEARNLAB_URL (default http://localhost:3100). Playwright location: PLAYWRIGHT_DIR.
import { createRequire } from 'node:module';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const value = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const positional = args.filter((a, i) => !a.startsWith('--') && !['--click', '--wait', '--eval', '--lang'].includes(args[i - 1]));
const [hash, out = '/tmp/learnlab-shot.png'] = positional;
if (!hash) { console.error('usage: shot.mjs <#/route> [out.png] [--dark] [--phone] [--click css] [--wait ms] [--eval js] [--lang id]'); process.exit(2); }

const { chromium } = createRequire(join(process.env.PLAYWRIGHT_DIR ?? '/home/inxpirativ/tools/playwright', 'x.js'))('playwright');
const base = (process.env.LEARNLAB_URL ?? 'http://localhost:3100').replace(/\/$/, '');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: flag('--phone') ? { width: 375, height: 800 } : { width: 1280, height: 900 }, colorScheme: flag('--dark') ? 'dark' : 'light', locale: value('--lang') === 'id' ? 'id-ID' : 'en-US' });
const page = await context.newPage();
page.setDefaultTimeout(4000);
const problems = [];
page.on('console', m => { if (m.type() === 'error') problems.push(`console error: ${m.text()}`); });
page.on('pageerror', e => problems.push(`page error: ${e.message}`));
page.on('response', r => { if (r.status() >= 400 && !r.url().includes('favicon')) problems.push(`HTTP ${r.status()} ${r.url()}`); });
await page.goto(`${base}/${hash.startsWith('#') ? hash : `#${hash}`}`);
await page.waitForSelector('canvas, .prose, .figure, .module, .sim', { timeout: 8000 }).catch(() => problems.push('nothing rendered'));
await page.waitForTimeout(500);
if (value('--click')) { await page.click(value('--click')).catch(e => problems.push(`click failed: ${e.message.split('\n')[0]}`)); await page.waitForTimeout(400); }
if (value('--wait')) await page.waitForTimeout(Number(value('--wait')));
if (value('--eval')) console.log('eval:', JSON.stringify(await page.evaluate(value('--eval')).catch(e => `error: ${e.message}`)));
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
if (overflow > 1) problems.push(`page is ${overflow}px wider than the screen`);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(problems.length ? `PROBLEMS:\n- ${problems.join('\n- ')}` : 'no console errors, no failed requests');
console.log(`screenshot: ${out}`);
process.exit(problems.length ? 1 : 0);
