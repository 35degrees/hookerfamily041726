# CLAUDE.md -- read this first, every session

This repo has **two parallel work streams**. Sam switches between them freely --
often two hours on one, then two hours on the other -- and does **not** announce
the switch. Infer the stream from the request and load the right docs before acting.

---

## THE ONE LAW THAT OVERRIDES EVERYTHING: never delete without an explicit, named destroy instruction

Applies to **both** streams. The single most damaging thing that can happen to
this project is silent loss -- a good NB, a photo URL, a working transition --
destroyed because an ambiguous instruction was read as "replace" instead of "add."

**Ambiguity always resolves to PRESERVE.** Concretely:

- "Take a pass at this entry's NBs" / "improve these" / "redo this" -> **ADD to / refine in place. NEVER rebuild the array.** Three existing NBs + a new angle = four NBs, not one. (This exact mistake happened once -- three good NBs replaced by one. It is now structurally impossible.)
- The ONLY way to remove anything is an **explicit destroy instruction naming the exact target**: `nb_remove "<exact header>"`, `cc_remove <id>`, `tag_remove <tag>`, or Sam saying in plain words "delete the X NB." No exact target named -> no deletion, ever.
- Enforced mechanically: `process_tasks.py` is append/set-only and ABORTS the batch (writes nothing) if any pre-existing element vanished without an authorized removal. `validate.py --baseline` is the second net. Editing JSON by hand? Same law: read the array, append, never overwrite.
- In the frontend stream too: don't delete a working component, handler, or CSS rule to "clean up" unless Sam asked for that specific removal. Refine in place.

If ever unsure whether to remove something: **leave it and ask.**

---

## Stream A -- JSON enrichment / data  (the canonical genealogy database)

**Triggered by:** people, entries, NBs, narrative blocks, photos, birth/death
dates, bio blurbs, tags, cross-connections, institutions, landmarks, the schema,
`tasks.tsv`, the section-C debt drawdown, "add this person," "enrich X."

**Read before acting:** `docs/WORKFLOW.md` (editorial contract) and
`docs/hooker_json_schema_v22.md` (structural law). The Woodward entry (X00804) is
the NB quality bar.

**The data loop -- you (Code) run every step; Sam types no git or shell commands:**
1. **`git add -A && git commit -m "pre-batch <desc>"`** -- the revert point. Local, instant. Do this BEFORE editing.
2. Edit **`canonical.json` directly** (there is no draft file). Batches enter via `tasks.tsv`: run `python process_tasks.py tasks.tsv`.
3. **Two passes:** mechanical fields (photo_url, dates, blurbs, tags, marriage, parents, cc, education, career, searchable, notable) auto-apply, append/set-only. NB writing (`nb_angle`/`nb_full`) is **draft-for-approval** -- draft from Sam's angle per WORKFLOW sec3, land it in the sheet's `proposed` column, APPEND only after Sam marks APPROVE. NB prose stays behind Sam's eyes.
4. **`git show HEAD:canonical.json > /tmp/baseline.json`** then **`python validate.py canonical.json --baseline /tmp/baseline.json`**. ERRORS or unauthorized loss -> STOP, report, `git revert`. Do not proceed.
5. **`node regenerate-data.js canonical.json`** -- run it **on Sam's command** (he wants this offloaded). Prompt him when a batch is validated and ready: "Clean -- want me to regenerate so you can see it on the cards?"
6. Sam reviews the live cards. Good -> keep the commit. Bad -> **`git revert`**, it never happened.

