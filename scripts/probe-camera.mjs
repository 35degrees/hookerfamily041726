/**
 * probe-camera.mjs — Phase 3a Block 2 plumbing guard. Walks a click path (child → parent →
 * spouse-swap → CC) and, for each warm nav, reads the [camera] publish and asserts it is correct
 * BEFORE any consumer exists:
 *   - a publish fired at capture (kind matches the click),
 *   - screenVector == the measured clicked-box → featured-slot rect delta,
 *   - from/to == the departing / clicked person's table-index coords,
 *   - sign sanity: a child (below) sends the hero UP (dy<0); a parent (above) sends it DOWN (dy>0).
 *
 * Dev server up on :5173.  node scripts/probe-camera.mjs
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const ti = Object.fromEntries(
	JSON.parse(readFileSync('static/data/table-index.json', 'utf8')).map((r) => [r.id, r])
);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const moves = [];
page.on('console', (m) => {
	const t = m.text();
	if (t.startsWith('[camera]')) {
		try {
			moves.push(JSON.parse(t.slice(8).trim()));
		} catch {
			/* ignore */
		}
	}
});
const fails = [];
const ok = (c, msg) => {
	if (!c) fails.push(msg);
};
const near = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= tol;

async function step(label, sel, kind, dySign) {
	const fromId = await page.evaluate(
		() => document.querySelector('.featured-card h1 .font-mono')?.textContent?.trim() ?? null
	);
	const t = await page.evaluate((s) => {
		const a = document.querySelector(s);
		if (!a) return null;
		const box = a.closest('[data-flight-id]');
		const slot = document.querySelector('.featured-slot');
		const oc = a.getBoundingClientRect();
		const dr = slot.getBoundingClientRect();
		return {
			id: box?.dataset.flightId ?? null,
			cx: oc.left + oc.width / 2,
			cy: oc.top + oc.height / 2,
			sv: {
				dx: dr.left + dr.width / 2 - (oc.left + oc.width / 2),
				dy: dr.top + dr.height / 2 - (oc.top + oc.height / 2)
			}
		};
	}, sel);
	if (!t) {
		console.log(`  ${label}: target not present on this card — skipped`);
		return;
	}
	const n0 = moves.length;
	await page.mouse.click(t.cx, t.cy);
	await page.waitForTimeout(350);
	ok(moves.length > n0, `${label}: no [camera] publish fired`);
	const mv = moves[moves.length - 1];
	if (moves.length === n0 || !mv) return;
	ok(mv.kind === kind, `${label}: kind ${mv.kind} != ${kind}`);
	ok(near(mv.screenVector.dx, t.sv.dx, 2) && near(mv.screenVector.dy, t.sv.dy, 2),
		`${label}: screenVector ${JSON.stringify(mv.screenVector)} != measured ${JSON.stringify(t.sv)}`);
	ok(near(mv.distance, Math.hypot(mv.screenVector.dx, mv.screenVector.dy), 1), `${label}: distance != |screenVector|`);
	if (dySign > 0) ok(mv.screenVector.dy > 5, `${label}: expected hero to travel DOWN (dy>0), got ${mv.screenVector.dy.toFixed(0)}`);
	if (dySign < 0) ok(mv.screenVector.dy < -5, `${label}: expected hero to travel UP (dy<0), got ${mv.screenVector.dy.toFixed(0)}`);
	if (t.id && ti[t.id]) {
		ok(mv.to && near(mv.to.x, ti[t.id].x, 0.01), `${label}: to.x ${mv.to?.x} != table-index ${ti[t.id].x}`);
		ok(mv.to && (mv.to.y === ti[t.id].y || near(mv.to.y, ti[t.id].y, 0.01)), `${label}: to.y ${mv.to?.y} != table-index ${ti[t.id].y}`);
	}
	if (fromId && ti[fromId]) {
		ok(mv.from && near(mv.from.x, ti[fromId].x, 0.01), `${label}: from.x ${mv.from?.x} != table-index ${ti[fromId].x} (departing ${fromId})`);
	}
	console.log(
		`  ${label}: kind=${mv.kind} from=${JSON.stringify(mv.from)} to=${JSON.stringify(mv.to)} ` +
			`sv=(${mv.screenVector.dx.toFixed(0)},${mv.screenVector.dy.toFixed(0)}) dist=${mv.distance.toFixed(0)} dur=${mv.duration.toFixed(0)}`
	);
	await page.waitForTimeout(700); // settle the nav before the next step
}

await page.goto(`${BASE}/person/michael-hooker-1935`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await step('parent', '.parents-slot a', 'relative', +1); // parent above → hero travels DOWN
await step('child', '.children-slot a', 'relative', -1); // child below → hero travels UP
await step('spouse', '.spouse-notch .flight a', 'spouse', 0); // lateral swap
// CC — a NON-CHIP navigation: publishes kind 'cc' with a REAL `to` (the target's seat, baked onto the
// anchor as data-tx/ty in regenerate), matching table-index. Three known pairs.
const CC_PAIRS = [
	['michael-hooker-1935', 'Bunker'],
	['michael-hooker-1935', 'Bunker'], // (michael has one CC; repeat is a stability run)
	['nancy-morse-1915', null]
];
for (const [slug, needle] of CC_PAIRS) {
	await page.goto(`${BASE}/person/${slug}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);
	const cc = await page.evaluate((nd) => {
		const links = [...document.querySelectorAll('a[data-cc]')];
		const a = nd ? links.find((x) => x.textContent.includes(nd)) : links[0];
		if (!a || a.dataset.tx == null) return null;
		const r = a.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2, tx: Number(a.dataset.tx), ty: a.dataset.ty === 'null' || a.dataset.ty == null ? null : Number(a.dataset.ty) };
	}, needle);
	if (!cc) { console.log(`  cc(${slug}): no CC with coords — skipped`); continue; }
	const n0 = moves.length;
	await page.mouse.click(cc.x, cc.y);
	await page.waitForTimeout(350);
	ok(moves.length > n0, `cc(${slug}): no [camera] publish`);
	const mv = moves[moves.length - 1];
	if (!mv) continue;
	ok(mv.kind === 'cc', `cc(${slug}): kind ${mv.kind} != cc`);
	ok(mv.to != null, `cc(${slug}): to is null — the CC seat did not reach the camera store`);
	ok(mv.to && near(mv.to.x, cc.tx, 0.01), `cc(${slug}): to.x ${mv.to?.x} != anchor/table-index ${cc.tx}`);
	ok(mv.to && (cc.ty == null ? mv.to.y == null : near(mv.to.y, cc.ty, 0.01)), `cc(${slug}): to.y ${mv.to?.y} != anchor ${cc.ty}`);
	console.log(`  cc(${slug}): kind=cc to=${JSON.stringify(mv.to)} from=${JSON.stringify(mv.from)}`);
	await page.waitForTimeout(600);
}

await ctx.close();
await browser.close();
if (fails.length) {
	console.log('CAMERA PROBE: RED\n- ' + fails.join('\n- '));
	process.exit(1);
}
console.log('CAMERA PROBE: GREEN — publishes at capture; screenVector matches rects; from/to match table-index; sign sane.');
