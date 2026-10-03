<script lang="ts">
	/**
	 * IntroOverlay — the arrival at `/` (100226). Built and signed off step by step at /dev/intro-sweep;
	 * the numbers here are Sam's dial settings from there. Mounted by the LAYOUT so it outlives `/`
	 * replacing itself with Thomas's page underneath (see #lib/state/intro.svelte.ts for the hand-off).
	 *
	 * The sequence, one rAF clock:
	 *   1. the gilt title plate, FAINT, on the slate-brown ground;
	 *   2. the search — one flickering torch rises through the title, lighting only the letters, which
	 *      fall back to faint behind it;
	 *   3. a beat, then the whole title fades up evenly to full warmer gold;
	 *   4. a beat, then Church's "Hooker and Company" (1846) fades in full screen BEHIND the title, with a
	 *      soft dark shadow developing under the letters on the painting's own curve (the sky is bright);
	 *   5. the painting holds, and an ENTER arrow fades in an inch under the year. Nothing moves on until
	 *      the visitor clicks it (or presses Enter / →) — Sam: "it shouldn't all be automatic, the user can
	 *      click to trigger Thomas's entry";
	 *   6. the title (and the arrow) fade out FIRST, then the painting — onto the page's real paper
	 *      underneath, because the brown ground was dropped while the painting covered it;
	 *   7. release: the person page lets Thomas's card rise from the bottom edge (the vertical CC flight).
	 *
	 * Reduced motion: the gilt title on the painting, still, with the arrow — and the click is a cut.
	 *
	 * THE ARROW: no font the app ships (nor Cochin, which made the year's 2) has an arrow glyph, so it is
	 * drawn — in plate units, at the year figures' measured stroke (11) and height (73), in their measured
	 * warm gold, through the same pressed-in edge and painting shadow as the letters.
	 */
	import { onMount } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import {
		intro,
		releaseIntro,
		endIntro,
		holdIntroScroll,
		releaseIntroGutter,
		releaseIntroScroll
	} from '#lib/state/intro.svelte.js';

	const PLATE_W = 1600;
	const PLATE_H = 660;
	const SRC = '/intro/title-plate-1600.webp';
	const PAINTING = '/intro/painting-hooker-company-2560.jpg';
	const GROUND = '#3f3730';
	const FAINT = 0.16;

	// THE BROWN-GROUND TIMINGS — Sam's settings (round 8, tuned on the intro itself with a dev dial panel:
	// "just under 4s, perfect"). The panel was removed once he was happy (100226); to bring it back, see the
	// ENRICHED roadmap's intro entry — it is one `git show` away (commit 6199c6e0 has it).
	const dials = {
		hold: 500, // faint plate, before the torch
		sweep: 1400, // the search: the torch's rise through the title
		bandPct: 38, // torch height, % of the plate's height
		widthPct: 55, // torch width, % of the plate's width
		flicker: 0.06, // the flame's waver
		pause: 450, // all faint again, before the fade up
		fade: 950, // the even fade up to full gilt
		beat: 650 // full gilt on brown, before the painting starts — the brown ground totals 3.95s
	};
	const PAINT_IN_MS = 1500;
	const SHADOW = 0.35; // Sam: 0.7 first shown, then 0.525, still "very dark" -> 0.35
	const SHADOW_BLUR = 14;
	// the raised look over the painting (see THE RELIEF filter) — kept subtle: a lit top edge, a shaded foot
	const EMBOSS_LIGHT = 0.4;
	const EMBOSS_SHADE = 0.5;
	const ARROW_IN_MS = 700; // the arrow's fade in, once the painting is full and the page beneath is ready
	// THE EXIT, after the click — brisker than the arrival (Sam: "users when they click the arrow are ready
	// to dive in; it shouldn't match the speed of the intro"). Still in sequence: the title and arrow go at
	// once, the painting follows a beat behind, overlapping rather than waiting its turn. Was 700 + 1200;
	// then 350 / 150 / 650 ("much better… even one beat too quick"); now the whole exit is 300ms longer,
	// spread in proportion — the painting is gone 1.1s after the click.
	const TITLE_OUT_MS = 480;
	const PAINT_OUT_DELAY_MS = 200; // the painting starts to go this long after the click
	const PAINT_OUT_MS = 900;
	// The card's deck flight waits ~0.5s on an empty stage before it moves (the exit time of an outgoing
	// card that, here, does not exist). Release that much BEFORE the painting is gone, so the wait is
	// spent under the fading painting and the card starts rising as the paper clears.
	const RELEASE_LEAD_MS = 400;

	const band = $derived((PLATE_H * dials.bandPct) / 100);
	const startY = $derived(PLATE_H + band * 2.0);
	const endY = $derived(-band * 2.0);

	let beamY = $state(PLATE_H * 2);
	let flame = $state(1);
	let flameSize = $state(1);
	let fade = $state(0); // the even fill: faint → full gilt
	let paint = $state(0); // the painting's opacity
	let relief = $state(0); // 0 = pressed into the leather, 1 = raised off the painting (follows `paint` in)
	let title = $state(1); // the whole title's opacity (it leaves first)
	let ground = $state(true); // the brown ground; dropped once the painting covers it
	let still = $state(false);
	let arrowShown = $state(false); // the painting is full and the page beneath has mounted
	let arrow = $state(0); // its opacity
	let leaving = $state(false); // clicked: the exit is under way
	let enter = () => {}; // set once the clock is running — the click/keys call it
	// THE HOVER, eased on the intro's own clock rather than a CSS transition — a transition on a transform
	// inside a filtered SVG group arrived as an instant jerk (Sam). `h` glides 0→1: the arrow drifts a few
	// units toward the door and the whole ring and arrow warm a shade, together.
	let hover = $state(false);
	let h = $state(0);
	// the year figures' measured warm gold (Sam tried a darker button gold and brought it back)
	const GOLD = [248, 214, 103];
	const GOLD_LIT = [255, 236, 158];
	const gold = $derived(
		`rgb(${GOLD.map((c, i) => Math.round(c + (GOLD_LIT[i] - c) * h)).join(' ')})`
	);

	let ph = [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28];
	const flameAt = (t: number) =>
		Math.sin(t / 61 + ph[0]) * 0.5 + Math.sin(t / 37 + ph[1]) * 0.3 + Math.sin(t / 23 + ph[2]) * 0.2;
	// clamped: unclamped past 1 the curve turns back down (that sank the gilt and the painting once)
	const ease = (k: number) => {
		const c = Math.min(1, Math.max(0, k));
		return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
	};

	// NO SCROLLBAR, NO GUTTER over the title or the painting (Sam: "distracting"). Held by
	// #lib/state/intro.svelte.ts and given back in two steps — the gutter here, once the painting is gone;
	// the scrollbar by the person page, once Thomas has landed (see holdIntroScroll there).

	let raf = 0;
	let t0 = 0;
	let last = 0;
	let shown0 = 0; // when the arrow began to fade in
	let out0 = 0; // when the visitor clicked
	onMount(() => {
		holdIntroScroll();
		if (prefersReducedMotion.current) {
			still = true;
			fade = 1;
			paint = 1;
			relief = 1;
			ground = false;
			arrowShown = true;
			arrow = 1;
			enter = () => {
				if (leaving) return;
				leaving = true;
				releaseIntroScroll(); // a cut: nothing flies, so nothing to wait for
				releaseIntro();
				endIntro(); // a cut
			};
			return;
		}
		t0 = last = performance.now();
		enter = () => {
			if (!arrowShown || out0) return;
			out0 = performance.now() - t0;
			leaving = true;
		};
		const frame = (now: number) => {
			const t = now - t0;
			const dt = now - last;
			last = now;
			h += ((hover ? 1 : 0) - h) * (1 - Math.exp(-dt / 110)); // ~1/3s to settle, either way
			// read every frame, so a dial moved mid-run takes effect at once
			const up0 = dials.hold;
			const fade0 = up0 + dials.sweep + dials.pause;
			const paint0 = fade0 + dials.fade + dials.beat;
			const n = flameAt(t);
			flame = 1 - dials.flicker * (0.5 - 0.5 * n);
			flameSize = 1 + dials.flicker * 0.5 * n;
			if (t < up0) beamY = startY;
			else if (t < up0 + dials.sweep) beamY = startY + (endY - startY) * ease((t - up0) / dials.sweep);
			else beamY = endY;
			fade = ease((t - fade0) / dials.fade);
			paint = ease((t - paint0) / PAINT_IN_MS);
			if (!out0) relief = paint; // on the exit it stays raised while the title leaves
			if (paint >= 1) ground = false; // the painting covers the window: the paper waits beneath it
			if (!arrowShown && paint >= 1 && intro.ready) {
				arrowShown = true;
				shown0 = t;
			}
			if (arrowShown) arrow = ease((t - shown0) / ARROW_IN_MS);
			if (out0) {
				const since = t - out0;
				title = 1 - ease(since / TITLE_OUT_MS);
				arrow = Math.min(arrow, title);
				const k2 = (since - PAINT_OUT_DELAY_MS) / PAINT_OUT_MS;
				if (k2 > 0) paint = 1 - ease(k2);
				// the card's flight starts its empty-stage wait under the fading painting (see RELEASE_LEAD_MS)
				if (since >= PAINT_OUT_DELAY_MS + PAINT_OUT_MS - RELEASE_LEAD_MS) releaseIntro();
				if (k2 >= 1) {
					// the gutter comes back only now, with the painting gone — returned at the release it
					// showed as a white strip beside the fading painting. The card is still waiting off-screen
					// below, and its flight lands on its layout slot wherever the gutter leaves it.
					releaseIntroGutter(); // the scrollbar itself waits for the landing (the person page)
					endIntro(); // the layout unmounts this; paper is already what shows
					return;
				}
			}
			raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(raf);
	});

	function onkey(e: KeyboardEvent) {
		if (!arrowShown || leaving) return;
		if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') {
			e.preventDefault();
			enter();
		}
	}

	const torchStops = $derived.by(() => {
		const out = [];
		for (let i = 0; i <= 12; i++) {
			const d = i / 12;
			out.push({ o: d, v: flame * Math.exp(-(d * d) / (2 * 0.33 * 0.33)) });
		}
		return out;
	});
	const ry = $derived(band * 2.2 * flameSize); // gradient radius covers ~3 sigma
	const rx = $derived(((PLATE_W * dials.widthPct) / 100) * 1.4 * flameSize);
