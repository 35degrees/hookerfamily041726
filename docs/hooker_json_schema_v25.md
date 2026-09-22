# Hooker Descendants JSON — Master Schema (v25, comprehensive)

**This is THE structural law.** It supersedes `hooker_json_schema_v24.md` and
`hooker_json_schema_v25_addendum.md`, both of which are folded into it in full below.
Where any two parts of this document disagree, the LATER section wins: §v25-0 beats the v24
body, and the v25 record (§v25-A onward) beats everything before it.

## How to read this document

You are not expected to read it end to end. It is three things stacked:

| part | what it is | when to read it |
|---|---|---|
| **§v25-0** | The consolidated operating doctrine — the laws, the render contract, the NB and blurb rules, the recurring bugs | **Before your first batch. Every session.** |
| **§0 – §20** (the v24 body) | The full field-by-field structural reference, the tag taxonomy, the registry schemas | As a reference, when a field or registry is actually in play |
| **§v22-\*, §v24-\*, §v25-\*** (the delta records) | The authoritative decision text for each revision, in the words it was settled in | When §v25-0 points you there, or when you need the reasoning behind a rule |

Counts in this document go stale. **Never quote a number from here — compute it live**
(`validate.py`, `card.py`, a one-off Python pass over `canonical.json`).

---

# §v25-0. READ THIS FIRST

## 0.1 The two laws

**LAW ONE — never delete without an explicit, named destroy instruction.**

The single most damaging thing that can happen to this project is silent loss: a good NB, a
photo URL, a working transition, destroyed because an ambiguous instruction was read as
"replace" instead of "add."

**Ambiguity always resolves to PRESERVE.** Concretely:

- "Take a pass at this entry's NBs" / "improve these" / "redo this" → **ADD to / refine in
  place.** Three existing NBs plus a new angle is four NBs, not one.
- The ONLY way to remove anything is an explicit destroy instruction **naming the exact
  target**: `nb_remove "<exact header>"`, `cc_remove <id>`, `tag_remove <tag>`,
  `blurb_remove`, or Sam saying in plain words "delete the X NB."
- Enforced mechanically: `process_tasks.py` is append/set-only and ABORTS the batch (writes
  nothing) if any pre-existing element vanishes without an authorised removal.
  `validate.py --baseline` is the second net.
- **A `SILENT LOSS` line in validate output is a STOP, not a footnote.** When the loss is the
  authorised removal you were just asked for, say so explicitly in your report and say that
  nothing else was flagged. Do not commit through a `BLOCKED` result silently.

**LAW TWO — NB prose is draft-for-approval.**

`nb_angle` / `nb_full` rows do **not** write to canonical. They stage drafted NB text into the
sheet's `proposed` column for Sam's approval; the text lands in canonical only after Sam marks
APPROVE. Everything else (dates, blurbs, tags, marriage, parents, cc, education, career,
media) auto-applies, append/set-only.

## 0.2 Scope law — build the submission, and nothing beyond it

- **Work the IDs Sam names.** Never sweep the corpus looking for errors to fix.
- **But build the whole submission.** If a paste gives material on a person Sam did not name by
  ID, build them. Holding a generation back because one name was missing earns: *"you really
  choked on all that."*
- **Infer STRUCTURE from arithmetic, never invent NAMES.** A mother who would be 46 and 52 at
  those births is a grandmother — build the intervening couple if the paste named them
  anywhere. Only a genuinely absent given name is a blocker, and a blocker is a one-line
  question at the END of delivered work, not a reason to hold the work.
- **In-law lines are TERMINAL.** Never build an in-law's ancestors or collaterals. If someone
  married into the tree, their parents, grandparents and siblings are outside it. "Should be in
  the tree" does not license building upward and sideways from an in-law — it licenses
  building the person named. Twelve people were created and deleted in one exchange over
  exactly this.
- **Descendants of a bloodline person always belong.** That is the other side of the same rule:
  an in-law's child by a bloodline spouse is bloodline.
- **Create nothing Sam did not name** — no new landmarks, artworks, cemeteries or institutions
  beyond the submission. Flag instead.
- **Never create a dateless name-only person** to make a chip or link render. The one exception:
  **children named in an obituary or a Who's Who survivor list MAY be created dateless.**
- **Dedup before creating.** Married women live in the corpus under married names. Search
  (first name + birth year) AND maiden name before creating anyone, or you will make
  duplicates. Merges are Sam-authorised only, and every reference must be repointed before a
  delete.
- **No external data fetch for facts.** Never search the web for a coordinate, a date or a
  relationship. A missing value is a flag and a question, not a lookup. (Fetching a user's own
  asset at a URL they supplied — an image to transform, a page they pasted — is a different
  thing and is fine.)

## 0.3 NARRATIVE BLOCKS — ordering, slices, caps

### 0.3.1 Ordering is by RELEVANCE, and the order is specified

The array is ordered by **relevance, never chronology**. The first block a reader sees must be
the most compelling thing about the person. In order:

1. **What the person did** — the achievement, the career, the talent, the thing they are known
   for. The reason this card exists.
2. **Character and the human detail** — the habit, the object, the remark, the contradiction.
3. **Family** — marriage, children, parents, and the eminent relative.
4. **Biographical scaffolding** — bare dates, birthplace, the circumstances of death where
   they carry no story.

**`family` goes after the substantive blocks; bare dates go last of all.**

Two consequences that get violated constantly:

- **A famous relative is ALWAYS the last block, never the first and never the blurb.** An
  extraordinary fact one generation away is a breadcrumb, not the lead. A card whose first
  block is about someone else's Nobel Prize has buried its own subject.
- **An appended block lands at the bottom — which is where the LEAST relevant thing belongs.**
  So tacking on actively inverts the card's priority order. When asked to improve a card that
  already has blocks, **REBUILD the array** (see 0.3.4).

### 0.3.2 An NB is a small slice of engaging narrative

Not a paragraph. Not a summary. Not an encyclopedia entry. **One block carries one slice.**

- **Seven is a ceiling, not a target.** Four real threads beat seven fragments.
- **Body ≤ 240 characters. Header ≤ 8 words AND ≤ 50 characters.** Both validator-enforced.
  Over 50 characters the header wraps on the card.
- The overflow budget is the **TALLEST SINGLE BODY in characters**, not cumulative words — see
  §v25-J. But cumulative length still matters for whether the last block clears the bottom
  border, so a seven-block card of long bodies will push its tail off-screen.
- **Lead with the specific human detail.** Never lead with the Hooker connection — that is the
  price of admission, not the story.
- **Null beats weak.** A too-thin angle returns `NEEDS_ANGLE`. You are action-eager; resist
  closing a row with a bland-but-legal NB. The validator cannot catch boring. Sam catches it on
  the card.
- **Name people. Never pronoun-track.** "He married her and they had four" is unreadable two
  blocks later. Name each person in each body.
- **Do the arithmetic for the reader.** Ages, intervals, gaps. "She outlived him by sixteen
  years." "Three days short of eighty-six." "Married the day they both graduated." The dates
  are in the record; the meaning is not, and computing it is most of the writing.
- **The card owner is the subject.** Never "his daughter" / "his widow" as the opening of a
  sentence on that person's own card. Re-open with them.
- **No fourth wall.** The person acts; the source never appears. Not "the obituary says she…"
  and not "according to the Goodyear book." Attribution goes nowhere user-facing.
- **No dollar or pound figures.** Name the act — "funded a building", "left everything to her
  granddaughter" — not the sum.
- **No intensifiers.** Cut "own", "very", "remarkably". Keep "own" only when something actually
  contrasts.
- **No IDs, no single-letter middle initials, in user-facing text.**

### 0.3.3 Headers name things; they do not withhold them

Concreteness is the floor, intrigue is the seasoning — the full rule is §v25-H. The failure
mode is the **riddle header**: one that describes a thing without naming it.

```
BAD   "The woman who measured the stars"      → who? scanning the headers tells you nothing
BAD   "He asked the corpsman a question first" → withholds the only interesting part
BAD   "A boy and his dog on the monument"      → survives only because the body lands fast
GOOD  "Mortar fire on Hill 861"
GOOD  "His great-grandfather ran the Santa Fe railroad"
GOOD  "Doc Daniello remembered what he said"
GOOD  "For Those Who Cannot Speak, 1970"
```

Test: **read the headers alone, unexpanded. They must tell you who this person was.** A header
containing an undefined "it", "he" or "the woman who" fails. At most one or two headers on a
card may withhold; the rest must state.

### 0.3.4 Rebuild, don't tack on

When a card already has blocks and you are asked to improve, enrich or redo it:

- **MEASURE THE EXISTING BODIES FIRST.** Over-cap legacy blocks are the usual reason a card
  "reads as invalid", and they cluster on the RICHEST cards — whoever wrote them kept going
  because there was more to say. Writing three clean blocks beside a 426-character wall leaves
  the card worse-looking than before.
- **Regenerate the whole array** in relevance order.
- **Deduplicate across blocks.** The same fact in two bodies is the signature of tacking on.
- **Keep every thread.** A rebuild reduces length, never coverage. Assert every thread is still
  present after the rewrite, by string probe, before writing:

```python
joined = ' '.join(h + ' ' + b for _, h, b in NB)
for probe in ('Khe Sanh', 'Henrietta Swan Leavitt', '21 April 1968'):
    assert probe in joined, 'THREAD LOST: ' + probe
```

- **State the before/after counts** so the reduction is auditable.

### 0.3.5 Quotations

If a block carries a quotation, **it goes last on the card, the quotation ends the body, and it
is actually quoted.**

```
BAD   …was with him the night before he was killed, and never forgot it: you know Doc, I wonder…
GOOD  Navy corpsman Ralph “Doc” Daniello was with him the night before and remembers what he
      said: “You know Doc, I wonder how many guys are not going to come back from this.”
```

The bad version commits two faults: it **pre-empts the line by stating the outcome first**, and
it runs speech as prose. Identify the speaker's relationship to the subject ("navy corpsman
attached to his company") or the quotation means nothing. Put nothing after the closing quote.

### 0.3.6 Category enum — STRICT

`career`, `military`, `education`, `religion`, `family`, `character`, `politics`, `law`,
`social_reform`, `death`, `legacy`, `marriage`, `crime`, `literature`, `science`, `business`,
`arts`.

**`civic` is NOT a value — use `social_reform`.** `academic` → `education`. `actor` → `arts`.
This enum is DIFFERENT from `notable_category`; see §5.

## 0.4 BLURBS are quick hits

A blurb is a **noun-phrase role label**. One glance, one identity. It is not a sentence.

- **≤ 8 words**, validator-enforced. Three to six is the working range.
- **No verbs, no clauses, no narrative.** "Ran free clinics in Nigeria and Botswana" is a
  sentence fragment doing an NB's job.
- **Never built from marital status, residence, birth order or descent.** These are all
  invalid, and all were shipped and rejected:
  - "Youngest of the Lenox Rackemann children" — birth order
  - "Michigan-born son of the Lenox Rackemanns" — descent
  Both name someone's parents, which the chips already do.
- **Most people do not qualify.** Blurbs are rare, not default. Never add one unasked as
  filler. Null beats weak.
- `notable_blurb` **SHADOWS** `bio_blurb` — the card renders `notable_blurb ?? bio_blurb`, so
  for a notable person `bio_blurb` never displays. Set the one that will show.

```
GOOD  "Assateague conservationist and birder"
GOOD  "Adams Express chairman"
GOOD  "Tenth New York Artillery sergeant"
GOOD  "Historian of the Canadian animal-welfare society"
BAD   "Wife of a twice-dismissed frontier minister"  ← acceptable ONLY when Sam asks for the
                                                       relation and forbids the name
```

## 0.5 CROSS-CONNECTIONS — the law, and the reach test

**Mechanics.** Reciprocal, both directions, always. `link_text` + `display_label` form **ONE
English sentence** whose subject is the linked name: the label is the PREDICATE and **begins
lowercase with a verb**. No capitalised opener, no terminal period, **≤ 70 characters**.

```
GOOD  "Aaron Burr Jr."       + "shot him at Weehawken in July 1804"
GOOD  "Col. Matthew Talcott" + "was his uncle, and raised him from the age of four"
BAD   "Adrian Terry"         + ", adjutant-general of the assault he watched"   ← no verb
BAD   "Solomon Cowles"       + "Five Hooker generations on the same ground."    ← noun phrase
```

A comma may open the label ONLY as an appositive followed by a main verb
(`, his uncle, raised him from four`). The `type` field is ignored — default it, never
deliberate, never ask.

**Never on parent/child/spouse/sibling.** The structural link already draws it.
**DO name the kinship on a vertical or collateral CC** — that is what makes it readable cold:

```
", his grandson, became president and then chief justice"
", her husband's great-uncle, boarded at Florence Griswold's"
", his younger brother, married Martha Hooker of Farmington"
```

**A searchable person must never CC a non-searchable one.** Assert it.

### 0.5.1 The reach test — and the date check that kills most candidates

A CC needs **a fact that passed between the two people**. Name it or do not build it.

**These are REACH, not connections:** same employer, same town, same state, same surname, same
profession, same school, same cemetery, same century.

**CHECK THE DATES BEFORE YOU BUILD.** If one of them was dead before the connecting event,
there is no connection. Two failures in one session, both caught by Sam, both avoidable by one
subtraction:

- Baron Van den Heuvel ↔ Zadock Pratt, on a marriage that happened **27 years after the Baron
  died**.
- Ostrom Enders ↔ John Skelton Williams, "both bankers" — Williams left office in 1921,
  Enders started as a junior in 1925, different states.

**What a good one looks like** — a named third thing, specific to both:

- Nellie Porter Everett ↔ Francis Trudeau: she moved to Saranac Lake in 1905 for the
  tuberculosis cure; his family's sanatorium is why the town had one.
- Alexander Dorchester ↔ Sgt. William Hooker: **the same company** of Webb's regiment, a month
  apart, both three-year men.
- Ostrom Enders ↔ Leonard Cutler Sanford: both funded serious ornithology out of an unrelated
  profession, same state, overlapping decades.
- Kenneth Ober ↔ Roy Hazard: one paints from Jung's mandala research, the other sat in Jung's
  consulting room in 1926.

**Hunt actively.** The best rare CCs come from institution and cemetery
`hooker_connections` rosters — link the existing INST/CEM record, then read who else is in it.
Search the whole record, not just display names: the interesting figures live inside other
people's NB bodies.

### 0.5.2 Labels must read cold

No reflexives, no "the same X", no arithmetic the reader has to do. Name the club, give the
date. **And use the name a reader can place** — "Ali Wentworth", not a formal name nobody uses;
don't cite a 2026 spin-off nobody has heard of.

## 0.6 THE RECURRING STRUCTURAL BUGS

These six accounted for most of the wasted time in the sessions behind this document. Each has
a one-line detector. Run them.

### 0.6.1 Parent link not mirrored in a marriage row → the child is invisible from above

`childrenOf()` (`regenerate-data.js:775`) reads **only** `marriages[].children_ids`. It never
looks at `parents.father_id` / `mother_id`. A child linked upward but not listed on a marriage
row renders **no child chip** and sits outside the graph.

**The fix is a SPOUSELESS marriage row**: a row with no `spouse_id`, carrying
`children_ids`. `FeaturedCard.svelte:545` skips the spouse chip when there is no spouse, and
`spouseIds()` filters `s && byId[s]`, so the row is safe in traversal. Ten-plus people in the
corpus already use it.

