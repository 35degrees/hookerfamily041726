/**
 * chrome-sample.mjs — Chrome's reference motion for a promotion (Oct 19, 2026; roadmap §62). Loads the start
 * page in headless Chromium at Sam's Safari viewport (1215×1387 @2x), runs promotion-sampler.js, writes the
 * per-frame JSON. Run from the repo root against a preview build:  npx vite preview --port 4173
 *   node scripts/safari/chrome-sample.mjs scripts/safari/promotion-sampler.js /tmp/chrome_
 * Edit START below to match the sampler's click.
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const js = readFileSync(process.argv[2], 'utf8');
const START = 'http://localhost:4173/john-hooker-1791-2'; // EDIT: the page the click starts from
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setViewportSize({ width: 1215, height: 1387 });
for (let i = 1; i <= 2; i++) {
  await page.goto(START, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.evaluate(js);
  await page.waitForFunction(() => window.__S && window.__S.ok, null, { timeout: 10000 });
  const s = await page.evaluate(() => window.__S);
  writeFileSync(process.argv[3] + i + '.json', JSON.stringify(s));
  console.log('chrome take', i, s.rows.length, 'frames');
}
await browser.close();
