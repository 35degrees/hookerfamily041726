import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import type { PageLoad } from './$types';

type Stats = { total: number; thomasDescendants: number; talcottDescendants: number };

// Counts are computed at build time by regenerate-data.js and shipped as a tiny
// static file — the client never counts. See static/data/stats.json.
export const load: PageLoad = async ({ fetch }) => {
	// The layout's production 404 runs beside this load, not before it — and stats.json is local-only
	// now (regenerate-data.js LOCAL_ONLY), so without its own gate this would fail as a 500 instead.
	if (!dev) error(404, 'Not found');
	const res = await fetch('/data/stats.json');
	const stats: Stats = await res.json();
	return { stats };
};
