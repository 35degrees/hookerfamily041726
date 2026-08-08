<script module lang="ts">
	// THE CARD'S FIXED TOP HEIGHT — header row + content row. The CC footer is NOT part of it: a card
	// with cross-connections is this tall PLUS its footer, which is why reducing this leaves the footer
	// untouched. Exported because DeckRiffle sizes its phantom cards to match, and it used to do that
	// with its own literal and a comment saying "matches FeaturedCard's card-top height" — a comment is
	// not a mechanism, and the two would have silently diverged the first time this number moved.
	export const CARD_TOP_H = 575; // was 580; reduced 5px on Aug 4 (20px was tried and read as too much)

	// Corner radius for the rounded card silhouette. Matches the spouse chip's rounded-lg (8px) so the
	// chip docks visually. Exported for the SAME reason CARD_TOP_H is: the CC blade is carved with the
	// card's own radius, and a second literal would silently diverge the first time this moved.
	export const CORNER_R = 8;
</script>

<script lang="ts">
	import type { Person } from '$lib/types/person';
	import type { SpouseEntry, PersonCompact } from '$lib/types/neighborhood';
	import type { Cemetery } from '$lib/types/cemetery';
	import type { Institution } from '$lib/types/institution';
	import RightColumn from './RightColumn.svelte';
	import NarrativeBlocks from './NarrativeBlocks.svelte';
	import { formatDate, formatLocationShort, buildMapUrl, ageAtDeath } from '$lib/utils/dates';
	import { shrinkToFit } from '$lib/actions/shrinkToFit';
	import { cldSize, PHOTO_TRANSFORM } from '$lib/photo';
	import CrossConnectionsBlade, { BLADE_TANG } from './CrossConnectionsBlade.svelte';
	import { unsheathBlade } from '$lib/transitions/flight';
	import { untrack, tick } from 'svelte';

	type Props = {
		person: Person;
		spouses: SpouseEntry[];
		generationLabels?: string[];
		burialCemetery?: Cemetery | null;
		/** MARRIED INTO the Hooker line — the compact's derived `sp`. Passed in rather than read off
		 *  person.classification because is_thomas_spouse there is only ~22% populated; see
		 *  marriedIntoLine in regenerate-data.js. */
		marriedIn?: boolean;
		crossConnections?: Array<{
			type: string;
			related_id: string;
			link_text: string;
			display_label: string;
			slug: string | null;
			t?: { x: number; y: number | null; e?: boolean } | null;
			relation_class?: 'direct' | 'collateral' | null;
			gen_delta?: number | null;
			// Edges to the nearest shared ancestor (build-time LCA bake). Absent = no shared ancestor
			// within the cap. Rides to the deck's same-line test via data-kin-distance (see camera.ts).
			kin_distance?: number | null;
		}>;
		institutionsById?: Record<string, Institution>;
		/** The blade's measured height, forwarded to the page so the featured slot can reserve it. */
		onbladeheight?: (h: number) => void;
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
		marriedIn = false,
		crossConnections = [],
		institutionsById = {},
		onbladeheight,
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

	// ── THE FEATURED NAME'S FACE ────────────────────────────────────────────────────────────────────
	// Outfit, 600. THIS CARD'S <h1> ONLY — Sam: "this request is 100% only for the FeaturedCard name. I
	// am not interested in changing the font for the name on any of the other chips like spouse chip,
	// parent sibling or child." Those keep Inter via the body font; nothing here reaches them.
	//
	// SIZE FOLLOWS THE FACE, because apparent size is CAP HEIGHT and not px. Measured off rendered
	// pixels: Inter Variable 500 at 24px has an 18px cap; Outfit has a 16px cap at the same px. 26px is
	// therefore the size at which Outfit reads as EXACTLY the size the Inter name always did — it is a
	// like-for-like swap, not an enlargement. The shrinkToFit floor moves by the same ratio (17 → 18.5).
	//
	// Outfit and Carlito were both trialled here and on the chips, and both were returned from; neither
	// is imported now (see +layout.svelte). Setting NAME_FACE to a font-* class is all that is needed to
	// try another, but the SIZE must move with it — see above.
	const NAME_FACE = 'font-outfit';
	const NAME_SIZE = 26;
	const NAME_MIN = 18.5;
	// 500, unchanged across the face trials. Inter is variable (100-900), so it is a real weight.
	const NAME_WEIGHT_CLASS = 'font-medium';

	// ── THE BLADE'S SHEATH ──────────────────────────────────────────────────────────────────────────
	// Two moments, both owned by THIS card because the blade is part of it:
	//   arriving — draw it out of the case the moment this card starts moving, on the retract's clock;
	//   departing — stow it again as the card leaves (retractBladeIn, fired from the card's outrostart
	//   in the page, because Svelte stops running an outroing block's effects and the card can no
	//   longer notice its own departure from in here).
	// `settled` already means "this card is at rest" — the page derives it from the flight's own landing
	// events — so no new state and no timer is needed to know which moment we are in.
	let bladeMount = $state<HTMLElement | null>(null);
	// STOWED IS DECLARATIVE, and true from this card's very first frame if it arrived mid-flight — so
	// there is never a frame where the blade is painted already open. It is also the gate: a card that
	// mounts already settled (cold load, back/forward) simply has its blade out and animates nothing.
	let stowed = $state(untrack(() => !settled));

	$effect(() => {
		const el = bladeMount;
		if (!el) return;
		untrack(() => {
			if (!stowed) return;
			// One tick. The flight publishes its clock when the hero's transition is created, which is
			// AFTER this component's effects run — read synchronously it comes back zero, and the blade
			// draws on no schedule at all. The declarative stow above covers the wait.
			void tick().then(() => {
				unsheathBlade(el);
				stowed = false;
			});
		});
	});

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
	// Age at death, shown beside the death date, carrying its own precision — an approximate figure is
	// rendered "(~Age 65)" rather than withheld, because a ragged date is still worth an estimate as long
	// as the estimate says so. Gated by datesPrivate with everything else in this disclosure class.
	let ageAtDeathValue = $derived(datesPrivate ? null : ageAtDeath(person.birth, person.death));
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
	// NOTE (Aug 4): dormant while `SHOW_TALCOTT_DESCENT = false` in generation.ts — with the Talcott line
	// off, computeGenerationLabels can only ever return 0 or 1 entries, so this never fires today. Kept
	// because the flag is a switch, not a deletion; see HEADER_H for what happens if it flips back on.
	let headerIsCrowded = $derived(generationLabels.length >= 2 && !!blurb);

	// ── THE LOWER CONTENT STARTS AT THE SAME Y ON EVERY CARD ────────────────────────────────────────
	// The header row used to AUTO-SIZE (`minmax(72px, auto)`), which held a constant ~12px breathing gap
	// under the last text line no matter how many lines there were. That was a deliberate trade and it is
	// now reversed on Sam's call: what must be constant is where the LOWER CONTENT — the photo /
	// narrative / RightColumn grid — begins. Measured, it was moving 23px depending on whether the person
	// had a blurb: 72px on Rachel Flagg (name + descent line, no blurb) against 95px on William Whitney
	// (name + descent + "31st U.S. Secretary of the Navy"). Sam, on the pair: Whitney "starts a bit too
	// low", Rachel "too high up… use Rachel as the baseline but start lower content down 10px."
	//
	// So the row is a FIXED height and the gap under the text is what varies instead. The dial is here and
	// nowhere else.
	//
	// 82 = Rachel's old content start (72, the previous minmax floor) + the 10px Sam asked for.
	//
	// THREE ROWS IS THE PERMANENT MAXIMUM — name + descent line + blurb. Sam, confirming it as a rule
	// rather than a current state: "there will never be headers longer than three rows due to removing
	// Talcott family from the flow." So this height only ever has to serve the three-block header, and
	// `headerIsCrowded` below is dead for good rather than dormant.
	//
	// The three-block header measures 83px of ink from the card's top (16px padding-top + 67px of text),
	// so at 82 its last line ends 1px into the content row. That is deliberate and invisible: the content
	// row carries its own 24px of padding-top, so the nearest actual pixel is ~25px below the blurb. The
	// blurb is CLAMPED to one line for the same reason (see below) — the arithmetic only holds while the
	// third row stays one line.
	const HEADER_H = 82;

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
     min-height keeps the card at CARD_TOP_H when there's no footer to extend it. -->
<div
	class="featured-card-wrap relative w-[925px]"
	style="
        min-height: {CARD_TOP_H}px;
        filter:
            drop-shadow(0 4px 12px hsl(var(--shadow-ink) / var(--shadow-a1)))
            drop-shadow(0 1px 3px hsl(var(--shadow-ink) / var(--shadow-a2)));
    "
>
	<!-- The CARVED CARD: clip-path creates the notch silhouette.
	     No fixed height here — it grows naturally to fit card-top (CARD_TOP_H) + footer (auto). -->
	<article
		class="featured-card relative w-full bg-white"
		class:hooker-line={person.classification?.is_thomas_descendant}
		class:spouse-line={marriedIn}
		class:ee-line={person.classification?.is_easter_egg}
		style="clip-path: {clipPath}; --flat-shape: {flatShape};"
	>
		<!-- Fixed-height TOP region: header + content area, always exactly CARD_TOP_H tall.
		     The header row is a FIXED height (HEADER_H) so the LOWER CONTENT — the photo / narrative /
		     RightColumn grid — begins at the same y on every card. This REVERSES the previous rule, which
		     auto-sized the header to hold a constant ~12px gap under the last text line and therefore let
		     the content start move 23px between a blurb card and a no-blurb one. Constant content start,
		     variable gap underneath. The dial lives in HEADER_H; there are no other height inputs here. -->
		<div
			class="card-top grid"
			style="height: {CARD_TOP_H}px; grid-template-rows: {HEADER_H}px minmax(0, 1fr);"
		>
			<div
				class="header min-w-0 px-6 pt-4 pb-3"
				style="padding-right: {notchChipCount > 0 ? chipZoneWidth + 16 : 24}px;"
			>
				<div class="name-block min-w-0" class:tight-stack={headerIsCrowded}>
					<!-- min-w-0 + [data-fit] inline span: shrinkToFit measures the wrapper's real
					     available width against the span's natural text width. Without min-w-0 up the
					     chain the wrapper grows to the text and nothing ever shrinks (the HD3384 blowup). -->
					<!-- nameFontClass (the per-person bio.display_font override) still wins where it is set;
					     everyone else gets NAME_FACE. -->
					<!-- nameFontClass (the per-person bio.display_font override) still wins where it is set;
					     everyone else gets NAME_FACE.
					     NO inline font-size here, deliberately: shrinkToFit writes node.style.fontSize
					     itself, and Svelte rewrites a `style={...}` attribute wholesale on any re-render —
					     the two would fight and a long name would snap back to full size mid-life. The size
					     is expressed ONLY as shrinkToFit's `max`, which is where it belongs, and the weight
					     rides a class. -->
					<h1
						class="w-full min-w-0 leading-tight text-inkblue {nameFontClass
							? 'font-medium'
							: NAME_WEIGHT_CLASS} {nameFontClass || NAME_FACE}"
						use:shrinkToFit={{
							max: nameFontClass ? 28 : NAME_SIZE,
							min: nameFontClass ? 20 : NAME_MIN,
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
									class="descent-line min-w-0 text-sm leading-tight font-medium text-inkblue"
									use:shrinkToFit={{ max: 14, min: 10, key: label }}
								>
									<span data-fit class="inline-block whitespace-nowrap">{label}</span>
								</div>
							{:else if generationLabels.length >= 2}
								<!-- Dual-descent (Hooker + Talcott) line: ~5% smaller, STATIC.
								     Rare; this guards the 4-line header height. -->
								<div class="descent-line text-[13px] leading-tight font-medium text-inkblue">{label}</div>
							{:else}
								<!-- Ordinary single descent / spouse-only / in-law line: default size. -->
								<div class="descent-line text-sm leading-tight font-medium text-inkblue">{label}</div>
							{/if}
						{/each}
					{/if}
					{#if blurb}
						<!-- NOT clamped, and deliberately so (Sam, Aug 4): "let's not even clamp bio blurb, the
						     long ones just need to be cut — even with a three spouse notch all blurbs should
						     fit the existing space at the existing font size." The schema already agrees: 8
						     words maximum, parity rule v19, "null beats weak", and validate.py flags it as C8
						     debt. A blurb long enough to wrap is a DATA defect, and clamping it here would
						     hide the defect rather than surface it. The over-length worklist is
						     _review/blurb-over-length.tsv.
						     -mb-2 only in the crowded fixed-height variant (earns back a couple px for the
						     4th line); on auto-height common cards it would just eat the breathing gap. -->
						<div
							class="mt-0 font-source text-sm leading-tight text-blue-900 opacity-60"
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
				<!-- space-y: photo->vitals is the original 16 less 5% then a further 20% (15.2 -> 12.16);
					     .vitals block spacing is the original 10 less 5% (9.5). -->
				<div class="portrait-column space-y-[10.94px]">
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
					<div class="vitals space-y-[7.6px] pl-1">
						{#snippet vital(
							label: string,
							date: string,
							loc: string | null,
							mapUrl: string | null,
							age: { years: number; approx: boolean } | null = null
						)}
							<div>
								<div class="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
									{label}
								</div>
								<!-- The age rides the date line at a lighter weight so the DATE stays primary and the
								     derived figure reads as an annotation on it, not a second fact. -->
								<div class="font-opensans text-[12.45px] leading-snug font-normal text-inkblue">
									{date}{#if age}<span class="ml-1.5 font-normal opacity-70"
											>({age.approx ? '~' : ''}Age {age.years})</span
										>{/if}
								</div>
								{#if loc || mapUrl}
									<div
										class="mt-[0.5px] font-opensans text-[12.08px] leading-snug font-light text-slate-600"
									>
										{loc ?? ''}{#if mapUrl}<a
												href={mapUrl}
												target="_blank"
												rel="noopener noreferrer"
												class="ml-1.5 align-baseline font-opensans text-[9px] font-normal tracking-wider text-blue-700 uppercase hover:underline"
												>Map</a
											>{/if}
									</div>
								{/if}
							</div>
						{/snippet}
						{#if birthDate}{@render vital('Birth', birthDate, birthLocation, birthMapUrl)}{/if}
						{#if deathDate}{@render vital(
								'Death',
								deathDate,
								deathLocation,
								deathMapUrl,
								ageAtDeathValue
							)}{/if}
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

		<!-- The cross connections are NO LONGER PART OF THIS CARD. They render as a separate blade that
		     emerges from beneath it (CrossConnectionsBlade, mounted by the page), which is what makes every
		     featured card exactly CARD_TOP_H tall — the old footer was the only thing that ever varied it.
		     `crossConnections` stays on the props purely so the page can hand it straight through. -->
	</article>

	<!-- Spouse chips are rendered by the PAGE (lifted out so chip and card are
	     peers for the crossfade — see DESIGN "Re-focus choreography"). This card
	     still CARVES the notch from chipCount; the page docks the chips into it. -->

	<!-- ── THE CROSS-CONNECTIONS BLADE ────────────────────────────────────────────────────────────
	     A PART OF THIS CARD, not a neighbour of it. It was briefly mounted by the page as a sibling
	     of the card, and that was wrong in the way that matters: it had to TRACK the card, so on a
	     vertical CC navigation it detached and flew its own path. The card is the knife's case and the
	     blade is a tool inside it — throw the knife off a cliff and the blade goes with it, because it
	     is nested in it, not following it. Living inside .featured-card-wrap, it inherits every
	     transform the flight applies to the card for free, and there is no tracking code at all.

	     ABSOLUTELY POSITIONED at the card's bottom edge on purpose: it must contribute NO layout
	     height. .featured-flight's rect is the flight's destination geometry, and a taller box would
	     rescale the whole chip→card morph (the card would render smaller than the chip it grows from).
	     z-index:-1 puts it behind the card, which is what makes "sheathed" mean genuinely hidden INSIDE
	     the case rather than faded out. The wrap's drop-shadow now outlines card and blade as ONE
	     silhouette, so there is no shadow seam between them — they are one object. -->
	<div
		class="cc-blade-mount"
		class:stowed
		style="top: calc(100% - {BLADE_TANG}px);"
		bind:this={bladeMount}
	>
		<CrossConnectionsBlade {crossConnections} onheight={onbladeheight} />
	</div>
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
	/* See the markup comment: no layout height, pinned to the card's bottom edge, behind the card. */
	.cc-blade-mount {
		position: absolute;
		/* `top` is set inline, pulled UP by the blade's tang so the hidden part starts inside the card. */
		left: 0;
		width: 100%;
		z-index: -1;
	}
	/* Inside the case. No opacity involved — the card is opaque and painted above this, so a blade
	   translated up by its own height is hidden wherever the card is, at whatever scale it is flying at. */
	.cc-blade-mount.stowed {
		transform: translateY(-100%);
	}

	.tight-stack > * {
		margin-top: -2px;
	}
	.tight-stack > *:first-child {
		margin-top: 0;
	}
</style>
