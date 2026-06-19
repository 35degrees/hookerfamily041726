#!/usr/bin/env python3
"""
remediate.py  --  Hooker Descendants content-remediation hunter
================================================================
Finds likely-BAD bio_blurbs / notable_blurbs / NBs and emits a ranked worklist
(.tsv) that Sam marks fix / null / keep. The marked worklist then feeds back
through process_tasks.py as an AUTHORIZED remediation batch.

This is the "carving marble" / mop-up tool: a 14,792-person tree built fast has a
long tail of blurbs that read like sentences and NBs that reach for flourish. The
hunter can't judge taste, but it can catch the MECHANICAL TELLS of a bad one and
hand Sam a triage list so he stops STUMBLING on them randomly and instead works
them down deliberately, worst-first.

Usage:
    python remediate.py canonical.json --blurbs        # hunt bad blurbs -> blurb_worklist.tsv
    python remediate.py canonical.json --nbs           # hunt bad NBs    -> nb_worklist.tsv
    python remediate.py canonical.json --blurbs --nbs  # both
    python remediate.py canonical.json --blurbs --limit 50   # top 50 worst only

The worklist columns (Sam fills `decision` + `correction`):
    person_id  field  current  why_flagged  rank  |  decision  correction

    decision : fix | null | keep        (Sam writes one)
    correction : the corrected text     (only when decision=fix)

Then convert the marked worklist to a task batch:
    python remediate.py --to-tasks blurb_worklist.tsv > tasks.tsv
    # fix  -> blurb_replace row   |   null -> blurb_remove row   |   keep -> skipped

---------------------------------------------------------------------------------
THE BLURB DOCTRINE the hunter enforces (from WORKFLOW.md):
  A blurb is a LABEL, not a sentence. Noun phrase(s) naming the person's role(s),
  comma/semicolon separated. States WHAT THEY WERE, holds a couple of roles, no
  specifics (those are the NB's job), no repetition of structured fields (location,
  parentage, spouse) or of NB content. Sentence-case. Null beats weak.

  Gold: "Portfolio manager; documentary artist" / "Ceramicist, photographer;
        garden volunteer" / "Farmer" / "Mayor of Tiburon"
  Barf: "Last surviving child of Samuel Morse" (parentage fact, not a role)
        "San Franciscan who married Minerva Hooker" (location + spouse, redundant)
        "Tiburon artist who scanned halved flowers" (NB header in disguise)
"""

import json, re, sys, argparse, csv

# ----------------------------------------------------------------------------
# BLURB BADNESS HEURISTICS  -- each returns a reason string if it fires, else None.
# Weights drive the ranking (higher = more likely bad = surfaced first).
# ----------------------------------------------------------------------------

# relative-clause / sentence tells: "who ...", "that became", "which ..."
REL_CLAUSE = re.compile(r'\b(who|whom|whose|which|that)\b', re.I)
# action verbs doing narrative work (a label has no finite verb)
ACTION_VERB = re.compile(
    r'\b(married|wrote|scanned|built|founded|led|served|fought|painted|'
    r'became|joined|moved|settled|sailed|died|survived|raised|ran|won|'
    r'helped|made|gave|left|kept|carried|opened|invented|discovered)\b', re.I)
# pure parentage / kinship facts (not a role)
KINSHIP = re.compile(
    r'\b(son|daughter|child|children|wife|husband|widow|mother|father|'
    r'sister|brother|grand(son|daughter|child)|descendant|namesake|'
    r'last surviving|only surviving)\b', re.I)
