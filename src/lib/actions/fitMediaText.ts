/**
 * fitMediaText — the right column's title + description rows (Art, Landmarks, Statues, Documents), laid
 * out by MEASURING, never by counting characters (Sam, 100226).
 *
 * Sam's rule, in order of preference:
 *   1. The title on its own line(s) at full size, the description beneath it in the smaller grey — the
 *      title gets `lines` lines (1 for Art/Landmarks/Statues, 2 for Documents).
 *   2. If it does not fit, SHRINK the title (down to `min`) until it does — "smaller font size rather than
 *      ellipsis", the same clamp the card name and the video titles use.
 *   3. If it still does not fit at the floor, let it WRAP with tight line spacing — at FULL size for the
 *      one-line titles (`wrapAt: 'max'`: shrink OR wrap, never both — Art's text area beside its thumbnail
 *      is only ~120px, so a modest title like "State Capitol East Entrance" wraps rather than shrinking AND
 *      wrapping), at the floor for Documents (`wrapAt: 'min'`: "wrap on two lines with clamped font size").
 *   4. THE CAP: the whole row — title plus description — never runs past three lines ("I'd rather clamp
 *      font size than have it all wrap to four cumulative lines; it should never be 4 lines"). A wrapped
 *      row that would shrinks its title (to `capMin`) until it fits. Only a title too long even there
 *      goes past — and those are data errors to shorten, not cases to design for.
 *   5. Once a title wraps, the description runs on after its last word — the way Education's "1604–1618"
 *      follows "Cambridge" — but ONLY if it fits on that last line WHOLE; otherwise it takes its own line,
 *      so a description is never split across lines ("Relief / tympanum").
 *   NO ELLIPSIS ANYWHERE. The full text is also in the row's tooltip (the caller's `title` attribute).
 *
 * The description gets the same treatment on its own line: shrink to `subMin` to stay on one line, else
 * wrap.
 *
 * Contract (as shrinkToFit): `node` is a block wrapper that OWNS the available width (min-w-0 up the
 * chain), holding a `[data-title]` block and an optional `[data-sub]` block. Imperative on purpose — it
 * writes font-size / line-height straight onto those two elements and reads layout synchronously; no
 * reactive state, so no measure-inside-an-effect loop. offsetHeight/scrollWidth are layout metrics, so a
 * flight's transform does not disturb them.
 *
 * Refits on: mount, params change (pass a changing `key`), document.fonts.ready, and a ResizeObserver on
 * the wrapper's WIDTH (its height changes as a consequence of fitting and must not retrigger it).
 */
export type FitMediaParams = {
	max: number; // title size, px, at full
	min: number; // title floor, px
	lines: 1 | 2; // the title's line budget before it gives up and wraps
	wrapAt: 'max' | 'min'; // the size a title that cannot fit its budget wraps at
	maxLines: number; // the whole row's cap, title + description (Sam: "it should never be 4 lines") — 3
	capMin: number; // how small the title may shrink to honour the cap
	subMax: number; // description size, px
	subMin: number; // description floor, px
	key?: unknown;
};

const LH = 1.2; // minimal line spacing (Sam: "a lot of line space in the ART entry just for the title")

