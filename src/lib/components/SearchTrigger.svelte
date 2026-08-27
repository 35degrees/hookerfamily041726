<script lang="ts">
	/**
	 * SearchTrigger — the way into search. A magnifying glass and the word "Search", and
	 * DELIBERATELY NOT A BUTTON (Sam: "not a button just text"). It has no shell, no border and no
	 * ground of its own; it sits in the top-right cluster beside the Shuffle button, which keeps its
	 * shell. The two are different KINDS of control and are allowed to look it — one is an object you
	 * press, the other is a word you click.
	 *
	 * It warms the index on hover and on focus rather than waiting for the click. The index is ~1 MB
	 * gzipped and one fetch per session, so paying for it while the pointer is still travelling is
	 * free; `load()` is idempotent, so hovering ten times still fetches once.
	 */
	import { openModal } from '$lib/state/modal.svelte';
	import { load } from '$lib/state/search.svelte';
	import { GROUNDS, groundState } from '$lib/state/ground.svelte';
	import { ascension } from '$lib/state/ascension.svelte';

	/**
	 * THE INK IS A PROPERTY OF THE PAIR, NOT OF THE CONTROL (design §29). There are seven grounds and
	 * five of them are LIGHT — Manuscript is the default — so the cream this started as was invisible
	 * on the ground it would be seen against most of the time. A shell would have solved it the way
	 * the Shuffle's does, but Sam asked for text and not a button, and a bare word has nothing to hide
	 * behind: it has to answer the ground directly.
	 */
	const onDark = $derived(GROUNDS[groundState.idx]?.kind === 'dark');
	/**
	 * IN THE ZONE THE GROUND IS NOT THE GROUND ANY MORE. Midnight or founder-green covers whatever the
	 * user picked, so the ground token stops being the right question and the zone answers instead.
	 * Sam asked for the timeline rail's ink, and this is literally the rail's value —
	 * `.rail.ascended .tick-year` is #f7f1e6 at 0.82 — so the two pieces of chrome that survive into the
	 * zone are lit the same way rather than approximately the same way.
	 */
	const inZone = $derived(ascension.active);

	function warm() {
		void load().catch(() => {
			/* a failed warm is not an error the user should see — the click retries */
		});
	}
</script>

<span
	class="search-trigger"
	class:on-dark={onDark}
	class:in-zone={inZone}
	role="button"
	tabindex="0"
	title="Search everyone in the tree"
	onmouseenter={warm}
	onfocus={warm}
	onclick={() => openModal('search')}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			openModal('search');
		}
	}}
>
	<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
		<path
			fill="currentColor"
			d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
		/>
	</svg>
	Search
</span>

<style>
	/* CREAM INK ON THE MIDNIGHT FIELD (design §41.3: cream ink is defined entirely by the dark behind
	   it). It takes the .ground-toggle's exact type — 500 12px Inter — so all three pieces of fixed
	   chrome are one typographic family even though this one has no shell. */
	.search-trigger {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font: 500 12px/1 var(--font-inter, sans-serif);
		letter-spacing: 0.02em;
		/* Sits one step BELOW the Shuffle's gold at rest, so the corner has an order to read in rather
		   than two controls shouting equally. Hover closes that gap instead of adding a background —
		   the same "it is one object, it changes state not costume" rule the Shuffle follows. */
		/* LIGHT GROUNDS (the default, and five of the seven): the house ink, one step back from full
		   strength so the Shuffle's gold still leads the corner. */
		color: rgba(43, 38, 32, 0.7);
		cursor: pointer;
		user-select: none;
		padding: 6px 2px;
		transition: color 180ms ease-out;
	}
	.search-trigger:hover,
	.search-trigger:focus-visible {
		color: rgba(43, 38, 32, 0.98);
		outline: none;
	}
	/* DARK GROUNDS (Midnight, Pine) — §41.3: cream ink is defined entirely by the dark behind it. */
	.search-trigger.on-dark {
		color: rgba(255, 250, 240, 0.72);
	}
	.search-trigger.on-dark:hover,
	.search-trigger.on-dark:focus-visible {
		color: rgba(255, 250, 240, 0.96);
	}
	/* THE ZONE OUTRANKS THE GROUND — it is painted over whatever the ground was, so this rule comes
	   last and wins for both light and dark grounds alike. The rail's own cream, at the rail's own 0.82. */
	.search-trigger.in-zone {
		color: rgba(247, 241, 230, 0.82);
	}
	.search-trigger.in-zone:hover,
	.search-trigger.in-zone:focus-visible {
		color: rgba(247, 241, 230, 1);
	}
	.search-trigger svg {
		width: 14px;
		height: 14px;
		/* Optical, not metric: a magnifier's mass sits high and left of its box, so a metrically centred
		   glyph reads as sitting slightly high beside a cap-height word. */
		transform: translateY(0.5px);
	}
</style>
