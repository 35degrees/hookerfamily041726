#!/usr/bin/env python3
"""
derive_generations.py  --  recompute generation_from_thomas TOP-DOWN from the root
==================================================================================
generation_from_thomas is a DERIVED field, never hand-entered. A descendant's
generation is their Hooker-descendant parent's generation + 1. This tool computes
it for the whole tree by walking DOWN from Thomas Hooker (gen 1), so every value
is consistent with the verified chain above it — a local wrong number cannot
propagate, because every generation is recomputed from the root each run.

WHY TOP-DOWN, NOT PATCH-THE-DIFFS:
  Patching individual mismatches against a parent is unsafe: if a parent's stored
  generation is itself wrong, "correcting" the child to match spreads the error.
  Deriving from Thomas downward makes the whole tree internally consistent and
  removes any dependence on existing (possibly wrong) stored values.

SAFETY: DRY-RUN BY DEFAULT.
  Default = report only. Shows every value it WOULD change (before -> after),
  flags dual-line conflicts for human decision, writes NOTHING. Only --apply
  writes, and even then it refuses to run if conflicts are unresolved unless
  --resolve is given.

Usage:
    python derive_generations.py canonical.json                 # DRY RUN (writes nothing)
    python derive_generations.py canonical.json --apply         # write (aborts on conflicts)
    python derive_generations.py canonical.json --apply --resolve father   # conflicts -> father's line
    python derive_generations.py canonical.json --root H00001 --root-gen 1  # set the root explicitly

Dual-line conflict = a person with two Hooker-descendant parents whose generations
differ (e.g. father gen 10, mother gen 9). The genealogically-correct generation
depends on which line is canonical for that person — a JUDGMENT call, so the tool
FLAGS these and (without --resolve) leaves them for you rather than guessing.
"""

import json, sys, argparse
from collections import deque, defaultdict


def find_root(people, tp):
    """Thomas Hooker = the gen-1 Thomas descendant with no Hooker-descendant parent.
    Prefer an explicit gen==1; fall back to the descendant with the lowest stored gen."""
    candidates = [p for p in people
                  if (p.get('classification') or {}).get('is_thomas_descendant')
                  and (p.get('classification') or {}).get('generation_from_thomas') == 1]
    if candidates:
        return candidates[0]['id']
    # fallback: lowest stored generation among descendants
    desc = [p for p in people if (p.get('classification') or {}).get('is_thomas_descendant')
            and (p.get('classification') or {}).get('generation_from_thomas') is not None]
    if not desc:
        return None
    return min(desc, key=lambda p: p['classification']['generation_from_thomas'])['id']


def children_of(p, tp):
    out = []
    for m in (p.get('marriages') or []):
        for cid in (m.get('children_ids') or []):
            if cid in tp:
                out.append(cid)
    return out


def hooker_parents(p, tp):
    """Hooker-descendant parents (id, role)."""
    par = p.get('parents') or {}
    out = []
    for role in ('father_id', 'mother_id'):
        pid = par.get(role)
        if pid and pid in tp and (tp[pid].get('classification') or {}).get('is_thomas_descendant'):
            out.append((role, pid))
    return out


