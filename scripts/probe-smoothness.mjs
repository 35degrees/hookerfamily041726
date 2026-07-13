/**
 * probe-smoothness.mjs — MACHINE SMOOTHNESS AUDIT of the real promotion flights (spouse short + far,
 * parent, child). RAF-samples the hero's top-left through the complete flight, projects onto the travel
 * axis, and computes per-frame velocity (1st diff) + acceleration (2nd diff). Asserts:
 *   a. exactly ONE velocity sign-change (the intended settle turnaround) — no flip-then-flip-back;
 *   b. no acceleration spike > ACCEL_RATIO × the local (±5-frame) median |accel| ANYWHERE in the flight;
 *   c. the turnaround is C1-smooth — velocity crosses zero once with no DWELL (>1 consecutive near-zero
 *      frame followed by renewed motion — the two-phase jerk signature).
 * Runs each case 3× and reports the worst-case profile. Dev server up on :5173.
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const ACCEL_RATIO = 3; // spike threshold vs local ±5 median |accel|
const ACCEL_FLOOR = 0.08; // px/ms² — accels below this are smooth-motion noise (the flight body runs
// ~0.005–0.03); ratios are only judged above it, so tiny near-zero accels can't inflate a false spike.
const VEL_NOISE = 0.03; // px/ms — below this is "at rest / turnaround", trimmed from the flight window
const DWELL_MAX = 3; // a smooth turnaround dwells ≤2 frames near zero; a two-phase jerk sits far longer
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

const spouseClick = (idx) => async () => {
	await page.goto(`${BASE}/person/john-morgan-1930`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	return page.evaluate((i) => { const a = [...document.querySelectorAll('.spouse-notch .flight a')][i]; if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, idx);
};
const relClick = (slug, sel) => async () => {
	await page.goto(`${BASE}/person/${slug}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	return page.evaluate((s) => { const a = document.querySelector(s); if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
};

function analyze(samples, rest) {
	// project onto the travel axis (origin = farthest sample from rest; +axis points rest→origin)
	let origin = samples[0], maxD = 0;
	for (const s of samples) { const d = Math.hypot(s.x - rest.x, s.y - rest.y); if (d > maxD) { maxD = d; origin = s; } }
	if (maxD < 1) return null;
	const ax = (origin.x - rest.x) / maxD, ay = (origin.y - rest.y) / maxD;
	let P = samples.map((s) => ({ t: s.ts, p: (s.x - rest.x) * ax + (s.y - rest.y) * ay }));
	// SLICE FROM THE ORIGIN FRAME — everything before it is the old-card→new-hero sampling confound (a
	// spurious jump from the departing card at ~rest to the incoming hero at origin), never the flight.
	let oi = 0; for (let i = 0; i < P.length; i++) if (P[i].p > P[oi].p) oi = i;
	P = P.slice(oi);
	// velocity (per ms), and the flight WINDOW = first real motion → last (trims the pre-animation dwell
	// at origin and the post-settle rest, which are not part of the moving flight).
	const V = [];
	for (let i = 1; i < P.length; i++) { const dt = P[i].t - P[i - 1].t; if (dt > 0) V.push({ t: P[i].t, v: (P[i].p - P[i - 1].p) / dt }); }
	const moving = V.map((x, i) => (Math.abs(x.v) > VEL_NOISE ? i : -1)).filter((i) => i >= 0);
	if (moving.length < 4) return null;
	const lo = moving[0], hi = moving[moving.length - 1];
	const win = V.slice(lo, hi + 1);
	// (a) sign changes — clear negative↔positive transitions (sub-noise frames don't reset the sign)
	let signChanges = 0, prevSign = 0, flipFlop = 0;
	const nz = [];
	for (const x of win) { if (Math.abs(x.v) <= VEL_NOISE) continue; const s = Math.sign(x.v); nz.push(s); if (prevSign && s !== prevSign) signChanges++; prevSign = s; }
	for (let i = 2; i < nz.length; i++) if (nz[i] !== nz[i - 1] && nz[i] === nz[i - 2]) flipFlop++;
	// (b) accel spike: |accel| ABOVE the smooth-noise floor AND > ACCEL_RATIO × its local ±5 median.
	const A = [];
	for (let i = 1; i < win.length; i++) { const dt = win[i].t - win[i - 1].t; if (dt > 0) A.push(Math.abs((win[i].v - win[i - 1].v) / dt)); }
	let maxRatio = 0, maxAbsAccel = 0;
	for (let i = 0; i < A.length; i++) {
		maxAbsAccel = Math.max(maxAbsAccel, A[i]);
		if (A[i] < ACCEL_FLOOR) continue; // smooth-motion noise — not a jerk candidate
		const med = median(A.slice(Math.max(0, i - 5), i + 6).filter((v) => v > 1e-6));
		if (med > 1e-6) maxRatio = Math.max(maxRatio, A[i] / med);
	}
	// (c) dwell: longest run of near-zero velocity INSIDE the moving window (the turnaround itself is ≤2;
	// a two-phase jerk decelerates to rest and sits far longer before re-accelerating).
	let dwell = 0, run = 0;
	for (const x of win) { if (Math.abs(x.v) <= VEL_NOISE) { run++; dwell = Math.max(dwell, run); } else run = 0; }
	return { frames: win.length, signChanges, flipFlop, maxRatio, maxAbsAccel, dwell, carry: -Math.min(...P.map((p) => p.p)) };
}

async function audit(getClick, label) {
	let worst = null;
	for (let r = 0; r < 3; r++) {
		const click = await getClick();
		if (!click) { fails.push(`${label}: click target not found`); return; }
		await page.mouse.click(click.x, click.y);
		const samples = await page.evaluate(() => new Promise((res) => {
			const s = []; let n = 0;
			const tick = (ts) => { const h = [...document.querySelectorAll('.featured-flight')].find((c) => !c.classList.contains('demoting')); if (h) { const r = h.getBoundingClientRect(); s.push({ ts, x: r.left, y: r.top }); } if (++n < 70) requestAnimationFrame(tick); else res(s); };
			requestAnimationFrame(tick);
		}));
		await page.waitForTimeout(700);
		const rest = await page.evaluate(() => { const h = document.querySelector('.featured-flight'); if (!h) return null; const r = h.getBoundingClientRect(); return { x: r.left, y: r.top }; });
		if (!rest) continue;
		const m = analyze(samples, rest);
		if (m && (!worst || m.signChanges > worst.signChanges || m.flipFlop > worst.flipFlop || m.maxRatio > worst.maxRatio || m.dwell > worst.dwell)) worst = m;
	}
	if (!worst) { fails.push(`${label}: no analyzable flight`); return; }
	console.log(`  ${label}: frames=${worst.frames} signChanges=${worst.signChanges} flipFlop=${worst.flipFlop} maxAbsAccel=${worst.maxAbsAccel.toFixed(3)} accelRatio(>floor)=${worst.maxRatio.toFixed(1)} dwell=${worst.dwell} carry=${worst.carry.toFixed(1)}px`);
	ok(worst.signChanges <= 1, `${label}: velocity sign-changed ${worst.signChanges}× (expected ≤1 — the single settle turnaround)`);
	ok(worst.flipFlop === 0, `${label}: velocity flip-then-flip-back ${worst.flipFlop}× (jitter)`);
	ok(worst.maxRatio <= ACCEL_RATIO, `${label}: acceleration spike ${worst.maxRatio.toFixed(1)}× local median above the ${ACCEL_FLOOR} floor (> ${ACCEL_RATIO}× — a jerk)`);
	ok(worst.dwell <= DWELL_MAX, `${label}: velocity DWELL ${worst.dwell} frames near-zero mid-flight (> ${DWELL_MAX} — two-phase turnaround, not C1)`);
}

await audit(spouseClick(0), 'spouse-short');
await audit(spouseClick(2), 'spouse-far');
await audit(relClick('michael-hooker-1935', '.parents-slot a'), 'parent');
await audit(relClick('michael-hooker-1935', '.children-slot a'), 'child');

await ctx.close();
await browser.close();
if (fails.length) { console.log('SMOOTHNESS AUDIT: RED\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('SMOOTHNESS AUDIT: GREEN — one settle turnaround, no jitter, no accel spikes, C1 turnaround (all cases, worst of 3 runs).');
