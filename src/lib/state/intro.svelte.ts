/**
 * intro.svelte.ts — the hand-off between the intro at `/` and the person page underneath it (100226).
 *
 * The intro overlay lives in the LAYOUT (like SettleVeil) so it survives the route change: `/` starts it
 * and immediately replaces itself with Thomas's page (no history entry, so Back and refresh never replay
 * it). That page mounts UNDER the overlay and HOLDS itself blank — no card, no roster, no chrome — until
 * the overlay has faded to paper and calls `releaseIntro()`. The page then lets the card in as an
 * ordinary vertical cross-connection: the existing deck flight raises it from the window's bottom edge
 * and the roster unfurls at landing. A new surface terminating in an existing transition (design §47.9).
 *
 * Module singleton, client-only in practice: `startIntro` is only ever called from an onMount.
 */
export const intro = $state({
	active: false, // the overlay is up (it also renders on SSR of `/`, before this is set)
	ready: false, // the person page underneath has mounted and taken its hold
	released: false // the overlay has reached paper: let the card in
});

let pending = false;

export function startIntro(): void {
	intro.active = true;
	intro.ready = false;
	intro.released = false;
	pending = true;
}

/** Called once by the person page as it mounts: true = start blank and wait for the release. */
export function takeIntroHold(): boolean {
	const p = pending;
	pending = false;
	if (p) intro.ready = true;
	return p;
}

export function releaseIntro(): void {
	intro.released = true;
}

export function endIntro(): void {
	intro.active = false;
}
