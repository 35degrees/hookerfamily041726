import numpy as np, collections, json, sys
OPEN=int(sys.argv[1]) if len(sys.argv)>1 else 5
BLUR=float(sys.argv[2]) if len(sys.argv)>2 else 2.0
STRONG=float(sys.argv[4]) if len(sys.argv)>4 else 0.30
WEAK=float(sys.argv[5]) if len(sys.argv)>5 else 0.14
OUT=sys.argv[3] if len(sys.argv)>3 else 'title-gilt-v2.png'
from PIL import Image, ImageFilter, ImageDraw
src=Image.open('src.png').convert('RGB'); im=np.asarray(src).astype(np.float32)
H,W,_=im.shape
r,g,b=im[...,0],im[...,1],im[...,2]
V=im.max(-1)/255; Y=(r+g)/2-b
raw=(V>0.70)&(Y>50)
lab=np.load('lab.npy'); sizes=np.load('sizes.npy'); boxes=json.load(open('boxes.json'))
PERIOD=320
letter_ids=[i for i in range(1,len(sizes)) if sizes[i]>=5000]
letters_closed=np.isin(lab,letter_ids)

def label(mask, conn8=False):
    lb=np.zeros(mask.shape,np.int32); info=[(0,True)]; n=0
    nb=((-1,0),(1,0),(0,-1),(0,1))+(((-1,-1),(-1,1),(1,-1),(1,1)) if conn8 else ())
    ys,xs=np.nonzero(mask)
    for y0,x0 in zip(ys,xs):
        if lb[y0,x0]: continue
        n+=1; q=collections.deque([(y0,x0)]); lb[y0,x0]=n; cnt=0; edge=False
        while q:
            y,x=q.popleft(); cnt+=1
            if y==0 or x==0 or y==H-1 or x==W-1: edge=True
            for dy,dx in nb:
                yy,xx=y+dy,x+dx
                if 0<=yy<H and 0<=xx<W and mask[yy,xx] and not lb[yy,xx]:
                    lb[yy,xx]=n; q.append((yy,xx))
        info.append((cnt,edge))
    return lb,info

def P(a): return Image.fromarray((a*255).astype(np.uint8))
def A(img): return np.asarray(img)>127

# 1. GOLD MEASURED AGAINST ITS OWN SURROUNDINGS, then grown from the sure gold into the faint.
# The photo's right half is lit more dimly, so a single brightness cut-off kept the bright left letters
# whole and ate the thin bars and serifs of the right ones (Sam, round 3: both N's, the second D, the T).
# Local background = the leather's own brightness around each point, from leather pixels only.
leather=~np.asarray(P(raw).filter(ImageFilter.MaxFilter(9)))>127
Vl=np.where(leather,V,0).astype(np.float32); Wl=leather.astype(np.float32)
def small(a, f=8, sigma=6):
    h,w=a.shape[0]//f, a.shape[1]//f
    d=a[:h*f,:w*f].reshape(h,f,w,f).mean((1,3))
    k=np.exp(-0.5*(np.arange(-3*sigma,3*sigma+1)/sigma)**2); k/=k.sum()
    d=np.apply_along_axis(lambda r: np.convolve(np.pad(r,3*sigma,mode='edge'),k,'valid'),1,d)
    d=np.apply_along_axis(lambda c: np.convolve(np.pad(c,3*sigma,mode='edge'),k,'valid'),0,d)
    return np.asarray(Image.fromarray(d.astype(np.float32),'F').resize((W,H),Image.BILINEAR))
