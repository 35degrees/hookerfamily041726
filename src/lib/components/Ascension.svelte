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
	 *     rail        z 0 at rest (z 3 while it lifts over a CC flight — see below)
	 *     THE VEIL    z 0, painted after the rail in DOM order
	 *     .page-container  z 1
	 *     the flying hero  z 2 (body-level, fixed)
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
	import { getHeroSchedule } from '$lib/transitions/flight';
	import { prefersReducedMotion } from 'svelte/motion';

	type Props = { onexit?: () => void };
	let { onexit }: Props = $props();

	/** How far ahead of the card the ground dims, in ms. THE dial for the ceremony. */
	const LEAD_MS = 120;
	/** The floor, for a cold load into the zone where no flight published a clock. */
	const FALLBACK_MS = 520;

	const active = $derived(ascension.active);
	// Read at the moment the state flips, not continuously: the schedule belongs to the flight that just
	// launched, and clearFlightCaptures resets its neighbours a frame later.
	let fadeMs = $state(FALLBACK_MS);
	$effect(() => {
		void active;
		const s = getHeroSchedule();
		fadeMs = prefersReducedMotion.current ? 0 : Math.max(240, s?.duration || FALLBACK_MS);
	});
</script>

{#if active}
	<!-- aria-hidden: it is atmosphere, and the card behind it is the content. The X below is the only
	     thing in here a screen reader should meet. -->
	<div
		class="ascend-veil"
		aria-hidden="true"
		style="--fade-ms: {fadeMs}ms; --lead-ms: {LEAD_MS}ms"
	></div>
	<!-- THE X IS OVER THE GROUND, NOT ON THE CARD (Sam: "the X can be in the upper right of the screen,
	     not within the card, over the midnight blue gradient background"). Two reasons beyond his: the
	     card is a fixed-geometry object every other feature measures against, and the blade already owns
	     the one edge the card does not control. A close affordance on it would be the first thing to
	     collide with either. -->
	<button
		type="button"
		class="ascend-exit"
		style="--fade-ms: {fadeMs}ms"
		onclick={() => onexit?.()}
		aria-label="Leave and return to the previous card"
		title="Return"
	>
		<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
			<path
				d="M6 6 L18 18 M18 6 L6 18"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"
				fill="none"
			/>
		</svg>
	</button>
{/if}

<style>
	/* MIDNIGHT IS NOT A NEW COLOUR. `--ground: #0f1626` is the app's own Midnight skin (ground.svelte.ts
	   / layout.css), so the zone is the house's existing dark rather than a fourth palette. The gradient
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
		background:
			radial-gradient(120% 90% at 50% 42%, #1b2740 0%, #0f1626 55%, #080d17 100%);
		animation: veil-in var(--fade-ms, 520ms) cubic-bezier(0.33, 1, 0.68, 1) both;
		animation-delay: calc(-1 * var(--lead-ms, 0ms));
	}
	@keyframes veil-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* The X arrives AFTER the ground has committed — it is an offer to leave, and offering it while the
	   card is still arriving reads as an interruption of the thing you just asked for. */
	.ascend-exit {
		position: fixed;
		top: 22px;
		right: 26px;
		z-index: 4; /* above the flying hero (z 2) and the rail's transient lift (z 3) */
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		border: 1px solid rgb(247 241 230 / 0.28);
		background: rgb(15 22 38 / 0.55);
		color: #f7f1e6; /* the house cream, so it belongs to the same palette as the rail's years */
		cursor: pointer;
		animation: exit-in 420ms cubic-bezier(0.33, 1, 0.68, 1) both;
		animation-delay: var(--fade-ms, 520ms);
		transition:
			background 160ms ease-out,
			border-color 160ms ease-out,
			transform 160ms cubic-bezier(0.33, 1, 0.68, 1);
	}
	.ascend-exit:hover {
		background: rgb(27 39 64 / 0.85);
		border-color: rgb(247 241 230 / 0.55);
		transform: scale(1.08);
	}
	.ascend-exit:focus-visible {
		outline: 2px solid #f7f1e6;
		outline-offset: 3px;
	}
	@keyframes exit-in {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ascend-veil,
		.ascend-exit {
			animation-duration: 1ms;
			animation-delay: 0ms;
		}
	}
</style>
