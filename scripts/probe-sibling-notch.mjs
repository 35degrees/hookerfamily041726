// probe-sibling-notch.mjs — the sibling CORNER RETRACTION must be occluded at its DESTINATION.
//
// REWRITTEN Aug 4 (roadmap §19.4 predicted this probe would have to be reversed; what it actually needed
// was RE-AIMING). The rule it guards is unchanged and still correct: z:-1 hides the retraction wherever
// the incoming card is opaque, but the incoming card is CLIPPED at its notch cutout (top-right), and the
// retraction ENDS near that corner — so when the notch reforms at landing, the endpoint can show through
// the cutout for a few frames (Sam's tic, ghost-taxonomy bug E).
//
// What changed is WHICH navigation still takes that path. §19 made a sibling→sibling promotion with the
// panel open an IN-PLACE MUTATION: the demoted card flies into a real chip in the sibling list instead of
// retracting into the card's corner, deliberately visible the whole way (see probe-sibling-seat.mjs). The
// corner retraction survives as the FALLBACK, for when there is no list to fly into — and the reachable
// case is a step-sibling who fails §21.1's own render gate, so the incoming card has no panel at all.
//
// RE-AIMED AGAIN the same day, BY ITS OWN PATH GUARD. It first pointed at George Beardsley (1855) →
// Roswell (1809), who was off the Hooker/Talcott lines. The Aug-4 gate change (showsSiblingPanel's second
// clause) gave Roswell a panel of his own, so that navigation became a §19 mutation and stopped
// exercising this rule — and the guard said so in those words rather than reporting green. Exactly what
// it was written for; §21.3's "a probe that has never been seen to fail is decoration", inverted.
//
// The fallback is now RARE: 55 of the 58 one-way doors closed, and the corner retraction survives only
// where the sibling's own payload carries NO sibling tiers at all (siblings_count = 0), so there is
// nothing for a panel to render. William Pierpont (1797) → Elizabeth Collins (1755) is one of the three.
// She is the earliest birth in the tier and therefore chip 0, which matters — a chip below the window
// fold is mask-clipped and cannot be clicked. The probe asserts it is genuinely on the fallback path
// (z:-1) before asserting the tic, so it can never silently start measuring the other navigation.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const START = 'william-pierpont-1797';
const STEP_SIB = 'elizabeth-collins-1755'; // siblings_count = 0 → no panel to render on arrival
// The sibling panel is OPEN BY DEFAULT now (Aug 4). A blind `click('.sibling-trigger')` therefore CLOSES
// it and every chip this probe needs disappears — the same shape of breakage the sticky panel caused in
// §19.5. Ask for the STATE, don't assume it.
const ensurePanelOpen = async (page) => {
	if (await page.locator('.sibling-window').count()) return;
	await page.click('.sibling-trigger');
	await page.waitForSelector('.sibling-window', { timeout: 5000 });
};

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'no-preference' })).newPage();
await p.goto(`${BASE}/person/${START}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
await ensurePanelOpen(p);
await p.waitForSelector(`.sibling-strip a[href="/person/${STEP_SIB}"]`, { timeout: 5000 });
await p.waitForTimeout(400);

await p.evaluate(() => {
	window.__n = [];
	const t0 = performance.now();
	// Measured live rather than hardcoded: the notch cutout is the card's own top-right corner, and a
	// frozen 1175/250 would quietly stop describing it the moment the layout or a density step moves.
	const slot = document.querySelector('.featured-slot').getBoundingClientRect();
	const CR = slot.right, CT = slot.top, NOTCH_W = 200, NOTCH_H = 90; // chip-zone tall
	(function f() {
		const t = performance.now() - t0;
		const cards = [...document.querySelectorAll('.featured-flight')];
		const OLD = cards.find((c) => c.querySelector('h1')?.textContent?.startsWith('William'));
		const NEW = cards.find((c) => c !== OLD);
		if (NEW && OLD) {
			const newFlat = NEW.classList.contains('flat');
			const or = OLD.getBoundingClientRect();
			const oOp = parseFloat(getComputedStyle(OLD).opacity);
			const oz = getComputedStyle(OLD).zIndex;
			// retraction overlaps the notch region?
			const overlaps = or.right > CR - NOTCH_W && or.top < CT + NOTCH_H && oOp > 0.05;
			// TIC frame: notch cutout exposed (NEW not flat) AND retraction still painting in the notch region
			const tic = !newFlat && overlaps;
			window.__n.push({ t: Math.round(t), newFlat, oz, oldOp: +oOp.toFixed(2), oldRect: [Math.round(or.left), Math.round(or.top), Math.round(or.right), Math.round(or.bottom)], tic });
		}
		if (t < 900) requestAnimationFrame(f); else window.__d = true;
	})();
});
await p.click(`.sibling-strip a[href="/person/${STEP_SIB}"]`);
await p.waitForFunction(() => window.__d, null, { timeout: 5000 });
const s = await p.evaluate(() => window.__n);
await b.close();

const fails = [];
if (!s.length) fails.push('never saw both cards on stage — the navigation did not run as a warm flight');
// PATH GUARD: this probe is only meaningful on the corner retraction. z:-1 is what identifies it; the §19
// mutation rides z:1. Without this the probe would go green by measuring the wrong navigation entirely.
const zs = [...new Set(s.map((x) => x.oz))];
if (s.length && !zs.includes('-1'))
	fails.push(`not on the corner-retraction path (departing card z = ${zs.join('/')}, expected -1) — this pair no longer falls back, so the rule is untested`);
const ticFrames = s.filter((x) => x.tic);
for (const x of ticFrames) console.log(`  t=${x.t} incoming-notch-exposed, retraction still in notch region rect=${JSON.stringify(x.oldRect)} op=${x.oldOp}`);
if (ticFrames.length) fails.push(`retraction visible in the notch cutout on ${ticFrames.length} frame(s)`);

if (fails.length) {
	console.log('\nSIBLING-NOTCH PROBE: RED');
	for (const f of fails) console.log(`  - ${f}`);
	process.exit(1);
}
console.log(`\nSIBLING-NOTCH PROBE: GREEN — the corner retraction (z:-1, ${s.length} frames) is fully occluded at its destination.`);
