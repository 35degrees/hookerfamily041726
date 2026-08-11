# schema v24 — planning doc (open, added to as we go)

**Status: OPEN.** This is the accumulator for rules Sam has established since v23 that are not
yet folded into `hooker_json_schema_v23.md`, `WORKFLOW.md`, or `pipeline-gotchas.md`. It exists
so Sam does not have to re-type the same doctrine to each new session.

Started 10 August 2026, during the Pynchon-line enrichment. Where a rule here contradicts v23,
**this document wins** — it is the more recent decision.

When this settles, fold §1–§3 into `WORKFLOW.md` (editorial), §4 into `pipeline-gotchas.md`
(mechanical), and §5 into the schema body, then delete this file.

---

## 1. NARRATIVE BLOCKS — the ceiling moved to 7 (10 Aug 2026)

**Max NBs per person is now 7, up from 6.** Sam raised it after Stream B work gave FeaturedCard
the vertical room. Enforced at `validate.py:NB_MAX_PER_PERSON` and displayed by `card.py`; both
were updated the day the rule changed.

**The ceiling is conditional on header length.** Sam:

> "not if all the NBs are long, then the headers will extend past the bottom border of Featured
> Card. but null > weak so don't just dump weak stories in there, a great four NBs with meat
> beats 7 NBs that repeat information or don't really help the user engage with the person."

So: seven is available, not a target. Seven **short** headers fit; seven long ones overrun the
card. The existing ≤8-word header rule is necessary but not sufficient — watch rendered
character count too (~50 chars is the practical wrap point, and `card.py` prints `Nw/Nc` for
exactly this reason).

**Null still beats weak, and it beats filling the new slots.**

**The cap lives in three places and they must move together.** `validate.py:NB_MAX_PER_PERSON`
(the data gate), `card.py`'s display fraction, and the frontend content budget — which is
itself two numbers: `NarrativeBlocks.svelte:MAX_DISPLAYED` and `stage.svelte.ts`'s
`nbCapForWidth()` roomy return plus the `rung.nbCap ?? N` fallback. All five were raised to 7
on 10 Aug 2026. Raising only the validator writes a seventh block that the card silently
declines to show, which is exactly how this was found.

## 1a. NB HEADERS — concrete, not riddles (10 Aug 2026)

Sam, on the first seven-block card:

> "your NB headers are all a bit obscure, which is technically correct… i want to have user
> engaging NB header to encourage curiosity and engagement with the person and a motivation to
> expand to reveal the NB bodies, but i also want the user to be able to just browse the
> headers at a glance and learn something about the person. so all the NB headers can't be
> obtuse angles that doesn't really say much without revealing the bodies."

This is a **correction to how v23's hook rule had been applied**, not a repeal of it. v23 §5
says the header "creates a question" and must not be a summary, and reading that alone produces
a card of riddles: a scanner who never expands learns nothing about the person.

**The standard: the header carries a fact AND withholds the payoff.** Both, in the same eight
words. Not a summary that answers, not an angle so oblique it says nothing.

- Some concreteness in most headers; Sam allows that not literally every one needs it.
- **The scan test:** read only the headers, expanding nothing. Do you now know roughly who this
  person was and what they did? If the answer is "no, but I'm curious," the card has failed
  half its job.
- A header with an undefined "it" or "he" — no name, place, title, number or date anywhere in
  it — fails outright.

Worked example, William Pynchon (Y00004), before and after. Every "before" is legal under v23
and every one is a riddle:

| before | after |
|---|---|
| Boston's executioner burned his book | Boston's executioner burned his book in 1650 |
| He chose the spot where ships stopped | He founded Springfield above the last navigable falls |
| His quarrel with Hartford moved a border | He took Springfield out of Connecticut, 1638 |
| A stolen petticoat, and orders not to force | A stolen petticoat, and a warrant forbidding force |
| He apologized, then signed everything to John | He recanted, then sailed for England in 1652 |
| In England he took the apology back | Back in England he published the argument again |

Note what the "before" column never once says: that he founded Springfield. Seven legal hooks
that omit the single fact the man is known for. That is the failure this rule exists to catch.

