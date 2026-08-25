<script module lang="ts">
	import { CORNER_R, CARD_W } from './FeaturedCard.svelte';

	// ── THE BLADE'S GEOMETRY ────────────────────────────────────────────────────────────────────────
	// Taken off Sam's drawing (7AFB3D6D), which is ~1:1 with the card's 925px width.
	//
	// The blade is NOT part of the FeaturedCard. It emerges from BENEATH it — it lives one z-layer below
	// the card and slides down out from under it, which is why a card with no cross-connections has no
	// blade at all and every card is exactly CARD_TOP_H tall.
	export const BLADE_RIGHT_INSET = 25; // the blade stops short of the card's right edge
	export const BLADE_LEFT_TOP = 125; // where the slanted left edge meets the blade's top (was 145)
	// The slant is a fixed ANGLE, not a fixed offset: "the slant continues as long as there are CCs".
	// So the horizontal run is height x this, and a taller blade leans further right at the bottom.
	export const SLANT_TAN = 0.83; // ≈40° off vertical — the drawing runs 73px right over an 88px drop
	// IT LEANS THE WHOLE WAY DOWN, per the drawing: "the slant continues as long as there are CCs".
	// A depth cap lived here for a while, added to keep a two-column layout's insets bounded. Those
	// columns are gone, and the cap was left behind doing nothing but flattening the last stretch of the
	// deepest blades into a vertical stub with a rounded corner — which broke the one continuous line
	// the edge is supposed to be (Sam). Shrinkwrapped blades top out around seven rows, so the lean
	// stays well inside the blade at every real depth.

	// THE TANG — blade that lives permanently up inside the case, above the card's bottom edge, and is
	// never seen at rest. Without it the blade's top edge IS the card's edge, so the settle overshoot
	// pulled the whole thing clear and opened a gap: for a few frames the blade was a detached slab
	// floating below the card. With a tang, an overshoot simply exposes more of the blade, which is what
	// a real blade does. Anything longer than the overshoot works; this is comfortably longer.
	// The slant runs up through it, so the edge reads as one continuous line that keeps going under the
	// card rather than starting at it.
	export const BLADE_TANG = 14;
	// x of the slanted edge at the BLADE BOX's top (tang included). Chosen so the edge passes through
	// BLADE_LEFT_TOP exactly at the card's bottom edge — the tang extends the same line, it doesn't bend it.
	const SLANT_X0 = BLADE_LEFT_TOP - BLADE_TANG * SLANT_TAN;
	const BODY_PAD_TOP = 10; // text's own gap below the card's edge (the tang is added on top of it)

	// ── TYPE SIZE ───────────────────────────────────────────────────────────────────────────────────
	// A RANGE, not a value. The text grows to the largest size that still occupies the number of lines
	// it needs at the floor (see fitToLines), so a short entry fills its width instead of trailing off
	// into dead space. The floor is the old flat 10px + 2% — Sam: "the current font size overall is as
	// small as i want it to go, i think the lower clamp font size needs to be even 2% bigger than this".
	// Raised from 10.2 (itself the old flat 10px + 2%). At 10.2 the densest entries bottomed out around
	// 10.4 and read as too small — Sam, on Daniel Wadsworth: "I'd rather have it wrap onto seven rows of
	// text with a slightly larger min font". The floor is the size at which the TARGET DEPTH is
	// measured, so lifting it buys type at the price of rows, which is the trade being asked for.
	export const CC_FONT_MIN = 10.8;
	// The blade sits BELOW the featured card in the hierarchy, and type this size started reading as an
	// extension of the card's narrative blocks rather than as a footnote to them (Sam). The ceiling is
	// what keeps the blade subordinate; it was 13.
	export const CC_FONT_MAX = 11.5;

	// The gap between the label and the slanted edge is the SAME gap the card puts between the portrait
	// column and the narrative column (.narrative's pl-4). Sam named that gap specifically; it is a
	// borrowed measure, not a taste value, so it is written here as what it is.
	const LABEL_GAP = 16;

	// Unit vector UP the slant, used to round the bottom-left vertex by the same radius as every other
	// corner on the card. sin/cos of the slant angle off vertical.
	const SLANT_ANGLE = Math.atan(SLANT_TAN);
	const SLANT_UX = Math.sin(SLANT_ANGLE);
	const SLANT_UY = Math.cos(SLANT_ANGLE);

	// The label reads straight on from the linked name with NO separator dash. Two legal shapes need
	// different spacing: a predicate ("was his father-in-law…") takes one space, a leading appositive
	// (", her grandmother, …") takes none. Getting it wrong prints "Name , her grandmother".
	function ccTail(label: string): string {
		const t = bindYears((label ?? '').trim());
		if (!t) return '';
		return /^[,;:.!?]/.test(t) ? t : ' ' + t;
	}

	// A YEAR NEVER STARTS A LINE ALONE. Line breaking is greedy and per-line, so "…ordination, November
	// 25," would fill a line and drop "1706" onto the next one by itself — a runt that reads as a
	// mistake and wastes the line it lands on (Sam). `text-wrap: pretty` and `balance` do NOT fix this;
	// measured on the same blade, both produced identical breaks, because the problem is not how the
	// lines are balanced but that a date is being treated as two separable words.
	//
	// Tying the year to the word before it with a non-breaking space moves the break somewhere legal
	// instead. 419 of 2879 connections (15%) contain a year that can be split this way. This is a
	// DISPLAY transform only — nothing is written back, and canonical.json is frozen in this stream.
	function bindYears(text: string): string {
		return text.replace(/(\S)[ \t]+(\d{4}\b)/g, '$1\u00a0$2');
	}

	// A PERSON'S NAME IS ONE THING. "Edwards Pierrepont" broken across two lines reads as two people
	// for the half second it takes to reassemble, which is exactly the cost the blade cannot afford —
	// the name IS the link. Every space inside a linked name becomes non-breaking, so the whole name
	// moves to the next line together or not at all. The width search below takes the paragraph's
	// min-content width as its floor, so a bound name can never be squeezed into overflowing.
	function bindName(text: string): string {
		return (text ?? '').replace(/[ \t]+/g, '\u00a0');
	}
