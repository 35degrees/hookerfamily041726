/**
 * /person/<slug> — THE OLD ADDRESS, KEPT ALIVE FOREVER (Sam, 100226: "redirect forever is ok if it
 * costs nothing").
 *
 * People moved to the root on 100226 (`/thomas-hooker-1586`, see $lib/paths.ts). Every link written
 * before that — a bookmark, a shared URL, a search result, a probe — still says `/person/...`, so this
 * answers it with a permanent 301 to the new address and nothing else.
 *
 * UNIVERSAL, NOT `+page.server.ts`, and that is the static contract (scripts/probe-static-contract.mjs):
 * a server file here would make this a serverless route. A universal load redirects during SSR and on
 * the client alike, reads no session, and costs nothing. Retired slugs are not resolved here — the new
 * route's own loader does that on arrival, so a redirect never has to know about the redirect map.
 */
import { redirect } from '@sveltejs/kit';
import { personHref } from '#lib/paths.js';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params, url }) => {
	redirect(301, personHref(params.slug) + url.search);
};
