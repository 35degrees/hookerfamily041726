<script lang="ts">
	import type { Person } from '$lib/types/person';
	import type { SpouseEntry, PersonCompact } from '$lib/types/neighborhood';
	import type { Cemetery } from '$lib/types/cemetery';
	import type { Institution } from '$lib/types/institution';
	import RightColumn from './RightColumn.svelte';
	import NarrativeBlocks from './NarrativeBlocks.svelte';
	import { formatDate, formatLocationShort, buildMapUrl } from '$lib/utils/dates';

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

	let birthDate = $derived(formatDate(person.birth));
	let birthLocation = $derived(formatLocationShort(person.birth));
	let birthMapUrl = $derived(buildMapUrl(person.birth));

	let deathDate = $derived(formatDate(person.death));
	let deathLocation = $derived(formatLocationShort(person.death));
	let deathMapUrl = $derived(buildMapUrl(person.death));

	// True when the header has 4 lines (name + 2 generation labels + notable_blurb).
	// In that case, use tighter spacing so the extra line doesn't bulldoze.
	let headerIsCrowded = $derived(generationLabels.length >= 2 && !!person.notable?.notable_blurb);

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

	let clipPath = $derived.by(() => {
		const r = CORNER_R;
		if (chipCount === 0) {
			// Simple rounded rectangle when no chips (4 outer rounded corners)
			return `shape(
            from ${r}px 0,
            line to calc(100% - ${r}px) 0,
            curve to 100% ${r}px with 100% 0,
            line to 100% calc(100% - ${r}px),
            curve to calc(100% - ${r}px) 100% with 100% 100%,
            line to ${r}px 100%,
            curve to 0 calc(100% - ${r}px) with 0 100%,
            line to 0 ${r}px,
            curve to ${r}px 0 with 0 0
        )`;
		}
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
	<article class="featured-card relative w-full bg-white" style="clip-path: {clipPath};">
		<!-- Fixed-height TOP region: header + content area, always exactly 580px tall.
		     This is the "main card" that stays consistent regardless of NB expansion. -->
		<div class="card-top grid h-[580px] grid-rows-[minmax(70px,auto)_minmax(0,1fr)]">
			<div
				class="header px-6 py-4"
				style="padding-right: {chipCount > 0 ? chipZoneWidth + 16 : 24}px;"
			>
				<div class="name-block" class:tight-stack={headerIsCrowded}>
					<h1 class="text-2xl leading-tight font-medium text-stone-900">
						{person.bio?.display_name ?? person.name?.display_name}
						<span class="ml-2 align-middle font-mono text-sm font-normal text-stone-400"
							>{person.id}</span
						>
					</h1>
					{#if generationLabels.length > 0}
						{#each generationLabels as label, i (i)}
							<div
								class="leading-tight font-medium text-blue-900"
								class:text-sm={!label.includes(' / ')}
								class:text-[11px]={label.includes(' / ')}
							>
								{label}
							</div>
						{/each}
					{/if}
					{#if person.notable?.notable_blurb}
						<div class="mt-0.5 -mb-2 font-source text-sm leading-tight text-slate-600 opacity-80">
							{person.notable.notable_blurb}
						</div>
					{/if}
				</div>
			</div>

			<!-- Content row: minmax(0, 1fr) + overflow-hidden allows NB body expansion
			     without growing the row. Any overflow is clipped, keeping card height stable. -->
			<div class="content grid grid-cols-[23%_55%_22%] gap-4 overflow-hidden p-6">
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
					<div class="vitals flex gap-6 pl-1">
						{#if birthDate || birthLocation}
							<div class="vital-block">
								<div class="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
									Birth
								</div>
								{#if birthDate}
									<div class="font-lora text-[13px] leading-tight text-slate-700">{birthDate}</div>
								{/if}
								{#if birthLocation}
									<div class="font-lora text-xs leading-tight text-slate-600">{birthLocation}</div>
								{/if}
								{#if birthMapUrl}
									<div class="-mt-1.5">
										<a
											href={birthMapUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="inline-block text-[9px] tracking-wider text-blue-700 uppercase hover:text-blue-900 hover:underline"
											>Map</a
										>
									</div>
								{/if}
							</div>
						{/if}

						{#if deathDate || deathLocation}
							<div class="vital-block">
								<div class="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
									Death
								</div>
								{#if deathDate}
									<div class="font-lora text-[13px] leading-tight text-slate-700">{deathDate}</div>
								{/if}
								{#if deathLocation}
									<div class="font-lora text-xs leading-tight text-slate-600">{deathLocation}</div>
								{/if}
								{#if deathMapUrl}
									<div class="-mt-1.5">
										<a
											href={deathMapUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="inline-block text-[9px] tracking-wider text-blue-700 uppercase hover:text-blue-900 hover:underline"
											>Map</a
										>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<div class="narrative min-h-0 overflow-hidden">
					<NarrativeBlocks blocks={person.narrative_blocks ?? []} />
				</div>

				<div class="-ml-1">
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
