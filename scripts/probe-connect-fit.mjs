/**
 * probe-connect-fit — DOES THE SECOND BUTTON FIT, on every card and at every rung?
 *
 * The portrait column's height rides --stage-u and its vitals ride --type-k, and §33.2 fixes k >= u, so
 * the vitals eat a growing share of a shrinking column. That is why the SINGLE button already overlapped
 * its own vitals by 11px at 1100x720 before any of this work. This asserts the clearance is positive
 * everywhere — the number this whole vitals diet exists to move.
 *
 * Run: node scripts/probe-connect-fit.mjs
 */
import { chromium } from 'playwright';

// Burr is the worst card in the corpus for this: his death place wraps to two lines. Pierpont is the
// ordinary rich card, Thomas has no ladder at all (no buttons — the null case), Anne is a stub.
const PEOPLE = ['aaron-burr-jr-1756', 'pierpont-edwards-1750', 'thomas-hooker-1586', 'anne-hooker-1625'];
// setViewportSize, NEVER newPage({viewportSize}) — the latter is silently ignored, which is how the
// sprite field was tuned at one size for a whole session (roadmap §43.2).
// 1101 and 1100 straddle the tight-vitals threshold on purpose: the rule is that NOTHING changes above
// it, and a threshold is only trustworthy if both sides of it are measured.
const SIZES = [[1440, 900], [1280, 720], [1101, 720], [1100, 720], [1024, 768]];

const b = await chromium.launch();
const page = await b.newPage();
let worst = Infinity;
let fail = 0;
const topGaps = [];
for (const [w, h] of SIZES) {
	await page.setViewportSize({ width: w, height: h });
	for (const slug of PEOPLE) {
		const res = await page.goto(`http://localhost:5173/person/${slug}`, { waitUntil: 'networkidle' });
		if (res.status() !== 200) { console.log(`  ${slug} -> HTTP ${res.status()}`); fail++; continue; }
		await page.waitForTimeout(300);
		const m = await page.evaluate(() => {
			const col = document.querySelector('.portrait-column');
			const vitals = document.querySelector('.vitals');
			const stack = document.querySelector('.connect-stack');
			const btns = [...document.querySelectorAll('.connect-btn')];
			if (!col) return null;
			const r = (e) => (e ? e.getBoundingClientRect() : null);
			const s = r(stack), card = r(document.querySelector('.card-top'));
			const photo = r(col.querySelector('img, .aspect-\\[3\\/4\\]'));
			// MEASURE THE CONTENT, NOT THE BOX. `.vitals` is `flex: 1`, so its rect fills the leftover
			// space by construction and the old "vitals bottom -> stack top" reading is 0 on every card
			// whatever is happening inside it — an instrument that always returns the same number is not
			// measuring anything. What is actually centred is the two vital BLOCKS.
			const blocks = [...vitals.children].map((e) => e.getBoundingClientRect());
			const inkTop = blocks.length ? Math.min(...blocks.map((b) => b.top)) : null;
			const inkBottom = blocks.length ? Math.max(...blocks.map((b) => b.bottom)) : null;
			return {
				buttons: btns.length,
				labels: btns.map((x) => x.textContent.trim()),
				// The two gaps Sam's rule is about. They must be EQUAL (that is what "exactly centered"
				// means) and neither may be negative.
				gapTop: photo && inkTop != null ? +(inkTop - photo.bottom).toFixed(1) : null,
				gapBottom: s && inkBottom != null ? +(s.top - inkBottom).toFixed(1) : null,
				// The card's bottom edge is the line the stack may not cross; positive means it has.
				overhang: card && s ? +(s.bottom - card.bottom).toFixed(1) : null,
				vitalsH: inkTop != null ? +(inkBottom - inkTop).toFixed(1) : null
			};
		});
		if (!m) { console.log(`  ${slug}: no portrait column`); fail++; continue; }
		if (m.buttons === 0) { console.log(`${w}x${h}  ${slug.padEnd(22)} no ladder, no buttons (correct)`); continue; }
		// THE INVARIANT IS A CONSTANT TOP EDGE, not a centred block — centring was built, shown to Sam and
		// rejected, because it makes the top edge a function of the content and a birth-only card then
		// floats into the middle of the space. So: the gap above is the same on every card at a given
		// size, and only the slack BELOW varies.
		topGaps.push(m.gapTop);
		const bad = m.buttons !== 2 || m.gapTop < 0 || m.gapBottom < 0 || m.overhang > -1;
		if (bad) fail++;
		if (Math.min(m.gapTop, m.gapBottom) < worst) worst = Math.min(m.gapTop, m.gapBottom);
		console.log(
			`${w}x${h}  ${slug.padEnd(22)} vitals ${String(m.vitalsH).padStart(5)}  ` +
				`gap above ${String(m.gapTop).padStart(6)}  below ${String(m.gapBottom).padStart(6)}  ` +
				`overhang ${String(m.overhang).padStart(5)}  ${bad ? 'FAIL' : 'ok'}`
		);
	}
}
const spread = topGaps.length ? +(Math.max(...topGaps) - Math.min(...topGaps)).toFixed(1) : 0;
console.log(`\nworst gap ${worst}px   top-edge spread ${spread}px across every card and size   ` +
	`${fail ? `${fail} FAILURES` : 'all clear'}`);
await b.close();
process.exit(fail ? 1 : 0);
