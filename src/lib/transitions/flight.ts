/**
 * flight — the transitions for the single-subject re-focus morph
 * (DESIGN: "Page transitions" under MOTION LANGUAGE).
 *
 * The FEATURED CARD morphs as one element: `in:growFrom` flies it from the clicked box's
 * click-captured rect to center; `out:shrinkTo` flies the previous focus down into its new box.
 * Each RELATIVE box leaves via `out:flyOut` (a direct outro — no crossfade pairing, since nothing
 * `in:receive`s) which pins it out of flow at its true click-captured rect and fades it in the
 * navigation's pan direction; entering relatives gate on the card landing via `in:markPending`.
 * Click-time captures (origin rect, flight kind, clicked id, pan direction, rect snapshot) live at
 * the top of this file and are read by the transitions during the flush, then cleared one frame on.
 */
import { cubicOut, linear } from 'svelte/easing';
import { prefersReducedMotion } from 'svelte/motion';
import { getCameraMove } from '../state/camera';

// SETTLE (Block 3) — the promotion carries a few px PAST its final rect along the travel vector, then
// decelerates back. Done as ONE C1-continuous easeOutBack curve on the TRANSLATE (not a two-phase
// main-easing-plus-pulse, which decelerates to rest AT the destination then restarts motion — a jerk).
// The card arrives WITH residual velocity, crosses the destination once, overshoots, and returns in a
// single unbroken motion. Translate-only (scale stays cubicOut, lands at 1.0 — no puff). The overshoot
// is a fixed FRACTION of the curve, so its px scale with flight distance (short swap = smaller carry).
// easeOutBack: f(u) = 1 + (1+s)(u−1)³ + s(u−1)²  — overshoots past 1 (the destination) then settles.
function easeOutBack(u: number, s: number): number {
	const p = u - 1;
	return 1 + (1 + s) * p * p * p + s * p * p;
}
// easeOutBack's inherent overshoot is g(s)·distance, g(s) = 4s³ / (27(1+s)²). A fixed s therefore
// flings far swaps (corner-to-corner spouse distances span ~8×). So CLAMP the carry to a few px and
// solve s per-flight to hit it — a short swap carries less, a far one is capped, never a 40px lunge.
function settleBackFor(distance: number): number {
	if (distance < 1) return 0;
	const targetPx = Math.min(5, Math.max(4, distance * 0.01)); // whole-path edge excursion, capped 4–5px
	const targetG = Math.min(0.09, targetPx / distance); // overshoot as a fraction of the translate
	let s = 0.8;
	for (let i = 0; i < 8; i++) {
		const o = 1 + s;
		const g = (4 * s * s * s) / (27 * o * o);
		const dg = (4 * s * s * (3 + s)) / (27 * o * o * o); // dg/ds
		if (dg === 0) break;
		s = Math.max(0.05, s - (g - targetG) / dg);
	}
	return s;
}

// ── Click-time origin capture for the card's "grow from the clicked box" flight ──
// crossfade self-measures rects DURING the DOM update, which is corrupted when the
// children/parents row reflows (all old boxes leave + new boxes enter the same flex
// container). So instead we capture the clicked box's rect at CLICK time — before
// any state change or reflow — and the card flies from that exact rect as a single
// element (manual FLIP). This fixes the origin AND reads as one object, not a
// cross-dissolve between two different elements.
let flightOrigin: DOMRect | null = null;

export function captureFlightOrigin(rect: DOMRect | null): void {
	flightOrigin = rect;
}

// The KIND of the current flight, captured at click time alongside the origin rect. Spouse
// swaps and parent/child clicks now run at DIFFERENT speeds (a spouse swap is a short in-corner
// morph; a parent/child click is a real-distance travel that was never meant to be slowed), and
// distance can't tell them apart (a docked chip is ~as far from the card's top-left as a child
// box). So the click handler tags the flight; growFrom + shrinkTo pick their durations from it.
let flightKind: 'spouse' | 'relative' = 'relative';

