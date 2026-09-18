#!/usr/bin/env python3
"""batch.py — the whole Stream-A loop in one command.

    python3 batch.py tasks.csv                          # sheet batch
    python3 batch.py --ids X03821,HD8480                # hand-edited canonical, same checks
    python3 batch.py tasks.csv --full                   # full rebuild (aggregates too)
    python3 batch.py --ids X03821 --commit "what this batch did"

WHAT IT DOES, in the order CLAUDE.md requires:
  1. revert point   — commits canonical.json if it is dirty AND we are about to run a sheet
                      (in --ids mode the edit is already in the tree, so HEAD IS the revert point
                      and committing first would destroy it).
  2. process        — process_tasks.py on the sheet, echoing the status column.
  3. baseline       — git show HEAD:canonical.json.
  4. validate       — validate.py --since, which reports ONLY what this batch introduced.
                      ANY new error or silent loss STOPS here: nothing is regenerated,
                      nothing is committed, and canonical is left in the tree for `git checkout`.
  5. regenerate     — incremental (--only the touched ids, ~1s) ONLY when the batch changed
                      nothing that another page bakes a copy of; forced to full for a new
                      person, for any edit to a baked surface (photo, name, dates, flags,
                      blurb, career, CCs...), and for any top-level registry edit.
  6. verify + report— card.py on every touched person: the card's VISIBLE surface, plus the
                      review URLs.
  7. commit         — only with --commit, and only when step 4 was clean.

Full rebuild before push/deploy regardless: --only leaves aggregates and relatives' cards stale.
"""
import csv, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
BASELINE = '/tmp/hooker-batch-baseline.json'
ID_RE = re.compile(r'^(H|HD|I|X|U|T|TD|Y)\d{4,5}$')


def sh(cmd):
    return subprocess.run(cmd, shell=isinstance(cmd, str), cwd=ROOT, text=True,
                          capture_output=True)


def say(step, msg):
    print(f"\n\033[1m── {step} ──\033[0m {msg}")


def ids_from_sheet(path):
    out = []
    with open(path, newline='', encoding='utf-8') as f:
        delim = ',' if path.endswith('.csv') else '\t'
        for r in csv.DictReader(f, delimiter=delim):
            for cell in (r.get('person_id'), r.get('proposed')):
                for tok in re.findall(r'\b[A-Z]{1,2}\d{4,5}\b', cell or ''):
                    if ID_RE.match(tok) and tok not in out:
                        out.append(tok)
    return out


# ── WHEN IS `--only` ACTUALLY SAFE? ────────────────────────────────────────────────────────────
# `--only` rebuilds the listed people's own page payloads and SKIPS every aggregate
# (search-index, people.json, redirects, notables, table-index, cemeteries, institutions, stats).
# It also leaves every OTHER page that BAKES A COPY of a touched person stale — personPayload()
# embeds neighbours through compact() (name, photo, dates, flags, chip names, seat) and embeds
# relatives' whole client records in `context`.
#
# The old rule only forced a full rebuild for an id missing from the emitted index — i.e. for a
# NEW person. That never fired for an EDIT, so adding a photo_url to an existing person wrote it
# to their own payload and left their children's parent-chips serving the old copy: the portrait
# appears on the hero card and is missing from the chip. (Hit 091726 on Bela and Mary Kellogg;
# `card.py` cannot see it, because card.py reads the person's OWN payload — the one that is fresh.)
#
# So decide from the DIFF instead. These keys are the only ones that touch neither an aggregate
# nor anyone else's baked copy, so a change confined to them is safe to do incrementally:
#   narrative_blocks — the person's own card only; NOT in the search index (see v25 §12.1)
#   documents/videos/artworks/statues — resolved onto the owner's card only, not indexed
#   research_* / quotes / naming_inspiration — stripped at emit or dead fields
#   last_updated / has_descendants_documented / number_of_marriages — never emitted
# Everything else — bio, birth, death, gender, classification, parents, marriages, tags, career,
# education, military_service, burial, residence, institutions, landmarks, notable, blurbs,
# cross_connections, former_ids — reaches an aggregate or a neighbour's copy. Full rebuild.
INCREMENTAL_SAFE_KEYS = {
    'narrative_blocks', 'research_notes', 'research_sources', 'research_tags', 'quotes',
    'documents', 'videos', 'artworks', 'statues', 'naming_inspiration',
    'last_updated', 'has_descendants_documented', 'number_of_marriages',
}


def _surface(person):
    """The part of a record that other pages and the aggregates can see."""
    return {k: v for k, v in person.items() if k not in INCREMENTAL_SAFE_KEYS}


def full_rebuild_reason(touched, baseline_path):
    """None if `--only` is safe for this batch, else a short human reason why it is not."""
    try:
        base = json.load(open(baseline_path, encoding='utf-8'))
        cur = json.load(open(os.path.join(ROOT, 'canonical.json'), encoding='utf-8'))
    except Exception as e:
        return f'could not diff against the baseline ({e})'
    b = {p['id']: p for p in base.get('people', [])}
    c = {p['id']: p for p in cur.get('people', [])}
    changed = [i for i in touched
               if i in b and i in c and _surface(b[i]) != _surface(c[i])]
    if changed:
        shown = ', '.join(changed[:6]) + (f' +{len(changed) - 6} more' if len(changed) > 6 else '')
        return (f'{len(changed)} touched record(s) changed a surface other pages bake a copy of '
                f'({shown}) — their relatives\' chips and the aggregates would stay stale')
    # Top-level registries are emitted as whole files (cemeteries.json / institutions.json) or
    # resolved into every card that references them, so any edit there invalidates the build.
    for key in ('cemeteries', 'institutions', 'landmarks', 'artworks', 'documents', 'videos',
                'statues', 'wars'):
        if base.get(key) != cur.get(key):
            return f'the {key} registry changed — it is emitted whole, not per person'
    return None


