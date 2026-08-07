<script lang="ts">
	// Phase 3b — THE FIELD, world-anchored (§18.6/§18.7). The paper's DECADE RULES are drawn RELATIVE to
	// the featured person's world coords (t.y = birth year, t.x = seat), so the featured person's line
	// DOCKS at a fixed screen spot and REVISITING a person shows the rules in identical positions — no
	// accumulated offset, ever. Navigation animates the layer from the OLD person's mapping to the NEW
	// (a FLIP) on the flight clock incl. the settle curve — the drift IS the seek ("sliding on paper").
	// Only the featured person docks; chips are annotations over the paper, never plotted points.
	// Skins: DARK (gold motes) | LEDGER (paper + rules + red verticals + rust foxing) | LIGHT (no field).
	import { onMount, untrack } from 'svelte';
	import { subscribeCameraMove, getCameraMove, type CameraMove } from '$lib/state/camera';
	import { GROUNDS, groundState } from '$lib/state/ground.svelte';
	import { featured } from '$lib/state/featured.svelte';
	import { prefersReducedMotion } from 'svelte/motion';

	const active = $derived(GROUNDS[groundState.idx]);
	const showField = $derived(active.kind !== 'light');
	const isLedger = $derived(active.kind === 'ledger'); // rules only on the ledger
	const isPaper = $derived(active.kind === 'paper'); // aged paper: sepia + rich foxing, no rules
	// PARCHMENT is the one skin with NO motes at all — the grain is a procedural texture on the ground
	// itself, not scattered particles, so the mote layers below are skipped entirely for it.
	const isParchment = $derived(active.kind === 'parchment');
	function cycleGround() {
		groundState.idx = (groundState.idx + 1) % GROUNDS.length;
	}
	$effect(() => {
		if (typeof document === 'undefined') return;
		if (active.ground) document.documentElement.style.setProperty('--ground', active.ground);
		else document.documentElement.style.removeProperty('--ground');
	});

	// ── TASTE TOKENS — dial live ─────────────────────────────────────────────────────────────────────
	let PX_PER_YEAR = $state(10.5); // px per year — measured from the card-fly-per-generation ÷ 28 on mount (dial)
	const PX_PER_SEAT = 46; // px per world seat (x); only the featured seat matters (chips aren't plotted)
	let DOCK_Y = $state(300); // screen-y the featured person's birth-year sits at (under the card header)
	const DOCK_X = 720; // screen-x the featured person's seat sits at (viewport centre-ish)
	const RULE_DEPTH = 1; // rules/verticals ride the card plane — the paper scrolls ≈ the card flies
	const MOTE_LAYERS = [
		{ depth: 0.2, seed: 0x9e37 }, // far
		{ depth: 0.35, seed: 0x85eb }, // mid
		{ depth: 0.5, seed: 0xc2b2 } // near
	];
	const V_SEAT_STEP = 4; // a red vertical every N world seats
	// ─────────────────────────────────────────────────────────────────────────────────────────────────

	function mulberry32(a: number) {
		return () => {
			a |= 0;
			a = (a + 0x6d2b79f5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	// ── the anchor: the featured person's world coords (y may be null → hold the last valid year) ──
	let lastY = 1900;
	const anchor = $derived.by(() => {
		const t = featured.current?.neighborhood?.focus?.t;
		const y = t?.y ?? null;
		if (y != null) lastY = y;
		return { x: t?.x ?? 0, y: y ?? lastY };
	});

	// ── DECADE RULES rendered RELATIVE to the anchor year (scroll-and-stay; revisit-identical) ──
	// One rule per decade across ±SPAN years of the focus; seeded ink character per rule (alpha jitter,
	// occasional gap) so it reads hand-printed, not laser-ruled.
	const RULE_SPAN = 110; // years each side — covers the viewport at any px-per-year
	const ruleSeed = mulberry32(0x5eed);
	type Rule = { year: number; alpha: number; gap: boolean };
	const decadeSpecs: Rule[] = (() => {
		const out: Rule[] = [];
		for (let d = -RULE_SPAN; d <= RULE_SPAN; d += 10)
			out.push({ year: d, alpha: 0.85 + ruleSeed() * 0.4, gap: ruleSeed() < 0.25 });
		return out;
	})();
	// screen-y of each decade line, docking the focus's exact year at DOCK_Y
	const decades = $derived(
		decadeSpecs.map((r) => ({
			...r,
			screenY: DOCK_Y + (Math.round(anchor.y / 10) * 10 + r.year - anchor.y) * PX_PER_YEAR
		}))
	);

	// ── RED VERTICALS relative to the anchor seat (±0.3px seeded skew for the hand-traced hint) ──
	const vSeed = mulberry32(0x11ed);
	const vSpecs = (() => {
		const o: { seat: number; alpha: number; skew: number }[] = [];
		for (let s = -24; s <= 24; s += V_SEAT_STEP)
			o.push({ seat: s, alpha: 0.5 + vSeed() * 0.5, skew: (vSeed() - 0.5) * 0.6 });
		return o;
	})();
	const verticals = $derived(
		vSpecs.map((v) => ({
			...v,
			screenX: DOCK_X + (Math.round(anchor.x) + v.seat - anchor.x) * PX_PER_SEAT
		}))
	);

	// ── MOTES (fixed seeded positions; FLIP-drift on nav, settle back — no accumulation, revisit-clean) ──
	type Mote = {
		x: number;
		y: number;
		size: number;
		op: number;
		glow: number;
		twLo: number;
		twDur: number;
		twDelay: number;
		edge: number;
		radius: string;
	};
	const DARK_SKIN = [
		{ count: 45, sizeMin: 2, sizeMax: 3, op: 0.35, glowMul: 1.3, twMin: 6, twMax: 11, twLo: 0.75 },
		{ count: 40, sizeMin: 4, sizeMax: 6, op: 0.6, glowMul: 1.7, twMin: 7, twMax: 13, twLo: 0.62 },
		{ count: 20, sizeMin: 6, sizeMax: 10, op: 0.9, glowMul: 2.1, twMin: 9, twMax: 16, twLo: 0.5 }
	];
	const FOXING_SKIN = [
		{ count: 38, sizeMin: 2, sizeMax: 4, op: 0.1, glowMul: 0, twMin: 0, twMax: 0, twLo: 1 },
		{ count: 30, sizeMin: 3, sizeMax: 5, op: 0.14, glowMul: 0, twMin: 0, twMax: 0, twLo: 1 },
		{ count: 16, sizeMin: 4, sizeMax: 6, op: 0.18, glowMul: 0, twMin: 0, twMax: 0, twLo: 1 }
	];
	// AGED PAPER foxing — richer & more authentic: dense fine specks + a scatter of larger soft diffuse
	// blotches, warm rust, varied alpha. Real foxing clusters and varies in size/intensity.
	const FOXING_PAPER = [
		{ count: 70, sizeMin: 1.5, sizeMax: 4, op: 0.12, glowMul: 0, twMin: 0, twMax: 0, twLo: 1 }, // fine specks
		{ count: 44, sizeMin: 4, sizeMax: 9, op: 0.16, glowMul: 0, twMin: 0, twMax: 0, twLo: 1 }, // medium spots
		{ count: 20, sizeMin: 9, sizeMax: 20, op: 0.13, glowMul: 0, twMin: 0, twMax: 0, twLo: 1 } // large soft blotches
	];
	function makeMotes(seed: number, l: (typeof DARK_SKIN)[number]): Mote[] {
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
				edge: 215 - r() * 55,
				radius: shape < 0.34 ? '50%' : shape < 0.67 ? '46% 54% 52% 48%' : '54% 46% 48% 52%'
			};
		});
	}
	const skinLayers = $derived(isPaper ? FOXING_PAPER : isLedger ? FOXING_SKIN : DARK_SKIN);
	const motes = $derived(MOTE_LAYERS.map((m, i) => makeMotes(m.seed, skinLayers[i])));

	// ── the FLIP: on an anchor change, jump each layer to the OLD person's mapping then animate to 0 on
	// the flight clock. Rules/verticals ride RULE_DEPTH; motes their own depths. Settle-active relative
	// promotions use a back-out easing so the paper carries past and pulls back with the card's landing. ──
	let flip = $state([...MOTE_LAYERS.map(() => ({ x: 0, y: 0 })), { x: 0, y: 0 }]); // [far, mid, near, rules]
	let dur = $state(0);
	let easeName = $state('cubic-bezier(0.33, 1, 0.68, 1)');
	const depthAt = (i: number) => (i < MOTE_LAYERS.length ? MOTE_LAYERS[i].depth : RULE_DEPTH);
	let prev = { x: 0, y: lastY };
	$effect(() => {
		const a = anchor;
		untrack(() => {
			if (a.x === prev.x && a.y === prev.y) return;
			const m: CameraMove | null = getCameraMove();
			const wdx = prev.x - a.x,
				wdy = prev.y - a.y; // world delta old→new
			prev = { x: a.x, y: a.y };
			if (prefersReducedMotion.current) return; // no drift — jump straight to the settled positions
			// jump to the OLD screen mapping (no transition) …
			dur = 0;
			flip = flip.map((_, i) => ({
				x: wdx * PX_PER_SEAT * depthAt(i),
				y: wdy * PX_PER_YEAR * depthAt(i)
			}));
			// … then animate home on the flight clock (settle back-out for relative promotions).
			requestAnimationFrame(() => {
				dur = m?.duration ?? 360;
				easeName =
					m && m.kind === 'relative'
						? 'cubic-bezier(0.34, 1.32, 0.64, 1)'
						: 'cubic-bezier(0.33, 1, 0.68, 1)';
				flip = flip.map(() => ({ x: 0, y: 0 }));
			});
		});
	});

	onMount(() => {
		// PX_PER_YEAR ≈ the screen distance a card flies for one generation ÷ 28 years (Sam's scale). Dock
		// the year under the card header. Measured from the live layout; falls back to the token defaults.
		const fs = document.querySelector('.featured-slot')?.getBoundingClientRect();
		if (fs && fs.top > 0) DOCK_Y = Math.round(fs.top + 40); // dock the year under the card header
		// PX_PER_YEAR stays at the 10.5 default (Sam's ~10-11 target) — a live dial, not auto-measured
		// (the raw parents→slot gap measured lower; his stated scale wins).
		// warm the anchor baseline so the first real navigation FLIPs from the right place
		const t = featured.current?.neighborhood?.focus?.t;
		prev = { x: t?.x ?? 0, y: t?.y ?? lastY };
		const unsub = subscribeCameraMove(() => {}); // keep the store warm (anchor drives the FLIP)
		return unsub;
	});
	const easeCss = () => easeName;