# bare location-as-identity ("San Franciscan", "Tiburon artist", "Bostonian")
# (location is fine when it's the ROLE: "Mayor of Tiburon" -> has a role word)
ROLE_WORD = re.compile(
    r'\b(farmer|teacher|professor|lawyer|judge|doctor|physician|surgeon|'
    r'minister|reverend|pastor|missionary|nurse|engineer|architect|artist|'
    r'painter|sculptor|ceramicist|photographer|printmaker|writer|author|poet|'
    r'editor|publisher|journalist|merchant|banker|broker|manager|executive|'
    r'officer|captain|colonel|general|admiral|lieutenant|sergeant|major|'
    r'mayor|governor|senator|representative|congressman|justice|secretary|'
    r'president|director|founder|principal|dean|scientist|chemist|physicist|'
    r'biologist|geologist|astronomer|mathematician|economist|historian|'
    r'librarian|curator|volunteer|gardener|rancher|naturalist|inventor|'
    r'clergyman|deacon|surveyor|silversmith|blacksmith|shipbuilder|'
    r'businessman|businesswoman|entrepreneur|philanthropist|suffragist|'
    r'abolitionist|psychiatrist|psychologist|pharmacist|veterinarian)\b', re.I)
GEONYM = re.compile(
    r'\b([A-Z][a-z]+(?:an|ian|er|ite)|San \w+an|New \w+er)\b')


def blurb_flags(text, person):
    """Return (list_of_reasons, score). Empty list => looks fine."""
    if not text:
        return [], 0
    reasons, score = [], 0
    words = text.split()
    has_role = bool(ROLE_WORD.search(text))

    if REL_CLAUSE.search(text):
        reasons.append("relative clause (reads as a sentence, not a label)"); score += 5
    if ACTION_VERB.search(text):
        reasons.append("action verb (a blurb names a role, it doesn't narrate)"); score += 5
    if KINSHIP.search(text) and not has_role:
        reasons.append("kinship/parentage fact, not a role"); score += 4
    if len(words) > 8:
        reasons.append(f"{len(words)} words (>8; likely a sentence)"); score += 3
    # location-as-identity with no role word ("San Franciscan", "Tiburon artist"
    # only counts if 'artist' present -> has_role true, so this catches bare geonyms)
    if GEONYM.search(text) and not has_role:
        reasons.append("bare location-as-identity (location only earns a spot as a role, e.g. 'Mayor of X')"); score += 3
    # repeats an NB header? (blurb must operate above the NBs)
    for nb in (person.get('narrative_blocks') or []):
        h = (nb.get('header') or '').lower()
        # crude overlap: 3+ shared significant words
        bw = {w.lower().strip('.,;') for w in words if len(w) > 4}
        hw = {w.lower().strip('.,;') for w in h.split() if len(w) > 4}
        if len(bw & hw) >= 2:
            reasons.append(f"echoes an NB header ('{nb.get('header')}')"); score += 4
            break
    # Title Case Every Word (should be sentence case)
    caps = [w for w in words if w[:1].isupper()]
    if len(words) >= 3 and len(caps) >= len(words) - 1 and not all(w.isupper() for w in caps):
        # most words capitalized and it's not an acronym string
        reasons.append("Title Case (blurbs use sentence case)"); score += 1
    return reasons, score


# ----------------------------------------------------------------------------
# NB BADNESS HEURISTICS (lighter -- NBs are more judgment; flag the clear tells)
# ----------------------------------------------------------------------------
FILLER = [
    r'\bbecame a hooker\b', r'\bmarried into the hooker\b',
    r'\bconnect(?:s|ed)? (?:to|into) the hooker\b',
    r'\bjoined the hooker (?:line|family|tree)\b',
    r'\bone of .{0,30} two prominent\b',
]
def nb_flags(nb, person):
    reasons, score = [], 0
    hdr = nb.get('header') or ''
    body = nb.get('body') or ''
    low = body.lower()
    if not nb.get('category'):
        reasons.append("no category (mandatory)"); score += 3
    if len(hdr.split()) > 8:
        reasons.append(f"header {len(hdr.split())} words (>8)"); score += 2
    for pat in FILLER:
        if re.search(pat, low) or re.search(pat, hdr.lower()):
            reasons.append("connection-filler (the Hooker tie is the price of admission, not the story)"); score += 5
            break
    # header that just states the answer (summary, not a hook) -- weak signal:
    if re.match(r'^(he|she|they)\s+(was|were|is)\b', hdr.strip(), re.I):
        reasons.append("header states rather than hooks"); score += 1
    return reasons, score


