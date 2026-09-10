"""hk.py — batch helpers for Stream A hand-edits.

Import this instead of re-writing the scaffold each batch:
    import hk; d,P = hk.load()
    ...build...
    hk.save(d)          # refuses to write if any nb()/lab() failed

The point: nb() and lab() COLLECT every violation instead of raising on the
first one, so a batch reports all its over-length headers in one pass.
"""
import json, importlib.util

_spec = importlib.util.spec_from_file_location('v', 'validate.py')
v = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(v)

ERRORS = []

def load(path='canonical.json'):
    d = json.load(open(path))
    return d, {p['id']: p for p in d['people']}

def lab(s):
    """CC display_label: <=70 chars, no terminal period, lowercase or comma opener."""
    if len(s) > 70:            ERRORS.append(f"LABEL {len(s)}c: {s}")
    elif s.endswith('.'):      ERRORS.append(f"LABEL terminal period: {s}")
    elif not (s[0].islower() or s[0] == ','): ERRORS.append(f"LABEL uppercase open: {s}")
    return s

def nb(cat, header, body):
    """NB: category in enum, header <=8 words AND <=50 chars, body <=3 sentences."""
    if cat not in v.NB_CATEGORY:                ERRORS.append(f"NB category '{cat}'")
    if len(header.split()) > 8 or len(header) > 50:
        ERRORS.append(f"NB header {len(header.split())}w/{len(header)}c: {header}")
    n = v.sentence_count(body)
    if n > 3:                                   ERRORS.append(f"NB {n} sentences: {header}")
    return {"category": cat, "header": header, "body": body}

def setnbs(P, pid, *blocks):
    for i, b in enumerate(blocks, 1): b['number'] = i
    P[pid]['narrative_blocks'] = list(blocks)

def addnbs(P, pid, *blocks):
    cur = (P[pid].get('narrative_blocks') or []) + list(blocks)
    for i, b in enumerate(cur, 1): b['number'] = i
    P[pid]['narrative_blocks'] = cur

def dt(y=None, m=None, dd=None, city=None, county=None, state=None,
       country="United States", prec=None):
    o = {}
    if y: o['year'] = y
    if m: o['month'] = m
    if dd: o['day'] = dd
    if y: o['date_precision'] = prec or ('exact' if (m and dd) else 'year_only')
    if city: o['city'] = city
    if county: o['county'] = county
    if state: o['state'] = state
    if y or city: o['country'] = country
    return o

def cc(P, a, b, link_text, label, gap=None, lateral=False):
    e = {"related_id": b, "link_text": link_text, "display_label": lab(label)}
    if gap is not None: e['lineal_gap'] = gap
    if lateral: e['lateral'] = True
    P[a].setdefault('cross_connections', []).append(e)

def marry(P, a, b, n=1, kids=None, **kw):
    kids = list(kids or [])
    P[a]['marriages'].append({"marriage_number": n, "spouse_id": b, "children_ids": kids, **kw})
    P[b]['marriages'].append({"marriage_number": 1, "spouse_id": a, "children_ids": list(kids), **kw})
    P[a]['number_of_marriages'] = len(P[a]['marriages'])
    P[b]['number_of_marriages'] = len(P[b]['marriages'])

def person(P, d, pid, display, first, last, gender, middle=None, maiden=None, married=None,
           suffix=None, birth=None, death=None, gen=None, inlaw=False, living=False,
           father=None, mother=None, blurb=None, photo=None, nickname=None, notes=None,
           burial=None, tags=None):
    assert pid not in P, f"id already exists: {pid}"
    p = {"id": pid, "former_ids": [], "is_placeholder": False,
     "bio": {"display_name": display, "first_name": first, "middle_name": middle,
             "maiden_name": maiden, "last_name": last, "married_names": married or [],
             "photo_url": photo, "nickname": nickname,
             **({"suffix": suffix} if suffix else {}),
             **({"bio_blurb": blurb} if blurb else {})},
     "gender": gender, "birth": birth or {}, "death": death or {}, "baptism": {},
     "burial": burial or {}, "residence": {},
     "parents": ({"father_id": father, "mother_id": mother} if (father or mother) else {}),
     "number_of_marriages": 0, "marriages": [],
     "classification": {"is_thomas_descendant": not inlaw, "is_talcott_descendant": False,
        "is_thomas_spouse": inlaw, "is_talcott_spouse": False, "is_easter_egg": False,
        "is_searchable": True, "include_in_path_calculation": not inlaw,
        "descent_from_thomas_hooker": not inlaw, "descent_from_john_talcott": False,
        "generation_from_thomas": (None if inlaw else gen), "generation_from_john_talcott": None},
     "notable": {"is_notable": False, "notable_category": [], "notable_blurb": None,
        "primary_url": None, "primary_url_label": None, "notable_url": None},
     "education": [], "career": [], "military_service": [], "institutions": [], "landmarks": [],
     "naming_inspiration": [], "artworks": [], "tags": tags or [], "research_tags": [],
     "cross_connections": [], "narrative_blocks": [], "quotes": [], "sources": [],
     "research_sources": [], "documents": [], "research_notes": notes, "is_living": living}
    P[pid] = p; d['people'].append(p); return p

def save(d, path='canonical.json'):
    if ERRORS:
        print(f"REFUSED TO WRITE — {len(ERRORS)} violation(s):")
        for e in ERRORS: print("  ·", e)
        raise SystemExit(1)
    json.dump(d, open(path, 'w'), indent=1, ensure_ascii=False)
    print(f"written: {len(d['people'])} people")
