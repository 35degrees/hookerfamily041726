<script module lang="ts">
	/** The rail's width at u = 1. Reserved in stage.svelte.ts's width clamp — keep the two in step. */
	export const RAIL_W = 96;
</script>

<script lang="ts">
	/**
	 * THE LEFT TIMELINE — design §3.6, roadmap Phase 3b. Minimum viable slice.
	 *
	 * The table's y-axis rendered as an instrument: 1586 (Thomas Hooker's birth) to the CURRENT YEAR,
	 * pinned to the left edge of the viewport at every tier.
	 *
	 * ── THIS IS NOT THE FIELD'S AXIS, AND THAT IS THE TRAP TO AVOID ─────────────────────────────────
	 *
	 * Field.svelte also draws time, and it is a DIFFERENT MAPPING of the same quantity:
	 *
	 *     Field   10.5 px/year, RELATIVE to the featured person — the paper scrolls under the card and
	 *             the focus's own year docks at a fixed screen position (scroll-and-stay).
	 *     Rail    ~1.9 px/year, ABSOLUTE — 440 years compressed into the viewport's height, and a given
	 *             year is at the same pixel no matter who is featured.
	 *
	 * §3.6's phrase "the table's y-axis rendered as an instrument" reads as though they are one thing.
	 * They are not, and nothing here should ever be derived from Field's PX_PER_YEAR or vice versa.
	 * Field answers "how far did we just travel"; the rail answers "where in 440 years are we".
	 *
	 * ── FIXED CHROME, OUTSIDE THE STAGE ─────────────────────────────────────────────────────────────
	 *
	 * Mounted beside Field and ShuffleNotables rather than inside `.page-container`, for two reasons.
	 * It must not scale with `--stage-u` — a ruler at the window's edge is the one thing that should
	 * keep its size when the stage shrinks. And a fixed element inside a transformed ancestor re-bases
	 * to that ancestor (design §33.1); the stage is not transformed today, but the rail outliving that
	 * decision costs nothing and the project has already paid for this lesson twice.
	 *
	 * ── THE CLOCK ───────────────────────────────────────────────────────────────────────────────────
	 *
	 * The bars move on the FLIGHT's clock, read from the camera store the same way Field reads it. A
	 * rail that animated on its own duration would drift against the card mid-navigation, and §30 names
	 * two-clock desync as THE failure mode of this layer. One clock, many subscribers.
	 */
	import { featured } from '$lib/state/featured.svelte';
	import { getCameraMove, subscribeCameraMove } from '$lib/state/camera';
	import { stage } from '$lib/state/stage.svelte';
	import type { PersonCompact } from '$lib/types/neighborhood';
	import { prefersReducedMotion } from 'svelte/motion';
	import { onMount } from 'svelte';

	// ── THE SCALE ───────────────────────────────────────────────────────────────────────────────────
	// 1586 is Thomas Hooker's birth and the line's own zero. The data does reach back further — his
	// father Thomas Hooker Sr. is 1553 — so a handful of pre-progenitor figures clamp to the top rather
	// than falling off it. Sam said 1588; 1586 is what the record and §3.6 both say, and it is the year
	// the whole project counts generations from.
	const START_YEAR = 1586;
	// DERIVED FROM THE CLOCK, not a literal, so the rail does not silently stop at 2026. Read once on
	// mount: a page that is open across midnight on Dec 31 is not a case worth a timer for.
	let endYear = $state(2026);
	onMount(() => {
		endYear = new Date().getFullYear();
	});


	// Breathing room top and bottom so the first and last years are not flush against the window edge.
	const PAD_Y = 44;
	const railH = $derived(Math.max(240, stage.vh - PAD_Y * 2));
	const span = $derived(Math.max(1, endYear - START_YEAR));
	/** year → px from the top of the viewport. The whole instrument is this one function. */
	const yFor = (year: number) => PAD_Y + ((year - START_YEAR) / span) * railH;

	// ── LANES ───────────────────────────────────────────────────────────────────────────────────────
	// Left to right: the Hooker line, then whoever married into it, then an orbit figure. A lane is a
	// horizontal offset, and they OVERLAP by a few px so the set reads as one stacked object rather
	// than three separate columns (Sam: "attached to the right side of the hooker bar or maybe a few
	// pixels of overlay").
	const LABEL_W = 26; // the year gutter, left of the bars
	const BAR_W = 26;
	const LANE_STEP = BAR_W - 7; // 7px of overlap
	const laneX = (lane: number) => LABEL_W + 4 + lane * LANE_STEP;

	type Bar = {
		key: string;
		lane: number;
		top: number;
		height: number;
		name: string;
		gen: string | null;
		years: string;
		colour: string;
		estimated: boolean;
	};

	const LANE_COLOUR = [
		'var(--hd-edge, hsl(43, 68%, 48%))', // the bloodline — the gold the app already uses for descent
		'var(--spouse-edge, hsl(172, 42%, 44%))', // married in
		'hsl(205, 52%, 52%)' // orbit / easter egg
	];
	const PLAIN_COLOUR = 'hsl(0, 0%, 55%)';

	/**
	 * Turn a compact into a bar. Returns null when there is nothing honest to draw.
	 *
	 * `pv` IS A HARD STOP, and it is the one rule here that is not about layout. It marks a LIVING,
	 * NON-NOTABLE person whose dates ride in the payload for sorting and are "never rendered" (see
	 * PersonCompact). A lifespan bar renders a birth year GEOMETRICALLY — its top edge is the year,
	 * readable straight off the scale beside it — so drawing one would leak exactly what the flag
	 * exists to protect. Same for the `t.y === null` no-basis set: no year, no bar.
	 */
	function barFor(p: PersonCompact | null | undefined, lane: number, withGen: boolean): Bar | null {
		if (!p || p.pv) return null;
		const by = p.by;
		if (by == null) return null;
		// A living person's bar runs to the present rather than stopping at an imaginary death.
		const dy = p.dy ?? endYear;
		const top = yFor(Math.max(START_YEAR, by));
		const bottom = yFor(Math.min(endYear, Math.max(by, dy)));
		return {
			key: p.id,
			lane,
			top,
			// A floor, so an infant's bar is still a visible object rather than a hairline.
			height: Math.max(6, bottom - top),
			name: p.fn ?? p.sn ?? p.n ?? '',
			gen: withGen && p.g != null ? `Gen ${p.g}` : null,
			years: `${by}–${p.dy ?? ''}`,
			colour: lane < 0 ? PLAIN_COLOUR : LANE_COLOUR[lane] ?? PLAIN_COLOUR,
			estimated: p.t?.e === true
		};
	}

	const focus = $derived(featured.current?.neighborhood?.focus ?? null);

	/**
	 * WHICH BARS ARE ON THE RAIL — derived, never stored, from flags that already ride every compact.
	 * Same doctrine as the card's generation labels: the graph is the source, not a saved field.
	 *
	 * Sam's rule, in his words: "when the Hooker line person is the featured card, we don't show
	 * spouses or in law easter eggs on timeline, just the one Hooker vertical bar." So a bloodline card
	 * is deliberately the SIMPLEST reading on the rail — walking Thomas Hooker to the present is one
	 * gold bar sliding down, and nothing else moves.
	 *
	 * Off the line, the Hooker bar stays as CONTEXT and the featured person takes the lane their class
	 * earns. Someone who is both a spouse and an easter egg lands in the SPOUSE lane, following the
	 * precedence layout.css already sets for card shading ("someone who is both is primarily an
	 * in-law"); the alternative would give the same person two different positions in two places.
	 */
	const bars = $derived.by((): Bar[] => {
		const f = focus;
		if (!f) return [];

		// ON THE LINE — one bar, with its generation.
		if (f.hd) return [barFor(f, 0, true)].filter((b): b is Bar => !!b);

		// OFF THE LINE — find the bloodline person this card is attached to, for context.
		const spouses = featured.current?.neighborhood?.spouses ?? [];
		const hookerSpouse = spouses.map((s) => s.spouse).find((s) => s && s.hd) ?? null;
		const lane = f.sp ? 1 : f.ee ? 2 : -1;

		// Neither married in nor in orbit: a lone bar, first name only, no generation — Sam: "if an
		// entry is none of those categories, we can just show the FeaturedCard timeline in a great
		// vertical bar without any others."
		if (lane < 0) return [barFor(f, -1, false)].filter((b): b is Bar => !!b);

		return [barFor(hookerSpouse, 0, true), barFor(f, lane, false)].filter(
			(b): b is Bar => !!b
		);
	});

	// ── THE FLIGHT'S CLOCK ──────────────────────────────────────────────────────────────────────────
	// Every bar transitions on the duration the CARD is using, so the rail and the stage arrive
	// together. Reduced motion snaps.
	let moveMs = $state(0);
	onMount(() => subscribeCameraMove(() => {
		moveMs = prefersReducedMotion.current ? 0 : (getCameraMove()?.duration ?? 420);
	}));

	// ── ERA MARKS ───────────────────────────────────────────────────────────────────────────────────
	// A STARTER SET, meant to be edited. Sam wants "sticks and lines emerging or maybe even blocks
	// emerging to show the years of the Civil War, American Rev, and dates like Constitution signing".
	// Spans render as a band, moments as a hairline. Deliberately few: the rail's job is the lifespan
	// bar, and every mark competes with it for the same 440 years.
	const ERAS: { from: number; to?: number; label: string }[] = [
		{ from: 1636, label: 'Hartford founded' },
		{ from: 1775, to: 1783, label: 'Revolution' },
		{ from: 1787, label: 'Constitution' },
		{ from: 1861, to: 1865, label: 'Civil War' },
		{ from: 1914, to: 1918, label: 'WWI' },
		{ from: 1939, to: 1945, label: 'WWII' }
	];

	/** Century rules, plus a half-century tick — enough to read a position, few enough to stay quiet. */
	const ticks = $derived.by(() => {
		const out: { year: number; major: boolean }[] = [];
		const first = Math.ceil(START_YEAR / 50) * 50;
		for (let y = first; y <= endYear; y += 50) out.push({ year: y, major: y % 100 === 0 });
		return out;
	});
