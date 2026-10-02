<script lang="ts">
	/**
	 * `/` — the intro (100226). Renders nothing itself: the overlay is in the layout. On mount it starts
	 * the intro and replaces this entry with Thomas's page, which mounts UNDER the overlay and holds
	 * itself blank until the overlay has faded to paper (#lib/state/intro.svelte.ts). replaceState, so
	 * there is no `/` entry to go Back to and a refresh lands on the card — the intro never replays.
	 * Direct `/<slug>` links never come through here, so they never see it.
	 */
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { personHref } from '#lib/paths.js';
	import { startIntro } from '#lib/state/intro.svelte.js';

	const THOMAS_SLUG = 'thomas-hooker-1586';

	onMount(() => {
		startIntro();
		void goto(personHref(THOMAS_SLUG), { replace: true });
	});
</script>

<svelte:head><title>The Descendants of Rev. Thomas Hooker</title></svelte:head>
