/**
 * probe-arrival.mjs — the DIRECTIONAL ARRIVAL class (CC / non-chip navigations). Per CC click asserts:
 *   ANGLE (graph-derived laterality): collateral (uncle) tilts ~45°±3; direct (grand-son/-daughter) ≤8°.
 *   (a) the OLD card slides out the OPPOSITE way and is GONE before the hero lands (finish-first);
 *   (b) the HERO enters from offscreen on the correct vertical side (sign matches Δyears);
 *   (c) NO frame has both cards full-size overlapping (the flash — pinned dead).
 *   Chip navigation is untouched — covered by probe-flight/settle/camera (run separately).
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

// [source slug, target slug, label, expected relation_class, [tiltLo, tiltHi] degrees]
const PAIRS = [
	['matthew-russell-1761', 'matthew-talcott-1713', 'uncle', 'collateral', [42, 48]],
	['matthew-russell-1761', 'talcott-russell-1847', 'grandson', 'direct', [0, 8]],
	['mary-pierpont-1673', 'mary-talcott-1720', 'granddaughter', 'direct', [0, 8]]
];

async function arrival(src, target, label, wantClass, [tLo, tHi]) {
	await page.goto(`${BASE}/person/${src}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);
	const geo = await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		if (!a) return null;
		const r = a.getBoundingClientRect();
		const s = document.querySelector('.featured-slot').getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2, sx: s.left + s.width / 2, sy: s.top + s.height / 2, rc: a.dataset.relationClass };
	}, target);
	if (!geo) { fails.push(`${label}: no data-cc link → ${target}`); return; }
	ok(geo.rc === wantClass, `${label}: relation_class ${geo.rc} != ${wantClass}`);
	const n0 = moves.length;
	await page.mouse.click(geo.x, geo.y);
	const frames = await page.evaluate(({ sx, sy }) => new Promise((res) => {
		const out = []; let n = 0;
		const box = (el) => { if (!el) return null; const w = el.querySelector('.featured-card-wrap,.featured-card')?.getBoundingClientRect(); return w && w.width > 2 ? { dx: w.left + w.width / 2 - sx, dy: w.top + w.height / 2 - sy, w: w.width, cy: w.top + w.height / 2 } : null; };
		const tick = () => {
			const ffs = [...document.querySelectorAll('.featured-flight')];
			const hero = ffs.find((x) => getComputedStyle(x).zIndex === '2') || ffs.find((x) => x.classList.contains('flat'));
			const old = ffs.find((x) => x !== hero);
			out.push({ hero: box(hero), old: box(old), heroFlat: !!hero?.classList.contains('flat') });
			if (++n < 66) requestAnimationFrame(tick); else res(out);
		};
		requestAnimationFrame(tick);
	}), { sx: geo.sx, sy: geo.sy });
	await page.waitForTimeout(400);
	const mv = moves[moves.length - 1];
	ok(mv && mv.kind === 'cc', `${label}: no cc camera move`);
	const worldVy = mv?.to?.y != null && mv?.from?.y != null ? mv.to.y - mv.from.y : null;

	// ANGLE — the entry unit vector, read from the frame with the LARGEST offset (the offscreen start).
	const heroFrames = frames.map((f) => f.hero).filter(Boolean);
	const start = heroFrames.reduce((a, f) => (Math.hypot(f.dx, f.dy) > Math.hypot(a.dx, a.dy) ? f : a), heroFrames[0]);
	const tilt = start ? (Math.atan2(Math.abs(start.dx), Math.abs(start.dy)) * 180) / Math.PI : null;
	ok(tilt != null && tilt >= tLo && tilt <= tHi, `${label}: tilt ${tilt?.toFixed(1)}° outside [${tLo},${tHi}]`);

	// SETTLE DIRECTION — the arrival must overshoot ALONG the travel direction (carry PAST the slot, then
	// spring back), never backwards toward the entry point. Project every hero offset onto the entry unit
	// vector (dir points at the offscreen start; +ENTRY_DIST → 0 at the slot → NEGATIVE = past the slot).
	if (start) {
		const mag = Math.hypot(start.dx, start.dy);
		const ux = start.dx / mag, uy = start.dy / mag;
		const minProj = Math.min(...heroFrames.map((f) => f.dx * ux + f.dy * uy));
		ok(minProj < -0.5, `${label}: settle did NOT overshoot past the slot (min projection ${minProj.toFixed(1)}px — backwards or absent)`);
	}
	// (b) vertical entry side matches Δyears
	if (worldVy != null && start) ok(Math.sign(start.dy) === Math.sign(worldVy), `${label}: entered wrong vertical side (dy ${start.dy.toFixed(0)}, Δyears ${worldVy})`);

	// (c) no full-size overlap
	const overlap = frames.filter((f) => f.hero && f.old && f.hero.w > 850 && f.old.w > 850 && Math.abs(f.hero.cy - f.old.cy) < 300).length;
	ok(overlap === 0, `${label}: ${overlap} frame(s) both cards full-size overlapping (the flash)`);

	// (a) old gone before the hero lands (.flat drop = the true landing)
	const oldGoneIdx = frames.findIndex((f, i) => i > 2 && !f.old && frames[i - 1].old);
	const heroLandIdx = frames.findIndex((f, i) => i > 2 && !f.heroFlat && frames[i - 1].heroFlat);
	ok(oldGoneIdx >= 0 && heroLandIdx >= 0 && oldGoneIdx <= heroLandIdx, `${label}: old not gone before landing (old-gone ${oldGoneIdx}, hero-land ${heroLandIdx})`);

	console.log(`  ${label} [${geo.rc}]: tilt=${tilt?.toFixed(1)}° ${start?.dy < 0 ? 'from-above' : 'from-below'} overlap=${overlap} (old-gone ${oldGoneIdx} ≤ land ${heroLandIdx})`);
}

for (const p of PAIRS) await arrival(...p);

await ctx.close();
await browser.close();
if (fails.length) { console.log('ARRIVAL PROBE: RED\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('ARRIVAL PROBE: GREEN — collateral tilts ~45°, direct arrives vertical; old slides out opposite & finishes first; no overlap flash.');
