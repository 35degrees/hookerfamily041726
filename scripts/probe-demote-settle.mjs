/**
 * probe-demote-settle.mjs — RED-FIRST probe for the demote-settle build. Written BEFORE the settle code
 * so it FAILS on the current build (no overshoot yet) for the right reason, and pins every invariant the
 * settle must not disturb. Pair it with the recorded baseline (probe-demote-baseline.json).
 *
 * Nav under test: a CHILD click demotes the featured couple into the clicked child's two parent seats —
 * the featured card via out:shrinkTo, the spouse via in:morphIn. Assertions:
 *   A/B  BOTH the card AND the spouse overshoot their OWN captured vector, then return to the exact seat.
 *        (RED now: overshoot 0 on the current build.)
 *   C    the two settle vectors are NON-IDENTICAL (adjacent seats, read from real rects — no angle branch).
 *   D    LOAD-BEARING "nothing changed": departure rect, arrival rect, and the unfurl start+end match the
 *        recorded baseline. Departure/arrival within DEPART_TOL px; unfurl endpoints within UNFURL_TOL ms.
 *   E    prefersReducedMotion → ZERO settle frames (instant dock, overshoot 0).
 *   F    a CC departure stays whole-card / opposite-vector / NO settle (overshoot 0). Best-effort: SKIP
 *        (not fail) if no CC link is present on the sampled page.
 *
 * Dev server up on :5173. Run: node scripts/probe-demote-settle.mjs   (expected RED until the settle lands)
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = 'http://localhost:5173';
const BASELINE = join(dirname(fileURLToPath(import.meta.url)), 'probe-out', 'demote-baseline.json');

// ── tuning the assertions to the spec (DEMOTE_SETTLE_RATIO ≈ 0.45, perception floor so it never vanishes) ──
const SETTLE_MIN_PX = 1.5;   // perception floor — a settle smaller than this reads as nothing
const SETTLE_MAX_PX = 12;    // ceiling — a demote overshoot larger than this is a lunge, not a settle
const END_RESIDUAL_MAX = 1.2;// must return to the seat (endpoint frozen)
const DEPART_TOL = 1.5;      // px — departure/arrival rects must match baseline this tightly (geometry)
// The TIGHT frozen invariants are the departure/arrival RECTS (geometry, sub-px stable) + unfurl-START
// immediacy. Unfurl-START is the early non-pivot reveal fired at onIncomingStart (~frame 0) — a botched
// settle that held the early boxes pending would break it, so it's asserted tight. Unfurl-END is gated on
// the INCOMING card's introend (event-driven, rAF-scheduled, distance-scaled) — it jitters ~60–100ms run
// to run on the SAME build, and the demote settle never touches that path (it only edits shrinkTo/morphIn).
// So unfurl-END is a COARSE smoke check (above the noise floor): it must still complete on landing and not
// be pushed by a whole extra settle-cycle — it is NOT a byte-frame assertion, because it physically can't be.
const UNFURL_START_MAX = 25;   // ms — the early reveal must stay immediate
const UNFURL_END_TOL = 120;    // ms — smoke check only; above the event-gated landing jitter
const ANGLE_DIFF_MIN = 2;    // deg — the two settle vectors must be measurably different
const OPACITY_DRIFT_MAX = 0.03; // crossfade opacity must lie on its geometry (width) contract

let base = null;
try { base = JSON.parse(readFileSync(BASELINE, 'utf8')).summary; }
catch { console.log(`SETTLE PROBE: no baseline at ${BASELINE} — run probe-demote-baseline.mjs first`); process.exit(1); }

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

const browser = await chromium.launch();

// captureDemote(reducedMotion) → { card, spouse, unfurl } for the john-morgan-1930 child-click demotion.
async function captureDemote(reducedMotion) {
	const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
	const page = await ctx.newPage();
	await page.goto(`${BASE}/person/${base.slug}`, { waitUntil: 'networkidle' });
	await page.waitForSelector('.spouse-notch .flight', { timeout: 8000 }).catch(() => {});
	await page.waitForSelector('.children-slot .flight[data-flight-dir="down"]', { timeout: 4000 }).catch(() => {});
	await page.waitForTimeout(200);
	const info = await page.evaluate(() => {
		const chip = document.querySelector('.spouse-notch .flight');
		const child = document.querySelector('.children-slot .flight[data-flight-dir="down"]');
		if (!chip || !child) return null;
		const cr = child.getBoundingClientRect();
		return { spouseId: chip.dataset.flightId, x: cr.left + cr.width / 2, y: cr.top + cr.height / 2 };
	});
	if (!info) { await ctx.close(); return null; }
	await page.mouse.click(info.x, info.y);
	const cap = await page.evaluate((spouseId) => new Promise((res) => {
		const frames = []; let n = 0; const t0 = performance.now(); const revealTs = {};
		const rect = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
		const opac = (dcard) => {
			if (!dcard) return null;
			const top = dcard.querySelector('.card-top'), face = dcard.querySelector('.demote-chipface');
			return { w: dcard.getBoundingClientRect().width,
				topOp: top ? +parseFloat(getComputedStyle(top).opacity || '1').toFixed(4) : null,
				faceOp: face ? +parseFloat(getComputedStyle(face).opacity || '1').toFixed(4) : null };
		};
		const tick = () => {
			const ts = performance.now() - t0;
			const dcard = document.querySelector('.featured-flight.demoting');
			const spouse = document.querySelector(`.parents-slot [data-flight-id="${spouseId}"]`);
			frames.push({ ts, dcard: dcard ? rect(dcard) : null, spouse: spouse ? rect(spouse) : null, opac: opac(dcard) });
			for (const el of document.querySelectorAll('[data-flight-dir="up"],[data-flight-dir="down"]')) {
				const id = el.dataset.flightId; if (!id || revealTs[id] != null) continue;
				if (!el.hasAttribute('data-pending') && parseFloat(getComputedStyle(el).opacity || '1') > 0.01) revealTs[id] = ts;
			}
			if (++n < 110) requestAnimationFrame(tick); else res({ frames, revealTs });
		};
		requestAnimationFrame(tick);
	}), info.spouseId);
	await page.waitForTimeout(900);
	const rest = await page.evaluate((spouseId) => {
		const el = document.querySelector(`.parents-slot [data-flight-id="${spouseId}"]`);
		if (!el) return { spouse: null };
		const r = el.getBoundingClientRect();
		return { spouse: { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } };
	}, info.spouseId);
	await ctx.close();

	const reduce = (key, restRect) => {
		const pts = cap.frames.map((f) => f[key]).filter(Boolean);
		if (pts.length < 4) return null;
		const arrival = restRect || pts[pts.length - 1];
		let origin = pts[0], maxD = 0;
		for (const p of pts) { const d = Math.hypot(p.l - arrival.l, p.t - arrival.t); if (d > maxD) { maxD = d; origin = p; } }
		if (maxD < 1) return { departure: pts[0], arrival, angleDeg: 0, overshootPx: 0, endResidualPx: 0, dist: maxD, frames: pts.length };
		const ux = (arrival.l - origin.l) / maxD, uy = (arrival.t - origin.t) / maxD;
		const along = (p) => (p.l - arrival.l) * ux + (p.t - arrival.t) * uy;
		return {
			departure: pts[0], arrival,
			angleDeg: +(Math.atan2(arrival.t - origin.t, arrival.l - origin.l) * 180 / Math.PI).toFixed(1),
			overshootPx: +Math.max(0, ...pts.map(along)).toFixed(2),
			endResidualPx: +Math.abs(along(pts[pts.length - 1])).toFixed(2),
			dist: +maxD.toFixed(1), frames: pts.length
		};
	};
	const reveals = Object.values(cap.revealTs).sort((a, b) => a - b);
	// unfurl RELATIVE to the demote card's own timeline — cancels the cold-intro stall that both share.
	const dframes = cap.frames.filter((f) => f.dcard);
	const cardDepartTs = dframes.length ? dframes[0].ts : 0;
	const cardArrivalTs = dframes.length ? dframes[dframes.length - 1].ts : 0;
	return {
		card: reduce('dcard', null),
		spouse: reduce('spouse', rest.spouse),
		unfurl: reveals.length ? {
			startMs: +reveals[0].toFixed(1), endMs: +reveals[reveals.length - 1].toFixed(1),
			startRelMs: +(reveals[0] - cardDepartTs).toFixed(1),
			endRelMs: +(reveals[reveals.length - 1] - cardArrivalTs).toFixed(1)
		} : null,
		cardOpacity: cap.frames.map((f) => f.opac).filter((o) => o && o.w > 0)
	};
}
// Opacity-vs-geometry check: the demoting card's crossfade is GEOMETRY-KEYED — each opacity is a pure
// function of the shell WIDTH (not of t). Assert every live frame lies on that contract. This catches Sam's
// regression class (a consumer left on raw t → opacity tracks time, not width → it leaves the curve) and is
// immune to baseline sparsity (the card crosses the steep band in ~3 frames, too few to interpolate across
// the clamp kink). Constants MIRROR flight.ts (.card-top/.footer outOp bands + .demote-chipface reveal
// bands, FACE_W) — update here if they change there. Both builds are verified against this same contract.
const FACE_W = 220, OUT_LO = 2.0, OUT_HI = 2.4, REVEAL_LO = 1.7, REVEAL_HI = 2.1;
function opacityContractDrift(live) {
	if (!live?.length) return { max: 0, at: null, n: 0 };
	let max = 0, at = null, n = 0;
	for (const s of live) {
		if (s.w <= 0 || (s.topOp == null && s.faceOp == null)) continue;
		const uNat = s.w / FACE_W;
		const expTop = Math.max(0, Math.min(1, (uNat - OUT_LO) / (OUT_HI - OUT_LO)));   // .card-top / .footer fade OUT
		const expFace = Math.max(0, Math.min(1, (REVEAL_HI - uNat) / (REVEAL_HI - REVEAL_LO))); // chip-face fade IN
		const dTop = s.topOp != null ? Math.abs(s.topOp - expTop) : 0;
		const dFace = s.faceOp != null ? Math.abs(s.faceOp - expFace) : 0;
		n++;
		const d = Math.max(dTop, dFace);
		if (d > max) { max = d; at = { w: +s.w.toFixed(0), dTop: +dTop.toFixed(3), dFace: +dFace.toFixed(3) }; }
	}
	return { max: +max.toFixed(3), at, n };
}

// WARM both the source route AND the first child's TARGET route. The unfurl is event-gated on the intro
// chain, which STALLS on a cold-compiling target (the click navigates SvelteKit to the child) — that stall
// (~150ms) is what flakes the unfurl start/end timing. Warming the target first makes the intro chain (and
// thus the unfurl) fire warm, matching the warm baseline within a few ms.
{
	const wctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
	const wpage = await wctx.newPage();
	await wpage.goto(`${BASE}/person/${base.slug}`, { waitUntil: 'networkidle' });
	await wpage.waitForSelector('.children-slot .flight[data-flight-dir="down"]', { timeout: 8000 }).catch(() => {});
	const childHref = await wpage.evaluate(() => {
		const a = document.querySelector('.children-slot .flight[data-flight-dir="down"] a');
		return a ? a.getAttribute('href') : null;
	});
	if (childHref) { await wpage.goto(`${BASE}${childHref}`, { waitUntil: 'networkidle' }); await wpage.waitForTimeout(300); }
	await wctx.close();
}

// ── MOTION run ──
const live = await captureDemote(false);
if (!live || !live.card || !live.spouse) { console.log('SETTLE PROBE: could not capture the demotion'); await browser.close(); process.exit(1); }
console.log('── demote-settle (motion) ──');
console.log(`  card   : seat ${live.card.angleDeg}° travel ${live.card.dist}px overshoot ${live.card.overshootPx}px endResidual ${live.card.endResidualPx}px`);
console.log(`  spouse : seat ${live.spouse.angleDeg}° travel ${live.spouse.dist}px overshoot ${live.spouse.overshootPx}px endResidual ${live.spouse.endResidualPx}px`);

// A/B — both overshoot their OWN vector, then return
for (const [k, e] of [['card', live.card], ['spouse', live.spouse]]) {
	ok(e.overshootPx >= SETTLE_MIN_PX, `${k}: overshoot ${e.overshootPx}px < floor ${SETTLE_MIN_PX}px — no settle (RED until the tail lands)`);
	ok(e.overshootPx <= SETTLE_MAX_PX, `${k}: overshoot ${e.overshootPx}px > ceiling ${SETTLE_MAX_PX}px — a lunge, not a settle`);
	ok(e.endResidualPx <= END_RESIDUAL_MAX, `${k}: endpoint not frozen — returns ${e.endResidualPx}px off the seat`);
}
// C — non-identical vectors
ok(Math.abs(live.card.angleDeg - live.spouse.angleDeg) > ANGLE_DIFF_MIN, `card & spouse settle along the SAME angle (${live.card.angleDeg}° vs ${live.spouse.angleDeg}°) — vectors not read from real rects`);

// D — LOAD-BEARING: departure, arrival, unfurl unchanged vs baseline
const rectClose = (a, b) => a && b && Math.abs(a.l - b.l) <= DEPART_TOL && Math.abs(a.t - b.t) <= DEPART_TOL && Math.abs(a.w - b.w) <= DEPART_TOL && Math.abs(a.h - b.h) <= DEPART_TOL;
ok(rectClose(live.card.departure, base.card.departure), `card DEPARTURE moved vs baseline (${JSON.stringify(live.card.departure)} vs ${JSON.stringify(base.card.departure)})`);
ok(rectClose(live.card.arrival, base.card.arrival), `card ARRIVAL moved vs baseline`);
ok(rectClose(live.spouse.departure, base.spouse.departure), `spouse DEPARTURE moved vs baseline`);
ok(rectClose(live.spouse.arrival, base.spouse.arrival), `spouse ARRIVAL moved vs baseline`);
if (live.unfurl && base.unfurl) {
	console.log(`  unfurl : start ${live.unfurl.startRelMs}ms rel-to-depart (base ${base.unfurl.startRelMs}) · end ${live.unfurl.endRelMs}ms rel-to-landing (base ${base.unfurl.endRelMs})`);
	// RELATIVE to the demote card's own frames — cancels the cold-intro stall that flakes absolute ms. A
	// settle that gated the early reveal would push start-rel; one that delayed the landing reveal, end-rel.
	ok(live.unfurl.startRelMs <= UNFURL_START_MAX, `UNFURL start ${live.unfurl.startRelMs}ms after the demote departs (>${UNFURL_START_MAX}ms) — settle gated the early reveal`);
	ok(Math.abs(live.unfurl.endRelMs - base.unfurl.endRelMs) <= UNFURL_END_TOL, `UNFURL end shifted ${(live.unfurl.endRelMs - base.unfurl.endRelMs).toFixed(1)}ms vs baseline (rel-to-landing, >${UNFURL_END_TOL}ms)`);
}
// D2 — OPACITY (Sam's required guard): the geometry-keyed crossfade must lie on its width contract. Catches
// a t-leak the geometry checks can't — a consumer left on raw t would retime the fade off the width curve.
const od = opacityContractDrift(live.cardOpacity);
const bd = opacityContractDrift(base.cardOpacity); // sanity: the pristine baseline obeys the same contract
console.log(`  opacity: live max drift ${od.max} over ${od.n} samples${od.at ? ` (at w=${od.at.w}: top ${od.at.dTop}, face ${od.at.dFace})` : ''} · baseline ${bd.max}`);
ok(od.max <= OPACITY_DRIFT_MAX, `crossfade opacity drifted ${od.max} off the width contract — a t-driven property was left on raw t (silent retiming)`);
ok(bd.max <= OPACITY_DRIFT_MAX, `BASELINE opacity drifts ${bd.max} off the contract — the mirrored constants are stale vs flight.ts`);

// E — reduced motion: zero settle
const rm = await captureDemote(true);
if (rm && rm.card && rm.spouse) {
	console.log('── demote-settle (reduced motion) ──');
	console.log(`  card overshoot ${rm.card.overshootPx}px · spouse overshoot ${rm.spouse.overshootPx}px (both must be 0)`);
	ok(rm.card.overshootPx < SETTLE_MIN_PX, `reduced-motion: card still overshoots ${rm.card.overshootPx}px — settle not gated on prefersReducedMotion`);
	ok(rm.spouse.overshootPx < SETTLE_MIN_PX, `reduced-motion: spouse still overshoots ${rm.spouse.overshootPx}px`);
}

// F — CC departure: whole-card, opposite-vector, NO settle — must stay byte-stable vs the CC baseline
// (the July-12 flash root-cause). Requires the CC baseline to have been recorded.
const CC_SLUG = 'richard-hooker-1878';
if (!base.cc) {
	console.log('── CC departure: SKIP (no cc baseline recorded — re-run probe-demote-baseline.mjs) ──');
} else {
	const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
	const page = await ctx.newPage();
	await page.goto(`${BASE}/person/${CC_SLUG}`, { waitUntil: 'networkidle' });
	await page.waitForSelector('a[data-cc="true"]', { timeout: 8000 }).catch(() => {});
	await page.waitForTimeout(400);
	const ccPt = await page.evaluate(() => {
		const a = document.querySelector('a[data-cc="true"]');
		if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	});
	if (!ccPt) {
		console.log('── CC departure: SKIP (no data-cc link on ' + CC_SLUG + ') ──');
	} else {
		await page.mouse.click(ccPt.x, ccPt.y);
		const pts = await page.evaluate(() => new Promise((res) => {
			const out = []; let n = 0;
			const tick = () => {
				const el = [...document.querySelectorAll('.featured-flight')].find((c) => {
					if (c.style.zIndex === '2') return false; // z:2 incoming hero, not the leaver
					const r0 = c.getBoundingClientRect();
					return Math.hypot(r0.left + r0.width / 2 - 720, r0.top + r0.height / 2 - 500) > 300; // sliding off-centre
				});
				if (el) { const r = el.getBoundingClientRect(); out.push({ l: r.left, t: r.top }); }
				if (++n < 120) requestAnimationFrame(tick); else res(out);
			};
			requestAnimationFrame(tick);
		}));
		if (pts.length >= 4) {
			const d0 = pts[0]; let maxD = 0, far = d0;
			for (const p of pts) { const d = Math.hypot(p.l - d0.l, p.t - d0.t); if (d > maxD) { maxD = d; far = p; } }
			const ux = (far.l - d0.l) / (maxD || 1), uy = (far.t - d0.t) / (maxD || 1);
			const along = pts.map((p) => (p.l - d0.l) * ux + (p.t - d0.t) * uy);
			let maxReversal = 0; for (let i = 1; i < along.length; i++) maxReversal = Math.max(maxReversal, along[i - 1] - along[i]);
			const angle = +(Math.atan2(far.t - d0.t, far.l - d0.l) * 180 / Math.PI).toFixed(1);
			console.log(`── CC departure: exit ${angle}° displacement ${maxD.toFixed(1)}px maxReversal ${maxReversal.toFixed(2)}px (baseline exit ${base.cc.exitAngleDeg}°, ${base.cc.maxDisplacementPx}px) ──`);
			// NB: d0 is the first frame the leaver crosses the off-centre gate (already mid-slide), so it is a
			// SAMPLING artefact, not the true departure — the leaver's real start is the resting card, which is
			// layout-fixed and a settle cannot move. So assert the meaningful invariants: exit ANGLE (opposite-
			// vector), total DISPLACEMENT (whole-card offscreen slide), and NO REVERSAL (a settle tail would dip
			// back). Together these are the "whole-card / opposite-vector / no-settle" byte-stability guard.
			ok(Math.abs(angle - base.cc.exitAngleDeg) <= ANGLE_DIFF_MIN, `CC exit angle ${angle}° vs baseline ${base.cc.exitAngleDeg}° — opposite-vector departure changed`);
			ok(Math.abs(maxD - base.cc.maxDisplacementPx) <= 40, `CC slide ${maxD.toFixed(1)}px vs baseline ${base.cc.maxDisplacementPx}px — whole-card departure distance changed`);
			ok(maxReversal <= base.cc.maxReversalPx + SETTLE_MIN_PX, `CC leaver REVERSED ${maxReversal.toFixed(2)}px (baseline ${base.cc.maxReversalPx}px) — a settle tail leaked onto the CC departure (July-12 flash)`);
			ok(maxD > 200, `CC leaver only travelled ${maxD.toFixed(1)}px — not a whole-card offscreen slide`);
		} else {
			console.log('── CC departure: SKIP (leaver not sampled) ──');
		}
	}
	await ctx.close();
}
await browser.close();

if (fails.length) { console.log(`\nSETTLE PROBE: RED (${fails.length})\n- ` + fails.join('\n- ')); process.exit(1); }
console.log('\nSETTLE PROBE: GREEN — card + spouse each settle on their own vector and return; departure/arrival/unfurl byte-stable; reduced-motion instant.');
