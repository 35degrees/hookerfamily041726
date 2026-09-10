import json, importlib.util
spec=importlib.util.spec_from_file_location('v','validate.py'); v=importlib.util.module_from_spec(spec); spec.loader.exec_module(v)
d=json.load(open('canonical.json')); P={p['id']:p for p in d['people']}
def lab(s):
    assert len(s)<=70 and not s.endswith('.') and (s[0].islower() or s[0]==','),(len(s),s); return s
def nb(cat,header,body):
    assert cat in v.NB_CATEGORY, cat
    assert len(header.split())<=8 and len(header)<=50,(len(header.split()),len(header),header)
    assert v.sentence_count(body)<=3,(v.sentence_count(body),body)
    return {"category":cat,"header":header,"body":body}

n=P['X02860']
n['narrative_blocks']=[
 nb('military',"The only man who volunteered",
   "After the rout on Long Island, Washington needed to know where the British would come ashore on Manhattan and asked Thomas Knowlton to find a man among his Rangers. A French sergeant answered that he would fight the British anywhere but would not go among them to be hung up like a dog. Hale was the only volunteer."),
 nb('military',"A Dutch schoolmaster carrying his own diploma",
   "Ferried across the Sound to Huntington on 12 September 1776, Hale went as a Dutch schoolmaster looking for work. He used no false name and is said to have carried his Yale diploma with his name on it."),
 nb('death',"A stranger drank a health to the Congress",
   "Major Robert Rogers, raising a loyalist ranger corps on Long Island, watched Hale for some days, then changed his clothes, called on him, complained of being stranded among Tories and drank a health to the Congress. Hale told him the whole business. Rogers asked him to dinner the next day, filled the room with men of the same stamp, and had soldiers surround the house."),
 nb('death',"He asked for a Bible and was refused",
   "Taken to General Howe's headquarters at the Beekman house, Hale was questioned and held overnight. He asked for a Bible and was refused, asked later for a clergyman and was refused again, and was hanged by the Dove Tavern at eleven the next morning."),
 nb('legacy',"The one line he probably never said",
   "The sentence everyone knows reaches us through William Hull, who had it from a British officer under a flag of truce the day after. The officer present that morning wrote only that Hale said it was the duty of every good officer to obey his commander, and asked the spectators to be ready for death in whatever shape it came."),
 nb('legacy',"No portrait survives, so sculptors invented him",
   "Not one likeness of Hale made in his lifetime is known, so the square-jawed young man of the statues is an invention: MacMonnies in 1890 and Bela Lyon Pratt in 1912, whose figure now stands at Yale, at the Department of Justice and outside the CIA. A fellow soldier remembered blue eyes, flaxen hair kept short, a piercing voice, and a man who could kick a football over the trees in the Bowery."),
 nb('death',"The grave at Coventry is empty",
   "Hale's body was never recovered. His family raised a stone for him in the burying ground at Coventry that now carries his name, over nothing.")]
for i,b in enumerate(n['narrative_blocks'],1): b['number']=i
print('NBs',len(n['narrative_blocks']),'words',sum(len(b['body'].split()) for b in n['narrative_blocks']))

w=P['X03786']
assert not any(c['related_id']=='X02860' for c in n['cross_connections'])
n['cross_connections'].append({"related_id":"X03786","type":"connection","link_text":"George Washington",
  "display_label":lab("wanted to know where the British would land, and he alone went")})
w['cross_connections'].append({"related_id":"X02860","type":"connection","link_text":"Capt. Nathan Hale",
  "display_label":lab("was the only man who volunteered to go behind the British lines")})
print('  CC X02860<->X03786')
json.dump(d,open('canonical.json','w'),indent=1,ensure_ascii=False)
