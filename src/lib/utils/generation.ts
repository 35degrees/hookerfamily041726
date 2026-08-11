import type { Person } from '$lib/types/person';

/**
 * TALCOTT SEVERANCE — Phase 1 (labels only).
 *
 * The tree is being narrowed to the Hooker line. Talcott descent no longer earns a label
 * anywhere: not the person's own line ("Fourth Generation Descendant of John Talcott"), not
 * the derived spouse/in-law phrases built off it ("Husband of Granddaughter of John Talcott",
 * "Wife of Talcott Descendant").
 *
 * This is a RENDER decision, not a data one. `is_talcott_descendant` stays true in
 * canonical.json on every person it is true of — those people ARE Talcott descendants and
 * writing a falsehood into the source to change a label would be murder to unwind. Flip this
 * one constant back to `true` and every label returns exactly as it was.
 *
 * Deliberately NOT gated: the two hardcoded founder labels below (John Talcott T00011 and his
 * mother Anne Skinner X01725). T00011 stays as an orbit figure — a Hartford founder who
 * cross-connects to Thomas Hooker — and that label is what earns him the connection.
 */
const SHOW_TALCOTT_DESCENT = false;

/**
 * Compute the generation label lines for a person.
 * Returns 0-2 strings to display under the dates in the featured card.
 *
 * Phrasing rules:
 * - Gen 2-4 use relational words: "Son of Thomas Hooker", "Granddaughter of John Talcott", etc.
 *   (generation is an INDEX with the founder at 1 — see getRelationWord.)
 * - Gen 5+ use ordinal: "Fifth Generation Descendant of Thomas Hooker"
 * - Derived labels (spouse, in-law) carry "of [Founder]" for gen 2-4, drop it for gen 5+
 */