# ----------------------------------------------------------------------------
def hunt(path, do_blurbs, do_nbs, limit):
    T = json.load(open(path))
    people = T['people']

    if do_blurbs:
        rows = []
        for p in people:
            for field in ('bio_blurb', 'notable_blurb'):
                src = (p.get('bio') or {}) if field == 'bio_blurb' else (p.get('notable') or {})
                text = src.get(field)
                reasons, score = blurb_flags(text, p)
                if reasons:
                    rows.append({
                        'person_id': p['id'], 'field': field,
                        'current': text, 'why_flagged': ' | '.join(reasons),
                        'rank': score,
                    })
        rows.sort(key=lambda r: -r['rank'])
        if limit: rows = rows[:limit]
        write_worklist('blurb_worklist.tsv', rows)
        print(f"BLURB worklist: {len(rows)} flagged -> blurb_worklist.tsv (worst first)")

    if do_nbs:
        rows = []
        for p in people:
            for nb in (p.get('narrative_blocks') or []):
                reasons, score = nb_flags(nb, p)
                if reasons:
                    rows.append({
                        'person_id': p['id'], 'field': 'nb',
                        'current': nb.get('header'), 'why_flagged': ' | '.join(reasons),
                        'rank': score,
                    })
        rows.sort(key=lambda r: -r['rank'])
        if limit: rows = rows[:limit]
        write_worklist('nb_worklist.tsv', rows)
        print(f"NB worklist: {len(rows)} flagged -> nb_worklist.tsv (worst first)")


def write_worklist(fn, rows):
    cols = ['person_id', 'field', 'current', 'why_flagged', 'rank', 'decision', 'correction']
    with open(fn, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=cols, delimiter='\t', extrasaction='ignore')
        w.writeheader()
        for r in rows:
            r.setdefault('decision', '')      # Sam writes: fix | null | keep
            r.setdefault('correction', '')    # Sam writes corrected text when fix
            w.writerow(r)


def to_tasks(worklist_path):
    """Convert a MARKED worklist into a tasks.tsv batch printed to stdout.
       fix -> blurb_replace/nb_replace ; null -> blurb_remove/nb_remove ; keep -> skipped."""
    out = [['person_id', 'field', 'value_or_angle']]
    skipped = kept = 0
    with open(worklist_path) as f:
        for r in csv.DictReader(f, delimiter='\t'):
            dec = (r.get('decision') or '').strip().lower()
            pid = r['person_id']; fld = r['field']; cur = r.get('current', '')
            if dec == 'keep' or not dec:
                kept += 1; continue
            if r['field'] in ('bio_blurb', 'notable_blurb'):
                if dec == 'fix':
                    out.append([pid, 'blurb_replace', f"field={fld} text=\"{r.get('correction','').strip()}\""])
                elif dec == 'null':
                    out.append([pid, 'blurb_remove', f"field={fld}"])
            elif r['field'] == 'nb':
                if dec == 'fix':
                    # nb_replace by exact header: old="..." then new angle/text in correction
                    out.append([pid, 'nb_replace', f"old=\"{cur}\" new=\"{r.get('correction','').strip()}\""])
                elif dec == 'null':
                    out.append([pid, 'nb_remove', cur])
            elif r['field'] == 'gender':
                if dec == 'fix':
                    out.append([pid, 'gender', r.get('correction', '').strip()])
    w = csv.writer(sys.stdout, delimiter='\t')
    for row in out: w.writerow(row)
    sys.stderr.write(f"\n# {len(out)-1} task rows emitted; {kept} kept (skipped).\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('path', nargs='?', help='canonical.json')
    ap.add_argument('--blurbs', action='store_true')
    ap.add_argument('--nbs', action='store_true')
    ap.add_argument('--gender', action='store_true',
                    help='hunt null-gender people, propose male/female from name+context -> gender_worklist.tsv')
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--to-tasks', metavar='WORKLIST',
                    help='convert a marked worklist .tsv into a tasks.tsv batch on stdout')
    args = ap.parse_args()

    if args.to_tasks:
        to_tasks(args.to_tasks); return
    if args.gender:
        hunt_gender(args.path, args.limit); 
        if not (args.blurbs or args.nbs): return
    if not args.path or not (args.blurbs or args.nbs or args.gender):
        ap.error("give canonical.json and one of --blurbs / --nbs / --gender (or use --to-tasks)")
    if args.blurbs or args.nbs:
        hunt(args.path, args.blurbs, args.nbs, args.limit)


