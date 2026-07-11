<script lang="ts">
	import type { PageData } from './$types';
	import PersonBox from '$lib/components/PersonBox.svelte';
	import FeaturedCard from '$lib/components/FeaturedCard.svelte';
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { prefersReducedMotion } from 'svelte/motion';
	import { cardinalWord, cardinalWordLower, possessive } from '$lib/utils/dates';
	import { page } from '$app/state';
	import { featured } from '$lib/state/featured.svelte';
	import { loadFeatured, warmPersonLinks } from '$lib/state/navigate';
	import { buildRoster } from '$lib/data/roster';
	import { flyOut, growFrom, shrinkTo, markPending, morphIn, getPivotId } from '$lib/transitions/flight';

	let { data }: { data: PageData } = $props();

	// Mirror cold-load data into the featured-person singleton and read the page
	// back out of it (Steps 1–2). SSR: effects don't run, so `current` is null and
	// we fall back to `data`. Client: $effect.pre re-syncs BEFORE the DOM update.
	$effect.pre(() => featured.set(data));
	const f = $derived(featured.current ?? data);

	// Dev guard: f is one atomic FeaturedData, so neighborhood and person must
	// describe the same focal id. If this logs, a warm focus left them out of sync.
	$effect(() => {
		if (import.meta.env.DEV && f.neighborhood.focus.id !== f.person.id) {
			console.error(
				`[featured] focus mismatch: neighborhood=${f.neighborhood.focus.id} person=${f.person.id}`
			);
		}
	});

	// popstate reconcile (Step 2): back/forward across shallow history changes the
	// URL without re-running load. Track ONLY page.url; read state under untrack.
	$effect(() => {
		const slug = page.url.pathname.split('/')[2];
		if (!slug) return;
		untrack(() => {
			if (featured.current?.person.slug === slug) return;
			if (data.person.slug === slug) featured.set(data);
			else void loadFeatured(slug);
		});
	});

	// Re-focus choreography (DESIGN "RESOLVED ARCHITECTURE"): one roster per focus,
	// each person in exactly one role-zone, keyed by person id. Zoom is fixed at 1
	// for now; buildRoster/zone-rendering are already zoom-parameterized so z2/z3
	// slot into the same seams. Transitions are NOT wired yet — this milestone is
	// structure + notch docking only.
	const zoom = 1;
	const roster = $derived(buildRoster(f, zoom));

	// animate:flip glides SURVIVORS (e.g. children shared across a spouse swap) to their new
	// positions. Its fix() mis-pins LEAVERS (measured post-insertion), but flyOut's WAAPI
	// position:fixed pin overrides that, so leavers still land at their true click-captured rect.
	const flipMs = $derived(prefersReducedMotion.current ? 0 : 420);

	// The card morphs via transform (no layout effect), so without this the children
	// row's Y would snap/jerk to the new card's height. Bind the current card's
	// natural height and give the slot an explicit, CSS-transitioned height — the row
	// then GLIDES in lockstep with the morph. `mounted` keeps SSR/hydration content-
	// sized (no explicit height until the client measures), avoiding a 0-height flash.
	let cardHeight = $state(0);
	let mounted = $state(false);
	$effect(() => {
		mounted = true;
	});

	// ── Flight landing: the single source of truth for "the featured card has arrived" ──
	// `featuredLanded` is driven by the featured card's REAL transition lifecycle events, not a
	// timer: false the instant a card starts flying in, true at `introend` (growFrom actually
	// finished). Everything that should wait for the card to land keys off this — killing the
	// intermittent flicker the old fixed clocks caused (they guessed the distance-scaled landing).
	let featuredLanded = $state(true); // true at rest / cold load (intros don't replay on hydrate)

	// Notch suppression: a carved notch makes the growing/shrinking cards animate around a corner
	// cutout — a blur, not a discrete object. So while a card flies we flatten it to a COMPLETE
	// rounded card (--flat-shape) via a `.flat` class on the flight wrapper. Lifecycle events fire
	// PER-ELEMENT, the only way to reach the OUTGOING card (its props freeze on removal). Reduced
	// motion skips it, so a 0ms "flight" can't strand a card notch-less.
	// Fade a held-pending box (in:markPending) into view. `accept` decides which pending boxes to
	// take now — used to reveal everyone EXCEPT the pivot early, then the pivot as the card docks.
	function revealPending(accept: (el: HTMLElement) => boolean, fadeMs = 180) {
		for (const el of document.querySelectorAll<HTMLElement>('[data-pending]')) {
			if (!accept(el)) continue;
			delete el.dataset.pending;
			el.style.opacity = '';
			if (!prefersReducedMotion.current) {
				el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fadeMs, easing: 'ease-out' });
			}
		}
	}

	function onIncomingStart(node: HTMLElement) {
		if (prefersReducedMotion.current) return;
		node.classList.add('flat'); // suppress notch → solid rectangle for the flight
		featuredLanded = false; // hold the PIVOT + spouse chips hidden until we land (see reveal below)
		// Close the bare-screen gap: reveal the incoming PARENT and CHILD boxes NOW — as the outgoing
		// ones fade — so the screen above and below the card is never bare. Two kinds of box are HELD
		// instead, both revealed on landing:
		//   • the PIVOT (the box the demoting card shrinks into) — revealing it here would double it
		//     (its box + the shrinking card on screen at once); the seam watch reveals it as the old
		//     card docks.
		//   • the SPOUSE CHIPS (data-flight-dir="lateral") — they dock into the notch in the hero
		//     card's OWN top-right corner, directly under the card's flight path. Revealed early they
		//     flash in, get covered by the rising card, then re-emerge — the exact bug this gate
		//     prevents. They wait for the card to land (the featuredLanded effect reveals them).
		const pivot = getPivotId();
		revealPending((el) => el.dataset.flightId !== pivot && el.dataset.flightDir !== 'lateral');
	}
	// Spouse-chip reveal fade — quicker than the default box fade (180ms) so the chips settle into the
	// notch with less lag AFTER the hero lands. NOT an earlier start (that would be a mid-flight rise,
	// the flash-then-cover bug); the chips are still gated on landing, they just resolve faster once there.
	const CHIP_REVEAL_MS = 120;
	function onIncomingLand(node: HTMLElement) {
		node.classList.remove('flat'); // re-form the notch ON the real landing (no timer)
		// Reveal the spouse chips PROMPTLY here, in the introend handler itself — the hero's transform
		// has just hit identity, so the notch is in its final spot and a chip can never be caught under
		// the still-flying card. Doing it here (with the quicker CHIP_REVEAL_MS fade) instead of waiting
		// for the featuredLanded $effect to schedule + run shaves the post-landing lag, so the chips
		// appear sooner. Still strictly gated on landing → CHIPS-SOON stays green.
		revealPending((el) => el.dataset.flightDir === 'lateral', CHIP_REVEAL_MS);
		featuredLanded = true; // → reveals the pivot box + any remaining pending boxes (safety-net effect)
	}
	function onOutgoingStart(node: HTMLElement) {
		if (prefersReducedMotion.current) return;
		node.classList.add('flat'); // demoting card flies as a solid rectangle; destroyed flat
		// Hand off to the pivot box AS this demoted card fades into its slot — a cross-dissolve, not
		// a seam. Rather than guess a timer, WATCH the card's own opacity: the instant it begins
		// fading (it has reached and is docking into its slot), fade the pivot box in to take its
		// place. Tying the reveal to the card's fade (not the incoming card's separate landing clock)
		// keeps the destination continuously covered — no bare frame at either end of the morph.
		const pivot = getPivotId();
		const watch = () => {
			// Start the box's fade-in the instant the card begins fading (op dips below ~1), and run
			// it over a window close to the card's own fade so the two cross-dissolve evenly — the
			// composite at the destination stays high the whole hand-off.
			if (!node.isConnected || +getComputedStyle(node).opacity < 0.99) {
				revealPending((el) => el.dataset.flightId === pivot, 170);
				return;
			}
			requestAnimationFrame(watch);
		};
		requestAnimationFrame(watch);
	}

	// Safety net: if anything is still pending when the incoming card lands (e.g. the demoted card's
	// fade-watch never fired), reveal it. Normally the pivot is already revealed by onOutgoingStart.
	let prevLanded = true;
	$effect(() => {
		const landed = featuredLanded;
		untrack(() => {
			if (landed && !prevLanded) revealPending(() => true);
			prevLanded = landed;
		});
	});

	// Spouse chips, lifted out of FeaturedCard to dock into the carved notch. The
	// card still carves the notch from the same spouse count, so geometry matches.
	const useCompact = $derived(roster.spouses.length >= 3);

	// ── Spouse carousel (STRIP model, existence-gated) ────────────────────────────────────
	// ONLY built when spouseCount > 3; ≤3-spouse cards render the untouched baseline flex notch.
	// ALL chips live in one row-strip inside a clip-path mask; paging is a single PURE-PITCH
	// transform on the strip (chips hold their docked rects at every offset). L3: no pivot-aware
	// offset (reset to 0), no landed-gated caret mount — those are L4/L5.
	const CHIP_W = 160; // must match FeaturedCard CHIP_W_COMPACT
	const CHIP_GAP = 8; // must match FeaturedCard CHIP_GAP
	const WINDOW = 3;
	const STRIP_STEP = CHIP_W + CHIP_GAP; // 168px per page
	const NOTCH_W = WINDOW * CHIP_W + (WINDOW - 1) * CHIP_GAP; // 496px visible window
	const CARET_W = 22;
	const SHADOW_PAD = 6; // mask top/bottom overshoot so chip drop shadows render

	let spouseOffset = $state(0);
	const spouseCount = $derived(roster.spouses.length);
	const hasCarousel = $derived(spouseCount > WINDOW);
	const canPageRight = $derived(spouseOffset + WINDOW < spouseCount);
	const canPageLeft = $derived(spouseOffset > 0);
	let pagingLock = $state(false); // inert through the strip transition (no skip-ahead)

	const stripX = $derived(-(spouseOffset * STRIP_STEP)); // pure pitch — chips snap to the grid
	// Static mask: left clips chips sliding under the header; right hides the next chip (nothing
	// protrudes past the trailing docked chip — the right caret is the sole "more" cue).
	const maskClip = `inset(-${SHADOW_PAD}px -${SHADOW_PAD}px -${SHADOW_PAD}px 0px)`;
	// Carets ride the card edge at the notch seam, EQUIDISTANT from the chips they flank.
	const rightCaretRight = -(CHIP_GAP + CARET_W); // inner edge CHIP_GAP past the trailing chip
	const leftCaretRight = NOTCH_W + CHIP_GAP; // inner edge CHIP_GAP before the first chip

	// Initial offset on every new focus. PIVOT-AWARE (L5): if the person we're leaving (the pivot)
	// becomes a spouse of the incoming focus at strip index i ≥ WINDOW, open the window whose TRAILING
	// chip is that pivot (offset = i - (WINDOW-1)), so the demotion morph lands on a VISIBLE docked rect
	// instead of flying to an off-mask position (the ghost). This runs SYNCHRONOUSLY on the focus change
	// (before the flight's shrinkTo re-reads rects), and because pagingLock is cleared here the strip's
	// transition (.paging-gated) is OFF — it SNAPS to the offset, never animating chip rects mid-flight.
	$effect(() => {
		f.person.id; // dependency
		untrack(() => {
			const pivot = getPivotId();
			const spouses = roster.spouses;
			const maxOffset = Math.max(0, spouses.length - WINDOW);
			let init = 0;
			if (pivot) {
				const i = spouses.findIndex((s) => s.spouse.id === pivot);
				if (i >= WINDOW) init = Math.min(i - (WINDOW - 1), maxOffset);
			}
			spouseOffset = init;
			pagingLock = false;
		});
	});

	function pageStep(dir: 1 | -1) {
		if (pagingLock || !featuredLanded) return;
		if (dir === 1 ? !canPageRight : !canPageLeft) return;
		pagingLock = true; // .paging → the strip transition applies for THIS user page only
		spouseOffset += dir; // step ONE
		setTimeout(() => (pagingLock = false), 440); // ~= the 420ms strip transition
	}
	const pageAdvance = () => pageStep(1);
	const pageBack = () => pageStep(-1);

	const hasParents = $derived(roster.parents.length > 0);
	const childrenTotal = $derived(roster.children.length);
	const childrenDiedYoung = $derived(roster.children.filter((c) => c.dy_young).length);
	const isEasterEgg = $derived(f.person.classification?.is_easter_egg ?? false);

	const focalFirstName = $derived(f.person.bio?.first_name ?? f.person.name?.first_name ?? null);
	const parentsLabel = $derived(focalFirstName ? `${possessive(focalFirstName)} parents` : 'Parents');

	const childrenLabel = $derived.by(() => {
		if (childrenTotal === 0) return null;
		const countWord = cardinalWord(childrenTotal);
		const childWord = childrenTotal === 1 ? 'child' : 'children';
		let base = `${countWord} ${childWord}`;
		if (childrenDiedYoung > 0) {
			const dyWord = cardinalWordLower(childrenDiedYoung);
			base += ` (${dyWord} died young)`;
		}
		return base;
	});
