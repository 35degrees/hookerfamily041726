/**
 * probe-hover-intent.mjs — the portrait must not enlarge by accident (083026).
 *
 * Sam reported two faults that look identical on screen and are not the same bug:
 *
 *   TRANSIT  "my mouse will cross over the photo in the current hero card. just for a beat or less.
 *            but when that happens the photo instantly expands ... this was not the users intention."
 *   ARRIVAL  "more frustratingly when a user mouse is stable and not moving and a photo crosses under
 *            the mouse position as cards transition."
 *
 * They need separate assertions because they have separate causes and separate fixes — a dwell timer
 * alone passes ARRIVAL happily, since the pointer really is sitting still on the target. So:
 *
 *   A  TRANSIT      a fast crossing never opens the zoom
 *   B  INTENT       entering and STOPPING does open it, and quickly enough not to feel broken
 *   C  ARRIVAL      a photo that appears under a motionless pointer does not open it
 *   D  TRANSIT-STOP crossing fast and then halting inside DOES open it — the stopping is the intent,
 *                   and a probe that only tested A could be passed by breaking the feature outright
 *
 * D is the guard that keeps this honest. Deleting the zoom entirely would make A and C green.
 *
 * Dev server up on :5173.  Run: node scripts/probe-hover-intent.mjs
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const SUBJECT = 'john-morgan-1837';
const ZOOM = 'body > div.pointer-events-none.fixed';
/** The action's own dwell is 140ms; give the sampler room to run without masking a real delay. */
const SETTLE = 420;

const fails = [];
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

const zoomOpen = () => page.evaluate((s) => !!document.querySelector(s), ZOOM);

async function photoBox() {
	const b = await page.locator('.featured-card img').first().boundingBox();
	if (!b) throw new Error('no portrait on the card');
	return b;
}

await page.goto(`${BASE}/person/${SUBJECT}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const box = await photoBox();
const mid = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

// ── A: TRANSIT ────────────────────────────────────────────────────────────────────────────────────
// Straight across the photo and out the other side, in the fewest steps Playwright will honour. Ends
// far away so nothing is hovering at the moment of the check.
await page.mouse.move(box.x - 200, mid.y);
await page.mouse.move(box.x + box.width + 300, mid.y, { steps: 3 });
await page.mouse.move(1400, 850);
await page.waitForTimeout(SETTLE);
const afterTransit = await zoomOpen();
if (afterTransit) fails.push('TRANSIT: a fast crossing opened the zoom');

// ── B: INTENT ─────────────────────────────────────────────────────────────────────────────────────
await page.mouse.move(box.x - 120, mid.y);
await page.mouse.move(mid.x, mid.y, { steps: 12 });
await page.waitForTimeout(SETTLE);
const afterIntent = await zoomOpen();
if (!afterIntent) fails.push('INTENT: entering and stopping did NOT open the zoom');

// how long it actually takes, measured rather than assumed
await page.mouse.move(1400, 850);
await page.waitForTimeout(300);
const t0 = Date.now();
await page.mouse.move(mid.x, mid.y, { steps: 10 });
let armedAt = null;
for (let i = 0; i < 60; i++) {
	if (await zoomOpen()) {
		armedAt = Date.now() - t0;
		break;
	}
	await page.waitForTimeout(20);
}
await page.mouse.move(1400, 850);
await page.waitForTimeout(200);

// ── C: ARRIVAL ────────────────────────────────────────────────────────────────────────────────────
// Park the pointer where the NEXT card's portrait will be, then navigate without moving the mouse.
// The card flies in underneath a motionless cursor — the browser synthesises the enter, and nothing
// about it is a hover.
await page.mouse.move(mid.x, mid.y);
await page.waitForTimeout(SETTLE);
await page.evaluate(() => {
	const a = document.querySelector('.sibling-strip a[href^="/person/"]');
	if (a) a.click();
});
await page.waitForTimeout(1800); // the whole flight, plus the landing unfurl
const afterArrival = await zoomOpen();
if (afterArrival) fails.push('ARRIVAL: a card landing under a still pointer opened the zoom');

// ── D: TRANSIT THEN STOP ──────────────────────────────────────────────────────────────────────────
// The counter-test. Cross fast, then halt inside — this is a reader who has arrived, and it must arm.
const box2 = await photoBox();
const mid2 = { x: box2.x + box2.width / 2, y: box2.y + box2.height / 2 };
await page.mouse.move(1400, 850);
await page.waitForTimeout(250);
await page.mouse.move(mid2.x, mid2.y, { steps: 2 }); // fast
await page.waitForTimeout(SETTLE); // then still
const afterStop = await zoomOpen();
if (!afterStop) fails.push('TRANSIT-STOP: crossing fast then halting did NOT open the zoom');

await browser.close();

console.log('  A transit (fast cross)          zoom ' + (afterTransit ? 'OPEN  <- wrong' : 'closed'));
console.log('  B intent  (enter and stop)      zoom ' + (afterIntent ? 'open' : 'CLOSED <- wrong'));
console.log('  D transit then stop             zoom ' + (afterStop ? 'open' : 'CLOSED <- wrong'));
console.log('  C arrival (card lands under)    zoom ' + (afterArrival ? 'OPEN  <- wrong' : 'closed'));
console.log('  arm latency                     ' + (armedAt === null ? 'never armed' : armedAt + 'ms'));

if (fails.length) {
	console.log('\nHOVER-INTENT PROBE: RED');
	for (const f of fails) console.log(`  ✗ ${f}`);
	process.exit(1);
}
console.log('\nHOVER-INTENT PROBE: GREEN — accidents rejected, deliberate hovers still land');
