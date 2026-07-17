<script lang="ts">
	import type { PersonCompact } from '$lib/types/neighborhood';
	import PersonBox from './PersonBox.svelte';
	import Caret from './Caret.svelte';
	import { fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { prefersReducedMotion } from 'svelte/motion';
	import { easeOutBack, solveBackS } from '$lib/transitions/flight';

	type Tiers = { full: PersonCompact[]; half: PersonCompact[]; step: PersonCompact[] };
	type Props = {
		siblings: Tiers;
		cardHeight: number;
		anchorOffset: number; // notch carve height — the chip column's top (card-edge resume). Confirmed by Sam.
		landed?: boolean; // featuredLanded — trigger fades in a beat after landing; also the gondola guard
		open?: boolean; // bindable → the page closes the panel on nav
	};
	let { siblings, cardHeight, anchorOffset, landed = true, open = $bindable(false) }: Props = $props();

	let count = $derived(siblings.full.length + siblings.half.length + siblings.step.length);
	function tier(list: PersonCompact[]): PersonCompact[] {
		return [...list.filter((s) => !s.dy_young), ...list.filter((s) => s.dy_young)];
	}
	type Item = { kind: 'header'; label: string } | { kind: 'chip'; chip: PersonCompact };
	let items = $derived.by<Item[]>(() => {
		const out: Item[] = [];
		for (const chip of tier(siblings.full)) out.push({ kind: 'chip', chip });
		if (siblings.half.length) {
			out.push({ kind: 'header', label: 'Half-siblings' });
			for (const chip of tier(siblings.half)) out.push({ kind: 'chip', chip });
		}
		if (siblings.step.length) {
			out.push({ kind: 'header', label: 'Step-siblings' });
			for (const chip of tier(siblings.step)) out.push({ kind: 'chip', chip });
		}
		return out;
	});

	// ── Geometry / carousel constants ────────────────────────────────────────────────────────────────
	const CHIP_H = 54;
	const GAP = 16;
	const PITCH = CHIP_H + GAP; // 70 — the mount-cascade drop distance (layout below is cumulative, not pitch)
	const HEADER_H = 28; // FIXED header height (the CSS matches) so the cumulative height model is exact
	const WINDOW = 7; // Sam: 7 CHIPS visible; headers among them ADD height — a chip is never sliced
	const SHADOW_PAD = 6; // clip overshoot so no chip's drop shadow is cut
	let maskClip = $derived(`inset(-4px -${SHADOW_PAD}px -${SHADOW_PAD}px -${SHADOW_PAD}px)`);

	// ── Cumulative layout (the CUT-CHIP fix) ───────────────────────────────────────────────────────────
	// The old window was a fixed 474px = 7·54 + 6·16, budgeted for CHIPS ONLY. A header is a list item that
	// consumes height, so the moment one fell within the 7-chip window the 7th chip overflowed and was sliced
	// (Sam's Stephen screenshot). The cap still counts 7 CHIPS, but the window HEIGHT is now derived from the
	// real items in view — chips plus whatever headers land among them.
	function itemH(it: Item): number {
		return it.kind === 'header' ? HEADER_H : CHIP_H;
	}
	let cumTop = $derived.by(() => {
		const tops: number[] = [];
		let y = 0;
		for (const it of items) {
			tops.push(y);
			y += itemH(it) + GAP; // flex column, GAP between every item
		}
		return tops;
	});
	let chipItemIndices = $derived.by(() => {
		const idx: number[] = [];
		items.forEach((it, i) => {
			if (it.kind === 'chip') idx.push(i);
		});
		return idx;
	});
	let maxOffset = $derived(Math.max(0, count - WINDOW));

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
	// Window's first item = the first visible chip, extended UP to include its tier header when one sits
	// directly above — so a tier label shows atop its first visible chip instead of clipping just off-screen.
	let winStartItem = $derived.by(() => {
		let s = chipItemIndices[offset] ?? 0;
		if (s > 0 && items[s - 1]?.kind === 'header') s -= 1;
		return s;
	});
	let winEndItem = $derived(chipItemIndices[Math.min(offset + WINDOW - 1, count - 1)] ?? items.length - 1);
	let stripY = $derived(-(cumTop[winStartItem] ?? 0));
	// Window height = exact pixel span of the visible items (chips + headers among them). Grows when a header
	// is in view so the 7th chip — shadow included — is never cut.
	let maskH = $derived(
		items.length ? (cumTop[winEndItem] ?? 0) + itemH(items[winEndItem]!) - (cumTop[winStartItem] ?? 0) : 0
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
	const CLOSE_MS = 170; // tighter + faster than the open cascade (~378ms for a 7-chip window)
	const FADE_TAIL = 0.2; // DIAL: opacity holds at 1, then fades over the final 20% of the collapse (≈34ms)
	let userClosing = $state(false);
	function toggleOpen() {
		if (open) {
			userClosing = true; // closing via the trigger → animate the collapse (from the current scroll pos)
		} else {
			userClosing = false; // opening → clear any stale intent, start fresh at the top
			offset = 0;
			paging = false;
		}
		open = !open;
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
	let visibleCount = $derived(Math.min(count, WINDOW));
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
				class:shown={landed}
				aria-expanded={open}
				onclick={toggleOpen}
			>
				Siblings ({count})
			</button>
		{/if}
	</div>

	{#if open}
		<!-- ONE collapsing body: the mask + the down-caret ride together so the close is a single object
		     folding up (out:collapse), never a per-chip reverse cascade. out: is LOCAL (no |global) — it plays
		     on a trigger-close and is suppressed on ancestor unmount (nav); `userClosing` gates the same-
		     component nav-reset to instant. The OPEN cascade is unchanged: the chips' in:fly|global still fire
		     as this body mounts. -->
		<div class="sibling-body" out:collapse>
			<!-- The MASK windows 7 chips; the STRIP holds all of them and translates by pure pitch on a page
			     (transition only while .paging). clip-path (not overflow) so drop shadows escape the sides/bottom. -->
			<div class="sibling-mask" class:paging style="height: {maskH}px; clip-path: {maskClip}">
				<div class="sibling-strip" class:paging style:transform="translateY({stripY}px)">
					{#each items as item, i (item.kind === 'chip' ? item.chip.id : item.label)}
						<!-- in: only, |global for the ancestor-mount reveal. NO per-chip out: — the container
						     collapse (above) handles close; a |global outro is what stranded the old card as a ghost. -->
						<div class="sib-item" in:fly|global={flyIn(i)} animate:flip={{ duration: flipMs }}>
							{#if item.kind === 'header'}
								<div class="sibling-header">{item.label}</div>
							{:else}
								<PersonBox person={item.chip} relation="sibling" dimmed={!!item.chip.dy_young} />
							{/if}
						</div>
					{/each}
				</div>
			</div>
			{#if canPageDown}
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
		left: calc(100% + 30px); /* 30px off the card's right edge */
		z-index: 2;
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
	/* De-emphasised: PLAIN TEXT — gray, ALL CAPS, dashed underline. No pill/bg/border. */
	.sibling-trigger {
		padding: 0;
		border: none;
		background: none;
		color: rgb(120, 113, 108); /* stone-500 */
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		text-decoration: underline dashed;
		text-decoration-thickness: 1px;
		text-underline-offset: 3px;
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
	.sibling-trigger:hover,
	.sibling-trigger.open {
		color: rgb(68, 64, 60); /* stone-700 */
	}

	/* .sibling-mask: height + clip-path set inline; clip-path (not overflow) lets chip shadows render past
	   the edges. Its HEIGHT glides in lockstep with the strip while paging (a header entering/leaving the
	   window changes maskH — without the transition the mask would snap taller/shorter mid-glide). */
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
	   7th chip's shadow (SHADOW_PAD 6px). 20px margin ≈ 14px below the shadow edge. */
	.down-caret {
		display: flex;
		justify-content: center;
		margin-top: 20px;
	}
</style>
