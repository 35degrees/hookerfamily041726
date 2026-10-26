import { error } from '@sveltejs/kit';
import { dev } from '$app/env';

// A PLACEHOLDER, NOT A PAGE (Oct 26, Sam; SEO_PLAN §11.8). Every /institution/<anything> answered 200 with
// a page reading only "Sam" — a thin page per slug, as many as anyone cared to type. Production answers 404
// until institution pages are a real feature; the route stays for that day.
export const load = () => {
	if (!dev) error(404, 'Not found');
};
