# marker.py — counts frames Safari really dropped (Oct 19, 2026; roadmap §62). The screen recorder only saves a
# frame when the screen changes, so a slow tail LOOKS like holes. Inject a 24px magenta square that moves linearly
# every frame (pre-JS below), film, then run this on the extracted frames: a gap in the square's motion is real.
# pre-JS: var m=document.createElement('div'); m.style.cssText='position:fixed;right:20px;bottom:20px;width:24px;
#   height:24px;background:#f0f;z-index:999999;pointer-events:none'; document.body.appendChild(m);
#   m.animate([{transform:'translateX(0)'},{transform:'translateX(-600px)'}],{duration:2000,iterations:Infinity});
# DELETE THE FRAMES AFTER EACH TAKE: a session of films filled Sam's disk (121 GB) on Oct 19.
import sys, os, numpy as np
from PIL import Image
for n in sys.argv[1:]:
    fs=sorted(os.listdir(n+'f')); xs=[]
    for f in fs:
        t=int(f.split('_')[1][:-4])
        if t<4500 or t>5800: continue
        a=np.asarray(Image.open(f'{n}f/{f}').convert('RGB'),dtype=np.int16)
        m=(a[:,:,0]>200)&(a[:,:,1]<80)&(a[:,:,2]>200); cols=np.where(m.any(axis=0))[0]
        if len(cols): xs.append((t,int(cols.min())))
    # marker moves 600 css px / 2000ms → ~0.37 film px/ms; expected step per 16.7ms ≈ 6 px. A drop = a step ≥ 2× expected.
    steps=[(xs[i][0], xs[i][0]-xs[i-1][0], xs[i-1][1]-xs[i][1]) for i in range(1,len(xs))]
    drops=[(t,dt,dx) for t,dt,dx in steps if dt>=30 or abs(dx)>=12 and dx>0]
    print(f"{n}: {len(xs)} marker frames 4.5–5.8s; real dropped frames (time, gap ms, marker step): {[(t,dt,dx) for t,dt,dx in drops if dx<300]}")
