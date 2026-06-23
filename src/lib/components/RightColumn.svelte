<script lang="ts">
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

	// Measured height of the pinned burial block. The scroll group reserves exactly this much
	// padding-bottom so the variable stack can never scroll under (or overlap) the pin — the
	// robust guarantee that absolute positioning + a measured reserve buys us over flex mt-auto.
	let burialHeight = $state(0);

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

	// Cemetery gps drifts between the {latitude, longitude} object and a "lat,lng" string across
	// the collection. Normalize to a clean coord object, or null if it's neither/unparseable —
	// so a malformed gps falls through to the address/city fallback instead of throwing inside
	// this $derived (which would tear down the whole FeaturedCard render).
	function normalizeGps(gps: unknown): { latitude: number; longitude: number } | null {
		if (gps && typeof gps === 'object' && !Array.isArray(gps)) {
			const lat = Number((gps as Record<string, unknown>).latitude);
			const lng = Number((gps as Record<string, unknown>).longitude);
			return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
		}
		if (typeof gps === 'string') {
			const m = gps.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
			if (m) {
				const lat = parseFloat(m[1]);
				const lng = parseFloat(m[2]);
				if (Number.isFinite(lat) && Number.isFinite(lng)) return { latitude: lat, longitude: lng };
			}
		}
		return null;
	}

	// Burial MAP destination, in fallback order: cemetery GPS (zoom-17 pin) → street address
	// search → city/state search. buildMapUrl has no address branch, so the address case is
	// built here in the same Google Maps search pattern. Defensive throughout — never throws.
	let burialMapUrl = $derived.by(() => {
		if (!burialCemetery) return null;
		const coords = normalizeGps(burialCemetery.gps);
		if (coords) return buildMapUrl(coords);
		if (burialCemetery.address) {
			return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(burialCemetery.address)}`;
		}
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

<!-- Root fills the content-zone height (h-full) and is the positioning context (relative) for the
     burial pin. It does NOT scroll itself — the variable stack below does. -->
<div class="right-column relative flex h-full min-h-0 w-full flex-col pt-[6px] break-words">
	<!-- Variable entity stack (Affiliations → … → Documents): the ONLY scrolling region. Its
	     padding-bottom is reserved to the measured burial-block height (+ gap) so nothing here can
	     ever scroll beneath the pinned corner. -->
	<div
		class="scroll-group flex-1 space-y-4 overflow-y-auto pr-6"
		style="min-height: 0; padding-bottom: {burialCemetery?.name ? burialHeight + 12 : 0}px"
	>
		<!-- 1. AFFILIATIONS (institutions[]) -->
		{#if person.institutions?.length}
			<section class="space-y-1.5">
				<div class="text-[10px] font-bold tracking-wider text-blue-900/50 uppercase select-none">
					Affiliations
				</div>
				<!-- Index key: a person can list the same institution twice as DISTINCT roles
				     (e.g. Yale student, then Yale tutor) — show both, never collide. -->
				{#each person.institutions as ref, i (i)}
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
				{#each person.landmarks as lm, i (i)}
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
				{#each person.artworks as art, i (i)}
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
				{#each person.documents as doc, i (i)}
					<div class="space-y-0.5">
						<div
							class="line-clamp-2 text-[13px] leading-snug font-medium text-slate-800"
							title={doc.document_id}
						>
							{doc.document_id}
						</div>
						{#if doc.document_blurb}
							<div
								class="line-clamp-2 text-[11px] leading-snug text-slate-500"
								title={doc.document_blurb}
							>
								{doc.document_blurb}
							</div>
						{/if}
					</div>
				{/each}
			</section>
		{/if}
	</div>

	<!-- BURIAL — pinned to the bottom-right corner, absolute (decoupled from flow), always open.
	     Suppressed entirely when the cemetery doesn't resolve to a name (no corner, never a raw ID).
	     bind:clientHeight feeds the scroll group's reserved padding so the stack can't overlap it. -->
	{#if burialCemetery?.name}
		<!-- Pin geometry:
		     • bottom-[-12px]: the content zone (FeaturedCard's .content) has 24px of p-6 bottom padding,
		       so bottom-0 anchors ~24px above the card's visual floor; nudge down 12px (~half) to sit
		       lower. Negative bottom only ADDS clearance above the pin, so the scroll group's measured
		       padding-bottom reserve still keeps the stack from overlapping — the mechanism is untouched.
		     • right-0 left-[-48px] (was inset-x-0): widen the box ~48px past the column's left edge so a
		       long proper name ("Center Church on the Green Churchyard", 210px @10.9px) fits one line
		       right-flush instead of wrapping; text-right keeps it anchored to the same right edge. Only
		       the burial box widens — the scroll group / reserve are unchanged.
		     • pointer-events-none here + pointer-events-auto on the MAP link: the widened box now overlaps
		       the narrative column and the footer band, so make it click-through except for the one link,
		       so it can never swallow a cross-connection or NB click. -->
		<section
			bind:clientHeight={burialHeight}
			class="burial-pin pointer-events-none absolute right-0 bottom-[-12px] left-[-48px] pr-6 text-right"
		>
			<div class="text-[10px] font-bold tracking-wider text-blue-900/50 uppercase select-none">
				Burial
			</div>
			<div
				class="mt-0.5 line-clamp-2 text-[10.9px] leading-snug font-medium text-slate-800"
				title={burialCemetery.name}
			>
				{burialCemetery.name}
			</div>
			<!-- Location + MAP on ONE right-flush line: "City, ST · MAP". Omitted entirely when there's
			     no location text and no resolvable map destination (name-only degrade). -->
			{#if burialLocation || burialMapUrl}
				<div class="mt-px text-[11px] leading-snug text-slate-500">
					{#if burialLocation}<span>{burialLocation}</span>{/if}{#if burialMapUrl}<a
							href={burialMapUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="pointer-events-auto inline align-baseline text-[9px] tracking-wider text-blue-700 uppercase hover:text-blue-900 hover:underline {burialLocation
								? 'ml-1.5'
								: ''}"
							>Map</a
						>{/if}
				</div>
			{/if}
		</section>
	{/if}
</div>