Use it when:
- the other parent is deliberately unbuilt (Garry Trudeau's mother, per the Jalapeño rule);
- the parents were never married and **no union may be asserted** — give **each parent their
  own independent spouseless row**, with nothing joining them.

For a real unmarried union, the corpus instead has `relationship_type: "partner"` +
`is_marriage: false` (six uses, honoured at `regenerate-data.js:793`). **Do not reach for
`partner` when the relationship was not a partnership.** Two parents of one child are two
parents of one child.

**~179 people are currently affected.** See `docs/CONTENT_BUGS.md`.

### 0.6.2 A death with no year makes a dead person render as living

`presumedLiving()` (`regenerate-data.js:163`):

```js
if (typeof p.is_living === 'boolean') return p.is_living; // explicit canonical override
if (deathYear(p) != null) return false;
const by = birthYear(p);
return by != null && by >= BUILD_YEAR - MAX_LIFESPAN;
```

A record that is known dead but carries **no death year** — FamilySearch's bare "Deceased" is
the common source — is treated as LIVING: its dates are suppressed and its slug loses the
birth year. The data is there and invisible.

**The fix is `is_living: false`**, the explicit override, which the function reads first.

### 0.6.3 A career row with no `start_year` is stored and never rendered

Only **three** career rows render, sorted latest-first by `start_year`. A row without one does
not render at all. Either date it from the source or put the fact in a block — do not leave
invisible data and call it recorded.

### 0.6.4 Over-cap NB bodies cluster on the richest cards

See 0.3.4. Measure before you write.

### 0.6.5 Argument-shift in builder scripts

One omitted positional argument in a `mk(...)` helper produced: `gender: 8`, birth dicts
written into three classification **booleans**, and a birth year of 1916 on a woman born 1815 —
and because `gender` was then not `'male'`, the marriage helper wrote **the wife's ID into both
parent slots** for six children.

**Mitigations:** use keyword arguments in builder helpers; put **asserts BEFORE `json.dump`**
so a failure discards nothing; and run the integrity sweep in 0.7 after every build batch.

### 0.6.6 Duplicate registry entries

A second "Pine Ridge Cemetery, Saranac Lake" was created when `CEM384` already existed with a
Find a Grave page and four people on it. **Search the registry by name AND city before
creating any cemetery, landmark, institution or artwork.**

## 0.7 THE VERIFICATION LOOP

`batch.py` runs the contract and stops itself on any new error or silent loss:
revert point → `process_tasks.py` → baseline → **`validate.py --since`** (reports ONLY what
THIS batch introduced, because the standing debt makes a plain run print BLOCKED every time) →
regenerate → **`card.py`** → review links.

```bash
python3 batch.py tasks.csv                        # a sheet batch
python3 batch.py --ids X03821                     # after a HAND edit to canonical
python3 batch.py tasks.csv --commit "message"     # commits only if the delta was clean
```

- **Verify with `card.py <ID>`, never by reading canonical.** Canonical proves the data is
  STORED; `card.py` prints the **VISIBLE** surface. Which keys render is a real trap.
- **A full regenerate after any chip-surface change.** Payloads embed COPIES of neighbours
  (chip names, classification, display names); `--only` leaves them stale and `card.py` cannot
  catch it.
- **Sam's rendered-pixel verdict outranks a clean run.** Bad card → `git checkout canonical.json`
  (uncommitted) or `git revert` (committed).

**The post-build integrity sweep** — run it over every batch that created or rewired people:

```python
# gender sane, classification flags boolean, generations integral,
# parents present & correctly sexed & mirrored, marriages reciprocal,
# children lists identical on both sides, no dangling ids anywhere,
# NB caps, blurb word counts, CC reciprocity + length + searchability,
# career rows carrying start_year, generation == parent generation + 1
```

A clean sweep across the corpus currently reads: **0 bad genders, 0 non-boolean classification
flags, 0 non-integer generations, 0 dangling IDs.** Keep it there.

## 0.8 THE RENDER CONTRACT — the short list

Full table in §v24-1; the facts that cost a session each:

| you wrote | what renders |
|---|---|
| `name` | nothing — it is **`primary_name`** |
| `landmark_blurb` | nothing |
| a street address | nothing |
| `military_service` | **nothing** — put it in a block too |
| `quotes`, `sources`, `research_notes` | **nothing** |
| education `type`, career `notes` | nothing — use education `dates` |
| bare ID strings in `landmarks` / `artworks` / `documents` | **null, renders nowhere** — they must be objects: `{landmark_id, landmark_blurb}`, `{artwork_id, role}`, `{document_id}` |
| top-level cemetery `latitude`/`longitude` | nothing — coords go in `gps: {latitude, longitude}` |
| a 4th+ career row | off-card (3 render, latest-first by `start_year`) |
| a 4th+ education row | off-card (3 render) |
| an 8th NB | off-card (7 is the hard ceiling) |
| `is_notable: true` with no `primary_url` | **validation error** |
| `notable.notable_url` unset | the card's notable link is dead — set it AND `primary_url` |

- **`chipSurname` reads `last_name`**, not `married_names`. Corpus norm for a married woman is
  the **married** surname in `last_name`.
- **Slugs are computed fresh every build** from first name + surname + birth year, and
  `structuredSurname()` (`:190`) slugs **married-in people by MAIDEN name** and bloodline
  people by married name. A name edit moves the slug: add the old slug to `former_ids`
  (which feeds `redirects.json`).
- A **bracketed display name** (`[Son] Rackemann`) is treated as a placeholder and gets an
  ID-anchored slug (`unnamed-hd14060`). This is deliberate and shared by ~130 people.
- `research_notes` is **DEAD**. Never park a fact or a conflict there. Put it in a user-facing
  field or raise it in chat, and mine old notes into real fields when you touch a record.

## 0.9 FLAGGING, CONFLICTS AND HONESTY

- **Two sources disagree → say so, pick the better one, and name why.** A gravestone or a
  sworn affidavit beats a newspaper. A man's own pension application beats a clipping. A
  precise date beats a bare year.
- **Never silently propagate an OCR artifact.** Note it and let Sam decide.
- **Report what you did NOT do**, with the reason, in one line each. Scaling the work down is
  Sam's call, not yours.
- **Do not narrate a correction you are making for your own benefit.** Fix it and move on.
  Correct a *user-visible* error plainly, once.

---
# FOLDED IN: THE COMPLETE v24 DOCUMENT (verbatim)

Everything below is `hooker_json_schema_v24.md` byte-for-byte — the v21/v23 master body, the
v22 delta record and the v24 delta record, in the arrangement they were settled in. Nothing has
been removed, shortened or rewritten. Where any rule below is contradicted by **§v25-0 above**
or by the **v25 record below**, the later text governs.

---

# Hooker Descendants JSON — Master Schema (v24, comprehensive merge)

Version 24.0 — 12 August 2026
Compiler: Samuel Talcott Hooker

**What this document is.** v24 is the *comprehensive, self-contained* schema. It is the
**complete v23 body, unaltered**, with the v24 delta record appended in full at the end.
Nothing in v21, v22 or v23 has been removed, shortened or rewritten to make room for v24 —
this was a surgical addition, and the v23 text below is byte-for-byte what it always was.

**How the versions stack.** v23 was itself the v21 master body with the v22 deltas folded in;
that arrangement is preserved. v24 adds a third layer on the same principle:

| layer | where it lives | authority |
|---|---|---|
| v21 master body | §0–§20 below | base |
| v22 delta record | `APPENDED: SCHEMA v22 DELTA RECORD` (§A–§E, §1, §2) | beats v21 |
| **v24 delta record** | **`APPENDED: SCHEMA v24 DELTA RECORD` (§v24-1 … §v24-9)** | **beats everything above** |

**Precedence, stated once:** where v24 contradicts anything earlier, **v24 wins** — it is the
more recent decision. Where an inline note and an appended delta section appear to differ, the
appended section wins; it is the exact decision text.

**What v24 folds in.** The whole of `schema_v24_planning.md` (the open accumulator started
10 August 2026 during the Pynchon enrichment), plus the rules established in working sessions
through 12 August 2026 that were never written down anywhere. The planning file has since been
deleted -- everything it held lives here.

**Reading order for a new contributor:** §0 (operating discipline) -> §2 (IDs) -> §4/§5
(person template + field rules) -> §6 (tags) -> the v22 blocks §A-§E -> **the v24 delta record,
which is where the current law is.** Re-read §0 every 3 turns; §5/§6, v22 §B and **v24 §v24-1
(render contract)** every 10 turns.

**If you read only one new thing, read §v24-1.** It is the table of which key each card
resolver actually reads. Writing to the wrong key is the single most common way work in this
repo becomes invisible: the data is stored, `validate.py` passes, and nothing appears.

---

TABLE OF CONTENTS
 0. Critical Operating Discipline — read before any action

 1. Project Overview

 2. ID Prefix System

 3. Top-Level JSON Structure

 4. Person Entry — Full Template

 5. Field Rules — Person Entry

 6. Tag Taxonomy

 7. Wars Array

 8. Documents Array

 9. Institution Entry Schema

10. Cemetery Entry Schema

11. Landmark Entry Schema 11.5 Outreach Contacts Schema (new in v15)

12. Notable Stories Schema

13. Soldiers Index Schema

14. Political Offices Index Schema

15. Bibliography Schema

16. Hooker-Talcott Merge Rule

17. UX Data Contract

18. Current Project State

19. Failure Modes — codified from prior session breakdowns

20. Notes for the Next Session

--- appended delta records (most recent law is last) ---

    SCHEMA v22 DELTA RECORD — §A–§E, §1, §2

    SCHEMA v24 DELTA RECORD — the current law:
     v24-1. The render contract — which key each resolver reads
     v24-2. Relationship labels — computed, overridden, and the CC axis
     v24-3. `date_precision` is now a RENDER field, not just a data one
     v24-4. Slugs, `former_ids` and the redirect resolver
     v24-5. Enum divergence — NB vs notable, and the traps in each
     v24-6. Editorial law added since v23 (folds in schema_v24_planning §1–§5)
     v24-7. The Pynchon line, the prism card, and Talcott severance (folds in planning §6–§7b)
     v24-8. Standing data debt introduced or measured in this span
     v24-9. Open questions carried forward


## 0. CRITICAL OPERATING DISCIPLINE
Read this section before doing anything else. Re-read it every 3 entries built or every 3
conversation turns, whichever comes first. Re-read §5 and §6 every 10 turns.

The same class of errors recurs across sessions. The disciplines below exist to prevent each
one.


0.1 SEARCH PROJECT KNOWLEDGE FIRST
Before any schema-level decision, before assigning any new ID, before answering any
question about the project’s state: search project knowledge with the
 project_knowledge_search tool. The schema lives in project knowledge, not on the local
filesystem. Relying on ls /mnt/project/ will miss the canonical schema and is a cardinal
failure.

This rule has no exceptions. If a turn involves the JSON, the schema, the data architecture,
or the tag taxonomy, search project knowledge first.


0.2 SEARCH THE TREE BEFORE CREATING ANY NEW ID
Before assigning any new H, HD, I, X, T, INST, LM, ART, CEM, BIB, DOC, STORY, or WAR ID:
search the existing data for the entity by name. Duplicates are worse than stubs. The
check is one tool call. The cleanup if you skip it is dozens of edits and lost trust.


0.3 BIDIRECTIONAL INTEGRITY IS THE WHOLE POINT
The JSON is a UX platform, not a notes archive. Sam will not remember a person’s
connections in two months. The data structure has to carry the connections so the build

can render them.

Every link must be bidirectional:

   A child’s parents.father_id must match an entry in the father’s
    marriages[n].children_ids

   A spouse’s marriages[n].spouse_id must reference back from the partner’s marriages
   array

   A cross_connections[n].related_id must have a reciprocal cross_connections entry

   An institutions[n].institution_id reference must be matched by the person’s ID
   appearing in the INST entry’s hooker_connected_people (or person_ids ) array

   A cemetery_id reference must be matched in the cemetery’s hooker_connections
   array

   A landmark_id reference must be matched in the landmark’s hooker_connections
   array

   An artwork_id reference must be matched in the artwork’s person_ids array

A note in research_notes is not bidirectional integrity. Writing “two children Mark and Gail”
while leaving children_ids: [] is sabotage; the UI cannot render notes as boxes.


0.4 INST / LM / ART / CEM ARRAYS ARE FOR LINKING, NOT TAGS
The person entry’s institutions , landmarks , artworks , burial.cemetery_id fields exist
to link the person to top-level entries by ID.

   Wrong: tags: ["ivy_league"] to indicate the person went to Harvard or Yale.

   Right: tags: ["harvard_graduate"] AND institutions: [{"institution_id":
   "INST002", "relationship": "alumnus", ...}] AND adding the person’s ID to
   INST002’s hooker_connected_people .

The tag is a filter handle. The institutions array carries the actual relationship. The
bidirectional INST update closes the loop.

INST creation threshold: A new INST entry exists only when 2+ Hooker-tree people are
affiliated. Single-person affiliations live in education[].school_name or
career[].organization — never as an INST. Same threshold applies to LM, CEM, ART (with
subject-of-artwork being its own justification).


0.5 NARRATIVE BLOCKS ARE HOOKS, NOT BIOGRAPHIES

See §5 narrative_blocks for the full rule. The TL;DR:

   Header: 8 words maximum, a hook that creates a question, never a summary

   Body: 2 sentences ideal; 3 permitted when narrative arc requires it; 4+ never

   No IDs in user-facing text

   Subject of the NB must be the person whose entry it is on

   Threshold test: the block must say something the structured fields cannot show

If you find yourself wanting to write 4+ sentences, the content goes in research_notes (no
length cap), not in a narrative_block.


0.6 CANONICAL TAGS ONLY
See §6 for the full taxonomy. Invented tags pollute the filter system. If a tag is needed but
not canonical, propose it explicitly to Sam for §6 addition — do not silently add
philanthropist , arts_patron , ivy_league , democrat , republican , businessman , etc.


0.7 IF UNCERTAIN, ASK BEFORE ACTING
The compiler is the single source of authority on scope, notability, and inclusion. The
Jalapeño Rule (§5) is a default; he can override it. When intent is unclear, ask before
building, not after the entry exists.

Examples of moments to ask:

   “Should I build [name] as an entry, or just note them in research_notes?”

   “Is [name] notable in your project’s sense, even though I can’t find a Wikipedia page?”

   “This person could be either I-prefix or X-prefix — which?”

   “Two canonical tags could fit — harvard_graduate or yale_connection . Which?”

A 30-second clarification beats a 30-minute cleanup pass.


0.8 EH OUTWEIGHS FAMILYSEARCH — ALWAYS (new in v15)
The project source hierarchy: peer-reviewed scholarly works > Edward Hooker 1909 (EH) >
vital records > FindAGrave (with stone photo) > FamilySearch curated collections >
FamilySearch user trees > WikiTree > Ancestry user trees.

The last three are crowdsourced. They are useful for outreach (§11.5) and as starting points
for research, but they do not override EH for descent claims.

When a FamilySearch or WikiTree user-tree attribution contradicts EH, EH wins. Verify
EH lists the proposed child before propagating any descent claim, cousin marriage flag, or
classification change.

Cautionary tale (May 2026 session): A FamilySearch user-tree attributed Ebenezer
Mansfield (I00546, Laura Stiles Mansfield’s husband) as a fourth son of Mary Stiles +
Richard Mansfield, which would have made Laura+Ebenezer’s marriage a first cousin
marriage and reclassified Ebenezer plus 36 of his descendants as Hooker-line. EH entry
452 lists only 3 sons (Leverett, Richard, Stiles) — no Ebenezer. Full 36-entry rollback was
required. A single EH lookup at the start would have prevented the cascade entirely.


0.9 SOURCE-VERIFICATION GATE FOR LARGE CASCADES (new in v15)
Cascading edits affecting 5+ entries (descent_paths updates, classification changes,
cousin-marriage flagging across a branch) are cheap to apply and expensive to revert.
Before applying any such cascade:

1. Confirm the underlying lineage claim is supported by EH or a higher-priority source.

2. If only user-tree sources support the claim, hold the cascade pending independent
   verification.

3. State the source explicitly in research_notes on the affected entries.

The 36-entry rollback in the May 2026 session would have been avoided by this gate.


0.10 EACH ENTRY STANDS ON ITS OWN MERIT (new in v15)
This is implicit in v14 §5 (NB perspective rule, notable_blurb rule) but worth pulling out as
its own discipline.

An entry is not notable because the subject’s parent, spouse, sibling, or child is notable.
Each entry’s NBs describe that entry’s subject’s own life events. Relational interest belongs
in cross_connections — that is exactly what the cross-connections array is for.

is_notable: true requires the subject themselves to have a documented external
presence (Wikipedia, encyclopedia, scholarly work), not reflected fame from a relative. The
compiler determines notability. Compilers do not unilaterally flag is_notable: true
without (a) external URL, AND (b) explicit Sam approval in chat.


0.11 POSSIBLE COUSIN MARRIAGE — FLAG, DON’T CASCADE (new in v17)
When you encounter a marriage where the in-law spouse carries a Hooker-family surname
(Hooker, Talcott, Huntington, Wadsworth, Welles, Pitkin, etc.) at birth and was born in the
same county/town as the Hooker descendant they married, this is a strong signal of a

possible cousin marriage. Do not apply a cousin_marriage CC or reclassify the in-law as
Hooker-line until the lineage is verified against EH or a higher-priority source.

Until verified, the appropriate handling is:

   Add a “POSSIBLE COUSIN MARRIAGE FLAG” paragraph to the relevant research_notes
   on both spouses

   Leave classification as inlaw ( is_thomas_spouse: true , is_thomas_descendant:
   false )

   Do NOT add cousin_marriage to tags or cross_connections yet

   Do NOT reclassify any of their descendants

   Add a note in the next session handoff identifying the case for Sam’s research

Real example (May 2026, Stage 6Y-209d): Charles William Huntington (TD0279, born
Sugar Creek Township Shelby County IN 1865) married Louisa Huntington Huntington
(I01151, born Boggstown Shelby County IN 1873) — same county, both surnamed
Huntington at birth. Strongly suggests documented cousin marriage but unverified. Flagged
in research_notes for Sam’s verification; classification kept as inlaw pending evidence. A
weaker similar flag applies to Frank Cordell Huntington (TD0280) m. Gertrude A. Huntington
(I01152, Kansas-born; less obvious connection).

This is a different discipline from §0.9 source-verification cascades. The cascade gate
prevents propagating an accepted claim. This flag prevents prematurely accepting a claim
that has surface evidence but no documentary verification. Both gates exist to prevent the
36-entry rollback class of error.


0.12 DUPLICATES ARE DELETED, NOT STUB-REDIRECTED (new in v18)
When two entries are discovered to represent the same person, the merge MUST be a true
deletion of the duplicate, not an RN-stub redirect.

Procedure:

1. Consolidate all data onto the canonical entry (the surviving ID)

2. Audit zero remaining tree references to the duplicate ID:

        parents.father_id / parents.mother_id

        marriages[].spouse_id

        marriages[].children_ids

        cross_connections[].related_id

        naming_inspiration[].inspired_by_id

3. DELETE the duplicate entry from the people array

Forbidden pattern: Keeping the duplicate with a tag duplicate_entry and an RN note
saying “see ID-X for canonical record.” This is exactly the F4 failure mode (notes instead of
data). RN is not UX-visible; the duplicate entry would still appear as a ghost record in the
JSON and confuse downstream consumers.

Real example (May 2026, Stage 6Y-300): X02243 Lydia Mason Robinson Hooker was
discovered to be a duplicate of HD3270. Initially X02243 was kept as a stub with tag
duplicate_entry and an RN redirect (“see HD3270”). Sam directive 6Y-300: “RN is a dead
zone, we delete duplicates, not hang on to them for no reason.” X02243 was then properly
deleted from the people array; people count 11938 → 11937. F21 codifies the stub-redirect
failure mode.


0.13 DISPLAY NAME DISAMBIGUATORS (new in v18)
When two tree entries have identical legal names (e.g., a child named after a deceased
relative, where the family later re-used the same suffix numbering), add a parenthetical
disambiguator to bio.display_name while keeping bio.suffix clean for mechanical reads.

Pattern:

    bio.display_name : "Junius Spencer Morgan II (the elder)"

    bio.suffix : "II" (unchanged — clean for systems reading bio.suffix)

Conventions:

    (the elder) / (the younger) for same-name uncle/nephew or other generation-skip
   namesakes

    (d. YYYY age N) for entries that need date-or-circumstance disambiguation

   Avoid disambiguators in bio.suffix — keep that field mechanically clean

Pair with naming_inspiration + naming_pattern CC. The display-name disambiguator
alone is the visual fix. To capture the family pattern, also add:

    naming_inspiration field on the namesake’s entry pointing to the original

    naming_pattern CC bidirectional between the two (uncle/nephew not in §5 exclusion
   list, so the CC is legal)

Real example (May 2026, Stage 6Y-311): HD1218 (1846-1858, died age 11 in London) was
the original Junius Spencer Morgan II. His maternal nephew HD1238 (1867-1932, J.P.
Morgan Sr.‘s nephew, Princeton librarian/art collector) was born nine years after the
original’s death and given the same name with the same II suffix — Wikipedia titles him
“Junius Spencer Morgan II” as well. HD1218 renamed to “Junius Spencer Morgan II (the
elder)” with naming_pattern CC bidirectional to HD1238.


## 1. PROJECT OVERVIEW
A bespoke, curated genealogy visualization for the ~7,500+ descendants of Rev. Thomas
Hooker (1586–1647), founder of Hartford CT, built in SvelteKit + D3.js. A parallel Talcott line
descending from Hartford co-founder John Talcott merges repeatedly through
intermarriage. The JSON is the single data layer for the entire site.

The compiler descends from Thomas Hooker on both sides:

   Paternal: Hooker surname line through Samuel Hooker (H00007)

   Maternal (Talcott): Thomas¹ → Samuel² → John³ → Roger⁴ → Thomas⁵ → Abigail⁶ (m.
   Samuel Talcott) → Seth⁷ → John Butler Talcott⁸ → Florence H. Talcott⁹ → Helen Talcott
   Hope¹⁰ → Lea Hooker¹¹ → compiler

This is not a crowdsourced project. Every entry is personally researched and curated to
scholarly standards. Primary source is Edward Hooker’s 1909 genealogy. The JSON drives
every page, every tree box, every search result, every path calculation, every animation.

Primary audience: Connecticut Historical Society, academic historians (Yale, UConn,
Trinity, Wesleyan), NEHGS members, professional genealogists, Farmington museum
network, descendants who care about history. NOT mass-market.


## 2. ID PREFIX SYSTEM

  Prefix           Meaning                                          Rule

  H00001–                                                           Number matches EH
                   Edward Hooker 1909 book entries
  H09999                                                            entry number exactly

  HD0001–
                   Discovered Hooker descendants not in EH          Sequential
  HD9999

  I00001–          Direct spouses of H/HD people                    Sequential

  I09999

  X00001–          Extended — parents of I entries, spouses of
                                                                    Sequential
  X09999           HD people, non-descendants

  T00001–
                   Talcott family line                              Sequential
  T09999

  TD0001–
                   Discovered Talcott descendants                   Sequential
  TD9999

  U00001–
                   User-contributed entries (future)                Sequential
  U09999

  Y00001–
                   Special index entries                            Sequential
  Y00999

  CEM001–
                   Cemeteries                                       Sequential
  CEM999

  LM001–
                   Landmarks                                        Sequential
  LM999

  INST001–
                   Institutions                                     Sequential
  INST999

  ART001–
                   Artworks                                         Sequential
  ART999

  BIB001–
                   Bibliography entries                             Sequential
  BIB999

  WAR001–
                   Wars                                             Sequential
  WAR999

  BTL001–
                   Battles (nested under wars)                      Sequential
  BTL999

  DOC001–
                   Documents                                        Sequential
  DOC999

  STORY001–
                   Notable stories                                  Sequential
  STORY999


I prefix rule: Every direct spouse of an H or HD person gets I prefix regardless of notability.
Notability is a separate boolean ( notable.is_notable ). I prefix is about the relationship, not

the person’s significance.

H and HD are equivalent on the website. Both get gold borders. The prefix is internal
research notation only.

X prefix for spouses of HD entries: HD-person spouses may carry X prefix when assigned
that prefix prior to reclassification. Do not retroactively change X→I. Note the anomaly in
research_notes. This ship has sailed.

Do not create new IDs without first searching for existing entries. Duplication is worse
than a stub. (See §0.2.)

Generation -1, -2: Thomas Hooker’s parents and grandparents carry negative generation
numbers. The path algorithm stops at gen 0.


## 3. TOP-LEVEL JSON STRUCTURE

 {
     "metadata": { ... },
     "compiler": { ... },
     "bibliography": [...],
     "people": [...],
     "cemeteries": [...],
     "institutions": [...],
     "landmarks": [...],
     "statues": [...],
     "artworks": [...],
     "wars": [...],
     "documents": [...],
     "notable_stories": [...],
     "soldiers_index": [...],
     "political_offices_index": [...],
     "open_research": [...],
     "research_threads": [...],
     "family_networks": [...],
     "yale_connections": [...],
     "harvard_connections": [...],
     "outreach_contacts": [...]
 }


## 4. PERSON ENTRY — FULL TEMPLATE

Every field listed below must be present on every person entry. Absent fields are a schema
violation. Null values and empty arrays are correct.


 {
     "id": "H00001",
     "former_ids": [],
     "is_placeholder": false,
     "has_descendants_documented": true,


     "bio": {
          "title": "Reverend",
          "first_name": "Thomas",
          "middle_name": null,
          "last_name": "Hooker",
          "suffix": null,
          "maiden_name": null,
          "married_names": [],
          "extra_names": null,
          "nickname": null,
          "gender": "male",
          "display_name": "Rev. Thomas Hooker",
          "photo_url": null,
          "photo_notes": null
     },


     "birth": {
          "year": 1586,
          "month": 1,
          "day": 1,
          "city": "Birstall",
          "county": "Leicestershire",
          "state": null,
          "country": "England"
     },


     "baptism": {
          "year": null,
          "month": null,
          "day": null,
          "city": null,
          "county": null,
          "state": null,
          "country": null
     },


     "death": {

     "year": 1647,
     "month": 7,
     "day": 7,
     "city": "Hartford",
     "county": null,
     "state": "Connecticut",
     "country": "United States",
     "cause": null
},


"residence": {
     "city": null,
     "county": null,
     "state": null,
     "country": null
},


"burial": {
     "cemetery_id": null,
     "plot_notes": null
},


"classification": {
     "is_thomas_descendant": false,
     "is_talcott_descendant": false,
     "is_thomas_spouse": false,
     "is_talcott_spouse": false,
     "generation_from_thomas": 0,
     "generation_from_john_talcott": null,
     "include_in_path_calculation": true,
     "descent_paths_to_thomas": 0,
     "descent_from_thomas_hooker": true,
     "is_progenitor": true,
     "is_easter_egg": false
},


"notable": {
     "is_notable": false,
     "notable_category": [],
     "notable_blurb": null,
     "primary_url": null,
     "primary_url_label": null
},


"parents": {
     "father_id": null,
     "father_name": null,

         "mother_id": null,
         "mother_name": null,
         "father_research_notes": null,
         "mother_research_notes": null
    },


    "number_of_marriages": null,
    "marriages": [
         {
             "marriage_number": 1,
             "spouse_id": null,
             "spouse_name": null,
             "date_year": null,
             "date_month": null,
             "date_day": null,
             "location_city": null,
             "location_county": null,
             "location_state": null,
             "location_country": null,
             "officiant": null,
             "end_type": null,
             "end_year": null,
             "children_ids": []
         }
    ],


    "education": [],
    "career": [],
    "military_service": [],
    "institutions": [],
    "landmarks": [],
    "naming_inspiration": [],
    "artworks": [],
    "tags": [],
    "research_tags": [],
    "cross_connections": [],
    "narrative_blocks": [],
    "quotes": [],
    "sources": [],
    "research_sources": [],
    "research_notes": null,
    "documents": [],
    "cross_reference": null
}

## 5. FIELD RULES — PERSON ENTRY

bio

      title — full spelling always: “Reverend” not “Rev.”, “Captain” not “Capt.”, “Colonel” not
   “Col.”

      first_name — first name only. No middle, no title, no suffix, no parenthetical.

      middle_name — middle name or initial only, no period: “E” not “E.”

      last_name — men: birth surname, never changes. Women: final married surname —
   how she was known at death. Null if married name unknown.

      maiden_name — women only: birth surname. Displayed in the middle position.

      married_names — array, women only, all married surnames in chronological order:
      ["Langdon", "Church"] . last_name equals the final entry.

      extra_names — free string for exceptional cases.

      gender — "male" , "female" , "unknown" . Never guess from a name. Verify against
   source text — Mark/Pat/Chris/Robin/Jordan require explicit confirmation.

      display_name — assembled for UI. Men: title + first + middle + last + suffix. Women:
   title + first + maiden + last + suffix (maiden takes the middle slot).

      photo_url — direct image URL.

      photo_notes — optional attribution.

      bio_blurb — 8 words maximum — identical rule to notable_blurb (made explicit in
   v19). A static, factual, Wikipedia-style identity line (e.g., “Folk singer-songwriter”,
   “Rockefeller-family lawyer at Milbank, Tweed”) — not a full sentence, not a tease. Valid
   on ANY entry. notable_blurb is reserved for is_notable: true entries, but the two
   fields use the SAME 8-word limit and the SAME form — fill them the same way. A null
      bio_blurb is strongly preferred over weak generic filler (“A member of the family”,
   “Lived in Connecticut”).

Note on name vs bio : Older entries may carry name instead of bio . The build reads both.
Do not bulk-rename.


birth / baptism / death

   All dates are flat objects — never nested {date: {year, month, day}} .

    year required if known. month and day default to 1 if unknown.

   No circa field.

    county for English entries and early colonial American entries.

    state for US entries — geographic abstraction meaning “first-order administrative
   division within a country” (English counties, Canadian provinces also live here).

    cause — plain English: “tuberculosis”, “killed in battle”, “drowned”, “fire”, “childbirth”,
   “homicide”.

    baptism — separate object. Often the only documented date for colonial-era entries.

   Country default rule: Unless source explicitly states a foreign country, assume United
   States. Do not leave country: null when birth/death year and US state are known.


residence

One entry — primary place of adult life when significantly different from birth and death.


burial

    cemetery_id — links to cemetery entry. Never repeat cemetery details inside the person
   entry.

    plot_notes — only person-specific detail: “FindAGrave #29848117”, “exact location
   unknown”.


classification

    is_thomas_descendant — true for all H and HD entries.

    is_easter_egg — true for X-prefix non-descendants who are either:

    1. Notable parent of an I-prefix or H/HD spouse (governor, cabinet officer, major
         scientist, etc.), OR

    2. Orbit entry — non-descendant with documented connections to multiple Hooker-
         line people.

   A Hooker blood descendant (H or HD) is NEVER is_easter_egg: true .

    is_progenitor — true only for H00001.

    descent_from_thomas_hooker — used in path calculation.

    include_in_path_calculation — false for X entries and dead ends.

   generation_from_thomas — Thomas = 0. Children = 1. Parents = -1.

   is_thomas_spouse / is_talcott_spouse — derived at build time from marriage links.

  All fields present. Non-applicable fields are null or false, never absent.


notable

   is_notable — boolean.

   notable_category — array. Values: politics , military , law , religion , education ,
   arts , science , business , exploration , social_reform , charity , literature ,
   poetry , medicine , author , history .

   notable_blurb — 8 words maximum. A hook only — no full sentences. A null blurb is
  strongly preferred over a weak generic blurb. Parity rule (v19): notable_blurb (on
   is_notable entries) and bio_blurb (on any entry) follow the SAME 8-word limit and
  the SAME static, factual, Wikipedia-style identity-line form. Fill them the same way; null
  beats weak.

  ✓ DO (8-word hooks):

      “US Vice President 1801-1805”

      “Founded Yale University 1701”

      “Seamen’s Church Institute founder, Liberty ship namesake”

      “Olympic mountain biker, 2012 + 2016 Games”

      “Connecticut Supreme Court Chief Justice, 1801”

      DON’T (paragraph blurbs): “American Episcopal clergyman who served as the first
  Superintendent of the Seamen’s Church Institute of New York for 38 years, helping
  establish its 25 South Street headquarters and creating MEDICO radio medical
  service…” — the long version belongs in research_notes .

   primary_url — best available URL. Wikipedia preferred.

   primary_url_label — clickable text. Never a raw URL.

  Rule (tightened in v15): is_notable: true requires (a) a non-null primary_url AND
  (b) explicit Sam approval in chat. Sam determines notability. Compilers do not
  unilaterally set is_notable: true without both gates — notable status grants UI
  placement that competes for screen real estate. Exception requires explicit
  research_notes justification.

  Watch the enum: notable_category does NOT accept career . career is valid only as
  a narrative_blocks[].category value. The two enums are different — see the
  narrative_blocks rule below for the full NB category list.

   notable_category follows tag canonicality (new in v18): The values in the
   notable_category array follow the same canonical-or-propose rule as tags . The F5
  explicit non-canonical tag list ( philanthropist , arts_patron , etc.) also applies to
   notable_category — these strings should not appear in either field. Real example
  (Stage 6Y-300): HD1536 Cornelia Butler White had notable_category:
  ['arts_patron', 'adventurer', 'educator'] — arts_patron removed in cleanup as
  non-canonical.


parents

   father_id / mother_id — ID references. Always both when known.

   father_name / mother_name — fallback text when no entry exists yet.

   father_research_notes / mother_research_notes — compiler notes on parentage
  uncertainty.


number_of_marriages

  Integer. 0 = confirmed never married. null = unknown.

  Layout signal: UI reads this first to reserve space for spouse boxes.


marriages

  One object per marriage in chronological order.

   marriage_number — 1, 2, 3 in sequence.

   spouse_id — required whenever a spouse is known. Must resolve to a real entry.

  Every spouse must have their own person entry, even if a stub.

   spouse_name — temporary fallback only while a stub is being created. Once the stub
  exists, spouse_name MUST be set to null . Both populated = schema violation (it
  suggests two different spouses).


    // After spouse stub I00555 is built:
    "marriages": [{
         "spouse_id": "I00555",
         "spouse_name": null       // ← REQUIRED once spouse_id resolves
    }]

   date_year / date_month / date_day — flat fields. Month/day default to 1 .

   location_city / location_county / location_state / location_country — flat fields.

   end_type — "death_of_spouse" , "death" (self died first), "divorce" , "unknown" , or
  null.

   end_year — year the marriage ended.

   children_ids — required on every marriage object even if [] . NEVER leave
  populated children listed only by name in notes; build them or stub them.

   officiant — null on 99.9% of entries. Keep the field.


education

  Array of education objects. Use for formal schooling.


    {
         "institution_id": "INST002",
         "school_name": null,
         "dates": "1955-1961",
         "type": "undergraduate",
         "notes": "A.B. in Far Eastern languages and history."
    }


  For institutions with an INST entry, populate institution_id and leave school_name
  null.

  For institutions without an INST entry (only one Hooker-tree person attended), populate
   school_name and leave institution_id null.

  Tags ( yale_graduate , harvard_graduate ) should also be applied when relevant.

  An INST entry exists only when 2+ Hooker-tree people are affiliated. (See §0.4 +
  §9.)


career

  Array of career objects. Field names: role , organization (NOT employer ), location ,
   start_year , end_year , notes .


    {
         "role": "First Minister",
         "organization": "Medfield, Massachusetts",

        "start_year": 1651,
        "end_year": 1691,
        "notes": "Also served as physician and schoolmaster."
    }


  Keep concise. Notes for context only.


  UX WIDTH RULE (v21 — RightColumn): education[] and career[] entries render as stacked
  lines in the NARROW right-hand column of the entry panel. Each line must read as a QUICK
  HIT — role / degree, organization / school, and year(s), nothing more. Long descriptive
  text overflows the column and is truncated with an ellipsis (…), so anything that needs
  real exposition does NOT belong in a career or education notes field. Move it to a
  narrative_block, where it reads as narrative. Treat notes as a terse qualifier only (a
  degree name, a one-clause role note) — never a sentence or paragraph — and keep the role
  and organization strings themselves short enough to render on one or two lines. Rule of
  thumb: if it doesn't fit a business card, it's an NB, not an array entry.


military_service

  Array. One object per conflict.


    {
        "war": "King Philip's War",
        "war_id": "WAR002",
        "rank": "Captain",
        "rank_start": "Ensign",
        "rank_end": "Captain",
        "rank_year_start": 1675,
        "rank_year_end": 1698,
        "unit": "Milford Militia",
        "notes": "Appointed ensign 1675. Rose to Captain 1698."
    }


  The war_id links to the wars array. Use the numbered top-level format ( WAR002 ,
  etc.) keyed to wars[] — never descriptive strings like WAR-WWII / WAR-KOREA (v19).

  Also add the person to soldiers_index and to relevant
   wars[n].battles[n].person_ids .


institutions

  Lightweight reference only. Full detail lives on the INST entry.


    {
        "institution_id": "INST022",
        "relationship": "alumnus",
        "years": "1800-1804",
        "institution_blurb": "Graduated Yale College 1804, class of Timothy Dwight."
    }


   relationship values: alumnus , founder , president , trustee , donor , faculty ,
   member .

   institution_blurb — one sentence shown in UI sidebar. No IDs visible.

  Bidirectional rule: When you add institution_id here, you MUST add this person’s ID
  to the INST entry’s hooker_connected_people (or person_ids for non-tree people).


landmarks


       { "landmark_id": "LM042", "landmark_blurb": "Built the estate in 1867 as his primary resid


  Bidirectional rule: Add person to LM entry’s hooker_connections array.


naming_inspiration

  Array. Documents when a name was chosen to honor an ancestor or family line.


       {
           "name_element": "Hooker",
           "inspired_by_id": "H00001",
           "description": "Middle name honors paternal great-great-grandfather Rev. Thomas Hooker."
       }


   name_element — the specific name being honored.

   inspired_by_id — ID if in tree. Null when honoring someone outside the tree (with
  description preserving the fact).

   description — 1-2 sentences, plain English, no IDs visible.


artworks


       { "artwork_id": "ART042", "role": "subject" }


   role — subject , creator , owner , donor .

  Bidirectional rule: Add person to ART entry’s person_ids array.


tags

  See §6 for the full canonical taxonomy.

  Only canonical tags from §6 are valid. Invented tags pollute the filter system.

  Past invented tags that are NOT canonical: ivy_league , democrat , republican ,
   philanthropist , arts_patron , vassar_alumna , moma_co_founder ,
   public_broadcasting , businessman , industrialist , benefactor , soldier ,

    irish_revolutionary , asian_studies , journalist_modern . (v18 removed publisher
   from this list — it is now canonical, see §6 ARTS/SCIENCE/PROFESSIONAL.) If a needed
   concept isn’t covered, propose addition to §6 — don’t silently add.


research_tags

Internal-only filter handles for compiler workflow. Same form as tags . UI-hidden.


cross_connections

   One object per connection. Most entries have zero.

    type — controlled values:

        cousin_marriage — two Hooker descendants who married each other

        double_descent — descends from Thomas Hooker through two separate lines

        mentor_student — documented teacher-student or patron-protégé

        civic_peer — served together in government, church, or civic institution

        civic_connection — specific documented civic event connecting two people

        military — served together in same battle or unit

        parallel_descent — both descend from Thomas; lives intersected without either
       knowing

        artifact — connected through specific object, document, or artwork

        hooker_talcott_convergence — Hooker and Talcott lines meeting in a single person

        parallel_careers — independently achieved the same notable distinction

        naming_pattern — one person clearly named to honor another

        family_orbit — used for is_easter_egg: true entries connecting via
       documented life events

        family_connection — family relationship the tree topology cannot show

        antinomian_controversy — specific to documented roles in the 1636-1638
       controversy

        amistad_connection — specific to documented roles in the 1839-1841 Amistad
       case

   NOT valid types: step-family, in-law, sibling, parent-child, spouse.

related_id — single ID only. Never an array.

display_label — ≤ 70 characters — a character budget, not a word count. The
grammatical predicate of a sentence whose subject is the linked person’s name
( link_text ). In the UI the card places link_text immediately before display_label ,
and the two MUST read as one complete, factual sentence: link_text +
display_label = a sentence. Begin it lowercase with a verb (it continues directly from
the name) and use no terminal period. One UI line — hook, not essay. No IDs visible.
The predicate states what the linked person did or the specific connecting event —
never the bare genealogical relationship between the two parties (which is already
encoded by type ).

    Worked example: on Rose Terry Cooke’s entry, the CC to Stowe carries link_text:
    "Harriet Beecher Stowe" and display_label: "defended Cooke's authorship
    against a Pennsylvania imposter" → renders as “Harriet Beecher Stowe
    defended Cooke’s authorship against a Pennsylvania imposter.”

    Write a predicate, not a noun-phrase: “was the Sixth Presbyterian pastor in
    Philadelphia, 1838–1861” (so “[Name] was the Sixth Presbyterian pastor…”) is
    correct; a bare label like “Sixth Presbyterian pastor” or a relationship like “uncle,
    pastor in Philadelphia” is wrong — neither forms a sentence after the name.

link_text — the linked person’s name as shown in the UI. It is the clickable subject of
the display_label sentence — the “[Name]” the predicate completes.

Always bidirectional. If A links to B, B must have a reciprocal entry linking back to A.

Minimum relational distance: approximately first cousin. Never between
parent/child, sibling, or spouse. Uncle/nephew and aunt/niece ARE valid distances
(clarified in v17 per Sam’s Stage 6Y-209a clarification — earlier ambiguity in v15-v16 led
some builds to incorrectly exclude these as too-close). The invalid set is exactly:
parent/child, sibling, spouse, in-law. All other collateral relationships (first cousins,
uncle/nephew, aunt/niece, more distant cousins) qualify when the connection itself is
substantive.

Real example of valid uncle/nephew CC (Stage 6Y-209a): TD0255 Rev. Joseph
Huntington Jones DD (1797-1868, pastor of Sixth Presbyterian Philadelphia 1838-1861,
six theological books) ↔ TD0240 Rev. John Sparhawk Jones (1841-1910, founding
pastor of Brown Memorial Baltimore 1870+, religious-books author). Joseph was Joel
Jones’s brother; John was Joel’s son — uncle/nephew. Both Philadelphia/Baltimore
Presbyterian pastors and authors with a ~30-year career offset; Joseph died 1868, two
years before John’s Brown Memorial 1870 founding. type: parallel_careers because
they shared profession + denomination + region but not the specific institution.

   EXCLUSION LIST (codified in v18, clarifying earlier ambiguity): §5 excludes from
   CCs exactly four direct-relationship categories — parents, siblings, children, spouses.
   All other collateral relationships qualify when the connection itself is substantive:

       Uncle / aunt / niece / nephew — ALLOWED

       Half-siblings (one shared parent) — ALLOWED

       Step-relations (step-parents, step-siblings) — ALLOWED

       All cousin levels and removed-cousins — ALLOWED

       Great-grandparent / great-grandchild (3+ generations of direct lineal descent) —
       ALLOWED

       In-laws beyond direct spouse (parents-in-law of an in-law, etc.) — ALLOWED

CC parent-to-parent pattern for cousin marriages (new in v18)

When two cousin-spouses marry, the cross_connection documenting the cousin marriage
MUST NOT be between the spouses themselves (they are spouses — excluded by the rule
above). Instead, the CC goes between the parents of the cousin-spouses — one parent on
each side of the marriage — with type: cousin_marriage . Each entry’s CC display_label
is a predicate completing the OTHER parent’s name ( link_text ), naming that parent’s child
and the marriage.

Worked example (Stage 6Y-306, H02424 ↔ HD3260): Caroline Shader (daughter of
H02424) married Thomas Harvey Hooker (son of HD3260).

   On H02424’s entry (linked person = HD3260, the groom’s father): display_label: "is
   the father of Thomas Harvey Hooker, who married Caroline Shader" → “[HD3260’s
   name] is the father of Thomas Harvey Hooker, who married Caroline Shader.”

   On HD3260’s entry (linked person = H02424, the bride’s mother): display_label: "is
   the mother of Caroline Shader, who married Thomas Harvey Hooker" → “[H02424’s
   name] is the mother of Caroline Shader, who married Thomas Harvey Hooker.”