bg=small(Vl)/np.maximum(small(Wl),1e-3)
C=V-bg
strong=(C>STRONG)&(Y>45)
weak=(C>WEAK)&(Y>26)
near=np.asarray(P(letters_closed).filter(ImageFilter.MaxFilter(13)))>127   # stay within ~6px of a letter
wl,winfo=label(weak&near,conn8=True)
seeded=np.unique(wl[strong&near&(wl>0)])
m=np.isin(wl,seeded[seeded>0])
# 2. drop raw islands that are not part of a letter body: a speck next to a letter is its own small island
lb,info=label(m,conn8=True)
SPECK=250
m=np.isin(lb,[i for i,(c,e) in enumerate(info) if i and c>=SPECK])
# 3. OPEN (erode then dilate, 2px) — removes hair-thin spurs and grain bites standing off the edge
m=A(P(m).filter(ImageFilter.MinFilter(OPEN)).filter(ImageFilter.MaxFilter(OPEN)))
# 4. again drop any island the opening left behind
lb,info=label(m,conn8=True)
m=np.isin(lb,[i for i,(c,e) in enumerate(info) if i and c>=SPECK])
# 5. fill worn pinholes (small enclosed background) — the counters of O, D, A, R are thousands of px
bl,binfo=label(~m)
m=m|np.isin(bl,[i for i,(c,e) in enumerate(binfo) if i and not e and c<600])
# 6. smooth the outline ~2px: blur, re-threshold, light anti-alias
a=P(m).filter(ImageFilter.GaussianBlur(BLUR)); m2=np.asarray(a)>127
alpha=np.asarray(P(m2).filter(ImageFilter.GaussianBlur(0.7))).astype(np.float32)

# 7. THE PERIOD: replaced by a clean round dot at the original's centre, sized to the stroke weight.
x1,y1,x2,y2=boxes[PERIOD]; cx,cy=(x1+x2)/2,(y1+y2)/2
# stroke weight: median run-length of horizontal gold runs through the stems of REV
row=m2[600:640, 40:460]
runs=[]
for line in row:
    c=0
    for v in line:
        if v: c+=1
        elif c: runs.append(c); c=0
stem=float(np.median([x for x in runs if x>6])) if runs else 20
D=stem*1.3
print('stem px',round(stem,1),'period diameter',round(D,1),'centre',round(cx),round(cy))
# baseline-sit the dot: its bottom on the letters' baseline (bottom of the V's stroke row)
base=y2
cy=base-D/2
dot=Image.new('L',(W*4,H*4),0); ImageDraw.Draw(dot).ellipse([(cx-D/2)*4,(cy-D/2)*4,(cx+D/2)*4,(cy+D/2)*4],fill=255)
dot=np.asarray(dot.resize((W,H),Image.LANCZOS)).astype(np.float32)
# remove the original irregular period, place the dot
pr=np.zeros_like(m2); pr[y1-6:y2+7,x1-6:x2+7]=True
alpha[pr]=0
alpha=np.maximum(alpha,dot)
# fill the dot with real gold: copy a patch from the V's stroke (nearest letter) into the dot's box
rgb=np.asarray(src).copy()
s=int(D)+4; dy0=int(cy-s/2); dx0=int(cx-s/2)
Vf=im.max(-1); best=None
for yy in range(20,H-s-20,3):
    for xx in range(20,W-s-20,3):
        if not m2[yy:yy+s,xx:xx+s].all(): continue
        patch=Vf[yy:yy+s,xx:xx+s]; score=patch.mean()-2.0*patch.std()
        if best is None or score>best[0]: best=(score,yy,xx)
_,gy,gx=best
rgb[dy0:dy0+s, dx0:dx0+s]=rgb[gy:gy+s, gx:gx+s]
print('period gold from',gx,gy)

