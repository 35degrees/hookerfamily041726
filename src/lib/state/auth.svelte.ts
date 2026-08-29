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
	list1Name?: string | null;
	list2Name?: string | null;
};

/** 1 = gold, 2 = powder blue, null = not bookmarked. The ribbon's three states, and the only
 *  vocabulary the whole feature needs. */
export type ListId = 1 | 2;

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

/**
 * THE BOOKMARK SET, CLIENT-SIDE, AND THIS IS THE WHOLE REASON PERSON PAGES STAY STATIC.
 *
 * The obvious way to render a bookmark ribbon is to read the session in the page's `load` and hand
 * the card its own state. That would convert 19,728 static CDN payloads into serverless invocations
 * for an icon (§50.0, DEPLOYMENT §18.2), and nothing in the app would report that it had happened.
 *
 * So: the entire set is fetched ONCE per session, held here, and every card asks this Map rather
 * than the server. A personal bookmark list is tens of rows — the whole thing is smaller than one
 * person payload, and it makes the ribbon answer instantly on every card including ones the reader
 * has not visited yet.
 */
let marks = $state<Map<string, ListId>>(new Map());
let marksLoaded = $state(false);

async function hydrateBookmarks() {
	try {
		const res = await fetch('/api/bookmarks');
		if (!res.ok) return;
		const data = (await res.json()) as { bookmarks: { personId: string; list: ListId }[] };
		marks = new Map(data.bookmarks.map((b) => [b.personId, b.list]));
		marksLoaded = true;
	} catch {
		/* A failed hydrate leaves the ribbons blank rather than wrong. The next sign-in retries. */
	}
}

if (browser) {
	// App-lifetime singleton, never torn down — the same shape every other state module here uses.
	// Deliberately not unsubscribed: there is no point at which this app stops caring who is signed in.
	let lastUserId: string | null = null;
	authClient.useSession().subscribe((s) => {
		const user = (s.data?.user as SessionUser) ?? null;
		snapshot = { user, isPending: s.isPending };

		/**
		 * HYDRATE ON THE TRANSITION, NOT ON EVERY EMISSION. This store fires on refreshes and focus
		 * events as well as on sign-in, and re-fetching the whole set each time would be a request
		 * per tab focus — the same shape of waste as the previous project's write-per-session-read,
		 * one layer up. Keyed on the user id changing, so a sign-out then sign-in as someone ELSE
		 * correctly reloads rather than showing the previous person's saved ancestors.
		 */
		const id = user?.id ?? null;
		if (id === lastUserId) return;
		lastUserId = id;
		marks = new Map();
		marksLoaded = false;
		if (id) void hydrateBookmarks();
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
	},

	/** Which list a person is in, or null. The ribbon's entire question. */
	listFor(personId: string): ListId | null {
		return marks.get(personId) ?? null;
	},
	get marksLoaded(): boolean {
		return marksLoaded;
	},
	/** Newest first — the hover menu's "last five added" reads straight off this. */
	get bookmarkCount(): number {
		return marks.size;
	},
	/**
	 * THE LIST'S NAME, WITH THE FALLBACK IN ONE PLACE. Null in the database means "never renamed",
	 * so the default lives here rather than being written into the row — which keeps a renamed list
	 * distinguishable from an untouched one and keeps English out of the data.
	 */
	listName(list: ListId): string {
		const u = snapshot.user;
		const custom = list === 1 ? u?.list1Name : u?.list2Name;
		return (custom ?? '').trim() || `List ${list}`;
	},
	get isHero(): (personId: string) => boolean {
		return (personId: string) => !!snapshot.user?.heroPersonId && snapshot.user.heroPersonId === personId;
	}
};

/**
 * OPTIMISTIC, AND UN-AWAITED — because Neon sleeps.
 *
 * Scale-to-zero suspends the compute after 5 minutes idle, so the first write after a quiet spell
 * pays ~0.5–1s to wake it. If the ribbon waited for the server, that click would feel broken. So the
 * local Map changes first, the card re-renders immediately, and the request goes out behind it.
 *
 * ON FAILURE THE OPTIMISM IS ROLLED BACK, which is the half that makes this honest rather than
 * merely fast: a ribbon that stays gold after the write failed is a lie the user will not discover
 * until their list is short one ancestor.
 */
export async function setBookmark(personId: string, list: ListId | null): Promise<void> {
	const previous = marks.get(personId) ?? null;
	const next = new Map(marks);
	if (list === null) next.delete(personId);
	else next.set(personId, list);
	marks = next;

	try {
		const res = await fetch('/api/bookmarks', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ personId, list })
		});
		if (!res.ok) throw new Error(String(res.status));
	} catch {
		const rollback = new Map(marks);
		if (previous === null) rollback.delete(personId);
		else rollback.set(personId, previous);
		marks = rollback;
	}
}

/**
 * SETTING A HERO IS NOT OPTIMISTIC, and that is deliberate.
 *
 * Unlike a bookmark, this DESTROYS the previous value — and the caller needs to know what it was in
 * order to say so. Returning `previousPersonId` from the server is what lets the confirmation name
 * the person being replaced rather than asking "Proceed?" about nothing in particular, and what lets
 * a cancelled confirmation still leave the reader knowing what they had.
 */
export async function setHero(personId: string | null): Promise<{ previousPersonId: string | null }> {
	const res = await fetch('/api/hero', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ personId })
	});
	if (!res.ok) throw new Error(`hero update failed: ${res.status}`);
	const data = (await res.json()) as { previousPersonId: string | null };
	// The session store carries `heroPersonId`, so refresh it rather than patching a local copy —
	// same rule as everywhere else here: one source of truth for one fact.
	await authClient.getSession({ query: { disableCookieCache: true } });
	return data;
}

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
