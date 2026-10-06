// probe-heights.mjs — the small-screen measuring stick (October 6, 2026; design §53, roadmap §59).
//
// Every number in the height ladder and the phone composition was tuned against these measurements, run ad hoc
// during the session. This is that probe, kept, so the next pass starts from the same yardstick instead of
// eyeballing. Run against the dev server:
//
//     node scripts/probe-heights.mjs                # default sizes and cards
//     SLUGS=thomas-hooker-1586 node scripts/probe-heights.mjs
//     SIZES=1133x700,393x760 node scripts/probe-heights.mjs
//
// Per size × card it prints:
//   u / k / chipK     the frame unit, reading type step and chip type unit actually published
//   over              children-row bottom minus window height (NEGATIVE = fits with that much to spare)
//   chipSpill         worst px any chip's text runs past its own box (must be 0)
//   inCard            worst px a featured-card control/photo runs past the card's bottom (must be <= 0)
//   underNav          gap between the corner nav and the highest stage element in its column (must be > 0)
//   hscroll           a horizontal scrollbar (must be false — Sam's inviolable rule)
//   name / chipName / nbBody / cc   rendered font sizes, so "too small to read" is a number, not a feeling
//
// Desktop sizes are in the default set on purpose: the ladder must leave them EXACTLY as they were.
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const SLUGS = (process.env.SLUGS ?? 'william-taft-1857,thomas-hooker-1586,jared-flagg-1820,aaron-burr-sr-1716,francis-braynard-1916').split(',');
const SIZES = (process.env.SIZES ??
	'1920x1300,1440x900,1460x1040,1460x960,1460x880,1460x800,1460x750,1180x790,1133x700,744x1050,790x760,430x830,393x760')
	.split(',')
	.map((s) => s.split('x').map(Number));

const b = await chromium.launch();
for (const [w, h] of SIZES) {
	const phone = w <= 600;
	const p = await b.newPage(phone ? { isMobile: true, hasTouch: true } : {});
	await p.setViewportSize({ width: w, height: h });
	for (const slug of SLUGS) {
		const r = await p.goto(`${BASE}/${slug}`, { waitUntil: 'networkidle' }).catch(() => null);
		if (!r || r.status() !== 200) {
			console.log(`${w}x${h}`.padEnd(10), slug, 'HTTP', r?.status());
			continue;
		}
		await p.waitForTimeout(2300);
		const m = await p.evaluate(() => {
			const cs = getComputedStyle(document.documentElement);
			const num = (v) => (+cs.getPropertyValue(v) || 0).toFixed(2);
			const kids = [...document.querySelectorAll('.page-container > .children-slot > *')];
			const kb = kids.length ? Math.max(...kids.map((e) => e.getBoundingClientRect().bottom + scrollY)) : null;
			const chips = [...document.querySelectorAll('.page-container .person-box')].filter((e) => e.getBoundingClientRect().width);
			const spill = chips.length
				? Math.max(
						...chips.map((c) => {
							const cr = c.getBoundingClientRect();
							return Math.max(
								0,
								...[...c.querySelectorAll('div, span')]
									.filter((e) => e.getBoundingClientRect().height)
									.map((e) => Math.max(e.getBoundingClientRect().bottom - cr.bottom, e.getBoundingClientRect().right - cr.right))
							);
						})
					)
				: 0;
			const card = document.querySelector('.featured-flight .featured-card');
			const cr = card?.getBoundingClientRect();
			const inCard = card
				? Math.max(...[...card.querySelectorAll('.connect-btn, .portrait-column > img, .narrative-blocks h3')].map((e) => e.getBoundingClientRect().bottom - cr.bottom))
				: null;
			const nav = document.querySelector('.top-right-chrome')?.getBoundingClientRect();
			const inNavCol = nav
				? [...document.querySelectorAll('.page-container .person-box, .page-container .see-parents, .page-container .connector-label, .featured-flight .featured-card')]
						.map((e) => e.getBoundingClientRect())
						.filter((q) => q.width && q.right > nav.left && q.left < nav.right)
				: [];
			const fs = (sel) => {
				const e = document.querySelector(sel);
				return e ? parseFloat(getComputedStyle(e).fontSize).toFixed(1) : '-';
			};
			return {
				u: num('--stage-u'),
				k: num('--type-k'),
				chipK: num('--chip-k'),
				over: kb == null ? 'no kids' : Math.round(kb - innerHeight),
				chipSpill: Math.round(spill),
				inCard: inCard == null ? '-' : Math.round(inCard),
				underNav: inNavCol.length ? Math.round(Math.min(...inNavCol.map((q) => q.top)) - nav.bottom) : 'clear',
				hscroll: document.documentElement.scrollWidth > innerWidth,
				name: fs('.featured-card h1'),
				chipName: fs('[data-chip-name]'),
				nbBody: fs('.narrative-blocks .whitespace-pre-line'),
				cc: fs('.cc-text')
			};
		});
		console.log(`${w}x${h}`.padEnd(10), slug.padEnd(24), JSON.stringify(m));
	}
	await p.close();
}
await b.close();
