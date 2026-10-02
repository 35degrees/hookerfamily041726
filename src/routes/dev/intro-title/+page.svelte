<script lang="ts">
	/**
	 * /dev/intro-title — STEP 1 OF THE INTRO: the still title plate, for Sam to judge on screen (100226).
	 *
	 * Nothing moves here and nothing here is wired into `/`. The lettering is NOT a font: it is the gold
	 * lifted from Sam's photograph of the 1908 spine (IMG_2277), every hand irregularity kept — the S and
	 * H crowded in THOMASHOOKER, the crooked M, the high second E in DESCENDANTS, the period after REV.
	 * static/intro/title-gilt-1600.webp is that photo's gold with the leather cut away (alpha = the
	 * letters), so the wear and flecks inside each letter are the book's own.
	 *
	 * What the photo cannot carry once the leather is gone is the IMPRESSION — the letters were pressed
	 * into the leather, and that depth lived in the leather around them. The SVG filter rebuilds it from
	 * the letters' own outline: the top wall of each sunken letter falls into shadow, the bottom wall
	 * catches the light, and a faint lip darkens the leather just above. Light is from above.
	 *
	 * The controls are throwaway dials for choosing, not features.
	 */
	const PLATE_W = 1600;
	// THE YEAR LINE (round 7): "1586 - 2026" — 1586, the dash, the 0 and the 6 are the spine's own gilt
	// (Sam's close-up of 1586 - 1908); the spine has no 2, so each variant makes one from a typeface's 2,
	// matched to the real figures' height and stroke weight and filled with grain quilted from their gilt.
	// Placed at the proportions measured off the full-spine photo (IMG_2274).
	// Built by scripts/intro/run.sh from Sam's spine photos (see scripts/intro/README.md). Cochin's 2 won over
	// Iowan's on Sam's eye (round 10); the losing variant was deleted rather than kept as a dial.
	const PLATES = [
		{ name: 'title only', href: '/intro/title-gilt-1600.webp', h: 465 },
		{ name: 'title + 1586 - 2026', href: '/intro/title-plate-1600.webp', h: 660 }
	];
	let plate = $state(PLATES[1]);
	const PLATE_H = $derived(plate.h);

	// ROUND 2 (Sam): "darkest" (#4b3721) was right in depth but too chestnut — mix in slate, "more brown
	// than grey", a dark neutral that never competes with the gold or with the painting fading in.
	// Each is the leather's darkest tone pulled toward slate (#3c4248); the last is kept for comparison.
	const GROUNDS = [
		{ name: 'slate-brown A', hex: '#4a3f34' },
		{ name: 'slate-brown B', hex: '#453b31' },
		{ name: 'slate-brown C', hex: '#3f3730' },
		{ name: 'slate-brown D', hex: '#38322c' },
		{ name: 'was: darkest', hex: '#4b3721' }
	];
	const SIZES = [
		{ name: 'S', w: 360 },
		{ name: 'M', w: 480 },
		{ name: 'L', w: 620 }
	];

	let ground = $state(GROUNDS[2].hex); // C — Sam's pick, round 2
	let width = $state(SIZES[1].w);
	let deboss = $state(true);
	let warm = $state(true); // Sam: warmer gold
	let faint = $state(false);
</script>

<svelte:head><title>Intro title — step 1</title></svelte:head>

<div class="stage" style="background: {ground}">
	<svg
		class="plate"
		class:faint
		viewBox="0 0 {PLATE_W} {PLATE_H}"
		style="width: min({width}px, 82vw)"
		role="img"
		aria-label="The Descendants of Rev. Thomas Hooker"
	>
		<defs>
			<!-- THE IMPRESSION. Offsets are in plate units (1600 wide), so they scale with the title:
			     at the M size (480px) 7 units is ~2px of shadow. -->
			<filter id="deboss" x="-3%" y="-8%" width="106%" height="116%" color-interpolation-filters="sRGB">
				<!-- the top wall of each letter, in shadow -->
				<feOffset in="SourceAlpha" dy="7" result="down" />
				<feComposite in="SourceAlpha" in2="down" operator="out" result="topBand" />
				<feGaussianBlur in="topBand" stdDeviation="2.5" result="topSoft" />
				<feComposite in="topSoft" in2="SourceAlpha" operator="in" result="topIn" />
				<feFlood flood-color="#1e1408" flood-opacity="0.72" />
				<feComposite in2="topIn" operator="in" result="shade" />
				<!-- the bottom wall, catching the light -->
				<feOffset in="SourceAlpha" dy="-5" result="up" />
				<feComposite in="SourceAlpha" in2="up" operator="out" result="botBand" />
				<feGaussianBlur in="botBand" stdDeviation="2" result="botSoft" />
				<feComposite in="botSoft" in2="SourceAlpha" operator="in" result="botIn" />
				<feFlood flood-color="#fff6c8" flood-opacity="0.45" />
				<feComposite in2="botIn" operator="in" result="glint" />
				<!-- the lip: leather just above the letter, bending down into it -->
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
			<!-- A slightly warmer, deeper gold than the photo's pale near-white highlights. -->
			<filter id="warmgold" color-interpolation-filters="sRGB">
				<feColorMatrix
					type="matrix"
					values="1.00 0 0 0 0
					        0 0.90 0 0 0
					        0 0 0.62 0 0
					        0 0 0 1 0"
				/>
			</filter>
		</defs>
		<g filter={deboss ? 'url(#deboss)' : undefined}>
			<image
				href={plate.href}
				width={PLATE_W}
				height={PLATE_H}
				filter={warm ? 'url(#warmgold)' : undefined}
			/>
		</g>
	</svg>
</div>

<div class="dials">
	<div>
		{#each GROUNDS as g (g.hex)}
			<button class:on={ground === g.hex} onclick={() => (ground = g.hex)}>
				<span class="sw" style="background: {g.hex}"></span>{g.name}
			</button>
		{/each}
	</div>
	<div>
		{#each SIZES as s (s.name)}
			<button class:on={width === s.w} onclick={() => (width = s.w)}>{s.name} {s.w}px</button>
		{/each}
		<button class:on={deboss} onclick={() => (deboss = !deboss)}>pressed-in edge</button>
		<button class:on={warm} onclick={() => (warm = !warm)}>warmer gold</button>
		<button class:on={faint} onclick={() => (faint = !faint)}>faint (opening state)</button>
	</div>
	<div>
		{#each PLATES as pl (pl.name)}
			<button class:on={plate === pl} onclick={() => (plate = pl)}>{pl.name}</button>
		{/each}
	</div>
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
		height: auto;
		transition: opacity 400ms ease;
	}
	/* The opening state: the letters are there, pressed in, but unlit. */
	.plate.faint {
		opacity: 0.16;
	}
	.dials {
		position: fixed;
		left: 12px;
		bottom: 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		font: 12px/1.2 system-ui, sans-serif;
	}
	.dials div {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.dials button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.25);
		background: rgba(0, 0, 0, 0.35);
		color: rgba(255, 255, 255, 0.75);
		cursor: pointer;
	}
	.dials button.on {
		border-color: rgba(255, 236, 170, 0.8);
		color: #fff3c4;
	}
	.sw {
		width: 12px;
		height: 12px;
		border-radius: 2px;
		border: 1px solid rgba(255, 255, 255, 0.3);
	}
</style>
