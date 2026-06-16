// Institution lookup entry (INST### in canonical JSON).
//
// Schema drift is real in the canonical data: older entries use flat
// city/state/country fields; newer entries nest them under `location`.
// Some entries have `founded`, others `founding_year`. The renderer
// reads only `short_name`/`name` from this type — the rest is here
// for forward-compatibility, not because the right column displays it.

export interface Institution {
	id: string;
	name?: string | null; // most entries
	primary_name?: string | null; // drift: INST056/INST057 use this instead of name
	short_name?: string | null;
	type?: string | null;

	// Flat location shape (older entries: INST002 Harvard, INST022 Yale)
	city?: string | null;
	state?: string | null;
	country?: string | null;

	// Nested location shape (newer entries: INST009 onward)
	location?: {
		city?: string | null;
		state?: string | null;
		country?: string | null;
	} | null;

	// Present in canonical data but not rendered:
	founded?: number | null;
	founding_year?: number | null;
	still_exists?: boolean | null;
	notes?: string | null;
}
