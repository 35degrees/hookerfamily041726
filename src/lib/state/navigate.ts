/**
 * Warm-path navigation — re-focus the featured person without a document
 * navigation (Step 2 of the page-transition work; DESIGN "Page transitions").
 *
 *   - focusPerson(slug): fetch + set featured state, then pushState the URL
 *     (SvelteKit shallow routing). No load re-run, no page unmount → the
 *     single-source `f` in +page.svelte just re-reads the new featured payload.
 *   - warmPersonLinks (action): delegates clicks on /<slug> person links to the
 *     warm path for plain left-clicks, while leaving the <a href> intact for SEO,
 *     cold loads, middle-click, cmd/ctrl-click, and new-tab.
 *
 * popstate (back/forward) is reconciled in +page.svelte by watching the URL.
 */
import { floatPause } from '#lib/state/slabFloat.svelte.js';
import { goto } from '$app/navigation';
import { personHref, slugFromPath } from '#lib/paths.js';
import { surfaceFromPath } from '#lib/surfaces.js';
import { prefersReducedMotion } from 'svelte/motion';
import { featured } from './featured.svelte';
import { publishCameraMove, type CameraMove } from './camera';
import { hideCcRoster, showCcRoster } from './ccRoster.svelte';
import { isFlightLocked, lockFlight } from './flightLock';
import { startArc } from './arc.svelte';
import { markAscent, clearAscent } from './ascension.svelte';
import { isArcMove, arcScaleMinFor, arcDurationMsFor } from '#lib/transitions/arc-math.js';
import { fetchFeatured } from '#lib/data/buildFeatured.js';
import { planSiblingNav, clearSiblingNavPlan } from './siblingNav';
import {
	releaseAllLandings,
	captureFlightOrigin,
	captureFlightKind,
	captureTierSpan,
	captureTierOpen,
	getFlightKind,
	captureClicked,
	capturePanDir,
	capturePivot,
	captureRects,
	clearFlightCaptures,
	spouseGrowMs,
	relativeGrowMs,
	resolveLateralDir,
	captureAscend,
	startEarlyCcExit,
	earlyExitRemaining
} from '#lib/transitions/flight.js';
import { isWebKit } from './engine';
import { motionOff } from './motion.svelte';
import { ascension } from './ascension.svelte';
import { stage } from './stage.svelte';
import { unlockFlight } from './flightLock';
import type { FeaturedData } from './featured.svelte';
import { captureFlight, abandonFlight, launch, releaseHeld } from '#lib/transitions/webkit/flight.js';

/** Fetch a person and set them as featured. No history change. False if not found. */
export async function loadFeatured(slug: string): Promise<boolean> {
	const data = await fetchFeatured(slug);
	if (!data) return false;
	featured.set(data);
	return true;
}

/**
 * WHERE THE READER IS, AS AN ADDRESS (Oct 26). The address bar, except that a pop-up's own address (/privacy,
 * /sources, /contact — surfaces.ts) stands for the card it is open over. Sam in Safari: "the previous card exits
 * but the new one never enters". A Safari CC sends the old card out FIRST and checks, before letting the new
 * one in, that the address has not changed under it (focusAfterEarlyExit: "Back or forward during the exit took
 * the page somewhere else") — and an author link in Sources starts that flight at /sources, which closing the
 * pop-up then re-addresses to the card. Read raw, that looked like a Back: the arrival was abandoned with the
 * old card already gone. Every "has the reader moved?" test reads this instead.
 */
export function readerAddress(): string {
	const path = window.location.pathname;
	const slug = surfaceFromPath(path) ? featured.current?.person.slug : null;
	return slug ? personHref(slug) : path;
}

/** Warm-path re-focus: set featured state, then pushState the URL (no document nav). */
export async function focusPerson(slug: string): Promise<void> {
	const data = await fetchFeatured(slug);
	if (!data) {
		// Unknown/stale slug — fall back to a real navigation so the 404/redirect path runs.
		window.location.href = personHref(slug);
		return;
	}
	focusWith(data, slug);
}

