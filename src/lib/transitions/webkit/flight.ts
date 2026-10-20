/**
 * webkit/flight.ts — the WebKit engine: Safari's parent, child, sibling and spouse promotions.
 *
 * PORTED FROM THE KENNEDY TEST BED (Oct 2026; its docs/HOOKER_PORT.md and docs/MOTION_WEBKIT.md hold the
 * films and measurements behind every rule here). WebKit only: Chrome never reaches this file, and keeps
 * Hooker's own transitions (../flight.ts) byte for byte. The click decides per flight which engine flies it
 * (state/navigate.ts), and the page's transitions ask gate.ts, so the two never mix inside one flight.
 *
 * What Hooker needed that Kennedy did not, marked HOOKER below: the slot's height glide off before the swap
 * (so the rows under it are measured where they rest); landing and release hooks for the page's own signals;
 * the blade's clock (publishHeroSchedule) and its retract on the leaving card; releaseHeld(), so Hooker's
 * hovers, tiers and its own flights can take back the chips this engine holds at rest; and every Safari
 * overshoot 10% shorter (lessCarry).
 *
 * Kennedy's original header:
 *
 * Crossfade's idea (send/receive, keyed by person), done Safari's way. Hooker's flights ran their
 * motion as Svelte transitions that measured seats, fitted text and repainted shadows on every frame.
 * Safari draws a new animation's first frames from the main thread and only then hands it to its
 * compositor, so any per-frame script work delays that hand-off, and the compositor then snaps to
 * the true clock (the skipped middle). So here, by construction:
 *
 *   1. Everything is MEASURED ONCE: the click-time rects (capture) and the new layout right after
 *      the swap (launch), before anything moves.
 *   2. Every element is PAINTED AT ITS STARTING POSE first (inline styles, one frame), so the arriving
 *      card's layers exist and are rasterised before its clock starts.
 *   3. Then every move is handed to the browser WHOLE, as Web Animations of transform and opacity only,
 *      created in the same task so they share one clock. Easing curves (the settle) are sampled into
 *      keyframes; holds and step-swaps are written into the keyframes, never as delays or callbacks.
 *   4. No script runs during the flight. The only callback is the landing, after the card is still.
 *
 * Svelte's part is small: `out:depart` keeps a leaving element mounted (and pins it where it stood)
 * long enough for its animation; nothing uses `in:`.
 */
import { flushSync } from 'svelte';
import { flightState } from './flightState.js';
import { isWebKit } from '#lib/state/engine.js';
import { getSiblingNavPlan, clearSiblingNavPlan } from '#lib/state/siblingNav.js';
import { publishHeroSchedule, retractBladeIn } from '../flight.js';
import {
	type Rect,
	easeOutBack,
	solveBackS,
	cubicOut,
	settleBackFor,
	relativeGrowMs,
	spouseGrowMs,
	maxCornerTravel,
	DEMOTE_LEAD,
	demoteSettleBackFor,
	DEMOTE_SETTLE_PARENT_FACTOR,
	DEMOTE_SETTLE_CHILD_FACTOR,
	DEMOTE_SETTLE_SIBLING_FACTOR,
	siblingBaseMs,
	siblingGrowMs,
	SIBLING_FINISH_LEAD_MS,
	SPOUSE_FINISH_LEAD_MS,
	spouseHeroDurationMs,
	SIBLING_SEAT_HOLD,
	SIBLING_SHAPE_AT,
	centerTravel,
	ROW_TRAVEL_FALLBACK,
	ROW_SOLID,
	ROW_GONE,
	CHIP_REVEAL_MS,
	CONNECTOR_REVEAL_MS,
	FACE_OUT_HI,
	FACE_OUT_LO,
	FACE_IN_HI,
	FACE_IN_LO,
	FACE_SCALE_MAX,
	clamp01
} from './tempo.js';

type Pan = 'up' | 'down' | 'lateral';
type Snap = Rect & { dir?: string };

/** Everything a flight needs to know about the board as it stood at the click. */
type Capture = {
	/** 'sibling' runs on its own dial and lands in the sibling panel (Hooker §19). */
	kind: 'relative' | 'sibling' | 'spouse';
	pan: Pan;
	clickedId: string | null;
	pivotId: string | null;
	origin: Rect;
	card: Rect | null;
	slot: Rect | null;
	snaps: Map<string, Snap>;
	before: WeakSet<Element>;
	leaving: { el: HTMLElement; key: string; card: boolean }[];
	/** The leaving card's clock, the army's clock and one row's pitch: all known at the click. */
	D: number;
	rowMs: number;
	pitch: number;
};

let capture: Capture | null = null;

/**
 * A leaving element stays mounted for its own animation plus the frames spent painting the starting
 * poses before the clocks start, so every leaver is gone about when the card lands and clicks are taken
 * again. Svelte reads this during the swap's flush, so it can only depend on the click-time capture.
 */
const START_SLACK_MS = 150;
/** How much longer than its estimated clock a spouse swap's leaving card stays mounted. */
const SPOUSE_LEAVE_MARGIN_MS = 100;
/*
 * WHY CLICKS WAIT FOR EVERY LEAVER (see the landing): a click that brings back a person whose element is
 * still leaving makes Svelte REVIVE that element, and Svelte then reuses the leave it was first given
 * without asking `depart` again, so the next time it leaves it is neither pinned nor animated (filmed in
 * a rapid-click trace: the old card sat, fully visible, behind the new one for over a second).
 */

