// One-off: for each CC target, click it and read DECK PEAK (= N ghosts) + relationClass, then reload.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const START = 'thomas-hooker-1586';
const TARGETS = ['stephen-hart-1605', 'john-talcott-1594', 'samuel-talcott-1635', 'john-haynes-1594', 'william-whiting-1605', 'richard-platt-1603'];

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1680, height: 1000 } });
const page = await ctx.newPage();

for (const t of TARGETS) {
	await page.goto(`${BASE}/person/${START}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(250);
	const geo = await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		if (!a) return null;
		const r = a.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2, rc: a.dataset.relationClass };
	}, t);
	if (!geo) { console.log(`${t.padEnd(24)} NO LINK`); continue; }
	await page.evaluate(() => {
		window.__deckPeak = 0;
		const t0 = performance.now();
		const tick = () => {
			const k = document.querySelector('.deck-layer')?.childElementCount ?? 0;
			if (k > window.__deckPeak) window.__deckPeak = k;
			if (performance.now() - t0 < 900) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});
	await page.mouse.click(geo.x, geo.y);
	await page.waitForTimeout(950);
	const peak = await page.evaluate(() => window.__deckPeak);
	console.log(`${t.padEnd(24)} rc=${(geo.rc || '?').padEnd(10)} N(peak)=${peak}`);
}
await b.close();
