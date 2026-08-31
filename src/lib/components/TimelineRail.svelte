<script module lang="ts">
	/** The rail's width at u = 1. Reserved in stage.svelte.ts's width clamp — keep the two in step. */
	export const RAIL_W = 170; // 122 + 48 — see LABEL_W: the year moved to the RIGHT of its rule
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
	// THE SAME FUNCTION THE CARD AND THE CHIP ASK. `isPynchonKin` is the RAINBOW set — the direct line to
	// Thomas Ruggles Pynchon Jr. plus Jackson and the mother at each step — and it is derived from the
	// parent graph, not listed. Reusing it is what stops the rail from growing a third, drifting answer to
	// "is this person in the line": FeaturedCard.prism, PersonBox.prism and this bar are now one rule.
	import { isPynchonKin } from '$lib/data/pynchonLine';
	import { ascension } from '$lib/state/ascension.svelte';
	import { getCameraMove, subscribeCameraMove } from '$lib/state/camera';
	import { ccFlyTo } from '$lib/state/shuffle.svelte';
	import { warmPersonLinks } from '$lib/state/navigate';
	import { isFlightLocked, subscribeFlightLock } from '$lib/state/flightLock';
	import { stage } from '$lib/state/stage.svelte';
	import type { PersonCompact } from '$lib/types/neighborhood';
	import { ageAtDeath } from '$lib/utils/dates';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { cubicOut, cubicInOut } from 'svelte/easing';
	import { onMount } from 'svelte';

	// ── THE SCALE ───────────────────────────────────────────────────────────────────────────────────
	// 1586 is Thomas Hooker's birth and the line's own zero. The data does reach back further — his
	// father Thomas Hooker Sr. is 1553 — so a handful of pre-progenitor figures clamp to the top rather
	// than falling off it. Sam said 1588; 1586 is what the record and §3.6 both say, and it is the year
	// the whole project counts generations from.
	// 1583, THREE YEARS AHEAD OF THOMAS. The scale now runs edge to edge (see PAD_Y), and at 1586 the
	// progenitor's bar would begin at pixel 0 — flush against the window, its rounded top sheared off by
	// the browser chrome, which is the exact look Sam rejected for the pre-scale seven. Three years is
	// ~6px of headroom: enough for the corner to show, small enough that the instrument still reads as
	// beginning at the line's own start. Sam named the number: "1583 is at the top edge of the screen".
	const START_YEAR = 1583;
	// DERIVED FROM THE CLOCK, not a literal, so the rail does not silently stop at 2026. Read once on
	// mount: a page that is open across midnight on Dec 31 is not a case worth a timer for.
	let endYear = $state(2026);
	onMount(() => {
		endYear = new Date().getFullYear();
	});


	// NO MARGIN. The scale spans the FULL viewport height — Sam: "there's too much gap at the top and
	// bottom of timeline, so 2026 is truly at the bottom of the screen and 1583 is at the top edge…
	// you've added margins between top and bottom edges of browser that confuse the timeline."
	// They did confuse it: 44px of dead space at each end is ~22 years at this scale, so the instrument
	// silently claimed a range 45 years wider than it drew. Edge to edge, the first and last pixels mean
	// what they say. The headroom the progenitor needs comes from START_YEAR instead, where it is a
	// statement about the SCALE rather than an unexplained inset.
	const PAD_Y = 0;
	const railH = $derived(Math.max(240, stage.vh - PAD_Y * 2));
	const span = $derived(Math.max(1, endYear - START_YEAR));
	/** year → px from the top of the viewport. The whole instrument is this one function. */
	const yFor = (year: number) => PAD_Y + ((year - START_YEAR) / span) * railH;

	// ── LANES ───────────────────────────────────────────────────────────────────────────────────────
	// Left to right: the Hooker line, then whoever married into it, then an orbit figure. A lane is a
	// horizontal offset, and they OVERLAP by a few px so the set reads as one stacked object rather
	// than three separate columns (Sam: "attached to the right side of the hooker bar or maybe a few
	// pixels of overlay").
	// THE YEAR GUTTER, left of the bars — and the number that had to move when Sam put the year on the
	// far side of its rule ("move the year like 1750 to the right of its horizontal bar and move those
	// horizontal bars all the way to the left browser edge").
	//
	// Before, the two things stacked: year at x 2-32, then the rule beginning at 44 and running ACROSS
	// the lanes, which is why 36 was enough. Now they run in series from the same left edge — rule from
	// 5, then the year after it — so the gutter is the whole train, and a year that is also 20% larger.
	// 84 = the rule's right end (43) + an 8px gap + a 33px four-digit Fraunces number, rounded up.
	//
	// THIS COSTS 48px OF RAIL, and RAIL_W, the ground's ramp and this constant are ONE measurement.
	// The stage reserves nothing for the rail (stage.svelte.ts, TIMELINE_RAIL_BASE = 0), so nothing
	// reflows — the instrument simply gets wider and reaches further under the card.
	const LABEL_W = 84;
	/** The RENDERED width of a bar. 26, less 5%, less 5% again (Sam, Aug 10). */
	const BAR_W = 23.47;
	/**
	 * The width the LANE POSITIONS are measured against, and deliberately NOT BAR_W.
	 *
	 * laneX advances by `width − overlap`, so while the two were the same constant, narrowing a bar also
	 * dragged every lane after it to the left — and Sam's instruction was the opposite: "narrow the width
	 * of the timeline vertical bars by 5% BUT KEEP LEFT EDGE POSITION THE SAME." Frozen at the 24.7 the
	 * overlap table below was tuned against, so a bar can be made thinner or thicker without any of them
	 * moving. Change this only to re-space the group; change BAR_W to change how wide the bars look.
	 */
	const LANE_W = 24.7;
	// OVERLAP DEEPENS WITH EACH STEP AWAY FROM THE LINE. Sam, on the Vanderbilts: William Henry
	// "overlaps Cornelius a few more pixels than Cornelius overlaps Alice". So the set reads as a
	// stack receding from the bloodline rather than as four parallel columns — the further a person
	// is from the line, the further behind they sit.
	// Lane 2 (the orbit/egg bar) overlaps by 5 rather than 10 — it was covering the spouse's name once
	// the bars narrowed 5%. Every lane past it inherits the shift, which is what Sam asked for: "move
	// easter egg vertical bar spacing 5px to the right just so the spouse name doesn't get covered up".
	//
	// LANE 3 IS THE EXCEPTION TO THE DEEPENING, at 7 rather than 13. It is the deepest bar a chain ever
	// draws — the easter egg themselves, behind three others — and at 13 it sat far enough over lane 2 to
	// bury that name: "when there are four bars for easter eggs, the 4th easter egg bar covers too much
	// of the name of the third bar, push 4th bar right by 10px". Landed at 3, which Sam then judged a
	// step too far ("it can go back left 4px more to cover a bit more of 3rd vertical bar"), so 7 — a net
	// 6px right of where it began. Nothing follows it (four bars is the ceiling), so this stops here
	// rather than propagating down the table.
	const OVERLAP = [0, 7, 5, 7, 15];
	function laneX(lane: number): number {
		// +3px on Sam's word (Aug 10), applied to the FIRST lane only — every other lane is measured from
		// it by the overlap table below, so the whole group shifts together and the spacing is untouched.
		let x = LABEL_W + 7;
		for (let i = 1; i <= lane; i++) x += LANE_W - (OVERLAP[i] ?? OVERLAP[OVERLAP.length - 1]);
		return x;
	}

	/**
	 * COLOUR IS THE PERSON'S CLASS; LANE IS THEIR POSITION. Keeping the two apart is what lets a chain
	 * of any shape render: Thomas Hooker I sits at lane 1 in BLUE (he is an egg, and there is no
	 * married-in person between him and his son), while Cornelius Vanderbilt II sits at lane 1 in MINT.
	 * Tying colour to lane index — which the first version did — would have painted one of them wrong.
	 */
	function styleFor(p: PersonCompact): LaneStyle {
		const lane = p.hd ? LANE_STYLE[0] : p.sp ? LANE_STYLE[1] : p.ee ? LANE_STYLE[2] : PLAIN_STYLE;
		// THE PYNCHON LINE TAKES THE INK AND NOTHING ELSE, and it is applied ON TOP of the lane rather
		// than instead of it — because it is the one class that CROSSES the other three. Jackson is
		// bloodline, Thomas Jr. married in, William is neither, and all three are in the line; a fourth
		// LANE_STYLE entry would have forced them to be one thing when they are genuinely two.
		//
		// DECIDED HERE AND NOT IN CSS, which is not a preference. `color` is written INLINE on `.bar` from
		// `b.style.ink` (see the markup), and an inline declaration beats any stylesheet rule — so a
		// `.bar.prism { color: … }` would simply lose, silently. The fill and the border can live in CSS
		// because they ride custom properties; the ink cannot.
		//
		// It degrades honestly, too: strip the .bar.prism rule and these bars fall back to their lane's
		// own paper with the line's ink still on the name, rather than to nothing.
		return isPynchonKin(p.id) ? { ...lane, ink: PYNCHON_INK } : lane;
	}

	type Bar = {
		key: string;
		lane: number;
		top: number;
		height: number;
		name: string;
		years: string;
		/** Years lived, as `ageAtDeath` reports it — `approx` earns the card's tilde. Null when no age
		    can be offered at all. */
		age: { years: number; approx: boolean } | null;
		style: LaneStyle;
		/** CSS mask that dissolves whichever end of the bar is a guess. '' = both ends known. */
		mask: string;
		/** Height of the NAME's box in px, when it should be shorter than the bar — see barFor. Null =
		    the full bar, which is every case except a living person outliving the estimate. */
		labelH: number | null;
		/** What a bar needs to BE a navigation link — see barLink. */
		slug: string | null;
		tx: number | null;
		ty: number | null;
		/** Birth year where known, else the year the bar is drawn from. Direction only — see barLink. */
		yr: number;
		/** Died at 15 or under — the bar is a stub and cannot carry a name. See barFor. */
		young: boolean;
		/** In the Pynchon line's RAINBOW set — the bar carries the spectrum. See .bar.prism. */
		prism: boolean;
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
	 * THE PYNCHON LINE'S INK — the name inside a spectrum bar, and the ONE colour this line owns here.
	 *
	 * #7c3aed is the 0% stop of `.descent-line.pynchon-descent`'s gradient in FeaturedCard: the purple the
	 * card's own title — "Great-Grandson of William Pynchon" — is painted in. Sam asked for the bar's name
	 * to match that title, so the rail and the card name the same line in the same colour.
	 *
	 * FLAT, WHERE THE CARD'S TITLE IS A GRADIENT, and that is a size decision rather than an inconsistency.
	 * The title is a 40-character line with room for a sweep across it; this is a first name set at 13px
	 * down a 23px column, where a three-stop gradient would land as one arbitrary slice of itself and
	 * differ per name length. The purple end is the one the eye commits to first, so it is the one taken.
	 */
	const PYNCHON_INK = '#7c3aed';

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
		// READ OFF `lv`, NOT off "has a birth year and no death year" — that test cannot tell a living
		// person from one whose death was never recorded, and it would stretch every unrecorded death in
		// the 20th century down to the present day.
		const alive = !!p.lv;

		let from: number;
		let to: number;
		let fadeTop = false;
		let fadeBottom = false;

		if (known.by != null && known.dy != null) {
			// Both ends real. Hard borders, no dissolve — the only fully honest bar on the rail.
			from = known.by;
			to = known.dy;
		} else if (known.by != null) {
			// A birth and no death. The top is a fact; what the bottom means depends entirely on whether
			// they are still here.
			from = known.by;
			// ALIVE: THE BAR RUNS TO TODAY. It used to stop one estimated lifespan after birth, which is
			// a claim about when they will have died — and for Loudon Wainwright III, born 1946, that
			// estimate lands in the past. Sam: "if they are still alive, we need to have them stretching
			// down to today and fading out near the bottom of the timeline as if they are Anderson
			// Cooper despite being born 20 years earlier."
			//
			// Cooper always looked right by accident, not by design: born 1967, his estimate overshoots
			// the present and the `Math.min(endYear, …)` below clipped it back to today. Anyone born
			// before roughly 1950 fell short of that clamp and got a bar that ended in their own past.
			// The fade stays either way — the bottom of a living person's bar is not a fact, it is
			// "still going", which is the same thing the dissolve has always said.
			to = alive ? endYear : known.by + estimatedLifespan(known.by, p.sx);
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
			// Same rule as above. Every `pv` person is by definition presumed living, so this branch is
			// almost always the living one — their bar reaches the present too, and the both-ends
			// dissolve keeps it from asserting either date.
			to = alive ? endYear : fallbackYear + estimatedLifespan(fallbackYear, p.sx);
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

		// THE NAME STAYS CENTRED ON THE ESTIMATE, not on the new full-length bar. Sam, explicitly as a
		// nice-to-have and not worth an architecture change: "I would like to keep the name inside the
		// vertical bar centered on the 60 year est timeline though if that's possible, an exception for
		// alive people older than the 60 year est average timeline."
		//
		// It costs one number because the name already lives in its own absolutely-positioned box over
		// the fill. Shortening that box from the TOP re-centres the name without touching the bar, the
		// mask, or the fade. Expressed as a height rather than as padding on purpose: the label is
		// `writing-mode: vertical-rl` AND `rotate(180deg)`, so physical padding lands on the opposite
		// visual end from the one you asked for, while a top-anchored box is unambiguous under any
		// rotation.
		//
		// Only for the living, only when the estimate genuinely falls short of today, and only when what
		// is left is still tall enough to hold a name — below that the name would clip, which is worse
		// than an off-centre name.
		let labelH: number | null = null;
		if (alive) {
			const estFrom = known.by ?? fallbackYear;
			if (estFrom != null) {
				const estEnd = estFrom + estimatedLifespan(estFrom, p.sx);
				if (estEnd < endYear) {
					const h = yFor(Math.max(from + 1, estEnd)) - top;
					if (h >= 34 && h < bottom - top - 4) labelH = Math.round(h);
				}
			}
		}

		return {
			key: p.id,
			lane,
			top,
			// A floor, so an infant's bar is still a visible object rather than a hairline.
			height: Math.max(6, bottom - top),
			// THE GENERATION IS GONE (Sam, Aug 9: "remove the Gen 4 totally"). It was competing with the
			// name for a 26px column and the name is the thing being read; the card already states the
			// generation in full, and states it better.
			name: barName(p),
			years: known.by != null || known.dy != null ? `${known.by ?? ''}–${known.dy ?? ''}` : '',
			// THE AGE IS COMPUTED FROM REAL DATES, NOT BY SUBTRACTING YEARS. `dy - by` is a year
			// difference and it is wrong whenever the birthday had not come round: Edith Olivia Gwynne,
			// 30 Nov 1853 to 9 Jan 1899, is 45 and the subtraction says 46 — which is what the card three
			// inches away was correctly showing while this tooltip disagreed with it.
			//
			// `ageAtDeath` is the card's own function and it owns the precision rules: exact when both
			// dates carry month and day, exact when a missing day cannot change the answer (the months
			// differ), approximate when it can, approximate when either side is year-only. An approximate
			// figure keeps the tilde it arrives with rather than being suppressed — the card renders
			// "~Age 65" for the same case, and the two must not disagree again.
			//
			// Reconstructed from the compact's bm/bd/dm/dd rather than passed whole because the rail
			// draws from PersonCompact, which carries years; see compact() in regenerate-data.js.
			// `known` is used, not p.by/p.dy, so a pv person yields null here exactly as they do above.
			age:
				known.by != null && known.dy != null
					? ageAtDeath(
							{ year: known.by, month: p.bm ?? null, day: p.bd ?? null,
								date_precision: p.bx ? 'exact' : null },
							{ year: known.dy, month: p.dm ?? null, day: p.dd ?? null,
								date_precision: p.dx ? 'exact' : null }
						)
					: null,
			style: styleFor(p),
			mask,
			labelH,
			// THE APP-WIDE RULE, not a second one: `death − birth <= 15`, the same arithmetic buildFeatured
			// uses for the child-chip dimming, the "(N died young)" connector count and the roster sort.
			// It is deliberately NOT `ageAtDeath` — that would disagree at the boundary with everything
			// else on the page, and a child dimmed on the card but named on the rail is worse than either
			// answer alone.
			young: known.by != null && known.dy != null && known.dy - known.by <= 15,
			prism: isPynchonKin(p.id),
			slug: p.slug ?? null,
			tx: p.t?.x ?? null,
			ty: p.t?.y ?? null,
			yr: p.by ?? from
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
		// THE YOUNGER PARENT, NOT THE FIRST ONE. This used to take whichever parent came first in the
		// record, and Sam found what that costs on Stan Stokowski: Leopold was FORTY YEARS older than
		// Gloria, so the father-first rule put a man born in 1950 at 1910.
		//
		// The younger parent is the better estimator for a reason rather than by luck — a mother's
		// childbearing window is bounded at roughly forty years, where a father's is not, so the later
		// birth is always the tighter bound on the child's. Measured over the 146 `pv` people who are
		// placed this way: mean error falls 8.2 → 5.9 years, the worst case 42 → 30, and the number
		// landing more than fifteen years out drops from 22 to 9. Stan himself goes from 40 years wrong
		// to 2, and his brother Christopher lands exactly.
		const par = [nb.parents?.father, nb.parents?.mother].filter(
			(q) => q && !q.pv && q.by != null
		);
		if (par.length) return Math.max(...par.map((q) => q!.by as number)) + GENERATION_YEARS;
		return null;
	}

	/**
	 * THE NAME IN THE BAR — the chip first name where one exists, plus a generational suffix.
	 *
	 * Sam: "if the entry has a chip.firstname, use that instead of official first name, and if they have
	 * a suffix add that too… Cornelius Vanderbilt II would read Cornelius II."
	 *
	 * THE SUFFIX IS DERIVED, because no compact carries one — `name.suffix` is null even on the people
	 * who plainly have one, so the only place "II" exists is inside the display name. It falls out of
	 * `n` minus `sn`: "Cornelius Vanderbilt II" minus "Cornelius Vanderbilt" is "II".
	 *
	 * THE ALLOW-LIST IS NOT OPTIONAL. That subtraction returns something for 2,607 people, and most of it
	 * is MARRIED SURNAMES rather than suffixes — "Hannah Judd Hooker" minus "Hannah Judd" is "Hooker",
	 * which would put a surname where a generation belongs. Matching only Jr/Sr and roman numerals cuts
	 * it to the 328 who really have one, and every one of those reads correctly.
	 */
	const SUFFIX_RE = /^(Jr\.?|Sr\.?|[IVX]{1,5})$/i;
	function barName(p: PersonCompact): string {
		const first = p.cf ?? p.fn ?? p.sn ?? p.n ?? '';
		const n = p.n ?? '';
		const sn = p.sn ?? '';
		if (sn && n.startsWith(sn)) {
			const tail = n.slice(sn.length).trim();
			if (tail && SUFFIX_RE.test(tail)) return `${first} ${tail}`;
		}
		return first;
	}

	const focus = $derived(featured.current?.neighborhood?.focus ?? null);

	/**
	 * ── A BAR IS A NAVIGATION LINK ──────────────────────────────────────────────────────────────────
	 *
	 * Sam: "what if I could click the Edith Kermit Carow Roosevelt vertical bar next to Teddy's green
	 * husband vertical bar, and the Featured Card switches to her — but not through the CC lateral
	 * flight, by a SPOUSE SWAP, that so far only occurs when a spouse chip is clicked... and if I've
	 * selected Cornelius Vanderbilt the easter egg but I click Alice's Hooker bar, it transitions by the
	 * CC down transition, because the CC people are both in the same lineage, so not lateral... do it
	 * sustainably and surgically. I'd rather it work well with existing architecture than overhaul
	 * anything or do an inconsistent patch."
	 *
	 * SO THE RAIL ADDS NO NAVIGATION CODE AT ALL. `warmPersonLinks` is a DELEGATION action: it listens
	 * for a click, walks to the nearest <a href="/person/…">, and reads the whole flight off that
	 * anchor's own data attributes — relation, cc-ness, relation class, generation gap, table seat. A
	 * chip is not special; an anchor wearing the right attributes is. So a bar becomes exactly that
	 * anchor and inherits the spouse swap, the directional dive, the flight lock, the roster hide, the
	 * arc decision and the deck — every one of them, in their real implementations rather than in a
	 * second copy that would drift.
	 *
	 * WHICH FLIGHT EACH BAR ASKS FOR:
	 *
	 *   the focus itself   no href — you are already there, and a link to nowhere is a dead click
	 *   a spouse of focus  data-relation="spouse" and NO data-cc → kind 'spouse' → the in-corner swap
	 *   anyone else        data-cc + relation-class "direct" → a CC that is NOT an arc move (isArcMove
	 *                      requires 'collateral'), i.e. the flat vertical dive Sam asked for
	 *
	 * DIRECTION COMES FROM BIRTH ORDER, and that deserves its defence because regenerate-data.js says in
	 * so many words that gen_delta is "NOT a birth-year gap". It is right to refuse birth years THERE:
	 * a CC can join any two people in the corpus, and two strangers' birth years say nothing about
	 * generations. It does not hold here. Every bar on the rail is either the focus, their spouse, or a
	 * link in `lineAnchors` — a walk along spouse/child/parent edges — so the set is a LINEAGE, and
	 * within a lineage birth order IS generation order.
	 *
	 * The measured alternative was worse: `effectiveGen` deliberately leaves an easter egg with no
	 * child-in-law ungenerationed, and the Commodore is exactly that — his `g` is null, so a true
	 * gen_delta against Alice is null, which means LATERAL, which is the one thing Sam ruled out for
	 * this case. Alice and Cornelius II both come back as generation 9, which is correct kinship and
	 * still a 0 delta — lateral again. Birth order gets both right.
	 *
	 * Only the SIGN is used; deckDirFor reads null/0 as lateral, negative as an ancestor arriving from
	 * the top, positive as a descendant from the bottom.
	 */
	const spouseIds = $derived(
		new Set(
			(featured.current?.neighborhood?.spouses ?? [])
				.map((s) => s.spouse?.id)
				.filter((id): id is string => !!id)
		)
	);
	const focusYear = $derived(focus?.by ?? null);

	/**
	 * A SPOUSE BAR HANDS ITS CLICK TO THE REAL SPOUSE CHIP.
	 *
	 * The bar already asks for kind 'spouse', so the CLOCK and the curve were right — but the flight also
	 * grows from wherever it was launched, and `warmPersonLinks` takes that origin from the clicked
	 * element's own rect. Launched from a bar, the card therefore bloomed out of the timeline. Sam liked
	 * the effect and rejected the premise: "the timeline animation you are using is actually very cool,
	 * the Featured Card transitions from the timeline, nicely done. However the timeline and the Featured
	 * Card aren't meant to blend or share features. I'd rather have the normal spouse rotation."
	 *
	 * The normal one is the corner swap: the chip expands out of the notch at the top right to fill the
	 * card while the outgoing card shrinks back down behind it into that same notch.
	 *
	 * SO THE BAR DOES NOT TRY TO REPRODUCE THAT — it forwards to the chip that already performs it. The
	 * spouse chip is itself a link to the same person carrying the same attributes, so dispatching its
	 * click gives the genuine article: the notch rect as the origin, the clicked-chip id captured so it
	 * is hidden while its own copy flies, the real demote behind it. Nothing about the corner swap is
	 * restated here, which is the point — a second implementation is what would eventually disagree.
	 *
	 * Falls through to the bar's own link if there is no usable chip (none rendered, or one parked on an
	 * unshown page of the four-spouse carousel with no rect to fly from). A flight from the rail is a
	 * worse gesture than the corner swap; it is a much better one than a dead click.
	 *
	 * IT IS `onclickcapture`, AND IT HAS TO BE. Svelte 5 DELEGATES `onclick` to the application root, so
	 * an ordinary click handler on this element does not run at this element — it runs at the very end of
	 * the bubble, long after `.rail`'s own `addEventListener` (mounted by use:warmPersonLinks) has already
	 * read the bar's rect and launched. Measured: BOTH flights fired, the rail's first, so the card grew
	 * from the timeline and the preventDefault arrived too late to stop anything. A capture-phase
	 * listener is attached directly to the node and runs before any bubble listener anywhere, which is
	 * the only ordering in which this handler can decide the outcome.
	 */
	function onBarClick(e: MouseEvent, b: Bar) {
		const link = barLink(b);
		if (!link?.spouse || !b.slug) return; // CC bars keep their own link and their own origin
		const chip = document.querySelector<HTMLElement>(
			`.page-container a[data-relation="spouse"][href="/person/${b.slug}"]`
		);
		if (!chip) return;
		const r = chip.getBoundingClientRect();
		if (r.width < 1 || r.height < 1) return; // present but not laid out — nothing to grow from
		// Stops the rail's own delegation (it checks defaultPrevented first) so only ONE flight starts.
		e.preventDefault();
		chip.click();
	}

	function barLink(b: Bar) {
		const isFocus = focus != null && b.key === focus.id;
		if (isFocus || !b.slug) return null;
		if (spouseIds.has(b.key)) return { spouse: true, gd: null };
		// Sign only. Equal years (or an unknown one) fall back to 0 → lateral, which is the honest
		// answer when nothing distinguishes the two.
		const d = focusYear == null ? 0 : Math.sign(b.yr - focusYear);
		return { spouse: false, gd: d };
	}

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

		// ON THE LINE — ONE BAR, and nobody else.
		//
		// This rule was relaxed on Aug 10 to let a bloodline card offer somewhere to go, and Sam reversed
		// it the same day on sight: "if I click Thomas Hooker's headshot I only want the Thomas vertical
		// bar, but now Susanna's been added... if I click William Howard Taft, his wife Helen gets a
		// vertical bar too but that's incorrect."
		//
		// THE RULE IT VIOLATED is the reason the supporting bars exist at all. They are not a family
		// summary — they are a ROUTE HOME, drawn only when the person on the card is NOT on the line, so
		// the rail can show how they reach it: "I only am adding spouses and easter egg vertical bars
		// when the headshot is not in the Hooker line so the user can see the path back to the line."
		// Someone already on the line has no path to draw, so a second bar beside them is not extra
		// information, it is a false equivalence — "I don't want to imply the grandfather of a Hooker
		// equates with a pure Hooker."
		//
		// The cost is real and accepted: a bloodline card is a dead end for rail navigation, because
		// there is no other bar to click. Fewer bars is the goal — "I'm not trying to accumulate vertical
		// bars, I prefer to have as few as possible but sometimes needed."
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
		// THE BLOODLINE SPOUSE GETS AN ANCHOR TOO, and it is the focus's own year. Without it this
		// branch silently dropped its first bar for 46 cards: a LIVING bloodline spouse is `pv`, `pv`
		// is read as no dates at all (see barFor), and barFor then needs a fallback or returns null.
		// Only the focus was being handed one, so I'lee Bailey Hooker showed alone and Tony's bar
		// vanished — while the same pair, viewed from his card, drew hers from her death year.
		//
		// `fallbackBirthYear()` cannot serve here: it scans the focus's spouses for one that is NOT
		// `pv`, and in exactly this case the only spouse IS the `pv` person we are trying to place. The
		// focus's own year is the right anchor anyway — it is the "their spouse was born in 1765" rule
		// the fallback branch already states, applied in the one direction it was missing.
		//
		// Nothing leaks: `pv` still zeroes their real dates, so the bar is positioned from the focus's
		// year and dissolves at both ends. A bloodline spouse with real dates never reaches the
		// fallback, so every card that already drew two bars is untouched.
		if (f.sp && hookerSpouse) {
			return [
				barFor(hookerSpouse, 0, f.by ?? f.dy ?? null),
				barFor(f, 1, fallbackBirthYear())
			].filter((b): b is Bar => !!b);
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

	/**
	 * A LANE ARRIVING OR LEAVING FADES; it does not blink.
	 *
	 * KEYED BY LANE, AND THAT KEY HAS NOW BEEN ARGUED BOTH WAYS — read this before changing it a third
	 * time. Lane keying means travelling between two cards of the same shape swaps the PERSON inside a
	 * lane that never leaves: the bar glides to its new years and the name changes with it. In and out
	 * run only when the NUMBER of lanes changes.
	 *
	 * Keying by PERSON instead is the tidier idea — a bar is somebody, so a new somebody should be a new
	 * object — and it has been tried and rejected TWICE, for two different reasons:
	 *
	 *   FIRST, early on: the bars blinked. "There's no dynamism."
	 *   SECOND, Aug 10: with barArrive making newcomers travel in rather than blink, the blinking was
	 *     solved and the result was still worse. Sam asked for it (John Jay → Cornelius, "the names just
	 *     change on existing easter egg vertical bars which is awkward"), saw it, and took it back within
	 *     the hour: "I take that back. I always liked how the Hooker line person vertical bar was always
	 *     on screen, I didn't want you to blink that out of existence... it's much worse this way."
	 *
	 * The reason the tidier model loses is that the rail is not a list of people, it is a STANDING
	 * INSTRUMENT. A lane is a position on it that stays occupied; continuity of the object is what makes
	 * the instrument feel fixed while its contents change. Dissolving and repopulating it reads as the
	 * instrument itself flickering, which is a bigger claim than any correction to who is named on it.
	 *
	 * 95ms, a fifth of the flight's ~420-550ms. Sam: "not long or distracting or
	 * dramatic, something users wouldn't even notice, nothing drawing attention." A bar appearing is not
	 * an event in the story — it is context arriving — so it should be over before the card lands rather
	 * than competing with it. Reduced motion drops it to zero, which is the honest degrade: the bar is
	 * information, so it still appears, just without the transition.
	 */
	const barFadeMs = $derived(prefersReducedMotion.current ? 0 : 95);

	/**
	 * THE BAR TOOLTIP RIDES THE CURSOR VERTICALLY — the same gesture as the FeaturedCard photo zoom, and
	 * deliberately the same shape of code: horizontal is PINNED (to the bar's right edge, so the label
	 * never drifts sideways), only the vertical follows, and it follows 1:1 with no smoothing and no
	 * spring. Sam: "not exaggerated movements, just always parallel with mouse cursor up and down".
	 * A lag or an ease here would read as the tooltip chasing the mouse; parallel means parallel.
	 *
	 * WRITTEN STRAIGHT TO THE DOM, not through a `$state` rune, and that is the whole reason this is a
	 * function rather than a binding. A pointer handler fires per frame; routing it through state would
	 * re-render the keyed {#each} of bars on every single move, and those bars carry `in:fade`/`out:fade`
	 * plus a --move-ms transition on `top`/`height`. One custom property on the hovered element touches
	 * nothing else and cannot perturb a flight in progress.
	 */
	function trackBarTip(e: PointerEvent) {
		const bar = e.currentTarget as HTMLElement;
		const tip = bar.querySelector('.bar-tip') as HTMLElement | null;
		if (!tip) return;
		// Clamped in VIEWPORT space so a bar hovered at the very top or bottom of the window still shows a
		// whole tooltip, then converted back into the bar's own coordinates because that is what `top` is
		// relative to. `offsetHeight` is real even while the tip is `visibility: hidden` — it has layout.
		const half = tip.offsetHeight / 2;
		const y = Math.max(half + 4, Math.min(e.clientY, window.innerHeight - half - 4));
		bar.style.setProperty('--tip-y', `${y - bar.getBoundingClientRect().top}px`);
	}
	/**
	 * THE RAIL PASSES IN FRONT OF A CC FLIGHT (Sam, experimental — "I may want to revert it but helpful
	 * to see, I think it would make more physical sense"). Flip this to false to put it back underneath.
	 *
	 * It makes the rail a pane of glass at the window's edge that the deck riffles BEHIND, which is the
	 * physical reading: an instrument bolted to the frame does not get painted over by the exhibit.
	 *
	 * WHY THE LIFT IS TRANSIENT rather than a permanent z-index. Three things want to stack and only two
	 * orderings can be true at once. At rest the rail is z 1 — "above the field, above the veil, behind
	 * the stage", the stage winning on SOURCE ORDER because `.page-container` is also z 1 and comes later
	 * in the document (design §41). But the flying hero is a
	 * body-level fixed element at z 2, ABOVE `.page-container`'s z 1, because it has to fly over the card
	 * it is replacing. So "rail above the hero" also puts the rail above the resting stage, and no static
	 * number says both. Lifting only for the duration of the flight buys the new ordering without
	 * touching the resting one at all.
	 *
	 * THE ONE PLACE THIS CAN ARTIFACT, measured rather than assumed: while lifted, the rail also covers
	 * whatever resting stage overlaps it. At 1440 nothing does — the card's left edge is at 257 and the
	 * rail ends at 122. At iPad mini landscape the SIBLING COLUMN reaches x≈29 and would duck under the
	 * rail for the length of the flight. Reported to Sam as part of the experiment.
	 */
	const RAIL_OVER_FLIGHT = true;
	let overFlight = $state(false);
	let liftTimer: ReturnType<typeof setTimeout> | null = null;

	// ONE subscription, not two: this hook already existed to read the flight's clock, and the lift wants
	// the same event at the same instant.
	onMount(() => {
		const un = subscribeCameraMove((m) => {
			// EVERY CC GETS THE SLOW BAR, not just a portrait click. The 1200ms clock was built for the
			// timeline's own portraits, and the mismatch it fixes turns out to be a property of the CC
			// FLIGHT rather than of what launched it: a blade CC publishes a ~410ms duration while the card
			// keeps settling to ~1330ms — the same ~900ms gap — so the bar arrived long before the card
			// either way. Sam, on a same-line CC: "the vertical bar for Jason screams so fast down the
			// timeline, it's too fast... can you apply the same bezier vertical bar transition for CCs?"
			// Portrait clicks publish `kind: 'cc'` too, so this covers them and the old flag is redundant.
			const isCc = m.kind === 'cc';
			// Read BEFORE the payload lands and the bars recompute — this is the outgoing position.
			spawnTop =
				document.querySelector('.rail .bar')?.getBoundingClientRect().top ?? null;
			moveMs = prefersReducedMotion.current
				? 0
				: isCc
					? ANCHOR_BAR_MS
					: (getCameraMove()?.duration ?? 420);
			barEase = isCc && !prefersReducedMotion.current ? ANCHOR_BAR_EASE : BAR_EASE;
			// THE ASCENSION DOES NOT LIFT THE RAIL (roadmap §40). The lift exists because a deck CC sweeps
			// a card ACROSS the window's edge and the rail should read as a pane of glass it passes
			// behind. A head-on crossing passes no edge — it comes straight out of the foreground — so
			// the reason does not apply, and lifting anyway would put the rail on top of the arriving
			// orbit card for the whole flight. Measured as a conflict before it was built, not after.
			if (m.ascend) return;
			if (!RAIL_OVER_FLIGHT || !isCc) return;
			overFlight = true;
			// THE LIFT ENDS WHEN THE FLIGHT ENDS — the flight lock releases at landing, and the subscriber
			// above drops `overFlight` then. This timer is only a backstop for a flight that never locks
			// (reduced motion takes that path) or never lands.
			//
			// IT USED TO BE `duration + 400`, a guess, and the guess was wrong for the one case that
			// mattered. A RECIPROCAL CC ping-pongs the lateral direction, so the outgoing card leaves right
			// and the incoming one enters from the LEFT — straight across the rail — and that flight runs
			// far longer than the camera's nominal duration. Measured on Burr → Tapping Reeve → Burr: the
			// card reached left −1013, sixty-two frames sat inside the rail's column, and the lift had
			// already expired for twenty-six of them. Sam saw exactly that: the card passes UNDER the rail
			// on the way out and OVER it on the way back.
			if (liftTimer) clearTimeout(liftTimer);
			liftTimer = setTimeout(() => {
				overFlight = false;
				liftTimer = null;
			}, 3000);
		});
		return () => {
			un();
			if (liftTimer) clearTimeout(liftTimer);
		};
	});

	// ── ANCHOR FIGURES (design §3.6) — FIRST ONE, AS AN EXPERIMENT ──────────────────────────────────
	// §3.6 asks for ~10 curated people as circular portraits, each a shortcut: click and they become the
	// featured card. This is one of them, hand-placed, to see whether the idea survives contact with the
	// instrument before any of it becomes data. Curation, prominent-years and thumbnail crops are all
	// Stream A work (§3.6: "curation is DATA, owned by Sam") and none of it exists yet.
	//
	// PLACED BY YEARS, NOT PIXELS. The circle is 9 years tall and starts at 2013, so it sits where those
	// years sit and resizes with the scale — at a 950px window that is ~19px, and on a taller screen it
	// grows, because it is a span of time rather than a badge pinned to a corner.
	//
	// ITS LEFT EDGE IS HALF A DIAMETER OUTSIDE THE FIRST LANE, which is what makes Sam's rule hold: "the
	// vertical bars go above his headshot when they are in the area, but you'll still be able to see half
	// of his headshot to the left of the vertical bars at any point." Derived from laneX(0) rather than
	// stated, so it stays true if the lanes ever move.
	/**
	 * `headshotBlurb` IS ITS OWN FIELD, not the person's blurb reused. Sam: "can we do a special field
	 * like headshot blurb? that keeps these a little shorter but I don't want to change existing blurb."
	 *
	 * The two want different lengths for different reasons. A card's blurb has a full column to sit in
	 * and can afford "27th U.S. President; 10th Chief Justice"; a portrait tooltip is a 190px box beside
	 * a 17px dot, and the second clause is what makes it wrap. Shortening the shared one to fit here
	 * would degrade the card to serve the rail.
	 *
	 * WHEN ANCHORS BECOME DATA (§3.6: "curation is DATA, owned by Sam") this needs its own canonical
	 * field alongside the prominent-years range — NOT a re-read of notable_blurb, for exactly the reason
	 * above. Recorded here because the temptation at that point will be to reuse what already exists.
	 */
	const ANCHORS = [
		{
			// 1636 — the year he led his congregation overland to found Hartford, the act this whole tree
			// descends from. Nine years carries it to 1645, two before his death.
			slug: 'thomas-hooker-1586',
			name: 'Rev. Thomas Hooker',
			from: 1636,
			years: 9,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786380011/thomas_ugzawj.png',
			t: { x: 4400, y: 1586 },
			headshotBlurb: 'Founder of Hartford',
			lifespan: '1586–1647'
		},
		{
			// Yale is chartered in 1701; the span runs from the founding through the years he spent
			// building it.
			slug: 'james-pierpont-1659',
			name: 'Rev. James Pierpont',
			from: 1701,
			years: 9,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786380088/jpier_w1rjui.png',
			t: { x: 7304.30625, y: 1659 },
			headshotBlurb: 'Yale co-founder',
			lifespan: '1659–1714'
		},
		{
			// THE FIRST GREAT AWAKENING, and his eight years are unusually easy to name because the whole
			// movement runs between two events of his: the Northampton revival that reached its pitch in
			// the winter of 1734 — "nearly 300 of 1,100 youths were admitted to the church" in six months
			// — and "Sinners in the Hands of an Angry God", preached at Enfield in 1741. A Faithful
			// Narrative (1737) and Whitefield's colonial tour (1739–40) both fall inside. The window runs
			// one year past the sermon to catch Thoughts on the Revival (1742), his defence of it.
			//
			// He is placed next to Pierpont in this array because he married Pierpont's daughter Sarah in
			// 1727, which is also how he reaches the line at all — her mother was Thomas Hooker's
			// great-granddaughter. The rail has 24 clear years either side of him, so nothing here
			// competes for space; this is the one recent addition that needed no arithmetic.
			slug: 'jonathan-edwards-1703',
			name: 'Rev. Jonathan Edwards',
			from: 1734,
			years: 8,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786384740/jedwahead_jf8qvf.png',
			t: { x: 7495.65, y: 1703 },
			headshotBlurb: 'Revivalist preacher',
			lifespan: '1703–1758'
		},
		{
			// 1849-1858, and the span is an argument rather than a guess. 1849 is the pivot — the gold
			// rush is what moved him off regional steamboats and onto ocean-going steamships — and the
			// arc closes in 1857-58 with a monopoly on the California steamship business and the Collins
			// Line driven under. It is deliberately the STEAMSHIP decade and not the railroad one: the
			// Harlem corner is 1863 and the New York Central 1867, which would have run straight through
			// the Civil War years Sam wanted left out.
			slug: 'cornelius-vanderbilt-1794',
			name: 'Cornelius Vanderbilt',
			// 1851, nudged two years down off the 1850 rule so the label is not sitting behind his face.
			from: 1851,
			years: 9,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786384665/cornhead2_hmmvew.png',
			t: { x: 472.9, y: 1794 },
			headshotBlurb: 'Shipping magnate',
			lifespan: '1794–1877'
		},
		{
			// The Revolutionary War itself — 1775 to 1783, which is both the span of the war and the span
			// of his service in it. The only anchor so far whose years need no argument.
			slug: 'benjamin-tallmadge-jr-1754',
			name: 'Benjamin Tallmadge',
			from: 1775,
			years: 8,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786378680/tallm_vmlp9v.png',
			t: { x: 5628, y: 1754 },
			headshotBlurb: 'Intelligence chief',
			lifespan: '1754–1835'
		},
		/**
		 * THE FOUNDING-ERA FOUR, AND WHY THEY SIT WHERE THEY DO.
		 *
		 * Sam's rule is eight years each, on each man's peak, overlapping by no more than one. Tallmadge
		 * already held 1775–1783, and that turns out to DECIDE the rest, because the arithmetic is tight:
		 * four more 8-year windows at a minimum pitch of seven need 1784–1811, and the four peaks all
		 * want to be inside 1784–1807. Twenty-four years cannot hold four windows without two-year
		 * overlaps, so exactly one man has to stand somewhere other than his best years.
		 *
		 * INGERSOLL IS THE ONLY ONE WITH A SECOND PEAK TO STAND ON, so he is the one who moves — see his
		 * entry. The other three each get their strongest window, and none of the four overlaps at all:
		 * Jay's circle ends where Whitney's begins, Whitney's where Burr's begins.
		 *
		 *     Tallmadge  1775–1783   (unchanged)
		 *     Jay        1784–1791
		 *     Whitney    1792–1799
		 *     Burr       1800–1807
		 *     Ingersoll  1811–1818
		 */
		{
			// SECRETARY OF FOREIGN AFFAIRS 1784–89, the Federalist Papers 1788, and the first Chief
			// Justice of the United States from October 1789 — he was directing US foreign policy for
			// the whole of this window and on the Court for the last two years of it. The window stops
			// one year short of the Jay Treaty (1794), which is the cost of leaving Whitney the 1790s;
			// the alternative window, 1789–1796, buys the treaty and loses the diplomacy.
			slug: 'john-jay-1745',
			name: 'John Jay',
			from: 1784,
			years: 8,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786382413/johnhead_ovgu2r.png',
			t: { x: 6389.05, y: 1745 },
			headshotBlurb: 'First Chief Justice',
			lifespan: '1745–1829'
		},
		{
			// The cotton gin — built 1793, patent granted March 1794 — and then the January 1798 musket
			// contract that turned him into an arms manufacturer. His whole claim on the century sits
			// inside these eight years.
			slug: 'eli-whitney-ii-1765',
			name: 'Eli Whitney',
			from: 1792,
			years: 8,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786382334/eliwhead_ggketd.png',
			t: { x: 8139.4, y: 1765 },
			headshotBlurb: 'Cotton gin inventor',
			lifespan: '1765–1825'
		},
		{
			// The least ambiguous window on the rail: the tied election of 1800, the vice presidency
			// 1801–1805, Weehawken in July 1804, the conspiracy in 1806 and the treason trial in 1807.
			slug: 'aaron-burr-jr-1756',
			name: 'Aaron Burr Jr.',
			from: 1800,
			years: 8,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786382260/burrjr_ig0czs.png',
			t: { x: 7011, y: 1756 },
			headshotBlurb: '3rd US Vice President',
			lifespan: '1756–1836'
		},
		{
			// THE ONE MAN NOT ON HIS BEST YEARS, and the displacement is real: he signed the Constitution
			// in 1787 and argued Chisholm v. Georgia in 1793, and both fall inside Jay's and Whitney's
			// circles. He is the one who moves because he is the only one of the four with a genuine
			// second peak rather than a quiet old age — Attorney General of Pennsylvania again 1811–1816,
			// the Federalist candidate for vice president in 1812, and United States Attorney for the
			// Eastern District of Pennsylvania from 1815. The blurb still names what he is remembered
			// for, so the portrait does not read as a stranger.
			slug: 'jared-ingersoll-jr-1749',
			name: 'Jared Ingersoll Jr.',
			from: 1811,
			years: 8,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786382476/ingersollhea_ihwyar.png',
			t: { x: 379.5, y: 1749 },
			headshotBlurb: 'Constitution signer',
			lifespan: '1749–1822'
		},
		{
			// 1828–1836, inside the 1825–1850 Sam asked for and centred on the years her influence reached
			// past her own school. The Troy Female Seminary — the first institution in the United States to
			// offer women higher education — opened in 1821, but this window holds what it made possible:
			// History of the United States in 1828, the European tour of 1830, enrolment past 300 in 1831
			// alongside two more books, and the 1833 gift of her travel book's proceeds to found a school
			// for women in Athens. She left the seminary to her son in 1838, just after it closes.
			//
			// Nothing competes: Ingersoll ends 1819 and Vanderbilt begins 1851, so she has nine clear years
			// above her and fifteen below — the emptiest stretch left on the rail.
			slug: 'emma-willard-1787',
			name: 'Emma Hart Willard',
			from: 1828,
			years: 8,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786390333/emmahead_knwepr.png',
			t: { x: 4501.5, y: 1787 },
			headshotBlurb: "Women's education pioneer",
			lifespan: '1787–1870'
		},
		{
			slug: 'john-morgan-1837',
			name: 'J.P. Morgan',
			from: 1892,
			years: 8,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786376861/jpmhead_iwtuke.png',
			t: { x: 6200.75, y: 1837 },
			headshotBlurb: 'Financier',
			lifespan: '1837–1913'
		},
		{
			// From 1861 — the war he entered as a volunteer colonel and left as a brevet major general.
			// The blurb is written for the portrait rather than taken from his record, whose canonical
			// blurb is the placeholder "General, generation 7 from Hooker".
			slug: 'alfred-terry-1827',
			name: 'Alfred Howe Terry',
			from: 1861,
			years: 8,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786378589/howeterryhead_czcorj.png',
			t: { x: 6452, y: 1827 },
			headshotBlurb: 'Union general',
			lifespan: '1827–1890'
		},
		{
			// 1872–1880, and Sam's hunch was right — the peak is the 1870s. Standard Oil was founded in
			// January 1870, but the DOMINANCE is this window: "The Cleveland Conquest" of 1872 absorbed 22
			// of 26 local competitors in under four months; Pratt and Rogers, his last serious opponents,
			// were secretly acquired in 1874; the 1877 price war with the Pennsylvania Railroad ended with
			// the railroad selling him its oil interests; and by the end of the decade Standard refined
			// over 90% of the oil in the United States. It closes on 1879, the year Pennsylvania indicted
			// him for monopolising the oil trade and the Hepburn Committee exposed the freight rebates —
			// the moment the monopoly became a national argument rather than a business.
			//
			// The 1882 Trust is the one landmark left outside, and the trade is deliberate: 1872 buys the
			// Cleveland Conquest, which is where the monopoly was actually built. Nothing competes for the
			// space — Terry ends 1869 and Morgan begins 1892, so there are 3 clear years above and 12 below.
			slug: 'john-rockefeller-sr-1839',
			name: 'John D. Rockefeller',
			from: 1872,
			years: 8,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786386955/rockhead_ay85jm.png',
			t: { x: 4226.8, y: 1839 },
			headshotBlurb: 'Standard Oil founder',
			lifespan: '1839–1937'
		},
		{
			slug: 'theodore-roosevelt-1858',
			name: 'Theodore Roosevelt',
			from: 1902,
			years: 8,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786377021/teddhead_zruxvf.png',
			t: { x: 7460.525, y: 1858 },
			headshotBlurb: '26th US President',
			lifespan: '1858–1919'
		},
		{
			// 1909, moved two years EARLIER so he now overlaps Teddy's last year rather than clearing it
			// (Sam: "move Taft headshot starting year by 2, ok for slight overlap"). Which is also the
			// truer picture — Taft was Roosevelt's Secretary of War before he was his successor.
			slug: 'william-taft-1857',
			name: 'William Howard Taft',
			// 1910, not 1909. Sam moved him +2 originally to accept a slight overlap with Teddy; the
			// short-viewport portrait boost then grew BOTH circles and pushed it to 2.00 years, past his
			// own one-year rule. One year later brings it back inside.
			from: 1910,
			years: 8,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786377115/tafthead_pmouha.png',
			t: { x: 1942.25, y: 1857 },
			headshotBlurb: '27th US President',
			lifespan: '1857–1930'
		},
		{
			// THE FIRST OF TWO THAT CLOSE THE 1919-2012 HOLE. Eight years, not the four this first
			// shipped with. `years` is not only the bar's length — anchorD() feeds it to BOTH the
			// portrait's width and its height, so a four-year span rendered his face at half the
			// diameter of every neighbour and Sam read it as a mistake ("so small in timeline"). The
			// honest span was 1941-1945, exactly America's war; the legible one starts at 1937 and
			// still ends on the June 1945 brigadier's star. Circle size wins: an anchor nobody can see
			// is worse than a start year three years early.
			slug: 'edward-munson-jr-1904',
			name: 'Gen. Edward Munson Jr.',
			from: 1937,
			years: 8,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786567994/Munson_Edward_Lyman_l0ejs3.jpg',
			t: { x: 2637, y: 1904 },
			headshotBlurb: 'Armed Forces Radio founder',
			lifespan: '1904–1967'
		},
		{
			// 1946 rather than the 1947 that would have given more room: the Nuremberg trial OPENED on 20
			// November 1945 and ran to the verdicts of October 1946, so 1947 would have sat entirely
			// AFTER the thing it names. 1946 is the year the case closed. Eight years carries him to
			// 1954 — Brown v. Board, and his own death.
			slug: 'robert-jackson-1892',
			name: 'Robert H. Jackson',
			from: 1946,
			years: 8,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786568087/Screenshot_2026-08-12_at_1-resized_nglhjj.png',
			t: { x: 7623.9, y: 1892 },
			headshotBlurb: 'Nuremberg prosecutor',
			lifespan: '1892–1954'
		},
		{
			// VIETNAM, and the only anchor here who is not famous — Sam's call: "he's not particularly
			// notable but it's moving and his CCs are ripe." He is on the rail for the connections his
			// card makes (Henrietta Swan Leavitt his great-aunt, the Ambassador his father, two other
			// Hooker descendants dead in the same war), not for a reputation.
			//
			// 1967 is when he shipped out, not when he died: he began his tour on 15 December 1967 and
			// was killed at Khe Sanh on 21 April 1968, four months in. Eight years carries the bar to
			// 1975 and the end of the war — the full-size circle every other anchor gets, with a start
			// year that is still a fact about him.
			//
			// WAS THE ONLY PORTRAIT ON THE RAIL NOT SERVED FROM CLOUDINARY, and the risk this comment
			// recorded on 081226 came true on 082926 exactly as written:
			//
			//   "If that host hotlink-blocks, this is the anchor that breaks; the sampled border ink
			//    will fall back to the default either way, since a third-party host is the least
			//    likely to answer with the CORS header."
			//
			// What actually happened was the CORS half, and on EVERY page rather than his own —
			// because the rail is chrome, so its anchor portraits load whatever card you are looking
			// at. Sam saw it in the console on Thomas Hooker's page and asked where it came from.
			//
			// Re-hosted on Cloudinary 082926. Every anchor on the rail is now first-party, which also
			// restores `sampleInk()` for this one: the sampler reads pixels off a canvas, so a
			// cross-origin image without the CORS header taints it and the border ink silently falls
			// back to the default. That was the second, quieter half of the same bug.
			//
			// THE URL WAS IN TWO PLACES, which is the reason worth keeping: here, and HD0901's
			// `bio.photo_url` in canonical.json. This list is BAKED (§3.6 — "curation is DATA, owned
			// by Sam" — records that anchors want their own canonical home and do not yet have one),
			// so a data-side fix alone would have left the rail still pointing at the dead host.
			slug: 'gridley-strong-1947',
			name: 'PFC Gridley Strong',
			from: 1967,
			years: 9,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1788034068/Strong_Gridley_Barstow_DOB_1947_2_robdkl.webp',
			t: { x: 4988, y: 1947 },
			headshotBlurb: 'Killed at Khe Sanh',
			lifespan: '1947–1968'
		},
		{
			// 1957–1966, NOT the seventies, and the arithmetic is why. Gridley Strong runs 1967–1976 and
			// Oliver North opens at 1981, which leaves five clear years between them — no room for the
			// eight- or nine-year circle every other anchor gets, and moving Gridley forward only walks
			// him further into the same ground. The gap above is thirteen years wide (Jackson closes
			// 1954) and takes a full bar with a clear year at either end.
			//
			// The window is also the truer one for him: UNRWA and the Palestine refugee agency to 1958,
			// the Paris embassy, the Athens embassy from 1962, and the bottom of the bar landing on 1966
			// — the year after he took UNICEF and accepted its Nobel Peace Prize five months in.
			slug: 'henry-labouisse-jr-1904',
			name: 'Henry R. Labouisse',
			from: 1957,
			years: 9,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1787410551/henryl_lobsfd.png',
			t: { x: 8448.5, y: 1904 },
			headshotBlurb: "UNICEF's Nobel director",
			lifespan: '1904–1987'
		},
		{
			// 1981–1989, the window Sam asked for, and it happens to close cleanly on both ends: he
			// joined the National Security Council staff in 1981 and was fired from it in November 1986,
			// testified through the summer of 1987 hearings in uniform, and was tried and convicted in
			// 1989 (the conviction was vacated the year after). The rail has 6 clear years above him —
			// Gridley Strong ends 1975 — and 24 below, since Cooper does not begin until 2013. This is
			// the emptiest stretch of the modern rail, which is why he fits without any arithmetic.
			slug: 'oliver-north-1943',
			name: 'Oliver North',
			from: 1981,
			// years 9, not 8 — Sam wanted this portrait and Gridley Strong's a year taller than the
			// eight-year default. 1981–1990 also catches the year the conviction was vacated.
			years: 9,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786816494/onor_qlcqnh.png',
			t: { x: 8014.4, y: 1943 },
			headshotBlurb: 'Iran-Contra figure',
			lifespan: '1943–'
		},
		{
			slug: 'anderson-cooper-1967',
			name: 'Anderson Cooper',
			from: 2013,
			years: 9,
			src: 'https://res.cloudinary.com/dc5clrqtw/image/upload/v1786374420/Screenshot_2026-08-10_at_8.05.52_AM_z2sykc.png',
			// The seat the deck flies FROM. Anderson's own table coords, so the camera vector is real.
			t: { x: 528, y: 1967 },
			headshotBlurb: 'Broadcast journalist',
			// No death year — he is alive. `span` above is how TALL the circle is; this is what it SAYS.
			lifespan: '1967–'
		}
	];
	/** Each portrait is as tall as the years it claims — so its size states its span, not a badge size. */
	/**
	 * A PORTRAIT IS A SPAN OF YEARS, so a short window makes it a dot — 8 years is 17px at a 950px
	 * browser and 13px at an iPad's 744. Sam: "when the browser height gets below say 1070px, it's ok to
	 * increase the size of the timeline headshots by 10% or maybe to 10 years even with overlap because
	 * they become so small."
	 *
	 * COMPENSATION IS CONTINUOUS, NOT A STEP AT 1070. A threshold would snap every portrait to a new
	 * size mid-drag while resizing; `1070 / vh` is 1.0 exactly at his number and grows from there, so
	 * the correction appears as the window shortens rather than jumping. It caps at 1.25 — the "10 years
	 * instead of 8" reading of his second option — which is reached at ~856px and holds all the way down.
	 * At a 950px browser it works out to 12.6%, which is his first option.
	 *
	 * Only the DIAMETER grows; `from` is untouched, so a portrait still begins at the year it belongs to
	 * and simply reaches further down. That is what spends Sam's "even with overlap" — at the cap the
	 * founding-era four gain about 2 years of reach each.
	 *
	 * INSIDE anchorD RATHER THAN AT THE MARKUP, so anchorOrigin — which decides which corner a portrait
	 * grows out of on hover from how much room it has — measures the same circle that gets drawn. Scaled
	 * at the call site instead, the two would have disagreed and portraits near an edge would have
	 * chosen their origin from a size they no longer were.
	 */
	const SHORT_VH = 1070;
	const ANCHOR_SHORT_CAP = 1.25;
	const anchorBoost = $derived(
		stage.vh > 0 ? Math.min(ANCHOR_SHORT_CAP, Math.max(1, SHORT_VH / stage.vh)) : 1
	);
	const anchorD = (yearsTall: number) =>
		Math.max(14, (yearsTall / span) * railH) * anchorBoost;
	/** 8px off the window edge — 4px, then another 4 on Sam's word. Close enough to read as pinned, far
	    enough not to look clipped. anchorOrigin reads this too, so a portrait near the edge still picks
	    the corner it grows from off the distance it actually has. */
	/**
	 * EACH PORTRAIT'S BORDER IS SAMPLED FROM THE PORTRAIT (Sam, Aug 10) — "instead of a consistent medium
	 * brown border for everyone, sample from the image itself and solidify that sampled colour, and maybe
	 * use a 5% darker shade of the sample for that specific border colour."
	 *
	 * SAMPLED AT RUNTIME RATHER THAN BAKED INTO ANCHORS, and that is the choice worth defending. Baking
	 * sixteen hex values would be cheaper and needs no canvas — but the portraits get REPLACED (Cornelius
	 * Vanderbilt's was swapped mid-session), and a baked colour silently keeps describing the old picture.
	 * Sampling means the border is always a fact about the image that is actually on screen.
	 *
	 * THE SAMPLE IS A SECOND Image, not the one being displayed. Reading pixels needs `crossOrigin`, and
	 * setting that on the displayed <img> would make the portrait FAIL TO LOAD outright anywhere the host
	 * does not answer with the CORS header — trading a generic border for no face at all. A separate
	 * loader can fail silently and cost nothing: the anchor simply keeps the default ink. All sixteen
	 * originally succeeded (measured); Munson and Jackson were added later and have NOT been measured, so
 * either may quietly fall back to the shared ink. The fallback is the ink they used to share.
	 */
	let anchorInk = $state<Record<string, string>>({});

	/** L × 0.95 in HSL — a darker SHADE, hue and saturation untouched. Doing it in RGB would drag the
	 *  saturation with it, which is the mistake this component has already made once on the ground. */
	function shade5(r: number, g: number, b: number): string {
		const [rr, gg, bb] = [r / 255, g / 255, b / 255];
		const mx = Math.max(rr, gg, bb);
		const mn = Math.min(rr, gg, bb);
		let h = 0;
		let sat = 0;
		let l = (mx + mn) / 2;
		if (mx !== mn) {
			const d = mx - mn;
			sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
			h = mx === rr ? (gg - bb) / d + (gg < bb ? 6 : 0) : mx === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
			h /= 6;
		}
		l = Math.max(0, l * 0.95);
		const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat;
		const pp = 2 * l - q;
		const cv = (t: number) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return pp + (q - pp) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
			return pp;
		};
		const out = [cv(h + 1 / 3), cv(h), cv(h - 1 / 3)].map((v) => Math.round(v * 255));
		return `rgb(${out[0]}, ${out[1]}, ${out[2]})`;
	}

	/** Average every OPAQUE pixel of a 32x32 downscale. Transparent pixels are skipped because these are
	 *  cut-out PNGs — counting them would drag every border toward whatever the canvas cleared to. */
	function sampleInk(slug: string, src: string) {
		const im = new Image();
		im.crossOrigin = 'anonymous';
		im.onload = () => {
			try {
				const c = document.createElement('canvas');
				c.width = 32;
				c.height = 32;
				const x = c.getContext('2d');
				if (!x) return;
				x.drawImage(im, 0, 0, 32, 32);
				const d = x.getImageData(0, 0, 32, 32).data;
				let n = 0;
				let R = 0;
				let G = 0;
				let B = 0;
				for (let i = 0; i < d.length; i += 4) {
					if (d[i + 3] < 128) continue;
					R += d[i];
					G += d[i + 1];
					B += d[i + 2];
					n++;
				}
				if (n) anchorInk = { ...anchorInk, [slug]: shade5(R / n, G / n, B / n) };
			} catch {
				/* tainted canvas — the anchor keeps the shared default ink, and the face still renders */
			}
		};
		im.src = src;
	}
	onMount(() => {
		for (const a of ANCHORS) sampleInk(a.slug, a.src);
	});

	const ANCHOR_INSET = 8;
	/** Hover growth: +200%, then 10% more on Sam's word — three and a third times the resting size. */
	const ANCHOR_HOVER_SCALE = 3.3;
	const EDGE_MARGIN = 4;

	/**
	 * WHICH CORNER THE PORTRAIT GROWS OUT OF.
	 *
	 * At rest these are ~19px dots; on hover one becomes ~57px, and a dot sitting 4px off the window's
	 * edge cannot grow around its own centre without half of it ending up outside the browser. Sam: "if
	 * a headshot is right next to browser edges including top and bottom it expands more up and right so
	 * headshot is always fully visible on hover."
	 *
	 * So the transform-origin is CHOSEN PER ANCHOR from how much room each side actually has. An anchor
	 * pinned bottom-left grows up and right off its bottom-left corner; one in open space grows about its
	 * centre. This is written generally rather than hard-coded to Anderson's corner, because the second
	 * anchor will not be in the same place and a hard-coded origin would be silently wrong for it.
	 */
	function anchorOrigin(fromYear: number, yearsTall: number): string {
		const d = anchorD(yearsTall);
		const grow = (d * (ANCHOR_HOVER_SCALE - 1)) / 2; // overhang each side with a centre origin
		const top = yFor(fromYear);
		const ox = ANCHOR_INSET - grow < EDGE_MARGIN ? 'left' : 'center';
		const oy =
			top - grow < EDGE_MARGIN
				? 'top'
				: top + d + grow > stage.vh - EDGE_MARGIN
					? 'bottom'
					: 'center';
		return `${ox} ${oy}`;
	}
	/** The tooltip sits above unless there is no room, in which case it drops below. */
	const tipBelow = (fromYear: number) => yFor(fromYear) < 90;

	/**
	 * A PORTRAIT CLICK IS THE ONE FLIGHT WHERE THE BAR AND THE CARD DISAGREE ABOUT HOW LONG IT TAKES.
	 *
	 * Measured on Cooper → Thomas Hooker, the longest travel on the rail:
	 *
	 *     BAR    starts 210ms   finishes  655ms      (--move-ms was 477, the camera's own duration)
	 *     CARD   name swaps 190ms   settles 1500ms
	 *
	 * Both wait on the same `focusPerson`, so they START together — the whole gap is duration. The bar
	 * was done 850ms before the card, which is what Sam saw: "it's jarring to have one timeline swoop
	 * down instantly when headshot is clicked... can they arrive roughly at the same time? The vertical
	 * bar can arrive sooner than the featured card but not as soon as it does now."
	 *
	 * So the bar gets its own clock for this one case: ~1000ms of travel, landing near 1210ms against
	 * the card's 1500ms — still first, by a few beats instead of by most of a second.
	 *
	 * ONLY A PORTRAIT CLICK, flagged here rather than inferred from `kind === 'cc'`. A CC blade click is
	 * also kind 'cc' and Sam has said that transition reads well; tree navigation (spouse, relative,
	 * sibling) he asked explicitly to leave alone. A flag set at the one call site cannot reach any of
	 * them. If the blade wants this too it is one condition, not a rewrite.
	 *
	 * THE EASING CHANGES WITH THE DURATION, because it has to. The bars ride easeOutCubic, which spends
	 * ~70% of the distance in the first third of the time — stretched to a second that would read as
	 * screaming away and then crawling, which is the complaint made worse rather than fixed. An
	 * ease-in-out leaves slowly, which is the half of "doesn't scream into position" that duration alone
	 * cannot buy.
	 */
	// 1000 → 1200 ("a bit slower to arrive... not a ton slower, maybe just a couple of more beats").
	// This is the ceiling if the bar is still to arrive FIRST: it now lands ~1400ms against the card's
	// ~1400ms, so the two are effectively simultaneous and any more would put the bar in last.
	// MIRRORED IN flight.ts AS `ASCEND_TOTAL_MS` — the Ascension is timed to land WITH the bar, because
	// the bar is what Sam judges a CC against: "we want to measure at the speed of the vertical bar
	// transitioning into place." If this number moves, move that one. A transition module cannot import
	// a component, so the two carry notes at each other rather than one constant.
	const ANCHOR_BAR_MS = 1200;
	const ANCHOR_BAR_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';
	const BAR_EASE = 'cubic-bezier(0.33, 1, 0.68, 1)';
	let barEase = $state(BAR_EASE);
	/**
	 * WHERE A NEWLY-ADDED LANE COMES FROM — the outgoing composition's top bar, captured off the DOM at
	 * publish time, while the old bars are still standing.
	 *
	 * THE BUG THIS FIXES. The bars are keyed by LANE, so what a navigation looks like depended entirely
	 * on whether the PREVIOUS card happened to have that lane. Measured three ways:
	 *
	 *     Hooker(1) → Vanderbilt(4)   lane 0 reused, glides 6→562 as Alice;
	 *                                 lanes 1–3 NEW — mounted already at 558/510/452 and merely faded in
	 *     Vanderbilt(4) → Edwards(2)  all four reused: everything glides together
	 *     Cooper(1) → Edwards(2)      lane 0 glides; lane 1 NEW, born at its destination
	 *
	 * That is Sam's whole report, and both halves of it: "the three vertical bars... instantly appear
	 * before Alice arrives", and "sometimes Jonathan Edwards will appear automatically and instantly
	 * while his wife Sarah transitions but sometimes his bar grows out of Sarah far away on the timeline
	 * and they move along the timeline together. Why does that happen? It's inconsistent behavior which
	 * tells me something is wrong, behaviors need to be repeatable."
	 *
	 * It WAS repeatable — on a rule no viewer can see. A lane that already existed travels; a lane that
	 * did not is born at the finish line. So the fix is not to delay the newcomers but to give them the
	 * same journey: every new lane now starts where the outgoing bar stood and glides to its place, on
	 * the same clock and curve as the reused ones. Both of Sam's cases collapse into the one he liked.
	 */
	let spawnTop = $state<number | null>(null);

	/**
	 * The arrival itself. Deliberately a TRANSFORM rather than an animated `top`: `top` already carries
	 * the CSS transition the reused lanes ride, and driving the same property from two clocks at once is
	 * how a bar ends up fighting itself.
	 *
	 * Falls back to the plain fade when there is no origin to travel from — a first paint, a reload, or
	 * a reduced-motion flight where moveMs is 0. A bar with nowhere to come from should not invent a
	 * journey.
	 */
	function barArrive(_node: Element, opts: { from: number | null; to: number; ms: number }) {
		const delta = opts.from == null ? 0 : opts.from - opts.to;
		if (!delta || !opts.ms) return { duration: barFadeMs, css: (t: number) => `opacity: ${t}` };
		return {
			duration: opts.ms,
			// The JS twins of the two CSS curves the reused lanes use, so a travelling newcomer and a
			// travelling veteran cannot visibly disagree about the shape of the same move.
			easing: barEase === ANCHOR_BAR_EASE ? cubicInOut : cubicOut,
			css: (t: number) =>
				`transform: translateY(${(1 - t) * delta}px); opacity: ${Math.min(1, t * 5)}`
		};
	}

	/**
	 * A CLICKED PORTRAIT LETS GO OF ITS HOVER.
	 *
	 * The expand and the tooltip are pure CSS `:hover`, which has no way to end while the pointer stays
	 * still — so after a click the portrait remained at 3.3x with its label open, sitting over the card
	 * that had just arrived. Sam: "after i click a headshot, can we automatically revert the headshot
	 * back to small and remove the tooltip? If the mouse is still hovering over the small image again, it
	 * wouldn't trigger the bigger expanded headshot and tooltip unless the user exits the headshot and
	 * returns to it."
	 *
	 * So the click SUPPRESSES hover on that one portrait, and only `pointerleave` clears the suppression
	 * — which is exactly the "exits and returns" rule. Held by SLUG rather than by index so it survives
	 * the warm navigation the click sets off (the rail is never unmounted, but the array is re-read).
	 */
	let hoverSuppressed = $state<string | null>(null);

	/**
	 * NO PORTRAIT EXPANDS WHILE A FLIGHT IS RUNNING. Sam: "let's also make the hover headshot expansion
	 * transition not possible during transitions. If someone hovers over a new headshot but a transition
	 * is happening there's no response, but if they leave the mouse there, right at the point the
	 * transition is complete and the new featured card settles, [it expands]."
	 *
	 * That second half is why this is a CLASS on the element and not a guard in a handler: the expansion
	 * is CSS `:hover`, so the moment the class comes off, a pointer that never moved is still hovering and
	 * the portrait grows on its own. Nothing has to detect that the mouse is there — it already is.
	 */
	let flightLocked = $state(false);
	onMount(() =>
		subscribeFlightLock((v) => {
			flightLocked = v;
			// AND THE RAIL COMES BACK DOWN HERE, not on a timer — see the lift below.
			if (!v) overFlight = false;
		})
	);

	function onAnchorClick(e: MouseEvent, a: (typeof ANCHORS)[number]) {
		// A FLIGHT IS ALREADY RUNNING — swallow this entirely. Sam: "I noticed I can just click different
		// headshots in rapid succession while transitions are happening and it instantly resets the
		// transitions that are happening to the new people."
		//
		// THE LOCK ALREADY EXISTED and this was the one door left unlocked. Every other navigation on the
		// page — chips, CC blade links, sibling seats, and the rail's own vertical bars — goes through
		// warmPersonLinks, which tests exactly this before doing anything. Portrait clicks call ccFlyTo
		// directly, and ccFlyTo SETS the lock without ever CHECKING it, so a second portrait could always
		// barge in over the first one's flight. Testing here closes the hole with the existing mechanism
		// rather than a new one, and it is page-wide by construction because every other path was already
		// covered. The lock is released when the incoming card lands with its chips out, and is
		// safety-timed, so a dropped flight cannot leave the page permanently unclickable.
		//
		// NOTHING VISUAL CHANGES while locked — no `pointer-events: none`, so the cursor stays the pointer
		// and hover still expands the portrait (Sam: "the cursor can stay the same even when click events
		// none"). The click simply does not land.
		if (isFlightLocked()) {
			e.preventDefault();
			return;
		}
		const el = e.currentTarget as HTMLElement;
		hoverSuppressed = a.slug;
		void ccFlyTo(el, { slug: a.slug, t: a.t });
	}

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

	/**
	 * THREE TIERS OF RULE, so the scale can be read at a glance instead of counted.
	 *
	 *   half      every 50 years   38px long, 3.6px thick, and the only tier that carries a year
	 *   quarter   every 25         32.9px long, 2.6px thick
	 *   eighth    every 12.5       32.9px long, 2.1px thick
	 *
	 * A QUARTER TIER WAS BUILT AND REMOVED ONCE BEFORE, and it is back now for a reason worth keeping in
	 * writing. The first attempt ranked the tiers by LENGTH, and on a 440-year scale at ~1.9px/year a
	 * 25-year mark sits only 47px from its neighbours — a third length there did not read as a third
	 * rank, it read as an irregularity in the decade rhythm, and Sam had it taken out.
	 * THE SECOND ATTEMPT RANKS THEM BY THICKNESS instead (Sam, this pass), and length now says only
	 * "numbered or not". Weight survives at small differences where length does not: 3.6 / 2.6 / 2.1 is
	 * legible at a glance, while 38 / 32.9 / 32.9 would be three of the same mark. If a tier is ever
	 * added or removed again, that is the axis to move.
	 *
	 * THE STEP IS 12.5 AND MUST STAY A CLEAN BINARY FRACTION. The old loop stepped by 10 and the comment
	 * here warned that quarters fall on 1625/1675/1725 and would be dropped by it — the same trap, one
	 * level finer: 12.5 is 25/2 and exact, so `% 50` and `% 25` classify correctly and `t.year` stays a
	 * usable key. A step that is not a binary fraction would reintroduce it as float drift.
	 */
	type Tick = { year: number; tier: 'half' | 'quarter' | 'eighth'; century: boolean };
	/**
	 * THREE TIERS ON A TWELVE-AND-A-HALF-YEAR GRID — half, quarter and eighth of a century.
	 *
	 * The decade stub is gone. Sam: "instead of one line every 10 years inbetween the 50 year markers,
	 * do one 25 year marker... and then do halfway markers inbetween the 25 and 50 year markers." A mark
	 * halfway between a 25 and a 50 IS a 12.5, so the grid is 12.5 and the three tiers fall out of it by
	 * divisibility. It reads as a ruler rather than as a count of decades: one long mark, one shorter at
	 * the midpoint, one shorter still at each quarter of the gap.
	 *
	 * FEWER MARKS, NOT MORE — 35 across the 440-year span against the decade grid's 44. The note on the
	 * abandoned 2-year tier below still holds: what killed it was density, and this moves away from that
	 * rather than toward it.
	 *
	 * 12.5 IS EXACT IN BINARY (it is 25/2), so `% 50` and `% 25` are safe here in a way a 1/3 step would
	 * not be, and `t.year` stays a usable key.
	 */
	const ticks = $derived.by(() => {
		const out: Tick[] = [];
		const STEP = 12.5;
		const first = Math.ceil(START_YEAR / STEP) * STEP;
		for (let y = first; y <= endYear; y += STEP) {
			if (y % 50 === 0) out.push({ year: y, tier: 'half', century: y % 100 === 0 });
			else if (y % 25 === 0) out.push({ year: y, tier: 'quarter', century: false });
			else out.push({ year: y, tier: 'eighth', century: false });
		}
		return out;
	});
</script>

<!-- use:warmPersonLinks — the SAME delegation the stage uses, mounted here so a bar's <a> is handled by
     the real navigation path rather than by a second one written for the rail. See barLink. -->
<div
	use:warmPersonLinks
	class="rail"
	class:ascended={ascension.active}
	class:founder={ascension.founder}
	class:over-flight={overFlight}
	style="--rail-w: {RAIL_W}px; --move-ms: {moveMs}ms; --tip-ms: {barFadeMs}ms;
	       --bar-ease: {barEase}"
	aria-hidden="true"
>
	{#each ticks as t (t.year)}
		<div class="tick {t.tier}" style="top: {yFor(t.year)}px;">
			{#if t.tier === 'half'}
				<span class="tick-year" class:century={t.century} class:millennium={t.year % 1000 === 0}
					>{t.year}</span
				>
			{/if}
		</div>
	{/each}

	<!-- ERA MARKS ARE NOT RENDERED. Sam, Aug 10: "remove the small vertical notches in timeline
	     representing WW1, WW2, Civil War etc, we'll re-engineer something different for that later."
	     The 3px band and 7px hairline are gone; the ERAS list itself is kept above because it is
	     CURATED CONTENT — six spans and moments chosen against a 440-year scale — and the successor
	     will want the same years whatever shape it takes. -->

	<!-- KEYED ON THE LANE, NOT THE PERSON. This is what makes the rectangle MOVE instead of blink: a
	     keyed each destroys and recreates an element whose key changed, and a brand-new element has no
	     previous top/height to transition FROM, so keying on the person's id meant every navigation
	     replaced the bar at its destination and the CSS transition never ran once. The lane is the
	     durable identity here — "the bloodline bar" persists and the person flows through it — which is
	     the same reasoning the flight's keyed lists already use for chips. -->
	<!-- ANCHORS sit BELOW the bars in source order so a bar in the same years paints over them, which is
	     the resting state Sam described. On hover the anchor lifts above everything — see .anchor:hover. -->
	{#each ANCHORS as a (a.slug)}
		<button
			class="anchor"
			type="button"
			class:tip-below={tipBelow(a.from)}
			style="top: {yFor(a.from)}px; left: {ANCHOR_INSET}px; width: {anchorD(a.years)}px;
			       height: {anchorD(a.years)}px; --anchor-origin: {anchorOrigin(a.from, a.years)};
			       --anchor-scale: {ANCHOR_HOVER_SCALE};
			       {anchorInk[a.slug] ? `--anchor-ink: ${anchorInk[a.slug]};` : ''}"
			aria-label="Go to {a.name}"
			class:no-hover={hoverSuppressed === a.slug || flightLocked}
			onclick={(e) => onAnchorClick(e, a)}
			onpointerleave={() => {
				if (hoverSuppressed === a.slug) hoverSuppressed = null;
			}}
		>
			<!-- EVERYTHING VISIBLE LIVES IN HERE, and the button itself never moves. See .anchor-vis for
			     why. Same box (inset 0), same transform, same origin the button used to carry, so the
			     tooltip's containing block and its counter-scale are unchanged. -->
			<span class="anchor-vis">
				<img src={a.src} alt="" draggable="false" />
				<!-- Three lines, in Sam's order: who, what, when. No `title` attribute alongside it — the
				     browser's own tooltip would appear a second later on top of this one. -->
				<span class="anchor-tip">
					<span class="tip-name">{a.name}</span>
					<span class="tip-blurb">{a.headshotBlurb}</span>
					<span class="tip-years">{a.lifespan}</span>
				</span>
			</span>
			<!-- THE EXPANDED HIT AREA — invisible, and live only while the portrait is actually expanded.
			     See .anchor-hit. -->
			<span class="anchor-hit" aria-hidden="true"></span>
		</button>
	{/each}

	<!-- A BAR IS AN <a> — see barLink for what each variant asks the delegation for. No `role`: an
	     anchor is interactive on its own and role="img" on one is a contradiction (it carried that role
	     as a <div>, when only its pointer handlers made it interactive). The label rides the anchor, so
	     a linked bar announces as "link: Alice, 1845–1934", which is now what it is. -->
	<!-- HIDDEN BELOW 900px, and the gate is the STAGE's answer rather than a media query here (§33.1 —
	     nothing but that module reads the window). Sam: "at <900px browser width the vertical lines are a
	     liability and will never work so hide the vertical lines at that point." At 850 the container is
	     835px and a card plus this column's 114px cannot both fit, so every layout below 900 was picking
	     which one to spoil. The YEAR RULES above stay — they are horizontal, they bleed off the left edge,
	     and a card passing over a thin rule reads as depth rather than as collision. `bars` is still
	     COMPUTED either way, so nothing about lane identity or the flight's clock changes; only the
	     painting stops, and it comes back the moment the window is wide enough to hold it. -->
	{#each stage.timelineBars ? bars : [] as b (b.lane)}
		{@const link = barLink(b)}
		<a
			class="bar"
			class:linked={!!link}
			class:prism={b.prism}
			href={link ? `/person/${b.slug}` : undefined}
			data-relation={link && link.spouse ? 'spouse' : undefined}
			data-cc={link && !link.spouse ? 'true' : undefined}
			data-relation-class={link && !link.spouse ? 'direct' : undefined}
			data-gen-delta={link && !link.spouse ? String(link.gd) : undefined}
			data-tx={link && b.tx != null ? String(b.tx) : undefined}
			data-ty={link && b.ty != null ? String(b.ty) : undefined}
			style="top: {b.top}px; height: {b.height}px; left: {laneX(b.lane)}px; width: {BAR_W}px;
			       --bar-bg: {b.style.bg}; --bar-bd: {b.style.border}; color: {b.style.ink};
			       --bar-mask: {b.mask || 'none'}; --bar-z: {2 + b.lane};"
			in:barArrive={{ from: spawnTop, to: b.top, ms: moveMs }}
			out:fade={{ duration: barFadeMs }}
			onpointerenter={trackBarTip}
			onpointermove={trackBarTip}
			onclickcapture={(e) => onBarClick(e, b)}
			aria-label={b.years ? `${b.name}, ${b.years}` : b.name}
		>
			<!-- A DIED-YOUNG BAR CARRIES NO NAME. Andrew Yates Hooker lived 1844–1845, so his bar is the
			     6px floor, and a vertical name in it is a smear rather than a word — Sam: "it tries to fit
			     'Andrew' in there... I think maybe we just don't show the name if they died young, the user
			     can see the name in the Featured Card." The tooltip still carries name, years and age, so
			     nothing is lost, it is just asked for rather than crammed in.
			     What replaces it is a horizontal note to the RIGHT, which answers the question the stub
			     raises ("why is this bar a dot?") instead of leaving the reader to check the card. -->
			{#if b.young}
				<span class="bar-dy">died young</span>
			{:else}
				<span class="bar-label" style={b.labelH != null ? `height: ${b.labelH}px` : ''}>{b.name}</span>
			{/if}
			<!-- The bar's own tooltip: who and when, in the bar's OWN colours rather than the portraits'
			     dark slab. A lane already says what someone IS by its hue, so a tooltip that threw that
			     away and came back black would discard information the rail had already given. -->
			<span class="bar-tip">
				<span class="bar-tip-name">{b.name}</span>
				{#if b.years}<span class="bar-tip-years">{b.years}</span>{/if}
				{#if b.age}<span class="bar-tip-age"
						>{b.age.approx ? '~' : ''}Age {b.age.years}</span
					>{/if}
			</span>
		</a>
	{/each}
</div>

<style>
	.rail {
		position: fixed;
		left: 0;
		top: 0;
		bottom: 0;
		width: var(--rail-w);
		/* ── THE RULES' GEOMETRY, IN ONE PLACE (083026) ───────────────────────────────────────────
		   Three numbers the ticks and the years both read, so a rule and the year riding it cannot
		   drift apart — previously the rule's `left`, its `width` and the year's `left` were three
		   independent constants that a comment had to keep describing as "ONE measurement".

		   --tick-x IS NEGATIVE ON PURPOSE. Sam: "extend left beyond the browser edge so we don't see
		   a gap." The rules used to start at +5, which left a sliver of ground between the window's
		   edge and the start of every line — the eye reads that as the instrument floating loose
		   rather than running off the page. Bleeding past 0 makes the scale continue beyond the frame,
		   which is what a ruler does.

		   --tick-long is where the half and quarter rules END, and it is also where the YEAR's right
		   edge sits, because the year is now right-aligned into this same box. It stops just short of
		   the first lifespan lane (laneX(0) = LABEL_W + 7 = 91), so the rules reach as far right as
		   they can without running under the bars. */
		--tick-x: -12px;
		--tick-long: 88px;
		--tick-short: 58px;
		/* ── ABOVE THE FIELD AND THE VEIL, BEHIND THE STAGE — AND NEVER CONDITIONALLY ────────────────
		   1, not 0, and the change is one number with a long reason.
		   THE DOCTRINE IS UNCHANGED: the cards and rows own the foreground unconditionally, and where
		   the stage reaches the rail the stage still wins — `.page-container` is also z 1 and comes
		   LATER in the document, so source order settles it exactly as before (design §29.9).
		   WHAT CHANGES IS THE VEIL. `.ascend-veil` is z 0 and is mounted AFTER this component, so at
		   z 0 the rail lost its entire column to an opaque midnight ground the moment the Ascension
		   opened. The rail was only ever visible in the zone because `.rail.ascended` lifted it to 1 —
		   a CONDITIONAL depth, tied to whether an orbit card happened to be featured. So the instant a
		   CC or the X changed the featured person, the lift went and the rail spent the rest of the
		   exit underneath the ground, blank. Sam: "there's no reason for the timeline to ever be
		   hidden."
		   A constant is the fix, not a better-timed lift. Both previous attempts tried to hold the lift
		   longer; the bug is that a ruler's depth was ever a function of the card. It is glass bolted to
		   the window frame — the exhibit changes behind it, and it does not move. */
		z-index: 1;
		pointer-events: none;
		/* NOTHING ON THE RAIL IS TEXT TO BE READ OFF AND COPIED — it is an instrument. Both properties
		   INHERIT, so one declaration here covers the bars, their vertical labels, both kinds of tooltip
		   and the year ticks; `.anchor` restates `cursor: pointer` for the one thing that is clickable.
		   The cursor rule is what Sam actually saw: `.bar-label` is `writing-mode: vertical-rl`, and the
		   text I-beam rotates with the writing mode, so hovering a name produced a SIDEWAYS caret. */
		cursor: default;
		user-select: none;
		-webkit-user-select: none;
		font-family: var(--font-inter, sans-serif);
		/* THE GROUND — pale yellow-green, replacing the saturated green Sam said was "looking way too much
		   like a football field". An instrument at the edge of the stage should be read, not looked at.

		       0px    #dde090   hard against the window edge
		       61px   #e4e794   between
		       122px  #ebee99   the light end, where the ground vanishes

		   Both outer anchors are Sam's. The range is deliberately NARROW (L 72 to 77) — a wide ramp is
		   what made the green read as a graphic rather than as paper.

		   LIGHTER MEANS A LIGHTER SHADE, NOT LESS OPACITY (Sam): thinning alpha over warm parchment drags
		   the hue toward the ground and it goes muddy-yellow. Raise L; do not thin paint.

		   THE RIGHT EDGE, AND THE TRADE IT COSTS. The curve is (1 − smoothstep(t^1.5))^2.2, chosen by
		   measuring candidates rather than by eye. Against the previous (1 − smoothstep(t^1.25)) it holds
		   the left plateau almost exactly — 0.908 against 0.917 at a quarter across, and Sam's note was
		   that "left side on edge of browser is good" — while dropping the tail TENFOLD: 0.089 → 0.009 at
		   85% of the span. That is what stops the right edge from being locatable.
		   It is not free. Total alpha travel is fixed at 1 → 0, so a flatter tail over a NARROWER span
		   has to be paid for in the middle: peak slope goes 0.0122 → 0.0175 per pixel. That is still
		   below the 0.021 that produced the visible line Sam objected to earlier, which is the budget
		   this was chosen against. If the middle ever starts reading as a band, the fix is to widen the
		   span again rather than to flatten the tail further.

		   36 stops, ~3.5px apart — every stop is a kink, and a kink reads as a line. Generated: change
		   the span, anchors or exponents and re-run rather than editing stops by hand. */
		/* THE GROUND ITSELF IS ON ::before — see below. */
	}
	/* THE PARCHMENT GRAIN, over the gold. Sam: "the background color and fade of gold timeline background
	   looking a little like a pee stain... can you add the texture of the background you added to the
	   entire background in the Parchment background?" A flat wash of any colour reads as a stain; the same
	   speckle that makes the Parchment ground read as paper makes this read as paper too.
	   IT IS THE SAME feTurbulence RECIPE as .field.parchment — same 220px stitched tile, same
	   baseFrequency 0.8, same 0.33 grain amount — with ONE change: the colour matrix's intercept is 0.335
	   on all three channels instead of parchment's (0.7565, 0.7369, 0.6231). That makes the tile NEUTRAL
	   GREY centred on 0.5 rather than cream-coloured, so with `overlay` it lightens and darkens whatever
	   is beneath by the same amount the parchment grain does, instead of repainting the rail cream.
	   Masked with the gold's own ramp so the speckle dies exactly where the colour does — otherwise the
	   grain would carry on across bare paper that already has a grain of its own. */
	.rail::before {
		content: '';
		position: absolute;
		/* 12px PAST THE RAIL'S RIGHT EDGE (122 → 134, Sam's 10%). The stretch has to be paid for in the
		   BOX as well as in the stops: a 134px gradient inside a 122px element is simply cut off at 122,
		   which is the one thing this change must not produce — "don't make any hard fade lines or
		   vertical stripes". `.rail` sets no overflow, so the ground can run past it. Nothing else moves;
		   RAIL_W still governs where the ticks, labels, bars and portraits live. */
		/* Still 12px past the rail's right edge, Sam's 10% overhang — RAIL_W absorbed the 48 the ramp
		   travelled (122+48=170), so the box is 182 and the ramp still ends exactly on it. */
		inset: 0 -12px 0 0;
		z-index: 0;
		pointer-events: none;
		/* BOTH BLEND INPUTS ARE OPAQUE, and that is the entire trick. The grain went through three failed
		   shapes before this one, all for the same underlying reason, so it is worth stating plainly:
		     1. grey tile + `mix-blend-mode: overlay` over the rail's gradient — measured a −23-level grey
		        HAZE. `.rail` is a stacking context, so overlay blended against the rail's own background and
		        nothing behind it, and that background is semi-transparent for most of its width. Blending
		        against a partly-absent backdrop composites the source colour straight in.
		     2. a tighter mask on the same thing — no help, because the mask was never the cause.
		     3. a cream alpha-speckle, which cannot haze but measured invisible (stdev 0.50 → 0.66): cream and
		        gold differ by nine levels of red, so there was nothing to modulate.
		   The fix is to stop blending against the page at all. The gold gradient and the grain are BOTH
		   background layers of this pseudo-element, both fully opaque, blended with `background-blend-mode`
		   — a self-contained operation with a real backdrop, so overlay behaves the way overlay is supposed
		   to, lightening and darkening by equal amounts. The fade is applied AFTERWARDS, as a mask over the
		   composited result, which is why the colour stops below carry no alpha of their own.
		   THE TILE IS Parchment's, unchanged in every parameter that matters: 220px stitched, fractalNoise,
		   baseFrequency 0.8, numOctaves 3, grain amount 0.33. Only the colour-matrix intercept differs —
		   the tile is neutral grey centred on 0.5, so `overlay` treats it as pure light/dark modulation of
		   the gold rather than repainting the rail cream.
		   THE AMPLITUDE IS 1.5, NOT Parchment's 0.33, and the two produce the SAME grain. Parchment ADDS
		   its noise straight into the colour, so its output sigma is 0.33 x noise. `overlay` on a light
		   base does not add — its slope there is 2(1 − base), about 0.22 at the gold's luminance — so the
		   same 0.33 arrives as roughly a seventh of the grain and measured a near-flat 1.75.
		   PARCHMENT PARITY WOULD BE 1.5 — 0.33 divided by that 0.22 — and it measured sigma 7.8 against
		   Parchment's ~7, which is right for a full-page ground and too much for a 122px strip: Sam,
		   "the speckle is too strong, it's a small space and is distracting, turn the dial down by 25%."
		   So 1.125, landing near sigma 5.9. THE INTERCEPT MOVES WITH THE SLOPE — it is whatever keeps the
		   tile averaging 0.5 (1.125 x 0.5 − 0.0625 = 0.5), because 0.5 is what makes `overlay` neutral.
		   Change one without the other and the rail lightens or darkens instead of just getting grainier.
		   Change the ground's lightness much and the slope needs recomputing too, since the compression
		   depends on the base it lands on. */
		background-image:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g' x='0' y='0' width='100%25' height='100%25' color-interpolation-filters='sRGB'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch' result='t'/%3E%3CfeComponentTransfer in='t' result='o'%3E%3CfeFuncA type='linear' slope='0' intercept='1'/%3E%3C/feComponentTransfer%3E%3CfeColorMatrix in='o' type='saturate' values='0' result='s'/%3E%3CfeColorMatrix in='s' type='matrix' values='1.125 0 0 0 -0.0625 1.125 0 0 0 -0.0625 1.125 0 0 0 -0.0625 0 0 0 0 1'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E"),
			linear-gradient(
				to right,
				rgb(226, 217, 152) 48px,
				rgb(226, 217, 152) 51px,
				rgb(227, 218, 153) 56px,
				rgb(227, 218, 153) 59px,
				rgb(227, 218, 153) 63px,
				rgb(228, 219, 154) 67px,
				rgb(228, 219, 154) 71px,
				rgb(228, 219, 155) 74px,
				rgb(229, 220, 155) 79px,
				rgb(229, 220, 155) 82px,
				rgb(229, 220, 156) 86px,
				rgb(230, 221, 156) 90px,
				rgb(230, 221, 156) 94px,
				rgb(230, 221, 157) 97px,
				rgb(231, 222, 157) 102px,
				rgb(231, 222, 158) 105px,
				rgb(232, 223, 158) 110px,
				rgb(232, 223, 158) 113px,
				rgb(232, 223, 159) 117px,
				rgb(232, 223, 159) 120px,
				rgb(233, 224, 159) 125px,
				rgb(233, 224, 160) 128px,
				rgb(234, 225, 160) 133px,
				rgb(234, 225, 161) 136px,
				rgb(234, 225, 161) 140px,
				rgb(235, 226, 161) 144px,
				rgb(235, 226, 162) 148px,
				rgb(235, 226, 162) 151px,
				rgb(236, 227, 162) 156px,
				rgb(236, 227, 163) 159px,
				rgb(236, 227, 163) 163px,
				rgb(237, 228, 164) 167px,
				rgb(237, 228, 164) 171px,
				rgb(237, 228, 164) 174px,
				rgb(238, 229, 165) 179px,
				rgb(238, 229, 165) 182px
			);
		/* The gold returns with everything else, and not before. */
		transition: opacity var(--night-ms) cubic-bezier(0.33, 1, 0.68, 1) var(--night-out);
		background-blend-mode: overlay, normal;
		background-repeat: repeat, no-repeat;
		background-size: 220px 220px, 100% 100%;
		/* The fade, sampled from the same (1 − smoothstep(t^1.5))^2.2 curve at the same 36 positions the
		   colour stops use — so ground and grain vanish together, on one curve, with no second edge. */
		-webkit-mask-image: linear-gradient(
			to right,
			rgba(0, 0, 0, 1.000) 48px,
			rgba(0, 0, 0, 1.000) 51px,
			rgba(0, 0, 0, 0.999) 56px,
			rgba(0, 0, 0, 0.996) 59px,
			rgba(0, 0, 0, 0.990) 63px,
			rgba(0, 0, 0, 0.983) 67px,
			rgba(0, 0, 0, 0.968) 71px,
			rgba(0, 0, 0, 0.953) 74px,
			rgba(0, 0, 0, 0.928) 79px,
			rgba(0, 0, 0, 0.904) 82px,
			rgba(0, 0, 0, 0.865) 86px,
			rgba(0, 0, 0, 0.832) 90px,
			rgba(0, 0, 0, 0.782) 94px,
			rgba(0, 0, 0, 0.740) 97px,
			rgba(0, 0, 0, 0.679) 102px,
			rgba(0, 0, 0, 0.630) 105px,
			rgba(0, 0, 0, 0.563) 110px,
			rgba(0, 0, 0, 0.511) 113px,
			rgba(0, 0, 0, 0.441) 117px,
			rgba(0, 0, 0, 0.389) 120px,
			rgba(0, 0, 0, 0.322) 125px,
			rgba(0, 0, 0, 0.274) 128px,
			rgba(0, 0, 0, 0.216) 133px,
			rgba(0, 0, 0, 0.176) 136px,
			rgba(0, 0, 0, 0.129) 140px,
			rgba(0, 0, 0, 0.099) 144px,
			rgba(0, 0, 0, 0.066) 148px,
			rgba(0, 0, 0, 0.046) 151px,
			rgba(0, 0, 0, 0.026) 156px,
			rgba(0, 0, 0, 0.016) 159px,
			rgba(0, 0, 0, 0.007) 163px,
			rgba(0, 0, 0, 0.003) 167px,
			rgba(0, 0, 0, 0.001) 171px,
			rgba(0, 0, 0, 0.000) 174px,
			rgba(0, 0, 0, 0.000) 179px,
			rgba(0, 0, 0, 0.000) 182px
		);
		mask-image: linear-gradient(
			to right,
			rgba(0, 0, 0, 1.000) 48px,
			rgba(0, 0, 0, 1.000) 51px,
			rgba(0, 0, 0, 0.999) 56px,
			rgba(0, 0, 0, 0.996) 59px,
			rgba(0, 0, 0, 0.990) 63px,
			rgba(0, 0, 0, 0.983) 67px,
			rgba(0, 0, 0, 0.968) 71px,
			rgba(0, 0, 0, 0.953) 74px,
			rgba(0, 0, 0, 0.928) 79px,
			rgba(0, 0, 0, 0.904) 82px,
			rgba(0, 0, 0, 0.865) 86px,
			rgba(0, 0, 0, 0.832) 90px,
			rgba(0, 0, 0, 0.782) 94px,
			rgba(0, 0, 0, 0.740) 97px,
			rgba(0, 0, 0, 0.679) 102px,
			rgba(0, 0, 0, 0.630) 105px,
			rgba(0, 0, 0, 0.563) 110px,
			rgba(0, 0, 0, 0.511) 113px,
			rgba(0, 0, 0, 0.441) 117px,
			rgba(0, 0, 0, 0.389) 120px,
			rgba(0, 0, 0, 0.322) 125px,
			rgba(0, 0, 0, 0.274) 128px,
			rgba(0, 0, 0, 0.216) 133px,
			rgba(0, 0, 0, 0.176) 136px,
			rgba(0, 0, 0, 0.129) 140px,
			rgba(0, 0, 0, 0.099) 144px,
			rgba(0, 0, 0, 0.066) 148px,
			rgba(0, 0, 0, 0.046) 151px,
			rgba(0, 0, 0, 0.026) 156px,
			rgba(0, 0, 0, 0.016) 159px,
			rgba(0, 0, 0, 0.007) 163px,
			rgba(0, 0, 0, 0.003) 167px,
			rgba(0, 0, 0, 0.001) 171px,
			rgba(0, 0, 0, 0.000) 174px,
			rgba(0, 0, 0, 0.000) 179px,
			rgba(0, 0, 0, 0.000) 182px
		);
	}
	/* 3 clears the flying hero (2) and the deck ghosts (1). Set only while a CC flight is running — see
	   RAIL_OVER_FLIGHT for why this cannot be the resting z-index. */
	.rail.over-flight {
		z-index: 3;
	}

	/* A TICK CROSSES BOTH GROUNDS — pine on the left, bare parchment on the right — so one colour cannot
	   serve it. A cream line vanishes the moment it leaves the pine; a dark line vanishes the moment it
	   enters it. So the rule carries the same handover the background does: cream where it is over pine,
	   the old warm grey where it is over paper. Drawn as a background rather than a border-top, because
	   a border cannot hold a gradient. */
	/* FULL-STRENGTH CREAM ON EVERY TIER (Sam: "make the ticks the same cream-primary color at 100%
	   opacity"). The old 20/28/40% ladder was doing the same job the LENGTHS already do — saying which
	   tier a rule belongs to — and saying it twice made the faint ones disappear into the green. */
	/* DARK INK, NOT CREAM — forced by the ground going pale. Cream on #dde090 measures 1.23:1, which is
	   nothing; this olive comes from the ground's own hue family (H 66) and measures 5.0:1, comfortable
	   at 9px. Third time this pairing has had to move together: ink and ground are ONE decision, and
	   changing either alone has cost legibility every time. */
	/* ── THE RAIL UNDER THE ASCENSION (roadmap §40) ────────────────────────────────────────────────
	   Sam: "the midnight blue background will basically make the headshots not visible, but the years
	   and horizontal year bars will be visible in a cream color, and the vertical bars will still be
	   visible, just a different color so they stand out."

	   THE RAIL RESTYLES ITSELF; IT IS NOT COVERED — and the difference is not pedantry. To hide the
	   portraits by painting over them, the veil would have to sit ABOVE the rail; to leave the years
	   legible it would have to sit BELOW them. Those are the same layer, so no stacking order satisfies
	   both and any attempt lands in §18.6's stacking-context trap with a fourth participant. Owning its
	   own dark palette costs one class and cannot be got wrong that way. Same result, and it keeps the
	   rail the only thing that decides how the rail looks (design §25.3 — a render switch, never a
	   data edit).

	   The GROUND goes first: `.rail::before` is the warm paper strip, and against midnight it is the one
	   element that reads as a mistake rather than as a dark version of itself. */
	/* AND IT HAS TO OUTRANK THE VEIL, or none of the palette below is ever seen. Both sit at z 0 and the
	   veil is later in the DOM, so source order gave it the rail's whole column — the years, the ticks and
	   the bars all vanished under it, which is the §18.6 stacking-context family arriving on schedule with
	   a fourth participant, exactly where this feature's spec predicted it would.
	   z 1 puts the rail over the veil and still UNDER `.page-container` (also z 1, but later in the DOM),
	   so the card stays in front of the rail exactly as it does at rest. */
	/* The rail keeps the room's company: while a founder is featured its bars take the founder's blue,
	   the same one the card and the chips are wearing. Sam asked for the change "inside the card
	   including the stripe"; extending it here is a judgement — a navy rail against a green ground with
	   a blue card would be the only thing in the zone still speaking the ascension's palette. */
	.rail.founder {
		--zone-rule: var(--color-founderblue);
	}
	.rail.ascended::before {
		opacity: 0;
		transition: opacity var(--move-ms, 420ms) cubic-bezier(0.33, 1, 0.68, 1) 0ms;
	}
	/* THE PORTRAITS GO, and by opacity rather than `display: none` — they have to be able to come BACK
	   on the same clock when the user descends, and a display swap cannot be tweened. Inert while gone,
	   so a pointer over a face in the dark finds nothing. */
	.rail.ascended .anchor {
		opacity: 0;
		pointer-events: none;
		/* NO DELAY GOING IN — the entrance is the part Sam has called finished, and the explicit 0ms is
		   what keeps it that way: `--night-out` is set on `.rail` and would otherwise cascade in here
		   and delay the darkening too. Same for the three rules below. */
		transition:
			z-index 0s linear 160ms,
			opacity var(--move-ms, 420ms) cubic-bezier(0.33, 1, 0.68, 1) 0ms;
	}
	/* CREAM — #f7f1e6, the house's own Manuscript ground colour, so the zone borrows a palette that
	   already exists rather than inventing a light. Ticks and year labels both, since Sam named "the
	   years and horizontal year bars" as one thing. */
	.rail.ascended .tick,
	.rail.ascended .tick-year {
		color: #f7f1e6;
		border-color: #f7f1e6;
		background-color: #f7f1e6;
		opacity: 0.82;
		transition:
			color var(--move-ms, 420ms) ease-out 0ms,
			background-color var(--move-ms, 420ms) ease-out 0ms,
			opacity var(--move-ms, 420ms) ease-out 0ms;
	}
	.rail.ascended .tick-year {
		background-color: transparent; /* a label is ink, not a rule — undo the bar treatment above */
	}
	/* THE BARS STAND OUT rather than blending: the lane fill is what carries a bar's identity, and on a
	   dark ground the pale papers all collapse toward one another. Lifting the fill's own colour toward
	   the cream keeps the three hues distinguishable while making every bar read as lit from within,
	   which is the "still visible, just a different color so they stand out" Sam asked for. Applied as a
	   filter so NO lane's hue is restated here — the three-hue system in LANE_STYLE stays the one
	   definition, and a fourth lane added later inherits this for free. */
	/* ── THE BARS TAKE THE ORBIT CARD'S PAPER ───────────────────────────────────────────────────────
	   Sam: "when we are in the ascension zone and the orbit is the featured card, change the vertical
	   bars too — same background colour as the waxy orbit card, with a thin stripe around the bar."
	   So the rail stops shading by LANE in here and says the one thing that is true of everybody on it:
	   these are the people the tree only reaches by cross-connection. Card, chips and bars end up on one
	   surface, which is what makes the zone read as a place rather than as a recoloured stage.

	   THE LANE HUES ARE NOT LOST, THEY ARE SUSPENDED. `--bar-bg` and `--bar-bd` are still written inline
	   from LANE_STYLE on every bar; this only overrides what is PAINTED while the zone is open, so
	   descending puts every bar back on its own hue with nothing to restore. Same idea as §25.3 — a
	   render switch, never a data edit.

	   1px, NOT 2.2. The card's rule is 2.2px on a 925px card; a bar is 23px wide, so the same treatment
	   at the same weight would be most of the bar. This is the chip's lesson again (design §33.2): small
	   objects need relatively heavier detail than a strict scaling gives, but a rule that eats its own
	   object has stopped being a rule. 1px against 23 is proportionally close to 2.2 against 925 with a
	   little added back for legibility.

	   The filter is gone: it existed to keep three pale lane fills apart on a dark ground, and with one
	   shared surface there is nothing left for it to separate. */
	.rail.ascended .bar::before {
		background: var(--color-orbitwax);
		/* THE RULE MOVES INBOARD, so a hairline of the bar's own surface shows outside it — the card's
		   arrangement at bar scale (Sam: "move the stripe toward the middle by 1.5px to leave a white
		   external stripe around the navy border"). The BORDER becomes wax and the navy is carried by an
		   inset shadow starting at 1.5px, which is the only way to get a margin outside a line on an
		   element whose outer edge is already spoken for by the mask.
		   The drop shadow is restated last: box-shadow is one property, and the base rule above sets one
		   — a lesson this session already paid for on the orbit chip. */
		border-color: var(--color-orbitwax);
		box-shadow:
			inset 0 0 0 0.9px var(--color-orbitwax),
			inset 0 0 0 1.9px color-mix(in oklab, var(--zone-rule, var(--color-inkblue)) 55%, transparent),
			0 1px 3px rgb(40 30 20 / 0.28);
		transition:
			background var(--move-ms, 420ms) ease-out 0ms,
			border-color var(--move-ms, 420ms) ease-out 0ms,
			box-shadow var(--move-ms, 420ms) ease-out 0ms;
	}
	/* NO SHADOW ON THE NAME (Sam). It was there to hold ink off a saturated lane fill on a dark ground;
	   the bars are wax now, so it is a shadow cast onto paper by nothing — and at 13px it only thickens
	   the letterforms. The rail's own note on the resting bars says the same thing about the lanes: once
	   every fill is pale with dark ink of its own, a shadow just muddies it. */
	.rail.ascended .bar-label {
		text-shadow: none;
	}

	/* ── DAY↔NIGHT: THE RETURN WAITS FOR THE ROOM, AND CSS ALONE KNOWS WHICH WAY WE ARE GOING ───────
	   Two facts do all the work here and neither needs a line of JavaScript.

	   ONE. A transition belongs to the rule being transitioned TO. Declared on `.rail.ascended` it only
	   ever describes ARRIVING at night — remove the class and there is no transition property left, so
	   the rail snapped back to daylight ink in a single frame. Declared on the BASE rule it describes
	   the return, which is the half that was missing.

	   TWO. That same asymmetry gives the delay for free. `--night-out` is set here, on the base rule, so
	   it applies ONLY on the way back to day; the ascended rules restate the same transitions with a
	   zero delay, so entering is unchanged. One property, two directions, no state and no timer.

	   THE TWO NUMBERS ARE THE VEIL'S OWN SCHEDULE, MIRRORED. Ascension.svelte holds the dark for
	   DARK_HOLD_MS (420) and then fades it over round(ASCEND_MS × 0.9) (594); traced end-to-end, both
	   exit routes — a CC off the orbit card and the X — measured identically: still solid at 490ms,
	   0.5 at ~655, gone by ~1066.

	   SO THE INK MOVES *WITH* THE ROOM, NOT AFTER IT. The first version waited out the whole 1014ms
	   before starting, and that was wrong for a reason only the film showed: the room does not go light
	   at an instant, it lightens across 594ms, and cream ink held over that whole ramp ends up pale-on-
	   pale for the last third of it — technically visible, practically washed out. Matching the delay to
	   when the veil BEGINS to lift, and the duration to how long it takes, means ground and ink cross
	   over together and neither is ever hunting for contrast against the other. That is what a dawn
	   actually is, and it is the reverse of the entrance Sam already likes.

	   THE FIRST 420ms ARE DELIBERATE AND UNCHANGED: full cream on full midnight, which is the beat the
	   departing card is crossing the reader. The rail is at its most legible exactly when the stage is
	   at its busiest.
	   IF DARK_HOLD_MS OR ASCEND_MS MOVE, MOVE THESE — a mirror, like ANCHOR_BAR_MS's to flight.ts. */
	.rail {
		--night-out: 420ms; /* = DARK_HOLD_MS — the moment the veil starts to lift */
		--night-ms: 594ms; /* = round(ASCEND_MS × 0.9) — how long it takes to go */
		/* ── THE INK TURNS OVER A BEAT AHEAD OF THE ROOM ────────────────────────────────────────────
		   Sam, after seeing the above land: "the white ink year text and horizontal lines last a beat
		   too long — those are white while the light background is settled, so they are virtually
		   invisible."
		   He is describing the tail of an ease-out. The GROUND and the PORTRAITS can finish with the
		   room, because both of them are surfaces: a surface that arrives late simply arrives. INK
		   cannot — cream ink is defined entirely by the dark behind it, so the instant the ground has
		   more light than dark in it, ink that has not yet turned is not "late", it is GONE. The two
		   things want different clocks for a real reason, not a tuning preference.
		   Starting 120ms sooner and running 114ms shorter puts the ink home at ~780ms against the
		   room's ~1014 — turned over while there is still dark to turn against. Its own two variables
		   so it can be tuned without touching the ground's mirror of the veil's schedule. */
		--ink-out: 300ms;
		--ink-ms: 480ms;
	}
	.tick {
		position: absolute;
		transition:
			background-color var(--ink-ms) ease-out var(--ink-out),
			opacity var(--ink-ms) ease-out var(--ink-out);
		/* A PILL, not a hairline (Sam: "more pill like... a couple of px thicker and add rounded ends").
		   1 -> 3 is the smallest step that can carry a radius at all: a rounded end needs height to be
		   round IN, and at 2px the cap is a single pixel of antialiasing that reads as a blur rather
		   than as a shape. The radius is deliberately larger than any possible half-height, so the cap
		   is always a true semicircle and stays one if the height is ever tuned again.
		   THICKNESS IS NOW THE TIER — see the three rules below. This is only the fallback. */
		height: 3px;
		border-radius: 999px;
		background: var(--color-rail-ink, #595e26);
	}
	/* FLUSH TO THE WINDOW EDGE. The short rules used to begin at 28px, which read as a margin the
	   instrument did not intend. They can start at 0 because they never share a row with a year — a year
	   is drawn only on a half-century, and these are the rows in between. */
	/* A 2-YEAR TIER WAS BUILT AND REMOVED — 178 marks at ~4px apart, which read as a hatched band rather
	   than as a scale and pulled the eye straight back to the rail. Two tiers is where this settled:
	   ten stubs between each pair of numbered rules, and nothing finer.
	   The 5px inset it introduced was kept, and moved to the decade stubs — Sam: "move the ten year ticks
	   off the exact left edge of browser by 5px". Flush against the window read as an accident of
	   clipping; a small margin reads as a decision. */
	/* THE MINOR TIERS. Both keep the decade stub's 32.9 — "14 -> 17.5 -> 21.9 -> 32.9, the last being
	   +50% (Sam)", chosen so they run PAST the anchor portraits at x 4-23 and the scale stays readable
	   straight through a headshot. Sam specified the new tiers by THICKNESS alone, so length is the one
	   thing that does not change between them.
	   The three thicknesses are one ladder and are written as arithmetic on purpose: 3.6 for the 50,
	   "1px thinner" for the 25, "0.5px thinner than the 25" for the 12.5. Change the top and the other
	   two follow. */
	/* THE 25 NOW MATCHES THE 50's LENGTH (Sam: "keep 25 year marker lines same width at 50 years"), so
	   the two long marks make one column and the ONLY thing separating them is weight and the year. */
	.tick.quarter {
		left: var(--tick-x);
		width: calc(var(--tick-long) - var(--tick-x));
		height: 2.2px; /* was 2.86 — the whole set thinned with .half, so the tier order holds */
	}
	/* AND THE 12.5 IS THE ONLY TIER THAT SAYS ITS RANK IN LENGTH — "20% less wide horizontally", the one
	   place Sam qualified the axis. With the two long marks now equal, the short mark is what gives the
	   scale its rhythm: long, short, long, short, and every second long one carries a number. */
	.tick.eighth {
		left: var(--tick-x);
		width: calc(var(--tick-short) - var(--tick-x));
		height: 1.6px; /* was 2.1 — thinned in step with the other two */
	}
	/* The half-century rule is the one that shares its row with a year, so it alone is inset — and now
	   SHORTER, ending at 84px rather than running the full width of the instrument. Staying inside the
	   solid part of the ground is also what lets it be cream: past ~100px it would be drawing pale ink
	   on pale parchment and simply vanish, which is why this rule used to need a gradient handover and
	   no longer does. */
	/* FLUSH WITH THE DECADE STUBS, both starting at 5. The inset this rule used to carry existed only
	   to clear the digits sitting to its left; with the year moved to the far side there is nothing to
	   clear, and Sam's "meet the other horizontal bars" is simply the two tiers sharing a left edge.
	   38 against the stubs' 32.9 — a little LONGER, because the half-century is the major tier and the
	   two rules now sit in one column where length is the only thing distinguishing them. */
	.tick.half {
		left: var(--tick-x);
		width: calc(var(--tick-long) - var(--tick-x));
		/* +20%, then +15% again (Sam): 3 -> 3.6 -> 4.14. THICKNESS IS THE ONLY LEVER ON "make rounded
		   ends more pronounced" — the radius is already 999px, so each cap is a true semicircle and
		   cannot be made rounder; what it CAN be is bigger, and a cap's radius is half the thickness.
		   3.6 gave a 1.8px cap, 4.14 gives 2.07. If Sam wants them rounder still, this is the number.
		   NOTE THE AXIS: "wider" here is thickness, not length. Sam qualified exactly one of the four
		   instructions in this pass with "horizontally" (the 12.5s), which is what distinguishes them. */
		height: 2.9px;
	}
	.tick-year {
		position: absolute;
		/* A label is ink, so it is `color` that travels. */
		transition:
			color var(--ink-ms) ease-out var(--ink-out),
			opacity var(--ink-ms) ease-out var(--ink-out);
		/* POSITIVE NOW, and measured from the rule's own left edge, because the label is a CHILD of the
		   rule: the rule sits at 5 and runs 38, so 46 here puts the year's left edge at an absolute 51,
		   an 8px gap past the end of the pill. The label is LEFT-aligned — the gap to the rule is the
		   thing that must stay constant, and with the year on this side it is the leading edge that
		   defines it. These three numbers — .tick.half's left, its width, and this — are ONE measurement
		   and move together; LABEL_W is the fourth, since the lanes have to start past all of it.
		   46 -> 48.3 -> 45.9: Sam's +5%, then −5% back off it a moment later. Note the two do NOT cancel
		   — 5% of 48.3 is more than 5% of 46 — so this sits slightly LEFT of where it started, which is
		   what he asked for and is why the arithmetic is spelled out rather than reverted.
		   Deliberately NOT the +15% the rule itself took: the rule grew in thickness, not in length, so
		   the gap is the only thing this moves. */
		left: var(--tick-x);
		/* +2px past the rule's end, which is what makes the digits LOOK flush with it: a numeral
		   carries right side bearing inside its advance width, so a box aligned exactly to 88 renders
		   the ink a pixel or two short. Sam: "put the years at the far right end of the lines, you
		   have it left a bit." */
		width: calc(var(--tick-long) - var(--tick-x) + 2px);
		text-align: right;
		/* CENTRED ON THE RULE (Sam: "center align the year text to the center of the horizontal 50 year
		   lines"). Bottom-aligning was the previous pass and it sat the digits ON the line, which put
		   their whole mass above it.
		   WHAT IS CENTRED IS THE DIGITS, NOT THE BOX — and that distinction is the reason the FIRST
		   attempt at centring (a hand-guessed `top: -7px`) looked wrong. A line box carries ascender
		   room above and descender room below that four numerals never occupy, so centring the box
		   leaves the digits visibly high. `line-height: 1` collapses the box to the em, and the residual
		   offset is corrected below — measured against the rendered glyph bounds rather than guessed. */
		top: 50%;
		/* −2.15px, MEASURED, not guessed: with line-height 1 the box's midline sits 2.15px above where
		   the ink's does, because the box bottom is the baseline and the digits rise 10.77px above it
		   while dropping only 0.22 below. Re-measure this if the size or the face changes — it is a
		   property of Fraunces' digits at this size, not a constant. (Probe: compare a .tick-year's
		   canvas actualBoundingBoxAscent/Descent midpoint against its rule's midpoint.) */
		transform: translateY(calc(-100% + var(--year-optical, -5px)));
		line-height: 1;
		/* +25% (Sam), then +20% again (Sam): 9 -> 11.25 -> 13.5. The rail is read at a glance from the
		   corner of the eye, and each step was Sam saying it was still asking too much of one. */
		font-size: 13px;
		/* FRAUNCES 500, Sam's pick, and the one place in the app that uses it. The rail's other type is
		   Inter; a high-contrast serif says the years are a SCALE rather than more labelling. 500 is a
		   real weight here because the variable face is imported — it replaces the 600 the years used to
		   carry, which existed to stop 11px Inter from reading thin and is not needed by a serif at 13.5. */
		font-family: var(--font-outfit, Outfit, system-ui, sans-serif);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		/* ONE CREAM FOR EVERY YEAR (Sam: "you don't need to rotate lighter and darker year text, they can
		   all be the same cream color as 1700"). The alternating 62%/100% pair read as two kinds of
		   label when they are one kind at two intervals — the RULE beside each already says which is
		   which, and saying it twice in two channels made the column busy. They sit inside the solid part
		   of the ground, so a flat colour is right here. */
		color: var(--color-rail-ink, #595e26);
	}
	/* "2000" ALONE MOVES LEFT (Sam), and it is the only label that needs to: measured at the rendered
	   ink rather than the box, every other year ends between 83.8 and 88.2, while 2000 runs to 91.3 —
	   0.3px INTO lane 0's bar, which begins at 91. Three round glyphs and a 2 is simply the widest
	   four-digit combination the scale can produce.
	   THE UNDERLYING CAUSE IS THAT `font-variant-numeric: tabular-nums` IS NOT TAKING on this face —
	   the widths above should all be equal and they span 32.9 to 40.4, so Fraunces Variable's wght axis
	   is shipping without a tnum feature. Flagged rather than fixed: making the column truly tabular is
	   a different change from nudging one label, and it would move all nine. */
	/* THE MILLENNIUM'S OWN `left` IS GONE (083026). It was 43.6px — a nudge measured against the OLD
	   label column, when each year was positioned individually to the right of its rule. The years
	   now share the rule's box and right-align into it, so an absolute left here did not nudge 2000,
	   it moved it out of the shared box entirely and pushed it right of every other year. Sam saw it
	   immediately. Nothing replaces it: 2000 is a year like any other now. */
	/* A CENTURY NO LONGER LOOKS DIFFERENT, and the ruleset that made it so is gone (083026).
	   IT SET font-size 15.59 against every other year's 13. Sam: "all the same size. no reason to have
	   1750 be smaller than 1700." He is right — the RULE beside each year already says which interval
	   it is, and saying it a second time in type size made the column read as two kinds of label when
	   it is one kind at two intervals. That is the same argument that flattened their COLOUR a pass
	   earlier, so this is the second channel to go rather than a new decision.

	   THE FONT-WEIGHT NOTE, PRESERVED because it is a live trap and not history: this ruleset must never
	   restate font-weight. It used to set 500, which — being later in source order — quietly undid the
	   600 on .tick-year above, so every century label stayed light while the rest went bold.

	   `class:century` STAYS ON THE SPAN. It is a true statement about the year, it costs nothing, and it
	   is the hook anything future would want. Nothing styles it today; the empty ruleset that said so
	   tripped svelte-check's no-empty-rulesets warning, so the reasoning lives here as prose instead. */

	/* The era marks sit at x=28, well inside the solid pine, so their old dark rust would have gone
	   invisible the moment the ground changed. Warmed and lightened to read against it. */

	/* THE LIFESPAN BAR. `top` and `height` are what animate — the bar slides down the scale and grows
	   or shrinks into the new life, which is the whole gesture Sam described. They move on the CARD's
	   clock (--move-ms), so the rail lands when the card lands. */
	.bar {
		position: absolute;
		/* THE LANE'S DEPTH ARRIVES AS A CUSTOM PROPERTY, not as an inline `z-index`. It was inline, and
		   an inline declaration beats any stylesheet rule — so `.bar:hover { z-index: 15 }` silently did
		   nothing and a hovered bar's tooltip still opened underneath its neighbours. Routed through a
		   variable, both values are ordinary rules and the hover one wins on source order. */
		z-index: var(--bar-z, 2);
		/* Bars opt back INTO the pointer — the rail is `pointer-events: none` so it can never steal a
		   click meant for the stage, so anything hoverable has to ask. */
		pointer-events: auto;
		/* It is an <a> now (see barLink), so the two link defaults have to go. */
		text-decoration: none;
		color: inherit;
		/* `left` is in the list now that a bar survives on IDENTITY rather than on position: the same
		   person can sit in a different lane on the next card, and without this the surviving element
		   would jump sideways in a single frame. (The comment lives above the rule, not inside the value
		   — Svelte's CSS parser rejects a comment between transition components, and `svelte-check`
		   reports it as clean while the real compile fails with "Expected a valid CSS identifier".) */
		transition:
			top var(--move-ms) var(--bar-ease, cubic-bezier(0.33, 1, 0.68, 1)),
			height var(--move-ms) var(--bar-ease, cubic-bezier(0.33, 1, 0.68, 1)),
			left var(--move-ms) var(--bar-ease, cubic-bezier(0.33, 1, 0.68, 1));
	}
	/* A HOVERED BAR LIFTS ABOVE ITS NEIGHBOURS. Bars stack at `2 + lane` and a tooltip is a CHILD, so
	   without this the lane-0 bar's label would open underneath the lane-1 and lane-2 bars sitting on
	   top of it. 15 clears every bar and stays below the portraits' 20. */
	.bar:hover {
		z-index: 15;
	}
	/* THE ONE PLACE ON THE RAIL THAT OVERRIDES `cursor: default`. Sam asked for the normal cursor across
	   the whole instrument when nothing on it was clickable and a rotated text I-beam was appearing over
	   the vertical labels. A bar that navigates is a different thing, and the pointer is the only signal
	   it is one — the I-beam that prompted that rule is still gone. The focus's own bar, and anyone
	   without a slug, keep the default cursor because they are not links. */
	.bar.linked {
		cursor: pointer;
	}
	/* THE BAR'S TOOLTIP — its own paper and its own edge, from the same LaneStyle that paints the bar,
	   so gold stays gold and mint stays mint. Sits to the RIGHT, vertically centred: a bar is tall and
	   narrow, the years live immediately to its left, and above would collide with whatever the bar's own
	   top edge is doing — a dissolving pre-scale end most of all. */
	.bar-tip {
		position: absolute;
		left: calc(100% + 7px);
		/* 50% is only the fallback for the frame between hover and the first pointer event — after that
		   --tip-y is the cursor's own height inside the bar (see trackBarTip). No transition on `top`:
		   parallel with the cursor means arriving in the same frame it does. */
		top: var(--tip-y, 50%);
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		padding: 4px 8px;
		width: max-content;
		border-radius: 5px;
		background: var(--bar-bg);
		border: 1px solid var(--bar-bd);
		box-shadow: 0 1px 4px rgba(40, 30, 20, 0.28);
		/* the bar sets vertical-rl for its own label; the tooltip reads flat */
		writing-mode: horizontal-tb;
		line-height: 1.2;
		text-align: center;
		pointer-events: none;
		opacity: 0;
		visibility: hidden;
		/* Same clock as a bar arriving — see barFadeMs. `visibility` is delayed out so the fade is
		   visible on the way in and the element stops existing for hit-testing on the way out. */
		transition:
			opacity var(--tip-ms, 95ms) ease-out,
			visibility 0s linear var(--tip-ms, 95ms);
	}
	.bar:hover .bar-tip {
		opacity: 1;
		visibility: visible;
		transition:
			opacity var(--tip-ms, 95ms) ease-out,
			visibility 0s;
	}
	.bar-tip-name {
		font-size: 11.5px;
		font-weight: 600;
	}
	.bar-tip-years {
		font-size: 10.5px;
		font-variant-numeric: tabular-nums;
		opacity: 0.75;
	}
	/* MATCHES THE YEARS EXACTLY — same size, same face, same weight (Sam: "as big as years above it,
	   it's a little small to read... in same font as years"). It was 9.5px on the theory that the age is
	   a footnote to the span above it; at that size it stopped being readable, which costs more than the
	   hierarchy was worth. */
	.bar-tip-age {
		font-size: 10.5px;
		font-variant-numeric: tabular-nums;
		opacity: 0.75;
	}
	/* The died-young note. Horizontal — the bar's own label is `vertical-rl`, but nothing on the bar
	   imposes that on its children, so this reads flat without undoing anything. Sits to the right and
	   centred on the stub, in a faded grey: it is a caption on the bar, not a second name, and it must not
	   compete with the bloodline gold beside it.
	   `pointer-events: none` so it cannot eat the hover that opens the tooltip — the note answers the
	   obvious question, the tooltip answers the rest. */
	.bar-dy {
		position: absolute;
		left: calc(100% + 5px);
		top: 50%;
		transform: translateY(-50%);
		white-space: nowrap;
		font-size: 9px;
		font-weight: 500;
		letter-spacing: 0.02em;
		color: rgba(78, 72, 64, 0.55);
		pointer-events: none;
		z-index: 1;
		transition: opacity 95ms ease-out;
	}
	/* THE TOOLTIP SUPERSEDES THE NOTE. Both open to the right of the bar, so hovering a stub printed
	   "died young" straight through the tooltip's paper — and the tooltip already says everything the
	   note does and more (the name, the years, the age). It stands down rather than fighting for the
	   space, on the same 95ms the tooltip arrives on. */
	.bar:hover .bar-dy {
		opacity: 0;
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
		/* The lane hue coming back from the orbit wax. box-shadow is in the list because the navy rule
		   rides on it. */
		transition:
			background var(--night-ms) ease-out var(--night-out),
			border-color var(--night-ms) ease-out var(--night-out),
			box-shadow var(--night-ms) ease-out var(--night-out);
		-webkit-mask-image: var(--bar-mask, none);
		mask-image: var(--bar-mask, none);
	}
	/* ── THE PYNCHON LINE'S SPECTRUM, ON A BAR ──────────────────────────────────────────────────────
	   The third surface to carry it, after the card (925x575) and the chip (220x75). NEITHER OF THEIR
	   CROPS TRANSFERS, because a bar is the opposite shape from both: ~23px wide and 77-400px tall.

	   `cover` — the card's — would scale the 900x600 source to the bar's HEIGHT and then crop away ~90%
	   of its width, leaving one narrow vertical column of whatever hue happened to sit there. That is the
	   stripe PersonBox's note says this effect must never be, arriving from the other direction.

	   ON `::before`, NOT ON `.bar`, and that is load-bearing rather than tidy. This pseudo-element exists
	   precisely so the dissolving-end MASK can soften the paper without touching the name (see the note
	   above). Putting the spectrum on the anchor instead would leave it un-masked, so a guessed birth or
	   death would dissolve the fill out from under a rainbow that stayed hard-edged — the bar would stop
	   being able to say "we are not sure" at exactly the ends where it must.

	   THE EDGE, IN THREE STATES — worth recording, because two of them were wrong for different reasons
	   and the third is not a compromise between them.

	     purple at 60%   the line's own colour, and it FENCED THE BAR IN. It also said the same thing the
	                     fill already said, twice.
	     none at all     right about the fencing, wrong about the ground. A spectrum is pale by
	                     construction — the veil is what keeps the name legible — so a borderless bar has
	                     nothing holding it off the parchment behind it, and it is the one lane whose fill
	                     cannot be darkened to compensate.
	     navy at 50%     CONTRAST WITHOUT CLAIM. It is `--color-inkblue`, the hero's own display-name
	                     colour, so the edge is the house's structural ink rather than a fourth statement
	                     about this line — the bar is held off the ground by the same navy that draws the
	                     name at the top of the card. Half alpha keeps it a containing edge rather than a
	                     drawn outline, and lets the spectrum through it.

	   REFERENCED, NOT RESTATED. `color-mix` against the token means this edge cannot drift from the name
	   it is matching — the same reason CARD_TOP_H is exported rather than copied. Restating it as a hex
	   would be a second definition of one colour, and this file has already paid for that once (see the
	   note on LANE_W vs BAR_W).

	   `--bar-bd` IS STILL SET INLINE ON A PRISM BAR, and must stay — `.bar-tip` reads it for the tooltip's
	   own edge, which is flat paper and wants the LANE's colour there, not this one.

	   THE VEIL IS THE DIAL, exactly as on the other two surfaces: higher = paler. It is the only number
	   to touch to change the strength. */
	.bar.prism::before {
		--prism-fade: 0.48;
		background-image:
			linear-gradient(
				rgba(255, 255, 255, var(--prism-fade)),
				rgba(255, 255, 255, var(--prism-fade))
			),
			url('/textures/prism-card.jpg');
		background-size:
			100% 100%,
			100% 100%;
		background-position: center, center;
		background-repeat: no-repeat, no-repeat;
		border: 1px solid color-mix(in oklab, var(--color-inkblue) 50%, transparent);
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
		/* Top-anchored rather than `inset: 0`, so an explicit height (set inline for a living person
		   outliving the estimate — see barFor) shortens the box from the BOTTOM and the name re-centres
		   upward. With `inset: 0` a height would have been ignored outright. */
		inset: 0 0 auto 0;
		height: 100%;
		z-index: 1; /* above the masked fill — the name never dissolves with the paper */
		display: flex;
		justify-content: center;
		writing-mode: vertical-rl;
		/* SIDEWAYS, NOT `mixed`. The default `mixed` rotates Latin LETTERS 90° but leaves punctuation
		   UPRIGHT — so in "I’lee" the four letters turned and the apostrophe did not, and an unrotated
		   U+2019 sitting in a rotated run reads as a horizontal dash: the rail said "I - lee".
		   `sideways` rotates every glyph together, punctuation included, so the apostrophe lies down
		   with its letters and reads as an apostrophe again. For a pure-Latin name the output is
		   identical — `mixed` was already rotating those letters — so this changes nothing on any bar
		   that has no punctuation in it, which is all but a handful. */
		text-orientation: sideways;
		transform: rotate(180deg);
		padding: 5px 0;
		overflow: hidden;
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.01em;
		white-space: nowrap;
		/* colour is per-lane, set inline on .bar and inherited — see LANE_STYLE. */
	}

	/* THE ANCHOR. A circle, and the only thing on the rail that takes a pointer — the rail itself is
	   `pointer-events: none` so it never steals a click meant for the stage, so this has to opt back in. */
	/**
	 * THE BUTTON IS THE HIT AREA AND NOTHING ELSE. It never scales, never moves, and carries no paint.
	 *
	 * IT USED TO BE BOTH, and that is a feedback loop: the element that DECIDES hover was the element
	 * that MOVES on hover. Anderson Cooper is the one anchor where it showed, because he sits against
	 * both the left and bottom edges, so anchorOrigin gives him `left bottom` — and with that origin the
	 * scaled circle's left and bottom edges stay exactly where the resting ones were. A cursor on either
	 * of those edges therefore lands on the boundary of the grown element: it scales up, the boundary
	 * arrives under the cursor, hover drops, it shrinks, hover returns. Sam: "I can hover on his edge and
	 * he'll flicker rapidly big and small... I cannot replicate this on any other headshot." Every
	 * other portrait grows about its centre, which walks its edges AWAY from the cursor and hides the
	 * bug rather than avoiding it.
	 *
	 * The paint moved to .anchor-vis, which is `pointer-events: none`, so no amount of scaling can change
	 * what is hoverable. This button's own circle is live at all times and never moves.
	 *
	 * THAT ALONE WAS NOT ENOUGH, and the first version shipped without the other half. With only the
	 * resting circle live, the EXPANDED photo was not hoverable: move onto the 63px portrait you just
	 * summoned and hover ended, because the pointer had left the 19px target underneath it. Sam: "it's as
	 * if the expanded headshot only stays expanded if my cursor is over the original tiny size... it's a
	 * tiny area otherwise you lose the expanded headshot, makes it difficult to use." A cure worse than
	 * the disease, and it affected every portrait rather than just the one in the corner.
	 *
	 * So the hoverable region is a UNION of two circles — this one, always, plus `.anchor-hit` (the
	 * expanded circle), live only while already hovered. The union can therefore only ever GROW on hover,
	 * never shrink under the pointer, which is the exact property the feedback loop needed and did not
	 * have. Why a union and not simply the big circle: with a corner transform-origin the expanded circle
	 * does NOT contain the resting one — measured, the resting circle's left edge sits 2.01 radii from
	 * the expanded centre against a radius of 1.65 — so swapping one for the other would have re-created
	 * Anderson's flicker at exactly the edge it started at.
	 */
	.anchor {
		position: absolute;
		z-index: 1; /* under the bars (z 2+) at rest */
		padding: 0;
		border: 0;
		background: none;
		/* Kept so hit-testing follows the CIRCLE, as it did when the border lived here — the corners of a
		   square box would reach into a neighbour a year away. */
		border-radius: 50%;
		cursor: pointer;
		pointer-events: auto;
		/* THE DEPTH DROP IS HELD UNTIL THE SHRINK IS OVER. `z-index` cannot tween, so it used to snap from
		   20 back to 1 on the first frame of un-hover while the transform still had 160ms to run — the
		   portrait spent the whole shrink UNDER the bars (z 2+) and partly vanished on the way down. Sam
		   saw it after a click ("the shrinking headshot somehow goes below the vertical bars... it kind of
		   partially disappears for a beat"), but it was every un-hover, click or not.
		   `0s linear 160ms` is a delayed step rather than a tween: full height for the entire descent,
		   then one jump at the end when it is small enough for the bars to pass in front again. Same
		   device the bar tooltip uses for `visibility`, for the same reason. */
		/* COMPOSED, NOT REPLACED — that z-index delay is load-bearing, and `transition` is one property
		   (the box-shadow lesson, in the other syntax). The opacity half is what lets a headshot FADE
		   back in once the room is light. See the note on `.tick`. */
		transition:
			z-index 0s linear 160ms,
			opacity var(--night-ms) cubic-bezier(0.33, 1, 0.68, 1) var(--night-out);
	}
	/* THE PAINT. Same box as the button (inset 0) and the same transform-origin it used to carry, so the
	   tooltip inside — whose containing block this now is — keeps its position and its counter-scale
	   exactly. `pointer-events: none` is the whole point: this is what grows, so this must not be what
	   the browser asks about.
	   NO `overflow: hidden` HERE, and that is deliberate. It was the obvious way to clip a square photo
	   into a circle — and it also clipped the TOOLTIP, which is a child: the label had a real 119x55 box
	   and was simply cut away, visible in the DOM and invisible on screen. The image rounds itself
	   instead (see .anchor img). */
	.anchor-vis {
		position: absolute;
		inset: 0;
		/* The ink is the portrait's own average, 5% darker — see sampleInk. It falls back to the shared
		   rail ink for the frame before the sample lands, and permanently if the sample cannot be taken. */
		border: 1.5px solid var(--anchor-ink, var(--color-rail-ink, #ab7a42));
		border-radius: 50%;
		background: var(--color-cream, #f7f1e6);
		box-shadow: 0 1px 3px rgba(40, 30, 20, 0.3);
		transform-origin: var(--anchor-origin, center);
		pointer-events: none;
		transition:
			transform 160ms cubic-bezier(0.33, 1, 0.68, 1),
			border-width 160ms cubic-bezier(0.33, 1, 0.68, 1),
			box-shadow 160ms cubic-bezier(0.33, 1, 0.68, 1);
	}
	/* THE EXPANDED HIT AREA. Same box, same origin, same scale as .anchor-vis, so it hit-tests as exactly
	   the circle the user can see — but it carries no paint and is INERT until the portrait is expanded.
	   A DESCENDANT's hover satisfies `.anchor:hover`, which is what lets a pointer out on the big photo
	   hold the button's hover open. It also makes the expanded photo CLICKABLE, which the resting-circle-
	   only version quietly was not.
	   No transition on the transform: it is invisible, so it should be at full size the instant hover
	   begins rather than chasing the visual outward and leaving a gap the pointer can fall through. */
	.anchor-hit {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		transform: scale(var(--anchor-scale, 3.3));
		transform-origin: var(--anchor-origin, center);
		pointer-events: none;
	}
	.anchor:hover .anchor-hit {
		pointer-events: auto;
	}
	/* Suppressed with everything else — a portrait that is not expanded must not hold a 63px hit area. */
	.anchor.no-hover:hover .anchor-hit {
		pointer-events: none;
	}
	.anchor img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		border-radius: 50%; /* clips ITSELF, so the button does not have to clip its children */
	}
	/* +20% AND ABOVE EVERYTHING (Sam). The z-index lift is the point of the hover as much as the scale
	   is: at rest a bar may be covering half the face, and hovering has to reveal the whole of it rather
	   than just enlarge the visible sliver. transform-origin is centred so it grows about itself and does
	   not walk out from under the cursor. */
	/* THE BORDER IS COUNTER-TRIMMED ON HOVER. A transform scales the border with everything else, so at
	   3.3x the 1.5px ring would paint at ~5px and read as a heavy outline rather than an edge. 1.35 is
	   that 1.5 less 10% (Sam), so the ring lands 10% finer than it otherwise would at full size. */
	/* z 20, NOT 5 — well clear of every bar rather than one step above the first one. Bars stack at
	   `2 + lane`, so a four-bar chain reaches z 5 and TIED with the hovered portrait; ties go to whatever
	   comes later in the DOM, which is the bars, so Cornelius's own orbit bar was painting over his face
	   and his tooltip (Sam saw exactly this). The tooltip is a child of this element and inherits the
	   stacking context, so lifting the button lifts the label with it.
	   At REST the portrait stays at z 1 and the bars still pass in front — that part is unchanged. */
	.anchor:hover .anchor-vis,
	.anchor:focus-visible .anchor-vis {
		transform: scale(var(--anchor-scale, 3.3));
		border-width: 1.35px;
		box-shadow: 0 2px 7px rgba(40, 30, 20, 0.38);
	}
	.anchor:hover,
	.anchor:focus-visible {
		z-index: 20;
		/* Rising is immediate — the lift has to lead the growth, or the portrait expands underneath the
		   bars it is trying to clear. Only the DROP is delayed. */
		transition: z-index 0s;
	}
	/* JUST CLICKED — see onAnchorClick. Two classes plus the pseudo outrank the rule above, so the
	   portrait sits back down under a pointer that never moved. Keyboard focus is deliberately NOT
	   suppressed: a focus ring with no label is a worse outcome than a label that outstays a click, and
	   a keyboard user has no "move the mouse away" to perform. */
	.anchor.no-hover:hover .anchor-vis {
		transform: none;
		border-width: 1.5px;
		box-shadow: 0 1px 3px rgba(40, 30, 20, 0.3);
	}
	.anchor.no-hover:hover {
		z-index: 1;
		/* Restated, not inherited: this rule outranks .anchor:hover, which would otherwise hand it the
		   IMMEDIATE z-index above and drop the portrait behind the bars for the whole click-shrink. */
		transition: z-index 0s linear 160ms;
	}
	.anchor.no-hover:hover .anchor-tip {
		display: none;
	}

	/* THE TOOLTIP. Counter-scaled by 1/scale so the type stays its own size while the portrait triples —
	   without this the label would grow with the button and arrive at 30px. */
	.anchor-tip {
		position: absolute;
		left: 0;
		bottom: calc(100% + 6px);
		display: none;
		flex-direction: column;
		gap: 1px;
		padding: 5px 8px;
		width: max-content;
		max-width: 190px;
		border-radius: 5px;
		background: rgba(38, 34, 26, 0.93);
		color: var(--color-cream, #f7f1e6);
		text-align: center;
		align-items: center;
		line-height: 1.25;
		pointer-events: none;
		transform: scale(calc(1 / var(--anchor-scale, 3.3)));
		transform-origin: left bottom;
	}
	.anchor.tip-below .anchor-tip {
		bottom: auto;
		top: calc(100% + 6px);
		transform-origin: left top;
	}
	.anchor:hover .anchor-tip,
	.anchor:focus-visible .anchor-tip {
		display: flex;
	}
	.tip-name {
		font-size: 12px;
		font-weight: 600;
	}
	.tip-blurb {
		font-size: 11px;
		opacity: 0.85;
	}
	.tip-years {
		font-size: 11px;
		font-variant-numeric: tabular-nums;
		opacity: 0.7;
	}

	@media (prefers-reduced-motion: reduce) {
		.bar {
			transition: none;
		}
		.anchor {
			transition: none;
		}
	}
</style>
