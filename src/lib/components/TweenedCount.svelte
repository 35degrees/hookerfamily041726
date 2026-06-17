<script lang="ts">
	/**
	 * TweenedCount — an animated number.
	 *
	 * Warm-up component for the page-transition work (DESIGN: "Page transitions"
	 * under MOTION LANGUAGE). Standalone and reusable: the search modal will use it
	 * for the standing "Total Hooker line: 8,000" figure and for live result counts.
	 *
	 *   <TweenedCount value={8000} from={0} />   — counts up from 0 on mount
	 *   <TweenedCount value={resultCount} />      — animates whenever value changes
	 *
	 * Honors prefers-reduced-motion (Tier 1 accessibility): the number snaps
	 * instead of animating. Uses tabular figures so the width never jitters.
	 */
	import { untrack } from 'svelte';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	type Props = {
		/** Target number to display / animate toward. */
		value: number;
		/** Optional start value, for a count-up on first render. Omit to start at `value`. */
		from?: number;
		/** Animation duration in ms. */
		duration?: number;
		/** Easing function (defaults to a gentle decelerate). */
		easing?: (t: number) => number;
		/** Render the (rounded) number. Defaults to grouped thousands, e.g. 8,000. */
		format?: (n: number) => string;
		/** Extra classes for the wrapping <span>. */
		class?: string;
	};

	let {
		value,
		from,
		duration = 700,
		easing = cubicOut,
		format = (n: number) => Math.round(n).toLocaleString('en-US'),
		class: className = ''
	}: Props = $props();

	// Starting value is a one-time snapshot (untrack → read once, no subscription).
	const tween = new Tween(untrack(() => from ?? value));

	$effect(() => {
		// Reduced motion → jump straight to the value (duration 0), no animation.
		tween.set(value, { duration: prefersReducedMotion.current ? 0 : duration, easing });
	});
</script>

<span class={`tabular-nums ${className}`}>{format(tween.current)}</span>
