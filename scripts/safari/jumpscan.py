import os,sys,numpy as np
from PIL import Image
d=sys.argv[1]; fs=sorted(os.listdir(d)); start=int(sys.argv[2]) if len(sys.argv)>2 else 0
def prof(f,y0,y1,x0,x1):
    a=np.asarray(Image.open(f'{d}/{f}').convert('L'),dtype=np.float32); return a[y0:y1,x0:x1].mean(axis=1)
def shift(pa,pb):
    best=None; xi=np.arange(len(pb))
    for s10 in range(-40,41):
        s=s10/10; pbs=np.interp(xi+s,xi,pb); e=((pa[8:-8]-pbs[8:-8])**2).mean()
        if best is None or e<best[0]: best=(e,s)
    return best[1]
R={'landmarks':(630,720,1480,1760),'name':(515,600,640,1060)}
prev={}
for f in fs:
    t=int(f.split('_')[1][:-4])
    if t<start: continue
    out=[]
    for k,r in R.items():
        p=prof(f,*r)
        if k in prev:
            s=shift(prev[k],p)
            if abs(s)>=0.3: out.append(f'{k}:{s:+.1f}')
        prev[k]=p
    if out: print(t,' '.join(out))
