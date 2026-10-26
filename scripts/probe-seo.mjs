/**
 * probe-seo.mjs — WHAT A SEARCH ENGINE GETS, checked the way it gets it (SEO_PLAN §9, the verification paragraph).
 *
 *     node scripts/probe-seo.mjs                                     # against hooker-test.vercel.app
 *     node scripts/probe-seo.mjs --base http://localhost:5173
 *     node scripts/probe-seo.mjs --base https://hookerverse.com --launched    # launch day (§12)
 *
 * Every page is fetched twice, as Googlebot DESKTOP and Googlebot SMARTPHONE (Google indexes the phone version), and
 * the two must agree. Nothing here runs JavaScript: this is the server HTML, the first thing a crawler reads.
 *
 *   a storied page    title with years · description · canonical · indexable · preview tags · ProfilePage JSON-LD ·
 *                     EVERY narrative block's header AND body in the page text (scripts stripped — the Oct 24 check
 *                     was fooled by the hydration JSON; this one cannot be)
 *   a stub            noindex, follow
 *   a private person  indexable (has blocks) but no years in the title and no dates or places in the JSON-LD
 *   an old address    ONE 301 to the current slug
 *   a severed person  404, uncached
 *   /                 description · WebSite JSON-LD · exactly one link, to Thomas
 *   /privacy          indexable · /contact noindex
 *   the sitemap       valid, hookerverse.com only, never /data/, contains the storied page and not the stub, and a
 *                     random sample of its URLs answers 200 without noindex
 *   robots.txt        before launch: only link-preview bots let in (never /data/); with --launched: exactly docs/robots-launch.txt
 *   the host header   hooker-test: noindex ALWAYS; hookerverse.com: noindex until --launched, then none
 *
 * PROVEN RED FIRST (Oct 26): against a local build with the description removed, the stub gate inverted and the
 * closed blocks' bodies emptied, it failed exactly those checks (description; robots on the storied page, the stub,
 * the private person and the sitemap sample; the block text) — then 42/42 on localhost and on hooker-test. The same
 * run caught the probe itself: the dev server inlines component CSS whose comments mention "<h1>", so it now strips
 * <style> as well as <script> before counting anything. A probe never seen failing is decoration.
 */
import { readFileSync } from 'node:fs';

