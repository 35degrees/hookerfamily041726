// PROBE (v4.2.2): toggling between the SAME two cards must PING-PONG — the convoy swings the other way on
// each hop, and a repeated directed edge (A→B) is always identical. This is where the old reciprocal-memory
// bug lived: after the first return it stayed armed and every hop exited the same side. Direction is now the
// seat sign, so it reverses on its own. Four hops A→B→A→B→A in ONE SPA session; read the hero's entry edge.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const CARD_W = 925;
const A = 'aaron-burr-jr-1756', B = 'maria-edwards-1778'; // reciprocal lateral pair
const C = 'tapping-reeve-1744'; // a THIRD lateral CC on A — a fresh (non-reciprocal) hop must reset to default
const HOPS = [B, A, B, A, C]; // toggle A↔B (ping-pong), then a fresh hop A→C (memory terminates → default)

function sideOf(hero, vw) {
	if (!hero) return '?';
	if (hero.left >= vw) return 'RIGHT'; // entered from the right edge
	if (hero.left + CARD_W <= 0) return 'LEFT';
	return 'MID';
}

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1680, height: 1000 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/person/${A}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

const sides = [];
for (const target of HOPS) {
	await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		a?.scrollIntoView({ block: 'center' });
	}, target);
	await page.waitForTimeout(180);
	const geo = await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		if (!a) return null;
		const r = a.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}, target);
	if (!geo) { sides.push('NO-LINK'); continue; }
	await page.evaluate((tg) => {
		window.__h = null;
		const t0 = performance.now();
		const tick = () => {
			if (location.pathname.endsWith('/person/' + tg) && !window.__h) {
				const hero = [...document.querySelectorAll('.featured-flight')].find((f) => getComputedStyle(f).zIndex === '3');
				if (hero) { const r = hero.getBoundingClientRect(); window.__h = { left: Math.round(r.left), vw: innerWidth }; }
			}
			if (performance.now() - t0 < 600) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}, target);
	await page.mouse.click(geo.x, geo.y);
	await page.waitForTimeout(2000); // past landing + flight-lock release
	const h = await page.evaluate(() => window.__h);
	sides.push(sideOf(h, h?.vw ?? 1680));
}

console.log(`hops A→B→A→B→A→C, hero entered from: ${sides.join('  ')}`);
const [s1, s2, s3, s4, s5] = sides;
const pingpong = s1 === 'RIGHT' && s2 === 'LEFT' && s3 === 'RIGHT' && s4 === 'LEFT'; // fresh default RIGHT, alternates
const reset = s5 === 'RIGHT'; // a fresh non-reciprocal hop resets to the default (enter right)
const ok = pingpong && reset;
console.log(`  A→B=${s1} (fresh→right)  B→A=${s2} (reciprocal→flip)  A→B=${s3}  B→A=${s4}  |  A→C=${s5} (fresh again→right? ${reset})`);
console.log(`\nDECK-PINGPONG PROBE: ${ok ? '5/5 GREEN — fresh=right, toggle ping-pongs, non-reciprocal resets' : 'RED'}`);
await b.close();
