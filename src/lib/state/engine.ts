/**
 * engine.ts — marks the page when it runs on WebKit (Safari, and every browser on iPhone/iPad), so the
 * few WebKit-only workarounds can be scoped to it in CSS (`html.webkit …`) and Chrome is never touched.
 *
 * Detected by ENGINE, not brand: on iOS, Chrome (CriOS), Firefox (FxiOS) and Edge (EdgiOS) are all
 * WebKit underneath and inherit the same compositor, so they get the same workarounds. Desktop Chrome,
 * Edge and Opera carry "AppleWebKit" in their user agent for history's sake but are Blink — excluded.
 *
 * DEV OVERRIDE for A/B testing (100226): `?webkit=off` removes the mark in Safari, `?webkit=on` forces it
 * in Chrome. Development builds only.
 */
/** True on WebKit (with the dev override applied). Safe to call before markEngine has run — child
 *  components mount BEFORE the layout's onMount, so they must ask this rather than read `html.webkit`. */
export function isWebKit(): boolean {
	if (typeof navigator === 'undefined') return false;
	const ua = navigator.userAgent;
	const iosWebKit = /CriOS|FxiOS|EdgiOS/.test(ua);
	let webkit = /AppleWebKit/.test(ua) && (!/Chrome|Chromium|Edg|OPR/.test(ua) || iosWebKit);
	if (import.meta.env.DEV) {
		const force = new URLSearchParams(location.search).get('webkit');
		if (force === 'off') webkit = false;
		if (force === 'on') webkit = true;
	}
	return webkit;
}

export function markEngine(): void {
	const webkit = isWebKit();
	document.documentElement.classList.toggle('webkit', webkit);
}
