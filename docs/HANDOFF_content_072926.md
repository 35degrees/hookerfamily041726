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

## 6. STATE AT HANDOFF (refreshed 3 August 2026)

```
19,885 people   thomas 12,160 / talcott 700 / 1,264 hidden
errors 984      warnings 2943        (standalone validate.py -- this is the standing §C debt)
git: 80 commits since ef8fb802, ALL LOCAL -- nothing pushed since 1 August
dev server: localhost:5173
```

**Offer Sam a push first thing.** Eighty commits of this work exist only on his laptop.

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

---

## 10. THE 3 AUGUST SESSION — Ingersoll / Goldmark / Gaylord

~117 people built, 16 deleted, across the Cleveland Ingersolls, the Rockford Ingersoll–Gaylord
milling family, and the Goldmarks of Washington State. Everything below cost a round trip or a
correction from Sam. **Read §10.1 before you touch anything.**

### 10.1 Who belongs in the tree — the law cuts both ways, and I got burned on both edges

Research showed that **Sarah Lucinda Ingersoll (HD1847) was Ephraim Briggs's *second* wife and
bore him no children.** The three Briggs daughters were her stepdaughters by his first wife
Elisabeth Doan. Sixteen people — the Briggs girls, the Newphers, Josiah McCracken and all seven
McCracken children — reached Thomas Hooker only through that link.

My first move was to reclassify them as non-descendants but keep them searchable. Sam:

> *"my implication was to delete Elisabeth Doan Briggs X03851 and all those kids. this isn't a
> random person yellow pages project."*

So I deleted them. Then, one message later, I withheld Jane Wanzer Gaylord's five children and
thirteen grandchildren on the grounds that they were living, unasked-for, and "yellow pages."
Sam, angrier:

> *"do you need to remember this is a Hooker line project? when i say yellow pages I'm talking
> about non-Hooker line people which you were fine leaving in and now you reject actual hooker
> people. build everyone I told you to build."*

**The rule, both halves:**

- **Blood tie in → BUILD, however thin the facts.** A living great-great-grandchild with no
  dates and no story still belongs. Do not withhold a Hooker descendant for being unremarkable,
  living, or unrequested-in-so-many-words.
- **No blood tie → DELETE, however rich the record.** Josiah McCracken had an Olympic silver,
  six NBs and five CCs and he went, because he married a stepdaughter.

**Deletion mechanics** (one revertable commit, and say so in the report): scrub every inbound
reference *first* — reciprocal CCs on survivors, `parents.father_id`/`mother_id`,
`marriages.spouse_id`, `children_ids`, and the non-`people` containers (cemetery
`hooker_connections`, institution rosters) — then drop the records. Removing four reciprocal CCs
from Morse, Jamison, Minot and Gardner was the part that would have rotted silently.
The in-law who married the *actual* descendant stays; only what hangs off the broken link goes.

### 10.2 A clobbered paste lies about parentage, not just about payloads

CLAUDE.md has the protocol for the repeating block that overwrites the next instruction. What it
does not say, and what cost a correction:

**The repeating block also drags a false attachment with it.** `"Children / March Ingersoll
Gaylord 1952–1974"` appeared five times across one message, and I built March as the son of
Robert March Gaylord Jr. because that is where its first appearance happened to sit. A newspaper
clipping two messages later named him as **Clayton's** son and gave a fourth sibling besides.

**When a block repeats, distrust everything it asserts — including whose child it says someone
is.** Either hold the attachment until a second source confirms it, or build it and say plainly
in the report and in `research_notes` that the parentage rests on a repeated block.

### 10.3 The screenshots outrank the prose around them

Every hard question this session was answered by an image, never by the text it was embedded in:

- `184661350` — Gail Gartz Gaylord, Clayton's first wife, her four children and her painting.
  The instruction that should have named her had been clobbered to nothing, twice.
- `79030113` — Cameron Sanders retired from the Army Reserve **a brigadier general**.
- `12119310` — Lydia Hardin's notice names four Ingersoll sons nobody had listed.
- `31888525` — Dr. Louise Ingersoll's thousand Czechs, and her own quote about the Bolsheviks.

**Read every referenced image before writing a line of the batch.** Sam names them inline
(`see 12345_abc.jpg`); they sit in the repo root and are gitignored.

### 10.4 Schema and render facts learned — not in `pipeline-gotchas.md`

- **`date_precision` has no month-only value.** "May 1985", "August 1839", "January 1944" must go
  in as `year_only` with the month in `research_notes`, or the validator warns. Losing the month
  from the card is the price; it is not worth a warning.
