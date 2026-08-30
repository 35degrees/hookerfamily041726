/**
 * /api/lists — renaming List 1 and List 2.
 *
 * Its own route rather than a branch of `/api/bookmarks`, because it writes a different table: the
 * names live on the USER (`list1Name` / `list2Name`), not on the bookmarks in them. Renaming a list
 * touches no bookmark rows at all, which is the whole point of storing the name in one place —
 * §50.2's rule that one fact lives once, so the toast, the hover menu and the modal header cannot
 * disagree about what a list is called.
 *
 * `input: false` on both fields in `auth.ts` is what makes this route necessary rather than
 * decorative: the client cannot write them through Better Auth's generic user-update endpoint, so
 * this is the single authorised path.
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pool } from '$lib/server/auth';

/**
 * 25 CHARACTERS (Sam). Enforced HERE as well as in the input's `maxlength`, because a `maxlength`
 * attribute is a convenience for the person typing and not a constraint on anything — it is absent
 * from every request that does not come from our own form.
 */
const MAX = 25;

export const PUT: RequestHandler = async ({ locals, request }) => {
	const session = await locals.getSession();
	const userId = session?.user?.id;
	if (!userId) throw error(401, 'Not signed in');

	const body = (await request.json().catch(() => null)) as {
		list?: unknown;
		name?: unknown;
	} | null;

	const list = body?.list;
	if (list !== 1 && list !== 2) throw error(400, 'list must be 1 or 2');

	/**
	 * NULL RESTORES THE DEFAULT, and that is why the column is nullable rather than seeded with
	 * "List 1". An empty box means "I do not want a custom name" — storing the literal default
	 * instead would make a renamed list indistinguishable from an untouched one, and would put
	 * English in the database for a label that is purely presentational (§50.2).
	 */
	const raw = body?.name;
	const name = raw === null ? null : typeof raw === 'string' ? raw.trim().slice(0, MAX) : undefined;
	if (name === undefined) throw error(400, 'name must be a string or null');

	const column = list === 1 ? 'list1Name' : 'list2Name';
	await pool.query(`update "user" set "${column}" = $1 where id = $2`, [name || null, userId]);

	return json({ list, name: name || null });
};
