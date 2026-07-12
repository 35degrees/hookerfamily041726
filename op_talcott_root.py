#!/usr/bin/env python3
"""One-off, Sam-authorized data op: delete the Talcott grandfather trio (T00001 +
his two spouses), heal T00002 to a top ancestor, wire redirects, and add Anne
Skinner's dates. Deterministic read/modify/write (never a blind text edit)."""
import json
PATH = 'canonical.json'
DELETE = {'T00001', 'X01723', 'X01724'}
T = json.load(open(PATH))
tp = {p['id']: p for p in T['people']}

# safety: confirm no children_ids / external refs to the trio beyond T00002's parents
ext = []
for p in T['people']:
    if p['id'] in DELETE:
        continue
    for m in (p.get('marriages') or []):
        if set(m.get('children_ids') or []) & DELETE:
            ext.append((p['id'], 'children_ids'))
    par = p.get('parents') or {}
    if (par.get('father_id') in DELETE or par.get('mother_id') in DELETE) and p['id'] != 'T00002':
        ext.append((p['id'], 'parents'))
    for cc in (p.get('cross_connections') or []):
        if cc.get('related_id') in DELETE:
            ext.append((p['id'], 'cc'))
assert not ext, f"UNEXPECTED refs to trio: {ext}"

before = len(T['people'])
T['people'] = [p for p in T['people'] if p['id'] not in DELETE]

# heal: T00002 becomes the top ancestor (parents null by design)
tp['T00002']['parents'] = {'father_id': None, 'mother_id': None}

# redirects: the three deleted ids -> T00011 (regenerate emits id->slug from merged_ids)
t11 = tp['T00011']
merged = t11.get('merged_ids') or []
for d in ['T00001', 'X01723', 'X01724']:
    if d not in merged:
        merged.append(d)
t11['merged_ids'] = merged

# Anne Skinner (X01725): birth ~1573 (circa) Braintree/Essex; death exact 1637-04-06 Felsted/Essex
anne = tp['X01725']
anne.setdefault('birth', {}).update({
    'year': 1573, 'city': 'Braintree', 'county': 'Essex', 'country': 'England',
    'date_precision': 'approximate', 'approximate': True
})
anne.setdefault('death', {}).update({
    'year': 1637, 'month': 4, 'day': 6, 'city': 'Felsted', 'county': 'Essex', 'country': 'England',
    'date_precision': 'exact'
})

json.dump(T, open(PATH, 'w'), ensure_ascii=False, indent=1)
print(f"deleted {before - len(T['people'])} records (T00001,X01723,X01724)")
print(f"T00002 parents -> {tp['T00002']['parents']}")
print(f"T00011 merged_ids -> {merged}")
print(f"Anne X01725 birth -> {anne['birth']}")
print(f"Anne X01725 death -> {anne['death']}")
