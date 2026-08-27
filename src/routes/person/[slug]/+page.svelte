<script lang="ts">
	import type { PageData } from './$types';
	import PersonBox from '$lib/components/PersonBox.svelte';
	import FeaturedCard from '$lib/components/FeaturedCard.svelte';
	import ConnectModal from '$lib/components/ConnectModal.svelte';
	import Field from '$lib/components/Field.svelte';
	import TimelineRail from '$lib/components/TimelineRail.svelte';
	import ShuffleNotables from '$lib/components/ShuffleNotables.svelte';
	import DeckRiffle from '$lib/components/DeckRiffle.svelte';
	import { untrack, tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { PersonCompact } from '$lib/types/neighborhood';
	import { cardinalWord, cardinalWordLower, possessive } from '$lib/utils/dates';
	import { page } from '$app/state';
	import { featured } from '$lib/state/featured.svelte';
	import { loadFeatured, warmPersonLinks, focusPerson } from '$lib/state/navigate';
	import { buildRoster } from '$lib/data/roster';
	import {
		flyOut,
		chipExit,
		growFrom,
		shrinkTo,
		markPending,
		morphIn,
		getPivotId,
		getFlightKind,
		getPanDir,
		rowClockMs,
		handoffSpouseId,
		rowHandoffIds,
		rowTravel,
		marchTravel,
		retractBladeIn,
		captureFlightKind,
		captureAscend,
		getAscend
	} from '$lib/transitions/flight';
	import { getSiblingNavPlan } from '$lib/state/siblingNav';
	import { anchorOffsetFor, showsSiblingPanel } from '$lib/state/siblingLayout';
	import { chipColumns } from '$lib/state/childRows';
	import { ccRoster } from '$lib/state/ccRoster.svelte';
	import { stage, applyStageVars, clearStageVars } from '$lib/state/stage.svelte';
	import { unlockFlight } from '$lib/state/flightLock';
	import { preloadNeighborhood } from '$lib/photo';
	import SiblingPanel from '$lib/components/SiblingPanel.svelte';
	import Ascension from '$lib/components/Ascension.svelte';
	import { ascension, clearAscent } from '$lib/state/ascension.svelte';
	import Caret from '$lib/components/Caret.svelte';

	let { data }: { data: PageData } = $props();

	// Mirror cold-load data into the featured-person singleton and read the page
	// back out of it (Steps 1–2). SSR: effects don't run, so `current` is null and
	// we fall back to `data`. Client: $effect.pre re-syncs BEFORE the DOM update.
	$effect.pre(() => featured.set(data));
	const f = $derived(featured.current ?? data);

	// FOUNDATIONAL PHOTO PRELOAD: the moment a neighborhood is known — on cold-load hydration, and on a warm
	// nav the instant the incoming payload is set (during the flight, before the chips reveal at landing) —
	// warm EVERY person photo in it as one high-priority batch. A neighborhood is a complete set, so its chips
	// load together and are cache hits by the time any of them render (on screen, off screen, in a collapsed
	// panel, or promoted next nav). Client-only (effects don't run in SSR). See $lib/photo.ts.
	$effect(() => {
		preloadNeighborhood(f.neighborhood);
	});

	// ── PHASE 2.75: THE STAGE'S TWO DIALS ───────────────────────────────────────────────────────────
	// The frame unit and the type step, published as CSS custom properties so a window resize repaints
	// geometry without re-rendering a single component. Everything downstream reads `--stage-u` /
	// `--type-k`; NOTHING reads the window (see $lib/state/stage.svelte.ts for why that is one module's
	// job, and for why this is a real LENGTH rather than a transform).
	//
	// ON <html>, NOT ON THE STAGE, and that is load-bearing rather than tidy. flight.ts PORTALS a cloned
	// chip to <body> for the handoff ghost, precisely so the traveller escapes `.parents-slot`'s stacking
	// context. A clone parented to <body> is outside `.page-container`, so a variable scoped there would
	// not resolve for it — the ghost would inherit the fallback and fly at full size through a scaled
	// stage. The document root is the one element every ghost is guaranteed to descend from.
	$effect(() => {
		applyStageVars(document.documentElement, stage.u, stage.k);
		return () => clearStageVars(document.documentElement);
	});

	// THE EXHIBIT FLAG. Marks the document while a person page is mounted, so the shell rules in
	// layout.css (§13's viewport lock) apply HERE and not to /table or /institution, which are ordinary
	// scrolling documents. An attribute with an $effect cleanup rather than a `:global(html)` rule in
	// this component's stylesheet: Svelte hoists component CSS into one build-time sheet that is never
	// unmounted, so a :global(html) lock here would silently apply to every route in the app.
	$effect(() => {
		document.documentElement.dataset.exhibit = '';
		return () => delete document.documentElement.dataset.exhibit;
	});

	// Dev guard: f is one atomic FeaturedData, so neighborhood and person must
	// describe the same focal id. If this logs, a warm focus left them out of sync.
	$effect(() => {
		if (import.meta.env.DEV && f.neighborhood.focus.id !== f.person.id) {
			console.error(
				`[featured] focus mismatch: neighborhood=${f.neighborhood.focus.id} person=${f.person.id}`
			);
		}
	});

	// popstate reconcile (Step 2): back/forward across shallow history changes the
	// URL without re-running load. Track ONLY page.url; read state under untrack.
	$effect(() => {
		const slug = page.url.pathname.split('/')[2];
		if (!slug) return;
		untrack(() => {
			if (featured.current?.person.slug === slug) return;
			if (data.person.slug === slug) featured.set(data);
			else void loadFeatured(slug);
		});
	});

	// Re-focus choreography (DESIGN "RESOLVED ARCHITECTURE"): one roster per focus,
	// each person in exactly one role-zone, keyed by person id. Zoom is fixed at 1
	// for now; buildRoster/zone-rendering are already zoom-parameterized so z2/z3
	// slot into the same seams. Transitions are NOT wired yet — this milestone is
	// structure + notch docking only.
	/** How much longer the roster waits on the ascension EXIT only — see the note at its use site. */
	// 100 -> 190. The card now carries PAST its seat and settles back (flight.ts ASCEND_CARRY), and Sam's
	// rule is that only the CARD does that: "we only want to overshoot Burr's card, not all of his
	// children and parent cards too… which needs to complete a beat or two before the chips expand." So
	// the roster waits for the settle to be over rather than merely for the card to arrive.
	const ASCENSION_CHIP_BEAT_MS = 190;
	const zoom = 1;

	/**
	 * ── THE DESCENT (roadmap §40) — what the X does ────────────────────────────────────────────────
	 *
	 * Sam: "the X will just take the user back to the previous card where they clicked the CC… the orbit
	 * card exits the UX forward, the reverse of its entry, and the original hero card enters from the
	 * back to normal position."
	 *
	 * IT IS NOT A BACK BUTTON, and that is a correctness point rather than a preference. Browser back
	 * goes through the popstate reconcile above, which calls `loadFeatured(slug)` with NO flight
	 * captures — so it snaps, with no flight at all. The X has to perform the descent, which means
	 * synthesising the same click the reciprocal CC would have produced.
	 *
	 * SO IT DISPATCHES THE REAL LINK WHERE ONE EXISTS. The same trick the timeline bar uses to hand its
	 * click to the spouse chip (TimelineRail.onBarClick): a second implementation of a flight is the
	 * thing that eventually disagrees with the first, so wherever the blade already renders a link back
	 * to the door, that anchor IS the gesture — it carries data-cc, data-orbit and the rest, and
	 * warmPersonLinks reads the crossing off it exactly as it would from a click.
	 *
	 * THE FALLBACK MATTERS because reciprocity is not guaranteed — William Wadsworth → John Talcott has
	 * no reciprocal, so a blade will not always hold the way home. Then we navigate to the remembered
	 * door directly, capturing the crossing by hand so the descent still flies.
	 */
	function descend() {
		// ── THE WAY OUT MUST NEVER BE DEAD ──────────────────────────────────────────────────────────
		// It used to `return` when there was no remembered door, which is true on a cold load, on a
		// refresh, and after any HMR reload — so the control was visibly present, correctly hit-tested,
		// and did nothing. Sam hit it twice and both times it looked like a broken button rather than an
		// empty variable. Verified with elementFromPoint: the click WAS landing on the button.
		//
		// And it is the case that matters most, in Sam's own words: "if a user clicks on an orbit spouse
		// with no CCs and they don't know how to return to the normal tree, the X working is important."
		// Martha Wayles Jefferson has no cross-connections at all — from her card the X is the ONLY way
		// back, so it has to answer even when nothing was remembered.
		//
		// Four rungs, most-specific first. Each is a real way home, not a guess:
		const blade = () =>
			[...document.querySelectorAll<HTMLElement>('.cc-blade a[data-cc="true"]')].find(
				(a) => a.dataset.orbit !== 'true'
			);
		const home =
			ascension.from ?? // 1. the door we came in by
			blade()?.getAttribute('href')?.replace('/person/', '') ?? // 2. any CC that leaves the zone
			null;
		if (!home) {
			// 3. nothing on this card reaches the tree (Martha, cold-loaded). History is the honest next
			//    answer — it is where the reader actually was.
			if (history.length > 1) {
				history.back();
				return;
			}
			// 4. and if even that is empty, the line's own root always exists.
			window.location.href = '/person/thomas-hooker';
			return;
		}
		const link = document.querySelector<HTMLElement>(
			`.cc-blade a[data-cc="true"][href="/person/${home}"]`
		);
		if (link) {
			link.click();
			return;
		}
		// No reciprocal on the blade. Capture what the click would have captured, then go.
		captureFlightKind('cc');
		captureAscend(-1);
		clearAscent();
		void focusPerson(home);
	}
	const roster = $derived(buildRoster(f, zoom));

	// animate:flip glides SURVIVORS (e.g. children shared across a spouse swap) to their new
	// positions. Its fix() mis-pins LEAVERS (measured post-insertion), but flyOut's WAAPI
	// position:fixed pin overrides that, so leavers still land at their true click-captured rect.
	const flipMs = $derived(prefersReducedMotion.current ? 0 : 420);

	// ── Stranded-transition sweep (Layer 1 — the orphan root fix) ──────────────────────────
	// A relative box (parent/child/spouse) carries animate:flip (fix() → inline position:absolute)
	// and out:flyOut (position:fixed via a compiled animation). Under rapid navigation an outro/flip
	// can be interrupted so Svelte never strips its inline positioning, stranding the element pinned
	// until the next nav (BOTH re-adopted and roster-absent cases occur → sweep ALL resident boxes).
	//
	// Reset the inline positioning of any .flight with NO live animation (getAnimations().length === 0
	// — the ground truth) AND a non-static computed position (the residue). The getAnimations() gate is
	// load-bearing AND makes the sweep SAFE TO RUN ANY TIME: a live flip/flyOut is always skipped, so it
	// can never pop a legitimate in-flight element (flip's pin is inline, not animation-driven — that's
	// exactly what would pop). An orphan manifests only AFTER its interrupted animation ends (~360ms),
	// which is past a single tick — so on each roster change we sweep across the whole settle window.
	function sweepStranded() {
		if (typeof document === 'undefined') return;
		for (const el of document.querySelectorAll<HTMLElement>('.flight')) {
			if (el.getAnimations().length > 0) continue; // legitimately mid-transition — never touch
			const pos = getComputedStyle(el).position;
			if (pos !== 'fixed' && pos !== 'absolute') continue; // no stranded positioning residue
			for (const prop of ['position', 'left', 'top', 'width', 'height', 'transform', 'margin']) {
				el.style.removeProperty(prop);
			}
			if (import.meta.env.DEV)
				console.warn('[flight sweep] reset stranded flight element:', el.dataset.flightId);
		}
	}
	// An orphan can manifest on ANY frame its interrupted animation happens to end, so a few fixed
	// timeouts miss the tail. Instead sweep EVERY frame across a settle window (~50 frames ≈ 800ms,
	// past the 420ms flip / 360ms flyOut), re-armed by each navigation. The getAnimations() gate makes
	// per-frame sweeping harmless (live elements always skipped). A single shared rAF loop, frame-
	// counted (no wall-clock), so rapid navs just extend the window rather than stacking loops.
	let sweepUntilFrame = 0;
	let sweepFrame = 0;
	let sweeping = false;
	function armSweep() {
		sweepUntilFrame = sweepFrame + 50;
		if (sweeping || typeof requestAnimationFrame === 'undefined') return;
		sweeping = true;
		const loop = () => {
			sweepFrame++;
			sweepStranded();
			if (sweepFrame < sweepUntilFrame) requestAnimationFrame(loop);
			else sweeping = false;
		};
		requestAnimationFrame(loop);
	}
	$effect(() => {
		f.person.id; // hazard event: the roster changed
		// Safe HERE, unlike on pointerdown: the click has already been dispatched and its rects captured,
		// so removing the row cannot move the thing being clicked (that attempt broke both click paths).
		untrack(() => {
			tierClosingForNav = true;
			tierCollapsed = true;
			closeTier();
			// A lingering open tier during a flight would leave the army marching against a stale layout —
			// the same reason the ancestor tier closes here. This one needs no collapse flag: it sits below
			// the card, so its removal moves nothing any flight has measured.
			closeChildTier(false);
		});
		untrack(armSweep);
	});

	// The card morphs via transform (no layout effect), so without this the children
	// row's Y would snap/jerk to the new card's height. Bind the current card's
	// natural height and give the slot an explicit, CSS-transitioned height — the row
	// then GLIDES in lockstep with the morph. `mounted` keeps SSR/hydration content-
	// sized (no explicit height until the client measures), avoiding a 0-height flash.
	let cardHeight = $state(0);
	// The CC BLADE's measured height, forwarded up by the card that OWNS the blade. The blade is pinned
	// absolutely inside the card so it adds no height of its own (see FeaturedCard) — which is exactly
	// why the slot has to reserve it here, or the connector and children row would sit under it.
	let bladeHeight = $state(0);
	// Only the CURRENT person's card may set the reservation. During a navigation the outgoing card is
	// still mounted (it is flying away) and would otherwise report its blade's height back after the
	// incoming one has already set the new value, restoring the old gap under the new card.
	function onBladeHeight(id: string, h: number) {
		if (id === f.person.id) bladeHeight = h;
	}
	let mounted = $state(false);
	$effect(() => {
		mounted = true;
	});

	// ── Sibling panel (Phase 7 Slice 1) ──────────────────────────────────────────────────────────────
	// The gate itself lives in siblingLayout.ts, because planSiblingNav has to ask the same question of the
	// INCOMING person to know whether there is a seat to fly into — and two copies of one rule is how they
	// drift. See showsSiblingPanel for what it tests and why it grew a second clause (the one-way door).
	const focusC = $derived(f.neighborhood.focus);
	const showSiblings = $derived(showsSiblingPanel(f.neighborhood));
	// OPEN BY DEFAULT (Sam, Aug 4): "it should start for all users default in the visible mode but users
	// can close it anytime." The panel was closed until asked for, on §21.1's reasoning that the trigger
	// must read peripheral; the sticky preference then made travelling with it open convenient enough that
	// the default itself moved. Closing it is still one click and still sticks.
	let siblingsOpen = $state(true);
	// The panel opened ITSELF (a child promotion) → it reveals as a plain fade, not the cascade. Cleared by
	// the panel the moment the user touches the trigger, so a hand-driven toggle is always the loud one.
	// Starts QUIET so the first paint of a page is a plain fade, never §21.1's per-chip cascade. The
	// cascade is "a deliberate, attention-taking gesture, correct when a hand is on the trigger, intrusive
	// when it performs itself" (§18.12) — and a panel that is open by default performs itself on every
	// single page load unless this is set.
	let siblingsQuiet = $state(true);
	// SESSION PREFERENCE. Once a hand has been on the trigger the panel keeps that state as you travel:
	// opening it on one card and finding it shut on the next reads as the app forgetting what you asked
	// for. null = untouched, and only then does the auto-open on a child promotion apply. The panel still
	// CLOSES for the flight itself and reopens at landing — same rule every incoming chip obeys, so nothing
	// belonging to the new person paints before the card arrives — but from the user's seat it is simply
	// open on every card they land on.
	// `null` no longer means "closed until asked" — it means "nobody has expressed a preference yet", and
	// the DEFAULT for that state is now open (see siblingsOpen). A hand on the trigger still pins it either
	// way for the rest of the session.
	let siblingsPref: 'open' | 'closed' | null = $state('open');
	// Is THIS navigation a §19 in-place mutation? A $derived, not an effect: the panel needs it during the
	// same render pass that drops the trigger's `.shown`, and an effect runs a pass too late (§21.2). Keyed
	// on the focus id so it recomputes exactly once per navigation, while the plan is still captured.
	const siblingMutation = $derived.by(() => {
		f.person.id;
		return !!getSiblingNavPlan();
	});
	// The panel closes on navigation (§20.5: the nudge was removed — Sam's call; not worth the fallout, and it
	// leaves one fewer clock in the Slice-3 flight path). No transform anywhere now.
	// Set once the first run of the close-effect below has been consumed. That effect exists as a NAVIGATION
	// hazard, but an $effect also runs once on MOUNT — where it was slamming the panel shut before a single
	// frame had painted, so "open by default" produced a closed panel on every page load. The focus has not
	// changed on the first run; there is nothing to protect against yet.
	let siblingsNavSeen = false;
	$effect(() => {
		f.person.id; // nav hazard: on any focus change, close the panel
		untrack(() => {
			if (!siblingsNavSeen) {
				siblingsNavSeen = true;
				return;
			}
			// …EXCEPT on a sibling→sibling navigation with the panel open (§19). Closing here is what makes
			// every other arrival safe — it guarantees nothing belonging to the incoming person paints
			// mid-flight — but a sibling promotion barely changes this list, so tearing it down throws away
			// a list that was already 90% correct and re-animates it. The panel mutates in place instead.
			// The relaxation is bounded: the one chip that is genuinely new (the demoted person) is still
			// held hidden until the card lands, by SiblingPanel's own chipIn. The plan is null for every
			// other arrival, so this is the panel's only exception.
			if (getSiblingNavPlan()) return;
			siblingsOpen = false;
			siblingsQuiet = false;
		});
	});

	// ── Flight landing: the single source of truth for "the featured card has arrived" ──
	// `featuredLanded` is driven by the featured card's REAL transition lifecycle events, not a
	// timer: false the instant a card starts flying in, true at `introend` (growFrom actually
	// finished). Everything that should wait for the card to land keys off this — killing the
	// intermittent flicker the old fixed clocks caused (they guessed the distance-scaled landing).
	let featuredLanded = $state(true); // true at rest / cold load (intros don't replay on hydrate)

	// `landedPersonId` — the id of the person whose card has actually LANDED and is being shown. Set at
	// introend alongside featuredLanded=true. Its job is to close the one-frame stale-data window that
	// featuredLanded alone can't: on nav, `f` (and everything derived from it — the sibling count, the
	// trigger text) switches to the incoming person in the SAME reactive flush, but featuredLanded doesn't
	// flip false until introSTART fires a frame later. Any affordance gated on featuredLanded alone paints
	// the incoming person's data on the OUTGOING card for that frame (the sibling-trigger regression).
	// A gate of `featuredLanded && f.person.id === landedPersonId` instead goes false the instant f changes
	// (landedPersonId still holds the old id) — atomically with the new text, so nothing stale is ever
	// painted. The spouse CHIPS don't need this: markPending holds each new chip at opacity 0 on mount.
	let landedPersonId = $state(untrack(() => f.person.id)); // initial-capture is intended (cold-load person)

	// Notch suppression: a carved notch makes the growing/shrinking cards animate around a corner
	// cutout — a blur, not a discrete object. So while a card flies we flatten it to a COMPLETE
	// rounded card (--flat-shape) via a `.flat` class on the flight wrapper. Lifecycle events fire
	// PER-ELEMENT, the only way to reach the OUTGOING card (its props freeze on removal). Reduced
	// motion skips it, so a 0ms "flight" can't strand a card notch-less.
	// Fade a held-pending box (in:markPending) into view. `accept` decides which pending boxes to
	// take now — used to reveal everyone EXCEPT the pivot early, then the pivot as the card docks.
	function revealPending(accept: (el: HTMLElement) => boolean, fadeMs = 180) {
		for (const el of document.querySelectorAll<HTMLElement>('[data-pending]')) {
			if (!accept(el)) continue;
			delete el.dataset.pending;
			el.style.opacity = '';
			if (prefersReducedMotion.current) continue;
			// CHILDREN (data-flight-dir="down") get the MIRROR of the parents' fade-and-rise: they arrive
			// from the CARD's side — the card sits directly above the children row — fading in while
			// settling DOWN into place, instead of a flat opacity pop. Parents rise UP from below into
			// their slot (morphIn); children settle DOWN from above into theirs. Only on a real reveal
			// (fadeMs > 0) — the atomic-swap pivot reveal (fadeMs 0) must stay an instant STEP, never a slide.
			if ((el.dataset.flightDir === 'down' || el.dataset.flightDir === 'up') && fadeMs > 0) {
				// DIRECTIONAL entrance, both rows now symmetric: children (dir "down") settle DOWN from above
				// (−150), parents (dir "up") rise UP from below (+150) — same 150px / 300ms / cubicOut curve
				// morphIn uses. When a held parent reveals HERE (CC arrival), it emanates from the landed card
				// exactly as the children do, instead of the flat opacity fade it used to get. 150px travel,
				// gradual deceleration tail (the old 28px / hard-out covered ~1/3 the distance, "hit a wall").
				// THE ARMY (flight.ts, rowTravel): direction is the CAMERA PAN, not the row's own zone, so
				// every row — arriving and leaving — steps the same way at the same moment. The arriving row
				// enters from the pan's TRAILING edge, which is why it can never cross the row leaving through
				// the leading edge. One tier pitch, on the shared demote clock: same constants as flyOut, so
				// tuning either side without the other is impossible by construction.
				const pan = getPanDir();
				const fromY =
					pan === 'lateral'
						? el.dataset.flightDir === 'down'
							? -marchTravel()
							: marchTravel()
						: pan === 'down'
							? -marchTravel()
							: marchTravel();
				el.animate(
					[
						{ opacity: 0, transform: `translateY(${fromY}px)` },
						{ opacity: 1, transform: 'translateY(0)' }
					],
					{ duration: rowClockMs(), easing: 'cubic-bezier(0.33, 1, 0.68, 1)' }
				);
			} else {
				el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fadeMs, easing: 'ease-out' });
			}
		}
	}

	// Did we arrive by PROMOTING A CHILD? Captured at flight start (the click-time captures are cleared a
	// frame later) and consumed at landing, where it opens the sibling panel. Only this arrival opens it:
	// it is the one where the siblings on screen ARE the chips the user just left behind, so the cascade
	// answers "where did they go". Every other arrival keeps §21.1's peripheral trigger, which Sam set on
	// pixels precisely so the panel would not compete with the card.
	let openSiblingsOnLand = false;
	// WHO is crossing from the parents row to the notch this navigation, captured at flight START because
	// the click-time captures handoffSpouseId reads are cleared a frame later. Consumed at landing.
	let handoffChipId: string | null = null;
	// WHO is crossing a GENERATION into the children row this navigation (flight.ts rowHandoffIds). Empty
	// on every navigation that does not come out of the grandparent tier. Same lifecycle as handoffChipId:
	// captured at flight start from the click-time snapshot, consumed at landing.
	let crossingIds: string[] = [];
	// The pivot the current demotion owns — set at outrostart, consumed at outroend. The introend
	// safety-net excludes it for relative+motion so it can't pre-empt the atomic swap with a fade.
	let demotingPivotId: string | null = null;

	// Monotonic navigation counter — the janitor (onIncomingLand) uses it to tell "no newer nav
	// started" so its post-settle sweep never removes a legitimately in-flight pin.
	let navSeq = 0;

	function onIncomingStart(node: HTMLElement) {
		if (prefersReducedMotion.current) return;
		navSeq++;
		node.classList.add('flat'); // suppress notch → solid rectangle for the flight
		// THE ANTICIPATED NOTCH. `.flat` normally holds until landing, because a carved corner on a card
		// that is still growing reads as a blur. But in ONE scenario the card acquires a passenger before
		// it lands: a promoted parent whose partner is crossing from the parents row to the notch (see
		// flight.ts handoffSpouseId). She was arriving onto a card with no notch yet — sitting ON the corner
		// for ~90ms until landing carved it out from under her — which breaks the docking read the notch
		// exists to create. So for that case only, the notch is carved EARLY, once the card is within
		// NOTCH_ANTICIPATE of its final size and the cutout is therefore already at its settled dimensions.
		// Gated on measured GEOMETRY, not a timer: the card's painted width against its layout width, which
		// is the same "tie it to the cause, not the clock" rule featuredLanded follows. Every other arrival
		// — a promoted child, a sibling, a CC from offscreen — keeps the flat card all the way in.
		openSiblingsOnLand = getPanDir() === 'up'; // a child promotion — see the declaration
		handoffChipId = handoffSpouseId(roster.spouses.map((s) => s.spouse.id));
		// WHO IS CROSSING A GENERATION into the children row (see flight.ts rowHandoffIds) — the hovered
		// parent on a grandparent promotion, and nobody else on any other navigation. Captured at flight
		// START because it reads the click-time snapshot, which is cleared a frame later; consumed twice
		// below — to HOLD his seat through the flight, and to reveal it at landing.
		crossingIds = rowHandoffIds(roster.children.map((c) => c.id));
		if (handoffChipId) {
			const watch = () => {
				if (!node.isConnected || !node.classList.contains('flat')) return;
				if (
					node.offsetWidth &&
					node.getBoundingClientRect().width >= node.offsetWidth * NOTCH_ANTICIPATE
				) {
					// `notch-armed`, NOT removing `.flat`. `.flat` means "this card is in flight" to more than
					// the clip rule — probe-flight reads it as the landing boundary — so dropping it early
					// would not un-flatten a card, it would tell every reader the flight had ended. The new
					// class only suspends the flattening; the flight's own signal is left alone.
					node.classList.add('notch-armed');
					return;
				}
				requestAnimationFrame(watch);
			};
			requestAnimationFrame(watch);
		}
		featuredLanded = false; // hold the PIVOT + spouse chips hidden until we land (see reveal below)
		// Close the bare-screen gap: reveal the incoming PARENT and CHILD boxes NOW — as the outgoing
		// ones fade — so the screen above and below the card is never bare. Two kinds of box are HELD
		// instead, both revealed on landing:
		//   • the PIVOT (the box the demoting card shrinks into) — revealing it here would double it
		//     (its box + the shrinking card on screen at once); the seam watch reveals it as the old
		//     card docks.
		//   • the SPOUSE CHIPS (data-flight-dir="lateral") — they dock into the notch in the hero
		//     card's OWN top-right corner, directly under the card's flight path. Revealed early they
		//     flash in, get covered by the rising card, then re-emerge — the exact bug this gate
		//     prevents. They wait for the card to land (the featuredLanded effect reveals them).
		// CC ARRIVAL (item 4, gather → fly → UNFURL): hold the ENTIRE roster until landing — no early
		// reveal. The card flies alone through the passage (a beat of stillness is desirable), then the
		// roster unfurls out of the new card at landing (the safety-net reveal, its inverse gesture).
		if (getFlightKind() === 'cc') return;
		const pivot = getPivotId();
		// isSeatFor, not a bare data-flight-id test: on a §19 sibling mutation the pivot's destination is a
		// chip in the sibling panel, which carries data-sib-seat-id. A plain attribute comparison read
		// `undefined !== pivot` on that chip — true — and revealed the demoted person's chip at FLIGHT
		// START, fading it up beside a card that was still carrying him across the screen. The one chip
		// §19.4 says must stay held was the one chip this gate could not see.
		// The generation-crossers are held for exactly the reason the PIVOT and the spouse chips are: a
		// traveller is on his way to that seat, and revealing it now would fade a second copy of him in
		// underneath the one still moving. Released at landing, as a STEP (see onIncomingLand).
		revealPending(
			(el) =>
				!isSeatFor(el, pivot ?? '') &&
				el.dataset.flightDir !== 'lateral' &&
				!crossingIds.includes(el.dataset.flightId ?? '')
		);
	}
	// Spouse-chip reveal fade — quicker than the default box fade (180ms) so the chips settle into the
	// notch with less lag AFTER the hero lands. NOT an earlier start (that would be a mid-flight rise,
	// the flash-then-cover bug); the chips are still gated on landing, they just resolve faster once there.
	const CHIP_REVEAL_MS = 120;
	// Fraction of its final width the incoming card must reach before the anticipated notch is carved
	// (see onIncomingStart). High enough that the cutout is at settled size, early enough to beat the
	// traveller's arrival — she lands at ~566ms and this fires around ~300ms.
	const NOTCH_ANTICIPATE = 0.92;
	function onIncomingLand(node: HTMLElement) {
		node.classList.remove('flat'); // re-form the notch ON the real landing (no timer)
		node.classList.remove('notch-armed'); // the anticipation is spent — the resting rule owns the notch now
		// Clear the inline origin transform growFrom set for the first-frame-flash fix — the animation is
		// done, so the landed card must rest at identity (its natural layout position), not snap to origin.
		node.style.transform = '';
		node.style.transformOrigin = '';
		node.style.zIndex = '';
		// AND THE OPACITY, which this cleared for years without needing to — because until the Ascension
		// no arrival set one inline. A depth-axis flight does: it starts the card at opacity 0 so frame 0
		// cannot paint it fully-formed at its destination (the same first-frame-flash the transform above
		// is guarding). Left uncleared, the landed card kept `opacity: 0` forever — Sam saw Jefferson's
		// card vanish entirely on arrival with only his spouse chip left on screen, which looked like a
		// data bug and was a housekeeping one. The parked arc branch sets it too and had the same latent
		// defect. Anything a flight writes inline, this has to give back.
		node.style.opacity = '';
		// Reveal the spouse chips PROMPTLY here, in the introend handler itself — the hero's transform
		// has just hit identity, so the notch is in its final spot and a chip can never be caught under
		// the still-flying card. Doing it here (with the quicker CHIP_REVEAL_MS fade) instead of waiting
		// for the featuredLanded $effect to schedule + run shaves the post-landing lag, so the chips
		// appear sooner. Still strictly gated on landing → CHIPS-SOON stays green.
		// THE TRAVELLER'S CHIP REVEALS INSTANTLY, everyone else's fades. She is sitting on that seat,
		// opaque and on top of it, so its 120ms fade-in is a fade nobody can see — and the traveller is
		// retired only once it completes, which left her parked on a settled stage for ~125ms after every
		// other part of the navigation had stopped moving. That dangling tail is what made an otherwise
		// tight sequence feel loose. Revealed as a STEP, she retires as the card lands, with the rows.
		// The other notch chips are not covered by anything and keep their fade.
		if (handoffChipId) {
			const id = handoffChipId;
			revealPending((el) => el.dataset.flightDir === 'lateral' && el.dataset.flightId === id, 0);
		}
		revealPending((el) => el.dataset.flightDir === 'lateral', CHIP_REVEAL_MS);
		handoffChipId = null;
		// The generation-crosser's seat, revealed as a STEP for the same reason the notch traveller's is:
		// his ghost is sitting on that seat, opaque and on top of it, so a fade underneath is a fade nobody
		// can see — and the ghost retires the instant `data-pending` goes away, which is this line. Faded
		// instead, he would be retired 120ms into a settled stage, the dangling tail that made the sequence
		// feel loose before.
		if (crossingIds.length) {
			const ids = crossingIds;
			revealPending((el) => ids.includes(el.dataset.flightId ?? ''), 0);
			crossingIds = [];
		}
		// The siblings arrive WITH the spouse chip, on the panel's own per-chip cascade (§21.1: each chip
		// drops from where its predecessor sits, 38ms apart, with a 2.5px micro-overshoot). Reusing that
		// reveal rather than animating anything new is the whole point — the children that faded out below
		// reappear here, as one gesture, whether there are two of them or sixteen.
		// A standing preference reopens the panel on EVERY arrival, not just a child promotion.
		if (siblingsPref === 'open' && showSiblings && !siblingsOpen) {
			siblingsQuiet = true;
			siblingsOpen = true;
		}
		if (openSiblingsOnLand) {
			openSiblingsOnLand = false;
			if (showSiblings && siblingsPref !== 'closed') {
				siblingsQuiet = true; // self-opened → fade the column in, no cascade
				siblingsOpen = true;
			}
		}
		// ── THE BEAT BEFORE THE CHIPS, +100ms ON THE ASCENSION EXIT ONLY ────────────────────────────
		// Sam: "the parent and child chip appearance just needs 100ms longer to appear specifically in
		// the ascension exit background-to-hero transition, without impacting other transitions."
		//
		// The beat itself is the app's, not something added here — a lateral CC already settles the hero,
		// waits, then extends the roster, and Sam has called that rhythm perfect. What the depth return
		// costs is its LENGTH: the card is still closing the last of the room when the clock runs out, so
		// the pause that follows is shorter than the one a lateral flight leaves.
		//
		// SURGICAL BY CONSTRUCTION. `getAscend()` is the per-navigation capture and is −1 on exactly one
		// gesture — leaving the zone. Every other navigation in the app reads 0 here and takes the
		// untouched synchronous path, so there is no timing anywhere else to get wrong. Cleared on the
		// next capture, so a stale value cannot leak into the flight after it.
		const beat = getAscend() === -1 && !prefersReducedMotion.current ? ASCENSION_CHIP_BEAT_MS : 0;
		const land = () => {
			featuredLanded = true; // → reveals the pivot box + any remaining pending boxes
			landedPersonId = f.person.id; // the shown person has landed → ungate its trigger (see above)
		};
		if (beat) setTimeout(land, beat);
		else land();
		unlockFlight(); // card is in final position, chips extending → nav clicks honored again

		// JANITOR (PROD belt for the finished-animation teardown residue the sweep can't safely touch):
		// a small class of orphans keeps a getAnimations() entry stuck in playState 'finished', so the
		// sweep's gate shields them; this removes them outright. Runs in PROD (700ms worst-case transient
		// — the class occurs only under rapid clicking, zero at normal speed), guarded so a newer nav's
		// legitimate pins are never touched. The warn is dev-only (a tripwire; any firing at normal use
		// is a regression alarm) so prod consoles stay quiet.
		const seq = navSeq;
		setTimeout(() => {
			if (seq !== navSeq) return; // a newer nav is in flight; its pins are legitimate
			for (const el of document.querySelectorAll<HTMLElement>('.flight')) {
				if (getComputedStyle(el).position !== 'fixed') continue;
				if (import.meta.env.DEV)
					console.warn('[flight janitor] removed orphaned pinned chip:', el.dataset.flightId);
				el.remove();
			}
		}, 700);
	}
	function onOutgoingStart(node: HTMLElement, id: string) {
		if (prefersReducedMotion.current) return;
		node.classList.add('flat'); // demoting card flies as a solid rectangle; destroyed flat
		retractBladeIn(node); // the CC blade stows back into the case as the card starts to leave
		demotingPivotId = id; // this card IS the pivot (getPivotId is already cleared by introend)
		// "Flip early, land as a chip" — Layer 2 UNIFIES this across both kinds. The .demoting class
		// cross-fades the chip-face in over the first ~110ms (front-loaded, motion-masked, one flip) while
		// the card's own face fades out; shrinkTo's tick then counter-scales the face every frame so it
		// renders undistorted and lands at natural box size. RELATIVE lands on a parent/child box; SPOUSE
		// lands on its lateral notch seat (pivot-aware offset guarantees that seat is in the visible
		// window). Either seat is revealed at the demote's landing by the onOutgoingEnd atomic swap. Skip
		// the flip only if the destination seat isn't mounted (then the card just shrinks plainly).
		// §19: on a sibling panel mutation the seat is a chip in the sibling list, which carries
		// data-sib-seat-id rather than data-flight-id (see onOutgoingEnd for why the two are separate).
		const seat =
			document.querySelector(`[data-flight-id="${id}"]`) ??
			document.querySelector(`[data-sib-seat-id="${id}"]`);
		if (!seat) return;
		node.classList.add('demoting');
		// The chip-face is a resting PersonBox rendered relation="parent", so its name is the parent/short
		// form ("Alice Gwynne"). When this demote lands in a CHILD seat, the real chip shows the married-
		// surname form ("Alice Vanderbilt", from compact.cm) — so the flying face would read the maiden name
		// and SNAP to the married one at the atomic swap. Mirror the destination chip's name onto the chip-
		// face now so the two are identical for the whole flight. Purely the name text — geometry, crossfade,
		// and the atomic swap are untouched; correct for every seat/name kind (parent sn, child cm, verbatim).
		const seatName = seat.querySelector('[data-chip-name]')?.textContent;
		const faceName = node.querySelector('.demote-chipface [data-chip-name]');
		if (seatName && faceName && faceName.textContent !== seatName) faceName.textContent = seatName;
	}

	// ATOMIC SWAP: the demoting card has just been removed by Svelte (outro end). Reveal its pivot box
	// THIS frame, instantly (fade 0) — so the box appears exactly as the card leaves: never on top of
	// the still-docked card (a visible double, for a child pivot whose box paints above the demote),
	// never a frame after it's gone (a bare destination). This is the explicit landing signal that
	// replaced the deleted opacity fade-watch; it also nets the degraded case (duration 0 / box
	// unmounted), where it simply reveals immediately.
	// `data-sib-seat-id` is the same signal one level over: on a §19 sibling mutation the demoted card
	// lands in the sibling PANEL, whose chips deliberately don't carry data-flight-id (it would change
	// what warmPersonLinks reads at click time). Same atomic swap, same instant reveal.
	const isSeatFor = (el: HTMLElement, id: string) =>
		el.dataset.flightId === id || el.dataset.sibSeatId === id;
	function onOutgoingEnd(_node: HTMLElement, id: string) {
		revealPending((el) => isSeatFor(el, id), 0);
		if (demotingPivotId === id) demotingPivotId = null;
	}

	// Safety net: if anything is still pending when the incoming card lands (e.g. the demoted card's
	// landing signal never fired), reveal it. For a RELATIVE demotion under motion the pivot is owned
	// by the demote's own landing (the atomic swap) — exclude it here so this net can't pre-empt it
	// with a fade. Spouse (cross-dissolve owns it) and reduced-motion (no demote tick) reveal all.
	let prevLanded = true;
	$effect(() => {
		const landed = featuredLanded;
		untrack(() => {
			if (landed && !prevLanded) {
				// BOTH kinds now own their pivot via the onOutgoingEnd atomic swap (fires first, DEMOTE_LEAD);
				// exclude it so this net can't fade-reveal it and double the seat against the shrinking card.
				const excludePivot = !prefersReducedMotion.current && demotingPivotId != null;
				revealPending((el) => !(excludePivot && isSeatFor(el, demotingPivotId!)));
			}
			prevLanded = landed;
		});
	});

	// Spouse chips, lifted out of FeaturedCard to dock into the carved notch. The
	// card still carves the notch from the same spouse count, so geometry matches.
	const useCompact = $derived(roster.spouses.length >= 3);

	// ── Spouse carousel (STRIP model, existence-gated) ────────────────────────────────────
	// ONLY built when spouseCount > 3; ≤3-spouse cards render the untouched baseline flex notch.
	// ALL chips live in one row-strip inside a clip-path mask; paging is a single PURE-PITCH
	// transform on the strip (chips hold their docked rects at every offset). L3: no pivot-aware
	// offset (reset to 0), no landed-gated caret mount — those are L4/L5.
	// ── PHASE 2.75 — THE CAROUSEL'S GEOMETRY SCALES WITH THE CHIPS IT WINDOWS ───────────────────────
	// These were plain constants carrying the comments "must match FeaturedCard CHIP_W_COMPACT" and
	// "must match FeaturedCard CHIP_GAP". Both of those numbers started scaling with the stage and these
	// did not, so on a 4+-spouse card the strip stepped 168px per page while its chips were 156px wide,
	// the 496px mask was wider than the 484px of chips it was meant to clip, and the fourth chip and the
	// right caret both spilled past the card's right edge — at 1300px, which is nowhere near small.
	//
	// A COMMENT IS NOT A MECHANISM (design §28.1's phrase, third time it has been the answer today:
	// DeckRiffle's phantom width, the blade's 925, and now this). The values are DERIVED from the same
	// bases FeaturedCard uses and multiplied by the same dial, so the two cannot drift again.
	//
	// ROUNDED to integers before they are summed, and the order matters: the chips are laid out by
	// PersonBox, which rounds each box independently. Rounding the sum instead would leave the mask up
	// to a pixel adrift from the chips it clips, which is exactly the kind of hairline that shows as a
	// sliver of the next chip at some widths and not others.
	const CHIP_W = $derived(Math.round(160 * stage.u)); // matches FeaturedCard's CHIP_W_COMPACT
	const CHIP_GAP = $derived(Math.round(8 * stage.u)); // matches FeaturedCard's CHIP_GAP
	const WINDOW = 3;
	const STRIP_STEP = $derived(CHIP_W + CHIP_GAP); // one page of pitch
	const NOTCH_W = $derived(WINDOW * CHIP_W + (WINDOW - 1) * CHIP_GAP); // the visible window
	const CARET_W = $derived(Math.round(22 * stage.u));

	// ── THE MASK'S OVERSHOOT, PER SIDE ──────────────────────────────────────────────────────────────
	// This was ONE uniform 6px on all four sides, and each side wants something different, so a single
	// number was simultaneously too small on three of them and load-bearing on the fourth. Sam, seeing
	// Michael Gay Hooker's four-spouse notch: "overlapping and intruding dropshadows... the left border
	// of the first spouse chip is getting cut off... an invisible block over the bottom left corner drop
	// shadow... on the far right the drop shadow on the right border gets cut off in front of the arrow."
	// Three separate symptoms, one cause.
	//
	// WHAT THE SHADOW ACTUALLY REACHES, since these should be measured rather than chosen. --chip-shadow
	// is `0 3.2px 9.6px` plus a tight `0 0.8px 2.4px`; a blur of B extends about B/2 past the shadow's
	// own rect, and the rect is the box offset DOWN by 3.2:
	//     sideways  4.8px      above  4.8 - 3.2 = 1.6px      below  3.2 + 4.8 = 8px
	// and --chip-shadow-hover (`0 5px 14px`) reaches 7px sideways and 12px below. A uniform 6 therefore
	// clipped the resting shadow along the bottom (needs 8) and the hover shadow on both flanks.
	//
	// TOP AND BOTTOM ARE FREE. Nothing lives above or below the strip inside the mask, so extending the
	// clip there can only reveal the chips' own shadows. They are set to cover the HOVER reach.
	//
	// THE RIGHT IS THE ONLY CONSTRAINED SIDE, and it is why the uniform value existed. The mask's right
	// edge is what "hides the next chip (nothing protrudes past the trailing docked chip — the right
	// caret is the sole 'more' cue)". The next chip's left edge sits exactly CHIP_GAP past the trailing
	// one, so ANY overshoot >= CHIP_GAP reveals it. Expressed as `CHIP_GAP - 1` rather than a literal so
	// it stays exactly one pixel short of that reveal at every rung, whatever the rounding does — a
	// literal 7 against a gap that rounds to 7 at some u would leak the next chip.
	// This does mean the hover shadow is still trimmed on the trailing chip's right flank. That is a real
	// conflict between two requirements and not an oversight: 7px of shadow or a sliver of the next chip,
	// and the design already chose which cue wins.
	//
	// THE LEFT WAS 0, WHICH IS WHY THE FIRST CHIP LOOKED CUT. At rest the leading chip's left edge sat
	// exactly ON the clip boundary, so its shadow had nowhere to go and its rounded corner was shaved by
	// antialiasing — Sam saw a chip with no left border at all.
	//
	// The left turns out to be governed by the SAME arithmetic as the right, which is why both flanks now
	// share one value. At any offset above zero the chip parked just outside the window sits one pitch
	// left, so its RIGHT edge is at -CHIP_GAP — exactly mirroring the next chip's left edge at +CHIP_GAP
	// on the other side. So `CHIP_GAP - 1` is the widest overshoot either flank can take while staying a
	// pixel short of revealing its neighbour, and being symmetric is a property of the strip's geometry
	// rather than a tidiness choice.
	//
	// At u = 1 that is 7px, which covers the resting shadow's 4.8 with room and meets the hover shadow's
	// 7 exactly. The left edge also clips chips sliding under the header while paging, so a departing
	// chip now shows a 7px sliver for a few frames of the 420ms page — the neighbour it might reveal is
	// still 1px further out, and a resting state is looked at continuously where a mid-motion sliver is
	// not looked at at all.
	const MASK_PAD_T = $derived(Math.round(6 * stage.u));
	const MASK_PAD_B = $derived(Math.round(12 * stage.u));
	/** Both flanks: one pixel short of the neighbouring chip, which sits exactly CHIP_GAP away. */
	const MASK_PAD_X = $derived(Math.max(0, CHIP_GAP - 1));

	let spouseOffset = $state(0);
	const spouseCount = $derived(roster.spouses.length);
	const hasCarousel = $derived(spouseCount > WINDOW);
	const canPageRight = $derived(spouseOffset + WINDOW < spouseCount);
	const canPageLeft = $derived(spouseOffset > 0);
	let pagingLock = $state(false); // inert through the strip transition (no skip-ahead)

	const stripX = $derived(-(spouseOffset * STRIP_STEP)); // pure pitch — chips snap to the grid
	// Static mask: left clips chips sliding under the header; right hides the next chip (nothing
	// protrudes past the trailing docked chip — the right caret is the sole "more" cue).
	const maskClip = $derived(
		`inset(-${MASK_PAD_T}px -${MASK_PAD_X}px -${MASK_PAD_B}px -${MASK_PAD_X}px)`
	);
	// Carets ride the card edge at the notch seam, EQUIDISTANT from the chips they flank.
	const rightCaretRight = $derived(-(CHIP_GAP + CARET_W)); // inner edge CHIP_GAP past the trailing chip
	const leftCaretRight = $derived(NOTCH_W + CHIP_GAP); // inner edge CHIP_GAP before the first chip

	// Initial offset on every new focus. PIVOT-AWARE (L5): if the person we're leaving (the pivot)
	// becomes a spouse of the incoming focus at strip index i ≥ WINDOW, open the window whose TRAILING
	// chip is that pivot (offset = i - (WINDOW-1)), so the demotion morph lands on a VISIBLE docked rect
	// instead of flying to an off-mask position (the ghost). This runs SYNCHRONOUSLY on the focus change
	// (before the flight's shrinkTo re-reads rects), and because pagingLock is cleared here the strip's
	// transition (.paging-gated) is OFF — it SNAPS to the offset, never animating chip rects mid-flight.
	$effect(() => {
		f.person.id; // dependency
		untrack(() => {
			const spouses = roster.spouses;
			// The person whose seat MUST be in the open window. Two of them can need it, never at once:
			// the PIVOT on a spouse swap (the card we are leaving demotes onto its chip), and the
			// HAND-OFF traveller on a parent promotion (the other parent crosses to her chip). On a
			// parent promotion the pivot becomes a CHILD, not a spouse, so it never competes.
			//
			// Without this the traveller was told to fly to a seat outside the mask: Anderson Cooper →
			// his mother Gloria Vanderbilt, whose FOURTH husband is Anderson's father, sent that chip
			// sailing past the right edge of the card to a 4th-spouse position that is not rendered.
			// Same failure the pivot rule was written for, reached by the other traveller.
			const pivot = getPivotId();
			const anchor =
				(pivot && spouses.some((s) => s.spouse.id === pivot) ? pivot : null) ??
				handoffSpouseId(spouses.map((s) => s.spouse.id));
			const maxOffset = Math.max(0, spouses.length - WINDOW);
			let init = 0;
			if (anchor) {
				const i = spouses.findIndex((s) => s.spouse.id === anchor);
				if (i >= WINDOW) init = Math.min(i - (WINDOW - 1), maxOffset);
			}
			spouseOffset = init;
			pagingLock = false;
		});
	});

	function pageStep(dir: 1 | -1) {
		if (pagingLock || !featuredLanded) return;
		if (dir === 1 ? !canPageRight : !canPageLeft) return;
		pagingLock = true; // .paging → the strip transition applies for THIS user page only
		spouseOffset += dir; // step ONE
		setTimeout(() => (pagingLock = false), 440); // ~= the 420ms strip transition
	}
	const pageAdvance = () => pageStep(1);
	const pageBack = () => pageStep(-1);

	const hasParents = $derived(roster.parents.length > 0);
	// The connector stems + labels reveal only when the SHOWN person has actually landed — not merely
	// featuredLanded (true during the stale-frame window at flight start). Without the id match, the old
	// connector hangs on the empty stage through the phantom beat (v4.1 CC bug). Same guard as the trigger.
	const familyLanded = $derived(featuredLanded && f.person.id === landedPersonId);

	// ── HOVER-REVEAL: THE GRANDPARENT TIER (Aug 7) ────────────────────────────────────────────────
	// Hold a parent chip for 1.5s and THAT PARENT'S parents open above it. No promotion, no navigation:
	// the featured card stays exactly what it was and simply sits one tier lower while the row is open.
	//
	// WHY THIS IS NOT morphIn/flyOut. Those are the row transitions, and they read the NAVIGATION's
	// captures — pivotId, rectSnapshot, getFlightKind, the clicked chip's rect. There is no click here and
	// no flight, so calling them would either no-op or read a stale nav. What IS reused is everything that
	// actually defines the motion: one tier of travel, the row curve, and the row clock.
	//
	// AND THE TIER IS NOT A NUMBER. The opening block's own rendered height is the distance everything
	// below it moves — so "the same gap as between the parents and the card" is true by construction, and
	// stays true if the row density ever changes. Nothing to keep in sync.
	// THE HOLD BEFORE A TIER ANSWERS. Walked 1500 -> 1200 -> 1100 -> 900 -> 1600 -> 1350 (Sam, Aug 25).
	//
	// THE WALK CHANGED DIRECTION HERE, and that is the part worth keeping. Every step down to 900 was
	// tuning a reveal you were WAITING for, where any hold is friction. The steps back up are about the
	// reveals you did NOT ask for: at 900 a pointer crossing the children row on its way somewhere else
	// trips a tier — or worse a refusal — before the hand has arrived. So the number is not "how long
	// until it answers", it is "how long before a passing pointer counts as a question", and those two
	// readings pull in opposite directions.
	//
	// 1600 was overshoot, and deliberately kept in the record: Sam went there first, found it "a beat too
	// long" once he was deliberately waiting, and settled a beat back. 1350 is the balance point between
	// the two costs, found by passing it rather than by approaching it.
	//
	// ONE NUMBER FOR BOTH BRANCHES, deliberately (Sam: "higher single number for both"). `onChildEnter`
	// waits this long and THEN decides whether to unfold or to shake, so the reveal and the nod are the
	// same gesture up to the last instant. Splitting them would mean the same hover answers on two
	// different clocks depending on data the user cannot see.
	//
	// `scripts/probe-tier.mjs` mirrors this value as its own INTENT_MS — if this moves, move that.
	const HOVER_INTENT_MS = 1350;
	// A BEAT BEFORE IT GOES. Leaving the keep-alive region used to close the tier on the very next
	// pointermove, which is faster than a person can change their mind — Sam: "give users a beat to
	// re-consider or view the overall structure". Re-entering inside the grace cancels it outright, so a
	// pointer that clips a corner on its way to a grandparent never costs anything.
	// SUPERSEDED for the ancestor tier, and worth stating rather than deleting. The beat existed because
	// the tier closed on the very next pointermove after leaving the chip, "which is faster than a person
	// can change their mind" — and the motion it was protecting is the one heading UP toward the
	// grandparents. That motion now has a corridor of its own (see onStagePointerMove), so the beat's job is
	// done structurally instead of by a timer, and the three edges that mean "not interested" close at once.
	// Still read by the descendant tier's pending-reveal cancel. If a beat is ever wanted back, it belongs
	// on leaving the ROW, not on leaving the chip.
	const DISMISS_GRACE_MS = 300; // 400 -> 300 (Sam)
	// ONE CLOCK, shared with the CSS below via --tier-ms. Not rowClockMs(): that derives from the CLICKED
	// chip's rect and there is no click here, so borrowing it means borrowing a stale navigation. 420 is
	// the row fallback — the same number the army uses when it has nothing to derive from.
	const TIER_MS = 420;
	// HOW FAR THE TIER PULLS ITSELF UP INTO THE PAGE'S TOP PADDING, in px.
	//
	// The tier opens in flow and pushes the stage down by its own height, and the COLLAPSE of that push is
	// what makes a navigation composite two curves (see the note on tierClosingForNav): the error is
	// push × (e − c), so it is a straight linear function of how far the stage has to travel back. Sam,
	// reading it off the screen rather than off the code: "maybe the parent chip position is just too low
	// when grandparent chips are visible and it can adjust that placement upfront."
	//
	// He is right, and it is a real lever rather than a workaround: every pixel the tier borrows from the
	// 80px of headroom already above the parents row is a pixel the stage does not have to give back. It
	// costs nothing at rest, because the default (tier-shut) layout never sees this at all.
	const TIER_LIFT = 0;

	/** A CSS cubic-bezier as a Svelte easing. Newton on x, then read y — so a curve can be authored in the
	 *  same notation the stylesheet uses instead of being approximated by whichever named easing is
	 *  closest. Ten lines, and it keeps the timing vocabulary of this file and the CSS identical. */
	function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
		const A = (a: number, b: number) => 1 - 3 * b + 3 * a;
		const B = (a: number, b: number) => 3 * b - 6 * a;
		const C = (a: number) => 3 * a;
		const calc = (t: number, a: number, b: number) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
		const slope = (t: number, a: number, b: number) =>
			3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
		return (t: number) => {
			if (t <= 0) return 0;
			if (t >= 1) return 1;
			let g = t;
			for (let i = 0; i < 6; i++) {
				const d = slope(g, x1, x2);
				if (d === 0) break;
				g -= (calc(g, x1, x2) - t) / d;
			}
			return calc(g, y1, y2);
		};
	}
	const SHAKE_MS = 520; // three refusals each way, and out — long enough to read, short enough to ignore
	// THE PUSH CURVE — WEIGHT, NOT BOUNCE.
	//
	// Overshoot was tried and rejected outright: "the overshoot is horrible, it's like a jerking motion
	// both up and down" (Sam). The reason is scale, not taste — a back-curve reverses direction twice, and
	// over a ~145px drop those reversals occupy enough of the travel to read as a flinch. The house uses
	// the same curve happily on ~900px flights, where the same carry is a rounding error. DO NOT REACH FOR
	// settleBackFor HERE; the distance is too short to hide it.
	//
	// What gives weight instead is asymmetry. cubicOut starts at maximum speed and only decelerates, which
	// is why it read as "exact and linear" — nothing ever gathers. This curve eases IN a little first (the
	// stage takes a moment to get going, as a heavy thing does), runs quickest through the middle, and
	// spends a long tail settling. Monotonic throughout: it never travels backwards, so there is nothing
	// to jerk.
	const TIER_CURVE = cubicBezier(0.32, 0, 0.22, 1);
	let revealedParentId = $state<string | null>(null);
	let gpOffsetX = $state(0);
	// A NAVIGATION CLOSES THE TIER ON THE FLIGHT'S CLOCK; a hover dismissal closes it on its own.
	//
	// This flag was `tierInstant` and the close really was instant, because the first attempt at animating
	// it dragged the chips with the block: the clicked grandparent travelled y=105 → y=−14, out of the top
	// of the window, WHILE the card grew from that same chip — two copies of one person going opposite
	// ways (Sam: "the illusion is trashed to have multiple of the same card going different directions").
	// Killing the animation stopped that, and cost the promotion its journey. MEASURED, with the close
	// instant: the floor (.featured-slot top) teleported −145px on the swap frame, and the hero was born at
	// y=205 — a hundred pixels BELOW the chip it came from — and covered 45px where an ordinary parent
	// promotion covers 145. The card was not travelling; the stage was rising to meet it. Sam: "i don't
	// think the grandfather chip does transition down and expand into the featured card, there is a gap."
	//
	// The fix is not to choose between the two, it is to separate what the collapse is allowed to move.
	// The chips now leave through flyOut like every other chip on the stage — pinned out of flow at their
	// click-time rects, so the block cannot carry them anywhere — and the block's collapse is left doing
	// the one job it should ever have done: moving the STAGE, on the army's own clock, so the floor
	// descends under the hero instead of jumping out from under it.
	let tierClosingForNav = $state(false);
	// THE LAYOUT COLLAPSE, kept strictly separate from the flag above — and the separation is the whole
	// lesson of handoff §6. `tierClosingForNav` is armed on CLICKCAPTURE, which is safe for exactly one
	// reason: it changes no geometry. The moment it also drove a `display: none` it became the dead end
	// that section already names — the row leaving between capture and handling, out from under the chip
	// being clicked. Measured, instantly: warmPersonLinks read the grandparent's origin rect off a
	// display:none element and the card flew from a 63×39 box at (17,175).
	//
	// So the collapse is armed HERE instead, in the navigation effect, one flush after the click has been
	// fully handled and every rect it needed has been captured. Same frame the old code removed the tier
	// in; nothing about the click can see it.
	let tierCollapsed = $state(false);


	/** A parent's OWN parents. Matched by id, never by position: the roster drops a parent it has already
	 *  placed elsewhere, so index 0 is not reliably the father. */
	function grandparentsOf(parentId: string): PersonCompact[] {
		const par = f.neighborhood?.parents ?? {};
		const gp = f.neighborhood?.grandparents ?? { paternal: {}, maternal: {} };
		const side =
			par.father?.id === parentId ? gp.paternal : par.mother?.id === parentId ? gp.maternal : null;
		if (!side) return [];
		return [side.father, side.mother].filter(Boolean) as PersonCompact[];
	}
	const revealedGrandparents = $derived(
		revealedParentId ? grandparentsOf(revealedParentId) : ([] as PersonCompact[])
	);

	/** Close the tier. Called on dismissal, and on every navigation — a lingering open tier during a
	 *  flight would leave the army marching against a stale layout. */
	function closeTier() {
		cancelDismiss();
		revealedParentId = null;
	}
	/** A click anywhere while the tier is open means a navigation is about to remove it — so it must leave
	 *  the NAVIGATION's way (on the flight's clock, chips pinned) rather than the hover's. Geometry is
	 *  untouched, so the click still lands where it was aimed. */
	function armTierNavClose() {
		if (revealedParentId) tierClosingForNav = true;
		if (focusedChildId) childClosingForNav = true;
	}
	/**
	 * THE GRANDPARENT TIER IS OPENED BY A CLICK, NOT BY A HOVER (Sam, Aug 10).
	 *
	 * It used to reveal after 900ms of hovering a parent chip, and Sam's objection was a ratio: "hovering
	 * on the parent chips is going to reveal the grandparent chips 9x more unintentionally than
	 * intentionally — users are going to naturally leave their mouse on the parent chips after clicking
	 * them, and the grandparents appearing is more of a nuisance than a convenience." A gesture the user
	 * makes for another reason cannot also be a command.
	 *
	 * So the whole hover apparatus is gone from THIS ROW: the intent timer, pointerenter/pointerleave, and
	 * the no-parents SHAKE — which existed only to answer a hover that would otherwise do nothing, and has
	 * nothing left to answer once nothing happens on hover. A parent with no parents now simply carries no
	 * trigger, which says the same thing more quietly and says it BEFORE the user acts rather than after.
	 * (The descendant tier keeps its hover and its shake — Sam changed this row only, which is why
	 * SHAKE_MS and HOVER_INTENT_MS both stay live.)
	 *
	 * WHAT IS DELIBERATELY UNCHANGED is everything about how the tier LEAVES: the keep-alive region below,
	 * its upward corridor, the no-grace side exits, and the navigation collapse. Sam: "I think the current
	 * exit mechanisms on grandparent chips are working and can stay the same." Only the door changed.
	 */
	function openGrandparentTier(e: MouseEvent, id: string) {
		// The .flight wrapper, not the button — the tier centres on the CHIP, and the trigger sits off at
		// its right edge. Centring on the trigger would put the row a half-chip out.
		const chip = (e.currentTarget as HTMLElement).closest('.flight') as HTMLElement | null;
		const stage = document.querySelector('.page-container');
		if (chip && stage) {
			// Measured at open rather than stored, so a reflow cannot leave it pointing at a stale seat.
			const c = chip.getBoundingClientRect();
			const st = stage.getBoundingClientRect();
			gpOffsetX = Math.round(c.left + c.width / 2 - (st.left + st.width / 2));
		}
		// Both cleared HERE, where any previous tier is provably gone and a fresh one is about to be built
		// — never on enter. See the tierCollapsed comment above for what restoring `display` too early did.
		tierClosingForNav = false;
		tierCollapsed = false;
		revealedParentId = id;
	}

	/** THE KEEP-ALIVE REGION — what actually dismisses the tier.
	 *
	 *  The rule is a REGION, not an edge-crossing, and that distinction is the whole reason this works. The
	 *  first version watched for the pointer LEAVING the chip and treated an exit through the top as
	 *  "heading for the grandparents". It could not work: opening the tier drops the stage 145px under a
	 *  motionless pointer, so the cursor ends up inside the grandparent row without the user moving at all,
	 *  which fired a spurious top-exit and then nothing could dismiss the tier short of steering back into
	 *  the parent chip and out again. Asking instead, on every move, "is the pointer still somewhere this
	 *  tier is ABOUT" has no such failure mode — a stage that moves under a still pointer just answers the
	 *  question again, correctly.
	 *
	 *  Within that region, the geometry does carry intent, and it is the mirror of the descendant tier's
	 *  (§31.5b): this row sits ABOVE its chip, so the TOP edge is the one that means "I am going to look at
	 *  those" and opens a corridor up to the row; bottom, left and right mean the opposite and close at
	 *  once. Sam asked for the same guardrails on both tiers, and they are the same rule with the sign
	 *  flipped.
	 *
	 *  The PAINTED parts are tested, not the block: `.grandparent-tier` carries a translateX to centre it on
	 *  the hovered chip, and testing a container whose contents can be transformed out from under it is the
	 *  bug that made the descendant tier close as you moved onto a grandchild. */
	// Slack so a hand shaking on the boundary does not flicker it shut. 24 → 12 (Sam: the buffer "can be
	// smaller than you have it"). It was sized when a hover opened the tier and the pointer had to be
	// forgiven for drifting; a click needs far less forgiveness.
	const KEEP_ALIVE_PAD = 12;
	let dismissTimer: ReturnType<typeof setTimeout> | null = null;
	function cancelDismiss() {
		if (dismissTimer) clearTimeout(dismissTimer);
		dismissTimer = null;
	}
	/** 200ms (Sam: 0 → 400 → 200). The side exits were "a little too fast and sensitive" with no grace at
	 *  all; 400 overshot. Long enough that clipping a corner on the way between two grandparent chips does
	 *  not cost the row, short enough that a row the user has walked away from is gone before they notice
	 *  it was still there. */
	const DISMISS_MS = 200;
	function scheduleDismiss() {
		if (dismissTimer) return; // already counting — do not restart it on every move outside
		dismissTimer = setTimeout(() => {
			dismissTimer = null;
			revealedParentId = null;
		}, DISMISS_MS);
	}

	function onStagePointerMove(e: PointerEvent) {
		if (!revealedParentId) return;
		const x = e.clientX;
		const y = e.clientY;
		const hit = (r: DOMRect | undefined, pad: number) =>
			!!r && x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;

		// The RESIDENT parents row's chip — scoped, because the tier reuses `.parents-slot` and a bare
		// attribute query would also match a chip inside the tier itself.
		//
		// MEASURED, BUT NO LONGER A KEEP-ALIVE REGION. It used to be one, back when HOVERING it is what
		// opened the tier — the chip could hardly dismiss a row it was still summoning. Now that the row is
		// opened by a click, the chip is just the thing underneath, and treating it as part of the tier
		// meant dropping back onto it kept the row up indefinitely. Sam: "when I exit the grandparent chips
		// but enter the original parent chip, the grandparent chips stay visible. That shouldn't happen."
		// Its TOP EDGE is still the corridor's floor, which is the only role it has left here.
		const chipR = document
			.querySelector(`.page-container > .parents-slot > [data-flight-id="${revealedParentId}"]`)
			?.getBoundingClientRect();

		// THE TRIGGER COUNTS AS INSIDE. It sits above the chip's top edge, so without this the very click
		// that opens the tier leaves the pointer outside every tested region, and the next twitch of the
		// hand dismisses what the user just asked for. A little pad, because it is a small target.
		const trigR = document
			.querySelector(
				`.page-container > .parents-slot > [data-flight-id="${revealedParentId}"] .see-parents`
			)
			?.getBoundingClientRect();

		// THE CHIPS ONLY — the connector is deliberately NOT in here, and leaving it in is what defeated
		// the midpoint floor below. The connector is the stem plus its label, and it spans the WHOLE gap
		// from the row down to the parent chip (measured: 155 → 225, with the chip's top at 225). So it
		// made `rowBottom` equal to the chip's top, put the midpoint exactly on the chip's top edge, and
		// kept the tier alive all the way down the middle of the gap — which is the behaviour Sam was
		// reporting. Nothing is lost by dropping it: the connector lies inside the corridor, so hovering it
		// above the midpoint still counts as inside, and below the midpoint it should not.
		const parts = [...document.querySelectorAll('.grandparent-tier .flight')].map((el) =>
			el.getBoundingClientRect()
		);

		let inside = hit(trigR, 8) || parts.some((r) => hit(r, KEEP_ALIVE_PAD));

		if (!inside && chipR && parts.length) {
			const left = Math.min(chipR.left, ...parts.map((r) => r.left));
			const right = Math.max(chipR.right, ...parts.map((r) => r.right));
			const top = Math.min(...parts.map((r) => r.top));
			const inColumn = x >= left - KEEP_ALIVE_PAD && x <= right + KEEP_ALIVE_PAD;
			// THE CORRIDOR — the band between the row and the chip, spanning both the chip's column and
			// wherever the row actually sits (it is centred on the chip, so the two overlap, but a wide row
			// reaches well past it on both sides).
			//
			// ITS FLOOR IS THE MIDPOINT, not the chip's top edge. Reaching to the chip meant the whole gap
			// counted as "still heading for the row", so leaving downward cost the user the entire descent
			// before anything happened — Sam: "I had to get my cursor all the way down to the top of the
			// parent chips line to have the grandparent chips exit... if the mouse gets halfway between
			// grandparent chips and parent chips that needs to be fully considered an exit."
			// Halfway is the natural line: above it the pointer is still nearer what it came from, below it
			// nearer what it is going to. (The trigger lives below this floor and does not need the
			// corridor — it carries its own hit test above.)
			const rowBottom = Math.max(...parts.map((r) => r.bottom));
			const floor = (rowBottom + chipR.top) / 2;
			if (inColumn && y <= floor && y >= top - KEEP_ALIVE_PAD) inside = true;
			// AND THE ROOF. Above the row is not an exit, because there is nothing up there to exit TO —
			// Sam: "when a user exits the grandparent chips out the top of them, leave the grandparent chips
			// visible, there's nowhere to go above it." The only upward exit that means anything is leaving
			// the WINDOW entirely, and that is answered by onDocumentLeave rather than by a coordinate.
			if (inColumn && y < top) inside = true;
		}

		if (inside) {
			cancelDismiss();
			return;
		}
		scheduleDismiss(); // out the sides or the bottom — on a grace, not instantly
	}

	/** LEAVING THE WINDOW THROUGH THE TOP closes the tier, and it is the one upward exit that does.
	 *  The roof above keeps the row alive for any pointer merely high on the page; once the pointer is off
	 *  the document there is no gesture left to interpret, so the row goes. Sideways and downward exits
	 *  fall through to the ordinary grace, already scheduled by the last move inside the page.
	 *
	 *  IT IS `mouseout` ON THE WINDOW, and the first attempt — `mouseleave` on <svelte:body> — silently
	 *  never fired. A synthetic mouseleave provably reached a hand-added body listener in the same page,
	 *  so the event was fine and the binding was not. `mouseout` BUBBLES, so it arrives at the window like
	 *  any other event, and `relatedTarget === null` is the browser's own statement that the pointer went
	 *  nowhere — i.e. left the document. That test is what makes this safe: an ordinary mouseout between
	 *  two elements always carries the element being entered. */
	function onWindowMouseOut(e: MouseEvent) {
		if (!revealedParentId) return;
		if (e.relatedTarget === null && e.clientY <= 0) closeTier();
	}

	/** THE GRANDCHILD TIER'S KEEP-ALIVE REGION.
	 *
	 *  Two things were wrong with the first version, and they had opposite causes.
	 *
	 *  IT TESTED THE WRONG BOX. `.grandchild-tier` is the block's LAYOUT rect, and the row inside it is
	 *  translated by gcRowX so a grandchild sits under the hovered chip — a transform on a child does not
	 *  move the parent's rect. So for a chip near the centre (shift ≈ 0) the box happened to be right, and
	 *  for one out at the edge the real chips were outside the box being tested: moving onto a grandchild
	 *  read as leaving. Sam had it exactly — Nancy worked, Edith did not. It now tests the PAINTED parts
	 *  (the chips and the connector), whose rects carry every ancestor transform.
	 *
	 *  AND IT TREATED ALL EXITS ALIKE. Leaving a chip through its BOTTOM is the one exit that means "I am
	 *  going to look at those" — it is the direction the tier is in. Every other edge means the opposite,
	 *  and a 300ms grace on those made a row the user had already dismissed hang around. So: the bottom
	 *  opens a CORRIDOR down to the row and there is no timer at all in it; any other edge closes at once.
	 *  (The ancestor tier keeps its grace deliberately — its row sits ABOVE the chip that opened it, with
	 *  the whole stage between, so there is no single edge that means intent.)
	 */
	const CHILD_KEEP_PAD = 20;
	function onChildTierPointerMove(e: PointerEvent) {
		const id = focusedChildId;
		if (!id) return;
		const x = e.clientX;
		const y = e.clientY;
		const hit = (r: DOMRect | undefined, pad: number) =>
			!!r && x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;

		const chipR = document
			.querySelector(`.page-container > .children-slot > [data-flight-id="${id}"]`)
			?.getBoundingClientRect();
		// Barely any pad on the chip itself: a generous one here is what let a corner exit read as still
		// hovering (Sam, leaving Nancy through the top-left and finding the row still up).
		if (hit(chipR, 2)) return;

		const parts = [
			...document.querySelectorAll('.grandchild-tier .flight, .grandchild-tier .connector')
		].map((el) => el.getBoundingClientRect());
		if (parts.some((r) => hit(r, CHILD_KEEP_PAD))) return;

		// THE CORRIDOR — the band between the chip's bottom edge and the bottom of the row, spanning both
		// the chip's own column and wherever the row actually sits. It has to span both because the row
		// slides to put a grandchild under the line, so a pointer heading for a chip at the far end of a
		// wide row would otherwise leave the corridor before it arrived.
		if (chipR && parts.length) {
			const left = Math.min(chipR.left, ...parts.map((r) => r.left));
			const right = Math.max(chipR.right, ...parts.map((r) => r.right));
			const bottom = Math.max(...parts.map((r) => r.bottom));
			if (
				y >= chipR.bottom - 2 &&
				y <= bottom + CHILD_KEEP_PAD &&
				x >= left - CHILD_KEEP_PAD &&
				x <= right + CHILD_KEEP_PAD
			)
				return;
		}
		closeChildTier(); // left by any edge that is not the bottom — no grace, no timer
	}

	/** First name of the hovered parent, for the tier's connector label ("John's parents"). */
	function parentFirstName(id: string | null): string {
		if (!id) return '';
		const p = roster.parents.find((x) => x.id === id);
		// chip_first_name first, then the real first name (Sam) — the same order the timeline bars use, so
		// a person is called one thing everywhere. Feeds BOTH the "See John's parents" trigger and the
		// tier's own connector label, which is why the two cannot disagree.
		return p?.cf ?? p?.fn ?? p?.n?.split(' ')[0] ?? '';
	}

	/** The opening push, and the closing collapse. The block's own height is the tier, so this reads it
	 *  rather than being told — "the same gap as parents→card" is then true by construction.
	 *
	 *  ON A NAVIGATION it runs the ARMY's clock and the army's curve instead of its own 420/TIER_CURVE, and
	 *  that is the whole of step 2: the stage then moves ONCE, on one clock, and nothing in the flight is
	 *  measuring itself against a floor that is moving on a different schedule. It also stays OPAQUE —
	 *  the block's fade would composite onto the pinned chips inside it, overriding the row alpha they
	 *  share with every other leaver on stage. Nothing visible is left in the block to fade anyway: the
	 *  chips are pinned out of flow and the connector is hard-cut by .nav-close (stylesheet), the same
	 *  frame-one cut `.connector.cc-hidden` already makes on every other navigation. */
	function tierPush(node: Element) {
		const h = (node as HTMLElement).offsetHeight || rowTravel();
		const nav = tierClosingForNav;
		return {
			// INSTANT on a navigation. Every FLIP now knows the collapse is coming (flight.ts
			// pendingCollapse), so the stage can drop it in one frame and no object composites its own curve
			// against the stage's. Animating it was the mistake: with four different clocks on stage —
			// morphIn's 360, the row entrance's 420, the hero's ~500 — some object always finished first and
			// got carried the rest of the way by a stage still in motion.
			duration: nav ? 0 : TIER_MS,
			easing: TIER_CURVE,
			// margin-top interpolates between the two states rather than scaling one of them: OPEN (u=0) the
			// block contributes h − TIER_LIFT to the column, CLOSED (u=1) it contributes nothing at all
			// (margin-top = −h). Scaling −u·h instead would have left the lift applied at full close and
			// pulled the whole stage 32px too high on the way out.
			css: (t: number, u: number) =>
				`margin-top: ${-TIER_LIFT + u * (TIER_LIFT - h)}px; opacity: ${nav ? 1 : t};`
		};
	}

	// ── HOVER-REVEAL: THE GRANDCHILD TIER (Aug 8) ─────────────────────────────────────────────────────
	// The mirror of the grandparent tier, pointed DOWN — and the asymmetry is the point. An ancestor tier
	// opens ABOVE the parents row, so it pushes the whole stage down and every flight afterwards has to
	// know about the collapse (design §30, flight.ts pendingCollapse). A descendant tier opens INSIDE the
	// children section, below everything, so nothing above the card moves at all: no push, no collapse, no
	// FLIP measured against a layout that is about to change. `pendingCollapse()` keys on `.grandparent-tier`
	// specifically and must STAY that way — generalising it to "any tier" would hand every grandchild
	// promotion a phantom 145px correction for a collapse that never happens.
	//
	// THE HOVERED CHIP KEEPS ITS COLUMN. The first build removed its siblings from FLOW, which let the row
	// re-centre the survivor for free — and that was the wrong gesture: it slid the chip sideways out from
	// under the pointer that was hovering it. Sam: "it can just keep its position, but shift up if it's on
	// the second row." Leaving the siblings in flow at opacity 0 means NOTHING reflows, so x is preserved
	// by doing nothing at all, and the only movement is a translateY of one row pitch when the chip is not
	// already on the top row. The slot's height is collapsed to that one row so the tier below still hangs
	// directly off the chip rather than under an empty second row.
	//
	// It is also strictly less machinery: no chips leave, so there are no outros, no pins, and no captured
	// rects to pin against.
	// The SAME hold as the parents tier. Walked 1800 → 1200 → HOVER_INTENT_MS (Sam): a tier is a tier, and
	// two different holds for the same gesture is a rule the hand has to learn twice.
	const CHILD_INTENT_MS = HOVER_INTENT_MS;
	let childHoverTimer: ReturnType<typeof setTimeout> | null = null;
	let focusedChildId = $state<string | null>(null);
	// Armed on CLICKCAPTURE, and safe there for the one reason §6 permits — it changes no geometry, it only
	// decides how this tier LEAVES. (The ancestor tier's collapse flag had to be split out of its
	// clickcapture flag for exactly the geometry reason; nothing here touches layout, so one flag serves.)
	let childClosingForNav = $state(false);
	let shakeChildId = $state<string | null>(null);
	let childShakeTimer: ReturnType<typeof setTimeout> | null = null;
	// How far the hovered chip rises, in px — 0 when it is already on the top row. Measured at reveal from
	// the row it is standing in, never computed from an index: the row a chip lands on is a wrap decision
	// made by the layout at the current viewport width, and index arithmetic would be a second, disagreeing
	// answer to a question the DOM has already answered.
	let childRiseY = $state(0);
	// Where the tier's connector hangs, as an offset from the stage centre. The GRANDCHILDREN sit in a
	// normal centred row like any children row, but the line and its label belong to ONE chip, so they hang
	// off that chip wherever it happens to be — Sam: "it's ok that the vertical line and Ten Children text
	// comes off the chip on the far right." Measured at reveal from the chip itself, never from an index.
	let childConnectorX = $state(0);
	// The chips' opacity/transform transitions may exist ONLY while this gesture is running or unwinding.
	// Left on `.flight` unconditionally they applied to every navigation as well, and collided with the
	// demote's atomic swap: `revealPending` exposes the landed chip as a STEP (fade 0) and a 200ms CSS
	// transition turned that step into a fade that raced its own WAAPI reveal — the demoted card FLASHED
	// once after it had already settled in its child seat. Sam: "that should not happen, especially there
	// in his final position." A settling window keeps the fade-back on dismissal without ever being live
	// during a flight.
	// The children slot's height, driven explicitly in px. A CSS transition CANNOT run from `auto`, so the
	// class-only version snapped the slot up by the rows it was dropping — instantly — while the hovered
	// chip rose over the tier's clock. The tier hangs off the slot's bottom, so it arrived 87px early and
	// its first chips were painted 17px INTO the children row (measured). Two explicit values on one clock
	// keep the slot's bottom and the chip's bottom together for every frame.
	let childSlotH = $state<number | null>(null);
	let childSlotRaf = 0;
	// Held for GC_EXIT_MS after the tier is dismissed: the chip stays risen, the siblings stay hidden and
	// the slot stays collapsed until the grandchildren have finished fading. Everything that reads the
	// focused layout reads `activeChildId`, so the hold is invisible to the rest of the file.
	let heldChildId = $state<string | null>(null);
	let childHoldTimer: ReturnType<typeof setTimeout> | null = null;
	let childSettling = $state(false);
	let childSettleTimer: ReturnType<typeof setTimeout> | null = null;

	/** The rects of just the FIRST row of a wrapped chip set — the row the connector has to reach. */
	function firstRowRects(els: Element[], top: number): DOMRect[] {
		return els
			.map((e) => e.getBoundingClientRect())
			.filter((r) => Math.abs(r.top - top) < 2)
			.sort((a, b) => a.left - b.left);
	}

	/** One child's own children, by id — the grandchildren payload is a flat array tagged `via_parent_id`. */
	function childrenOf(childId: string): PersonCompact[] {
		return (f.neighborhood?.grandchildren ?? []).filter((g) => g.via_parent_id === childId);
	}
	const revealedGrandchildren = $derived(
		focusedChildId ? childrenOf(focusedChildId) : ([] as PersonCompact[])
	);
	/** The child whose layout is in force — the one being hovered, or the one still being let go of. */
	const activeChildId = $derived(focusedChildId ?? heldChildId);
	// How far the grandchild ROW is shifted so its nearest end sits under the hovered chip. The row is
	// centred like any children row, and the connector hangs off ONE chip — so when that chip is out at the
	// edge, a centred row leaves the line pointing at nothing (measured on Elizabeth Guest: her line hung
	// over bare ground while her only child sat centred, half the stage away). Nothing to do when the chip
	// is already within the row's span; otherwise the row slides just far enough for its first or last chip
	// to sit under the line, and no further.
	let gcRowX = $state(0);
	/** The grandchild row's own connector label, counted off the revealed set exactly as childrenLabel is. */
	const grandchildLabel = $derived.by(() => {
		const n = revealedGrandchildren.length;
		if (!n) return null;
		const dy = revealedGrandchildren.filter((g) => g.dy_young).length;
		let base = `${cardinalWord(n)} ${n === 1 ? 'child' : 'children'}`;
		if (dy > 0) base += ` (${cardinalWordLower(dy)} died young)`;
		return base;
	});

	function clearChildHoverTimer() {
		if (childHoverTimer) clearTimeout(childHoverTimer);
		childHoverTimer = null;
	}
	/** Close the tier and forget any pending intent — on leave, and on every navigation. */
	function closeChildTier(settle = true) {
		clearChildHoverTimer();
		cancelChildDismiss();
		if (childSettleTimer) clearTimeout(childSettleTimer);
		// `settle` false on a NAVIGATION: the chips are leaving the page, the army owns their motion, and a
		// CSS transition alive on them during a flight is exactly what caused the post-landing flash.
		cancelAnimationFrame(childSlotRaf);
		if (childHoldTimer) clearTimeout(childHoldTimer);
		const wasOpen = !!focusedChildId;
		if (settle && wasOpen) {
			// HOLD: the tier unmounts now (its chips fade where they stand), but the focused layout stays in
			// force until they are gone. Only then does the slot give its height back, the chip drop and the
			// siblings return — so no generation is ever visible in another's row.
			heldChildId = focusedChildId;
			focusedChildId = null;
			childHoldTimer = setTimeout(() => {
				heldChildId = null;
				childSettling = true;
				const slot = document.querySelector<HTMLElement>('.page-container > .children-slot');
				childSlotH = slot ? Math.round(slot.scrollHeight) : null;
				childSettleTimer = setTimeout(() => {
					childSettling = false;
					childSlotH = null;
				}, CHILD_FADE_BACK_MS);
			}, GC_EXIT_MS);
			return;
		}
		heldChildId = null;
		childSettling = false;
		childSlotH = null;
		focusedChildId = null;
	}
	// The siblings step aside FIRST, and the grandchildren only start once they are gone. Overlapped, the
	// two read as one muddle and — measured — a grandchild reached 8px into a row of children that were
	// still visible, which is the army-row rule broken by a hundredth of a second rather than by geometry.
	// Sequenced, each gesture is legible on its own. Sam: "we'll quickly fade those out to hidden."
	// The siblings step aside over CHILD_FADE_OUT_MS, and the grandchildren start just BEFORE they are
	// finished — a short deliberate overlap, so the two reads as one exchange rather than two events with a
	// pause between them. Sam: "I want to feel some kind of flip moment of connection between outgoing
	// child chips and incoming grandchildren." Kept to a few frames: any more and a generation is visibly
	// standing in another's row, which is the rule this sequencing exists to protect.
	const CHILD_STEP_ASIDE_MS = 160;
	// LEAVING IS SUBTLE. Once the pointer is off the chip the user's attention has already moved on, so the
	// exit does not need — and must not have — a journey of its own. A quick fade with 10px of drift reads
	// as "gone" without asking to be watched; the full army march down the page was a turbo move nobody was
	// looking at, and on a page with several children rows it swept straight through them.
	const GC_EXIT_MS = 180;
	const GC_EXIT_DRIFT = 10;
	// And NOTHING COMES BACK UNTIL THEY ARE GONE. Sam: "don't bring the child chips back until grandchildren
	// chips are not visible to prevent any overlap." The hovered chip's drop, the slot's re-expansion and
	// the siblings' fade-in all wait out the exit — so the two generations are never on screen together,
	// which is the same army-row rule the arrival already obeys, applied to the way out.
	// Long enough to cover BOTH halves of the return: the siblings' fade-in and the hovered chip's drop back
	// to its own row, which rides the tier's 420ms clock. Cut short, the transform snaps at the very end.
	const CHILD_FADE_BACK_MS = 470; // long enough to cover the fade-back and the chip's drop to its own row
	function onChildEnter(e: PointerEvent, id: string) {
		clearChildHoverTimer();
		if (focusedChildId === id) return;
		childHoverTimer = setTimeout(() => {
			if (childrenOf(id).length) {
				// How far this chip has to rise: its own row's top minus the FIRST row's top. Both read from
				// the DOM in the same frame, so a wrap at any viewport width answers correctly.
				const chips = [
					...document.querySelectorAll<HTMLElement>('.page-container > .children-slot > .flight')
				];
				const tops = chips.map((el) => el.getBoundingClientRect().top);
				const mine = chips.find((el) => el.dataset.flightId === id)?.getBoundingClientRect().top;
				childRiseY = mine != null && tops.length ? Math.round(mine - Math.min(...tops)) : 0;
				const chip = chips.find((el) => el.dataset.flightId === id);
				const stage = document.querySelector('.page-container');
				if (chip && stage) {
					const c = chip.getBoundingClientRect();
					const st = stage.getBoundingClientRect();
					childConnectorX = Math.round(c.left + c.width / 2 - (st.left + st.width / 2));
				}
				childClosingForNav = false; // a fresh reveal dismisses the hover's way again
				// Pin the slot at the height it currently HAS, then collapse it to one row on the next frame,
				// so the transition has two real values to run between.
				const slot = document.querySelector<HTMLElement>('.page-container > .children-slot');
				const rowH = chips[0]?.getBoundingClientRect().height ?? 75;
				if (slot) {
					childSlotH = Math.round(slot.getBoundingClientRect().height);
					cancelAnimationFrame(childSlotRaf);
					childSlotRaf = requestAnimationFrame(() => (childSlotH = Math.round(rowH)));
				}
				if (childHoldTimer) clearTimeout(childHoldTimer);
				heldChildId = null;
				gcRowX = 0;
				focusedChildId = id;
				// Measured a frame later, once the row exists. x-only, so it is safe to read while the chip
				// is still rising and the slot still collapsing — neither of those moves anything sideways.
				requestAnimationFrame(() => {
					const row = document.querySelector('.grandchild-tier .children-slot');
					// Aligned to the LINE, not to the chip. Both should be the chip's centre in principle, but
					// the connector is centred within the tier BLOCK while the row is centred on the stage, and
					// those two centres are not required to agree — measured, they differed by 6px and the line
					// missed its chip by exactly that. Reading the thing that has to connect removes the
					// assumption instead of correcting for it.
					const lineEl = document.querySelector('.grandchild-tier .connector-line');
					const gcs = row ? [...row.querySelectorAll('.flight')] : [];
					if (!row || !lineEl || !gcs.length) return;
					const lineRect = lineEl.getBoundingClientRect();
					const cx = lineRect.left + lineRect.width / 2;
					const top = Math.min(...gcs.map((e) => e.getBoundingClientRect().top));
					const firstRow = firstRowRects(gcs, top);
					// SOMEBODY MUST BE UNDER THE LINE. Covered already → do not move the row at all; the
					// default centring is right whenever it happens to work. Otherwise slide it by the
					// SMALLEST amount that puts the nearest chip under the line. Both failures this must
					// answer are the same defect: the line off the end of a short row (Sam's Elizabeth Guest
					// screenshot) and the line in the 12px GAP between two chips of a long one — measured 6px
					// of bare ground on a row that comfortably spanned the chip.
					// CENTRE the nearest chip on the line, not merely bring it under one. Shifting by the
					// smallest amount that made contact put the line on a chip's outer EDGE — technically
					// connected, visibly wrong (Sam's Samuel Hinckley screenshot). Centring is also naturally
					// a no-op when a chip is already sitting under the line, so there is no separate case for
					// "already fine": the shift just comes out at ~0.
					let best = Infinity;
					for (const r of firstRow) {
						const d = cx - (r.left + r.width / 2);
						if (Math.abs(d) < Math.abs(best)) best = d;
					}
					if (!Number.isFinite(best)) return;
					// CLAMPED to the stage. A full-width row has no slack, and centring a chip on a line near
					// the edge would push the far end of the row off screen; better an off-centre connection
					// than chips nobody can see. When the row is wider than the stage there is no legal shift
					// at all, and it stays where the layout put it.
					const stageR = document.querySelector('.page-container')?.getBoundingClientRect();
					const rowLeft = Math.min(...firstRow.map((r) => r.left));
					const rowRight = Math.max(...firstRow.map((r) => r.right));
					const PAD = 8;
					let shift = best;
					if (stageR) {
						const lo = stageR.left + PAD - rowLeft;
						const hi = stageR.right - PAD - rowRight;
						shift = lo > hi ? 0 : Math.max(lo, Math.min(hi, best));
					}
					gcRowX = Math.round(shift);
				});
			} else {
				// NO CHILDREN TO SHOW — the chip shakes its head, exactly as a childless parent does. An
				// answer beats a hover that does nothing and leaves the user holding still waiting for it.
				if (childShakeTimer) clearTimeout(childShakeTimer);
				shakeChildId = id;
				childShakeTimer = setTimeout(() => (shakeChildId = null), SHAKE_MS);
			}
		}, CHILD_INTENT_MS);
	}
	/** Cancel a PENDING reveal when the pointer leaves before the intent fires. Never closes an OPEN tier —
	 *  that is the keep-alive region's job, for the same reason it is on the parent side. */
	function onChildLeave() {
		clearChildHoverTimer();
	}
	let childDismissTimer: ReturnType<typeof setTimeout> | null = null;
	function cancelChildDismiss() {
		if (childDismissTimer) clearTimeout(childDismissTimer);
		childDismissTimer = null;
	}

	/** A grandchild chip ARRIVING — the house entrance for a children row, reused rather than reinvented.
	 *
	 *  `revealPending` already says what an arriving child row does: fade in while settling DOWN from above,
	 *  on the row clock and the row curve, because the card sits above the children and that is where they
	 *  come from. The ONE thing that cannot be copied verbatim is the distance: that entrance travels a full
	 *  tier, and a full tier above these chips is the children row itself. So the travel is the gap that
	 *  actually exists here — the chip's own top to the block's top, i.e. the connector's height — which
	 *  starts them level with the bottom edge of the child they belong to and never a pixel above it.
	 *
	 *  (The first build clipped a growing box instead, which Sam rejected on sight and correctly: "I don't
	 *  do the scroll banner reveal style, the chips are representing individuals." A card is an object that
	 *  moves, not content that is uncovered.)
	 */
	function gcArrive(node: Element) {
		const tier = (node as HTMLElement).closest('.grandchild-tier');
		const gap = tier
			? Math.max(0, Math.round(node.getBoundingClientRect().top - tier.getBoundingClientRect().top))
			: 0;
		return {
			delay: CHILD_STEP_ASIDE_MS, // the siblings clear the rows before anyone descends into them
			duration: TIER_MS,
			easing: TIER_CURVE,
			css: (t: number, u: number) => `opacity: ${t}; transform: translateY(${-u * gap}px);`
		};
	}

	/** A grandchild chip LEAVING. Two gestures again, and neither of them is a fold.
	 *
	 *  HOVER DISMISSAL: army style, exactly as Sam specified it at the outset — "the grandchildren chips
	 *  fade out and down." Pinned at the rect it was standing in so the block can give its height back
	 *  WITHOUT dragging it, and marching DOWN, away from the children row that is fading back in above it.
	 *  The clip version folded them upward instead, straight through the returning siblings.
	 *
	 *  NAVIGATION: straight to flyOut, which owns the pin, the march and the alpha.
	 */
	function gcExit(node: Element, params: { key: string }) {
		if (childClosingForNav) return flyOut(node, params);
		const r = node.getBoundingClientRect();
		const pin = `position: fixed; left: ${r.left}px; top: ${r.top}px; width: ${r.width}px; height: ${r.height}px; margin: 0; `;
		return {
			duration: GC_EXIT_MS,
			easing: cubicOut,
			css: (t: number, u: number) =>
				`${pin}z-index: -1; opacity: ${t}; transform: translateY(${u * GC_EXIT_DRIFT}px);`
		};
	}

	/** The tier connector arrives LAST, and separately. Attached to the top of the descending row it read
	 *  as the thing pulling the chips down; held back until they have landed, it reads as what it is — a
	 *  line drawn between a chip and the children it has just been shown to have. Delayed by the unfold's
	 *  own clock rather than a number of its own, so it can never drift out of step with it. */
	function connectorFade(_node: Element, _p: unknown, opts?: { direction?: string }) {
		return {
			// The delay is an ARRIVAL rule — the line is held back until the chips have landed, which is now
			// their own delay plus their clock. On the way out it must not be held back at all, or it hangs
			// under a row that has already gone.
			delay: opts?.direction === 'out' ? 0 : CHILD_STEP_ASIDE_MS + TIER_MS,
			duration: opts?.direction === 'out' ? 140 : 220,
			easing: cubicOut,
			css: (t: number) => `opacity: ${t * 0.75};`
		};
	}

	/** A tier chip's outro — two different events remove this row, and they are not the same gesture.
	 *
	 *  HOVER DISMISSAL: the row retracts as one object, chips included. Duration 0 and no css of its own,
	 *  so the chip simply rides the block's collapse — the behaviour verified in 2fa6e69a ("the tier leaves
	 *  without flying"), and the reason a bare `out:flyOut` here would be wrong: with no navigation there is
	 *  no pan direction and no rect snapshot, so flyOut would fall through to its generic 28px drift and the
	 *  chip would fly on a dismissal that is not supposed to be a flight.
	 *
	 *  NAVIGATION: the chip IS a row leaver, so it hands straight to flyOut and gets exactly what every
	 *  other chip on the stage gets — pinned at its click-time rect (so the collapsing block cannot drag it
	 *  upward, which is what made the animated close unusable the first time), the army's march and alpha,
	 *  the hand-off to the spouse notch if it is the other grandparent, and held invisible for the flight if
	 *  it is the chip that was clicked, because that chip is becoming the card.
	 *
	 *  `|global` IS LOAD-BEARING, and its absence is invisible in the source. A Svelte outro is LOCAL by
	 *  default: it plays when the element's own block is destroyed, and NOT when an ancestor block is. This
	 *  chip lives inside the tier's `{#if}`, and closing the tier destroys that `{#if}` — an ancestor — so
	 *  without the modifier this function is never called at all. Measured: two visible copies of the
	 *  clicked grandparent, the chip riding the collapse up out of the window while the card grew out of
	 *  its seat, which is the exact illusion break that made the animated close unusable the first time
	 *  (handoff §6). It read as "the outro is wrong" and was really "the outro never ran". */
	function tierChipExit(node: Element, params: { key: string }) {
		if (!tierClosingForNav) return { duration: 0 };
		return flyOut(node, params);
	}

	// WHICH SEAT A DEMOTING CARD IS SHRINKING INTO, so its chip-face can wear the destination's own face
	// rather than a generic one. It was hard-coded relation="parent", which stayed invisible until
	// died-young shading arrived: the "(died young)" suffix renders ONLY for a child (a sibling puts it on
	// its own line), so a demoting child travelled reading "1628–1629" and gained "(died young)" the
	// instant the real chip took over (Sam).
	//
	// Inferred from the PERSON, not from the destination, and that is deliberate. The obvious version —
	// "does the card we are leaving count the incoming person among its parents" — cannot work here: the
	// demoting card is OUTROING, and Svelte stops updating a subtree that is being removed, so it still
	// reads the old person as current and always answered 'parent'. Measured: 20 frames, all wrong.
	//
	// Died-young is a sound proxy instead. Someone who died at 15 or younger has no children, so a
	// died-young card can only ever be descending into a CHILD seat; nothing else can demote into one
	// carrying that suffix. And for anyone who did not die young the prop changes nothing visible — it
	// gates only this suffix and the spouse union row, neither of which they render here.
	function demoteSeatRelation(card: typeof f): 'parent' | 'child' {
		return card?.neighborhood?.focus?.dy_young ? 'child' : 'parent';
	}
	const childrenTotal = $derived(roster.children.length);
	// WHERE THE CHILDREN ROW BREAKS — Sam's rules, Aug 9. See $lib/state/childRows.ts for the two rules
	// (four per row maximum, never strand a single child) and for every count worked through.
	const childCols = $derived(chipColumns(childrenTotal));
	const gcCols = $derived(chipColumns(revealedGrandchildren.length));
	const childrenDiedYoung = $derived(roster.children.filter((c) => c.dy_young).length);
	const isEasterEgg = $derived(f.person.classification?.is_easter_egg ?? false);

	// THREE sources, because two of them are routinely absent. Jackson Pynchon (HD6314) carries neither
	// `bio.first_name` nor `name.first_name` nor a compact `fn`, so the connector fell back to a bare
	// "Parents" while every other card says "<name>'s parents" — a silent downgrade nobody would think to
	// look for. The DISPLAY NAME's first token is the last resort: it is what the card itself is already
	// showing, so a label derived from it can never disagree with the heading above it.
	const focalFirstName = $derived(
		f.person.bio?.first_name ??
			f.person.name?.first_name ??
			f.neighborhood.focus?.fn ??
			f.neighborhood.focus?.n?.trim().split(/\s+/)[0] ??
			null
	);
	const parentsLabel = $derived(
		focalFirstName ? `${possessive(focalFirstName)} parents` : 'Parents'
	);

	const childrenLabel = $derived.by(() => {
		if (childrenTotal === 0) return null;
		const countWord = cardinalWord(childrenTotal);
		const childWord = childrenTotal === 1 ? 'child' : 'children';
		let base = `${countWord} ${childWord}`;
		if (childrenDiedYoung > 0) {
			const dyWord = cardinalWordLower(childrenDiedYoung);
			base += ` (${dyWord} died young)`;
		}
		return base;
	});

