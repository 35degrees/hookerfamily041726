/**
 * probe-static-contract.mjs — the only instrument that can see the boundary in §50.0 break.
 *
 *     node scripts/probe-static-contract.mjs            # against localhost:5173
 *     node scripts/probe-static-contract.mjs --base https://example.com
 *
 * THE LAW IT GUARDS:
 *
 *   `/` is the only route that may be dynamic. Everything under `/person/` stays static CDN
 *   payloads, forever. (roadmap §50.0, DEPLOYMENT §18.2)
 *
 * WHY IT NEEDS AN INSTRUMENT AT ALL. Breaking this does not look like breaking anything. Someone
 * adds `const session = await locals.getSession()` to a person page's load for a perfectly good
 * local reason — a bookmark star, a "welcome back", a personalised anything — and every test still
 * passes, every page still renders, and 19,728 static CDN files have quietly become serverless
 * invocations. §3's Option A is gone, §11.0's budget rule ("cost must scale with how much Sam has
 * written, not with how many machines read it") is broken, and the bill arrives months later
 * attached to nothing in particular.
 *
 * NOTHING ELSE IN THE APP WOULD REPORT IT. That is the entire justification for this file.
 *
 * PROVE RED FIRST. Per DEPLOYMENT §13.2 and this project's standing rule about instruments —
 * §36.4, §37.3, §39.4, §44.3 and §50.9 record six that confidently reported what they could not
 * see — this probe must be watched FAILING before it is trusted. To do that: add
 * `await locals.getSession()` to `src/routes/person/[slug]/+page.ts`, run it, watch check 3 go RED,
 * then take it out again. A green probe that has never been red is decoration.
 */
import { readdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';

const baseIdx = process.argv.indexOf('--base');
const BASE = baseIdx > -1 ? process.argv[baseIdx + 1] : 'http://localhost:5173';

const results = [];
const check = (name, pass, detail) => {
	results.push({ name, pass, detail });
	console.log(`  ${pass ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${name}`);
	if (detail) console.log(`        ${detail}`);
};

/**
 * CHECK 1 — SOURCE. The static contract is a property of the CODE, and this is the check that
 * fails at the moment the mistake is made rather than after it ships.
 *
 * A universal `+page.ts` load cannot read a session (no `locals`), so the tell is any appearance of
 * `locals`, `getSession`, or a `+page.server.ts` anywhere under the person route.
 */
function checkPersonRouteSource() {
	const dir = 'src/routes/person/[slug]';
	const files = readdirSync(dir);

	const serverFiles = files.filter((f) => f.includes('.server.'));
	check(
		'person route has no .server.ts (a server load would make every card dynamic)',
		serverFiles.length === 0,
		serverFiles.length ? `found: ${serverFiles.join(', ')}` : ''
	);

	const offenders = [];
	for (const f of files) {
		if (!/\.(ts|js|svelte)$/.test(f)) continue;
		const src = readFileSync(`${dir}/${f}`, 'utf8');
		// Comments legitimately discuss `getSession` at length in this codebase — strip them first,
		// or the probe reports the DOCUMENTATION of the rule as a violation of it.
		const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
		if (/locals\.getSession|await\s+locals\b|event\.locals/.test(code)) offenders.push(f);
	}
	check(
		'no session read in the person route',
		offenders.length === 0,
		offenders.length ? `session accessed in: ${offenders.join(', ')}` : ''
	);
}

/** CHECK 2 — the payload is a plain static file, fetchable with no cookie and no session. */
async function checkPayloadIsStatic() {
	const res = await fetch(`${BASE}/data/person/thomas-hooker-1586.json`);
	const ct = res.headers.get('content-type') ?? '';
	check(
		'person payload serves as a static JSON file',
		res.ok && ct.includes('json'),
		`HTTP ${res.status}, content-type: ${ct}`
	);
}

/**
 * CHECK 3 — BEHAVIOUR. A person page must render identically with and without a session cookie.
 *
 * ⚠ THIS CHECK IS WEAK, AND IT PROVED SO ON ITS FIRST RED RUN. Read this before trusting it.
 *
 * On 082926 the contract was deliberately broken — a `+page.server.ts` added to the person route
 * calling `locals.getSession()` — to prove the probe could see it. Checks 1, 2 and 4 went red.
 * **This one stayed green.** The reason: the cookie below is not a valid session, so the broken
 * load resolved `null` for BOTH requests and rendered identical bytes. The contract was broken and
 * the behavioural check reported health.
 *
 * That is the sixth instrument in this project to confidently report what it could not see (§36.4,
 * §37.3, §39.4, §44.3, §50.9, and the SSR grep during slice 2). It is kept rather than deleted
 * because it catches a real case the source checks cannot — a session read that arrives from a
 * dependency, a hook, or a shared module rather than from a file under the person route — but it is
 * **corroborating evidence, never the guarantee.**
 *
 * THE GUARANTEE IS CHECKS 1 AND 4, which read the source. If this check is ever the only one you
 * are relying on, you are relying on nothing. To make it strong would need a REAL session token
 * against a live user, which is a fixture this probe deliberately does not carry.
 *
 * Compared on length rather than byte-equality: dev-mode HMR ids and nonces differ per request, so
 * exact equality would be permanently red for reasons unrelated to the contract.
 */
async function checkPageIgnoresSession() {
	const url = `${BASE}/person/thomas-hooker-1586`;
	const anon = await fetch(url);
	const withCookie = await fetch(url, {
		headers: { cookie: 'better-auth.session_token=probe-not-a-real-session' }
	});
	const a = (await anon.text()).length;
	const b = (await withCookie.text()).length;
	// A session read that changed rendering moves the length by far more than HMR jitter.
	const drift = Math.abs(a - b);
	check(
		'person page renders the same with and without a session cookie  [WEAK — see header]',
		anon.ok && withCookie.ok && drift < 200,
		`anon ${a} bytes, with-cookie ${b} bytes, drift ${drift}` +
			' — corroborating only; checks 1 and 4 are the guarantee'
	);
}

/** CHECK 4 — the routes that ARE allowed to be dynamic, so the contract is stated positively too. */
async function checkDynamicSurfaceIsSmall() {
	/**
	 * THE ALLOWLIST IS THE POINT, and it is meant to be edited deliberately rather than kept in step.
	 * It went red on 082926 the moment `/api/lists` was added — which is the check doing its job:
	 * every new server route has to be argued for and written down here, so the dynamic surface can
	 * never grow by accident.
	 */
	const allowed = ['/', '/api/auth', '/api/bookmarks', '/api/hero', '/api/lists'];
	const serverRoutes = [];
	const walk = (dir) => {
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			const p = `${dir}/${e.name}`;
			if (e.isDirectory()) walk(p);
			else if (/\+(server|page\.server|layout\.server)\.(ts|js)$/.test(e.name)) serverRoutes.push(p);
		}
	};
	walk('src/routes');
	const unexpected = serverRoutes.filter(
		(p) => !allowed.some((a) => p.startsWith(`src/routes${a === '/' ? '/+page.server' : a}`))
	);
	check(
		'no server routes outside the allowed set',
		unexpected.length === 0,
		unexpected.length
			? `unexpected: ${unexpected.join(', ')}`
			: `${serverRoutes.length} server route(s), all expected`
	);
}

console.log(`\nSTATIC CONTRACT PROBE  (§50.0 / DEPLOYMENT §18.2)  base=${BASE}\n`);
checkPersonRouteSource();
await checkPayloadIsStatic();
await checkPageIgnoresSession();
await checkDynamicSurfaceIsSmall();

const failed = results.filter((r) => !r.pass);
console.log(
	`\n${failed.length ? '\x1b[31m' : '\x1b[32m'}${results.length - failed.length}/${results.length} passed\x1b[0m\n`
);
if (failed.length) process.exitCode = 1;
