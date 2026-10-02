"""The 0 of 1908 -> the oval ring its own edges describe (as the O of OF). Run after year_build.py."""
import numpy as np, collections
from PIL import Image
g=Image.open('glyph_0.png'); a=np.asarray(g).copy(); al=a[...,3]>127; h,w=al.shape
def fit(px,py):
    keep=np.ones(len(px),bool)
    for _ in range(3):
        x=px[keep]; y=py[keep]; mx,my,sc=x.mean(),y.mean(),max(x.std(),y.std())
        X=(x-mx)/sc; Y=(y-my)/sc; D=np.stack([X*X,X*Y,Y*Y,X,Y,np.ones_like(X)],1)
        p=np.linalg.svd(D,full_matrices=False)[2][-1]
        Xa=(px-mx)/sc; Ya=(py-my)/sc; r=np.abs(np.stack([Xa*Xa,Xa*Ya,Ya*Ya,Xa,Ya,np.ones_like(Xa)],1)@p)
        keep=r<=np.percentile(r[keep],80)
    return p,mx,my,sc
def ins(p,mx,my,sc,xx,yy):
    X=(xx-mx)/sc; Y=(yy-my)/sc; v=p[0]*X*X+p[1]*X*Y+p[2]*Y*Y+p[3]*X+p[4]*Y+p[5]; return np.sign(v)==np.sign(p[5])
bg=~al; outside=np.zeros_like(bg); q=collections.deque()
for yy in range(h):
    for xx in (0,w-1):
        if bg[yy,xx]: outside[yy,xx]=True; q.append((yy,xx))
for xx in range(w):
    for yy in (0,h-1):
        if bg[yy,xx] and not outside[yy,xx]: outside[yy,xx]=True; q.append((yy,xx))
while q:
    yy,xx=q.popleft()
    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
        y2,x2=yy+dy,xx+dx
        if 0<=y2<h and 0<=x2<w and bg[y2,x2] and not outside[y2,x2]: outside[y2,x2]=True; q.append((y2,x2))
counter=bg&~outside
def rim(region):
    nb=np.zeros_like(al)
    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)): nb|=np.roll(np.roll(region,dy,0),dx,1)
    return al&nb
oy,ox=np.nonzero(rim(outside)); iy,ix=np.nonzero(rim(counter))
po=fit(ox*1.0,oy*1.0); pi=fit(ix*1.0,iy*1.0)
SS=4; Y,X=np.mgrid[0:h*SS,0:w*SS]; X=(X+0.5)/SS-0.5; Y=(Y+0.5)/SS-0.5
cov=(ins(*po,X,Y)&~ins(*pi,X,Y)).reshape(h,SS,w,SS).mean((1,3))
rgb=a[...,:3].astype(np.float32); have=al&(a[...,:3].max(-1)>np.percentile(a[...,:3].max(-1)[al],40))
need=(cov>0.02)&~have
for _ in range(40):
    todo=need&~have
    if not todo.any(): break
    acc=np.zeros_like(rgb); cnt=np.zeros(have.shape,np.float32)
    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
        f=np.roll(np.roll(have,dy,0),dx,1); c=np.roll(np.roll(rgb,dy,0),dx,1); acc+=c*f[...,None]; cnt+=f
    grow=todo&(cnt>0); rgb[grow]=acc[grow]/cnt[grow][:,None]; have|=grow
a[...,:3]=np.clip(rgb,0,255).astype(np.uint8); a[...,3]=(cov*255).astype(np.uint8)
Image.fromarray(a,'RGBA').save('glyph_0.png'); print('0: oval ring fitted from',len(ox),'outer and',len(ix),'inner edge points')