/**
 * SAFARI'S HAND-OFF, measured 14 Oct 2026 (Jackie → Black Jack, filmed in Sam's Safari 27). Safari starts
 * an animation's clock when it is created, but its compositor first draws it ~75ms later, already that far
 * along: one frame at the start pose, the next at ~50% (the "missing middle"). Nothing on our main thread
 * is in the way (busy 13ms). So every track's first SAFARI_HOLD_MS repeat its starting pose, written INTO
 * the keyframes (a `delay` keeps the animation off the compositor until it ends: Hooker §58.3f). The hold
 * passes while Safari is still preparing that first frame, so it is not a visible pause. WebKit only:
 * Chrome draws from the first frame. The whole flight shifts by it, so every relation between clocks holds.
 *
 * 80 → 40 (Sam, 14 Oct: "a little snappier on click"). Filmed three takes each at 80, 60 and 40: all step
 * evenly from the first visible frame (at 40 the first frame already shows ~4% of the motion). Not lower
 * without more films: with no hold, the skip was there.
 */
const SAFARI_HOLD_MS = 40;
const holdMs = () => (isWebKit() ? SAFARI_HOLD_MS : 0);

/** Prepend a hold of `ms` to a track: its first pose, repeated, then everything as it was. */
function withHold(track: Track, ms: number): Track {
	if (ms <= 0) return track;
	const n = track.frames.length;
	const D = track.duration;
	const frames = track.frames.map((f, i) => {
		const off = typeof f.offset === 'number' ? f.offset : n > 1 ? i / (n - 1) : 0;
		return { ...f, offset: (ms + off * D) / (ms + D) };
	});
	return { ...track, frames: [{ ...track.frames[0], offset: 0 }, ...frames], duration: D + ms };
}
/** Safari only (Sam, 14 Oct: "better! I'll take it"): the arriving card's overshoot vs Hooker's (see heroS). */
const SAFARI_SETTLE_BOOST = 1.75;
/**
 * HOOKER (Sam, Oct 17): every overshoot in Safari 10% shorter, "in distance terms". Applied to the solved
 * curve, not to its inputs, so it is exactly 10% of the carry for every settle (the card, the entering rows,
 * the demoted chip), whether or not that settle sits on a floor or a cap: easeOutBack carries g(s) of the
 * travel, g(s) = 4s³ / 27(1+s)², and the curve is re-solved for 0.9 × g(s).
 */
const SAFARI_CARRY = 0.9;
/** Hooker morphIn's fixed clock for a person moving from their old chip into a parent seat. */
const MORPH_IN_MS = 360;
function lessCarry(s: number): number {
	if (s <= 0) return 0;
	const g = (4 * s * s * s) / (27 * (1 + s) * (1 + s));
	return solveBackS(SAFARI_CARRY * g);
}
/** A survivor whose place moved glides there this long (Hooker's flipMs). */
const SURVIVOR_GLIDE_MS = 420;
/** A leaver that is neither the card nor in a marching row fades for this long. */
const FADE_OUT_MS = 300;
/** Inline styles a flight puts on a leaving element, all given back if Svelte revives it. */
const LEAVING_PROPS = [
	'position',
	'left',
	'top',
	'width',
	'height',
	'margin',
	'opacity',
	'z-index',
	'transform-origin',
	'will-change'
];
/** Samples per sampled curve. Linear between samples; ~1 per frame at 60Hz for a 500ms flight. */
const SAMPLES = 30;
/** A step written into keyframes: two poses this close in offset. */
const EPS = 1e-4;

const toRect = (r: DOMRect): Rect => ({
	left: r.left,
	top: r.top,
	width: r.width,
	height: r.height
});

/**
 * THE CLICK. Snapshot the board exactly as it stands, before any state changes. Returns false when
 * there is nothing to fly from (no card on screen), so the caller just swaps.
 */
export function captureFlight(anchor: HTMLElement, pivotId: string | null): boolean {
	const card = document.querySelector('.featured-flight:not([data-leaving])');
	const slot = document.querySelector('.featured-slot');
	if (!card) return false;
	const relation = anchor.getAttribute('data-relation');
	const snaps = new Map<string, Snap>();
	const before = new WeakSet<Element>();
	for (const el of document.querySelectorAll<HTMLElement>('[data-flight-id]')) {
		before.add(el);
		const id = el.dataset.flightId;
		if (id) snaps.set(id, { ...toRect(el.getBoundingClientRect()), dir: el.dataset.flightDir });
	}
	before.add(card);
	const origin = toRect(anchor.getBoundingClientRect());
	const cardRect = toRect(card.getBoundingClientRect());
	const slotRect = slot ? toRect(slot.getBoundingClientRect()) : null;
	let upTop: number | null = null;
	for (const s of snaps.values()) if (s.dir === 'up') upTop = Math.max(upTop ?? -Infinity, s.top);
	const derived = slotRect && upTop !== null ? Math.round(slotRect.top - upTop) : 0;
	const kind = relation === 'sibling' ? 'sibling' : relation === 'spouse' ? 'spouse' : 'relative';
	// The sibling demote rides the arriving card's base clock (centre travel), finishing a beat early and
	// then sitting in its seat for the last SEAT_HOLD of its run.
	// A spouse swap's clock depends on the leaving card's seat, unknown until the swap. The old card's
	// seat is in the new card's notch, near the chip that was clicked, so the clicked chip stands in for it
	// here (with a margin); this only decides how long Svelte keeps the leaving card mounted, and launch
	// computes the real clock.
	const D =
		kind === 'spouse'
			? spouseHeroDurationMs(
					Math.hypot(origin.left - cardRect.left, origin.top - cardRect.top),
					maxCornerTravel(cardRect, origin)
				) -
				SPOUSE_FINISH_LEAD_MS +
				SPOUSE_LEAVE_MARGIN_MS
			: kind === 'sibling'
				? Math.max(
						300,
						(siblingBaseMs(centerTravel(origin, slotRect ?? cardRect)) - SIBLING_FINISH_LEAD_MS) /
							(1 - SIBLING_SEAT_HOLD)
					)
				: relativeGrowMs(maxCornerTravel(origin, cardRect)) * DEMOTE_LEAD;
	capture = {
		kind,
		pan: relation === 'parent' ? 'down' : relation === 'child' ? 'up' : 'lateral',
		clickedId: anchor.closest<HTMLElement>('[data-flight-id]')?.dataset.flightId ?? null,
		pivotId,
		origin,
		card: cardRect,
		slot: slotRect,
		snaps,
		before,
		leaving: [],
		D,
		rowMs: relativeGrowMs(maxCornerTravel(origin, slotRect ?? cardRect)) * DEMOTE_LEAD,
		pitch: derived >= 90 && derived <= 260 ? derived : ROW_TRAVEL_FALLBACK
	};
	return true;
}

