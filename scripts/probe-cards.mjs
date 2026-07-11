/**
 * probe-cards.mjs — standing layout-verification harness for the featured card.
 *
 * Drives a headless Chromium against the running dev server, and for each person slug
 * prints the geometry that layout regressions show up in (content-box width, resolved
 * grid-template-columns, header padding/notch, h1 + gen-label shrinkToFit metrics, and
 * the RightColumn's on-screen box), plus a full-card screenshot into ./probe-out/.
 *
 * Usage (dev server must be up on :5173):
 *   node scripts/probe-cards.mjs [slug ...]
 *   node scripts/probe-cards.mjs michael-hooker-1935 lea-hooker-1946
 *
 * Screenshots land in scripts/probe-out/ (gitignored). This is the verification tool for
 * all featured-card layout work — read the numbers, not just the picture.
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'probe-out');
mkdirSync(OUT, { recursive: true });

const BASE = process.env.PROBE_BASE ?? 'http://localhost:5173';
const slugs = process.argv.slice(2);
if (!slugs.length) slugs.push('michael-hooker-1935', 'lea-hooker-1946', 'samuel-morse-1885', 'nancy-morse-1915');

const browser = await chromium.launch();
for (const slug of slugs) {
	const ctx = await browser.newContext({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 2 });
	const page = await ctx.newPage();
	const errors = [];
	const shrinkLogs = [];
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push('console.error: ' + m.text());
		if (m.text().includes('[shrinkToFit]')) shrinkLogs.push(m.text());
	});
	page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

	await page.goto(`${BASE}/person/${slug}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(600); // let shrinkToFit + fonts.ready settle

	const data = await page.evaluate(() => {
		const q = (s) => document.querySelector(s);
		const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
		const cs = (el, p) => (el ? getComputedStyle(el)[p] : null);
		const content = q('.featured-card .content');
		const header = q('.featured-card .header');
		const h1 = q('.featured-card h1');
		const right = q('.featured-card .right-column');
		return {
			card: box(q('.featured-card')),
			content: box(content),
			contentGridCols: cs(content, 'gridTemplateColumns'),
			headerBox: box(header),
			headerPadRight: cs(header, 'paddingRight'),
			h1Box: box(h1),
			rightColumn: box(right),
			rightColInDom: !!right,
			eduPresent: !!right && /Education/.test(right.textContent || ''),
			chipCount: document.querySelectorAll('.spouse-notch .flight, .spouse-notch [data-flight-id]').length
		};
	});

	console.log(`\n===== ${slug} =====`);
	console.log('errors:', errors.length ? errors : '(none)');
	shrinkLogs.forEach((l) => console.log('  ', l));
	console.log('content box w:', data.content?.w, '| grid-cols:', data.contentGridCols);
	console.log('header w:', data.headerBox?.w, '| padding-right:', data.headerPadRight);
	console.log('h1 box:', JSON.stringify(data.h1Box));
	console.log('RightColumn in-DOM:', data.rightColInDom, '| box:', JSON.stringify(data.rightColumn), '| Education visible:', data.eduPresent);
	console.log('chips rendered:', data.chipCount);

	await page.screenshot({ path: join(OUT, `card-${slug}.png`) });
	await ctx.close();
}
await browser.close();
