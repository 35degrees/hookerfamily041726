<!--
  Passage.svelte — THE PASSAGE LAYER (Phase 3b, §4 flyover-lite). Transient, flight-only scenery: on a
  CC arrival that spans a real stretch of years, faint DECADE MARKERS ("1690") rush across the screen
  OPPOSITE the card's travel — scenery from a train window — then are gone at landing. Nothing at rest.

  Data-free: the years come from the from.y → to.y span alone (every decade crossed, capped). Timing is
  the SAME passageMsFor() the flight's beat-delay uses, so the decades rush precisely while the new card
  waits offscreen. Reduced-motion: renders nothing.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { subscribeCameraMove, type CameraMove } from '$lib/state/camera';
	import { ccScreenDirFor, passageMsFor } from '$lib/transitions/flight';
	import { GROUNDS, groundState } from '$lib/state/ground.svelte';

	// Pale scenery on the dark/ledger grounds, muted ink on the light/paper ones — the decades read as
	// atmosphere on either, never as holes.
	const ink = $derived(
		['dark', 'ledger'].includes(GROUNDS[groundState.idx]?.kind) ? 'rgba(214,211,209,0.7)' : 'rgba(120,113,108,0.85)'
	);

	type Marker = { key: string; year: number; fx: number; fy: number; tx: number; ty: number; px: number; py: number; delay: number; dur: number };

	let markers = $state<Marker[]>([]);
	let clearTimer: ReturnType<typeof setTimeout> | null = null;

	const MAX_MARKERS = 8;
	const D = 900; // px each marker travels — offscreen → offscreen
	const GAP = 116; // perpendicular spacing between markers

	function decadesBetween(a: number, b: number): number[] {
		const lo = Math.min(a, b),
			hi = Math.max(a, b);
		const out: number[] = [];
		for (let d = Math.ceil(lo / 10) * 10; d <= hi; d += 10) out.push(d);
		return out;
	}

	onMount(() => {
		const un = subscribeCameraMove((m: CameraMove) => {
			if (m.kind !== 'cc' || prefersReducedMotion.current) return;
			const pm = passageMsFor(m);
			if (pm <= 0 || m.from?.y == null || m.to?.y == null) {
				markers = [];
				return;
			}
			const dir = ccScreenDirFor(m); // points at the offscreen START; the card travels −dir into the slot
			const perp = { x: -dir.y, y: dir.x }; // markers spread along this; they RUSH in +dir (opposite travel)
			let decs = decadesBetween(m.from.y, m.to.y);
			if (decs.length > MAX_MARKERS) {
				const step = decs.length / MAX_MARKERS;
				decs = Array.from({ length: MAX_MARKERS }, (_, i) => decs[Math.floor(i * step)]);
			}
			const n = decs.length;
			markers = decs.map((year, i) => {
				const spread = (i - (n - 1) / 2) * GAP;
				return {
					key: `${m.seq}-${year}-${i}`,
					year,
					fx: -dir.x * D,
					fy: -dir.y * D,
					tx: dir.x * D,
					ty: dir.y * D,
					px: perp.x * spread,
					py: perp.y * spread,
					delay: (i / Math.max(1, n)) * pm * 0.55,
					dur: pm * 1.15
				};
			});
			if (clearTimer) clearTimeout(clearTimer);
			clearTimer = setTimeout(() => {
				markers = [];
			}, pm * 1.7 + 300);
		});
		return () => {
			un();
			if (clearTimer) clearTimeout(clearTimer);
		};
	});
</script>

{#if markers.length}
	<div class="passage" aria-hidden="true" style="--passage-ink:{ink};">
		{#each markers as mk (mk.key)}
			<span
				class="marker"
				style="--fx:{mk.fx}px; --fy:{mk.fy}px; --tx:{mk.tx}px; --ty:{mk.ty}px; left:calc(50vw + {mk.px}px); top:calc(50vh + {mk.py}px); animation-delay:{mk.delay}ms; animation-duration:{mk.dur}ms;"
				>{mk.year}</span
			>
		{/each}
	</div>
{/if}

<style>
	.passage {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0; /* behind the cards (page-container z:1), above the field ground */
		overflow: hidden;
	}
	.marker {
		position: absolute;
		font-variant-numeric: tabular-nums;
		font-size: 0.95rem;
		font-weight: 500;
		letter-spacing: 0.18em;
		color: var(--passage-ink, rgba(120, 113, 108, 0.85));
		opacity: 0;
		white-space: nowrap;
		animation-name: passage-rush;
		animation-timing-function: cubic-bezier(0.33, 0, 0.2, 1);
		animation-fill-mode: both;
		will-change: transform, opacity;
	}
	@keyframes passage-rush {
		0% {
			transform: translate(var(--fx), var(--fy));
			opacity: 0;
		}
		18% {
			opacity: 0.2;
		}
		82% {
			opacity: 0.2;
		}
		100% {
			transform: translate(var(--tx), var(--ty));
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.passage {
			display: none;
		}
	}
</style>
