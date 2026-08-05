// probe-sibling-seat.mjs — the §19 IN-PLACE PANEL MUTATION (new, Aug 4).
//
// A sibling promotion barely changes the sibling list, so the panel persists and MUTATES: the promoted
// chip vanishes, its neighbours close the gap, and the demoted card flies INTO the vacated list as a chip
// while the carousel scrolls to catch it. Every check below was RED at some point during the build — none
// of it is decoration (§21.3: a probe that has never been seen to fail is decoration):
//
//   B (held seat)   — revealPending's accept tested data-flight-id, which a sibling chip deliberately does
//                     not carry, so `undefined !== pivot` was true and the demoted person's chip faded up
//                     at FLIGHT START, beside a card still carrying him across the screen.
//   D (lands on it) — Svelte removes a demote the instant its own clock ends, so the u=1 frame is computed
//                     and never painted: the card's last VISIBLE frame was 47px short of the seat and 40px
//                     too wide, and the atomic swap then exposed the real chip where the card had never
//                     been. Everywhere else this is invisible; a chip landing in the panel is watched in.
//   E (step reveal) — the swap must expose an already-solid identical object (§18.4), never a fade.
//
// Two cases, each isolating one motion: one where the survivors close a gap with no scrolling, and one on
// a 20-sibling windowed panel where the seat starts OUTSIDE the window and the strip has to glide.
// Everything is keyed on ID, never on name — these families reuse given names, and died-young chips sort
// to the bottom of their tier, so a name match follows the wrong chip and reports confidently about it.
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const CASES = [
	{
		name: 'GAP CLOSE — promote Mary from JP Morgan (4 siblings, no windowing)',
		start: 'john-morgan-1837',
		click: 'mary-burns-1844',
		pivot: 'HD1170', // JP — the demoted person, whose chip the card flies into
		promoted: 'HD1220', // Mary — her chip must vanish, she is the featured card now
		glider: 'HD1217', // Sarah — must slide DOWN one pitch to make room for JP at the top
		expectGlide: 70,
		expectScroll: false
	},
	{
		name: 'CAROUSEL CATCH — promote Florella 1769 from Elnathan 1783 (20 siblings, seat off-window)',
		start: 'elnathan-strong-1783',
		click: 'florella-strong-1769',
		pivot: 'H00676', // Elnathan 1783 — sits below the visible window until the strip scrolls
		promoted: 'H00669',
		glider: 'H00675', // John Strong — rides the strip glide
		expectGlide: -70,
		expectScroll: true
	},
	{
		// HEADER-FIRST LIST. Emily Vanderbilt's siblings are ALL half-siblings, so her panel opens with a
		// tier header — and a header's trimmed gaps are negative margins, which at index 0 have no gap to
		// trim and instead lift the whole strip 6.4px. The layout model did not represent that, so every
		// seat below it was computed 6.4px low: Sam saw the demoted chip land and then "tick up maybe 5px
		// instantly". Nothing else in this probe has a header at the top of the list.
		name: 'HEADER-FIRST — promote Emily from Anne Vanderbilt (all-half list, leading tier header)',
		start: 'anne-vanderbilt-1931',
		click: 'emily-vanderbilt-1925',
		pivot: 'HD7833', // Anne — lands at item 1, directly under the leading header
		promoted: 'HD7832',
		glider: 'HD7834', // Ellen — item 0 in Anne's list, item 2 in Emily's
		expectGlide: 101.2,
		expectScroll: false
	}
];

// The sibling panel is OPEN BY DEFAULT now (Aug 4). A blind `click('.sibling-trigger')` therefore CLOSES
// it and every chip this probe needs disappears — the same shape of breakage the sticky panel caused in
// §19.5. Ask for the STATE, don't assume it.
const ensurePanelOpen = async (page) => {
	if (await page.locator('.sibling-window').count()) return;
	await page.click('.sibling-trigger');
	await page.waitForSelector('.sibling-window', { timeout: 5000 });
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'no-preference' });
const p = await ctx.newPage();
let pageErrors = [];
p.on('pageerror', (e) => pageErrors.push(e.message.split('\n')[0]));

