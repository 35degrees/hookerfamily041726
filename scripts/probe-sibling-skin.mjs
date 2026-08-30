/**
 * probe-sibling-skin.mjs — the SIBLING exchange's SKIN, both halves of it (083026).
 *
 * Two of Sam's four sibling-chip complaints were one bug, and this probe is built around the
 * arithmetic that proves it. A flight does not resize the card, it SCALES the shell, so every
 * absolute length authored inside that shell is multiplied by the scale. A sibling chip is 119×54
 * against a 925px card, so the scale reaches ~0.129 — and an 8px corner radius renders as 1px
 * while a 12px shadow blur renders as 1.5px. Sam: "when the transitioning sibling chip is in
 * flight, all of its corners are squared off", and "it doesn't have a drop-shadow during flight,
 * but then when it is settled into final position, the drop-shadow appears."
 *
 * IT WATCHES BOTH LANES, AND THAT IS THE LESSON THAT BUILT IT. The first version selected "the
 * .featured-flight with the smallest scale" and came back red against a fix that was already
 * working — because a sibling promotion puts TWO flight nodes on screen and it had latched onto
 * the wrong one. The demote (shrinkTo, a tick) shrinks 1 → 0.129; the promote (growFrom, a css
 * string) grows 0.129 → 1 and had the identical bug in reverse, unreported only because Sam
 * described the chip he was watching. Selecting by BEHAVIOUR found the accident; selecting by
 * IDENTITY (the .demoting class) is what makes the result mean something. Both lanes are asserted
 * now so neither half of one exchange can drift from the other.
 *
 * THE ASSERTION IS A PRODUCT, NOT A VALUE. The fix publishes counter-scale ratios from each
 * transition (--r-kx = 1/Sx, --shadow-k = 1/√(Sx·Sy)) which FeaturedCard multiplies its authored
 * lengths by, so the authored radius climbs as the shell shrinks and what must hold still is the
 * RENDERED size. Asserting the authored value would pass on the broken build — it was a constant
 * 8 the whole time. The product is what separates "8px on paper" from "8px on screen".
 *
 *   A  rendered corner radius = CORNER_R · r_kx · Sx  holds ≈8px across BOTH lanes
 *   B  rendered shadow blur   = 12px · shadow_k · √(Sx·Sy)  holds ≈12px across BOTH lanes
 *   C  each lane really does reach chip scale — else A and B pass vacuously
 *   D  SETTLE, reported not asserted: the demote's travel and peak overshoot, the numbers behind
 *      Sam's "it feels like a tic, not a rubber band".
 *
 * Dev server up on :5173.  Run: node scripts/probe-sibling-skin.mjs
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const CORNER_R = 8; // FeaturedCard's authored radius — the thing being counter-scaled
const CHIP_BLUR = 9.6; // --chip-shadow's outer blur — the shadow the demote must LAND on, not cut to

// The three navs probe-sibling-seat.mjs uses, so a skin regression surfaces on the same geometries
// the seat probe already guards (plain list, windowed strip, leading tier header).
const CASES = [
	{ name: 'plain list', start: 'john-morgan-1837', click: 'mary-burns-1844' },
	{ name: 'windowed strip', start: 'elnathan-strong-1783', click: 'florella-strong-1769' },
	{ name: 'leading header', start: 'anne-vanderbilt-1931', click: 'emily-vanderbilt-1925' }
];

const SKIN_TOL = 1.6; // px — how far the RENDERED radius/blur may drift from its authored size
const CHIP_SCALE_MAX = 0.35; // a lane must actually reach chip scale, or its A/B prove nothing

async function openPanel(page) {
	if (await page.locator('.sibling-window').count()) return;
	await page.click('.sibling-trigger');
	await page.waitForSelector('.sibling-window', { timeout: 5000 });
}

/** Samples every frame, splitting by IDENTITY: `.demoting` is the leaving card, any other
 *  transformed flight node is the arriving one. Runs in-page so each sample is a real frame. */
function collect(ms) {
	return new Promise((resolve) => {
		const out = { demote: [], promote: [] };
		const t0 = performance.now();
		const tick = () => {
			const t = performance.now() - t0;
			for (const el of document.querySelectorAll('.featured-flight')) {
				const cs = getComputedStyle(el);
				if (cs.transform === 'none') continue; // at rest, not in flight
				const m = new DOMMatrixReadOnly(cs.transform);
				// The FACE that lands — the chip-face, or on a §19 sibling mutation the seat clone.
				// Its net on-screen scale is read from the DOM (rect ÷ layout width) rather than
				// recomputed from U/V, so the probe cannot agree with the code by sharing its algebra.
				let faceBlur = null;
				let faceOp = 0;
				for (const f of el.querySelectorAll('*')) {
					const inline = f.style?.filter || '';
					if (!inline.includes('drop-shadow')) continue;
					const hit = /drop-shadow\(0 [\d.]+px ([\d.]+)px/.exec(inline);
					const ow = f.offsetWidth;
					if (!hit || !ow) continue;
					const op = parseFloat(getComputedStyle(f).opacity) || 0;
					if (op < faceOp) continue; // the visible one wins if both exist
					faceOp = op;
					faceBlur = parseFloat(hit[1]) * (f.getBoundingClientRect().width / ow);
				}
				out[el.classList.contains('demoting') ? 'demote' : 'promote'].push({
					t,
					sx: m.a,
					sy: m.d,
					tx: m.e,
					ty: m.f,
					rkx: parseFloat(cs.getPropertyValue('--r-kx')) || 1,
					rky: parseFloat(cs.getPropertyValue('--r-ky')) || 1,
					sk: parseFloat(cs.getPropertyValue('--shadow-k')) || 1,
					faceBlur,
					faceOp
				});
			}
			if (performance.now() - t0 < ms) requestAnimationFrame(tick);
			else resolve(out);
		};
		requestAnimationFrame(tick);
	});
}

const worstOf = (arr, want) =>
	arr.reduce((w, v) => (Math.abs(v - want) > Math.abs(w - want) ? v : w), want);

const fails = [];
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1600, height: 1000 });

