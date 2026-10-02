/**
 * paths.ts — THE ONE PLACE THAT KNOWS WHAT A PERSON'S URL LOOKS LIKE (100226).
 *
 * A person lives at `/<slug>` — `hooker.com/thomas-hooker-1586`. It was `/person/<slug>` until
 * 100226, and that string had been written out by hand in ~25 places that BUILD links and four that
 * READ a slug back out of the address bar (the click handler's pattern, the Back/Forward handler, the
 * Ascension's door memory, the X's fallback). The readers are the dangerous half: a builder that is
 * missed produces a link that 301s and still works; a reader that is missed silently stops seeing
 * person URLs at all. So both directions live here, and nothing else spells the format.
 *
 * The OLD form still works forever: src/routes/person/[slug]/+page.ts 301s `/person/x` to `/x`.
 *
 * The PAYLOAD path is a different thing and did not move: `/data/person/<slug>.json` is the static
 * file the page fetches, never shown to a reader.
 */

/** The page URL for a person. */
export const personHref = (slug: string): string => `/${slug}`;

/**
 * TOP-LEVEL NAMES THAT ARE NOT PEOPLE. A person route at the root shares its namespace with every
 * other top-level route, and SvelteKit already resolves the conflict for PAGES (a named route beats
 * `[slug]`). This set is for the code that reads the address bar itself — the click handler above
 * all, which must never treat `/table` as a person and try to fly to it.
 *
 * ADD A NAME HERE WHEN A TOP-LEVEL ROUTE IS ADDED (an /about, a /sources). No slug can collide with
 * these today — slugs are `first-surname[-year]`, checked against all 27,790 payloads on 100226.
 */
const RESERVED = new Set(['api', 'data', 'dev', 'institution', 'person', 'table', 'textures']);

/** Slugs are lowercase letters, digits and dashes (regenerate-data.js slugify), never anything else. */
const PERSON_PATH = /^\/([a-z0-9][a-z0-9-]*)$/;

/** The person slug a pathname points at, or null when it is not a person URL. */
export function slugFromPath(pathname: string): string | null {
	const m = PERSON_PATH.exec(pathname);
	if (!m || RESERVED.has(m[1])) return null;
	return m[1];
}