Each label completes its OWN link_text (the other parent), so the two reciprocal labels
take opposite subjects. The cousin-spouses themselves get NBs (not CCs) describing their
own marriage as a cousin marriage. F23 codifies the failure mode of CCing directly
between spouses (or other excluded relationships).

naming_pattern CC for namesake-after-early-death (clarified in v18)

When a person is named after a relative who died young (replacement-naming pattern), the

relationship can be captured with naming_pattern CC type between the deceased and the
namesake — provided the relationship is NOT in the §5 exclusion list. Uncle/nephew is
allowed; parent/child is not (use naming_inspiration field instead per F17).

Worked example (Stage 6Y-311, HD1218 ↔ HD1238): Uncle HD1218 (1846-1858, died
London age 11) ↔ his maternal nephew HD1238 (1867-1932, given the same name and the
same II suffix nine years after his uncle’s death). Bidirectional naming_pattern CC captures
the namesake-after-early-death family pattern. Also pair with naming_inspiration field on
HD1238 pointing to HD1218.

Bidirectional CC example:

 // On HD1353 Rose Terry Cooke's entry — the card shows the linked name "Harriet Beecher Stowe
 { "type": "civic_peer", "related_id": "X02034",
    "display_label": "defended Cooke's authorship against a Pennsylvania imposter",
    "link_text": "Harriet Beecher Stowe" }
 // renders: "Harriet Beecher Stowe defended Cooke's authorship against a Pennsylvania imposte


 // On X02034 Harriet Beecher Stowe's entry (reciprocal) — the card shows the linked name "Ros
 { "type": "civic_peer", "related_id": "HD1353",
    "display_label": "had her authorship defended by Stowe against a pen-name imposter",
    "link_text": "Rose Terry Cooke" }
 // renders: "Rose Terry Cooke had her authorship defended by Stowe against a pen-name imposte


CC display_label form — the predicate of “[linked name] ___”

The display_label is governed by a character budget (70 characters), not a word
count, so it stays on one UI line. Write it as the predicate of a sentence whose subject is
the linked person’s name ( link_text ) — read it as “[linked name] ___” and confirm the
whole thing is a true, grammatical sentence. Begin lowercase with a verb; no terminal
period; never state the bare genealogical relationship between the two parties (that lives in
type ). Each direction completes its OWN link_text , so the two reciprocal labels take
opposite subjects:

   On Carroll L. Wainwright Jr.’s entry, linked to Walter Ewing Hope: "was also a lawyer
   to the Rockefeller family" → “Walter Ewing Hope was also a lawyer to the
   Rockefeller family.”

   On Judge James Hooker’s entry, linked to Nicholas William Stuyvesant: "married
   Catherine Reade, sister of Hooker's wife Helen" → “Nicholas William Stuyvesant
   married Catherine Reade, sister of Hooker’s wife Helen.”

The fragment names the shared connection or the OTHER person’s role — never the bare

genealogical relationship (that lives in type ). Still always bidirectional (an inverse
fragment on the other node), still ≥ ~first-cousin distance, still excluding parents /
siblings / children / spouses (the F23 exclusion set).


narrative_blocks

Ordered by relevance — most engaging content first. Phone renders 1-2; desktop renders
3-4.

       number — display order integer, starting at 1.

       category — career , military , education , religion , family , character ,
       politics , law , social_reform , death , legacy , marriage , crime , literature ,
       science , business , arts .

Header rule: 8 words maximum. The header’s only job is to hook. It does not summarize
— it creates a question.

✓ Hooks that ASK (compiler-approved):

   “Father forbade it — he married and stayed.”

   “Died one day before her husband.”

   “Twin sister murdered as Charles ran for Senate”

   “Did not know father was IRA general”

   “Named B. Dalton by replacing one letter”

   “Tearful TV plea saved his Senate seat”

   “Tore ACL freshman year, then Olympic medalist”

   “Arizona-born veteran died in his wife’s Paris”

   “Died in office, last day of mayoralty”

   “Liberty ship launched honoring his work, 1944”

   “Founded foundation at seventy-five, after losing daughter”

   “Born year mother Harriet Elding died, 1854 Peoria”

   Summaries that ANSWER (avoid):

   “WETA-TV chief; National Medal of Arts 2019”

   “Foreign Relations Chair 1981-1985”

   “Mayor of Morris New York until 1971” (just states a fact)

   “Two-time Olympian, 2014 + 2016 World Championship medalist” (a CV line)

   “Founded Seamen’s Church Institute, served thirty-eight years” (an achievement stat)

   “Virginia Military Institute graduate, Peoria city attorney” (a résumé bullet)

A summary fails the threshold test. Test: Does the header make the reader want to know
what happened? If it answers instead of asking, rewrite.

Body rule:

   2 sentences is the ideal. 3 sentences is permitted when narrative completeness
   requires it. A 3-sentence body is appropriate when the third sentence provides a
   closing consequence, biographical resolution, or contextual fact that would be
   meaningfully lost by omission. It is not a license to pad.

   Practical guideline:

       1–2 sentences: preferred for concise, punchy entries

       3 sentences: acceptable when narrative arc requires it (setup → event →
       consequence)

       4+ sentences: never permitted — move content to research_notes

   Written for a general history reader. No IDs. No genealogical notation.

   Compiler gotcha — single-letter middle initials (new in v15): Periods after single-
   letter middle initials (e.g., “Harriet A. Mansfield was born…”) read as sentence
   boundaries to regex-based sentence counters, inflating apparent body sentence count
   to 4 when the body has 2 actual sentences. In NB bodies, drop single-letter middle
   initials. Keep them in display_name (for disambiguation) and research_notes (no
   length cap).

Threshold test: Does this block tell the user something the tree structure cannot show?

   Fails: “He attended Yale College” — the institution link shows this.

   Passes: “He graduated Yale in 1805 alongside future Senator Calhoun, then stayed thirty
   years as a professor of medicine.”

Perspective rule: Is this person the subject of this block? If the block is primarily about a
relative, move it to that person’s entry.

Bio Data Extraction Rule — every time biography text is pasted into a build session,
narrative_blocks MUST be extracted before moving to the next entry. Priority order:

1. Violent or dramatic deaths

2. Documented personal conflicts

3. Specific acts with dates and witnesses

4. Patents, inventions, founding acts

5. Geographic migrations with documented reasons

6. Notable relationships with people outside the tree

If the assistant finds itself wanting to write 4+ sentences, the content goes in
research_notes , not in a narrative_block.


NB writing practice refinements (new in v17)

These are not new rules — they are refinements of style derived from NBs that worked well
across the v16-era build sessions (Stages 6Y-200 through 6Y-214). Apply them as defaults
rather than absolutes; the existing 8-word header rule and 2-3 sentence body rule still
govern.

(a) Numbers spelled out in body, digits for calendar dates. Bodies read more humanly
when ages, counts, and durations are spelled out — “lived to ninety-three”, “left seven
children”, “after sixty-seven years of marriage”, “outlived her husband by forty-eight years.”
Calendar dates stay numeric — “November 22, 1909”, “Sept 25 1888”. The exception
protects date-precision and date-search; the rule protects narrative voice.

(b) Two-NB pattern for substantive entries. Major figures (lifespan + career + family arc)
often warrant two NBs rather than three or four. Pattern that worked well: (1) a
temporal/identifying hook surfacing the entry’s most distinctive arc; (2) a thematic hook
surfacing a family-context or consequence pattern. Example pair on TD0289 Roberta
Huntington Cox (1909-2008): NB1 “Born and died November 22, ninety-nine years apart” +
NB2 “Assistant Postmistress at Luther Oklahoma forty-one years.” First NB anchors the
demographic outlier; second NB anchors the multi-generation family-business pattern.

(c) Temporal coincidence is strong NB material. Born and died on the same calendar day;
deaths within the same year as a parent or spouse; marriage at the same age as a spouse;
multiple siblings dying in the same year (epidemic signature). These coincidences fail the
threshold test of “could a reader derive this from the structured fields alone” — they’re
observations only a narrative block can surface. Examples: I01149 Sarah Edwards
Huntington “Died exactly one month before husband Henry, 1895”; TD0289 Roberta Cox
“Born and died November 22, ninety-nine years apart”; H01409 Capt Henry Hooker
“Married at seventeen, first child at eighteen.”

(d) Closing-consequence sentence. When a 3-sentence body is justified, the third
sentence typically carries a downstream consequence or biographical resolution that the
structured fields cannot show. Example on TD0260 Septimus George Huntington NB1
“Removed 1819 from Connecticut to Shelby County Indiana”: setup (the 1819 removal) →
context (Indiana statehood 1816, the Yankee wave) → consequence (“Six children born
between 1811 and 1825 followed him west; he died at his Shelby County residence July 20,
1844”). The third sentence ties the migration to the family’s downstream arc.

(e) Avoid relational genealogical terms in display_label of CCs and NBs. The relational
link (uncle, nephew, cousin) is already encoded as a CC type; the display_label should be
the predicate stating what the linked person did or the connecting event. As a predicate
completing the linked name, “founded Brown Memorial in Baltimore and later pastored
Calvary in Philadelphia” (so “[Name] founded Brown Memorial…”) beats the bare
relationship “uncle of John Sparhawk Jones.” See §5 cross_connections refinements above.

NB writing practice — additional refinements (new in v18)

These refinements emerged from the pilot128 chat session (Stages 6Y-284 through 6Y-
312) and codify principles already implicit in earlier rules.

(f) Relevance ordering. NBs within an entry MUST be ordered by relevance — most
distinctive/notable first, generic dates/age/birthplace information LAST. The first NB the
user sees should be the most compelling fact about the person.

   Bad: NB#1 birth/death dates → NB#4 “killed by shark in West Indies”

   Good: NB#1 “Killed by shark in West Indies” → NB#4 birth/death dates

Sam directive Stage 6Y-291.

(g) Fourth-wall rule — no source attribution in NB bodies. NB bodies narrate the
PERSON, never the source. Source-attribution language is invisible to the user and breaks
immersion.

Forbidden phrases in NB bodies (non-exhaustive):

   “Edward Hooker described…” / “EH…” / “1909 genealogy…”

   “The Brockett Genealogy…” / any named source like “Frost Family genealogy” / “Dwight
   Genealogy”

   “WikiTree gives…” / “FindAGrave records…” / “FamilySearch lists…”

   “Hofstra source…” / “UVM source…” / “Cornell Collection…” / “per BIB001”

   “per Wikipedia…” / “Grokipedia notes…” / “Military Wiki…” / “per UPI Archives”

    “per family records” / “documented only by initials”

    “misrecorded” / “misrecord” (describes the source’s error, not the person)

    “Contemporary biographer X wrote…” (borderline — use sparingly only when the
    biographer is themselves a tree figure central to the story)

Source attribution lives in research_notes only. RN is compiler workspace, not user-
visible. F22 codifies the failure mode. Sam directive Stage 6Y-296.

(h) Subject discipline. NBs are always about the entry’s subject. “Entries are always
about themselves. An entry doesn’t have an NB about somebody else — it’s about
them.” (Sam directive Stage 6Y-306.)

Mentions of family members (parents, siblings, children, spouses, cousins) are allowed as
context that illuminates the entry’s subject. But the NB’s narrative center of gravity must be
the subject themselves, not a relative.

    Bad NB on Person X: body that is primarily about Person Y, with X as background

    Good NB on Person X: body about X’s life event, with Y as illuminating context

This extends the existing v15 “Perspective rule” (§5 NB) and the v15 §0.10 “each entry
stands on its own merit.”

(i) Success framing — don’t center failure when outcome succeeded. When the
documented outcome was successful, NB header and lead-in must center the
success/prescience, not an anecdotal failure or community misjudgment along the way.

    Bad header: “Built turbine model friends laughed at” (centers community failure)

    Good header: “Anticipated turbine engines used later in ocean liners” (centers
    prescience)

The friends-laughed-at anecdote can remain in the body as personal-color context, but it
should not dominate the framing when the underlying outcome was vindication. Sam
directive Stage 6Y-303 on HD1296 Frederick Howard Pierpont.

(j) Validation edge cases — abbreviations that trigger false-positive sentence splits.
The validation sentence-counter splits on [period] [Capital] boundaries. The following
patterns trigger false-positive sentence counts and should be avoided in NB body text:


  Pattern                    Why it splits falsely                                 Fix

  v. followed by capital                                                           Use
                             lowercase v not in abbreviation handler list
  (legal citation)                                                                 versus

  p. followed by capital      same                                                   Use
  (page reference)                                                                       page


  W. in street names          uppercase-initial handler catches normally, but        Use
  (“528 W. Peachtree”)        failed when followed by sentence-capital                   West


                                                                                     Use
  m. for “married”
                              lowercase m not in list                                    married
  followed by Capt etc.
                                                                                     verb


Sam directive Stage 6Y-307 (HD3775 “Werner v. Werner” caught).

(k) Internal ID leak — additional reinforcement. When NBs reference relatives by
description, they must NEVER include the H/HD/I/X/T/TD/INST/CEM/LM/etc. ID in the body
text. Refer to relatives by name only.

      Bad: “Both sons of HD2683 dead within three months”

      Good: “Both Ransom sons dead within three months”

F20 already covers this; the v18 reinforcement is to extend it explicitly to relative-
disambiguation cases. Sam directive Stage 6Y-303.

Worked NB extraction example. Source biography paragraph:

   “Throughout his life John loved jazz music, and was a gifted pianist. After graduating
   from Princeton, he spent a year living in Paris, France where he played jazz piano at Les
   Deux Magots.”

Extracted NB:

  {
      "number": 1,
      "category": "character",
      "header": "Played jazz piano at Paris Les Deux Magots",
      "body": "After graduating from Princeton he spent a year in Paris playing jazz piano at Les
  }


What stays in research_notes (no length cap): full chronology, dates, schools attended,
military service details, full career arc, family details, source citations.

What does NOT become an NB: “He attended Princeton” — covered by the institution link,
fails the threshold test.

NB header tone calibration (new in v19)

The NB header is the alluring layer — it must earn a click without cheapening the
scholarship. Calibrate between two failure poles:

    Too dry (a Wikipedia section heading): “Career” / “He worked at Life magazine” —
    accurate but inert; a reader has no reason to open it.

    Too lurid (tabloid): “Hart family burns alive, so he becomes priest” — sensational, grim,
    and cheap; it mistakes shock for interest.

The target sits between: a specific, true hook that creates curiosity — more alluring than
a Wikipedia heading, but never obscure or tabloidy. Use a concrete detail, a turn, or a
tension; not a summary, not a logline. Still ≤8 words, still no source attribution, still never a
relational/genealogical statement (CCs and the tree carry relationships).

Calibrated examples — the register to hit:

    “He rode with the Mercury astronauts for Life”

    “He sang about his kids; they sang back”

    “At eight, he stowed away to sail home”

    “His widow later married his fellow passenger”

    “From OSS spy to the U.S. Congress”

    “She led a telecom’s lawyers without a degree”

Each names a specific, verifiable hook and stops. The body (2–3 sentences) then delivers
the substance the header promised.


The Jalapeño Rule (entry creation discipline)
Create entries only for:

    Hooker blood descendants → H or HD prefix

    Direct spouse of an H/HD person → I prefix (or X if pre-existing)

    Notable parent of a spouse → X prefix, is_easter_egg: true

    Orbit entry (multiple documented Hooker connections) → X prefix, is_easter_egg:
    true

Do NOT create entries for nephews of spouses, cousins of in-laws, half-siblings of spouses,
grandchildren of non-Hooker spouses. These connections live in the parent’s
narrative_blocks and research_notes .

Compiler override: Sam can override the Jalapeño Rule for specific entries when the

project benefits. When in doubt, ask before building.

Borderline-case example. When building Sharon Percy Rockefeller’s family, the assistant
built four extra Percy siblings (X02345 Valerie, X02346 Roger, X02347 Gail, X02348 Mark)
— siblings of a Hooker spouse. Per Jalapeño Rule, only Sharon herself qualified. The four
were deleted. The fix point is before building: ask “is this person a Hooker descendant, a
direct spouse, or a notable parent of a spouse? If none of those, don’t build.”


quotes

     Only documented, sourced quotes. Never paraphrase.

     text — exact quote, fully written out. Quotes BY the person preferred over quotes
     about them.

     attribution — who said it and context: “Thomas Hooker’s Will, 1647”.

     category — war , family , religion , politics , law , character , legacy .

     source_url — where the quote can be verified.


sources / research_sources — Sources Decision Tree


 Does it have a URL I can click?
 │
 ├── YES → goes in `sources` as a display source
 │            { "label": "Bristol Historical Society — Hooker records",
 │                "url": "https://bristolhistory.org/hooker-records" }
 │            NOT acceptable: FindAGrave, WikiTree, Ancestry user trees
 │            Maximum 2-3 display sources per entry
 │
 └── NO → Is it a known book or archival source in the bibliography?
              │
              ├── YES → goes in `research_sources` by bib_id
              │           { "bib_id": "BIB001" }
              │           Never displayed. Internal citation record only.
              │
              └── NO → goes in `research_notes` as plain text note


The H-prefix ID already encodes the EH 1909 entry number. H00262 = EH entry 262.


research_notes

     String. The compiler’s research record.

     Never displayed in UI. Never deleted. Never shortened. Never modified by scripts.

   Contains: birth/death details, source citations, relationship notes, open questions,
   discrepancy flags, content that does not fit the 3-sentence NB body limit.

   This is the safety net. All data recovery happens from here.

   Genealogical shorthand acceptable.


INVALID FIELDS — never use on person entries
Legacy artifacts. Remove whenever encountered:

