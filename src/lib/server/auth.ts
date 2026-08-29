/**
 * auth.ts — THE Better Auth instance, and one of only three files in this app that import
 * SvelteKit server primitives. See roadmap §50.1 and §49.2.
 *
 * WHY THE FILE COUNT IS THE POINT. The SvelteKit 3 migration's cost is roughly linear in HOW MANY
 * FILES import server primitives, not in how much auth logic exists (§49.2). This app had zero such
 * files before today — no hooks, no `.server.ts`, no cookies, no `$env` — which is why §38.1 could
 * measure the whole SK3 surface as "five things, only one of which thinks." Auth creates every one
 * of those surfaces at once. Concentrating them in three files is what keeps the eventual migration
 * closer to a codemod than to a project. Do not spread `event.cookies` or `auth.api.*` through
 * routes; add a helper here instead.
 *
 * THIS FILE IS LOADED BY TWO DIFFERENT THINGS, AND THEY READ THE ENVIRONMENT DIFFERENTLY. That is
 * the whole reason `readEnv` below exists, and getting it wrong cost a debugging round on 082926:
 *
 *   1. THE SVELTEKIT SERVER (dev and Vercel). Vite loads `.env` into its OWN store and exposes it
 *      through `$env/*`. It does NOT populate `process.env`. So at dev runtime `process.env.
 *      DATABASE_URL` is `undefined`, `new Pool({ connectionString: undefined })` silently falls back
 *      to libpq defaults, and every auth call 500s with `ECONNREFUSED 127.0.0.1:5432` — a localhost
 *      Postgres that was never running. The error names port 5432 and says nothing about `.env`,
 *      which is what makes it slow to read.
 *
 *   2. THE BETTER AUTH CLI (`npx auth@latest migrate|generate`), which loads this file OUTSIDE Vite
 *      to read the schema. It *stubs* framework virtual modules (`$env/*`, `$app/*`) rather than
 *      resolving them — so `$env/dynamic/private` is EMPTY there. It does, however, load `.env` into
 *      `process.env` itself (verified: the 082926 migration connected to Neon on that path alone).
 *
 * Neither source covers both. `readEnv` tries the SvelteKit one and falls back to `process.env`,
 * which is correct in all three environments: dev, Vercel (where Vercel sets real env vars that
 * `$env/dynamic/private` reads), and the CLI.
 *
 * `$env/DYNAMIC/private` and not `static`: static is inlined at build time and would need every
 * variable present when the build runs, which turns a missing env var into a failed deploy rather
 * than a clear runtime error. (`$app/server` is fine stubbed — `getRequestEvent` is passed by
 * reference, never called at module load, and has no bearing on schema generation.)
 */
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env as privateEnv } from '$env/dynamic/private';
import { Pool } from 'pg';

/** SvelteKit's env first, `process.env` second — see the header. Empty string, never `undefined`,
 *  so a missing value fails loudly at the library rather than silently defaulting somewhere. */
const readEnv = (key: string): string => privateEnv?.[key] ?? process.env[key] ?? '';

const DATABASE_URL = readEnv('DATABASE_URL');
const dev = (readEnv('NODE_ENV') || process.env.NODE_ENV) === 'development';

/**
 * MICROSOFT REGISTERS ONLY IF IT IS ACTUALLY CONFIGURED — derived from the credentials themselves,
 * never from a separate "enabled" switch. A boolean that can disagree with the thing it describes is
 * §33's `--ring-live` in miniature: a mechanism whose presence implies behaviour that may not exist.
 *
 * This is what lets the provider ship BEFORE the Azure registration exists. With the vars blank, the
 * provider is simply absent rather than registered-and-broken.
 *
 * The BUTTON is gated separately, on `PUBLIC_AUTH_MICROSOFT` (see AuthModal), because the client
 * cannot read a private var. Those two are set in the same step of docs/AUTH_SETUP.md §6 so they
 * cannot drift — and the public one doubles as a kill switch, which matters here specifically:
 * Azure client secrets EXPIRE (24 months maximum, where Google's never do), and on the day one
 * lapses, flipping one env var hides the button instead of leaving a dead option in the modal.
 */
