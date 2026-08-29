/**
 * The Better Auth handler mount — the third and last file in this app that touches server
 * primitives (§50.1).
 *
 * `svelteKitHandler` in `hooks.server.ts` already intercepts `/api/auth/*` before routing, so this
 * file is a belt-and-braces mount rather than the sole path: it makes the route EXIST in the router,
 * which is what keeps SvelteKit from treating a sign-in callback as a 404 during prerendering and
 * what makes the endpoint visible to anyone reading the route tree. Better Auth handles the whole
 * subtree — sign-in, the OAuth callback, session, sign-out — from this one catch-all.
 *
 * NOT PRERENDERED, and it must never be: this is the app's only compute surface besides `/`.
 *
 * Verify with `GET /api/auth/ok` → `{"status":"ok"}`. That is the end of slice 1.
 */
import { auth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const prerender = false;

const handler: RequestHandler = ({ request }) => auth.handler(request);

export const GET = handler;
export const POST = handler;
