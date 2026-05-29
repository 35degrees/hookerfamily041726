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
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
