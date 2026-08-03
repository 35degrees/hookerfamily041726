// PROBE (design §22.2b / roadmap §15): the DECK's SAME-LINE test rides KIN DISTANCE, not seat distance.
// The repro Sam reported: John Pierpont H00388 → his uncle-and-guardian James Pierpont II H00116 is
// uncle/nephew (kin_distance 3, gen_delta −1) but COLLATERAL and seated >180 apart, so the retired seat
// proxy — and the 'direct'-only test that replaced it — both sent a real up-the-line hop sideways.
// Asserts (a) the pair rides VERTICAL in both directions and reciprocates through the gen sign, and
// (b) the far-collateral controls with NO shared ancestor stay LATERAL — a wider kin radius must never
// verticalize strangers (the Lovejoy ↔ J.P. Morgan false vertical that killed the seat proxy).
// Companion to probe-deck-direction.mjs, which covers the gen-sign/orbit/cross-branch-peer cases.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const CARD_W = 925;
const CASES = [
	// THE REPRO — both directions. kin 3 (nephew→grandfather 2 + uncle→father 1), collateral, seat Δ ~2096.
	{
		start: 'john-pierpont-1740',
		target: 'james-pierpont-1699',
		kin: 3,
		expect: 'TOP',
		note: 'uncle-guardian, one tier UP (gd −1, collateral, seat-far)'
	},
	{
		start: 'james-pierpont-1699',
		target: 'john-pierpont-1740',
		kin: 3,
		expect: 'BOTTOM',
		note: 'the reciprocal — nephew, one tier DOWN (gd +1)'
	},
	// IN-LAWS ARE ON YOUR LINE (Sam, Aug 3) — a marriage bridges the two blood lines at a cost of 2, so a
	// parent-in-law lands at 3. Esther Edwards Burr H00378 → Daniel Burr X03446 is her husband's father:
	// down-line from him, up-line from her, and it rode horizontal until the bake learned marriages.
	{
		start: 'esther-burr-1732',
		target: 'daniel-burr-1660',
		kin: 3,
		expect: 'TOP',
		note: 'father-in-law (her husband Aaron Burr Sr. is his son) — gd −1'
	},
	{
		start: 'daniel-burr-1660',
		target: 'esther-burr-1732',
		kin: 3,
		expect: 'BOTTOM',
		note: 'the reciprocal — the easter-egg in-law looking DOWN at his son\'s wife (gd +1)'
	},
	// CONTROLS — gen_delta ≠ 0 but no route inside the radius → still lateral.
	{
		start: 'john-morgan-1837',
		target: 'francis-lovejoy-1854',
		kin: null,
		expect: 'LATERAL',
		note: 'the seat-proxy false vertical (0.4 seats apart, gd +2, no kinship)'
	},
	{
		start: 'james-pierpont-1699',
		target: 'william-bristol-1779',
		kin: 6,
		expect: 'LATERAL',
		note: 'the husband of his grandniece — in-law of a DISTANT collateral, outside the radius at 6'
	}
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
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) =>
			(x.getAttribute('href') || '').endsWith('/person/' + tg)
		);
		if (!a) return null;
		const r = a.getBoundingClientRect();
		return {
			x: r.left + r.width / 2,
			y: r.top + r.height / 2,
			gd: a.dataset.genDelta ?? '(absent)',
			kin: a.dataset.kinDistance ?? '(absent)'
		};
	}, c.target);
	if (!geo) {
		console.log(`✗ ${c.start} → ${c.target}: NO CC LINK`);
		continue;
	}
	// The bake itself is half the assertion: a missing/wrong data-kin-distance is the failure mode that
	// would silently reinstate the bug even with the flight logic correct.
	const wantKin = c.kin == null ? '(absent)' : String(c.kin);
	if (geo.kin !== wantKin) {
		console.log(`✗ ${c.start} → ${c.target}: kin_distance ${geo.kin}, expected ${wantKin}`);
		continue;
	}
	await page.evaluate((tg) => {
		window.__h = null;
		const t0 = performance.now();
		const tick = () => {
			if (location.pathname.endsWith('/person/' + tg) && !window.__h) {
				const hero = [...document.querySelectorAll('.featured-flight')].find(
					(f) => getComputedStyle(f).zIndex === '3'
				);
				if (hero) {
					const r = hero.getBoundingClientRect();
					window.__h = {
						hero: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left) },
						vw: innerWidth,
						vh: innerHeight
					};
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
	console.log(
		`${ok ? '✓' : '✗'} ${c.start} → ${c.target}  gd=${geo.gd} kin=${geo.kin} (${c.note})  expect ${c.expect}, got ${got}`
	);
}
console.log(`\nDECK-KIN PROBE: ${pass}/${CASES.length} ${pass === CASES.length ? 'GREEN' : 'RED'}`);
await b.close();
