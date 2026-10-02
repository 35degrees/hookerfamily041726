import numpy as np, collections, sys
from PIL import Image, ImageFilter
im=np.asarray(Image.open('src.png').convert('RGB')).astype(np.float32)
H,W,_=im.shape
r,g,b=im[...,0],im[...,1],im[...,2]
V=im.max(-1)/255; Y=(r+g)/2-b
m=(V>0.70)&(Y>50)

def label(mask):
    """4-connected components, BFS over foreground only. Returns (labels, sizes, bboxes)."""
    lab=np.zeros(mask.shape,np.int32); sizes=[0]; boxes=[None]
    ys,xs=np.nonzero(mask); n=0
    for y0,x0 in zip(ys,xs):
        if lab[y0,x0]: continue
        n+=1; q=collections.deque([(y0,x0)]); lab[y0,x0]=n; cnt=0; y1=y2=y0; x1=x2=x0
        while q:
            y,x=q.popleft(); cnt+=1
            y1=min(y1,y); y2=max(y2,y); x1=min(x1,x); x2=max(x2,x)
            for yy,xx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
                if 0<=yy<H and 0<=xx<W and mask[yy,xx] and not lab[yy,xx]:
                    lab[yy,xx]=n; q.append((yy,xx))
        sizes.append(cnt); boxes.append((x1,y1,x2,y2))
    return lab,np.array(sizes),boxes

# 1. close tiny gaps inside strokes (3px) so a letter is one component, not a spray of islands
pm=Image.fromarray((m*255).astype(np.uint8))
closed=np.asarray(pm.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)))>127
lab,sizes,boxes=label(closed)
order=np.argsort(-sizes)
print('components',len(sizes)-1)
print('largest areas',[int(sizes[i]) for i in order[:45]])
np.save('lab.npy',lab); np.save('sizes.npy',sizes)
import json; json.dump([list(map(int,b)) if b else None for b in boxes],open('boxes.json','w'))