</script>

<div class="rail" style="--rail-w: {RAIL_W}px; --move-ms: {moveMs}ms" aria-hidden="true">
	<!-- The scale itself: a hairline spine with century rules across it. -->
	<div class="spine" style="top: {PAD_Y}px; height: {railH}px;"></div>

	{#each ticks as t (t.year)}
		<div class="tick" class:major={t.major} style="top: {yFor(t.year)}px;">
			<span class="tick-year">{t.year}</span>
		</div>
	{/each}

	<!-- Era bands sit BEHIND the lifespan bars, in the lane gutter — reference, never the subject. -->
	{#each ERAS as e (e.label)}
		{@const top = yFor(e.from)}
		{@const h = e.to ? Math.max(2, yFor(e.to) - top) : 0}
		<div
			class="era"
			class:moment={!e.to}
			style="top: {top}px; height: {h || 1}px; left: {LABEL_W + 2}px;"
			title={e.label}
		></div>
	{/each}

	<!-- KEYED ON THE LANE, NOT THE PERSON. This is what makes the rectangle MOVE instead of blink: a
	     keyed each destroys and recreates an element whose key changed, and a brand-new element has no
	     previous top/height to transition FROM, so keying on the person's id meant every navigation
	     replaced the bar at its destination and the CSS transition never ran once. The lane is the
	     durable identity here — "the bloodline bar" persists and the person flows through it — which is
	     the same reasoning the flight's keyed lists already use for chips. -->
	{#each bars as b (b.lane)}
		<div
			class="bar"
			class:estimated={b.estimated}
			style="top: {b.top}px; height: {b.height}px; left: {laneX(b.lane)}px; width: {BAR_W}px;
			       background: {b.colour}; z-index: {2 + b.lane};"
		>
			<span class="bar-label">
				<span class="bar-name">{b.name}</span>
				{#if b.gen}<span class="bar-gen">{b.gen}</span>{/if}
			</span>
		</div>
	{/each}
</div>

<style>
	.rail {
		position: fixed;
		left: 0;
		top: 0;
		bottom: 0;
		width: var(--rail-w);
		/* ABOVE THE FIELD, BEHIND THE STAGE. The cards and rows own the foreground unconditionally; where
		   the stage reaches the rail, the stage wins and the rail simply passes underneath. */
		z-index: 0;
		pointer-events: none;
		font-family: var(--font-inter, sans-serif);
		/* A whisper of ground so the rail reads as an instrument laid ON the parchment, not a hole in
		   it. Kept far below the card's own paper so it never competes. */
		background: linear-gradient(
			to right,
			rgba(28, 24, 18, 0.055),
			rgba(28, 24, 18, 0.03) 70%,
			transparent
		);
	}

	.spine {
		position: absolute;
		left: 26px;
		width: 1px;
		background: rgba(60, 50, 36, 0.28);
	}

	.tick {
		position: absolute;
		left: 0;
		width: var(--rail-w);
		height: 0;
		border-top: 1px solid rgba(60, 50, 36, 0.16);
	}
	.tick.major {
		border-top-color: rgba(60, 50, 36, 0.3);
	}
	.tick-year {
		position: absolute;
		/* Right-aligned into the gutter with 3px of air off the window edge — the first render had them
		   flush at x=0 and the leading digit read as clipped. */
		left: 3px;
		width: 20px;
		text-align: right;
		top: -6px;
		font-size: 9px;
		font-variant-numeric: tabular-nums;
		color: rgba(60, 50, 36, 0.5);
	}
	.tick.major .tick-year {
		color: rgba(60, 50, 36, 0.72);
		font-weight: 500;
	}

	.era {
		position: absolute;
		width: 3px;
		border-radius: 2px;
		background: rgba(120, 62, 44, 0.4);
		z-index: 1;
	}
	.era.moment {
		width: 7px;
		height: 1px;
		background: rgba(120, 62, 44, 0.55);
	}

	/* THE LIFESPAN BAR. `top` and `height` are what animate — the bar slides down the scale and grows
	   or shrinks into the new life, which is the whole gesture Sam described. They move on the CARD's
	   clock (--move-ms), so the rail lands when the card lands. */
	.bar {
		position: absolute;
		border-radius: 4px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(40, 30, 20, 0.28);
		transition:
			top var(--move-ms) cubic-bezier(0.33, 1, 0.68, 1),
			height var(--move-ms) cubic-bezier(0.33, 1, 0.68, 1);
	}
	/* An ESTIMATED year stays honest — §3.6 asks for dimmed/hatched, and a hatch reads as "about"
	   where a flat tint would just read as a different person. */
	.bar.estimated {
		background-image: repeating-linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.34) 0 3px,
			transparent 3px 7px
		);
	}

	/* VERTICAL TYPE, because the bar is tall and narrow and the name has to live inside it. Two
	   vertical lines sit side by side across the bar's 26px, which is the closest honest reading of
	   "their first name and then Gen 9 below it" in a column this shape. */
	.bar-label {
		position: absolute;
		inset: 0;
		display: flex;
		justify-content: center;
		gap: 1px;
		writing-mode: vertical-rl;
		padding: 5px 0;
		overflow: hidden;
		color: rgba(255, 252, 245, 0.96);
		text-shadow: 0 1px 1.5px rgba(40, 30, 20, 0.45);
	}
	.bar-name {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.02em;
		white-space: nowrap;
	}
	.bar-gen {
		font-size: 8.5px;
		font-weight: 500;
		opacity: 0.85;
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.bar {
			transition: none;
		}
	}
</style>
