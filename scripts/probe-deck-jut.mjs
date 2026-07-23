// PROBE (fix 1 + 3): the frozen jut is dead at ANY window size, and GHOSTS default OFF (pure push).
// The incoming HERO and departing CAR-1 both carry .featured-flight; they are told apart by their blur
// filter (hero-blur-* vs car1-blur-*). Car-1 legitimately starts AT REST (it accelerates out), so the
// jut check must target the HERO specifically. Asserts, at TWO viewport sizes (the pinned lesson):
//   1a: the hero's FIRST painted frame after nav is fully offscreen (in motion), never materialized at slot.
//   1b: the hero is never onscreen-and-opaque while at rest during its entry-delay (the belt).
//   3:  zero ghost nodes ever spawn (DECK_GHOSTS=false) — hero + car 1 only.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const CARD_W = 925;
const SIZES = [
	{ w: 1440, h: 900 },
	{ w: 1920, h: 1200 }
];
const CASES = [
	{ start: 'thomas-hooker-1586', target: 'john-haynes-1594', axis: 'LATERAL' },
	{ start: 'mary-pierpont-1673', target: 'mary-talcott-1720', axis: 'VERTICAL' }
];

const b = await chromium.launch();
let pass = 0, total = 0;
for (const s of SIZES) {
	const ctx = await b.newContext({ viewport: { width: s.w, height: s.h } });
	const page = await ctx.newPage();
	// warm the routes (first SvelteKit dev compile is janky — the pinned lesson's cousin)
	for (const c of CASES) await page.goto(`${BASE}/person/${c.start}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(200);
	for (const c of CASES) {
		total++;
		await page.goto(`${BASE}/person/${c.start}`, { waitUntil: 'networkidle' });
		await page.waitForTimeout(320);
		// scroll the CC into view first — on a short viewport a long card pushes lower CCs below the fold,
		// and a click at an out-of-viewport y is a silent no-op (the 1440×900 miss).
		await page.evaluate((tg) => {
			const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
			a?.scrollIntoView({ block: 'center' });
		}, c.target);
		await page.waitForTimeout(150);
		const geo = await page.evaluate((tg) => {
			const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
			if (!a) return null;
			const r = a.getBoundingClientRect();
			return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
		}, c.target);
		if (!geo) { console.log(`✗ [${s.w}×${s.h}] ${c.target}: NO LINK`); continue; }
		await page.evaluate((tg) => {
			window.__r = { firstOff: null, beltViolated: false, ghostPeak: 0, sawHero: false };
			const t0 = performance.now();
			const heroOf = (fs) => fs.find((f) => f.z === '3'); // hero is z-index 3 (car-1 z 2)
			const tick = () => {
				const g = document.querySelectorAll('[data-deck-ghost]').length;
				if (g > window.__r.ghostPeak) window.__r.ghostPeak = g;
				const fs = [...document.querySelectorAll('.featured-flight')].map((f) => {
					const r = f.getBoundingClientRect();
					return { top: r.top, bottom: r.bottom, left: r.left, z: getComputedStyle(f).zIndex, op: +getComputedStyle(f).opacity };
				});
				const hero = heroOf(fs);
				if (hero) {
					window.__r.sawHero = true;
					const off = hero.top >= innerHeight || hero.bottom <= 0 || hero.left >= innerWidth || hero.left + 925 <= 0;
					if (window.__r.firstOff === null) window.__r.firstOff = off; // first frame the hero exists
					// belt: DURING THE ENTRY DELAY (first ~160ms, before motion) the hero must never be visible
					// while onscreen at rest. (After it lands it is legitimately at-rest + opaque — excluded by the
					// time window.) With the viewport entry it sits offscreen here anyway; opacity 0 is insurance.
					const onscreen = hero.top < innerHeight && hero.bottom > 0 && hero.left < innerWidth && hero.left + 925 > 0;
					const atRest = Math.abs(hero.top - 250) < 40 && Math.abs(hero.left - (innerWidth - 925) / 2) < 40;
					if (performance.now() - t0 < 160 && onscreen && atRest && hero.op > 0.1) window.__r.beltViolated = true;
				}
				if (performance.now() - t0 < 1000) requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
		}, c.target);
		await page.mouse.click(geo.x, geo.y);
		await page.waitForTimeout(1100);
		const r = await page.evaluate(() => window.__r);
		const ok = r.sawHero && r.firstOff === true && !r.beltViolated && r.ghostPeak === 0;
		if (ok) pass++;
		console.log(
			`${ok ? '✓' : '✗'} [${s.w}×${s.h}] ${c.start} → ${c.target} (${c.axis}): sawHero=${r.sawHero} heroFirstOffscreen=${r.firstOff} beltOK=${!r.beltViolated} ghostPeak=${r.ghostPeak}`
		);
	}
	await ctx.close();
}
console.log(`\nDECK-JUT PROBE: ${pass}/${total} ${pass === total ? 'GREEN' : 'RED'}`);
await b.close();
