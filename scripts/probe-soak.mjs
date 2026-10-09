/**
 * probe-soak.mjs — DOES A LONG SESSION BUILD UP MEMORY OR BANDWIDTH? (roadmap §6.2, Sam 100926)
 *
 * Drives N navigations the way a reader browses — Shuffle Notable People, cross-connections, timeline
 * headshots, parent/child chips — and after EVERY hop forces a garbage collection and samples the page:
 * JS heap, DOM nodes, event listeners, and flight elements still on stage. Every network response is
 * tallied by kind, so the bandwidth of the session is measured rather than estimated. Optionally sits
 * IDLE afterwards and keeps sampling, because Sam's Safari warning came while the tab was unattended.
 *
 *   node scripts/probe-soak.mjs                      200 hops against the production preview (:4173)
 *   HOPS=60 LEAK=1 node scripts/probe-soak.mjs       PROVE RED: retains every payload, heap must climb
 *   IDLE_MIN=10 node scripts/probe-soak.mjs          then 10 idle minutes, sampled every 30s
 *   BASE=http://localhost:5173 …                     the dev server instead (its HMR client inflates heap)
 *
 * Run it against `npm run build && npx vite preview --port 4173`, not the dev server: dev mode carries
 * Vite's client and unminified modules, which is memory the deployed site will never use.
 *
 * READING IT. A healthy session has a heap that rises during the first ~20 hops (code, fonts and
 * caches warming) and then goes FLAT — the slope over the last 150 hops is the number. DOM nodes and
 * listeners should be flat from the start: a page with one card on it has one card's worth of DOM.
 * Bandwidth: person payloads are counted at their gzip size (what Vercel sends), photos at what
 * Cloudinary actually sent.
 */
import { chromium } from '@playwright/test';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const HOPS = Number(process.env.HOPS ?? 200);
const LEAK = process.env.LEAK === '1';
const IDLE_MIN = Number(process.env.IDLE_MIN ?? 0);
const START = process.env.START ?? 'thomas-hooker-1586';
const SETTLE_MS = 2800; // the slowest flight (a zone entry, 1144ms) plus the rail bar (1386ms) and margin
const OUT = process.env.OUT ?? null;

