/**
 * run-migration.mjs — applies one hand-written SQL file to the database.
 *
 * WHY THIS EXISTS AT ALL, given Better Auth ships a CLI: that CLI migrates the schema it GENERATES
 * from `src/lib/server/auth.ts` — the four core tables and any `additionalFields`. It has nothing to
 * say about a table we invented. Rather than adopt a whole migration framework for one table, this
 * is twenty lines that reads a file and runs it.
 *
 *     node --env-file=.env scripts/run-migration.mjs migrations/001-bookmarks.sql
 *
 * `--env-file` rather than any config loading of its own: this runs in plain Node, outside Vite, so
 * `process.env` is the only environment there is. (That distinction cost a debugging round on
 * 082926 — see the header of src/lib/server/auth.ts.)
 *
 * NO DOWN MIGRATIONS, DELIBERATELY. A `down` that drops a table is a loaded gun pointed at data the
 * user cannot recover, and this project's ONE LAW is that ambiguity resolves to preserve. If a
 * migration needs undoing, write the next numbered file that undoes exactly what is intended and
 * read it before running it.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const file = process.argv[2];
if (!file) {
	console.error('usage: node --env-file=.env scripts/run-migration.mjs <path-to.sql>');
	process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is empty — is .env present, and did you pass --env-file=.env?');
	process.exit(1);
}

const sql = readFileSync(resolve(file), 'utf8');
const pool = new pg.Pool({ connectionString: url });

try {
	// ONE TRANSACTION for the whole file. Postgres runs DDL transactionally, so a syntax error on
	// the last statement leaves nothing half-applied — which is the difference between "re-run it"
	// and "work out by hand what landed".
	await pool.query('BEGIN');
	await pool.query(sql);
	await pool.query('COMMIT');
	console.log(`✓ applied ${file}`);
} catch (err) {
	await pool.query('ROLLBACK').catch(() => {});
	console.error(`✗ ${file} FAILED — nothing was applied`);
	console.error(`  ${err.message}`);
	process.exitCode = 1;
} finally {
	await pool.end();
}
