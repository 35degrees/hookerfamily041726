<script module lang="ts">
	// THE CARD'S FIXED TOP HEIGHT — header row + content row. The CC footer is NOT part of it: a card
	// with cross-connections is this tall PLUS its footer, which is why reducing this leaves the footer
	// untouched. Exported because DeckRiffle sizes its phantom cards to match, and it used to do that
	// with its own literal and a comment saying "matches FeaturedCard's card-top height" — a comment is
	// not a mechanism, and the two would have silently diverged the first time this number moved.
	export const CARD_TOP_H = 575; // was 580; reduced 5px on Aug 4 (20px was tried and read as too much)

	// Corner radius for the rounded card silhouette. Matches the spouse chip's rounded-lg (8px) so the
	// chip docks visually. Exported for the SAME reason CARD_TOP_H is: the CC blade is carved with the
	// card's own radius, and a second literal would silently diverge the first time this moved.
	//
	// PHASE 2.75 — AND IT DELIBERATELY DOES NOT SCALE. A radius is DETAIL, not geometry: 8px reads as
	// "gently rounded" on a 925px card and on a 660px one alike, where 6.6px reads as very slightly less
	// rounded and nobody can tell you which card they are looking at. Leaving it fixed also keeps the
	// blade's carve arithmetically exact — the blade imports this same constant and mitres against it,
	// and two independently-rounded numbers is how a seam appears at one size and not another. Radii,
	// hairlines and border widths are the class of constant that should stay put while the frame moves.
	export const CORNER_R = 8;

	/** The card's WIDTH at u = 1. Sibling of CARD_TOP_H; both are now read through the scaled helpers. */
	export const CARD_W = 925;

	/** The header ROW's height at u = 1 (design §28.1's third constant, previously a local). */
	export const HEADER_H_BASE = 82;
	/** The crowded 4-line dual-descent variant. */
	export const HEADER_H_CROWDED = 96;
</script>