</script>

<!-- Phase 3b: the midnight field behind the STAGE (person page only; fixed, z:0). Cards float above it. -->
<Field />
<!-- THE LEFT TIMELINE (design §3.6). Fixed chrome at the window's edge, mounted HERE beside Field and
     ShuffleNotables rather than inside .page-container: it is a ruler and must keep its size while the
     stage scales, and a fixed element inside a transformed ancestor re-bases to that ancestor. -->
<TimelineRail />
<!-- SHUFFLE NOTABLES (roadmap §13, design §22.8) — the deck dealt at random. Mounted beside Field so the
     two pieces of fixed chrome live together, and gated on `familyLanded`, the SAME landing signal the
     card and connector use, so the button can never disagree with the flight lock about whether a flight
     is in progress. -->
<ShuffleNotables settled={familyLanded} />

<!-- THE ASCENSION'S SURROUND (roadmap §40) — the midnight veil and the way out. Mounted HERE, beside the
     other screen chrome, rather than inside `.page-container`: it must cover the whole window, which is
     not something a stage child can promise, and a stage that is ever transformed would re-base it
     (design §33.1). It gates itself on `ascension.active`, so on every ordinary card it renders nothing
     at all and the current UX is untouched. -->
<Ascension onexit={descend} />
<ConnectModal />
<!-- The passage layer — transient decade markers that rush past during a far CC arrival (flight-only). -->
<DeckRiffle />
<!-- The keep-alive test listens on the WINDOW, not on the stage. On .page-container it simply stopped
     firing once the pointer left the container's box — so moving the mouse right off the stage, the
     clearest "not interested" there is, was the one gesture that could never dismiss the tier. -->
