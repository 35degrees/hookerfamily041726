/**
 * /api/hero — which card greets you when you arrive at `/`.
 *
 * ONE COLUMN ON THE USER, not a table: there is exactly one hero per person, so a row with a
 * foreign key would be a table that can only ever hold one row per user (§50.2).
 *
 * `input: false` on `heroPersonId` in `auth.ts` is what makes this route necessary rather than
 * decorative — the client CANNOT write that field through Better Auth's generic user-update
 * endpoint, so this is the single authorised path and the write logic lives in one place.
 *
 * WHY SETTING THIS DESERVES A CONFIRMATION, recorded here because it is the reasoning and not the
 * mechanism, and the mechanism will outlive the memory of it:
 *
 *   A bookmark set by accident costs a stray row in a list you can see and remove. A HERO set by
 *   accident costs the PREVIOUS hero — silently, with no record of what it was. It is mechanically
 *   reversible and practically not, because weeks later you sign in, land on someone you did not
 *   choose, and cannot remember who it replaced. That is destruction of state the user cannot
 *   recover, which is the category this project's no-delete law exists for.
 *
 * Hence the asymmetry the UI implements and this endpoint reports: replacing an existing hero names
 * the person being replaced; the FIRST hero is purely additive and needs no warning at all. This
 * route returns `previousPersonId` so the client can say whose choice it is about to overwrite
 * WITHOUT a second round trip — and so that a cancelled confirmation still leaves the reader knowing
 * what they had.
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pool } from '$lib/server/auth';

export const PUT: RequestHandler = async ({ locals, request }) => {
	const session = await locals.getSession();
	const userId = session?.user?.id;
	if (!userId) throw error(401, 'Not signed in');

	const body = (await request.json().catch(() => null)) as { personId?: unknown } | null;

	/** `null` clears the hero, which sends the reader back to Thomas Hooker — the line's own root,
	 *  and the documented fallback for anyone with no hero set (§50.3). */
	const raw = body?.personId;
	const personId = raw === null ? null : typeof raw === 'string' ? raw.trim() : undefined;
	if (personId === undefined) throw error(400, 'personId must be a string or null');

	/**
	 * THE OLD VALUE AND THE WRITE IN ONE STATEMENT, via the self-join idiom.
	 *
	 * `RETURNING` on its own yields the NEW row, which is not what the confirmation needs. Joining
	 * the table to itself in `FROM` gives the pre-update snapshot — `old."heroPersonId"` is the
	 * value as it stood before this statement — so the previous hero comes back in the same round
	 * trip, with no separate SELECT and no window in which two tabs could interleave a read and a
	 * write and report a hero that was never replaced.
	 *
	 * (A subquery inside RETURNING reads plausibly but is not specified to see the old row; this
	 * form is the documented one.)
	 */
	const { rows } = await pool.query<{ previous: string | null }>(
		`update "user" u
		    set "heroPersonId" = $1
		   from "user" old
		  where u.id = $2 and old.id = u.id
		 returning old."heroPersonId" as previous`,
		[personId, userId]
	);

	return json({
		personId,
		previousPersonId: rows[0]?.previous ?? null
	});
};
