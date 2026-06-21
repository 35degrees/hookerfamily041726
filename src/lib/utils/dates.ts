import type { DateLocation } from '$lib/types/person';

const MONTHS = [
	'Jan.',
	'Feb.',
	'Mar.',
	'Apr.',
	'May',
	'June',
	'July',
	'Aug.',
	'Sept.',
	'Oct.',
	'Nov.',
	'Dec.'
];

/**
 * Format just the date portion of a DateLocation.
 * Returns empty string if year is null.
 * Treats month:1, day:1 as a year-only placeholder.
 */
export function formatDate(dl: DateLocation | null | undefined): string {
	if (!dl || dl.year === null) return '';

	const isYearOnly = dl.month === 1 && dl.day === 1;
	if (isYearOnly || dl.month === null) return String(dl.year);

	const monthName = MONTHS[dl.month - 1];
	if (dl.day === null) return `${monthName} ${dl.year}`;
	return `${monthName} ${dl.day}, ${dl.year}`;
}

/**
 * Format just the location portion of a DateLocation or Residence.
 * Joins city, state, country with commas, skipping nulls.
 */
export function formatLocation(
	loc:
		| {
				city?: string | null;
				state?: string | null;
				country?: string | null;
		  }
		| null
		| undefined
): string {
	if (!loc) return '';
	const country = loc.country === 'United States' ? null : loc.country;
	const parts = [loc.city, loc.state, country].filter(Boolean);
	return parts.join(', ');
}

/**
 * Format a DateLocation as "date (location)".
 * Examples:
 *   "July 5, 1586 (Markfield, Leicestershire, England)"
 *   "1586 (England)"
 *   "1586"
 */
export function formatDateLocation(dl: DateLocation | null | undefined): string {
	const date = formatDate(dl);
	const location = formatLocation(dl ?? null);
	if (!date) return '';
	if (!location) return date;
	return `${date} (${location})`;
}

// US state abbreviation lookup
const US_STATE_ABBREV: Record<string, string> = {
	Alabama: 'AL',
	Alaska: 'AK',
	Arizona: 'AZ',
	Arkansas: 'AR',
	California: 'CA',
	Colorado: 'CO',
	Connecticut: 'CT',
	Delaware: 'DE',
	Florida: 'FL',
	Georgia: 'GA',
	Hawaii: 'HI',
	Idaho: 'ID',
	Illinois: 'IL',
	Indiana: 'IN',
	Iowa: 'IA',
	Kansas: 'KS',
	Kentucky: 'KY',
	Louisiana: 'LA',
	Maine: 'ME',
	Maryland: 'MD',
	Massachusetts: 'MA',
	Michigan: 'MI',
	Minnesota: 'MN',
	Mississippi: 'MS',
	Missouri: 'MO',
	Montana: 'MT',
	Nebraska: 'NE',
	Nevada: 'NV',
	'New Hampshire': 'NH',
	'New Jersey': 'NJ',
	'New Mexico': 'NM',
	'New York': 'NY',
	'North Carolina': 'NC',
	'North Dakota': 'ND',
	Ohio: 'OH',
	Oklahoma: 'OK',
	Oregon: 'OR',
	Pennsylvania: 'PA',
	'Rhode Island': 'RI',
	'South Carolina': 'SC',
	'South Dakota': 'SD',
	Tennessee: 'TN',
	Texas: 'TX',
	Utah: 'UT',
	Vermont: 'VT',
	Virginia: 'VA',
	Washington: 'WA',
	'West Virginia': 'WV',
	Wisconsin: 'WI',
	Wyoming: 'WY',
	'District of Columbia': 'DC'
};

export function abbreviateState(state: string | null | undefined): string | null {
	if (!state) return null;
	return US_STATE_ABBREV[state] ?? state;
}

/**
 * Format a location as "City, ST" for US or "City, Country" for non-US.
 * Falls back to state, country, or both when city is missing.
 * Returns null only when location is fully empty.
 */
