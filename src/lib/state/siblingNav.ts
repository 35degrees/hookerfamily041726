/**
 * SIBLING↔SIBLING AS AN IN-PLACE MUTATION — the plan for one such navigation (roadmap §19).
 *
 * A sibling promotion barely changes the sibling list: it loses the person you clicked and gains the
 * person you left. So the panel PERSISTS and MUTATES rather than tearing down and rebuilding, and the
 * demoted card flies INTO the vacated list as a chip instead of retracting into the card's corner.
 *
 * THE TIMING PROBLEM THIS MODULE EXISTS TO SOLVE. Three parties need one answer — where the demoted
 * person's chip will COME TO REST — and they need it at three different moments:
 *
 *   • `shrinkTo`'s INIT needs it to clock the flight (an honest-velocity duration is a function of the
 *     distance travelled), and init runs during the DOM update, before any effect.
 *   • `shrinkTo`'s TICK needs it every frame to place the card.
 *   • `SiblingPanel` needs the target OFFSET so it can scroll to catch the card.
 *
 * Reading it from the DOM after the swap cannot serve the first, and would in any case measure the
 * WRONG NUMBER for the other two: the strip is mid-glide, so a seat's live rect is an animating value.
 * Sam's ruling is that the traveller targets the seat's FINAL resting position and the two motions
 * resolve together, so the rect has to be computed, not measured.
 *
 * It is computed at the one seam where everything needed is knowable synchronously: inside
 * `focusPerson`, after the incoming payload has arrived and BEFORE `featured.set` starts the flush.
 * At that instant the incoming sibling list is in hand and the outgoing panel is still on screen with
 * its geometry intact — and, measured, that geometry is invariant across the navigation anyway (the
 * zone is anchored to the featured slot, which does not move; only the notch-carve inset changes, and
 * that is derived from the incoming spouse count rather than measured).
 *
 * Everything downstream then reads a settled value with no ordering hazard.
 */
import type { Neighborhood } from '$lib/types/neighborhood';
import { peekFlightOrigin } from '$lib/transitions/flight';
import {
	CHIP_W,
	CHIP_H,
	anchorOffsetFor,
	buildItems,
	chipIndices,
	cumTops,
	offsetToReveal,
	showsSiblingPanel,
	startItemFor,
	type SiblingTiers
} from './siblingLayout';

export type SeatRect = { left: number; top: number; width: number; height: number };

export type SiblingNavPlan = {
	/** The person being demoted — the one whose chip the card is flying into. */
	pivotId: string;
	/** Where that chip will be once the strip has finished gliding. Viewport coordinates. */
	seat: SeatRect;
	/** The chip-offset the panel must glide to so the seat is actually rendered (§18.9). */
	targetOffset: number;
	/** The HERO's own centre travel — clicked chip centre → featured slot centre — so the demote can be
	 *  clocked off the SAME curve the arriving card uses (`siblingGrowMs`) rather than a formula borrowed
	 *  from the spouse regime. Captured here because `growFrom` CONSUMES the origin rect in the same flush
	 *  the outro is configured in, so the outro can never read it for itself. §18.2's lesson: distance and
	 *  time are decided ONCE for the whole stage, not separately in each place that needs them. */
	heroCenterTravel: number;
};

let plan: SiblingNavPlan | null = null;

export function getSiblingNavPlan(): SiblingNavPlan | null {
	return plan;
}

export function clearSiblingNavPlan(): void {
	plan = null;
}

/**
 * Work out the plan for a sibling→sibling navigation, or return null when there isn't one.
 *
 * Returns null — and the whole §19 path stays off, leaving the §21.1 corner retraction exactly as it
 * was — whenever the mutation is not possible or not wanted:
 *   • the panel is shut. There is no list to fly into; this is forced, not a preference.
 *   • the INCOMING person gets no panel at all (the §21.1 gate: no trigger for easter eggs, married-in
 *     spouses, or anyone off the Hooker/Talcott lines). The list is about to unmount, seat and all.
 *   • the demoted person is not among the incoming person's siblings. Siblinghood is symmetric, so
 *     this should not happen, but a seat that does not exist is not one to fly at.
 *
 * The notch-carve inset comes from the INCOMING person's spouse count, because the chip column's top
 * sits below that carve and a compact notch (≥3 spouses) is shallower. Everything else is read off the
 * live panel, whose geometry is invariant across the navigation.
 */
export function planSiblingNav(
	nb: Neighborhood | null | undefined,
	pivotId: string | null
): SiblingNavPlan | null {
	plan = null;
	if (!pivotId || !nb || typeof document === 'undefined') return null;
	// §21.1's own render gate, asked of the INCOMING person: no gate, no panel, no seat. Shared with the
	// page rather than restated here — this used to be a second copy of the same boolean.
	if (!showsSiblingPanel(nb)) return null;
	const siblings = nb.siblings as SiblingTiers | undefined;
	if (!siblings) return null;
	const zone = document.querySelector('.sibling-zone');
	const window_ = document.querySelector('.sibling-window') as HTMLElement | null;
	// `.sibling-window` only exists while the panel is OPEN — its absence IS the closed test.
	if (!zone || !window_) return null;

	const items = buildItems(siblings);
	const tops = cumTops(items);
	const chips = chipIndices(items);
	const k = items.findIndex((it) => it.kind === 'chip' && it.chip.id === pivotId);
	if (k < 0) return null;

	// The panel publishes its live offset the same way the spouse notch does (`data-spouse-offset`),
	// so the minimal-scroll rule can start from where the strip actually is.
	const current = Number(window_.dataset.sibOffset ?? '0') || 0;
	const targetOffset = offsetToReveal(items, tops, chips, k, current);

	// The hero's honest translation, measured the same way growFrom measures it (CENTRE to CENTRE — a card
	// unfolding from a 119×54 chip has hugely inflated corner travel). Read at the seam, where the click's
	// origin rect is still captured and the outgoing slot is still on screen.
	const origin = peekFlightOrigin();
	const slot = document.querySelector('.featured-slot')?.getBoundingClientRect();
	const heroCenterTravel =
		origin && slot
			? Math.hypot(
					origin.left + origin.width / 2 - (slot.left + slot.width / 2),
					origin.top + origin.height / 2 - (slot.top + slot.height / 2)
				)
			: 0;

	const spouseCount = nb.spouses?.length ?? 0;
	const zr = zone.getBoundingClientRect();
	// Measured invariants, not assumptions: the mask's left equals the zone's left (the zone is a
	// centred column exactly one chip wide), and the mask's top equals the zone's top plus the
	// top-slot's height, which is the notch-carve inset. Verified on both notch regimes.
	const maskTop = zr.top + anchorOffsetFor(spouseCount);
	const stripY = -(tops[startItemFor(items, chips, targetOffset)] ?? 0);
	plan = {
		pivotId,
		targetOffset,
		heroCenterTravel,
		seat: {
			left: zr.left,
			top: maskTop + (tops[k] ?? 0) + stripY,
			width: CHIP_W,
			height: CHIP_H
		}
	};
	return plan;
}

/** Convenience for the panel: is this chip the one the demoting card is flying into? */
export function isIncomingSeat(id: string): boolean {
	return plan?.pivotId === id;
}