export function captureFlightKind(kind: 'spouse' | 'relative'): void {
	flightKind = kind;
}
// Read the current nav's kind. Stable through the whole flight — clearFlightCaptures (1 rAF after
// nav) does NOT reset flightKind, so late lifecycle handlers (introend) can still branch on it.
export function getFlightKind(): 'spouse' | 'relative' {
	return flightKind;
}


// ── Path A captures (parent/child/spouse rows no longer use animate:flip — we pin leavers
// ourselves, at the TRUE click-time positions, so Svelte's fix() can't mis-pin them) ──

// BUG 1 — the box the user clicked. It becomes the featured card via growFrom, so its OLD box
// must NOT also run a leaving animation (the "ghost"). Captured as its data-flight-id.
let clickedId: string | null = null;
export function captureClicked(id: string | null): void {
	clickedId = id;
}

// BUG 2 — the navigation's PAN direction (parent→down, child→up, spouse→lateral). The whole
// scene pans one way, so every leaver drifts toward/through center, not by its static zone.
let panDir: 'up' | 'down' | 'lateral' = 'lateral';
export function capturePanDir(dir: 'up' | 'down' | 'lateral'): void {
	panDir = dir;
}

// The PIVOT — the box the demoted card shrinks INTO (the focus we're leaving, which becomes a
// relative of the new focus). Captured at click as the OLD featured id. Every OTHER incoming box
// can reveal EARLY (overlapping the outgoing fade, so the screen never goes bare); the pivot must
// wait for the card to LAND on it, or it doubles (its box + the shrinking card on screen at once).
let pivotId: string | null = null;
export function capturePivot(id: string | null): void {
	pivotId = id;
}
export function getPivotId(): string | null {
	return pivotId;
}

// BUG 3 — a snapshot of every relative box's TRUE on-screen rect, taken at CLICK time BEFORE
// any state change/reflow, keyed by data-flight-id. A leaver pins itself position:fixed at its
// snapshot rect for the whole out-transition, so it leaves layout flow at the RIGHT spot and the
// incoming boxes settle without being shoved. This is why animate:flip had to go: its fix() runs
// AFTER the new boxes are inserted (each.js), so it measured — and pinned — the shoved position.
type PinRect = { left: number; top: number; width: number; height: number };
let rectSnapshot = new Map<string, PinRect>();
export function captureRects(boxes: Iterable<Element>): void {
	const next = new Map<string, PinRect>();
	for (const node of boxes) {
		const el = node as HTMLElement;
		const id = el.dataset.flightId;
		if (!id) continue;
		const r = el.getBoundingClientRect();
		next.set(id, { left: r.left, top: r.top, width: r.width, height: r.height });
	}
	rectSnapshot = next;
}

// Clear the per-navigation captures one frame after the transition flush consumed them, so a
// later nav with NO click (back/forward) can't reuse a stale id / direction / pinned rect.
export function clearFlightCaptures(): void {
	clickedId = null;
	panDir = 'lateral';
	pivotId = null;
	rectSnapshot = new Map();
}

