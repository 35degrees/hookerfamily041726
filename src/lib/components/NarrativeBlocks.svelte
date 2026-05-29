<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { NarrativeBlock } from '$lib/types/person';

	type Props = {
		blocks: NarrativeBlock[];
	};

	let { blocks }: Props = $props();

	const MAX_DISPLAYED = 5;

	let sortedBlocks = $derived(
		[...blocks]
			.sort((a, b) => {
				const an = a.number ?? Number.POSITIVE_INFINITY;
				const bn = b.number ?? Number.POSITIVE_INFINITY;
				return an - bn;
			})
			.slice(0, MAX_DISPLAYED)
			.map((block, index) => ({
				block,
				key: block.number ?? `idx-${index}`
			}))
	);

	let openKey = $state<string | number | null>(null);

	// Reset to the first block whenever the blocks prop changes (e.g., new
	// person navigated to). This ensures the first NB is expanded by default
	// on every new page, regardless of what was open on the previous page.
	$effect(() => {
		blocks; // explicit dependency reference
		if (sortedBlocks.length > 0) {
			openKey = sortedBlocks[0].key;
		} else {
			openKey = null;
		}
	});

	function toggle(key: string | number) {
		openKey = openKey === key ? null : key;
	}
</script>

{#if sortedBlocks.length > 0}
	<div class="narrative-blocks space-y-3">
		{#each sortedBlocks as { block, key } (key)}
			<div class="block">
				<button
					type="button"
					onclick={() => toggle(key)}
					class="header-button w-full rounded-sm text-left transition-opacity hover:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
				>
					{#if block.category}
						<div
							class="text-[10px] font-bold tracking-wider text-blue-900/50 uppercase select-none"
						>
							{block.category}
						</div>
					{/if}
					<div class="flex items-center justify-between gap-3">
						<h3 class="flex-1 text-base font-semibold text-blue-900 transition-colors select-none">
							{block.header}
						</h3>
						<span
							class="mb-2 flex h-6 w-6 shrink-0 items-center justify-center text-lg text-slate-500"
							aria-hidden="true"
						>
							{openKey === key ? '−' : '+'}
						</span>
					</div>
				</button>
				{#if openKey === key}
					<div class="pt-2 pb-1" transition:slide={{ duration: 220, axis: 'y' }}>
						<p class="text-sm leading-relaxed text-stone-700 select-none">
							{block.body}
						</p>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.header-button {
		cursor: pointer;
	}
	.header-button:hover h3 {
		color: #475569;
	}
</style>
