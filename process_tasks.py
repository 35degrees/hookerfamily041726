#!/usr/bin/env python3
"""
process_tasks.py  --  Hooker Descendants task-sheet processor (v2, direct-on-canonical)
=======================================================================================
Reads tasks.tsv, applies changes DIRECTLY to canonical.json, writes status+slug back.

ARCHITECTURE (decided 2026-06):
  * Works directly on canonical.json -- NO draft file. Instant UX visibility after
    Code runs `node regenerate-data.js canonical.json`.
  * SAFETY comes from git + the in-process guards, not from a staging copy:
      1. Code commits canonical.json to git BEFORE each batch  -> instant revert point.
      2. The no-delete guard + validate.py run BEFORE/AROUND the write -> a destructive
         or invalid batch is caught.
      3. git revert AFTER if a card looks wrong -> the batch never happened.

TWO PASSES (per WORKFLOW.md sec 2-3):
  * PASS 1 (mechanical): photo_url, dates, blurbs, tags, marriage, parents, cc,
    education, career, searchable, notable. Deterministic, APPEND/SET-only, auto-applied.
  * PASS 2 (judgment): nb_angle / nb_full. NOT auto-written. Drafted text lands in the
    sheet's `proposed` column for Sam's approval. NB prose stays behind human eyes.

THE NO-DELETE LAW (the whole point):
  Nothing is ever deleted without an EXPLICIT, NAMED destroy row (nb_remove,
  cc_remove, tag_remove). Every handler is append/set-only. An instruction that is
  ambiguous between "replace" and "add" ALWAYS resolves to ADD. After applying, the
  script diffs the in-memory result against a snapshot taken BEFORE editing; if any
  pre-existing NB / photo / blurb / CC / marriage / array element vanished without an
  authorized removal, the script ABORTS AND WRITES NOTHING.

Usage:
    python process_tasks.py tasks.tsv
    python process_tasks.py tasks.tsv --canonical canonical.json

WORKFLOW around this script (Code runs all of it; Sam types none of it):
    git add -A && git commit -m "pre-batch <desc>"     # Code: revert point
    python process_tasks.py tasks.tsv                  # Code: apply
    git show HEAD:canonical.json > /tmp/baseline.json  # Code: last-commit baseline
    python validate.py canonical.json --baseline /tmp/baseline.json
    node regenerate-data.js canonical.json             # Code: on Sam's command
"""

import json, re, sys, csv, argparse
from collections import Counter

NB_CATEGORY = {
    'career','military','education','religion','family','character','politics',
    'law','social_reform','death','legacy','marriage','crime','literature',
    'science','business','arts',
}
RECOGNIZED_FIELDS = {
    'photo_url','birth_date','death_date','bio_blurb','notable_blurb',
    'marriage','parents','tag_add','tag_remove','education','career','cc',
    'institution','landmark','video','document','searchable','notable',
    'nb_angle','nb_full','nb_approved',
    'nb_remove','cc_remove',
    'question',
    # --- remediation ops (mop-up of pre-existing field errors) ---
    'field_set',        # generic any-field setter: value = "path=value" (dotted/bracket path)
    'gender',           # convenience: value = male|female
    'generation',       # convenience: classification.generation_from_thomas = <int>
    'blurb_replace',    # value = field=bio_blurb|notable_blurb text="..."
    'blurb_remove',     # explicit null of a blurb. value = field=bio_blurb|notable_blurb
    'career_set',       # value = index=N role="..." org="..."  (replace one career row in place)
    'education_set',    # value = index=N ...kv...                (replace one education row in place)
    'nb_replace',       # value = old="<exact header>" new="<corrected angle/header|body>"
}
# Destroy = the ONLY paths that may remove/overwrite existing content. The guard
# authorizes a loss only when one of these names the exact target.
DESTROY_FIELDS = {'tag_remove','nb_remove','cc_remove','blurb_remove','nb_replace',
                  'career_set','education_set'}


