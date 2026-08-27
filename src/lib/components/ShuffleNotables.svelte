<script lang="ts">
	/**
	 * NOTABLE PEOPLE — the button. All the thinking is in `$lib/state/shuffle.svelte.ts`; this is the
	 * affordance and nothing else.
	 *
	 * THE BUTTON ITSELF NEVER FADES (Sam, Aug 7). The first version used `disabled` + `opacity: 0.4` to say
	 * "busy", which meant the whole control faded out and back on EVERY click — a 1.3s dip against a ~700ms
	 * flight, so it spent longer looking broken than the transition took to run. Sam: "the button fades and
	 * comes back which looks weak… the cursor changing from arrow to hand tells the tale."
	 *
	 * So the WHOLE control — background, border, blur AND the gold ink — holds its exact resting values
	 * while the cards fly. The refusal is carried by ONE thing, which costs no fade: the cursor reverting
	 * from hand to arrow, via `cursor: default`. An intermediate version also dimmed the ink to 70%; that
	 * is gone (Sam, Aug 7: "never fade the text it is always the same appearance"), and nothing is lost by
	 * it — the deck already swallows a mid-flight navigation, so the dimming only ever announced a refusal
	 * the user had no reason to attempt.
	 *
	 * `cursor: default` and NOT `pointer-events: none`, which is what the previous version used. Both stop
	 * the hand cursor, but pointer-events also destroys `:hover` — so the button would drop to its resting
	 * height the instant the click landed and sit there for the whole flight, which is the opposite of the
	 * physical behaviour being asked for. The refusal instead lives in `go`, below.
	 *
	 * Nothing is let through by keeping the element live: `go` returns early, and the deck would swallow a
	 * mid-flight navigation anyway (flightLock). `aria-disabled` carries the state to assistive tech
	 * without the `disabled` attribute, which browsers grey out of their own accord — the exact fade being
	 * removed. See the stylesheet for the height model.
	 *
	 * WARMED ON MOUNT. The notables list is fetched once, on idle, so the FIRST click flies immediately
	 * instead of waiting on a request. Without this the first shuffle of a session stalls for as long as
	 * the fetch takes — which on the 3G profile is exactly when it is least forgivable.
	 */
	import { shuffleToNotable, warmShuffle } from '$lib/state/shuffle.svelte';
	import { ascension } from '$lib/state/ascension.svelte';
	import { onMount } from 'svelte';

	let { settled = true }: { settled?: boolean } = $props();

	/**
	 * ── COMING BACK FROM THE ZONE, IT WAITS FOR THE CARD ────────────────────────────────────────────
	 * Sam: "the Shuffle Notable People button appears instantly after the ascension zone is exited. It
	 * should fade in after the hero card is settled in final position — it's distracting and confusing
	 * to have it instantly appear on screen before the rest of the content."
	 *
	 * The mount gate (now TopRightChrome's `{#if}`) is keyed on `ascension.active`, which goes false the
 * moment the payload lands —
	 * roughly a second before the room is light and the card has parked. So the button was the FIRST
	 * thing to arrive on a descent, ahead of everything it belongs beside.
	 *
	 * A ONE-SHOT LATCH, NOT A TRANSITION DELAY, and the distinction is the whole reason this is safe.
	 * §7's standing rule is that THIS BUTTON NEVER FADES — an earlier version faded it on every flight
	 * and it spent longer looking broken than the transitions took to run. A delay on the `{#if}`'s
	 * intro would have been fine here and useless everywhere else; a latch that is armed once, when the
	 * card first settles after leaving the zone, and then stays armed, cannot fade during ordinary
	 * navigation because it is never disarmed by one. Only entering the zone disarms it.
	 */
	let armed = $state(true);
	$effect(() => {
		if (ascension.active) armed = false;
		else if (settled) armed = true;
	});

	let el = $state<HTMLButtonElement | null>(null);

	onMount(() => {
		if ('requestIdleCallback' in window) requestIdleCallback(() => warmShuffle());
		else setTimeout(warmShuffle, 400);
	});

	function go() {
		if (!el || !settled) return; // covers the keyboard, which pointer-events cannot
		void shuffleToNotable(el);
	}
</script>

<!-- THE SHUFFLE LEAVES THE ZONE (roadmap §40). Two reasons, and the second is the one that decided it.
     It is a door OUT to a random notable, and offering an exit that skips the descent undoes the whole
     gesture — an orbit figure is reached by one specific connection and should be left the same way.
     And it occupies exactly the corner the X wants; rather than crowd two controls together, the
     control that does not belong here yields to the one that does. -->
<button
	bind:this={el}
	class="shuffle-notables"
	class:busy={!settled}
	class:waiting={!armed}
	type="button"
	aria-disabled={!settled}
	title="Fly to a notable at random"
	aria-label="Shuffle to a random notable person"
	onclick={go}
