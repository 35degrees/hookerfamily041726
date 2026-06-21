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
	// Resolve the destination LAZILY, on the first css sample — NOT synchronously here. Svelte
	// builds an out-transition's keyframes AFTER the DOM flush (inside the dummy animation's
	// onfinish), so by the time css runs, the destination box is mounted — even when it's a CHILD
	// box (the children-slot renders AFTER this featured slot). Resolving synchronously here meant
	// a child destination (parent-click) wasn't mounted yet → querySelector null → the demoted card
	// silently vanished instead of morphing down. Deferring deletes that mount-order fragility: the
	// lookup now always runs once everything is on the page.
	let m: { dx: number; dy: number; sx: number; sy: number } | null | undefined;
	const resolve = () => {
		if (m !== undefined) return m;
		const card = node.getBoundingClientRect();
		const box = document.querySelector(`[data-flight-id="${params.id}"]`)?.getBoundingClientRect();
		if (!box || !card.width || !card.height) return (m = null);
		return (m = { dx: box.left - card.left, dy: box.top - card.top, sx: box.width / card.width, sy: box.height / card.height });
	};
	return {
		duration: flightKind === 'spouse' ? SPOUSE_EXIT_MS : RELATIVE_EXIT_MS,
		easing: cubicOut,
		// out: t 1→0, u = 1-t. Identity at the start; overlays the box at the end.
		// z-index 0: the demoting card is the SIDESHOW — it passes UNDERNEATH the incoming hero
		// (z-index 2) and the notch (z-index 1), quietly shrinking into its new box. It still
		// cross-fades over the last fifth as its destination box reveals. No destination (a rare
		// back/forward nav where the old focus isn't a relative of the new one) → just fade.
		css: (t: number, u: number) => {
			const d = resolve();
			if (!d) return `opacity: ${Math.min(1, t / 0.2)};`;
			return `z-index: 0; transform-origin: top left; opacity: ${Math.min(1, t / 0.2)}; transform: translate(${u * d.dx}px, ${u * d.dy}px) scale(${1 - u * (1 - d.sx)}, ${1 - u * (1 - d.sy)});`;
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
	// No on-screen origin → slide UP from below into the slot, fading in.
	const D = 40;
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
