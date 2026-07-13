/**
 * probe-reciprocity.mjs — the CC arrival vector must derive from the TRUE (Δx-compressed, Δy) vector, so:
 *   RECIPROCITY: vector(A→B) == −vector(B→A) within tolerance (A→B and B→A are exact reverses);
 *   SAME-ERA: |vertical component| ≈ 0 when |Δy| ≈ 0 (a same-year CC pans horizontally, no fake descent).
 * Fixture: thomas-debevoise-1874 ↔ john-rockefeller-jr-1874 (both 1874, reciprocal collateral CCs).
 * Prove RED on the capped/default-down build, GREEN after the true-vector fix.
 * Dev server up on :5173.
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

// the entry unit vector = normalize(hero's max-offset frame relative to the slot)
async function entryVec(src, targetSlug) {
	await page.goto(`${BASE}/person/${src}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);
	const geo = await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		if (!a) return null;
		const r = a.getBoundingClientRect();
		const s = document.querySelector('.featured-slot').getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2, sx: s.left + s.width / 2, sy: s.top + s.height / 2, rc: a.dataset.relationClass };
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
	return { x: best.dx / mag, y: best.dy / mag, rc: geo.rc };
}

const A = 'thomas-debevoise-1874', As = 'thomas-debevoise-1874';
const B = 'john-rockefeller-jr-1874', Bs = 'john-rockefeller-jr-1874';
const ab = await entryVec(A, Bs);
const ba = await entryVec(B, As);
ok(ab && ba, 'reciprocity: one of the CC links not found');
if (ab && ba) {
	// reverses: ab ≈ −ba  → ab + ba ≈ 0
	const sumX = ab.x + ba.x, sumY = ab.y + ba.y;
	const err = Math.hypot(sumX, sumY);
	ok(err < 0.12, `reciprocity: A→B ${JSON.stringify(ab)} not the reverse of B→A ${JSON.stringify(ba)} (|sum|=${err.toFixed(3)})`);
	// same-era: Δy = 0 → vertical component ≈ 0 on both
	ok(Math.abs(ab.y) < 0.1, `same-era A→B: vertical component ${ab.y.toFixed(3)} (want ≈0 for Δy=0)`);
	ok(Math.abs(ba.y) < 0.1, `same-era B→A: vertical component ${ba.y.toFixed(3)} (want ≈0 for Δy=0)`);
	console.log(`  A→B=(${ab.x.toFixed(2)},${ab.y.toFixed(2)})  B→A=(${ba.x.toFixed(2)},${ba.y.toFixed(2)})  |sum|=${err.toFixed(3)}`);
}

await ctx.close();
await browser.close();
if (fails.length) { console.log('RECIPROCITY PROBE: RED\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('RECIPROCITY PROBE: GREEN — A→B is the exact reverse of B→A; same-era CCs pan horizontally (no fake descent).');
