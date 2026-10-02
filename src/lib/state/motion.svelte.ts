/**
 * motion.svelte.ts — ONE ANSWER TO "SHOULD THIS ANIMATE?" (100226)
 *
 * The app already had a complete no-transition mode: every flight, demote, chip march, reveal and
 * panel cascade checks `prefersReducedMotion.current` and, when the OS asks for less motion, swaps
 * instantly instead. probe-demote-settle asserts it ("reduced-motion instant").
 *
 * A BROWSER BACK / FORWARD NEEDS EXACTLY THAT MODE, FOR ONE SWAP. A Back is not a click: it captures no
 * origin rect, no flight kind, no pivot and no rects, so running the flights on it plays them on empty
 * or stale captures — the old card demoting into nowhere, chips marching from places they never were.
 * Sam, on the first attempt that let them run: "it tries to recreate the transitions and chip
 * promotions and demotions and it just doesn't work… it should just enter state."
 *
 * So `motionOff()` is "reduced motion OR a history step is being applied", and every site that already
 * honoured reduced motion now asks this instead. The page raises `instantSwap` immediately before it
 * sets the card for a Back/Forward and it lowers itself two frames later — after Svelte's flush has
 * created (and, at duration 0, finished) every transition the swap triggers. A click never raises it,
 * so every click-driven transition is exactly what it was.
 *
 * `$state`, not a plain variable, because some readers are `$derived` (`flipMs`, the rail's fade): they
 * must recompute when the flag rises, in the same flush as the swap.
 */
import { prefersReducedMotion } from 'svelte/motion';

let instant = $state(false);

/** True when nothing should animate: the OS asks for reduced motion, or a history step is being applied. */
export function motionOff(): boolean {
	return prefersReducedMotion.current || instant;
}

/** Make the NEXT card swap instant. Call immediately before `featured.set(...)` for a Back/Forward. */
export function beginInstantSwap(): void {
	instant = true;
	requestAnimationFrame(() => requestAnimationFrame(() => (instant = false)));
}
