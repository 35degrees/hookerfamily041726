/**
 * probe-back-button.mjs — does the browser's BACK / FORWARD bring the featured card with the URL?
 *
 * The warm path changes the URL with shallow routing (navigate.ts), so the browser's history fills with
 * entries the page has to reconcile itself (+page.svelte's popstate effect). The failure Sam reported
 * (10/02): after four Backs the address bar read timothy-dwight-iii-1752 while Charles Francis Adams III
 * was still the card — a card and URL that disagree, fixed only by a refresh.
 *
 * Walks three chip clicks down from Thomas, then Back x3 and Forward x1, and after each step asserts
 * that the slug in location.pathname and the card's own ID (the mono id beside the name) are the same
 * person. A history step must also ENTER its state rather than travel to it (Sam, 100226: "it should not
 * transition with the back button"): 150ms after a Back the new card is already there, there is exactly
 * one card, and nothing on the stage is animating or pinned mid-flight. Run against a live `npm run dev`:
 *
 *   node scripts/probe-back-button.mjs
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const START = '/person/thomas-hooker-1586';
const SETTLE = 1800; // a flight plus its landing, generously

const b = await chromium.launch();
const p = await b.newPage();
await p.setViewportSize({ width: 1440, height: 900 });

/** The slug in the address bar, and the slug of the person whose card is actually showing. */
async function state() {
	return p.evaluate(async () => {
		const urlSlug = decodeURIComponent(location.pathname.split('/').pop() ?? '');
		const name = document.querySelector('.featured-card h1')?.textContent?.trim() ?? '(no card)';
		return { urlSlug, name };
	});
}
/** Who SHOULD be on the card for a slug — read from the static payload, the same file the page loads. */
async function nameFor(slug) {
	const res = await fetch(`${BASE}/data/person/${slug}.json`);
	if (!res.ok) return `(no payload for ${slug})`;
	const d = await res.json();
	return `${d.person.bio?.display_name ?? d.person.name?.display_name}${d.person.id}`;
}

const HISTORY_LOOK = 150; // ms after a Back/Forward: an instant swap is finished; a flight is mid-air

/** Is anything still moving? Cards, chips and the pinned leavers flyOut parks at position:fixed. */
async function motion() {
	return p.evaluate(() => {
		const cards = document.querySelectorAll('.featured-flight').length;
		const els = [...document.querySelectorAll('.featured-flight, .flight')];
		const animating = els.filter((el) => el.getAnimations().some((a) => a.playState === 'running')).length;
		const pinned = els.filter((el) => getComputedStyle(el).position === 'fixed').length;
		return { cards, animating, pinned };
	});
}

const rows = [];
let fails = 0;
async function check(step, instant = false) {
	const m = instant ? await motion() : null;
	const s = await state();
	const want = await nameFor(s.urlSlug);
	let ok = s.name.replace(/\s+/g, '') === want.replace(/\s+/g, '');
	let note = '';
	if (m) {
		const still = m.cards === 1 && m.animating === 0 && m.pinned === 0;
		if (!still) ok = false;
		note = `  [cards ${m.cards}, animating ${m.animating}, pinned ${m.pinned}]`;
	}
	if (!ok) fails++;
	rows.push(`${ok ? 'GREEN' : 'RED  '}  ${step.padEnd(14)} url=${s.urlSlug.padEnd(34)} card=${s.name}${note}`);
}

await p.goto(BASE + START);
await p.waitForTimeout(SETTLE);
await check('load');

// Three warm navigations: a child chip each time (first child in the row).
for (let i = 1; i <= 3; i++) {
	const link = p.locator('.page-container > .children-slot > .flight a').first();
	if ((await link.count()) === 0) break;
	await link.click();
	await p.waitForTimeout(SETTLE);
	await check(`click ${i}`);
}
for (let i = 1; i <= 3; i++) {
	await p.goBack();
	await p.waitForTimeout(HISTORY_LOOK);
	await check(`back ${i}`, true);
}
await p.goForward();
await p.waitForTimeout(HISTORY_LOOK);
await check('forward 1', true);

// RAPID: three history steps fired faster than a payload can arrive, so their fetches overlap and can
// resolve out of order. Only the entry the address bar ends on may win (navigate.ts loadFeatured).
await p.goForward();
await p.waitForTimeout(40);
await p.goForward();
await p.waitForTimeout(40);
await p.goBack();
await p.waitForTimeout(400);
await check('rapid f,f,b', true);

// AND THE PAGE STILL TRAVELS AFTERWARDS: a Back must leave no flight lock or stale capture behind, so
// an ordinary chip click right after it has to fly and land as usual.
const after = p.locator('.page-container > .children-slot > .flight a').first();
if ((await after.count()) > 0) {
	await after.click();
	await p.waitForTimeout(SETTLE);
	await check('click after');
}

await b.close();
console.log(rows.join('\n'));
console.log(
	fails
		? `\nBACK-BUTTON PROBE: RED — ${fails} step(s) left the card and the URL on different people`
		: '\nBACK-BUTTON PROBE: GREEN — every Back/Forward brought the card with the URL'
);
process.exit(fails ? 1 : 0);