</script>

{#if showField}
	<div
		class="field"
		class:dark={active.kind === 'dark'}
		class:ledger={isLedger}
		class:paper={isPaper}
		class:parchment={isParchment}
		aria-hidden="true"
	>
		{#if !isParchment}
			{#each MOTE_LAYERS as _meta, i (i)}
				<div
					class="layer"
					style:transform={`translate3d(${flip[i].x}px, ${flip[i].y}px, 0)`}
					style:transition={`transform ${dur}ms ${easeCss()}`}
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
		{/if}
		{#if isLedger}
			<div
				class="layer rules"
				style:transform={`translate3d(${flip[3].x}px, ${flip[3].y}px, 0)`}
				style:transition={`transform ${dur}ms ${easeCss()}`}
			>
				{#each decades as r (r.year)}
					<div
						class="rule-h"
						class:gap={r.gap}
						style:top={`${r.screenY}px`}
						style:opacity={r.alpha}
					></div>
				{/each}
				{#each verticals as v (v.seat)}
					<div
						class="rule-v"
						style:left={`${v.screenX}px`}
						style:opacity={v.alpha}
						style:transform={`rotate(${v.skew}deg)`}
					></div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

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
	.field.ledger {
		background:
			radial-gradient(120% 120% at 50% 42%, transparent 58%, rgba(60, 44, 22, 0.06) 100%),
			radial-gradient(60% 55% at 22% 26%, rgba(176, 156, 118, 0.16), transparent 70%),
			radial-gradient(55% 62% at 82% 66%, rgba(184, 164, 126, 0.13), transparent 72%),
			radial-gradient(70% 52% at 46% 94%, rgba(170, 150, 112, 0.15), transparent 72%),
			var(--ground, #ece3d2);
	}
	/* AGED PAPER — warmer/more-worn sepia: stronger uneven mottle (aging stains) + a deeper corner
	   vignette (browned edges), so it reads as a genuinely old sheet. The foxing does the rest. */
	.field.paper {
		background:
			radial-gradient(130% 130% at 50% 40%, transparent 46%, rgba(74, 50, 20, 0.14) 100%),
			radial-gradient(50% 48% at 18% 22%, rgba(150, 118, 72, 0.22), transparent 68%),
			radial-gradient(46% 54% at 84% 30%, rgba(138, 106, 60, 0.18), transparent 70%),
			radial-gradient(58% 50% at 72% 82%, rgba(160, 128, 80, 0.2), transparent 70%),
			radial-gradient(52% 46% at 30% 88%, rgba(146, 112, 66, 0.19), transparent 72%),
			var(--ground, #e0cfa9);
	}
	/* PARCHMENT — a warm cream sheet with fine speckle, and nothing else. No mottle, no vignette, no
	   foxing: the reference is a clean paper stock, not an aged document, and every extra layer read as
	   dirt on it. It is also the LIGHTEST ground in the set by a distance — Ledger and Aged Paper are
	   15–25% darker, which is why neither had ever beaten plain Light.

	   THE GRAIN IS PROCEDURAL, not an image: an feTurbulence tile costs no network request, cannot tile
	   visibly, stays sharp at any zoom or DPR, and adds no binary to a repo whose history is already
	   heavy with them. It is the grain this app already uses — Field's motes and foxing come from a
	   seeded mulberry32 for the same reasons.

	   THE FILTER CHAIN, in order, because each step is load-bearing:
	     1. feTurbulence          fractalNoise, stitchTiles so the 220px tile has no seam.
	     2. feComponentTransfer   forces ALPHA opaque. Turbulence produces noisy alpha as well as noisy
	                              colour; without this every later step reads PREMULTIPLIED colour, the
	                              mean lands wherever the alpha noise puts it, and the base colour drifts
	                              (measured: #f6f4e6 at lum 243 instead of #ebe6c9 at 229).
	     3. feColorMatrix         saturate 0 — monochrome grain, no colour speckle.
	     4. feColorMatrix         maps the noise into base ± GRAIN_K. The base is baked in here rather
	                              than sitting underneath as a background-color, so NO blend mode is
	                              involved. `overlay` was tried first and cannot reach this amplitude —
	                              it compresses variation near a light base and caps out around σ 2.3
	                              while pushing luminance the wrong way.
	     color-interpolation-filters="sRGB" keeps the maths in the space the colour was sampled in.

	   TWO DIALS, both measured against the reference rather than chosen:
	     baseFrequency 0.8  grain SIZE (higher = finer)
	     k 0.33             grain AMOUNT. sigma is linear in k (2.29 at 0.10, 6.84 at 0.30, 9.09 at
	                        0.40), and the reference measured 7.52. */
	.field.parchment {
		background-color: var(--ground, #ebe6c9);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g' x='0' y='0' width='100%25' height='100%25' color-interpolation-filters='sRGB'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch' result='t'/%3E%3CfeComponentTransfer in='t' result='o'%3E%3CfeFuncA type='linear' slope='0' intercept='1'/%3E%3C/feComponentTransfer%3E%3CfeColorMatrix in='o' type='saturate' values='0' result='s'/%3E%3CfeColorMatrix in='s' type='matrix' values='0.33 0 0 0 0.7565 0.33 0 0 0 0.7369 0.33 0 0 0 0.6231 0 0 0 0 1'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
		background-repeat: repeat;
		background-size: 220px 220px;
	}

	.layer {
		position: absolute;
		inset: -100%;
		will-change: transform;
	}
	/* rules layer isn't the wrapping 300% field — it's viewport-anchored so screen-y/x place lines exactly */
	.layer.rules {
		inset: 0;
	}
	.mote {
		position: absolute;
	}
	.field.dark .mote {
		background: radial-gradient(
			circle,
			rgba(255, 253, 247, 0.98),
			rgba(255, 246, var(--edge), 0.7) 55%,
			transparent 72%
		);
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
	.field.ledger .mote,
	.field.paper .mote {
		/* rust foxing — warm reddish-brown, soft-edged; the larger paper blotches read as diffuse stains. */
		background: radial-gradient(
			circle,
			rgba(150, 92, 58, 0.9),
			rgba(126, 78, 48, 0.5) 52%,
			transparent 76%
		);
		opacity: var(--op);
	}
	/* the aged-paper large blotches are extra-diffuse (foxing bleeds into the fibre) */
	.field.paper .mote {
		background: radial-gradient(
			circle,
			rgba(146, 88, 54, 0.82),
			rgba(120, 74, 46, 0.42) 48%,
			transparent 78%
		);
	}
	/* PRESENCE + INK: decade rules thicker/warmer; a subtle dashed break on ~1-in-4 (ink gap). */
	.rule-h {
		position: absolute;
		left: 0;
		right: 0;
		height: 1.6px;
		background: rgba(96, 74, 52, 0.9);
	}
	.rule-h.gap {
		background: repeating-linear-gradient(
			to right,
			rgba(96, 74, 52, 0.9) 0 60px,
			transparent 60px 74px
		);
	}
	.rule-v {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		background: rgba(165, 62, 52, 0.9);
		transform-origin: center;
	}
	@media (prefers-reduced-motion: reduce) {
		.field.dark .mote {
			animation: none;
			opacity: var(--op);
		}
	}

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
	}
	.ground-toggle:hover {
		background: rgba(30, 40, 62, 0.75);
	}
	.ground-toggle .swatch {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1px solid rgba(255, 250, 240, 0.35);
	}
</style>
