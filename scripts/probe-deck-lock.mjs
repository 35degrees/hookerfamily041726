// PROBE (v4.2.1): nav clicks are DISABLED while a card is in flight, and RE-ENABLED once the incoming card
// lands with its chips extended. Inject a persistent /person/ link inside the warm-nav container, then:
//   1. click a CC → nav starts (lock engages)
//   2. mid-flight, click the injected link → must be SWALLOWED (URL unchanged)
//   3. after landing, click the injected link → must NAVIGATE (lock released)
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const TESTHREF = '/person/mary-pierpont-1673';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1680, height: 1000 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/person/thomas-hooker-1586`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// inject a persistent test link inside the page-container (delegated by warmPersonLinks; survives SPA swap)
await page.evaluate((href) => {
	const a = document.createElement('a');
	a.id = 'testlink';
	a.href = href;
	a.textContent = 'test';
	a.style.cssText = 'position:fixed;top:2px;left:2px;z-index:99999';
	document.querySelector('.page-container')?.appendChild(a);
}, TESTHREF);

// find a CC to click
const geo = await page.evaluate(() => {
	const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/john-haynes-1594'));
	a?.scrollIntoView({ block: 'center' });
	const r = a.getBoundingClientRect();
	return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});

// 1. start the CC nav (the warm nav is async — pushState fires after the fetch; give it a beat to register)
await page.mouse.click(geo.x, geo.y);
await page.waitForTimeout(240);
const afterCC = page.url();
const navigatedToCC = afterCC.endsWith('/person/john-haynes-1594');

// 2. still mid-flight (total flight ~1.7s), click the injected link — should be swallowed
await page.waitForTimeout(150);
await page.evaluate(() => document.querySelector('#testlink')?.click());
await page.waitForTimeout(150);
const midFlightUrl = page.url();
const swallowed = midFlightUrl.endsWith('/person/john-haynes-1594'); // did NOT go to mary-pierpont

// 3. after landing, click the injected link — should navigate
await page.waitForTimeout(1600); // well past landing + unlock
await page.evaluate(() => document.querySelector('#testlink')?.click());
await page.waitForTimeout(400);
const finalUrl = page.url();
const released = finalUrl.endsWith(TESTHREF);

console.log(`1. first CC click navigated:        ${navigatedToCC ? '✓' : '✗'} (${afterCC.split('/').pop()})`);
console.log(`2. mid-flight click SWALLOWED:      ${swallowed ? '✓' : '✗'} (${midFlightUrl.split('/').pop()})`);
console.log(`3. post-landing click RELEASED:     ${released ? '✓' : '✗'} (${finalUrl.split('/').pop()})`);
const pass = navigatedToCC && swallowed && released;
console.log(`\nDECK-LOCK PROBE: ${pass ? '3/3 GREEN' : 'RED'}`);
await b.close();
