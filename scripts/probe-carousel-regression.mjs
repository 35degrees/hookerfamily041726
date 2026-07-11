/**
 * probe-carousel-regression.mjs — guards the spouse-carousel rebuild against the regressions
 * that sank the first strip attempt: shifted chip rects on ≤3-spouse cards, clipped chip drop
 * shadows, and scrollbars (horizontal from the overhang at narrow viewports; vertical wobble on
 * flights). Dev server must be up on :5173.
 *
 *   node scripts/probe-carousel-regression.mjs capture   # record ≤3-spouse baseline rects
 *   node scripts/probe-carousel-regression.mjs           # assert nothing regressed (exit 1 on fail)
 *
 * Baseline is written to scripts/probe-out/carousel-baseline.json (gitignored). Capture once on the
 * known-good tree, then assert after every carousel iteration.
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE = join(HERE, 'probe-out', 'carousel-baseline.json');
const BASE = 'http://localhost:5173';
const MODE = process.argv[2] === 'capture' ? 'capture' : 'assert';

// ≤3-spouse cards that MUST stay pixel-identical (untouched baseline markup — no carousel machinery).
const GUARD = ['lea-hooker-1946', 'aaron-burr-1808', 'nancy-morse-1915', 'thomas-hooker'];
// >3-spouse cards that DO get the carousel; asserted across offsets.
const CAROUSEL = ['john-morgan-1930', 'michael-hooker-1935'];
const SHADOW_PAD = 4; // px of drop shadow that must stay inside any clipping ancestor (top/bottom/right)

const measure = (page) =>
	page.evaluate((PAD) => {
		const wrap = document.querySelector('.featured-card-wrap')?.getBoundingClientRect();
		const maskEl = document.querySelector('.spouse-mask')?.getBoundingClientRect();
		const wrapRight = wrap?.right ?? 0;
		const maskLeft = maskEl ? maskEl.left : wrapRight - 496; // strip window's left edge
		const chips = [...document.querySelectorAll('.spouse-notch .flight, .spouse-strip .flight')].map((el) => {
			const r = el.getBoundingClientRect();
			// Visible = box pokes past the mask's left edge AND starts before the right clip (a chip slid
			// under the header, or the next chip hidden past the trailing dock, is skipped).
			const visible = r.width > 0 && r.right > maskLeft + 1 && r.left < wrapRight + 6;
			// Shadow-clip: walk ancestors up to the card wrap. For each clipping ancestor compute its
			// ACTUAL clip rect (clip-path inset can be negative = extends past the box, revealing the
			// shadow); overflow-clipping uses the border box. Flagged if the chip + PAD escapes on
			// top/bottom/right. (Left may clip — chips slide under the header.)
			let shadowClipped = false;
			for (let n = el.parentElement; n && !n.classList?.contains('featured-card-wrap'); n = n.parentElement) {
				const cs = getComputedStyle(n);
				const hasClipPath = cs.clipPath !== 'none';
				const hasOverflowClip = (cs.overflowX !== 'visible' && cs.overflowX !== '') || (cs.overflowY !== 'visible' && cs.overflowY !== '');
				if (!hasClipPath && !hasOverflowClip) continue;
				const b = n.getBoundingClientRect();
				let clip = { top: b.top, bottom: b.bottom, right: b.right };
				const m = hasClipPath && cs.clipPath.match(/inset\(([^)]+)\)/);
				if (m) {
					const v = m[1].trim().split(/\s+/).map((s) => parseFloat(s));
					const [t, rr, bb] = [v[0], v[1] ?? v[0], v[2] ?? v[0]]; // top right bottom (left ignored)
					clip = { top: b.top + t, bottom: b.bottom - bb, right: b.right - rr };
				}
				if (r.top - PAD < clip.top - 0.5 || r.bottom + PAD > clip.bottom + 0.5 || r.right + PAD > clip.right + 0.5) shadowClipped = true;
			}
			return {
				name: el.querySelector('a')?.textContent?.trim().split('\n')[0]?.slice(0, 18) ?? '?',
				x: Math.round(r.x), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom),
				visible, shadowClipped
			};
		});
		const de = document.documentElement;
		return {
			wrapX: wrap ? Math.round(wrap.x) : null,
			wrapRight: Math.round(wrapRight),
			maskLeft: Math.round(maskLeft),
			chips,
			hScroll: de.scrollWidth - de.clientWidth,
			scrollbarGutter: getComputedStyle(de).scrollbarGutter
		};
	}, SHADOW_PAD);

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

const browser = await chromium.launch();

// Rect baseline for the ≤3-spouse guard cards, captured at a FIXED wide viewport.
const wide = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const wp = await wide.newPage();
const captured = {};
for (const slug of GUARD) {
	await wp.goto(`${BASE}/person/${slug}`, { waitUntil: 'networkidle' });
	await wp.waitForTimeout(500);
	const m = await measure(wp);
	captured[slug] = m.chips.filter((c) => c.visible).map((c) => ({ name: c.name, x: c.x, right: c.right }));
	if (MODE === 'assert') {
		const base = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
		const want = base[slug] ?? [];
		ok(JSON.stringify(captured[slug]) === JSON.stringify(want), `GUARD ${slug}: chip rects drifted\n   want ${JSON.stringify(want)}\n   got  ${JSON.stringify(captured[slug])}`);
		ok(!m.chips.some((c) => c.visible && c.shadowClipped), `GUARD ${slug}: a chip shadow is clipped`);
	}
}
await wide.close();

if (MODE === 'capture') {
	writeFileSync(BASELINE, JSON.stringify(captured, null, 1));
	console.log('captured baseline for', GUARD.join(', '), '->', BASELINE);
	await browser.close();
	process.exit(0);
}

// Carousel INTERACTION at a WIDE viewport (carets reachable): paging, shadows, full-pitch.
const wide2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const cp = await wide2.newPage();
for (const slug of CAROUSEL) {
	await cp.goto(`${BASE}/person/${slug}`, { waitUntil: 'networkidle' });
	await cp.waitForTimeout(500);
	let frozen = null; // the docked visible-chip rects — must be identical at EVERY offset
	for (let step = 0; step < 6; step++) {
		const m = await measure(cp);
		ok(m.hScroll <= 0, `${slug} offset~${step}: horizontal scrollbar (hScroll=${m.hScroll})`);
		const vis = m.chips.filter((c) => c.visible).sort((a, b) => a.x - b.x);
		ok(!vis.some((c) => c.shadowClipped), `${slug} offset~${step}: a visible chip's shadow is clipped`);
		// NO protrusion: nothing shows past the trailing docked chip's right edge (= card edge).
		ok(!vis.some((c) => c.right > m.wrapRight + 1), `${slug} offset~${step}: a chip protrudes past the card edge (right ${Math.max(...vis.map((c) => c.right))} > ${m.wrapRight})`);
		// FROZEN rects: the visible chips occupy the SAME docked rects at every offset (within 1px of
		// sub-pixel render drift — no slot shift, no displacement).
		const rects = vis.map((c) => [c.x, c.right]);
		if (frozen == null) frozen = rects;
		else {
			const drifted = rects.length !== frozen.length || rects.some((r, i) => !frozen[i] || Math.abs(r[0] - frozen[i][0]) > 1 || Math.abs(r[1] - frozen[i][1]) > 1);
			ok(!drifted, `${slug} offset~${step}: visible chip rects moved from docked\n   docked ${JSON.stringify(frozen)}\n   now    ${JSON.stringify(rects)}`);
		}
		// carets are always mounted now (opacity-driven); the last window is when the right caret is faded.
		const canAdvance = await cp.$eval('.caret-right', (el) => getComputedStyle(el).opacity !== '0').catch(() => false);
		if (!canAdvance) break;
		await cp.click('.caret-right');
		await cp.waitForTimeout(460);
	}
}

// No-blink + caret symmetry: the right caret stays visible through a 0→1 page (same node, opacity 1);
// and the two carets are EQUIDISTANT from the chips they flank (left before the first chip's left
// edge, right past the trailing chip's right edge — symmetry against the CHIP edges, not the card).
{
	await cp.goto(`${BASE}/person/john-morgan-1930`, { waitUntil: 'networkidle' });
	await cp.waitForTimeout(500);
	const opacity = (sel) => cp.$eval(sel, (el) => getComputedStyle(el).opacity).catch(() => 'absent');
	ok((await opacity('.caret-right')) === '1', 'right caret not fully visible at offset 0');
	await cp.click('.caret-right');
	const samples = [];
	for (let i = 0; i < 3; i++) { await cp.waitForTimeout(120); samples.push(await opacity('.caret-right')); }
	ok(samples.every((o) => o === '1'), `right caret flickered mid-page (opacities ${JSON.stringify(samples)})`);
	await cp.mouse.move(5, 5); // off any caret — the hover LIFT (-2px) would skew the height check
	await cp.waitForTimeout(250);
	const geo = await cp.evaluate(() => {
		const flights = [...document.querySelectorAll('.spouse-strip .flight')].map((e) => e.getBoundingClientRect());
		const wr = document.querySelector('.featured-card-wrap').getBoundingClientRect().right;
		const mL = document.querySelector('.spouse-mask').getBoundingClientRect().left;
		const vis = flights.filter((r) => r.right > mL + 1 && r.left < wr + 6).sort((a, b) => a.left - b.left);
		const l = document.querySelector('.caret-left')?.getBoundingClientRect();
		const r = document.querySelector('.caret-right')?.getBoundingClientRect();
		return {
			firstChipLeft: vis[0]?.left, trailChipRight: vis[vis.length - 1]?.right,
			lRight: l?.right, rLeft: r?.left,
			lcy: l ? l.top + l.height / 2 : 0, rcy: r ? r.top + r.height / 2 : 0
		};
	});
	const leftGap = geo.firstChipLeft - geo.lRight; // caret inner edge → first chip left
	const rightGap = geo.rLeft - geo.trailChipRight; // trailing chip right → caret inner edge
	ok(leftGap > 0 && rightGap > 0, `a caret overlaps its chip (leftGap ${Math.round(leftGap)}, rightGap ${Math.round(rightGap)})`);
	ok(Math.abs(leftGap - rightGap) <= 2, `carets not equidistant from chip edges (leftGap ${Math.round(leftGap)} vs rightGap ${Math.round(rightGap)})`);
	ok(Math.abs(geo.lcy - geo.rcy) <= 1, `carets not at matched height (left cy ${Math.round(geo.lcy)} vs right cy ${Math.round(geo.rcy)})`);
}

// NOTE: the pivot-aware "ghost" round-trip (Morgan → deep wife → back) is a FLIGHT concern and lives
// in scripts/probe-flight.mjs as of L5 — not here (this probe guards the carousel's resting geometry).
await wide2.close();

// SCROLL stress at a NARROW viewport (margin < overhang) — overflow-x:clip must hold. No caret
// clicks (they'd be clipped off-screen here); instead assert the guard is structurally in place.
const narrow = await browser.newContext({ viewport: { width: 1000, height: 900 } });
const np = await narrow.newPage();
for (const slug of CAROUSEL) {
	await np.goto(`${BASE}/person/${slug}`, { waitUntil: 'networkidle' });
	await np.waitForTimeout(400);
	const m = await measure(np);
	ok(m.hScroll <= 0, `${slug} @1000px: horizontal scrollbar (hScroll=${m.hScroll})`);
	ok(m.scrollbarGutter === 'stable', `${slug}: scrollbar-gutter not stable (${m.scrollbarGutter})`);
	const clip = await np.evaluate(() => getComputedStyle(document.querySelector('.page-container')).overflowX);
	ok(clip === 'clip', `${slug}: page-container overflow-x is '${clip}', not 'clip' (overhang could scroll)`);
}
// mid-flight scrollbar: click a chip (reachable at offset 0), sample during the flight.
await np.goto(`${BASE}/person/john-morgan-1930`, { waitUntil: 'networkidle' });
await np.waitForTimeout(500);
const chipA = await np.$('.spouse-notch .flight a, .spouse-strip .flight a');
if (chipA) {
	await chipA.click();
	await np.waitForTimeout(150);
	const mid = await np.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	ok(mid <= 0, `mid-flight horizontal scrollbar (hScroll=${mid})`);
}
await narrow.close();
await browser.close();

if (fails.length) {
	console.log('REGRESSION PROBE: RED\n- ' + fails.join('\n- '));
	process.exit(1);
}
console.log('REGRESSION PROBE: GREEN — ≤3 rects frozen, no scrollbars, no clipped shadows, full-pitch paging.');
