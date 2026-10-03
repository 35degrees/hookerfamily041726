/**
 * pinFonts.ts — keeps the web fonts the page is USING from flashing to a system font on navigation (100326).
 *
 * THE BUG (Sam's Chrome film, 3 Oct): on a CC click the whole card — name, NBs, vitals, buttons — drew in
 * Helvetica for ONE frame and then snapped back: the text rewrapped and "shifted laterally". Measured in
 * his Chrome via Apple Events:
 *   • ANY change to the URL (pushState, replaceState, even a hash) makes that Chrome throw away every
 *     CSS @font-face object and rebuild all 52 from the stylesheets. Nothing in the page changes — the
 *     stylesheet list, rule counts, viewport and DPR are identical; it is the browser re-sending its font
 *     settings. Playwright's Chrome (field trials off) never does it, so it is most likely a Chrome
 *     experiment; it happens in Incognito too, so not an extension.
 *   • The rebuilt faces start UNLOADED. The ones in use re-load from cache — ~20ms on the dev server,
 *     3–4ms in production — and with `font-display: swap` the text in those faces paints in the fallback
 *     until they finish. A click mounts the next card in the same few frames, so the reload lands on a
 *     painted frame: the flash. (Measured: NB header 288.1px → 286.9px for one frame, every click.)
 *
 * THE FIX: give every face the page has actually loaded a JavaScript twin — `new FontFace` with the same
 * family, descriptors and file, added to `document.fonts`. JS-added faces are not CSS-connected, so the
 * rebuild does not touch them; they stay loaded, and for the same descriptors the later-added face wins
 * the match, so text keeps rendering in it while the CSS copies re-load behind it. Measured in the same
 * Chrome on dev: 2/2 clicks flashed without it, 0/2 with it — no loading frames at all.
 *
 * Only faces that have LOADED are pinned (a pinned face is fetched immediately, so pinning the Cyrillic
 * or Greek subsets would download files nobody needs). A subset that loads later — a card with an
 * accented name pulling in latin-ext — is pinned when it finishes (`loadingdone`). Same file URL as the
 * CSS rule, so it comes from the HTTP cache: no second download.
 *
 * Browser-agnostic and harmless where the bug does not occur (Safari, Firefox, a Chrome without the
 * experiment): the twins are identical to the faces they shadow.
 */
const pinned = new Set<string>();

function pinLoaded(): void {
	const loaded = new Set<string>();
	document.fonts.forEach((f) => {
		if (f.status === 'loaded') loaded.add(key(f.family, f.weight, f.style, f.unicodeRange));
	});
	for (const sheet of Array.from(document.styleSheets)) {
		let rules: CSSRuleList;
		try {
			rules = sheet.cssRules;
		} catch {
			continue; // a cross-origin sheet hides its rules; ours are all same-origin
		}
		for (const rule of Array.from(rules)) {
			if (!(rule instanceof CSSFontFaceRule)) continue;
			const s = rule.style;
			const family = s.getPropertyValue('font-family').replace(/['"]/g, '').trim();
			const weight = s.getPropertyValue('font-weight') || 'normal';
			const style = s.getPropertyValue('font-style') || 'normal';
			const range = s.getPropertyValue('unicode-range') || 'U+0-10FFFF';
			const k = key(family, weight, style, range);
			if (pinned.has(k) || !loaded.has(k)) continue;
			const url = s.getPropertyValue('src').match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/)?.[1];
			if (!url) continue;
			pinned.add(k);
			const face = new FontFace(family, `url(${new URL(url, sheet.href ?? location.href).href})`, {
				weight,
				style,
				unicodeRange: range
			});
			document.fonts.add(face);
			void face.load().catch(() => {});
		}
	}
}

/** The CSSOM and FontFace serialise the same descriptor slightly differently ("400" vs "normal",
 *  "U+0000-00FF" vs "U+0-FF"), so both sides are normalised before comparing. */
function key(family: string, weight: string, style: string, range: string): string {
	const w = weight === 'normal' ? '400' : weight === 'bold' ? '700' : weight;
	const r = range
		.toUpperCase()
		.replace(/\s+/g, '')
		.replace(/U\+0*([0-9A-F]+)/g, 'U+$1')
		.replace(/-0*([0-9A-F]+)/g, '-$1');
	return `${family}|${w}|${style}|${r}`;
}

/** Called once from the root layout's onMount. */
export function pinFonts(): void {
	if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined') return;
	void document.fonts.ready.then(pinLoaded);
	document.fonts.addEventListener('loadingdone', pinLoaded);
}
