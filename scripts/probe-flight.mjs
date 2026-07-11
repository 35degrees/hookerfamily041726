/**
 * probe-flight.mjs — guards the FROZEN flight system across the carousel re-apply. Runs after
 * every layer (not just the carousel probe). Two scripted checks, both frame-sampled:
 *
 *   A. child-click: the incoming card's spouse chips must NOT appear until the card lands
 *      (introend). We sample the visible spouse-chip count while `.featured-flight.flat` is set
 *      (flying) and assert the INCOMING count never shows before the flat class drops.
 *   B. spouse-swap demotion: no element's rect may exceed the card's right edge + 2px at any
 *      sampled frame (catches the demoting card / a chip popping off-card — the "ghost").
 *
 * Dev server must be up on :5173.  node scripts/probe-flight.mjs
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();

// clickable center of the first matching element (bypasses clipped-node interception)
const centerOf = (sel) =>
	page.evaluate((s) => {
		const el = document.querySelector(s);
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2, href: el.getAttribute('href') };
	}, sel);

// ── A. child-click: incoming spouse notch empty until landing ─────────────────────────────
// nancy-morse-1915 → child michael-hooker-1935 (4 spouses). Nancy has 3, so a visible count of 4
// is unambiguously the INCOMING card's chips.
await page.goto(`${BASE}/person/nancy-morse-1915`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const child = await centerOf('.children-slot a, [class*="children"] a');
await page.mouse.click(child.x, child.y);
const frames = [];
for (let i = 0; i < 18; i++) {
	frames.push(await page.evaluate(() => ({
		flat: !!document.querySelector('.featured-flight.flat'),
		vis: [...document.querySelectorAll('.spouse-notch .flight')].filter((e) => parseFloat(getComputedStyle(e).opacity) > 0.5).length
	})));
	await page.waitForTimeout(40);
}
// last flat frame = the landing boundary; any frame strictly before it must not show 4 (incoming).
const lastFlat = frames.reduce((acc, f, i) => (f.flat ? i : acc), -1);
const early = frames.slice(0, Math.max(0, lastFlat));
ok(!early.some((f) => f.vis >= 4), `child-click: incoming spouse chips appeared BEFORE landing (frames ${frames.map((f) => `${f.flat ? 'F' : '.'}${f.vis}`).join(' ')})`);
ok(frames[frames.length - 1].vis === 4, `child-click: incoming spouse chips never resolved after landing (got ${frames[frames.length - 1].vis})`);

// KNOWN, TOLERATED BASELINE BEHAVIOR — "Artifact A" (documented, NOT asserted): on a LEADING/middle
// spouse-chip click the growing hero flies from a left-position rect, so its right edge lands left of
// the demoting card and the demoting card's right edge is briefly EXPOSED (~228px on a 2-spouse card).
// A TRAILING click covers it fully (0px). Pre-existing flight-system behavior, newly noticed; Sam can
// live with it. Candidate fix (own micro-phase, needs approval): clip the morph layer to the
// featured-slot bounds — both morph endpoints live in-slot, so clipping loses nothing. Check B below
// deliberately filters to z-index ≥ 1 so it does NOT flag this covered-under-hero case.

// ── B. spouse-swap demotion: nothing VISIBLE flies off the card's right edge ────────────────
// Reference is the STABLE .featured-slot (the card's bounding box — it never transforms; the cards
// transform inside it). Only flag genuinely-visible pixels: opacity > 0.5 AND stacked in front
// (z-index ≥ 1). The demoting card rides at z-index 0 UNDER the incoming hero and incoming chips
// hold at opacity 0 (markPending) — both are correctly-hidden off-card flights, not the regression.
await page.goto(`${BASE}/person/nancy-morse-1915`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const chip = await centerOf('.spouse-notch .flight a');
await page.mouse.click(chip.x, chip.y);
let worst = { over: -1e9, what: '' };
for (let i = 0; i < 18; i++) {
	const hit = await page.evaluate(() => {
		const slot = document.querySelector('.featured-slot')?.getBoundingClientRect();
		if (!slot) return null;
		let worst = { over: -1e9, what: '' };
		for (const e of document.querySelectorAll('.spouse-notch .flight, .featured-flight')) {
			const cs = getComputedStyle(e);
			if (parseFloat(cs.opacity) <= 0.5) continue; // hidden / fading-out
			const z = cs.zIndex === 'auto' ? 0 : Number(cs.zIndex);
			if (z < 1) continue; // under the incoming hero — covered
			const over = e.getBoundingClientRect().right - slot.right;
			if (over > worst.over) worst = { over, what: (e.querySelector('a,h1')?.textContent || e.className).trim().slice(0, 16) };
		}
		return worst;
	});
	if (hit && hit.over > worst.over) worst = hit;
	await page.waitForTimeout(35);
}
ok(worst.over <= 2, `spouse-swap: a VISIBLE element (${worst.what}) flew ${Math.round(worst.over)}px past the card's right edge (≤ 2)`);

// ── C. the Morgan wife-#4/#5 round-trip (the scenario that caught the ghost) ───────────────
// Morgan → page so a DEEP wife (index ≥ 3) is the trailing chip → click her → click Morgan on her
// card. The pivot-aware offset must land Morgan's window with that wife a VISIBLE docked chip, and
// nothing may fly off-card during the demotion. Runs for wife #4 (offset 1) and wife #5 (offset 2).
const trailingChipInfo = () =>
	page.evaluate(() => {
		const slot = document.querySelector('.featured-slot').getBoundingClientRect();
		const mL = document.querySelector('.spouse-mask')?.getBoundingClientRect().left ?? 0;
		const vis = [...document.querySelectorAll('.spouse-strip .flight')]
			.filter((e) => { const r = e.getBoundingClientRect(); return r.right > mL + 1 && r.left < slot.right + 6; })
			.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
		const a = vis[vis.length - 1]?.querySelector('a');
		const r = a?.getBoundingClientRect();
		return a ? { href: a.getAttribute('href'), x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
	});
for (const pages of [1, 2]) {
	await page.goto(`${BASE}/person/john-morgan-1930`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	for (let i = 0; i < pages; i++) { await page.click('.caret-right'); await page.waitForTimeout(460); }
	const wife = await trailingChipInfo();
	await page.mouse.click(wife.x, wife.y);
	await page.waitForURL(`**${wife.href}`, { timeout: 4000 }).catch(() => {});
	await page.waitForTimeout(700);
	const morgan = await page.evaluate(() => {
		const a = document.querySelector('.spouse-notch a[href$="john-morgan-1930"]');
		const r = a?.getBoundingClientRect();
		return a ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
	});
	if (!morgan) { fails.push(`round-trip(${pages}): Morgan chip not found on wife card`); continue; }
	await page.mouse.move(5, 5);
	await page.mouse.click(morgan.x, morgan.y); // fly back INTO Morgan, pivot = the deep wife
	let over = -1e9;
	for (let i = 0; i < 18; i++) {
		const o = await page.evaluate(() => {
			const slot = document.querySelector('.featured-slot')?.getBoundingClientRect();
			if (!slot) return -1e9;
			let m = -1e9;
			for (const e of document.querySelectorAll('.spouse-notch .flight, .featured-flight')) {
				const cs = getComputedStyle(e);
				if (parseFloat(cs.opacity) <= 0.5) continue;
				if ((cs.zIndex === 'auto' ? 0 : Number(cs.zIndex)) < 1) continue;
				m = Math.max(m, e.getBoundingClientRect().right - slot.right);
			}
			return m;
		});
		if (o > over) over = o;
		await page.waitForTimeout(35);
	}
	ok(over <= 2, `round-trip(${pages}): a visible element flew ${Math.round(over)}px off-card during the demotion`);
	const res = await page.evaluate((href) => {
		const off = Number(document.querySelector('.spouse-notch')?.getAttribute('data-spouse-offset') ?? 0);
		const slot = document.querySelector('.featured-slot').getBoundingClientRect();
		const mL = document.querySelector('.spouse-mask')?.getBoundingClientRect().left ?? 0;
		const pivot = [...document.querySelectorAll('.spouse-strip .flight')].find((e) => e.querySelector(`a[href$="${href.split('/').pop()}"]`));
		const r = pivot?.getBoundingClientRect();
		return { off, pivotVisible: r ? r.right > mL + 1 && r.right <= slot.right + 1 : false };
	}, wife.href);
	ok(res.off > 0, `round-trip(${pages}): pivot-aware offset not applied (offset ${res.off})`);
	ok(res.pivotVisible, `round-trip(${pages}): the wife we left is not a visible docked chip on Morgan`);
}

await ctx.close();
await browser.close();

if (fails.length) {
	console.log('FLIGHT CHECK: RED\n- ' + fails.join('\n- '));
	process.exit(1);
}
console.log('FLIGHT CHECK: GREEN — incoming notch gated on landing; no off-card demotion.');
