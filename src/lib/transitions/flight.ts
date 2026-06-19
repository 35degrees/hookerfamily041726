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

// The focus we're leaving, captured at click time (NON-reactive — a plain module
// value, NOT $state). It must never be written inside a reactive effect: the exit
// transition reads it once when it's created, it is not a render dependency.
// (Writing it from set() inside $effect.pre caused effect_update_depth_exceeded.)
let exitingId: string | null = null;

export function captureExiting(id: string | null): void {
	exitingId = id;
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
		// Slower/followable (you asked to be able to track the card), distance-scaled.
		duration: Math.min(720, Math.max(420, 260 + distance * 0.4)),
		easing: cubicOut,
		// u = 1 - t: at the start the card exactly overlays the clicked box; settles to identity.
		css: (_t: number, u: number) =>
			`transform-origin: top left; transform: translate(${u * dx}px, ${u * dy}px) scale(${1 - u * (1 - sx)}, ${1 - u * (1 - sy)});`
	};
}

// Exit pair (card shrinkTo + box hold-reveal) share one duration so they stay in
// lockstep: the box must stay hidden for exactly as long as the card is flying.
const EXIT_MS = 540;

/**
 * `out:shrinkTo` — mirror of growFrom for the LEAVING card. Flies the card as one
 * element to its destination box's TRUE rect (the box the old focus becomes,
 * found by data-flight-id), so it lands exactly on the box instead of overshooting.
 * Stays opaque while travelling, cross-fades over the last fifth as the box reveals.
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
		duration: EXIT_MS,
		easing: cubicOut,
		// out: t 1→0, u = 1-t. Identity at the start; overlays the box at the end.
		css: (t: number, u: number) =>
			`transform-origin: top left; opacity: ${Math.min(1, t / 0.2)}; transform: translate(${u * dx}px, ${u * dy}px) scale(${1 - u * (1 - sx)}, ${1 - u * (1 - sy)});`
	};
}

/**
 * `in:enterBox` — entry for boxes. The box that the old focus is becoming (id ===
 * exitingId) stays HIDDEN until the shrinking card lands on it, then fades in over
 * the last fifth (no separate pop — the card becomes the box). Every other new box
 * does a soft directional fly-in (ancestors from above, descendants from below).
 */
export function enterBox(node: Element, params: { id: string; dir: string }) {
	if (prefersReducedMotion.current) return { duration: 0 };

	// Read-once at transition time (non-reactive). The box the old focus becomes
	// is held hidden until the shrinking card lands on it.
	if (params.id === exitingId) {
		return {
			duration: EXIT_MS,
			easing: cubicOut,
			css: (t: number) => `opacity: ${t < 0.8 ? 0 : (t - 0.8) / 0.2};`
		};
	}

	const D = 28;
	const dx = params.dir === 'lateral' ? D : 0;
	const dy = params.dir === 'up' ? -D : params.dir === 'down' ? D : 0;
	const base = getComputedStyle(node).transform;
	const t0 = base === 'none' ? '' : base;
	return {
		duration: 300,
		easing: cubicOut,
		css: (t: number, u: number) =>
			`opacity: ${t}; transform: ${t0} translate(${u * dx}px, ${u * dy}px) scale(${0.96 + 0.04 * t});`
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
