"""Named touch-ups on the year line's REAL glyphs (1, 5, 8, 6), in year.png coordinates — Sam, round 8."""
import numpy as np, json, collections
from PIL import Image, ImageFilter, ImageDraw
meta=json.load(open('glyphs.json'))
def load(k):
    a=np.asarray(Image.open(f'glyph_{k}.png')).copy(); return a, meta[k][0], meta[k][1]
def save(k,a): Image.fromarray(a,'RGBA').save(f'glyph_{k}.png')
def fill_from_neighbours(rgb, have, need, rounds=40):
    rgb=rgb.astype(np.float32)
    for _ in range(rounds):
        todo=need&~have
        if not todo.any(): break
        acc=np.zeros_like(rgb); cnt=np.zeros(have.shape,np.float32)
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
            f=np.roll(np.roll(have,dy,0),dx,1); c=np.roll(np.roll(rgb,dy,0),dx,1); acc+=c*f[...,None]; cnt+=f
        grow=todo&(cnt>0); rgb[grow]=acc[grow]/cnt[grow][:,None]; have=have|grow
    return np.clip(rgb,0,255).astype(np.uint8)
def fit_ellipse(px,py,keep_pct=70):
    keep=np.ones(len(px),bool)
    for _ in range(4):
        x=px[keep]; y=py[keep]; mx,my,sc=x.mean(),y.mean(),max(x.std(),y.std())
        X=(x-mx)/sc; Y=(y-my)/sc; D=np.stack([X*X,X*Y,Y*Y,X,Y,np.ones_like(X)],1)
        p=np.linalg.svd(D,full_matrices=False)[2][-1]
        Xa=(px-mx)/sc; Ya=(py-my)/sc; r=np.abs(np.stack([Xa*Xa,Xa*Ya,Ya*Ya,Xa,Ya,np.ones_like(Xa)],1)@p)
        keep=r<=np.percentile(r[keep],keep_pct)
    return p,mx,my,sc
def ins(p,mx,my,sc,xx,yy):
    X=(xx-mx)/sc; Y=(yy-my)/sc; v=p[0]*X*X+p[1]*X*Y+p[2]*Y*Y+p[3]*X+p[4]*Y+p[5]; return np.sign(v)==np.sign(p[5])
def counters(al):
    """Background regions fully enclosed by the glyph — its holes."""
    h,w=al.shape; bg=~al; lab=np.zeros((h,w),np.int32); n=0; out=[]
    for y0 in range(h):
        for x0 in range(w):
            if bg[y0,x0] and not lab[y0,x0]:
                n+=1; q=collections.deque([(y0,x0)]); lab[y0,x0]=n; edge=False; pts=[]
                while q:
                    y,x=q.popleft(); pts.append((y,x))
                    if y in (0,h-1) or x in (0,w-1): edge=True
                    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        yy,xx=y+dy,x+dx
                        if 0<=yy<h and 0<=xx<w and bg[yy,xx] and not lab[yy,xx]: lab[yy,xx]=n; q.append((yy,xx))
                if not edge and len(pts)>300: out.append(lab==n)
    return out

# ── 8: each hole becomes the oval its OWN edge describes; anything gold poking into it goes (the "cyst"
#       in the top hole, the two flecks on the bottom hole's right inside curve).
a,ox,oy=load('8'); al=a[...,3]>127
for hole in counters(al):
    nb=np.zeros_like(al)
    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)): nb|=np.roll(np.roll(hole,dy,0),dx,1)
    ey,ex=np.nonzero(al&nb)
    p=fit_ellipse(ex*1.0,ey*1.0,keep_pct=65)
    SS=4; h,w=al.shape; Y,X=np.mgrid[0:h*SS,0:w*SS]; X=(X+0.5)/SS-0.5; Y=(Y+0.5)/SS-0.5
    cov=ins(*p,X,Y).reshape(h,SS,w,SS).mean((1,3))
    a[...,3]=np.minimum(a[...,3], (255*(1-cov)).astype(np.uint8))
    print('8 hole: cleared to its fitted oval from',len(ex),'edge points')
save('8',a)

# ── 6: the bowl as a true oval ring (round 9). The shiny leather's bright inner wall and some crackle were
#       counted as gold: the stroke came out fat, the outer-left curve bulged, and the counter had a bite on its
#       right. Below the bowl's centre the 6 becomes exactly the fitted ring (outer oval inset 2px, inner oval
#       from the counter); above it, the real stroke and hook stay, with the counter cleared to the inner oval.
a,ox,oy=load('6'); al=a[...,3]>127; h,w=al.shape
holes=counters(al); hole=max(holes,key=lambda m:m.sum())
nb=np.zeros_like(al)
for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)): nb|=np.roll(np.roll(hole,dy,0),dx,1)
iy,ix=np.nonzero(al&nb); pin=fit_ellipse(ix*1.0,iy*1.0,keep_pct=70)
cy=int(np.mean(iy))                                     # the bowl's centre row
outside=~al&~hole
nb2=np.zeros_like(al)
for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)): nb2|=np.roll(np.roll(outside,dy,0),dx,1)
ey,ex=np.nonzero(al&nb2); sel=ey>=cy-int(0.15*h)       # the BOWL's outside edge only, not the hook
pout=fit_ellipse(ex[sel]*1.0,ey[sel]*1.0,keep_pct=70)
SS=4; Y,X=np.mgrid[0:h*SS,0:w*SS]; X=(X+0.5)/SS-0.5; Y=(Y+0.5)/SS-0.5
p,mx,my,sc=pout
def inset_ins(p,mx,my,sc,xx,yy,px):
    # inside the oval shrunk by ~px: test a point pushed px outward from the centre
    dx=xx-mx; dy=yy-my; d=np.sqrt(dx*dx+dy*dy)+1e-6
    return ins(p,mx,my,sc,xx+dx/d*px,yy+dy/d*px)