occupation , age_at_death , military (top-level — use military_service array),
prominent_name_reason , media , is_spouse_of_descendant (inside classification), notes
(inside name/bio object — use research_notes instead), primary_url (top-level — must live
under notable ), children (array of child objects — children belong in
marriages[n].children_ids as IDs only), children_summary , inheritance_from_father ,
fenn_family_connection , spouse_notes (inside marriage object), residences (plural),
ancestor_of_notable , writings_by_subject , anecdotes (as structured object),
name_origin , ministry_positions (use career ), primary_documents (use
quotes/narrative_blocks/documents), fath_research_notes / moth_research_notes
variants, careers (plural — singular career only), employer (use organization inside
career objects).

Also invalid inside classification : notes , is_spouse_of_descendant . Also invalid inside
burial : visitable , has_marker , notes (use plot_notes ). Also invalid inside death :
age_at_death , notes , location (nested object — use flat fields). Also invalid inside
birth : date (nested), location (nested), type (use baptism object instead),
has_discrepancy (use research_notes). Also invalid inside marriage : date (nested),
location (nested), notes (use research_notes on the person entry).


## 6. TAG TAXONOMY
Tags are named subsets used for filtering and exhibit curation. Tags are applied to person
entries only. Every tag must have a clear definition. Only canonical tags listed below are
valid. Invented tags are a schema violation.


DEATH CAUSE TAGS
died_in_infancy — died before age 2 died_in_childhood — died between ages 2–12
died_young — died before age 30 died_unmarried — reached adulthood but never married
lost_at_sea — died at sea, cause unknown or ship lost drowned — drowned in a body of

water other than open ocean killed_in_action — died in combat during a documented
war killed_in_duel — died in a formal duel died_in_childbirth — died as a result of
childbirth or complications died_as_prisoner_of_war — died while held as a prisoner of
war unusual_death — cause was unusual, accidental, or historically notable
epidemic_death — died during or likely as result of a documented epidemic
pandemic_death — died during or as a direct result of a documented pandemic (1918
influenza, COVID-19, etc.); use in addition to epidemic_death when the specific event is a
pandemic-scale outbreak. The 1918 influenza is the most common case in this tree.
suicide — died by suicide titanic — was aboard RMS Titanic empress_of_ireland —
was aboard SS Empress of Ireland unsolved_crime_victim — victim of an unsolved
homicide


MILITARY TAGS
revolutionary_war — served in the American Revolutionary War civil_war — served in
the American Civil War confederate — served in the Confederate Army navy — served in
the U.S. Navy (peacetime or war) marine_corps — served in the U.S. Marine Corps
(peacetime or war) wwi — served in World War I wwii — served in World War II
mexican_american_war — served in the Mexican-American War (1846-1848)
spanish_american_war — served in the Spanish-American War (1898) korean_war —
served in the Korean War (1950-1953) vietnam_war — served in the Vietnam War
war_of_1812 — served in the War of 1812 second_seminole_war — served in the Second
Seminole War (1835-1842) pequot_war — served in the Pequot War (1636-1638)
king_philips_war — served in or significantly affected by King Philip’s War (1675-1676)
king_williams_war — served in or affected by King William’s War (1689-1697). Distinct
from the French and Indian War. french_indian_war — served in the French and Indian War
(1754-1763) medal_of_honor — recipient of the Medal of Honor silver_star — recipient
of the Silver Star (the U.S. Armed Forces’ third-highest military decoration for combat valor)
flying_cross — recipient of the Distinguished Flying Cross (awarded for heroism or
extraordinary achievement in aerial flight) air_medal — recipient of the Air Medal (awarded
for meritorious achievement in aerial flight, typically combined with flying_cross on
entries who earned both) bronze_star — recipient of the Bronze Star Medal air_force —
served in the U.S. Air Force (or U.S. Army Air Corps / Army Air Forces pre-1947) army —
served in the U.S. Army (use with specific war tag; distinguishes from navy and
marine_corps ) spy — documented intelligence operative loyalist — Tory or British
sympathizer in Revolutionary War


FOUNDING / EARLY-AMERICAN TAGS
hartford_founder — among the founders of Hartford CT farmington_founder — among

the founders of Farmington CT milford_founder — among the founders of Milford CT
massachusetts_bay_founder — among the founders of Massachusetts Bay Colony
princeton_founder — among the founders of Princeton or Princeton University
town_founder — founder of any other town great_migration — emigrated to
Massachusetts Bay 1620–1640 seven_pillars — one of the seven pillars of First Church of
Christ Hartford 1636

NOTE: First Church of Milford (1639) also had seven pillars but a different group — use
milford_founder for them.


MIGRATION TAGS
vermont_migration , ohio_migration , canada_migration , nova_scotia_migration ,
argentina_migration , california_migration , new_york_migration ,
illinois_migration , mississippi_migration , georgia_migration , indiana_migration ,
florida_migration , idaho_migration , michigan_migration , minnesota_migration ,
kansas_migration , washington_migration , louisiana_migration , texas_migration ,
oregon_migration , arkansas_migration , wisconsin_migration , montana_migration ,
westward_migration (when specific state unknown)

pennsylvania_migration — migrated to Pennsylvania as a significant life move (common in
this tree for Crawford/Erie/Venango County branches) massachusetts_migration —
migrated to or within Massachusetts as a significant life move (common for the
Ellis/Stiles/Lyman Springfield-Northampton branches) connecticut_migration — migrated
to Connecticut as a significant life move (most common for the foundational Hartford-era
families) new_hampshire_migration — migrated to New Hampshire as a significant life move
missouri_migration — migrated to Missouri as a significant life move (documented in the
Lybarger-Young branch, 1920s St. Louis births) oklahoma_migration — migrated to
Oklahoma as a significant life move (new in v17 — documented in the Huntington Sugar
Creek Township IN → Luther/Norman/Guthrie/Edmond OK branch, late 19th and early 20th
century; pairs naturally with indiana_migration on entries who made the multi-step CT →
IN → OK arc) iowa_migration — migrated to Iowa as a significant life move (new in v20 —
Iowa was the one common destination missing from the enumerated per-state list;
documented across the Hart Berlin→Iowa and Parishville→Iowa branches, including
Sherman Hart’s 32nd Iowa Infantry Civil War service; ~18 entries. Sam directive, Stage 6Y-
462.)


RELIGION / BELIEF TAGS
minister — ordained minister or pastor clergy — ordained religious leader (broader)
deacon — ordained deacon missionary — documented foreign or domestic missionary

hawaii_mission_era — participated in the Hawaiian mission (ABCFM, 1820–1870) shaker
— member of the Shaker community episcopal — member or convert of the
Episcopal/Anglican church freemason — documented Masonic lodge member catholic —
member or convert of the Roman Catholic Church (new in v18 — parallel to existing
episcopal , shaker , freemason denominational tags; use alongside clergy , minister ,
missionary as appropriate; first applied to HD5094 Sr Priscilla Edwards Snell of the Adrian
Dominican Sisters, Michigan) universalist — member or adherent of the Universalist
church / Universalist religious views (new in v20 — parallel to the existing episcopal ,
shaker , freemason , catholic denominational tags; documented across three generations
of the Berlin/Kensington Hart family: Capt. Samuel Hart H00281, his son Hon. Capt. Samuel
Hart the state senator H00583, and son-in-law Orrin Lee X01043 and grandson Orren Hart
Lee HD0738. Sam directive, Stage 6Y-460.)


ACADEMIC / INSTITUTIONAL TAGS
yale_connection — documented Yale connection (student, faculty, trustee, donor) — use
when not a graduate yale_graduate — graduated from Yale College or Yale University
yale_president — served as President of Yale yale_founder — documented role in
founding Yale University yale_trustee — served on Yale Corporation as trustee
skull_and_bones — member of the Yale Skull and Bones senior society harvard_graduate
— graduated from Harvard College or Harvard University harvard_founder — documented
role in founding Harvard College academic — professional academic, professor, or scholar
educator — teacher or school administrator librarian — professional librarian, library director, or person for whom a library or major collection is named; the defining-role tag for career library leadership (new in v21 — first applied to Edgar Weld King HD6195, longest-serving director of Miami University's libraries and namesake of its King Library; apply alongside educator / academic where appropriate. Sam directive, Stage 6Y-638.)


SOCIAL / POLITICAL TAGS
governor — served as governor of a U.S. state or colonial governor senator — served as
U.S. Senator congressman — served as U.S. Representative mayor — served as mayor of a
city or town (new in v17 — Joel Jones TD0239 documented Mayor of Philadelphia 1849-
1851; use alongside politician for full filter coverage) president — served as President
of the United States vice_president — served as Vice President of the United States
continental_congress — served in the Continental Congress diplomat — served in a
formal diplomatic role general — served as General or Brigadier General judge — served
as a sitting judge of a court justice — held a distinct judicial office not covered by judge
— e.g., justice of the peace (canonical in v19; justice and judge are different offices and
may both apply or apply separately) federal_judge — appointed to a U.S. federal court
(district court, court of appeals, or Supreme Court) (new in v17 — TD0249 William
Huntington Kirkpatrick Coolidge appointee to Eastern District of Pennsylvania 1927-1970,
Chief Judge 1948-58, the last Coolidge-appointed active federal judge; use alongside
judge when the bench is federal-level specifically) lawyer — practiced law professionally

politician — held elected or appointed political office (use when no more specific tag
applies) abolitionist — actively worked to abolish slavery slaveholder — documented
owner of enslaved people underground_railroad — documented Underground Railroad
participant suffragist — advocated for women’s right to vote womens_rights —
advocated for women’s rights broadly civil_rights — participated in the civil rights
movement pacifist — documented advocate for pacifism or organized peace movement
temperance — documented temperance movement participant indigenous_rights —
documented advocate for Indigenous peoples’ rights


ARTS / SCIENCE / PROFESSIONAL TAGS
author — published author of books or significant writings journalist — professional
journalist or correspondent artist — a professional or notably accomplished artist in any
creative medium (visual art, music, performance, etc.); not restricted to the visual arts.
Apply a more specific subtype tag as well where one fits (e.g., painter , musician ).
painter — painter specifically (subtype of artist ; use when the subject is documented
primarily as a painter, e.g., a portraitist or miniaturist) (new in v19 — de-facto used on artist
entries since earlier stages; formalized in v19) architect — professional architect
musician — professional or notably accomplished musician engineer — civil, military, or
mechanical engineer inventor — documented inventor with patents scientist —
professional scientist or researcher mathematician — professional mathematician or
mathematics professor physician — licensed medical doctor psychiatrist — physician
specializing in psychiatry (new in v19 — distinct from the general physician tag) banker
— primary career in banking (bank president, investment banker, trust officer, etc.) —
excludes director-only roles where another career was primary merchant — primary career
as a merchant, shopkeeper, or trader (especially relevant for colonial and pre-industrial
commercial activity) publisher — primary career as newspaper or book publisher, editor,
or proprietor of a publishing firm (new in v18 — distinct from journalist (writes content)
and author (writes books); publisher is the proprietor/business owner of the publishing
enterprise. Several Hooker descendants ran newspaper or book-publishing businesses:
HD0867 Rev. Joshua Leavitt founded the abolitionist Emancipator; HD1846 George Lyman
Ingersoll’s firm Sauver & Ingersoll published among the earliest books in Ohio; HD3287
Hope Aldrich Rockefeller; HD04879 Richard Hooker. Note: F5 previously listed publisher
as non-canonical; v18 supersedes that and removes it from the F5 example list. Sam
directive Stage 6Y-301.) rancher — operated a ranch as primary career (cattle, sheep, or
other livestock) (new in v17 — for future-stage cases as the western branches are built out;
distinguishes from merchant and from generic farming) postmaster — appointed
postmaster or postmistress of a U.S. post office (new in v17 — I01153 Belle Sellman
Huntington documented Postmistress of Luther Oklahoma post office; TD0289 Roberta
Huntington Cox documented Assistant Postmistress of Luther OK 41 years; gender-neutral

tag covering both roles) city_planner — professional urban planner or town designer
diarist — kept a diary or journal of historical significance letter_writer — known for
significant correspondence theologian — professional theologian or religious scholar
railroad — career or significant role in railroad industry collegiate_athlete — varsity
college athletics at notable level pro_athlete — competed professionally in a sport
olympian — competed in the Olympic Games gold_medal — won an Olympic gold medal
(use with olympian ) environmentalist — documented environmental activist or
conservationist nobel_prize — laureate or co-recipient of a Nobel Prize in any category (Physics, Chemistry, Physiology or Medicine, Literature, Peace, Economic Sciences). An award/honor tag in the same family as the military-decoration tags (medal_of_honor, silver_star) and the Olympic tags (olympian, gold_medal); always pair it with the relevant career tag (scientist, author, etc.). New in v21. Sam directive.


GENEALOGICAL PATTERN TAGS
named_for_hooker — given name includes “Hooker” or another Hooker-family name to
honor replacement_naming — named after a sibling who died young
double_hooker_ancestry — descends from Thomas Hooker through two separate lines
hooker_talcott_convergence — the specific person where both Hooker and Talcott lines
meet cousin_marriage — married a Hooker-tree cousin extraordinary_longevity — lived
past age 90 (strictly: died at age 91 or older) adopted — adopted child; not a blood
descendant of the adopting parent(s) extraordinary_story — entry has an unusual or
compelling narrative defying easy categorization (requires a narrative_block)
moral_complexity — entry involves documented morally complex history requiring careful
editorial handling


FAMILY LINEAGE TAGS
For named family lineages with clustered entries in the tree. Use sparingly — only for
surname dynasties where 4+ entries share a meaningful family identity that filtering on this
tag would surface usefully.

rockefeller_family — descendants and immediate family of the Rockefeller dynasty
connected to the Hooker tree via Blanchette Ferry Hooker Rockefeller (HD3284)
percy_family — Percy family members connected via Sen. Charles Harting Percy (X02328)
hooker_family — direct surname-Hooker descendants where surname identity is research-
relevant beyond simple H-prefix membership talcott_family — direct surname-Talcott
descendants where surname identity is research-relevant

Rule: A family lineage tag does NOT replace structural data (parents, marriages,
classification). It is an additional filter handle for exhibit-curation purposes only.


RESEARCH / DATA QUALITY TAGS (internal only)
not_yet_fully_entered — stub entry, incomplete data identification_uncertain —
identity not confirmed parentage_unverified — parent-child relationship not confirmed by

primary sources ghost_ancestor — placeholder entry whose existence is inferred but
unconfirmed data_quality_uncertain — known reliability issues has_discrepancy —
conflicting information between sources source_conflict_gender — sources disagree on
gender eh_attribution_error — Edward Hooker 1909 contains a known error
duplicate_entry — known duplicate of another entry needs_research — flagged for
additional research dna_confirmed_2018 — paternity/maternity confirmed by DNA evidence
unacknowledged_by_burr — Aaron Burr did not publicly acknowledge this person as his
child reputed_biological — biological relationship reported but not confirmed


COMPILER TAGS (personal research use)
compiler_ancestor — confirmed ancestor of Sam compiler_adjacent — closely
connected to compiler’s line but not direct ancestor compiler_line_eliminated — line
does not lead to compiler outreach_target — potential living contact for genealogical
outreach outreach — outreach attempted living_contact — confirmed living contact
established living_possible_contact — may be a living person; handle with privacy
sensitivity living_or_recent — born after 1920 or recently deceased; display with privacy
sensitivity


DEPRECATED
orbit_non_descendant — RESOLVED. Use is_easter_egg: true on classification instead.
Do not apply.


## 7. WARS ARRAY
Top-level array. Stores wars with nested battles and person IDs.

  {
      "id": "WAR002",
      "name": "King Philip's War",
      "dates": "1675-1676",
      "battles": [
          {
              "id": "BTL002",
              "name": "King Philip's War campaigns",
              "date_year": 1675,
              "location": "New England",
              "notes": null,
              "person_ids": ["H00007", "H00008"]
          }
      ]

 }


When adding a person to a war, also:

1. Update the person’s military_service array.

2. Add the person to soldiers_index .

3. Add the person ID to the relevant wars[n].battles[n].person_ids array.


## 8. DOCUMENTS ARRAY
Top-level array. Stores primary-source documents (deeds, wills, letters, etc.) referenced by
entries.


 {
     "id": "DOC001",
     "title": "1733 deed — Sue Squa to John Talcott",
     "type": "deed",
     "year": 1733,
     "location": "Hartford CT",
     "summary": "...",
     "person_ids": ["T00012", "T00013"],
     "source_url": "...",
     "transcription": null,
     "notes": null
 }


Person entries reference documents by ID in their documents array.


## 9. INSTITUTION ENTRY SCHEMA

 {
     "id": "INST022",
     "primary_name": "Yale University",
     "secondary_name": "Yale College",
     "type": "university",
     "founding_year": 1701,
     "location": {
       "city": "New Haven",
       "county": "New Haven",

          "state": "Connecticut",
          "country": "United States"
     },
     "primary_persons": ["H00057"],
     "hooker_connected_people": ["H00057", "H00059", ...],
     "person_ids": [],
     "wikipedia_url": "...",
     "primary_url": "https://www.yale.edu",
     "notes": "..."
 }


Creation threshold: Create a new INST entry only when 2+ Hooker-tree people are
affiliated. Single-person affiliations live in the person’s education[].school_name or
career[].organization field, never as an INST.

Bidirectional rule: Every institution_id reference in a person’s institutions[] array
must have that person ID in the INST’s hooker_connected_people (or person_ids for non-
tree people).

Schema drift note: Some older INST entries use nested location and founded objects;
many use flat fields. The build is tolerant of both. Match existing structure when updating.


## 10. CEMETERY ENTRY SCHEMA

 {
     "id": "CEM001",
     "name": "Center Church Cemetery",
     "city": "Hartford",
     "state": "Connecticut",
     "country": "United States",
     "gps": null,
     "founded": 1640,
     "wikipedia_url": null,
     "primary_url": null,
     "hooker_connections": ["H00001", ...],
     "notes": "..."
 }


Bidirectional rule: Every burial.cemetery_id reference must have that person ID in the
cemetery’s hooker_connections array.

## 11. LANDMARK ENTRY SCHEMA

 {
     "id": "LM042",
     "name": "Center Church Hartford",
     "type": "church",
     "city": "Hartford",
     "state": "Connecticut",
     "country": "United States",
     "address": "...",
     "built_year": 1640,
     "gps": null,
     "photo_url": null,
     "wikipedia_url": null,
     "primary_url": null,
     "hooker_connections": ["H00001", ...],
     "notes": "..."
 }


Bidirectional rule: Every landmarks[].landmark_id reference must have that person ID in
the LM’s hooker_connections array.

GPS format: decimal degrees only. DMS coordinates must be converted.


11.5 OUTREACH CONTACTS SCHEMA (new in v15)
Top-level array. Stores external contact endpoints for outreach about specific tree entries —
WikiTree profiles maintained by family members, FindAGrave contributor pages, family-
foundation websites, etc.

Why a top-level array (not a per-entry field): One outreach contact often connects to
multiple tree people — a WikiTree profile maintained by a relative may cover a whole branch;
a family historian’s webpage may reference several entries. Storing at the top level lets the
UI render an outreach panel as its own feature and lets one contact link to many people
without duplication.

 {
     "id": "OUT001",
     "name": "Kate (Allen) Brennan",
     "platform": "WikiTree",
     "url": "https://www.wikitree.com/wiki/Brennan-4880",
     "person_ids": ["HD4047"],

      "contact_role": "subject_profile",
      "notes": null
  }


Fields:

      id — sequential OUT001–OUT999.

      name — display name for the contact (often the tree person whose profile this is).

      platform — controlled values: WikiTree , Ancestry , FamilySearch , FindAGrave-
      contributor , family_website , foundation_website , social_media , other .

      url — full URL to the contact endpoint.

      person_ids — array of tree person IDs this outreach connects to. Always present. One
      outreach can link to multiple people.

      contact_role — controlled values: subject_profile (the URL is about the tree person
      themselves), family_historian (the URL belongs to a relative who researches the
      family), descendant_contact (a living descendant willing to be contacted),
      institution_contact (foundation, museum, archive that holds material on the person).

      notes — free text.

Bidirectional rule: No reciprocal field on the person entry (this is a one-directional
reference designed to keep the person entry uncluttered). When adding an outreach
contact, note its existence briefly in the person’s research_notes so future compilers can
find it from either direction.

Relationship to sources : A WikiTree or similar URL used purely for outreach goes in
outreach_contacts only. A WikiTree URL that contributed factual content to the entry
should ALSO appear in the person’s sources array with the URL labeled as a low-priority
source (per §0.8).


## 12. NOTABLE STORIES SCHEMA
Top-level array of curated multi-entry narratives that span the dataset. Used for the site’s
exhibits and longer-form content.

ID format (v19): notable_story IDs are canonically descriptive snake_case (e.g.,
bristol_ingersoll_friendship , trowbridge_ingersoll_scandal_1889 ), NOT the legacy
STORY### form shown in the example below. The 541 existing stories use descriptive IDs —

match them; do not renumber.


 {
     "id": "STORY042",
     "title": "...",
     "summary": "...",
     "person_ids": [...],
     "themes": [...]
 }


## 13. SOLDIERS INDEX SCHEMA
Flat array of every person in the tree with documented military service.


 {
     "person_id": "HD2156",
     "name": "Robert Huntington Knight",
     "rank": "Second Lieutenant",
     "war_id": "WAR008",
     "war_name": "World War II",
     "unit": "United States Army Air Corps",
     "years": "1940-1945",
     "notes": "Commissioned upon Yale graduation 1940."
 }


Every person with a military_service array entry must also appear here. A person who
served in two wars needs one entry per war. (v19 known repairs to verify: HD5193 Thomas
Whitman Ingersoll; HD5194 Lieut. John Charles Ingersoll — WWII + Korea, two entries;
X02894 Zadock Pratt — War of 1812.)


## 14. POLITICAL OFFICES INDEX SCHEMA
Flat array of every person who held documented political office.


 {
     "person_id": "HD2153",
     "name": "Thomas M. Debevoise 2d",
     "office": "Vermont Attorney General",
     "start_year": 1960,
     "end_year": 1962,

       "party": "Republican",
       "jurisdiction": "Vermont",
       "notes": null
  }


## 15. BIBLIOGRAPHY SCHEMA

  {
       "id": "BIB001",
       "title": "...",
       "author": "...",
       "year": null,
       "publisher": null,
       "url": null,
       "notes": null
  }


Person entries reference bibliography by bib_id in research_sources (never displayed in
UI).


## 16. HOOKER-TALCOTT MERGE RULE
The Hooker line and Talcott line are tracked as parallel tree systems and merge repeatedly
through intermarriage. The compiler descends from both.

Convergence handling:

       A person with both Hooker and Talcott descent carries both is_thomas_descendant:
       true and is_talcott_descendant: true .

       The hooker_talcott_convergence cross-connection type and the
       hooker_talcott_convergence tag flag the specific merge points.

       Path calculation favors the shortest path through either line.


## 17. UX DATA CONTRACT
The data fields each drive specific UI behaviors. When updating a field, consider what it
renders.

  UI element               Schema field

                           classification.is_thomas_descendant (gold) vs
  Tree box border color
                           is_easter_egg (different)


  Box label                bio.display_name


  Tooltip blurb            notable.notable_blurb (8w max)


  Spouse box layout        number_of_marriages reserves slots


  Generation depth         classification.generation_from_thomas


  Easter egg indicator     classification.is_easter_egg


  Notable shuffle          All entries where notable.is_notable === true

  Cross_connection
                           cross_connections[n].related_id → fly camera
  teleport

  Photo / illustration     bio.photo_url , bio.photo_notes


  Artworks                 artworks[n].artwork_id → top-level lookup


Education / career panel: education[] and career[] render as stacked quick-hit lines in the
narrow right-hand column (RightColumn). Keep every entry short; overflow truncates with an
ellipsis. Push anything that needs real length into a narrative_block. (See the §5 career UX
width rule.)


Note on legacy name field: Some entries still carry name instead of bio . The build reads
both.


## 18. CURRENT PROJECT STATE
Working file convention: Each session’s output is named
hooker_descendants_v4_pilotN_stageNNN.json and downloaded to local backup. The latest
pilot/stage version is the canonical file at any given moment.

Approximate counts (as of v21 — June 2026, post Stage 6Y-641):

    People: 13,861

    Wars: 15 (WAR001-WAR015)

    Notable stories: 542

    Artworks: 85

    Cemeteries: 805

   Institutions: 163

   Landmarks: 106

   Documents: 27

Current ID high-water marks (as of v21 / Stage 6Y-641):

   H05317

   HD6200

   I01715

   X03174

   TD0376

   CEM807

   LM144

   INST173

   ART085

   WAR015 / BTL070

Recent build (v20 → v21, stages 6Y-465 → 6Y-641): extensive descendant build-out and notable enrichment across the Roosevelt/Tyler, Trevor/Cushman, and Hart→Marsh→Lee→King lines, plus a full Block A/B data-integrity reconciliation (the 23 Block A and 66 Block B spouse/parent contradictions are now fully resolved — current sweeps return zero). Most recent work (stages 6Y-632 → 6Y-641): the Marsh→Lee→King descent off Sarah Hart (EH #268), including the rebuilt Samuel Lee Jr. bridge, Oberlin president Henry Churchill King (King-Crane Commission, Burrell-King House LM143), his sons Edgar Weld King (Miami librarian, King Library LM144) and Philip Coates King (Washburn president, Navy chaplain), and Myra King's two Civil War-veteran marriages. New v21 canonical tags: librarian and nobel_prize. New UX rule codified: the §5/§17 RightColumn width rule (education/career = quick hits; overflow goes to NBs). Open: apply librarian to Edgar King HD6195 (currently educator/academia); Philip Coates King is a notable candidate pending Sam's URL + approval.

Recent build (this v19 -> v20 session, stages ~6Y-457 through 6Y-464): The
Berlin/Kensington Hart family of Capt. Samuel Hart (H00281, gen 5, son of Mary Hooker)
and his descendants. EH #582 Rebecca Hart Cook + the Cook/White line (incl. a Howard
White ↔ Emma Hart cousin marriage); EH #583 Hon. Capt. Samuel Hart (state senator,
Universalist) down four generations — Cyrus Wadsworth’s Ohio line, Samuel Jr.’s Kensington
line, the Hart→Lyman branch that settled Montevallo, Alabama (incl. Judge Edward Sherman
Lyman → Hattie Carroll), and the Upson branch through Col. Everett Langdon Upson (WWI +
WWII, Arlington); EH #584 Charlotte Hart + Orrin Lee (Revolutionary drummer, Universalist
legislator, blacksmith) and the full Granby Lee descendancy down to gen 9 (Orren Hart Lee
the War of 1812 drum major; Richard Henry Lee the 16th Connecticut Civil War sergeant;
George Lee → the Loveland children). Rev. Heman Humphrey easter egg (Amherst College
president). New universalist and iowa_migration tags formalized this session (now
canonical). Duplicate merges per §0.12: Orrin Lee (X02062→X01043) and Howard White
(X01600→HD5828). New cemeteries incl. Montevallo CEM743, Woodlawn/Suffield CEM744,
and Lee Cemetery/Granby CEM745 (split from Granby Cemetery CEM078). Data-error fixes:
H00583 death year (1813→1835) and a misattributed French & Indian War tag; Richard
Henry Lee HD3060 mis-tagged died_young (corrected to civil_war ). Known structural
issues (predate v14, addressed incrementally):

