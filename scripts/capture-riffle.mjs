// One-off: capture a 4-frame strip of the deck-riffle CC transition (not a probe).
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const OUT = '/private/tmp/claude-501/-Users-sth22-Genealogy-project-041726/8a6099cb-7e43-4460-aa0f-04d34d24f5ac/scratchpad';
const SHOTS = [140, 360, 580, 880];

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1680, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`${BASE}/person/mary-pierpont-1673`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const diag = await page.evaluate(() => ({
	deckMounted: !!document.querySelector('.deck-layer'),
	ccLinks: [...document.querySelectorAll('a[data-cc]')].map((a) => a.getAttribute('href'))
}));
console.log('DeckRiffle .deck-layer mounted:', diag.deckMounted);
console.log('CC links on page:', diag.ccLinks);

const geo = await page.evaluate(() => {
	const a = [...document.querySelectorAll('a[data-cc]')].find((x) =>
		(x.getAttribute('href') || '').endsWith('/person/mary-talcott-1720')
	);
	if (!a) return null;
	const r = a.getBoundingClientRect();
	return { x: r.left + r.width / 2, y: r.top + r.height / 2, href: a.getAttribute('href'), rc: a.dataset.relationClass };
});
if (!geo) {
	console.log('NO CC LINK');
	await b.close();
	process.exit(1);
}
console.log('clicking', geo.href, '(relationClass', geo.rc + ') at', Math.round(geo.x), Math.round(geo.y));

// rapid deck-layer sampler running in the page across the whole event
page.evaluate(() => {
	window.__deckPeak = 0;
	const t0 = performance.now();
	const tick = () => {
		const k = document.querySelector('.deck-layer')?.childElementCount ?? 0;
		if (k > window.__deckPeak) window.__deckPeak = k;
		if (performance.now() - t0 < 1600) requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
});
const urlBefore = page.url();
await page.mouse.click(geo.x, geo.y);
const start = Date.now();
const paths = [];
for (let i = 0; i < SHOTS.length; i++) {
	const wait = SHOTS[i] - (Date.now() - start);
	if (wait > 0) await page.waitForTimeout(wait);
	const p = `${OUT}/riffle-${i + 1}.png`;
	await page.screenshot({ path: p, animations: 'allow' });
	const info = await page.evaluate(() => ({
		ghosts: document.querySelectorAll('[data-deck-ghost]').length,
		deckKids: document.querySelector('.deck-layer')?.childElementCount ?? -1,
		flights: document.querySelectorAll('.featured-flight').length,
		url: location.pathname
	}));
	console.log(
		`frame ${i + 1} @${SHOTS[i]}ms → ghosts ${info.ghosts} · deckKids ${info.deckKids} · flights ${info.flights} · ${info.url}`
	);
	paths.push(p);
}
await page.waitForTimeout(1000);
const peak = await page.evaluate(() => window.__deckPeak);
console.log('DECK PEAK (max deck-layer children across the event):', peak);
console.log('urlBefore', urlBefore, '→ urlAfter', page.url());
await b.close();
