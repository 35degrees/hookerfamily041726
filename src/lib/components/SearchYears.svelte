<script lang="ts">
	/**
	 * SearchYears — the year range, drawn as the SHAPE OF THE MATCHES over time.
	 *
	 * The first version transposed the left rail: pill ticks, thickness-as-tier, Fraunces years, rail
	 * ink. It was a careful inheritance from a component Sam does not like, which makes it a careful
	 * inheritance of the wrong thing. Thrown out.
	 *
	 * WHAT THIS IS INSTEAD: a ruler tells you where 1780 is, which you already know. A genealogy has a
	 * far more interesting answer to "what happened between 1550 and now" — the tree's own mass. So the
	 * control is a decade histogram of the CURRENT matches, and the range is a window dragged across
	 * it. Search "yale" and the shape tells you when Yale men were being born; pick Hooker descendants
	 * and the whole curve rises through the 1800s. The user is selecting ON something rather than
	 * against an abstract axis, and every drag is answerable before it is made.
	 *
	 * THE BARS ARE THE QUESTION AND THE RANGE IS THE ANSWER, which is why the histogram is built from
	 * the term-and-category set BEFORE the year cut (see `result` in search.svelte.ts). Drawn from the
	 * filtered set it would be circular: dragging a handle would eat the shape you are dragging
	 * against, and it could never show you what you are excluding.
	 *
	 * COLOUR: neither gold nor navy — Sam rejected both here. It uses the modal's own ink, the warm
	 * near-black already carrying `.line2`, `.count` and the chip labels, at three strengths: excluded
	 * bars, included bars, and the grips. One ink, three weights. Nothing in this control introduces a
	 * hue the modal was not already using, which is what keeps it from reading as a widget dropped in
	 * from somewhere else.
	 *
	 * The upper bound is COMPUTED, never written down — `new Date().getFullYear()`, so it becomes 2027
	 * on its own (Sam: "or 'now' this year, so it automatically updates in future years"). The lower
	 * bound is the earliest birth year in the loaded index.
	 */
	import { search, setYears } from '$lib/state/search.svelte';

	let el = $state<HTMLElement | null>(null);
	let dragging = $state<'lo' | 'hi' | null>(null);

	const now = new Date().getFullYear();
	const lo = $derived(search.hist.length ? search.hist[0].year : 1550);
	const hi = $derived(search.hist.length ? search.hist[search.hist.length - 1].year + 10 : now);
	const span = $derived(Math.max(1, hi - lo));

	const from = $derived(search.yearFrom ?? lo);
	const to = $derived(search.yearTo ?? hi);
	const full = $derived(search.yearFrom === null && search.yearTo === null);

	const pct = (y: number) => ((y - lo) / span) * 100;

	/**
	 * Bar heights on a SQUARE ROOT, not linear. The tree is wildly uneven — a peak decade holds many
	 * times what the 1500s do — and on a linear scale four centuries of real people flatten into a rule
	 * along the bottom while one spike owns the control. The root keeps the peak obviously the peak and
	 * still lets a decade of nine people be visible as nine rather than as nothing. It is a reading aid,
	 * and the axis is deliberately unlabelled because the height is not a number anyone should read off.
	 */
	const bars = $derived.by(() => {
		const p = Math.sqrt(Math.max(1, search.peak));
		return search.hist.map((b) => ({
			year: b.year,
			n: b.n,
			h: b.n ? Math.max(0.06, Math.sqrt(b.n) / p) : 0
		}));
	});

	/** Centuries only. A label every 50 would crowd 520px, and the century is the unit people think in. */
	const marks = $derived.by(() => {
		const out: number[] = [];
		for (let y = Math.ceil(lo / 100) * 100; y < hi; y += 100) out.push(y);
		return out;
	});

	function yearAt(clientX: number): number {
		if (!el) return lo;
		const r = el.getBoundingClientRect();
		const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
		return Math.round(lo + t * span);
	}

	/** One owner of the range: the module. Snapping the full span back to null/null is what lets the
	 *  scan short-circuit and the readout say "all years" without a second flag meaning the same. */
	function commit(a: number, b: number) {
		const from2 = Math.min(a, b);
		const to2 = Math.max(a, b);
		if (from2 <= lo && to2 >= hi) setYears(null, null);
		else setYears(from2, to2);
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
	/** The whole plot is the control: a press moves whichever edge is nearer. */
	function onPlot(e: PointerEvent) {
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

<div class="years" class:live={search.hist.length > 0}>
	<div
		class="plot"
		bind:this={el}
		onpointerdown={onPlot}
		onpointermove={onMove}
		onpointerup={onUp}
		role="presentation"
	>
		{#each bars as b (b.year)}
			<span
				class="bar"
				class:out={b.year + 10 <= from || b.year >= to}
				style="left:{pct(b.year)}%; width:{(10 / span) * 100}%; height:{(b.h * 100).toFixed(1)}%"
			></span>
		{/each}

		<!-- Century marks sit UNDER the bars as hairlines, so the plot is read as one surface rather
		     than as a chart with a separate axis pinned beneath it. -->
		{#each marks as m (m)}
			<span class="mark" style="left:{pct(m)}%"></span>
			<span class="mark-y" class:out={m < from || m > to} style="left:{pct(m)}%">{m}</span>
		{/each}

		<span class="edge" style="left:{pct(from)}%"></span>
		<span class="edge" style="left:{pct(to)}%"></span>

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
		gap: 1px;
		padding: 0 4px;
		/* Nothing to plot while idle — the control appears with its data rather than sitting empty and
		   inviting a drag that could not mean anything. */
		opacity: 0;
		pointer-events: none;
		transition: opacity 200ms ease-out;
	}
	.years.live {
		opacity: 1;
		pointer-events: auto;
	}
	.plot {
		position: relative;
		height: 38px;
		cursor: crosshair;
		touch-action: none;
	}
	/* ONE INK AT THREE STRENGTHS — the modal's own warm near-black, already carrying .line2, .count and
	   the chip labels. No new hue enters with this control. */
	.bar {
		position: absolute;
		bottom: 11px;
		background: rgba(48, 42, 34, 0.5);
		border-radius: 1.5px 1.5px 0 0;
		transition:
			background-color 130ms ease-out,
			opacity 130ms ease-out;
	}
	.bar.out {
		background: rgba(48, 42, 34, 0.15);
	}
	/* The baseline is the one continuous line in the plot — it is what the bars stand on and what the
	   grips run to, so the whole control reads as one object. */
	.plot::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 11px;
		height: 1px;
		background: rgba(48, 42, 34, 0.22);
		pointer-events: none;
	}
	.mark {
		position: absolute;
		bottom: 11px;
		width: 1px;
		height: 4px;
		background: rgba(48, 42, 34, 0.28);
		pointer-events: none;
	}
	.mark-y {
		position: absolute;
		bottom: -1px;
		transform: translateX(-50%);
		font: 400 9px/1 var(--font-inter, sans-serif);
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.03em;
		color: rgba(48, 42, 34, 0.42);
		pointer-events: none;
		transition: color 130ms ease-out;
	}
	.mark-y.out {
		color: rgba(48, 42, 34, 0.2);
	}
	/* The two edges of the window, drawn full height so the cut is legible against the bars themselves
	   rather than only at the grips. */
	.edge {
		position: absolute;
		top: 0;
		bottom: 11px;
		width: 1px;
		background: rgba(48, 42, 34, 0.34);
		pointer-events: none;
	}
	/* A grip is a small square tab sitting ON the baseline — square because everything this modal is
	   made of is squared (the rows, the chips), and small because the plot is the thing to look at. */
	.grip {
		position: absolute;
		bottom: 6px;
		transform: translateX(-50%);
		width: 9px;
		height: 11px;
		padding: 0;
		border: 0;
		border-radius: 2px;
		background: rgba(48, 42, 34, 0.72);
		cursor: ew-resize;
		touch-action: none;
		transition:
			background-color 130ms ease-out,
			box-shadow 130ms ease-out;
	}
	.grip:hover,
	.grip:focus-visible {
		background: rgba(48, 42, 34, 0.95);
		box-shadow: 0 0 0 3px rgba(48, 42, 34, 0.12);
		outline: none;
	}
	.readout {
		margin: 0;
		text-align: center;
		font: 400 10px/1.3 var(--font-inter, sans-serif);
		letter-spacing: 0.02em;
		color: rgba(48, 42, 34, 0.5);
		font-variant-numeric: tabular-nums;
	}
	/* The readout becomes the way OUT of a narrowed range once there is one — the control that undoes a
	   filter belongs on the filter, not in a row of buttons somewhere else. */
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
