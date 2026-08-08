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
import { cubicOut, cubicIn } from 'svelte/easing';
import { prefersReducedMotion } from 'svelte/motion';
import { getCameraMove, type CameraMove } from '../state/camera';
import { isArcMove, arcDurationMsFor, ARC_DESC, ARC_RISE } from './arc-math';
import { arcClock } from '../state/arc.svelte';
import { getSiblingNavPlan, clearSiblingNavPlan } from '../state/siblingNav';

// SETTLE (Block 3) — the promotion carries a few px PAST its final rect along the travel vector, then
// decelerates back. Done as ONE C1-continuous easeOutBack curve on the TRANSLATE (not a two-phase
// main-easing-plus-pulse, which decelerates to rest AT the destination then restarts motion — a jerk).
// The card arrives WITH residual velocity, crosses the destination once, overshoots, and returns in a
// single unbroken motion. Translate-only (scale stays cubicOut, lands at 1.0 — no puff). The overshoot
// is a fixed FRACTION of the curve, so its px scale with flight distance (short swap = smaller carry).
// easeOutBack: f(u) = 1 + (1+s)(u−1)³ + s(u−1)²  — overshoots past 1 (the destination) then settles.
export function easeOutBack(u: number, s: number): number {
	const p = u - 1;
	return 1 + (1 + s) * p * p * p + s * p * p;
}
// Newton solve for the s that makes easeOutBack overshoot by a target FRACTION of the travel:
// g(s) = 4s³ / (27(1+s)²) = targetG. Shared by every settle (promotion, demote, and the sibling cascade)
// so there is ONE curve, one solver — never a second hand-rolled overshoot.
export function solveBackS(targetG: number): number {
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
// easeOutBack's inherent overshoot is g(s)·distance. A fixed s flings far swaps (corner-to-corner spouse
// distances span ~8×). So CLAMP the carry to a few px and solve s per-flight to hit it. `boost` scales the
// target carry: the DECK arrival passes 1.1 (v4.2.1 — a heavier card needs more to settle); everyone else 1.
function settleBackFor(distance: number, boost = 1): number {
	if (distance < 1) return 0;
	const targetPx = boost * Math.min(5.4, Math.max(4.5, distance * 0.011)); // whole-path along-axis carry (4.5–5.4px × boost)
	return solveBackS(Math.min(0.1, targetPx / distance));
}

// ── Click-time origin capture for the card's "grow from the clicked box" flight ──
// crossfade self-measures rects DURING the DOM update, which is corrupted when the
// children/parents row reflows (all old boxes leave + new boxes enter the same flex
// container). So instead we capture the clicked box's rect at CLICK time — before
// any state change or reflow — and the card flies from that exact rect as a single
// element (manual FLIP). This fixes the origin AND reads as one object, not a
// cross-dissolve between two different elements.
let flightOrigin: DOMRect | null = null;

/** Read the captured origin WITHOUT consuming it. `growFrom` consumes (so a cold load can't reuse a stale
 *  rect), and it runs in the same flush as the outro — so an outro that needs the hero's origin cannot
 *  race it for the same variable. §19's plan reads it at the click-time seam instead, before either. */
/** The last hero flight's clock AND kind, published by growFrom so the CC blade can be placed inside it. */
type HeroSchedule = {
	duration: number;
	delay: number;
	kind: 'spouse' | 'relative' | 'cc' | 'sibling';
	/** Which axis the card actually ARRIVES along. A vertical arrival hides a vertical blade draw — see
	 *  BLADE_DRAW. Taken from the deck's own entry vector, NOT from panDir: panDir is set from the clicked
	 *  RELATION (parent→down, child→up, spouse→lateral) and says nothing about a CC's deck direction. */
	axis: 'vertical' | 'lateral';
};
let heroSchedule: HeroSchedule = { duration: 0, delay: 0, kind: 'relative', axis: 'lateral' };
export function getHeroSchedule(): HeroSchedule {
	return heroSchedule;
}

export function peekFlightOrigin(): DOMRect | null {
	return flightOrigin;
}
export function captureFlightOrigin(rect: DOMRect | null): void {
	flightOrigin = rect;
}

// The KIND of the current flight, captured at click time alongside the origin rect. Spouse
// swaps and parent/child clicks now run at DIFFERENT speeds (a spouse swap is a short in-corner
// morph; a parent/child click is a real-distance travel that was never meant to be slowed), and
// distance can't tell them apart (a docked chip is ~as far from the card's top-left as a child
// box). So the click handler tags the flight; growFrom + shrinkTo pick their durations from it.
// 'sibling' (Phase 7 Slice 3): a HYBRID — growFrom treats it like 'relative' (grow from the clicked chip
// rect, with settle), but shrinkTo + chipExit route it through the CC path (whole card departs on the
// opposite LATERAL vector, no chip-face, no settle) because the old focus has no destination box on the
// sibling's page. A demote-into-box would have nowhere to land — the July-12 ghost condition.
let flightKind: 'spouse' | 'relative' | 'cc' | 'sibling' = 'relative';

export function captureFlightKind(kind: 'spouse' | 'relative' | 'cc' | 'sibling'): void {
	flightKind = kind;
	// EVERY navigation passes through here, so this is the one place a per-flight override is guaranteed to
	// be cleared. A shuffle re-arms it immediately afterwards (setCarouselTempo); a real CC does not, which
	// is precisely what keeps the standard CC at its standard speed after any number of shuffles.
	carouselTempo = 1;
	// Same reasoning for the tier span (see captureTierSpan): every navigation is ONE tier unless the click
	// says otherwise, and navigate.ts re-arms it a line later for the ones that aren't. Cleared HERE rather
	// than in clearFlightCaptures because it shares flightKind's longer life — the army's march is read by
	// late handlers (revealPending at introend) that run well after the one-rAF capture sweep.
	tierSpan = 1;
	tierOpen = false;
	if (kind !== 'cc') clearLateralMemory(); // a chip/sibling/relative nav ends the lateral back-and-forth
}
// Read the current nav's kind. Stable through the whole flight — clearFlightCaptures (1 rAF after
// nav) does NOT reset flightKind, so late lifecycle handlers (introend) can still branch on it.
export function getFlightKind(): 'spouse' | 'relative' | 'cc' | 'sibling' {
	return flightKind;
}

// ── DIRECTIONAL ARRIVAL (the 'cc' class — a NON-CHIP navigation) ────────────────────────────────
// A CC target isn't a chip: no origin box to grow from, no destination box to shrink into. So the new
// card FLIES IN WHOLE from offscreen along the WORLD vector (to − from in table space; later years read
// as below, higher seats as right — the true angle, never quantized) and the old card SLIDES OUT WHOLE
// the opposite way. The link is a trigger, not an origin.
// (the deck hero's entry offset is DECK_HERO_ENTRY, defined with the other DECK constants below)
const DIRECT_WHISPER_DEG = 6; // a direct-line arrival is ~vertical; a faint Δx-sign lean, never more than this
const CC_COMPRESS_L = 300; // log-compression scale for collateral Δx (near-identity at the uncle's ~50 seats)
// Screen direction of the CC arrival, built from the TRUE vector so it is exactly RECIPROCAL — A→B is the
// reverse of B→A — and never injects a fake vertical. Vertical sign + magnitude come from real Δy, always.
//   direct     → near-vertical (±DIRECT_WHISPER_DEG whisper of the Δx sign; the 800-seat tidy-tree spread
//                a direct descendant can carry is suppressed to the whisper — generations dominate).
//   collateral → normalize(sign·log-compressed Δx, true Δy). No cap: a same-era CC (Δy=0) pans HORIZONTAL
//                (vertical component 0, not a capped 45° descent); the uncle keeps his ~45° from his real
//                generation gap; both invert exactly on the reverse trip.
// Falls back to the raw screenVector only when the target has no time basis (y null).
// ccScreenDirFor stays (the DECK forks it only at the 'cc' call sites — deckDirFor; sibling departures
// still own this directional vector). The private ccScreenDir() wrapper was removed with the old cc slide.
export function ccScreenDirFor(m: CameraMove | null): { x: number; y: number } {
	if (m?.from && m?.to && m.to.y != null && m.from.y != null) {
		const vx = m.to.x - m.from.x;
		const vy = m.to.y - m.from.y; // TRUE Δy (years): >0 later (below), <0 earlier (above) — the SOLE
		// source of vertical sign + magnitude. Never a constant, never a default-down.
		if (m.relationClass === 'direct') {
			const w = (DIRECT_WHISPER_DEG * Math.PI) / 180;
			return { x: Math.sign(vx) * Math.sin(w), y: (vy >= 0 ? 1 : -1) * Math.cos(w) };
		}
		// collateral: the vector itself (compressed laterally), normalized. Odd in (vx,vy) → reciprocal;
		// |vertical| = 0 when Δy = 0.
		const cx = Math.sign(vx) * CC_COMPRESS_L * Math.log1p(Math.abs(vx) / CC_COMPRESS_L);
		const mag = Math.hypot(cx, vy);
		if (mag > 0.001) return { x: cx / mag, y: vy / mag };
		return { x: 0, y: 1 };
	}
	const sv = m?.screenVector;
	if (sv) {
		const mag = Math.hypot(sv.dx, sv.dy);
		if (mag > 0.001) return { x: sv.dx / mag, y: sv.dy / mag };
	}
	return { x: 0, y: 1 }; // no time basis: degrade to the screen vector's own direction
}
// CC duration: distance-scaled through the velocity family, floored so a same-era jump still reads as a
// real flight and capped so a gen-1→gen-12 dive reads LONG (a long journey), never a strobe.
function ccDurationMs(): number {
	const m = getCameraMove();
	const wy = m?.to?.y != null && m?.from?.y != null ? Math.abs(m.to.y - m.from.y) : 0; // years apart
	return Math.min(950, Math.max(500, 500 + wy * 1.6));
}

// ── THE PASSAGE BEAT (distance made felt) ────────────────────────────────────────────────────────
// Between the old card leaving and the new card entering, a scalable mid-beat scaled to the TRUE year-
// span: a near CC (< PASSAGE_MIN_SPAN) gets none (the current conveyor feel); a far dive earns up to
// PASSAGE_MAX_MS of stillness while decade markers rush past (Passage.svelte reads the same numbers).
// The new card's growFrom delays by this, raising the extreme-dive total to ~1300ms — a long journey
// reads long. Transient, flight-only: nothing lingers at rest.
const PASSAGE_MIN_SPAN = 60; // years — below this (uncle-class same-era CCs) there is no passage
const PASSAGE_MAX_MS = 450;
export function ccYearSpan(m: CameraMove | null): number {
	return m?.to?.y != null && m?.from?.y != null ? Math.abs(m.to.y - m.from.y) : 0;
}
export function passageMsFor(m: CameraMove | null): number {
	const span = ccYearSpan(m);
	if (span < PASSAGE_MIN_SPAN) return 0;
	return Math.min(PASSAGE_MAX_MS, (span - PASSAGE_MIN_SPAN) * 2.0);
}

// ══════════════════════════════════════════════════════════════════════════════════════════════
// THE DECK SHUFFLE — the archival riffle (design §22). A CC arrival becomes a stack of pages
// riffled past: N faint ghost cards stream edge-to-edge across the viewport, heavily overlapped,
// and the destination card is the LAST vehicle in the convoy — entering at ghost tempo, braking
// into the slot. These functions are built ALONGSIDE the directional-slide ones above: deckDirFor
// forks ccScreenDirFor for the 'cc' CALL SITES only; ccScreenDirFor itself stays (sibling
// departures still own it). Call sites are swapped separately (step 3); nothing here is wired yet.
// ══════════════════════════════════════════════════════════════════════════════════════════════

// Seeded PRNG (mulberry32): each flight's riffle is deterministic — seed = the camera seq — so the
// jitter (stagger/rotation/scatter) is reproducible and probe-able. Same nav → same fan, every time.
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// DECK v4 — THE PHANTOM TRAIN. Default is TWO real cards, no visible convoy, but the DISTANCE of the
// riffle is restored as an empty BEAT between them: EXIT → BEAT → ENTRY. Car 1 leaves FULLY, the stage is
// empty for the length of the (invisible) train — 16–20 shuffled cards' worth of time — then the hero
// arrives. The emptiness IS the distance; it is what fixes "why is this card right next door". Tilt +
// blur removed/restored per Sam's v4 spec (blur = the tuning-fork shimmer; tilt = the life push stripped).
//
// GHOST A/B (the visible convoy is banked, not deleted):
//   OFF (default) = THE PHANTOM TRAIN — hero + car 1 only, sharp (no blur), seeded tilt, separated by the beat.
//   ON  = the dialed v3 convoy (N cards, opaque + blurred ghosts, seeded procedural photos).
export const DECK_GHOSTS = false; // default OFF — flip true for the visible convoy
export const DECK_GHOST_V = 1.65; // px/ms — house tempo / the EXIT velocity (car 1's heft — Sam: keep)
const DECK_HERO_V_MULT = 1.1; // v4.2.1: the ENTERING card is 10% quicker than the exit (still decelerating into the brake)
// GLOBAL TEMPO (v4.2.3): a uniform time-scale on EVERY deck duration + the beat — the whole operation plays
// this much faster end-to-end. It does NOT touch any easing curve, the heft, the angles, or the overshoot
// distance (those are shape/space, not tempo) — it just compresses the timeline. 0.9 = 10% quicker overall.
const DECK_TEMPO = 0.9;
// CAROUSEL TEMPO (Aug 7) — Sam: "can we speed up notable transition by 10% but maintain CC standard
// transition speed as is?" So this is a SHUFFLE-ONLY multiplier on the dial above, not a new clock.
//
// Why it multiplies DECK_TEMPO rather than the hero duration: the deck is an ARMY (design §18.3) — car 1's
// exit, the empty-stage beat, the convoy stagger and the hero's entry all read one time-scale, and that is
// what makes them read as a single operation. Speeding the hero alone would leave the beat at full length,
// so the card would arrive into a gap that no longer matched it. Scaling the shared dial keeps every
// proportion identical and simply plays the whole thing 10% quicker.
//
// It inherits DECK_TEMPO's contract exactly: TIME only. Curves, heft, tilt, the brake shape and the settle
// overshoot DISTANCE are shape/space, not tempo, and none of them move.
const CAROUSEL_TEMPO = 0.9;
/**
 * 1 for every ordinary flight; CAROUSEL_TEMPO for a shuffle. Reset by captureFlightKind — which is the
 * single funnel EVERY navigation passes through (navigate.ts and shuffle.svelte.ts are the only callers) —
 * so a shuffle can never leak its tempo into the CC that follows it. That reset is the whole reason the
 * "maintain CC standard transition speed" half of the ask holds.
 */
let carouselTempo = 1;
/** The deck's time-scale for the flight currently launching. Every duration below reads THIS, not DECK_TEMPO. */
function deckTempo(): number {
	return DECK_TEMPO * carouselTempo;
}
/** Marks the launching flight as a carousel draw. Paired with setCarouselLateral at shuffle's call site. */
export function setCarouselTempo(): void {
	carouselTempo = CAROUSEL_TEMPO;
}
// TRAVEL TEMPO (v4.2.6): shortens the two cards' TRANSIT time only — NOT the beat (spacing held) and NOT the
// easing shape (velocity curve held): same distances, same curves, same gap, cards just cross a bit faster,
// so the total drops ~5%. Applied to car 1's exit + the hero's entry, never to the phantom beat.
const DECK_TRAVEL_TEMPO = 0.94;
export const DECK_TRAVEL = 1300; // px — FALLBACK offscreen reach only (live coords are viewport-derived; see deckExit)
const DECK_EDGE_MARGIN = 80; // px past the window edge every offscreen coord clears — no car/hero peeks at any window size
const DECK_STAGGER_BASE = 120; // ms between cars — breathes wider now the count is smaller (dial 110–130)
const DECK_LANE_FAN = 70; // ±px PERPENDICULAR scatter — the spread-deck fan (dial 40–100; ghost density lives here)
const SEAT_NEAR = 180; // DEAD. The §19.4 bake landed as KIN_NEAR below and keys on the parent graph, not seats;
// nothing reads this. Left in place (not deleted) as the tombstone of the seat-proxy era — see isVerticalMove.
// The TWO real cards (push) get a seeded but FLOORED draw — angle + lane always present (never flat-axial),
// yet no two flights identical (protected variation). v4.1: tilt is per-axis — a VERTICAL fall reads with a
// real lean (2.5–4°), a LATERAL slide only banks slightly (1.5–2°, more = speedboat). Ghosts keep the fan.
const DECK_ROT_VERT_MIN = 2.5; // ±deg floor of a vertical card's lean (the falling-at-an-angle Sam praised)
const DECK_ROT_VERT_MAX = 4.0;
const DECK_ROT_LAT_MIN = 1.5; // ±deg floor of a lateral card's bank (subtle — banking, not a speedboat)
const DECK_ROT_LAT_MAX = 2.0;
const DECK_PUSH_LANE_MIN = 18; // ±px floor of the real-card perpendicular draw (~20–30)
const DECK_PUSH_LANE_MAX = 30; // ±px ceiling
const DECK_ROT_JITTER = 3.5; // ±deg seeded tilt per GHOST (convoy fan)
const DECK_DT_JITTER = 15; // ±ms stagger jitter (a thumb's riffle is never even)
const DECK_N_CAP = 6; // collateral ceiling (dial up to 8, NEVER above)
// THE EMPTY-STAGE BEAT — v4.2.2 (Sam: the convoy/overlap RUINED the large-tree illusion; the exiting and
// entering cards must NEVER be on screen together). The hero waits for car 1 to FULLY exit, then this beat
// of empty stage, THEN it enters. The gap sells the distance across the tree. Scaled by relation (a same-
// line hop is a shorter reach than a cross-tree/orbit one). +10% wider than v4.1 (Sam), dial UP for more.
const DECK_BEAT_DIRECT = 87; // ms base for direct (uncle/grandparent/niece) — v4.2.5: another −5% gap (total shortens with it; speed unchanged)
const DECK_BEAT_COLL = 170; // ms base for collateral/orbit — v4.2.5: another −5% gap
export const DECK_GHOST_OPACITY = 1.0; // OPAQUE ghost cards (convoy only). Blurry ≠ translucent (Sam)
export const DECK_GHOST_BLUR = 5.5; // ghost blur (convoy only); the two real cards carry NO blur at any frame
const DECK_BRAKE_MS = 180; // the hero's deceleration tail past its cruise transit
const DECK_SETTLE_BOOST = 1.1; // v4.2.1: +10% arrival overshoot — a heavier card needs more to settle into the slot

// ── Viewport-relative offscreen coords ──────────────────────────────────────────────────────────
// A FIXED entry distance (the dead CC_ENTRY_DIST=1150, DECK_HERO_ENTRY=950) sits INSIDE real browser
// windows: the delayed hero mounted pre-positioned, VISIBLE, and held frozen until its schedule slot —
// the July-12 first-frame class, viewport edition. Every offscreen coordinate now derives from the LIVE
// viewport at flight time. deckExit returns the translate that carries a box whose current top-left is
// (left,top), size (w,h), FULLY past the window edge along +dir (axis-aligned unit vector), + margin.
// Map a flight's seeded jitter (rotDeg ±DECK_ROT_JITTER, lanePx ±DECK_LANE_FAN) to a FLOORED signed draw
// for a real push card: the sign + relative magnitude are kept (so no two flights are identical), but the
// magnitude is remapped into [MIN, MAX] so a card is NEVER flat-axial (an unfloored seed can land near 0).
// v4.1: the TILT range is per-axis — a lateral slide only banks (1.5–2°); a vertical fall leans (2.5–4°).
function pushDraw(
	seededRot: number,
	seededLane: number,
	lateral: boolean
): { rot: number; lane: number } {
	const sr = seededRot / DECK_ROT_JITTER; // ∈ [-1,1]
	const sl = seededLane / DECK_LANE_FAN; // ∈ [-1,1]
	const rMin = lateral ? DECK_ROT_LAT_MIN : DECK_ROT_VERT_MIN;
	const rMax = lateral ? DECK_ROT_LAT_MAX : DECK_ROT_VERT_MAX;
	const rot = (sr >= 0 ? 1 : -1) * (rMin + Math.abs(sr) * (rMax - rMin));
	const lane =
		(sl >= 0 ? 1 : -1) *
		(DECK_PUSH_LANE_MIN + Math.abs(sl) * (DECK_PUSH_LANE_MAX - DECK_PUSH_LANE_MIN));
	return { rot, lane };
}

export function deckExit(
	dir: { x: number; y: number },
	left: number,
	top: number,
	w: number,
	h: number
): { x: number; y: number } {
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	let x = 0;
	let y = 0;
	if (dir.x > 0)
		x = vw - left + DECK_EDGE_MARGIN; // off the RIGHT: left edge past vw
	else if (dir.x < 0) x = -(left + w + DECK_EDGE_MARGIN); // off the LEFT: right edge past 0
	if (dir.y > 0)
		y = vh - top + DECK_EDGE_MARGIN; // off the BOTTOM: top edge past vh
	else if (dir.y < 0) y = -(top + h + DECK_EDGE_MARGIN); // off the TOP: bottom edge past 0
	return { x, y };
}

// ── Lateral CC direction: the ping-pong memory ─────────────────────────────────────────────────
// A FRESH lateral CC always exits the old card LEFT (hero enters from the RIGHT) — a fixed, predictable
// default, NOT tied to where the target sits in the tree (Sam: direction is history, not seat position).
// If the VERY NEXT lateral CC reverses the exact edge just traversed — you clicked the reciprocal link
// straight back — the direction FLIPS, so toggling A↔B ping-pongs (left, right, left, right…). ANYTHING
// else — a fresh lateral CC to a new card, a vertical/family CC, or a chip nav — is not that reversal, so
// it resets to the fresh default and the back-and-forth ends. One-deep, edge-exact.
//
// Resolved ONCE per nav in resolveLateralDir (deckDirFor is a pure READ — it runs several times per flight
// for the hero, car 1, and ghosts, so it must never mutate the memory or the ping-pong would double-flip).
type LateralEdge = { source: string; target: string; dir: { x: number; y: number } };
let lastLateral: LateralEdge | null = null;
let currentLateralDir: { x: number; y: number } = { x: 1, y: 0 };
// KIN_NEAR — the SAME-LINE radius, in family-graph edges (the build-time bake; see regenerate
// kinDistance). Blood ladder: 1 parent/child, 2 sibling/grandparent, 3 uncle/niece, 4 grandaunt,
// 5 first-cousin-once-removed, 6 second cousin. A marriage edge costs 2, so the in-law ladder runs
// 3 parent/child-in-law, 4 spouse's grandparent, 5 spouse's uncle.
// 5 admits every class that reads as up/down your own line — blood through 1C1R, and the in-laws Sam
// named (Esther Edwards Burr → Daniel Burr, her husband's father, at 3) — while second cousins and the
// in-laws of distant collaterals (the husband of a grandniece, 6) stay lateral. THE dial: 3 keeps only
// blood uncles and direct in-laws; it is a radius on the graph, never a seat distance.
const KIN_NEAR = 5;
// The ONE vertical test. Both deckDirFor (which axis the convoy flies) and resolveLateralDir (whether the
// ping-pong memory survives) must agree, or a move reads lateral in one and vertical in the other.
// A generation gap alone is NOT enough (the Pennoyer→Strong bug: cross-branch peers differ in generation
// without being up/down each other's line), so vertical also requires SAME LINE — which is now honest:
// 'direct' (one is literally the other's ancestor/descendant) OR close kin by the LCA bake. Everything
// else — far collateral, gen_delta null (orbit) or 0 (same-gen cousin) — rides lateral.
function isVerticalMove(m: CameraMove | null): boolean {
	const gd = m?.genDelta ?? null;
	if (gd == null || gd === 0) return false;
	if (m?.relationClass === 'direct') return true;
	const kd = m?.kinDistance ?? null;
	return kd != null && kd <= KIN_NEAR;
}
export function resolveLateralDir(m: CameraMove | null, source: string, target: string): void {
	if (isVerticalMove(m)) {
		lastLateral = null; // a VERTICAL CC ends the lateral back-and-forth
		return;
	}
	const prev = lastLateral;
	const reciprocal = prev !== null && prev.target === source && prev.source === target;
	if (reciprocal && prev) currentLateralDir = { x: -prev.dir.x, y: 0 };
	else currentLateralDir = { x: 1, y: 0 }; // fresh → exit LEFT
	lastLateral = { source, target, dir: currentLateralDir };
}
/**
 * SHUFFLE'S FIXED DIRECTION — a deliberate divergence from resolveLateralDir, not an oversight.
 *
 * The ping-pong memory above exists so a CC and its reciprocal read as retracing: A→B exits left, B→A
 * flips and exits right. That is right for cross-connections and WRONG for a carousel, which advances
 * one way forever. Inheriting it would mean the 1-in-1059 reciprocal shuffle silently reversed, and
 * that every chip nav (which calls clearLateralMemory) entangled the carousel's direction with ordinary
 * browsing for no benefit.
 *
 * So shuffle sets the direction outright and clears the memory, taking itself out of the back-and-forth
 * entirely. {x:1} is the same value resolveLateralDir uses for a fresh move — the demoted card exits
 * LEFT and the incoming notable enters from the RIGHT (deckDirFor points at the offscreen START; the
 * card translates −dir into the slot).
 */
export function setCarouselLateral(): void {
	currentLateralDir = { x: 1, y: 0 };
	lastLateral = null;
}

export function clearLateralMemory(): void {
	lastLateral = null; // any non-CC nav (chip/sibling/relative) ends the back-and-forth
}

// ── deckDirFor — the entry direction of the riffle. Unit vector pointing at the OFFSCREEN START
// (same convention as ccScreenDirFor: the card/ghosts translate −dir into the slot). ─────────────
// DIRECTION = SAME-LINE test, never a birth-year gap. VERTICAL is reserved for climbing/descending the
// OWN family line: gen_delta < 0 → an ANCESTOR tier (uncle, grandparent) → enters from the TOP; > 0 → a
// DESCENDANT tier (niece) → from the BOTTOM. But a generation gap alone is NOT enough — two people on
// DIFFERENT branches can differ in generation yet not be up/down each other's line (the Pennoyer→Strong
// bug). So vertical requires gen_delta ≠ 0 AND SAME LINE — either relationClass
// 'direct' (one is LITERALLY the other's ancestor or descendant) or close kin by the LCA bake
// (kin_distance ≤ KIN_NEAR — uncle, grandaunt, 1C1R, and in-laws: a father-in-law is up your line as
// surely as an uncle is, which is why the bake bridges one marriage). FAR collateral rides LATERAL,
// and so does gen_delta null (orbit) or 0 (same-gen cousin).
//
// SEATS ARE GONE FROM THIS TEST; KINSHIP REPLACED THEM (the §19.4 bake, Aug 3). The old escape hatch
// (|Δseats| ≤ SEAT_NEAR) misfired in BOTH directions, because seat distance is where the tidy layout put
// someone, not who they are: Lovejoy→J.P. Morgan happened to land 0.4 seats apart (5292.15 vs 5291.75) and
// two strangers flew a family-line vertical, while John Pierpont and his uncle-guardian James Pierpont II
// sit >180 seats apart and rode lateral. Dropping the hatch killed the false verticals and left the real
// uncles lateral — the accepted interim cost, on the principle that a wrong lateral reads as neutral while
// a wrong vertical asserts kinship that isn't there. That interim is over: isVerticalMove now asks the
// PARENT GRAPH directly (kin_distance ≤ KIN_NEAR), so close kin ride vertical wherever they sit and far
// cross-branch peers still do not. SEAT_NEAR survives above only as a tombstone.
//
// BOTH axes still follow GEOGRAPHY, never navigation history: vertical by
// the gen_delta SIGN (older→top / younger→bottom), lateral by the SEAT SIGN (target seated right→enters from
// the right / left→from the left). A directed edge and its reverse are exact opposites, so toggling A↔B
// ping-pongs (each hop swings the convoy the other way) and repeating A→B is always identical — no memory,
// no "return" special case that got stuck armed while ping-ponging.
export function deckDirFor(m: CameraMove | null): { x: number; y: number } {
	const gd = m?.genDelta ?? null;
	if (isVerticalMove(m)) {
		return { x: 0, y: (gd as number) < 0 ? -1 : 1 }; // ancestor tier → from TOP; descendant tier → from BOTTOM
	}
	return currentLateralDir; // LATERAL: resolved once per nav (resolveLateralDir) — fresh=left, reciprocal flips
}

// ── deckScheduleFor — the convoy's shape + timing. Ghost count scales with the flight's magnitude;
// the hero is the LAST vehicle (heroDelayMs = its stagger slot). All jitter is seeded, so the exact
// riffle is deterministic per nav. (Magnitude is the interim seats/years metric until the LCA bake.)
export type DeckSchedule = {
	N: number;
	staggerBaseMs: number;
	jitter: {
		dtMs: number;
		rotDeg: number;
		lanePx: number; // PERPENDICULAR fan offset
		photo: { hue: number; offX: number; offY: number } | null; // seeded procedural portrait, or plain grey slot
	}[];
	convoyHeroDelayMs: number; // GHOSTS on → hero launches INSIDE the last stagger slot ((N−1)·base − a hair)
	phantomBeatMs: number; // GHOSTS off → the empty-stage beat AFTER car 1 fully exits, before the hero arrives
	// (per-car transit durations + the push heroDelay = car1ExitMs + phantomBeatMs are computed at the flight
	//  sites, from the LIVE slot→window-edge distance)
};
export function deckScheduleFor(m: CameraMove | null): DeckSchedule {
	const dSeats = m?.to && m?.from ? Math.abs(m.to.x - m.from.x) : 0;
	const dYears = ccYearSpan(m); // |Δyears|, 0 when no time basis
	const norm = Math.max(Math.min(dSeats / 800, 1), Math.min(dYears / 120, 1));
	// COUNT BY RELATION (Sam's strongest note): a same-line hop (direct — uncle/grandparent/niece class) is a
	// SHORT riffle, 2–3 hard, never a cross-tree dive. Collateral scales with the metric to the cap.
	const direct = m?.relationClass === 'direct';
	const N = direct ? Math.round(2 + norm) : Math.min(DECK_N_CAP, Math.round(2 + norm * 5));
	const rng = mulberry32((m?.seq ?? 1) >>> 0);
	// PHOTO SLOTS: 1–2 seeded ghosts carry a PROCEDURAL blurred portrait (never real data — §22.4); the rest
	// keep the plain grey slot, because the corpus is mostly photoless and the riffle tells the truth.
	const photoWanted = Math.min(N, rng() < 0.5 ? 1 : 2);
	const photoIdx = new Set<number>();
	let guard = 0;
	while (photoIdx.size < photoWanted && guard++ < 40) photoIdx.add(Math.floor(rng() * N));
	const jitter = Array.from({ length: N }, (_v, i) => ({
		dtMs: (rng() * 2 - 1) * DECK_DT_JITTER,
		rotDeg: (rng() * 2 - 1) * DECK_ROT_JITTER,
		lanePx: (rng() * 2 - 1) * DECK_LANE_FAN, // the spread-deck fan across parallel tracks
		photo: photoIdx.has(i)
			? { hue: 20 + rng() * 45, offX: (rng() * 2 - 1) * 22, offY: (rng() * 2 - 1) * 14 }
			: null
	}));
	// CONVOY (ghosts on): the hero rides the pack's TAIL — inside the last stagger slot ((N−1)·base − a hair)
	// so it overlaps the final ghosts as they exit while it brakes. (× the deck tempo like everything else.)
	const convoyHeroDelayMs = Math.max(0, (N - 1) * DECK_STAGGER_BASE - 15) * deckTempo();
	// PHANTOM BEAT (ghosts off): the empty stage between car 1's full exit and the hero's arrival — the length
	// of the invisible train, scaled by relation. Direct = a short train; collateral/orbit = a long one.
	const phantomBeatMs =
		(direct ? DECK_BEAT_DIRECT + norm * 30 : DECK_BEAT_COLL + norm * 87) * deckTempo();
	return { N, staggerBaseMs: DECK_STAGGER_BASE, jitter, convoyHeroDelayMs, phantomBeatMs };
}

// DECK v4 — NO BLUR on the two real cards. The per-tick SVG feGaussianBlur ramp that used to sharpen the
// hero/car-1 as they moved was the tuning-fork shimmer (an animated filter forces a full re-raster every
// frame). Removed entirely: the real cards are always sharp. The visible ghosts (convoy mode) keep their
// STATIC filter in DeckRiffle — a fixed filter is cheap; only the animated ramp shimmered.

// The altitude arc's math + trigger live in arc-math.ts (shared with the arc clock + substrate); the arc
// clock itself (the single rAF the card + substrate both read) lives in arc.svelte.ts.

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
/** THE ARMY (see rowTravel): every row — leaving AND arriving — travels this one direction. */
export function getPanDir(): 'up' | 'down' | 'lateral' {
	return panDir;
}
/**
 * WHO is crossing from the parents row to the notch, if anyone — and the boolean form of the same
 * question. The identity matters because the carousel has to open a window that CONTAINS her seat
 * before she is told to fly to it (see the offset effect in +page.svelte).
 *
 * A parents-row → notch HAND-OFF is pending when a PARENT was promoted (pan 'down') and
 * one of the incoming card's spouses was standing in the outgoing PARENTS row at click time — i.e. the
 * other parent is crossing to the notch. Answerable synchronously at flight start, from the click-time
 * snapshot, which is why the anticipated notch can be armed before anything has moved. The clicked
 * person is excluded: they are becoming the card, not a chip.
 */
export function handoffSpouseId(spouseIds: readonly string[]): string | null {
	if (panDir !== 'down') return null;
	return spouseIds.find((id) => id !== clickedId && rectSnapshot.get(id)?.dir === 'up') ?? null;
}
/**
 * WHO is crossing a GENERATION GAP from the parents row to the CHILDREN row — the same question one tier
 * further down. Promote a grandparent and the parent you hovered to open the tier becomes the new focus's
 * child: he was standing in the parents row at click time (dir 'up') and has a seat in the children row on
 * the new page. Nobody else can be in that position. On an ordinary parent promotion this is empty — the
 * old focus lands in the children row but it is the PIVOT, which owns its own demote and carries no
 * data-flight-id to be snapshotted, and the new focus's other children were in the sibling panel, not in a
 * row. So the answer is [] for every navigation that does not come out of the tier.
 *
 * Answered from the click-time snapshot, synchronously, so the incoming seat can be HELD from the very
 * first frame — a seat revealed early would fade in under a traveller still crossing to it, which is the
 * doubled-copy this whole mechanism exists to prevent.
 */
export function rowHandoffIds(childIds: readonly string[]): string[] {
	if (panDir !== 'down') return [];
	return childIds.filter((id) => id !== clickedId && rectSnapshot.get(id)?.dir === 'up');
}

// HOW MANY TIERS THIS NAVIGATION CROSSES. One for every ordinary chip nav: a parent or a child is one
// generation away, so the army steps exactly one row's seat to the next. TWO when the clicked chip lives
// in the hover-revealed GRANDPARENT tier — that person is two generations up, and a one-pitch march has
// the rows covering half the ground the camera actually panned.
//
// Read off the DOM at click time (navigate.ts: `anchor.closest('[data-tier-span]')`), never inferred here.
// The block that OWNS a chip already states which tier it is — it is the same fact the layout used to
// place it — so asking the graph again would be a second answer that can disagree with the first.
let tierSpan = 1;
export function captureTierSpan(n: number): void {
	tierSpan = Number.isFinite(n) && n >= 1 ? Math.round(n) : 1;
}
export function getTierSpan(): number {
	return tierSpan;
}

// WAS THE TIER OPEN WHEN THIS NAVIGATION STARTED. Separate from tierSpan, which says how many tiers the
// CLICK crossed: the tier closes on ANY navigation made while it is open, so a parent or a child click
// gets the collapse too while crossing only one tier. Captured from the DOM at click time — the tier
// either is on screen or it is not, and that is not derivable from the clicked chip.
let tierOpen = false;
export function captureTierOpen(open: boolean): void {
	tierOpen = open;
}
/**
 * THE LAYOUT SHIFT THIS NAVIGATION IS ABOUT TO APPLY TO EVERY DESTINATION, in px.
 *
 * Transitions here are FLIPs: they measure a destination NOW and animate to it. That is exact while the
 * layout holds still, and it overstates the journey by exactly one tier pitch when the grandparent tier
 * is closing, because every seat measured before the collapse is one pitch lower than where it will
 * actually come to rest. The TRANSFORM is unaffected — a FLIP lands on its element's real layout
 * position whatever that turns out to be — but anything DERIVED from the measured delta inherits the
 * error, and the settle amplitude is the one you can see.
 *
 * Measured: the promoted grandparent's dy read −290 against a true on-screen descent of 145, so
 * settleBackFor sized the overshoot for double the travel and the card carried 4px past its seat where
 * an ordinary promotion carries 2. Every other object was finishing its own arrival at that instant, so
 * the whole stage appeared to sag and lift together right at the end. Sam: "a very small inverted arc…
 * all elements pulling up right at the final moment", and his own read of the cause was exact — "the
 * chips meet them slightly below their finished place."
 *
 * One pitch, by construction: the tier block is one row plus its connector, and the `.parents-slot` lead
 * gives back the difference (170 − 25 = 145). That identity is the tier's whole geometry, so this reads
 * the pitch rather than restating the number.
 */
function pendingCollapse(): number {
	return tierOpen ? rowTravel() : 0;
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
type ZoneDir = 'up' | 'down' | 'lateral';
type PinRect = { left: number; top: number; width: number; height: number; dir?: ZoneDir };
let rectSnapshot = new Map<string, PinRect>();
export function captureRects(boxes: Iterable<Element>): void {
	const next = new Map<string, PinRect>();
	for (const node of boxes) {
		const el = node as HTMLElement;
		const id = el.dataset.flightId;
		if (!id) continue;
		const r = el.getBoundingClientRect();
		// dir = the box's ZONE (data-flight-dir). Carried so a consumer can ask which row a person was
		// standing in when the click happened — see handoffPending.
		next.set(id, {
			left: r.left,
			top: r.top,
			width: r.width,
			height: r.height,
			dir: el.dataset.flightDir as ZoneDir | undefined
		});
	}
	rectSnapshot = next;
}

// Clear the per-navigation captures one frame after the transition flush consumed them, so a
// later nav with NO click (back/forward) can't reuse a stale id / direction / pinned rect.
export function clearFlightCaptures(): void {
	rowClock = null; // per-navigation: the next nav derives its own row/demote tempo
	rowPitch = null;
	clickedId = null;
	panDir = 'lateral';
	pivotId = null;
	rectSnapshot = new Map();
	// The §19 sibling plan is a per-navigation capture like every other one here, so it dies with them
	// rather than on a lifecycle of its own. It can be cleared this early — one rAF after the swap —
	// because all three of its consumers read it during that flush and none of them polls: shrinkTo takes
	// it ONCE at outro init and carries it in the transition's closure (the same way it holds `card`,
	// `face` and `heroOrigin`), the panel's effect applies it once and remembers it by reference, and the
	// page's close-effect only asks whether this navigation is a mutation.
	clearSiblingNavPlan();
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
const RELATIVE_V_CEIL = 1.68; // avg px/ms — tune by feel. 1.6 → 1.68 on Sam's verdict; a further
// step to 1.76 was tried and REVERTED ("faster than human eye") — 1.68 is the settled pace. ONE number now moves everything the eye reads as tempo: the
// parent/child promotion, the demotion that follows it, and — through rowClockMs — every row's march.
// That coupling is the point: the board shifts as one object, so its pace is one dial.
// The SPOUSE demote travels a touch faster than the relative family (its own honest ceiling), which — via
// the coupled clock (hero = max(curve, demote+60)) — speeds up the spouse PROMOTION too, without cramming
// (the demote genuinely covers its path faster). Guarded by probe-demote-velocity staying well green.
const SPOUSE_DEMOTE_V_CEIL = 1.85;
// SIBLING arrival velocity — its OWN dial, deliberately gentler than the 1.6 relative ceiling. Clocked off
// CENTER travel (the honest translation; corner travel of a 119×54 chip over-inflates), the 1.6 ceiling
// floored the arrival to ~410ms (≈1.42 px/ms — Sam: too fast) while the untuned 582ms floated (≈1.01). This
// is the midpoint: ~1.2 px/ms ≈ 490ms over the ~588px sibling center travel. TUNE BY FEEL. The 1.6 relative
// ceiling (parent/child) is untouched.
// 1.2 → 1.0 (Aug 4). Sam: "the transition is happening at super human speeds in sibling chip transitions
// inbound and outbound. the parent and child chips have some heft and feeling of physical discrete
// baseball cards, and sibling chips too fast by at least 20%." A velocity ceiling is the honest instrument
// for heft (§17.1 — perceived weight is velocity, not duration), so the dial moves rather than any
// duration: −20% velocity is +20% duration on BOTH sides of the navigation, because both derive from
// siblingBaseMs. The promotion keeps its extra 8% on top (SIBLING_PROMOTE_TEMPO).
const SIBLING_V_CEIL = 1.0; // px/ms — sibling arrival dial
export function relativeGrowMs(distance: number): number {
	return Math.min(1000, Math.max(410, distance / RELATIVE_V_CEIL));
}
/**
 * The sibling clock at its base velocity — the reference BOTH sides of the navigation are derived from.
 * `siblingGrowMs` is this × a tempo that applies to the PROMOTION ONLY.
 *
 * Sam (Aug 4): the promotion "has sped up to where it happens in the blink of an eye — can that promotion
 * of sibling chip transition be slowed by 8% but the Featured Card to sibling chip demotion stay the same
 * velocity?" The demote reads this un-tempoed function, so its distance and its duration are both
 * unchanged and its velocity is therefore identical. One derivation, one tempo knob on one side of it —
 * NOT two clocks, which is the §18.2 defect this replaced.
 */
export function siblingBaseMs(centerDist: number): number {
	return Math.min(1000, Math.max(410, centerDist / SIBLING_V_CEIL));
}
const SIBLING_PROMOTE_TEMPO = 1.08; // +8% on the arriving card only — see siblingBaseMs
export function siblingGrowMs(centerDist: number): number {
	return siblingBaseMs(centerDist) * SIBLING_PROMOTE_TEMPO;
}
// SPOUSE promotion duration — now the SAME velocity family as the parent/child regime (V-ceiling 1.6),
// just a higher floor (SPOUSE_FLOOR_MS) so the in-corner swaps carry human weight instead of snapping.
// The floor covers every swap up to ~744px (SPOUSE_FLOOR_MS·V_CEIL), so the whole common spouse range
// lands in ONE tight duration band (flattened — a short top-center swap and a full-width swap feel the
// same speed); only true cross-screen swaps scale up at the shared 1.6 px/ms ceiling. This is the FLOOR
// for the hero; spouseHeroDurationMs below may EXTEND it so the demote can travel at honest velocity.
const SPOUSE_FLOOR_MS = 420;
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
	const ownDuration = demoteMaxCorner / SPOUSE_DEMOTE_V_CEIL; // honest: fastest corner obeys the SPOUSE ceiling
	return Math.max(spouseGrowMs(heroDist), ownDuration + SPOUSE_FINISH_LEAD_MS);
}
// The RELATIVE demotion runs shorter than its matching promotion (×this lead) so it always FINISHES first
// — the leaving card releases attention to the hero and never competes with the hero's landing. (The
// SPOUSE demote gets its finish-first from spouseHeroDurationMs / SPOUSE_FINISH_LEAD_MS above, at honest
// velocity — see shrinkTo.)
const DEMOTE_LEAD = 0.85;

// DEMOTE SETTLE — the reciprocal of the promotion settle, on the DEMOTING elements (the leaving featured
// card via shrinkTo, and its spouse via morphIn). Same easeOutBack machinery, aimed INWARD: the element
// crosses its seat, overshoots a few px PAST it, and returns — one unbroken curve, endpoints frozen (so
// departure + arrival + duration + the unfurl schedule are untouched; only the middle gains the tail).
// Amplitude is proportional to the DESTINATION FOOTPRINT (a small chip seat carries less than a big parent
// box) with a perception FLOOR so it never vanishes at chip scale, dialled by DEMOTE_SETTLE_RATIO.
const DEMOTE_SETTLE_RATIO = 0.45; // amplitude dial — tune by feel on the rendered cards
const DEMOTE_SETTLE_FLOOR_PX = 2.2; // perception floor — below this the settle reads as nothing at chip scale
const DEMOTE_SETTLE_CAP_PX = 9; // ceiling — a demote overshoot larger than this is a lunge (raised from 6.5 to
// give the child dial headroom; parent 2.2 and spouse 3.66 sit far below it, so they're unaffected).
// PER-SEAT amplitude dials — INDEPENDENT (per-seat doctrine). Parent and child seats face different travel,
// scale delta, and landing context, so they never share a number.
// PARENT: Sam's verdict — too strong, take it to the FLOOR. At 0.6 the parent targetPx (0.45·232·0.035·0.6 =
// 2.2) lands exactly on DEMOTE_SETTLE_FLOOR_PX, so the floor dominates and this factor is INERT (further
// reduction needs lowering the floor). Applies ONLY to the card demoting UP into a parent seat. FROZEN.
const DEMOTE_SETTLE_PARENT_FACTOR = 0.6;
// CHILD: applies ONLY to the card demoting DOWN into a child seat. Ratio-driven (targetPx 3.66 at factor 1,
// well above the floor — a real dial, not floor-clamped). At 1.57px the child read too imperceptible (Sam);
// its ~3× travel + dramatic shrink want MORE overshoot than the parent to read equally. Being bracketed.
const DEMOTE_SETTLE_CHILD_FACTOR = 1.6;
// SIBLING seat (§21.3): factor 1 → the solver floors at DEMOTE_SETTLE_FLOOR_PX, a ~2.2px carry at chip
// scale. Deliberately the smallest of the three — "not dramatic theatrical overshoot" (Sam).
const DEMOTE_SETTLE_SIBLING_FACTOR = 1;
// Solve easeOutBack's overshoot parameter s so the carry hits targetPx (footprint-scaled), same Newton
// solve as settleBackFor. distance = the element's own travel; footprint = the destination box's diagonal;
// factor trims the amplitude per-direction (1 = full; parent-seat landings pass DEMOTE_SETTLE_PARENT_FACTOR).
function demoteSettleBackFor(distance: number, footprint: number, factor = 1): number {
	if (distance < 1) return 0;
	const targetPx = Math.min(
		DEMOTE_SETTLE_CAP_PX,
		Math.max(DEMOTE_SETTLE_FLOOR_PX, DEMOTE_SETTLE_RATIO * footprint * 0.035 * factor)
	);
	return solveBackS(Math.min(0.14, targetPx / distance));
}

/**
 * `in:growFrom` — fly the featured card from the click-captured box rect to its
 * own layout position (canonical FLIP, top-left origin). Consumes the captured
 * rect, so a cold load / back-forward nav (no click) just appears instantly.
 */
export function growFrom(node: Element) {
	const origin = flightOrigin;
	flightOrigin = null; // consume: no click → no stale reuse
	// A cold load / reduced motion / a card with no box has NO flight — clear the published schedule so
	// the blade can't inherit the previous navigation's clock and draw on a page that never flew.
	if (!origin || prefersReducedMotion.current) {
		heroSchedule = { duration: 0, delay: 0, kind: 'relative', axis: 'lateral' };
		return { duration: 0 };
	}
	const dest = node.getBoundingClientRect();
	if (!dest.width || !dest.height) {
		heroSchedule = { duration: 0, delay: 0, kind: 'relative', axis: 'lateral' };
		return { duration: 0 };
	}

	// CC (directional arrival): IGNORE the click origin (a text-link rect) — the card enters WHOLE from
	// offscreen along the world vector, full size (no scale morph), and settles into the slot.
	// CC ARC (far collateral): the camera scale carries the motion instead — the card DESCENDS onto the seat
	// (no offscreen slide: dx=dy=0), entering only for the descent phase while the arc clock scales it up.
	const cc = flightKind === 'cc';
	const arcM = cc ? getCameraMove() : null;
	const arc = cc && isArcMove(arcM);
	const arcDur = arc ? arcDurationMsFor(arcM) : 0;
	const ccDir = cc && !arc ? deckDirFor(getCameraMove()) : { x: 0, y: 0 }; // DECK: riffle entry direction
	const sched = cc && !arc ? deckScheduleFor(getCameraMove()) : null; // DECK: convoy shape (hero = last car)
	// DECK hero entry = the LIVE slot→window-edge distance along ccDir (+ margin), not a fixed constant that
	// sat inside real windows and left the delayed hero peeking (the frozen jut). Arc: ccDir=0 → dx=dy=0.
	const ccEntry =
		cc && !arc ? deckExit(ccDir, dest.left, dest.top, dest.width, dest.height) : { x: 0, y: 0 };
	const dx = cc ? ccEntry.x : origin.left - dest.left;
	// + pendingCollapse(): `dest` is measured NOW, and the tier's collapse is applied one flush later, so
	// this seat is about to rise one tier pitch. Correcting the delta arithmetically — rather than trying to
	// make the layout settle before the measurement — is what lets the collapse be INSTANTANEOUS again, and
	// an instantaneous collapse is the only version of it that cannot fight anybody's clock. Zero when no
	// tier is closing, so every ordinary flight is untouched.
	const dy = cc ? ccEntry.y : origin.top - dest.top + pendingCollapse();
	// PHANTOM BEAT (push): the hero waits until car 1 is FULLY offscreen, then the empty-stage beat. Car 1
	// exits along −ccDir from THIS same slot rect (it was the outgoing featured card here), so its exit time
	// is computable right here without cross-talk. Strict EXIT → BEAT → ENTRY; no co-occupancy, ever.
	const car1Exit =
		cc && !arc
			? deckExit({ x: -ccDir.x, y: -ccDir.y }, dest.left, dest.top, dest.width, dest.height)
			: { x: 0, y: 0 };
	const car1ExitMs =
		(Math.hypot(car1Exit.x, car1Exit.y) / DECK_GHOST_V) * deckTempo() * DECK_TRAVEL_TEMPO;
	const sx = cc ? 1 : origin.width / dest.width;
	const sy = cc ? 1 : origin.height / dest.height;
	const distance = Math.hypot(dx, dy);
	// SIBLING velocity match: the card grows from a tiny 119×54 chip, so its TOP-LEFT-corner travel
	// (`distance`) is inflated by the scale-up — clocking the flight off it makes the CENTER translate ~30%
	// slower than a parent/child promotion (which grow from larger, nearer boxes), so the sibling "floats".
	// Clock the sibling DURATION off the CENTER travel instead — the honest translation the eye tracks — so
	// its px/ms matches parent/child at the SAME 1.6 ceiling (no ceiling change). The transform (dx,dy) and
	// the settle amplitude (settleBackFor(distance)) are UNCHANGED — still the real chip→slot corner path.
	const durDistance =
		flightKind === 'sibling'
			? Math.hypot(
					origin.left + origin.width / 2 - (dest.left + dest.width / 2),
					origin.top + origin.height / 2 - (dest.top + dest.height / 2)
				)
			: distance;

	// Distance-scaled; the floor/slope depend on the flight kind (spouse = brisk in-corner morph,
	// parent/child = velocity-capped travel, cc = a long directional journey from offscreen).
	let duration: number;
	// The beat before the hero enters: a far dive WAITS while the decades rush (passage). An ARC instead
	// runs its transition for the WHOLE arc and takes BOTH its scale AND its reveal timing from the shared
	// arc clock (not its own t) — so it can never drift from the substrate. Near CCs delay 0 (conveyor).
	// CONVOY (ghosts): hero launches inside the last stagger slot. PUSH (v4.2.2): NO OVERLAP — the hero waits
	// for car 1 to FULLY exit, THEN the empty-stage beat, THEN it enters. The exiting and entering cards are
	// never on screen together; the empty gap between them IS the large-tree distance (Sam). heroDelay =
	// car1ExitMs + beat.
	const ccDelay = arc
		? 0
		: sched
			? DECK_GHOSTS
				? sched.convoyHeroDelayMs
				: car1ExitMs + sched.phantomBeatMs
			: 0;
	if (arc) {
		duration = arcDur; // run the whole arc; opacity/scale are driven by the arc clock inside css
	} else if (cc) {
		// DECK v4.2.1: the ENTERING card runs 10% quicker than the exit (DECK_HERO_V_MULT) but still decelerates
		// through the brake tail into the slot — quick in, slowing to land. Viewport-honest (distance off the
		// live slot→edge). × deckTempo() for the global 10% speed-up, ×CAROUSEL_TEMPO again on a shuffle
		// (curve/heft/overshoot all unchanged in both cases).
		duration = sched
			? (distance / (DECK_GHOST_V * DECK_HERO_V_MULT) + DECK_BRAKE_MS) *
				deckTempo() *
				DECK_TRAVEL_TEMPO
			: ccDurationMs();
	} else if (flightKind === 'spouse') {
		// Extend the hero to honor the demote's honest-velocity clock (below), so the two share one clock
		// and neither the growing hero nor the shrinking demote ever exceeds the ceiling. The demote starts
		// at THIS slot (dest) and shrinks into the pivot's notch seat; its max-corner travel sets the floor.
		const seat = pivotId
			? document.querySelector(`[data-flight-id="${pivotId}"]`)?.getBoundingClientRect()
			: null;
		const demoteMax = seat && seat.width ? maxCornerTravel(dest, seat) : distance;
		duration = spouseHeroDurationMs(distance, demoteMax);
	} else if (flightKind === 'sibling') {
		duration = siblingGrowMs(durDistance); // center travel at the gentler sibling dial (~1.2 px/ms)
	} else {
		// HONEST VELOCITY on the PROMOTION (Aug 3) — the same correction the spouse DEMOTE got as the
		// photo-whiplash fix, finally applied to the growing card. Clocking a parent/child promotion off the
		// TOP-LEFT corner understates it badly, because a card grows as much as it travels: promoting a parent
		// moves that corner 276px while the BOTTOM-RIGHT corner covers 977px, so the fastest corner ran
		// 1.91 px/ms against a 1.6 ceiling (child promotion: 545 vs 975, 2.06 px/ms). Both sat on the 410ms
		// floor and neither obeyed the ceiling the constant exists to enforce — which is exactly Sam's
		// "beyond human capacity to see weight and heft" on the parent promotion, where the ratio is worst
		// (3.5×: the card explodes off a corner that barely moves, so there is no travel for the eye to hold).
		// maxCornerTravel times the FASTEST point of the card, so nothing on it exceeds RELATIVE_V_CEIL.
		duration = relativeGrowMs(maxCornerTravel(origin, dest));
	}
	// SETTLE — the whole-path easeOutBack overshoot on the PROMOTION, now on BOTH regimes (Layer 3:
	// extended from spouse to relative parent/child promotions). Active only on a WARM click whose camera
	// move kind matches this flight's kind (cold loads / back-forward publish no matching move → plain
	// cubicOut, no settle). The overshoot direction is the flight's own (dx,dy) axis — identical to the
	// camera screenVector (validated by probe-camera). Same ~5–6px excursion for both.
	const settleActive = getCameraMove()?.kind === flightKind;
	// The DECK arrival (cc) overshoots 10% harder than chip/spouse promotions — a heavier card settling.
	// No trim any more, and that is the tell that the delta is finally honest: dx/dy now describe the
	// journey the object actually makes, so the house amplitude is right by default. The trim that used to
	// sit here only ever compensated for a dy that was one tier pitch too long.
	const settleS = settleActive ? settleBackFor(distance, cc ? DECK_SETTLE_BOOST : 1) : 0;
	if (import.meta.env.DEV && settleActive) {
		const g = (4 * settleS ** 3) / (27 * (1 + settleS) ** 2);
		console.log(
			'[settle]',
			JSON.stringify({
				dist: Math.round(distance),
				s: +settleS.toFixed(2),
				carryPx: +(g * distance).toFixed(1)
			})
		);
	}
	// ── PUBLISH THE HERO'S SCHEDULE ─────────────────────────────────────────────────────────────────
	// The CC blade draws INSIDE this flight, and where inside it matters: `delay` is dead time before the
	// hero enters at all (on a deck arrival the card is still offscreen), so the blade has to be placed
	// against duration-after-delay, not against the wall clock. Same capture-at-the-seam pattern as
	// captureFlightKind / capturePanDir — written by the hero as it launches, read in the same flush.
	// The KIND rides along because the blade cannot use one clock for both: a CC arrival is a long
	// cross-country flight and a chip promotion is a short hop, and a draw sized for one is wrong in the
	// other (Sam). Reading flightKind later would race clearFlightCaptures, which resets it a frame after
	// the swap — the same trap panDir set. Captured here, with the clock it belongs to.
	heroSchedule = {
		duration,
		delay: ccDelay,
		kind: flightKind,
		axis: Math.abs(ccDir.y) > Math.abs(ccDir.x) ? 'vertical' : 'lateral'
	};
	// FIRST-FRAME FLASH FIX: Svelte applies a css-transition's keyframes one frame LATE, so frame 0 paints
	// the card at its DESTINATION (natural layout) before the animation jumps it to the origin — a visible
	// flash with a photo. Set the t=0 (origin) transform INLINE now, so frame 0 is already at the clicked
	// chip; the keyframe animation (whose 0% is the same origin) then takes over seamlessly. Cleared at
	// introend (onIncomingLand) so the landed card rests at identity — else it would snap back to origin.
	const hero = node as HTMLElement;
	if (arc) {
		// ARC: the card DESCENDS onto the seat — no slide, no chip-morph. BOTH its scale AND its fade-in are
		// read from the shared arc clock (never its own transition t), so it stays locked to the substrate:
		// invisible through the rise+traverse, fading in as the descent begins, at the clock's own scale.
		hero.style.transformOrigin = 'center center';
		hero.style.opacity = '0';
		hero.style.transform = `scale(${arcClock.scale})`;
		hero.style.zIndex = '2';
		return {
			duration,
			delay: ccDelay,
			easing: (x: number) => x,
			// tick (NOT css): css transitions are keyframe-sampled ONCE at setup, which would freeze the live
			// arc clock. tick runs every frame, so the card reads the shared clock's scale + reveal in real time.
			tick: () => {
				const s = arcClock.active ? arcClock.scale : 1;
				const op = arcClock.active ? Math.max(0, Math.min(1, (arcClock.t - ARC_DESC) / 0.12)) : 1;
				hero.style.transform = `scale(${s})`;
				hero.style.opacity = `${op}`;
			}
		};
	}
	// DECK v4 hero: the arriving card enters at convoy tempo along deckDir and BRAKES through the house
	// curve + settle into the slot. NO BLUR (sharp at every frame — the animated filter was the shimmer).
	// A seeded TILT + small lane draw IRON to 0 as it settles: it arrives angled, straightening as it lands.
	// cc has no scale morph (sx=sy=1), so transform is translate + rotate only.
	if (cc) {
		const horiz = Math.abs(ccDir.x) >= Math.abs(ccDir.y); // lateral entry → banks only; vertical → leans
		const perp = { x: -ccDir.y, y: ccDir.x }; // perpendicular to travel → the draw axis
		const jH = sched?.jitter[sched.N - 1] ?? { lanePx: 0, rotDeg: 0, dtMs: 0 }; // seeded per flight (protected variation)
		// Push → a FLOORED seeded draw (never flat), per-axis tilt; convoy → the full un-floored fan character.
		const draw = DECK_GHOSTS
			? { rot: jH.rotDeg, lane: jH.lanePx }
			: pushDraw(jH.rotDeg, jH.lanePx, horiz);
		const lx = draw.lane * perp.x;
		const ly = draw.lane * perp.y;
		const rot = draw.rot; // seeded ±2.5–4° draw, ironing to 0 as it settles
		hero.style.transformOrigin = 'center'; // cc is translate-only (no scale) → rotate about centre
		hero.style.transform = `translate(${dx + lx}px, ${dy + ly}px) rotate(${rot}deg)`;
		// BELT vs the frozen jut (fix 1b) AND the phantom beat: INVISIBLE from mount until its first MOTION
		// frame. Through the whole heroDelay (car 1's exit + the empty beat) it sits offscreen at opacity 0 —
		// a stationary hero never paints, so car 1 and the hero can never co-occupy the stage. The first tick
		// (motion begins, car 1 long gone) reveals it, already offscreen and moving.
		hero.style.opacity = '0';
		hero.style.zIndex = '3'; // ABOVE car 1 (z 2) — belt for any cancellation edge case where they overlap
		return {
			duration,
			delay: ccDelay,
			easing: (x: number) => x,
			tick: (t: number) => {
				hero.style.opacity = '1'; // first motion frame → reveal (was 0 through the delay + beat)
				const e = settleActive ? easeOutBack(t, settleS) : cubicOut(t);
				const u = 1 - e; // 1 at entry → 0 (past 0 briefly on the settle overshoot) at rest
				hero.style.transform = `translate(${u * (dx + lx)}px, ${u * (dy + ly)}px) rotate(${(u * rot).toFixed(2)}deg)`;
			}
		};
	}
	hero.style.transformOrigin = 'top left';
	hero.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
	hero.style.zIndex = '2';
	return {
		duration,
		delay: ccDelay, // the passage beat (0 for chip navs and near CCs)
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
	// CC (directional arrival): the old card leaves the NEIGHBOURHOOD, not landing in it — depart WHOLE
	// (no chip-face, no destination box), sliding OFFSCREEN the OPPOSITE way the new card enters, shrinking
	// modestly, finish-first (heroDur − 60ms). Non-degenerate exit so Svelte cleans it. (SIBLING departures
	// do NOT use this branch — see the spouse-retraction reuse below.)
	if (flightKind === 'cc') {
		const arcM = getCameraMove();
		if (isArcMove(arcM)) {
			// ARC: the old card RECEDES on the shared arc clock (scale 1 → scaleMin over the rise), fading out
			// before the traverse — no opposite slide. Same clock the incoming card + substrate read.
			const rise = Math.max(200, ARC_RISE * arcDurationMsFor(arcM));
			el.style.zIndex = '1';
			el.style.transformOrigin = 'center center';
			return {
				duration: rise,
				easing: (x: number) => x,
				// tick so the recede reads the LIVE arc clock (scale 1 → scaleMin), not a frozen setup sample.
				tick: (t: number) => {
					el.style.transform = `scale(${arcClock.active ? arcClock.scale : 1})`;
					el.style.opacity = `${Math.min(1, t * 2.2)}`;
				}
			};
		}
		// DECK v4 — CAR 1: the departing card leaves FIRST and FULLY, ACCELERATING from rest to convoy speed
		// along −deckDir, exiting the far edge at full opacity — a real card leaving, never dimmed in place.
		// NO BLUR (sharp at every frame). A seeded tilt is DRAWN in as it goes (the exit's own angle); it stays
		// on top of nothing here — with the phantom beat, the hero doesn't paint until car 1 is long gone.
		const dir = deckDirFor(arcM); // offscreen START; the card travels −dir
		// Exit terminus = the LIVE distance from car 1's rest rect to just past the FAR window edge (−dir),
		// not a fixed DECK_TRAVEL that a wide window would leave a sliver of. Duration off that honest distance.
		const exit = deckExit({ x: -dir.x, y: -dir.y }, card.left, card.top, card.width, card.height);
		const ex = exit.x,
			ey = exit.y;
		const car1Ms = (Math.hypot(ex, ey) / DECK_GHOST_V) * deckTempo() * DECK_TRAVEL_TEMPO; // rest → fully offscreen (× tempo, × travel-tempo)
		const sched = deckScheduleFor(arcM);
		const j0 = sched.jitter[0]; // seeded per flight (protected variation)
		const horiz = Math.abs(dir.x) >= Math.abs(dir.y); // lateral exit → banks; vertical → leans
		const perp = { x: -dir.y, y: dir.x };
		// Push → a FLOORED seeded draw (never flat), per-axis tilt; convoy → the full un-floored fan character.
		const draw = DECK_GHOSTS
			? { rot: j0.rotDeg, lane: j0.lanePx }
			: pushDraw(j0.rotDeg, j0.lanePx, horiz);
		const lx = draw.lane * perp.x,
			ly = draw.lane * perp.y;
		const rot = draw.rot;
		// WEIGHT PHYSICS (v4.2): the card is HEAVY leaving its slot. It doesn't dart off at a uniform clip — it
		// starts slow, reluctant, and ACCELERATES away (easeIn, every axis now, not just the downward fall Sam
		// loved). Cards have weight, not engines: they lean into the exit and build speed, never launch flat-out.
		el.style.zIndex = '2'; // below the incoming hero (z 3); above the ghost layer (z 1) in convoy mode
		el.style.transformOrigin = 'center';
		return {
			duration: car1Ms,
			easing: (x: number) => x,
			// u = 1 − t (out): 0 at rest → 1 gone. easeIn (u²) — slow, weighty start; accelerating exit. The tilt
			// DRAWS IN with it: 0° at rest → full ±draw as it leaves, so the angle is a transition, never a snap.
			tick: (_t: number, u: number) => {
				const e = u * u;
				el.style.transform = `translate(${e * (ex + lx)}px, ${e * (ey + ly)}px) rotate(${(u * rot).toFixed(2)}deg)`;
			}
		};
	}
	const relative = flightKind === 'relative';
	// SIBLING RETRACTION (Slice 3): the old focus exits EXACTLY like a promoted-spouse demote — it retracts
	// into the top-right notch corner, sizing down, linear velocity (the anti-strobe curve), chip-face
	// crossfade. It reuses this whole spouse branch verbatim; the ONLY substitution is the destination. A
	// spouse demote docks into a real seat box ([data-flight-id]); a sibling has no such box (it lands in the
	// closed panel, not a roster seat), and Sam wants a FIXED destination with no per-pair variance. So the
	// seat is a fixed top-right corner rect derived from the card's own geometry — same for every sibling
	// pair (no vector, no capture). The card shrinks into the corner and is removed (no persistent chip).
	const sibling = flightKind === 'sibling';
	// §19 — THE PANEL MUTATION. When the sibling panel is OPEN, the demoted person is not leaving the
	// scene at all: he is being RE-FILED as a chip in the list the promoted sibling just left. The
	// retraction below was correct only while the panel was always shut ("a sibling has no such box — it
	// lands in the closed panel, not a roster seat"), so with a real seat available the card docks into
	// it exactly the way a spouse demote docks into its notch chip. The plan is computed before the swap
	// (state/siblingNav.ts) because the strip may be GLIDING to bring that seat into the window, and the
	// traveller must target where the seat COMES TO REST — Sam's ruling on the fork, so the scroll and
	// the flight resolve together rather than one after the other.
	//
	// Null plan → panel shut, incoming person has no panel, or no seat for him. Everything below then
	// runs exactly as it did: the fixed corner rect, z:-1, hidden behind the card.
	const sibPlan = sibling ? getSiblingNavPlan() : null;
	// Fraction of the demote's clock spent PARKED on the seat once the travel is done (see the tick).
	// ~2 frames — enough that the card is painted at rest before Svelte removes it, short enough that it
	// never reads as a pause. Not a fudge for the clock: the clock is right, the last frame was simply
	// never painted. Trimmed 0.08 → 0.04 once the travel got its easeOutBack tail, which is already
	// near-stationary at the end; this is now only the guarantee of a painted resting frame.
	const SEAT_HOLD = 0.04;
	// §21.3 — SHAPE EARLY, THEN SLIDE. Sam: the demote "looks like it's coming down from a high level and
	// being vacuumed up into the sibling chip space", and its direction fights the promotion, which
	// "doesn't feel like it's moving up, it's expanding out". The cause is that scale and translation ride
	// ONE progress, so the card is still shrinking hard in the last 100ms — measured, still 271px wide at
	// t=506 of a 555ms flight, in full view. A shrink that large, that late, reads as descent.
	//
	// So the FOOTPRINT resolves on its own, faster progress and the rest of the journey is pure lateral
	// translation of a finished object. Measured, the hero occludes the demote from t≈200 to t≈470 (peak
	// 93–99%), which is where this puts the whole shape change AND — because every face crossfade below is
	// keyed to shell width, not to the clock — the whole content change with it. The chip emerges from
	// behind the arriving card already finished, which is exactly what Sam asked for: "when it emerges
	// into view from below the incoming transitioning Featured Card it should be in its final form
	// already for a long time."
	const SHAPE_AT = 0.55; // travel fraction by which the footprint is final
	// The demote lands BEFORE the hero — Sam: "they should land at the same time, even the sibling chip in
	// final position 50ms before the Featured Card is in position." It measured at 0ms, and not by design:
	// a sibling demote was clocked by `spouseHeroDurationMs`, a formula from the spouse regime, while the
	// sibling HERO runs on `siblingGrowMs` at its own gentler ceiling. Two clocks for one stage — §18.2's
	// defect exactly. It now reads the hero's own curve.
	//
	// The lead is stated against the moment the chip STOPS MOVING, which is what "in final position" means
	// and is SEAT_HOLD short of the clock ending — measuring it against the duration instead put the chip
	// at rest 84ms early, well past what was asked.
	const SIBLING_FINISH_LEAD_MS = 50;
	const SIB_SEAT_W = 160; // compact spouse-chip size = the notch seat the retraction sizes down to
	const SIB_SEAT_H = 65;
	// The endpoint sits at the CARD-EDGE RESUME (just below the notch cutout), not the top-right corner. The
	// retraction rides at z:-1, so the incoming card occludes it wherever that card is OPAQUE — but the card
	// is CLIPPED at its notch cutout (top-right), and while flying it's .flat (solid) so it covers the corner,
	// yet the instant the cutout reforms at landing the corner is exposed and the retraction's endpoint showed
	// through it (the tic). Dropping the endpoint below the notch line (~chip-zone height) lands it in the
	// OPAQUE body, which occludes it at every phase — flat AND resting-with-cutout. This is the same anchor
	// line the sibling column + caret align to, so it reads as consistent, not a concession. (A notch is why
	// "behind the card" is not a reliable hiding place — see the ghost taxonomy.)
	const SIB_SEAT_TOP_INSET = 100; // > max chip-zone height (90) so the endpoint clears the cutout in every regime
	const siblingSeat = sibling
		? (sibPlan?.seat ?? {
				left: card.left + card.width - SIB_SEAT_W,
				top: card.top + SIB_SEAT_TOP_INSET,
				width: SIB_SEAT_W,
				height: SIB_SEAT_H
			})
		: null;
	// The demoting card's chip-face (a PersonBox, natural 220×75) — counter-scaled per frame below so
	// it renders undistorted inside the shell's non-uniform morph. Cached once. BOTH kinds now use it:
	// the spouse demote is a visible solid object too (Layer 2 — unified with the L3a relative machinery),
	// flying up-right into its notch seat and atomic-swapping into the real chip at landing.
	const face = el.querySelector('.demote-chipface') as HTMLElement | null;
	// The card's OWN face (header/name = .card-top, plus .footer) — cached so the GEOMETRY-KEYED CROSSFADE
	// (below) can fade them out keyed to shell width, overlapping the chip-face fade-in. Replaces the old
	// time-based CSS crossfade entirely (no clock-based face logic remains).
	const cardTop = el.querySelector('.card-top') as HTMLElement | null;
	const footer = el.querySelector('.footer') as HTMLElement | null;
	const FACE_W = 220;
	const FACE_H = 75;
	// THE SEAT FACE — §19, and the same wall §18.4 hit with a 3+-spouse notch. The chip-face above is a
	// PersonBox rendered `relation="parent"`: 220×75, full short name, parent type scale. A sibling seat is
	// 119×54, FIRST NAME ONLY, and its own smaller type scale — a different aspect ratio (2.20 vs 2.93) and
	// a different object. There is no single transform that lands that footprint AND keeps the parent face
	// undistorted, so the card would arrive as a 119×40.5 parent chip and the atomic swap would grow it
	// 13.5px in one frame. The answer is §18.4's: carry the DESTINATION's face as a second layer, counter-
	// scaled every frame to stay uniform and reach exactly 1.0 at the seat, and crossfade to it on the way
	// in. Mirroring the name (onOutgoingStart) got the WORD right; this gets the object right.
	const SEAT_FACE_W = 119;
	const SEAT_FACE_H = 54;
	// The seat face takes over the CHIP-FACE's OWN BAND (REVEAL_LO/REVEAL_HI) rather than running after it,
	// and on a §19 mutation the parent-style chip-face is then never shown at all. Two reasons, both Sam's:
	// the intermediate face is a WAY-STATION — the card's own face becoming a parent chip becoming a sibling
	// chip is two content changes where the story has one — and running it late meant the second change
	// landed exactly as the object emerged from behind the arriving card (measured at SHAPE_AT 0.55: seat
	// face complete at t=325, first visible at t=325, no margin at all). On the chip-face's band it
	// completes around t=230-270, deep inside the occlusion window, so what emerges has been finished for
	// ~100ms — "plenty of time to have the interior content in perfect condition prior to landing."
	let seatFace: HTMLElement | null = null;
	let seatFaceTried = false;
	// The chip-face's on-screen scale is capped at FACE_SCALE_MAX× its natural chip size — a ceiling on the
	// geometry; the CROSSFADE below is what keeps the NAME from ever reading billboard (invisible above
	// REVEAL_HI×). Uniform (aspect preserved), centered. BOTH regimes.
	const FACE_SCALE_MAX = 2.3;
	// GEOMETRY-KEYED CROSSFADE bands (×natural chip scale = shellWidth/FACE_W). The card's own face fades
	// OUT over [OUT_LO, OUT_HI] and the chip-face fades IN over [REVEAL_LO, REVEAL_HI], OVERLAPPING so at
	// every shell size something is visible (no blink) and the chip-face never paints above REVEAL_HI (no
	// billboard name). If a name still reads large, drop the whole band by 0.2 (one edit, keeps the overlap).
	const OUT_LO = 2.0;
	const OUT_HI = 2.4; // outgoing face: opaque ≥2.4×, gone ≤2.0×
	const REVEAL_LO = 1.7;
	const REVEAL_HI = 2.1; // chip-face: invisible ≥2.1×, opaque ≤1.7×
	// THE IMPLIED SEAT — the demote that has nowhere to land.
	//
	// A demote resolves its destination by querying the PIVOT's box: the seat the person we are leaving
	// takes on the new page. Promote a GRANDPARENT and that box does not exist — the old focus is now a
	// GRANDCHILD, and grandchildren are not drawn at this zoom. The tick then returned early on every
	// frame (`if (!box) return`), so the card FROZE at full size in the middle of the stage until Svelte
	// removed it: no shrink, no travel, no departure at all.
	//
	// The answer is the one rowTravel's own comment already states for a row leaving downward — it "is
	// moving into the GRANDCHILDREN seat below … they fade out before they arrive, so the seat is implied
	// and never asserted. Destination, not escape." So the card marches with the army instead of docking:
	// the army's step (marchTravel — two pitches out of the tier, which is exactly where a grandchildren
	// row would sit), into a natural chip footprint, wearing the army's own alpha band so it is gone well
	// before it arrives anywhere. Nothing is asserted that the page cannot show.
	//
	// Gated on the tier span rather than on "the query came back empty", deliberately. An empty query is
	// also what a NOT-YET-MOUNTED box looks like on the first frames (the mount-order fact this tick was
	// built around), and treating that as "no seat exists" would send every ordinary promotion off into a
	// phantom instead of letting it find its real box a frame later. A span > 1 is the structural
	// statement that the old focus has dropped out of the drawn generations entirely.
	const impliedSeat =
		relative && panDir === 'down' && tierSpan > 1
			? { left: card.left, top: card.top + marchTravel(), width: FACE_W, height: FACE_H }
			: null;
	// Demotion duration: derived from the HERO's flight — the SAME distance-scaled curve the promotion
	// uses for this kind, then ×DEMOTE_LEAD so the demote finishes ~15% sooner and clears the stage
	// before the hero lands. Distance = the clicked box (hero origin, snapshotted at click) → the featured
	// slot (which the demote starts from and the hero lands on: card ≈ hero dest). Using the CLICKED rect,
	// not the destination box, sidesteps mount-order (a child box may not be mounted yet at outro init).
	let demoteDuration = relative ? RELATIVE_EXIT_MS : SPOUSE_EXIT_MS;
	const heroOrigin = clickedId ? rectSnapshot.get(clickedId) : undefined;
	const heroDist = heroOrigin
		? Math.hypot(heroOrigin.left - card.left, heroOrigin.top - card.top)
		: 0;
	if (sibPlan) {
		// Clocked off the SIBLING HERO's own curve, so the two cards on stage share one clock and the
		// finish-first relationship is a stated 50ms rather than a coincidence. `siblingGrowMs` is the same
		// function growFrom calls, on the same centre-travel distance (captured at the seam — see
		// SiblingNavPlan.heroCenterTravel for why the outro cannot measure it itself).
		// siblingBaseMs, NOT siblingGrowMs: the +8% tempo Sam asked for is on the PROMOTION only, so the
		// demote reads the un-tempoed clock and its velocity is untouched. The consequence is stated rather
		// than hidden — the demote now settles further ahead of the hero than the 50ms it was tuned to,
		// because the hero got slower and this did not.
		const heroMs = siblingBaseMs(sibPlan.heroCenterTravel);
		demoteDuration = Math.max(300, (heroMs - SIBLING_FINISH_LEAD_MS) / (1 - SEAT_HOLD));
	} else if (relative) {
		// Same honest-velocity clock as the hero above (maxCornerTravel over the identical rect pair), so the
		// demote keeps its exact DEMOTE_LEAD relationship and still finishes first. Timing it off heroDist
		// while the hero timed off max-corner would silently break that lead.
		if (heroOrigin)
			demoteDuration = relativeGrowMs(maxCornerTravel(heroOrigin, card)) * DEMOTE_LEAD;
	} else {
		// SPOUSE demote at HONEST VELOCITY: time off the MAX-corner travel (the photo's fast bottom-left
		// path), not the top-left corner — so the photo never strobes. It shares the hero's extended clock
		// (spouseHeroDurationMs) and lands exactly SPOUSE_FINISH_LEAD_MS ahead — finish-first without any
		// cramming multiplier. (Same seat + same slot rect as growFrom, so both compute the same clock.)
		const seat =
			siblingSeat ??
			document.querySelector(`[data-flight-id="${params.id}"]`)?.getBoundingClientRect();
		const demoteMax = seat && seat.width ? maxCornerTravel(card, seat) : heroDist;
		const heroDuration = heroOrigin ? spouseHeroDurationMs(heroDist, demoteMax) : SPOUSE_EXIT_MS;
		demoteDuration = heroDuration - SPOUSE_FINISH_LEAD_MS;
	}
	// DEMOTE SETTLE gate: active only on a warm RELATIVE demote whose camera move matches (a couple demoting
	// into the parent row). Cold / back-forward publish no matching move → inactive → the tick reproduces the
	// pre-settle motion BIT-IDENTICALLY. The SPOUSE-swap demote (relative=false; honest-velocity LINEAR, kept
	// so the photo never strobes) is deliberately NOT settled — its base curve is preserved untouched.
	// §21.3: the sibling mutation gets a settle too. Sam: "maybe we even should add overshoot similar to
	// how the spouse chip slightly overshoots when demoted from parent chip position into the spouse chip
	// space. Not dramatic theatrical overshoot, but it gives a sense of weight and timing." It was excluded
	// only because this branch is shared with the SPOUSE demote, whose linear curve is load-bearing
	// (constant velocity so the photo never strobes) — and with the footprint now resolved early (SHAPE_AT)
	// the tail of a sibling demote is a small chip translating, not a photo shrinking, so that reason no
	// longer applies to it.
	const demoteSettleActive = (relative || !!sibPlan) && getCameraMove()?.kind === flightKind;
	let demoteSettleS: number | null = null; // solved lazily on the first frame the seat is known (mount-order safe)
	return {
		duration: demoteDuration,
		// EASING IS IDENTITY so `t` arrives RAW: the base curve AND the settle are applied INSIDE the tick (a
		// css-transition can't overshoot past the moving seat this tick re-queries). The base is reproduced
		// exactly — RELATIVE keeps cubicOut (approved), SPOUSE keeps LINEAR (constant velocity so the fast
		// photo corner never strobes — cubicOut's fast start peaks ~3-4× the average). Non-settle is therefore
		// BIT-IDENTICAL to the pre-flip build (relative→cubicOut(p), spouse→p); settle replaces the base with
		// easeOutBack. Verified empirically: under identity, u == raw linear progress p, and cubicOut(p) equals
		// what easing:cubicOut used to pass.
		easing: (x: number) => x,
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
		tick: (_t: number, u: number) => {
			// z-index: a spouse/relative demote rides at z 1 (above resting boxes/rows/notch, below the hero
			// z 2) because it flies OVER resting content to its seat. A SIBLING retraction is different: the
			// hero clears its z 2 at introend (~one flight sooner than the retraction ends, since the hero was
			// sped up), leaving the retraction at z 1 ABOVE the just-landed card — it painted over the new card
			// (the confirmed bug). The retraction only ever travels over the CARD region (never the neighbour
			// rows), so parking it BELOW the incoming card's resting level (z −1, under the isolated slot's
			// content) keeps it behind the hero at EVERY phase — during the flight (hero z 2) AND after landing
			// (hero z 0). It stays visible wherever the growing hero hasn't yet covered it; once covered, it is
			// correctly hidden behind. z-order is now timing-independent — no re-mask.
			//
			// §19 REVERSES THIS FOR THE PANEL MUTATION. Everything above is about HIDING the retraction —
			// z:-1 is the fix for the tic where its endpoint showed through the reformed notch cutout. A
			// card being re-filed into the sibling panel has to be SEEN the whole way, because its
			// destination is outside the card entirely.
			//
			// It takes the SAME z the spouse demote rides: 1, above resting content and BELOW the growing
			// hero. z 3 was tried first — enough to clear `.sibling-zone`, which is z-index 2 — and it is
			// bug D from the ghost taxonomy all over again: screenshotted, the departing card sat opaque and
			// full-detail on top of the arriving one, which is the exact thing z:-1 was introduced to stop.
			// The layering the doctrine wants is two baseball cards trading places with the ARRIVING one in
			// front, and no single z can be both under the hero (2) and over the panel (2). So the panel
			// moved instead — `.sibling-zone` is z-index 0 now — and this stays where every other demote is.
			el.style.zIndex = sibling && !sibPlan ? '-1' : '1';
			// Sibling → the fixed corner rect (no data-flight-id box exists); spouse/relative → the live seat,
			// re-queried each frame (the moving-destination fix). Sibling's rect is constant, so it just holds.
			// Last of all the IMPLIED seat (see above), which only exists when the old focus has fallen out of
			// the drawn generations — so a real box, if there is one, always wins.
			const box =
				siblingSeat ??
				document.querySelector(`[data-flight-id="${params.id}"]`)?.getBoundingClientRect() ??
				impliedSeat;
			if (!box || !box.width) return;
			const implied = box === impliedSeat;
			const dx = box.left - card.left;
			const dy = box.top - card.top;
			const sx = box.width / card.width;
			const sy = box.height / card.height;
			// PROGRESS RECONSTRUCTION — easing is identity, so `u` here is the RAW linear progress p ∈ [0,1].
			// Re-apply the base curve (bit-identical to the pre-flip build) and layer the settle by REPLACING it
			// with easeOutBack, which carries the whole path (translate + scale, one curve) PAST the seat and
			// back. Everything below keys off `uu` (incl. the geometry-keyed opacity crossfade via Sx), so the
			// single substitution covers every consumer coherently — no property is left on raw t.
			if (demoteSettleS === null) {
				// PER-SEAT amplitude — parent and child seats never share a dial (different travel, scale, and
				// landing context). Parent-seat lands at the FLOOR (DEMOTE_SETTLE_PARENT_FACTOR). Child-seat runs
				// at ORIGINAL FULL amplitude (factor 1 → ~5px): the earlier "swooping" verdict was formed under
				// the 540ms glide, when the child seat docked onto a row that kept sliding ~240ms after; now the
				// glide is 300ms and rect.top is monotone, so the child settle is being measured fair for the
				// first time. Left unchanged — a measurement pass, not a tuning pass.
				const parentSeat =
					document
						.querySelector(`[data-flight-id="${params.id}"]`)
						?.getAttribute('data-flight-dir') === 'up';
				// A sibling seat is its own tier: a 119×54 chip at the end of a ~960px path. At factor 1 the
				// solver floors at DEMOTE_SETTLE_FLOOR_PX (2.2px), which is the same scale as the panel's own
				// mount cascade (SIBLING_SETTLE_PX 2.5) — weight and timing, not theatre, which is the note.
				const factor = sibPlan
					? DEMOTE_SETTLE_SIBLING_FACTOR
					: parentSeat
						? DEMOTE_SETTLE_PARENT_FACTOR
						: DEMOTE_SETTLE_CHILD_FACTOR;
				// No settle into an IMPLIED seat. The overshoot-and-return is a LANDING gesture — the weight of
				// an object arriving on a real box — and this card never arrives on one; it is a leaver, and
				// leavers march on the row's plain curve. (It would also be spent past ROW_GONE, i.e. entirely
				// invisible, which is the tell that it is the wrong gesture rather than merely a wasted one.)
				demoteSettleS =
					demoteSettleActive && !implied
						? demoteSettleBackFor(Math.hypot(dx, dy), Math.hypot(box.width, box.height), factor)
						: 0;
			}
			// SEAT HOLD — §19 only. A demote is REMOVED by Svelte the instant its own clock runs out, so the
			// frame at u=1 is computed and never painted: measured, the last frame the card actually appeared
			// on was 47px short of the seat and 40px too wide, and the atomic swap then exposed the real chip
			// somewhere the card had never been. A 47px pop at the endpoint. Everywhere else this is
			// invisible — the corner retraction ends behind the card, a spouse/parent demote is short enough
			// that the last frame is within a pixel or two — but a chip landing in the panel is watched all
			// the way in. So the TRAVEL finishes early and the card RESTS on its seat for the remainder: the
			// swap then happens between two identical stationary objects, which is what §18.4 means by
			// exposing an already-solid object rather than catching one mid-flight.
			const uTravel = sibPlan ? Math.min(1, u / (1 - SEAT_HOLD)) : u;
			const uu = demoteSettleS
				? easeOutBack(uTravel, demoteSettleS)
				: relative
					? cubicOut(uTravel)
					: uTravel;
			// SHAPE and POSITION are one progress everywhere except a §19 sibling mutation, where the
			// footprint runs ahead and finishes at SHAPE_AT (see the constant). cubicOut on the sub-progress
			// so it DECELERATES into its final size rather than stopping dead — the object arrives at its
			// shape, it does not snap to it. Position keeps `uu`, so the landing rect is unchanged and the
			// settle still carries the whole path.
			// SOLID object: opacity 1 the whole way to its seat, no terminal fade — the user tracks one
			// continuous card shrinking into its chip. (Spouse was formerly hidden ["covered by emptiness"]
			// to retire Artifact A's edge-peek; Layer 2 makes it a visible second baseball card instead, so
			// you can follow the card→chip AND the chip→card as discrete objects trading places. The seat
			// chip reveals on the demote's LANDING via the onOutgoingEnd atomic swap, like the relative box.)
			//
			// THE ONE EXCEPTION is the implied seat, where there is no chip to be exposed underneath: this
			// card is a row leaver and wears the row's own alpha (ROW_SOLID → ROW_GONE, fractions of DISTANCE
			// covered, exactly as flyOut applies them), so it is solid while it reads as a card being shoved
			// and gone before it reaches a seat the page never asserts. Same band as every chip beside it, so
			// the card and its rows disappear together rather than the card outliving its own army.
			el.style.opacity = implied ? String(clamp01((ROW_GONE - uu) / (ROW_GONE - ROW_SOLID))) : '1';
			const uShape = sibPlan ? cubicOut(Math.min(1, uTravel / SHAPE_AT)) : uu;
			const Sx = 1 - uShape * (1 - sx);
			const Sy = 1 - uShape * (1 - sy);
			el.style.transformOrigin = 'top left';
			// + pendingCollapse() as a CONSTANT, not a decaying one. Every other object here is a FLIP whose
			// delta was corrected above; the demoting card is the one that is neither pinned nor FLIP'd — it
			// is still in flow, so the collapse re-seats it one pitch higher under its own feet. Its `card`
			// rect was measured before that, so this whole animation is expressed in the pre-collapse frame
			// and a constant offset restores that frame for the entire journey. It still lands exactly on the
			// seat: the seat is re-queried live, in the post-collapse frame, and the two cancel.
			el.style.transform =
				`translate(${uu * dx}px, ${uu * dy + pendingCollapse()}px) scale(${Sx}, ${Sy})`;
			// GEOMETRY-KEYED CROSSFADE (replaces the time-based CSS fades AND any gated reveal): both the
			// card's own face and the chip-face key their opacity to the shell's natural scale uNat, in
			// OVERLAPPING bands — so something is always visible (no empty-shell blink) and the chip-face is
			// never painted above REVEAL_HI× (no billboard name). transition:none so they track geometry exactly.
			const uNat = (Sx * card.width) / FACE_W;
			const outOp = Math.max(0, Math.min(1, (uNat - OUT_LO) / (OUT_HI - OUT_LO)));
			if (cardTop) {
				cardTop.style.transition = 'none';
				cardTop.style.opacity = String(outOp);
			}
			if (footer) {
				footer.style.transition = 'none';
				footer.style.opacity = String(outOp);
			}
			// "flip early, land as a chip": the chip-face is a real PersonBox (identical to the box it
			// becomes). The shell's morph is NON-uniform (Sx ≠ Sy), which would stretch the face; so
			// counter-scale it every frame — scale(afx, afy) with afx·Sx = afy·Sy = U — so the composite
			// (shell × face) is a UNIFORM scale U. The face therefore renders at its true 220:75 aspect at
			// every frame (never stretched), spans the shell's width, and stays vertically centered in the
			// shell (the whitespace above/below in the tall early shell is honest, not a taffy chip). U =
			// shellWidth/FACE_W; at landing Sx=box.w/card.w so U→1 and the face lands at natural box size.
			// How far the hand-over to the SEAT's own face has got (0 = none, 1 = complete). Zero for every
			// flight that is not a §19 sibling mutation, so nothing below changes for anyone else.
			const seatBand = sibPlan ? clamp01((REVEAL_HI - uNat) / (REVEAL_HI - REVEAL_LO)) : 0;
			if (face) {
				// Chip-face fades IN over [REVEAL_LO, REVEAL_HI]× — the other half of the geometry crossfade,
				// overlapping the outgoing fade so there's no gap and no billboard (invisible above REVEAL_HI).
				face.style.transition = 'none';
				// On a §19 mutation this face is SUPERSEDED outright — the seat's own face has taken its
				// band, so this one would only ever be the way-station Sam does not want seen. Its geometry
				// below still runs (the counter-scale is what the seat clone is registered against); only
				// its opacity is held at 0.
				face.style.opacity = sibPlan
					? '0'
					: String(clamp01((REVEAL_HI - uNat) / (REVEAL_HI - REVEAL_LO)));
				// Uniform on-screen scale U, capped at FACE_SCALE_MAX (see above). afx=U/Sx, afy=U/Sy give
				// Sx·afx=Sy·afy=U (uniform → aspect preserved at every frame); the face is centered in the
				// shell. Below the cap the face spans the shell (tx≈0); above it, it holds cap-size, centered.
				const U = Math.min(FACE_SCALE_MAX, uNat);
				const afx = U / Sx;
				const afy = U / Sy;
				const tx = card.width / 2 - (U * FACE_W) / (2 * Sx); // center horizontally in the shell
				const tfy = card.height / 2 - (U * FACE_H) / (2 * Sy); // center vertically in the shell
				face.style.transformOrigin = 'top left';
				face.style.transform = `translate(${tx}px, ${tfy}px) scale(${afx}, ${afy})`;
			}
			// THE SEAT FACE (see the constants above). Cloned lazily rather than at init: the seat chip is
			// created by the panel's own reactive update, in the same flush that starts this outro, so at
			// init the query can legitimately return nothing — the same mount-order fact §18.4 met head on.
			// Cloned ONCE, on the first frame it exists; if it never does, the flight keeps the parent
			// chip-face and behaves exactly as it did before.
			// RETRIED until the seat exists, not attempted once and abandoned: the panel creates that chip in
			// the same flush this outro is configured in, and the crossfade band is early enough now that
			// losing even the first frame or two would show. The flag is set on SUCCESS, so the query stops
			// the moment it lands.
			if (sibPlan && face && !seatFaceTried) {
				const src = document.querySelector(`[data-sib-seat-id="${sibPlan.pivotId}"] .person-box`);
				if (src) {
					seatFaceTried = true;
					seatFace = src.cloneNode(true) as HTMLElement;
					seatFace.style.cssText =
						`position: absolute; left: 0; top: 0; width: ${SEAT_FACE_W}px; height: ${SEAT_FACE_H}px; ` +
						`transform-origin: top left; opacity: 0; pointer-events: none;`;
					// inert + aria-hidden for the same reason the hand-off ghost carries them (§18.11): this is
					// a clone of a real <a href>, and pointer-events stops the mouse but not the keyboard or a
					// screen reader — it would be a duplicate link to the same person for the whole flight.
					seatFace.setAttribute('aria-hidden', 'true');
					seatFace.setAttribute('inert', '');
					// The wrap's own drop-shadow is the object's shadow throughout the flight; .demote-chipface
					// gets its shadow stripped by a scoped CSS rule, which cannot reach a node created here.
					seatFace.style.boxShadow = 'none';
					face.parentElement?.appendChild(seatFace);
				}
			}
			if (seatFace) {
				// The same counter-scale rule as the chip-face, against the SEAT's natural size: V is the
				// uniform on-screen scale, bfx·Sx = bfy·Sy = V, so the composite never stretches and reaches
				// exactly 1.0 — the seat's true 119×54 — as the shell arrives. Centered in the shell.
				const V = (Sx * card.width) / SEAT_FACE_W;
				seatFace.style.transition = 'none';
				seatFace.style.opacity = String(seatBand);
				seatFace.style.transform =
					`translate(${card.width / 2 - (V * SEAT_FACE_W) / (2 * Sx)}px, ` +
					`${card.height / 2 - (V * SEAT_FACE_H) / (2 * Sy)}px) scale(${V / Sx}, ${V / Sy})`;
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
	// CC ARRIVAL (unfurl symmetry): a parent must NOT fade in mid-flight. Hold it hidden (pending) exactly
	// like a child, so it rises out of the LANDED card at the reveal — parents and children emanate together
	// on the introend/final-position signal, never at flight-start. Chip navs keep their mid-flight morph.
	if (getFlightKind() === 'cc') {
		el.style.opacity = '0';
		el.dataset.pending = '';
		return { duration: 0 };
	}
	const dest = node.getBoundingClientRect();
	const old = rectSnapshot.get(params.id);
	if (old && dest.width && dest.height) {
		// A PERSON'S MOTION IS OWNED BY THEIR morphIn. This box is about to carry them from their captured
		// rect to this seat as one object; any OTHER copy of them still on stage is a second render of one
		// person on one path. chipExit already states this rule for a departing spouse who also arrives as a
		// parent ("Hiding here kills it: the person's motion is owned by their morphIn") — it just had no
		// way to reach a ROW leaver, because until the grandparent tier there was never a row leaver who
		// also arrived in a row.
		//
		// That is exactly the duplicate Sam caught: click the PARENT while the tier is open and the
		// grandparent above it becomes a parent of the new focus. He morphs correctly into the new parents
		// row — and his tier chip ALSO ran the row march, so a second copy of him slid straight down and
		// faded out under the growing card. Hidden here, the march still happens to an invisible node and
		// the only thing on screen is the object doing the real journey.
		//
		// `visibility`, not `opacity`: flyOut sets opacity from a compiled css ANIMATION, and an animation
		// beats an inline style in the cascade, so an inline opacity here would simply be ignored. It is the
		// same instrument scheduleHandoff uses to step the real leaver aside for its ghost.
		for (const other of document.querySelectorAll<HTMLElement>(`[data-flight-id="${params.id}"]`))
			if (other !== node) other.style.visibility = 'hidden';
		// MORPH from the person's old on-screen box (e.g. the father's spouse-chip) — a discrete card.
		const dx = old.left - dest.left;
		// + pendingCollapse(), for growFrom's reason: this seat rises one tier pitch a flush from now. THIS is
		// the arrival Sam was watching — the grandparent chips coming down into the parents row. They ran
		// morphIn's fixed 360ms clock while the stage collapsed on the hero's ~500ms, so the moment their own
		// transform finished the still-moving stage carried them back up: measured, an 8px dip at 305ms,
		// while the hero, the leavers, the floor and the notch seat were all provably direct. It is also why
		// the gesture looked clean on a grandfather with no parents of his own — nothing arrived here to do
		// it — and dipped on a grandmother who has them.
		const dy = old.top - dest.top + pendingCollapse();
		const sx = old.width / dest.width;
		const sy = old.height / dest.height;
		// DEMOTE SETTLE (the demoted spouse): the reciprocal-of-promotion overshoot on its OWN captured vector
		// (old → dest), mirroring growFrom exactly — this is an `in`, so easeOutBack on the raw t makes u dip
		// below 0, carrying the morph a few px PAST the slot and back. Amplitude scales to the destination
		// footprint (its own, distinct from the card's — different seats, different angles fall out of the two
		// rects). Active on a warm chip-nav whose camera move matches; else cubicOut, bit-identical to before.
		const settleActive = getCameraMove()?.kind === getFlightKind();
		const settleS = settleActive
			? demoteSettleBackFor(Math.hypot(dx, dy), Math.hypot(dest.width, dest.height))
			: 0;
		return {
			duration: 360,
			// identity easing → t is RAW; the base cubicOut and the settle are applied inside (see growFrom).
			// Non-settle reproduces the pre-flip cubicOut morph bit-identically; settle replaces it with easeOutBack.
			easing: (x: number) => x,
			// z-index 1: above the leaving chips, below the hero card (z-index 2). Solid (opacity 1)
			// so the user tracks one object lifting out of its chip and into the slot.
			css: (t: number) => {
				const e = settleS ? easeOutBack(t, settleS) : cubicOut(t);
				const u = 1 - e;
				return `z-index: 1; opacity: 1; transform-origin: top left; transform: translate(${u * dx}px, ${u * dy}px) scale(${1 - u * (1 - sx)}, ${1 - u * (1 - sy)});`;
			}
		};
	}
	// No on-screen origin → arrive from the ARMY's trailing edge (see rowTravel): the pan direction
	// decides, so this row steps in with every other row instead of always rising from below. The march's
	// own step (one tier, or two out of the grandparent tier), on the shared row clock.
	const D = panDir === 'down' ? -marchTravel() : marchTravel();
	return {
		duration: rowClockMs(),
		easing: cubicOut,
		// u = 1 - t: starts one tier back + transparent, settles into the seat, opaque.
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

// ── THE COUPLED PUSH + THE HAND-OFF (Aug 3) ────────────────────────────────────────────────────
// rowTravel() is ONE measurement with TWO consumers: the entering row's rise/settle (revealPending, in
// +page.svelte, which imports it) and the leaving row's push (flyOut, below). They must be the same
// number, on the same clock, with the same curve, or the two rows are not one motion. Exported for
// exactly that reason — a second literal would drift the moment either side is tuned.
//
// WHY: a leaver used to drift a flat 28px in the CAMERA-PAN direction while the incoming row swept in
// 150px from the other side. The two were unrelated motions on unrelated distances, so on a parent
// promotion the incoming children crossed straight through the outgoing ones — measured: the old child
// sits at y=958, the new card is 148px taller so the new row lands at 1106, and the entrance starts them
// 150px above that landing (≈956), i.e. exactly on top of the old row. Sam: "they should never cross …
// the new child chips should push out the old child chips as if they were objects pushing each other."
//
// SO: the leaving row travels the SAME distance, in the SAME direction the arriving row travels, over the
// SAME duration with the SAME curve. Not "an exit" — the far half of one displacement. Direction comes
// from the row's OWN zone (children always pushed DOWN, parents always UP, matching how each row enters),
// never from the camera pan, because a pan-direction exit sends the outgoing row INTO the incoming one.
//
// AND: the leaver is dropped a stacking level. Contact motion still leaves overlap possible whenever the
// row's layout position glides between two cards of different height (the featured slot animates its
// height, so the row's own y is moving underneath both animations — a purely geometric "contact distance"
// would be chasing a target that moves during the flight). Occlusion makes the guarantee absolute rather
// than arithmetic: an outgoing chip can never paint over an incoming one, which is the artefact Sam saw.
// THE TIER PITCH. 145px is not a tuned number — it is measured, and it is the same on every card:
// a chip row is 75px and the connector under it is 70px, so 145 is EXACTLY the distance from one tier's
// seat to the next tier's seat. A parents row leaving upward is therefore not "exiting the screen"; it
// is moving into the seat a GRANDPARENTS row would occupy, above a connector that would read "John's
// parents" — the tier that isn't drawn but is unambiguously there. A children row leaving downward moves
// into the GRANDCHILDREN seat below a connector that would read "Five grandchildren". They fade out
// before they arrive, so the seat is implied and never asserted. Destination, not escape.
const ROW_TRAVEL_FALLBACK = 145;
/**
 * The tier pitch, DERIVED rather than hardcoded — one row's seat to the next. It is measurable in one
 * subtraction: a row's top to the featured slot's top spans exactly that row plus the connector under
 * it (105 → 250 today = 75 + 70 = 145, identical on every card at the current density).
 *
 * Measured rather than frozen because it is a LAYOUT fact, not a design choice, and Phase 2.75 is going
 * to change it: density steps re-tune card geometry and the children-row cap per viewport height, at
 * which point a literal 145 would quietly become wrong in exactly the way that is hardest to see — the
 * rows would still move, just not by a tier. Reading it keeps the rule ("one tier") true instead of the
 * number. Falls back to the measured constant when there is no parents row to measure against (a card
 * with no parents, or a cold path with no snapshot).
 */
export function rowTravel(): number {
	if (rowPitch !== null) return rowPitch;
	const slot = document.querySelector('.featured-slot')?.getBoundingClientRect();
	let top: number | null = null;
	// THE ADJACENT row, not the topmost one — "a row's seat to the NEXT" is a statement about neighbours.
	// With one ancestor row on stage the two readings are the same number, which is why this was written as
	// a min and stayed correct for months. Open the grandparent tier and there are TWO rows marked dir="up":
	// a min then measures tier→slot (290) and calls it the pitch, so every consumer of one tier silently
	// doubles. The lowest ancestor row is the one that actually abuts the card, so it is the one that
	// defines the gap.
	for (const r of rectSnapshot.values())
		if (r.dir === 'up') top = top === null ? r.top : Math.max(top, r.top);
	const derived = slot && top !== null ? Math.round(slot.top - top) : 0;
	// Sanity band: a plausible tier is a chip plus a connector, never a stray reading off a mid-flight rect.
	rowPitch = derived >= 90 && derived <= 260 ? derived : ROW_TRAVEL_FALLBACK;
	return rowPitch;
}
/**
 * THE ARMY'S STEP for this navigation: the measured tier pitch × the number of tiers the click crossed.
 *
 * rowTravel() stays what it has always been — the distance from one row's seat to the next, a LAYOUT fact.
 * This is the distance the SCENE pans, which is that fact times how far the camera moved, and the two were
 * only ever the same number because every navigation until the grandparent tier crossed exactly one
 * generation. Every consumer that means "one step of the march" reads this; anything that means "the pitch
 * between two adjacent rows" (the tier push's own fallback height) keeps reading rowTravel.
 */
export function marchTravel(): number {
	return rowTravel() * tierSpan;
}
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
// THE ARMY. Direction is the CAMERA PAN, never the row's own zone — every row moves the same way at the
// same moment, leavers and arrivers alike, like ranks of soldiers stepping off together. Nobody marches
// down while everybody else marches up. This also makes crossing structurally impossible rather than
// merely occluded: arrivers enter from the pan's trailing edge and leavers exit through its leading edge,
// so an arriving chip is always behind a departing one and can never pass through it.
const ROW_MS_FALLBACK = 420; // only when the demote clock can't be derived (no click origin)
// The rows ride the DEMOTION's clock — "the same speed and timing that the Featured Card demotes to a
// parent chip" (Sam). Not their own 300ms dash: at 145px over 300ms a row read as racing to leave. Same
// inputs as shrinkTo's demoteDuration, so the rows and the demoting card are literally one tempo.
let rowClock: number | null = null;
let rowPitch: number | null = null; // per-navigation, cleared with the rest of the captures
export function rowClockMs(): number {
	if (rowClock !== null) return rowClock;
	const heroOrigin = clickedId ? rectSnapshot.get(clickedId) : undefined;
	const slot = document.querySelector('.featured-slot')?.getBoundingClientRect();
	rowClock =
		heroOrigin && slot && slot.width
			? relativeGrowMs(maxCornerTravel(heroOrigin, slot)) * DEMOTE_LEAD
			: ROW_MS_FALLBACK;
	if (import.meta.env.DEV)
		console.log(
			'[rowclock]',
			JSON.stringify({ ms: Math.round(rowClock), clickedId, hasOrigin: !!heroOrigin, snap: rectSnapshot.size, slotW: Math.round(slot?.width ?? 0) })
		);
	return rowClock;
}
const ROW_SOLID = 0.34; // fully opaque this far along — a card being shoved is a solid object for as
const ROW_GONE = 0.7; // long as you can see it, and it is GONE before it reaches the tier seat it is
// heading for, so the implied row is never asserted. Alpha only; the motion is unchanged.
// These are fractions of DISTANCE COVERED, and the march decelerates, so they are far later in TIME than
// they look. THAT IS THE WHOLE POINT OF THE DIAL, and 0.5/0.92 had it on the wrong side of the knee: a
// chip was gone by ~57% of the clock having covered 92% of the ground, which under cubicOut means it
// vanished travelling at ~0.56× its own average speed. A chip that dims while visibly slowing does not
// read as leaving, it reads as STOPPING — Sam, three times: "they transition up but then freeze, that
// means stop, halt, pause their transition, and fade on stuck on one position."
//
// 0.34/0.70 spends the alpha BEFORE the knee. Under cubicOut the instantaneous speed at ROW_GONE is
// 3·(1−ROW_GONE)^(2/3) of the average: 0.56× at 0.92, 1.34× at 0.70. The chip is now moving HALF AGAIN
// as fast as its own average at the instant it disappears — it cannot read as parked — and it is gone by
// ~33% of the clock instead of 57%, having covered 101px of its 145px tier rather than 133px.
//
// Going SOONER was the ask, not going further. Sam: "the idea is they can fade out a lot sooner… the
// incoming FeaturedCard is the main place of attention. the user is not going to be like, it's really
// important to me to watch the child chips exit high up and then I can look at what I want." An earlier
// attempt extended the MARCH so the chips would tuck under the card — which sent them sailing up past
// its sides on any row wider than the card, and was worse on exactly the cards where it was reported.
// The distance, direction, clock and curve are all untouched here; only the alpha moves.
//
// The old note "raised from 0.35/0.85 (Sam: they fade out a little too quickly)" is superseded: that
// complaint was about the RAMP being abrupt, and it was answered by widening the band, not by pushing it
// late. The band here is wider in time than 0.35/0.85 was (0.11→0.33 of the clock) while ending earlier.
const HANDOFF_MS = 420; // the hand-off owns its box for longer than a row push — it has a diagonal to cover
// The traveller's OWN tempo, on top of the shared row clock: she was reaching her seat before the card
// had finished settling around her, and two arrivals landing out of step read as a wobble even when each
// is correct on its own. 1.08 puts her landing just inside the card's.
//
// SUPERSEDED by HANDOFF_LEAD (see flyOut). The intent was always "land just inside the card's landing";
// 1.08 expressed it as a multiple of the ROW clock, which is the wrong quantity — the row clock describes
// rows stepping one pitch, and she is not stepping a pitch, she is crossing a diagonal into a corner of
// the card itself. Against the hero's own duration the same intent is a lead, not a tempo. Kept only
// because the constant is referenced in the design notes; nothing reads it.
const HANDOFF_TEMPO = 1.08;
// How far inside the CARD's own landing the traveller comes to rest. She must never be the last thing
// moving (that reads as a correction applied after the card settled) and never be parked and waiting
// (that reads as the card jumping to her). Just under 1 is the whole rule.
const HANDOFF_LEAD = 0.96;
// Band over which a DIFFERENT-TIER traveller crossfades from her old face to the destination's, in
// fractions of DISTANCE COVERED — not of the clock. The distinction is the whole fix: the travel
// decelerates hard, so 55% of the CLOCK is already 98% of the DISTANCE, and a band that looked
// mid-journey on paper was finishing as she came to rest. A chip changing its contents while parked
// reads as a correction being applied to it, rather than as something that happened on the way.
// (Same rule ROW_SOLID/ROW_GONE follow, and for the same reason.)
// 0.45 → 0.85 of the distance is 19% → 47% of the clock: visibly in flight, done well before she stops.
// Not earlier: the destination face is over-height while the shell is still wide (the two tiers have
// different aspects and the face is held uniform), and that mismatch — ~8px at 45%, ~2px at 85% — has to
// stay under a near-zero opacity while it is large.
const FACE_SWAP_FROM = 0.45;
const FACE_SWAP_TO = 0.85;
// A/B toggle (the DECK_GHOSTS pattern): true = the traveller crosses IN FRONT of the growing card via a
// portalled ghost; false = she rides behind it at z −1 with the rest of the row. Sam's eye decides.
const HANDOFF_IN_FRONT = true;
const HANDOFF_GHOST_MAX_MS = 4000; // hard cap: the traveller can never outlive its own navigation
const UNION_GROW_FROM = 0.45; // the union row holds at nothing this far into the journey, then grows in
const HANDOFF_SAMPLES = 30; // keyframes the settle curve is sampled into (WAAPI takes no JS easing)
/**
 * WAAPI accepts no JS easing, so every hand-off animation is SAMPLED off the house curve rather than
 * approximated by a lookalike bezier. One sampler for all of them: the shell, the destination face and
 * the outgoing face are then guaranteed to be reading the same curve at the same offsets, which is the
 * only thing keeping a two-layer traveller in register. `build` receives (t = clock, e = distance).
 */
function sampleCurve(settleS: number, build: (t: number, e: number) => Keyframe): Keyframe[] {
	return Array.from({ length: HANDOFF_SAMPLES + 1 }, (_v, i) => {
		const t = i / HANDOFF_SAMPLES;
		return build(t, settleS ? easeOutBack(t, settleS) : cubicOut(t));
	});
}

/**
 * A parent chip carries two rows; the spouse chip it becomes carries three — the union line ("m. 1752",
 * or "(partner)"). That row used to arrive with the swap: one frame absent, the next frame present, a
 * clunk at the end of an otherwise continuous journey. So the traveller GROWS it on the way, and by the
 * time the real chip is uncovered underneath, both are already saying the same thing.
 *
 * The row is built from the DESTINATION's text but the TRAVELLER's own type: data-chip-union supplies
 * the words, data-chip-dates supplies the line to clone. Cloning the destination's element outright
 * would import its type scale, and a compact 160×65 seat renders its rows at 10px where this 220×75
 * traveller renders at 12 — the swap would then correct a font size in the same frame it adds a row.
 * (Same reasoning as data-chip-name, which the demote flight mirrors for exactly this class of flash.)
 *
 * Height is animated, not just opacity: the text block is a centred flex column, so a third row
 * redistributes the two above it. Growing 0 → natural height lets that settle over the journey instead
 * of jumping. No union row on the destination (an undated partner, a seat without dates to clone) →
 * nothing happens, and the chip simply arrives as it always did.
 */
function growUnionRow(ghost: HTMLElement, seat: HTMLElement, ms: number): void {
	const text = seat.querySelector('[data-chip-union]')?.textContent?.trim();
	if (!text) return;
	const area = ghost.querySelector('.text-area');
	const template = ghost.querySelector('[data-chip-dates]');
	if (!area || !template) return;
	const row = template.cloneNode(true) as HTMLElement;
	row.removeAttribute('data-chip-dates');
	row.textContent = text;
	row.style.cssText = 'opacity: 0; height: 0; overflow: hidden;';
	area.appendChild(row);
	const full = row.scrollHeight; // natural height of the row, in the traveller's own scale
	if (!full) return;
	row.animate(
		[
			{ opacity: 0, height: '0px', offset: 0 },
			{ opacity: 0, height: '0px', offset: UNION_GROW_FROM },
			{ opacity: 1, height: `${full}px`, offset: 1 }
		],
		{ duration: ms, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', fill: 'forwards' }
	);
}

/**
 * A chip's photo is a PERCENTAGE of its box, and the two tiers disagree: a normal 220×75 chip gives the
 * photo 25%, a compact 160×65 seat gives it 30% (PersonBox photoW). A traveller cloned from a parent chip
 * therefore lands carrying the wrong proportion, and the swap corrected it in one frame — the photo
 * stepped wider and shoved the text rows right. Reading the DESTINATION's real proportion and morphing to
 * it over the journey means the traveller is already the right shape when it is exchanged. Same idea as
 * the union row: arrive as what you are becoming, not as what you were.
 */
function morphPhotoWidth(ghost: HTMLElement, seat: HTMLElement, ms: number): void {
	const from = ghost.querySelector('.photo') as HTMLElement | null;
	const to = seat.querySelector('.photo') as HTMLElement | null;
	if (!from || !to || !seat.offsetWidth || !ghost.offsetWidth) return;
	const fromPct = (from.offsetWidth / ghost.offsetWidth) * 100;
	const toPct = (to.offsetWidth / seat.offsetWidth) * 100;
	if (Math.abs(fromPct - toPct) < 0.5) return; // same tier — nothing to morph
	from.animate([{ width: `${fromPct}%` }, { width: `${toPct}%` }], {
		duration: ms,
		easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
		fill: 'forwards'
	});
}

/**
 * A traveller bound for a DIFFERENT CHIP TIER cannot simply be scaled into her seat: a 220×75 parent chip
 * and a 160×65 compact notch seat have different aspect ratios, so the transform that lands her footprint
 * exactly is the same transform that squashes her photo and text. Scaling uniformly instead would land the
 * wrong footprint. There is no single transform that does both — which is why the demote solves the same
 * problem with two faces rather than one.
 *
 * So she carries the DESTINATION's face as a second layer and crosses over to it mid-journey. That layer
 * is laid out at the seat's natural size and counter-scaled against the shell every frame so its composite
 * scale stays UNIFORM (never squashed) and reaches exactly 1.0 at the seat — where it is then pixel-
 * identical to the real chip waiting underneath, which is what makes the retirement invisible. The
 * horizontal counter-scale is constant (snap.width / dst.width) and the vertical one carries the aspect
 * change; before the crossfade band the layer is transparent, so its early over-height never paints.
 */
function crossfadeToSeatFace(
	ghost: HTMLElement,
	seat: HTMLElement,
	snap: PinRect,
	dst: DOMRect,
	ms: number,
	sx: number,
	sy: number,
	settleS: number
): void {
	const src = seat.querySelector('.person-box');
	const own = ghost.querySelector('.person-box') as HTMLElement | null;
	if (!src || !own) return;
	const face = src.cloneNode(true) as HTMLElement;
	face.style.cssText =
		`position: absolute; left: 0; top: 0; width: ${dst.width}px; height: ${dst.height}px; ` +
		`transform-origin: top left; opacity: 0; pointer-events: none;`;
	ghost.appendChild(face);
	const cx = snap.width / dst.width; // constant: the shell's own width ratio, undone
	// keyed off `e` (distance covered), never `t` (clock) — see FACE_SWAP_FROM
	const band = (e: number) =>
		e <= FACE_SWAP_FROM ? 0 : Math.min(1, (e - FACE_SWAP_FROM) / (FACE_SWAP_TO - FACE_SWAP_FROM));
	// Sampled through the SAME curve the shell rides (sampleCurve), so the face can never drift out of
	// register with the box it is riding inside — the one desync that would show as a tearing chip.
	const frames: Keyframe[] = sampleCurve(settleS, (t, e) => ({
		transform: `scale(${cx}, ${(snap.width * (1 + e * (sx - 1))) / (dst.width * (1 + e * (sy - 1)))})`,
		opacity: band(e),
		offset: t
	}));
	face.animate(frames, { duration: ms, easing: 'linear', fill: 'forwards' });
	// The outgoing face fades on the SAME distance-keyed band, off the same sampler.
	own.animate(
		sampleCurve(settleS, (t, e) => ({ opacity: 1 - band(e), offset: t })),
		{ duration: ms, easing: 'linear', fill: 'forwards' }
	);
}

/**
 * A traveller whose DESTINATION MOVES. Baked WAAPI keyframes resolve their endpoint once, which is right
 * for the notch (a seat in the card's own corner, laid out in the slot and therefore at its resting rect
 * from frame one) and wrong for the children row: that row sits under `.featured-slot`, whose reserved
 * height is transitioning from the OUTGOING card's geometry to the incoming one's. Measured on
 * Aaron Burr Jr. → Daniel Burr the child seat travels 297px UP during the flight — the outgoing card's
 * cross-connections blade collapsing, plus the tier — so a traveller aimed at the rect it had one frame in
 * finished 297px below it, in open space.
 *
 * This is shrinkTo's rule, stated for a portalled ghost instead of a card: re-query the seat EVERY frame
 * and let the object track it to wherever it actually comes to rest. Same house curve (easeOutBack through
 * the same solver), driven by rAF because WAAPI cannot re-evaluate an endpoint mid-animation.
 */
function trackSeat(ghost: HTMLElement, seat: HTMLElement, snap: PinRect, ms: number): void {
	// Same solver, same inputs as the baked path it replaces (distance to the seat, the SEAT's own
	// footprint) so the curve is identical and only the endpoint is live.
	const d0 = seat.getBoundingClientRect();
	const settleS = demoteSettleBackFor(
		Math.hypot(d0.left - snap.left, d0.top - snap.top),
		Math.hypot(d0.width, d0.height)
	);
	const t0 = performance.now();
	const step = () => {
		if (!ghost.isConnected) return; // retired by the observer below — stop driving a detached node
		const p = Math.min(1, (performance.now() - t0) / ms);
		const e = settleS ? easeOutBack(p, settleS) : cubicOut(p);
		const r = seat.getBoundingClientRect();
		// A seat that is momentarily unlaid-out reports nothing usable; hold the last frame rather than
		// snapping to a zero rect (trap 2 — a zero rect is not a position).
		if (r.width && r.height) {
			ghost.style.transform =
				`translate(${e * (r.left - snap.left)}px, ${e * (r.top - snap.top)}px) ` +
				`scale(${1 + e * (r.width / snap.width - 1)}, ${1 + e * (r.height / snap.height - 1)})`;
		}
		if (p < 1) requestAnimationFrame(step);
	};
	requestAnimationFrame(step);
}

/**
 * The hand-off: a leaver that is not leaving the scene at all — the OTHER parent on a parent promotion,
 * who becomes the new focus's spouse — travels the diagonal to her notch seat instead of dissolving in
 * the parents row and rematerialising in the notch a beat later. Two events for one person broke the
 * discrete-object illusion (§20): a baseball card does not dissolve here and reappear there.
 *
 * The seat does NOT exist when the outro is configured — blocks mount in source order and .spouse-notch
 * renders after .parents-slot, so the query returns nothing at config time and the real seat one frame
 * later (measured: [] then [notch 1075,250]). Hence the deferred lookup, with the travel driven by WAAPI,
 * which per the animation composite order supersedes the css keyframes for the properties it names while
 * the css keeps owning the pin. Scoped to notch seats: a destination in .parents-slot already morphs
 * itself from this same captured rect via in:morphIn, and flying the leaver there too would put two
 * copies of one person on one path.
 */
function scheduleHandoff(node: HTMLElement, key: string, snap: PinRect, ms: number): void {
	if (typeof requestAnimationFrame === 'undefined') return;
	requestAnimationFrame(() => {
		if (import.meta.env.DEV)
			console.log(
				'[handoff]',
				JSON.stringify({ key, ms: Math.round(ms), hero: Math.round(getHeroSchedule().duration), row: Math.round(rowClockMs()) })
			);
		if (!node.isConnected) return;
		// WHERE THIS PERSON IS GOING, if anywhere. Two destinations qualify, and they are different journeys:
		//
		//   NOTCH — the other parent becoming the new focus's spouse. She crosses INTO the card's own corner
		//           and is meant to be followed the whole way, so she rides in FRONT of it.
		//   ROW   — the hovered parent becoming the new focus's CHILD. This is the first crossing in the
		//           project that spans a GENERATION GAP: parents row, under the growing card, into the
		//           children row. Without it he simply dissolved in one row while a second copy of him faded
		//           in two rows below — "dies here, rematerialises there", the exact thing the hand-off
		//           exists to abolish, and the reason Sam could not follow him as an object.
		//
		// A destination in the PARENTS row is still excluded, and for the original reason: a person landing
		// there already morphs from this same captured rect via in:morphIn, so flying a leaver there too
		// would put two copies of one person on one path.
		const seats = [...document.querySelectorAll(`[data-flight-id="${key}"]`)].filter((el) => el !== node);
		const seat = (seats.find((el) => el.closest('.spouse-notch')) ??
			seats.find((el) => el.closest('.children-slot'))) as HTMLElement | undefined;
		if (!seat) return;
		const toNotch = !!seat.closest('.spouse-notch');
		const dst = seat.getBoundingClientRect();
		if (!dst.width || !dst.height || !snap.width || !snap.height) return;
		// THE CLOCK, resolved HERE rather than by the caller. flyOut is configured before the featured block
		// is built, so getHeroSchedule() described the previous navigation at that point; by this deferred
		// frame growFrom has run and it describes THIS one. Measured, the caller's value was the constant
		// 454ms on every flight ever made — rowClockMs() returns its fallback every time (see its note) — so
		// against a 586ms hero out of the tier she reached her seat 119ms early and sat in open space beside
		// a card that had not arrived. HANDOFF_LEAD lands her just inside the card instead, whatever the
		// card's own clock happens to be.
		const travelMs = Math.max(HANDOFF_MS, (getHeroSchedule().duration || ms) * HANDOFF_LEAD);
		// NO FADE (Sam, Aug 3). The traveller is opaque from the first frame to the last. Fading her out as
		// she arrived left a GAP — she was gone by ~490ms and the real chip only fades in at ~660ms with the
		// rest of the notch — so she dissolved on the seat and then blinked back into it. That is precisely
		// the "dies here, rematerialises there" the hand-off exists to abolish; a discrete card does not
		// flicker at the end of its own journey. She now holds the seat, solid, until the real chip is
		// fully revealed underneath her, and is retired in that instant (see the watcher below).
		// THE SETTLE. Every other arrival in this system overshoots its seat and rocks back — the hero's
		// whole-path easeOutBack, morphIn's reciprocal of it. The traveller was the one object still
		// gliding flatly to a stop, next to a card visibly overshooting around her, and the mismatch read
		// as a wobble. She now carries the SAME curve off the SAME solver morphIn uses for a chip landing
		// in a seat, amplitude scaled to the seat's own footprint. WAAPI cannot take a JS easing, so the
		// curve is SAMPLED into keyframes rather than approximated by a bezier — the overshoot then comes
		// from the house math, not from a lookalike.
		const dx = dst.left - snap.left;
		const dy = dst.top - snap.top;
		const sx = dst.width / snap.width;
		const sy = dst.height / snap.height;
		const settleS = demoteSettleBackFor(Math.hypot(dx, dy), Math.hypot(dst.width, dst.height));
		const frames: Keyframe[] = sampleCurve(settleS, (t, e) => ({
			transform: `translate(${e * dx}px, ${e * dy}px) scale(${1 + e * (sx - 1)}, ${1 + e * (sy - 1)})`,
			opacity: 1,
			offset: t
		}));
		const timing: KeyframeAnimationOptions = {
			duration: travelMs,
			// LINEAR here on purpose: the curve is already baked into the sampled offsets above. An easing
			// on top would compose with it and bend the settle into something the solver never described.
			easing: 'linear',
			fill: 'forwards',
			composite: 'replace'
		};
		// UNDER OR IN FRONT, by destination. The notch traveller rides in FRONT (z 50) — she is crossing into
		// the card's own corner and is meant to be followed the whole way. The ROW traveller goes UNDER: he
		// is crossing from the parents row to the children row, and the card is growing across the middle of
		// that path. z-index 0 on a body-level fixed element puts him below `.page-container` (position
		// relative, z-index 1) and therefore below the card and the rows, while still above the fixed Field
		// (also z 0, but earlier in the document). Sam asked for exactly this: "it would go under the
		// transitioning FeaturedCard but it is noticeable enough that it keeps the illusion."
		//
		// IN FRONT OF THE CARD (Sam, Aug 3). Every other leaver is parked at z-index −1 so it can never paint
		// over an incoming chip; the hand-off is the exception, because she is not leaving — she is crossing
		// the stage to her own seat, and you are meant to follow her the whole way.
		//
		// A z-index on the chip CANNOT do this, and the first attempt at it was a no-op that measured as a
		// success: `.parents-slot` is position:relative with z-index 0, so it ESTABLISHES A STACKING CONTEXT.
		// Any z the chip carries is therefore scoped inside that slot, and the real contest is .parents-slot
		// (z 0) against .featured-slot (z 1) — the slot loses whatever the chip does. Reading the chip's
		// computed z-index confirms the property was set and says nothing about what paints on top.
		//
		// So the traveller has to LEAVE that stacking context. A clone is portalled to <body> — the root
		// context, above everything — and the real node is hidden while Svelte removes it on its own
		// schedule. Cloning rather than reparenting deliberately: the real node is mid-outro and owned by
		// Svelte, and moving it out from under the framework is how transition teardown gets stranded. The
		// ghost carries neither .flight nor data-flight-id, so the orphan sweep, the janitor and every
		// seat query ignore it, and it removes itself when its own animation finishes.
		if (HANDOFF_IN_FRONT && node.parentElement) {
			const ghost = node.cloneNode(true) as HTMLElement;
			ghost.className = 'handoff-ghost';
			ghost.removeAttribute('data-flight-id');
			// The clone contains a real <a href>. pointer-events:none stops the mouse but not the KEYBOARD
			// or a screen reader, so without this there is a second, duplicate link to the same person in
			// the tab order for the length of the flight. `inert` is the same instrument .demote-chipface
			// already uses for its own decorative copy of a chip.
			ghost.setAttribute('inert', '');
			ghost.setAttribute('aria-hidden', 'true');
			ghost.style.cssText =
				`position: fixed; left: ${snap.left}px; top: ${snap.top}px; width: ${snap.width}px; ` +
				`height: ${snap.height}px; margin: 0; z-index: ${toNotch ? 50 : 0}; ` +
				`pointer-events: none; transform-origin: top left;`;
			document.body.appendChild(ghost);
			node.style.visibility = 'hidden'; // the real leaver steps aside; the ghost carries the motion
			// A 3+-spouse card's notch seat is a SMALLER TIER (160×65 with its own type scale, PersonBox
			// `compact`), and scaling a 220×75 traveller into it is a NON-UNIFORM squeeze — she arrived
			// with her photo and text compressed, then snapped open at the swap. Same tier → the two are
			// already the same object and only the union row has to grow. Different tier → she crosses
			// over to the destination's own face mid-journey, so she lands as the thing she is replacing.
			if (toNotch) {
				// A 3+-spouse card's notch seat is a SMALLER TIER, so the face may have to cross over on the
				// way (see crossfadeToSeatFace). A children-row seat is the SAME tier as a parents-row chip —
				// 220×75, same type scale, same object — so the row crosser needs none of this apparatus.
				if (Math.abs(sx - sy) > 0.02)
					crossfadeToSeatFace(ghost, seat, snap, dst, travelMs, sx, sy, settleS);
				else {
					growUnionRow(ghost, seat, travelMs);
					morphPhotoWidth(ghost, seat, travelMs);
				}
			}
			// EVERY traveller tracks its seat. This was split — baked keyframes for the notch (whose seat is
			// laid out in the slot and therefore at its resting rect from frame one) and per-frame tracking
			// only for the children row — and the split was a statement about the notch that stops being true
			// the moment a grandparent tier is open: the tier's collapse lifts `.featured-slot` 145px DURING
			// the flight, carrying the notch seat with it, so a rect measured one frame in describes the
			// card's tier-open position and she flew to a corner the card was about to vacate. Sam: "it flies
			// as if it was moving to where the FeaturedCard is when the grandparent chips are displayed."
			//
			// So the rule is simply "a traveller tracks its seat", with no case analysis about which seats
			// hold still — the same rule shrinkTo already follows for the demoting card, and for the same
			// reason. Where the seat IS static the tracker reproduces the baked path exactly (identical
			// solver, identical inputs, identical curve), so an ordinary promotion cannot tell the difference.
			// The inner face layers keep their keyframes: they animate SIZE and opacity, which do not move.
			trackSeat(ghost, seat, snap, travelMs);
			// THE RETIREMENT. The ghost is NOT dropped when its travel ends — that is what produced the blink.
			// It holds its seat, opaque, and is removed only once the REAL chip has finished revealing beneath
			// it (the notch reveal runs at landing, well after the travel). At that moment the chip underneath
			// is already at full opacity, so the removal exposes an identical, already-solid object: the swap
			// is invisible and the seat is never empty for a frame. The seat leaving the DOM (a newer
			// navigation) retires the ghost too, and a hard cap guarantees it can never outlive the page.
			const retire = () => {
				obs.disconnect();
				clearTimeout(cap);
				ghost.remove();
			};
			// (The old `anim.finished.catch(retire)` belt went with the baked shell animation. Retirement was
			// never really its job — the observer below is what retires a traveller, on the reveal of the
			// chip underneath — and the hard cap still guarantees nothing outlives its own flight.)
			// Observed, not polled. The old watcher ran getComputedStyle on the seat EVERY FRAME until the
			// reveal — a forced style recalc per frame, mid-flight, to answer a question the DOM can simply
			// announce. `data-pending` is removed at the instant revealPending accepts the chip, and the
			// traveller's own chip is now revealed as a STEP (see the split reveal in +page.svelte), so the
			// attribute going away IS the reveal completing; no opacity sampling is needed to confirm it.
			const obs = new MutationObserver(() => {
				if (!seat.isConnected || !seat.hasAttribute('data-pending')) retire();
			});
			obs.observe(seat, { attributes: true, attributeFilter: ['data-pending'] });
			// Belt: a newer navigation can remove the seat without ever touching the attribute, and nothing
			// may outlive its own flight.
			const cap = setTimeout(retire, HANDOFF_GHOST_MAX_MS);
			if (!seat.hasAttribute('data-pending')) retire(); // already revealed (reduced motion / cold path)
			return;
		}
		node.animate(frames, timing);
		node.style.transformOrigin = 'top left'; // matches the scale anchor, as morphIn/growFrom pin it
	});
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
export function flyOut(node: Element, params: { key: string }) {
	if (prefersReducedMotion.current) return { duration: 0 };
	// CC ARRIVAL (item 4): the roster already GATHERED into the card (faded to nothing) in the pre-flight
	// beat. These leavers must NOT re-animate from opacity 1 (that re-showed them mid-flight — the bug);
	// hold them INVISIBLE, pinned out of flow, while Svelte removes them. No chip pixels during the flight.
	if (getFlightKind() === 'cc') {
		const s = rectSnapshot.get(params.key);
		const p = s
			? `position: fixed; left: ${s.left}px; top: ${s.top}px; width: ${s.width}px; height: ${s.height}px; margin: 0; `
			: '';
		return { duration: 200, easing: cubicOut, css: () => `${p}opacity: 0;` };
	}
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
	// THE COUPLED PUSH (see above): a box in a ROW leaves as the far half of that row's one displacement —
	// same distance, same direction, same clock, same curve as the row arriving behind it. z-index −1 so it
	// can never paint over an incoming chip.
	const zoneDir = (node as HTMLElement).dataset.flightDir;
	if (snap && (zoneDir === 'up' || zoneDir === 'down') && (panDir === 'up' || panDir === 'down')) {
		// THE ARMY: the pan direction, not the row's zone. EVERY row steps the same way, with no exceptions.
		// Freezing the non-promoted children in place was tried (they become the new focus's siblings, so
		// they are not strictly leaving) and REVERTED on pixels: a stationary chip is not restful, it is a
		// chip that stopped taking part, and the incoming children were visibly sliding in over the top of
		// it. Sam: "having the non-clicked siblings just sitting frozen in place is wrong too even if they
		// eventually fade out … we need to keep the army rows in place." A row that keeps marching and
		// passes under the card holds the formation; where its members are re-filed afterwards is the
		// panel's business, not the row's.
		// rowTravel, NOT marchTravel — and this is the one place in the march that difference matters.
		//
		// A leaver is PINNED (position: fixed at its click-time rect, see the pin above), so it is stated in
		// VIEWPORT coordinates and nothing in the layout can move it. An ARRIVER is in flow and stated in
		// LAYOUT coordinates, where the tier's own collapse is already carrying it up one pitch. So the same
		// single tier of on-screen descent — the descent the hero itself makes, which is what holds the
		// formation — is TWO pitches when written in layout space (marchTravel, see morphIn) and ONE when
		// written in viewport space (here). The collapse is exactly the difference between the two.
		//
		// Measured: with the collapse instant, the floor teleported −145px under the flight and the hero
		// covered 45px instead of 145; with the collapse on the flight's clock and this at marchTravel, the
		// pinned rows out-ran the in-flow ones by a whole tier. With the tier shut, tierSpan is 1 and the two
		// readings are the same number, so no ordinary navigation can tell them apart.
		const pitch = rowTravel();
		const push = panDir === 'down' ? pitch : -pitch;
		// A parent leaving on a PARENT promotion is the hand-off case (the other parent becomes the new
		// focus's spouse), and it needs a longer life than a row push to cover its diagonal. It is not a
		// coupled push either way: on that navigation the arriving parents morph in from their own captured
		// rects (in:morphIn), not on the row's 300ms slide, so there is no displacement to stay in contact
		// with. Every other leaver is a row push and MUST hold ROW_MS exactly.
		// THE TRAVELLER RIDES THE HERO'S CLOCK, not the row's. Her destination is a seat in the CARD'S OWN
		// top-right corner, so the only statement that can be true of her is "she arrives when the card
		// does" — and the row clock cannot say that. Measured, it never even tried: rowClockMs() returns its
		// 420ms FALLBACK on every navigation (see its note), so `max(HANDOFF_MS, rowClockMs()) * TEMPO` was
		// the constant 454 for every flight ever made, while the hero's own duration varies with distance —
		// 475 on an ordinary parent promotion, 586 out of the grandparent tier. At 454 against 586 she
		// reached the notch seat 119ms before the card's right edge got there and PARKED in open space, a
		// chip floating beside a card that was still growing; what reads as her "jumping into place" is the
		// card arriving underneath her. Sam: "a random chip in the middle of the Featured Card."
		//
		// HANDOFF_LEAD keeps the old TEMPO's intent — land just INSIDE the card's landing, never after it —
		// but states it against the thing she is landing on. It is deliberately close to a no-op on an
		// ordinary promotion (475 × 0.96 = 456 against the 454 that was there before), so the case Sam has
		// already approved on pixels is left where it was, and only the flights whose hero is slower than
		// the dead constant change at all.
		const handoffCase = zoneDir === 'up' && panDir === 'down';
		// The value passed here is only a FALLBACK. The traveller's real clock is the hero's, and the hero's
		// schedule does not exist yet at this point: this block is built before the featured block, so
		// growFrom has not run and getHeroSchedule() still describes the PREVIOUS navigation. It is resolved
		// inside scheduleHandoff's deferred frame instead — the same one-frame deferral that already exists
		// there because the destination seat does not exist yet either.
		const ms = handoffCase ? Math.max(HANDOFF_MS, rowClockMs()) * HANDOFF_TEMPO : rowClockMs();
		scheduleHandoff(node as HTMLElement, params.key, snap, ms);
		return {
			duration: ms,
			easing: cubicOut, // === the entrance's cubic-bezier(0.33, 1, 0.68, 1)
			// u = 1 - t: solid through ROW_SOLID of the march, gone by ROW_GONE — before the tier seat.
			css: (_t: number, u: number) =>
				`${pin}z-index: -1; opacity: ${clamp01((ROW_GONE - u) / (ROW_GONE - ROW_SOLID))}; transform: translateY(${u * push}px);`
		};
	}
	// Spouse-swap leavers (lateral) are not a row displacement — unchanged.
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
	// A notch spouse chip belongs to the FEATURED CARD's own top-right corner — it must never independently
	// re-animate from opacity 1 on the card's teardown. There is no card-level flight where a notch chip
	// should visibly fly on its own:
	//   • SPOUSE swap — the promoted chip flies to hero; ALL other notch chips hide (retiring Artifact A).
	//   • RELATIVE promotion — the whole card (with its notch) demotes to a parent/child chip; the card's
	//     own shrink + chip-face carries the motion, so the notch chips hide. If a departing spouse ALSO
	//     morphs into the destination as a parent/child (e.g. the featured person's wife is the clicked
	//     child's mother), the fall-through flyOut re-animated that chip from opacity 1 → a SECOND, spouse-
	//     role render flickering alongside the correct parent morphIn (the doubled-render ghost, pre-existing
	//     and caught by probe-ghosts). Hiding here kills it: the person's motion is owned by their morphIn.
	//   • CC — the roster already gathered into the card pre-flight (flyOut's own cc branch holds invisible).
	// So on EVERY card-level flight, a notch chip leaves invisibly. Non-degenerate duration so Svelte cleans
	// the outro (the floater lesson). Off-window chips (mask-clipped) leave the same way.
	if (
		flightKind === 'spouse' ||
		flightKind === 'relative' ||
		flightKind === 'sibling' ||
		(node as HTMLElement).dataset.offwindow === 'true'
	) {
		// position:absolute is load-bearing, not tidiness. Hidden is not the same as GONE: a chip that
		// merely goes invisible keeps its seat in the strip's flex flow for the whole outro, and the
		// INCOMING chip is then laid out one chip-width + gap (228px) to the LEFT of the seat it is
		// actually going to, snapping right only when the leaver is finally removed. That was invisible
		// while incoming chips were held at opacity 0 until landing — nothing painted at the wrong x —
		// but the hand-off traveller measures that seat to know where to fly, so it flew to the stale
		// position and held there: the chip appeared beside the notch, then jumped into it. Same rule
		// flyOut's pin already enforces for the parent/child rows ("incoming boxes settle without being
		// shoved"); the notch strip simply never got it. No coordinates needed — the chip is invisible,
		// so only its removal from flow matters.
		return { duration: 60, css: () => 'position: absolute; opacity: 0; visibility: hidden;' };
	}
	return flyOut(node, params); // cc only — flyOut short-circuits it to invisible internally
}

// ── THE CC BLADE: SHEATH / UNSHEATH ─────────────────────────────────────────────────────────────────
// "Like a swiss army knife there will always be a transition from sheathed — hidden from view under the
// Featured Card — to fully exposed" (Sam). The blade lives one z-layer BELOW the card (.blade-slot,
// z:-1), so hiding it is simply translating it up by its own height: the card is opaque and paints over
// it. Nothing is faded to hide it; it is genuinely behind the card, which is why the motion reads as a
// blade retracting into a handle rather than a panel dissolving.
//
// STAGING — the one real decision here. The blade cannot expose during the EARLY part of a flight,
// because the card is not at its resting position yet (a promoting chip is still a chip; a deck arrival
// is still offscreen) and there would be nothing above the blade to hide behind — it would read as a
// white strip floating alone. So the exposure is packed into the TAIL of the flight, ending exactly on
// the settle. By then the card is at (or within its overshoot of) its final position and genuinely IS
// the thing the blade slides out from under.
// ── THE BLADE'S DRAW ────────────────────────────────────────────────────────────────────────────────
// TWO CLOCKS, because a CC arrival and a chip promotion are not the same journey. The deck flight is a
// long cross-country haul; a chip promotion is a short hop. One draw length cannot serve both — sized
// for the deck it swamps a chip promotion, sized for the chip it is a twitch inside the deck's flight.
//
// `endsAt` is a fraction of the hero's ON-SCREEN travel (after its delay, which on a deck arrival is
// dead time with the card still offscreen). The draw finishes there and the card flies on for the
// remainder, so the blade is always seen opening against a still-moving card, never against a parked one.
// `lagMs` pushes the finish past the settle; `earlier` pulls the whole window back by a fraction of the
// flight. `carry` is the settle overshoot as a fraction of the blade's own travel — 0 means none.
const BLADE_DRAW = {
	cc: { ms: 420, endsAt: 0.95, lagMs: 0, earlier: 0, carry: 0.011 },
	// A VERTICAL deck arrival hides a vertical draw. Measured: the card waits offscreen until ~900ms,
	// then falls from y −675 to 252 in ~370ms — and the draw was running inside that descent, extending
	// the blade ~100px down while the card moved ~350px down. Same direction, three times the distance:
	// the blade's own motion is arithmetically invisible, which is exactly why it looked like the blade
	// arrived already open (Sam). Nothing was broken; it was hidden behind a bigger move in its own axis.
	// So on a vertical arrival the draw is anchored to the SETTLE (endsAt 1) rather than to a fraction of
	// the flight, and starts as the card parks.
	ccVertical: { ms: 420, endsAt: 1, lagMs: 300, earlier: 0.05, carry: 0.011 },
	// NO CARRY on an arrival from an on-screen chip. The card itself lands with an easeOutBack settle,
	// and a second overshoot underneath it does not add weight — the two read as one another's echo and
	// blunt the card's own (Sam). The blade just decelerates into its seat and lets the card do the
	// settling. carry 0 is not a different easing: easeOutBack(u, 0) is 1 + (u−1)³, which IS cubicOut,
	// so this is the same curve family with the overshoot dialled out rather than a second dialect.
	chip: { ms: 260, endsAt: 0.88, lagMs: 0, earlier: 0, carry: 0 }
} as const;

const BLADE_RETRACT_MS = 276; // stowing — the chip draw's clock +15%, so it leaves less abruptly

// The carry is a FRACTION of the blade's own travel, and 0.011 (where it is used at all) is the house
// ratio lifted straight out of settleBackFor (`distance * 0.011`). Getting this wrong is what made the
// draw read as a flick: the card carries 4.5–5.4px over a flight of ~900px, well under 1% of its travel,
// and the blade was carrying 5px over a travel of ~116px — nearly 4%, four to eight times the overshoot
// the rest of the world uses. As a ratio it also scales the way mass should: a one-line blade settles
// almost instantly, a nine-line blade carries further. And it needs no pixels, so travel and carry ride
// ONE curve in ONE unit — easeOutBack in pure percent, no calc(), no rescaling.
const BLADE_SAMPLES = 24;

/**
 * Blade OUT of the case — drawn late in its card's flight, finishing before the card settles.
 *
 * It does NOT wait for the card to land: nested inside the card, the blade draws WHILE the card flies,
 * which is the whole point of it being part of the card. It just must not draw so early that the card
 * has not arrived on screen to be seen drawing it (see BLADE_DRAW).
 *
 * A plain WAAPI animation rather than a Svelte `in:` transition because the blade lives INSIDE the card
 * component: Svelte does not run a nested element's intro when the component around it is created, so
 * the transition simply never fired (measured — the blade sat fully drawn from frame 0).
 *
 * No opacity anywhere. Sheathed means translated up behind the card, and the card is opaque and painted
 * above (.cc-blade-mount is z:-1 inside it), so the blade is hidden wherever the card is — mid-flight,
 * offscreen, scaled down to a chip.
 */
export function unsheathBlade(node: HTMLElement): void {
	if (prefersReducedMotion.current) return;
	const { duration, delay, kind, axis } = getHeroSchedule();
	if (!duration) return; // no flight (cold load, back/forward) → the blade is simply already out
	const spec =
		kind !== 'cc' ? BLADE_DRAW.chip : axis === 'vertical' ? BLADE_DRAW.ccVertical : BLADE_DRAW.cc;
	const endAt = delay + duration * spec.endsAt + spec.lagMs - spec.earlier * (delay + duration);
	const draw = Math.min(spec.ms, endAt);
	// carry 0 → s 0 → easeOutBack collapses to cubicOut, so there is no overshoot and no second curve.
	const back = spec.carry > 0 ? solveBackS(spec.carry) : 0;
	const frames = [];
	const labelFrames = [];
	for (let i = 0; i <= BLADE_SAMPLES; i++) {
		const u = i / BLADE_SAMPLES;
		// Travel is a percentage of the blade's own height — the only measurement-free way to say
		// "exactly its own depth" when the height is not knowable when the animation is built.
		const e = easeOutBack(u, back);
		frames.push({
			transform: `translateY(${((e - 1) * 100).toFixed(3)}%)`,
			offset: u,
			easing: 'linear' // the curve is baked into the samples
		});
		// THE LABEL DOES NOT BOUNCE. It rides out with the blade and stops dead at full extension — it
		// is lettering beside the case, not part of the moving steel, so it has no momentum to carry
		// (Sam). This cancels only the part of the curve that goes past 1, leaving the identical travel
		// up to that point; it works because the label's layer is exactly as tall as the blade, so a
		// percentage means the same distance to both.
		labelFrames.push({
			transform: `translateY(${((Math.min(e, 1) - e) * 100).toFixed(3)}%)`,
			offset: u,
			easing: 'linear'
		});
	}
	// fill:backwards holds the first keyframe — fully stowed — through the delay, so the blade stays in
	// the case until its moment instead of resting open and jumping back in to start.
	const timing = { duration: draw, delay: endAt - draw, fill: 'backwards' as const };
	node.animate(frames, timing);
	node.querySelector<HTMLElement>('.cc-label-layer')?.animate(labelFrames, timing);
}

/**
 * Blade back INTO the case — stowed as its card starts to leave.
 *
 * Driven from the departing card's own outrostart, not from inside the component: once a keyed block is
 * outroing, Svelte stops running its effects, so the card can no longer notice that it has stopped being
 * the resting card (measured — the outgoing blade stayed fully drawn and simply vanished with the card).
 * `node` is the flight element; the blade it owns is found inside it, the same way the outro already
 * reaches in to flatten the card's silhouette.
 */
export function retractBladeIn(node: HTMLElement): void {
	const mount = node.querySelector<HTMLElement>('.cc-blade-mount');
	if (!mount || prefersReducedMotion.current) return;
	mount.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], {
		duration: BLADE_RETRACT_MS,
		easing: 'cubic-bezier(0.32, 0, 0.67, 0)', // cubicIn — accelerating INTO the case, the draw's mirror
		fill: 'forwards' // stay stowed for the rest of the departure
	});
}
