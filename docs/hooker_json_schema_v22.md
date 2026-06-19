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
