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
	// 'cc' = a non-chip navigation (the directional arrival class). 'sibling' = a chip nav that GROWS from
	// the clicked sibling chip (like 'relative') but whose old card DEPARTS via the CC path (whole card,
	// opposite lateral vector, no chip-face, no settle) — the old focus has no destination box on the
	// sibling's page, so it can't demote into one.
	kind: 'spouse' | 'relative' | 'cc' | 'sibling';
	// CC laterality (graph-derived at build time; see regenerate relationClass). 'direct' → the arrival
	// flies in vertically (Δx ignored); 'collateral' → it tilts by compressed Δx. Absent for chip navs.
	relationClass?: 'direct' | 'collateral' | null;
	// ALTITUDE ARC (far collateral CCs): the camera pulls back to this scale, traverses, descends. The
	// subject card and the tile substrate both read it. Absent/null → a flat flight (no pull-back).
	scaleMin?: number | null;
	seq: number;
};

let current: CameraMove | null = null;
let seq = 0;

// Subscribers (Phase 3b: the field's mote layers) called synchronously on each publish. A plain
// listener set — the store is a module singleton, not a Svelte store, and the flight already reads it
// by poll (getCameraMove); the parallax needs the push instead, so it drifts ON the move, one clock.
type Listener = (m: CameraMove) => void;
const listeners = new Set<Listener>();
export function subscribeCameraMove(cb: Listener): () => void {
	listeners.add(cb);
	return () => listeners.delete(cb);
}

/** Publish the move for the click just captured. Overwrites the previous (single latest move). */
export function publishCameraMove(m: Omit<CameraMove, 'seq'>): void {
	current = { ...m, seq: ++seq };
	// Dev tripwire so the probe can read publishes off the console. Also mirrored onto window in dev.
	if (import.meta.env.DEV) {
		console.log('[camera]', JSON.stringify(current));
		(globalThis as { __cameraMove?: CameraMove }).__cameraMove = current;
	}
	for (const l of listeners) l(current);
}

/** The latest published move (Block 3+ reads this). Null before any warm nav. */
export function getCameraMove(): CameraMove | null {
	return current;
}
