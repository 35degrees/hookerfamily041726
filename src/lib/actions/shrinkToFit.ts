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
export type ShrinkParams = { max: number; min: number; key?: unknown };

export function shrinkToFit(node: HTMLElement, params: ShrinkParams) {
	let { max, min } = params;
	// The inline text holder we measure against the wrapper. Fall back to the wrapper
	// itself if no [data-fit] child is present (still correct when ancestors are min-w-0).
	const target = (node.querySelector('[data-fit]') as HTMLElement | null) ?? node;

	let lastWidth = -1;

	function fit() {
		target.style.whiteSpace = 'nowrap';
		let size = max;
		node.style.fontSize = `${size}px`;
		let guard = 0;
		while (target.scrollWidth > node.clientWidth && size > min && guard < 200) {
			size = Math.max(min, size - 0.5);
			node.style.fontSize = `${size}px`;
			guard++;
		}
		const available = node.clientWidth;
		const needed = target.scrollWidth;
		// At the floor and still overflowing → release to wrap as the last resort.
		target.style.whiteSpace = needed > available ? 'normal' : 'nowrap';
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
