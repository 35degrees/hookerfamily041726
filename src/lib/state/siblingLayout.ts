/**
 * The sibling panel's LAYOUT MODEL, lifted out of SiblingPanel.svelte so it has exactly one home.
 *
 * It moved here for §19 (sibling↔sibling as an in-place panel mutation). The demoting card now flies
 * into a real seat in this list, and to do that the flight has to know where that seat will COME TO
 * REST — a question only this math can answer, and one that must be answered BEFORE the swap, while
 * the panel on screen still shows the outgoing person's list (see siblingNav.ts). Re-deriving the
 * cumulative layout at the call site would have been a second copy of the trickiest arithmetic in the
 * component (asymmetric header gaps, headers consuming window slots, never-a-partial-chip), which is
 * precisely the "parallel pattern" the architecture rule forbids.
 *
 * Nothing about the model changed in the move. SiblingPanel imports every constant and function it
 * used to declare inline, and its rendered geometry is byte-identical.
 */
import type { Neighborhood, PersonCompact } from '$lib/types/neighborhood';

export type SiblingTiers = {
	full: PersonCompact[];
	half: PersonCompact[];
	step: PersonCompact[];
};

export type SibItem = { kind: 'header'; label: string } | { kind: 'chip'; chip: PersonCompact };

// ── Geometry constants (the CSS matches these — keep the two in sync) ───────────────────────────────
export const CHIP_W = 119;
export const CHIP_H = 54;
export const GAP = 16;
export const PITCH = CHIP_H + GAP; // 70 — the mount-cascade drop distance (layout below is cumulative)
export const HEADER_H = 28; // FIXED header height so the cumulative height model is exact
// The window is a FIXED HEIGHT — 6 chips' worth — that NEVER changes. Headers CONSUME SLOTS: no headers
// → 6 chips; one header → fewer. "6" is a consequence of the height, not a law.
export const WINDOW_CHIPS = 6;
export const WINDOW_H = WINDOW_CHIPS * CHIP_H + (WINDOW_CHIPS - 1) * GAP; // 404px
// Asymmetric header gaps: a header sits CLOSER to the chips it labels than to the content above it —
// proximity grouping. Gap ABOVE a header −40%; gap BELOW −80%. Intentional, do not "correct".
export const HEADER_GAP_ABOVE = GAP * 0.6; // 9.6px
export const HEADER_GAP_BELOW = GAP * 0.2; // 3.2px
// The CSS achieves those trimmed gaps with NEGATIVE MARGINS on .sib-item.is-header, and these are the
// same two numbers seen from that side. Derived rather than restated so the pair cannot drift.
export const HEADER_MARGIN_TOP = GAP - HEADER_GAP_ABOVE; // 6.4px — matches margin-top: -6.4px
export const HEADER_MARGIN_BOTTOM = GAP - HEADER_GAP_BELOW; // 12.8px — matches margin-bottom: -12.8px

/**
 * §21.1's RENDER GATE — does this person get a sibling panel at all? One home for it: the page asks it to
 * decide whether to mount the panel, and planSiblingNav asks it of the INCOMING person to decide whether
 * there is a seat to fly into. Those were two copies of the same rule, which is how they drift.
 *
 * THE SECOND CLAUSE (Aug 4, Sam's call). The first clause is the original rule — a blood sibling exists,
 * the focus is on the Hooker/Talcott lines, and is not an easter egg — and it is right for suppressing a
 * trigger on a card the user merely landed on. It was wrong for a card the user reached BY CLICKING A
 * SIBLING CHIP, which is a one-way door: Alice Lee Roosevelt is a half-sibling in Theodore Roosevelt Jr's
 * panel, but her own panel vanished, so the relationship she was traversed by did not exist from her side.
 * No data fix could reach it — she genuinely is not a Hooker descendant (the line runs through Theodore
 * Sr's SECOND wife, so her half-siblings are on it and she is not).
 *
 * So the panel also renders when at least one of the person's OWN rendered siblings is on the line — which
 * is exactly the statement "somebody on the line can reach me here, so I can go back". Strictly additive
 * (measured: +57 cards, 0 lost) and it must stay additive: gating on the LIST ALONE would take the panel
 * off Thomas Hooker himself, whose siblings are not his own descendants. Every flag it reads already rides
 * on every sibling compact, so this needs no data change. It closes 55 of the 58 one-way doors; the last 3
 * are Stream A gaps where the reciprocal sibling edge was never emitted at all (siblings_count = 0).
 */