export function computeGenerationLabels(person: Person, byId: Record<string, Person>): string[] {
	// === Rare one-off override — render verbatim, skip all computation ===
	if (person.relational_label_override) {
		return [person.relational_label_override];
	}

	// === Hardcoded founders ===
	if (person.id === 'H00001') {
		return ['Founder of the American Hooker Line'];
	}
	if (person.id === 'I00001') {
		// Susanna Garbrand Hooker. She used to return the IDENTICAL string to H00001 above, which read as
		// though the card had simply copied her husband's label. Both halves are true and the order is the
		// point: she enters the story as his wife, and she is equally a founder of the line. The ' & ' is
		// also load-bearing — FeaturedCard routes a label containing it through the shrink-to-fit branch,
		// so this stays on one line instead of wrapping the header to four.
		return ['Wife of Thomas Hooker & Founder of the American Hooker Line'];
	}
	if (person.id === 'T00011') {
		// The Talcott progenitor (gen 0). Was hardcoded as T00010, which no longer exists (merged
		// away); T00011 is is_talcott_descendant:false, so without this it would get no label at all.
		// Post-severance he is an ORBIT figure — a Hartford founder who cross-connects to Thomas
		// Hooker — and the Hartford half is what earns him that place, so it leads.
		return ['Hartford Founder & Founder of the American Talcott Line'];
	}
	if (person.id === 'X01725') {
		// Anne Skinner — T00011's mother. is_talcott_descendant:false + no generation, so the gen≤0
		// rule below can't reach her; label her directly as the founder's mother.
		// NOTE: she is currently classification.hidden (talcott_2026), so this branch cannot fire —
		// it is kept, not removed, because un-hiding her must bring the label back with her.
		return ['Mother of the Talcott Founder'];
	}

	const cls = person.classification;

	// === Split direct descent into its two independent lineages ===
	// Each lineage is its OWN output line — no ' / ' joining.
	let hookerLine: string | null = null;
	let talcottLine: string | null = null;

	if (cls.is_thomas_descendant && cls.generation_from_thomas != null) {
		hookerLine = buildDescendantLabel(
			cls.generation_from_thomas,
			genderOf(person),
			'Thomas Hooker'
		);
	}
	if (
		SHOW_TALCOTT_DESCENT &&
		cls.is_talcott_descendant &&
		cls.generation_from_john_talcott != null
	) {
		talcottLine = buildDescendantLabel(
			cls.generation_from_john_talcott,
			genderOf(person),
			'John Talcott'
		);
	}

	// === Spouse-of-descendant check ===
	const spouseLabel = computeSpouseLabel(person, byId);

	// Build an ARRAY OF LINES — one line per lineage. The FeaturedCard renders one div each.
	const lines: string[] = [];

	// 1. HOOKER line. Cousin marriage (person is a Hooker descendant AND married to a
	//    descendant) merges the spouse onto THIS line with '&', both sides compact:
	//      • descent: gen 5+ → "Eleventh Generation Hooker Descendant"; gen 2-4 keep the
	//        relational wording ("Granddaughter of Thomas Hooker").
	//      • spouse: "Husband/Wife of Hooker Descendant" — marriage ordinal AND the spouse's
	//        generation are dropped in this merged form only.
	if (hookerLine) {
		if (spouseLabel && cls.generation_from_thomas != null) {
			const compactDescent = compactHookerDescent(cls.generation_from_thomas, genderOf(person));
			const compactSpouse = computeSpouseCompact(person, byId) ?? spouseLabel;
			lines.push(`${compactDescent} & ${compactSpouse}`);
		} else {
			lines.push(hookerLine);
		}
	}

	// 2. TALCOTT line — ALWAYS its own line, long form. Never merged, never ' / '-joined.
	if (talcottLine) lines.push(talcottLine);

	// 3 & 4. Spouse label as its OWN line when there is no Hooker line to merge onto:
	//   - SPOUSE-ONLY (no descent — the common I-entry): unchanged, keeps the marriage ordinal.
	//   - EDGE: Talcott descent + spouse-of-Hooker but NO Hooker descent → Talcott line (above)
	//     then the unchanged spouse line here. The '&' merge fires ONLY onto a Hooker line.
	//     (Flagged — Sam may prefer merging onto the Talcott line instead.)
	if (!hookerLine && spouseLabel) lines.push(spouseLabel);

	// === Easter egg in-law fallback (no descent and no spouse label) ===
	if (lines.length === 0 && cls.is_easter_egg) {
		const inLawLabel = computeInLawLabel(person, byId);
		if (inLawLabel) lines.push(inLawLabel);
	}

	return lines;
}

/**
 * Compact Hooker-descent phrase for the merged cousin-marriage line.
 *   gen 2-4 → relational wording, unchanged ("Granddaughter of Thomas Hooker")
 *   gen 5+  → reordered compact ("Eleventh Generation Hooker Descendant")
 */
function compactHookerDescent(generation: number, gender: string | null): string {
	const relation = getRelationWord(generation, gender);
	if (relation) return `${relation} of Thomas Hooker`;
	return `${ordinalWord(generation)} Generation Hooker Descendant`;
}

/**
 * Compact spouse phrase for the merged cousin-marriage line: "Husband/Wife of Hooker
 * Descendant". Marriage ordinal and the spouse's generation are dropped; the founder is
 * taken from the spouse's own descent (Hooker vs Talcott). Falls back to the spouse's
 * descendant-short for pure relational-override spouses.
 */
function computeSpouseCompact(person: Person, byId: Record<string, Person>): string | null {
	for (const marriage of person.marriages || []) {
		if (!marriage.spouse_id) continue;
		const spouse = byId[marriage.spouse_id];
		if (!spouse) continue;
		const descendantShort = getDescendantOrdinalShort(spouse);
		if (!descendantShort) continue;
		const word = getRelationshipWord(genderOf(person));
		const founder = spouse.classification.is_thomas_descendant
			? 'Hooker Descendant'
			: SHOW_TALCOTT_DESCENT && spouse.classification.is_talcott_descendant
				? 'Talcott Descendant'
				: descendantShort;
		return `${word} of ${founder}`;
	}
	return null;
}

