/**
 * THE STAGE STORE — Phase 2.75. Window geometry in, {tier, density, u, k} out.
 *
 * THE ONE RULE THIS FILE EXISTS TO ENFORCE: nothing else in the app reads the window. Roadmap Phase
 * 2.75 states it as a requirement ("the tier store AND the stage-fit store are ONE module — window
 * geometry in, {tier, density} out; nothing else reads the window directly"), and the reason is the
 * §17.x lesson about one clock with many subscribers: two components that each measure the viewport
 * will disagree for a frame, and the frame they disagree on is the one the user is looking at.
 *
 * ── WHY THIS IS A UNIT AND NOT A TRANSFORM ──────────────────────────────────────────────────────────
 *
 * Design §13.3 sketched the fallback as "scale the whole stage group (transform: scale(...))" and
 * called it "semantically free in the world model: a smaller window = the camera sits slightly higher
 * above the table." The world model is right and the mechanism is wrong. `scripts/spike-scale.mjs`
 * put `transform: scale(0.8)` on `.page-container` and measured what the motion engine would see:
 *
 *   A. an in-stage `position: fixed` pin at a captured VIEWPORT rect asked for (139, 1027) and landed
 *      at (253, 822). A transformed ancestor is the containing block for its fixed descendants, so
 *      every `out:flyOut` leaver — which pins at exactly such a rect — lands in the wrong place. The
 *      code already knew: see the comment at +page.svelte's `.grandparent-tier`, which chose `left`
 *      over `translateX` for this precise reason.
 *   B. `translate(100px)` applied in-stage moved 100px of LOCAL length = 80 VISUAL px. Every delta
 *      flight.ts derives from a measured rect and applies as a translate is therefore wrong by 1/s.
 *      That is not a handful of call sites; it is the coordinate space of a 2,465-line file whose
 *      constants were tuned by eye over a month.
 *   C. the body-portalled handoff ghost keeps its position (it is outside the transform) but lays out
 *      its content at 1:1 — a full-size chip inside a shrunken world.
 *
 * A transform re-bases the coordinate space the motion engine lives in. A LENGTH does not: if the card
 * is genuinely 832px wide instead of genuinely 925px wide, every rect flight.ts measures is true, every
 * delta it computes is true, and every translate it applies is true. The only things that go stale are
 * flight.ts's own hard-coded px CONSTANTS, which are ~10 named values at module scope rather than a
 * coordinate space — see `su()` below, which is what they multiply by.
 *
 * Sam's hybrid choice forces the same conclusion independently: type can only step separately from the
 * frame if the frame is a real length. Under a transform you would have to counter-scale every text
 * node by 1/s, which is both fragile and visibly soft at non-integer scales.
 *
 * ── THE TWO DIALS ───────────────────────────────────────────────────────────────────────────────────
 *
 *   u   THE FRAME UNIT. Continuous, <= 1. Multiplies GEOMETRY: card width and height, chip sizes,
 *       photo boxes, paddings, gaps, the notch, the blade. Published as `--stage-u`.
 *
 *   k   THE TYPE STEP. Discrete, and deliberately >= u. Multiplies READING type. Published as
 *       `--type-k`.
 *
 * ── AND A THIRD, WHICH THE CHIPS FORCED ─────────────────────────────────────────────────────────────
 *
 *   ck  THE LABEL STEP, published as `--chip-k`. Equal to u, i.e. chips scale UNIFORMLY.
 *
 * The hybrid exists to keep RUNNING TEXT readable while its frame shrinks — a narrative body at 8.7px
 * is useless, so k holds it up. A CHIP IS NOT RUNNING TEXT. It is a label on a 47px object: it is
 * RECOGNISED, not read, and it is surrounded on all four sides by a box that is shrinking on u. Holding
 * its type up on k while its box shrinks on u means the text grows relative to its container at every
 * step down — which is precisely how Sam's spouse chip broke: "Rev. Thomas Hooker" wrapped to two lines
 * and pushed "m. 1621" out through the chip's `overflow: hidden`.
 *
 * Folding the union year onto the dates line (Sam's own fix, see mergeChipUnion) removes a row and was
 * worth doing on its own merits, but measurement showed it treats a symptom: it took the overflow from
 * +2/+6px to +1/+5px, because the two-line NAME is what actually costs the room. Scaling chip type on u
 * stops the name wrapping at all, which is the root.
 *
 * So: reading text steps on k, labels scale on u. At u = 1 the two are identical and nothing moves.
 *
 * k >= u IS THE WHOLE HYBRID, and it has a consequence that must be designed for rather than
 * discovered: because text does not shrink as fast as its frame, a card at compact density holds
 * PROPORTIONALLY MORE text than the same card at 1440. A fixed frame with growing relative content
 * overflows itself. The answer is the CONTENT BUDGET below — density caps how many NB blocks and
 * RightColumn rows a card renders — which is not new invention: it is roadmap Phase 1.5's outstanding
 * "RightColumn row budget" item, finally given a reason to exist and a number to take.
 *
 * ── THE LADDER IS DECLARED, NOT SOLVED — AND THEN CLAMPED ───────────────────────────────────────────
 *
 * u is a pure function of the viewport, looked up in the table below. It is emphatically NOT derived by
 * measuring the stage and dividing, because with a real-length unit the stage's height is itself a
 * function of u — a measure-and-apply loop would oscillate, and would relayout on every frame of a
 * window drag. A declared ladder is deterministic, costs one lookup, and is CHECKED rather than
 * trusted: `scripts/probe-fit.mjs` asserts the stage fits at every rung on the richest cards.
 *
 * The one thing NOT left to the ladder's correctness is the WIDTH, because Sam's rule there is absolute
 * (Aug 8): "there's never a horizonal scrollbar allowed." A rung whose u is slightly too generous for
 * some viewport nobody tested would break an inviolable rule, so `widthClamp` below caps u at whatever
 * actually fits the viewport's width — arithmetic, not judgement. The ladder states the INTENT; the
 * clamp enforces the LAW. Width is safe to solve this way where height is not: the stage's width at u=1
 * is a known constant, so there is no feedback loop.
 *
 * ── THE VERTICAL RULE, AS CORRECTED BY SAM (Aug 8) ──────────────────────────────────────────────────
 *
 * Design §13's "there are no scrollbars anywhere in zoom 1" was too strong, and Sam corrected it the
 * same day he introduced the exception:
 *
 *   HORIZONTAL   never, under any circumstances, in any state.
 *   VERTICAL     never — EXCEPT while the GRANDCHILD TIER is open. Hovering a child chip for 1.2s
 *                reveals that child's own children below it, and a twelve-child family puts three rows
 *                on the stage. That row is a deliberate, transient, user-summoned overflow, and it is
 *                allowed to scroll.
 *
 * So the fit target is the RESTING stage. probe-fit asserts against that and must not open a tier.
 * This also means the `overflow: clip` shell lock in layout.css can never simply be armed as written —
 * clipping the resting stage is right, clipping an open grandchild tier would amputate the row that
 * earned the exception. Whatever arms it has to be state-aware.
 */
