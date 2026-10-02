"""Measure the title's gold against the year line's (different photos, different light) and write the gain
that brings the year line to the title's tone. Round 8: the year photo's gold read darker and more orange."""
import numpy as np, json
from PIL import Image
t=np.asarray(Image.open('title-gilt.png')); tg=np.median(t[...,:3][t[...,3]>230],0)
ys=[np.asarray(Image.open(f'glyph_{k}.png')) for k in ('1','5','8','6','0')]
yg=np.median(np.vstack([g[...,:3][g[...,3]>230] for g in ys]),0)
json.dump({'gain':(tg/yg).tolist()},open('year_gain.json','w'))
print('title gold',tg,'year gold',yg,'gain',np.round(tg/yg,3))
