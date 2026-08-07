/**
 * probe-shuffle — the three claims that are unique to Shuffle Notables.
 *
 * Everything else about this flight is the deck's, and the deck already has probes (direction, ping-pong,
 * phantom, jut, connector, physics, lock). Re-asserting those here would be decoration. What is NOT
 * covered anywhere else, and what this file exists for:
 *
 *   A  NEVER THE CURRENT PERSON. A shuffle that lands on the card you are already looking at reads as a
 *      dead button.
 *   B  NEVER A RECENTLY SEEN ONE. The 20-deep ring is the whole reason the carousel feels like 1,059
 *      gems rather than a handful. With an unconstrained random, a repeat inside 20 draws is ~17% likely,
 *      so this WILL regress silently if the ring ever breaks.
 *   D  THE CAROUSEL TEMPO DOES NOT LEAK. Shuffle plays 10% quicker (CAROUSEL_TEMPO); an ordinary CC must
 *      not. Since the override is module state on a shared deck, the ONE sequence that can expose a failed
 *      reset is a CC clicked straight after a shuffle — which no other probe performs. Measured against a
 *      CC on the same page with no shuffle before it, so it compares like with like.
 *
 *   C  DIRECTION IS CONSTANT. Shuffle deliberately does not use the ping-pong memory (see
 *      setCarouselLateral). If it ever inherits it, consecutive shuffles alternate and the carousel reads
 *      as undo/redo. This is the assertion that would catch it.
 *
 * Run: node scripts/probe-shuffle.mjs   (dev server up on :5173)
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const START = '/person/john-morgan-1837';
const DRAWS = 14; // enough that a broken ring almost certainly repeats, short enough to stay quick

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));

await page.goto(`${BASE}${START}`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(700);

const seen = [];
const dirs = [];
let deadClicks = 0;

for (let i = 0; i < DRAWS; i++) {
	const before = page.url().split('/person/')[1];

	// Track the DEPARTING card specifically, by holding a reference to it BEFORE the click.
	//
	// Two traps here, both of which produced a green that meant nothing:
	//
	//   1. A bare querySelector inside the flight returns whichever card is first in DOM order — that is
	//      the ARRIVING one. The first version of this probe measured the arrival and labelled it the
	//      departure, reporting +1261 for a card that in fact exits left.
	//   2. A detached node's getBoundingClientRect() is all ZEROS, so once the demoted card unmounts the
	//      reading silently becomes `0 - startLeft` — a constant with the right sign for the wrong reason.
	//      That is how 14 consecutive samples came back at exactly -250, the start position, and passed.
	//
	// So: hold the element, and stop sampling the instant it leaves the document. The last CONNECTED
	// position is the real end of its travel.
	await page.evaluate(() => {
		window.__dx = null;
		const leaving = document.querySelector('.featured-flight');
		if (!leaving) return;
		const x0 = leaving.getBoundingClientRect().left;
		let last = x0;
		const t0 = performance.now();
		const tick = () => {
			if (!leaving.isConnected) { window.__dx = last - x0; return; } // detached — freeze the last real read
			last = leaving.getBoundingClientRect().left;
			if (performance.now() - t0 < 2400) requestAnimationFrame(tick);
			else window.__dx = last - x0;
		};
		requestAnimationFrame(tick);
	});

	await page.click('.shuffle-notables', { timeout: 5000 }).catch(() => {});
	await page.waitForTimeout(2600);

	const after = page.url().split('/person/')[1];
	if (after === before) deadClicks++;
	seen.push(after);
	const dx = await page.evaluate(() => window.__dx);
	if (typeof dx === 'number') dirs.push(dx);
}

const repeats = seen.filter((s, i) => seen.indexOf(s) !== i);
const landedOnSelf = seen.filter((s, i) => i > 0 && s === seen[i - 1]);
const moved = dirs.filter((d) => Math.abs(d) > 40);
const allSameSign = moved.length > 1 && moved.every((d) => Math.sign(d) === Math.sign(moved[0]));

console.log(`\n── shuffle: ${DRAWS} draws from ${START} ──`);
console.log(`  distinct people        : ${new Set(seen).size} of ${seen.length}`);
console.log(`  repeats within window  : ${repeats.length}${repeats.length ? ' → ' + [...new Set(repeats)].join(', ') : ''}`);
console.log(`  landed on itself       : ${landedOnSelf.length}`);
console.log(`  dead clicks (no nav)   : ${deadClicks}`);
console.log(`  departure dx samples   : ${moved.map((d) => Math.round(d)).join(', ') || '(none captured)'}`);
console.log(`  (negative = the demoted card exits LEFT, which is the carousel Sam specified)`);

// ── D: the carousel tempo must not survive into the next CC ────────────────────────────────────────
const timeSettle = async () => {
	await page.evaluate(() => {
		window.__t = null;
		const t0 = performance.now();
		let stable = 0, lastKey = '', started = false;
		const tick = () => {
			const cards = [...document.querySelectorAll('.featured-flight')];
			const key = cards.map((c) => { const r = c.getBoundingClientRect();
				return `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}`; }).join('|');
			// Don't call it "at rest" before it ever moved — the flight has a lock and a lead-in.
			if (cards.length !== 1 || (lastKey && key !== lastKey)) started = true;
			if (started && cards.length === 1 && key === lastKey && key !== '') stable++; else stable = 0;
			lastKey = key;
			if (stable >= 3) { window.__t = performance.now() - t0; return; }
			if (performance.now() - t0 < 6000) requestAnimationFrame(tick); else window.__t = -1;
		};
		requestAnimationFrame(tick);
	});
};
const clickTimed = async (sel) => {
	const el = await page.$(sel);
	if (!el) return null;
	await timeSettle();
	// First client rect, never the union box — a wrapped link's union centre can sit in the gap.
	const b = await el.evaluate((n) => { const r = n.getClientRects()[0];
		return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
	await page.mouse.click(b.x, b.y);
	await page.waitForTimeout(4200);
	return await page.evaluate(() => window.__t);
};

// The comparison must be the SAME CC on the SAME page, differing only in whether a shuffle preceded it.
// A first attempt compared "first CC after a shuffle" against "first CC from the start page" and reported
// a 17% leak that did not exist: after a shuffle you are on a RANDOM person, so it was timing a different
// connection each round — and a CC's duration legitimately varies with its relation, because the phantom
// beat scales by it (DECK_BEAT_DIRECT 87 vs DECK_BEAT_COLL 170). Different CCs are simply not comparable.
// So: shuffle → land on S → time S's first CC. Then load S cold and time the very same CC.
const ccAfterShuffle = [];
const ccClean = [];
for (let i = 0; i < 4; i++) {
	await page.goto(`${BASE}${START}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(900);
	await clickTimed('.shuffle-notables');
	await page.waitForTimeout(500);
	const landed = page.url().replace(BASE, '');
	const ccHref = await page.evaluate(() => {
		const a = document.querySelector('.cc-blade a[href^="/person/"]');
		return a ? a.getAttribute('href') : null;
	});
	if (!ccHref) continue; // that notable has no cross-connections — nothing to time
	const t1 = await clickTimed('.cc-blade a[href^="/person/"]');

	// CONTROL: the identical CC, from the identical page, with no shuffle in the session.
	await page.goto(`${BASE}${landed}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(900);
	const sameCc = await page.evaluate(() => {
		const a = document.querySelector('.cc-blade a[href^="/person/"]');
		return a ? a.getAttribute('href') : null;
	});
	if (sameCc !== ccHref) continue; // the blade re-ordered — not a like-for-like pair, so discard both
	const t2 = await clickTimed('.cc-blade a[href^="/person/"]');
	if (t1 > 0 && t2 > 0) { ccAfterShuffle.push(Math.round(t1)); ccClean.push(Math.round(t2)); }
}
// Compared PER PAIR and reduced by median, not as a mean of means. CCs differ from each other by far more
// than the effect being measured (a short one runs ~480ms, a long one ~760ms), so one odd pair in the set
// swamps a mean while leaving every individual ratio untouched. The median of the ratios is the honest
// statistic here: it asks "did each CC keep its own speed", which is exactly the claim.
const ratios = ccClean.map((c, i) => (c ? ccAfterShuffle[i] / c : 1)).sort((a, b) => a - b);
const medRatio = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 1;
const drift = 1 - medRatio;
console.log(`  CC after a shuffle     : ${JSON.stringify(ccAfterShuffle)}`);
console.log(`  the SAME CC, no shuffle: ${JSON.stringify(ccClean)}`);
console.log(`  → per-pair ratios      : ${ratios.map((r) => r.toFixed(3)).join(', ')}`);
console.log(`  → median CC drift      : ${(drift * 100).toFixed(1)}%  (a leaked carousel tempo would read ≈10%)`);

const fails = [];
if (ccAfterShuffle.length < 2)
	fails.push(`D: only ${ccAfterShuffle.length} matched CC pair(s) timed — assertion did not really run`);
else if (drift > 0.04)
	fails.push(`D: the carousel tempo LEAKED into the next CC — it ran ${(drift * 100).toFixed(1)}% quick`);
if (landedOnSelf.length) fails.push(`A: landed on the current person ${landedOnSelf.length}x`);
if (repeats.length) fails.push(`B: repeated inside the ${DRAWS}-draw window: ${[...new Set(repeats)].join(', ')}`);
if (!allSameSign) fails.push(`C: departure direction is NOT constant — ${moved.map((d) => Math.round(d)).join(', ')}`);
if (moved.length && moved[0] > 0) fails.push(`C: the demoted card exits RIGHT; the carousel exits LEFT`);
if (deadClicks) fails.push(`${deadClicks} click(s) did not navigate`);
if (errors.length) fails.push(`page errors: ${errors.slice(0, 2).join(' | ')}`);

console.log(
	fails.length
		? `\nSHUFFLE PROBE: RED (${fails.length})\n- ` + fails.join('\n- ')
		: `\nSHUFFLE PROBE: GREEN — ${new Set(seen).size} distinct notables in ${DRAWS} draws, never the current person, never a repeat inside the ring, every departure travels the same way, and the carousel tempo stayed out of the CC that followed it.`
);

await browser.close();
process.exit(fails.length ? 1 : 0);
