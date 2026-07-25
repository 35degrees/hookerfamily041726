# pipeline-gotchas.md -- the facts no model can infer and no doc should make you re-derive

Read this before your first data batch of the session. Everything here is a
mechanical property of `process_tasks.py`, `regenerate-data.js`, or the ID/enum
system -- arbitrary facts about *this* pipeline, not judgment. When one of these
would have bitten, it lives here so it can't.

Editorial judgment (blurb doctrine, NB voice, CC substance) is NOT here -- that's
`WORKFLOW.md`. Structural field law is the schema. This file is only the traps.

---

## What `process_tasks.py` can and cannot do

- **Append/set-only. It cannot delete a person, marriage, or career row.** The no-delete guard (`diff_guard`) aborts the *entire* batch and writes nothing if any pre-existing person/marriage/career vanishes without an authorized destroy op. There is no authorizing path through the script for these. **A rebuild that genuinely needs a person/marriage/career removed is a by-hand Code edit on a separate commit** -- say so explicitly; don't try to route it through the sheet.
- **`new_person` mints X-ids only** (`next_x_id`, recomputed live). Every **HD / H / I** id must be allocated by hand by Code. When building a blood descendant or a spouse, allocate the id by hand and send it back before linking.
- **`field_set` writes strings and cannot extend an array past its end.** Arrays that need a new element (`married_names`, `notable_category`, `sources`) are hand-edits. `sources`, `institution`, and `document` have **no op handler at all** -- hand-edit or flag.
- **`cc` skips if `related_id` is already present.** To fix an existing CC's label or link_text, don't use `cc` -- use `field_set` on the located index, e.g. `field_set cross_connections[0].display_label=...` / `cross_connections[0].link_text=...`. Locate the index by `related_id` first.
- **Counts and IDs are computed live, never trusted from any doc.** Take the max of the numeric portion of the id (`int(re.sub(r'\D','',id))`), not lexically -- IDs use mixed zero-padding (LM especially).

---

## Institution IDs -- the recurring mis-wire

Medical and law schools get wrongly wired to **INST022 (Yale *College*)**. Check
every `education` row's `institution_id` against this map:

| Institution | INST id |
|---|---|
| Yale College | INST022 |
| Yale Medical | INST122 |
| Yale Law | INST155 |
| Harvard | INST002 |
| Harvard Law | INST165 |
| Sheffield Scientific | INST0044  (four digits -- do NOT normalize to three) |

An INST entry exists only when 2+ tree people are affiliated; a single-person
school lives in `education[].school_name`, not a new INST.

---

## Render rules (discovered empirically -- the validator does not catch these)

- **Career rows need `start_year` or they do not render.** No start_year = an invisible row.
- **Education renders `notes`, not `class_year` / `degree`.** Put the degree in `notes` ("B.A., Class of 1848.").
- **Education `notes` must not repeat the school name** -- the INST field already supplies it. `notes="Yale College, 1848"` double-prints; use `notes="Class of 1848"`.
- **Right-column budget is ~3 rows.** education[] and career[] render as stacked one-line quick-hits in the narrow column; long text truncates with an ellipsis. Anything needing exposition is an NB, not an array note. No sentences/paragraphs in a `notes` field.
- **No raw ID strings in any user-facing field** (NB body, blurb, label).
- **No `+` signs in career rows.**

---

## Enum asymmetries (the two vocabularies are different)

`notable_category` and `narrative_blocks[].category` are separate controlled lists
and drift between them is the most common compliance defect.

**The authoritative lists live in `validate.py`** (`NB_CATEGORY` / `NOTABLE_CATEGORY`),
not in the schema — the code has been extended past schema §B.2 (it now also accepts
`music`/`sports` for NB category and `horse_racing`/`journalist`/`socialite`/`athletics`
for notable_category). When in doubt, the validator's set is truth; the schema list is
behind it. What you still can't infer are the asymmetries:

- **`medicine`** is valid for `notable_category` but **NOT** for NB category -> a medical NB uses category **`science`**.
- **`history`** is valid for `notable_category` but **NOT** for NB category -> a historical NB uses category **`legacy`**.
- **`career`** is an **NB category only** -- never a `notable_category`.
- Invalid in both (map, don't use): `academia`->`education`, `mathematics`->`science`, `art_history`->`arts`, `abolitionism`->`social_reform`, `historic_preservation`->`history` (notable) / `legacy` (NB).

Tags follow the approved vocabulary in `canonical_tags.txt` (extracted from schema §6):
`process_tasks.py` flags any `tag_add` outside it, and `validate.py` warns on non-canonical
tags already in canonical. To approve a new tag, add a line to `canonical_tags.txt` --
never invent one silently. `notable_category` values follow the same canonical-or-propose
rule against the schema §B.2 enum (which `validate.py` enforces).

---

## Source hierarchy (when sources disagree)

Peer-reviewed scholarship > **Edward Hooker 1909 (EH)** > vital records >
FindAGrave (with stone) > FamilySearch curated > FamilySearch/WikiTree user trees >
Ancestry user trees. EH wins descent claims over any user tree. Grokipedia is
machine-written -- use only load-bearing facts from it, **never build a CC on it**.
