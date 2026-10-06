/**
 * slabFloat.svelte.ts — THE ZONE'S LOW GRAVITY (Sam, 100526).
 *
 * In the orbit and founder zones the whole family slab — featured card, spouse chip, parent/child rows,
 * the CC blade — sways as ONE plane: "like a stone slab, all of them together but moving as a
 * unit". And it is the ENVIRONMENT doing it, not an engine in the card: "imagine an astronaut doing a
 * space walk… a detachment from a grounded source where it's the environment itself with low gravity
 * causing the effect… so there's some randomness to the wobble." The rail, the room and the X stay put.
 *
 * SO IT IS NOT A LOOP. Each of the three channels (drift in x, drift in y, turn) is a
 * sum of three slow sines whose periods and phases are rolled at random — incommensurate, so the slab
 * never passes the same way twice and there is no cycle for the eye to learn. The motion is still a
 * plain WAAPI `transform` animation on `.page-container` (composited, nothing per frame): the noise is
 * SAMPLED into keyframes two minutes at a time, and each segment hands its exact end pose to the next.
 *
 * IT COMES LOOSE, IT DOES NOT SWITCH ON. Every (re)start begins flat and its amplitude rises over
 * LOOSEN_MS, so a card that has just crept to rest in the soup simply starts to drift.
 *
 * THE ONE HARD RULE: THE SLAB IS FLAT WHENEVER ANYTHING FLIES. A transform on `.page-container` re-bases
 * the coordinate space the motion engine measures in and makes it the containing block for the flight's
 * fixed-position pins (stage.svelte.ts records the measured damage). So the drift is CANCELLED,
 * synchronously, as the very first thing a navigation click does — before any rect is captured — and
 * restarted when the arriving card lands. At these amplitudes cancelling moves nothing by more than a
 * couple of pixels, inside the flight that is starting anyway.
 */

/**
 * How far the environment carries the slab — 2D ONLY (100526, second pass).
 * The first pass tilted it in 3D at well under a degree: Sam could not see it in Chrome, and in Safari a
 * 3D-transformed slab depth-sorted the bookmark behind the card and stepped instead of gliding. Sam: "maybe
 * the chip can actually sway… on the x and y axis… a sway in the breeze kind of thing, but not wind from
 * a specific direction, just a lack of gravity." So: a drift in x and y and a hair of turn — and NO
 * scaling. A breathing in width/height was tried and removed (Sam: "I can see the image stretch and squish…
 * the unit of the cards together doesn't breathe, it acts more like a metal plate. Metal doesn't stretch
 * and squeeze"). The slab is RIGID: it only translates and rotates.
 */
import { isWebKit } from './engine.js';

const DRIFT_X_PX = 6; // Sam: 4 invisible, 12 "very clear… definitely scaled down", 8, then −25% (100526)
const DRIFT_Y_PX = 6.75;
const TURN_DEG = 0.41;
/** From flat to full drift after a (re)start. */
const LOOSEN_MS = 3500;
/** One sampled segment; the next continues from its exact end pose. */
const SEGMENT_MS = 120_000;
const STEP_MS = 500;

/**
 * THE LIGHT STAYS IN THE ROOM WHILE THE PLATE TURNS UNDER IT (Sam, 100626: "a wax sheen that catches the
 * light"). A highlight band on the card's face (`.wax-light`, FeaturedCard) is moved by the SAME noise
 * that moves the slab, sampled at the same instants into a sibling animation, so the two cannot drift
 * apart: the band undoes the slab's drift (it is the room's light, not the card's) and slides across the
 * face in proportion to the turn — a fraction of a degree of turn is a long travel of the gleam, which is
 * what a glossy surface does. A transform on a child, so it is composited exactly like the slab.
 */
const SHEEN_PX_PER_DEG = 340; // 0.41° of turn ≈ 140px of gleam travel


type Channel = { p: number; ph: number; a: number }[];
let channels: Channel[] | null = null;
let anim: Animation | null = null;
let sheenAnim: Animation | null = null;
let segFrom = 0; // noise time at which the playing segment began, so a pause can read the live pose
let slabEl: HTMLElement | null = null;
let startedAt = 0; // noise time at which the current loosening began
let resting = $state(true);
let safety: ReturnType<typeof setTimeout> | null = null;

