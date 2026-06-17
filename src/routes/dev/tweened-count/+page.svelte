<script lang="ts">
	/**
	 * Throwaway isolation harness for TweenedCount — verifies the animation in a
	 * browser with placeholder numbers. No search UI, no routing dependency.
	 * Safe to delete once the component is wired into the real search modal.
	 */
	import TweenedCount from '$lib/components/TweenedCount.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const stats = $derived(data.stats); // build-time tallies from static/data/stats.json

	let results = $state(247);
	// Bump a key to remount the count-up demos and replay the mount animation.
	let replay = $state(0);

	function randomize() {
		results = Math.floor(Math.random() * stats.total);
	}
</script>

<main class="mx-auto max-w-2xl space-y-12 p-12 font-sans">
	<header class="space-y-1">
		<h1 class="text-2xl font-medium text-slate-800">TweenedCount — isolation harness</h1>
		<p class="text-sm text-slate-500">
			Placeholder numbers only. Open in a browser to watch the animation.
		</p>
	</header>

	<!-- 1. Count-up on mount (real build-time counts; the search modal's standing figures) -->
	<section class="space-y-4">
		<h2 class="text-xs font-medium tracking-wider text-slate-400 uppercase">
			Count-up on mount (real counts from stats.json)
		</h2>
		{#key replay}
			<p class="text-lg text-slate-700">
				Thomas Hooker descendants:
				<span class="text-2xl font-semibold text-blue-900">
					<TweenedCount value={stats.thomasDescendants} from={0} duration={900} />
				</span>
			</p>
			<p class="text-lg text-slate-700">
				Talcott descendants:
				<span class="text-2xl font-semibold text-blue-900">
					<TweenedCount value={stats.talcottDescendants} from={0} duration={900} />
				</span>
			</p>
		{/key}
		<button
			class="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
			onclick={() => (replay += 1)}
		>
			Replay count-up
		</button>
	</section>

	<!-- 2. Animate between dynamic values (live result count) -->
	<section class="space-y-4">
		<h2 class="text-xs font-medium tracking-wider text-slate-400 uppercase">Dynamic value</h2>
		<p class="text-lg text-slate-700">
			Results:
			<span class="text-2xl font-semibold text-slate-900">
				<TweenedCount value={results} />
			</span>
		</p>
		<div class="flex flex-wrap gap-2">
			<button
				class="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
				onclick={randomize}>Randomize</button
			>
			<button
				class="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
				onclick={() => (results += 1000)}>+1,000</button
			>
			<button
				class="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
				onclick={() => (results = 0)}>Reset to 0</button
			>
			<button
				class="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
				onclick={() => (results = stats.total)}>Jump to total ({stats.total.toLocaleString('en-US')})</button
			>
		</div>
	</section>
</main>
