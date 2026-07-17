export interface PersonCompact {
	id: string;
	slug: string | null;
	n: string;
	by: number | null;
	dy: number | null;
	sx: string;
	hd: boolean;
	td: boolean;
	ee: boolean;
	g: number | null;
	p?: string | null;
	sn?: string | null;
	fn?: string | null; // first name — sibling chips render this (falls back to sn); other chips use sn
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