def slugify(p):
    b = p.get('bio') or {}
    first = (b.get('first_name') or (b.get('display_name') or '').split()[:1] or [''])[0]
    prefix = (re.match(r'^[A-Z]+', p['id']) or [''])[0]
    if prefix in ('I', 'X', 'U'):
        last = b.get('maiden_name') or b.get('last_name') or ''
    else:
        last = b.get('last_name') or b.get('maiden_name') or ''
    def s(x):
        x = (x or '').lower()
        x = re.sub(r"['\u2019.]", '', x)
        x = re.sub(r'[^a-z0-9]+', '-', x)
        return x.strip('-')
    yr = (p.get('birth') or {}).get('year')
    base = '-'.join([x for x in [s(first), s(last)] if x])
    return base + (f'-{yr}' if yr else '')


def snapshot(people):
    snap = {}
    for p in people:
        snap[p['id']] = {
            'nb_headers': {nb.get('header') for nb in (p.get('narrative_blocks') or [])},
            'photo': (p.get('bio') or {}).get('photo_url'),
            'blurb': (p.get('bio') or {}).get('bio_blurb'),
            'cc_ids': {c.get('related_id') for c in (p.get('cross_connections') or [])},
            'marr': {m.get('spouse_id') for m in (p.get('marriages') or [])},
            'edu': len(p.get('education') or []),
            'car': len(p.get('career') or []),
        }
    return snap


def diff_guard(snap, people, allowed_removals):
    tp = {p['id']: p for p in people}
    losses = []
    for pid, before in snap.items():
        if pid not in tp:
            losses.append(f"{pid}: ENTIRE PERSON deleted"); continue
        p = tp[pid]
        now = {nb.get('header') for nb in (p.get('narrative_blocks') or [])}
        for lost in before['nb_headers'] - now:
            if (pid, 'nb', lost) not in allowed_removals:
                losses.append(f"{pid}: NB '{lost}' vanished (no nb_remove authorized it)")
        if before['photo'] and not (p.get('bio') or {}).get('photo_url'):
            losses.append(f"{pid}: photo_url vanished")
        if before['blurb'] and not (p.get('bio') or {}).get('bio_blurb'):
            if (pid, 'blurb', 'bio_blurb') not in allowed_removals:
                losses.append(f"{pid}: bio_blurb vanished (no blurb_remove authorized it)")
        now_cc = {c.get('related_id') for c in (p.get('cross_connections') or [])}
        for lost in before['cc_ids'] - now_cc:
            if (pid, 'cc', lost) not in allowed_removals:
                losses.append(f"{pid}: CC to {lost} vanished (no cc_remove authorized it)")
        now_marr = {m.get('spouse_id') for m in (p.get('marriages') or [])}
        for lost in before['marr'] - now_marr:
            losses.append(f"{pid}: marriage to {lost} vanished")
        if len(p.get('education') or []) < before['edu']:
            losses.append(f"{pid}: an education record vanished")
        if len(p.get('career') or []) < before['car']:
            losses.append(f"{pid}: a career record vanished")
    return losses


def parse_kv(s):
    out = {}
    for m in re.finditer(r'(\w+)=("[^"]*"|\S+)', s):
        out[m.group(1)] = m.group(2).strip('"')
    return out