</script>

<div class="page-container" use:warmPersonLinks>
	<div class="parents-slot">
		{#each roster.parents as parent (parent.id)}
			<!-- data-flight-id lets a shrinking card find this box. animate:flip glides survivors;
			     on leave, out:flyOut pins this box position:fixed at its click-captured rect, which
			     OVERRIDES flip's (post-insertion, wrong) fix() pin so leavers don't teleport. -->
			<div
				class="flight"
				data-flight-dir="up"
				data-flight-id={parent.id}
				in:morphIn={{ id: parent.id }}
				out:flyOut={{ key: parent.id }}
				animate:flip={{ duration: flipMs }}
			>
				<PersonBox person={parent} relation="parent" />
			</div>
		{/each}
	</div>

	<div class="connector connector-parents" class:landed={featuredLanded}>
		{#if hasParents}
			<div class="connector-line"></div>
			<span class="connector-label">{parentsLabel}</span>
			<div class="connector-line"></div>
		{/if}
	</div>

	<!-- Featured slot: a single grid cell so the leaving + entering cards overlap
	     (no layout doubling) during the morph. The card is a keyed single-item list
	     so it's created/destroyed on focus change — its send/receive pair with the
	     box that the same person occupies on the other side (child→featured, old
	     featured→parent), giving the card↔box content cross-dissolve. -->
	<div class="featured-slot" style={mounted && cardHeight ? `height: ${cardHeight}px` : ''}>
		<!-- Spouse chips: dock into the carved notch and swap LATERALLY. Clicking a chip
		     makes that spouse featured — their card growFroms the click-captured chip rect
		     (warmPersonLinks already captures it on any /person link), while the previous
		     focus shrinkTos onto its NEW chip here, located via data-flight-id.

		     ORDER MATTERS: this block is rendered BEFORE the featured {#each} on purpose.
		     The outgoing card's out:shrinkTo resolves its destination with a LIVE
		     querySelector at outro-config time, so the destination box must already be
		     mounted by then. Svelte runs block effects in source order, so an earlier
		     block mounts first — which is exactly why child→featured worked (its parent
		     destination sits in .parents-slot, above this slot) and spouse-swap did NOT
		     (the chip used to render AFTER the card → not yet mounted → box null →
		     shrinkTo silently degraded to duration:0, a fade). Moving the notch ahead of
		     the card makes the new chip mount first, so shrinkTo measures a real rect.
		     The notch is position:absolute; z-index:1, so source order has no visual or
		     stacking effect — chips still paint on top and dock into the carved notch.

		     Kept always mounted (no {#if}) so a chip's LOCAL outro still fires when the
		     set empties to zero — matching the parents/children slots. -->
		<!-- data-flight-id lets a shrinking card land on a chip; spouses fly LATERAL. The .flight box
		     stays UNTRANSFORMED so shrinkTo reads its true rect. Entrance gates on the card LANDING
		     (in:markPending → revealed by the featuredLanded effect); animate:flip glides survivors;
		     out:flyOut pins a LEAVING chip at its click-captured rect. These are the NAVIGATION
		     transitions; carousel paging is a pure CSS transform on .spouse-strip and fires none of
		     them (the keyed each doesn't change on a page). The .flight (with animate:flip) must be
		     the DIRECT child of the keyed each, so it's inlined per branch. -->
		<!-- The mask + strip + each are ALWAYS mounted (never behind an {#if}) so a chip's in:markPending
		     / out:flyOut / animate:flip fire as ADDED/REMOVED items on navigation — the frozen
		     landing-gate. Carousel geometry (fixed mask width + clip-path + strip transform) is applied
		     by CONDITIONAL STYLE only when spouseCount > 3; at ≤3 the mask/strip collapse to a plain
		     right-anchored flex row (the untouched baseline layout). Only the carets are gated. -->
		<div class="spouse-notch" data-spouse-offset={hasCarousel ? spouseOffset : 0}>
			<div
				class="spouse-mask"
				class:carousel={hasCarousel}
				style={hasCarousel ? `width: ${NOTCH_W}px; clip-path: ${maskClip};` : ''}
			>
				<div
					class="spouse-strip"
					class:paging={pagingLock}
					style:transform={hasCarousel ? `translateX(${stripX}px)` : 'none'}
				>
					{#each roster.spouses as chip (chip.spouse.id)}
						<div
							class="flight"
							data-flight-dir="lateral"
							data-flight-id={chip.spouse.id}
							in:markPending
							out:flyOut={{ key: chip.spouse.id }}
							animate:flip={{ duration: flipMs }}
						>
							<div class="chip-slide">
								<PersonBox person={chip.spouse} relation="spouse" marriageYear={chip.year} compact={useCompact} />
							</div>
						</div>
					{/each}
				</div>
			</div>
			<!-- Bookend carets — ALWAYS mounted (same DOM node, never remounted → no flicker AND no
			     fresh-mount opacity flash: base opacity 0, .visible only ADDS 1 via a transition, so the
			     stale featuredLanded frame at flight start can never paint them at 1). Visibility is a
			     pure READ of hasCarousel + featuredLanded + canPage: they fade in with the chips on
			     landing, fade out on offset changes (last-window right caret fades out and stays out).
			     pointer-events:none while invisible; the paging lockout is enforced by pageStep's guard,
			     NOT by CSS, so the cursor stays pointer throughout the 420ms. -->
			<button
				type="button"
				class="caret caret-left"
				class:visible={hasCarousel && featuredLanded && canPageLeft}
				style="right: {leftCaretRight}px"
				aria-label="Previous spouses"
				aria-disabled={pagingLock || !(hasCarousel && featuredLanded && canPageLeft)}
				onclick={pageBack}>‹</button
			>
			<button
				type="button"
				class="caret caret-right"
				class:visible={hasCarousel && featuredLanded && canPageRight}
				style="right: {rightCaretRight}px"
				aria-label="More spouses"
				aria-disabled={pagingLock || !(hasCarousel && featuredLanded && canPageRight)}
				onclick={pageAdvance}>›</button
			>
		</div>
		{#each [f] as cur (cur.person.id)}
			<div
				class="featured-flight"
				data-flight-dir="lateral"
				bind:clientHeight={cardHeight}
				in:growFrom
				out:shrinkTo={{ id: cur.person.id }}
				onintrostart={(e) => onIncomingStart(e.currentTarget)}
				onintroend={(e) => onIncomingLand(e.currentTarget)}
				onoutrostart={(e) => onOutgoingStart(e.currentTarget)}
			>
				<FeaturedCard
					person={cur.person}
					spouses={cur.neighborhood.spouses}
					generationLabels={cur.generationLabels}
					burialCemetery={cur.burialCemetery}
					crossConnections={cur.crossConnections}
					institutionsById={cur.institutionsById}
				/>
			</div>
		{/each}
	</div>

	{#if childrenTotal > 0}
		<div
			class="connector connector-children"
			class:connector-no-label={isEasterEgg}
			class:landed={featuredLanded}
		>
			{#if !isEasterEgg}
				<div class="connector-line"></div>
				<span class="connector-label">{childrenLabel}</span>
				<div class="connector-line"></div>
			{:else}
				<div class="connector-line connector-line-full"></div>
			{/if}
		</div>
	{/if}

	<div class="children-slot">
		{#each roster.children as child (child.id)}
			<!-- data-flight-id lets a shrinking card find this box. animate:flip glides survivors
			     (children shared across a spouse swap); out:flyOut pins a LEAVER position:fixed at
			     its click-captured rect, overriding flip's fix() (see parents). -->
			<div
				class="flight"
				data-flight-dir="down"
				data-flight-id={child.id}
				in:markPending
				out:flyOut={{ key: child.id }}
				animate:flip={{ duration: flipMs }}
			>
				<PersonBox person={child} relation="child" dimmed={child.dy_young} />
			</div>
		{/each}
	</div>
</div>

<style>
	.page-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-height: 100vh;
		padding-top: 80px;
		padding-bottom: 80px;
		padding-left: 32px;
		padding-right: 32px;
		/* The (later) spouse-carousel overhang + carets sit past the card's right edge; at narrow
		   viewports they'd extend the document and raise a horizontal scrollbar. Clip horizontally
		   at the stage so they never can (vertical scroll is unaffected by overflow-x). */
		overflow-x: clip;
	}

	/* The slot is exactly the card's bounding box (so the absolutely-positioned
	   spouse chips dock to the carved notch), AND a single grid cell so the leaving
	   and entering cards overlap there during the morph instead of stacking. */
	.featured-slot {
		position: relative;
		width: max-content;
		display: grid;
		justify-items: center;
		align-items: start; /* don't stretch cards to the explicit (gliding) slot height */
		overflow: visible; /* a taller leaving card overflows invisibly while it flies away */
		/* Glide the slot height between focuses so the children row moves in lockstep
		   with the card morph instead of snapping. cubic-bezier ≈ cubicOut. */
		transition: height 540ms cubic-bezier(0.33, 1, 0.68, 1);
	}
	.featured-slot > .featured-flight {
		grid-area: 1 / 1;
	}

	/* While a card flies (.flat added by transition lifecycle events) it renders as a
	   COMPLETE solid rounded card: the carved notch is swapped for the card's own --flat-shape
	   so the two cards don't animate around a corner cutout and blur together. The 8px rounding
	   is preserved (it's a rounded rectangle, not `none`); !important beats the article's inline
	   clip-path; it reverts the instant .flat is removed (notch re-forms, masked by the chips). */
	/* `.flat` is added at RUNTIME (classList, not markup) and `.featured-card` lives in the
	   child component, so both must be :global or Svelte tree-shakes this rule as "unused" and
	   silently strips it. `.featured-flight` stays scoped, keeping the rule bound to this page. */
	.featured-flight:global(.flat) :global(.featured-card) {
		clip-path: var(--flat-shape) !important;
	}

	@media (prefers-reduced-motion: reduce) {
		.featured-slot {
			transition: none;
		}
	}
	.spouse-notch {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 1;
	}

	/* Mask + strip are ALWAYS present (keeps the each persistent → landing-gate intact). At ≤3 both
	   collapse to content width → a plain right-anchored flex row = the untouched baseline layout.
	   The .carousel state (inline: fixed 496px width + clip-path) turns it into the sliding window;
	   clip-path (not overflow:hidden) lets drop shadows escape top/bottom while the left edge clips
	   chips sliding under the header. */
	.spouse-mask {
		width: max-content;
	}
	/* The strip holds ALL chips in one row and slides as ONE object; paging = a single transform.
	   Transition applies ONLY while .paging (a user page) — never on the navigation-time offset
	   reset, so the strip SNAPS on navigation and its chip rects never move under the demotion morph.
	   ~420ms easeOutBack (~5px overshoot-settle) so a page reads as travel-and-stop. */
	.spouse-strip {
		display: flex;
		gap: 8px; /* = CHIP_GAP */
		width: max-content;
		will-change: transform;
	}
	.spouse-strip.paging {
		transition: transform 420ms cubic-bezier(0.34, 1.3, 0.64, 1);
	}
	@media (prefers-reduced-motion: reduce) {
		.spouse-strip.paging {
			transition: none;
		}
	}

	/* Carousel carets — siblings of the mask, absolutely positioned by inline `right`; never clipped.
	   Default is HIDDEN (opacity 0, non-interactive); .visible fades them in. cursor stays pointer in
	   every state — the paging lockout nullifies the click via pageStep's guard, never via cursor. */
	.caret {
		position: absolute;
		top: 50%;
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		padding-bottom: 2px; /* optically center the chevron */
		border-radius: 9999px;
		border: 1px solid rgb(214, 211, 209); /* stone-300 */
		background: rgba(255, 255, 255, 0.94);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
		color: rgb(87, 83, 78); /* stone-600 */
		font-size: 15px;
		line-height: 1;
		cursor: pointer;
		opacity: 0;
		pointer-events: none; /* faded carets can't be clicked */
		transform: translateY(-50%);
		transition:
			opacity 180ms ease,
			transform 120ms ease,
			box-shadow 120ms ease,
			background 120ms ease,
			color 120ms ease;
	}
	/* Fades in with the chips on landing; fades out on offset change (last-window right caret stays out). */
	.caret.visible {
		opacity: 1;
		pointer-events: auto;
	}
	/* 22px visual, ~32px hit area (the pseudo-element is part of the clickable region). */
	.caret::before {
		content: '';
		position: absolute;
		inset: -5px;
	}
	/* Hover LIFT — a whisper of a rise + slightly softer shadow. */
	.caret:hover {
		transform: translateY(calc(-50% - 1px));
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
		background: #fff;
		color: rgb(28, 25, 23); /* stone-900 */
	}
	/* Press DIP — settles toward the surface, springs back to the hover lift on release. */
	.caret:active {
		transform: translateY(calc(-50% - 0.5px));
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
	}
	@media (prefers-reduced-motion: reduce) {
		.caret {
			transition:
				opacity 180ms ease,
				box-shadow 120ms ease,
				background 120ms ease,
				color 120ms ease;
		}
		.caret:hover,
		.caret:active {
			transform: translateY(-50%); /* no lift/dip; shadow/color still change */
		}
	}

	/* Flight wrappers are the keyed-each children that carry animate:flip (survivors glide) and
	   out:flyOut (leavers pin out of flow at their click-captured rect). They size to the PersonBox
	   inside and otherwise don't affect layout. */
	.flight {
		display: flex;
	}

	/* Inner wrapper for a spouse chip's directional entrance (in:slideChip). Tightly wraps
	   the PersonBox like .flight does, so the chip's resting size/position is unchanged; only
	   this element is transformed during the slide, keeping the .flight box's rect true. */
	.chip-slide {
		display: flex;
	}

	.parents-slot {
		min-height: 100px;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 16px;
		margin-bottom: 0;
	}

	.connector {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 6px 0;
		opacity: 0; /* hidden during flight — the lines+label are scaffolding for the LANDED page */
		min-height: 70px; /* Reserve space even when empty (e.g., no parents) — no layout shift */
	}
	/* The connector + its label fade in as ONE unit WITH the parent/child/spouse boxes, on the
	   card's landing (featuredLanded → true). Transition lives on .landed so the reveal is a
	   gentle 150ms fade (matching the boxes' WAAPI fade) while flight-start hide is instant
	   (removing .landed drops the transition → snaps to opacity 0, no stale-label fade-out). */
	.connector.landed {
		opacity: 0.75;
		transition: opacity 150ms ease-out;
	}

	.connector-line {
		width: 1px;
		height: 16px;
		background-color: rgb(168, 162, 158);
	}

	/* Parents: bottom line is closer to FeaturedCard → shorter */
	.connector-parents .connector-line:last-child {
		height: 12px;
	}

	/* Children: top line is closer to FeaturedCard → shorter */
	.connector-children .connector-line:first-child {
		height: 12px;
	}

	.connector-label {
		font-size: 11px;
		font-weight: 500;
		color: rgb(87, 83, 78);
		letter-spacing: 0.05em;
	}

	.children-slot {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 12px;
		max-width: 72rem;
		margin-top: 0;
	}

	.connector-children .connector-line.connector-line-full {
		height: 50px;
	}
</style>
