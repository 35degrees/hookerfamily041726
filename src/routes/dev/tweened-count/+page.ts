import type { PageLoad } from './$types';

type Stats = { total: number; thomasDescendants: number; talcottDescendants: number };

// Counts are computed at build time by regenerate-data.js and shipped as a tiny
// static file — the client never counts. See static/data/stats.json.
export const load: PageLoad = async ({ fetch }) => {
	const res = await fetch('/data/stats.json');
	const stats: Stats = await res.json();
	return { stats };
};
