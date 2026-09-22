# HANDOFF — Stream A content session, 21 September 2026

Read `docs/hooker_json_schema_v25.md` **§v25-0** first, then `docs/CONTENT_BUGS.md`.
Those two carry the doctrine and the debt. This file carries only what is in neither: which
branches were just worked, what was offered and not taken, and what to watch.

---

## 1. What was worked, so you know where the recent edits are

Roughly 120 people created and several hundred touched, in five clusters:

| cluster | what happened |
|---|---|
| **Dorchester → Everett → Ober** (Jefferson County NY → Saranac Lake) | Built out five generations from Alexander Dorchester's Revolutionary service to a 1905 wireless cabin. Six blank-named `X`-records got real identities. |
| **Enders / Talcott / Kornack** (Hartford) | Ostrom Enders, March Enders Kornack, Anthony Talcott Enders, Elizabeth Enders the painter, Wallace Kornack. |
| **Williams / Boyer** (Richmond VA + NYC) | John Skelton Williams rebuilt; the Boyer/Flagg cluster audited and its 15 over-cap bodies trimmed. |
| **Van den Heuvel → Ingersoll** | The Baron wired to his own daughter; Frederica van Baerle built; Margaret's mother corrected. |
| **Goodyear / Wigglesworth / Johnston / Larom** | Three Saranac Lake lines cross-connected; Col. Henry Wyatt Johnston and Tudor Johnston built from nothing. |

**The Saranac Lake discovery is the one worth remembering.** Three unrelated branches are in
that town for one reason: the **Trudeau sanatorium**. Nellie Porter Everett came for the cure in
1905 and died of it in 1909; Henry Larom cured there and wrote it; Mary Larom taught the curing
patients metalwork; Francis Trudeau's grandfather built the place. All six ends are
cross-connected. If more Saranac Lake material arrives, it probably belongs to one of these.

---

## 2. OFFERED AND NOT TAKEN — Sam's call, do not build unasked

These were surfaced, Sam did not say yes, and they will otherwise be lost. Each is ready.

**People, with material in hand:**
- **Dr. Francis Berger Trudeau Sr. (1887–1956)** — exists only as `father_name` on I00633. The
  material is excellent: the 1914 balsam-lined wedding at St John's in the Wilderness, the 1947
  **King George medal** for treating British forces, the sanatorium's closing in 1954, and his
  death in a boat on Upper St Regis Lake. He is an in-law's parent, so terminal by rule.
- **Dr. John F. Enders**, Nobel laureate 1954 for the polio-vaccine work — a sentence on
  Ostrom's card, not a record. Ostrom has **zero** cross-connections; a brother link would be
  his first.
- **Thomas O. Enders the elder**, founder and second president of Aetna Life.
- **Walter Ernest Lyman (1861–1950)** and **Anna Mark Scrimger Lyman** — no blocks at all, and
  Walter owns **Northglint** at Cap à l'Orignal, the house three generations gathered at.