1. name vs bio field — ~50% of entries still use name . Bulk rename deferred.

2. ~87 entries with multi-part first_name needing manual review.

3. Some notable entries still missing blurbs — null preferred to filler.

4. Landmark GPS conversion: remaining DMS → decimal degrees.

5. Gen 3+ entries largely untouched.

6. Tree-wide bidirectional gaps (~1,800 parent→child gaps from earlier audits, ~100
    reverse gaps, ~110 unwired spouse_name fields, ~80 orphan refs). Addressed branch-
    by-branch as Sam directs.

7. INST hooker_connected_people gaps — INST002 Harvard and INST022 Yale have been
    backfilled. Other INSTs (Vassar, Princeton, Williams, Deerfield, Mount Holyoke,
    Marlborough, Roxbury Latin, etc.) still need similar passes.

8. Some INST entries use nested location / founded objects; others use flat fields.
    Migration pass deferred.


## 19. FAILURE MODES — what to never do
Codified from documented breakdowns across recent sessions. Each item has a real-world
example.


F1. NOT SEARCHING PROJECT KNOWLEDGE FOR THE SCHEMA
Symptom: Building entries to v10 or v11 conventions when v14 is canonical. Writing 100+
word “narrative_blocks” because the assistant didn’t read the actual NB rules. Missing
required fields on every new entry.

Real example: Late April 2026, the assistant relied on ls /mnt/project/ (which showed
only v10 and v11) for two full conversation turns before searching project knowledge and
discovering v12 was canonical. All 26 entries built in those turns required full NB rewrites +
field backfills.

Prevention: §0.1 — search project knowledge first, always.


F2. CREATING NEW IDS WITHOUT SEARCHING THE TREE
Symptom: Duplicate entries for the same person under different IDs. Orphan stubs from
prior sessions left unconsolidated.

Real examples:

   X02342 Charles Percy created without searching → discovered X02328 already existed
   → required full consolidation, 9 references rewired.

   INST100 Pacific-Union Club created → INST094 already existed → required merge.

   INST101 Burlingame Country Club created → INST098 already existed → required
   merge.

Prevention: §0.2 — before assigning any new ID, search the tree.


F3. NARRATIVE BLOCKS AS BIOGRAPHIES INSTEAD OF HOOKS
Symptom: 100-200 word NB bodies. Headers that summarize (“WETA-TV chief; National
Medal of Arts 2019”) instead of hook (“Twin sister murdered as Charles ran for Senate”).
NBs about relatives instead of the entry’s subject. IDs in user-facing text.

Real example: Late April 2026 audit showed 54/54 NBs across 26 recent entries violated
the 2-sentence rule, averaging 7-8 sentences per body. 11 NBs contained explicit ID
references in user-facing text.

Prevention: §0.5 + §5 narrative_blocks. When wanting to write more than 3 sentences,
content goes in research_notes .


F4. NOTES INSTEAD OF DATA
Symptom: Marriage notes saying “two children Mark and Gail” while children_ids: [] .
Spouse_name set with spouse_id: null even when the spouse exists as an entry. Father
referenced in research_notes but parents.father_id: null .

Real example: X02328 Charles Percy from a prior session had two marriages with
spouse_id: null for both Jeanne Dickerson and Loraine Guyer despite both being trivial-
to-build, and children_ids: [] despite five named children. The notes documented the
relationships as text — but the UI cannot render notes as boxes.

Prevention: §0.3 — bidirectional integrity is the whole point. Notes don’t connect data.


F5. INVENTED NON-CANONICAL TAGS
Symptom: Tags like ivy_league , democrat , republican , philanthropist , arts_patron ,
vassar_alumna , moma_co_founder , public_broadcasting , businessman , soldier ,
irish_revolutionary , journalist_modern . The ivy_league tag is particularly
inappropriate when harvard_graduate and yale_graduate are canonical and more
specific. (v18 note: publisher was previously in this non-canonical list but is now canonical
— see §6.) (v19 note: art_collector , immigrant , teacher_of_the_year are non-
canonical pending a Sam decision to formalize or clean off existing entries. justice was

confirmed canonical in v19 alongside judge — they are different offices.)

Real example: Jay Rockefeller HD3286 had tags including rockefeller_family ,
democrat , ivy_league despite Harvard and Yale being foundational institutions in the
project with their own INST entries. The structural information was missing while vague
filter-handles polluted the tag system.

Prevention: §0.6 + §6 canonical taxonomy. If a tag is needed but not canonical, propose it
for §6 addition — don’t silently invent.


F6. INST/LM/ART AS TAGS INSTEAD OF LINKAGE
Symptom: Person attended Harvard but no entry in institutions array referencing
INST002, no addition to INST002’s hooker_connected_people . Education field has
“Harvard” as a string in notes instead of institution_id: "INST002" .

Real example: April 2026 audit showed 18/26 recent entries had populated education
arrays but institutions: [] . The Harvard-Yale-Phillips-Exeter linkage Sam relies on for
the project’s intellectual architecture was completely missing.

Prevention: §0.4 — INST/LM/ART arrays are for ID linkage. Education with institution_id
populated. Bidirectional update of the INST entry’s hooker_connected_people .


F7. SCOPE CREEP / JALAPEÑO RULE VIOLATIONS
Symptom: Building siblings of Hooker spouses, half-siblings, nephews of in-laws, parents
of in-laws who aren’t notable. Each unnecessary entry creates cleanup debt.

Real example: April 2026, the assistant built X02345 Valerie Percy + X02346 Roger Percy
+ X02347 Gail Percy + X02348 Mark Percy as siblings of Sharon (Hooker spouse). Compiler
clarified: per Jalapeño Rule, only the spouse herself (Sharon X02327) gets built. The four
siblings were deleted.

Prevention: Re-read Jalapeño Rule (§5) before building any X-prefix non-easter_egg entry.
When uncertain, ask compiler before building.


F8. GENDER MISIDENTIFICATION
Symptom: Marking a male entry as female because the assistant pattern-matched on a
name without verifying.

Real example: Mark Percy (male) was marked female in an early X02328 stub (“Two
daughters Mark + Gail”). Mark/Pat/Chris/Robin/Jordan/Taylor are common cross-gender
names; verify against source text, never guess.

Prevention: Verify gender against source documentation. When source is silent, mark
gender: "unknown" .


F9. PARTNER LANGUAGE / EMOTIONAL FAILURE
Symptom: Defensive responses when caught making errors. Not acknowledging the
compiler’s investment of time. Treating the project as a transaction rather than a
collaboration.

Real example: Multiple turns in late April 2026, the compiler expressed exhaustion,
frustration, and emotional distress about the assistant’s accumulated errors. Trust was lost.

Prevention: Own errors directly. Don’t over-apologize, but don’t deflect. Recognize that
this is a multi-year personal project and the compiler is its sole curator. Treat that with
appropriate weight.


F10. OVER-APPLYING extraordinary_longevity
Symptom: Tagging entries who lived to 82, 84, 87, 88, 89, or 90 with
extraordinary_longevity . The rule is strictly past 90 — 91 or older at death.

Real example: A April 2026 batch tagged six entries (HD2105 age 83, HD2106 age 87,
X00686 age 84, I00322 age 82, X02361 age 88, HD2152 age 90) with
extraordinary_longevity . None qualified. All required removal in cleanup.

Prevention: Calendar age must be 91+ at death. When uncertain about exact age, calculate
from birth/death years before applying.


F11. NOTABLE-FLAGGING WITHOUT URL OR SAM APPROVAL (new in v15)
Symptom: Compiler sets is_notable: true based on the subject doing impressive things
(Silver Star recipient, foundation founder) without (a) an external Wikipedia-level URL, OR
(b) explicit Sam approval.

Real example (May 2026): HD4045 Arthur Allen Jr (WWII Silver Star, Arlington burial) and
HD4046 Barbara Allen Monsor (founder of Mothers Trust Foundation) were both set as
is_notable: true with primary_url: null and notable_blurbs running 40+ words. Sam
corrected: “I determine notable. notable needs external URL for users to do more research.”
Both denotabled in fix patch; substantive bios retained in education/career arrays and NBs.

Prevention: §0.10 + §5 notable rule. Notable requires URL + Sam approval, both, no
exceptions.


F12. NOTABLE_BLURB AS PARAGRAPH INSTEAD OF 8-WORD HOOK (new in
v15)

Symptom: notable_blurb containing full sentences or paragraphs describing the subject’s
achievements, instead of the 8-word maximum hook.

Real example (May 2026): HD4010 Archibald Romaine Mansfield’s notable_blurb was set
to a 50+ word paragraph describing his entire Seamen’s Church Institute career. Fix patch
rewrote to “Seamen’s Church Institute founder, Liberty ship namesake” (7 words).

Prevention: §5 notable rule — explicit     /✓ examples added in v15.


F13. NB HEADER AS SUMMARY INSTEAD OF HOOK (new in v15)
Symptom: NB headers that summarize the subject’s notable fact instead of creating a
question. “Mayor of Morris New York until 1971” instead of “Died in office, last day of
mayoralty.”

Real example (May 2026): Seven NB headers across stages 6Y-54 through 6Y-57c were
summaries that failed the threshold test. Fix patch rewrote all seven.

Prevention: §5 narrative_blocks header rule — explicit        summary / ✓ hook examples
added in v15.


F14. PROPAGATING UNVERIFIED USER-TREE LINEAGE (new in v15)
Symptom: Compiler accepts a FamilySearch or WikiTree user-tree attribution as
authoritative and propagates a lineage cascade (descent_paths updates, cousin_marriage
flagging, classification changes) without verifying against EH or a higher-priority source.

Real example (May 2026, Stage 6Y-58): A FamilySearch user-tree attributed Ebenezer
Mansfield (I00546) as a fourth son of Mary Stiles + Richard Mansfield. The compiler
accepted this, reclassified Ebenezer as a Hooker descendant, applied cousin_marriage to
him and HD3996 Laura Stiles, and cascaded descent_paths_to_thomas = 2 across 36
descendants. EH entry 452 explicitly lists only 3 sons (Leverett, Richard, Stiles) — no
Ebenezer. Full 36-entry rollback was required (Stage 6Y-58-ROLLBACK).

Prevention: §0.8 — EH outweighs FamilySearch always. Verify EH first before propagating.


F15. CASCADES WITHOUT SOURCE VERIFICATION GATE (new in v15)
Symptom: A descent claim or relationship reclassification gets propagated across 30+
descendant entries before the underlying claim is verified.

Real example (May 2026): Same incident as F14 — 36-entry descent_paths cascade
applied based on unverified FamilySearch claim, requiring full rollback. Each cascaded edit
was cheap to apply individually; the aggregate rollback was expensive.

Prevention: §0.9 — source-verification gate. Before any cascade affecting 5+ entries,
confirm EH or higher-priority source supports the underlying claim.


F16. SINGLE-LETTER MIDDLE INITIAL TRIPS NB SENTENCE COUNTER (new
in v15)
Symptom: NB body using full names like “Harriet A. Mansfield was born…” is read as 4
sentences by regex-based sentence counters (the period after “A.” reads as a sentence
boundary), inflating body sentence count and producing apparent schema-violation errors
when the body has only 2 actual sentences.

Real example (May 2026): Stage 6Y-57a’s NB for HD4035 Harriet A. Mansfield used full
middle-initialed names in the body, tripping the sentence counter from intended 2 to
apparent 4. Rewritten without middle initials.

Prevention: §5 narrative_blocks body rule — drop single-letter middle initials in NB body.
Keep them in display_name and research_notes.


F17. DIRECT-LINEAGE NAMING CCs INSTEAD OF naming_inspiration FIELD
(new in v16)
Symptom: cross_connections entries of type naming_pattern connecting a grandparent
to a grandchild, or a great-great-grandparent to a great-great-grandchild. These violate the
“minimum ~first-cousin relational distance” rule because they are direct lineal relationships,
not collateral ones.

Real example (May 2026, Stage 6Y-102): Eight naming_pattern CCs were added
connecting X00899 James Dwight Dana (1813-1895) → HD2670 and HD2674, and X00898
Edward Salisbury Dana → HD2673, all along direct descent lines. Sam flagged: “i sorta hate
the CC naming inspiration isn’t that against the rules in schema?” All eight were rolled back
in Stage 6Y-103.

Prevention: Direct-lineage namesake connections belong in the naming_inspiration field
(§5), not cross_connections . naming_pattern CCs are valid only between collateral
relatives (first cousins or more distant lateral connections). Grandfather/grandson is direct
lineage → naming_inspiration . First cousin once removed who shares a name →
naming_pattern CC.


F18. NB RESTATES WHAT STRUCTURED FIELDS ALREADY SHOW (new in
v16)
Symptom: Narrative blocks whose entire content is visible from the person’s structured
fields: their birth location, marriage date, death location, spouse name, or parent names. A

block saying “married in October 1883 to Yale mineralogist Edward Salisbury Dana” adds
nothing the marriages fields don’t already carry.

Real example (May 2026, Stage 6Y-102): HD2668 Caroline Bristol’s NBs were “Marriage
brought Hooker line into Dana scientific dynasty” and “Summered Mount Desert Island, died
Hancock Maine” — both restating what the marriage link and death fields already showed.
Sam: “I guess, it definitely makes my project unexcited and blah.” Rewritten in Stage 6Y-103
to use specific Yale class years (1825, 1870, 1911), the $35M New Haven bequest, and the
specific convergence of the Bristol and Dana Yale lines.

Prevention: §0.5 threshold test — “Does this block tell the user something the tree
structure cannot show?” A birth location, marriage date, or death city visible in the
structured fields fails the test. The block must surface a cross-generational pattern, a
counterfactual, a specific act with a date, or an insight the reader cannot derive from the
fields alone.


F19. POSSIBLE COUSIN MARRIAGE APPLIED AS CC WITHOUT VERIFICATION
(new in v17)
Symptom: A marriage where the in-law spouse shares a Hooker-family surname (Hooker,
Huntington, Talcott, etc.) at birth — possibly suggesting a documented cousin marriage
from a parallel branch — gets propagated as a cousin_marriage CC + classification change
before verification against EH or a higher-priority source. This is the cousin-marriage-
specific analogue of F14/F15 cascade-without-verification.

Real example (May 2026, Stage 6Y-209d): Charles William Huntington (TD0279) married
Louisa Huntington Huntington (I01151, born Boggstown Shelby County IN — same county as
the Huntington family’s Sugar Creek Township farm). The shared surname plus same-
county birth is strong evidence of a cousin marriage, but documentation tracing Louisa’s
parentage was not in hand at the moment of build. Correct handling applied:
research_notes “POSSIBLE COUSIN MARRIAGE FLAG” paragraph on both spouses;
classification left as inlaw; no cousin_marriage tag or CC added; case logged for Sam’s
research. Incorrect handling would have been to add the CC and reclassify Louisa as
Hooker-line + double-Talcott descendants for her two daughters, requiring rollback if the
cousin connection turned out to be a different Huntington family.

Prevention: §0.11 — flag in research_notes, do not cascade. A 5-minute paragraph is
reversible; a 36-entry classification cascade is the rollback class of error.


F20. ENTITY ID LEAKING INTO NB BODY (new in v17)
Symptom: A narrative_block body contains an entity ID ( H01411 , TD0250 , INST143 , etc.)
in user-facing text, instead of using the entity’s proper name. The NB body rule in §5 says

“No IDs in user-facing text” but the rule slips in particular when the writer wants to
disambiguate which family member they’re referencing.

Real example (May 2026, Stage 6Y-214): I01155 Anna Thompson Hooker’s NB body
contained the phrase “Hugh Thompson Hooker H01411, b.1789” — referencing son Hugh by
his ID for disambiguation. Caught by NB validation script (ID-IN-BODY warning) and
rewritten to “Hugh Thompson Hooker, born 1789” before save. Pattern repeated rarely but
when it does, NB validation catches it cleanly.

Prevention: §5 narrative_blocks body rule — “No IDs in user-facing text.” When
disambiguation is needed, use the person’s full name plus a year or a relationship descriptor
(“her eldest son”, “her second cousin”). Build scripts should include a regex NB-body ID
check in their validation phase. The check is one line:
bool(re.search(r'\b(H|HD|I|X|T|TD|U|Y|INST|LMK|ART|CEM|BIB|LM)\d{3,5}\b', body)) .


F21. STUB-REDIRECT INSTEAD OF DELETION (new in v18)
Symptom: A discovered duplicate is left in the JSON as a stub with tag duplicate_entry
and an RN note pointing to the canonical entry, instead of being deleted.

Real example (May 2026, Stage 6Y-298 → 6Y-300): X02243 Lydia Mason Robinson
Hooker was discovered to be a duplicate of HD3270. Initially X02243 was kept as a stub
with RN “DUPLICATE ENTRY — see HD3270 for canonical record” and tag
duplicate_entry . Sam directive: “RN is a dead zone, we delete duplicates, not hang on to
them for no reason.” The data had already been consolidated onto HD3270 and tree
references already pointed to HD3270; the only step missing was deleting X02243 from the
people array. Done in Stage 6Y-300; people count 11938 → 11937.

Prevention: §0.12 merge protocol. When merging duplicates, the final step is deletion of
the duplicate entry from the people array. RN-stub redirects are a form of F4 (notes instead
of data).


F22. SOURCE-ATTRIBUTION LANGUAGE IN NB BODIES (new in v18)
Symptom: NB bodies reference Edward Hooker, the 1909 genealogy, Brockett Genealogy,
WikiTree, FindAGrave, FamilySearch, “per family records,” “misrecorded” — meta-
commentary about the compilation source rather than narration about the person.

Real example (May 2026, Stage 6Y-296): 179 NBs project-wide referenced source-
attribution language; 23 from recent batches (6Y-285 through 6Y-295) were rewritten same
stage to drop “Edward Hooker / 1909 genealogy / Brockett Genealogy / WikiTree /
FindAGrave / FamilySearch / Hofstra / per family records / misrecorded” meta-language
while preserving the underlying facts about the person. 156 pre-existing NBs remain
pending a dedicated cleanup stage.

Prevention: §5 narrative_blocks NB-writing-practice (g) fourth-wall rule. Source attribution
lives in research_notes only — RN is not user-visible and has no length cap. NB body is for
the user’s narrative experience of the person.


F23. CC ON EXCLUDED RELATIONSHIPS (new in v18)
Symptom: A cross_connection entry connects two people in an excluded direct-
relationship category: spouse, parent, child, or sibling.

Real example (May 2026, Stage 6Y-305 → 6Y-306): H03872 ↔ X02269
cousin_marriage CC was added between two spouses. Schema §5 explicit exclusion:
parents/siblings/children/spouses. Fixed in Stage 6Y-306 by removing the spouse-spouse
CC and adding a parent-to-parent CC instead — H02424 ↔ HD3260 (uncle/niece
relationship, the parents of the cousin-spouses on each side of the marriage). The cousin
marriage between H03872 and X02269 is instead documented via NB on each of them
describing their own marriage as a cousin marriage.

Prevention: §5 cross_connections — CC parent-to-parent pattern for cousin marriages
(new in v18). Before any CC creation, check the relationship between the related_id pair
against the §5 exclusion list. If a direct-relationship (parent/sibling/child/spouse) applies,
the CC is illegal — document via one degree of separation instead (parent-to-parent for
cousin marriage; for namesake-after-early-death use the naming_pattern CC only when
the relationship is uncle/nephew, half-sibling, cousin, etc. — never parent/child, where
naming_inspiration field is the right home per F17).


## 20. NOTES FOR THE NEXT SESSION
This section is a handoff for the next assistant instance. Read it on conversation turn 1.


What this project is
A bespoke SvelteKit + D3.js genealogy visualization for Rev. Thomas Hooker’s documented
descendants. Sam Talcott Hooker (the compiler) has worked on this for years and treats it
as a serious scholarly project — not a hobby tree, not a crowdsourced platform. He
descends from Thomas Hooker on both paternal (Hooker surname) and maternal (Talcott)
lines.


Working relationship principles
1. Sam is the source of authority on scope, notability, and inclusion. The Jalapeño Rule is
    a default; he can override it.

2. He works systematically with focused excursions. When he gives you a person to
   build, he expects immediate extraction from his pasted source material into structured
   fields, not clarifying questions. But when scope is genuinely ambiguous, asking once is
   far better than building wrong.

3. He prefers prose responses over bullet points. No flowery closings. Direct,
   technically precise language. Acknowledge errors clearly without excessive apology.

4. He runs parallel chat sessions. One for JSON data entry, one for qualitative research
   notes ( hooker_genealogy_research.md ), separate sessions for reading projects. Don’t
   try to do everything in one chat.

5. He downloads each JSON version locally as backup. Each session’s output is
   verifiable against prior backups.

6. He is a deep reader. Two hours on a preface is productive for him. He values depth over
   pace.

7. He uses voice-to-text which produces occasional transcription errors. Decode in
   context rather than asking him to retype.

8. He has strong pattern-recognition instincts. He’ll connect ideas across domains.
   Match this energy where you can.


Operating discipline (do this every session)
1. Turn 1, before any other action: Read this schema v16 in its entirety. Search project
   knowledge for related design docs (DESIGN.md, OUTREACH_CONTACTS_v2.md,
   JSON_CLEANUP_FINDINGS.md, hooker_genealogy_research.md).

2. Turn 1 also: Verify the working JSON file at the latest pilot version (Sam will direct).

3. Every 3 entries built or every 3 turns, whichever comes first: Re-read §0 (Critical
   Operating Discipline). The drift is real and rapid; this is not optional.

4. Every 10 turns: Re-read §5 (Field Rules) and §6 (Tag Taxonomy). The tag taxonomy is
   large and easy to drift from.

5. Before assigning any new ID: Search the people array (or institutions/landmarks/etc)
   for an existing entry by name. Duplicates are worse than stubs.

6. Before building any X-prefix non-easter_egg entry: Confirm the Jalapeño Rule allows
   it. When uncertain, ask Sam.

7. Whenever you wire a relationship: Update both sides. Always. (See §0.3.)

The four cardinal sins
1. Building entries to a schema you didn’t actually read. This corrupts every entry you
   produce.

2. Creating duplicate IDs because you didn’t search. This requires hours of
   consolidation.

3. Writing “narrative_blocks” that are actually research notes. The 8-word hook + 2-3
   sentence body rule is non-negotiable. Substance lives in research_notes , which has no
   length cap.

4. Treating the JSON as a notes archive instead of a UX platform. Sam will not
   remember individual people in two months. The data structure has to carry the
   connections so the build can render them.


Trust posture
The fastest path to a productive session is rigorous adherence to §0.1–§0.7. Show your
work. Be specific about what you find vs. what you assume. When you make a mistake, own
it precisely without spiraling into self-flagellation. The compiler doesn’t want apologies; he
wants accurate work.

A partner reads the schema before working with the data. A partner searches before
duplicating. A partner doesn’t write notes when the field calls for IDs. A partner asks when
uncertain.

Good luck.


21. PROPOSED ADDITIONS NEEDING SAM’S DECISION (new
appendix in v18)
These are observed in-tree patterns or candidates worth Sam considering for future
canonical addition — surfaced during pilot128 chat session but not yet confirmed. They are
NOT canonical until Sam confirms.


21.1 greenfield_newton — Proposed canonical family_lineage tag
Definition: Members of the Newton family branch centered in Greenfield Massachusetts —
descendants and immediate relatives of John Newton (H00148) and Rev. Roger Newton
(H00151). Rationale: Currently used by 11 entries in tree: H00148, H00151, HD0154 Captain
Isaac Newton, HD0155 John Newton, HD0156 Samuel Newton, HD0157 Comfort Newton,
HD0158 Stephen Newton, HD0159 Sarah Newton, HD0160 Rhoda Newton, HD0161 Mary

Newton, plus 1 more. Exceeds the §6 family_lineage_tags 4+-entry threshold.
Distinguishes from: The parallel Milford CT John Newton branch per Jacobus/Abbott
genealogy text. Stage: 6Y-303 proposed, 6Y-307 Sam’s source confirmation of the
parallel-John-Newton distinction. Status: Pending Sam’s confirmation for v18 canonical
addition.


21.2 sea_captain — Career tag candidate
Rationale: Legitimate occupational concept (Brockett family, Pierrepont line, others).
Currently: NOT canonical (removed in 6Y-300 cleanup). Question: Canonical addition or
use merchant umbrella tag? Stage: 6Y-300 audit.


21.3 maritime — Family-cluster tag candidate
Rationale: Useful filter for maritime families (H00890 Lyman Brockett’s three sons died at
sea). Currently: NOT canonical (removed in 6Y-300 cleanup). Question: Canonical or skip?
Stage: 6Y-300 audit.


