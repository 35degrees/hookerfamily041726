/**
 * photo.ts — on-the-fly Cloudinary resizing for PERSON photos.
 *
 * There is one photo per person (no small/large variants on disk), sized down to ≤500 KB — but a 60 px chip
 * loading a 100–500 KB original is what makes the baseball-card illusion break (you watch it paint in). For
 * Cloudinary-hosted photos we insert a transform after `/upload/` so Cloudinary serves a chip- or card-sized
 * image (a ~200 px chip is ~10 KB, effectively instant). Non-Cloudinary hosts (Wikimedia, etc.) are returned
 * unchanged — they still load eager + high-priority, just at full size.
 *
 * PERSON-PHOTO LOADING DOCTRINE (2026-07): person photos (chips + featured) load EAGER at fetchpriority
 * HIGH — they must be on screen the instant the card is, so a chip never paints top-to-bottom. Media
 * thumbnails (landmark/art/statue) and their hover-enlarge popouts are a LOWER load scale (lazy / on-demand)
 * and must never contend with person photos for the connection pool.
 */
export function cldSize(url: string | null | undefined, transform: string): string | null {
	if (!url) return null;
	return url.includes('res.cloudinary.com') && url.includes('/upload/')
		? url.replace('/upload/', `/upload/${transform}/`)
		: url;
}

import type { Neighborhood, PersonCompact } from '$lib/types/neighborhood';

// Warm EVERY person photo in a neighborhood as one high-priority batch, the moment the neighborhood is known
// (client-only). A neighborhood is a complete, finite set delivered in ONE payload — focus, spouses + their
// children, parents, grandparents, grandchildren, and every sibling tier — so their photos belong together,
// warmed together. On a warm nav this fires as soon as the incoming payload is fetched (well before the
// flight lands), so a chip is a cache hit whether it renders on screen, off screen, inside a collapsed panel,
// or is promoted to featured on the NEXT nav (a grandchild here becomes a child there — already loaded). Same
// derivative the chips render (PHOTO_TRANSFORM) → the <img> is served from cache. This is a FOUNDATIONAL load:
// person photos own the connection pool; media (landmark/art/statue) thumbnails and popouts are a lower scale.
export function preloadNeighborhood(n: Neighborhood | null | undefined): void {
	if (!n || typeof Image === 'undefined') return;
	// PRIMARY — the chips ON SCREEN the instant the card lands: the featured portrait, the NOTCH spouses, the
	// parents row, and the children rows. Order matters — these are warmed FIRST at HIGH priority so a
	// promoted card's spouse/parent/child chips win the connection pool and are never caught mid-load (the
	// spouse chip especially: an unseen in-law is a first-time Cloudinary derivative, and it used to sit at
	// the BACK of the queue behind every off-screen grandchild — this is the fix).
	const primary: (PersonCompact | null | undefined)[] = [n.focus];
	for (const s of n.spouses ?? []) primary.push(s.spouse);
	primary.push(n.parents?.father, n.parents?.mother);
	for (const s of n.spouses ?? []) for (const c of s.children ?? []) primary.push(c);
	// SECONDARY — off screen or behind a panel: grandparents, grandchildren, every sibling tier. Still warmed
	// (a grandchild here is a child on the next nav — already loaded), but at LOW priority behind primary.
	const secondary: (PersonCompact | null | undefined)[] = [
		n.grandparents?.paternal?.father,
		n.grandparents?.paternal?.mother,
		n.grandparents?.maternal?.father,
		n.grandparents?.maternal?.mother,
		...(n.grandchildren ?? []),
		...(n.siblings?.full ?? []),
		...(n.siblings?.half ?? []),
		...(n.siblings?.step ?? [])
	];
	const seen = new Set<string>();
	const warm = (list: (PersonCompact | null | undefined)[], priority: 'high' | 'low') => {
		for (const p of list) {
			const url = cldSize(p?.p, PHOTO_TRANSFORM);
			if (!url || seen.has(url)) continue;
			seen.add(url);
			const img = new Image();
			try {
				(img as unknown as { fetchPriority: string }).fetchPriority = priority;
			} catch {
				/* older browsers: no fetchPriority — still an eager cache warm */
			}
			img.src = url;
		}
	};
	warm(primary, 'high'); // on-screen chips first
	warm(secondary, 'low'); // off-screen fills in behind them
}

// ONE derivative for a person's photo everywhere it appears — chip, featured display, and hover-zoom —
// so it loads EXACTLY ONCE and every later use is a cache hit (no second fetch when a chip promotes to
// featured; no third when you hover-zoom). Using different sizes per surface was the regression: the chip's
// w_200 couldn't serve the featured's w_700, so the photo visibly loaded twice AND each size was a separate
// first-time Cloudinary generation. w_600 covers the ~200px featured display AND the ~2× (≈400px) zoom with
// margin, and downscales cleanly into the ~60px chip (aspect preserved; the chip's object-cover object-top
// does the square top-crop client-side). ~40–60 KB vs the ~450 KB original — c_limit never upscales a small
// source; q_auto/f_auto pick smart quality + webp/avif.
export const PHOTO_TRANSFORM = 'w_600,c_limit,q_auto,f_auto';
