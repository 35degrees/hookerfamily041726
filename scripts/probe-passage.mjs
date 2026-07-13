/**
 * probe-passage.mjs — THE PASSAGE LAYER (transient decade markers on a far CC arrival). Asserts:
 *   - passage marker count ∝ year-span: uncle-class (same-era) = 0; a far dive (200y) > 4, capped ≤ 8;
 *   - ZERO passage elements in the DOM at rest (before AND after the flight settles);
 *   - chip navigation spawns no passage.
 * Dev server up on :5173.
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

const count = () => page.evaluate(() => document.querySelectorAll('.passage .marker').length);

// peak marker count over ~1.3s after clicking the link matching `hrefEnds` (or a selector)
async function clickAndPeak(selectorOrHref, byHref) {
	const target = byHref
		? await page.evaluate((h) => { const a = [...document.querySelectorAll('a')].find((x) => (x.getAttribute('href') || '').endsWith(h)); if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, selectorOrHref)
		: await page.evaluate((s) => { const a = document.querySelector(s); if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, selectorOrHref);
	if (!target) return { peak: -1, atRest: 0 };
	await page.mouse.click(target.x, target.y);
	let peak = 0;
	for (let i = 0; i < 26; i++) { peak = Math.max(peak, await count()); await page.waitForTimeout(50); }
	await page.waitForTimeout(500);
	const atRest = await count();
	return { peak, atRest };
}

// far dive: michael (1935) → Rev. Bunker Gay (1735), span 200 → full passage
await page.goto(`${BASE}/person/michael-hooker-1935`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
ok((await count()) === 0, `far: ${await count()} passage elements at rest BEFORE flight (want 0)`);
const far = await clickAndPeak('/person/bunker-gay-1735', true);
ok(far.peak > 4, `far dive: peak markers ${far.peak} (want > 4)`);
ok(far.peak <= 8, `far dive: peak markers ${far.peak} (want ≤ 8 cap)`);
ok(far.atRest === 0, `far dive: ${far.atRest} passage elements linger at rest (want 0)`);
console.log(`  far dive (michael→bunker, 200y): peak=${far.peak} markers, at-rest=${far.atRest}`);

// uncle-class: same-era CC, span 48 (< 60) → NO passage
await page.goto(`${BASE}/person/matthew-russell-1761`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const uncle = await clickAndPeak('/person/matthew-talcott-1713', true);
ok(uncle.peak === 0, `uncle-class CC: peak markers ${uncle.peak} (want 0 — same-era)`);
console.log(`  uncle-class (matthew-russell→matthew-talcott, 48y): peak=${uncle.peak} markers`);

// chip navigation: a parent/child click must spawn no passage
await page.goto(`${BASE}/person/michael-hooker-1935`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const chip = await clickAndPeak('.parents-slot a, .children-slot a', false);
ok(chip.peak <= 0, `chip nav: ${chip.peak} passage markers (want 0 — chip navs untouched)`);
console.log(`  chip nav (parent/child): peak=${chip.peak <= 0 ? 0 : chip.peak} markers`);

await ctx.close();
await browser.close();
if (fails.length) { console.log('PASSAGE PROBE: RED\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('PASSAGE PROBE: GREEN — decades rush ∝ year-span (far dive > 4, uncle-class 0); nothing lingers at rest; chip nav untouched.');
