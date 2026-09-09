import json, importlib.util
spec=importlib.util.spec_from_file_location('v','validate.py'); v=importlib.util.module_from_spec(spec); spec.loader.exec_module(v)
d=json.load(open('canonical.json')); P={p['id']:p for p in d['people']}
def nb(cat,header,body):
    assert cat in v.NB_CATEGORY, cat
    assert len(header.split())<=8 and len(header)<=50,(len(header.split()),len(header),header)
    assert v.sentence_count(body)<=3, (v.sentence_count(body),body)
    return {"category":cat,"header":header,"body":body}

h=P['H05264']
h['bio']['photo_url']="https://res.cloudinary.com/dc5clrqtw/image/upload/v1788985842/Brian_Hooker_LCCN2014685996__cropped_kectaz.jpg"
h['bio']['chip_first_name']="Brian"
h['death']={"year":1946,"month":12,"day":28,"date_precision":"exact","city":"New London",
            "county":"New London County","state":"Connecticut","country":"United States"}
URL="https://en.wikipedia.org/wiki/Brian_Hooker_(poet)"
for c in ['poetry','literature']: assert c in v.NOTABLE_CATEGORY, c
h['notable']={"is_notable":True,"notable_category":["poetry","literature"],
  "notable_blurb":"Poet, librettist, and translator of Cyrano de Bergerac",
  "primary_url":URL,"primary_url_label":"Wikipedia","notable_url":URL}
h['tags']=['author','yale_graduate']
h['education']=[{"institution_id":"INST022","school_name":"Yale College","dates":"1902",
  "notes":"He wrote for, edited and managed the campus humour magazine, The Yale Record."}]
h['career']=[
 {"role":"Librettist and lyricist","organization":"Broadway","location":None,
  "start_year":1921,"end_year":1934,
  "notes":"June Love, Marjolaine, Our Nell, The Vagabond King, White Eagle and The O'Flynn."},
 {"role":"Librettist","organization":"the operas of Horatio Parker","location":None,
  "start_year":1915,"end_year":None,"notes":"Mona and Fairyland."},
 {"role":"Editor and business manager","organization":"The Yale Record","location":None,
  "start_year":1901,"end_year":None,"notes":"He co-edited the collection Yale Fun in 1901."}]
h['narrative_blocks']=[
 nb('literature',"A friend ordered him to go translate Cyrano",
   "Clayton Hamilton told Hooker to drop whatever he was doing, retire to the country for two months, and make an English Cyrano de Bergerac that Walter Hampden could actually speak. It opened at the National Theatre in October 1923 and ran 232 performances."),
 nb('literature',"He wrote it by the ear, for the ear",
   "Hooker chose blank verse over Rostand's Alexandrine couplets, which would have sounded outlandish from an American stage, and cut nothing and added nothing. Where Cyrano invoked Celadon he put Sir Launcelot, and into the speech about the nose he slipped a phrase of Marlowe's, so an audience would catch it without a footnote."),
 nb('music',"Only a Rose came out of his pen",
   "Hooker wrote the lyrics for Rudolf Friml's 1925 operetta The Vagabond King, among them Only a Rose and Song of the Vagabonds, and co-wrote its book. He had already written the librettos for two Horatio Parker operas, Mona and Fairyland."),
 nb('legacy',"Ferrer and Richardson spoke his lines",
   "For decades his blank verse was the standard English Cyrano on stage, in film and on television, spoken by Jose Ferrer and Ralph Richardson among others. The play came back to Broadway in his version in 1926, 1928, 1932, 1936 and again in 1946."),
 nb('education',"He put poems in Harper's and a novel in print",
   "Hooker's verse ran in Harper's, Scribner's, the Century, McClure's, the Smart Set and the Yale Review, and Yale University Press published his Poems in 1915. He wrote a novel too, The Right Man, in 1908.")]
for i,b in enumerate(h['narrative_blocks'],1): b['number']=i
print('NBs',len(h['narrative_blocks']),'words',sum(len(b['body'].split()) for b in h['narrative_blocks']))

# ---- the artwork ----
assert not any(a['id']=='ART288' for a in d['artworks'])
d['artworks'].append({
 "id":"ART288","title":"Cyrano de Bergerac","type":"book_cover","person_ids":["H05264"],
 "primary_url":"https://www.concordtheatricals.com/p/7516/cyrano-de-bergerac-hooker-trans",
 "primary_url_label":"Concord Theatricals",
 "photo_url":"https://res.cloudinary.com/dc5clrqtw/image/upload/v1788984913/cyrano_s8hylf.png",
 "notes":"Translation (1923)"})
h['artworks']=[{"artwork_id":"ART288","role":"translator","artwork_blurb":"Translation (1923)"}]

# ---- his wife ----
assert 'I03818' not in P
d['people'].append({"id":"I03818","former_ids":[],"is_placeholder":False,
 "bio":{"display_name":"Doris Redfield Cooper Hooker","first_name":"Doris","middle_name":"Redfield",
        "maiden_name":"Cooper","last_name":None,"married_names":["Hooker"],
        "photo_url":None,"nickname":None},
 "gender":"female","birth":{},"death":{},"baptism":{},"burial":{},"residence":{},"parents":{},
 "number_of_marriages":1,
 "marriages":[{"marriage_number":1,"spouse_id":"H05264","spouse_name":None,"children_ids":[]}],
 "classification":{"is_thomas_descendant":False,"is_talcott_descendant":False,"is_thomas_spouse":True,
   "is_talcott_spouse":False,"is_easter_egg":False,"is_searchable":True,
   "include_in_path_calculation":False,"descent_from_thomas_hooker":False,
   "descent_from_john_talcott":False,"generation_from_thomas":None,"generation_from_john_talcott":None},
 "notable":{"is_notable":False,"notable_category":[],"notable_blurb":None,"primary_url":None,
            "primary_url_label":None,"notable_url":None},
 "education":[],"career":[],"military_service":[],"institutions":[],"landmarks":[],
 "naming_inspiration":[],"artworks":[],"tags":[],"research_tags":[],"cross_connections":[],
 "narrative_blocks":[],"quotes":[],"sources":[],"research_sources":[],"documents":[],
 "research_notes":None})
h['marriages']=[{"marriage_number":1,"spouse_id":"I03818","spouse_name":None,"children_ids":[]}]
h['number_of_marriages']=1

json.dump(d,open('canonical.json','w'),indent=1,ensure_ascii=False)
print('ok')