function roll(): Channel[] {
	// three octaves per channel: a slow swell, a medium drift, a faint quicker sway. Periods are drawn from
	// non-overlapping ranges so no two line up; weights sum to 1 so the channel's max is its amplitude.
	const ch = (): Channel => [
		{ p: 11 + Math.random() * 5, ph: Math.random() * Math.PI * 2, a: 0.55 },
		{ p: 20 + Math.random() * 8, ph: Math.random() * Math.PI * 2, a: 0.3 },
		{ p: 6 + Math.random() * 2.5, ph: Math.random() * Math.PI * 2, a: 0.15 }
	];
	return [ch(), ch(), ch()];
}
function noise(c: Channel, tMs: number): number {
	const t = tMs / 1000;
	let v = 0;
	for (const o of c) v += o.a * Math.sin((2 * Math.PI * t) / o.p + o.ph);
	return v;
}
function pose(tMs: number): [number, number, number] {
	const [dx, dy, rr] = channels as Channel[];
	const u = Math.min(1, Math.max(0, (tMs - startedAt) / LOOSEN_MS));
	const e = u * u * (3 - 2 * u); // smoothstep: starts flat with no velocity, so nothing "kicks"
	return [DRIFT_X_PX * e * noise(dx, tMs), DRIFT_Y_PX * e * noise(dy, tMs), TURN_DEG * e * noise(rr, tMs)];
}

/** The arriving card's light — never a leaving card's, which keeps whatever pose it was frozen in. */
function sheenOf(el: HTMLElement): HTMLElement | null {
	return el.querySelector<HTMLElement>('.featured-flight:not(.leaving) .wax-light');
}