const browser = await chromium.launch({ args: ['--js-flags=--expose-gc'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Performance.enable');
await cdp.send('Network.enable');

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

if (LEAK) {
	// THE DELIBERATE LEAK: every person payload the page fetches is parsed and kept forever. If the probe
	// cannot see this, it cannot see a real one either.
	await page.addInitScript(() => {
		const keep = (window.__soakLeak = []);
		const f = window.fetch;
		window.fetch = async (...a) => {
			const r = await f(...a);
			const u = String(a[0]?.url ?? a[0]);
			if (u.includes('/data/person/')) r.clone().json().then((j) => keep.push(j)).catch(() => {});
			return r;
		};
	});
}

// ── BANDWIDTH ──────────────────────────────────────────────────────────────────────────────────
const reqUrl = new Map();
const photos = []; // every photo response: url and bytes as sent
const bytes = { payload: 0, payloadGz: 0, photo: 0, searchIndex: 0, otherData: 0, app: 0, other: 0 };
const counts = { payload: 0, photo: 0, searchIndex: 0, otherData: 0, app: 0, other: 0 };
const gzCache = new Map();
function payloadGz(url) {
	const slug = url.split('/data/person/')[1]?.split(/[?#]/)[0];
	if (!slug) return 0;
	if (gzCache.has(slug)) return gzCache.get(slug);
	const f = `static/data/person/${decodeURIComponent(slug)}`;
	const n = existsSync(f) ? gzipSync(readFileSync(f)).length : 0;
	gzCache.set(slug, n);
	return n;
}
cdp.on('Network.requestWillBeSent', (e) => reqUrl.set(e.requestId, e.request.url));
cdp.on('Network.loadingFinished', (e) => {
	const url = reqUrl.get(e.requestId) ?? '';
	const n = e.encodedDataLength ?? 0;
	let k = 'other';
	if (url.includes('/data/person/')) k = 'payload';
	else if (url.includes('res.cloudinary.com') || /\.(jpe?g|png|webp|avif)(\?|$)/.test(url)) k = 'photo';
	else if (url.includes('/data/search-index')) k = 'searchIndex';
	else if (url.includes('/data/')) k = 'otherData';
	else if (url.includes('/_app/')) k = 'app';
	if (k === 'photo') photos.push({ url, n });
	bytes[k] += n;
	counts[k]++;
	if (k === 'payload') bytes.payloadGz += payloadGz(url);
});

// ── SAMPLING ───────────────────────────────────────────────────────────────────────────────────
async function sample() {
	await page.evaluate(() => window.gc?.());
	await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
	const { metrics } = await cdp.send('Performance.getMetrics');
	const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
	const flights = await page.evaluate(
		() => document.querySelectorAll('.featured-flight, [data-flight-id][style*="position: fixed"]').length
	);
	return {
		heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(2),
		nodes: m.Nodes,
		listeners: m.JSEventListeners,
		docs: m.Documents,
		flights
	};
}

// ── NAVIGATION ─────────────────────────────────────────────────────────────────────────────────
const KINDS = [
	['shuffle', 0.3, '.shuffle-notables'],
	['cc', 0.3, '.cc-blade a[href^="/"]'],
	['headshot', 0.2, '.rail .anchor'],
	['chip', 0.2, '.parents-slot a[href^="/"], [class*="children"] a[href^="/"]']
];
async function pickTarget() {
	const order = [...KINDS].sort(() => Math.random() - 0.5).sort((a, b) => Math.random() * b[1] - Math.random() * a[1]);
	for (const [kind, , sel] of order) {
		const t = await page.evaluate((sel) => {
			const vis = [...document.querySelectorAll(sel)].filter((el) => {
				const r = el.getBoundingClientRect();
				return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
			});
			if (!vis.length) return null;
			const el = vis[Math.floor(Math.random() * vis.length)];
			const r = el.getBoundingClientRect();
			return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
		}, sel);
		if (t) return { kind, ...t };
	}
	return null;
}

await page.goto(`${BASE}/${START}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const rows = [{ hop: 0, kind: 'start', path: new URL(page.url()).pathname, ...(await sample()) }];
const visited = new Set([rows[0].path]);
let dead = 0;

for (let i = 1; i <= HOPS; i++) {
	const before = new URL(page.url()).pathname;
	const t = await pickTarget();
	if (!t) {
		await page.goto(`${BASE}/${START}`, { waitUntil: 'networkidle' });
		await page.waitForTimeout(1500);
		continue;
	}
	await page.mouse.move(t.x, t.y);
	await page.waitForTimeout(120);
	await page.mouse.click(t.x, t.y);
	await page
		.waitForFunction((b) => location.pathname !== b, before, { timeout: 4000 })
		.catch(() => dead++);
	await page.waitForTimeout(SETTLE_MS);
	const path = new URL(page.url()).pathname;
	visited.add(path);
	const s = await sample();
	rows.push({ hop: i, kind: t.kind, path, ...s });
	if (i % 20 === 0 || i === HOPS)
		console.log(
			`hop ${String(i).padStart(3)}  heap ${s.heapMB.toFixed(1).padStart(6)} MB  nodes ${String(s.nodes).padStart(6)}  listeners ${String(s.listeners).padStart(5)}  flights ${s.flights}  ${path}`
		);
}

// ── IDLE ───────────────────────────────────────────────────────────────────────────────────────
const idle = [];
for (let m = 0; m < IDLE_MIN * 2; m++) {
	await page.waitForTimeout(30000);
	const s = await sample();
	idle.push({ min: (m + 1) / 2, ...s });
	console.log(`idle ${((m + 1) / 2).toFixed(1).padStart(4)} min  heap ${s.heapMB.toFixed(1)} MB  nodes ${s.nodes}  listeners ${s.listeners}`);
}

// ── SUMMARY ────────────────────────────────────────────────────────────────────────────────────
function slopePer100(pts) {
	const n = pts.length;
	if (n < 2) return 0;
	const mx = pts.reduce((a, p) => a + p[0], 0) / n;
	const my = pts.reduce((a, p) => a + p[1], 0) / n;
	const num = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0);
	const den = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
	return den ? (num / den) * 100 : 0;
}
const steady = rows.filter((r) => r.hop >= Math.min(50, Math.floor(HOPS / 3)));
const first = steady[0] ?? rows[0];
const last = rows[rows.length - 1];
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const mb = (n) => `${(n / 1048576).toFixed(2)} MB`;

console.log(`\n── ${LEAK ? 'LEAK (prove-red) ' : ''}SOAK, ${HOPS} hops, ${visited.size} distinct people ──`);
console.log(`heap        start ${rows[0].heapMB} MB  → hop ${first.hop} ${first.heapMB} MB  → end ${last.heapMB} MB`);
console.log(`heap slope  ${slopePer100(steady.map((r) => [r.hop, r.heapMB])).toFixed(2)} MB per 100 hops (from hop ${first.hop})`);
console.log(`nodes       start ${rows[0].nodes} → end ${last.nodes}   slope ${slopePer100(steady.map((r) => [r.hop, r.nodes])).toFixed(0)} per 100 hops`);
console.log(`listeners   start ${rows[0].listeners} → end ${last.listeners}   slope ${slopePer100(steady.map((r) => [r.hop, r.listeners])).toFixed(0)} per 100 hops`);
console.log(`max flight elements left on stage after settle: ${Math.max(...rows.map((r) => r.flights))}`);
console.log(`dead clicks (no navigation): ${dead}   page errors: ${errors.length}${errors.length ? ' — ' + errors[0] : ''}`);
console.log(`\nbandwidth (what this session would cost a reader)`);
console.log(`  person payloads   ${String(counts.payload).padStart(4)} files   ${mb(bytes.payload)} as sent (${mb(bytes.payloadGz)} if each were gzipped)`);
console.log(`  photos            ${String(counts.photo).padStart(4)} files   ${mb(bytes.photo)} as sent`);
console.log(`  search index      ${String(counts.searchIndex).padStart(4)} files   ${mb(bytes.searchIndex)} as sent`);
console.log(`  other data        ${String(counts.otherData).padStart(4)} files   ${kb(bytes.otherData)} as sent`);
console.log(`  app code/css      ${String(counts.app).padStart(4)} files   ${kb(bytes.app)} as sent`);
if (idle.length) {
	console.log(`\nidle ${IDLE_MIN} min: heap ${last.heapMB} → ${idle[idle.length - 1].heapMB} MB, nodes ${last.nodes} → ${idle[idle.length - 1].nodes}`);
}
if (OUT) writeFileSync(OUT, JSON.stringify({ rows, idle, bytes, counts, photos, visited: [...visited] }, null, 1));
await browser.close();
