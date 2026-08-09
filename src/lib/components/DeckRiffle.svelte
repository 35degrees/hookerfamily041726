<!--
  DeckRiffle.svelte — THE DECK SHUFFLE (design §22, successor to Passage.svelte). On a CC arrival the
  neighbourhood is riffled like a stack of pages: N faint GHOST CARDS stream edge-to-edge across the
  viewport, heavily overlapped, and the real destination card (growFrom, elsewhere) is the LAST vehicle
  in the convoy — braking into the slot as the last ghosts exit. Transient, flight-only. NOTHING at rest.

  Mounts where Passage did; same subscribe pattern. Each ghost is the featured-card SHELL (925-wide
  proportions, radius, shadow family) carrying SUGGESTION content only — a title-weight line where the
  name sits, a few thinner lines in the NB zone, and (on 1–2 seeded cars per riffle) a PROCEDURAL
  blurred portrait — a warm-grey/sepia radial vignette with an off-centre head mass, generated from the
  camera seed, that is nobody (§22.4: never real faces, never real data). The rest keep a plain grey
  slot because the corpus is mostly photoless. FULLY OPAQUE cards — ghost-ness is real directional
  Gaussian blur ALONE (blurry does not mean translucent — Sam), fading in/out only at the very edges so
  they never pop. No real names, never a generic skeleton.

  These are PEOPLE, not a conveyor belt: every car's tilt, lane, stagger jitter, and which ones carry a
  face are seeded per-flight (camera seq) — deterministic but never uniform. Do not regularise this.

  Ghosts are one-shot WAAPI element.animate() (fire-and-forget, onfinish removes) — NO animation
  library, no second clock (§22.6). A new cc publish mid-riffle cancels all live ghosts within one
  frame (rapid CC-hopping accumulates zero animation debt). Reduced-motion: renders nothing.
