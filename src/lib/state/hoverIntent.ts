/**
 * hoverIntent.ts — "did the reader MEAN to hover this?", as one answer with many subscribers.
 *
 * THE TWO FAULTS IT EXISTS FOR, and they are not the same fault (Sam, 083026):
 *
 *   TRANSIT   "if i am navigating with my mouse lets say from search in top right to a headshot in
 *             bottom left corner of browser, my mouse will cross over the photo in the current hero
 *             card. just for a beat or less. but when that happens the photo instantly expands."
 *
 *   ARRIVAL   "this happens more frustratingly when a user mouse is stable and not moving and a photo
 *             crosses under the mouse position as cards transition."
 *
 * TRANSIT is the classic one and the fix is old and settled: hover INTENT, after Brian Cherne's 2007
 * jQuery plugin that every menu system has since copied. Do not trust `mouseenter` — sample the pointer
 * and fire only once it has SLOWED DOWN inside the target. Crossing a photo on the way somewhere else
 * never produces a slow sample inside it, so it never arms.
 *
 * ARRIVAL is the one hoverIntent does not cover, because it predates animated layouts. When a card
 * flight slides a photo under a stationary cursor the browser synthesises `mouseover`/`mouseenter` —
 * the pointer did not move, the world moved under it — and every dwell timer in the world will happily
 * confirm that as intent, because the pointer is indeed sitting still on the target. The extra rule is
 * therefore: AN ELEMENT ARRIVING UNDER A STILL POINTER IS NOT A HOVER. Nothing arms until the pointer
 * has actually MOVED, by at least WAKE_PX, since it entered.
 *
 * ── WHY THIS IS A MODULE AND NOT A HANDLER ──────────────────────────────────────────────────────────
 *
 * The same mouse-anchored popout is implemented five times — FeaturedCard's portrait, RightColumn's
 * thumbnails, SearchModal, ConnectModal and ConnectAnyoneModal — each with its own `onmousemove`. §17.x's
 * rule about one clock with many subscribers applies exactly: five independently-tuned dwell timers
 * would disagree about what a hover is, and the frame they disagree on is the one the reader is looking
 * at. One action means one place to tune the feel.
 *
 * IT REUSES `flightLock` RATHER THAN WATCHING FLIGHTS ITSELF. That module was extended in August for
 * this exact class of problem — its own comment says "a portrait must not expand while a flight is
 * running, and must expand the instant it ends if the pointer is still there" — so the subscription
 * already exists and already fires at the right moments. Nothing here polls for motion.
 */
import { subscribeFlightLock } from './flightLock';

/**
 * THE THREE NUMBERS, and the reason the delay can be short is that it is not doing the work.
 *
 * SLOP_PX is the real filter. A pointer crossing a photo on its way to the corner covers far more than
 * 6px between samples; a pointer that has arrived and is settling covers almost none. Getting this
 * right means DWELL_MS can stay at a length nobody perceives as lag — a long delay with no velocity
 * test is the version that feels broken, because it punishes the deliberate hover just as hard as the
 * accidental one.
 *
 * SAMPLE_MS is the sampling interval, deliberately shorter than the dwell so the dwell is measured
 * rather than approximated by "one tick happened".
 */
// 140 -> 120 (Sam, 083026: "not 140ms its a little slow. snappier").
const DWELL_MS = 120;
const SLOP_PX = 6;
// 70 -> 60 IN STEP WITH THE DWELL, because the sampler is what actually decides when arming happens:
// the dwell is only tested on a tick, so the real delay is DWELL_MS..DWELL_MS+SAMPLE_MS. Leaving the
// interval at 70 would have made a 120ms dwell arm as late as 190 and quietly undone half the change.
const SAMPLE_MS = 60;
/** How far the pointer must travel after entering before ARRIVAL is ruled out. Small enough that any
 *  real hand movement clears it, large enough that a trackpad's idle jitter does not. */
const WAKE_PX = 3;
/**
 * HOW RECENTLY THE POINTER MUST HAVE MOVED for an `enter` to count as the reader arriving rather than
 * the world arriving. This is the correct test and "did it move AFTER entering" was not — the probe
 * caught it: a fast flick that lands ON the photo and stops enters at its FINAL position, so there is
 * no movement after the enter and the strict rule refused to arm it forever. Indistinguishable from an
 * arrival by that measure, and completely different to a reader.
 *
 * What actually separates them is what the pointer was doing when the enter fired. A reader crossing
 * into the photo has been generating pointermove events milliseconds earlier; a photo sliding under a
 * parked cursor arrives with the pointer silent for as long as the reader has been still. So the
 * question is asked of the DOCUMENT, not of this element.
 */
const MOVE_GRACE_MS = 120;

/**
 * ONE DOCUMENT-LEVEL LISTENER FOR THE WHOLE APP, not one per hovered node. Capture + passive so it can
 * never interfere with anything and never blocks a scroll. It exists only to answer "was the pointer
 * moving just now", which is a fact about the pointer rather than about any element.
 */
