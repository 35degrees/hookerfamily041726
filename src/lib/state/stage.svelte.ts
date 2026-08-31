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
	/**
	 * THE CEILING THE CARD MAY RISE TO ONCE THE COLUMN IS GONE (083026, optional — a rung without one
	 * behaves exactly as it always has).
	 *
	 * `u` above is a FLOOR on these rungs now, not a fixed size. Dropping the sibling column frees
	 * ~150px, and the ladder was declining to spend a pixel of it: at 1024 the clamp would allow 1.03
	 * and the rung held the card at 0.82 with 140px of measured gutter sitting empty on the right.
	 * Sam: "so you aren't going to take advantage of the open sibling menu space below 1050px?"
	 *
	 * So a column-less rung is sized by whatever fits BESIDE THE TIMELINE'S BARS, floored at what it
	 * renders today and capped here. The floor is what protects the phone — at 393px the bars-aware
	 * width wants 0.265 and the floor holds it at 0.395, so nothing shrinks anywhere, ever. The cap is
	 * 0.853, the size the 1100 rung delivers, so a NARROWER window can never show a BIGGER card than a
	 * wide one.
	 */
	uMax?: number;
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
		//
		// minW 1100 -> 1050 (083026). Sam, looking at 1100: the sibling menu vanishes there while "there
		// actually is a decent gap between the siblings menu and the right side of the featured card" —
		// i.e. the column was being dropped with room still on the stage. Measured on the baseline, the
		// stage at 1050 leaves a 153px gutter to the right of the card and the column needs ~140 of it.
		// The clamp takes u to 0.814 here rather than this rung's declared 0.92, so the card is a little
		// smaller than at 1100 and the column fits in what that frees — which is the ladder working as
		// designed rather than a special case.
		minW: 1050,
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
		// minW 900 -> 820 (083026), TO STOP TWO UNRELATED THINGS FIRING ON THE SAME PIXEL. The lifespan
		// bars stop being painted at 900, and this floor ALSO sat at 900 — so crossing it changed the
		// tier (to the tablet-PORTRAIT composition) in the same frame the bars vanished, and the card
		// stepped 759 -> 718 while sliding 40px sideways. Sam: "just don't jump the main content around
		// when vertical bars leave." Neither change was wrong on its own; landing them together is what
		// made it read as a lurch.
		//
		// 820 KEEPS 768 IN TIER B, which is the width that rung is actually for (iPad portrait is
		// 768x1024). What this opens up is 820-899 — landscape-ish windows that were only getting the
		// portrait composition because this floor happened to be the nearest thing to them.
		minW: 820,
		minH: 640,
		tier: 'A',
		density: 'compact',
		u: 0.82,
		// The column is gone at this rung, so 0.82 is a FLOOR and this is the ceiling the freed ~150px
		// may lift the card to. 0.853 is what the 1100 rung actually delivers, so the card can grow into
		// the space the siblings vacated without ever exceeding what a wider window shows.
		uMax: 0.853,
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
		// Same floor-and-ceiling as the rung above, and it is what answers Sam's "the reduction in main
		// content width at <900px is extreme, its too small too soon": at 850 the bars-aware width comes
		// out at 0.727 against this rung's declared 0.7, so the card grows rather than stepping down.
		// At 768 it comes out BELOW 0.7 and the floor takes over, so a real iPad portrait is unchanged.
		uMax: 0.853,
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
/**
 * HOW FAR THE TIMELINE'S BARS REACH from the viewport's left edge, measured: the rail is
 * `position: fixed; left: 0` with RAIL_W 170, but the BARS — the part that must stay legible — end at
 * x = 114. Reserving the bars rather than the whole rail keeps the concession as small as possible.
 *
 * THIS DOES NOT ENTER widthClamp, AND THAT IS THE WHOLE DESIGN. An earlier attempt subtracted it there,
 * which made an instrument's needs SHRINK THE CARDS at every width and cost the phone a third of its
 * size; it was reverted. Sam's Aug 8 rule stands — "the core boxes and rows are front and center and
 * we'll adjust the timeline to work around that" — so the bars are paid for out of margin that already
 * exists (see shiftX) and can never cost a single pixel of card.
 */