export function showsSiblingPanel(nb: Neighborhood | null | undefined): boolean {
	const f = nb?.focus;
	if (!nb || !f) return false;
	if (nb.siblings_count > 0 && (f.hd || f.td) && !f.ee) return true;
	const t = nb.siblings;
	if (!t) return false;
	return [...t.full, ...t.half, ...t.step].some((s) => s.hd || s.td);
}

/**
 * The chip column's top, measured DOWN from the sibling zone's top. It is the `.top-slot`'s height, and
 * measured, zone.top + this === the mask's top exactly, on every card.
 *
 * ONE VALUE FOR EVERY CARD (Sam, Aug 4). §21.1 set this to the card-edge resume beneath the notch carve,
 * which is 12px higher on a compact notch (≥3 spouses) — "the 15px distinction was worth two passes to get
 * right", and it was, while the panel closed and reopened on every navigation. What changed is not the
 * anchor but the panel's LIFETIME: now that it persists, a per-card anchor is a column that jumps 12px as
 * you travel. Sam, on Rodman Lent Hooker (3 spouses) ↔ his brother John (1): "the sibling menu moves up
 * and down 5-10px each time you toggle between them."
 *
 * A persistent column should not take its position from a property of the card beside it. The cost is
 * accepted and named: on a compact-notch card the column now starts ~12px below the carve rather than
 * tight against it. The parameter is kept so the relationship stays legible at the call site — and so a
 * future density step (Phase 2.75) has one place to reintroduce a rule if one is ever wanted.
 */
export function anchorOffsetFor(_spouseCount: number): number {
	return 90;
}

// Sort each tier by BIRTH YEAR (the parents' children_ids aren't reliably birth-ordered), then keep the
// died-young chips grouped at the bottom (dimmed, by design) — birth-sorted within each group. Unknown
// birth years sort last but hold their relative order (stable sort).
function tier(list: PersonCompact[]): PersonCompact[] {
	const byBirth = (a: PersonCompact, b: PersonCompact) => (a.by ?? Infinity) - (b.by ?? Infinity);
	return [
		...list.filter((s) => !s.dy_young).sort(byBirth),
		...list.filter((s) => s.dy_young).sort(byBirth)
	];
}

/** The rendered item list: full-sibling chips, then a header + chips per non-empty lower tier. */
export function buildItems(siblings: SiblingTiers): SibItem[] {
	const out: SibItem[] = [];
	for (const chip of tier(siblings.full)) out.push({ kind: 'chip', chip });
	if (siblings.half.length) {
		out.push({ kind: 'header', label: 'Half-siblings' });
		for (const chip of tier(siblings.half)) out.push({ kind: 'chip', chip });
	}
	if (siblings.step.length) {
		out.push({ kind: 'header', label: 'Step-siblings' });
		for (const chip of tier(siblings.step)) out.push({ kind: 'chip', chip });
	}
	return out;
}

export function itemH(it: SibItem): number {
	return it.kind === 'header' ? HEADER_H : CHIP_H;
}

/** The gap BELOW item `i` — asymmetric around a header (see the constants above). */
export function gapAfter(items: SibItem[], i: number): number {
	if (items[i + 1]?.kind === 'header') return HEADER_GAP_ABOVE; // this item → the header below it
	if (items[i]?.kind === 'header') return HEADER_GAP_BELOW; // a header → the chip below it
	return GAP;
}

