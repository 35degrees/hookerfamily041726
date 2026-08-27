/**
 * modal.svelte.ts — WHICH OVERLAY IS OPEN, and there is only ever one.
 *
 * Three overlays are planned and they share this slot: the connect-to-Thomas ladder (built), the
 * connect-to-anyone fork, and search. They share a shell for the same reason the founder zone is a SKIN
 * on the Ascension rather than a second zone (design §43.1) — a parallel mechanism would have to be kept
 * in step by hand, and the two would silently diverge.
 *
 * A SINGLE SLOT, NOT A STACK, and deliberately — the same call `ascension.svelte.ts` makes about its
 * referrer. Two overlays open at once is not a state this app has, and a stack is an invitation to build
 * one by accident. Opening a second closes the first, which is what the slot already means.
 *
 * NO PAYLOAD HERE. What a modal renders it reads from `featured.current`, which is the app's one
 * subject — the ladder is `featured.current.pathsToThomas`, baked into the payload the page already
 * loaded. Parking a copy in this store would be a second source of truth for one fact, and it would go
 * stale the moment a navigation replaced the featured person underneath it.
 */
export type ModalKind = 'connect-thomas' | 'search';

let openKind = $state<ModalKind | null>(null);

export const modal = {
	/** The open overlay, or null. The shell renders on this and nothing else reads it. */
	get kind(): ModalKind | null {
		return openKind;
	},
	get isOpen(): boolean {
		return openKind !== null;
	}
};

export function openModal(kind: ModalKind): void {
	openKind = kind;
}

/** Close. Used by the X, Escape, the scrim, and by a row click just BEFORE it navigates — the card
 *  underneath must be back in its seat before the deck deals, rather than the flight running under a
 *  closing overlay where nobody can see it (Sam: reveal Burr in his seat, no half-displayed transition). */
export function closeModal(): void {
	openKind = null;
}
