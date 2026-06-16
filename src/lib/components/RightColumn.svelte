<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { Person, Education, Career, InstitutionRef } from '$lib/types/person';
	import type { Institution } from '$lib/types/institution';
	import type { Cemetery } from '$lib/types/cemetery';
	import { buildMapUrl, formatLocationShort } from '$lib/utils/dates';

	type Props = {
		person: Person;
		institutionsById?: Record<string, Institution>;
		burialCemetery?: Cemetery | null;
	};
	let { person, institutionsById = {}, burialCemetery = null }: Props = $props();

	const CAREER_LIMIT = 3;

	// Sort latest → earliest by end_year (fall back to start_year), then cap.
	// Thomas has 6 roles; only the 3 most recent fit the column.
	function careerRecency(c: Career): number {
		return c.end_year ?? c.start_year ?? -Infinity;
	}
	let careerEntries = $derived(
		[...(person.career ?? [])]
			.sort((a, b) => careerRecency(b) - careerRecency(a))
			.slice(0, CAREER_LIMIT)
	);

	let burialOpen = $state(false);

	// Resolve an INST id to a display name. short_name (compact) → name → primary_name
	// (drift). Returns null on miss so callers fall through to their own fallback.
	function instName(id: string | null | undefined): string | null {
		if (!id) return null;
		const inst = institutionsById[id];
		if (!inst) return null;
		return inst.short_name ?? inst.name ?? inst.primary_name ?? null;
	}

	// Education name: resolved INST → school_name → raw id (visible flag that the
	// INST is missing from the lookup) → em dash.
	function eduName(e: Education): string {
		return instName(e.institution_id) ?? e.school_name ?? e.institution_id ?? '—';
	}
	function eduDetail(e: Education): string | null {
		const parts = [e.dates, e.notes].filter(Boolean) as string[];
		return parts.length ? parts.join(' · ') : null;
	}

	function careerLine(c: Career): string {
		return [c.role, c.organization].filter(Boolean).join(', ');
	}
	function careerDates(c: Career): string | null {
		const s = c.start_year;
		const e = c.end_year;
		if (s == null && e == null) return null; // omit line entirely
		if (s != null && e != null) return `${s}–${e}`;
		if (s != null) return `${s}–`;
		return `–${e}`;
	}

	function affName(ref: InstitutionRef): string {
		return instName(ref.institution_id) ?? ref.institution_id ?? '—';
	}

	let burialMapUrl = $derived.by(() => {
		if (!burialCemetery) return null;
		if (burialCemetery.gps) return buildMapUrl(burialCemetery.gps);
		return buildMapUrl({
			city: burialCemetery.city,
			state: burialCemetery.state,
			country: burialCemetery.country
		});
	});
	let burialLocation = $derived(
		burialCemetery
			? formatLocationShort({
					city: burialCemetery.city,
					state: burialCemetery.state,
					country: burialCemetery.country
				})
			: null
	);
</script>

<div
	class="right-column flex h-full min-h-0 w-full flex-col space-y-4 overflow-y-auto pt-[6px] pr-6 break-words"
