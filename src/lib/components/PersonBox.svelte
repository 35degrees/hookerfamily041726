<script lang="ts">
	import type { PersonCompact } from '$lib/types/neighborhood';
	import { shrinkToFit } from '$lib/actions/shrinkToFit';
	import { cldSize, PHOTO_TRANSFORM } from '$lib/photo';

	type Props = {
		person: PersonCompact;
		relation: 'spouse' | 'parent' | 'child' | 'sibling' | 'grandparent' | 'grandchild';
		marriageYear?: number | null;
		/** 'partner' when the union was never a marriage — the chip must not imply a wedding. */
		relationshipType?: string | null;
		compact?: boolean;
		dimmed?: boolean;
	};

	let {
		person,
		relation,
		marriageYear = null,
		relationshipType = null,
		compact = false,
		dimmed = false
	}: Props = $props();

	// The spouse chip's third line answers "what was this union": normally the marriage year, but a
	// partner who was never married gets said so outright. Some partnerships carry a start year and
	// some (Martha Fay, Suzzy Roche) carry none, so the label stands alone when there is no date.
	let isPartner = $derived(relation === 'spouse' && relationshipType === 'partner');
	let unionLine = $derived(
		isPartner
			? marriageYear
				? `(partner) ${marriageYear}`
				: '(partner)'
			: marriageYear
				? `m. ${marriageYear}`
				: null
	);

	// The person's ONE shared photo derivative (same URL the FeaturedCard uses) — loaded EAGER at HIGH
	// priority so a chip is never seen painting in, and so promoting the chip to featured is a cache hit,
	// not a second load. The discrete baseball-card read depends on it.
	const chipSrc = $derived(cldSize(person.p, PHOTO_TRANSFORM));

	// SIBLING chips are their own size tier — ~20% smaller than a normal spouse/child chip (220×75 → 176×60).
	// Existing relations keep their exact classes (sibling only ADDS a branch), so no spouse/child chip moves.
	let isSibling = $derived(relation === 'sibling');
	// ── CHIP TEXT COLOUR (Aug 4) ────────────────────────────────────────────────────────────────────
	// Every chip, every relation, takes INK BLUE — the same value the card's name and descent line use
	// (see layout.css), so the whole card is one ink at different strengths. The YEARS drop to 70% alpha
	// rather than to a lighter blue: alpha keeps them the same hue as the name they sit under, so a chip
	// reads as one object at two strengths, not as two colours.
	//
	// Alpha, not a second token, also composes correctly with the died-young dimming — a died-young
	// chip is already opacity-65, so its years land at 0.65 x 0.7 without a third value to maintain.
	const CHIP_TEXT = 'text-inkblue';
	const CHIP_YEARS = 'text-inkblue opacity-70';
	let boxSize = $derived(
		isSibling ? 'h-[54px] w-[119px]' : compact ? 'h-[65px] w-[160px]' : 'h-[75px] w-[220px]'
	);
	let photoW = $derived(compact && !isSibling ? 'w-[30%]' : 'w-[25%]');
	// df (display font) — the person's own typeface, allow-listed. CHIP MODE ONLY, and only on the
	// NAME line: dates, relation and the third line keep the chip's normal face so the row still
	// reads as a chip. Absent for everyone without bio.display_font.
	const CHIP_FONTS: Record<string, string> = { rokkitt: 'font-rokkitt' };
	let chipFontClass = $derived(CHIP_FONTS[(person.df ?? '').toLowerCase()] ?? '');
	// A slab serif sets optically smaller than Inter, so the override carries a +15% step of its
	// own (13→15, 11→12.5) rather than moving the chip size for everyone.
	let nameText = $derived(
		chipFontClass
			? compact || isSibling
				? 'text-[12.5px]'
				: 'text-[15px]'
			: compact || isSibling
				? 'text-[11px]'
				: 'text-[13px]'
	);
	let dateText = $derived(compact || isSibling ? 'text-[10px]' : 'text-xs');
	// Sibling chips carry a THIRD line ("died young") below by–dy when dy_young — so the text stack is tighter
	// (less vertical padding, no inter-line gap) and that line is smaller than the years. Name + years keep
	// their sizes. Child chips are UNCHANGED — they render died-young INLINE (1876–1879 (died young)).
	let textAreaPad = $derived(isSibling ? 'min-w-0 gap-0 px-2.5 py-1' : 'gap-0.5 px-2.5 py-2');
	let diedYoungText = 'text-[9px]';

	// SIBLING chips are first-name-only ("from the POV of the card, he knows them as Lent"): use the curated
	// chip first name (cf, e.g. "Lent") when set, else the real first name (fn). EVERYONE ELSE gets the full
	// short chip name — the curated "chip_first_name + surname" (nk, "Cettie Mathews") when set, else the
	// computed short name (sn). Null beats weak — fall back through sn then n. (FeaturedCard is unaffected —
	// it renders the full bio.display_name, not this compact.)
	// CHILD chips for WOMEN prefer the MARRIED surname (cm, "Alice Vanderbilt") over the maiden/short name;
	// cm is null for men / unavailable, so they keep the normal nk→sn→n fallback. Verbatim chip_name still
	// wins (it's baked into cm for women). Sibling chips are first-name-only; everyone else uses nk→sn→n.
	let displayName = $derived(
		isSibling
			? (person.cf ?? person.fn ?? person.sn ?? person.n)
			: relation === 'child'
				? (person.cm ?? person.nk ?? person.sn ?? person.n)
				: (person.nk ?? person.sn ?? person.n)
	);
	// Slice 3: a sibling nav is now a WARM flight (kind 'sibling'). warmPersonLinks captures the chip rect
	// and reads the sibling's seat t off data-tx/data-ty (below) to compute the collateral LATERAL departure
	// vector. No data-sveltekit-reload — the click is preventDefault-ed into the warm path.
	let href = $derived(person.slug ? `/person/${person.slug}` : null);
	// §16 chip-date degrade: when BOTH lifespan ends are unknown, suppress the dates line entirely — no
	// "?–?" anywhere, at any scale (this box, the featured card, and the demote chip-face all read it).
	// One end known ("1850–?" / "?–1900") still shows.
	// `pv` (living, non-notable) suppresses the whole date line — the same degrade path §16 already
	// uses when both ends are unknown, so no new geometry. The payload still carries by/dy; only the
	// display is gated. died-young signals go with it: a living person can't have one, and rendering
	// the branch at all would leak that we know their dates.
	let hasDates = $derived(!person.pv && (person.by != null || person.dy != null));
	let showDiedYoung = $derived(!person.pv && dimmed);
