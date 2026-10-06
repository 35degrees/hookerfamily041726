<script lang="ts">
	import type { Person, Education, Career, MediaRow } from '#lib/types/person.js';
	import { hoverIntent } from '#lib/state/hoverIntent.js';
	import type { Institution } from '#lib/types/institution.js';
	import type { Cemetery } from '#lib/types/cemetery.js';
	import { buildMapUrl, formatLocationShort } from '#lib/utils/dates.js';
	import { shrinkToFit } from '#lib/actions/shrinkToFit.js';
	import { fitMediaText } from '#lib/actions/fitMediaText.js';
	import { stage } from '#lib/state/stage.svelte.js';

	type Props = {
		person: Person;
		institutionsById?: Record<string, Institution>;
		burialCemetery?: Cemetery | null;
	};
	let { person, institutionsById = {}, burialCemetery = null }: Props = $props();

	// 3 each — 2 on a short window (stage.rowCap, Sam 100626: "two career and two educ entries").
	const EDU_LIMIT = $derived(stage.rowCap ?? 3);
	const CAREER_LIMIT = $derived(stage.rowCap ?? 3);

	// Education: canonical order, capped. No reliable recency key (dates is a free-form
	// string), so we take the first EDU_LIMIT rather than sort. Thomas-scale CVs overflow.
	let eduEntries = $derived((person.education ?? []).slice(0, EDU_LIMIT));

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

	// Resolved media rows — built at generate time by regenerate-data.js against the top-level
	// registries. The component NEVER sees a raw id; each row is the uniform MediaRow shape and
	// any field may be null. Present only on the focus person (?? [] guards context records).
	let landmarks = $derived(person.landmarksResolved ?? []);
	let artworks = $derived(person.artworksResolved ?? []);
	let documents = $derived(person.documentsResolved ?? []);
	let statues = $derived(person.statuesResolved ?? []);
	let videos = $derived(person.videosResolved ?? []);
	// The type step, as FeaturedCard rounds it — shrinkToFit takes px, so the --type-k sizes become numbers.
	const k = $derived(stage.k);
	const t = (px: number) => Math.round(px * k * 10) / 10;
	/** The hover tooltip for a media/document row: the whole title and description, for when either had
	 *  to shrink small or wrap (Sam: "if someone hovers over the text it should appear in a tooltip"). */
	const tip = (row: MediaRow) => [row.name, row.subtitle].filter(Boolean).join(' — ') || undefined;

	// Measured height of the pinned burial block. The scroll group reserves exactly this much
	// padding-bottom so the variable stack can never scroll under (or overlap) the pin — the
	// robust guarantee that absolute positioning + a measured reserve buys us over flex mt-auto.
	let burialHeight = $state(0);
	/**
	 * THE ROWS FADE OUT ABOVE THE BURIAL, rather than a slab of card colour being painted over them
	 * (100626). The slab was `--card-fill`, a FLAT colour: invisible on a plain white card, a white box on
	 * the Pynchon spectrum (which is why prism cards had it switched off), and a visible patch on the zone
	 * cards once their wax and gleam showed (Sam: "a white background behind the burial… you can see the
	 * transition around it"). A mask fades the column's OWN content instead, so it is correct over any
	 * surface. Same geometry as the slab it replaces: hidden under the pin (its height less the 12px it
	 * hangs below the column), and an 18px fade above that.
	 */
	const burialMask = $derived.by(() => {
		if (!burialCemetery?.name) return '';
		const under = Math.max(0, burialHeight - 12);
		const m = `linear-gradient(to bottom, #000 calc(100% - ${under + 18}px), transparent calc(100% - ${under}px))`;
		return ` mask-image: ${m}; -webkit-mask-image: ${m};`;
	});

	// Resolve an INST id to a display name. short_name (compact) → name → primary_name
	// (drift). Returns null on miss so callers fall through to their own fallback.
	function instName(id: string | null | undefined): string | null {
		if (!id) return null;
		const inst = institutionsById[id];
		if (!inst) return null;
		return inst.short_name ?? inst.name ?? inst.primary_name ?? null;
	}

	// Education name: resolved INST → spelled-out institution_name → school_name → em dash.
	// The old `?? institution_id` raw-id fallback is gone — it leaked LM-style ids onto the
	// card; a clean em dash is the honest degrade when nothing resolves.
	function eduName(e: Education): string {
		return instName(e.institution_id) ?? e.institution_name ?? e.school_name ?? '—';
	}

	function careerLine(c: Career): string {
		return [c.role, c.organization].filter(Boolean).join(', ');
	}
	function careerDates(c: Career): string | null {
		const s = c.start_year;
		const e = c.end_year;
		if (s == null && e == null) return null; // omit line entirely
		if (s != null && e != null) return s === e ? `${s}` : `${s}–${e}`;
		if (s != null) return `${s}–`;
		return `–${e}`;
	}

	// Cemetery gps drifts between the {latitude, longitude} object and a "lat,lng" string across
	// the collection. Normalize to a clean coord object, or null if it's neither/unparseable —
	// so a malformed gps falls through to the address/city fallback instead of throwing inside
	// this $derived (which would tear down the whole FeaturedCard render).
	function normalizeGps(gps: unknown): { latitude: number; longitude: number } | null {
		if (gps && typeof gps === 'object' && !Array.isArray(gps)) {
			// Accept both the canonical {latitude, longitude} and the short {lat, lng} form —
			// cemetery coords live under either key across the collection, and passing the whole
			// cemetery record here (see call site) lets a top-level lat/lng reach the map too.
			const o = gps as Record<string, unknown>;
			const lat = Number(o.latitude ?? o.lat);
			const lng = Number(o.longitude ?? o.lng);
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
		// GPS first from the .gps field, then from any top-level lat/lng on the cemetery record —
		// so coords stored either way still produce a zoom-17 pin instead of falling to address search.
		const coords = normalizeGps(burialCemetery.gps) ?? normalizeGps(burialCemetery);
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

	// ── Thumbnail hover popout (desktop only) ──────────────────
	// A mouse-anchored enlarged preview of a media thumbnail (Landmarks / Art / Statues — video is
	// text now). It follows the cursor and is portaled to <body> so it floats ABOVE the card border
	// (escaping the card clip-path / overflow / scroll-group). Anchored just LEFT of the pointer so it
	// opens inward over the narrative and never sits under the click → the row-link still fires.
	// State is set only in event handlers (never a $effect) → no $effect.pre read/write hazard.
	let popout = $state<{ src: string; alt: string; x: number; y: number } | null>(null);
	let colRoot: HTMLElement | undefined; // the right-column root (fills card height → its centre ≈ card centre)

	// Cloudinary-hosted thumbs (landmarks etc.) request a crisper fit crop sized for the larger popout;
	// other hosts as-is. These thumbnails are tiny, so the enlargement scales UP to person-photo size.
	function popoutSrc(thumbUrl: string): string {
		return thumbUrl.includes('res.cloudinary.com') && thumbUrl.includes('/upload/')
			? thumbUrl.replace('/upload/', '/upload/w_800,c_fit,q_auto/')
			: thumbUrl;
	}

	// NO speculative popout warmer. It was removed 2026-07 (Sam: reset the prerender effect) — even at low
	// priority behind a hold-off, warming the landmark/art/statue hover popouts contended with the PERSON
	// photos (chips + featured) for the connection pool and made chips paint in top-to-bottom. Those popouts
	// now load ON DEMAND (on hover, via popoutSrc); the same photo is small and measures lag-free. Person
	// photos are a strictly higher load scale — eager + fetchpriority high, chip-sized via Cloudinary — and
	// own the pool uncontested. See $lib/photo.ts for the person-photo loading doctrine.

	function trackPopout(e: MouseEvent, row: MediaRow) {
		if (!row.thumbUrl) return;
		// Horizontal is FIXED (anchored just left of the column, opening inward) so it never drifts side to
		// side; vertical FOLLOWS the cursor and is amplified 1.5× around the card centre, so small cursor
		// moves give more vertical travel. Clamped so the tall box stays on screen.
		const rect = colRoot?.getBoundingClientRect();
		const anchorX = rect ? rect.left - 53 : e.clientX - 71;
		const pivot = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
		const HALF = 288; // half of max-h (576) — keeps the tall box fully on screen
		const amplified = pivot + (e.clientY - pivot) * 1.5;
		const y = Math.max(HALF + 8, Math.min(amplified, window.innerHeight - HALF - 8));
		popout = { src: popoutSrc(row.thumbUrl), alt: row.alt ?? '', x: anchorX, y };
	}
	function closePopout() {
		popout = null;
	}

	// Portal the node to <body> so no card ancestor (clip-path / overflow / filter) can clip it.
	// Client-only: the {#if} is false during SSR and actions never run on the server.
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}
</script>

<!-- mediaBody: the inner content of a media row — 34px thumbnail slot (reserved even when empty,
     no placeholder box) + text block. Name is link-STYLED (goes blue + semibold on row hover via
     group-hover, no underline) but is NOT its own anchor — the whole row is the link (see mediaRow).
     Single secondary line = row.subtitle. showPlay overlays a ▶ badge, legible over thumb or slot. -->
{#snippet mediaBody(row: MediaRow, showPlay: boolean)}
	<div
		class="relative mt-0.5 h-[34px] w-[34px] shrink-0 overflow-hidden rounded"
		role="presentation"
		use:hoverIntent={{
			onArm: (e) => trackPopout(e, row),
			onMove: (e) => trackPopout(e, row),
			onDisarm: closePopout,
			enabled: () => !!row.thumbUrl
		}}
	>
		{#if row.thumbUrl}
			<img
				src={row.thumbUrl}
				alt={row.alt ?? ''}
				loading="lazy"
				class="h-[34px] w-[34px] object-cover"
				style={row.thumbPos ? `object-position:${row.thumbPos}` : undefined}
			/>
		{/if}
		{#if showPlay}
			<span class="absolute inset-0 grid place-items-center">
				<span
					class="grid h-[18px] w-[18px] place-items-center rounded-full bg-black/70 pl-px text-[calc(10px*var(--type-k,1))] leading-none text-white"
					>▶</span
				>
			</span>
		{/if}
	</div>
	<!-- TITLE + DESCRIPTION, MEASURED (Sam, 100226): the title on ONE line, shrinking 13 → 11.5px to stay
	     there; past that it wraps at full size, with the description after it if it fits whole — and the
	     row never runs past THREE lines (the title shrinks to 10px first). No ellipsis anywhere; the whole
	     text is on hover. See fitMediaText. -->
	<div
		class="min-w-0 flex-1"
		title={tip(row)}
		use:fitMediaText={{
			max: t(13),
			min: t(11.5),
			lines: 1,
			wrapAt: 'max',
			maxLines: 3,
			capMin: t(10),
			subMax: t(11),
			subMin: t(9.5),
			key: `${row.name}|${row.subtitle}|${k}`
		}}
	>
		<div
			data-title
			class="text-[calc(13px*var(--type-k,1))] leading-tight font-medium text-slate-800 group-hover:text-slate-600"
		>
			{row.name ?? '—'}
		</div>
		{#if row.subtitle}
			<div data-sub class="mt-px text-[calc(11px*var(--type-k,1))] leading-tight text-slate-500">
				{row.subtitle}
			</div>
		{/if}
	</div>
{/snippet}

<!-- Media row: the WHOLE row (thumbnail + text) is one click target when row.url is present —
     wrapped in a single <a> so anywhere in the row navigates. No-url rows stay a plain div. -->
{#snippet mediaRow(row: MediaRow, showPlay: boolean)}
	{#if row.url}
		<a
			href={row.url}
			target="_blank"
			rel="noopener"
			aria-label={row.name ?? undefined}
			class="group flex gap-2"
		>
			{@render mediaBody(row, showPlay)}
		</a>
	{:else}
		<div class="flex gap-2">
			{@render mediaBody(row, showPlay)}
		</div>
	{/if}
{/snippet}

<!-- textBody / textRow (documents): no thumbnail — a manuscript/letter has no meaningful icon.
     Same whole-row-link treatment; secondary line = row.subtitle (the document blurb), one line. -->
{#snippet textBody(row: MediaRow, video = false)}
	{#if video}
		<!-- VIDEO TITLES: ONE LINE, NEVER WRAPPING (Sam, 100226) — the right column is narrow, so a title
		     that wrapped was eating the column. The title SHRINKS to fit rather than being cut (Sam: "I kept
		     title/summary generally short so I'd rather have smaller font size than ellipsis" — an ellipsis
		     hid the last three letters of "Sierra Bonita Ranch Legacy"): shrinkToFit, the card name's own
		     clamp, 13px down to a 10px floor; a title still too long at the floor WRAPS (no ellipsis anywhere). Every video
		     gets the play mark in front (Sam: "ok to put logo in front of all videos"), at the title's cap
		     height so it costs as little of the column as possible; flex-none, so a long title can never
		     squeeze it, and it holds its size while the title beside it shrinks. -->
		<div
			class="flex min-w-0 items-center gap-1.5 text-[calc(13px*var(--type-k,1))] leading-snug font-medium text-slate-800 group-hover:text-slate-600"
			title={row.name ?? undefined}
		>
			<img
				src="/icons/youtube.png"
				alt=""
				draggable="false"
				class="block h-[calc(9.5px*var(--type-k,1))] w-auto flex-none"
			/>
			<div
				class="min-w-0 flex-1"
				use:shrinkToFit={{ max: t(13), min: t(10), key: `${row.name}|${k}` }}
			>
				<span data-fit class="inline-block whitespace-nowrap">{row.name ?? '—'}</span>
			</div>
		</div>
		{#if row.subtitle}
			<div class="text-[calc(11px*var(--type-k,1))] leading-snug text-slate-500" title={row.subtitle}>
				{row.subtitle}
			</div>
		{/if}
	{:else}
		<!-- DOCUMENTS: the title gets TWO lines, shrinking 13 → 10.5px to fit them with minimal line spacing
		     (Sam: "documents get long, I'd like to wrap on two lines with clamped font size"); past that
		     it wraps on and the description runs after it. No ellipsis; the whole text is on hover. -->
		<div
			class="min-w-0"
			title={tip(row)}
			use:fitMediaText={{
				max: t(13),
				min: t(10.5),
				lines: 2,
				wrapAt: 'min',
				maxLines: 3,
				capMin: t(10),
				subMax: t(11),
				subMin: t(9.5),
				key: `${row.name}|${row.subtitle}|${k}`
			}}
		>
			<div
				data-title
				class="text-[calc(13px*var(--type-k,1))] leading-tight font-medium text-slate-800 group-hover:text-slate-600"
			>
				{row.name ?? '—'}
			</div>
			{#if row.subtitle}
				<div data-sub class="mt-px text-[calc(11px*var(--type-k,1))] leading-tight text-slate-500">
					{row.subtitle}
				</div>
			{/if}
		</div>
	{/if}
{/snippet}
{#snippet textRow(row: MediaRow, video = false)}
	{#if row.url}
		<a
			href={row.url}
			target="_blank"
			rel="noopener"
			aria-label={row.name ?? undefined}
			class="group block space-y-0.5"
		>
			{@render textBody(row, video)}
		</a>
	{:else}
		<div class="space-y-0.5">
			{@render textBody(row, video)}
		</div>
	{/if}
{/snippet}

<!-- Root fills the content-zone height (h-full) and is the positioning context (relative) for the
     burial pin. It does NOT scroll itself — the variable stack below does. -->
<div
	bind:this={colRoot}
	class="right-column relative flex h-full min-h-0 w-full flex-col pt-[6px] break-words"
>
	<!-- Variable entity stack (Education → Career → Landmarks → Art → Documents → Statues → Video):
	     the ONLY scrolling region. Its padding-bottom is reserved to the measured burial-block
	     height (+ gap) so nothing here can ever scroll beneath the pinned corner.
     SPACING (Sam, 100226): 8px between sections (was 10, −20%) and 2.4px from each section header to its
     first row (was 6, −60%, the headers' mb-[2.4px]). -->
	<!-- scrollbar-gutter: stable (Sam's Safari film, 100326): with a CLASSIC scrollbar the bar takes
	     width, and on a column at the edge of fitting the two states fed each other every frame: the bar
	     narrows the column → the fit actions shrink/wrap the titles → taller → keeps the bar; no bar →
	     wider → titles fit on one line → shorter → bar goes → narrower again. A 60Hz flicker, and a
	     relayout plus refit on every frame. Reserving the gutter makes the column's width independent of
	     whether it scrolls, so the loop cannot start. Overlay scrollbars take no width: no change there. -->
	<div
		class="scroll-group flex-1 space-y-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]"
		style="min-height: 0; padding-bottom: {burialCemetery?.name ? burialHeight + 12 : 0}px;{burialMask}"
	>
		<!-- 1. EDUCATION (education[], capped at EDU_LIMIT) -->
		{#if eduEntries.length}
			<section class="space-y-1">
				<div class="mb-[2.4px] text-[calc(10px*var(--type-k,1))] font-bold tracking-wider text-blue-900/50 uppercase select-none">
					Education
				</div>
				{#each eduEntries as e, i (i)}
					<div class="space-y-0.5">
						<div
							class="line-clamp-2 text-[calc(13px*var(--type-k,1))] leading-tight font-medium text-slate-800"
							title={eduName(e)}
						>
							{eduName(e)}{#if e.dates}<span class="ml-1 text-[calc(11.5px*var(--type-k,1))] font-normal text-slate-400">{e.dates}</span>{/if}
						</div>
						{#if e.notes}
							<div class="line-clamp-2 text-[calc(11px*var(--type-k,1))] leading-snug text-slate-500" title={e.notes}>
								{e.notes}
							</div>
						{/if}
					</div>
				{/each}
			</section>
		{/if}

		<!-- 2. CAREER (career[]) — notes hidden, carried in title tooltip -->
		{#if careerEntries.length}
			<section class="space-y-1">
				<div class="mb-[2.4px] text-[calc(10px*var(--type-k,1))] font-bold tracking-wider text-blue-900/50 uppercase select-none">
					Career
				</div>
				{#each careerEntries as c, i (i)}
					<div class="space-y-0.5">
						<div
							class="line-clamp-2 text-[calc(13px*var(--type-k,1))] leading-tight font-medium text-slate-800"
							title={c.notes ?? careerLine(c)}
						>
							{careerLine(c)}{#if careerDates(c)}<span class="ml-1 text-[calc(11.5px*var(--type-k,1))] font-normal text-slate-400">{careerDates(c)}</span>{/if}
						</div>
					</div>
				{/each}
			</section>
		{/if}

		<!-- 3. LANDMARKS (landmarksResolved[]) -->
		{#if landmarks.length}
			<section class="space-y-1">
				<div class="mb-[2.4px] text-[calc(10px*var(--type-k,1))] font-bold tracking-wider text-blue-900/50 uppercase select-none">
					Landmarks
				</div>
				{#each landmarks as row, i (i)}
					{@render mediaRow(row, false)}
				{/each}
			</section>
		{/if}

		<!-- 4. ART (artworksResolved[]) -->
		{#if artworks.length}
			<section class="space-y-1">
				<div class="mb-[2.4px] text-[calc(10px*var(--type-k,1))] font-bold tracking-wider text-blue-900/50 uppercase select-none">
					Art
				</div>
				{#each artworks as row, i (i)}
					{@render mediaRow(row, false)}
				{/each}
			</section>
		{/if}

		<!-- 5. DOCUMENTS (documentsResolved[]) — text rows, no thumbnail -->
		{#if documents.length}
			<section class="space-y-1">
				<div class="mb-[2.4px] text-[calc(10px*var(--type-k,1))] font-bold tracking-wider text-blue-900/50 uppercase select-none">
					Documents
				</div>
				{#each documents as row, i (i)}
					{@render textRow(row)}
				{/each}
			</section>
		{/if}

		<!-- 6. STATUES (statuesResolved[]) -->
		{#if statues.length}
			<section class="space-y-1">
				<div class="mb-[2.4px] text-[calc(10px*var(--type-k,1))] font-bold tracking-wider text-blue-900/50 uppercase select-none">
					Statues
				</div>
				{#each statues as row, i (i)}
					{@render mediaRow(row, false)}
				{/each}
			</section>
		{/if}

		<!-- 7. VIDEO (videosResolved[]) — text rows (no thumbnail: the 34px YouTube thumb is
		     illegible under the play badge). Same whole-row link as documents. Duration would go on
		     the subtitle line later — it needs the YouTube Data API, not in the URL (data-chat task). -->
		{#if videos.length}
			<section class="space-y-1">
				<div class="mb-[2.4px] text-[calc(10px*var(--type-k,1))] font-bold tracking-wider text-blue-900/50 uppercase select-none">
					Video
				</div>
				{#each videos as row, i (i)}
					{@render textRow(row, true)}
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
			class="burial-pin pointer-events-none absolute right-0 bottom-[-12px] left-[-48px] pr-2 text-right"
		>
			<!-- The rows under this pin are faded out by a MASK on the scroll group (burialMask), not by a
			     slab of card colour painted here — see burialMask for why the slab had to go. -->
			<div
				class="relative z-10 text-[calc(10px*var(--type-k,1))] font-bold tracking-wider text-blue-900/50 uppercase select-none"
			>
				Burial
			</div>
			<div
				class="relative z-10 mt-0.5 line-clamp-2 font-opensans text-[calc(10.9px*var(--type-k,1))] leading-snug font-medium text-slate-800"
				title={burialCemetery.name}
			>
				{burialCemetery.name}
			</div>
			<!-- Location + MAP on ONE right-flush line: "City, ST · MAP". Omitted entirely when there's
			     no location text and no resolvable map destination (name-only degrade). -->
			<!-- Not on a short window: the place goes, the cemetery stays — as birth and death (Sam, 100626). -->
			{#if !stage.shortH && (burialLocation || burialMapUrl)}
				<div class="relative z-10 mt-px font-opensans text-[calc(11px*var(--type-k,1))] leading-snug font-light text-slate-500">
					{#if burialLocation}<span>{burialLocation}</span>{/if}{#if burialMapUrl}<a
							href={burialMapUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="pointer-events-auto inline align-baseline font-opensans text-[calc(9px*var(--type-k,1))] font-normal tracking-wider text-blue-700 uppercase hover:text-blue-900 hover:underline {burialLocation
								? 'ml-1.5'
								: ''}"
							>Map</a
						>{/if}
				</div>
			{/if}
		</section>
	{/if}
</div>

<!-- Thumbnail hover popout — mouse-anchored, portaled to <body> so it floats above the card border
     (escapes the card clip-path/overflow). Positioned just LEFT of the cursor (right-middle anchor via
     translate) so it opens inward over the narrative and never sits under the pointer → the row-link
     click passes through (also pointer-events-none). The box shrinks to the image, so the ring/shadow
     hug the real picture instead of framing a fixed box. -->
{#if popout}
	<div
		use:portal
		class="pointer-events-none fixed z-[9999]"
		style="left: {popout.x}px; top: {popout.y}px; transform: translate(-100%, -50%);"
		aria-hidden="true"
	>
		<img
			src={popout.src}
			alt={popout.alt}
			class="block max-h-[576px] max-w-[456px] rounded-md shadow-[18px_22px_48px_-12px_rgba(0,0,0,0.55)] ring-1 ring-black/10"
		/>
	</div>
{/if}
