/**
 * probe-neighbor-stability.mjs — DOCTRINE GUARD: a chip that did NOT fly must not overshoot. The settle
 * (and any flight choreography) is strictly intra-element — only the promoting/demoting element may cross
 * its seat and spring back. A non-flying neighbour that dips-and-returns is "jello screen", the failure
 * state. This probe drives the reported repro and asserts the stationary neighbour settles MONOTONICALLY.
 *
 * Repro (Sam): /person/aaron-burr-jr-1756 featured → click father Aaron Burr Sr. Aaron Burr Jr (H00913)
 * demotes to a child chip and settles (allowed). His sister Sarah "Sally" Burr Reeve (H00912) did NOT fly
 * — she must reach her rest position without dipping PAST it. Today she overshoots ~23px (the whole child
 * row dips), because the featured-slot height-glide repositions the row while her entrance transform plays.
 *
 * RED on the current build (pre-existing bug, newly exposed); GREEN once the row no longer overshoots.
 * Bisect note: this bug reproduces on the PRISTINE build too (measured identical ~62px range) — it is NOT
 * the demote settle. Dev server up on :5173. Run: node scripts/probe-neighbor-stability.mjs
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const OVERSHOOT_MAX = 4; // px a non-flying neighbour may pass its rest position (rAF noise headroom; jello is ~23)

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const fails = [];

// NEIGHBOUR = a children-slot chip that is NOT the flying element's seat. Its rest is its final settled top;
// a clean entrance approaches rest monotonically. Overshoot = how far it passes rest and returns.
async function neighbourOvershoot(featured, fatherHrefFrag, neighbourId, flyingSeatId, label) {
	await page.goto(`${BASE}/person/${featured}`, { waitUntil: 'networkidle' });
	await page.waitForSelector('.parents-slot .flight a', { timeout: 8000 }).catch(() => {});
	await page.waitForTimeout(500);
	const fpt = await page.evaluate((frag) => {
		const a = [...document.querySelectorAll('.parents-slot .flight a')].find((a) => a.getAttribute('href')?.includes(frag));
		if (!a) return null; const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}, fatherHrefFrag);
	if (!fpt) { fails.push(`${label}: father link (${fatherHrefFrag}) not found`); return; }
	await page.mouse.click(fpt.x, fpt.y);
	const raw = await page.evaluate((id) => new Promise((res) => {
		const out = []; let n = 0;
		const tick = () => {
			const el = document.querySelector(`.children-slot [data-flight-id="${id}"]`);
			// Gate on VISIBILITY: a held-pending chip (opacity 0) sits at the pre-settle layout position but is
			// INVISIBLE — its position is irrelevant. Jello is a VISIBLE dip past rest, so only painted frames
			// count. (Without this the probe mis-reads the hidden pending position as a spurious ~111px overshoot.)
			if (el) out.push({ top: +el.getBoundingClientRect().top.toFixed(1), op: parseFloat(getComputedStyle(el).opacity || '1') });
			if (++n < 100) requestAnimationFrame(tick); else res(out);
		};
		requestAnimationFrame(tick);
	}), neighbourId);
	await page.waitForTimeout(300);
	const seq = raw.filter((f) => f.op > 0.05).map((f) => f.top); // visible frames only
	if (seq.length < 8) { fails.push(`${label}: neighbour ${neighbourId} not sampled while visible (${raw.length} raw frames)`); return; }
	// rest = median of the last 8 VISIBLE frames (settled). The neighbour enters from ABOVE (smaller top);
	// overshoot is any visible excursion BELOW rest (larger top) that then returns — the dip-and-spring jello.
	const tail = seq.slice(-8).sort((a, b) => a - b);
	const rest = tail[Math.floor(tail.length / 2)];
	const overshoot = Math.max(0, Math.max(...seq) - rest);
	const ok = overshoot <= OVERSHOOT_MAX;
	console.log(`  ${label}: neighbour ${neighbourId} rest=${rest} maxTop=${Math.max(...seq).toFixed(1)} overshoot=${overshoot.toFixed(1)}px ${ok ? 'OK' : 'JELLO'} (flying seat ${flyingSeatId} excluded)`);
	if (!ok) fails.push(`${label}: non-flying neighbour ${neighbourId} overshoots its rest by ${overshoot.toFixed(1)}px (>${OVERSHOOT_MAX}) — the row dips (jello)`);
}

await neighbourOvershoot('aaron-burr-jr-1756', 'aaron-burr-sr', 'H00912', 'H00913', 'burr child-row');

await ctx.close();
await browser.close();
if (fails.length) { console.log('NEIGHBOR-STABILITY PROBE: RED\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('NEIGHBOR-STABILITY PROBE: GREEN — non-flying neighbours settle without overshoot (no jello).');
