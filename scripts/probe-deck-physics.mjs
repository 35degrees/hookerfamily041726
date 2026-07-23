// PROBE (v4.2 — cards are HEAVY leaving). Samples car-1's displacement profile and asserts the exit
// ACCELERATES from rest on EVERY axis (easeIn — slow, weighty start; Sam: "start slower and accelerate"):
// at its temporal midpoint the card has covered < 40% of its travel (convex). Also confirms the HERO entry
// SETTLES (whole-path easeOutBack overshoot past the slot, ~3–8px).
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const CASES = [
	{ start: 'aaron-burr-jr-1756', target: 'sarah-edwards-1710', exit: 'DOWNWARD', expect: 'ACCEL' },
	{ start: 'mary-pierpont-1673', target: 'mary-talcott-1720', exit: 'UPWARD', expect: 'ACCEL' },
	{ start: 'thomas-hooker-1586', target: 'john-haynes-1594', exit: 'LATERAL', expect: 'ACCEL' }
];

async function timeline(page, c) {
	await page.goto(`${BASE}/person/${c.start}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(300);
	await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		a?.scrollIntoView({ block: 'center' });
	}, c.target);
	await page.waitForTimeout(150);
	const geo = await page.evaluate((tg) => {
		const a = [...document.querySelectorAll('a[data-cc]')].find((x) => (x.getAttribute('href') || '').endsWith('/person/' + tg));
		const r = a.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}, c.target);
	await page.evaluate(() => {
		window.__p = [];
		const t0 = performance.now();
		const tr = (el) => {
			const m = getComputedStyle(el).transform;
			const p = m && m.match(/matrix\(([^)]+)\)/);
			if (!p) return { tx: 0, ty: 0 };
			const v = p[1].split(',').map(Number);
			return { tx: v[4], ty: v[5] };
		};
		const grab = () => {
			const t = performance.now() - t0;
			const fl = [...document.querySelectorAll('.featured-flight')];
			const hero = fl.find((f) => getComputedStyle(f).zIndex === '3');
			const car1 = fl.find((f) => getComputedStyle(f).zIndex === '2');
			window.__p.push({ t: Math.round(t), car1: car1 ? tr(car1) : null, hero: hero ? { ...tr(hero), op: +getComputedStyle(hero).opacity } : null });
			if (t < 2400) requestAnimationFrame(grab);
		};
		requestAnimationFrame(grab);
	});
	await page.mouse.click(geo.x, geo.y);
	await page.waitForTimeout(2500);
	return page.evaluate(() => window.__p);
}

function analyzeCar1(tl) {
	const pts = tl.filter((s) => s.car1).map((s) => ({ t: s.t, d: Math.hypot(s.car1.tx, s.car1.ty) }));
	if (pts.length < 4) return null;
	const maxD = Math.max(...pts.map((p) => p.d));
	if (maxD < 50) return null;
	const moving = pts.filter((p) => p.d > 2);
	const t0 = moving[0].t, t1 = moving[moving.length - 1].t;
	const midT = (t0 + t1) / 2;
	// displacement fraction at the temporal midpoint
	let near = moving[0];
	for (const p of moving) if (Math.abs(p.t - midT) < Math.abs(near.t - midT)) near = p;
	return { fracAtMid: near.d / maxD, maxD: Math.round(maxD) };
}

function heroOvershoot(tl) {
	// after the hero paints, does its translate cross 0 (overshoot past the slot) before settling?
	const pts = tl.filter((s) => s.hero && s.hero.op > 0.5).map((s) => s.hero);
	if (pts.length < 4) return 0;
	// entry offset = the max-magnitude translate frame (the entry start); overshoot = opposite-sign excursion.
	let start = pts[0];
	for (const p of pts) if (Math.hypot(p.tx, p.ty) > Math.hypot(start.tx, start.ty)) start = p;
	const dom = Math.abs(start.tx) >= Math.abs(start.ty) ? 'tx' : 'ty';
	const entrySign = Math.sign(start[dom]);
	let overshoot = 0;
	for (const p of pts) {
		const v = p[dom] * entrySign; // < 0 means it went past the slot to the opposite side
		if (v < 0) overshoot = Math.max(overshoot, -v);
	}
	return +overshoot.toFixed(1);
}

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1680, height: 1000 } });
const page = await ctx.newPage();
let pass = 0;
for (const c of CASES) {
	const tl = await timeline(page, c);
	const a = analyzeCar1(tl);
	const ov = heroOvershoot(tl);
	if (!a) { console.log(`✗ ${c.exit}: no car-1 motion captured`); continue; }
	const got = a.fracAtMid < 0.4 ? 'ACCEL' : a.fracAtMid > 0.6 ? 'DECEL' : 'AMBIGUOUS';
	const settleOK = ov >= 2 && ov <= 10;
	const ok = got === c.expect && settleOK;
	if (ok) pass++;
	console.log(`${ok ? '✓' : '✗'} ${c.exit} exit (${c.start.split('-')[0]}→${c.target.split('-')[0]}): fracAtMid=${a.fracAtMid.toFixed(2)} → ${got} (expect ${c.expect}) | hero settle overshoot=${ov}px`);
}
console.log(`\nDECK-PHYSICS PROBE: ${pass}/${CASES.length} ${pass === CASES.length ? 'GREEN' : 'RED'}`);
await b.close();
