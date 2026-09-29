# HANDOFF — Stream A content session, 27–29 September 2026

Read `docs/hooker_json_schema_v25.md` **§v25-0** first, then `docs/CONTENT_BUGS.md`. This file
only carries what those two don't: where the recent edits are, what is waiting on Sam, and
what changed in how we work. The previous record is `HANDOFF_content_092726.md`.

---

## 1. Where the recent edits are

All of it is pushed (through `653a38dd`).

| cluster | what happened |
|---|---|
| **Ingersoll / Yardley / Knickerbocker** | Ralph Ingersoll and Ralph McAllister Ingersoll II (the publisher, handled carefully, with the controversy in a single last block). Helen May Gregory Yardley and the Yardleys. Austin Jay Knickerbocker, Sarah and Jennie Knickerbocker, and Sandy Woods (his `chip_first_name` is Sandy). VID144 Ingersoll Cabinetmakers. |
| **Osborne / Blake** | Thomas Burr Osborne (notable), Arthur Dimon Osborne, Frances Louisa Blake Osborne, Arthur Sherwood Osborne. |
| **Trevor / Wilmerding / Fisher / von Stade** | Joel Ellis Fisher Jr., Eleanor Darlington Fisher, John B. Trevor Sr. and Jr. (Jr. is notable), Caroline Wilmerding Trevor, and Lucius Kellogg Wilmerding (who set the easter-egg pattern). Lt. Charles Steele von Stade (the timeline hookup and estimated years), Frederica von Stade (NOT notable), and Peter Elkus. |
| **Chaffee / Edwards / Foster** | John Chaffee (ART373, and LM211 is now the Hezekiah Chaffee House). Maurice Dwight Edwards. Rev. Robert Lansing Edwards (his parent link repaired). John Watson Foster's Hawaii block, and Grover Cleveland ↔ Queen Liliʻuokalani. |
| **Granger / Cowles / Minot / Rackemann** | Alfred Hoyt Granger (LM520–522). Thomas Hooker Cowles and his children. Both George Richards Minots (a vertical CC, four generations apart). William and Louisa Davis Minot. Dr. Francis Minot and Felix Rackemann. |
| **Lent / Hooker (San Francisco)** | Eugene Lent and George Heydenfeldt Lent (the Hooker & Lent partners), Berthe Welch Lent, and the Howards (Lent Duncan, Duncan Lent, Lyman). Michael Gay Hooker, Constance Colladay, and Tony Hooker (Anthony Shreve, HD3249). John Rodman Hooker ("Hooker & Fay through the crash"). The Robert Gay Hooker Jr. line down to his eleven living grandchildren. Thomas Page and Molly Page. |
| **Shreve** | Billy Vanderbilt's chip name, Elizabeth Shreve Hooker's death on 5 Apr 1943, and Rebecca Nichols Creamer Shreve as a mother-in-law easter egg. George Choate Shreve moved to Cypress Lawn (CEM267). |
| **Robertson** | William Abbott Robertson Jr. (7 blocks) and Roxana Dabney Robertson (5 blocks), plus name-only children William III and Gerry Working. |
| **Maria Jones Tallmadge Cushman** | Rebuilt in six slices, with a new CC to Tapping Reeve. |

Many people were un-notabled on Sam's word: Frederica von Stade, Jessie Hardie, and Antoinette Betts (her husband keeps it).

---

## 2. Waiting on Sam — do not act unasked

1. **The canonical.json size decision.** It is 68 MB, and GitHub warns above 50 MiB. Measured
   on 29 Sep: moving `research_notes` into a sidecar file plus writing one record per line
   gives about 48.5 MB. See the memory `canonical-size-options`. Classification defaults are a
   later, bigger job.
2. **Uncommitted frontend work.** `TimelineRail.svelte` has the nearest-year fallback so that
   living (pv) links in an easter egg's `lineAnchors` get bars. `SearchModal` has the .tiff
   `cldSize` change, plus CrossConnectionsBlade, FeaturedCard, RightColumn and
   `seating-anomalies.tsv`. Waiting for Sam's "commit".
3. **13 old `tasks_*.tsv` sheets in the repo root.** They are processed and harmless. Offered
   to move them into `tsv_entry/`.
4. **Gerry Robertson Working (HD15714).** Is her real name Geraldine, after her grandmother?
5. **Rebecca Nichols Creamer Shreve.** Her birth was changed from 12 May 1846 to c. 1829 Salem
   (the old date made her 12 at her 1858 wedding), and Creamer now comes before Shreve.
   Needs Sam's confirmation.
6. **George Choate Shreve's four blocks** are legacy walls of text, one cut off at "Geo. C.".
   Rebuild offered.
7. **Katherine Gilmore Gay Hooker (HD15704).** Sam typed "Gilmor"; I used "Gilmore".
8. **Older open questions:**
   - Duncan Lent Howard's line of work, for his blurb.
   - Did twin Barbara Cowles die young?
   - Build Chester D. Shepard, Frederick H. von Stade, Skiddy von Stade, or the
     Trevor/Salas/von Stade grandchildren?
   - Frances Blake Osborne's "Playwright" blurb.
   - Simplify the twelve ordinal in-law titles?
   - 207 older parent/child reciprocity mismatches.
   - Robert Gay Hooker was cremated, not interred, at Cypress Lawn.
   - Jessie Hardie's "English barrister" blurb.
   - Frederica von Stade's Wikipedia URL.

---

## 3. How the rules moved this session (all in memory too)

- **Paste vitals are instructions.** Every birth/death/place block in a paste gets applied,
  even with no verb (`apply-every-pasted-vital`).
- **No invented motives in headers.** "A year at Harvard was enough" was rejected as too
  cute. Hooks come from facts and computed numbers. Don't take Sam's corrections too
  literally either: "he owned the firm" meant rewrite plainly, not "opened his own brokerage".
- **Close-family delicacy on living people.** No godfather talk. Depression goes softened,
  in the last block, with no cause of death. Don't claim two cousins worked together unless
  they did ("also managed money at Ashfield").
- **Easter eggs must be hooked up.** The timeline has to route to the Hooker person
  (`lineAnchors`), following the Rockefeller / Lucius Wilmerding structure. A lone timeline
  is wrong.
- **In-law titles.** Prefer "Brother-in-law of a Ninth Generation Hooker" over "Husband of the
  Sister-in-law of…". Earlier spouses take "First Husband of the Sister-in-law of…"
  (Elkus, Onassis).
- **CC wording.** A vertical CC names the relation and opens `, his father-in-law,` followed
  by a verb and something specific (Granger built homes on Lake Shore Drive), never "the
  architect".
- **The silent-loss gate has no override.** For an authorized photo or NB removal, run
  `validate.py --since` on HEAD's copy to confirm only the authorized loss appears, then
  regenerate manually and commit by path.
- **Obituary children.** Build them as name-only stubs unprompted, even when Sam says "no
  added entries" about the ancestors in the same paste.