21.4 newspaper_editor — Career tag in use, canonicality unclear
Rationale: Currently used on HD04879 and HD0867. Currently: NOT surfaced in §6
search. Question: Already canonical in v17 and missed in audit, OR non-canonical and
should remap to publisher + journalist ? Stage: 6Y-301 question.


Schema v21.0 — June 2026 The single source of truth for all build sessions. Re-read §0
every 3 turns. Re-read §5 and §6 every 10 turns.



---
---

# APPENDED: SCHEMA v22 DELTA RECORD (authoritative decision text)

The block below is the complete v22 addendum, preserved verbatim. It is the authoritative
source for every rule amended after v21: the <=15 `died_young` threshold, the strict
`notable_category` vs NB-`category` enums and their asymmetries, `date_precision`, the
grandparent-tier easter-egg ceiling, the top-level `videos` array, the tag confirmations,
the standing issues register, and the process lessons. When any inline v21 rule above is
contradicted by this block, THIS BLOCK GOVERNS.

# Hooker Descendants JSON — Schema v22

**Version 22.0 — Monday, June 15, 2026, 7:00 PM**
**Compiler: Samuel Talcott Hooker**

---

## How to read this document

This is a **surgical addendum** to `hooker_json_schema_v21.md`, not a replacement. **Schema v21 remains in force in its entirety** — every rule, template, tag definition, and discipline note in v21 still governs the data. This document records only the *deltas* that v22 adds or amends. Where this addendum and the v21 body disagree, **this addendum wins** (it is the more recent decision); everywhere else, v21 stands unchanged.

The prior `v21_addendum_videos_tags.md` is **superseded and folded into this document** (§1 videos, §2 tags below). Discard the old addendum after reading; everything in it is carried here.

Read this addendum on turn 1, immediately after the v21 body. Re-read v21 §0 every 3 turns and v21 §5/§6 every 10 turns as always.

---

## §A. CURRENT PROJECT STATE — COMPUTE LIVE, never read counts from this doc

**Array counts and ID high-water marks are deliberately NOT recorded here.** They go
stale the instant any entry is added, so any number written in this document is wrong
by the next batch and is a confusion hazard for both humans and Claude Code.

**The single source of truth for counts and IDs is the live `canonical.json`:**
- **Total people / array counts** → `validate.py canonical.json` reports the live count
  on every run; or `len(T['people'])`.
- **Next free ID for any prefix** → computed live at allocation time. `process_tasks.py`'s
  `new_person` calls `next_x_id()`, which recomputes the true X maximum from the live
  file every call. Other prefixes follow the same rule: scan the live file, take the
  max of the numeric portion (`int(re.sub(r'\\D','',id))` — never lexically, because
  IDs use mixed zero-padding), add 1.

**Rule:** never trust a documented count or high-water number. Recompute from the live
file before allocating. (This is the lesson of the 6Y-749 collisions — see §D.1. The
allocator already does this correctly; this section exists so no one re-introduces a
stale table to trust by mistake.)

### Recent build (v21 → v22, stages 6Y-643 → 6Y-750)

Extensive descendant build-out and notable enrichment, principally: the Newton family branches (Burwell/Abner/Kilbourn → notable lawyer Henry Gleason Newton; the Connecticut→Texas missionary line to cowboy-physicist Newton Gaines); the Blunt Cherokee-missionary line; the Eunice Newton Foote / Henderson / Augusta Foote Arnold scientific-feminist cluster; the Sierra Bonita / Henry Clay Hooker Arizona ranch line; the deep Merwin / O.F. Merwin line; the Dykeman farm branch; and the large **Boston Reynolds-physician spine** off Edward Reynolds HD0267 — running through three generations of physicians, the Paul Revere House preservation, **Paul Revere as a grandfather easter egg**, the Wendell Phillips / John Phillips orbit, the literary agent Paul Revere Reynolds, and the **Coolidge cultural dynasty** (Julian Lowell Coolidge, Walter Muir Whitehill, John Phillips Coolidge, Olivia Coolidge). New structural firsts this span: the top-level `videos` array, several tree-spanning cross-connections, and the first grandparent-tier easter egg precedent (Paul Revere).

---

## §B. AMENDED FIELD RULES (surgical changes to v21 §5/§6)

### B.1 `died_young` threshold — CHANGED to ≤15 (amends v21 §6)

v21 §6 defines `died_young` as "died before age 30." **v22 redefines it as died at age 15 or younger** (≤15). This aligns the tag with the project's working usage (a child/adolescent death, not a young-adult death) and with the integrity checker, which already treats ≤15 as the `died_young` threshold.

Revised death-cause age bands (the rest of v21 §6 death-cause tags are unchanged):

| Tag | Age band |
|---|---|
| `died_in_infancy` | died before age 2 |
| `died_in_childhood` | died between ages 2 and 12 |
| `died_young` | **died at age 15 or younger** *(was: before 30)* |

> **Known cleanup debt this creates:** ~18 entries currently carry `died_young` with a computable age over 15 (one over 30). These are now mis-tagged under the v22 rule and need review — most should move to a more specific tag (`civil_war`, `died_unmarried`, etc.) or simply drop the tag. Do **not** mass-strip; review case by case as Sam directs. (See §C for the full issues register.)

### B.2 `notable_category` enum is STRICT and differs from the NB-category enum (reinforces v21 §5)

Two separate, non-interchangeable controlled vocabularies. Drift between them was the single most common compliance defect in the v21→v22 span. Codifying both here for quick reference:

**`notable_category` (in `notable.notable_category[]`) — the ONLY valid values:**
`politics, military, law, religion, education, arts, science, business, exploration, social_reform, charity, literature, poetry, medicine, author, history`

**`narrative_blocks[].category` — the ONLY valid values:**
`career, military, education, religion, family, character, politics, law, social_reform, death, legacy, marriage, crime, literature, science, business, arts`

Note the asymmetries that cause errors:
- `medicine` is valid for **notable_category** but **NOT** for NB category — a medical NB uses category `science`.
- `history` is valid for **notable_category** but **NOT** for NB category — a historical NB uses category `legacy`.
- `academia` / `academy` / `mathematics` / `art_history` / `historic_preservation` / `abolitionism` are **invalid in both**. Map them: academia→`education`, mathematics→`science`, art_history→`arts`, historic_preservation→`history` (notable) or `legacy` (NB), abolitionism→`social_reform`.
- Neither field accepts `career` as a *notable_category*; `career` is an NB category only (already in v21, restated because it still trips builds).

### B.3 `date_precision` — formalized (was undocumented in v21 body)

Present throughout person `birth`/`death` objects. Controlled values in active use:
`exact, year_only, month_year, approximate, estimated, baptism_proxy, after`

The age-validator skips records flagged `estimated`. Use the most precise value the source supports; `year_only` is the common default for stub-tier entries.

### B.4 Grandparent-tier easter eggs — RARE, Sam-approval-only (new in v22)

The Jalapeño Rule (v21) admits, as `is_easter_egg` X-prefix entries, the **notable parents of Hooker spouses** — one generation up from the married-in spouse. v22 establishes a tightly bounded extension and its hard ceiling:

- **A grandparent of a Hooker spouse MAY be admitted as an easter egg, but only as a major exception, and ONLY with Sam's explicit per-entry approval.** This is not a category the compiler may add on its own initiative, ever. It is a hurdle, not a default.
- The bar is **historical stature.** The exception exists for figures of genuinely large national/historical heft whose presence enriches the tree out of proportion to their genealogical distance — the precedent is **Paul Revere** (admitted as the great-great-grandfather tier of the Reynolds line; see Stage 6Y-744). An ordinary grandparent-of-a-spouse does **not** qualify. If you would have to argue for the person's importance, the answer is no.
- **Great-grandparents (and beyond) of Hooker spouses are NOT admissible as easter eggs** — Paul Revere is the precedent that defines the *outer* limit reachable by stature, not a license to climb further. The default ceiling remains the spouse's parents (v21); the grandparent tier is the rare, Sam-gated exception; nothing above it is allowed regardless of fame.
- When such an entry is admitted, it still follows all easter-egg mechanics: `is_easter_egg: true`, placed under the orbit category, and given a `family_orbit` CC to the Hooker descendant it connects through (for Revere, the great-great-grandchild). Record Sam's approval in `research_notes`.

> **One-line rule:** spouse's parents = allowed by default; spouse's grandparents = Sam-approved exception for historical-heft figures only (Paul Revere precedent); anything higher = never.

---

## §1. TOP-LEVEL `videos` ARRAY (carried from v21 addendum, now canonical)

A top-level array parallel to `cemeteries`, `statues`, and `artworks`, so linked video media renders in a person's RightColumn via the cemetery-style backlink pattern.

### 1.1 Top-level shape

