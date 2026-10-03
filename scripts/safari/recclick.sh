#!/bin/bash
# usage: recclick.sh <name> <startSlug> <clickJsFile> [scale]
S=$(cd "$(dirname "$0")" && pwd); O=${OUT:-/tmp/safari-rec}; mkdir -p $O; N=$1; START=$2; JS=$3; SC=${4:-0.5}
rm -f $O/$N.mov; rm -rf $O/${N}f
osascript -e 'tell application "Safari" to activate' -e "tell application \"Safari\" to set URL of current tab of front window to \"http://localhost:5173/$START\"" >/dev/null; sleep 5
osascript -e "with timeout of 20 seconds" -e "tell application \"Terminal\" to do script \"screencapture -v -V 6 -D 2 $O/$N.mov; exit\"" -e "end timeout" >/dev/null 2>&1
osascript -e 'tell application "Safari" to activate'; sleep 4
osascript -e "tell application \"Safari\" to do JavaScript (read POSIX file \"$JS\") in current tab of front window" >/dev/null
sleep 5
swift $S/frames.swift $O/$N.mov $O/${N}f $SC 2>&1 | grep -v -i deprecat | tail -1