def derive(path, root_id, root_gen, resolve):
    T = json.load(open(path))
    people = T['people']
    tp = {p['id']: p for p in people}

    if root_id is None:
        root_id = find_root(people, tp)
        if root_id is None:
            print("Could not identify the root (Thomas). Pass --root <id> --root-gen 1.")
            sys.exit(1)

    root_name = (tp[root_id].get('bio') or {}).get('display_name')
    print(f"Root: {root_id} ({root_name}) = generation {root_gen}\n")

    # BFS down from the root, assigning generation = parent_gen + 1.
    derived = {root_id: root_gen}
    conflicts = []   # (child_id, name, {role: gen})
    q = deque([root_id])
    # we may reach a child via multiple parents; track the set of implied gens
    implied = defaultdict(set)
    implied[root_id].add(root_gen)

    # Build the descent graph level by level. A child's generation is parent+1;
    # if two Hooker parents imply different gens, that's a conflict.
    seen = set()
    order = deque([root_id])
    while order:
        pid = order.popleft()
        if pid in seen:
            continue
        seen.add(pid)
        pgen = min(implied[pid])  # parent's settled generation
        for cid in children_of(tp[pid], tp):
            # only assign generation to Hooker descendants
            if not (tp[cid].get('classification') or {}).get('is_thomas_descendant'):
                continue
            implied[cid].add(pgen + 1)
            order.append(cid)

    # Resolve generations + collect conflicts
    new_gen = {}
    for pid, gens in implied.items():
        if len(gens) == 1:
            new_gen[pid] = next(iter(gens))
        else:
            # dual-line conflict: pick per --resolve, else flag and skip
            name = (tp[pid].get('bio') or {}).get('display_name')
            hp = hooker_parents(tp[pid], tp)
            rolegens = {}
            for role, parid in hp:
                pg = min(implied.get(parid, {tp[parid].get('classification',{}).get('generation_from_thomas')}))
                if pg is not None:
                    rolegens[role.replace('_id','')] = pg + 1
            conflicts.append((pid, name, rolegens))
            if resolve == 'father' and 'father' in rolegens:
                new_gen[pid] = rolegens['father']
            elif resolve == 'mother' and 'mother' in rolegens:
                new_gen[pid] = rolegens['mother']
            elif resolve == 'lowest':
                new_gen[pid] = min(gens)
            # else: leave unresolved (no assignment)

    # Diff against stored
    changes = []
    for pid, g in new_gen.items():
        cur = (tp[pid].get('classification') or {}).get('generation_from_thomas')
        if cur != g:
            changes.append((pid, (tp[pid].get('bio') or {}).get('display_name'), cur, g))

    return T, tp, new_gen, changes, conflicts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('path')
    ap.add_argument('--apply', action='store_true', help='write changes (default is dry-run)')
    ap.add_argument('--resolve', choices=['father', 'mother', 'lowest'],
                    help='how to settle dual-line conflicts (default: flag and skip)')
    ap.add_argument('--root', default=None, help='root person id (default: auto-detect Thomas)')
    ap.add_argument('--root-gen', type=int, default=1)
    args = ap.parse_args()

    T, tp, new_gen, changes, conflicts = derive(args.path, args.root, args.root_gen, args.resolve)

    print(f"=== DERIVATION RESULT ({'APPLY' if args.apply else 'DRY RUN — nothing written'}) ===\n")
    print(f"Descendants reached from root: {len(new_gen):,}")
    print(f"Generations that would CHANGE: {len(changes)}")
    print(f"Dual-line conflicts: {len(conflicts)}\n")

    if changes:
        print("CHANGES (id, name, stored -> derived):")
        for pid, name, cur, g in sorted(changes, key=lambda x: (x[2] is not None, x[0]))[:80]:
            tag = "  [was null]" if cur is None else ""
            print(f"  {pid} {str(name)[:30]:32} {cur} -> {g}{tag}")
        if len(changes) > 80:
            print(f"  ... and {len(changes)-80} more")
        print()

    if conflicts:
        print("DUAL-LINE CONFLICTS (need your decision — which line is canonical):")
        for pid, name, rolegens in conflicts:
            settled = new_gen.get(pid, "UNRESOLVED")
            print(f"  {pid} {str(name)[:30]:32} {rolegens}  -> {settled}")
        print()

    if not args.apply:
        print("DRY RUN — no file written. Re-run with --apply to write.")
        if conflicts and not args.resolve:
            print("(Conflicts are flagged but unresolved; --apply will skip them unless you pass --resolve.)")
        return

    # APPLY guard: refuse if there are unresolved conflicts and no --resolve
    if conflicts and not args.resolve:
        print("🛑 REFUSING TO WRITE: dual-line conflicts are unresolved.")
        print("   Either resolve them by hand (set those few via a task row) or re-run with")
        print("   --resolve father|mother|lowest to settle them in bulk.")
        sys.exit(2)

    for pid, g in new_gen.items():
        tp[pid].setdefault('classification', {})['generation_from_thomas'] = g
    with open(args.path, 'w') as f:
        json.dump(T, f, ensure_ascii=False, indent=1)
    print(f"✓ Wrote {args.path}: {len(changes)} generations corrected"
          + (f", {len([c for c in conflicts])} conflicts resolved via --resolve {args.resolve}." if args.resolve else "."))
    print("Now: validate.py --baseline, regenerate, review, commit.")


if __name__ == '__main__':
    main()