// VELOCITY-CEILING duration for a RELATIVE (parent/child) flight — shared by the PROMOTION (growFrom)
// and, ×DEMOTE_LEAD, the DEMOTION (shrinkTo), so both inherit the same physics. NOT a global slowdown:
// near flights keep the ~410ms floor (unchanged feel); FAR flights EXTEND so the card's average
// on-screen speed never exceeds RELATIVE_V_CEIL — a distant relative travels with weight, not a missile.
//
// THE TUNING KNOB: RELATIVE_V_CEIL is the single constant to adjust by feel. At 1.6 a typical flight is
// back to its pre-ceiling speed (738px ≈ 461ms vs the old 466ms; 600px ≈ 410ms) while the true 1000px+
// missiles Sam flagged are still capped (1000px 625ms, 1300px 813ms — vs uncapped 554/604). The crossover
// (where the cap starts extending duration past the 410ms floor) is ~656px. Raise it → faster/lighter;
// lower it → slower/heavier. (Was 1.28, which overcorrected — it slowed typical flights too.)
const RELATIVE_V_CEIL = 1.6; // avg px/ms — tune by feel
export function relativeGrowMs(distance: number): number {
	return Math.min(1000, Math.max(410, distance / RELATIVE_V_CEIL));
}
// SPOUSE promotion duration — now the SAME velocity family as the parent/child regime (V-ceiling 1.6),
// just a higher floor (SPOUSE_FLOOR_MS) so the in-corner swaps carry human weight instead of snapping.
// The floor covers every swap up to ~784px (SPOUSE_FLOOR_MS·V_CEIL), so the whole common spouse range
// lands in ONE tight duration band (flattened — a short top-center swap and a full-width swap feel the
// same speed); only true cross-screen swaps scale up at the shared 1.6 px/ms ceiling. This is the FLOOR
// for the hero; spouseHeroDurationMs below may EXTEND it so the demote can travel at honest velocity.
const SPOUSE_FLOOR_MS = 490;
export function spouseGrowMs(distance: number): number {
	return Math.min(1000, Math.max(SPOUSE_FLOOR_MS, distance / RELATIVE_V_CEIL));
}

// HONEST VELOCITY (the photo-whiplash fix). With transform-origin top-left, a card shrinking into its
// top-right notch seat moves its LEFT / BOTTOM-LEFT corner — where the PHOTO lives — FAR more than its
// top-left corner (for slot→notch the top-right corner barely moves, the bottom-left moves most). Timing
// the demote off top-left/corner travel let the photo run ~2× the velocity ceiling and STROBE (browsers
// don't motion-blur). So measure the MAX displacement over all four corners — the fastest point, the
// photo's path — and time off THAT, so no corner exceeds the ceiling.
function maxCornerTravel(a: PinRect, b: PinRect): number {
	let m = 0;
	for (const cx of [0, 1])
		for (const cy of [0, 1]) {
			const dx = b.left + cx * b.width - (a.left + cx * a.width);
			const dy = b.top + cy * b.height - (a.top + cy * a.height);
			m = Math.max(m, Math.hypot(dx, dy));
		}
	return m;
}
// The spouse hero's promotion duration, EXTENDED when the demote's honest-velocity clock needs it so the
// two share ONE clock and the demote can finish first WITHOUT cramming: max(the promotion curve, the
// demote's own honest duration + the finish lead). Both growFrom (returns this) and shrinkTo (returns this
// − the lead) call it with the same (heroDist, demote max-corner travel), so demote lands exactly the lead
// ahead of the hero and no point on EITHER card ever exceeds the ceiling.
const SPOUSE_FINISH_LEAD_MS = 60;
function spouseHeroDurationMs(heroDist: number, demoteMaxCorner: number): number {
	const ownDuration = demoteMaxCorner / RELATIVE_V_CEIL; // honest: fastest corner obeys the ceiling
	return Math.max(spouseGrowMs(heroDist), ownDuration + SPOUSE_FINISH_LEAD_MS);
}
// The RELATIVE demotion runs shorter than its matching promotion (×this lead) so it always FINISHES first
// — the leaving card releases attention to the hero and never competes with the hero's landing. (The
// SPOUSE demote gets its finish-first from spouseHeroDurationMs / SPOUSE_FINISH_LEAD_MS above, at honest
// velocity — see shrinkTo.)
const DEMOTE_LEAD = 0.85;

/**
 * `in:growFrom` — fly the featured card from the click-captured box rect to its
 * own layout position (canonical FLIP, top-left origin). Consumes the captured
 * rect, so a cold load / back-forward nav (no click) just appears instantly.
 */
