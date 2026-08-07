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
	 * So the shell — background, border, blur — holds its exact resting values while the cards fly, and the
	 * refusal is carried by exactly two things, both of which cost no fade:
	 *   - the ink dropping to 70% (Sam: "that's literally the only thing that indicates you can't click
	 *     it other than the natural cursor icon change").
	 *   - the cursor reverting from hand to arrow, via `cursor: default`.
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
	import { onMount } from 'svelte';

	let { settled = true }: { settled?: boolean } = $props();

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

<button
	bind:this={el}
	class="shuffle-notables"
	class:busy={!settled}
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
	       hover   lifted under the finger −1px,   0 1.5px 3px
	       press   pushed in              +0.5px, shadow squeezed to a sliver
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

		position: fixed;
		right: 16px;
		top: 16px;
		z-index: 10;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 6px 12px 6px 9px;
		font: 500 12px/1 var(--font-inter, sans-serif);
		color: var(--gold);
		/* ONE background, the whole way through (Sam). A real button does not change colour when you
		   approach it — it changes HEIGHT. Lighting the surface as well would be saying the same thing
		   twice, and the second saying is the one that reads as a web widget. */
		background: rgba(20, 28, 46, 0.6);
		border: 1px solid rgba(255, 250, 240, 0.18);
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
			color 180ms ease-out;
	}
	/* HOVER — the button rises to meet the finger. Colour untouched.
	   Halved from −2px on Aug 7 (Sam: "tone down the rise on hover… more subtle movement"). The SHADOW is
	   halved with it, not left where it was: a 3px shadow under a 1px lift describes a height the button
	   is not at, and the eye reads the shadow before it reads the gap. Offset tracks travel. */
	.shuffle-notables:hover {
		transform: translateY(-1px);
		box-shadow: 0 1.5px 3px rgba(20, 28, 46, 0.28);
	}
	/* PRESS — driven below its own resting line, shadow squeezed to a sliver: pushed INTO the surface,
	   not merely un-lifted. Going down is fast and has NO overshoot (80ms, ease-out) — a press must answer
	   the finger instantly, and a button that bounces on the way down feels like rubber. The bounce
	   belongs on the way back up, which is why the base rule keeps the back curve and this one overrides
	   it for the downstroke only. */
	.shuffle-notables:active {
		transform: translateY(0.5px);
		box-shadow: 0 0 0.5px rgba(20, 28, 46, 0.22);
		transition:
			transform 80ms ease-out,
			box-shadow 80ms ease-out;
	}
	/* THE BUSY STATE — the cards are in flight. It changes ONE thing: the ink drops to 70%. No fade on the
	   shell, no change of height — the button keeps behaving like a button, rising and falling under the
	   pointer exactly as it does at any other time.
	   `cursor: default` — NOT `pointer-events: none`. Both stop the hand cursor, but pointer-events also
	   destroys :hover, which would drop the button to rest the instant the click landed and strand it
	   there for the whole flight — the precise opposite of "when the person releases the mouse the button
	   goes back up to its hover state". The click itself is refused in `go`, so nothing is let through. */
	.shuffle-notables.busy {
		cursor: default;
		color: color-mix(in srgb, var(--gold) 70%, transparent);
	}
	/* A lift is decoration, and a 2px hop is exactly what reads as jitter to someone who asked for less
	   motion. The ink still steps back — that one carries information. */
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
</style>
