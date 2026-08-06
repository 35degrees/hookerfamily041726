/**
 * fitBlade — size the CC blade to its contents: the largest legal type, then the tightest width that
 * still holds it in the same number of lines.
 *
 * Two searches, in this order, both measured on the real DOM:
 *
 *   1. TYPE. Grow the text from the floor while the blade's DEPTH is unchanged. A line is the unit that
 *      matters, so growing is free until one more would appear.
 *   2. WIDTH. Then pull the blade's right edge in to the narrowest width that still holds that depth.
 *      This is the shrinkwrap Pretext demos: `width: fit-content` sizes a box to its widest WRAPPED
 *      line, which leaves dead space whenever the last line is short; the tightest width producing the
 *      same line count leaves none. The blade's left edge never moves — it always emerges from the same
 *      point under the card — so all of the give is on the right.
 *
 * The floor for the width search is the paragraph's own min-content width, so an unbreakable atom (a
 * full name held together by non-breaking spaces) can never be squeezed into overflowing.
 *
 * WHY THE DOM AND NOT A PREDICTOR. The blade's lines are cut by a slanted edge (a shape-outside float);
 * the browser is the only thing that knows exactly how text wraps around that shape. There is one blade
 * on the page holding at most eleven connections, so a dozen synchronous measurements cost nothing —
 * accuracy is the scarce thing here, not throughput.
 *
 * CONTRACT: a UNITLESS line-height on the text, so leading scales with the size being tried. A px
 * line-height holds the leading still and every candidate reports the same depth.
 */
export type BladeFitParams = {
	/** Type floor — also the size at which the target depth is established. */
	minFont: number;
	/** Type ceiling. The blade sits BELOW the card in the hierarchy and must not read as part of it. */
	maxFont: number;
	/** The blade's full width; it is never wider than this. */
	maxWidth: number;
	/** Change this (e.g. the text) to force a refit for a new person. */
	key?: unknown;
};

const FONT_STEPS = 7;
const WIDTH_STEP = 15; // px between candidate widths
const TAIL_CHARS = 26; // text shorter than this before a separator means the line opened with a tail
const AVG_CHAR_W = 0.43; // px per character per px of font-size, measured off the rendered blade

export function fitBlade(node: HTMLElement, params: BladeFitParams) {
	let current = params;

	function text(): HTMLElement | null {
		return node.querySelector('.cc-text');
	}

	function depth(t: HTMLElement): number {
		const lh = parseFloat(getComputedStyle(t).lineHeight);
		return lh ? Math.max(1, Math.round(t.scrollHeight / lh)) : 1;
	}

	function fit() {
		const t = text();
		if (!t) return;
		const { minFont, maxFont, maxWidth } = current;

		// ── 1. TYPE, at full width ──────────────────────────────────────────────────────────────────
		node.style.width = `${maxWidth}px`;
		t.style.fontSize = `${minFont}px`;
		const target = depth(t);
		let lo = minFont;
		let hi = maxFont;
		let size = minFont;
		for (let i = 0; i < FONT_STEPS; i++) {
			const mid = (lo + hi) / 2;
			t.style.fontSize = `${mid}px`;
			if (depth(t) <= target) {
				size = mid;
				lo = mid;
			} else {
				hi = mid;
			}
		}
		// FLOOR, never round. toFixed(2) rounds UP, which can write a size larger than any that was
		// actually tested — and the accepted size is by definition sitting right against the threshold.
		// Measured: the search accepted 11.0390625 (2 lines), wrote 11.04, and 11.04 wraps to 3. The
		// blade got a whole extra row out of a hundredth of a pixel.
		t.style.fontSize = `${(Math.floor(size * 100) / 100).toFixed(2)}px`;

		// ── 2. WIDTH, at that type ──────────────────────────────────────────────────────────────────
		// min-content is the honest floor: the width at which the longest unbreakable run still fits, so
		// a bound name cannot be forced to overflow.
		node.style.width = 'min-content';
		const floor = Math.min(node.offsetWidth, maxWidth);

		// Score every candidate width and keep the best. A dozen synchronous measurements on one small
		// element is nothing, and a scan can see what a binary search cannot: the orphan count is not
		// monotonic in width, so there is no midpoint to compare against.
		// Among the widths that hold the depth, prefer the one leaving the fewest TAILS — a connection's
		// last word or two stranded at the start of the next line, so the line opens mid-sentence. Then
		// the narrowest, which is the shrinkwrap.
		//
		// An earlier version of this ALSO traded a line away to buy fewer tails, and was removed for
		// producing no measurable gain. It was measured against a layout that could not break between
		// connections at all (see the <wbr/> in the component) — with that fixed, a plain same-depth
		// preference fixes two blades in ten and cannot make any of them worse, because a width that
		// adds a line is never considered.
		let best = maxWidth;
		let bestTails = Infinity;
		for (let w = maxWidth; w >= floor; w -= WIDTH_STEP) {
			node.style.width = `${w}px`;
			if (depth(t) > target) break; // once a width adds a line, every narrower one does too
			const tails = orphans(t);
			if (tails <= bestTails) {
				bestTails = tails;
				best = w;
			}
		}
		node.style.width = `${best}px`;
	}

	/**
	 * How many lines BEGIN with the tail of the previous connection.
	 *
	 * For each separator, take a range from the start of the paragraph up to it and read the LAST client
	 * rect: that is the run of text on the separator's own line before it, so a narrow one means the
	 * line opened with a few stranded words and then immediately started the next connection. One range
	 * per separator, at most ten — reconstructing line strings would take a range per CHARACTER.
	 *
	 * The threshold is in CHARACTERS, not a fraction of the width: a tail is short in absolute terms,
	 * and scoring it proportionally over-counted on wide blades and hid the widths worth choosing.
	 */
	function orphans(t: HTMLElement): number {
		const dots = t.querySelectorAll<HTMLElement>('.cc-dot');
		if (!dots.length) return 0;
		const limit = parseFloat(getComputedStyle(t).fontSize) * TAIL_CHARS * AVG_CHAR_W;
		let n = 0;
		for (const dot of dots) {
			const r = document.createRange();
			r.setStart(t, 0);
			r.setEndBefore(dot);
			const rects = r.getClientRects();
			const last = rects[rects.length - 1];
			if (last && last.width < limit) n++;
		}
		return n;
	}

	fit();

	let cancelled = false;
	if (typeof document !== 'undefined' && document.fonts?.ready) {
		// Webfonts swap in late and every measurement above was taken in whatever face was active.
		document.fonts.ready.then(() => !cancelled && fit()).catch(() => {});
	}

	return {
		update(next: BladeFitParams) {
			current = next;
			fit();
		},
		destroy() {
			cancelled = true;
		}
	};
}
