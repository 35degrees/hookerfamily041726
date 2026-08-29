/**
 * kin.ts — HOW TWO PEOPLE ARE RELATED, walked at runtime.
 *
 * THIS IS THE FIRST THING IN THE PROJECT THAT WALKS THE FAMILY GRAPH IN THE BROWSER, and that is
 * forced rather than chosen. `pathsToThomas` is baked because Thomas is ONE fixed target, so the
 * question is N. An arbitrary PAIR is N², and 19,728² is not a payload. What a runtime walk needs is a
 * resident parent map, and it has one: `fa`/`mo`/`hp` ride the search-index row the picker already
 * fetches (see the note at `searchRow` in regenerate-data.js for why there and not in a file of its own).
 *
 * IT DOES NOT BREAK THE §2 BUILD-TIME DOCTRINE, and it is worth saying why rather than leaving it to be
 * argued later. That doctrine exists because a runtime `$derived` doing DATE ARITHMETIC on hole-prone
 * fields produces NaN geometry or a throw that tears down the card subtree — its own corollary is that
 * "runtime derivations are lookups that degrade to null". Everything here is integer graph walking over
 * ids that either resolve or do not, and every function returns null when it finds nothing. No
 * coordinate, no date, no clock.
 *
 * PURE, AND THE LOOKUP IS AN ARGUMENT. Nothing here imports the search store, so the same code can be
 * replayed from a node script against the raw index — which is how it is checked against the build's own
 * `kinDistance` (regenerate-data.js), the only other thing in this project that answers this question.
 */

/** The three fields of a search-index row this module reads, plus sex for the wording. */
export interface KinRow {
	id: string;
	/** father / mother. Absent on the 6,466 with no recorded parent. */
	fa?: string;
	mo?: string;
	/** For a married-in person: the Hooker partner whose ancestry the walk actually climbs. */
	hp?: string;
	sx?: string | null;
}

export type Lookup = (id: string) => KinRow | undefined;

/**
 * HOW FAR UP EITHER SIDE THE WALK GOES.
 *
 * The build's `kinDistance` caps at 10 per side; measured over the eligible corpus the longest ARM a
 * real connection needs is 12, so a 10 would silently answer "unrelated" for the tail. 14 leaves room
 * for the tail to grow with the tree and still bounds the walk at a few thousand nodes in the worst
 * pedigree-collapse case.
 */
export const MAX_UP = 14;

/**
 * A DANGLING PARENT ID IS "NO PARENT", not an error — and this is load-bearing rather than defensive.
 *
 * `searchRow` reads `parents.father_id` straight off canonical, but the index only holds VISIBLE people,
 * so the nine Talcott-severance seam records point at parents who were hidden (design §25.2 — "byId IS
 * the visibility graph"). Every chip in the app already degrades through exactly this shape, in
 * `neighborhood()`'s `cm()`. The walk stops there rather than throwing, which is right: an ancestor the
 * UX has hidden is an ancestor this modal cannot show a rung for either.
 */
function parentsOf(row: KinRow | undefined, at: Lookup): string[] {
	if (!row) return [];
	const out: string[] = [];
	for (const q of [row.fa, row.mo]) if (q && at(q)) out.push(q);
	return out;
}

/**
 * Every ancestor of `id` with its MINIMUM depth, `id` itself at 0.
 *
 * Breadth-first so the first depth recorded is the shortest — a cousin marriage legitimately reaches the
 * same ancestor twice, by two routes of different length, and the short one is the answer. This is
 * `ancestorDepths` from regenerate-data.js, same algorithm and same reason, over the client's map.
 */
