<script lang="ts">
	import type { Person } from '$lib/types/person';
	import type { SpouseEntry, PersonCompact } from '$lib/types/neighborhood';
	import type { Cemetery } from '$lib/types/cemetery';
	import type { Institution } from '$lib/types/institution';
	import RightColumn from './RightColumn.svelte';
	import NarrativeBlocks from './NarrativeBlocks.svelte';
	import { formatDate, formatLocationShort, buildMapUrl } from '$lib/utils/dates';
	import { shrinkToFit } from '$lib/actions/shrinkToFit';
	import { cldSize, PHOTO_TRANSFORM } from '$lib/photo';

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
			t?: { x: number; y: number | null; e?: boolean } | null;
			relation_class?: 'direct' | 'collateral' | null;
			gen_delta?: number | null;
		}>;
		institutionsById?: Record<string, Institution>;
		// False while this card is flying/settling into FeaturedCard space (promotion morph).
		// Gates the hover-zoom so a cursor already over the incoming photo can't trigger the
		// enlarge mid-flight (it flashed in then popped as the card grew). True at rest / introend.
		settled?: boolean;
	};

	let {
		person,
		spouses,
		generationLabels = [],
		burialCemetery = null,
		crossConnections = [],
		institutionsById = {},
		settled = true
	}: Props = $props();

	let photoUrl = $derived(person.bio?.photo_url ?? person.name?.photo_url ?? null);
	// The featured portrait — the SAME shared derivative the chips use (so a chip→featured promotion is a
	// cache hit, not a reload), covering the ~200px display AND the ~2× hover-zoom in one image. Loaded
	// eager + high-priority; the zoom reuses it verbatim (same URL → no second fetch).
	let portraitSrc = $derived(cldSize(photoUrl, PHOTO_TRANSFORM));
	let displayName = $derived(person.bio?.display_name ?? person.name?.display_name ?? '');
	// Per-person typeface (bio.display_font) — allow-list, never a passthrough. Lands on this card's
	// NAME and its NB headers; the same key rides the compacts as `df` so the person's CHIP matches.
	const NAME_FONTS: Record<string, string> = { rokkitt: 'font-rokkitt' };
	let nameFontClass = $derived(NAME_FONTS[(person.bio?.display_font ?? '').toLowerCase()] ?? '');

	// ── Main-portrait hover-zoom ──────────────────────────────────────────────
	// Same mechanism as RightColumn's thumbnail popout (mouse-anchored, portaled to <body> so it escapes
	// the card clip / overflow, pointer-events-none so the card stays interactive). Anchored ABOVE the
	// cursor with a smart flip below when near the top edge, and clamped horizontally to the viewport.
	// Hidden the instant the pointer leaves the photo.
	let zoom = $state<{
		src: string;
		alt: string;
		w: number;
		h: number;
		ax: number;
		y: number;
	} | null>(null);

	// Instant + lightweight: reuse the ALREADY-LOADED portrait src (no new network request → the
	// enlargement appears the moment you hover, no first-hover lag). Sized to 200% of the displayed
	// WIDTH at the image's NATURAL aspect, so the WHOLE photo shows — tall portraits aren't cropped to
	// the midriff the way the object-cover card thumbnail is. Capped to the viewport, and never
	// narrower than the on-card photo.
	const ZOFFSET = 33; // fixed horizontal nudge right of the photo's edge, toward page centre (~2rem)
	function trackZoom(e: MouseEvent) {
		// Don't enlarge until the card has finished flying into FeaturedCard space. During the
		// promotion morph the img is transform-scaled (getBoundingClientRect would be wrong anyway),
		// and a stationary cursor over the landing spot would otherwise flash the zoom in and out.
		if (!photoUrl || !settled) return;
		const img = e.currentTarget as HTMLImageElement;
		const r = img.getBoundingClientRect();
		const ar = img.naturalWidth ? img.naturalHeight / img.naturalWidth : r.height / r.width;
		let w = r.width * 2; // 200% of the displayed width
		let h = w * ar; // full-height at the image's own aspect → nothing cropped
		const s = Math.min(1, (window.innerWidth * 0.6) / w, (window.innerHeight * 0.9) / h);
		w *= s;
		h *= s;
		if (w < r.width) {
			w = r.width; // never narrower than what's already shown on the card
			h = w * ar;
		}
		// Horizontal is pinned to the photo's right edge (constant as the mouse moves), not the cursor.
		zoom = {
			src: portraitSrc ?? photoUrl,
			alt: displayName || 'Portrait',
			w,
			h,
			ax: r.right,
			y: e.clientY
		};
	}
	function closeZoom() {
		zoom = null;
	}
	// If a zoom is open when a promotion morph begins (settled → false), drop it immediately so it
	// doesn't ride the shrinking/growing card. It resumes on the next mousemove once settled again.
	$effect(() => {
		if (!settled) closeZoom();
	});
	// FIXED horizontal position (photo's right edge + ~5rem toward centre) — moving the mouse only
	// slides it up and down; it never drifts left/right. Vertically centered on the cursor, top clamped
	// so the box stays fully on screen; the left is clamped only as a narrow-viewport safety.
	function zoomStyle(z: { w: number; h: number; ax: number; y: number }): string {
		const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
		const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
		const left = Math.max(8, Math.min(z.ax + ZOFFSET, vw - z.w - 8));
		const top = Math.max(8, Math.min(z.y - z.h / 2, vh - z.h - 8));
		return `left:${left}px; top:${top}px; width:${z.w}px; height:${z.h}px;`;
	}
	// Portal to <body> so no card ancestor (clip-path / overflow) can clip the float. Client-only: the
	// {#if zoom} is false during SSR and actions never run on the server.
	function portalZoom(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}

	// Living, non-notable: the Birth and Death vitals are withheld entirely — date AND place AND the
	// map link, which are the same disclosure class. Gated here rather than in formatDate so the
	// formatters stay pure and policy lives in one place.
	let datesPrivate = $derived(Boolean(person.pv));
	// One-off crop override for a portrait the default top-centre crop mangles (landscape shots,
	// off-centre subjects). Set per person in canonical as bio.photo_position; absent everywhere else.
	let photoPosition = $derived(person.bio?.photo_position ?? null);
	let birthDate = $derived(datesPrivate ? '' : formatDate(person.birth));
	let birthLocation = $derived(formatLocationShort(person.birth));
	let birthMapUrl = $derived(buildMapUrl(person.birth));

	let deathDate = $derived(datesPrivate ? '' : formatDate(person.death));
	let deathLocation = $derived(formatLocationShort(person.death));
	let deathMapUrl = $derived(buildMapUrl(person.death));

	// CC tail: the label reads straight on from the linked name, with NO separator dash
	// (removed 072926 on Sam's call — the dash was doing the work the prose should do).
	// Two legal label shapes, and they need different spacing:
	//   predicate       "was his father-in-law…"   -> one space:  "Name was his father-in-law…"
	//   leading appositive ", her grandmother, …"  -> no space:   "Name, her grandmother, …"
	// Getting this wrong prints "Name , her grandmother", which is why it is a function and not
	// a space in the markup. The markup around it is deliberately whitespace-free for the same reason.
	function ccTail(label: string): string {
		const t = (label ?? '').trim();
		if (!t) return '';
		return /^[,;:.!?]/.test(t) ? t : ' ' + t;
	}

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
	// The carved notch shows at most 3 chips — the Task 2 carousel windows the rest — so
	// cap ALL notch geometry (width, height, clip-path, header padding) at 3. Without this
	// a 4+-spouse card (Michael HD3384) runs the notch, hence the whole card-top, off its
	// 925px frame. This is the geometry invariant the carousel build sits on top of.
	let notchChipCount = $derived(Math.min(chipCount, 3));
	let useCompact = $derived(notchChipCount >= 3);
	let chipWidth = $derived(useCompact ? CHIP_W_COMPACT : CHIP_W_NORMAL);
	let chipZoneHeight = $derived(useCompact ? CHIP_ZONE_HEIGHT_COMPACT : CHIP_ZONE_HEIGHT_NORMAL);

	let chipZoneWidth = $derived.by(() => {
		if (notchChipCount === 0) return 0;
		return notchChipCount * chipWidth + (notchChipCount - 1) * CHIP_GAP + CHIP_INSET;
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
		if (notchChipCount === 0) return flatShape;
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
		     The COMMON header auto-sizes (minmax floor + auto), giving every card the SAME ~12px
		     breathing gap under its last text line regardless of line count — a single fixed height
		     can't (a no-blurb 2-line card and a blurb 3-line card differ by a whole line). The rare
		     dual-descent 4-line card keeps the FIXED 96px + .tight-stack (headerIsCrowded) so its
		     spacing is unchanged. The gap is the header's pb (12px); pt stays 16px. -->
		<div
			class="card-top grid h-[580px]"
			style="grid-template-rows: {headerIsCrowded ? '96px' : 'minmax(72px, auto)'} minmax(0, 1fr);"
		>
			<div
				class="header min-w-0 px-6 pt-4 pb-3"
				style="padding-right: {notchChipCount > 0 ? chipZoneWidth + 16 : 24}px;"
			>
				<div class="name-block min-w-0" class:tight-stack={headerIsCrowded}>
					<!-- min-w-0 + [data-fit] inline span: shrinkToFit measures the wrapper's real
					     available width against the span's natural text width. Without min-w-0 up the
					     chain the wrapper grows to the text and nothing ever shrinks (the HD3384 blowup). -->
					<h1
						class="w-full min-w-0 text-2xl leading-tight font-medium text-stone-900 {nameFontClass}"
						use:shrinkToFit={{
							max: nameFontClass ? 28 : 24,
							min: nameFontClass ? 20 : 17,
							key: displayName
						}}
					>
						<span data-fit class="inline-block whitespace-nowrap"
							>{displayName}<span
								class="ml-2 align-middle font-mono text-sm font-normal text-stone-400"
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
						<!-- -mb-2 only in the crowded fixed-height variant (earns back a couple px for the
						     4th line); on auto-height common cards it would just eat the breathing gap. -->
						<div
							class="mt-0.5 font-source text-sm leading-tight text-slate-600 opacity-80"
							class:-mb-2={headerIsCrowded}
						>
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
							src={portraitSrc}
							alt={person.bio?.display_name ?? person.name?.display_name ?? 'Portrait'}
							class="aspect-[3/4] w-full rounded-sm bg-stone-100 object-cover {photoPosition
								? ''
								: 'object-top'}"
							style={photoPosition ? `object-position: ${photoPosition}` : undefined}
							loading="eager"
							fetchpriority="high"
							onmouseenter={trackZoom}
							onmousemove={trackZoom}
							onmouseleave={closeZoom}
						/>
					{:else}
						<div class="aspect-[3/4] w-full rounded-sm bg-stone-100"></div>
					{/if}
					<div class="vitals space-y-2.5 pl-1">
						{#snippet vital(label: string, date: string, loc: string | null, mapUrl: string | null)}
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

				<div class="narrative min-h-0 min-w-0 overflow-hidden pr-4 pl-4">
					<div class="max-w-[60ch]">
						<NarrativeBlocks
							blocks={person.narrative_blocks ?? []}
							font={person.bio?.display_font}
						/>
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
									<!-- data-cc marks a NON-CHIP navigation (the directional arrival class); data-tx/ty
									     carry the target's table seat so the camera store gets a real `to`. -->
									<a
										href="/person/{cc.slug}"
										data-cc="true"
										data-tx={cc.t?.x ?? undefined}
										data-ty={cc.t?.y ?? undefined}
										data-relation-class={cc.relation_class ?? undefined}
										data-gen-delta={cc.gen_delta ?? undefined}
										class="font-medium text-blue-700 hover:text-blue-900 hover:underline"
										>{cc.link_text}</a
									>
								{:else}<span class="font-medium text-stone-700">{cc.link_text}</span
									>{/if}{#if cc.display_label}<span class="text-stone-600">{ccTail(
										cc.display_label
									)}</span
									>{/if}
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

<!-- Main-portrait hover-zoom float — portaled to <body>, anchored above the cursor, pointer-events-none. -->
{#if zoom}
	<div
		use:portalZoom
		class="pointer-events-none fixed z-[9999]"
		style={zoomStyle(zoom)}
		aria-hidden="true"
	>
		<img
			src={zoom.src}
			alt={zoom.alt}
			class="block h-full w-full rounded-md object-cover shadow-[-18px_22px_48px_-12px_rgba(0,0,0,0.55)] ring-1 ring-black/10"
		/>
	</div>
{/if}

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
