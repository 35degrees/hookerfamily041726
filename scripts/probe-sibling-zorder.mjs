// probe-sibling-zorder.mjs — the guard for the sibling-promotion z-order. The departing old-focus card
// (the retraction) must render BEHIND the incoming card at all times. elementsFromPoint is BLIND here
// (flight elements are pointer-events:none, so it reports the card behind), so this asserts the stacking
// INVARIANT directly: per frame, whenever the departing and incoming card rects overlap, the incoming must
// be paintable ABOVE the departing — numeric z(incoming) > z(departing), OR equal-z with incoming later in
// DOM. DOM order here is incoming-before-departing, so at equal z the DEPARTING wins (occlusion). The bug:
// post-landing the incoming drops to z:auto(0) while the retraction stays z:1 → departing occludes. RED on
// the current build, GREEN after the z-order fix.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'no-preference' })).newPage();
await p.goto(`${BASE}/person/john-morgan-1837`, { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
await p.click('.sibling-trigger'); await p.waitForTimeout(600);
await p.evaluate(() => {
	window.__z = [];
	const t0 = performance.now();
	const zn = (v) => (v === 'auto' || v === '' ? 0 : parseInt(v, 10) || 0);
	const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
	(function f() {
		const t = performance.now() - t0;
		const cards = [...document.querySelectorAll('.featured-flight')];
		if (cards.length >= 2) {
			const NEW = cards.find((c) => !c.querySelector('h1')?.textContent?.startsWith('John'));
			const OLD = cards.find((c) => c.querySelector('h1')?.textContent?.startsWith('John'));
			if (NEW && OLD) {
				const nr = NEW.getBoundingClientRect(), or = OLD.getBoundingClientRect();
				const nz = zn(getComputedStyle(NEW).zIndex), oz = zn(getComputedStyle(OLD).zIndex);
				const newAfterOld = [...cards].indexOf(NEW) > [...cards].indexOf(OLD);
				const ov = overlap(nr, or);
				// OLD occludes NEW iff they overlap AND OLD paints above NEW (oz>nz, or equal with OLD later in DOM)
				const oldPaintsAbove = oz > nz || (oz === nz && !newAfterOld);
				const occludes = ov > 100 && oldPaintsAbove;
				window.__z.push({ t: Math.round(t), nz, oz, ov: Math.round(ov), occludes });
			}
		}
		if (t < 750) requestAnimationFrame(f); else window.__d = true;
	})();
});
await p.click('.sibling-strip a[href="/person/sarah-morgan-1839"]');
await p.waitForFunction(() => window.__d, null, { timeout: 5000 });
const z = await p.evaluate(() => window.__z);
const bad = z.filter((s) => s.occludes);
for (const s of bad) console.log(`  t=${s.t} OLD z=${s.oz} >= NEW z=${s.nz}, overlap=${s.ov}px² — DEPARTING OCCLUDES INCOMING`);
await b.close();
if (bad.length) { console.log(`\nSIBLING-ZORDER PROBE: RED — departing card occludes incoming on ${bad.length} frame(s).`); process.exit(1); }
console.log('\nSIBLING-ZORDER PROBE: GREEN — the departing retraction stays behind the incoming card throughout.');
