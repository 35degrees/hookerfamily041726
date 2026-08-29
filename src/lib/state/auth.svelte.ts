/**
 * auth.svelte.ts — WHO IS SIGNED IN, and nothing else yet.
 *
 * DELIBERATELY THIN, and the previous project is why. Sam's `AuthManager.svelte.ts` was ~400 lines
 * and he rates the architecture as sound — correctly: a single class-based rune store is exactly how
 * this codebase already works (`search.svelte.ts`, `ascension.svelte.ts`, `stage.svelte.ts`). What
 * made it large was doing three jobs, and only one of them belongs here:
 *
 *   session state          -> here, and it is a VIEW of the library's store, not a copy (below)
 *   form fields            -> gone. Google-only means there is no form to hold state for
 *   modal open/closed      -> `modal.svelte.ts`. This app has ONE overlay slot; auth is a ModalKind,
 *                             not a second `showAuthModal` boolean running beside it
 *
 * NOT A SECOND SOURCE OF TRUTH. `authClient.useSession()` IS the session state — a nanostore the
 * library keeps current through sign-in, sign-out and refresh. This module SUBSCRIBES to it and
 * republishes it as runes so the rest of the app can read it the way it reads everything else. It
 * never writes a session, and it never caches a user object that could outlive the real one.
 * `modal.svelte.ts`'s own header forbids exactly this pattern and gives the reason: a copy of one
 * fact goes stale the moment something replaces it underneath.
 *
 * BOOKMARKS LAND HERE IN SLICE 3, beside the session and on the same principle: a client-side Set,
 * hydrated once, so that a star on a person card never turns that page into a server route. See
 * roadmap §50.0 — that boundary is the whole reason this feature does not touch the delivery model.
 */
import { browser } from '$app/environment';
import { authClient } from '$lib/auth-client';

type SessionUser = {
	id: string;
	name: string;
	email: string;
	image?: string | null;
	heroPersonId?: string | null;
};

/**
 * `isPending` STARTS TRUE, and that is load-bearing rather than tidy.
 *
 * The corner has to render before the session resolves. If pending read as "signed out", every
 * visit would flash "Sign In" and then swap to "Hi, Sam!" a beat later — the corner equivalent of
 * §30's "the stage must not move". `AuthTrigger` renders NOTHING while pending, so the word arrives
 * once, already correct.
 */
let snapshot = $state<{ user: SessionUser | null; isPending: boolean }>({
	user: null,
	isPending: true
});

if (browser) {
	// App-lifetime singleton, never torn down — the same shape every other state module here uses.
	// Deliberately not unsubscribed: there is no point at which this app stops caring who is signed in.
	authClient.useSession().subscribe((s) => {
		snapshot = { user: (s.data?.user as SessionUser) ?? null, isPending: s.isPending };
	});
}
/**
 * SSR STAYS PENDING, AND THE FIRST VERSION OF THIS GOT IT BACKWARDS.
 *
 * The obvious move is to render the signed-out shape on the server so "Sign In" is in the HTML
 * immediately. Measured 082926: that puts `auth-trigger` in the SSR'd markup, and then a SIGNED-IN
 * reader gets three states in a row — "Sign In" from the server, NOTHING once the client hydrates
 * with `isPending: true`, then "Hi, Sam!" when the session resolves. A word that appears, vanishes
 * and returns as a different word is far worse than one that arrives a beat late, and it is exactly
 * the flash the pending gate exists to prevent.
 *
 * Left pending, server and client agree on rendering nothing, there is no hydration mismatch, and
 * the label appears ONCE, already correct. The cost is that a signed-out visitor waits ~100ms to see
 * "Sign In" — invisible, where a swap is not. §30, the stage must not move, applied to two words.
 */

export const auth = {
	get user(): SessionUser | null {
		return snapshot.user;
	},
	get signedIn(): boolean {
		return snapshot.user !== null;
	},
	get isPending(): boolean {
		return snapshot.isPending;
	},
	/** Set in slice 4. Null means "no hero chosen" — `/` sends those readers to Thomas Hooker. */
	get heroPersonId(): string | null {
		return snapshot.user?.heroPersonId ?? null;
	},
	/**
	 * THE GREETING'S NAME. Google returns a full name in `name` ("Sam Hooker") and the corner wants
	 * "Hi, Sam!", so this takes the first token.
	 *
	 * A first token is not universally a given name, and this is knowingly the cheap version: it is a
	 * greeting, it is only ever seen by the person it names, and it is wrong in the direction of being
	 * slightly informal rather than incorrect. If it ever needs to be right — a user with a compound
	 * given name, or one who wants a different form — the fix is `mapProfileToUser` in `auth.ts`
	 * storing Google's `given_name` in its own field, NOT more parsing here.
	 */
	get greetingName(): string {
		const u = snapshot.user;
		if (!u) return '';
		const first = (u.name ?? '').trim().split(/\s+/)[0];
		return first || u.email.split('@')[0];
	}
};

/**
 * SIGN-IN RETURNS YOU WHERE YOU WERE, not to the site root.
 *
 * `callbackURL` is the CURRENT path, so a reader who signs in while looking at a card comes back to
 * that card. Sending them to `/` would be a navigation they did not ask for, and once slice 4 lands
 * it would be worse than that: `/` will branch to a hero, so signing in from a person page would
 * silently move you to a different person.
 *
 * TWO PROVIDERS, ONE FUNCTION. Adding a third is a third entry in `auth.ts` and a third button — the
 * shape does not change. (§18.1 originally ruled Google-only, with the trigger for a second provider
 * being "a real person who is blocked"; Sam overturned it on 082926 on audience grounds, which is
 * the better argument — see `auth.ts`.)
 */
type Provider = 'google' | 'microsoft';

async function signInWith(provider: Provider): Promise<void> {
	await authClient.signIn.social({ provider, callbackURL: window.location.pathname });
}

export async function signInWithGoogle(): Promise<void> {
	await signInWith('google');
}

export async function signInWithMicrosoft(): Promise<void> {
	await signInWith('microsoft');
}

export async function signOut(): Promise<void> {
	await authClient.signOut();
}
