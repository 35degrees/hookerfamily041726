/**
 * intro.svelte.ts — the hand-off between the intro at `/` and the person page underneath it (100226).
 *
 * The intro overlay lives in the LAYOUT (like SettleVeil) so it survives the route change: `/` starts it
 * and immediately replaces itself with Thomas's page (no history entry, so Back and refresh never replay
 * it). That page mounts UNDER the overlay and HOLDS itself blank — no card, no roster, no chrome — until
 * the overlay has faded to paper and calls `releaseIntro()`. The page then lets the card in as an
 * ordinary vertical cross-connection: the existing deck flight raises it from the window's bottom edge
 * and the roster unfurls at landing. A new surface terminating in an existing transition (design §47.9).
 *
 * Module singleton, client-only in practice: `startIntro` is only ever called from an onMount.
 */
export const intro = $state({
	active: false, // the overlay is up (it also renders on SSR of `/`, before this is set)
	ready: false, // the person page underneath has mounted and taken its hold
	released: false // the overlay has reached paper: let the card in
});

let pending = false;

export function startIntro(): void {
	intro.active = true;
	intro.ready = false;
	intro.released = false;
	pending = true;
}

/** Called once by the person page as it mounts: true = start blank and wait for the release. */
export function takeIntroHold(): boolean {
	const p = pending;
	pending = false;
	if (p) intro.ready = true;
	return p;
}

export function releaseIntro(): void {
	intro.released = true;
}

export function endIntro(): void {
	intro.active = false;
}

// ── THE SCROLLBAR, held until Thomas has landed (Sam, 2 Oct) ───────────────────────────────────────────
// Over the title and the painting there is no scrollbar and no gutter: overflow hidden, and layout.css's
// always-on `scrollbar-gutter: stable` lifted. When it comes back depends on the KIND of scrollbar:
//   • OVERLAY (macOS's default — takes no width, flashes a thin dark bar whenever the scrollable height
//     changes): held through the whole flight and given back only once the card has LANDED and the family
//     has unfurled. Handed back before the flight was the jank Sam saw — the rising card changes the
//     page's scroll extent every frame, and Chrome flashed its dark bar through the arrival.
//   • CLASSIC (takes ~15px and never flashes): given back the moment the painting is gone, while the
//     screen is still blank paper. It cannot wait for the landing: a root that cannot scroll reserves no
//     gutter (measured — scrollbar-gutter does nothing under overflow:hidden on the viewport), so a late
//     return would shove the whole stage half a gutter sideways under a card that had just settled.
let restore = () => {};
let classic = false;
let fallback: ReturnType<typeof setTimeout> | undefined;

/** Width a classic scrollbar takes in this browser — 0 for overlay scrollbars. */
function scrollbarWidth(): number {
	const probe = document.createElement('div');
	probe.style.cssText = 'position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll;';
	document.body.appendChild(probe);
	const w = probe.offsetWidth - probe.clientWidth;
	probe.remove();
	return w;
}

export function holdIntroScroll(): void {
	const html = document.documentElement;
	const prev = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter };
	classic = scrollbarWidth() > 0;
	html.style.overflow = 'hidden';
	html.style.scrollbarGutter = 'auto';
	restore = () => {
		clearTimeout(fallback);
		html.style.overflow = prev.overflow;
		html.style.scrollbarGutter = prev.gutter;
		restore = () => {};
	};
}

/** The painting is gone and the stage is still empty: a CLASSIC scrollbar returns now (see above). */
export function releaseIntroGutter(): void {
	if (classic) {
		restore();
		return;
	}
	// overlay: wait for the landing — with a safety net, so a lost landing signal cannot strand the page
	clearTimeout(fallback);
	fallback = setTimeout(releaseIntroScroll, 5000);
}

/** The card has landed and settled: everything returns (a no-op if it already has). */
export function releaseIntroScroll(): void {
	restore();
}
