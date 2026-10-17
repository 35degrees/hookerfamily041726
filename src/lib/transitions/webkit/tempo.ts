/**
 * tempo.ts — Sam's tempo and weight for the WebKit engine, read from Hooker's own flight.ts.
 *
 * These numbers ARE the design (Sam tuned every one by feel in Chrome). The engine only changes how they
 * are played in Safari, so it imports them rather than keeping a copy: change one in flight.ts and both
 * engines move together (Kennedy's HOOKER_PORT.md §5.2, step 1).
 */
export {
	easeOutBack,
	solveBackS,
	settleBackFor,
	relativeGrowMs,
	siblingBaseMs,
	siblingGrowMs,
	spouseGrowMs,
	spouseHeroDurationMs,
	maxCornerTravel,
	SPOUSE_FINISH_LEAD_MS,
	DEMOTE_LEAD,
	demoteSettleBackFor,
	DEMOTE_SETTLE_PARENT_FACTOR,
	DEMOTE_SETTLE_CHILD_FACTOR,
	DEMOTE_SETTLE_SIBLING_FACTOR,
	SIBLING_FINISH_LEAD_MS,
	SIBLING_SEAT_HOLD,
	SIBLING_SHAPE_AT,
	ROW_TRAVEL_FALLBACK,
	ROW_SOLID,
	ROW_GONE,
	FACE_OUT_HI,
	FACE_OUT_LO,
	FACE_IN_HI,
	FACE_IN_LO,
	FACE_SCALE_MAX
} from '../flight.js';

export type Rect = { left: number; top: number; width: number; height: number };

export const cubicOut = (t: number) => {
	const f = t - 1;
	return f * f * f + 1;
};

/** Centre-to-centre distance of two rects (the sibling clock's travel). */
export const centerTravel = (a: Rect, b: Rect) =>
	Math.hypot(
		a.left + a.width / 2 - (b.left + b.width / 2),
		a.top + a.height / 2 - (b.top + b.height / 2)
	);

/** Spouse chips arrive once the card has landed (the page's CHIP_REVEAL_MS); connectors with them. */
export const CHIP_REVEAL_MS = 120;
export const CONNECTOR_REVEAL_MS = 150;

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
