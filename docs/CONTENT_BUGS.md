# CONTENT BUGS — the standing data debt

**What this is.** A register of the *classes* of defect currently sitting in `canonical.json`,
each with a live detector, a blast radius and a fix. This is the backlog to work through when
there is time, not the day's work. Nothing here blocks a batch: `validate.py --since` reports
only what THIS batch introduced, which is why a plain `validate.py` run prints BLOCKED every
time.

**Counts were measured 21 September 2026 against 26,053 people / 18,750 narrative blocks.**
They go stale. Every entry carries the one-liner that recomputes it — **run the detector, never
quote the number.**

**Standing validate totals at time of writing: 819 errors / 4,407 warnings.**

---

## How to use this file

1. Pick a class. Run its detector. Confirm the count.
2. **Read §v25-0.6 of the schema first** — most of these have a known, non-obvious fix, and
   three of them (0.6.1, 0.6.2, 0.6.3) are render-contract traps rather than bad data.
3. Fix in scripted batches with asserts BEFORE `json.dump`, then `validate.py --since`,
   regenerate, and spot-check with `card.py`.
4. **These are bulk sweeps, so they are exactly the kind of change that needs Sam's say-so
   before starting.** Several touch thousands of records or move live URLs.

---

## TIER 1 — invisible data: the record is right, the card shows nothing

These are the highest-value fixes because the research is already done. The data is in
canonical and the reader cannot see it.

### 1.1 Parent link not mirrored in a marriage row — 176 people

A child carries `parents.father_id` / `mother_id`, but neither parent has a marriage row
listing them in `children_ids`. `childrenOf()` (`regenerate-data.js:775`) reads **only**
marriage rows, so the child renders **no chip on the parent's card** and the graph will not
traverse down to them.

```python
import json; d=json.load(open('canonical.json',encoding='utf-8')); P={x['id']:x for x in d['people']}
n=0
for x in d['people']:
    pa=x.get('parents') or {}
    for k in ('father_id','mother_id'):
        p=pa.get(k)
        if p in P and not any(x['id'] in (m.get('children_ids') or []) for m in P[p].get('marriages',[])):
            n+=1; break
print(n)
```

**Fix, in order of preference:**
1. If both parents exist and were married, add the child to their **existing** marriage row.
2. If the other parent is deliberately unbuilt, add a **spouseless row** to the known parent:
   `{marriage_number, children_ids:[...]}` with **no `spouse_id`**. Ten-plus people already use
   this; `FeaturedCard.svelte:545` skips the absent spouse chip and still renders the children.
3. If the parents were never married and no union may be asserted, give **each parent their own
   independent spouseless row**, nothing joining them.
4. For a real unmarried union, use `relationship_type:"partner"` + `is_marriage:false`
   (six existing uses, honoured at `regenerate-data.js:793`). **Do not use `partner` for a
   relationship that was not a partnership.**

Three of these surfaced by accident in one session — Garry Trudeau, Baron Van den Heuvel,
Murphy Renchor Jones. They are invisible until someone looks at a card, which is why a sweep is
worth more than waiting.

### 1.2 Death recorded with no year, and no `is_living` override — 216 people

`presumedLiving()` (`regenerate-data.js:163`) treats a missing death year as **living**: dates
suppressed, birth year stripped from the slug. FamilySearch's bare "Deceased" is the usual
source. The data is present and invisible.

```python
print(sum(1 for x in d['people']
          if (x.get('death') or {}) and not (x['death'] or {}).get('year') and x.get('is_living') is None))
```

**Fix:** set `is_living: false` — the explicit override the function reads first. Where the
person may genuinely be living, leave it: the suppression is then correct and deliberate.
**Note this changes slugs** (the birth year returns), so add the old slug to `former_ids`.

### 1.3 Career rows with no `start_year` — 2,266 rows on 1,358 people

Only **three** career rows render, sorted latest-first by `start_year`. A row without one never
renders at all.

```python
print(sum(1 for x in d['people'] for c in (x.get('career') or []) if not c.get('start_year')))
```

