# HANDOFF — content stream, 29 July 2026

Written for the next bot picking up **early-years entries and NB rebuilds**. Short-lived:
delete this once the early-years pass is done, or fold what survives into `WORKFLOW.md`.

Read `CLAUDE.md`, then `docs/WORKFLOW.md`, then this. This file only holds what those two
don't, plus the state of a large change that just landed underneath the early generations.

---

## 1. THE THING THAT GOT ME FIRED FROM CONTENT

Sam's words, 29 July: *"your content brain is scrambled eggs… it's not the failure of other
people, it's the failure of your writing style, it's monstrous and backwards… don't hurt my
head."*

He is right and it is worth understanding precisely, because the rules in WORKFLOW.md are all
about **length and legality** and none of them catch **bad prose**.

The specific fault, from the block that broke it — Susannah Bryan Newton (I00013), which you
can go read as a worked example of what not to do:

> "Samuel Bryan of Milford married Martha Whiting in 1683 and was gone by about 1698, still a
> young man."

- **The sentence opens on a stranger's name.** The reader is on Susannah's card. They now have
  to hold "Samuel Bryan of Milford" and work out who he is while two more names arrive.
- **The point is at the far end.** Everything before "was gone by about 1698" is setup. The
  reader carries the whole clause before getting paid.
- **Header: "Two Hartford founders in her great-grandfathers."** Nobody says that out loud. It
  is a noun stack, not a sentence.

The pattern across all three of her blocks: front-load names → stack qualifying clauses →
deliver the point last. It reads like a genealogy citation with the punctuation improved.

**Write the other way round.** Lead with the thing that happened, name people once they matter,
let the sentence land early and stop. Read it aloud; if you would not say it to someone at a
table, rewrite it.

The bar is `X00804` (Woodward). Also good, both written this session and approved: **Jay
Gould's** "He changed the name and little else", **Sandra Ingalls's** "Clove Brook Farm, and the
view she saved", **John Burt Lyman Jr.'s** three blocks.

---

## 2. EDITORIAL RULES SAM GAVE THIS SESSION THAT ARE NOT IN WORKFLOW.md

Confirmed absent from `WORKFLOW.md` (I checked). Treat them as law.

**Prose**
- **No fourth wall.** Never make a source document the subject. *"I'm not sharing docs and
  screenshots with you so you can 4th wall it and talk about the publishers themselves — you
  are telling the story of the people, which gets lost."* Attribution goes to `research_notes`.
- **Bodies are slices, not walls.** ~2 sentences, 30–45 words. *"These are slices of narrative,
  a sampler; users can look elsewhere if they want to dig deeper."* 80-word blocks get rejected.
- **Never repeat implicit fields.** Birthplace, death place, age at death, parents, and the
  spouse's name are already rendered on the card. A block that restates them is filler. Sam:
  *"is there a single fact or piece of meat that isn't just repeating implicit fields?"*
- **Headers need a concrete anchor.** A person, a place, a title, a number — while withholding
  the payoff. Pure angle fails: *"too much angle, not enough concrete… no one can browse them
  and learn anything."* Bad: "The clinic that tested everyone." Good: "First in the state to
  test for HIV."
- **Don't assume what people knew or felt.** *"I'm sure they knew, and we can assume they aren't
  morons."* An NB claiming a couple didn't realise they were cousins was cut for this.
- **Bury bad news mid-body, never in a header.**
- **Order by relevance, person first, family last.**
- **Don't say "Hooker line" out loud in UX.** Say who married whom and how close they sit in the
  tree.

**Blurbs**
- Noun-phrase labels, **never** compressed stories with verbs. *"Stop making blurb an NB
  substitute."* Max 8 words (validator blocks at 9).
- **Never define a woman by whom she married.** Flagged three times this session.

**CCs**
- The label completes "**[link_text] ___**", so it describes the *linked* person, not the card
  owner. Getting this backwards is easy and Sam catches it every time.
- **Name the second person when a pronoun is ambiguous** — two men in one label and "his"
  collapses. Sam calls it "the 'he' problem."
- **Leading appositive** for family: `", his grandfather, …"` not `"his mother Abigail's
  father, …"`.
- **null > weak.** A CC built on two people merely having similar careers was called *"could be
  your worst one yet."*
- Never CC a parent/child/spouse/sibling — the structural link already says it.

**Above all**
- **READ THE EXISTING NBs BEFORE ADDING ANY.** The single most damaging thing I did this
  session was append blocks to eight people without reading what was already on them, producing
  duplicates. The whole exercise was reverted. `research_notes` is not enough — read
  `narrative_blocks`.

---

## 3. THE GROUND JUST MOVED UNDER THE EARLY GENERATIONS

A **Talcott severance** landed 28–29 July. It is the thing most likely to confuse you, because
it is concentrated in exactly the generations you are about to work on.

- **1,264 people now carry `classification.hidden: "talcott_2026"`.** They are complete in
  canonical.json and **absent from everything emitted** — no page (slug 404s), no search row, no
  table seat, no chip, and any CC pointing at them is dropped at build.
