<script lang="ts">
	// Phase 3b Block 1 — THE FIELD. A midnight world behind the stage: depth-differentiated luminous
	// motes ("fairy lights") that COUNTER-DRIFT on every camera move (parallax by depth), on the SAME
	// clock as the flight (§17 one-clock doctrine). Cards/chips live above at depth 0 and never parallax.
	import { onMount } from 'svelte';
	import { subscribeCameraMove, type CameraMove } from '$lib/state/camera';
	import { GROUNDS, groundState } from '$lib/state/ground.svelte';
	import { prefersReducedMotion } from 'svelte/motion';

	// ─────────────────────────────────────────────────────────────────────────────────────────────
	//  TASTE TOKENS — dial these live (all one-line edits). The ground token lives in layout.css :root.
	//  DEPTH MUST READ AT A GLANCE: near = big/bright/haloed, far = small/dim — two obviously different
	//  populations, so the differential drift reads as parallax, not noise.
	// ─────────────────────────────────────────────────────────────────────────────────────────────
	type Layer = {
		depth: number; // parallax factor (× screenVector)
		count: number; // motes in this layer
		sizeMin: number;
		sizeMax: number; // px
		op: number; // base brightness (opacity)
		glowMul: number; // halo px = size × glowMul
		twMin: number;
		twMax: number; // twinkle period (s)
		twLo: number; // twinkle dips to op × twLo (deeper on near)
		seed: number;
	};
	const LAYERS: Layer[] = [
		{ depth: 0.2, count: 45, sizeMin: 2, sizeMax: 3, op: 0.35, glowMul: 1.3, twMin: 6, twMax: 11, twLo: 0.75, seed: 0x9e37 }, // far: small, dim
		{ depth: 0.35, count: 40, sizeMin: 4, sizeMax: 6, op: 0.6, glowMul: 1.7, twMin: 7, twMax: 13, twLo: 0.62, seed: 0x85eb }, // mid
		{ depth: 0.5, count: 20, sizeMin: 6, sizeMax: 10, op: 0.9, glowMul: 2.1, twMin: 9, twMax: 16, twLo: 0.5, seed: 0xc2b2 } // near: big, bright, haloed
	];
	// The world drifts WITH the hero's screenVector (which points opposite the focus shift): a child sits
	// below → hero travels up → world drifts up. One flag — flip to -1 if the feel reads inverted.
	const PARALLAX_SIGN = 1;
	// ─────────────────────────────────────────────────────────────────────────────────────────────

	// Deterministic PRNG (mulberry32) — stable pattern, no Math.random hydrate flicker. (World-space
	// seeding on table coords — stable per region + culling — is Block 2.)
	function mulberry32(a: number) {
		return () => {
			a |= 0;
			a = (a + 0x6d2b79f5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	type Mote = { x: number; y: number; size: number; op: number; glow: number; twLo: number; twDur: number; twDelay: number; edge: number };
	function makeMotes(l: Layer): Mote[] {
		const r = mulberry32(l.seed);
		return Array.from({ length: l.count }, () => {
			const size = l.sizeMin + r() * (l.sizeMax - l.sizeMin);
			const op = Math.min(1, l.op * (0.85 + r() * 0.3));
			return {
				x: r() * 100, // % across the oversized (300%) layer
				y: r() * 100,
				size,
				op,
				glow: size * l.glowMul, // halo px
				twLo: op * l.twLo, // twinkle low point
				twDur: l.twMin + r() * (l.twMax - l.twMin),
				twDelay: r() * 8, // randomized phase — never a unison pulse
				edge: 215 - r() * 55 // warm-white → pale-gold (blue channel of the halo edge)
			};
		});
	}
	const motes = LAYERS.map(makeMotes);

	// Accumulated per-layer offset (px). Each camera move adds PARALLAX_SIGN·screenVector·depth.
	let offsets = $state(LAYERS.map(() => ({ x: 0, y: 0 })));
	let move = $state<CameraMove | null>(null); // latest move — drives the transition duration/easing
	const easeCss = (name?: string) => (name === 'linear' ? 'linear' : 'cubic-bezier(0.33, 1, 0.68, 1)');

	// Ground choice lives in module state (persists across navigations, resets on reload). LIGHT (idx 0,
	// value null) means NO field mounts — the pre-field approved render. isDark gates the whole field.
	const active = $derived(GROUNDS[groundState.idx]);
	const isDark = $derived(active.value !== null);
	function cycleGround() {
		groundState.idx = (groundState.idx + 1) % GROUNDS.length;
	}
	// Write / clear the --ground token on :root reactively as the choice changes.
	$effect(() => {
		if (typeof document === 'undefined') return;
		if (active.value) document.documentElement.style.setProperty('--ground', active.value);
		else document.documentElement.style.removeProperty('--ground');
	});

	onMount(() => {
		// Drift ON the published move (same clock as the flight). Reduced motion: no drift (twinkle is
		// also killed by the media query below) — the field stays static.
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

{#if isDark}
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
					style:--glow={`${m.glow}px`}
					style:--tw-lo={m.twLo}
					style:--tw-dur={`${m.twDur}s`}
					style:--tw-delay={`${m.twDelay}s`}
					style:--edge={m.edge}
				></span>
			{/each}
			</div>
		{/each}
	</div>
{/if}

<!-- Ground toggle (Sam's workbench control): cycles Light → Midnight → Pine. Light = no field. -->
<button
	class="ground-toggle"
	type="button"
	title="Toggle field ground"
	aria-label={`Field ground: ${active.name} — click to change`}
	onclick={cycleGround}
>
	<span class="swatch" style:background={active.swatch}></span>
	{active.name}
</button>

<style>
	/* z:0 fixed; the stage (.page-container) sits at z:1 above it. The field IS the midnight ground the
	   motes glow on and the cards float above. pointer-events none — scenery, never interactive. */
	.field {
		position: fixed;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
		background: var(--ground, #0f1626);
	}
	/* 300% of the viewport (100% margin each side) so a few navigations of parallax don't reveal an edge.
	   (Sustained navigation needs world-space culling — Block 2.) transform-only, GPU-hinted. */
	.layer {
		position: absolute;
		inset: -100%;
		will-change: transform;
	}
	.mote {
		position: absolute;
		border-radius: 50%;
		/* warm-white core → pale-gold edge (edge channel per mote), plus a size-scaled soft halo. */
		background: radial-gradient(
			circle,
			rgba(255, 253, 247, 0.98),
			rgba(255, 246, var(--edge), 0.7) 55%,
			transparent 72%
		);
		box-shadow: 0 0 var(--glow) calc(var(--glow) / 3) rgba(255, 246, 220, 0.4);
		opacity: var(--op);
		/* LIFE AT REST — slow breathing glow, randomized phase; deeper/slower on the big near motes. */
		animation: twinkle var(--tw-dur) ease-in-out var(--tw-delay) infinite;
	}
	@keyframes twinkle {
		0%,
		100% {
			opacity: var(--tw-lo);
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

	/* the ground toggle — small, low-key, bottom-right, above the stage. Not part of the scenery, so it
	   sits outside .field (which is pointer-events:none) and takes pointer events itself. */
	.ground-toggle {
		position: fixed;
		right: 16px;
		bottom: 16px;
		z-index: 10;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 6px 11px 6px 8px;
		font: 500 12px/1 var(--font-inter, sans-serif);
		color: rgba(255, 250, 240, 0.85);
		background: rgba(20, 28, 46, 0.55);
		border: 1px solid rgba(255, 250, 240, 0.18);
		border-radius: 999px;
		cursor: pointer;
		backdrop-filter: blur(6px);
		transition:
			background 150ms ease,
			border-color 150ms ease;
	}
	.ground-toggle:hover {
		background: rgba(30, 40, 62, 0.72);
		border-color: rgba(255, 250, 240, 0.32);
	}
	.ground-toggle .swatch {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1px solid rgba(255, 250, 240, 0.35);
	}
	@media (prefers-reduced-motion: reduce) {
		.ground-toggle {
			transition: none;
		}
	}
</style>