import { innerWidth, innerHeight } from 'svelte/reactivity/window';

/** A layout COMPOSITION, per design §12. Tiers are arrangements of the same state, data and camera. */
export type Tier = 'A' | 'B' | 'C';
/** A size STEP within a tier. Drives geometry tokens, row caps and the content budget. */
export type Density = 'roomy' | 'normal' | 'compact';

export interface StageRung {
	/** minimum viewport width this rung applies at */
	minW: number;
	/** minimum viewport height this rung applies at */
	minH: number;
	tier: Tier;
	density: Density;
	/** frame unit — multiplies geometry */
	u: number;
	/** type step — multiplies type. Always >= u (the hybrid). */
	k: number;
	/** children-row cap; beyond it a "+K" chip, per design §13.3. null = uncapped */
	childCap: number | null;
	/** narrative blocks rendered on the card before the rest fold away */
	nbCap: number | null;
	/** is the persistent sibling column on stage? It needs ~150px to the right of the card. */
	siblingColumn: boolean;
	label: string;
}

/**
 * THE LADDER, widest first; the first rung both dimensions clear wins.
 *
 * The measured facts these numbers answer to (scripts/measure-tiers.mjs, scripts/probe-fit.mjs, Aug 8):
 *
 *   natural stage WIDTH  1138px = card 925 + gap ~30 + sibling column 119 + padding 2x32.
 *                        Below this the card's left edge goes NEGATIVE and `overflow-x: clip` amputates
 *                        it silently — 98px off each side at iPad mini portrait, 273px at an iPhone.
 *   natural stage HEIGHT 905px (Thomas, no children row) to 1375px (Pierpont, wrapped children + blade).
 *                        So even 1440x900 overflows by 456-475px on a rich card today.
 *
 * u AND k ARE PROVISIONAL until the geometry conversion lands and probe-fit re-runs at each rung; they
 * are the arithmetic of "what fits", not taste. The k column is the part that wants Sam's eye, because
 * it is where legibility is bought: at k = 0.85 the card's 13px narrative body renders at 11px, which is
 * the smallest this project should ever set running text. u may go lower; k should not.
 */
