# WORKFLOW.md — How batches get processed on the Hooker Descendants tree

**This is the editorial contract.** It governs how Claude (in Claude Code or chat) and
Sam collaborate to add and revise entries. It sits *on top of* the schema, not instead
of it.

- **Schema v22** (`hooker_json_schema_v22.md`) = what is structurally **legal**. "Can this be saved?"
- **`validate.py`** = the executable enforcement of that schema. The hard gate.
- **WORKFLOW.md** (this file) = what is **good**, and the process that gets us there. "Should this be shipped?"

A change is not done until it passes **both** `validate.py` (structure) and the editorial
rules below (judgment). Schema-valid slop is still slop.

---

## 0. The golden rule that everything else serves

Every person in this tree connects to Thomas Hooker. **That connection is the price of
admission, never the story.** An NB whose point is "married into the line / became a
Hooker / connects to a Hooker descendant" is the single laziest thing that can be written
here, because it is true of all 14,000+ people and therefore says nothing.

The interesting fact is **always** the specific human thing — the ambulance driven in
France before America entered the war, the requiem written on Good Friday with "Still
here" added Monday, the reaper magnate talked into the world's-second-largest telescope.
Find that, or write nothing.

**Null beats weak.** A blank `narrative_blocks: []` is a correct, honorable state. A
filler NB is a defect. `validate.py` flags connection-filler as a warning; treat every
such flag as a thing to delete or replace, never to keep.

---

## 1. The task-sheet protocol (`tasks.tsv`)

All work enters through a tab-separated task sheet. Sam fills three columns while
researching; Claude fills two more on completion.

```
person_id   field   value_or_angle   |   status   slug
```