console.log('── sibling exchange: rendered skin on both lanes, and the demote settle ──');

for (const c of CASES) {
	await page.goto(`${BASE}/person/${c.start}`, { waitUntil: 'networkidle' });
	await openPanel(page);
	await page.waitForSelector(`.sibling-strip a[href="/person/${c.click}"]`, { timeout: 5000 });

	const pending = page.evaluate(collect, 1400);
	await page.click(`.sibling-strip a[href="/person/${c.click}"]`);
	const lanes = await pending;

	for (const lane of ['demote', 'promote']) {
		const s = lanes[lane];
		if (s.length < 8) {
			fails.push(`${c.name}/${lane}: only ${s.length} flight frames — the gesture did not run`);
			continue;
		}
		const minSx = Math.min(...s.map((f) => f.sx));
		if (minSx > CHIP_SCALE_MAX)
			fails.push(`${c.name}/${lane}: only reached Sx=${minSx.toFixed(3)} — never chip scale`);

		// A/B — the PRODUCTS. Authored length × counter-scale × shell scale = what the eye sees.
		const wR = worstOf(
			s.map((f) => CORNER_R * f.rkx * f.sx),
			CORNER_R
		);
		const wRy = worstOf(
			s.map((f) => CORNER_R * f.rky * f.sy),
			CORNER_R
		);
		// B — THE LANDING SHADOW. Once the face is the thing being seen, its shadow must already be
		// the SEATED chip's, or the atomic swap changes the shadow's size in one frame — which is
		// what Sam reported after the counter-scale first went in ("the drop shadow on the right
		// instantly gets cut in half"). Measured only while the face is actually visible: a shadow
		// under a transparent face is paint nobody sees, and asserting it would be noise.
		const vis = s.filter((f) => f.faceBlur !== null && f.faceOp > 0.5);
		const wB = vis.length ? worstOf(vis.map((f) => f.faceBlur), CHIP_BLUR) : null;
		if (Math.abs(wR - CORNER_R) > SKIN_TOL)
			fails.push(`${c.name}/${lane}: rendered radius drifts to ${wR.toFixed(2)}px (want ~8)`);
		if (Math.abs(wRy - CORNER_R) > SKIN_TOL)
			fails.push(`${c.name}/${lane}: rendered radius-Y drifts to ${wRy.toFixed(2)}px (want ~8)`);
		if (lane === 'demote') {
			if (wB === null) fails.push(`${c.name}/${lane}: no visible face shadow sampled at all`);
			else if (Math.abs(wB - CHIP_BLUR) > SKIN_TOL)
				fails.push(
					`${c.name}/${lane}: face shadow renders ${wB.toFixed(2)}px, seated chip is ${CHIP_BLUR}px ` +
						`— the swap would change the shadow's size`
				);
		}

		// D — the settle, along the travel vector. The demote is the lane Sam is describing.
		let dist = 0;
		let over = 0;
		const a = s[0];
		const z = s[s.length - 1];
		const dx = z.tx - a.tx;
		const dy = z.ty - a.ty;
		dist = Math.hypot(dx, dy);
		if (dist > 1) {
			const ux = dx / dist;
			const uy = dy / dist;
			for (const f of s) over = Math.max(over, (f.tx - a.tx) * ux + (f.ty - a.ty) * uy - dist);
		}
		console.log(
			`  ${c.name.padEnd(15)} ${lane.padEnd(8)} Sx ${a.sx.toFixed(2)}→${z.sx.toFixed(2)} · ` +
				`radius ${wR.toFixed(2)}px · faceShadow ${wB === null ? '—' : wB.toFixed(2) + 'px'} · ` +
				`travel ${dist.toFixed(1)}px · overshoot ${over.toFixed(2)}px`
		);
	}
}

await browser.close();

if (fails.length) {
	console.log('\nSIBLING SKIN PROBE: RED');
	for (const f of fails) console.log(`  ✗ ${f}`);
	process.exit(1);
}
console.log('\nSIBLING SKIN PROBE: GREEN — corner radius and drop shadow hold their rendered size');
