/**
 * bake-intro-layers.mjs — the intro's title plate, pre-rendered once as images for the WebGL intro.
 *
 * WHY (Oct 19, measured in Sam's Safari): the live intro re-runs a stack of SVG blur filters (the pressed-in
 * edge, the lit gold, the torch's hot core, two drop-shadows) on EVERY frame, because the torch, the fade and
 * the deboss→emboss change their masks and flood opacities. Safari runs SVG filters on the CPU: ~80ms a frame,
 * about 12 frames a second for the whole intro. Chrome does it on the GPU at 60. So the filters are run HERE,
 * once, with the exact same definitions (copied from IntroOverlay.svelte), and the WebGL intro only combines
 * these pictures each frame — which the GPU does in a fraction of a millisecond in any browser.
 *
 * The layers, all on a transparent ground, the plate's 1600×660 drawn at WIDTH px wide:
 *   deboss-0 / deboss-1   the warm-gold letters through the relief filter, pressed in (0) and raised (1)
 *   hot-0 / hot-1         the same, through the hotter gold (the torch's heart)
 *   shadow                the painting shadow under the letters
 *   shadow-years          that shadow again, masked to the year line and tapered left → right
 * The live intro's relief crossfades the filter's flood opacities 0 → 1; mixing deboss-0 and deboss-1 by the
 * same amount reproduces it (each flood term is linear in `relief`).
 *
 * Run with the numbers below matching IntroOverlay.svelte. Re-run after changing any of them:
 *   node scripts/intro/bake-intro-layers.mjs
 */
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const PLATE_W = 1600;
const PLATE_H = 660;
// BAKE_WIDTH / BAKE_OUT / BAKE_ONLY override the defaults for a one-off render — the favicon (favicon.py) takes
// deboss-1 at the plate's native 1600 into a scratch folder. Unset, this bakes the intro exactly as before.
const WIDTH = Number(process.env.BAKE_WIDTH) || 960; // the plate shows at most 480 CSS px wide (min(480px, 82vw)); ×2 for Retina, ×3 phones ≈ 966
const HEIGHT = Math.round((WIDTH * PLATE_H) / PLATE_W);
// ── copied from IntroOverlay.svelte — keep in step ─────────────────────────────────────────────────────
const SHADOW_BLUR = 14;
const EMBOSS_LIGHT = 0.4;
const EMBOSS_SHADE = 0.5;
const YEAR_SHADOW_L = 0.55;
const YEAR_SHADOW_R = 0.3;
// ──────────────────────────────────────────────────────────────────────────────────────────────────────
const OUT = process.env.BAKE_OUT || 'static/intro/baked';
const ONLY = process.env.BAKE_ONLY ? process.env.BAKE_ONLY.split(',') : null;

const src = `data:image/webp;base64,${readFileSync('static/intro/title-plate-1600.webp').toString('base64')}`;

const deboss = (relief) => `
	<filter id="deboss" x="-3%" y="-8%" width="106%" height="116%" color-interpolation-filters="sRGB">
		<feOffset in="SourceAlpha" dy="7" result="down" />
		<feComposite in="SourceAlpha" in2="down" operator="out" result="topBand" />
		<feGaussianBlur in="topBand" stdDeviation="2.5" result="topSoft" />
		<feComposite in="topSoft" in2="SourceAlpha" operator="in" result="topIn" />
		<feFlood flood-color="#1e1408" flood-opacity="${0.72 * (1 - relief)}" />
		<feComposite in2="topIn" operator="in" result="shade" />
		<feFlood flood-color="#fff6c8" flood-opacity="${EMBOSS_LIGHT * relief}" />
		<feComposite in2="topIn" operator="in" result="topLight" />
		<feOffset in="SourceAlpha" dy="-5" result="up" />
		<feComposite in="SourceAlpha" in2="up" operator="out" result="botBand" />
		<feGaussianBlur in="botBand" stdDeviation="2" result="botSoft" />
		<feComposite in="botSoft" in2="SourceAlpha" operator="in" result="botIn" />
		<feFlood flood-color="#fff6c8" flood-opacity="${0.45 * (1 - relief)}" />
		<feComposite in2="botIn" operator="in" result="glint" />
		<feFlood flood-color="#1e1408" flood-opacity="${EMBOSS_SHADE * relief}" />
		<feComposite in2="botIn" operator="in" result="botShade" />
		<feOffset in="SourceAlpha" dy="-3" result="up2" />
		<feComposite in="up2" in2="SourceAlpha" operator="out" result="lipBand" />
		<feGaussianBlur in="lipBand" stdDeviation="2" result="lipSoft" />
		<feFlood flood-color="#120c05" flood-opacity="${0.45 * (1 - relief)}" />
		<feComposite in2="lipSoft" operator="in" result="lip" />
		<feMerge>
			<feMergeNode in="lip" /><feMergeNode in="SourceGraphic" /><feMergeNode in="shade" />
			<feMergeNode in="glint" /><feMergeNode in="topLight" /><feMergeNode in="botShade" />
		</feMerge>
	</filter>`;
