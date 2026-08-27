#!/usr/bin/env node
/**
 * regenerate-data.js
 * --------------------------------------------------------------------------
 * Builds all client-facing data artifacts from the canonical Hooker JSON.
 *
 *   node regenerate-data.js [path/to/canonical.json]
 *
 * Emits (paths relative to repo root, overridable via the CONFIG block):
 *   static/data/people.json             full records, research_notes stripped
 *   static/data/search-index.json       compact rows: {id,slug,n,by,dy,g,t,sx,st,ci,hd,td,ee}
 *   static/data/cemeteries.json         passthrough
 *   static/data/institutions.json       passthrough
 *   static/data/stats.json              corpus tallies (total, thomas/talcott descendants)
 *   static/data/person/<slug>.json      self-contained page payload per person
 *                                       (focus record + family graph + bounded
 *                                       relative context + resolved cemetery/
 *                                       institutions/cross-connection slugs)
 *   static/data/redirects.json          { oldSlug|oldId -> currentSlug } for merges/renames
 *
 * Slug rule (validated against the canonical, June 2026):
 *   {first}-{surname}[-{generational_suffix}][-{birthYear}]
 *   - surname by DESCENT: bloodline (H/HD/T/TD/Y) uses last/married name;
 *     married-in (I/X/U) uses maiden name.
 *   - generational suffix: ONLY Jr/Sr/I-VIII from bio.suffix (post-nominals
 *     like M.D./Esq. and disambiguators like "No. 2" are ignored for slugging).
 *   - placeholders (is_placeholder, or no usable name) -> "{desc}-{id}",
 *     ID-anchored so they are unique, stable, and researchable.
 *   - STICKY  = has a birth year (locked, eligible for canonical/indexed URLs).
 *   - PROVISIONAL = year-less; recomputed each build until a year is filled.
 *   - collisions on an identical base get a numeric suffix in deterministic
 *     ID order (lowest ID keeps the clean slug).
 * --------------------------------------------------------------------------
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeTableCoords } from './table-coords.mjs';

// Phase 3a Block 1: table coordinates, computed at emit time only (never at runtime, never stored in
// canonical). Set once in main(), read by compact() so `t:{x,y,e?}` rides on every payload.
let tableCoords = new Map();
// Ids carrying classification.hidden — set in main(). Module-level for the same reason tableCoords
// is: personPayload() needs it to drop cross-connections that would otherwise render a live-looking
// link to a page that was never written. It is the ONE place the emit path does not self-degrade.
let hiddenIds = new Set();

// Ids that MARRIED INTO the Hooker line — set in main(), module-level for the same reason as hiddenIds
// (compact() needs it and has no access to byId).
//
// DERIVED, not read off canonical. `classification.is_thomas_spouse` exists but is only ~22% covered:
// 1,700 records carry it true while the key is absent on 11,830, and both of JP Morgan's wives are in
// that gap — shading from it directly would tint a scattered minority of spouses and look like a bug.
// The honest definition is structural and complete: NOT a Thomas descendant, and married to someone who
// IS. That is exactly the "married in" category, and it needs no data edit to be right.
let marriedIntoLine = new Set();
/**
 * ORBIT — the people the tree reaches ONLY by cross-connection. Roadmap §40 (THE ASCENSION).
 *
 * Derived, never hand-set, and computed ONCE for the whole corpus rather than per person — the same
 * shape `marriedIntoLine` and `hiddenIds` are, and for the same reason: it is a question about the
 * GRAPH, not about a person, so asking it 18,621 times would be asking it wrong.
 */
let orbitIds = new Set();

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const CONFIG = {
	input:
		process.argv[2] && !process.argv[2].startsWith('--')
			? process.argv[2]
			: resolve(__dirname, 'canonical.json'),
	repoRoot: resolve(__dirname),
	dataDir: 'static/data',
	personDir: 'static/data/person', // one self-contained page payload per slug
	redirectsFile: 'static/data/redirects.json',
	// Fields removed from the CLIENT people.json only (canonical keeps everything).
	// research_notes is the approved strip. The others are FLAGGED candidates —
	// left in for now; uncomment after Sam's okay.
	stripFromClient: [
		'research_notes'
		// 'research_tags', 'research_sources',
		// 'paths_to_thomas', 'paths_to_john_talcott', 'naming_inspiration'
	]
};

const GENERATIONAL = new Set([
	'jr',
	'jr.',
	'sr',
	'sr.',
	'i',
	'ii',
	'iii',
	'iv',
	'v',
	'vi',
	'vii',
	'viii'
]);
const MARRIED_IN = new Set(['I', 'X', 'U']); // prefixes whose surname is the maiden name

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const log = (...a) => console.log(...a);

