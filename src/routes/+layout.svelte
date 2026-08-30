<script lang="ts">
	import './layout.css';
	// 082926: the dead `page` import from the deprecated `$app/stores` is gone — it was never
	// referenced in this file, and it was the app's ONLY `$app/stores` reference. Recorded as a free
	// fix in roadmap §38.6 on August 14 and carried on the open list ever since; taken here because
	// auth is the arc that finally touches this file. One less thing for the SvelteKit 3 migration.
	import { fade } from 'svelte/transition';

	// Supports weights 100-900
	import '@fontsource-variable/inter/wght.css';
	// Supports weights 400-700
	import '@fontsource-variable/lora/wght.css';
	import '@fontsource/source-serif-pro';
	import '@fontsource/source-sans-pro';
	import '@fontsource/source-sans-pro/300.css';
	import '@fontsource/source-sans-pro/400.css';
	// Supports weights 100-900 — per-person narrative typeface (bio.display_font)
	import '@fontsource-variable/rokkitt/wght.css';
	// Supports weights 100-900 — the FEATURED CARD's NAME and nothing else (FeaturedCard NAME_FACE).
	// Variable, so its 500 is a real weight. Carlito was the other candidate and is deliberately NOT
	// imported: it has nothing between 400 and 700, and an unused face still costs a font download on
	// every page, which widens the font-display:swap window every face here already has.
	import '@fontsource-variable/outfit/wght.css';
	// The vitals (Birth/Death dates, places, MAP) and the burial pin. VARIABLE, because those two blocks
	// now use three weights between them (300 / 400 / 500) — one variable file beats three static ones.
	import '@fontsource-variable/open-sans/wght.css';
	// Supports weights 100-900 — the TIMELINE RAIL's years and nothing else (TimelineRail .tick-year).
	// Variable, so the 500 Sam asked for is a real weight rather than a synthesised one.
	import '@fontsource-variable/fraunces/wght.css';
	import favicon from '$lib/assets/favicon.svg';
	import SettleVeil from '$lib/components/SettleVeil.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<!-- IN THE LAYOUT, NOT THE PAGE, and not negotiable: it has to be in the SSR'd HTML to cover the
     FIRST paint, and it has to outlive a client-side navigation between person pages without
     remounting. A page-level veil would arrive after hydration — which is the exact moment it exists
     to cover — and would re-fire on every card change. -->
<SettleVeil />
{@render children()}
