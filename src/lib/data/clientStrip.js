/**
 * clientStrip.js — WHAT OF A RECORD MAY REACH A BROWSER (Oct 9, 2026).
 *
 * canonical.json keeps everything; nothing here deletes data. This decides what is COPIED into the public
 * files regenerate-data.js writes (static/data/person/*.json). Plain JS in src/ so the generator (Node) and
 * scripts/probe-payload-equivalence.mjs import the same rule.
 *
 * AN ALLOW-LIST FOR THE PERSON, deny-lists for what is nested inside it. The first pass (a deny-list of
 * top-level fields) missed ~80 one-off research fields (`will`, `estate`, `siblings_research`,
 * `enslaver_note`…) and every nested note — research_notes inside bio, working notes on births, marriages,
 * cemeteries and institutions. An allow-list means a field invented tomorrow stays private by default.
 * The list is what src/ reads, measured across every .ts/.svelte file; a field that starts rendering must be
 * added here in the same change, or it will silently be missing from every card.
 */

/** @typedef {Record<string, any>} Rec — a canonical record, untyped on purpose: this file sees every shape. */

/** Top-level person fields the client reads. `classification` is narrowed separately (CLIENT_CLASSIFICATION). */
export const CLIENT_PERSON_KEYS = [
	'id',
	'slug',
	't',
	'pv',
	'name',
	'bio',
	'gender',
	'birth',
	'death',
	'parents',
	'marriages',
	'classification',
	'tags',
	'notable',
	'narrative_blocks',
	'career',
	'education',
	'relational_label_override',
	'is_easter_egg',
	'bio_blurb',
	'suffix'
];

/** The `classification` flags src/ reads; its descent and path bookkeeping stays in canonical. */
export const CLIENT_CLASSIFICATION = [
	'is_easter_egg',
	'is_thomas_descendant',
	'is_talcott_descendant',
	'hidden',
	'generation_from_thomas',
	'generation_from_john_talcott'
];

/** Nested working notes. NOT career[].notes or education[].notes — RightColumn renders those. */
const NOTE_KEYS = ['notes', 'research_notes'];
/** @param {any} o */
const dropNotes = (o) => {
	if (!o || typeof o !== 'object' || Array.isArray(o)) return o;
	/** @type {Rec} */
	const out = { ...o };
	for (const k of NOTE_KEYS) delete out[k];
	return out;
};

/** A person record as the client may see it. Input is never mutated.
 *  @param {Rec} p
 *  @returns {Rec} */
export function clientPerson(p) {
	/** @type {Rec} */
	const out = {};
	for (const k of CLIENT_PERSON_KEYS) if (k in p) out[k] = p[k];
	if (p.classification) {
		/** @type {Rec} */
		const cls = {};
		for (const k of CLIENT_CLASSIFICATION)
			if (k in p.classification) cls[k] = p.classification[k];
		out.classification = cls;
	}
	for (const k of ['bio', 'name', 'birth', 'death', 'parents']) if (out[k]) out[k] = dropNotes(out[k]);
	if (Array.isArray(out.marriages)) out.marriages = out.marriages.map(dropNotes);
	return out;
}

/** A cemetery or institution as embedded in a payload: everything but its notes and sources.
 *  @param {any} e */
export function clientRegistryEntry(e) {
	if (!e || typeof e !== 'object') return e;
	const out = dropNotes(e);
	delete out.sources;
	return out;
}
