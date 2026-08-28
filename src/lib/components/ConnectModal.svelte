<!--
  ConnectModal — THE MODAL IS THE ROWS, AND EVERY ROW IS A CARD.

  There is no panel, no sheet, no table for the entries to sit on. Sam: "i actually don't want like a
  modal 'Table' or solid element that the rows of entries will sit on top of. i want it pretty raw.
  like the modal is the rows of entries."

  BUT RAW DOES NOT MEAN BODILESS, and the first build got that wrong. It set cream type directly on the
  blurred veil with hairline rules between the lines, which Sam named exactly: "this looks like an
  amazon page song list for amazon music nothing to do with my site." The veil is a ROOM; it is not a
  surface anything is printed on. Every person in this project is a discrete card with paper, weight
  and a shadow — that is the whole visual argument of the app — and a rung is a person.

  SO A RUNG IS A `.person-box`. Not a lookalike: the actual global class, which is where the chip
  shadow, `--card-bg`, the line-status fills and the `--line-edge` rule all live (they are global
  rather than scoped precisely so flight.ts's cloned ghosts keep them). It takes `hd`/`sp`/`ee` off the
  same compact every chip reads, so a rung is shaded by the same rule as the chip of the same person
  elsewhere on the page, and the Pynchon prism reaches it for free. Only the GEOMETRY is this
  component's own — long and low rather than the chip's 220x75 (Sam: "simple cards, long in shape more
  than square and not large but still objects that slide in").

  Which also settles the ink. A card is paper, so a rung's type is INK-BLUE at the chip's own two
  strengths — never the cream the title above it takes. Cream is the ink of the ROOM; ink-blue is the
  ink of the objects in it.

  THE VEIL'S CLOCK IS THE LADDER'S CLOCK. Sam: "the fade to full blur backdrop ends when the entries
  are in their final position." So the veil's duration is not a chosen number — it is DERIVED from the
  row count, and a fifteen-rung ladder darkens the room for longer than a three-rung one because it
  takes longer to build. One arrival, one clock, which is design §30's rule stated on a new surface.

  THE LADDER BUILDS FROM THE BOTTOM. The focus person arrives first and Thomas last, so the sequence
  climbs the way the descent is read — you, then the generation above you, up to the man at the top.
  Building downward from Thomas would be the same rows in the same places telling the opposite story.
-->
<script lang="ts">
	import { fade } from 'svelte/transition';
	import { linear, cubicOut } from 'svelte/easing';
	import { flip } from 'svelte/animate';
	import { modal, closeModal } from '$lib/state/modal.svelte';
	import { featured } from '$lib/state/featured.svelte';
	import type { PersonCompact } from '$lib/types/neighborhood';
	import { cldSize, PHOTO_TRANSFORM } from '$lib/photo';
	import { stage } from '$lib/state/stage.svelte';
	import { shrinkToFit } from '$lib/actions/shrinkToFit';

	const open = $derived(modal.kind === 'connect-thomas');
	const paths = $derived(featured.current?.pathsToThomas ?? []);
	const focus = $derived(featured.current?.neighborhood?.focus ?? null);

	let pathIndex = $state(0);
	/**
	 * SWITCHING — true only while a path change is playing out, and it exists to give the ARRIVALS a
	 * different schedule from the leavers. Sam on the first version: "when i click Path 2 … the height
	 * of the ladder increases to like 20 people in an instant which is horrible and confusing … its just
	 * lazy coding." It was: the rows were keyed by `id + position`, so EVERY card counted as a different
	 * card, the whole list was torn down and rebuilt at once, and the container's height jumped in a
	 * single frame.
	 *
	 * Keyed by `id` ALONE, a person who appears in both paths is the SAME element to Svelte, so they are
	 * neither removed nor added — they stay put, or they `animate:flip` to a new seat. Which is the whole
	 * value of the gesture: "its value is in seeing who stays and having the timing to differentiate who
	 * stays and who goes."
	 */
	/**
	 * WHERE EACH RUNG WAS SITTING, captured just BEFORE a change that removes any of them.
	 *
	 * Svelte pulls an outgoing keyed item out of the flex flow so the survivors can close the gap — but
	 * it does not preserve where that item was. Measured on Anne Hooker's path switch: all eight leavers
	 * reported `y = 0`, so they piled onto Thomas at the top of the ladder and left as ONE STACK, which
	 * is exactly what Sam saw. The seat has to be remembered by us, before the list changes, and pinned
	 * back on in `depart`.
	 */
	const seatY = new Map<string, { top: number; left: number; width: number; height: number }>();
	function snapshotSeats() {
		const box = document.querySelector('.ladder-rows');
		if (!box) return;
		// `.rung` AND `.rung-spouse` — the paired card leaves with the rest and needs its seat too. It was
		// the only departing card without one, which left it alone in depending on the container.
		for (const el of box.querySelectorAll<HTMLElement>('.rung, .rung-spouse')) {
			const id = el.dataset.rid;
			if (!id) continue;
			const r = el.getBoundingClientRect();
			seatY.set(id, { top: r.top, left: r.left, width: r.width, height: r.height });
		}
	}

	/** Bottom-first rank AMONG THE LEAVERS of the switch being scheduled — 0 is the lowest card that is
	 *  actually going. Filled by `choosePath`, read by `depart`. Empty on a CLOSE, where every card
	 *  leaves and the rank is its list position anyway. */
	const outRank = new Map<string, number>();

	let switching = $state(false);
	/**
	 * WHEN THE ARRIVALS ARE ALLOWED TO START — computed per switch, not a constant.
	 *
	 * Sam: "have the new cards coming from right edge start just after exiting cards are no longer
	 * visible at left edge of screen." That instant depends on WHICH rows are leaving: a leaver near the
	 * bottom goes first (the stagger is bottom-first) and one near the top waits longest, so a switch
	 * that only replaces the last two rungs clears far sooner than one that replaces nine. A fixed delay
	 * would either overlap the tail of the exit or leave the ladder sitting empty.
	 *
	 * So it is the largest departure delay actually in play, plus the run itself, plus a short beat.
	 */
	/**
	 * WHICH SIDE THE CARDS COME FROM — +1 from the right, −1 from the left.
	 *
	 * The ladder used to deal from the right and sweep to the left on every switch, whichever path you
	 * went to. Sam: "if i click path 1 again, then the new cards enter from the left side of the browser,
	 * as if they were waiting there, not just constantly coming in from the left."
	 *
	 * So the paths are laid out in a ROW and the tabs move you along it. Going FORWARD (1→2, 2→3, 1→3)
	 * the next path arrives from the right and the old one leaves to the left; going BACK it reverses,
	 * and the path you left is still where you left it. Which is why path 3 always arrives from the right
	 * — there is nothing beyond it to come back from — while path 2 depends on whether you reached it
	 * from 1 or from 3, exactly as Sam described.
	 *
	 * §17.2 makes this more than a sign flip: the overshoot is "a few px past its destination IN ITS
	 * DIRECTION OF TRAVEL", so it has to turn round with the travel or a card coming from the left would
	 * overshoot back towards the side it came from.
	 */
	let switchDir = $state(1);
	/**
	 * THE THREE BEATS OF A SWITCH, IN ORDER — and the order is the fix.
	 *
	 * `animate:flip` fires on the frame the list changes, while the LEAVERS are still sitting in their
	 * seats waiting out their stagger. So a survivor closed the gap into space that was still occupied:
	 * Sam, on Sarah Knutti, "#9 still covers up #8 aurelia card before she departs and does it in a very
	 * jerky instant way." It was not a curve problem — it was two things happening at once that have to
	 * happen in sequence.
	 *
	 *     1. the leavers go, staggered, out the side
	 *     2. THEN the gap closes, on flip's own clock
	 *     3. THEN the replacements arrive
	 *
	 * Each beat waits for the one before, so nothing is ever moving into a seat something else is still
	 * in. It costs time, and Sam asked for that explicitly here — "wait for departures to happen and
	 * slowly close the space with a gradual transition" — which reverses the overlap he asked for when
	 * the two halves were merely queued rather than colliding.
	 */
	let flipDelay = $state(0);
	let switchInDelay = $state(0);
	/** True from the moment a close is requested — `depart` reads it to pick the close cascade over the
	 *  switch stagger. Reset when the modal is next opened. */
	let closing = false;
	let switchTimer: ReturnType<typeof setTimeout> | null = null;
	function choosePath(i: number) {
		// LOCKED WHILE ONE IS RUNNING. Sam: "i clicked on path 1 button while path 2 still operating and
		// it went back to the situation where the ladder height almost doubled with cards from both paths
		// combined." A second switch mid-gesture asks Svelte to outro elements that are already outroing
		// and intro ones that have not landed; the list ends up holding both paths at once. The buttons
		// carry `disabled` too — this is the guard behind the guard.
		if (i === pathIndex || switching) return;
		snapshotSeats();

		// Who is actually leaving, and where they sit — the schedule is derived from that, not assumed.
		const oldIds = rows.map((r) => r.id);
		const nextIds = [...((paths[i] ?? []) as Rung[]).map((r) => r.id), focus?.id ?? ''];
		/**
		 * THE STAGGER COUNTS LEAVERS, NOT LIST POSITIONS (Sam: "there's just a little bit too much of a
		 * delay before the exit of the leaving cards").
		 *
		 * It used to be `(rows.length - 1 - index) * OUT_STAGGER` — the card's slot in the WHOLE ladder.
		 * So a rung that leaves from the middle waited out a slot for every survivor beneath it, and
		 * those survivors are not going anywhere. On Sarah Knutti's 1→2 the five leavers sit at indices
		 * 2–6 with three survivors below them, so nothing moved for the first 255ms of a switch that had
		 * already been asked for — dead air, and dead air that got WORSE the higher up the change was.
		 *
		 * Ranking bottom-first among the leavers alone keeps the cascade exactly as it reads — they still
		 * go one after another, 85ms apart, from the bottom — and starts it on the click. It also pulls
		 * beats 2 and 3 in behind it, because `lastOut` is the clock all three run on.
		 */
		outRank.clear();
		const leaving = oldIds.filter((id) => !nextIds.includes(id));
		leaving.forEach((id, k) => outRank.set(id, leaving.length - 1 - k));
		const lastOut = leaving.length ? (leaving.length - 1) * OUT_STAGGER + OUT_MS : 0;
		// Beat 2 starts when the last leaver is clear; beat 3 when the gap has finished closing. The
		// lap keeps the seam from reading as three separate events rather than one gesture.
		flipDelay = lastOut;
		/**
		 * BEAT 2 DOES NOT ALWAYS EXIST, and beat 3 used to wait for it anyway.
		 *
		 * `animate:flip` only has work to do when a survivor changes SEAT. Between two paths of the same
		 * length nobody does — Anne Austen Hooker's two paths are both 12 rungs, so every survivor is
		 * already where it belongs and the gap that beat 2 closes is not there to close. The schedule
		 * charged a full FLIP_MS for it regardless, which is 460ms of the ladder sitting empty while
		 * nothing at all was moving.
		 *
		 * So the wait is charged only when it is owed, and beat 3 is floored just short of `lastOut`.
		 *
		 * THE FLOOR IS ONE BEAT INSIDE THE EXIT, not at the end of it. Both ladders had walked down onto
		 * that floor — Anne through the no-flip case, Sarah through the lap — so a further "beat faster"
		 * had nowhere to come from except the floor itself. IN_OVERLAP buys it, and it is safe for a
		 * reason rather than by luck: the two sets travel in OPPOSITE directions from opposite edges, so
		 * the only thing that overlaps is the last leaver's final 85ms against an arrival that is still
		 * essentially off screen (ROW_MS is 519 — a card has barely entered at 85ms). §44.9 already
		 * records the crossing as the intent: "they launch before it ends and the two halves cross".
		 */
		const survivorsMove = oldIds.some(
			(id, ix) => nextIds.includes(id) && nextIds.indexOf(id) !== ix
		);
		const gapCloses = lastOut + (survivorsMove ? FLIP_MS : 0);
		switchInDelay = Math.max(lastOut - IN_OVERLAP, gapCloses - FOLLOW_LAP);

		switchDir = i > pathIndex ? 1 : -1;
		switching = true;
		pathIndex = i;
		if (switchTimer) clearTimeout(switchTimer);
		// UNLOCKED A BEAT BEFORE THE LAST CARD SETTLES. It used to hold for a fixed 2s built on a
		// guessed row count, which left a dead gap between the ladder looking finished and the buttons
		// working again (Sam: "there's a gap between that working and the new cards in their final
		// position"). The last arrival's own schedule is known here, so the lock ends 300ms inside its
		// settle — the tail of that curve is the card travelling a few pixels, not a state worth
		// defending. Floored so a one-row switch cannot unlock before it starts.
		const inCount = ((paths[i] ?? []) as Rung[]).length + 1;
		const lastIn = switchInDelay + SWITCH_STAGGER * (inCount - 1) + ROW_MS;
		switchTimer = setTimeout(() => (switching = false), Math.max(240, lastIn - UNLOCK_EARLY));
	}
	// A different person means a different ladder; without this, arriving at a 1-path card while
	// index 2 was selected would render nothing.
	$effect(() => {
		if (focus?.id) {
			pathIndex = 0;
			switching = false;
		}
	});
	$effect(() => {
		if (open) closing = false;
	});

	/** Thomas first, focus appended — the chain stops one short of the focus because the payload
	 *  already carries them (see pathsToThomasFor). */
	/** The focus's own blurb is NOT baked into the chain — the chain stops one short of them — but the
	 *  payload already carries their full record, so it is read from there and the same
	 *  `notable_blurb ?? bio_blurb` order applies. They have no chain-spouse by definition: the ladder
	 *  ends at them, so there is no next marriage for the descent to pass through. */
	const focusBlurb = $derived(
		featured.current?.person?.notable?.notable_blurb ??
			featured.current?.person?.bio?.bio_blurb ??
			null
	);
	type Rung = PersonCompact & { bl?: string };
	/** Married-in: the chain is the PARTNER's and already ends on them, so the focus is not appended —
	 *  they are rendered beside that last rung instead (see `.rung-spouse`). */
	const viaSpouse = $derived(featured.current?.pathsSpouse === true);
	const rows = $derived<Rung[]>(
		paths.length && focus
			? viaSpouse
				? ((paths[Math.min(pathIndex, paths.length - 1)] ?? []) as Rung[])
				: [
						...((paths[Math.min(pathIndex, paths.length - 1)] ?? []) as Rung[]),
						{ ...focus, ...(focusBlurb ? { bl: focusBlurb } : {}) } as Rung
					]
			: []
	);

	/**
	 * THE LADDER FITS THE WINDOW, and it has to compute that itself.
	 *
	 * `--stage-u` shrinks the rungs with the stage, and measured, that is NOT enough: the tallest ladder
	 * in the corpus is 15 rows (Arcangelo Albetta), and at 1280x720 those 15 rungs plus the header ran
	 * from y −34 to y 754 — off the top of the window and past the bottom of it. A ladder is a different
	 * shape from a stage; a stage gets taller slowly and this gets taller a whole row at a time.
	 *
	 * So the fit is a SECOND factor multiplied into the rung geometry, never a scroll: a scrolling ladder
	 * would break the one thing the rows are for, which is being seen arriving into their seats.
	 * Window geometry comes from the stage store rather than from `innerHeight` here — roadmap §2.75's
	 * rule is that one module reads the window and nothing else does.
	 *
	 * (`StageRung` in that store is an unrelated idea — the stage's own size steps. Same word, different
	 * subject.)
	 */
	const RUNG_H = 72.8;
	const RUNG_GAP = 9;
	const HEAD_H = 34;
	const HEAD_GAP = 14;
	const MARGIN = 56; // breathing room top and bottom together
	/**
	 * SIZED FOR THE LONGEST PATH, NOT THE CURRENT ONE — so a switch never resizes anything.
	 *
	 * THE STAGE MUST NOT MOVE WHILE ANYTHING IS FLYING (design §30). Sizing to the current path meant
	 * that switching between routes of different length changed the fit, which changed every rung's
	 * height, which moved the layout under cards that `animate:flip` was already transforming. Measured
	 * on Sarah Knutti, whose two routes are 10 and 11 rows:
	 *
	 *     t=23    flip translateY −40.5   layout top 805
	 *     t=203   flip translateY −10.5   layout top 754
	 *     t=460   flip translateY   0     layout top 735
	 *
	 * An in-flow element is painted at layout(t) + transform(t), so those two curves composed into the
	 * ideal path PLUS §30's error term. Net travel was 8.5px — the residue of a 70px layout slide against
	 * a 40px transform — and the residue wobbled: peak per-frame movement 6.4x the mean. That is the
	 * "jerky flick" Sam saw, and easing the fit had made it worse rather than better, because before that
	 * the layout at least settled in one frame.
	 *
	 * Taking the MAXIMUM over every path fixes it at the source instead of correcting for it. The ladder
	 * is sized once per person, for their worst case, so a switch changes the row COUNT and nothing else:
	 * the layout settles in a single frame and flip is the only thing moving. A shorter path renders
	 * fractionally smaller than it strictly needs to, which is invisible because it never changes.
	 */
	/** The tallest this person's ladder ever gets — the row count of their longest path. Both the fit
	 *  and the container's reserved height are computed from it, so neither changes on a switch. */
	const maxRows = $derived(
		paths.length ? Math.max(...paths.map((c) => c.length + (viaSpouse ? 0 : 1))) : rows.length
	);
	const fit = $derived.by(() => {
		const n = maxRows;
		if (!n) return 1;
		const needed = (n * RUNG_H + (n - 1) * RUNG_GAP + HEAD_H + HEAD_GAP) * stage.u;
		const room = stage.vh - MARGIN;
		return Math.min(1, room / needed);
	});

	// ── THE ONE CLOCK ───────────────────────────────────────────────────────────────────────────────
	// A BASEBALL CARD, NOT A HUMMINGBIRD. Sam on the first pass: "you have the entrance transition like
	// hummingbird wings i want these to feel more like baseball cards that slide in like physical objects
	// with heft that overshoot a little to the left because of their weight before settling into place."
	// Every number below moved in the same direction — slower travel, wider spacing between neighbours,
	// and nearly twice the overshoot, because heft is read from how long a thing takes to STOP.
	/**
	 * 519ms — the 560 it settled at, 8% quicker (Sam). Design §17.1 is the reason this is the right dial
	 * to move: PERCEIVED WEIGHT IS VELOCITY, NOT DURATION. A card that travels the same distance in less
	 * time is read as heavier and more purposeful, not as hurried — hurried is what happens when the
	 * SPACING between cards collapses, which is what "hummingbird wings" was and why STAGGER is untouched
	 * here. The 1.6 px/ms ceiling that binds card flights is far above anything a 519ms rung reaches.
	 */
	const ROW_MS = 519; // one card's travel (560 → −8%)
	const STAGGER = 85; // between neighbours (was 55) — separation is what stops it reading as a blur
	const TRAVEL_VW = 62; // starts off the right edge; a SHARE of the window, not px (design §42.6)
	const OVERSHOOT = 14; // px PAST the seat, to the left — the weight carrying through (was 7)
	// ── THE PATH SWITCH ─────────────────────────────────────────────────────────────────────────────
	const OUT_MS = 440; // a leaver's run to the left edge
	const OUT_STAGGER = 85; // on a PATH SWITCH: the same spacing as the entry
	/**
	 * CLOSING IS NOT A SWITCH, and it must not borrow the switch's schedule.
	 *
	 * On a switch the stagger is the point — the reader is being shown which cards left so they can see
	 * which stayed. On a close nobody is comparing anything; they have already decided to leave. At the
	 * switch's 85ms spacing the top rung of a twelve-rung ladder would not begin moving until 935ms and
	 * the last card would still be travelling at 1375ms, while the veil is back to full light at 200ms —
	 * so the cards would sweep across a page that had already returned to normal.
	 *
	 * A tight cascade instead: ~600ms end to end, which reads as one sweep rather than twelve departures.
	 */
	const CLOSE_STAGGER = 26;
	const CLOSE_MS = 300;

	/**
	 * THE FADE OUT LASTS EXACTLY AS LONG AS THE CARDS ARE STILL LEAVING — derived, not a constant.
	 *
	 * A flat 200ms was quick, which is right ("the user is ready to move on and not linger"), but it
	 * finished while eleven cards were still crossing a page that had returned to full opacity. Sam:
	 * "the paths cards on top of the full 100% opacity normal UX view is not ok." The veil is what those
	 * cards are travelling over, so its clock is the exit's clock: the last rung's delay plus its run.
	 *
	 * That is a different rule from the ENTRANCE, deliberately. Going in, the veil finishes early and the
	 * ladder keeps building — a room can be lit before everything in it has arrived. Coming out, nothing
	 * may outlast the ground it stands on.
	 */
	// THE TAIL IS NOT PADDING. A transition ENDS when its transform reaches full travel, and the card is
	// still crossing its final pixels for a few frames after that — measured without it, the veil cleared
	// 74ms before the last card was actually off-screen, which is the exact artefact this rule exists to
	// prevent, just smaller.
	/**
	 * IT WAITS FOR THE LAST CARD TO BE MOVING, THEN GOES QUICKLY — a delay, not a longer fade.
	 *
	 * Stretching the fade to cover the whole exit made it slow again, which is the thing it was shortened
	 * to avoid. Sam's shape is better: "the backdrop fade duration can be quick like you have it but only
	 * start when all cards exiting left are in motion." So the veil holds at full strength while the
	 * cascade launches, and only begins clearing once nothing is left standing still on it.
	 */
	/** +50 past the last card's launch: the cascade is not only started but visibly under way before the
	 *  ground begins to go. */
	const VEIL_HOLD = 50;
	/**
	 * THE ROWS BOX RESERVES ITS TALLEST HEIGHT, so the header never moves.
	 *
	 * `.ladder` is a centred column of {header, rows}. With an auto-height rows box, dropping a rung made
	 * the box shorter IN LAYOUT, instantly, while the rungs themselves were still being animated by flip
	 * — so the whole column re-centred in one frame and the title jumped, leaving a gap above a #1 that
	 * had not moved yet. Sam: "Paths To Thomas … instantly jumps up to higher position with huge gap
	 * between title and #1 before #1 actually slides up."
	 *
	 * It is design §30 once more, on the last piece of this component still free to move: an in-flow
	 * element painted at layout(t) + transform(t), where the layout stepped and the transform eased.
	 * Reserving the maximum removes the step at the source — the box is the same size on every path, the
	 * header has nothing to react to, and a shorter path simply centres its rows inside a box already
	 * the right size.
	 */
	const rowsHeight = $derived(
		maxRows ? (maxRows * RUNG_H + (maxRows - 1) * RUNG_GAP) * stage.u * fit : 0
	);

	const veilOutDelay = $derived(
		rows.length ? (rows.length - 1) * CLOSE_STAGGER + VEIL_HOLD : VEIL_HOLD
	);
	/** How long the ladder takes to build itself — the last rung's delay plus its travel. The header
	 *  waits this out; the veil deliberately does not (a room may be lit before it is furnished). */
	const buildMs = $derived(rows.length ? (rows.length - 1) * STAGGER + ROW_MS : ROW_MS);
	const VEIL_OUT_MS = 260;
	const FLIP_MS = 460; // survivors closing or opening a gap — same clock as the leavers, on purpose
	const SWITCH_STAGGER = 70;
	/**
	 * THE ARRIVALS OVERLAP THE DEPARTURES — a negative beat, not a positive one.
	 *
	 * It used to be a 60ms PAUSE measured from the moment the last leaver finished its run, so the screen
	 * emptied, held, and only then refilled. Sam: "now the exiting cards leave screen, there's a couple of
	 * beats, and the replacement cards enter. its those beat or two we can remove… there should be a sense
	 * they are following them in."
	 *
	 * So the replacements now launch 240ms BEFORE the last leaver's run ends — by which point that card is
	 * most of the way to the edge and nothing is standing still. Nothing else moved: the cards travel at
	 * the same speed and the stagger is untouched (Sam: "you don't need to speed anything up"). Only the
	 * silence between the two halves is gone, which is what was actually being felt.
	 */
	// HOW FAR THE ARRIVALS LAP INTO THE GAP CLOSING. Raised from 240 (Sam: "can the entering cards after
	// clicking a different path enter the screen a beat or two sooner") — two beats of the exit stagger.
	// An arrival takes ROW_MS to travel, so even launching this early it lands well after the flip has
	// finished; what moves is the start of its run, not the moment it settles.
	const FOLLOW_LAP = 485;
	/** How far the arrivals may cross INTO the tail of the exit — one beat of the exit stagger. See the
	 *  note in `choosePath`: opposite directions from opposite edges, so a beat of overlap costs nothing
	 *  visually and is the only place a faster entry was left to come from. */
	const IN_OVERLAP = OUT_STAGGER;
	const UNLOCK_EARLY = 300; // the buttons come back while the last card is still settling
	/**
	 * THE VEIL HAS ITS OWN SHORT CLOCK AGAIN — and this REPLACES the rule it used to follow.
	 *
	 * It was derived from the row count, so the room finished darkening exactly as the last card
	 * landed. That was Sam's earlier ask and it is now reversed: "the color fade in should not end when
	 * cards are settled anymore its too slow and its distracting". On a twelve-rung ladder that meant a
	 * one-second fade, and a ground still changing under cards that had already arrived reads as the
	 * page loading rather than as a room being entered.
	 *
	 * OUT IS QUICKER THAN IN, which needs `in:`/`out:` rather than one `transition:` (a single directive
	 * plays the same duration both ways). Leaving should not be watched: the reader has already decided
	 * to go, so the room comes back to light faster than it went dark.
	 */
	const VEIL_IN_MS = 340;

	/**
	 * A ROW ARRIVING. Travel from off the right edge, decelerating, ~7px PAST the seat, then settle
	 * back — design §22's weight physics, which the deck already speaks.
	 *
	 * THE OVERSHOOT IS A FIXED DISTANCE AND THE CURVE IS HAND-WRITTEN FOR THAT REASON. A `backOut`
	 * easing would have been one word, but its overshoot is a PROPORTION of the travel: over 55vw that
	 * is ~79px on a 1440 screen, which is not "a little bit of overshoot", it is a bounce. Two segments
	 * — approach to −OVERSHOOT, then settle to 0 — give the same 7px whatever the distance.
	 *
	 * `easing: linear` is deliberate and load-bearing: easing is applied BEFORE the css callback sees
	 * `t` (design §38.2), so any easing here would be composed with the curve below and neither would
	 * be the shape it claims.
	 */
	function arrive(node: Element, { i, n }: { i: number; n: number }) {
		// Measured for the same reason `depart` is: the card must START fully off the right edge.
		const r = (node as HTMLElement).getBoundingClientRect();
		// On the first open the ladder always deals from the right; on a switch it follows the tabs.
		const dir = switching ? switchDir : 1;
		const off =
			dir > 0
				? Math.max((TRAVEL_VW / 100) * window.innerWidth, window.innerWidth - r.left + 24)
				: Math.max((TRAVEL_VW / 100) * window.innerWidth, r.right + 24);
		const start = dir * off;
		const over = -dir * OVERSHOOT; // past the seat, in the direction of travel (§17.2)
		return {
			// ON OPEN, bottom-first: the LAST row leaves the gate immediately and the top row waits
			// longest. ON A PATH SWITCH the arrivals are scattered through the list rather than being the
			// whole of it, so they wait out the leavers first and then come in on a tighter stagger —
			// the point of the pause is that the reader can tell who STAYED.
			delay: switching ? switchInDelay + (n - 1 - i) * SWITCH_STAGGER : (n - 1 - i) * STAGGER,
			duration: ROW_MS,
			easing: linear,
			css: (t: number) => {
				// A LONGER BRAKE THAN BEFORE (0.72, was 0.78). The last quarter of the clock is the card
				// coming to rest, and that tail is where weight is actually read — a fast approach with a
				// fast stop reads as a flick however far it travelled.
				const APPROACH = 0.72;
				let x: number;
				if (t < APPROACH) {
					const k = 1 - Math.pow(1 - t / APPROACH, 3); // cubic-out over the approach
					x = start + (over - start) * k;
				} else {
					const k = 1 - Math.pow(1 - (t - APPROACH) / (1 - APPROACH), 3);
					x = over * (1 - k);
				}
				// Ink resolves early — a row that is still travelling should already be readable, the way
				// the Ascension's card is opaque the moment it can be seen at all (§38.3).
				return `transform: translateX(${x.toFixed(2)}px); opacity: ${Math.min(1, t / 0.3)};`;
			}
		};
	}

	/**
	 * A CARD LEAVING GOES OUT THE LEFT, and it needs its own function for that.
	 *
	 * A Svelte `transition:` plays its intro BACKWARDS on the way out, which would have sent every
	 * departing card back out the right edge it arrived from — a card retracing its own entrance, which
	 * reads as an undo rather than as a departure. Sam: "the cards do enter from the right browser edge
	 * but they exit out the left browser edge." So `in:` and `out:` are separate, and the ladder has a
	 * DIRECTION: everything moves right-to-left through it, the way a hand of cards is dealt away.
	 *
	 * It accelerates (the mirror of the arrival's brake) because a thing being taken away does not need
	 * to be watched all the way out — design §22's weight physics, which the deck already speaks.
	 */
	function depart(node: Element, { i, n }: { i: number; n: number }) {
		// PIN THE SEAT before anything moves. The element is already out of the flow by the time this
		// runs, so without this it reports y = 0 and every leaver departs from the top of the ladder.
		const el = node as HTMLElement;
		const seat = seatY.get(el.dataset.rid ?? '');
		if (seat) {
			/**
			 * FIXED, IN VIEWPORT COORDINATES — not absolute inside `.ladder-rows`.
			 *
			 * The seat was recorded as an offset from the container and pinned back the same way, which
			 * is only right if the container has not moved. It moves on every switch between paths of
			 * different length: one fewer row is a shorter block, and `.ladder` CENTRES, so the whole
			 * thing slides half a row. Every leaver was therefore pinned half a row from where it had
			 * actually been — measured on Sarah Knutti, Aurelia sat 29px into Thomas Hooker Sr.'s card
			 * and the two overlapped from the first frame. Sam saw it as "#9 covers up #8 before she
			 * departs", and it read as a timing fault because it appeared the instant the list changed.
			 *
			 * Viewport coordinates have no such dependency: a departing card is leaving the layout, so it
			 * should not be positioned by a box that is still rearranging itself.
			 */
			el.style.position = 'fixed';
			el.style.top = `${seat.top}px`;
			el.style.left = `${seat.left}px`;
			el.style.width = `${seat.width}px`;
			/**
			 * AND THE HEIGHT, from the same snapshot. `flex: none` on `.rung` stops the squash at source,
			 * so this is a second net rather than the fix — but it is the RIGHT second net, because the
			 * inline height a leaver carries was written by Svelte from a measurement taken mid-relayout,
			 * and the seat is the one measurement taken before anything moved at all.
			 */
			el.style.height = `${seat.height}px`;
			/**
			 * AND CANCEL THE FLIP. `animate:flip` writes an inline `transform` on EVERY keyed element the
			 * update touched — including one that is on its way out — to carry it from where it used to be
			 * to where the new list puts it. A leaver's "new" place is the end of the list, so it was
			 * handed a translateY of +703px and sat there for the whole of its stagger delay: measured on
			 * Anne's path 2, eight cards were parked BELOW her own rung, which is the ladder appearing to
			 * double in length that Sam saw. The transform is inline and no animation is running yet
			 * (`animationName: none` during the delay), so clearing it is enough — and it costs nothing
			 * once this card's own transition starts, because an animation outranks an inline declaration.
			 */
			el.style.transform = 'none';
		}
		// MEASURED, NOT A FRACTION OF THE WINDOW. `0.62 * innerWidth` was 893px at 1440 while the card's
		// own right edge sits at 970 — so every leaver stopped 77px short and vanished still on screen.
		// Reading the rect makes the card clear the edge at any window size, which is the same lesson
		// design §42.6 records about the sprite field being sized in pixels.
		// A CLOSE always sweeps left. A SWITCH leaves the way the incoming set is NOT coming from, so the
		// two sets never cross and the ladder reads as one row of paths sliding past a window.
		const outDir = closing ? -1 : -switchDir;
		const box = el.getBoundingClientRect();
		const travel = outDir < 0 ? box.right + 24 : window.innerWidth - box.left + 24;
		return {
			// ON A SWITCH, staggered to match the entry — bottom-first on the same 85ms spacing. They used
			// to leave as one block, which read as the list being wiped rather than as objects departing.
			// ON A CLOSE, the tight cascade above.
			// On a SWITCH the rank comes from `outRank` (leavers only); on a CLOSE everything is leaving,
			// so its position in the list already IS its rank. The fallback covers a card that somehow
			// departs without having been scheduled — it keeps the old spacing rather than going at 0.
			delay:
				(closing ? n - 1 - i : (outRank.get(el.dataset.rid ?? '') ?? n - 1 - i)) *
				(closing ? CLOSE_STAGGER : OUT_STAGGER),
			duration: closing ? CLOSE_MS : OUT_MS,
			easing: linear,
			css: (t: number, u: number) => {
				const k = u * u * u; // cubic-IN on the way out
				return `transform: translateX(${(outDir * travel * k).toFixed(2)}px); opacity: ${Math.min(1, t / 0.25)};`;
			}
		};
	}

	/** The veil: alpha and blur on ONE `t`, because an element's opacity does not scale the result of
	 *  its own backdrop-filter — filmed, and the blur arrived at frame 1 while the dark was a fifth in. */
	const VEIL_BLUR = 10;
	function veil(_node: Element, { duration, delay = 0 }: { duration: number; delay?: number }) {
		return {
			delay,
			duration,
			easing: linear,
			css: (t: number) => {
				/**
				 * SMOOTHSTEP — slow at both ends. It was chosen when this clock ran a full second and had
				 * to stay level with a building ladder; at 340ms the reason is simpler and still holds,
				 * which is that an ease-out front-loads and a ground that snaps most of the way in the
				 * first third reads as a flash rather than as a fade.
				 */
				const e = t * t * (3 - 2 * t);
				return `opacity: ${e}; backdrop-filter: blur(${(VEIL_BLUR * e).toFixed(2)}px); -webkit-backdrop-filter: blur(${(VEIL_BLUR * e).toFixed(2)}px);`;
			}
		};
	}

	/**
	 * CLOSING SNAPSHOTS THE SEATS AND NOTHING ELSE.
	 *
	 * It used to also PIN `.ladder-rows` itself to the viewport, because leavers were positioned inside
	 * that box and it collapsed the moment they all went out of flow — the whole ladder dropped a third
	 * of a page before it left. Two later changes retired that: every leaver is now pinned in viewport
	 * coordinates rather than container coordinates, and the box reserves the height of the longest path
	 * instead of sizing to its contents. Neither depends on the other holding still any more, so the
	 * freeze was doing nothing. Measured after removing it: 0px drift on both a descendant ladder and a
	 * paired one.
	 */
	function requestClose() {
		closing = true;
		snapshotSeats();
		closeModal();
	}

	function onKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.stopPropagation();
			requestClose();
		}
	}

	let ladderEl = $state<HTMLDivElement | null>(null);
	$effect(() => {
		if (open && ladderEl) ladderEl.focus();
	});

	/**
	 * THE HOVER ZOOM — FeaturedCard's mechanism, not a second one.
	 *
	 * Sam: "you'll see that when the main photo and the ART/STATUE/LANDMARK images are hovered over by
	 * the user, a large image shows up in the center and creates shadow effect from the left side drop
	 * shadow. lets replicate that on Paths to Thomas."
	 *
	 * Three things carry over verbatim because they are the reasons that popout works:
	 *   - it REUSES THE ALREADY-LOADED src, so there is no network request and no first-hover lag;
	 *   - it is sized to 200% of the displayed width at the image's NATURAL aspect, so a tall portrait
	 *     shows whole instead of being cropped to the midriff the way the object-cover thumbnail is;
	 *   - it is PORTALLED TO <body>, because every ancestor here (`.rung` has `overflow: hidden`, and
	 *     the cards are mid-flight for the first second) would otherwise clip it.
	 *
	 * WHERE IT LANDS: right of the hovered photo, ANCHORED TO THAT CARD — not in one fixed place for the
	 * whole ladder. A first pass centred it on the window, which was wrong in a way worth naming: with
	 * twelve rungs the enlargement always appeared in the same spot regardless of which face was under
	 * the cursor, so it read as a lightbox rather than as that person's photo opening. FeaturedCard pins
	 * to its photo's right edge and RightColumn to its thumbnail's left; both belong to the thing they
	 * enlarge, and so does this.
	 *
	 * AND IT MOVES WITH THE CURSOR, amplified 1.5x around the photo's own centre — RightColumn's factor,
	 * unchanged. Vertical only; the horizontal stays pinned so the box never drifts side to side. It is
	 * `pointer-events: none`, so the rung underneath keeps the hover and the zoom cannot flicker itself
	 * out of existence.
	 */
	let zoom = $state<{
		src: string;
		alt: string;
		w: number;
		h: number;
		ax: number;
		/** Pixels off the window's vertical centre — NOT a y coordinate. See the note in trackZoom. */
		dy: number;
	} | null>(null);
	/** Walked on pixels: FeaturedCard's 33, +25, −15, −10. Back at 33, which is where that file started —
	 *  worth noting rather than quietly rediscovering, because it says the original offset was right. */
	/**
	 * THE ONE CARD THAT KEEPS ITS RAINBOW — a LIST OF ONE, which is the house's form for this.
	 *
	 * Sam: "on Thomas Ruggles Pynchon Jr. when Connect to Thomas is clicked, can he keep his rainbow
	 * background instead of the mint green? one singleton exception. nowhere else." So it is an id and
	 * not a predicate: `isPynchonKin` holds 24 people and TWO of them can appear as a paired card
	 * (X03232 and X01014, Mary Smith Lord Hooker), so using it would have made two exceptions out of a
	 * request for one. Design §35.7 records the same call on the line-anchor overrides — "a list, never
	 * a rule… add a row with a sentence saying why; do not generalise it."
	 *
	 * The RUNGS deliberately do not take it. They carried `class:prism` for a while and it did nothing:
	 * PersonBox's `.person-box.prism` rule is Svelte-SCOPED to that component, so the class never
	 * matched anything here. Removed rather than made to work — Sam's "nowhere else" is the answer to
	 * whether it should have.
	 */
	const PRISM_SPOUSE = 'X03232';

	const ZOFFSET = 33;
	/** FeaturedCard follows the cursor 1:1; this is that plus the 20% Sam asked for. */
	const AMPLIFY = 1.2;

	function trackZoom(e: MouseEvent) {
		const img = e.currentTarget as HTMLImageElement;
		if (!img?.src) return;
		const r = img.getBoundingClientRect();
		const ar = img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
		// A rung's photo is small, so 200% of it is still a thumbnail — this opens to a share of the
		// window instead, then obeys the same 60%/90% ceiling FeaturedCard uses.
		let w = Math.max(r.width * 2, window.innerWidth * 0.26);
		let h = w * ar;
		// THE HEIGHT CEILING IS 0.66, NOT FeaturedCard's 0.9, AND THAT IS THE TRACKING'S DOING.
		// A box 90% of the window tall can only be positioned across the remaining 10%, so the on-screen
		// clamp swallows the whole gesture: measured at 0.9, rungs near the top and bottom of a
		// twelve-rung ladder moved 0px however far the cursor travelled, and only the middle of the
		// ladder had any travel at all. FeaturedCard can afford 0.9 because it has ONE photo, sitting
		// mid-card; a ladder spreads its photos down 800px, so most of them live where the clamp bites.
		// 0.66 leaves roughly 300px of room to move in, and 594px is still nine times the rung's own
		// thumbnail — the enlargement loses nothing that matters.
		const k = Math.min(1, (window.innerWidth * 0.6) / w, (window.innerHeight * 0.66) / h);
		w *= k;
		h *= k;
		/**
		 * CENTRED, WITH A MODEST SWING AROUND THAT CENTRE.
		 *
		 * Two wrong models came first and both are worth naming. Centring the box ON THE CURSOR is what
		 * FeaturedCard does, and it cannot work down a tall list: for a rung near either end the box lands
		 * mostly off-screen and the clamp pins it, so those rungs measured 0px of travel. Mapping the
		 * cursor's fraction across the whole remaining window fixed that and overshot badly — a 29px
		 * cursor move threw the picture 190px, roughly 6x, which Sam called too extreme.
		 *
		 * So the box RESTS centred in the window, and the cursor's distance from the photo's own middle
		 * displaces it by 1.2x — FeaturedCard's 1:1 follow plus the "20% wider vertical swings" Sam asked
		 * for. The photo is ~61px tall, so the whole swing is about +/-37px: clearly alive under the hand,
		 * never a flick, and identical for the top rung and the bottom one because the rest position no
		 * longer depends on where the card sits.
		 */
		const pivot = r.top + r.height / 2;
		const offset = (e.clientY - pivot) * AMPLIFY;
		/**
		 * EVERY ENLARGEMENT OPENS IN ONE PLACE — the ladder's own photo column.
		 *
		 * The rung photos all share a left edge, so anchoring to `r.right` put every rung's popout at the
		 * same x for free. The SPOUSE photo does not: it sits 343px further right, at the end of the
		 * paired row, so its popout opened well clear of the others and read as a different mechanism.
		 * Anchoring to the first rung's photo instead makes the column the anchor rather than the
		 * individual image, which is what the eye was already reading it as.
		 */
		const col = document.querySelector('.rung .rung-photo');
		const ax = col ? col.getBoundingClientRect().right : r.right;
		zoom = {
			src: img.src,
			alt: img.alt || '',
			w,
			h,
			ax,
			dy: offset
		};
	}
	const closeZoom = () => (zoom = null);

	/** Fixed horizontal at the photo's right edge + ZOFFSET, so the box never drifts sideways as the
	 *  mouse moves. Vertical is `t` read across the room the window has left, so the ends of that range
	 *  are reachable from any rung — see the note in trackZoom. */
	function zoomStyle(z: { w: number; h: number; ax: number; dy: number }): string {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const left = Math.max(8, Math.min(z.ax + ZOFFSET, vw - z.w - 8));
		const top = Math.max(8, Math.min((vh - z.h) / 2 + z.dy, vh - z.h - 8));
		return `left:${left}px; top:${top}px; width:${z.w}px; height:${z.h}px;`;
	}

	/** Portal to <body> so no ancestor's clip or overflow can reach it. Client-only: the `{#if zoom}` is
	 *  false during SSR and actions never run on the server. */
	function portalZoom(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}

	/**
	 * CLICKING A RUNG — THE STAGE DOES THE FLIGHT, NOT THE MODAL.
	 *
	 * Sam chose this shape: the ladder is a way of CHOOSING, and once chosen the app performs the move it
	 * would have performed anyway. So there is no bespoke transition bridging the two views — the modal
	 * closes with its own exit, the stage is revealed intact, and only then does the ordinary flight run.
	 *
	 * WHICH flight is decided by generation, and this is the one place the ladder's own arithmetic pays
	 * off: every rung is a lineal ancestor or descendant of the hero, so the move is ALWAYS vertical and
	 * the laterality question that bites cross-connections cannot arise here.
	 *
	 *     delta = clicked.g − hero.g      (g is 1-based; Thomas is 1)
	 *       −1   the hero's parent   →  the ordinary promotion, arriving from above
	 *       +1   the hero's child    →  the ordinary demotion, arriving from below
	 *     ≤ −2   the deck, gen-delta negative — vertical, from above
	 *     ≥ +2   the deck, gen-delta positive — vertical, from below
	 *        0   cannot occur: a chain holds one person per generation
	 *
	 * AND IT REUSES `warmPersonLinks` RATHER THAN CALLING flight.ts ITSELF. Every navigation in the app
	 * is driven off a clicked anchor's attributes, and re-implementing that here would mean duplicating
	 * the flight lock, the tier span, the tier-open height test, the pivot and the rect snapshot — the
	 * parallel-mechanism mistake CLAUDE.md warns about. For a ±1 move the REAL on-stage chip is clicked,
	 * so the promotion grows from the seat it always grows from; for a ±2 move there is no chip on stage
	 * (that person is not a neighbour), so a correctly-attributed anchor is synthesised at the card's own
	 * rect and clicked. Either way the one delegated handler does the work.
	 */
	/**
	 * NO WAIT — the flight begins in the same frame as the click, and this REPLACES the rule above it.
	 *
	 * It used to be deferred until the whole close had played, so the ladder cleared and only then did the
	 * card move. Sam's call is better: "can the transition start immediately on click, no delay, so its
	 * even moving under the few milliseconds of backdrop blur?" The two gestures now overlap — the cards
	 * sweep left and the veil lifts while, underneath, the promotion is already running — so what the
	 * reader uncovers is a stage in motion rather than one waiting to start.
	 *
	 * It is also the safer order for the ±1 case, not merely the nicer one: the on-stage chip is clicked
	 * while the ladder still covers it, so its rect is read before anything the close does can disturb
	 * the layout underneath.
	 */

	function rungNav(p: Rung, e: MouseEvent) {
		if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let the browser have it
		e.preventDefault();
		const slug = p.slug;
		if (!slug || p.id === focus?.id) {
			requestClose();
			return;
		}

		/**
		 * ON A MARRIED-IN LADDER THE REFERENCE IS THE PARTNER, NOT THE FOCUS.
		 *
		 * A married-in person has no `generation_from_thomas` — they are not on the line — so measuring
		 * against them yields null for every rung and every click would fall to the deck with no
		 * direction. The ladder is the PARTNER's, and the partner stands where the focus stands, so their
		 * generation is the honest reference: a rung two above the partner is two above the reader.
		 *
		 * And the partner's OWN rung is a spouse swap, not a promotion. They are the person on the other
		 * half of this card's notch, which the app already has a gesture for — "a brisk in-corner swap"
		 * — so it is asked for by name rather than approximated with a generation of 0.
		 */
		const lastRung = rows[rows.length - 1];
		const isPartner = viaSpouse && p.id === lastRung?.id;
		const refG = (viaSpouse ? lastRung?.g : focus?.g) ?? null;
		const delta = !isPartner && refG != null && p.g != null ? p.g - refG : null;
		requestClose();

		{
			const stage = document.querySelector('.page-container') ?? document.body;
			// The partner is a spouse chip in the card's own notch — the app's briskest navigation, and it
			// is right here for the same reason the ±1 case is: the chip is on stage, so click the real one.
			// ±1 — the person IS on stage, as a parent chip or in the children row. Click the real one.
			if (isPartner || delta === -1 || delta === 1) {
				const onStage = stage.querySelector<HTMLElement>(`a[href="/person/${slug}"]`);
				if (onStage) {
					onStage.click();
					return;
				}
			}
			// Otherwise a teleport. A card at that distance has no seat on this stage, so the anchor is
			// made rather than found — carrying `relation_class: 'direct'`, which is true by construction
			// here and is what makes isVerticalMove() answer on the gen-delta alone.
			const card = document.querySelector('.featured-card');
			const r = (card ?? stage).getBoundingClientRect();
			const a = document.createElement('a');
			a.href = `/person/${slug}`;
			a.dataset.cc = 'true';
			a.dataset.relationClass = 'direct';
			// `if (delta)` EXCLUDES 0 AS WELL AS NULL, and that is deliberate. A chain should never hold two
			// people at one generation, but 53 of 2165 do — every one of them downstream of the canonical
			// defects already catalogued (the inverted parent links, the missing `hd` flags, the Ingersoll
			// merge). `isVerticalMove` reads 0 as LATERAL, so passing it through would send a lineal move
			// sideways on exactly the entries whose data is least trustworthy. Omitting the attribute says
			// "direction unknown", which is the truth.
			if (delta) a.dataset.genDelta = String(delta);
			a.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;opacity:0;pointer-events:none;`;
			stage.appendChild(a);
			a.click();
			a.remove();
		}
	}

	/**
	 * TYPE THAT FITS, ROW BY ROW — the card's own `shrinkToFit`, not an ellipsis.
	 *
	 * A PAIRED rung is only 76% of the column, and at that width a name like "Martha Newton Whittlesey"
	 * ran out of room and truncated mid-word beside its own years. Sam's shape: **no blurb, drop the
	 * years to a second line so the name has the whole of the first; a blurb, clamp both rows to fit.**
	 *
	 * Applied to EVERY rung rather than only the narrow ones. A chip already shrinks independently of its
	 * neighbours all over this app, so ragged sizes down a column is the house's normal look rather than
	 * a new one — and a rule that only engages on the paired row would leave the ordinary rows truncating
	 * for exactly the same reason, just less often.
	 *
	 * The action writes `fontSize` on the LINE, so the spans inside are sized in `em` against it.
	 */
	const tt = (px: number) => px * stage.k * fit;

	/** `.rung-y`'s own `font-size: 0.846em`, in JS so the spouse card's year CEILING can be expressed
	 *  in the same unit the rungs are. Keep the two in step if either moves. */
	const RUNG_Y_EM = 0.846;

	/**
	 * THE SPOUSE CARD IS SET AT THE ORDINARY RUNG SIZE — `tt(14.3)`, the same ceiling every other card
	 * on the ladder uses. It is not derived from anything.
	 *
	 * TRIED AND REVERTED (August 26–27): capping the spouse at the PARTNER's settled size, measured
	 * back out of the DOM after shrinkToFit had run. The reasoning was that the pair reads as two type
	 * scales on one row. The reasoning was wrong, because the partner is the one card on the ladder
	 * that is guaranteed to be shrunk — it is cut to 76% to make room for this card — so pinning the
	 * spouse to it made the spouse the SMALLEST text in the modal instead of the largest, and the pair
	 * read as two type scales in the other direction. Sam: "why is the John Rockefeller and his years
	 * so small? he doesn't have to match his spouse. the idea is that he just matches all of the other
	 * font sizes that aren't his spouse."
	 *
	 * THE RULE THAT REPLACES IT, and it is the simpler one that should have been reached for first:
	 * **the ladder has ONE type ceiling and every card is measured against that, never against a
	 * neighbour.** A card that has to shrink shrinks on its own account. Deriving one card's size from
	 * another's makes the derived card hostage to whatever squeezed the other one.
	 */
	const yearsOf = (p: PersonCompact) =>
		p.pv ? '' : [p.by ?? '', p.dy ? `–${p.dy}` : p.by ? '–' : ''].join('');
</script>

<svelte:window on:keydown={onKeydown} />

{#if open && rows.length}
	<div
		class="veil"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) requestClose();
		}}
		in:veil={{ duration: VEIL_IN_MS }}
		out:veil={{ duration: VEIL_OUT_MS, delay: veilOutDelay }}
	></div>

	<div
		bind:this={ladderEl}
		class="ladder"
		style="--ladder-fit: {fit.toFixed(4)}"
		role="dialog"
		aria-modal="true"
		aria-label="Paths to Thomas Hooker"
		tabindex="-1"
	>
		<!-- IT ARRIVES LAST, once every card has landed. The title, the path numbers and the X are the
		     room's furniture, and furniture that is already there before the objects arrive says the page
		     merely loaded — Sam: "should not be visible until all cards have entered and settled in the
		     final position. instead this text is just sitting there right away." The delay is the ladder's
		     own build time, so it is right for a three-rung ladder and a fifteen-rung one alike.

		     OUT is a plain fade, not the same wait in reverse: it used to be removed in the frame the
		     modal closed, so the title and tabs blinked out while cards were still travelling. -->
		<div
			class="ladder-head"
			in:fade={{ delay: buildMs, duration: 300 }}
			out:fade={{ duration: CLOSE_MS }}
		>
			<!-- SINGULAR WHEN THERE IS ONE, and that is the common case rather than an edge: 91.3% of
			     descendants have exactly one route. The tab strip is already hidden for them, so a plural
			     title was the last thing on screen claiming a choice they do not have. -->
			<span class="ladder-title">{paths.length > 1 ? 'Paths' : 'Path'} to Thomas</span>
			<!-- HIDDEN AT ONE PATH (Sam). 91.3% of descendants have exactly one route, so for nearly
			     everyone this control does not exist rather than sitting there with a single option. -->
			{#if paths.length > 1}
				<div class="ladder-tabs" role="tablist" aria-label="Which path">
					{#each paths as _, i}
						<button
							type="button"
							role="tab"
							class="ladder-tab"
							class:on={i === pathIndex}
							disabled={switching}
							aria-selected={i === pathIndex}
							onclick={() => choosePath(i)}>{i + 1}</button
						>
					{/each}
				</div>
			{/if}
			<button type="button" class="ladder-x" onclick={requestClose} aria-label="Close">
				<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
					<path
						d="M6 6 L18 18 M18 6 L6 18"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
					/>
				</svg>
			</button>
		</div>

		<div class="ladder-rows" style="height: {rowsHeight.toFixed(1)}px">
			<!-- KEYED BY `p.id` ALONE. A person cannot repeat inside one chain (the walk's own cycle guard
			     sees to that), so the id is unique per path — and across two paths it is what makes a
			     shared ancestor the SAME element rather than a new one. That is what buys the whole
			     switch: survivors are never destroyed, so they can flip to a new seat while the leavers
			     run out the left. -->
			{#each rows as p, i (p.id)}
				{@const paired = viaSpouse && i === rows.length - 1}
				{@const yearsBelow = paired && !p.bl}
				<!-- `|global` IS LOAD-BEARING, not a flourish. A `transition:` is LOCAL by default — it plays
				     only when the element's OWN block changes, not when an ancestor block mounts. These
				     rungs live inside the `{#if open}`, so on open the whole ladder is created at once and
				     every rung's intro was skipped: measured, translateX read 0 on every row in every frame
				     while the veil beside them animated correctly, because the veil is a direct child of
				     the `{#if}` and the rungs are two blocks deep. It presented as "the animation does
				     nothing", which is the same family as a filled animation outranking a declaration. -->
				<!-- AN ANCHOR, and not only for the click. `a.person-box:hover` in layout.css is the project's
				     card hover — `--chip-shadow-hover`, whose own token comment records it as the "chip
				     lifts slightly" behaviour — so being a real `a.person-box` inherits the house treatment
				     instead of restating it. The href is a genuine person URL, so middle-click and
				     cmd-click open a tab exactly as they do from a chip on the stage. -->
				<a
					href={p.slug ? `/person/${p.slug}` : '#'}
					onclick={(e) => rungNav(p, e)}
					data-rid={p.id}
					class="rung person-box"
					class:hooker-line={p.hd}
					class:spouse-line={p.sp}
					class:ee-line={p.ee}
					class:paired={viaSpouse && i === rows.length - 1}
					in:arrive|global={{ i, n: rows.length }}
					out:depart|global={{ i, n: rows.length }}
					animate:flip={{ delay: flipDelay, duration: FLIP_MS, easing: cubicOut }}
				>
					<!-- `alt=""` ON PURPOSE, and it is the correct call twice over. The name is set immediately
					     beside the photo, so to a screen reader the image is decorative and an alt would read
					     the person twice. And 161 of the corpus's 3,083 photos are hotlinked off Cloudinary
					     (findagrave, wikitree, honorstates); those hosts block it, and a failed image with an
					     alt paints the NAME inside the little square, which reads as a broken card rather
					     than as a missing photo. Empty alt fails to an empty seat.

					     SQUARE, like every chip's photo, and through the SAME Cloudinary derivative
					     (`cldSize(p.p, PHOTO_TRANSFORM)`) — one shared image per person means a rung is a
					     cache hit off whatever chip or card already showed them, which is design §24's
					     whole point. The seat keeps its width when empty: two thirds of rungs have no
					     portrait, and a column that collapsed would leave the ladder's left edge ragged. -->
					<div class="rung-photo">
						{#if p.p}<img
								src={cldSize(p.p, PHOTO_TRANSFORM)}
								alt=""
								class={p.pp ? '' : 'object-top'}
								style={p.pp ? `object-position: ${p.pp}` : undefined}
								loading="eager"
								onmouseenter={trackZoom}
								onmousemove={trackZoom}
								onmouseleave={closeZoom}
							/>{/if}
					</div>
					<!-- THE GENERATION SITS BESIDE THE PORTRAIT, not out at the card's right edge (Sam). It
					     belongs to the person, so it travels with their face; parked on the far edge it
					     read as a row number in a table, which is the thing this ladder is not.

					     IT IS THE RUNG'S DEPTH IN *THIS* PATH, NOT THE PERSON'S STORED GENERATION — and
					     that distinction is the whole of it. `generation_from_thomas` is one number per
					     PERSON; depth is a property of the ROUTE, and under pedigree collapse the two
					     genuinely differ. Sarah Knutti's path 2 showed TWO number 8s: Aurelia Dwight Hooker
					     is a descendant in her own right at generation 8 who married a SEVENTH-generation
					     Hooker, so their son is 8 generations from Thomas through his father and 9 through
					     his mother. His stored 8 is the shorter of the two and is correct; it is simply not
					     the depth of the rung he occupies on the longer route. 278 of 20,473 paths carry a
					     repeat like this.

					     Counting the position instead is always consecutive and always true of the path on
					     screen. It also keeps Sam's reason for the original choice intact: measured across
					     the corpus, position equals the stored generation on PATH 1 for 99.93% of rungs, so
					     the shortest route still lines up with the descent line printed on the card. Where a
					     longer route disagrees, it disagrees because it IS longer — which is the fact the
					     path selector exists to show. -->
					<div class="rung-gen">{i + 1}</div>
					<!-- NAME AND YEARS ON ONE LINE, years to the RIGHT (Sam). A chip stacks them, and this
					     was briefly changed to match — but a chip is 220 wide and a rung is 440, so the
					     stack that fills a chip leaves a rung half empty and makes a long card look like a
					     short one with padding. The extra width is the reason to set them in series. -->
					<div class="rung-body">
						<div
							class="rung-line1"
							use:shrinkToFit={{
								max: tt(14.3),
								/**
								 * A PAIRED CARD GETS A LOWER FLOOR, because it is a narrower card. It is cut to
								 * 76% to make room for the spouse beside it, and 10.6 is the floor for the full
								 * width — so a paired row whose line one cannot fit at 10.6 simply overflowed
								 * and the card clipped it.
								 *
								 * That is exactly what happened to Blanchette Ferry Hooker Rockefeller: she has
								 * a blurb, so `yearsBelow` does not fire and her years stay on line one behind a
								 * 35-character name. At the floor the line still overran and the YEARS were the
								 * part that got cut — "1909–199" — which is the worst thing to lose, because a
								 * clipped name still reads as a name while a clipped year reads as an error.
								 *
								 * 8.6 is 10.6 scaled by the same 76% the card itself was, so the floor now means
								 * the same thing on both widths. The spouse card beside it already had its own
								 * lower floor (8.2) for precisely this reason.
								 */
								min: tt(paired ? 8.6 : 10.6),
								key: `${p.id}|${yearsBelow}|${paired}|${stage.u}|${stage.k}|${fit}`
							}}
						>
							<span data-fit class="inline-block whitespace-nowrap">
								<span class="rung-n">{p.n}</span>{#if !yearsBelow}<span class="rung-y"
										>{yearsOf(p)}</span
									>{/if}
							</span>
							<!-- INSIDE the fitted line, not beside it. As its own element it carried an absolute
							     size while the name above was being shrunk, so on a squeezed card the years came
							     out nearly as large as the name and read heavier than it — Sam: "looks horrible
							     when the year below is massively bigger than name". In here it inherits whatever
							     `shrinkToFit` settled on and keeps its 0.846 ratio at every size. It sits AFTER
							     the `[data-fit]` span, so it is not part of what the action measures. -->
							{#if yearsBelow}
								<span class="rung-y rung-y-below">{yearsOf(p)}</span>
							{/if}
						</div>
						<!-- SECOND LINE: the blurb alone. It briefly also carried the marriage the descent ran
						     through, at the far right; Sam cut it as "too much in one card". See the note in
						     pathsToThomasFor for the derivation, which is cheap to restore. -->
						<!-- The second line is the blurb when there is one, and the YEARS when there is not and the
						     row is paired — which is what buys the name the whole of the line above. -->
						{#if p.bl}
							<div
								class="rung-line2"
								use:shrinkToFit={{
									max: tt(11.55),
									min: tt(9),
									key: `${p.id}|${paired}|${stage.u}|${stage.k}|${fit}`
								}}
							>
								<span data-fit class="rung-bl inline-block whitespace-nowrap">{p.bl}</span>
							</div>
						{/if}
					</div>
				</a>
			{/each}

			<!-- THE MARRIED-IN PARTNER — a SIBLING of the rungs, not a child of the last one.
			     It was briefly nested inside that anchor, which was wrong in two ways at once: clicking
			     this card would have navigated to the Hooker spouse rather than doing nothing, and its
			     text joined the link's accessible name (a probe caught both — "resolved to 2 elements").
			     Out here it is exactly what it looks like: a second card, beside the first, that is not a
			     link because it is the card you are already on.

			     Docked past the last rung's right edge and overhanging the ladder, at half the column's
			     width, name and dates only, on the mint `spouse-line` paper this person's own chip takes
			     everywhere else (§29.4) — so the pair reads as "this person, and the Hooker they married"
			     without a word of explanation. -->
			{#if viaSpouse && focus}
				<!-- AN ANCHOR like every other card here (Sam) — pointer cursor and the house hover come from
				     `a.person-box:hover` for free. Clicking it goes through the same handler, which
				     short-circuits on `p.id === focus.id` and simply closes: this is the card you are
				     already on, so "return to it" and "close" are the same gesture. -->
				<a
					href={focus.slug ? `/person/${focus.slug}` : '#'}
					onclick={(e) => rungNav(focus as Rung, e)}
					data-rid={focus.id}
					class="rung-spouse person-box spouse-line"
					style="--sp-y-max: {tt(14.3) * RUNG_Y_EM}px"
					class:no-photo={!focus.p}
					class:prism={focus.id === PRISM_SPOUSE}
					in:arrive|global={{ i: rows.length - 1, n: rows.length }}
					out:depart|global={{ i: rows.length - 1, n: rows.length }}
				>
					<!-- The photo appears only when there is one, and its seat goes with it — unlike a rung's,
					     which holds its width empty. A rung keeps the ladder's left edge straight down twelve
					     rows; this card is alone, so an empty square beside it would be a hole rather than a
					     column. Same square crop and the same shared derivative as everywhere else. -->
					{#if focus.p}
						<div class="rung-photo">
							<img
								src={cldSize(focus.p, PHOTO_TRANSFORM)}
								alt=""
								class={focus.pp ? '' : 'object-top'}
								style={focus.pp ? `object-position: ${focus.pp}` : undefined}
								loading="eager"
								onmouseenter={trackZoom}
								onmousemove={trackZoom}
								onmouseleave={closeZoom}
							/>
						</div>
					{/if}
					<!-- FIRST AND LAST NAME (Sam), which is the compact's `sn` — the same short name this
					     person's own chips show, so the pair does not call her one thing here and another on
					     the stage. It is also the only form that fits: this card is half a rung wide and the
					     photo takes a square of it. -->
					<div class="rung-spouse-body">
						<!-- Clamped for the same reason and with the same action: this card is 220px with a
						     square photo in it, and a married-in surname can easily outrun Chauncey's. -->
						<div
							class="rung-line1"
							use:shrinkToFit={{
								// The ladder's one ceiling, the same as every rung's. Not derived from the partner —
								// see the note above `yearsOf`. Still free to shrink on its own account below.
								max: tt(14.3),
								// A LOWER FLOOR THAN A RUNG'S, because this card has less room than any of them:
								// 220px with a 73px square photo in it leaves ~125px of text. "Alexander John
								// Chandler" is 23 characters and stopped at the old 10px floor with an ellipsis
								// still showing — and an ellipsis here hides a surname, which is the half of the
								// name that says who they married into.
								min: tt(8.2),
								key: `${focus.id}|${stage.u}|${stage.k}|${fit}`
							}}
						>
							<!-- THE SAME NESTING AS A RUNG'S, and it has to be. Here `.rung-n` was the `[data-fit]`
							     inline-block itself, while on a rung it is an inline span INSIDE that block —
							     so one reported the inline-block's line-height box and the other the text's own
							     ascent/descent, and the years sat 3.3px under the name on this card against
							     −0.6px on the one beside it. Identical structure, identical spacing. -->
							<span data-fit class="inline-block whitespace-nowrap">
								<!-- THE SUFFIX IS SHOWN HERE AND NOWHERE ELSE (Sam). `sn` is the chip name and chips
								     are 220px wide, so a suffix is dropped from it by design — but this card is the
								     one place a married-in person is named ALONE, beside a partner who carries the
								     surname too, and "John Rockefeller" beside "Blanchette Ferry Hooker Rockefeller"
								     loses the one token that says WHICH John Rockefeller. It comes from the same
								     `generationalSuffix()` the slug uses, so the card and the URL agree. -->
								<span class="rung-n">{focus.sn ?? focus.n}{focus.sf ? ` ${focus.sf}` : ''}</span>
							</span>
							<span class="rung-y rung-y-below">{yearsOf(focus)}</span>
						</div>
					</div>
				</a>
			{/if}
		</div>
	</div>
{/if}

<!-- The enlargement. Centred, `pointer-events: none`, portalled to <body>. The shadow and hairline ring
     are FeaturedCard's exact values so the two popouts are visibly the same object in two places. -->
{#if zoom}
	<div use:portalZoom class="zoom-float" style={zoomStyle(zoom)} aria-hidden="true">
		<img src={zoom.src} alt={zoom.alt} />
	</div>
{/if}

<style>
	.veil {
		position: fixed;
		inset: 0;
		z-index: 40;
		/* MARSHMALLOW — Sam's own token, and the veil is finally the colour those investment modals used.
		   `#f0eee4` at its own value, barely deepened toward the edge, and — the part that matters — at a
		   THIRD of the alpha it started with. It has been wrong in two different ways and they are worth
		   separating, because they are not the same dial:

		     TOO DEEP   the colour was darkened 8% first. Given back in full.
		     TOO DENSE  "too white, covered up too much of background" — that is ALPHA, and it fell from
		                0.72/0.79/0.85 to 0.38/0.45/0.52, then another 5% to 0.36/0.43/0.49.

		   And then, at that lower coverage, the COLOUR came down one small step of its own — marshmallow
		   itself reads as white once it is only a third opaque (Sam: "its all too white"). Each stop moved
		   down one place in the ramp it was already on, so the three keep their relationship and only the
		   whole thing sits a shade lower.

		   The first correction was read as the second and the colour was moved when the opacity was what
		   was wrong. At a third of the coverage the veil stops being a sheet laid over the page and becomes
		   what those investment modals actually did — `bg-marshmallow/30`, with the BLUR doing the
		   separating and the tint only warming it. Keeps the one-colour-under-one-light construction that
		   makes a ground read as a room (§43.6).

		   THIS INVERTS THE ROOM, and the shadow is what pays for it. Every version before was darker than
		   the page; this is a shade OF the page, so separation no longer comes from contrast — it comes
		   from the blur and from each card's own drop shadow. Lightening the ground therefore had to be
		   paid for by DEEPENING that shadow rather than by leaving it alone (Sam asked for both in one
		   breath, and they are the same decision seen from two ends). See `.rung` below.

		   The whole set is held in layout.css; the other seven are backup and have no consumer yet. */
		background: radial-gradient(
			120% 90% at 50% 42%,
			rgba(228, 226, 216, 0.36) 0%,
			rgba(222, 220, 210, 0.43) 55%,
			rgba(216, 214, 204, 0.49) 100%
		);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}
	.ladder {
		/* THE FIT EASES, IT DOES NOT STEP. See the @property note in layout.css: a stepped change made
		   `animate:flip` scale every surviving card ~10% and spring back, because flip interpolates size
		   as well as position. Eased, its two measurements land at the same size and it translates only.
		   The clock is the survivors' own (FLIP_MS), so the resize and the reshuffle finish together. */
		transition: --ladder-fit 460ms cubic-bezier(0.33, 1, 0.68, 1);
		position: fixed;
		inset: 0;
		z-index: 41;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 14px;
		/* The rows are the only thing here; nothing is caught except what a row claims. */
		pointer-events: none;
		outline: none;
	}
	.ladder-head,
	/* CHROME, not content — the title, the path tabs and the X are the ROOM's furniture.
	   
	   THE INK FOLLOWED THE ROOM WHEN THE ROOM INVERTED. These were cream, which was right while the veil
	   was midnight and is the pairing the Ascension uses. Marshmallow is a shade of the PAGE, so cream on
	   it is cream on cream: measured on the first render, the title, the tabs and the X were all but
	   invisible. Design §41.3 states the rule from the other side — "cream ink is defined entirely by the
	   dark behind it" — and the corollary is that it cannot outlive the dark. So the furniture takes
	   ink-blue now, the same ink the cards use, and the two are told apart by WEIGHT and SIZE rather than
	   by hue: the chrome is small, letterspaced and set back, the cards are solid objects with shadows. */
	.ladder-head,
	.ladder-rows {
		pointer-events: auto;
	}
	.ladder-head {
		position: relative;
		display: flex;
		align-items: center;
		gap: 14px;
		width: min(440px, 84vw);
	}
	.ladder-title {
		font-family: var(--font-opensans, sans-serif);
		font-size: calc(14px * var(--type-k, 1));
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-inkblue);
		opacity: 0.83;
	}
	.ladder-tabs {
		display: flex;
		gap: 4px;
	}
	.ladder-tab {
		width: 22px;
		height: 22px;
		padding: 0;
		font-family: var(--font-opensans, sans-serif);
		font-size: calc(11px * var(--type-k, 1));
		font-weight: 600;
		color: var(--color-inkblue);
		background: none;
		border: 1px solid rgba(30, 42, 71, 0.3);
		border-radius: 3px;
		opacity: 0.6;
		cursor: pointer;
		transition:
			opacity 160ms ease-out,
			border-color 160ms ease-out;
	}
	.ladder-tab:hover {
		opacity: 0.9;
	}
	.ladder-tab:disabled {
		cursor: default;
		opacity: 0.3;
	}
	.ladder-tab.on {
		opacity: 1;
		border-color: rgba(30, 42, 71, 0.62);
	}
	.ladder-x {
		margin-left: auto;
		/* THE GLYPH IS FLUSH, NOT THE BOX. The hit area is 34px around a 22px icon, so a box aligned to
		   the edge leaves the visible X six pixels short of it — measured against the rungs' right edge
		   at 933 vs the glyph's 927. The negative margin gives those six back, so what the eye lines up
		   against the cards is the mark rather than its padding. The 34px target is untouched. */
		margin-right: -6px;
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		padding: 0;
		color: var(--color-inkblue);
		background: none;
		border: 0;
		opacity: 0.55;
		cursor: pointer;
		transition: opacity 200ms ease-out;
	}
	.ladder-x:hover,
	.ladder-x:focus-visible {
		opacity: 1;
	}
	.ladder-rows {
		position: relative;
		display: flex;
		/* Centred inside its own reserved height: on the longest path the rows fill it exactly, on a
		   shorter one they sit centred in a box that has not changed size. */
		justify-content: center;
		flex-direction: column;
		/* A REAL GAP, because these are separate objects. The first build butted the lines together and
		   ruled between them, which is a table; discrete cards need air, the way every chip row on the
		   stage does.
		   
		   WIDENED WITH THE CARDS, and that half is mine rather than asked for: Sam's 4% was about the
		   cards, but the REASON given was "to make hover drop shadow more clear", and a shadow is only
		   visible in the space beside the object casting it. Six pixels was less than the shadow's own
		   9.6px blur, so most of it was landing under the next card. Say the word and this returns to 6
		   independently of the card height. */
		gap: calc(9px * var(--stage-u, 1) * var(--ladder-fit, 1));
		width: min(440px, 84vw);
	}

	/* THE RUNG'S GEOMETRY, and ONLY its geometry. Paper, shadow, line-status fill and the `--line-edge`
	   rule all arrive from the global `.person-box` block in layout.css — this rule must not restate any
	   of them, or the next change to the chip shadow will fix every chip in the app and miss the ladder.

	   LONG AND LOW rather than the chip's 220x75 (aspect 2.93). At 440x48 the aspect is 9.2, which is
	   the shape Sam asked for — "long in shape more than square and not large". It deliberately does NOT
	   join the chip's size-tier family: those three tiers all hold 2.93 exactly, because flight.ts reads
	   the x/y scale difference to decide whether a landing is same-tier, and a fourth aspect in that set
	   would quietly change which flight runs for a chip. A rung is a different object that borrows the
	   chip's SURFACE, not a fourth chip tier.

	   48px is what makes fifteen rungs fit: the tallest ladder in the corpus is 15 rows, and 15 x 54
	   (48 + the 6px gap) is 810px before the stage unit scales it down on a shorter window. */
	/* THE RUNG'S GEOMETRY, and ONLY its geometry. Paper, shadow, line-status fill and the `--line-edge`
	   rule all arrive from the global `.person-box` block in layout.css — this rule must not restate any
	   of them, or the next change to the chip shadow will fix every chip in the app and miss the ladder.

	   THE FRAME IS THE CHIP'S, MEASURED OFF ONE: 8px radius (`rounded-lg`), `overflow: hidden`, a SQUARE
	   photo flush to the left edge running the full height, and the text stacked name-over-years in the
	   chip's own `px-2.5` inset. The first pass guessed at all four — 4px radius, a 3:4 portrait, name
	   and years inline — and the result read as a table row wearing a card's shadow.

	   LONG AND LOW rather than the chip's 220x75 (aspect 2.93). It deliberately does NOT join the chip's
	   size-tier family: those three tiers hold 2.93 EXACTLY, because flight.ts reads the x/y scale
	   difference to decide whether a landing is same-tier, and a fourth aspect in that set would quietly
	   change which flight runs for a real chip. A rung borrows the chip's SURFACE, not its tier. */
	.rung {
		/**
		 * A DEEPER SHADOW THAN A CHIP'S, and design §29 is why that is not an inconsistency.
		 *
		 * §29.7: how dark a shadow reads depends on the DISTANCE from its ink to the ground, so a value is
		 * a property of the PAIR (colour, ground) and not of the colour — "read the Δ column, never the
		 * alpha". A chip's `--chip-shadow` was measured against the photographed parchment. A rung sits on
		 * a marshmallow veil over a BLURRED version of that parchment, which is a different ground, and on
		 * it the same alpha reads lighter. So the geometry and the INK are the chip's exactly — only the
		 * two alphas are multiplied — and the house ink stays the single source: re-hue `--shadow-ink` and
		 * this follows, which a hard-coded rgba would not.
		 */
		box-shadow:
			0 3.2px 9.6px hsl(var(--shadow-ink) / calc(var(--shadow-a1) * 1.45)),
			0 0.8px 2.4px hsl(var(--shadow-ink) / calc(var(--shadow-a2) * 1.35));
		cursor: pointer;
		text-decoration: none;
		display: flex;
		align-items: stretch;
		height: calc(72.8px * var(--stage-u, 1) * var(--ladder-fit, 1));
		/**
		 * A RUNG MAY NOT SHRINK — and this one line is the whole of the smoosh Sam filmed.
		 *
		 * `.ladder-rows` is a flex COLUMN with a reserved height, and a flex item's default is
		 * `flex: 0 1 auto` — SHRINKABLE. For one frame during a switch the column holds BOTH paths
		 * (the arrivals are in flow from the frame they mount; the leavers have not been pulled out
		 * yet), so the column is over-full and the flex algorithm squashes every item to fit.
		 *
		 * That frame is where the damage is done, because it is the frame Svelte MEASURES IN. A keyed
		 * each with `animate:` freezes an outgoing element's box by reading its computed size and
		 * writing it back inline — so each leaver was frozen at its SQUASHED height (measured: 39.2,
		 * 44.4, 48.5, 53.2, 58.8 against a true 65.4) and then departed at that size. The gradient is
		 * the tell: each leaver Svelte pulls out makes the column less over-full, so the next one
		 * measures a little taller.
		 *
		 * ONLY CARDS WITHOUT A PHOTO SHOWED IT (Sam saw this before I did), because `min-height: auto`
		 * floors a flex item at its min-content height and an `<img>` supplies one — text alone
		 * collapses to almost nothing. Which is why it read as a bug about photos rather than one
		 * about flex.
		 *
		 * The same finding as the search result row, in a second component: an explicit `height` on a
		 * flex item is a REQUEST, not a floor, until `flex: none` says otherwise.
		 */
		flex: none;
		border-radius: 8px;
		/* VISIBLE, not hidden, so a married-in partner's card can overhang the right edge. The photo was
		   the only thing that ever needed clipping and it now clips itself, which is the smaller claim. */
		overflow: visible;
	}
	/* THE PAIR. Cut to 76% so the two together still read as ONE row rather than a row and a half; the
	   partner takes 50% of the column and is docked past the Hooker card's right edge, so the pair runs
	   about 120px beyond the ladder and that overhang is what says "this one is attached to that one".
	   Sam: "stick it to the right of the hooker spouse, sticking off to the right to make clear this is
	   the spouse." */
	.rung.paired {
		width: 76%;
	}
	/* Positioned against `.ladder-rows` (which is already `position: relative` for the leavers), and
	   anchored to its BOTTOM — the paired rung is always the last one, so the bottom edge is the same
	   edge, and this needs no measurement of the row it sits beside. */
	.rung-spouse {
		cursor: pointer;
		text-decoration: none;
		position: absolute;
		bottom: 0;
		height: calc(72.8px * var(--stage-u, 1) * var(--ladder-fit, 1));
		left: calc(76% + 8px);
		display: flex;
		align-items: stretch;
		width: 50%;
		border-radius: 8px;
		overflow: visible;
		/**
		 * A DEEPER MINT THAN A CHIP'S, and §29.1 is why that is not a divergence.
		 *
		 * `--spouse-bg` (#f3fefa) was measured against the PHOTOGRAPHED PARCHMENT, where the whole
		 * line-status palette lives inside ~5 DeltaE on purpose (§29.11). Here the card sits on a
		 * marshmallow veil, beside a cream Hooker card — a different pair, and §29.1's rule is that every
		 * one of those numbers is a property of the PAIR rather than of the colour. Against #fffdf8 the
		 * chip value came out nearly white and Sam read the mint as gone: "that was essential."
		 *
		 * So the tint is deepened HERE and `--spouse-bg` is untouched, which keeps every chip on the
		 * stage exactly as measured. §29.6 is the reason it is only a few points: up at L* 97 a small
		 * lightness move releases a great deal of chroma, so this is walked in fractions rather than
		 * stepped.
		 */
		--card-bg: #e3fbf2;
	}
	/* STACKED, not inline. A rung is 440 wide and sets name and years in series; this card is 220 with a
	   square photo in it, so the same two facts have to go one above the other. */
	.rung-spouse-body {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		justify-content: center;
		gap: 2px;
		min-width: 0;
		padding: 0 calc(11px * var(--stage-u, 1));
	}
	/* WITHOUT A PHOTO the text is the card's first thing, and 11px against the edge reads as shoved up
	   against it — Sam, on Gertrude. A rung never has this problem because its photo seat holds its width
	   empty and keeps the column straight; this card drops the seat entirely when there is nothing to put
	   in it (see the markup), so the inset has to come back as padding. Deliberately NOT a photo's width:
	   the point is breathing room, not a phantom square. */
	/* PersonBox's OWN values, and they transfer here because the two boxes are almost the same size —
	   its comment warns that neither the crop nor the veil carries between a 220x75 chip and a 925x575
	   card, and this paired card is 220x73. `cover` on the veil, `200% auto` on the texture so the chip
	   shows a legibly DIAGONAL piece of the band rather than a thin horizontal stripe of one hue.
	   It overrides the mint by sitting after `--card-bg` in this file: `background-image` paints above
	   the `background-color` the spouse-line sets, so both are still there and the tint warms it. */
	.rung-spouse.prism {
		--prism-fade: 0.48;
		background-image:
			linear-gradient(
				rgba(255, 255, 255, var(--prism-fade)),
				rgba(255, 255, 255, var(--prism-fade))
			),
			url('/textures/prism-card.jpg');
		background-repeat: no-repeat, no-repeat;
		background-position:
			center,
			30% 40%;
		background-size:
			cover,
			200% auto;
	}
	.rung-spouse.no-photo .rung-spouse-body {
		padding-left: calc(20px * var(--stage-u, 1));
	}
	.rung-spouse .rung-n,
	.rung-spouse .rung-y {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	/* `:global` because the portal moves this node to <body>, where Svelte's scoping attribute still
	   rides along but the component's own scope no longer contains it in the way a nested rule expects.
	   Written out rather than borrowed as Tailwind classes so the values are readable beside the
	   comment that explains them. */
	:global(.zoom-float) {
		position: fixed;
		z-index: 9999;
		pointer-events: none;
	}
	:global(.zoom-float img) {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 6px;
		/* FeaturedCard's own values. The negative x is the whole character of it — the light is up and to
		   the right, so the shadow falls LEFT, which is what makes the picture read as lifted off the page
		   rather than pasted onto it. */
		box-shadow: -18px 22px 48px -12px rgba(0, 0, 0, 0.55);
		outline: 1px solid rgba(0, 0, 0, 0.1);
		outline-offset: -1px;
	}
	/* NO LIFT. The rung used to rise 1.3px as well; Sam's call is the chip's own hover and nothing else —
	   which arrives free from `a.person-box:hover` in layout.css (`--chip-shadow-hover`, the same shadow a
	   spouse or parent chip takes). There is deliberately no rule here: writing one would be restating a
	   value that already has a home, and the next change to the chip hover would then miss the ladder. */
	.rung-photo {
		flex: 0 0 auto;
		aspect-ratio: 1 / 1;
		height: 100%;
		background: var(--color-stone100, #f5f5f4);
		/* Its own clip, now that the rung's is gone. */
		border-top-left-radius: 8px;
		border-bottom-left-radius: 8px;
		overflow: hidden;
	}
	.rung-photo img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.rung-photo img.object-top {
		object-position: top;
	}
	.rung-gen {
		flex: 0 0 auto;
		align-self: center;
		width: calc(30px * var(--stage-u, 1) * var(--ladder-fit, 1));
		font-size: calc(12.1px * var(--type-k, 1) * var(--ladder-fit, 1));
		font-variant-numeric: tabular-nums;
		text-align: center;
		color: var(--color-inkblue);
		opacity: 0.4;
	}
	.rung-body {
		/* `align-self: center` and not `stretch`: stretched to the card's full height the text sits at the
		   TOP of that box, which left the name riding high above the generation number beside it. */
		align-self: center;
		flex: 1 1 auto;
		min-width: 0;
		padding: 0 calc(10px * var(--stage-u, 1));
	}
	/* A BLOCK, not a flex row. `shrinkToFit` measures the wrapper's available width against a single
	   `[data-fit]` inline span; a flex parent sizes to its children instead and nothing ever shrinks —
	   the same `min-w-0` trap FeaturedCard records for the card's own name. */
	.rung-line1 {
		display: block;
		min-width: 0;
		line-height: 1.15;
	}
	.rung-line2 {
		min-width: 0;
		margin-top: 1px;
	}

	.rung-bl {
		display: block;
		font-family: var(--font-opensans, sans-serif);
		font-size: 1em;
		color: var(--color-inkblue);
		opacity: 0.62;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ONE INK AT TWO STRENGTHS — the chip's own rule (PersonBox: CHIP_TEXT / CHIP_YEARS). The years take
	   ALPHA rather than a lighter blue, so a rung reads as one object at two strengths rather than as two
	   colours.

	   OPEN SANS, NOT THE CHIP'S INHERITED INTER. A pass matching the chip exactly moved this to Inter on
	   the reasoning that a rung borrows the chip's surface and should borrow its type with it; Sam's call
	   is the face that was here before. Worth writing down so it is not "corrected" back: the surface is
	   shared because the object is the same KIND of thing, but a rung is set at a different width and
	   read in a list, and those are type decisions of their own. */
	/* `em`, NOT px. `shrinkToFit` writes `fontSize` on `.rung-line1`/`.rung-line2`, so anything inside
	   that restated its own px size would ignore the fit it was just given. The ratios are the ones the
	   old absolute values expressed: years 12.1/14.3, blurb 11.55 against its own line's 11.55. */
	.rung-n {
		font-family: var(--font-opensans, sans-serif);
		font-size: 1em;
		font-weight: 500;
		color: var(--color-inkblue);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.rung-y {
		flex: 0 0 auto;
		margin-left: calc(8px * var(--stage-u, 1));
		font-family: var(--font-opensans, sans-serif);
		font-size: 0.846em;
		color: var(--color-inkblue);
		opacity: 0.7;
		white-space: nowrap;
	}
	/* PROPORTIONAL, like the inline form — 0.846 of whatever the fitted line settled on. `block` puts it
	   on its own row without leaving the fitted parent.

	   DECLARED AFTER `.rung-y`, and that placement is the rule rather than tidiness. Both are single
	   classes, so specificity cannot separate them and SOURCE ORDER decides (§29.9). Sitting above
	   `.rung-y`, its `margin-left: 0` lost to that rule's 8px gap and the years sat indented under the
	   name — visible on Josephine's card and on nothing else, because hers is the only form that puts
	   them on their own line. */
	/**
	 * THE SPOUSE CARD'S YEARS ARE CAPPED AT A RUNG'S YEARS (Sam: "give the years a max font size in the
	 * spouse chip even though its wrapped").
	 *
	 * Everywhere else on the ladder the years are `0.846em` of a line that shrinks when the NAME beside
	 * them does not fit — name and years travel together because they share one line. On this card they
	 * are stacked, so the years are not what forces the fit, and a short spouse name sitting at the
	 * ceiling puts them at full size next to rungs whose long names have shrunk theirs. `--sp-y-max` is
	 * the ladder's own ceiling in px (`tt(14.3) * RUNG_Y_EM`), so the cap scales with the stage instead
	 * of being a literal that goes wrong the first time a ladder gets tall.
	 */
	.rung-spouse .rung-y-below {
		font-size: min(0.846em, var(--sp-y-max, 0.846em));
	}
	.rung-y-below {
		display: block;
		margin-left: 0;
		/* AIR UNDER THE NAME, in `em` so it scales with whatever `shrinkToFit` settled on. Matching the
		   two cards' nesting closed the gap to −0.2px on both, which Sam read as too tight — the earlier
		   3.3px was the spacing he wanted, it was just arriving by accident on one card only. Now it is
		   the same deliberate amount on both, at every size. */
		margin-top: 0.25em;
		font-size: 0.846em;
		line-height: 1.3;
	}
</style>
