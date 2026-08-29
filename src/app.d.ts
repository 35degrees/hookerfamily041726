// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { auth } from '$lib/server/auth';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/**
			 * LAZY session read, memoised per request — set in `hooks.server.ts`.
			 *
			 * It is a FUNCTION rather than a resolved `locals.session` value on purpose. A resolved
			 * field would have to be populated in the hook on every request, which is the pattern
			 * `hooks.server.ts` explains at length that this app is not adopting: it would put a
			 * session resolution in front of all 19,728 static person pages to serve two routes.
			 *
			 * ONLY `/` AND THE BOOKMARK ENDPOINTS MAY CALL THIS. A person page that calls it converts
			 * the corpus from static CDN payloads into serverless invocations (§50.0, §18.2), and
			 * nothing in the app would report that it had happened.
			 */
			getSession: () => Promise<Awaited<ReturnType<typeof auth.api.getSession>>>;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
