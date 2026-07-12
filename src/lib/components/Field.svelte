<script lang="ts">
	// Phase 3b Block 1 — THE FIELD. A midnight world behind the stage: 2–3 layers of luminous motes
	// ("fairy lights") that COUNTER-DRIFT on every camera move (parallax by depth), on the SAME clock as
	// the flight (§17 one-clock doctrine). Cards/chips live above this at depth 0 and never parallax.
	import { onMount } from 'svelte';
	import { subscribeCameraMove, type CameraMove } from '$lib/state/camera';
	import { prefersReducedMotion } from 'svelte/motion';

	type Layer = { depth: number; count: number; sizeMin: number; sizeMax: number; seed: number };
	// far → near: deeper layers hold MORE, smaller, dimmer motes and drift LESS (lower depth factor).
	const LAYERS: Layer[] = [
		{ depth: 0.2, count: 60, sizeMin: 1, sizeMax: 2, seed: 0x9e37 }, // far
		{ depth: 0.35, count: 40, sizeMin: 1.5, sizeMax: 3, seed: 0x85eb }, // mid
		{ depth: 0.5, count: 20, sizeMin: 2, sizeMax: 4, seed: 0xc2b2 } // near
	];

	// The world drifts OPPOSITE the camera pan. The hero's screenVector points chip→slot, i.e. OPPOSITE
	// the focus shift (a child sits below → hero travels UP), so the world moves WITH the screenVector:
	// click a child (sv up) → world drifts up. One flag — flip to -1 if the feel reads inverted.
	const PARALLAX_SIGN = 1;

	// Deterministic PRNG (mulberry32) so the field is STABLE — same motes every render, no Math.random
	// flicker on hydrate. (World-space seeding on table coords — stable per region — is Block 2; this
	// Block-1 field is a fixed deterministic pattern that parallaxes.)
	function mulberry32(a: number) {
		return () => {
			a |= 0;
			a = (a + 0x6d2b79f5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	type Mote = { x: number; y: number; size: number; op: number; twDelay: number; twDur: number; gold: number };
	function makeMotes(l: Layer): Mote[] {
		const r = mulberry32(l.seed);
		return Array.from({ length: l.count }, () => ({
			x: r() * 100, // % across the oversized (300%) layer
			y: r() * 100,
			size: l.sizeMin + r() * (l.sizeMax - l.sizeMin),
			op: 0.35 + r() * 0.5,
			twDelay: r() * 8, // s — randomized phase so twinkles never pulse in unison
			twDur: 5 + r() * 8, // s
			gold: r() // 0 warm-white → 1 pale-gold
		}));
	}
	const motes = LAYERS.map(makeMotes);

	// Accumulated per-layer offset (px). Each camera move adds PARALLAX_SIGN·screenVector·depth.
	let offsets = $state(LAYERS.map(() => ({ x: 0, y: 0 })));
	let move = $state<CameraMove | null>(null); // latest move — drives the transition duration/easing

	const easeCss = (name?: string) => (name === 'linear' ? 'linear' : 'cubic-bezier(0.33, 1, 0.68, 1)');

	onMount(() => {
		// Subscribe so the field drifts ON the published move (same clock as the flight). Reduced motion:
		// no drift at all — the field stays static (twinkle is also killed by the media query below).
		const unsub = subscribeCameraMove((m) => {
			if (prefersReducedMotion.current) return;
			move = m;
			offsets = offsets.map((o, i) => ({
				x: o.x + PARALLAX_SIGN * m.screenVector.dx * LAYERS[i].depth,
				y: o.y + PARALLAX_SIGN * m.screenVector.dy * LAYERS[i].depth
			}));
		});
		return unsub;
	});
</script>

<div class="field" aria-hidden="true">
	{#each LAYERS as _layer, i (i)}
		<div
			class="layer"
			style:transform={`translate3d(${offsets[i].x}px, ${offsets[i].y}px, 0)`}
			style:transition={`transform ${move?.duration ?? 0}ms ${easeCss(move?.easing)}`}
		>
			{#each motes[i] as m, j (j)}
				<span
					class="mote"
					style:left={`${m.x}%`}
					style:top={`${m.y}%`}
					style:width={`${m.size}px`}
					style:height={`${m.size}px`}
					style:--op={m.op}
					style:--tw-delay={`${m.twDelay}s`}
					style:--tw-dur={`${m.twDur}s`}
					style:--edge={`${215 - m.gold * 55}`}
				></span>
			{/each}
		</div>
	{/each}
</div>

<style>
	/* z-index 0 fixed; the stage (.page-container) sits at z-index 1 above it. Behind that, the body's
	   midnight ground. pointer-events none — the field is scenery, never interactive. */
	.field {
		position: fixed;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
		/* the midnight ground itself — the field IS the night the motes glow on and the cards float above
		   (scoped here, so it covers the viewport only where the stage renders it, not app-wide). */
		background: var(--ground, #0f1626);
	}
	/* 300% of the viewport (100% margin each side) so a few navigations of parallax drift don't reveal an
	   edge. (Sustained navigation needs world-space culling — Block 2.) transform-only, GPU-hinted. */
	.layer {
		position: absolute;
		inset: -100%;
		will-change: transform;
	}
	.mote {
		position: absolute;
		border-radius: 50%;
		/* warm-white core → pale-gold edge (edge channel varied per mote via --edge), soft glow. */
		background: radial-gradient(
			circle,
			rgba(255, 252, 244, 0.95),
			rgba(255, 244, var(--edge), 0.55) 55%,
			transparent 70%
		);
		opacity: var(--op);
		box-shadow: 0 0 4px 1px rgba(255, 246, 224, 0.45);
		animation: twinkle var(--tw-dur) ease-in-out var(--tw-delay) infinite;
	}
	/* LIFE AT REST — a slow opacity micro-drift, randomized phase per mote (never a unison pulse). */
	@keyframes twinkle {
		0%,
		100% {
			opacity: calc(var(--op) * 0.55);
		}
		50% {
			opacity: var(--op);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.mote {
			animation: none;
			opacity: var(--op);
		}
	}
</style>
