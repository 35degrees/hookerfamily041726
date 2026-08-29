/**
 * search.svelte.ts — THE SEARCH SUBJECT, and the only thing that knows how to search.
 *
 * Pure logic, no DOM — which is the whole reason the scan lives here and not inside a component.
 * TWO surfaces render it, and they do not share a line of markup: `SearchModal` (the full instrument —
 * chips, year range, tags, blurbs) and `ConnectAnyoneModal`'s picker (name, years, star, and a `gate`).
 * That separation is deliberate and load-bearing; see design §46.2. What is shared is this module and
 * the index it holds, never a component.
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
	/**
	 * Dates are PRIVATE (presumed living, not notable) — 241 rows. by/dy are still present because
	 * rosters sort on them, but a row carrying this MUST NOT display years. Same gate every other
	 * render site in the app reads.
	 */
	pv?: boolean;
	/** Display blurb, UNFOLDED. 16% of rows. Line two falls back to this on a name match. */
	bl?: string;
	/** `notable.is_notable === true` — 1,128 rows (5.7%). Sorts ahead of the merely dated. */
	nb?: boolean;
	/** Portrait URL. 3,083 rows. Same field the card and the ladder read. */
	ph?: string;
	/**
	 * PARENT EDGES — father / mother. Absent on the 6,466 with no recorded parent.
	 *
	 * Connect-to-anyone walks these in the browser, because an arbitrary PAIR cannot be baked (that is
	 * N², where `pathsToThomas` is N against one fixed target). They ride HERE rather than in a file of
	 * their own because this row already carries everything a rung paints, so one fetch serves the
	 * picker and the ladder both — see `searchRow` in regenerate-data.js for the three options weighed.
	 */
	fa?: string;
	mo?: string;
	/** For a married-in person: the Hooker partner whose ancestry the walk actually climbs. */
	hp?: string;
	/** `bio.chip_first_name` — the name a person is actually called. Opt-in, ~240 rows. */
	cf?: string;
	/** `bio.first_name`. The casual name is `cf ?? fn ?? n`, which is the sibling chip's own rule. */
	fn?: string;
	/** Chip short name, present only when it differs from `n`. Read by the V's paired spouse card. */
	sn?: string;
	/** Generational suffix ("III"). Shown only where a married-in person is named alone. */
	sf?: string;
	/**
	 * Estimated birth year — A SORT KEY ONLY, NEVER RENDERED. An era guess, not a fact; displaying
	 * it as a date would be inventing data. Present on 781 of the 1,920 undated rows (680 placed by
	 * generation, 101 by death year); the other 1,139 have no signal and still sort last.
	 */
	eb?: number;
};

/** Prepared once at load: segment 0 split out so ranking never re-parses or re-folds. */
export type Prepared = SearchRow & { nm: string; wd: string[]; nd: string; tg: string[] };

export const CAT = { HD: 1, SPOUSE: 2, INLAW: 4, INFLUENCE: 8, FOUNDER: 16 } as const;

/**
 * Chip order as Sam specified it: All first, then these five.
 *
 * NO COUNTS HERE. They were literals — 12871 / 5919 / 530 / 96 / 12 — and the 530 was already wrong
 * within a day, stale the moment three presidents lost `is_easter_egg` in canonical. A hard-coded
 * corpus figure in Stream B is a promise that Stream A will never change, which is the one promise
 * this repo cannot make: the whole point of the pipeline is that canonical moves and everything
 * downstream re-derives. Counts now come from `search.counts`, computed from the index that was
 * actually loaded.
 */
