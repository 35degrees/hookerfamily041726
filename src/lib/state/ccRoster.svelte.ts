/**
 * ccRoster.svelte.ts — the CC-arrival roster HARD CUT (item A; replaces the earlier pre-flight gather).
 *
 * On a cross-connection navigation the parent/child chips are removed in the SAME frame the flight origin
 * is captured — a hard cut (opacity 0, no transition, no beat). The lone card launches that frame; the new
 * roster is held pending and UNFURLS out of the arriving card at landing. Invariant, strengthened: zero
 * parent/child chip pixels from flight-start to landing (they're gone at frame 0). Chip navigation never
 * touches this — its reveals are unchanged.
 *
 * A module singleton: navigate.ts sets `hidden` at click and clears it once the flight has taken over
 * (the incoming roster stays invisible via markPending until its landing unfurl).
 */
export const ccRoster = $state({ hidden: false });

export function hideCcRoster(): void {
	ccRoster.hidden = true;
}
export function showCcRoster(): void {
	ccRoster.hidden = false;
}
