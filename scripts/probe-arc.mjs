/**
 * probe-arc.mjs — THE ALTITUDE ARC (Slice 1, camera scale channel). Asserts:
 *   - a FAR COLLATERAL CC arcs: the arc clock runs and the subject card scale pulls back to ~scaleMin
 *     then returns to 1 (rise → traverse → descend);
 *   - the card scale reads the ARC CLOCK (one clock — card scale tracks window.__arcClock.scale);
 *   - a short collateral hop (uncle) and a direct dive (granddaughter) do NOT arc (no pull-back).
 * Dev server up on :5173.
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

async function fly(src, targetSlug) {
	await page.goto(`${BASE}/person/${src}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);
	const cc = await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}, targetSlug);
	if (!cc) return null;
	await page.mouse.click(cc.x, cc.y);
	const data = await page.evaluate(() => new Promise((res) => {
		const out = []; let n = 0;
		const tick = () => {
			// only VISIBLE cards (opacity > 0.05) — a hidden delayed card frozen at its mount scale is not on
			// screen, so it is not part of the one-clock contract.
			const w = [...document.querySelectorAll('.featured-card-wrap,.featured-card')]
				.filter((e) => parseFloat(getComputedStyle(e.closest('.featured-flight') || e).opacity) > 0.05)
				.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 2).sort((a, b) => b.width - a.width)[0];
			const ac = window.__arcClock;
			out.push({ cardScale: w ? w.width / 925 : null, arcScale: ac ? ac.scale : null, arcActive: !!ac?.active });
			if (++n < 135) requestAnimationFrame(tick); else res(out);
		};
		requestAnimationFrame(tick);
	}));
	await page.waitForTimeout(300);
	return data;
}

// FAR COLLATERAL — arcs
const arc = await fly('thomas-debevoise-1874', 'john-rockefeller-jr-1874');
ok(arc, 'arc: Debevoise link not found');
if (arc) {
	const activeFrames = arc.filter((d) => d.arcActive).length;
	ok(activeFrames > 20, `arc: clock barely ran (${activeFrames} active frames) — far collateral should arc`);
	const cardScales = arc.map((d) => d.cardScale).filter((x) => x != null);
	ok(Math.min(...cardScales) < 0.62, `arc: card never pulled back (min scale ${Math.min(...cardScales).toFixed(2)}, want < 0.62)`);
	ok(Math.max(...cardScales) > 0.95, `arc: card never returned to full (max scale ${Math.max(...cardScales).toFixed(2)})`);
	// ONE CLOCK: on active frames the card scale tracks the arc clock scale (within tolerance)
	const active = arc.filter((d) => d.arcActive && d.cardScale != null && d.cardScale < 0.98);
	const maxDelta = Math.max(0, ...active.map((d) => Math.abs(d.cardScale - d.arcScale)));
	ok(maxDelta < 0.12, `arc: card scale drifts from the arc clock (max Δ ${maxDelta.toFixed(2)}) — two-clock desync`);
	console.log(`  Debevoise arc: ${activeFrames} active frames, card scale ${Math.min(...cardScales).toFixed(2)}→${Math.max(...cardScales).toFixed(2)}, one-clock Δ ${maxDelta.toFixed(2)}`);
}

// SHORT COLLATERAL (uncle) + DIRECT (granddaughter) — no arc
for (const [src, tgt, label] of [
	['matthew-russell-1761', 'matthew-talcott-1713', 'uncle (short collateral)'],
	['mary-pierpont-1673', 'mary-talcott-1720', 'granddaughter (direct)']
]) {
	const d = await fly(src, tgt);
	if (d) {
		const active = d.filter((f) => f.arcActive).length;
		ok(active === 0, `${label}: arc fired (${active} frames) — should stay a flat flight`);
		console.log(`  ${label}: arc active frames = ${active} (want 0)`);
	}
}

await ctx.close();
await browser.close();
if (fails.length) { console.log('ARC PROBE: RED\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('ARC PROBE: GREEN — far collateral pulls back to altitude on the arc clock (one clock); short/direct stay flat.');
