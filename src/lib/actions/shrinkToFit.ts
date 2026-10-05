/**
 * shrinkToFit — keep a single line of text on ONE line by shrinking its font-size
 * until it fits its container, releasing to wrap only as a last resort at the floor.
 *
 * Used on the two width-sensitive header elements: the person NAME (h1) and the
 * merged '&' cousin-marriage descent line.
 *
 * MEASUREMENT CONTRACT (this is the whole ballgame — see the Michael HD3384 blowup):
 *   node  = a BLOCK wrapper that OWNS the available width. It must be constrained by
 *           its ancestors (min-w-0 up the chain) so node.clientWidth reflects the real
 *           available width, NOT the text width. If any ancestor is min-width:auto, the
 *           wrapper grows to its content and clientWidth === the text width forever.
 *   [data-fit] = an inline-block, nowrap span holding the text. Its scrollWidth is the
 *           TRUE natural text width regardless of how wide the wrapper is.
 * We compare node.clientWidth (available) vs target.scrollWidth (needed). Measuring the
 * wrapper against ITSELF (scrollWidth vs clientWidth on one element that sizes to its own
 * content) returns equal widths and never shrinks — that was the bug.
 *
 * Imperative on purpose: writes font-size / white-space straight onto the nodes, reads
 * layout synchronously. No reactive state, no $effect (measuring inside an effect that
 * also writes style is the motion-loop hazard). scrollWidth/clientWidth are layout
 * metrics, unaffected by the flight transform (getBoundingClientRect would be — avoid it).
 *
 * Refits on: mount, params change (pass a changing `key`, e.g. the text, so a new person
 * refits), document.fonts.ready (webfonts swap in late), and a ResizeObserver on the
 * wrapper (its available width changes with the spouse-chip notch, and will at runtime
 * once the Task 2 carousel pages chips).
 */
export type ShrinkParams = {
	max: number;
	min: number;
	key?: unknown;
	/**
	 * NEVER RELEASE TO WRAP — at the floor, ellipsis instead.
	 *
	 * The default last resort (wrap onto a second line) is right for the FeaturedCard's name and descent
	 * line, where the header has room and a two-line name is better than a clipped one. It is wrong for a
	 * CHIP: a chip is a fixed box, a second line pushes the dates out through `overflow: hidden`, and the
	 * result is a name that fits at the cost of the years disappearing.
	 *
	 * Sam, Aug 9, on raising the child chips' type: "needs clamp because i don't want names like
	 * Fernandine Széchényi de Sárvár-Felsövidék von und zu Eltz to wrap on two lines inside the chip."
	 * With this set, a name that cannot fit even at the floor is truncated with an ellipsis — the chip
	 * keeps its shape and the full name is still one click away on the card.
	 */
	ellipsis?: boolean;
};

export function shrinkToFit(node: HTMLElement, params: ShrinkParams) {
	let { max, min, ellipsis } = params;
	// The inline text holder we measure against the wrapper. Fall back to the wrapper
	// itself if no [data-fit] child is present (still correct when ancestors are min-w-0).
	const target = (node.querySelector('[data-fit]') as HTMLElement | null) ?? node;

	let lastWidth = -1;

	function fit() {
		target.style.whiteSpace = 'nowrap';
		let size = max;
		node.style.fontSize = `${size}px`;
		// JUMP, THEN CONFIRM (100426). The answer is the largest size on the 0.5px grid down from `max`
		// that fits. It used to be found by stepping 0.5px at a time, and every step is a style write
		// followed by a layout read — one forced layout per step, dozens for a long name. In Sam's Safari
		// that was 88 reads / 8–10ms in the few ms between a promoted card mounting and its first frame,
		// which is the window the flight's hold has to cover (roadmap §58.7). Text width scales almost
		// exactly with font-size, so one measurement at `max` predicts the answer; the walk below then
		// confirms it on the same grid in one or two reads, and lands on the SAME size the old loop did.
		const fits = () => target.scrollWidth <= node.clientWidth;
		if (!fits() && size > min) {
			const needed0 = target.scrollWidth;
			const available0 = node.clientWidth;
			const est = max - Math.ceil(((max - (max * available0) / needed0) / 0.5) - 1e-9) * 0.5;
			size = Math.min(max, Math.max(min, est));
			node.style.fontSize = `${size}px`;
			let guard = 0;
			if (fits()) {
				// the estimate fits: climb back up while the next grid step still fits
				while (size + 0.5 <= max && guard++ < 200) {
					node.style.fontSize = `${size + 0.5}px`;
					if (!fits()) break;
					size += 0.5;
				}
				node.style.fontSize = `${size}px`;
			} else {
				// the estimate is a hair too big: step down exactly as before
				while (!fits() && size > min && guard++ < 200) {
					size = Math.max(min, size - 0.5);
					node.style.fontSize = `${size}px`;
				}
			}
		}
		const available = node.clientWidth;
		const needed = target.scrollWidth;
		// At the floor and still overflowing. Two different right answers — see `ellipsis` above.
		if (ellipsis) {
			// Stay on one line and CUT, with a visible marker. `text-overflow` only acts on a block
			// container's own inline content, so it has to live on the element that HOLDS the text —
			// putting it on the wrapper while the text sat in an inline-block span truncated correctly
			// but drew no ellipsis, and a name cut mid-word with no marker reads as a bug rather than a
			// decision.
			//
			// Safe to measure through: `scrollWidth` reports the full content width regardless of
			// `overflow: hidden`, so the sizing loop above still sees what the text really needs.
			target.style.whiteSpace = 'nowrap';
			target.style.display = 'block';
			target.style.overflow = 'hidden';
			target.style.textOverflow = 'ellipsis';
			target.style.maxWidth = '100%';
		} else {
			target.style.whiteSpace = needed > available ? 'normal' : 'nowrap';
		}
		lastWidth = available;
		if (import.meta.env.DEV) {
			console.debug(
				`[shrinkToFit] "${(target.textContent ?? '').trim().slice(0, 30)}" ` +
					`available=${available} needed=${needed} size=${size}`
			);
		}
	}

	fit();

	let ro: ResizeObserver | null = null;
	if (typeof ResizeObserver !== 'undefined') {
		// Refit only when the available WIDTH actually changes — font-size changes alter
		// height and would otherwise re-trigger us in a loop.
		ro = new ResizeObserver(() => {
			if (node.clientWidth !== lastWidth) fit();
		});
		ro.observe(node);
	}

	let cancelled = false;
	// NOT a no-op even when every font is already loaded (measured 100426): with `ellipsis`, the first
	// pass leaves the text as a clipped block, and this second pass re-measures in that state and can land
	// on a different size (Finch-Hatton's chips: 11.5px after one pass, 13px after two). Skipping it changed
	// the card, so it stays.
	if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
		document.fonts.ready
			.then(() => {
				if (!cancelled) fit();
			})
			.catch(() => {});
	}

	return {
		update(next: ShrinkParams) {
			max = next.max;
			min = next.min;
			fit();
		},
		destroy() {
			cancelled = true;
			ro?.disconnect();
		}
	};
}