export const LADDER: StageRung[] = [
	{
		// FULL SIZE HOLDS AS LONG AS IT HONESTLY CAN. Sam, Aug 8, on an earlier 1400x880 threshold:
		// "your first breakpoint from largest desktop to next is just a bit too soon, there's still
		// plenty of room for sibling cards and the timeline when it first gets a little smaller."
		// He is right, and the arithmetic says how much room: the full composition needs 1186px wide
		// (see the base constants below), so anything from ~1240 up can carry it with slack to spare.
		// Stepping down at 1400 was leaving 200px of usable width on the table.
		//
		// The HEIGHT gate is deliberately loose for the same reason. At u = 1 a rich card's stage runs
		// 905-1375px tall, so no realistic laptop fits it vertically anyway — dropping a rung buys a few
		// percent of height and costs the full-size composition, which is a bad trade. Height is the
		// CONTENT BUDGET's problem (childCap / nbCap), not the frame's.
		minW: 1240,
		minH: 800,
		tier: 'A',
		density: 'roomy',
		u: 1,
		k: 1,
		childCap: null,
		nbCap: null,
		siblingColumn: true,
		label: 'desktop'
	},
	{
		// iPad Pro 11-13" landscape, and any laptop below the roomy rung.
		minW: 1100,
		minH: 720,
		tier: 'A',
		density: 'normal',
		u: 0.92,
		k: 0.96,
		childCap: 8,
		nbCap: 5,
		siblingColumn: true,
		label: 'tablet landscape'
	},
	{
		// iPad mini / iPad 10.2" landscape — the floor Sam named for "getting it really right".
		// THE SIBLING COLUMN GOES HERE, and it is Sam's call rather than an arithmetic one (Aug 8: the
		// sibling menu "can be the first to vanish when the screen gets narrower"). Dropping it returns
		// ~150px at u=1, which is most of why this rung can hold a 0.82 frame instead of a 0.72 one —
		// the card is BIGGER at this rung than it would have been with the column kept.
		minW: 900,
		minH: 640,
		tier: 'A',
		density: 'compact',
		u: 0.82,
		k: 0.9,
		childCap: 6,
		nbCap: 4,
		siblingColumn: false,
		label: 'small landscape'
	},
	{
		// Tablet PORTRAIT. Design §12 Tier B.
		minW: 720,
		minH: 900,
		tier: 'B',
		density: 'compact',
		u: 0.7,
		k: 0.87,
		childCap: 6,
		nbCap: 3,
		siblingColumn: false,
		label: 'tablet portrait'
	},
	{
		// TIER C — the phone. This rung exists so nothing crashes and the numbers stay honest; the actual
		// phone COMPOSITION is roadmap Phase 9.5 and is a vertical RECOMPOSITION, not this squeeze.
		// Sam, Aug 8: an iPad mini is the smallest he cares about getting really right; a phone is a bone
		// thrown to attract attention. Do not tune this rung as though it were the design.
		//
		// The u below is nominal and the width clamp will almost always beat it: at a 393px iPhone the
		// clamp lands on ~0.40, i.e. a 367px card setting 5px body text. That number is not a failure of
		// tuning, it is the PROOF that a phone cannot be reached by scaling a 925px card — which is
		// exactly why Tier C recomposes instead. Left visible rather than hidden behind a floor.
		minW: 0,
		minH: 0,
		tier: 'C',
		density: 'compact',
		u: 0.62,
		k: 0.82,
		childCap: 4,
		nbCap: 2,
		siblingColumn: false,
		label: 'phone (placeholder — Phase 9.5)'
	}
];