- **A person with children and no known spouse still needs a marriage row** — `spouse_id: null`
  with the children in `children_ids` (101 records already do this). Without it,
  `C7_parent_child_reciprocity` warns once per child. The card prints "spouse not rendered" and
  nothing else breaks.
- **Career rows sort by `(end_year desc, start_year desc)` and only the first three render.** A
  minor row that ends later will push the defining job off the card. Both Ingersoll judgeships
  fell off this way until a redundant "Attorney, Cleveland bar 1855–1899" row was dropped.
- **`role` and `organization` both print, comma-joined.** `role="Partner, Burke and Ingersoll"`
  plus `organization="Burke and Ingersoll"` renders the firm twice.
- **`is_notable` without a url is a hard ERROR.** Five people this session earned notable and
  were left off for want of a link — **one url each turns them on**: Judge Jonathan Edwards
  Ingersoll (HD1848), Winthrop Ingersoll (HD9800), Dr. Louise Mason Ingersoll (HD9805), Clayton
  Russell Gaylord (HD9811), Edson Ingersoll Gaylord (HD9812). Notable needs `notable.notable_url`
  **and** `notable.primary_url` **and** `primary_url_label`; `notable_blurb` shadows `bio_blurb`.
- **Landmarks render properly**, unlike the note in memory suggests: `LANDMARKS (1) — Ingersoll
  Centennial Park · Park · Rockford, IL [photo] [link]`. Use `primary_name`, `type`,
  `description`, `photo_url`, `primary_url` + `primary_url_label`, `person_ids`, and add
  `{"landmark_id": ..., "landmark_blurb": ...}` to each person. Give every person a *different*
  blurb — it is written from their side.

### 10.5 The validation loop — rebuild this first thing

A plain `validate.py` run always prints BLOCKED (standing §C debt) and `--since` needs a
pre-copy you will forget to take. Git is the cheaper before/after:

```bash
python3 /path/to/edit_script.py                                   # writes canonical.json
python3 /tmp/val_all.py canonical.json > /tmp/A.txt 2>&1
git stash -q; python3 /tmp/val_all.py canonical.json > /tmp/B.txt 2>&1; git stash pop -q
diff <(sort /tmp/B.txt) <(sort /tmp/A.txt)
```

`/tmp/val_all.py` is a copy of `validate.py` with the `warnings[:60]` / `errors[:200]` /
`items[:60]` truncations removed, so the diff sees every line. **It is not in the repo — recreate
it.** A clean batch diffs to nothing but the people-count line.

**Lint NBs in-script before `json.dump`, over only the blocks you authored.** Iterating every
block on a person means a pre-existing 4-sentence body aborts a batch that was otherwise fine
(this happened on Samuel Morse). Print a `<<< FIX` column rather than asserting, so one run
surfaces all the problems instead of one.

### 10.6 The CC method that produced the good ones

Do not browse for cross-connections. **Sweep the whole file's NB text + blurbs + tags by theme
keyword in one pass, then read the dozen hits.** Eight exact CCs fell out of a single sweep:

| | |
|---|---|
| Dr. Louise Mason Ingersoll ↔ **Dr. Mary Floyd Cushman** | two Hooker-line women physicians, one to Siberia and one to Angola |
| ↔ **Josephine Redding** | Croix-Rouge nurse, dead in the same year Louise was doctoring at Vladivostok |
| Jonathan Edwards Goldmark ↔ **Eli Whitney Debevoise** | defended Alger Hiss — the name Goldmark's accusers hung on his wife |
| ↔ **Thomas Edward Fairchild** | ran at McCarthy in 1952 and lost, as Goldmark lost in 1962 |
| Peter J. Goldmark ↔ **George Weyerhaeuser** | same Washington forests, opposite chairs |
| ↔ **Henry Chandler Cowles** | founded American plant ecology a lifetime before Goldmark's plant genetics |
| Harold "Pat" Ingersoll ↔ **Samuel F. B. Morse** | Trans-Mississippi golf association / Pebble Beach |
| Judge Alvan Fuller Ingersoll ↔ **Helen Gertrude Ingersoll** | first cousins; he played football for the East High she later taught at |

Sam's standing filter is *"only if valid not a reach."* I declined an Edwin Cowles CC for Judge
Jonathan Ingersoll on those grounds — both prominent Cleveland Republicans of the same decades,
same cemetery, but nothing documented between them. **Declining and saying why is a good answer.**

### 10.7 The Jonathan Edwards name thread in this family