</script>

<svelte:head>
	<link rel="preload" as="image" href={PAINTING} />
	<link rel="preload" as="image" href={SRC} />
</svelte:head>

<svelte:window onkeydown={onkey} />

<div class="intro" class:ground class:leaving style:--intro-ground={GROUND}>
	<img class="painting" src={PAINTING} alt="" style:opacity={paint} />
	<div class="title" style:opacity={title}>
	<svg class="plate" viewBox="0 0 {PLATE_W} {PLATE_H}" aria-hidden="true">
		<defs>
			<!-- THE RELIEF. Pressed IN on the leather (the spine's look), RAISED once the painting is behind it
			     (Sam: "almost would be better embossed… subtly transition deboss to emboss with the painting").
			     Same edge bands both ways; only what fills them crossfades on `relief` (0 = debossed, 1 =
			     embossed): the top inside edge goes from shadow to light, the bottom inside edge from glint to
			     shade, and the dark lip above each letter (a sunken letter's tell) fades away. The cast shadow
			     below — the painting shadow, rising on the same curve — completes the raised read. -->
			<filter id="intro-deboss" x="-3%" y="-8%" width="106%" height="116%" color-interpolation-filters="sRGB">
				<feOffset in="SourceAlpha" dy="7" result="down" />
				<feComposite in="SourceAlpha" in2="down" operator="out" result="topBand" />
				<feGaussianBlur in="topBand" stdDeviation="2.5" result="topSoft" />
				<feComposite in="topSoft" in2="SourceAlpha" operator="in" result="topIn" />
				<feFlood flood-color="#1e1408" flood-opacity={0.72 * (1 - relief)} />
				<feComposite in2="topIn" operator="in" result="shade" />
				<feFlood flood-color="#fff6c8" flood-opacity={EMBOSS_LIGHT * relief} />
				<feComposite in2="topIn" operator="in" result="topLight" />
				<feOffset in="SourceAlpha" dy="-5" result="up" />
				<feComposite in="SourceAlpha" in2="up" operator="out" result="botBand" />
				<feGaussianBlur in="botBand" stdDeviation="2" result="botSoft" />
				<feComposite in="botSoft" in2="SourceAlpha" operator="in" result="botIn" />
				<feFlood flood-color="#fff6c8" flood-opacity={0.45 * (1 - relief)} />
				<feComposite in2="botIn" operator="in" result="glint" />
				<feFlood flood-color="#1e1408" flood-opacity={EMBOSS_SHADE * relief} />
				<feComposite in2="botIn" operator="in" result="botShade" />
				<feOffset in="SourceAlpha" dy="-3" result="up2" />
				<feComposite in="up2" in2="SourceAlpha" operator="out" result="lipBand" />
				<feGaussianBlur in="lipBand" stdDeviation="2" result="lipSoft" />
				<feFlood flood-color="#120c05" flood-opacity={0.45 * (1 - relief)} />
				<feComposite in2="lipSoft" operator="in" result="lip" />
				<feMerge>
					<feMergeNode in="lip" />
					<feMergeNode in="SourceGraphic" />
					<feMergeNode in="shade" />
					<feMergeNode in="glint" />
					<feMergeNode in="topLight" />
					<feMergeNode in="botShade" />
				</feMerge>
			</filter>
			<!-- THE BUTTON'S IMPRESSION: the letters' deboss at about half strength (Sam: the ring and arrow
			     "too heavy on the deboss" — and halfway to a plain modern control, not fully old-timey). -->
			<filter id="intro-deboss-soft" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
				<feOffset in="SourceAlpha" dy="3.5" result="down" />
				<feComposite in="SourceAlpha" in2="down" operator="out" result="topBand" />
				<feGaussianBlur in="topBand" stdDeviation="1.25" result="topSoft" />
				<feComposite in="topSoft" in2="SourceAlpha" operator="in" result="topIn" />
				<feFlood flood-color="#1e1408" flood-opacity="0.36" />
				<feComposite in2="topIn" operator="in" result="shade" />
				<feOffset in="SourceAlpha" dy="-2.5" result="up" />
				<feComposite in="SourceAlpha" in2="up" operator="out" result="botBand" />
				<feGaussianBlur in="botBand" stdDeviation="1" result="botSoft" />
				<feComposite in="botSoft" in2="SourceAlpha" operator="in" result="botIn" />
				<feFlood flood-color="#fff6c8" flood-opacity="0.25" />
				<feComposite in2="botIn" operator="in" result="glint" />
				<feMerge>
					<feMergeNode in="SourceGraphic" />
					<feMergeNode in="shade" />
					<feMergeNode in="glint" />
				</feMerge>
			</filter>
			<filter id="intro-warmgold" color-interpolation-filters="sRGB">
				<feColorMatrix type="matrix" values="1.00 0 0 0 0  0 0.90 0 0 0  0 0 0.62 0 0  0 0 0 1 0" />
			</filter>
			<filter id="intro-shadow" x="-6%" y="-20%" width="112%" height="140%" color-interpolation-filters="sRGB">
				<feGaussianBlur in="SourceAlpha" stdDeviation={SHADOW_BLUR} />
				<feOffset dy={SHADOW_BLUR * 0.35} result="soft" />
				<feFlood flood-color="#140d06" />
				<feComposite in2="soft" operator="in" />
			</filter>
			<radialGradient
				id="intro-torch"
				gradientUnits="userSpaceOnUse"
				cx="0"
				cy="0"
				r="1"
				gradientTransform="translate({PLATE_W / 2} {beamY}) scale({rx} {ry})"
			>
				{#each torchStops as s, i (i)}
					<stop offset={s.o} stop-color="white" stop-opacity={s.v} />
				{/each}
			</radialGradient>
			<mask id="intro-light" maskUnits="userSpaceOnUse" x="0" y="0" width={PLATE_W} height={PLATE_H}>
				<rect x="0" y="0" width={PLATE_W} height={PLATE_H} fill="white" fill-opacity={fade} />
				{#if !still}
					<rect x="0" y="0" width={PLATE_W} height={PLATE_H} fill="url(#intro-torch)" />
				{/if}
			</mask>
		</defs>
		<g filter="url(#intro-shadow)" opacity={SHADOW * paint}>
			<image href={SRC} width={PLATE_W} height={PLATE_H} />
		</g>
		<g filter="url(#intro-deboss)" opacity={FAINT}>
			<image href={SRC} width={PLATE_W} height={PLATE_H} filter="url(#intro-warmgold)" />
		</g>
		<g filter="url(#intro-deboss)" mask="url(#intro-light)">
			<image href={SRC} width={PLATE_W} height={PLATE_H} filter="url(#intro-warmgold)" />
		</g>
	</svg>
	{#if arrowShown}
		<!-- ENTER. Drawn in plate units so it scales with the title: a small arrow inside a gilt ring
		     (Sam, round 2: "size down your arrow and put it inside a circle"). -->
		<button
			class="enter"
			type="button"
			aria-label="Enter"
			style:opacity={arrow}
			style:--gold={gold}
			onclick={() => enter()}
			onpointerenter={() => (hover = true)}
			onpointerleave={() => (hover = false)}
			onfocus={() => (hover = true)}
			onblur={() => (hover = false)}
		>
			<svg viewBox="-60 -60 120 120" aria-hidden="true">
				<g filter="url(#intro-shadow)" opacity={SHADOW * 0.5}>
					<circle class="ring" r="50" />
					<g transform="translate({h * 5} 0)">
						<path class="arrow" d="M-23 0 H23" />
						<path class="arrow" d="M9 -14 L24 0 L9 14" />
					</g>
				</g>
				<g filter="url(#intro-deboss-soft)">
					<circle class="ring" r="50" />
					<g transform="translate({h * 5} 0)">
						<path class="arrow" d="M-23 0 H23" />
						<path class="arrow" d="M9 -14 L24 0 L9 14" />
					</g>
				</g>
			</svg>
		</button>
	{/if}
	</div>
</div>

<style>
	/* Above everything the page owns, SettleVeil (90) included. */
	.intro {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: grid;
		place-items: center;
		pointer-events: none;
	}
	.intro.ground {
		background: var(--intro-ground);
		pointer-events: auto; /* nothing underneath is clickable while the title is on brown */
	}
	.painting {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.intro.leaving {
		pointer-events: none; /* clicked: the page underneath is about to own the screen */
	}
	.title {
		position: relative;
		width: min(480px, 82vw); /* Sam's M size */
	}
	.plate {
		display: block;
		width: 100%;
		height: auto;
	}
	/* Half an inch under the year (Sam, was an inch). Sized in the plate's units: 220 of 1600 → the same scale as the
	   letters at every width. */
	.enter {
		position: absolute;
		left: 50%;
		top: calc(100% + 0.5in - 2.5% - 10px); /* the ring's top half an inch under the year (Sam) */
		width: calc(100% * 120 / 1600 + 20px);
		padding: 10px;
		transform: translateX(-50%);
		background: none;
		border: 0;
		cursor: pointer;
		pointer-events: auto;
	}
	.enter svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}
	.enter:focus-visible {
		outline: 1px solid rgba(255, 236, 170, 0.7);
		outline-offset: 2px;
		border-radius: 4px;
	}
	.arrow {
		fill: none;
		stroke: var(--gold, #f8d667);
		stroke-width: 11;
	}
	.arrow {
		stroke-width: 6; /* 5 +20% (Sam) */
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.ring {
		fill: none;
		stroke: var(--gold, #f8d667);
		stroke-width: 4.8; /* 4 +20% (Sam) */
	}
</style>