/**
 * SAFARI: A CC's NEXT BOARD IS BUILT ONCE THE LEAVING CARD IS GONE (Oct 19). Sam: the card leaving out the
 * left edge "like a jeep offroading… over rocks". Filmed in his Safari, 10 takes each: the exit itself already
 * runs on the compositor and is clean, but in half the takes the whole page froze for 50–230ms holes at a time
 * while the next person's board was built and first drawn under it (5 of 10 takes, ~1.8s frozen in all). Built
 * after the card has left (startEarlyCcExit knows to the frame when that is), 1 of 10, one 50ms hole. Nothing
 * of the next person is on screen until then: the roster is cut at the click and the arriving card waits for
 * car 1 to be gone plus the empty beat, counted from when it really left (flight.ts earlyExitClock), so it
 * lands when it did. The payload is fetched now, while the card leaves. Without an early exit (Chrome, arcs,
 * the zones) this is focusPerson, unchanged.
 */
export function focusAfterEarlyExit(slug: string): Promise<void> {
	const wait = earlyExitRemaining();
	if (wait === null) return focusPerson(slug);
	const from = readerAddress();
	const ready = fetchFeatured(slug).catch(() => null);
	// The rail moves at the payload, as it did when the board was built then (featured.svelte.ts forRail).
	void ready.then((data) => {
		if (data && readerAddress() === from) featured.setAhead(data);
	});
	return new Promise((resolve) =>
		setTimeout(() => {
			// Back or forward during the exit took the page somewhere else: that navigation wins. (A pop-up's
			// address closing back to its card is not somewhere else — readerAddress.)
			if (readerAddress() !== from) return resolve();
			void ready.then(async (data) => {
				if (readerAddress() !== from) return;
				if (data) focusWith(data, slug);
				else await focusPerson(slug); // its not-found path (a real navigation)
			}).then(resolve);
		}, wait)
	);
}

/** focusPerson's swap, with the payload already in hand (the WebKit engine's fallback reuses it). */
function focusWith(data: FeaturedData, slug: string): void {
	// §19 SEAM — the one instant where the INCOMING sibling list is in hand and the OUTGOING panel is
	// still on screen with its geometry intact. Plan the in-place mutation here, synchronously, so the
	// demote's clock (computed at outro init, before any effect runs) and the panel's scroll target
	// (computed in an effect, after) read the same settled answer. Doing it after the swap could serve
	// neither: the strip would already be gliding, so a seat's measured rect would be an animating
	// value rather than the resting one Sam's ruling requires the traveller to target.
	// Not a sibling flight → clear, so a stale plan can never be read by the next navigation.
	if (getFlightKind() === 'sibling' && !prefersReducedMotion.current) {
		planSiblingNav(data.neighborhood, featured.current?.person.id ?? null);
	} else {
		clearSiblingNavPlan();
	}
	featured.set(data);
	// SvelteKit 3: shallow routing is goto(..., { shallow: true }) — pushState is deprecated. A new history
	// entry exactly as before, no load re-run; `void` because it returns a promise this path has never needed to await.
	void goto(personHref(slug), { shallow: true });
	// Clear the per-navigation flight captures one frame later — after the transition flush has
	// read them — so a subsequent back/forward nav (which captures nothing) can't reuse stale data.
	requestAnimationFrame(() => clearFlightCaptures());
}

// ── THE WEBKIT ENGINE'S FLIGHTS (Kennedy port, Oct 2026; src/lib/transitions/webkit/) ─────────────────────
// In Safari (every WebKit engine), a plain parent, child, sibling or spouse promotion on the stage is flown by
// the WebKit engine: the board measured once, every motion handed to the compositor whole, nothing run per
// frame. Everything else keeps Hooker's own flights, in Safari too, until the engine has been built and
// filmed for it: cross-connections and the deck, the orbit and founder zones, the grandparent and grandchild
// tiers, a card with more than three spouses (the carousel), the phone, reduced motion. Chrome never reaches
// any of this: isWebKit() is the first test.

/** The page's landing signals, registered by +page.svelte (Hooker's onIncomingStart / onIncomingLand do the
 *  same for its own flights). */
type EngineHooks = { onSwap: (relation: string) => void; onLanded: () => void };
let engineHooks: EngineHooks | null = null;
export function registerEngineHooks(h: EngineHooks): () => void {
	engineHooks = h;
	return () => {
		if (engineHooks === h) engineHooks = null;
	};
}

const ENGINE_RELATIONS = new Set(['parent', 'child', 'sibling', 'spouse']);
/** More spouses than this and the notch is a carousel, which the engine does not fly yet. */
const NOTCH_WINDOW = 3;

