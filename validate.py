#!/usr/bin/env python3
"""
validate.py  --  Hooker Descendants canonical validator
=========================================================
Executable enforcement of schema v22 (§B.2 enums, §C issues register, §D.3 sweep).

This is the STRUCTURAL gate. It answers "can this be saved?" — not "should this
be shipped?" (that judgment lives in WORKFLOW.md). Run it after every batch,
before promoting canonical_draft.json -> canonical.json.

Usage:
    python validate.py canonical_draft.json
    python validate.py canonical_draft.json --baseline canonical.json   # also diff for silent loss
    python validate.py canonical_draft.json --strict                     # exit 1 on ANY finding

Exit codes:
    0  = no ERRORS (warnings may exist)
    1  = ERRORS present (do not promote)  OR  --strict and any finding

Design notes:
  * ERRORS block promotion (schema violations, broken bidirectionality, ID collisions).
  * WARNINGS are the §C standing-debt categories — reported with counts, never block,
    because Sam draws those down deliberately, not in a mass fix.
  * The --baseline diff is the silent-loss guard: it flags any person who LOST an NB,
    a photo_url, or a bio_blurb relative to the prior canonical. This is the check
    that would have caught the Mary Morse requiem overwrite at 6Y-806.
"""

import json, re, sys, argparse
from collections import Counter, defaultdict

# ----------------------------------------------------------------------------
# CONTROLLED VOCABULARIES  (schema v22 §B.2 — the two NON-interchangeable enums)
# ----------------------------------------------------------------------------
NB_CATEGORY = {
    'career','military','education','religion','family','character','politics',
    'law','social_reform','death','legacy','marriage','crime','literature',
    'science','business','arts',
}
NOTABLE_CATEGORY = {
    'politics','military','law','religion','education','arts','science','business',
    'exploration','social_reform','charity','literature','poetry','medicine',
    'author','history',
}
# §B.2 asymmetry remaps (suggested, for the report — NOT auto-applied)
NB_CATEGORY_REMAP = {
    'medicine':'science', 'history':'legacy', 'academia':'education',
    'academy':'education', 'mathematics':'science', 'art_history':'arts',
    'historic_preservation':'legacy', 'abolitionism':'social_reform',
    'migration':'family', 'work':'career', 'life':'character',
    'achievement':'legacy', 'civic':'social_reform', 'naming':'family',
}
DATE_PRECISION = {'exact','year_only','month_year','approximate','estimated',
                  'baptism_proxy','after'}

# CC: per Sam (2026-06), the `type` label is IGNORED going forward. A CC is valid
# when it is reciprocal, has link_text, has display_label, and display_label<=70.
# We do NOT validate or remap CC `type`. The four real rules:
CC_LABEL_MAX = 70

# NB structural limits (schema v21 §5 / v22 §D.6)
NB_HEADER_MAX_WORDS = 8
NB_BODY_MAX_SENTENCES = 3
NB_MAX_PER_PERSON = 6            # v22 §D.6 says "max out at 5" for majors; 6 is the hard ceiling the UI supports
BIO_BLURB_MAX_WORDS = 8
NOTABLE_BLURB_MAX_WORDS = 8

# Connection-filler: NB bodies whose POINT is the Hooker link (WORKFLOW rule, surfaced
# here as a WARNING so it's visible; judgment cases still need a human).
FILLER_PATTERNS = [
    r'\bbecame a hooker\b',
    r'\bmarried into the hooker\b',
    r'\bconnect(?:s|ed)? (?:to|into) the hooker\b',
    r'\bjoined the hooker (?:line|family|tree)\b',
    r'\bbrought .{0,30} into the hooker\b',
]

ID_PREFIX_RE = re.compile(r'^(HD|H|X|I|TD|T)\d')
ANY_ID_IN_TEXT = re.compile(r'\b(HD|H|X|I|T|TD|INST|ART|VID|DOC|LM|CEM|STAT|WAR|BTL)\d{3,}\b')


