/**
 * probe-buildup.mjs — does the page accumulate cost over a long run of CC hops? (Sam, 3 Oct: "if I do 5 CC
 * connections in a row, does the browser build up a lag?") Real-mouse clicks on visible CC links, each
 * after the previous flight has settled. After every hop, with a forced GC: DOM node count, live
 * animations, JS heap, and the worst / median frame interval during that hop's flight. Compares the first
 * hops with the last. Chrome only (heap + GC via CDP); Safari was checked by hand (roadmap §58.3b).
 *
 *   node scripts/probe-buildup.mjs [hops]   (default 40; dev server on :5173)
 */
import { chromium } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const N = Number(process.argv[2] ?? 40);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 1000 });
const cdp = await page.context().newCDPSession(page);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`${BASE}/thomas-hooker-1586`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const sample = async () => {
	await cdp.send('HeapProfiler.collectGarbage');
	const heap = (await cdp.send('Runtime.getHeapUsage')).usedSize / 1048576;
	const dom = await page.evaluate(() => ({
		nodes: document.getElementsByTagName('*').length,
		anims: document.getAnimations().length,
		fixed: [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).position === 'fixed').length
	}));
	return { heap, ...dom };
};

const rows = [];
const seen = new Set();
for (let i = 0; i < N; i++) {
	const target = await page.evaluate((seenArr) => {
		const seen = new Set(seenArr);
		const links = [...document.querySelectorAll('a[data-cc]')].filter((a) => {
			const r = a.getBoundingClientRect();
			return r.width > 4 && r.top > 0 && r.bottom < innerHeight;
		});
		if (!links.length) return null;
		const fresh = links.filter((a) => !seen.has(a.getAttribute('href')));
		const a = (fresh.length ? fresh : links)[Math.floor(Math.random() * (fresh.length || links.length))];
		const r = a.getBoundingClientRect();
		return { href: a.getAttribute('href'), x: r.left + Math.min(20, r.width / 2), y: r.top + r.height / 2 };
	}, [...seen]);
	if (!target) { console.log(`hop ${i + 1}: no visible CC — going back to Thomas`); await page.goto(`${BASE}/thomas-hooker-1586`); await page.waitForTimeout(2500); i--; continue; }
	seen.add(target.href);
	await page.evaluate(() => {
		window.__f = []; let last = performance.now(); const end = last + 2200;
		const loop = (t) => { window.__f.push(t - last); last = t; if (t < end) requestAnimationFrame(loop); };
		requestAnimationFrame(loop);
	});
	await page.mouse.move(target.x, target.y);
	await page.waitForTimeout(120);
	await page.mouse.click(target.x, target.y);
	await page.waitForTimeout(2600);
	const f = (await page.evaluate(() => window.__f)).slice(1).sort((a, b) => a - b);
	const s = await sample();
	rows.push({ hop: i + 1, to: target.href, ...s, med: f[Math.floor(f.length / 2)], p95: f[Math.floor(f.length * 0.95)], worst: f[f.length - 1] });
	const r = rows.at(-1);
	console.log(`hop ${String(r.hop).padStart(2)}  nodes ${r.nodes}  anims ${r.anims}  fixed ${r.fixed}  heap ${r.heap.toFixed(1)}MB  frame med ${r.med.toFixed(1)} p95 ${r.p95.toFixed(1)} worst ${r.worst.toFixed(1)}ms  ${r.to}`);
}
const avg = (a, k) => a.reduce((s, r) => s + r[k], 0) / a.length;
const first = rows.slice(0, 5), last = rows.slice(-5);
console.log('\n            first 5 hops   last 5 hops');
for (const k of ['nodes', 'anims', 'fixed', 'heap', 'med', 'p95', 'worst']) console.log(`${k.padEnd(10)}  ${avg(first, k).toFixed(1).padStart(12)}  ${avg(last, k).toFixed(1).padStart(12)}`);
console.log(`page errors: ${errors.length}${errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
