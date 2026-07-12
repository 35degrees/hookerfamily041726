/**
 * measure-velocity.mjs — reports the PEAK on-screen speed (px/ms) of the flying featured card for a
 * NEAR and a FAR relative flight, both the promotion (hero) and the demotion. Used to set the velocity
 * ceiling (item 2): far flights should not exceed the near baseline by more than ~1.15–1.25×.
 *
 *   node scripts/measure-velocity.mjs
 *
 * Two navs give all four cells:
 *   michael → parent Rodman : hero NEAR (parents row → slot), demote FAR  (slot → child row)
 *   nancy   → child michael : hero FAR  (child row → slot),   demote NEAR (slot → parents row)
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();

async function peak(startSlug, targetSel, label) {
	await page.goto(`${BASE}/person/${startSlug}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	const t = await page.evaluate((sel) => { const a = document.querySelector(sel); const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, targetSel);
	await page.mouse.move(5, 5);
	await page.mouse.click(t.x, t.y);
	const s = await page.evaluate(() => new Promise((resolve) => {
		const hero = [], demote = [];
		let n = 0;
		const cen = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: performance.now() }; };
		const tick = () => {
			const cards = [...document.querySelectorAll('.featured-flight')];
			const dem = cards.find((c) => c.classList.contains('demoting'));
			const her = cards.find((c) => !c.classList.contains('demoting') && getComputedStyle(c).transform !== 'none');
			if (dem) demote.push(cen(dem));
			if (her) hero.push(cen(her));
			if (++n < 60) requestAnimationFrame(tick); else resolve({ hero, demote });
		};
		requestAnimationFrame(tick);
	}));
	const pk = (arr) => {
		let m = 0;
		for (let i = 1; i < arr.length; i++) {
			const dt = arr[i].t - arr[i - 1].t;
			if (dt <= 0) continue;
			const d = Math.hypot(arr[i].x - arr[i - 1].x, arr[i].y - arr[i - 1].y);
			m = Math.max(m, d / dt);
		}
		return m;
	};
	const travel = (arr) => (arr.length > 1 ? Math.hypot(arr[arr.length - 1].x - arr[0].x, arr[arr.length - 1].y - arr[0].y) : 0);
	console.log(`${label}: hero peak=${pk(s.hero).toFixed(2)}px/ms (travel~${Math.round(travel(s.hero))}) | demote peak=${pk(s.demote).toFixed(2)}px/ms (travel~${Math.round(travel(s.demote))})`);
}

// pick the relative box (any slot) whose center is FURTHEST from the featured-slot center → max pan.
async function peakFarthest(startSlug, label) {
	await page.goto(`${BASE}/person/${startSlug}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	const t = await page.evaluate(() => {
		const slot = document.querySelector('.featured-slot').getBoundingClientRect();
		const cx = slot.left + slot.width / 2, cy = slot.top + slot.height / 2;
		let best = null, bestD = -1;
		for (const a of document.querySelectorAll('.parents-slot a, .children-slot a')) {
			const r = a.getBoundingClientRect();
			const d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy);
			if (d > bestD) { bestD = d; best = { x: r.left + r.width / 2, y: r.top + r.height / 2, d }; }
		}
		return best;
	});
	if (!t) { console.log(`${label}: no relative box`); return; }
	await page.mouse.move(5, 5);
	await page.mouse.click(t.x, t.y);
	const s = await page.evaluate(() => new Promise((resolve) => {
		const hero = [], demote = [];
		let n = 0;
		const cen = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: performance.now() }; };
		const tick = () => {
			const cards = [...document.querySelectorAll('.featured-flight')];
			const dem = cards.find((c) => c.classList.contains('demoting'));
			const her = cards.find((c) => !c.classList.contains('demoting') && getComputedStyle(c).transform !== 'none');
			if (dem) demote.push(cen(dem)); if (her) hero.push(cen(her));
			if (++n < 70) requestAnimationFrame(tick); else resolve({ hero, demote });
		};
		requestAnimationFrame(tick);
	}));
	const pk = (arr) => { let m = 0; for (let i = 1; i < arr.length; i++) { const dt = arr[i].t - arr[i - 1].t; if (dt <= 0) continue; m = Math.max(m, Math.hypot(arr[i].x - arr[i - 1].x, arr[i].y - arr[i - 1].y) / dt); } return m; };
	const trav = (arr) => (arr.length > 1 ? Math.hypot(arr[arr.length - 1].x - arr[0].x, arr[arr.length - 1].y - arr[0].y) : 0);
	console.log(`${label} (clicked box ${Math.round(t.d)}px from slot): hero peak=${pk(s.hero).toFixed(2)}px/ms (travel~${Math.round(trav(s.hero))}) | demote peak=${pk(s.demote).toFixed(2)}px/ms (travel~${Math.round(trav(s.demote))})`);
}

await peak('michael-hooker-1935', '.parents-slot a', 'michael→parent  [NEAR ~440px]');
await peak('nancy-morse-1915', '.children-slot a, [class*="children"] a', 'nancy→child     [NEAR ~440px]');
await peakFarthest('john-morgan-1930', 'morgan→farthest [FAR ]');
await peakFarthest('michael-hooker-1935', 'michael→farthest[FAR ]');

await ctx.close();
await browser.close();
