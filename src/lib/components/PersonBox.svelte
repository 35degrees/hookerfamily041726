<script lang="ts">
	import { isPynchonKin } from '$lib/data/pynchonLine';
	import type { PersonCompact } from '$lib/types/neighborhood';
	import { shrinkToFit } from '$lib/actions/shrinkToFit';
	import { cldSize, PHOTO_TRANSFORM } from '$lib/photo';
	import { stage, mergeChipUnion } from '$lib/state/stage.svelte';

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
	// Alpha, not a second token, also survived the died-young rework: the chip is no longer dimmed as a
	// whole (that let the parchment show THROUGH it — see .died-young in layout.css), so the years now
	// carry only their own 0.7 on top of the grey ink that rule supplies.
	const CHIP_TEXT = 'text-inkblue';
	const CHIP_YEARS = 'text-inkblue opacity-70';
	// ── PHASE 2.75 — THE CHIP'S FRAME, AS AN INLINE STYLE RATHER THAN A CLASS ───────────────────────
	// The three size tiers are unchanged as BASES (sibling 119×54, compact notch seat 160×65, normal
	// 220×75); they are now multiplied by the frame unit.
	//
	// A CLASS, NOT AN INLINE STYLE — the same rule the type below is written under, and for the same
	// reason: flight.ts assigns `style.cssText` (a replacement, not a merge) to four different cloned
	// elements, so anything it may clone must carry its geometry somewhere cssText cannot reach.
	// `--stage-u` is published on <html>, so a ghost portalled to <body> still resolves it.
	//
	// The three size tiers are unchanged as BASES — sibling 119x54, compact notch seat 160x65, normal
	// 220x75 — and the calc keeps each of those numbers readable where it is used.
	// WRITTEN OUT AS LITERALS, not built by a helper, because Tailwind generates CSS only for class
	// strings it can find whole in the source. A `box(119, 54)` helper reads better and emits nothing —
	// the scanner never sees `w-[calc(119px*var(--stage-u,1))]`, so the chip would render with no width
	// at all. Every arbitrary value in this file has to survive a grep for its own text.
	// A CHILD IS ITS OWN SIZE TIER — 90% of a parent chip (Sam, Aug 8: "make the child chips 10% smaller
	// overall, they don't need to be as large as parent chips"). 220x75 -> 198x67.5, and the type takes
	// the same 0.9 so the chip shrinks as ONE OBJECT rather than as a box with full-size text in it.
	//
	// THE ASPECT RATIO IS PRESERVED ON PURPOSE: 220/75 = 2.933 and 198/67.5 = 2.933. flight.ts decides
	// whether a landing is same-tier by comparing the x and y scale factors (`Math.abs(sx - sy) > 0.02`);
	// a uniform 0.9 keeps that difference at zero, so a card demoting into a child seat still takes the
	// cheap same-tier path instead of the crossfade-to-destination-face machinery that a genuinely
	// different-SHAPED seat needs. Picking, say, 200x68 would have quietly changed which flight runs.
	//
	// Grandchildren render `relation="child"` too, so the descendant tier inherits this for free.
	let isChildTier = $derived(relation === 'child' && !compact && !isSibling);
	let boxSize = $derived(
		isSibling
			? 'w-[calc(119px*var(--stage-u,1))] h-[calc(54px*var(--stage-u,1))]'
			: compact
				? 'w-[calc(160px*var(--stage-u,1))] h-[calc(65px*var(--stage-u,1))]'
				: isChildTier
					? 'w-[calc(198px*var(--stage-u,1))] h-[calc(67.5px*var(--stage-u,1))]'
					: 'w-[calc(220px*var(--stage-u,1))] h-[calc(75px*var(--stage-u,1))]'
	);
	let photoW = $derived(compact && !isSibling ? 'w-[30%]' : 'w-[25%]');
	// df (display font) — the person's own typeface, allow-listed. CHIP MODE ONLY, and only on the
	// NAME line: dates, relation and the third line keep the chip's normal face so the row still
	// reads as a chip. Absent for everyone without bio.display_font.
	const CHIP_FONTS: Record<string, string> = { rokkitt: 'font-rokkitt' };
	let chipFontClass = $derived(CHIP_FONTS[(person.df ?? '').toLowerCase()] ?? '');
	// A slab serif sets optically smaller than Inter, so the override carries a +15% step of its
	// own (13→15, 11→12.5) rather than moving the chip size for everyone.
	// PHASE 2.75 — the chip's TYPE steps on k while its BOX scales on u, which is the hybrid at chip
	// scale. The bases are exactly the values that were here as plain Tailwind classes (text-xs is 12px);
	// only the multiplier is new, and it rides in the arbitrary value so the design constant stays
	// readable at the call site.
	//
	// A CLASS, NOT AN INLINE STYLE, AND THIS ONE IS PAID FOR IN BLOOD. The first version emitted
	// `style="font-size:12px"`, on the reasoning that a travelling ghost should carry its type size
	// literally. flight.ts's `growUnionRow` builds the "m. 1621" row by CLONING `[data-chip-dates]` and
	// then doing `row.style.cssText = 'opacity:0;height:0;overflow:hidden'` — which WIPES the inline
	// style. With the size in a class that wipe cost nothing; with the size inline the cloned row lost
	// it, inherited 16px, and Sam saw the union year land oversized and snap down as the real chip
	// replaced the ghost. Three other places in flight.ts assign `cssText` the same way.
	//
	// The clone-safety worry that motivated inline is already answered elsewhere: `--type-k` is
	// published on <html>, so a ghost portalled to <body> still resolves it. The rule this leaves
	// behind: anything flight.ts may clone must carry its geometry in a CLASS, because cssText is a
	// replacement and not a merge.
	// Literals for the same reason as boxSize above — a helper emits nothing Tailwind can see.
	// THE CHILD TIER'S TWO FACTORS ARE NOT THE SAME NUMBER, and that is deliberate:
	//
	//     BOX   0.9    "make the child chips 10% smaller overall" (Sam, Aug 8)
	//     TYPE  0.945  that same 0.9, then +5% back for readability (Sam, Aug 9)
	//
	// The second ask was first taken as +10%, which put the names at the parent tier's full 13px and Sam
	// called it "too big" on sight — so the type sits a whisker under a parent chip's rather than level
	// with it: 13→12.3, 12→11.3, 15→14.2. The chip is still visibly the smaller object, but its names
	// read at nearly full strength, which was the whole point of the increase.
	//
	// Type slightly outrunning its box is exactly the pressure that broke the spouse chips (design
	// §33.2), so this tier carries a no-wrap clamp — see the shrinkToFit call below.
	let nameText = $derived(
		chipFontClass
			? compact || isSibling
				? 'text-[calc(12.5px*var(--chip-k,1))]'
				: isChildTier
					? 'text-[calc(14.2px*var(--chip-k,1))]'
					: 'text-[calc(15px*var(--chip-k,1))]'
			: compact || isSibling
				? 'text-[calc(11px*var(--chip-k,1))]'
				: isChildTier
					? 'text-[calc(12.3px*var(--chip-k,1))]'
					: 'text-[calc(13px*var(--chip-k,1))]'
	);
	let dateText = $derived(
		compact || isSibling
			? 'text-[calc(10px*var(--chip-k,1))]'
			: isChildTier
				? 'text-[calc(11.3px*var(--chip-k,1))]'
				: 'text-[calc(12px*var(--chip-k,1))]'
	);
	// Sibling chips carry a THIRD line ("died young") below by–dy when dy_young — so the text stack is tighter
	// (less vertical padding, no inter-line gap) and that line is smaller than the years. Name + years keep
	// their sizes. Child chips are UNCHANGED — they render died-young INLINE (1876–1879 (died young)).
	// min-w-0 ON BOTH BRANCHES NOW. It used to be sibling-only because only sibling names were clamped;
	// shrinkToFit's measurement contract needs the wrapper's ancestors constrained, or node.clientWidth
	// reports the TEXT width and nothing ever shrinks (the Michael HD3384 blowup, documented in the
	// action). Extending the clamp to every chip means extending this too.
	let textAreaPad = $derived(
		isSibling ? 'min-w-0 gap-0 px-2.5 py-1' : 'min-w-0 gap-0.5 px-2.5 py-2'
	);
	let diedYoungText = 'text-[calc(9px*var(--chip-k,1))]';

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
	// THE UNION FOLDS INTO THE DATES LINE on a narrow stage — Sam's fix for the clipped "m. 1621".
	// See mergeChipUnion in stage.svelte.ts for the measurements, and for why it is scoped to small
	// stages rather than applied everywhere (desktop is signed off, and flight.ts's growUnionRow reads
	// the separate [data-chip-union] row off the destination chip).
	// Only when there IS a dates line to fold into: a spouse with no known years still needs the union
	// on its own row, or the marriage year would vanish altogether.
	let foldUnion = $derived(relation === 'spouse' && !!unionLine && hasDates && mergeChipUnion());
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
			class="min-w-0 font-medium {CHIP_TEXT} {chipFontClass} {nameText}"
			data-chip-name
			use:shrinkToFit={{
				max: (chipFontClass ? 12.5 : 11) * stage.u,
				min: (chipFontClass ? 9 : 8) * stage.u,
				key: `${displayName}|${stage.u}`
			}}
		>
			<span data-fit class="inline-block whitespace-nowrap">{displayName}</span>
		</div>
	{:else}
		<!-- CLAMPED TOO, as of Phase 2.75. Sibling chips have clamped their names since Phase 7; every
		     other chip rendered its name plain and simply wrapped.
		
		     That was already wrong at full size and nobody had hit it: on a 4+-spouse card the notch
		     seats are the COMPACT tier (160x65), and "Leopold Stokowski" needs ~97px of an ~92px text
		     column at 11px — so it wrapped to two lines, made a four-row stack of name/name/dates/union,
		     and the chip's `overflow: hidden` ate the marriage year. Measured identical at 1440, 1300 and
		     1000, i.e. it is not a small-screen bug; Gloria Vanderbilt's card has looked like that all
		     along and Sam happened to catch it while resizing.
		
		     The clamp is the machinery the sibling branch above already uses, so this is extending the
		     existing pattern rather than adding a second one. Both ends of the range ride --chip-k's
		     dial (see nameText) so a narrow stage shrinks the ceiling and the floor together, and `key`
		     carries u so a resize re-measures. -->
		<div
			class="min-w-0 font-medium {CHIP_TEXT} {chipFontClass} {nameText}"
			data-chip-name
			use:shrinkToFit={{
				max:
					(chipFontClass ? (compact ? 12.5 : 15) : compact ? 11 : 13) *
					stage.u *
					(isChildTier ? 0.945 : 1),
				// A LOWER FLOOR ON A CHILD CHIP, because it has the parent tier's TYPE in a 0.9 BOX and so
				// runs out of width sooner. 8.5 is where "Fernandine von und zu Eltz" — 26 characters in a
				// ~128px column — still fits on one line; above it she would hit the floor and be cut.
				min: (chipFontClass ? (compact ? 9.5 : 11) : compact ? 8.5 : isChildTier ? 8.5 : 10) * stage.u,
				// NEVER WRAP. A second line inside a fixed-height chip pushes the dates out through
				// `overflow: hidden` — the name would fit and the years would vanish. See ShrinkParams.
				ellipsis: true,
				key: `${displayName}|${stage.u}|${compact}|${isChildTier}`
			}}
		>
			<span data-fit class="inline-block whitespace-nowrap">{displayName}</span>
		</div>
	{/if}
{/snippet}

