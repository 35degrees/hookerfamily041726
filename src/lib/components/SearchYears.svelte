<script lang="ts">
	/**
	 * SearchYears — the birth-year range.
	 *
	 * THREE VERSIONS, and what each one was told:
	 *   1. a transposed left rail — pill ticks, thickness-as-tier, Fraunces years, rail gold, navy
	 *      grips. Sam likes the SLIDER (the horizontal track, the hands as cursors) and disliked the
	 *      fonts, the colouring and the thickness of the ticks.
	 *   2. a decade histogram of the matches. "no to the bar graph."
	 *   3. this: version 1's slider with version 2's restraint.
	 *
	 * So the shape is the one that was approved, and every rejected property is answered:
	 *
	 *   FONTS      Inter at 9px, the modal's own face, not Fraunces. The years are a quiet index along
	 *              a control, not a display face making an argument.
	 *   COLOURING  one warm near-black — the ink already carrying `.line2`, `.count` and the chip
	 *              labels — at five strengths. No rail gold, no navy, no hue this modal was not
	 *              already using.
	 *   THICKNESS  hairlines. The rail's ticks are 2.4-4.14px pills because they are read from the
	 *              corner of the eye across a whole window; these are read directly, at 520px, and a
	 *              tick only has to say "here". 1px, with height as the tier instead of weight.
	 *
	 * Excluded years FADE rather than changing colour — the same ink, further back. A second colour
	 * would be a second thing to decode in a control whose whole job is to be read at a glance.
	 *
	 * The upper bound is COMPUTED, never written down: `new Date().getFullYear()`, so it becomes 2027
	 * on its own (Sam: "or 'now' this year, so it automatically updates in future years"). The lower
	 * bound is the earliest birth year in the LOADED index, so a 1540 record landing tomorrow moves the
	 * scale with no edit here.
	 */
	import { search, setYears } from '$lib/state/search.svelte';

	/** 25-year beat: fine enough to read as a scale at 520px, coarse enough not to become texture. */
	const STEP = 25;

	let el = $state<HTMLElement | null>(null);
	let dragging = $state<'lo' | 'hi' | null>(null);

	const now = new Date().getFullYear();
	const lo = $derived(search.yearBounds ? Math.floor(search.yearBounds[0] / 50) * 50 : 1550);
	const hi = $derived(now);
	const span = $derived(Math.max(1, hi - lo));

	const from = $derived(search.yearFrom ?? lo);
	const to = $derived(search.yearTo ?? hi);
	const full = $derived(search.yearFrom === null && search.yearTo === null);

	const pct = (y: number) => ((y - lo) / span) * 100;

	const ticks = $derived.by(() => {
		const out: { y: number; tier: 'step' | 'half' | 'century' }[] = [];
		for (let y = Math.ceil(lo / STEP) * STEP; y <= hi; y += STEP) {
			out.push({ y, tier: y % 100 === 0 ? 'century' : y % 50 === 0 ? 'half' : 'step' });
		}
		return out;
	});

	/**
	 * Measured against the SCALE, not the track. The track is the hit area and runs full width; the
	 * scale is inset by half a grip at each end so a handle parked on 1550 or on `now` is entirely
	 * inside the control and can be grabbed. Without the inset the end grips are centred ON the edge,
	 * half of each hangs outside, and a press near the end lands on the track instead of the handle —
	 * measured: a drag from the left edge moved the range two years and then stopped.
	 */
	function yearAt(clientX: number): number {
		if (!el) return lo;
		const r = el.getBoundingClientRect();
		const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
		return Math.round(lo + t * span);
	}

	/** One owner of the range: the module. Snapping a full span back to null/null is what lets the scan
	 *  short-circuit and the readout say "all years" without a second flag meaning the same thing. */
	function commit(a: number, b: number) {
		const f = Math.min(a, b);
		const t = Math.max(a, b);
		if (f <= lo && t >= hi) setYears(null, null);
		else setYears(f, t);
	}

	function onDown(e: PointerEvent, which: 'lo' | 'hi') {
		e.preventDefault();
		e.stopPropagation();
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
	/** The whole track is the control: a press moves whichever end is nearer. */
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
	const reset = () => setYears(null, null);
</script>

<div class="years">
	<div
		class="track"
		onpointerdown={onTrack}
		onpointermove={onMove}
		onpointerup={onUp}
		role="presentation"
	>
		<div class="scale" bind:this={el}>
			{#each ticks as t (t.y)}
				<span class="tick {t.tier}" class:out={t.y < from || t.y > to} style="left:{pct(t.y)}%"
				></span>
				{#if t.tier === 'century'}
					<span class="yr" class:out={t.y < from || t.y > to} style="left:{pct(t.y)}%">{t.y}</span>
				{/if}
			{/each}

			<!-- The claimed span, drawn ON the baseline so the line itself thickens between the grips
		     rather than a separate bar appearing above it. -->
			<span class="span" style="left:{pct(from)}%; right:{100 - pct(to)}%"></span>

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
	</div>

	<p class="readout">
		{#if full}
			all years
		{:else}
			<button class="clear-years" onclick={reset} title="Back to all years">
				{from} – {to >= now ? 'now' : to} &times;
			</button>
		{/if}
	</p>
</div>

<style>
	.years {
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 2px 4px 0;
	}
	.track {
		position: relative;
		height: 24px;
		cursor: pointer;
		touch-action: none;
	}
	/* THE SCALE IS INSET BY HALF A GRIP at each end, so a handle at either extreme sits wholly inside
	   the control. Absolute `left: %` resolves against the containing block, so the inset has to be a
	   real element rather than padding on the track — padding would move the box but not the
	   percentages. The track keeps its full width as the hit area. */
	.scale {
		position: absolute;
		inset: 0 3px;
	}
	/* The baseline the whole control hangs on. Drawn on the SCALE so it starts and ends where the
	   years do. */
	.scale::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 10px;
		height: 1px;
		background: rgba(48, 42, 34, 0.16);
		pointer-events: none;
	}
	/* HAIRLINES, and HEIGHT is the tier — not weight. The rail thickens its ticks because it is read
	   from the corner of the eye down a whole window; this is read directly at 520px, where a 4px tick
	   is a stripe rather than a mark. */
	.tick {
		position: absolute;
		bottom: 10px;
		width: 1px;
		transform: translateX(-50%);
		background: rgba(48, 42, 34, 0.38);
		transition: opacity 130ms ease-out;
	}
	.tick.step {
		height: 3px;
		opacity: 0.55;
	}
	.tick.half {
		height: 5px;
		opacity: 0.75;
	}
	.tick.century {
		height: 8px;
		opacity: 1;
	}
	/* Excluded years FADE — same ink, further back. A second colour would be a second thing to decode. */
	.tick.out {
		opacity: 0.18;
	}
	.yr {
		position: absolute;
		bottom: -2px;
		transform: translateX(-50%);
		font: 400 9px/1 var(--font-inter, sans-serif);
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.04em;
		color: rgba(48, 42, 34, 0.45);
		pointer-events: none;
		transition: color 130ms ease-out;
	}
	.yr.out {
		color: rgba(48, 42, 34, 0.2);
	}
	.span {
		position: absolute;
		bottom: 9.5px;
		height: 2px;
		border-radius: 999px;
		background: rgba(48, 42, 34, 0.45);
		pointer-events: none;
	}
	/* THE GRIP SAM APPROVED: a slim upright pill straddling the baseline, and a HAND for a cursor —
	   "the hands as cursors" was the part he named. `grab` says pick this up and move it; `ew-resize`
	   would say edge-of-a-panel, which is the wrong verb for a year. The navy is gone; it takes the
	   same warm ink as everything else here. */
	.grip {
		position: absolute;
		bottom: 2px;
		transform: translateX(-50%);
		width: 5px;
		height: 17px;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: rgba(48, 42, 34, 0.68);
		cursor: grab;
		touch-action: none;
		transition:
			height 140ms ease-out,
			bottom 140ms ease-out,
			background-color 140ms ease-out,
			box-shadow 140ms ease-out;
	}
	/* Grows from the CENTRE — `bottom` gives back half of what `height` gains, so it lengthens about
	   the baseline instead of rising off it. */
	.grip:hover,
	.grip:focus-visible {
		height: 21px;
		bottom: 0px;
		background: rgba(48, 42, 34, 0.92);
		box-shadow: 0 0 0 3px rgba(48, 42, 34, 0.1);
		outline: none;
	}
	.grip:active {
		cursor: grabbing;
	}
	.readout {
		margin: 0;
		text-align: center;
		font: 400 10px/1.3 var(--font-inter, sans-serif);
		letter-spacing: 0.02em;
		color: rgba(48, 42, 34, 0.5);
		font-variant-numeric: tabular-nums;
	}
	/* The way OUT of a narrowed range belongs ON the range, not in a row of controls elsewhere. */
	.clear-years {
		border: 0;
		background: none;
		padding: 0;
		cursor: pointer;
		font: inherit;
		color: rgba(48, 42, 34, 0.62);
		letter-spacing: inherit;
	}
	.clear-years:hover {
		color: rgba(48, 42, 34, 0.95);
	}
</style>
