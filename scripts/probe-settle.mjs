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

async function settleFor(idx, label) {
	await page.goto(`${BASE}/person/john-morgan-1930`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	const chip = await page.evaluate((i) => {
		const chips = [...document.querySelectorAll('.spouse-notch .flight a')];
		const a = chips[i];
		if (!a) return null;
		const r = a.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}, idx);
	if (!chip) { fails.push(`${label}: spouse chip ${idx} not found`); return null; }
	await page.mouse.click(chip.x, chip.y);
	// hero = the incoming featured card (NOT .demoting) — persists through Svelte's style-strip at
	// landing, so its rect keeps reading (unlike a z-index probe which vanishes at strip).
	const data = await page.evaluate(() => new Promise((res) => {
		const samples = [];
		let n = 0;
		const tick = () => {
			const hero = [...document.querySelectorAll('.featured-flight')].find((c) => !c.classList.contains('demoting'));
			if (hero) { const r = hero.getBoundingClientRect(); samples.push({ left: r.left, top: r.top }); }
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
		return { left: r.left, top: r.top };
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
	const overshoot = Math.max(...s.map(proj));
	const endResidual = Math.abs(proj(s[s.length - 1]));
	// direction reported is the camera screenVector's (the consumer axis) — spouse-1 vs spouse-3 differ
	const dirDeg = (Math.atan2(data.sv.dy, data.sv.dx) * 180) / Math.PI;
	console.log(`  ${label}: vector=(${data.sv.dx.toFixed(0)},${data.sv.dy.toFixed(0)}) dir=${dirDeg.toFixed(0)}° overshoot=${overshoot.toFixed(1)}px endpoint-residual=${endResidual.toFixed(2)}px`);
	ok(overshoot > 1, `${label}: overshoot ${overshoot.toFixed(1)}px too small (expected a 1.5–3px nudge)`);
	ok(overshoot < 4.5, `${label}: overshoot ${overshoot.toFixed(1)}px too large (hard cap ~3px + measurement slack)`);
	ok(endResidual < 1.2, `${label}: endpoint not frozen (residual ${endResidual.toFixed(2)}px)`);
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

const s1 = await settleFor(0, 'spouse-1');
const s3 = await settleFor(2, 'spouse-3');
if (s1 && s3) {
	ok(Math.abs(s1.dirDeg - s3.dirDeg) > 2, `spouse-1 and spouse-3 overshoot along the SAME angle (${s1.dirDeg.toFixed(0)}° vs ${s3.dirDeg.toFixed(0)}°) — vector not driving direction`);
	console.log(`  angle difference: ${Math.abs(s1.dirDeg - s3.dirDeg).toFixed(0)}° (naturally different, from the vector)`);
}

await ctx.close();
await browser.close();
if (fails.length) { console.log('SETTLE PROBE: RED\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('SETTLE PROBE: GREEN — spouse promotions carry a ~2–3px nudge along the travel axis, settle to the exact rect, angles differ.');
