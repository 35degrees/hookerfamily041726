<script lang="ts">
	/**
	 * SearchYears — the birth-year range. The handles ARE the years, and each one is a little card.
	 *
	 * FOUR VERSIONS. The first three all failed the same way and it took Sam saying "it looks like
	 * Minecraft 1999" for me to see it: I kept building a WIDGET — a track, a scale, tick marks, a
	 * knob — in an app that has no widgets in it anywhere. Every other control here is a physical
	 * object. The Shuffle button's own note says it is "AN OBJECT AT A HEIGHT, not a set of styled
	 * states". The cards are "discrete baseball card like physical objects the user can track". Chips
	 * are cards. Rows are cards. A row of hairline ticks with a rectangular knob on it belongs to a
	 * different application, and no amount of re-colouring was going to fix that.
	 *
	 * SO THE YEARS ARE CARDS. Two small ones, the modal's paper, the house rose shadow, the same
	 * radius as a chip, the name face and the name ink — dragged along a line. Dragging a year is
	 * dragging a card, which is the one gesture this whole app is built out of.
	 *
	 * AND THE TICKS ARE GONE, all of them. They were the Minecraft: forty little rectangles is texture,
	 * not information, and the scale they provided is already carried better by the cards themselves —
	 * a card reading 1801 sitting a third of the way along IS the scale, and it is exact rather than
	 * approximate. What is left is one hairline for the whole span and a heavier one for the part that
	 * is claimed.
	 *
	 * The upper bound is COMPUTED, never written down: `new Date().getFullYear()`, so it becomes 2027
	 * on its own (Sam: "or 'now' this year, so it automatically updates in future years"). The lower
	 * bound is the earliest birth year in the LOADED index, floored to its half-century.
	 */
	import { search, setYears } from '$lib/state/search.svelte';

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

	/**
	 * HALF-CENTURIES ONLY — about ten marks across the whole span. The version Sam called Minecraft ran
	 * every 25 years and put forty rectangles on a 520px line, which stops being a scale and becomes
	 * texture. Ten is enough to say where you are and few enough that the two cards stay the thing you
	 * look at. No years on them: the cards carry the only numbers this control needs, and exactly.
	 */
	const ticks = $derived.by(() => {
		const out: { y: number; century: boolean }[] = [];
		for (let y = Math.ceil(lo / 50) * 50; y <= hi; y += 50) out.push({ y, century: y % 100 === 0 });
		return out;
	});

	function yearAt(clientX: number): number {
		if (!el) return lo;
		const r = el.getBoundingClientRect();
		const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
		return Math.round(lo + t * span);
	}

	/** One owner of the range: the module. Snapping a full span back to null/null is what lets the scan
	 *  short-circuit and the label read "now" without a second flag meaning the same thing. */
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
	/** The whole line is the control: a press moves whichever card is nearer. */
	function onLine(e: PointerEvent) {
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
		class="line"
		onpointerdown={onLine}
		onpointermove={onMove}
		onpointerup={onUp}
		role="presentation"
	>
		<div class="scale" bind:this={el}>
			<span class="rule"></span>
			{#each ticks as t (t.y)}
				<span
					class="tick"
					class:century={t.century}
					class:out={t.y < from || t.y > to}
					style="left:{pct(t.y)}%"
				></span>
			{/each}
			<span class="held" style="left:{pct(from)}%; right:{100 - pct(to)}%"></span>

			<button
				class="ycard"
				class:dragging={dragging === 'lo'}
				style="left:{pct(from)}%"
				onpointerdown={(e) => onDown(e, 'lo')}
				onpointermove={onMove}
				onpointerup={onUp}
				onkeydown={(e) => onKey(e, 'lo')}
				role="slider"
				aria-label="Earliest birth year"
				aria-valuemin={lo}
				aria-valuemax={hi}
				aria-valuenow={from}>{from}</button
			>
			<button
				class="ycard"
				class:dragging={dragging === 'hi'}
				style="left:{pct(to)}%"
				onpointerdown={(e) => onDown(e, 'hi')}
				onpointermove={onMove}
				onpointerup={onUp}
				onkeydown={(e) => onKey(e, 'hi')}
				role="slider"
				aria-label="Latest birth year"
				aria-valuemin={lo}
				aria-valuemax={hi}
				aria-valuenow={to}>{to >= now ? 'now' : to}</button
			>
		</div>
	</div>

	{#if !full}
		<button class="clear-years" onclick={reset}>all years</button>
	{/if}
</div>

<style>
	.years {
		position: relative;
		padding: 3px 4px 0;
	}
	.line {
		position: relative;
		height: 26px;
		cursor: pointer;
		touch-action: none;
	}
	/* Inset by half a card, so a year parked at either extreme sits wholly inside the control. Absolute
	   `left: %` resolves against the containing block, so this has to be an element rather than padding
	   on the parent — padding moves the box without moving the percentages. (Measured before the inset:
	   a drag from the left edge moved the range two years and then stopped, because the press landed on
	   the line rather than on the card.) */
	.scale {
		position: absolute;
		inset: 0 22px;
	}
	/* ONE hairline for the whole span. Not forty. */
	.rule {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 1px;
		background: rgba(48, 42, 34, 0.18);
		pointer-events: none;
	}
	/* NARROW, and hanging BELOW the rule so the cards keep the line to themselves. 1px wide — narrow is
	   the whole brief — with height as the only difference between a half-century and a century, since
	   thickness is what made the last set read as a fence. They fade outside the claimed span, same ink
	   further back, so the range is legible even where the cards are not looked at. */
	.tick {
		position: absolute;
		top: 50%;
		width: 1px;
		transform: translateX(-50%);
		background: rgba(48, 42, 34, 0.3);
		pointer-events: none;
		transition: opacity 140ms ease-out;
	}
	.tick.century {
		height: 6px;
		opacity: 1;
	}
	.tick:not(.century) {
		height: 3.5px;
		opacity: 0.62;
	}
	.tick.out {
		opacity: 0.2;
	}
	/* The claimed part, drawn on the same line so the rule THICKENS between the cards rather than a
	   second bar appearing beside it. */
	.held {
		position: absolute;
		top: 50%;
		transform: translateY(-0.5px);
		height: 2px;
		border-radius: 999px;
		background: rgba(48, 42, 34, 0.42);
		pointer-events: none;
	}
	/**
	 * A YEAR IS A LITTLE CARD. House paper, the chip's own shadow token, a chip's radius, the name face
	 * in the name ink — the same object as everything else in the modal, at the smallest size it can
	 * still be read at. It sits ON the line rather than above it, so the line runs behind it and the
	 * card reads as threaded onto the span.
	 */
	.ycard {
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		padding: 3px 6px;
		border: 0;
		border-radius: 4px;
		background: var(--paper, #f7f5ee);
		box-shadow: var(--chip-shadow);
		font-family: var(--font-outfit, 'Outfit Variable', sans-serif);
		font-size: 11px;
		font-weight: 400;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		color: var(--color-inkblue);
		cursor: grab;
		touch-action: none;
		transition:
			box-shadow 150ms ease-out,
			transform 150ms cubic-bezier(0.33, 1, 0.68, 1);
	}
	/* THE HOUSE ANSWER TO A POINTER IS A SHADOW, not a colour and not a size — `a.person-box:hover`
	   settled that, and a card that changed ground under the finger would be saying it had become a
	   different card. */
	.ycard:hover,
	.ycard:focus-visible {
		box-shadow: var(--chip-shadow-hover);
		outline: none;
	}
	.ycard:active,
	.ycard.dragging {
		cursor: grabbing;
		/* Picked UP — the one moment the card leaves the line, and the only lift in the control. */
		box-shadow: var(--chip-shadow-hover);
		transform: translate(-50%, calc(-50% - 1.5px));
		z-index: 2;
	}
	/* The way OUT of a narrowed range belongs ON the range. It appears only once there is something to
	   undo, so nothing sits here saying "all years" while all years are already showing. */
	.clear-years {
		display: block;
		margin: 1px auto 0;
		border: 0;
		background: none;
		padding: 0;
		cursor: pointer;
		font: 400 9.5px/1.3 var(--font-inter, sans-serif);
		letter-spacing: 0.04em;
		color: rgba(48, 42, 34, 0.42);
	}
	.clear-years:hover {
		color: rgba(48, 42, 34, 0.8);
	}
</style>
