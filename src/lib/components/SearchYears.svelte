<script lang="ts">
	/**
	 * SearchYears — the birth-year range, drawn as a horizontal cut of the LEFT RAIL.
	 *
	 * NOT A RANGE INPUT WITH THE HOUSE COLOURS PAINTED ON. The app already owns a timeline and it has a
	 * specific vocabulary, recorded in design §35/§36 and built in TimelineRail.svelte:
	 *
	 *   - ticks are PILLS, not hairlines (Sam: "more pill like… a couple of px thicker and add rounded
	 *     ends"), with `border-radius: 999px` so every cap is a true semicircle
	 *   - THICKNESS IS THE TIER. The rail does not draw long/short ticks to rank them, it draws
	 *     thick/thin ones — `.tick.half` is 4.14px, and the note beside it says thickness is "the ONLY
	 *     lever" on how pronounced a tick reads
	 *   - the rhythm is 12.5 YEARS, tiered at 12.5 / 50
	 *   - years are set in FRAUNCES, tabular figures, in `--color-rail-ink` — "a high-contrast serif
	 *     says the years are a SCALE rather than more labelling", and it is the one place in the app
	 *     that uses that face. Borrowing it here is what makes this read as the same instrument.
	 *
	 * So this is the rail turned ninety degrees: same ink, same face, same pill, same 12.5-year beat.
	 * A vertical tick becomes a vertical pill of the same thickness — the axis of "thickness" is
	 * preserved, which is the part that would have been lost by naively transposing width and height.
	 *
	 * THE SELECTED SPAN IS SOLID AND THE REST DISSOLVES, which is §35.4's rule rather than a choice of
	 * mine: the rail answers uncertainty by SOFTENING an end, never by adding a second mark. Excluded
	 * years are not greyed with a different colour or hatched; they are the same ink at lower opacity.
	 *
	 * THE UPPER BOUND IS "now" AND IS COMPUTED, not written down — Sam: "or 'now' this year, so it
	 * automatically updates in future years". The lower bound comes from the corpus, not from a
	 * constant: the earliest birth year in the tree happens to be 1550 today, and if a 1540 record
	 * lands tomorrow the scale should already know.
	 */
	import { search, setYears } from '$lib/state/search.svelte';

	/** 12.5 years, the rail's own beat (TimelineRail's STEP). Tiered by thickness at 50. */
	const STEP = 12.5;
	const LABEL_EVERY = 100;

	let el = $state<HTMLElement | null>(null);
	let dragging = $state<'lo' | 'hi' | null>(null);

	const now = new Date().getFullYear();
	/** Corpus-derived, so the scale tracks the data rather than a hard-coded 1550. */
	const lo = $derived(search.yearBounds ? search.yearBounds[0] : 1550);
	const hi = $derived(Math.max(now, search.yearBounds ? search.yearBounds[1] : now));
	const span = $derived(Math.max(1, hi - lo));

	/** null means "no bound set" — the handle rests at the end of the scale. */
	const from = $derived(search.yearFrom ?? lo);
	const to = $derived(search.yearTo ?? hi);
	const full = $derived(search.yearFrom === null && search.yearTo === null);

	const pct = (y: number) => ((y - lo) / span) * 100;

	const ticks = $derived.by(() => {
		const out: { y: number; tier: 'step' | 'half' | 'label' }[] = [];
		for (let y = Math.ceil(lo / STEP) * STEP; y <= hi; y += STEP) {
			out.push({ y, tier: y % LABEL_EVERY === 0 ? 'label' : y % 50 === 0 ? 'half' : 'step' });
		}
		return out;
	});

	function yearAt(clientX: number): number {
		if (!el) return lo;
		const r = el.getBoundingClientRect();
		const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
		return Math.round(lo + t * span);
	}

	/** Writing back through `setYears` keeps ONE owner of the range — the module, not this component. */
	function commit(nextFrom: number, nextTo: number) {
		const a = Math.min(nextFrom, nextTo);
		const b = Math.max(nextFrom, nextTo);
		// Snapping the full range back to null/null matters: the scan short-circuits on it, and it is
		// also what lets the readout say "all years" without a second flag meaning the same thing.
		if (a <= lo && b >= hi) setYears(null, null);
		else setYears(a, b);
	}

	function onDown(e: PointerEvent, which: 'lo' | 'hi') {
		e.preventDefault();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		dragging = which;
	}
	function onMove(e: PointerEvent) {
		if (!dragging) return;
		const y = yearAt(e.clientX);
		if (dragging === 'lo') commit(y, to);
		else commit(from, y);
	}
	function onUp(e: PointerEvent) {
		if (dragging) (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
		dragging = null;
	}
	/** A click on the track moves whichever handle is nearer — the whole rail is the control. */
	function onTrack(e: PointerEvent) {
		if (dragging) return;
		const y = yearAt(e.clientX);
		if (Math.abs(y - from) <= Math.abs(y - to)) commit(y, to);
		else commit(from, y);
	}
	function onKey(e: KeyboardEvent, which: 'lo' | 'hi') {
		const bump = e.shiftKey ? 25 : 1;
		let d = 0;
		if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') d = -bump;
		else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') d = bump;
		else if (e.key === 'Home') d = -span;
		else if (e.key === 'End') d = span;
		else return;
		e.preventDefault();
		if (which === 'lo') commit(Math.min(Math.max(lo, from + d), to), to);
		else commit(from, Math.max(Math.min(hi, to + d), from));
	}
</script>

<div class="years">
	<div
		class="track"
		bind:this={el}
		onpointerdown={onTrack}
		onpointermove={onMove}
		onpointerup={onUp}
		role="presentation"
	>
		<!-- The scale. Ticks are the rail's pills; the ones outside the selection dissolve rather than
		     changing colour (§35.4). -->
		{#each ticks as t (t.y)}
			<span
				class="tick {t.tier}"
				class:out={t.y < from || t.y > to}
				style="left:{pct(t.y)}%"
			></span>
			{#if t.tier === 'label'}
				<span class="yr" class:out={t.y < from || t.y > to} style="left:{pct(t.y)}%">{t.y}</span>
			{/if}
		{/each}

		<span class="band" style="left:{pct(from)}%; right:{100 - pct(to)}%"></span>

		<button
			class="grip"
			style="left:{pct(from)}%"
			onpointerdown={(e) => onDown(e, 'lo')}
			onpointermove={onMove}
			onpointerup={onUp}
			onkeydown={(e) => onKey(e, 'lo')}
			role="slider"
			aria-label="Earliest birth year"
			aria-valuemin={lo}
			aria-valuemax={hi}
			aria-valuenow={from}
		></button>
		<button
			class="grip"
			style="left:{pct(to)}%"
			onpointerdown={(e) => onDown(e, 'hi')}
			onpointermove={onMove}
			onpointerup={onUp}
			onkeydown={(e) => onKey(e, 'hi')}
			role="slider"
			aria-label="Latest birth year"
			aria-valuemin={lo}
			aria-valuemax={hi}
			aria-valuenow={to}
		></button>
	</div>

	<p class="readout">
		{#if full}
			all years
		{:else}
			{from} – {to >= now ? 'now' : to}
		{/if}
	</p>
</div>

<style>
	.years {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 0 6px;
	}
	.track {
		position: relative;
		height: 26px;
		cursor: pointer;
		touch-action: none;
	}
	/* THE PILL, and thickness is the tier — TimelineRail's rule, transposed. A vertical tick keeps
	   `width` as its thickness so the axis that ranks them is the same axis in both instruments. */
	.tick {
		position: absolute;
		bottom: 9px;
		transform: translateX(-50%);
		border-radius: 999px;
		background: var(--color-rail-ink, #ab7a42);
		transition:
			opacity 140ms ease-out,
			background-color 140ms ease-out;
	}
	.tick.step {
		width: 1.5px;
		height: 4px;
		opacity: 0.5;
	}
	.tick.half {
		width: 2.4px;
		height: 7px;
		opacity: 0.72;
	}
	.tick.label {
		width: 4.14px; /* the rail's own .tick.half thickness */
		height: 10px;
		opacity: 0.92;
	}
	/* DISSOLVES, never re-colours (§35.4: an end that is not claimed is softened, not marked). */
	.tick.out {
		opacity: 0.16;
	}
	.yr {
		position: absolute;
		bottom: -4px;
		transform: translateX(-50%);
		font-family: var(--font-fraunces, Georgia, serif);
		font-weight: 500;
		font-size: 9.5px;
		font-variant-numeric: tabular-nums;
		color: var(--color-rail-ink, #ab7a42);
		opacity: 0.86;
		pointer-events: none;
		transition: opacity 140ms ease-out;
	}
	.yr.out {
		opacity: 0.22;
	}
	/* The claimed span. A hairline along the tick baseline rather than a filled box: the ticks are the
	   instrument and this only says how much of it is live. */
	.band {
		position: absolute;
		bottom: 9px;
		height: 1.5px;
		border-radius: 999px;
		background: var(--color-rail-ink, #ab7a42);
		opacity: 0.55;
		pointer-events: none;
	}
	/* A GRIP IS A TICK THAT GREW — same pill, same ink, one tier past the labelled one. It is not a
	   circle: a knob would be the one round thing in an instrument made entirely of pills. */
	.grip {
		position: absolute;
		bottom: 5px;
		transform: translateX(-50%);
		width: 5.5px;
		height: 18px;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: var(--color-inkblue);
		cursor: grab;
		touch-action: none;
		transition:
			height 140ms ease-out,
			box-shadow 140ms ease-out;
	}
	.grip:hover,
	.grip:focus-visible {
		height: 21px;
		box-shadow: 0 0 0 3px hsl(var(--shadow-ink) / 0.14);
		outline: none;
	}
	.grip:active {
		cursor: grabbing;
	}
	.readout {
		margin: 0;
		text-align: center;
		font: 400 10.5px/1.2 var(--font-inter, sans-serif);
		letter-spacing: 0.02em;
		color: rgba(48, 42, 34, 0.55);
		font-variant-numeric: tabular-nums;
	}
</style>
