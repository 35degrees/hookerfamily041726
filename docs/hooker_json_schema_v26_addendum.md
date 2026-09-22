# Schema v26 — running addendum

**Status: a TALLY, not the law.** `hooker_json_schema_v25.md` is still THE structural law.
This file collects schema-affecting changes as they happen so the v26 rewrite can be done
once, comprehensively, instead of reconstructed from git archaeology. When v26 is written,
this file folds into it and is deleted.

Each entry says what changed, where it is enforced, and what breaks if you ignore it.

Opened 22 September 2026.

---

## §1. THE REGISTER — this is a family genealogy, not wire copy

*Settled 22 Sep 2026 (Sam), on Marion Sabina Kuhn Hooker `X02265`. Not machine-enforceable;
this is the §0.3 companion to "null beats weak."*

The block that triggered it, and every fault in it:

```
BAD   "Born on a leap day, dead at ninety-six"
      Marion was born on 29 February 1904 and died of pneumonia on 5 September 2000,
      sixteen years after Robert Gay Hooker. The birthday she was born on came round
      only twenty-four times in all those years.

GOOD  "She was born on a leap day"
      Marion was born on 29 February 1904, and outlived her husband by sixteen years.
      She died of pneumonia at Washington in the September of 2000.
```

Sam: *"this is family… you aren't generating goodwill from users or engaging them, these
are cold and clinical. it's not changing the information or editing facts, it's just a
softer less cold touch."*

### 1.1 On a person's own card, their spouse is "her husband" / "his wife"

Naming the spouse in full on the subject's own card reads like two strangers in an
encyclopedia. Use the full name only on **first introduction** on that card, or on
**someone else's** card.

```
BAD   (on her card)  "Marion outlived Robert Gay Hooker by sixteen years"
GOOD  (on her card)  "Marion outlived her husband by sixteen years"
BAD   (on her card)  "John Meredith Read died at Paris in December 1896. Delphine stayed on"
GOOD  (on her card)  "Delphine was widowed at Paris in December 1896 and stayed on"
```

The second pair also fixes **§v25-0.3.2's card-owner rule** — the bad version puts someone
else in the subject position on her card. The two faults travel together.

### 1.2 No headline constructions

"Born on a leap day, **dead at ninety-six**" is a wire-service header. Say it the way the
family would. This is the same instinct as the §v25-0.3.3 riddle-header ban, on the other
axis: a header may not be lurid, and it may not be a news deck either.

### 1.3 Never explain common knowledge

*"users know what a leap day is. this is a genealogy not a calendar tutorial."* Do not
gloss a holiday, a war, a common term, or a calendar mechanic. State the specific fact and
let the reader bring the rest. Explaining is the tell that a block is padding.

### 1.4 240 is a CEILING, not a target — there is no minimum

*"i don't have a minimum word count to achieve and I'm not just trying to waste peoples
time."* The corrected block above is **140 characters against a 200-character original and
says more.** Writing toward the cap is the single most common way a block goes cold: the
filler that reaches 240 is always the explaining, the restating, or the full formal name.

**The goal of a block is to engage the reader with the entry and give them enough to go off
on — not to be comprehensive.** Comprehensiveness is Wikipedia's job.

### 1.5 The two rules that were misread into this, and what they actually mean

Both of these are correct and both stay. They were producing the cold register because
neither says what it is scoped to:

| rule | what it is aimed at | what it does NOT license |
|---|---|---|
| §v25-0.3.2 **"Name people. Never pronoun-track."** | pronoun soup — *"he married her and they had four"*, unreadable two blocks later | banning **relationship words**. "Her husband" is a *naming*, and on her own card it is the warm and unambiguous one |
| WORKFLOW §3 **"Dry, EH-register… not Disney/sentimental"**, schema §D.6 *"write for historians, not for a children's book"* | not watering down **substance**; no invented feeling; no tabloid | being **clinical**. It governs what you claim, not how coldly you say it |

And §v25-1 already names the audience — it ends **"descendants who care about history."**
The register has to actually serve that last clause.

---

## §2. CORRECTION to §v25-0.6.3 — a career row with no `start_year` DOES render

*Red-proven twice, 21–22 Sep 2026. §v25-0.6.3, `CONTENT_BUGS.md` §1.3 and `validate.py`'s
warning text are all wrong, and they propagate into each other.*

The current law says a year-less career row "is stored and never rendered." It renders.

- `RightColumn.svelte:25-32` sorts by `end_year ?? start_year ?? -Infinity` and `.slice(0, 3)`.
  **It never filters on years.**