## 2. THE WOVEN-THEME DOCTRINE — entries reinforce each other (10 Aug 2026)

This is the most important thing in this document and it is not anywhere in v23.

> "the ideal entries are ones that have bigger themes and stories woven through the NBs and
> then when you click on their kids or parents or spouses, those same stories are reinforced
> from the point of view of the spouse. each entry is focused on the angle of the entry."

Concretely:

- A batch is **not** one person. Research pasted for one person is material for **everyone the
  research touches** — wives, spouses, children, parents, and descendants many generations
  down. Sam: *"you don't need to just update one entry's NB in one chat, all this material
  should be available for you to enrich wives, spouses, kids, parents etc, even descendants
  like Thomas 12 gen away."*
- The same event told on two cards must be told **from each card owner's side**, not copied.
  Worked example from batch 1: Frances Sandford's death on 10 October 1657 and Mary Pynchon
  Holyoke's on 26 October 1657 are one fact and two blocks — on Frances's card it is *she died
  sixteen days before her stepdaughter*; on Mary's it is *her stepmother died sixteen days
  before her, in the English village her father had retired to*.
- This does **not** loosen the v23 §5(h) subject-discipline rule. Each block's centre of
  gravity stays the card's owner. A block on Ann Andrew about how impressive her son John was
  is still illegal, however tempting when her own record is thin.

## 3. WHEN THERE IS NO RESEARCH — the unique-bio-fact escape hatch (10 Aug 2026)

> "if there's no research I can dig up we can always share bio facts like interesting things
> you find that a user might not notice like she died the same week as her husband or she lived
> 50 years longer than her kids, but those have to be unique bio facts, we don't just repeat
> standard facts and dates that are not that unique and are already implicit in the existing
> fields."

The test: **would a user scanning the card notice this on their own?** Cross-record arithmetic
(two deaths sixteen days apart on opposite sides of an ocean; a mother outliving every child;
a marriage at fifteen) passes. Birthplace, death place, age at death, spouse's name and parents'
names all fail — they are already rendered.

This is licence for *observation*, never for inference. v23's arithmetic rules still bind: build
STRUCTURE from arithmetic, never a DATE; and verify any longest/last/oldest/only claim against
every sibling's dates before writing it.

## 4. SOURCING — scoped fetch permission (10 Aug 2026)

The standing rule is no external fetching; a missing value is flagged to Sam, never looked up.
**Sam granted a scoped exception for the Pynchon subgroup**, with an explicit order of
precedence:

> "you are allowed to fetch for this grouping but I am going to share my research first so work
> with what I share first and combine it or use your fetched research secondarily. i want brand
> new material i will research but I'm giving you permission to fetch as well for this pynchon
> subgroup."

So, inside the Pynchon line only: Sam's pasted research is the spine, fetched material is fill
and verification. Outside it, the no-fetch rule stands unchanged. The permission is per-grouping
and does not generalise; a new grouping needs a new grant.

**Fetching is most valuable for adjudicating a conflict, not for bulk.** Batch 1's one fetch
settled whether Ann Andrew ever crossed the Atlantic, which decided whether she had a story.

## 5. SOURCE PRECEDENCE IN PRACTICE — the paste is not the top of the hierarchy

Sam's pastes routinely combine FindAGrave, FamilySearch, Wikipedia, and screenshots of
scholarship. They are not equal, and the screenshots usually win. Batch 1 produced two
contradictions inside a single submission, both resolved toward Anderson's *The Great Migration
Begins* (peer-reviewed, top of the v23 §0.8 hierarchy):

| field | the typed paste | the screenshot | resolution |
|---|---|---|---|
| William Pynchon's birth | 11 Oct 1590 (FindAGrave/Wikipedia) | "about 27 December 1590" (Anderson) | year only, no day written, flagged |
| Ann Andrew's death | 30 Aug 1630 | "during the winter of 1630-1" (Anderson, citing Dudley) | year only, flagged |

