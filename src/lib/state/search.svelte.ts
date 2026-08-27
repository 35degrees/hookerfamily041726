/**
 * search.svelte.ts — THE SEARCH SUBJECT, and the only thing that knows how to search.
 *
 * Pure logic, no DOM. The search modal renders it; connect-to-anyone will reuse it with a different
 * pick handler (see SearchResults' injected `onpick`) — which is the whole reason the scan lives
 * here and not inside a component.
 *
 * THE LINE THIS MODULE DRAWS: what survives the modal closing lives here (the index, the query, the
 * categories, the year range, the recent searches); what dies with the view lives in the component
 * (focused row, hover, scroll offset). That is not tidiness — it is the feature. Close search,
 * reopen it, and your query and filters are still there, which matters because with 19,728 people
 * you BROWSE: pick Hartford Founders, click someone, come back, and the 12 are still on screen.
 *
 * NO isSearching / isError / result cache, deliberately. A linear scan over a resident array cannot
 * be pending and cannot fail, and a 7ms computation is cheaper to redo than to cache and invalidate.
 * Those fields would be the `--ring-live` trap: a mechanism whose presence implies behaviour that
 * does not exist, which every later reader then has to prove is inert.
 *
 * WHY A LINEAR SCAN AND NOTHING CLEVER: measured 082726 over all 19,728 rows — 7.1ms typical,
 * 11.7ms worst ("t", 17,874 hits), inside a single 16.7ms frame. An inverted index or trigram table
 * would add a build step and real complexity to save a few milliseconds.
 */
import { fold } from '$lib/search/fold.js';

/** One row of static/data/search-index.json. Built by `searchRow()` in regenerate-data.js. */
export type SearchRow = {
	id: string;
	slug: string;
	n: string;
	by: number | null;
	dy: number | null;
	g: number | null;
	sx: string | null;
	/** Category bitfield — see CAT. */
	f: number;
	/** Field-tagged, folded fact blob. Segment 0 is always `n:` and is the ranking haystack. */
	x: string;
	/** Display blurb, UNFOLDED. 16% of rows. Line two falls back to this on a name match. */
	bl?: string;
	/**
	 * Estimated birth year — A SORT KEY ONLY, NEVER RENDERED. An era guess, not a fact; displaying
	 * it as a date would be inventing data. Present on 781 of the 1,920 undated rows (680 placed by
	 * generation, 101 by death year); the other 1,139 have no signal and still sort last.
	 */
	eb?: number;
};

/** Prepared once at load: segment 0 split out so ranking never re-parses or re-folds. */
export type Prepared = SearchRow & { nm: string; wd: string[] };

export const CAT = { HD: 1, SPOUSE: 2, INLAW: 4, INFLUENCE: 8, FOUNDER: 16 } as const;

/** Chip order as Sam specified it: All first, then these five. Counts are the 082726 build. */
export const CATEGORIES = [
	{ mask: CAT.HD, label: 'Hooker descendants', count: 12871 },
	{ mask: CAT.SPOUSE, label: 'Spouses', count: 5919 },
	{ mask: CAT.INLAW, label: 'Notable In-Laws', count: 530 },
	{ mask: CAT.INFLUENCE, label: 'Major Influences', count: 96 },
	{ mask: CAT.FOUNDER, label: 'Hartford Founders', count: 12 }
] as const;

/**
 * Rendered rows are capped; `total` is always the TRUE count so the UI can say "343 matches,
 * showing 60" rather than implying it found sixty. Design §44: no silent caps.
 * A query returning hundreds wants narrowing — which is what the chips and the year range are for —
 * so the cap is deliberately a prompt to filter, not a virtualised scrolling machine.
 */
export const RESULT_CAP = 60;

/**
 * Not for performance — the scan is 7ms. This exists so we don't build and tear down 60 DOM rows
 * for the intermediate strings of a fast typist, which nobody reads.
 */
const DEBOUNCE_MS = 110;

const INDEX_URL = '/data/search-index.json';
const RECENT_MAX = 8;

/**
 * PLAIN ARRAY, NOT `$state` — and this is load-bearing. Svelte 5 deep-proxies objects and arrays
 * put into `$state`, so 19,728 rows would become 19,728 proxies and every hot-loop property read
 * would go through a trap. The index is fetched once and never mutated, so it needs no reactivity;
 * `ready` is the single reactive bit that tells the derived it has arrived.
 */
let index: Prepared[] = [];
let ready = $state(false);
let loadStarted = false;

