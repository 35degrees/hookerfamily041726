<script lang="ts">
	/**
	 * HomeTrigger — the way back to your home card, from anywhere.
	 *
	 * It exists because the home card currently means nothing. `heroPersonId` is stored, and the only
	 * thing that will ever READ it is `/` — which is still the stock SvelteKit welcome page (roadmap
	 * §50.3, slice 4). Sam set Richard Hooker as his home, saw it land in the database, signed out and
	 * back in, and quite correctly reported that nothing happened. This closes that gap without
	 * waiting for the route: a door to the thing you chose.
	 *
	 * ICON ONLY, and that is a deliberate departure from the three words beside it. The corner is
	 * five controls deep now; a fifth WORD would push the cluster wide enough to matter, and this one
	 * needs no label — it is the same house glyph that fills on a card when that card is your home,
	 * so the object already means "home" everywhere else in the app. Everything else about it is the
	 * corner's: the same ink, the same ground-awareness, the same zone rule.
	 *
	 * IT DOES NOT APPEAR UNTIL THERE IS SOMEWHERE TO GO. No session, or no home set, and it renders
	 * nothing — a control that leads nowhere is a lie about being available, which is the same
	 * argument that keeps the card marks signed-in only.
	 */
	import { auth } from '$lib/state/auth.svelte';
	import { featured } from '$lib/state/featured.svelte';
	import { load, personById, search, CAT } from '$lib/state/search.svelte';
	import { arriveAtPerson } from '$lib/state/bookmarkNav';
	import { GROUNDS, groundState } from '$lib/state/ground.svelte';
	import { ascension } from '$lib/state/ascension.svelte';

	const onDark = $derived(GROUNDS[groundState.idx]?.kind === 'dark');
	const inZone = $derived(ascension.active);

	const heroId = $derived(auth.heroPersonId);
	/** Already standing on it — the control stays visible as an INDICATOR but does not fly you to
	 *  where you already are. A no-op flight is worse than an inert control: it looks broken. */
	const atHome = $derived(!!heroId && featured.current?.person?.id === heroId);

	/** Resolving the id needs the index, since bookmarks and heroes store IDs and the payloads are
	 *  keyed by slug. `search.ready` keeps this recomputing until it lands. */
	const hero = $derived.by(() => {
		void search.ready;
		return heroId ? personById(heroId) : null;
	});

	function warm() {
		void load().catch(() => {});
	}

	async function go() {
		if (!heroId || atHome) return;
		// The index may not be warm if the pointer never paused. Idempotent, so this is a no-op when
		// it already is.
		if (!hero) await load().catch(() => {});
		const p = personById(heroId);
		if (!p) return; // severed or merged since it was chosen — better to do nothing than to 404
		arriveAtPerson(p.slug, (p.f & CAT.INFLUENCE) !== 0);
	}
</script>

{#if auth.signedIn && heroId}
	<span
		class="home-trigger"
		class:on-dark={onDark}
		class:in-zone={inZone}
		class:at-home={atHome}
		role="button"
		tabindex="0"
		aria-label={atHome
			? 'You are on your home card'
			: `Go to your home card${hero ? ` — ${hero.n}` : ''}`}
		aria-disabled={atHome}
		onmouseenter={warm}
		onfocus={warm}
		onclick={go}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				void go();
			}
		}}
	>
		<!--
			A HOUSE WITH A DOORWAY, not a pentagon (Sam: "more clearly a house and not a empty
			pentagon"). The first version traced roof and walls as ONE closed outline, which at 14px is
			a five-sided blob — the roof pitch is the only thing distinguishing it from a shield, and
			at that size the pitch is four pixels.

			This path cuts the doorway out of the bottom edge as part of the same silhouette:

			  apex -> right eave -> right wall -> floor -> UP the door jamb -> across the lintel ->
			  DOWN the far jamb -> floor -> left wall -> close on the roof slope

			So it reads as a house at rest AND fills as one, with the doorway staying a hole rather
			than needing a second shape in the background colour — which would only have worked on one
			ground anyway.
		-->
		<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
			<path
				d="M12 3 L21.5 11.4 V21 H14.5 V15.5 H9.5 V21 H2.5 V11.4 Z"
				fill="currentColor"
				fill-opacity={atHome ? 1 : 0}
				stroke="currentColor"
				stroke-width="1.7"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
		</svg>
	</span>
{/if}

<style>
	/**
	 * THE X'S TREATMENT, taken to the value — `color` + `opacity: 0.55` lifting to 1 over 200ms is
	 * exactly what the close control in Search and the Thomas ladder does (Sam asked for it by
	 * name). It means this icon gets darker on approach rather than changing hue, which is the same
	 * distinction §45.12 draws for the Shuffle: an object changes state, not costume.
	 *
	 * MIDNIGHT BLUE (Sam), outline and fill alike — `--color-ascendmidnight`, the app's own darkest
	 * token rather than a new hue, and the same ink the house on a CARD fills with. One colour for
	 * one idea in both places.
	 */
	.home-trigger {
		display: inline-flex;
		align-items: center;
		color: var(--color-ascendmidnight, #1c2b4a);
		opacity: 0.55;
		cursor: pointer;
		user-select: none;
		padding: 6px 2px;
		transition: opacity 200ms ease-out;
	}
	.home-trigger:hover,
	.home-trigger:focus-visible {
		opacity: 1;
		outline: none;
	}
	/**
	 * THE FILL FADES IN, it does not snap (Sam). `fill` is ALWAYS `currentColor` and only
	 * `fill-opacity` moves, because switching `fill` between `none` and a colour is a discrete change
	 * with nothing to interpolate — the reason the first version popped. 260ms, a touch slower than
	 * the hover, so arriving home reads as settling rather than as a toggle.
	 */
	.home-trigger svg path {
		transition: fill-opacity 260ms ease-out;
	}
	/* DARK GROUNDS AND THE ZONE — §41.3: midnight ink on a midnight ground is not ink. Cream is
	   defined entirely by the dark behind it, and these two rules are the same ones every other
	   control in this corner carries. */
	.home-trigger.on-dark,
	.home-trigger.in-zone {
		color: rgba(247, 241, 230, 0.92);
	}
	/* STANDING ON IT: filled, and not offering to take you anywhere. Held at full strength rather
	   than dimmed — it is not unavailable so much as ARRIVED, and a faded house would read as
	   disabled. */
	.home-trigger.at-home {
		cursor: default;
		opacity: 1;
	}
</style>
