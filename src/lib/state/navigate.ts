/**
 * Warm-path navigation — re-focus the featured person without a document
 * navigation (Step 2 of the page-transition work; DESIGN "Page transitions").
 *
 *   - focusPerson(slug): fetch + set featured state, then pushState the URL
 *     (SvelteKit shallow routing). No load re-run, no page unmount → the
 *     single-source `f` in +page.svelte just re-reads the new featured payload.
 *   - warmPersonLinks (action): delegates clicks on /person/<slug> links to the
 *     warm path for plain left-clicks, while leaving the <a href> intact for SEO,
 *     cold loads, middle-click, cmd/ctrl-click, and new-tab.
 *
 * popstate (back/forward) is reconciled in +page.svelte by watching the URL.
 */
import { pushState } from '$app/navigation';
import { prefersReducedMotion } from 'svelte/motion';
import { featured } from './featured.svelte';
import { publishCameraMove, type CameraMove } from './camera';
import { hideCcRoster, showCcRoster } from './ccRoster.svelte';
import { isFlightLocked, lockFlight } from './flightLock';
import { startArc } from './arc.svelte';
import { markAscent, clearAscent } from './ascension.svelte';
import { isArcMove, arcScaleMinFor, arcDurationMsFor } from '$lib/transitions/arc-math';
import { fetchFeatured } from '$lib/data/buildFeatured';
import { planSiblingNav, clearSiblingNavPlan } from './siblingNav';
import {
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
	captureAscend
} from '$lib/transitions/flight';

/** Fetch a person and set them as featured. No history change. False if not found. */
export async function loadFeatured(slug: string): Promise<boolean> {
	const data = await fetchFeatured(slug);
	if (!data) return false;
	featured.set(data);
	return true;
}

/** Warm-path re-focus: set featured state, then pushState the URL (no document nav). */
export async function focusPerson(slug: string): Promise<void> {
	const data = await fetchFeatured(slug);
	if (!data) {
		// Unknown/stale slug — fall back to a real navigation so the 404/redirect path runs.
		window.location.href = `/person/${slug}`;
		return;
	}
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
	pushState(`/person/${slug}`, {});
	// Clear the per-navigation flight captures one frame later — after the transition flush has
	// read them — so a subsequent back/forward nav (which captures nothing) can't reuse stale data.
	requestAnimationFrame(() => clearFlightCaptures());
}

const isModified = (e: MouseEvent) => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

/**
 * Svelte action: delegate clicks within `node` to the warm path when they land on
 * an internal /person/<slug> link. Plain left-clicks re-focus in place; everything
 * else (modified clicks, middle-click, target=_blank, download, non-person links)
 * falls through to the browser / SvelteKit default.
 */
export function warmPersonLinks(node: HTMLElement) {
	function onClick(event: MouseEvent) {
		if (event.defaultPrevented || event.button !== 0 || isModified(event)) return;
		const anchor = (event.target as Element | null)?.closest('a');
		if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
		const href = anchor.getAttribute('href');
		const match = href?.match(/^\/person\/([^/?#]+)$/);
		if (!match) return; // not an internal person link — leave it to the browser
		// FLIGHT LOCK: a warm nav is in progress (a card is mid-flight, its roster not yet extended). Swallow
		// this click entirely — no overlapping flight, no nav off a card the user can't yet read. Released when
		// the incoming card LANDS with its chips out (+page's landing effect → unlockFlight).
		if (isFlightLocked()) {
			event.preventDefault();
			return;
		}
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
		const isFamilyChip = !isCC;
		const toOrbit = (anchor as HTMLElement).dataset.orbit === 'true';
		const fromOrbit = featured.current?.orbit === true;
		const ascend = isFamilyChip ? null : toOrbit === fromOrbit ? null : toOrbit ? 1 : -1;
		// The door, remembered on the way IN only — a single slot, never a stack (see ascension.svelte.ts).
		if (ascend === 1) {
			markAscent(decodeURIComponent(window.location.pathname.replace(/^\/person\//, '')));
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
			const source = decodeURIComponent(window.location.pathname.replace(/^\/person\//, ''));
			resolveLateralDir(provisional, source, decodeURIComponent(match[1]));
		}
		publishCameraMove({ from, to, screenVector, distance, duration, easing: 'cubicOut', kind, relationClass, genDelta, kinDistance, ascend, scaleMin });
		// The arc clock is started at the STATE SWAP (below), not here — so it shares its time origin with the
		// card + substrate transitions that mount then, guaranteeing one clock (no fetch-time offset).
		const arcFrom = from && to ? { x: from.x, y: from.y ?? to.y ?? 0 } : null;
		const arcTo = from && to ? { x: to.x, y: to.y ?? from.y ?? 0 } : null;
		const arcDuration = arcDurationMsFor(provisional);

		const slug = decodeURIComponent(match[1]);
		// HARD CUT → FLY (item A): a CC arrival removes the roster THIS frame — the same frame the flight
		// origin was captured above — no beat, no fade. The lone card launches; the incoming roster is held
		// pending and unfurls at landing. Chip navs (and reduced motion) never cut. Restored once the flight
		// has taken over (one frame after the state swap) so the NEW roster is display-able but still pending.
		if (isCC && !prefersReducedMotion.current) {
			hideCcRoster();
			void focusPerson(slug).then(() => {
				if (arc && arcFrom && arcTo) startArc({ from: arcFrom, to: arcTo, scaleMin: scaleMin as number, duration: arcDuration });
				requestAnimationFrame(() => showCcRoster());
			});
			return;
		}
		void focusPerson(slug);
	}
	node.addEventListener('click', onClick);
	return { destroy: () => node.removeEventListener('click', onClick) };
}