/**
 * Build a direct descendant label.
 *   gen 2 male → "Son of Thomas Hooker"
 *   gen 3 female → "Granddaughter of Thomas Hooker"
 *   gen 5+ → "Fifth Generation Descendant of Thomas Hooker"
 */
export function buildDescendantLabel(generation: number, gender: string | null, founder: string): string {
	// Ancestors of a line founder sit at generation ≤ 0 (e.g. the Talcott founder's father at −1).
	// Key on the negative generation, line-agnostic, so ordinal math never emits "−1th Generation".
	if (generation <= 0) {
		const line = founder.split(' ').pop() || founder; // "John Talcott" → "Talcott"
		if (generation === 0) return `Founder of the American ${line} Line`;
		if (generation === -1)
			return `${gender === 'female' ? 'Mother' : 'Father'} of the ${line} Founder`;
		const greats = 'Great-'.repeat(-generation - 2);
		return `${greats}Grand${gender === 'female' ? 'mother' : 'father'} of the ${line} Founder`;
	}
	const relation = getRelationWord(generation, gender);
	if (relation) {
		return `${relation} of ${founder}`;
	}
	return `${ordinalWord(generation)} Generation Descendant of ${founder}`;
}

/**
 * For derived labels (spouse, in-law), get the SHORT form referring to the descendant.
 *   gen 2-4: full relational phrase including "of Thomas Hooker"
 *   gen 5+: abbreviated, just "Fifth Generation Hooker" (drops "of Thomas Hooker")
 */
function getDescendantOrdinalShort(person: Person): string | null {
	// Honor a stored relationship (ancestor/collateral cases like "Sister of Thomas
	// Hooker") so a spouse derives e.g. "Husband of Sister of Thomas Hooker" the same
	// way it already derives "Husband of Granddaughter of Thomas Hooker". Only blood
	// relationships are safe to prefix with "Husband/Wife of" — skip already-derived
	// overrides (in-law, or spouse-prefixed) to avoid "Husband of Mother-in-law of …".
	const override = person.relational_label_override;
	if (override && !/-in-law\b/i.test(override) && !/^(Husband|Wife|Spouse) of /i.test(override)) {
		return override;
	}
	const cls = person.classification;
	if (cls.is_thomas_descendant && cls.generation_from_thomas != null) {
		const relation = getRelationWord(cls.generation_from_thomas, genderOf(person));
		if (relation) return `${relation} of Thomas Hooker`;
		return `${ordinalWord(cls.generation_from_thomas)} Generation Hooker`;
	}
	if (
		SHOW_TALCOTT_DESCENT &&
		cls.is_talcott_descendant &&
		cls.generation_from_john_talcott != null
	) {
		const relation = getRelationWord(cls.generation_from_john_talcott, genderOf(person));
		if (relation) return `${relation} of John Talcott`;
		return `${ordinalWord(cls.generation_from_john_talcott)} Generation Talcott`;
	}
	return null;
}

/**
 * Map generation + gender to a relational word.
 * Returns null for generations beyond 4 or for unknown gender.
 *
 * `generation_from_thomas` is a GENERATION INDEX, not a step count: THOMAS HIMSELF IS 1.
 * H00001 Thomas = 1, his son Samuel (H00007) = 2, his granddaughter Sarah Wilson Torrey
 * (H00020) = 3, his great-granddaughter Sarah Batt White (HD0067) = 4, and Samuel Talcott
 * Hooker (HD3386) = 12 renders "Twelfth Generation Descendant", which Sam confirms is right.
 *
 * These cases were written against the other reading — step count, 1 = a child — so every
 * relational label came out one degree too far: Thomas's own son read "Grandson of Thomas
 * Hooker". The ordinal fall-through below was already correct on the index reading, so the
 * two halves of this function disagreed with each other and the seam showed at gen 3/4.
 * Shifted up by one; ordinals deliberately NOT touched (Sam's call, option 1), so gen 5+
 * still reads "Fifth Generation Descendant" and no stored generation number changes.
 */
