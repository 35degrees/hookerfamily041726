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
/** 082926: `auth` joins as the FOURTH surface, and it is a fourth FILE — §46.2. It shares this slot
 *  and the veil's values; it shares nothing that renders. `bookmarks` follows in slice 5. */
/** 100926: `contact` is the SIXTH, opened from an NB body link (`[here](contact)`, NarrativeBlocks); `privacy` and
 *  `sources` the seventh and eighth, opened from SiteFooter. */
export type ModalKind =
	| 'connect-thomas'
	| 'connect-anyone'
	| 'search'
	| 'auth'
	| 'bookmarks'
	| 'contact'
	| 'privacy'
	| 'sources';

import { trackEvent } from '#lib/state/analytics.svelte.js';
import { featured } from '#lib/state/featured.svelte.js';

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

/**
 * WHAT READERS OPEN (Oct 28, Sam: "i'd love to see events like clicking the Paths to Thomas and Paths to family
 * buttons. also clicking sources, contact, privacy etc."). Every overlay opens through here, so this is the one
 * place to count them: a Vercel custom event per opening, named for what the reader sees, carrying the card it
 * was opened from. Behind analytics.svelte.ts's fences (hookerverse.com only, never Sam). `quiet` is for the two
 * openings no reader clicked — a direct visit to /privacy, and Back onto it — which are already page views.
 */
const EVENT_NAME: Record<ModalKind, string> = {
	'connect-thomas': 'Path to Thomas',
	'connect-anyone': 'Paths to Family',
	search: 'Search',
	auth: 'Sign in',
	bookmarks: 'Bookmarks',
	contact: 'Contact',
	privacy: 'Privacy',
	sources: 'Sources'
};

export function openModal(kind: ModalKind, opts?: { quiet?: boolean }): void {
	if (!opts?.quiet && openKind !== kind) {
		const card = featured.current?.person.slug;
		trackEvent(EVENT_NAME[kind], card ? { card } : undefined);
	}
	openKind = kind;
}

/** Close. Used by the X, Escape, the scrim, and by a row click just BEFORE it navigates — the card
 *  underneath must be back in its seat before the deck deals, rather than the flight running under a
 *  closing overlay where nobody can see it (Sam: reveal Burr in his seat, no half-displayed transition). */
export function closeModal(): void {
	openKind = null;
}

