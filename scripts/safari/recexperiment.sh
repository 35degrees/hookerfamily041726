#!/bin/bash
# usage: recexp2.sh <name> <startSlug> <css>  — hover-click parent with injected css, then sheet from the flight start
S=$(cd "$(dirname "$0")" && pwd); O=${OUT:-/tmp/safari-rec}; mkdir -p $O; N=$1; START=$2; CSS=$3
rm -f $O/$N.mov; rm -rf $O/${N}f
osascript -e 'tell application "Safari" to activate' -e "tell application \"Safari\" to set URL of current tab of front window to \"http://localhost:5173/$START\"" >/dev/null; sleep 5
if [ -n "$CSS" ]; then
printf '%s' "(function(){var s=document.createElement('style');s.textContent=$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$CSS");document.head.appendChild(s);return 'css';})()" > $O/inject.js
osascript -e "tell application \"Safari\" to do JavaScript (read POSIX file \"$O/inject.js\") in current tab of front window" >/dev/null
fi
osascript -e "with timeout of 20 seconds" -e "tell application \"Terminal\" to do script \"screencapture -v -V 6 -D 2 $O/$N.mov; exit\"" -e "end timeout" >/dev/null 2>&1
osascript -e 'tell application "Safari" to activate'; sleep 4
osascript -e "tell application \"Safari\" to do JavaScript (read POSIX file \"$S/${HCFILE:-hoverclick-parent.js}\") in current tab of front window" >/dev/null
sleep 5
swift "$S/frames.swift" $O/$N.mov $O/${N}f 0.5 2>&1 | grep -v -i deprecat | tail -1
cd $O && python3 - "$N" <<'PY'
import glob, sys, numpy as np
from PIL import Image
N=sys.argv[1]; fs=sorted(glob.glob(N+'f/f*.png')); T=lambda f:int(f.split('_')[1].split('.')[0]); prev=None; act=[]
for f in fs:
    a=np.asarray(Image.open(f).convert('L')).astype(np.int16)
    if prev is not None and T(f)>4000 and (np.abs(a-prev)>12).mean()*100>0.3: act.append(T(f))
    prev=a
t0=act[0]; sel=[f for f in fs if t0-40<=T(f)<=t0+170]
ims=[Image.open(f) for f in sel]; W,H=ims[0].size
crop=(int(W*0.12),0,int(W*0.62),int(H*0.62)); ims=[im.crop(crop) for im in ims]; w,h=ims[0].size
cols=4; rows=(len(ims)+cols-1)//cols
o=Image.new('RGB',(cols*(w+6),rows*(h+6)),(255,0,0))
for i,im in enumerate(ims): o.paste(im,((i%cols)*(w+6),(i//cols)*(h+6)))
o=o.resize((o.width*2//3,o.height*2//3)); o.save(N+'_zoom.png'); print('flight from',t0,[T(f)-t0 for f in sel])
PY
