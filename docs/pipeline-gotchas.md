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

- **Career rows render WITHOUT years.** (Corrected 072726 -- the earlier claim that a year-less row is
  invisible was wrong and was propagating from here into `process_tasks.py`'s warning text.) `RightColumn`
  sorts by `end_year ?? start_year ?? -Infinity` and slices to 3; it never *filters* on years. `careerLine()`
  always prints `role, organization`; `careerDates()` returns null when both years are absent, which omits
  only the date suffix. The one real effect: a year-less row sorts last, so it can be pushed out of the top 3
  when a person already has more than three career rows. Verified against live cards, not inferred.
- **Education renders `notes`, not `class_year` / `degree`.** Put the degree in `notes` ("B.A., Class of 1848.").
- **Education `notes` must not repeat the school name** -- the INST field already supplies it. `notes="Yale College, 1848"` double-prints; use `notes="Class of 1848"`.
- **Right-column budget is ~3 rows.** education[] and career[] render as stacked one-line quick-hits in the narrow column; long text truncates with an ellipsis. Anything needing exposition is an NB, not an array note. No sentences/paragraphs in a `notes` field.
- **No raw ID strings in any user-facing field** (NB body, blurb, label).
- **No `+` signs in career rows.**

### Which KEY the card reads (072926 -- cost a full discovery pass; don't re-derive it)

`regenerate-data.js` resolvers read specific keys, and the schema doc is behind the code in
places. **Don't verify a batch by reading canonical -- that proves the data is STORED, not
SEEN. Run `python3 card.py <ID>`,** which prints the emitted payload's visible surface.

| you write | the card actually reads | trap |
|---|---|---|
| LM/ART/DOC `name` | **`primary_name`** | a record with only `name` renders a BLANK row (LM058 does today) |
| LM `city` / `state` | **`location.{city,state}`** nested (flat tolerated) | the subtitle is "City, ST" -- **the street address NEVER renders** |
| LM `primary_url` / `url` | `primary_url ?? url` | either works |
| LM `photo_url` / `image_url` | `photo_url ?? image_url` | either works |
| person-side `landmark_blurb` | **nothing** -- `resolveLandmarks` hard-codes `blurb: null` | write it for the record, never for the card |
| `bio_blurb` | `notable_blurb ?? bio_blurb` | on a notable, bio_blurb is invisible |
| `person.cross_connections` | the payload's **top-level `crossConnections`** (resolved + hidden-filtered) | the raw array is not the render path |
| CC `display_label` | printed straight after `link_text`, **no dash** (`ccTail()` in FeaturedCard) | must begin lowercase with a VERB so name+label is one sentence; a bare appositive or `who`-clause after a comma is a fragment (55 were rewritten 073026); a capitalised label reads as a run-on |
| CC `link_text` | the clickable subject | empty = a row with no name and nothing to click; 271 were repaired 072926, 14 remain because `related_id` is null |
| `sources` | **nothing** -- no component reads it | it is the interior source field in practice; the sources UI is unbuilt (roadmap §11) |
| `research_notes` | **nothing** -- stripped from every payload at emit | safe for anything |
| institution `hooker_connected_people` / cemetery `hooker_connections` | **nothing** -- `/institution/[slug]` is a one-line placeholder | rosters are research surface, not card surface |

**Slugs are emitted, not derivable.** Two things a hand-rolled slug cannot know: a presumed-living
non-notable **loses the birth year** (178 people, 150 slugs), and the 2nd..Nth person on a base slug
takes a `-2`/`-3` suffix (123 today). `process_tasks.py` now reads the real slug out of
`static/data/search-index.json`; a leading **`~`** means "approximated, not yet emitted" -- regenerate
and re-read before trusting the link.

---

## The fast loop (072926) -- one command, ~12s, instead of six calls

```bash
python3 batch.py tasks.csv                    # sheet: commit -> process -> validate delta -> regen -> verify
python3 batch.py --ids X03821,HD8480          # same checks after a HAND edit to canonical
python3 batch.py tasks.csv --commit "message" # commit only if the delta was clean
python3 card.py X03821                        # what the card SHOWS (read-only, any time)
```

Nothing in the pipeline is slow -- measured: parse 0.4s, validate 0.9s, process 1.6s, full
regenerate 8.3s. **The cost was always re-derivation, not compute.** Two flags carry most of it:

- **`validate.py --since <baseline>`** reports ONLY what this batch introduced. A plain run prints
  `BLOCKED` every time because the standing §C debt is ~1,300 errors by design, so the question that
  matters -- *did I break anything?* -- had to be grepped out by eye. `--since` answers it and exits
  on the DELTA. (Red-proven: injected an over-long NB header and a dropped NB; both fired, exit 1.)
  The full report is still `validate.py canonical.json`.
- **`regenerate-data.js --only ID1,ID2`** rebuilds just those page payloads and skips every
  aggregate: **0.9s vs 8.3s**. It was already there and undocumented. Aggregates go stale, so run a
  FULL rebuild before pushing, and always for a NEW person (they must reach search-index).
  `batch.py` forces full automatically when a touched id is missing from the index.

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
