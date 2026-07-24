// PROBE: the neighborhood photo preload. On a warm nav the incoming neighborhood's person photos must be
// warmed during the flight, so child chips are LOADED (never blank) by the time they reveal at landing.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1680, height: 1000 } });
const page = await ctx.newPage();

// count Cloudinary w_600 image requests (the shared person-photo derivative)
let imgReqs = 0;
page.on('request', (r) => {
	if (r.resourceType() === 'image' && r.url().includes('res.cloudinary.com') && r.url().includes('w_600')) imgReqs++;
});

// Start on Peter Taft; navigate UP to his father Alphonso (a chip click) — Alphonso's page has children
// (incl. Peter) with photos, which must be preloaded during the flight.
await page.goto(`${BASE}/person/peter-taft-ii-1846`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
imgReqs = 0; // reset — count only what the NAV triggers

const clicked = await page.evaluate(() => {
	// the father chip: a parent PersonBox linking to alphonso
	const a = [...document.querySelectorAll('a[data-relation="parent"]')].find((x) =>
		(x.getAttribute('href') || '').includes('alphonso-taft')
	);
	if (!a) return false;
	a.scrollIntoView({ block: 'center' });
	const r = a.getBoundingClientRect();
	window.__clickXY = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	return true;
});
if (!clicked) { console.log('no father chip to alphonso found'); await b.close(); process.exit(1); }
const xy = await page.evaluate(() => window.__clickXY);

const tNav = Date.now();
await page.mouse.click(xy.x, xy.y);
// wait past the flight + landing
await page.waitForTimeout(1600);

// at landing: are the chip photos loaded (not blank)? break out by relation.
const chips = await page.evaluate(() => {
	const out = {};
	for (const box of document.querySelectorAll('[data-relation]')) {
		const rel = box.getAttribute('data-relation');
		const img = box.querySelector('img');
		if (!img) continue; // no photo for this person (fine)
		(out[rel] ??= []).push({ complete: img.complete && img.naturalWidth > 0 });
	}
	return { url: location.pathname, byRel: out };
});
console.log(`nav → ${chips.url}  (flight+landing elapsed ~${Date.now() - tNav}ms)`);
console.log(`w_600 image requests triggered by the nav: ${imgReqs}`);
let allGood = true, any = false;
for (const [rel, arr] of Object.entries(chips.byRel)) {
	const loaded = arr.filter((c) => c.complete).length;
	if (loaded < arr.length) allGood = false;
	any = true;
	console.log(`   ${loaded === arr.length ? '✓' : '✗'} ${rel.padEnd(11)} ${loaded}/${arr.length} loaded at landing`);
}
console.log(`\nPHOTO-PRELOAD PROBE: ${any && allGood ? 'GREEN — every chip loaded at landing' : !any ? 'N/A' : 'RED — a chip was blank at landing'}`);
await b.close();