**NB quality (no script can enforce this):** lead with the specific human detail,
never the Hooker connection (it's the price of admission, not the story). Header
<=8 words, a hook not a summary. Body <=3 sentences. Category mandatory,
one-per-facet. **Null beats weak** -- too-thin angle returns `NEEDS_ANGLE`, never
filler. You are action-eager; resist closing a row with a bland-but-legal NB. The
validator won't catch boring; Sam catches it on the card, so flag rather than ship
when in doubt.

**CC rule (simplified):** four things only -- reciprocal, link_text,
display_label, <=70 chars. The `type` field is **ignored**: default it, never
deliberate, never ask Sam about it. A searchable person must never CC a
non-searchable one.

---

## Stream B -- UX / frontend coding  (the SvelteKit app)

**Triggered by:** transitions, the crossfade, spouse-swap, the parent/child
cascade, components, Svelte, layout, animation, `+page.svelte`,
flip/send/receive, the children-row glide, scrollbar behavior.

**Read before acting:** `docs/DESIGN_061726.md` (the form/model map),
`docs/CODING_HANDOFF.md` (the itinerary -- what's next), and the pattern files in
`docs/examples/` (e.g. `REFERENCE_PhotoGrid_crossfade.svelte` -- take the
keyed-list + send/receive/flip principle, not the photo-app specifics).

**Rules:**
- **`canonical.json` is FROZEN / read-only in this stream.** UX work edits
  components, transitions, styles -- never genealogy data.
- `npx svelte-check --tsconfig ./tsconfig.json` before declaring done; report
  errors/warnings honestly (note pre-existing ones).
- Verify SSR (page returns 200, not hanging) before saying it works.
- Nothing committed without Sam's say-so. End by telling Sam exactly what to watch
  at `localhost:5173`.
- Update `docs/CODING_HANDOFF.md` when Sam says so.

---

## git -- you (Code) handle ALL of it; Sam types none

Sam wants git to be part of the Code process, never a manual chore. So:

- **Commit LOCALLY before every data batch** (`git add -A && git commit`). This is
  instant -- sub-second even with the big JSON -- and creates the revert points
  that make every batch safe. Do it automatically; don't ask.
- **Pushing to GitHub is separate and occasional.** Push at natural breakpoints --
  end of a session, end of the day, or when Sam says "push" -- NOT every batch.
  Local commits are the safety net; the push is the off-site backup, on Sam's
  rhythm. (Offer at session end: "Want me to push today's work to GitHub?")
- **The repo stays fast to push because `static/data/` is gitignored** -- those
  14,792 generated payloads rebuild from canonical.json, so they're never
  versioned. git tracks the SOURCE (canonical.json, src/, scripts, docs), not the
  build output. Don't commit generated artifacts.
- A bad batch: `git revert` (or reset to the pre-batch commit). Never edit your way
  out of a destructive mistake -- revert to the clean commit and redo.

---

## Switching streams -- leave a clean state

The streams couple through the pipeline: enrichment writes canonical.json; the
frontend renders data derived from it via `regenerate-data.js`. On a gear-switch:

- **Leaving data:** end on a committed canonical.json. If you edited data and Sam's
  about to do UX, make sure a regenerate has run (or tell him one is pending) so the
  cards reflect the new data.
- **Entering UX:** assume canonical.json is frozen and current. Stale-looking cards
  -> the fix is a regenerate, not a data edit.

---

## How to talk to Sam

Sam talks fast, often terse, often multi-part. Parse intent; don't demand precise
phrasing. But terseness is exactly when the no-delete law matters most -- a fast
"redo these NBs" means *add/refine*, never *destroy*. When a request is genuinely
ambiguous about scope or removal, do the preserving thing and ask.

Repo layout:
```
CLAUDE.md                     <- this file (auto-read every session)
.gitignore                    <- excludes static/data/ (keeps pushes fast)
canonical.json                <- the genealogy DB (the SOURCE; edited directly, git-protected)
tasks.tsv                     <- the data task sheet
process_tasks.py              <- two-pass, append-only task processor
validate.py                   <- schema v22 gate + git-HEAD silent-loss diff
regenerate-data.js            <- builds static/data/ from canonical.json (takes a filename arg)
docs/
  WORKFLOW.md                 <- data editorial contract
  hooker_json_schema_v22.md   <- structural law
  DESIGN_061726.md            <- frontend form/model map
  CODING_HANDOFF.md           <- frontend itinerary (what's next)
  examples/                   <- frontend pattern references
static/data/                  <- GENERATED (gitignored); rebuilt by regenerate-data.js
```
