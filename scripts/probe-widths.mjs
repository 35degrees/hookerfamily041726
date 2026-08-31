/**
 * probe-widths.mjs — THE WHOLE WIDTH RANGE, IN ONE TABLE, WITH A BASELINE (083026).
 *
 * WHY THIS EXISTS, and it is worth being blunt about it. Sam asked for one boundary to move (the
 * sibling menu vanishing at 1100 with a "decent gap" still on screen). Three attempts went in, each
 * fixed the width he had named, and each broke widths nobody was looking at — the tier-B floor, the
 * tablet composition, and finally the phone, which Sam had been happy with and which came back
 * "wrecked". All three were reverted. The fault was not the arithmetic in any one of them; it was
 * that the levers being pulled — the rung LADDER and the width CLAMP — are global, every viewport in
 * the app depends on them, and they were being judged against a five-row table spanning 900-1400.
 *
 * So: no ladder change without this. Capture a baseline on a build Sam is happy with, make the
 * change, and diff. A regression at 393px shows up in the same breath as an improvement at 1050px,
 * which is the only way a global lever can honestly be pulled.
 *
 *   node scripts/probe-widths.mjs --save     record the CURRENT build as the baseline
 *   node scripts/probe-widths.mjs            sweep and diff against it
 *
 * WHAT IT ASSERTS vs WHAT IT REPORTS. Two things are LAW and fail the run:
 *   - no horizontal scrollbar, ever (Sam, Aug 8: "there's never a horizonal scrollbar allowed")
 *   - the card never overflows `.page-container`'s content box
 * Everything else — u, card size, where the timeline's bars sit — is REPORTED and diffed, because
 * those are design decisions whose right value is Sam's call, not a probe's. A diff is information,
 * not a failure; the run only goes red on the two laws and on a width that stopped rendering.
 *
 * Dev server up on :5173.
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = 'http://localhost:5173';
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'probe-out');
const BASELINE = join(OUT, 'widths-baseline.json');
const SAVE = process.argv.includes('--save');

/** A person WITH siblings, so the column's appearance and disappearance is part of every row. */
const SUBJECT = 'john-morgan-1837';

/**
 * REAL DEVICE SIZES WHERE THEY EXIST, and the boundaries either side where they matter. The heights
 * are not decoration: the rung ladder gates on minH as well as minW, so a width tested at the wrong
 * height silently exercises a different rung than a real device would.
 */
const SIZES = [
	[393, 852, 'iPhone 15'],
	[430, 932, 'iPhone Pro Max'],
	[600, 960, 'narrow window'],
	[768, 1024, 'iPad portrait'],
	[820, 1180, 'iPad Air portrait'],
	[850, 900, 'below the floor'],
	[900, 900, 'small landscape floor'],
	[950, 900, ''],
	[1000, 900, ''],
	[1024, 768, 'iPad landscape'],
	[1050, 900, 'sibling target'],
	[1099, 900, 'just under 1100'],
	[1100, 900, 'tablet landscape floor'],
	[1180, 820, 'iPad Air landscape'],
	[1240, 900, 'desktop floor'],
	[1280, 800, ''],
	[1440, 900, 'laptop'],
	[1600, 1000, 'desktop']
];

async function sample(page, w, h) {
	await page.setViewportSize({ width: w, height: h });
	await page.goto(`${BASE}/person/${SUBJECT}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(380);
	return page.evaluate(() => {
		const rs = getComputedStyle(document.documentElement);
		const cont = document.querySelector('.page-container');
		const card = document.querySelector('.featured-card');
		const strip = document.querySelector('.sibling-strip');
		const bars = [...document.querySelectorAll('.bar')].map((e) => e.getBoundingClientRect().right);
		if (!cont || !card) return null;
		const cs = getComputedStyle(cont);
		const cr = card.getBoundingClientRect();
		const contR = cont.getBoundingClientRect();
		const padL = parseFloat(cs.paddingLeft) || 0;
		const padR = parseFloat(cs.paddingRight) || 0;
		const sr = strip ? strip.getBoundingClientRect() : null;
		return {
			u: +(+rs.getPropertyValue('--stage-u') || 0).toFixed(3),
			k: +(+rs.getPropertyValue('--type-k') || 0).toFixed(3),
			cardL: Math.round(cr.left),
			cardW: Math.round(cr.width),
			cardR: Math.round(cr.right),
			sibs: !!strip,
			sibR: sr ? Math.round(sr.right) : null,
			barR: bars.length ? Math.round(Math.max(...bars)) : 0,
			// LAW 1: the card must fit between its container's own pads.
			overflow: Math.round(padL + cr.width + padR - contR.width),
			// LAW 2: never a horizontal scrollbar.
			hscroll: document.documentElement.scrollWidth > window.innerWidth,
			// Reported: how much unused width is sitting to the right of everything on stage.
			gutter: Math.round(window.innerWidth - (sr ? sr.right : cr.right))
		};
	});
}

const browser = await chromium.launch();
const page = await browser.newPage();
const rows = {};
const fails = [];

for (const [w, h, note] of SIZES) {
	const key = `${w}x${h}`;
	const m = await sample(page, w, h);
	if (!m) {
		fails.push(`${key}: nothing rendered`);
		continue;
	}
	rows[key] = m;
	if (m.hscroll) fails.push(`${key}: HORIZONTAL SCROLLBAR — the one inviolable rule`);
	if (m.overflow > 1) fails.push(`${key}: card overflows its container by ${m.overflow}px`);
	void note;
}
await browser.close();

let base = null;
if (!SAVE && existsSync(BASELINE)) base = JSON.parse(readFileSync(BASELINE, 'utf8'));

const d = (now, was, w = 5) => {
	if (was === undefined || was === null || now === was) return String(now).padEnd(w);
	return `${now}(${was})`.padEnd(w);
};

console.log('\n  size       note                    u      card  L     R     sibs    bars  gutter');
for (const [w, h, note] of SIZES) {
	const key = `${w}x${h}`;
	const m = rows[key];
	if (!m) continue;
	const b = base?.[key];
	const clear = m.cardL >= m.barR ? 'clear' : `cov${m.barR - m.cardL}`;
	console.log(
		`  ${key.padEnd(10)} ${(note || '').padEnd(23)} ` +
			`${d(m.u, b?.u, 6)} ${d(m.cardW, b?.cardW, 5)} ${d(m.cardL, b?.cardL, 5)} ` +
			`${d(m.sibs ? m.sibR : m.cardR, b ? (b.sibs ? b.sibR : b.cardR) : null, 5)} ` +
			`${d(m.sibs ? 'yes' : 'no', b ? (b.sibs ? 'yes' : 'no') : null, 7)} ` +
			`${d(clear, b ? (b.cardL >= b.barR ? 'clear' : `cov${b.barR - b.cardL}`) : null, 5)} ` +
			`${d(m.gutter, b?.gutter, 5)}`
	);
}
if (base) console.log('\n  values in (parentheses) are the BASELINE where this run differs');

if (SAVE) {
	mkdirSync(OUT, { recursive: true });
	writeFileSync(BASELINE, JSON.stringify(rows, null, 1));
	console.log(`\n  baseline saved → ${BASELINE}`);
}

if (fails.length) {
	console.log('\nWIDTHS PROBE: RED');
	for (const f of fails) console.log(`  ✗ ${f}`);
	process.exit(1);
}
console.log('\nWIDTHS PROBE: GREEN — no horizontal scrollbar and no container overflow at any size');
