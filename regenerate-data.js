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
		// pv — dates are in the payload (sorting needs them) but must not be DISPLAYED.
		// Absent on everyone else; consumers test `person.pv`.
		...(datesPrivate(p) ? { pv: true } : {}),
		sx: sex(p),
		hd: Boolean(c.is_thomas_descendant),
		td: Boolean(c.is_talcott_descendant),
		ee: Boolean(c.is_easter_egg),
		g: c.generation_from_thomas ?? null,
		// p (photo) + sn (short name) baked in so a chip renders WITHOUT its full record in context — enrich()
		// prefers these (`compact.p ?? …`, `compact.sn ?? …`), so it no-ops when they're present. This is what
		// lets siblings drop out of contextIds (they were shipping ~2.9KB full records to surface ~100 bytes).
		p: p.bio?.photo_url ?? p.name?.photo_url ?? null,
		// pp (photo position) — a per-person CSS object-position override for the rare portrait the
		// default `object-top` crop cuts badly (a landscape photo, a subject off to one side). Absent
		// on ~18,000 records, which is the point: nobody else's crop moves.
		...(bioOf(p).photo_position ? { pp: bioOf(p).photo_position } : {}),
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
	tooltip: o.tooltip ?? null
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
		return mediaRow({
			name: r.primary_name,
			typeLabel: landmarkTypeLabel(r.type),
			blurb: null,
			subtitle: loc,
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
			tooltip: r.title ?? null
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
		const loc =
			r.location ?? formatCityState(r.city, r.state, r.country) ?? statueTypeLabel(r.type);
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
function relationClass(sourceId, targetId, byId) {
	if (!sourceId || !targetId || sourceId === targetId) return 'collateral';
	if (isAncestorOf(targetId, sourceId, byId) || isAncestorOf(sourceId, targetId, byId))
		return 'direct';
	return 'collateral';
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

	const crossConnections = (p.cross_connections || []).map((cc) => {
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
			relation_class: relationClass(p.id, cc.related_id, byId),
			// KINSHIP generation gap (see genDelta) — the deck's direction signal. null → lateral (orbit,
			// unrelated, OR a same-generation cousin: kin, but not up/down the line); < 0 → target is an
			// ancestor tier (rides in from TOP); > 0 → a descendant tier (from BOTTOM). Never a birth-year gap.
			gen_delta: genDelta(p.id, cc.related_id, byId)
		};
		if (talcottOnly) out.hidden_by_default = true;
		return out;
	});

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
		crossConnections
	};
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function main() {
	log(`Reading canonical: ${CONFIG.input}`);
	const data = JSON.parse(readFileSync(CONFIG.input, 'utf8'));
	const people = data.people || [];
	const byId = Object.fromEntries(people.map((p) => [p.id, p]));
	log(`  ${people.length} people`);

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
	const clientPeople = people.map((p) => {
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
		searchIndex = people.map((p) => searchRow(p, slugMap));

		// 4) redirects: every former/merged id -> current slug
		for (const p of people) {
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
		for (const p of people) {
			const c = p.classification || {};
			if (c.is_thomas_descendant === true) thomasDescendants++;
			if (c.is_talcott_descendant === true) talcottDescendants++;
		}
		W(join(CONFIG.dataDir, 'stats.json'), {
			total: people.length,
			thomasDescendants,
			talcottDescendants
		});

		// 5c) table-index.json — one lean row per person for the map/timeline/camera consumers, so
		// they never load the 22 MB people.json to place a seat. Carries the three blood/egg flags +
		// the spouse-of flags (visibility filter, no second source) + parent pointers + x/y/e.
		// CONSUMER CONTRACT: y may be null (no time basis, never fabricated) — SKIP null-y people,
		// degrade, never throw (the NaN doctrine's null-shaped sibling).
		const tableIndex = people.map((p) => {
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
	const statuesBySubject = {};
	for (const s of data.statues || []) {
		if (!s || !s.subject_id) continue;
		(statuesBySubject[s.subject_id] ||= []).push(s);
	}
	const reg = { landmarkById, artworkById, documentById, videoById, statuesBySubject };

	const personDir = join(CONFIG.repoRoot, CONFIG.personDir);
	if (!only && existsSync(personDir)) rmSync(personDir, { recursive: true, force: true });
	mkdirSync(personDir, { recursive: true });
	let pgCount = 0;
	for (const p of people) {
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
