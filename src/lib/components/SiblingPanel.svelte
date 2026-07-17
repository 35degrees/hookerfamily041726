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
	const PITCH = CHIP_H + GAP; // 70 — each chip drops from exactly where its predecessor sits
	const WINDOW = 7; // Sam: visible window = 7 sibling chips, then a down-arrow (supersedes card-height)
	const SHADOW_PAD = 6; // clip overshoot so no chip's drop shadow is cut (fixes the 7th-chip clip)
	let maskH = $derived(WINDOW * CHIP_H + (WINDOW - 1) * GAP); // 474px
	// Top clips −4 (chips slide under the word in the gap; the first chip's top shadow still shows); the other
	// three sides overshoot −SHADOW_PAD so left/right/BOTTOM shadows render — the 7th chip is no longer cut.
	let maskClip = $derived(`inset(-4px -${SHADOW_PAD}px -${SHADOW_PAD}px -${SHADOW_PAD}px)`);

	// ── Paging (the spouse-carousel model: single-step, pure-pitch strip transform, pagingLock lockout,
	// gondola guard on featuredLanded) ───────────────────────────────────────────────────────────────
	let offset = $state(0);
	let pagingLock = $state(false);
	let canPageDown = $derived(offset + WINDOW < count);
	let canPageUp = $derived(offset > 0);
	let stripY = $derived(-(offset * PITCH));
	function pageStep(dir: 1 | -1) {
		if (pagingLock || !landed) return; // inert during a flight (gondola guard)
		if (dir === 1 ? !canPageDown : !canPageUp) return;
		pagingLock = true; // .paging → the strip transition applies for THIS user page only
		offset += dir;
		setTimeout(() => (pagingLock = false), 440); // ~= the 420ms strip transition
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

	// The arrows fade IN only after the cascade has fully landed — derived from the real cascade end
	// (STAGGER × visible + duration), not hardcoded. Fade OUT / reset when the panel closes.
	let visibleCount = $derived(Math.min(count, WINDOW));
	let cascadeEnd = $derived((visibleCount - 1) * STAGGER_IN + DUR_IN);
	let arrowsShown = $state(false);
	$effect(() => {
		if (!open) {
			offset = 0; // reset paging when the panel closes (or on nav — the page closes it)
			arrowsShown = false;
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
				class="sib-arrow"
				visible={arrowsShown && canPageUp}
				disabled={pagingLock || !landed}
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
				onclick={() => (open = !open)}
			>
				Siblings ({count})
			</button>
		{/if}
	</div>

	{#if open}
		<!-- The MASK windows 7 chips; the STRIP holds all of them and translates by pure pitch on a page
		     (transition only while .paging). clip-path (not overflow) so drop shadows escape the sides/bottom. -->
		<div class="sibling-mask" style="height: {maskH}px; clip-path: {maskClip}">
			<div class="sibling-strip" class:paging={pagingLock} style:transform="translateY({stripY}px)">
				{#each items as item, i (item.kind === 'chip' ? item.chip.id : item.label)}
					<!-- in: only, |global for the ancestor-mount reveal. NO out: — teardown is synchronous on nav
					     (see the cascade note above); a |global outro is what stranded the old card as a ghost. -->
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
					class="sib-arrow"
					visible={arrowsShown}
					disabled={pagingLock || !landed}
					onclick={pageDown}
					ariaLabel="More siblings"
				/>
			</div>
		{/if}
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
	   the edges. No block here — the inline styles carry it. */
	.sibling-strip {
		display: flex;
		flex-direction: column;
		gap: 1rem; /* 16px = GAP */
	}
	/* Transition applies ONLY while paging (a user page) — never on the offset reset, so the strip SNAPS on
	   close/nav. ~420ms easeOutBack (a touch of overshoot) so a page reads as travel-and-stop. */
	.sibling-strip.paging {
		transition: transform 420ms cubic-bezier(0.34, 1.3, 0.64, 1);
	}
	@media (prefers-reduced-motion: reduce) {
		.sibling-strip.paging {
			transition: none;
		}
	}
	.sib-item {
		flex: 0 0 auto;
	}
	.sibling-header {
		width: 100%;
		padding: 2px 0;
		text-align: center;
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: rgb(120, 113, 108);
	}
	.down-caret {
		display: flex;
		justify-content: center;
		margin-top: 6px;
	}
</style>