/**
 * Each item's top, measured from the strip's own top.
 *
 * THE LEADING-HEADER OFFSET. A header's trimmed gaps are negative margins in the CSS, and everywhere in
 * the middle of the list that is exactly equivalent to this model's `gapAfter` — a margin-top of −6.4
 * simply eats 6.4 of the 16px flex gap above it. At index 0 it is NOT equivalent: there is no gap above
 * the first item, so the margin has nothing to trim and instead lifts the WHOLE STRIP 6.4px.
 *
 * That is a real 6.4px error for any person whose siblings are all half- or step-, so their list opens
 * with a tier header — Emily Vanderbilt, whose three siblings are all half. Sam saw it as the demoted
 * chip landing and then "ticking up maybe 5px instantly": the flight aimed at a seat computed from this
 * model, the chip rendered 6.4px higher, and the atomic swap exposed the jump. Measured: card's last
 * painted top 371.2, chip at rest 364.8.
 *
 * It also meant the leading header itself rendered 6.4px above the mask and was clipped by ~2.4px of its
 * own height — the same error, seen at the top of the column instead of at a seat.
 */
export function cumTops(items: SibItem[]): number[] {
	const tops: number[] = [];
	let y = items[0]?.kind === 'header' ? -HEADER_MARGIN_TOP : 0;
	for (let i = 0; i < items.length; i++) {
		tops.push(y);
		y += itemH(items[i]!) + gapAfter(items, i);
	}
	return tops;
}

/** Item indices of the CHIPS, in order — the mapping from a chip-offset to an item index. */
export function chipIndices(items: SibItem[]): number[] {
	const idx: number[] = [];
	items.forEach((it, i) => {
		if (it.kind === 'chip') idx.push(i);
	});
	return idx;
}

/** The window's first ITEM for a chip-offset: the chip at `o`, extended UP to include its tier header
 *  when one sits directly above (so a tier label shows atop its first visible chip). */
export function startItemFor(items: SibItem[], chips: number[], o: number): number {
	let s = chips[o] ?? 0;
	if (s > 0 && items[s - 1]?.kind === 'header') s -= 1;
	return s;
}

/** The LAST item that fits COMPLETELY within the fixed WINDOW_H starting at item `s`. Never a partial:
 *  an item is included only if its whole box lands within the window; the straddler and everything
 *  below are excluded, and the leftover space at the bottom stays empty. */
export function endItemFor(items: SibItem[], tops: number[], s: number): number {
	const startTop = tops[s] ?? 0;
	let last = s;
	for (let i = s; i < items.length; i++) {
		if ((tops[i] ?? 0) + itemH(items[i]!) - startTop <= WINDOW_H + 0.5) last = i;
		else break;
	}
	return last;
}

/** The smallest chip-offset from which the LAST item already fits; paging past it reveals nothing. */
export function maxOffsetFor(items: SibItem[], tops: number[], chips: number[]): number {
	const count = chips.length;
	for (let o = 0; o <= Math.max(0, count - 1); o++) {
		if (endItemFor(items, tops, startItemFor(items, chips, o)) >= items.length - 1) return o;
	}
	return Math.max(0, count - 1);
}

/**
 * The chip-offset that brings item `k` into the window, moving the strip AS LITTLE AS POSSIBLE from
 * `current`. §19: the carousel scrolls to CATCH the arriving card, so the scroll should read as the
 * list making room, not as the list jumping to a new place.
 *
 *   • already visible → don't move at all.
 *   • below the window → page down until it is the LAST fully-visible item. This is §18.9's
 *     trailing-chip rule, the same one `spouseOffset` uses so a demotion never flies to a seat that
 *     is present in the roster but not RENDERED.
 *   • above the window → page up until it is the first, which is the minimal upward scroll.
 */
export function offsetToReveal(
	items: SibItem[],
	tops: number[],
	chips: number[],
	k: number,
	current: number
): number {
	const max = maxOffsetFor(items, tops, chips);
	const cur = Math.min(Math.max(0, current), max);
	const visibleAt = (o: number) => {
		const s = startItemFor(items, chips, o);
		return k >= s && k <= endItemFor(items, tops, s);
	};
	if (visibleAt(cur)) return cur;
	if (k < startItemFor(items, chips, cur)) {
		// ABOVE — the smallest upward scroll that reaches it is the offset where it sits first.
		const o = chips.indexOf(k);
		return o < 0 ? cur : Math.min(o, max);
	}
	// BELOW — the first offset that pulls it inside; the scan stops the moment it fits, which lands
	// it on the trailing edge.
	for (let o = cur + 1; o <= max; o++) if (visibleAt(o)) return o;
	return max;
}
