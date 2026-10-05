#!/bin/bash
# usage: [CSS="..."] recland.sh <name> [startSlug=sarah-dwight-1764] [clickJs=hoverclick-parent.js]
# Films one promotion's LANDING at full resolution, with optional CSS injected into the page first, and
# extracts only the landing window. Analyse with landtick.py. (Roadmap §58.6.1 — the 1px re-snap.)
S=$(cd "$(dirname "$0")" && pwd); O=${OUT:-/tmp/safari-rec}; mkdir -p $O; N=$1; START=${2:-sarah-dwight-1764}; JS=${3:-$S/hoverclick-parent.js}
rm -f $O/$N.mov; rm -rf $O/${N}f
osascript -e 'tell application "Safari" to activate' -e "tell application \"Safari\" to set URL of current tab of front window to \"http://localhost:${PORT:-5173}/$START\"" >/dev/null; sleep 6
if [ -n "$CSS" ]; then
  printf '%s' "(function(){var s=document.createElement('style');s.id='exp-css';s.textContent=$(python3 -c 'import json,os;print(json.dumps(os.environ["CSS"]))');document.head.appendChild(s);return 'css';})()" > $O/injcss.js
  osascript -e "tell application \"Safari\" to do JavaScript (read POSIX file \"$O/injcss.js\") in current tab of front window" >/dev/null
fi
osascript -e "with timeout of 20 seconds" -e "tell application \"Terminal\" to do script \"screencapture -v -V 8 -D 2 $O/$N.mov; exit\"" -e "end timeout" >/dev/null 2>&1
osascript -e 'tell application "Safari" to activate'; sleep 4
osascript -e "tell application \"Safari\" to do JavaScript (read POSIX file \"$JS\") in current tab of front window" >/dev/null
sleep 6
swift "$S/frames.swift" $O/$N.mov $O/${N}f 1.0 ${FROM:-4200} ${TO:-7200} 2>&1 | grep -v -i deprecat | tail -1
