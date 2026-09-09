import json, importlib.util, re
spec=importlib.util.spec_from_file_location('v','validate.py'); v=importlib.util.module_from_spec(spec); spec.loader.exec_module(v)
d=json.load(open('canonical.json')); P={p['id']:p for p in d['people']}
IDS="""HD1935 H00924 X00635 X03487 X00636 HD8000 HD11135 HD11136 HD11137 I03813
HD11119 HD11123 HD11124 HD11125 HD11126 HD11127 HD11128 HD11129 HD11130 HD11131 HD11132
HD11133 HD11134 I03808 I03810 I03811 I03812 I03814 HD11138 HD11139 HD11140 I03815 I03816
I03817 X03514 HD10336 HD5928 H05264 HD2502 HD3148 X02256 HD3150 X02321 I01316 HD5589
HD11118 I03490 HD3754 HD1844 HD10484 X04003 X04005 HD7861 HD7941 X03991 I00302""".split()
bad=re.compile(r"\b(powerful|famous|famously|legendary|celebrated|renowned|distinguished|iconic|very|beloved|remarkabl\w*|his own|her own|their own)\b",re.I)
issues=[]
for i in IDS:
    p=P.get(i)
    if not p: issues.append(f"{i}: MISSING"); continue
    b=p.get('bio',{}); c=p.get('classification',{}); no=p.get('notable') or {}
    # blurbs
    for k,txt in (('bio_blurb',b.get('bio_blurb')),('notable_blurb',no.get('notable_blurb'))):
        if txt:
            if len(txt.split())>8: issues.append(f"{i}: {k} {len(txt.split())} words")
            if bad.search(txt): issues.append(f"{i}: {k} judgment word :: {txt}")
            if txt.rstrip().endswith('.'): issues.append(f"{i}: {k} ends with period")
    if no.get('is_notable') and not no.get('notable_url'): issues.append(f"{i}: notable with no url")
    if no.get('is_notable') and not no.get('notable_blurb'): issues.append(f"{i}: notable with no blurb")
    # tags
    for t in p.get('tags') or []:
        if t not in v.CANONICAL_TAGS: issues.append(f"{i}: non-canonical tag {t!r}")
    # NBs
    words=0
    for n in p.get('narrative_blocks') or []:
        h=n.get('header',''); body=n.get('body',''); words+=len(body.split())
        if n.get('category') not in v.NB_CATEGORY: issues.append(f"{i}: NB bad category {n.get('category')}")
        if len(h.split())>8 or len(h)>50: issues.append(f"{i}: NB header {len(h.split())}w/{len(h)}c :: {h}")
        if v.sentence_count(body)>3: issues.append(f"{i}: NB {v.sentence_count(body)} sentences :: {h}")
        if bad.search(h+' '+body): issues.append(f"{i}: NB judgment/own word :: {h}")
    if len(p.get('narrative_blocks') or [])>7: issues.append(f"{i}: {len(p['narrative_blocks'])} NBs > 7")
    if words>250: issues.append(f"{i}: NB body words {words} > 250")
    # CCs
    for x in p.get('cross_connations') or []: pass
    for x in p.get('cross_connections') or []:
        L=x.get('display_label') or ''
        r=x.get('related_id')
        if len(L)>70: issues.append(f"{i}: CC {len(L)} chars :: {L}")
        if L.rstrip().endswith('.'): issues.append(f"{i}: CC terminal period :: {L}")
        if L and not (L[0].islower() or L[0]==','): issues.append(f"{i}: CC capital opener :: {L}")
        if r not in P: issues.append(f"{i}: CC dangling {r}"); continue
        back=[y for y in P[r].get('cross_connections') or [] if y.get('related_id')==i]
        if not back: issues.append(f"{i}: CC to {r} NOT reciprocal")
        if not P[r]['classification'].get('is_searchable'): issues.append(f"{i}: CC to NON-SEARCHABLE {r}")
    # education dupes
    names=[ (e.get('school_name') or e.get('institution_id')) for e in p.get('education') or []]
    dup=[n for n in set(names) if n and names.count(n)>1]
    if dup: issues.append(f"{i}: duplicate education rows {dup}")
    # career shape
    for cr in p.get('career') or []:
        if 'role' not in cr and 'title' in cr: issues.append(f"{i}: career uses DEAD title/dates shape")
    # new-person hygiene
    if c.get('is_thomas_descendant') and c.get('generation_from_thomas') is None:
        issues.append(f"{i}: thomas descendant with NO generation_from_thomas")
    if not c.get('is_searchable'): issues.append(f"{i}: not searchable")
print(f"AUDITED {len(IDS)} records — {len(issues)} issues")
for x in issues: print(' *',x)