# MANUAL TOUCH-UPS — each one named, in SOURCE pixels (IMG_2277.png), so every hand edit is on record.
# Three kinds: 'erase' a box; 'below' erases everything in a box that lies below the line through two
# points (an attached lump hanging off a stroke whose true edge is that line); 'fill' closes a nick,
# taking its gold from the row just beneath so the patch matches.
TOUCHUPS=[
    ('erase', 'bump on the left of the D stem, DESCENDANTS (stem edge is x=793)', (780,127,793,144)),
    ('erase', 'dot outside the top-left curve of the first S, DESCENDANTS', (1056,33,1075,44)),
    ('below', 'lump off the left of the first S diagonal, DESCENDANTS', (1066,104,1098,132), ((1070,109),(1100,123))),
    ('erase', 'speck in the lower bowl of the first S, DESCENDANTS', (1109,164,1122,171)),
    ('erase', 'sliver left of the inner bowl edge of the first S (edge at x~1119), DESCENDANTS', (1112,170,1118,174)),
    ('erase', 'microdot at the top-left of the C, DESCENDANTS', (1176,42,1193,46)),
    ('below', 'fleck off the bottom-left curve of the C, DESCENDANTS', (1184,182,1210,201), ((1185,181),(1222,200))),
    ('fill',  'nick in the top edge beside the top-left serif of the second E, DESCENDANTS', (1314,31,1324,33)),
    ('ellipse', 'the O of OF: rebuilt as a true oval ring fitted to its own edges (Sam, rounds 5-6)', (1126,280,1284,450)),
    ('straighten_bottom', 'bottom edge of the E in HOOKER, between its left foot and its upturned right serif', (2207,672,2309,712)),
]


def fit_ellipse(px,py):
    """Algebraic conic fit (normalised), with outlier rejection: the grain-damaged edge points are the
    ones far off the curve, so the worst 20% are dropped and the fit repeated."""
    keep=np.ones(len(px),bool)
    for _ in range(3):
        x=px[keep]; y=py[keep]; mx,my,sc=x.mean(),y.mean(),max(x.std(),y.std())
        X=(x-mx)/sc; Y=(y-my)/sc
        D=np.stack([X*X,X*Y,Y*Y,X,Y,np.ones_like(X)],1)
        _,_,vt=np.linalg.svd(D,full_matrices=False); p=vt[-1]
        Xa=(px-mx)/sc; Ya=(py-my)/sc
        r=np.abs(np.stack([Xa*Xa,Xa*Ya,Ya*Ya,Xa,Ya,np.ones_like(Xa)],1)@p)
        keep=r<=np.percentile(r[keep],80)
    return p,mx,my,sc
def inside(p,mx,my,sc,xx,yy):
    X=(xx-mx)/sc; Y=(yy-my)/sc; v=p[0]*X*X+p[1]*X*Y+p[2]*Y*Y+p[3]*X+p[4]*Y+p[5]
    c=p[0]*0+p[1]*0+p[2]*0+p[3]*0+p[4]*0+p[5]   # value at the centre is inside
    return np.sign(v)==np.sign(c)

def diffuse_fill(out, seeds, need, rounds=40):
    """Fill `need` pixels by growing inward from `seeds`, each new pixel the AVERAGE of its filled
    neighbours — a smooth blend, never a copied stripe (copying pixels from up to 12px away is what
    smeared the O into shards)."""
    filled=seeds.copy()
    for _ in range(rounds):
        todo=need&~filled
        if not todo.any(): break
        acc=np.zeros(out.shape,np.float32); cnt=np.zeros(filled.shape,np.float32)
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
            f=np.roll(np.roll(filled,dy,0),dx,1); c=np.roll(np.roll(out,dy,0),dx,1)
            acc+=c*f[...,None]; cnt+=f
        grow=todo&(cnt>0); out[grow]=acc[grow]/cnt[grow][:,None]; filled|=grow
    return out