let failures = 0;
for (const c of CASES) {
	await p.goto(`${BASE}/person/${c.start}`, { waitUntil: 'networkidle' });
	await p.waitForTimeout(800);
	await ensurePanelOpen(p);
	await p.waitForSelector(`.sibling-strip a[href="/person/${c.click}"]`, { timeout: 5000 });
	await p.waitForTimeout(400);
	pageErrors = [];

	await p.evaluate(({ pivot, promoted, glider }) => {
		window.__s = [];
		const t0 = performance.now();
		const q = (id) => document.querySelector(`.sib-item[data-sib-seat-id="${id}"]`);
		const r = (el) => {
			if (!el) return null;
			const x = el.getBoundingClientRect();
			return [Math.round(x.left), Math.round(x.top), Math.round(x.width), Math.round(x.height)];
		};
		(function fr() {
			const t = performance.now() - t0;
			const seat = q(pivot);
			const strip = document.querySelector('.sibling-strip');
			const g = q(glider);
			// The demoting card is the one riding a flight z-index; the hero rides 2.
			const cards = [...document.querySelectorAll('.featured-flight')];
			const OLD = cards.find((c) => getComputedStyle(c).zIndex === '1');
			const NEW = cards.find((c) => c !== OLD);
			const sf = OLD?.querySelector('.person-box[inert]'); // the SEAT's own face, cloned onto the flight
			const trig = document.querySelector('.sibling-trigger');
			window.__s.push({
				t: Math.round(t),
				panel: !!document.querySelector('.sibling-window'),
				card: OLD ? r(OLD) : null,
				// how far the demote has emerged past the arriving card's right edge (< 0 = still behind it)
				emerged: OLD && NEW ? OLD.getBoundingClientRect().right - NEW.getBoundingClientRect().right : null,
				heroFlat: NEW ? NEW.classList.contains('flat') : null,
				seatFaceOp: sf ? +parseFloat(getComputedStyle(sf).opacity).toFixed(2) : null,
				trigOp: trig ? +parseFloat(getComputedStyle(trig).opacity).toFixed(2) : null,
				// The header SLOT, not just the word: at offset > 0 the up-caret legitimately takes the
				// trigger's place (§21.1 — they share one slot), so the invariant is that the slot is never
				// BLANK, not that the word is always there.
				slotOp: Math.max(0, ...[...(document.querySelector('.top-slot')?.children ?? [])].map((e) =>
					parseFloat(getComputedStyle(e).opacity) || 0)),
				seat: seat ? r(seat) : null,
				seatOp: seat ? +parseFloat(getComputedStyle(seat).opacity).toFixed(3) : null,
				promotedChip: !!q(promoted),
				gliderY: g ? +g.getBoundingClientRect().top.toFixed(1) : null,
				stripY: strip ? +new DOMMatrix(getComputedStyle(strip).transform).m42.toFixed(1) : null,
				// The CAROUSEL's own state. stripY is not the same question: a list that OPENS WITH A HEADER
				// carries a 6.4px leading-margin compensation in its transform, so reading paging off stripY
				// called that a scroll. The offset is what paging actually means.
				offset: document.querySelector('.sibling-window')?.dataset.sibOffset ?? null
			});
			if (t < 1200) requestAnimationFrame(fr);
			else window.__sd = true;
		})();
	}, { pivot: c.pivot, promoted: c.promoted, glider: c.glider });

	await p.click(`.sibling-strip a[href="/person/${c.click}"]`);
	await p.waitForFunction(() => window.__sd, null, { timeout: 8000 });
	const s = await p.evaluate(() => window.__s);

	const withCard = s.filter((x) => x.card);
	const lastCard = withCard[withCard.length - 1];
	const rest = s[s.length - 1];
	const firstVisible = s.find((x) => x.seatOp > 0);
	const fails = [];

	if (pageErrors.length) fails.push(`uncaught page error "${pageErrors[0]}" — freezes the reactive flush`);

	// A — THE PANEL PERSISTS. The whole premise: it must never unmount and rebuild.
	const closed = s.filter((x) => !x.panel);
	if (closed.length) fails.push(`the panel unmounted for ${closed.length} frame(s) (first at t=${closed[0].t}) — it closed and rebuilt instead of mutating`);

	// B — THE DEMOTED PERSON'S CHIP IS HELD until the card is down. §19.4: the panel persisting is the one
	// place "nothing incoming paints before landing" is relaxed, and THIS chip is the exception to the
	// exception — it belongs to the card still in the air.
	const early = withCard.filter((x) => x.seatOp > 0.01);
	if (early.length) fails.push(`the demoted person's chip painted at opacity ${early[0].seatOp} at t=${early[0].t}, while his card was still flying (${early.length} frames)`);

	// C — THE PROMOTED CHIP VANISHES the instant the list changes. She is the featured card now, and a
	// second copy of her in the list is the ghost. Measured from the SWAP, not from the click: the warm
	// fetch takes ~50-90ms and the outgoing person's list is legitimately still on screen until it
	// returns. The swap frame is the one where the demoted person's own chip first exists.
	const swapIdx = s.findIndex((x) => x.seat);
	if (swapIdx < 0) fails.push('the demoted person never joined the list — no mutation happened at all');
	else {
		const lingering = s.slice(swapIdx).filter((x) => x.promotedChip);
		if (lingering.length) fails.push(`the promoted sibling's own chip survived the swap, to t=${lingering[lingering.length - 1].t} (${lingering.length} frames) — a duplicate of the featured person`);
	}

	// D — THE CARD LANDS ON THE SEAT. Its LAST PAINTED frame, not its computed endpoint.
	if (!lastCard) fails.push('never saw the demoting card — no flight ran');
	else if (!rest.seat) fails.push('the seat chip does not exist at rest — the demoted person never joined the list');
	else {
		const d = rest.seat.map((v, i) => v - lastCard.card[i]);
		if (d.some((v) => Math.abs(v) > 1))
			fails.push(`card's last painted frame ${JSON.stringify(lastCard.card)} ≠ the seat ${JSON.stringify(rest.seat)} — Δ[l,t,w,h]=${JSON.stringify(d)}; the swap happens mid-travel and pops`);
	}

	// E — THE REVEAL IS A STEP, and lands within a frame or two of the card leaving.
	const partial = s.filter((x) => x.seatOp > 0.01 && x.seatOp < 0.95);
	if (partial.length) fails.push(`the seat FADED in (${partial.length} frames at partial opacity, e.g. ${partial[0].seatOp}) — the atomic swap must be a step`);
	if (lastCard && firstVisible) {
		const gap = firstVisible.t - lastCard.t;
		if (gap > 60) fails.push(`${gap}ms of nothing between the card leaving (t=${lastCard.t}) and the chip appearing (t=${firstVisible.t}) — a blink at the seat`);
	}

	// F — THE SURVIVORS GLIDE. A gap between discrete objects is real; closing it is motion, not a relayout.
	const gs = s.filter((x) => x.gliderY != null);
	if (gs.length) {
		const moved = gs.filter((x, i) => i && Math.abs(x.gliderY - gs[i - 1].gliderY) > 0.2);
		const total = gs[gs.length - 1].gliderY - gs[0].gliderY;
		if (Math.abs(total - c.expectGlide) > 2)
			fails.push(`neighbour ${c.glider} moved ${total.toFixed(1)}px, expected ${c.expectGlide}`);
		else if (moved.length < 4)
			fails.push(`neighbour ${c.glider} SNAPPED to its new place (${moved.length} moving frame(s)) instead of gliding`);
	}

	// G — THE CAROUSEL SCROLLS TO CATCH IT, where the seat starts outside the window.
	const offsets = [...new Set(s.map((x) => x.offset).filter((v) => v != null))];
	const scrolled = offsets.length > 1;
	if (c.expectScroll && !scrolled) fails.push('the carousel never paged — the off-window seat was never brought into view');
	if (!c.expectScroll && scrolled) fails.push(`the carousel paged (${offsets.join(' → ')}) on a case whose seat was already visible — it should not scroll for nothing`);

	// ── §21.3: WHAT EMERGES MUST ALREADY BE FINISHED ────────────────────────────────────────────────
	// Sam: the interior content "changes in full view of the user, it changes right before it lands", and
	// the demote "looks like it's coming down from a high level and being vacuumed up" instead of sliding
	// laterally. Both are the same defect — scale and translation rode one progress, so the object was
	// still resolving as it came out from behind the arriving card. Measured before the fix: it emerged at
	// 29% of its final size with the seat's face not yet up. The rule now is that the footprint and the
	// content are BOTH done while the hero still occludes it, so what appears is a finished chip sliding.
	const emerging = s.filter((x) => x.card && x.emerged != null && x.emerged > 8);
	if (!emerging.length) fails.push('the demote never emerged past the arriving card — cannot judge what appears');
	else {
		const first = emerging[0];
		const finalW = rest.seat?.[2] ?? 119;
		if (Math.abs(first.card[2] - finalW) > 6)
			fails.push(`the demote emerges at ${first.card[2]}px wide, not its final ${finalW}px — it is still shrinking in full view (reads as descending, not sliding)`);
		if (!(first.seatFaceOp >= 0.99))
			fails.push(`the seat's own face is only at opacity ${first.seatFaceOp} when the demote emerges — the interior content is still changing where the user can see it`);
	}

	// §21.3: it must reach its seat BEFORE the hero lands, not after. Sam: "they should land at the same
	// time, even the sibling chip in final position 50ms before the Featured Card is in position." It
	// measured at 0ms and by accident — the demote was clocked off the SPOUSE regime's formula while the
	// hero ran on siblingGrowMs. Now derived from the hero's own curve, so the lead is stated.
	// The hero's landing is the first frame it is NOT flat AFTER having been flat — `.flat` goes on at
	// introstart, so a plain `find(!flat)` matches frame 0, when the outgoing card is still at rest and is
	// the only card on stage. That mis-fire reported the chip settling 513ms "after" the landing.
	const flatIdx = s.findIndex((x) => x.heroFlat === true);
	const heroLand = flatIdx < 0 ? null : s.slice(flatIdx).find((x) => x.heroFlat === false);
	if (heroLand && lastCard) {
		const lead = heroLand.t - lastCard.t;
		if (lead < 15) fails.push(`the chip settles ${-lead}ms AFTER the card lands (want it ~50ms before) — the two clocks are not related`);
		if (lead > 130) fails.push(`the chip settles ${lead}ms before the card lands — far enough ahead to read as waiting`);
	}

	// §21.3: a small overshoot, "not dramatic theatrical overshoot, but it gives a sense of weight."
	if (rest.seat && withCard.length > 4) {
		const maxLeft = Math.max(...withCard.map((x) => x.card[0]));
		const over = maxLeft - rest.seat[0];
		if (over < 1) fails.push('no overshoot at the seat — the chip stops dead instead of carrying its weight');
		if (over > 6) fails.push(`overshoot is ${over}px — theatrical; the note was for a small carry`);
	}

	// §21.2: the header must not blink out while its own chips stay put. Asserted on the SLOT — at offset
	// > 0 the up-caret correctly replaces the word (§21.1 gives them one slot between them), so requiring
	// the word specifically would fail the very case that scrolls.
	const flying = s.filter((x) => x.heroFlat === true);
	const blank = flying.filter((x) => !(x.slotOp > 0.05));
	if (blank.length) fails.push(`the sibling header went blank for ${blank.length} frame(s) mid-mutation while its chips stayed on screen`);

	if (fails.length) {
		failures++;
		console.log(`  RED  ${c.name}`);
		for (const f of fails) console.log(`         - ${f}`);
	} else {
		const glideFrames = gs.filter((x, i) => i && Math.abs(x.gliderY - gs[i - 1].gliderY) > 0.2).length;
		const em = s.filter((x) => x.card && x.emerged > 8)[0];
		const over = (Math.max(...withCard.map((x) => x.card[0])) - rest.seat[0]).toFixed(1);
		console.log(`  GREEN ${c.name}`);
		console.log(`         panel stayed up; seat held to t=${lastCard.t}; card landed ON it ${JSON.stringify(rest.seat)}; step reveal +${firstVisible.t - lastCard.t}ms; neighbour glided ${glideFrames} frames; carousel ${scrolled ? `offset ${offsets[0]} → ${offsets[offsets.length - 1]}` : 'held'}`);
		console.log(`         emerges at t=${em?.t} already ${em?.card[2]}px (final ${rest.seat[2]}), seat-face up; settles ${heroLand ? heroLand.t - lastCard.t : '?'}ms before the card lands; ${over}px overshoot`);
	}
}