function slugify(s) {
	if (!s) return '';
	return s
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '') // strip accents
		.toLowerCase()
		// Letters that carry a STROKE or are ligatures survive NFKD intact, so the
		// [^a-z0-9] sweep below turned them into separator dashes: Skłodowska became
		// "sk-odowska". Transliterate them by hand before that sweep runs.
		.replace(/ł/g, 'l')
		.replace(/đ/g, 'd')
		.replace(/ø/g, 'o')
		.replace(/æ/g, 'ae')
		.replace(/œ/g, 'oe')
		.replace(/ß/g, 'ss')
		.replace(/þ/g, 'th')
		.replace(/ð/g, 'd')
		.replace(/['’.]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

const prefixOf = (id) => (id.match(/^[A-Z]+/) || [''])[0];
const bioOf = (p) => p.bio || p.name || {};
const birthYear = (p) => (p.birth && p.birth.year) ?? null;
const deathYear = (p) => (p.death && p.death.year) ?? null;

// ---------------------------------------------------------------------------
// LIVING-PERSON DATE PRIVACY
// ---------------------------------------------------------------------------
// A living person's dates are not shown: no chip date line, no Birth/Death vitals, no lifespan
// on the table tile, and no birth year baked into their slug (the slug is the widest leak —
// /person/samuel-mctavey-1983 defeats the whole point while the card sits there hiding it).
//
// DERIVED, never stored. No death year AND born within a lifetime => presumed living. That is
// ~190 people today and it re-evaluates itself every build, where a `true` written into
// canonical in 2026 would quietly be a lie by 2060 on records nobody revisits. It also matches
// the grain here: diedYoung, table coords and generation labels are all emit-time.
//
// canonical MAY override with a sparse boolean `is_living` for the cases the rule gets wrong —
// someone born 1935 who died in 2008 with no death record. The field is absent on ~18,000
// records and that is correct; absent means "let the rule decide", not false.
//
// NOTABLE CARVE-OUT (Sam's): a public figure's dates are already public, so is_notable wins.
const BUILD_YEAR = new Date().getFullYear();
const MAX_LIFESPAN = 100;

function presumedLiving(p) {
	if (typeof p.is_living === 'boolean') return p.is_living; // explicit canonical override
	if (deathYear(p) != null) return false;
	const by = birthYear(p);
	return by != null && by >= BUILD_YEAR - MAX_LIFESPAN;
}

// The single gate every render site reads, emitted as `pv`. NOTE what this does NOT do: it does
// not strip `by`/`dy` from the payload. roster.ts and SiblingPanel sort children and siblings on
// `by`, and a null sorts into a DIFFERENT group — so nulling it would shunt every living person
// to the end of their row, which is itself a tell. Emit the dates, suppress the display.
function datesPrivate(p) {
	return presumedLiving(p) && !(p.notable && p.notable.is_notable);
}

function firstName(p) {
	const b = bioOf(p);
	return b.first_name || (b.display_name || '').split(/\s+/)[0] || '';
}

// Cleaned display_name tokens (qualifiers like "(...)" / "[...]" stripped). Shared by the
// surname + generationalSuffix display-name fallbacks below.
function displayTokens(p) {
	return (bioOf(p).display_name || '').split(/[([]/)[0].trim().split(/\s+/).filter(Boolean);
}

// Structured surname by descent, not gender (bloodline women carry married name). No fallback.
function structuredSurname(p) {
	const b = bioOf(p);
	const married = (b.married_names && b.married_names[b.married_names.length - 1]) || null;
	if (MARRIED_IN.has(prefixOf(p.id))) {
		return b.maiden_name || b.last_name || married || null;
	}
	return b.last_name || married || b.maiden_name || null;
}

// Surname for slugging. Falls back to display_name (mirrors firstName's fallback) when the
// structured fields are all empty — common for display-name-only / imported / reclassified
// entries that were otherwise mis-flagged as placeholders and slugged by ID. Drops trailing
// generational suffixes so "Jonathan Trumbull Jr." → "Trumbull", then takes the last token.
function surname(p) {
	const structured = structuredSurname(p);
	if (structured) return structured;
	const toks = displayTokens(p);
	while (
		toks.length > 1 &&
		GENERATIONAL.has(toks[toks.length - 1].replace(/[^a-z]/gi, '').toLowerCase())
	) {
		toks.pop();
	}
	return toks.length >= 2 ? toks[toks.length - 1] : null;
}

// Only return a suffix when it is a genuine generational marker. Prefer structured bio.suffix;
// for display-name-only entries (no structured surname) fall back to a trailing generational
// token in display_name so "Jonathan Trumbull Jr." keeps the Jr. instead of dropping it. The
// fallback is gated on a missing structured surname so it never alters fully-structured slugs.
function generationalSuffix(p) {
	const raw = (bioOf(p).suffix || '').trim();
	if (GENERATIONAL.has(raw.toLowerCase())) return raw;
	if (structuredSurname(p)) return null;
	const toks = displayTokens(p);
	const last = toks.length > 1 ? toks[toks.length - 1].replace(/[^a-z]/gi, '') : '';
	return GENERATIONAL.has(last.toLowerCase()) ? last : null;
}

function isPlaceholder(p) {
	if (typeof p.is_placeholder === 'boolean' && p.is_placeholder) return true;
	const d = bioOf(p).display_name || '';
	return /\[|unknown/i.test(d) || !firstName(p) || !surname(p);
}

// Base slug (pre-collision). Returns { base, sticky, priorBase }.
// priorBase is the year-bearing slug a now-private person USED to have, so the old URL can be
// redirected forward without writing former_ids into canonical for ~140 people.
function baseSlug(p) {
	if (isPlaceholder(p)) {
		const desc = slugify((bioOf(p).display_name || 'unnamed').split(/[([]/)[0]) || 'unnamed';
		return { base: `${desc}-${p.id.toLowerCase()}`, sticky: true, priorBase: null }; // ID-anchored => stable
	}
	const f = slugify(firstName(p));
	let s = slugify(surname(p));
	let suf = generationalSuffix(p);
	let sufSlug = suf ? slugify(suf) : null;
	// guard against a surname that already ends with the suffix token
	if (sufSlug && s.endsWith('-' + sufSlug)) sufSlug = null;
	const yr = birthYear(p);
	const priv = datesPrivate(p);
	const stem = [f, s, sufSlug].filter(Boolean).join('-');
	// A living person's slug drops the year. `sticky` still keys off HAVING a birth year, not off
	// printing it — the year-less slug is locked and indexable for as long as they are living.
	const base = stem + (yr && !priv ? `-${yr}` : '');
	return { base, sticky: Boolean(yr), priorBase: priv && yr ? `${stem}-${yr}` : null };
}

// ---------------------------------------------------------------------------
// compact builders (match neighborhood.ts PersonCompact + search-index row)
// ---------------------------------------------------------------------------
function sex(p) {
	if (p.gender === 'male') return 'm';
	if (p.gender === 'female') return 'f';
	return 'u';
}

// SHORT NAME (`sn`) — ported VERBATIM from computeShortName/abbreviateTitle in src/lib/data/buildFeatured.ts
// so the value the generator bakes into the compact is byte-identical to what enrich() would have computed
// from the full record. enrich reads `compact.sn ?? computeShortName(full)`, so a matching compact.sn makes
// enrich a no-op and lets the chip render its short name WITHOUT the full record in context. KEEP IN SYNC.
const TITLE_ABBREVIATIONS = {
	Reverend: 'Rev.',
	Captain: 'Capt.',
	Doctor: 'Dr.',
	Colonel: 'Col.',
	General: 'Gen.',
	Lieutenant: 'Lt.',
	Major: 'Maj.',
	Governor: 'Gov.',
	Senator: 'Sen.',
	Deacon: 'Dea.',
	Elder: 'Eld.',
	Honorable: 'Hon.',
	'Lieutenant Colonel': 'Lt. Col.',
	'Lt.-Col.': 'Lt. Col.',
	'Lieut.-Col.': 'Lt. Col.',
	'Rev. Capt.': 'Rev. Capt.'
};
const abbreviateTitle = (title) => (!title ? null : (TITLE_ABBREVIATIONS[title] ?? title));
// Chip surname — the last name a chip displays: the MAIDEN (birth) name for a woman / anyone who has
// one, else last_name. Shared by computeShortName (sn) and the chip_first_name override (nk) so a
// curated chip keeps the SAME last name it would otherwise show — chip_first_name swaps ONLY the first
// name (e.g. Juliet Burkett Hooker → "Julie Burkett", never "Julie Hooker").
function chipSurname(p) {
	const bio = bioOf(p);
	if (p.gender === 'female' || bio.maiden_name) return bio.maiden_name ?? bio.last_name ?? null;
	return bio.last_name ?? null;
}
function computeShortName(p) {
	const bio = bioOf(p);
	const first = bio.first_name;
	if (!first) return null;
	const surname = chipSurname(p);
	const baseName = surname ? `${first} ${surname}` : first;
	const title = abbreviateTitle(bio.title);
	if (title) {
		const fullName = `${title} ${baseName}`;
		if (fullName.length <= 19) return fullName;
	}
	return baseName;
}

function compact(p, slugMap) {
	const c = p.classification || {};
	return {
		id: p.id,
		slug: slugMap.get(p.id) ?? null,
		// Relationship CHIPS use chip_name when set (a shorter form, e.g. "Lent Hooker"); the FEATURED
		// card renders the full bio.display_name from the person payload, so the two can differ by design.
		n: bioOf(p).chip_name || bioOf(p).display_name || p.id,
		by: birthYear(p),
		dy: deathYear(p),
		// bm/bd/dm/dd — BIRTH AND DEATH MONTH/DAY, and they exist for exactly one reason: an AGE cannot
		// be computed from years. Edith Olivia Gwynne was born 30 Nov 1853 and died 9 Jan 1899, so
		// `dy - by` says 46 and she was 45 — her birthday had not come round. The timeline rail printed
		// the subtraction and disagreed with the card sitting next to it (Sam: "we aren't just doing math
		// on years we have to show real age").
		//
		// EMITTED AS MONTH/DAY RATHER THAN AS A BAKED AGE so there stays exactly ONE implementation of
		// the precision rules. `ageAtDeath` in src/lib/utils/dates.ts already knows when a missing day
		// still determines the answer (the months differ) and when it doesn't (they match) — porting that
		// into this file would create the second copy that the dy_young comment below already warns about
		// ("MUST match diedYoung()"). The client reconstructs a DateLocation and calls the real function.
		//
		// Absent when there is no month, which is most of the corpus — a year-only date makes the age
		// approximate, and `ageAtDeath` reaches that conclusion from the missing field itself.
		// bx/dx — the exactness flag, emitted only when the record claims it. Without it a real
		// 1 January reads as the month:1/day:1 placeholder and the rail prints a tilde on a birthday
		// we actually know. Kept as a flag rather than a baked age so ageAtDeath stays the ONE
		// implementation of the precision rules, per the note above.
		...(p.birth?.date_precision === 'exact' ? { bx: 1 } : {}),
		...(p.death?.date_precision === 'exact' ? { dx: 1 } : {}),
		...(p.birth?.month != null ? { bm: p.birth.month } : {}),
		...(p.birth?.day != null ? { bd: p.birth.day } : {}),
		...(p.death?.month != null ? { dm: p.death.month } : {}),
		...(p.death?.day != null ? { dd: p.death.day } : {}),
		// pv — dates are in the payload (sorting needs them) but must not be DISPLAYED.
		// Absent on everyone else; consumers test `person.pv`.
		...(datesPrivate(p) ? { pv: true } : {}),
		// lv — PRESUMED LIVING, on its own, independent of whether the dates are private. `pv` above is
		// `presumedLiving && !notable`, so a living NOTABLE — Anderson Cooper, Loudon Wainwright III —
		// has always been indistinguishable in the payload from someone whose death year simply was
		// never recorded. The timeline rail drew them the same way as a result: a bar ending one
		// estimated lifespan after birth. Sam: "alive means alive, and keeping the 60 year old timeline
		// estimate kind of implies they should be dead by now but that's not what I want to convey."
		//
		// The notable carve-out is about PRIVACY, so it belongs to pv and only to pv. Whether someone is
		// alive is a different fact and now travels separately.
		...(presumedLiving(p) ? { lv: true } : {}),
		sx: sex(p),
		hd: Boolean(c.is_thomas_descendant),
		td: Boolean(c.is_talcott_descendant),
		ee: Boolean(c.is_easter_egg),
		// sp — MARRIED INTO the Hooker line. Added Aug 7 for line-status shading, where it has to be an
		// intrinsic property of the PERSON rather than the relation a chip happens to occupy: shading off
		// data-relation="spouse" would tint the two spouse chips and then show a WHITE card the moment you
		// clicked one, because a card holds no relation to itself. It also leaves a married-in parent
		// (Junius Morgan, on his son's page) reading as blood when he is the clearest married-in case
		// on that page. See marriedIntoLine for why this is derived rather than read off classification.
		sp: marriedIntoLine.has(p.id),
		g: c.generation_from_thomas ?? null,
		// p (photo) + sn (short name) baked in so a chip renders WITHOUT its full record in context — enrich()
		// prefers these (`compact.p ?? …`, `compact.sn ?? …`), so it no-ops when they're present. This is what
		// lets siblings drop out of contextIds (they were shipping ~2.9KB full records to surface ~100 bytes).
		p: p.bio?.photo_url ?? p.name?.photo_url ?? null,
		// pp (photo position) — a per-person CSS object-position override for the rare portrait the
		// default `object-top` crop cuts badly (a landscape photo, a subject off to one side). Absent
		// on ~18,000 records, which is the point: nobody else's crop moves.
		...(bioOf(p).photo_position ? { pp: bioOf(p).photo_position } : {}),
		// df (display font) — bio.display_font, opt-in exactly like pp. A chip's NAME renders in this
		// person's typeface; absent on ~18,000 records, so nobody else's chip changes. The value is a
		// KEY resolved through an allow-list in the components, never a class or raw CSS.
		...(bioOf(p).display_font ? { df: bioOf(p).display_font } : {}),
		sn: computeShortName(p),
		// fn (first name) — sibling chips render just the first name ("from the POV of the card, he knows them
		// as Abigail"). A DATA field, not a UI split of sn/n (which breaks on titles/maiden names/suffixes).
		// On ALL compacts (~10 bytes); only sibling chips read it, everyone else keeps sn.
		fn: bioOf(p).first_name ?? null,
		// cf (chip first name) — bio.chip_first_name alone, no surname. SIBLING chips show just this ("Lent"),
		// the same way they show fn for everyone else (sibling = first-name-only). Other chip types use nk.
		cf: bioOf(p).chip_first_name ?? null,
		// nk (chip name) — OPT-IN. Only when bio.chip_first_name is set do chips read "chip_first_name +
		// chipSurname" — the SAME last name the chip shows otherwise (maiden → else last_name), so only the
		// first name is swapped ("Julie Burkett", not "Julie Hooker"). Applies to EVERY chip type
		// (spouse/parent/child/sibling). Deliberately NOT driven by bio.nickname (the tree has ~400
		// nicknames, many bad chip reads). null → chips fall back to sn/fn. FeaturedCard renders
		// bio.display_name from the full record, so it's UNAFFECTED.
		nk: (() => {
			const b = bioOf(p);
			// bio.chip_name is a VERBATIM override — the exact chip label, used when the auto-surname is wrong
			// (e.g. a married noblewoman known by her married name: "Countess Szapary", not maiden "Széchenyi").
			if (b.chip_name) return b.chip_name;
			if (!b.chip_first_name) return null;
			const surname = chipSurname(p);
			return surname ? `${b.chip_first_name} ${surname}` : b.chip_first_name;
		})(),
		// cm (child married name) — CHILD chips ONLY, WOMEN ONLY: show the MARRIED surname (last of
		// married_names) instead of the maiden/last_name a normal chip uses — "Alice Vanderbilt", not
		// "Alice Gwynne". Surname falls back to last_name when there is no married name (unmarried daughters
		// stay unchanged). Verbatim bio.chip_name still wins (a curated label like "Countess Szapary" is
		// never overwritten). null on men / when no first name → child chip falls through to nk/sn/n (current
		// behavior). Only PersonBox's child branch reads it; every other chip type is UNAFFECTED.
		cm: (() => {
			if (p.gender !== 'female') return null;
			const b = bioOf(p);
			if (b.chip_name) return b.chip_name;
			const surname =
				(b.married_names && b.married_names[b.married_names.length - 1]) || b.last_name || null;
			const first = b.chip_first_name ?? b.first_name;
			if (!surname || !first) return null;
			return `${first} ${surname}`;
		})(),
		t: tableCoords.get(p.id) ?? null // {x, y, e?} — table seat (y may be null: consumers SKIP, never throw)
	};
}

// search-index row = compact + tags/state/city (and reordered to match existing file)
function searchRow(p, slugMap) {
	const c = compact(p, slugMap);
	const b = p.birth || {};
	const row = {
		id: c.id,
		slug: c.slug,
		n: c.n,
		by: c.by,
		dy: c.dy,
		g: c.g,
		t: p.tags || [],
		sx: c.sx,
		hd: c.hd,
		td: c.td,
		ee: c.ee
	};
	const st = b.state || b.country || null;
	if (st) row.st = st;
	if (b.city) row.ci = b.city;
	return row;
}

// ---------------------------------------------------------------------------
// neighborhood builder (matches neighborhood.ts Neighborhood)
// ---------------------------------------------------------------------------
function childrenOf(p) {
	const out = [];
	for (const m of p.marriages || []) for (const id of m.children_ids || []) out.push(id);
	return out;
}

function neighborhood(p, byId, slugMap) {
	const cm = (id) => (id && byId[id] ? compact(byId[id], slugMap) : null);

	const spouses = (p.marriages || [])
		.slice()
		.sort((a, b) => (a.marriage_number || 0) - (b.marriage_number || 0))
		.map((m) => ({
			order: m.marriage_number ?? 1,
			spouse: cm(m.spouse_id),
			year: m.date_year ?? null,
			// rel — the NATURE of the union, not just its date. A long-term partner who was never a
			// spouse still rides in `marriages[]`, because that array is the only thing that links a
			// child to both parents; canonical marks those with relationship_type: 'partner'. Without
			// carrying it here the chip silently calls them a spouse (Martha Fay, Suzzy Roche).
			rel: m.relationship_type ?? null,
			children: (m.children_ids || []).map(cm).filter(Boolean)
		}));

	const par = p.parents || {};
	const parents = {};
	if (par.father_id && byId[par.father_id]) parents.father = cm(par.father_id);
	if (par.mother_id && byId[par.mother_id]) parents.mother = cm(par.mother_id);

	const gp = (pid) => {
		const out = {};
		const gpar = pid && byId[pid] ? byId[pid].parents || {} : {};
		if (gpar.father_id && byId[gpar.father_id]) out.father = cm(gpar.father_id);
		if (gpar.mother_id && byId[gpar.mother_id]) out.mother = cm(gpar.mother_id);
		return out;
	};
	const grandparents = { paternal: gp(par.father_id), maternal: gp(par.mother_id) };

	// grandchildren: children of focus's children, tagged with via_parent_id
	const grandchildren = [];
	for (const childId of childrenOf(p)) {
		const child = byId[childId];
		if (!child) continue;
		for (const gcId of childrenOf(child)) {
			const gc = cm(gcId);
			if (gc) grandchildren.push({ ...gc, via_parent_id: childId });
		}
	}

	// siblings_count: union of both parents' children, minus focus [UNCHANGED — full+half, NOT step]
	const sibs = new Set();
	for (const pid of [par.father_id, par.mother_id]) {
		if (pid && byId[pid]) for (const cid of childrenOf(byId[pid])) sibs.add(cid);
	}
	sibs.delete(p.id);

	// siblings[] — TIERED, natural order (children_ids order; the UI applies the same died-young sort it
	// applies to children[] — the generator does NOT sort). Pure set math on the two parents' child lists:
	//   full = father's children ∩ mother's children       (share BOTH recorded parents)
	//   half = symmetric difference, minus focus            (share exactly ONE recorded parent)
	//   step = children of a parent's OTHER spouse (a step-parent) via that spouse's other marriages, minus
	//          any child of the focus's own parents (full/half already cover those). Expected EMPTY in the
	//          overwhelming majority (step-siblings carry no Hooker blood, so rarely built out) — emit the
	//          possibly-empty array anyway; the UI gates the tier on non-empty.
	const fatherKids = par.father_id && byId[par.father_id] ? childrenOf(byId[par.father_id]) : [];
	const motherKids = par.mother_id && byId[par.mother_id] ? childrenOf(byId[par.mother_id]) : [];
	const fSet = new Set(fatherKids),
		mSet = new Set(motherKids);
	const full = [],
		half = [],
		seen = new Set();
	for (const cid of [...fatherKids, ...motherKids]) {
		if (cid === p.id || seen.has(cid)) continue;
		seen.add(cid);
		(fSet.has(cid) && mSet.has(cid) ? full : half).push(cid);
	}
	const ownKids = new Set([...fatherKids, ...motherKids]);
	const stepSpouses = new Set();
	const spousesOf = (pid, other) =>
		(pid && byId[pid] ? byId[pid].marriages || [] : [])
			.map((m) => m.spouse_id)
			.filter((sid) => sid && sid !== other && byId[sid]);
	for (const sid of spousesOf(par.father_id, par.mother_id)) stepSpouses.add(sid);
	for (const sid of spousesOf(par.mother_id, par.father_id)) stepSpouses.add(sid);
	const step = [];
	for (const sid of stepSpouses) {
		for (const cid of childrenOf(byId[sid])) {
			if (cid === p.id || ownKids.has(cid) || seen.has(cid)) continue;
			seen.add(cid);
			step.push(cid);
		}
	}
	// Sibling compacts carry dy_young baked in (computed from by/dy — MUST match diedYoung() in
	// buildFeatured.ts, age-at-death ≤ 15). Siblings ship NO full record in context, so the UI can't call
	// diedYoung(byId[id]) for them (it would return false → no dimming); reading this precomputed flag is the
	// safe path. Parents/children still compute dy_young at render off their in-context full records.
	const toCompact = (ids) =>
		ids
			.map((id) => {
				const c = cm(id);
				if (!c) return null;
				return { ...c, dy_young: !!c.by && !!c.dy && c.dy - c.by <= 15 };
			})
			.filter(Boolean);

	return {
		focus: compact(p, slugMap),
		spouses,
		parents,
		grandparents,
		grandchildren,
		siblings: { full: toCompact(full), half: toCompact(half), step: toCompact(step) },
		siblings_count: sibs.size
	};
}

// ---------------------------------------------------------------------------
// per-person page payload (self-contained: one fetch renders the card)
// ---------------------------------------------------------------------------

// Every institution_id referenced anywhere in the focus record (institutions[],
// education[], career[], documents[], …). Deep scan so we never miss a ref.
function collectInstitutionIds(obj, acc) {
	if (!obj || typeof obj !== 'object') return acc;
	if (Array.isArray(obj)) {
		for (const x of obj) collectInstitutionIds(x, acc);
		return acc;
	}
	for (const [k, v] of Object.entries(obj)) {
		if (k === 'institution_id' && typeof v === 'string') acc.add(v);
		else collectInstitutionIds(v, acc);
	}
	return acc;
}

// The minimal set of people whose FULL records the page's enrich / diedYoung /
// computeGenerationLabels logic reads off `byId`: neighborhood members plus the
// focus's children's spouses (needed for the in-law generation label).
function contextIds(p, byId) {
	const ids = new Set([p.id]);
	const add = (id) => {
		if (id && byId[id]) ids.add(id);
	};
	for (const m of p.marriages || []) {
		add(m.spouse_id);
		// A SPOUSE'S OTHER SPOUSES. One extra hop, and the only reason for it is the generation label:
		// computeGenerationLabels derives a step-figure's title through the person they married — Elder
		// William Goodwin is "Second Husband of Wife of Thomas Hooker" only because Susanna's FIRST
		// husband was Thomas. That anchor is two hops from Goodwin, so without this his context held just
		// himself and Susanna, the lookup missed, and his card showed no title at all.
		// Cheap: it fires only for people whose spouse remarried, and adds at most a record or two.
		const sp = m.spouse_id && byId[m.spouse_id];
		if (sp) for (const sm of sp.marriages || []) add(sm.spouse_id);
		for (const cid of m.children_ids || []) {
			add(cid);
			const child = byId[cid];
			if (!child) continue;
			for (const cm of child.marriages || []) add(cm.spouse_id); // children's spouses
			for (const gcId of childrenOf(child)) add(gcId); // grandchildren
		}
	}
	const par = p.parents || {};
	add(par.father_id);
	add(par.mother_id);
	for (const pid of [par.father_id, par.mother_id]) {
		const gpar = pid && byId[pid] ? byId[pid].parents || {} : {};
		add(gpar.father_id);
		add(gpar.mother_id);
	}
	// NB: SIBLINGS are deliberately NOT in context. Everything a sibling CHIP needs is baked into its compact
	// (n/sn, p, by/dy, dy_young — see neighborhood()), so enrich() no-ops and died-young reads the flag. This
	// reclaims the ~2.9KB full record per sibling (contextIds was the only reason they shipped). diedYoung /
	// computeGenerationLabels don't need them: died-young is by/dy (in the compact); generation labels are
	// focus-only. (Parents/children still ship full records — they carry richer render needs.)
	return ids;
}

// ---------------------------------------------------------------------------
// Registry resolution (Build 1). Attach display-ready arrays so the component
// NEVER sees a raw id. Uniform row: { name, typeLabel, blurb, url, thumbUrl,
// alt, tooltip } (null when absent). Every resolver is null-guarded — a missing
// registry entry drops that row; a malformed field yields null; a thrown map
// yields [] (build never crashes on a bad registry entry).
// ---------------------------------------------------------------------------

// x_y -> "X y"; null / "None" / empty -> null.
function titleCaseType(t) {
	if (!t || String(t).toLowerCase() === 'none') return null;
	const s = String(t).replace(/_/g, ' ').trim();
	return s ? s.charAt(0).toUpperCase() + s.slice(1) : null;
}
function landmarkTypeLabel(t) {
	if (!t || String(t).toLowerCase() === 'none') return null;
	const s = String(t).toLowerCase();
	if (s.includes('museum')) return 'Museum'; // before house (house_museum)
	if (/house|residence|homestead|mansion|dwelling/.test(s)) return 'Residence';
	if (s.includes('estate')) return 'Estate';
	if (s.includes('park')) return 'Park';
	if (/church|meetinghouse|meeting house/.test(s)) return 'Church';
	if (/monument|memorial/.test(s)) return 'Monument';
	return titleCaseType(t);
}
function artTypeLabel(t) {
	if (!t || String(t).toLowerCase() === 'none') return null;
	const s = String(t).toLowerCase();
	if (s.includes('portrait')) return 'Portrait'; // before painting (portrait_painting)
	if (s.includes('painting')) return 'Painting';
	if (s.includes('photograph')) return 'Photograph';
	if (s.includes('sculpture')) return 'Sculpture';
	return titleCaseType(t);
}
function statueTypeLabel(t) {
	const s = (t || '').toLowerCase();
	if (s === 'bust' || s === 'marble_bust') return 'Bust';
	if (s.includes('relief')) return 'Relief';
	return null; // statue (and anything else) -> null
}
function youtubeThumb(url) {
	if (!url || typeof url !== 'string') return null;
	const m = url.match(/(?:[?&]v=|youtu\.be\/|\/embed\/)([A-Za-z0-9_-]{11})/);
	return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}
// Mirrors src/lib/utils/dates.ts formatLocationShort (city/state branch only) so a landmark's
// registry location can be rendered "City, ST" at build time. Kept in sync manually — this is the
// static US state table; drift here only affects the landmark subtitle, never core location render.
const STATE_ABBREV = {
	Alabama: 'AL',
	Alaska: 'AK',
	Arizona: 'AZ',
	Arkansas: 'AR',
	California: 'CA',
	Colorado: 'CO',
	Connecticut: 'CT',
	Delaware: 'DE',
	Florida: 'FL',
	Georgia: 'GA',
	Hawaii: 'HI',
	Idaho: 'ID',
	Illinois: 'IL',
	Indiana: 'IN',
	Iowa: 'IA',
	Kansas: 'KS',
	Kentucky: 'KY',
	Louisiana: 'LA',
	Maine: 'ME',
	Maryland: 'MD',
	Massachusetts: 'MA',
	Michigan: 'MI',
	Minnesota: 'MN',
	Mississippi: 'MS',
	Missouri: 'MO',
	Montana: 'MT',
	Nebraska: 'NE',
	Nevada: 'NV',
	'New Hampshire': 'NH',
	'New Jersey': 'NJ',
	'New Mexico': 'NM',
	'New York': 'NY',
	'North Carolina': 'NC',
	'North Dakota': 'ND',
	Ohio: 'OH',
	Oklahoma: 'OK',
	Oregon: 'OR',
	Pennsylvania: 'PA',
	'Rhode Island': 'RI',
	'South Carolina': 'SC',
	'South Dakota': 'SD',
	Tennessee: 'TN',
	Texas: 'TX',
	Utah: 'UT',
	Vermont: 'VT',
	Virginia: 'VA',
	Washington: 'WA',
	'West Virginia': 'WV',
	Wisconsin: 'WI',
	Wyoming: 'WY',
	'District of Columbia': 'DC'
};
const COUNTRY_ABBREV = {
	England: 'UK',
	'United Kingdom': 'UK',
	Scotland: 'UK',
	Wales: 'UK',
	'Northern Ireland': 'UK',
	Britain: 'UK',
	'Great Britain': 'UK'
};
function formatCityState(city, state, country) {
	const isUS = !country || country === 'United States' || country === 'USA';
	const st = state ? (STATE_ABBREV[state] ?? state) : null;
	const ct = country ? (COUNTRY_ABBREV[country] ?? country) : null;
	if (city && state && isUS) return `${city}, ${st}`;
	if (city && state && !isUS) return `${city}, ${state}, ${ct}`;
	if (city && country && !isUS) return `${city}, ${ct}`;
	if (city) return city;
	if (state && isUS) return st;
	if (state && !isUS) return `${state}, ${ct}`;
	if (country && !isUS) return country;
	return null;
}
const mediaRow = (o) => ({
	name: o.name ?? null,
	typeLabel: o.typeLabel ?? null,
	blurb: o.blurb ?? null,
	// Single secondary line the card renders. Set per section (landmark → "City, ST"; art →
	// blurb ?? typeLabel; document → blurb; statue → typeLabel; video → null) so the component
	// stays dumb — it renders `subtitle` verbatim and never decides the fallback chain.
	subtitle: o.subtitle ?? null,
	url: o.url ?? null,
	thumbUrl: o.thumbUrl ?? null,
	alt: o.alt ?? null,
	tooltip: o.tooltip ?? null,
	// Per-ROW object-position for the 34px thumb, e.g. 'top' — the media-row twin of
	// bio.photo_position. Null on every row that has not asked for it, so the default
	// centre crop is untouched. Set it on the RECORD (or the person-side entry, which wins).
	thumbPos: o.thumbPos ?? null
});
function safeResolve(arr, fn) {
	try {
		return (arr || [])
			.map((x) => {
				try {
					return fn(x);
				} catch {
					return null;
				}
			})
			.filter(Boolean);
	} catch {
		return [];
	}
}
function resolveLandmarks(p, byId) {
	return safeResolve(p.landmarks, (bl) => {
		const r = byId[bl && bl.landmark_id];
		if (!r) return null;
		// Landmark subtitle = the landmark's own registry location ("City, ST"), NOT the
		// person-side description. The full notes stay in canonical; they're just off the card.
		// Location is nested under r.location (schema drift: tolerate a flat entry too).
		const lc = r.location || r;
		const loc = formatCityState(lc.city, lc.state, lc.country);
		// Sam, 10 Aug 2026: the year belongs under the name, beside the place — "Springfield, MA (1637)".
		// The build year is stored under six different keys across 332 records (dates.built dominates at
		// 86, built_year at 29, then a long tail), so read the lot and only print a clean 4-digit year;
		// a string like "c. 1660" or a {status:'destroyed'} dates object falls through to no year.
		const rawBuilt =
			r.dates?.built ?? r.dates?.founded ?? r.built_year ?? r.date_built ?? r.founded ?? null;
		const built = /^\d{4}$/.test(String(rawBuilt)) ? Number(rawBuilt) : null;
		const locYear = loc && built ? `${loc} (${built})` : (loc ?? (built ? `(${built})` : null));
		return mediaRow({
			name: r.primary_name,
			typeLabel: landmarkTypeLabel(r.type),
			blurb: null,
			subtitle: locYear,
			url: r.primary_url ?? r.url ?? null,
			thumbUrl: r.photo_url ?? r.image_url ?? null,
			alt: r.photo_notes ?? r.image_caption ?? r.primary_name ?? null,
			tooltip: loc ? `${r.primary_name} — ${loc}` : (r.primary_name ?? null)
		});
	});
}
function resolveArtworks(p, byId) {
	return safeResolve(p.artworks, (bl) => {
		const r = byId[bl && bl.artwork_id];
		if (!r) return null;
		const blurb = bl.artwork_blurb ?? bl.blurb ?? null;
		return mediaRow({
			name: r.title,
			typeLabel: artTypeLabel(r.type),
			blurb,
			subtitle: blurb ?? artTypeLabel(r.type),
			url: r.primary_url ?? r.url ?? null,
			thumbUrl: r.photo_url ?? r.image_url ?? null,
			alt: r.title ?? null,
			tooltip: r.title ?? null,
			thumbPos: bl.photo_position ?? r.photo_position ?? null
		});
	});
}
function resolveDocuments(p, byId) {
	return safeResolve(p.documents, (bl) => {
		const id = typeof bl === 'string' ? bl : bl && bl.document_id;
		const r = byId[id];
		if (!r) return null;
		// person-side ref carries the per-person note under `blurb` (older rows used `document_blurb`)
		const blurb = bl && typeof bl === 'object' ? (bl.blurb ?? bl.document_blurb ?? null) : null;
		return mediaRow({
			name: r.title,
			typeLabel: null,
			blurb,
			subtitle: blurb,
			// document registry stores its link as `source_url` (videos/landmarks use `url`); accept
			// either so the row becomes a whole-row link to the external archive.
			url: r.source_url ?? r.url ?? null,
			thumbUrl: null,
			alt: null,
			tooltip: r.title ?? null
		});
	});
}
function resolveStatues(p, bySubject) {
	return safeResolve(bySubject[p.id], (r) => {
		const nm = r.name ?? r.description ?? 'Statue';
		// Second line = the statue's place, like a landmark (its own `location` label, else "City, ST").
		// Falls back to the type label (Bust/Relief) when no place is recorded.
		// `location` is a plain string on most records but an OBJECT on some (STAT002 carries
		// {institution, city, state}); an object here would print as "[object Object]" on the card.
		const locStr = typeof r.location === 'string' ? r.location : null;
		const locObj = r.location && typeof r.location === 'object' ? r.location : null;
		const loc =
			locStr ??
			(locObj
				? (locObj.institution ?? formatCityState(locObj.city, locObj.state, locObj.country))
				: null) ??
			formatCityState(r.city, r.state, r.country) ??
			statueTypeLabel(r.type);
		return mediaRow({
			name: nm,
			typeLabel: statueTypeLabel(r.type),
			blurb: null,
			subtitle: loc,
			url: r.url ?? null,
			thumbUrl: r.photo_url ?? null,
			alt: nm,
			tooltip: nm
		});
	});
}
function resolveVideos(p, byId) {
	return safeResolve(p.videos, (bl) => {
		const r = byId[bl && bl.video_id];
		if (!r) return null;
		// Video renders as a TEXT row (no thumbnail — the 34px YouTube thumb is illegible), so no
		// thumbUrl is derived. subtitle stays null: a clean spot for duration once it's captured
		// into canonical (needs the YouTube Data API, not in the URL — flagged for the data chat).
		return mediaRow({
			name: r.summary ?? null,
			typeLabel: null,
			blurb: null,
			subtitle: null,
			url: r.url ?? null,
			thumbUrl: null,
			alt: r.summary ?? r.title ?? null,
			tooltip: r.title ?? null
		});
	});
}

// ---------------------------------------------------------------------------
// ORBIT — the people the tree reaches ONLY by cross-connection (roadmap §40, THE ASCENSION)
// ---------------------------------------------------------------------------
//
// THE ZONE IS THE COMPONENT, NOT THE PERSON, and that is the whole design rather than an optimisation.
// Abraham Lincoln, Mary Todd, Robert Todd and Mary Harlan are ONE detached family component: you enter
// it by a cross-connection, move around inside it with ORDINARY navigation, and leave by the X or by a
// CC out. Sam: "clicking around within Lincoln's family actually just re-uses the existing navigation
// — it's like a window into Lincoln's own sub-lineage."
//
// It is also why Martha Wayles Jefferson qualifies with ZERO cross-connections of her own. Membership
// is a property of the component and the spouse chip is the door; a per-person rule would have had to
// special-case her, and would then have had to special-case every future spouse of every future orbit
// figure. Sam stated the rule as "by default the spouse of an orbit entry also becomes an orbit entry",
// and using the component as the unit is that rule rather than an implementation of it.
//
// TWO CLAUSES, AND THE SECOND IS NOT OPTIONAL:
//
//   1. the component contains NO is_thomas_descendant — it never touches the tree by a family edge;
//   2. SOMEONE in it is cross-connection-reachable.
//
// Clause 2 is Sam's own access rule ("the only way for a user to reach Thomas Jefferson is by a
// specific CC from a specific person") turned into a membership test, and dropping it costs 60 people:
// measured, 105 detached components hold 154 people, but 50 of those components have NO cross-
// connection at all, in or out. Celestia Smith, Anna Cheney, a stray Pynchon pair — unlinked records
// and Talcott-severance residue, not orbit figures. Without clause 2 each of them gets a ceremonial
// entrance that nothing in the app can trigger.
//
// WHY NOT `is_easter_egg`. Because it does not mean this, and the numbers are not close: 68 people are
// both, 86 are orbit and UNFLAGGED, and 550 are flagged and NOT orbit. Schema v24 §1888 records how it
// got that way — `orbit_non_descendant` was resolved as "use is_easter_egg: true instead" — and the
// flag now means "notable parent of a spouse" 89% of the time. It still drives the blue rail lane and
// the ee-line card tint for those 550 and is left completely alone; orbit is derived BESIDE it. Fourth
// member of the derived-flag family, after `sp`, `kin_distance` and the Pynchon RAINBOW set.
//
// VERIFIED NOT TO CATCH THE PYNCHON LINE (Y00004, X03219, X03220, X01014 all false) — it reaches the
// tree through family edges, so the spectrum and the ascension cannot collide.
function computeOrbit(visible, byId) {
	// Undirected family adjacency: parent, child and spouse. NOT cross-connections — a CC is precisely
	// the thing an orbit figure is reached BY, so counting it as an edge would dissolve every component
	// into the tree and the set would always be empty.
	const adj = new Map();
	const link = (a, b) => {
		if (!a || !b || !byId[a] || !byId[b]) return;
		if (!adj.has(a)) adj.set(a, new Set());
		if (!adj.has(b)) adj.set(b, new Set());
		adj.get(a).add(b);
		adj.get(b).add(a);
	};
	for (const p of visible) {
		link(p.id, p.parents?.father_id);
		link(p.id, p.parents?.mother_id);
		for (const m of p.marriages || []) link(p.id, m?.spouse_id);
	}
	// Who is pointed AT by a cross-connection. Needed because clause 2 is satisfied by an edge in EITHER
	// direction — Martha has no CCs of her own, and a component whose only link is inbound is still
	// reachable, which is the only thing the clause is asking.
	const ccTarget = new Set();
	for (const p of visible) {
		for (const cc of p.cross_connections || []) {
			if (cc?.related_id && byId[cc.related_id]) ccTarget.add(cc.related_id);
		}
	}
	const seen = new Set();
	const out = new Set();
	let comps = 0;
	for (const p of visible) {
		if (seen.has(p.id)) continue;
		const comp = [];
		const stack = [p.id];
		seen.add(p.id);
		while (stack.length) {
			const id = stack.pop();
			comp.push(id);
			for (const n of adj.get(id) || []) {
				if (!seen.has(n)) {
					seen.add(n);
					stack.push(n);
				}
			}
		}
		if (comp.some((id) => byId[id].classification?.is_thomas_descendant === true)) continue;
		const reachable = comp.some(
			(id) => (byId[id].cross_connections || []).length > 0 || ccTarget.has(id)
		);
		if (!reachable) continue;
		comps++;
		for (const id of comp) out.add(id);
	}
	log(`  orbit: ${out.size} people in ${comps} components (derived; see computeOrbit)`);
	return out;
}

// ---------------------------------------------------------------------------
// LINE ANCHORS — the easter egg's route back to the Hooker line (design §3.6 / the left timeline)
// ---------------------------------------------------------------------------
// PURELY ADDITIVE. Emits ONE new key, `lineAnchors`, and only on easter-egg payloads (554 of 18,621);
// every other file is byte-identical to before. Nothing existing is read for a different purpose,
// overwritten, or restructured, and canonical.json is untouched — this pre-walks relationships that
// are already there, which is the whole of it.
//
// WHY IT IS BAKED AT ALL. The timeline shows an egg beside the people who connect them to the line:
// Richard Garbrand appears with Susanna (his daughter, who married in) AND Thomas Hooker (the man she
// married). Richard's payload carries Susanna — but not Susanna's husband, because a payload is one
// neighbourhood deep. Measured across all 554 eggs: 16% can already see an `hd` person, 57% can see
// the bridge but not the anchor, 27% (Stowe and her like) have no bridge at all.
//
// Fetching that one extra hop in the client was the obvious alternative and is the wrong one: the
// third bar would resolve after the first two and animate on its own clock, which design §30 names as
// THE failure mode of this layer. Baking it means every bar in a set is known in the same frame.
// Same reasoning, and the same shape, as the kin-distance LCA bake (roadmap §17) and the derived `sp`
// flag (§31.7) — both build-time answers to graph questions a single payload cannot hold.
//
// WHAT THE WALK IS. A breadth-first search from the egg over three edge kinds — child, parent, spouse
// — stopping at the nearest Thomas descendant. BFS rather than a hand-rolled descent because the
// routes genuinely differ in shape: Thomas Hooker I reaches the line through a CHILD, Richard through
// a child-then-marriage, the Commodore Vanderbilt through child-child-marriage, and Louisa Kissam
// through her husband first. One search covers all of them and cannot be wrong about a case nobody
// thought of.
//
// THE ONE ADJUSTMENT, and it is Sam's rule rather than the graph's: if the first step is a SPOUSE,
// that spouse is dropped. A married pair occupies ONE position on the rail and the featured one takes
// it — "if I click his wife Anne Ferrar, she replaces Richard's blue bar so there are still only
// three". Without this, Louisa Kissam would push her own husband onto a fourth lane instead of
// standing where he stands.
const LINE_ANCHOR_MAX_HOPS = 6; // beyond this the connection is not a story anyone is reading

// ── THE EXCEPTIONS — a route home that is CURATED rather than walked ──────────────────────────────
//
// The BFS below answers "who is the nearest Thomas descendant, and how do we reach them", and it is
// right site-wide (Sam, Aug 25: "this is actually the correct behavior site wide and it's working
// well"). A handful of people are the exception, and they are exceptions in a way no rule could
// reach: the graph's nearest answer is CORRECT and is still not the story worth telling.
//
// THE CASE THIS WAS BUILT FOR. Rev. Thomas Ruggles Jr. (X03218) and his wife Rebecca Hart Ruggles
// (X01906) reach the line through HER parents — Rebecca is a Hart, so the walk lands on Rev. John
// Hart (I00137) and Mary Hooker Hart (H00105), and it is not wrong. But what these two are actually
// remembered for sits one generation the other way: their daughter Sarah (X03219) married Joseph
// Pynchon (X03220), which is how this couple enters the Pynchon line at all — they are titled
// "Father-in-law / Mother-in-law of Fifth Generation Pynchon" in pynchonLine.ts, and that title names
// the route this table now draws.
//
// A LIST, NEVER A RULE, and deliberately so. The same call `pynchonLiteralLabel` makes, for the same
// reason: any rule general enough to produce this answer would also reach cases where the walk is
// already right. Sam: "there may be other of these exceptions tree wide, just a few so not worth
// re-writing good architecture." Add a row with a sentence saying why; do not generalise it.
//
// IDS ARE LINE-FIRST — the array's own convention, the same one the walk's `chain.reverse()` produces
// at the end of this function: the person FURTHEST from the focus stands at lane 0, and each later
// lane sits further behind it. So the anchor comes first and the bridge second, exactly as Richard
// Garbrand's walked chain reads [Thomas Hooker, Susanna, Richard].
//
// IT MUST BE BAKED, WHICH IS WHY THIS IS HERE AND NOT IN THE RAIL. The rail draws `PersonCompact`s it
// is handed and cannot invent one. Sarah is Thomas's child and so IS in his neighbourhood payload —
// but Joseph is her HUSBAND, one hop further out, and a payload is one neighbourhood deep. That is
// the same reason the walk itself is baked (see the note above); an override resolved in the client
// could not see half of its own answer.
const LINE_ANCHOR_OVERRIDES = {
	// The Ruggles couple route out through their daughter, not through her mother's Hart parents.
	X03218: ['X03220', 'X03219'], // Joseph Pynchon, then Sarah Ruggles Pynchon
	X01906: ['X03220', 'X03219']
};

/**
 * VALIDATE THE OVERRIDE TABLE AT BUILD TIME — a curator writes ids, not pixels, and every way of
 * getting a row wrong is silent on the rail. Run once from main(); warns and never throws, because a
 * bad row should not stop a 16k rebuild.
 *
 * IT WARNS RATHER THAN FIXING, DELIBERATELY. Each of these has a correct answer that only Sam can give
 * — drop an anchor, reorder, or choose a different person — and a build script guessing one of them is
 * how a curation decision gets made by accident.
 *
 * THE RENDER CAP IS THE ONE WORTH READING TWICE. The rail draws at most FOUR bars and elides the middle
 * of anything longer: `full.length > 3 ? [full[0], full[1], full[full.length - 1]] : full`. That is
 * correct for a WALKED chain, whose middle is its least meaningful part (§35.7) — and wrong for a
 * curated one, which is meaningful throughout by construction. Measured, not inferred: a five-entry
 * chain renders entries 1, 2 and 5, and the two dropped ones leave no trace.
 *
 * NOT FIXED BY RAISING THE CAP, and that is the point of putting the check here. The cap is shared with
 * 13 walked chains that rely on the elision; changing it to serve a curated row would move bars on
 * cards nobody is looking at. A warning costs nothing and stays local to the thing that is unusual.
 */
function validateLineAnchorOverrides(byId) {
	const RAIL_CHAIN_MAX = 3; // the rail's own cap, minus the focus it appends
	for (const [id, targets] of Object.entries(LINE_ANCHOR_OVERRIDES)) {
		const warn = (msg) => console.warn(`  [lineAnchors] override ${id}: ${msg}`);
		if (!byId[id]) warn(`the person this is FOR is not in the visible graph — the row does nothing`);
		if (targets.includes(id)) warn(`names its own subject, which draws them twice on the rail`);
		if (new Set(targets).size !== targets.length) warn(`names the same person more than once`);
		if (targets.length > RAIL_CHAIN_MAX) {
			warn(
				`${targets.length} anchors, but the rail draws ${RAIL_CHAIN_MAX} + the focus and ELIDES THE ` +
					`MIDDLE — ${targets.slice(2, -1).join(', ')} will not appear. See the note above.`
			);
		}
		for (const t of targets) {
			const q = byId[t];
			if (!q) continue; // already reported at bake time, with the ids that failed to resolve
			// A bar needs a year of its own: a chain member is passed NO fallback (the rail only offers
			// one to the focus), so `barFor` returns null and the bar simply is not drawn. Worse than
			// absent — lanes are assigned BEFORE the nulls are filtered, so the survivors keep their
			// original positions and the stack shows a HOLE where this one should have been. Measured.
			const by = q.birth?.year ?? null;
			const dy = q.death?.year ?? null;
			if (by == null && dy == null) warn(`${t} has no birth or death year — its bar cannot draw, and the lane it was assigned stays empty`);
			if (q.classification?.is_searchable === false) warn(`${t} is not searchable — its bar will render but cannot be clicked`);
		}
	}
}

function lineAnchorsFor(p, byId, slugMap) {
	const start = p.id;
	// A CURATED ROUTE WINS OUTRIGHT — no walk, no spouse-collapse, no hop cap. Those rules all exist to
	// make a SEARCH produce a readable answer; a hand-written chain is already the answer, and running
	// it back through them could only damage it (the spouse rule in particular would collapse exactly
	// the pair a curator wrote down on purpose).
	const curated = LINE_ANCHOR_OVERRIDES[start];
	if (curated) {
		const out = curated.filter((id) => byId[id]).map((id) => compact(byId[id], slugMap));
		// A row naming an id that no longer exists is a silent hole, so it is reported rather than
		// quietly serving a short chain. Falling through to the walk would be worse: it would look like
		// the override had been honoured.
		if (out.length !== curated.length) {
			console.warn(
				`  [lineAnchors] override for ${start} names ${curated.length} ids but ${out.length} resolved` +
					` — missing: ${curated.filter((id) => !byId[id]).join(', ')}`
			);
		}
		return out.length ? out : null;
	}
	const prev = new Map([[start, null]]);
	const depth = new Map([[start, 0]]);
	const queue = [start];
	let hit = null;
	for (let qi = 0; qi < queue.length && hit == null; qi++) {
		const id = queue[qi];
		const d = depth.get(id);
		if (d >= LINE_ANCHOR_MAX_HOPS) continue;
		const cur = byId[id];
		if (!cur) continue;
		// SPOUSES FIRST, and the order is the difference between a right and a wrong answer. Richard
		// Garbrand's daughter Susanna married Rev. Thomas Hooker AND bore him Joanna — so from Susanna,
		// her husband and her daughter are both `hd` and both one hop away. Enumerating children first
		// returned Joanna, and Richard's rail read "Joanna, Susanna, Richard" when the story is plainly
		// "Thomas, Susanna, Richard". `sp` means MARRIED INTO THE LINE; the person they married is the
		// anchor, and their children are a generation past the point being made.
		const next = [...spouseIds(id, byId), ...childrenOf(cur), cur.parents?.father_id, cur.parents?.mother_id];
		for (const nid of next) {
			if (!nid || prev.has(nid) || !byId[nid]) continue;
			prev.set(nid, id);
			depth.set(nid, d + 1);
			if (byId[nid].classification?.is_thomas_descendant) {
				hit = nid;
				break;
			}
			queue.push(nid);
		}
	}
	if (hit == null) return null;

	// Unwind to an ordered path [focus, ..., hookerPerson], then present it line-first.
	const path = [];
	for (let cur = hit; cur != null; cur = prev.get(cur)) path.push(cur);
	path.reverse(); // now [focus, ..., hooker]
	const chain = path.slice(1); // drop the focus; the rail already draws them

	// SAM'S SPOUSE RULE, AND THE CONDITION THAT MAKES IT SAFE.
	//
	// A married pair occupies one position, and the featured one takes it — click Anne Ferrar and she
	// stands where Richard stood. That is why a leading spouse is dropped. But dropping one blindly
	// severs chains where the spouse IS the connection, and Alice Hathaway Lee is the case that proved
	// it: her walk is Alice → Theodore → Edith, because Theodore's SECOND wife is the Hooker descendant.
	// Dropping Theodore left [Edith] — two of the same man's wives standing side by side on the rail
	// with the husband who links them missing entirely (Sam: "weird to have two wives together").
	//
	// The test that separates the two: does the focus have an edge of their OWN to the next link?
	//   Louisa Kissam → [William Henry, Cornelius II, ...]  Cornelius II is HER son too. Safe to drop.
	//   Anne Ferrar   → [Richard, Susanna, ...]             Susanna is HER daughter too. Safe to drop.
	//   Alice Lee     → [Theodore, Edith]                   Edith is nothing to Alice. Keep Theodore.
	//
	// So the rule is not "drop a leading spouse" but "collapse a pair only when the chain still holds
	// without them" — which is what standing in someone's place actually requires.
	const linksOwnedByFocus = new Set([
		...childrenOf(byId[start] || {}),
		byId[start]?.parents?.father_id,
		byId[start]?.parents?.mother_id,
		...spouseIds(start, byId)
	]);
	if (
		chain.length > 1 &&
		spouseIds(start, byId).includes(chain[0]) &&
		linksOwnedByFocus.has(chain[1])
	) {
		chain.shift();
	}

	// Reversed so the Hooker person is FIRST: the rail lays lanes out from the line outward, and a
	// consumer should not have to know the walk's direction to read the array.
	return chain.reverse().map((id) => compact(byId[id], slugMap));
}

// ── PATHS TO THOMAS (the connect-to-Thomas modal's entire data layer) ─────────────────────────────
//
// PURELY ADDITIVE. Emits ONE new key, `pathsToThomas`, on 12,844 payloads; every other file is
// byte-identical to before. Nothing existing is read for a different purpose or restructured, and
// canonical.json is untouched — this pre-walks parent pointers that are already there.
//
// WHY IT IS BAKED, which is the same answer as lineAnchors above and for the same reason: a payload is
// ONE NEIGHBOURHOOD DEEP, and a rung eight generations up is nobody's neighbour. The client cannot see
// its own answer. Fetching an index instead was measured and rejected — a static JSON fetch is
// all-or-nothing, so the modal would pay 600+ KB to render thirteen rows, while baking the finished
// chain costs a mean of 2.6 KB inside a payload the page has already loaded. The modal opens with no
// network at all.
//
// THE SHAPE: an array of routes, each an ordered PersonCompact[] running THOMAS FIRST and stopping one
// short of the focus. Two conventions, both inherited rather than invented:
//   - Thomas-first matches lineAnchors' own rule that a consumer should not have to know the walk's
//     direction to read the array, and it matches the render (Sam: "Thomas will always be at the top").
//   - The focus is DROPPED because the payload already carries them as `neighborhood.focus`. The
//     modal appends that one compact; baking it would duplicate ~317 bytes per route.
//
// THE GATE IS THE CHAIN'S OWN LENGTH, NOT `generation_from_thomas`. A chain of >= 2 (Thomas plus at
// least one intermediate) is a grandchild or deeper, which is exactly Sam's rule — Thomas himself and
// his children are excluded, "too implicit in existing structure". Reading the length rather than the
// generation field means the gate cannot be fooled by a null classification, and it disposes for free
// of the 18 people who carry is_thomas_descendant with no parent wiring to support it (HD9826-HD9842
// and their like) — they produce no chain, so they get no key and no button.
//
// MULTIPLE ROUTES ARE PEDIGREE COLLAPSE, and the tree's real ceiling is THREE. Measured across all
// 12,870 descendants: 11,738 have exactly one route, 968 have two, 138 have three, nobody has four.
// The three-route cluster is a single cousin marriage in the Peck/Curtiss line (HD9238-HD9249). The
// cap below is a runaway guard set well above that, not a display limit.
//
// ORDER IS DETERMINISTIC AND MUST STAY THAT WAY. The modal's selector labels these 1, 2, 3, so a route
// that changed position between builds would silently change what "path 2" means to anyone who had
// looked before. Sorted shortest-first, then PATERNAL-FIRST at the point two equal-length routes
// diverge — never by discovery order, which depends on parent-field ordering. The full reasoning for
// the tiebreak, and the id-sequence rule it replaced, is at the sort itself below.
//
// THE STALENESS EXPOSURE, NAMED: like lineAnchors, this embeds a COPY of each rung, and a rung is by
// definition not a neighbour. So `--only` on an ancestor rebuilds their own payload and leaves every
// descendant quoting a stale name or photo. That is the standing exposure of every baked chain in this
// file and the standing answer is unchanged — a full rebuild before commit or deploy.
const THOMAS_ID = 'H00001';
const PATHS_MAX_DEPTH = 26; // runaway guard; the deepest real chain measured is 14 rungs
const PATHS_MAX_ROUTES = 8; // ditto; the measured ceiling is 3

/** One rung: the person's compact plus their blurb. Hoisted out of pathsToThomasFor because the
 *  married-in case below needs to build the partner's own rung to put on the end of every route. */
function rungOf(id, byId, slugMap) {
	const c = compact(byId[id], slugMap);
	const bl = (byId[id] && (byId[id].notable?.notable_blurb || byId[id].bio?.bio_blurb)) || null;
	if (bl) c.bl = bl;
	return c;
}
function pathsToThomasFor(p, byId, slugMap) {
	const start = p.id;
	if (start === THOMAS_ID) return null;
	const routes = [];
	let cappedRoutes = false;
	let cappedDepth = false;
	// Every distinct parent-hop sequence from the focus up to Thomas. `acc` carries the route so far and
	// doubles as the cycle guard — a pedigree collapse legitimately revisits an ancestor by a different
	// branch, but never within one route.
	const walk = (id, acc) => {
		if (routes.length >= PATHS_MAX_ROUTES) {
			cappedRoutes = true;
			return;
		}
		if (acc.length > PATHS_MAX_DEPTH) {
			cappedDepth = true;
			return;
		}
		if (id === THOMAS_ID) {
			routes.push([...acc, id]);
			return;
		}
		const cur = byId[id];
		if (!cur) return;
		const par = cur.parents || {};
		for (const q of [par.father_id, par.mother_id]) {
			if (q && byId[q] && !acc.includes(q)) walk(q, [...acc, id]);
		}
	};
	walk(start, []);
	// NO SILENT CAPS. Neither guard has ever fired — measured across the whole corpus at max 3 routes
	// and max 14 rungs, against caps of 8 and 26. So a hit means the graph changed shape (a new cousin
	// marriage, or a cycle the `acc` guard did not catch) and this person's route list is INCOMPLETE,
	// which must not pass quietly: a truncated list still renders as a confident 1 | 2 | 3.
	if (cappedRoutes) {
		console.warn(
			`  [pathsToThomas] ${start}: stopped at ${PATHS_MAX_ROUTES} routes — the list is incomplete`
		);
	}
	if (cappedDepth) {
		console.warn(`  [pathsToThomas] ${start}: a branch exceeded ${PATHS_MAX_DEPTH} hops`);
	}
	if (!routes.length) return null;

	/**
	 * THE RUNG'S SECOND LINE — a blurb, and the spouse the LINE ITSELF runs through.
	 *
	 * `bl` is `notable_blurb ?? bio_blurb`, in that order, because a notable's blurb SHADOWS their bio
	 * one everywhere else in the app (the card reads the same pair the same way) and a ladder that
	 * disagreed with the card about a person's one-line description would be a second source of truth.
	 * 60.2% of chain rungs have one; the rest simply have no second line.
	 *
	 * THE CHAIN-SPOUSE WAS BUILT HERE AND REMOVED. Each rung briefly also carried `cs`/`cy` — the
	 * co-parent of the next rung down, i.e. the marriage the descent itself passed through, which is a
	 * genuinely better fact than "this person's spouse" for someone who had several. It rendered as
	 * "Husband of Susanna Garbrand (m. 1621)" at the right of the blurb and Sam cut it on sight: "too
	 * much in one card." Recorded rather than mourned — the derivation is four lines (co-parent of
	 * `belowId`, then `date_year` off the matching marriage) and the rung already receives the id below
	 * it, so it is cheap to restore if a second line ever earns its keep.
	 */
	const blurbOf = (q) => (q && (q.notable?.notable_blurb || q.bio?.bio_blurb)) || null;
	const rung = (id) => rungOf(id, byId, slugMap);

	// [focus, parent, ..., Thomas] -> drop the focus, then reverse to put Thomas first.
	const chains = routes.map((r) => r.slice(1).reverse()).filter((c) => c.length >= 2);
	if (!chains.length) return null;
	// PATERNAL-FIRST AT EACH DIVERGENCE — the tiebreak, and worth the lines it costs.
	//
	// Length decides first: the most direct descent is path 1. When two routes are the SAME length the
	// order still has to be decided, because the modal's selector labels them 1, 2, 3 and a route that
	// moved between builds would silently change what "path 2" means to anyone who had looked before.
	//
	// The obvious tiebreak — compare the two id sequences as strings — is stable and is NOT explainable.
	// On Sam's own card the two chains part at Hon. John Hooker, and the id rule put his father's line
	// first only because `H00098` happens to sort before `H00104`, i.e. because John Hooker was entered
	// into the catalogue before Roger Hooker. Renumber those two and the paths swap with nothing to
	// explain it.
	//
	// So the comparison is read from the FOCUS END instead: at each hop up, a route through the FATHER
	// sorts before a route through the mother. That is the convention every pedigree chart already uses
	// (Ahnentafel puts the father first at every level), it survives any future renumbering, and it is
	// explainable in one sentence at the selector — "path 1 is your father's line". On Charles Elihu
	// Curtiss (HD9249) it genuinely reorders: his two 8-rung routes swap, because Samuel Peck is
	// Clemence's father and [Wife] Ingersoll Peck is her mother.
	//
	// The key is total on its own — two chains of equal length with the same father/mother sequence
	// have made the same choice at every level and so ARE the same chain. No further tiebreak is needed.
	const paternalKey = (chain) => {
		const seq = [];
		let below = start;
		for (let i = chain.length - 1; i >= 0; i--) {
			const par = (byId[below] && byId[below].parents) || {};
			seq.push(par.father_id === chain[i] ? '0' : '1');
			below = chain[i];
		}
		return seq.join('');
	};
	chains.sort((a, b) => {
		if (a.length !== b.length) return a.length - b.length;
		const ka = paternalKey(a);
		const kb = paternalKey(b);
		return ka < kb ? -1 : ka > kb ? 1 : 0;
	});
	return chains.map((c) => c.map((id) => rung(id)));
}

// Builds the self-contained payload that /person/[slug] fetches.
// `clientById` are the stripped client records (research_notes etc. removed).
// `reg` bundles the registry lookups: { landmarkById, artworkById, documentById,
// videoById, statuesBySubject }.
// Is `ancId` a direct-line ancestor of `descId`? Walk the descendant's parent chains (father_id /
// mother_id) upward, cycle-guarded and bounded. Build-time only.
function isAncestorOf(ancId, descId, byId) {
	if (!ancId || !descId) return false;
	const seen = new Set();
	const stack = [descId];
	while (stack.length) {
		const cur = stack.pop();
		if (!cur || seen.has(cur)) continue;
		seen.add(cur);
		if (seen.size > 8000) break; // runaway guard
		const par = (byId[cur] && byId[cur].parents) || {};
		if (par.father_id === ancId || par.mother_id === ancId) return true;
		if (par.father_id) stack.push(par.father_id);
		if (par.mother_id) stack.push(par.mother_id);
	}
	return false;
}
// A CC's genealogical laterality, derived from the graph (NEVER from label text). 'direct' = one of
// the pair is in the other's ancestor chain (parent/grandparent line OR child/grandchild line) — the
// flight arrives vertically. 'collateral' = uncle/cousin/in-law/orbit — the flight tilts by Δx. This
// is the honest laterality signal the tidy-tree x-delta can't give (a granddaughter can sit 800 seats
// from her grandmother's centroid yet is genealogically straight-down).
// An authored lineal_gap on a CC, or null. Guarded hard: only a non-zero integer counts, because a 0
// would assert "same generation" and isVerticalMove reads 0 as lateral — a silently ignored override is
// worse than none. Anything else (absent, null, "2", 1.5, 0) falls through to the graph derivation.
function ccLinealGap(cc) {
	const v = cc && cc.lineal_gap;
	return Number.isInteger(v) && v !== 0 ? v : null;
}
// The MIRROR of lineal_gap: `lateral: true` forces a CC to fly sideways when the graph would send it
// up or down. It exists for connections that ARE same-tier socially but score a generation offset
// because the only path between the two people runs through a marriage edge — brothers-in-law being
// the case Sam named (Bolton Coit Brown and Herbert Nash score gen_delta ±1, kin_distance 4, which
// isVerticalMove reads as vertical). Emitting gen_delta 0 is what does the work: isVerticalMove
// early-returns lateral on 0 before it ever consults relation_class or kin_distance.
// Takes precedence over lineal_gap, which is the opposite assertion — a CC carrying both is a
// contradiction, and the explicit sideways instruction is the safer one to honour.
function ccLateral(cc) {
	return !!(cc && cc.lateral === true);
}
function relationClass(sourceId, targetId, byId) {
	if (!sourceId || !targetId || sourceId === targetId) return 'collateral';
	if (isAncestorOf(targetId, sourceId, byId) || isAncestorOf(sourceId, targetId, byId))
		return 'direct';
	return 'collateral';
}

// ── KIN DISTANCE (the §19.4 LCA bake — design §22.2b) ──────────────────────────────────────────
// How far apart two people are on the FAMILY graph: edges through their nearest shared ancestor,
// |source→LCA| + |LCA→target|, with ONE marriage allowed to bridge the two blood lines.
// The blood ladder: parent/child 1, sibling or grandparent 2, uncle/niece 3, grandaunt/grandnephew 4,
// first-cousin-once-removed 5, second cousin 6.  null = no route inside the cap (true orbit/strangers).
//
// MARRIAGE IS A REAL EDGE, AND IT COSTS KIN_MARRIAGE_COST (Sam, Aug 3). A father-in-law is up your
// line — Esther Edwards Burr H00378 → Daniel Burr X03446 is her husband's father and must fall in from
// the TOP, with the reciprocal rising from the BOTTOM. Blood-only kinship called that pair strangers
// and sent it sideways, which ALSO made this bake disagree with its own other half: effectiveGen below
// already rides marriages (a spouse of a grandparent is grandparent-tier), so gen_delta said "one tier
// up" while kin distance said "unrelated". One graph, one answer — both halves ride the marriage now.
//
// The hop costs 2, not 1, and that is the whole tuning: at 2 the in-laws Sam named ride vertical
// (father/mother-in-law 1+2 = 3, spouse's grandparent 4, spouse's uncle 5) while the blood ladder keeps
// its exact meaning and the IN-LAWS OF DISTANT COLLATERALS fall out — James Pierpont II → William
// Bristol, the husband of his grandniece, lands at 6 and stays lateral, where at cost 1 it would have
// verticalized on a tie nobody would call "up my line".
//
// This is what the DECK's "same line" test rides on now. It REPLACES the retired seat-distance proxy
// (|Δseats| ≤ 180), which conflated "same genealogical line" with "seated near each other in the tidy
// tree" and got it wrong in BOTH directions: John Pierpont H00388 and his uncle-guardian James
// Pierpont II H00116 sit >180 seats apart and rode lateral; Lovejoy and J.P. Morgan happened to land
// 0.4 seats apart and flew a family vertical as strangers. Seats measure where the layout put someone;
// kin distance measures the graph. Build-time only, per the §2 doctrine — never walked at runtime.
//
// Shared infrastructure, not deck-only: the same value is the arc's felt-distance trigger (§19.4) and
// the substrate for any future "how far apart are these two" affordance / the connect-to-anyone modal.
const KIN_MAX_DEPTH = 10; // generations walked up each side before we call it "far"
const KIN_EMIT_CAP = 8; // beyond this the deck treats it as null anyway — don't fatten 3k CC rows
const KIN_MARRIAGE_COST = 2; // a marriage edge, priced against the blood ladder (see the note above)
const ancestorDepthCache = new Map(); // id -> Map(ancestorId -> min depth). One build, one graph.
// Every ancestor of `id` with its MINIMUM depth (id itself at 0). Breadth-first so the first depth
// recorded is the shortest — a pedigree collapse (cousin marriage) can reach the same ancestor twice.
function ancestorDepths(id, byId) {
	const hit = ancestorDepthCache.get(id);
	if (hit) return hit;
	const depths = new Map([[id, 0]]);
	let frontier = [id];
	for (let depth = 1; depth <= KIN_MAX_DEPTH && frontier.length; depth++) {
		const next = [];
		for (const cur of frontier) {
			const par = (byId[cur] && byId[cur].parents) || {};
			for (const q of [par.father_id, par.mother_id]) {
				if (q && byId[q] && !depths.has(q)) {
					depths.set(q, depth);
					next.push(q);
				}
			}
		}
		frontier = next;
	}
	ancestorDepthCache.set(id, depths);
	return depths;
}
// Pure BLOOD distance: edges through the nearest common ancestor, or null if the two ancestor sets
// never meet inside KIN_MAX_DEPTH.
function bloodDistance(sourceId, targetId, byId) {
	if (!sourceId || !targetId || sourceId === targetId) return null;
	if (!byId[sourceId] || !byId[targetId]) return null;
	let a = ancestorDepths(sourceId, byId);
	let b = ancestorDepths(targetId, byId);
	if (a.size > b.size) [a, b] = [b, a]; // scan the smaller side
	let best = null;
	for (const [id, da] of a) {
		const db = b.get(id);
		if (db == null) continue;
		const sum = da + db;
		if (best === null || sum < best) best = sum;
	}
	return best;
}
function spouseIds(id, byId) {
	const p = byId[id];
	if (!p) return [];
	return (p.marriages || []).map((m) => m && m.spouse_id).filter((s) => s && byId[s]);
}
// The shortest route between two people over blood edges plus AT MOST ONE marriage on each side —
// which is what "in-law" means: my spouse's blood line, or my blood line's spouse. Two marriage hops
// (my spouse's parent's spouse — a step-parent-in-law) is the outer limit and is priced accordingly.
function kinDistance(sourceId, targetId, byId) {
	if (!sourceId || !targetId || sourceId === targetId) return null;
	if (!byId[sourceId] || !byId[targetId]) return null;
	let best = bloodDistance(sourceId, targetId, byId);
	const consider = (d, hops) => {
		if (d == null) return;
		const total = d + hops * KIN_MARRIAGE_COST;
		if (best === null || total < best) best = total;
	};
	const sourceSpouses = spouseIds(sourceId, byId);
	const targetSpouses = spouseIds(targetId, byId);
	for (const s of sourceSpouses) consider(bloodDistance(s, targetId, byId), 1);
	for (const t of targetSpouses) consider(bloodDistance(sourceId, t, byId), 1);
	for (const s of sourceSpouses)
		for (const t of targetSpouses) consider(bloodDistance(s, t, byId), 2);
	return best !== null && best <= KIN_EMIT_CAP ? best : null;
}

// Effective generation for the DECK direction: a person's own generation_from_thomas, else a married
// partner's (a spouse of a grandparent is grandparent-tier — they ride the line via marriage), else — for
// EASTER EGGS only — one generation ABOVE a child-in-law (a famous figure who joins the tree solely through
// a CHILD's marriage into the line, e.g. William Henry Vanderbilt, whose son married gen-9 Alice → gen 8).
// Else null (orbit / unrelated / no descent). Scoped to easter eggs (Sam): an easter egg with no such
// marriage — like Rockefeller — stays ungenerationed, so its CCs to other lines correctly ride lateral.
function effectiveGen(id, byId) {
	const p = id && byId[id];
	if (!p) return null;
	const gen = (q) => q && q.classification && q.classification.generation_from_thomas;
	if (gen(p) != null) return gen(p);
	for (const m of p.marriages || []) {
		const sp = m.spouse_id && byId[m.spouse_id];
		if (gen(sp) != null) return gen(sp);
	}
	if (p.classification && p.classification.is_easter_egg) {
		for (const m of p.marriages || [])
			for (const cid of m.children_ids || [])
				for (const cm of (byId[cid] && byId[cid].marriages) || [])
					if (gen(byId[cm.spouse_id]) != null) return gen(byId[cm.spouse_id]) - 1;
	}
	return null;
}

// gen_delta = effGen(target) − effGen(source): the KINSHIP generation gap the deck uses for direction.
// NULL when either side has no effective generation (orbit/unrelated → the riffle rides LATERAL, never
// vertical — vertical is reserved for climbing/descending the family line). deckDirFor: null/0 → lateral,
// < 0 → target is an ancestor tier (from TOP), > 0 → a descendant tier (from BOTTOM). NOT a birth-year gap.
function genDelta(sourceId, targetId, byId) {
	const s = effectiveGen(sourceId, byId);
	const t = effectiveGen(targetId, byId);
	if (s == null || t == null) return null;
	return t - s;
}

function personPayload(p, byId, clientById, slugMap, cemById, instById, reg) {
	const context = {};
	for (const id of contextIds(p, byId)) context[id] = clientById[id];

	const instIds = collectInstitutionIds(p, new Set());
	const institutionsById = {};
	for (const id of instIds) if (instById[id]) institutionsById[id] = instById[id];

	const cemeteryId = p.burial && p.burial.cemetery_id;
	const burialCemetery = (cemeteryId && cemById[cemeteryId]) || null;

	const crossConnections = (p.cross_connections || [])
		// SEVERANCE: drop connections whose target is hidden. This is the ONE emit path that does not
		// self-degrade — the row below reads `slugMap.get(...)`, and slugMap deliberately still holds
		// hidden people (slug reservation), so without this filter a hidden target would render a
		// live-looking link to a page that was never written. The reciprocal stays in canonical.json
		// untouched, so re-sewing restores both sides.
		.filter((cc) => !hiddenIds.has(cc.related_id))
		.map((cc) => {
			// hidden_by_default: the CC target is Talcott-only (grove) — the Talcott toggle (a later block)
			// suppresses these on Hooker cards. Render annotation only; the data is untouched. Baked at
			// build time so the cold path works before table-index loads.
			const tgt = byId[cc.related_id];
			const tc = tgt && tgt.classification;
			const talcottOnly = Boolean(
				tc && tc.is_talcott_descendant === true && tc.is_thomas_descendant !== true
			);
			const out = {
				type: cc.type,
				related_id: cc.related_id,
				link_text: cc.link_text,
				display_label: cc.display_label ?? '',
				slug: slugMap.get(cc.related_id) ?? null,
				// Phase 3b: the CC target's table seat, baked at build time — a CC link is NOT a chip (no
				// data-flight-id box), so this is how the camera store gets a real `to` for the directional
				// arrival. y may be null (no time basis: the consumer degrades to a screen-vector-only move).
				t: tableCoords.get(cc.related_id) ?? null,
				// direct-vs-collateral, walked from the parent graph (see relationClass). Still baked for other
				// consumers, but the DECK direction now keys off gen_delta below, not this.
				// LINEAL_GAP — the surgical axis override (Sam, 10 Aug 2026). Both graph derivations
				// below need a PATH between the two people; when the connecting relative is deliberately
				// not an entry, there is no path, so relationClass falls to 'collateral' and genDelta to
				// null, and flight.ts's isVerticalMove sends a genuine grandparent link sideways.
				//
				// A CC may therefore author `lineal_gap`: a signed integer of generations, same sign
				// convention as gen_delta (effGen(target) − effGen(source), so NEGATIVE when the target
				// is the ancestor). Present and non-zero, it asserts "these two ARE on one line, N tiers
				// apart" and supplies both facts isVerticalMove wants. Each direction authors its own
				// sign, exactly as display_label already differs per direction.
				//
				// Deliberately NOT a raw 'axis: vertical' flag: the deck needs the SIGN to know whether
				// the convoy climbs or falls, and a bare axis would have to guess. Nothing downstream
				// changed — the blade already forwards relation_class/gen_delta to the data attributes.
				relation_class: ccLateral(cc)
					? 'collateral'
					: ccLinealGap(cc) != null
						? 'direct'
						: relationClass(p.id, cc.related_id, byId),
				// KINSHIP generation gap (see genDelta) — the deck's direction signal. null → lateral (orbit,
				// unrelated, OR a same-generation cousin: kin, but not up/down the line); < 0 → target is an
				// ancestor tier (rides in from TOP); > 0 → a descendant tier (from BOTTOM). Never a birth-year gap.
				gen_delta: ccLateral(cc) ? 0 : (ccLinealGap(cc) ?? genDelta(p.id, cc.related_id, byId))
			};
			// KIN DISTANCE (see kinDistance) — edges to the nearest shared ancestor. The deck's SAME-LINE
			// test: a close-kin pair with a generation gap rides VERTICAL no matter where the tidy tree
			// seated them. Omitted (absent, not null) when there is no shared ancestor inside the cap, so
			// the far/orbit majority costs nothing on the wire.
			const kd = kinDistance(p.id, cc.related_id, byId);
			if (kd != null) out.kin_distance = kd;
			// ORBIT (roadmap §40) — is the person on the OTHER end of this link inside a detached
			// component? The ascension's axis is a DELTA (does orbit-ness change across this navigation),
			// and the delta is resolved at CLICK time in warmPersonLinks, which reads its whole flight off
			// the anchor's data attributes. So the target's orbit-ness has to ride the row, exactly as
			// relation_class, gen_delta and kin_distance already do — the source's is already in hand as
			// featured.current.person.orbit.
			// Emitted only when TRUE, like kin_distance, so the non-orbit majority costs nothing.
			if (orbitIds.has(cc.related_id)) out.orbit = true;
			if (talcottOnly) out.hidden_by_default = true;
			return out;
		});

	// Only eggs are walked — everyone else's route to the line is either "they are on it" or their own
	// spouse, both of which the neighbourhood already carries.
	// `is_easter_egg` is the ordinary gate — the walk is only meaningful for someone off the line. An
	// OVERRIDE is honoured regardless, so a curated route never depends on a classification flag that
	// was set for unrelated reasons. Both of today's entries happen to be eggs; the next one may not be.
	const lineAnchors =
		p.classification?.is_easter_egg || LINE_ANCHOR_OVERRIDES[p.id]
			? lineAnchorsFor(p, byId, slugMap)
			: null;

	// Descendants only — the modal is a DESCENT, and an orbit figure or an easter egg has no such thing
	// (their route to the line is lineAnchors above, which is a different question with a different
	// shape). Spouses are excluded for now by the same test; if they join later they hang off the side
	// of their partner's row rather than owning a chain of their own.
	/**
	 * A MARRIED-IN SPOUSE BORROWS THEIR HOOKER PARTNER'S LADDER (Sam, Aug 26).
	 *
	 * The membership test is `marriedIntoLine`, which already means exactly this and is already derived
	 * for the chip shading: NOT a Thomas descendant, and married to someone who IS. Reusing it rather
	 * than re-deriving keeps one answer to one question — and it is a GRAPH question computed once for
	 * the corpus, not a property asked 18,621 times.
	 *
	 * NEVER FOR AN EASTER EGG OR AN ORBIT FIGURE (Sam, explicitly). An egg's route to the line is
	 * `lineAnchors`, which is a different question with a different shape, and an orbit figure has no
	 * route at all — that is what makes them orbit. A married-in spouse is neither: they are standing
	 * beside someone who is on the line, which is precisely what the paired last rung says.
	 *
	 * THE CHAIN IS THE PARTNER'S, AND IT KEEPS THE PARTNER ON THE END. For a descendant the chain stops
	 * one short of the focus because the payload already carries them; here the last rung IS the partner
	 * and the focus stands beside them, so the partner has to be in the array. `pathsSpouse` tells the
	 * client which of the two shapes it has — without it the ladder would append the married-in person
	 * below their own partner as though they descended from them.
	 *
	 * FIRST HOOKER SPOUSE BY MARRIAGE ORDER, not by chain length. `marriage_number` is what the card
	 * sorts spouses by, so the ladder names the same partner the card shows first; picking the shortest
	 * route instead would silently disagree with the chips a foot above it.
	 */
	const pathsToThomas = p.classification?.is_thomas_descendant
		? pathsToThomasFor(p, byId, slugMap)
		: null;
	let pathsSpouseOf = null;
	if (
		!pathsToThomas &&
		marriedIntoLine.has(p.id) &&
		!p.classification?.is_easter_egg &&
		!orbitIds.has(p.id)
	) {
		const partner = (p.marriages || [])
			.slice()
			.sort((a, b) => (a?.marriage_number ?? 99) - (b?.marriage_number ?? 99))
			.map((m) => m && m.spouse_id)
			.find((q) => q && byId[q]?.classification?.is_thomas_descendant);
		if (partner) {
			const inherited = pathsToThomasFor(byId[partner], byId, slugMap);
			if (inherited) {
				// The partner is appended to every route, because for THEM the chain stopped one short.
				const tail = rungOf(partner, byId, slugMap);
				pathsSpouseOf = inherited.map((c) => [...c, tail]);
			}
		}
	}

	// Resolved media arrays live ON the focus person record (person.landmarksResolved,
	// etc.) so the component reads them through its existing `person` prop. Spread a
	// fresh object (don't mutate the shared clientById — context entries stay lean).
	return {
		person: {
			...clientById[p.id],
			landmarksResolved: resolveLandmarks(p, reg.landmarkById),
			artworksResolved: resolveArtworks(p, reg.artworkById),
			documentsResolved: resolveDocuments(p, reg.documentById),
			statuesResolved: resolveStatues(p, reg.statuesBySubject),
			videosResolved: resolveVideos(p, reg.videoById)
		},
		neighborhood: neighborhood(p, byId, slugMap),
		context,
		burialCemetery,
		institutionsById,
		crossConnections,
		// ADDITIVE AND SPARSE: present only on easter eggs that actually reach the line, absent on
		// everyone else — so `lineAnchors` costs nothing on 18,000 payloads and no existing consumer
		// sees a new key. Computed ONCE above; the BFS is cheap but this runs 18,621 times.
		...(lineAnchors ? { lineAnchors } : {}),
		// ADDITIVE AND SPARSE, exactly like lineAnchors above: present on the 12,844 descendants who are
		// a grandchild or deeper, absent on the other 6,884 payloads, which stay byte-identical.
		...(pathsToThomas ? { pathsToThomas } : {}),
		// The married-in case reuses the SAME key, so every consumer reads one thing; `pathsSpouse` is
		// the only signal that the last rung is a partner to stand beside rather than a parent above.
		...(pathsSpouseOf ? { pathsToThomas: pathsSpouseOf, pathsSpouse: true } : {}),
		// ORBIT (roadmap §40) — the single predicate the whole ascension reads: the ground darkens on it,
		// the X appears on it, and the flight axis keys off whether it CHANGED across the navigation.
		// Sparse: emitted only for the ~94 who are, so 18,000 payloads are byte-identical to before.
		...(orbitIds.has(p.id) ? { orbit: true } : {})
	};
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function main() {
	log(`Reading canonical: ${CONFIG.input}`);
	const data = JSON.parse(readFileSync(CONFIG.input, 'utf8'));
	const people = data.people || [];

	// TALCOTT SEVERANCE — Phase 2. `classification.hidden` (a tag string, e.g. 'talcott_2026')
	// means: this person stays in canonical.json in full, and stops being emitted. Absent = visible.
	//
	// THE SPLIT IS THE WHOLE DESIGN. Two lists, two jobs:
	//   `people`  — ALL of them. Feeds slugMap and computeTableCoords ONLY.
	//   `visible` — what gets emitted, and what byId is built from.
	//
	// byId is the VISIBILITY GRAPH. Every chip in neighborhood() is built through
	// `cm = (id) => (id && byId[id] ? compact(...) : null)`, and children/grandchildren/siblings
	// all `.filter(Boolean)` while parents are `if (byId[...])`-guarded — so dropping a person
	// from byId makes them vanish from every chip through machinery that already exists and is
	// already exercised by dangling ids. No chip filter is written, or wanted.
	//
	// slugMap keeps the FULL list on purpose: a hidden person's slug stays RESERVED, so
	// (a) collision suffixes on visible people never shift, and (b) no future person can claim
	// `samuel-talcott-sr-1708` and collide when this is re-sewn. The page is simply never written,
	// so the URL 404s as a static miss — no redirect, because they did not move.
	//
	// computeTableCoords also keeps the FULL list: seating it on `visible` would repack the x-axis
	// and MOVE EVERY REMAINING SEAT, reflowing the table view and invalidating flight captures.
	// Hidden people get seats nothing consumes; every visible seat stays exactly where it was.
	hiddenIds = new Set(people.filter((p) => (p.classification || {}).hidden).map((p) => p.id));
	const visible = people.filter((p) => !hiddenIds.has(p.id));
	const byId = Object.fromEntries(visible.map((p) => [p.id, p]));
	// Curated routes home are ids typed by hand; every way of getting one wrong is silent on the rail.
	validateLineAnchorOverrides(byId);
	marriedIntoLine = new Set(
		visible
			.filter((p) => {
				if ((p.classification || {}).is_thomas_descendant === true) return false; // blood wins
				return (p.marriages || []).some(
					(m) =>
						m &&
						m.spouse_id &&
						byId[m.spouse_id] &&
						(byId[m.spouse_id].classification || {}).is_thomas_descendant === true
				);
			})
			.map((p) => p.id)
	);
	orbitIds = computeOrbit(visible, byId);
	log(`  ${people.length} people (${visible.length} visible, ${hiddenIds.size} hidden)`);
	log(`  ${marriedIntoLine.size} married into the Hooker line (derived; see marriedIntoLine)`);

	// Table coordinates (Phase 3a Block 1) — derived at emit time, one seat per person. Set the
	// module-level map so compact() emits `t` on every payload; the aggregates (table-index +
	// anomaly worklist) are written below in the !only block.
	const coordResult = computeTableCoords(people);
	tableCoords = coordResult.coords;
	log(
		`  table coords: ${coordResult.stats.yDated} dated / ${coordResult.stats.yEstimated} estimated / ${coordResult.stats.yNull} null-y | ` +
			`Hooker seats 0..${coordResult.stats.hookerSeats} · grove ${coordResult.stats.groveStart}..${coordResult.stats.groveEnd} · ` +
			`archipelago ${coordResult.stats.archipelago} · gutter ${coordResult.stats.gutterOrphans} · detached-td ${coordResult.stats.detachedTd}`
	);

	// --only ID1,ID2  (or ONLY_IDS env): incremental REVIEW rebuild. Regenerate ONLY these
	// people's page payloads and SKIP every aggregate file (people.json / search-index / stats /
	// redirects / cemeteries / institutions) and the dir wipe. A card fetches only its own
	// /person/<slug>.json, so that's all a per-batch review needs — turns a 16k-file rebuild into
	// a handful of writes. Run a FULL rebuild (no --only) before commit/deploy to refresh the
	// aggregates and any OTHER card that embeds a changed person (relatives, CC partners).
	const onlyArg = (() => {
		const i = process.argv.indexOf('--only');
		if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
		const eq = process.argv.find((a) => a.startsWith('--only='));
		if (eq) return eq.slice('--only='.length);
		return process.env.ONLY_IDS || null;
	})();
	const only = onlyArg
		? new Set(
				onlyArg
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean)
			)
		: null;
	// ── AN OVERRIDE TARGET DRAGS ITS REFERRERS IN WITH IT ────────────────────────────────────────
	// `lineAnchors` embeds a COPY of each anchor, and a curated anchor is not a neighbour of the
	// person citing it — that is the whole reason the override has to be baked (see
	// LINE_ANCHOR_OVERRIDES). So `--only X03220` rebuilds Joseph's own payload and leaves Thomas and
	// Rebecca serving the Joseph of an hour ago: right name, stale everything else. Demonstrated by
	// mtime, not assumed.
	//
	// The walk has the same exposure and always has — Richard Garbrand's chain carries Susanna's
	// HUSBAND, who is not in Richard's payload — and the standing answer is "full rebuild before
	// commit/deploy", which still stands and still covers it. What is different here is that the
	// dependency is declared in a constant in THIS file: a Stream A editor touching Sarah or Joseph
	// has no way to know two other cards quote them. A dependency we wrote down is one we can honour
	// automatically, so we do.
	//
	// Deliberately NOT generalised to the walk. Inverting 492 baked chains to find every referrer
	// would mean running the BFS for all of them before knowing what to rebuild, which is the whole
	// job — and it would quietly turn a two-file review rebuild into an unpredictable one. This
	// covers the case whose dependency is a fact about the source, and leaves the rest to the
	// full rebuild that already owns it.
	if (only) {
		const pulled = [];
		for (const [referrer, targets] of Object.entries(LINE_ANCHOR_OVERRIDES)) {
			if (only.has(referrer)) continue;
			if (targets.some((t) => only.has(t))) {
				only.add(referrer);
				pulled.push(referrer);
			}
		}
		if (pulled.length) log(`  --only: +${pulled.length} line-anchor referrer(s): ${pulled.join(', ')}`);
	}
	if (only) log(`  --only: ${only.size} people (aggregates + dir wipe skipped)`);

	// 1) compute base slugs, then resolve collisions deterministically by ID
	const groups = new Map(); // base -> [ids]
	const stickyOf = new Map();
	const priorOf = new Map(); // id -> year-bearing slug this person had before privacy dropped it
	for (const p of people) {
		const { base, sticky, priorBase } = baseSlug(p);
		stickyOf.set(p.id, sticky);
		if (priorBase) priorOf.set(p.id, priorBase);
		if (!groups.has(base)) groups.set(base, []);
		groups.get(base).push(p.id);
	}
	const slugMap = new Map(); // id -> final slug
	let collisions = 0;
	for (const [base, ids] of groups) {
		ids.sort(); // deterministic, ID order
		ids.forEach((id, i) => {
			slugMap.set(id, i === 0 ? base : `${base}-${i + 1}`);
			if (i > 0) collisions++;
		});
	}
	const sticky = [...stickyOf.values()].filter(Boolean).length;
	log(
		`  slugs: ${sticky} sticky / ${people.length - sticky} provisional, ${collisions} collision suffixes`
	);
	const privateCount = people.filter(datesPrivate).length;
	log(
		`  living: ${privateCount} people with dates suppressed (${priorOf.size} slugs lost their year)`
	);

	// 2) people.json — full records, slug written, research_notes (etc.) stripped
	const clientPeople = visible.map((p) => {
		const out = { ...p, slug: slugMap.get(p.id), t: tableCoords.get(p.id) ?? null };
		// FeaturedCard reads person.birth / person.death off the FULL record, not the compact,
		// so the gate has to ride here too.
		if (datesPrivate(p)) out.pv = true;
		for (const f of CONFIG.stripFromClient) delete out[f];
		return out;
	});

	// 3-5) aggregate bundle files. SKIPPED entirely in --only mode (a card fetches only its own
	// per-person payload). Declared out here so the closing summary can log them either way.
	let searchIndex = [];
	let redirects = {};
	let thomasDescendants = 0;
	let talcottDescendants = 0;
	if (!only) {
		// 3) search-index.json
		searchIndex = visible.map((p) => searchRow(p, slugMap));

		// 4) redirects: every former/merged id -> current slug
		for (const p of visible) {
			const current = slugMap.get(p.id);
			const olds = [
				...(p.former_ids || []),
				...(p.former_id ? [p.former_id] : []),
				...(p.merged_ids || [])
			];
			for (const old of olds) redirects[old] = current;
		}
		// Living people lost the birth year off their slug; forward the retired form so an old
		// link still lands. Computed here rather than written as former_ids into canonical —
		// the mapping is a function of the privacy rule, so it must move when the rule does.
		for (const [id, prior] of priorOf) {
			const current = slugMap.get(id);
			if (prior && current && prior !== current && !redirects[prior]) redirects[prior] = current;
		}

		// 5) write the bundle
		const W = (rel, obj) => {
			const full = join(CONFIG.repoRoot, rel);
			mkdirSync(dirname(full), { recursive: true });
			writeFileSync(full, JSON.stringify(obj)); // minified
			return full;
		};
		W(join(CONFIG.dataDir, 'people.json'), clientPeople);
		W(join(CONFIG.dataDir, 'search-index.json'), searchIndex);
		if (data.cemeteries) W(join(CONFIG.dataDir, 'cemeteries.json'), data.cemeteries);
		if (data.institutions) W(join(CONFIG.dataDir, 'institutions.json'), data.institutions);
		W(CONFIG.redirectsFile, redirects);

		// 5b) stats.json — corpus tallies computed at build time so the client ships
		// the number, never counts. Strict === true so null/undefined never count.
		for (const p of visible) {
			const c = p.classification || {};
			if (c.is_thomas_descendant === true) thomasDescendants++;
			if (c.is_talcott_descendant === true) talcottDescendants++;
		}
		W(join(CONFIG.dataDir, 'stats.json'), {
			total: visible.length,
			thomasDescendants,
			talcottDescendants
		});

		// 5b-ii) notables.json — the SHUFFLE pool. One row per eligible notable so the client can pick a
		// random one without touching people.json (30 MB, never loaded) or search-index.json (3.2 MB,
		// and it carries no notable flag). Eligibility is computed HERE, at build time, so the client
		// ships a list it can trust rather than a filter it has to re-derive:
		//   is_notable === true   AND   is_searchable === true
		// `visible` already excludes the hidden (the Talcott severance), so nothing hidden can surface.
		// Strict === true throughout, so a null or a missing block never counts as eligible.
		//
		// `t` (the table seat) rides along because the camera move wants an honest `to` — the shuffle
		// flight is forced lateral and does not READ the seat for direction, but the substrate anchors
		// on real coordinates and a null destination would be a lie told to it.
		// ORBIT IS EXCLUDED (roadmap §40). Sam: "Thomas Jefferson should never show up in the notable
		// person shuffle — the only way for a user to reach Thomas Jefferson is by a specific CC from a
		// specific person." The shuffle is a door into a random notable, and an orbit figure has exactly
		// one legitimate door. Not a small leak: 50 of the 94 are is_notable.
		//
		// `is_searchable` is deliberately UNTOUCHED and must stay so — it gates the app's own future
		// search menu, not Google, and Sam wants these people indexed AND wants them in that menu with
		// their own colour coding ("I don't want to hide them from google… I'll have special color coding
		// so a user can interpret them easily as not being official Hooker line descendants"). The shuffle
		// is the only door being closed.
		const notables = visible
			.filter(
				(p) =>
					p.notable &&
					p.notable.is_notable === true &&
					(p.classification || {}).is_searchable === true &&
					!orbitIds.has(p.id)
			)
			.map((p) => {
				const c = compact(p, slugMap);
				return { slug: c.slug, t: c.t || null };
			})
			.filter((r) => r.slug);
		W(join(CONFIG.dataDir, 'notables.json'), notables);

		// 5c) table-index.json — one lean row per person for the map/timeline/camera consumers, so
		// they never load the 22 MB people.json to place a seat. Carries the three blood/egg flags +
		// the spouse-of flags (visibility filter, no second source) + parent pointers + x/y/e.
		// CONSUMER CONTRACT: y may be null (no time basis, never fabricated) — SKIP null-y people,
		// degrade, never throw (the NaN doctrine's null-shaped sibling).
		const tableIndex = visible.map((p) => {
			const c = p.classification || {};
			const par = p.parents || {};
			const t = tableCoords.get(p.id) || { x: null, y: null };
			const row = {
				id: p.id,
				slug: slugMap.get(p.id) ?? null,
				n: bioOf(p).display_name || p.id,
				by: birthYear(p),
				dy: deathYear(p),
				hd: Boolean(c.is_thomas_descendant), // Hooker (Thomas) descendant
				td: Boolean(c.is_talcott_descendant), // Talcott descendant
				ee: Boolean(c.is_easter_egg),
				sd: Boolean(c.is_spouse_of_thomas_descendant),
				sg: Boolean(c.is_spouse_of_talcott_descendant),
				x: t.x,
				y: t.y,
				father_id: par.father_id ?? null,
				mother_id: par.mother_id ?? null
			};
			if (t.e) row.e = true;
			if (datesPrivate(p)) row.pv = true;
			return row;
		});
		const tiFull = W(join(CONFIG.dataDir, 'table-index.json'), tableIndex);
		const tiGz = gzipSync(readFileSync(tiFull)).length;
		log(`  table-index.json: ${tableIndex.length} rows, ${(tiGz / 1024).toFixed(0)} KB gzipped`);

		// 5d) seating-anomalies.tsv — the worklist Sam routes to the DATA stream. Detached-td linkage
		// gaps, orbit archipelago, true orphans, and no-y-basis people, so they never evaporate and the
		// list shrinks as enrichment touches them. Written at the repo root (not shipped to the client).
		const anomHeader = 'id\tname\treason\tdetail';
		const anomRows = coordResult.anomalies.map((r) => r.join('\t'));
		writeFileSync(
			join(CONFIG.repoRoot, 'seating-anomalies.tsv'),
			[anomHeader, ...anomRows].join('\n') + '\n'
		);
		const anomBy = coordResult.anomalies.reduce((a, r) => ((a[r[2]] = (a[r[2]] || 0) + 1), a), {});
		log(`  seating-anomalies.tsv: ${anomRows.length} rows (${JSON.stringify(anomBy)})`);
	}

	// 6) per-person page payloads — one self-contained file per slug.
	// Each bakes everything /person/[slug] needs (focus record, family graph, a
	// bounded `context` of relatives, resolved burial cemetery + institutions +
	// cross-connection slugs) so the page makes ONE small fetch and never ships
	// the 22 MB people.json or 2.5 MB search-index to the client.
	// ONLY_IDS=H00007,X00126 regenerates just those (incremental rebuild / testing);
	// a full run clears the stale dir first.
	const clientById = Object.fromEntries(clientPeople.map((p) => [p.id, p]));
	const cemById = Object.fromEntries((data.cemeteries || []).map((c) => [c.id, c]));
	const instById = Object.fromEntries((data.institutions || []).map((i) => [i.id, i]));

	// Registry lookups for Build-1 resolution. Landmarks/artworks/documents/videos
	// are forward id->obj maps (person carries {..._id} backlinks); statues invert —
	// they carry subject_id, so build a reverse index subject_id -> [statue,...].
	const landmarkById = Object.fromEntries((data.landmarks || []).map((x) => [x.id, x]));
	const artworkById = Object.fromEntries((data.artworks || []).map((x) => [x.id, x]));
	const documentById = Object.fromEntries((data.documents || []).map((x) => [x.id, x]));
	const videoById = Object.fromEntries((data.videos || []).map((x) => [x.id, x]));
	// A statue reaches a card ONLY through this index. It keys on the depicted subject
	// (`subject_id`) AND on any other people the record names (`person_ids`), so one memorial can
	// sit on several cards — the subject, a spouse, a child — without duplicating the record.
	// Before this, `person_ids` was ignored entirely and STAT002 (the Saint-Gaudens bust of
	// Edwards Pierrepont, which carries only person_ids) rendered on nobody's card at all.
	// Deduped, so a record naming the same id in both fields still renders once.
	const statuesBySubject = {};
	for (const s of data.statues || []) {
		if (!s) continue;
		const ids = new Set(
			[s.subject_id, ...(Array.isArray(s.person_ids) ? s.person_ids : [])].filter(Boolean)
		);
		for (const id of ids) (statuesBySubject[id] ||= []).push(s);
	}
	const reg = { landmarkById, artworkById, documentById, videoById, statuesBySubject };

	const personDir = join(CONFIG.repoRoot, CONFIG.personDir);
	if (!only && existsSync(personDir)) rmSync(personDir, { recursive: true, force: true });
	mkdirSync(personDir, { recursive: true });
	let pgCount = 0;
	for (const p of visible) {
		if (only && !only.has(p.id)) continue;
		const slug = slugMap.get(p.id);
		const payload = personPayload(p, byId, clientById, slugMap, cemById, instById, reg);
		writeFileSync(join(personDir, `${slug}.json`), JSON.stringify(payload));
		pgCount++;
	}

	log('Done.');
	if (only) {
		log(`  --only: ${pgCount} page payload(s) rebuilt; aggregates untouched`);
	} else {
		log(`  people.json            ${clientPeople.length} records (research_notes stripped)`);
		log(`  search-index.json      ${searchIndex.length} rows`);
		log(`  person/                ${pgCount} page payloads`);
		log(`  redirects.json         ${Object.keys(redirects).length} entries`);
		log(`  stats.json             thomas ${thomasDescendants} / talcott ${talcottDescendants}`);
	}
}

main();
