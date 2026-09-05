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

**CC `display_label` 70-char cap now has sanctioned exceptions.** Two labels (X02039↔H00001)
deliberately exceed it to carry a quotation, by Sam's explicit leave. They sit permanently in
the `C4_cc_label_over_70` counter; that counter is no longer a pure error signal.

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