<script lang="ts">
	import { isPynchonKin, pynchonGeneration, pynchonLiteralLabel } from '$lib/data/pynchonLine';
	import { buildDescendantLabel } from '$lib/utils/generation';
	import type { Person } from '$lib/types/person';
	import type { SpouseEntry, PersonCompact } from '$lib/types/neighborhood';
	import { openModal } from '$lib/state/modal.svelte';
	import type { Cemetery } from '$lib/types/cemetery';
	import type { Institution } from '$lib/types/institution';
	import RightColumn from './RightColumn.svelte';
	import NarrativeBlocks from './NarrativeBlocks.svelte';
	import { formatDate, formatLocationShort, buildMapUrl, ageAtDeath } from '$lib/utils/dates';
	import { shrinkToFit } from '$lib/actions/shrinkToFit';
	import { cldSize, PHOTO_TRANSFORM } from '$lib/photo';
	import CrossConnectionsBlade, { BLADE_TANG } from './CrossConnectionsBlade.svelte';
	import { unsheathBlade } from '$lib/transitions/flight';
	import { stage } from '$lib/state/stage.svelte';
	import { untrack, tick } from 'svelte';

	// ── PHASE 2.75 — THE TWO DIALS, READ ONCE ───────────────────────────────────────────────────────
	// u scales the FRAME, k scales the TYPE, and the gap between them is the whole hybrid: at the small
	// landscape rung the frame is at 0.82 while the type is at 0.90, so a 13px narrative body sets at
	// 11.7px rather than the 10.7px a uniform squeeze would have given it. That is bought with SPACE,
	// which is why nbCap exists — see the content budget in stage.svelte.ts.
	const u = $derived(stage.u);
	const k = $derived(stage.k);
	/** Round a base type size through the type step. Type is rounded to a tenth, not an integer: a
	 *  half-pixel of font-size is a real, visible difference in weight where a half-pixel of box is not. */
	const t = (px: number) => Math.round(px * k * 10) / 10;
	/** The card's live frame, scaled. Integers — these feed a clip-path and a flight's measured rects. */
	const cardW = $derived(Math.round(CARD_W * u));
	const cardTopH = $derived(Math.round(CARD_TOP_H * u));
	/** Must match CrossConnectionsBlade's own `tang` exactly — same base, same store, same rounding. */
	const bladeTang = $derived(Math.round(BLADE_TANG * u));

	type Props = {
		person: Person;
		/** Every distinct route Thomas → this person, THOMAS FIRST, focus dropped. Baked into the payload
		 *  (pathsToThomasFor in regenerate-data.js) and passed in the same way `orbit` is, rather than read
		 *  off `person`: it is a build-time derivation, and `person` mirrors the canonical record.
		 *  PRESENT is the button's whole gate — by construction it means "Thomas descendant, grandchild or
		 *  deeper", so there is no second predicate here to fall out of step with the bake. */
		pathsToThomas?: PersonCompact[][];
		/** The ladder is the focus's PARTNER's — see pathsToThomasFor. Only affects the button's label. */
		pathsSpouse?: boolean;
		/** The focus's first name, for the Connect button's label. Passed in rather than derived here so
		 *  it is the SAME name the page already uses for "<name>'s parents" — that resolution has four
		 *  fallbacks (bio, name, the compact's `fn`, then the display name's first token) because two of
		 *  them are routinely absent, and a second derivation here would eventually disagree with it. */
		firstName?: string | null;
		spouses: SpouseEntry[];
		generationLabels?: string[];
		burialCemetery?: Cemetery | null;
		/** MARRIED INTO the Hooker line — the compact's derived `sp`. Passed in rather than read off
		 *  person.classification because is_thomas_spouse there is only ~22% populated; see
		 *  marriedIntoLine in regenerate-data.js. */
		marriedIn?: boolean;
		crossConnections?: Array<{
			type: string;
			related_id: string;
			link_text: string;
			display_label: string;
			slug: string | null;
			t?: { x: number; y: number | null; e?: boolean } | null;
			relation_class?: 'direct' | 'collateral' | null;
			gen_delta?: number | null;
			// Edges to the nearest shared ancestor (build-time LCA bake). Absent = no shared ancestor
			// within the cap. Rides to the deck's same-line test via data-kin-distance (see camera.ts).
			kin_distance?: number | null;
			/** ORBIT (§40) — the TARGET's orbit-ness, so the ascension's axis can be decided at click
			 *  time off the anchor. Absent when false; see computeOrbit in regenerate-data.js. */
			orbit?: boolean;
		}>;
		institutionsById?: Record<string, Institution>;
		/** The blade's measured height, forwarded to the page so the featured slot can reserve it. */
		onbladeheight?: (h: number) => void;
		// False while this card is flying/settling into FeaturedCard space (promotion morph).
		// Gates the hover-zoom so a cursor already over the incoming photo can't trigger the
		// enlarge mid-flight (it flashed in then popped as the card grew). True at rest / introend.
		settled?: boolean;
		/** ORBIT (§38) — this person's family component never touches the tree. Passed in rather than read
		 *  off `person`, because it is DERIVED at build time and lives at the payload root beside
		 *  lineAnchors, not on the canonical record. Drives the card's paper and nothing else. */
		orbit?: boolean;
		/** Married to a Hartford founder. Passed in because it needs the payload's `context`, which the
		 *  card does not receive — see ascension.svelte.ts. */
		founderSpouse?: boolean;
	};

	// THE PYNCHON LINE carries a spectrum on its cards — hero and chip alike. NOT
	// `classification.is_easter_egg`, which is a genealogical fact about orbit figures and drives the
	// ee-line shading above; this marks descent in a line that is not the Hooker one. Membership is
	// DERIVED from the parent graph (see scripts/derive-pynchon-line.mjs), never hand-listed, so it cannot
	// drift away from the genealogy it describes.
	let {
		person,
		pathsToThomas,
		pathsSpouse = false,
		firstName = null,
		spouses,
		generationLabels = [],
		burialCemetery = null,
		marriedIn = false,
		crossConnections = [],
		institutionsById = {},
		onbladeheight,
		settled = true,
		orbit = false,
		founderSpouse = false
	}: Props = $props();

	/**
	 * A HARTFORD FOUNDER. Read off the person's own tags rather than passed in, because unlike `orbit`
	 * this is a CANONICAL FACT and not a build-time derivation — `hartford_founder` was already in the
	 * schema's founding tag family, and payloads already carry `tags`.
	 *
	 * TWO PREDICATES, NOT ONE, and the split is Sam's: "Dorothy just gets Hartford Founder title, not
	 * ascension zone." So the TITLE follows the tag wherever it appears, while the ZONE'S SURFACE — the
	 * wax paper and the blue rule — follows the tag AND orbit-ness. Dorothy, William Goodwin and John
	 * Haynes are attached to the tree, so they are named as founders on ordinary cards and never enter
	 * the green.
	 */
	const founder = $derived(
		person.id !== 'H00001' && (person.tags ?? []).includes('hartford_founder')
	);
	/**
	 * THE MARRIED-IN CASE (Sam: "Elizabeth Hart needs to be Wife of a Hartford founder and get the same
	 * green background treatment"). It follows the shape the orbit title already uses — the principal
	 * gets the claim, the spouse is named by it — and for the same reason: she is in this component, and
	 * on this ground, because of who she married.
	 * The ZONE, though, does not care which of the two she is: a room is a room, so the green, the blue
	 * rule and the gold sprites are keyed on `founderAny`, not on `founder`.
	 */
	const founderAny = $derived(founder || founderSpouse);
	const founderZone = $derived(founderAny && orbit);

	let photoUrl = $derived(person.bio?.photo_url ?? person.name?.photo_url ?? null);
	// The featured portrait — the SAME shared derivative the chips use (so a chip→featured promotion is a
	// cache hit, not a reload), covering the ~200px display AND the ~2× hover-zoom in one image. Loaded
	// eager + high-priority; the zoom reuses it verbatim (same URL → no second fetch).
	let portraitSrc = $derived(cldSize(photoUrl, PHOTO_TRANSFORM));
	let displayName = $derived(person.bio?.display_name ?? person.name?.display_name ?? '');
	// Per-person typeface (bio.display_font) — allow-list, never a passthrough. Lands on this card's
	// NAME and its NB headers; the same key rides the compacts as `df` so the person's CHIP matches.
	const NAME_FONTS: Record<string, string> = { rokkitt: 'font-rokkitt' };
	let nameFontClass = $derived(NAME_FONTS[(person.bio?.display_font ?? '').toLowerCase()] ?? '');

	// ── THE FEATURED NAME'S FACE ────────────────────────────────────────────────────────────────────
	// Outfit, 600. THIS CARD'S <h1> ONLY — Sam: "this request is 100% only for the FeaturedCard name. I
	// am not interested in changing the font for the name on any of the other chips like spouse chip,
	// parent sibling or child." Those keep Inter via the body font; nothing here reaches them.
	//
	// SIZE FOLLOWS THE FACE, because apparent size is CAP HEIGHT and not px. Measured off rendered
	// pixels: Inter Variable 500 at 24px has an 18px cap; Outfit has a 16px cap at the same px. 26px is
	// therefore the size at which Outfit reads as EXACTLY the size the Inter name always did — it is a
	// like-for-like swap, not an enlargement. The shrinkToFit floor moves by the same ratio (17 → 18.5).
	//
	// Outfit and Carlito were both trialled here and on the chips, and both were returned from; neither
	// is imported now (see +layout.svelte). Setting NAME_FACE to a font-* class is all that is needed to
	// try another, but the SIZE must move with it — see above.
	const NAME_FACE = 'font-outfit';
	const NAME_SIZE = 26;
	const NAME_MIN = 18.5;
	// 500, unchanged across the face trials. Inter is variable (100-900), so it is a real weight.
	const NAME_WEIGHT_CLASS = 'font-medium';

	// ── THE BLADE'S SHEATH ──────────────────────────────────────────────────────────────────────────
	// Two moments, both owned by THIS card because the blade is part of it:
	//   arriving — draw it out of the case the moment this card starts moving, on the retract's clock;
	//   departing — stow it again as the card leaves (retractBladeIn, fired from the card's outrostart
	//   in the page, because Svelte stops running an outroing block's effects and the card can no
	//   longer notice its own departure from in here).
	// `settled` already means "this card is at rest" — the page derives it from the flight's own landing
	// events — so no new state and no timer is needed to know which moment we are in.
	let bladeMount = $state<HTMLElement | null>(null);
	// STOWED IS DECLARATIVE, and true from this card's very first frame if it arrived mid-flight — so
	// there is never a frame where the blade is painted already open. It is also the gate: a card that
	// mounts already settled (cold load, back/forward) simply has its blade out and animates nothing.
	let stowed = $state(untrack(() => !settled));

	$effect(() => {
		const el = bladeMount;
		if (!el) return;
		untrack(() => {
			if (!stowed) return;
			// One tick. The flight publishes its clock when the hero's transition is created, which is
			// AFTER this component's effects run — read synchronously it comes back zero, and the blade
			// draws on no schedule at all. The declarative stow above covers the wait.
			void tick().then(() => {
				unsheathBlade(el);
				stowed = false;
			});
		});
	});

	// EMBLEM IMAGES — ids whose portrait slot holds a coat of arms rather than a face. The hover-zoom
	// lifts a portrait off the page with a drop shadow AND a hairline ring, both right for a photograph
	// and wrong for a flat crest — the ring draws a box around a transparent PNG. Sam, 10 Aug 2026,
	// asked for both off on X01929 and for nothing else to change — so this is a LIST, not a rule
	// inferred from the image. Add ids on request.
	const EMBLEM_PHOTO = new Set(['X01929']);

	// ── Main-portrait hover-zoom ──────────────────────────────────────────────
	// Same mechanism as RightColumn's thumbnail popout (mouse-anchored, portaled to <body> so it escapes
	// the card clip / overflow, pointer-events-none so the card stays interactive). Anchored ABOVE the
	// cursor with a smart flip below when near the top edge, and clamped horizontally to the viewport.
	// Hidden the instant the pointer leaves the photo.
	let zoom = $state<{
		src: string;
		alt: string;
		w: number;
		h: number;
		ax: number;
		y: number;
	} | null>(null);

	// Instant + lightweight: reuse the ALREADY-LOADED portrait src (no new network request → the
	// enlargement appears the moment you hover, no first-hover lag). Sized to 200% of the displayed
	// WIDTH at the image's NATURAL aspect, so the WHOLE photo shows — tall portraits aren't cropped to
	// the midriff the way the object-cover card thumbnail is. Capped to the viewport, and never
	// narrower than the on-card photo.
	const ZOFFSET = 33; // fixed horizontal nudge right of the photo's edge, toward page centre (~2rem)
	function trackZoom(e: MouseEvent) {
		// Don't enlarge until the card has finished flying into FeaturedCard space. During the
		// promotion morph the img is transform-scaled (getBoundingClientRect would be wrong anyway),
		// and a stationary cursor over the landing spot would otherwise flash the zoom in and out.
		if (!photoUrl || !settled) return;
		const img = e.currentTarget as HTMLImageElement;
		const r = img.getBoundingClientRect();
		const ar = img.naturalWidth ? img.naturalHeight / img.naturalWidth : r.height / r.width;
		let w = r.width * 2; // 200% of the displayed width
		let h = w * ar; // full-height at the image's own aspect → nothing cropped
		const s = Math.min(1, (window.innerWidth * 0.6) / w, (window.innerHeight * 0.9) / h);
		w *= s;
		h *= s;
		if (w < r.width) {
			w = r.width; // never narrower than what's already shown on the card
			h = w * ar;
		}
		// Horizontal is pinned to the photo's right edge (constant as the mouse moves), not the cursor.
		zoom = {
			src: portraitSrc ?? photoUrl,
			alt: displayName || 'Portrait',
			w,
			h,
			ax: r.right,
			y: e.clientY
		};
	}
	function closeZoom() {
		zoom = null;
	}
	// If a zoom is open when a promotion morph begins (settled → false), drop it immediately so it
	// doesn't ride the shrinking/growing card. It resumes on the next mousemove once settled again.
	$effect(() => {
		if (!settled) closeZoom();
	});
	// FIXED horizontal position (photo's right edge + ~5rem toward centre) — moving the mouse only
	// slides it up and down; it never drifts left/right. Vertically centered on the cursor, top clamped
	// so the box stays fully on screen; the left is clamped only as a narrow-viewport safety.
	function zoomStyle(z: { w: number; h: number; ax: number; y: number }): string {
		const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
		const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
		const left = Math.max(8, Math.min(z.ax + ZOFFSET, vw - z.w - 8));
		const top = Math.max(8, Math.min(z.y - z.h / 2, vh - z.h - 8));
		return `left:${left}px; top:${top}px; width:${z.w}px; height:${z.h}px;`;
	}
	// Portal to <body> so no card ancestor (clip-path / overflow) can clip the float. Client-only: the
	// {#if zoom} is false during SSR and actions never run on the server.
	function portalZoom(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}

	// Living, non-notable: the Birth and Death vitals are withheld entirely — date AND place AND the
	// map link, which are the same disclosure class. Gated here rather than in formatDate so the
	// formatters stay pure and policy lives in one place.
	let datesPrivate = $derived(Boolean(person.pv));
	// One-off crop override for a portrait the default top-centre crop mangles (landscape shots,
	// off-centre subjects). Set per person in canonical as bio.photo_position; absent everywhere else.
	let photoPosition = $derived(person.bio?.photo_position ?? null);
	let birthDate = $derived(datesPrivate ? '' : formatDate(person.birth));
	let birthLocation = $derived(formatLocationShort(person.birth));
	let birthMapUrl = $derived(buildMapUrl(person.birth));

	let deathDate = $derived(datesPrivate ? '' : formatDate(person.death));
	// Age at death, shown beside the death date, carrying its own precision — an approximate figure is
	// rendered "(~Age 65)" rather than withheld, because a ragged date is still worth an estimate as long
	// as the estimate says so. Gated by datesPrivate with everything else in this disclosure class.
	let ageAtDeathValue = $derived(datesPrivate ? null : ageAtDeath(person.birth, person.death));
	let deathLocation = $derived(formatLocationShort(person.death));
	let deathMapUrl = $derived(buildMapUrl(person.death));

	// CC tail: the label reads straight on from the linked name, with NO separator dash
	// (removed 072926 on Sam's call — the dash was doing the work the prose should do).
	// Two legal label shapes, and they need different spacing:
	//   predicate       "was his father-in-law…"   -> one space:  "Name was his father-in-law…"
	//   leading appositive ", her grandmother, …"  -> no space:   "Name, her grandmother, …"
	// Getting this wrong prints "Name , her grandmother", which is why it is a function and not
	// a space in the markup. The markup around it is deliberately whitespace-free for the same reason.
	function ccTail(label: string): string {
		const t = (label ?? '').trim();
		if (!t) return '';
		return /^[,;:.!?]/.test(t) ? t : ' ' + t;
	}

	// Header blurb: notable people use notable_blurb; non-notable people fall back to
	// bio_blurb (e.g. HD3249 "Documentary artist of the Tuskegee Airmen").
	let blurb = $derived(person.notable?.notable_blurb ?? person.bio?.bio_blurb ?? null);

	// True when the header has 4 lines (name + 2 generation labels + blurb).
	// In that case, use tighter spacing so the extra line doesn't bulldoze.
	// NOTE (Aug 4): dormant while `SHOW_TALCOTT_DESCENT = false` in generation.ts — with the Talcott line
	// off, computeGenerationLabels can only ever return 0 or 1 entries, so this never fires today. Kept
	// because the flag is a switch, not a deletion; see HEADER_H for what happens if it flips back on.
	// THE PYNCHON TITLE, appended after whatever the Hooker graph produced — so a person in both lines
	// (only Jackson today) reads Hooker first and Pynchon beneath it.
	//
	// Worded by generation.ts's OWN buildDescendantLabel rather than a second convention written here.
	// That function is already line-agnostic — it takes the founder's name and derives "Founder of the
	// American <Line> Line", then Son → Grandson → Great-Grandson → Fifth Generation Descendant — which is
	// exactly the progression Sam asked this line to match, because it IS the Hooker line's progression.
	//
	// The one shim is the scale. Our derivation counts the founder as 0 and his son as 1; generation.ts
	// counts a son as 2 (its own note records the off-by-one it was shifted to fix) and reserves ≤ 0 for
	// founders. So: the founder maps to 0, everyone below to g + 1.
	const pynchonLabel = $derived.by(() => {
		// A hand-written row wins outright. It exists for people the derivation must not reach —
		// Dr. Thomas Hooker is on the Hooker trunk and has no Pynchon generation at all. Listed by id
		// in derive-pynchon-line.mjs, never computed: the computed version climbed into the founders.
		const literal = pynchonLiteralLabel(person.id);
		if (literal) return literal;
		const g = pynchonGeneration(person.id);
		if (g === null) return null;
		return buildDescendantLabel(g === 0 ? 0 : g + 1, person.gender ?? null, 'William Pynchon');
	});
	/**
	 * ── THE ORBIT TITLE ─────────────────────────────────────────────────────────────────────────────
	 *
	 * An orbit figure has no descent from Thomas — that is the definition — so the line under their name
	 * has always been empty, which left the most interesting people in the corpus as the only ones the
	 * card would not characterise. Sam's wording, and it is doing something careful: it does not claim
	 * kinship, it states EFFECT. "Major influence on multiple Hooker descendants" is the honest thing to
	 * say about someone the tree reaches only by cross-connection.
	 *
	 * WHO GETS THEIR OWN, AND WHO IS TITLED BY MARRIAGE. Sam's rule is a count of their own
	 * cross-connections: three or more and the claim is theirs; fewer and they are in the zone by
	 * marriage and are titled as such.
	 *
	 * AND THE COUNT NEEDS NO SPOUSE LOOKUP, which is the part worth noticing. An orbit component is a
	 * family group the tree touches only by CC, so a member with almost no CCs of their own is in it
	 * BECAUSE of the person they married — that is what put them in the component. The threshold is
	 * therefore already asking "did they get here on their own account", and the marital case falls out
	 * of it rather than needing to be looked up.
	 */
	const ORBIT_TITLE = 'Major influence on multiple Hooker descendants';
	const ORBIT_OWN_CC = 3; // three of their own and the claim is theirs — Sam's number
	const orbitLabel = $derived.by(() => {
		if (!orbit) return null;
		if (crossConnections.length >= ORBIT_OWN_CC) return ORBIT_TITLE;
		const g = (person.gender ?? '').toLowerCase();
		// Neither/unknown gets "Spouse of" rather than a guess — the same rule the rest of the card
		// follows when a gender is absent.
		const rel = g.startsWith('f') ? 'Wife' : g.startsWith('m') ? 'Husband' : 'Spouse';
		return `${rel} of a ${ORBIT_TITLE[0].toLowerCase()}${ORBIT_TITLE.slice(1)}`;
	});
	// Orbit and Pynchon cannot both apply — the Pynchon line reaches the tree through family edges, so
	// nobody in it is in a detached component — but the chain is written to be explicit rather than to
	// rely on that holding forever.
	const allLabels = $derived(
		founder
			? // ── ONE LINE, REPLACING EVERYTHING ────────────────────────────────────────────────────
				// Sam: "we'll delete this title from them, 'Major influence on multiple Hooker
				// descendants', and instead it will just say Hartford Founder where the title is. John
				// Talcott can have the founder of Talcott line removed."
				// So it replaces the orbit title AND any descent or progenitor line. Talcott loses
				// "Founder of the American Talcott Line"; Dorothy Hooker Chester loses her relation to
				// her father. That is the cost of the rule and Sam chose it knowingly: for these eleven
				// people, being one of the men and women who founded Hartford outranks how the tree
				// happens to reach them.
				['Hartford Founder']
			: founderSpouse
				? // Gendered the same way the orbit title is, and ungendered rather than guessed when the
					// record does not say — see orbitLabel.
					[
						`${
							(person.bio?.gender ?? person.gender ?? '').toLowerCase().startsWith('f')
								? 'Wife'
								: (person.bio?.gender ?? person.gender ?? '').toLowerCase().startsWith('m')
									? 'Husband'
									: 'Spouse'
						} of a Hartford Founder`
					]
				: orbitLabel
					? [...generationLabels, orbitLabel]
					: pynchonLabel
						? [...generationLabels, pynchonLabel]
						: generationLabels
	);
	// Which of the rendered labels is the Pynchon one — the last, when there is one. Used only to colour
	// it: the Pynchon line reads purple-into-magenta, so the two descents are told apart at a glance
	// rather than by reading both lines.
	const pynchonLabelIndex = $derived(pynchonLabel ? allLabels.length - 1 : -1);
	/**
	 * WHICH INK A TITLE LINE TAKES. Three cases, in precedence order, and the order matters: Pynchon
	 * first because its spectrum names a whole line of descent and would be the more surprising thing to
	 * lose; then the founder's green; then the house ink blue.
	 * The green is the ZONE'S OWN GROUND colour, borrowed for type (Sam). It works because a founder
	 * card is wax — hunter is dark enough to hold as small bold text on paper — and because it ties the
	 * words to the room they open, the way the Pynchon spectrum ties a name to its line. Dorothy's card
	 * has no green ground at all, so on hers this is the only trace of the zone she belongs to.
	 */
	const lineClass = (i: number) =>
		i === pynchonLabelIndex ? 'pynchon-descent' : founderAny ? 'founder-descent' : 'text-inkblue';

	let headerIsCrowded = $derived(allLabels.length >= 2 && !!blurb);

	// ── THE LOWER CONTENT STARTS AT THE SAME Y ON EVERY CARD ────────────────────────────────────────
	// The header row used to AUTO-SIZE (`minmax(72px, auto)`), which held a constant ~12px breathing gap
	// under the last text line no matter how many lines there were. That was a deliberate trade and it is
	// now reversed on Sam's call: what must be constant is where the LOWER CONTENT — the photo /
	// narrative / RightColumn grid — begins. Measured, it was moving 23px depending on whether the person
	// had a blurb: 72px on Rachel Flagg (name + descent line, no blurb) against 95px on William Whitney
	// (name + descent + "31st U.S. Secretary of the Navy"). Sam, on the pair: Whitney "starts a bit too
	// low", Rachel "too high up… use Rachel as the baseline but start lower content down 10px."
	//
	// So the row is a FIXED height and the gap under the text is what varies instead. The dial is here and
	// nowhere else.
	//
	// 82 = Rachel's old content start (72, the previous minmax floor) + the 10px Sam asked for.
	//
	// THREE ROWS IS THE PERMANENT MAXIMUM — name + descent line + blurb. Sam, confirming it as a rule
	// rather than a current state: "there will never be headers longer than three rows due to removing
	// Talcott family from the flow." So this height only ever has to serve the three-block header, and
	// `headerIsCrowded` below is dead for good rather than dormant.
	//
	// The three-block header measures 83px of ink from the card's top (16px padding-top + 67px of text),
	// so at 82 its last line ends 1px into the content row. That is deliberate and invisible: the content
	// row carries its own 24px of padding-top, so the nearest actual pixel is ~25px below the blurb. The
	// blurb is CLAMPED to one line for the same reason (see below) — the arithmetic only holds while the
	// third row stays one line.
	// PHASE 2.75: every number in this section is a BASE, stated at u = 1, and read through `su()` below.
	// The comment above (82 = 72 + 10, three rows of ink measuring 83px) describes the base, and stays
	// true of it — the whole point of scaling a frame uniformly is that its internal arithmetic survives.
	// A HEADER IS A STACK OF TYPE SITTING IN PADDING, so it cannot scale on a single dial. Its two parts
	// answer to different ones, and splitting them is what keeps the header's fit CONSTANT rather than
	// degrading as the stage narrows:
	//
	//     28px of padding (16 top + 12 bottom)  -> u, because padding is geometry
	//     54px of text stack (name + descent + blurb) -> k, because it is type
	//
	// 28 + 54 = 82 = HEADER_H_BASE exactly, so nothing moves at u = k = 1.
	//
	// Scaling the whole 82 on u was wrong in a way the numbers make plain. §28.1 records that a
	// three-row header overruns by ~2px at full size and calls it "deliberate and invisible" — 2 of 82,
	// or 2.4%. Under a single u dial that same card overran by 13 of 57 at the small-landscape rung, i.e.
	// 23%, because the text was shrinking on k (0.87) while the box holding it shrank on u (0.70). The
	// deliberate hairline became a visibly clipped blurb. Split, the overrun stays ~1-2px at every rung,
	// which is the invariant §28.1 actually asserts.
	const HEADER_PAD = 28;
	const HEADER_TEXT = HEADER_H_BASE - HEADER_PAD;
	const HEADER_H = $derived(Math.round(HEADER_PAD * u + HEADER_TEXT * k));

	// === Carved card geometry ===
	// THESE FEED A clip-path, so they are ROUNDED TO INTEGERS after scaling rather than left as floats.
	// The notch's silhouette and the spouse chips that dock into it are cut from two different sources —
	// this shape() string and PersonBox's own box — and a half-pixel disagreement between them shows up
	// as a hairline of card visible along the chip's edge at some sizes and not others.
	const CHIP_W_NORMAL = $derived(Math.round(220 * u));
	const CHIP_W_COMPACT = $derived(Math.round(160 * u));
	const CHIP_GAP = $derived(Math.round(8 * u));

	const ZONE_PADDING = 0;
	const CHIP_INSET = $derived(Math.round(18 * u));
	const CHIP_ZONE_HEIGHT_NORMAL = $derived(Math.round(90 * u));
	const CHIP_ZONE_HEIGHT_COMPACT = $derived(Math.round(78 * u));

	// One chip per UNIQUE spouse person: a repeated spouse id can't collide the
	// keyed each, and a stable id key lets the chip↔card morph fire on navigation.
	let spouseChips = $derived.by(() => {
		const seen = new Set<string>();
		const out: { spouse: PersonCompact; year: number | null }[] = [];
		for (const m of spouses) {
			if (!m.spouse || seen.has(m.spouse.id)) continue;
			seen.add(m.spouse.id);
			out.push({ spouse: m.spouse, year: m.year });
		}
		return out;
	});

	let chipCount = $derived(spouseChips.length);
	// The carved notch shows at most 3 chips — the Task 2 carousel windows the rest — so
	// cap ALL notch geometry (width, height, clip-path, header padding) at 3. Without this
	// a 4+-spouse card (Michael HD3384) runs the notch, hence the whole card-top, off its
	// 925px frame. This is the geometry invariant the carousel build sits on top of.
	let notchChipCount = $derived(Math.min(chipCount, 3));
	let useCompact = $derived(notchChipCount >= 3);
	let chipWidth = $derived(useCompact ? CHIP_W_COMPACT : CHIP_W_NORMAL);
	let chipZoneHeight = $derived(useCompact ? CHIP_ZONE_HEIGHT_COMPACT : CHIP_ZONE_HEIGHT_NORMAL);

	let chipZoneWidth = $derived.by(() => {
		if (notchChipCount === 0) return 0;
		return notchChipCount * chipWidth + (notchChipCount - 1) * CHIP_GAP + CHIP_INSET;
	});

	// The FLAT silhouette: a plain rounded rectangle, no notch (4 rounded outer corners).
	// It's the resting shape when there are no chips, AND it's exposed as --flat-shape so a
	// card can morph to a COMPLETE solid rounded card while flying — the notch would otherwise
	// make the growing/shrinking cards animate around a corner cutout and read as a blur. The
	// page swaps to it via a .flat class during the transition (see +page.svelte). 8px rounding
	// is preserved, so the cards never square off mid-flight.
	const flatShape = `shape(
            from ${CORNER_R}px 0,
            line to calc(100% - ${CORNER_R}px) 0,
            curve to 100% ${CORNER_R}px with 100% 0,
            line to 100% calc(100% - ${CORNER_R}px),
            curve to calc(100% - ${CORNER_R}px) 100% with 100% 100%,
            line to ${CORNER_R}px 100%,
            curve to 0 calc(100% - ${CORNER_R}px) with 0 100%,
            line to 0 ${CORNER_R}px,
            curve to ${CORNER_R}px 0 with 0 0
        )`;

	/**
	 * THE ORBIT RULE'S SILHOUETTE — the card's own shape, inset, so the navy rule BENDS around the
	 * spouse notch instead of being deleted at it.
	 *
	 * The rule was an inset box-shadow, which cannot do this and never could: a shadow is drawn as a
	 * rectangular ring inset from the element's BOX, and the clip-path then erases everything outside
	 * the silhouette. In the notch region the ring is not bent, it is cut away — Sam: "it still fails to
	 * bend with the existing notch." No thickness or inset changes that; it is the technique.
	 *
	 * So the ring becomes a SHAPE, built by the same construction as `clipPath` below with one number
	 * threaded through it. Two things move in opposite directions and getting either backwards is what
	 * would make it look almost right:
	 *
	 *   THE OUTER EDGE comes IN by `d` on all four sides.
	 *   THE NOTCH BITE grows OUT by `d`, because the rule hugs the notch from INSIDE the card — so the
	 *   piece missing from the card is `d` larger as far as the rule is concerned.
	 *
	 * Corner radii shrink by `d` too, floored at 1: a radius smaller than its own inset would invert.
	 */
	function silhouette(d: number, notched = true): string {
		// CONVEX RADII SHRINK, CONCAVE RADII GROW — the rule for offsetting a path inward, and getting it
		// wrong is what put a hard point in the notch. Sam: "there's a sharp corner not rounded for the
		// stripe near the notch, especially the one in the middle of the notch with the corner facing
		// into the featured card."
		//
		// Every corner on this outline is convex (90° of card) except ONE: where the notch's left edge
		// meets its underside, the card wraps 270° around the cut. That corner is the inside of a bend,
		// so an inward offset opens it up rather than tightening it. Shrinking it along with the rest
		// drove it to the `max(1, …)` floor and it came out square.
		// ONE RADIUS FOR EVERY CORNER, and it is the CONCAVE one. Geometrically the convex corners want
		// CORNER_R − d (3px, 1px) so the rule runs parallel to the card's own 8px corner — which is what
		// they had, and Sam's verdict on seeing the two side by side was that the parallel ones look
		// pinched: "the rounded corner is good, but it's so much more rounded than the other corners. I
		// actually like the rounded corner degree you made in the notch, so maybe all stripe corners can
		// round to that degree."
		//
		// So correctness loses to the eye here, deliberately. The rule stops being an exact offset of the
		// card and becomes its own object with its own corner — which is also the more honest reading of
		// what it is: a rule PRINTED on the card, not a tracing of its edge.
		// EVEN WIDTH NEEDS CONCENTRIC CURVES, which is a constraint on the CENTRE and not on the radius.
		// Both `CORNER_R − d` (parallel, "pinched") and `CORNER_R + d` (rounder, what Sam then saw as
		// "ink smears with extra ink") get this wrong in opposite directions: with + d the outer curve's
		// centre lands 18px from the corner and the inner one's 24px, so the band is thin on the diagonal
		// and thick where it straightens out. That variation IS the smear.
		//
		// So the corner is defined by its CENTRE instead, one point both curves turn about, and each
		// radius falls out of its own inset. The band is then exactly 3px the whole way round by
		// construction rather than by luck. 14 is chosen for the look: it gives a 9px outer corner —
		// visibly rounder than the 3px parallel version Sam rejected, well short of the notch's 13.
		const CORNER_C = 14;
		const r = CORNER_C - d;
		// The concave corner keeps its own, larger radius — Sam picked that one by eye and it is the one
		// bend he asked to keep ("I actually like the rounded corner degree you made in the notch").
		const rc = CORNER_R + d;
		if (notchChipCount === 0 || !notched) {
			return `shape(
				from ${d + r}px ${d}px,
				line to calc(100% - ${d + r}px) ${d}px,
				curve to calc(100% - ${d}px) ${d + r}px with calc(100% - ${d}px) ${d}px,
				line to calc(100% - ${d}px) calc(100% - ${d + r}px),
				curve to calc(100% - ${d + r}px) calc(100% - ${d}px) with calc(100% - ${d}px) calc(100% - ${d}px),
				line to ${d + r}px calc(100% - ${d}px),
				curve to ${d}px calc(100% - ${d + r}px) with ${d}px calc(100% - ${d}px),
				line to ${d}px ${d + r}px,
				curve to ${d + r}px ${d}px with ${d}px ${d}px
			)`;
		}
		const cw = chipZoneWidth + d; // the bite is LARGER from inside — see above
		const ch = chipZoneHeight + d;
		return `shape(
			from ${d + r}px ${d}px,
			line to calc(100% - ${cw}px - ${r}px) ${d}px,
			curve to calc(100% - ${cw}px) ${d + r}px with calc(100% - ${cw}px) ${d}px,
			line to calc(100% - ${cw}px) calc(${ch}px - ${rc}px),
			curve to calc(100% - ${cw}px + ${rc}px) ${ch}px with calc(100% - ${cw}px) ${ch}px,
			line to calc(100% - ${d + r}px) ${ch}px,
			curve to calc(100% - ${d}px) calc(${ch}px + ${r}px) with calc(100% - ${d}px) ${ch}px,
			line to calc(100% - ${d}px) calc(100% - ${d + r}px),
			curve to calc(100% - ${d + r}px) calc(100% - ${d}px) with calc(100% - ${d}px) calc(100% - ${d}px),
			line to ${d + r}px calc(100% - ${d}px),
			curve to ${d}px calc(100% - ${d + r}px) with ${d}px calc(100% - ${d}px),
			line to ${d}px ${d + r}px,
			curve to ${d + r}px ${d}px with ${d}px ${d}px
		)`;
	}
	/**
	 * 5px of the card's own surface outside the rule; the rule is 3px; content starts at 8px.
	 *
	 * AND A FLAT PAIR, because the notch is not always real. Sam: "the stripe shouldn't be notched before
	 * the spouse card appears — there's a moment where it's just the full card before the spouse chip
	 * appears… so the stripe should be full around the card, and change into its notch shape only after
	 * the spouse notch is visible again."
	 *
	 * He is right and the card already agrees with him: `.flat` exists precisely because a notch cut into
	 * a card with nothing docked in it reads as damage rather than as a seat, so the card morphs to a
	 * complete rounded rectangle while it flies. The rule simply was not told. Keying off the same class
	 * means the two can never disagree about whether the notch is there — one signal, read twice.
	 */
	/**
	 * `settled`, NOT `.flat` — and the first attempt keyed off the wrong one. `.flat` is the class the
	 * page puts on a card while it flies, and it is NEVER APPLIED ON THIS PATH: measured across a whole
	 * ascension, the orbit card carried it for 0 frames, so the rule I gated on it could not fire once.
	 * The probe said so plainly and I read the second line of its output instead of the first.
	 *
	 * `settled` is already a prop here, is already what the card uses to know it is at rest, and is the
	 * same signal the spouse chips reveal on — so the rule takes its bite in the same beat the seat
	 * becomes real, which is exactly what Sam asked for: "the stripe should be full around the card, and
	 * change into its notch shape only after the spouse notch is visible again."
	 */
	const ringNotched = $derived(settled && notchChipCount > 0);
	// 3px -> 2.7px, taken off the INNERMOST edge (Sam), so the 5px of surface outside is untouched and
	// the rule simply retreats a third of a pixel further from the text.
	const ringOuter = $derived(silhouette(5, ringNotched));
	const ringInner = $derived(silhouette(7.2, ringNotched)); // 2.2px of rule (Sam), all of it inboard

	let clipPath = $derived.by(() => {
		const r = CORNER_R;
		// No chips → the flat silhouette IS the resting shape (also reused while flying).
		if (notchChipCount === 0) return flatShape;
		const cw = chipZoneWidth;
		const ch = chipZoneHeight;
		return `shape(
        from ${r}px 0,
        line to calc(100% - ${cw}px - ${r}px) 0,
        curve to calc(100% - ${cw}px) ${r}px with calc(100% - ${cw}px) 0,
        line to calc(100% - ${cw}px) calc(${ch}px - ${r}px),
        curve to calc(100% - ${cw}px + ${r}px) ${ch}px with calc(100% - ${cw}px) ${ch}px,
        line to calc(100% - ${r}px) ${ch}px,
        curve to 100% calc(${ch}px + ${r}px) with 100% ${ch}px,
        line to 100% calc(100% - ${r}px),
        curve to calc(100% - ${r}px) 100% with 100% 100%,
        line to ${r}px 100%,
        curve to 0 calc(100% - ${r}px) with 0 100%,
        line to 0 ${r}px,
        curve to ${r}px 0 with 0 0
    )`;
	});
