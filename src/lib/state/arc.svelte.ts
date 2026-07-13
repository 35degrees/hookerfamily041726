/**
 * arc.svelte.ts — THE ALTITUDE ARC CLOCK (Zoom 2 in motion). A single rAF loop over the arc duration,
 * publishing scale + camera-centre (in table coords) each frame. The subject card AND the tile substrate
 * (Substrate.svelte, the reusable Zoom 2 primitive) both READ this one clock — never their own — so they
 * can never desync (the two-clock failure mode). Started from navigate.ts when a CC earns an arc.
 *
 *   active   an arc is in progress (substrate mounts, card pulls back)
 *   t        0..1 over the arc duration
 *   scale    arcScaleAt(t) — 1 → scaleMin (rise) → scaleMin (traverse) → 1 (descend)
 *   cx, cy   camera centre in TABLE coords — pans from → to across the traverse
 */
import { arcScaleAt, arcProgress } from '$lib/transitions/arc-math';

// cx/cy = camera centre this frame (pans from → to); fx/fy → tx/ty = the traverse corridor endpoints in
// table coords (fixed for the arc), so the substrate can pick its tiles once and only re-transform them.
export const arcClock = $state({ active: false, t: 0, scale: 1, cx: 0, cy: 0, fx: 0, fy: 0, tx: 0, ty: 0, seq: 0 });

let raf = 0;
let startT = 0;
let dur = 0;
let fromX = 0,
	fromY = 0,
	toX = 0,
	toY = 0,
	sMin = 1;

export function startArc(o: {
	from: { x: number; y: number };
	to: { x: number; y: number };
	scaleMin: number;
	duration: number;
}): void {
	cancelArc();
	fromX = o.from.x;
	fromY = o.from.y;
	toX = o.to.x;
	toY = o.to.y;
	sMin = o.scaleMin;
	dur = Math.max(1, o.duration);
	startT = performance.now();
	arcClock.active = true;
	arcClock.t = 0;
	arcClock.scale = 1;
	arcClock.cx = fromX;
	arcClock.cy = fromY;
	arcClock.fx = fromX;
	arcClock.fy = fromY;
	arcClock.tx = toX;
	arcClock.ty = toY;
	arcClock.seq++;
	const loop = (now: number) => {
		const t = Math.min(1, (now - startT) / dur);
		arcClock.t = t;
		arcClock.scale = arcScaleAt(t, sMin);
		const p = arcProgress(t);
		arcClock.cx = fromX + (toX - fromX) * p;
		arcClock.cy = fromY + (toY - fromY) * p;
		// Dev tripwire: the probe frame-samples this to prove card + substrate share one clock, and to read
		// the traverse pan direction for arc reciprocity.
		if (import.meta.env.DEV) (globalThis as { __arcClock?: typeof arcClock }).__arcClock = arcClock;
		if (t < 1) raf = requestAnimationFrame(loop);
		else endArc();
	};
	raf = requestAnimationFrame(loop);
}

function endArc(): void {
	arcClock.active = false;
	arcClock.scale = 1;
	arcClock.t = 1;
	raf = 0;
}

export function cancelArc(): void {
	if (raf) cancelAnimationFrame(raf);
	raf = 0;
	arcClock.active = false;
	arcClock.scale = 1;
}