/** The clicked chip's rect, for the sibling plan (computed before the swap, while the capture is live). */
export function peekOrigin(): Rect | null {
	return capture?.origin ?? null;
}

/**
 * EVERY ELEMENT KEEPS ITS LAST FRAME UNTIL IT MOVES AGAIN. Two Safari facts, both filmed (MOTION_WEBKIT.md):
 * an animation that ends on its own is dropped by the compositor a frame before the main thread commits
 * the resting state (the seat blinked off); and an element under a transform animation is drawn ~1px from
 * where it is drawn at rest, so ANY release snaps it by that pixel (Hooker §58.8; Sam: "everything settles
 * like 1–2px more" once the card lands). So nothing is ever released into rest: each element's finished,
 * forward-filling animations are kept here and cancelled only in the task that gives it new ones, where
 * the new motion takes over in the same commit. Every final frame is the resting state, so a held element
 * looks exactly as it would at rest.
 */
const held = new WeakMap<Element, Animation[]>();

/** HOOKER: every held animation, so they can all be let go at once (see releaseHeld). */
const allHeld = new Set<Animation>();

/**
 * HOOKER: LET GO OF EVERY HELD FRAME. A held final frame pins an element's transform and opacity, which
 * would override what Hooker's own code does to the same chips afterwards: a cross-connection flight hides
 * the roster with a class, the child tier lifts and dims chips with classes, Hooker's flights drive inline
 * styles. So before any of those runs (navigate.ts, the page's tier and history handlers), the engine's holds
 * are cancelled. That releases each element into rest, the ~1px step the holds exist to avoid, but at a
 * moment when the thing the user asked for is moving the same elements anyway.
 */
export function releaseHeld(): void {
	for (const a of allHeld) a.cancel();
	allHeld.clear();
	// …and the board goes back to Hooker's own stacking (layout.css: `.wk-board`), before Hooker's flight
	// measures anything.
	document.querySelector('.featured-slot')?.classList.remove('wk-board');
}

/** Drop a capture that will not be flown (the fetch failed, the page is about to reload, or the arriving
 *  board needs Hooker's own flight after all). */
export function abandonFlight(): void {
	capture = null;
	flightState.active = false;
}

/** Whether the engine owns the flight now running (from the swap to the landing). */
export const engineFlying = () => flightState.active;

/**
 * `out:depart` — keep a leaving element mounted for its animation, pinned where it stood at the click
 * so the arriving layout never sees it. With no flight (a cold load, Back/Forward) it leaves at once.
 */
export function depart(node: Element, params: { key: string; card?: boolean }) {
	const cap = capture;
	if (!cap) return { duration: 0 };
	const el = node as HTMLElement;
	const snap = params.card ? cap.card : cap.snaps.get(params.key);
	el.dataset.leaving = '';
	if (snap) {
		el.style.position = 'fixed';
		el.style.left = `${snap.left}px`;
		el.style.top = `${snap.top}px`;
		el.style.width = `${snap.width}px`;
		el.style.height = `${snap.height}px`;
		el.style.margin = '0';
		// HOOKER: the rows carry animate:flip, and Svelte pins an animated leaver itself (its `fix()`:
		// position absolute plus a corrective translate). Whichever of the two runs first, the pin here wins
		// (fix() leaves a position:fixed element alone), and its stray translate must not ride along.
		el.style.transform = '';
	}
	cap.leaving.push({ el, key: params.key, card: !!params.card });
	const dir = el.dataset.flightDir;
	const own = params.card
		? cap.D
		: params.key === cap.clickedId || dir === 'lateral'
			? 0 // hidden the instant the clock starts (launch)
			: (dir === 'up' || dir === 'down') && cap.pan !== 'lateral'
				? cap.rowMs
				: FADE_OUT_MS;
	return { duration: own + holdMs() + START_SLACK_MS }; // the hidden ones too: they stay for the painted frame
}

/**
 * A REVIVED LEAVER. When a person whose element is still leaving comes back onto the board, Svelte
 * stops the leave and keeps the element, with every pose the flight gave it (pinned, invisible). Svelte
 * clears `inert` when it does this, which is how one is told apart from an element still leaving.
 */
function restoreRevived(): void {
	for (const el of document.querySelectorAll<HTMLElement>('[data-leaving]')) {
		if (el.inert) continue; // still leaving
		for (const a of el.getAnimations({ subtree: true })) a.cancel();
		for (const k of LEAVING_PROPS) el.style.removeProperty(k);
		for (const inner of el.querySelectorAll<HTMLElement>('.card-top, .demote-chipface'))
			inner.style.removeProperty('will-change');
		el.classList.remove('flat', 'leaving', 'spouse-demote', 'wk-flight');
		delete el.dataset.leaving;
	}
}

// ── Keyframe building ──────────────────────────────────────────────────────────────────────────────

type Track = { el: HTMLElement; frames: Keyframe[]; duration: number; fill: FillMode };

/**
 * A motion that starts `start` ms into the flight and lasts `dur`, sampled from `pose(t)`, t ∈ [0,1].
 * The wait before it is written into the keyframes (a held first pose), never as a delay.
 */
