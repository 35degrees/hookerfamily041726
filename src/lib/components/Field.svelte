<script lang="ts">
	// Phase 3b — THE FIELD. A world behind the stage that COUNTER-DRIFTS on every camera move (parallax by
	// depth), on the SAME clock as the flight (§17 one-clock doctrine). Cards/chips live above at depth 0.
	// Skins: DARK (Midnight/Pine) = glowing gold motes; LEDGER = aged paper + decade rules + red verticals
	// + rust foxing (§18.7). LIGHT = no field (the pre-field render). Skin chosen by the corner toggle.
	import { onMount } from 'svelte';
	import { subscribeCameraMove, type CameraMove } from '$lib/state/camera';
	import { GROUNDS, groundState } from '$lib/state/ground.svelte';
	import { prefersReducedMotion } from 'svelte/motion';

	const active = $derived(GROUNDS[groundState.idx]);
	const showField = $derived(active.kind !== 'light');
	const isLedger = $derived(active.kind === 'ledger');
	function cycleGround() {
		groundState.idx = (groundState.idx + 1) % GROUNDS.length;
	}
	$effect(() => {
		if (typeof document === 'undefined') return;
		if (active.ground) document.documentElement.style.setProperty('--ground', active.ground);
		else document.documentElement.style.removeProperty('--ground');
	});

	// ── TASTE TOKENS — dial live (one-line edits) ───────────────────────────────────────────────────
	const PARALLAX_SIGN = 1; // world drifts with the hero's screenVector (child sits below → drifts up). Flip if inverted.
	const LAYER_META = [
		{ depth: 0.2, seed: 0x9e37 }, // far
		{ depth: 0.35, seed: 0x85eb }, // mid
		{ depth: 0.5, seed: 0xc2b2 } // near
	];
	type SkinLayer = { count: number; sizeMin: number; sizeMax: number; op: number; glowMul: number; twMin: number; twMax: number; twLo: number };
	// DARK motes: glowing warm-white→gold, size/brightness by depth, breathing twinkle.
	const DARK_SKIN: SkinLayer[] = [
		{ count: 45, sizeMin: 2, sizeMax: 3, op: 0.35, glowMul: 1.3, twMin: 6, twMax: 11, twLo: 0.75 },
		{ count: 40, sizeMin: 4, sizeMax: 6, op: 0.6, glowMul: 1.7, twMin: 7, twMax: 13, twLo: 0.62 },
		{ count: 20, sizeMin: 6, sizeMax: 10, op: 0.9, glowMul: 2.1, twMin: 9, twMax: 16, twLo: 0.5 }
	];
	// LEDGER foxing: sparse rust flecks, low alpha, NO glow, NO twinkle (paper doesn't blink).
	const FOXING_SKIN: SkinLayer[] = [
		{ count: 38, sizeMin: 2, sizeMax: 4, op: 0.1, glowMul: 0, twMin: 0, twMax: 0, twLo: 1 },
		{ count: 30, sizeMin: 3, sizeMax: 5, op: 0.14, glowMul: 0, twMin: 0, twMax: 0, twLo: 1 },
		{ count: 16, sizeMin: 4, sizeMax: 6, op: 0.18, glowMul: 0, twMin: 0, twMax: 0, twLo: 1 }
	];
	const RULE_DEPTH = 0.6; // rules ride near the card plane (drift more than the motes)
	const H_STEP = 3.2; // % of the (300%) rules layer between decade rules
	const V_STEP = 8; // % between red verticals (sparse — ~4 visible per viewport)
	// ────────────────────────────────────────────────────────────────────────────────────────────────

	function mulberry32(a: number) {
		return () => {
			a |= 0;
			a = (a + 0x6d2b79f5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	type Mote = { x: number; y: number; size: number; op: number; glow: number; twLo: number; twDur: number; twDelay: number; edge: number; radius: string };
	function makeMotes(seed: number, l: SkinLayer): Mote[] {
		const r = mulberry32(seed);
		return Array.from({ length: l.count }, () => {
			const size = l.sizeMin + r() * (l.sizeMax - l.sizeMin);
			const op = Math.min(1, l.op * (0.85 + r() * 0.3));
			const shape = r();
			return {
				x: r() * 100,
				y: r() * 100,
				size,
				op,
				glow: size * l.glowMul,
				twLo: op * l.twLo,
				twDur: l.twMin + r() * (l.twMax - l.twMin),
				twDelay: r() * 8,
				edge: 215 - r() * 55, // warm-white → pale-gold (dark)
				// foxing flecks aren't perfect circles — 2–3 irregular shapes from the seed
				radius: shape < 0.34 ? '50%' : shape < 0.67 ? '46% 54% 52% 48%' : '54% 46% 48% 52%'
			};
		});
	}
	const skinLayers = $derived(isLedger ? FOXING_SKIN : DARK_SKIN);
	const motes = $derived(LAYER_META.map((m, i) => makeMotes(m.seed, skinLayers[i])));

	// Ledger rules — deterministic positions across the 300% field (label-free; honest drift, no dock yet).
	const hRules = Array.from({ length: Math.floor(100 / H_STEP) + 1 }, (_, i) => +(H_STEP / 2 + i * H_STEP).toFixed(2)).filter((y) => y <= 100);
	const vRules = Array.from({ length: Math.floor(100 / V_STEP) + 1 }, (_, i) => +(V_STEP / 2 + i * V_STEP).toFixed(2)).filter((x) => x <= 100);

	// Parallax offsets: one per mote layer (their depths) + one for the rules layer (RULE_DEPTH).
	let offsets = $state(LAYER_META.map(() => ({ x: 0, y: 0 })));
	let ruleOffset = $state({ x: 0, y: 0 });
	let move = $state<CameraMove | null>(null);
	const easeCss = (name?: string) => (name === 'linear' ? 'linear' : 'cubic-bezier(0.33, 1, 0.68, 1)');
	const drift = (o: { x: number; y: number }, depth: number, m: CameraMove) => ({
		x: o.x + PARALLAX_SIGN * m.screenVector.dx * depth,
		y: o.y + PARALLAX_SIGN * m.screenVector.dy * depth
	});

	onMount(() => {
		const unsub = subscribeCameraMove((m) => {
			if (prefersReducedMotion.current) return;
			// SPOUSE DEAD-ZONE: a spouse swap is a lateral in-corner morph (the same person's spouses), not
			// travel THROUGH the world — so the field holds still. Only parent/child navigation drifts it.
			if (m.kind === 'spouse') return;
			move = m;
			offsets = offsets.map((o, i) => drift(o, LAYER_META[i].depth, m));
			ruleOffset = drift(ruleOffset, RULE_DEPTH, m);
		});
		return unsub;
	});
</script>

{#if showField}
	<div class="field" class:dark={active.kind === 'dark'} class:ledger={isLedger} aria-hidden="true">
		{#each LAYER_META as _meta, i (i)}
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
						style:border-radius={m.radius}
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
		{#if isLedger}
			<div
				class="layer rules"
				style:transform={`translate3d(${ruleOffset.x}px, ${ruleOffset.y}px, 0)`}
				style:transition={`transform ${move?.duration ?? 0}ms ${easeCss(move?.easing)}`}
			>
				{#each hRules as y (y)}<div class="rule-h" style:top={`${y}%`}></div>{/each}
				{#each vRules as x (x)}<div class="rule-v" style:left={`${x}%`}></div>{/each}
			</div>
		{/if}
	</div>
{/if}

<!-- Skin toggle (Sam's workbench control): cycles Light → Midnight → Pine → Ledger. Light = no field. -->
<button
	class="ground-toggle"
	type="button"
	title="Toggle field skin"
	aria-label={`Field skin: ${active.name} — click to change`}
	onclick={cycleGround}
>
	<span class="swatch" style:background={active.swatch}></span>
	{active.name}
</button>

<style>
	.field {
		position: fixed;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
	}
	.field.dark {
		background: var(--ground, #0f1626);
	}
	/* LEDGER — aged paper: base warm sheet + 3 huge soft mottle gradients (slightly darker warm, low
	   alpha, so it isn't flat) + a faint corner vignette. Quiet — the rules carry the motion. */
	.field.ledger {
		background:
			radial-gradient(120% 120% at 50% 42%, transparent 58%, rgba(60, 44, 22, 0.06) 100%),
			radial-gradient(60% 55% at 22% 26%, rgba(176, 156, 118, 0.16), transparent 70%),
			radial-gradient(55% 62% at 82% 66%, rgba(184, 164, 126, 0.13), transparent 72%),
			radial-gradient(70% 52% at 46% 94%, rgba(170, 150, 112, 0.15), transparent 72%),
			var(--ground, #ece3d2);
	}
	.layer {
		position: absolute;
		inset: -100%;
		will-change: transform;
	}
	.mote {
		position: absolute;
	}
	/* DARK motes — warm-white→gold core, size-scaled soft halo, breathing twinkle. */
	.field.dark .mote {
		background: radial-gradient(circle, rgba(255, 253, 247, 0.98), rgba(255, 246, var(--edge), 0.7) 55%, transparent 72%);
		box-shadow: 0 0 var(--glow) calc(var(--glow) / 3) rgba(255, 246, 224, 0.4);
		opacity: var(--op);
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
	/* LEDGER foxing — rust-brown flecks, low alpha, NO glow, NO twinkle (paper doesn't blink). */
	.field.ledger .mote {
		background: radial-gradient(circle, rgba(150, 92, 58, 0.9), rgba(126, 78, 48, 0.55) 55%, transparent 74%);
		opacity: var(--op);
	}
	/* LEDGER rules — horizontal ink-brown decade rules + sparse red verticals; FIELD layers, so they
	   parallax on the camera clock (not a static background-image). Label-free for now; docking is §18.6. */
	.rule-h {
		position: absolute;
		left: 0;
		right: 0;
		height: 1px;
		background: rgba(90, 70, 50, 0.14);
	}
	.rule-v {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background: rgba(160, 60, 50, 0.16);
	}
	@media (prefers-reduced-motion: reduce) {
		.field.dark .mote {
			animation: none;
			opacity: var(--op);
		}
	}

	/* the skin toggle — small, low-key, bottom-right, above the stage; outside the pointer-events:none
	   .field so it's clickable. Readable on both dark and paper grounds. */
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
		background: rgba(20, 28, 46, 0.6);
		border: 1px solid rgba(255, 250, 240, 0.18);
		border-radius: 999px;
		cursor: pointer;
		backdrop-filter: blur(6px);
		transition:
			background 150ms ease,
			border-color 150ms ease;
	}
	.ground-toggle:hover {
		background: rgba(30, 40, 62, 0.75);
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
