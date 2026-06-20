/**
 * flight — the shared crossfade pair for the single-subject morph
 * (DESIGN: "Page transitions" under MOTION LANGUAGE).
 *
 * A person box leaving the DOM (`out:send`) and the element the SAME person
 * enters (`in:receive`) are matched by person-id key; Svelte flies the real DOM
 * element between the two rects. So a clicked spouse chip grows into the featured
 * card, and the previous focus shrinks back into its new box — the live carved
 * card (clip-path + wrapper drop-shadow) travels intact.
 *
 * Used `|global` at the call sites so a box nested inside the keyed FeaturedCard
 * still animates when its ancestor block is the thing being replaced.
 */
import { crossfade } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';
import { prefersReducedMotion } from 'svelte/motion';

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

	return {
		// Distance-scaled, but the FLOOR/SLOPE depend on the flight kind (see flightKind):
		//   spouse swap  → 10% quicker than the prior tuning (brisk in-corner morph)
		//   parent/child → 20% quicker (they read as too slow at the prior tuning)
		// Every coefficient below is the prior value × (spouse 0.9 / relative 0.8).
		duration:
			flightKind === 'spouse'
				? Math.min(617, Math.max(360, 225 + distance * 0.342))
				: Math.min(604, Math.max(352, 218 + distance * 0.336)),
		easing: cubicOut,
		// u = 1 - t: at the start the card exactly overlays the clicked box; settles to identity.
		// z-index 2 + explicit opacity 1: the clicked subject is the HERO — it rides ON TOP
		// (above the outgoing card AND the z-index:1 spouse notch) and NEVER fades, so the
		// user tracks one solid object continuously from chip to featured. Svelte strips the
		// animation styles on completion, so z-index reverts to auto and chips re-dock on top.
		css: (_t: number, u: number) =>
			`z-index: 2; opacity: 1; transform-origin: top left; transform: translate(${u * dx}px, ${u * dy}px) scale(${1 - u * (1 - sx)}, ${1 - u * (1 - sy)});`
	};
}

// The leaving card's flight duration, matched to growFrom's two regimes so grow + shrink stay in
// lockstep when sped up (spouse −10%, parent/child −20% vs the prior tuning). No longer shared
// with any box-reveal clock — destination boxes reveal on the incoming card's ACTUAL landing
// event, not a fraction of this; see +page.svelte.
const SPOUSE_EXIT_MS = 459;
const RELATIVE_EXIT_MS = 452;

/**
 * `out:shrinkTo` — mirror of growFrom for the LEAVING card. Flies the card as one
 * element to its destination box's TRUE rect (the box the old focus becomes,
 * found by data-flight-id), so it lands exactly on the box instead of overshooting.
 * Stays opaque while travelling, fades over the last fifth as it docks.
 */
export function shrinkTo(node: Element, params: { id: string }) {
	if (prefersReducedMotion.current) return { duration: 0 };
	const card = node.getBoundingClientRect();
	const box = document.querySelector(`[data-flight-id="${params.id}"]`)?.getBoundingClientRect();
	if (!box || !card.width || !card.height) return { duration: 0 };

	const dx = box.left - card.left;
	const dy = box.top - card.top;
	const sx = box.width / card.width;
	const sy = box.height / card.height;

	return {
		duration: flightKind === 'spouse' ? SPOUSE_EXIT_MS : RELATIVE_EXIT_MS,
		easing: cubicOut,
		// out: t 1→0, u = 1-t. Identity at the start; overlays the box at the end.
		// z-index 0: the demoting card is the SIDESHOW — it passes UNDERNEATH the incoming
		// hero (z-index 2) and the notch (z-index 1), quietly shrinking into its corner chip.
		// It still cross-fades over the last fifth as its destination box reveals.
		css: (t: number, u: number) =>
			`z-index: 0; transform-origin: top left; opacity: ${Math.min(1, t / 0.2)}; transform: translate(${u * dx}px, ${u * dy}px) scale(${1 - u * (1 - sx)}, ${1 - u * (1 - sy)});`
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

export const [send, receive] = crossfade({
	// Distance-scaled: a farther flight takes a little longer. Clamped so it never
	// drags, and snapped to 0 under prefers-reduced-motion (Tier 1 accessibility).
	duration: (distance: number) => {
		if (prefersReducedMotion.current) return 0;
		return Math.min(560, Math.max(240, 160 + distance * 0.25));
	},
	easing: cubicOut,
	// No counterpart this navigation (a box whose person isn't visible on the other
	// side — e.g. old grandparents exiting, or a child's own children arriving):
	// a soft directional fly + scale/fade. Direction comes from the element's
	// data-flight-dir (ancestors up, descendants down, spouse lateral), per the
	// SPATIAL NAVIGATION flyover spec. Existing transform is preserved (reference).
	fallback: (node: Element) => {
		if (prefersReducedMotion.current) return { duration: 0 };
		const dir = (node as HTMLElement).dataset.flightDir ?? 'lateral';
		const D = 28;
		const dx = dir === 'lateral' ? D : 0;
		const dy = dir === 'up' ? -D : dir === 'down' ? D : 0;
		const base = getComputedStyle(node).transform;
		const t0 = base === 'none' ? '' : base;
		return {
			duration: 300,
			easing: cubicOut,
			// u = 1 - t: offset/shrink at the start, settle to identity at the end.
			css: (t: number, u: number) =>
				`opacity: ${t}; transform: ${t0} translate(${u * dx}px, ${u * dy}px) scale(${0.96 + 0.04 * t});`
		};
	}
});
