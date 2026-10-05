import os,sys,numpy as np
from PIL import Image
def series(name):
    d=f'{name}f'; fs=sorted(os.listdir(d))
    last=np.asarray(Image.open(f'{d}/{fs[-1]}').convert('RGB'),dtype=np.int16)
    # card bg colour: sample the final card interior, around the area right of the portrait column
    reg=last[150:330,250:600].reshape(-1,3)
    vals,counts=np.unique(reg,axis=0,return_counts=True); bg=vals[counts.argmax()]
    out=[]
    for f in fs:
        a=np.asarray(Image.open(f'{d}/{f}').convert('RGB'),dtype=np.int16)[60:420,100:760]
        m=(np.abs(a-bg).sum(axis=2)<=6)
        cols=np.where(m.sum(axis=0)>8)[0]
        w=0
        if len(cols):
            # largest contiguous run of columns
            runs=np.split(cols,np.where(np.diff(cols)>6)[0]+1); w=max(r[-1]-r[0] for r in runs)
        out.append((int(f.split('_')[1][:-4]),int(w)))
    return bg,out
for n in sys.argv[1:]:
    bg,s=series(n); W=s[-1][1]
    # flight window: from last frame where width < 35% of final until width >= 99%
    idx=[i for i,(t,w) in enumerate(s) if w>=0.99*W]; end=idx[0] if idx else len(s)-1
    st=max(0,end-22); seq=[(t,round(w/W*100)) for t,w in s[st:end+1]]
    print(n,'bg',bg.tolist(),'W',W); print('  ',' '.join(f'{t}:{p}' for t,p in seq))