- **Annie Louise Guier** (c.1903–c.1982), Louis Reed Huppman Sr.'s first wife.
- **Mary Lindsay Huppman Nesbitt**, Beatrice's stepdaughter.
- **Will DePass**, Olivia Terrell Huppman's husband — name only, no dates.
- **Ann Terrell Wolfe and Richard Peel Wolfe** — Reed Huppman's parents-in-law. Ann has a real
  card in her (Newcomb French major, fourth-generation Tulane, the Sorbonne, the New Orleans
  Philharmonic's **Kinderkonzerts**). In-law's parents, so terminal.
- **Cora**, the Hooker family cook from the age of sixteen who was nanny to Donald and Russell,
  and **Bett Tottle** of the Prohibition gin — both vivid, neither family. Would sit as blocks
  on Edith or Donald Sr.
- **Hooker Grove Dorchester's** line is built; **Tim Kernan's wife Susan** is not.

**Changes offered, not authorised:**
- **Elizabeth Enders is not flagged notable** and plainly qualifies — Whitney, Brooklyn, MFA
  Boston, Detroit, Wadsworth Atheneum, a 2009 Lyman Allyn retrospective. Needs a `primary_url`.
- **ART records for Elizabeth Enders**: *Black Eyed Susan* (1958), *Tea* (1974), *Line* (1974),
  *Atlantic* (1992), *Silence/Saffron* (2002), *Along the Nile* (2019).
- **Olivia Terrell Huppman → DePass** as `last_name` so her chip reads right (moves her slug).
- **Rosina Huppman → "Posie"** and **Reed Huppman's** chip name — Reed's was set and reverted
  once already; do not set a chip name unless Sam says so in the same breath.
- **Consolidating Colonel Francis Marion Crafts' four blocks** — NB1 and NB2 both run the
  "fifty battles, never scratched, bullets through his clothing" line, and NB1 and NB3 both
  describe the Gettysburg skirmish line. Three blocks' material across four.
- **The Willamette National Cemetery coordinates were applied but its roster is empty** — if
  someone is buried there, they still need `burial.cemetery_id: "CEM483"`.
- **Whether to extend the Cowles brother cross-connections** across the whole set — James
  (`X00260`) and Elijah Jr. (`X02769`) are in the tree; Amos is not.

**Outstanding photo URLs Sam intended to send and did not:** Thomas Creighton Hooker, Anne
Mitchell Rock Hooker, Michael Creighton Hooker, Anne Katherine Hooker, Cassidy Underwood
Houghton Hooker, Christian Williams Hoyt, John Steven Hoyt, Margaret Houghton Hooker Moser,
Brendan and Allison O'Connell.

---

## 3. Two techniques worth keeping

**Cloudinary background removal, on Sam's own assets.** Insert
`e_background_removal/f_png/` into the transformation segment of an existing Cloudinary URL and
the white background comes out cleanly with the alpha preserved — no download, no re-upload.
Used on Garry Trudeau's portrait; original kept in `alternate_photo_url`.
**Do not use `e_make_transparent`** — it strips near-white pixels *everywhere* and put holes
through his forehead, glasses and shirt buttons.

**Reading the transcript to recover a missed paste.** Sam's pastes are long and a fact can be
read straight past. The session log is at
`~/.claude/projects/-Users-sth22-Genealogy-project-041726/<session>.jsonl` and is greppable —
one pass over the user messages recovered Rosina Huppman's whole family after I had asked Sam
for data he had already sent. Search it before asking twice.

---

## 4. How Sam works, and what he calls out

He is fast, terse and often multi-part, and he switches streams without announcing it. Parse
intent; don't demand phrasing. What he pushed back on this session, all of it fair:

- **Throughput.** *"10 minutes of work for like 3 nbs. math doesn't work."* When a document
  arrives, mine it across **everyone** it touches in one pass, not one card at a time.
- **Riddle headers.** *"the woman who measured the stars is the worst NB ever."* Headers name
  things.
- **Career-only cards.** *"its missing engaging touches, anything about family? its pure
  career."* Obituaries are career documents; the family material is in them and has to be dug
  for.
- **Giving away an ending.** A quotation must not be pre-empted by stating the outcome first,
  and it must actually be in quotation marks.
- **Reaching for cross-connections.** Two were built and removed for having no relationship
  behind them. **Subtract the dates before building.**
- **Building beyond the submission.** Twelve in-law ancestors and collaterals built and
  deleted in one exchange. *"that is so invalid and rude."*
- **Asserting relationships the source doesn't support.** Murphy Renchor Jones and Mollie
  Spencer Davis were given a marriage, then a partnership, before the right answer — **two
  independent spouseless rows** — which is the pattern I had already used that same day for
  Garry Trudeau. When a structure problem recurs, check what you did last time.

He says "ok" or "no blurbs?" rather than praise; take the absence of complaint as approval and
keep moving.

---

## 5. State at handoff

- **26,053 people.** Standing debt **819 errors / 4,407 warnings** — unchanged across the
  session; nothing new was introduced.
- Integrity sweep clean: **0 bad genders, 0 non-boolean classification flags, 0 non-integer
  generations, 0 dangling IDs.** Keep it there — the sweep is in §v25-0.7.
- `canonical.json` ~59 MB; GitHub warns on every push. Expected.
- Everything committed. **Check `git log origin/main..HEAD` and push if it is not empty.**
