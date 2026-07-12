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
	siblings_count: number;
}
