<script lang="ts">
	/**
	 * THE ASCENSION'S SURROUND (roadmap §40) — the veil and the way out.
	 *
	 * An orbit entry is a person the tree reaches only by cross-connection. Arriving at one darkens the
	 * whole ground to midnight and puts an X in the corner. Sam: "clearly the user feels like they've
	 * entered a special zone within the UX… the X is an exit to the holy zone."
	 *
	 * ── SCREEN CHROME, OUTSIDE THE STAGE ────────────────────────────────────────────────────────────
	 * Mounted beside Field / TimelineRail / ShuffleNotables rather than inside `.page-container`, for the
	 * reason the rail is: a transformed ancestor becomes the containing block for `position: fixed`
	 * descendants (design §33.1), and the stage is one flight away from being transformed. The veil must
	 * also cover the whole window, which is not something a stage child can promise.
	 *
	 * ── THE STACKING ORDER, WHICH IS THE RISKIEST GEOMETRY IN THIS FEATURE ──────────────────────────
	 * Four things want to order and only one arrangement is right:
	 *
	 *     THE VEIL         z 0
	 *     rail             z 1 ALWAYS (z 3 while it lifts over a CC flight)
	 *     .page-container  z 1, later in the document, so it wins over the rail on source order
	 *     the flying hero  z 2 (body-level, fixed)
	 *
	 * THE RAIL USED TO BE z 0 AND CONDITIONALLY LIFTED, and that was a bug this feature caused: source
	 * order puts this veil over a z-0 rail, so the only thing keeping the timeline visible in the zone
	 * was a class tied to whether an orbit card happened to be featured. The moment one was not, the rail
	 * sank under an opaque ground for the length of the exit. It is z 1 unconditionally now — design §41,
	 * "depth is not a function of state" — which is why nothing here reasons about the rail any more.
	 *
	 * §18.6 records THE STACKING-CONTEXT TRAP — a z-index that measured as applied and did nothing — and
	 * this adds a fourth participant to a problem that already cost a session with three. The veil sits
	 * at the rail's level and AFTER it, so source order settles them (design §29.9: "source order IS the
	 * precedence rule") without a number either has to agree about.
	 *
	 * ── THE FADE IS ON THE FLIGHT'S CLOCK ───────────────────────────────────────────────────────────
	 * Sam: "the darkness fades in on the same schedule, final dark values arrive with it, but it's a
	 * fade." So the duration is READ from the hero's published schedule rather than declared here. §30
	 * names two-clock desync as THE failure mode of this layer, and a background fading on its own
	 * duration while the card flies on another is the textbook case of it.
	 *
	 * THE LEAD is the one dial: a small negative delay so the room dims fractionally before the figure
	 * lands. Sam: "I trust your instinct for the dark leading slightly, I won't know until I test it."
	 * Set to 0 to have them arrive exactly together.
	 */
	import { ascension } from '$lib/state/ascension.svelte';
	import { ASCEND_MS } from '$lib/transitions/flight';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { cubicInOut, cubicOut } from 'svelte/easing';

	type Props = { onexit?: () => void };
	let { onexit }: Props = $props();

	/**
	 * THE VEIL RUNS THE GESTURE'S OWN CLOCK, READ AS A CONSTANT.
	 *
	 * It used to read `getHeroSchedule()` inside an $effect, and that was a RACE with two ways to lose.
	 * The effect fires when `active` flips — which happens the instant the payload lands — while the
	 * schedule is not published until the incoming card's transition is CREATED, one flush later. So the
	 * veil either read the previous navigation's schedule or a zero, and Sam saw the result: "you've lost
	 * touch with the midnight blue background fade-in, that seems to now be instant on CC click, not
	 * fading over the whole screen along with the orbit card entry."
	 *
	 * Reading the constant removes the race outright. It is still ONE CLOCK in §30's sense — the ground
	 * and both cards are all driven by the same number — it is simply taken from the source rather than
	 * chased through a publish that has not happened yet. A constant cannot be stale.
	 */
	/** The one predicate: the ground, the way out and the rail all read this. */
	const active = $derived(ascension.active);
	/** A founder turns the room green. Same veil, same schedule, same everything else — see the note in
	 *  ascension.svelte.ts on why this is a skin rather than a second zone. */
	const founder = $derived(ascension.founder);

	/**
	 * ── THE WAY OUT MOVES TO THE CARD ───────────────────────────────────────────────────────────────
	 * Sam: "I want the X in the ascension and founder zone to be in closer to the card, outside the top
	 * right corner — typically spouse chip corner — by 1rem diagonally up and right from that corner."
	 *
	 * It used to live at the WINDOW's top right (18/20), which had two faults. It sat a long way from
	 * the thing it acts on, so the control and its subject were unrelated objects on one screen; and on
	 * the way out it landed almost on top of the Shuffle button, which arrives in that same corner.
	 * Anchoring it to the card fixes both at once — and the corner Sam names is the one the spouse chip
	 * already claims, so the zone's control and the card's own furniture share a logic.
	 *
	 * MEASURED, NOT COMPUTED, and measured LATE. The card's rect is not knowable from here — this
	 * component is screen chrome mounted beside Field and the rail, deliberately outside the stage — and
	 * for the first half-second of every arrival the card is mid-flight and transformed, so an early
	 * read would anchor the X to a position the card is only passing through. The measurement therefore
	 * waits out the same `fadeMs` the button's own entrance already waits for, which is the moment the
	 * card has parked. Re-measured on resize; nothing else moves it.
	 */
	// 1rem -> 2rem (Sam, "another rem higher and to the right away from the spouse chip"). The first
	// offset put it close enough to the chip's rounded corner to read as part of the card's furniture;
	// at 2rem it is unambiguously OUTSIDE the object, which is what a control that leaves should be.
	const GAP = 32;
	let anchor = $state<{ x: number; y: number } | null>(null);
	function measureCard() {
		const c = document.querySelector('.featured-card');
		if (!c) return;
		const b = c.getBoundingClientRect();
		if (b.width < 40) return; // still flying — a shrunken clone is not the parked card
		anchor = { x: b.right + GAP, y: b.top - GAP };
	}
	$effect(() => {
		if (!active) {
			anchor = null;
			return;
		}
		const t = setTimeout(measureCard, fadeMs + 80);
		window.addEventListener('resize', measureCard);
		return () => {
			clearTimeout(t);
			window.removeEventListener('resize', measureCard);
		};
	});
	const fadeMs = $derived(prefersReducedMotion.current ? 0 : ASCEND_MS);
	/** The dark leads the card slightly, so the room dims before the figure arrives rather than with it.
	 *  Set to 0 to have them land together. */
	// 120 -> 0, AND THE CURVE CHANGES. Sam: "the midnight blue darkness finalizes too soon as we enter
	// the ascension zone — it should stay a little lighter longer, and the same on the reverse."
	//
	// Two things were making it commit early: a negative delay that started it before the cards moved,
	// and cubicOut, which spends most of its opacity in the first third. An ease-IN-out holds the ground
	// light while the travelling is happening and lands the dark as the card seats — so the room finishes
	// changing when the journey does, rather than a third of the way through it.
	const LEAD_MS = 0;
	/**
	 * THE DARK IS HELD THROUGH THE PASS — exit only.
	 *
	 * Sam: "it still feels like exiting Lincoln out the foreground slaps you in the face, but now I
	 * think the timing of dark back to light happens at the same moment as the slap… so maybe have it
	 * darker for longer, only specifically exiting the ascension zone."
	 *
	 * He is identifying something neither of us had credited: the GROUND is part of how hard the card
	 * reads. The departing card crosses the reader in the first ~250ms, and the room was brightening
	 * across exactly those frames — so two large changes landed together and reinforced each other. The
	 * card was never the whole of the slap; half of it was the lights coming up on the same beat.
	 *
	 * So the dark holds, unmoved, until the card is gone, and only then gives way. What is left is a
	 * room lightening around a card that is already settling, which is a different and much quieter
	 * event. And the easing is cubicOut rather than cubicInOut for the same reason — on an outro that
	 * keeps opacity near 1 through the first half instead of surrendering it at the midpoint.
	 *
	 * ENTERING IS UNTOUCHED. Sam: "entering the ascension zone is better than ever." This is the
	 * `out:` transition, which by definition only runs on the way out.
	 */
	// 240 -> 420. The pass now takes ~330ms rather than ~170 (flight.ts DEPTH_BEHIND_READER), so the hold
	// has to grow with it or the lights come up on the tail of the card again — which is the whole thing
	// this constant exists to prevent. Sam: "we know the background color is influencing the harshness,
	// maybe leave the screen darker for longer."
	const DARK_HOLD_MS = 420;

	/**
	 * ── THE SPRITES (roadmap §40, the last unbuilt piece) ───────────────────────────────────────────
	 * Sam: "a mix between ghostly waxy white with low opacity and cream colour, they move around like
	 * the fluorescent drifting air plants in Avatar, but here they tend to move in a circle around the
	 * orbit card."
	 *
	 * THEY ORBIT THE VEIL'S OWN CENTRE OF LIGHT, not a measured card rect. The veil's gradient already
	 * declares where the card is — `at 50% 42%`, "the card sits in the lit centre and the room falls
	 * away from it" — so the sprites circle THAT point and the two can never disagree. A second
	 * measurement would have been a second source of truth for one fact, and the card's box is the
	 * wrong thing to read anyway: it is mid-flight for the first half-second of every arrival.
	 *
	 * THE ORBIT IS AN ELLIPSE, because a circle is wrong here. The containing block is 1265x720 and the
	 * centre sits at 42% of the height, so any radius wide enough to clear an 851px card would carry a
	 * circular path off the top and bottom of the screen for most of its length. Squashing the path
	 * keeps every sprite on screen AND makes it echo the card's own landscape shape, which is what
	 * "around the card" actually looks like. The squash is undone on the sprite so the blobs stay round.
	 *
	 * ── EIGHTEEN, AND WHY IT IS NOT A HUNDRED AND EIGHTY ────────────────────────────────────────────
	 * This was taken to 180 at Sam's word and brought back: "now it's like a disco with a disco ball,
	 * which is not the effect at all — I want something natural, I preferred less sprites."
	 * The count was not really the variable. At ten times the density every sprite is near a neighbour,
	 * so the eye stops reading eighteen slow individual drifts and starts reading a TEXTURE that
	 * shimmers — and a shimmering texture is a disco ball no matter how soft each element is. Sparse is
	 * what lets a single light be watched, which is the whole quality of the Avatar reference.
	 * Two further passes went with it: crisp bodies with motion trails, and scattered per-sprite orbit
	 * centres. Both were reasonable answers to real notes ("too blurry", "too contained") and both made
	 * the glitter worse, because they added incident. If this is revisited, the lesson is that the fix
	 * for "too regular" is slower and fewer, not smaller and more.
	 *
	 * NO JS TICKER, NO LIBRARY. Two composed CSS animations per sprite — a slow circuit, plus a bob and
	 * a breath on their own unrelated periods — and the fact that the periods do not divide into each
	 * other is what stops the set from ever reading as a rotating wheel. `translate` and `scale` are
	 * used as INDEPENDENT properties rather than inside `transform`, so the bob and the breath can run
	 * as separate animations without the later one silently winning the transform.
	 *
	 * BEHIND THE CARD, ABOVE THE VEIL. z 0 in this component and later in the DOM than the veil, so
	 * source order puts them over the dark; `.page-container` is z 1, so a sprite passes BEHIND the
	 * card and out the other side. That occlusion is most of what sells them as being in a room with
	 * it rather than painted on top of it.
	 *
	 * DETERMINISTIC, NOT RANDOM. A seeded generator, so the server and the client lay out the same
	 * field — `Math.random()` here would mismatch on hydration and Svelte would repaint the whole set.
	 */
	/**
	 * TWENTY: THE EIGHTEEN, PLUS TWO STRAYS (Sam: "a wider area, and 10% more stray sprites not obeying
	 * the herd in the circle").
	 *
	 * The strays are ADDED rather than converted, which is the difference between a field of twenty and
	 * a field of eighteen with two gaps in it. They are the same objects — same sizes, same breath, same
	 * ink — running a different path, so nothing marks them out except that they are going their own
	 * way, which is what makes them read as strays rather than as a second species.
	 *
	 * Two is the right number for the same reason 180 was the wrong one: a stray is only legible as a
	 * stray while there is an obvious herd for it to be ignoring.
	 */
	/**
	 * ── EVERYTHING IS SIZED IN VIEWPORT UNITS, AND THAT IS A BUG FIX ────────────────────────────────
	 * Sam: "I should look at any point and see at least one sprite in the bottom 40% of the browser and
	 * in the top 15%, and there are literally 0."
	 *
	 * The field was measured in PIXELS, tuned on a 1280x720 window. On a larger display those same
	 * pixel radii describe a proportionally SMALLER ellipse, so the whole set retreats into the middle
	 * of the screen and the outer bands empty out — which is exactly what he was seeing and what I could
	 * not reproduce, because my probe's viewport option was being ignored and I was measuring the one
	 * window size where the tuning happened to be right.
	 * Radii are now a share of the window (`vw` for the herd's circuits, `vw`/`vh` for the visitors'
	 * entry points), so the ecosystem is the same shape on every display instead of only on mine.
	 */
	const SPRITE_N = 18;
	const STRAY_N = 2; // ~10% more, and deliberately additive — see above
	/**
	 * 10% NARROWER, 15% TALLER (Sam, correcting the previous pass: "I should not have said wider").
	 * The two are one calculation, because the path's height is radius × squash — take 10% off the
	 * radius and the squash has to RISE to buy the extra height, not fall:
	 *     r × 0.90,  squash = 0.52 × 1.15 / 0.90 = 0.664
	 * Which is why the number below went UP while the field got narrower. More of the set now clears
	 * the top and bottom edges of the hero card, which is what Sam is after.
	 */
	const SQUASH = 0.66;
	let seed = 20260825;
	const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
	const SPRITES = Array.from({ length: SPRITE_N }, (_, i) => ({
		// RADIUS clears the card's half-width (425) for most of the set, but not all of it: a few tight
		// ones ride close and spend much of their circuit hidden, which is what gives the field depth.
		// 300-585 was a narrow annulus, and a narrow annulus IS a drawn ring. 260-800 (Sam: "a wider
		// area") spreads the same eighteen over nearly twice the span, which both fills more of the
		// room and leaves no single circle for the eye to trace.
		// A SHARE OF THE WINDOW, NOT A PIXEL COUNT — see the note above SPRITE_N. 18-56vw reproduces
		// the tuned 234-720px exactly at the 1280px width it was tuned on, and grows from there.
		rf: +(18 + rnd() * 38).toFixed(1),
		// SLOW. A full circuit is between half a minute and a minute — at anything faster the set reads
		// as machinery. Avatar's are almost stationary; these only "tend" to circle.
		dur: Math.round(34 + rnd() * 30),
		phase: Math.round(rnd() * 60),
		// 3.5-9.5 first time out and they measured as dust: at that size the breath's trough took the
		// faintest of them under 0.08 effective, which is not "ghostly", it is absent. Bigger bodies at
		// the same low opacity is the trade that keeps them ghostly AND findable.
		size: +(5 + rnd() * 8).toFixed(1),
		// LOW, and the range matters more than the number — a field at one opacity reads as a pattern.
		op: +(0.2 + rnd() * 0.38).toFixed(2),
		bob: +(4.5 + rnd() * 5).toFixed(1),
		drift: +(5 + rnd() * 9).toFixed(1),
		breathe: +(3.2 + rnd() * 4).toFixed(1),
		// Half go the other way round. A field all turning one way is a wheel; mixed, it is weather.
		rev: i % 2 === 1
	}));

	/**
	 * THE STRAYS. Same ink and the same breath as the herd; only the path differs — four waypoints,
	 * scaled by the sprite's own radius and skewed by two signed multipliers so no two wander the same
	 * shape. They keep the herd's squash so they move through the same flattened space rather than
	 * looking like they are in a different room.
	 * SLOWER THAN THE HERD, not faster. A stray that hurried would read as an error in the animation;
	 * one that takes even longer to get nowhere reads as something adrift.
	 */
	const STRAYS = Array.from({ length: STRAY_N }, () => ({
		rf: +(21 + rnd() * 30).toFixed(1),
		dur: Math.round(62 + rnd() * 46),
		phase: Math.round(rnd() * 80),
		size: +(5 + rnd() * 8).toFixed(1),
		op: +(0.2 + rnd() * 0.38).toFixed(2),
		bob: +(4.5 + rnd() * 5).toFixed(1),
		drift: +(5 + rnd() * 9).toFixed(1),
		breathe: +(3.2 + rnd() * 4).toFixed(1),
		lx: +(0.7 + rnd() * 0.6).toFixed(2) * (rnd() < 0.5 ? -1 : 1),
		ly: +(0.7 + rnd() * 0.6).toFixed(2) * (rnd() < 0.5 ? -1 : 1)
	}));

	/**
	 * ── THE VISITORS: THE CARD AS A WEAK SOURCE OF GRAVITY ──────────────────────────────────────────
	 * Sam: "have 10% come from random entry points around the browser at different unexpected angles
	 * with some rotation, not just straight entry to exit — like the featured hero card is the source
	 * of light, gravitational pull, that's kind of the philosophy. Not strong, but a pull."
	 *
	 * So these do not orbit and do not loop in place: each one arrives from off-screen, crosses, and
	 * leaves — and the whole of the physics is in ONE NUMBER. Entry and exit are two points on a ring
	 * outside the frame; the midpoint of the path is then dragged toward the centre by PULL. At 1.0 the
	 * path is a straight chord and the card has no field at all; at 0 it would be a hard slingshot
	 * through the middle. 0.42 bends it noticeably without ever looking aimed — a passing body deflected
	 * by something it is not orbiting, which is exactly the "not strong, but a pull" Sam described.
	 *
	 * THE EXIT IS NEVER OPPOSITE THE ENTRY. Drawing it at entry + (0.6…1.4)π keeps the crossing oblique;
	 * a diametric pair would read as a straight line across the screen no matter how the middle bends.
	 *
	 * THEY ALSO TURN. `rotate` is an independent longhand, so it composes with the breath's `scale`
	 * without either needing to know about the other — a slow tumble over the whole crossing.
	 *
	 * `--squash: 1` ON EACH, because these are the one group whose path is not the herd's flattened
	 * ellipse. The sprite carries `scaleY(1 / --squash)` to keep the blob round, so a visitor left on
	 * the herd's 0.66 would be stretched half as tall again the entire way across.
	 */
	/**
	 * ── THE VISITORS ARE THE ECOSYSTEM (Sam) ────────────────────────────────────────────────────────
	 * "There needs to be some idea that's not just swirling sprites but a larger ecosystem… more sprites
	 * that enter and exit random places in the browser but have a light bend by the pull of the orbit
	 * card."
	 *
	 * So the crossing traffic goes 2 -> 10 while the swirling herd stays exactly as it was. That split
	 * is deliberate and it is what keeps this from repeating the 180-sprite disco: density in one place
	 * reads as glitter, but the same objects spread over the WHOLE window read as a populated room.
	 * Nothing here is added to the middle.
	 *
	 * ENTRY ANGLES ARE STRATIFIED, NOT DRAWN. Each visitor gets its own slice of the circle (i/N) plus
	 * jitter inside that slice. Ten independent draws leave gaps by luck — and a gap here is a whole
	 * quadrant of the window with nothing ever coming from it, which is the complaint being fixed.
	 * Stratifying GUARANTEES arrivals from above and below, not merely makes them likely.
	 *
	 * PHASES ARE STRATIFIED FOR THE SAME REASON — spread across the full period so crossings overlap
	 * rather than clumping into a flock and then a long empty stretch.
	 *
	 * THE RING IS 62vw x 62vh, i.e. outside a window whose half-extent is 50 of each, on any display.
	 */
	const VISITOR_N = 10;
	const PULL = 0.42;
	const RING = 62; // vw / vh — comfortably off-screen on every axis, at every window size
	const VISITORS = Array.from({ length: VISITOR_N }, (_, i) => {
		const a0 = ((i + rnd() * 0.85) / VISITOR_N) * Math.PI * 2;
		const a1 = a0 + Math.PI * (0.6 + rnd() * 0.8);
		const ax = Math.cos(a0) * RING, ay = Math.sin(a0) * RING;
		const cx = Math.cos(a1) * RING, cy = Math.sin(a1) * RING;
		const dur = Math.round(34 + rnd() * 30);
		return {
			ax: +ax.toFixed(1), ay: +ay.toFixed(1),
			cx: +cx.toFixed(1), cy: +cy.toFixed(1),
			// the deflected midpoint — this is the gravity
			bx: +(((ax + cx) / 2) * PULL).toFixed(1), by: +(((ay + cy) / 2) * PULL).toFixed(1),
			dur,
			phase: Math.round(((i + rnd() * 0.7) / VISITOR_N) * dur),
			rot: Math.round(120 + rnd() * 220) * (rnd() < 0.5 ? -1 : 1),
			size: +(5 + rnd() * 8).toFixed(1),
			op: +(0.2 + rnd() * 0.38).toFixed(2),
			breathe: +(3.2 + rnd() * 4).toFixed(1)
		};
	});
