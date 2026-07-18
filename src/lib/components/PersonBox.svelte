<script lang="ts">
	import type { PersonCompact } from '$lib/types/neighborhood';
	import { shrinkToFit } from '$lib/actions/shrinkToFit';

	type Props = {
		person: PersonCompact;
		relation: 'spouse' | 'parent' | 'child' | 'sibling' | 'grandparent' | 'grandchild';
		marriageYear?: number | null;
		compact?: boolean;
		dimmed?: boolean;
	};

	let { person, relation, marriageYear = null, compact = false, dimmed = false }: Props = $props();

	// SIBLING chips are their own size tier — ~20% smaller than a normal spouse/child chip (220×75 → 176×60).
	// Existing relations keep their exact classes (sibling only ADDS a branch), so no spouse/child chip moves.
	let isSibling = $derived(relation === 'sibling');
	let boxSize = $derived(isSibling ? 'h-[54px] w-[119px]' : compact ? 'h-[65px] w-[160px]' : 'h-[75px] w-[220px]');
	let photoW = $derived(compact && !isSibling ? 'w-[30%]' : 'w-[25%]');
	let nameText = $derived(compact || isSibling ? 'text-[11px]' : 'text-[13px]');
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
	let hasDates = $derived(person.by != null || person.dy != null);
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
			class="min-w-0 font-medium text-stone-900 {nameText}"
			data-chip-name
			use:shrinkToFit={{ max: 11, min: 8, key: displayName }}
		>
			<span data-fit class="inline-block whitespace-nowrap">{displayName}</span>
		</div>
	{:else}
		<div class="font-medium text-stone-900 {nameText}" data-chip-name>{displayName}</div>
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
					src={person.p}
					alt={person.n}
					class="h-full w-full object-cover object-top"
					loading="lazy"
				/>
			{/if}
		</div>

		<div class="text-area flex flex-col justify-center {textAreaPad} leading-tight">
			{@render nameEl()}
			{#if hasDates}
				<div class="text-stone-500 {dateText}">
					{person.by ?? ''}–{person.dy ?? ''}{#if relation === 'child' && dimmed}
						{' '}(died young){/if}
				</div>
			{/if}
			{#if isSibling && dimmed}
				<div class="leading-none text-stone-400 {diedYoungText}">died young</div>
			{/if}
			{#if relation === 'spouse' && marriageYear}
				<div class="text-stone-500 {dateText}">
					m. {marriageYear}
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
					src={person.p}
					alt={person.n}
					class="h-full w-full object-cover object-top"
					loading="lazy"
				/>
			{/if}
		</div>

		<div class="text-area flex flex-col justify-center {textAreaPad} leading-tight">
			{@render nameEl()}
			{#if hasDates}
				<div class="text-stone-500 {dateText}">
					{person.by ?? ''}–{person.dy ?? ''}{#if relation === 'child' && dimmed}
						{' '}(died young){/if}
				</div>
			{/if}
			{#if isSibling && dimmed}
				<div class="leading-none text-stone-400 {diedYoungText}">died young</div>
			{/if}
			{#if relation === 'spouse' && marriageYear}
				<div class="text-stone-500 {dateText}">
					m. {marriageYear}
				</div>
			{/if}
		</div>
	</div>
{/if}
