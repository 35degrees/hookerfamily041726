<script lang="ts">
	/**
	 * `/` — the intro (100226). Renders nothing itself: the overlay is in the layout. On mount it starts
	 * the intro and replaces this entry with the arriving card's page, which mounts UNDER the overlay and
	 * holds itself blank until the overlay has faded to paper (#lib/state/intro.svelte.ts). replaceState,
	 * so there is no `/` entry to go Back to and a refresh lands on the card — the intro never replays.
	 * Direct `/<slug>` links never come through here, so they never see it.
	 *
	 * WHICH CARD: YOUR HOME CARD IF YOU HAVE ONE, else Thomas (Sam, 100526: "the entry that I've tagged
	 * as my home card should be the one that appears when i move forward from the painting. instead its
	 * always thomas hooker"). The spec always said so (§50.3); this is the wiring.
	 *
	 * THE GOTO WAITS FOR THE ANSWER, and that is safe because nothing is waiting on it yet. The overlay
	 * shows its Enter arrow only once the page beneath has mounted (`intro.ready`), which is ~5s in — the
	 * title, the light and the painting all play first. Resolving the home card takes the session (~100ms)
	 * and, for a signed-in reader, the search index: heroes are stored by ID and payloads are keyed by
	 * slug, and the index is the app's one id → slug resolver (HomeTrigger and My Bookmarks resolve
	 * through it too, so it is the index those will want anyway). Capped at RESOLVE_MS so a slow network
	 * still gets Thomas in time for the arrow rather than a stalled intro.
	 */
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { personHref } from '#lib/paths.js';
	import { startIntro } from '#lib/state/intro.svelte.js';
	import { auth } from '#lib/state/auth.svelte.js';
	import { load, personById } from '#lib/state/search.svelte.js';

	const THOMAS_SLUG = 'thomas-hooker-1586';
	const RESOLVE_MS = 3500;

	async function homeSlug(): Promise<string> {
		while (auth.isPending) await new Promise((r) => setTimeout(r, 40));
		const id = auth.signedIn ? auth.heroPersonId : null;
		if (!id || id === 'H00001') return THOMAS_SLUG;
		await load();
		// severed or merged since it was chosen — Thomas rather than a 404 under the painting
		return personById(id)?.slug ?? THOMAS_SLUG;
	}

	onMount(() => {
		startIntro();
		const cap = new Promise<string>((r) => setTimeout(() => r(THOMAS_SLUG), RESOLVE_MS));
		void Promise.race([homeSlug().catch(() => THOMAS_SLUG), cap]).then((slug) =>
			goto(personHref(slug), { replace: true })
		);
	});
</script>

<svelte:head><title>The Descendants of Rev. Thomas Hooker</title></svelte:head>