/** What the input shows — updates on every keystroke. */
let text = $state('');
/** What the scan actually runs on — `text` after the debounce settles. */
let applied = $state('');
let cats = $state(0);
let yearFrom = $state<number | null>(null);
let yearTo = $state<number | null>(null);
let recent = $state<string[]>([]);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Fetch + prepare, once per session. Idempotent; safe to call on every modal open. */
export async function load(): Promise<void> {
	if (loadStarted) return;
	loadStarted = true;
	try {
		const res = await fetch(INDEX_URL);
		if (!res.ok) throw new Error(`search index ${res.status}`);
		const raw: SearchRow[] = await res.json();
		// One pass, ~5ms. Pulls the `n:` segment out ONCE so tier() never folds or splits at query
		// time — leaving that inside the sort was measured at 2,238ms for "t" (O(n log n) Unicode
		// normalizes) against 11.7ms once hoisted.
		index = raw.map((r) => {
			const end = r.x.indexOf('|');
			const nm = end < 0 ? r.x.slice(2) : r.x.slice(2, end);
			return Object.assign(r, { nm, wd: nm.split(' ') }) as Prepared;
		});
		ready = true;
	} catch (err) {
		// Let it retry on the next open rather than latching a permanent failure.
		loadStarted = false;
		throw err;
	}
}

/**
 * Relevance tier, low is better. Tested against the `n:` segment, which carries EVERY name form —
 * display, first, middle, last, maiden, married, title, suffix, nickname, chip_first_name.
 * Nicknames being in there is why "tony" ranks Anthony Shreve Hooker as a NAME hit (1) rather than a
 * fact hit (5); "tony" is not a substring of "anthony", so on display_name alone he is unreachable.
 */
function tier(r: Prepared, term: string): number {
	if (r.nm === term) return 0; // the whole name is the term
	if (r.wd.includes(term)) return 1; // a whole name word is the term
	if (r.nm.startsWith(term)) return 2; // the name starts with it
	for (const w of r.wd) if (w.startsWith(term)) return 3; // a name word starts with it
	if (r.nm.includes(term)) return 4; // anywhere in the name
	return 5; // a fact field only
}

/** Folded query terms. Multi-term is an AND across the whole blob. */
const terms = $derived(fold(applied).split(/\s+/).filter(Boolean));

/**
 * ONE derived holding both rows and total. `$derived` already memoizes on its dependencies, so
 * there is no hand-rolled cache here — a second derived calling this again would recompute nothing.
 */
const result = $derived.by((): { rows: Prepared[]; total: number } => {
	if (!ready) return { rows: [], total: 0 };
	// Empty box with a category selected BROWSES that category (Sam, 082726) — it makes the small
	// categories genuinely explorable: 12 Hartford Founders, 96 Major Influences. Empty box with no
	// category stays empty, because 60 arbitrary rows out of 19,728 mean nothing.
	if (!terms.length && !cats) return { rows: [], total: 0 };

	const hits: Prepared[] = [];
	for (const r of index) {
		if (cats && !(r.f & cats)) continue;
		// The undated are EXEMPT from the year range, never hidden by it (Sam, 082726): 1,920 people
		// have no birth year, and a slider that silently swallowed them would be a lie about the
		// corpus. The range narrows the dated; it does not filter away the unknown.
		// `!= null` is LOOSE on purpose — it catches undefined as well as null. Today the index only
		// ever writes null (1,920 rows), but a strict check would silently start range-filtering the
		// undated the day a build omitted the key instead.
		//
		// KNOWN CONSEQUENCE, not a bug: exempt rows still sort last within their tier (null -> 9999),
		// so on a broad query they fall below the 60-row cap. "hooker" + 1800-1900 keeps all 107 of
		// them in `total`, but the first one ranks 1,006th. They are never filtered away; they are
		// simply not competitive for the visible sixty.
		if (yearFrom !== null && r.by != null && (r.by < yearFrom || r.by > (yearTo ?? yearFrom)))
			continue;
		let ok = true;
		for (const t of terms) {
			if (!r.x.includes(t)) {
				ok = false;
				break;
			}
		}
		if (ok) hits.push(r);
	}

	// DECORATE ONCE, then sort — tier() inside the comparator runs O(n log n) times and was the
	// 2,238ms bug. Secondary sort is birth year ascending: "notable" measured useless as a tiebreak
	// (18,429 of 19,728 carry the flag), while earliest-first surfaces the historically central
	// people — "yale" returns Davenport 1597, Newton 1620, Buckingham 1646, Pierson 1646,
	// Pierpont 1659, which is essentially Yale's founders in order.
	const first = terms[0] ?? '';
	// `eb` places the undated by era so the year-range exemption is visible rather than merely true:
	// before it, all 107 undated "hooker" rows survived the 1800-1900 filter but the first ranked
	// 1,006th, far below the 60-row cap.
	const dec = hits.map((r) => ({ r, t: first ? tier(r, first) : 5, b: r.by ?? r.eb ?? 9999 }));
	dec.sort((a, b) => a.t - b.t || a.b - b.b);
	return { rows: dec.slice(0, RESULT_CAP).map((d) => d.r), total: dec.length };
});

