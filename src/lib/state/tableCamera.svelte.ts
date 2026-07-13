/**
 * tableCamera.svelte.ts — the Zoom 2 CAMERA (shared store). The standalone hand-panned table view reads
 * it; pan/inertia write it. Authored as the store the parked altitude arc will later publish moves to
 * (a camera path over the same table), so Zoom 2 gains fly-to without a rebuild.
 *
 *   cx, cy  camera centre in TABLE coords (seat x, birth-year y) — the world point at the viewport centre
 *   scale   zoom (1 = the resting scale; pan-only in v1, but the field is here for the arc + future pinch)
 */
export const tableCamera = $state({ cx: 3520, cy: 1730, scale: 0.85 });

export function panBy(dSeatX: number, dYearY: number): void {
	tableCamera.cx += dSeatX;
	tableCamera.cy += dYearY;
}