</script>

<script lang="ts">
	import { stage } from '$lib/state/stage.svelte';
	import { fitBlade } from '$lib/actions/fitBlade';

	type CC = {
		type: string;
		related_id: string;
		link_text: string;
		display_label: string;
		slug: string | null;
		t?: { x: number; y: number | null; e?: boolean } | null;
		relation_class?: 'direct' | 'collateral' | null;
		gen_delta?: number | null;
		kin_distance?: number | null;
		/** ORBIT (§40) — the target's orbit-ness, surfaced as data-orbit so warmPersonLinks can decide
		 *  the ascension's axis at click time, the same way it reads gen_delta and kin_distance. */
		orbit?: boolean;
	};
	type Props = {
		crossConnections?: CC[];
		/** Reported upward so the featured slot can reserve the blade's height (see +page.svelte). */
		onheight?: (h: number) => void;
	};
	let { crossConnections = [], onheight }: Props = $props();

	// ── LAYOUT ──────────────────────────────────────────────────────────────────────────────────────
	// ONE FLOW, always, cut by the slant. A two-column variant for long lists was built and REMOVED: it
	// is the right idea (a full-width line here runs ~170 characters, well past the 45–75 prose reads
	// at) but every version of it deepened the blade instead of halving it, and a blade that grows into
	// a panel stops being a blade and starts competing with the card. The depth constraint has to be
	// solved before the columns are worth having. See the session notes before rebuilding it.
	//
	// The one thing count still changes: a lone connection is CENTRED rather than stranded at the left
	// edge with the rest of the blade empty.
	let solo = $derived(crossConnections.length === 1);

	// The label reads on TWO ROWS always — "the header Cross Connections will be on two rows even if
	// there's only one row of Cross Connections in a given entry" — so it never reflows with content.
	// It sits OUTSIDE the blade, tucked into the wedge the slant opens up on the left.

	// The blade's own height, measured from its content. The slant's horizontal run is derived from it,
	// so the shape and the text-flow cutout stay in step at any number of CCs.
	let textH = $state(0);
	// The body is sized EXPLICITLY from the text it holds, and clips. That is what lets the shaping float
	// be over-tall: a float is contained by the nearest block-formatting context (here the shadow
	// wrapper's `filter` creates one), so a 600px float otherwise dragged the whole blade to 600px. The
	// obvious neutraliser — a matching negative bottom margin — does not work: shape-outside is clipped
	// to the float's MARGIN box, so zeroing the margin box zeroed the cutout with it (measured: every
	// line went back to starting at x=0). Explicit height + overflow:hidden contains and clips it
	// instead, and the text's own height is a clean input because the cutout no longer depends on it.
	const BODY_PAD_Y = 22; // padding: 10px top + 12px bottom

	// ── PHASE 2.75 — THE BLADE IS PART OF THE CARD AND MUST SHRINK WITH IT ──────────────────────────
	// Every constant above is a BASE stated at u = 1, taken off Sam's drawing at the card's 925px width.
	// The blade kept those literals when the card started scaling, so it overhung the card's bottom-right
	// corner by 925 x (1 - u) — which is what Sam saw: "CROSS CONNECTIONS ... sticks out on the right of
	// the bottom of Featured Card as it shrinks."
	//
	// SLANT_TAN IS THE ONE THING THAT MUST NOT SCALE. It is an ANGLE — a ratio of two lengths — so it is
	// dimensionless and already correct at every size. Multiplying it would ROTATE the blade's edge as
	// the window narrowed, which is the one thing about this shape nobody would forgive. Scale the
	// LENGTHS, leave the ANGLE, and the silhouette stays similar to itself at every rung.
	//
	// CORNER_R is likewise left alone, for the reason given where it is declared: the blade mitres
	// against the card's own radius, and two independently-rounded numbers is how a seam opens at one
	// size and not another.
	const bu = $derived(stage.u);
	const bk = $derived(stage.k);
	/** The tang, scaled. The card seats the blade with this same number — see FeaturedCard. */
	const tang = $derived(Math.round(BLADE_TANG * bu));
	const bodyPadY = $derived(Math.round(BODY_PAD_Y * bu));
	const slantX0 = $derived(BLADE_LEFT_TOP * bu - tang * SLANT_TAN);

	// The tang is part of the box but never part of what the page sees (see onheight below).
	let bladeH = $derived(textH > 0 ? textH + bodyPadY + tang : 0);
	// REPORTED FROM THE DATA, NOT THE DOM. bladeH is a bind:clientHeight on an element inside the
	// {#if}, so when a person has NO cross-connections that element unmounts and bladeH simply KEEPS
	// its last value — nothing writes 0. The page then reserves a phantom blade's worth of space and
	// the children connector starts as if there were a blade (Sam: Erwin Newton HD9550 → his father
	// Edward HD9470, who has no CCs, inherited Erwin's three-line gap). Gating on the array makes the
	// reported height a fact about the PERSON rather than about whatever was rendered last.
	// The page reserves only the VISIBLE depth — the tang is inside the card, and reserving it would
	// push the children row down by a strip nobody can see.
	let reportedH = $derived(crossConnections.length > 0 ? Math.max(0, bladeH - BLADE_TANG) : 0);
	$effect(() => {
		onheight?.(reportedH);
	});
	let slantRun = $derived(Math.round(bladeH * SLANT_TAN));

	// THE SILHOUETTE — carved with the card's own `shape()` machinery and the card's own CORNER_R, not
	// a polygon() of my own. The card cuts its spouse notch this way (FeaturedCard `clipPath`), so the
	// blade's corners round exactly like the card's and the two read as one carved object.
	//
	// Rounded: the two BOTTOM corners, and the bottom-left one stepped back along BOTH of its edges
	// (bottom edge and slant) so the acute vertex doesn't come to a needle. Square: the two TOP corners,
	// which sit at or above the card's bottom edge and are never seen — the card paints over them.
	let clip = $derived.by(() => {
		const r = CORNER_R;
		const L = slantX0; // the slant's x at the TOP OF THE TANG, not at the card's edge
		const B = L + slantRun; // where the slant meets the bottom edge
		// Step r back UP THE SLANT from the bottom-left vertex, so the corner leaves along the same line
		// it arrived on and the edge reads as one unbroken lean.
		const upX = (B - r * SLANT_UX).toFixed(2);
		const upY = (r * SLANT_UY).toFixed(2);
		return `shape(
            from ${L}px 0,
            line to 100% 0,
            line to 100% calc(100% - ${r}px),
            curve to calc(100% - ${r}px) 100% with 100% 100%,
            line to ${B + r}px 100%,
            curve to ${upX}px calc(100% - ${upY}px) with ${B}px 100%,
            line to ${L}px 0
        )`;
	});

	// The text must FOLLOW that edge — in the drawing the second line starts further right than the
	// first. A float carrying the mirrored polygon as `shape-outside` is what makes the lines step in
	// as they descend; padding alone would let line two start left of the edge and be clipped away.
	// (shape-outside takes a basic shape, not shape(), so this one stays a polygon.)
	//
	// CRUCIALLY it is drawn over a FIXED, over-tall run rather than the measured height. The slant is an
	// angle, so a longer line of the same angle is the same edge — but a cutout sized from bladeH made
	// layout self-referential: height fed the cutout, the cutout re-wrapped the text, the text changed
	// the height. It converged, but only after a second pass, so anything reading the height on the
	// first pass (the sheath transition did exactly this) got a too-short blade. Now the text wraps
	// correctly on pass one and bladeH is a pure output, used only for the clip — which is paint, not
	// layout, and so cannot feed back.
	// How far down the cutout runs. It must exceed the deepest blade — the fullest connection list
	// measures ~165px, so this is roughly double — and NO MORE than that, because the float's WIDTH is
	// derived from it and a float's width sets its container's MIN-CONTENT width, which is the floor of
	// the width search in fitBlade. At 600 the float was 639px wide and no blade could shrink below
	// ~660px however little text it held (Sam noticed it on a one-connection entry). It only got that
	// large when the slant's depth cap was removed; the cap had been bounding this by accident.
	const SHAPE_RUN_BASE = 300;
	const SHAPE_RUN = $derived(Math.round(SHAPE_RUN_BASE * bu));
	// The float starts below the body's top padding, so its polygon must begin at the slant's x THERE,
	// not at the blade's top. It used to start at BLADE_LEFT_TOP, which put the cutout ~8px left of the
	// real edge and quietly ate most of the shape-margin — part of why the text read as touching.
	const SHAPE_X0 = $derived(Math.round(slantX0 + (BODY_PAD_TOP * bu + tang) * SLANT_TAN));
	// The float must be WIDER than the shape ever gets, because shape-outside is clipped to the float's
	// margin box. At `width: 100%` inside a two-column grid the box was ~340px while the polygon reached
	// 631px, so everything past the clip counted as blocked and the left column collapsed to a sliver
	// (measured: a 3-connection blade rendered 636px tall). A fixed width the shape cannot outgrow works
	// in both layouts.

	// Mirrors the clip: one straight lean, all the way down.
	const SHAPE_CAP_X = $derived(Math.round(SHAPE_X0 + SHAPE_RUN * SLANT_TAN));
	// The float must be WIDER than the shape ever gets — shape-outside is clipped to the float's margin
	// box, and at `width: 100%` inside a narrow container everything past the clip counts as blocked.
	const SHAPE_W = $derived(SHAPE_CAP_X + Math.round(8 * bu));
	const shape = $derived(
		`polygon(0 0, ${SHAPE_X0}px 0, ${SHAPE_CAP_X}px ${SHAPE_RUN}px, 0 ${SHAPE_RUN}px)`
	);

	// EACH ROW gets its own right edge, LABEL_GAP left of the slant AT THAT ROW'S OWN HEIGHT. Aligning
	// both rows to one edge can't hold a constant gap against a leaning edge — measured, "Cross" sat
	// 10px off it and "Connections" 21px. Stepping them makes the label lean with the blade, which is
	// the same rule the blade's own text follows as it descends.
	const LABEL_TOP = $derived(tang + Math.round(12 * bu)); // clear of the CARD's bottom edge
	// ROW_H follows the TYPE STEP, not the frame unit — it is "10px at line-height 1.25", a length
	// derived from a font size, and the label's type steps on k like all other type. Scaling it on u
	// would drift the rows out of register with the glyphs sitting in them.
	const ROW_H = $derived(12.5 * bk);
	const ROW_GAP = $derived(1 * bu);
	const rowRight = (i: number) =>
		slantX0 + (LABEL_TOP + i * (ROW_H + ROW_GAP) + ROW_H / 2) * SLANT_TAN - LABEL_GAP * bu;
	const labelRight = $derived(Math.round(rowRight(1))); // the wider, lower row sets the block's edge
	const row0Inset = $derived(Math.round(rowRight(1) - rowRight(0))); // "Cross" pulls back by the run