export function ancestorDepths(id: string, at: Lookup, cache?: Map<string, Map<string, number>>) {
	const hit = cache?.get(id);
	if (hit) return hit;
	const depths = new Map<string, number>([[id, 0]]);
	let frontier = [id];
	for (let depth = 1; depth <= MAX_UP && frontier.length; depth++) {
		const next: string[] = [];
		for (const cur of frontier) {
			for (const q of parentsOf(at(cur), at)) {
				if (!depths.has(q)) {
					depths.set(q, depth);
					next.push(q);
				}
			}
		}
		frontier = next;
	}
	cache?.set(id, depths);
	return depths;
}

/**
 * THE CHAIN from `id` up to `lca` in exactly `up` hops, PATERNAL-FIRST at every divergence.
 *
 * Returned TOP-DOWN — the rung just below the LCA first, `id` last — because that is the order the
 * column is painted in, and because a column that had to be reversed at the call site is a second place
 * for the order to be decided.
 *
 * The tiebreak is the ladder's own (`paternalKey`, regenerate-data.js): where two routes of equal length
 * reach the same ancestor, the one through the FATHER wins. Not because fathers matter more, but because
 * the alternative — comparing id sequences — is stable and NOT EXPLAINABLE: it orders by who happened to
 * be catalogued first. Ahnentafel puts the father first at every level, so this is the convention every
 * pedigree chart the audience has ever read already uses.
 */
function chainTo(id: string, lca: string, up: number, at: Lookup): string[] | null {
	if (up === 0) return id === lca ? [] : null;
	const row = at(id);
	if (!row) return null;
	// Father before mother — and the ORDER OF THIS ARRAY IS THE TIEBREAK. Do not sort it.
	for (const q of [row.fa, row.mo]) {
		if (!q || !at(q)) continue;
		const rest = chainTo(q, lca, up - 1, at);
		if (rest) return [...rest, id];
	}
	return null;
}

export interface Connection {
	/** The shared ancestor at the apex of the V. */
	lca: string;
	/** Top-down: the rung under the apex, down to A's bloodline self. Excludes the apex. */
	left: string[];
	right: string[];
	/** Generations from the apex to each end. `left.length` / `right.length`, named for the wording. */
	upA: number;
	upB: number;
	/** Set when that end is married-in: the person to hang off the last rung of their column. */
	spouseA?: string;
	spouseB?: string;
}

/**
 * A CALLER-OWNED MEMO for `ancestorDepths`, threaded through `connect`.
 *
 * Deliberately NOT module-level. The index is immutable for the session, so a module cache would be
 * correct — and it would also outlive every surface that used it, which is the pattern `search.svelte.ts`
 * draws a line against: what dies with the view is owned by the view. A connect session re-walks the
 * SUBJECT's ancestry on every pick and that walk is identical every time, which is the whole saving; the
 * far end's walk is new each pick and caches nothing useful.
 *
 * Lifetime is the COMPONENT's, not the open modal's: entries are keyed by person id over an index that
 * is immutable for the session, so a stale entry is merely unused and never wrong, and the map is bounded
 * by how many people the reader picks.
 */
export type KinCache = Map<string, Map<string, number>>;

/**
 * THE CONNECTION between two people, or null when there is no shared ancestor inside `MAX_UP`.
 *
 * BOTH ENDS RESOLVE TO A BLOODLINE PERSON FIRST. A married-in person has no ancestors that lead anywhere
 * near the other end — their route to the line runs through whoever they married — so `hp` substitutes
 * the partner and the married-in person becomes the card hanging off that partner's rung. This is the
 * spouse ladder's shape (design §44.11) with the same reasoning, and it is what carries the answer rate
 * from 66% to 99.5%: measured over the eligible corpus, two people who are each either ON the line or
 * married to it essentially always share an ancestor.
 *
 * ONE PATH, THE SHORTEST (Sam) — so ties have to be broken and the rule is stated rather than left to
 * Map iteration order:
 *   1. fewest total generations         — "shortest" means what it says
 *   2. then the most BALANCED V         — of two equally-long routes, the nearer common ancestor; it is
 *                                         also the shorter pair of columns, which is what has to fit
 *   3. then paternal-first on A's side, then on B's — via `chainTo`, above
 */