# ----------------------------------------------------------------------------
# GENDER INFERENCE  -- propose male/female from first name + kinship/title words.
# High-confidence names auto-propose; ambiguous ones flagged for Sam's eyes.
# ----------------------------------------------------------------------------
FEMALE_NAMES = set("""mary sarah elizabeth margaret anna anne hannah abigail martha susan
susannah lucy lydia ruth rachel rebecca esther jane catherine katherine emma ellen alice
grace eunice mercy phebe phoebe deborah dorothy emily harriet julia caroline charlotte
clara cornelia eliza fanny frances helen jennie josephine laura louisa nancy nellie olive
sophia florence edith ethel gertrude bertha mabel maud minnie pearl bessie addie carrie
katharine christine olivia""".split())
MALE_NAMES = set("""john william james george charles thomas henry samuel joseph robert
edward david benjamin daniel richard nathaniel josiah ezekiel timothy isaac jacob abraham
moses aaron caleb elijah ephraim gideon jonathan nathan oliver peter philip ralph reuben
roger simeon stephen walter alfred arthur albert frank fred harry herbert howard lewis
ernest clarence elmer floyd harold leroy ray roy victor anthony coulson joseph""".split())
FEM_CTX = re.compile(r'\b(she|her|daughter|wife|widow|mrs|miss|sister|mother)\b', re.I)
MALE_CTX = re.compile(r'\b(he|his|son|husband|widower|mr|brother|father|rev|capt|col|gen)\b', re.I)


def hunt_gender(path, limit):
    T = json.load(open(path))
    rows = []
    for p in T['people']:
        if p.get('gender'):
            continue
        b = p.get('bio') or {}
        first = (b.get('first_name') or (b.get('display_name') or '').split()[:1] or [''])[0]
        fl = first.lower().strip('.')
        proposal, conf, why = '', 0, ''
        if fl in FEMALE_NAMES:
            proposal, conf, why = 'female', 3, f"first name '{first}'"
        elif fl in MALE_NAMES:
            proposal, conf, why = 'male', 3, f"first name '{first}'"
        # context from blurb/display name
        ctx = ' '.join([b.get('display_name') or '', (b.get('bio_blurb') or '')])
        if not proposal:
            if FEM_CTX.search(ctx): proposal, conf, why = 'female', 1, 'context word'
            elif MALE_CTX.search(ctx): proposal, conf, why = 'male', 1, 'context word'
        rows.append({
            'person_id': p['id'], 'field': 'gender',
            'current': b.get('display_name'), 'why_flagged': (why or 'ambiguous/unknown name'),
            'rank': conf, 'decision': '', 'correction': proposal,
        })
    # ambiguous (conf 0) first so Sam sees the ones needing eyes; or worst confidence first
    rows.sort(key=lambda r: r['rank'])
    if limit: rows = rows[:limit]
    write_worklist('gender_worklist.tsv', rows)
    n_auto = sum(1 for r in rows if r['rank'] >= 3)
    print(f"GENDER worklist: {len(rows)} null-gender people -> gender_worklist.tsv")
    print(f"  {n_auto} high-confidence proposals (name match), {len(rows)-n_auto} need your eyes (ambiguous).")
    print("  Review the `correction` column, set decision=fix to accept (or edit), then --to-tasks.")


if __name__ == '__main__':
    main()