**The pattern to keep:** when two of Sam's own sources disagree, write the field at the
precision both support (usually `year_only`), record both claims in `research_notes`, and put
the adjudication to Sam. Do not silently pick. This is the §10.8 "empty field was the correct
call" precedent applied to precision rather than to the whole field.

## 6. THE PYNCHON LINE — how it is wired (reference)

- **Two different sets, deliberately.** `isPynchonKin()` drives the **rainbow background** and
  covers only the direct line to Thomas Ruggles Pynchon Jr. (X03232) plus Jackson (HD6314) plus
  the mother at each step. `pynchonGeneration()` drives the **second title line** and covers
  every descendant of William (Y00004) that we have chosen to include.
- **Both are derived, not listed.** `scripts/derive-pynchon-line.mjs` walks the parent graph and
  regenerates `src/lib/data/pynchonLine.ts`. **Re-run it after any canonical change that touches
  a parent link on the line.** Never hand-edit the generated file.
- **Expanding the titled set is a `TITLE_ONLY` edit and is Sam's approval only.** A full
  descendant walk from William reaches 955 people — the whole American Pynchon tree, far more
  than is meant.
- **This line carries no Hooker blood.** The Pynchons reach the tree through Mary Hooker's
  stepdaughter Rebecca Hart — network, not blood — and Jackson's only Hooker descent is
  maternal, through the Roosevelt–Carow line. Sam, 10 Aug: *"he is NOT a Hooker descendant at
  all and there's no Hooker blood in William."* The line is a curated easter-egg wormhole,
  admitted by Sam's decision rather than by the Jalapeño Rule, so **do not "fix" the
  classification and do not apply the no-blood-tie deletion rule to it.**
- **Angle the line at the Hooker relationship where it is real,** without letting it eat every
  block. William's split with Thomas Hooker and John Mason over Pequot policy — the quarrel that
  moved Springfield out of Connecticut — is the legitimate spine. It is carried by one NB and
  one reciprocal CC, not by all seven blocks.

## 7. CEMETERY COORDINATES — the standing habit (10 Aug 2026)

> "if the CEM exists link it to the entry by ID, and double check it has the GPS, I'll always
> try to post CEM GPS here… and if the CEM doesn't exist you can create a new CEM object."

Coordinates go in `gps: {latitude, longitude}` — decimal degrees, nested. A flat top-level
`lat`/`lng` never renders. Allocate the id from the live numeric maximum
(`int(re.sub(r'\D','',id))`, never lexically — CEM ids run past 999 and padding is mixed).
Wire both directions: `person.burial.cemetery_id` and `cemetery.hooker_connections[]`.

## 7a. THE PRISM CARD HAS NO PANEL BACKGROUNDS (10 Aug 2026)

The burial pin in `RightColumn.svelte` paints two masking layers behind its text — a solid fill
and an 18px gradient strip — so that an overflowing right column's rows do not collide with the
always-on pin. Both resolve to `var(--card-fill, #fff)`, and **`--card-fill` is never actually
set anywhere**, so both are unconditionally solid white. Invisible on an ordinary card; on a
Pynchon card they paint a white slab across the spectrum. Sam: *"there's no background needed
around CEM it should just be text on top of original rainbow."*

A flat colour cannot mask a gradient, so there is no fill that fixes this — the layers have to
go where the rainbow is. They are now suppressed by `{#if !isPynchonKin(person.id)}` rather than
deleted, because the mask is load-bearing on the other ~19,000 cards. **The accepted cost:** a
prism card whose right column overflows can show the collision the mask was added to hide.

**General rule this implies:** any new panel, chip or backdrop that assumes a flat card
background needs a prism check before it ships. The rainbow makes every opaque rectangle
visible.

## 7b. TALCOTT SEVERANCE — deletion, not hiding (10 Aug 2026)

The 1,264 `classification.hidden: "talcott_2026"` people are a *previous* stage. Sam's current
direction for Talcott-side records that surface during other work is **outright deletion**:
*"because we remove Talcott descendants completely, please delete the following cards
completely, don't even hide them just delete."*

Deleted this batch: Y00003 Mary Pynchon Holyoke, Y00002 Capt. Elizur Holyoke, X01778 (his
second wife, Stebbins), Y00005 Edward Holyoke. People 19,885 → 19,881.

