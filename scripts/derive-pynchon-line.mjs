/**
 * derive-pynchon-line — writes src/lib/data/pynchonLine.ts from canonical.json.
 *
 * The Pynchon line is not a list somebody maintains; it is a PATH THROUGH THE PARENT GRAPH, and this
 * derives it so the two can never disagree. Run it after any canonical change that touches the line:
 *
 *   node scripts/derive-pynchon-line.mjs
 *
 * THE RULE (Sam, Aug 8): the ancestors of Thomas Ruggles Pynchon Jr., plus Jackson as his son. That is
 * what settles every case without a special list — the mothers in each generation ARE ancestors and are
 * in; Melanie Jackson is Jackson's mother but not Thomas's ancestor and is out; Mary Pynchon Holyoke is
 * William's daughter, not an ancestor, and is out (she still gets a title, which is a separate concern).
 */
import fs from 'node:fs';

const ANCHOR = 'X03232'; // Thomas Ruggles Pynchon Jr. — the line is HIS ancestry
const SON = 'HD6314'; // Jackson, included as his son
const FOUNDER = 'Y00004'; // Hon. William Pynchon

const raw = JSON.parse(fs.readFileSync('canonical.json', 'utf8'));
const list = Array.isArray(raw) ? raw : (raw.people ?? Object.values(raw));
const byId = new Map(list.map((p) => [p.id, p]));
const nameOf = (p) => p?.bio?.display_name ?? p?.bio?.short_name ?? p?.id ?? '?';
const parentsOf = (p) => [p?.parents?.father_id, p?.parents?.mother_id].filter(Boolean);

// THE SPINE: father-first walk from the anchor up to the founder. This is what carries the generation
// numbers, because "Nth generation descendant" counts links along one chain, not bodies in a set.
const spine = [];
{
	let cur = byId.get(ANCHOR);
	const seen = new Set();
	while (cur && !seen.has(cur.id)) {
		seen.add(cur.id);
		spine.push(cur.id);
		if (cur.id === FOUNDER) break;
		const f = cur.parents?.father_id;
		const m = cur.parents?.mother_id;
		cur = byId.get(f) ?? byId.get(m);
	}
}
if (spine.at(-1) !== FOUNDER) {
	console.error(`the walk did not reach ${FOUNDER}; it stopped at ${spine.at(-1)}. Nothing written.`);
	process.exit(1);
}
spine.reverse(); // founder first, so the index IS the generation

// WHO CARRIES THE BACKGROUND: the spine, plus the OTHER parent at each step — the mother who married in
// and bore the next link. Deliberately NOT every ancestor recursively: that walk also collects each
// mother's own parents and grandparents, whole families who are ancestors of Thomas but are not "in this
// line". Spine + its mothers + Jackson is the shape Sam described.
const rainbow = new Set([SON, ...spine]);
for (const id of spine) for (const p of parentsOf(byId.get(id))) rainbow.add(p);

// WHO GETS A TITLE: every descendant of the founder. Sam: "all of the pynchon tree can get these titles
// but only rainbows in direct line to thomas." So the two sets are computed separately and deliberately —
// Rev. Thomas Ruggles Pynchon (X03226) is off the direct line, and gets his descendancy title without
// the background.
const children = new Map();
for (const p of list)
	for (const par of parentsOf(p)) {
		if (!children.has(par)) children.set(par, []);
		children.get(par).push(p.id);
	}
const gen = new Map([[FOUNDER, 0]]);
{
	const q = [FOUNDER];
	while (q.length) {
		const id = q.shift();
		for (const c of children.get(id) ?? []) {
			if (gen.has(c)) continue; // first (shortest) path wins; a cousin marriage cannot renumber anyone
			gen.set(c, gen.get(id) + 1);
			q.push(c);
		}
	}
}
// NAMED BY SAM, not derived: people in the Pynchon story who are OFF the direct line and get the
// descendancy TITLE but no background. The full descendant walk above reaches 955 people, which is the
// whole American Pynchon tree and far more than is meant — "all of the pynchon tree" means the line being
// curated here, not every descendant. Their generation is still derived; only their membership is a
// decision. Add ids here as Sam names them.
// TITLE_OVERRIDE — a generation ASSERTED where the graph cannot derive one, because the connecting
// relative is deliberately not an entry. Mary Smith Lord Hooker is William's granddaughter through a
// daughter Sam has chosen not to build, so the descendant walk below never reaches her. She takes the
// purple label and NOT the rainbow: the spectrum is reserved for ancestors of Thomas Pynchon (Sam,
// 10 Aug 2026), and she is off that line entirely. Scale is this file's own — founder 0, his child 1 —
// so a grandchild is 2. Add ids here only when Sam names them.
const TITLE_OVERRIDE = { X01014: 2 }; // Mary Smith Lord Hooker — granddaughter, no rainbow