let lastMoveAt = 0;
if (typeof document !== 'undefined') {
	document.addEventListener('pointermove', () => (lastMoveAt = performance.now()), {
		capture: true,
		passive: true
	});
}

export interface HoverIntentParams {
	/** Intent confirmed. Fires ONCE per hover, with the most recent pointer event. */
	onArm: (e: PointerEvent, node: HTMLElement) => void;
	/** Subsequent movement while armed — the popout following the cursor. */
	onMove?: (e: PointerEvent, node: HTMLElement) => void;
	/** Pointer left, a click happened, or a flight started. Always paired with a prior onArm. */
	onDisarm: () => void;
	/** Extra veto the host owns — FeaturedCard passes `settled`, so a card still flying cannot arm.
	 *  Read at every decision rather than captured, so it tracks without the action being re-created. */
	enabled?: () => boolean;
}

export function hoverIntent(node: HTMLElement, params: HoverIntentParams) {
	let p = params;
	let armed = false;
	let inside = false;
	/** Set once the pointer has moved WAKE_PX since entering. Until then this is an ARRIVAL, not a hover. */
	let woke = false;
	/** Suppressed until the pointer LEAVES — the rail's own idiom for "you clicked, stop offering". */
	let suppressed = false;
	let enterT = 0;
	let cx = 0;
	let cy = 0;
	let ex = 0;
	let ey = 0;
	/** Position at the previous sample, which is what the velocity test compares against. */
	let px = 0;
	let py = 0;
	let last: PointerEvent | null = null;
	let timer: ReturnType<typeof setInterval> | null = null;
	let flightLocked = false;

	const stopSampling = () => {
		if (timer !== null) {
			clearInterval(timer);
			timer = null;
		}
	};

	function disarm() {
		stopSampling();
		if (armed) {
			armed = false;
			p.onDisarm();
		}
	}

	/** One sample. Arms only when EVERY condition holds — see the module comment for what each is for. */
	function tick() {
		if (armed || !inside || suppressed || flightLocked) return;
		if (p.enabled && !p.enabled()) return;
		if (!woke) return; // ARRIVAL: the world moved, the reader did not
		if (performance.now() - enterT < DWELL_MS) {
			px = cx;
			py = cy;
			return;
		}
		if (Math.hypot(cx - px, cy - py) > SLOP_PX) {
			// TRANSIT: still travelling. Re-base and let the next sample decide, so a pointer that
			// crosses and then STOPS still arms — it is the stopping that means intent, not the entering.
			px = cx;
			py = cy;
			return;
		}
		armed = true;
		stopSampling();
		if (last) p.onArm(last, node);
	}

	function onEnter(e: PointerEvent) {
		inside = true;
		armed = false;
		woke = false;
		suppressed = false;
		enterT = performance.now();
		// ARRIVAL vs APPROACH, decided at the moment of entry. If the pointer has been generating moves
		// within the grace window then the reader is in motion and this enter is theirs; if it has been
		// silent, the element came to the pointer and nothing here is a hover yet. The WAKE_PX path in
		// onMove is still the second way out, so a photo that lands under a still cursor arms as soon as
		// the reader actually moves.
		woke = enterT - lastMoveAt < MOVE_GRACE_MS;
		ex = px = cx = e.clientX;
		ey = py = cy = e.clientY;
		last = e;
		stopSampling();
		timer = setInterval(tick, SAMPLE_MS);
	}

	function onMove(e: PointerEvent) {
		cx = e.clientX;
		cy = e.clientY;
		last = e;
		if (!woke && Math.hypot(cx - ex, cy - ey) > WAKE_PX) woke = true;
		if (armed) p.onMove?.(e, node);
	}

	function onLeave() {
		inside = false;
		suppressed = false;
		disarm();
	}

	/** A click is a navigation, not a request to enlarge. Matches TimelineRail's `hoverSuppressed`:
	 *  suppress this one element until the pointer actually leaves it, so the popout does not reappear
	 *  over a card that is already flying away. */
	function onDown() {
		suppressed = true;
		disarm();
	}

	node.addEventListener('pointerenter', onEnter);
	node.addEventListener('pointermove', onMove);
	node.addEventListener('pointerleave', onLeave);
	node.addEventListener('pointerdown', onDown);
	const unsubscribe = subscribeFlightLock((locked) => {
		flightLocked = locked;
		// Drop an open popout the moment a flight starts; the pointer is about to be over something else
		// entirely. Re-arming is left to the ordinary path — if the reader is still there and still
		// still, the next sample confirms it.
		if (locked) disarm();
	});

	return {
		update(next: HoverIntentParams) {
			p = next;
		},
		destroy() {
			stopSampling();
			unsubscribe();
			node.removeEventListener('pointerenter', onEnter);
			node.removeEventListener('pointermove', onMove);
			node.removeEventListener('pointerleave', onLeave);
			node.removeEventListener('pointerdown', onDown);
		}
	};
}