/** Can the WebKit engine fly this click? Asked at the click, before anything has changed. */
function engineCanFly(anchor: HTMLElement, relation: string | null): boolean {
	if (!isWebKit() || prefersReducedMotion.current || motionOff() || !engineHooks) return false;
	if (!relation || !ENGINE_RELATIONS.has(relation) || anchor.dataset.cc === 'true') return false;
	if (!anchor.closest('.page-container')) return false; // the rail, search, bookmarks: not a chip
	if (relation !== 'sibling' && !anchor.closest('[data-flight-id]')) return false;
	if (anchor.closest('[data-tier-span]')) return false;
	if (document.querySelector('.grandparent-tier, .grandchild-tier, .child-focus, .child-settling')) return false;
	if (ascension.active || featured.current?.orbit === true || stage.phone) return false;
	if (document.querySelectorAll('.spouse-notch [data-flight-id]').length > NOTCH_WINDOW) return false;
	return true;
}

/**
 * THE HOVER'S PAYLOAD, KEPT FOR THE CLICK (Safari only; Sam, Oct 17: "a full beat" before every flight). The
 * hover already asks for the next person's file (SvelteKit's hover preload), but only into the HTTP cache, so
 * the click fetched and built it again (roadmap §58.3b's "fetched and built twice"). Here the hover's built
 * payload is kept, and the click starts from it. Bounded, oldest first; a file never changes within a visit.
 */
const hovered = new Map<string, Promise<FeaturedData | null>>();
const HOVERED_MAX = 60;
function hoverPayload(slug: string): Promise<FeaturedData | null> {
	let p = hovered.get(slug);
	if (!p) {
		p = fetchFeatured(slug).catch(() => null);
		hovered.set(slug, p);
		while (hovered.size > HOVERED_MAX) hovered.delete(hovered.keys().next().value as string);
	}
	return p;
}

/** The engine's half of a click: the board was captured at the click; get the next person ready, then fly. */
async function engineFocus(slug: string, relation: string): Promise<void> {
	const data = await hoverPayload(slug);
	if (!data) {
		abandonFlight();
		unlockFlight();
		window.location.href = personHref(slug);
		return;
	}
	// The arriving card brings a carousel: that flight is still Hooker's. Its captures were all taken at the
	// click as well, so it simply carries on from here.
	if ((data.neighborhood.spouses?.length ?? 0) > NOTCH_WINDOW || !engineHooks) {
		abandonFlight();
		releaseHeld();
		focusWith(data, slug);
		return;
	}
	// NO WAIT FOR PHOTOS. Kennedy decoded the arriving board's photos here (capped at 400ms), paired with
	// preparing every neighbour on landing. Hooker's doctrine is the neighbourhood preload (photo.ts
	// preloadNeighborhood): the next board's photos are already warmed before the click, so waiting here only
	// added lag (Sam: "a beat or two" after every click; ~100ms measured in Safari).
	// §19: a sibling promotion lands the old card in the sibling panel; its seat is planned now, while the
	// outgoing panel is still on screen (as focusPerson does).
	if (relation === 'sibling') planSiblingNav(data.neighborhood, featured.current?.person.id ?? null);
	else clearSiblingNavPlan();
	const hooks = engineHooks;
	launch(
		() => {
			hooks.onSwap(relation);
			featured.set(data);
			void goto(personHref(slug), { shallow: true });
		},
		{
			onLanded: () => {
				// Hooker's per-navigation captures die at the landing, not a frame after the swap: the §19 sibling
				// plan is one of them, and the engine reads it when it measures the board (the frame after the
				// settle frame). Cleared a frame early, the leaving card never found its sibling seat and faded in
				// place (Sam: "you skipped the featured card demotion to the sibling menu").
				clearFlightCaptures();
				captureFlightOrigin(null);
				hooks.onLanded();
			},
			onReleased: () => unlockFlight()
		}
	);
}

const isModified = (e: MouseEvent) => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

/**
 * Svelte action: delegate clicks within `node` to the warm path when they land on
 * an internal /<slug> person link. Plain left-clicks re-focus in place; everything
 * else (modified clicks, middle-click, target=_blank, download, non-person links)
 * falls through to the browser / SvelteKit default.
 */