- `careerLine()` always prints `role, organization`.
- `careerDates()` returns `null` when both years are absent, which omits **only the date
  suffix**.

Verified on a live card, not inferred: `HD3248` was given three rows, two of them year-less
and both flagged by the validator as invisible. All three render; the year-less two print as
`(no dates)`.

**The one real effect:** `-Infinity` sorts a year-less row **last**, so it can be pushed off
the card when a person already has more than three rows.

**What to change when v26 is written:**
1. §v25-0.6.3 — rewrite as a *sorting* hazard, not a visibility one. It is not one of the
   "invisible data" bugs and should leave that tier.
2. `CONTENT_BUGS.md` §1.3 — the class is sized at **2,266 rows on 1,358 people** on the
   false premise. Most of those rows are visible and fine. Re-scope to "rows that are
   4th-or-later on their person."
3. `validate.py:319-323` — the warning text says `(will not render)`. It should say
   `(sorts last; may be pushed out of the top 3)`. **This is the one that costs time**: it
   makes a clean batch report dirty and invites a fabricated year to "fix" it, which
   §v25-0.6.3 itself forbids.

`docs/pipeline-gotchas.md` already has this right and has since 072726. It was the only one
of the four that did.

---

## §3. ADDITION to §v25-0.6.1 — the missing marriage row also kills the relationship TITLE

*Found 21 Sep 2026 on `X03579` (Gen. John Meredith Read Jr.).*

§v25-0.6.1 says a parent linked from below but not listed on a marriage row renders **no
child chip**. True, and incomplete. There is a **second** consumer of the same field:

```js
// src/lib/utils/generation.ts — computeInLawLabel()
const childrenIds = (person.marriages || []).flatMap((m) => m.children_ids || []);
```

`computeInLawLabel()` walks *only* `marriages[].children_ids` to find the child whose spouse
is a descendant. With an empty `marriages` array it returns null, the easter-egg fallback in
`generationLines()` produces nothing, and the person renders with **no relationship title at
all** — not "Father-in-law of Nth Generation Hooker", not anything.

So one empty array causes **two** visible defects, and the second one is easy to misread as
a labelling bug and "fix" with a `relational_label_override`. The fix is the same spouseless
marriage row §v25-0.6.1 already prescribes.

**Also required for the title:** `classification.is_easter_egg` must be `true` — the in-law
fallback is gated on it (`generation.ts:132`). A correctly wired parent-in-law with the flag
unset is still titleless.

---

## §4. `bio.chip_first_name` is the chip field; `bio.nickname` is deliberately ignored

*Confirmed 22 Sep 2026 (Sam), on `X02267` Katherine Hill Kuhn and `X02265` Marion.*

To make a chip read by the name the family used, set **`bio.chip_first_name`**. Do not reach
for `bio.nickname` — `regenerate-data.js:409` ignores it on purpose ("the tree has ~400
nicknames, many bad chip reads").

- `cf` — `chip_first_name` alone. **Sibling chips only.**
- `nk` — `chip_first_name` + `chipSurname()`. Every other chip type.
- `chipSurname()` takes **maiden name** for women, so `chip_first_name: "Dolly"` on a
  married-in woman renders **"Dolly Kuhn"**, not "Dolly Hooker". That is the corpus
  convention, not a bug.
- To override the whole label verbatim — first name *and* surname — use **`bio.chip_name`**,
  which wins over both.

Removing a nickname from `display_name` (`Katherine "Katie" Hill Kuhn` → `Katherine Hill
Kuhn`) **does not move the slug**: `baseSlug()` builds from `bio.first_name`, not the display
name. No `former_ids` entry is needed for that edit.

---

## §5. Open — needs a decision before v26

- **`validate.py:319-323` warning text** (see §2.3). Fixing it is a one-line code change and
  is the highest-value item here; it is currently mislabelling correct data on every run.
- **Cypress Lawn Memorial Park, Colma exists three times** — `CEM267` (47 burials, GPS,
  Wikipedia URL), `CEM1742` (already stamped `merged_into: CEM267` and never deleted), and
  `CEM1803` (unflagged). `CONTENT_BUGS.md` §4.1 counts 62 duplicate pairs; this one is a
  **triplicate** and its merge is Sam-authorised only.
- **Whether §1 above lands in `WORKFLOW.md` §3 instead of the schema.** It is editorial law,
  not structural law, and WORKFLOW is where "what is good" lives — but §1.5 corrects two
  rules that live in the schema, so it may need to sit in both.