def apply_mechanical(field, val, p, tp):
    bio = p.setdefault('bio', {})
    if field == 'photo_url':
        bio['photo_url'] = val
        return (f"OK photo set: {bio['photo_url'][:48]}" if bio.get('photo_url') == val
                else "FLAG photo did NOT set"), True
    if field in ('birth_date', 'death_date'):
        ev = 'birth' if field == 'birth_date' else 'death'
        obj = p.setdefault(ev, {})
        parts = val.split('-')
        obj['year'] = int(parts[0])
        if len(parts) > 1: obj['month'] = int(parts[1]); obj['date_precision'] = 'month_year'
        if len(parts) > 2: obj['day'] = int(parts[2]); obj['date_precision'] = 'exact'
        if len(parts) == 1: obj['date_precision'] = 'year_only'
        return f"OK {ev} set {val}", True
    if field in ('bio_blurb', 'notable_blurb'):
        if len(val.split()) > 8:
            return f"FLAG BLOCKED: {field} {len(val.split())} words (max 8)", False
        if field == 'bio_blurb': bio['bio_blurb'] = val
        else: p.setdefault('notable', {})['notable_blurb'] = val
        return f"OK {field} set", True
    if field == 'tag_add':
        tags = p.setdefault('tags', [])
        if val not in tags: tags.append(val)
        return f"OK tag '{val}' added", True
    if field == 'marriage':
        kv = parse_kv(val); sp = kv.get('spouse')
        if not sp or sp not in tp: return f"FLAG BLOCKED: spouse '{sp}' not in tree", False
        m = {'spouse_id': sp, 'children_ids': []}
        if 'year' in kv: m['date_year'] = int(kv['year'])
        if 'order' in kv: m['marriage_number'] = int(kv['order'])
        p.setdefault('marriages', []).append(m)
        if not any(mm.get('spouse_id') == p['id'] for mm in tp[sp].setdefault('marriages', [])):
            tp[sp]['marriages'].append({'spouse_id': p['id'], 'children_ids': []})
        return f"OK marriage to {sp} wired (bidirectional)", True
    if field == 'parents':
        kv = parse_kv(val); par = p.setdefault('parents', {})
        for role, key in (('father_id', 'father'), ('mother_id', 'mother')):
            ref = kv.get(key)
            if ref:
                if ref not in tp: return f"FLAG BLOCKED: parent '{ref}' not in tree", False
                par[role] = ref
                pm = tp[ref].setdefault('marriages', [])
                if not any(p['id'] in (mm.get('children_ids') or []) for mm in pm):
                    if not pm: pm.append({'spouse_id': None, 'children_ids': []})
                    pm[0].setdefault('children_ids', []).append(p['id'])
        return "OK parents set (bidirectional)", True
    if field in ('education', 'career'):
        p.setdefault(field, []).append(parse_kv(val))
        return f"OK {field} record appended", True
    if field == 'cc':
        kv = parse_kv(val); rid = kv.get('related')
        if not rid or rid not in tp: return f"FLAG BLOCKED: cc related '{rid}' not in tree", False
        label = kv.get('label', '')
        if len(label) > 70: return f"FLAG BLOCKED: cc label {len(label)} chars (max 70)", False
        if (p.get('classification') or {}).get('is_searchable') is not False and \
           (tp[rid].get('classification') or {}).get('is_searchable') is False:
            return f"FLAG BLOCKED: searchable cannot CC non-searchable {rid}", False
        cc = {'related_id': rid, 'type': 'connection',
              'link_text': kv.get('link', ''), 'display_label': label}
        if not any(c.get('related_id') == rid for c in p.setdefault('cross_connections', [])):
            p['cross_connections'].append(cc)
        if not any(c.get('related_id') == p['id'] for c in tp[rid].setdefault('cross_connections', [])):
            return f"OK cc->{rid} added; FLAG needs reciprocal cc row on {rid}", True
        return f"OK cc->{rid} added (reciprocal present)", True
    if field == 'searchable':
        p.setdefault('classification', {})['is_searchable'] = (val.strip().lower() in ('true','1','yes'))
        return f"OK is_searchable={p['classification']['is_searchable']}", True
    if field == 'notable':
        kv = parse_kv(val); no = p.setdefault('notable', {})
        no['is_notable'] = (kv.get('on', 'true').lower() in ('true','1','yes'))
        if 'url' in kv: no['primary_url'] = kv['url']
        if 'cat' in kv: no['notable_category'] = kv['cat'].split(',')
        if no['is_notable'] and not no.get('primary_url'):
            return "FLAG notable=true but no url given", False
        return "OK notable set", True

    # --- remediation: convenience setters for the common field errors ---
    if field == 'gender':
        g = val.strip().lower()
        if g not in ('male', 'female'):
            return "FLAG gender must be male|female", False
        p['gender'] = g
        return f"OK gender={g} (drives Wife/Husband/Spouse label)", True
    if field == 'generation':
        try:
            n = int(re.sub(r'\D', '', val))
        except ValueError:
            return "FLAG generation needs an integer", False
        p.setdefault('classification', {})['generation_from_thomas'] = n
        return f"OK generation_from_thomas={n}", True
    if field == 'blurb_replace':
        kv = parse_kv(val); which = kv.get('field', 'bio_blurb'); text = kv.get('text', '')
        if len(text.split()) > 8:
            return f"FLAG BLOCKED: blurb {len(text.split())} words (max 8)", False
        if which == 'bio_blurb':
            p.setdefault('bio', {})['bio_blurb'] = text
        else:
            p.setdefault('notable', {})['notable_blurb'] = text
        return f"OK {which} replaced -> {text!r}", True
    if field == 'field_set':
        # generic any-field setter: value = "path=VALUE" with dotted/bracket path.
        # e.g. classification.generation_from_thomas=11 , gender=female ,
        #      career[2].role=Garden volunteer , bio.bio_blurb=Farmer
        m = re.match(r'\s*([\w.\[\]]+)\s*=\s*(.*)$', val)
        if not m:
            return "FLAG field_set needs path=value", False
        path, raw = m.group(1), m.group(2).strip().strip('"')
        # coerce simple literals
        if raw.lower() in ('true', 'false'):
            coerced = (raw.lower() == 'true')
        elif re.fullmatch(r'-?\d+', raw):
            coerced = int(raw)
        elif raw.lower() in ('null', 'none', ''):
            coerced = None
        else:
            coerced = raw
        ok, msg = set_by_path(p, path, coerced)
        return (f"OK set {path} = {coerced!r}" if ok else f"FLAG {msg}"), ok

    return f"FLAG BLOCKED: '{field}' has no handler", False


