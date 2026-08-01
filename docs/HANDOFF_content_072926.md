# HANDOFF — content stream, 29 July – 1 August 2026

Written for the next bot picking up **early-years entries and NB rebuilds**. Short-lived:
delete this once the early-years pass is done, or fold what survives into `WORKFLOW.md`.

**§1–§5 are the 29 July session (early-years / Talcott severance). §7–§9 were added 1 August
after a long Newton-descent build and are the more current picture.** §6 has been refreshed.

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

## 6. STATE AT HANDOFF (refreshed 1 August 2026)

```
19,247 people   17,983 visible / 1,264 hidden
errors 989      warnings 4163        (standalone validate.py -- this is the standing §C debt)
git: committed and PUSHED through 81a67edf; working tree clean
dev server: localhost:5173
```

Note the error count **fell** from 1,297 to 989 across these sessions while the file grew by
~1,100 people. Nothing was deleted to achieve that; it is the §C drawdown plus the fact that
`validate.py --since` catches new defects at the moment they are introduced.

**Always validate with `--since`**, never plain:
```
cp canonical.json /tmp/baseline.json      # BEFORE the edit script
python3 validate.py canonical.json --since /tmp/baseline.json
```
A plain run prints `BLOCKED` every single time because of the standing debt, which teaches you
to ignore it. `--since` prints only what *your* batch introduced, and `SILENT LOSS: none ✓` is
the line that matters most.

---

## 7. WHAT THE 1 AUGUST SESSION ACTUALLY DID

A single long descent build out of the printed **Newton family history** Sam pasted in
fragments, plus FamilySearch extracts. Roughly 75 new people. The shape, so you can navigate it:

- **Dea. Abner Newton (HD6420)** and Abigail Fairchild (I01775), Durham CT — eight children,
  all now dated and NB'd. This is the anecdote-rich core; the source is a family memoir with
  real voice in it (a candle held up to a dead twin's face, eight cents postage due on a
  farewell letter, "a knock in the jaw" meaning a glass of bitters). **If more of that memoir
  arrives, it is the best NB material in the file after Woodward.**
- **Elisha Fairchild Newton (HD6442)** → Sally Camp → Israel Camp Newton and Abigail Maria,
  who married her first cousin **Henry Ward (HD9360)**, son of Elisha's sister **Parnell
  (HD6441)** and **John Ward (I03040)**. The cousin marriage is told from all three angles —
  that is deliberate, each card needs it from its own owner's point of view.
- **Parnell → Harriet Elizabeth Ward → Loomis → Pierce**, ending in Glenn Racine Pierce and
  Helen Elizabeth Loomis (five children, gen 11).
- **Rev. Roger Newton D.D. (H00151) → Susannah Newton Pierce (HD3323) × Proctor Pierce** →
  John R. Pierce → **John Warren Pierce (HD9384)** of Cohasset MA → six children → Sarah
  Lurinda × Clarence O. Green → six more → **Irving Osborne Green (HD9393)** × Josephine St
  Onge → four. This is a wholly separate Pierce family from Glenn Racine Pierce; do not merge
  them.
- **Ozias Hall Newton (HD3321)** and the Bates marriages — **Dr. Stephen Bates married two
  Newton sisters**, Hannah then Harriet, and had three children by the first and two by the
  second. Both of Harriet's are daughters named for aunts.

**Recurring shapes in this family, worth knowing before you write:** cousin marriages (four
found), a man marrying two sisters (twice), names reused after a child's death (two Carolines,
two Theodores elsewhere, an Abner in three generations), and surname drift inside one sibling
group (four `Green`, two `Greene`; `Pierce` vs `Peirce`). **These are the NBs Sam keeps.** He
does not keep "farmer who lived in Durham."

---

## 8. EDITORIAL CORRECTIONS SAM MADE THIS SESSION

Additive to §2; same standing.

- **"Easy on the 'dead sister' words — soften it."** A header may carry bad news only if it
  does not land it coldly. `"She married her dead sister's husband"` was rejected;
  `"She came into her sister's house"` was kept. **The body may state the death plainly.** The
  header is the doorway and must not read as a verdict on the person.