/** The card's own width at u = 1. The one number the whole frame is built out of. */
export const CARD_W_BASE = 925;
/** The persistent sibling column: chip width 119 + the gap it sits off the card. */
const SIBLING_COL_BASE = 149;
/** `.page-container`'s left + right padding at u = 1. */
const STAGE_PAD_BASE = 64;
/**
 * THE LEFT TIMELINE'S RAIL, RESERVED BEFORE IT EXISTS. Design §3.6 makes the rail persistent "in every
 * layout tier — Sam's explicit requirement includes phone", and §12 gives Tier C's rail ~32px. 48 is
 * RAISED 48 -> 96 on Aug 8 when the rail was actually built: three overlapping lifespan lanes plus a
 * year gutter do not fit in 48, and the anchor portraits and era marks still to come share the column.
 * Keep in step with RAIL_W in TimelineRail.svelte — that component owns the number, this reserves it.
 *
 * Budgeted NOW, while the rail is still unbuilt, because the alternative is discovering on the day it
 * lands that every rung's u was tuned 48px too generous and the whole ladder has to be re-cut. It costs
 * a little headroom today and nothing at all once the rail is there — and Sam named the timeline in the
 * same breath as the sibling column when he said the first breakpoint came too early, so the width it
 * will want is already part of how these thresholds are being judged.
 */
const TIMELINE_RAIL_BASE = 0;
// ZERO, DELIBERATELY, and kept as a named constant rather than deleted so the decision is greppable.
// This reserved 48px and then 96px while the rail was being built, which pushed the card right and made
// the stage smaller to fit an instrument. Sam's rule (Aug 8) is the opposite: "the timeline is
// absolutely displayed... this is not something we are moving over to make room for. The core boxes and
// rows are front and center and we'll adjust the timeline to work around that." So the stage is sized
// as though the rail were not there, the rail paints BEHIND it, and the only concession available is
// nudging the CHILDREN ROW inward — the one row wide enough to run out over the rail — which is a
// change to that row and not to the stage's width.

/**
 * THE WIDTH CLAMP — the mechanism behind "never a horizontal scrollbar".
 *
 * Everything that contributes to the stage's width scales with u, so the whole width is linear in u and
 * the largest u that fits is a division rather than a search. Returns the rung's u untouched whenever it
 * already fits, which is every rung at every viewport it was designed for; it only bites on the sizes
 * nobody tuned for, which is the entire point of having it.
 */
function widthClamp(rungU: number, vw: number, siblingColumn: boolean): number {
	// THE COLUMN COUNTS TWICE, and getting this wrong is what probe-fit caught. The card is CENTRED in
	// the stage and the sibling column HANGS OFF ITS RIGHT, so the column does not consume width from a
	// shared pool — it consumes width from the right margin only, and the card's centring then demands
	// the same amount back on the left. Budgeting it once read GREEN on the card while the column hung
	// 6px off the right edge of an iPad mini, which the screenshot showed and the first version of the
	// probe could not see.
	//
	// The RAIL counts once: it is chrome pinned to the viewport's left edge rather than part of the
	// centred group, so the card centres in what is left over.
	//
	// If full size should hold at narrower widths than this allows, the lever is to stop centring the
	// card in the VIEWPORT and centre it in the viewport minus its chrome — that buys back ~150px and
	// costs a slightly off-centre card. That is a design call, not an arithmetic one.
	// The rail contributes nothing here — see TIMELINE_RAIL_BASE. It is subtracted rather than divided
	// so that if it is ever given room again, it is modelled correctly: it is chrome pinned to the
	// window edge that does NOT scale with u, and dividing by it would model 96px as 96u.
	const scalingW =
		CARD_W_BASE + (siblingColumn ? 2 * SIBLING_COL_BASE : 0) + STAGE_PAD_BASE;
	// TWO PIXELS OF SLACK, because every element in that sum rounds INDEPENDENTLY — the card, each chip,
	// each gap — so the exact fit the arithmetic predicts can land a pixel over once the browser has
	// rounded them all. Measured: 1100px came out 1px wide without it. A pixel of unused width is
	// invisible; a horizontal scrollbar is the one thing that is not allowed.
	return Math.min(rungU, Math.max(0.2, (vw - TIMELINE_RAIL_BASE - 2) / scalingW));
}