</script>

{#snippet entry(cc: CC)}{#if cc.slug}<a
			href="/person/{cc.slug}"
			data-cc="true"
			data-tx={cc.t?.x ?? undefined}
			data-ty={cc.t?.y ?? undefined}
			data-relation-class={cc.relation_class ?? undefined}
			data-gen-delta={cc.gen_delta ?? undefined}
			data-kin-distance={cc.kin_distance ?? undefined}
			data-orbit={cc.orbit ? 'true' : undefined}
			class="cc-link">{bindName(cc.link_text)}</a
		>{:else}<span class="cc-name">{bindName(cc.link_text)}</span>{/if}{#if cc.display_label}<span
			class="cc-label-text">{ccTail(cc.display_label)}</span
		>{/if}{/snippet}

{#if crossConnections.length > 0}
	<!-- One row spanning the card's width: the label sits left and outside, the blade to its right. -->
	<div class="cc-blade-row" style="--tang: {tang}px;">
		<!-- The label moved out of the card with the CCs, and its HOVER TOOLTIP came with it — it is the
		     only place the site ever explains what a cross connection is, so it survives the redesign
		     verbatim. Two fixed rows always, per the drawing, so it never reflows with content. -->
		<!-- The label rides in a layer that fills the row — i.e. exactly as tall as the blade. That is what
		     lets the draw cancel the overshoot for the label alone: the counter-animation is expressed as a
		     percentage, and a percentage only matches the blade's travel if the box it resolves against is
		     the same height. See unsheathBlade. -->
		<div class="cc-label-layer">
			<div class="cc-label-wrapper" style="width: {labelRight}px;">
				<span class="cc-label"
					><span style="margin-right: {row0Inset}px">Cross</span><span>Connections</span></span
				>
				<div class="cc-tooltip">
					Notable relationships beyond direct family ties — peers, colleagues, neighbors, or
					parallel descents through the Hooker tree.
				</div>
			</div>
		</div>

		<!-- WIDTH IS DYNAMIC. The blade always emerges from the same point under the card's left side, but
		     its right edge is pulled in to the tightest width that still holds the text in the same number
		     of lines — so a single short connection gets a short blade instead of a full-width one with a
		     field of white beside it. That also retires the special case for a lone connection: a blade
		     sized to its content cannot strand it, so there is nothing to centre. -->
		<!-- `style:` DIRECTIVE, not a style attribute. A `style="clip-path: …"` attribute is rewritten
		     WHOLESALE every time the clip changes, which silently wiped the width fitBlade had just
		     written — and the clip changes precisely BECAUSE the fit changed the depth, so the two
		     collided on every multi-line blade (measured: a five-line blade snapped back to full width
		     while a one-line blade kept its fit). The directive sets that one property and leaves the
		     action's width alone. Same hazard the card's name has with shrinkToFit. -->
		<div
			class="cc-blade"
			style:clip-path={clip}
			use:fitBlade={{
				minFont: CC_FONT_MIN * bk,
				maxFont: CC_FONT_MAX * bk,
				maxWidth: Math.round((CARD_W - BLADE_RIGHT_INSET) * bu),
				// `key` carries the dials so a resize RE-FITS. fitBlade caches on this string; without
				// them a narrowed window kept the width and font size solved for the wide card.
				key: `${crossConnections.map((c) => c.link_text + c.display_label).join('|')}|${bu}|${bk}`
			}}
		>
			<div class="cc-body" style="height: {bladeH}px;">
				<!-- The float is invisible; it exists only to carry `shape-outside`, so the text steps
				     right as it descends and never crosses the slanted edge. In two-column mode it lives
				     in the LEFT column, which is the only one the slant cuts — the right column is a
				     plain rectangle. -->
				<div
					class="cc-gutter"
					style="shape-outside: {shape}; width: {SHAPE_W}px; height: {SHAPE_RUN}px;"
				></div>
				<p class="cc-text" class:solo bind:clientHeight={textH}>
					<!-- ONE continuous string, not a grid: each connection reads as a sentence and a middot
					     separates them. Index-keyed because a CC id can legitimately recur as two distinct
					     directional facts (see the render path in regenerate-data.js). -->
					{#each crossConnections as cc, i (i)}{#if i > 0}<span class="cc-dot" aria-hidden="true"
								>&#9679;</span
							><wbr />{/if}{@render entry(cc)}{/each}
				</p>
			</div>
		</div>
	</div>
{/if}

<style>
	.cc-blade-row {
		/* ── THE LINK COLOUR — ONE LINE TO SWITCH ────────────────────────────────────────────────────
		   Swap which of these two is live. Nothing else references either value.
		     dark grey blue  var(--color-darkgreyblue)    — hsl(224, 30%, 27%), CHOSEN
		     slate blue      hsl(252, 100%, 67%)          — trialled and returned from */
		--cc-link: var(--color-darkgreyblue);
		/* --cc-link: hsl(252, 100%, 67%); */

		position: relative;
		/* THE CARD'S WIDTH, and it must TRACK it. A literal 925 here is what made the blade overhang the
		   shrinking card's bottom-right corner. */
		width: calc(925px * var(--stage-u, 1));
	}

	.cc-label-layer {
		position: absolute;
		inset: 0;
	}

	/* OUTSIDE the blade, in the wedge the slant opens. Two fixed rows, always. The wrapper's WIDTH is
	   set inline from the slant's own position and the text is right-aligned into it, so the gap to the
	   slanted edge stays LABEL_GAP even if the slant or the left corner moves. */
	.cc-label-wrapper {
		position: absolute;
		top: calc(var(--tang) + 12px); /* LABEL_TOP — 12px below the CARD's edge */
		left: 0;
	}

	.cc-label {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 1px;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.08em;
		line-height: 1.25;
		text-transform: uppercase;
		color: rgb(120, 113, 108); /* stone-500 — the tone the label carried inside the card */
		user-select: none;
		cursor: help;
	}

	/* Opens DOWNWARD, where inside the card it opened up. The label is no longer under the card's own
	   stacking context — the card paints OVER the blade (it has to, so the blade can slide out from
	   under it), so an upward tooltip landed behind the portrait. */
	.cc-tooltip {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		width: 240px;
		padding: 8px 10px;
		background: rgb(41, 37, 36); /* stone-800 */
		color: rgb(245, 245, 244); /* stone-100 */
		font-size: 11px;
		line-height: 1.4;
		border-radius: 4px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.15s ease;
		z-index: 50;
		text-align: left;
		letter-spacing: normal;
		text-transform: none;
		font-weight: 400;
	}

	.cc-label-wrapper:hover .cc-tooltip {
		opacity: 1;
	}

	/* NO SHADOW OF ITS OWN, deliberately. The blade is mounted INSIDE .featured-card-wrap, whose
	   drop-shadow filter renders the union of card + blade as ONE silhouette — so the pair casts a
	   single shadow with no seam between them, which is what one steel object does. A shadow here would
	   be a second, wrong one. It also means the blade is never the thing casting onto the card: when
	   sheathed it is entirely inside the card's outline and contributes nothing at all.
	   The clip-path doubles as the hit area (clipping applies to hit-testing as well as paint), so the
	   wedge to the left of the slant falls through to the label's hover. */
	.cc-blade {
		/* Sam's --light-greyish-blue. The blade used to be pure #fff, the same sheet as the card above
		   it; this separates the two without reading as a colour. */
		background: var(--color-bladepaper);
		/* width is written by fitBlade; BLADE_RIGHT_INSET is its MAXIMUM, not a fixed inset */
		/* THE CARD'S SHADOW FALLING ONTO THE BLADE. The wrap's filter renders card and blade as one
		   silhouette, so it draws no shadow BETWEEN them — but there is a real edge there: the card's
		   bottom lip sits above the blade and must cast on it. Inset, so it is clipped to the carved
		   silhouette, and at a FRACTION of the card's outer shadow (--blade-inset-ratio, 0.60 since Aug 7,
		   up from 0.35): the blade is only a sheet's thickness below the card, where the page is much
		   further, and shadow falls off with separation. */
		/* Offset down by the tang so the band lands on the CARD'S bottom edge — the shadow's source —
		   rather than on the top of the box, which is up inside the card and never seen. */
		box-shadow:
			inset 0 calc(var(--tang) + 4px) 12px
				hsl(var(--shadow-ink) / calc(var(--shadow-a1) * var(--blade-inset-ratio))),
			inset 0 calc(var(--tang) + 1px) 3px
				hsl(var(--shadow-ink) / calc(var(--shadow-a2) * var(--blade-inset-ratio)));
	}

	.cc-body {
		/* the tang rides on top of the text's own 10px gap, so the text does not move */
		padding: calc(var(--tang) + 10px * var(--stage-u, 1)) calc(14px * var(--stage-u, 1))
			calc(12px * var(--stage-u, 1)) 0;
		overflow: hidden; /* contains + clips the over-tall shaping float — see BODY_PAD_Y above */
	}

	/* Invisible; carries shape-outside so the text follows the slanted edge. */
	.cc-gutter {
		float: left;
		/* width is set inline from SHAPE_W — see there for why it is not 100% */
		/* height is set inline from SHAPE_RUN — the polygon's bottom and the float's must agree */
		shape-margin: calc(12px * var(--stage-u, 1)); /* the text must not touch the slanted edge — it was ~5px off it, and the
		                       tightest point (a glyph's lower-left against a leaning edge) read as contact */
	}

	/* THE SIZE IS NOT SET HERE. fitToLines writes it, growing the text to the largest size in
	   [CC_FONT_MIN, CC_FONT_MAX] that still fits the lines it needs at the floor. The old flat 10px was
	   sized to a since-retired rule ("two 70-character CCs fit on the first row"), which belonged to a
	   full-width single column; a column is half that width, so the rule cannot survive two columns.
	   line-height MUST stay unitless — fitToLines reads the line count as scrollHeight / line-height,
	   and a px leading would report the same count at every size it tries. */
	.cc-text {
		margin: 0;
		line-height: 1.6;
		color: var(--color-inkblue);
	}

	/* A lone connection is centred rather than left at the edge with the rest of the blade empty. */
	.cc-text.solo {
		text-align: center;
	}

	.cc-link {
		font-weight: 500;
		color: var(--cc-link);
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 2px;
		text-decoration-color: color-mix(in oklch, var(--cc-link) 35%, transparent);
	}
	.cc-link:hover {
		text-decoration-color: var(--cc-link);
	}
	.cc-name {
		font-weight: 500;
	}
	.cc-label-text {
		opacity: 0.75;
	}
	/* THE ONLY PLACE A CONNECTION MAY BREAK FROM THE NEXT ONE.
	   There is no whitespace around this separator — the spacing is padding — so the browser saw
	   "…prisoner of war●Paul Geddes Pennoyer" as ONE unbreakable word, the linked name having been made
	   unbreakable itself. A line with 220px still free would throw the whole 360px run onto the next
	   line, which is why words were wrapping with obvious room left beside them. The <wbr/> after this
	   span is that missing break opportunity; there is deliberately none BEFORE it, so the dot stays on
	   the line with the connection it closes instead of leading the next one (Sam). */
	.cc-dot {
		padding: 0 0.5em;
		opacity: 0.45;
		font-size: 0.7em;
		vertical-align: 0.15em;
	}
</style>