const microsoftEnabled = Boolean(readEnv('MICROSOFT_CLIENT_ID') && readEnv('MICROSOFT_CLIENT_SECRET'));

/**
 * FAIL LOUDLY AND IN THE RIGHT WORDS. Without this, a missing connection string surfaces as
 * `ECONNREFUSED 127.0.0.1:5432` from deep inside `pg` — an error about a local Postgres nobody
 * asked for and nobody installed, naming a port that appears nowhere in this project. It is the
 * opposite of a signpost, and it is what an empty `DATABASE_URL` actually looked like on 082926.
 *
 * A warning and not a throw: the CLI legitimately loads this module to read the schema, and both
 * paths do populate the variable in practice, so a hard failure here would be the more brittle
 * choice for no gain.
 */
if (!DATABASE_URL) {
	console.error(
		'[auth] DATABASE_URL is empty — pg will fall back to localhost:5432 and every auth call will 500.' +
			' Set it in .env (the POOLED Neon string; see docs/AUTH_SETUP.md §3).'
	);
}

/**
 * ONE POOL, MODULE-SCOPED, AND IT MUST BE THE POOLED ENDPOINT.
 *
 * DEPLOYMENT §18.7 requirement 1, and it is the one that bites on Vercel: a serverless function
 * that opens a DIRECT Postgres connection per cold invocation exhausts Neon's connection limit
 * under any real traffic AND keeps the compute awake, which defeats the scale-to-zero economics
 * that made Neon the right choice in the first place. Use the connection string whose host carries
 * `-pooler`. This is invisible on localhost and only fails in production, which is exactly the
 * class of bug §1 says to go find early.
 *
 * No ORM. Better Auth 1.7's built-in Kysely dialect takes a `pg` Pool directly and its CLI writes
 * the migration, which is why Drizzle left the stack (roadmap Phase 10, corrected 082926).
 */
const pool = new Pool({ connectionString: DATABASE_URL });

