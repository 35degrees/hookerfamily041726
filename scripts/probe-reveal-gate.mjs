// probe-reveal-gate.mjs — the guard that was MISSING when the sibling-trigger reveal-gate regression
// shipped false-green past four other probes. Asserts the load-bearing invariant: from the instant a
// promotion flight STARTS until the featured card has LANDED, nothing belonging to the INCOMING person may
// paint on the outgoing card. Specifically, during the flight window:
//   (A) the incoming person's NEW spouse chip shows ZERO pixels (opacity ~0 / not rendered), and
//   (B) the sibling trigger shows ZERO pixels AND never renders the incoming person's count.
// Covers BOTH child-chip promotion (child → featured) and parent-chip promotion (parent → featured).
// Proven RED on the broken build (trigger flashed the incoming "Siblings (N)" at full opacity at flight
// start), GREEN after the fix (landedPersonId gate + instant-hide trigger).
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const EPS = 0.02; // opacity at/below this = "not painted"

// Each case: start person, the affordance to click (a parent- or child-chip), the incoming person, that
// person's expected sibling-count label, and the incoming person's NEW spouse-chip flight-id.
const CASES = [
	{
		name: 'child promotion (JP Morgan → child Louisa)',
		start: 'john-morgan-1837',
		clickSel: 'a[data-relation="child"][href="/person/louisa-satterlee-1866"]',
		incomingCount: 'Siblings (3)',
		newSpouseId: 'X00383'
	},
	{
		name: 'parent promotion (Louisa → parent JP Morgan)',
		start: 'louisa-satterlee-1866',
		clickSel: 'a[data-relation="parent"][href="/person/john-morgan-1837"]',
		incomingCount: 'Siblings (4)',
		newSpouseId: null // discovered at runtime (JP's first spouse chip)
	}
];

let failures = 0;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'no-preference' });
const p = await ctx.newPage();

for (const c of CASES) {
	await p.goto(`${BASE}/person/${c.start}`, { waitUntil: 'networkidle' });
	await p.waitForTimeout(900);
	if ((await p.locator(c.clickSel).count()) === 0) {
		console.log(`  SKIP ${c.name}: affordance not found (${c.clickSel})`);
		continue;
	}
	// If the new spouse id isn't pinned, read it from the destination payload's first spouse.
	let newSpouseId = c.newSpouseId;
	if (!newSpouseId) {
		const href = await p.locator(c.clickSel).first().getAttribute('href');
		const slug = href.split('/').pop();
		newSpouseId = await p.evaluate(async (s) => {
			const r = await fetch(`/data/person/${s}.json`).then((x) => x.json()).catch(() => null);
			return r?.neighborhood?.spouses?.[0]?.spouse?.id ?? null;
		}, slug);
	}

	// Sample every frame from the click until ~1200ms. flying := the featured card is still animating
	// (.flat class or a live transform). Record the incoming chip's opacity and the trigger's opacity+text.
	await p.evaluate((newSpouseId) => {
		window.__rg = [];
		const t0 = performance.now();
		(function frame() {
			const t = performance.now() - t0;
			const ff = document.querySelector('.featured-flight');
			const flying = !!ff && (ff.classList.contains('flat') || getComputedStyle(ff).transform !== 'none');
			const chip = newSpouseId
				? document.querySelector(`.spouse-strip .flight[data-flight-id="${newSpouseId}"]`)
				: null;
			const chipOp = chip ? parseFloat(getComputedStyle(chip).opacity) : -1;
			const trig = document.querySelector('.sibling-trigger');
			const trigOp = trig ? parseFloat(getComputedStyle(trig).opacity) : -1;
			const trigTxt = trig ? trig.textContent.trim() : '';
			window.__rg.push({ t: Math.round(t), flying, chipOp, trigOp, trigTxt });
			if (t < 1200) requestAnimationFrame(frame);
			else window.__rgDone = true;
		})();
	}, newSpouseId);
	await p.click(c.clickSel);
	await p.waitForFunction(() => window.__rgDone, null, { timeout: 4000 });
	const s = await p.evaluate(() => window.__rg);

	const flying = s.filter((x) => x.flying);
	// (A) incoming spouse chip must be ~0 for every flying frame
	const chipLeaks = flying.filter((x) => x.chipOp > EPS);
	// (B) trigger must be ~0 for every flying frame, and must never render the incoming count while flying
	const trigPixelLeaks = flying.filter((x) => x.trigOp > EPS);
	const trigDataLeaks = flying.filter((x) => x.trigOp > EPS && x.trigTxt === c.incomingCount);

	const ok = chipLeaks.length === 0 && trigPixelLeaks.length === 0;
	if (!ok) failures++;
	console.log(`  ${ok ? 'GREEN' : 'RED  '}  ${c.name}`);
	console.log(
		`         flying frames=${flying.length}  chip-leaks=${chipLeaks.length}  trigger-pixel-leaks=${trigPixelLeaks.length}  trigger-showing-incoming-count-while-flying=${trigDataLeaks.length}`
	);
	if (!ok) {
		const worst = [...chipLeaks, ...trigPixelLeaks].sort((a, b) => b.trigOp + b.chipOp - (a.trigOp + a.chipOp))[0];
		console.log(`         worst leak: t=${worst.t} chipOp=${worst.chipOp} trigOp=${worst.trigOp} "${worst.trigTxt}"`);
	}
}

await b.close();
if (failures) {
	console.log(`\nREVEAL-GATE PROBE: RED — ${failures} case(s) painted incoming-person data on the outgoing card during flight.`);
	process.exit(1);
} else {
	console.log('\nREVEAL-GATE PROBE: GREEN — incoming spouse chip AND sibling trigger stay fully hidden until the card lands, on child- and parent-promotion.');
}
