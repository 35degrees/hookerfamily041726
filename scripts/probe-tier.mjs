/**
 * probe-tier — the instrument the grandparent-tier work needed and did not have.
 *
 * WHY THIS EXISTS. During a flight one person legitimately occupies three or four DOM nodes at once:
 * the featured card, the demote chip-face inside it, a row chip, and — for the spouse hand-off — a CLONE
 * portalled to <body> carrying neither .flight nor data-flight-id. They sit in different stacking
 * contexts at different scales. Every ad-hoc selector written against that returns something plausible
 * and wrong, and an entire session was lost to exactly that:
 *
 *   - querySelector('.featured-flight') returns the ARRIVING card mid-flight, so a "departure direction"
 *     was really an arrival's.
 *   - a DETACHED node's getBoundingClientRect() is all zeros, so `0 - startLeft` reads as real travel;
 *     fourteen identical samples passed as a measurement.
 *   - getComputedStyle(el).opacity is 1 while an ANCESTOR holds it at 0 (markPending sets it on the
 *     .flight wrapper), so a correctly-hidden chip measured as fully visible — three times.
 *
 * So this probe never selects by position and never trusts a single element's opacity. It resolves
 * EFFECTIVE visibility by walking ancestors, identifies people by id/name rather than by DOM order, and
 * counts body-portalled ghosts explicitly.
 *
 * Run: node scripts/probe-tier.mjs [startSlug] [parentMatch]   (dev server on :5173)
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const START = process.argv[2] || 'john-morgan-1837';
const PARENT = process.argv[3] || null;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));

// The one function everything else is built on. Injected once, used by every sample.
const INSTRUMENT = () => {
	// Effective opacity = the product of every ancestor's, because opacity is inherited by COMPOSITING,
	// not by cascade. This is the reading that was wrong all session.
	window.__eff = (el) => {
		let o = 1;
		for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
			const v = parseFloat(getComputedStyle(n).opacity);
			if (!Number.isNaN(v)) o *= v;
			if (getComputedStyle(n).visibility === 'hidden') return 0;
		}
		return +o.toFixed(3);
	};
	// Every node that depicts a person, wherever it lives — including the hand-off clone in <body>,
	// which carries no .flight and no data-flight-id and is therefore missed by every obvious query.
	window.__nodes = (name) => {
		const sel = '.featured-card, .person-box, .handoff-ghost, .demote-chipface';
		return [...document.querySelectorAll(sel)]
			.filter((el) => new RegExp(name, 'i').test(el.textContent || ''))
			.map((el) => {
				const r = el.getBoundingClientRect();
				return {
					kind: el.classList.contains('featured-card')
						? 'card'
						: el.closest('.handoff-ghost')
							? 'ghost'
							: el.closest('.demote-chipface')
								? 'chipface'
								: el.closest('.grandparent-tier')
									? 'tierchip'
									: el.closest('.spouse-notch')
										? 'notch'
										: el.closest('.parents-slot')
											? 'parent'
											: el.closest('.children-slot')
												? 'child'
												: 'other',
					x: Math.round(r.left),
					y: Math.round(r.top),
					w: Math.round(r.width),
					h: Math.round(r.height),
					// DETACHED / zero-size nodes are reported as such rather than as a position of 0,0.
					real: r.width > 2 && r.height > 2,
					op: window.__eff(el)
				};
			});
	};
};

await page.goto(`${BASE}/person/${START}`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
await page.addInitScript(INSTRUMENT);
await page.evaluate(INSTRUMENT);

const parents = await page.evaluate(() =>
	[...document.querySelectorAll('.parents-slot a.person-box')].map((x) => x.textContent.trim().split('\n')[0])
);
console.log(`\nstart: ${await page.evaluate(() => document.querySelector('h1')?.textContent?.trim().slice(0, 34))}`);
console.log(`parents on page: ${JSON.stringify(parents)}`);
const parentMatch = PARENT || parents[0]?.split(' ')[0] || '';

const rectOf = (sel, re) =>
	page.evaluate(([s, r]) => {
		const a = [...document.querySelectorAll(s)].find((x) => new RegExp(r, 'i').test(x.textContent || ''));
		if (!a) return null;
		const b = a.getBoundingClientRect();
		return { cx: b.x + b.width / 2, cy: b.y + b.height / 2, name: a.textContent.trim().split('\n')[0] };
	}, [sel, re]);

const par = await rectOf('.parents-slot a.person-box', parentMatch);
if (!par) { console.log(`no parent chip matching /${parentMatch}/`); await browser.close(); process.exit(1); }
await page.mouse.move(par.cx, par.cy);
await page.waitForTimeout(1400);
const tierChips = await page.evaluate(() =>
	[...document.querySelectorAll('.grandparent-tier a.person-box')].map((x) => x.textContent.trim().split('\n')[0])
);
console.log(`hovered ${par.name} → tier: ${JSON.stringify(tierChips)}`);
if (!tierChips.length) { console.log('tier did not open — nothing to measure'); await browser.close(); process.exit(1); }

const gp = await rectOf('.grandparent-tier a.person-box', tierChips[0].split(' ')[0]);
const key = tierChips[0].split(' ')[0];

// Sample every frame through the promotion, keyed on the person, never on DOM order.
await page.evaluate((k) => {
	window.__s = [];
	const t0 = performance.now();
	const tick = () => {
		window.__s.push({ t: Math.round(performance.now() - t0), nodes: window.__nodes(k) });
		if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
}, key);

await page.mouse.click(gp.cx, gp.cy);
await page.waitForTimeout(2600);
const samples = await page.evaluate(() => window.__s);
const landed = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim().slice(0, 34));

console.log(`clicked grandparent ${gp.name} → landed on ${landed}\n`);
console.log(`VISIBLE COPIES OF "${key}" PER FRAME (real geometry AND effective opacity > 0.05):`);
let worst = 0;
for (const s of samples) {
	const vis = s.nodes.filter((n) => n.real && n.op > 0.05);
	if (vis.length > worst) worst = vis.length;
}
for (const i of [0, 4, 9, 16, 26, 40, samples.length - 1]) {
	const s = samples[i];
	if (!s) continue;
	const vis = s.nodes.filter((n) => n.real && n.op > 0.05);
	console.log(
		`  ${String(s.t).padStart(4)}ms  ${vis.length} visible  ` +
			vis.map((n) => `${n.kind}@(${n.x},${n.y}) ${n.w}x${n.h} α${n.op}`).join('   ')
	);
}
console.log(`\nWORST simultaneous visible copies: ${worst}`);
console.log(worst > 1 ? '  ^ more than one copy of the same person on screen — the illusion is broken' : '  one copy throughout ✓');
console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
await browser.close();
