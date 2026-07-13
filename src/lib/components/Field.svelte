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
	const isLedger = $derived(active.kind === 'ledger');
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
		for (let d = -RULE_SPAN; d <= RULE_SPAN; d += 10) out.push({ year: d, alpha: 0.85 + ruleSeed() * 0.4, gap: ruleSeed() < 0.25 });
		return out;
	})();
	// screen-y of each decade line, docking the focus's exact year at DOCK_Y
	const decades = $derived(decadeSpecs.map((r) => ({ ...r, screenY: DOCK_Y + (Math.round(anchor.y / 10) * 10 + r.year - anchor.y) * PX_PER_YEAR })));

	// ── RED VERTICALS relative to the anchor seat (±0.3px seeded skew for the hand-traced hint) ──
	const vSeed = mulberry32(0x11ed);
	const vSpecs = (() => { const o: { seat: number; alpha: number; skew: number }[] = []; for (let s = -24; s <= 24; s += V_SEAT_STEP) o.push({ seat: s, alpha: 0.5 + vSeed() * 0.5, skew: (vSeed() - 0.5) * 0.6 }); return o; })();
	const verticals = $derived(vSpecs.map((v) => ({ ...v, screenX: DOCK_X + (Math.round(anchor.x) + v.seat - anchor.x) * PX_PER_SEAT })));

	// ── MOTES (fixed seeded positions; FLIP-drift on nav, settle back — no accumulation, revisit-clean) ──
	type Mote = { x: number; y: number; size: number; op: number; glow: number; twLo: number; twDur: number; twDelay: number; edge: number; radius: string };
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
	function makeMotes(seed: number, l: (typeof DARK_SKIN)[number]): Mote[] {
		const r = mulberry32(seed);
		return Array.from({ length: l.count }, () => {
			const size = l.sizeMin + r() * (l.sizeMax - l.sizeMin);
			const op = Math.min(1, l.op * (0.85 + r() * 0.3));
			const shape = r();
			return { x: r() * 100, y: r() * 100, size, op, glow: size * l.glowMul, twLo: op * l.twLo, twDur: l.twMin + r() * (l.twMax - l.twMin), twDelay: r() * 8, edge: 215 - r() * 55, radius: shape < 0.34 ? '50%' : shape < 0.67 ? '46% 54% 52% 48%' : '54% 46% 48% 52%' };
		});
	}
	const skinLayers = $derived(isLedger ? FOXING_SKIN : DARK_SKIN);
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
			const wdx = prev.x - a.x, wdy = prev.y - a.y; // world delta old→new
			prev = { x: a.x, y: a.y };
			if (prefersReducedMotion.current) return; // no drift — jump straight to the settled positions
			// jump to the OLD screen mapping (no transition) …
			dur = 0;
			flip = flip.map((_, i) => ({ x: wdx * PX_PER_SEAT * depthAt(i), y: wdy * PX_PER_YEAR * depthAt(i) }));
			// … then animate home on the flight clock (settle back-out for relative promotions).
			requestAnimationFrame(() => {
				dur = m?.duration ?? 360;
				easeName = m && m.kind === 'relative' ? 'cubic-bezier(0.34, 1.32, 0.64, 1)' : 'cubic-bezier(0.33, 1, 0.68, 1)';
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
	<div class="field" class:dark={active.kind === 'dark'} class:ledger={isLedger} aria-hidden="true">
		{#each MOTE_LAYERS as _meta, i (i)}
			<div class="layer" style:transform={`translate3d(${flip[i].x}px, ${flip[i].y}px, 0)`} style:transition={`transform ${dur}ms ${easeCss()}`}>
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
			<div class="layer rules" style:transform={`translate3d(${flip[3].x}px, ${flip[3].y}px, 0)`} style:transition={`transform ${dur}ms ${easeCss()}`}>
				{#each decades as r (r.year)}
					<div class="rule-h" class:gap={r.gap} style:top={`${r.screenY}px`} style:opacity={r.alpha}></div>
				{/each}
				{#each verticals as v (v.seat)}
					<div class="rule-v" style:left={`${v.screenX}px`} style:opacity={v.alpha} style:transform={`rotate(${v.skew}deg)`}></div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<button class="ground-toggle" type="button" title="Toggle field skin" aria-label={`Field skin: ${active.name} — click to change`} onclick={cycleGround}>
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
	.field.ledger .mote {
		background: radial-gradient(circle, rgba(150, 92, 58, 0.9), rgba(126, 78, 48, 0.55) 55%, transparent 74%);
		opacity: var(--op);
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
		background: repeating-linear-gradient(to right, rgba(96, 74, 52, 0.9) 0 60px, transparent 60px 74px);
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