**Fix:** date it from the source where the source supports a date; otherwise move the fact into
a narrative block and accept the row as storage only. **Do not invent a year to make a row
appear** — that is fabrication for cosmetics.

### 1.4 `is_notable: true` with no `primary_url` — 139 people

A hard `validate.py` error, and the card's notable link is dead. Includes **Ostrom Enders**.

```python
print([x['id'] for x in d['people'] if (x.get('notable') or {}).get('is_notable')
       and not (x['notable'].get('primary_url') or x['notable'].get('notable_url'))])
```

**Fix:** supply a URL and write it to **both** `primary_url` and `notable_url` — the validator
reads the first, the card reads the second. Where no durable URL exists, the honest options are
to leave the error standing or to drop `is_notable`; a link shortener is not a record.

---

## TIER 2 — wrong data: the card shows something false

### 2.1 Parent recorded with the wrong sex — 234 people

A `father_id` pointing at a woman or a `mother_id` pointing at a man. The cause is usually a
wrong `gender` on the *parent*, not a wrong link — e.g. Keziah Stiles Munson recorded `male`,
Ashbel Stiles recorded `female`, Huldah Porter Lincoln recorded `male`.

```python
def g(x): return (x.get('bio') or {}).get('gender') or x.get('gender')
n=0
for x in d['people']:
    pa=x.get('parents') or {}
    if pa.get('father_id') in P and g(P[pa['father_id']])=='female': n+=1
    elif pa.get('mother_id') in P and g(P[pa['mother_id']])=='male': n+=1
print(n)
```

**Fix:** correct the parent's `gender`, not the link — and check the name and spouse first,
because a handful may be genuine link errors instead. This also matters structurally:
builder helpers that pick the father by testing `gender == 'male'` will write **the wrong
ID into both parent slots** when the flag is wrong (see schema §v25-0.6.5).

### 2.2 `bio.gender` contradicts top-level `gender` — 87 people

Two fields, two answers. Renderers read `bio.gender ?? gender`, so the top-level value can be
wrong and invisible until something else reads it.

```python
print(sum(1 for x in d['people'] if (x.get('bio') or {}).get('gender') and x.get('gender')
          and x['bio']['gender']!=x['gender']))
```

**Fix:** decide per person from the name and relationships, then write both fields the same.

### 2.3 Impossible parent edges — 54

A child born before a parent, or within thirteen years of them, or more than a year after the
father's death. Worst known: **Ruth Wright b. 1756 recorded as mother of ten Talcotts born
1731–1755**; **Joel Blakeslee b. 1739 with parents born 1780 and 1782**.

```python
def yr(x,f): return ((x.get(f) or {}) or {}).get('year')
n=0
for x in d['people']:
    b=yr(x,'birth'); pa=x.get('parents') or {}
    for k in ('father_id','mother_id'):
        p=pa.get(k)
        if p in P and b:
            pb,pd=yr(P[p],'birth'),yr(P[p],'death')
            if (pb and b-pb<13) or (pd and b-pd>1): n+=1; break
print(n)
```

**Fix:** each one is a research question, not a script — usually a generation skipped, two
same-named people conflated, or a child hung on a grandparent. Expect to find genuine
duplicates while working through these.

### 2.4 Children list differs between the two spouses — 10 pairs

The same marriage carries different `children_ids` on his row and hers, so a child appears on
one parent's card and not the other's.

```python
cm=set()
for x in d['people']:
    for m in x.get('marriages',[]):
        sp=m.get('spouse_id')
        if sp in P:
            o=[r for r in P[sp]['marriages'] if r.get('spouse_id')==x['id']]
            if o and set(o[0].get('children_ids') or [])!=set(m.get('children_ids') or []):
                cm.add(tuple(sorted((x['id'],sp))))
print(len(cm), sorted(cm))
```

**Fix:** union the two lists, then confirm each child's `parents` names this couple.

### 2.5 Non-reciprocal marriage rows — 3