const TIMELINE_BARS_W = 114;
/**
 * BELOW THIS THE LIFESPAN BARS ARE NOT DRAWN AT ALL. Sam: "it's clear that at <900px browser width the
 * vertical lines are a liability and will never work so hide the vertical lines at that point."
 *
 * It is the honest reading of the arithmetic. At 850 the container is 835px and a card plus the bars'
 * 114px column cannot both fit; every arrangement below 900 was choosing which one to spoil. Removing
 * the bars there is not a degradation, it is the same call §12 already makes for Tier C — "anchor
 * figures as small dots", a RECOMPOSITION rather than a squeeze — taken one rung earlier.
 *
 * THE YEAR RULES STAY. They are horizontal, they bleed off the left edge, and a card passing over a
 * thin rule reads as depth rather than as collision. What could not survive was the vertical column.
 */
const TIMELINE_BARS_MIN_W = 900;
/**
 * ABOVE THIS THE COMPOSITION STAYS CENTRED IN THE WINDOW, full stop. Sam gave the permission with its
 * own boundary attached — "you don't have to 'Center' the main content BELOW 1100px in the browser
 * window, the center line can cheat to the right" — and the first version of the cheat ignored the
 * second half of that sentence and fired everywhere, which moved a 1440 laptop and a 1600 desktop 57px
 * right of where they have been signed off. Those layouts have slack on BOTH sides and nothing to
 * avoid; the cheat exists for windows that are running out of room, not for windows that are not.
 */
const CHEAT_MAX_W = 1100;
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
/**
 * THE WIDTH THE LAYOUT ACTUALLY GETS, WHICH IS NOT THE WINDOW'S — DECLARED ABOVE ITS FIRST READER,
 * deliberately. A `$derived` referenced before its declaration is a temporal dead zone, and this
 * module's subscribers run synchronously during init; that exact mistake cost a 500 on every person
 * page during the auth build.
 *
 * `innerWidth` includes the vertical scrollbar; the box `.page-container` gets does not. Measured at a
 * 900px window, body reads 885 while documentElement still says 900 — and 885 is what the card centres
 * in. ONLY GEOMETRY USES THIS: every THRESHOLD below keeps using `vw`, because those are numbers Sam
 * reads off a browser window and checks by resizing one.
 */
const layoutW = $derived.by(() => {
	void vw; // `vw` is the dependency that makes this re-measure on resize
	if (typeof document === 'undefined') return vw;
	return document.body?.clientWidth || document.documentElement.clientWidth || vw;
});

/**
 * ── SPENDING THE SPACE THE SIBLING COLUMN LEFT BEHIND (083026) ──────────────────────────────────
 *
 * Sam: "deleting the sibling menu is an intentional choice to open up space to move main content
 * right." It was not being spent. `widthClamp` returns the rung's declared u untouched whenever it
 * fits, and on a column-less rung it always fits — so the card sat at 0.82 while the clamp would have
 * allowed 1.03, with 140px of measured gutter doing nothing.
 *
 * So a column-less rung now takes the LARGER of two numbers and caps it:
 *
 *   FLOOR  exactly what it renders today. Nothing anywhere gets smaller than the build Sam approved —
 *          which is what keeps the phone identical, where the bars-aware term wants 0.265 and today's
 *          ladder gives 0.395.
 *   BARS   the largest card that still fits BESIDE the timeline's bars. This is where the freed width
 *          goes, and it is self-limiting: as the window narrows it falls back through the floor on its
 *          own and the rung takes over again, with no threshold to pick.
 *   CAP    `uMax`, the size the 1100 rung delivers, so a narrower window never shows a bigger card
 *          than a wide one.
 *
 * A RUNG WITH A COLUMN IS UNTOUCHED — it keeps `widthClamp` exactly as it was, because there the
 * column is what the right-hand width is for.
 */
/** Are the lifespan bars drawn at all? See TIMELINE_BARS_MIN_W. The stage owns this because it is a
 *  question about the WINDOW, and §33.1 says nothing else may ask one. */
