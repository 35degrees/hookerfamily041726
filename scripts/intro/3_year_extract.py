"""Lift the gilt digits of the spine's year line (1586 - 1908) from Sam's close-up, glyph by glyph."""
import numpy as np, collections, json, sys
OPEN=int(sys.argv[1]) if len(sys.argv)>1 else 7
BLUR=float(sys.argv[2]) if len(sys.argv)>2 else 2.4
from PIL import Image, ImageFilter
src=Image.open('year.png').convert('RGB'); im=np.asarray(src).astype(np.float32)
H,W,_=im.shape; r,g,b=im[...,0],im[...,1],im[...,2]
V=im.max(-1)/255; Y=(r+g)/2-b
def P(a): return Image.fromarray((a*255).astype(np.uint8))
def A(img): return np.asarray(img)>127
def label(mask):
    lb=np.zeros(mask.shape,np.int32); info=[(0,True,None)]; n=0
    ys,xs=np.nonzero(mask)
    for y0,x0 in zip(ys,xs):
        if lb[y0,x0]: continue
        n+=1; q=collections.deque([(y0,x0)]); lb[y0,x0]=n; cnt=0; edge=False; bx=[x0,y0,x0,y0]
        while q:
            y,x=q.popleft(); cnt+=1
            if y==0 or x==0 or y==H-1 or x==W-1: edge=True
            bx=[min(bx[0],x),min(bx[1],y),max(bx[2],x),max(bx[3],y)]
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                yy,xx=y+dy,x+dx
                if 0<=yy<H and 0<=xx<W and mask[yy,xx] and not lb[yy,xx]: lb[yy,xx]=n; q.append((yy,xx))
        info.append((cnt,edge,bx))
    return lb,info
# strong gold, opened 7px so the leather crackle (2-4px lines) cannot survive, used as SEEDS;
# weaker gold connected to a seed is the glyph (the same grow-from-sure-gold the title uses)
strong=(V>0.72)&(Y>58)
seeds=A(P(strong).filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7)))
weak=(V>0.58)&(Y>40)
weak=A(P(weak).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5)))
# BOUNDED growth: on this shiny leather the crackle is nearly as bright as the gold, so growing freely
# along weak gold follows the cracks out as tendrils. Grow only within 3px of the sure gold, then cut
# anything thinner than the strokes (a 7px opening) — the tendrils are 2-4px wide, the strokes ~20px.
near=A(P(seeds).filter(ImageFilter.MaxFilter(7)))
m=seeds|(weak&near)
m=A(P(m).filter(ImageFilter.MinFilter(OPEN)).filter(ImageFilter.MaxFilter(OPEN)))
lb,info=label(m)
glyphs=[i for i,(c,e,bx) in enumerate(info) if i and c>1500]
print('glyph components',len(glyphs),[ (info[i][0],info[i][2]) for i in sorted(glyphs,key=lambda i: info[i][2][0])])
m=np.isin(lb,glyphs)
bl,binfo=label(~m)
m=m|np.isin(bl,[i for i,(c,e,bx) in enumerate(binfo) if i and not e and c<500])
a=P(m).filter(ImageFilter.GaussianBlur(BLUR)); m2=np.asarray(a)>127
alpha=np.asarray(P(m2).filter(ImageFilter.GaussianBlur(0.7)))
lb2,info2=label(m2)
order=sorted([i for i,(c,e,bx) in enumerate(info2) if i and c>1500],key=lambda i: info2[i][2][0])
names=['1','5','8','6','-','1b','9','0','8b']
assert len(order)==len(names),(len(order))
meta={}
PER={'0':(13,4.0),'8':(13,4.0),'8b':(13,4.0),'6':(13,4.0),'9':(13,4.0),'1':(9,3.0),'1b':(9,3.0),'-':(9,3.0),'5':(7,3.0)}
rgba=np.dstack([np.asarray(src),alpha]).astype(np.uint8)
for nm,i in zip(names,order):
    x1,y1,x2,y2=info2[i][2]; pad=6
    x1,y1,x2,y2=max(0,x1-pad),max(0,y1-pad),min(W,x2+pad+1),min(H,y2+pad+1)
    # PER-GLYPH clean-up: one strength cannot suit every figure — the 0/8/6 have ~22px strokes and take
    # a strong clean-up; the 5's tail is ~12px and would be cut off (it was, at 11px).
    k,blur=PER.get(nm,(9,3.0))
    sel=np.isin(lb2,[i])
    pad2=20; Y1,X1,Y2,X2=max(0,y1-pad2),max(0,x1-pad2),min(H,y2+pad2),min(W,x2+pad2)
    loc=P(sel[Y1:Y2,X1:X2]).filter(ImageFilter.MinFilter(k)).filter(ImageFilter.MaxFilter(k)).filter(ImageFilter.GaussianBlur(blur))
    loc=np.asarray(P(np.asarray(loc)>127).filter(ImageFilter.GaussianBlur(0.7)))
    g=rgba[y1:y2,x1:x2].copy(); g[...,3]=loc[y1-Y1:y2-Y1, x1-X1:x2-X1]
    Image.fromarray(g,'RGBA').save(f'glyph_{nm}.png'); meta[nm]=[int(x1),int(y1),int(x2),int(y2)]
json.dump(meta,open('glyphs.json','w')); print(meta)