const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : null; };
const BASE = (arg('--base') ?? 'https://hooker-test.vercel.app').replace(/\/$/, '');
const LAUNCHED = process.argv.includes('--launched');
const ORIGIN = 'https://hookerverse.com';
const BOTS = {
	desktop: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/131.0.0.0 Safari/537.36',
	phone: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
};
const RICH = 'dexter-ferry-1833';
const STUB = 'albert-bristol-1808';
const PRIVATE = 'samuel-hooker';
const OLD = ['albert-bristol', 'albert-bristol-1808'];
const SEVERED = 'dakota-edmund-burr';

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
	ok ? pass++ : fail++;
	console.log(`  ${ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${name}${!ok && detail ? `\n        ${detail}` : ''}`);
};
const get = (path, ua = BOTS.desktop, redirect = 'manual') => fetch(BASE + path, { headers: { 'User-Agent': ua }, redirect });
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const head = (h) => h.slice(0, h.indexOf('</head>'));
const meta = (h, attr, key) => { const m = head(h).match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`)); return m ? decode(m[1]) : null; };
const title = (h) => decode((head(h).match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? '');
const canonical = (h) => (head(h).match(/<link rel="canonical" href="([^"]*)"/) ?? [])[1] ?? null;
const jsonLd = (h) => { const m = head(h).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/); if (!m) return null; try { return JSON.parse(m[1]); } catch { return 'INVALID'; } };
// Markup only: scripts (the hydration JSON) and styles (the dev server inlines component CSS, whose comments mention
// "<h1>") are removed before anything is counted or searched.
const body = (h) => h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
const pageText = (h) => decode(body(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
const plain = (t) => t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();

/** Fetch as both Googlebots; the tags that matter must agree. */
async function both(path) {
	const out = {};
	for (const [k, ua] of Object.entries(BOTS)) {
		const r = await get(path, ua);
		out[k] = { r, h: await r.text() };
	}
	const sig = (h) => JSON.stringify([title(h), meta(h, 'name', 'description'), canonical(h), meta(h, 'name', 'robots'), meta(h, 'property', 'og:image')]);
	check(`${path}: desktop and smartphone Googlebot get the same tags`, sig(out.desktop.h) === sig(out.phone.h) && out.desktop.r.status === out.phone.r.status);
	return out.desktop;
}

console.log(`\nSEO PROBE  base=${BASE}${LAUNCHED ? '  (LAUNCHED)' : ''}\n`);

// ── the host header ───────────────────────────────────────────────────────────────────────────────────────
{
	const r = await get(`/${RICH}`);
	const xr = r.headers.get('x-robots-tag') ?? '';
	const isTest = !BASE.includes('hookerverse.com') && !BASE.includes('localhost');
	if (BASE.includes('localhost')) check('host header: (localhost — not checked)', true);
	else if (isTest || !LAUNCHED) check(`host header: X-Robots-Tag noindex (${isTest ? 'test host — always' : 'not launched yet'})`, /noindex/.test(xr), `got "${xr}"`);
	else check('host header: no X-Robots-Tag noindex on hookerverse.com pages (launched)', !/noindex/.test(xr), `got "${xr}"`);
}

// ── a storied page ────────────────────────────────────────────────────────────────────────────────────────
{
	const { r, h } = await both(`/${RICH}`);
	const p = await (await get(`/data/person/${RICH}.json`)).json();
	const blocks = p.person.narrative_blocks ?? [];
	check(`/${RICH}: 200`, r.status === 200, `got ${r.status}`);
	check(`/${RICH}: title has the name and years`, /\(\d{4}–\d{4}\) - /.test(title(h)), title(h));
	check(`/${RICH}: description present`, (meta(h, 'name', 'description') ?? '').length > 40);
	check(`/${RICH}: canonical is ${ORIGIN}/${RICH}`, canonical(h) === `${ORIGIN}/${RICH}`, canonical(h));
	check(`/${RICH}: indexable (no robots noindex)`, !meta(h, 'name', 'robots'), meta(h, 'name', 'robots'));
	check(`/${RICH}: payload carries ix`, p.ix === true);
	const og = meta(h, 'property', 'og:image');
	check(`/${RICH}: og:image + summary_large_image`, !!og && meta(h, 'name', 'twitter:card') === 'summary_large_image');
	if (og) { const ir = await fetch(og.replace(ORIGIN, BASE)); check(`/${RICH}: og:image answers 200 image/*`, ir.ok && /^image\//.test(ir.headers.get('content-type') ?? ''), `${ir.status} ${ir.headers.get('content-type')}`); }
	const ld = jsonLd(h);
	check(`/${RICH}: JSON-LD is a ProfilePage → Person with dates`, ld && ld !== 'INVALID' && ld['@type'] === 'ProfilePage' && ld.mainEntity?.['@type'] === 'Person' && !!ld.mainEntity.birthDate, JSON.stringify(ld)?.slice(0, 120));
	const text = pageText(h);
	const missing = blocks.filter((b) => !text.includes(plain(b.header).slice(0, 40)) || !text.includes(plain(b.body).slice(0, 60)));
	check(`/${RICH}: all ${blocks.length} narrative blocks (header + body) in the page text`, missing.length === 0, `missing: ${missing.map((b) => b.header).join(' | ')}`);
	check(`/${RICH}: one <h1>`, (body(h).match(/<h1[\s>]/g) ?? []).length === 1);
	const links = (body(h).match(/<a [^>]*href="\/[a-z0-9-]+"/g) ?? []).length;
	check(`/${RICH}: real links into the tree (${links})`, links >= 2);
	const cc = r.headers.get('cache-control') ?? '';
	check(`/${RICH}: edge-cacheable`, BASE.includes('localhost') ? /s-maxage/.test(cc) : r.headers.get('x-vercel-cache') !== null, `cache-control "${cc}", x-vercel-cache ${r.headers.get('x-vercel-cache')}`);
}

// ── a stub ────────────────────────────────────────────────────────────────────────────────────────────────
{
	const { r, h } = await both(`/${STUB}`);
	check(`/${STUB}: 200`, r.status === 200, `got ${r.status}`);
	check(`/${STUB}: noindex, follow (no narrative blocks)`, meta(h, 'name', 'robots') === 'noindex, follow', meta(h, 'name', 'robots'));
	check(`/${STUB}: canonical still names itself`, canonical(h) === `${ORIGIN}/${STUB}`);
}

// ── a private (living) person with blocks ─────────────────────────────────────────────────────────────────
{
	const { h } = await both(`/${PRIVATE}`);
	const ld = jsonLd(h);
	const e = ld?.mainEntity ?? {};
	check(`/${PRIVATE}: indexable (has blocks)`, !meta(h, 'name', 'robots'));
	check(`/${PRIVATE}: no years in the title`, !/\(\d{4}/.test(title(h)), title(h));
	check(`/${PRIVATE}: no dates or places in the JSON-LD`, !e.birthDate && !e.deathDate && !e.birthPlace && !e.deathPlace, JSON.stringify(e).slice(0, 160));
}

// ── an old address, and a severed person ──────────────────────────────────────────────────────────────────
{
	const r = await get(`/${OLD[0]}`);
	check(`/${OLD[0]}: one 301 to /${OLD[1]}`, r.status === 301 && (r.headers.get('location') ?? '').endsWith(`/${OLD[1]}`), `${r.status} → ${r.headers.get('location')}`);
	const r2 = await get(`/${SEVERED}`);
	check(`/${SEVERED}: 404 (severed — no page by design)`, r2.status === 404, `got ${r2.status}`);
	check(`/${SEVERED}: the 404 is not edge-cached for an hour`, !/s-maxage=3600/.test(r2.headers.get('cache-control') ?? ''));
}

// ── the home page ─────────────────────────────────────────────────────────────────────────────────────────
{
	const { r, h } = await both('/');
	const ld = jsonLd(h);
	const links = body(h).match(/<a [^>]*href="([^"]*)"/g) ?? [];
	check('/: 200', r.status === 200);
	check('/: description present', (meta(h, 'name', 'description') ?? '').length > 40);
	check(`/: canonical ${ORIGIN}/`, canonical(h) === `${ORIGIN}/`);
	check('/: WebSite JSON-LD with #website and an author', ld?.['@type'] === 'WebSite' && ld['@id'] === `${ORIGIN}/#website` && !!ld.author?.url);
	check('/: exactly one link, to Thomas', links.length === 1 && links[0].includes('href="/thomas-hooker-1586"'), links.join(' '));
}

// ── the pop-up addresses ──────────────────────────────────────────────────────────────────────────────────
{
	const { h } = await both('/privacy');
	check('/privacy: indexable, own title and canonical', !meta(h, 'name', 'robots') && /^Privacy - /.test(title(h)) && canonical(h) === `${ORIGIN}/privacy`);
	const c = await both('/contact');
	check('/contact: noindex', /noindex/.test(meta(c.h, 'name', 'robots') ?? ''));
}

// ── the sitemap ───────────────────────────────────────────────────────────────────────────────────────────
{
	const r = await get('/sitemap.xml');
	const x = await r.text();
	const locs = [...x.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => decode(m[1]));
	check(`sitemap: 200, ${locs.length} URLs, valid shape`, r.ok && x.startsWith('<?xml') && x.includes('</urlset>') && locs.length > 1000);
	check('sitemap: hookerverse.com only, never /data/', locs.every((l) => l.startsWith(`${ORIGIN}/`) && !l.includes('/data/')));
	check('sitemap: no duplicates', new Set(locs).size === locs.length);
	check(`sitemap: has /${RICH}, not /${STUB}`, locs.includes(`${ORIGIN}/${RICH}`) && !locs.includes(`${ORIGIN}/${STUB}`));
	const sample = locs.filter((l) => l !== `${ORIGIN}/`).sort(() => Math.random() - 0.5).slice(0, 15);
	const bad = [];
	for (const l of sample) {
		const s = await get(l.replace(ORIGIN, ''));
		const sh = await s.text();
		if (s.status !== 200 || /noindex/.test(meta(sh, 'name', 'robots') ?? '')) bad.push(`${l} ${s.status} ${meta(sh, 'name', 'robots') ?? ''}`);
	}
	check('sitemap: 15 random URLs all answer 200 and are indexable (gate and sitemap agree)', bad.length === 0, bad.join(' | '));
}

// ── robots.txt ────────────────────────────────────────────────────────────────────────────────────────────
{
	const rules = (t) => t.split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean).join('\n');
	const live = rules(await (await get('/robots.txt')).text());
	if (LAUNCHED) check('robots.txt: exactly docs/robots-launch.txt', live === rules(readFileSync(new URL('../docs/robots-launch.txt', import.meta.url), 'utf8')), live);
	else {
		// Before launch the file lets ONLY link-preview bots in (Oct 26). Asked as behaviour, not text: who may fetch what.
		const groups = [];
		for (const line of live.split('\n')) {
			const [k, ...v] = line.split(':'); const val = v.join(':').trim(); const key = k.trim().toLowerCase();
			if (key === 'user-agent') { if (!groups.length || groups.at(-1).rules.length) groups.push({ agents: [], rules: [] }); groups.at(-1).agents.push(val.toLowerCase()); }
			else if ((key === 'allow' || key === 'disallow') && groups.length) groups.at(-1).rules.push([key, val]);
		}
		const can = (ua, path) => {
			const g = groups.find((x) => x.agents.includes(ua.toLowerCase())) ?? groups.find((x) => x.agents.includes('*'));
			const hit = (g?.rules ?? []).filter(([, p]) => p && path.startsWith(p)).sort((a, b) => b[1].length - a[1].length)[0];
			return !hit || hit[0] === 'allow';
		};
		const shut = ['Googlebot', 'Bingbot', 'GPTBot', 'ClaudeBot', 'OAI-SearchBot'].filter((ua) => can(ua, `/${RICH}`));
		check('robots.txt: search engines and AI crawlers kept out (not launched)', shut.length === 0, `let in: ${shut.join(', ')}`);
		const previews = ['Twitterbot', 'Slackbot', 'LinkedInBot', 'Discordbot', 'facebookexternalhit'];
		const blocked = previews.filter((ua) => !can(ua, `/${RICH}`) || !can(ua, '/cld/x.jpg') || can(ua, '/data/x.json'));
		check('robots.txt: link-preview bots may read cards and portraits, never /data/', blocked.length === 0, `wrong for: ${blocked.join(', ')}`);
	}
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass}/${pass + fail} passed\x1b[0m\n`);
process.exit(fail ? 1 : 0);
