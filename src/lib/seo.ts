/**
 * seo.ts — what a person page tells search engines and link previews (SEO_PLAN §5.2, §5.4, §5.5).
 *
 * Read by the <svelte:head> of src/routes/[slug]/+page.svelte, beside the title and canonical it already had.
 * Every value is built from data the card itself shows — the blurb, the first narrative block, the vitals, the
 * family chips, the portrait. Nothing from research notes or sources, and nothing fetched. A person whose dates are
 * PRIVATE (`pv`, living and not notable) gets no dates and no places anywhere here, exactly as their card withholds
 * them (FeaturedCard's `datesPrivate`).
 */
import type { Person, DateLocation } from '#lib/types/person.js';
import type { Neighborhood, PersonCompact } from '#lib/types/neighborhood.js';
import { formatLocationShort } from '#lib/utils/dates.js';
import { personHref } from '#lib/paths.js';
import { cldSize } from '#lib/photo.js';
import { SITE_ORIGIN } from '#lib/site.js';

/** ~155 characters is what Google shows of a snippet; a little over is clipped by Google, not by us. */
const DESCRIPTION_MAX = 158;

// A period after one of these is not the end of a sentence ("Rev. Thomas", "F. D. Hooker", "Hooker & Co.").
const ABBREVIATION = /(?:^|[\s(])(?:[A-Z]|Rev|Dr|Mr|Mrs|Ms|St|Jr|Sr|Capt|Col|Gen|Lt|Hon|Dea|Gov|Co|No|Mt|Ft|vs|ca|Esq|Prof|Maj|Sgt|Cpl|Adm|Mass|Conn)\.$/;

/** Plain text of a narrative-block body: the one in-body markup, `[words](action)`, becomes its words. */
function plain(text: string): string {
	return text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();
}

function firstSentence(text: string): string {
	const t = plain(text);
	const end = /[.!?](?=\s+["'“A-Z0-9])/g;
	let m: RegExpExecArray | null;
	while ((m = end.exec(t))) {
		const head = t.slice(0, m.index + 1);
		if (!ABBREVIATION.test(head)) return head;
	}
	return t;
}

/** Trim to the limit at a word boundary, never leaving a dangling abbreviation or comma before the ellipsis. */
function clip(text: string, max = DESCRIPTION_MAX): string {
	if (text.length <= max) return text;
	let cut = text.slice(0, max - 1);
	cut = cut.slice(0, cut.lastIndexOf(' '));
	// …nor on a word that only joins ("Hooker &…", "the history of…").
	while (ABBREVIATION.test(cut) || /[,;:&]$|\s(?:and|or|of|the|a|an|at|to|in|on|by|for|with|from)$/i.test(cut))
		cut = cut.slice(0, cut.lastIndexOf(' '));
	return cut + '…';
}

function genderOf(person: Person): string {
	return (person.gender ?? person.bio?.gender ?? person.name?.gender ?? '').toLowerCase();
}

/** A place worth printing: the card's own short form, unless all we know is the country ("born United States"). */
function placeOf(dl: DateLocation | null | undefined): string | null {
	if (!dl || (!dl.city && !dl.state)) return null;
	return formatLocationShort(dl);
}

/**
 * THE DESCRIPTION — the grey line under a search result, and the line under a shared link's title.
 * The card's blurb, then the first sentence of its first narrative block (Sam, Oct 24: SEO_PLAN §11.5).
 * With neither, a factual line from the vitals and the parents' chips. Null when there is nothing honest to
 * say, and the tag is then left out (Google writes its own rather than reading an empty one).
 */
export function personDescription(person: Person, n: Neighborhood): string | null {
	const blurb = (person.notable?.notable_blurb ?? person.bio?.bio_blurb ?? '').trim();
	const first = [...(person.narrative_blocks ?? [])].sort((a, b) => a.number - b.number)[0];
	const sentence = first?.body ? firstSentence(first.body) : '';
	if (blurb || sentence) return clip([blurb && blurb.replace(/\.?$/, '.'), sentence].filter(Boolean).join(' '));

	const parents = [n.parents?.father?.n, n.parents?.mother?.n].filter(Boolean);
	const g = genderOf(person);
	const child = g.startsWith('m') ? 'Son' : g.startsWith('f') ? 'Daughter' : 'Child';
	const bits: string[] = [];
	if (parents.length) bits.push(`${child} of ${parents.join(' and ')}`);
	if (!person.pv) {
		const year = person.birth?.year;
		const place = placeOf(person.birth);
		if (place && year) bits.push(`born in ${place}, in ${year}`);
		else if (place || year) bits.push(`born in ${place ?? year}`);
	}
	return bits.length ? clip(bits.join('; ') + '.') : null;
}

/** The person's portrait as an absolute URL in a given transform — Cloudinary-hosted photos only. Photos hotlinked
 *  from other sites are skipped: those hosts refuse to serve another site's previews (roadmap §45.4). */
function portrait(person: Person, transform: string): string | null {
	const url = person.bio?.photo_url ?? person.name?.photo_url ?? null;
	const src = cldSize(url, transform);
	return src?.startsWith('/cld/') ? SITE_ORIGIN + src : null;
}

/** THE LINK-PREVIEW IMAGE (SEO_PLAN §5.5): the whole portrait, padded on the card's own cream to the 1200×630 a
 *  preview wants, never cropped (Sam, Oct 26 — a face-centred crop cut the face off newspaper portraits). JPEG,
 *  because some preview fetchers still refuse WebP. Through /cld/, so each one is built once and edge-cached. */
export const PREVIEW_W = 1200;
export const PREVIEW_H = 630;
export function previewImage(person: Person): string | null {
	return portrait(person, `w_${PREVIEW_W},h_${PREVIEW_H},c_pad,b_rgb:f4ecdd,q_auto,f_jpg`);
}

/** A date at the precision the record has: "1586", "1586-03", "1586-03-07". Approximate dates give the year only,
 *  and so does 1 January unless the record says it is exact — formatDate's placeholder rule (dates.ts), so the
 *  structured data never claims a day the card itself does not show. */
function isoDate(dl: DateLocation | null | undefined): string | null {
	if (!dl?.year) return null;
	const y = String(dl.year).padStart(4, '0');
	if (dl.date_precision === 'approximate' || dl.date_precision === 'year_only' || !dl.month) return y;
	if (dl.month === 1 && dl.day === 1 && dl.date_precision !== 'exact') return y;
	const m = String(dl.month).padStart(2, '0');
	if (dl.date_precision === 'month_year' || !dl.day) return `${y}-${m}`;
	return `${y}-${m}-${String(dl.day).padStart(2, '0')}`;
}

function personRef(c: PersonCompact | null | undefined) {
	if (!c?.n) return null;
	return c.slug
		? { '@type': 'Person', name: c.n, url: SITE_ORIGIN + personHref(c.slug) }
		: { '@type': 'Person', name: c.n };
}

/**
 * STRUCTURED DATA — schema.org `Person` as JSON-LD (SEO_PLAN §5.4): who this is, when and where they were born and
 * died, and their parents, spouses and children as links into the tree. Returned as the TEXT of the script element,
 * with `<` escaped so a name can never close the tag.
 */
export function personJsonLd(person: Person, n: Neighborhood, url: string, description: string | null): string {
	const showVitals = !person.pv;
	const children = (n.spouses ?? []).flatMap((s) => s.children ?? []);
	const doc: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: person.bio?.display_name ?? person.name?.display_name ?? n.focus?.n,
		url,
		description: description ?? undefined,
		image: portrait(person, 'w_600,c_limit,q_auto,f_jpg') ?? undefined,
		birthDate: showVitals ? (isoDate(person.birth) ?? undefined) : undefined,
		birthPlace: showVitals && placeOf(person.birth) ? { '@type': 'Place', name: placeOf(person.birth) } : undefined,
		deathDate: showVitals ? (isoDate(person.death) ?? undefined) : undefined,
		deathPlace: showVitals && placeOf(person.death) ? { '@type': 'Place', name: placeOf(person.death) } : undefined,
		parent: [personRef(n.parents?.father), personRef(n.parents?.mother)].filter(Boolean),
		spouse: (n.spouses ?? []).map((s) => personRef(s.spouse)).filter(Boolean),
		children: children.map(personRef).filter(Boolean),
		sameAs: (person.notable as { notable_url?: string | null })?.notable_url ?? person.notable?.primary_url ?? undefined
	};
	for (const k of ['parent', 'spouse', 'children'] as const) if (!(doc[k] as unknown[]).length) delete doc[k];
	return JSON.stringify(doc).replace(/</g, '\\u003c');
}
