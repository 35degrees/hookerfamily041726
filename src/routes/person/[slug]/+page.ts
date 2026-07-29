import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { buildFeatured, type PersonPayload } from '$lib/data/buildFeatured';

// Cold-load path: fetch the single self-contained payload (see DATA ARCHITECTURE)
// and resolve it through the shared builder. The warm path (focusPerson) uses the
// same builder, so both produce identical FeaturedData.
export const load: PageLoad = async ({ params, fetch }) => {
	let res: Response;
	try {
		res = await fetch(`/data/person/${params.slug}.json`);
	} catch {
		// The dev server resolves a static asset by reading it off disk and THROWS ENOENT when it
		// is missing, rather than returning a 404 response — so the miss escapes the res.ok check
		// below and surfaces as a 500 server error. Severed people (classification.hidden) have no
		// payload by design and are now the common case for this: they must read as NOT FOUND, not
		// as something broken. Production serves the file statically and returns a real 404, which
		// the res.ok line already handles; this makes dev agree with it.
		throw error(404, 'Person not found');
	}
	if (!res.ok) throw error(404, 'Person not found');
	const payload: PersonPayload = await res.json();
	return buildFeatured(payload);
};