const timelineBars = $derived(vw >= TIMELINE_BARS_MIN_W);
/**
 * A COLUMN-LESS RUNG IS CLAMPED AGAINST THE REAL BOX, NOT THE WINDOW (083026).
 *
 * `innerWidth` counts the vertical scrollbar; `.page-container` does not get it. Measured, that is 15px,
 * and it is the difference between fitting and not: at 820 the clamp allowed 0.82 on a 820px window, and
 * the 759px card plus its two 26px pads came to 811 inside an 805px box — a 6px overflow, which is the
 * one rule Sam has called inviolable. It is also the source of the 13px the phone has been overflowing
 * by all along, which the baseline recorded and nobody had chased.
 *
 * ONLY the column-less rungs move to `layoutW`. Feeding it to the rungs that CARRY the sibling column
 * would re-tune every value from 1050 up — it was tried, and it took 1100 from 0.853 to 0.841 and
 * inverted the continuity there — and those rungs have never overflowed, because the column's own
 * doubled budget leaves them slack. So the law is enforced where it is actually being broken.
 */
const uFloor = $derived(
	widthClamp(rung.u, rung.siblingColumn ? vw : layoutW, rung.siblingColumn)
);
const uBars = $derived(
	rung.siblingColumn ? uFloor : (layoutW - TIMELINE_BARS_W - 2) / (CARD_W_BASE + STAGE_PAD_BASE)
);
const clampedU = $derived(Math.min(rung.uMax ?? rung.u, Math.max(uFloor, uBars)));

/**
 * ── THE OFF-CENTRE CHEAT (083026) ───────────────────────────────────────────────────────────────
 *
 * Sam: "you don't have to 'Center' the main content below 1100px in the browser window, the center
 * line can cheat to the right to use new open space and not impinge on vertical bars and timeline so
 * early." That is the permission this needs and it is the ONLY thing it does — no `u` changes here,
 * no clamp changes, nothing that can alter how big anything is. It moves the composition sideways
 * inside width the layout already has, or it does nothing at all.
 *
 * Measured on the baseline (probe-widths), the space is real and badly distributed: at 1024-1099 the
 * stage leaves 140-178px unused on the right while the bars sit clear, and at 900 the bars are buried
 * under 51px of card with 78px going spare on the same right-hand side.
 *
 * THREE TERMS, and the third is the one that makes 1050 possible:
 *
 *   WANT   how far right the group must move for the card's left edge to clear the bars. Zero once it
 *          already does.
 *   ROOM   how far it CAN move before the group's right edge hits the container's padding. This goes
 *          NEGATIVE when the group is already too wide — which is exactly the sibling column's case at
 *          1050 — and a negative cheat is a cheat LEFT, toward the bars, to make room on the right.
 *   FLOOR  zero, unless the column is present. Without a column there is nothing on the right that
 *          needs room, so moving left could only ever cover more of the timeline for no gain.
 *
 * THE FLOOR IS WHAT PROTECTS THE PHONE, and it does it by arithmetic rather than by a hand-written
 * tier exception — which is precisely how the previous attempt broke. At 393px WANT is 108 and ROOM is
 * about −20, so the cheat resolves to zero and the phone renders exactly as it does today. It is not
 * excluded; it simply has nothing to give, and the formula knows.
 */
/** The column's on-screen width, measured off the baseline: 149 at u=1 and 140 at u=0.853. Held FLAT
 *  at its largest rather than modelled, because over-reserving costs ~9px of cheat and under-reserving
 *  costs an overflow, and only one of those is allowed to happen. */
