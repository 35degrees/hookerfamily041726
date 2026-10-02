/**
 * env.ts — EVERY ENVIRONMENT VARIABLE THE APP READS, DECLARED ONCE (SvelteKit 3).
 *
 * SvelteKit 3 only exposes variables declared here: `$app/env/private` and `$app/env/public` (and the
 * deprecated `$env/*` aliases, which are views of the same two modules) return NOTHING for an
 * undeclared name. `server/auth.ts` reads its secrets dynamically by name, which the migration
 * codemod cannot see — so without this file every auth call would get an empty string and fail with
 * the unhelpful `ECONNREFUSED 127.0.0.1:5432` its header describes.
 *
 * A variable with no `schema` is REQUIRED: the app refuses to start without it, naming the variable.
 * That is the loud failure auth.ts has always wanted and could only approximate with a console.error.
 * The optional ones return '' when unset, which is the shape auth.ts's `readEnv` already expects.
 *
 * Values live in `.env` locally and in Vercel's project settings when deployed — never here.
 */
import { defineEnvVars } from '@sveltejs/kit/env';

/** Unset is allowed and reads as '' — the provider or button it gates simply stays off. */
const optional = (value: string | undefined) => value ?? '';

export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'The POOLED Neon connection string (host carries -pooler). docs/AUTH_SETUP.md §3.'
	},
	BETTER_AUTH_SECRET: {
		description: 'Signs sessions and the cookie cache. Must be identical on every deployment.'
	},
	GOOGLE_CLIENT_ID: { description: 'Google OAuth client id.' },
	GOOGLE_CLIENT_SECRET: { description: 'Google OAuth client secret.' },
	MICROSOFT_CLIENT_ID: {
		schema: optional,
		description: 'Microsoft OAuth client id. Unset = the provider is not registered (auth.ts).'
	},
	MICROSOFT_CLIENT_SECRET: {
		schema: optional,
		description: 'Microsoft client secret. EXPIRES 2028-08-28 (Azure maximum) — see roadmap §52.7.'
	},
	PUBLIC_AUTH_MICROSOFT: {
		public: true,
		schema: optional,
		description: "'1' shows the Microsoft button (AuthModal). The kill switch if the secret lapses."
	}
});
