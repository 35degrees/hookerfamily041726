/**
 * HOW A ROW OF CHILDREN BREAKS — Sam's rules, Aug 9. New doctrine; there was no prior convention and
 * nothing in the docs about it, so this file IS the specification.
 *
 * Until now the children row was a plain `flex-wrap` at `max-width: 1152px`, which meant the break
 * points were an accident of arithmetic: five children fitted on one line, six became 5+1, and the
 * count per row changed as the window resized. Sam, on Cornelius Vanderbilt Whitney's five-in-a-row:
 * "it's stubborn if I shrink the browser width, it doesn't start to wrap... eventually Cornelius on
 * the right will wrap to the bottom row on his own but size it down more and he jumps back up."
 *
 * ── THE TWO RULES ───────────────────────────────────────────────────────────────────────────────────
 *
 *   1. FOUR PER ROW, NEVER FIVE. "Let's not do 5 kids on top at all... we are moving totally away from
 *      5 child chips in a row." It also buys back the left margin the timeline needs.
 *   2. NEVER STRAND A SINGLE CHILD on a row of their own.
 *
 * Everything else follows from those two. Fill rows of four; if the last row would hold exactly one,
 * pull one down from the row above so the tail reads 3+2 instead of 4+1.
 *
 *      n=4  → 4          n=8  → 4,4        n=12 → 4,4,4
 *      n=5  → 3,2        n=9  → 4,3,2      n=13 → 4,4,3,2
 *      n=6  → 4,2        n=10 → 4,4,2      n=16 → 4,4,4,4
 *      n=7  → 4,3        n=11 → 4,4,3      n=17 → 4,4,4,3,2
 *
 * Every one of those matches a count Sam gave, with ONE deliberate departure: he first said ten should
 * be "five and five", then banned five outright in the same message. 4,4,2 is what the ban implies and
 * what keeps ten consistent with six (4,2). Flagged rather than silently chosen — if ten is meant to be
 * a named exception it belongs here as one.
 *
 * ── WHY DESCENDING RATHER THAN BALANCED ─────────────────────────────────────────────────────────────
 *
 * A balanced split is the obvious algorithm and it is the wrong one. Sam: "there's a way in which
 * off-balance is nice, so if there are six kids, then four on top row, two on bottom row by default is
 * attractive, not just going to three on top three on bottom as a rectangle is boring." So six is 4,2
 * and not 3,3 — the shape is a deliberate taper, and the top row being full is what makes the row read
 * as an ordered sequence (birth order, left to right, top to bottom) rather than a block.
 *
 * The 3,2 tail is the one place the taper is broken on purpose, because rule 2 outranks the taper.
 */

/** The most children that may ever share a row. A hard ceiling, not a target. */
export const MAX_PER_ROW = 4;

/**
 * The row sizes for `n` children, in order, top row first.
 *
 * Pure and total: any n >= 0 returns a valid plan whose entries sum to n. n <= 1 returns a single row —
 * a lone child is not "stranded", there is simply nobody to share the row with, and rule 2 only has
 * meaning when there is a row above to borrow from.
 */
export function childRowPlan(n: number): number[] {
	if (!Number.isFinite(n) || n <= 0) return [];
	if (n <= MAX_PER_ROW) return [n];

	const rows: number[] = [];
	let left = n;
	while (left > 0) {
		const take = Math.min(MAX_PER_ROW, left);
		rows.push(take);
		left -= take;
	}

	// RULE 2. A trailing row of one becomes 3,2 by borrowing from the row above. Only ever the LAST row
	// can be short, so this is a single fix-up rather than a rebalancing pass.
	if (rows.length > 1 && rows[rows.length - 1] === 1) {
		rows[rows.length - 2] -= 1;
		rows[rows.length - 1] = 2;
	}
	return rows;
}

/**
 * ── HOW THE PLAN IS APPLIED, AND WHY IT IS A GRID ───────────────────────────────────────────────────
 *
 * The children render as ONE FLAT KEYED LIST and must keep doing so: 17 selectors across flight.ts,
 * probe-tier.mjs and the page address chips as `.children-slot > .flight`, so rows cannot become
 * wrapper elements without silently unmatching every one of them.
 *
 * The first attempt was a zero-height `flex-basis: 100%` sibling inserted before each row start, which
 * is the standard way to break a flex line. Svelte rejects it outright: "an element that uses the
 * `animate:` directive must be the only child of a keyed {#each} block" — and the chips need
 * `animate:flip` to glide when the roster changes. So no extra elements, in or out of the list.
 *
 * A GRID needs none. Each chip is placed explicitly, and placing one at column 1 starts a new row for
 * free. Eight half-width tracks rather than four full ones is what makes RAGGED rows centre on integer
 * columns — a chip spans 2, so a row of `sz` spans `2·sz` and its leading offset is `4 − sz`:
 *
 *      row of 4 → cols 1,3,5,7   (spans 1-8, flush)
 *      row of 3 → cols 2,4,6     (spans 2-7, one half-chip of air each side)
 *      row of 2 → cols 3,5       (spans 3-6)
 *
 * With four tracks a row of three could only sit flush left or a whole chip off-centre; with eight it
 * lands exactly centred, which is what the 4/2 and 3/2 tapers need to look deliberate rather than
 * ragged. Grid also fixes the resize complaint by construction: the counts are placed, not discovered,
 * so they cannot change with the window.
 */

/** Half-width tracks in the children grid. A chip spans two. */
export const GRID_TRACKS = MAX_PER_ROW * 2;

/**
 * The `grid-column-start` for every child, by index — the whole layout in one array.
 * Returns [] for an empty set, so a caller can treat "no plan" and "no children" alike.
 */
export function chipColumns(n: number): number[] {
	const cols: number[] = [];
	for (const size of childRowPlan(n)) {
		const lead = MAX_PER_ROW - size; // half-chip tracks of air on the left
		for (let j = 0; j < size; j++) cols.push(1 + lead + j * 2);
	}
	return cols;
}
