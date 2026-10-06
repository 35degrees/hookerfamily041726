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
const DRIFT_X_PX = 6; // Sam: 4 invisible, 12 "very clear… definitely scaled down", 8, then −25% (100526)
const DRIFT_Y_PX = 6.75;
const TURN_DEG = 0.41;
/** From flat to full drift after a (re)start. */
const LOOSEN_MS = 3500;
/** One sampled segment; the next continues from its exact end pose. */
const SEGMENT_MS = 120_000;
const STEP_MS = 500;


type Channel = { p: number; ph: number; a: number }[];
let channels: Channel[] | null = null;
let anim: Animation | null = null;
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
function pose(tMs: number): string {
	const [dx, dy, rr] = channels as Channel[];
	const u = Math.min(1, Math.max(0, (tMs - startedAt) / LOOSEN_MS));
	const e = u * u * (3 - 2 * u); // smoothstep: starts flat with no velocity, so nothing "kicks"
	const tx = DRIFT_X_PX * e * noise(dx, tMs);
	const ty = DRIFT_Y_PX * e * noise(dy, tMs);
	const r = TURN_DEG * e * noise(rr, tMs);
	return `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) rotate(${r.toFixed(3)}deg)`;
}

function play(el: HTMLElement, from: number): void {
	const frames: Keyframe[] = [];
	for (let t = 0; t <= SEGMENT_MS; t += STEP_MS) frames.push({ transform: pose(from + t), offset: t / SEGMENT_MS });
	el.style.transformOrigin = '50% 32%'; // the card's height, not the page's
	anim = el.animate(frames, { duration: SEGMENT_MS, easing: 'linear' });
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
}

/** A navigation is starting: flatten NOW, synchronously, before anything is measured. */
export function floatPause(): void {
	resting = false;
	floatStop();
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
}