const colW = $derived(rung.siblingColumn ? SIBLING_COL_BASE : 0);
const shiftX = $derived.by(() => {
	// THE BARS LEAVING MUST NOT MOVE THE CARD. This used to return 0 as soon as the lifespan column
	// stopped being painted, which snapped the composition back to dead centre in the same frame the
	// bars disappeared — a visible jump left at 900 for no reason the reader could see. Sam: "you don't
	// have to actively shift the main content left to cover the space opened by removing vertical bars
	// ... that's just ping ponging main content to cover newly open space, no that only happens for
	// sibling menu disappearing. just don't jump the main content around when vertical bars leave."
	//
	// He is drawing a distinction worth keeping straight. The cheat is a response to the SIBLING COLUMN
	// leaving, which is a change in what the composition contains; the bars are an instrument painted
	// underneath it, and whether they are drawn is not a layout fact. So this is now a function of the
	// window's width alone and `timelineBars` has no say in it — hiding the bars changes what you see
	// and nothing about where anything sits.
	if (vw >= CHEAT_MAX_W) return 0;
	const cardW = CARD_W_BASE * clampedU;
	const padSide = (STAGE_PAD_BASE / 2) * clampedU;
	const naturalLeft = (layoutW - cardW) / 2;
	// RE-CENTRE IN THE SPACE THAT IS LEFT — not "move the minimum distance that clears the bars", which
	// is what this was and what Sam kept having to report. Clearing the bars pinned the card HARD AGAINST
	// them and left the whole freed sibling column sitting empty on the right: measured at 1024, card at
	// L=114 with a 106px gutter. Sam: "the main content never takes advantage of the sibling menu being
	// removed after 1050px and smaller."
	//
	// Centring the card in [BARS_W, layoutW] instead of [0, layoutW] resolves to a constant — the two
	// halves of the arithmetic cancel to exactly half the reserve — which is the literal form of what he
	// asked for: "the center line can cheat to the right to use new open space." The centre line moves
	// right by half the timeline's width, and the space ends up split evenly either side of the card
	// rather than banked on one side of it.
	const want = TIMELINE_BARS_W / 2;
	const room = layoutW - padSide - (naturalLeft + cardW + colW);
	// FLOORED AT ZERO ALWAYS — the cheat only ever moves RIGHT (083026). It was briefly allowed to go
	// negative, so a rung whose column was tight could pull the group left to make room on the right;
	// measured, that fired at 1100-1280 where nothing needed it and dragged the composition 29px left of
	// where Sam has approved it. The cause was `colW` below being held flat at its u=1 value: the column
	// really measures 140 at u=0.853, so `room` read −29 when there were 7px to spare. Rather than model
	// the column's width precisely — an empirical curve that would rot the moment a chip's padding
	// changed — the cheat simply never moves left, which makes an over-estimate of `colW` SAFE in the
	// only direction that matters: it can withhold some rightward cheat, never invent a leftward one.
	return Math.max(0, Math.min(want, room));
});

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
	return 7; // the roomy maximum — NarrativeBlocks' own MAX_DISPLAYED
}
const effectiveNbCap = $derived(Math.min(rung.nbCap ?? 7, nbCapForWidth(vw)));

/**
 * THE VITALS' OWN WHITESPACE, HALVED BELOW 1100px WIDTH. Sam, after seeing it on pixels:
 *
 *     "for mobile sizing at browser width of 1100px or less the death location sits right on top of the
 *      top button edge, while the birth section has a nice gap under photo and the gap between birth and
 *      death sections is healthy too... can the margins between birth and photo, and the gap between
 *      birth and death be reduced by 50% and everything moves up to fill this newly added space? above
 *      1100px browser width everything works well so don't change that."
 *
 * WIDTH, and its own threshold, for the same two reasons `nbCapForWidth` above is: the width clamp means
 * a rung does not predict the rendered width, and the thing that runs out here is a function of width
 * specifically. The portrait column's HEIGHT rides `u` — the photo is `aspect-[3/4] w-full`, so it is a
 * pure function of the column's width — while the dates inside it ride `k`, and §33.2 fixes `k >= u`. So
 * the dates eat a growing share of a shrinking column, and 1100px is where the slack under them reaches
 * zero on the tallest vitals in the corpus.
 *
 * IT SPENDS WHITESPACE, NEVER TYPE. The two values it halves are the gap under the photo and the gap
 * between the two blocks; no size and no line-height moves, at any width. That distinction is the whole
 * of Sam's instruction on this section and it has been got wrong twice already.
 *
 * A BOOLEAN, NOT THE TWO NUMBERS, because the numbers are geometry and belong beside the thing they
 * space; this module owns only the QUESTION about the window. Nothing else may read the window (§33.1).
 */
