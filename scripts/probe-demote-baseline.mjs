/**
 * probe-demote-baseline.mjs — BASELINE RECORDER for the demote-settle build (read-only; a recording,
 * not a change). Captured on the CURRENT (pre-settle) build so the load-bearing "nothing changed"
 * assertion has a reference: after the settle lands, this same capture must reproduce the DEPARTURE
 * frame, the ARRIVAL frame, and the UNFURL start+end frames BYTE-IDENTICAL — only the middle of each
 * demoting element's path may gain the overshoot tail.
 *
 * The nav under test is a CHILD click: the featured couple demotes into the clicked child's two parent
 * seats — the featured card via out:shrinkTo (→ one parent seat), the spouse via in:morphIn (→ the
 * adjacent parent seat). Two demoting elements, each on its OWN captured {from,to} vector (adjacent
 * seats → near-parallel, a few degrees apart — recorded here, asserted non-identical later).
 *
 * Writes scripts/probe-out/demote-baseline.json (raw frames + summary). Prints the summary. It does NOT
 * pass/fail — it RECORDS. Dev server up on :5173. Run: node scripts/probe-demote-baseline.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = 'http://localhost:5173';
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'probe-out', 'demote-baseline.json');
const CANDIDATES = ['john-morgan-1930', 'nancy-morse-1915', 'lea-hooker-1946', 'michael-hooker-1935', 'thomas-hooker-1882'];
const CC_SLUG = 'richard-hooker-1878'; // a CC-bearing page — its leaving card must stay whole-card / opposite-vector / NO settle

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

// ── pick the first person with BOTH a spouse chip and a child link (the couple-demotes-to-parents nav) ──
let slug = null, spouseId = null, childPt = null;
for (const s of CANDIDATES) {
	await page.goto(`${BASE}/person/${s}`, { waitUntil: 'networkidle' });
	// wait on the actual nodes, not a fixed delay — a COLD dev-server route compile can outlast networkidle
	await page.waitForSelector('.spouse-notch .flight', { timeout: 8000 }).catch(() => {});
	await page.waitForSelector('.children-slot .flight[data-flight-dir="down"]', { timeout: 4000 }).catch(() => {});
	await page.waitForTimeout(200);
	const info = await page.evaluate(() => {
		const chip = document.querySelector('.spouse-notch .flight');
		// data-flight-dir/id live on the WRAPPER div; the <a> (PersonBox) is inside it. Click the wrapper centre.
		const child = document.querySelector('.children-slot .flight[data-flight-dir="down"]');
		if (!chip || !child) return null;
		const cr = child.getBoundingClientRect();
		return { spouseId: chip.dataset.flightId, x: cr.left + cr.width / 2, y: cr.top + cr.height / 2 };
	});
	if (info) { slug = s; spouseId = info.spouseId; childPt = { x: info.x, y: info.y }; break; }
}
if (!slug) { console.log('BASELINE: no candidate had both a spouse chip and a child link'); await browser.close(); process.exit(1); }
console.log(`baseline nav: ${slug} — child click, spouse chip id ${spouseId}`);

// WARM both the source AND the first child's TARGET route before measuring — a COLD compile stalls the
// intro chain and skews the landing-gated unfurl-end/start by ~100–150ms (warm runs cluster within a few
// ms). Warm the target, then re-navigate the source and read a FRESH child click point.
const childHref = await page.evaluate(() => {
	const a = document.querySelector('.children-slot .flight[data-flight-dir="down"] a');
	return a ? a.getAttribute('href') : null;
});
if (childHref) { await page.goto(`${BASE}${childHref}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(300); }
await page.goto(`${BASE}/person/${slug}`, { waitUntil: 'networkidle' });
await page.waitForSelector('.children-slot .flight[data-flight-dir="down"]', { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(500);
childPt = await page.evaluate(() => {
	const child = document.querySelector('.children-slot .flight[data-flight-dir="down"]');
	const cr = child.getBoundingClientRect();
	return { x: cr.left + cr.width / 2, y: cr.top + cr.height / 2 };
});

// ── click the child; rAF-sample both demoting elements + the unfurl reveal ──
await page.mouse.click(childPt.x, childPt.y);
const cap = await page.evaluate((spouseId) => new Promise((res) => {
	const frames = []; let n = 0; const t0 = performance.now();
	// unfurl: first ts each held destination box (parents dir=up / children dir=down) loses data-pending
	// and paints (opacity != 0). Recorded relative to click — the reveal is driven off the card's landing.
	const revealTs = {};
	const rect = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
	// The demoting card's GEOMETRY-KEYED opacity crossfade (.card-top fades out, .demote-chipface fades in) —
	// a pure function of the shell's width. Sampled as (width → opacity) so the curve is invariant to easing/
	// settle (which only reparameterise TIME): a t-leak that decoupled opacity from geometry would show here.
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
			const pending = el.hasAttribute('data-pending');
			const op = parseFloat(getComputedStyle(el).opacity || '1');
			if (!pending && op > 0.01) revealTs[id] = ts; // first painted frame = unfurl start for this box
		}
		if (++n < 110) requestAnimationFrame(tick); else res({ frames, revealTs });
	};
	requestAnimationFrame(tick);
}), spouseId);

await page.waitForTimeout(900); // fully settle
const rest = await page.evaluate((spouseId) => {
	const rect = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
	// after settle the demoting card is gone; its seat is the parent box it docked into (unknown id here),
	// so rest for the card = its LAST sampled frame instead. Spouse seat is a real box we can re-read.
	const spouse = document.querySelector(`.parents-slot [data-flight-id="${spouseId}"]`);
	return { spouse: spouse ? rect(spouse) : null };
}, spouseId);

await ctx.close(); // close the demote session before the CC capture (fresh context, no cross-talk)

// ── CC leaver baseline: a data-cc departure slides the whole card OFFSCREEN, opposite the arrival, and
// must NEVER settle (it has no seat to overshoot). Record its departure rect, exit angle, max displacement
// and monotonicity so the probe can assert the CC path stays byte-stable (the July-12 flash guard). ──
const ccCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const ccPage = await ccCtx.newPage();
await ccPage.goto(`${BASE}/person/${CC_SLUG}`, { waitUntil: 'networkidle' });
await ccPage.waitForSelector('a[data-cc="true"]', { timeout: 8000 }).catch(() => {});
await ccPage.waitForTimeout(500);
let ccBaseline = null;
const ccPt = await ccPage.evaluate(() => {
	const a = document.querySelector('a[data-cc="true"]');
	if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
if (ccPt) {
	await ccPage.mouse.click(ccPt.x, ccPt.y);
	const pts = await ccPage.evaluate(() => new Promise((res) => {
		const out = []; let n = 0;
		const tick = () => {
			// the CC leaver: a .featured-flight riding z-index:1 (no .demoting class — it has no destination box)
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
		const d0 = pts[0];
		let maxD = 0, far = d0;
		for (const p of pts) { const d = Math.hypot(p.l - d0.l, p.t - d0.t); if (d > maxD) { maxD = d; far = p; } }
		const ux = (far.l - d0.l) / (maxD || 1), uy = (far.t - d0.t) / (maxD || 1);
		const along = pts.map((p) => (p.l - d0.l) * ux + (p.t - d0.t) * uy);
		// monotone away = the along-axis displacement never REVERSES more than 3px (a settle tail would dip back)
		let maxReversal = 0; for (let i = 1; i < along.length; i++) maxReversal = Math.max(maxReversal, along[i - 1] - along[i]);
		ccBaseline = {
			departure: d0,
			exitAngleDeg: +(Math.atan2(far.t - d0.t, far.l - d0.l) * 180 / Math.PI).toFixed(1),
			maxDisplacementPx: +maxD.toFixed(1),
			maxReversalPx: +maxReversal.toFixed(2),
			frames: pts.length
		};
	}
}
await ccCtx.close();
await browser.close();

// ── reduce: departure / arrival / peak-overshoot-along-own-axis / unfurl window / seat angles ──
const proj = (frames, key, restRect) => {
	const pts = frames.map((f) => f[key]).filter(Boolean);
	if (pts.length < 4) return null;
	const arrival = restRect || pts[pts.length - 1];
	// own axis = origin (frame farthest from arrival) → arrival, using the top-left corner (the translate)
	let origin = pts[0], maxD = 0;
	for (const p of pts) { const d = Math.hypot(p.l - arrival.l, p.t - arrival.t); if (d > maxD) { maxD = d; origin = p; } }
	if (maxD < 1) return { departure: pts[0], arrival, angleDeg: 0, overshootPx: 0, endResidualPx: 0, dist: maxD };
	const ux = (arrival.l - origin.l) / maxD, uy = (arrival.t - origin.t) / maxD; // origin → arrival (travel dir)
	const along = (p) => (p.l - arrival.l) * ux + (p.t - arrival.t) * uy; // <0 = short of the seat, >0 = PAST it
	const overshootPx = Math.max(0, ...pts.map(along)); // max excursion beyond the seat in travel dir (0 on baseline)
	const endResidualPx = Math.abs(along(pts[pts.length - 1]));
	return {
		departure: pts[0], arrival,
		angleDeg: +(Math.atan2(arrival.t - origin.t, arrival.l - origin.l) * 180 / Math.PI).toFixed(1),
		overshootPx: +overshootPx.toFixed(2), endResidualPx: +endResidualPx.toFixed(2), dist: +maxD.toFixed(1)
	};
};

const card = proj(cap.frames, 'dcard', null);
const spouse = proj(cap.frames, 'spouse', rest.spouse);
// The demote card's OWN departure/arrival timeline — the reference the unfurl is measured against. Absolute
// ms-from-click flakes ±150ms on a cold intro (the whole chain stalls on target compile); the demote card
// stalls WITH it, so unfurl-RELATIVE-to-the-card cancels the stall and is stable. (Same t0 for both.)
const dframes = cap.frames.filter((f) => f.dcard);
const cardDepartTs = dframes.length ? dframes[0].ts : 0;
const cardArrivalTs = dframes.length ? dframes[dframes.length - 1].ts : 0;
const reveals = Object.entries(cap.revealTs).sort((a, b) => a[1] - b[1]);
const unfurl = reveals.length ? {
	startMs: +reveals[0][1].toFixed(1), endMs: +reveals[reveals.length - 1][1].toFixed(1),
	startRelMs: +(reveals[0][1] - cardDepartTs).toFixed(1),   // vs the demote's first frame (early reveal ≈ 0)
	endRelMs: +(reveals[reveals.length - 1][1] - cardArrivalTs).toFixed(1), // vs the demote's landing
	boxes: reveals.map(([id, t]) => ({ id, ms: +t.toFixed(1) }))
} : null;

const summary = {
	slug, spouseId,
	card: card && { departure: card.departure, arrival: card.arrival, seatAngleDeg: card.angleDeg, travelPx: card.dist, overshootPx: card.overshootPx, endResidualPx: card.endResidualPx },
	spouse: spouse && { departure: spouse.departure, arrival: spouse.arrival, seatAngleDeg: spouse.angleDeg, travelPx: spouse.dist, overshootPx: spouse.overshootPx, endResidualPx: spouse.endResidualPx },
	seatAngleDiffDeg: card && spouse ? +Math.abs(card.angleDeg - spouse.angleDeg).toFixed(1) : null,
	unfurl,
	cc: ccBaseline,
	// (width → opacity) samples for the demoting card's crossfade — the geometry-keyed contract the probe
	// re-checks so a t-leak (opacity decoupled from geometry) is caught, not just position.
	cardOpacity: cap.frames.map((f) => f.opac).filter((o) => o && o.w > 0)
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ summary, frames: cap.frames, revealTs: cap.revealTs }, null, 2));

console.log('\n── DEMOTE BASELINE (current build, pre-settle) ──');
if (card) console.log(`  featured card : seat ${card.angleDeg}°  travel ${card.dist}px  overshoot ${card.overshootPx}px  endResidual ${card.endResidualPx}px`);
if (spouse) console.log(`  spouse (morphIn): seat ${spouse.angleDeg}°  travel ${spouse.dist}px  overshoot ${spouse.overshootPx}px  endResidual ${spouse.endResidualPx}px`);
if (card && spouse) console.log(`  two seats differ by ${summary.seatAngleDiffDeg}° (adjacent parent seats — non-identical vectors)`);
if (unfurl) console.log(`  unfurl        : starts ${unfurl.startMs}ms after click, last box ${unfurl.endMs}ms  (${unfurl.boxes.length} boxes)`);
if (ccBaseline) console.log(`  cc leaver     : exit ${ccBaseline.exitAngleDeg}°  displacement ${ccBaseline.maxDisplacementPx}px  maxReversal ${ccBaseline.maxReversalPx}px (whole-card, no settle)`);
else console.log('  cc leaver     : NOT captured (no data-cc link on ' + CC_SLUG + ')');
console.log(`  overshoot is ~0 on this baseline (no settle yet). Wrote ${OUT}`);
