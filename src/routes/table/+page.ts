import { error } from '@sveltejs/kit';
import { dev } from '$app/env';

// THE ZOOM 2 PROTOTYPE IS LOCAL UNTIL IT IS A FEATURE (Oct 26, Sam; SEO_PLAN §11.8). Unlinked but public,
// and it needed the whole table-index.json — every person's name, years and seat — published for it. The
// page stays in the code and in `npm run dev` (where regenerate-data.js still writes the file); a
// production build answers 404 and the file is no longer built there.
export const load = () => {
	if (!dev) error(404, 'Not found');
};