export function growFrom(node: Element) {
	const origin = flightOrigin;
	flightOrigin = null; // consume: no click → no stale reuse
	if (!origin || prefersReducedMotion.current) return { duration: 0 };
	const dest = node.getBoundingClientRect();
	if (!dest.width || !dest.height) return { duration: 0 };

	const dx = origin.left - dest.left;
	const dy = origin.top - dest.top;
	const sx = origin.width / dest.width;
	const sy = origin.height / dest.height;
	const distance = Math.hypot(dx, dy);

	// Distance-scaled; the floor/slope depend on the flight kind (spouse = brisk in-corner morph,
	// parent/child = velocity-capped travel).
	let duration: number;
	if (flightKind === 'spouse') {
		// Extend the hero to honor the demote's honest-velocity clock (below), so the two share one clock
		// and neither the growing hero nor the shrinking demote ever exceeds the ceiling. The demote starts
		// at THIS slot (dest) and shrinks into the pivot's notch seat; its max-corner travel sets the floor.
		const seat = pivotId ? document.querySelector(`[data-flight-id="${pivotId}"]`)?.getBoundingClientRect() : null;
		const demoteMax = seat && seat.width ? maxCornerTravel(dest, seat) : distance;
		duration = spouseHeroDurationMs(distance, demoteMax);
	} else {
		duration = relativeGrowMs(distance);
	}
	// SETTLE (Block 3) — SPOUSE promotions only for now, and only on a warm click (the camera store
	// published a spouse move; cold loads don't and shouldn't settle). The overshoot direction is the
	// flight's own (dx,dy) axis — identical to the camera screenVector (validated by probe-camera).
	const settleActive = flightKind === 'spouse' && getCameraMove()?.kind === 'spouse';
	const settleS = settleActive ? settleBackFor(distance) : 0;
	if (import.meta.env.DEV && settleActive) {
		const g = (4 * settleS ** 3) / (27 * (1 + settleS) ** 2);
		console.log('[settle]', JSON.stringify({ dist: Math.round(distance), s: +settleS.toFixed(2), carryPx: +(g * distance).toFixed(1) }));
	}
	return {
		duration,
		// LINEAR clock: t = real-time progress. Scale and translate carry their OWN curves in css so the
		// spouse translate can be one C1-continuous easeOutBack (no two-phase decelerate-then-restart).
		easing: (x: number) => x,
		// z-index 2 + explicit opacity 1: the clicked subject is the HERO — it rides ON TOP (above the
		// outgoing card AND the z-index:1 spouse notch) and NEVER fades, so the user tracks one solid
		// object continuously from chip to featured. Svelte strips the animation styles on completion.
		css: (t: number) => {
			// WHOLE-PATH overshoot: ONE eased value drives BOTH translate AND scale, so the card's
			// expansion ITSELF carries past the final rect (left edge past via translate, right/bottom via
			// scale) and retracts both together — desync is impossible, killing the fixed-top-edge lope.
			// Spouse promotion overshoots (easeOutBack, e>1 → u<0 → scale>1 & translate past dest); every
			// other promotion is plain cubicOut. Endpoints frozen: e(0)=0, e(1)=1.
			const e = settleActive ? easeOutBack(t, settleS) : cubicOut(t);
			const u = 1 - e;
			return `z-index: 2; opacity: 1; transform-origin: top left; transform: translate(${u * dx}px, ${u * dy}px) scale(${1 - u * (1 - sx)}, ${1 - u * (1 - sy)});`;
		}
	};
}

// The leaving card's flight duration, matched to growFrom's two regimes so grow + shrink stay in
// lockstep when sped up (spouse −10%, parent/child −20% vs the prior tuning). No longer shared
// with any box-reveal clock — destination boxes reveal on the incoming card's ACTUAL landing
// event, not a fraction of this; see +page.svelte.
// Demoted-card morph durations — slowed ~20% (was 459 / 452) so the morph reads less rushed.
const SPOUSE_EXIT_MS = 551;
const RELATIVE_EXIT_MS = 542;

/**
 * `out:shrinkTo` — mirror of growFrom for the LEAVING card. Flies the card as one
 * element to its destination box's TRUE rect (the box the old focus becomes,
 * found by data-flight-id), so it lands exactly on the box instead of overshooting.
 * Stays opaque while travelling, fades over the last fifth as it docks.
 */
