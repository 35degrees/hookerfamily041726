import { error } from '@sveltejs/kit';
import institutionsData from '$lib/data/institutions.json';
import type { Institution } from '$lib/types/institution';
import searchIndex from '$lib/data/search-index.json';
import peopleData from '$lib/data/people.json';
import cemeteriesData from '$lib/data/cemeteries.json';
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

export const load: PageLoad = async ({ params, fetch }) => {
	const entry = searchIndex.find((p) => p.slug === params.slug);
	if (!entry) throw error(404, 'Person not found');

	const res = await fetch(`/data/neighborhoods/${entry.id}.json`);
	if (!res.ok) throw error(404, 'Neighborhood not found');
	const neighborhood: Neighborhood = await res.json();

	const person = peopleData.find((p) => p.id === entry.id) as Person | undefined;
	if (!person) throw error(404, 'Person data not found');

	const byId: Record<string, Person> = {};
	for (const p of peopleData as Person[]) {
		byId[p.id] = p;
	}

	const institutionsById: Record<string, Institution> = {};
	for (const inst of institutionsData as Institution[]) {
		institutionsById[inst.id] = inst;
	}

	// Resolve burial cemetery if available
	let burialCemetery: Cemetery | null = null;
	const cemeteryId = person.burial?.cemetery_id;
	if (cemeteryId) {
		const found = (cemeteriesData as Cemetery[]).find((c) => c.id === cemeteryId);
		if (found) burialCemetery = found;
	}

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
	const resolvedCrossConnections = (person.cross_connections ?? []).map((cc: any) => {
		const target = byId[cc.related_id];
		const entry = searchIndex.find((p) => p.id === cc.related_id);
		return {
			type: cc.type,
			related_id: cc.related_id,
			link_text: cc.link_text,
			display_label: cc.display_label,
			slug: entry?.slug ?? null
		};
	});

	return {
		neighborhood: enrichedNeighborhood,
		person,
		generationLabels,
		burialCemetery,
		childrenTotal,
		childrenDiedYoung,
		crossConnections: resolvedCrossConnections,
		institutionsById
	};
};
