<script lang="ts">
	/**
	 * /dev/intro-sweep — STEP 2 OF THE INTRO: the search, then the even fade-up, for Sam to judge (100226, round 5).
	 *
	 * Sam: someone is looking for something, sweeps a torch up over the title and moves away — then realises
	 * he passed over it and comes back. So: the page loads on the FAINT plate; ONE torch (an oval glow centred
	 * on the title, gaussian falloff, an irregular flame flicker) rises from below the title to above it, and
	 * the letters fall back to faint behind it (afterglow 0). A beat. Then the whole title fades up EVENLY
	 * to full warmer gold, and stays (round 5).
	 *
	 * Tried and rejected, so it is not rebuilt: a browser-wide BAND read as several beams (round 1); the
	 * uniform "catch" (whole title fading up at once) did not read as anyone coming back (round 2); a torch
	 * travelling the WINDOW on an arm's arc, from below the browser's bottom edge to past its top, with a warm
	 * pool on the ground — "horrible", not wanted at all (round 3); and a warm glow on the brown following the
	 * torch — a light as a "separate object on the screen", rejected: only the LETTERS light (round 4); a
	 * RETURN pass, the torch coming back down top to bottom and leaving gold behind it — Sam liked it but
	 * chose an even fade instead (round 5). The search's dials below are Sam's settings from round 5.
	 *
	 * HOW: two copies of the plate. The FAINT copy is the resting state. The LIT copy is the full gilt plate
	 * seen through a mask: the torch (a radial gradient), plus, for the fade-in, a flat fill whose strength
	 * rises evenly from 0 to 1 — the same layer, so the end state is the lit plate with nothing to swap. The light only ever acts on the letters, never the
	 * brown. One rAF clock drives every phase from elapsed time; the dials are throwaway and the numbers they
	 * settle on become the intro's constants.
	 */
	import { onMount } from 'svelte';

	const PLATE_W = 1600;
	const PLATE_H = 660;
	const SRC = '/intro/title-plate-1600.webp';
	const GROUND = '#3f3730';
	const FAINT = 0.16; // Sam approved this opening state on step 1

	// ── THE DIALS (starting values — Sam tunes these by eye) ──────────────────────────────────────────
	let holdMs = $state(300); // faint plate, before the light arrives
	let sweepMs = $state(1100); // the search: the torch's journey up, below the plate to above it
	let bandPct = $state(36); // the torch's glow, vertical radius as % of the plate's height
	let widthPct = $state(85); // its horizontal radius, as % of the plate's width — one source, brightest at centre
	let flicker = $state(0.06); // the flame's waver in strength (size wavers half as much)
	let afterglow = $state(0); // how lit a line stays once the searching torch has moved on (Sam: ~0)
	let pauseMs = $state(250); // the beat, all faint, before the title fades up
	let fadeMs = $state(600); // the even fade up to full gilt

	// torch centre in plate units (y grows downward); fade = the even fill's strength, 0..1
	let beamY = $state(PLATE_H * 1.5);
	let fade = $state(0);
	let running = $state(false);
	let flame = $state(1); // current flame strength 0..1 multiplier
	let flameSize = $state(1);
	// an irregular flame: three slow waves at incommensurate rates, phases rolled per play, never a pattern
	let ph = [0, 0, 0];
	function flameAt(t: number) {
		const n = Math.sin(t / 61 + ph[0]) * 0.5 + Math.sin(t / 37 + ph[1]) * 0.3 + Math.sin(t / 23 + ph[2]) * 0.2;
		return n; // -1..1
	}

	const band = $derived((PLATE_H * bandPct) / 100);

	let raf = 0;
	function easeInOut(t: number) {
		return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
	}
	function play() {
		cancelAnimationFrame(raf);
		running = true;
		const startY = PLATE_H + band * 2.0; // the glow reaches ~1.7x its height setting: start clear of the title
		const endY = -band * 2.0; // and finish clear above it
		beamY = startY;
		fade = 0;
		ph = [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28];
		const t0 = performance.now();
		const up0 = holdMs;
		const fade0 = up0 + sweepMs + pauseMs;
		const done = fade0 + fadeMs;
		const frame = (now: number) => {
			const t = now - t0;
			const n = flameAt(t);
			flame = 1 - flicker * (0.5 - 0.5 * n);
			flameSize = 1 + flicker * 0.5 * n;
			if (t < up0) {
				beamY = startY;
			} else if (t < up0 + sweepMs) {
				beamY = startY + (endY - startY) * easeInOut((t - up0) / sweepMs);
			} else if (t < fade0) {
				beamY = endY; // gone past; the title is faint again
			} else if (t < done) {
				beamY = endY;
				const k = (t - fade0) / fadeMs;
				fade = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // even across the title, eased in time
			} else {
				beamY = endY;
				fade = 1; // full gilt, and it stays
				running = false;
				return;
			}
			raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);
	}
	onMount(() => {
		play();
		return () => cancelAnimationFrame(raf);
	});

	// THE TORCH: a gaussian falloff sampled into gradient stops (no flat plateau, so no bands).
	const torchStops = $derived.by(() => {
		const out = [];
		for (let i = 0; i <= 12; i++) {
			const d = i / 12; // 0 centre -> 1 edge of the gradient circle
			out.push({ o: d, v: flame * Math.exp(-(d * d) / (2 * 0.33 * 0.33)) });
		}
		return out;
	});
	const ry = $derived(((PLATE_H * bandPct) / 100) * 2.2 * flameSize); // gradient radius covers ~3 sigma
	const rx = $derived(((PLATE_W * widthPct) / 100) * 1.4 * flameSize);
	// THE SEARCH'S TRAIL: lines the rising torch has passed keep only `afterglow`, fading in behind it.
	const trailTop = $derived(beamY + band * 0.6);
