<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { NarrativeBlock } from '$lib/types/person';

	type Props = {
		blocks: NarrativeBlock[];
		/** Optional per-person typeface key from bio.display_font. Resolved through FONTS below;
		    anything unrecognised falls through to the card default. */
		font?: string | null;
	};

	let { blocks, font = null }: Props = $props();

	// Allow-list, not a passthrough: canonical.json supplies a KEY, never a class or CSS.
	// The token itself lives in layout.css @theme (--font-rokkitt).
	const FONTS: Record<string, string> = { rokkitt: 'font-rokkitt' };
	let fontClass = $derived(FONTS[(font ?? '').toLowerCase()] ?? '');
	// The typeface lands on the HEADER only — bodies stay in the card's reading face. A slab serif
	// sets optically smaller than Inter at the same px, so the override carries its own +20% step
	// (15px → 18px) rather than changing the default header size for all 18,000 cards.
	let headerClass = $derived(fontClass ? `${fontClass} text-[18px]` : 'text-[15px]');

	const MAX_DISPLAYED = 6;

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
				// Index-inclusive so two blocks sharing a `number` can't collide and
				// abort the keyed render. Also drives the expanded-block state below.
				key: `${block.number ?? 'b'}-${index}`
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
	<div class="narrative-blocks space-y-2">
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
					<h3 class="font-semibold text-blue-900 transition-colors select-none {headerClass}">
						{block.header}<span
							class="ml-2 inline-flex align-baseline text-lg leading-none text-slate-500"
							aria-hidden="true">{openKey === key ? '−' : '+'}</span
						>
					</h3>
				</button>
				{#if openKey === key}
					<div class="pt-1 pr-8 pb-1.5" transition:slide={{ duration: 220, axis: 'y' }}>
						<p class="text-[13.5px] leading-relaxed text-stone-700 select-none">
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