export function warmPersonLinks(node: HTMLElement) {
	function onClick(event: MouseEvent) {
		if (event.defaultPrevented || event.button !== 0 || isModified(event)) return;
		const anchor = (event.target as Element | null)?.closest('a');
		if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
		const href = anchor.getAttribute('href');
		// slugFromPath, never a pattern of our own: a person URL is a ROOT path now, and /table or /api
		// are root paths too. One reader, in $lib/paths.ts, knows which root names are not people.
		const targetSlug = href ? slugFromPath(href) : null;
		if (!targetSlug) return; // not an internal person link — leave it to the browser
		// FLIGHT LOCK: a warm nav is in progress (a card is mid-flight, its roster not yet extended). Swallow
		// this click entirely — no overlapping flight, no nav off a card the user can't yet read. Released when
		// the incoming card LANDS with its chips out (+page's landing effect → unlockFlight).
		if (isFlightLocked()) {
			event.preventDefault();
			return;
		}
		// THE ZONE'S FLOAT GOES FLAT FIRST (slabFloat.svelte.ts): a tilted `.page-container` would re-base
		// every rect captured below and become the containing block for the flight's fixed pins. It cancels
		// the drift synchronously, so everything measured in this handler is flat.
		floatPause();
		// ...and any card held at its landing (Safari, flight.ts holdLanding) is released before measuring.
		releaseAllLandings();
		// WHICH ENGINE FLIES THIS CLICK (WebKit only; see engineCanFly). Decided now, before anything moves.
		// Any other flight first lets go of the frames the engine holds at rest, so Hooker's own transitions
		// and classes own those chips again (webkit/flight.ts releaseHeld).
		const engine = engineCanFly(anchor as HTMLElement, anchor.getAttribute('data-relation'));
		if (!engine) releaseHeld();
		// SLICE 3 (Phase 7): a sibling chip is now a WARM flight — kind 'sibling'. The hero grows from the
		// chip rect (with settle, like a relative promotion); the old card DEPARTS via the CC path (whole
		// card, opposite lateral vector, no chip-face, no settle) because the old focus has no destination
		// box on the sibling's page (a demote-into-box would ghost — the July-12 flash condition). The
		// laterality is graph-true: kind 'sibling' + relationClass 'collateral' + the sibling's captured t.
		event.preventDefault();
		// Lock immediately: this nav starts a flight, and no further nav click is honored until it lands with
		// its chips extended. Reduced motion has no flight (instant swap) → no lock. Safety-timed regardless.
		if (!prefersReducedMotion.current) lockFlight();
		const isSibling = anchor.getAttribute('data-relation') === 'sibling';
		// Capture the clicked box's rect at CLICK time (outside any reactive effect) so the
		// card flies from its true on-screen position before any state change or reflow.
		captureFlightOrigin(anchor.getBoundingClientRect());
		// Tag the flight kind so the card picks the right speed: a clicked spouse chip is a
		// brisk in-corner swap; everything else (parent/child boxes, cross-links) travels at
		// the near-original parent/child speed.
		const relation = anchor.getAttribute('data-relation');
		const ccNav = (anchor as HTMLElement).dataset.cc === 'true';
		captureFlightKind(
			ccNav ? 'cc' : isSibling ? 'sibling' : relation === 'spouse' ? 'spouse' : 'relative'
		);
		// HOW MANY TIERS THIS CLICK CROSSES. A chip in the hover-revealed grandparent row is two
		// generations up, so the whole scene pans two pitches, not one. The tier states the fact on its own
		// block (data-tier-span="2") and this reads it off the ancestor chain — the DOM already knows which
		// tier a chip is in, so nothing is re-derived from the graph and nothing can disagree. Absent → 1,
		// which is every ordinary parent/child/spouse/sibling/CC click. MUST run after captureFlightKind,
		// which resets the span for the new navigation.
		captureTierSpan(Number(anchor.closest('[data-tier-span]')?.getAttribute('data-tier-span')) || 1);
		// AND WHETHER THE TIER IS ON SCREEN AT ALL, which is a different question: it closes on ANY
		// navigation made while it is open, so a parent or child click gets the same 145px layout shift
		// while crossing only one tier. Every FLIP measured this frame is therefore one pitch off where it
		// will actually rest, and anything derived from that delta has to know (see pendingCollapse).
		// OCCUPIES LAYOUT, not merely EXISTS — and the difference is a whole tier of displacement. After a
		// tier navigation the block stays mounted at `display: none` for as long as its chips take to outro
		// (~500ms, and Svelte will not remove a block until every outro inside it finishes). A presence test
		// therefore answers "yes" to a navigation made in that window, and every FLIP on that flight gets a
		// 145px correction for a collapse that is not coming — the whole stage displaced one tier and
		// snapped back. Height is the honest question: a collapsed block occupies nothing.
		const tierEl = document.querySelector('.grandparent-tier');
		captureTierOpen(!!tierEl && tierEl.getBoundingClientRect().height > 1);
		// BUG 1: remember which box was clicked so flyOut keeps it invisible — it's becoming the
		// featured card via the morph, and a second visible copy is the ghost. (No imperative hide
		// here: the clicked chip stays VISIBLE through the fetch, then the growFrom card — which
		// starts exactly on its rect, z-index above it — covers its spot, and flyOut takes it
		// invisible the same frame. Hiding it at click instead left its spot blank during the fetch.)
		captureClicked(anchor.closest('[data-flight-id]')?.getAttribute('data-flight-id') ?? null);
		// PIVOT: the focus we're LEAVING becomes a relative of the new focus; its box is where the
		// demoted card lands. Captured so the reveal can hold THAT box until landing while every
		// other incoming box reveals early (closing the bare-screen gap).
		capturePivot(featured.current?.person.id ?? null);
		// BUG 2: the clicked relation sets the whole scene's pan direction (parent→down, child→up,
		// spouse→lateral) — all leaving relatives flow that one way as the generations pan.
		capturePanDir(relation === 'parent' ? 'down' : relation === 'child' ? 'up' : 'lateral');
		// BUG 3: snapshot every relative box's rect NOW — before focusPerson changes state and the
		// rows reflow — so each leaver can pin itself out of flow at its true pre-reflow position.
		// DOCUMENT-SCOPED, not `node`-scoped, and that is what lets this action be mounted somewhere other
		// than the stage. The flight boxes live in .page-container wherever the click came from, so a
		// delegation root that does not contain them (the timeline rail, whose bars are now person links)
		// would otherwise capture an EMPTY rect list and every leaver would fail to pin at its pre-reflow
		// position. ccFlyTo has always done exactly this for the same reason; the two paths now agree.
		// Identical behaviour for stage clicks: .page-container holds every [data-flight-id] there is.
		captureRects(document.querySelectorAll('[data-flight-id]'));

		// CAMERA STORE (Phase 3a Block 2): publish the move HERE — synchronous with the captures above,
		// before focusPerson mutates state. from = the departing featured's table coords; to = the
		// clicked box's (surfaced as data-tx/data-ty from its compact); screenVector = clicked box →
		// featured slot displacement (the direction the hero travels). No subscribers yet.
		const box = anchor.closest('[data-flight-id]') as HTMLElement | null;
		const slot = document.querySelector('.featured-slot');
		const oc = anchor.getBoundingClientRect();
		const dr = slot?.getBoundingClientRect();
		// A CC link (data-cc) is a NON-CHIP navigation → the directional arrival class (kind 'cc'). Its
		// `to` comes from the anchor's own data-tx/ty (baked from the CC target's seat), not a flight box.
		const isCC = (anchor as HTMLElement).dataset.cc === 'true';
		const kind = isCC ? 'cc' : isSibling ? 'sibling' : relation === 'spouse' ? 'spouse' : 'relative';
		const rcAttr = (anchor as HTMLElement).dataset.relationClass;
		// Siblings are collateral (adjacent seats, same generation) → the CC departure reads the lateral
		// vector from t (Δy≈0). Chip navs (spouse/parent/child) keep relationClass null.
		const relationClass = isCC ? (rcAttr === 'direct' ? 'direct' : 'collateral') : isSibling ? 'collateral' : null;
		const screenVector = dr
			? {
					dx: dr.left + dr.width / 2 - (oc.left + oc.width / 2),
					dy: dr.top + dr.height / 2 - (oc.top + oc.height / 2)
				}
			: { dx: 0, dy: 0 };
		const distance = Math.hypot(screenVector.dx, screenVector.dy);
		const numOr = (v: string | undefined) => (v != null && v !== '' && v !== 'null' ? Number(v) : null);
		// A sibling chip has no flight-id box, so its seat t is on the anchor itself (like a CC link).
		const src = isCC || isSibling ? (anchor as HTMLElement) : box;
		const to =
			src && numOr(src.dataset.tx) != null
				? { x: Number(src.dataset.tx), y: numOr(src.dataset.ty) }
				: null;
		const ft = featured.current?.person?.t;
		const from = ft ? { x: ft.x, y: ft.y } : null;
		// DECK direction: the kinship generation gap, baked onto the CC anchor (see regenerate genDelta).
		// Siblings are same-generation (adjacent seats) → 0 → lateral. Chip navs carry none (not a deck flight).
		const genDelta = isCC ? numOr((anchor as HTMLElement).dataset.genDelta) : isSibling ? 0 : null;
		// DECK same-line test: parent-graph edges to the nearest shared ancestor, baked per CC (see
		// regenerate kinDistance). Absent on the anchor = no shared ancestor within the cap → far/orbit.
		// Siblings share both parents (distance 2), but their genDelta is 0, so they ride lateral regardless.
		const kinDistance = isCC ? numOr((anchor as HTMLElement).dataset.kinDistance) : null;
		// THE ASCENSION (roadmap §40) — does this navigation CROSS the orbit boundary? Resolved here, in
		// the same frame as every other capture, because that is the only instant where BOTH sides are
		// known: the target's orbit-ness rides the anchor (data-orbit, baked per CC row), and the source's
		// is the featured person we are still standing on. One frame later the payload has swapped and the
		// question cannot be asked at all.
		//
		// A DELTA. Equal on both sides — tree→tree, or a move WITHIN an orbit component — yields null and
		// nothing about the flight changes, which is what keeps Lincoln's sub-lineage free.
		// ONLY A CROSS-CONNECTION CAN CROSS THE BOUNDARY, and this gate is not a precaution — it is the
		// definition. A component is a maximal set of people joined by parent/child/spouse edges, so a
		// FAMILY chip can never leave one: the chip exists because the edge exists, and the edge is what
		// put both people in the same component. Only a CC reaches across.
		//
		// LEFT UNGATED IT CORRUPTED A CORE TRANSITION, which is the whole reason this comment is long.
		// `data-orbit` is baked onto CC links only, so a spouse chip inside the zone reported
		// `toOrbit = false` against a `fromOrbit = true`, the delta came out as −1, and an ordinary spouse
		// promotion was handed the ascension's 980ms depth flight. Sam, from inside Jefferson: "I click
		// the spouse chip and the speed of spouse chip promotion to Featured Card is molasses… everything
		// has changed about that very core transition." It also ran clearAscent(), so the X went dead in
		// the same click.
		//
		// THE SHAPE OF THE MISTAKE IS WORTH MORE THAN THE FIX: an ABSENT attribute was read as a
		// meaningful `false`. Every other flight input here is read the same way (`dataset.cc === 'true'`,
		// `dataset.relationClass`), but those are only ever consulted on links that carry them. This one
		// was consulted on every anchor in the app.
		//
		// THREE ALTITUDES, NOT TWO (Sam, 100526): the line, the green FOUNDER zone, the midnight ORBIT zone.
		// "Imagine the Founder zone and orbit zones are in different stratospheres above the earth, so a
		// Hartford founder can't move laterally to an orbit." So the delta is between ZONES, not between
		// orbit-or-not: founder↔orbit goes UP again (the same flight as entering from the line — "the
		// Hartford founder card recedes into the background and the orbit comes in from the front"), while
		// founder→founder and orbit→orbit (Lincoln → Mark Twain) stay lateral, and ONLY a link to a line
		// person brings either zone back DOWN. The zone is read exactly as the card paints it:
		// FeaturedCard's founderZone = orbit && (tagged || married to a founder). The same "absent is not
		// false" rule as above: `data-founder` is only ever consulted on a link that also says data-orbit.
		const isFamilyChip = !isCC;
		const el = anchor as HTMLElement;
		type Zone = 'line' | 'founder' | 'orbit';
		const toZone: Zone =
			el.dataset.orbit !== 'true' ? 'line' : el.dataset.founder === 'true' ? 'founder' : 'orbit';
		const cur = featured.current;
		const curFounder =
			cur?.founderSpouse === true ||
			(cur?.person?.id !== 'H00001' && (cur?.person?.tags ?? []).includes('hartford_founder'));
		const fromZone: Zone = cur?.orbit !== true ? 'line' : curFounder ? 'founder' : 'orbit';
		const ascend = isFamilyChip ? null : toZone === fromZone ? null : toZone === 'line' ? -1 : 1;
		// The door, remembered on the way IN FROM THE LINE only — a single slot, never a stack (see
		// ascension.svelte.ts). Going up again (founder → orbit) must NOT overwrite it: the X still means
		// "back to the line card I started from", in one descent, not two (Sam, 100526).
		if (ascend === 1 && fromZone === 'line') {
			markAscent(slugFromPath(readerAddress()) ?? '');
		} else if (ascend === -1) {
			clearAscent();
		}
		if (ascend) captureAscend(ascend);
		// duration reuses flight.ts's per-kind curve directly (single source of truth — no drift; the
		// published value is informational metadata, the real flight clock lives in growFrom).
		const duration = kind === 'spouse' ? spouseGrowMs(distance) : relativeGrowMs(distance);
		// ALTITUDE ARC: a FAR COLLATERAL CC pulls the camera back (scaleMin) to reveal the real table, then
		// descends. Publish scaleMin so the card + substrate read it; start the shared arc clock. Direct dives
		// and short collateral hops stay flat (scaleMin null). Reduced motion never arcs.
		const provisional = { from, to, screenVector, distance, duration, easing: 'cubicOut', kind, relationClass, genDelta, kinDistance, ascend, seq: 0 } as CameraMove;
		const arc = !prefersReducedMotion.current && isArcMove(provisional);
		const scaleMin = arc ? arcScaleMinFor(provisional) : null;
		// DECK lateral direction: resolve the ping-pong memory ONCE here, before the flight reads deckDirFor.
		// Fresh lateral CC → exit left; clicking the reciprocal link straight back → flip; anything else resets.
		// (Vertical CCs self-skip inside — they use the gen sign, not this memory.)
		if (isCC) {
			const source = slugFromPath(readerAddress()) ?? '';
			resolveLateralDir(provisional, source, targetSlug);
		}
		publishCameraMove({ from, to, screenVector, distance, duration, easing: 'cubicOut', kind, relationClass, genDelta, kinDistance, ascend, scaleMin });
		// The arc clock is started at the STATE SWAP (below), not here — so it shares its time origin with the
		// card + substrate transitions that mount then, guaranteeing one clock (no fetch-time offset).
		const arcFrom = from && to ? { x: from.x, y: from.y ?? to.y ?? 0 } : null;
		const arcTo = from && to ? { x: to.x, y: to.y ?? from.y ?? 0 } : null;
		const arcDuration = arcDurationMsFor(provisional);

		const slug = targetSlug;
		// HARD CUT → FLY (item A): a CC arrival removes the roster THIS frame — the same frame the flight
		// origin was captured above — no beat, no fade. The lone card launches; the incoming roster is held
		// pending and unfurls at landing. Chip navs (and reduced motion) never cut. Restored once the flight
		// has taken over (one frame after the state swap) so the NEW roster is display-able but still pending.
		if (isCC && !prefersReducedMotion.current) {
			hideCcRoster();
			// SAFARI: a lateral CC's leaving card starts its exit NOW, on the compositor, while the next card is
			// fetched (flight.ts startEarlyCcExit; it checks WebKit, lateral and non-arc itself). Not in the zones,
			// whose cards float and recede on flights of their own.
			if (!arc && !ascend && !ascension.active && featured.current?.orbit !== true) startEarlyCcExit();
			void focusAfterEarlyExit(slug).then(() => {
				if (arc && arcFrom && arcTo) startArc({ from: arcFrom, to: arcTo, scaleMin: scaleMin as number, duration: arcDuration });
				requestAnimationFrame(() => showCcRoster());
			});
			return;
		}
		// THE WEBKIT ENGINE: Hooker's captures above have all been taken (the camera has its move, and a fallback
	// to Hooker's flight can carry on from them); the engine takes its own snapshot of the board now.
	if (engine && relation && captureFlight(anchor as HTMLElement, featured.current?.person.id ?? null)) {
		void engineFocus(slug, relation);
		return;
	}
	if (engine) releaseHeld();
	void focusPerson(slug);
	}
	// Safari only: a hovered chip's payload is fetched and built ahead of its click (hoverPayload).
	function onPointerOver(event: PointerEvent) {
		const a = (event.target as Element | null)?.closest('a');
		const slug = a ? slugFromPath(a.getAttribute('href') ?? '') : null;
		if (slug && a?.hasAttribute('data-relation')) void hoverPayload(slug);
	}
	const webkit = isWebKit();
	node.addEventListener('click', onClick);
	if (webkit) node.addEventListener('pointerover', onPointerOver);
	return {
		destroy: () => {
			node.removeEventListener('click', onClick);
			if (webkit) node.removeEventListener('pointerover', onPointerOver);
		}
	};
}
