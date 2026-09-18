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