function sampled(
	el: HTMLElement,
	start: number,
	dur: number,
	pose: (t: number) => Keyframe,
	fill: FillMode = 'forwards',
	n = SAMPLES
): Track {
	const total = start + dur;
	const frames: Keyframe[] = [];
	if (start > 0) frames.push({ ...pose(0), offset: 0 });
	for (let i = 0; i <= n; i++) {
		const t = i / n;
		frames.push({ ...pose(t), offset: (start + t * dur) / total, easing: 'linear' });
	}
	return { el, frames, duration: total, fill };
}

/** Append a step at the end of a track: the last pose, then `after` an instant later (held by fill). */
function endWith(track: Track, after: Keyframe): Track {
	const last = track.frames[track.frames.length - 1];
	last.offset = 1 - EPS;
	track.frames.push({ ...last, ...after, offset: 1 });
	track.fill = 'forwards';
	return track;
}

/** Hidden until `at` ms, then shown (a step, or a fade of `fadeMs`), as one compositor animation. */
function revealAt(el: HTMLElement, at: number, fadeMs = 0, to = 1): Track {
	if (fadeMs <= 0) {
		return {
			el,
			frames: [
				{ opacity: 0, offset: 0 },
				{ opacity: 0, offset: 1 - EPS },
				{ opacity: to, offset: 1 }
			],
			duration: Math.max(1, at),
			fill: 'forwards'
		};
	}
	const total = at + fadeMs;
	return {
		el,
		frames: [
			{ opacity: 0, offset: 0 },
			{ opacity: 0, offset: at / total },
			{ opacity: to, offset: 1 }
		],
		duration: total,
		fill: 'forwards'
	};
}

/** An element that is leaving the board (or belongs to one that is): Svelte removes it after its flight. */
const isLeaver = (el: HTMLElement) => !!el.closest('[data-leaving]');

/**
 * A LEAVER'S MOTION MUST OUTLIVE THE LEAVER. When an animation finishes, Safari's compositor drops it and
 * draws the element from the last state the page committed for it. For a leaver that is where it stood
 * BEFORE the flight: the old card full size and fully visible, a leaving chip back in its old row. Safari
 * then showed those, behind the new board, until Svelte removed them, longer when it was busy (Sam: "layers
 * of cards… it always resolved itself"; worst on Lee's three husbands, back and forth). So a leaver's track
 * holds its last frame (gone, or on its seat) for LEAVER_TAIL_MS more, far past its removal: it is never
 * finished while the element exists, and Safari never falls back.
 */
const LEAVER_TAIL_MS = 4000;
function outliveElement(track: Track): Track {
	const D = track.duration;
	const total = D + LEAVER_TAIL_MS;
	const frames = track.frames.map((f, i) => {
		const n = track.frames.length;
		const off = typeof f.offset === 'number' ? f.offset : n > 1 ? i / (n - 1) : 0;
		return { ...f, offset: (off * D) / total };
	});
	frames.push({ ...track.frames[track.frames.length - 1], offset: 1 });
	return { ...track, frames, duration: total, fill: 'forwards' };
}

/** Rect → the transform that draws an element laid out at `dest` exactly over `from` (origin top left). */
const flipFrom = (from: Rect, dest: Rect) => ({
	dx: from.left - dest.left,
	dy: from.top - dest.top,
	sx: from.width / dest.width,
	sy: from.height / dest.height
});

// ── The flight ─────────────────────────────────────────────────────────────────────────────────────

/** The page's part of a flight: its own landing signals, and its clicks back. */
export type LaunchHooks = {
	/** The arriving card is at rest (Hooker's onIncomingLand: featuredLanded, landedPersonId, the panel). */
	onLanded: () => void;
	/** Every leaver is gone from the page: clicks may be taken again (unlockFlight). */
	onReleased: () => void;
};

/** One frame at ~60Hz, for the blade's clock (the clocks start two frames after the swap). */
const FRAME_MS = 1000 / 60;

/**
 * THE SWAP. `swap` sets the new person (featured.set); it is flushed synchronously so the new board is in
 * the DOM, measured once and posed in the same task, painted once, and every clock starts the frame after
 * (fly; Kennedy's order).
 *
 * HOOKER: the slot has an explicit height (the card's bound clientHeight plus the cross-connections blade's
 * reservation). Both are already final when the flush returns (checked on 18 flights of every kind); what
 * would move the rows under the slot is the slot's own 300ms height glide, so `.wk-flight` switches the glide
 * off BEFORE the swap and the rows are measured where they will rest. (A first version waited one frame here
 * for the bindings instead. They never needed it, and the wait was a full first render of the new board in
 * Safari, the "full beat" Sam felt between the click and the motion, Oct 17.)
 */
export function launch(swap: () => void, hooks: LaunchHooks): void {
	const cap = capture;
	const slot = document.querySelector<HTMLElement>('.featured-slot');
	if (cap) {
		flightState.active = true;
		// No height glide for this flight, and the engine's constant stacking (layout.css) from now until
		// Hooker's own flights take the board back (releaseHeld).
		slot?.classList.add('wk-flight', 'wk-board');
	}
	// No clock yet: a blade mounting in this flush fits at once (fitBlade defers only for a running clock),
	// so the slot's reservation is final when the flush returns.
	publishHeroSchedule({ duration: 0, delay: 0, kind: 'relative', axis: 'lateral' });
	swap();
	flushSync();
	restoreRevived();
	if (!cap) {
		hooks.onLanded();
		return hooks.onReleased();
	}
	capture = null; // per navigation; `depart` has already run for every leaver

	const leaving = new Set(cap.leaving.map((l) => l.el));
	const hero = document.querySelector<HTMLElement>('.featured-flight:not([data-leaving])');
	if (!hero) {
		flightState.active = false;
		slot?.classList.remove('wk-flight');
		hooks.onLanded();
		return hooks.onReleased();
	}

	// The blade draws on the card's clock (../flight.ts unsheathBlade, read a tick after this flush). It is
	// estimated here from the card's seat; the clock starts two frames from now, after Safari's hold.
	const seatNow = toRect(hero.getBoundingClientRect());
	publishHeroSchedule({
		duration:
			cap.kind === 'spouse'
				? spouseGrowMs(Math.hypot(cap.origin.left - seatNow.left, cap.origin.top - seatNow.top))
				: cap.kind === 'sibling'
					? siblingGrowMs(centerTravel(cap.origin, seatNow))
					: relativeGrowMs(maxCornerTravel(cap.origin, seatNow)),
		delay: 2 * FRAME_MS + holdMs(),
		kind: cap.kind,
		axis: cap.pan === 'lateral' ? 'lateral' : 'vertical'
	});

	fly(cap, hero, leaving, slot, hooks);
}

