<script module lang="ts">
	/** The rail's width at u = 1. Reserved in stage.svelte.ts's width clamp — keep the two in step. */
	export const RAIL_W = 112;
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
	// OVERLAP DEEPENS WITH EACH STEP AWAY FROM THE LINE. Sam, on the Vanderbilts: William Henry
	// "overlaps Cornelius a few more pixels than Cornelius overlaps Alice". So the set reads as a
	// stack receding from the bloodline rather than as four parallel columns — the further a person
	// is from the line, the further behind they sit.
	const OVERLAP = [0, 7, 10, 13, 15];
	function laneX(lane: number): number {
		let x = LABEL_W + 4;
		for (let i = 1; i <= lane; i++) x += BAR_W - (OVERLAP[i] ?? OVERLAP[OVERLAP.length - 1]);
		return x;
	}

	/**
	 * COLOUR IS THE PERSON'S CLASS; LANE IS THEIR POSITION. Keeping the two apart is what lets a chain
	 * of any shape render: Thomas Hooker I sits at lane 1 in BLUE (he is an egg, and there is no
	 * married-in person between him and his son), while Cornelius Vanderbilt II sits at lane 1 in MINT.
	 * Tying colour to lane index — which the first version did — would have painted one of them wrong.
	 */
	function styleFor(p: PersonCompact): LaneStyle {
		if (p.hd) return LANE_STYLE[0];
		if (p.sp) return LANE_STYLE[1];
		if (p.ee) return LANE_STYLE[2];
		return PLAIN_STYLE;
	}

	type Bar = {
		key: string;
		lane: number;
		top: number;
		height: number;
		name: string;
		years: string;
		style: LaneStyle;
		/** CSS mask that dissolves whichever end of the bar is a guess. '' = both ends known. */
		mask: string;
	};

	// ── HOW LONG A LIFE WAS, WHEN WE DO NOT KNOW ────────────────────────────────────────────────────
	// Needed the moment a bar has only one date: with a birth and no death the bar has to end SOMEWHERE,
	// and the honest answer is "about a lifetime later, and we are not sure".
	//
	// MEASURED FROM THIS TREE rather than looked up or invented — 14,323 people carry both dates, which
	// is a large enough sample to answer the question the rail is actually asking. Mean years lived, by
	// birth century and sex:
	//
	//              male            female
	//     1600s    58.8 (n=148)    61.0 (n=109)
	//     1700s    61.4 (n=1494)   61.2 (n=1419)
	//     1800s    59.5 (n=4101)   62.0 (n=4028)
	//     1900s    69.2 (n=1228)   75.1 (n=1188)
	//
	// Sam's suggested 60 turns out to be within a year of the tree's own answer for every century before
	// 1850, which is where most of these bars will be.
	//
	// THE ONE PLACE THE DATA MUST NOT BE TRUSTED is the recent end. A cohort that has not finished dying
	// can only report the lifespans of those who died EARLY — the tree says 49.2 for 1950s births, which
	// is survivorship bias and not a fact about anyone. So from 1950 the figures are stated modern ones
	// rather than derived, and the comment is here so nobody "corrects" them back to the tree's number.
	const LIFESPAN = { m: 59, f: 61 };
	function estimatedLifespan(year: number, sex: string | null | undefined): number {
		const f = (sex ?? '').toLowerCase().startsWith('f');
		if (year >= 1950) return f ? 81 : 76; // stated, not derived — see above
		if (year >= 1900) return f ? 75 : 69;
		if (year >= 1800) return f ? 62 : 60;
		if (year >= 1700) return 61;
		return f ? LIFESPAN.f : LIFESPAN.m;
	}

	// A PRE-SCALE BAR MUST BE GONE BEFORE THE WINDOW EDGE, not cut off by it. The first attempt let the
	// bar run past the top and dissolve on the way — but the dissolve was still ~30% opaque when it met
	// the browser chrome, so it ended in a flat horizontal cut against the toolbar. Sam: "i don't like
	// how they go off screen like this it looks terrible... just fade it out before it gets to the top
	// of the browser, that does the trick better."
	//
	// So the fade is stated in VIEWPORT coordinates and completes inside the window: nothing at all is
	// painted above PRE_GONE_Y, and the bar reaches full strength by PRE_SOLID_Y — comfortably before
	// the 1586 tick at PAD_Y, so a pre-scale bar still visibly begins above the scale's first year.
	const PRE_GONE_Y = 14;
	const PRE_SOLID_Y = 58;

	// Where a guessed end starts dissolving, as a fraction of the bar. Sam: "say it's 60 years, around
	// 45 years start fading out the end" — 45/60, i.e. three quarters solid and the last quarter gone.
	const SOLID_FRACTION = 0.75;
	const FADE = `${Math.round(SOLID_FRACTION * 100)}%`;
	const FADE_IN = `${Math.round((1 - SOLID_FRACTION) * 100)}%`;

	// ── LANE COLOUR — ONE TREATMENT, THREE HUES ─────────────────────────────────────────────────────
	// Every bar is PAPER WITH A DRAWN EDGE: a very pale fill, a thin saturated outline, and dark ink of
	// the same hue. Sam set the bloodline by hand (#fefbe2 fill, #e4cb00 outline) and asked for the
	// other two to follow "a lighter shade of the mint green spouse FeaturedCard background and a
	// darker shade for the outline", and the same for the easter egg in blue.
	//
	// So the three lanes differ ONLY in hue, and each one's three values are the same three steps down
	// a single ramp — pale fill / mid outline / dark ink. That is what lets the rail read as one
	// instrument with three channels rather than three unrelated markers, and it means a fourth lane
	// (an orbit figure, a Talcott) would be one more hue rather than a new design.
	//
	// The hues are the app's existing ones rather than new inventions: gold is the descent line's, mint
	// is --spouse-edge's 172°, blue is the easter-egg card's family. INK is always the darkest step, so
	// contrast against its own fill is high on every lane — the mistake the first pass made was keeping
	// one white ink for all three, which went invisible the moment a fill turned pale.
	type LaneStyle = { bg: string; border: string; ink: string };
	const LANE_STYLE: LaneStyle[] = [
		// BLOODLINE — gold. Sam's values.
		{ bg: '#fefbe2', border: '#e4cb00', ink: '#827400' },
		// MARRIED IN — mint, at the same three steps. Lighter than --spouse-edge so it reads as paper.
		{ bg: '#e2f8f4', border: '#2c8b7f', ink: '#1b5f56' },
		// ORBIT / EASTER EGG — blue, ditto.
		{ bg: '#e2f0f9', border: '#2b76ab', ink: '#1a4c70' }
	];
	// No line status at all — a true neutral, so it reads as unclassified rather than as a faded lane.
	const PLAIN_STYLE: LaneStyle = { bg: '#f2f2f0', border: '#9a9a94', ink: '#55554e' };

	/**
	 * Turn a compact into a bar. Returns null when there is nothing honest to draw.
	 *
	 * `pv` IS A HARD STOP, and it is the one rule here that is not about layout. It marks a LIVING,
	 * NON-NOTABLE person whose dates ride in the payload for sorting and are "never rendered" (see
	 * PersonCompact). A lifespan bar renders a birth year GEOMETRICALLY — its top edge is the year,
	 * readable straight off the scale beside it — so drawing one would leak exactly what the flag
	 * exists to protect. Same for the `t.y === null` no-basis set: no year, no bar.
	 */
	function barFor(
		p: PersonCompact | null | undefined,
		lane: number,
		fallbackYear: number | null = null
	): Bar | null {
		if (!p) return null;

		// ── WHICH ENDS ARE KNOWN ────────────────────────────────────────────────────────────────────
		// `pv` is treated as NO DATES AT ALL rather than as a suppression. The flag means a living,
		// non-notable person whose dates "are never rendered", and a bar drawn from their own birth year
		// renders it geometrically whatever it looks like — so their bar is positioned from a RELATIVE's
		// year instead and dissolves at both ends. That satisfies Sam's "fully fuzzy" reading and the
		// privacy rule at once: the rail says a life was lived hereabouts, and nothing sharper.
		const known = p.pv ? { by: null, dy: null } : { by: p.by ?? null, dy: p.dy ?? null };

		let from: number;
		let to: number;
		let fadeTop = false;
		let fadeBottom = false;

		if (known.by != null && known.dy != null) {
			// Both ends real. Hard borders, no dissolve — the only fully honest bar on the rail.
			from = known.by;
			to = known.dy;
		} else if (known.by != null) {
			// A birth and no death: the top is a fact, the bottom is an estimate. Hard top, soft bottom.
			from = known.by;
			to = known.by + estimatedLifespan(known.by, p.sx);
			fadeBottom = true;
		} else if (known.dy != null) {
			// A death and no birth: Sam's mirror case — "start with the hard bottom border death year
			// and fade it out near the top".
			to = known.dy;
			from = known.dy - estimatedLifespan(known.dy, p.sx);
			fadeTop = true;
		} else {
			// NOTHING OF THEIR OWN. Sam: "if someone has no date, but their spouse was born in 1765, just
			// use that as a baseline birth year but make average lifespan and make top and bottom faded
			// and fuzzy with no top or bottom border visible." Without any anchor at all there is no
			// honest place to put them, so they get no bar rather than an invented one.
			if (fallbackYear == null) return null;
			from = fallbackYear;
			to = fallbackYear + estimatedLifespan(fallbackYear, p.sx);
			fadeTop = true;
			fadeBottom = true;
		}

		// BORN BEFORE THE SCALE BEGINS. Seven people are: Richard Garbrand 1550, Thomas Hooker I 1553,
		// Anne Ferrar 1557, Susannah Hooker 1564, and three more back to 1585. They used to be CLAMPED to
		// START_YEAR, which drew a hard top edge at 1586 — so the rail said Richard Garbrand and Rev.
		// Thomas Hooker were born the same year, which as Sam put it is ridiculous.
		//
		// The scale's range is deliberately unchanged (Sam: "the timeline range is fine"). Instead the bar
		// keeps its TRUE position and simply runs off the top of the instrument, dissolving as it goes:
		// "we need to extend them high and if not to their exact birth year, we need to fade out the top
		// part of their vertical bar and have no top border." An edge that dissolves cannot assert a year,
		// which is exactly the claim that was wrong before.
		const beforeScale = from < START_YEAR;
		const top = yFor(from); // UNCLAMPED — negative for the pre-scale seven, and that is the point
		const bottom = yFor(Math.min(endYear, Math.max(from + 1, to)));

		// ── THE MASK — composed from the two ends independently ─────────────────────────────────────
		// It dissolves whichever end is a guess, and carries the border with it, so no separate "hide
		// that side's border" rule is needed: a masked edge cannot draw a hard line.
		//
		// Composed rather than enumerated because the ends are now genuinely independent — a pre-scale
		// birth AND an unknown death is a real combination (Thomas Hooker I would be, had his death not
		// been recorded), and the four-way switch this replaces could not express it.
		//
		// THE PRE-SCALE FADE IS IN PIXELS AND IN VIEWPORT TERMS, which is the whole trick. A percentage
		// is a fraction of the bar, and these bars begin above the window — so a percentage spends its
		// fade off-screen and still meets the browser chrome part-opaque, which is the flat cut Sam
		// rejected. Converting two fixed VIEWPORT heights into this bar's own coordinates instead means
		// every pre-scale bar is invisible above the same line and solid below the same line, whatever
		// its birth year and however far off-screen its true top sits.
		const goneAt = Math.round(PRE_GONE_Y - top);
		const solidAt = Math.round(PRE_SOLID_Y - top);
		const head = beforeScale
			? `transparent 0, transparent ${goneAt}px, #000 ${solidAt}px`
			: fadeTop
				? `transparent 0, #000 ${FADE_IN}`
				: '#000 0';
		const tail = fadeBottom ? `#000 ${FADE}, transparent 100%` : '#000 100%';
		const mask = beforeScale || fadeTop || fadeBottom
			? `linear-gradient(to bottom, ${head}, ${tail})`
			: '';

		return {
			key: p.id,
			lane,
			top,
			// A floor, so an infant's bar is still a visible object rather than a hairline.
			height: Math.max(6, bottom - top),
			// THE GENERATION IS GONE (Sam, Aug 9: "remove the Gen 4 totally"). It was competing with the
			// name for a 26px column and the name is the thing being read; the card already states the
			// generation in full, and states it better.
			name: p.fn ?? p.sn ?? p.n ?? '',
			years: known.by != null || known.dy != null ? `${known.by ?? ''}–${known.dy ?? ''}` : '',
			style: styleFor(p),
			mask
		};
	}

	/**
	 * A year to hang a dateless person on, taken from the people around them — Sam's "their spouse was
	 * born in 1765" case. Spouse first (a couple is close in age), then a parent plus a generation.
	 * Returns null when the neighbourhood offers nothing, and the caller then draws no bar at all.
	 */
	const GENERATION_YEARS = 28;
	function fallbackBirthYear(): number | null {
		const nb = featured.current?.neighborhood;
		if (!nb) return null;
		for (const s of nb.spouses ?? []) {
			const sp = s.spouse;
			if (sp && !sp.pv && sp.by != null) return sp.by;
		}
		const par = [nb.parents?.father, nb.parents?.mother];
		for (const q of par) if (q && !q.pv && q.by != null) return q.by + GENERATION_YEARS;
		return null;
	}

	const focus = $derived(featured.current?.neighborhood?.focus ?? null);

	/**
	 * WHICH BARS ARE ON THE RAIL — derived, never stored. Three cases, and they read outward from the
	 * bloodline: the line itself, then whoever married into it, then their family beyond.
	 *
	 *   ON THE LINE     One bar. Sam: "when the Hooker line person is the featured card, we don't show
	 *                   spouses or in law easter eggs on timeline, just the one Hooker vertical bar."
	 *                   Walking Thomas Hooker to the present is a single gold bar sliding down and
	 *                   nothing else moving, which is deliberately the simplest reading on the rail.
	 *
	 *   MARRIED IN      Two. The bloodline spouse stays as context, from this payload's own spouses.
	 *
	 *   AN EASTER EGG   The baked chain plus the focus — three or four. Richard Garbrand appears with
	 *                   Susanna (his daughter, who married in) and Rev. Thomas Hooker (the man she
	 *                   married); the Commodore adds a fourth behind his son. This is the one case a
	 *                   payload cannot answer alone, which is why `lineAnchors` is baked — see
	 *                   regenerate-data.js lineAnchorsFor for the walk and for why it is not fetched.
	 *
	 * A MARRIED PAIR SHARES A POSITION and the featured one takes it: click Anne Ferrar and she stands
	 * where Richard stood, still three bars. That falls out of the bake (the walk drops a leading
	 * spouse) rather than being re-derived here.
	 *
	 * LANE IS POSITION IN THIS ARRAY; colour comes from each person's own class — see styleFor.
	 */
	const bars = $derived.by((): Bar[] => {
		const f = focus;
		if (!f) return [];

		// ON THE LINE — one bar.
		if (f.hd) return [barFor(f, 0, fallbackBirthYear())].filter((b): b is Bar => !!b);

		// AN EASTER EGG WITH A ROUTE HOME — the baked chain, line first, then the focus at the end.
		// FOUR BARS IS THE CEILING, capped HERE and not in the bake — the baked chain stays complete and
		// true, and how much of it is worth drawing is a display decision that belongs with the display.
		// Sam's deepest case is the Commodore at four ("I think we should try to add him as a 4th"), and
		// he had already flagged the direction: "there will be catches like grandparents-in-law and
		// ideally I'd like to add them too but that gets confusing."
		//
		// 13 people of 18,621 have a longer route. For those, the two ends carry the meaning — the
		// Hooker person, the one who married in, and the focus's own nearest relative — so the middle is
		// what gives way. The elision is invisible on the rail (lanes are positions, not generations),
		// which is the cost; the card itself is where a full lineage belongs.
		const full = featured.current?.lineAnchors ?? [];
		const chain = full.length > 3 ? [full[0], full[1], full[full.length - 1]] : full;
		if (chain.length) {
			const out = chain.map((q, i) => barFor(q, i));
			out.push(barFor(f, chain.length, fallbackBirthYear()));
			return out.filter((b): b is Bar => !!b);
		}

		// MARRIED IN — the bloodline spouse is right here in the payload.
		const spouses = featured.current?.neighborhood?.spouses ?? [];
		const hookerSpouse = spouses.map((s) => s.spouse).find((s) => s && s.hd) ?? null;
		if (f.sp && hookerSpouse) {
			return [barFor(hookerSpouse, 0), barFor(f, 1, fallbackBirthYear())].filter(
				(b): b is Bar => !!b
			);
		}

		// NO ROUTE TO THE LINE AT ALL — 27% of eggs. Sam, on Harriet Beecher Stowe: "we should just
		// have her separately but she does have a husband I hope could be paired next to each other."
		// So an unanchored person stands with their spouse and nobody else. (Stowe herself turns out
		// to HAVE a route — through her sister Isabella, who married John Hooker — so she takes the
		// chain branch above; this is for the ones who genuinely have none.)
		const ownSpouse = spouses.map((s) => s.spouse).find((q) => q && !q.pv) ?? null;
		const solo = [barFor(f, 0, fallbackBirthYear())];
		if (ownSpouse) solo.push(barFor(ownSpouse, 1));
		return solo.filter((b): b is Bar => !!b);
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
			style="top: {b.top}px; height: {b.height}px; left: {laneX(b.lane)}px; width: {BAR_W}px;
			       --bar-bg: {b.style.bg}; --bar-bd: {b.style.border}; color: {b.style.ink};
			       --bar-mask: {b.mask || 'none'}; z-index: {2 + b.lane};"
		>
			<span class="bar-label">{b.name}</span>
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
		transition:
			top var(--move-ms) cubic-bezier(0.33, 1, 0.68, 1),
			height var(--move-ms) cubic-bezier(0.33, 1, 0.68, 1);
	}
	/* THE FILL AND THE EDGE LIVE ON A PSEUDO-ELEMENT so the MASK can dissolve them without touching the
	   name. Sam: "the middle of the vertical bar can be more solid in order for the name to show up
	   clearly" — masking the whole element would fade the type along with the paper, and an uncertain
	   date is a reason to soften the BAR, never a reason to make the person harder to read.
	   The mask carries the border with it, so a guessed end needs no separate "hide that side's border"
	   rule: a dissolving edge cannot draw a hard line. */
	.bar::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 4px;
		background: var(--bar-bg);
		border: 1px solid var(--bar-bd);
		box-shadow: 0 1px 3px rgba(40, 30, 20, 0.28);
		-webkit-mask-image: var(--bar-mask, none);
		mask-image: var(--bar-mask, none);
	}
	/* An ESTIMATED year stays honest — §3.6 asks for dimmed/hatched, and a hatch reads as "about"
	   where a flat tint would just read as a different person.
	   TWO HATCHES, because one cannot serve both treatments: white stripes are what read on the
	   saturated lanes and they vanish entirely on the pale bloodline bar, which would have quietly cost
	   the honesty mark on the very lane most likely to carry an estimated year. */
	/* ONE HATCH FOR EVERY LANE, drawn in `currentColor` — which is the lane's own ink, set inline on
	   .bar. That is what keeps this correct as hues are added: the first version hard-coded white
	   stripes, which vanished the moment a fill turned pale, and the fix of adding a second dark rule
	   only pushed the problem to the third lane. Colour that follows the ink cannot go missing. */
	/* ── THE HATCH IS GONE, AND MUST NOT COME BACK AS IT WAS (removed Aug 9, Sam's call) ─────────────
	   A diagonal hatch used to mark `t.e` — the table-coordinate flag meaning "no birth year in
	   canonical, so the position was inferred from a parent (+28), child (−28) or spouse (0)".
	   It predates the dissolving ends below and became a second, differently-derived answer to a
	   question the bar already answers, so the two disagreed:

	     - the MASK says WHICH END is a guess, symmetrically — top, bottom or both;
	     - the HATCH could only ever mark an unknown BIRTH, because `t.e` is a birth-year proxy.

	   So julia-cole (death known, birth not) was striped while mary-bryan-1688 (birth known, death
	   not) was not, despite carrying exactly the same amount of doubt. Worse, on the two Albetta
	   brothers — both `pv`, both drawn from a relative's year — the stripes were the ONLY difference
	   between them, and what they encoded was "one of these has a birth year on file": a distinction
	   the viewer cannot interpret and one the privacy flag exists to stop mattering.

	   Design §3.6 asks that estimated years "render the band dimmed/hatched — the apparatus stays
	   honest even here". The dissolving end satisfies that better than the hatch did: it is per-end,
	   it covers death as well as birth, and it derives from the same by/dy as the bar's own geometry,
	   so it cannot contradict itself. If uncertainty ever needs a SECOND channel, derive it from the
	   same source the mask uses — never from `t.e` again. */

	/* VERTICAL TYPE, because the bar is tall and narrow and the name has to live inside it. Two
	   vertical lines sit side by side across the bar's 26px, which is the closest honest reading of
	   "their first name and then Gen 9 below it" in a column this shape. */
	/* READS UPWARD, AND THE NAME SITS ON THE LEFT (Sam, Aug 9: "flip the name to the other side... so
	   it's oriented up on the left side of each vertical bar not down on the right side").
	   `vertical-rl` alone gives the opposite of both: text runs downward and its first line stacks on
	   the RIGHT. A 180° rotation fixes the two together — it reverses the reading direction AND the
	   line order, so the name lands leftmost and reads bottom-to-top. Rotating costs no layout, so the
	   label still fills the bar and still centres. */
	/* 13px, up from 10 — the generation used to share this 26px column and now the name has all of it
	   (Sam: "increase the font size of the name"). Vertical type is bounded by the bar's WIDTH, not its
	   length, so the ceiling here is the 24px of inner bar: 13px at this leading occupies ~16px and
	   still sits clear of both edges.
	   No text-shadow on any lane now. It existed to hold white type off a saturated fill; every lane is
	   pale with dark ink of its own hue, so a shadow only muddies it. */
	.bar-label {
		position: absolute;
		inset: 0;
		z-index: 1; /* above the masked fill — the name never dissolves with the paper */
		display: flex;
		justify-content: center;
		writing-mode: vertical-rl;
		transform: rotate(180deg);
		padding: 5px 0;
		overflow: hidden;
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.01em;
		white-space: nowrap;
		/* colour is per-lane, set inline on .bar and inherited — see LANE_STYLE. */
	}

	@media (prefers-reduced-motion: reduce) {
		.bar {
			transition: none;
		}
	}
</style>
