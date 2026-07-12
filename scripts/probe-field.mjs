/**
 * probe-field.mjs — Phase 3b Block 1 (THE FIELD) parallax guard. Clicks a CHILD (hero travels up) and a
 * SPOUSE (lateral), reads the [camera] publish + each mote layer's settled transform, and asserts:
 *   - each layer translated PARALLAX_SIGN · screenVector · depth (far 0.2 / mid 0.35 / near 0.5),
 *   - the depths are in proportion (near drifts more than far),
 *   - direction sanity: a child click drifts the world UP (dy < 0) — the §3.5 intent.
 * The transition duration on each layer equals the flight/camera duration (one clock). Dev server up.
 */
import { chromium } from '@playwright/test';

const DEPTHS = [0.2, 0.35, 0.5];
const SIGN = 1; // must match Field.svelte PARALLAX_SIGN
const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const moves = [];
page.on('console', (m) => {
	const t = m.text();
	if (t.startsWith('[camera]')) { try { moves.push(JSON.parse(t.slice(8).trim())); } catch { /* ignore */ } }
});
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// read each layer's current translate (tx,ty) from its computed matrix + its transition duration (ms)
const readLayers = () =>
	page.evaluate(() => [...document.querySelectorAll('.field .layer')].map((el) => {
		const cs = getComputedStyle(el);
		const m = new DOMMatrixReadOnly(cs.transform);
		const durStr = cs.transitionDuration.split(',')[0].trim();
		const dur = durStr.endsWith('ms') ? parseFloat(durStr) : parseFloat(durStr) * 1000;
		return { tx: m.m41, ty: m.m42, dur };
	}));

async function step(label, sel, expectDySign) {
	const t = await page.evaluate((s) => {
		const a = document.querySelector(s);
		if (!a) return null;
		const r = a.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}, sel);
	if (!t) { console.log(`  ${label}: target not present — skipped`); return; }
	const before = await readLayers();
	const n0 = moves.length;
	await page.mouse.click(t.x, t.y);
	await page.waitForTimeout(900); // let the parallax settle
	ok(moves.length > n0, `${label}: no [camera] publish`);
	const mv = moves[moves.length - 1];
	const after = await readLayers();
	if (!mv || after.length !== 3) { fails.push(`${label}: missing move or layers (${after.length})`); return; }
	const sv = mv.screenVector;
	for (let i = 0; i < 3; i++) {
		const dTx = after[i].tx - before[i].tx;
		const dTy = after[i].ty - before[i].ty;
		const expX = SIGN * sv.dx * DEPTHS[i];
		const expY = SIGN * sv.dy * DEPTHS[i];
		ok(near(dTx, expX, 2), `${label} L${i}(d${DEPTHS[i]}): Δtx ${dTx.toFixed(0)} != sign·svx·depth ${expX.toFixed(0)}`);
		ok(near(dTy, expY, 2), `${label} L${i}(d${DEPTHS[i]}): Δty ${dTy.toFixed(0)} != sign·svy·depth ${expY.toFixed(0)}`);
		ok(near(after[i].dur, mv.duration, 30), `${label} L${i}: transition ${after[i].dur.toFixed(0)}ms != move ${mv.duration.toFixed(0)}ms (one-clock)`);
	}
	// proportion: near layer drifts strictly more than far
	const magFar = Math.hypot(after[0].tx - before[0].tx, after[0].ty - before[0].ty);
	const magNear = Math.hypot(after[2].tx - before[2].tx, after[2].ty - before[2].ty);
	ok(magNear > magFar + 1, `${label}: near layer did not out-drift far (${magNear.toFixed(0)} vs ${magFar.toFixed(0)})`);
	if (expectDySign) {
		const worldDy = SIGN * sv.dy;
		ok(expectDySign > 0 ? worldDy > 5 : worldDy < -5, `${label}: world drifted the wrong way (dy ${worldDy.toFixed(0)}, expected ${expectDySign > 0 ? 'down' : 'up'})`);
	}
	console.log(`  ${label}: sv=(${sv.dx.toFixed(0)},${sv.dy.toFixed(0)}) dur=${mv.duration.toFixed(0)} → far/mid/near Δy = ${(after[0].ty - before[0].ty).toFixed(0)}/${(after[1].ty - before[1].ty).toFixed(0)}/${(after[2].ty - before[2].ty).toFixed(0)}`);
}

await page.goto(`${BASE}/person/michael-hooker-1935`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await step('child (world drifts UP)', '.children-slot a', -1); // hero up → world up
await page.goto(`${BASE}/person/john-morgan-1930`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await step('spouse (lateral)', '.spouse-notch .flight a', 0);

await ctx.close();
await browser.close();
if (fails.length) { console.log('FIELD PROBE: RED\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('FIELD PROBE: GREEN — layers counter-drift by depth on the flight clock; child click drifts the world up.');
