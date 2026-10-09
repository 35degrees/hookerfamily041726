/**
 * probe-render-text.mjs — WHAT THE CARDS SAY, captured so a build-output change can be proved invisible.
 *
 * Cold-loads each slug, waits for the card to settle, and records the visible text of the whole stage
 * (card, chips, siblings, blade, rail) plus every photo URL on it. Run once before a payload change and
 * once after, then diff the two files: identical means the change removed nothing a reader can see.
 *
 *   node scripts/probe-render-text.mjs before.json        # against :4173 (BASE= to change)
 *   node scripts/probe-render-text.mjs after.json
 *   node scripts/probe-render-text.mjs --diff before.json after.json
 *
 * The slug list is fixed (SLUGS below + a seeded sample from static/data/person) so both runs see the
 * same people.
 */
import { chromium } from '@playwright/test';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
if (args[0] === '--diff') {
	const a = JSON.parse(readFileSync(args[1], 'utf8'));
	const b = JSON.parse(readFileSync(args[2], 'utf8'));
	let bad = 0;
	for (const slug of Object.keys(a)) {
		if (JSON.stringify(a[slug]) === JSON.stringify(b[slug])) continue;
		bad++;
		console.log(`\n✗ ${slug}`);
		for (const k of ['text', 'photos']) {
			if (JSON.stringify(a[slug]?.[k]) !== JSON.stringify(b[slug]?.[k])) {
				const A = new Set([].concat(a[slug]?.[k] ?? []));
				const B = new Set([].concat(b[slug]?.[k] ?? []));
				for (const x of A) if (!B.has(x)) console.log(`  - ${k}: ${String(x).slice(0, 140)}`);
				for (const x of B) if (!A.has(x)) console.log(`  + ${k}: ${String(x).slice(0, 140)}`);
			}
		}
	}
	console.log(bad ? `\n${bad} of ${Object.keys(a).length} cards differ` : `\nall ${Object.keys(a).length} cards identical`);
	process.exit(bad ? 1 : 0);
}

const OUT = args[0];
const BASE = process.env.BASE ?? 'http://localhost:4173';
const SLUGS = [
	'thomas-hooker-1586',
	'samuel-hooker',
	'john-talcott-1594',
	'aaron-burr-1756',
	'jonathan-edwards-1703',
	'sarah-edwards-1710',
	'john-pierpont-1785',
	'henry-flagler-1830',
	'william-howard-taft-1857',
	'jared-flagg-1820',
	'willystine-goodsell-1870'
];
// seeded sample (mulberry32) so before/after pick the same people
let seed = 20261009;
const rnd = () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const all = readdirSync('static/data/person').sort();
while (SLUGS.length < 40) {
	const s = all[Math.floor(rnd() * all.length)].replace(/\.json$/, '');
	if (!SLUGS.includes(s)) SLUGS.push(s);
}

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const out = {};
for (const slug of SLUGS) {
	const res = await page.goto(`${BASE}/${slug}`, { waitUntil: 'networkidle' }).catch(() => null);
	await page.waitForTimeout(1200);
	out[slug] = await page.evaluate((status) => {
		const root = document.querySelector('.page-container') ?? document.body;
		const text = root.innerText
			.split('\n')
			.map((s) => s.trim())
			.filter(Boolean);
		const photos = [...root.querySelectorAll('img')].map((i) => i.getAttribute('src')).filter(Boolean);
		return { status, text, photos };
	}, res?.status() ?? 0);
}
await browser.close();
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`captured ${SLUGS.length} cards → ${OUT}`);
