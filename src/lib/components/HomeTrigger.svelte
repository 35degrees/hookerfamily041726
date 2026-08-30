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
		<!-- THE SAME HOUSE AS THE CARD'S, at the corner's scale. Filled when you are standing on your
		     home card, outlined when you are not — so it reads as an indicator as well as a door,
		     which is exactly what the house on a card does. One glyph, one meaning, two places. -->
		<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
			<path
				d="M4 10.4 12 4l8 6.4V19a1.2 1.2 0 0 1-1.2 1.2H5.2A1.2 1.2 0 0 1 4 19v-8.6z"
				fill={atHome ? 'currentColor' : 'none'}
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linejoin="round"
			/>
		</svg>
	</span>
{/if}

<style>
	/* THE CORNER'S OWN INK, to the value — five controls that agreed only roughly would read as a bug,
	   and they are always on screen together. Only the shape differs; the treatment is shared. */
	.home-trigger {
		display: inline-flex;
		align-items: center;
		color: rgba(43, 38, 32, 0.7);
		cursor: pointer;
		user-select: none;
		padding: 6px 2px;
		transition: color 180ms ease-out;
	}
	.home-trigger:hover,
	.home-trigger:focus-visible {
		color: rgba(43, 38, 32, 0.98);
		outline: none;
	}
	/* DARK GROUNDS — §41.3: cream ink is defined entirely by the dark behind it. */
	.home-trigger.on-dark {
		color: rgba(255, 250, 240, 0.72);
	}
	.home-trigger.on-dark:hover,
	.home-trigger.on-dark:focus-visible {
		color: rgba(255, 250, 240, 0.96);
	}
	/* THE ZONE OUTRANKS THE GROUND — painted over whatever the ground was, so this comes last and
	   wins for light and dark alike. The rail's own cream at the rail's own 0.82. */
	.home-trigger.in-zone {
		color: rgba(247, 241, 230, 0.82);
	}
	.home-trigger.in-zone:hover,
	.home-trigger.in-zone:focus-visible {
		color: rgba(247, 241, 230, 1);
	}
	/* STANDING ON IT: filled, and no longer offering to take you anywhere. Not dimmed — it is not
	   disabled so much as ARRIVED, and a faded icon would read as unavailable rather than as done. */
	.home-trigger.at-home {
		cursor: default;
	}
</style>
