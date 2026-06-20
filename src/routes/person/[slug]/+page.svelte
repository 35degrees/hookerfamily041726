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
	import { send, growFrom, shrinkTo, markPending } from '$lib/transitions/flight';

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

	// Intra-zone reshuffle (e.g. died-young reorder) uses flip; snap under reduced motion.
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
	function onIncomingStart(node: HTMLElement) {
		if (prefersReducedMotion.current) return;
		node.classList.add('flat'); // suppress notch → solid rectangle for the flight
		featuredLanded = false; // hold entering destination boxes hidden until we land
	}
	function onIncomingLand(node: HTMLElement) {
		node.classList.remove('flat'); // re-form the notch ON the real landing (no timer)
		featuredLanded = true; // → triggers the gentle box/chip reveal below
	}
	function onOutgoingStart(node: HTMLElement) {
		if (prefersReducedMotion.current) return;
		node.classList.add('flat'); // demoting card flies as a solid rectangle; destroyed flat
	}

	// Reveal every box held pending (in:markPending) the moment the card LANDS — gently, with a
	// short fade — rather than on a clock. Edge-detected (false→true only) so a stray re-run while
	// a flight is starting can't reveal boxes early. Tied to the cause (landing), not a guess.
	let prevLanded = true;
	$effect(() => {
		const landed = featuredLanded;
		untrack(() => {
			if (landed && !prevLanded) {
				for (const el of document.querySelectorAll<HTMLElement>('[data-pending]')) {
					delete el.dataset.pending;
					el.style.opacity = '';
					if (!prefersReducedMotion.current) {
						// Tight fade so chips/boxes appear AS the card settles, not a beat after.
						el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' });
					}
				}
			}
			prevLanded = landed;
		});
	});

	// Spouse chips, lifted out of FeaturedCard to dock into the carved notch. The
	// card still carves the notch from the same spouse count, so geometry matches.
	const useCompact = $derived(roster.spouses.length >= 3);

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
			<!-- data-flight-id lets a shrinking card find this box; ancestors fly UP. -->
			<div
				class="flight"
				data-flight-dir="up"
				data-flight-id={parent.id}
				in:markPending
				out:send={{ key: parent.id }}
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
		<div class="spouse-notch flex gap-2">
			{#each roster.spouses as chip (chip.spouse.id)}
				<!-- data-flight-id lets a shrinking card land on this chip; spouses fly LATERAL. -->
				<div
					class="flight"
					data-flight-dir="lateral"
					data-flight-id={chip.spouse.id}
					in:markPending
					out:send={{ key: chip.spouse.id }}
					animate:flip={{ duration: flipMs }}
				>
					<PersonBox
						person={chip.spouse}
						relation="spouse"
						marriageYear={chip.year}
						compact={useCompact}
					/>
				</div>
			{/each}
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
			<!-- data-flight-id lets a shrinking card find this box; descendants fly DOWN. -->
			<div
				class="flight"
				data-flight-dir="down"
				data-flight-id={child.id}
				in:markPending
				out:send={{ key: child.id }}
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

	/* Flight wrappers are the keyed-each children that carry send/receive + flip.
	   They size to the PersonBox inside and otherwise don't affect layout. */
	.flight {
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
