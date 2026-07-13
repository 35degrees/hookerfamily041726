/**
 * arc-math.ts — pure math for THE ALTITUDE ARC (Zoom 2 in motion), shared so the card (flight.ts), the
 * arc clock (arc.svelte.ts), the substrate, and navigate all read ONE definition. No side effects, no
 * imports beyond the camera type — this is the single source that keeps card + substrate on one clock.
 *
 * A far COLLATERAL CC earns a three-phase camera path over the arc duration:
 *   rise      [0, ARC_RISE]        scale 1 → scaleMin (ease-out) — pull back to altitude
 *   traverse  [ARC_RISE, ARC_DESC] hold at scaleMin, camera centre pans from → to — the world sweeps past
 *   descend   [ARC_DESC, 1]        scale scaleMin → 1 (ease-in) — settle onto the destination seat
 * scaleMin previews the Zoom 2 resting scale. Direct dives and short collateral hops do NOT arc.
 */
import type { CameraMove } from '$lib/state/camera';

export const ARC_RISE = 0.3;
export const ARC_DESC = 0.7;
const ARC_MIN_SEATS = 400; // |Δx| below which a collateral CC stays a flat flight
const ARC_MIN_YEARS = 120;
const ARC_SCALE_MIN = 0.5; // altitude — how far the camera pulls back (dial)
const ARC_MAX_MS = 2000; // far arcs earn more time than the flat-flight cap (dial)

const cubicOutE = (p: number) => 1 - Math.pow(1 - p, 3);
const cubicInE = (p: number) => p * p * p;

/** Does this CC earn an arc? Collateral only, and far enough in seats OR years. */
export function isArcMove(m: CameraMove | null): boolean {
	if (!m || m.kind !== 'cc' || m.relationClass !== 'collateral') return false;
	if (m.from?.x == null || m.to?.x == null) return false;
	const dx = Math.abs(m.to.x - m.from.x);
	const dy = m.to.y != null && m.from.y != null ? Math.abs(m.to.y - m.from.y) : 0;
	return dx >= ARC_MIN_SEATS || dy >= ARC_MIN_YEARS;
}

export function arcScaleMinFor(_m: CameraMove | null): number {
	return ARC_SCALE_MIN; // fixed dial for Slice 1; may later scale with distance
}

export function arcDurationMsFor(m: CameraMove | null): number {
	const dx = m?.from?.x != null && m?.to?.x != null ? Math.abs(m.to.x - m.from.x) : 0;
	return Math.min(ARC_MAX_MS, 1300 + Math.min(1, dx / 2000) * 700);
}

/** scale(t): rise → traverse → descend. One function; card AND substrate call it → guaranteed one clock. */
export function arcScaleAt(t: number, scaleMin: number): number {
	if (t <= ARC_RISE) return 1 - (1 - scaleMin) * cubicOutE(t / ARC_RISE);
	if (t >= ARC_DESC) return scaleMin + (1 - scaleMin) * cubicInE((t - ARC_DESC) / (1 - ARC_DESC));
	return scaleMin;
}

/** traverse fraction: 0 through the rise, 0→1 across the traverse, 1 through the descent. */
export function arcProgress(t: number): number {
	if (t <= ARC_RISE) return 0;
	if (t >= ARC_DESC) return 1;
	return (t - ARC_RISE) / (ARC_DESC - ARC_RISE);
}
