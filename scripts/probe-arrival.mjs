/**
 * probe-arrival.mjs — the DIRECTIONAL ARRIVAL class (CC / non-chip navigations). On a CC click asserts:
 *   (a) the OLD card slides out the OPPOSITE way and is GONE before the hero lands (finish-first);
 *   (b) the HERO enters from offscreen on the WORLD VECTOR's side (entry-side sign matches to−from in y);
 *   (c) NO frame has both cards full-size overlapping (the flash — pinned dead);
 *   (d) chip navigation is untouched — covered by probe-flight/settle/camera (run separately).
 * Dev server up on :5173.
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const moves = [];
page.on('console', (m) => { const t = m.text(); if (t.startsWith('[camera]')) { try { moves.push(JSON.parse(t.slice(8).trim())); } catch { /* ignore */ } } });
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

async function ccArrival(slug, needle, label) {
	await page.goto(`${BASE}/person/${slug}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);
	const slotCy = await page.evaluate(() => { const r = document.querySelector('.featured-slot').getBoundingClientRect(); return r.top + r.height / 2; });
	const cc = await page.evaluate((nd) => { const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (nd ? x.textContent.includes(nd) : true) && x.dataset.tx != null); if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, needle);
	if (!cc) { console.log(`  ${label}: no CC with coords — skipped`); return; }
	const n0 = moves.length;
	await page.mouse.click(cc.x, cc.y);
	const frames = await page.evaluate(() => new Promise((res) => {
		const out = []; let n = 0;
		const cy = (el) => { if (!el) return null; const w = el.querySelector('.featured-card-wrap,.featured-card')?.getBoundingClientRect(); return w && w.width > 2 ? { cy: w.top + w.height / 2, w: w.width } : null; };
		const tick = () => {
			const ffs = [...document.querySelectorAll('.featured-flight')];
			const hero = ffs.find((x) => getComputedStyle(x).zIndex === '2') || ffs.find((x) => x.classList.contains('flat'));
			const old = ffs.find((x) => x !== hero);
			out.push({ ffCount: ffs.length, hero: cy(hero), old: cy(old), heroFlat: !!hero?.classList.contains('flat') });
			if (++n < 66) requestAnimationFrame(tick); else res(out);
		};
		requestAnimationFrame(tick);
	}));
	await page.waitForTimeout(400);
	const mv = moves[moves.length - 1];
	ok(mv && mv.kind === 'cc' && mv.to && mv.to.y != null, `${label}: no cc move with a time-based to`);
	if (!mv || mv.to?.y == null) return;
	const worldVy = mv.to.y - mv.from.y;

	// (c) no full-size overlap
	const overlap = frames.filter((f) => f.hero && f.old && f.hero.w > 850 && f.old.w > 850 && Math.abs(f.hero.cy - f.old.cy) < 300).length;
	ok(overlap === 0, `${label}: ${overlap} frame(s) with both cards full-size overlapping (the flash)`);

	// (b) hero enters from the world-vector side: sign(hero_start_cy − slot) === sign(worldVy)
	const heroFrames = frames.filter((f) => f.hero);
	const heroStart = heroFrames[0]?.hero.cy;
	ok(heroStart != null && Math.sign(heroStart - slotCy) === Math.sign(worldVy), `${label}: hero entered from the WRONG side (start cy ${Math.round(heroStart)} vs slot ${Math.round(slotCy)}, worldVy ${Math.round(worldVy)})`);
	// … and settles at the slot
	const heroEnd = heroFrames[heroFrames.length - 1]?.hero.cy;
	ok(heroEnd != null && Math.abs(heroEnd - slotCy) < 40, `${label}: hero did not land in the slot (end cy ${Math.round(heroEnd)} vs ${Math.round(slotCy)})`);

	// (a) old card exits the OPPOSITE way and is GONE before the hero lands
	const oldFrames = frames.filter((f) => f.old);
	const oldEnd = oldFrames[oldFrames.length - 1]?.old.cy;
	ok(oldEnd != null && Math.sign(oldEnd - slotCy) === -Math.sign(worldVy), `${label}: old card exited the wrong way (end cy ${Math.round(oldEnd)} vs slot, expected sign ${-Math.sign(worldVy)})`);
	const oldGoneIdx = frames.findIndex((f, i) => i > 2 && !f.old && frames[i - 1].old);
	// hero LANDS when its .flat class drops (introend) — not when it first nears the slot (the settle
	// keeps it near for a while before the true landing).
	const heroLandIdx = frames.findIndex((f, i) => i > 2 && !f.heroFlat && frames[i - 1].heroFlat);
	ok(oldGoneIdx >= 0 && heroLandIdx >= 0 && oldGoneIdx <= heroLandIdx, `${label}: old card not gone before the hero landed (old-gone ${oldGoneIdx}, hero-land ${heroLandIdx})`);

	console.log(`  ${label}: worldVy=${Math.round(worldVy)} hero ${Math.round(heroStart)}→${Math.round(heroEnd)} old →${Math.round(oldEnd)} overlap=${overlap} (old-gone ${oldGoneIdx} ≤ hero-land ${heroLandIdx})`);
}

await ccArrival('michael-hooker-1935', 'Bunker', 'cc michael→bunker (earlier → from above)');

await ctx.close();
await browser.close();
if (fails.length) { console.log('ARRIVAL PROBE: RED\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('ARRIVAL PROBE: GREEN — CC card flies in whole on the world vector, old slides out opposite & finishes first, no overlap flash.');
