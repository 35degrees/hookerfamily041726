// One-off morning report: 4-frame strips for a DIRECT (N=2-3) and a FAR collateral (N=6) riffle.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const OUT = '/private/tmp/claude-501/-Users-sth22-Genealogy-project-041726/8a6099cb-7e43-4460-aa0f-04d34d24f5ac/scratchpad';

const CASES = [
	{ tag: 'D', start: 'mary-pierpont-1673', target: 'mary-talcott-1720', shots: [60, 300, 560, 860] },
	{ tag: 'F', start: 'thomas-hooker-1586', target: 'samuel-talcott-1635', shots: [80, 420, 800, 1180] }
];

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1680, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

for (const c of CASES) {
	await page.goto(`${BASE}/person/${c.start}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);
	const geo = await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		if (!a) return null;
		const r = a.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2, rc: a.dataset.relationClass };
	}, c.target);
	if (!geo) { console.log(`[${c.tag}] NO LINK to ${c.target}`); continue; }

	page.evaluate(() => {
		window.__deckPeak = 0;
		// first painted-frame hero offset: prove it enters IN MOTION, never materialized in place
		window.__heroFirst = null;
		const t0 = performance.now();
		const tick = () => {
			const k = document.querySelector('.deck-layer')?.childElementCount ?? 0;
			if (k > window.__deckPeak) window.__deckPeak = k;
			const f = document.querySelector('.featured-flight');
			if (f && !window.__heroFirst) {
				const r = f.getBoundingClientRect();
				window.__heroFirst = { left: Math.round(r.left), right: Math.round(r.right), vw: window.innerWidth };
			}
			if (performance.now() - t0 < 1400) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});

	const start = Date.now();
	await page.mouse.click(geo.x, geo.y);
	for (let i = 0; i < c.shots.length; i++) {
		const wait = c.shots[i] - (Date.now() - start);
		if (wait > 0) await page.waitForTimeout(wait);
		await page.screenshot({ path: `${OUT}/strip-${c.tag}${i + 1}.png`, animations: 'allow' });
	}
	await page.waitForTimeout(700);
	const info = await page.evaluate(() => ({ peak: window.__deckPeak, hero: window.__heroFirst, url: location.pathname }));
	console.log(`[${c.tag}] ${c.start} → ${c.target} (rc=${geo.rc}) N=${info.peak} · nav=${info.url}`);
	console.log(`    hero first paint: left=${info.hero?.left} right=${info.hero?.right} vw=${info.hero?.vw}  (fully offscreen if left>=vw or right<=0; else in-motion)`);
}
await b.close();
