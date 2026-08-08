/**
 * capture-page — a plain screenshot of a person page, for the things numbers cannot answer.
 *
 * The probes measure motion; this exists for STILL questions — a colour, a ground, a layout at rest.
 * Deliberately dumb: no sampling, no assertions, no instrumentation. If you find yourself adding a
 * measurement here, it belongs in probe-tier.mjs instead.
 *
 * Run: node scripts/capture-page.mjs <slug> [outName] [--full]   (dev server on :5173)
 */
import { chromium } from '@playwright/test';

const slug = process.argv[2] || 'jackson-pynchon';
const out = process.argv[3] || slug;
const full = process.argv.includes('--full');

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1200 } })).newPage();
await page.goto(`http://localhost:5173/person/${slug}`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);
await page.screenshot({ path: `scripts/probe-out/${out}.png`, fullPage: full });
console.log(`scripts/probe-out/${out}.png`);
await browser.close();
