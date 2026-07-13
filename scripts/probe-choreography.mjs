/**
 * probe-choreography.mjs — HARD CUT → FLY → UNFURL (CC arrivals only). Asserts:
 *   - on a CC nav, ZERO parent/child chip pixels are visible from flight-start (.flat card) to landing
 *     (the roster is hard-cut at frame 0, and unfurls AFTER — never flashing mid-flight);
 *   - the roster DOES return after landing (unfurl happened — not simply deleted);
 *   - a CHIP nav is untouched: its incoming roster reveals DURING the flight (the bare-screen gap stays
 *     closed for parent/child navigation).
 * Dev server up on :5173.
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

async function sampleFlight(clickTarget, byHref) {
	const t = byHref
		? await page.evaluate((h) => { const a = [...document.querySelectorAll('a')].find((x) => (x.getAttribute('href') || '').endsWith(h)); if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, clickTarget)
		: await page.evaluate((s) => { const a = document.querySelector(s); if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, clickTarget);
	if (!t) return null;
	await page.mouse.click(t.x, t.y);
	const frames = await page.evaluate(() => new Promise((res) => {
		const out = []; let n = 0;
		const vc = (sel) => { let v = 0; for (const c of document.querySelectorAll(sel)) { const r = c.getBoundingClientRect(); const op = parseFloat(getComputedStyle(c).opacity); if (r.width > 2 && op > 0.05 && r.bottom > 0 && r.top < 1000) v++; } return v; };
		const tick = () => {
			const p = vc('.parents-slot .flight'), c = vc('.children-slot .flight');
			const flying = !![...document.querySelectorAll('.featured-flight')].find((x) => x.classList.contains('flat'));
			out.push({ p, c, vis: p + c, flying });
			if (++n < 100) requestAnimationFrame(tick); else res(out);
		};
		requestAnimationFrame(tick);
	}));
	await page.waitForTimeout(400);
	return frames;
}

// CC nav — mary-pierpont → mary-talcott (the destination has parents, so the parent-row unfurl is tested)
await page.goto(`${BASE}/person/mary-pierpont-1673`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const cc = await sampleFlight('/person/mary-talcott-1720', true);
ok(cc, 'CC: mary-talcott link not found');
if (cc) {
	const flightIdx = cc.map((f, i) => ({ f, i })).filter((x) => x.f.flying).map((x) => x.i);
	const start = flightIdx[0], landing = flightIdx[flightIdx.length - 1] + 1; // introend / final-position signal
	// PARENTS and CHILDREN are BOTH gated on the landing signal — zero pixels before it (unfurl symmetry).
	const pBefore = Math.max(...cc.slice(0, landing).map((f) => f.p), 0);
	const cBefore = Math.max(...cc.slice(0, landing).map((f) => f.c), 0);
	ok(pBefore === 0, `CC: ${pBefore} PARENT chip(s) visible before the landing signal (want 0 — unfurl symmetry)`);
	ok(cBefore === 0, `CC: ${cBefore} CHILD chip(s) visible before the landing signal (want 0)`);
	const afterLanding = Math.max(...cc.slice(landing).map((f) => f.vis), 0);
	ok(afterLanding > 0, `CC: roster did not unfurl after landing (${afterLanding} chips — deleted, not unfurled?)`);
	console.log(`  CC (mary-pierpont→mary-talcott): landing @${landing}, parents-before=${pBefore}, children-before=${cBefore}, after-landing=${afterLanding}`);
}

// CHIP nav — a parent/child click must STILL reveal its roster during the flight (bare-screen gap closed)
await page.goto(`${BASE}/person/michael-hooker-1935`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const chip = await sampleFlight('.parents-slot a, .children-slot a', false);
if (chip) {
	const flightIdx = chip.map((f, i) => ({ f, i })).filter((x) => x.f.flying).map((x) => x.i);
	const start = flightIdx[0], end = flightIdx[flightIdx.length - 1];
	const maxDuring = start != null ? Math.max(...chip.slice(start, end + 1).map((f) => f.vis), 0) : 0;
	ok(maxDuring > 0, `chip nav: roster hidden during flight (${maxDuring}) — the CC hold leaked into chip navs`);
	console.log(`  chip nav: max chips DURING flight=${maxDuring} (want > 0 — reveal untouched)`);
}

await ctx.close();
await browser.close();
if (fails.length) { console.log('CHOREOGRAPHY PROBE: RED\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('CHOREOGRAPHY PROBE: GREEN — CC hard-cut→flies→unfurls (no chips mid-flight); chip nav reveal untouched.');