def sentence_count(body: str) -> int:
    """Match the project's integrity-check sentence splitter: protect decimals and
    abbreviations (Mr. Dr. Gen. initials) before splitting on . ! ?"""
    b = re.sub(r'(\d)\.(\d)', r'\1_\2', body)
    b = re.sub(r'\b(?:[A-Z]\.\s?){2,}', 'ABBR ', b)
    b = re.sub(r'\b([A-Z]\.|Mr|Mrs|Mme|Mlle|Messrs|Dr|St|Ste|Gen|Gov|Rev|Jr|Sr|Co|Esq|vs)\.', r'\1', b)
    # Count only fragments with real content — a trailing closing quote / stray punctuation after
    # the final period (e.g. a body ending ...backed.') is not a sentence.
    return len([s for s in re.split(r'[.!?]+', b) if re.search(r'[A-Za-z0-9]', s)])


def load(path):
    with open(path) as f:
        return json.load(f)


def validate(path, baseline_path=None):
    T = load(path)
    people = T['people']
    tp = {p['id']: p for p in people}

    errors = []      # block promotion
    warnings = []    # §C standing debt — report, don't block
    debt = Counter() # tallies for the §C-style summary

    def nm(p): return (p.get('bio') or {}).get('display_name', p['id'])

    # ---- helper: children listed across a person's marriages ----
    def children_of(pid):
        out = []
        for m in (tp[pid].get('marriages') or []):
            out += (m.get('children_ids') or [])
        return out

    # ========================================================================
    # 1. ID INTEGRITY  (§D.1 — the #1 recurring bug)
    # ========================================================================
    ids = [p['id'] for p in people]
    dupes = [i for i, c in Counter(ids).items() if c > 1]
    for d in dupes:
        errors.append(f"DUPLICATE ID: {d} appears {ids.count(d)} times")

    # ========================================================================
    # 2. PER-PERSON STRUCTURAL CHECKS
    # ========================================================================
    for p in people:
        pid = p['id']
        who = f"{pid} ({nm(p)})"

        # --- parents must be a dict {father_id, mother_id}, never a list ---
        par = p.get('parents')
        if isinstance(par, list) and par:
            errors.append(f"{who}: parents is a LIST, must be dict {{father_id,mother_id}}")
        elif isinstance(par, dict):
            for role in ('father_id', 'mother_id'):
                ref = par.get(role)
                if ref and ref not in tp:
                    errors.append(f"{who}: parents.{role}={ref} is a dangling reference")
                # bidirectional: named parent must list this child
                elif ref and pid not in children_of(ref):
                    debt['C7_parent_child_reciprocity'] += 1
                    warnings.append(f"{who}: names parent {ref} who does not list them as a child")

        # --- marriages reciprocal + spouse resolves ---
        for m in (p.get('marriages') or []):
            sp = m.get('spouse_id')
            if sp and sp not in tp:
                errors.append(f"{who}: marriage spouse_id={sp} is a dangling reference")
            elif sp and not any(mm.get('spouse_id') == pid for mm in (tp[sp].get('marriages') or [])):
                errors.append(f"{who}: married to {sp} but {sp} does not list them back (non-reciprocal)")
            for cid in (m.get('children_ids') or []):
                if cid not in tp:
                    errors.append(f"{who}: lists child {cid} who does not exist")

        # --- bio_blurb / notable_blurb length ---
        bb = (p.get('bio') or {}).get('bio_blurb')
        if bb and len(bb.split()) > BIO_BLURB_MAX_WORDS:
            debt['C8_bio_blurb_over_8'] += 1
            warnings.append(f"{who}: bio_blurb is {len(bb.split())} words (max {BIO_BLURB_MAX_WORDS}): '{bb}'")

        # --- notable object ---
        no = p.get('notable')
        if no is not None and not isinstance(no, dict):
            errors.append(f"{who}: notable is malformed (not a dict)")
        elif isinstance(no, dict):
            if no.get('is_notable'):
                if not no.get('primary_url'):
                    errors.append(f"{who}: is_notable=true but no primary_url")
                cats = no.get('notable_category') or []
                if not cats:
                    errors.append(f"{who}: is_notable=true but notable_category is empty")
                for c in cats:
                    if c not in NOTABLE_CATEGORY:
                        sug = NB_CATEGORY_REMAP.get(c)
                        msg = f"{who}: notable_category '{c}' not in enum"
                        errors.append(msg + (f" (remap -> {sug}?)" if sug and sug in NOTABLE_CATEGORY else ""))
            nbb = no.get('notable_blurb')
            if nbb and len(nbb.split()) > NOTABLE_BLURB_MAX_WORDS:
                warnings.append(f"{who}: notable_blurb is {len(nbb.split())} words: '{nbb}'")

        # --- date_precision valid values ---
        for ev in ('birth', 'death'):
            dp = (p.get(ev) or {}).get('date_precision')
            if dp and dp not in DATE_PRECISION:
                warnings.append(f"{who}: {ev}.date_precision '{dp}' not in controlled set")

        # --- gender missing (surfaces as neuter "Spouse of" instead of Wife/Husband) ---
        if not p.get('gender') and (p.get('marriages')):
            debt['REM_gender_missing_married'] += 1
            warnings.append(f"{who}: gender missing but has a marriage (card shows 'Spouse of' not Wife/Husband)")

        # --- thomas descendant with no generation number (the "Nth Generation" line goes blank) ---
        cls = p.get('classification') or {}
        if cls.get('is_thomas_descendant') and cls.get('generation_from_thomas') is None:
            debt['REM_thomas_no_generation'] += 1
            warnings.append(f"{who}: is_thomas_descendant but generation_from_thomas is null (generation line blank)")

        # --- NARRATIVE BLOCKS ---
        nbs = p.get('narrative_blocks') or []
        if len(nbs) > NB_MAX_PER_PERSON:
            errors.append(f"{who}: {len(nbs)} NBs exceeds ceiling {NB_MAX_PER_PERSON}")
        numbers = [nb.get('number') for nb in nbs]
        if numbers and numbers != list(range(1, len(nbs) + 1)):
            errors.append(f"{who}: NB numbering not 1..n sequential: {numbers}")
        for nb in nbs:
            hdr = nb.get('header', '')
            body = nb.get('body', '')
            cat = nb.get('category')
            # category is MANDATORY and must be in enum (the rule Sam flagged)
            if cat is None:
                debt['C6_nb_category_missing'] += 1
                errors.append(f"{who}: NB '{hdr[:40]}' has NO category (mandatory)")
            elif cat not in NB_CATEGORY:
                debt['C6_nb_category_drift'] += 1
                sug = NB_CATEGORY_REMAP.get(cat)
                warnings.append(f"{who}: NB category '{cat}' not in enum"
                                + (f" (remap -> {sug}?)" if sug else "") + f"  [{hdr[:40]}]")
            if not hdr:
                errors.append(f"{who}: NB with no header")
            elif len(hdr.split()) > NB_HEADER_MAX_WORDS:
                errors.append(f"{who}: NB header {len(hdr.split())} words (max {NB_HEADER_MAX_WORDS}): '{hdr}'")
            if sentence_count(body) > NB_BODY_MAX_SENTENCES:
                errors.append(f"{who}: NB body >{NB_BODY_MAX_SENTENCES} sentences: '{hdr}'")
            if ANY_ID_IN_TEXT.search(body):
                errors.append(f"{who}: NB body contains a raw ID string: '{hdr}'")
            # connection-filler — WARNING (judgment cases need a human, but surface it)
            low = body.lower()
            for pat in FILLER_PATTERNS:
                if re.search(pat, low):
                    debt['WF_connection_filler'] += 1
                    warnings.append(f"{who}: NB looks like Hooker-connection filler: '{hdr}'")
                    break

        # --- CROSS-CONNECTIONS  (per Sam: type IGNORED; only 4 rules matter) ---
        for c in (p.get('cross_connections') or []):
            other = c.get('related_id')
            if not other or other not in tp:
                errors.append(f"{who}: CC related_id={other} is a dangling reference")
                continue
            if not c.get('link_text'):
                errors.append(f"{who}: CC to {other} missing link_text")
            dl = c.get('display_label', '')
            if not dl:
                errors.append(f"{who}: CC to {other} missing display_label")
            elif len(dl) > CC_LABEL_MAX:
                debt['C4_cc_label_over_70'] += 1
                warnings.append(f"{who}: CC display_label {len(dl)} chars (max {CC_LABEL_MAX})")
            # reciprocity (the C5 debt)
            if not any(cc.get('related_id') == pid for cc in (tp[other].get('cross_connections') or [])):
                debt['C5_cc_one_directional'] += 1
                warnings.append(f"{who}: CC to {other} is one-directional (no reciprocal)")
            # the WORKFLOW rule: a searchable person must not show a CC to a non-searchable person
            if (p.get('classification') or {}).get('is_searchable') is not False:
                if (tp[other].get('classification') or {}).get('is_searchable') is False:
                    errors.append(f"{who}: searchable person has a CC to NON-searchable {other}")

    # ========================================================================
    # 3. TOP-LEVEL ARRAY BIDIRECTIONALITY  (videos/documents/institutions/landmarks)
    # ========================================================================
    def check_backlinks(top_key, id_field, person_link_key, person_link_id):
        for rec in T.get(top_key, []):
            for ref in (rec.get('person_ids') or []):
                if ref not in tp:
                    errors.append(f"{top_key} {rec.get(id_field)}: person_ids->{ref} dangling")
                else:
                    links = tp[ref].get(person_link_key) or []
                    if not any((x.get(person_link_id) if isinstance(x, dict) else x) == rec.get(id_field) for x in links):
                        warnings.append(f"{top_key} {rec.get(id_field)}: {ref} has no reciprocal backlink")
    check_backlinks('videos', 'id', 'videos', 'video_id')
    check_backlinks('documents', 'id', 'documents', 'document_id')

    # ========================================================================
    # 4. BASELINE DIFF  —  the SILENT-LOSS guard (catches NB/photo/blurb deletion)
    # ========================================================================
    if baseline_path:
        B = load(baseline_path)
        btp = {p['id']: p for p in B['people']}
        for pid, bp in btp.items():
            if pid not in tp:
                warnings.append(f"BASELINE DIFF: {pid} ({nm(bp)}) was DELETED — confirm intentional")
                continue
            cur = tp[pid]
            # NB headers lost?
            b_hdrs = {nb.get('header') for nb in (bp.get('narrative_blocks') or [])}
            c_hdrs = {nb.get('header') for nb in (cur.get('narrative_blocks') or [])}
            lost = b_hdrs - c_hdrs
            if lost:
                errors.append(f"SILENT LOSS: {pid} ({nm(bp)}) lost NB(s): {sorted(lost)}")
            # photo_url lost?
            if (bp.get('bio') or {}).get('photo_url') and not (cur.get('bio') or {}).get('photo_url'):
                errors.append(f"SILENT LOSS: {pid} ({nm(bp)}) lost its photo_url")
            # bio_blurb lost?
            if (bp.get('bio') or {}).get('bio_blurb') and not (cur.get('bio') or {}).get('bio_blurb'):
                warnings.append(f"SILENT LOSS: {pid} ({nm(bp)}) lost its bio_blurb")

    return errors, warnings, debt, len(people)


