// PROBE (v4.1 item 5): the connector STEMS + LABELS ("Mary's parents", "Three children") must hard-cut the
// same frame as the chips — nothing of the old family apparatus visible during the flight. Samples every
// .connector's computed opacity from click until the hero lands; asserts ~0 throughout the flight, then it
// returns with the landing unfurl.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const CASES = [
	{ start: 'mary-pierpont-1673', target: 'mary-talcott-1720' },
	{ start: 'aaron-burr-jr-1756', target: 'sarah-edwards-1710' }
];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1680, height: 1000 } });
const page = await ctx.newPage();
let pass = 0;
for (const c of CASES) {
	await page.goto(`${BASE}/person/${c.start}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(350);
	// baseline: connectors ARE visible at rest (so the probe proves the cut, not an always-empty page)
	const restMax = await page.evaluate(() =>
		Math.max(0, ...[...document.querySelectorAll('.connector')].map((e) => +getComputedStyle(e).opacity))
	);
	await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		a?.scrollIntoView({ block: 'center' });
	}, c.target);
	await page.waitForTimeout(150);
	const geo = await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		const r = a.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}, c.target);
	await page.evaluate((tg) => {
		window.__c = { flightMax: 0, revealAt: null };
		const t0 = performance.now();
		const tick = () => {
			const t = performance.now() - t0;
			if (location.pathname.endsWith('/person/' + tg)) {
				for (const e of document.querySelectorAll('.connector')) {
					const landed = e.classList.contains('landed'); // the intended landing reveal
					const op = +getComputedStyle(e).opacity;
					// BEFORE the landed reveal, the connector must be dark — that's the whole flight
					if (!landed && op > window.__c.flightMax) window.__c.flightMax = op;
					if (landed && op > 0.3 && window.__c.revealAt === null) window.__c.revealAt = Math.round(t);
				}
			}
			if (t < 2200) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}, c.target);
	await page.mouse.click(geo.x, geo.y);
	await page.waitForTimeout(2300);
	const r = await page.evaluate(() => window.__c);
	const landedMax = await page.evaluate(() =>
		Math.max(0, ...[...document.querySelectorAll('.connector')].map((e) => +getComputedStyle(e).opacity))
	);
	const ok = restMax > 0.3 && r.flightMax < 0.05 && landedMax > 0.3 && r.revealAt !== null; // visible at rest, dark through flight, back at landing
	if (ok) pass++;
	console.log(`${ok ? '✓' : '✗'} ${c.start} → ${c.target}: connector  rest=${restMax.toFixed(2)}  pre-landed-max=${r.flightMax.toFixed(2)}  reveal@${r.revealAt}ms  landed=${landedMax.toFixed(2)}`);
}
console.log(`\nDECK-CONNECTOR PROBE: ${pass}/${CASES.length} ${pass === CASES.length ? 'GREEN' : 'RED'}`);
await b.close();
