/**
 * fold.js — ONE definition of the search fold, imported by BOTH sides.
 *
 * The pipeline folds every fact into `search-index.json` at build time; the client folds the user's
 * query at search time. If the two ever disagree the failure is SILENT — a query that should match
 * returns zero, and nothing logs. That is why this is a shared file imported by
 * `regenerate-data.js` (relative) and the client ($lib/search/fold.js) rather than two copies that
 * look the same today.
 *
 * WHAT IT FIXES, measured against the corpus (082726):
 *   24 people carry a non-ASCII NAME and they are exactly the ones typed by hand —
 *   Marie Curie Skłodowska, Ève Curie, Mercedes Martínez, Dennis O’Brien. Without folding,
 *   `sklodowska` and a straight-apostrophe `O'Brien` both return nothing.
 *
 * NFD + combining-mark strip handles every accent (é í á ö ó È). It does NOT handle letters that
 * are their own codepoint rather than base+accent — ł Ł ø æ œ ß đ — so those are mapped explicitly
 * ABOVE the normalize, and so are the curly quotes and dashes the sources are full of. The Hawaiian
 * okina (ʻ) folds to an apostrophe so "Hawaii" matches "Hawaiʻi".
 *
 * Survivors are deliberate: → £ ⁷ × … § stay as-is because nobody types them.
 */

/** Characters NFD cannot decompose, plus the punctuation the sources vary on. */
const PAIRS = [
	['’', "'"],
	['‘', "'"],
	['ʻ', "'"],
	['“', '"'],
	['”', '"'],
	['–', '-'],
	['—', '-'],
	['ł', 'l'],
	['Ł', 'L'],
	['ø', 'o'],
	['Ø', 'O'],
	['æ', 'ae'],
	['Æ', 'AE'],
	['œ', 'oe'],
	['Œ', 'OE'],
	['ß', 'ss'],
	['đ', 'd'],
	['Đ', 'D']
];

/**
 * Lowercase, de-accent and normalise punctuation. Safe on null/undefined.
 * @param {unknown} s
 * @returns {string}
 */
export function fold(s) {
	if (s === null || s === undefined) return '';
	let out = String(s);
	for (const [from, to] of PAIRS) out = out.split(from).join(to);
	return out
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}