</script>

<!-- Sibling chips clamp the first name with shrinkToFit — the SAME machinery as the FeaturedCard's main
     name (min-w-0 wrapper + [data-fit] inline span), so a long first name shrinks 11px→8px instead of
     clipping. Other chips render the name plain (unchanged). -->
<!-- data-chip-name is a stable hook the demote flight reads: it mirrors the destination chip's name onto
     the flying chip-face at demote start, so a child-seat landing (where a woman's married-surname `cm`
     differs from the parent/short `sn`) never flashes the maiden name before the atomic swap. -->
{#snippet nameEl()}
	{#if isSibling}
		<div
			class="min-w-0 font-medium {CHIP_TEXT} {nameText} {chipFontClass}"
			data-chip-name
			use:shrinkToFit={{
				max: chipFontClass ? 12.5 : 11,
				min: chipFontClass ? 9 : 8,
				key: displayName
			}}
		>
			<span data-fit class="inline-block whitespace-nowrap">{displayName}</span>
		</div>
	{:else}
		<div class="font-medium {CHIP_TEXT} {nameText} {chipFontClass}" data-chip-name>
			{displayName}
		</div>
	{/if}
{/snippet}

{#if href}
	<a
		{href}
		data-tx={isSibling ? person.t?.x : undefined}
		data-ty={isSibling ? person.t?.y : undefined}
		class="person-box flex overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md {boxSize} {dimmed
			? 'opacity-65'
			: ''}"
		data-relation={relation}
	>
		<div class="photo aspect-square shrink-0 bg-stone-100 {photoW}">
			{#if person.p}
				<img
					src={chipSrc}
					alt={person.n}
					class="h-full w-full object-cover {person.pp ? '' : 'object-top'}"
					style={person.pp ? `object-position: ${person.pp}` : undefined}
					loading="eager"
					fetchpriority="high"
					decoding="async"
				/>
			{/if}
		</div>

		<div class="text-area flex flex-col justify-center {textAreaPad} leading-tight">
			{@render nameEl()}
			{#if hasDates}
				<!-- data-chip-dates: the TYPEFACE TEMPLATE for a row the hand-off flight has to grow on a
				     travelling chip (see data-chip-union). Cloning this line rather than building one keeps
				     the new row in the traveller's own type scale, so a compact seat can never hand a
				     10px line to a 13px box. -->
				<div class="{CHIP_YEARS} {dateText}" data-chip-dates>
					{person.by ?? ''}–{person.dy ?? ''}{#if relation === 'child' && showDiedYoung}
						{' '}(died young){/if}
				</div>
			{/if}
			{#if isSibling && showDiedYoung}
				<div class="leading-none {CHIP_YEARS} {diedYoungText}">died young</div>
			{/if}
			{#if relation === 'spouse' && unionLine}
				<!-- data-chip-union is the same kind of hook as data-chip-name: a stable handle the flight
				     reads off the DESTINATION chip. A parent chip has two lines and the spouse chip it
				     becomes has three, so without this the union row simply appeared the instant the
				     traveller retired. The hand-off now grows this row on the traveller mid-journey, so
				     the swap lands on a chip that already says the same thing. -->
				<div class="{CHIP_YEARS} {dateText}" data-chip-union>
					{unionLine}
				</div>
			{/if}
		</div>
	</a>
{:else}
	<div
		class="person-box flex overflow-hidden rounded-lg bg-white shadow-sm {boxSize} {dimmed
			? 'opacity-65'
			: ''}"
		data-relation={relation}
	>
		<div class="photo h-full shrink-0 bg-stone-100 {photoW}">
			{#if person.p}
				<img
					src={chipSrc}
					alt={person.n}
					class="h-full w-full object-cover {person.pp ? '' : 'object-top'}"
					style={person.pp ? `object-position: ${person.pp}` : undefined}
					loading="eager"
					fetchpriority="high"
					decoding="async"
				/>
			{/if}
		</div>

		<div class="text-area flex flex-col justify-center {textAreaPad} leading-tight">
			{@render nameEl()}
			{#if hasDates}
				<!-- data-chip-dates: the TYPEFACE TEMPLATE for a row the hand-off flight has to grow on a
				     travelling chip (see data-chip-union). Cloning this line rather than building one keeps
				     the new row in the traveller's own type scale, so a compact seat can never hand a
				     10px line to a 13px box. -->
				<div class="{CHIP_YEARS} {dateText}" data-chip-dates>
					{person.by ?? ''}–{person.dy ?? ''}{#if relation === 'child' && showDiedYoung}
						{' '}(died young){/if}
				</div>
			{/if}
			{#if isSibling && showDiedYoung}
				<div class="leading-none {CHIP_YEARS} {diedYoungText}">died young</div>
			{/if}
			{#if relation === 'spouse' && unionLine}
				<!-- data-chip-union is the same kind of hook as data-chip-name: a stable handle the flight
				     reads off the DESTINATION chip. A parent chip has two lines and the spouse chip it
				     becomes has three, so without this the union row simply appeared the instant the
				     traveller retired. The hand-off now grows this row on the traveller mid-journey, so
				     the swap lands on a chip that already says the same thing. -->
				<div class="{CHIP_YEARS} {dateText}" data-chip-union>
					{unionLine}
				</div>
			{/if}
		</div>
	</div>
{/if}
