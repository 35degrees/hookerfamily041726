<script lang="ts">
	import type { Person } from '$lib/types/person';
	import type { SpouseEntry, PersonCompact } from '$lib/types/neighborhood';
	import type { Cemetery } from '$lib/types/cemetery';
	import type { Institution } from '$lib/types/institution';
	import RightColumn from './RightColumn.svelte';
	import NarrativeBlocks from './NarrativeBlocks.svelte';
	import { formatDate, formatLocationShort, buildMapUrl } from '$lib/utils/dates';
	import { shrinkToFit } from '$lib/actions/shrinkToFit';

	type Props = {
		person: Person;
		spouses: SpouseEntry[];
		generationLabels?: string[];
		burialCemetery?: Cemetery | null;
		crossConnections?: Array<{
			type: string;
			related_id: string;
			link_text: string;
			display_label: string;
			slug: string | null;
		}>;
		institutionsById?: Record<string, Institution>;
	};

	let {
		person,
		spouses,
		generationLabels = [],
		burialCemetery = null,
		crossConnections = [],
		institutionsById = {}
	}: Props = $props();

	let photoUrl = $derived(person.bio?.photo_url ?? person.name?.photo_url ?? null);
	let displayName = $derived(person.bio?.display_name ?? person.name?.display_name ?? '');

	let birthDate = $derived(formatDate(person.birth));
	let birthLocation = $derived(formatLocationShort(person.birth));
	let birthMapUrl = $derived(buildMapUrl(person.birth));

	let deathDate = $derived(formatDate(person.death));
	let deathLocation = $derived(formatLocationShort(person.death));
	let deathMapUrl = $derived(buildMapUrl(person.death));

	// Header blurb: notable people use notable_blurb; non-notable people fall back to
	// bio_blurb (e.g. HD3249 "Documentary artist of the Tuskegee Airmen").
	let blurb = $derived(person.notable?.notable_blurb ?? person.bio?.bio_blurb ?? null);

	// True when the header has 4 lines (name + 2 generation labels + blurb).
	// In that case, use tighter spacing so the extra line doesn't bulldoze.
	let headerIsCrowded = $derived(generationLabels.length >= 2 && !!blurb);

	// === Carved card geometry ===
	const CHIP_W_NORMAL = 220;
	const CHIP_W_COMPACT = 160;
	const CHIP_GAP = 8;

	const ZONE_PADDING = 0;
	const CHIP_INSET = 18;
	const CHIP_ZONE_HEIGHT_NORMAL = 90;
	const CHIP_ZONE_HEIGHT_COMPACT = 78;

	// One chip per UNIQUE spouse person: a repeated spouse id can't collide the
	// keyed each, and a stable id key lets the chip↔card morph fire on navigation.
	let spouseChips = $derived.by(() => {
		const seen = new Set<string>();
		const out: { spouse: PersonCompact; year: number | null }[] = [];
		for (const m of spouses) {
			if (!m.spouse || seen.has(m.spouse.id)) continue;
			seen.add(m.spouse.id);
			out.push({ spouse: m.spouse, year: m.year });
		}
		return out;
	});

	let chipCount = $derived(spouseChips.length);
	let useCompact = $derived(chipCount >= 3);
	let chipWidth = $derived(useCompact ? CHIP_W_COMPACT : CHIP_W_NORMAL);
	let chipZoneHeight = $derived(useCompact ? CHIP_ZONE_HEIGHT_COMPACT : CHIP_ZONE_HEIGHT_NORMAL);

	let chipZoneWidth = $derived.by(() => {
		if (chipCount === 0) return 0;
		return chipCount * chipWidth + (chipCount - 1) * CHIP_GAP + CHIP_INSET;
	});

	// Corner radius for the rounded card silhouette.
	// Should match the spouse chip's rounded-lg (8px) so the chip docks visually.
	const CORNER_R = 8;

	// The FLAT silhouette: a plain rounded rectangle, no notch (4 rounded outer corners).
	// It's the resting shape when there are no chips, AND it's exposed as --flat-shape so a
	// card can morph to a COMPLETE solid rounded card while flying — the notch would otherwise
	// make the growing/shrinking cards animate around a corner cutout and read as a blur. The
	// page swaps to it via a .flat class during the transition (see +page.svelte). 8px rounding
	// is preserved, so the cards never square off mid-flight.
	const flatShape = `shape(
            from ${CORNER_R}px 0,
            line to calc(100% - ${CORNER_R}px) 0,
            curve to 100% ${CORNER_R}px with 100% 0,
            line to 100% calc(100% - ${CORNER_R}px),
            curve to calc(100% - ${CORNER_R}px) 100% with 100% 100%,
            line to ${CORNER_R}px 100%,
            curve to 0 calc(100% - ${CORNER_R}px) with 0 100%,
            line to 0 ${CORNER_R}px,
            curve to ${CORNER_R}px 0 with 0 0
        )`;

	let clipPath = $derived.by(() => {
		const r = CORNER_R;
		// No chips → the flat silhouette IS the resting shape (also reused while flying).
		if (chipCount === 0) return flatShape;
		const cw = chipZoneWidth;
		const ch = chipZoneHeight;
		return `shape(
        from ${r}px 0,
        line to calc(100% - ${cw}px - ${r}px) 0,
        curve to calc(100% - ${cw}px) ${r}px with calc(100% - ${cw}px) 0,
        line to calc(100% - ${cw}px) calc(${ch}px - ${r}px),
        curve to calc(100% - ${cw}px + ${r}px) ${ch}px with calc(100% - ${cw}px) ${ch}px,
        line to calc(100% - ${r}px) ${ch}px,
        curve to 100% calc(${ch}px + ${r}px) with 100% ${ch}px,
        line to 100% calc(100% - ${r}px),
        curve to calc(100% - ${r}px) 100% with 100% 100%,
        line to ${r}px 100%,
        curve to 0 calc(100% - ${r}px) with 0 100%,
        line to 0 ${r}px,
        curve to ${r}px 0 with 0 0
    )`;
	});