- **Check `classification.hidden` before you write.** Writing a block about someone's father is
  wasted if the father is hidden — the reader cannot reach him. That is *why* Jeremiah
  Wadsworth is cross-connected to his grandfather: both his parents are hidden.
- **11 Talcotts were kept** (`_review/talcott-keep.tsv`) as in-law easter eggs, plus John
  Talcott himself as an orbit figure.
- **Do not hand-write in-law labels.** Setting `is_easter_egg` makes `computeInLawLabel` derive
  "Father-in-law of Fourth Generation Hooker" by itself. Only two people needed a
  `relational_label_override` and both are exceptions.
- `SHOW_TALCOTT_DESCENT = false` in `src/lib/utils/generation.ts` suppresses every Talcott
  descent label. One word reverts the whole thing.

**Early-years NBs are full of migration junk.** Many oldest records carry blocks with
`"migrated_from": "historical_significance"` — one-line fragments whose header is the first ~50
characters of the body, truncated **mid-word**. John Talcott (T00011) has eight of them:

> header: `Co-founder of Hartford, Connecticut alongside Rev. Thomas Ho…`
> body:   `Co-founder of Hartford, Connecticut alongside Rev. Thomas Hooker`

Header and body identical, ellipsis included. **These are your richest rebuild targets** — the
facts are good, the form is machine wreckage. Grep `migrated_from` to find them.

---

## 4. PIPELINE TRAPS — verified missing from `pipeline-gotchas.md`

Each of these cost me a round trip this session.

- **`parse_kv` splits an unquoted value at the first space.** `org=Phyn and Ellice` stores
  `"Phyn"`. **Quote every multi-word value.** This silently truncated ~7 fields before I caught
  it on read-back. Values also **cannot contain a double quote** at all.
- **Dead keys that store fine and never render:**
  - education `institution=` → the card reads `institution_id → institution_name →
    school_name`. **Use `school_name`.**
  - career `org=` → the card reads `c.organization`. **Use `organization`.** 42 rows across 15
    people were showing a job title with no employer.
  - education `degree` and `end_year` **never render**. Put them in `dates` (`dates="A.B. 1916"`).
- **`career_set` / `education_set` MERGE, they do not replace.** Old keys survive alongside the
  new ones; strip them in a second pass. They also write years as **strings**, and the card
  sorts career rows numerically.
- **The `cc` op never updates an existing label.** It appends only when the connection is
  absent, and reports `OK … (reciprocal present)` while changing nothing. To reword a live CC
  you must patch canonical by hand.
- **`landmark` with `lm_id=` ignores `photo_url` and `url`** — those only apply on the create
  path.
- **`nb_replace` needs the full replacement** (`old=` **and** `header=` **and** `body=` **and**
  `category=`), otherwise it flags.
- **NB category `life` is not in the enum.** Use `character`, `legacy`, or `death`.
- **`nb_approved` only WARNS on a >8-word header** — it does not block. Pre-flight the count
  yourself; the validator will error later.
- **`validate.py --baseline` reports `SILENT LOSS` for an authorised `nb_remove`** until you
  commit. It diffs against git HEAD and has no knowledge of the authorisation. Standalone
  `validate.py canonical.json` is the real error count; the baseline run is the loss guard.
- **New rule I added:** a visible person may not CC a hidden one. **It fires 48 times right
  now** — those are pre-existing, all at the severance seam, and not your fault.

---

## 5. DATA DEFECTS THAT WILL BITE A CONTENT PASS

- **751 records carry a parent's *name* with no parent *id*.** These read as floating orphans.
  Four people I nearly deleted as unconnected turned out to be fathers-in-law of the tree whose
  `father_id` was simply never filled in — one had the id sitting in its own `research_notes`.
  **Before concluding someone has no connection, grep their name across the file.**
- **229 people have a marriage and no gender in either field.** Their label degrades to "Spouse
  of". A research worklist, not a bug.
- **341 education rows** carry a degree or year in a non-rendering key with no `dates`.
- **2,087 career rows have no `start_year`** and therefore render without a date.
- Duplicate people are common in the oldest generations and often present as *a second marriage
  to the same spouse*. Two found this session (Bertha Dep. Snowden; Mary Newton HD0003).

---

## 6. STATE AT HANDOFF

```
18,119 people   16,855 visible / 1,264 hidden
errors 1297     warnings 4205        (standalone validate.py)
git: committed, 1 commit ahead of origin/main
dev server: localhost:5173
```

**One open question I did not finish:** whether any hidden id survives *inside* an emitted
payload — in the `context` block, a registry roster, or a `marriages[].spouse_name` string. The
aggregates and page files are confirmed clean; that last scan is one command and was interrupted.

**Unbuilt / unresolved, all flagged in the relevant `research_notes`:** Lathrop Stiles Ellis
died 1888 Manistee or 1900 Chicago; Story Wright's husband is Thomas P. or John P. Wright;
Mary Newton (HD0003) may be a ghost of H00048; Sandra Ingalls's three children; Sjohytta in
Maine; Vivian Bertram; the HD5603/HD5604 merge.
