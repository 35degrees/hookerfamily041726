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
  5. regenerate     — incremental (--only the touched ids, ~1s) unless --full, and forced to
                      full when a touched id is missing from the emitted index (a new person
                      needs the aggregates rebuilt or they will not be searchable).
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
        ids_arg = argv[i + 1]
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
    else:
        say('5 regenerate', 'full rebuild' if full else f'incremental --only {",".join(touched)}')
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
