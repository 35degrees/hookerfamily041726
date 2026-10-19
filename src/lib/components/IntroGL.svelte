<script lang="ts">
	/**
	 * IntroGL — the intro (IntroOverlay) drawn on the GPU (Oct 19, 2026). Same sequence, same dials, same torch,
	 * same timings; only HOW each frame is drawn changes.
	 *
	 * WHY (measured in Sam's Safari, the live intro on hooker-test): ~80ms a frame — about 12 frames a second —
	 * from the first torch frame to the arrow (torch 79ms, text lighting 84ms, painting 99ms, holding 79ms). Every
	 * frame the SVG title re-ran its stack of blur filters (relief edge, lit gold, the torch's heart, two shadows)
	 * because the torch, the fade and the deboss→emboss changed their masks and floods, and the painting got a new
	 * full-screen gradient mask. Safari does that on the CPU; Chrome on the GPU at 60. Sam: "like it's happening in
	 * 1,000 stages, not fluid".
	 *
	 * HOW: the filters are run ONCE, ahead of time (scripts/intro/bake-intro-layers.mjs → static/intro/baked/),
	 * and two WebGL canvases combine the baked pictures every frame:
	 *   the TITLE canvas: shadow + year shadow (× paint), the faint letters, the letters lit by the torch and the
	 *     even fade (mask = fade + torch − fade·torch, exactly the SVG mask), the torch's hotter heart, and the
	 *     pressed-in → raised relief as a mix of the two baked reliefs;
	 *   the PAINTING canvas: the painting cover-fitted, with the sun-first reveal computed per pixel.
	 * The torch is the same gaussian oval on the same bent path with the same flicker. The EXIT after the click is
	 * two compositor fades (Web Animations on the title and the painting), so nothing loading underneath can stall
	 * them. The ENTER button is the original (a small SVG).
	 *
	 * `test`: the /dev/intro-gl page — no hand-off to the person page, `ondone` when the exit has finished.
	 */
	import { onMount } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import IntroOverlay from './IntroOverlay.svelte';
	import {
		intro,
		releaseIntro,
		endIntro,
		holdIntroScroll,
		releaseIntroGutter,
		releaseIntroScroll
	} from '#lib/state/intro.svelte.js';

	let { test = false, ondone }: { test?: boolean; ondone?: () => void } = $props();

	// ── IntroOverlay's numbers, unchanged (keep in step) ────────────────────────────────────────────────
	const PLATE_W = 1600;
	const PLATE_H = 660;
	const PAINTING = '/intro/painting-hooker-company-2560.jpg';
	const GROUND = '#3f3730';
	const FAINT = 0.16;
	const dials = { hold: 500, sweep: 1400, bandPct: 38, widthPct: 55, flicker: 0.06, pause: 450, fade: 950, beat: 650 };
	const PAINT_IN_MS = 1300;
	const SHADOW = 0.35;
	const YEAR_SHADOW_L = 0.55;
	const ARROW_IN_MS = 700;
	const TORCH_BEND = 0.13;
	const TORCH_BEND_CURVE = 1.8;
	const TORCH_CORE_SIZE = 0.42;
	const TORCH_CORE_GAIN = 0.32;
	const SUN_X = 0.672;
	const SUN_Y = 0.578;
	const SUN_LEAD = 0.2;
	const PAINT_W = 2560;
	const PAINT_H = 1707;
	const TITLE_OUT_MS = 480;
	const PAINT_OUT_DELAY_MS = 200;
	const PAINT_OUT_MS = 900;
	const RELEASE_LEAD_MS = 400;
	const SHADOW_BLUR = 14;
	const band = (PLATE_H * dials.bandPct) / 100;
	const startY = PLATE_H + band * 2.0;
	const endY = -band * 2.0;
	const LAYERS = ['deboss-0', 'deboss-1', 'hot-0', 'hot-1', 'shadow', 'shadow-years'];
	// ─────────────────────────────────────────────────────────────────────────────────────────────────

	let titleEl: HTMLDivElement | undefined = $state();
	let plateCanvas: HTMLCanvasElement | undefined = $state();
	let paintCanvas: HTMLCanvasElement | undefined = $state();
	let ground = $state(true);
	let arrowShown = $state(false);
	let arrow = $state(0);
	let leaving = $state(false);
	let hover = $state(false);
	let h = $state(0);
	let failed = $state(false); // no WebGL2: the page shows the plain painting and title, still
	const GOLD = [248, 214, 103];
	const GOLD_LIT = [255, 236, 158];
	const gold = $derived(`rgb(${GOLD.map((c, i) => Math.round(c + (GOLD_LIT[i] - c) * h)).join(' ')})`);

	const ph = [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28];
	const flameAt = (t: number) =>
		Math.sin(t / 61 + ph[0]) * 0.5 + Math.sin(t / 37 + ph[1]) * 0.3 + Math.sin(t / 23 + ph[2]) * 0.2;
	const ease = (k: number) => {
		const c = Math.min(1, Math.max(0, k));
		return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
	};
	/** `ease` above as a CSS curve, for the compositor fades of the exit (easeInOutQuad). */
	const EASE_CSS = 'cubic-bezier(0.455, 0.03, 0.515, 0.955)';

	// ── WebGL plumbing ──────────────────────────────────────────────────────────────────────────────────
	const VERT = `#version 300 es
		in vec2 a; out vec2 uv;
		void main() { uv = vec2(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5); gl_Position = vec4(a, 0.0, 1.0); }`;
	const PLATE_FRAG = `#version 300 es
		precision highp float;
		in vec2 uv; out vec4 o;
		uniform sampler2D D0, D1, H0, H1, S, SY;
		uniform float relief, fade, paint, flame, faint, shadowA, yearA, gain, torchOn;
		uniform vec2 beam, rad;
		const vec2 PLATE = vec2(${PLATE_W}.0, ${PLATE_H}.0);
		// the SVG torch: a radial gradient of 13 stops, opacity flame·exp(−d²/(2·0.33²)), padded past its edge
		float torch(vec2 p, vec2 r) { float d = min(length((p - beam) / r), 1.0); return flame * exp(-(d * d) / (2.0 * 0.1089)); }
		vec4 over(vec4 top, vec4 bot) { return top + bot * (1.0 - top.a); }
		void main() {
			vec2 p = uv * PLATE;
			vec4 d = mix(texture(D0, uv), texture(D1, uv), relief);
			vec4 c = texture(S, uv) * (shadowA * paint);
			c = over(texture(SY, uv) * (shadowA * yearA * paint), c);
			c = over(d * faint, c);
			float t = torchOn * torch(p, rad);
			c = over(d * (fade + t - fade * t), c);
			if (torchOn > 0.5) {
				vec4 hot = mix(texture(H0, uv), texture(H1, uv), relief);
				c = over(hot * (gain * torch(p, rad * ${TORCH_CORE_SIZE})), c);
			}
			o = c;
		}`;
	const PAINT_FRAG = `#version 300 es
		precision highp float;
		in vec2 uv; out vec4 o;
		uniform sampler2D P;
		uniform vec2 view, sun;
		uniform float k, reveal, alphaU, far;
		const vec2 PS = vec2(${PAINT_W}.0, ${PAINT_H}.0);
		void main() {
			vec2 px = uv * view;
			float sc = max(view.x / PS.x, view.y / PS.y);
			vec2 off = (view - PS * sc) * 0.5;
			vec3 rgb = texture(P, (px - off) / (PS * sc)).rgb;
			float a = reveal > 0.5 ? clamp(k * (1.0 + ${SUN_LEAD}) - ${SUN_LEAD} * length(px - sun) / far, 0.0, 1.0) : alphaU;
			o = vec4(rgb * a, a);
		}`;

	type GL = { gl: WebGL2RenderingContext; prog: WebGLProgram; u: (n: string) => WebGLUniformLocation | null };
	function setup(canvas: HTMLCanvasElement, frag: string): GL | null {
		const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false });
		if (!gl) return null;
		const sh = (type: number, src: string) => {
			const s = gl.createShader(type)!;
			gl.shaderSource(s, src);
			gl.compileShader(s);
			if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
			return s;
		};
		const prog = gl.createProgram()!;
		gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
		gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
		gl.linkProgram(prog);
		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link');
		gl.useProgram(prog);
		const buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		const loc = gl.getAttribLocation(prog, 'a');
		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
		const cache = new Map<string, WebGLUniformLocation | null>();
		const u = (n: string) => {
			if (!cache.has(n)) cache.set(n, gl.getUniformLocation(prog, n));
			return cache.get(n)!;
		};
		return { gl, prog, u };
	}
	function texture(g: GL, unit: number, name: string, img: HTMLImageElement, mipmap: boolean) {
		const { gl } = g;
		const t = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, t);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		if (mipmap) {
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		} else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.uniform1i(g.u(name), unit);
	}
	const load = (src: string) =>
		new Promise<HTMLImageElement>((res, rej) => {
			const i = new Image();
			i.onload = () => res(i);
			i.onerror = rej;
			i.src = src;
		});
	/** Size a canvas's drawing buffer to its CSS box at the device's pixel ratio. */
	function fit(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = Math.round(canvas.clientWidth * dpr);
		const hh = Math.round(canvas.clientHeight * dpr);
		if (canvas.width !== w || canvas.height !== hh) {
			canvas.width = w;
			canvas.height = hh;
		}
		gl.viewport(0, 0, w, hh);
	}
	const draw = (g: GL) => {
		g.gl.clearColor(0, 0, 0, 0);
		g.gl.clear(g.gl.COLOR_BUFFER_BIT);
		g.gl.drawArrays(g.gl.TRIANGLE_STRIP, 0, 4);
	};

	let raf = 0;
	let enter = () => {};
	onMount(() => {
		let alive = true;
		let plate: GL | null = null;
		let paintGL: GL | null = null;
		try {
			plate = setup(plateCanvas!, PLATE_FRAG);
			paintGL = setup(paintCanvas!, PAINT_FRAG);
		} catch (e) {
			console.error('[IntroGL]', e);
		}
		// NO WEBGL2: the original SVG intro takes over (it holds the scroll itself), so nobody is left on a
		// title with no way in.
		if (!plate || !paintGL) {
			failed = true;
			return;
		}
		holdIntroScroll(); // the test page too, so it is laid out exactly like `/` (no scrollbar gutter)
		const P = plate;
		const G = paintGL;
		const reduce = prefersReducedMotion.current;

		void Promise.all([...LAYERS.map((n) => load(`/intro/baked/${n}.webp`)), load(PAINTING)]).then((imgs) => {
			if (!alive) return;
			P.gl.useProgram(P.prog);
			['D0', 'D1', 'H0', 'H1', 'S', 'SY'].forEach((n, i) => texture(P, i, n, imgs[i], false));
			G.gl.useProgram(G.prog);
			texture(G, 0, 'P', imgs[6], true);

			// THE CLOCK — IntroOverlay's frame(), the same values, drawn on the GPU.
			// TEST ONLY: `?seek=<ms>` draws the single frame at that moment of the clock and stops (for comparing
			// stills against the live intro).
			const seekParam = test ? new URLSearchParams(location.search).get('seek') : null;
			const seek = seekParam != null ? Number(seekParam) : null;
			let t0 = seek != null ? performance.now() - seek : performance.now();
			let last = t0;
			let shown0 = 0;
			let out0 = 0;
			if (!reduce || test)
				enter = () => {
					if (!arrowShown || out0) return;
					out0 = performance.now() - t0;
					leaving = true;
					exit();
				};
			const frame = (now: number) => {
				if (!alive) return;
				const t = reduce ? 1e9 : seek != null ? seek : now - t0;
				const dt = now - last;
				last = now;
				h += ((hover ? 1 : 0) - h) * (1 - Math.exp(-dt / 110));
				const up0 = dials.hold;
				const fade0 = up0 + dials.sweep + dials.pause;
				const paint0 = fade0 + dials.fade + dials.beat;
				const n = flameAt(t);
				const flame = 1 - dials.flicker * (0.5 - 0.5 * n);
				const flameSize = 1 + dials.flicker * 0.5 * n;
				const up = t < up0 ? 0 : t < up0 + dials.sweep ? ease((t - up0) / dials.sweep) : 1;
				const beamY = startY + (endY - startY) * up;
				const beamX = PLATE_W / 2 + PLATE_W * TORCH_BEND * Math.pow(up, TORCH_BEND_CURVE);
				const fade = ease((t - fade0) / dials.fade);
				const paint = ease((t - paint0) / PAINT_IN_MS);
				const relief = paint;
				if (paint >= 1) ground = false;
				if (!arrowShown && paint >= 1 && (test || intro.ready)) {
					arrowShown = true;
					shown0 = t;
				}
				if (arrowShown) arrow = seek != null ? ease((t - (dials.hold + dials.sweep + dials.pause + dials.fade + dials.beat + PAINT_IN_MS)) / ARROW_IN_MS) : ease((t - shown0) / ARROW_IN_MS);

				// the title
				fit(plateCanvas!, P.gl);
				P.gl.useProgram(P.prog);
				P.gl.uniform1f(P.u('relief'), relief);
				P.gl.uniform1f(P.u('fade'), fade);
				P.gl.uniform1f(P.u('paint'), paint);
				P.gl.uniform1f(P.u('flame'), flame);
				P.gl.uniform1f(P.u('faint'), FAINT);
				P.gl.uniform1f(P.u('shadowA'), SHADOW);
				P.gl.uniform1f(P.u('yearA'), YEAR_SHADOW_L);
				P.gl.uniform1f(P.u('gain'), TORCH_CORE_GAIN);
				P.gl.uniform1f(P.u('torchOn'), reduce ? 0 : 1);
				P.gl.uniform2f(P.u('beam'), beamX, beamY);
				P.gl.uniform2f(
					P.u('rad'),
					((PLATE_W * dials.widthPct) / 100) * 1.4 * flameSize,
					band * 2.2 * flameSize
				);
				draw(P);

				// the painting, sun first
				fit(paintCanvas!, G.gl);
				const W = innerWidth;
				const H = innerHeight;
				const sc = Math.max(W / PAINT_W, H / PAINT_H);
				const sx = (W - PAINT_W * sc) / 2 + SUN_X * PAINT_W * sc;
				const sy = (H - PAINT_H * sc) / 2 + SUN_Y * PAINT_H * sc;
				const far = Math.max(Math.hypot(sx, sy), Math.hypot(W - sx, sy), Math.hypot(sx, H - sy), Math.hypot(W - sx, H - sy));
				G.gl.useProgram(G.prog);
				G.gl.uniform2f(G.u('view'), W, H);
				G.gl.uniform2f(G.u('sun'), sx, sy);
				G.gl.uniform1f(G.u('far'), far);
				G.gl.uniform1f(G.u('k'), paint);
				G.gl.uniform1f(G.u('reveal'), paint > 0 && paint < 1 ? 1 : 0);
				G.gl.uniform1f(G.u('alphaU'), paint);
				draw(G);

				// once the painting is full and nothing is changing but the flame's flicker (which the torch no
				// longer shows) and the arrow, keep the loop only for the arrow's fade and hover
				if (!out0 && seek == null) raf = requestAnimationFrame(frame);
			};
			// THE GPU'S FIRST DRAW IS SLOW (~65ms in Sam's Safari: the layers are uploaded then), so it is spent
			// HERE, on a frame drawn at t = 0 before the clock starts — the faint plate, standing still — and the
			// clock starts on the frame after, with nothing left to upload.
			if (seek != null) raf = requestAnimationFrame(frame);
			else {
				frame(t0);
				cancelAnimationFrame(raf);
				raf = requestAnimationFrame(() => {
					t0 = last = performance.now();
					raf = requestAnimationFrame(frame);
				});
			}
		});

		// THE EXIT — compositor fades, so nothing on the main thread can stall them. The title and arrow go first,
		// the painting a beat behind (its 200ms wait written into the keyframes, not a delay: Safari keeps a
		// delayed animation off its compositor until the delay ends).
		function exit() {
			cancelAnimationFrame(raf);
			const total = PAINT_OUT_DELAY_MS + PAINT_OUT_MS;
			titleEl?.animate([{ opacity: 1, easing: EASE_CSS }, { opacity: 0 }], { duration: TITLE_OUT_MS, fill: 'forwards' });
			paintCanvas?.animate(
				[
					{ opacity: 1, offset: 0 },
					{ opacity: 1, offset: PAINT_OUT_DELAY_MS / total, easing: EASE_CSS },
					{ opacity: 0, offset: 1 }
				],
				{ duration: total, fill: 'forwards' }
			);
			if (test) {
				setTimeout(() => alive && ondone?.(), total);
				return;
			}
			setTimeout(() => alive && releaseIntro(), total - RELEASE_LEAD_MS);
			setTimeout(() => {
				if (!alive) return;
				releaseIntroGutter();
				endIntro();
			}, total);
		}
		if (reduce && !test)
			enter = () => {
				releaseIntroScroll();
				releaseIntro();
				endIntro();
			};

		return () => {
			alive = false;
			cancelAnimationFrame(raf);
			if (test) releaseIntroScroll();
		};
	});

	function onkey(e: KeyboardEvent) {
		if (!arrowShown || leaving) return;
		if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') {
			e.preventDefault();
			enter();
		}
	}
