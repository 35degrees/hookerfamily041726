/**
 * spike-scale — settles ONE question empirically before Phase 2.75 picks a mechanism:
 * what does `transform: scale(s)` on `.page-container` do to the two things the motion engine relies on?
 *
 *   A. a position:fixed pin at a captured VIEWPORT rect, applied to a node INSIDE the stage
 *   B. a translate(dx) derived from MEASURED rects, applied to a node INSIDE the stage
 *
 * Throwaway. If it is still here after Phase 2.75 lands, delete it.
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto('http://localhost:5173/person/aaron-burr-jr-1756', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);

const r = await page.evaluate(() => {
	const pc = document.querySelector('.page-container');
	const chip = document.querySelector('.children-slot > .flight');
	const out = {};

	// ── baseline, unscaled ──────────────────────────────────────────────────────────
	const before = chip.getBoundingClientRect();
	out.unscaledChip = { l: Math.round(before.left), t: Math.round(before.top), w: Math.round(before.width) };

	// capture a viewport rect the way flight.ts's captureRects does, BEFORE the scale
	const snap = { left: before.left, top: before.top, width: before.width, height: before.height };

	// ── now scale the stage ─────────────────────────────────────────────────────────
	pc.style.transformOrigin = 'top center';
	pc.style.transform = 'scale(0.8)';

	const scaled = chip.getBoundingClientRect();
	out.scaledChip = { l: Math.round(scaled.left), t: Math.round(scaled.top), w: Math.round(scaled.width) };

	// A. pin it position:fixed at the captured VIEWPORT rect, exactly as flyOut does
	const probe = chip.cloneNode(true);
	probe.id = 'spike-pin';
	probe.style.cssText =
		`position: fixed; left: ${snap.left}px; top: ${snap.top}px; ` +
		`width: ${snap.width}px; height: ${snap.height}px; margin: 0;`;
	pc.appendChild(probe); // INSIDE the stage, like a real leaver
	const pinned = probe.getBoundingClientRect();
	out.pin = {
		asked: { l: Math.round(snap.left), t: Math.round(snap.top), w: Math.round(snap.width) },
		landed: { l: Math.round(pinned.left), t: Math.round(pinned.top), w: Math.round(pinned.width) }
	};

	// B. a translate derived from measured (visual) rects, applied in local space
	const probe2 = chip.cloneNode(true);
	probe2.style.cssText = 'position: absolute; left: 0; top: 0; transform: translateX(100px);';
	pc.appendChild(probe2);
	const t0 = probe2.getBoundingClientRect().left;
	probe2.style.transform = 'translateX(200px)';
	const t1 = probe2.getBoundingClientRect().left;
	out.translate = { askedFor: 100, movedVisually: Math.round(t1 - t0) };

	// C. does a body-level fixed ghost stay put? (flight.ts portals the handoff ghost to <body>)
	const ghost = chip.cloneNode(true);
	ghost.style.cssText = `position: fixed; left: ${snap.left}px; top: ${snap.top}px; width: ${snap.width}px;`;
	document.body.appendChild(ghost);
	const gr = ghost.getBoundingClientRect();
	out.bodyGhost = { asked: Math.round(snap.left), landed: Math.round(gr.left), w: Math.round(gr.width) };

	return out;
});

console.log('\n── transform: scale(0.8) on .page-container ─────────────────────────────');
console.log('chip rect  unscaled', r.unscaledChip, '\n           scaled  ', r.scaledChip);
console.log('\nA. in-stage position:fixed pin at a captured viewport rect');
console.log('     asked ', r.pin.asked, '\n     landed', r.pin.landed);
console.log(
	`     => ${r.pin.landed.l === r.pin.asked.l && r.pin.landed.t === r.pin.asked.t ? 'VIEWPORT-relative (safe)' : 'RE-BASED to the stage (BREAKS flyOut)'}`
);
console.log('\nB. translate(100px) applied in-stage');
console.log(`     asked for 100px, moved ${r.translate.movedVisually}px visually`);
console.log(
	`     => ${r.translate.movedVisually === 100 ? 'local px == visual px (safe)' : `every measured delta is wrong by 1/s (BREAKS every flight translate)`}`
);
console.log('\nC. body-portalled fixed ghost');
console.log(`     asked left ${r.bodyGhost.asked}, landed ${r.bodyGhost.landed}, width ${r.bodyGhost.w}`);
console.log(
	`     => position ${r.bodyGhost.landed === r.bodyGhost.asked ? 'correct' : 'WRONG'}, but its CONTENT lays out at 1:1 inside a scaled stage's world`
);
console.log('');

await browser.close();