>
	<!-- 1. AFFILIATIONS (institutions[]) -->
	{#if person.institutions?.length}
		<section class="space-y-1.5">
			<div class="text-[10px] font-bold tracking-wider text-blue-900/50 uppercase select-none">
				Affiliations
			</div>
			{#each person.institutions as ref (ref.institution_id)}
				<div class="space-y-0.5">
					<div
						class="line-clamp-2 text-[13px] leading-snug font-medium text-slate-800"
						title={affName(ref)}
					>
						{affName(ref)}
					</div>
					{#if ref.institution_blurb}
						<div
							class="line-clamp-2 text-[11px] leading-snug text-slate-500"
							title={ref.institution_blurb}
						>
							{ref.institution_blurb}
						</div>
					{/if}
				</div>
			{/each}
		</section>
	{/if}

	<!-- 2. EDUCATION (education[]) -->
	{#if person.education?.length}
		<section class="space-y-1.5">
			<div class="text-[10px] font-bold tracking-wider text-blue-900/50 uppercase select-none">
				Education
			</div>
			{#each person.education as e, i (i)}
				<div class="space-y-0.5">
					<div
						class="line-clamp-2 text-[13px] leading-snug font-medium text-slate-800"
						title={eduName(e)}
					>
						{eduName(e)}
					</div>
					{#if eduDetail(e)}
						<div class="line-clamp-2 text-[11px] leading-snug text-slate-500" title={eduDetail(e)}>
							{eduDetail(e)}
						</div>
					{/if}
				</div>
			{/each}
		</section>
	{/if}

	<!-- 3. CAREER (career[]) — notes hidden, carried in title tooltip -->
	{#if careerEntries.length}
		<section class="space-y-1.5">
			<div class="text-[10px] font-bold tracking-wider text-blue-900/50 uppercase select-none">
				Career
			</div>
			{#each careerEntries as c, i (i)}
				<div class="space-y-0.5">
					<div
						class="line-clamp-2 text-[13px] leading-snug font-medium text-slate-800"
						title={c.notes ?? careerLine(c)}
					>
						{careerLine(c)}
					</div>
					{#if careerDates(c)}
						<div class="text-[11px] leading-snug text-slate-500">{careerDates(c)}</div>
					{/if}
				</div>
			{/each}
		</section>
	{/if}

	<!-- 4. LANDMARKS (scaffold — needs LM lookup later; tolerant of blurb/notes drift) -->
	{#if person.landmarks?.length}
		<section class="space-y-1.5">
			<div class="text-[10px] font-bold tracking-wider text-blue-900/50 uppercase select-none">
				Landmarks
			</div>
			{#each person.landmarks as lm (lm.landmark_id)}
				<div class="space-y-0.5">
					<div
						class="line-clamp-2 text-[13px] leading-snug font-medium text-slate-800"
						title={lm.landmark_id}
					>
						{lm.landmark_id}
					</div>
					{#if lm.landmark_blurb ?? lm.notes}
						<div
							class="line-clamp-2 text-[11px] leading-snug text-slate-500"
							title={lm.landmark_blurb ?? lm.notes ?? ''}
						>
							{lm.landmark_blurb ?? lm.notes}
						</div>
					{/if}
				</div>
			{/each}
		</section>
	{/if}

	<!-- 5. ARTWORKS (scaffold — needs ART lookup later) -->
	{#if person.artworks?.length}
		<section class="space-y-1.5">
			<div class="text-[10px] font-bold tracking-wider text-blue-900/50 uppercase select-none">
				Artworks
			</div>
			{#each person.artworks as art (art.artwork_id)}
				<div
					class="line-clamp-2 text-[13px] leading-snug font-medium text-slate-800"
					title={art.artwork_id}
				>
					{art.artwork_id}
				</div>
			{/each}
		</section>
	{/if}

	<!-- 6. DOCUMENTS (scaffold — needs DOC lookup later) -->
	{#if person.documents?.length}
		<section class="space-y-1.5">
			<div class="text-[10px] font-bold tracking-wider text-blue-900/50 uppercase select-none">
				Documents
			</div>
			{#each person.documents as doc (doc)}
				<div class="line-clamp-2 text-[13px] leading-snug font-medium text-slate-800" title={doc}>
					{doc}
				</div>
			{/each}
		</section>
	{/if}

	<!-- 7. BURIAL (relocated; collapsed by default, click caret to reveal) -->
	{#if burialCemetery}
		<section class="space-y-1.5">
			<button
				type="button"
				onclick={() => (burialOpen = !burialOpen)}
				aria-expanded={burialOpen}
				class="burial-toggle flex items-center gap-1 text-[10px] font-bold tracking-wider text-blue-900/50 uppercase transition-opacity select-none hover:opacity-60"
			>
				<svg
					class="h-2.5 w-2.5 transition-transform duration-150"
					class:rotate-90={burialOpen}
					viewBox="0 0 12 12"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path d="M4.5 3 L7.5 6 L4.5 9" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				<span>Burial</span>
			</button>
			{#if burialOpen}
				<div transition:slide={{ duration: 150, axis: 'y' }}>
					<div
						class="line-clamp-2 text-[12.8px] leading-snug font-medium text-slate-800"
						title={burialCemetery.name}
					>
						{burialCemetery.name}
					</div>
					{#if burialLocation}
						<div class="mt-0.5 text-[11px] leading-snug text-slate-500">{burialLocation}</div>
					{/if}
					{#if burialMapUrl}
						<a
							href={burialMapUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="mt-1 block text-[9px] leading-none tracking-wider text-blue-700 uppercase hover:text-blue-900 hover:underline"
							>Map</a
						>
					{/if}
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.burial-toggle {
		cursor: pointer;
	}
</style>
