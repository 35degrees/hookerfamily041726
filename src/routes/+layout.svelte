<script lang="ts">
	import './layout.css';
	import { page } from '$app/stores';
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
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