const TIGHT_VITALS_W = 1100;
const tightVitals = $derived(vw <= TIGHT_VITALS_W);

/**
 * THE RAIL'S RULES SHORTEN BY A QUARTER at or below 780px. Sam: "at <780px and below browser width, we
 * can shrink the width of each line in the timeline by 25%, including pushing the year text left, still
 * in same end of line position but line is shorter."
 *
 * A BOOLEAN HERE, THE LENGTHS THERE, for the same reason tightVitals above is a boolean: this module
 * owns the QUESTION about the window and nothing else may ask one, but the geometry belongs beside the
 * thing it measures. The rail derives its three tiers and its year box from one --tick-len, so a single
 * class swap moves all four together and the year keeps sitting at its rule's right end for free.
 *
 * NOT the frame unit. The rail's own header forbids scaling it with --stage-u — "a ruler at the
 * window's edge is the one thing that should keep its size when the stage shrinks" — and this does not
 * break that rule: it is one deliberate step at one width, not a continuous scale.
 */
const TIGHT_RAIL_W = 780;
const tightRail = $derived(vw <= TIGHT_RAIL_W);

export const stage = {
	/**
	 * HAS THE WINDOW BEEN READ YET? False during SSR and for the first client tick; true forever after.
	 *
	 * This module already knew the answer — `innerWidth.current` is `undefined` until the browser has
	 * one — and the fact was simply never published. Exposing it costs nothing and is not a new
	 * mechanism: it is the same question the SSR_W fallback three hundred lines up is already asking.
	 *
	 * WHAT IT IS FOR. The comment on that fallback says the first paint "settles once on hydrate", and
	 * on any window smaller than 1440x900 that settle is visible: `--stage-u` is published by an
	 * `$effect`, so until it runs every `var(--stage-u, 1)` resolves to the FALLBACK OF 1 — full,
	 * unscaled size — and the whole composition then shrinks into place. Sam, after signing in: "a lot
	 * of the existing UX ... take about 500ms to do weird things before finally settling into position
	 * ... the text in the Paths to Thomas and Connect to Anyone gets too large."
	 *
	 * Auth did not cause that. It made it REPRODUCIBLE, because an OAuth round trip is a full page load
	 * and every sign-in now guarantees a cold paint where before you had to refresh to get one.
	 *
	 * `SettleVeil` reads this and holds a blur over the first paint until it flips.
	 */
	get measured(): boolean {
		return innerWidth.current !== undefined;
	},
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
	/** How far the composition cheats off centre, in CSS px. Positive is right (clearing the timeline's
	 *  bars); negative is left (making room on the right for the sibling column). See shiftX. */
	get shiftX(): number {
		return shiftX;
	},
	/** Are the timeline's LIFESPAN BARS drawn? False below 900px, where a card and the bars' column
	 *  cannot both fit and every arrangement was choosing which to spoil. See TIMELINE_BARS_MIN_W. */
	get timelineBars(): boolean {
		return timelineBars;
	},
	/** At or below 1100px wide, the vitals' two whitespace gaps halve. See tightVitals. */
	get tightVitals(): boolean {
		return tightVitals;
	},
	/** At or below 780px wide, the timeline's rules shorten by 25% and the years follow them left. */
	get tightRail(): boolean {
		return tightRail;
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
export function applyStageVars(el: HTMLElement, u: number, k: number, shiftX = 0): void {
	el.style.setProperty('--stage-u', String(u));
	el.style.setProperty('--type-k', String(k));
	// TWO NON-NEGATIVE VARIABLES RATHER THAN ONE SIGNED ONE, because the consumer is `padding`, which
	// cannot go negative. A cheat right is left-padding, a cheat left is right-padding, and exactly one
	// of them is non-zero at a time. Both default to 0px, so a caller that passes only u and k — /table,
	// a test harness — gets precisely today's centred geometry.
	el.style.setProperty('--stage-shift-l', `${Math.max(0, shiftX)}px`);
	el.style.setProperty('--stage-shift-r', `${Math.max(0, -shiftX)}px`);
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
