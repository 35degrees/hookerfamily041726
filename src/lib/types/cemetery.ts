export interface Cemetery {
	id: string;
	name: string;
	city?: string | null;
	county?: string | null;
	state?: string | null;
	country?: string | null;
	address?: string | null;
	zip?: string | null;
	gps?: {
		latitude: number;
		longitude: number;
	} | null;
	founded?: number | null;
	visitable?: boolean;
	notes?: string | null;
	access_notes?: string | null;
	features?: string[];
	hooker_connections?: string[];
	wikipedia_url?: string | null;
	primary_url?: string | null;
}