</script>

{#if active}
	<!-- aria-hidden: it is atmosphere, and the card behind it is the content. The X below is the only
	     thing in here a screen reader should meet. -->
	<!-- A SVELTE TRANSITION, NOT A CSS ANIMATION, and the reason is the half that was missing. A keyframe
	     on mount can only describe ARRIVING; an `{#if}` block with nothing on the way out is removed in a
	     single frame. Sam: "the transition back to the original Burr card is wrong — it just instantly
	     flashes back to original state." The dark has to leave the way it came, so it needs a transition
	     the framework will wait for, not an animation the element plays once.
	     The OUT runs shorter than the IN: arriving somewhere should take longer than leaving it, and the
	     returning card is what the eye should be following on the way back. -->
	<div
		class="ascend-veil"
		class:founder
		aria-hidden="true"
		in:fade={{ duration: Math.max(1, fadeMs - LEAD_MS), delay: 0, easing: cubicInOut }}
		out:fade={{
			delay: DARK_HOLD_MS,
			duration: Math.round(fadeMs * 0.9),
			easing: cubicOut
		}}
	></div>
	<!-- ── THE SPRITES ─────────────────────────────────────────────────────────────────────────────
	     Atmosphere, not content — aria-hidden, inert, and mounted inside the same `{#if}` as the veil so
	     they arrive and leave with the dark rather than needing a lifecycle of their own. The fade uses
	     the veil's clocks for the same reason (§30, one clock): a field that lingered after the room had
	     lit would be the only thing on screen still saying "night". -->
	<div
		class="sprite-field"
		class:founder
		aria-hidden="true"
		style="--squash: {SQUASH}"
		in:fade={{ duration: fadeMs, delay: Math.round(fadeMs * 0.45), easing: cubicInOut }}
		out:fade={{ delay: DARK_HOLD_MS, duration: Math.round(fadeMs * 0.6), easing: cubicOut }}
	>
		{#each SPRITES as s, i (i)}
			<span
				class="sprite-orbit"
				class:rev={s.rev}
				style="--r: calc(var(--rf) * 1vw); --rf: {s.rf}; --dur: {s.dur}s; --phase: -{s.phase}s"
			>
				<span class="sprite-unsquash">
					<span
						class="sprite"
						style="--size: {s.size}px; --op: {s.op}; --bob: {s.bob}s; --drift: {s.drift}px; --breathe: {s.breathe}s"
					></span>
				</span>
			</span>
		{/each}
		{#each STRAYS as s, i (i)}
			<span
				class="sprite-orbit stray"
				style="--r: calc(var(--rf) * 1vw); --rf: {s.rf}; --dur: {s.dur}s; --phase: -{s.phase}s; --lx: {s.lx}; --ly: {s.ly}"
			>
				<span class="sprite-unsquash">
					<span
						class="sprite"
						style="--size: {s.size}px; --op: {s.op}; --bob: {s.bob}s; --drift: {s.drift}px; --breathe: {s.breathe}s"
					></span>
				</span>
			</span>
		{/each}
		{#each VISITORS as v, i (i)}
			<span
				class="sprite-orbit visitor"
				style="--dur: {v.dur}s; --phase: -{v.phase}s; --squash: 1; --rot: {v.rot}deg;
				       --ax: {v.ax}vw; --ay: {v.ay}vh; --bx: {v.bx}vw; --by: {v.by}vh;
				       --cx: {v.cx}vw; --cy: {v.cy}vh"
			>
				<span class="sprite-unsquash">
					<span
						class="sprite"
						style="--size: {v.size}px; --op: {v.op}; --breathe: {v.breathe}s"
					></span>
				</span>
			</span>
		{/each}
	</div>
	<!-- ── THE WAY DOWN ────────────────────────────────────────────────────────────────────────────
	     NOT A CLOSE BUTTON. Sam: "I don't just want that standard X in a circle." An X means dismiss —
	     it belongs on a dialog that interrupted you. Nothing here interrupted anything: the reader chose
	     to come, and what they want back is the card they left. So the control names the GESTURE rather
	     than the widget, and the gesture already has a name in this project — you ascended, so this is
	     the descent, and it points the way it goes.

	     THE CHEVRON IS THE HOUSE'S OWN GLYPH (design §26.4 — the sibling panel's chevron became an SVG
	     for exactly this reason: a text arrow is a font's opinion, an SVG is ours). Pointed DOWN, in the
	     rail's cream, on nothing — no circle, no plate. The dark IS the surround; drawing a container on
	     top of it would be putting a button on a sky.

	     THE HIT AREA IS 56px AND THE INK IS 24px. The glyph should be quiet and the target should not
	     be — Sam reported the X "doesn't do anything", and a 38px circle at the screen's corner is a
	     small target to find with a mouse even when it is working. This also stops the two failure modes
	     looking identical: a control that is hard to hit and a handler that does nothing both read as
	     "nothing happened", so the target is now generous enough that a miss is unlikely to be the
	     explanation. -->
	<button
		type="button"
		class="ascend-exit"
		style="--fade-ms: {fadeMs}ms; {anchor
			? `left:${anchor.x}px; top:${anchor.y}px; right:auto;`
			: ''}"
		out:fade={{ duration: 160 }}
		onclick={() => onexit?.()}
		aria-label="Return to the card you came from"
	>
		<!-- A FULL X (Sam). The chevron was chosen when this control sat in the window's corner and had to
		     say "descend" rather than "dismiss" — it pointed the way it went. Anchored to the card, that
		     argument no longer holds: next to the thing it closes, a downward arrow reads as scroll or
		     collapse, and the one unambiguous glyph for leaving is the cross. Two strokes, same weight
		     and caps as the chevron had, so nothing else about its presence changes. -->
		<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
			<path
				d="M6 6 L18 18 M18 6 L6 18"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				fill="none"
			/>
		</svg>
	</button>
{/if}

<style>
	/* MIDNIGHT IS NOT A NEW COLOUR. `#0f1626` is the app's own Midnight skin (ground.svelte.ts /
	   layout.css), so the zone is the house's existing dark rather than a fourth palette.
	   IT IS A LITERAL AND NOT `var(--ground)`, DELIBERATELY: `--ground` is whichever skin the READER has
	   chosen, and the Ascension must be midnight whether they are on Manuscript, Parchment or anything
	   else. Borrowing the value is right; following the variable would let the zone change out from
	   under itself. (The founder skin below is the opposite case — its colour is its own, so it reads a
	   token.) The gradient
	   is a deepening toward the edges — the card sits in the lit centre and the room falls away from it,
	   which is the whole reading Sam asked for.

	   NOT `opacity` ON A SOLID. A veil that fades its own opacity dims everything BEHIND it uniformly,
	   including the rail's cream years, which have to stay legible. Fading the BACKGROUND leaves the
	   layer's own children (and anything given a higher stacking level) at full strength. */
	.ascend-veil {
		position: fixed;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		/* MIDDLE STOP IS THE TOKEN, exactly as the founder gradient below already does — search's Major
		   Influence rows read the same `--color-ascendmidnight`, so the list and the room cannot drift
		   apart. The two END stops stay literal: they are this colour's hand-tuned lift and shadow. */
		background: radial-gradient(
			120% 90% at 50% 42%,
			#1b2740 0%,
			var(--color-ascendmidnight) 55%,
			#080d17 100%
		);
	}
	/* HUNTER GREEN — one colour under one light: lifted for the centre, itself, deepened at the edge.
	   THE MIDDLE STOP IS THE TOKEN, and that is the stop that matters: `#355e3b` used to be written here
	   AND as `--color-foundergreen` in layout.css, where the founder TITLE reads it. Two sources of
	   truth for one colour means the words can stop matching the room they name.
	   THE TWO END STOPS STAY LITERAL, and that was measured rather than assumed. Deriving them with
	   `color-mix(… , white)` — even in oklab — desaturates: the centre came out rgb(99,130,102) against
	   the hand-tuned rgb(72,127,80), grey enough to see. Mixing toward white moves a colour toward grey,
	   not toward a brighter version of itself, which is the wrong operation for "the same green under
	   more light". If the token is ever changed, RE-TUNE THESE TWO BY EYE; they are its lift and its
	   shadow, not values derivable from it. */
	.ascend-veil.founder {
		background: radial-gradient(
			120% 90% at 50% 42%,
			#487f50 0%,
			var(--color-foundergreen) 55%,
			#1d3420 100%
		);
	}

	/* ── THE FIELD ───────────────────────────────────────────────────────────────────────────────────
	   Fixed and inert, in the same containing block as the veil so `50% 42%` means the same point to
	   both. `overflow: hidden` because a sprite on a wide orbit can reach past the block's edge, and a
	   drifting light that pushes the document's scroll width is a bug, not atmosphere. */
	.sprite-field {
		position: fixed;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		overflow: hidden;
	}
	/* THE ARM. Zero-sized, anchored on the centre of light, carrying the sprite out to its radius. The
	   squash is applied OUTSIDE the rotation, which is what turns the circular path into an ellipse
	   rather than just making a circle of squashed sprites. */
	/* ── GOLD IN THE FOUNDER ZONE (Sam: "slightly more gold") ────────────────────────────────────────
	   SLIGHTLY, and the core barely moves — a light's colour lives in its SKIRT, not its centre. Any hot
	   source reads near-white at the middle whatever it is made of, so pushing the core yellow would
	   have made them look like painted dots rather than warmer lights. The core shifts three levels; the
	   shoulder and the skirt carry the gold, and the halo carries the most of all.
	   It also earns its keep against the ground: hunter green is the one surround in the app where a
	   neutral cream sprite goes slightly cold, because green and cream sit close in hue and the eye
	   reads the difference as grey. Warming them is what keeps them looking lit. */
	.sprite-field.founder {
		--sp-core: rgba(255, 251, 240, 0.95);
		--sp-mid: rgba(243, 226, 178, 0.62);
		--sp-skirt: rgba(230, 200, 128, 0.19);
		--sp-edge: rgba(230, 200, 128, 0);
		--sp-glow: rgba(238, 214, 150, 0.16);
	}
	.sprite-orbit {
		position: absolute;
		left: 50%;
		top: 42%;
		width: 0;
		height: 0;
		animation: sprite-orbit var(--dur) linear infinite;
		animation-delay: var(--phase);
		will-change: transform;
	}
	.sprite-orbit.rev {
		animation-direction: reverse;
	}
	/* A different animation entirely, not a slower circuit — swapping the name is all it takes, since
	   everything else about a stray is identical to a member of the herd. */
	.sprite-orbit.stray {
		animation-name: sprite-stray;
	}
	.sprite-orbit.visitor {
		animation-name: sprite-visit;
	}
	/* A VISITOR DOES NOT BOB — it is crossing, not drifting, and a wobble on top of a traverse reads as
	   a stutter. It keeps the breath, and gains the tumble. */
	.sprite-orbit.visitor .sprite {
		animation:
			sprite-breathe var(--breathe) ease-in-out infinite alternate,
			sprite-tumble var(--dur) linear infinite;
		animation-delay: var(--phase), var(--phase);
	}
	/* Undoing the path's squash so the blobs stay round. Not exact — the correction happens after the
	   rotation, so a sprite at 45° keeps a trace of the ellipse — but on a soft radial blob with no
	   edge, the residue is not visible, and correcting it properly would cost a counter-rotation on
	   every frame for nothing. */
	.sprite-unsquash {
		display: block;
		transform: scaleY(calc(1 / var(--squash)));
	}
	/* THE INK: waxy white at the core falling to cream and then to nothing, with no edge anywhere. Sam
	   asked for "a mix between ghostly waxy white with low opacity and cream" — this is both, in one
	   object, because a sprite that is white in the middle and cream at its skirt reads as LIT rather
	   than as a coloured dot. The glow is a shadow rather than a bigger gradient so the core stays
	   small and the halo can be much wider than the body. */
	.sprite {
		display: block;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		/* THE INK IS THREE TOKENS so the founder skin can warm it in one block — same reason the zone's
		   rule travels through `--zone-rule`. The defaults are the ascension's waxy white. */
		background: radial-gradient(
			circle at 42% 38%,
			var(--sp-core, rgba(255, 253, 248, 0.95)) 0%,
			var(--sp-mid, rgba(247, 241, 230, 0.62)) 34%,
			var(--sp-skirt, rgba(238, 228, 202, 0.16)) 68%,
			var(--sp-edge, rgba(238, 228, 202, 0)) 100%
		);
		box-shadow: 0 0 18px 4px var(--sp-glow, rgba(247, 241, 230, 0.13));
		opacity: var(--op);
		/* TWO ANIMATIONS ON TWO DIFFERENT PROPERTIES. `translate` and `scale` are independent longhands,
		   so the bob and the breath compose instead of the second overwriting the first — inside
		   `transform` the later animation would simply win. Their periods are unrelated to each other
		   and to the circuit, so the compound motion never repeats on any interval the eye can find. */
		animation:
			sprite-bob var(--bob) ease-in-out infinite alternate,
			sprite-breathe var(--breathe) ease-in-out infinite alternate;
		animation-delay: var(--phase), var(--phase);
	}
	@keyframes sprite-orbit {
		from {
			transform: scaleY(var(--squash)) rotate(0deg) translateX(var(--r));
		}
		to {
			transform: scaleY(var(--squash)) rotate(360deg) translateX(var(--r));
		}
	}
	/* The squash is restated in every frame because these share the herd's unsquash correction on the
	   sprite itself — drop it here and the strays would come out stretched to twice their height. */
	@keyframes sprite-stray {
		0%,
		100% {
			transform: scaleY(var(--squash))
				translate(calc(var(--r) * 0.62 * var(--lx)), calc(var(--r) * -0.24 * var(--ly)));
		}
		27% {
			transform: scaleY(var(--squash))
				translate(calc(var(--r) * -0.34 * var(--lx)), calc(var(--r) * 0.44 * var(--ly)));
		}
		53% {
			transform: scaleY(var(--squash))
				translate(calc(var(--r) * -0.78 * var(--lx)), calc(var(--r) * -0.33 * var(--ly)));
		}
		78% {
			transform: scaleY(var(--squash))
				translate(calc(var(--r) * 0.3 * var(--lx)), calc(var(--r) * 0.5 * var(--ly)));
		}
	}
	/* Entry, the deflected middle, exit — and the opacity is part of the path, not a separate fade:
	   a visitor is invisible at both ends of its crossing, so it appears out of the dark rather than
	   switching on at the frame's edge. */
	@keyframes sprite-visit {
		0% {
			transform: translate(var(--ax), var(--ay));
			opacity: 0;
		}
		14% {
			opacity: 1;
		}
		50% {
			transform: translate(var(--bx), var(--by));
		}
		86% {
			opacity: 1;
		}
		100% {
			transform: translate(var(--cx), var(--cy));
			opacity: 0;
		}
	}
	@keyframes sprite-tumble {
		from {
			rotate: 0deg;
		}
		to {
			rotate: var(--rot);
		}
	}
	@keyframes sprite-bob {
		from {
			translate: 0 0;
		}
		to {
			translate: calc(var(--drift) * 0.4) calc(var(--drift) * -1);
		}
	}
	@keyframes sprite-breathe {
		from {
			scale: 0.78;
			/* The trough is 0.55 rather than 0.45 — the breath should read as a pulse of brightness, not
			   as a sprite guttering out and coming back. */
			opacity: calc(var(--op) * 0.55);
		}
		to {
			scale: 1.14;
			opacity: var(--op);
		}
	}

	/* The X arrives AFTER the ground has committed — it is an offer to leave, and offering it while the
	   card is still arriving reads as an interruption of the thing you just asked for. */
	.ascend-exit {
		position: fixed;
		/* The fallback corner, used only until the card has been measured (and if it never can be —
		   the control must exist even if the query fails, or the zone has no exit). The inline style
		   above replaces both once the anchor is known. */
		top: 18px;
		right: 20px;
		/* Centred ON the anchor point, so "1rem up and right of the corner" describes the glyph's middle
		   rather than the corner of a 56px hit area. */
		transform: translate(-50%, -50%);
		z-index: 5; /* above the flying hero (2) and the rail's transient lift (3), with headroom */
		display: grid;
		place-items: center;
		/* A GENEROUS TARGET AROUND A QUIET GLYPH — see the markup note. */
		width: 56px;
		height: 56px;
		border: 0;
		background: none;
		padding: 0;
		color: #f7f1e6;
		opacity: 0.7; /* present, not insistent — it should be found, not noticed (Sam: 70%, 100% hovered) */
		cursor: pointer;
		/* `backwards`, NOT `both`. A filled animation OUTRANKS ordinary declarations for as long as it
		   holds, so `both` kept this pinned at the keyframe's opacity 1 forever — the declared 0.7 never
		   applied and the hover had nothing to travel from. `backwards` still supplies the pre-start
		   state (so it cannot flash at full strength before its delay elapses) but releases the element
		   to its own rules the moment it finishes, which is where the resting 0.7 and the hover live. */
		animation: exit-in 420ms cubic-bezier(0.33, 1, 0.68, 1) backwards;
		animation-delay: var(--fade-ms, 520ms);
		transition:
			opacity 200ms ease-out,
			transform 200ms cubic-bezier(0.33, 1, 0.68, 1);
	}
	/* The hover moves it DOWN a hair — the direction it sends you. A control that previews its own
	   result is the cheapest affordance there is, and it costs 2px. */
	.ascend-exit:hover {
		opacity: 1;
		/* The nudge is now diagonal, AWAY from the card along the same line the control is offset on —
		   it used to move DOWN because it used to be a descend arrow. A control that previews its own
		   direction costs 2px; this one previews "out". */
		transform: translate(-50%, -50%) translate(1.5px, -1.5px);
	}
	.ascend-exit:focus-visible {
		outline: 2px solid #f7f1e6;
		outline-offset: 2px;
		opacity: 1;
	}
	@keyframes exit-in {
		from {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.8);
		}
		/* Ends at the RESTING opacity, not at 1 — otherwise the entrance arrives full strength and then
		   drops to 0.7 the instant the animation releases, which reads as a flinch. */
		to {
			opacity: 0.7;
			transform: translate(-50%, -50%) scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ascend-veil,
		.ascend-exit {
			animation-duration: 1ms;
			animation-delay: 0ms;
		}
		/* The sprites STOP rather than disappear — they are the zone's atmosphere, and someone who has
		   asked for less motion should still get the room, just a still one. */
		.sprite-orbit,
		.sprite {
			animation-play-state: paused;
		}
	}
</style>
