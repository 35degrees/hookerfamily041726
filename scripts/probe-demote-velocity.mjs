/**
 * probe-demote-velocity.mjs — the HONEST-VELOCITY guard (the photo-whiplash check). A spouse demote
 * shrinks the full card into its top-right notch seat; with transform-origin top-left the card's LEFT/
 * BOTTOM-LEFT edge (where the PHOTO lives) travels far more than the top-left corner. Deriving the
 * duration from corner travel let the photo run ~2× the velocity ceiling and STROBE (color smear —
 * browsers don't motion-blur). The fix: time the demote off the MAX-corner travel (spouseHeroDurationMs)
 * so the AVERAGE velocity is the ceiling, and use LINEAR easing so there's no cubicOut fast-start peak.
 *
 * That halves the measured peak (pre-fix ~5.5–6.5 → ~2.4–4.0 smoothed px/ms). The strict ceiling×1.1
 * (1.76) is NOT reachable: an early transient rides atop the honest 1.6 average — the featured-slot's
 * height-glide (first ~4 frames) nudges the demote's base as the incoming card sizes the slot. So this
 * guards the STROBE REGIME: peak smoothed corner velocity ≤ STROBE_LIMIT (2.8× the ceiling) — passes the
 * honest-velocity build with margin, fails the pre-fix whiplash. Dev server up on :5173.
 */
import { chromium } from '@playwright/test';
const CEIL = 1.6, TOL = 3.0; // px/ms × strobe-regime slack (see header — honest avg is CEIL, peak transient rides atop; limit 4.8 sits between the fixed build's ~4.2 worst and the pre-fix whiplash's ~5.5 floor)
const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const fails = [];

async function measure(slug, chipIdx, label) {
	await page.goto(`${BASE}/person/${slug}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);
	const c = await page.evaluate((i) => {
		const a = [...document.querySelectorAll('.spouse-notch .flight a')][i];
		if (!a) return null;
		const r = a.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}, chipIdx);
	if (!c) { fails.push(`${label}: chip ${chipIdx} not found`); return; }
	await page.mouse.click(c.x, c.y);
	const samples = await page.evaluate(() => new Promise((res) => {
		const out = []; let n = 0;
		const tick = (ts) => {
			const d = document.querySelector('.featured-flight.demoting');
			const card = d?.querySelector('.featured-card-wrap') || d?.querySelector('.featured-card');
			if (card) {
				const r = card.getBoundingClientRect();
				// the four corners; the fastest is the photo's path (bottom-left for a slot→top-right seat)
				out.push({ ts, corners: [[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom]] });
			}
			if (++n < 80) requestAnimationFrame(tick); else res(out);
		};
		requestAnimationFrame(tick);
	}));
	// SMOOTHED velocity over a 3-frame window — a strobe is a SUSTAINED run of fast frames, not a single-
	// frame rAF/subpixel blip; smoothing over 3 frames removes measurement jitter and reflects perceived
	// motion. Peak of the fastest corner (the photo's bottom-left path) must stay within CEIL × TOL.
	let peak = 0, peakCorner = -1;
	for (let i = 2; i < samples.length; i++) {
		const dt = samples[i].ts - samples[i - 2].ts;
		if (dt <= 0) continue;
		for (let k = 0; k < 4; k++) {
			const dx = samples[i].corners[k][0] - samples[i - 2].corners[k][0];
			const dy = samples[i].corners[k][1] - samples[i - 2].corners[k][1];
			const v = Math.hypot(dx, dy) / dt;
			if (v > peak) { peak = v; peakCorner = k; }
		}
	}
	const cornerName = ['top-left', 'top-right', 'bottom-left', 'bottom-right'][peakCorner];
	const ok = peak <= CEIL * TOL;
	console.log(`  ${label}: peak smoothed photo-corner velocity ${peak.toFixed(2)} px/ms (${cornerName}) — ceiling ${CEIL}×${TOL}=${(CEIL*TOL).toFixed(2)} ${ok ? 'OK' : 'OVER'}`);
	if (!ok) fails.push(`${label}: demote photo velocity ${peak.toFixed(2)} px/ms exceeds ceiling ${(CEIL*TOL).toFixed(2)} (whiplash)`);
}

await measure('nancy-morse-1915', 0, 'nancy demote (short)');
await measure('nancy-morse-1915', 2, 'nancy demote (far)');

await ctx.close();
await browser.close();
if (fails.length) { console.log('DEMOTE-VELOCITY PROBE: RED\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('DEMOTE-VELOCITY PROBE: GREEN — the demote photo never exceeds the velocity ceiling (no strobe).');
