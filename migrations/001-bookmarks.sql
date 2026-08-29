-- 001-bookmarks.sql — the one table Better Auth's CLI does not own.
--
-- Roadmap §50.2. Everything else in this database (`user`, `session`, `account`, `verification`,
-- and the `heroPersonId` / `list1Name` / `list2Name` columns) is generated and migrated by
-- `npx auth@latest migrate` from the config in src/lib/server/auth.ts. This table is ours, so it
-- lives here, tracked, and is applied with:
--
--     node --env-file=.env scripts/run-migration.mjs migrations/001-bookmarks.sql
--
-- Idempotent on purpose — safe to re-run against a database that already has it. A migration you
-- are afraid to run twice is a migration nobody runs.
--
-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- THE RULE THIS TABLE EXISTS TO ENFORCE: person_id, NEVER a slug.
--
-- DEPLOYMENT §8 measured slug churn as PERMANENT — 510 → 673 redirects in five days, and it grows
-- for the life of the site. §4's 896-record slug repair has not run, and the `/person/x` → `/x`
-- flatten is still intended. Any of those would silently orphan slug-keyed bookmarks, and a reader
-- whose saved ancestors quietly vanished has no way to report a cause. The URL is derived at
-- render, from the ID, every time.
--
-- It is also why slug churn does not block shipping this at all.
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "bookmark" (
    "id"           text PRIMARY KEY,

    -- ON DELETE CASCADE, matching the shape Better Auth uses for `session` and `account`. Deleting
    -- an account must not leave orphaned rows pointing at a user that no longer exists — and
    -- account deletion is a real requirement, not a hypothetical: DEPLOYMENT §16-O carries it as an
    -- open decision for door 2.
    "user_id"      text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,

    -- The canonical person ID (H00001, HD0901, X03821…). NOT a slug. See the block above.
    -- Deliberately NOT a foreign key: the genealogy lives in canonical.json and its per-person
    -- payloads, never in Postgres (§18.2 — the corpus stays static CDN files). A bookmark pointing
    -- at an id that has since been severed or merged resolves to nothing and is skipped at render,
    -- which is the correct behaviour and cheaper than keeping 20,992 people in two places.
    "person_id"    text NOT NULL,

    -- 1 or 2. Two lists, per Sam: enough structure to organise, not enough to become a taxonomy.
    -- A CHECK rather than an enum so adding a third list later is one ALTER rather than a type
    -- migration — not planned, but the cheaper door to leave open.
    "list"         smallint NOT NULL DEFAULT 1 CHECK ("list" IN (1, 2)),

    "created_at"   timestamptz NOT NULL DEFAULT now(),

    -- Recently-ACCESSED, for the hover menu's last five. Written ONLY when an already-bookmarked
    -- person is opened — never on ordinary navigation. The previous project's `customSession` wrote
    -- on every session resolution, which keeps a scale-to-zero database permanently awake and is a
    -- real share of a monthly bill. Null until first re-open; the menu falls back to created_at.
    "last_opened_at" timestamptz
);

-- ONE ROW PER PERSON PER USER. The ribbon cycles gold → blue → none, so moving a bookmark between
-- lists is an UPDATE of `list`, never a second row. Without this constraint a double-click race
-- could file the same ancestor into both lists at once — which is precisely the confusion Sam
-- raised about the cycle ("a user may be concerned the bookmark was added to two lists"). Here it
-- is impossible rather than merely unlikely.
CREATE UNIQUE INDEX IF NOT EXISTS "bookmark_user_person_uidx"
    ON "bookmark" ("user_id", "person_id");

-- The read path: every query is "this user's bookmarks, newest first". The whole set is fetched
-- once per session and cached client-side, so this index serves the hydration query and the
-- hover menu alike.
CREATE INDEX IF NOT EXISTS "bookmark_user_created_idx"
    ON "bookmark" ("user_id", "created_at" DESC);