// ── CARRY-OVER: the panel is ONE component instance across every navigation ──────────────────────────
// Found by running two navigations in sequence, which nothing else in the suite does. The panel is not
// remounted per person, so its scroll offset is the same variable from one card to the next: promote a
// sibling (which scrolls the strip, §19), then promote a parent, and the parent's list reopened ALREADY
// SCROLLED — first chips above the fold, and the trigger replaced by an up-caret for a list nobody had
// touched. Only a hand on the trigger reset it. Every arrival except a §19 mutation starts at the top.
{
	await p.goto(`${BASE}/person/elnathan-strong-1783`, { waitUntil: 'networkidle' });
	await p.waitForTimeout(800);
	await ensurePanelOpen(p);
	await p.waitForSelector('.sibling-strip a[href="/person/florella-strong-1769"]', { timeout: 5000 });
	await p.waitForTimeout(400);
	pageErrors = [];
	// 1. the mutation, which deliberately leaves the strip scrolled
	await p.click('.sibling-strip a[href="/person/florella-strong-1769"]');
	await p.waitForTimeout(1400);
	const mid = await p.evaluate(() => document.querySelector('.sibling-window')?.dataset.sibOffset ?? null);
	// 2. a parent promotion onto someone who has a panel of their own
	await p.click('a[data-relation="parent"][href="/person/cyprian-strong-1743"]');
	await p.waitForTimeout(1800);
	const after = await p.evaluate(() => ({
		offset: document.querySelector('.sibling-window')?.dataset.sibOffset ?? null,
		open: !!document.querySelector('.sibling-window'),
		trigger: document.querySelector('.sibling-trigger')?.textContent?.trim() ?? null
	}));
	const fails = [];
	if (pageErrors.length) fails.push(`uncaught page error "${pageErrors[0]}"`);
	if (mid !== '1') fails.push(`the mutation did not scroll the strip (offset ${mid}, expected 1) — the case under test never set up`);
	if (!after.open) fails.push('the sticky panel did not reopen on the parent card');
	else if (after.offset !== '0') fails.push(`the new person's list opened at offset ${after.offset}, not the top — the previous card's scroll carried over`);
	else if (after.trigger == null) fails.push('the trigger is missing at rest — an up-caret is showing for a list that was never scrolled');
	if (fails.length) {
		failures++;
		console.log('  RED  CARRY-OVER — mutation, then a parent promotion');
		for (const f of fails) console.log(`         - ${f}`);
	} else {
		console.log(`  GREEN CARRY-OVER — mutation, then a parent promotion`);
		console.log(`         mutation left the strip at offset ${mid}; the parent's list reopened at the top with "${after.trigger}"`);
	}
}