export function shrinkTo(node: Element, params: { id: string }) {
	if (prefersReducedMotion.current) return { duration: 0 };
	const el = node as HTMLElement;
	const card = node.getBoundingClientRect(); // the card's START rect (center) — stable through the flight
	if (!card.width || !card.height) return { duration: 0 };
	const relative = flightKind === 'relative';
	// The demoting card's chip-face (a PersonBox, natural 220×75) — counter-scaled per frame below so
	// it renders undistorted inside the shell's non-uniform morph. Cached once. BOTH kinds now use it:
	// the spouse demote is a visible solid object too (Layer 2 — unified with the L3a relative machinery),
	// flying up-right into its notch seat and atomic-swapping into the real chip at landing.
	const face = el.querySelector('.demote-chipface') as HTMLElement | null;
	const FACE_W = 220;
	const FACE_H = 75;
	// Demotion duration: derived from the HERO's flight — the SAME distance-scaled curve the promotion
	// uses for this kind, then ×DEMOTE_LEAD so the demote finishes ~15% sooner and clears the stage
	// before the hero lands. Distance = the clicked box (hero origin, snapshotted at click) → the featured
	// slot (which the demote starts from and the hero lands on: card ≈ hero dest). Using the CLICKED rect,
	// not the destination box, sidesteps mount-order (a child box may not be mounted yet at outro init).
	let demoteDuration = relative ? RELATIVE_EXIT_MS : SPOUSE_EXIT_MS;
	const heroOrigin = clickedId ? rectSnapshot.get(clickedId) : undefined;
	const heroDist = heroOrigin ? Math.hypot(heroOrigin.left - card.left, heroOrigin.top - card.top) : 0;
	if (relative) {
		if (heroOrigin) demoteDuration = relativeGrowMs(heroDist) * DEMOTE_LEAD;
	} else {
		// SPOUSE demote at HONEST VELOCITY: time off the MAX-corner travel (the photo's fast bottom-left
		// path), not the top-left corner — so the photo never strobes. It shares the hero's extended clock
		// (spouseHeroDurationMs) and lands exactly SPOUSE_FINISH_LEAD_MS ahead — finish-first without any
		// cramming multiplier. (Same seat + same slot rect as growFrom, so both compute the same clock.)
		const seat = document.querySelector(`[data-flight-id="${params.id}"]`)?.getBoundingClientRect();
		const demoteMax = seat && seat.width ? maxCornerTravel(card, seat) : heroDist;
		const heroDuration = heroOrigin ? spouseHeroDurationMs(heroDist, demoteMax) : SPOUSE_EXIT_MS;
		demoteDuration = heroDuration - SPOUSE_FINISH_LEAD_MS;
	}
	return {
		duration: demoteDuration,
		// SPOUSE demote uses LINEAR (constant velocity) so the fast-moving photo corner never exceeds the
		// ceiling — cubicOut's fast start peaks at ~3-4× the average and strobes the photo, which no
		// duration can fix (it's a peak-to-average problem, not a distance one). The demote is a supporting
		// glide to its seat, so constant velocity reads clean. RELATIVE demote keeps cubicOut (approved).
		easing: relative ? cubicOut : linear,
		// TICK, not css: the destination box can MOVE during the flight. When the new hero's card is a
		// different height, the featured-slot height glide shifts the children/parent rows — e.g. on
		// X00126 (9 children) → father X03175 (1 child) the destination's bottom rises ~118px mid-
		// flight. A css transition resolves the destination ONCE (early) and the card lands on that
		// stale spot, ending ~116px BELOW the settled box (the overshoot). Re-querying the box EVERY
		// frame makes the card track it to its FINAL position — it nestles in from above, never below.
		// (Re-querying also keeps the Phase-1 mount-order fix: a not-yet-mounted child box just yields
		// no transform that frame.) z-index — BOTH kinds are now visible-by-design solid objects that
		// fly OVER resting content en route to their seat, so the demote rides at z 1 (above resting
		// boxes/rows/notch, below the growing hero at z 2). The notch-hide (chipExit hides every OTHER
		// spouse chip) keeps exactly two movers on stage: this demote and the hero.
		tick: (t: number, u: number) => {
			el.style.zIndex = '1';
			// SOLID object: opacity 1 the whole way to its seat, no terminal fade — the user tracks one
			// continuous card shrinking into its chip. (Spouse was formerly hidden ["covered by emptiness"]
			// to retire Artifact A's edge-peek; Layer 2 makes it a visible second baseball card instead, so
			// you can follow the card→chip AND the chip→card as discrete objects trading places. The seat
			// chip reveals on the demote's LANDING via the onOutgoingEnd atomic swap, like the relative box.)
			el.style.opacity = '1';
			const box = document.querySelector(`[data-flight-id="${params.id}"]`)?.getBoundingClientRect();
			if (!box || !box.width) return;
			const dx = box.left - card.left;
			const dy = box.top - card.top;
			const sx = box.width / card.width;
			const sy = box.height / card.height;
			const Sx = 1 - u * (1 - sx);
			const Sy = 1 - u * (1 - sy);
			el.style.transformOrigin = 'top left';
			el.style.transform = `translate(${u * dx}px, ${u * dy}px) scale(${Sx}, ${Sy})`;
			// "flip early, land as a chip": the chip-face is a real PersonBox (identical to the box it
			// becomes). The shell's morph is NON-uniform (Sx ≠ Sy), which would stretch the face; so
			// counter-scale it every frame — scale(afx, afy) with afx·Sx = afy·Sy = U — so the composite
			// (shell × face) is a UNIFORM scale U. The face therefore renders at its true 220:75 aspect at
			// every frame (never stretched), spans the shell's width, and stays vertically centered in the
			// shell (the whitespace above/below in the tall early shell is honest, not a taffy chip). U =
			// shellWidth/FACE_W; at landing Sx=box.w/card.w so U→1 and the face lands at natural box size.
			if (face) {
				const afx = card.width / FACE_W; // → afx·Sx = U (spans the shell's width)
				const afy = (card.width * Sx) / (FACE_W * Sy); // → afy·Sy = U (same uniform scale)
				const tfy = card.height / 2 - (FACE_H * card.width * Sx) / (2 * FACE_W * Sy); // vertical center
				face.style.transformOrigin = 'top left';
				face.style.transform = `translate(0px, ${tfy}px) scale(${afx}, ${afy})`;
			}
			// The pivot box is revealed by the outro-END callback (onOutgoingEnd) — the atomic swap fires
			// the frame the card leaves. The card's outer shell/opacity here are unchanged.
		}
	};
}

