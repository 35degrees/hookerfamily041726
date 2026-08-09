/**
 * probe-fit — THE STAGE MUST FIT THE VIEWPORT (design §13, roadmap Phase 2.75).
 *
 * The doctrine: "this is an exhibit, not a document. The stage owns the whole viewport; there are no
 * scrollbars anywhere in zoom 1." This probe is the mechanism behind that sentence. It was written to
 * be RED — on the day it landed, Aaron Burr at 1440x900 overflowed by 456px and the 925px card hung
 * 98px off EACH edge of an iPad mini — so that a later green reading means something.
 *
 * TWO ASSERTIONS, and they fail differently:
 *
 *   VERTICAL   the RESTING stage's content height must be <= the viewport.
 *
 *              "Resting" is load-bearing and is Sam's correction of design §13 (Aug 8), made the same
 *              day he introduced the one exception: a vertical scrollbar IS allowed while the GRANDCHILD
 *              TIER is open. Hovering a child chip for 1.2s reveals that child's own children, and a
 *              twelve-child family puts three rows on the stage — a deliberate, transient, user-summoned
 *              overflow that is permitted to scroll. So this probe must never hover a chip, and a future
 *              `overflow: clip` must be state-aware rather than absolute.
 *
 *   HORIZONTAL no part of the stage may fall outside the viewport, EVER. Sam's rule is absolute:
 *              "there's never a horizonal scrollbar allowed."
 *
 *              It is measured as the union of the card's box AND the sibling column's, not as
 *              document.scrollWidth, because `.page-container` carries `overflow-x: clip` — anything
 *              too wide reports NO overflow while being silently amputated, which is the exact "clip
 *              without a fit policy" failure design §13.3 warns about, and a scrollWidth check here
 *              would be a measurement that cannot fail (the §34.1 lesson).
 *
 *              THE SIBLING COLUMN IS IN THE UNION BECAUSE IT IS THE THING THAT BREAKS. Checking the
 *              card alone read GREEN at iPad mini landscape while the column hung 6px off the right
 *              edge in the screenshot — the card is CENTRED and the column hangs off its right, so the
 *              composition needs `card + 2 x column` of width, not `card + column`. A probe that only
 *              looked at the card could not have seen that, and did not.
 *
 * Run: node scripts/probe-fit.mjs            (dev server on :5173)
 *      node scripts/probe-fit.mjs --verbose  (per-row geometry)
 */
import { chromium } from '@playwright/test';

// The three tier viewports the 2.75 discipline requires every later phase to verify at, plus the two
// iPad mini sizes Sam named as the floor of "getting it really right".
const VIEWPORTS = [
	{ name: 'desktop 1440x900', w: 1440, h: 900 },
	{ name: 'iPad mini landscape', w: 1133, h: 744 },
	{ name: 'iPad mini portrait', w: 744, h: 1133 },
	{ name: 'iPhone 14 Pro', w: 393, h: 852 }
];

// The RICHEST cards — the ones design §13.3 names. A card with no children and no blade fits anywhere
// and proves nothing.
const SLUGS = [
	'aaron-burr-jr-1756',
	'pierpont-edwards-1750',
	'thomas-hooker',
	// A TEN-CONNECTION CARD, so the blade is actually on stage. The first three either have no blade or
	// a short one, and a blade that is not rendered cannot be caught overhanging — which is how the
	// blade shipped scaled-wrong for a whole session and was found by Sam's eye instead of by this file.
	'daniel-wadsworth-1771',
	// A FOUR-SPOUSE CARD, so the notch runs in CAROUSEL mode on the COMPACT (160x65) chip tier with a
	// clip-path mask, a paging strip and bookend carets — a whole geometry that simply does not exist on
	// a card with three spouses or fewer. Every other slug here uses the plain 220px notch, so the
	// carousel went unmeasured through two passes and Sam found its clipped marriage year by eye. One of
	// her husbands is "Leopold Stokowski", long enough to be the canary for the compact seat.
	'gloria-vanderbilt-1924'
];

const verbose = process.argv.includes('--verbose');
const browser = await chromium.launch();
const failures = [];

