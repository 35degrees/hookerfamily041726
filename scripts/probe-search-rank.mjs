// probe-search-rank.mjs — what the search modal ACTUALLY lists for a query, top N, in order.
// Usage: node scripts/probe-search-rank.mjs "g" "ge" "geo" [--n 12] [--base http://localhost:5173]
// Drives the real modal (types into it, waits out the debounce) rather than re-implementing the ranking,
// so it reads exactly what a visitor sees. Prints name, years and the H/notable flags from the index row.
import { chromium } from 'playwright';
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const N = Number(flag('--n', 12)); const BASE = flag('--base', 'http://localhost:5173');
const queries = args.length ? args : ['g'];
const b = await chromium.launch(); const p = await b.newPage(); await p.setViewportSize({ width: 1440, height: 900 });
await p.goto(BASE + '/thomas-hooker-1586'); await p.waitForTimeout(2500);
await p.locator('.search-trigger').click(); await p.waitForTimeout(1500);
const input = p.locator('input').first();
const idx = await (await fetch(BASE + '/data/search-index.json')).json();
// keyed by SLUG, read off each row's href — names repeat (two George Magoffin Humphreys), slugs do not
const rows = new Map((Array.isArray(idx) ? idx : idx.rows).map((r) => [r.slug, r]));
for (const q of queries) {
  await input.fill(''); await p.waitForTimeout(200); await input.fill(q); await p.waitForTimeout(900);
  const hits = await p.locator('a.person-box.hit').evaluateAll((as) => as.map((a) => [a.getAttribute('href').replace(/^\//, ''), a.querySelector('.nm')?.textContent ?? '']));
  console.log(`\n"${q}"`);
  hits.slice(0, N).forEach(([slug, n], i) => {
    const r = rows.get(slug) || {};
    const yrs = r.by || r.dy ? `${r.by ?? '?'}–${r.dy ?? ''}` : 'no years';
    console.log(`  ${String(i + 1).padStart(2)}. ${n.trim().padEnd(40)} ${yrs.padEnd(11)} ${r.f & 1 ? 'HD' : '  '} ${r.nb ? 'notable' : '       '} ${r.by && r.dy && r.dy - r.by <= 15 ? 'died young' : ''}`);
  });
}
await b.close();
