#!/usr/bin/env node
/**
 * regenerate-data.js
 * --------------------------------------------------------------------------
 * Builds all client-facing data artifacts from the canonical Hooker JSON.
 *
 *   node regenerate-data.js [path/to/canonical.json]
 *
 * Emits (paths relative to repo root, overridable via the CONFIG block):
 *   src/lib/data/people.json            full records, research_notes stripped
 *   src/lib/data/search-index.json      compact rows: {id,slug,n,by,dy,g,t,sx,st,ci,hd,td,ee}
 *   src/lib/data/cemeteries.json        passthrough
 *   src/lib/data/institutions.json      passthrough
 *   static/data/neighborhoods/<id>.json one family graph per person
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
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const CONFIG = {
	input: process.argv[2] || resolve(__dirname, 'canonical.json'),
	repoRoot: resolve(__dirname),
	dataDir: 'src/lib/data',
	neighborhoodsDir: 'static/data/neighborhoods',
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
	'jr', 'jr.', 'sr', 'sr.',
	'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'
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

function firstName(p) {
	const b = bioOf(p);
	return b.first_name || (b.display_name || '').split(/\s+/)[0] || '';
}

// Surname chosen by descent, not gender (bloodline women carry married name).
function surname(p) {
	const b = bioOf(p);
	const married = (b.married_names && b.married_names[b.married_names.length - 1]) || null;
	if (MARRIED_IN.has(prefixOf(p.id))) {
		return b.maiden_name || b.last_name || married || null;
	}
	return b.last_name || married || b.maiden_name || null;
}

// Only return a suffix when it is a genuine generational marker.
function generationalSuffix(p) {
	const raw = (bioOf(p).suffix || '').trim();
	return GENERATIONAL.has(raw.toLowerCase()) ? raw : null;
}

function isPlaceholder(p) {
	if (typeof p.is_placeholder === 'boolean' && p.is_placeholder) return true;
	const d = bioOf(p).display_name || '';
	return /\[|unknown/i.test(d) || !firstName(p) || !surname(p);
}

// Base slug (pre-collision). Returns { base, sticky }.
function baseSlug(p) {
	if (isPlaceholder(p)) {
		const desc =
			slugify((bioOf(p).display_name || 'unnamed').split(/[([]/)[0]) || 'unnamed';
		return { base: `${desc}-${p.id.toLowerCase()}`, sticky: true }; // ID-anchored => stable
	}
	const f = slugify(firstName(p));
	let s = slugify(surname(p));
	let suf = generationalSuffix(p);
	let sufSlug = suf ? slugify(suf) : null;
	// guard against a surname that already ends with the suffix token
	if (sufSlug && s.endsWith('-' + sufSlug)) sufSlug = null;
	const yr = birthYear(p);
	const base =
		[f, s, sufSlug].filter(Boolean).join('-') + (yr ? `-${yr}` : '');
	return { base, sticky: Boolean(yr) };
}

// ---------------------------------------------------------------------------
// compact builders (match neighborhood.ts PersonCompact + search-index row)
// ---------------------------------------------------------------------------
function sex(p) {
	if (p.gender === 'male') return 'm';
	if (p.gender === 'female') return 'f';
	return 'u';
}

function compact(p, slugMap) {
	const c = p.classification || {};
	return {
		id: p.id,
		slug: slugMap.get(p.id) ?? null,
		n: bioOf(p).display_name || p.id,
		by: birthYear(p),
		dy: deathYear(p),
		sx: sex(p),
		hd: Boolean(c.is_thomas_descendant),
		td: Boolean(c.is_talcott_descendant),
		ee: Boolean(c.is_easter_egg),
		g: c.generation_from_thomas ?? null
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

	// siblings_count: union of both parents' children, minus focus
	const sibs = new Set();
	for (const pid of [par.father_id, par.mother_id]) {
		if (pid && byId[pid]) for (const cid of childrenOf(byId[pid])) sibs.add(cid);
	}
	sibs.delete(p.id);

	return {
		focus: compact(p, slugMap),
		spouses,
		parents,
		grandparents,
		grandchildren,
		siblings_count: sibs.size
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

	// 1) compute base slugs, then resolve collisions deterministically by ID
	const groups = new Map(); // base -> [ids]
	const stickyOf = new Map();
	for (const p of people) {
		const { base, sticky } = baseSlug(p);
		stickyOf.set(p.id, sticky);
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
	log(`  slugs: ${sticky} sticky / ${people.length - sticky} provisional, ${collisions} collision suffixes`);

	// 2) people.json — full records, slug written, research_notes (etc.) stripped
	const clientPeople = people.map((p) => {
		const out = { ...p, slug: slugMap.get(p.id) };
		for (const f of CONFIG.stripFromClient) delete out[f];
		return out;
	});

	// 3) search-index.json
	const searchIndex = people.map((p) => searchRow(p, slugMap));

	// 4) redirects: every former/merged id (and its old slug if derivable) -> current slug
	const redirects = {};
	for (const p of people) {
		const current = slugMap.get(p.id);
		const olds = [
			...(p.former_ids || []),
			...(p.former_id ? [p.former_id] : []),
			...(p.merged_ids || [])
		];
		for (const old of olds) {
			redirects[old] = current; // old ID -> current slug
		}
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

	// 6) per-person neighborhood files.
	// ONLY_IDS=H00007,X00126 regenerates just those (incremental rebuild / testing);
	// a full run clears the stale dir first.
	const only = process.env.ONLY_IDS ? new Set(process.env.ONLY_IDS.split(',')) : null;
	const nbDir = join(CONFIG.repoRoot, CONFIG.neighborhoodsDir);
	if (!only && existsSync(nbDir)) rmSync(nbDir, { recursive: true, force: true });
	mkdirSync(nbDir, { recursive: true });
	let nbCount = 0;
	for (const p of people) {
		if (only && !only.has(p.id)) continue;
		writeFileSync(join(nbDir, `${p.id}.json`), JSON.stringify(neighborhood(p, byId, slugMap)));
		nbCount++;
	}

	log('Done.');
	log(`  people.json            ${clientPeople.length} records (research_notes stripped)`);
	log(`  search-index.json      ${searchIndex.length} rows`);
	log(`  neighborhoods/         ${nbCount} files`);
	log(`  redirects.json         ${Object.keys(redirects).length} entries`);
}

main();
