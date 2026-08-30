<script lang="ts">
	/**
	 * SettleVeil — a blur over the FIRST PAINT, lifted the moment the stage knows the window.
	 *
	 * THE PROBLEM IT COVERS, precisely. `--stage-u` and `--type-k` are published by an `$effect` in
	 * the person page, so they do not exist during SSR or before hydration. Until then every one of
	 * the seven `var(--stage-u, 1)` call sites resolves to the FALLBACK OF 1 — full, unscaled size —
	 * and the entire composition then shrinks into place when the effect runs. §33's own comment on
	 * `SSR_W` predicted this and called it deliberate: "the first paint is rendered at whatever this
	 * returns and then settles once on hydrate."
	 *
	 * Sam, after signing in: "a lot of the existing UX ... take about 500ms to do weird things before
	 * finally settling into position ... the text in the Paths to Thomas and Connect to Anyone gets
	 * too large, some of the other text gets large, maybe the spouse notch gets warped."
	 *
	 * IT IS NOT AN AUTH BUG, and that matters for where the fix goes. An OAuth round trip is a full
	 * page load, so signing in guarantees a cold paint; before auth you had to refresh to get one,
	 * which is why it went unreported for months. The same settle happens on a shared link, a
	 * bookmark, and a refresh — and after door 3 that is every visitor's first impression.
	 *
	 * WHY IT IS NOT AUTH-ONLY, which was the first instinct and is impossible. To cover the first
	 * paint the veil must be in the SSR'd HTML; to show it only after a sign-in the SERVER would have
	 * to read a per-user flag; and that makes `/person/*` dynamic, which breaks §50.0 outright for a
	 * cosmetic gain. A veil that waits for hydration to decide whether to appear has already missed
	 * the frames it exists to cover.
	 *
	 * WHY A BLUR AND NOT A COVER (Sam: "i don't want the screen to go blank or solid color"). It is
	 * the marshmallow veil's own material at full strength — the same thing every modal in this app
	 * puts over the tree — so the composition stays visible and merely out of focus while it settles.
	 * Nothing is hidden; it is defocused for a few frames.
	 *
	 * WHAT IT DOES NOT DO: fix the settle. The composition still reflows underneath. This is a cover,
	 * chosen deliberately over the alternative — publishing the dials from an inline script before
	 * first paint, which removes the reflow entirely but requires the rung LADDER to exist in a second
	 * place, outside the one module §33.1 says may read the window. That is the real fix and it is a
	 * §33-sized decision; this is the cheap one, and it is reversible.
	 */
	import { stage } from '$lib/state/stage.svelte';
	import { linear } from 'svelte/easing';

	/**
	 * A SECOND CONDITION BEYOND `measured`, and it is not belt-and-braces.
	 *
	 * `stage.measured` flips as soon as the browser reports a width — but the dials are published by
	 * an `$effect`, which runs LATER in the same flush. Lifting on `measured` alone would uncover the
	 * page for the one or two frames between the two. `settled` waits a further frame after that, so
	 * the veil outlives the reflow rather than racing it.
	 */
	let settled = $state(false);
	$effect(() => {
		if (!stage.measured) return;
		// Two frames: one for the dial effect to run, one for the browser to paint at the new sizes.
		const a = requestAnimationFrame(() => requestAnimationFrame(() => (settled = true)));
		return () => cancelAnimationFrame(a);
	});

	/**
	 * A DEAD MAN'S SWITCH. If the effect never runs — JS throws during hydration, a browser we have
	 * not seen — the veil must not become a permanent frosted sheet over the whole app. 1400ms is far
	 * longer than any real settle and far shorter than a reader's patience.
	 */
	$effect(() => {
		const t = setTimeout(() => (settled = true), 1400);
		return () => clearTimeout(t);
	});

	/** Fades on its own clock rather than §45.11's, because it is uncovering rather than leaving: the
	 *  page beneath is already correct by the time this starts, so it wants to be brief. */
	function lift(_node: Element, { duration }: { duration: number }) {
		return {
			duration,
			easing: linear,
			css: (t: number) => {
				const b = (10 * t).toFixed(2);
				return `opacity: ${t}; backdrop-filter: blur(${b}px); -webkit-backdrop-filter: blur(${b}px);`;
			}
		};
	}
</script>

{#if !settled}
	<div class="settle-veil" out:lift={{ duration: 260 }} aria-hidden="true"></div>
{/if}


<style>
	/* THE MARSHMALLOW VEIL'S OWN MATERIAL — the same radial and the same 10px blur every modal in this
	   app puts over the tree (§45.10). Using the house's existing overlay rather than inventing a
	   second one means the app has ONE way of saying "this is temporarily not for you". */
	.settle-veil {
		position: fixed;
		inset: 0;
		/* Above everything including the modals, because it covers the whole first paint. */
		z-index: 90;
		pointer-events: none;
		background: radial-gradient(
			120% 90% at 50% 42%,
			rgba(228, 226, 216, 0.36) 0%,
			rgba(222, 220, 210, 0.43) 55%,
			rgba(216, 214, 204, 0.49) 100%
		);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}
</style>