function play(el: HTMLElement, from: number): void {
	const frames: Keyframe[] = [];
	const light: Keyframe[] = [];
	for (let t = 0; t <= SEGMENT_MS; t += STEP_MS) {
		const [tx, ty, r] = pose(from + t);
		const offset = t / SEGMENT_MS;
		frames.push({ transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) rotate(${r.toFixed(3)}deg)`, offset });
		// the room's light: back out the slab's drift and turn, then travel with the turn
		const sx = -tx - SHEEN_PX_PER_DEG * r;
		light.push({ transform: `translate(${sx.toFixed(1)}px, ${(-ty).toFixed(2)}px) rotate(${(-r).toFixed(3)}deg)`, offset });
	}
	el.style.transformOrigin = '50% 32%'; // the card's height, not the page's
	segFrom = from;
	slabEl = el;
	anim = el.animate(frames, { duration: SEGMENT_MS, easing: 'linear' });
	// NOT IN SAFARI (100626). The moving light is a second animated layer INSIDE the animated slab, and WebKit
	// snaps each animated layer to device pixels on its own: Sam saw zone cards "quivering… a high speed 1px
	// quiver vibration" in Safari only, the day the light started moving. Safari keeps the light STILL (it
	// is still painted — a static gleam — just not animated), which takes the extra layer away.
	const sheen = isWebKit() ? null : sheenOf(el);
	sheenAnim?.cancel();
	sheenAnim = sheen ? sheen.animate(light, { duration: SEGMENT_MS, easing: 'linear', fill: 'forwards' }) : null;
	const mine = anim;
	anim.onfinish = () => {
		if (anim === mine) play(el, from + SEGMENT_MS); // continue the SAME noise from where it ended
	};
}

export const slabFloat = {
	/** True while nothing is in flight. The page ANDs this with "in a zone" and "motion allowed". */
	get resting(): boolean {
		return resting;
	}
};

/** Start drifting from flat, with fresh randomness (called by the page when the zone is at rest). */
export function floatStart(el: HTMLElement): void {
	if (anim) return;
	channels = roll();
	startedAt = 0;
	play(el, 0);
}

/** Stop and go flat, immediately. */
export function floatStop(): void {
	if (anim) {
		anim.onfinish = null;
		anim.cancel();
		anim = null;
	}
	// The LIGHT is frozen, not cancelled: it is decoration on a child, measured by nothing, and snapping it
	// home would throw the gleam up to ~140px across a card that is about to fly. The slab must go flat
	// (rects are measured against it); the light can simply stop where it is. A new start replaces it.
	sheenAnim?.pause();
}

/**
 * ── THE DEPARTING CARD LEAVES FROM WHERE IT WAS (Sam, 100626) ──────────────────────────────────────
 * "when you click the x or a CC to return to a default zone card, the orbit card snaps back into a fixed
 * centered position instantly and then transitions back… it should transition out from its existing
 * position even if at the extreme most wobble angles it should exist at those angles."
 *
 * The SLAB still goes flat at the click — that is not negotiable (see the header: rects are measured
 * against it and its transform would capture the flight's fixed pins). What changes is that, in the same
 * synchronous step, each piece that is about to LEAVE takes over its own share of the pose, so on screen
 * nothing moves: the card and the spouse chips docked in its notch (they read as one object; Sam has
 * caught them parting before). The pose is re-expressed about each piece's own transform-origin and set
 * on the INDIVIDUAL `translate` / `rotate` properties — the flights animate `transform`, and the three
 * compose (translate · rotate · transform), so the exit's own scale or slide plays on top of the tilt it
 * left with, unchanged. Everything is measured flat and written before the next paint.
 *
 * The leavers are destroyed at the end of their exits. Anything carried that survives (an aborted click)
 * is eased home by `releaseCarried` when the next card lands.
 */
const CARRIED = '.featured-flight, .spouse-notch .flight';

function carryPose(tx: number, ty: number, r: number): void {
	const el = slabEl;
	if (!el || !el.isConnected) return;
	if (Math.abs(tx) < 0.05 && Math.abs(ty) < 0.05 && Math.abs(r) < 0.002) return;
	// the slab is flat by now: every rect below is its layout rect
	const pr = el.getBoundingClientRect();
	const ox = pr.left + pr.width * 0.5;
	const oy = pr.top + pr.height * 0.32; // the slab's transform-origin, '50% 32%'
	const a = (r * Math.PI) / 180;
	const cos = Math.cos(a);
	const sin = Math.sin(a);
	for (const u of el.querySelectorAll<HTMLElement>(CARRIED)) {
		const ur = u.getBoundingClientRect();
		if (!ur.width) continue;
		const [cx0, cy0] = getComputedStyle(u).transformOrigin.split(' ').map(parseFloat);
		const vx = ur.left + cx0 - ox;
		const vy = ur.top + cy0 - oy;
		// same pose about the piece's own origin C: rotate by r, translate by R(C−O) − (C−O) + t
		const dx = vx * cos - vy * sin - vx + tx;
		const dy = vx * sin + vy * cos - vy + ty;
		u.style.translate = `${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
		u.style.rotate = `${r.toFixed(3)}deg`;
		u.dataset.carried = '1';
	}
}

/**
 * A carried piece that is flying INTO A SEAT (a spouse or parent/child demote) cannot keep the pose: it
 * would land tilted and a few px off its chip, then snap. It eases flat across the first part of that
 * flight instead — still no snap at the click, and level by the time it docks. A card leaving the screen
 * (a CC or the X) never comes through here: it keeps its angle all the way out, which is the point.
 */
export function easeCarriedOut(u: HTMLElement, ms = 420): void {
	if (!u.dataset.carried) return;
	delete u.dataset.carried;
	const from = { translate: u.style.translate || '0px 0px', rotate: u.style.rotate || '0deg' };
	u.style.translate = '';
	u.style.rotate = '';
	u.animate([from, { translate: '0px 0px', rotate: '0deg' }], { duration: ms, easing: 'ease-in-out' });
}

/** The next card has landed: anything still carrying a pose (only ever a piece that did not leave) eases flat. */
function releaseCarried(): void {
	if (typeof document === 'undefined') return;
	for (const u of document.querySelectorAll<HTMLElement>('[data-carried]')) {
		delete u.dataset.carried;
		const from = { translate: u.style.translate || '0px 0px', rotate: u.style.rotate || '0deg' };
		u.style.translate = '';
		u.style.rotate = '';
		u.animate([from, { translate: '0px 0px', rotate: '0deg' }], { duration: 320, easing: 'ease-out' });
	}
}

/** A navigation is starting: flatten NOW, synchronously, before anything is measured. */
export function floatPause(): void {
	resting = false;
	const live = anim && channels ? pose(segFrom + Number(anim.currentTime ?? 0)) : null;
	floatStop();
	if (live) carryPose(...live);
	// A click that never lands (an aborted navigation) must not leave the zone frozen for good. Longer
	// than any flight (the soupy entry lands at ~1.3s, its chips after), so it never wakes mid-flight.
	if (safety) clearTimeout(safety);
	safety = setTimeout(floatResume, 4000);
}

/** The arriving card has landed: the slab may come loose again. */
export function floatResume(): void {
	if (safety) clearTimeout(safety);
	safety = null;
	resting = true;
	releaseCarried();
}