for (const v of VIEWPORTS) {
	for (const slug of SLUGS) {
		const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h } });
		const page = await ctx.newPage();
		await page.goto(`http://localhost:5173/person/${slug}`, { waitUntil: 'networkidle' });
		await page.evaluate(() => document.fonts.ready);
		// Park the pointer off every chip. The grandchild tier opens on a 1.2s child-chip hover and is
		// the one sanctioned overflow (see the header) — a probe that drifted the mouse over a chip would
		// measure the exception and report the rule broken.
		await page.mouse.move(4, 4);
		await page.waitForTimeout(900);

		const m = await page.evaluate(() => {
			const pc = document.querySelector('.page-container');
			const card = document.querySelector('.featured-card');
			const cr = card?.getBoundingClientRect();
			const blade = document.querySelector('.cc-blade')?.getBoundingClientRect();
			// A CHIP MUST CONTAIN ITS OWN TEXT. The chip's `overflow: hidden` means a stack too tall for
			// its box is CLIPPED rather than spilling, so nothing about the chip's own rect reveals it and
			// document overflow never changes — the failure is invisible to every other check in this
			// file. Measured as the last text row's bottom against the box's, over every rendered chip.
			// (`.text-area` is a centred flex column, and scrollHeight does NOT report overflow on one of
			// those — it read 65/65 on a visibly clipped chip. Compare the rows themselves.)
			let chipClip = 0;
			let chipWho = null;
			for (const bx of document.querySelectorAll('.person-box')) {
				const ta = bx.querySelector('.text-area');
				if (!ta || !ta.lastElementChild) continue;
				const over = Math.round(
					ta.lastElementChild.getBoundingClientRect().bottom - bx.getBoundingClientRect().bottom
				);
				if (over > chipClip) {
					chipClip = over;
					chipWho = (bx.textContent || '').trim().split('\n')[0].slice(0, 24);
				}
			}
			return {
				chipClip,
				chipWho,
				// THE BLADE IS PART OF THE CARD and must never reach past it. It is checked against the
				// CARD rather than against the viewport because it fails long before it leaves the window:
				// it kept its 925px base while the card scaled, so it hung off the card's bottom-right
				// corner while still sitting comfortably inside the screen.
				bladeOver: blade && cr ? Math.round(blade.right - cr.right) : null,
				u: getComputedStyle(document.documentElement).getPropertyValue('--stage-u').trim(),
				tier: pc?.dataset.tier,
				density: pc?.dataset.density,
				// The sanctioned exception must not be open while we measure.
				tierOpen: !!document.querySelector('.grandchild-tier'),
				// scrollHeight, not getBoundingClientRect().height: once the shell clips, the box stops
				// growing and only scrollHeight still reports what the content actually needs.
				stageH: pc ? Math.ceil(pc.scrollHeight) : null,
				// The UNION of every laid-out piece of the stage that can reach an edge.
				cardLeft: cr ? Math.round(cr.left) : null,
				cardRight: cr ? Math.round(cr.right) : null,
				edgeLeft: Math.round(
					Math.min(...[...document.querySelectorAll('.featured-card, .sib-zone, [class*=sibling]')]
						.map((e) => e.getBoundingClientRect())
						.filter((b) => b.width > 0)
						.map((b) => b.left))
				),
				edgeRight: Math.round(
					Math.max(...[...document.querySelectorAll('.featured-card, .sib-zone, [class*=sibling]')]
						.map((e) => e.getBoundingClientRect())
						.filter((b) => b.width > 0)
						.map((b) => b.right))
				),
				vw: window.innerWidth,
				vh: window.innerHeight
			};
		});

		const vOver = m.stageH - m.vh;
		const lAmp = m.edgeLeft < 0 ? -m.edgeLeft : 0;
		const rAmp = m.edgeRight > m.vw ? m.edgeRight - m.vw : 0;
		if (m.tierOpen) throw new Error('grandchild tier was open — probe must measure the RESTING stage');
		const bladeOver = m.bladeOver != null && m.bladeOver > 0 ? m.bladeOver : 0;
		const chipClip = m.chipClip > 0 ? m.chipClip : 0;
		const ok = vOver <= 0 && lAmp === 0 && rAmp === 0 && bladeOver === 0 && chipClip === 0;

		if (!ok) {
			failures.push(
				`${v.name} / ${slug}: ` +
					[
						vOver > 0 ? `stage ${m.stageH}px in a ${m.vh}px viewport (+${vOver})` : null,
						lAmp ? `stage runs ${lAmp}px off the LEFT edge` : null,
						rAmp ? `stage runs ${rAmp}px off the RIGHT edge` : null,
						bladeOver ? `CC blade overhangs the card's right edge by ${bladeOver}px` : null,
						chipClip ? `chip text clipped by ${chipClip}px ("${m.chipWho}")` : null
					]
						.filter(Boolean)
						.join('; ')
			);
		}
		if (verbose || !ok) {
			console.log(
				`  ${ok ? 'ok  ' : 'FAIL'} ${v.name.padEnd(20)} ${slug.padEnd(22)} ` +
					`u=${String(m.u).padEnd(5)} ${String(m.density).padEnd(7)} ` +
					`stage ${String(m.stageH).padStart(4)}/${m.vh}  x ${m.edgeLeft}..${m.edgeRight} of ${m.vw}`
			);
		}
		await ctx.close();
	}
}
await browser.close();

console.log('');
if (failures.length) {
	console.log(`probe-fit RED — ${failures.length}/${VIEWPORTS.length * SLUGS.length} cases fail:`);
	for (const f of failures) console.log(`  - ${f}`);
	process.exit(1);
}
console.log(`probe-fit GREEN — ${VIEWPORTS.length * SLUGS.length} cases fit.`);
