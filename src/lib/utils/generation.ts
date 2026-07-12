import type { Person } from '$lib/types/person';

/**
 * Compute the generation label lines for a person.
 * Returns 0-2 strings to display under the dates in the featured card.
 *
 * Phrasing rules:
 * - Gen 1-3 use relational words: "Son of Thomas Hooker", "Granddaughter of John Talcott", etc.
 * - Gen 4+ use ordinal: "Fourth Generation Descendant of Thomas Hooker"
 * - Derived labels (spouse, in-law) carry "of [Founder]" for gen 1-3, drop it for gen 4+
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
		return ['Founder of the American Hooker Line'];
	}
	if (person.id === 'T00011') {
		// The Talcott progenitor (gen 0). Was hardcoded as T00010, which no longer exists (merged
		// away); T00011 is is_talcott_descendant:false, so without this it would get no label at all.
		return ['Founder of the American Talcott Line'];
	}
	if (person.id === 'X01725') {
		// Anne Skinner — T00011's mother. is_talcott_descendant:false + no generation, so the gen≤0
		// rule below can't reach her; label her directly as the founder's mother.
		return ['Mother of the Talcott Founder'];
	}

	const cls = person.classification;

	// === Split direct descent into its two independent lineages ===
	// Each lineage is its OWN output line — no ' / ' joining.
	let hookerLine: string | null = null;
	let talcottLine: string | null = null;

	if (cls.is_thomas_descendant && cls.generation_from_thomas != null) {
		hookerLine = buildDescendantLabel(cls.generation_from_thomas, person.gender, 'Thomas Hooker');
	}
	if (cls.is_talcott_descendant && cls.generation_from_john_talcott != null) {
		talcottLine = buildDescendantLabel(
			cls.generation_from_john_talcott,
			person.gender,
			'John Talcott'
		);
	}

	// === Spouse-of-descendant check ===
	const spouseLabel = computeSpouseLabel(person, byId);

	// Build an ARRAY OF LINES — one line per lineage. The FeaturedCard renders one div each.
	const lines: string[] = [];

	// 1. HOOKER line. Cousin marriage (person is a Hooker descendant AND married to a
	//    descendant) merges the spouse onto THIS line with '&', both sides compact:
	//      • descent: gen 4+ → "Eleventh Generation Hooker Descendant"; gen 1-3 keep the
	//        relational wording ("Granddaughter of Thomas Hooker").
	//      • spouse: "Husband/Wife of Hooker Descendant" — marriage ordinal AND the spouse's
	//        generation are dropped in this merged form only.
	if (hookerLine) {
		if (spouseLabel && cls.generation_from_thomas != null) {
			const compactDescent = compactHookerDescent(cls.generation_from_thomas, person.gender);
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
 *   gen 1-3 → relational wording, unchanged ("Granddaughter of Thomas Hooker")
 *   gen 4+  → reordered compact ("Eleventh Generation Hooker Descendant")
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
		const word = getRelationshipWord(person.gender);
		const founder = spouse.classification.is_thomas_descendant
			? 'Hooker Descendant'
			: spouse.classification.is_talcott_descendant
				? 'Talcott Descendant'
				: descendantShort;
		return `${word} of ${founder}`;
	}
	return null;
}

/**
 * Build a direct descendant label.
 *   gen 1 male → "Son of Thomas Hooker"
 *   gen 2 female → "Granddaughter of Thomas Hooker"
 *   gen 4+ → "Fourth Generation Descendant of Thomas Hooker"
 */
function buildDescendantLabel(generation: number, gender: string | null, founder: string): string {
	// Ancestors of a line founder sit at generation ≤ 0 (e.g. the Talcott founder's father at −1).
	// Key on the negative generation, line-agnostic, so ordinal math never emits "−1th Generation".
	if (generation <= 0) {
		const line = founder.split(' ').pop() || founder; // "John Talcott" → "Talcott"
		if (generation === 0) return `Founder of the American ${line} Line`;
		if (generation === -1) return `${gender === 'female' ? 'Mother' : 'Father'} of the ${line} Founder`;
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
 *   gen 1-3: full relational phrase including "of Thomas Hooker"
 *   gen 4+: abbreviated, just "Fourth Generation Hooker" (drops "of Thomas Hooker")
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
		const relation = getRelationWord(cls.generation_from_thomas, person.gender);
		if (relation) return `${relation} of Thomas Hooker`;
		return `${ordinalWord(cls.generation_from_thomas)} Generation Hooker`;
	}
	if (cls.is_talcott_descendant && cls.generation_from_john_talcott != null) {
		const relation = getRelationWord(cls.generation_from_john_talcott, person.gender);
		if (relation) return `${relation} of John Talcott`;
		return `${ordinalWord(cls.generation_from_john_talcott)} Generation Talcott`;
	}
	return null;
}

/**
 * Map generation + gender to a relational word.
 * Returns null for generations beyond 3 or for unknown gender.
 */
function getRelationWord(generation: number, gender: string | null): string | null {
	if (gender !== 'male' && gender !== 'female') return null;
	const male = gender === 'male';
	switch (generation) {
		case 1:
			return male ? 'Son' : 'Daughter';
		case 2:
			return male ? 'Grandson' : 'Granddaughter';
		case 3:
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

		const descendantShort = getDescendantOrdinalShort(spouse);
		if (!descendantShort) continue;

		const spouseMarriageOfThis = findMarriageNumber(spouse, person.id);
		const spouseTotalMarriages = (spouse.marriages || []).length;
		const relationshipWord = getRelationshipWord(person.gender);

		const prefix =
			spouseTotalMarriages > 1 && spouseMarriageOfThis
				? `${ordinalShort(spouseMarriageOfThis)} ${relationshipWord} of`
				: `${relationshipWord} of`;

		return `${prefix} ${descendantShort}`;
	}
	return null;
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

			const inLawWord = person.gender === 'female' ? 'Mother-in-law' : 'Father-in-law';
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
