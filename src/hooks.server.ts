/**
 * hooks.server.ts — THE FIRST HOOK THIS APP HAS EVER HAD, and it stays this short.
 *
 * THIS IS A SCAR, NOT A PREFERENCE. The equivalent file on Sam's previous project grew four jobs —
 * Stripe raw-body handling, hand-written CORS patching, a devtools `.well-known` shim, and an
 * unconditional session fetch — and it is the single artefact he named as having cost weeks. Every
 * job added here is also a job the SvelteKit 3 migration pays for twice (§49.2), because this is one
 * of only three files importing server primitives.
 *
 * Each of those four has a named replacement rather than a home here:
 *   - CORS            → deleted by `baseURL.allowedHosts`, which feeds `trustedOrigins` (auth.ts)
 *   - host redirects  → Vercel's EDGE, never app code (DEPLOYMENT §18.4)
 *   - session on locals → lazy, see below
 *   - Stripe          → a first-party plugin if it ever lands; needs nothing built now
 *
 * WHY THERE IS NO `auth.api.getSession()` CALL HERE, against Better Auth's own SvelteKit example.
 *
 * The documented pattern resolves the session in `handle` on EVERY request. For this app that is
 * waste with a hard number attached: person pages never need a session — the bookmark star reads a
 * client-side rune store — so the documented pattern would put a session resolution in front of all
 * 19,728 person pages in order to serve two routes.
 *
 * Instead `event.locals.getSession()` is LAZY: only `/` (the intro-vs-hero branch, §50.3) and the
 * bookmark endpoints call it, and it memoises so two calls in one request cost one resolution.
 *
 * THE LAW THIS PROTECTS, because it will be broken by accident rather than on purpose: `/` is the
 * only route that may be dynamic; everything under `/person/` stays static CDN payloads (§50.0,
 * §18.2). The moment a person page's load calls this, 19,728 static payloads become serverless
 * invocations — for a star icon — and §3's Option A is gone. Nothing in the app would notice; the
 * probe in slice 3 is the only instrument that can see it.
 */
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	let cached: Awaited<ReturnType<typeof auth.api.getSession>> | undefined;
	event.locals.getSession = async () => {
		if (cached === undefined) {
			cached = await auth.api.getSession({ headers: event.request.headers });
		}
		return cached;
	};

	return svelteKitHandler({ event, resolve, auth, building });
};