function getRelationWord(generation: number, gender: string | null): string | null {
	if (gender !== 'male' && gender !== 'female') return null;
	const male = gender === 'male';
	switch (generation) {
		case 2:
			return male ? 'Son' : 'Daughter';
		case 3:
			return male ? 'Grandson' : 'Granddaughter';
		case 4:
			return male ? 'Great-Grandson' : 'Great-Granddaughter';
		default:
			return null;
	}
}

function computeSpouseLabel(person: Person, byId: Record<string, Person>): string | null {
	for (const marriage of person.marriages || []) {
		if (!marriage.spouse_id) continue;
		const spouse = byId[marriage.spouse_id];
		if (!spouse) continue;

		// The spouse is usually blood, and that is the whole label. When they are NOT, they may still
		// anchor the person to the line through a marriage of their OWN — which is how the step-figures
		// get a title (see getSpouseChainShort). Blood first; the chain only as a fallback.
		const descendantShort =
			getDescendantOrdinalShort(spouse) ?? getSpouseChainShort(spouse, byId, person.id);
		if (!descendantShort) continue;

		const spouseMarriageOfThis = findMarriageNumber(spouse, person.id);
		const spouseTotalMarriages = (spouse.marriages || []).length;
		const relationshipWord = getRelationshipWord(genderOf(person));

		// ordinalWord, not ordinalShort: "Second Husband of", never "2nd Husband of" (Sam, Aug 7).
		// ordinalShort is left in place — nothing else calls it today, but it is the digit form and
		// deleting it would take the choice away from whoever wants it back.
		const prefix =
			spouseTotalMarriages > 1 && spouseMarriageOfThis
				? `${ordinalWord(spouseMarriageOfThis)} ${relationshipWord} of`
				: `${relationshipWord} of`;

		return `${prefix} ${descendantShort}`;
	}
	return null;
}

/**
 * ONE HOP FURTHER OUT — the phrase for someone who is not blood themselves, but who married blood.
 * Returns "Wife of Thomas Hooker", "Husband of Daughter of Thomas Hooker", and so on.
 *
 * This is what lets a step-figure derive a title instead of showing none:
 *   Elder William Goodwin  -> married Susanna Garbrand Hooker (her 2nd marriage), who was Thomas
 *                             Hooker's wife            => "Second Husband of Wife of Thomas Hooker"
 *   Margaret Borodale      -> married Rev. Thomas Shepard (his 3rd marriage), who had married
 *                             Joanna Hooker Shepard    => "Third Wife of Husband of Daughter of
 *                             Thomas Hooker"
 * Both were previously blank: neither is a descendant, and neither is married to one.
 *
 * THREE THINGS KEEP THIS FROM RUNNING AWAY:
 *  - It is exactly ONE hop. It calls the blood-only lookup, never itself, so a chain of remarriages
 *    cannot compound into "Wife of Husband of Wife of ...".
 *  - `excludeId` drops the marriage we arrived through, so a two-person couple cannot describe each
 *    other in a circle.
 *  - The INNER phrase carries no marriage ordinal. "Third Wife of Husband of Daughter of Thomas
 *    Hooker" is already long; "Third Wife of Second Husband of Daughter of..." is unreadable, and the
 *    ordinal that matters is the one attaching THIS person.
 */
function getSpouseChainShort(
	person: Person,
	byId: Record<string, Person>,
	excludeId?: string
): string | null {
	for (const marriage of person.marriages || []) {
		if (!marriage.spouse_id || marriage.spouse_id === excludeId) continue;
		const spouse = byId[marriage.spouse_id];
		if (!spouse) continue;
		const anchor = getDescendantAnchor(spouse);
		if (!anchor) continue;
		const word = getRelationshipWord(genderOf(person));
		if (!word) continue;
		return `${word} of ${anchor}`;
	}
	return null;
}