<!-- The flag is armed on the CLICK, in the capture phase — before warmPersonLinks handles it and long
     before the navigation effect queues the tier's removal. Setting it inside that effect was too late:
     Svelte had already created the outro, so the duration it read was the animated one (measured — the
     chip still flew to y=−14). Arming it here changes no geometry, so the click still lands where the
     user aimed; it only decides how the row LEAVES. -->
<svelte:window
	onpointermove={(ev) => { onStagePointerMove(ev); onChildTierPointerMove(ev); }}
	onclickcapture={armTierNavClose}
	onmouseout={onWindowMouseOut}
/>


<div
	class="page-container"
	class:in-orbit={ascension.active}
	class:in-founder={ascension.founder}
	class:tier-nav-close={tierClosingForNav}
	class:tier-collapsed={tierCollapsed}
	data-density={stage.density}
	data-tier={stage.tier}
	style="--tier-ms: {TIER_MS}ms; --tier-lift: {TIER_LIFT}px"
	use:warmPersonLinks
>
	<!-- THE GRANDPARENT TIER (hover-reveal). In FLOW, deliberately: everything below is pushed down by
	     this block's own height, which is what makes the stage move as one without a single row being
	     told to move. Centred on the hovered CHIP via translateX — this tier belongs to one parent, and
	     a row centred on the stage would claim to be both parents' at once. -->
	<!-- data-tier-span="2" is the tier telling the flight how far a click from inside it travels: two
	     generations, so the army marches two pitches (flight.ts marchTravel). Stated on the BLOCK rather
	     than on each chip, because it is a fact about the row, and read at click time by navigate.ts via
	     closest() — the same ancestor walk that already resolves a chip's flight box. -->
	{#if revealedGrandparents.length}
		<!-- `left`, NOT `transform: translateX`. The two centre this row identically and neither disturbs
		     layout, but a transform makes the element the CONTAINING BLOCK for its position:fixed
		     descendants — and on a navigation every chip in here is pinned position:fixed at a VIEWPORT
		     rect by flyOut. Under a transform those coordinates would be re-based against this block and
		     every tier leaver would pin to the wrong place. position:relative creates no such containing
		     block. (will-change: margin-top/opacity is safe for the same reason — neither property is one
		     that creates one.) -->
		<div
			class="grandparent-tier"
			class:nav-close={tierClosingForNav}
			data-tier-span="2"
			style="left: {gpOffsetX}px"
			in:tierPush
			out:tierPush
		>
			<div class="parents-slot">
				{#each revealedGrandparents as gp (gp.id)}
					<!-- A REAL FLIGHT BOX, exactly like a resident parent chip. This is what lets the tier take
					     part in a navigation instead of merely vanishing from one: data-flight-id makes the
					     clicked chip resolvable (so it is held invisible while the card grows out of its seat,
					     and so the row + demote clocks derive from its true rect instead of falling back to
					     constants), and the click-time rect snapshot is what pins this chip out of flow and
					     what carries the other grandparent across to the spouse notch.
					     data-flight-dir="up" states the obvious — this is an ancestor row — which is also why
					     rowTravel had to start measuring the ADJACENT ancestor row rather than the topmost. -->
					<div
						class="flight"
						data-flight-dir="up"
						data-flight-id={gp.id}
						data-tx={gp.t?.x}
						data-ty={gp.t?.y}
						animate:flip={{ duration: flipMs }}
						out:tierChipExit|global={{ key: gp.id }}
					>
						<PersonBox person={gp} relation="parent" dimmed={gp.dy_young} orbit={f.orbit === true} />
					</div>
				{/each}
			</div>
			<div class="connector connector-parents landed">
				<div class="connector-line"></div>
				<span class="connector-label">{possessive(parentFirstName(revealedParentId))} parents</span>
				<div class="connector-line"></div>
			</div>
		</div>
	{/if}

	<div
		class="parents-slot"
		class:cc-hidden={ccRoster.hidden}
		class:tier-above={!!revealedParentId}
	>
		{#each roster.parents as parent (parent.id)}
			<!-- data-flight-id lets a shrinking card find this box. animate:flip glides survivors;
			     on leave, out:flyOut pins this box position:fixed at its click-captured rect, which
			     OVERRIDES flip's (post-insertion, wrong) fix() pin so leavers don't teleport. -->
			<div
				class="flight"
				data-flight-dir="up"
				data-flight-id={parent.id}
				data-tx={parent.t?.x}
				data-ty={parent.t?.y}
				in:morphIn={{ id: parent.id }}
				out:flyOut={{ key: parent.id }}
				animate:flip={{ duration: flipMs }}
			>
				<PersonBox person={parent} relation="parent" orbit={f.orbit === true} />
				<!-- THE ONLY WAY UP. Rendered only when there is something to show, so its ABSENCE is the
				     answer for a parent with no parents — the shake used to be that answer, and had to be
				     performed after the user had already committed to a hover. A real <button>, so it is
				     focusable and operable from the keyboard, which the pointer-only reveal never was.
				     THE NAME IS GONE (Sam): "Show parents" for everyone. The label sits ON the chip it acts
				     on, so naming the person again was restating what the reader is already looking at —
				     and it made the two labels different lengths, which drew the eye to the longer one. The
				     tier's own connector still says whose parents these are, which is where that belongs. -->
				{#if grandparentsOf(parent.id).length}
					<button
						type="button"
						class="see-parents"
						class:tier-open={!!revealedParentId}
						onclick={(e) => openGrandparentTier(e, parent.id)}
					>
						Show parents
					</button>
				{/if}
			</div>
		{/each}
	</div>

	<div
		class="connector connector-parents"
		class:landed={familyLanded}
		class:cc-hidden={ccRoster.hidden}
	>
		{#if hasParents}
			<div class="connector-line"></div>
			<span class="connector-label">{parentsLabel}</span>
			<div class="connector-line"></div>
		{/if}
	</div>

	<!-- Featured slot: a single grid cell so the leaving + entering cards overlap
	     (no layout doubling) during the morph. The card is a keyed single-item list
	     so it's created/destroyed on focus change — its send/receive pair with the
	     box that the same person occupies on the other side (child→featured, old
	     featured→parent), giving the card↔box content cross-dissolve. -->
	<div
		class="featured-slot"
		style={mounted && cardHeight ? `height: ${cardHeight + bladeHeight}px` : ''}
	>
		<!-- Spouse chips: dock into the carved notch and swap LATERALLY. Clicking a chip
		     makes that spouse featured — their card growFroms the click-captured chip rect
		     (warmPersonLinks already captures it on any /person link), while the previous
		     focus shrinkTos onto its NEW chip here, located via data-flight-id.

		     ORDER MATTERS: this block is rendered BEFORE the featured {#each} on purpose.
		     The outgoing card's out:shrinkTo resolves its destination with a LIVE
		     querySelector at outro-config time, so the destination box must already be
		     mounted by then. Svelte runs block effects in source order, so an earlier
		     block mounts first — which is exactly why child→featured worked (its parent
		     destination sits in .parents-slot, above this slot) and spouse-swap did NOT
		     (the chip used to render AFTER the card → not yet mounted → box null →
		     shrinkTo silently degraded to duration:0, a fade). Moving the notch ahead of
		     the card makes the new chip mount first, so shrinkTo measures a real rect.
		     The notch is position:absolute; z-index:1, so source order has no visual or
		     stacking effect — chips still paint on top and dock into the carved notch.

		     Kept always mounted (no {#if}) so a chip's LOCAL outro still fires when the
		     set empties to zero — matching the parents/children slots. -->
		<!-- data-flight-id lets a shrinking card land on a chip; spouses fly LATERAL. The .flight box
		     stays UNTRANSFORMED so shrinkTo reads its true rect. Entrance gates on the card LANDING
		     (in:markPending → revealed by the featuredLanded effect); animate:flip glides survivors;
		     out:flyOut pins a LEAVING chip at its click-captured rect. These are the NAVIGATION
		     transitions; carousel paging is a pure CSS transform on .spouse-strip and fires none of
		     them (the keyed each doesn't change on a page). The .flight (with animate:flip) must be
		     the DIRECT child of the keyed each, so it's inlined per branch. -->
		<!-- The mask + strip + each are ALWAYS mounted (never behind an {#if}) so a chip's in:markPending
		     / out:flyOut / animate:flip fire as ADDED/REMOVED items on navigation — the frozen
		     landing-gate. Carousel geometry (fixed mask width + clip-path + strip transform) is applied
		     by CONDITIONAL STYLE only when spouseCount > 3; at ≤3 the mask/strip collapse to a plain
		     right-anchored flex row (the untouched baseline layout). Only the carets are gated. -->
		<div class="spouse-notch" data-spouse-offset={hasCarousel ? spouseOffset : 0}>
			<div
				class="spouse-mask"
				class:carousel={hasCarousel}
				style={hasCarousel ? `width: ${NOTCH_W}px; clip-path: ${maskClip};` : ''}
			>
				<div
					class="spouse-strip"
					class:paging={pagingLock}
					style:transform={hasCarousel ? `translateX(${stripX}px)` : 'none'}
				>
					{#each roster.spouses as chip, i (chip.spouse.id)}
						<!-- data-offwindow: this chip is OUTSIDE the visible 3-window (mask-clipped, invisible
						     at rest). out:chipExit reads it so an off-window leaver exits at opacity 0 / no
						     travel instead of painting off-card once the mask adopts the incoming card's clip
						     state (Artifact B-residual). Frozen at the click-time offset when the chip leaves. -->
						<div
							class="flight"
							data-flight-dir="lateral"
							data-flight-id={chip.spouse.id}
							data-tx={chip.spouse.t?.x}
							data-ty={chip.spouse.t?.y}
							data-offwindow={hasCarousel && (i < spouseOffset || i >= spouseOffset + WINDOW)}
							in:markPending
							out:chipExit={{ key: chip.spouse.id }}
							animate:flip={{ duration: flipMs }}
						>
							<div class="chip-slide">
								<PersonBox
									person={chip.spouse}
									relation="spouse"
									orbit={f.orbit === true}
									marriageYear={chip.year}
									relationshipType={chip.rel}
									compact={useCompact}
								/>
							</div>
						</div>
					{/each}
				</div>
			</div>
			<!-- Bookend carets — ALWAYS mounted (same DOM node, never remounted → no flicker AND no
			     fresh-mount opacity flash: base opacity 0, .visible only ADDS 1 via a transition, so the
			     stale featuredLanded frame at flight start can never paint them at 1). Visibility is a
			     pure READ of hasCarousel + featuredLanded + canPage: they fade in with the chips on
			     landing, fade out on offset changes (last-window right caret fades out and stays out).
			     pointer-events:none while invisible; the paging lockout is enforced by pageStep's guard,
			     NOT by CSS, so the cursor stays pointer throughout the 420ms. -->
			<span class="caret-slot" style="right: {leftCaretRight}px">
				<Caret
					char="‹"
					class="caret-left"
					visible={hasCarousel && featuredLanded && canPageLeft}
					disabled={pagingLock || !(hasCarousel && featuredLanded && canPageLeft)}
					onclick={pageBack}
					ariaLabel="Previous spouses"
				/>
			</span>
			<span class="caret-slot" style="right: {rightCaretRight}px">
				<Caret
					char="›"
					class="caret-right"
					visible={hasCarousel && featuredLanded && canPageRight}
					disabled={pagingLock || !(hasCarousel && featuredLanded && canPageRight)}
					onclick={pageAdvance}
					ariaLabel="More spouses"
				/>
			</span>
		</div>
		{#if showSiblings}
			<!-- Slice 1: trigger + panel + nudge. Inside featured-slot so it travels with the card GROUP on the
			     nudge. Flow-placed right of the last spouse affordance (caret-aware). No carousel/flight yet. -->
			<SiblingPanel
				siblings={f.neighborhood.siblings}
				{cardHeight}
				anchorOffset={anchorOffsetFor(roster.spouses.length)}
				landed={featuredLanded && f.person.id === landedPersonId}
				mutating={siblingMutation}
				bind:open={siblingsOpen}
				bind:quiet={siblingsQuiet}
				onUserToggle={(o) => (siblingsPref = o ? 'open' : 'closed')}
			/>
		{/if}
		{#each [f] as cur (cur.person.id)}
			<div
				class="featured-flight"
				data-flight-dir="lateral"
				bind:clientHeight={cardHeight}
				in:growFrom
				out:shrinkTo={{ id: cur.person.id }}
				onintrostart={(e) => onIncomingStart(e.currentTarget)}
				onintroend={(e) => onIncomingLand(e.currentTarget)}
				onoutrostart={(e) => onOutgoingStart(e.currentTarget, cur.person.id)}
				onoutroend={(e) => onOutgoingEnd(e.currentTarget, cur.person.id)}
			>
				<FeaturedCard
					person={cur.person}
					spouses={cur.neighborhood.spouses}
					generationLabels={cur.generationLabels}
					burialCemetery={cur.burialCemetery}
					marriedIn={cur.neighborhood.focus?.sp === true}
					crossConnections={cur.crossConnections}
					institutionsById={cur.institutionsById}
					onbladeheight={(h) => onBladeHeight(cur.person.id, h)}
					settled={featuredLanded && cur.person.id === landedPersonId}
					pathsToThomas={cur.pathsToThomas}
					pathsSpouse={cur.pathsSpouse === true}
					firstName={cur.neighborhood.focus?.cf ?? focalFirstName}
					orbit={cur.orbit === true}
					founderSpouse={ascension.founderSpouse}
				/>
				<!-- Chip-face for the "flip early, land as a chip" relative demotion: a real PersonBox of
				     THIS person (identical to the parent/child box it becomes), pre-scaled to fill the card
				     and cross-faded in at the start of a demote, then shrunk with the card to land exactly
				     on the box. Inert (opacity 0) on resting/incoming/spouse cards.
				     `relation` is DERIVED rather than fixed — "identical to the box it becomes" has to hold
				     for the box's CONTENT too, and a child chip carries a "(died young)" suffix a parent
				     chip does not. See demoteSeatRelation. -->
				<div class="demote-chipface" inert>
					<!-- THE DEMOTE CHIP-FACE takes the orbit paper too, and reading it off `cur` rather than `f`
					     is the point: this face belongs to the card that is LEAVING, so during a crossing it
					     must wear the paper of the zone it came from, not the one being entered. -->
					<PersonBox
						person={cur.neighborhood.focus}
						relation={demoteSeatRelation(cur)}
						dimmed={cur.neighborhood.focus.dy_young}
						orbit={cur.orbit === true}
					/>
				</div>
			</div>
		{/each}
		<!-- THE CROSS-CONNECTIONS BLADE. A sibling of the card inside the slot, not a child of it: the
		     card is clip-path'd to its notch silhouette and every card stacks in grid cell 1/1, so the
		     blade auto-places into the row beneath and inherits the slot's centring and z-lift. The slot
		     reserves cardHeight + bladeHeight (above), which keeps the children connector below it. -->
	</div>

	{#if childrenTotal > 0}
		<div
			class="connector connector-children"
			class:connector-no-label={isEasterEgg}
			class:landed={familyLanded}
			class:cc-hidden={ccRoster.hidden}
			class:child-tier-open={!!activeChildId}
		>
			{#if !isEasterEgg}
				<div class="connector-line"></div>
				<span class="connector-label">{childrenLabel}</span>
				<div class="connector-line"></div>
			{:else}
				<div class="connector-line connector-line-full"></div>
			{/if}
		</div>
	{/if}

	<!-- NO `tier-open` CLASS ANY MORE. The grandparent tier used to fade this row out through it; the row
	     is now PUSHED by the tier's in-flow height like every other row on the stage, so there is no state
	     for it to carry. See the tombstone on `.children-slot` in the stylesheet. -->
	<div
		class="children-slot"
		class:cc-hidden={ccRoster.hidden}
		class:child-focus={!!activeChildId}
		class:child-settling={childSettling}
		style={childSlotH != null ? `height: ${childSlotH}px` : ''}
	>
		{#each roster.children as child, ci (child.id)}
			<!-- data-flight-id lets a shrinking card find this box. animate:flip glides survivors
			     (children shared across a spouse swap); out:flyOut pins a LEAVER position:fixed at
			     its click-captured rect, overriding flip's fix() (see parents). -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- The pointer handlers sit on the positioning wrapper for the same reason they do on a parent
			     chip: the chip's <a> is already focusable and already navigates, and the hover-reveal is a
			     pointer-only enhancement on top of it. -->
			<div
				class="flight"
				class:shake-no={shakeChildId === child.id}
				class:child-focused={activeChildId === child.id}
				class:child-dimmed={!!activeChildId && activeChildId !== child.id}
				style="grid-column: {childCols[ci] ?? 'auto'} / span 2; {activeChildId === child.id &&
				childRiseY
					? `--child-rise: ${childRiseY}px`
					: ''}"
				data-flight-dir="down"
				data-flight-id={child.id}
				data-tx={child.t?.x}
				data-ty={child.t?.y}
				onpointerenter={(e) => onChildEnter(e, child.id)}
				onpointerleave={onChildLeave}
				in:markPending
				out:flyOut={{ key: child.id }}
				animate:flip={{ duration: flipMs }}
			>
				<PersonBox person={child} relation="child" dimmed={child.dy_young} orbit={f.orbit === true} />
			</div>
		{/each}
	</div>

	<!-- THE GRANDCHILD TIER (hover-reveal). Below everything, so opening it moves NOTHING above the card —
	     the whole reason this tier is simpler than its ancestor twin. Its connector sits ABOVE its row
	     (mirroring the parents tier, whose connector sits below its own), so the line reads downward from
	     the hovered chip into the children it is about to show. -->
	{#if revealedGrandchildren.length}
		<!-- The BLOCK carries no transition of its own any more. It sits below everything, so its arrival
		     moves nothing, and every visible thing in it — the chips, the connector — has its own gesture.
		     A block-level animation here was what made the row read as a banner unrolling. -->
		<div class="grandchild-tier" data-tier-span="2">
			<div
				class="connector connector-children"
				style="transform: translateX({childConnectorX}px)"
				in:connectorFade
				out:connectorFade
			>
				<div class="connector-line"></div>
				<span class="connector-label">{grandchildLabel}</span>
				<div class="connector-line"></div>
			</div>
			<div class="children-slot" style="transform: translateX({gcRowX}px)">
				{#each revealedGrandchildren as gc, gi (gc.id)}
					<div
						class="flight"
						style="grid-column: {gcCols[gi] ?? 'auto'} / span 2"
						data-flight-dir="down"
						data-flight-id={gc.id}
						data-tx={gc.t?.x}
						data-ty={gc.t?.y}
						animate:flip={{ duration: flipMs }}
						in:gcArrive|global
						out:gcExit|global={{ key: gc.id }}
					>
						<PersonBox person={gc} relation="child" dimmed={gc.dy_young} orbit={f.orbit === true} />
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	/* ── THE STAGE'S OWN LABELS, IN THE ZONE ────────────────────────────────────────────────────────
	   "Sarah's parents", "Two children" and the rest are set in a grey chosen against parchment. In the
	   Ascension the ground is midnight, and that grey lands almost exactly between the two — too dark to
	   read, too light to disappear. Cream is the ink the zone already uses for the rail's years and the
	   blade's label, so this is joining an established palette rather than adding to it.
	   The stems keep their own treatment: they are structure, and structure should stay quiet. */
	.page-container.in-orbit :global(.connector-label) {
		color: var(--color-creamprimary);
	}
	/* ── THE FOUNDER SKIN, SCOPED TO THE VIEW RATHER THAN TO EACH CHIP ───────────────────────────────
	   The zone is a PLACE: while a founder is featured, everything wearing the orbit surface in that
	   view takes the founder's blue rule. Doing it here rather than threading a `founder` prop down to
	   every PersonBox is not a shortcut — a chip's rule should agree with the room it is standing in,
	   not with a fact about the person on it, and the room is exactly what this selector names. */
	.page-container.in-founder :global(.featured-card.orbit-card::before),
	.page-container.in-founder :global(.person-box.orbit-chip) {
		--zone-rule: var(--color-founderblue);
	}

	.page-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-height: 100vh;
		/* Above the fixed midnight Field (z:0) so the cards float on the night, never behind the motes. */
		position: relative;
		z-index: 1;
		/* PHASE 2.75 — THE FIRST CONSUMER OF THE FRAME UNIT, and the pattern every other geometry token
		   follows: the DESIGN CONSTANT stays legible at the call site and `--stage-u` multiplies it. A
		   pre-multiplied length would hide the 80 and the 32, and both of those numbers are decisions.
		   --stage-u defaults to 1 so SSR, /table, and any consumer mounted before the effect runs get the
		   roomy geometry rather than collapsing to zero. */
		padding-top: calc(80px * var(--stage-u, 1));
		padding-bottom: calc(80px * var(--stage-u, 1));
		/* THE TIMELINE GETS NO ROOM HERE, and that is a rule rather than an oversight. Sam, Aug 8, on a
		   build that had reserved the rail's width and pushed the card 48px right: "there is to be no
		   movement or re-sizing of the core UX elements and army rows to accommodate the timeline...
		   the core boxes and rows are front and center and we'll adjust the timeline to work around
		   that." The stage is the project; the rail is an instrument laid beside it. The rail overlaps
		   where it must and sits BEHIND the stage when it does. */
		padding-left: calc(32px * var(--stage-u, 1));
		padding-right: calc(32px * var(--stage-u, 1));
		/* The (later) spouse-carousel overhang + carets sit past the card's right edge; at narrow
		   viewports they'd extend the document and raise a horizontal scrollbar. Clip horizontally
		   at the stage so they never can (vertical scroll is unaffected by overflow-x). */
		overflow-x: clip;
		/* THE STAGE'S EMPTY MARGINS DO NOT CATCH THE POINTER. This box is full-width and full-height
		   even though it only ever paints a column down the middle, so it was swallowing every click and
		   hover aimed at the timeline rail beneath it — the rail's first interactive element, an anchor
		   portrait, could not be hovered at all despite being plainly visible.
		   `none` here plus `auto` on the children means the stage keeps every one of its own hit targets
		   and gives up only the dead space around them. Event DELEGATION is unaffected: `warmPersonLinks`
		   listens on this element and events still bubble to it from children that are themselves
		   pointer-active — pointer-events governs hit-testing, not propagation. */
		pointer-events: none;
	}

	/* Every direct child of the stage takes the pointer back — see the note on .page-container. */
	.page-container > :global(*) {
		pointer-events: auto;
	}

	/* The slot is exactly the card's bounding box (so the absolutely-positioned
	   spouse chips dock to the carved notch), AND a single grid cell so the leaving
	   and entering cards overlap there during the morph instead of stacking. */
	.featured-slot {
		position: relative;
		width: max-content;
		display: grid;
		justify-items: center;
		align-items: start; /* don't stretch cards to the explicit (gliding) slot height */
		overflow: visible; /* a taller leaving card overflows invisibly while it flies away */
		/* Glide the slot height between focuses so the children row moves in lockstep
		   with the card morph instead of snapping. cubic-bezier ≈ cubicOut. Duration MATCHES the
		   children directional entrance (revealPending, 300ms, same easing) so the row's layout glide
		   and the children's transform land TOGETHER — rect.top = layout(t)+transform(t) stays monotone,
		   no dip/jello. (Was 540ms, which outran the 300ms entrance and manufactured the child-row wobble.) */
		transition: height 300ms cubic-bezier(0.33, 1, 0.68, 1);
		/* Lift the ENTIRE slot (hero + demote + notch) above the resting parent/child rows so a
		   visible-by-design relative demote flies OVER those rows en route to its box. z-index on the
		   flying card alone can't do it — the slot forms a stacking context that would otherwise confine
		   the card's z below the later-in-DOM (and incoming-fading = opacity stacking-context) row boxes.
		   Inert at rest (card and rows never overlap). The demote still rides UNDER the hero via its own
		   z:1 < hero z:2 WITHIN this slot's context. */
		z-index: 1;
	}
	.featured-slot > .featured-flight {
		grid-area: 1 / 1;
		position: relative; /* positioning context for the absolutely-placed .demote-chipface overlay */
	}

	/* While a card flies (.flat added by transition lifecycle events) it renders as a
	   COMPLETE solid rounded card: the carved notch is swapped for the card's own --flat-shape
	   so the two cards don't animate around a corner cutout and blur together. The 8px rounding
	   is preserved (it's a rounded rectangle, not `none`); !important beats the article's inline
	   clip-path; it reverts the instant .flat is removed (notch re-forms, masked by the chips). */
	/* `.flat` is added at RUNTIME (classList, not markup) and `.featured-card` lives in the
	   child component, so both must be :global or Svelte tree-shakes this rule as "unused" and
	   silently strips it. `.featured-flight` stays scoped, keeping the rule bound to this page. */
	/* `notch-armed` (the anticipated notch, onIncomingStart) suspends the flattening WITHOUT clearing
	   `.flat` — the card is still in flight and still says so; it has simply reached a size where its
	   notch is worth carving, because a passenger is about to dock in it. */
	.featured-flight:global(.flat):not(:global(.notch-armed)) :global(.featured-card) {
		clip-path: var(--flat-shape) !important;
	}

	/* L3a "flip early, land as a chip": the demote's CHIP-FACE. A real PersonBox of the demoting
	   person (identical to the box it becomes). shrinkTo's tick counter-scales it every frame against
	   the shell's non-uniform morph so it renders at its true 220:75 aspect throughout (never
	   stretched), spans the shell's width, stays vertically centered, and lands at natural box size —
	   so the atomic swap is between two identical boxes. Cross-faded in over the first ~110ms of a
	   relative demotion (motion-masked, front-loaded) via the runtime .demoting class; inert +
	   opacity 0 on resting/incoming/spouse cards. Only the FACE flips — the shell is untouched. */
	.demote-chipface {
		position: absolute;
		top: 0;
		left: 0;
		/* HUGS ITS CHIP rather than restating its size. This was `220px / 75px` with the comment
		   "natural non-compact PersonBox (parent/child box) size" — true when there was one such size.
		   There are now four (parent 220x75, child 198x67.5, compact notch seat 160x65, sibling 119x54),
		   each multiplied by the frame unit, and the wrapper only ever needs to be exactly its child.
		   flight.ts measures this box to counter-scale the face, so letting it fit-content means the
		   measurement is right for every tier at every rung without a constant to keep in step. */
		width: max-content;
		height: max-content;
		transform-origin: top left;
		/* transform is set per-frame by shrinkTo's tick (counter-scaled to render undistorted); at rest
		   the face is opacity 0 so its untransformed box is never seen. */
		opacity: 0; /* at rest; the chip-face opacity is driven per-frame by shrinkTo's tick (geometry crossfade) */
		pointer-events: none;
	}
	/* GEOMETRY-KEYED CROSSFADE: the card's own face (.card-top + .footer) fade OUT and the .demote-chipface
	   fades IN entirely from shrinkTo's tick, keyed to SHELL WIDTH (overlapping bands) — no time-based CSS
	   opacity here anymore, so the two never blink and the chip name never paints billboard. The tick sets
	   inline opacity + transition:none on all three, so no CSS rule is needed (and none may conflict). */
	/* the wrap's drop-shadow is the object's shadow throughout; drop the chip-face's own shadow so a
	   scaled-up shadow-sm doesn't double it mid-flight. */
	.demote-chipface :global(.person-box) {
		box-shadow: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.demote-chipface {
			transition: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.featured-slot {
			transition: none;
		}
	}
	.spouse-notch {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 1;
	}

	/* Mask + strip are ALWAYS present (keeps the each persistent → landing-gate intact). At ≤3 both
	   collapse to content width → a plain right-anchored flex row = the untouched baseline layout.
	   The .carousel state (inline: fixed 496px width + clip-path) turns it into the sliding window;
	   clip-path (not overflow:hidden) lets drop shadows escape top/bottom while the left edge clips
	   chips sliding under the header. */
	.spouse-mask {
		width: max-content;
	}
	/* The strip holds ALL chips in one row and slides as ONE object; paging = a single transform.
	   Transition applies ONLY while .paging (a user page) — never on the navigation-time offset
	   reset, so the strip SNAPS on navigation and its chip rects never move under the demotion morph.
	   ~420ms easeOutBack (~5px overshoot-settle) so a page reads as travel-and-stop. */
	.spouse-strip {
		display: flex;
		gap: calc(8px * var(--stage-u, 1)); /* = CHIP_GAP, same dial */
		width: max-content;
		/* NO will-change/transform-creating property here: it would establish a containing block for
		   the position:fixed flyOut chips, so their viewport-coord pins would resolve relative to the
		   strip and fling them to the viewport edge mid-crossfade (Artifact B). The paging transform is
		   cheap enough without the GPU hint. */
	}
	.spouse-strip.paging {
		transition: transform 420ms cubic-bezier(0.34, 1.3, 0.64, 1);
	}
	@media (prefers-reduced-motion: reduce) {
		.spouse-strip.paging {
			transition: none;
		}
	}

	/* Carousel caret SLOT — positions the shared <Caret> at the notch seam by inline `right`, vertically
	   centred on the chip row. The caret's own hover LIFT lives on the inner button, so it composes with this
	   centring transform (different elements). The caret visual/behaviour lives in Caret.svelte (shared with
	   the sibling panel — one component, not a lookalike). */
	.caret-slot {
		position: absolute;
		top: 50%;
		z-index: 3;
		transform: translateY(-50%);
	}

	/* Flight wrappers are the keyed-each children that carry animate:flip (survivors glide) and
	   out:flyOut (leavers pin out of flow at their click-captured rect). They size to the PersonBox
	   inside and otherwise don't affect layout. */
	.flight {
		display: flex;
	}
	/* SCOPED TO THE PARENTS ROW, not to every .flight. It exists only to be the containing block for the
	   "see … parents" trigger; a bare `position: relative` on .flight would apply to spouse, child and
	   sibling wrappers too, and flight.ts measures all of them. With no offsets it changes no rect, and
	   flyOut's inline `position: fixed` still overrides it on a leaver. */
	.parents-slot > .flight {
		position: relative;
	}
	/* THE TRIGGER. Above the chip and hard against its right edge (Sam), so it points at the space the row
	   will come from and stays clear of the chip's own reading. Absolutely positioned, so it occupies no
	   layout and cannot move the row it sits on.
	   70% → 100% on hover, and no underline: Sam wanted it "visible to users with their attention in the
	   parent chip area" without "taking attention from the UX". Opacity is the right channel — it reads as
	   recessed, where a grey would have read as disabled. */
	.see-parents {
		position: absolute;
		/* 6.5px above and 8px in from the right, walked there over three passes (Sam). At `right: 0` it
		   hung off the chip's rounded top corner, which reads as misaligned even though it is flush; the
		   inset is now past the corner radius, so the label starts where the chip's edge is straight. */
		bottom: calc(100% + 6.5px);
		right: 8px;
		margin: 0;
		padding: 0;
		border: 0;
		background: none;
		/* SMALL CAPS IN OUTFIT, not 10.5px sentence case. Sam: "font is too big, make it all caps but
		   smaller font... more compact?" Caps are what let it shrink this far and stay readable — there
		   are no descenders and no x-height to lose — and Outfit is the most geometric of the families
		   already loaded, so at 9px it reads as an instrument label rather than as shrunken prose. The
		   tracking is not decoration: uppercase set tight is what turns small caps into a smear. */
		font-family: var(--font-outfit, var(--font-inter, sans-serif));
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		line-height: 1;
		white-space: nowrap;
		color: rgb(87, 83, 78);
		/* 55% at rest, 100% hovered (Sam, 70 → 45 → 55). It is an offer, not an instruction — findable by
		   someone already looking at the parent chips, and quiet enough to ignore. */
		opacity: 0.55;
		cursor: pointer;
		text-decoration: none;
		transition:
			opacity 140ms ease-out,
			visibility 0s;
	}
	.see-parents:hover,
	.see-parents:focus-visible {
		opacity: 1;
	}
	/* A TIER IS OPEN — BOTH labels go, not just the one clicked (Sam). The row on screen is the answer to
	   the question, so leaving the other chip still offering to open one reads as an unfinished state, and
	   the two labels sat side by side where the difference is obvious. Bound to `revealedParentId` itself
	   rather than to a per-chip match, so both come back the moment the row is dismissed.
	   `visibility`, NOT `display: none`, for two reasons. It keeps the element's BOX, and the keep-alive
	   region measures that box — a display:none trigger collapses to a rect at the origin, which would
	   both lose the region and start matching pointer positions near the top-left corner of the window.
	   And unlike opacity alone it takes the button out of the focus order, so a keyboard user cannot tab
	   to an invisible control. Delayed one beat so the fade is seen on the way out. */
	.see-parents.tier-open {
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 140ms ease-out,
			visibility 0s linear 140ms;
	}

	/* Inner wrapper for a spouse chip's directional entrance (in:slideChip). Tightly wraps
	   the PersonBox like .flight does, so the chip's resting size/position is unchanged; only
	   this element is transformed during the slide, keeping the .flight box's rect true. */
	.chip-slide {
		display: flex;
	}

	/* HARD CUT (item A, CC arrivals only): the roster is removed the SAME frame the flight origin is
	   captured — instant opacity 0, NO transition (no fade, no beat). Layout is preserved (the slot keeps
	   its reserved height, so the card never jumps). .cc-hidden is set only on a CC nav (navigate.ts →
	   ccRoster); chip navs never see it, so their reveals are untouched. */
	.parents-slot.cc-hidden .flight,
	.children-slot.cc-hidden .flight {
		opacity: 0 !important;
		transition: none !important;
	}
	/* The connector STEMS + LABELS ("George's parents", "Three children") are part of the same family
	   apparatus — hard-cut them the SAME frame as the chips so NOTHING of the old family reading survives
	   during the flight (v4.1: they used to hang on the empty stage through the phantom beat). They return
	   with the landing unfurl, gated by .landed as before. */
	.connector.cc-hidden {
		opacity: 0 !important;
		transition: none !important;
	}

	/* THE CHILD-FOCUS STATE. Every chip stays IN FLOW — that is the whole trick, and the reason there is
	   no pinning, no rect capture and no outro anywhere in this gesture. Nothing reflows, so every chip
	   keeps the column it was already in, including the one being hovered. */
	/* SCOPED TO THE GESTURE, and that scoping is load-bearing. On `.flight` unconditionally these applied
	   during navigations too, where `revealPending` exposes a landed chip as a STEP — the transition turned
	   that step into a fade racing its own WAAPI reveal, and the demoted card flashed once after it had
	   already settled. `.child-settling` keeps the fade-back on dismissal without the rule ever being live
	   while a flight is in progress. */
	/* Split so the two directions can have their own weight. Going OUT the chips have somewhere to be and
	   should not dawdle; coming BACK they were snapping on so abruptly they read as a flash rather than a
	   return (Sam), so the fade-in is the slower of the two. Both keep the tier's own clock and curve for
	   the transform, because the chip's rise and drop belong to the tier's movement, not to this fade. */
	.children-slot.child-focus > .flight {
		transition:
			opacity 220ms cubic-bezier(0.33, 1, 0.68, 1),
			transform var(--tier-ms, 420ms) cubic-bezier(0.32, 0, 0.22, 1);
	}
	.children-slot.child-settling > .flight {
		transition:
			opacity 300ms cubic-bezier(0.33, 1, 0.68, 1),
			transform var(--tier-ms, 420ms) cubic-bezier(0.32, 0, 0.22, 1);
	}
	/* The siblings step aside quickly — Sam: "we'll quickly fade those out to hidden." They keep their
	   space, which is exactly what holds the hovered chip's x still. */
	.children-slot > .flight.child-dimmed {
		opacity: 0;
		pointer-events: none;
	}
	/* And the hovered chip rises the one row pitch it was measured at, on the tier's own curve and clock so
	   the rise and the block opening below it read as one movement. Already on the top row → --child-rise
	   is unset, the translate is 0, and it does not move at all. */
	.children-slot > .flight.child-focused {
		transform: translateY(calc(-1 * var(--child-rise, 0px)));
		z-index: 1;
	}
	/* The rows below collapse so the tier hangs directly off the chip rather than under an empty second
	   row. The hidden siblings overflow the box, which costs nothing — they are transparent and inert. */
	/* The rows below collapse so the tier hangs directly off the chip rather than under an empty second
	   row. The HEIGHT ITSELF is driven in px from the script (see childSlotH) because a transition cannot
	   run from `auto`; this rule only supplies the clock and the curve, which are the tier's own so the
	   collapse, the chip's rise and the unfold are one movement. The hidden siblings overflow the box,
	   which costs nothing — they are transparent and inert. */
	.children-slot.child-focus,
	.children-slot.child-settling {
		overflow: visible;
		transition: height var(--tier-ms, 420ms) cubic-bezier(0.32, 0, 0.22, 1);
	}

	/* The tier's own connector rests at the house 0.75 once its delayed intro has run. It deliberately does
	   NOT use `.landed`, whose 150ms transition would race the intro's delay. */
	.grandchild-tier > .connector {
		opacity: 0.75;
	}

	/* THE GRANDCHILD TIER. `.children-slot` inside it is reused verbatim — same wrap, same gap, same chip
	   geometry — so it reads as another children row rather than a lookalike, exactly as the grandparent
	   tier reuses `.parents-slot`. No translateX offset is needed here (and none is wanted): with the
	   hovered chip's siblings out of flow it is already centred, so the block lines up under it by itself.
	   No `position: relative` either, for the reason the ancestor tier needs one — nothing in here is ever
	   pinned position:fixed against the viewport, because this tier's chips never leave on a navigation
	   with a stale layout to escape. */
	.grandchild-tier {
		display: flex;
		flex-direction: column;
		align-items: center;
		will-change: margin-top, opacity;
	}
	/* THE GRANDPARENT TIER. `.parents-slot` inside it is reused verbatim — same row geometry, same gap,
	   same z:0 confinement — so the tier is literally another parents row rather than a lookalike. */
	.grandparent-tier {
		display: flex;
		flex-direction: column;
		align-items: center;
		/* The resting half of TIER_LIFT (the transition carries the other half — see tierPush). */
		margin-top: calc(-1 * var(--tier-lift, 0px));
		/* position:relative carries the per-chip centring offset (see the markup for why it is not a
		   transform: a transform would re-base the viewport pins of every chip leaving this row). */
		position: relative;
		/* The chips fade with the block; nothing here overrides the row's own stacking. */
		will-change: margin-top, opacity;
	}
	/* THE CONNECTOR IS HARD-CUT ON A NAVIGATION — the same frame-one cut `.connector.cc-hidden` makes on
	   every other row's label, and for the same reason: a line reading "Aaron's parents" has nothing to
	   say about a page whose family is already being replaced, and on a navigation this block stays
	   OPAQUE (so its fade cannot composite onto the pinned chips inside it), which would otherwise leave
	   the label riding the collapse all the way up the screen. */
	.grandparent-tier.nav-close .connector {
		opacity: 0;
		transition: none;
	}

	/* THE CHILDREN ARE PUSHED, NOT RETREATED (Aug 24, Sam's call). The old gesture was defensible, so the
	   reasoning is kept rather than erased — it is not coming back.

	   It was `.children-slot.tier-open { opacity: 0; transform: translateY(60px); pointer-events: none }`:
	   the row faded down one tier and left while the grandparent tier was open, "the same gesture they
	   already make when a parent is promoted."

	   IT WAS THE ONE ROW EXEMPT FROM THE ARMY. The tier opens IN FLOW precisely so that everything below is
	   displaced by its own height with no row told to move (see the markup). Every other row obeys that;
	   the children answered the tier by VANISHING instead of by being PUSHED, which is the one thing the
	   army doctrine does not allow — Sam: "every row moves together as if they are physical, being pushed
	   and forced down as much as moving down independently."

	   AND IT BOUGHT NO HEIGHT. Measured on Burr at 1440x900: opacity and transform remove nothing from
	   layout, so the row's 227px stayed reserved either way — stage 1353 shut, 1473 open, identical
	   whether the children were painted or not. The retreat saved not one pixel; it only meant that
	   scrolling down with the tier open reached 227px of empty parchment with the children standing in it
	   invisible. Showing them costs nothing that was not already being paid.

	   THE PUSH NEEDS NO CODE HERE. tierPush animates the block's own margin-top on the tier's clock and
	   curve, and the block is in flow — so the children glide down 120px (the 145px pitch less the 25px
	   dead lead `.parents-slot` reclaims) as a CONSEQUENCE OF LAYOUT, at the army's tempo, with nothing in
	   this rule scheduling it.

	   THE PRICE, ACCEPTED DELIBERATELY (Sam: "there should be a scrollbar when the kids push down because
	   that's a lot of army rows on the screen at once"): the stage overflows further while the tier is
	   open. That makes this the SECOND sanctioned vertical overflow beside the grandchild tier — design
	   §33.5, and the commented `overflow: clip` in layout.css must now be state-aware for BOTH tiers.

	   THE BASE TRANSITION BELOW STAYS. It is no longer the retreat's, but `.grandchild-tier .children-slot`
	   carries an inline translateX that rides it, and `.child-focus` replaces the whole shorthand with its
	   own height transition regardless. */
	.children-slot {
		transition:
			opacity 420ms cubic-bezier(0.33, 1, 0.68, 1),
			transform 420ms cubic-bezier(0.33, 1, 0.68, 1);
	}
	/* The children's CONNECTOR goes with them. It was left behind — a line and a label hanging under the
	   card pointing at children that are no longer there (Sam). Same clock and curve as the row.
	   THREE classes deep on purpose: `.connector.landed` sets opacity 0.75 AND a 150ms transition, and it
	   is declared later in this stylesheet, so a two-class rule here loses on source order and the
	   connector merely sat at 0.75 (measured). This has to out-specify it, and restate the timing, or the
	   line leaves on the landing clock instead of the row's.

	   NOW THE GRANDCHILD TIER'S ALONE. This condition used to fire for both tiers, but the two ask for
	   opposite things and only ever agreed by accident. The GRANDCHILD tier collapses the children row to
	   the one hovered chip, so "Eleven children" is describing a row that is no longer on screen and the
	   label must go. The GRANDPARENT tier now merely PUSHES the row — the children are still all there,
	   still true, so their label is pushed with them like every other part of the army. Renamed from
	   `.tier-open` so the selector states which tier it means; no probe selects either name. */
	.connector.connector-children.child-tier-open {
		opacity: 0;
		pointer-events: none;
		transition: opacity 420ms cubic-bezier(0.33, 1, 0.68, 1);
	}

	/* THE DEAD LEAD ABOVE THE PARENT CHIPS. .parents-slot reserves min-height:100px and bottom-aligns its
	   75px chips, so 25px of empty space sits ABOVE them. At the top of the page that is invisible; put a
	   grandparent tier above it and it becomes a visible gap under that tier's connector — while every
	   other connector meets its row at 0 (measured: 25 vs 0).
	   Collapsing it also makes the push exactly ONE TIER. With the lead in place the stage moved 170px
	   against a true pitch of 145 (75px chip + 70px connector); the tier block keeps its own 100px slot,
	   whose lead is harmlessly at the top of the page, so 170 − 25 = 145. */
	/* THE TIER'S OWN DEAD LEAD, reclaimed. `.parents-slot` reserves min-height 100 for 75px chips, and the
	   note on .tier-above below explains why that 25px is invisible at the top of the page — but "invisible"
	   was only ever true of the GAP. It is not true of the PUSH: those 25px are 25px the stage is shoved
	   down and has to give back, and giving them back is where the dip comes from. Flooring this row at the
	   height it actually occupies drops the whole push by 25px and puts the grandparent chips 25px closer
	   to the top of the screen, which is the same move for the same reason. */
	.grandparent-tier .parents-slot {
		min-height: 75px;
	}
	.parents-slot.tier-above {
		/* 75px — the chip's own height — NOT 0, though the two look identical while the row is at rest:
		   with the chips in flow the row is 75 tall either way, and the lead still gives back its 25 (100
		   − 75), so the push is still exactly one tier. The difference shows up the instant the row's chips
		   leave FLOW. On a navigation flyOut pins every leaver position:fixed, so a row floored at 0 has no
		   content left and collapses to nothing — measured, the floor dropped 75px in a single frame at the
		   swap while the tier block itself sat perfectly still, which is the tell that the step was coming
		   from under it. Flooring the row at the height it actually occupies means its chips can leave
		   without taking the stage with them. (It cannot clamp a taller chip: min-height is a floor.) */
		min-height: 75px;
	}
	/* AND IT MUST ANIMATE, on the tier's own clock and curve. Snapping it produced the hiccup Sam saw:
	   measured, the card jumped 25px UP for five frames and only then descended 170. The collapse and the
	   push are two halves of one movement — the tier grows 170 while the slot gives back 25 — and run
	   together they sum to a monotonic 145. Run apart, they read as a flinch. */
	.parents-slot {
		transition: min-height var(--tier-ms, 420ms) cubic-bezier(0.32, 0, 0.22, 1);
	}
	/* ON A NAVIGATION the lead gives its 25px back in the same frame the collapse happens, with no
	   transition — the two are halves of one instantaneous layout change, and animating either of them is
	   what put the stage in motion underneath the flight. */
	.page-container.tier-collapsed .parents-slot {
		transition: none;
	}
	/* AND THE BLOCK ITSELF LEAVES LAYOUT IN THAT SAME FRAME. A `duration: 0` outro is NOT enough: Svelte
	   keeps a block mounted until every outro INSIDE it has finished, and the tier's chips now carry real
	   outros of their own (tierChipExit → flyOut, ~500ms). So the block sat at its full 145px for the whole
	   flight and then vanished in one frame at the end — measured, the floor held at 370 and dropped 145px
	   at 614ms, which is the same stage-in-motion defect wearing a different hat.
	   Nothing visible is lost: during a navigation every chip in here is either the clicked one (held
	   invisible by flyOut), a person arriving elsewhere (hidden by their own morphIn), or a traveller whose
	   motion is carried by a body-level ghost that this rule cannot reach. */
	.page-container.tier-collapsed .grandparent-tier {
		display: none;
	}

	/* THE HEAD-SHAKE — "no parents to show". Deliberately UNEVEN: three refusals each way at falling
	   amplitude with a slight asymmetry, because a fixed ±Npx alternation reads as a machine buzzing
	   rather than a head shaking (Sam: "make it more human with ranges of movement"). It decays, which is
	   what a real refusal does. */
	.shake-no {
		animation: shake-no 520ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
	}
	@keyframes shake-no {
		0% { transform: translateX(0); }
		12% { transform: translateX(-7px) rotate(-0.6deg); }
		26% { transform: translateX(6px) rotate(0.5deg); }
		40% { transform: translateX(-5px) rotate(-0.4deg); }
		54% { transform: translateX(3.5px) rotate(0.25deg); }
		70% { transform: translateX(-2px) rotate(-0.15deg); }
		86% { transform: translateX(1px); }
		100% { transform: translateX(0); }
	}
	@media (prefers-reduced-motion: reduce) {
		.shake-no {
			animation: none;
		}
		.children-slot {
			transition: opacity 420ms ease-out;
		}
		/* `.children-slot.tier-open { transform: none }` lived here to cancel the retreat's 60px travel
		   under reduced motion. The retreat is gone (see the note on .children-slot above) and the push
		   that replaced it is a layout change, which reduced motion does not need cancelling. */
	}

	.parents-slot {
		min-height: 100px;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 16px;
		margin-bottom: 0;
		/* Confine the row to its own z:0 stacking context so it sits UNDER the lifted featured-slot
		   (z:1) — a relative demote flies OVER the row. Needed because an incoming box mid-fade is an
		   opacity stacking context that otherwise resolves against the slot by DOM order, not z. */
		position: relative;
		z-index: 0;
	}

	.connector {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 6px 0;
		opacity: 0; /* hidden during flight — the lines+label are scaffolding for the LANDED page */
		min-height: 70px; /* Reserve space even when empty (e.g., no parents) — no layout shift */
	}
	/* The connector + its label fade in as ONE unit WITH the parent/child/spouse boxes, on the
	   card's landing (featuredLanded → true). Transition lives on .landed so the reveal is a
	   gentle 150ms fade (matching the boxes' WAAPI fade) while flight-start hide is instant
	   (removing .landed drops the transition → snaps to opacity 0, no stale-label fade-out). */
	.connector.landed {
		opacity: 0.75;
		transition: opacity 150ms ease-out;
	}

	.connector-line {
		width: 1px;
		height: 16px;
		background-color: rgb(168, 162, 158);
	}

	/* Parents: bottom line is closer to FeaturedCard → shorter */
	.connector-parents .connector-line:last-child {
		height: 12px;
	}

	/* Children: top line is closer to FeaturedCard → shorter */
	.connector-children .connector-line:first-child {
		height: 12px;
	}

	.connector-label {
		font-size: 11px;
		font-weight: 500;
		color: rgb(87, 83, 78);
		letter-spacing: 0.05em;
	}

	/* A GRID OF EIGHT HALF-CHIP TRACKS — the row plan in $lib/state/childRows.ts decides the counts and
	   every chip is PLACED (`grid-column: n / span 2`), so a row's size is chosen rather than discovered
	   by wrapping. That is what ends the behaviour Sam described: this was a 72rem flex-wrap, wide enough
	   for five 198px chips, so five sat in one row until the window narrowed enough to bump one down —
	   and then bumped it back up as the frame unit shrank the chips faster than the container did.

	   A track is (198 − 12) / 2 = 93, so a chip spanning two tracks plus the gap between them lands
	   exactly on 198. Both numbers ride --stage-u, like the chips they measure.

	   THIS IS THE SECOND `.children-slot` BLOCK IN THIS STYLESHEET and it is the one that applies —
	   the other is ~160 lines above with the same specificity, so source order decides and this wins.
	   The grid was written into that one first and rendered nothing, which is design §34.1's lesson
	   arriving on schedule: "verify the edit is the one taking effect before interpreting the render."
	   If a third block ever appears, put the geometry here or delete the duplicate outright. */
	.children-slot {
		display: grid;
		grid-template-columns: repeat(8, calc(93px * var(--stage-u, 1)));
		justify-content: center;
		gap: calc(12px * var(--stage-u, 1));
		margin-top: 0;
		/* Same as .parents-slot: confine to a z:0 context so the row sits under the lifted slot (z:1). */
		position: relative;
		z-index: 0;
	}

	.connector-children .connector-line.connector-line-full {
		height: 50px;
	}
</style>