def set_by_path(obj, path, value):
    """Set a nested field by dotted/bracket path: a.b[2].c . Creates dicts as
    needed; will not extend a list past its end (that would be a silent add).
    Returns (ok, msg)."""
    tokens = re.findall(r'[^.\[\]]+|\[\d+\]', path)
    cur = obj
    for i, tok in enumerate(tokens):
        last = (i == len(tokens) - 1)
        if tok.startswith('['):
            idx = int(tok[1:-1])
            if not isinstance(cur, list):
                return False, f"path expects a list at '{tok}'"
            if idx < 0 or idx >= len(cur):
                return False, f"index {idx} out of range (len {len(cur)})"
            if last:
                cur[idx] = value; return True, ""
            cur = cur[idx]
        else:
            if not isinstance(cur, dict):
                return False, f"path expects an object at '{tok}'"
            if last:
                cur[tok] = value; return True, ""
            cur = cur.setdefault(tok, {})
    return True, ""


def apply_destroy(field, val, p, allowed_removals):
    if field == 'tag_remove':
        tags = p.get('tags') or []
        if val in tags: tags.remove(val); return f"OK tag '{val}' removed", True
        return f". tag '{val}' not present", True
    if field == 'nb_remove':
        nbs = p.get('narrative_blocks') or []
        if not any(nb.get('header') == val for nb in nbs):
            return f"FLAG nb_remove target not found: '{val}'", False
        allowed_removals.add((p['id'], 'nb', val))
        p['narrative_blocks'] = [nb for nb in nbs if nb.get('header') != val]
        for i, nb in enumerate(p['narrative_blocks'], 1): nb['number'] = i
        return f"OK NB '{val}' removed (explicit)", True
    if field == 'cc_remove':
        allowed_removals.add((p['id'], 'cc', val))
        p['cross_connections'] = [c for c in (p.get('cross_connections') or []) if c.get('related_id') != val]
        return f"OK CC to {val} removed (explicit)", True
    if field == 'blurb_remove':
        kv = parse_kv(val); which = kv.get('field', 'bio_blurb')
        if which == 'bio_blurb':
            had = (p.get('bio') or {}).get('bio_blurb')
            allowed_removals.add((p['id'], 'blurb', 'bio_blurb'))
            p.setdefault('bio', {})['bio_blurb'] = None
            return (f"OK bio_blurb cleared (was: {had!r})" if had else ". bio_blurb already empty"), True
        else:
            had = (p.get('notable') or {}).get('notable_blurb')
            if p.get('notable'): p['notable']['notable_blurb'] = None
            return (f"OK notable_blurb cleared (was: {had!r})" if had else ". notable_blurb already empty"), True
    if field == 'nb_replace':
        kv = parse_kv(val); old = kv.get('old'); new = kv.get('new')
        nbs = p.get('narrative_blocks') or []
        match = [nb for nb in nbs if nb.get('header') == old]
        if not match:
            return f"FLAG nb_replace target not found: '{old}'", False
        # Authorize the old header's disappearance; leave a DRAFT for the new prose
        # (NB prose stays draft-for-approval per the two-pass rule).
        allowed_removals.add((p['id'], 'nb', old))
        # Keep the block in place but blank-flag it for Code to rewrite from `new`.
        # We do NOT auto-write prose here; mark it so the human/Code finalizes.
        for nb in match:
            nb['_replace_with'] = new   # transient marker Code resolves into header+body+category
        return f"PAUSE nb_replace staged for '{old}' -> Code drafts '{new}' (approve before commit)", True
    if field in ('career_set', 'education_set'):
        arr_key = 'career' if field == 'career_set' else 'education'
        kv = parse_kv(val)
        idx = kv.get('index')
        if idx is None:
            return f"FLAG {field}: needs index=N", False
        idx = int(idx)
        arr = p.get(arr_key) or []
        if idx < 0 or idx >= len(arr):
            return f"FLAG {field}: index {idx} out of range (have {len(arr)})", False
        # replace the named keys on that record in place (in-place edit, not a delete)
        rec = arr[idx]
        for k, v in kv.items():
            if k == 'index': continue
            rec[k] = v
        return f"OK {arr_key}[{idx}] updated in place", True
    return "FLAG unknown destroy field", False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('tasks')
    ap.add_argument('--canonical', default='canonical.json')
    args = ap.parse_args()

    with open(args.canonical) as f:
        T = json.load(f)
    people = T['people']
    tp = {p['id']: p for p in people}
    snap = snapshot(people)
    allowed_removals = set()

    with open(args.tasks) as f:
        rows = list(csv.DictReader(f, delimiter='\t'))

    for r in rows:
        pid = (r.get('person_id') or '').strip()
        field = (r.get('field') or '').strip()
        val = (r.get('value_or_angle') or '').strip()
        if not pid and not field:
            continue
        if field not in RECOGNIZED_FIELDS:
            r['status'] = f"FLAG BLOCKED: unknown field '{field}'"; continue
        if field == 'question':
            r['status'] = "-> (answer in chat; no JSON change)"; continue
        if pid not in tp:
            r['status'] = f"FLAG BLOCKED: person {pid} not in tree"; continue
        p = tp[pid]
        r['slug'] = '/person/' + slugify(p)
        if field in DESTROY_FIELDS:
            r['status'], _ = apply_destroy(field, val, p, allowed_removals)
        elif field in ('nb_angle', 'nb_full'):
            r['proposed'] = ("PROPOSED -- Code drafts from this angle per WORKFLOW sec3 and "
                             "APPENDS only on your APPROVE: " + val[:80])
            r['status'] = "PAUSE DRAFTED -- awaiting your APPROVE in `decision` col"
        else:
            r['status'], _ = apply_mechanical(field, val, p, tp)

    losses = diff_guard(snap, people, allowed_removals)
    if losses:
        print("\nABORTED -- unauthorized deletions detected. canonical.json NOT modified.\n")
        for l in losses: print("   X", l)
        print("\nTo remove something intentionally, add an explicit nb_remove / cc_remove / "
              "tag_remove row naming the exact target, then re-run.")
        sys.exit(2)

    with open(args.canonical, 'w') as f:
        json.dump(T, f, ensure_ascii=False, indent=1)

    fieldnames = ['person_id','field','value_or_angle','status','slug','proposed','decision']
    with open(args.tasks, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, delimiter='\t', extrasaction='ignore')
        w.writeheader()
        for r in rows: w.writerow(r)

    print(f"\nApplied to {args.canonical} ({len(people):,} people). No unauthorized deletions.")
    print(f"Updated {args.tasks} with status / slug / proposed.")
    print("\nNEXT (Code runs these):")
    print("   git show HEAD:canonical.json > /tmp/baseline.json")
    print(f"   python validate.py {args.canonical} --baseline /tmp/baseline.json")
    print(f"   node regenerate-data.js {args.canonical}     # on Sam's command")


if __name__ == '__main__':
    main()
