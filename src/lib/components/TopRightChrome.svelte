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
	import AuthTrigger from './AuthTrigger.svelte';
	import { ascension } from '$lib/state/ascension.svelte';

	let { settled = true }: { settled?: boolean } = $props();
</script>

<div class="top-right-chrome">
	<!-- SHUFFLE STILL YIELDS THE ZONE (roadmap §40, its own reasoning): it is a door OUT to a random
	     notable, and offering an exit that skips the descent undoes the whole gesture. -->
	{#if !ascension.active}
		<ShuffleNotables {settled} />
	{/if}
	<!-- SEARCH DOES NOT YIELD (Sam). It is not an exit that skips anything — it is how you get anywhere
	     from anywhere, and being stranded in the zone with no way to leave except the X was a smaller
	     app than the one this is. It re-inks itself for the dark ground; see SearchTrigger. -->
	<SearchTrigger />
	<!-- AUTH TAKES THE OUTERMOST SEAT (Sam, 082926: "i want Sign In in the right top corner, i don't
	     care that Search gets moved over").

	     RECORDED BECAUSE IT REVISES A WRITTEN RULE RATHER THAN FILLING A GAP. §45.15 gave Search this
	     seat on a stated principle — "reading right to left, the outermost control is the one that goes
	     anywhere in the tree" — and Sign In displaces it. Sam's call, made knowingly; noted here so a
	     later reader finds a decision instead of a contradiction between the doc and the corner.

	     IT DOES NOT YIELD THE ZONE, for Search's reason rather than Shuffle's: signing in is not an
	     exit that skips the descent, and being stranded mid-ascension unable to reach your own account
	     is the same smaller app §45.15 argued against. It renders NOTHING while the session resolves,
	     so the cluster never reflows — see AuthTrigger. -->
	<AuthTrigger />
</div>

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
