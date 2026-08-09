/**
 * measure-tiers — what the zoom-1 stage actually needs, at the viewports that matter.
 * Read-only: no assertions, no code change. Answers "how far is the stage from fitting?"
 */
import { chromium } from '@playwright/test';

const VIEWPORTS = [
	{ name: 'desktop 1440', w: 1440, h: 900 },
	{ name: 'iPad Pro 11 landscape', w: 1194, h: 834 },
	{ name: 'iPad landscape 1024', w: 1024, h: 768 },
	{ name: 'iPad mini landscape', w: 1133, h: 744 },
	{ name: 'iPad mini portrait', w: 744, h: 1133 },
	{ name: 'iPad portrait 768', w: 768, h: 1024 },
	{ name: 'iPhone 14 Pro', w: 393, h: 852 }
];

const slugs = process.argv.slice(2);
const browser = await chromium.launch();

for (const slug of slugs) {
	console.log(`\n████ ${slug}`);
	for (const v of VIEWPORTS) {
		const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h } });
		const page = await ctx.newPage();
		await page.goto(`http://localhost:5173/person/${slug}`, { waitUntil: 'networkidle' });
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(900);
		const m = await page.evaluate(() => {
			const r = (s) => {
				const el = document.querySelector(s);
				if (!el) return null;
				const b = el.getBoundingClientRect();
				return { l: Math.round(b.left), t: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) };
			};
			const pc = document.querySelector('.page-container');
			return {
				container: r('.page-container'),
				card: r('.featured-card'),
				slot: r('.featured-slot'),
				blade: r('.cc-blade') || r('[class*=blade]'),
				parents: r('.parents-slot'),
				children: r('.children-slot'),
				siblings: r('[class*=sibling]'),
				docH: document.documentElement.scrollHeight,
				docW: document.documentElement.scrollWidth,
				contentH: pc ? Math.round(pc.scrollHeight) : null,
				vw: window.innerWidth,
				vh: window.innerHeight,
				hOverflow: document.documentElement.scrollWidth > window.innerWidth,
				vOverflow: document.documentElement.scrollHeight > window.innerHeight
			};
		});
		const fmt = (x) => (x ? `${x.w}x${x.h} @${x.l},${x.t}` : '—');
		console.log(
			`  ${v.name.padEnd(24)} vp ${m.vw}x${m.vh}  doc ${m.docW}x${m.docH}` +
				`  ${m.hOverflow ? 'H-OVERFLOW' : 'fits-x'} ${m.vOverflow ? `V-OVER +${m.docH - m.vh}` : 'fits-y'}`
		);
		console.log(
			`      card ${fmt(m.card)} | slot ${fmt(m.slot)} | parents ${fmt(m.parents)} | children ${fmt(m.children)} | sibs ${fmt(m.siblings)}`
		);
		await ctx.close();
	}
}
await browser.close();
