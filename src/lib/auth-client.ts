/**
 * auth-client.ts — the browser half. Imported by components; never by anything under
 * `src/lib/server/`.
 *
 * NO `baseURL` HERE, DELIBERATELY. Sam's previous client pinned `baseURL: envConfig.app.url`, which
 * is the client-side half of the same single-string mistake that cost weeks on apex-vs-`www`
 * (§18.4): a hard-coded origin is wrong on every host that is not the one it was written for —
 * localhost, a Vercel preview, and whichever of apex/`www` lost the coin toss. Omitted, the client
 * calls `/api/auth/*` RELATIVE to wherever the page is actually being served, which is correct on
 * all of them without being told.
 *
 * `inferAdditionalFields` is what makes `session.user.heroPersonId` a real typed string rather than
 * an untyped bag — it reads the server instance's type, so the column declared once in `auth.ts`
 * (§50.2) reaches the client without being re-declared and cannot drift from it.
 *
 * `useSession()` IS THE SESSION STATE. `auth.svelte.ts` (slice 2) wraps this and adds bookmarks; it
 * does NOT copy the session into its own field. `modal.svelte.ts`'s header comment already forbids
 * that pattern in this codebase and gives the reason — a second source of truth for one fact, going
 * stale the moment anything replaces it underneath.
 */
import { createAuthClient } from 'better-auth/svelte';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import type { auth } from '$lib/server/auth';

export const authClient = createAuthClient({
	plugins: [inferAdditionalFields<typeof auth>()]
});

export const { signIn, signOut, useSession } = authClient;