export function fitMediaText(node: HTMLElement, params: FitMediaParams) {
	let p = params;
	let lastWidth = -1;

	function fit() {
		const title = node.querySelector<HTMLElement>('[data-title]');
		const sub = node.querySelector<HTMLElement>('[data-sub]');
		if (!title) return;
		node.classList.remove('flow');
		node.style.lineHeight = '';
		title.style.display = 'block';
		if (sub) {
			sub.style.display = 'block';
			sub.style.marginLeft = '';
			sub.style.whiteSpace = 'nowrap';
			sub.style.fontSize = `${p.subMax}px`;
			sub.style.lineHeight = `${p.subMax * LH}px`;
		}

		let size = p.max;
		const setTitle = () => {
			title.style.fontSize = `${size}px`;
			title.style.lineHeight = `${size * LH}px`;
		};
		const titleLines = () => Math.round(title.offsetHeight / (size * LH));

		// The description's natural width at full size: a block's scrollWidth never reads below the column
		// width, so measure it as an inline-block (it shrink-wraps to its text), unscaled, then put it back.
		let subW = 0;
		if (sub) {
			sub.style.display = 'inline-block';
			subW = sub.offsetWidth;
			sub.style.display = 'block';
		}
		/** Does the description fit WHOLE after the title's last word? (Only asked of a wrapped title.) */
		const fitsInline = () => {
			if (!sub) return false;
			const range = document.createRange();
			range.selectNodeContents(title);
			const rects = range.getClientRects();
			const box = title.getBoundingClientRect();
			const last = rects[rects.length - 1];
			// Rects are screen px, which a flight's transform scales: take the FRACTION of the line left free
			// and apply it to the unscaled clientWidth, so the comparison is in one unit.
			const freeFrac = last && box.width ? (box.right - last.right) / box.width : 0;
			return subW + 0.3 * p.subMax <= freeFrac * title.clientWidth;
		};
		/** Lines the whole row takes: the title, plus the description unless it rides the title's last line. */
		const total = () => {
			const tl = titleLines();
			return tl + (sub && !(tl > 1 && fitsInline()) ? 1 : 0);
		};

		// 1–2. Full size, then shrink until the title sits within its line budget.
		setTitle();
		let guard = 0;
		while (titleLines() > p.lines && size > p.min && guard++ < 100) {
			size = Math.max(p.min, size - 0.5);
			setTitle();
		}
		// 3. Still over its budget at the floor: wrap — at full size, or at the floor (see wrapAt).
		if (titleLines() > p.lines && p.wrapAt === 'max') {
			size = p.max;
			setTitle();
		}
		// 4. THE THREE-LINE CAP (Sam: "it should never be 4 lines"): a wrapped row that would run past
		//    `maxLines` shrinks — "rather clamp font size than have it all wrap" — down to `capMin`.
		guard = 0;
		while (total() > p.maxLines && size > p.capMin && guard++ < 100) {
			size = Math.max(p.capMin, size - 0.5);
			setTitle();
		}

		// 5. Place the description: after a wrapped title's last word if it fits there whole…
		if (sub && titleLines() > 1 && fitsInline()) {
			node.classList.add('flow');
			// Inline lines take the WRAPPER's line height as their floor (the strut), and the wrapper inherits
			// the column's roomy default — so the flowed paragraph's pitch is set here too, or the lines open
			// up ("a lot of line space… just for the title").
			node.style.lineHeight = `${size * LH}px`;
			title.style.display = 'inline';
			sub.style.display = 'inline';
			sub.style.marginLeft = '0.1em'; // plus the markup's own space: one word-gap, as in Education
			sub.style.lineHeight = `${size * LH}px`;
			return;
		}
		// …otherwise on its own line: shrink to stay on one line, else wrap at the floor.
		if (sub) {
			let s = p.subMax;
			const setSub = () => {
				sub.style.fontSize = `${s}px`;
				sub.style.lineHeight = `${s * LH}px`;
			};
			setSub();
			guard = 0;
			while (sub.scrollWidth > sub.clientWidth && s > p.subMin && guard++ < 100) {
				s = Math.max(p.subMin, s - 0.5);
				setSub();
			}
			if (sub.scrollWidth > sub.clientWidth) sub.style.whiteSpace = 'normal';
		}
	}

	fit();
	void document.fonts?.ready.then(() => fit());
	const ro = new ResizeObserver((entries) => {
		const w = Math.round(entries[0].contentRect.width);
		if (w === lastWidth) return;
		lastWidth = w;
		fit();
	});
	ro.observe(node);

	return {
		update(next: FitMediaParams) {
			p = next;
			fit();
		},
		destroy() {
			ro.disconnect();
		}
	};
}
