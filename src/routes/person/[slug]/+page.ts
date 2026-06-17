import { error } from '@sveltejs/kit';
import type { Institution } from '$lib/types/institution';
import type { PageLoad } from './$types';
import type { Neighborhood, PersonCompact } from '$lib/types/neighborhood';
import type { Person } from '$lib/types/person';
import type { Cemetery } from '$lib/types/cemetery';
import { computeGenerationLabels } from '$lib/utils/generation';

const TITLE_ABBREVIATIONS: Record<string, string> = {
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

function abbreviateTitle(title: string | null | undefined): string | null {
	if (!title) return null;
	return TITLE_ABBREVIATIONS[title] ?? title;
}

function computeShortName(person: Person): string | null {
	const bio = person.bio ?? person.name;
	if (!bio) return null;
	const first = bio.first_name;
	if (!first) return null;

	let surname: string | null;
	if (person.gender === 'female' || bio.maiden_name) {
		surname = bio.maiden_name ?? bio.last_name;
	} else {
		surname = bio.last_name;
	}

	const baseName = surname ? `${first} ${surname}` : first;

	const title = abbreviateTitle(bio.title);
	if (title) {
		const fullName = `${title} ${baseName}`;
		if (fullName.length <= 19) {
			return fullName;
		}
	}
	return baseName;
}

function enrich<T extends PersonCompact>(compact: T, byId: Record<string, Person>): T {
	const full = byId[compact.id];
	if (!full) return compact;
	return {
		...compact,
		p: compact.p ?? full.bio?.photo_url ?? full.name?.photo_url ?? null,
		sn: compact.sn ?? computeShortName(full)
	};
}

function diedYoung(person: Person | undefined): boolean {
	if (!person) return false;
	const birth = person.birth?.year;
	const death = person.death?.year;
	if (!birth || !death) return false;
	return death - birth <= 12;
}

type CrossConnection = {
	type: string;
	related_id: string;
	link_text: string;
	display_label: string;
	slug: string | null;
};

// Self-contained payload built by regenerate-data.js (static/data/person/<slug>.json).
// One small fetch carries everything this card needs — no people.json / search-index
// ship to the client. `context` is the bounded set of relatives the enrich /
// diedYoung / computeGenerationLabels logic below reads off `byId`.
type PersonPayload = {
	person: Person;
	neighborhood: Neighborhood;
	context: Record<string, Person>;
	burialCemetery: Cemetery | null;
	institutionsById: Record<string, Institution>;
	crossConnections: CrossConnection[];
};

export const load: PageLoad = async ({ params, fetch }) => {
	const res = await fetch(`/data/person/${params.slug}.json`);
	if (!res.ok) throw error(404, 'Person not found');
	const payload: PersonPayload = await res.json();

	const { person, neighborhood, burialCemetery, institutionsById, crossConnections } = payload;
	const byId = payload.context;

	const enrichedNeighborhood: Neighborhood = {
		...neighborhood,
		focus: enrich(neighborhood.focus, byId),
		spouses: neighborhood.spouses.map((s) => {
			const enrichedChildren = s.children.map((c) => {
				const enriched = enrich(c, byId);
				const full = byId[c.id];
				return { ...enriched, dy_young: diedYoung(full) };
			});
			const alive = enrichedChildren.filter((c) => !c.dy_young);
			const young = enrichedChildren.filter((c) => c.dy_young);
			const partitioned = [...alive, ...young];
			return { ...s, spouse: s.spouse ? enrich(s.spouse, byId) : null, children: partitioned };
		}),
		parents: {
			father: neighborhood.parents.father ? enrich(neighborhood.parents.father, byId) : undefined,
			mother: neighborhood.parents.mother ? enrich(neighborhood.parents.mother, byId) : undefined
		},
		grandparents: {
			paternal: {
				father: neighborhood.grandparents.paternal.father
					? enrich(neighborhood.grandparents.paternal.father, byId)
					: undefined,
				mother: neighborhood.grandparents.paternal.mother
					? enrich(neighborhood.grandparents.paternal.mother, byId)
					: undefined
			},
			maternal: {
				father: neighborhood.grandparents.maternal.father
					? enrich(neighborhood.grandparents.maternal.father, byId)
					: undefined,
				mother: neighborhood.grandparents.maternal.mother
					? enrich(neighborhood.grandparents.maternal.mother, byId)
					: undefined
			}
		},
		grandchildren: neighborhood.grandchildren.map((gc) => enrich(gc, byId))
	};

	// Compute children totals across all marriages
	const allChildren = neighborhood.spouses.flatMap((s) => s.children);
	const childrenTotal = allChildren.length;
	const childrenDiedYoung = allChildren.filter((c) => diedYoung(byId[c.id])).length;
	const generationLabels = computeGenerationLabels(person, byId);

	return {
		neighborhood: enrichedNeighborhood,
		person,
		generationLabels,
		burialCemetery,
		childrenTotal,
		childrenDiedYoung,
		crossConnections,
		institutionsById
	};
};
