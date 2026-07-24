// One-off: 3-frame strip of the PURE PUSH (ghosts OFF) — car 1 leaving as the hero enters, no convoy.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const OUT = '/private/tmp/claude-501/-Users-sth22-Genealogy-project-041726/8a6099cb-7e43-4460-aa0f-04d34d24f5ac/scratchpad';
const CASES = [
	{ tag: 'V', start: 'mary-pierpont-1673', target: 'mary-talcott-1720', shots: [180, 420, 720] }, // vertical (bottom)
	{ tag: 'L', start: 'aaron-burr-jr-1756', target: 'tapping-reeve-1744', shots: [180, 420, 720] } // lateral (cousin)
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
		await page.screenshot({ path: `${OUT}/push-${c.tag}${i + 1}.png`, animations: 'allow' });
	}
	await page.waitForTimeout(600);
	console.log(`[${c.tag}] ${c.start} → ${c.target} nav=${await page.evaluate(() => location.pathname)}`);
}
await b.close();
