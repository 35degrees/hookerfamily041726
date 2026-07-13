/**
 * probe-field.mjs — Phase 3b field guard, WORLD-ANCHORED model (§18.6). Asserts:
 *   - REVISIT-IDENTITY (the acceptance): visit a person, navigate away, return → the decade rules are in
 *     IDENTICAL screen positions (position is a pure function of the focus's world coords — no accumulation);
 *   - the SEEK: navigating to a different-year person moves the rules (a FLIP on the flight clock), and the
 *     rule layer's transform returns to identity at rest;
 *   - reduced-motion is respected implicitly (probe runs with motion on).
 * Ledger skin (rules present) via the corner toggle. Dev server up on :5173.
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

async function setSkin(name) {
	for (let i = 0; i < 6; i++) {
		const cur = await page.evaluate(() => document.querySelector('.ground-toggle')?.textContent?.trim());
		if (cur === name) return true;
		await page.click('.ground-toggle');
		await page.waitForTimeout(160);
	}
	return false;
}
const centerOf = (sel) => page.evaluate((s) => { const a = document.querySelector(s); if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
const ruleTops = () => page.evaluate(() => [...document.querySelectorAll('.rule-h')].map((r) => Math.round(r.getBoundingClientRect().top)).sort((a, b) => a - b));
const rulesTransform = () => page.evaluate(() => { const el = document.querySelector('.layer.rules'); return el ? new DOMMatrixReadOnly(getComputedStyle(el).transform).m42 : null; });
async function clickNav(sel) { const c = await centerOf(sel); if (!c) return false; await page.mouse.click(c.x, c.y); await page.waitForTimeout(950); return true; }

await page.goto(`${BASE}/person/michael-hooker-1935`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
ok(await setSkin('Ledger'), 'could not reach the Ledger skin via the toggle');
await page.waitForTimeout(300);

// baseline at michael
const base = await ruleTops();
ok(base.length > 4, `expected decade rules on the ledger (got ${base.length})`);
const restT = await rulesTransform();
ok(restT != null && Math.abs(restT) < 1, `rules layer not at rest transform (m42 ${restT})`);

// SEEK: navigate to a child (different birth year) — the rules move to a NEW position
ok(await clickNav('.children-slot a'), 'no child to click');
const childRules = await ruleTops();
ok(JSON.stringify(childRules) !== JSON.stringify(base), 'rules did not move on navigation to a different-year person (the seek is missing)');
const childT = await rulesTransform();
ok(childT != null && Math.abs(childT) < 1, `rules layer did not settle to rest after the seek (m42 ${childT})`);

// REVISIT-IDENTITY: back to michael → rules in IDENTICAL positions
ok(await clickNav('.parents-slot a'), 'no parent to click back');
const back = await ruleTops();
ok(JSON.stringify(back) === JSON.stringify(base), `REVISIT NOT IDENTICAL — michael rules ${base.slice(0, 5)} vs return ${back.slice(0, 5)} (accumulated offset)`);

console.log(`  michael rules: ${base.slice(0, 6).join(',')} … | child (seek): ${childRules.slice(0, 6).join(',')} | revisit === base: ${JSON.stringify(back) === JSON.stringify(base)}`);

await ctx.close();
await browser.close();
if (fails.length) { console.log('FIELD PROBE: RED\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('FIELD PROBE: GREEN — decade rules are world-anchored (revisit-identical); navigation seeks (FLIP) and settles to rest.');
