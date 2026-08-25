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
	import { ASCEND_MS } from '$lib/transitions/flight';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

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
	const fadeMs = $derived(prefersReducedMotion.current ? 0 : ASCEND_MS);
	/** The dark leads the card slightly, so the room dims before the figure arrives rather than with it.
	 *  Set to 0 to have them land together. */
	const LEAD_MS = 120;

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
		aria-hidden="true"
		in:fade={{ duration: Math.max(1, fadeMs - LEAD_MS), delay: 0, easing: cubicOut }}
		out:fade={{ duration: Math.round(fadeMs * 0.72), easing: cubicOut }}
	></div>
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
		style="--fade-ms: {fadeMs}ms"
		out:fade={{ duration: 160 }}
		onclick={() => onexit?.()}
		aria-label="Return to the card you came from"
		title="Return"
	>
		<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
			<path
				d="M5 9 L12 16 L19 9"
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
	}

	/* The X arrives AFTER the ground has committed — it is an offer to leave, and offering it while the
	   card is still arriving reads as an interruption of the thing you just asked for. */
	.ascend-exit {
		position: fixed;
		top: 18px;
		right: 20px;
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
		opacity: 0.6; /* present, not insistent — it should be found, not noticed */
		cursor: pointer;
		animation: exit-in 420ms cubic-bezier(0.33, 1, 0.68, 1) both;
		animation-delay: var(--fade-ms, 520ms);
		transition:
			opacity 200ms ease-out,
			transform 200ms cubic-bezier(0.33, 1, 0.68, 1);
	}
	/* The hover moves it DOWN a hair — the direction it sends you. A control that previews its own
	   result is the cheapest affordance there is, and it costs 2px. */
	.ascend-exit:hover {
		opacity: 1;
		transform: translateY(2px);
	}
	.ascend-exit:focus-visible {
		outline: 2px solid #f7f1e6;
		outline-offset: 2px;
		opacity: 1;
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
