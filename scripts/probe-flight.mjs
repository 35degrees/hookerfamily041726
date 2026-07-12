/**
 * probe-flight.mjs — guards the FROZEN flight system across the carousel re-apply. Runs after
 * every layer (not just the carousel probe). Two scripted checks, both frame-sampled:
 *
 *   A. child-click: the incoming card's spouse chips must NOT appear until the card lands
 *      (introend). We sample the visible spouse-chip count while `.featured-flight.flat` is set
 *      (flying) and assert the INCOMING count never shows before the flat class drops.
 *   B. spouse-swap demotion: no element's rect may exceed the card's right edge + 2px at any
 *      sampled frame (catches the demoting card / a chip popping off-card — the "ghost").
 *
 * Dev server must be up on :5173.  node scripts/probe-flight.mjs
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();

// ORPHAN DETECTOR: the dev janitor warns when it removes a stranded position:fixed flight element
// (an interrupted-outro orphan). Capturing that warning converts "the stuck chip" into an assertable
// invariant — zero janitor warnings across the whole run.
const janitorWarns = [];
const sweepWarns = [];
page.on('console', (m) => {
	const t = m.text();
	if (t.includes('[flight janitor]')) janitorWarns.push(t);
	if (t.includes('[flight sweep]')) sweepWarns.push(t);
});

// clickable center of the first matching element (bypasses clipped-node interception)
const centerOf = (sel) =>
	page.evaluate((s) => {
		const el = document.querySelector(s);
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2, href: el.getAttribute('href') };
	}, sel);

// ── A. child-click: incoming spouse notch empty until landing ─────────────────────────────
// nancy-morse-1915 → child michael-hooker-1935 (4 spouses). Nancy has 3, so a visible count of 4
// is unambiguously the INCOMING card's chips.
await page.goto(`${BASE}/person/nancy-morse-1915`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const child = await centerOf('.children-slot a, [class*="children"] a');
await page.mouse.click(child.x, child.y);
const frames = [];
for (let i = 0; i < 18; i++) {
	frames.push(await page.evaluate(() => ({
		flat: !!document.querySelector('.featured-flight.flat'),
		vis: [...document.querySelectorAll('.spouse-notch .flight')].filter((e) => parseFloat(getComputedStyle(e).opacity) > 0.5).length
	})));
	await page.waitForTimeout(40);
}
// last flat frame = the landing boundary; any frame strictly before it must not show 4 (incoming).
const lastFlat = frames.reduce((acc, f, i) => (f.flat ? i : acc), -1);
const early = frames.slice(0, Math.max(0, lastFlat));
ok(!early.some((f) => f.vis >= 4), `child-click: incoming spouse chips appeared BEFORE landing (frames ${frames.map((f) => `${f.flat ? 'F' : '.'}${f.vis}`).join(' ')})`);
ok(frames[frames.length - 1].vis === 4, `child-click: incoming spouse chips never resolved after landing (got ${frames[frames.length - 1].vis})`);

// KNOWN, TOLERATED BASELINE BEHAVIOR — "Artifact A" (documented, NOT asserted): on a LEADING/middle
// spouse-chip click the growing hero flies from a left-position rect, so its right edge lands left of
// the demoting card and the demoting card's right edge is briefly EXPOSED (~228px on a 2-spouse card).
// A TRAILING click covers it fully (0px). Same family: aaron-burr-1808 (3 spouses) shows a leading-
// click flicker — a visible-chip exit exposed by the hero's coverage geometry, NO carousel involvement.
// Pre-existing flight-system behavior, newly noticed; Sam can live with it. Candidate fix (own micro-
// phase, needs approval): clip the morph layer to the featured-slot bounds — both morph endpoints live
// in-slot, so clipping loses nothing. Check B below deliberately filters to z-index ≥ 1 so it does NOT
// flag this covered-under-hero case.
//
// KNOWN, ACCEPTED BEHAVIOR — "Artifact C / cover-and-re-emerge" (documented, NOT asserted; Sam's call):
// onIncomingStart reveals every incoming relative box at full opacity immediately (to close the bare-
// screen gap) EXCEPT the pivot and lateral chips. So a sibling of the pivot in the same row (e.g. Rodman
// Hooker when demoting Nancy Morse up into michael-hooker-1935's parents row) is up at opacity 1 while
// the demoting card is still crossing its region: its name shows, the solid demoting card (z:1, rides
// ABOVE the rows by design) passes over and covers it, then it re-emerges. This is HONEST occlusion —
// a solid object passing a stationary one, consistent with the table world model — NOT a z-seam (the
// z-order is correct; the pivot itself is correctly held at opacity 0, so it never doubles). Accepted.
// Surgical option if ever revisited: a corridor-hold — hold ONLY the incoming boxes that fall in the
// demote's flight path until it passes (keeps the bare-screen gap closed everywhere else). Best bundled
// with Phase 3a's flyover-corridor work, which makes the travel vector a first-class captured value.

// ── B. spouse-swap demotion: nothing VISIBLE flies off the card's right edge ────────────────
// Reference is the STABLE .featured-slot (the card's bounding box — it never transforms; the cards
// transform inside it). Only flag genuinely-visible pixels: opacity > 0.5 AND stacked in front
// (z-index ≥ 1). The demoting card rides at z-index 0 UNDER the incoming hero and incoming chips
// hold at opacity 0 (markPending) — both are correctly-hidden off-card flights, not the regression.
await page.goto(`${BASE}/person/nancy-morse-1915`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const chip = await centerOf('.spouse-notch .flight a');
await page.mouse.click(chip.x, chip.y);
let worst = { over: -1e9, what: '' };
for (let i = 0; i < 18; i++) {
	const hit = await page.evaluate(() => {
		const slot = document.querySelector('.featured-slot')?.getBoundingClientRect();
		if (!slot) return null;
		let worst = { over: -1e9, what: '' };
		for (const e of document.querySelectorAll('.spouse-notch .flight, .featured-flight')) {
			const cs = getComputedStyle(e);
			if (parseFloat(cs.opacity) <= 0.5) continue; // hidden / fading-out
			const z = cs.zIndex === 'auto' ? 0 : Number(cs.zIndex);
			if (z < 1) continue; // under the incoming hero — covered
			const over = e.getBoundingClientRect().right - slot.right;
			if (over > worst.over) worst = { over, what: (e.querySelector('a,h1')?.textContent || e.className).trim().slice(0, 16) };
		}
		return worst;
	});
	if (hit && hit.over > worst.over) worst = hit;
	await page.waitForTimeout(35);
}
ok(worst.over <= 2, `spouse-swap: a VISIBLE element (${worst.what}) flew ${Math.round(worst.over)}px past the card's right edge (≤ 2)`);

// ── C. the Morgan wife-#4/#5 round-trip (the scenario that caught the ghost) ───────────────
// Morgan → page so a DEEP wife (index ≥ 3) is the trailing chip → click her → click Morgan on her
// card. The pivot-aware offset must land Morgan's window with that wife a VISIBLE docked chip, and
// nothing may fly off-card during the demotion. Runs for wife #4 (offset 1) and wife #5 (offset 2).
const trailingChipInfo = () =>
	page.evaluate(() => {
		const slot = document.querySelector('.featured-slot').getBoundingClientRect();
		const mL = document.querySelector('.spouse-mask')?.getBoundingClientRect().left ?? 0;
		const vis = [...document.querySelectorAll('.spouse-strip .flight')]
			.filter((e) => { const r = e.getBoundingClientRect(); return r.right > mL + 1 && r.left < slot.right + 6; })
			.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
		const a = vis[vis.length - 1]?.querySelector('a');
		const r = a?.getBoundingClientRect();
		return a ? { href: a.getAttribute('href'), x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
	});
for (const pages of [1, 2]) {
	await page.goto(`${BASE}/person/john-morgan-1930`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	for (let i = 0; i < pages; i++) { await page.click('.caret-right'); await page.waitForTimeout(460); }
	const wife = await trailingChipInfo();
	await page.mouse.click(wife.x, wife.y);
	await page.waitForURL(`**${wife.href}`, { timeout: 4000 }).catch(() => {});
	await page.waitForTimeout(700);
	const morgan = await page.evaluate(() => {
		const a = document.querySelector('.spouse-notch a[href$="john-morgan-1930"]');
		const r = a?.getBoundingClientRect();
		return a ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
	});
	if (!morgan) { fails.push(`round-trip(${pages}): Morgan chip not found on wife card`); continue; }
	await page.mouse.move(5, 5);
	await page.mouse.click(morgan.x, morgan.y); // fly back INTO Morgan, pivot = the deep wife
	let over = -1e9;
	for (let i = 0; i < 18; i++) {
		const o = await page.evaluate(() => {
			const slot = document.querySelector('.featured-slot')?.getBoundingClientRect();
			if (!slot) return -1e9;
			let m = -1e9;
			for (const e of document.querySelectorAll('.spouse-notch .flight, .featured-flight')) {
				const cs = getComputedStyle(e);
				if (parseFloat(cs.opacity) <= 0.5) continue;
				if ((cs.zIndex === 'auto' ? 0 : Number(cs.zIndex)) < 1) continue;
				m = Math.max(m, e.getBoundingClientRect().right - slot.right);
			}
			return m;
		});
		if (o > over) over = o;
		await page.waitForTimeout(35);
	}
	ok(over <= 2, `round-trip(${pages}): a visible element flew ${Math.round(over)}px off-card during the demotion`);
	const res = await page.evaluate((href) => {
		const off = Number(document.querySelector('.spouse-notch')?.getAttribute('data-spouse-offset') ?? 0);
		const slot = document.querySelector('.featured-slot').getBoundingClientRect();
		const mL = document.querySelector('.spouse-mask')?.getBoundingClientRect().left ?? 0;
		const pivot = [...document.querySelectorAll('.spouse-strip .flight')].find((e) => e.querySelector(`a[href$="${href.split('/').pop()}"]`));
		const r = pivot?.getBoundingClientRect();
		return { off, pivotVisible: r ? r.right > mL + 1 && r.right <= slot.right + 1 : false };
	}, wife.href);
	ok(res.off > 0, `round-trip(${pages}): pivot-aware offset not applied (offset ${res.off})`);
	ok(res.pivotVisible, `round-trip(${pages}): the wife we left is not a visible docked chip on Morgan`);
}

// ── D. orphan invariant: after everything settles, no stranded position:fixed flight element, and
// the dev janitor never had to fire (either would mean an interrupted-outro orphan reached the DOM).
await page.waitForTimeout(900);
const pinned = await page.evaluate(() => [...document.querySelectorAll('.flight')].filter((e) => getComputedStyle(e).position === 'fixed').map((e) => e.dataset.flightId));
ok(pinned.length === 0, `orphaned pinned flight element(s) still in DOM: ${JSON.stringify(pinned)}`);
ok(janitorWarns.length === 0, `dev janitor fired (orphan reached the DOM): ${janitorWarns.join(' ; ')}`);

// ── E. FALSE-POSITIVE GUARD: the sweep must NEVER target a LIVE in-flight element. Mid-flight, every
// positioned (fixed/absolute) flight box must be ANIMATING — so the sweep's gate (getAnimations()===0)
// classifies ZERO of them as strandable. If the discrimination were position-only (break the gate),
// `sweepEligible` would be > 0 and this fails — proving the gate is load-bearing.
await page.goto(`${BASE}/person/nancy-morse-1915`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const sweepBefore = sweepWarns.length;
const chip2 = await centerOf('.spouse-notch .flight a');
await page.mouse.click(chip2.x, chip2.y); // spouse swap → chips flyOut (fixed) + relatives flip (absolute)
await page.waitForTimeout(130); // mid-flight
const guard = await page.evaluate(() => {
	const positioned = [...document.querySelectorAll('.flight')].filter((e) => ['fixed', 'absolute'].includes(getComputedStyle(e).position));
	const live = positioned.filter((e) => e.getAnimations().length > 0);
	const sweepEligible = positioned.filter((e) => e.getAnimations().length === 0);
	return { positioned: positioned.length, live: live.length, sweepEligible: sweepEligible.length };
});
ok(guard.sweepEligible === 0, `false-positive: sweep would classify ${guard.sweepEligible} LIVE mid-flight element(s) as strandable`);
ok(guard.live > 0, `guard not exercising the gate (no live positioned element mid-flight: ${JSON.stringify(guard)})`);
// and the sweep, running across this CLEAN flight's settle window, must reset NOTHING (no orphans here;
// a live element it wrongly stripped would log + pop). Break the getAnimations() gate → this goes red.
await page.waitForTimeout(700);
ok(sweepWarns.length === sweepBefore, `false-positive: sweep reset a live element during a clean flight: ${sweepWarns.slice(sweepBefore).join(' ; ')}`);

// ── F. paged-nav floater guard: leaving a PAGED carousel window must not strand off-window chips
// visible on the destination card, and the RETURN trip must render the correct window. (Off-window
// chips exit at duration:0 → they can strand visible on a ≤3-spouse destination that has no mask.)
await page.goto(`${BASE}/person/john-morgan-1930`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.click('.caret-right'); // → offset 1, window shows spouses 2-4 (Elizabeth[1] & Connie[5] off-window)
await page.waitForTimeout(500);
const lead = await page.evaluate(() => {
	const slot = document.querySelector('.featured-slot').getBoundingClientRect();
	const mL = document.querySelector('.spouse-mask').getBoundingClientRect().left;
	const vis = [...document.querySelectorAll('.spouse-strip .flight')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > mL + 1 && r.left < slot.right + 6; }).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
	const a = vis[0].querySelector('a'); const r = a.getBoundingClientRect();
	return { href: a.getAttribute('href'), x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.move(5, 5);
await page.mouse.click(lead.x, lead.y); // navigate into the leading wife (a ≤3-spouse card, no mask)
await page.waitForURL(`**${lead.href}`, { timeout: 4000 }).catch(() => {});
await page.waitForTimeout(1200);
const floaters = await page.evaluate(() => [...document.querySelectorAll('.spouse-notch .flight')]
	.filter((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return parseFloat(cs.opacity) > 0.1 && r.width > 5 && e.dataset.offwindow === 'true'; })
	.map((e) => e.querySelector('a')?.textContent?.trim().split('\n')[0]?.slice(0, 16)));
ok(floaters.length === 0, `paged-nav: off-window chip(s) stranded visible on the destination: ${JSON.stringify(floaters)}`);
// (b) return trip: click Morgan back → his window must render (3 visible chips, pivot-aware offset)
const backToMorgan = await page.evaluate(() => {
	const a = document.querySelector('.spouse-notch a[href$="john-morgan-1930"]');
	const r = a?.getBoundingClientRect();
	return a ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
});
if (backToMorgan) {
	await page.mouse.click(backToMorgan.x, backToMorgan.y);
	await page.waitForURL('**/john-morgan-1930', { timeout: 4000 }).catch(() => {});
	await page.waitForTimeout(1200);
	const ret = await page.evaluate(() => {
		const slot = document.querySelector('.featured-slot').getBoundingClientRect();
		const mL = document.querySelector('.spouse-mask')?.getBoundingClientRect().left ?? 0;
		const vis = [...document.querySelectorAll('.spouse-strip .flight')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return parseFloat(cs.opacity) > 0.1 && r.right > mL + 1 && r.left < slot.right + 6; });
		return { visibleCount: vis.length, offset: document.querySelector('.spouse-notch')?.getAttribute('data-spouse-offset') };
	});
	ok(ret.visibleCount === 3, `return-trip: Morgan's window shows ${ret.visibleCount} visible chips, not 3 (offset ${ret.offset})`);
}