/**
 * `in:markPending` — entry hook for destination boxes (parents, children, spouse chips).
 *
 * Replaces the old `enterBox` CLOCK (which revealed boxes at a fixed fraction of EXIT_MS and
 * so RACED the distance-scaled card flight — the intermittent flicker). A Svelte `in:` runs
 * ONLY for elements that actually enter, so this fires for newly-arriving boxes but NOT for
 * persisting ones (e.g. children shared across a spouse swap keep their element and never
 * re-run it). It does no animation of its own (duration 0): it just hides the box and flags
 * it `data-pending`. The page then fades every pending box in on the featured card's REAL
 * landing event (introend) — reveal tied to the cause, not a timer. Reduced motion: no-op,
 * so boxes appear immediately.
 */
export function markPending(node: Element) {
	if (prefersReducedMotion.current) return { duration: 0 };
	const el = node as HTMLElement;
	el.style.opacity = '0';
	el.dataset.pending = '';
	return { duration: 0 };
}

/**
 * `in:morphIn` — entrance for a PARENT box (Phase 2: the couple promotes together). A person who
 * changes zone WITH an on-screen ORIGIN — most visibly the hero's spouse promoting to the father
 * slot on a child click — MORPHS as a discrete card from its old box's click-captured rect up into
 * the parent slot, the same way the featured card grows from the clicked chip. A parent with NO
 * on-screen origin this navigation slides UP from below into its slot (a directional entrance, not
 * a fade-in-place). The PIVOT (the demoted hero) is excluded: the demoted CARD already morphs into
 * that slot via shrinkTo, so here the box just hides like markPending and the seam cross-dissolve
 * reveals it. Reduced motion: instant.
 */
