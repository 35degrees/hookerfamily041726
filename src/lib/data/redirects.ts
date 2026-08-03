/**
 * redirects.ts — the 301 resolver for retired person slugs (roadmap Phase 2.5, item 2).
 *
 * regenerate-data.js has always emitted static/data/redirects.json ({ oldSlug|oldId -> currentSlug }),
 * and until now NOTHING read it: every renamed slug 404'd, so any link equity a URL had earned died
 * with the rename. Slug renames are routine here — a birth year gets filled, a name is corrected
 * (Krebs→Crebs, Alvin→Alvan), a married name lands — and the file is at 673 entries and growing.
 *
 * THE ORDER MATTERS: the caller tries the PAYLOAD first and only asks here on a miss. That is not an
 * optimization, it is the correctness rule — the generated map contains keys that are also LIVE slugs
 * (three today: john-newton-1726, mary-hooker-1796, harriet-newton-1866, where a retired slug was later
 * re-issued to a different person by the collision rule), plus 36 self-redirects. Payload-first means a
 * live page always wins and can never be redirected away from itself. It also keeps the happy path free:
 * redirects.json is fetched only when a slug misses, never on a normal page load.
 *
 * Chains are followed (11 keys point at another key today) with a hop cap and a cycle guard, so the
 * visitor gets ONE 301 to the final slug rather than a bounce chain.
 */

const MAX_HOPS = 6; // deeper than any real chain (longest today is 2); the guard, not the expectation

type RedirectMap = Record<string, string>;
let cache: Promise<RedirectMap> | null = null;

/** Load + memoize the map. Build output, immutable per deploy — safe to hold module-level. */
function loadMap(fetchFn: typeof fetch): Promise<RedirectMap> {
	cache ??= (async () => {
		try {
			const res = await fetchFn('/data/redirects.json');
			if (!res.ok) return {};
			return (await res.json()) as RedirectMap;
		} catch {
			// Same dev-server ENOENT throw the payload fetch guards against. A missing map must degrade
			// to "no redirect known" (a clean 404), never to a 500.
			return {};
		}
	})();
	return cache;
}

/**
 * The current slug for a retired one, or null if this slug is not a known rename.
 * Never returns the input (a self-redirect is not a redirect) and never returns a cycle.
 */
export async function resolveRedirect(fetchFn: typeof fetch, slug: string): Promise<string | null> {
	if (!slug) return null;
	const map = await loadMap(fetchFn);
	const seen = new Set([slug]);
	let cur = slug;
	for (let hop = 0; hop < MAX_HOPS; hop++) {
		const next = map[cur];
		if (!next || next === cur) break; // end of chain, or a self-redirect
		if (seen.has(next)) return null; // cycle — refuse rather than bounce
		seen.add(next);
		cur = next;
	}
	return cur === slug ? null : cur;
}
