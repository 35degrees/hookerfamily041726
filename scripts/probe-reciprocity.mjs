/**
 * probe-reciprocity.mjs — a CC's rendered direction must be RECIPROCAL: A→B is the exact reverse of B→A.
 * The Debevoise↔Rockefeller fixture (both 1874) is a FAR COLLATERAL pair, so it ARCS — its direction is
 * the arc's traverse pan (camera centre from → to), read off the shared arc clock. Asserts:
 *   RECIPROCITY: pan(A→B) == −pan(B→A) within tolerance;
 *   SAME-ERA: |vertical pan| ≈ 0 when |Δy| ≈ 0 (a same-year arc traverses horizontally).
 * (The flat-flight direction reciprocity — ccScreenDirFor — is a pure odd function, exercised by the
 * arrival probe's collateral uncle; here we prove the arc traverse mirrors.)
 * Dev server up on :5173.
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

// the arc traverse pan (normalized end−start of the camera centre), read off window.__arcClock
async function arcPan(src, targetSlug) {
	await page.goto(`${BASE}/person/${src}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);
	const cc = await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		if (!a) return null;
		const r = a.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}, targetSlug);
	if (!cc) return null;
	await page.mouse.click(cc.x, cc.y);
	const trace = await page.evaluate(() => new Promise((res) => {
		const pts = []; let n = 0;
		const tick = () => {
			const ac = window.__arcClock;
			if (ac && ac.active) pts.push({ cx: ac.cx, cy: ac.cy });
			if (++n < 130) requestAnimationFrame(tick); else res(pts);
		};
		requestAnimationFrame(tick);
	}));
	await page.waitForTimeout(300);
	if (trace.length < 3) return null;
	const a = trace[0], b = trace[trace.length - 1];
	const dx = b.cx - a.cx, dy = b.cy - a.cy;
	const mag = Math.hypot(dx, dy);
	return mag > 0.001 ? { x: dx / mag, y: dy / mag, active: trace.length } : null;
}

const ab = await arcPan('thomas-debevoise-1874', 'john-rockefeller-jr-1874');
const ba = await arcPan('john-rockefeller-jr-1874', 'thomas-debevoise-1874');
ok(ab, 'A→B did not arc (no active arc clock) — Debevoise should be a far collateral arc');
ok(ba, 'B→A did not arc');
if (ab && ba) {
	const err = Math.hypot(ab.x + ba.x, ab.y + ba.y); // pan(A→B) + pan(B→A) ≈ 0
	ok(err < 0.05, `reciprocity: pan A→B (${ab.x.toFixed(2)},${ab.y.toFixed(2)}) not reverse of B→A (${ba.x.toFixed(2)},${ba.y.toFixed(2)}) |sum|=${err.toFixed(3)}`);
	ok(Math.abs(ab.y) < 0.05, `same-era A→B: vertical pan ${ab.y.toFixed(3)} (want ≈0 for Δy=0)`);
	ok(Math.abs(ba.y) < 0.05, `same-era B→A: vertical pan ${ba.y.toFixed(3)} (want ≈0 for Δy=0)`);
	console.log(`  arc pan A→B=(${ab.x.toFixed(2)},${ab.y.toFixed(2)})  B→A=(${ba.x.toFixed(2)},${ba.y.toFixed(2)})  |sum|=${err.toFixed(3)}`);
}

await ctx.close();
await browser.close();
if (fails.length) { console.log('RECIPROCITY PROBE: RED\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('RECIPROCITY PROBE: GREEN — the arc traverse mirrors (pan A→B = −pan B→A); same-era arcs pan horizontally.');
