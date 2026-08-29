/**
 * /api/bookmarks — the whole bookmark surface, in two verbs.
 *
 * ONE ENDPOINT FOR THE WHOLE RIBBON CYCLE. The ribbon goes outline → gold → blue → outline, which
 * is four transitions but only ONE question: "what list is this person in for this user, if any?"
 * So `PUT` takes `{ personId, list: 1 | 2 | null }` and upserts or deletes accordingly. Modelling it
 * as POST-to-add plus DELETE-to-remove plus PATCH-to-move would be three routes describing one
 * control, and they would drift.
 *
 * THIS ROUTE AND `/api/hero` ARE THE ONLY PLACES OUTSIDE `/` THAT MAY READ A SESSION (§50.0, §18.2).
 * Person pages never do — the ribbon reads a client-side store hydrated once from the GET here. The
 * moment a person page's load calls `locals.getSession()`, 19,728 static CDN payloads become
 * serverless invocations for an icon, and nothing in the app would notice. `scripts/probe-static-
 * contract.mjs` is the only instrument that can see it.
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pool } from '$lib/server/auth';

type Row = { person_id: string; list: number; created_at: Date };

/** 401 rather than a redirect: this is an API, and its only caller is our own fetch. */
async function requireUserId(locals: App.Locals): Promise<string> {
	const session = await locals.getSession();
	if (!session?.user?.id) throw error(401, 'Not signed in');
	return session.user.id;
}

/**
 * THE WHOLE SET, IN ONE REQUEST, ONCE PER SESSION.
 *
 * Not paginated and deliberately so: a personal bookmark list is tens of rows, not thousands, and
 * the client needs ALL of it anyway — the ribbon on any card has to know that card's state without
 * asking, or every navigation becomes a round trip and the card waits on Neon waking up.
 */
export const GET: RequestHandler = async ({ locals }) => {
	const userId = await requireUserId(locals);
	const { rows } = await pool.query<Row>(
		`select person_id, list, created_at
		   from bookmark
		  where user_id = $1
		  order by created_at desc`,
		[userId]
	);
	return json({
		bookmarks: rows.map((r) => ({
			personId: r.person_id,
			list: r.list,
			createdAt: r.created_at.toISOString()
		}))
	});
};

export const PUT: RequestHandler = async ({ locals, request }) => {
	const userId = await requireUserId(locals);
	const body = (await request.json().catch(() => null)) as {
		personId?: unknown;
		list?: unknown;
	} | null;

	const personId = typeof body?.personId === 'string' ? body.personId.trim() : '';
	if (!personId) throw error(400, 'personId required');

	/**
	 * VALIDATED AGAINST THE SAME SET THE DATABASE ENFORCES. The CHECK constraint on `list` is the
	 * real guarantee; this is here so a bad value returns 400 rather than a 500 from Postgres.
	 * Belt and braces on purpose — the constraint is what makes it true, this is what makes it
	 * legible.
	 */
	const list = body?.list;
	if (list !== null && list !== 1 && list !== 2) throw error(400, 'list must be 1, 2 or null');

	if (list === null) {
		await pool.query(`delete from bookmark where user_id = $1 and person_id = $2`, [
			userId,
			personId
		]);
		return json({ personId, list: null });
	}

	/**
	 * UPSERT, NOT INSERT — because the middle of the ribbon's cycle is a MOVE, not a second save.
	 * The unique index on (user_id, person_id) is what makes this safe under a double-click: the
	 * second write updates the row the first created rather than filing the same ancestor into both
	 * lists at once, which is exactly the confusion Sam raised about the cycle.
	 */
	await pool.query(
		`insert into bookmark (id, user_id, person_id, list)
		 values ($1, $2, $3, $4)
		 on conflict (user_id, person_id) do update set list = excluded.list`,
		[crypto.randomUUID(), userId, personId, list]
	);
	return json({ personId, list });
};