export function formatLocationShort(
	loc:
		| {
				city?: string | null;
				state?: string | null;
				country?: string | null;
		  }
		| null
		| undefined
): string | null {
	if (!loc) return null;

	const city = loc.city;
	const state = loc.state;
	const country = loc.country;
	const isUS = !country || country === 'United States' || country === 'USA';

	// Full address
	if (city && state && isUS) return `${city}, ${abbreviateState(state)}`;
	if (city && state && !isUS) return `${city}, ${state}, ${abbreviateCountry(country)}`;
	if (city && country && !isUS) return `${city}, ${abbreviateCountry(country)}`;
	if (city) return city;

	// City missing — fall back to state and/or country
	// City missing — fall back to state and/or country
	if (state && isUS) return abbreviateState(state) ?? state;
	if (state && !isUS) return `${state}, ${abbreviateCountry(country)}`;
	if (country && !isUS) return country; // ← was abbreviateCountry(country)

	// US-only or completely empty
	return null;
}

// Country abbreviation (currently just for the few we need)
const COUNTRY_ABBREV: Record<string, string> = {
	England: 'UK',
	'United Kingdom': 'UK',
	Scotland: 'UK',
	Wales: 'UK',
	'Northern Ireland': 'UK',
	Britain: 'UK',
	'Great Britain': 'UK'
};

export function abbreviateCountry(country: string | null | undefined): string {
	if (!country) return '';
	return COUNTRY_ABBREV[country] ?? country;
}
/**
 * Build a Google Maps search URL from a location object or GPS coords.
 */
export function buildMapUrl(
	input:
		| { city?: string | null; state?: string | null; country?: string | null }
		| { latitude: number; longitude: number }
		| string
		| null
): string | null {
	if (!input) return null;

	// String input — handle BEFORE the `in` check below, which throws a TypeError when run
	// against a non-object. A string-form gps ("41.76,-71.35") was tearing down the card render
	// from inside a $derived. A "lat,lng" string → zoom-17 pin; anything else → place query.
	if (typeof input === 'string') {
		const s = input.trim();
		if (!s) return null;
		const m = s.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
		if (m) return `https://www.google.com/maps/@${parseFloat(m[1])},${parseFloat(m[2])},17z`;
		return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s)}`;
	}

	// Anything that isn't a plain object now degrades to null rather than throwing.
	if (typeof input !== 'object' || Array.isArray(input)) return null;

	// GPS coords: zoomed-in view (zoom 17 ≈ neighborhood level). Require finite numbers so a
	// malformed coord falls through to null instead of building a broken "@NaN,NaN" URL.
	if ('latitude' in input && 'longitude' in input) {
		const lat = Number(input.latitude);
		const lng = Number(input.longitude);
		if (Number.isFinite(lat) && Number.isFinite(lng)) {
			return `https://www.google.com/maps/@${lat},${lng},17z`;
		}
		return null;
	}

	// Text-based: use search (zoom controlled by Google based on query specificity)
	const parts = [input.city, input.state, input.country].filter(Boolean);
	if (parts.length === 0) return null;
	const query = encodeURIComponent(parts.join(', '));
	return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

const CARDINAL_WORDS: Record<number, string> = {
	0: 'Zero',
	1: 'One',
	2: 'Two',
	3: 'Three',
	4: 'Four',
	5: 'Five',
	6: 'Six',
	7: 'Seven',
	8: 'Eight',
	9: 'Nine',
	10: 'Ten',
	11: 'Eleven',
	12: 'Twelve'
};

export function cardinalWord(n: number): string {
	return CARDINAL_WORDS[n] ?? String(n);
}

export function cardinalWordLower(n: number): string {
	return cardinalWord(n).toLowerCase();
}

/**
 * Form the possessive of a name.
 * - Ends in 's' or 'S' → just apostrophe (Thomas → Thomas')
 * - Otherwise → apostrophe + s (Samuel → Samuel's)
 */
export function possessive(name: string): string {
	if (!name) return name;
	const lastChar = name[name.length - 1].toLowerCase();
	return lastChar === 's' ? `${name}'` : `${name}'s`;
}
