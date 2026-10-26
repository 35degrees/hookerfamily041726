/**
 * surfaces.ts — THE POP-UPS THAT HAVE ADDRESSES (Oct 26, Sam; SEO_PLAN §5.8).
 *
 * Privacy, Sources and the contact form are modals, opened over whatever card you are on, and they stay
 * that way. What changes is underneath: each has a real address, so Google can read it, the sign-in
 * consent screens can link to it, analytics can count it, and a link to it can be shared.
 *
 *   in the app      the modal opens as before and the address bar moves to /privacy (shallow, like a
 *                   chip); closing it — X, Escape, the veil, or Back — returns it to the card's address
 *   direct visit    /privacy loads the HOST card with the modal already open, server-rendered so its
 *                   text is in the HTML. Rev. Thomas Hooker's card behind Privacy and Sources (Sam, Oct 26:
 *                   "thomas is good" — the root of the tree, where a newcomer should start); Sam's own card
 *                   behind Contact, because the form already lives in his NB 3.
 *
 * The route is the person route ([slug]): `+page.ts` recognises these names before looking for a
 * payload, and `paths.ts` reserves them so nothing that reads the address bar mistakes one for a person.
 */
import type { ModalKind } from '#lib/state/modal.svelte.js';

export type SurfaceKind = Extract<ModalKind, 'privacy' | 'sources' | 'contact'>;

type Surface = {
	/** The card behind the modal on a direct visit. */
	host: string;
	/** The tab title's first half ("Privacy - The Descendants of Rev. Thomas Hooker"). */
	title: string;
	/** The grey line under a search result; null where the page is not indexed. */
	description: string | null;
	/** Whether search engines should list it. The contact form is a form, not content. */
	index: boolean;
};

export const SURFACES: Record<SurfaceKind, Surface> = {
	privacy: {
		host: 'thomas-hooker-1586',
		title: 'Privacy',
		description:
			'What this family history site keeps about readers who sign in, what it does with it, and how to delete your account.',
		index: true
	},
	sources: {
		host: 'thomas-hooker-1586',
		title: 'Sources',
		description:
			'The family genealogies, archives and published histories that The Descendants of Rev. Thomas Hooker is built from.',
		index: true
	},
	contact: {
		host: 'samuel-hooker',
		title: 'Contact',
		description: null,
		index: false
	}
};

export function isSurface(kind: string | null | undefined): kind is SurfaceKind {
	return kind != null && Object.hasOwn(SURFACES, kind);
}

/** The surface an address points at (`/privacy` → 'privacy'), or null. */
export function surfaceFromPath(pathname: string): SurfaceKind | null {
	const name = pathname.replace(/^\/|\/$/g, '');
	return isSurface(name) ? name : null;
}

export const surfaceHref = (kind: SurfaceKind): string => `/${kind}`;
