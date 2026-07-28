<!--
  /table — ZOOM 2: the standalone, hand-panned table view. Inert tiles at their TRUE table-index seats
  (one seat per person), the real family tree you can pan around. Camera-store-driven (tableCamera) so the
  parked altitude arc can later publish fly-to moves to the same store. v1 = pan only (no pinch/zoom).

  Performance contract: ONE transform on the container; tiles are transform/opacity only; viewport culling
  via spatial buckets keeps the live DOM node count in the low hundreds even on a fast fling.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { tableCamera } from '$lib/state/tableCamera.svelte';

	type Row = {
		id: string;
		n: string;
		by: number | null;
		dy: number | null;
		/** dates are PRIVATE (living, non-notable) — the seat still uses y, the tile shows no lifespan. */
		pv?: boolean;
		hd: boolean;
		td: boolean;
		x: number;
		y: number;
	};

	// ── dials ──────────────────────────────────────────────────────────────────────────────────────
	const PX_X = 46; // px per seat unit at scale 1 (spreads siblings so names fit)
	const PX_Y = 2.6; // px per year at scale 1 (compresses the ~440-year span to ~one screen tall)
	const BUCKET_X = 100; // spatial-bucket size, seats
	const BUCKET_Y = 25; // spatial-bucket size, years
	const CULL_MARGIN = 220; // px beyond the viewport still rendered (avoids pop-in at the edges)
	const NODE_CAP = 500; // hard ceiling on live tiles (sampled down if a sparse region somehow exceeds it)

	let vw = $state(1200);
	let vh = $state(800);
	let ready = $state(false);
	// buckets: "bx,by" -> rows. Built once from the index; never mutated during pan.
	let buckets = new Map<string, Row[]>();

	const region = (r: Row) => (r.hd ? 'spine' : r.td ? 'grove' : 'orbit');

	onMount(() => {
		vw = window.innerWidth;
		vh = window.innerHeight;
		const onResize = () => {
			vw = window.innerWidth;
			vh = window.innerHeight;
		};
		window.addEventListener('resize', onResize);

		(async () => {
			let rows: Row[] = [];
			try {
				const res = await fetch('/data/table-index.json');
				rows = await res.json();
			} catch {
				rows = [];
			}
			for (const r of rows) {
				if (r.y == null || r.x == null || !r.n) continue;
				const key = `${Math.floor(r.x / BUCKET_X)},${Math.floor(r.y / BUCKET_Y)}`;
				let b = buckets.get(key);
				if (!b) buckets.set(key, (b = []));
				b.push(r);
			}
			ready = true;
		})();

		return () => window.removeEventListener('resize', onResize);
	});

	// The visible tile set — recomputed whenever the camera or viewport changes. Only the buckets the
	// viewport (+ margin) overlaps are visited, so this is bounded regardless of table size.
	const visible = $derived.by(() => {
		if (!ready) return [] as Row[];
		const { cx, cy, scale } = tableCamera;
		const halfW = (vw / 2 + CULL_MARGIN) / (PX_X * scale);
		const halfH = (vh / 2 + CULL_MARGIN) / (PX_Y * scale);
		const xLo = cx - halfW,
			xHi = cx + halfW,
			yLo = cy - halfH,
			yHi = cy + halfH;
		const bxLo = Math.floor(xLo / BUCKET_X),
			bxHi = Math.floor(xHi / BUCKET_X);
		const byLo = Math.floor(yLo / BUCKET_Y),
			byHi = Math.floor(yHi / BUCKET_Y);
		const out: Row[] = [];
		for (let bx = bxLo; bx <= bxHi; bx++)
			for (let by = byLo; by <= byHi; by++) {
				const b = buckets.get(`${bx},${by}`);
				if (!b) continue;
				for (const r of b) if (r.x >= xLo && r.x <= xHi && r.y >= yLo && r.y <= yHi) out.push(r);
			}
		if (out.length > NODE_CAP) {
			const step = out.length / NODE_CAP;
			return Array.from({ length: NODE_CAP }, (_, i) => out[Math.floor(i * step)]);
		}
		return out;
	});

	// ONE transform on the container: the world point (cx, cy) maps to the viewport centre.
	const tx = $derived(vw / 2 - tableCamera.cx * PX_X * tableCamera.scale);
	const ty = $derived(vh / 2 - tableCamera.cy * PX_Y * tableCamera.scale);

	// ── pan + inertia (Pointer Events, pointer capture, touch-action:none) ──────────────────────────
	let dragging = false;
	let lastX = 0,
		lastY = 0,
		vX = 0,
		vY = 0,
		lastT = 0;
	let inertia = 0;

	function onPointerDown(e: PointerEvent) {
		if (inertia) {
			cancelAnimationFrame(inertia);
			inertia = 0;
		}
		dragging = true;
		lastX = e.clientX;
		lastY = e.clientY;
		vX = 0;
		vY = 0;
		lastT = e.timeStamp;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		const s = tableCamera.scale;
		const dxSeat = (e.clientX - lastX) / (PX_X * s);
		const dyYear = (e.clientY - lastY) / (PX_Y * s);
		tableCamera.cx -= dxSeat;
		tableCamera.cy -= dyYear;
		const dt = Math.max(1, e.timeStamp - lastT);
		vX = dxSeat / dt;
		vY = dyYear / dt; // seats/ms
		lastX = e.clientX;
		lastY = e.clientY;
		lastT = e.timeStamp;
	}
	function onPointerUp(e: PointerEvent) {
		dragging = false;
		try {
			(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
		// fling: decay the release velocity
		let vx = vX,
			vy = vY;
		const FRICTION = 0.94;
		const step = () => {
			vx *= FRICTION;
			vy *= FRICTION;
			tableCamera.cx -= vx * 16;
			tableCamera.cy -= vy * 16;
			if (Math.hypot(vx, vy) > 0.0002) inertia = requestAnimationFrame(step);
			else inertia = 0;
		};
		if (Math.hypot(vx, vy) > 0.001) inertia = requestAnimationFrame(step);
	}
</script>

<svelte:head><title>Table — Zoom 2</title></svelte:head>

<div
	class="viewport"
	role="application"
	aria-label="Family table — drag to pan"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
>
	<div class="world" style="transform: translate({tx}px, {ty}px) scale({tableCamera.scale});">
		{#each visible as r (r.id)}
			<div class="tile {region(r)}" style="transform: translate({r.x * PX_X}px, {r.y * PX_Y}px);">
				<span class="name">{r.n}</span>
				<span class="life"
					>{r.pv ? '' : (r.by ?? '')}{r.pv ? '' : r.dy ? '–' + r.dy : r.by ? '–' : ''}</span
				>
			</div>
		{/each}
	</div>
	{#if !ready}<div class="loading">loading the table…</div>{/if}
	<div class="count">{visible.length} of 16,411</div>
</div>

<style>
	.viewport {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: #f4f1ea;
		touch-action: none; /* the container owns all pointer gestures — no browser scroll/zoom */
		cursor: grab;
		user-select: none;
	}
	.viewport:active {
		cursor: grabbing;
	}
	.world {
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: top left;
		will-change: transform;
	}
	.tile {
		position: absolute;
		top: 0;
		left: 0;
		width: 84px;
		margin-left: -42px; /* centre the tile on its seat */
		margin-top: -14px;
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1.05;
		text-align: center;
		pointer-events: none;
		border-radius: 4px;
		padding: 2px 3px;
		/* region tint — the three bands read as distinct lines at rest (spine / grove / orbit) */
		background: var(--tint);
		box-shadow: inset 0 0 0 1px var(--edge);
	}
	.tile.spine {
		--tint: rgba(180, 83, 60, 0.1);
		--edge: rgba(180, 83, 60, 0.35);
	}
	.tile.grove {
		--tint: rgba(58, 122, 90, 0.1);
		--edge: rgba(58, 122, 90, 0.35);
	}
	.tile.orbit {
		--tint: rgba(110, 110, 120, 0.08);
		--edge: rgba(110, 110, 120, 0.28);
	}
	.name {
		font-size: 10px;
		font-weight: 600;
		color: #292524;
		max-width: 80px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.life {
		font-size: 8px;
		color: #78716c;
		font-variant-numeric: tabular-nums;
	}
	.loading,
	.count {
		position: fixed;
		bottom: 12px;
		font-size: 12px;
		color: #78716c;
		font-variant-numeric: tabular-nums;
	}
	.loading {
		top: 12px;
		left: 12px;
		bottom: auto;
	}
	.count {
		right: 12px;
	}
</style>