def main():
    argv = sys.argv[1:]
    if not argv:
        sys.exit(__doc__)
    full = '--full' in argv
    commit_msg = None
    if '--commit' in argv:
        i = argv.index('--commit')
        commit_msg = argv[i + 1] if len(argv) > i + 1 else None
        if not commit_msg:
            sys.exit('--commit needs a message')
    ids_arg = None
    if '--ids' in argv:
        i = argv.index('--ids')
        # Accept BOTH spellings: --ids A,B,C and --ids A B C. It took only argv[i+1] before, so a
        # space-separated list silently became its FIRST id — the regenerate scope and the card.py
        # verification both shrank to one person without saying so. Caught 091826, when ten newly
        # created Bills were left out of static/data because the lone id it kept needed no rebuild.
        rest = []
        for a in argv[i + 1:]:
            if a.startswith('--') or a.endswith(('.csv', '.tsv')):
                break
            rest.append(a)
        ids_arg = ','.join(x for a in rest for x in a.split(',') if x)
    sheet = next((a for a in argv if a.endswith(('.csv', '.tsv'))), None)

    if not sheet and not ids_arg:
        sys.exit('give a sheet (tasks.csv) or --ids X00001,X00002')

    # 1 ── revert point
    dirty = bool(sh('git status --porcelain canonical.json').stdout.strip())
    if sheet:
        if dirty:
            say('1 revert point', 'canonical.json is dirty — committing it as the pre-batch snapshot')
            sh('git add -A && git commit -q -m "pre-batch snapshot"')
        else:
            say('1 revert point', f'tree clean; HEAD is the revert point')
    else:
        say('1 revert point', 'hand-edit mode — HEAD is the revert point, not committing over it'
            + ('' if dirty else '  ⚠ canonical.json is NOT dirty; is the edit actually applied?'))

    # 2 ── process
    touched = list(ids_arg.split(',')) if ids_arg else []
    if sheet:
        say('2 process', f'process_tasks.py {sheet}')
        r = sh(['python3', 'process_tasks.py', sheet])
        print(r.stdout.strip()[-2000:] or r.stderr.strip()[-2000:])
        if r.returncode != 0:
            sys.exit('process_tasks.py failed — nothing further run')
        for i in ids_from_sheet(sheet):
            if i not in touched:
                touched.append(i)
        with open(os.path.join(ROOT, sheet), newline='', encoding='utf-8') as f:
            delim = ',' if sheet.endswith('.csv') else '\t'
            for row in csv.DictReader(f, delimiter=delim):
                if row.get('status'):
                    print(f"   {row.get('person_id',''):<8} {row.get('field',''):<14} {row['status']}")

    # 3 ── baseline
    say('3 baseline', 'git show HEAD:canonical.json')
    with open(BASELINE, 'w', encoding='utf-8') as f:
        f.write(sh('git show HEAD:canonical.json').stdout)

    # 4 ── validate the DELTA
    say('4 validate', 'validate.py --since (only what this batch introduced)')
    v = sh(['python3', 'validate.py', 'canonical.json', '--since', BASELINE])
    print(v.stdout.strip())
    if v.returncode != 0:
        print("\n\033[1mSTOPPED.\033[0m Nothing regenerated, nothing committed."
              "\nRevert with:  git checkout canonical.json")
        sys.exit(1)

    # 5 ── regenerate
    idx = {}
    p = os.path.join(ROOT, 'static/data/search-index.json')
    if os.path.exists(p):
        idx = {r['id']: r['slug'] for r in json.load(open(p, encoding='utf-8'))}
    unseen = [i for i in touched if i not in idx]
    if unseen and not full:
        full = True
        say('5 regenerate', f'FULL rebuild forced — {unseen} not in the emitted index (new people '
                            f'need the aggregates)')
    elif not full:
        # An EDIT can be just as unsafe as a new person: see full_rebuild_reason above.
        why = full_rebuild_reason(touched, BASELINE)
        if why:
            full = True
            say('5 regenerate', f'FULL rebuild forced — {why}')
        else:
            say('5 regenerate', f'incremental --only {",".join(touched)} '
                                f'(changes confined to own-card-only fields)')
    else:
        say('5 regenerate', 'full rebuild')
    cmd = ['node', 'regenerate-data.js', 'canonical.json'] + ([] if full else ['--only', ','.join(touched)])
    g = sh(cmd)
    print('\n'.join(g.stdout.strip().splitlines()[-4:]) or g.stderr[-800:])
    if g.returncode != 0:
        sys.exit('regenerate failed')

    # 6 ── verify + report
    say('6 verify', 'card.py — the visible surface of every touched card')
    c = sh(['python3', 'card.py'] + touched)
    print(c.stdout)
    idx = {r['id']: r['slug'] for r in json.load(open(p, encoding='utf-8'))} if os.path.exists(p) else idx
    print("\033[1mREVIEW LINKS\033[0m")
    for i in touched:
        s = idx.get(i)
        print(f"   {i:<8} " + (f"http://localhost:5173/person/{s}" if s
                               else "— no payload (hidden, or not emitted) —"))

    # 7 ── commit
    if commit_msg:
        say('7 commit', commit_msg)
        sh(['git', 'add', '-A'])
        sh(['git', 'commit', '-q', '-m', commit_msg])
        print('   ' + sh('git log --oneline -1').stdout.strip())
    else:
        print("\n(not committed — rerun with --commit \"message\", or after Sam's review)")


if __name__ == '__main__':
    main()
