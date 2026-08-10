/**
 * flightLock.ts — swallow navigation clicks while a warm flight is in progress.
 *
 * On a warm re-focus (CC/deck arrival, chip nav) the card is in motion and its parent/child roster is
 * hidden until the landing unfurl. A click during that window would launch an overlapping flight (or nav
 * off a card the user can't yet read). So warmPersonLinks LOCKS at the click that starts a nav and ignores
 * every further nav click until the incoming card LANDS with its chips extended — +page's landing effect
 * calls unlockFlight(). A safety timer guarantees the lock can never stick (missed landing / reduced motion).
 */
let locked = false;
let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * SUBSCRIBERS, added Aug 10 for the timeline rail. The lock was a boolean read on demand, which is all a
 * click handler needs — but the rail has to STYLE on it: a portrait must not expand while a flight is
 * running, and must expand the instant it ends if the pointer is still there (Sam). A pull-only flag
 * cannot drive that, and polling for it would be a second clock. Same publish/subscribe shape camera.ts
 * uses, so there is one idiom for "something changed" rather than two.
 */
const subs = new Set<(locked: boolean) => void>();

/** Called on every transition, immediately with the current value. Returns an unsubscribe. */
export function subscribeFlightLock(fn: (locked: boolean) => void): () => void {
	subs.add(fn);
	fn(locked);
	return () => subs.delete(fn);
}

function setLocked(next: boolean): void {
	if (locked === next) return;
	locked = next;
	for (const fn of subs) fn(locked);
}

export function isFlightLocked(): boolean {
	return locked;
}

export function lockFlight(maxMs = 2600): void {
	setLocked(true);
	if (timer) clearTimeout(timer);
	timer = setTimeout(() => {
		setLocked(false); // safety net: released even if the landing signal never fires
		timer = null;
	}, maxMs);
}

export function unlockFlight(): void {
	setLocked(false);
	if (timer) {
		clearTimeout(timer);
		timer = null;
	}
}
