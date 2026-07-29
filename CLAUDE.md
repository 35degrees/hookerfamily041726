# CLAUDE.md -- read this first, every session

This repo has **two parallel work streams**. Sam switches between them freely --
often two hours on one, then two hours on the other -- and does **not** announce
the switch. Infer the stream from the request and load the right docs before acting.

Keep this file light. It holds the two laws, the stream router, the pipeline
gotchas pointer, and the earned lessons no script can catch. Structural law lives
in the schema; editorial law lives in WORKFLOW.md; mechanical pipeline facts live
in `docs/pipeline-gotchas.md`. Read those **when the task calls for them**, not
preemptively.

---

## THE ONE LAW THAT OVERRIDES EVERYTHING: never delete without an explicit, named destroy instruction

Applies to **both** streams. The single most damaging thing that can happen to
this project is silent loss -- a good NB, a photo URL, a working transition --
destroyed because an ambiguous instruction was read as "replace" instead of "add."

**Ambiguity always resolves to PRESERVE.** Concretely:

- "Take a pass at this entry's NBs" / "improve these" / "redo this" -> **ADD to / refine in place. NEVER rebuild the array.** Three existing NBs + a new angle = four NBs, not one.
- The ONLY way to remove anything is an **explicit destroy instruction naming the exact target**: `nb_remove "<exact header>"`, `cc_remove <id>`, `tag_remove <tag>`, `blurb_remove`, or Sam saying in plain words "delete the X NB." No exact target named -> no deletion, ever.
- Enforced mechanically: `process_tasks.py` is append/set-only and ABORTS the batch (writes nothing) if any pre-existing element vanished without an authorized removal. `validate.py --baseline` is the second net.
- In the frontend stream too: don't delete a working component, handler, or CSS rule to "clean up" unless Sam asked for that specific removal. Refine in place.

If ever unsure whether to remove something: **leave it and ask.**

## THE SECOND LAW: NB prose is draft-for-approval

`nb_angle` / `nb_full` rows do **not** write to canonical. They stage drafted NB
text into the sheet's `proposed` column for Sam's approval; the text lands in
canonical only after Sam marks APPROVE. Everything else (dates, blurbs, tags,
marriage, parents, cc, education, career, media) auto-applies append/set-only.

---

## Stream A -- JSON enrichment / data  (the canonical genealogy database)

**Triggered by:** people, entries, NBs, narrative blocks, photos, birth/death
dates, bio blurbs, tags, cross-connections, institutions, landmarks, the schema,
`tasks.tsv`, the section-C debt drawdown, "add this person," "enrich X."

