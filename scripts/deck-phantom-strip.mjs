// One-off: capture the phantom train — car-1 leaving (tilted), the EMPTY BEAT (stage bare = the distance),
// and the hero arriving (tilted). Vertical near + lateral far.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const OUT = '/private/tmp/claude-501/-Users-sth22-Genealogy-project-041726/8a6099cb-7e43-4460-aa0f-04d34d24f5ac/scratchpad';
const CASES = [
	{ tag: 'PV', start: 'mary-pierpont-1673', target: 'mary-talcott-1720', shots: [300, 780, 1250] },
	{ tag: 'PL', start: 'thomas-hooker-1586', target: 'john-haynes-1594', shots: [500, 1200, 1750] }
];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1680, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
for (const c of CASES) {
	await page.goto(`${BASE}/person/${c.start}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(350);
	await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		a?.scrollIntoView({ block: 'center' });
	}, c.target);
	await page.waitForTimeout(150);
	const geo = await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		const r = a.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}, c.target);
	const start = Date.now();
	await page.mouse.click(geo.x, geo.y);
	for (let i = 0; i < c.shots.length; i++) {
		const wait = c.shots[i] - (Date.now() - start);
		if (wait > 0) await page.waitForTimeout(wait);
		await page.screenshot({ path: `${OUT}/phantom-${c.tag}${i + 1}.png`, animations: 'allow' });
	}
	await page.waitForTimeout(800);
	console.log(`[${c.tag}] nav=${await page.evaluate(() => location.pathname)}`);
}
await b.close();
