/**
 * probe-settle.mjs — Block 3 settle (spouse promotions). Frame-samples the growing hero's top-left
 * corner (transform-origin top-left → rect.left/top track the translate directly) for a spouse-1 and
 * a spouse-3 promotion, and asserts:
 *   - the hero overshoots ~SETTLE_PX px PAST its final rect ALONG the camera screenVector,
 *   - both settle back to the exact final rect (endpoint frozen, ~0 residual),
 *   - spouse-1 and spouse-3 overshoot along DIFFERENT vector directions (for free, from the vector).
 * Logs the vector + overshoot px + direction for each. Dev server up on :5173.
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

// getClick: async () => {x,y} — navigates and returns the click point (a spouse chip or a relative link).
// The settle now applies to BOTH promotion regimes (Layer 3), so the measurement is regime-agnostic.
const spouseClick = (idx) => async () => {
	await page.goto(`${BASE}/person/john-morgan-1930`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	return page.evaluate((i) => {
		const a = [...document.querySelectorAll('.spouse-notch .flight a')][i];
		if (!a) return null;
		const r = a.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}, idx);
};
const relativeClick = (slug, sel) => async () => {
	await page.goto(`${BASE}/person/${slug}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	return page.evaluate((s) => {
		const a = document.querySelector(s);
		if (!a) return null;
		const r = a.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}, sel);
};

async function settleFor(getClick, label) {
	const chip = await getClick();
	if (!chip) { fails.push(`${label}: click target not found`); return null; }
	await page.mouse.click(chip.x, chip.y);
	// hero = the incoming featured card (NOT .demoting) — persists through Svelte's style-strip at
	// landing, so its rect keeps reading (unlike a z-index probe which vanishes at strip).
	const data = await page.evaluate(() => new Promise((res) => {
		const samples = [];
		let n = 0;
		const tick = () => {
			const hero = [...document.querySelectorAll('.featured-flight')].find((c) => !c.classList.contains('demoting'));
			if (hero) { const r = hero.getBoundingClientRect(); samples.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width }); }
			if (++n < 52) requestAnimationFrame(tick);
			else res({ samples, sv: globalThis.__cameraMove?.screenVector ?? null });
		};
		requestAnimationFrame(tick);
	}));
	await page.waitForTimeout(700); // fully settle
	const rest = await page.evaluate(() => {
		const h = document.querySelector('.featured-flight');
		if (!h) return null;
		const r = h.getBoundingClientRect();
		return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width };
	});
	const s = data.samples;
	if (s.length < 8 || !data.sv || !rest) { fails.push(`${label}: too few samples / no camera vector / no rest`); return null; }
	// Measure the overshoot along the card's OWN travel axis (origin corner → rest), not the center-
	// based camera screenVector — for a small chip → big card those directions diverge, and the settle
	// carries along the card's translate. Origin = the sampled frame farthest from rest.
	let originS = s[0], maxD = 0;
	for (const p of s) { const d = Math.hypot(p.left - rest.left, p.top - rest.top); if (d > maxD) { maxD = d; originS = p; } }
	const tux = (rest.left - originS.left) / maxD, tuy = (rest.top - originS.top) / maxD;
	const proj = (p) => (p.left - rest.left) * tux + (p.top - rest.top) * tuy;
	const overshoot = Math.max(...s.map(proj)); // top-left carry (translate)
	const endResidual = Math.abs(proj(s[s.length - 1]));
	// WHOLE-PATH: scale also overshoots → right/bottom edges push past final, width past rest width.
	const scaleOvershootPct = (Math.max(...s.map((p) => p.width)) / rest.width - 1) * 100;
	const rightExcursion = Math.max(...s.map((p) => p.right - rest.right));
	const bottomExcursion = Math.max(...s.map((p) => p.bottom - rest.bottom));
	const endWidthResidual = Math.abs(s[s.length - 1].width - rest.width);
	const dirDeg = (Math.atan2(data.sv.dy, data.sv.dx) * 180) / Math.PI;
	console.log(`  ${label}: dir=${dirDeg.toFixed(0)}° left-carry=${overshoot.toFixed(1)}px right=${rightExcursion.toFixed(1)}px bottom=${bottomExcursion.toFixed(1)}px scale=+${scaleOvershootPct.toFixed(2)}% endpoint(px/w)=${endResidual.toFixed(2)}/${endWidthResidual.toFixed(2)}`);
	// transform-origin top-left: the LEFT edge carries via the translate, the BOTTOM edge via the scale
	// growth (the right edge nets ~0 — leftward carry cancels the scale on that side). Both must carry
	// TOGETHER (whole-path, one curve) — a fixed edge would mean translate/scale desynced.
	ok(overshoot > 1.5, `${label}: left carry ${overshoot.toFixed(1)}px too small`);
	ok(overshoot < 7, `${label}: left carry ${overshoot.toFixed(1)}px too large`);
	ok(bottomExcursion > 0.8, `${label}: bottom edge did not carry past (${bottomExcursion.toFixed(1)}px) — scale channel not overshooting (desync)`);
	ok(scaleOvershootPct > 0.05 && scaleOvershootPct < 1.5, `${label}: scale overshoot ${scaleOvershootPct.toFixed(2)}% out of the safe (no-shimmer) band (4–5px dial, ~0.9% ≈ 0.2px on a 24px glyph)`);
	void rightExcursion;
	ok(endResidual < 1.2 && endWidthResidual < 1.5, `${label}: endpoint not frozen (pos ${endResidual.toFixed(2)}px / width ${endWidthResidual.toFixed(2)}px)`);
	// VELOCITY CONTINUITY: on the APPROACH to the overshoot peak the speed must decelerate MONOTONICALLY
	// into the turnaround (one unbroken motion — easeOutBack). The two-phase signature is the opposite:
	// the main easing decelerates to near-rest AT the destination, then the pulse RE-ACCELERATES the
	// card out — a speed dip-then-rise before the overshoot peak.
	const projs = s.map(proj);
	const peakPos = Math.max(...projs);
	const peakIdx = projs.indexOf(peakPos); // the overshoot turnaround frame
	const speeds = [];
	for (let i = 1; i <= peakIdx; i++) speeds.push(Math.abs(projs[i] - projs[i - 1]));
	const sMax = Math.max(...speeds, 0.001);
	const sMaxIdx = speeds.indexOf(sMax);
	let dipped = false;
	let jerk = false;
	for (let i = sMaxIdx + 1; i < speeds.length; i++) {
		if (!dipped && speeds[i] < 0.15 * sMax) dipped = true; // decelerated to near-rest
		else if (dipped && speeds[i] > 0.28 * sMax) { jerk = true; break; } // then re-accelerated (the jerk)
	}
	ok(!jerk, `${label}: velocity JERK — decelerated to near-rest then re-accelerated before the overshoot (two-phase)`);
	return { dirDeg, overshoot };
}

const s1 = await settleFor(spouseClick(0), 'spouse-1');
const s3 = await settleFor(spouseClick(2), 'spouse-3');
if (s1 && s3) {
	ok(Math.abs(s1.dirDeg - s3.dirDeg) > 2, `spouse-1 and spouse-3 overshoot along the SAME angle (${s1.dirDeg.toFixed(0)}° vs ${s3.dirDeg.toFixed(0)}°) — vector not driving direction`);
	console.log(`  angle difference: ${Math.abs(s1.dirDeg - s3.dirDeg).toFixed(0)}° (naturally different, from the vector)`);
}
// Layer 3: the RELATIVE promotion (parent click) now settles too — same ~5–6px overshoot along ITS OWN
// (vertical-ish) vector, endpoints frozen. A different direction from the spouse (lateral) swaps.
const rel = await settleFor(relativeClick('michael-hooker-1935', '.parents-slot a'), 'relative-parent');
if (rel && s1) {
	ok(Math.abs(rel.dirDeg - s1.dirDeg) > 2, `relative and spouse settle along the SAME angle (${rel.dirDeg.toFixed(0)}° vs ${s1.dirDeg.toFixed(0)}°) — vector not driving direction`);
}

await ctx.close();
await browser.close();
if (fails.length) { console.log('SETTLE PROBE: RED\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('SETTLE PROBE: GREEN — spouse AND relative promotions carry a ~4.5–5.4px settle along each flight vector, settle to the exact rect, angles differ.');
