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

## 8. OPEN QUESTIONS PARKED HERE

- **Exposition/world's-fair medal tag.** Still unruled from the 3 August handoff.
  `world_fair_medal` / `exposition_medalist` were offered for Allen Butler Talcott's 1904
  silver; `olympian` would be false (art competitions began 1912).
- **Does the `notable_category` enum need `exploration`-style additions for founders?** William
  Pynchon took `business, religion, author`; none of them is quite "founded a city."
- **The 7-NB ceiling has not been visually stress-tested.** Y00004 is the first seven-block card
  in the file. If its headers clear the bottom border, that confirms the rule; if not, the real
  constraint is total header characters, not block count, and should be written that way.