export function connect(aId: string, bId: string, at: Lookup, cache?: KinCache): Connection | null {
	const ra = at(aId);
	const rb = at(bId);
	if (!ra || !rb) return null;
	const rootA = ra.hp && at(ra.hp) ? ra.hp : aId;
	const rootB = rb.hp && at(rb.hp) ? rb.hp : bId;
	// The two ends resolve to the SAME bloodline person — a married-in pair on one rung, or someone
	// asked to connect to their own spouse. There is no V to draw; the caller says so in words.
	if (rootA === rootB) return null;

	const A = ancestorDepths(rootA, at, cache);
	const B = ancestorDepths(rootB, at, cache);
	let best: { lca: string; a: number; b: number } | null = null;
	for (const [id, da] of A) {
		const db = B.get(id);
		if (db == null) continue;
		if (
			!best ||
			da + db < best.a + best.b ||
			(da + db === best.a + best.b && Math.max(da, db) < Math.max(best.a, best.b))
		) {
			best = { lca: id, a: da, b: db };
		}
	}
	if (!best) return null;

	const left = chainTo(rootA, best.lca, best.a, at);
	const right = chainTo(rootB, best.lca, best.b, at);
	// The depths came from the BFS and the chains are rebuilt by a separate walk, so a disagreement
	// between them is a real inconsistency rather than a miss — say nothing rather than draw half a V.
	if (!left || !right) return null;

	return {
		lca: best.lca,
		left,
		right,
		upA: best.a,
		upB: best.b,
		...(rootA !== aId ? { spouseA: aId } : {}),
		...(rootB !== bId ? { spouseB: bId } : {})
	};
}

// ── THE WORDS ───────────────────────────────────────────────────────────────────────────────────

/**
 * A GENDERED WORD MUST NEVER FALL THROUGH TO A DEFAULT (design §25.6).
 *
 * `computeInLawLabel` once had no guard here and silently printed "Father-in-law" for nine women. So
 * every gendered term is a triple and an unknown sex takes the third — a real, ungendered English word,
 * never a guess and never a blank.
 */
function g(sx: string | null | undefined, male: string, female: string, neutral: string): string {
	return sx === 'm' ? male : sx === 'f' ? female : neutral;
}

