// One-off: enumerate CC links on a few start pages with relationClass + the deck N they'd produce.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const STARTS = ['mary-pierpont-1673', 'sarah-hooker-1650', 'thomas-hooker-1586'];

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1680, height: 1000 } });
const page = await ctx.newPage();

for (const s of STARTS) {
	const resp = await page.goto(`${BASE}/person/${s}`, { waitUntil: 'networkidle' }).catch(() => null);
	if (!resp || !resp.ok()) {
		console.log(`\n## ${s} — UNREACHABLE`);
		continue;
	}
	await page.waitForTimeout(300);
	const links = await page.evaluate(() =>
		[...document.querySelectorAll('a[data-cc]')].map((a) => ({
			href: (a.getAttribute('href') || '').replace('/person/', ''),
			rc: a.dataset.relationClass || '(none)',
			text: (a.textContent || '').trim().slice(0, 40)
		}))
	);
	console.log(`\n## ${s} — ${links.length} CC links`);
	for (const l of links) console.log(`  ${l.rc.padEnd(10)} → ${l.href.padEnd(28)} "${l.text}"`);
}
await b.close();
