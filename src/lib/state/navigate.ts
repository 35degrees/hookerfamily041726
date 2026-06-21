/**
 * Warm-path navigation — re-focus the featured person without a document
 * navigation (Step 2 of the page-transition work; DESIGN "Page transitions").
 *
 *   - focusPerson(slug): fetch + set featured state, then pushState the URL
 *     (SvelteKit shallow routing). No load re-run, no page unmount → the
 *     single-source `f` in +page.svelte just re-reads the new featured payload.
 *   - warmPersonLinks (action): delegates clicks on /person/<slug> links to the
 *     warm path for plain left-clicks, while leaving the <a href> intact for SEO,
 *     cold loads, middle-click, cmd/ctrl-click, and new-tab.
 *
 * popstate (back/forward) is reconciled in +page.svelte by watching the URL.
 */
import { pushState } from '$app/navigation';
import { featured } from './featured.svelte';
import { fetchFeatured } from '$lib/data/buildFeatured';
import {
	captureFlightOrigin,
	captureFlightKind,
	captureClicked,
	capturePanDir,
	capturePivot,
	captureRects,
	clearFlightCaptures
} from '$lib/transitions/flight';

/** Fetch a person and set them as featured. No history change. False if not found. */
export async function loadFeatured(slug: string): Promise<boolean> {
	const data = await fetchFeatured(slug);
	if (!data) return false;
	featured.set(data);
	return true;
}

/** Warm-path re-focus: set featured state, then pushState the URL (no document nav). */
export async function focusPerson(slug: string): Promise<void> {
	const ok = await loadFeatured(slug);
	if (!ok) {
		// Unknown/stale slug — fall back to a real navigation so the 404/redirect path runs.
		window.location.href = `/person/${slug}`;
		return;
	}
	pushState(`/person/${slug}`, {});
	// Clear the per-navigation flight captures one frame later — after the transition flush has
	// read them — so a subsequent back/forward nav (which captures nothing) can't reuse stale data.
	requestAnimationFrame(() => clearFlightCaptures());
}

const isModified = (e: MouseEvent) => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

/**
 * Svelte action: delegate clicks within `node` to the warm path when they land on
 * an internal /person/<slug> link. Plain left-clicks re-focus in place; everything
 * else (modified clicks, middle-click, target=_blank, download, non-person links)
 * falls through to the browser / SvelteKit default.
 */
export function warmPersonLinks(node: HTMLElement) {
	function onClick(event: MouseEvent) {
		if (event.defaultPrevented || event.button !== 0 || isModified(event)) return;
		const anchor = (event.target as Element | null)?.closest('a');
		if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
		const href = anchor.getAttribute('href');
		const match = href?.match(/^\/person\/([^/?#]+)$/);
		if (!match) return; // not an internal person link — leave it to the browser
		event.preventDefault();
		// Capture the clicked box's rect at CLICK time (outside any reactive effect) so the
		// card flies from its true on-screen position before any state change or reflow.
		captureFlightOrigin(anchor.getBoundingClientRect());
		// Tag the flight kind so the card picks the right speed: a clicked spouse chip is a
		// brisk in-corner swap; everything else (parent/child boxes, cross-links) travels at
		// the near-original parent/child speed.
		const relation = anchor.getAttribute('data-relation');
		captureFlightKind(relation === 'spouse' ? 'spouse' : 'relative');
		// BUG 1: remember which box was clicked so flyOut keeps it invisible — it's becoming the
		// featured card via the morph, and a second visible copy is the ghost. (No imperative hide
		// here: the clicked chip stays VISIBLE through the fetch, then the growFrom card — which
		// starts exactly on its rect, z-index above it — covers its spot, and flyOut takes it
		// invisible the same frame. Hiding it at click instead left its spot blank during the fetch.)
		captureClicked(anchor.closest('[data-flight-id]')?.getAttribute('data-flight-id') ?? null);
		// PIVOT: the focus we're LEAVING becomes a relative of the new focus; its box is where the
		// demoted card lands. Captured so the reveal can hold THAT box until landing while every
		// other incoming box reveals early (closing the bare-screen gap).
		capturePivot(featured.current?.person.id ?? null);
		// BUG 2: the clicked relation sets the whole scene's pan direction (parent→down, child→up,
		// spouse→lateral) — all leaving relatives flow that one way as the generations pan.
		capturePanDir(relation === 'parent' ? 'down' : relation === 'child' ? 'up' : 'lateral');
		// BUG 3: snapshot every relative box's rect NOW — before focusPerson changes state and the
		// rows reflow — so each leaver can pin itself out of flow at its true pre-reflow position.
		captureRects(node.querySelectorAll('[data-flight-id]'));
		void focusPerson(decodeURIComponent(match[1]));
	}
	node.addEventListener('click', onClick);
	return { destroy: () => node.removeEventListener('click', onClick) };
}