</script>

<svelte:head><title>Intro sweep — step 2</title></svelte:head>

<div class="stage" style="background: {GROUND}">
	<svg class="plate" viewBox="0 0 {PLATE_W} {PLATE_H}" role="img" aria-label="The Descendants of Rev. Thomas Hooker, 1586 - 2026">
		<defs>
			<!-- the step-1 impression (light from above) and warmer gold, unchanged -->
			<filter id="deboss" x="-3%" y="-8%" width="106%" height="116%" color-interpolation-filters="sRGB">
				<feOffset in="SourceAlpha" dy="7" result="down" />
				<feComposite in="SourceAlpha" in2="down" operator="out" result="topBand" />
				<feGaussianBlur in="topBand" stdDeviation="2.5" result="topSoft" />
				<feComposite in="topSoft" in2="SourceAlpha" operator="in" result="topIn" />
				<feFlood flood-color="#1e1408" flood-opacity="0.72" />
				<feComposite in2="topIn" operator="in" result="shade" />
				<feOffset in="SourceAlpha" dy="-5" result="up" />
				<feComposite in="SourceAlpha" in2="up" operator="out" result="botBand" />
				<feGaussianBlur in="botBand" stdDeviation="2" result="botSoft" />
				<feComposite in="botSoft" in2="SourceAlpha" operator="in" result="botIn" />
				<feFlood flood-color="#fff6c8" flood-opacity="0.45" />
				<feComposite in2="botIn" operator="in" result="glint" />
				<feOffset in="SourceAlpha" dy="-3" result="up2" />
				<feComposite in="up2" in2="SourceAlpha" operator="out" result="lipBand" />
				<feGaussianBlur in="lipBand" stdDeviation="2" result="lipSoft" />
				<feFlood flood-color="#120c05" flood-opacity="0.45" />
				<feComposite in2="lipSoft" operator="in" result="lip" />
				<feMerge>
					<feMergeNode in="lip" />
					<feMergeNode in="SourceGraphic" />
					<feMergeNode in="shade" />
					<feMergeNode in="glint" />
				</feMerge>
			</filter>
			<filter id="warmgold" color-interpolation-filters="sRGB">
				<feColorMatrix type="matrix" values="1.00 0 0 0 0  0 0.90 0 0 0  0 0 0.62 0 0  0 0 0 1 0" />
			</filter>
			<radialGradient id="torchGrad" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1"
				gradientTransform="translate({PLATE_W / 2} {beamY}) scale({rx} {ry})">
				{#each torchStops as s, i (i)}
					<stop offset={s.o} stop-color="white" stop-opacity={s.v} />
				{/each}
			</radialGradient>
			<linearGradient id="trailGrad" gradientUnits="userSpaceOnUse" x1="0" y1={trailTop - 60} x2="0" y2={trailTop + 60}>
				<stop offset="0" stop-color="white" stop-opacity="0" />
				<stop offset="1" stop-color="white" stop-opacity={afterglow} />
			</linearGradient>
			<mask id="beam" maskUnits="userSpaceOnUse" x="0" y="0" width={PLATE_W} height={PLATE_H}>
				<rect x="0" y="0" width={PLATE_W} height={PLATE_H} fill="url(#trailGrad)" />
				<rect x="0" y="0" width={PLATE_W} height={PLATE_H} fill="white" fill-opacity={fade} />
				<rect x="0" y="0" width={PLATE_W} height={PLATE_H} fill="url(#torchGrad)" />
			</mask>
		</defs>
		<!-- the resting plate: faint -->
		<g filter="url(#deboss)" opacity={FAINT}>
			<image href={SRC} width={PLATE_W} height={PLATE_H} filter="url(#warmgold)" />
		</g>
		<!-- the lit plate, seen only where the light is, then everywhere as it fades up -->
		<g filter="url(#deboss)" mask="url(#beam)">
			<image href={SRC} width={PLATE_W} height={PLATE_H} filter="url(#warmgold)" />
		</g>
	</svg>
</div>

<div class="dials">
	<button class="replay" onclick={play} disabled={running}>replay</button>
	<label>hold <input type="range" min="0" max="1200" step="50" bind:value={holdMs} /> {holdMs}ms</label>
	<label>sweep up <input type="range" min="400" max="2400" step="50" bind:value={sweepMs} /> {sweepMs}ms</label>
	<label>torch height <input type="range" min="10" max="80" step="2" bind:value={bandPct} /> {bandPct}%</label>
	<label>torch width <input type="range" min="30" max="120" step="5" bind:value={widthPct} /> {widthPct}%</label>
	<label>flicker <input type="range" min="0" max="0.4" step="0.02" bind:value={flicker} /> {flicker}</label>
	<label>afterglow <input type="range" min="0" max="0.3" step="0.01" bind:value={afterglow} /> {afterglow}</label>
	<label>pause <input type="range" min="0" max="1200" step="50" bind:value={pauseMs} /> {pauseMs}ms</label>
	<label>fade in <input type="range" min="150" max="1500" step="50" bind:value={fadeMs} /> {fadeMs}ms</label>
</div>

<style>
	.stage {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
	}
	.plate {
		display: block;
		width: min(480px, 82vw); /* Sam's M size */
		height: auto;
	}
	.dials {
		position: fixed;
		left: 12px;
		bottom: 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		font: 12px/1.2 system-ui, sans-serif;
		color: rgba(255, 255, 255, 0.75);
	}
	.dials label {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.replay {
		align-self: flex-start;
		padding: 4px 12px;
		border-radius: 4px;
		border: 1px solid rgba(255, 236, 170, 0.6);
		background: rgba(0, 0, 0, 0.35);
		color: #fff3c4;
		cursor: pointer;
	}
	.replay:disabled {
		opacity: 0.4;
		cursor: default;
	}
</style>