// ── DEFAULT OPEN, AND THE SESSION PREFERENCE ────────────────────────────────────────────────────────
// Sam (Aug 4): "it should start for all users default in the visible mode but users can close it anytime."
// Proven red on the first attempt: the nav-close $effect ALSO runs on mount, so it slammed the panel shut
// before a frame had painted and "open by default" produced a closed panel on every page load. The second
// check is the §18.12 rule — a panel that is open by default performs its cascade at the user on every
// single load unless the first paint is quiet.
{
	pageErrors = [];
	await p.goto(`${BASE}/person/alfred-vanderbilt-1877`, { waitUntil: 'commit' });
	await p.evaluate(() => {
		window.__d = [];
		const t0 = performance.now();
		(function fr() {
			const c = document.querySelector('.sib-item[data-sib-seat-id]');
			window.__d.push({ y: c ? +c.getBoundingClientRect().top.toFixed(1) : null });
			if (performance.now() - t0 < 1500) requestAnimationFrame(fr);
		})();
	}).catch(() => {});
	await p.waitForTimeout(2000);
	const ys = [...new Set((await p.evaluate(() => window.__d ?? [])).map((x) => x.y).filter((v) => v != null))];
	const openOnLoad = (await p.locator('.sibling-window').count()) > 0;
	const fails = [];
	if (pageErrors.length) fails.push(`uncaught page error "${pageErrors[0]}"`);
	if (!openOnLoad) fails.push('the panel is shut on a cold load — it must default to visible');
	if (ys.length > 1) fails.push(`the per-chip cascade played itself on page load (first chip took ${ys.length} positions: ${ys.join(', ')}) — the default-open reveal must be quiet`);
	// close → must stay closed across navigations; reopen → must stay open
	await p.click('.sibling-trigger');
	await p.waitForTimeout(500);
	await p.click('a[data-relation="child"]');
	await p.waitForTimeout(1600);
	if ((await p.locator('.sibling-window').count()) > 0) fails.push('a user CLOSE did not survive a navigation');
	await p.click('.sibling-trigger');
	await p.waitForTimeout(700);
	await p.click('a[data-relation="parent"]');
	await p.waitForTimeout(1600);
	if ((await p.locator('.sibling-window').count()) === 0) fails.push('a user REOPEN did not survive a navigation');
	if (fails.length) {
		failures++;
		console.log('  RED  DEFAULT OPEN — cold load, then close/reopen across navigations');
		for (const f of fails) console.log(`         - ${f}`);
	} else {
		console.log('  GREEN DEFAULT OPEN — visible on load with a quiet reveal; close and reopen both stick as you travel');
	}
}

