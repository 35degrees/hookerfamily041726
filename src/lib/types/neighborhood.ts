export interface PersonCompact {
	id: string;
	slug: string | null;
	n: string;
	by: number | null;
	dy: number | null;
	/** dates are PRIVATE (living, non-notable): present in the payload for sorting, never rendered. */
	pv?: boolean;
	/** PRESUMED LIVING — independent of `pv`, which additionally requires non-notability. Every `pv`
	    person is `lv`; a living notable is `lv` and not `pv`. */
	lv?: boolean;
	/** birth/death month and day — present only when the record has them. Their whole purpose is to let
	    a consumer call `ageAtDeath` for a REAL age rather than subtracting years; see compact() in
	    regenerate-data.js for why the age itself is not baked. */
	/** birth date_precision === 'exact'; only present when it is, and only read to tell a real
	 *  1 January apart from the month:1/day:1 placeholder. See ageAtDeath. */
	bx?: 1;
	bm?: number;
	bd?: number;
	/** death date_precision === 'exact'; see bx. */
	dx?: 1;
	dm?: number;
	dd?: number;
	sx: string;
	hd: boolean;
	td: boolean;
	ee: boolean;
	/** married INTO the Hooker line (is_thomas_spouse) — drives line-status shading */
	sp?: boolean;
	g: number | null;
	p?: string | null;
	/** per-person CSS object-position override for a badly-cropping portrait; absent = object-top. */
	pp?: string | null;
	/** per-person typeface key (bio.display_font) — the chip's NAME line only. Resolved through an
	    allow-list in PersonBox; absent = the chip's normal face. */
	df?: string | null;
	sn?: string | null;
	fn?: string | null; // first name — sibling chips render this (falls back to sn); other chips use sn
	cf?: string | null; // chip_first_name alone ("Lent") — SIBLING chips show just this (first-name-only)
	nk?: string | null; // opt-in chip name from bio.chip_first_name ("Cettie Mathews"); non-sibling chips prefer it; null → sn
	cm?: string | null; // child-chip married surname, WOMEN only ("Alice Vanderbilt"); CHILD chips prefer it; null → nk/sn
	dy_young?: boolean;
	t?: TableCoord; // Phase 3a: table seat {x, y, e?} (emit-time derived; y may be null)
}

/** Table coordinate (Phase 3a Block 1). y is null only for the logged no-basis set — consumers SKIP. */
export interface TableCoord {
	x: number;
	y: number | null;
	e?: boolean; // estimated (or unknown) time
}

export interface SpouseEntry {
	order: number;
	spouse: PersonCompact | null;
	year: number | null;
	/** relationship_type from canonical — 'partner' when the union was never a marriage. */
	rel?: string | null;
	children: PersonCompact[];
}

export interface Neighborhood {
	focus: PersonCompact;
	spouses: SpouseEntry[];
	parents: {
		father?: PersonCompact;
		mother?: PersonCompact;
	};
	grandparents: {
		paternal: { father?: PersonCompact; mother?: PersonCompact };
		maternal: { father?: PersonCompact; mother?: PersonCompact };
	};
	grandchildren: (PersonCompact & { via_parent_id: string })[];
	// Phase 7: tiered sibling chips, self-contained compacts (carry p/sn/by/dy/dy_young — no context lookup).
	// full = both parents' children; half = symmetric difference; step = a step-parent's other children.
	siblings: { full: PersonCompact[]; half: PersonCompact[]; step: PersonCompact[] };
	siblings_count: number; // blood-only (full+half) — the > 0 render gate; the button label counts all tiers.
}