**Read before acting:**
- `docs/WORKFLOW.md` -- the editorial contract (what is *good*, the blurb/NB/CC doctrine, the task-sheet protocol). This is the day-to-day law for content.
- `docs/pipeline-gotchas.md` -- the mechanical facts that no model can infer and no doc should make you re-derive (what `process_tasks.py` can and can't do, the INST-ID map, the render rules, the enum asymmetries). **Read it before your first batch of the session.**
- `docs/hooker_json_schema_v23.md` -- the structural law. **A reference, not a preload.** Open it when you need the exact rule for a field you're unsure about; do not read it end-to-end every session.

The Woodward entry (X00804) is the NB quality bar -- re-read its blocks before
writing NBs.

**The data loop -- you (Code) run every step; Sam types no git or shell commands:**
1. **`git add -A && git commit -m "pre-batch <desc>"`** -- the revert point. Local, instant. Do this BEFORE editing.
2. Edit **`canonical.json` directly** -- there is no draft file. `process_tasks.py` v2 loads canonical.json, applies changes in place, and writes back to the same path (and writes status/slug back into the task sheet). Batches enter via the sheet: `python process_tasks.py tasks.tsv` (`.csv` -> comma-delimited, anything else -> tab; auto-detected).
3. **Two passes:** mechanical fields auto-apply append/set-only. NB prose is draft-for-approval per the Second Law -- draft to the sheet's `proposed` column, APPEND to canonical only after Sam marks APPROVE.
4. **`git show HEAD:canonical.json > /tmp/baseline.json`** then **`python validate.py canonical.json --baseline /tmp/baseline.json`**. ERRORS or unauthorized loss -> STOP, report, `git revert`. Do not proceed.
5. **`node regenerate-data.js canonical.json`** -- run **on Sam's command** (he wants this offloaded). Prompt when a batch is validated and ready: "Clean -- want me to regenerate so you can see it on the cards?"
6. Sam reviews the live cards. Good -> keep the commit. Bad -> **`git revert`**, it never happened.

**NB quality (no script can enforce this -- this is why it lives here, not in the
validator):** lead with the specific human detail, never the Hooker connection
(it's the price of admission, not the story). **Null beats weak** -- a too-thin
angle returns `NEEDS_ANGLE`, never filler. You are action-eager; resist closing a
row with a bland-but-legal NB. The validator won't catch boring; Sam catches it on
the card, so flag rather than ship when in doubt. (Header/body length, mandatory
category, and enum membership are all validator-enforced -- see WORKFLOW.md §3 for
the full editorial rules; don't restate them from memory.)

**CC rule (simplified):** four things only -- reciprocal, `link_text`,
`display_label` (lowercase-verb predicate completing "[linked name] ___"), within
the `validate.py` character cap. The `type` field is **ignored**: default it, never
deliberate, never ask Sam about it. A searchable person must never CC a
non-searchable one.

---

## Stream B -- UX / frontend coding  (the SvelteKit app)

**Triggered by:** transitions, the crossfade, spouse-swap, the parent/child
cascade, the deck/CC transition, components, Svelte, layout, animation,
`+page.svelte`, flip/send/receive, the children-row glide, scrollbar behavior.

**Read before acting (these are the CURRENT docs -- July 24 Fable pass):**
- `docs/ENRICHED_DESIGN_FABLE_072926.md` -- the design: *what and why* (durable design decisions, the motion-physics doctrine, the deck/sibling/photo-loading doctrines).
- `docs/ENRICHED_CODING_ROADMAP_FABLE_072926.md` -- the sequencing: *what's next* and the risk/phase order.
- `docs/CODING_HANDOFF.md` -- the repo-side session record (as-shipped models, ghost taxonomy, probe gate). The ENRICHED roadmap treats this as the live session log.
- `docs/DESIGN.md` (070126) -- the base design the ENRICHED design *overlays*; consult when the ENRICHED doc names a base section it extends.
- Pattern files in `docs/examples/` (e.g. `REFERENCE_PhotoGrid_crossfade.svelte` -- take the keyed-list + send/receive/flip principle, not the photo-app specifics).

**Architecture first -- map the grain before you cut it (learned the hard way,
072326 photo-loading):** a symptom lives in a component; the fix almost always
lives in the UNIT the architecture already works in. Before any non-trivial change:
- **Read the data model + flow FIRST** -- the relevant `types/`, what `regenerate-data.js` emits, what the page loads, and *where the state comes from and when it's known* -- not just the component showing the symptom. (The miss: three turns tuning `<img>` knobs without reading `types/neighborhood.ts`; the load unit was the NEIGHBORHOOD, a whole set in one payload, the entire time.)
- **Name the natural unit** (the neighborhood, the camera move, the payload, the flight capture) and fix THERE, not in a local knob.
- **Extend the existing pattern, don't invent a parallel one.** If a store/batch/preload/capture already does this shape of work, use it.
- **Breadth before depth:** for anything spanning >1 component or an unmapped subsystem, do an Explore/Plan read pass first -- and STATE the model you inferred to Sam before writing code, so a wrong mental model dies in one sentence instead of three turns of tuning.
- **Tripwire:** turning the SAME dial a 2nd or 3rd time without solving it = STOP and re-map the architecture. The repetition is the tell that the model is wrong, not the value.

**Rules:**
- **`canonical.json` is FROZEN / read-only in this stream.** UX work edits components, transitions, styles -- never genealogy data.
- `npx svelte-check --tsconfig ./tsconfig.json` before declaring done; report errors/warnings honestly (note pre-existing ones).
- Verify SSR (page returns 200, not hanging) before saying it works.
- Nothing committed without Sam's say-so. End by telling Sam exactly what to watch at `localhost:5173`.
- Update `docs/CODING_HANDOFF.md` when Sam says so.

---

## git -- you (Code) handle ALL of it; Sam types none

- **Commit LOCALLY before every data batch** (`git add -A && git commit`). Instant even with the big JSON; creates the revert points that make every batch safe. Do it automatically; don't ask.
- **Pushing to GitHub is separate and occasional.** Push at natural breakpoints -- end of session, end of day, or when Sam says "push" -- NOT every batch. (Offer at session end: "Want me to push today's work to GitHub?")
- **The repo stays fast to push because `static/data/` is gitignored** -- those generated payloads rebuild from canonical.json, so they're never versioned. git tracks the SOURCE (canonical.json, src/, scripts, docs), not the build output.
- A bad batch: `git revert` (or reset to the pre-batch commit). Never edit your way out of a destructive mistake -- revert to the clean commit and redo.

---

## Switching streams -- leave a clean state

The streams couple through the pipeline: enrichment writes canonical.json; the
frontend renders data derived from it via `regenerate-data.js`.

- **Leaving data:** end on a committed canonical.json. If you edited data and Sam's about to do UX, make sure a regenerate has run (or tell him one is pending) so the cards reflect the new data.
- **Entering UX:** assume canonical.json is frozen and current. Stale-looking cards -> the fix is a regenerate, not a data edit.

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
tasks.tsv / tasks.csv         <- the data task sheet (csv or tsv; auto-detected)
process_tasks.py              <- two-pass, append/set-only, direct-on-canonical task processor
validate.py                   <- schema v23 gate + git-HEAD silent-loss diff
regenerate-data.js            <- builds static/data/ from canonical.json (takes a filename arg)
docs/
  WORKFLOW.md                             <- data editorial contract
  pipeline-gotchas.md                     <- mechanical pipeline facts (read before first batch)
  hooker_json_schema_v23.md               <- structural law (reference, not a preload)
  DESIGN.md                               <- frontend base design (070126)
  ENRICHED_DESIGN_FABLE_072926.md         <- current frontend design (what/why)
  ENRICHED_CODING_ROADMAP_FABLE_072926.md <- current frontend sequencing (what's next)
  CODING_HANDOFF.md                       <- frontend session record
  examples/                               <- frontend pattern references
static/data/                  <- GENERATED (gitignored); rebuilt by regenerate-data.js
```