```json
"videos": [
  {
    "id": "VID001",
    "title": "Newton Gaines: Cowboy Physicist (cowboy song recording)",
    "summary": "Cowboy Song Recording",
    "url": "https://www.youtube.com/watch?v=DF_2K13Nuno",
    "platform": "youtube",
    "person_ids": ["HD6497"],
    "notes": "Newton Gaines' recorded cowboy song; he recorded for Victor and the Library of Congress."
  }
]
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | `VID###`, zero-padded to 3 digits. Allocate from live max (§D.1). |
| `title` | string | yes | Full human-readable title (the source's own title; may be long). |
| `summary` | string | yes | 3–4 word title-case noun phrase for the RightColumn chip (e.g. "Cowboy Song Recording", "First Mayor's Grave"). No trailing punctuation. Distinct from `title`. |
| `url` | string | yes | Full external URL. |
| `platform` | string | yes | Lowercase (`youtube`, etc.). |
| `person_ids` | array[string] | yes | One or more person IDs the video documents. Every ID needs the reciprocal backlink. |
| `notes` | string | no | Editorial context; longer than `summary`; not displayed in the chip. |

### 1.2 Person-level backlink

```json
"videos": [ { "video_id": "VID001" } ]
```

### 1.3 Integrity rules

- Every `videos[].person_ids[]` must resolve to an existing person.
- Every person-level `videos[].video_id` must resolve to a top-level `videos[].id`.
- The relationship is **bidirectional** and may be computed additively at build time to prevent drift (like cemetery backlinks).
- A single video may legitimately backlink to multiple people (e.g. a restoration documentary linked to both the preservationist and the building's original owner).

**Current high-water: VID017.** (17 videos live as of Stage 6Y-750.)

---

## §2. TAG TAXONOMY ADDITIONS & CONFIRMATIONS (folds into v21 §6)

The following are confirmed canonical and should be read as part of the v21 §6 set. **Several were already in the v21 body** and are listed only to end recurring "is this canonical?" friction.

### 2.1 Confirmed canonical (already in v21 §6 body — restated to stop re-litigation)

`physician`, `minister`, `missionary`, `died_unmarried`, `westward_migration`, `suffragist`, `mayor`, `publisher`, `librarian`, `nobel_prize`, `mathematician`, `silversmith`, `businessman`, `academic`, `educator`, `author`, `painter`, `psychiatrist`, `pandemic_death`, `extraordinary_longevity` (strictly ≥91), `extraordinary_story`.

> **Lesson codified:** in the v21→v22 span the assistant twice *avoided* a tag (`mathematician`, `librarian`) believing it non-canonical when it was in fact in the v21 §6 body. **When unsure whether a tag is canonical, grep the schema body before avoiding it** — do not substitute a weaker tag on a guess. `mathematician`, `librarian`, and `pandemic_death` are all canonical.

### 2.2 Family-cluster tags added this span

| Tag | Definition |
|---|---|
| `durham_newton` | Member of the Durham, Connecticut Newton family cluster. |
| `cherokee_mission` | Served at a Cherokee mission (Brainerd, Dwight, Park Hill, Candy Creek, etc.). |

### 2.3 Still NON-canonical — do NOT use (reminder)

- `veteran` → use the specific war tag.
- `historian` → use `author` + `academic` (there is no `historian` tag).
- `academia`, `academy` → the tag is `academic`.
- `professional`, `historical_connection` → not canonical CC types either.
- `inherited_trait` → not a CC type; use `family_connection`.
- Proposed but still UNCONFIRMED (v21 §21, pending Sam): `sea_captain`, `maritime`, `greenfield_newton`, `newspaper_editor`, `dar_patriot`, `prisoner_of_war`. Do not use without Sam's explicit go-ahead.

---

## §C. ISSUES REGISTER — standing data debt (pointers only, no entry names)

A consolidated, *quantified* list of known tree-wide debt for the next session to draw down as Sam directs. **These are pointers to categories of issue, not work orders** — none should be mass-fixed without Sam's scope approval. Counts are as of Stage 6Y-750.

| # | Issue | Magnitude | Notes |
|---|---|---|---|
| C1 | **`died_young` over-age under new ≤15 rule** | ~18 entries | Created by §B.1. Review individually; most remap to a specific tag or drop. |
| C2 | **Bloodline entries missing birth year** | 639 | HD/H descendants with no `birth.year`. Worklist exists (`bloodline-missing-year.md`); Sam researches → fills → re-uploads. |
| C3 | **Non-canonical CC types** | 262 instances | Dominated by `in_law` (128 — remap to `family_connection`), `historical_connection` (27), `professional_peer` (18), `parallel_marriage` (14), `founding_family_nexus` (11), and ~10 others. |
| C4 | **CC `display_label` over 70 chars** | 189 | Exceed the ~65–70 char budget. Largest single cleanup. |
| C5 | **One-directional CCs** | 120 | Missing the reciprocal entry on the linked person. |
| C6 | **NB `category` drift (non-enum values)** | 390 instances | Top offenders: `migration` (60), `work` (55), `life` (26), `achievement` (24), `civic` (20), `naming` (16). Remap to the §B.2 enum. |
| C7 | **Parent-child reciprocity gaps** | 92 | Child lists a parent who doesn't list the child (often step-relationships / multi-marriage wiring). |
| C8 | **`bio_blurb` over 8 words** | 16 | Older entries predating the 8-word rule. |
| C9 | **INST `hooker_connected_people` gaps** | several INSTs | Harvard (INST002) and Yale backfilled; Vassar, Princeton, Williams, Deerfield, Mount Holyoke, etc. still need passes. |
| C10 | **Battle entries missing `id` field** | ~3 | Pre-existing malformed war/battle records (e.g. Saint-Mihiel, Lundy's Lane, Queenston Heights). |
| C11 | **Schema body not yet merged** | — | The `videos` array, `date_precision`, and the v22 tag/threshold changes live in this addendum, not yet in the v21 body. A future full-merge pass folds them in. |

**Clean as of Stage 6Y-750 (do not re-flag):** duplicate IDs (0), dangling references (0), spouse non-reciprocity (0), malformed null landmark/artwork backlinks (0). These were swept this span; the integrity checker should confirm them at zero each session.

---

## §D. PROCESS & COMMUNICATION IMPROVEMENTS (lessons from the v21→v22 span)

This section is new in v22. It captures workflow lessons from the build span that would have prevented rework or sped the session. It is advisory for the next assistant instance, complementing v21 §19 (Failure Modes) and §20 (Next-Session Notes).

### D.1 ID allocation is the #1 recurring bug — three collisions in one stage

The single most expensive defect class this span was **ID collisions in multi-entry batches.** In Stage 6Y-749 alone, three entries were silently overwritten:
- A spouse (Rev. George Alexander Strong) was overwritten by a later-built spouse (Dr. William Norton Bullard) at the same `I0####` ID.
- A wife (Mary "Mollie" Gardner) was overwritten by another wife (Elizabeth Atkinson) at the same ID — crossing two people's marriages.
- A landmark grabbed `LM001` (an existing ID) because the allocator computed the max wrong across mixed 3-/4-digit padding.

**Mandatory rules going forward:**
1. **Recompute the true maximum from the LIVE file immediately before every allocation**, and **again after each append within a multi-entry script** — the maximum advances as you append.
2. Never trust a scratch `*_ids.json` reference file written earlier in the session — those go stale the instant another entry is added. They are notes, not sources of truth.
3. **After every multi-entry batch, run a duplicate-ID scan AND verify each new entry's ID by reading it back from the live file.** A `Counter` over `[p['id'] for p in people]` takes one line and catches this instantly.
4. For mixed-padding arrays (LM especially: some IDs 3-digit, some 4-digit), compute the max over the *numeric* portion (`int(re.sub(r'\D','',id))`), not lexically.

This one discipline, applied rigorously, removes the most common rework in the project.

### D.2 Scope questions: ask ONCE, up front, then build deep

Sam's default is full, deep builds from his pasted source — not stubs, not clarifying volleys. When a batch's depth was genuinely ambiguous (e.g. "how far down this Burr line?"), **a single up-front multi-question prompt** (using tappable options) resolved it cleanly and Sam answered fast. The right pattern: read the whole source, identify the one or two real forks, ask them together once, then execute the entire branch without further interruption. Do **not** ask incrementally per-generation.

### D.3 Run the compliance sweep BEFORE presenting, not after

NB-category and notable_category enum drift accumulated silently until a dedicated sweep caught 14 NB-category and 8 notable_category violations at once. **Fold the compliance check into the pre-presentation integrity script** so every checkpoint is born clean: per batch, validate tags against §6, NB headers ≤8 words, NB bodies ≤3 sentences, NB categories in the §B.2 enum, notable_category in the §B.2 enum, CC types canonical, CC labels ≤70 chars, blurbs ≤8 words, education/career array fields against the allowed key set, and no ID strings in NB bodies. One script, run every time, prints only counts and offenders.

### D.4 Accuracy beats the convenient tag

Two judgment calls this span resolved toward accuracy over the easy label: a soldier who died in France in January 1919 was **not** tagged `killed_in_action` (post-armistice death, no documented combat cause), and was **not** speculatively tagged `pandemic_death` either (cause undocumented). When a source doesn't state cause, the correct move is the conservative tag plus an honest NB, not the dramatic inference. Flag the uncertainty to Sam rather than resolving it silently.

### D.5 Cross-connection hunting should be active, not lazy

Sam values *found* connections — searching the whole tree for a real institutional or career parallel (a fellow Guaranty Trust employee; a Fogg Museum donor for a Fogg director; a fellow mathematician; a fellow library director). The pattern that worked: when building a notable, grep the entire `people` array for the institution/profession/place and surface the best one-to-one match as a `parallel_careers` or `civic_peer` CC, rather than leaving the entry unconnected. When a candidate connection turns out to be a coincidence (e.g. an unrelated Burr line vs. the Aaron Burr line; a Dana who isn't the famous Dana; a James Redpath who is the wrong James Redpath), **rule it out explicitly in `research_notes`** so the next session doesn't re-investigate.

### D.6 NB substance: write for historians, not for a children's book

Sam pushed back hard, twice, on NBs that were watered down ("not Disney parent stuff"). For major figures, **max out at 5 NBs** and mine the source for the delicate, specific, citable detail a historian would prize — the forensic dental-bridge identification, the Oxford-first-science-degree, the gold-smuggling escape — not a generic life summary. NB1 must establish who the person fundamentally *was* (phone screens show only NB1–2). Headers are hooks (≤8 words) that create a question; bodies are ≤3 sentences of real substance; everything longer lives in `research_notes`, which has no length cap.

---

*Prepared as a surgical v22 addendum to schema v21. No version-changelog narration is carried into the schema body. Schema v21 remains fully in force; this document records only the deltas. Re-read v21 §0 every 3 turns; v21 §5/§6 and this addendum's §B every 10 turns.*

---

## §E. NEW-ENTRY MINIMAL SKELETON (added 2026-06, for `new_person` creation)

When an entry is created programmatically (via `process_tasks.py new_person` — used
for orbit/parent entries that don't yet exist), it is born as a **minimal valid
skeleton** and enriched by subsequent task rows. The skeleton is:

```json
{
  "id": "X#####",                      // allocated from live X high-water + 1
  "bio": {
    "display_name": "Full Name",
    "first_name": "...",
    "last_name": "...",
    "married_names": []                // maiden_name added for married-in women
  },
  "gender": "male" | "female" | null,  // top-level; drives Wife/Husband/Spouse label
  "birth": {}, "death": {},            // filled later via birth_date/death_date rows
  "parents": {},                       // {father_id, mother_id} dict, never a list
  "marriages": [],
  "narrative_blocks": [],
  "tags": [],
  "cross_connections": [],
  "classification": {
    "is_thomas_descendant": false,
    "is_talcott_descendant": false,
    "is_easter_egg": false,            // true only for notable parents-of-spouses / orbit
    "is_searchable": false,            // new orbit/parent entries default non-searchable
    "include_in_path_calculation": false
  },
  "notable": { "is_notable": false },
  "is_placeholder": false
}
```

Notes:
- **Defaults for a plain parent/orbit entry:** `is_searchable=false`, `is_notable=false`,
  `is_easter_egg=false`. These are *entries*, not easter eggs — an easter egg requires
  documented multi-person connection per the Jalapeño Rule (v21/§B.4).
- Fields not in the skeleton (`artworks`, `quotes`, `sources`, `residence`, etc.) are
  added only when a task row populates them — absence is valid for a stub-tier entry.
- After creation, run `validate.py` on the new id to confirm the skeleton passes; if
  the frontend payload builder (`regenerate-data.js`) needs a key the skeleton omits,
  add it to the `make_new_person` skeleton rather than hand-patching each entry.
- Generation is NEVER hand-set on a descendant — it derives from the parent link via
  `derive_generations.py`. New non-descendant orbit entries have no generation.

---

# APPENDED: SCHEMA v24 DELTA RECORD (authoritative decision text)

Version 24.0 — 12 August 2026.

Everything above this line is v21/v22/v23 and is unchanged. Everything below is the current
law and **beats anything above it**. Sections §v24-6 and §v24-7 fold in the whole of the former
`docs/schema_v24_planning.md`, which has been deleted; this record is the only copy.

---

## §v24-1. THE RENDER CONTRACT — which key each resolver actually reads

Verified against `regenerate-data.js`, not inferred. **This is the most operationally
dangerous table in the schema.** Every row here is a way to store correct data that the card
silently declines to show: `validate.py` passes, `canonical.json` holds the value, the card is
blank. Canonical proves the data is STORED; only `card.py <ID>` proves it is VISIBLE.

### 1.1 Top-level media

| record | title key the card reads | link | image | how a person is attached |
|---|---|---|---|---|
| `artworks[]` | **`title`** (NOT `primary_name`) | `primary_url ?? url` | `photo_url ?? image_url` | person-side `artworks[] = {artwork_id, role, artwork_blurb}` |
| `landmarks[]` | **`primary_name`** | `primary_url ?? url` | `photo_url ?? image_url` | person-side `landmarks[] = {landmark_id, landmark_blurb}` |
| `videos[]` | **`summary`** (NOT `title`) | `url` | none — renders as a TEXT row | person-side `videos[] = {video_id}` |
| `statues[]` | **`name ?? description`** | `url` | `photo_url` | **inverted** — no person-side field; the statue carries `subject_id` **and** `person_ids[]`, and `resolveStatues` unions the two |

**New in v24: the `videos[]` row.** `resolveVideos` sets the row's name from `r.summary` and
uses `r.title` only as the tooltip. A video with a title and no summary renders as a bare dash.
**Always set `summary` and `title` together**, and make `summary` the human-readable label.

Carried from planning §7c, still true:

- **`artwork_blurb` DOES render** as the row's subtitle, and it lives on the **person's**
  `artworks[]` entry, not on the artwork record. `landmark_blurb` does **not** render —
  `resolveLandmarks` hard-codes it to null. So write the landmark's descriptive text into the
  landmark record's own `location`, which does render as `City, ST (year)`.
- A statue reaches a whole family through `person_ids[]`; `subject_id` is singular and means
  *who it depicts*.
- `statueTypeLabel('statue')` renders as an em-dash. Cosmetic; not worth a data change.

### 1.2 Landmark subtitle carries the build year

`resolveLandmarks` appends a clean four-digit build year, so rows read `Springfield, MA (1660)`.
The year is stored under six different keys across the landmark records — `dates.built` (86),
`built_year` (29), then `date_built`, `founded`, `dates.founded` and a tail — so the resolver
reads all of them and prints only a bare four-digit value. `{status: "destroyed"}` or `"c. 1660"`
falls through to no year, which is intended. **Prefer `dates.built` on new records.**

### 1.3 Career rows — the off-card trap (NEW in v24)

The card shows **the first three career rows, sorted latest-`start_year` first.**

- **A career row with no `start_year` never renders at all.** It is invisible, and it is not a
  validator error — it is a warning. Do not add an undated career row expecting it to show.
- **A late minor role pushes the defining post off the card.** Worked example: Giles E. Dawson
  (I03341) is known for being the Folger Shakespeare Library's curator of books and manuscripts
  (1946–67). Adding a volunteer post from 1984 and a teaching post from 1975 sorted both above
  it and pushed the curatorship to fourth — off-card. The fix was dropping the least important
  row, not reordering, because the sort is by year and cannot be overridden.
- **Check `card.py` after adding any career row to a person who already has three.**

`career[].notes` does not render. `education[].type` does not render; use `education[].dates`.

### 1.4 Cross-connections — caps and counts

- The card shows **the first six cross-connections.** A seventh is stored, valid and invisible.
  Order is the array order, so **ordering is authorship**: put the ones that must be seen first.
- **`display_label` is capped at 70 characters, measured on the label ALONE** — `link_text` is
  not counted against it. `card.py` prints `[NN/70]` for each.
- **Never write two CCs from one person to the same target.** Merge them into one label.
- **Never put a CC on a parent/child/spouse/sibling relationship** — the structural link already
  represents it, and the chip row shows it. Grandparent, uncle, cousin, in-law and step
  relations are all legitimate CC targets; the four immediate ones are not.

### 1.5 Other render facts that cost a session each

- **Cemetery:** the burial block is gated on the cemetery record having a `name`. An unnamed
  cemetery record renders nothing, so creating one to hold a coordinate is invisible work —
  if the source gives a location and coordinates but no cemetery name, **write no burial** and
  flag for the name. Coordinates go in `gps: {latitude, longitude}`; a flat top-level
  `lat`/`lng` never renders.
- **`notable_blurb` shadows `bio_blurb`.** On a notable person the card shows `notable_blurb`
  and `bio_blurb` never appears. **Consequence when turning `is_notable` off:** move the text
  to `bio_blurb` in the same edit or the card goes blank.
- **`is_notable: true` requires `primary_url`** or `validate.py` errors. There is no exemption.
- **NB header:** ≤8 words AND ≤50 characters. The word rule is validator-enforced; the character
  rule is the practical wrap point on the card and `card.py` prints `Nw/Nc` for exactly this.
- **`bio.photo_position`** is a per-person CSS `object-position` override for a badly-cropping
  portrait (`"right top"`, `"left bottom"`). `regenerate-data.js` emits it as `pp`;
  `FeaturedCard` and `PersonBox` apply it inline. Absent on everyone else — it is a one-person
  fix, not a layout setting. Cloudinary transforms belong in the URL, not here: inserting
  `/e_trim/` after `/upload/` strips a uniform or transparent border at delivery without
  touching the stored asset.

---

## §v24-2. RELATIONSHIP LABELS — computed, overridden, and the CC axis

Three separate mechanisms, routinely confused. **Pick by asking: can the graph work this out?**

### 2.1 The relational line under the name — prefer COMPUTED

`generation.ts` derives the line under a person's name. For an orbit figure with no descent, it
falls through to `computeInLawLabel()`, which fires only when the person has **no other label
AND `classification.is_easter_egg` is true**.

`computeInLawLabel()` walks **the person's own children, then those children's spouses.** If a
child married a Hooker descendant it emits `Mother-in-law of a Sixth Generation Hooker` or the
`Father-in-law`/`Parent-in-law` form, using **`bio.gender` first** and degrading to
`Parent-in-law` on an unrecorded gender rather than guessing.

**So for a parent-in-law, set `is_easter_egg: true` and write nothing else.** The label follows
the graph, and it keeps following it if the marriages later change. Worked examples: Frances
Lovering Adams (X02099) and Sarah Holmes Tappan (X03310) each needed one boolean.

**The children must sit in a marriage's `children_ids`,** not merely in the child's `parents`
field — the function reads `(person.marriages||[]).flatMap(m => m.children_ids)`. A parent with
no marriage record has no children as far as this function is concerned. This is why orbit
in-laws are built **as a pair**: it gives both of them the marriage that carries the child.

### 2.2 `relational_label_override` — only when the graph CANNOT compute it

Top-level string field, ~89 in use. Rendered verbatim, skipping all computation.

**Use it only for a tie `computeInLawLabel` structurally cannot reach.** The function walks
*children*, so it can express parent-in-law and nothing else. A **sibling**-in-law is invisible
to it: John Sidney McCain III (X03878) reaches the tree because his *sister* married a Hooker
descendant, so without an override his card carries no relational line at all. Hence
`"Brother-in-law of an Eleventh Generation Hooker"`.

Existing forms to match, so the corpus stays consistent:

```
"Father-in-law of a Sixth Generation Hooker"
"Half-sister of the Wife of an Eleventh Generation Hooker"
"Stepson of a Tenth Generation Hooker"
"First Wife of the Brother-in-law of an Eleventh Generation Hooker"
```

Chains read outward from the person to the Hooker. **A hard-coded string stops following the
wiring — that is the whole cost, and it is why computed is preferred wherever it works.**

### 2.3 The CC flight axis — `lineal_gap` and `lateral`

`flight.ts:isVerticalMove()` is the single test; both `deckDirFor` and `resolveLateralDir` call
it and must agree. It needs two build-time facts:

```
gen_delta      null or 0            -> lateral, always
relation_class 'direct'             -> vertical
kin_distance   <= KIN_NEAR (5)      -> vertical
```

**`lineal_gap`** (signed non-zero integer) forces vertical. Same sign convention as `gen_delta`
— `effGen(target) − effGen(source)` — so **negative when the target is the ancestor**, and
`deckDirFor` reads `< 0` as *in from the top*, `> 0` as *in from the bottom*. Each direction
authors its own sign, exactly as `display_label` already differs per direction.

**Only a non-zero integer counts.** `0`, `null`, `"2"` and `1.5` all fall through to the graph
derivation, because a `0` would assert same-generation, which `isVerticalMove` reads as lateral
— a silently ignored override is worse than none.

**`lateral: true`** is the companion added in this span: it forces the sideways move for two
people who are genuinely contemporaries but whose stored generations differ enough that the
derivation would invent a vertical. Worked example: Harry Grant Dart (b. 1868, generation 10)
and Edson Gallaudet (b. 1871, generation 9) — one drew an airship in 1908, the other opened an
aircraft factory the same year. A generation gap of 1 is real in the tree and meaningless
between them, so both sides carry `lateral: true`.

**When to author either: only when the camera would otherwise lie.** Check first whether both
records carry `generation_from_thomas`; if they do and the relationship is genuinely lineal,
`genDelta` already gets it right and **no override should be written**. Asserting a lineal gap
between people who are not lineal kin makes the camera lie in the other direction.

The `type` field on a cross_connection is **ignored** by the renderer. Default it, never
deliberate over it, never ask about it.

### 2.4 `is_notable` and `is_easter_egg` are INDEPENDENT

Corrected by Sam, 12 August 2026: *"giles is notable he's an easter egg."*

An orbit figure can be both, either, or neither. When `is_notable` was turned off for the
McCains — *"none of these people including John are notable, they are all easter eggs"* — that
was a judgement about those people, **not a rule that easter eggs are never notable.** Set each
flag on its own evidence; ask rather than infer.

---

## §v24-3. `date_precision` IS NOW A RENDER FIELD (NEW in v24)

v22 §B.3 formalised `date_precision` as a data field. **In this span it acquired render
consequences**, and they are not optional knowledge.

**The problem.** Both `formatDate` and `ageAtDeath` in `src/lib/utils/dates.ts` treat
`month:1, day:1` as the *year-only placeholder* — which it is, for 242 of the 258 people who
carry it. But **16 people were genuinely born on New Year's Day.** Their cards printed a bare
year instead of the full date, and hedged the age with a tilde: `~Age 21` for a man whose
birthday we know exactly. Gridley Barstow Strong and Robert Louis Tracy, both 1 January 1947,
were the two that surfaced it.

**The rule.** `date_precision: "exact"` now **overrides the placeholder heuristic** in both
functions — and only in the placeholder branch, never over a null month, where there is no day
to be exact about:

```ts
const yearOnly = (d) => {
  if (d.month == null) return true;
  if (d.month === 1 && d.day === 1) return d.date_precision !== 'exact';
  return false;
};
```

**Consequences to carry forward:**

- **Any real 1 January date MUST carry `date_precision: "exact"`** or it renders as a bare year
  with a tilde on the age. This is the one date in the calendar where the field is load-bearing.
- `DateLocation` in `src/lib/types/person.ts` gained an optional `date_precision`.
- `regenerate-data.js` emits `bx: 1` / `dx: 1` on the compact payload when birth/death precision
  is `"exact"`, and `TimelineRail.svelte` passes them through, so the rail's age tooltip and the
  card cannot disagree.
- Enum unchanged: `exact` | `year_only` | `month_year` | `approximate` | `unknown`, absent on
  ~15k records and that is valid.

**Also in this span — `datesPrivate()` has a URL consequence.** A person who is presumed living
**and not notable** has their dates suppressed on the card *and* **their slug carries no birth
year**. So flipping a living person from notable to non-notable silently changes their URL:
`carol-shepp-1938` becomes `carol-shepp`. Expect it, and record the old slug (§v24-4).

---

## §v24-4. SLUGS, `former_ids`, AND THE REDIRECT RESOLVER

### 4.1 How a slug is built

`regenerate-data.js:baseSlug()` — `firstName(p)` is `bio.first_name`, falling back to the first
token of `display_name`; `surname(p)` is `bio.maiden_name` for the **married-in prefixes
`I`, `X`, `U`** and `bio.last_name` for everyone else; then the birth year, suppressed for a
living non-notable person. A bracketed `display_name` marks a placeholder and yields the
ID-anchored, permanently stable form `unnamed-hd10098`.

### 4.2 Three ways the name fields silently butcher the URL

Carried from planning §7e and **extended by what this span measured**:

| fault | what the slug becomes | example |
|---|---|---|
| no `first_name` — the builder takes the **title** | `lt-pynchon-1647`, `col-moore-sr-1877`, `dr-ballard-1929` | X03298, HD6349, X03335 |
| no `maiden_name` on an `I`/`X`/`U` woman — falls to the married surname | `luvean-moore-1885` for a Butler | X03326 |
| **`first_name` holds the middle name too** (NEW) | `willard-james-sutton-1895`, `emeranda-m-conderman-1834` | HD5328, X02941 |

None of the three is a `validate.py` error and none shows on the card. **The URL is the only
place they surface**, and Sam reads them by eye more closely than any validator does.

**The third is the big one: 993 people carry a multi-token `first_name` with an empty
`middle_name`.** Twelve were repaired on 12 August; the rest stand. Splitting the field moves
the slug, so this is cheap now and expensive after deploy — see §v24-8.

**When touching any older entry, check `bio` has real `first_name` / `middle_name` /
`last_name` / `maiden_name` rather than a `display_name` alone.**

### 4.3 `former_ids` — the forwarding address, and what it actually holds

Despite the name, `former_ids` is **the redirect source list**, and it holds two kinds of stale
address. `regenerate-data.js` reads each person's `former_ids` + `former_id` + `merged_ids` and
writes **every entry as a key in `static/data/redirects.json` pointing at that person's current
slug.** Of ~755 keys today, roughly **534 are retired slugs** and **221 are retired record IDs**
(`T00001`, `HD3156`) left behind by merged people — so `/person/T00001` resolves too.

**Procedure whenever a name-field repair moves a slug** (this is the standing habit, not
optional):

1. snapshot `{id: slug}` from `static/data/search-index.json` **before** the edit;
2. make the edit; regenerate;
3. diff, and append each old slug to that person's top-level `former_ids`;
4. regenerate again so `redirects.json` picks it up.

### 4.4 The 301 resolver IS wired — and the dev-server trap

`src/lib/data/redirects.ts` is a complete resolver: payload-first ordering (a live page always
wins over the map, because some retired slugs were later re-issued), chain-following with a hop
cap, and a cycle guard. It is called from `src/routes/person/[slug]/+page.ts` on a payload miss.

**It works. Do not diagnose it as unwired.**

`loadMap` memoizes the map at module level — correct in production, where every deploy is a
fresh process. **A long-running dev server loads `redirects.json` once and never sees entries
added since**, so pre-existing redirects 301 while everything added in the current session 404s.
**Restart the dev server**; do not go looking for a bug in the data or the route.

---

## §v24-5. ENUM DIVERGENCE — the two category lists, and the traps in each

v22 §B.2 established that `notable_category` and the NB category enum are different lists. This
span found the specific collisions, and they cost a blocked batch each.

| value | valid as an NB category? | valid as a notable category? |
|---|---|---|
| `music` | **yes** | **NO** — use `arts` |
| `history` | **NO** | **yes** |
| `author`, `poetry`, `athletics`, `charity`, `socialite`, `horse_racing`, `exploration`, `medicine`, `journalist` | no | yes |
| `crime`, `death`, `marriage`, `family`, `career`, `character`, `legacy`, `sports` | yes | no |

**`NB_CATEGORY`** (from `validate.py`): arts, business, career, character, crime, death,
education, family, law, legacy, literature, marriage, military, music, politics, religion,
science, social_reform, sports.

**`NOTABLE_CATEGORY`**: arts, athletics, author, business, charity, education, exploration,
history, horse_racing, journalist, law, literature, medicine, military, poetry, politics,
religion, science, social_reform, socialite.

Two live faults found by rebuilding rather than by the validator:

- **`history` on a narrative block.** Rev. Thomas Shepard (I00002) carried an NB with
  `category: "history"` — not in the enum at all. Rebuilding forced a legal one (`law`, the
  block being about two trials). A tack-on edit would never have surfaced it.
- **`music` on a notable.** Hart Day Leavitt (HD10016) is a jazz musician; the jazz half of his
  notability is filed as `arts` while the NB about it keeps `music`.

**A block may repeat a category** — Shepard carries two `legacy` blocks and the validator
accepts it — but distinct categories per card is the house habit, and `family` last.

---

## §v24-6. EDITORIAL LAW ADDED SINCE v23

Folds in `schema_v24_planning.md` §1–§5 and adds what this span established.

### 6.1 The NB ceiling is 7, conditional on length

Raised from 6 when Stream B gave FeaturedCard the vertical room. Sam:

> "not if all the NBs are long, then the headers will extend past the bottom border of Featured
> Card. but null > weak so don't just dump weak stories in there, a great four NBs with meat
> beats 7 NBs that repeat information or don't really help the user engage with the person."

**Seven is available, not a target.** The cap lives in five places that must move together:
`validate.py:NB_MAX_PER_PERSON`, `card.py`'s display fraction,
`NarrativeBlocks.svelte:MAX_DISPLAYED`, and `stage.svelte.ts`'s `nbCapForWidth()` roomy return
plus the `rung.nbCap ?? N` fallback.

**Measured overflow point (new in v24):** the constraint is cumulative body length, not block
count. Rev. Thomas Shepard at 7 blocks / 15 sentences / **327 words** spilled past the bottom
border of the hero card. Rebuilt to 7 blocks / 12 sentences / **259 words**, it fits.
**Treat ~250–260 cumulative body words as the practical ceiling** and check any card that
passes it. This answers the open question parked at planning §8.

### 6.2 NB headers — concrete, not riddles; and gloss what you name

Sam, on the first seven-block card:

> "i want to have user engaging NB header to encourage curiosity… but i also want the user to be
> able to just browse the headers at a glance and learn something about the person."

**The standard: the header carries a fact AND withholds the payoff.** Both, in eight words.
**The scan test:** read only the headers, expanding nothing — do you now know roughly who this
person was? A header whose only subject is an undefined "it" or "he" fails outright.

**Extension established this span — gloss every proper noun a general reader will not know.**
Sam, rejecting a header built on Paisley, Coats and Hammersmith:

> "if someone has no idea what Paisley or Hammersmith is or Coats you may as well just wasted
> everyones time… your NB head and body is like a middle finger to my users."

The same applies inside a CC label: *"got young players into the union"* was corrected to
*"the musicians' union"* because the bare noun reads as an insider term. **An unglossed name is
the commonest form of the riddle header**, and it hides behind being technically true.

Settled test, after two rounds of correction: **a header must name a real thing AND leave a
question.** Not plain, not a riddle — *"don't just leave users with a headache."*

### 6.3 Rebuilds are rebuilds — never tack on (NEW, 12 August 2026)

> "Rebuild from scratch, don't just tack on NBs to the end of the old ones which leads to
> duplication, confusing order with threads popping up all over, and most relevant at top."

When asked to rebuild or enrich a card that already has blocks, **regenerate the whole array**:

- **order by relevance,** most important first, `family` last;
- **deduplicate across blocks** — the same fact told in two bodies is the signature of tacking
  on. Shepard's autobiography was named in two blocks until the rebuild caught it;
- **keep every thread** — a rebuild reduces length, never coverage. State the before/after
  block, sentence and word counts so the reduction is auditable;
- **an appended block lands at the bottom**, which is where the least relevant thing should be —
  so tacking on actively inverts the card's priority order.

This does not repeal the ONE LAW. A rebuild that Sam asked for is authorised; a rebuild nobody
asked for is destruction. *"take a pass at these NBs"* still means **add and refine in place.**

### 6.4 The woven-theme doctrine — entries reinforce each other

> "the ideal entries are ones that have bigger themes and stories woven through the NBs and then
> when you click on their kids or parents or spouses, those same stories are reinforced from the
> point of view of the spouse."

A batch is **not one person**: research pasted for one person is material for everyone it
touches. The same event on two cards is told **from each card owner's side**, never copied. This
does not loosen §5(h) subject discipline — a block on a mother about how impressive her son was
is still illegal, however thin her own record.

### 6.5 When there is no research — the unique-bio-fact escape hatch

Cross-record arithmetic a scanner would not notice (two deaths sixteen days apart across an
ocean; a father who outlived his missing son by eight weeks; a mother outliving every child)
passes. Birthplace, death place, age at death, spouse's and parents' names all **fail** — they
are already rendered. Licence for *observation*, never inference: build STRUCTURE from
arithmetic, never a DATE.

### 6.6 Source precedence — the paste is not the top of the hierarchy

Sam's pastes combine FindAGrave, FamilySearch, Wikipedia and screenshots of scholarship. **They
are not equal and the screenshots usually win.** When two of his own sources disagree: write the
field at the precision both support (usually `year_only`), record both claims in
`research_notes`, and put the adjudication to Sam. **Do not silently pick.**

**Old Style / New Style:** before flagging a one-year gap in a pre-1752 date, check whether it
falls between 1 January and 24 March — under Old Style the year turned on 25 March, so such a
date legitimately carries two year numbers. Record the New Style year, note the dual form
(17 January 1702/3) in `research_notes`.

**A claim that appears in NONE of the supplied sources comes off the card** (new, 12 August).
Sam, on a "grand-niece of Benjamin Franklin" line that no paste supported: *"i think this is
disputed… did they say it confidently? i'd leave it out."* The claim moves to `research_notes`
with a note that it needs a source before returning. It is not destroyed; it is unpublished.

### 6.7 Fetching, and the two things never to invent

The standing rule is **no external fetching**; a missing value is flagged, never looked up.
A scoped exception was granted for the Pynchon subgroup only (Sam's research is the spine,
fetched material is fill). **The permission is per-grouping and does not generalise.**

Two consequences that recur:

- **Never invent a cross-connection to fill a request.** Asked for a CC and finding no exact
  one, say so and name the near-misses and why each fails. Sam, approving that: *"good job not
  adding CC to edward, null > weak always."* An honest "none exists, and here is who would make
  it possible if built" is a better answer than a plausible link.
- **Never signpost a famous descendant on an ancestor's card.** Sam, on hype around the novelist:
  *"have you heard me say 'make this a carnival for hype around the novelist?' NOOOO. this
  happens organically, the user gets to the author without Vegas neon lights showing the path."*
  The descent is in the graph. Lists of famous descendants go in `research_notes` and nowhere else.

### 6.8 Money, and the fourth wall

- **No dollar amounts** anywhere on a card — NBs, blurbs, CC labels. Name the act, not the sum:
  a fund that "paid young soloists for twenty-five years", not its endowment.
- **Never make the source document the subject of a block.** The person acts; attribution goes
  to `research_notes`. A memoir, an obituary or a catalogue entry is evidence, not a character.

---

## §v24-7. THE PYNCHON LINE, THE PRISM CARD, AND TALCOTT SEVERANCE

Folds in `schema_v24_planning.md` §6, §7, §7a, §7b verbatim in substance.

### 7.1 The Pynchon line — how it is wired

- **Two different sets, deliberately.** `isPynchonKin()` drives the **rainbow background** and
  covers only the direct line to Thomas Ruggles Pynchon Jr. (X03232) plus Jackson (HD6314) plus
  the mother at each step. `pynchonGeneration()` drives the **second title line** and covers
  every descendant of William (Y00004) chosen for inclusion.
- **Both are derived.** `scripts/derive-pynchon-line.mjs` walks the parent graph and regenerates
  `src/lib/data/pynchonLine.ts`. **Re-run it after any canonical change touching a parent link
  on the line.** Never hand-edit the generated file.
- **Expanding the titled set is a `TITLE_ONLY` edit, Sam's approval only.** A full descendant
  walk from William reaches 955 people.
- **This line carries no Hooker blood.** The Pynchons reach the tree through Mary Hooker's
  stepdaughter Rebecca Hart — network, not blood. It is a curated easter-egg wormhole admitted
  by Sam's decision, so **do not "fix" the classification and do not apply the no-blood-tie
  deletion rule to it.**
- `TITLE_OVERRIDE` in the derive script asserts a generation for someone the graph walk cannot
  reach; it refuses to run if the id is absent from canonical or already derives a generation.

### 7.2 The prism card has no panel backgrounds

The burial pin's two masking layers in `RightColumn.svelte` both resolve to `var(--card-fill,
#fff)` — and `--card-fill` is never set anywhere, so both are unconditionally solid white.
Invisible on an ordinary card; on a Pynchon card they paint a white slab across the spectrum.
They are suppressed by `{#if !isPynchonKin(person.id)}` rather than deleted, because the mask is
load-bearing on the other ~19,000 cards. **Accepted cost:** a prism card whose right column
overflows can show the collision the mask was hiding.

**The general rule this implies: any new panel, chip or backdrop that assumes a flat card
background needs a prism check before it ships.** The rainbow makes every opaque rectangle
visible.

### 7.3 Talcott severance — deletion, not hiding

The 1,264 `classification.hidden: "talcott_2026"` people are a *previous* stage. Current
direction for Talcott-side records surfacing during other work is **outright deletion**.

**Mechanics that must not be skipped** (v23 §0.12): scrub every inbound reference *before*
dropping the record — `marriages[].children_ids`, `parents.father_id`/`mother_id`,
`marriages[].spouse_id`, reciprocal CCs **in both directions**, and the non-`people` containers
(cemetery `hooker_connections`, institution rosters, war `person_ids`). The both-directions trap
is the one that bites: removing one half of a CC leaves the other dangling, and
`validate.py --since` catches it a run later.

**Salvage first.** Anything on a doomed record belonging to a surviving person's story goes into
that person's `research_notes` before the delete — but it does **not** become an NB, because a
block centred on someone else still violates §5(h).

### 7.4 The silent-loss guard fires on every authorised removal — by design

`batch.py` / `validate.py --baseline` compare against git HEAD and BLOCK on any NB-count drop or
vanished person. **There is no suppression flag, and there should not be one.** An authorised,
Sam-named removal will still stop the batch; the human confirms and proceeds. Seeing

```
✗ SILENT LOSS: X03310 NB count 5->4 — no longer present: ['Benjamin Franklin was her great-uncle']
```

on an instruction that named that exact block is **the guard working**, not a fault. Do not
route around it, and do not treat a clean run as permission — **Sam's rendered-pixel verdict
outranks a clean validation.**

---

## §v24-8. STANDING DATA DEBT INTRODUCED OR MEASURED IN THIS SPAN

Pointers only, per the §C convention. Counts are live at 12 August 2026 — recompute, never cite.

| # | debt | scale | note |
|---|---|---|---|
| 1 | **multi-token `first_name`, empty `middle_name`** | **993 people** | corrupts the slug (§v24-4.2). **Cheapest to fix before the first Vercel deploy** — after deploy it breaks ~993 live URLs at once. Not all mechanical: `William St. John` is a real compound given name, and a few carry nicknames in quotes plus a doubled surname in `display_name`. Produce a review sheet for the ambiguous cases before moving anything. |
| 2 | notables with no `notable_url` | ~140 | each is a `validate.py` error the moment anything else touches the record |
| 3 | cemeteries with no `name` | ~52 | invisible on the card (§v24-1.5); a burial written against one renders nothing |
| 4 | duplicate cemetery records | several pairs | CEM548/CEM1436 (Green River), CEM453/CEM903 (Forest Hill Madison), CEM527–531, CEM106/CEM1459 |
| 5 | standing §C error/warning debt | ~954 / ~4,137 | **this is why `validate.py --since` exists** — a plain run prints BLOCKED every time. Never read a plain run as a verdict on the current batch. |

**Two live records flagged as probably wrong, not yet resolved:**

- **Capt. Henry Hooker Strong Jr. (HD4709)** carries a burial at Arlington (CEM044), but every
  supplied source says he was never recovered and is memorialised on the Courts of the Missing
  at the Honolulu Memorial. The burial was **not removed** — removal was not requested — but it
  is probably wrong.
- Two **"Clement Niles Strongman"** records (HD10063 / HD10065) look like duplicates.

---

## §v24-9. OPEN QUESTIONS CARRIED FORWARD

Carried from planning §8, with the resolved one struck:

- ~~**The 7-NB ceiling has not been visually stress-tested.**~~ **RESOLVED 12 Aug 2026** — see
  §v24-6.1. The real constraint is cumulative body words (~250–260), not block count.
- **Exposition / world's-fair medal tag.** Still unruled. `world_fair_medal` /
  `exposition_medalist` were offered for Allen Butler Talcott's 1904 silver; `olympian` would be
  false (art competitions began 1912).
- **Does `notable_category` need a founder value?** William Pynchon took `business, religion,
  author`; none is quite "founded a city."
- **Should `outreach` and `outreach_contacts` be merged?** Two arrays coexist with different
  shapes — `outreach` is `{person_id, url}` (7 entries), `outreach_contacts` is a richer record
  with `contact_name`, `status`, `connection_to_tree` (9 entries). New entries have been going
  to `outreach`; the split is undocumented and probably historical.
- **Should the timeline rail's `ANCHORS` become data?** It is a hand-curated array of ~18
  entries in `TimelineRail.svelte`, each with `slug`, `from`, `years`, `src`, `t:{x,y}`,
  `headshotBlurb`, `lifespan` — deliberately **not** derived from `is_notable`, because curation
  is Sam's. Two things to know before touching it: `years` drives **both** the bar length **and
  the portrait diameter**, so a short honest span renders a visibly small face; and the border
  ink is sampled from the image at runtime, so a portrait not served from Cloudinary may fail
  CORS and fall back to the default ink. The file's own comment parks the data question.
- **Wire the 301 handler's dev-server staleness?** Not a bug (§v24-4.4), but every session loses
  time to it until someone restarts the dev server. A note in the dev README would do.


---

# FOLDED IN: THE COMPLETE v25 RECORD (verbatim)

Everything below is `hooker_json_schema_v25_addendum.md` byte-for-byte. It was kept as a running
tally while v24 was law; it is now part of the law and **governs over the v24 text above**.
Its section numbers are preserved so existing references still resolve.

---

# Schema v25 — running addendum

**Status: a TALLY, not the law.** `hooker_json_schema_v24.md` is still THE structural law.
This file collects schema-affecting changes as they happen so the v25 rewrite can be done
once, comprehensively, instead of reconstructed from git archaeology. When v25 is written,
this file folds into it and is deleted.

Each entry says what changed, where it is enforced, and what breaks if you ignore it.

---

## 1. New fields

### `cross_connections[].co_link` — one CC row, TWO linked names
*Added 5 Sep 2026 (Sam). Enforced in `validate.py`, baked in `regenerate-data.js`, rendered in `CrossConnectionsBlade.svelte`.*

```json
{ "related_id": "H01626", "link_text": "John",
  "co_link": { "related_id": "I00170", "link_text": "Isabella Beecher Hooker", "joiner": " and " },
  "display_label": "founded Nook Farm, and rented him the Forest Street house in 1871" }
```

Renders as **John** and **Isabella Beecher Hooker** *founded Nook Farm…* — each name its own link.
Use when two people share ONE predicate and separate rows would say the same sentence twice.

- `joiner` defaults to `" and "`.
- The co-link is a **real navigable edge**: it bakes its own `slug`, `t` (table seat),
  `relation_class`, `gen_delta`, `kin_distance` and `orbit`. It does NOT inherit the primary's
  — the blade reads a link's whole camera flight off its own data attributes, so sharing a
  seat would fly the viewer to the wrong person.
- It **counts as a reciprocal**. `validate.py` scans `co_link.related_id` when testing
  one-directionality, so merging two rows into one does not orphan the surviving partner.
- Dropped at build if the co-target is `hidden` (Talcott severance), same as a primary.

### `documents[].document_title` — per-person top line
*Added 5 Sep 2026 (Sam). Person-side ref only.*

A document's registry `title` is written from one side ("Letter to Alice Hooker") and reads as
nonsense on the other party's card. `document_title` on the person-side reference is a
**verbatim override** of the row's top line. Absent → the registry title, unchanged.
Same idea as the per-person `artwork_blurb`.

---

## 2. Render facts to fold into §v24-1 (the render contract)

**Chips — `PersonBox` resolution order, which differs by relation:**

| chip type | resolution |
|---|---|
| sibling | `cf ?? fn ?? sn ?? n` (first name only) |
| child | `cm ?? nk ?? sn ?? n` |
| **everyone else, incl. spouse** | `nk ?? sn ?? n` |

- `bio.chip_name` is a **verbatim** chip label. It is baked into `nk`, into `cm`, and into `n`,
  so it wins on every chip type. Use it when the auto-surname is wrong — a pen name
  ("Mark Twain" on a record named Clemens), a married noblewoman, a stage name.
- `bio.chip_first_name` swaps the FIRST NAME only, and the surname it composes with **differs
  by chip type**: the *maiden* surname via `nk` (spouse/parent/sibling chips), the *married*
  surname via `cm` (child chips only). A woman with no children in the tree therefore never
  shows her married chip name.
- `FeaturedCard` renders `bio.display_name` and is unaffected by all of the above.

**Documents:** top line = `document_title ?? registry.title`; subtitle = person-side `blurb`;
url = `source_url ?? url`; **never a thumbnail**. The subtitle ellipsizes in the right column
past roughly 34 characters — Sam's rule is a short **"City, ST (year)"**, not prose. If it
deserves a paragraph it deserves an NB. **See §6.2 — 42 of 75 refs truncate today.**

**Landmarks:** name = `primary_name` (never `name`); subtitle = **"City, ST (year)" built from
the REGISTRY**, which is why person-side `landmark_blurb` never renders; url =
`primary_url ?? url`; thumb = `photo_url ?? image_url`. The build year is read from any of
`dates.built`, `dates.founded`, `built_year`, `date_built`, `founded`, and only a clean
4-digit value prints.

**Artworks:** top line = registry `title`, which is **GLOBAL** — changing it changes the row on
every card carrying that work (a painter and a sitter both see it). Subtitle = the person-side
`artwork_blurb`, which is per-person and the right place for a one-sided description.

**`notable.is_notable` does NOT gate the blurb.** The card shows `notable_blurb ?? bio_blurb`
regardless of the flag. What the flag actually gates is the **notables.json shuffle pool**
(`is_notable === true && is_searchable === true && !orbit`). Turning it off removes a person
from the random-notable door; it does not touch search, and it does not change the card blurb.

**CC `display_label` 70-char cap now has sanctioned exceptions.** Five labels so far: the
X02039↔H00001 pair carrying the two Hartford quotations, and X02039→X02045, where naming
Charles Dudley Warner AND identifying him as the Gilded Age co-author will not fit in 70
(Sam: "otherwise no one knows that"); and the X04143↔HD2556 pair added 18 Sep 2026 (86 and
89 chars), where **neither end is a person the reader arrives knowing** — an axe manufacturer
and a machine-tool historian — so each label has to spend its budget defining the far person
before it can state the connection. Sam's ruling there generalises the Warner precedent and
sets the working ceiling: *"assuming users don't really know who either person is, define the
connection at a more fundamental level, ok to lengthen to 80-90 char for intro."* The cap
yields when a label would otherwise name a person the reader cannot place. They sit
permanently in the `C4_cc_label_over_70` counter; that counter is no longer a pure error
signal.

---

## 3. Dead fields — stored, validating clean, rendering NOWHERE

- **`quotes[]`** (on people). Zero render paths. **See §6.1 — 29 people, 35 quotes, all invisible.**
- `research_notes` — already known dead; listed here so the v25 sweep catches both together.

---

## 4. Data-integrity gaps worth a sweep

- **A cemetery's `hooker_connections` roster is not derived from `burial.cemetery_id`.** They
  drift independently. CEM1445 (Woodlawn, Elmira) held two burials against an **empty** roster
  until 5 Sep 2026. A corpus-wide reconcile is unrun.

---

## 5. Tag vocabulary added (already live in `canonical_tags.txt`)

- 31 Aug 2026 — military decorations: `croix_de_guerre`, `george_medal`, `legion_of_honour`,
  `legion_of_merit`, `navy_cross`, `purple_heart`, `distinguished_service_order`,
  `mentioned_in_despatches`. (The DFC is `flying_cross`, already canonical — do not add a
  second spelling.)
- 31 Aug 2026 — DAR, two distinct things: `dar_member` (joined the society) and `dar_patriot`
  (a Revolutionary ancestor the DAR recognises).
- Still **not** canonical, recurring in submissions: `presidential_medal_of_freedom`,
  `pulitzer_prize`, a Colonial Dames tag, a party tag (`democrat`/`republican` are drift),
  `actor`.

---

## 6. Open — needs a decision before v25

### 6.1 `quotes[]` — 35 quotes on 29 people, none of them visible
*Raised 5 Sep 2026.*

Zero render paths anywhere: not in `regenerate-data.js`, not in the card components, not in
`card.py`. Every quote ever written to this field has been invisible from the day it was
written. It is not a stub used twice — it is a populated, curated field:

| holder | n |
|---|---|
| `H00001` Rev. Thomas Hooker | 4 |
| `H00597` Emma Hart Willard, `H00434` Samuel Cowles, `TD0114` Thomas Page, `HD4679` George Magoffin Humphrey | 2 each |
| 24 others (incl. `X02039` Twain, `TD0141` Adm. Dewey, `X02833` John Owen Dominis, `X03450` Roxana Foote Beecher) | 1 each |

The shape in use is `{text, attribution, category}`. **The progenitor holds four of them** —
whatever is decided here lands on the most-visited card in the project.

Three ways out, in Sam's court:

1. **Render it.** Needs a place on the card and a length rule. A quote is not an NB (no header,
   no category taxonomy of its own) and not a blurb (not a label). Nearest existing furniture is
   the document/landmark media row. Cheapest honest version: one quote, under the blurb.
2. **Mine and retire.** Fold the good ones into NB bodies where they already have a home, then
   delete the field in v25. Costs nothing structurally; loses `attribution` as a distinct datum.
3. **Leave dormant and stop writing to it.** The status quo, but written down — so no future
   session spends effort authoring into a field that renders nowhere.

Until this is settled: **do not author new quotes** expecting them to appear. A quote that
must be seen goes in a CC label or an NB body today. (Precedent, 5 Sep 2026: the Twain/Hooker
pair carries its two Hartford quotations in the CC labels, not in `quotes[]`, for exactly
this reason — and that is why those two labels break the 70-char cap.)

### 6.2 Document subtitles truncate — 42 of 75 refs affected
*Raised 5 Sep 2026 by Sam, from the rendered card: "Livy writes to her from Buffalo, J…"*

The document row's second line is the person-side `blurb`, and the right column ellipsizes it
at roughly 30–34 characters (it varies with column width, so treat ~30 as the safe budget).
Current corpus:

- **75** person-document references total
- **42** carry a subtitle over 34 chars — **56%, the majority, truncating right now**
- median length **43** chars; longest **165** ("1838 letter from former Dover neighbor Mott
  Titus describing his Ohio migration, the canal boom, frontier economics, and the Whig sweep
  of New York's 1838 elections.")

Sam's ruling on the shape: **"i just want it to say Buffalo, NY (1871) … i don't need a
description. if its worth an NB then add it, but the user can just click through without some
paragraph they can only read the first 5 words of."** The row is a door, not a summary.

Two ways to land it, and they compose:

1. **Sweep the data** — rewrite all 42 to `"City, ST (year)"`. Done by hand, one batch.
2. **Make the registry own it** (preferred, and what Sam gestured at with "can you create a new
   DOC desc field?"): add `place` to the document registry and have `resolveDocuments` fall
   back to `"City, ST (year)"` built from `place` + `date_year` whenever the person-side blurb
   is absent — **exactly what `resolveLandmarks` already does**. Then the 42 long blurbs are
   simply *deleted* rather than rewritten, and no future ref can regress: writing nothing gives
   the correct short subtitle automatically.

Option 2 makes the person-side `blurb` what it should be — a rare per-person override — and
leaves one obvious pattern instead of 75 hand-written strings. Blocked only on Sam's go-ahead,
since it deletes 42 existing blurbs (a named, authorised removal is required per the One Law).

---

## §7 New canonical tag: `photographer`
*Added 10 Sep 2026 by Sam, on Charles DeForest Fredricks (HD11266).*

`canonical_tags.txt` carried `artist`, `painter` and `musician` but no `photographer`, so the
first professional photographer in the corpus could only be tagged with the generic `artist`.
Sam's ruling: **"add a canonical photographer tag to him. if not canonical add to schema v25
addendum for future addition and add now."**

- **Added to `canonical_tags.txt` now**, so `validate.py` accepts it immediately.
- Folds into v25 as a permanent member of the occupation-tag family alongside
  `artist` / `painter` / `musician` / `physician` / `lawyer`.
- First bearer: HD11266 Charles DeForest Fredricks (1823–1894), carried together with `artist`.

Scope: anyone whose trade was the camera — studio proprietors, operators, war photographers.
Not for sitters, and not for people who merely owned photographs.

---

## §8 The NB header scan rule — concreteness is the floor, intrigue is the seasoning
*Added 13 Sep 2026 by Sam, on the Armour line (X04107 Andrew Watson Armour as the negative example).*

This **extends and sharpens `hooker_json_schema_v24.md` §v24-6.2**, which already said a header
must "name a real thing AND leave a question." That rule was being read as a licence to withhold.
It is not. Sam:

> "i feel like the last Claude made the NB headers too riddle like and obscure… they don't all
> have to be wiki-like but they have to have a little bit of concreteness for a user who just is
> scanning headers, but maybe one or two can be intriguing never tabloidy."

### 8.1 What an NB actually is — the sampler, not the encyclopedia

> "its important the NBs are at an angle focused on the person, telling small slices of
> narrative, not just dumping bio data, this is NOT wikipedia. we provide a sampler and engage
> the user with the entry but they can go and do more research once engaged."

An NB is a **small slice of narrative told at an angle on the person**. It is not a summary of
their life, not a paragraph of a biography, and not a fact table in prose. The card's job is to
make a reader want to know more — the research they do afterwards is theirs, not ours. **Dumping
bio data is the failure mode this rule exists to name**, and it fails in both directions: a
header that summarises is wiki, a header that withholds everything is a riddle.

### 8.2 The ratio — most headers concrete, at most one or two withholding

**Per card, not per header.** Scanning the header list with nothing expanded must teach the
reader who this person was.

- **The floor: every header carries at least one concrete anchor** — a trade, a place, a number,
  a named thing, an age, a date. A header whose every noun is abstract or pronominal fails.
- **The ceiling: one, at most two headers per card may be primarily intriguing** — withholding
  the payoff, leaning on the question. They earn that slot only because the others around them
  are carrying the facts.
- **Never tabloid.** Intrigue is dry understatement, not a tease. "His first wife died four days
  past thirty-one" is intrigue; "The secret his family never spoke of" is a tabloid.

### 8.3 The worked example — X04107 Andrew Watson Armour, five headers, three failures

The card that prompted the rule. Read the five in order, expanding nothing:

| # | header | verdict |
|---|---|---|
| 1 | *He left the plough at forty-nine* | **passes** — a trade and an age; you learn he was a farmer who changed course late |
| 2 | *He founded a bank in a bank panic* | **passes, and is the model** — concrete (a bank, a panic) and withholding (how? why him?) in eight words |
| 3 | *A packer second of the Armour brothers* | **fails** — "second" is doing work the reader cannot decode; it reads as a rank, a birth order and a typo at once |
| 4 | *His wife asked him not to walk on* | **fails** — zero anchors. Walk on from where? It is pure riddle, and the body's real content (he died on a bench beside a mineral spring) is nowhere in it |
| 5 | *Books and money bags never held him* | **fails, and misleads** — abstract, and it reads as a man indifferent to wealth when the body is about a farmer who missed open country |

Three of five withholding is inverted. The rule is **three or four of five carrying facts, one
or two withholding** — and #4 and #5 are the two that should have been rewritten, because #2
had already spent the card's intrigue budget.

### 8.4 The test, in order

1. **Scan test (v24-6.2, unchanged):** read only the headers. Do you know roughly who this was?
2. **Anchor test (new):** does *each* header contain a concrete noun — trade, place, number,
   named thing? If not, it is riddle, not intrigue.
3. **Ratio test (new):** count the withholding headers. More than two on a card → rewrite the
   weakest ones into their bodies' actual content.
4. **Angle test (new):** is this a slice of narrative, or a compressed encyclopedia entry? If the
   body would sit unchanged in a Wikipedia article, it is a data dump and needs an angle.

Unchanged from v24: **≤8 words AND ≤50 characters**, gloss every proper noun a general reader
will not know, and **null beats weak** — a header that can only be made concrete by lying is a
block that should not exist.

---

## §9 New canonical tag: `actor`
*Added 13 Sep 2026 during the Foster sweep, on the `photographer` precedent (§7).*

`actor` had been sitting in §5 as "still **not** canonical, recurring in submissions" for a
fortnight. The Foster line settled it: **four siblings in one household are all screen
performers** — HD12157 Lucinda "Cindy", HD12158 Constance "Connie", HD12159 Lucius "Buddy"
and HD12160 Alicia "Jodie" Foster — and the tree already held Janet Fairbank the soprano,
Percy Lee Atherton, and a scatter of others with no way to mark the trade.

- **Added to `canonical_tags.txt` now**, exactly as `photographer` was added on Fredricks.
- Folds into v25 beside `artist` / `painter` / `musician` / `photographer`.
- Scope: people who performed on stage or screen as a trade. Not for a single childhood
  commercial, and not for producers or directors who never acted — `arts` as a
  `notable_category` still covers those.
- Remove `actor` from the §5 "not canonical" list when v25 is written.

---

## §10 The NB overflow budget is the TALLEST BODY in CHARACTERS — not cumulative words

*Added 13 Sep 2026. **This supersedes §v24-6.1's "~250–260 cumulative body words"**, which
predicts the wrong cards. Keep the 7-block ceiling; replace the length test.*

### 10.1 Why cumulative is the wrong ruler

`NarrativeBlocks.svelte` holds a **single `openKey`** — exactly one body is expanded at any
moment, and the first block is open on arrival. So the card must hold:

```
7 headers  +  ONE body        <- constant, whichever block is open
```

Cumulative length never reaches the screen. Four cards measured this session:

| person | cumulative | longest body | overflowed? |
|---|---|---|---|
| Nelson Rockefeller X03991 | ~250 words | 276 ch | **yes** |
| Rev. J.W.C. Pennington X02151 | 273 words | 267 ch | **yes** |
| Maj. Gen. G. V. Strong HD4700 | 298 words | 264 ch | **yes** |
| Talcott Stanley TD0074 | 349 words | 349 ch | **yes**, on arrival |

Rockefeller sat **inside** the documented 250–260 word ceiling and still spilled. Stanley's
NB1 — the default-open block — was 270 ch, which is why *his NB7 header* fell off the bottom
before the user touched anything. The failure always clips at the BOTTOM, so an open block low
in the list eats its own text and an open block high in the list eats the last headers.

### 10.2 Why characters, not words

Strong's NB7 (43 words / **264 ch**) clipped while his NB4 (44 words / **242 ch**) did not.
Long compounds — `China-Burma-India`, `Michigan Military Academy`, `Army Ground Forces` — cost
lines a word count cannot see. The measure is the line, and the line is characters.

### 10.3 The rule

**No single NB body over 240 characters on a 6–7 block card.** Under that, every card measured
fits at every rung. Cumulative stops mattering: Strong and Pennington both landed at 263 words
after the trim and both fit, because no single body exceeded 240.

```python
assert max(len(b['body']) for b in p['narrative_blocks']) <= 240
```

Put that assert in the build script. Word-count asserts pass cards that clip.

### 10.4 `stage.svelte.ts` — `rung.nbCap` was hiding 734 blocks

The tablet-landscape rung (1050–1240 px wide, or wider under 800 px tall) declared
`nbCap: 5`. Canonical, the payload and `card.py` all report 7; the card rendered 5. **559
people — 7.9% of every NB-bearing entry — were silently truncated**, 734 blocks in all (386
people at 6 losing one, 171 at 7 losing two). Raised to 7 on 13 Sep 2026.

This is the §v24-1 render-contract trap in a new place: *stored ≠ emitted ≠ rendered*, and
`card.py` proves only the first two. **A disagreement between `card.py` and Sam's screen is a
render-layer cap, not a data problem** — check `stage.svelte.ts` before touching prose.

## §v25-N  `last_updated` on the person record  (091426)

New optional top-level key on a person: `"last_updated": "YYYY-MM-DD"`.

Set it whenever an entry is edited. It is **internal tracking only** —
`regenerate-data.js` does not emit it and no card renders it. `validate.py`
ignores it. Purpose: with ~23,600 people it had become impossible to tell which
entries had been worked and which were still first-draft.

Backfill status: **not backfilled.** Only entries touched from 091426 forward
carry it; absence of the key means "unknown, not recently edited." A historical
backfill is possible by walking `git log -p canonical.json` and attributing each
changed id to its commit date, but it is expensive over a 55 MB file and has not
been run.

## §11 New canonical tag: `sea_captain`
*Added 15 Sep 2026 on Hezekiah Brockett (H00886), on the `photographer` (§7) / `actor` (§9) precedent.*

`canonical_tags.txt` held `navy`, `lost_at_sea` and `drowned` but nothing for the trade
itself, so a merchant master could only be tagged `merchant`. A corpus scan for
`sea[- ]captain|master mariner|mariner|shipmaster` returns **58 people** — far past the
threshold that carried `photographer` (1 bearer) and `actor` (4).

- **Added to `canonical_tags.txt` now**, so `validate.py` accepts it immediately.
- Scope: people whose trade was commanding a merchant vessel — masters, shipmasters,
  master mariners. Not naval officers (`navy` covers those), not passengers or owners.
- Applied to H00886 only. **The other ~57 are unswept** — a corpus sweep is available
  work, not done here.

## §12 New canonical tag: `wide_awakes`
*Added 15 Sep 2026 on Capt. Henry Hobart Stiles (HD3923) and Robert Todd Lincoln (X02064).*

The 1860 Republican marching clubs. Added because **Sam wanted "wide awake" to reach a person
through UX search**, and the search index does NOT read artworks or narrative blocks — see below.

### 12.1 What `factSegments()` actually indexes (verified against `regenerate-data.js`)

`n` (every name form) · `born` · `died` · `buried` · `lived` (residence) · `work` (career) ·
`school` (education) · `served` (military_service) · `landmark` · `inst` · **`tag`** ·
`is` (notable_blurb ?? bio_blurb + notable_category).

**Not indexed: `artworks`, `narrative_blocks`, `documents`, `videos`, `cross_connections`.**
Writing a fact only into an NB or an ART record makes it unsearchable. To make a fact findable it
has to land in one of the segments above — a career row and a tag are the two cheapest.

### 12.2 The hyphen rule — put the HYPHENATED form in the data

`fold()` preserves `-`, and the client ANDs the query word by word over the blob:

| stored | query `wide awake` | query `Wide-Awakes` |
|---|---|---|
| `wide awakes` (from a tag, `_`→space) | match | **miss** |
| `wide-awakes` (from a career string) | match | match |

A hyphenated string in the data matches both query forms; a spaced one matches only the spaced
query. **Store the hyphen.** HD3923 carries both (career `North Haven Wide-Awakes` + tag
`wide_awakes`), which is belt and braces.

### 12.3 Cross-connections are now indexed (091526)

`factSegments()` gained a **`linked:`** segment carrying each CC's `link_text` + `display_label`
(and any `co_link` name). 2,172 of 22,778 rows have one. Two things had to be got right:

- **Severance applies.** A CC whose target is `hidden` is skipped, the same rule the emit path uses.
  Without it a hidden person's NAME becomes searchable text on a visible person's row.
- **It uses `pushRaw`, not `push`.** `push()` de-duplicates words within a segment — invisible on
  names and places, but a CC label is PROSE and is shown verbatim in the match reason:
  `"isham's chicago law firm from 1872; the firm bore his name"` lost its second "firm" and
  rendered as *"the bore his name"*.

### 12.4 Store the LONGEST form of a hyphenated term

Extends §12.2. A query term must be a substring of a stored word, so the plural covers the singular
but not the reverse: stored `wide-awake` MISSES the query `wide-awakes`, while stored `wide-awakes`
matches `wide-awake`, `wide awake`, `wide awakes` and `wide-awakes`. Caught on X02064, whose CC
label read "a Wide-Awake company" until it was changed to "a company of Wide-Awakes".


## §13 `--only` staleness is an EDIT problem, not a new-person problem
*Added 17 Sep 2026, after Bela and Mary Kellogg's portraits rendered on their hero cards and
vanished from their chips.*

This is the §v24-1 render-contract trap one layer further out: **stored ≠ emitted ≠ rendered**, and
here the break is between *emitted for this person* and *emitted for everyone who quotes them*.

`personPayload()` embeds a COPY of each neighbour (via `compact()`: `n`, `p`, `by`/`dy`, `sx`,
`hd`/`td`/`ee`/`sp`, `g`, `sn`/`sf`/`fn`/`cf`/`nk`/`cm`, `t`) and embeds relatives' whole client
records under `context`. `regenerate-data.js --only` rebuilds the listed people's pages and skips
both the aggregates and every page holding such a copy.

**Why the old guard missed it.** `batch.py` forced a full rebuild only when a touched id was absent
from the emitted index — true for a NEW person, never for an EDIT. Setting `photo_url` on an
existing person therefore took the incremental path, and the stale copies survived on every
relative's card.

**Why `card.py` cannot catch it.** `card.py` reads the subject's OWN payload, which the `--only`
run just refreshed. The defect lives exclusively in *other people's* files. Verify a chip-surface
change by reading a NEIGHBOUR's payload, or just rebuild fully.

**The fix (in `batch.py`, not in the schema).** `full_rebuild_reason()` diffs each touched record
against the git baseline, ignoring `INCREMENTAL_SAFE_KEYS` — the only fields that reach neither an
aggregate nor another page's copy:

```
narrative_blocks · documents · videos · artworks · statues · quotes
research_notes · research_sources · research_tags · naming_inspiration
last_updated · has_descendants_documented · number_of_marriages
```

Anything else — `bio`, `birth`, `death`, `gender`, `classification`, `parents`, `marriages`,
`tags`, `career`, `education`, `military_service`, `burial`, `residence`, `institutions`,
`landmarks`, `notable`, blurbs, `cross_connections`, `former_ids` — forces a full rebuild, as does
any edit to a top-level registry (those are emitted as whole files).

Note how small the safe set is: **`--only` is the exception now, not the default.** That is the
honest shape of the dependency, and the ~7s it costs is worth never shipping a blank chip again.

## §14 New canonical tag: `victoria_cross`
*Added 18 Sep 2026 on Gen. Sir Harry North Dalrymple Prendergast (X04262), on the decoration-family
precedent set in §5 and the one-bearer precedent of `photographer` (§7) and `actor` (§9).*

§5 added eight military decorations — `croix_de_guerre`, `george_medal`, `legion_of_honour`,
`legion_of_merit`, `navy_cross`, `purple_heart`, `distinguished_service_order`,
`mentioned_in_despatches` — and the Victoria Cross was the obvious missing member of that family.
A corpus scan for "Victoria Cross" returned **zero** records before Prendergast, so he is the first
and only bearer.

- **Added to `canonical_tags.txt` now**, so `validate.py` accepts it immediately.
- Scope: recipients of the VC itself. Not for the George Cross and not for a family's custody of a
  medal — the tag marks the award, not the object.
- Note while here: **`military` is NOT a canonical tag** and is a recurring mistake. The canonical
  members are `army`, `navy`, `general`, and the decoration family above. `validate.py` caught it
  on this very record.