</script>

<svelte:head>
	<link rel="preload" as="image" href={PAINTING} />
	{#each LAYERS as n (n)}<link rel="preload" as="image" href="/intro/baked/{n}.webp" />{/each}
</svelte:head>

<svelte:window onkeydown={onkey} />

{#if failed}
	<IntroOverlay />
{:else}
<div class="intro" class:ground class:leaving style:--intro-ground={GROUND}>
	<canvas class="painting" bind:this={paintCanvas}></canvas>
	<div class="title" bind:this={titleEl}>
		<canvas class="plate" bind:this={plateCanvas}></canvas>
		{#if arrowShown}
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
					<defs>
						<filter id="introgl-shadow" x="-6%" y="-20%" width="112%" height="140%" color-interpolation-filters="sRGB">
							<feGaussianBlur in="SourceAlpha" stdDeviation={SHADOW_BLUR} />
							<feOffset dy={SHADOW_BLUR * 0.35} result="soft" />
							<feFlood flood-color="#140d06" />
							<feComposite in2="soft" operator="in" />
						</filter>
						<filter id="introgl-deboss-soft" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
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
							<feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="shade" /><feMergeNode in="glint" /></feMerge>
						</filter>
					</defs>
					<g filter="url(#introgl-shadow)" opacity={SHADOW * 0.5}>
						<circle class="ring" r="50" />
						<g transform="translate({h * 5} 0)">
							<path class="arrow" d="M-23 0 H23" />
							<path class="arrow" d="M9 -14 L24 0 L9 14" />
						</g>
					</g>
					<g filter="url(#introgl-deboss-soft)">
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
{/if}

<style>
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
		pointer-events: auto;
	}
	.painting {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.intro.leaving {
		pointer-events: none;
	}
	.title {
		position: relative;
		width: min(480px, 82vw);
	}
	.plate {
		display: block;
		width: 100%;
		aspect-ratio: 1600 / 660;
	}
	.enter {
		position: absolute;
		left: 50%;
		top: calc(100% + 0.5in - 2.5% - 10px);
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
		stroke-width: 6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.ring {
		fill: none;
		stroke: var(--gold, #f8d667);
		stroke-width: 4.8;
	}
</style>
