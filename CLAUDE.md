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
- `docs/hooker_json_schema_v24.md` -- **THE structural law, and the current one.** v24 is the complete v23 body unaltered plus the v24 delta record appended at the end; where they differ, **v24 wins**. **A reference, not a preload** -- but the delta record (§v24-1 … §v24-9) is short and is where every rule Sam has had to repeat now lives. **Read §v24-1 (the render contract) before your first batch**: writing to the wrong key is how work becomes invisible -- stored, validating clean, and absent from the card. §v24-6 is the editorial law (NB ceiling and the ~250-word overflow point, concrete-not-riddle headers, the rebuild-don't-tack-on rule, no celebrity signposting).

The Woodward entry (X00804) is the NB quality bar -- re-read its blocks before
writing NBs.

**The data loop -- ONE COMMAND (072926). You (Code) run it; Sam types no git or shell commands:**

```bash
python3 batch.py tasks.csv           # a sheet batch
python3 batch.py --ids X03821        # after a HAND edit to canonical (surgical, one entry)
python3 batch.py tasks.csv --commit "message"     # commits only if the delta was clean
```

`batch.py` runs the whole contract in order and **stops itself** on any new error or silent loss
(nothing regenerated, nothing committed): revert point -> `process_tasks.py` -> baseline ->
**`validate.py --since`** (reports ONLY what THIS batch introduced, because the standing §C debt
makes a plain run print BLOCKED every time) -> regenerate (`--only` the touched ids, ~1s; forced
full for a new person) -> **`card.py`** verify -> review links. ~12s total.

Two things that do not change:
- **NB prose is still draft-for-approval** per the Second Law -- `nb_angle`/`nb_full` stage to
  `proposed`; only `nb_approved` writes prose. batch.py does not alter the two-pass rule.
- **Sam's rendered-pixel verdict outranks a clean run.** Bad card -> `git checkout canonical.json`
  (uncommitted) or `git revert` (committed); it never happened.

**Verify with `card.py <ID>`, never by reading canonical.** Canonical proves the data is STORED;
`card.py` prints the emitted payload's VISIBLE surface -- which keys actually render is a real trap
(`primary_name` not `name`, `landmark_blurb` never renders, a street address never renders). The
table lives in `docs/pipeline-gotchas.md`; read it instead of re-deriving it.

**NB quality (no script can enforce this -- this is why it lives here, not in the
validator):** lead with the specific human detail, never the Hooker connection
(it's the price of admission, not the story). **Null beats weak** -- a too-thin
angle returns `NEEDS_ANGLE`, never filler. You are action-eager; resist closing a
row with a bland-but-legal NB. The validator won't catch boring; Sam catches it on
the card, so flag rather than ship when in doubt. (Header/body length, mandatory
category, and enum membership are all validator-enforced -- see WORKFLOW.md §3 for
the full editorial rules; don't restate them from memory.)

**CC rule (simplified):** four things only -- reciprocal, `link_text`,
`display_label`, within the `validate.py` character cap (70).

**There is NO separator between the two (dash removed 072926), so `link_text` + label must be
ONE ENGLISH SENTENCE** -- schema §5: the label is the PREDICATE of a sentence whose subject is
the linked name, and it **begins lowercase with a verb**.

```
GOOD  "Aaron Burr Jr."          + "shot him at Weehawken in July 1804"
GOOD  "Col. Matthew Talcott"    + "was his uncle, and raised him from the age of four"
BAD   "Adrian Terry"            + ", adjutant-general of the assault he watched"   <- no verb
BAD   "John Butler Talcott"     + ", who founded New Britain's art museum"         <- no MAIN verb
BAD   "Solomon Cowles"          + "Five Hooker generations on the same ground."    <- noun phrase
```

A comma may open the label ONLY as an appositive that is then followed by a main verb
(`, his uncle, raised him from four`). A comma followed by nothing but an appositive or a
`who`/`whose` clause is a fragment. No capitalised opener, no terminal period. `card.py` flags
the capitalised and terminal-period cases; the fragment case is on you to read aloud.
(55 labels written 072926-073026 had to be rewritten for exactly this -- don't repeat it.) The `type` field is **ignored**: default it, never
deliberate, never ask Sam about it. A searchable person must never CC a
non-searchable one.

---

## Stream B -- UX / frontend coding  (the SvelteKit app)

**Triggered by:** transitions, the crossfade, spouse-swap, the parent/child
cascade, the deck/CC transition, components, Svelte, layout, animation,
`+page.svelte`, flip/send/receive, the children-row glide, scrollbar behavior.

**Read before acting. THE FILENAMES CARRY A DATE AND THAT DATE MOVES** -- each doc
is renamed to the day it was last edited, so never hard-code a date: `ls docs/`
and take the newest match. There is only ever ONE of each pattern, and the
newest IS the current one.
- `docs/ENRICHED_DESIGN_FABLE_*.md` -- the design: *what and why* (durable design decisions, the motion-physics doctrine, the deck/sibling/CC-blade/photo-loading doctrines).
- `docs/ENRICHED_CODING_ROADMAP_FABLE_*.md` -- the sequencing: *what's next*, the risk/phase order, AND the session record (what shipped, what went wrong, what is still open).
- Pattern files in `docs/examples/` (e.g. `REFERENCE_PhotoGrid_crossfade.svelte` -- take the keyed-list + send/receive/flip principle, not the photo-app specifics).

**That pair is the whole story -- do not go looking for the two docs they
replaced.** `docs/DESIGN.md` (the base design the ENRICHED design once overlaid)
and `docs/CODING_HANDOFF.md` (the session record) have NOT existed for some time;
the ENRICHED pair absorbed both roles and is what actually gets updated. Where an
ENRICHED section says it *overlays* or *extends* a base section, that base text is
gone and the ENRICHED section is complete on its own.

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
- Update the ENRICHED pair when Sam says so -- the DESIGN doc for durable doctrine (what and why, including what was tried and reverted), the ROADMAP for the session record (what shipped, in what order things went wrong, what is still open). Rename both to the current date and fix the references in this file.

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

**His FamilySearch pastes get clobbered, and the damage is invisible unless you look
for it (080126).** One block -- a name, a sex, a birth, a death -- will repeat five to
fifteen times through a long paste, having overwritten the content that belonged
there. What it destroys is almost always the thing immediately after an instruction
verb: "add spouse **[clobbered]**", "and they had two children **[clobbered]**".
The signature is the same name and date appearing over and over in a message that
should be naming different people. When you see it: build everything that survived,
and report the loss by **quoting the exact instruction that lost its payload** so Sam
can re-paste that one block instead of the whole thing.

**But do not use a clobbered paste as licence to stop.** Sam's verdict when I held a
whole generation back for this reason: *"you really choked on all that."* The line is
**infer STRUCTURE from arithmetic, never invent NAMES.** A mother who would be 46 and
52 at those births is a grandmother -- build the intervening couple if the paste named
them anywhere, even out of position. Only the genuinely absent (a given name, an
unstated parent) is a blocker, and a blocker is a one-line question at the end of
delivered work, not a reason to hold the work.

Repo layout:
```
CLAUDE.md                     <- this file (auto-read every session)
.gitignore                    <- excludes static/data/ (keeps pushes fast)
canonical.json                <- the genealogy DB (the SOURCE; edited directly, git-protected)
tasks.tsv / tasks.csv         <- the data task sheet (csv or tsv; auto-detected)
process_tasks.py              <- two-pass, append/set-only, direct-on-canonical task processor
validate.py                   <- schema v24 gate + git-HEAD silent-loss diff
regenerate-data.js            <- builds static/data/ from canonical.json (takes a filename arg)
docs/
  WORKFLOW.md                             <- data editorial contract
  pipeline-gotchas.md                     <- mechanical pipeline facts (read before first batch)
  hooker_json_schema_v24.md               <- THE structural law (read the v24 delta record)
  ENRICHED_DESIGN_FABLE_<date>.md         <- frontend design (what/why) -- TAKE THE NEWEST
  ENRICHED_CODING_ROADMAP_FABLE_<date>.md <- frontend sequencing + session record -- TAKE THE NEWEST
  HANDOFF_content_<date>.md               <- Stream A content session record -- TAKE THE NEWEST
  examples/                               <- frontend pattern references
static/data/                  <- GENERATED (gitignored); rebuilt by regenerate-data.js
```