export const CATEGORIES = [
	{ mask: CAT.HD, key: 'hd', label: 'Hooker descendants' },
	{ mask: CAT.SPOUSE, key: 'spouse', label: 'Spouses' },
	{ mask: CAT.INLAW, key: 'ee', label: 'Notable In-Laws' },
	{ mask: CAT.INFLUENCE, key: 'orbit', label: 'Major Influences' },
	{ mask: CAT.FOUNDER, key: 'founder', label: 'Hartford Founders' }
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
const VOCAB_URL = '/data/tag-vocab.json';
/** Shared so the ~14,000 tagless rows all point at one array rather than 14,000 empty ones. */
const EMPTY_TAGS: string[] = [];
/** How many tags the discovery row offers per visit. */
export const TAG_SAMPLE = 9;
/** At most two at a time (Sam) — a third is a filter, not a suggestion. */
export const TAG_MAX = 2;
const RECENT_MAX = 8;

/**
 * PLAIN ARRAY, NOT `$state` — and this is load-bearing. Svelte 5 deep-proxies objects and arrays
 * put into `$state`, so 19,728 rows would become 19,728 proxies and every hot-loop property read
 * would go through a trap. The index is fetched once and never mutated, so it needs no reactivity;
 * `ready` is the single reactive bit that tells the derived it has arrived.
 */
let index: Prepared[] = [];
/**
 * id -> row, built in the same pass as `index`.
 *
 * Connect-to-anyone walks the parent graph over `fa`/`mo`, which means thousands of lookups per path,
 * and it renders each rung from the row it lands on. A `.find()` over 19,728 entries per hop would be
 * the 2,238ms comparator bug in a second costume — the fix there was to compute once rather than
 * per-comparison, and this is the same rule applied before the mistake instead of after it.
 */
let byId: Map<string, Prepared> = new Map();
let ready = $state(false);
/** The schema's §6 canonical tag names, spaced to match the folded form stored on each row. */
let canonTags: Set<string> = new Set();
/** Memoised so every caller awaits the SAME work rather than skipping it — see load(). */
let loadPromise: Promise<void> | null = null;

/** What the input shows — updates on every keystroke. */
let text = $state('');
/** What the scan actually runs on — `text` after the debounce settles. */
let applied = $state('');
let cats = $state(0);
let yearFrom = $state<number | null>(null);
let yearTo = $state<number | null>(null);
let recent = $state<string[]>([]);
/** The tags currently switched on. AND'd — see `result`. */
let tags = $state<string[]>([]);
/** The handful offered this visit. Re-rolled by `rollTags()` when the modal opens. */
let tagPool = $state<string[]>([]);

/**
 * WHO IS EVEN ELIGIBLE, set by the surface rather than by the user.
 *
 * Connect-to-anyone can only draw a path to someone the tree can actually reach: a Hooker descendant, or
 * someone married to one (whose route runs through their partner). An orbit figure has no blood path by
 * definition — that is what makes them orbit — so offering them would be offering a result that cannot
 * be answered. Measured over the corpus, restricting both ends this way is what takes the answer rate
 * from 66% to 99.9%.
 *
 * IT IS NOT `cats`, AND THAT DISTINCTION IS THE POINT. `cats` is the user's own filter, shown as the lit
 * chip they clicked; writing this into it would light a chip nobody chose, and then clearing "All" would
 * silently widen the picker to people it cannot serve. This is a floor the surface holds; that is a
 * choice the reader makes. They AND together.
 */
let gate = $state(0);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Fetch + prepare, once per session.
 *
 * THE PROMISE IS MEMOISED, NOT A BOOLEAN, and that distinction was a live bug. Guarding on a boolean
 * handed a SECOND caller a promise that resolved immediately while the fetch was still in flight, so
 * anything awaiting it ran against an empty index. It surfaced as the tag row being blank on the
 * FIRST visit and full on the second: the trigger warms the index on hover, so by the time the modal
 * opened the load had already begun, and `.then(rollTags)` fired against a vocabulary that did not
 * exist yet.
 *
 * "Idempotent" has to mean every caller awaits the same work, not that later callers skip it.
 */
export function load(): Promise<void> {
	if (loadPromise) return loadPromise;
	loadPromise = (async () => {
		// Both in parallel — the vocab is ~2KB and must not add a round trip to the index's 1.2MB.
		const [res, vres] = await Promise.all([fetch(INDEX_URL), fetch(VOCAB_URL)]);
		if (!res.ok) throw new Error(`search index ${res.status}`);
		if (vres.ok) {
			const names: string[] = await vres.json();
			// Stored tags are folded with underscores turned into spaces; match that form.
			canonTags = new Set(names.map((n) => n.replace(/_/g, ' ')));
		}
		const raw: SearchRow[] = await res.json();
		// One pass, ~5ms. Pulls the `n:` segment out ONCE so tier() never folds or splits at query
		// time — leaving that inside the sort was measured at 2,238ms for "t" (O(n log n) Unicode
		// normalizes) against 11.7ms once hoisted.
		index = raw.map((r) => {
			const end = r.x.indexOf('|');
			const nm = end < 0 ? r.x.slice(2) : r.x.slice(2, end);
			// Split on commas AS WELL as spaces: segment parts are comma-joined, so a plain space
			// split yields "hooker," which never equals "hooker" and silently costs a tier.
			return Object.assign(r, {
				nm,
				wd: nm.split(/[\s,]+/).filter(Boolean),
				// THE DISPLAY NAME ALONE — the first comma part of the `n:` segment, since `factSegments`
				// pushes display_name before every other name form. Tiers 0 and 2 test THIS and not the
				// other parts; see tier() for the surname that made the difference.
				nd: nm.split(', ')[0] ?? nm,
				// The row's own tags, parsed once. Only 5,369 of 19,728 rows carry any, so most of these
				// are the same empty array and cost nothing.
				tg: (() => {
					const seg = r.x.split('|').find((x) => x.startsWith('tag:'));
					return seg ? seg.slice(4).split(', ').filter(Boolean) : EMPTY_TAGS;
				})()
			}) as Prepared;
		});
		byId = new Map(index.map((r) => [r.id, r]));
		ready = true;
	})();
	// Let it retry on the next open rather than latching a permanent failure.
	loadPromise.catch(() => {
		loadPromise = null;
	});
	return loadPromise;
}

/**
 * Relevance tier, low is better. Tested against the `n:` segment, which carries EVERY name form —
 * display, first, middle, last, maiden, married, title, suffix, nickname, chip_first_name.
 * Nicknames being in there is why "tony" ranks Anthony Shreve Hooker as a NAME hit rather than a
 * fact hit; "tony" is not a substring of "anthony", so on display_name alone he is unreachable.
 *
 * THE WHOLE QUERY IS RANKED, not just its first word. Ranking on `terms[0]` alone made every
 * multi-word query a one-word query: "annie hooker" scored purely on "annie", so an exact
 * "Annie Hooker" tied with everyone else called Annie and lost the tiebreak on birth year.
 */
function tier(r: Prepared, q: string, terms: string[]): number {
	/**
	 * TIERS 0 AND 2 TEST THE DISPLAY NAME, and nothing else. This took two goes.
	 *
	 * The `n:` segment is comma-joined: display name, then maiden, married, nickname, title, suffix.
	 * First it tested the WHOLE segment — `nm === q` — so George Washington, whose segment reads
	 * `george washington, general`, could never reach tier 0 and fell in with every namesake.
	 *
	 * The fix was to test the PARTS, and that overshot in the other direction. Every one of those name
	 * fields is a part, and most of them are a single surname: searching "brown" put Emily Labouisse
	 * Rooks at tier 0 because her MAIDEN NAME is Brown, ahead of Sarah Brown Hooker Capron, who is
	 * actually called it. A bare surname sitting in one field is not "the whole name is the query".
	 *
	 * The display name is what "their name IS the query" means. Every other form still reaches tier 1
	 * through the word test, which is the right weight for them — a maiden name is a real way to find
	 * someone, just not evidence that you have found THE person of that name.
	 */
	if (r.nd === q) return 0; // the DISPLAY NAME is the query
	if (terms.every((t) => r.wd.includes(t))) return 1; // every term is a whole name word
	if (r.nd.startsWith(q)) return 2; // the display name starts with the query
	if (terms.every((t) => r.wd.some((w) => w.startsWith(t)))) return 3; // every term starts a word
	if (r.nm.includes(q)) return 4; // the query appears in the name
	return 5; // a fact field only
}

/**
 * Corpus size and per-category counts, DERIVED from the loaded index rather than written down.
 *
 * One pass over 19k rows the first time `ready` flips, then memoized by `$derived` — the index is
 * fetched once and never mutated, so there is nothing to invalidate. Cheaper than the maintenance
 * cost of a literal, and it cannot be wrong.
 */
const corpus = $derived(ready ? index.length : 0);
/**
 * [earliest birth year, latest] in the LOADED corpus — the year slider's scale, derived rather than
 * written down for the same reason the counts are. It is 1550..2025 today; a 1540 record landing
 * tomorrow should move the scale without anyone editing a constant.
 */
const yearBounds = $derived.by((): [number, number] | null => {
	if (!ready) return null;
	let min = Infinity;
	let max = -Infinity;
	for (const r of index) {
		if (r.by == null) continue;
		if (r.by < min) min = r.by;
		if (r.by > max) max = r.by;
	}
	return min === Infinity ? null : [min, max];
});

/**
 * THE TAGS WORTH OFFERING — the intersection of what people actually carry and what the SCHEMA
 * sanctions.
 *
 * The first version took every distinct tag in the index, which is why the suggestion row served
 * `#not_yet_fully_entered`, `#duplicate_entry` and `#abcfm`. Schema §6 is explicit — "Only canonical
 * tags listed below are valid. Invented tags are a schema violation" — and the data does not obey it:
 * 642 distinct tags are in use and only 157 are canonical. Sampling the DATA meant sampling 485
 * invented ones, so roughly three offers in four were junk by construction.
 *
 * `tag-vocab.json` is parsed from the schema at build time, so the list has ONE owner and moves when
 * the schema does. If the fetch fails `canonTags` is empty and the row simply does not appear —
 * offering nothing beats offering housekeeping notes.
 *
 * What is left is the point of the feature: things nobody would think to type — `seven pillars`,
 * `compiler ancestor`, `indigenous rights`.
 */
const vocab = $derived.by(() => {
	if (!ready) return [] as string[];
	const set = new Set<string>();
	for (const r of index) for (const t of r.tg) if (canonTags.has(t)) set.add(t);
	return [...set].sort();
});

const counts = $derived.by(() => {
	const out: Record<number, number> = {};
	for (const c of CATEGORIES) out[c.mask] = 0;
	if (!ready) return out;
	for (const r of index) for (const c of CATEGORIES) if (r.f & c.mask) out[c.mask]++;
	return out;
});

/** Folded query terms. Multi-term is an AND across the whole blob. */
const terms = $derived(fold(applied).split(/\s+/).filter(Boolean));

/**
 * TERMS MATCH AT WORD BOUNDARIES, AND A SECOND WORD MEANS THE USER IS BEING SPECIFIC.
 *
 * Plain `x.includes(term)` matched mid-word across every field, which produced two different kinds
 * of noise. The reasonable kind: "lea davison" returned four Leavitt Davisons, because "lea" opens
 * "leavitt". The unreasonable kind: it also returned John Davison Rockefeller III, because "lea"
 * sits inside "mt. p-lea-sant". The second is indefensible at any query length.
 *
 * So every term must now start a word. That alone kills "pleasant". The rest is Sam's rule: "if a
 * user enters a second word they probably aren't looking for the partial word" — a specific query
 * that still has to be dredged is what makes Google feel like muck. With two or more terms, every
 * term BUT THE LAST must match a WHOLE word; the last stays a prefix because that is the one the
 * user is most likely still typing. So "lea davison" finds only Lea Davison, while "thomas h" still
 * narrows live as you type.
 *
 * Single-term queries stay loose — one word is a typeahead, not a specification, and there the
 * looseness is the feature.
 */
const matchers = $derived.by(() => {
	const n = terms.length;
	return terms.map((t, i) => {
		const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		// `(^|[^a-z0-9])` rather than a lookbehind: same meaning, and no Safari-version question.
		const wholeWord = n > 1 && i < n - 1;
		return new RegExp(`(^|[^a-z0-9])${esc}${wholeWord ? '(?![a-z0-9])' : ''}`);
	});
});

/**
 * ONE derived holding both rows and total. `$derived` already memoizes on its dependencies, so
 * there is no hand-rolled cache here — a second derived calling this again would recompute nothing.
 */
const result = $derived.by((): { rows: Prepared[]; total: number } => {
	if (!ready) return { rows: [], total: 0 };
	// Empty box with a category selected BROWSES that category (Sam, 082726) — it makes the small
	// categories genuinely explorable: 12 Hartford Founders, 96 Major Influences. Empty box with no
	// category stays empty, because 60 arbitrary rows out of 19,728 mean nothing.
	// THE GATE DOES NOT MAKE THE BOX NON-IDLE. An empty query still shows nothing, even with a floor set:
	// 18,790 eligible people are no more browsable than 19,728, and a picker that opens full of arbitrary
	// rows teaches the reader that the list is a list rather than an answer.
	if (!terms.length && !cats && !tags.length) return { rows: [], total: 0 };

	const hits: Prepared[] = [];
	for (const r of index) {
		// The SURFACE's floor first — a row the caller cannot serve should never reach the ranking, the
		// count, or the "N matches" line. See `gate`.
		if (gate && !(r.f & gate)) continue;
		if (cats && !(r.f & cats)) continue;
		/**
		 * AND, NOT OR — and it is the opposite of the category chips deliberately. I built OR first, on
		 * the grounds that an empty result is a dead end for a discovery surface. Sam's reading is the
		 * better one: adding a second tag is a NARROWING gesture. Nobody clicks `#spy` and then
		 * `#olympian` hoping for more spies; they are asking who is both. OR made the second click feel
		 * like it did nothing, because the count only ever went up.
		 *
		 * A chip is a KIND of person — blood, married-in, in-law — and those are alternatives, so OR is
		 * right there. A tag is an attribute, and attributes accumulate.
		 */
		if (tags.length && !tags.every((t) => r.tg.includes(t))) continue;
		/**
		 * THE RANGE FILTERS ON `by ?? eb` — the real birth year where there is one, the era ESTIMATE
		 * where there is not (Sam: "no birth year people can be 'estimated' based on lifespan of
		 * parents, spouse dates, etc, but we won't print the estimate").
		 *
		 * This supersedes the earlier "undated are exempt" rule, which was the right answer only while
		 * nothing could place them. `eb` places 781 of the 1,920 from generation or death year, so
		 * exempting those now would mean ignoring a position we already hold.
		 *
		 * THE 1,139 WITH NO SIGNAL AT ALL STAY EXEMPT, and that is the honest half of the same rule: a
		 * slider cannot narrow by a year nobody has, and silently dropping them would make the corpus
		 * look smaller than it is. They pass every range.
		 *
		 * THE ESTIMATE FILTERS BUT NEVER PRINTS. `eb` is a sort and filter key only; a row with no `by`
		 * still renders blank years, because showing a guess as a date would be inventing data — and
		 * Sam is filling these in over time, so the blank is also the to-do list.
		 *
		 * `!= null` is LOOSE on purpose: it catches undefined as well as null, so a build that omitted
		 * the key could not silently start range-filtering people it cannot place.
		 */
		if (yearFrom !== null) {
			const placed = r.by ?? r.eb;
			if (placed != null && (placed < yearFrom || placed > (yearTo ?? yearFrom))) continue;
		}
		let ok = true;
		for (const m of matchers) {
			if (!m.test(r.x)) {
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
	const q = terms.join(' ');
	// `eb` places the undated by era so the year-range exemption is visible rather than merely true:
	// before it, all 107 undated "hooker" rows survived the 1800-1900 filter but the first ranked
	// 1,006th, far below the 60-row cap.
	const dec = hits.map((r) => ({
		r,
		/**
		 * DIED YOUNG SINKS TO THE END, ahead of every other key including relevance (Sam). Searching
		 * "Annie Hooker" led with a four-year-old, 1861–1865: she is the EXACT name and so wins tier 0
		 * outright, which is why demoting her needed a key that outranks the tier rather than one
		 * inside it.
		 *
		 * The test is the house's, not a threshold of mine — `by && dy && dy - by <= 15`, the same
		 * computation regenerate-data.js bakes as `dy_young` and PersonBox reads to print "died young".
		 * Its comment says it MUST match diedYoung() in buildFeatured.ts; this is a third reader of the
		 * same rule, so it copies the rule exactly rather than picking a number that looks similar.
		 *
		 * They are demoted, never dropped: they stay in `total` and reachable, just never leading.
		 */
		dyoung: r.by != null && r.dy != null && r.dy - r.by <= 15 ? 1 : 0,
		t: q ? tier(r, q, terms) : 5,
		// Cohesion outranks notability on purpose: a notable whose terms are scattered across
		// unrelated fields is still not what was asked for, and putting fame ahead of relevance is
		// exactly the muck this is meant to avoid.
		c: cohesion(r, terms, q),
		// NOTABLE FIRST, THEN CHRONOLOGY (Sam). Search "Moffat" and you get a family cluster from the
		// late 1800s; four of the thirteen are notable, and those four are what a reader is actually
		// looking for. Relevance still leads — this only orders WITHIN a tier.
		//
		// I argued against this once, on the grounds that notability could not discriminate because
		// 18,429 of 19,728 carried it. THAT NUMBER WAS WRONG: it counted rows carrying a `notable`
		// OBJECT, most of them with the flag absent or false. The flag itself is on 1,128 rows (5.7%),
		// which is exactly the useful density.
		nb: r.nb ? 0 : 1,
		/**
		 * BLOOD BEFORE MARRIAGE, but only as a tiebreak — which is what lets one key serve both of Sam's
		 * cases. A SPECIFIC query is already separated by the tier: "Walter Hope" makes Walter a
		 * whole-name-word match and everyone else a fact match, so he leads on relevance and this key is
		 * never consulted. A VAGUE one — plain "hope" — puts a whole cohort in the same tier, and there
		 * the tree's own people should lead: Walter drops behind the two Hooker notables he was ahead of.
		 */
		hd: r.f & CAT.HD ? 0 : 1,
		b: r.by ?? r.eb ?? 9999
	}));
	dec.sort(
		(a, b) =>
			a.dyoung - b.dyoung || a.t - b.t || a.c - b.c || a.nb - b.nb || a.hd - b.hd || a.b - b.b
	);
	return { rows: dec.slice(0, RESULT_CAP).map((d) => d.r), total: dec.length };
});

/**
 * HOW TIGHTLY THE TERMS SIT TOGETHER. 0 = they appear as an adjacent PHRASE inside one field,
 * 1 = same field but apart, 2 = scattered across unrelated fields. Lower is better.
 *
 * "trinity college" is the case. 48 rows match, and most really did attend a Trinity College — but
 * Herbert Livingston Satterlee ranked second on `buried: trinity church cemetery` plus
 * `school: columbia college`. Two unrelated fields, no Trinity College anywhere, and the reader has
 * to wade past him. Sam: "it's clear the user specifically wants trinity college and not to wade
 * through things they don't want."
 *
 * THIS RANKS, IT DOES NOT FILTER, and that distinction is the whole design. Requiring one field
 * would break the query this search was specified around — Sam's original ask was that "Thomas" and
 * "Oyster Bay" find every Thomas connected to Oyster Bay, which is a NAME in one field and a PLACE
 * in another and must keep working. Scattered matches still appear; they simply stop outranking the
 * people who actually match.
 *
 * Single-term queries return 0 immediately, which also keeps it off the hot path: "t" matches 17,874
 * rows and none of them pay for a split.
 */
function cohesion(r: Prepared, terms: string[], phrase: string): number {
	if (terms.length < 2) return 0;
	const segs = r.x.split('|');
	for (const seg of segs) if (seg.includes(phrase)) return 0;
	for (const seg of segs) {
		let all = true;
		for (const t of terms) {
			if (!new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(seg)) {
				all = false;
				break;
			}
		}
		if (all) return 1;
	}
	return 2;
}

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
/**
 * ONE PERSON, BY CANONICAL ID — the app's only id → name/slug resolver, and it is here because this
 * is the only place that holds every person in the browser.
 *
 * WHY IT HAD TO GO SOMEWHERE: bookmarks and the hero card store the canonical ID and never a slug
 * (§50.2, because slug churn is permanent). But the per-person payloads under `static/data/person/`
 * are keyed BY SLUG, so an id cannot be turned into a name by fetching a file — there is no file to
 * fetch. The search index is the one artefact carrying `id`, `slug` and `n` for all 19,728 people.
 *
 * SHARING THIS DOES NOT BREACH §46.2. That law forbids sharing anything that RENDERS, and its own
 * table lists "the data — one search index, one parent map" as explicitly shared. This is a pure
 * lookup over the loaded index with no DOM, no timing and no behaviour: the same category as
 * `kin.ts`, which connect-to-anyone already reads.
 *
 * Returns null before the index has loaded, so callers must `await load()` first or handle the miss.
 * A severed or merged id also returns null, which is the correct answer rather than an error.
 */
export function personById(id: string): { id: string; slug: string; n: string } | null {
	const row = index.find((r) => r.id === id);
	return row ? { id: row.id, slug: row.slug, n: row.n } : null;
}

export function reasonFor(
	r: SearchRow,
	term: string,
	all: string[] = [],
	phrase = ''
): { tag: string; text: string } | null {
	if (!term) return null;
	// Word-boundary, to agree with the scan. On a plain `includes` the reason could point at a segment
	// the scan never accepted — "lea" would report a death in Mt. Pleasant.
	const rx = (t: string) => new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
	const at = rx(term);
	/**
	 * THE REASON MUST NAME THE SEGMENT THAT EARNED THE RANK, not merely the first one containing the
	 * first word. Search "trinity college" and Rev. Clement Moore Butler is here on
	 * `school: trinity college` — but his `work: Rector, Trinity Church` comes earlier in the blob, so
	 * reporting the first "trinity" told the reader he was ranked for the wrong thing, and made a
	 * correct result look like the noise the cohesion pass had just removed.
	 *
	 * Same order cohesion ranks by: the adjacent phrase first, then a field holding every term, then
	 * the plain first-term fallback for single-word queries.
	 */
	const segs = r.x.split('|').filter((seg) => !seg.startsWith('n:'));
	const rest = all.slice(1).map(rx);
	const ordered =
		all.length > 1
			? [
					...segs.filter((seg) => phrase && seg.includes(phrase)),
					...segs.filter((seg) => at.test(seg) && rest.every((re) => re.test(seg))),
					...segs
				]
			: segs;
	for (const seg of ordered) {
		const i = seg.indexOf(':');
		const tag = seg.slice(0, i);
		const body = seg.slice(i + 1);
		if (!at.test(body)) continue;
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
	// It also drops back to "All" (Sam): the X reads as "start over", and leaving a chip latched after
	// an emptied box is how you end up staring at a filter you no longer remember setting.
	if (v === '') {
		applied = '';
		cats = 0;
		// TAGS SURVIVE the X. They are not a refinement of the query — they are a way IN to one, and
		// clearing the words you typed is not a reason to throw away the thing you clicked to get here.
		return;
	}
	debounceTimer = setTimeout(() => (applied = v), DEBOUNCE_MS);
}

/**
 * A NEW HANDFUL, drawn uniformly from the whole vocabulary. Called when the modal opens, so every
 * visit offers something different — that is the whole mechanic, and it is why the pool is state
 * rather than derived: a derived would re-roll on any dependency and the row would churn while you
 * type. Selected tags are kept in the pool so a chosen one cannot vanish from under the pointer.
 */
export function rollTags(): void {
	const all = vocab;
	if (!all.length) return;
	const keep = tags.filter((t) => all.includes(t));
	/**
	 * A ROLL NEVER REPEATS THE ONE BEFORE IT. Uniform sampling is correct and still FEELS repetitive —
	 * measured over eight rolls of nine from 157 canonical tags, 55 of 70 offers were distinct, which
	 * is exactly what uniform random predicts and is also exactly what Sam noticed. Excluding the
	 * previous handful costs nothing at this vocabulary size and makes consecutive visits visibly
	 * different, which is the property the feature is actually trading on.
	 *
	 * Selected tags are exempt: one you chose must not vanish from under the pointer.
	 */
	const previous = new Set(tagPool.filter((t) => !tags.includes(t)));
	const fresh = all.filter((t) => !previous.has(t));
	const draw = fresh.length >= TAG_SAMPLE ? fresh : all;
	const pool = new Set(keep);
	let guard = 0;
	while (pool.size < Math.min(TAG_SAMPLE, draw.length) && guard++ < 400) {
		pool.add(draw[Math.floor(Math.random() * draw.length)]);
	}
	tagPool = [...pool];
}

/** Drop every selected tag at once. The pool is left alone — the handful on offer this visit is not
 *  a selection, so clearing what you picked should not reshuffle what you were choosing from. */
export function clearTags(): void {
	tags = [];
}

/** On, off, and never more than TAG_MAX — the oldest drops out to make room. */
export function toggleTag(tag: string): void {
	if (tags.includes(tag)) tags = tags.filter((t) => t !== tag);
	else tags = [...tags, tag].slice(-TAG_MAX);
}

/**
 * Raise or drop the eligibility floor. The picker sets it on open and clears it on close — it is a
 * property of the SURFACE, so it must not outlive the surface that wanted it.
 */
export function setGate(mask: number): void {
	gate = mask;
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
	tags = [];
	yearFrom = null;
	yearTo = null;
}

export const search = {
	get ready() {
		return ready;
	},
	/** How many people are searchable. 0 until the index lands — callers must handle that. */
	get corpus() {
		return corpus;
	},
	/** mask -> how many rows carry it, from the loaded index. All zero until ready. */
	get counts() {
		return counts;
	},
	/** [earliest, latest] birth year present, or null before the index lands. */
	get yearBounds() {
		return yearBounds;
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
	/** Every folded term, and the whole query as one string — `reasonFor` needs both to pick the
	 *  segment that actually earned the rank rather than the first one mentioning word one. */
	get terms() {
		return terms;
	},
	get phrase() {
		return terms.join(' ');
	},
	get cats() {
		return cats;
	},
	/** The handful of tags offered this visit. */
	get tagPool() {
		return tagPool;
	},
	/** Which of them are switched on. */
	get tags() {
		return tags;
	},
	/** Every tag in the corpus — 642 of them. */
	get vocab() {
		return vocab;
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
	/** One row by id, or undefined. The parent walk and the ladder's rungs both read through this. */
	row(id: string): Prepared | undefined {
		return byId.get(id);
	},
	/** The surface's eligibility floor, or 0. See setGate. */
	get gate() {
		return gate;
	},
	/** Nothing typed and no chip picked — the modal's resting state. */
	get idle() {
		return applied === '' && cats === 0 && tags.length === 0;
	}
};