{#if href}
	<a
		{href}
		data-tx={isSibling ? person.t?.x : undefined}
		data-ty={isSibling ? person.t?.y : undefined}
		class="person-box flex overflow-hidden rounded-lg bg-white transition-shadow {boxSize}"
		class:died-young={dimmed}
		class:hooker-line={person.hd}
		class:spouse-line={person.sp}
		class:ee-line={person.ee}
		class:prism={isPynchonKin(person.id)}
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
						{' '}(died young){/if}{#if foldUnion}&#8195;{unionLine}{/if}
				</div>
			{/if}
			{#if isSibling && showDiedYoung}
				<div class="leading-none {CHIP_YEARS} {diedYoungText}">died young</div>
			{/if}
			{#if relation === 'spouse' && unionLine && !foldUnion}
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
		class="person-box flex overflow-hidden rounded-lg bg-white {boxSize}"
		class:died-young={dimmed}
		class:hooker-line={person.hd}
		class:spouse-line={person.sp}
		class:ee-line={person.ee}
		class:prism={isPynchonKin(person.id)}
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
						{' '}(died young){/if}{#if foldUnion}&#8195;{unionLine}{/if}
				</div>
			{/if}
			{#if isSibling && showDiedYoung}
				<div class="leading-none {CHIP_YEARS} {diedYoungText}">died young</div>
			{/if}
			{#if relation === 'spouse' && unionLine && !foldUnion}
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

<style>
	/* THE PYNCHON LINE's spectrum, on a chip. Same image and the same single dial as the featured card
	   (FeaturedCard's .prism), but NEITHER VALUE CARRIES OVER, because a chip is 220×75 against a card's
	   925×575 — a quarter the width and a thirteenth the area.

	   `cover` would scale the 900×600 source to 220 wide and then crop away 60% of its height, leaving a
	   thin horizontal slice of whatever hue happened to sit at the middle — a stripe, which is the one
	   thing this effect must never be. `200% auto` pulls the frame in so the chip shows a small but
	   legibly DIAGONAL piece of the band, and the off-centre position puts it across the chip's face
	   rather than its edge.

	   THE VEIL IS THE DIAL, and it lands close to the card's rather than well above it. The first pass
	   reasoned that a chip's 10–12px type needs more protection than the card's and set 0.62 — which was
	   over-thought: at chip scale the band is already cropped to a fraction of its width, so it arrives
	   diffuse before any veil is applied, and 0.62 on top left it washed out (Sam: "a little too diffuse
	   and light"). 0.48 restores the colour without crowding the type, because the crop was doing most of
	   the muting all along. */
	.person-box.prism {
		--prism-fade: 0.48;
		background-image:
			linear-gradient(
				rgba(255, 255, 255, var(--prism-fade)),
				rgba(255, 255, 255, var(--prism-fade))
			),
			url('/textures/prism-card.jpg');
		background-size:
			cover,
			200% auto;
		background-position:
			center,
			30% 40%;
		background-repeat: no-repeat, no-repeat;
	}
</style>
