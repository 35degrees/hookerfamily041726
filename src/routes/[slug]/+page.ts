import { error, redirect } from '@sveltejs/kit';
import { dataUrl } from '#lib/paths.js';
import type { PageLoad } from './$types';
import { buildFeatured, type PersonPayload } from '#lib/data/buildFeatured.js';
import { resolveRedirect } from '#lib/data/redirects.js';
import { personHref } from '#lib/paths.js';
import { SURFACES, isSurface } from '#lib/surfaces.js';

// Cold-load path: fetch the single self-contained payload (see DATA ARCHITECTURE)
// and resolve it through the shared builder. The warm path (focusPerson) uses the
// same builder, so both produce identical FeaturedData.
export const load: PageLoad = async ({ params, fetch, setHeaders }) => {
	// A POP-UP'S OWN ADDRESS (/privacy, /sources, /contact — surfaces.ts): the host card, with the pop-up
	// named so the page renders it open. Checked before any payload, and no person can hold these names
	// (paths.ts RESERVED).
	const surface = isSurface(params.slug) ? params.slug : null;
	const slug = surface ? SURFACES[surface].host : params.slug;
	let res: Response | null = null;
	try {
		res = await fetch(dataUrl(`/data/person/${slug}.json`));
	} catch {
		// The dev server resolves a static asset by reading it off disk and THROWS ENOENT when it
		// is missing, rather than returning a 404 response — so the miss escapes the res.ok check
		// below and surfaces as a 500 server error. Severed people (classification.hidden) have no
		// payload by design and are now the common case for this: they must read as NOT FOUND, not
		// as something broken. Production serves the file statically and returns a real 404, which
		// the res.ok line already handles; this makes dev agree with it.
		res = null;
	}
	if (!res || !res.ok) {
		// MISS → is this a RETIRED slug? Renames are routine here (a birth year filled, a name
		// corrected, a married name landing), and redirects.json records every one. Payload-FIRST is
		// the correctness order, not an optimization: some retired slugs have since been re-issued to
		// a different person, and a live page must always win over the map (see resolveRedirect).
		const current = await resolveRedirect(fetch, slug);
		// A host card that has been renamed: the pop-up keeps its address and simply opens over the host's
		// current card (a redirect to /privacy would be a loop).
		if (current && surface) res = await fetch(dataUrl(`/data/person/${current}.json`)).catch(() => null);
		else if (current) throw redirect(301, personHref(current));
		if (!res || !res.ok) throw error(404, 'Person not found');
	}
	const payload: PersonPayload = await res.json();
	// THE EDGE CACHE (SEO_PLAN §7, step 7): Vercel's CDN keeps this page's HTML for an hour and serves it stale for
	// up to a day while it refreshes in the background, so a reader or crawler gets a cached copy and the server
	// function runs about once an hour per page instead of once per visit. SAFE ONLY BECAUSE A PERSON PAGE IS THE
	// SAME FOR EVERYONE — no session read, no cookie (scripts/probe-static-contract.mjs guards that). Every deploy
	// starts a fresh cache, and the data only changes with a deploy. Set here, after the payload is in hand, so a
	// 404 or a redirect is never cached; a no-op in the browser.
	setHeaders({ 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' });
	return { ...buildFeatured(payload), surface };
};