const common = `
	<filter id="warmgold" color-interpolation-filters="sRGB">
		<feColorMatrix type="matrix" values="1.00 0 0 0 0  0 0.90 0 0 0  0 0 0.62 0 0  0 0 0 1 0" />
	</filter>
	<filter id="hotgold" color-interpolation-filters="sRGB">
		<feColorMatrix type="matrix" values="1.00 0 0 0 0.10  0 0.96 0 0 0.10  0 0 0.70 0 0.05  0 0 0 1 0" />
	</filter>
	<filter id="shadow" x="-6%" y="-20%" width="112%" height="140%" color-interpolation-filters="sRGB">
		<feGaussianBlur in="SourceAlpha" stdDeviation="${SHADOW_BLUR}" />
		<feOffset dy="${SHADOW_BLUR * 0.35}" result="soft" />
		<feFlood flood-color="#140d06" />
		<feComposite in2="soft" operator="in" />
	</filter>
	<linearGradient id="years-taper" gradientUnits="userSpaceOnUse" x1="531" y1="0" x2="1069" y2="0">
		<stop offset="0" stop-color="white" stop-opacity="1" />
		<stop offset="0.45" stop-color="white" stop-opacity="1" />
		<stop offset="1" stop-color="white" stop-opacity="${YEAR_SHADOW_R / YEAR_SHADOW_L}" />
	</linearGradient>
	<mask id="years" maskUnits="userSpaceOnUse" x="0" y="0" width="${PLATE_W}" height="${PLATE_H}">
		<rect x="400" y="540" width="800" height="${PLATE_H - 540}" fill="url(#years-taper)" />
	</mask>`;
const img = (f) => `<image href="${src}" width="${PLATE_W}" height="${PLATE_H}"${f ? ` filter="url(#${f})"` : ''} />`;
const layers = {
	'deboss-0': [deboss(0), `<g filter="url(#deboss)">${img('warmgold')}</g>`],
	'deboss-1': [deboss(1), `<g filter="url(#deboss)">${img('warmgold')}</g>`],
	'hot-0': [deboss(0), `<g filter="url(#deboss)">${img('hotgold')}</g>`],
	'hot-1': [deboss(1), `<g filter="url(#deboss)">${img('hotgold')}</g>`],
	shadow: ['', `<g filter="url(#shadow)">${img()}</g>`],
	'shadow-years': ['', `<g mask="url(#years)"><g filter="url(#shadow)">${img()}</g></g>`]
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
for (const [name, [defs, body]] of Object.entries(layers)) {
	if (ONLY && !ONLY.includes(name)) continue;
	await page.setContent(
		`<html><body style="margin:0;background:transparent"><svg id="p" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${PLATE_W} ${PLATE_H}" style="display:block"><defs>${common}${defs}</defs>${body}</svg></body></html>`
	);
	await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 5000 }).catch(() => {});
	await page.waitForTimeout(300);
	const png = await page.locator('#p').screenshot({ omitBackground: true });
	const pngPath = `${OUT}/${name}.png`;
	writeFileSync(pngPath, png);
	// lossless WebP keeps the soft edges exact; the files are small because most of the plate is empty
	execFileSync('python3', ['-c', `from PIL import Image; Image.open('${pngPath}').save('${OUT}/${name}.webp', 'WEBP', lossless=True, quality=100, method=6)`]);
	execFileSync('rm', [pngPath]);
	console.log('baked', name);
}
await browser.close();