/**
 * SSR HAS NO WINDOW, and the fallback matters more than it looks. `innerWidth.current` is undefined on
 * the server, so the first paint is rendered at whatever this returns and then settles once on hydrate.
 * Falling back to the ROOMY rung (a 1440x900 desktop) is deliberate: it is the composition the crawler
 * and the OG renderer should see, and a desktop-first fallback degrades to a settle on small screens
 * rather than a jump-up on large ones.
 */
const SSR_W = 1440;
const SSR_H = 900;

function rungFor(w: number, h: number): StageRung {
	for (const r of LADDER) if (w >= r.minW && h >= r.minH) return r;
	return LADDER[LADDER.length - 1];
}

/**
 * COARSE POINTER is read but does NOT pick the rung, which is the opposite of the usual advice and is
 * deliberate. Design §12: "Tablet landscape is a first-class citizen of the primary design, not an
 * adaptation." An iPad in landscape gets the full stage and differs only in what it needs for TOUCH —
 * hit targets and hover stand-ins — so `coarse` drives those and nothing about layout. Tier detection
 * is viewport width + orientation, per §12; a Surface with a mouse and an iPad with a finger at the same
 * size get the same composition, and only the hit targets differ.
 */
const coarsePointer = $derived(
	typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true
);

const vw = $derived(innerWidth.current ?? SSR_W);
const vh = $derived(innerHeight.current ?? SSR_H);
const rung = $derived(rungFor(vw, vh));
/** The rung's intent, capped by what the viewport's WIDTH can actually hold. See widthClamp. */
const clampedU = $derived(widthClamp(rung.u, vw, rung.siblingColumn));

/**
 * THE NARRATIVE-BLOCK BUDGET, BY WIDTH. Sam, Aug 8: "once we get below a certain screen size you can
 * reduce the number of NBs shown, like only 2 for 700px and smaller width, 3 NBs for 800 and smaller
 * width."
 *
 * WIDTH, not the rung, and not height. Two reasons it has to be its own ladder:
 *
 *   - The width clamp means a rung does not predict the actual width. At 1100px the rung is 'normal'
 *     and at 1000px it is 'compact', but both can land on the same u; keying the NB count to the rung
 *     would give two different answers for the same rendered card.
 *   - An NB is a paragraph, and what limits a paragraph is the MEASURE — the number of characters on a
 *     line. Narrow the card and each block spends more lines saying the same thing, so the count that
 *     fits falls with width specifically. Height decides how much room there is; width decides how much
 *     each block costs. This is the width half.
 *
 * Takes the MINIMUM with the rung's own nbCap, so a short-but-wide window still gets the rung's limit
 * and neither ladder can quietly override the other.
 */
function nbCapForWidth(w: number): number {
	if (w <= 700) return 2;
	if (w <= 800) return 3;
	return 6; // the roomy maximum — NarrativeBlocks' own MAX_DISPLAYED
}
const effectiveNbCap = $derived(Math.min(rung.nbCap ?? 6, nbCapForWidth(vw)));

export const stage = {
	get vw() {
		return vw;
	},
	get vh() {
		return vh;
	},
	get tier(): Tier {
		return rung.tier;
	},
	get density(): Density {
		return rung.density;
	},
	/** the FRAME unit — geometry multiplier, already width-clamped */
	get u(): number {
		return clampedU;
	},
	/** the rung's declared u before the width clamp — for the probe and for diagnostics */
	get rungU(): number {
		return rung.u;
	},
	/** the TYPE step — type multiplier, always >= u */
	get k(): number {
		return rung.k;
	},
	get childCap(): number | null {
		return rung.childCap;
	},
	get nbCap(): number | null {
		return effectiveNbCap;
	},
	get siblingColumn(): boolean {
		return rung.siblingColumn;
	},
	get coarse(): boolean {
		return coarsePointer;
	},
	get label(): string {
		return rung.label;
	}
};

