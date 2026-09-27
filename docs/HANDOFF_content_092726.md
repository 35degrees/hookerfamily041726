# HANDOFF — Stream A content session, 26–27 September 2026

Read `docs/hooker_json_schema_v25.md` **§v25-0** first, then `docs/CONTENT_BUGS.md`. This file
only carries what those two don't: where the recent edits are, what is waiting on Sam, and
what changed in how we work.

---

## 1. Where the recent edits are

All of it is pushed (through `c10a188f`).

| cluster | what happened |
|---|---|
| **Pierpont → Isham → Prentice → Rockefeller** | Semantha Swift Isham, Edward Swift Isham and his children, and Frances Isham Shelton. The whole Prentice line: Sartell and Mary Adeline, Col. Ezra Parmalee and Alta Rockefeller (Alta is notable and wired to John D. Sr.). Below Alta: Abra Prentice Wilkin (notable), Ashley Prentice Norton, and Spelman's branch (La Coquille Club, LM512). The Porter branch from Mary Isham Prentice (b. 1880), which put Henry Homes Porter Jr. (I04959) in the line. Rev. Sartell Prentice Jr. and Perry Prentice. |
| **Packard** | Rebuilt: Frederic Adolphus, Elizabeth Dwight Hooker Packard, Dr. John Hooker Packard, Lewis Richard (notable), and Harriet Storrs. Also Elizabeth Dwight Packard (Lucy Sturdevant merged in). Judge John Hooker (H00527) rebuilt. |
| **Kenneth Ward Hooker family** | Kenneth Jr., Pamela Hart, John Endicott Hart, Hooker sisters; Maitland and the Hardymans; Isham Jr. line (Colonna, Schmid). |
| **Bryan Edward Hooker → Woodward** | Name fields filled for 26 records; Susie Twing; Hooker and Dave Judson; Edward Gordon Hooker and Marion Butler. |
| **Singles** | Jessie Willcox Smith (7 blocks, ART359 *Trio at Cogslea*); Old Stevens Mansion LM513; Frans ten Bos (notable). |

**Deleted on Sam's instruction:** Lucy Huston Sturdevant (X02838, merged into H04333), Rev. Ornan
Eastman (X02862, merged into his son I01132), Deborah Lothrop Putnam (I01915).

---

## 2. Waiting on Sam — do not act unasked

1. **Mary Isham Prentice, HD15231 ("b. 1865, Davenport") — probable phantom.** The Swift
   genealogy lists exactly five Prentice children. Its "Mary Isham, b. 1880" is HD15235.
   FamilySearch has no sources for the 1865 record. Delete it?
2. **Four tags off the canonical list:** `never_married` (on H04339 and H04333), `lgbtq`
   (on H04333), and `finance` (on H04334 and H04338). Add them to `canonical_tags.txt`, or strip them?
3. **Rev. Frederic Adolphus Packard's "Rev."** No source says he was ordained; he was a lawyer
   and editor. Drop the title?
4. **Paul Revere (X03378), block 1, last sentence is garbled:** "his son Joseph ran it into a
   great-granddaughter's Boston marriage." Rewrite.
5. **Rev. Richard Salter Storrs** as a notable easter egg. He was pastor of the Church of the
   Pilgrims 1846–1900 and ABCFM president 1887–97. He'd get vertical CCs to Harriet Storrs
   Packard and Mary Storrs Packard, and could link to the Beechers. Offered; not taken.
6. **Research notes still to mine:** about 21 records around the Packards and Judge Hooker's
   children (H01399–H01408, H04333–H04338, HD6377–HD6381, I01091, and others).
7. **Uncommitted frontend fix:** `src/lib/server/auth.ts` adds `pool.on('error')`, so an idle
   Postgres drop no longer crashes the dev server. Waiting for Sam's "commit".

**Date conflicts left in place, with the stored value first:**
- Pierpont Isham's death: 8 May vs 8 Mar 1872.
- Frances Isham Shelton's marriage: 1909 vs 1907.
- Sartell Prentice's death: 2 vs 1 Sep 1905.
- Madeline Prentice Gilbert's birth: 1907 vs 1908.
- John Hooker Packard's death: 20 vs 21 May 1907.
- Peter Hardyman's birth: blank, because the Swift book's date clashes with his brother's.

---

## 3. How the rules moved this session (all in memory too)

- **CCs are loosened.** Shared honours, units, institutions, professions and eras now qualify;
  Sam wants CCs on everyone. Only a shared surname or an invented tie fails. A CC to an older
  generation of relatives by marriage (e.g. a great-aunt's husband) gets a `lineal_gap` so it
  flies vertically.
- **Adoptees are fully in the line:** HD prefix, `is_thomas_descendant`, same generation as their
  siblings, plus the `adopted` tag. Adoption is mentioned only on the adoptee's own card.
- **NB room is three sentences, not 240 characters.** When Sam says there's room, use it.
- **`batch.py --commit` runs `git add -A`.** It swept a frontend change into a data commit
  once. Commit `canonical.json` by path when `src/` has edits.
- **An old trim pass cut bodies at initials** ("F. D."). When rebuilding, look for bodies ending
  mid-sentence and recover the text from research_notes.
- **Wedding and society columns are for facts, not lace.** Keep dates, places and the officiant;
  leave out the gowns. Sam also prefers positive framing: put a setback in the body of the last
  block, not up front.
