import os,sys,numpy as np
from PIL import Image
d=sys.argv[1]; t0=int(sys.argv[2]); t1=int(sys.argv[3]); fs=sorted(os.listdir(d))
def prof(f,y0,y1,x0,x1):
    a=np.asarray(Image.open(f'{d}/{f}').convert('L'),dtype=np.float32); return a[y0:y1,x0:x1].mean(axis=1)
def shift(pa,pb):
    best=None; xi=np.arange(len(pb))
    for s10 in range(-60,61):
        s=s10/10; pbs=np.interp(xi+s,xi,pb); e=((pa[10:-10]-pbs[10:-10])**2).mean()
        if best is None or e<best[0]: best=(e,s)
    return best[1]
R=tuple(int(x) for x in os.environ.get("R","650,800,920,1420").split(","))
fin=prof(fs[-1],*R)
print(d, ' '.join(f"{int(f.split('_')[1][:-4])}:{shift(fin,prof(f,*R)):+.1f}" for f in fs if t0<=int(f.split('_')[1][:-4])<=t1))