- **`person_id`** — e.g. `X00618`, `HD1607`. (No task-ID column; person_id + field identifies the row. Two NBs for one person are disambiguated by their angle text.)
- **`field`** — one of the recognized vocabulary below.
- **`value_or_angle`** — the URL / date / value, OR for an NB, the **angle** (Sam's locked specific detail).
- **`status`** — Claude writes: `✓ applied`, `✓ added as NB4`, `🚩 NEEDS_ANGLE`, `🚩 BLOCKED: <reason>`, or `→ answer: <text>` for questions.
- **`slug`** — Claude writes the localhost slug (`/person/<slug>`) for **every** completed row, so Sam clicks straight to the card to review. **Always output the slug. Always.**

### Recognized `field` vocabulary
`photo_url`, `birth_date`, `death_date`, `bio_blurb`, `notable_blurb`, `marriage`,
`parents`, `nb_angle`, `nb_full`, `tag_add`, `tag_remove`, `education`, `career`, `cc`,
`institution`, `landmark`, `document`, `video`, `question`, `searchable`, `notable`.

Unrecognized field → `🚩 BLOCKED: unknown field`, never a guess.

### The processing loop
1. Sam appends rows to `tasks.tsv` as he researches (fast, one line each).
2. Claude copies `canonical.json` → `canonical_draft.json` (the real canonical is never edited in place).
3. Claude processes **every row, in order**, against the draft.
4. Claude runs `python validate.py canonical_draft.json --baseline canonical.json`.
5. If validate passes (no new ERRORS): Claude runs `regenerate-data.js` against the draft so Sam can review live cards.
6. Claude returns `tasks.tsv` with `status` + `slug` filled on every row.
7. Sam reviews the flagged localhost cards. If good → promote draft to canonical (git commit). If not → re-flag the row; no re-explanation needed.

---

## 2. Mechanical fields — `process_tasks.py` handles these (no judgment)

These are deterministic. The script applies them and reports the slug:

| field | what it does |
|---|---|
| `photo_url` | set `bio.photo_url`. **Read it back applied, in-field, in the report.** A dropped photo URL must be impossible to hide. |
| `birth_date` / `death_date` | parse `YYYY-MM-DD` (or partial) into the date object; set `date_precision` accordingly. |
| `bio_blurb` / `notable_blurb` | set, after checking ≤8 words (reject if over). |
| `tag_add` / `tag_remove` | add/remove a tag — **only if canonical** (grep schema §6 / §2; if count ≤1 tree-wide, flag don't add). |
| `marriage` | wire `spouse=X year=Y order=N`, **bidirectionally**. |
| `parents` | set `{father_id, mother_id}` dict, **bidirectionally** (parent's marriage children_ids too). |
| `education` / `career` | append a structured record from `key=value` pairs. |
| `searchable` / `notable` | set classification / notable flags (notable requires URL + category — flag if missing). |
| `institution` / `landmark` / `video` / `document` | create/link top-level record, **bidirectionally**. |

**The append-only guard (non-negotiable):** when a field touches an array that already has
content (NBs especially), **append — never rebuild the array.** `process_tasks.py` must
diff the array before and after; if any pre-existing element vanished, it **halts and
flags** rather than writing. This is the guard that would have stopped the 6Y-806 Mary
Morse requiem overwrite. The `--baseline` diff in `validate.py` is the second net under it.

---

## 3. NB writing — Claude judgment, off the angle Sam provides

For `nb_angle`, Sam provides the **angle** (the specific detail that matters); Claude
turns it into a compliant NB. For `nb_full`, Sam wrote the whole thing; Claude only places
it. Sam owns the *what*; Claude owns the *shape*.

### The calibration target: X00804 (Samuel Bayard Woodward)
Every NB on that entry does **one vivid specific thing** with a hook header. That is the
bar. Before writing, re-read his blocks. If a draft NB is duller than his, it isn't done.

### NB rules (all enforced by `validate.py` except the judgment ones)
- **`category` is mandatory** and from the enum (`career, military, education, religion, family, character, politics, law, social_reform, death, legacy, marriage, crime, literature, science, business, arts`). One category per facet — don't repeat `family` three times; each NB covers a *distinct* dimension, Woodward-style. **A missing category is an ERROR, not an oversight.** (Note the asymmetry: a medical NB is `science` not `medicine`; a historical NB is `legacy` not `history` — those two only exist in `notable_category`.)
- **Header ≤8 words**, a hook that creates a question — never a summary, CV line, or the answer. The header *asks*; the body *tells*.
- **Body ≤3 sentences**, real substance a historian would prize. No raw ID strings. No fourth-wall language. Don't restate structured fields.
- **NB1 establishes who the person fundamentally was** (phone screens show only NB1–2).
- **Max 6 NBs** (5 for most; 6 ceiling). Order by relevance descending.
- **No connection-filler** (§0). If the only thing to say is the Hooker tie → write nothing and flag `🚩 NEEDS_ANGLE`.
- Dry, EH-register, historian's voice — **not** Disney/sentimental/tabloid. "Write for historians, not for a children's book" (schema §D.6).
- Anything longer than 3 sentences lives in `research_notes` (no length cap), not the NB.

If the angle Sam gave is too thin to clear this bar, return `🚩 NEEDS_ANGLE` rather than
padding. Filler to fill a slot is the failure this whole document exists to prevent.

---

## 4. Cross-connections — simplified (per Sam, 2026-06)

A CC needs exactly **four** things. Nothing else matters:
1. **Reciprocal** — exists on both entries.
2. **`link_text`** — the connected person's name (the grammatical subject).
3. **`display_label`** — the predicate fragment completing "[this person] ___", lowercase verb start.
4. **≤70 characters** on the display_label.

**The `type` field is IGNORED.** Do not deliberate over `parallel_careers` vs
`professional_peer` vs `naming_pattern`. Fill a generic default and move on. Never ask Sam
about CC type — it is wasted motion. (The field still exists in the JSON; we just don't
curate it.)

**Hard rule:** a **searchable** person must never carry a CC to a **non-searchable**
person (it would surface a hidden person on a visible card). Two non-searchable people may
CC each other freely. `validate.py` enforces this as an ERROR.

CCs are **rare** and require documented major overlap — a real institutional/career/place
parallel found by searching the tree, not mere family proximity. Excluded relations (never
a CC): parent, child, spouse, sibling. When a candidate turns out to be a coincidence
(wrong Minor line, wrong Dana, wrong Burr), **rule it out in `research_notes`** so the next
session doesn't re-investigate. Do not CC anyone to Theodore Roosevelt (over-connected).

---

## 5. Jalapeño Rule — who is even allowed in

- **H / HD** = Hooker blood descendants (Thomas line / both lines). Always allowed.
- **I-prefix** = direct spouses of descendants. Allowed.
- **X-prefix `is_easter_egg`** = notable **parents** of a descendant's spouse (one generation up), or documented orbit figures. Each gets a `family_orbit` CC to the descendant they connect through.
- **Grandparent of a spouse** = Sam-approved **per-entry exception only**, for figures of large historical heft (Paul Revere precedent). Never added on Claude's initiative.
- **Great-grandparent and beyond** = never, regardless of fame.
- A Hooker blood descendant is **never** `is_easter_egg`.

When unsure whether someone qualifies → flag and ask, don't add speculatively.

---

## 6. Standing rules that have cost real time when broken

- **Carve marble.** Refine, never delete/overwrite without explicit instruction. Append-only on all arrays.
- **No fabrication.** If a source doesn't state it, don't infer it. "Only surviving child," a cause of death, a tag — if it isn't in the source, flag the uncertainty; never assert it.
- **Watch for tree-on-tree / name collisions.** Two Charles Osgoods, two Minor families, two Burr lines. A shared surname is not a connection. Verify lineage before linking; rule out coincidences in `research_notes`.
- **Touch only what was asked.** If the task says "Abigail only," do not also reorder Bunker Gay. Scope is exactly the rows in the sheet.
- **`died_young` ≤15. `extraordinary_longevity` ≥91.** No exceptions.
- **ID allocation** (schema §D.1): recompute the true max from the live file before *and after each append* in a multi-entry batch; never trust a scratch ids file; run a duplicate-ID scan after.
- **Run `validate.py` before presenting, every time.** A clean checkpoint is born clean.

---

## 7. The §C debt drawdown (optional, Sam-directed)

`validate.py` quantifies the standing debt every run (NB-category drift/missing, CC labels
over 70, one-directional CCs, blurbs over 8 words, connection-filler). These are **not**
mass-fixed — Sam draws them down deliberately, in scoped batches, the same way new content
goes through `tasks.tsv`. The tally exists so the debt is *visible and shrinking*, not so
it gets bulk-rewritten without review.

---

*This contract is the standing agreement for how batches are handled. When in doubt, the
hierarchy is: schema (legal) → validate.py (enforced) → WORKFLOW.md (good) → Sam (final).*

---

## 8. Content remediation — the mop-up workflow

A large tree built fast carries a long tail of field errors: blurbs that read as
sentences, null genders (card shows "Spouse of" not Wife/Husband), missing
generation numbers (the "Nth Generation Descendant" line goes blank), mashed
career strings, NBs that reach for flourish. Remediation is its own loop, run in
whatever rhythm suits Sam — bounce off UX for an hour of cleanup, bounce back. Not
a priority, not sequential, always available.

### Capturing fixes on the fly
When Sam lands on a broken card mid-navigation, he drops a row in `tasks.tsv` and
keeps moving (so he never loses his path). A row is either:
- **Decided:** `X03417  blurb_replace  field=bio_blurb text="Gardener, ceramicist"`
- **Deferred:** `X03417  bio_blurb  follow schema`  → Code/Claude drafts per the doctrine, lands in `proposed` for approval.

Every processed row returns its **slug** — so the returned sheet IS the review map:
Sam clicks down the list of touched cards in the UX. Without the slugs, navigating
back to each fixed person is impossible; with them, review is one pass.

### Remediation field vocabulary (all in process_tasks.py)
- `field_set` — generic any-field setter, dotted/bracket path: `field_set  classification.generation_from_thomas=11` or `career[2].role=Garden volunteer`. The escape hatch: **no field is unreachable.**
- `gender` — `male|female` (drives the Wife/Husband/Spouse label).
- `generation` — sets `classification.generation_from_thomas` (the Nth-generation line).
- `blurb_replace` — `field=bio_blurb|notable_blurb text="..."` (corrected label).
- `blurb_remove` — explicit null of a blurb (authorized deletion).
- `career_set` / `education_set` — `index=N key="..."` replace one array record in place.
- `nb_replace` — `old="<exact header>" new="<corrected>"` (drafts for approval; the old header's removal is authorized).

### Hunting (remediate.py) — worklists, worst-first
`python remediate.py canonical.json --blurbs` → ranked `blurb_worklist.tsv` of likely-bad blurbs.
`--nbs` → flagged NBs (filler, long headers, missing category).
`--gender` → null-gender people with proposed male/female (name inference is a STUB — under-matches; improve with a real names dataset before trusting the bulk).
Sam marks each row **fix / null / keep** (+ a `correction` when fix), then
`python remediate.py --to-tasks blurb_worklist.tsv > tasks.tsv` converts marks to a batch.

### THE BLURB DOCTRINE (what a valid blurb is — written law)
A blurb (`bio_blurb` AND `notable_blurb` — same rules) is a **LABEL, not a sentence.**
It's the one-glance "what was this person" — an index line, not a teaser.

- **Noun phrase(s) naming role(s)**, comma/semicolon separated. "Portfolio manager; documentary artist." "Ceramicist, photographer; garden volunteer." "Farmer." "Mayor of Tiburon."
- **States what they WERE/DID** — may hold a couple of roles; people are plural.
- **NO specifics** — those are the NB's job. "Documentary artist," not "Documentary artist of the Tuskegee Airmen."
- **NO repetition of structured fields** — location, parentage, spouse are already on the card/graph. "San Franciscan who married Minerva Hooker" is pure redundancy → null. Location earns a spot only when it IS the role ("Mayor of Tiburon").
- **NO repetition of NB content** — the blurb sits ABOVE the NBs. "Tiburon artist who scanned halved flowers" is an NB header in disguise → wrong.
- **No relative clauses, no action verbs.** If it reads as a sentence ("who married," "wrote," "settled"), it's wrong. Strip to nouns: if what's left is a role, good; if you need the verb to mean anything, it's a bad NB header wearing a blurb's clothes.
- **Sentence case**, proper nouns only — not Title Case Every Word.
- **≤8 words. Null beats weak.** No documented role → no blurb. "Bon vivant" is character/flourish → belongs in an NB, never a blurb.

The test: strip the blurb to its nouns. Is what's left a role (or set of roles)?
If yes, keep. If you had to keep a verb or clause to make it mean anything, kill it.

---

## 9. The Google Sheets research surface (the daily editing tool)

Editing tab/comma-separated text by hand is miserable. The task sheet is EDITED in
**Google Sheets** (a real spreadsheet — wide cells, comfortable for all-day
research), and only EXPORTED to a file for processing.

**Columns** (Sam fills the first three; Code fills status/slug/proposed):
`person_id | field | value_or_angle | status | slug | proposed | decision`

**The daily loop:**
1. Research all day in a Google Sheet. Append rows as found. Run nothing.
2. End of session: **File → Download → Comma-separated values (.csv)** (preferred —
   long text and commas in a cell survive) OR Tab-separated (.tsv). Drop it in the
   repo root as `tasks.csv` (or `tasks.tsv`).
3. Hand it to Code: it processes, fills status/slug/proposed, writes the file back.
4. Re-open / re-import the returned file in Sheets to review, OR just click the
   `slug` links to eyeball each card in the UX.
5. Next day: fresh sheet (or clear rows), repeat.

`process_tasks.py` auto-detects: `.csv` → comma delimiter, anything else → tab. CSV
is preferred because quoted cells preserve commas AND newlines — so a cell can hold
a longer phrase without breaking columns.

**Hard limit on cell contents:** structured values (dates, blurbs, `name="..."
gender=...`) belong in cells. A *full page of raw prose* does NOT — even CSV gets
unwieldy. Long raw text → the distillation channel below.

---

## 10. Creating new people (`new_person`) — the two-step

Creating an entry needs its allocated id before you can link it, so it's TWO batches:

**Batch 1 — create.** One `new_person` row per person. `person_id` column is
ignored (id is allocated). value:
`name="Full Name" gender=male|female searchable=false notable=false [last=... maiden=... easter_egg=false]`
New orbit/parent entries default `searchable=false, notable=false, easter_egg=false`.
Code returns the allocated id (e.g. `X03426`) in the `proposed` column.

**Batch 2 — link + enrich.** Using the returned ids: `parents father=ID mother=ID`
on the child, plus `birth_date` / `death_date` / `bio_blurb` / `photo_url` rows on
the new people. Parent-linking wires bidirectionally.

**After creating:** run `validate.py` on a new entry to confirm the skeleton passes
schema. If a marriage/parent placeholder (`father_research_notes`) is now redundant,
clear it explicitly: `field_set parents.father_research_notes=null`.

A new entry is a MINIMAL skeleton — enrich it with normal task rows; don't expect
every array to pre-exist.

---

## 11. Raw-text distillation (paste to Code in chat, NOT the sheet)

The highest-value content workflow: hand Code a wall of raw text (a paragraph, a
page, a search-result dump with citations) and have it DISTILL — never use verbatim.

**How:** paste the text to Code in chat with a one-line target:
> "Distill bio_blurb + NBs + any valid CC/education/career for <ID> from this text.
>  Don't use it verbatim — follow the WORKFLOW blurb doctrine and NB rules. Strip
>  citation markers and biographical padding. Land everything in tasks.csv as
>  `proposed` for my approval. [paste text]"

**Rules Code follows when distilling:**
- Extract ROLES for the blurb (noun phrases), the specific human moments for NBs (one per facet), real institutional/career parallels for CCs — per the doctrine in §0–§4.
- Citations/URLs are SOURCES TO VERIFY, never content to quote. Strip `[[1]]` markers, "his connection to the year X" padding, and any scaffolding.
- NB prose lands as `proposed` / `nb_angle` for Sam's approval — never auto-written (two-pass rule).
- Flag uncertainty; don't fabricate to fill a slot. Null beats weak.
