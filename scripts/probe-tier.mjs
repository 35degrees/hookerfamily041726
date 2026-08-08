/**
 * probe-tier — the instrument the grandparent-tier work needed and did not have.
 *
 * WHY THIS EXISTS. During a flight one person legitimately occupies three or four DOM nodes at once:
 * the featured card, the demote chip-face inside it, a row chip, and — for the spouse hand-off — a CLONE
 * portalled to <body> carrying neither .flight nor data-flight-id. They sit in different stacking
 * contexts at different scales. Every ad-hoc selector written against that returns something plausible
 * and wrong, and an entire session was lost to exactly that:
 *
 *   - querySelector('.featured-flight') returns the ARRIVING card mid-flight, so a "departure direction"
 *     was really an arrival's.
 *   - a DETACHED node's getBoundingClientRect() is all zeros, so `0 - startLeft` reads as real travel;
 *     fourteen identical samples passed as a measurement.
 *   - getComputedStyle(el).opacity is 1 while an ANCESTOR holds it at 0 (markPending sets it on the
 *     .flight wrapper), so a correctly-hidden chip measured as fully visible — three times.
 *
 * So this probe never selects by position and never trusts a single element's opacity. It resolves
 * EFFECTIVE visibility by walking ancestors, identifies people by id/name rather than by DOM order, and
 * counts body-portalled ghosts explicitly.
 *
 * Run: node scripts/probe-tier.mjs [startSlug] [parentMatch] [--control] [--film]  (dev server on :5173)
 *
 * --film writes a filmstrip to scripts/probe-out/tier-film/ (gitignored) — the promotion frozen into
 * stills, because at ~500ms the whole thing is over before the eye can hold it and "does it read as a
 * discrete card with heft" is not a question numbers can answer.
 *
 * --control runs the SAME measurements on an ordinary parent promotion with no tier open. It is not a
 * nicety: the march is shared machinery (flyOut / morphIn / revealPending), so every claim about the
 * two-tier step is only meaningful beside a one-tier reading taken the same way, on the same page, by
 * the same instrument. Handoff §4.2 is the standing warning — a shape that looks tier-specific is
 * usually the house behaving normally.
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const argv = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const START = argv[0] || 'john-morgan-1837';
const PARENT = argv[1] || null;
const CONTROL = process.argv.includes('--control');
// A THIRD gesture, and the one that produced the duplicate: the tier is OPEN but the chip clicked is the
// PARENT, not a grandparent. The grandparent above then becomes a parent of the new focus — he arrives by
// morphIn AND his tier chip was a row leaver, which is two renders of one person.
const TIERPARENT = process.argv.includes('--tierparent');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));
const logs = [];
page.on('console', (m) => { const t = m.text(); if (t.startsWith('[handoff]') || t.startsWith('[rowclock]')) logs.push(t); });

// The one function everything else is built on. Injected once, used by every sample.
const INSTRUMENT = () => {
	// Effective opacity = the product of every ancestor's, because opacity is inherited by COMPOSITING,
	// not by cascade. This is the reading that was wrong all session.
	window.__eff = (el) => {
		let o = 1;
		for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
			const v = parseFloat(getComputedStyle(n).opacity);
			if (!Number.isNaN(v)) o *= v;
			if (getComputedStyle(n).visibility === 'hidden') return 0;
		}
		return +o.toFixed(3);
	};
	// Every node that depicts a person, wherever it lives — including the hand-off clone in <body>,
	// which carries no .flight and no data-flight-id and is therefore missed by every obvious query.
	window.__nodes = (name) => {
		const sel = '.featured-card, .person-box, .handoff-ghost, .demote-chipface';
		return [...document.querySelectorAll(sel)]
			.filter((el) => new RegExp(name, 'i').test(el.textContent || ''))
			.map((el) => {
				const r = el.getBoundingClientRect();
				return {
					kind: el.classList.contains('featured-card')
						? 'card'
						: el.closest('.handoff-ghost')
							? 'ghost'
							: el.closest('.demote-chipface')
								? 'chipface'
								: el.closest('.grandparent-tier')
									? 'tierchip'
									: el.closest('.spouse-notch')
										? 'notch'
										: el.closest('.parents-slot')
											? 'parent'
											: el.closest('.children-slot')
												? 'child'
												: 'other',
					x: Math.round(r.left),
					y: Math.round(r.top),
					w: Math.round(r.width),
					h: Math.round(r.height),
					// DETACHED / zero-size nodes are reported as such rather than as a position of 0,0.
					real: r.width > 2 && r.height > 2,
					op: window.__eff(el)
				};
			});
	};
};

await page.goto(`${BASE}/person/${START}`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
// The grandchildren list lives in the page payload, not the DOM, so the probe fetches it the same way
// the app does rather than guessing which chip has children.
await page.evaluate(async (slug) => {
	const r = await fetch(`/data/person/${slug}.json`);
	window.__payloadGrandchildren = r.ok ? (await r.json()).neighborhood?.grandchildren ?? [] : [];
}, START);
await page.addInitScript(INSTRUMENT);
await page.evaluate(INSTRUMENT);

const parents = await page.evaluate(() =>
	[...document.querySelectorAll('.parents-slot a.person-box')].map((x) => x.textContent.trim().split('\n')[0])
);
console.log(`\nstart: ${await page.evaluate(() => document.querySelector('h1')?.textContent?.trim().slice(0, 34))}`);
console.log(`parents on page: ${JSON.stringify(parents)}`);
const parentMatch = PARENT || parents[0]?.split(' ')[0] || '';

const rectOf = (sel, re) =>
	page.evaluate(([s, r]) => {
		const a = [...document.querySelectorAll(s)].find((x) => new RegExp(r, 'i').test(x.textContent || ''));
		if (!a) return null;
		const b = a.getBoundingClientRect();
		return { cx: b.x + b.width / 2, cy: b.y + b.height / 2, name: a.textContent.trim().split('\n')[0] };
	}, [sel, re]);

// ── CASE 8: THE GRANDCHILD TIER (--child) ─────────────────────────────────────────────────────────
// The descendant mirror. It asserts the four things the gesture promises and then asserts that all four
// are UNDONE on dismissal, because "it comes back" is half the feature and the half nobody tests.
if (process.argv.includes('--child')) {
	const kid = await page.evaluate((match) => {
		const gc = window.__payloadGrandchildren || [];
		const counts = {};
		for (const g of gc) counts[g.via_parent_id] = (counts[g.via_parent_id] || 0) + 1;
		// Prefer a child that is NOT on the top row — the rise from row 2 is the part of the gesture that
		// can actually be wrong, and a subject already on row 1 asserts nothing about it.
		const rowOf = (id) => {
			const el = document.querySelector(`.page-container > .children-slot > [data-flight-id="${id}"]`);
			return el ? Math.round(el.getBoundingClientRect().top) : 0;
		};
		const top = Math.min(...[...document.querySelectorAll('.page-container > .children-slot > .flight')]
			.map((e) => Math.round(e.getBoundingClientRect().top)));
		const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
		// A NAMED subject wins over the heuristic. The default (most grandchildren, prefer row 2) picks a
		// good general case, but a reported bug is usually about ONE person — pass their name as the second
		// argument and the probe tests them instead of whoever it would have chosen.
		const named = match
			? ranked.find(([id]) => {
					const el = document.querySelector(`.page-container > .children-slot > [data-flight-id="${id}"]`);
					return el && new RegExp(match, 'i').test(el.textContent || '');
				})
			: null;
		const best = named ?? ranked.find(([id]) => rowOf(id) > top) ?? ranked[0];
		if (!best) return null;
		const el = document.querySelector(`.page-container > .children-slot > [data-flight-id="${best[0]}"]`);
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return { id: best[0], expected: best[1], cx: r.x + r.width / 2, cy: r.y + r.height / 2, y: Math.round(r.top),
			x: Math.round(r.left),
			name: el.textContent.trim().split('\n')[0] };
	}, PARENT);
	if (!kid) { console.log('no child on this page has children of its own'); await browser.close(); process.exit(1); }
	const before = await page.evaluate(() => ({
		chips: document.querySelectorAll('.page-container > .children-slot > .flight').length,
		rows: new Set([...document.querySelectorAll('.page-container > .children-slot > .flight')].map((e) => Math.round(e.getBoundingClientRect().top))).size,
		topRow: Math.min(...[...document.querySelectorAll('.page-container > .children-slot > .flight')].map((e) => Math.round(e.getBoundingClientRect().top))),
		connector: window.__eff(document.querySelector('.connector-children'))
	}));
	console.log(
		`\nTHE GRANDCHILD TIER — hovering "${kid.name}" (${before.chips} children on ${before.rows} row(s), ` +
			`this one at y${kid.y}${kid.y > before.topRow ? ' — ROW 2, the rise is under test' : ' — already row 1'})`
	);
	// NOTHING OF A GENERATION IS EVER PAINTED ABOVE THE ROW IT DESCENDS FROM. Sampled through the OPEN and
	// again through the DISMISS, because the old margin-top slide broke it in both directions — level with
	// the children row on the way in, and above it on the way out.
	const overlapDuring = async (label) => {
		const worst = await page.evaluate(
			(id) =>
				new Promise((res) => {
					let w = -1e9;
					const t0 = performance.now();
					const tick = () => {
						// Against EVERY VISIBLE child chip, not just the hovered one. On dismissal the slot
						// expands and row 2 reoccupies the band the grandchildren are standing in, so the
						// hovered chip alone cannot answer the army-row question — which is precisely the
						// overlap Sam saw ("the grandchildren fading out overlap the incoming child chips").
						const kids = [...document.querySelectorAll('.page-container > .children-slot > .flight')]
							.filter((e) => window.__eff(e) > 0.02)
							.map((e) => e.getBoundingClientRect())
							.filter((r) => r.width > 2 && r.height > 2);
						const gcs = [...document.querySelectorAll('.grandchild-tier .flight')];
						if (kids.length && gcs.length) {
							const bottom = Math.max(...kids.map((r) => r.bottom));
							for (const g of gcs) {
								const r = g.getBoundingClientRect();
								if (r.width > 2 && r.height > 2 && window.__eff(g) > 0.02) w = Math.max(w, bottom - r.top);
							}
						}
						if (performance.now() - t0 < 900) requestAnimationFrame(tick);
						else res(w);
					};
					requestAnimationFrame(tick);
				}),
			kid.id
		);
		console.log(
			`  ${label}: deepest a grandchild reached into the children rows = ${worst <= -1e8 ? 'n/a' : Math.round(worst) + 'px'} ` +
				(worst <= 2 ? '✓ always below' : '✗ crossed into the children row')
		);
	};

	await page.mouse.move(kid.cx, kid.cy);
	await page.waitForTimeout(950); // just past the 900ms intent — catch the unfold itself
	const openWatch = overlapDuring('ON OPEN  ');
	await page.waitForTimeout(600);
	await openWatch;
	const open = await page.evaluate((id) => {
		const tier = document.querySelector('.grandchild-tier');
		const chip = document.querySelector(`.page-container > .children-slot > [data-flight-id="${id}"]`);
		return {
			gc: tier ? tier.querySelectorAll('.flight').length : 0,
			label: tier?.querySelector('.connector-label')?.textContent ?? null,
			siblingsVisible: [...document.querySelectorAll('.page-container > .children-slot > .flight')]
				.filter((e) => e.dataset.flightId !== id && window.__eff(e) > 0.05).length,
			hoveredX: chip ? Math.round(chip.getBoundingClientRect().left) : null,
			hoveredY: chip ? Math.round(chip.getBoundingClientRect().top) : null,
			connector: window.__eff(document.querySelector('.connector-children')),
			tierBelow: tier && chip ? tier.getBoundingClientRect().top >= chip.getBoundingClientRect().bottom - 2 : false
		};
	}, kid.id);
	const ok = (b) => (b ? '✓' : '✗');
	console.log(`  grandchildren revealed: ${open.gc}/${kid.expected} ${ok(open.gc === kid.expected)}   label "${open.label}"`);
	console.log(`  siblings faded out:     ${before.chips - 1} → ${open.siblingsVisible} visible ${ok(open.siblingsVisible === 0)}`);
	console.log(`  hovered chip HELD its column: x${kid.x} → x${open.hoveredX} ${ok(open.hoveredX === kid.x)}`);
	console.log(`  hovered chip on row 1:  y${kid.y} → y${open.hoveredY} (top row is y${before.topRow}) ${ok(open.hoveredY === before.topRow)}`);
	console.log(`  upward connector hidden: α${before.connector} → α${open.connector} ${ok(open.connector < 0.05)}`);
	console.log(`  tier sits BELOW the chip: ${ok(open.tierBelow)}`);
	// THE LINE MUST LAND ON SOMEBODY. The connector hangs off ONE chip while the grandchildren sit in a
	// centred row, so an off-centre chip left the line pointing at bare ground (Sam's Elizabeth Guest
	// screenshot: her only child was centred half a stage away). Asserted as "is the line's x inside a
	// grandchild chip", which is the thing the eye actually checks.
	const line = await page.evaluate(() => {
		const l = document.querySelector('.grandchild-tier .connector-line');
		const gcs = [...document.querySelectorAll('.grandchild-tier .flight')];
		if (!l || !gcs.length) return null;
		const lr = l.getBoundingClientRect();
		const lx = lr.left + lr.width / 2;
		// CENTRED on a chip, not merely touching one. An edge-hit is technically connected and reads as a
		// mistake — the line ran down the outer border of a chip in Sam's screenshot.
		const hit = gcs.find((g) => {
			const r = g.getBoundingClientRect();
			return Math.abs(lx - (r.left + r.width / 2)) <= 8;
		});
		const nearest = Math.min(
			...gcs.map((g) => {
				const r = g.getBoundingClientRect();
				return Math.abs(lx - (r.left + r.width / 2));
			})
		);
		return { lx: Math.round(lx), hit: !!hit, gap: Math.round(nearest),
			name: hit ? hit.textContent.trim().split('\n')[0] : null };
	});
	if (line)
		console.log(
			`  the line lands CENTRED on a grandchild: ${line.hit ? `"${line.name}"` : `NO — ${line.gap}px off the nearest centre`} ${ok(line.hit)}`
		);
	// AND IT ALL COMES BACK. Half the gesture, and the half a one-shot assertion never covers.
	const dismissWatch = overlapDuring('ON DISMISS');
	await page.mouse.move(20, 60);
	await dismissWatch;
	await page.waitForTimeout(700);
	const back = await page.evaluate((id) => ({
		tier: !!document.querySelector('.grandchild-tier'),
		chips: document.querySelectorAll('.page-container > .children-slot > .flight').length,
		hoveredY: Math.round(document.querySelector(`.page-container > .children-slot > [data-flight-id="${id}"]`)?.getBoundingClientRect().top ?? -1),
		connector: window.__eff(document.querySelector('.connector-children'))
	}), kid.id);
	console.log(
		`  ON DISMISS — tier gone ${ok(!back.tier)}  chips ${back.chips}/${before.chips} ${ok(back.chips === before.chips)}  ` +
			`chip back to y${back.hoveredY} ${ok(back.hoveredY === kid.y)}  connector α${back.connector} ${ok(back.connector > 0.05)}`
	);
	// ── CASE 8b: THE TWO EXITS ───────────────────────────────────────────────────────────────────────
	// Leaving the chip through its BOTTOM means "I am going for those" and must keep the row; leaving by
	// any other edge means the opposite and must close it at once. Tested on an OFF-CENTRE chip on purpose:
	// the row slides to sit under it, and the old region tested the tier's untranslated layout box, so
	// moving onto a grandchild registered as leaving. That is the bug this case exists to keep fixed.
	await page.mouse.move(kid.cx, kid.cy);
	await page.waitForTimeout(1150);
	const gcPoint = await page.evaluate(() => {
		const g = document.querySelector('.grandchild-tier .flight');
		if (!g) return null;
		const r = g.getBoundingClientRect();
		return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
	});
	if (gcPoint) {
		// Straight down and onto a grandchild, in one quick move — the gesture Sam described.
		await page.mouse.move(gcPoint.x, gcPoint.y);
		await page.waitForTimeout(280);
		const stayed = await page.evaluate(() => !!document.querySelector('.grandchild-tier'));
		console.log(`  EXIT VIA BOTTOM onto a grandchild: tier ${stayed ? 'stayed ✓' : 'CLOSED ✗'}`);
		// Back onto the chip, then out through its left edge.
		await page.mouse.move(kid.cx, kid.cy);
		await page.waitForTimeout(220);
		await page.mouse.move(kid.x - 60, kid.cy);
		await page.waitForTimeout(220);
		const closed = await page.evaluate(() => !document.querySelector('.grandchild-tier'));
		console.log(`  EXIT VIA LEFT EDGE:                tier ${closed ? 'closed at once ✓' : 'STILL OPEN ✗'}`);
	}

	// ── CASE 9: PROMOTING A GRANDCHILD (--gcpromote) ─────────────────────────────────────────────────
	// The descendant mirror of a grandparent promotion, and it asserts one thing the ancestor version
	// cannot: THE FLOOR MUST NOT MOVE AT ALL. This tier lives below the card, so unlike the grandparent
	// tier there is no collapse, no pendingCollapse correction, and nothing above the card has any reason
	// to shift by a pixel. If the floor moves here, someone has generalised pendingCollapse to "any tier".
	if (process.argv.includes('--gcpromote')) {
		await page.mouse.move(kid.cx, kid.cy);
		await page.waitForTimeout(1400);
		const gcInfo = await page.evaluate(() => {
			const el = document.querySelector('.grandchild-tier a.person-box');
			if (!el) return null;
			const r = el.getBoundingClientRect();
			const box = el.closest('[data-flight-id]');
			return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, x: Math.round(r.left), y: Math.round(r.top),
				id: box?.getAttribute('data-flight-id'), name: el.textContent.trim().split('\n')[0] };
		});
		if (!gcInfo) { console.log('tier did not re-open'); await browser.close(); process.exit(1); }
		const oldHero = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim() ?? '');
		await page.evaluate(([gcid, kidid]) => {
			window.__oldCard = document.querySelector('.featured-flight');
			window.__s = [];
			const t0 = performance.now();
			const samp = (el, t) => {
				if (!el) return null;
				const r = el.getBoundingClientRect();
				return { t, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width),
					h: Math.round(r.height), real: r.width > 2 && r.height > 2, op: window.__eff(el) };
			};
			const tick = () => {
				const now = Math.round(performance.now() - t0);
				window.__s.push({
					t: now,
					hero: samp([...document.querySelectorAll('.featured-flight')].find((e) => e !== window.__oldCard), now),
					old: samp(window.__oldCard, now),
					slot: samp(document.querySelector('.featured-slot'), now),
					climber: samp(document.querySelector(`.parents-slot [data-flight-id="${kidid}"]`), now),
					// real geometry AND effective opacity — the same definition the main case uses. Counting
					// raw matches reports the chip-face and any detached node as live copies (it read 3).
					copies: window.__nodes(gcid).filter((n) => n.real && n.op > 0.05).length
				});
				if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
		}, [gcInfo.name.split(' ')[0], kid.id]);
		await page.mouse.click(gcInfo.cx, gcInfo.cy);
		await page.waitForTimeout(2400);
		const sm = await page.evaluate(() => window.__s);
		const landed = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim() ?? '');
		const tr = (pick) => sm.map(pick).filter((p) => p && p.real);
		const hero = tr((x) => x.hero), floor = tr((x) => x.slot), climber = tr((x) => x.climber), old = tr((x) => x.old);
		console.log(`\nPROMOTING GRANDCHILD "${gcInfo.name}" from y${gcInfo.y} → landed on ${landed.slice(0, 30)}`);
		if (hero.length) console.log(
			`  hero first painted (${hero[0].x},${hero[0].y}) ${hero[0].w}x${hero[0].h} — chip was at (${gcInfo.x},${gcInfo.y}) ` +
			`${Math.abs(hero[0].x - gcInfo.x) <= 3 && Math.abs(hero[0].y - gcInfo.y) <= 3 ? '✓ born on its chip' : '✗ born elsewhere'}`);
		const steps = floor.filter((p, i) => i && Math.abs(p.y - floor[i - 1].y) > 1).length;
		console.log(`  THE FLOOR: ${floor[0]?.y} → ${floor[floor.length - 1]?.y}, ${steps} step(s) ` +
			`${steps === 0 ? '✓ nothing above the card moved, as this tier promises' : '✗ the stage moved'}`);
		if (climber.length) console.log(
			`  the hovered child climbed to the parents row: (${climber[0].x},${climber[0].y}) → ` +
			`(${climber[climber.length - 1].x},${climber[climber.length - 1].y}) over ${climber[0].t}→${climber[climber.length - 1].t}ms, ` +
			`α ${climber[climber.length - 1].op} ✓`);
		else console.log('  ✗ the hovered child never appeared in the parents row');
		if (old.length) {
			const z = old[old.length - 1];
			console.log(`  the old hero "${oldHero.slice(0, 22)}" demoted: h ${old[0].h} → ${z.h}, y ${old[0].y} → ${z.y}, α ${z.op} ` +
				`${z.h < old[0].h * 0.3 ? '✓ shrank into its implied grandparent seat' : '✗ FROZE'}`);
		}
		console.log(`  worst simultaneous copies of the promoted person: ${Math.max(...sm.map((x) => x.copies))}`);
		console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
		await browser.close();
		process.exit(0);
	}

	console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
	await browser.close();
	process.exit(0);
}

const par = await rectOf('.parents-slot a.person-box', parentMatch);
if (!par) { console.log(`no parent chip matching /${parentMatch}/`); await browser.close(); process.exit(1); }

// CONTROL: no hover, no tier — click the parent chip itself. One generation, so the army's step must be
// exactly one pitch, and the demoting card lands in a REAL child seat (no implied seat, no row alpha).
let gp, key;
if (CONTROL) {
	gp = par;
	key = par.name.split(' ')[0];
	console.log(`CONTROL: ordinary parent promotion, ${par.name} — expect a ONE-tier march`);
} else {
	await page.mouse.move(par.cx, par.cy);
	await page.waitForTimeout(1400);
	const tierChips = await page.evaluate(() =>
		[...document.querySelectorAll('.grandparent-tier a.person-box')].map((x) => x.textContent.trim().split('\n')[0])
	);
	console.log(`hovered ${par.name} → tier: ${JSON.stringify(tierChips)}`);
	if (!tierChips.length) { console.log('tier did not open — nothing to measure'); await browser.close(); process.exit(1); }
	gp = await rectOf('.grandparent-tier a.person-box', tierChips[0].split(' ')[0]);
	key = tierChips[0].split(' ')[0];

	// ── CASE 3: THE DISMISSAL STILL DOES NOT FLY ─────────────────────────────────────────────────────
	// The tier now has two ways out and they must stay different gestures. A NAVIGATION sends its chips
	// through flyOut (pinned, marching, one of them hidden); a HOVER DISMISSAL retracts the row as one
	// object with the chips riding it — the behaviour verified in 2fa6e69a, and the thing a bare
	// `out:flyOut` on those chips would silently destroy (no pan direction, no snapshot → the generic
	// 28px drift, i.e. a flight on a gesture that is not a flight). Measured by travel, not by eye.
	const before = await page.evaluate(() =>
		[...document.querySelectorAll('.grandparent-tier .flight')].map((el) => Math.round(el.getBoundingClientRect().left))
	);
	await page.mouse.move(20, 900); // right off the tier and the parent chip — the dismissal signal
	await page.waitForTimeout(120);
	const during = await page.evaluate(() =>
		[...document.querySelectorAll('.grandparent-tier .flight')].map((el) => Math.round(el.getBoundingClientRect().left))
	);
	await page.waitForTimeout(1200);
	const gone = await page.evaluate(() => !document.querySelector('.grandparent-tier'));
	const drift = during.length === before.length
		? Math.max(0, ...during.map((x, i) => Math.abs(x - before[i])))
		: 0;
	console.log(
		`dismissal: tier ${gone ? 'closed ✓' : 'STILL OPEN ✗'}, ` +
			`chips drifted ${drift}px laterally ${drift <= 2 ? '✓ (rode the block, did not fly)' : '✗ they flew'}`
	);
	// ── CASE 3b: THE ANCESTOR TIER'S TWO EXITS ───────────────────────────────────────────────────────
	// The mirror of case 8b with the sign flipped: this row sits ABOVE its chip, so the TOP edge is the one
	// that means intent and the other three must close at once.
	await page.mouse.move(par.cx, par.cy);
	await page.waitForTimeout(1150);
	const gpPoint = await page.evaluate(() => {
		const g = document.querySelector('.grandparent-tier .flight');
		if (!g) return null;
		const r = g.getBoundingClientRect();
		return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
	});
	if (gpPoint) {
		await page.mouse.move(gpPoint.x, gpPoint.y); // straight up onto a grandparent
		await page.waitForTimeout(280);
		const stayed = await page.evaluate(() => !!document.querySelector('.grandparent-tier'));
		console.log(`  EXIT VIA TOP onto a grandparent: tier ${stayed ? 'stayed ✓' : 'CLOSED ✗'}`);
		// RE-MEASURED with the tier open. Opening it drops the parent chip a whole tier, so coordinates
		// taken before the hover point ABOVE the chip's new position — i.e. straight into the corridor —
		// and the test reported the row "still open" when the row was behaving correctly.
		const live = await page.evaluate((m) => {
			const el = [...document.querySelectorAll('.page-container > .parents-slot > .flight')].find((x) =>
				new RegExp(m, 'i').test(x.textContent || '')
			);
			const r = el?.getBoundingClientRect();
			return r ? { cx: r.x + r.width / 2, cy: r.y + r.height / 2, bottom: r.bottom } : null;
		}, parentMatch);
		await page.mouse.move(live.cx, live.cy);
		await page.waitForTimeout(220);
		await page.mouse.move(live.cx, live.bottom + 60); // out through the bottom edge
		// Past the block's own 420ms outro. `closeTier()` fires immediately, but the block stays MOUNTED
		// while it retracts, so a short wait reports "still open" for a row that is already leaving.
		await page.waitForTimeout(650);
		const closed = await page.evaluate(() => !document.querySelector('.grandparent-tier'));
		console.log(`  EXIT VIA BOTTOM EDGE:            tier ${closed ? 'closed at once ✓' : 'STILL OPEN ✗'}`);
	}

	// Re-open for the promotion measurements below.
	await page.mouse.move(par.cx, par.cy);
	await page.waitForTimeout(1400);
	gp = await rectOf('.grandparent-tier a.person-box', tierChips[0].split(' ')[0]);
	if (!gp) { console.log('tier did not re-open after dismissal'); await browser.close(); process.exit(1); }
	if (TIERPARENT) {
		// Click the PARENT with the tier open. `key` stays the GRANDPARENT: he is the person whose copies
		// are being counted, because he is the one arriving by morphIn while his tier chip marches away.
		// RE-MEASURED with the tier open — opening it drops the parents row a whole tier, so `par`'s
		// original coordinates now point at empty stage and the click lands on nothing (measured: the page
		// simply never navigated, and every frame reported one happy resting chip).
		gp = await page.evaluate((m) => {
			const slots = [...document.querySelectorAll('.parents-slot')];
			const a = [...slots[slots.length - 1].querySelectorAll('a.person-box')].find((x) =>
				new RegExp(m, 'i').test(x.textContent || '')
			);
			if (!a) return null;
			const b = a.getBoundingClientRect();
			return { cx: b.x + b.width / 2, cy: b.y + b.height / 2, name: a.textContent.trim().split('\n')[0] };
		}, parentMatch);
		if (!gp) { console.log('parent chip not found with the tier open'); await browser.close(); process.exit(1); }
		console.log(`TIERPARENT: tier open, clicking the PARENT ${par.name} — counting copies of ${key}`);
	}
}

// ── CASE 2: THE TWO-TIER MARCH ────────────────────────────────────────────────────────────────────
// A grandparent is TWO generations up, so the army's step is two tier pitches, not one — and the old
// focus lands in a GRANDCHILDREN row that is not drawn at this zoom, so its demote has no box to
// resolve and used to freeze at full size on the stage. Both are measured here rather than eyeballed,
// against the pitch read off THIS page's own layout (the tier is not a number — see the handoff §3).
//
// Three subjects, all keyed on the PERSON: the promoted grandparent (case 1 above), the OLD FOCUS (its
// demote), and a parent chip that is merely leaving (a plain row leaver, the march's control).
const oldFocus = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim() ?? '');
// The parent chip that is NOT the one whose tier is open — it has no promotion of its own, so whatever
// it does IS the march.
const leaverName = parents.find((p) => !new RegExp(parentMatch, 'i').test(p)) ?? parents[0];
const leaverKey = leaverName.split(' ')[0];
// The pitch, measured the way rowTravel() measures it: from the parent CHIP's rect, not the slot's.
// `.parents-slot` reserves min-height 100 and bottom-aligns its 75px chips, so the slot's top sits 25px
// above the chips — and that dead space is COLLAPSED while a tier is open (.tier-above). Measuring the
// slot therefore reports 170 with no tier and 145 with one: a "pitch" that changes when nothing moved.
// rowTravel reads the snapshotted .flight boxes, i.e. the chips, and so must this.
// The hovered parent's own flight id — resolved by NAME once, here, so every later query can key on the
// id instead of re-matching text that collides ("Rev. Aaron Burr" inside "Aaron Burr Jr.").
// The pivot — the person we are LEAVING, who becomes a chip on the new page. Its id is what the
// post-landing flash check keys on.
const pivotId = await page.evaluate(() =>
	document.querySelector('.demote-chipface [data-flight-id]')?.getAttribute('data-flight-id') ??
	(document.querySelector('h1')?.textContent?.trim().match(/([A-Z]{1,2}\d{4,5})\s*$/)?.[1] ?? '')
);
const hoveredId = await page.evaluate((m) => {
	const el = [...document.querySelectorAll('.parents-slot [data-flight-id]')].find(
		(x) => new RegExp(m, 'i').test(x.textContent || '') && !x.closest('.grandparent-tier')
	);
	return el?.getAttribute('data-flight-id') ?? '';
}, parentMatch);

const pitch = await page.evaluate(() => {
	const slots = [...document.querySelectorAll('.parents-slot')];
	const chip = slots[slots.length - 1]?.querySelector('.flight');
	const slot = document.querySelector('.featured-slot');
	if (!chip || !slot) return null;
	return Math.round(slot.getBoundingClientRect().top - chip.getBoundingClientRect().top);
});

// TRAP 1, THE NAME-COLLISION FORM. Keying the departing card on its person's NAME is what the probe's
// own doctrine asks for, and it is not enough here: promote "Rev. Aaron Burr" from "Aaron Burr Jr." and
// one regex matches BOTH cards, so the arriving one is sampled as the departing one and reports a
// motionless full-size card — the exact frozen-demote signature the fix is meant to retire. So the two
// subjects are pinned as NODE REFERENCES taken before the click, when each is unambiguous. A node that
// detaches reports a zero rect, which the instrument already calls unreal rather than a position.
await page.evaluate(
	([k, lk, pid]) => {
		window.__oldCard = document.querySelector('.featured-flight');
		window.__leaver = [...document.querySelectorAll('.parents-slot .flight')].find(
			(el) => new RegExp(lk, 'i').test(el.textContent || '') && !el.closest('.grandparent-tier')
		);
		const sample = (el) => {
			if (!el) return null;
			const r = el.getBoundingClientRect();
			return {
				x: Math.round(r.left),
				y: Math.round(r.top),
				w: Math.round(r.width),
				h: Math.round(r.height),
				real: r.width > 2 && r.height > 2,
				op: window.__eff(el)
			};
		};
		// THE HERO, by node identity too. It does not exist at click time (it is created at the state swap,
		// after the fetch), so it is resolved each frame as "the .featured-flight that is not the departing
		// one" — which is exactly the distinction trap 1 says a bare .featured-flight query cannot make.
		// The hovered parent's incoming CHILD seat. On a grandparent promotion he crosses a GENERATION —
		// parents row to children row — and that row is inside .featured-slot's animated height, so the
		// question the design needs answered is how far his destination MOVES during the flight. A seat
		// that travels hundreds of pixels cannot be targeted by keyframes baked one frame in (§18.9).
		window.__childSeat = () =>
			document.querySelector(`.children-slot [data-flight-id="${pid}"]`);
		window.__hero = () =>
			[...document.querySelectorAll('.featured-flight')].find((el) => el !== window.__oldCard) ?? null;
		window.__s = [];
		const t0 = performance.now();
		const tick = () => {
			window.__s.push({
				t: Math.round(performance.now() - t0),
				nodes: window.__nodes(k),
				old: sample(window.__oldCard),
				hero: sample(window.__hero()),
				leaver: sample(window.__leaver),
				// THE STAGE ITSELF. Every rect above is painted ON this, and the tier's close moves it — so a
				// hero that "travels 45px" may be a hero doing everything right on a floor that slid out from
				// under it. Without this row the two are indistinguishable.
				slot: sample(document.querySelector('.featured-slot')),
				tier: sample(document.querySelector('.grandparent-tier')),
				// THE TRAVELLER. A clone portalled to <body>, carrying neither .flight nor data-flight-id —
				// trap 4, invisible to every obvious query. It is the only .handoff-ghost on the page.
				// TWO travellers now, and they are told apart by their PAINT LAYER rather than by name — the
				// notch traveller rides in front (z 50), the generation-crosser under the stage (z 0). Names
				// collide here ("Rev. Aaron Burr" inside "Aaron Burr Jr."); the z-order cannot.
				ghost: sample(
					[...document.querySelectorAll('.handoff-ghost')].find((g) => getComputedStyle(g).zIndex === '50')
				),
				crosser: sample(
					[...document.querySelectorAll('.handoff-ghost')].find((g) => getComputedStyle(g).zIndex === '0')
				),
				childSeat: sample(window.__childSeat()),
				// The notch seat the traveller is aimed at. It is laid out in .featured-slot, so with a tier
				// open it RISES with the collapse — which is the whole question here.
				notch: sample(document.querySelector('.spouse-notch [data-flight-id]')),
				// EVERY flight box on the page, by id. The dip is reported "in unison across all rows", and
				// the objects most able to show it are the ARRIVING chips — in flow, so painted at
				// layout(t) + transform(t), i.e. the sum of two clocks. Sampling them individually is the
				// only way to see which ones reverse and when.
				all: [...document.querySelectorAll('[data-flight-id]')].map((el) => {
					const r = el.getBoundingClientRect();
					return {
						id: el.getAttribute('data-flight-id'),
						zone: el.closest('.grandparent-tier')
							? 'tier'
							: el.closest('.spouse-notch')
								? 'notch'
								: el.closest('.parents-slot')
									? 'parents'
									: el.closest('.children-slot')
										? 'children'
										: 'other',
						y: Math.round(r.top),
						real: r.width > 2 && r.height > 2,
						op: window.__eff(el)
					};
				})
			});
			if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	},
	[key, leaverKey, hoveredId]
);

await page.mouse.click(gp.cx, gp.cy);
// A HAND THAT MOVES. The pointer is left sitting exactly where it clicked, and the collapse then brings a
// NEW parents row up underneath it — but pointerenter needs movement, so a motionless probe never fires
// the handler a real user fires within a frame or two of clicking. One pixel is enough, and it is the
// honest gesture: nobody clicks and then holds their hand perfectly still.
await page.waitForTimeout(120);
await page.mouse.move(gp.cx + 1, gp.cy + 1);
await page.waitForTimeout(2600);
const samples = await page.evaluate(() => window.__s);
const landed = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim().slice(0, 34));

console.log(`clicked grandparent ${gp.name} → landed on ${landed}\n`);
console.log(`VISIBLE COPIES OF "${key}" PER FRAME (real geometry AND effective opacity > 0.05):`);
let worst = 0;
for (const s of samples) {
	const vis = s.nodes.filter((n) => n.real && n.op > 0.05);
	if (vis.length > worst) worst = vis.length;
}
for (const i of [0, 4, 9, 16, 26, 40, samples.length - 1]) {
	const s = samples[i];
	if (!s) continue;
	const vis = s.nodes.filter((n) => n.real && n.op > 0.05);
	console.log(
		`  ${String(s.t).padStart(4)}ms  ${vis.length} visible  ` +
			vis.map((n) => `${n.kind}@(${n.x},${n.y}) ${n.w}x${n.h} α${n.op}`).join('   ')
	);
}
console.log(`\nWORST simultaneous visible copies: ${worst}`);
console.log(worst > 1 ? '  ^ more than one copy of the same person on screen — the illusion is broken' : '  one copy throughout ✓');

// ── CASE 2 REPORT: the march and the implied seat ─────────────────────────────────────────────────
// A node is only counted while it is REAL (non-degenerate rect) and visible; a detached node's rect is
// all zeros and reads as travel to (0,0) if you let it (trap 2).
const track = (pick) => {
	const pts = [];
	for (const s of samples) {
		const n = pick(s);
		if (n && n.real) pts.push({ t: s.t, ...n });
	}
	return pts;
};
const demote = track((s) => s.old);
const leaver = track((s) => s.leaver);
const hero = track((s) => s.hero);

// ── THE HERO'S OWN JOURNEY ────────────────────────────────────────────────────────────────────────
// The doctrine this has to satisfy is a FEELING — a discrete baseball card with heft, followable by
// eye — so the reading that matters is not "did it arrive" but WHEN IT FIRST APPEARED, HOW FAR IT HAD
// ALREADY TRAVELLED BY THEN, and how long it was visibly in motion. A card that is born already
// half-grown has no journey to follow however correct its endpoints are.
if (hero.length > 1) {
	const a = hero[0];
	const z = hero[hero.length - 1];
	const grown = (p) => (p.h - a.h) / Math.max(1, z.h - a.h);
	// The moment it stops moving: the last frame whose top differs from the resting top by > 1px.
	const moving = hero.filter((p) => Math.abs(p.y - z.y) > 1 || Math.abs(p.h - z.h) > 2);
	const settleT = moving.length ? moving[moving.length - 1].t : a.t;
	console.log(`\nTHE HERO (the clicked chip becoming the card)`);
	console.log(
		`  first painted at ${a.t}ms: (${a.x},${a.y}) ${a.w}x${a.h}` +
			`   rest: (${z.x},${z.y}) ${z.w}x${z.h}`
	);
	console.log(
		`  born ${Math.round(grown(a) * 100)}% grown` +
			(grown(a) > 0.05
				? '  ← IT DID NOT START FROM THE CHIP: the first frame the user sees is already mid-flight'
				: '  ✓ starts at chip size')
	);
	console.log(`  visibly in motion ${a.t} → ${settleT}ms (${settleT - a.t}ms of travel to follow)`);
	console.log(
		'    frames: ' +
			hero
				.filter((_p, i) => i % 3 === 0 || i === hero.length - 1)
				.map((p) => `${p.t}ms y${p.y} h${p.h}`)
				.join('  ')
	);
} else console.log('\n  no hero card sampled');

// ── CASE 5: THE TRAVELLER vs THE CARD SHE IS LANDING ON ───────────────────────────────────────────
// The other parent crosses to the spouse notch. Her destination is the notch chip's RESTING rect, which
// is correct (§26: a seat in a moving container is a resting position, not a live rect) — but the card
// whose corner that seat sits in is still GROWING. Land her on her clock and she reaches a corner the
// card has not reached yet, and parks in open space against the card's right edge until the card
// arrives underneath her. What reads as "she jumps into the notch" is the card catching up. So the
// reading that matters is the GAP between her arrival and the card's.
const ghost = track((s) => s.ghost);
if (ghost.length > 1 && hero.length > 1) {
	const rest = hero[hero.length - 1];
	const stops = (pts, key, tol) => {
		const end = pts[pts.length - 1];
		const moving = pts.filter((p) => Math.abs(p[key] - end[key]) > tol);
		return moving.length ? moving[moving.length - 1].t : pts[0].t;
	};
	const ghostLands = stops(ghost, 'y', 1);
	// The card "arrives" when IT stops moving, measured with the same tolerance she is — apples to apples.
	// (An earlier version used "width within 1% of resting", which is a different threshold than her 1px
	// and made a card that had effectively arrived look late.)
	const cardArrives = Math.max(stops(hero, 'y', 1), stops(hero, 'w', 2));
	console.log(`\nTHE TRAVELLER (the other parent crossing to the spouse notch)`);
	console.log(
		`  ghost travels ${ghost[0].t}→${ghostLands}ms   the card's right edge arrives at ${cardArrives}ms`
	);
	const gap = cardArrives - ghostLands;
	// THE COMPLAINT, stated exactly: frames where she has STOPPED and her left edge is still outside the
	// card's right edge — a chip resting in open space beside a card that has not reached her.
	const parked = ghost.filter((g) => {
		if (g.t < ghostLands) return false;
		const h = hero.reduce((b, p) => (Math.abs(p.t - g.t) < Math.abs(b.t - g.t) ? p : b), hero[0]);
		return g.x > h.x + h.w;
	});
	// INFORMATIONAL, not a verdict. Both objects decelerate hard, so "last frame that moved >1px" fires
	// while each is still easing in; the number scales with the hero's own clock (control ~40ms, out of the
	// tier ~140ms because that hero is 111ms longer) and does not by itself mean she is waiting. The two
	// tests BELOW are the real ones — where she comes to rest, and whether she is ever at rest in open
	// space — because those are what Sam actually saw: "a random chip in the middle of the Featured Card."
	console.log(`  she settles ${gap}ms before the card finishes its own settle (eased tail; control ~40ms)`);
	// DOES SHE LAND WHERE THE SEAT ACTUALLY ENDS UP? With a tier open the notch seat rises 145px with the
	// collapsing stage, so a traveller aimed at the rect it had one frame in lands at the card's TIER-OPEN
	// corner — below and outside the card's resting one.
	const notchEnd = track((s) => s.notch).slice(-1)[0];
	const g = ghost[ghost.length - 1];
	if (notchEnd) {
		const off = Math.round(Math.hypot(g.x - notchEnd.x, g.y - notchEnd.y));
		console.log(
			off <= 8
				? `  ✓ lands ON the notch seat's resting rect (${off}px off)`
				: `  ← lands ${off}px from where the seat actually comes to rest ✗`
		);
	}
	console.log(
		parked.length
			? `  ← ${parked.length} frames RESTING OUTSIDE the card's right edge (${parked[0].t}→${parked[parked.length - 1].t}ms) ✗`
			: `  ✓ never at rest outside the card`
	);
}

// ── CASE 6: THE GENERATION CROSSER ───────────────────────────────────────────────────────────────
// The hovered parent becomes the new focus's CHILD: parents row → under the growing card → children row.
// Before this existed he faded out in one row while a second copy of him faded in two rows below. The
// test is that ONE object makes the whole journey and finishes on the seat.
const crosser = track((s) => s.crosser);
const seatEnd = track((s) => s.childSeat).slice(-1)[0];
if (crosser.length > 1) {
	const a = crosser[0];
	const z = crosser[crosser.length - 1];
	console.log(`\nTHE GENERATION CROSSER (the hovered parent → his child seat)`);
	console.log(`  travels (${a.x},${a.y}) → (${z.x},${z.y}) over ${a.t}→${z.t}ms, α ${a.op} → ${z.op}`);
	const miss = seatEnd ? Math.round(Math.hypot(z.x - seatEnd.x, z.y - seatEnd.y)) : null;
	console.log(
		miss === null
			? '  (no child seat sampled to compare against)'
			: miss <= 6
				? `  ✓ lands ON the seat (${miss}px off) — one object, whole journey`
				: `  ← finishes ${miss}px from the seat ✗`
	);
} else
	console.log(
		CONTROL || TIERPARENT
			? '\nTHE GENERATION CROSSER: none — correct, only a grandparent promotion crosses a generation gap ✓'
			: '\nTHE GENERATION CROSSER: no traveller — he is still dissolving and rematerialising ✗'
	);

// HOW FAR THE CHILD SEAT MOVES. The destination of the parent→child crossing lives in the children row,
// which sits below a .featured-slot whose height is transitioning to the new card's. If that seat travels
// far during the flight, a traveller aimed at it must TRACK it per frame (shrinkTo's moving-destination
// rule) rather than fly to a rect measured one frame in.
const seatTrack = track((s) => s.childSeat);
if (seatTrack.length > 1) {
	const a = seatTrack[0];
	const z = seatTrack[seatTrack.length - 1];
	console.log(
		`\nTHE CHILD SEAT (the hovered parent's destination): y ${a.y} → ${z.y} (${z.y - a.y > 0 ? '+' : ''}${z.y - a.y}px during the flight)` +
			(Math.abs(z.y - a.y) > 24
				? '  ← it MOVES: a traveller must track it per frame, not fly to a baked rect'
				: '  ✓ near-static: a rect measured once is safe')
	);
}

// ── CASE 7: THE DIP ──────────────────────────────────────────────────────────────────────────────
// Sam: "the animation dips just a little bit… a very small inverted arc where it goes down and back up
// … there's no other part of the project where the transitions dip." The house language has overshoots
// (a settle carries PAST a seat and returns) but never an arc on the way. An overshoot reverses AT the
// destination; a dip reverses in the MIDDLE of the journey, so the two are told apart by WHERE the
// reversal happens, not by whether one exists.
//
// Every in-flow object is painted at layout(t) + transform(t). If those two run on different clocks the
// sum is not monotonic even though each half is — so a dip shared by every row at the same instant is a
// statement about the two CLOCKS, not about any chip.
const dip = (name, pts) => {
	if (!pts || pts.length < 4) return;
	const end = pts[pts.length - 1].y;
	const total = Math.abs(end - pts[0].y) || 1;
	let worst = 0, worstT = 0, reversals = 0, dir = 0;
	for (let i = 1; i < pts.length; i++) {
		const d = pts[i].y - pts[i - 1].y;
		if (Math.abs(d) < 0.5) continue;
		const nd = Math.sign(d);
		if (dir && nd !== dir) reversals++;
		dir = nd;
	}
	// The excursion that matters: how far PAST its own final position the object goes mid-journey, in the
	// direction it is NOT travelling. A settle at the very end is the house overshoot and is excluded by
	// only counting frames before the last 15% of the clock.
	const cut = pts[pts.length - 1].t - (pts[pts.length - 1].t - pts[0].t) * 0.15;
	const goingDown = end > pts[0].y;
	for (const p of pts) {
		if (p.t > cut) continue;
		const over = goingDown ? p.y - end : end - p.y;
		if (over > worst) { worst = over; worstT = p.t; }
	}
	console.log(
		`  ${name.padEnd(11)} ${reversals} reversal(s), max mid-journey excursion ${Math.round(worst)}px` +
			(worst > 3 ? ` at ${worstT}ms  ← DIPS (${Math.round((worst / total) * 100)}% of its travel)` : '  ✓ direct')
	);
};
// THE SAG, the single number this is all about. The hero's deepest excursion BELOW where it comes to
// rest, across the whole flight. On a parent click with the tier open its true vertical travel is zero,
// so anything here is pure error — the stage's curve showing through the card's. It scales linearly with
// the push (error = push × (e − c)), which is why moving the tier closer to the top of the screen is a
// real lever and not a workaround: less push, proportionally less sag.
if (hero.length > 3) {
	const restY = hero[hero.length - 1].y;
	const deepest = Math.max(...hero.map((p) => p.y - restY));
	const at = hero.find((p) => p.y - restY === deepest);
	console.log(
		`\nTHE SAG: hero rests at y${restY}, dips to y${restY + deepest} at ${at?.t}ms  → ${Math.round(deepest)}px below its seat`
	);
}
console.log('\nTHE DIP CHECK (a reversal mid-journey, as distinct from a settle at the end)');
dip('hero', hero);
dip('leaver', leaver);
dip('crosser', crosser);
dip('floor', track((s) => s.slot));
dip('child seat', track((s) => s.childSeat));
dip('notch seat', track((s) => s.notch));
// Each flight box in the rows, individually. A leaver is PINNED (viewport coords, immune to layout) so it
// cannot show this; an arriver is in flow and can.
const byId = new Map();
for (const s2 of samples)
	for (const n of s2.all || []) {
		if (!n.real || n.op < 0.05) continue;
		if (n.zone !== 'parents' && n.zone !== 'children') continue;
		if (!byId.has(n.id)) byId.set(n.id, []);
		byId.get(n.id).push({ t: s2.t, y: n.y });
	}
for (const [id, pts] of byId) dip(`${id}`, pts);

// ── CASE 10: THE PIVOT DOES NOT FLASH AFTER IT LANDS ──────────────────────────────────────────────
// The demoted card becomes a chip in the new page's rows, and the atomic swap exposes that chip as a
// STEP — it is already at full opacity when it appears, because the card was sitting on it. Anything that
// dips it afterwards is a second gesture applied to a settled object, which is the most conspicuous kind
// of wrong: Sam caught it instantly. Measured on EFFECTIVE opacity, so an ancestor's fade counts.
{
	const pivotTrack = [];
	for (const s2 of samples)
		for (const n of s2.all || [])
			if (n.id === pivotId && n.real) pivotTrack.push({ t: s2.t, op: n.op });
	const firstUp = pivotTrack.findIndex((p) => p.op > 0.9);
	if (firstUp >= 0) {
		const after = pivotTrack.slice(firstUp);
		const dip = after.reduce((m, p) => (p.op < m.op ? p : m), after[0]);
		console.log(
			`\nTHE PIVOT AFTER LANDING: visible from ${after[0].t}ms; lowest effective opacity thereafter ` +
				`α${dip.op} at ${dip.t}ms ` +
				(dip.op > 0.9 ? '✓ never flashes' : '✗ FLASHES after it has settled')
		);
	}
}

// THE END-LIFT, which is what a dip in unison actually is. Every in-flow object is painted at
// layout(t) + transform(t). The row transforms all end together on the army's clock; if the STAGE is
// still collapsing after that instant, every one of them is left below its final position and gets
// carried up the remaining distance — a small inverted arc, shared by everything, right at the end.
// Sam: "all elements pulling up right at the final moment before settling into final position."
//
// It cannot be told from a settle by shape (both go past and come back), so it is measured at its CAUSE:
// how much travel the floor has left at the moment the army stops. The leaver is the clean read of the
// army's clock — it is pinned, so its motion is its transform and nothing else.
{
	const fl = track((s) => s.slot);
	if (fl.length > 2 && leaver.length > 2) {
		const armyEnds = leaver.filter((p) => Math.abs(p.y - leaver[leaver.length - 1].y) > 1).slice(-1)[0]?.t ?? 0;
		const at = fl.reduce((b, p) => (Math.abs(p.t - armyEnds) < Math.abs(b.t - armyEnds) ? p : b), fl[0]);
		const left = Math.abs(at.y - fl[fl.length - 1].y);
		console.log(
			`\nTHE END-LIFT: the army stops at ${armyEnds}ms; the stage still has ${Math.round(left)}px to travel then` +
				(left > 2
					? `\n  ← every in-flow element is carried ${Math.round(left)}px UP after it has stopped — the dip ✗`
					: '  ✓ stage and army stop together — nothing lifts at the end')
		);
	}
}

// THE TAIL, printed rather than judged. "All elements pulling up right at the final moment" is a
// statement about the last few frames of several objects at once, so the honest instrument is the table:
// every subject's y over the closing stretch, side by side, where a shared upward move is visible as a
// column that turns around together.
{
	const subs = [
		['hero', hero], ['floor', track((s) => s.slot)], ['crosser', crosser],
		['childSeat', track((s) => s.childSeat)], ['notch', track((s) => s.notch)], ['ghost', ghost]
	].filter(([, v]) => v && v.length > 3);
	// The end of the FLIGHT, not the end of the sample: the last frame on which anything still moved.
	const end = Math.max(
		...subs.map(([, v]) => {
			const last = v[v.length - 1].y;
			const moving = v.filter((q) => Math.abs(q.y - last) > 0.5);
			return moving.length ? moving[moving.length - 1].t : v[0].t;
		})
	);
	console.log('\nTHE TAIL (y per frame over the closing stretch; a shared turn-around IS the dip)');
	console.log('    t   ' + subs.map(([n]) => n.padStart(9)).join(''));
	const times = [...new Set(samples.map((x) => x.t))].filter((t) => t >= end - 300 && t <= end + 120);
	for (const t of times) {
		const row = subs.map(([, v]) => {
			const p = v.reduce((b, q) => (Math.abs(q.t - t) < Math.abs(b.t - t) ? q : b), v[0]);
			return Math.abs(p.t - t) > 40 ? '        -' : String(p.y).padStart(9);
		});
		console.log(String(t).padStart(6) + '  ' + row.join(''));
	}
}

// THE FLOOR. The featured slot's own top, per frame — the stage the hero is measured against.
const slotTrack = track((s) => s.slot);
if (slotTrack.length > 1) {
	const tops = slotTrack.map((p) => p.y);
	const jump = slotTrack.reduce(
		(m, p, i) => (i && Math.abs(p.y - slotTrack[i - 1].y) > Math.abs(m.d) ? { t: p.t, d: p.y - slotTrack[i - 1].y } : m),
		{ t: 0, d: 0 }
	);
	// A TELEPORT is not "a big single-frame step" — a 145px glide sampled at 16ms legitimately moves ~25px
	// in its fastest frame. It is one frame carrying a large FRACTION of the whole journey. Measured, the
	// instant close put 100% of the floor's travel in one frame; a close on the flight's clock puts ~18%
	// in its steepest.
	const total = Math.abs(tops[tops.length - 1] - tops[0]);
	const share = total ? Math.abs(jump.d) / total : 0;
	console.log(
		`  the FLOOR (.featured-slot top): ${tops[0]} → ${tops[tops.length - 1]}, ` +
			`biggest single-frame move ${jump.d > 0 ? '+' : ''}${jump.d}px at ${jump.t}ms ` +
			`(${Math.round(share * 100)}% of its travel)` +
			(() => {
				// The test is not WHEN the stage moves — the collapse lands on the swap frame, which is
				// whenever the payload arrives — but whether it moves more than ONCE. One step is a layout
				// fact every FLIP has been told about; two or more is a stage in motion, and something on it
				// is compositing its own curve against the stage's.
				const steps = slotTrack.filter((p, i) => i && Math.abs(p.y - slotTrack[i - 1].y) > 1).length;
				return steps <= 1
					? `  ✓ moves in ${steps} step — a layout fact, not an animation`
					: `  ← moves over ${steps} frames: the stage is in MOTION under the flight`;
			})()
	);
	// The floor beside the BLOCK that moves it: a step in the floor with no matching step in the tier's
	// own geometry is coming from somewhere else in the column (the .parents-slot lead, a row leaving flow).
	const tierTrack = samples.map((s) => ({ t: s.t, f: s.slot, g: s.tier }));
	console.log(
		'    floor/tier: ' +
			tierTrack
				.filter((p, i) => p.f && (i % 3 === 0 || i < 6))
				.slice(0, 14)
				.map((p) => `${p.t}ms floor${p.f.y}${p.g && p.g.real ? ` tier${p.g.y}+${p.g.h}` : ' tier—'}`)
				.join('  ')
	);
}
const tiers = CONTROL ? 1 : 2;
console.log(
	`\nTHE MARCH (measured pitch on this page: ${pitch}px → a ${tiers}-tier step is ${pitch * tiers}px)`
);
if (leaver.length > 1) {
	const dy = leaver[leaver.length - 1].y - leaver[0].y;
	console.log(
		`  leaver "${leaverKey}" chip: y ${leaver[0].y} → ${leaver[leaver.length - 1].y}  (${dy > 0 ? '+' : ''}${dy}px, ` +
			`last α ${leaver[leaver.length - 1].op}, visible for ${leaver[leaver.length - 1].t}ms)`
	);
	// It fades out BEFORE it arrives (ROW_GONE), so the visible travel is a fraction of the full step —
	// the seat is implied, never asserted. What is being tested is the STEP it is on, not where it stops.
	console.log(`    → ${(dy / (pitch || 1)).toFixed(2)} tiers covered before it disappeared`);
} else console.log('  no leaver chip sampled');
if (demote.length > 1) {
	const a = demote[0];
	const z = demote[demote.length - 1];
	console.log(
		`  demote "${oldFocus.slice(0, 20)}" card: y ${a.y} → ${z.y} (${z.y - a.y > 0 ? '+' : ''}${z.y - a.y}px), ` +
			`h ${a.h} → ${z.h}, α ${a.op} → ${z.op}, last seen ${z.t}ms`
	);
	console.log(
		z.h >= a.h * 0.95 && z.y - a.y < 10
			? '    ^ FROZEN: full size, no travel — the demote found no seat (the pre-fix bug)'
			: `    → shrank to ${Math.round((z.h / a.h) * 100)}% and marched ${z.y - a.y}px down, ` +
				`faded to α ${z.op} ✓`
	);
	// THE TRAJECTORY, not just the endpoints. The demoting card is still IN FLOW (shrinkTo transforms it,
	// it does not pin it), so the tier's instant close re-seats its layout origin under it on frame 1 —
	// which endpoint arithmetic hides completely and a per-frame print makes obvious.
	console.log(
		'    frames: ' +
			demote
				.filter((_p, i) => i % 4 === 0 || i === demote.length - 1)
				.map((p) => `${p.t}ms y${p.y} h${p.h} α${p.op}`)
				.join('  ')
	);
} else console.log('  no departing card sampled');
if (logs.length) console.log(`  clocks: ${logs.filter((l) => l.startsWith('[handoff]')).join(' ')}`);
console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`);

// ── CASE 4: THE FILMSTRIP (--film) ────────────────────────────────────────────────────────────────
// Numbers can say the hero travels 145px on the row curve and still not answer the only question that
// matters — whether it reads as a discrete card with heft. At ~500ms the whole promotion is over before
// the eye can hold it, so this freezes it into stills that CAN be studied side by side.
//
// CDP SCREENCAST, not page.screenshot(). This matters, and the first attempt got it wrong in the way
// this whole file is a monument to. `page.screenshot()` is a request, not an instant: it costs ~50-100ms
// of wall clock while the flight keeps running, so a frame asked for at 180ms arrived showing a card that
// had already landed — a filmstrip whose LABELS WERE WRONG, which is worse than no filmstrip, because
// every frame still looks perfectly plausible. A screencast instead receives frames as the compositor
// actually paints them, each stamped by the browser, so the offsets are observed rather than requested.
if (process.argv.includes('--film')) {
	const fs = await import('node:fs/promises');
	const dir = 'scripts/probe-out/tier-film';
	const label = CONTROL ? 'control' : TIERPARENT ? 'tierparent' : 'tier';
	await fs.mkdir(dir, { recursive: true });
	for (const f of await fs.readdir(dir)) if (f.startsWith(`${label}-`)) await fs.unlink(`${dir}/${f}`);

	await page.goto(`${BASE}/person/${START}`, { waitUntil: 'networkidle' });
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(1200);
	const p = await rectOf('.parents-slot a.person-box', parentMatch);
	let target = p;
	if (p && !CONTROL) {
		await page.mouse.move(p.cx, p.cy);
		await page.waitForTimeout(1400);
		// TIERPARENT films the same gesture the duplicate came from: tier open, PARENT clicked. Its target
		// is re-measured with the tier open, because opening it drops the parents row a whole tier.
		target = TIERPARENT
			? await page.evaluate((m) => {
					const slots = [...document.querySelectorAll('.parents-slot')];
					const a2 = [...slots[slots.length - 1].querySelectorAll('a.person-box')].find((x) =>
						new RegExp(m, 'i').test(x.textContent || '')
					);
					const b = a2?.getBoundingClientRect();
					return b ? { cx: b.x + b.width / 2, cy: b.y + b.height / 2 } : null;
				}, parentMatch)
			: ((await rectOf('.grandparent-tier a.person-box', key)) ?? p);
		if (!target) target = p;
	}
	const client = await page.context().newCDPSession(page);
	const shots = [];
	client.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
		shots.push({ ts: metadata.timestamp, data });
		try {
			await client.send('Page.screencastFrameAck', { sessionId });
		} catch {
			/* the session closes while frames are still in flight — nothing to ack */
		}
	});
	// JPEG, not PNG. The screencast encodes every frame on the browser's main path, and PNG encoding of a
	// 1440×1200 viewport is slow enough to throttle delivery to ~15fps with a 250ms hole punched straight
	// through the start of the flight — the frames worth having. JPEG at q85 keeps up.
	await client.send('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1 });
	await page.waitForTimeout(250);
	const t0 = shots.length ? shots[shots.length - 1].ts : 0; // the last resting frame before the click
	await page.mouse.click(target.cx, target.cy);
	await page.waitForTimeout(1600);
	await client.send('Page.stopScreencast');

	// Thin to ~12 frames spread across the flight — a strip to step through, not 90 near-identical PNGs.
	const flight = shots.filter((s) => s.ts >= t0).map((s) => ({ ...s, off: Math.round((s.ts - t0) * 1000) }));
	const want = [0, 60, 110, 160, 220, 280, 350, 420, 500, 600, 750, 1000];
	const picked = new Set();
	for (const w of want) {
		const best = flight.reduce((b, s) => (Math.abs(s.off - w) < Math.abs(b.off - w) ? s : b), flight[0]);
		if (best) picked.add(best);
	}
	console.log(`\nFILMSTRIP → ${dir}/${label}-*.jpg   (${flight.length} painted frames captured, ${picked.size} kept)`);
	for (const s of [...picked].sort((a, b) => a.off - b.off)) {
		await fs.writeFile(`${dir}/${label}-${String(s.off).padStart(4, '0')}ms.jpg`, Buffer.from(s.data, 'base64'));
	}
	console.log(`  every filename is the OBSERVED paint offset from the click, not a requested one.`);
	console.log(`  the other side, for comparison: node scripts/probe-tier.mjs ${START} ${CONTROL ? '' : '--control '}--film`);
}
await browser.close();