/** The board measured once, every element posed, painted, then set moving on one clock. */
function fly(
	cap: Capture,
	hero: HTMLElement,
	leaving: Set<HTMLElement>,
	slot: HTMLElement | null,
	hooks: LaunchHooks
): void {
	// ── Measure the new board, once. Leavers are already pinned out of flow. ──
	const dest = toRect(hero.getBoundingClientRect());
	const arrivals = [...document.querySelectorAll<HTMLElement>('[data-flight-id]')].filter(
		(el) => !leaving.has(el) && !cap.before.has(el)
	);
	const arrivalRect = new Map(arrivals.map((el) => [el, toRect(el.getBoundingClientRect())]));
	const connectors = [...document.querySelectorAll<HTMLElement>('.connector')];
	const connectorOpacity = new Map(
		connectors.map((c) => [c, Number(getComputedStyle(c).opacity) || 0.75])
	);

	// ── The clocks, all from Hooker's tempo. ──
	// A spouse swap shares ONE clock between the two cards (Hooker spouseHeroDurationMs): long enough for
	// the leaving card to reach its notch seat at its own honest velocity, landing SPOUSE_FINISH_LEAD_MS
	// before the arriving card.
	const spouseSeatRect =
		cap.kind === 'spouse'
			? arrivalRect.get(arrivals.find((el) => el.dataset.flightId === cap.pivotId) as HTMLElement)
			: undefined;
	const H =
		cap.kind === 'spouse'
			? spouseHeroDurationMs(
					Math.hypot(cap.origin.left - dest.left, cap.origin.top - dest.top),
					cap.card && spouseSeatRect ? maxCornerTravel(cap.card, spouseSeatRect) : 0
				)
			: cap.kind === 'sibling'
				? siblingGrowMs(centerTravel(cap.origin, dest))
				: relativeGrowMs(maxCornerTravel(cap.origin, dest)); // the arriving card
	const D = cap.kind === 'spouse' ? H - SPOUSE_FINISH_LEAD_MS : cap.D; // the leaving card
	const { rowMs, pitch } = cap; // the army, one row's pitch

	const tracks: Track[] = [];
	const inline: { el: HTMLElement; props: Record<string, string> }[] = [];
	/** Inline styles that hold an element's starting pose for the one painted frame before the clock. */
	const pose = (el: HTMLElement, props: Record<string, string>) => {
		// A last-frame hold from the previous flight would override this starting pose: drop it now.
		for (const a of held.get(el) ?? []) {
			a.cancel();
			allHeld.delete(a);
		}
		held.delete(el);
		inline.push({ el, props });
		for (const [k, v] of Object.entries(props)) el.style.setProperty(k, v);
	};
	const cleanup: (() => void)[] = [];
	/** A leaver that vanishes the instant the motion starts: a step on the clock, so after Safari's hold. */
	const goneAtStart = (el: HTMLElement): Track => ({
		el,
		frames: [
			{ opacity: 1, offset: 0 },
			{ opacity: 1, offset: 1 - EPS },
			{ opacity: 0, offset: 1 }
		],
		duration: 1,
		fill: 'forwards'
	});

	// ── 1. THE ARRIVING CARD grows out of the chip that was clicked. ──
	const h = flipFrom(cap.origin, dest);
	// SAFARI ONLY (Sam, 14 Oct: "try making bigger", then "better! I'll take it"). Safari draws the settle
	// soft and sharpens it in one frame at rest (MOTION_WEBKIT.md), so a 4.5–5.4px carry read as a glitch
	// rather than an overshoot. A bigger carry is meant to read as deliberate motion. Revert: set to 1.
	const heroS = lessCarry(settleBackFor(Math.hypot(h.dx, h.dy), SAFARI_SETTLE_BOOST));
	const heroPose = (t: number): Keyframe => {
		const u = 1 - easeOutBack(t, heroS);
		return {
			transform: `translate(${u * h.dx}px, ${u * h.dy}px) scale(${1 - u * (1 - h.sx)}, ${1 - u * (1 - h.sy)})`
		};
	};
	hero.classList.add('flat');
	hero.style.transformOrigin = 'top left';
	hero.style.willChange = 'transform';
	// NO MINIATURE CARD STANDING STILL (Sam: "the inner content of the chip turns into his fully formed
	// Featured Card… text unreadable"). Hooker's rule was that the arriving card never sits at chip size:
	// it moves from its first frame. Here the clicked chip itself stays on screen through the painted frame
	// and Safari's hold, and chip and card swap in the frame the growth begins (both steps on the clock).
	pose(hero, { transform: heroPose(0).transform as string, opacity: '0' });
	tracks.push(sampled(hero, 0, H, heroPose));
	tracks.push(revealAt(hero, 1));

	// ── 2. THE LEAVING CARD shrinks into its seat on the new board (the pivot). On a sibling promotion
	// the seat is a chip in the sibling panel, at the rest position the panel is gliding to (siblingNav). ──
	const outgoing = cap.leaving.find((l) => l.card)?.el;
	const sibPlan = cap.kind === 'sibling' ? getSiblingNavPlan() : null;
	const pivotSeat = sibPlan
		? (document.querySelector<HTMLElement>(`[data-sib-seat-id="${cap.pivotId}"]`) ?? undefined)
		: arrivals.find((el) => el.dataset.flightId === cap.pivotId);
	if (outgoing && cap.card) {
		outgoing.classList.add('flat', 'leaving');
		// Marks the spouse-swap demote for one Safari-only rule (layout.css: its shadow is not drawn).
		if (cap.kind === 'spouse') outgoing.classList.add('spouse-demote');
		outgoing.style.transformOrigin = 'top left';
		outgoing.style.zIndex = '1';
		outgoing.style.willChange = 'transform';
		const seatRect = sibPlan ? sibPlan.seat : pivotSeat ? arrivalRect.get(pivotSeat) : undefined;
		if (seatRect) {
			const card = cap.card;
			const d = flipFrom(seatRect, card); // seat expressed as a transform of the card
			const factor = sibPlan
				? DEMOTE_SETTLE_SIBLING_FACTOR
				: pivotSeat?.dataset.flightDir === 'up'
					? DEMOTE_SETTLE_PARENT_FACTOR
					: DEMOTE_SETTLE_CHILD_FACTOR;
			// The spouse demote has no settle and runs on a linear clock, as in Hooker (its honest velocity is
			// already the constraint; a settle in the corner read as a lunge).
			const spouse = cap.kind === 'spouse';
			const s = spouse
				? 0
				: lessCarry(
						demoteSettleBackFor(
							Math.hypot(d.dx, d.dy),
							Math.hypot(seatRect.width, seatRect.height),
							factor
						)
					);
			// A sibling demote reaches its seat by 1 − SEAT_HOLD and sits there; its footprint is final by
			// SHAPE_AT of the travel, so a chip-sized card carries the big settle (Hooker shrinkTo).
			const shell = (t: number) => {
				const u = sibPlan ? Math.min(1, t / (1 - SIBLING_SEAT_HOLD)) : t;
				const e = spouse ? u : easeOutBack(u, s);
				const k = sibPlan ? cubicOut(Math.min(1, u / SIBLING_SHAPE_AT)) : e;
				return { e, Sx: 1 - k * (1 - d.sx), Sy: 1 - k * (1 - d.sy) };
			};
			tracks.push(
				endWith(
					sampled(outgoing, 0, D, (t) => {
						const { e, Sx, Sy } = shell(t);
						return {
							transform: `translate(${e * d.dx}px, ${e * d.dy}px) scale(${Sx}, ${Sy})`,
							opacity: 1
						};
					}),
					{ opacity: 0 }
				)
			);
			// The face swap, keyed to the shell's width in parent-chip widths (Hooker's bands). The face is
			// the chip this person becomes: always a copy of the SEAT itself, so the face that lands is the
			// seat to the pixel. The card's own chip face (a parent-sized chip) was scaled to fit, and on a
			// child seat (smaller, its own type sizes) the layout visibly changed at the swap (Sam: Caroline's
			// content "jerks wider" as she lands). The card's chip face is only the fallback.
			const chipFace = outgoing.querySelector<HTMLElement>('.demote-chipface');
			const top = outgoing.querySelector<HTMLElement>('.card-top');
			const bandW = chipFace?.offsetWidth || seatRect.width;
			let face = chipFace;
			let faceW = bandW;
			let faceH = chipFace?.offsetHeight || seatRect.height;
			const seatBox = pivotSeat?.querySelector<HTMLElement>('.person-box') ?? null;
			if (seatBox) {
				face = seatBox.cloneNode(true) as HTMLElement;
				faceW = seatRect.width;
				faceH = seatRect.height;
				face.setAttribute('aria-hidden', 'true');
				face.setAttribute('inert', '');
				face.style.cssText =
					`position: absolute; left: 0; top: 0; width: ${faceW}px; height: ${faceH}px; ` +
					`transform-origin: top left; opacity: 0; pointer-events: none;`;
				outgoing.appendChild(face);
			}
			const uNat = (t: number) => (shell(t).Sx * card.width) / bandW;
			if (top) {
				top.style.willChange = 'opacity';
				tracks.push(
					sampled(
						top,
						0,
						D,
						(t) => ({ opacity: clamp01((uNat(t) - FACE_OUT_LO) / (FACE_OUT_HI - FACE_OUT_LO)) }),
						'forwards'
					)
				);
			}
			if (face && pivotSeat) {
				if (!seatBox) {
					// The face reads exactly what the seat it becomes will read (a child seat's married name).
					const seatName = pivotSeat.querySelector('[data-chip-name]')?.textContent;
					const faceName = face.querySelector('[data-chip-name]');
					if (seatName && faceName) faceName.textContent = seatName;
				}
				face.style.willChange = 'transform, opacity';
				const f = face;
				tracks.push(
					sampled(
						f,
						0,
						D,
						(t) => {
							const { Sx, Sy } = shell(t);
							const U = Math.min(FACE_SCALE_MAX, (Sx * card.width) / faceW);
							const tx = card.width / 2 - (U * faceW) / (2 * Sx);
							const ty = card.height / 2 - (U * faceH) / (2 * Sy);
							return {
								transform: `translate(${tx}px, ${ty}px) scale(${U / Sx}, ${U / Sy})`,
								opacity: clamp01((FACE_IN_HI - uNat(t)) / (FACE_IN_HI - FACE_IN_LO))
							};
						},
						'forwards'
					)
				);
			}
			// The seat appears in the frame the card leaves — a step on the same clock. A seat IN THE NOTCH
			// (a spouse swap) waits for the landing instead: the notch rides above the card at rest, and a
			// flying card is flat, so a seat shown before the notch is carved sits on the card's uncut corner.
			// In Hooker the flying card covered it until landing; here it arrives with the notch, as every
			// spouse chip does.
			if (pivotSeat) {
				pose(pivotSeat, { opacity: '0' });
				tracks.push(revealAt(pivotSeat, pivotSeat.closest('.spouse-notch') ? H : D));
			}
		} else {
			// No seat on the new board: the card simply fades where it stood.
			tracks.push(
				endWith(
					sampled(outgoing, 0, D, (t) => ({ opacity: 1 - cubicOut(t) })),
					{ opacity: 0 }
				)
			);
		}
	}

	// ── 3. THE LEAVING CHIPS. ──
	const march = cap.pan === 'down' ? pitch : cap.pan === 'up' ? -pitch : 0;
	for (const { el, key, card } of cap.leaving) {
		if (card) continue;
		const dir = el.dataset.flightDir;
		if (key === cap.clickedId || dir === 'lateral') {
			// The clicked chip IS the arriving card; the old card's spouse chips go with its corner.
			// Both stay for the painted frame, so the old board is whole until the clock starts.
			tracks.push(goneAtStart(el));
			continue;
		}
		if ((dir === 'up' || dir === 'down') && march) {
			// THE ARMY: every row steps the camera's way, one pitch, solid while you can see it.
			el.style.zIndex = '-1';
			tracks.push(
				endWith(
					sampled(el, 0, rowMs, (t) => {
						const u = cubicOut(t);
						return {
							transform: `translateY(${u * march}px)`,
							opacity: clamp01((ROW_GONE - u) / (ROW_GONE - ROW_SOLID))
						};
					}),
					{ opacity: 0 }
				)
			);
			continue;
		}
		tracks.push(
			endWith(
				sampled(el, 0, FADE_OUT_MS, (t) => {
					// Hooker flyOut's fallback: a 28px drift the camera's way, a 4% shrink, a fade.
					const e = cubicOut(t);
					const dx = cap.pan === 'lateral' ? 28 * e : 0;
					const dy = cap.pan === 'down' ? 28 * e : cap.pan === 'up' ? -28 * e : 0;
					return {
						transform: `translate(${dx}px, ${dy}px) scale(${1 - 0.04 * e})`,
						opacity: 1 - e
					};
				}),
				{ opacity: 0 }
			)
		);
	}

	// ── 4. THE ARRIVING CHIPS. ──
	// How much the card slot grew between the boards (its height glide in Chrome, off in Safari's flights).
	const slotNow = slot?.getBoundingClientRect();
	const slotGrow = cap.slot && slotNow ? slotNow.bottom - (cap.slot.top + cap.slot.height) : 0;
	for (const el of arrivals) {
		const id = el.dataset.flightId;
		if (id === cap.pivotId || inline.some((p) => p.el === el)) continue; // already held above
		const dir = el.dataset.flightDir;
		if (dir === 'lateral') {
			// Spouse chips dock into the notch once the card has landed.
			pose(el, { opacity: '0' });
			tracks.push(revealAt(el, H, CHIP_REVEAL_MS));
			continue;
		}
		// A PERSON WHO WAS ALREADY ON THE BOARD MORPHS FROM THERE (Hooker morphIn; most visibly the hero's spouse
		// becoming a parent on a child click). Sam, Oct 19: in Safari "the overshoot direction and angle is not
		// right" — the engine slid them up as a row chip. Chrome flies them as one discrete card from the chip
		// they were, along their own path, and only they carry the demote settle on that path: the same
		// `demoteSettleBackFor` (factor 1) on their own vector and seat, on morphIn's 360ms clock. Their old chip
		// goes at the start (the leaving loop's `goneAtStart`), in the frame this one takes its place.
		const was = id ? cap.snaps.get(id) : undefined;
		const seat = arrivalRect.get(el);
		if (dir === 'up' && was && seat && seat.width && seat.height) {
			const dx = was.left - seat.left;
			const dy = was.top - seat.top;
			const sx = was.width / seat.width;
			const sy = was.height / seat.height;
			const morphS = lessCarry(demoteSettleBackFor(Math.hypot(dx, dy), Math.hypot(seat.width, seat.height)));
			const morphPose = (t: number): Keyframe => {
				const u = 1 - easeOutBack(t, morphS);
				return {
					transform: `translate(${u * dx}px, ${u * dy}px) scale(${1 - u * (1 - sx)}, ${1 - u * (1 - sy)})`,
					opacity: 1
				};
			};
			el.style.transformOrigin = 'top left';
			el.style.zIndex = '1'; // above the leaving chips, below the arriving card (Hooker morphIn)
			cleanup.push(() => {
				el.style.removeProperty('transform-origin');
				el.style.removeProperty('z-index');
			});
			pose(el, { transform: morphPose(0).transform as string, opacity: '1' });
			tracks.push(sampled(el, 0, MORPH_IN_MS, morphPose));
			continue;
		}
		// Rows enter from the camera's trailing edge, so they can never cross the rows leaving. A row BELOW the
		// card also rides the card slot's height change, as Chrome's does: there the children row is carried by
		// `.featured-slot`'s height glide (layout) on top of its march, and Safari's flights switch that glide
		// off (`.wk-flight`), so the travel is added here instead. Measured on John Hooker → Sarah, Chrome's
		// children came 176px (139 march + 37 slot) and Safari's 139.
		const ride = dir === 'down' ? slotGrow : 0;
		const fromY =
			(cap.pan === 'down' ? -pitch : cap.pan === 'up' ? pitch : dir === 'down' ? -pitch : pitch) - ride;
		// THE ENTERING ROWS DO NOT OVERSHOOT (Sam, Oct 19, after reviewing Chrome: "the only child chip that
		// overshoots is the featured hero card that's been demoted… your parent chips are trying to do the same
		// thing"). In Safari every arriving chip carried the card's own settle, so a whole row overshot as one
		// unit — the Kennedy rule of 14 Oct ("the card and the parent chips overshoot"), which Hooker's Chrome
		// never had: its rows arrive on a plain cubicOut (+page revealPending, morphIn without an origin). Only
		// the demoted card and a person morphing from their old chip (above) carry a settle, each on their own
		// path, like a discrete baseball card. Same clock and travel as before; the curve is Chrome's.
		const rowPose = (t: number): Keyframe => {
			const e = cubicOut(t);
			return { transform: `translateY(${(1 - e) * fromY}px)`, opacity: cubicOut(t) };
		};
		pose(el, { transform: rowPose(0).transform as string, opacity: '0' });
		// ON THE ROW CLOCK, as in Chrome (rowClockMs: the demote's tempo), not the arriving card's longer H. On H
		// the children were still sliding when the demoted card overshot its seat beside them (Sam: "jerky at
		// the end… I don't even think the overshoot on the demoted featured card is working right"), so the
		// settle read against a moving row. Chrome's row lands first (385ms) and the card's carry peaks against
		// a still row: design §20.1, "fix the ground, then re-judge".
		tracks.push(sampled(el, 0, rowMs, rowPose));
	}

	// ── 4b. THE SURVIVORS: people on both boards (the children a couple shares on a spouse swap) stay, and
	// glide from where they stood if their place moved (Hooker's animate:flip, 420ms cubicOut). ──
	for (const el of document.querySelectorAll<HTMLElement>('[data-flight-id]')) {
		if (leaving.has(el) || !cap.before.has(el)) continue;
		const was = cap.snaps.get(el.dataset.flightId ?? '');
		if (!was) continue;
		const now = el.getBoundingClientRect();
		const dx = was.left - now.left;
		const dy = was.top - now.top;
		if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
		const glide = (t: number): Keyframe => {
			const u = 1 - cubicOut(t);
			return { transform: `translate(${u * dx}px, ${u * dy}px)` };
		};
		pose(el, { transform: glide(0).transform as string });
		tracks.push(sampled(el, 0, SURVIVOR_GLIDE_MS, glide));
	}

	// ── 5. THE CONNECTORS are scaffolding for the landed board: gone at the click, back at landing. ──
	for (const c of connectors) {
		c.style.transition = 'none';
		pose(c, { opacity: '0' });
		tracks.push(revealAt(c, H, CONNECTOR_REVEAL_MS, connectorOpacity.get(c)));
		cleanup.push(() => (c.style.transition = ''));
	}

	// ── Paint the starting poses once, THEN start every clock together: Kennedy's order, exactly as filmed. ──
	// The poses are set in the task that swapped the board; Safari then renders and paints that frame (its
	// first render of the new card, the slow one), and only in the frame after does any clock start. Start the
	// clocks any sooner and that render lands inside the motion: the parent promotion skips its middle again
	// (Sam, Oct 17, after a version that started them one frame after the swap). DO NOT SHORTEN THIS.
	hero.classList.add('wk-flight');
	if (outgoing) outgoing.classList.add('wk-flight');
	requestAnimationFrame(() => requestAnimationFrame(() => {
		if (import.meta.env.DEV) {
			const now = hero.getBoundingClientRect();
			const want = heroPose(0).transform;
			console.log(
				'[wk-flight]',
				JSON.stringify({
					kind: cap.kind,
					H: Math.round(H),
					D: Math.round(D),
					rowMs: Math.round(rowMs),
					leaveEstimate: Math.round(cap.D),
					pitch,
					heroStartW: Math.round(now.width),
					want
				})
			);
		}
		const hold = holdMs();
		const animations = tracks
			.map((t) => withHold(t, hold))
			.map((t) => (isLeaver(t.el) ? outliveElement(t) : t))
			.map((tr) =>
				tr.el.animate(tr.frames, { duration: tr.duration, fill: tr.fill, easing: 'linear' })
			);
		// This flight's motion replaces whatever each element was holding from the last one (see `held`).
		for (const tr of tracks) {
			for (const a of held.get(tr.el) ?? []) {
				a.cancel();
				allHeld.delete(a);
			}
			held.delete(tr.el);
		}
		// The animations now own every pose; the inline starting poses go in the same task.
		for (const { el, props } of inline)
			for (const k of Object.keys(props)) el.style.removeProperty(k);
		// HOOKER: the leaving card's blade goes back into its case as it starts to leave (as onOutgoingStart
		// does for Hooker's flights), on the same clock as everything else.
		if (outgoing) retractBladeIn(outgoing);

		const heroAnim = animations[0];
		void heroAnim.finished
			.catch(() => {})
			.then(() => {
				hero.classList.remove('flat', 'wk-flight');
				slot?.classList.remove('wk-flight');
				flightState.active = false;
				clearSiblingNavPlan();
				publishHeroSchedule({ duration: 0, delay: 0, kind: 'relative', axis: 'lateral' });
				hooks.onLanded();
				// Clicks come back once every leaver is actually gone from the page (see WHY CLICKS WAIT FOR
				// EVERY LEAVER), checked each frame rather than trusted to a timer: a click in the moment
				// between a timer and Svelte's removal still revived one.
				const release = () =>
					document.querySelector('[data-leaving]')
						? requestAnimationFrame(release)
						: hooks.onReleased();
				release();
			});
		// Once the flight is over: the copies and inline flight styles go, and every element still on the
		// board keeps its last frame until it next moves (see `held`). Leavers are gone with Svelte.
		// (Leavers' animations are left out: they are built to outlive their elements, see `outliveElement`.)
		const settles = animations.filter((a) => {
			const target = (a.effect as KeyframeEffect | null)?.target as HTMLElement | null;
			return !(target && isLeaver(target));
		});
		void Promise.allSettled(settles.map((a) => a.finished)).then(() => {
			for (const a of animations) {
				const target = (a.effect as KeyframeEffect | null)?.target as HTMLElement | null;
				if (!target?.isConnected || target.closest('[data-leaving]')) continue;
				if (a.playState === 'idle') continue; // already let go (releaseHeld ran mid-flight)
				const list = held.get(target) ?? [];
				list.push(a);
				held.set(target, list);
				allHeld.add(a);
			}
			for (const fn of cleanup) fn();
		});
	}));
}