/**
 * The blood phrase to hang a chain off. Identical to getDescendantOrdinalShort except at the very
 * top of the tree: Thomas is generation 1, where that function emits "First Generation Hooker" —
 * true, but nobody says "Wife of First Generation Hooker". At the founder we want his NAME.
 */
function getDescendantAnchor(person: Person): string | null {
	const cls = person.classification;
	if (cls.is_thomas_descendant && cls.generation_from_thomas === 1) return 'Thomas Hooker';
	return getDescendantOrdinalShort(person);
}

function computeInLawLabel(person: Person, byId: Record<string, Person>): string | null {
	const childrenIds = (person.marriages || []).flatMap((m) => m.children_ids || []);

	for (const childId of childrenIds) {
		const child = byId[childId];
		if (!child) continue;
		for (const childMarriage of child.marriages || []) {
			if (!childMarriage.spouse_id) continue;
			const childSpouse = byId[childMarriage.spouse_id];
			if (!childSpouse) continue;

			const descendantShort = getDescendantOrdinalShort(childSpouse);
			if (!descendantShort) continue;

			const g = genderOf(person);
			// No guess. An unrecorded gender used to fall through to 'Father-in-law'.
			const inLawWord =
				g === 'female' ? 'Mother-in-law' : g === 'male' ? 'Father-in-law' : 'Parent-in-law';
			return `${inLawWord} of ${descendantShort}`;
		}
	}
	return null;
}

function getRelationshipWord(gender: string | null): string {
	if (gender === 'female') return 'Wife';
	if (gender === 'male') return 'Husband';
	return 'Spouse';
}

/**
 * The ONE place gender is read from. Canonical carries it at the top level on most records and
 * inside `bio` on others (4,534 were normalised in July 2026; ~20 still disagree between the two,
 * and casing varies — 'M' occurs). Every label in this file goes through here so a record whose
 * gender is merely stored in the other place can never silently render as the wrong sex.
 *
 * Returns 'male' | 'female' | null. NULL IS A REAL ANSWER — ~950 people have no gender recorded
 * at all — and every consumer below degrades on it rather than guessing: getRelationWord falls
 * through to the ordinal form, getRelationshipWord says 'Spouse', computeInLawLabel says
 * 'Parent-in-law'. Guessing here is how nine women came to be labelled Father-in-law.
 */
function genderOf(person: Person): string | null {
	// bio.gender FIRST. The two disagree on 92 records — every one of them top-level 'male' against
	// bio 'female', and every name in the set is unambiguously female (Theresa, Sarah, Maria, Dorothy…),
	// so the TOP-LEVEL field is the stale one. Reading it first is what made Alice Hathaway Lee Roosevelt
	// render "First Husband of Husband of Ninth Generation Hooker" (Sam). Top-level stays as the fallback
	// because plenty of records carry gender ONLY there — Theodore Roosevelt among them.
	for (const raw of [person.bio?.gender, person.gender, person.name?.gender]) {
		const g = (raw ?? '').toString().trim().toLowerCase();
		if (g === 'male' || g === 'm') return 'male';
		if (g === 'female' || g === 'f') return 'female';
	}
	return null;
}

function findMarriageNumber(spouse: Person, thisPersonId: string): number | null {
	for (const m of spouse.marriages || []) {
		if (m.spouse_id === thisPersonId) {
			return m.marriage_number;
		}
	}
	return null;
}

