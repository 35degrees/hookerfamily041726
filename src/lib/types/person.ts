export interface Name {
	title: string | null;
	first_name: string | null;
	middle_name: string | null;
	last_name: string | null;
	suffix: string | null;
	maiden_name: string | null;
	married_names: string[];
	nickname: string | null;
	display_name: string;
	/** Some records carry gender HERE instead of at the top level — see genderOf() in generation.ts. */
	gender?: string | null;
	bio_blurb?: string | null;
	photo_url?: string | null;
	/** CSS object-position override for this one portrait (e.g. 'right top'); optional. */
	photo_position?: string | null;
	/** Optional per-person typeface for this card's narrative blocks. Resolved through an
	    allow-list in NarrativeBlocks.svelte — an unknown value falls back to the card default,
	    so canonical.json can never inject arbitrary CSS. Currently: 'rokkitt'. */
	display_font?: string | null;
	photo_notes: string | null;
	notes?: string | null;
	extra_names?: string | null;
}

export interface DateLocation {
	year: number | null;
	month: number | null;
	day: number | null;
	city: string | null;
	county: string | null;
	state: string | null;
	country: string | null;
	/** 'exact' | 'year_only' | 'month_year' | 'approximate' | 'unknown'. Absent on most records —
	 *  ~15k carry no value at all — so it is read only where it can settle something the shape of the
	 *  date cannot: a month:1/day:1 that is a REAL New Year's Day rather than the placeholder. Both
	 *  formatDate and ageAtDeath consult it for exactly that, and nothing else. */
	date_precision?: string | null;
}

export type Birth = DateLocation;
export type Baptism = DateLocation;

export interface Death extends DateLocation {
	cause: string | null;
}

export interface Residence {
	city: string | null;
	county: string | null;
	state: string | null;
	country: string | null;
}

export interface Classification {
	is_thomas_descendant: boolean;
	is_talcott_descendant: boolean;
	is_thomas_spouse: boolean;
	is_talcott_spouse: boolean;
	is_easter_egg: boolean;
	is_progenitor: boolean;
	generation_from_thomas: number | null;
	generation_from_john_talcott: number | null;
	include_in_path_calculation: boolean;
	descent_paths_to_thomas: number | null;
	descent_from_thomas_hooker: boolean;
}

export interface Notable {
	is_notable: boolean;
	notable_category: string[];
	notable_blurb: string | null;
	primary_url: string | null;
	primary_url_label: string | null;
}

export interface Parents {
	father_id: string | null;
	father_name: string | null;
	mother_id: string | null;
	mother_name: string | null;
	father_research_notes: string | null;
	mother_research_notes: string | null;
}

export interface Marriage {
	marriage_number: number;
	spouse_id: string | null;
	spouse_name: string | null;
	date_year: number | null;
	date_month: number | null;
	date_day: number | null;
	location_city: string | null;
	location_county: string | null;
	location_state: string | null;
	location_country: string | null;
	officiant: string | null;
	end_type: string | null;
	end_year: number | null;
	children_ids: string[];
}

export interface NarrativeBlock {
	number: number;
	category: string;
	header: string;
	body: string;
}

export interface CrossConnection {
	type: string;
	related_id: string;
	display_label: string;
	link_text: string;
	notes?: string;
}

export interface Quote {
	text: string;
	attribution: string;
	category: string;
	source_url: string | null;
}

export type Source =
	| { label: string; url: string }
	| { short: string; page?: string; full?: string; date?: string; type?: string };

export interface ResearchSource {
	bib_id: string;
}

export interface Burial {
	cemetery_id: string | null;
	plot_notes: string | null;
}

export interface InstitutionRef {
	institution_id: string;
	institution_blurb: string | null;
	years?: string | null;
}

export interface LandmarkRef {
	landmark_id: string;
	landmark_blurb?: string | null; // v18 canonical
	relationship?: string | null; // drift (e.g. H03408)
	notes?: string | null; // drift (e.g. H03408)
}

export interface StatueRef {
	statue_id: string;
}

export interface ArtworkRef {
	artwork_id: string;
	blurb?: string | null;
}

export interface DocumentRef {
	document_id: string;
	document_blurb?: string | null;
}

/**
 * Uniform, display-ready row emitted by regenerate-data.js for each media backlink
 * (landmark / artwork / document / statue / video). The component NEVER sees a raw id —
 * every field is already resolved against the top-level registries. Any field may be
 * null (missing/malformed source); a whole entry is dropped rather than emitted broken.
 */
export interface MediaRow {
	name: string | null;
	typeLabel: string | null;
	blurb: string | null;
	/** The single secondary line the card renders — set per section by the resolver. */
	subtitle: string | null;
	url: string | null;
	thumbUrl: string | null;
	alt: string | null;
	tooltip: string | null;
	/** Optional CSS object-position for the thumb ('top', 'left bottom'…). Null = centre crop. */
	thumbPos?: string | null;
}

export interface Person {
	id: string;
	slug: string;
	t?: import('./neighborhood').TableCoord; // Phase 3a: table seat {x, y, e?} (emit-time derived)
	is_placeholder: boolean;
	bio?: Name;
	name?: Name;
	gender: string | null;
	birth: Birth;
	death: Death;
	/** dates are PRIVATE (living, non-notable): kept on the record, never rendered. */
	pv?: boolean;
	baptism: Baptism;
	residence: Residence;
	burial: Burial;
	classification: Classification;
	notable: Notable;
	parents: Parents;
	marriages: Marriage[];
	tags: string[];
	research_tags: string[];
	cross_connections: CrossConnection[];
	narrative_blocks: NarrativeBlock[];
	quotes: Quote[];
	sources: Source[];
	research_sources: ResearchSource[];
	research_notes: string | null;
	education: Education[];
	career: Career[];
	institutions: InstitutionRef[];
	landmarks: LandmarkRef[];
	statues?: StatueRef[];
	artworks: ArtworkRef[];
	documents: DocumentRef[];
	paths_to_thomas?: Array<{ path_id: number; length: number; chain: string[]; via?: string }>;
	paths_to_john_talcott?: Array<{ path_id: number; length: number; chain: string[]; via?: string }>;
	former_ids?: string[];
	has_descendants_documented?: boolean;
	number_of_marriages?: number | null;
	cross_reference?: string | null;
	naming_inspiration?: unknown[];
	/** Rare one-off: when set, computeGenerationLabels renders this verbatim instead of computing. */
	relational_label_override?: string;
	/**
	 * Display-ready media rows, resolved at build time by regenerate-data.js against the
	 * top-level registries (landmarks/artworks/documents/statues/videos). Present only on
	 * the FOCUS person of a payload — context/relative records don't carry them.
	 */
	landmarksResolved?: MediaRow[];
	artworksResolved?: MediaRow[];
	documentsResolved?: MediaRow[];
	statuesResolved?: MediaRow[];
	videosResolved?: MediaRow[];
}

export interface Education {
	institution_id: string | null;
	institution_name?: string | null; // drift: some rows carry a spelled-out name, no INST id
	school_name: string | null;
	dates: string | null;
	type: string | null;
	notes: string | null;
}

export interface Career {
	role: string | null;
	organization: string | null;
	location?: string | null;
	start_year: number | null;
	end_year: number | null;
	notes: string | null;
}