- **Never write "British Colonial America"** (or "Massachusetts Bay Colony" pasted from
  FamilySearch). Sam: *"i can't help but copy it."* Use the plain modern state and country.
  Currently 0 occurrences in canonical — keep it that way.
- **Never write "not on the record" / "not recorded" / "the source does not say" into NB
  prose.** Sam, earlier: *"please control yourself about 'not on the record' … please never
  make assumptions you are out of your mind."* This is the fourth-wall rule (§2) in its most
  common disguise. If you catch yourself hedging, the fact does not belong in the block at all
  — it belongs in `research_notes`. **~8 blocks elsewhere in the file still carry this tic;
  they are reported but not yet rewritten.**
- **Arithmetic in an NB gets checked.** Two blocks shipped this session had to be rewritten
  within minutes because the maths was wrong ("outlived all seven" when two siblings survived
  her; "outlasted every one" when the youngest sister outlived him by three years). **If a
  block claims longest / last / first / oldest, verify it against every sibling's dates before
  writing it.** Sam will notice on the card.

---

## 9. OPEN / UNBUILT — all flagged in the relevant `research_notes`

Carried forward from this session. Each one is waiting on Sam, not on work.

| item | state |
|---|---|
| **Mary Newton HD0166 × Jonathan Hall** | printed genealogy says "No ch."; Sam's data hangs William Hall (b. 1791 Russell MA) and a ~35-record Minnesota Bates line off them. **Not built** pending his call. |
| **George Leister Ward HD9362** | b. 14 Jun 1850, two years *before* his father Henry Ward's 13 May 1852 marriage. Built with father only, no mother, deliberately NOT in the marriage's `children_ids`. **This is the one standing validator warning from this work** and it is intentional. Presumably an unrecorded first wife. |
| **Annie Selina Dakin** (1871–1963, m. 31 Oct 1898) | named in a paste, never attached to anyone. Fits John Warren Pierce Jr. (HD9387) on dates. **Not built.** |
| **Virginia Pierce HD9374 / Helen Elizabeth Pierce HD9375** | identical 1927–2017 dates on two separate FamilySearch IDs. Both entered as supplied; may be twins or one person recorded twice. |
| **Robert Ward Loomis HD9363 / Anna I03042** | no dates for either; Anna's maiden name unknown. Robert is placed as Joab & Harriet's son by inference from his `Ward` middle name — noted in his `research_notes`. |
| **Sarah Content Ward** | named in the memoir as "now 87, remembers Aunt Mitty". A Ward carrying Content Newton's name; reads as a third child of Parnell. **Not built** — the relationship is inference. |
| **Isaac Newton HD0170** | b. Dec 1770, wife Anna Southmayd b. Jan 1773, eldest child Dwight b. 1788. Seventeen and fifteen. Unresolved. |
| **Submit Newton Camp HD6418** | marriage date to Dea. Samuel C. Camp lost in a garbled paste. |
| **Harriet Newton Bates HD9345** | RESOLVED 1 Aug — Caroline Newton Elizabeth (1844) and Elizabeth Cook (1847). Left here as the worked example: her `children_ids` sat empty for a day because the two names were the exact bytes a repeated paste block had overwritten. |
| **Ozias Hall Newton HD3321** | birth held at 1 Apr 1775; his stone says aged 39 at death 10 Apr 1815, which wants a birth *after* 10 Apr 1775. Year is safe, day/month is the loose end. |
| **git history** | six image files were swept into history by an early `git add -A` and are now in the pushed remote. Harmless; stripping them needs a force-push. Sam knows. |

### Carried over verbatim from the 29 July §6 (still open)

**One open question from that session, never finished:** whether any hidden id survives *inside*
an emitted payload — in the `context` block, a registry roster, or a `marriages[].spouse_name`
string. The aggregates and page files are confirmed clean; that last scan is one command and was
interrupted.

**Unbuilt / unresolved as of 29 July, all flagged in the relevant `research_notes`:** Lathrop
Stiles Ellis died 1888 Manistee or 1900 Chicago; Story Wright's husband is Thomas P. or John P.
Wright; Mary Newton (HD0003) may be a ghost of H00048; Sandra Ingalls's three children; Sjohytta
in Maine; Vivian Bertram; the HD5603/HD5604 merge.
