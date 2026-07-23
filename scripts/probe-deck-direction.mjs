// PROBE (fix 2): DECK direction = kinship gen_delta, never birth-years. Asserts the incoming hero's entry
// EDGE per case: gd<0 (ancestor tier: uncle/grandparent) → TOP; gd>0 (descendant: niece) → BOTTOM;
// gd null or 0 (orbit/unrelated OR same-generation cousin) → LATERAL. The Heman-class orbit rides lateral.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const CARD_W = 925;
const CASES = [
	{ start: 'aaron-burr-jr-1756', target: 'sarah-edwards-1710', gd: -2, expect: 'TOP', note: 'ancestor (grandmother tier)' },
	{ start: 'aaron-burr-jr-1756', target: 'mary-dwight-1734', gd: -1, expect: 'TOP', note: 'ancestor tier (uncle-class)' },
	{ start: 'aaron-burr-jr-1756', target: 'tapping-reeve-1744', gd: 0, expect: 'LATERAL', note: 'same-generation cousin' },
	{ start: 'aaron-burr-jr-1756', target: 'maria-edwards-1778', gd: 0, expect: 'LATERAL', note: 'same-generation' },
	{ start: 'mary-pierpont-1673', target: 'mary-talcott-1720', gd: 2, expect: 'BOTTOM', note: 'descendant (granddaughter, direct/seat-far → still vertical)' },
	{ start: 'thomas-hooker-1586', target: 'john-haynes-1594', gd: null, expect: 'LATERAL', note: 'orbit (Heman class — no family tie)' },
	// v4.1 SAME-LINE fix (Pennoyer→Strong bug): gen ≠ 0 but COLLATERAL + seat-far → a cross-branch peer, NOT
	// up/down the own line → must ride LATERAL despite the generation gap.
	{ start: 'aaron-burr-sr-1716', target: 'jonathan-edwards-1703', gd: -1, expect: 'LATERAL', note: 'cross-branch peer (gen≠0, collateral, seat-far)' }
];

function classify(hero, vw, vh) {
	// the incoming hero (z-index 3) at its offscreen entry start — which edge did it come from?
	if (!hero) return 'NO-HERO';
	if (hero.top >= vh) return 'BOTTOM';
	if (hero.bottom <= 0) return 'TOP';
	if (hero.left >= vw) return 'LATERAL';
	if (hero.left + CARD_W <= 0) return 'LATERAL';
	return 'NONE(materialized?)';
}

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1680, height: 1000 } });
const page = await ctx.newPage();
let pass = 0;
for (const c of CASES) {
	await page.goto(`${BASE}/person/${c.start}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(320);
	const geo = await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		if (!a) return null;
		const r = a.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2, gd: a.dataset.genDelta ?? '(absent)' };
	}, c.target);
	if (!geo) { console.log(`✗ ${c.start} → ${c.target}: NO CC LINK`); continue; }
	await page.evaluate((tg) => {
		window.__h = null;
		const t0 = performance.now();
		const tick = () => {
			if (location.pathname.endsWith('/person/' + tg) && !window.__h) {
				// the hero is z-index 3 (car-1 is z 2) — grab ITS rect at the offscreen entry start
				const hero = [...document.querySelectorAll('.featured-flight')].find((f) => getComputedStyle(f).zIndex === '3');
				if (hero) {
					const r = hero.getBoundingClientRect();
					window.__h = { hero: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left) }, vw: innerWidth, vh: innerHeight };
				}
			}
			if (performance.now() - t0 < 500) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}, c.target);
	await page.mouse.click(geo.x, geo.y);
	await page.waitForTimeout(560);
	const h = await page.evaluate(() => window.__h);
	const got = h ? classify(h.hero, h.vw, h.vh) : 'NO-NAV';
	const ok = got === c.expect;
	if (ok) pass++;
	console.log(`${ok ? '✓' : '✗'} ${c.start} → ${c.target}  gd=${geo.gd} (${c.note})  expect ${c.expect}, got ${got}`);
}
console.log(`\nDECK-DIRECTION PROBE: ${pass}/${CASES.length} ${pass === CASES.length ? 'GREEN' : 'RED'}`);
await b.close();
