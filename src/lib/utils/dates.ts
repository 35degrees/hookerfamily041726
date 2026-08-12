import type { DateLocation } from '$lib/types/person';

// FULL month names (Aug 4, Sam: "spell out the entire month to be consistent"). Abbreviating some
// months and not others — "Apr." but "May", "Sept." but "June" — made the vitals column read as two
// conventions in one list. formatDate is the only consumer that renders (formatDateLocation has none).
const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

/**
 * Format just the date portion of a DateLocation.
 * Returns empty string if year is null.
 * Treats month:1, day:1 as a year-only placeholder — UNLESS date_precision says 'exact', which is
 * the only way a real New Year's Day birth can be told from the placeholder. Without this, Gridley
 * Strong's 1 January 1947 printed as bare "1947" on a card whose whole point is that we know the
 * day. Same rule, same reason, as the one in ageAtDeath below; the two must not disagree.
 */
export function formatDate(dl: DateLocation | null | undefined): string {
	// Assemble from present parts ONLY — month/day may be null OR absent (undefined). Use `== null`
	// (matches both) and guard the month lookup so a missing/out-of-range part can never render the
	// literal "undefined" (the old `=== null` checks let undefined fall through to MONTHS[NaN]).
	if (!dl || dl.year == null) return '';
	const year = String(dl.year);

	// month:1, day:1 is the year-only placeholder convention; a missing month is year-only too.
	if (dl.month == null) return year;
	if (dl.month === 1 && dl.day === 1 && dl.date_precision !== 'exact') return year;

	const monthName = MONTHS[dl.month - 1];
	if (!monthName) return year; // out-of-range month → year alone, never "undefined"
	if (dl.day == null) return `${monthName} ${year}`;
	return `${monthName} ${dl.day}, ${year}`;
}

/**
 * Age at death in whole years, and whether the dates actually pin it down.
 *
 *   { years, approx: false } — the dates determine it exactly.
 *   { years, approx: true }  — a best estimate; the card marks it with a tilde, "(~Age 65)".
 *   null                     — no age can be offered at all (a year is missing on either side).
 *
 * Genealogical dates are ragged, so precision has to be REPORTED rather than assumed. The rule:
 *
 *   • both dates carry month AND day  → exact.
 *   • a day is missing on either side → exact if the months DIFFER (the unknown day cannot change the
 *     answer); approximate if they match, where the unknown day decides it.
 *   • either side is year-only        → approximate.
 *
 * The approximate figure is the plain year difference, which is the UPPER bound — the true age is that
 * or one less, depending on whether the birthday had come round. Reporting the larger of the two is the
 * convention, and the tilde is what keeps it honest.
 *
 * Year-only follows formatDate's own convention: a null month, or the month:1/day:1 placeholder —
 * EXCEPT where the record explicitly says the date is exact. 258 people carry a birth of month:1/
 * day:1 and for 242 of them that really is the placeholder, but the other 16 were genuinely born on
 * New Year's Day (Gridley Strong and Robert Tracy, both 1 Jan 1947, among them) and were being
 * handed a tilde for it. `date_precision: 'exact'` is the only thing that can tell the two apart,
 * so it wins over the heuristic — and only in the placeholder branch, never over a null month,
 * where there is no day to be exact about.
 */
// Takes only the three fields it reads, not a whole DateLocation. A full DateLocation still satisfies
// this (every existing caller passes one), but the timeline rail works from PersonCompact — which has a
// year and, since the age fix, a month and day, and no place at all. Requiring city/county/state/country
// here would have forced that caller to pad four nulls it does not have, to satisfy a type this function
// never touches.
type YMD = Pick<DateLocation, 'year' | 'month' | 'day'> & { date_precision?: string | null };

export function ageAtDeath(
	birth: YMD | null | undefined,
	death: YMD | null | undefined
): { years: number; approx: boolean } | null {
	if (!birth || !death || birth.year == null || death.year == null) return null;
	const yearOnly = (d: YMD) => {
		if (d.month == null) return true;
		if (d.month === 1 && d.day === 1) return d.date_precision !== 'exact';
		return false;
	};

	let years = death.year - birth.year;
	let approx = false;

	if (yearOnly(birth) || yearOnly(death)) {
		approx = true; // no month to compare — the year difference is the upper bound
	} else {
		const bm = birth.month as number;
		const dm = death.month as number;
		if (birth.day != null && death.day != null) {
			if (dm < bm || (dm === bm && death.day < birth.day)) years -= 1;
		} else if (dm === bm) {
			approx = true; // the unknown day decides it
		} else if (dm < bm) {
			years -= 1;
		}
	}
	// A negative or implausible span means the underlying dates disagree; say nothing rather than print it.
	if (years < 0 || years > 120) return null;
	return { years, approx };
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

	// Text-based: use search (zoom controlled by Google based on query specificity).
	// Require something more specific than a bare country: a lone "United States" query just
	// opens a full-country map, so country-only (no city AND no state) reads as no usable
	// location — return null so the card shows the place text without a pointless "Map" link.
	if (!input.city && !input.state) return null;
	const parts = [input.city, input.state, input.country].filter(Boolean);
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