// ── THE ANCHOR IS STABLE ACROSS NOTCH REGIMES ───────────────────────────────────────────────────────
// Sam: on Rodman Lent Hooker (3 spouses) ↔ his brother John (1), "the sibling menu moves up and down
// 5-10px each time you toggle between them." It was 12px — §21.1 tied the column's top to the card-edge
// resume, which is higher on a compact notch. Right while the panel closed and reopened on every
// navigation; a jumping column once it persists. `anchorOffsetFor` returns one value now, and this is the
// guard, because the only way to see the bug is to travel BETWEEN the two notch regimes.
{
	pageErrors = [];
	const chipTop = () => p.evaluate(() => { const e = document.querySelector('.sib-item'); return e ? +e.getBoundingClientRect().top.toFixed(1) : null; });
	await p.goto(`${BASE}/person/rodman-hooker-1909`, { waitUntil: 'networkidle' });
	await p.waitForTimeout(1000);
	await ensurePanelOpen(p);
	const compact = await chipTop(); // 3 spouses → compact notch
	await p.click('.sibling-strip a[href="/person/john-hooker-1903"]');
	await p.waitForTimeout(1600);
	const normal = await chipTop(); // 1 spouse → full notch
	const fails = [];
	if (pageErrors.length) fails.push(`uncaught page error "${pageErrors[0]}"`);
	if (compact == null || normal == null) fails.push('the panel was not open on one of the two cards');
	else if (Math.abs(normal - compact) > 0.6)
		fails.push(`the column moved ${(normal - compact).toFixed(1)}px travelling from a 3-spouse card to a 1-spouse one — the anchor is following the notch carve again`);
	if (fails.length) {
		failures++;
		console.log('  RED  ANCHOR — 3-spouse card ↔ 1-spouse card');
		for (const f of fails) console.log(`         - ${f}`);
	} else {
		console.log(`  GREEN ANCHOR — column top held at ${normal} across both notch regimes`);
	}
}