Know this before writing an Ingersoll: they descend from Jonathan Edwards through Sarah Parsons
and they say so out loud for a century and a half. **Judge Jonathan Edwards Ingersoll** (HD1848);
his daughter **Sarah Edwards Ingersoll** (HD9804); his great-nephew **Jonathan Edwards Goldmark**
(HD9860), who went by John. Mary Elizabeth Ingersoll's 1918 obituary opens *"a direct descendant
of Jonathan Edwards."* Sam's instruction: **mention the name, never CC to Edwards himself.** The
Judge ↔ Goldmark CC carries the thread.

### 10.8 Source adjudication precedents set this session

- **FamilySearch beats FindAGrave on *places*** when FS shows more sources (Winthrop Ingersoll
  1917: Colorado Springs / Arvada over Rockford / Tulsa).
- **FindAGrave beats FamilySearch when it has an exact date against a bare year** (Ephraim
  Briggs, 20 May 1889 over 1888).
- **A newspaper's stated age is the least reliable field in it.** Helen Crebs "32" (she was 24),
  Clayton Ingersoll "22" (21), Kate Danforth "82" (80 or 81). **Never take an age over a birth
  year**, and never quietly reconcile them — flag and move on.
- **Arithmetic is for structure, not for facts.** I reasoned Charles Goldmark's death to
  "2 November 1943" from Brandeis's death, his son's Navy commission and a Tuesday-before-a-
  Friday-dateline, and left the field *empty* with the reasoning in `research_notes`. Sam then
  supplied 3 November 1942 — the chain was right and the year was wrong. **That empty field was
  the correct call.** Build the structure from arithmetic; never write a date from it.

### 10.9 Open at handoff — 3 August

| item | state |
|---|---|
| **Gail Gartz Gaylord (I03209) has no dates at all** | Sam's last message contained the fragment *"marriage year for Gail Gartz Gaylord I03209"* with the value clobbered away. She was 43 at death; Clayton became president in 1958; her son March died 1974 and survived her; Clayton remarried 20 Dec 1968 — which points at a 1968 death and a birth about 1925. **Left empty. One re-paste closes it.** |
| **Clayton Russell Gaylord HD9811** | his instruction line has now been clobbered to nothing **three times running** — first by a Goldmark block, then twice by Kate Danforth's obituary. Whatever Sam wants on him has never arrived. |
| **Julia Clark Ingersoll HD9802 / Grace Lyman Ingersoll HD9803** | the 1906 notice names three married daughters — Danforth, McLoud, Smith. Katherine was resolved as Danforth on 3 Aug. These two are the McLoud and the Smith and nothing says which. |
| **Alvan Fuller Ingersoll's five children** | the 1918 biography says five; FindAGrave names three (Mary Elvira, Charles Bishop, Carolyn Burton). Two unaccounted for. |
| **"Elizabeth Cornelia" HD9857** | named in Col. George Lyman Ingersoll's 2008 notice with **no surname**, grouped between the Ingersoll grandchildren and the Woodley boy. Built with no parent and no invented surname. |
| **Five unplaced Gaylord grandchildren** (HD9826, HD9828, HD9834–36) + Jessica Martin, Molly Watson, Elizabeth Swain | Jane Wanzer's obituary lists thirteen grandchildren as one block. Hallbergs, Gassens and Swains were placed on surname; the Gaylords cannot be split between William, Charles and John. Built, parents left null. |
| **Robert March Gaylord Sr. I03195 vs Winthrop Ingersoll** | the 1998 obituary says Gaylord succeeded Winthrop as head of the works in **1917**; Winthrop's own sketch has him president until his death in **1928**. Reconcilable if Winthrop moved up to a chairmanship — nothing says so. |
| **Charles J. Goldmark's second wife Alice** | named in his 1942 obituary as surviving him. Not built. |
| **Shirley Elizabeth Ingersoll I03202** | FindAGrave carries her as "Ingersoll Ingersoll", which would make it both maiden and married name. Almost certainly the site doubling it. |
| **Albert Converse Ingersoll Jr. HD9848** | born at Columbus in **Delaware** County per FindAGrave; his sister Helen born at Columbus in **Franklin** County. The city is in Franklin. One field is wrong; neither was touched. |
| **Peter J. Goldmark's five children and two wives** | Georgia (deceased) and Wendy; five children, none named in the source. Not built. |
| **Clayton Russell Gaylord's own wife-and-children set** | now complete, but note the shape: two wives (Gail Gartz, Joan Ryan m. 20 Dec 1968), four children all by Gail, and Holly carries **two** married names (Windon in 1997, Starck in 1998) from two obituaries a year apart. |
| **Vocabulary still unproposed** | no canonical tag exists for a world's-fair or exposition medal. Allen Butler Talcott's 1904 silver is an exposition award, not Olympic (art competitions began 1912) — `olympian` would be false. Sam was offered `world_fair_medal` / `exposition_medalist` and has not ruled. |