outer=inset_ins(*pout,X,Y,6.0).reshape(h,SS,w,SS).mean((1,3))   # 6px: measured, the bowl was ~140px wide against the photo's ~125
inner=ins(*pin,X,Y).reshape(h,SS,w,SS).mean((1,3))
ring=np.clip(outer-inner,0,1)
yy=np.arange(h)[:,None]
old=a[...,3].astype(np.float32)/255
# the WHOLE bowl is the ring (no shelf where an old outline met it); only the HOOK — stroke outside the bowl,
# above its centre — is kept from the original outline, and the join is lightly smoothed
hook=old*(1-outer)*(yy<cy)       # cut against the SAME inset oval as the ring, or a gap opens where they meet
hk=Image.fromarray(((hook>0.5)*255).astype(np.uint8))
hk=hk.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(3.0))
hook=(np.asarray(hk)>127).astype(np.float32)*(1-outer)*(yy<cy)   # the hook's own bumps, rounded, still cut to the ring
new=np.clip(ring+hook,0,1)*(1-inner)
sm=np.asarray(Image.fromarray((new*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))).astype(np.float32)/255
new=np.asarray(Image.fromarray(((sm>0.5)*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))).astype(np.float32)/255
newly=(new>0.5)&~al
a[...,:3]=fill_from_neighbours(a[...,:3], al&(new>0.5), newly)
a[...,3]=(np.clip(new,0,1)*255).astype(np.uint8)
save('6',a); print('6: bowl ring fitted (outer from %d edge points, inner from %d), centre row %d'%(sel.sum(),len(ix),cy))

# ── 1: straighten the LEFT edge of the stem (between the flag and the foot), like the E's bottom: one
#       fitted line, gold up to it (taken from 4px inside the stroke), nothing left of it, a 1px soft edge.
a,ox,oy=load('1'); al=a[...,3]>127; h,w=al.shape
r0,r1=int(h*0.45),int(h*0.86)
rows=np.arange(r0,r1); left=np.array([np.nonzero(al[r])[0].min() if al[r].any() else np.nan for r in rows],float)
ok=~np.isnan(left)
for _ in range(4):
    k,b=np.polyfit(rows[ok],left[ok],1); res=left-(k*rows+b); ok=ok&(np.abs(res)<1.6)
b+=0.8
for r in rows:
    edge=k*r+b; e=int(np.floor(edge))
    src_x=min(w-1,e+5)
    for x in range(0,min(w,e+5)):
        cov=float(np.clip(x+0.5-edge,0,1))
        if cov<=0: a[r,x,3]=0; continue
        fillc=a[r,min(w-1,e+4):min(w,e+10),:3].astype(np.float32).mean(0).astype(np.uint8)   # several columns in, not one highlight
        if a[r,x,3]<255*cov or a[r,x,:3].max()<fillc.max()*0.8: a[r,x,:3]=fillc
        a[r,x,3]=int(255*cov) if cov<1 else max(a[r,x,3],255)
print('1: stem left edge straightened, x = %.3f y + %.1f'%(k,b)); save('1',a)

# ── 5: the tail ends in a SPIKE below the 1's foot, not a nub. The clean stroke runs to y 240 (x 201..224);
#       below that is a crackle blob. Cut there and taper with CURVED edges to a fine point — straight sides
#       from a 23px base read as an arrowhead (round 8, first try).
a,ox,oy=load('5'); h,w=a.shape[:2]
L=lambda X,Y:(X-ox,Y-oy)
cut_y=240
yy,xx=np.mgrid[0:h,0:w]
a[...,3][(yy>=cut_y-oy)&(xx<230-ox)]=0
def qb(p0,p1,p2,n=24):
    t=np.linspace(0,1,n)[:,None]; P0,P1,P2=map(np.array,(p0,p1,p2))
    return (1-t)**2*P0+2*(1-t)*t*P1+t*t*P2
tip=(186,253)
upper=qb((201,240),(193,245),tip)          # the upper-left edge closes gently
lower=qb(tip,(204,250),(224,240))          # the lower edge sweeps in a concave arc back to the stroke
poly=[L(x,y) for x,y in np.vstack([upper,lower])]
mask=Image.new('L',(w*4,h*4),0); ImageDraw.Draw(mask).polygon([(x*4,y*4) for x,y in poly],fill=255)
spike=np.asarray(mask.resize((w,h),Image.LANCZOS))
# blend the spike into the stroke over its base so there is no seam
base=(yy>=cut_y-4-oy)&(yy<cut_y+2-oy)&(xx>=199-ox)&(xx<=226-ox)
newly=(spike>20)&(a[...,3]<128)
a[...,3]=np.maximum(a[...,3],spike)
have=(a[...,3]>200)&~newly&(yy<cut_y-oy)
a[...,:3]=fill_from_neighbours(a[...,:3],have,newly|((a[...,3]>0)&(yy>=cut_y-oy)))
save('5',a); print('5: tail cut at y 240 and tapered with curved edges to', tip)
