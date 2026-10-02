import numpy as np, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter
meta=json.load(open('glyphs.json'))
G={k:Image.open(f'glyph_{k}.png') for k in meta}
# digit metrics from the real 0: height, and stroke width (median horizontal run through its sides)
a0=np.asarray(G['0'])[...,3]>127; ys=np.nonzero(a0.any(1))[0]; Hd=ys.max()-ys.min()+1
runs=[]
for row in a0[int(Hd*0.35):int(Hd*0.65)]:
    c=0
    for v in row:
        if v: c+=1
        elif c: runs.append(c); c=0
SW=float(np.median([r for r in runs if r>4])); print('digit height',Hd,'stroke',SW)
def roughness(mask):
    sm=np.asarray(Image.fromarray((mask*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)))>127
    return float((sm!=mask).mean()/max(1e-6,mask.mean()))
TARGET_ROUGH=0.014     # measured on the spine's real figures: 6 0.011, 9 0.013, 8 0.014, 1 0.018

RIM=np.array([0.83,0.773,0.871],np.float32)   # measured: the real figures' 4px edge band vs their core (median of 7)
def add_rim(rgba):
    """The real figures carry a darker, browner band of gold along every edge — that band is most of what
    reads as 'coarse' and hand-tooled. A made glyph gets the SAME band, graded over ~4px."""
    a=rgba.copy(); m=a[...,3]>127
    d=np.zeros(m.shape,np.float32); cur=m.copy()
    for step in range(1,6):
        cur=np.asarray(Image.fromarray((cur*255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)))>127
        d+=cur
    t=np.clip(d/4.0,0,1)[...,None]              # 0 on the edge -> 1 at 4px in
    f=RIM+(1-RIM)*t
    a[...,:3]=np.clip(a[...,:3].astype(np.float32)*f,0,255).astype(np.uint8); return a
ROUGH_AMP=float(__import__('os').environ.get('ROUGH_AMP','0.40'))
def roughen(mask, seed=11):
    """A hand-tooled edge: low-frequency noise pushed onto the outline (round 8 — the made 2s were
    'perfectly crisp', which gave them away). The strength is chosen BY EYE against the real 1586: two
    automatic roughness measures were tried and both scored a clean font 2 like a real figure, because
    corners count as roughness. ROUGH_AMP is the dial."""
    r=np.random.default_rng(seed)
    noise=Image.fromarray((r.random(mask.shape)*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.6))
    n=(np.asarray(noise).astype(np.float32)-127)/127; n/=max(1e-3,np.abs(n).max())
    soft=np.asarray(Image.fromarray((mask*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.0))).astype(np.float32)/255
    e=(soft+ROUGH_AMP*n)>0.5
    return np.asarray(Image.fromarray((e*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)))
# a GOLD FIELD QUILTED FROM REAL STROKES: 16px squares cut from inside the digits' own gilt (never across an
# edge), laid at random with a feathered overlap. Diffusing between the digits smeared it into streaks.
P=26; OV=10; src_patches=[]
for k in ('0','8','6','1','-'):
    p=np.asarray(G[k]); a=p[...,3]>200
    for yy in range(0,p.shape[0]-P,3):
        for xx in range(0,p.shape[1]-P,3):
            if a[yy:yy+P,xx:xx+P].all(): src_patches.append(p[yy:yy+P,xx:xx+P,:3].astype(np.float32))
print('gilt patches',len(src_patches))
Hf,Wf=420,420; rgb=np.zeros((Hf,Wf,3),np.float32); wsum=np.zeros((Hf,Wf),np.float32)
ramp=np.minimum(np.minimum(np.arange(P)+1,P-np.arange(P)),OV)/OV; win=np.outer(ramp,ramp)
rs=np.random.default_rng(3)
for yy in range(0,Hf-P+1,P-OV):
    for xx in range(0,Wf-P+1,P-OV):
        q=src_patches[rs.integers(len(src_patches))]
        if rs.random()<0.5: q=q[:,::-1]
        if rs.random()<0.5: q=q[::-1]
        rgb[yy:yy+P,xx:xx+P]+=q*win[...,None]; wsum[yy:yy+P,xx:xx+P]+=win