/**
 * THE FRAME UNIT FOR NON-CSS CONSUMERS — flight.ts's px constants, and any component that has to hand a
 * pixel number to JS rather than to a stylesheet.
 *
 * This is the ONLY thing flight.ts needs from Phase 2.75, and it is worth being exact about why it is so
 * small. flight.ts MEASURES the world (getBoundingClientRect) and applies what it measures (translates
 * between measured points). Under a real-length unit both sides of that are in the same, true coordinate
 * space, so all of it keeps working untouched. What breaks is only the values flight.ts asserts about the
 * world from memory — SIB_SEAT_W = 160, FACE_W = 220, the settle floor and cap in px — because those were
 * written when a chip was always 220px wide. Those multiply by su(). The px/ms velocity CEILINGS are the
 * interesting case and they must NOT be scaled: a ceiling is a statement about apparent speed on a
 * retina, and a smaller stage covering proportionally less distance in the same time is already slower.
 * Scaling the ceiling too would slow it twice.
 *
 * A function rather than a value so a module-scope constant cannot capture it at import time.
 */
export function su(): number {
	return stage.u;
}

/** The type step, for the same class of consumer. */
export function sk(): number {
	return stage.k;
}

/**
 * THE SPOUSE CHIP'S THIRD LINE FOLDS INTO ITS SECOND — the marriage year moves onto the end of the life
 * years, so "1586-1647" and "m. 1621" share a row. Sam's own fix for the union year being clipped out of
 * the bottom of a narrow chip.
 *
 * 850px AND BELOW, AND THE THRESHOLD IS THE WHOLE POINT. The first version keyed on u < 0.88, which fired
 * above 1150px — Sam: "you put the marriage year on the same line as the birth and death year way too
 * soon... you can safely do it at 850px and smaller, it looks better on three lines." He is right that
 * three lines is the better reading; the fold is a concession, so it should be spent as late as possible
 * and not one pixel earlier.
 *
 * A VIEWPORT WIDTH, not a u threshold, for two reasons. It is the number Sam gave and the number he can
 * check in a browser; and u is not a stable proxy for width — the width clamp means a 1300px window and
 * a 1100px window can both land near 0.85, so a u threshold fires at a width nobody chose.
 *
 * WHAT MADE THE ROOM SO THE FOLD COULD WAIT: chips now scale their type on u rather than k (see the
 * label-step note at the top of this file), so the name no longer wraps to two lines and the three-row
 * stack fits far further down than it did when this threshold was first set. The fold is now genuinely
 * a last resort rather than a first response.
 *
 * Below 850 the flight's growUnionRow finds no [data-chip-union] to grow and simply skips that gesture —
 * honest degradation on a chip that is 47px tall. Above 850, which is every size anyone reviews on, the
 * hand-off is exactly as it was.
 */
export function mergeChipUnion(): boolean {
	return stage.vw <= 850;
}

/**
 * Publish the two dials as CSS custom properties on an element (the stage root). Called from the person
 * page with an $effect, so a resize repaints geometry without a component re-render.
 *
 * `--stage-u` and `--type-k` are UNITLESS multipliers, not lengths, so a consumer writes
 * `calc(925px * var(--stage-u))` and reads at the call site what the base number is. A pre-multiplied
 * length would hide the design constant, and every one of those constants is documented somewhere.
 */
export function applyStageVars(el: HTMLElement, u: number, k: number): void {
	el.style.setProperty('--stage-u', String(u));
	el.style.setProperty('--type-k', String(k));
	// LABELS SCALE, READING TEXT STEPS. See the note at the top of this file — chips are recognised,
	// not read, and their box is shrinking on u, so their type must too or it outgrows the box.
	el.style.setProperty('--chip-k', String(u));
}

/** Undo applyStageVars, so leaving the person page leaves no stage geometry behind on the document. */
export function clearStageVars(el: HTMLElement): void {
	el.style.removeProperty('--stage-u');
	el.style.removeProperty('--type-k');
	el.style.removeProperty('--chip-k');
}
