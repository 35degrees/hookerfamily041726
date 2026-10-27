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
	if (url.startsWith(CLD_ORIGIN)) return `${CLD_PROXY}${transform}/${url.slice(CLD_ORIGIN.length)}`;
	return url.includes('res.cloudinary.com') && url.includes('/upload/')
		? url.replace('/upload/', `/upload/${transform}/`)
		: url;
}

// OUR Cloudinary account's photos are served through hookerverse.com's own address, `/cld/…`, which
// vercel.json rewrites to this origin and caches at Vercel's edge (Oct 26, SEO_PLAN §0.3): Cloudinary's free
// plan counts every byte it serves (13.4 of its 25 monthly credits were bandwidth), while Vercel's CDN serves
// a cached copy out of Pro's 1 TB. Same derivative, same bytes — only the address changes. The dev and
// preview servers proxy `/cld` the same way (vite.config.ts). Any other host passes through untouched.
const CLD_ORIGIN = 'https://res.cloudinary.com/dc5clrqtw/image/upload/';
const CLD_PROXY = '/cld/';

/** The same `/cld/` address with NO transform — for images used at their original bytes (the timeline rail's
 *  anchor portraits, which load on every card for every visitor). Requests no new Cloudinary derivative. */
export function cldProxy(url: string): string {
	return url.startsWith(CLD_ORIGIN) ? CLD_PROXY + url.slice(CLD_ORIGIN.length) : url;
}

import type { Neighborhood, PersonCompact } from '#lib/types/neighborhood.js';

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

// Warm the photos of every person this card CROSS-CONNECTS to — the people a CC click (or the blade's
// hover) is about to promote to featured. They are not in the neighborhood, so preloadNeighborhood never
// fetched them, and the photo used to start downloading only at the click: a first-time Cloudinary fetch
// takes 0.6–1s and the CC deck lands at ~0.76s, so the card arrived blank and the photo popped in after it
// settled (measured in Sam's Safari, whose cache was new — and true for every first-time visitor). LOW
// priority and called AFTER the card has landed, so it never contends with the neighborhood's chips; same
// derivative the featured card renders (PHOTO_TRANSFORM), so the later <img> is a cache hit. A hub's links
// are warmed once per session (the set), not again on every return.
const warmedCc = new Set<string>();
export function warmCrossConnections(
	list: { p?: string | null; co?: { p?: string | null } | null }[] | null | undefined
): void {
	if (!list || typeof Image === 'undefined') return;
	for (const cc of list) {
		for (const raw of [cc?.p, cc?.co?.p]) {
			const url = cldSize(raw, PHOTO_TRANSFORM);
			if (!url || warmedCc.has(url)) continue;
			warmedCc.add(url);
			const img = new Image();
			try {
				(img as unknown as { fetchPriority: string }).fetchPriority = 'low';
			} catch {
				/* no fetchPriority — still a cache warm */
			}
			img.src = url;
		}
	}
}

// Warm the photos on this card's PATHS TO THOMAS ladder the moment the reader reaches for the button — pointer
// over it, a finger down on it, or keyboard focus (Oct 27, Sam: non-notable rungs "flash into view after the
// holding element is on the screen"). The rungs are ancestors back to Thomas, outside the neighborhood, so
// nothing had fetched them; since the f_webp switch (Oct 26) an unseen one is also a first-time Cloudinary
// derivative (~0.5 s). Starting them on intent rather than on the click gives that fetch the reach-and-click
// time as a head start, and only for readers who are about to open the ladder — no Cloudinary cost on a card
// whose button is never touched. HIGH priority: this is what the reader asked for next. Same derivative the
// rungs render (PHOTO_TRANSFORM); once per session per photo, like warmCrossConnections.
const warmedLadder = new Set<string>();
export function warmLadder(paths: { p?: string | null }[][] | null | undefined): void {
	if (!paths || typeof Image === 'undefined') return;
	for (const path of paths) {
		for (const person of path) {
			const url = cldSize(person?.p, PHOTO_TRANSFORM);
			if (!url || warmedLadder.has(url)) continue;
			warmedLadder.add(url);
			const img = new Image();
			try {
				(img as unknown as { fetchPriority: string }).fetchPriority = 'high';
			} catch {
				/* no fetchPriority — still a cache warm */
			}
			img.src = url;
		}
	}
}

// ONE derivative for a person's photo everywhere it appears — chip, featured display, and hover-zoom —
// so it loads EXACTLY ONCE and every later use is a cache hit (no second fetch when a chip promotes to
// featured; no third when you hover-zoom). Using different sizes per surface was the regression: the chip's
// w_200 couldn't serve the featured's w_700, so the photo visibly loaded twice AND each size was a separate
// first-time Cloudinary generation. w_600 covers the ~200px featured display AND the ~2× (≈400px) zoom with
// margin, and downscales cleanly into the ~60px chip (aspect preserved; the chip's object-cover object-top
// does the square top-crop client-side). ~40–60 KB vs the ~450 KB original — c_limit never upscales a small
// source; q_auto picks smart quality.
// f_webp, NOT f_auto (Oct 26): f_auto answers each browser with a different format (JPEG XL to Safari, WebP to
// Chrome, JPEG to anything vague) and marks the response `Vary: Accept, User-Agent`. Measured on a preview
// deploy, Vercel's edge cache (the `/cld/` proxy above) does not keep those apart — Chrome was served a bot's
// cached JPEG — so a Safari-first JPEG XL could reach Chrome, which cannot draw it. One fixed format every
// browser displays makes the cached copy correct for everyone.
export const PHOTO_TRANSFORM = 'w_600,c_limit,q_auto,f_webp';