</script>

<!-- Wrapper provides positioning context for chips as siblings of carved card.
     min-height keeps the card at 580px when there's no footer to extend it. -->
<div
	class="featured-card-wrap relative w-[925px]"
	style="
        min-height: 580px;
        filter:
            drop-shadow(0 4px 12px rgba(0, 0, 0, 0.10))
            drop-shadow(0 1px 3px rgba(0, 0, 0, 0.08));
    "
>
	<!-- The CARVED CARD: clip-path creates the notch silhouette.
	     No fixed height here — it grows naturally to fit card-top (580px) + footer (auto). -->
	<article
		class="featured-card relative w-full bg-white"
		style="clip-path: {clipPath}; --flat-shape: {flatShape};"
	>
		<!-- Fixed-height TOP region: header + content area, always exactly 580px tall.
		     This is the "main card" that stays consistent regardless of NB expansion. -->
		<!-- Header row is a FIXED height (Task 3): the common case (name + 1 label + blurb = 3 lines)
		     sits comfortably in it, and the rare dual-descent card (name + 2 labels + blurb = 4 lines)
		     compresses into the SAME height via .tight-stack (headerIsCrowded) so the content
		     columns below never shift. The name is now single-line (shrinkToFit), so wrapping no
		     longer inflates this; 96px accounts for the restored 14px/13px label sizes (up from the
		     interim 12px). Still a CSS-derived estimate — TUNE on real cards: if a common
		     single-descent card's content grid shifts, match this to its natural on-screen height. -->
		<div class="card-top grid h-[580px] grid-rows-[96px_minmax(0,1fr)]">
			<div
				class="header min-w-0 px-6 py-4"
				style="padding-right: {chipCount > 0 ? chipZoneWidth + 16 : 24}px;"
			>
				<div class="name-block min-w-0" class:tight-stack={headerIsCrowded}>
					<!-- min-w-0 + [data-fit] inline span: shrinkToFit measures the wrapper's real
					     available width against the span's natural text width. Without min-w-0 up the
					     chain the wrapper grows to the text and nothing ever shrinks (the HD3384 blowup). -->
					<h1
						class="w-full min-w-0 text-2xl leading-tight font-medium text-stone-900"
						use:shrinkToFit={{ max: 24, min: 17, key: displayName }}
					>
						<span data-fit class="inline-block whitespace-nowrap"
							>{displayName}<span class="ml-2 align-middle font-mono text-sm font-normal text-stone-400"
								>{person.id}</span
							></span
						>
					</h1>
					{#if generationLabels.length > 0}
						{#each generationLabels as label, i (i)}
							{#if label.includes(' & ')}
								<!-- Merged cousin-marriage line: full-size, shrink-to-fit so a long
								     "…Hooker Descendant & Wife of Hooker Descendant" stays one line. -->
								<div
									class="min-w-0 text-sm leading-tight font-medium text-blue-900"
									use:shrinkToFit={{ max: 14, min: 10, key: label }}
								>
									<span data-fit class="inline-block whitespace-nowrap">{label}</span>
								</div>
							{:else if generationLabels.length >= 2}
								<!-- Dual-descent (Hooker + Talcott) line: ~5% smaller, STATIC.
								     Rare; this guards the 4-line header height. -->
								<div class="text-[13px] leading-tight font-medium text-blue-900">{label}</div>
							{:else}
								<!-- Ordinary single descent / spouse-only / in-law line: default size. -->
								<div class="text-sm leading-tight font-medium text-blue-900">{label}</div>
							{/if}
						{/each}
					{/if}
					{#if blurb}
						<div class="mt-0.5 -mb-2 font-source text-sm leading-tight text-slate-600 opacity-80">
							{blurb}
						</div>
					{/if}
				</div>
			</div>

			<!-- Content row: minmax(0, 1fr) + overflow-hidden allows NB body expansion
			     without growing the row. Any overflow is clipped, keeping card height stable. -->
			<div class="content grid grid-cols-[23%_1fr_21%] overflow-hidden py-6 pr-3 pl-6">
				<div class="portrait-column space-y-4">
					{#if photoUrl}
						<img
							src={photoUrl}
							alt={person.bio?.display_name ?? person.name?.display_name ?? 'Portrait'}
							class="aspect-[3/4] w-full rounded-sm bg-stone-100 object-cover object-top"
						/>
					{:else}
						<div class="aspect-[3/4] w-full rounded-sm bg-stone-100"></div>
					{/if}
					<div class="vitals space-y-2.5 pl-1">
						{#snippet vital(
							label: string,
							date: string,
							loc: string | null,
							mapUrl: string | null
						)}
							<div>
								<div class="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
									{label}
								</div>
								<div class="font-lora text-[13px] leading-snug text-slate-800">{date}</div>
								{#if loc || mapUrl}
									<div class="font-lora text-[12.5px] leading-snug text-slate-600">
										{loc ?? ''}{#if mapUrl}<a
												href={mapUrl}
												target="_blank"
												rel="noopener noreferrer"
												class="ml-1.5 align-middle text-[9px] tracking-wider text-blue-700 uppercase hover:underline"
												>Map</a
											>{/if}
									</div>
								{/if}
							</div>
						{/snippet}
						{#if birthDate}{@render vital('Birth', birthDate, birthLocation, birthMapUrl)}{/if}
						{#if deathDate}{@render vital('Death', deathDate, deathLocation, deathMapUrl)}{/if}
					</div>
				</div>

				<div class="narrative min-w-0 min-h-0 overflow-hidden pr-4 pl-4">
					<div class="max-w-[60ch]">
						<NarrativeBlocks blocks={person.narrative_blocks ?? []} />
					</div>
				</div>

				<!-- h-full + min-h-0: bound this grid cell to the (definite) .content row height so
				     RightColumn's own h-full resolves to a fixed height and its scroll-group actually
				     scrolls. Without min-h-0 the cell's default min-height:auto grows to the full stack
				     height, un-scrolling the column and pushing the burial pin below the fold. No
				     overflow-hidden here — it would clip the pin's intentional bottom-[-12px] overhang. -->
				<div class="h-full min-h-0">
					<RightColumn {person} {institutionsById} {burialCemetery} />
				</div>
			</div>
		</div>

		<!-- FOOTER region: extends BELOW the 580px card-top, only renders when CCs exist.
		     Card height = 580 + footer height when populated. -->
		{#if crossConnections.length > 0}
			<div class="footer border-t border-stone-200 px-6 py-3">
				<div class="grid grid-cols-[140px_1fr] items-start gap-x-4">
					<!-- Left: label with hover tooltip -->
					<div class="cc-label-wrapper relative">
						<span
							class="cc-label text-[10px] font-semibold tracking-wider text-stone-500 uppercase"
						>
							Cross Connections
						</span>
						<div class="cc-tooltip">
							Notable relationships beyond direct family ties — peers, colleagues, neighbors, or
							parallel descents through the Hooker tree.
						</div>
					</div>

					<!-- Right: two-column CC grid -->
					<div class="cross-connections grid grid-cols-2 items-start gap-x-6 gap-y-1">
						<!-- Index key: a CC id can recur as two distinct directional facts
						     (e.g. "first student of X" AND "was his teacher") — show both. -->
						{#each crossConnections as cc, i (i)}
							<div class="cc-row text-[12px] leading-snug">
								{#if cc.slug}
									<a
										href="/person/{cc.slug}"
										class="font-medium text-blue-700 hover:text-blue-900 hover:underline"
										>{cc.link_text}</a
									>
								{:else}
									<span class="font-medium text-stone-700">{cc.link_text}</span>
								{/if}
								{#if cc.display_label}
									<span class="text-stone-600"> — {cc.display_label}</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</article>

	<!-- Spouse chips are rendered by the PAGE (lifted out so chip and card are
	     peers for the crossfade — see DESIGN "Re-focus choreography"). This card
	     still CARVES the notch from chipCount; the page docks the chips into it. -->
</div>

<style>
	.tight-stack > * {
		margin-top: -2px;
	}
	.tight-stack > *:first-child {
		margin-top: 0;
	}

	/* Cross Connections hover tooltip */
	.cc-label {
		cursor: help;
		border-bottom: 1px dotted rgb(168, 162, 158);
		padding-bottom: 1px;
	}

	.cc-tooltip {
		position: absolute;
		bottom: calc(100% + 8px);
		left: 0;
		width: 240px;
		padding: 8px 10px;
		background: rgb(41, 37, 36); /* stone-800 */
		color: rgb(245, 245, 244); /* stone-100 */
		font-size: 11px;
		line-height: 1.4;
		border-radius: 4px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.15s ease;
		z-index: 50;
	}

	.cc-label-wrapper:hover .cc-tooltip {
		opacity: 1;
	}
</style>