/** 1 -> "1st". Sam's own phrasing: "the 7th cousin twice removed". */
function ord(n: number): string {
	const t = n % 100;
	if (t >= 11 && t <= 13) return `${n}th`;
	return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

const TIMES = ['', 'once', 'twice', 'three times', 'four times', 'five times', 'six times'];
function removed(n: number): string {
	if (n === 0) return '';
	return ` ${TIMES[n] ?? `${n} times`} removed`;
}

/** "great-great-grandfather" — `extra` greats in front. */
function greats(extra: number, base: string): string {
	return extra <= 0 ? base : `${'great-'.repeat(extra)}${base}`;
}

/**
 * WHAT A IS TO B, given how far each stands below their shared ancestor.
 *
 * `upA` is A's generations up to the apex, `upB` is B's. The whole taxonomy falls out of the pair:
 *
 *   upA = 0            A IS the shared ancestor  -> A is B's (great-)grandparent
 *   upB = 0            the mirror                -> A is B's (great-)grandchild
 *   upA = upB = 1      one set of parents        -> siblings
 *   min = 1            one is the other's parent's sibling -> aunt/uncle, niece/nephew, with greats
 *   min >= 2           cousins, degree min-1, removed |upA-upB|
 *
 * Measured over the eligible corpus this is 98.5% cousins, 1% avuncular, 0.3% lineal — but the rare
 * branches are the ones the SWAP actually changes (a grandson becomes a grandfather where a cousin only
 * changes places), so they are the reason the sentence is worth stating at all.
 */
export function describe(upA: number, upB: number, sxA: string | null | undefined): string {
	if (upA === 0 && upB === 0) return g(sxA, 'the same man as', 'the same woman as', 'the same person as');
	// A is the ancestor.
	if (upA === 0) {
		if (upB === 1) return g(sxA, 'the father of', 'the mother of', 'the parent of');
		return `the ${greats(upB - 2, g(sxA, 'grandfather', 'grandmother', 'grandparent'))} of`;
	}
	// A is the descendant.
	if (upB === 0) {
		if (upA === 1) return g(sxA, 'the son of', 'the daughter of', 'the child of');
		return `the ${greats(upA - 2, g(sxA, 'grandson', 'granddaughter', 'grandchild'))} of`;
	}
	if (upA === 1 && upB === 1) return g(sxA, 'the brother of', 'the sister of', 'the sibling of');
	// One of them is a sibling of the other's (great-)grandparent.
	if (upA === 1) {
		return `the ${greats(upB - 2, g(sxA, 'uncle', 'aunt', 'aunt or uncle'))} of`;
	}
	if (upB === 1) {
		return `the ${greats(upA - 2, g(sxA, 'nephew', 'niece', 'nephew or niece'))} of`;
	}
	return `the ${ord(Math.min(upA, upB) - 1)} cousin${removed(Math.abs(upA - upB))} of`;
}

/** One end of the sentence. */
export interface End {
	/** The CASUAL name — `chip_first_name ?? first_name`, never the display name. See `sentence`. */
	name: string;
	/** The named person's sex. Drives both the relationship word and wife/husband. */
	sx?: string | null;
	/** When this end is married in: the casual name of the partner whose line the walk actually climbed. */
	of?: string;
}

/**
 * THE MARRIED-IN CHOOSER POSSESSES; THEIR PARTNER IS THE SUBJECT — "Joseph's wife Christine".
 *
 * This was backwards for a round and the error was substantive rather than cosmetic. Joseph married in,
 * so the walk climbed CHRISTINE's ancestry, and Christine is the one who is a fifth cousin of anybody.
 * Printing "Christine's husband Joseph is the 5th cousin" claimed a blood relationship for the one
 * person in the sentence who does not have it. Sam: "that's impossible its joseph's wife christine that
 * is the fifth cousin".
 *
 * So the person the reader CHOSE takes the possessive — they are how we got here — and the person the
 * relationship belongs to is named as its subject. Both gendered words then agree with that subject:
 * "wife" is Christine's role, and "fifth cousin" is her relationship.
 */
function subject(e: End): string {
	return e.of ? `${e.of}'s ${g(e.sx, 'husband', 'wife', 'spouse')} ${e.name}` : e.name;
}

/**
 * The whole line: "Sam is the great-great-grand-nephew of Charles."
 *
 * CASUAL NAMES, NOT DISPLAY NAMES (Sam). A card is a label under a portrait and wants the full form;
 * prose wants the name a person is CALLED. "Samuel Talcott Hooker is the great-great-grand-nephew of
 * Rev. Charles Chauncey Hooker" buries the one fact the line exists to state, which is the relationship
 * in the middle. Callers pass `cf ?? fn` — the sibling chip's own rule.
 *
 * The SUBJECT is the left column's end, which is what will make the swap mean something: reverse the
 * two and the sentence re-reads from the other side. For a cousin relation only the names move —
 * cousinhood is symmetric, including the removal — and for the lineal and avuncular cases the WORD
 * itself turns over, which is the fact that gesture exists to show.
 */
export function sentence(a: End, b: End, upA: number, upB: number): string {
	const line = `${subject(a)} is ${describe(upA, upB, a.sx)} ${subject(b)}`;
	// A GENERATIONAL SUFFIX ALREADY ENDS THE SENTENCE. Casual names rarely carry one, but "Tom Jr." can,
	// and the naive append gave "…of Tom Jr..". English sets one period here and so does this.
	return /\.$/.test(line) ? line : `${line}.`;
}
