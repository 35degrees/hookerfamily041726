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
	bio_blurb?: string | null;
	photo_url?: string | null;
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

export interface Person {
	id: string;
	slug: string;
	is_placeholder: boolean;
	bio?: Name;
	name?: Name;
	gender: string | null;
	birth: Birth;
	death: Death;
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
	documents: string[];
	paths_to_thomas?: Array<{ path_id: number; length: number; chain: string[]; via?: string }>;
	paths_to_john_talcott?: Array<{ path_id: number; length: number; chain: string[]; via?: string }>;
	former_ids?: string[];
	has_descendants_documented?: boolean;
	number_of_marriages?: number | null;
	cross_reference?: string | null;
	naming_inspiration?: unknown[];
}

export interface Education {
	institution_id: string | null;
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
