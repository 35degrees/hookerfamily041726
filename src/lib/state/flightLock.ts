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

export function isFlightLocked(): boolean {
	return locked;
}

export function lockFlight(maxMs = 2600): void {
	locked = true;
	if (timer) clearTimeout(timer);
	timer = setTimeout(() => {
		locked = false;
		timer = null;
	}, maxMs); // safety net: released even if the landing signal never fires
}

export function unlockFlight(): void {
	locked = false;
	if (timer) {
		clearTimeout(timer);
		timer = null;
	}
}