-->
<script lang="ts">
	import { CARD_TOP_H, CARD_W as CARD_W_BASE } from './FeaturedCard.svelte';
	import { stage } from '$lib/state/stage.svelte';
	import { onMount } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { subscribeCameraMove, type CameraMove } from '$lib/state/camera';
	import {
		deckDirFor,
		deckScheduleFor,
		DECK_GHOSTS,
		DECK_GHOST_V,
		DECK_GHOST_OPACITY,
		DECK_GHOST_BLUR
	} from '$lib/transitions/flight';
	import { GROUNDS, groundState } from '$lib/state/ground.svelte';

	// Ghosts read as pale card-shells on either ground — atmosphere, never holes.
	const dark = $derived(['dark', 'ledger'].includes(GROUNDS[groundState.idx]?.kind));

	let layer: HTMLDivElement; // the fixed container the ghosts are spawned into
	let live: Animation[] = []; // in-flight ghost animations, so a re-publish cancels them

	// IMPORTED AND SCALED, not restated. The phantoms must match the real card at the size it is
	// CURRENTLY being drawn — a riffle at the small-landscape rung deals 758px cards, not 925px ones.
	//
	// The width used to be a local `const CARD_W = 925` with the comment "matches FeaturedCard's
	// w-[925px]" beside it, which is the exact failure design §28.1 records about the height: "a comment
	// is not a mechanism, and the two would have diverged the first time the number moved." Phase 2.75
	// is that first time — the number now moves on every resize — so both dimensions come from the
	// owner and go through the same dial.
	const CARD_W = $derived(Math.round(CARD_W_BASE * stage.u));
	const CARD_MIN_H = $derived(Math.round(CARD_TOP_H * stage.u));

	function clearLive() {
		for (const a of live) {
			try {
				a.cancel();
			} catch {
				/* already finished */
			}
		}
		live = [];
		layer?.replaceChildren(); // drop any lingering ghost nodes in one shot
	}

	// A ghost = the card shell (proportions/radius/shadow) + suggestion content. Built with inline
	// styles so it's self-contained and survives Svelte's scoped-class boundary (the real .featured-card
	// classes are scoped to FeaturedCard). Proportions mirror the real card so a future redesign only
	// needs these three constants nudged.
	// photo (seeded, per-car) → a PROCEDURAL portrait; null → the plain grey slot. Never real data (§22.4).
	function ghostNode(photo: { hue: number; offX: number; offY: number } | null): HTMLDivElement {
		const ink = dark ? '235,232,228' : '120,113,108';
		const paper = dark ? 'rgba(60,58,55,0.55)' : 'rgba(255,255,255,0.9)';
		const bar = (w: string, h: number, mt: number) =>
			`<div style="width:${w};height:${h}px;margin-top:${mt}px;border-radius:3px;background:rgba(${ink},0.32);"></div>`;

		// A face that is NOBODY: warm sepia/grey vignette with an off-centre head-and-shoulders mass, hue
		// and framing driven by the seed. Heavily soft on its own; the travel-axis blur finishes the job.
		const portrait = photo
			? `background:
					radial-gradient(42% 34% at ${50 + photo.offX}% ${30 + photo.offY}%, hsl(${photo.hue} 24% 74%), hsl(${photo.hue} 20% 55%) 62%, transparent 100%),
					radial-gradient(70% 62% at ${50 + photo.offX * 0.5}% ${118 + photo.offY}%, hsl(${photo.hue} 22% 50%), transparent 72%),
					linear-gradient(hsl(${photo.hue} 18% 46%), hsl(${photo.hue} 16% 34%));`
			: `background:rgba(${ink},0.22);`;

		const wrap = document.createElement('div');
		wrap.setAttribute('data-deck-ghost', 'true');
		wrap.style.cssText = [
			'position:fixed',
			`width:${CARD_W}px`,
			`min-height:${CARD_MIN_H}px`,
			'will-change:transform,opacity',
			'pointer-events:none'
		].join(';');
		wrap.innerHTML = `
			<div style="width:100%;min-height:${CARD_MIN_H}px;background:${paper};border-radius:8px;
				box-shadow:0 4px 12px rgba(0,0,0,0.10),0 1px 3px rgba(0,0,0,0.08);padding:16px 24px;">
				<!-- name line (title weight) -->
				${bar('42%', 22, 8)}
				<div style="display:flex;gap:24px;margin-top:28px;">
					<!-- portrait: procedural face (seeded) or plain slot -->
					<div style="width:23%;aspect-ratio:3/4;border-radius:2px;overflow:hidden;${portrait}"></div>
					<!-- NB rhythm -->
					<div style="flex:1;">
						${bar('90%', 11, 0)}${bar('96%', 11, 12)}${bar('72%', 11, 12)}
					</div>
					<div style="width:21%;"></div>
				</div>
			</div>`;
		return wrap;
	}

	onMount(() => {
		const un = subscribeCameraMove((m: CameraMove) => {
			if (m.kind !== 'cc' || prefersReducedMotion.current) return;
			clearLive(); // cancel any riffle still in flight — one frame, zero debt
			if (!DECK_GHOSTS) return; // GHOSTS OFF (default): the pure push — hero + car 1 only, no convoy layer

			const dir = deckDirFor(m);
			const sched = deckScheduleFor(m);
			// Anchor the convoy through the CURRENT card's slot (the dealt-over card's rect) so the hero
			// appears to emerge from the pack; fall back to viewport centre if the card isn't mounted.
			const slot = document.querySelector('.featured-card-wrap')?.getBoundingClientRect();
			const cx = slot ? slot.left + slot.width / 2 : window.innerWidth / 2;
			const cy = slot ? slot.top + slot.height / 2 : window.innerHeight / 2;
			const horiz = Math.abs(dir.x) >= Math.abs(dir.y);
			const blur = horiz ? 'url(#deck-blur-h)' : 'url(#deck-blur-v)';
			const perp = { x: -dir.y, y: dir.x }; // the lane-fan axis (perpendicular to travel)
			// Viewport-relative reach: distance a ghost CENTRED at (cx,cy) travels to clear the FAR window edge
			// (+ card half + margin) — no ghost peeks at any window size (was a fixed DECK_TRAVEL that sat inside
			// wide windows). ghostMs derives from it so px/ms stays DECK_GHOST_V.
			const reach = horiz
				? Math.max(cx, window.innerWidth - cx) + CARD_W / 2 + 80
				: Math.max(cy, window.innerHeight - cy) + CARD_MIN_H / 2 + 80;
			const ghostMs = (2 * reach) / DECK_GHOST_V;

			for (let i = 0; i < sched.N; i++) {
				const j = sched.jitter[i];
				const node = ghostNode(j.photo);
				// Lane fan: each car rides its OWN parallel track, offset PERPENDICULAR to travel — baked into
				// position so the animated transform is pure travel. This spread is where "many cards" reads from.
				node.style.left = `${cx + j.lanePx * perp.x}px`;
				node.style.top = `${cy + j.lanePx * perp.y}px`;
				node.style.filter = blur;
				layer.appendChild(node);

				// Convoy travel at DECK_GHOST_V: enter from +dir (offscreen START), stream through the slot, exit
				// at −dir. Ghosts cruise (they never stop) — the discrete cards between car 1 and the hero.
				const sx = dir.x * reach, sy = dir.y * reach;
				const ex = -dir.x * reach, ey = -dir.y * reach;
				const anim = node.animate(
					[
						{
							transform: `translate(-50%,-50%) translate(${sx}px,${sy}px) rotate(${j.rotDeg}deg)`,
							opacity: 0
						},
						{ opacity: DECK_GHOST_OPACITY, offset: 0.15 },
						{ opacity: DECK_GHOST_OPACITY, offset: 0.85 },
						{
							transform: `translate(-50%,-50%) translate(${ex}px,${ey}px) rotate(${j.rotDeg}deg)`,
							opacity: 0
						}
					],
					{
						duration: ghostMs,
						delay: i * sched.staggerBaseMs + j.dtMs,
						easing: 'cubic-bezier(0.33, 0, 0.2, 1)',
						fill: 'both'
					}
				);
				anim.onfinish = () => {
					node.remove();
					live = live.filter((a) => a !== anim);
				};
				live.push(anim);
			}
		});
		return () => {
			un();
			clearLive();
		};
	});
</script>

<!-- The ghost layer: empty at rest (probe-asserted). z sits ABOVE the dealt-over card, BELOW the
     flying hero (.featured-flight) — coordinated with shrinkTo's dealt-over z in step 3. -->
<div class="deck-layer" bind:this={layer} aria-hidden="true"></div>

<!-- Zero-size defs: directional Gaussian blur along the travel axis (speed, not fog). -->
<svg width="0" height="0" style="position: absolute" aria-hidden="true">
	<defs>
		<filter id="deck-blur-h" x="-20%" y="-20%" width="140%" height="140%">
			<feGaussianBlur stdDeviation="{DECK_GHOST_BLUR} 0.5" />
		</filter>
		<filter id="deck-blur-v" x="-20%" y="-20%" width="140%" height="140%">
			<feGaussianBlur stdDeviation="0.5 {DECK_GHOST_BLUR}" />
		</filter>
	</defs>
</svg>

<style>
	.deck-layer {
		position: fixed;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		z-index: 1; /* above the dealt-over card (z:0), below the flying hero (.featured-flight z:2) */
	}
	@media (prefers-reduced-motion: reduce) {
		.deck-layer {
			display: none;
		}
	}
</style>