/** Segment tag -> the word shown on the row. `n` never surfaces: a name hit shows the blurb. */
const TAG_LABEL: Record<string, string> = {
	born: 'born',
	died: 'died',
	buried: 'buried',
	lived: 'lived',
	work: 'work',
	school: 'school',
	served: 'served',
	landmark: 'landmark',
	inst: 'institution',
	tag: 'tag',
	is: 'known for'
};

/** Tags whose segment is `city, state, county, country` rather than free text. */
const PLACE_TAGS = new Set(['born', 'died', 'buried', 'lived']);

const LOWER = new Set(['of', 'the', 'and', 'a', 'an', 'in', 'at', 'on', 'for', 'to']);

function titleCase(s: string): string {
	return s
		.split(' ')
		.map((w, i) => (i > 0 && LOWER.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
		.join(' ');
}

/**
 * WHY this row matched — the second line of a result. It is the only per-row field with 100%
 * coverage (a photo is 16%, a blurb 16%, neither 77%), which is why it and not the blurb is line two.
 *
 * Returns null when the hit was on the NAME, in which case the row shows `bl` instead — there is
 * nothing to explain about matching "Thomas" against Rev. Thomas Hooker.
 *
 * The text is title-cased because the blob is FOLDED and so lowercase and de-accented — you fold for
 * MATCHING and keep the original for DISPLAY, and `bl` is the only original kept. Title-casing is
 * right for the places, employers and schools this mostly surfaces (all proper nouns) and rough on a
 * prose blurb.
 */
export function reasonFor(r: SearchRow, term: string): { tag: string; text: string } | null {
	if (!term) return null;
	for (const seg of r.x.split('|')) {
		const i = seg.indexOf(':');
		const tag = seg.slice(0, i);
		if (tag === 'n') continue;
		const body = seg.slice(i + 1);
		if (!body.includes(term)) continue;
		const parts = body.split(', ');
		// A place segment is `city, state, county, country` (most specific first), so the reason
		// shows the leading two and drops the country, which is never the informative part:
		// `died:oyster bay, new york, nassau, united states` reads "Oyster Bay, New York".
		const shown = PLACE_TAGS.has(tag)
			? parts.filter((x) => x !== 'united states').slice(0, 2).length
				? parts.filter((x) => x !== 'united states').slice(0, 2)
				: parts.slice(0, 2)
			: parts;
		return { tag: TAG_LABEL[tag] ?? tag, text: shown.map(titleCase).join(', ') };
	}
	return null;
}

/** Remember a query the user actually acted on. Called by the UI when a result is picked. */
export function remember(q: string): void {
	const v = q.trim();
	if (!v) return;
	recent = [v, ...recent.filter((x) => x !== v)].slice(0, RECENT_MAX);
}

/** Type into the box: `text` updates now, the scan follows once typing settles. */
export function setText(v: string): void {
	text = v;
	if (debounceTimer) clearTimeout(debounceTimer);
	// Clearing the box must feel instant — there is nothing to compute and nothing to read.
	if (v === '') {
		applied = '';
		return;
	}
	debounceTimer = setTimeout(() => (applied = v), DEBOUNCE_MS);
}

export function toggleCategory(mask: number): void {
	cats = cats & mask ? cats & ~mask : cats | mask;
}

/** "All" — clears every chip rather than being a sixth chip with a bit of its own. */
export function selectAll(): void {
	cats = 0;
}

export function setYears(from: number | null, to: number | null): void {
	yearFrom = from;
	yearTo = to;
}

/** Reset the query but KEEP the index and the recent list. */
export function clear(): void {
	if (debounceTimer) clearTimeout(debounceTimer);
	text = '';
	applied = '';
	cats = 0;
	yearFrom = null;
	yearTo = null;
}

export const search = {
	get ready() {
		return ready;
	},
	/** Bound to the input. */
	get text() {
		return text;
	},
	/** The debounced query the rows actually reflect. */
	get applied() {
		return applied;
	},
	/** First folded term — what `reasonFor` should be asked about, and what ranking used. */
	get term() {
		return terms[0] ?? '';
	},
	get cats() {
		return cats;
	},
	get yearFrom() {
		return yearFrom;
	},
	get yearTo() {
		return yearTo;
	},
	/** At most RESULT_CAP rows. */
	get rows() {
		return result.rows;
	},
	/** TRUE match count, pre-cap. */
	get total() {
		return result.total;
	},
	get capped() {
		return result.total > RESULT_CAP;
	},
	get recent() {
		return recent;
	},
	/** Nothing typed and no chip picked — the modal's resting state. */
	get idle() {
		return applied === '' && cats === 0;
	}
};