// LITERAL LABELS — the purple row written out by hand for people the derivation must NOT reach.
// This is a LIST, deliberately, and it replaced a computed walk that climbed from a Pynchon-flagged
// person up through their children's spouses and stamped Pynchon in-law rows on Thomas Hooker,
// Susanna, Rev. Samuel Hooker and fifteen others (Sam, 10 Aug 2026: "this is a Hooker tree... we are
// doing an isolated wormhole line"). Anything that WALKS the graph from this line reaches Hooker
// bloodline within two hops, so nothing here may ever be derived again. Add a row only when Sam
// names the person and dictates the words.
const LITERAL_LABEL = {
	H00027: 'Husband of Granddaughter of William Pynchon',
	X01779: 'Wife of William Pynchon & Founder of the American Pynchon Line',
	// The four Ruggles, approved by Sam individually on 10 Aug 2026 after the computed version was
	// reverted. Joseph Pynchon (X03220) is the Fifth Generation Descendant they married into.
	X03218: 'Father-in-law of Fifth Generation Pynchon', // Rev. Thomas Ruggles Jr. — Sarah's father
	X01906: 'Mother-in-law of Fifth Generation Pynchon', // Rebecca Hart Ruggles — Sarah's mother
	X01929: 'Grandfather-in-law of Fifth Generation Pynchon', // Rev. Thomas Ruggles Sr.
	X02854: 'Grandmother-in-law of Fifth Generation Pynchon' // Sarah Fiske Ruggles, his first wife
};

const TITLE_ONLY = [
	'X03226' // Rev. Thomas Ruggles Pynchon — off the direct line, title only
	// Y00003 Mary Pynchon Holyoke was here until 10 Aug 2026, when Sam deleted her outright
	// along with the Holyokes (Y00002, X01778, Y00005) to finish the Talcott severance.
];

for (const [id, g] of Object.entries(TITLE_OVERRIDE)) {
	if (!byId.has(id)) {
		console.error(`TITLE_OVERRIDE names ${id}, which is not in canonical. Nothing written.`);
		process.exit(1);
	}
	if (gen.has(id)) {
		console.error(`TITLE_OVERRIDE names ${id}, but the graph already derives gen ${gen.get(id)}.`);
		process.exit(1);
	}
	gen.set(id, g);
}

// One row per person who needs anything: a generation, a background, or both.
const all = new Set([
	...rainbow,
	...TITLE_ONLY.filter((id) => gen.has(id)),
	...Object.keys(TITLE_OVERRIDE)
]);
const rows = [...all]
	.sort((a, b) => (gen.get(a) ?? 999) - (gen.get(b) ?? 999) || a.localeCompare(b))
	.map(
		(id) =>
			`\t['${id}', ${gen.has(id) ? gen.get(id) : 'null'}, ${rainbow.has(id)}], // ${nameOf(byId.get(id))}`
	)
	.join('\n');

const literalJson = JSON.stringify(LITERAL_LABEL, null, '\t');
fs.writeFileSync(
	'src/lib/data/pynchonLine.ts',
	`// GENERATED by scripts/derive-pynchon-line.mjs — do not hand-edit; re-run it instead.
//
// TWO DIFFERENT SETS, and they are not the same people (Sam, Aug 8): "all of the pynchon tree can get
// these titles but only rainbows in direct line to thomas."
//
//   GENERATION — every descendant of Hon. William Pynchon (${FOUNDER}), by depth below him. 0 is William
//     himself. Drives the TITLE, via generation.ts's own buildDescendantLabel, so the Pynchon line words
//     itself exactly as the Hooker line does (Son → Grandson → Great-Grandson → Fifth Generation …).
//   RAINBOW — only the direct line to Thomas Ruggles Pynchon Jr. (${ANCHOR}) plus Jackson (${SON}), and
//     the mother at each step. Drives the BACKGROUND.
//
// Both are derived from the parent graph rather than listed, so neither can drift from the genealogy.
export const PYNCHON_LINE: ReadonlyArray<readonly [string, number | null, boolean]> = [
${rows}
];

const LITERAL_LABEL: Record<string, string> = ${literalJson};

const GEN = new Map<string, number | null>(PYNCHON_LINE.map(([id, g]) => [id, g]));
const RAINBOW = new Set<string>(PYNCHON_LINE.filter(([, , r]) => r).map(([id]) => id));

/** A hand-written purple row for this id, or null. Listed, never derived — see the note in
 *  scripts/derive-pynchon-line.mjs on why a computed version is forbidden. */
export function pynchonLiteralLabel(id: string | null | undefined): string | null {
	if (!id) return null;
	return LITERAL_LABEL[id] ?? null;
}

/** Does this person's card carry the line's spectrum? Direct line only. */
export function isPynchonKin(id: string | null | undefined): boolean {
	return !!id && RAINBOW.has(id);
}

/** Depth below the founder (0 = William), or null if they are not a descendant of his. */
export function pynchonGeneration(id: string | null | undefined): number | null {
	if (!id) return null;
	return GEN.get(id) ?? null;
}
`
);
console.log(`spine ${spine.length}, descendants with a title ${gen.size}, rainbow ${rainbow.size} → src/lib/data/pynchonLine.ts`);
