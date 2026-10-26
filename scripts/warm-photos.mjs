// warm-photos.mjs — build each person's portrait copy once, so no reader waits on its first view.
//
// Roadmap §14 queued this ("kill the first-time-generation floor"): Cloudinary makes a person's resized copy
// on its FIRST request (~0.55s through /cld/ vs ~0.10s from Vercel's edge cache afterwards). Requesting each
// URL once here builds the copy at Cloudinary and fills the Vercel edge region nearest this machine.
//
// COST: one Cloudinary transformation per photo not yet built (1 credit per 1,000), plus ~50 KB of Cloudinary
// bandwidth each. Already-built copies cost bandwidth only, and edge-cached ones cost nothing.
//
//   node scripts/warm-photos.mjs          notable people only (Shuffle targets, most CC links) — ~1,150
//   node scripts/warm-photos.mjs --all    everyone with a Cloudinary photo — ~4,400
//
// The transform is read from src/lib/photo.ts and the photo list from the LIVE site's search index, so this
// always warms exactly the URLs the deployed site requests.
import { readFileSync } from 'node:fs';

const SITE = 'https://hookerverse.com';
const CLD = 'https://res.cloudinary.com/dc5clrqtw/image/upload/';
const all = process.argv.includes('--all');

const src = readFileSync(new URL('../src/lib/photo.ts', import.meta.url), 'utf8');
const transform = src.match(/export const PHOTO_TRANSFORM = '([^']+)'/)?.[1];
if (!transform) throw new Error('PHOTO_TRANSFORM not found in src/lib/photo.ts');

const rows = await (await fetch(`${SITE}/data/search-index.json`)).json();
const urls = [
	...new Set(
		rows
			.filter((r) => typeof r.ph === 'string' && r.ph.startsWith(CLD) && (all || r.nb))
			.map((r) => `${SITE}/cld/${transform}/${r.ph.slice(CLD.length)}`)
	)
];
console.log(`${all ? 'everyone' : 'notables'}: ${urls.length} portraits, transform ${transform}`);

const tally = { HIT: 0, MISS: 0, other: 0, failed: [] };
let next = 0;
const t0 = Date.now();
async function worker() {
	while (next < urls.length) {
		const u = urls[next++];
		try {
			const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (warm-photos)' } });
			await r.arrayBuffer();
			if (!r.ok) tally.failed.push(`${r.status} ${u}`);
			const c = r.headers.get('x-vercel-cache');
			if (c === 'HIT' || c === 'MISS') tally[c]++;
			else tally.other++;
		} catch (e) {
			tally.failed.push(`${e.message} ${u}`);
		}
		if (next % 200 === 0) console.log(`  ${next}/${urls.length}`);
	}
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log(
	`done in ${((Date.now() - t0) / 1000).toFixed(0)}s — already cached ${tally.HIT}, built/fetched ${tally.MISS}, ` +
		`other ${tally.other}, failed ${tally.failed.length}`
);
for (const f of tally.failed.slice(0, 20)) console.log('  FAIL', f);
