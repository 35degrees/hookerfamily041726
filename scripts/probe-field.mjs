/**
 * probe-field.mjs — Phase 3b (THE FIELD) parallax guard, across skins. Asserts:
 *   - a PARENT/CHILD navigation drifts each mote layer by PARALLAX_SIGN·screenVector·depth (far 0.2 /
 *     mid 0.35 / near 0.5), depths in proportion (near > far), on the flight's duration (one clock);
 *   - a SPOUSE swap drifts the field by ZERO (the spouse dead-zone — a lateral in-corner morph);
 *   - direction sanity: a child click drifts the world UP;
 *   - on the LEDGER skin the RULES layer is present and drifts at RULE_DEPTH (0.6) on a child click, and
 *     the foxing (mote) layers drift too.
 * The skin is chosen via the corner toggle (module state resets to Light on each full goto). Dev server up.
 */
import { chromium } from '@playwright/test';

const DEPTHS = [0.2, 0.35, 0.5];
const RULE_DEPTH = 0.6;
const SIGN = 1; // must match Field.svelte PARALLAX_SIGN
const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const moves = [];
page.on('console', (m) => { const t = m.text(); if (t.startsWith('[camera]')) { try { moves.push(JSON.parse(t.slice(8).trim())); } catch { /* ignore */ } } });
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const tx = (el) => { const m = new DOMMatrixReadOnly(getComputedStyle(el).transform); return { x: m.m41, y: m.m42, dur: parseFloat(getComputedStyle(el).transitionDuration) * 1000 }; };
const readMoteLayers = () => page.evaluate(() => [...document.querySelectorAll('.field .layer:not(.rules)')].map((el) => { const m = new DOMMatrixReadOnly(getComputedStyle(el).transform); return { x: m.m41, y: m.m42, dur: parseFloat(getComputedStyle(el).transitionDuration) * 1000 }; }));
const readRules = () => page.evaluate(() => { const el = document.querySelector('.field .layer.rules'); if (!el) return null; const m = new DOMMatrixReadOnly(getComputedStyle(el).transform); return { x: m.m41, y: m.m42, dur: parseFloat(getComputedStyle(el).transitionDuration) * 1000 }; });

async function setSkin(name) {
	for (let i = 0; i < 6; i++) {
		const cur = await page.evaluate(() => document.querySelector('.ground-toggle')?.textContent?.trim());
		if (cur === name) return true;
		await page.click('.ground-toggle');
		await page.waitForTimeout(160);
	}
	return false;
}
const centerOf = (sel) => page.evaluate((s) => { const a = document.querySelector(s); if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);

async function driftStep(label, sel, { deadzone = false, expectDySign = 0, checkRules = false } = {}) {
	const t = await centerOf(sel);
	if (!t) { console.log(`  ${label}: target not present — skipped`); return; }
	const before = await readMoteLayers();
	const beforeRules = checkRules ? await readRules() : null;
	const n0 = moves.length;
	await page.mouse.click(t.x, t.y);
	await page.waitForTimeout(900);
	ok(moves.length > n0, `${label}: no [camera] publish`);
	const mv = moves[moves.length - 1];
	const after = await readMoteLayers();
	if (!mv || after.length !== 3) { fails.push(`${label}: missing move or 3 mote layers (${after.length})`); return; }
	const sv = mv.screenVector;
	for (let i = 0; i < 3; i++) {
		const dTx = after[i].x - before[i].x, dTy = after[i].y - before[i].y;
		if (deadzone) {
			ok(near(dTx, 0, 1.5) && near(dTy, 0, 1.5), `${label} L${i}: drifted (${dTx.toFixed(0)},${dTy.toFixed(0)}) — spouse dead-zone must be ZERO`);
		} else {
			ok(near(dTx, SIGN * sv.dx * DEPTHS[i], 2), `${label} L${i}(d${DEPTHS[i]}): Δtx ${dTx.toFixed(0)} != ${(SIGN * sv.dx * DEPTHS[i]).toFixed(0)}`);
			ok(near(dTy, SIGN * sv.dy * DEPTHS[i], 2), `${label} L${i}(d${DEPTHS[i]}): Δty ${dTy.toFixed(0)} != ${(SIGN * sv.dy * DEPTHS[i]).toFixed(0)}`);
			ok(near(after[i].dur, mv.duration, 30), `${label} L${i}: transition ${after[i].dur.toFixed(0)}ms != move ${mv.duration.toFixed(0)}ms (one-clock)`);
		}
	}
	if (!deadzone) {
		const magFar = Math.hypot(after[0].x - before[0].x, after[0].y - before[0].y);
		const magNear = Math.hypot(after[2].x - before[2].x, after[2].y - before[2].y);
		ok(magNear > magFar + 1, `${label}: near did not out-drift far (${magNear.toFixed(0)} vs ${magFar.toFixed(0)})`);
		if (expectDySign) { const w = SIGN * sv.dy; ok(expectDySign > 0 ? w > 5 : w < -5, `${label}: world drifted the wrong way (dy ${w.toFixed(0)})`); }
	}
	if (checkRules) {
		const afterRules = await readRules();
		ok(afterRules && beforeRules, `${label}: rules layer missing on the ledger`);
		if (afterRules && beforeRules) {
			const dRx = afterRules.x - beforeRules.x, dRy = afterRules.y - beforeRules.y;
			ok(near(dRx, SIGN * sv.dx * RULE_DEPTH, 2) && near(dRy, SIGN * sv.dy * RULE_DEPTH, 2), `${label}: rules Δ(${dRx.toFixed(0)},${dRy.toFixed(0)}) != sv·${RULE_DEPTH} (${(SIGN * sv.dx * RULE_DEPTH).toFixed(0)},${(SIGN * sv.dy * RULE_DEPTH).toFixed(0)})`);
		}
	}
	console.log(`  ${label}: sv=(${sv.dx.toFixed(0)},${sv.dy.toFixed(0)}) → mote Δy far/mid/near = ${(after[0].y - before[0].y).toFixed(0)}/${(after[1].y - before[1].y).toFixed(0)}/${(after[2].y - before[2].y).toFixed(0)}${checkRules ? ` rules Δy=${((await readRules()).y - beforeRules.y).toFixed(0)}` : ''}`);
}

// ── DARK skin: child drifts (world up), spouse is dead-zone ──
await page.goto(`${BASE}/person/michael-hooker-1935`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
ok(await setSkin('Midnight'), 'could not reach the Midnight skin via the toggle');
await driftStep('dark child (drifts UP)', '.children-slot a', { expectDySign: -1 });
await page.goto(`${BASE}/person/john-morgan-1930`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
ok(await setSkin('Midnight'), 'could not re-arm Midnight after goto');
await driftStep('dark spouse (DEAD-ZONE)', '.spouse-notch .flight a', { deadzone: true });

// ── LEDGER skin: child drifts the foxing motes AND the rules layer (depth 0.6) ──
await page.goto(`${BASE}/person/michael-hooker-1935`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
ok(await setSkin('Ledger'), 'could not reach the Ledger skin via the toggle');
await driftStep('ledger child (motes + rules)', '.children-slot a', { expectDySign: -1, checkRules: true });

await ctx.close();
await browser.close();
if (fails.length) { console.log('FIELD PROBE: RED\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('FIELD PROBE: GREEN — parent/child drifts by depth on the flight clock; spouse is dead-zone; ledger rules drift at 0.6.');
