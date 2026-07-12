/**
 * camera.ts — Phase 3a Block 2: the CAMERA STORE (plumbing, no visuals, no subscribers yet).
 *
 * A module-level store published at CAPTURE time — synchronous with the flight captures in
 * navigate.ts's warmPersonLinks onClick, before any state change or reflow (capture-time doctrine).
 * It is the single source for "where the camera should move" on a re-focus:
 *
 *   from / to      table coords (t = {x,y}) of the departing / arriving featured person
 *   screenVector   the clicked-box → featured-slot displacement in SCREEN px (the direction the
 *                  hero actually travels) — the same rect delta the flight computes
 *   distance       |screenVector|
 *   duration       the flight's duration for this move (ms), easing its curve
 *   kind           'spouse' (lateral swap) | 'relative' (parent/child)
 *
 * First consumer: Block 3, the settle — a translate-overshoot along `screenVector` (design §17.2).
 * Next: Block 3b motes/parallax subscribe to this same store. Until then it only records + (in dev)
 * logs, so the plumbing can be proven by probe before anything reads it.
 */
export type Vec = { x: number; y: number | null }; // y null = no-time-basis person (consumers skip)

export type CameraMove = {
	from: Vec | null;
	to: Vec | null;
	screenVector: { dx: number; dy: number };
	distance: number;
	duration: number;
	easing: string;
	kind: 'spouse' | 'relative';
	seq: number;
};

let current: CameraMove | null = null;
let seq = 0;

/** Publish the move for the click just captured. Overwrites the previous (single latest move). */
export function publishCameraMove(m: Omit<CameraMove, 'seq'>): void {
	current = { ...m, seq: ++seq };
	// Dev tripwire so the probe can read publishes off the console (no subscribers yet). Kept out of
	// prod. Also mirrored onto window in dev for direct assertion.
	if (import.meta.env.DEV) {
		console.log('[camera]', JSON.stringify(current));
		(globalThis as { __cameraMove?: CameraMove }).__cameraMove = current;
	}
}

/** The latest published move (Block 3+ reads this). Null before any warm nav. */
export function getCameraMove(): CameraMove | null {
	return current;
}