touched=np.zeros(alpha.shape,bool)
for t in TOUCHUPS:
    kind,_name,(tx1,ty1,tx2,ty2)=t[0],t[1],t[2]
    if kind=='erase':
        alpha[ty1:ty2,tx1:tx2]=0
    elif kind=='below':
        (ax,ay),(bx,by)=t[3]; yy,xx=np.mgrid[ty1:ty2,tx1:tx2]
        edge=ay+(xx-ax)*(by-ay)/(bx-ax)
        sub=alpha[ty1:ty2,tx1:tx2]; sub[yy>edge+0.5]=0
    elif kind=='fill':
        alpha[ty1:ty2,tx1:tx2]=255
        rgb[ty1:ty2,tx1:tx2]=rgb[ty2+1:ty2+2,tx1:tx2]
    elif kind=='round':
        # One letter's own box, processed with a PAD so no filter sees the box edge (that edge is what
        # left a fragment under the O on the first try), written back to the box only. Close inward
        # notches (17px), drop outward lumps (11px), then smooth at a radius that suits a ~70px curve.
        PADR=24
        X1,Y1,X2,Y2=max(0,tx1-PADR),max(0,ty1-PADR),min(W,tx2+PADR),min(H,ty2+PADR)
        bx=Image.fromarray(((alpha[Y1:Y2,X1:X2]>127)*255).astype(np.uint8))
        bx=bx.filter(ImageFilter.MaxFilter(17)).filter(ImageFilter.MinFilter(17))
        bx=bx.filter(ImageFilter.MinFilter(11)).filter(ImageFilter.MaxFilter(11))
        bx=bx.filter(ImageFilter.MinFilter(5))   # inset 2px: the edge lands in bright gold, not the dark rim
        bx=bx.filter(ImageFilter.GaussianBlur(5.0))
        hard=(np.asarray(bx)>127)[ty1-Y1:ty2-Y1, tx1-X1:tx2-X1]
        old=alpha[ty1:ty2,tx1:tx2]>127
        sub_rgb=rgb[ty1:ty2,tx1:tx2]; newly=hard&~old
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1),(2,0),(-2,0),(0,2),(0,-2),(3,0),(-3,0),(0,3),(0,-3),(5,0),(-5,0),(0,5),(0,-5),(8,0),(-8,0),(0,8),(0,-8)):
            if not newly.any(): break
            sh=np.roll(np.roll(old,dy,0),dx,1); shc=np.roll(np.roll(sub_rgb,dy,0),dx,1)
            take=newly&sh; sub_rgb[take]=shc[take]; newly=newly&~take
        alpha[ty1:ty2,tx1:tx2]=hard*255.0
    elif kind=='ellipse':
        bx=alpha[ty1:ty2,tx1:tx2]>127
        bl2,info2=label(~bx) if False else (None,None)
        # outer edge = gold pixels touching the background that reaches the box edge; inner = touching the counter
        from collections import deque
        bg=~bx; outside=np.zeros_like(bg); q=deque()
        h,w=bg.shape
        for yy in range(h):
            for xx in (0,w-1):
                if bg[yy,xx] and not outside[yy,xx]: outside[yy,xx]=True; q.append((yy,xx))
        for xx in range(w):
            for yy in (0,h-1):
                if bg[yy,xx] and not outside[yy,xx]: outside[yy,xx]=True; q.append((yy,xx))
        while q:
            yy,xx=q.popleft()
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                y2,x2=yy+dy,xx+dx
                if 0<=y2<h and 0<=x2<w and bg[y2,x2] and not outside[y2,x2]: outside[y2,x2]=True; q.append((y2,x2))
        counter=bg&~outside
        def ring_edge(region):
            nb=np.zeros_like(bx)
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)): nb|=np.roll(np.roll(region,dy,0),dx,1)
            return bx&nb
        oy,ox=np.nonzero(ring_edge(outside)); iy,ix=np.nonzero(ring_edge(counter))
        po=fit_ellipse(ox.astype(float),oy.astype(float)); pi=fit_ellipse(ix.astype(float),iy.astype(float))
        SS=4; yy,xx=np.mgrid[0:h*SS,0:w*SS]; xx=(xx+0.5)/SS-0.5; yy=(yy+0.5)/SS-0.5
        ring=inside(*po,xx,yy)&~inside(*pi,xx,yy)
        cov=ring.reshape(h,SS,w,SS).mean((1,3))
        sub=rgb[ty1:ty2,tx1:tx2].astype(np.float32); Vs=sub.max(-1)
        bright=bx&(Vs>=np.percentile(Vs[bx],40))
        ringc=cov>0.5
        ring_core=np.asarray(Image.fromarray((ringc*255).astype(np.uint8)).filter(ImageFilter.MinFilter(7)))>127
        # blend ONLY what the oval added plus a 3px rim; the rest of the ring keeps the photographed gold
        need=((cov>0.02)&~bx) | ((cov>0.02)&~ring_core&~bright)
        rgb[ty1:ty2,tx1:tx2]=np.clip(diffuse_fill(sub,bright,need),0,255).astype(np.uint8)
        alpha[ty1:ty2,tx1:tx2]=cov*255.0
        print('  O ring fitted from %d outer and %d inner edge points'%(len(ox),len(ix)))
    elif kind=='straighten_bottom':
        # Fit ONE straight line through the bottom edge, rejecting the grain outliers, then fill gold up to
        # it and trim below it. The line is the edge the tool pressed; the wobble is the leather.
        cols=np.arange(tx1,tx2); bot=[]
        for x in cols:
            ys=np.nonzero(alpha[ty1:ty2,x]>127)[0]; bot.append(ty1+ys.max() if len(ys) else np.nan)
        bot=np.array(bot,float); ok=~np.isnan(bot)
        for _ in range(4):
            k,b=np.polyfit(cols[ok],bot[ok],1); res=bot-(k*cols+b); ok=ok&(np.abs(res)<1.6)
        b-=2.5   # into the bright gold: the photo's bottom rim of the bar is leather-tinted
        print('  straight bottom: y = %.4f x + %.2f  (%d of %d columns fit)'%(k,b,ok.sum(),len(cols)))
        for x in cols:
            edge=k*x+b; top=int(edge)-10
            for y in range(top,ty2):
                cov=np.clip(edge+0.5-y,0,1)                     # 1 above the line, 0 below, a fraction on it
                if cov>0 and alpha[y,x]<255*cov: rgb[y,x]=rgb[int(edge)-3,x]
                alpha[y,x]=255*cov if y>edge-1.5 else alpha[y,x]
    touched[max(0,ty1-3):ty2+3,max(0,tx1-3):tx2+3]=True