// ── THE HEADER CONTROL ──────────────────────────────────────────────────────────────────────────────
// Sam: "when you hover over the header it ticks right instantly like 3px which feels awkward" — an
// authoring accident (`.sibling-trigger:hover` had been grouped into the `.sib-toggle-mark` rule, so
// hovering applied that mark's `margin-left: 6px` to the whole centred button). The first replacement then
// added a 1px chevron nudge of its own, and the verdict was that the control read as "very unstable":
// "all it needs to do is rotate up and down on click when menu is open or closed, and on hover, you make
// siblings get lighter similar to NB headers."
//
// So the invariant is stronger than "no lateral shift": NOTHING in this control moves on hover, at all.
// Hover changes ALPHA only (0.6, the same response NB headers give), and the chevron's rotation is
// reserved for the open/closed state.
{
	pageErrors = [];
	await p.goto(`${BASE}/person/alfred-vanderbilt-1877`, { waitUntil: 'networkidle' });
	await p.waitForTimeout(1100);
	const read = () => p.evaluate(() => {
		const t = document.querySelector('.sibling-trigger');
		if (!t) return null;
		const r = t.getBoundingClientRect();
		const chev = t.querySelector('.sib-chev');
		const lab = t.querySelector('.sib-label');
		const cr = chev?.getBoundingClientRect();
		// The chevron is an SVG, so its box IS its ink and this rect is the mark's true position. It used
		// to be a text glyph measured with a Range — which returns the LINE BOX, reported a 5px glyph as
		// 20px tall, and produced a confident 0.00px reading while the rendered pixels plainly disagreed.
		// Also compare against the LABEL's ink, so a chevron drifting out of alignment is caught too.
		const inkMid = cr ? +((cr.top + cr.bottom) / 2).toFixed(2) : null;
		let labInkMid = null;
		if (lab) { const rg = document.createRange(); rg.selectNodeContents(lab);
			const lr2 = rg.getBoundingClientRect(); labInkMid = +((lr2.top + lr2.bottom) / 2).toFixed(2); }
		return {
			x: +r.left.toFixed(2), y: +r.top.toFixed(2),
			chevX: cr ? +cr.left.toFixed(2) : null, chevY: cr ? +cr.top.toFixed(2) : null,
			inkMid, labInkMid,
			labOp: lab ? +getComputedStyle(lab).opacity : null,
			rot: chev ? getComputedStyle(chev).transform : null
		};
	});
	const fails = [];
	const openRest = await read();
	if (!openRest) fails.push('no trigger rendered');
	else {
		await p.hover('.sibling-trigger');
		await p.waitForTimeout(350);
		const openHover = await read();
		// NOTHING MOVES. Not the button, not the glyph inside it.
		const dBtn = Math.hypot(openHover.x - openRest.x, openHover.y - openRest.y);
		const dChev = Math.hypot(openHover.chevX - openRest.chevX, openHover.chevY - openRest.chevY);
		if (dBtn > 0.5) fails.push(`the trigger moved ${dBtn.toFixed(2)}px on hover — nothing in this control may move on hover`);
		if (dChev > 0.5) fails.push(`the chevron moved ${dChev.toFixed(2)}px on hover — that is the instability Sam reported; rotation is for the open/closed state only`);
		// …and hover DOES read: the label gets lighter, like an NB header.
		if (!(openHover.labOp < openRest.labOp - 0.15))
			fails.push(`hover did not lighten the label (${openRest.labOp} → ${openHover.labOp}) — it should fade toward 0.6 the way NB headers do`);
		// the chevron carries the state by ROTATION, so the two states must differ
		await p.mouse.move(0, 0);
		await p.click('.sibling-trigger');
		await p.mouse.move(0, 0);
		await p.waitForTimeout(400);
		const closed = await read();
		if (closed.rot === openRest.rot)
			fails.push(`the chevron reads identically open and closed (${closed.rot}) — nothing carries the state`);
		// THE GLYPH MUST ROTATE IN PLACE. Sam: "it kind of rotates at the tip nib of the caret in the
		// centre and the up caret lives aligned with bottom and down caret aligned with top." Measured at
		// the time: the ink jumped 10.80px between states, because the bias correction sat INSIDE the
		// rotating element and the 180° turn doubled it instead of cancelling it.
		if (closed.inkMid != null && openRest.inkMid != null && Math.abs(closed.inkMid - openRest.inkMid) > 0.5)
			fails.push(`the chevron moved ${(closed.inkMid - openRest.inkMid).toFixed(2)}px between open and closed — it must rotate in place, not swing`);
		// …and it must sit ON the label, not float above or below it.
		for (const [st, r] of [['open', openRest], ['closed', closed]])
			if (r.inkMid != null && r.labInkMid != null && Math.abs(r.inkMid - r.labInkMid) > 1.5)
				fails.push(`the chevron sits ${(r.inkMid - r.labInkMid).toFixed(2)}px off the label's optical centre when ${st} — it has broken out of the alignment`);
	}
	if (pageErrors.length) fails.push(`uncaught page error "${pageErrors[0]}"`);
	if (fails.length) {
		failures++;
		console.log('  RED  HEADER — hover and the expand affordance');
		for (const f of fails) console.log(`         - ${f}`);
	} else {
		console.log('  GREEN HEADER — nothing moves on hover, the label lightens, the chevron rotates in place to carry open/closed');
	}
}

await b.close();
if (failures) {
	console.log(`\nSIBLING-SEAT PROBE: RED — ${failures} case(s) broke the in-place mutation.`);
	process.exit(1);
}
console.log('\nSIBLING-SEAT PROBE: GREEN — the panel mutates in place, the demoted card lands exactly on its held seat, and the swap is a step.');
