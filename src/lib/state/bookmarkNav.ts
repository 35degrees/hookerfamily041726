/**
 * bookmarkNav.ts — turning a bookmark row into an ARRIVAL.
 *
 * Design §45.16: "a pick is an arrival, not a navigation", and the doctrine under it — **a new
 * surface should terminate in an existing transition, not a new one.** The CC arrival, the orbit
 * descent and the founder green were all built and tuned long before bookmarks existed; this
 * feature's job is to feed them, not to invent a fifth way to arrive.
 *
 * SHARED BY THE HOVER MENU AND THE MODAL, and that is allowed under §46.2. The law there forbids
 * sharing anything that RENDERS — a panel, a row, a veil, a schedule. This has no DOM of its own: it
 * synthesises an anchor, hands it to the delegated handler every link in the app already uses, and
 * throws it away. Two surfaces calling one navigation helper is the same category as both reading
 * `kin.ts`.
 *
 * It is lifted from `SearchModal.pick()` rather than imported from it, because that function also
 * does search's own housekeeping — `remember()`, `clear()`, its exit choreography — none of which
 * belongs to a bookmark.
 */
import { closeModal } from '$lib/state/modal.svelte';

/**
 * @param slug   the person's CURRENT slug, resolved from their id at render time (§50.2 — bookmarks
 *               store ids, never slugs, because slug churn is permanent)
 * @param orbit  whether the target is an orbit figure, so the arrival descends into the zone
 */
export function arriveAtPerson(slug: string, orbit: boolean): void {
	closeModal();

	/**
	 * THE ANCHOR IS SYNTHESISED AT THE FEATURED CARD'S RECT, exactly as search does it: the flight
	 * needs an origin, and the card the reader is looking at is the honest one. Falling back to the
	 * stage keeps it working on a page where no card has landed yet.
	 */
	const stage = document.querySelector('.page-container') ?? document.body;
	const card = document.querySelector('.featured-card');
	const r = (card ?? stage).getBoundingClientRect();

	const a = document.createElement('a');
	a.href = `/person/${slug}`;
	a.dataset.cc = 'true';
	/**
	 * SET ONLY WHEN TRUE, NEVER `'false'`. `navigate.ts` carries a scar about exactly this: an absent
	 * attribute read as a meaningful false once killed the core transition. `warmPersonLinks` derives
	 *   ascend = toOrbit === fromOrbit ? null : toOrbit ? 1 : -1
	 * so the presence of the flag is the entire handoff — and it makes the reverse free, since
	 * picking an ordinary person while standing on Lincoln reads as ascending OUT.
	 */
	if (orbit) a.dataset.orbit = 'true';

	a.style.position = 'fixed';
	a.style.left = `${r.left}px`;
	a.style.top = `${r.top}px`;
	a.style.width = `${r.width}px`;
	a.style.height = `${r.height}px`;
	a.style.pointerEvents = 'none';
	a.style.opacity = '0';
	document.body.appendChild(a);
	a.click();
	a.remove();
}
