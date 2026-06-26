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
	if (person.id === 'T00010') {
		return ['Founder of the American Talcott Line'];
	}

	const cls = person.classification;

	// === Direct descendant cases ===
	const descendantLabels: string[] = [];

	if (cls.is_thomas_descendant && cls.generation_from_thomas != null) {
		const label = buildDescendantLabel(cls.generation_from_thomas, person.gender, 'Thomas Hooker');
		descendantLabels.push(label);
	}

	if (cls.is_talcott_descendant && cls.generation_from_john_talcott != null) {
		const label = buildDescendantLabel(
			cls.generation_from_john_talcott,
			person.gender,
			'John Talcott'
		);
		descendantLabels.push(label);
	}

	// Combine descendant lines (double descendant case)
	let descendantLine: string | null = null;
	if (descendantLabels.length === 2) {
		descendantLine = descendantLabels.join(' / ');
	} else if (descendantLabels.length === 1) {
		descendantLine = descendantLabels[0];
	}

	// === Spouse-of-descendant check ===
	const spouseLabel = computeSpouseLabel(person, byId);

	const labels: string[] = [];
	if (descendantLine) labels.push(descendantLine);
	if (spouseLabel) labels.push(spouseLabel);

	// === Easter egg ===
	if (labels.length === 0 && cls.is_easter_egg) {
		const inLawLabel = computeInLawLabel(person, byId);
		if (inLawLabel) labels.push(inLawLabel);
	}

	// Combine descendant + spouse on one line (cousin marriage)
	if (labels.length === 2 && descendantLine && spouseLabel) {
		return [`${descendantLine} / ${spouseLabel}`];
	}

	return labels;
}

/**
 * Build a direct descendant label.
 *   gen 1 male → "Son of Thomas Hooker"
 *   gen 2 female → "Granddaughter of Thomas Hooker"
 *   gen 4+ → "Fourth Generation Descendant of Thomas Hooker"
 */
function buildDescendantLabel(generation: number, gender: string | null, founder: string): string {
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
