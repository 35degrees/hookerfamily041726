<script lang="ts">
	import type { PersonCompact } from '$lib/types/neighborhood';
	import PersonBox from './PersonBox.svelte';
	import Caret from './Caret.svelte';
	import { fade, fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { easeOutBack, solveBackS, markPending } from '$lib/transitions/flight';
	import { getSiblingNavPlan, isIncomingSeat, type SiblingNavPlan } from '$lib/state/siblingNav';
	// The layout model lives in siblingLayout.ts (§19): the flight has to know where a seat in this list
	// will come to REST, and that question is only answerable with this arithmetic. One home for it.
	import {
		CHIP_H,
		GAP,
		PITCH,
		WINDOW_CHIPS,
		WINDOW_H,
		buildItems,
		cumTops,
		chipIndices,
		itemH,
		startItemFor,
		endItemFor,
		maxOffsetFor,
		type SibItem
	} from '$lib/state/siblingLayout';

	type Tiers = { full: PersonCompact[]; half: PersonCompact[]; step: PersonCompact[] };
	type Props = {
		siblings: Tiers;
		cardHeight: number;
		anchorOffset: number; // notch carve height — the chip column's top (card-edge resume). Confirmed by Sam.
		landed?: boolean; // featuredLanded — trigger fades in a beat after landing; also the gondola guard
		/** True while THIS navigation is a §19 in-place mutation. Holds the trigger visible through the
		 *  flight (see triggerShown) — the panel is already showing the incoming list, so the label hiding
		 *  is the incoherent part. Must be render-time, hence a prop rather than an effect. */
		mutating?: boolean;
		open?: boolean; // bindable → the page closes the panel on nav
		/**
		 * QUIET reveal. The panel opens by itself on one arrival (a child promotion), and there the §21.1
		 * per-chip cascade is wrong: it is a deliberate, attention-taking gesture, and playing it on every
		 * such navigation was "hugely distracting" (Sam) — a drop-down performing itself while the user is
		 * reading the card they just arrived at. Quiet → the whole column simply FADES in as one, no
		 * cascade, no roll. A USER opening it still gets the full cascade, because then the gesture is the
		 * answer to something they just asked for. Bindable: the panel clears it the moment the trigger is
		 * used, so the next toggle is loud.
		 */
		quiet?: boolean;
		/** Fired ONLY when a hand is on the trigger, never on a nav-driven open/close. The page turns this
		 *  into a session preference: once you open the panel it stays open as you travel, and once you
		 *  close it, it stays closed. Reported rather than inferred — the page cannot otherwise tell a user
		 *  toggle from its own reset, and guessing that is how a sticky preference gets stuck. */
		onUserToggle?: (open: boolean) => void;
	};
	let {
		siblings,
		cardHeight,
		anchorOffset,
		landed = true,
		mutating = false,
		open = $bindable(false),
		quiet = $bindable(false),
		onUserToggle
	}: Props = $props();

	let count = $derived(siblings.full.length + siblings.half.length + siblings.step.length);
	type Item = SibItem;
	let items = $derived(buildItems(siblings));

	// ── CLIP OVERSHOOT, PER SIDE, MEASURED (083026) ───────────────────────────────────────────────
	// This was a single SHADOW_PAD of 6, which was enough for --chip-shadow and not for
	// --chip-shadow-hover, so the shadow was clean until you pointed at a chip. Sam: "the drop shadow
	// gets cut off. it doesn't gradually fade out like a shadow does but its like an invisible element
	// is over the shadow giving it a hard ledge on both right and left sides."
	//
	// ONE NUMBER CANNOT BE RIGHT ON FOUR SIDES, because the shadow is not centred: it is offset DOWN,
	// so it reaches much further below than above. The children row reached this conclusion first and
	// its arithmetic is reproduced there in full (+page.svelte, the .kids-mask comment) — the same
	// tokens, so the same reaches:
	//     resting  sideways 4.8px   above 1.6px   below 8px
	//     hover    sideways 7px     above 2px     below 12px
	// Raising the uniform value to 10 (the first pass at this) cleared the flanks Sam reported and
	// still cut the BOTTOM, which needs 12. Hence three named values rather than one.
	//
	// THE SIDES AND TOP ARE FREE: nothing lives beside or above the strip inside the mask, so pad
	// there can only ever reveal a chip's own shadow. THE BOTTOM IS THE CONSTRAINED SIDE — it is what
	// hides the straddling chip that starts a full GAP below the last complete item — but there is no
	// conflict to resolve here, because GAP is 16 and the hover shadow needs 12, so the pad stops 4px
	// short of the thing it must not reveal. (The children row's right flank had no such slack and had
	// to choose; this one does not.)
	const SHADOW_SIDE = 8; // hover reaches 7
	const SHADOW_TOP = 4; // hover reaches 2 — the 5px downward offset eats most of the 7px blur
	const SHADOW_BELOW = 12; // hover reaches 5 + 7; safe while GAP (16) is the clear space below

	// ── Cumulative layout (the CUT-CHIP fix) ───────────────────────────────────────────────────────────
	// The old window was a fixed 474px = 7·54 + 6·16, budgeted for CHIPS ONLY. A header is a list item that
	// consumes height, so the moment one fell within the 7-chip window the 7th chip overflowed and was sliced
	// (Sam's Stephen screenshot). The window HEIGHT is fixed and headers consume slots instead. The
	// arithmetic itself lives in siblingLayout.ts — these are thin reactive bindings over it, nothing more.
	let cumTop = $derived(cumTops(items));
	let chipItemIndices = $derived(chipIndices(items));
	let maxOffset = $derived(maxOffsetFor(items, cumTop, chipItemIndices));

	// ── Paging — ACCUMULATING TARGET, no lock (2d) ──────────────────────────────────────────────────────
	// The SPOUSE carousel keeps its pagingLock (a different problem: 3–5 chips). Siblings can be 15+, so a
	// per-page lockout that ignores clicks during the 420ms glide makes reaching the bottom a slog. Instead:
	// every click moves `offset` immediately (clamped, never dropped), and the strip GLIDES toward it via the
	// .paging transition. Rapid clicks re-aim the same transition further down, so the strip chases — reads as
	// acceleration, not interruption. The GONDOLA GUARD stays: paging is inert during a card flight.
	let offset = $state(0);
	let paging = $state(false); // strip transition ON while paging; OFF on reset so close/nav SNAP
	let canPageDown = $derived(offset < maxOffset);
	let canPageUp = $derived(offset > 0);
	let winStartItem = $derived(startItemFor(items, chipItemIndices, offset));
	let winEndItem = $derived(endItemFor(items, cumTop, winStartItem));
	let stripY = $derived(-(cumTop[winStartItem] ?? 0));
	// The MASK clips at the last COMPLETE item (≤ WINDOW_H) → never a partial chip. It rides at the top of the
	// fixed WINDOW_H zone; any leftover space (when headers shrink the item count) sits below it, empty, and
	// the caret is anchored to the zone's fixed bottom (below), so it never bobs.
	let maskH = $derived(
		items.length ? (cumTop[winEndItem] ?? 0) + itemH(items[winEndItem]!) - (cumTop[winStartItem] ?? 0) : 0
	);
	// Bottom clip trims the mask exactly at the last complete item + its shadow, hiding the straddler that
	// starts a full GAP below; sides/top keep the shadow pad. maskH ≤ WINDOW_H, so this inset is ≥ −SHADOW_BELOW.
	let maskClip = $derived(
		`inset(-${SHADOW_TOP}px -${SHADOW_SIDE}px -${SHADOW_BELOW}px -${SHADOW_SIDE}px)`
	);
	function pageStep(dir: 1 | -1) {
		if (!landed) return; // GONDOLA GUARD stays: inert during a card flight
		const next = Math.min(maxOffset, Math.max(0, offset + dir));
		if (next === offset) return;
		paging = true; // glide — no lock; the next click just re-aims this transition further (the chase)
		offset = next;
	}
	const pageDown = () => pageStep(1);
	const pageUp = () => pageStep(-1);

	// ── The per-chip MOUNT cascade (§20.2 no-stagger reversed here — Sam-approved, this reveal only). Each
	// item drops from y:-PITCH with a chained delay; the easing is easeOutBack (REUSED from the settle
	// machinery) for a MICRO-OVERSHOOT — the chip crosses its seat by SIBLING_SETTLE_PX and returns (the
	// baseball-card feel). Amplitude tiny (2–3px) because a 119×54 chip over 70px is small-and-short.
	// Reduced motion → instant, no cascade, no settle.
	//
	// There is intentionally NO out: transition. The reveal needs |global (a local intro is suppressed when
	// the ancestor {#if open} mounts). But |global fires the OUTRO on ANY ancestor unmount — INCLUDING the
	// whole panel being torn down on navigation — which detaches the chips and plays a ghost cascade DURING
	// the incoming card's flight (Sam's report). So the panel tears down SYNCHRONOUSLY on nav, with no outro
	// at all: chips vanish the instant {#if open}/{#if showSiblings} goes false. (The close-cascade is not
	// load-bearing; a per-chip |global outro is exactly what stranded the old card.)
	//
	// flyIn is a PLAIN FUNCTION, not a $derived — a `$derived` used as a transition PARAM compiles the call
	// to `$.get(flyIn)(i)`, and during a teardown-time invocation the derived is already destroyed, so
	// `$.get(...)` returns non-callable and THROWS, aborting the whole reactive flush (this is what froze the
	// old card + panel). A plain function is a direct call with no signal read. It still reads
	// prefersReducedMotion.current live, at intro time, when the reactive context is alive.
	const STAGGER_IN = 38;
	const DUR_IN = 150;
	const SIBLING_SETTLE_PX = 2.5; // dial — the incoming overshoot in px
	const settleS = solveBackS(SIBLING_SETTLE_PX / PITCH); // reuse the settle solver, tiny target
	const settleEase = (t: number) => easeOutBack(t, settleS);
	function flyIn(i: number) {
		return prefersReducedMotion.current
			? { duration: 0 }
			: { y: -PITCH, duration: DUR_IN, delay: i * STAGGER_IN, easing: settleEase };
	}
	let flipMs = $derived(prefersReducedMotion.current ? 0 : 300);

	// ── §19: the IN-PLACE MUTATION ────────────────────────────────────────────────────────────────────
	// A sibling promotion barely changes this list — it loses the person clicked and gains the person
	// left — so the panel persists and mutates rather than closing and rebuilding a list that was 90%
	// correct. Three things happen, and only the third needs any code here:
	//
	//   1. The PROMOTED chip vanishes. Free: it is becoming the featured card, so its key leaves the
	//      keyed each, and there is deliberately no `out:` on .sib-item (see the note above) — it goes
	//      the instant the list changes, which is the same rule flyOut's clicked-box branch enforces
	//      for a row box. A second copy leaving would be the ghost.
	//   2. Its NEIGHBOURS close the gap. Also free: `animate:flip` is already on .sib-item, so the
	//      survivors glide. Chips are discrete objects occupying real space; the gap is real and
	//      closing it is motion, not a re-layout.
	//   3. The DEMOTED person arrives as a new chip, and the strip may have to SCROLL to make his seat
	//      visible — which it does while the card is still flying, so the carousel is seen to catch it.
	//
	// The scroll target is computed before the swap (siblingNav.ts), because the traveller has to aim
	// at where the seat COMES TO REST, not where it is mid-glide.
	// §21.2 — the trigger must not blink out DURING a mutation. `landed` goes false for the whole flight and
	// the trigger's `.shown` rides it, so the label vanished instantly while its own chips stayed put: the
	// list changed and the header hid, which is incoherent. That gate is §21.3's reveal rule and it is right
	// everywhere else — it stops the INCOMING person's count painting on the OUTGOING card, which caused the
	// session's first regression — but on a mutation the panel is DELIBERATELY already showing the incoming
	// person's list, so the label was the last part of it still obeying a rule about not showing them. (In
	// practice the number rarely even changes: siblings share a set, so losing one and gaining one leaves N
	// alone — measured "Siblings (4)" throughout.)
	//
	// `mutating` is a PROP, not local state set in an effect. Tried that first and it still flashed for 13
	// frames: an effect runs AFTER the DOM update, so for one render pass the class was already gone, and
	// `.sibling-trigger` drops to opacity 0 INSTANTLY (no transition on the base state, deliberately) and
	// then takes the 160ms-delayed 220ms fade to come back. Render-time information has to arrive as a prop.
	// Scoped to the label only — `landed` still gates the GONDOLA GUARD below, so paging stays inert.
	let triggerShown = $derived(landed || mutating);

	let appliedPlan: SiblingNavPlan | null = null;
	$effect(() => {
		siblings; // the list changing IS the navigation
		untrack(() => {
			const plan = getSiblingNavPlan();
			if (plan && open && plan !== appliedPlan) {
				appliedPlan = plan;
				quiet = false; // no reveal of any kind — this panel never went away
				// GLIDE, not snap. The spouse notch's equivalent (spouseOffset) deliberately SNAPS so no
				// chip rect moves mid-flight; here the movement is the point — Sam's ruling on the fork is
				// that the carousel scrolls to catch the card visibly, WHILE it flies, so the two motions
				// resolve together instead of one after the other.
				paging = true;
				offset = plan.targetOffset;
				return;
			}
			// EVERY OTHER ARRIVAL STARTS AT THE TOP. This component is not remounted per person — it is one
			// instance inside `{#if showSiblings}` — so `offset` is the same variable from one card to the
			// next, and it used to carry over: travel with the panel open, page down, promote a parent, and
			// the new person's list reopened already scrolled, its first chips hidden above the fold and
			// the trigger replaced by an up-caret for a list nobody had scrolled. Only `toggleOpen` reset
			// it, so a hand on the trigger was the sole way back to the top. `paging` off → the strip SNAPS
			// (the panel is shut for the flight, so there is nothing to see moving).
			offset = 0;
			paging = false;
		});
	});

	// The chips' entrance, dispatched per item. Everything here used to be one `in:fly`; the mutation
	// adds one case to it.
	function chipIn(node: Element, params: { i: number; id: string | null }) {
		// THE DEMOTED PERSON'S CHIP. §19.4: letting the panel persist through a navigation is the one
		// place the "nothing incoming paints before landing" rule is relaxed, and it is safe only because
		// the list is mostly the same people. This chip is the exception — it belongs to the card that is
		// still in the air. Hold it hidden exactly like any other destination box (markPending), and let
		// the demote's own landing reveal it via the atomic swap. That is §18.4's hand-off doctrine: hold
		// the seat hidden, land on it, expose an already-solid identical object.
		if (params.id && isIncomingSeat(params.id)) return markPending(node);
		if (quiet) return { duration: 0 };
		return fly(node, flyIn(params.i));
	}

	// ── Ghost-safe CLOSE (container-collapse) ────────────────────────────────────────────────────────
	// The open cascade needs per-chip in:fly|global — and |global fires on ANY ancestor mount/unmount,
	// which on NAV plays a detached outro that stranded the card (the ghost). So the close is NOT a reverse
	// cascade. It is ONE element — the panel body — collapsing (max-height + opacity + a tiny rise), via a
	// LOCAL out: transition (no |global). Local semantics do the routing for free:
	//   • user clicks the trigger to close → the {#if open} block toggles by its OWN condition → out: PLAYS.
	//   • nav to a NON-sibling person → the ancestor {#if showSiblings} unmounts → local out: is SUPPRESSED
	//     → instant vanish (the ghost fix, preserved).
	// The one case local can't distinguish is nav to a SIBLING person, where the page resets siblingsOpen on
	// the SAME component — that also toggles {#if open}, so out: would fire. `userClosing` gates it: set true
	// ONLY when the trigger closes the panel, read once at teardown. Nav sets open=false without it → the
	// transition returns duration:0 → instant. Invariant: open===true always implies userClosing===false
	// (opening clears it), so a nav-close is never mistaken for a user-close. Reduced motion → instant too.
	// The read Sam wanted is 80% ROLL-UP / 20% fade. Opacity hits every pixel at once, so sharing the full
	// timeline it dominated (~60% fade / 40% roll). Fix: DECOUPLE. Use NO easing (t is LINEAR in time, 1→0),
	// shape the roll-up by hand (cubicIn) and hold opacity at 1 until the final FADE_TAIL of TIME — so the
	// split is an exact fraction of the clock, independent of any easing curve. The max-height roll-up (with
	// overflow hidden, content top-anchored) clips BOTTOM-UP: chip 7 vanishes first, chip 1 last — LIFO, the
	// reverse of the top-down entrance cascade. With opacity no longer masking it, that direction reads.
	const QUIET_MS = 220; // the self-opening fade — slower than a pop, quieter than the cascade
	const CLOSE_MS = 170; // tighter + faster than the open cascade (~378ms for a 7-chip window)
	const FADE_TAIL = 0.2; // DIAL: opacity holds at 1, then fades over the final 20% of the collapse (≈34ms)
	let userClosing = $state(false);
	function toggleOpen() {
		quiet = false; // a hand on the trigger → this toggle and every one after it is the loud gesture
		if (open) {
			userClosing = true; // closing via the trigger → animate the collapse (from the current scroll pos)
		} else {
			userClosing = false; // opening → clear any stale intent, start fresh at the top
			offset = 0;
			paging = false;
		}
		open = !open;
		onUserToggle?.(open);
	}
	function collapse(node: HTMLElement) {
		const animate = userClosing && !prefersReducedMotion.current;
		userClosing = false; // consume the intent so a following nav-close stays instant
		if (!animate) return { duration: 0 }; // nav teardown or reduced motion → instant, no animation
		const h = node.offsetHeight; // measured natural height → collapse to 0
		return {
			duration: CLOSE_MS,
			// no easing → t linear in time. roll = cubicIn over time (slow start, accelerating fold); opacity
			// flat at 1 until the last FADE_TAIL of time, then a quick fade — the roll-up carries the motion.
			css: (t: number) => {
				const roll = 1 - Math.pow(1 - t, 3); // cubicIn: height remaining, 1→0, accelerating
				const opacity = Math.min(1, t / FADE_TAIL);
				return `overflow: hidden; max-height: ${roll * h}px; opacity: ${opacity};`;
			}
		};
	}

	// The arrows fade IN only after the cascade has fully landed — derived from the real cascade end
	// (STAGGER × visible + duration), not hardcoded. Fade OUT / reset when the panel closes.
	let visibleCount = $derived(Math.min(count, WINDOW_CHIPS));
	let cascadeEnd = $derived((visibleCount - 1) * STAGGER_IN + DUR_IN);
	let arrowsShown = $state(false);
	$effect(() => {
		if (!open) {
			arrowsShown = false;
			// Do NOT reset offset here — let the panel collapse from its current scroll position (the reset to
			// the top happens on the next OPEN, in toggleOpen). Resetting mid-collapse would jump the content.
			return;
		}
		arrowsShown = false;
		if (prefersReducedMotion.current) {
			arrowsShown = true;
			return;
		}
		const t = setTimeout(() => (arrowsShown = true), cascadeEnd);
		return () => clearTimeout(t);
	});
</script>

<div class="sibling-zone">
	<!-- Top slot: the word (offset 0) ↔ the UP-ARROW (offset > 0) share this one slot. The word's underline
	     aligns with the spouse chip's bottom edge; the first chip's top stays at the card-edge resume. -->
	<div class="top-slot" style="height: {anchorOffset}px">
		{#if open && offset > 0}
			<Caret
				char="⌃"
				class="sib-arrow sib-up"
				visible={arrowsShown && canPageUp}
				disabled={!landed || !canPageUp}
				onclick={pageUp}
				ariaLabel="Previous siblings"
			/>
		{:else}
			<button
				type="button"
				class="sibling-trigger"
				class:open
				class:shown={triggerShown}
				aria-expanded={open}
				onclick={toggleOpen}
			>
				<span class="sib-label">Siblings ({count})</span><!--
			 --><svg class="sib-chev" viewBox="0 0 10 8" aria-hidden="true" focusable="false"
					><polyline points="1.6,1.9 5,6.1 8.4,1.9" /></svg>
			</button>
		{/if}
	</div>

	{#if open}
		<!-- ONE collapsing body: the mask + the down-caret ride together so the close is a single object
		     folding up (out:collapse), never a per-chip reverse cascade. out: is LOCAL (no |global) — it plays
		     on a trigger-close and is suppressed on ancestor unmount (nav); `userClosing` gates the same-
		     component nav-reset to instant. The OPEN cascade is unchanged: the chips' in:fly|global still fire
		     as this body mounts. -->
		<!-- QUIET: one opacity fade on the column instead of the cascade. A fade is the one container-level
		     transition §21.1's "never animate the container" rule does not apply to — that rule is about
		     GEOMETRY (a container that grows animates one box with the chips as cargo); alpha touches every
		     chip equally and has no geometry to get wrong. -->
		<div class="sibling-body" out:collapse in:fade|global={{ duration: quiet ? QUIET_MS : 0 }}>
			<!-- FIXED-height window zone (WINDOW_H, never changes) so the caret below it never bobs. The MASK
			     rides at its top and clips at the last COMPLETE item (maskH ≤ WINDOW_H) — never a partial chip;
			     leftover space (headers shrink the item count) stays empty below the mask, inside this zone. -->
			<!-- data-sib-offset: the live chip-offset, published the same way the spouse notch publishes
			     data-spouse-offset. §19's plan is computed OUTSIDE the component (before the swap, while
			     this panel still shows the outgoing list), and the minimal-scroll rule needs to know where
			     the strip actually is to work out how little it can move. -->
			<div class="sibling-window" style="height: {WINDOW_H}px" data-sib-offset={offset}>
				<!-- The STRIP holds all items and translates by the cumulative offset on a page (transition only
				     while .paging). clip-path (not overflow) so drop shadows escape the sides. -->
				<div class="sibling-mask" class:paging style="height: {maskH}px; clip-path: {maskClip}">
					<div class="sibling-strip" class:paging style:transform="translateY({stripY}px)">
						{#each items as item, i (item.kind === 'chip' ? item.chip.id : item.label)}
							<!-- in: only, |global for the ancestor-mount reveal. NO per-chip out: — the container
							     collapse (above) handles close; a |global outro is what stranded the old card as a ghost. -->
							<!-- data-sib-seat-id is the demote's landing hook. Deliberately NOT data-flight-id:
							     that attribute is also what warmPersonLinks reads through `closest()` to decide
							     which box was clicked, so putting it on a sibling chip would silently give every
							     sibling navigation a clickedId it has never had and re-clock its flight. A
							     separate name keeps the seat findable without touching the click path. -->
							<div
								class="sib-item"
								class:is-header={item.kind === 'header'}
								data-sib-seat-id={item.kind === 'chip' ? item.chip.id : undefined}
								in:chipIn|global={{ i, id: item.kind === 'chip' ? item.chip.id : null }}
								animate:flip={{ duration: flipMs }}
							>
								{#if item.kind === 'header'}
									<div class="sibling-header">{item.label}</div>
								{:else}
									<PersonBox person={item.chip} relation="sibling" dimmed={!!item.chip.dy_young} />
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
			{#if canPageDown}
				<!-- FIXED position: the caret sits below the fixed WINDOW_H zone, so it never moves as the item
				     count changes (Sam: a moving target sabotages the acceleration → fat-fingered chips). -->
				<div class="down-caret">
					<Caret
						char="⌄"
						class="sib-arrow sib-down"
						visible={arrowsShown}
						disabled={!landed || !canPageDown}
						onclick={pageDown}
						ariaLabel="More siblings"
					/>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.sibling-zone {
		position: absolute;
		top: 0;
		/* 30px off the card's right edge.
		   IT DOES NOT SCALE WITH u, AND THAT IS A KNOWN DEFECT RATHER THAN A DECISION (083026). Every
		   other length in the composition shrinks with the frame unit; this one holds, so it is
		   proportionally widest exactly where width is scarcest — Sam at 1100px: "there actually is a
		   decent gap between the siblings menu and the right side of the featured card", sitting there
		   while the menu was about to be dropped for want of room. A `--sib-gap` published by the stage
		   was built and REVERTED with the rest of that attempt; the observation stands and is recorded
		   here so the next attempt starts from it. See roadmap §53 for why the attempt came out. */
		left: calc(100% + 30px);
		/* z-index 0, not 2 (§19). The demoting card now lands ON a chip in this panel, and it has to be
		   SEEN doing it while still passing BEHIND the arriving card — the two-baseball-cards read, with
		   the arriving one in front (§21.2 bug D). The hero is z 2 and the demote is z 1, so the panel has
		   to sit below 1 for the landing to be visible. Inert at rest: the zone begins 30px clear of the
		   card's right edge, so it overlaps nothing it used to win against, and the card already painted
		   above it (equal z, later in DOM). Verified by screenshotting the settled page, not by reasoning
		   about the property — §18.6. */
		z-index: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	/* The collapsing body — mask + down-caret as one object. transform-origin top so the fold reads as a
	   roll-up from the word. At rest it carries no inline style (overflow visible → chip shadows show); the
	   collapse transition sets overflow:hidden + max-height for the fold. */
	.sibling-body {
		display: flex;
		flex-direction: column;
		align-items: center;
		transform-origin: top center;
	}

	/* FIXED-height window zone (WINDOW_H inline). The mask rides at its top; leftover space (headers shrink
	   the item count) stays empty below, keeping the caret — which sits below this zone — at a fixed y. */
	.sibling-window {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
	}

	/* The word/up-arrow slot: bottom-aligned so the word's underline sits at the spouse chip's bottom edge
	   (≈325 on Anson — where sibling #1's top used to sit before the anchor fix). padding-bottom raises it off
	   the chip column (whose top is the card-edge resume, ≈340). */
	.top-slot {
		width: 119px; /* = sibling chip width → button/arrow centre over the column */
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-bottom: 15px;
	}
	/* De-emphasised: PLAIN TEXT — gray, ALL CAPS. No pill/bg/border, and (Aug 4) no dashed underline and no
	   +/− either. Sam: the content is right but the treatment wanted "something modern and professional
	   with the click to expand feature, some kind of visual or tactile responsiveness", while staying
	   subtle — "the page already feels crammed with details so I'm not looking to make it flashy."
	   A CHEVRON carries the state and rotates on toggle; hover deepens the colour; the press depresses.
	   Nothing moves laterally, which is what the old hover did by accident (see the :hover rule below). */
	.sibling-trigger {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 0;
		border: none;
		background: none;
		color: rgb(120, 113, 108); /* stone-500 */
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
		cursor: pointer;
		opacity: 0;
		/* NO opacity transition on the base state → hiding is INSTANT, matching the spouse chips (held at
		   opacity 0 the moment a nav starts, never a fade-out that would show the incoming count on the old
		   card). The fade-IN transition lives on .shown, so it only animates on the reveal at landing. */
		transition: color 150ms ease;
	}
	.sibling-trigger.shown {
		opacity: 1;
		transition:
			opacity 220ms ease 160ms,
			color 150ms ease;
	}
	/* The chevron is ONE glyph rotated, never two swapped, so the open/closed states cannot drift apart
	   optically. Two nested spans because the two transforms must COMPOSE rather than fight:
	     .sib-chev     — the rotation (the state)
	     .sib-chev-ink — the optical correction (static)
	   ⌄ has asymmetric ink: measured via canvas TextMetrics for the carets, it sits 4.92px BELOW the font
	   centre. Correcting it on the INNER span means the correction rides the rotation: with the ink pulled
	   to the centre, a 180° turn about that same centre leaves it there — so the glyph is dead-centre in
	   both states for free, which swapping ⌃ for ⌄ would not give. */
	/* AN SVG CHEVRON, NOT A TEXT GLYPH. The requirement is "increase the size of the chevron and keep it
	   in the same fixed position, not pivoting on the tip" — and a text glyph cannot guarantee that. Its
	   ink sits at some font-dependent offset inside its line box, so rotating about the box centre swings
	   the mark, and correcting the offset needs a constant I measured wrong twice: once by putting it
	   INSIDE the rotating element (where the 180° turn doubles the error instead of cancelling it — the
	   ink jumped 10.80px), and once by trusting `Range.getBoundingClientRect()`, which returns the LINE
	   BOX and reported a 5px glyph as 20px tall. That second one is why a measurement said 0.00px while
	   the rendered pixels plainly disagreed — §21.3's false-green shape exactly, and a screenshot is what
	   settled it.
	   In an SVG the ink IS the box. The stroke spans y 1.2→7.0 in a 0→8 viewBox, so it is symmetric about
	   the centre by construction: `transform-origin: center` rotates it about its own middle, and no font
	   metric, size change or typeface swap can move it. Verified on the rendered pixels, not on a rect. */
	.sib-chev {
		display: block;
		/* NARROWER, SAME HEIGHT (Sam: "the width of the caret wasn't my concern but the width can be
		   smaller leave the height"). Done in the GEOMETRY, not by squashing the box: preserveAspectRatio
		   scales the drawing uniformly, so shrinking the element's width alone would have taken the height
		   with it. The viewBox lost two units of width and the polyline's horizontal reach came in with
		   it, which makes the chevron steeper rather than smaller — the stroke's rendered height is
		   unchanged at ~6.5px while its width drops ~21%, from ~11.8px to ~9.3px.
		   The polyline is vertically SYMMETRIC in the viewBox (stroke spans y 1.05→6.95 of 0→8, centre
		   exactly 4), so `transform-origin: center` remains the mark's own centre and the 180° turn cannot
		   move it. That symmetry is the whole reason this is an SVG — keep it if the shape is ever
		   retuned. */
		width: 11px;
		height: 9px;
		overflow: visible;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
		stroke-linecap: round;
		stroke-linejoin: round;
		transform-origin: center;
		transition: transform 160ms ease;
	}
	.sibling-trigger.open .sib-chev {
		transform: rotate(180deg);
	}
	/* HOVER = the whole thing gets LIGHTER, the same response the NB headers give (`hover:opacity-60` on
	   the header button). Sam asked for that specific match, and it is the right one: this control and an
	   NB header are the same kind of object — a quiet, expandable label the reader may never touch.
	   Applied to the CHILDREN, never to the button's own opacity, because that opacity is the reveal gate
	   (§21.3): a rule on the button would fight `.shown` on identical specificity, and worse, hovering a
	   trigger that is deliberately hidden mid-flight would paint it at 0.6 — the exact regression the gate
	   exists to prevent. */
	.sib-label,
	.sib-chev {
		transition:
			opacity 150ms ease,
			transform 160ms ease;
	}
	/* The button is a flex row with align-items:center, so the chevron's box centre already lines up with
	   the label's. The label is UPPERCASE, whose optical centre sits above its line box's centre by the
	   descender space it never uses — this is the one nudge that closes that gap, measured on the pixels. */
	.sib-chev {
		margin-top: -1px;
	}
	.sibling-trigger:hover .sib-label,
	.sibling-trigger:hover .sib-chev {
		opacity: 0.6;
	}
	@media (prefers-reduced-motion: reduce) {
		.sib-chev {
			transition: opacity 150ms ease;
		}
	}
	/* THE HOVER TICK (Sam, Aug 4: "when you hover over the header it ticks right instantly like 3px which
	   feels awkward"). It was an authoring accident, not a design choice: `.sibling-trigger:hover` had been
	   grouped into the `.sib-toggle-mark` rule, so hovering the trigger applied that mark's
	   `margin-left: 6px` to the WHOLE BUTTON — and because the button is centred in its slot, a 6px left
	   margin reads as a ~3px jump right. The mark is gone with the restyle; the hover rule has its own
	   body, and it changes colour only. Nothing in this control moves laterally on hover. */
	.sibling-trigger.open {
		color: rgb(68, 64, 60); /* stone-700 */
	}

	/* .sibling-mask: height (≤ WINDOW_H, clips at the last complete item) + clip-path set inline; clip-path
	   (not overflow) lets chip shadows render past the edges. Its height glides in lockstep with the strip
	   while paging (a header entering/leaving the visible set changes how many items fit → maskH shifts;
	   without the transition the clip boundary would snap mid-glide). */
	.sibling-mask.paging {
		transition: height 420ms cubic-bezier(0.34, 1.3, 0.64, 1);
	}
	.sibling-strip {
		display: flex;
		flex-direction: column;
		gap: 1rem; /* 16px = GAP */
	}
	/* Transition applies ONLY while paging — never on the offset reset, so the strip SNAPS on close/nav.
	   ~420ms easeOutBack (a touch of overshoot) so a page reads as travel-and-stop. With the accumulating
	   target, rapid clicks re-aim this same transition further down → the strip chases (acceleration). */
	.sibling-strip.paging {
		transition: transform 420ms cubic-bezier(0.34, 1.3, 0.64, 1);
	}
	@media (prefers-reduced-motion: reduce) {
		.sibling-strip.paging,
		.sibling-mask.paging {
			transition: none;
		}
	}
	.sib-item {
		flex: 0 0 auto;
	}
	/* Asymmetric header gaps via negative margins that trim the 16px flex gap (matches gapAfter() in the
	   script — keep in sync). Above a header: 16 − 6.4 = 9.6px (−40%). Below: 16 − 12.8 = 3.2px (−80%). The
	   header sits nearer the chips it labels than the content above it (proximity grouping). */
	.sib-item.is-header {
		margin-top: -6.4px;
		margin-bottom: -12.8px;
	}
	/* FIXED height (= HEADER_H) so the cumulative window math is exact. Centred, roomier than before. */
	.sibling-header {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 28px;
		text-align: center;
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: rgb(120, 113, 108);
	}
	/* 2b: real breathing room below the window — the caret sits OUTSIDE the carousel's bounds, clear of the
	   7th chip's shadow (SHADOW_BELOW 12px, was 6 when this was written). 20px margin ≈ 8px below the
	   shadow edge — still clear, and the caret is the one thing that must not sit inside it. */
	.down-caret {
		display: flex;
		justify-content: center;
		margin-top: 20px;
	}
</style>
