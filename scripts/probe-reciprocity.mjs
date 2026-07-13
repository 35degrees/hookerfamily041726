/**
 * probe-reciprocity.mjs — a CC's rendered direction must derive from the TRUE (Δx-compressed, Δy) vector:
 *   RECIPROCITY: entry(A→B) == −entry(B→A) within tolerance (A→B and B→A are exact reverses);
 *   SAME-ERA: |vertical component| ≈ 0 when |Δy| ≈ 0 (a same-year CC pans horizontally, no fake descent).
 * Fixture: thomas-debevoise-1874 ↔ john-rockefeller-jr-1874 (both 1874, reciprocal collateral CCs).
 * With the altitude arc PARKED these fly the flat directional arrival, so we read the card's entry vector.
 * Dev server up on :5173.
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

// entry unit vector = normalize(hero's max-offset frame relative to the slot)
async function entryVec(src, targetSlug) {
	await page.goto(`${BASE}/person/${src}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);
	const geo = await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		if (!a) return null;
		const r = a.getBoundingClientRect();
		const s = document.querySelector('.featured-slot').getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2, sx: s.left + s.width / 2, sy: s.top + s.height / 2 };
	}, targetSlug);
	if (!geo) return null;
	await page.mouse.click(geo.x, geo.y);
	const best = await page.evaluate(({ sx, sy }) => new Promise((res) => {
		let n = 0, best = null, bestMag = 0;
		const tick = () => {
			const ff = [...document.querySelectorAll('.featured-flight')].find((x) => getComputedStyle(x).zIndex === '2' || x.classList.contains('flat'));
			const w = ff?.querySelector('.featured-card-wrap,.featured-card')?.getBoundingClientRect();
			if (w) { const dx = w.left + w.width / 2 - sx, dy = w.top + w.height / 2 - sy, mag = Math.hypot(dx, dy); if (mag > bestMag) { bestMag = mag; best = { dx, dy }; } }
			if (++n < 14) requestAnimationFrame(tick); else res(best);
		};
		requestAnimationFrame(tick);
	}), { sx: geo.sx, sy: geo.sy });
	await page.waitForTimeout(400);
	if (!best) return null;
	const mag = Math.hypot(best.dx, best.dy);
	return mag > 0.001 ? { x: best.dx / mag, y: best.dy / mag } : null;
}

const ab = await entryVec('thomas-debevoise-1874', 'john-rockefeller-jr-1874');
const ba = await entryVec('john-rockefeller-jr-1874', 'thomas-debevoise-1874');
ok(ab && ba, 'reciprocity: one of the CC links not found / no entry offset');
if (ab && ba) {
	const err = Math.hypot(ab.x + ba.x, ab.y + ba.y);
	ok(err < 0.12, `reciprocity: A→B (${ab.x.toFixed(2)},${ab.y.toFixed(2)}) not reverse of B→A (${ba.x.toFixed(2)},${ba.y.toFixed(2)}) |sum|=${err.toFixed(3)}`);
	ok(Math.abs(ab.y) < 0.1, `same-era A→B: vertical component ${ab.y.toFixed(3)} (want ≈0 for Δy=0)`);
	ok(Math.abs(ba.y) < 0.1, `same-era B→A: vertical component ${ba.y.toFixed(3)} (want ≈0 for Δy=0)`);
	console.log(`  entry A→B=(${ab.x.toFixed(2)},${ab.y.toFixed(2)})  B→A=(${ba.x.toFixed(2)},${ba.y.toFixed(2)})  |sum|=${err.toFixed(3)}`);
}

await ctx.close();
await browser.close();
if (fails.length) { console.log('RECIPROCITY PROBE: RED\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('RECIPROCITY PROBE: GREEN — A→B is the exact reverse of B→A; same-era CCs pan horizontally.');