A has B as spouse; B does not have A. `X01411`/`HD0480`, `X01912`/`HD0699`, `X01913`/`HD0699`.
Note the last two share a spouse — likely one person recorded twice.

---

## TIER 3 — editorial debt

### 3.1 Narrative blocks over cap — 7,701 bodies, 785 headers

Out of 18,750 blocks on 4,238 people. **Median body is 229 characters against a 240 cap**, so
the corpus sits right on the line and the tail is long: the worst bodies run 700–974
characters. Headers over 50 characters **wrap on the card**; 35 exceed 8 words.

```python
b=sum(1 for x in d['people'] for n in x.get('narrative_blocks',[]) if len(n['body'])>240)
h=sum(1 for x in d['people'] for n in x.get('narrative_blocks',[]) if len(n['header'])>50)
print(b,h)
```

**This is not a scriptable fix** — every one is a rewrite. Practical approach:

- **Fix opportunistically.** Whenever you touch a card for any reason, measure its bodies first
  and trim what is over. This is already the rule (schema §v25-0.3.4); the backlog exists
  because it was not always followed.
- **Prioritise by visibility**: the worst offenders are the *richest* cards, because whoever
  wrote them kept going. Sort by longest body and work down — a handful of rewrites removes the
  most egregious.
- Every rewrite must **assert its threads survive** by string probe before writing.

Worst single bodies at time of writing: `HD4695` (974), `H04268` (909), `I00980` (897),
`HD4682` (778), `I00979` (766), `H00487` (756).

### 3.2 Multi-token `first_name` — 776 people

A middle name hidden inside `first_name` ("Wilfred Henry", "Hattie E."). This corrupts the
generated slug, because slugs are built from first name + surname + birth year.

```python
print(len([x['id'] for x in d['people'] if len(((x.get('bio') or {}).get('first_name') or '').split())>1]))
```

**Fix:** split into `first_name` / `middle_name`. **This moves slugs**, so every one needs its
old slug in `former_ids`. Worth doing as one deliberate sweep before any public deploy, not
piecemeal.

---

## TIER 4 — registry hygiene

### 4.1 Cemeteries duplicated on name + city — 62 pairs

Oakwood/Troy, Mount Pleasant/Newark, Ogdensburg, Oakwood/Raleigh, Riverside/Asheville,
Evergreen/New Haven and 56 more. One was created in this session before the duplicate was
noticed (a second Pine Ridge, Saranac Lake, since merged into `CEM384`).

```python
import collections
c=collections.Counter((x.get('name'),x.get('city')) for x in d['cemeteries'])
print([k for k,v in c.items() if v>1])
```

**Fix:** merge into the record with the better data (Find a Grave URL, GPS, larger roster):
union `hooker_connections`, repoint every person's `burial.cemetery_id`, then delete the shell
and assert the old ID appears nowhere. **Always search name + city before creating a cemetery.**

### 4.2 Cemetery records with an empty roster — 272

No `hooker_connections` at all, so they exist and connect to nobody. Some are shells left by a
merge; some are real cemeteries whose burials were never backlinked.

**Fix:** for each, check whether any person's `burial.cemetery_id` points at it — if people
point at it, the roster is simply unwritten and should be filled from them; if nobody does, it
is a candidate for deletion (Sam-authorised, named individually).

### 4.3 Marriages using the dead `marriage_year` key — 158

`marriage_year` is not read by anything. The live key is `date_year`.

**Fix:** copy `marriage_year` → `date_year` where `date_year` is absent, then leave the dead key
in place (removing it is a deletion). Same pattern for `marriage_month` / `marriage_day` /
`marriage_place`.

### 4.4 Malformed I-prefix IDs — 12

`I1666` … `I1677`. The corpus format is `I` + five digits. These are four.

**Fix:** rename to `I0####`, put the old ID in `former_ids`, and repoint **every** reference —
marriages, children, parents, cross-connections, all registry rosters, `wars[].battles[]`,
`soldiers_index`, and ID mentions inside `research_notes` prose — then assert zero dangling.
`I1668` is Dr. Adelbert "Del" Ames III and is cross-connected, so references do exist.

