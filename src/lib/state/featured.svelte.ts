/**
 * Featured-person state — the single subject the app is focused on.
 *
 * Step 1 of the page-transition work (DESIGN: "Page transitions" under MOTION
 * LANGUAGE, and SINGLE-SUBJECT FOCUS MODEL). Deliberately minimal: the per-person
 * payloads are static and prebuilt (static/data/person/<slug>.json), so there is
 * NO fetch / cache / service / API layer here — this only holds the current
 * featured payload and exposes it through getters.
 *
 * Both write paths funnel through `set()`:
 *   - cold load / normal navigation: +page.svelte mirrors its load `data` in
 *   - warm path (Step 2): focusPerson() will set it directly after pushState
 * Everything reads through the getters / `current`.
 */
import type { Person } from '$lib/types/person';
import type { Neighborhood } from '$lib/types/neighborhood';
import type { Cemetery } from '$lib/types/cemetery';
import type { Institution } from '$lib/types/institution';

export type CrossConnection = {
	type: string;
	related_id: string;
	link_text: string;
	display_label: string;
	slug: string | null;
};

/** The fully-resolved payload one person page renders from (matches +page.ts `load`). */
export type FeaturedData = {
	person: Person;
	neighborhood: Neighborhood;
	generationLabels: string[];
	burialCemetery: Cemetery | null;
	childrenTotal: number;
	childrenDiedYoung: number;
	crossConnections: CrossConnection[];
	institutionsById: Record<string, Institution>;
};

class FeaturedManager {
	#current = $state<FeaturedData | null>(null);

	/** Current featured payload. Null only before the first set (e.g. during SSR). */
	get current(): FeaturedData | null {
		return this.#current;
	}

	/** Convenience getter — the focal person, or null before the first set. */
	get person(): Person | null {
		return this.#current?.person ?? null;
	}

	/** Convenience getter — the focal person's id, for transition keying / indicators. */
	get id(): string | null {
		return this.#current?.person.id ?? null;
	}

	set(data: FeaturedData): void {
		this.#current = data;
	}
}

/** App-wide singleton — import `{ featured }` and read/write the focused person. */
export const featured = new FeaturedManager();
