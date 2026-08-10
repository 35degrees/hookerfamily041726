/**
 * buildFeatured — resolve a raw per-person payload into the FeaturedData the
 * person page renders. Shared by BOTH navigation paths so they produce identical
 * output (and the single-source `f` pattern stays honest):
 *   - cold load / real navigation: +page.ts `load`
 *   - warm path (Step 2): focusPerson() after pushState
 *
 * The enrich / diedYoung / computeGenerationLabels logic used to live in +page.ts;
 * it moved here unchanged so there is no second copy to drift.
 */
import type { Person } from '$lib/types/person';
import type { Neighborhood, PersonCompact } from '$lib/types/neighborhood';
import type { Institution } from '$lib/types/institution';
import type { Cemetery } from '$lib/types/cemetery';
import { computeGenerationLabels } from '$lib/utils/generation';
import type { CrossConnection, FeaturedData } from '$lib/state/featured.svelte';

/** Raw payload as written by regenerate-data.js (static/data/person/<slug>.json). */
export type PersonPayload = {
	person: Person;
	neighborhood: Neighborhood;
	context: Record<string, Person>;
	burialCemetery: Cemetery | null;
	institutionsById: Record<string, Institution>;
	crossConnections: CrossConnection[];
	/** Easter eggs only — their route back to the Hooker line. See regenerate-data.js lineAnchorsFor. */
	lineAnchors?: PersonCompact[];
};

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

// died-young = age at death ≤ 15. ONE source of truth, consumed FOUR ways: the child-box dimming
// (PersonBox dimmed={dy_young}), the "(N died young)" connector count (childrenDiedYoung below), the
// roster-time sort partition that drops died-young children to the END of the children row
// (buildRoster), and the demote chip-face, which needs it on the FOCUS so a demoting card carries the
// right ink from its first frame rather than acquiring it on landing. Raised from ≤12 → ≤15 deliberately: 13–15-at-death now count as died-young tree-wide.
function diedYoung(person: Person | undefined): boolean {
	if (!person) return false;
	const birth = person.birth?.year;
	const death = person.death?.year;
	if (!birth || !death) return false;
	return death - birth <= 15;
}

// A person box keyed by id must have unique ids — the same person can't truly be
// your child twice. Dropping a repeat is correct (unlike entity lists, where a
// repeated id is two distinct facts). Keeps id keys safe for Step 3 transitions.
function dedupeById<T extends { id: string }>(items: T[]): T[] {
	const seen = new Set<string>();
	return items.filter((it) => {
		if (seen.has(it.id)) return false;
		seen.add(it.id);
		return true;
	});
}

/** Pure transform: raw payload → fully-enriched FeaturedData. */
export function buildFeatured(payload: PersonPayload): FeaturedData {
	const { person, neighborhood, burialCemetery, institutionsById, crossConnections } = payload;
	const byId = payload.context;

	const enrichedNeighborhood: Neighborhood = {
		...neighborhood,
		// dy_young on the FOCUS too, not just on children. The demote chip-face (+page.svelte) renders a
		// PersonBox of the focus as the card shrinks into its seat, and without this it had no way to know
		// the person died young — so the traveller wore ink-blue for the whole flight and only turned grey
		// on landing (Sam). `person` IS the focus's full record, so no byId lookup is needed.
		focus: { ...enrich(neighborhood.focus, byId), dy_young: diedYoung(person) },
		spouses: neighborhood.spouses.map((s) => {
			const enrichedChildren = dedupeById(s.children).map((c) => {
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
		// GRANDCHILDREN GET THE SAME TREATMENT AS CHILDREN, and until now they got neither half of it.
		// They were enriched but never asked `diedYoung`, so `dy_young` stayed undefined all the way to
		// the chip — which meant the descendant tier rendered a child who died at birth in full ink-blue,
		// in birth order, indistinguishable from their siblings who lived. Sam found it on Rev. Thomas
		// Shepard: his son John (1643-1643) sorts to the end of the CHILDREN row in grey with "(died
		// young)", and appeared in the middle of the GRANDCHILDREN row as though nothing had happened.
		//
		// PersonBox already does the rest — `dimmed` drives both the grey ink and the "(died young)"
		// suffix, and the tier already passes `dimmed={gc.dy_young}`. The flag was the only thing absent.
		//
		// The partition is applied ACROSS the whole set rather than per via_parent group, and that is
		// still correct for the tier: it renders one parent's grandchildren at a time by filtering on
		// `via_parent_id`, and filtering preserves relative order — so each group comes out alive-then-
		// young exactly as if it had been sorted alone.
		grandchildren: (() => {
			const enriched = neighborhood.grandchildren.map((gc) => ({
				...enrich(gc, byId),
				dy_young: diedYoung(byId[gc.id])
			}));
			return [...enriched.filter((g) => !g.dy_young), ...enriched.filter((g) => g.dy_young)];
		})()
	};

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
		institutionsById,
		// Passed straight through, untouched. Absent on everyone who is not an easter egg.
		lineAnchors: payload.lineAnchors
	};
}

/**
 * Fetch a person's payload and build their FeaturedData.
 * Returns null on a missing/stale slug (404) so callers can fall back to a real
 * navigation. `fetchFn` lets the cold-load path pass SvelteKit's `fetch`.
 */
export async function fetchFeatured(
	slug: string,
	fetchFn: typeof fetch = fetch
): Promise<FeaturedData | null> {
	const res = await fetchFn(`/data/person/${slug}.json`);
	if (!res.ok) return null;
	const payload: PersonPayload = await res.json();
	return buildFeatured(payload);
}
