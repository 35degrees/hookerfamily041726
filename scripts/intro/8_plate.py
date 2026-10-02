"""Assemble the four-line plate: the approved title + the year line, at the proportions measured on the
full-spine photo (IMG_2274): REV line 74px tall, 911 wide; year line 64 tall, gap 43."""
import numpy as np, json, os
from PIL import Image
title=Image.open('title-gilt.png'); tc=json.load(open('title-gilt.png.crop.json'))['crop']
REV_TOP,REV_BOT=498-tc[1],705-tc[1]; REV_H=REV_BOT-REV_TOP; REV_X0,REV_X1=46-tc[0],2475-tc[0]
for name in ('Cochin',):
    line=Image.open(f'yearline_{name}.png')
    # round 9 (Sam): HALF the spine's size, and lower — a quiet line under the title, centred on it
    # round 10: +25% on round 9's size (0.5 -> 0.625 of the spine's) and the gap 10% shorter (1.05 -> 0.945)
    tgt_h=int(round(REV_H*64/74*0.625)); s=tgt_h/line.height; line=line.resize((int(line.width*s),tgt_h),Image.LANCZOS)
    gap=int(round(REV_H*0.945)); Wp=title.width; Hp=REV_BOT+gap+line.height+14
    plate=Image.new('RGBA',(Wp,Hp),(0,0,0,0)); plate.alpha_composite(title,(0,0))
    plate.alpha_composite(line,((REV_X0+REV_X1)//2-line.width//2,REV_BOT+gap)); plate.save(f'plate-{name}.png')
    w=1600; h=round(Hp*w/Wp); plate.resize((w,h),Image.LANCZOS).save('title-plate-1600.webp',quality=88,method=6)
    tw=1600; th=round(title.height*tw/title.width); title.resize((tw,th),Image.LANCZOS).save('title-gilt-1600.webp',quality=88,method=6)
    print('title-plate-1600.webp',w,h,os.path.getsize('title-plate-1600.webp')//1024,'KB  | title-gilt-1600.webp',tw,th)