rgb=rgb/np.maximum(wsum,1e-3)[...,None]
field=Image.fromarray(np.clip(rgb,0,255).astype(np.uint8))
# THE 0: fitted oval -> the measured hand-tooled edge, and the quilted gilt's GRAIN laid over its blended
# areas (its fit left them smooth). High-pass only, so the 0 keeps its own colour.
z=np.asarray(G['0']).copy(); zm=z[...,3]>127
fz=np.asarray(field.resize((max(z.shape[1],field.width),max(z.shape[0],field.height))).crop((0,0,z.shape[1],z.shape[0]))).astype(np.float32)
hp=fz-np.asarray(Image.fromarray(fz.astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))).astype(np.float32)
z[...,:3]=np.clip(z[...,:3].astype(np.float32)+hp*1.0,0,255).astype(np.uint8)
print('0:'); z[...,3]=roughen(zm,seed=5)
G['0']=Image.fromarray(add_rim(z),'RGBA')
F='/System/Library/Fonts/Supplemental/'
fonts={'Cochin':F+'Cochin.ttc'}   # Sam, round 10: Cochin over Iowan (Baskerville, Times, Palatino, Big Caslon ruled out earlier)
rng=np.random.default_rng(7)
BOLD=4     # round 9: the 2s a little heavier than the real figures' median stroke, to sit with the 6

def make_two(path):
    # render big, measure, scale so its height matches the real digits
    f=ImageFont.truetype(path,600); im=Image.new('L',(700,800),0); ImageDraw.Draw(im).text((50,0),'2',font=f,fill=255)
    a=np.asarray(im)>127; yy,xx=np.nonzero(a); a=a[yy.min():yy.max()+1,xx.min():xx.max()+1]
    sc=Hd/a.shape[0]; m=Image.fromarray((a*255).astype(np.uint8)).resize((max(1,int(a.shape[1]*sc)),Hd),Image.LANCZOS)
    m=np.asarray(m)>127
    # match stroke weight: measure the 2's own median horizontal run in its middle, dilate/erode to SW
    r2=[]
    for row in m[int(Hd*0.3):int(Hd*0.7)]:
        c=0
        for v in row:
            if v: c+=1
            elif c: r2.append(c); c=0
    sw2=float(np.median(r2)) if r2 else SW; d=int(round((SW+BOLD-sw2)/2))
    pad=20; mm=np.pad(m,pad)
    img=Image.fromarray((mm*255).astype(np.uint8))
    if d>0: img=img.filter(ImageFilter.MaxFilter(2*d+1))
    elif d<0: img=img.filter(ImageFilter.MinFilter(-2*d+1))
    al=roughen(np.asarray(img)>127)
    h,w=al.shape; tex=field.crop((0,0,w,h)) if field.width>=w and field.height>=h else field.resize((max(w,field.width),max(h,field.height))).crop((0,0,w,h))
    out=np.dstack([np.asarray(tex),al]).astype(np.uint8); print('  stroke',round(sw2,1),'->',SW,'dilate',d)
    return Image.fromarray(add_rim(out),'RGBA')
# A TYPESETTER'S HAND (round 8): each figure of 2026 sits a few px off the line, a hair rotated, and the
# gaps are uneven. Fixed values, so every rebuild sets it the same way. (1586 is real and needs none.)
SETTING={7:(3,-0.7,6), 8:(-2,0.5,-4), 9:(4,0.9,-14), 10:(5,-0.4,0)}   # 2,0,2,6 by index in seq: (dy px, rotate deg, extra gap px AFTER it) — round 9: the last 6 closer and lower
def compose(seq, gap=44, space=70):
    items=[]
    for i,k in enumerate(seq):
        if k==' ': items.append(None); continue
        g=k if isinstance(k,Image.Image) else G[k]
        if i in SETTING and SETTING[i][1]: g=g.rotate(SETTING[i][1],resample=Image.BICUBIC,expand=True)
        items.append(g)
    Wt=sum((space if g is None else g.width+gap+abs(SETTING.get(i,(0,0,0))[2])) for i,g in enumerate(items)); Ht=max(g.height for g in items if g is not None)+60
    canvas=Image.new('RGBA',(Wt+60,Ht),(0,0,0,0)); x=20
    base=Ht-30
    for i,(k,g) in enumerate(zip(seq,items)):
        if g is None: x+=space; continue
        dy,_,dg=SETTING.get(i,(0,0,0))
        if k=='-': y=base-int(Hd*0.55)-g.height//2
        else:
            al=np.asarray(g)[...,3]>127; yb=np.nonzero(al.any(1))[0].max(); y=base-yb
        canvas.alpha_composite(g,(x,y+dy)); x+=g.width+gap+dg
    return canvas
for name,path in fonts.items():
    two=make_two(path)
    line=compose(['1','5','8','6',' ','-',' ',two,'0',two,'6'])
    a=np.asarray(line)[...,3]; yy,xx=np.nonzero(a>8); line=line.crop((xx.min(),yy.min(),xx.max()+1,yy.max()+1))
    gain=np.array(json.load(open('year_gain.json'))['gain'],np.float32)
    la=np.asarray(line).astype(np.float32); la[...,:3]=np.clip(la[...,:3]*gain,0,255)
    line=Image.fromarray(la.astype(np.uint8),'RGBA')
    line.save(f'yearline_{name}.png'); print(name,'line',line.size,'gold x',np.round(gain,3))