export function morphIn(node: Element, params: { id: string }) {
	if (prefersReducedMotion.current) return { duration: 0 };
	const el = node as HTMLElement;
	// Pivot: the demoted card morphs into this slot; hold the box hidden until that hand-off reveals it.
	if (params.id === pivotId) {
		el.style.opacity = '0';
		el.dataset.pending = '';
		return { duration: 0 };
	}
	const dest = node.getBoundingClientRect();
	const old = rectSnapshot.get(params.id);
	if (old && dest.width && dest.height) {
		// MORPH from the person's old on-screen box (e.g. the father's spouse-chip) — a discrete card.
		const dx = old.left - dest.left;
		const dy = old.top - dest.top;
		const sx = old.width / dest.width;
		const sy = old.height / dest.height;
		return {
			duration: 360,
			easing: cubicOut,
			// z-index 1: above the leaving chips, below the hero card (z-index 2). Solid (opacity 1)
			// so the user tracks one object lifting out of its chip and into the slot.
			css: (_t: number, u: number) =>
				`z-index: 1; opacity: 1; transform-origin: top left; transform: translate(${u * dx}px, ${u * dy}px) scale(${1 - u * (1 - sx)}, ${1 - u * (1 - sy)});`
		};
	}
	// No on-screen origin → slide UP from below into the slot, fading in. 150px so the rise reads.
	const D = 150;
	return {
		duration: 300,
		easing: cubicOut,
		// u = 1 - t: starts offset DOWN + transparent, settles up to rest, opaque.
		css: (t: number, u: number) => `opacity: ${t}; transform: translate(0px, ${u * D}px);`
	};
}

/**
 * `in:slideChip` — entrance for a spouse chip docking into the carved notch. NOT a
 * fade-in-place: the chip (most visibly the just-demoted previous focus) enters from
 * BELOW-RIGHT and travels up-and-left into its top-right resting spot, matching the
 * directional-motion language the parent/child relatives speak.
 *
 * Decoupled from the landing reveal (markPending / featuredLanded): a `delay` starts it
 * PARTWAY through the swap flight — ~40% sooner than the old land-and-fade — so the chip
 * is already arriving before the featured card firmly settles, then finishes just after
 * the card docks. (This re-introduces a small fixed clock, but only for the chip, and the
 * early start is now the GOAL — not a reveal racing the card's landing.)
 *
 * MUST be applied to an INNER wrapper, never the .flight box that carries data-flight-id:
 * the outgoing card's shrinkTo reads that box's getBoundingClientRect at flight start to
 * know where to land, and a transform on it would send the card to the wrong place. A
 * transform on a DESCENDANT leaves the ancestor's border box (hence its rect) untouched.
 * Reduced motion: instant (duration 0), so the chip just appears.
 */
const CHIP_SLIDE = 24; // px: starts +CHIP_SLIDE down-and-right, settles up-and-left to 0
export function slideChip(_node: Element) {
	if (prefersReducedMotion.current) return { duration: 0 };
	return {
		delay: 200, // begin partway through the swap flight — ~40% sooner than land-and-fade
		duration: 260,
		easing: cubicOut,
		// u = 1 - t: offset down-and-right + transparent at the start; settles to rest, opaque.
		css: (t: number, u: number) =>
			`opacity: ${t}; transform: translate(${u * CHIP_SLIDE}px, ${u * CHIP_SLIDE}px);`
	};
}