// ── G. RELATIVE demotion atomic swap (L3a): the demoting parent/child card is a SOLID object
// (opacity 1, no terminal fade) and its pivot box is revealed as a STEP exactly the frame the card
// leaves — never a cross-dissolve, never a visible double (box on top of the still-docked card),
// never a bare frame. Frame-sample the pivot box (data-flight-id = old focus id) and the demoting
// card (the .featured-flight riding at z-index 0; the incoming hero is z-index 2). Two regimes:
//   G1 UP  — click a CHILD → old focus demotes UP into a PARENT box (paints UNDER the card).
//   G2 DOWN — click a PARENT → old focus demotes DOWN into a CHILD box (paints OVER the card) — the
//             double-prone case: an early reveal would show the box stacked on the docked card.
async function atomicSwap(label, startSlug, targetSel) {
	await page.goto(`${BASE}/person/${startSlug}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	const pivotId = await page.evaluate(() => document.querySelector('.featured-card h1 .font-mono')?.textContent?.trim() ?? null);
	const target = await centerOf(targetSel);
	if (!pivotId || !target) { fails.push(`${label}: setup failed (pivotId ${pivotId}, target ${!!target})`); return; }
	await page.mouse.move(5, 5);
	await page.mouse.click(target.x, target.y);
	const swap = await page.evaluate((pid) => new Promise((resolve) => {
		const out = [];
		let n = 0;
		const cen = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
		const tick = () => {
			const box = document.querySelector(`[data-flight-id="${pid}"]`);
			const boxOp = box ? parseFloat(getComputedStyle(box).opacity) : -1;
			// the demoting card carries .demoting (relative demote rides at z:1 now, so don't key on z:0)
			const demote = [...document.querySelectorAll('.featured-flight')].find((c) => c.classList.contains('demoting'));
			const face = demote?.querySelector('.demote-chipface');
			const faceOp = face ? parseFloat(getComputedStyle(face).opacity) : -1;
			let rectDelta = -1;
			let faceAspect = -1;
			if (face) {
				const pb = face.querySelector('.person-box') || face;
				const fr = pb.getBoundingClientRect();
				if (fr.height > 0) faceAspect = fr.width / fr.height;
				if (box) {
					const a = cen(fr);
					const b = cen(box.getBoundingClientRect());
					rectDelta = Math.hypot(a.x - b.x, a.y - b.y);
				}
			}
			// hero = the OTHER flying featured card (the incoming one still `.flat`, not `.demoting`).
			const heroFlat = [...document.querySelectorAll('.featured-flight.flat')].some((c) => !c.classList.contains('demoting'));
			// the card's OWN face (card-top → holds the header/name); it must crossfade OUT as the chip
			// fades IN, so the two names never coexist.
			const cardTop = demote?.querySelector('.card-top');
			const cardFaceOp = cardTop ? parseFloat(getComputedStyle(cardTop).opacity) : -1;
			out.push({ n, boxOp, cardPresent: !!demote, cardOp: demote ? parseFloat(getComputedStyle(demote).opacity) : -1, faceOp, cardFaceOp, rectDelta, faceAspect, heroFlat });
			if (++n < 48) requestAnimationFrame(tick);
			else resolve(out);
		};
		requestAnimationFrame(tick);
	}), pivotId);
	// (1) STEP not fade — few frames at intermediate box opacity (the old 170ms cross-dissolve ≈ 10).
	ok(swap.filter((s) => s.boxOp > 0.1 && s.boxOp < 0.9).length <= 3, `${label}: pivot box faded in (expected an atomic STEP ≤ 3 intermediate frames)`);
	// (2) HELD hidden through the flight (proves it isn't revealed early by the incoming landing).
	ok(swap.filter((s) => s.cardPresent && s.boxOp < 0.1).length >= 3, `${label}: pivot box was not held hidden during the flight`);
	// (3) NO BARE FRAME at the swap: the frame after the demoting card is last present, the box is up.
	const lastCard = swap.reduce((acc, s, i) => (s.cardPresent ? i : acc), -1);
	const after = lastCard >= 0 && lastCard + 1 < swap.length ? swap[lastCard + 1] : null;
	ok(after !== null, `${label}: never observed the demoting card leaving (sampler window too short?)`);
	ok(!after || after.boxOp > 0.5, `${label}: BARE FRAME — pivot box not visible the frame after the card left (boxOp ${after?.boxOp})`);
	// (4) SOLID object: the demoting card never faded while present (opacity 1 the whole flight).
	ok(swap.filter((s) => s.cardPresent && s.cardOp >= 0 && s.cardOp < 0.9).length === 0, `${label}: demoting card faded — must stay a solid opaque object`);
	// (5) NO VISIBLE DOUBLE: ≤ ~one frame with BOTH card and pivot box fully visible at once.
	ok(swap.filter((s) => s.cardPresent && s.cardOp > 0.9 && s.boxOp > 0.9).length <= 2, `${label}: card + pivot box both fully visible for >2 frames (visible double)`);
	// (6) ended fully visible.
	ok(swap[swap.length - 1].boxOp > 0.9, `${label}: pivot box not fully visible at rest (${swap[swap.length - 1].boxOp})`);
	// (7) FLIP EARLY: the chip-face is shown (>0.9) for the final 60%+ of the card's presence — the
	// face flips to chip-layout up front and stays a chip the rest of the way in.
	const present = swap.filter((s) => s.cardPresent).length;
	const faceShown = swap.filter((s) => s.cardPresent && s.faceOp > 0.9).length;
	ok(present > 0 && faceShown >= present * 0.6, `${label}: chip-face not shown for the final 60%+ of travel (${faceShown}/${present})`);
	// (8) LANDS AS THE BOX: the chip-face converges onto the destination box's rect, so the swap is
	// between two coincident chips (visual similarity, not just presence).
	const deltas = swap.filter((s) => s.cardPresent && s.rectDelta >= 0).map((s) => s.rectDelta);
	const minDelta = deltas.length ? Math.min(...deltas) : Infinity;
	ok(minDelta < 40, `${label}: chip-face never converged onto the box (min center delta ${Math.round(minDelta)}px)`);
	// (9) NO WARP: whenever the chip-face is shown it renders at the true PersonBox aspect (~2.93) —
	// counter-scaled against the shell's non-uniform morph, never stretched. THE warp guard.
	const TRUE_ASPECT = 220 / 75;
	const warped = swap.filter((s) => s.cardPresent && s.faceOp > 0.9 && s.faceAspect > 0 && Math.abs(s.faceAspect / TRUE_ASPECT - 1) > 0.02);
	ok(warped.length === 0, `${label}: chip-face aspect distorted on ${warped.length} frame(s) (e.g. ${warped[0] ? warped[0].faceAspect.toFixed(2) : ''} vs true ${TRUE_ASPECT.toFixed(2)})`);
	// (9b) NO DOUBLE NAME: a true crossfade of faces — the card's own face and the chip-face never both
	// exceed ~0.5 opacity at the same frame (that would be two names visible at once).
	const doubled = swap.filter((s) => s.cardPresent && s.cardFaceOp > 0.55 && s.faceOp > 0.55);
	ok(doubled.length === 0, `${label}: double name — card face (${doubled[0] ? doubled[0].cardFaceOp.toFixed(2) : ''}) + chip-face (${doubled[0] ? doubled[0].faceOp.toFixed(2) : ''}) both visible on ${doubled.length} frame(s)`);
	// (10) FINISH ORDER: the demotion's atomic swap (card gone) precedes the hero's landing (its .flat
	// drops) — the leaving card clears the stage before the hero arrives, never competing with it.
	const demoteGone = swap.findIndex((s, i) => i > 0 && !s.cardPresent && swap[i - 1].cardPresent);
	const heroLand = swap.findIndex((s, i) => i > 0 && !s.heroFlat && swap[i - 1].heroFlat);
	ok(demoteGone >= 0 && heroLand >= 0 && demoteGone <= heroLand, `${label}: demotion did not finish before the hero landed (demote-gone frame ${demoteGone}, hero-land frame ${heroLand})`);
}
await atomicSwap('relative-demote UP (parent box)', 'nancy-morse-1915', '.children-slot a, [class*="children"] a');
await atomicSwap('relative-demote DOWN (child box)', 'michael-hooker-1935', '.parents-slot a');

// ── G-Z. Z-ORDER: a relative demote is a visible solid object — it must ride ABOVE resting relative
// boxes as it flies over a row (z:1), below the hero. michael → parent Rodman: michael's card demotes
// DOWN, flying over Rodman's children row. Sample mid-flight: where the demoting card overlaps a
// VISIBLE resting box, the topmost element at that overlap must belong to the demote, never the box.
await page.goto(`${BASE}/person/michael-hooker-1935`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const zParent = await centerOf('.parents-slot a');
await page.mouse.move(5, 5);
await page.mouse.click(zParent.x, zParent.y);
let zTested = false;
let zOccluded = false;
for (let i = 0; i < 44; i++) {
	const s = await page.evaluate(() => {
		const d = [...document.querySelectorAll('.featured-flight')].find((c) => c.classList.contains('demoting'));
		if (!d) return null;
		// Measure the OPAQUE white card (.featured-card-wrap), not the .featured-flight bounding rect —
		// the counter-scaled chip-face inflates that rect with transparent whitespace below the card, and
		// sampling there hits the background, not the card (a false occlusion).
		const wrap = d.querySelector('.featured-card-wrap');
		if (!wrap) return { tested: false };
		const dr = wrap.getBoundingClientRect();
		// RESTING relative-ROW boxes only: in-flow (position static — exclude leaving spouse chips that
		// flyOut pins position:fixed at the old notch) and dir up/down (parent/child rows, not lateral).
		const box = [...document.querySelectorAll('.flight[data-flight-id]')].find((b) => {
			if (d.contains(b)) return false;
			const cs = getComputedStyle(b);
			if (cs.position !== 'static' || (b.dataset.flightDir !== 'up' && b.dataset.flightDir !== 'down')) return false;
			const r = b.getBoundingClientRect();
			if (parseFloat(cs.opacity) <= 0.5 || r.width < 5) return false;
			return !(r.right < dr.left || r.left > dr.right || r.bottom < dr.top || r.top > dr.bottom);
		});
		if (!box) return { tested: false };
		// Sample a GRID of points across the wrap∩box overlap; an occlusion counts only where the demote
		// card genuinely PAINTS (is in the stack) AND the box paints ABOVE it. Bounding-rect overlap with
		// no demote pixel (the card's painted area ends above the row) is NOT occlusion.
		const b = box.getBoundingClientRect();
		const ox0 = Math.max(dr.left, b.left), ox1 = Math.min(dr.right, b.right);
		const oy0 = Math.max(dr.top, b.top), oy1 = Math.min(dr.bottom, b.bottom);
		let genuine = false, occluded = false;
		for (let gx = 1; gx <= 5; gx++) {
			for (let gy = 1; gy <= 3; gy++) {
				const px = ox0 + ((ox1 - ox0) * gx) / 6, py = oy0 + ((oy1 - oy0) * gy) / 4;
				const stack = document.elementsFromPoint(px, py);
				const di = stack.findIndex((e) => e.closest('.featured-flight') === d);
				const bi = stack.findIndex((e) => e.closest('.flight[data-flight-id]') === box);
				if (di >= 0 && bi >= 0) { genuine = true; if (bi < di) occluded = true; } // box painted above the card
			}
		}
		return { tested: genuine, occluded };
	});
	if (s && s.tested) {
		zTested = true;
		if (s.occluded) zOccluded = true;
	}
	await page.waitForTimeout(11);
}
// zTested is a NOTE, not a gate: in a single-row children nav the demote lands in its own column and
// genuinely never pixel-overlaps a sibling, so "not exercised" is expected here (a 2+-row case would
// exercise it). The invariant that must hold whenever it IS exercised: the card rides above the row.
if (!zTested) console.log('  (z-order: single-row nav — demote never pixel-overlapped a resting box; occlusion path not exercised)');
ok(!zOccluded, 'z-order: demoting card was OCCLUDED by a resting relative box mid-flight (must ride above the row)');

await ctx.close();
await browser.close();

if (fails.length) {
	console.log('FLIGHT CHECK: RED\n- ' + fails.join('\n- '));
	process.exit(1);
}
console.log('FLIGHT CHECK: GREEN — incoming notch gated on landing; no off-card demotion; relative demote = atomic swap.');
