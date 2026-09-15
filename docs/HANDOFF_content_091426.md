# Content session record — 14 September 2026

Supersedes `HANDOFF_content_081126.md` as the newest content handoff. Stream A unless noted.

---

## THE ONE THING TO READ BEFORE TOUCHING THE BARNES / HENSON RECORDS

**Jim Henson is NOT a Thomas Hooker descendant.** 122 records carry
`research_tags: ["henson_line", "attachment_unproven"]` and all but one carry
`classification.hidden: true`. They are parked deliberately, not abandoned.

**Why.** FamilySearch had Elizabeth Susanna Whittelsey (GQ8B-F2F), daughter of
Rev. Chauncey Whittelsey and Martha Bryan Newton, marrying Reuben Barnes Sr. at
Middlesex on 15 Aug 1790. That descent runs to Jim Henson at generation 12. It is wrong:

- The marriage record is indexed **"Reuben Barns and Elisabeth WITHERLEY"** — a different
  surname — Connecticut Church Records, Middlesex, CT State Library.
- **Her gravestone gives her maiden name and calls her "Youngest daughter of the Rev.
  Chauncey."** Grove Street Cemetery, New Haven.
- *Whittlesey Genealogy* (1898), entry **159**: "Elizabeth, b. Sept. 18, 1773; **d. unmarried**."
  WikiTree records the same, citing two sources.
- Barbour Collection, Middletown: no Whittlesey–Barnes marriage. The only Middletown
  Elizabeth Whittlesey (dau. of Chauncey Jr. and Lucy Wetmore) was born **1780**.
- The FamilySearch change log shows the cause exactly: on **16 Feb 2025** a separate profile
  (GKGJ-DYF — the pastor's daughter, d. 1866, Grove Street) was **merged** into Doug Whitlock's
  2020 profile for Reuben's wife (**d. 12 June 1850, Middlesex**). The merge reason reads
  "all vital information and relationships match" — the births are a month apart and the
  deaths sixteen years apart.
- No celebrity-genealogy site has ever published this descent. It is seven months old.

**Sam resolved it on FamilySearch, 14 Sep 2026:** detached the parents from GQ8B-F2F,
recreated the pastor's daughter as **PFY9-L3D**, and marked the pair Not a Match.

**Do not rebuild this line off FamilySearch.** If a real Hooker tie to the Barnes family
ever surfaces, the records are complete and one query away:
`[p for p in data['people'] if 'henson_line' in (p.get('research_tags') or [])]`

Note also: **Elizabeth Susanna's own birth date (18 Sep 1773) was borrowed from the
Whittlesey genealogy** when Whitlock created the profile, so Reuben's wife has no
independently sourced birth date at all.

---

## Built and rebuilt today

- **Whittelsey / Chauncy cluster** rebuilt from the Whittlesey genealogy and two
  document images Sam supplied: Rev. Samuel Whittelsey Sr. (X03182) with his 1707 Yale
  master's diploma and the 1729 Wallingford scandal-council letter; Sarah Chauncy
  Whittelsey (X03183); Rev. Chauncey Whittelsey (I00074); Rev. Charles Chauncy (X01903)
  with his English years, the communion-rail imprisonment and the Ware wall memorial.
- **Rev. Joseph Noyes (X04112)** built from nothing — Center Church 1716–1761, buried in
  the crypt with his father-in-law James Pierpont.
- **Rev. James Pierpont (X00126)** rebuilt: the 1689 purchase of Davenport's books for rye
  and corn, John Dixwell's son fetching Dummer and Elihu Yale's money, the enslaved men
  Tom and Pung, and Leonard Hoar's succession. Blurb now "Chief founder of Yale College."
- **Rev. David Brainerd (X02351)** rebuilt; **Jonathan Edwards (X00128)** de-duplicated
  (two NB pairs were telling the same story twice).
- **Giles Pierpont (H00372)** rebuilt from EH 372 and Thorpe; **Edwards Pierrepont
  corrected from grandnephew to grandson** (`lineal_gap` ±2).
- **Francis Stillwell Dixon (X03210)** made notable; "Mrs Edward W. Hooker", who gave his
  *Leaning Tree* to the Wadsworth in 1917, identified as **Mary Mather Turner Hooker (X03201)**,
  his wife's mother.

## Render / schema facts confirmed the hard way

- **Art subtitles do not come from the artwork's `date`.** `resolveArtworks` renders
  `blurb ?? artTypeLabel(type)`, and `blurb` lives on the **person-side** `artworks[]` ref.
  A year can only reach the card by being written into that blurb.
- `bio.suffix` **does** feed the slug; `bio.title` does not. HD6296 was slugged
  `maj-hooker-1908` because `first_name` was empty and the generator took "Maj." as a name.
- `classification.hidden` is the supported way to keep a record without emitting it —
  already in use on 1,266 people before today. Hidden people also drop out of other
  people's cross-connections at render.

## Open

- **Albert Gordon Henson and Effie had nine children** per Brian Jay Jones; only eight are
  built. One is missing.
- **Rev. Chauncey's three children by Elizabeth Whiting** (Chauncey Jr. m. Lucy Wetmore,
  Samuel Joseph, Elisha) are unbuilt — non-Hooker, so they fail the blood-tie rule.
- **Every timeline anchor's `t` coordinate is stale** against the emitted table
  (Thomas Hooker: authored 4400, table 5276). The deck flies from seats that have moved.
  Wants a render-time lookup, not 28 hand-edits. Stream B.
