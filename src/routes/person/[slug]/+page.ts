import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { buildFeatured, type PersonPayload } from '$lib/data/buildFeatured';

// Cold-load path: fetch the single self-contained payload (see DATA ARCHITECTURE)
// and resolve it through the shared builder. The warm path (focusPerson) uses the
// same builder, so both produce identical FeaturedData.
export const load: PageLoad = async ({ params, fetch }) => {
	const res = await fetch(`/data/person/${params.slug}.json`);
	if (!res.ok) throw error(404, 'Person not found');
	const payload: PersonPayload = await res.json();
	return buildFeatured(payload);
};
