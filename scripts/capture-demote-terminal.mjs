/**
 * capture-demote-terminal.mjs — L3a "flip early, land as a chip" artifact. Fires a RELATIVE demotion
 * (michael → click parent Rodman: michael's card demotes into a child box) and captures three stages
 * of the flip — EARLY (big chip, just cross-faded in — the start-stretch Sam wants to judge), MID,
 * and NEAR-LANDING (≈box size) — plus the real destination box at rest for a side-by-side. One fresh
 * navigation per stage (a single ~540ms flight is too fast to catch multiple bands per run).
 *
 *   node scripts/capture-demote-terminal.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const OUT = 'scripts/probe-out';
const START = 'michael-hooker-1935';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
// HEIGHT 1400, NOT 1000. This clips to the children-row box at rest, and on a rich card that row now
// sits below a 1000px viewport — the stage's vertical overflow (design §13, still unfixed pending the
// content budget) put the crop target off-screen and the capture died with "clipped area is outside
// the resulting image". Nothing to do with what it measures; it just needs room to see its subject.
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

async function clickParent() {
	await page.goto(`${BASE}/person/${START}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	const p = await page.evaluate(() => {
		const a = document.querySelector('.parents-slot a');
		const r = a.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	});
	await page.mouse.move(5, 5);
	await page.mouse.click(p.x, p.y);
}

const stages = [
	['flip-early', 900, 700],
	['flip-mid', 560, 430],
	['flip-land', 300, 190]
];
const results = [];
for (const [name, hi, lo] of stages) {
	await clickParent();
	let done = false;
	for (let i = 0; i < 400; i++) {
		const st = await page.evaluate(() => {
			const d = [...document.querySelectorAll('.featured-flight')].find((c) => getComputedStyle(c).zIndex === '0');
			if (!d) return null;
			const b = d.getBoundingClientRect();
			const face = d.querySelector('.demote-chipface');
			return { w: b.width, faceOp: face ? parseFloat(getComputedStyle(face).opacity) : -1, clip: { x: Math.max(0, Math.round(b.left) - 16), y: Math.max(0, Math.round(b.top) - 16), width: Math.min(1440, Math.round(b.width) + 32), height: Math.round(b.height) + 32 } };
		});
		if (st && st.w <= hi && st.w >= lo) {
			await page.screenshot({ path: `${OUT}/demote-${name}.png`, clip: st.clip });
			results.push(`${name}: w=${Math.round(st.w)} faceOp=${st.faceOp.toFixed(2)}`);
			done = true;
			break;
		}
		await page.waitForTimeout(2);
	}
	if (!done) results.push(`${name}: MISSED`);
}

// real destination box at rest (michael, now a child) — the side-by-side reference
await page.waitForTimeout(1000);
const rest = await page.evaluate(() => {
	const b = document.querySelector('.children-slot .flight');
	if (!b) return null;
	const r = b.getBoundingClientRect();
	return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
});
if (rest) await page.screenshot({ path: `${OUT}/demote-rest-box-crop.png`, clip: { x: rest.x - 8, y: rest.y - 8, width: rest.w + 16, height: rest.h + 16 } });

console.log(results.join(' | ') + ` | rest box: ${JSON.stringify(rest)}`);
await ctx.close();
await browser.close();
