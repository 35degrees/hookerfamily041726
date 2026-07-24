// Verify point 6: the INCOMING hero's FIRST painted frame (after SPA nav flips the URL to the target) is
// offset offscreen / in motion, never materialized at its slot. rAF-poll from click; the first frame where
// the pathname is the target, snapshot every .featured-flight rect — the fresh hero is among them.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const CASES = [
	{ tag: 'D', start: 'mary-pierpont-1673', target: 'mary-talcott-1720' },
	{ tag: 'F', start: 'thomas-hooker-1586', target: 'samuel-talcott-1635' }
];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1680, height: 1000 } });
const page = await ctx.newPage();
for (const c of CASES) {
	await page.goto(`${BASE}/person/${c.start}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(350);
	const geo = await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		const r = a.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}, c.target);
	await page.evaluate((tg) => {
		window.__hero = null;
		const t0 = performance.now();
		const tick = () => {
			const here = location.pathname.endsWith('/person/' + tg);
			if (here && !window.__hero) {
				const fs = [...document.querySelectorAll('.featured-flight')].map((f) => {
					const r = f.getBoundingClientRect();
					return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left) };
				});
				window.__hero = { fs, vh: window.innerHeight, vw: window.innerWidth, dt: Math.round(performance.now() - t0) };
			}
			if (performance.now() - t0 < 500) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}, c.target);
	await page.mouse.click(geo.x, geo.y);
	await page.waitForTimeout(550);
	const h = await page.evaluate(() => window.__hero);
	if (!h) { console.log(`[${c.tag}] never saw target URL`); continue; }
	console.log(`[${c.tag}] hero first frame after nav @${h.dt}ms — ${h.fs.length} flight(s), vh=${h.vh} vw=${h.vw}`);
	let anyOff = false;
	h.fs.forEach((f, i) => {
		const off = f.top >= h.vh || f.bottom <= 0 || f.left >= h.vw || f.left + 925 <= 0;
		if (off) anyOff = true;
		console.log(`     flight[${i}] top=${f.top} bottom=${f.bottom} left=${f.left}  ${off ? 'OFFSCREEN ✓' : 'onscreen'}`);
	});
	console.log(`     → hero enters offscreen/in-motion: ${anyOff ? 'YES ✓ (no edge-flash)' : 'NO ✗ — materialized in place'}`);
	await page.waitForTimeout(300);
}
await b.close();
