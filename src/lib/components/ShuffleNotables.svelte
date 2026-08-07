<script lang="ts">
	/**
	 * SHUFFLE NOTABLES — the button. All the thinking is in `$lib/state/shuffle.svelte.ts`; this is the
	 * affordance and nothing else.
	 *
	 * Two behaviours worth naming:
	 *
	 * DISABLED WHILE A FLIGHT IS RUNNING. The deck already swallows mid-flight navigation (flightLock),
	 * so a second click cannot start a second flight — but a button that silently eats clicks reads as
	 * broken. `settled` comes from the page's own landing gate, the same one the featured card uses, so
	 * the affordance and the lock can never disagree.
	 *
	 * WARMED ON MOUNT. The notables list is fetched once, on idle, so the FIRST click flies immediately
	 * instead of waiting on a request. Without this the first shuffle of a session stalls for as long as
	 * the fetch takes — which on the 3G profile is exactly when it is least forgivable.
	 */
	import { shuffleToNotable, warmShuffle } from '$lib/state/shuffle.svelte';
	import { onMount } from 'svelte';

	let { settled = true }: { settled?: boolean } = $props();

	let el = $state<HTMLButtonElement | null>(null);

	onMount(() => {
		if ('requestIdleCallback' in window) requestIdleCallback(() => warmShuffle());
		else setTimeout(warmShuffle, 400);
	});

	function go() {
		if (!el || !settled) return;
		void shuffleToNotable(el);
	}
</script>

<button
	bind:this={el}
	class="shuffle-notables"
	type="button"
	disabled={!settled}
	title="Fly to a notable at random"
	aria-label="Shuffle to a random notable person"
	onclick={go}
>
	<!-- Two crossing cards, which is the deck this rides on rather than a generic shuffle glyph. -->
	<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
		<rect x="1.6" y="3.4" width="7.6" height="9.8" rx="1.4" transform="rotate(-11 5.4 8.3)" />
		<rect x="6.8" y="2.8" width="7.6" height="9.8" rx="1.4" transform="rotate(9 10.6 7.7)" />
	</svg>
	Shuffle
</button>

<style>
	/* Mirrors .ground-toggle (Field.svelte) so the two pieces of chrome are siblings, not strangers —
	   same pill, same type, same blur, same inset. Only the corner differs: the ground toggle sits
	   bottom-right, this sits top-right (Sam). */
	.shuffle-notables {
		position: fixed;
		right: 16px;
		top: 16px;
		z-index: 10;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 6px 12px 6px 9px;
		font: 500 12px/1 var(--font-inter, sans-serif);
		color: rgba(255, 250, 240, 0.85);
		background: rgba(20, 28, 46, 0.6);
		border: 1px solid rgba(255, 250, 240, 0.18);
		border-radius: 999px;
		cursor: pointer;
		backdrop-filter: blur(6px);
		transition:
			opacity 160ms ease-out,
			background 160ms ease-out;
	}
	.shuffle-notables:hover:not(:disabled) {
		background: rgba(20, 28, 46, 0.74);
	}
	/* Not hidden — a control that vanishes mid-flight reads as a bug. It dims and stops taking clicks,
	   which says "busy" rather than "gone". */
	.shuffle-notables:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.shuffle-notables svg {
		width: 13px;
		height: 13px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.3;
		opacity: 0.9;
	}
</style>
