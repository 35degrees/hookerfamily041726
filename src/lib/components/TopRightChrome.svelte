<script lang="ts">
	/**
	 * TopRightChrome — the top-right corner as ONE cluster.
	 *
	 * Search and Shuffle used to be positioned independently: Shuffle pinned itself `fixed;
	 * right:16px; top:16px`, and dropping Search into the same corner would have meant giving Shuffle
	 * a hard-coded left offset the width of the word "Search" — a magic number that goes wrong the
	 * first time the font, the label or the zoom changes, and goes wrong SILENTLY, as an overlap.
	 * A flex row with a gap cannot drift: the corner owns the layout and the two controls just sit in
	 * it, in source order, right-aligned.
	 *
	 * SEARCH TAKES THE CORNER and Shuffle moves inboard (Sam). Reading right to left, the outermost
	 * control is the one that goes anywhere in the tree; the Shuffle is the narrower gesture and sits
	 * behind it.
	 *
	 * IT YIELDS THE CORNER DURING THE ASCENSION, for the reason ShuffleNotables already gave for
	 * itself: the ascension's X arrives in exactly this spot, and rather than crowd controls together
	 * the ones that do not belong there step away. Gating the CLUSTER means Search inherits that rule
	 * for free instead of having to remember it.
	 */
	import SearchTrigger from './SearchTrigger.svelte';
	import ShuffleNotables from './ShuffleNotables.svelte';
	import { ascension } from '$lib/state/ascension.svelte';

	let { settled = true }: { settled?: boolean } = $props();
</script>

{#if !ascension.active}
	<div class="top-right-chrome">
		<ShuffleNotables {settled} />
		<SearchTrigger />
	</div>
{/if}

<style>
	.top-right-chrome {
		position: fixed;
		right: 16px;
		top: 16px;
		z-index: 10;
		display: flex;
		align-items: center;
		/* Wide enough that the shelled button and the bare word do not read as one control, tight
		   enough that they read as one cluster. */
		gap: 14px;
	}
</style>
