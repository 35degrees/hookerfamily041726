/**
 * gather.svelte.ts — THE GATHER BEAT (CC arrivals only; item 4, gather → fly → unfurl).
 *
 * Before the lone card departs on a cross-connection jump, the current roster slides INTO the featured
 * card and fades (parents down, children up) — the family collapses into the one card that then flies.
 * A module singleton: navigate.ts triggers it (and delays focusPerson by GATHER_MS so the beat plays);
 * +page.svelte reacts with a `.gathering` class on the slots. Reset once the flight has taken over — the
 * incoming roster is held pending and UNFURLS out of the new card at landing (the inverse gesture).
 *
 * Chip navigation never triggers this; its roster reveals are untouched.
 */
export const gatherState = $state({ active: false });
export const GATHER_MS = 140; // the pre-flight beat (dialable ~120–150ms)

export function beginGather(): void {
	gatherState.active = true;
}
export function endGather(): void {
	gatherState.active = false;
}
