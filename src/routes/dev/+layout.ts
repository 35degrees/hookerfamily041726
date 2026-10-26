import { error } from '@sveltejs/kit';
import { dev } from '$app/env';

// DEVELOPMENT PAGES ONLY (Oct 26, SEO_PLAN §6.4). These are test benches — the intro's GPU, sweep and
// title, the tweened count — and they answered 200 on hookerverse.com, where Google judges a site by all of
// its pages. They stay in the code and in `npm run dev`; a production build answers 404.
export const load = () => {
	if (!dev) error(404, 'Not found');
};