def main():
    ap = argparse.ArgumentParser(description="Validate Hooker canonical against schema v22.")
    ap.add_argument('path', help='canonical_draft.json to validate')
    ap.add_argument('--baseline', help='prior canonical.json — enables silent-loss diff')
    ap.add_argument('--strict', action='store_true', help='exit 1 on any finding (errors OR warnings)')
    args = ap.parse_args()

    errors, warnings, debt, n = validate(args.path, args.baseline)

    print(f"\n=== validate.py — {args.path} ({n:,} people) ===\n")

    if errors:
        print(f"ERRORS ({len(errors)}) — these BLOCK promotion to canonical:")
        for e in errors[:200]:
            print("  ✗", e)
        if len(errors) > 200:
            print(f"  ... and {len(errors)-200} more")
        print()
    else:
        print("ERRORS: none ✓  (structurally safe to promote)\n")

    if debt:
        print("STANDING-DEBT TALLY (schema §C categories — informational, not blocking):")
        for k, v in sorted(debt.items(), key=lambda x: -x[1]):
            print(f"  {v:>5}  {k}")
        print()

    if warnings:
        print(f"WARNINGS ({len(warnings)}) — review, but do not block:")
        for w in warnings[:60]:
            print("  ·", w)
        if len(warnings) > 60:
            print(f"  ... and {len(warnings)-60} more (see counts above)")
        print()

    blocked = bool(errors) or (args.strict and (errors or warnings))
    print("RESULT:", "BLOCKED — fix ERRORS before promoting." if blocked else "OK to promote ✓")
    sys.exit(1 if blocked else 0)


if __name__ == '__main__':
    main()
