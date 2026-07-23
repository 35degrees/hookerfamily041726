// PROBE (DECK v4 — the phantom train). Per flight, samples the hero (z-index 3) and car-1 (z-index 2)
// every frame and asserts:
//   1. FILTER-NONE: neither real card ever carries a filter (the animated blur = the shimmer, now gone).
//   2. STRICT EXIT → BEAT → ENTRY: car-1 is FULLY offscreen before the hero's first PAINTED frame; the two
//      never co-occupy the stage. The empty gap between them is the phantom beat (∝ relation).
//   3. TILT: both real cards carry a nonzero seeded draw while moving; the hero irons to ~0 at rest.
// Timing (car1-exit, beat, entry, total) is reported per case for the morning feel-pass.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const CARD_W = 925;
const CASES = [
	{ start: 'mary-pierpont-1673', target: 'mary-talcott-1720', rel: 'direct/vertical (gd +2)', dir: 'BOTTOM' },
	{ start: 'thomas-hooker-1586', target: 'john-haynes-1594', rel: 'orbit/lateral (gd null)', dir: 'LATERAL' }
];
const SIZES = [
	{ w: 1440, h: 900 },
	{ w: 1920, h: 1200 }
];

async function run(page, c) {
	await page.goto(`${BASE}/person/${c.start}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(300);
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
	if (!geo) return null;
	await page.evaluate(() => {
		window.__tl = [];
		const t0 = performance.now();
		const rot = (el) => {
			const m = getComputedStyle(el).transform;
			const p = m && m.match(/matrix\(([^)]+)\)/);
			if (!p) return 0;
			const [a, b] = p[1].split(',').map(Number);
			return (Math.atan2(b, a) * 180) / Math.PI;
		};
		const grab = () => {
			const t = performance.now() - t0;
			const fl = [...document.querySelectorAll('.featured-flight')];
			const hero = fl.find((f) => getComputedStyle(f).zIndex === '3');
			const car1 = fl.find((f) => getComputedStyle(f).zIndex === '2');
			const trans = (el) => {
				const m = getComputedStyle(el).transform;
				const p = m && m.match(/matrix\(([^)]+)\)/);
				if (!p) return { tx: 0, ty: 0 };
				const v = p[1].split(',').map(Number);
				return { tx: v[4], ty: v[5] };
			};
			const info = (el) => {
				if (!el) return null;
				const r = el.getBoundingClientRect();
				const on = r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0;
				const tr = trans(el);
				return { op: +getComputedStyle(el).opacity, filt: getComputedStyle(el).filter, rot: +rot(el).toFixed(2), on, tx: Math.round(tr.tx), ty: Math.round(tr.ty), top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom) };
			};
			window.__tl.push({ t: Math.round(t), vw: innerWidth, vh: innerHeight, hero: info(hero), car1: info(car1) });
			if (t < 2200) requestAnimationFrame(grab);
		};
		requestAnimationFrame(grab);
	});
	await page.mouse.click(geo.x, geo.y);
	await page.waitForTimeout(2300);
	return page.evaluate(() => window.__tl);
}

const gap = (a, b) => {
	// shortest edge-to-edge distance between two axis-aligned rects; 0 if they overlap
	const dx = Math.max(0, Math.max(a.left - b.right, b.left - a.right));
	const dy = Math.max(0, Math.max(a.top - b.bottom, b.top - a.bottom));
	return Math.hypot(dx, dy);
};
function analyze(tl) {
	let filterBad = false, bothOnscreen = false, heroPaintAt = null, heroLandAt = null, car1GoneAt = null;
	let heroMaxRot = 0, heroRestRot = null, car1MaxRot = 0;
	for (const s of tl) {
		if (s.hero && s.hero.filt && s.hero.filt !== 'none') filterBad = true;
		if (s.car1 && s.car1.filt && s.car1.filt !== 'none') filterBad = true;
		const heroPainted = s.hero && s.hero.op > 0.1 && s.hero.on;
		if (heroPaintAt === null && heroPainted) heroPaintAt = s.t;
		if (s.hero) { heroMaxRot = Math.max(heroMaxRot, Math.abs(s.hero.rot)); heroRestRot = Math.abs(s.hero.rot); }
		if (s.car1 && s.car1.on) car1MaxRot = Math.max(car1MaxRot, Math.abs(s.car1.rot));
		// car-1 fully gone = not present OR fully offscreen (track the last moment it stays gone)
		const car1Gone = !s.car1 || !s.car1.on;
		if (car1Gone && s.t > 30) { if (car1GoneAt === null) car1GoneAt = s.t; }
		else car1GoneAt = null; // reset until it stays gone
		// v4.2.2: the exiting + entering cards must NEVER be on screen together — the empty stage between them
		// is the large-tree distance. Flag any frame where both are painted onscreen.
		if (heroPainted && s.car1 && s.car1.on) bothOnscreen = true;
		if (s.hero && s.hero.op > 0.9 && s.hero.on && Math.abs(s.hero.rot) < 0.3 && Math.abs(s.hero.tx) < 4 && Math.abs(s.hero.ty) < 4 && heroLandAt === null && heroPaintAt !== null && s.t > (heroPaintAt ?? 0) + 40) heroLandAt = s.t;
	}
	// empty-gap = time between car 1 fully gone and the hero first painting onscreen
	const gapMs = car1GoneAt !== null && heroPaintAt !== null ? heroPaintAt - car1GoneAt : null;
	return { filterBad, bothOnscreen, gapMs, heroPaintAt, heroLandAt, heroMaxRot, heroRestRot, car1MaxRot };
}

const b = await chromium.launch();
let pass = 0, total = 0;
for (const s of SIZES) {
	const ctx = await b.newContext({ viewport: { width: s.w, height: s.h } });
	const page = await ctx.newPage();
	for (const c of CASES) await page.goto(`${BASE}/person/${c.start}`, { waitUntil: 'networkidle' }); // warm
	for (const c of CASES) {
		total++;
		const tl = await run(page, c);
		if (!tl) { console.log(`✗ [${s.w}×${s.h}] ${c.target}: NO LINK`); continue; }
		const a = analyze(tl);
		// v4.2.2: the exiting + entering cards are NEVER on screen together — there is an empty-stage gap
		// between them (the large-tree distance). No convoy, no overlap.
		const gapOK = !a.bothOnscreen && a.gapMs !== null && a.gapMs > 0;
		const tiltOK = a.heroMaxRot > 1.0 && (a.heroRestRot === null || a.heroRestRot < 0.4) && a.car1MaxRot > 1.0;
		const ok = !a.filterBad && gapOK && tiltOK;
		if (ok) pass++;
		console.log(
			`${ok ? '✓' : '✗'} [${s.w}×${s.h}] ${c.rel}: filterNone=${!a.filterBad} neverBothOnscreen=${!a.bothOnscreen} emptyGap=${a.gapMs}ms ` +
			`| tilt hero≤${a.heroMaxRot.toFixed(1)}°→${a.heroRestRot}° car1≤${a.car1MaxRot.toFixed(1)}° | total≈${a.heroLandAt}ms`
		);
	}
	await ctx.close();
}
console.log(`\nDECK-PHANTOM PROBE: ${pass}/${total} ${pass === total ? 'GREEN' : 'RED'}`);
await b.close();