export const auth = betterAuth({
	database: pool,

	/**
	 * PASSED EXPLICITLY, for the same reason as everything else here: Better Auth reads
	 * `BETTER_AUTH_SECRET` off `process.env` internally, which is empty under Vite (see the header).
	 * Left implicit, dev would run on a fallback secret and every session would be invalidated the
	 * moment production set a real one.
	 */
	secret: readEnv('BETTER_AUTH_SECRET'),

	/**
	 * AN ALLOWLIST, NOT A STRING — and this is the single most expensive lesson carried in from Sam's
	 * previous project, where apex-vs-`www` routing "took weeks and a snarled hooks.server.ts."
	 *
	 * The root cause there was `baseURL` being ONE STRING: one string cannot describe two hostnames,
	 * so every place that needed to know *which host am I* got patched by hand, and the CORS block in
	 * that hooks file was that patching. 1.7 resolves the host per request from `x-forwarded-host` →
	 * `host` → the request URL and validates it here. Critically, **allowedHosts are added to
	 * `trustedOrigins` automatically**, which is why this file has no CORS handling at all and the
	 * hook has none either — that code existed to work around a missing feature.
	 *
	 * THE PRODUCTION DOMAIN IS NOT CHOSEN YET (DEPLOYMENT §16-K). When it is: add it here, register
	 * the OAuth redirect URI for the CANONICAL host only, and 308 the other host at Vercel's EDGE —
	 * never in app code. A redirect that lives in `hooks.server.ts` sets cookies on one host and
	 * reads them on the other, which is debugging auth to fix a DNS decision (§18.4).
	 *
	 * `*.vercel.app` is here for PREVIEW deployments, which is the legitimate multi-host case.
	 */
	/**
	 * MEASURED 082926, on localhost, before any deployment — because the whole point of an allowlist
	 * is that it REFUSES, and a refusal you have not seen is a hypothesis:
	 *
	 *   localhost:5173 (listed)                       -> 200
	 *   localhost:5174 (not listed)                   -> 500, Better Auth throws. Working as designed
	 *   Host: evil.example.com                        -> 403, from VITE's own allowlist, a layer above
	 *   x-forwarded-host: hooker-abc.vercel.app       -> 200, wildcard matches
	 *
	 * The fourth row is the Vercel PREVIEW path — `x-forwarded-host` read ahead of `host`, wildcard
	 * honoured — verified without deploying anything. That is the exact mechanism that cost weeks on
	 * the previous project, seen working here first.
	 *
	 * 5174/5175 ARE LISTED BECAUSE VITE FALLS BACK TO THEM SILENTLY when 5173 is busy (a second dev
	 * server, a stale process), and the resulting symptom is deeply unhelpful: every auth call 500s
	 * with `{"message":"Internal Error"}` and nothing says why. If you ever see that, CHECK THE PORT
	 * IN THE VITE BANNER AGAINST THIS LIST FIRST.
	 */
	baseURL: {
		allowedHosts: [
			'localhost:5173',
			'localhost:5174',
			'localhost:5175',
			'localhost:4173', // vite preview
			'*.vercel.app'
		],
		protocol: dev ? 'http' : 'https'
	},

	/**
	 * GOOGLE ONLY (§18.1) — and the absence of email-and-password is the largest single thing keeping
	 * this build small. Any email-based method (password reset, verification, magic link alike)
	 * requires a transactional email provider, SPF/DKIM records, and deliverability to monitor when a
	 * verification mail lands in spam. Google-only needs none of it.
	 *
	 * Google permits `http://localhost` redirect URIs for development, which is why slice 1 needs no
	 * domain and no deployment.
	 *
	 * ADDING MICROSOFT LATER IS THIS BLOCK PLUS A BUTTON. Left architecturally open on purpose; the
	 * trigger is a real person who is blocked, not a hypothesis.
	 */
	socialProviders: {
		google: {
			clientId: readEnv('GOOGLE_CLIENT_ID'),
			clientSecret: readEnv('GOOGLE_CLIENT_SECRET')
		},
		/**
		 * MICROSOFT — added 082926, and the reason is the AUDIENCE rather than parity.
		 *
		 * The original ruling (§18.1) was Google-only, with the trigger for a second provider being
		 * "a real person who is blocked, not a hypothesis." Sam overturned it on a better argument
		 * than the one it replaced: this is a FAMILY genealogy, the users are relatives skewing
		 * older, and outlook.com / hotmail.com are common in exactly that group. For them a second
		 * button is coverage, not a nicety.
		 *
		 * `tenantId: 'common'` IS THE WHOLE POINT AND IS EASY TO GET WRONG. It accepts both personal
		 * Microsoft accounts and work/school ones. The Azure registration has to agree — "Accounts in
		 * any organizational directory AND personal Microsoft accounts" — and picking a narrower
		 * option there excludes the outlook.com relatives this exists to reach, silently.
		 *
		 * `prompt: 'select_account'` because a household or a shared machine may have more than one
		 * Microsoft account signed in, and silently reusing whichever is first is how someone
		 * bookmarks a great-grandmother into a sibling's account.
		 */
		...(microsoftEnabled
			? {
					microsoft: {
						clientId: readEnv('MICROSOFT_CLIENT_ID'),
						clientSecret: readEnv('MICROSOFT_CLIENT_SECRET'),
						tenantId: 'common',
						prompt: 'select_account' as const
					}
				}
			: {})
	},

	/**
	 * FOR THE SECOND PROVIDER, BEFORE THERE IS ONE. Google's emails are always verified, so linking a
	 * later Microsoft sign-in to an existing account by email is safe and prevents one human ending
	 * up with two accounts and two bookmark lists. `allowDifferentEmails: false` is the conservative
	 * half — a provider may only link to an account whose email it actually matches.
	 */
	/**
	 * TWO PROVIDERS, ONE ACCOUNT — when the email matches.
	 *
	 * Both Google and Microsoft return verified emails, so linking a later sign-in to an existing
	 * account by email is safe and stops one person ending up with two accounts and two bookmark
	 * lists.
	 *
	 * `allowDifferentEmails: false` IS THE CONSERVATIVE HALF AND HAS A CONSEQUENCE WORTH KNOWING:
	 * a relative who signs in with Google as `aunt@gmail.com` and later with Microsoft as
	 * `aunt@outlook.com` becomes TWO people here, with two separate sets of bookmarks. That is
	 * inherent to email-based linking rather than a defect — the alternative, trusting a provider's
	 * claim about an address it did not verify, is a real account-takeover path. Flagged so that
	 * "where did my saved entries go?" is a question with a known answer.
	 */
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ['google', 'microsoft'],
			allowDifferentEmails: false
		}
	},

	/**
	 * THE COOKIE CACHE IS WHAT MAKES `/` FREE, and `/` is the reason auth does not reopen the
	 * rendering fork (§3.5).
	 *
	 * `/` must branch on the session BEFORE a pixel is painted — a signed-in reader must never see
	 * the intro (§50.3). Without this, that branch is a database round-trip on the site's front door,
	 * on every visit and every crawl. With it, it is a signed-cookie read: zero queries, and the
	 * arithmetic in DEPLOYMENT §11.2b (under two cents a month) holds.
	 *
	 * `compact` is the default strategy and the right one here — smallest, signed, and this cookie is
	 * only ever read by Better Auth itself.
	 *
	 * THE CAVEAT, STATED SO IT IS KNOWN RATHER THAN DISCOVERED: a revoked session can stay live on
	 * ANOTHER device until maxAge expires, because the server cannot delete a cookie it did not just
	 * receive. For a bookmark list and a hero card that is irrelevant. It would NOT be irrelevant for
	 * anything sensitive, and nothing sensitive should be added here without revisiting this number.
	 */
	session: {
		cookieCache: { enabled: true, maxAge: 5 * 60 },
		expiresIn: 30 * 24 * 60 * 60,
		updateAge: 24 * 60 * 60
	},

	/**
	 * ONE COLUMN, AND IT HOLDS AN ID (§50.2).
	 *
	 * THE RULE THAT OUTLIVES EVERYTHING ELSE IN THIS FEATURE: store the person ID, never the slug.
	 * The URL is derived at render. DEPLOYMENT §8 measured slug churn as PERMANENT — 510 → 673
	 * redirects in five days — §4's 896-record slug repair has not run, and the `/person/x` → `/x`
	 * flatten is still intended. Any of those would silently orphan a slug-keyed hero, and a reader
	 * whose home card quietly reverted to Thomas Hooker has no way to report a cause.
	 *
	 * It is also why slug churn does NOT block shipping this, which is what made auth buildable now
	 * rather than after the data settles — which it never will.
	 *
	 * `input: false` — the client may not write this through the generic user-update endpoint; it is
	 * set by our own authorised route so the write path stays one place.
	 */
	user: {
		additionalFields: {
			heroPersonId: { type: 'string', required: false, input: false }
		}
	},

	/**
	 * ON FROM THE FIRST DEPLOYMENT, NOT AFTER A BAD WEEK (§18.5, §9.7).
	 *
	 * `/api/auth/*` is the first endpoint on this site where a request costs compute and a wrong
	 * answer costs an account, and login endpoints are probed continuously and indiscriminately.
	 * §9.7's ordering rule — the firewall precedes the exposure — applied to a surface §9 did not
	 * know would exist.
	 */
	rateLimit: { enabled: true, window: 60, max: 30 },

	advanced: {
		useSecureCookies: !dev
	},

	/**
	 * MUST BE LAST IN THE ARRAY (Better Auth's own instruction). Lets Better Auth set cookies through
	 * SvelteKit's response when an auth method is called server-side rather than over `/api/auth/*`.
	 */
	plugins: [sveltekitCookies(getRequestEvent)]
});

export type Session = typeof auth.$Infer.Session;
