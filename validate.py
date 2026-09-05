#!/usr/bin/env python3
"""
validate.py  --  Hooker Descendants canonical validator
=========================================================
Executable enforcement of schema v24 (§B.2 enums, §C issues register, §D.3 sweep).
v24 = the v23 body plus the appended v24 delta record; the §-numbers below are unchanged.

This is the STRUCTURAL gate. It answers "can this be saved?" — not "should this
be shipped?" (that judgment lives in WORKFLOW.md). Run it after every batch,
against canonical.json (edited in place; the git commit is the revert point — no draft file).

Usage:
    python validate.py canonical.json
    python validate.py canonical.json --baseline /tmp/baseline.json   # diff vs git HEAD for silent loss
    python validate.py canonical.json --strict                        # exit 1 on ANY finding

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
# CONTROLLED VOCABULARIES  (schema v24 §B.2 — the two NON-interchangeable enums;
#  v24 §v24-5 lists the specific collisions: 'music' is NB-only, 'history' is notable-only)
# ----------------------------------------------------------------------------
NB_CATEGORY = {
    'career','military','education','religion','family','character','politics',
    'law','social_reform','death','legacy','marriage','crime','literature',
    'science','business','arts','music','sports',
}
NOTABLE_CATEGORY = {
    'politics','military','law','religion','education','arts','science','business',
    'exploration','social_reform','charity','literature','poetry','medicine',
    'author','history','horse_racing','journalist','socialite','athletics',
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
NB_MAX_PER_PERSON = 7            # v24 (Sam, 10 Aug 2026): raised 6 -> 7; FeaturedCard now fits a seventh
                                 # row, but ONLY with short headers — a card of seven long headers still
                                 # overruns the bottom border. Null beats weak: four with meat beats seven.
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

# Canonical tag vocabulary (DATA, not code): approved tags live in canonical_tags.txt
# beside this script, one per line (# comments / blanks ignored). Absent or empty ->
# the tag check is OFF. Non-canonical tags are WARNINGS (the §6 vocabulary debt),
# never ERRORS, so legacy junk tags surface without blocking promotion.
def _load_canonical_tags():
    import os
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'canonical_tags.txt')
    try:
        with open(path) as f:
            tags = {ln.strip() for ln in f
                    if ln.strip() and not ln.lstrip().startswith('#')}
    except FileNotFoundError:
        return None
    return frozenset(tags) or None

CANONICAL_TAGS = _load_canonical_tags()


def sentence_count(body: str) -> int:
    """Match the project's integrity-check sentence splitter: protect decimals and
    abbreviations (Mr. Dr. Gen. initials) before splitting on . ! ?"""
    b = re.sub(r'(\d)\.(\d)', r'\1_\2', body)
    b = re.sub(r'\b(?:[A-Z]\.\s?){2,}', 'ABBR ', b)
    # 'vs'/'v' protect legal-citation periods ("Brom and Bett v. Ashley") — \b ensures the bare
    # 'v' only matches a standalone citation token, never the v inside words like "Nov."
    # 'Col'/'Capt' are standard rank abbreviations (same class as Gen/Gov/Dr) — protect them too.
    b = re.sub(r'\b([A-Z]|Mr|Mrs|Mme|Mlle|Messrs|Dr|St|Ste|Gen|Gov|Col|Capt|Rev|Jr|Sr|Co|Esq|vs|v)\.', r'\1', b)
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

        # --- SEVERANCE GUARD: a VISIBLE person must not cross-connect to a HIDDEN one ---
        # regenerate-data.js drops these from the emitted payload, so the card is not broken today.
        # But the CC is the one emit path that cannot self-degrade — it resolves its href through
        # slugMap, which deliberately still holds hidden people so their slugs stay reserved. If the
        # build-time filter is ever removed or reordered, every one of these becomes a live-looking
        # link to a page that was never written. An ERROR, not a warning: a batch should not be able
        # to add one silently, and re-sewing the line is what clears it.
        if not (p.get('classification') or {}).get('hidden'):
            for cc in (p.get('cross_connections') or []):
                rid = cc.get('related_id')
                tgt = tp.get(rid) if rid else None
                if tgt and (tgt.get('classification') or {}).get('hidden'):
                    debt['SEV_cc_to_hidden'] += 1
                    errors.append(f"{who}: CC to {rid} ({nm(tgt)}) which is HIDDEN "
                                  f"({(tgt['classification'] or {}).get('hidden')}) — dropped at build, "
                                  f"remove the CC or un-hide the target")

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
            # CO-LINK (Sam, 5 Sep 2026): one CC row may carry a SECOND linked name sharing the
            # predicate ("John and Isabella Beecher Hooker founded Nook Farm…"). It is a real
            # navigable edge, so it validates like one and COUNTS as the reciprocal of the
            # co-target's own CC back — otherwise merging two rows into one would report the
            # surviving partner as one-directional.
            co = c.get('co_link') or {}
            co_id = co.get('related_id')
            if co_id:
                if co_id not in tp:
                    errors.append(f"{who}: CC co_link related_id={co_id} is a dangling reference")
                elif not co.get('link_text'):
                    errors.append(f"{who}: CC co_link to {co_id} missing link_text")
            # reciprocity (the C5 debt)
            if not any(pid in (cc.get('related_id'), ((cc.get('co_link') or {}).get('related_id')))
                       for cc in (tp[other].get('cross_connections') or [])):
                debt['C5_cc_one_directional'] += 1
                warnings.append(f"{who}: CC to {other} is one-directional (no reciprocal)")
            # the WORKFLOW rule: a searchable person must not show a CC to a non-searchable person
            if (p.get('classification') or {}).get('is_searchable') is not False:
                if (tp[other].get('classification') or {}).get('is_searchable') is False:
                    errors.append(f"{who}: searchable person has a CC to NON-searchable {other}")

        # --- non-canonical tags (the §6 vocabulary debt — WARNING, never blocks) ---
        if CANONICAL_TAGS is not None:
            for t in (p.get('tags') or []):
                if t not in CANONICAL_TAGS:
                    debt['tag_non_canonical'] += 1
                    warnings.append(f"{who}: non-canonical tag '{t}'")

        # --- career rows that will not render (missing start_year) ---
        for cr in (p.get('career') or []):
            if not cr.get('start_year'):
                debt['career_no_start_year'] += 1
                warnings.append(f"{who}: career '{cr.get('role') or '?'}' has no start_year (will not render)")

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
            # NB lost? Detect DISAPPEARANCE by block COUNT, not header text. An
            # authorized nb_replace rewrites a header IN PLACE (count unchanged) and
            # must NOT read as loss — keying on header text cried wolf on every
            # replace. A genuine deletion drops the count; report the vanished headers.
            b_nbs = bp.get('narrative_blocks') or []
            c_nbs = cur.get('narrative_blocks') or []
            if len(c_nbs) < len(b_nbs):
                c_hdrs = {nb.get('header') for nb in c_nbs}
                gone = sorted(nb.get('header') for nb in b_nbs if nb.get('header') not in c_hdrs)
                errors.append(f"SILENT LOSS: {pid} ({nm(bp)}) NB count {len(b_nbs)}->{len(c_nbs)}"
                              f" — no longer present: {gone}")
            # photo_url lost?
            if (bp.get('bio') or {}).get('photo_url') and not (cur.get('bio') or {}).get('photo_url'):
                errors.append(f"SILENT LOSS: {pid} ({nm(bp)}) lost its photo_url")
            # bio_blurb lost?
            if (bp.get('bio') or {}).get('bio_blurb') and not (cur.get('bio') or {}).get('bio_blurb'):
                warnings.append(f"SILENT LOSS: {pid} ({nm(bp)}) lost its bio_blurb")

    return errors, warnings, debt, len(people)


def _key(f):
    """Comparison key for a finding: drop the parenthetical display name so a legitimate
    rename ('X03821 (Marcella M. …)' -> 'X03821 (Marcella Callery …)') doesn't read as a
    finding disappearing and a new one arriving."""
    return re.sub(r'^(\S+) \([^)]*\)', r'\1', f)


def run_delta(path, baseline_path, quiet_ok):
    """--since: report ONLY what THIS batch changed.

    The standing §C debt is ~1,300 errors and ~4,200 warnings by design (see WORKFLOW §7),
    so a plain run prints BLOCKED every time and the one question that matters — *did my
    batch break anything?* — has to be grepped out of the pile by eye. This answers it
    directly: findings present now and absent in the baseline, plus the silent-loss guard,
    with the exit code keyed to the DELTA rather than the absolute count.

    The full report is still one flag away; this does not replace it."""
    cur_e, cur_w, cur_debt, n = validate(path, baseline_path)   # baseline_path adds SILENT LOSS
    base_e, base_w, base_debt, bn = validate(baseline_path)

    loss = [e for e in cur_e if e.startswith('SILENT LOSS')]
    base_ek, base_wk = {_key(x) for x in base_e}, {_key(x) for x in base_w}
    new_e = [e for e in cur_e if e not in loss and _key(e) not in base_ek]
    new_w = [w for w in cur_w if _key(w) not in base_wk]
    fixed_e = len(base_ek - {_key(x) for x in cur_e})

    print(f"\n=== validate.py --since — {path} ({n:,} people, baseline {bn:,}) ===\n")

    def block(label, items, mark):
        if items:
            print(f"{label} ({len(items)}):")
            for x in items[:60]:
                print(f"  {mark}", x)
            if len(items) > 60:
                print(f"  ... and {len(items)-60} more")
            print()
        else:
            print(f"{label}: none ✓")

    block("SILENT LOSS", loss, "✗")
    block("NEW ERRORS", new_e, "✗")
    block("NEW WARNINGS", new_w, "·")
    if fixed_e:
        print(f"(resolved {fixed_e} pre-existing error(s) — drawdown, not a regression)")
    print(f"\nstanding debt unchanged at {len(base_e):,} errors / {len(base_w):,} warnings"
          f"  →  now {len(cur_e)-len(loss):,} / {len(cur_w):,}")

    blocked = bool(loss or new_e) or (quiet_ok and new_w)
    print("\nRESULT:", "BLOCKED — this batch introduced the findings above."
          if blocked else "CLEAN — this batch introduced nothing new ✓")
    sys.exit(1 if blocked else 0)


def main():
    ap = argparse.ArgumentParser(description="Validate Hooker canonical against schema v24.")
    ap.add_argument('path', help='canonical.json to validate')
    ap.add_argument('--baseline', help='prior canonical.json — enables silent-loss diff')
    ap.add_argument('--since', help='prior canonical.json — report ONLY findings THIS batch added')
    ap.add_argument('--strict', action='store_true', help='exit 1 on any finding (errors OR warnings)')
    args = ap.parse_args()

    if args.since:
        run_delta(args.path, args.since, args.strict)

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