function ordinalWord(n: number): string {
	const words: Record<number, string> = {
		1: 'First',
		2: 'Second',
		3: 'Third',
		4: 'Fourth',
		5: 'Fifth',
		6: 'Sixth',
		7: 'Seventh',
		8: 'Eighth',
		9: 'Ninth',
		10: 'Tenth',
		11: 'Eleventh',
		12: 'Twelfth',
		13: 'Thirteenth',
		14: 'Fourteenth',
		15: 'Fifteenth',
		16: 'Sixteenth',
		17: 'Seventeenth',
		18: 'Eighteenth',
		19: 'Nineteenth',
		20: 'Twentieth',
		21: 'Twenty-First',
		22: 'Twenty-Second',
		23: 'Twenty-Third',
		24: 'Twenty-Fourth',
		25: 'Twenty-Fifth'
	};
	return words[n] ?? `${n}th`;
}

function ordinalShort(n: number): string {
	const last = n % 10;
	const lastTwo = n % 100;
	if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
	if (last === 1) return `${n}st`;
	if (last === 2) return `${n}nd`;
	if (last === 3) return `${n}rd`;
	return `${n}th`;
}

/**
 * PYNCHON IN-LAW LABEL (Sam, 10 Aug 2026) — the purple second row for the people who married into
 * the Pynchon line rather than descending from it.
 *
 * `computeInLawLabel` above already derives "Father-in-law of Fifth Generation Hooker" by walking
 * children → child's spouse → that spouse's Hooker descent. This is the same walk against the
 * Pynchon line, which lives in `pynchonLine.ts` rather than in `classification` because Pynchon
 * generation is derived from the parent graph at build time, not stored on the person.
 *
 * Kept SEPARATE from computeGenerationLabels, and returned on its own, for two reasons: the label
 * must be coloured (FeaturedCard tints the Pynchon rows purple and leaves the Hooker rows ink), and
 * a person can legitimately carry BOTH — Rev. Thomas Ruggles Sr. is father-in-law on the Hooker
 * side and grandfather-in-law on the Pynchon side, which is exactly the pair Sam asked to see.
 *
 * Depth: 1 = a child's spouse is on the line (parent-in-law), 2 = a grandchild's spouse
 * (grandparent-in-law). Nothing deeper is walked — beyond that the phrasing stops being useful.
 */
export function computePynchonInLawLabel(
	person: Person,
	byId: Record<string, Person>,
	pynchonGenerationOf: (id: string | null | undefined) => number | null
): string | null {
	const g = genderOf(person);
	const word = (depth: number) => {
		const base = g === 'female' ? 'Mother-in-law' : g === 'male' ? 'Father-in-law' : 'Parent-in-law';
		return depth === 1 ? base : `Grand${base.toLowerCase()}`;
	};
	const childrenOf = (p: Person | undefined) =>
		(p?.marriages || []).flatMap((m) => m.children_ids || []);

	// Walk the person's own children first (depth 1), then their children (depth 2). The first hit
	// wins: a nearer in-law relationship is the truer description of the connection.
	for (const depth of [1, 2] as const) {
		let frontier = childrenOf(person);
		for (let step = 1; step < depth; step++) {
			frontier = frontier.flatMap((id) => childrenOf(byId[id]));
		}
		for (const kidId of frontier) {
			const kid = byId[kidId];
			if (!kid) continue;
			for (const marriage of kid.marriages || []) {
				if (!marriage.spouse_id) continue;
				const pg = pynchonGenerationOf(marriage.spouse_id);
				if (pg == null) continue;
				// pynchonLine counts the founder as 0; generation.ts's own scale puts a son at 2, so
				// shift by one exactly as FeaturedCard's direct Pynchon label does.
				const spouse = byId[marriage.spouse_id];
				const shifted = pg === 0 ? 0 : pg + 1;
				const relation = getRelationWord(shifted, genderOf(spouse ?? kid));
				const of = relation
					? `${relation} of William Pynchon`
					: `${ordinalWord(shifted)} Generation Pynchon`;
				return `${word(depth)} of ${of}`;
			}
		}
	}
	return null;
}