>
	<!-- A fanned hand of cards — the deck this rides on, rather than a generic shuffle glyph. Sam's pick
	     from Iconify, inlined rather than pulled through @iconify/svelte: one icon does not justify a
	     dependency, and Iconify's default Svelte component resolves icon data over its API at runtime,
	     which would put a network request behind a piece of chrome that must be there on first paint. -->
	<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
		<path
			fill="currentColor"
			d="m21.47 4.35l-1.34-.56v9.03l2.43-5.86c.41-1.02-.06-2.19-1.09-2.61m-19.5 3.7L6.93 20a2.01 2.01 0 0 0 1.81 1.26c.26 0 .53-.05.79-.16l7.37-3.05c.75-.31 1.21-1.05 1.23-1.79c.01-.26-.04-.55-.13-.81L13 3.5a1.95 1.95 0 0 0-1.81-1.25c-.26 0-.52.06-.77.15L3.06 5.45a1.994 1.994 0 0 0-1.09 2.6m16.15-3.8a2 2 0 0 0-2-2h-1.45l3.45 8.34"
		/>
	</svg>
	Notable People
</button>

<style>
	/* Takes .ground-toggle's shell (Field.svelte) — same type, same blur, same 16px inset — so the two
	   pieces of chrome read as siblings. It diverges on three things, all Sam: top-right rather than
	   bottom-right, SQUARED rather than a pill, and GOLD ink rather than off-white.

	   IT IS MODELLED AS A PHYSICAL BUTTON, not as a set of styled states (Sam: "i'm trying to make it like
	   a button, not you just taking my literal instructions"). One object at a height:

	       rest    on the surface           0px,   no shadow
	       hover   lifted under the finger  −1.32px, 0 1.98px 3.96px
	       press   gives back 60% of it   −0.53px, 0 0.79px 1.58px (never below rest)
	       release back up to HOVER       because the finger has not left yet
	       leave   back down to REST

	   The last two need no rules of their own — they are what the cascade already does once hover and
	   press are described as heights. The previous version broke exactly that by pinning the pressed
	   geometry during the flight, so the button stayed stuck down instead of popping back up. Height is
	   now owned by hover/active ALONE; nothing else touches transform or box-shadow. */
	.shuffle-notables {
		/* The gold, as ONE token and one value. The label and the icon are literally the same ink — the
		   icon takes it through `fill: currentColor` rather than a colour of its own — so re-hueing the
		   button is a one-line change and the two can never drift apart. An earlier version dimmed the
		   glyph to 0.72 on the theory that a solid fill out-weighs 12px text; side by side it just read
		   as two golds. */
		--gold: #e8c66d;

		/* THE TWO HEIGHTS, as tokens rather than literals, because `.busy` needs to collapse one onto the
		   other (see below) and duplicating them in a second rule is how they drift apart. --press is
		   always the SMALLER give-back: 60% of the lift returned, so it settles at 40% of --lift. */
		--lift: -1.32px;
		--lift-shadow: 0 1.98px 3.96px rgba(20, 28, 46, 0.28);
		--press: -0.53px;
		--press-shadow: 0 0.79px 1.58px rgba(20, 28, 46, 0.25);

		/* IN-FLOW inside TopRightChrome's cluster — this was `fixed; right:16px; top:16px` back when it
		   owned the corner alone. Now that Search shares the corner, the CLUSTER positions both: a
		   hard-coded offset the width of the word "Search" would go wrong on any font or zoom change,
		   and would go wrong silently, as an overlap. Everything below this line — the gold, the three
		   heights, the curves — is untouched. */
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 6px 12px 6px 9px;
		font: 500 12px/1 var(--font-inter, sans-serif);
		color: var(--gold);
		/* ONE background, the whole way through (Sam). A real button does not change colour when you
		   approach it — it changes HEIGHT. Lighting the surface as well would be saying the same thing
		   twice, and the second saying is the one that reads as a web widget. */
		/* DEEPENED FROM 0.6 (design §29: read the Δ, never the alpha). 0.6 was chosen against the
		   MIDNIGHT field, where a 60%-opaque midnight over midnight still reads as midnight. Over the
		   default Manuscript sheet — light, lum ~245 — the same alpha lets the paper through and the
		   chip turns a muddy warm grey, which is what made the button look cheap on the ground it is
		   actually seen against. At 0.86 it reads as one deliberate dark object on every ground, and
		   the gold has something to sit on. The blur still carries the glass. */
		background: rgba(20, 28, 46, 0.86);
		/* Softened to match: at 0.18 against the muddy fill the border was doing the work of defining
		   the shape. Now the fill defines it and the border only catches the light along the edge. */
		border: 1px solid rgba(255, 250, 240, 0.13);
		border-radius: 5px;
		cursor: pointer;
		backdrop-filter: blur(6px);
		/* REST. A zero-size shadow rather than `none`, because CSS cannot interpolate FROM `none` — a
		   shadow declared only on :hover pops into existence instead of growing. */
		transform: translateY(0);
		box-shadow: 0 0 0 rgba(20, 28, 46, 0);
		/* The RETURN curve, and the reason the release reads as a pop: a back-out overshoots its target
		   slightly before settling, so coming up off a press the button passes its hover height and drops
		   back onto it. That is the house curve (easeOutBack, design §17) applied at button scale. It
		   governs both release→hover and leave→rest. */
		transition:
			transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1),
			box-shadow 160ms ease-out,
			color 180ms ease-out,
			/* COMPOSED, not declared in a second rule — `transition` is one property, and a later rule of
			   equal specificity would have dropped the three curves above without a word. This is the
			   only fade the button gets; see the latch. */ opacity 420ms ease-out;
	}
	/* HOVER — the button rises to meet the finger. Colour untouched.
	   Walked −2px → −1px ("tone down the rise… more subtle movement") → −1.2px (+20%) → −1.32px (+10%,
	   Sam). The SHADOW
	   tracks travel at every step rather than being left where it was: a 3px shadow under a 1px lift
	   describes a height the button is not at, and the eye reads the shadow before it reads the gap. */
	.shuffle-notables:hover {
		transform: translateY(var(--lift));
		box-shadow: var(--lift-shadow);
	}
	/* PRESS — the click gives back a FRACTION of the height the hover gained, never more (Sam: "down 60%
	   of height on button click"). Hover rises 1.32px, the press returns 60% of that (0.79px), so it
	   settles at −0.53px — 40% of the way up, BETWEEN hovered and resting heights
	   and never crosses below the surface. It used to drive to +0.5px, BELOW rest — a 1.5px round trip
	   against a 1px lift, so the press read heavier than the hover that preceded it. The shadow is
	   interpolated to the same halfway point. The pair moves together: if the hover changes, halve it
	   again here rather than nudging this value on its own.
	   Going down is fast and has NO overshoot (80ms, ease-out) — a press must answer the finger instantly,
	   and a button that bounces on the way down feels like rubber. The bounce belongs on the way back up,
	   which is why the base rule keeps the back curve and this one overrides it for the downstroke only. */
	.shuffle-notables:active {
		transform: translateY(var(--press));
		box-shadow: var(--press-shadow);
		transition:
			transform 80ms ease-out,
			box-shadow 80ms ease-out;
	}
	/* THE BUSY STATE — the cards are in flight, and NOTHING about the button changes appearance (Sam,
	   Aug 7: "never fade the text it is always the same appearance"). No fade on the shell, no change of
	   height, and — since this pass — no step on the ink either. The button goes on behaving like a
	   button, rising and falling under the pointer exactly as at any other time.
	   `cursor: default` — NOT `pointer-events: none`. Both stop the hand cursor, but pointer-events also
	   destroys :hover, which would drop the button to rest the instant the click landed and strand it
	   there for the whole flight — the precise opposite of "when the person releases the mouse the button
	   goes back up to its hover state". The click itself is refused in `go`, so nothing is let through. */
	.shuffle-notables.busy {
		cursor: default;
		/* NO DOWNSTROKE WHILE THE CLICK IS REFUSED (Sam: "it doesn't respond to clicks while click events
		   are none so stop any down click transitions until its allowed to click again"). Pressing a
		   button that will not act, and watching it dip anyway, promises something that does not happen.
		   Done by pointing --press AT --lift rather than by writing a second :active rule: the existing
		   rule already reads the token, so during a flight it resolves to the hovered height and the
		   press moves nothing at all. One place to change, and the two can never fall out of step. */
		--press: var(--lift);
		--press-shadow: var(--lift-shadow);
	}
	/* A lift is decoration, and a 1px hop is exactly what reads as jitter to someone who asked for less
	   motion. Nothing else is lost by dropping it — the ink no longer moves either. */
	@media (prefers-reduced-motion: reduce) {
		.shuffle-notables,
		.shuffle-notables:hover,
		.shuffle-notables:active {
			transform: none;
			transition: color 180ms ease-out;
		}
	}
	/* A FILL icon, not a stroke one — the previous glyph was drawn in strokes and this one is a solid
	   path, so `fill: none` (the old rule) would have rendered nothing at all.

	   Sized 16, not the 14 a 12px label would suggest: this glyph's two BACK cards are thin slivers, and
	   below ~15px they close up so the fan reads as a single card with a nick in it. 18 is clearer still
	   but runs to twice the label's cap height and starts to lead the button. 16 is the dial. */
	.shuffle-notables svg {
		width: 16px;
		height: 16px;
		fill: currentColor; /* inherits the gold, INCLUDING the 70% busy step — one ink, never two */
	}
	/* THE ONE FADE THIS BUTTON IS ALLOWED — see the latch. Inert as well as invisible while it waits,
	   so it cannot be clicked or tabbed to before it is visible. */
	.shuffle-notables.waiting {
		opacity: 0;
		pointer-events: none;
	}
</style>