---

## TIER 5 — open research questions

Not bugs — unresolved conflicts where two sources disagree and nobody has adjudicated. Recorded
so they are not silently "fixed" by whichever source a future session happens to read first.

| person | conflict |
|---|---|
| Lydia Dorchester (b. 1828) | FamilySearch lists her among Maria Van Schaick's children, but she is absent from Maria's May 1835 guardianship petition, where she would have been seven. |
| Maria Van Schaick | Born at **Albany** (family history) vs **Cape Vincent** (Find a Grave). Her father is named **Michael** in one place and **Nicholas** in another. |
| Mercy Thompson | Died **1 March 1825** (stone) vs **11 May 1825** (FamilySearch). Her origins are called unknown in the family history, while the Hounsfield deeds make John Thompson her father. |
| Sarah / Jane Wigglesworth (twins, 1923) | The printed genealogy has **Sarah** at Vassar marrying John Alfred Williams in 1945; the tree has **Jane** married to a John *Albert* Williams, and Sarah marrying Kernan in 1949. The 1951 birth notice proves Sarah married Kernan. One source has the twins swapped, and **I04723 is currently recorded as married to both twins**. |
| Kenneth Houghton Ober | Born **22 December 1972** (Houghton Surname Project) vs **22 February 1972** (his own artist's biography). |
| Beatrice Hooker × Louis Huppman Sr. | Married **30 September 1946** (Houghton project, exact) vs **1948** (Baltimore Sun obituary). |
| John Skelton Williams III | Recorded born **3 June 1927**, six years before his parents' stated marriage of 5 April 1933. |
| Charles Henry / Harrison C. Dorchester | Both recorded born 1878 with different death years — twins, or one man duplicated. |
| Kate S. Dorchester | **1845** (Find a Grave) vs **26 April 1847, Watertown** (FamilySearch, exact — currently used). |
| Alfred B. Williams | Named as a brother in the UVA finding aid but absent from the Beverley genealogy's nine children, which instead lists Cyane Dandridge. |
| Henry Wyatt Johnston | Research notes say "Lt Col Canadian Engineers"; his Montreal death notice gives the **17th Duke of York Royal Canadian Hussars**, with command dates and an honorary colonelcy. The notice is used; the note is stale. |
| Frances A. Kimberly | Died **8 February 1883** (Goodyear genealogy) vs **9 February 1883** (tree). Note that three deaths in that family carry 9 February — worth checking for a data-entry artifact. |

**Also unresolved:** duplicate-person pairs awaiting Sam's merge authorisation —
`I00399`/`HD1002` (Clarimond) and `I00503`/`H01149` (Lewis Davenport Cowles).

---

## TIER 6 — known-and-deliberate, do not "fix"

Recorded here so a future session does not spend a day undoing a decision.

- **`unnamed-<id>` slugs.** A bracketed display name (`[Son] Rackemann`) is treated as a
  placeholder and slugged from the ID — deliberate, ID-anchored for stability, shared by ~130
  people. Changing it means changing the rule for all of them.
- **Married-in women slug by MAIDEN name.** `structuredSurname()` slugs married-in people by
  maiden name and bloodline people by married name. Elizabeth Enders therefore stays at
  `/person/elizabeth-mcguire-1939` however her display name reads. Deliberate.
- **`is_living` date suppression.** 133+ people have dates deliberately hidden. Sam's standing
  decision: *"leave it as designed."*
- **`research_notes` is dead.** Not a bug — a field to stop using. Mine old notes into
  user-facing fields when you touch a record; never park anything new there.
- **The Talcott severance.** `hidden` Talcott records are dropped at build, including as
  cross-connection targets. Intended.
- **`canonical.json` is ~59 MB** and GitHub warns on every push. The repo stays fast because
  `static/data/` is gitignored. Do not "fix" the warning by rewriting history or adding LFS
  without Sam's decision.
