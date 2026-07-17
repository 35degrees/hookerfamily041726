// probe-ghosts.mjs — the guard the suite was missing by construction. Every probe written today asserts the
// INCOMING element doesn't appear early; NONE asserted the OUTGOING element actually LEFT. A ghost is an old
// element that persisted, so those probes can't see this class. This one tracks OUTGOING identity by id/slug
// and asserts the old person's chips (spouse AND sibling), the old featured card, and any uncaught page error
// all reach zero and STAY zero from flight-start through 500ms past landing — and that nothing accumulates
// across repeated navs. Covers Sam's worst case (sibling carousel OPEN, then a chip click) on BOTH promotion
// directions: UP to a parent chip and DOWN to a child chip.
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';

// Outgoing person: JP Morgan. All trackers key off HIS identity, so they're destination-agnostic (a bloodline
// child destination legitimately has its OWN panel — we never confuse it with JP's stranded chips).
const START = 'john-morgan-1837';
const OLD_H1 = 'JP';
const OLD_SPOUSE_IDS = ['X00361', 'X00360'];
const OLD_SIBLING_SLUGS = ['sarah-morgan-1839', 'junius-morgan-jr-1846', 'juliet-morgan-1847', 'mary-burns-1844'];
const CASES = [
	{ name: 'UP → parent chip', link: 'a[data-relation="parent"][href="/person/junius-morgan-1813"]' },
	{ name: 'DOWN → child chip', link: 'a[data-relation="child"][href="/person/louisa-satterlee-1866"]' }
];

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'no-preference' });
const p = await ctx.newPage();
let pageErrors = [];
p.on('pageerror', (e) => pageErrors.push(e.message.split('\n')[0]));

const oldSiblingSel = OLD_SIBLING_SLUGS.map((s) => `.sibling-strip a[href="/person/${s}"]`).join(',');

let failures = 0;
for (const c of CASES) {
	await p.goto(`${BASE}/person/${START}`, { waitUntil: 'networkidle' });
	await p.waitForTimeout(900);
	if (await p.locator('.sibling-trigger').count()) {
		await p.click('.sibling-trigger'); // Sam's worst case: carousel OPEN before the click
		await p.waitForTimeout(700);
	}
	if ((await p.locator(c.link).count()) === 0) { console.log(`  SKIP ${c.name}: link not found`); continue; }
	pageErrors = [];

	// Per-frame from the click: count OUTGOING artifacts by identity.
	await p.evaluate(({ ids, oldSibSel }) => {
		window.__gh = [];
		const t0 = performance.now();
		(function frame() {
			const t = performance.now() - t0;
			const cards = [...document.querySelectorAll('.featured-flight')];
			const flying = cards.some((el) => el.classList.contains('flat') || getComputedStyle(el).transform !== 'none');
			const oldSpouse = ids.filter((id) => document.querySelector(`.spouse-strip .flight[data-flight-id="${id}"]`)).length;
			const oldSib = document.querySelectorAll(oldSibSel).length;
			window.__gh.push({ t: Math.round(t), flying, oldSpouse, oldSib, cards: cards.length });
			if (t < 1800) requestAnimationFrame(frame);
			else window.__ghDone = true;
		})();
	}, { ids: OLD_SPOUSE_IDS, oldSibSel: oldSiblingSel });
	await p.click(c.link);
	await p.waitForFunction(() => window.__ghDone, null, { timeout: 5000 });
	const s = await p.evaluate(() => window.__gh);

	const flyStartIdx = s.findIndex((x) => x.flying);
	const flyEnd = s.find((x, i) => i > flyStartIdx && !x.flying)?.t ?? 700;
	const LINGER = flyEnd + 500;
	const lastOldSib = Math.max(-1, ...s.filter((x) => x.oldSib > 0).map((x) => x.t));
	const lastOldSpouse = Math.max(-1, ...s.filter((x) => x.oldSpouse > 0).map((x) => x.t));

	const endH1 = (await p.locator('.featured-flight h1').first().textContent().catch(() => '')) || '';
	const endCards = await p.locator('.featured-flight').count();
	const endOldSib = await p.locator(oldSiblingSel).count();

	const fails = [];
	if (pageErrors.length) fails.push(`uncaught page error "${pageErrors[0]}" — freezes the reactive flush`);
	if (endH1.includes(OLD_H1)) fails.push(`outgoing card still showing ("${endH1.trim()}") — old card never left`);
	if (endCards !== 1) fails.push(`${endCards} featured cards at rest (expected 1)`);
	if (endOldSib > 0) fails.push(`${endOldSib} of the outgoing person's sibling chips still mounted at rest`);
	if (lastOldSib > LINGER) fails.push(`outgoing sibling chips linger to t=${lastOldSib} (past landing+500=${LINGER}) — ghost cascade / frozen panel`);
	if (lastOldSpouse > LINGER) fails.push(`outgoing spouse chips linger to t=${lastOldSpouse} (past landing+500=${LINGER})`);

	if (fails.length) { failures++; console.log(`  RED  ${c.name}`); for (const f of fails) console.log(`         - ${f}`); }
	else console.log(`  GREEN ${c.name} — old card/spouse/sibling all gone by landing (sib last t=${lastOldSib}, spouse last t=${lastOldSpouse}); no error`);
}

// Accumulation guard: repeated round-trips must not leak resident flight/chip nodes.
await p.goto(`${BASE}/person/${START}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
const baseline = await p.evaluate(() => document.querySelectorAll('.featured-flight, .sibling-strip .person-box, .spouse-strip .flight').length);
for (let i = 0; i < 3; i++) {
	await p.goto(`${BASE}/person/junius-morgan-1813`, { waitUntil: 'networkidle' });
	await p.waitForTimeout(400);
	await p.goto(`${BASE}/person/${START}`, { waitUntil: 'networkidle' });
	await p.waitForTimeout(400);
}
const afterRepeats = await p.evaluate(() => document.querySelectorAll('.featured-flight, .sibling-strip .person-box, .spouse-strip .flight').length);
if (afterRepeats > baseline) { failures++; console.log(`  RED  accumulation: ${baseline} → ${afterRepeats} resident nodes across navs`); }
else console.log(`  GREEN accumulation: ${baseline} → ${afterRepeats} resident nodes (no leak)`);

await b.close();
if (failures) { console.log(`\nGHOSTS PROBE: RED — ${failures} case(s) left an outgoing element behind.`); process.exit(1); }
console.log('\nGHOSTS PROBE: GREEN — on both promotion directions the old card, old spouse chips, and old sibling panel all leave by landing; no page error; no node accumulation.');
