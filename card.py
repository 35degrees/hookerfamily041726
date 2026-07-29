#!/usr/bin/env python3
"""card.py — what the CARD actually shows for a person. Read-only; touches nothing.

    python card.py X03821
    python card.py marcella-mittendorf
    python card.py X03821 HD8480 --raw     # --raw also dumps the canonical record

WHY THIS EXISTS. Canonical holds a great many fields the card never renders, and a few
it renders through a different key than the one you wrote (see docs/pipeline-gotchas.md
§ render truth). Verifying a batch by reading canonical.json therefore proves the wrong
thing — it proves the data is stored, not that it is SEEN. This reads the EMITTED payload,
the same file the browser fetches, and prints the card's visible surface.

Run it after regenerate, before telling Sam a batch is ready.
"""
import json, os, sys, re

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'static', 'data')


def load_index():
    with open(os.path.join(DATA, 'search-index.json'), encoding='utf-8') as f:
        rows = json.load(f)
    return {r['id']: r['slug'] for r in rows if r.get('id') and r.get('slug')}


def sentences(t):
    return len([s for s in re.split(r'(?<=[.!?])\s+(?=[A-Z])', (t or '').strip()) if s])


def show(key, idx, raw=False):
    slug = idx.get(key, key)
    path = os.path.join(DATA, 'person', slug + '.json')
    if not os.path.exists(path):
        hidden = key in idx.values() or key in idx
        print(f"\n### {key} — NO PAYLOAD at person/{slug}.json")
        print("    (severed/hidden, never regenerated, or the id is wrong — the URL 404s)"
              if not hidden else "")
        return
    with open(path, encoding='utf-8') as f:
        pay = json.load(f)
    p, nb = pay['person'], pay['person'].get('narrative_blocks') or []
    bio = p.get('bio') or {}
    n = pay['neighborhood']

    print(f"\n{'='*78}\n  {bio.get('display_name')}   [{p['id']}]   /person/{slug}\n{'='*78}")
    blurb = ((p.get('notable') or {}).get('notable_blurb')) or bio.get('bio_blurb')
    which = 'notable_blurb' if (p.get('notable') or {}).get('notable_blurb') else 'bio_blurb'
    print(f"  BLURB   {blurb or '— none —'}"
          + (f"   [{which}, {len(blurb.split())} words]" if blurb else ""))
    print(f"  PHOTO   {'yes' if bio.get('photo_url') else '— none —'}"
          f"    dates private (living): {'YES — no years render' if n['focus'].get('pv') else 'no'}")

    print(f"\n  NARRATIVE BLOCKS ({len(nb)}/6)")
    if not nb:
        print("    — none —")
    for b in nb:
        h, w, c = b.get('header', ''), len(b.get('header', '').split()), len(b.get('header', ''))
        flag = ('  ⚠ >8 words' if w > 8 else '') + ('  ⚠ >50 chars: wraps' if c > 50 else '')
        print(f"    {b.get('number')}. [{b.get('category')}] {h}   ({w}w/{c}c){flag}")
        s = sentences(b.get('body'))
        print(f"       {b.get('body')}")
        print(f"       ({s} sentence(s){'  ⚠ >3' if s > 3 else ''}, {len(b.get('body','').split())} words)")

    def rows(label, items, fmt, cap=3):
        print(f"\n  {label} ({len(items)}" + (f", card shows first {cap}" if len(items) > cap else "") + ")")
        for i, it in enumerate(items or []):
            print(("    " if i < cap else "    ·off-card· ") + fmt(it))
        if not items:
            print("    — none —")

    rows('CAREER', p.get('career') or [],
         lambda c: ', '.join([x for x in [c.get('role'), c.get('organization')] if x])
                   + (f"   {c.get('start_year') or ''}–{c.get('end_year') or ''}"
                      if (c.get('start_year') or c.get('end_year')) else '   (no dates)'))
    rows('EDUCATION', p.get('education') or [],
         lambda e: f"{e.get('institution_name') or e.get('school_name') or '—'}"
                   f"   {e.get('dates') or '(no dates — degree/end_year do NOT render)'}")

    for label, kk in (('LANDMARKS', 'landmarksResolved'), ('ART', 'artworksResolved'),
                      ('DOCUMENTS', 'documentsResolved'), ('STATUES', 'statuesResolved')):
        got = p.get(kk) or []
        if got:
            print(f"\n  {label} ({len(got)})")
            for r in got:
                print(f"    {r.get('name')}  ·  {r.get('typeLabel') or '—'}  ·  {r.get('subtitle') or '—'}"
                      f"   {'[photo]' if r.get('thumbUrl') else '[no photo]'}"
                      f" {'[link]' if r.get('url') else '[no link]'}")

    cem = pay.get('burialCemetery')
    if cem:
        print(f"\n  BURIAL   {cem.get('name')}  ·  {cem.get('city') or ''} {cem.get('state') or ''}"
              f"   {'[map pin]' if cem.get('gps') else '[no gps — no pin]'}")

    ccs = pay.get('crossConnections') or []
    print(f"\n  CROSS-CONNECTIONS ({len(ccs)}" + (", card shows first 6" if len(ccs) > 6 else "") + ")")
    for c in ccs:
        lab = c.get('display_label') or ''
        print(f"    “{c.get('link_text')} {lab}”   [{len(lab)}/70{' ⚠ OVER' if len(lab) > 70 else ''}]"
              f" → {c.get('slug') or '(no page)'}")
    if not ccs:
        print("    — none —")

    sp = n.get('spouses') or []
    print(f"\n  CHIPS   spouses {len(sp)}"
          f" · children {sum(len(s.get('children') or []) for s in sp)}"
          f" · parents {len([x for x in (n.get('parents') or {}).values() if x])}"
          f" · siblings {n.get('siblings_count', 0)}"
          f" · grandchildren {len(n.get('grandchildren') or [])}")
    for s in sp:
        who = (s.get('spouse') or {}).get('n') or '— spouse not rendered (hidden/absent) —'
        print(f"          {s.get('order')}. {who}   {s.get('year') or ''}")

    if raw:
        print("\n  --- canonical record ---")
        with open(os.path.join(ROOT, 'canonical.json'), encoding='utf-8') as f:
            d = json.load(f)
        rec = next((x for x in d['people'] if x['id'] == p['id']), None)
        print(json.dumps(rec, indent=1, ensure_ascii=False))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    raw = '--raw' in sys.argv
    if not args:
        sys.exit(__doc__)
    idx = load_index()
    for a in args:
        show(a, idx, raw)
    print()


if __name__ == '__main__':
    main()