**The mechanics that must not be skipped** (v23 §0.12 plus the 3 Aug handoff §10.1): scrub every
inbound reference *before* dropping the records — `marriages[].children_ids`,
`parents.father_id`/`mother_id`, `marriages[].spouse_id`, reciprocal CCs **in both directions**,
and the non-`people` containers (cemetery `hooker_connections`, institution rosters, war
`person_ids`). This batch's dropped Pumpelly CC is the worked example of the both-directions
trap: removing William's half left Pumpelly's half dangling, and `validate.py --since` caught it
as a one-directional CC on the next run.

**Salvage first.** Anything on a doomed record that belongs to a surviving person's story goes
into that person's `research_notes` before the delete. Mary's gravestone verse now lives on
William's entry. It does **not** become an NB on William — an NB centred on his daughter still
violates v23 §5(h) subject discipline, and Sam's permission to move material does not repeal it.

**Re-run `scripts/derive-pynchon-line.mjs`** after any deletion on the line, and prune the
deleted id from `TITLE_ONLY` first — it is a hand-maintained list and the only part of that file
that cannot heal itself.

## 7c. TOP-LEVEL MEDIA — which key each resolver actually reads (10 Aug 2026)

Verified against `regenerate-data.js`, not inferred. The three media types do **not** share a
shape, and the ART row is a standing exception to the `primary_name` rule in
`pipeline-gotchas.md`:

| record | title key the card reads | link | image | how a person is attached |
|---|---|---|---|---|
| `artworks[]` | **`title`** (NOT `primary_name`) | `primary_url ?? url` | `photo_url ?? image_url` | person-side `artworks[] = {artwork_id, role, artwork_blurb}` |
| `landmarks[]` | **`primary_name`** | `primary_url ?? url` | `photo_url ?? image_url` | person-side `landmarks[] = {landmark_id, landmark_blurb}` |
| `statues[]` | **`name ?? description`** | `url` | `photo_url` | **inverted** — no person-side field; the statue carries `subject_id` **and** `person_ids[]`, and `resolveStatues` unions the two |

Consequences worth keeping:

- **The artwork `artwork_blurb` DOES render** (as the row's subtitle), unlike the person-side
  `landmark_blurb`, which `resolveLandmarks` hard-codes to null. So an artwork gets a per-person
  line and a landmark does not — write the landmark blurb for the record, the artwork blurb for
  the card.
- **A statue reaches a whole family through `person_ids[]`.** `subject_id` is singular and means
  *who it depicts*; `person_ids[]` is the extra roster. This is how the William Pynchon statue
  appears on Frances's and John's cards without claiming they are its subject.
- `statueTypeLabel('statue')` renders as an em-dash in the type slot. Cosmetic, matches every
  existing statue record, not worth a data change.

## 7d. OLD STYLE / NEW STYLE DATES — not every date conflict is a conflict

John Pynchon's death arrived as "17 January 1702" in one place and 1703 in another. Both are
correct: under the Old Style calendar the year turned on 25 March, so any date between 1 January
and 24 March carries two year numbers. **Before flagging a one-year gap in a pre-1752 date as a
source conflict, check whether the date falls in that January-to-March window** — if it does, it
is the calendar, not a disagreement. Record the New Style year and note the dual form
(17 January 1702/3) in `research_notes`.

## 8. OPEN QUESTIONS PARKED HERE

- **Exposition/world's-fair medal tag.** Still unruled from the 3 August handoff.
  `world_fair_medal` / `exposition_medalist` were offered for Allen Butler Talcott's 1904
  silver; `olympian` would be false (art competitions began 1912).
- **Does the `notable_category` enum need `exploration`-style additions for founders?** William
  Pynchon took `business, religion, author`; none of them is quite "founded a city."
- **The 7-NB ceiling has not been visually stress-tested.** Y00004 is the first seven-block card
  in the file. If its headers clear the bottom border, that confirms the rule; if not, the real
  constraint is total header characters, not block count, and should be written that way.
