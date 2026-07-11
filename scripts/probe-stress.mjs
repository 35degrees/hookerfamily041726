/**
 * probe-stress.mjs — monkey run to hunt the interrupted-outro ORPHAN race (a flyOut-pinned
 * position:fixed chip stranded until the next nav). Fires randomized rapid navigations — spouse
 * clicks, carousel paging mid-settle, parent/child clicks, back-to-back clicks inside the transition
 * window — and after each move samples for orphaned pinned flight elements + captures the dev janitor's
 * warnings. If the race is real and reachable, this surfaces it and prints the reproducing sequence.
 *
 *   node scripts/probe-stress.mjs [iterations]   (default 120)
 *
 * Requires the dev server on :5173 (DEV mode → janitor active). Uses Math.random (plain node script).
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const N = Number(process.argv[2] ?? 120);
const START = ['john-morgan-1930', 'michael-hooker-1935', 'nancy-morse-1915'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const janitorWarns = [];
const pageErrors = [];
page.on('console', (m) => { if (m.text().includes('[flight janitor]')) janitorWarns.push(m.text()); });
page.on('pageerror', (e) => pageErrors.push(e.message));

// a random clickable target: a visible spouse chip, a parent/child box, or a caret.
const randomTarget = () =>
	page.evaluate(() => {
		const R = (a) => a[Math.floor(Math.random() * a.length)];
		const slot = document.querySelector('.featured-slot')?.getBoundingClientRect();
		const kinds = [];
		const chips = [...document.querySelectorAll('.spouse-strip .flight a, .spouse-notch .flight a')].filter((a) => {
			const r = a.getBoundingClientRect();
			return slot && r.width > 5 && r.left < slot.right + 6 && r.right > slot.left - 6 && r.top < slot.top + 120;
		});
		if (chips.length) kinds.push(['chip', chips]);
		const rels = [...document.querySelectorAll('.parents-slot a, [class*="children"] a')];
		if (rels.length) kinds.push(['relative', rels]);
		const carets = [...document.querySelectorAll('.caret')].filter((c) => getComputedStyle(c).opacity !== '0');
		if (carets.length) kinds.push(['caret', carets]);
		if (!kinds.length) return null;
		const [kind, els] = R(kinds);
		const el = R(els);
		const r = el.getBoundingClientRect();
		return { kind, x: r.left + r.width / 2, y: r.top + r.height / 2, label: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 14) };
	});

await page.goto(`${BASE}/person/${pick(START)}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const log = [];
let reported = 0;
let lastWarn = 0;
for (let i = 0; i < N; i++) {
	// occasionally reset to a known multi-spouse start so we keep exercising carousels
	if (Math.random() < 0.08) {
		const s = pick(START);
		await page.goto(`${BASE}/person/${s}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
		log.push(`goto ${s}`);
		await page.waitForTimeout(300);
	}
	const t = await randomTarget();
	if (!t) { await page.waitForTimeout(200); continue; }
	// dwell BEFORE the click sometimes short (interrupt the prior outro), sometimes settled.
	const dwell = [40, 70, 120, 220, 500][Math.floor(Math.random() * 5)];
	log.push(`${t.kind}:${t.label} (+${dwell}ms)`);
	await page.mouse.click(t.x, t.y).catch(() => {});
	await page.waitForTimeout(dwell);
	// a REAL orphan = the janitor fired (it runs 700ms post-landing, past all legit outros). Correlate
	// each new firing to the recent move sequence.
	if (janitorWarns.length > lastWarn && reported < 6) {
		reported++;
		console.log(`\n*** ORPHAN (janitor fired) near move ${i} — repro sequence (last 8 moves):\n  ${log.slice(-8).join('\n  ')}`);
		lastWarn = janitorWarns.length;
	}
	lastWarn = janitorWarns.length;
	if (pageErrors.length) { console.log('\n*** PAGEERROR:', pageErrors[0], '\nlast 8 moves:\n  ' + log.slice(-8).join('\n  ')); break; }
}

// settle + let the janitor run, then final tally
await page.waitForTimeout(1000);
console.log(`\nstress: ${N} moves | janitor fired: ${janitorWarns.length} | pageerrors: ${pageErrors.length}`);
if (janitorWarns.length) console.log('janitor warnings:\n  ' + janitorWarns.slice(0, 10).join('\n  '));
await ctx.close();
await browser.close();
process.exit(janitorWarns.length || pageErrors.length ? 1 : 0);
