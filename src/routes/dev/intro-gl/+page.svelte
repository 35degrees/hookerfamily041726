<script lang="ts">
	/**
	 * /dev/intro-gl — the intro drawn on the GPU (IntroGL), for Sam to compare with the live one at `/` in Safari
	 * before it replaces anything. Same sequence and timings; Replay plays it again from the start.
	 */
	import IntroGL from '#lib/components/IntroGL.svelte';

	let run = $state(0);
	let done = $state(false);
</script>

<svelte:head><title>Intro (GPU test)</title></svelte:head>

<div class="paper">
	{#if done}
		<button
			class="replay"
			type="button"
			onclick={() => {
				done = false;
				run++;
			}}>Replay</button
		>
	{/if}
</div>
{#key run}
	{#if !done}<IntroGL test ondone={() => (done = true)} />{/if}
{/key}

<style>
	.paper {
		position: fixed;
		inset: 0;
		background: #f4efe6;
		display: grid;
		place-items: center;
	}
	.replay {
		font: 500 15px/1 system-ui, sans-serif;
		padding: 10px 18px;
		border: 1px solid #b9ab8f;
		border-radius: 6px;
		background: #fffaf0;
		cursor: pointer;
	}
</style>
