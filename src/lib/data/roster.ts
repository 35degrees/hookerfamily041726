/**
 * buildRoster — turn the focus's FeaturedData into role-zoned, id-keyed people
 * for the re-focus choreography (DESIGN: "Re-focus choreography — RESOLVED
 * ARCHITECTURE"). Every visible person gets exactly ONE role; a global seen-set
 * enforces role priority (featured > spouse > parent > child …) so a person
 * renders once and keys stay collision-free (the Step-2 keyed-render lesson).
 *
 * zoom-parameterized from the start: zoom 1 omits the grand-tiers (old parents
 * rising to grandparent fly up and out via the fallback); zoom >= 2 will add
 * grandparents/grandchildren into the same shape. Keep the role order here as the
 * single source of priority.
 */
import type { FeaturedData } from '$lib/state/featured.svelte';
import type { Person } from '$lib/types/person';
import type { PersonCompact } from '$lib/types/neighborhood';

export type SpouseChip = { spouse: PersonCompact; year: number | null };

export type Roster = {
	featured: Person;
	parents: PersonCompact[];
	spouses: SpouseChip[];
	children: PersonCompact[];
	// zoom >= 2: grandparents, grandchildren (added into this same shape later)
};

export function buildRoster(f: FeaturedData, _zoom: number): Roster {
	const seen = new Set<string>([f.person.id]); // featured claimed first
	const take = (id: string) => {
		if (seen.has(id)) return false;
		seen.add(id);
		return true;
	};

	// Priority order: spouse > parent > child (featured already claimed above).
	const spouses: SpouseChip[] = [];
	for (const m of f.neighborhood.spouses) {
		if (m.spouse && take(m.spouse.id)) spouses.push({ spouse: m.spouse, year: m.year });
	}

	const parents: PersonCompact[] = [];
	for (const p of [f.neighborhood.parents.father, f.neighborhood.parents.mother]) {
		if (p && take(p.id)) parents.push(p);
	}

	// Children keep their per-marriage, died-young-last order from buildFeatured;
	// the seen-set drops any cross-marriage duplicate so child.id stays unique.
	const children: PersonCompact[] = [];
	for (const m of f.neighborhood.spouses) {
		for (const c of m.children) {
			if (take(c.id)) children.push(c);
		}
	}

	return { featured: f.person, parents, spouses, children };
}
