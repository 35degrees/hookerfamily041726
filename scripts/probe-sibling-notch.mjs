// probe-sibling-notch.mjs — the sibling retraction must be occluded at its DESTINATION, not just in transit.
// z:-1 hides it wherever the incoming card is opaque, but the incoming card is CLIPPED at its notch cutout
// (top-right), and the retraction ENDS at that corner — so when the notch reforms at landing, the retraction's
// endpoint (chip-face) shows through the cutout for a few frames (Sam's tic). Assert: once the incoming card's
// notch is exposed (not .flat), the retracting old-focus card must not still be painting in the notch region.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'no-preference' })).newPage();
await p.goto(`${BASE}/person/john-morgan-1837`, { waitUntil: 'networkidle' });
await p.waitForTimeout(800); await p.click('.sibling-trigger'); await p.waitForTimeout(600);
await p.click('.sibling-strip a[href="/person/sarah-morgan-1839"]'); await p.waitForTimeout(1400);
await p.click('.sibling-trigger'); await p.waitForTimeout(600);
await p.evaluate(() => {
	window.__n = [];
	const t0 = performance.now();
	const CR = 1175, CT = 250, NOTCH_W = 200, NOTCH_H = 90; // notch cutout = top-right corner, chip-zone tall
	(function f() {
		const t = performance.now() - t0;
		const cards = [...document.querySelectorAll('.featured-flight')];
		const NEW = cards.find((c) => c.querySelector('h1')?.textContent?.startsWith('Mary'));
		const OLD = cards.find((c) => c.querySelector('h1')?.textContent?.startsWith('Sarah'));
		if (NEW && OLD) {
			const newFlat = NEW.classList.contains('flat');
			const or = OLD.getBoundingClientRect();
			const oOp = parseFloat(getComputedStyle(OLD).opacity);
			// retraction overlaps the notch region?
			const overlaps = or.right > CR - NOTCH_W && or.top < CT + NOTCH_H && oOp > 0.05;
			// TIC frame: notch cutout exposed (NEW not flat) AND retraction still painting in the notch region
			const tic = !newFlat && overlaps;
			window.__n.push({ t: Math.round(t), newFlat, oldOp: +oOp.toFixed(2), oldRect: [Math.round(or.left), Math.round(or.top), Math.round(or.right), Math.round(or.bottom)], tic });
		}
		if (t < 700) requestAnimationFrame(f); else window.__d = true;
	})();
});
await p.click('.sibling-strip a[href="/person/mary-burns-1844"]');
await p.waitForFunction(() => window.__d, null, { timeout: 5000 });
const s = await p.evaluate(() => window.__n);
const ticFrames = s.filter((x) => x.tic);
for (const x of ticFrames) console.log(`  t=${x.t} incoming-notch-exposed, retraction still in notch region rect=${JSON.stringify(x.oldRect)} op=${x.oldOp}`);
await b.close();
if (ticFrames.length) { console.log(`\nSIBLING-NOTCH PROBE: RED — retraction visible in the notch cutout on ${ticFrames.length} frame(s).`); process.exit(1); }
console.log('\nSIBLING-NOTCH PROBE: GREEN — the retraction is fully occluded at its destination.');