# re-soften only the touched areas, so a cut edge is anti-aliased like every other edge
soft=np.asarray(Image.fromarray(np.clip(alpha,0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32)
alpha=np.where(touched,soft,alpha)
# EDGE COLOUR: the outer ~3px of every letter carries leather-crackle grey from the photo, which reads as a
# pale fringe (Sam, round 6, against his close-ups: the real gilt is bright to the edge). Spread each
# letter's own interior gold outward over that band — colour only; the alpha (the shapes) is untouched.
core=np.asarray(Image.fromarray(((alpha>=250)*255).astype(np.uint8)).filter(ImageFilter.MinFilter(7)))>127
band=(alpha>0)&~core
Vc=rgb.max(-1).astype(np.float32)
seeds=core&(Vc>=np.percentile(Vc[core],40))     # spread only BRIGHT gold, or tan wear streaks grow outward
out=diffuse_fill(rgb.astype(np.float32), seeds, band|(core&~seeds), rounds=10)
out=np.where((core&~seeds)[...,None], rgb.astype(np.float32), out)   # interior wear stays exactly as photographed
rgb=np.clip(out,0,255).astype(np.uint8)
alpha=np.clip(alpha,0,255).astype(np.uint8)
ys,xs=np.nonzero(alpha>8); pad=14
X1,X2=max(0,xs.min()-pad),min(W,xs.max()+pad+1); Y1,Y2=max(0,ys.min()-pad),min(H,ys.max()+pad+1)
rgba=np.dstack([rgb,alpha])[Y1:Y2,X1:X2]
Image.fromarray(rgba,'RGBA').save(OUT)
json.dump({'crop':[int(X1),int(Y1),int(X2),int(Y2)]},open(OUT+'.crop.json','w'))
print('plate',X2-X1,'x',Y2-Y1)