/**
 * `out:flyOut` — the leaving transition for a relative box. A DIRECT out-transition, not a
 * crossfade `send`: there is never an `in:receive` to pair with, and crossfade's deferred pairing
 * kept a `duration:0`-suppressed leaver RENDERED for the whole morph (the ghost — the clicked box
 * lingering as a static, full-opacity duplicate that re-flowed to center). A direct outro returning
 * `{duration:0}` removes the element on the spot. Three click-captured signals shape it:
 *   BUG 1 — if this key is the clicked person, remove it instantly: it's becoming the featured card
 *           via the morph, and a second leaving copy is the ghost.
 *   BUG 3 — pin position:fixed at the TRUE click-time rect so it leaves layout flow at the right
 *           spot (incoming boxes settle without being shoved). Replaces flip's fix(), which
 *           mis-pinned at the post-insertion position.
 *   BUG 2 — drift in the navigation's PAN direction (camera pan) while fading.
 */
export function flyOut(_node: Element, params: { key: string }) {
	if (prefersReducedMotion.current) return { duration: 0 };
	// BUG 3: pin at the pre-reflow viewport rect so the box leaves layout flow at the right spot
	// (incoming boxes settle without being shoved). Replaces flip's fix(), which mis-pinned.
	const snap = rectSnapshot.get(params.key);
	const pin = snap
		? `position: fixed; left: ${snap.left}px; top: ${snap.top}px; width: ${snap.width}px; height: ${snap.height}px; margin: 0; `
		: '';
	// BUG 1: the clicked box is becoming the featured card via the morph. It LEAVES the children
	// each while the SAME id enters the featured each — a key collision that makes a duration:0
	// outro fail to remove it, so it lingers as a static, full-opacity duplicate (the ghost +
	// teleport). We can't rely on removal, so we PIN it out of flow and force it INVISIBLE for the
	// whole flight: opacity 0 the entire time, so the only thing the user tracks is the morphing
	// card. (Pinned in the same flush as the siblings → no separate reflow, no sideways shove.)
	if (params.key === clickedId) {
		return { duration: 360, easing: cubicOut, css: () => `${pin}opacity: 0;` };
	}
	// BUG 2: pan direction (parent→down, child→up, spouse→lateral), shared by all leavers.
	const D = 28;
	const dx = panDir === 'lateral' ? D : 0;
	const dy = panDir === 'up' ? -D : panDir === 'down' ? D : 0;
	return {
		duration: 300,
		easing: cubicOut,
		// u = 1 - t: in place + opaque at the start, drifts to the pan offset + fades as it goes.
		css: (t: number, u: number) =>
			`${pin}opacity: ${t}; transform: translate(${u * dx}px, ${u * dy}px) scale(${0.96 + 0.04 * t});`
	};
}

/**
 * `out:chipExit` — leave transition for a SPOUSE CAROUSEL chip. A chip that was OFF the visible
 * window at click time (mask-clipped, invisible at rest) must also leave invisibly: on the crossfade
 * the mask adopts the incoming card's clip state, which no longer clips this departing chip, so a
 * normal flyOut would paint it at its true off-card rect (Artifact B-residual). The render marks such
 * chips `data-offwindow="true"`; here they exit at duration 0 / opacity 0 — never painted. In-window
 * chips (and every ≤3-card chip, which is never off-window) fall through to the normal flyOut.
 */
export function chipExit(node: Element, params: { key: string }) {
	// SPOUSE PROMOTION notch-hide: on a spouse-chip click, ALL other notch chips hide immediately
	// (opacity 0) so the promoted chip (→ hero) is the only notch element visible during the flight —
	// nothing beneath/behind the hero, retiring Artifact A for the spouse regime. Non-degenerate
	// duration so Svelte cleans the outro (the floater lesson). Off-window chips hide the same way.
	if (flightKind === 'spouse' || (node as HTMLElement).dataset.offwindow === 'true') {
		return { duration: 60, css: () => 'opacity: 0; visibility: hidden;' };
	}
	return flyOut(node, params);
}