</script>

<!-- Wrapper provides positioning context for chips as siblings of carved card.
     min-height keeps the card at CARD_TOP_H when there's no footer to extend it. -->
<div
	class="featured-card-wrap relative"
	style="
        width: {cardW}px;
        min-height: {cardTopH}px;
        filter:
            drop-shadow(0 4px 12px hsl(var(--shadow-ink) / var(--shadow-a1)))
            drop-shadow(0 1px 3px hsl(var(--shadow-ink) / var(--shadow-a2)));
    "
>
	<!-- The CARVED CARD: clip-path creates the notch silhouette.
	     No fixed height here — it grows naturally to fit card-top (CARD_TOP_H) + footer (auto). -->
	<article
		class="featured-card relative w-full bg-white"
		class:hooker-line={person.classification?.is_thomas_descendant}
		class:spouse-line={marriedIn}
		class:ee-line={person.classification?.is_easter_egg}
		class:prism={isPynchonKin(person.id)}
		class:orbit-card={orbit}
		class:founder-card={founderZone}
		style="clip-path: {clipPath}; --flat-shape: {flatShape}; --ring-outer: {ringOuter}; --ring-inner: {ringInner};"
	>
		<!-- Fixed-height TOP region: header + content area, always exactly CARD_TOP_H tall.
		     The header row is a FIXED height (HEADER_H) so the LOWER CONTENT — the photo / narrative /
		     RightColumn grid — begins at the same y on every card. This REVERSES the previous rule, which
		     auto-sized the header to hold a constant ~12px gap under the last text line and therefore let
		     the content start move 23px between a blurb card and a no-blurb one. Constant content start,
		     variable gap underneath. The dial lives in HEADER_H; there are no other height inputs here. -->
		<div
			class="card-top grid"
			style="height: {cardTopH}px; grid-template-rows: {HEADER_H}px minmax(0, 1fr);"
		>
			<div
				class="header min-w-0 px-[calc(24px*var(--stage-u,1))] pt-[calc(16px*var(--stage-u,1))] pb-[calc(12px*var(--stage-u,1))]"
				style="padding-right: {Math.round(notchChipCount > 0 ? chipZoneWidth + 16 * u : 24 * u)}px;"
			>
				<div class="name-block min-w-0" class:tight-stack={headerIsCrowded}>
					<!-- min-w-0 + [data-fit] inline span: shrinkToFit measures the wrapper's real
					     available width against the span's natural text width. Without min-w-0 up the
					     chain the wrapper grows to the text and nothing ever shrinks (the HD3384 blowup). -->
					<!-- nameFontClass (the per-person bio.display_font override) still wins where it is set;
					     everyone else gets NAME_FACE. -->
					<!-- nameFontClass (the per-person bio.display_font override) still wins where it is set;
					     everyone else gets NAME_FACE.
					     NO inline font-size here, deliberately: shrinkToFit writes node.style.fontSize
					     itself, and Svelte rewrites a `style={...}` attribute wholesale on any re-render —
					     the two would fight and a long name would snap back to full size mid-life. The size
					     is expressed ONLY as shrinkToFit's `max`, which is where it belongs, and the weight
					     rides a class. -->
					<h1
						class="w-full min-w-0 leading-tight text-inkblue {nameFontClass
							? 'font-medium'
							: NAME_WEIGHT_CLASS} {nameFontClass || NAME_FACE}"
						use:shrinkToFit={{
							max: t(nameFontClass ? 28 : NAME_SIZE),
							min: t(nameFontClass ? 20 : NAME_MIN),
							key: `${displayName}|${u}|${k}`
						}}
					>
						<span data-fit class="inline-block whitespace-nowrap"
							>{displayName}<span
								class="ml-2 align-middle font-mono text-[calc(14px*var(--type-k,1))] font-normal text-stone-400"
								>{person.id}</span
							></span
						>
					</h1>
					{#if allLabels.length > 0}
						{#each allLabels as label, i (i)}
							<!-- svelte-ignore element_invalid_self_closing_tag -->
							{#if label.includes(' & ')}
								<!-- Merged cousin-marriage line: full-size, shrink-to-fit so a long
								     "…Hooker Descendant & Wife of Hooker Descendant" stays one line. -->
								<div
									class="descent-line min-w-0 leading-tight font-medium {lineClass(i)}"
									use:shrinkToFit={{ max: t(14), min: t(10), key: `${label}|${u}|${k}` }}
								>
									<span data-fit class="inline-block whitespace-nowrap">{label}</span>
								</div>
							{:else if allLabels.length >= 2}
								<!-- Dual-descent (Hooker + Talcott) line: ~5% smaller than the ordinary line. Rare;
								     this guards the 4-line header height. CLAMPED as of Phase 2.75 for the reason
								     given on the ordinary branch below; the ceiling preserves the 5% relationship
								     and the floor sits proportionally under the ordinary one. -->
								<div
									class="descent-line min-w-0 leading-tight font-medium {lineClass(i)}"
									use:shrinkToFit={{ max: t(13), min: t(9.5), key: `${label}|${u}|${k}` }}
								>
									<span data-fit class="inline-block whitespace-nowrap">{label}</span>
								</div>
							{:else}
								<!-- Ordinary single descent / spouse-only / in-law line.
								
								     CLAMPED, ON SAM'S CALL (Aug 8): "the best thing to do is to put a clamp on the
								     font size for that title with a min and max just like the name above it." It was
								     STATIC text-sm, which is why "Eighth Generation Descendant of Thomas Hooker"
								     wrapped at 890px and put "Hooker" on a second line that the fixed HEADER_H then
								     hid under the content row. It was the ONE unclamped line in a header where every
								     other element already fits itself.
								
								     A DESCENT LINE IS THE WORST CASE FOR A FIXED SIZE, which is why this is the line
								     that broke rather than bad luck: its length is GENERATED, not authored. "Eighth
								     Generation Descendant of Thomas Hooker" is 46 characters and later generations
								     run longer, so no single size is right for every card — which is the definition
								     of a job for a clamp. The name above it has been clamped since long before this
								     for exactly the same reason.
								
								     Same range and same machinery as the merged '&' branch above, so all three
								     descent branches now behave identically and only their ceilings differ. -->
								<div
									class="descent-line min-w-0 leading-tight font-medium {lineClass(i)}"
									use:shrinkToFit={{ max: t(14), min: t(10), key: `${label}|${u}|${k}` }}
								>
									<span data-fit class="inline-block whitespace-nowrap">{label}</span>
								</div>
							{/if}
						{/each}
					{/if}
					{#if blurb}
						<!-- NOT clamped, and deliberately so (Sam, Aug 4): "let's not even clamp bio blurb, the
						     long ones just need to be cut — even with a three spouse notch all blurbs should
						     fit the existing space at the existing font size." The schema already agrees: 8
						     words maximum, parity rule v19, "null beats weak", and validate.py flags it as C8
						     debt. A blurb long enough to wrap is a DATA defect, and clamping it here would
						     hide the defect rather than surface it. The over-length worklist is
						     _review/blurb-over-length.tsv.
						     -mb-2 only in the crowded fixed-height variant (earns back a couple px for the
						     4th line); on auto-height common cards it would just eat the breathing gap. -->
						<div
							class="mt-0 font-source text-[calc(14px*var(--type-k,1))] leading-tight text-blue-900 opacity-60"
							class:-mb-2={headerIsCrowded}
						>
							{blurb}
						</div>
					{/if}
				</div>
			</div>

			<!-- Content row: minmax(0, 1fr) + overflow-hidden allows NB body expansion
			     without growing the row. Any overflow is clipped, keeping card height stable. -->
			<div
				class="content grid grid-cols-[23%_1fr_21%] overflow-hidden py-[calc(24px*var(--stage-u,1))] pr-[calc(12px*var(--stage-u,1))] pl-[calc(24px*var(--stage-u,1))]"
			>
				<!-- space-y: photo->vitals is the original 16 less 5% then a further 20% (15.2 -> 12.16);
					     .vitals block spacing is the original 10 less 5% (9.5). -->
				<div class="portrait-column relative space-y-[10.94px]">
					{#if photoUrl}
						<img
							src={portraitSrc}
							alt={person.bio?.display_name ?? person.name?.display_name ?? 'Portrait'}
							class="aspect-[3/4] w-full rounded-sm bg-stone-100 object-cover {photoPosition
								? ''
								: 'object-top'}"
							style={photoPosition ? `object-position: ${photoPosition}` : undefined}
							loading="eager"
							fetchpriority="high"
							onmouseenter={trackZoom}
							onmousemove={trackZoom}
							onmouseleave={closeZoom}
						/>
					{:else}
						<div class="aspect-[3/4] w-full rounded-sm bg-stone-100"></div>
					{/if}
					<div class="vitals space-y-[7.6px] pl-1">
						{#snippet vital(
							label: string,
							date: string,
							loc: string | null,
							mapUrl: string | null,
							age: { years: number; approx: boolean } | null = null
						)}
							<div>
								<div
									class="text-[calc(10px*var(--type-k,1))] font-semibold tracking-wider text-stone-500 uppercase"
								>
									{label}
								</div>
								<!-- The age rides the date line at a lighter weight so the DATE stays primary and the
								     derived figure reads as an annotation on it, not a second fact. -->
								<div
									class="font-opensans text-[calc(12.45px*var(--type-k,1))] leading-snug font-normal text-inkblue"
								>
									{date}{#if age}<span class="ml-1.5 font-normal opacity-70"
											>({age.approx ? '~' : ''}Age {age.years})</span
										>{/if}
								</div>
								{#if loc || mapUrl}
									<div
										class="mt-[0.5px] font-opensans text-[calc(12.08px*var(--type-k,1))] leading-snug font-light text-slate-600"
									>
										{loc ?? ''}{#if mapUrl}<a
												href={mapUrl}
												target="_blank"
												rel="noopener noreferrer"
												class="ml-1.5 align-baseline font-opensans text-[calc(9px*var(--type-k,1))] font-normal tracking-wider text-blue-700 uppercase hover:underline"
												>Map</a
											>{/if}
									</div>
								{/if}
							</div>
						{/snippet}
						{#if birthDate}{@render vital('Birth', birthDate, birthLocation, birthMapUrl)}{/if}
						{#if deathDate}{@render vital(
								'Death',
								deathDate,
								deathLocation,
								deathMapUrl,
								ageAtDeathValue
							)}{/if}
					</div>

					<!-- CONNECT TO THOMAS. Its ONLY gate is that the payload carries a chain: by construction
					     `pathsToThomas` is present exactly for Thomas descendants who are a grandchild or
					     deeper, so Thomas himself, his children, and everyone off the line are excluded with
					     no second predicate here to fall out of step with the bake.

					     ABSOLUTELY POSITIONED, and that is structural rather than styling. `.card-top` is
					     exactly CARD_TOP_H tall for every person (§28) — the CC blade is carved to that
					     height and DeckRiffle imports it — so an affordance taking part in the flow would
					     make the card's one constant depend on whether a person happens to be a descendant.
					     Out of flow it costs zero height and cannot.

					     MEASURED FIRST, because design §14.3 planned two 32px buttons here and predates the
					     fixed geometry. The column's real slack under the vitals is 43px typical and 27px at
					     its worst — Burr at 1280x720, whose vitals carry locations, map links and an age. So
					     ONE quiet button at ~26px fits with room to spare; TWO WOULD NOT FIT ANYWHERE, and
					     the connect-to-anyone affordance will need somewhere else to live.

					     INERT UNTIL `settled`, checked in the HANDLER rather than by withholding the button.
					     `flightLock` swallows navigation clicks, not this one, so mid-flight the control was
					     live and would have opened an overlay across a card still in the air. Gating the
					     RENDER would make it vanish and pop back on every arrival; gating the handler is what
					     `trackZoom` already does two elements above, for the same reason and in the same
					     words — during the morph the card is transform-scaled and is not yet itself.

					     BOTTOM-ANCHORED rather than hung under the vitals, so it lands in the same place on
					     every card. A living, non-notable person has their dates withheld entirely and 161px
					     of slack; Burr has 27px. Hung in flow, the control would wander half the column's
					     height between two cards. -->
					{#if pathsToThomas?.length}
						<!-- PERSONALISED, and shrunk to fit rather than truncated — design §14.3 wanted the name
						     on this button and the card's own `shrinkToFit` is how every other long string
						     here survives. `[data-fit]` is the span the action measures; the button cannot
						     grow to the text because it is positioned by left/right, so the measurement is
						     honest. -->
						<button
							type="button"
							class="connect-thomas"
							onclick={() => settled && openModal('connect-thomas')}
							use:shrinkToFit={{ max: t(10), min: t(7.2), key: `${firstName ?? ''}|${u}|${k}` }}
						>
							<span data-fit class="inline-block whitespace-nowrap"
								>Connect {firstName ? `${firstName} ` : ''}to Thomas</span
							>
						</button>
					{/if}
				</div>

				<div class="narrative min-h-0 min-w-0 overflow-hidden pr-4 pl-4">
					<div class="max-w-[60ch]">
						<NarrativeBlocks
							blocks={person.narrative_blocks ?? []}
							font={person.bio?.display_font}
						/>
					</div>
				</div>

				<!-- h-full + min-h-0: bound this grid cell to the (definite) .content row height so
				     RightColumn's own h-full resolves to a fixed height and its scroll-group actually
				     scrolls. Without min-h-0 the cell's default min-height:auto grows to the full stack
				     height, un-scrolling the column and pushing the burial pin below the fold. No
				     overflow-hidden here — it would clip the pin's intentional bottom-[-12px] overhang. -->
				<div class="h-full min-h-0">
					<RightColumn {person} {institutionsById} {burialCemetery} />
				</div>
			</div>
		</div>

		<!-- The cross connections are NO LONGER PART OF THIS CARD. They render as a separate blade that
		     emerges from beneath it (CrossConnectionsBlade, mounted by the page), which is what makes every
		     featured card exactly CARD_TOP_H tall — the old footer was the only thing that ever varied it.
		     `crossConnections` stays on the props purely so the page can hand it straight through. -->
	</article>

	<!-- Spouse chips are rendered by the PAGE (lifted out so chip and card are
	     peers for the crossfade — see DESIGN "Re-focus choreography"). This card
	     still CARVES the notch from chipCount; the page docks the chips into it. -->

	<!-- ── THE CROSS-CONNECTIONS BLADE ────────────────────────────────────────────────────────────
	     A PART OF THIS CARD, not a neighbour of it. It was briefly mounted by the page as a sibling
	     of the card, and that was wrong in the way that matters: it had to TRACK the card, so on a
	     vertical CC navigation it detached and flew its own path. The card is the knife's case and the
	     blade is a tool inside it — throw the knife off a cliff and the blade goes with it, because it
	     is nested in it, not following it. Living inside .featured-card-wrap, it inherits every
	     transform the flight applies to the card for free, and there is no tracking code at all.

	     ABSOLUTELY POSITIONED at the card's bottom edge on purpose: it must contribute NO layout
	     height. .featured-flight's rect is the flight's destination geometry, and a taller box would
	     rescale the whole chip→card morph (the card would render smaller than the chip it grows from).
	     z-index:-1 puts it behind the card, which is what makes "sheathed" mean genuinely hidden INSIDE
	     the case rather than faded out. The wrap's drop-shadow now outlines card and blade as ONE
	     silhouette, so there is no shadow seam between them — they are one object. -->
	<!-- THE TANG, SCALED — and it must resolve to the same number the blade uses, or a gap opens along
	     the seam between them. The blade computes `Math.round(BLADE_TANG * u)` from the same store, so
	     both round identically at every rung. -->
	<div
		class="cc-blade-mount"
		class:stowed
		style="top: calc(100% - {bladeTang}px);"
		bind:this={bladeMount}
	>
		<CrossConnectionsBlade {crossConnections} onheight={onbladeheight} />
	</div>
</div>

<!-- Main-portrait hover-zoom float — portaled to <body>, anchored above the cursor, pointer-events-none. -->
{#if zoom}
	<div
		use:portalZoom
		class="pointer-events-none fixed z-[9999]"
		style={zoomStyle(zoom)}
		aria-hidden="true"
	>
		<img
			src={zoom.src}
			alt={zoom.alt}
			class="block h-full w-full rounded-md object-cover {EMBLEM_PHOTO.has(person.id)
				? ''
				: 'shadow-[-18px_22px_48px_-12px_rgba(0,0,0,0.55)] ring-1 ring-black/10'}"
		/>
	</div>
{/if}

<style>
	/* The Pynchon descent line reads PURPLE INTO MAGENTA, so a card carrying two descents tells them apart
	   without being read — the Hooker line stays the house ink blue. A gradient rather than a flat colour
	   because the line it names is a spectrum; `background-clip: text` paints it through the glyphs.
	   Both hues are dark enough to hold their own as small bold type on white (the magenta end is the
	   lighter of the two, so it is placed at the END of the phrase where the eye has already committed). */
	/* Hunter green — the founder zone's ground, used as ink. See lineClass. */
	.descent-line.founder-descent {
		color: var(--color-foundergreen);
	}
	.descent-line.pynchon-descent {
		background-image: linear-gradient(100deg, #7c3aed 0%, #a21caf 45%, #c026d3 100%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	/* ── THE PRISM — one card's easter egg ─────────────────────────────────────────────────────────────
	   A photographed spectrum (Peter Steiner, Unsplash free licence — see docs/background-sources.md),
	   rotated to landscape because the card is 925×575 and cropping the portrait master throws the band
	   away. It is a BACKGROUND ON THE CARD ITSELF, and both halves of that matter:

	   NO EXTRA DOM. The first build used two absolutely positioned layers, which paint in the positioned
	   layer — i.e. ABOVE the card's in-flow content — so the effect ran across the photo and the text
	   instead of behind them. A background cannot do that.

	   THE FADE IS A WHITE VEIL, not `opacity`. A veil is a background layer of its own, so it tints the
	   image without touching anything the card draws, and it has no edge to give away. `--prism-fade` is
	   the ONLY dial: higher = paler. Nothing else here needs adjusting to change the strength.

	   (Five CSS attempts preceded this and every one was rejected as "stripes". Two of them genuinely were
	   — a repeating-linear-gradient is banding by construction and a linear-gradient MASK has a straight
	   edge by definition — but the last three never rendered at all: each new rule was inserted ABOVE the
	   original block, which then won on source order. If this ever looks unchanged after an edit, check
	   for a second `.featured-card.prism` rule further down before changing anything else.) */
	.featured-card.prism {
		--prism-fade: 0.45;
		background-image:
			linear-gradient(
				rgba(255, 255, 255, var(--prism-fade)),
				rgba(255, 255, 255, var(--prism-fade))
			),
			url('/textures/prism-card.jpg');
		background-size: cover, cover;
		background-position: center, center;
		background-repeat: no-repeat, no-repeat;
	}

	/* See the markup comment: no layout height, pinned to the card's bottom edge, behind the card. */
	.cc-blade-mount {
		position: absolute;
		/* `top` is set inline, pulled UP by the blade's tang so the hidden part starts inside the card. */
		left: 0;
		width: 100%;
		z-index: -1;
	}
	/* Inside the case. No opacity involved — the card is opaque and painted above this, so a blade
	   translated up by its own height is hidden wherever the card is, at whatever scale it is flying at. */
	.cc-blade-mount.stowed {
		transform: translateY(-100%);
	}

	.tight-stack > * {
		margin-top: -2px;
	}
	.tight-stack > *:first-child {
		margin-top: 0;
	}

	/* CONNECT TO THOMAS — the way into the descent ladder.

	   AN OBJECT AT A HEIGHT, not a set of styled states. ShuffleNotables' doctrine, inherited rather
	   than re-derived (Sam, on that button: "i'm trying to make it like a button, not you just taking
	   my literal instructions"). Rest sits on the paper, hover lifts it under the finger, press gives
	   back 60% of the lift and never settles below rest. Leave and release need no rules of their own —
	   they are what the cascade already does once hover and press are described as heights.

	   ONE BACKGROUND THE WHOLE WAY THROUGH, for the same reason: a real button does not change colour
	   when you approach it, it changes height. Lighting the surface as well would be saying the same
	   thing twice, and the second saying is the one that reads as a web widget.

	   THE WASH IS A TINT OF THE INK, NOT A PAPER. The card's ground is not one colour — line-status
	   shading gives a Thomas descendant a banana-cream sheet and leaves everyone else white (§29) — so
	   a button filled with a chosen cream would separate on one card and disappear on the other. A
	   4.5% wash of the ink is defined against whatever is behind it, so it sits correctly on both.

	   THE ZERO-SIZE REST SHADOW is not a stray declaration: CSS cannot interpolate FROM `none`, so a
	   shadow declared only on :hover pops into existence instead of growing.

	   `margin-top: 0` because the column carries `space-y-[10.94px]`, whose selector reaches every child
	   after the first — this one included. It cannot move a box positioned from `bottom`, but leaving it
	   would hand a silent 11px to whoever next gives this button a `top`. That is the family the design
	   doc keeps naming: a mechanism already claiming the property being edited. */
	.connect-thomas {
		/* The two heights as tokens, so nothing below repeats a literal. --press is always the SMALLER
		   give-back: 60% of the lift returned, settling at 40% of --lift. */
		--lift: -1.1px;
		--lift-shadow: 0 1.6px 3.2px rgba(30, 42, 71, 0.16);
		--press: -0.44px;
		--press-shadow: 0 0.66px 1.32px rgba(30, 42, 71, 0.14);

		position: absolute;
		/* FULL COLUMN WIDTH. It ran at 95% for a while, inset on the right so it stopped short of the
		   photo's edge — then long names needed the last 5% back and a per-button latch was built to hand
		   it over selectively. Sam's call is simpler and better: every button takes the whole width, so
		   there is no exception to maintain, no threshold to tune, and no latch that could oscillate.
		   `shrinkToFit` still handles the long names; it just does it against a wider box. */
		right: 0;
		bottom: 0;
		left: 0;
		margin-top: 0;
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: calc(7px * var(--stage-u, 1)) calc(8px * var(--stage-u, 1));
		/* Type rides --type-k and the box rides --stage-u — the vitals above already split them this
		   way, because the two scales are not the same dial. */
		font-family: var(--font-opensans, sans-serif);
		/* NO font-size here: `shrinkToFit` writes `node.style.fontSize` itself, and a CSS declaration
		   alongside it would be the value the action is trying to replace. Its ceiling is `t(10)`, which
		   is the size this rule used to state. */
		font-weight: 600;
		line-height: 1;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-inkblue);
		background: rgba(30, 42, 71, 0.045);
		border: 1px solid rgba(30, 42, 71, 0.18);
		border-radius: calc(3px * var(--stage-u, 1));
		cursor: pointer;
		transform: translateY(0);
		box-shadow: 0 0 0 rgba(30, 42, 71, 0);
		transition:
			transform 160ms cubic-bezier(0.33, 1, 0.68, 1),
			box-shadow 160ms cubic-bezier(0.33, 1, 0.68, 1),
			border-color 160ms ease-out;
	}
	.connect-thomas:hover {
		transform: translateY(var(--lift));
		box-shadow: var(--lift-shadow);
		border-color: rgba(30, 42, 71, 0.32);
	}
	.connect-thomas:active {
		transform: translateY(var(--press));
		box-shadow: var(--press-shadow);
	}
	.connect-thomas:focus-visible {
		outline: 2px solid var(--color-inkblue);
		outline-offset: 2px;
	}
	@media (prefers-reduced-motion: reduce) {
		.connect-thomas {
			transition: none;
		}
	}
</style>
