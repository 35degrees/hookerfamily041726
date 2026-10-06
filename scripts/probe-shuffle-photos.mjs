/**
 * probe-shuffle-photos.mjs — does a shuffled card land with its photo already loaded? (Sam, 100526, Chrome:
 * "25% the photos aren't loaded before entering… they load while the card is settling".) Chains shuffles
 * the way a reader does: each one 1.2s after the previous landing, i.e. while that card's CC photo warms
 * (photo.ts warmCrossConnections, ~0.9s after landing) are downloading. Fresh browser cache per run.
 *   node scripts/probe-shuffle-photos.mjs [shuffles=20]
 * Result 100526: 1–2 in 20 photos land ~600ms after the card enters — first-time fetches from Cloudinary's
 * CDN (curl: 1.36s cold vs 0.10s warm for the same file). Not the CC warms: aborting them changed nothing.
 */
import { chromium } from '@playwright/test';
const BASE = process.env.BASE ?? 'http://localhost:5173';
const N = Number(process.argv[2] ?? 20);
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(`${BASE}/thomas-hooker-1586`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
let late = 0;
const rows = [];
for (let i = 0; i < N; i++) {
	const r = await page.evaluate(() => new Promise((resolve) => {
		const btn = document.querySelector('button.shuffle-notables');
		const from = location.pathname;
		const t0 = performance.now();
		btn.click();
		let cardAt = null, photoAt = null, landed = null;
		(function tick() {
			const now = performance.now() - t0;
			const cards = document.querySelectorAll('.featured-flight');
			const c = location.pathname !== from ? cards[cards.length - 1] : null;
			if (c && cardAt === null) cardAt = now; // the arriving card is in the DOM (it flies in from here)
			const img = c && c.querySelector('.featured-card img');
			if (img && photoAt === null && img.complete && img.naturalWidth > 0) photoAt = now;
			if (c && landed === null && cards.length === 1 && !c.getAnimations().some((a) => a.playState === 'running')) landed = now;
			if (now < 3000) return requestAnimationFrame(tick);
			resolve({ to: location.pathname, cardAt: cardAt && Math.round(cardAt), photoAt: img ? (photoAt === null ? 'never' : Math.round(photoAt)) : 'no photo', landed: landed && Math.round(landed) });
		})();
	}));
	// LATE = the photo finished after the card had already been flying for 300ms (it is visibly on screen by then)
	r.photo = typeof r.photoAt === 'number' && r.cardAt != null && r.photoAt - r.cardAt > 300 ? 'LATE' : String(r.photoAt);
	if (String(r.photo).startsWith('LATE')) late++;
	rows.push(r);
	await page.waitForTimeout(Number(process.env.READ_MS ?? 1200));
}
console.log(`${late}/${N} shuffles: the photo finished >300ms after the card entered`);
for (const r of rows) console.log('  ', r.to, 'card in DOM', r.cardAt, 'photo ready', r.photoAt, 'all settled', r.landed, r.photo === 'LATE' ? '  <-- LATE' : '');
await browser.close();
